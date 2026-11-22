"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.cotizaciones";
  const IVA = 0.12;
  const ESTADOS = { borrador: "Borrador", enviada: "Enviada", aprobada: "Aprobada", rechazada: "Rechazada" };
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

  const vacio = () => ({ v: 1, cambios: false, sig: { c: 1 }, ajustes: { aumento_defecto: 0 }, cotizaciones: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }

  function precioPieza(m, pct, ov) {
    const costo = m.costo == null ? null : Number(m.costo);
    const o = ov && ov[m.id];
    const conPct = q => costo == null ? null : r2(costo * (1 + (Number(q) || 0) / 100));
    let precio, origen, pctUsado = null;
    if (m.pv !== undefined && costo == null) { precio = m.pv == null ? null : r2(m.pv); origen = "catalogo"; }
    else if (o && o.modo === "precio") { precio = r2(o.valor); origen = "cotizacion"; }
    else if (o && o.modo === "pct") { precio = conPct(o.valor); origen = "cotizacion"; pctUsado = Number(o.valor); }
    else if (m.venta_modo === "precio" && m.precio != null) { precio = r2(m.precio); origen = "catalogo"; }
    else if (m.venta_modo === "pct" && m.venta_pct != null) { precio = conPct(m.venta_pct); origen = "catalogo"; pctUsado = Number(m.venta_pct); }
    else { precio = conPct(pct); origen = "aumento"; pctUsado = Number(pct) || 0; }
    return { costo, precio, origen, pct: pctUsado, ganancia: costo == null || precio == null ? null : r2(precio - costo) };
  }

  function precioEstructura(e, pct, ov) {
    let costo = 0, venta = 0, faltC = 0, faltP = 0;
    e.materiales.forEach(r => { const z = precioPieza(r.material, pct, ov); if (z.costo == null) faltC++; else costo += z.costo * r.cantidad; if (z.precio == null) faltP++; else venta += z.precio * r.cantidad; });
    costo = r2(costo); venta = r2(venta);
    const mo = e.mano_obra == null ? null : Number(e.mano_obra);
    return { costo, venta, faltCosto: faltP, sinCosto: faltC, mo, unitario: r2(venta + (mo || 0)) };
  }

  function escenarioDe(c, esc) {
    const o = c.opciones || {}, ops = o.lista || [], xs = o.extras || [];
    if (esc && esc.todo) return { todo: true };
    if (ops.length < 2 && !xs.length) return null;
    const e = esc || c.eleccion || {};
    return { opcion: ops.some(x => x.id === e.opcion) ? e.opcion : (ops[0] ? ops[0].id : null), extras: (e.extras || []).filter(id => xs.some(x => x.id === id)) };
  }
  const entra = (p, esc) => { if (!esc || esc.todo || !p.grupo) return true; const [t, id] = String(p.grupo).split(":"); return t === "o" ? esc.opcion === id : t === "x" ? esc.extras.includes(id) : true; };

  function calcular(c, catalogo, escP) {
    const esc = escenarioDe(c, escP);
    const vivo = c.estado === "borrador";
    const porId = Object.fromEntries(catalogo.estructuras.map(e => [e.id, e]));
    const porMat = Object.fromEntries(catalogo.materiales.map(m => [m.id, m]));
    const pct = Number(c.aumento_pct) || 0;
    const partidas = c.partidas.map(p => {
      if (p.material_id) {
        const m = porMat[p.material_id];
        const mats = m ? [{ material: m, cantidad: 1 }] : [];
        if (vivo && m) { const z = precioPieza(m, pct, c.precios); const unit = z.precio == null ? 0 : z.precio; return { ...p, descripcion: m.descripcion, estructura: null, material: m, mats, costo_materiales: z.costo == null ? 0 : z.costo, mano_obra: 0, faltCosto: z.precio == null ? 1 : 0, sinCosto: z.costo == null ? 1 : 0, faltMano: false, precio_unitario: unit, total: r2(unit * p.cantidad) }; }
        return { ...p, estructura: null, material: m || null, mats, faltCosto: 0, faltMano: false, total: r2(p.precio_unitario * p.cantidad) };
      }
      const e = porId[p.estructura_id];
      const mats = p.materiales ? p.materiales.map(r => ({ material: porMat[r.material_id], cantidad: Number(r.cantidad) })).filter(r => r.material) : (e ? e.materiales : []);
      if (vivo && e) { const k = precioEstructura({ materiales: mats, mano_obra: e.mano_obra }, pct, c.precios); return { ...p, descripcion: e.nombre, estructura: e, mats, ajustada: !!p.materiales, costo_materiales: k.costo, mano_obra: k.mo || 0, faltCosto: k.faltCosto, sinCosto: k.sinCosto, faltMano: k.mo == null, precio_unitario: k.unitario, total: r2(k.unitario * p.cantidad) }; }
      return { ...p, estructura: e || null, mats, ajustada: !!p.materiales, faltCosto: 0, faltMano: false, total: r2(p.precio_unitario * p.cantidad) };
    });
    partidas.forEach(p => { p.incluida = entra(p, esc); });
    const dentro = partidas.filter(p => p.incluida);
    const subtotal = r2(dentro.reduce((a, p) => a + p.total, 0));
    const cargos = r2((c.cargos || []).reduce((a, g) => a + (Number(g.monto) || 0), 0));
    const base = r2(subtotal + cargos);
    const imprevistos = c.imprevistos_pct != null ? r2(base * c.imprevistos_pct / 100) : 0;
    const antesDesc = r2(base + imprevistos);
    const descuento = c.descuento_tipo === "pct" ? r2(antesDesc * (c.descuento || 0) / 100) : c.descuento_tipo === "monto" ? r2(Math.min(c.descuento || 0, antesDesc)) : 0;
    const neto = r2(antesDesc - descuento);
    const iva = c.iva ? r2(neto * IVA) : 0;
    const total = r2(neto + iva);
    const costoMat = r2(dentro.reduce((a, p) => a + p.costo_materiales * p.cantidad, 0));
    const manoObra = r2(dentro.reduce((a, p) => a + (p.mano_obra || 0) * p.cantidad, 0));
    const faltan = partidas.reduce((a, p) => a + p.faltCosto, 0), sinMano = partidas.filter(p => p.faltMano).length;
    const mats = {};
    dentro.forEach(p => { (p.mats || []).forEach(m => { const k = m.material.id; mats[k] = mats[k] || { material: m.material, cantidad: 0 }; mats[k].cantidad += m.cantidad * p.cantidad; }); });
    const fijos = !vivo && c.precios_fijos ? c.precios_fijos : null;
    const materiales = Object.values(mats).map(x => {
      const cn = Math.round(x.cantidad * 1000) / 1000;
      const f = fijos && fijos[x.material.id];
      const z = f ? { costo: f.costo, precio: f.precio, origen: f.origen || "fijo", pct: f.pct ?? null } : precioPieza(x.material, pct, c.precios);
      return { material: x.material, cantidad: cn, costoU: z.costo, precioU: z.precio, origen: z.origen, pct: z.pct, gananciaU: z.costo == null || z.precio == null ? null : r2(z.precio - z.costo), costo: z.costo == null ? null : r2(z.costo * cn), venta: z.precio == null ? null : r2(z.precio * cn), ganancia: z.costo == null || z.precio == null ? null : r2((z.precio - z.costo) * cn) };
    }).sort((a, b) => a.material.descripcion.localeCompare(b.material.descripcion, "es"));
    const sinCosto = materiales.filter(x => x.costoU == null).length, conAumento = materiales.filter(x => x.origen === "aumento").length;
    return { escenario: esc, partidas, subtotal, cargos, base, imprevistos, descuento, neto, iva, total, costoMat, manoObra, ganancia: r2(neto - costoMat - manoObra), faltan, sinMano, materiales, sinCosto, conAumento };
  }

  function escenarios(c, catalogo) {
    const o = c.opciones || {}, ops = (o.lista || []).length >= 2 ? o.lista : [], xs = o.extras || [];
    const ref = ops.length ? ops[0].id : null;
    const k0 = calcular(c, catalogo, { opcion: ref, extras: [] });
    return {
      hay: ops.length >= 2 || xs.length > 0,
      opciones: ops.map(x => ({ ...x, k: calcular(c, catalogo, { opcion: x.id, extras: [] }) })),
      extras: xs.map(x => { const k1 = calcular(c, catalogo, { opcion: ref, extras: [x.id] }); return { ...x, monto: r2(k1.total - k0.total), neto: r2(k1.neto - k0.neto), subtotal: r2(k1.subtotal - k0.subtotal) }; }),
      base: k0
    };
  }
  const nombreGrupo = (c, g) => { if (!g) return "Va en todas"; const [t, id] = String(g).split(":"); const o = c.opciones || {}; if (t === "o") { const x = (o.lista || []).find(y => y.id === id); return x ? `Opción ${x.id}${x.nombre ? " · " + x.nombre : ""}` : "Va en todas"; } const x = (o.extras || []).find(y => y.id === id); return x ? `Extra · ${x.nombre}` : "Va en todas"; };

  const TIPOS_NUM = { cot: { n: "Cotizaciones", p: "COT", dig: 4 }, obra: { n: "Obras", p: "OB", dig: 3 }, rec: { n: "Recibos de pago", p: "REC", dig: 4 }, est: { n: "Estimaciones de avance", p: "EST", dig: 4 }, oc: { n: "Órdenes de cambio", p: "OC", dig: 4 } };
  async function numeracion() {
    let v = {};
    if (!nube) v = leer().ajustes.numeracion || {};
    else { const r = await sb.from("ajustes").select("valor").eq("clave", "numeracion").maybeSingle(); v = (r.data && r.data.valor) || {}; }
    return Object.fromEntries(Object.entries(TIPOS_NUM).map(([k, t]) => [k, { nombre: t.n, prefijo: (v[k] && v[k].prefijo) || t.p, desde: Math.max(1, Number(v[k] && v[k].desde) || 1), dig: t.dig }]));
  }
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const armarNumero = (c, numeros) => {
    const re = new RegExp(`^${escRe(c.prefijo)}-(\\d+)$`);
    const n = numeros.map(x => Number((String(x).match(re) || [])[1] || 0)).reduce((a, b) => Math.max(a, b), 0);
    return `${c.prefijo}-${String(Math.max(n + 1, c.desde)).padStart(c.dig, "0")}`;
  };
  async function numeroDe(tipo, lista) { const c = (await numeracion())[tipo]; return armarNumero(c, (lista || []).map(x => x && typeof x === "object" ? x.numero : x)); }
  async function numerosUsados(tipo) {
    const T = { cot: ["cotizaciones", "emtecsa.sistema.cotizaciones", "cotizaciones"], obra: ["obras", "emtecsa.sistema.obras", "obras"], rec: ["pagos", "emtecsa.sistema.cobros", "pagos"], est: ["estimaciones", "emtecsa.sistema.estimaciones", "est"], oc: ["ordenes_cambio", "emtecsa.sistema.cambios", "oc"] }[tipo];
    if (!nube) { try { return ((JSON.parse(localStorage.getItem(T[1])) || {})[T[2]] || []).map(x => x.numero); } catch (e) { return []; } }
    const r = await sb.from(T[0]).select("numero"); return r.error ? [] : r.data.map(x => x.numero);
  }
  async function proximosNumeros() {
    const c = await numeracion();
    const out = {};
    for (const k of Object.keys(c)) out[k] = { ...c[k], siguiente: armarNumero(c[k], await numerosUsados(k)) };
    return out;
  }
  async function margenMinimo() {
    if (!nube) return Number(leer().ajustes.margen_minimo) || 0;
    const r = await sb.from("ajustes").select("valor").eq("clave", "margen_minimo").maybeSingle();
    return Number(r.data && r.data.valor) || 0;
  }
  async function guardarMargenMinimo(v) {
    const n = String(v == null ? "" : v).replace(/[%,\s]/g, "") === "" ? 0 : Number(String(v).replace(/[%,\s]/g, ""));
    if (!(n >= 0 && n < 100)) throw new Error("El margen mínimo va de 0 a 99 %.");
    if (!nube) { const d = leer(); d.ajustes.margen_minimo = n; escribir(d); return; }
    const r = await sb.from("ajustes").upsert({ clave: "margen_minimo", valor: n });
    if (r.error) throw new Error("No se pudo guardar el margen mínimo.");
  }
  const descuentoActual = c => c.descuento_tipo && Number(c.descuento) > 0 ? { tipo: c.descuento_tipo, valor: Number(c.descuento) } : null;
  const descuentoAutorizado = c => { const d = descuentoActual(c), a = c.descuento_aut; return !d || !!(a && a.estado === "autorizado" && a.tipo === d.tipo && Number(a.valor) === d.valor); };
  async function revisarDescuento(cotId, esc) {
    const c = await cotizacion(cotId); if (!c || !descuentoActual(c)) return { bajo: false };
    const k = calcular(c, await D.catalogo(), esc);
    if (!nube) { const minimo = await margenMinimo(); if (!(minimo > 0) || !(k.neto > 0)) return { bajo: false, minimo }; const margen = Math.round((k.neto - k.costoMat - k.manoObra) / k.neto * 1000) / 10; return { bajo: margen < minimo, minimo, margen }; }
    const ids = k.partidas.filter(p => p.incluida !== false && p.id != null).map(p => p.id);
    const r = await sb.rpc("cotizacion_bajo_minimo", { p_id: cotId, p_neto: k.neto, p_ids: ids });
    if (r.error) throw new Error("No se pudo revisar el margen de la cotización.");
    return r.data || { bajo: false };
  }
  async function ponerDescuentoAut(cotId, aut) {
    if (!nube) { const d = leer(); const c = d.cotizaciones.find(x => x.id === cotId); if (c) { c.descuento_aut = aut; escribir(d); } return; }
    const r = await sb.from("cotizaciones").update({ descuento_aut: aut }).eq("id", cotId);
    if (r.error) throw new Error(/gerencia/i.test(r.error.message || "") ? "Solo gerencia autoriza descuentos." : "No se pudo guardar la autorización.");
  }
  async function pedirAutorizacion(c, quien, r) { const d = descuentoActual(c); await ponerDescuentoAut(c.id, { estado: "pendiente", tipo: d.tipo, valor: d.valor, minimo: r && r.minimo != null ? r.minimo : null, pedido_por: quien || null, fecha: new Date().toISOString() }); }
  async function resolverDescuento(c, si, quien, nota) {
    const a = c.descuento_aut || {}; const d = descuentoActual(c) || { tipo: a.tipo, valor: a.valor };
    await ponerDescuentoAut(c.id, { ...a, estado: si ? "autorizado" : "rechazado", tipo: d.tipo, valor: d.valor, por: quien || null, resuelto: new Date().toISOString(), nota: String(nota || "").trim() || null });
  }
  async function cambioBanguat() {
    const hoyL = (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
    if (!nube) { let usd = 7.75; try { usd = Number((JSON.parse(localStorage.getItem("emtecsa.sistema.finanzas")) || {}).cambio) || 7.75; } catch (e) {} return { usd, fecha: null, de: "Finanzas" }; }
    const r = await sb.from("ajustes").select("valor").eq("clave", "tipo_cambio_banguat").maybeSingle();
    const v = r.data && r.data.valor;
    if (v && v.usd > 0 && v.fecha === hoyL) return { ...v, de: "Banguat" };
    try { const f = await sb.functions.invoke("cambio", { body: {} }); if (!f.error && f.data && f.data.usd > 0) return { ...f.data, de: "Banguat" }; } catch (e) {}
    if (v && v.usd > 0) return { ...v, de: "Banguat" };
    const t = await sb.from("ajustes").select("valor").eq("clave", "tipo_cambio").maybeSingle();
    return { usd: Number(t.data && t.data.valor && t.data.valor.usd) || 7.75, fecha: null, de: "Finanzas" };
  }
  async function ponerVersion(cotId, v) {
    if (!nube) { const d = leer(); const c = d.cotizaciones.find(x => x.id === cotId); if (c) { c.version = v; escribir(d); } return; }
    await ok(await sb.from("cotizaciones").update({ version: v }).eq("id", cotId), "No se pudo guardar la versión.");
  }
  async function guardarNumeracion(tipo, x) {
    if (!TIPOS_NUM[tipo]) throw new Error("Ese documento no existe.");
    const prefijo = String(x.prefijo || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{1,6}$/.test(prefijo)) throw new Error("El prefijo va con letras o números, de 1 a 6, sin espacios ni guiones.");
    const desde = String(x.desde == null ? "" : x.desde).replace(/[,\s]/g, "") === "" ? 1 : Number(String(x.desde).replace(/[,\s]/g, ""));
    if (!Number.isInteger(desde) || desde < 1 || desde > 9999999) throw new Error("El número tiene que ser entero, de 1 en adelante.");
    const actual = await numeracion();
    const otro = Object.entries(actual).find(([k, c]) => k !== tipo && c.prefijo === prefijo);
    if (otro) throw new Error(`«${prefijo}» ya lo usan las ${otro[1].nombre.toLowerCase()}.`);
    const valor = Object.fromEntries(Object.entries(actual).map(([k, c]) => [k, { prefijo: k === tipo ? prefijo : c.prefijo, desde: k === tipo ? desde : c.desde }]));
    if (!nube) { const d = leer(); d.ajustes.numeracion = valor; escribir(d); return; }
    const r = await sb.from("ajustes").upsert({ clave: "numeracion", valor });
    if (r.error) throw new Error("No se pudo guardar la numeración.");
  }

  async function aumentoDefecto() {
    if (!nube) return Number(leer().ajustes.aumento_defecto) || 0;
    const r = await sb.from("ajustes").select("valor").eq("clave", "aumento_defecto").maybeSingle();
    return Number(r.data && r.data.valor) || 0;
  }
  async function guardarAumentoDefecto(pct) {
    if (!nube) { const d = leer(); d.ajustes.aumento_defecto = Number(pct) || 0; escribir(d); return; }
    await sb.from("ajustes").upsert({ clave: "aumento_defecto", valor: Number(pct) || 0 });
  }

  const EMPRESA = {
    nombre: "EMTECSA", razon_social: "", nit: "", direccion: "", telefono: "", correo: "", web: "", ciudad: "Guatemala", whatsapp: "", banco: "", banco_tipo: "", banco_numero: "", banco_titular: "", banco_moneda: "Quetzales",
    firma_nombre: "", firma_puesto: "", resp_nombre: "", resp_dpi: "", ing_nombre: "", ing_titulo: "", ing_colegiado: "", ing_vence: "", ing_telefono: "", ing_id: "", umbral_costos: "10", costo_dia_persona: "", seg_primer: "3", seg_antes: "5", correo_pedidos: "",
    carta: "Por medio de la presente le enviamos nuestra propuesta técnica y económica para {trabajo}{en_sitio}.\n\nEn las páginas siguientes encontrará el alcance del trabajo, el detalle de precios y las condiciones. Todos los trabajos se realizan con personal calificado y con el equipo de seguridad que exige cada obra.\n\nQuedamos a sus órdenes para resolver cualquier duda o ajustar la propuesta a lo que necesite.",
    forma_pago: "", tiempo_entrega: "", garantia: "", incluye: "", excluye: ""
  };
  async function empresa() {
    if (!nube) return { ...EMPRESA, ...(leer().ajustes.empresa || {}) };
    const [r, rc] = await Promise.all([sb.from("ajustes").select("valor").eq("clave", "empresa").maybeSingle(), sb.from("ajustes").select("valor").eq("clave", "costos_obra").maybeSingle()]);
    return { ...EMPRESA, ...((r.data && r.data.valor) || {}), costo_dia_persona: (rc.data && rc.data.valor && rc.data.valor.costo_dia_persona) || "" };
  }
  const ING_K = { ing_nombre: "nombre", ing_titulo: "titulo", ing_colegiado: "colegiado", ing_vence: "vence", ing_telefono: "telefono", ing_id: "id" };
  const ingenierosDe = e => {
    const l = Array.isArray(e && e.ingenieros) ? e.ingenieros.filter(i => i && String(i.nombre || "").trim()) : [];
    if (l.length) return l;
    return e && String(e.ing_nombre || "").trim() ? [Object.fromEntries(Object.entries(ING_K).map(([a, b]) => [b, String(e[a] || "")]))] : [];
  };
  async function guardarEmpresa(e) {
    const limpio = Object.fromEntries(Object.keys(EMPRESA).map(k => [k, String(e[k] == null ? "" : e[k]).trim()]));
    limpio.ingenieros = ingenierosDe(e).map(i => Object.fromEntries(Object.values(ING_K).map(b => [b, String(i[b] == null ? "" : i[b]).trim()])));
    Object.entries(ING_K).forEach(([a, b]) => { limpio[a] = limpio.ingenieros.length ? limpio.ingenieros[0][b] : ""; });
    if (!limpio.nombre) throw new Error("Escriba el nombre de la empresa.");
    if (limpio.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio.correo)) throw new Error("Revise el correo de la empresa.");
    if (!nube) { const d = leer(); d.ajustes.empresa = limpio; escribir(d); return; }
    const { costo_dia_persona, ...publico } = limpio;
    const r = await sb.from("ajustes").upsert({ clave: "empresa", valor: publico });
    if (r.error) throw new Error("No se pudieron guardar los datos de la empresa.");
    if (permisosYo().costo && e.costo_dia_persona != null) { const rc = await sb.from("ajustes").upsert({ clave: "costos_obra", valor: { costo_dia_persona } }); if (rc.error) throw new Error("No se pudo guardar el costo del día por persona."); }
  }

  async function cotizaciones() {
    if (!nube) {
      const d = leer();
      const cl = Object.fromEntries((await D.clientes()).map(c => [c.id, c]));
      return d.cotizaciones.map(c => ({ ...c, cliente: cl[c.cliente_id] || null })).sort((a, b) => b.numero.localeCompare(a.numero));
    }
    const r = await sb.from("cotizaciones").select("id, numero, cliente_id, sitio_id, contacto_id, titulo, estado, fecha, vigencia_dias, total, descuento_aut, moneda, clientes (id, nombre, nit, telefono)").order("numero", { ascending: false });
    return (await ok(r, "No se pudo leer la lista de cotizaciones.")).map(c => ({ ...c, cliente: c.clientes }));
  }

  async function cambiarVigencia(id, dias) {
    dias = Number(dias);
    if (!(dias >= 1 && dias <= 365)) throw new Error("La vigencia va de 1 a 365 días.");
    if (!nube) { const d = leer(); const c = d.cotizaciones.find(x => x.id === id); if (!c) throw new Error("Esa cotización ya no existe."); c.vigencia_dias = dias; escribir(d); return; }
    await ok(await sb.from("cotizaciones").update({ vigencia_dias: dias }).eq("id", id), "No se pudo cambiar la vigencia.");
  }

  const COLS_COT = "id, numero, cliente_id, sitio_id, contacto_id, titulo, estado, fecha, vigencia_dias, iva, imprevistos_pct, descuento_tipo, descuento, notas, total, foto, alcance_incluye, alcance_excluye, condiciones, expediente, opciones, eleccion, tramite, version, descuento_aut, moneda, tipo_cambio, creado";
  const COLS_PART = "id, cotizacion_id, estructura_id, material_id, materiales, descripcion, cantidad, mano_obra, precio_unitario, orden, del_plano, grupo";
  const permisosYo = () => { const s2 = window.EMT_APP && window.EMT_APP.sesion(); const p = s2 && s2.perfil; return { costo: D.puede(p, "verCosto"), aumento: D.puede(p, "verCosto") || D.puede(p, "verAumento") }; };

  async function cotizacion(id) {
    if (!nube) { const c = leer().cotizaciones.find(x => x.id === id); return c ? JSON.parse(JSON.stringify(c)) : null; }
    const [r, pr] = await Promise.all([sb.from("cotizaciones").select(`${COLS_COT}, cotizacion_partidas (${COLS_PART}), cotizacion_cargos (*)`).eq("id", id).maybeSingle(), sb.rpc("privado_cotizacion", { p_id: id })]);
    const c = await ok(r, "No se pudo leer la cotización.");
    if (!c) return null;
    const pv = (pr && pr.data) || null;
    c.aumento_pct = pv && pv.aumento_pct != null ? Number(pv.aumento_pct) : null;
    c.precios = (pv && pv.precios) || {};
    c.precios_fijos = (pv && pv.precios_fijos) || null;
    const cm = (pv && pv.partidas) || {};
    c.partidas = c.cotizacion_partidas.sort((a, b) => a.orden - b.orden).map(p => ({ ...p, cantidad: Number(p.cantidad), costo_materiales: Number(cm[p.id] || 0), mano_obra: Number(p.mano_obra), precio_unitario: Number(p.precio_unitario) }));
    c.cargos = c.cotizacion_cargos.sort((a, b) => a.orden - b.orden).map(g => ({ ...g, monto: Number(g.monto) }));
    ["imprevistos_pct", "descuento"].forEach(k => { if (c[k] != null) c[k] = Number(c[k]); });
    delete c.cotizacion_partidas; delete c.cotizacion_cargos;
    return c;
  }

  async function crear({ cliente_id, sitio_id, contacto_id, titulo }) {
    if (!cliente_id) throw new Error("Escoja el cliente.");
    const pct = await aumentoDefecto();
    const emp = await empresa();
    const base = { foto: "torre-luna-2", alcance_incluye: emp.incluye || null, alcance_excluye: emp.excluye || null, condiciones: { forma_pago: emp.forma_pago, tiempo_entrega: emp.tiempo_entrega, garantia: emp.garantia }, cliente_id, sitio_id: sitio_id || null, contacto_id: contacto_id || null, titulo: String(titulo || "").trim(), estado: "borrador", fecha: (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date()), vigencia_dias: 30, aumento_pct: pct, iva: true, imprevistos_pct: null, descuento_tipo: null, descuento: null, notas: null, total: 0 };
    if (!nube) {
      const d = leer();
      const c = { id: d.sig.c++, numero: await numeroDe("cot", d.cotizaciones), ...base, version: 1, partidas: [], cargos: [], creado: new Date().toISOString() };
      d.cotizaciones.push(c); escribir(d); return c.id;
    }
    if (!permisosYo().aumento) delete base.aumento_pct;
    const nums = await ok(await sb.from("cotizaciones").select("numero"), "No se pudo crear la cotización.");
    const r = await sb.from("cotizaciones").insert({ ...base, numero: await numeroDe("cot", nums) }).select("id").single();
    return (await ok(r, "No se pudo crear la cotización.")).id;
  }

  function revisar(c) {
    if (!c.cliente_id) throw new Error("La cotización necesita un cliente.");
    if (!(Number(c.vigencia_dias) >= 1 && Number(c.vigencia_dias) <= 365)) throw new Error("La vigencia va de 1 a 365 días.");
    if (!(Number(c.aumento_pct) >= 0)) throw new Error("El aumento no puede ser negativo.");
    if (c.imprevistos_pct != null && !(c.imprevistos_pct >= 0)) throw new Error("Los imprevistos no pueden ser negativos.");
    if (c.descuento_tipo && !(c.descuento >= 0)) throw new Error("Revise el descuento.");
    if (c.descuento_tipo === "pct" && c.descuento > 100) throw new Error("El descuento no puede pasar de 100 %.");
    if (c.partidas.some(p => !(p.cantidad > 0))) throw new Error("Cada estructura necesita una cantidad mayor que cero.");
    if (c.cargos.some(g => !String(g.descripcion || "").trim())) throw new Error("Cada cargo de transporte o equipo necesita su descripción.");
    if (c.cargos.some(g => !(g.monto >= 0))) throw new Error("Revise los montos de transporte y equipo.");
    const op = c.opciones || {};
    if ((op.lista || []).length === 1) throw new Error("Con opciones hacen falta al menos dos. Agregue otra o quite la que hay.");
    if ([...(op.lista || []), ...(op.extras || [])].some(x => !String(x.nombre || "").trim())) throw new Error("Cada opción y cada extra necesita su nombre.");
  }

  async function guardar(c, calculo) {
    revisar(c);
    const cab = { cliente_id: c.cliente_id, sitio_id: c.sitio_id || null, contacto_id: c.contacto_id || null, titulo: String(c.titulo || "").trim(), estado: c.estado, fecha: c.fecha, vigencia_dias: Number(c.vigencia_dias), aumento_pct: Number(c.aumento_pct) || 0, iva: !!c.iva, imprevistos_pct: c.imprevistos_pct, descuento_tipo: c.descuento_tipo || null, descuento: c.descuento_tipo ? c.descuento : null, moneda: c.moneda === "USD" ? "USD" : "GTQ", tipo_cambio: c.moneda === "USD" && Number(c.tipo_cambio) > 0 ? Number(c.tipo_cambio) : null, notas: c.notas ? String(c.notas).trim() : null, total: calculo.total, foto: c.foto || null, alcance_incluye: c.alcance_incluye ? String(c.alcance_incluye).trim() : null, alcance_excluye: c.alcance_excluye ? String(c.alcance_excluye).trim() : null, condiciones: c.condiciones || {}, expediente: c.expediente || null, opciones: c.opciones && ((c.opciones.lista || []).length || (c.opciones.extras || []).length) ? c.opciones : null, eleccion: c.eleccion || null, precios: c.precios && Object.keys(c.precios).length ? c.precios : {}, precios_fijos: c.estado === "borrador" ? null : (c.precios_fijos || null) };
    const partidas = calculo.partidas.map((p, i) => ({ estructura_id: p.estructura_id || null, material_id: p.material_id || null, materiales: p.materiales || null, descripcion: p.descripcion, cantidad: Number(p.cantidad), costo_materiales: r2(p.costo_materiales), mano_obra: r2(p.mano_obra), precio_unitario: r2(p.precio_unitario), del_plano: !!p.del_plano, grupo: p.grupo || null, orden: i }));
    const cargos = c.cargos.map((g, i) => ({ descripcion: String(g.descripcion).trim(), monto: r2(g.monto), orden: i }));
    if (!nube) {
      const d = leer(); const i = d.cotizaciones.findIndex(x => x.id === c.id);
      if (i < 0) throw new Error("Esa cotización ya no existe.");
      d.cotizaciones[i] = { ...d.cotizaciones[i], ...cab, partidas, cargos };
      escribir(d); return;
    }
    const yo = permisosYo();
    if (!yo.aumento) { delete cab.aumento_pct; delete cab.precios; }
    if (!yo.costo) { delete cab.precios_fijos; partidas.forEach(p => { delete p.costo_materiales; }); }
    await ok(await sb.from("cotizaciones").update(cab).eq("id", c.id), "No se pudo guardar la cotización.");
    await ok(await sb.from("cotizacion_partidas").delete().eq("cotizacion_id", c.id), "No se pudieron guardar las estructuras.");
    if (partidas.length) await ok(await sb.from("cotizacion_partidas").insert(partidas.map(p => ({ ...p, cotizacion_id: c.id }))), "No se pudieron guardar las estructuras.");
    await ok(await sb.from("cotizacion_cargos").delete().eq("cotizacion_id", c.id), "No se pudieron guardar los cargos.");
    if (cargos.length) await ok(await sb.from("cotizacion_cargos").insert(cargos.map(g => ({ ...g, cotizacion_id: c.id }))), "No se pudieron guardar los cargos.");
  }

  async function catalogoParaCotizacion(cat, cotId) {
    if (!nube || !cat.costosOcultos) return cat;
    const r = cotId ? await sb.rpc("precios_venta", { p_cot: cotId }) : await sb.rpc("precios_venta_nueva");
    if (r.error) throw new Error("No se pudieron leer los precios.");
    const pv = Object.fromEntries(r.data.map(x => [x.material_id, x.precio == null ? null : Number(x.precio)]));
    const materiales = cat.materiales.map(m => ({ ...m, pv: pv[m.id] !== undefined ? pv[m.id] : null }));
    const porId = Object.fromEntries(materiales.map(m => [m.id, m]));
    return { ...cat, materiales, estructuras: cat.estructuras.map(e => ({ ...e, materiales: e.materiales.map(x => ({ ...x, material: porId[x.material.id] || x.material })) })) };
  }

  Object.assign(D, { margenMinimo, guardarMargenMinimo, descuentoAutorizado, revisarDescuento, pedirAutorizacion, resolverDescuento, cambioBanguat, ponerVersion, TIPOS_NUM, numeracion, numeroDe, proximosNumeros, guardarNumeracion, catalogoParaCotizacion, empresa, guardarEmpresa, ingenierosDe, ING_K, ESTADOS, IVA, precioPieza, precioEstructura, calcularCotizacion: calcular, aumentoDefecto, guardarAumentoDefecto, cotizaciones, cotizacion, crearCotizacion: crear, guardarCotizacion: guardar, cambiarVigencia, escenariosCotizacion: escenarios, nombreGrupo });
})();
