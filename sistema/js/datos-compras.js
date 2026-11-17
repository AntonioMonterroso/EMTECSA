"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE_P = "emtecsa.sistema.proveedores", CLAVE_C = "emtecsa.sistema.checklist";
  const ESTADOS_COMPRA = { falta: "Falta comprar", pedido: "Pedido", recibido: "Recibido" };
  const TIPOS_CHECK = { seguridad: "Seguridad en sitio", entrega: "Entrega y energización" };
  const PLANTILLA = {
    seguridad: ["Permiso de trabajo y aviso a la distribuidora", "Línea desenergizada y verificada sin tensión", "Puesta a tierra temporal colocada", "Equipo de protección completo: casco, guantes dieléctricos y arnés", "Área señalizada y con conos", "Herramienta, escaleras y canasta revisadas", "Charla de seguridad con la cuadrilla"],
    entrega: ["Prueba de aislamiento", "Continuidad y secuencia de fases", "Medición de voltaje en el secundario", "Conexiones y herrajes apretados", "Fotos finales de cada estructura", "Área limpia", "Energización con la distribuidora", "Acta de entrega firmada por el cliente"]
  };
  const hoy = () => new Date().toISOString().slice(0, 10);
  const t = s => String(s == null ? "" : s).trim().replace(/\s+/g, " ");
  const o = s => t(s) || null;
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  function leerDe(clave, vacio) { try { const d = JSON.parse(localStorage.getItem(clave)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribirEn(clave, d) { d.cambios = true; try { localStorage.setItem(clave, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  const leerP = () => leerDe(CLAVE_P, () => ({ v: 1, cambios: false, sig: { x: 1 }, proveedores: [], matprov: [] }));
  const leerC = () => leerDe(CLAVE_C, () => ({ v: 1, cambios: false, sig: { x: 1 }, plantillas: JSON.parse(JSON.stringify(PLANTILLA)), compras: [], instalacion: [], checklist: [] }));
  const num = x => ({ ...x, precio: x.precio == null ? null : Number(x.precio) });

  async function proveedores() {
    if (!nube) { const d = leerP(); return { proveedores: d.proveedores.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es")), matprov: d.matprov.map(num) }; }
    const [p, m, pr] = await Promise.all([sb.from("proveedores").select("*").order("nombre"), sb.from("material_proveedores").select("id, material_id, proveedor_id, principal"), sb.rpc("privado_proveedores")]);
    if (p.error || m.error) throw new Error("No se pudieron leer los proveedores.");
    const pre = Object.fromEntries(((pr && pr.data) || []).map(x => [x.id, x.precio]));
    return { proveedores: p.data, matprov: m.data.map(x => num({ ...x, precio: pre[x.id] !== undefined ? pre[x.id] : null })) };
  }

  function siguienteCodigo(l) { const n = l.map(x => Number((String(x.codigo).match(/^PRV-(\d+)$/) || [])[1] || 0)).reduce((a, b) => Math.max(a, b), 0); return "PRV-" + String(n + 1).padStart(3, "0"); }

  async function guardarProveedor(p, mats) {
    const datos = { nombre: t(p.nombre), nit: o(p.nit), contacto: o(p.contacto), telefono: o(p.telefono), correo: o(p.correo), direccion: o(p.direccion), notas: o(p.notas) };
    if (!datos.nombre) throw new Error("Escriba el nombre del proveedor.");
    if (datos.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo)) throw new Error("Revise el correo del proveedor.");
    const lista = (await proveedores()).proveedores;
    if (lista.some(x => x.id !== p.id && x.nombre.toLowerCase() === datos.nombre.toLowerCase())) throw new Error("Ya hay otro proveedor con ese nombre.");
    const filas = (mats || []).map(m => ({ material_id: m.material_id, precio: m.precio == null || m.precio === "" ? null : r2(m.precio), principal: !!m.principal }));
    if (filas.some(m => m.precio != null && !(m.precio >= 0))) throw new Error("Revise los precios: no pueden ser negativos.");
    if (!nube) {
      const d = leerP();
      let id = p.id;
      if (id) Object.assign(d.proveedores.find(x => x.id === id), datos);
      else { id = d.sig.x++; d.proveedores.push({ id, codigo: siguienteCodigo(d.proveedores), activo: true, ...datos }); }
      d.matprov = d.matprov.filter(x => x.proveedor_id !== id);
      filas.forEach(m => { if (m.principal) d.matprov.forEach(x => { if (x.material_id === m.material_id) x.principal = false; }); d.matprov.push({ id: d.sig.x++, proveedor_id: id, ...m }); });
      escribirEn(CLAVE_P, d); return id;
    }
    let id = p.id;
    if (id) await ok(await sb.from("proveedores").update(datos).eq("id", id), "No se pudo guardar el proveedor.");
    else id = (await ok(await sb.from("proveedores").insert({ ...datos, codigo: siguienteCodigo(lista) }).select("id").single(), "No se pudo guardar el proveedor.")).id;
    await ok(await sb.from("material_proveedores").delete().eq("proveedor_id", id), "No se pudieron guardar sus materiales.");
    const princ = filas.filter(m => m.principal).map(m => m.material_id);
    if (princ.length) await ok(await sb.from("material_proveedores").update({ principal: false }).in("material_id", princ), "No se pudieron guardar sus materiales.");
    if (filas.length) await ok(await sb.from("material_proveedores").insert(filas.map(m => ({ ...m, proveedor_id: id }))), "No se pudieron guardar sus materiales.");
    return id;
  }

  async function quitarProveedor(id) {
    if (!nube) { const d = leerP(); d.proveedores = d.proveedores.filter(x => x.id !== id); d.matprov = d.matprov.filter(x => x.proveedor_id !== id); escribirEn(CLAVE_P, d); const c = leerC(); c.compras.forEach(x => { if (x.proveedor_id === id) x.proveedor_id = null; }); escribirEn(CLAVE_C, c); return; }
    await ok(await sb.from("proveedores").delete().eq("id", id), "No se pudo quitar el proveedor.");
  }

  async function filasDe(tabla, obraId) {
    if (!nube) return leerC()[tabla].filter(x => x.obra_id === obraId);
    const T = { compras: "obra_compras", instalacion: "obra_instalacion", checklist: "obra_checklist" };
    const filas = await ok(await sb.from(T[tabla]).select(tabla === "compras" ? "id, obra_id, material_id, cantidad, proveedor_id, estado, fecha_pedido, fecha_recibido, notas" : "*").eq("obra_id", obraId), "No se pudo leer el checklist.");
    if (tabla === "compras") { const pr = await sb.rpc("privado_compras", { p_obra: obraId }); const pre = Object.fromEntries(((pr && pr.data) || []).map(x => [x.id, x.precio_real])); filas.forEach(x => { x.precio_real = pre[x.id] !== undefined ? pre[x.id] : null; }); }
    return filas.map(x => ({ ...x, cantidad: x.cantidad == null ? x.cantidad : Number(x.cantidad), precio_real: x.precio_real == null ? null : Number(x.precio_real) }));
  }

  async function compras(o2, cat) {
    const [guardadas, { proveedores: provs, matprov }] = await Promise.all([filasDe("compras", o2.id), proveedores()]);
    const porMat = Object.fromEntries(cat.materiales.map(m => [m.id, m]));
    const porProv = Object.fromEntries(provs.map(p => [p.id, p]));
    const previsto = {};
    o2.previstos.forEach(p => { previsto[p.material_id] = r3((previsto[p.material_id] || 0) + Number(p.cantidad)); });
    const ids = new Set([...Object.keys(previsto).map(Number), ...guardadas.map(g => g.material_id)]);
    return [...ids].filter(id => porMat[id]).map(id => {
      const g = guardadas.find(x => x.material_id === id);
      const mp = matprov.filter(x => x.material_id === id);
      const principal = mp.find(x => x.principal) || (mp.length === 1 ? mp[0] : null);
      const provId = g && g.proveedor_id !== undefined && g.proveedor_id !== null ? g.proveedor_id : principal ? principal.proveedor_id : null;
      const ref = mp.find(x => x.proveedor_id === provId);
      return {
        id: g ? g.id : null, material: porMat[id], material_id: id, cantidad: g ? Number(g.cantidad) : (previsto[id] || 0), previsto: previsto[id] || 0,
        proveedor_id: provId, proveedor: provId ? porProv[provId] || null : null, opciones: mp.map(x => ({ ...x, proveedor: porProv[x.proveedor_id] })).filter(x => x.proveedor),
        estado: g ? g.estado : "falta", fecha_pedido: g ? g.fecha_pedido : null, fecha_recibido: g ? g.fecha_recibido : null,
        precio_real: g ? g.precio_real : null, notas: g ? g.notas : null,
        precio_ref: ref && ref.precio != null ? ref.precio : (porMat[id].costo == null ? null : Number(porMat[id].costo))
      };
    }).sort((a, b) => a.material.descripcion.localeCompare(b.material.descripcion, "es"));
  }

  function limpiaCompra(c) {
    const estado = ESTADOS_COMPRA[c.estado] ? c.estado : "falta";
    const datos = { cantidad: r3(c.cantidad), proveedor_id: c.proveedor_id || null, estado, fecha_pedido: estado === "falta" ? null : (c.fecha_pedido || hoy()), fecha_recibido: estado === "recibido" ? (c.fecha_recibido || hoy()) : null, precio_real: c.precio_real == null || c.precio_real === "" ? null : r2(c.precio_real), notas: o(c.notas) };
    if (!(datos.cantidad >= 0)) throw new Error("Revise la cantidad.");
    if (datos.precio_real != null && !(datos.precio_real >= 0)) throw new Error("El precio pagado no puede ser negativo.");
    return datos;
  }

  async function guardarCompras(obraId, lista) {
    const filas = lista.map(c => ({ material_id: c.material_id, ...limpiaCompra(c) }));
    if (!nube) {
      const d = leerC();
      filas.forEach(f => { const x = d.compras.find(z => z.obra_id === obraId && z.material_id === f.material_id); if (x) Object.assign(x, f); else d.compras.push({ id: d.sig.x++, obra_id: obraId, ...f }); });
      escribirEn(CLAVE_C, d); return;
    }
    const s2 = window.EMT_APP && window.EMT_APP.sesion();
    const veCosto = D.puede(s2 && s2.perfil, "verCosto");
    await ok(await sb.from("obra_compras").upsert(filas.map(f => { const x = { ...f, obra_id: obraId }; if (!veCosto) delete x.precio_real; return x; }), { onConflict: "obra_id,material_id" }), "No se pudo guardar la compra.");
  }

  async function instalacion(obraId) {
    const l = await filasDe("instalacion", obraId);
    return l.map(x => ({ ...x, cantidad: Number(x.cantidad) })).sort((a, b) => a.grupo_orden - b.grupo_orden || a.id - b.id);
  }

  async function agregarGrupos(obraId, grupos) {
    const actuales = await instalacion(obraId);
    let orden = actuales.length ? Math.max(...actuales.map(x => x.grupo_orden)) + 1 : 0;
    const filas = [];
    grupos.forEach(g => { const go = orden++; g.items.filter(i => i.cantidad > 0).forEach(i => filas.push({ grupo: t(g.grupo), grupo_orden: go, material_id: i.material_id, cantidad: r3(i.cantidad), instalado: false, fecha_instalado: null })); });
    if (!filas.length) throw new Error("Esa estructura no tiene materiales.");
    if (!nube) { const d = leerC(); filas.forEach(f => d.instalacion.push({ id: d.sig.x++, obra_id: obraId, ...f })); escribirEn(CLAVE_C, d); return; }
    await ok(await sb.from("obra_instalacion").insert(filas.map(f => ({ ...f, obra_id: obraId }))), "No se pudo agregar la estructura.");
  }

  async function marcarInstalado(obraId, ids, valor) {
    const datos = { instalado: !!valor, fecha_instalado: valor ? hoy() : null };
    if (!nube) { const d = leerC(); d.instalacion.forEach(x => { if (x.obra_id === obraId && ids.includes(x.id)) Object.assign(x, datos); }); escribirEn(CLAVE_C, d); return; }
    await ok(await sb.from("obra_instalacion").update(datos).in("id", ids), "No se pudo marcar lo instalado.");
  }

  async function quitarGrupo(obraId, orden) {
    if (!nube) { const d = leerC(); d.instalacion = d.instalacion.filter(x => !(x.obra_id === obraId && x.grupo_orden === orden)); escribirEn(CLAVE_C, d); return; }
    await ok(await sb.from("obra_instalacion").delete().eq("obra_id", obraId).eq("grupo_orden", orden), "No se pudo quitar la estructura.");
  }

  async function plantillasCheck() {
    if (!nube) return leerC().plantillas;
    const r = await sb.from("ajustes").select("valor").eq("clave", "checklists").maybeSingle();
    return { ...PLANTILLA, ...((r.data && r.data.valor) || {}) };
  }
  async function guardarPlantillasCheck(pl) {
    const limpia = Object.fromEntries(Object.keys(TIPOS_CHECK).map(k => [k, (pl[k] || []).map(t).filter(Boolean)]));
    if (!nube) { const d = leerC(); d.plantillas = limpia; escribirEn(CLAVE_C, d); return; }
    await ok(await sb.from("ajustes").upsert({ clave: "checklists", valor: limpia }), "No se pudieron guardar los checklists.");
  }

  async function checklist(obraId, tipo) {
    let l = (await filasDe("checklist", obraId)).filter(x => x.tipo === tipo);
    if (!l.length) {
      const pl = (await plantillasCheck())[tipo] || [];
      if (pl.length) {
        const filas = pl.map((texto, i) => ({ tipo, texto, orden: i, hecho: false, fecha: null, nota: null }));
        if (!nube) { const d = leerC(); filas.forEach(f => d.checklist.push({ id: d.sig.x++, obra_id: obraId, ...f })); escribirEn(CLAVE_C, d); }
        else await ok(await sb.from("obra_checklist").insert(filas.map(f => ({ ...f, obra_id: obraId }))), "No se pudo preparar el checklist.");
        l = (await filasDe("checklist", obraId)).filter(x => x.tipo === tipo);
      }
    }
    return l.sort((a, b) => a.orden - b.orden);
  }

  async function guardarPunto(obraId, p) {
    const datos = { texto: t(p.texto), hecho: !!p.hecho, fecha: p.hecho ? (p.fecha || hoy()) : null, nota: o(p.nota) };
    if (!datos.texto) throw new Error("Escriba el punto del checklist.");
    if (!nube) {
      const d = leerC();
      if (p.id) Object.assign(d.checklist.find(x => x.id === p.id), datos);
      else { const mismos = d.checklist.filter(x => x.obra_id === obraId && x.tipo === p.tipo); d.checklist.push({ id: d.sig.x++, obra_id: obraId, tipo: p.tipo, orden: mismos.length ? Math.max(...mismos.map(x => x.orden)) + 1 : 0, ...datos }); }
      escribirEn(CLAVE_C, d); return;
    }
    if (p.id) await ok(await sb.from("obra_checklist").update(datos).eq("id", p.id), "No se pudo guardar el punto.");
    else { const n = await ok(await sb.from("obra_checklist").select("orden").eq("obra_id", obraId).eq("tipo", p.tipo), ""); await ok(await sb.from("obra_checklist").insert({ ...datos, obra_id: obraId, tipo: p.tipo, orden: n.length ? Math.max(...n.map(x => x.orden)) + 1 : 0 }), "No se pudo agregar el punto."); }
  }

  async function quitarPunto(id) {
    if (!nube) { const d = leerC(); d.checklist = d.checklist.filter(x => x.id !== id); escribirEn(CLAVE_C, d); return; }
    await ok(await sb.from("obra_checklist").delete().eq("id", id), "No se pudo quitar el punto.");
  }

  Object.assign(D, { filasCompras: obraId => filasDe("compras", obraId), ESTADOS_COMPRA, TIPOS_CHECK, proveedores, guardarProveedor, quitarProveedor, compras, guardarCompras, instalacion, agregarGrupos, marcarInstalado, quitarGrupo, plantillasCheck, guardarPlantillasCheck, checklist, guardarPunto, quitarPunto });
})();
