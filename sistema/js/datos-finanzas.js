"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.finanzas";
  const TIPOS_CUENTA = { banco: "Banco", caja: "Caja chica", efectivo: "Efectivo", tarjeta: "Tarjeta de crédito" };
  const MONEDAS = { GTQ: "Quetzales", USD: "Dólares" };
  const CAT_FABRICA = {
    empresa: {
      gasto: ["Planilla y sueldos", "Alquiler", "Luz y agua", "Teléfono e internet", "Combustible", "Materiales y compras", "Herramienta y equipo", "Vehículos y mantenimiento", "Impuestos", "Comisiones del banco", "Viáticos", "Retiros del dueño", "Otros gastos"],
      ingreso: ["Cobros de obras", "Ventas de la tienda", "Préstamos recibidos", "Otros ingresos"]
    },
    personal: {
      gasto: ["Comida y supermercado", "Casa", "Luz y agua", "Teléfono e internet", "Transporte y gasolina", "Colegio y estudios", "Salud", "Ropa", "Diversión", "Ahorro", "Pagos de tarjeta", "Otros gastos"],
      ingreso: ["Sueldo", "Retiro de la empresa", "Otros ingresos"]
    }
  };
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const yo = () => { const s = window.EMT_APP && window.EMT_APP.sesion(); return s ? s.perfil : null; };
  const yoId = () => { const p = yo(); return p ? String(p.id) : "local"; };

  const vacio = () => ({ v: 1, sig: 1, cuentas: [], categorias: [], movimientos: [], compromisos: [], presupuestos: [], metas: [], cambio: 7.75 });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) { d.compromisos = d.compromisos || []; d.presupuestos = d.presupuestos || []; d.metas = d.metas || []; return d; } } catch (e) {} return vacio(); }
  const FRECUENCIAS = { semanal: "Cada semana", quincenal: "Cada 15 días", mensual: "Cada mes", bimestral: "Cada 2 meses", trimestral: "Cada 3 meses", semestral: "Cada 6 meses", anual: "Cada año" };
  function siguiente(f, frec) {
    const [y, m, d] = f.split("-").map(Number);
    if (frec === "semanal" || frec === "quincenal") { const x = new Date(Date.UTC(y, m - 1, d + (frec === "semanal" ? 7 : 15))); return x.toISOString().slice(0, 10); }
    const meses = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[frec] || 1;
    const ult = new Date(Date.UTC(y, m - 1 + meses + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + meses, Math.min(d, ult))).toISOString().slice(0, 10);
  }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo. Revise el espacio libre."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const delAmbito = (l, ambito) => l.filter(x => x.ambito === ambito && (ambito === "empresa" || String(x.dueno) === yoId()));

  const idb = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-finanzas", 1); r.onupgradeneeded = () => r.result.createObjectStore("archivos"); r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (modo, fn) => abrir().then(db => new Promise((bien, mal) => { const x = db.transaction("archivos", modo); const r = fn(x.objectStore("archivos")); x.oncomplete = () => bien(r && r.result); x.onerror = () => mal(x.error); }));
    return { poner: (k, v) => tx("readwrite", s => s.put(v, k)), leer: k => tx("readonly", s => s.get(k)) };
  })();

  async function achicar(file) {
    if (!/^image\/(jpeg|png|webp|heic)/.test(file.type) || !("createImageBitmap" in window)) return file;
    try {
      const img = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const b = await new Promise(ok2 => c.toBlob(ok2, "image/jpeg", 0.8));
      return b || file;
    } catch (e) { return file; }
  }

  async function sembrar(ambito) {
    const fab = CAT_FABRICA[ambito];
    const filas = [...fab.gasto.map((n, i) => ({ nombre: n, tipo: "gasto", orden: i })), ...fab.ingreso.map((n, i) => ({ nombre: n, tipo: "ingreso", orden: i }))];
    if (!nube) { const d = leer(); filas.forEach(f => d.categorias.push({ id: d.sig++, ambito, dueno: yoId(), activo: true, ...f })); escribir(d); return; }
    await ok(await sb.from("fin_categorias").insert(filas.map(f => ({ ...f, ambito }))), "No se pudieron preparar las categorías.");
  }

  function saldos(cuentas, movs) {
    const s = Object.fromEntries(cuentas.map(c => [c.id, Number(c.saldo_inicial) || 0]));
    movs.filter(m => !m.anulado).forEach(m => {
      const n = Number(m.monto) || 0;
      if (m.tipo === "ingreso") s[m.cuenta_id] = (s[m.cuenta_id] || 0) + n;
      else if (m.tipo === "gasto") s[m.cuenta_id] = (s[m.cuenta_id] || 0) - n;
      else { s[m.cuenta_id] = (s[m.cuenta_id] || 0) - n; s[m.cuenta_destino_id] = (s[m.cuenta_destino_id] || 0) + (Number(m.monto_destino) || n); }
    });
    return cuentas.map(c => ({ ...c, saldo: r2(s[c.id]) }));
  }

  async function finanzas(ambito) {
    let cuentas, categorias, movimientos, cambio, compromisos, presupuestos, metas;
    if (!nube) {
      let d = leer();
      if (!delAmbito(d.categorias, ambito).length) { await sembrar(ambito); d = leer(); }
      cuentas = delAmbito(d.cuentas, ambito); categorias = delAmbito(d.categorias, ambito); movimientos = delAmbito(d.movimientos, ambito); cambio = Number(d.cambio) || 7.75; compromisos = delAmbito(d.compromisos, ambito); presupuestos = delAmbito(d.presupuestos, ambito); metas = delAmbito(d.metas, ambito);
    } else {
      const uid = (await sb.auth.getUser()).data.user?.id;
      const filtro = q => ambito === "personal" ? q.eq("ambito", "personal").eq("dueno", uid) : q.eq("ambito", "empresa");
      let cat = await ok(await filtro(sb.from("fin_categorias").select("*")).order("orden"), "No se pudieron leer las categorías.");
      if (!cat.length) { await sembrar(ambito); cat = await ok(await filtro(sb.from("fin_categorias").select("*")).order("orden"), "No se pudieron leer las categorías."); }
      const [cu, mv, aj, cm, pr, mt] = await Promise.all([
        ok(await filtro(sb.from("fin_cuentas").select("*")).order("orden").order("id"), "No se pudieron leer las cuentas."),
        ok(await filtro(sb.from("fin_movimientos").select("*")).order("fecha", { ascending: false }).order("id", { ascending: false }).limit(5000), "No se pudieron leer los movimientos."),
        sb.from("ajustes").select("valor").eq("clave", "tipo_cambio").maybeSingle(),
        filtro(sb.from("fin_compromisos").select("*")).order("proximo"),
        filtro(sb.from("fin_presupuestos").select("*")),
        filtro(sb.from("fin_metas").select("*")).order("id")
      ]);
      presupuestos = pr.error ? [] : pr.data; metas = mt.error ? [] : mt.data;
      cuentas = cu; categorias = cat; movimientos = mv; cambio = Number(aj.data && aj.data.valor && aj.data.valor.usd) || 7.75; compromisos = cm.error ? [] : cm.data;
    }
    const num = m => ({ ...m, monto: Number(m.monto), monto_destino: m.monto_destino == null ? null : Number(m.monto_destino) });
    movimientos = movimientos.map(num).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
    cuentas = saldos(cuentas.map(c => ({ ...c, saldo_inicial: Number(c.saldo_inicial) })), movimientos);
    compromisos = compromisos.map(c => ({ ...c, monto: c.monto == null ? null : Number(c.monto) })).sort((a, b) => String(a.proximo).localeCompare(String(b.proximo)));
    presupuestos = presupuestos.map(p => ({ ...p, monto: Number(p.monto) }));
    metas = metas.map(m => { const ap = (m.aportes || []).map(a => ({ ...a, monto: Number(a.monto) })); return { ...m, objetivo: Number(m.objetivo), aportes: ap, ahorrado: r2(ap.reduce((s, a) => s + a.monto, 0)) }; });
    return { presupuestos, metas, compromisos, cuentas, categorias: categorias.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es")), movimientos, cambio };
  }

  const enQ = (monto, moneda, cambio) => moneda === "USD" ? r2(monto * cambio) : r2(monto);

  async function guardarCuentaFin(ambito, c) {
    const datos = { nombre: t(c.nombre), tipo: TIPOS_CUENTA[c.tipo] ? c.tipo : "banco", banco: o(c.banco), numero: o(c.numero), moneda: MONEDAS[c.moneda] ? c.moneda : "GTQ", saldo_inicial: r2(c.saldo_inicial), fecha_inicial: fechaO(c.fecha_inicial) || hoy(), activo: c.activo !== false };
    if (!datos.nombre) throw new Error("Escriba el nombre de la cuenta.");
    if (!nube) {
      const d = leer();
      if (c.id) Object.assign(d.cuentas.find(x => x.id === c.id), datos);
      else { const mismas = delAmbito(d.cuentas, ambito); d.cuentas.push({ id: d.sig++, ambito, dueno: yoId(), orden: mismas.length, creado: new Date().toISOString(), ...datos }); }
      escribir(d); return;
    }
    if (c.id) await ok(await sb.from("fin_cuentas").update(datos).eq("id", c.id), "No se pudo guardar la cuenta.");
    else await ok(await sb.from("fin_cuentas").insert({ ...datos, ambito }), "No se pudo guardar la cuenta.");
  }

  async function guardarCategoriaFin(ambito, c) {
    const datos = { nombre: t(c.nombre), tipo: c.tipo === "ingreso" ? "ingreso" : "gasto", activo: c.activo !== false };
    if (!datos.nombre) throw new Error("Escriba el nombre de la categoría.");
    if (!nube) {
      const d = leer();
      if (delAmbito(d.categorias, ambito).some(x => x.id !== c.id && x.tipo === datos.tipo && x.nombre.toLowerCase() === datos.nombre.toLowerCase())) throw new Error("Ya hay una categoría con ese nombre.");
      if (c.id) { Object.assign(d.categorias.find(x => x.id === c.id), datos); escribir(d); return c.id; }
      const id = d.sig++; d.categorias.push({ id, ambito, dueno: yoId(), orden: 99, ...datos }); escribir(d); return id;
    }
    if (c.id) { await ok(await sb.from("fin_categorias").update(datos).eq("id", c.id), "No se pudo guardar la categoría."); return c.id; }
    const r = await ok(await sb.from("fin_categorias").insert({ ...datos, ambito, orden: 99 }).select("id").single(), "No se pudo guardar la categoría.");
    return r.id;
  }

  async function subirFoto(ambito, file) {
    if (!file) return null;
    if (file.size > 12e6) throw new Error("La foto pesa mucho. Use una de menos de 12 MB.");
    const b = await achicar(file);
    const ext = /pdf/.test(b.type) ? "pdf" : "jpg";
    const ref = `${ambito}/${ambito === "personal" ? yoId() : "emtecsa"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    if (!nube) { await idb.poner(ref, b); return ref; }
    await ok(await sb.storage.from("finanzas").upload(ref, b, { contentType: b.type || "image/jpeg" }), "No se pudo subir la foto del recibo.");
    return ref;
  }
  const urls = {};
  async function fotoFin(ref) {
    if (!ref) return null;
    if (urls[ref]) return urls[ref];
    let b = null;
    if (!nube) b = await idb.leer(ref).catch(() => null);
    else { const r = await sb.storage.from("finanzas").download(ref); b = r.error ? null : r.data; }
    if (!b) return null;
    return (urls[ref] = URL.createObjectURL(b));
  }

  async function guardarMovimientoFin(ambito, m, archivo) {
    const tipo = ["ingreso", "gasto", "transferencia"].includes(m.tipo) ? m.tipo : "gasto";
    const datos = { tipo, fecha: fechaO(m.fecha) || hoy(), monto: r2(m.monto), cuenta_id: Number(m.cuenta_id) || null, cuenta_destino_id: tipo === "transferencia" ? Number(m.cuenta_destino_id) || null : null, monto_destino: tipo === "transferencia" && m.monto_destino ? r2(m.monto_destino) : null, categoria_id: tipo === "transferencia" ? null : Number(m.categoria_id) || null, descripcion: o(m.descripcion), referencia: o(m.referencia), origen: m.origen || null, origen_id: m.origen_id == null ? null : String(m.origen_id) };
    if (!(datos.monto > 0)) throw new Error("Escriba el monto.");
    if (!datos.cuenta_id) throw new Error("Escoja la cuenta.");
    if (tipo === "transferencia" && !datos.cuenta_destino_id) throw new Error("Escoja a qué cuenta pasa el dinero.");
    if (tipo === "transferencia" && datos.cuenta_destino_id === datos.cuenta_id) throw new Error("La cuenta de destino tiene que ser otra.");
    const foto = archivo ? await subirFoto(ambito, archivo) : (m.foto || null);
    datos.foto = foto;
    if (!nube) {
      const d = leer();
      if (m.id) Object.assign(d.movimientos.find(x => x.id === m.id), datos);
      else { const id = d.sig++; d.movimientos.push({ id, ambito, dueno: yoId(), anulado: false, motivo_anulado: null, creado: new Date().toISOString(), ...datos }); escribir(d); return id; }
      escribir(d); return m.id;
    }
    if (m.id) { await ok(await sb.from("fin_movimientos").update(datos).eq("id", m.id), "No se pudo guardar el movimiento."); return m.id; }
    const r = await ok(await sb.from("fin_movimientos").insert({ ...datos, ambito }).select("id").single(), "No se pudo guardar el movimiento.");
    return r.id;
  }

  async function anularMovimientoFin(id, motivo) {
    const cambios = { anulado: true, motivo_anulado: o(motivo) || "Sin motivo" };
    if (!nube) { const d = leer(); Object.assign(d.movimientos.find(x => x.id === id), cambios); escribir(d); return; }
    await ok(await sb.from("fin_movimientos").update(cambios).eq("id", id), "No se pudo anular el movimiento.");
  }

  async function guardarTipoCambio(n) {
    const v = r2(n);
    if (!(v > 0 && v < 100)) throw new Error("Revise el tipo de cambio.");
    if (!nube) { const d = leer(); d.cambio = v; escribir(d); return; }
    await ok(await sb.from("ajustes").upsert({ clave: "tipo_cambio", valor: { usd: v } }, { onConflict: "clave" }), "No se pudo guardar el tipo de cambio. Solo lo cambia quien edita los datos de la empresa.");
  }

  async function guardarPresupuestos(ambito, lista) {
    const limpia = lista.map(x => ({ categoria_id: Number(x.categoria_id), monto: x.monto == null || x.monto === "" ? null : r2(x.monto) }));
    if (limpia.some(x => x.monto != null && x.monto < 0)) throw new Error("El presupuesto no puede ser negativo.");
    if (!nube) {
      const d = leer();
      limpia.forEach(x => { const i = d.presupuestos.findIndex(p => p.categoria_id === x.categoria_id); if (!(x.monto > 0)) { if (i >= 0) d.presupuestos.splice(i, 1); } else if (i >= 0) d.presupuestos[i].monto = x.monto; else d.presupuestos.push({ id: d.sig++, ambito, dueno: yoId(), ...x }); });
      escribir(d); return;
    }
    const quitar = limpia.filter(x => !(x.monto > 0)).map(x => x.categoria_id), poner = limpia.filter(x => x.monto > 0);
    if (quitar.length) await ok(await sb.from("fin_presupuestos").delete().in("categoria_id", quitar), "No se pudo guardar el presupuesto.");
    if (poner.length) await ok(await sb.from("fin_presupuestos").upsert(poner.map(x => ({ ...x, ambito })), { onConflict: "categoria_id" }), "No se pudo guardar el presupuesto.");
  }

  async function guardarMeta(ambito, m) {
    const datos = { nombre: t(m.nombre), objetivo: r2(m.objetivo), para: fechaO(m.para), activo: m.activo !== false, aportes: m.aportes || [] };
    if (!datos.nombre) throw new Error("Escriba el nombre de la meta.");
    if (!(datos.objetivo > 0)) throw new Error("Escriba cuánto quiere juntar.");
    if (!nube) { const d = leer(); if (m.id) Object.assign(d.metas.find(x => x.id === m.id), datos); else d.metas.push({ id: d.sig++, ambito, dueno: yoId(), creado: new Date().toISOString(), ...datos }); escribir(d); return; }
    if (m.id) await ok(await sb.from("fin_metas").update(datos).eq("id", m.id), "No se pudo guardar la meta.");
    else await ok(await sb.from("fin_metas").insert({ ...datos, ambito }), "No se pudo guardar la meta.");
  }
  async function aportarMeta(m, a) {
    const monto = r2(a.monto);
    if (!monto) throw new Error("Escriba el monto.");
    if (monto < 0 && -monto > m.ahorrado + 0.001) throw new Error("No puede sacar más de lo que lleva ahorrado.");
    const aportes = [...(m.aportes || []).map(x => ({ fecha: x.fecha, monto: x.monto, nota: x.nota || null })), { fecha: fechaO(a.fecha) || hoy(), monto, nota: o(a.nota) }];
    await guardarMeta(m.ambito, { ...m, aportes });
  }

  async function guardarCompromiso(ambito, c) {
    const datos = { nombre: t(c.nombre), tipo: c.tipo === "unico" ? "unico" : "fijo", a_quien: o(c.a_quien), categoria_id: Number(c.categoria_id) || null, cuenta_id: Number(c.cuenta_id) || null, monto: c.monto == null || c.monto === "" ? null : r2(c.monto), variable: !!c.variable, frecuencia: FRECUENCIAS[c.frecuencia] ? c.frecuencia : "mensual", proximo: fechaO(c.proximo), aviso_dias: Math.max(0, Math.min(60, Number(c.aviso_dias) || 0)), activo: c.activo !== false, pagado_en: c.pagado_en || null, notas: o(c.notas) };
    if (!datos.nombre) throw new Error("Escriba qué se paga.");
    if (!datos.proximo) throw new Error(datos.tipo === "unico" ? "Escriba la fecha en que vence." : "Escriba la fecha del próximo pago.");
    if (!datos.variable && !(datos.monto > 0)) throw new Error("Escriba el monto, o marque que cambia cada vez.");
    if (!nube) {
      const d = leer();
      if (c.id) Object.assign(d.compromisos.find(x => x.id === c.id), datos);
      else d.compromisos.push({ id: d.sig++, ambito, dueno: yoId(), creado: new Date().toISOString(), ...datos });
      escribir(d); return;
    }
    if (c.id) await ok(await sb.from("fin_compromisos").update(datos).eq("id", c.id), "No se pudo guardar.");
    else await ok(await sb.from("fin_compromisos").insert({ ...datos, ambito }), "No se pudo guardar.");
  }

  async function pagarCompromiso(ambito, c, p, archivo) {
    await guardarMovimientoFin(ambito, { tipo: "gasto", monto: p.monto, fecha: p.fecha, cuenta_id: p.cuenta_id, categoria_id: c.categoria_id, descripcion: c.nombre + (c.a_quien ? " · " + c.a_quien : ""), referencia: p.referencia, origen: "compromiso", origen_id: `${c.id}:${c.proximo}` }, archivo);
    const cambios = c.tipo === "unico" ? { activo: false, pagado_en: fechaO(p.fecha) || hoy() } : { proximo: siguiente(c.proximo, c.frecuencia) };
    if (!nube) { const d = leer(); Object.assign(d.compromisos.find(x => x.id === c.id), cambios); escribir(d); return; }
    await ok(await sb.from("fin_compromisos").update(cambios).eq("id", c.id), "Se anotó el pago, pero no se pudo mover la fecha del próximo.");
  }

  async function revertirCompromiso(origen_id) {
    const [id, vence] = String(origen_id || "").split(":"); if (!id || !vence) return;
    const cid = Number(id);
    let c;
    if (!nube) c = leer().compromisos.find(x => x.id === cid);
    else { const r = await sb.from("fin_compromisos").select("*").eq("id", cid).maybeSingle(); c = r.data; }
    if (!c) return;
    const cambios = c.tipo === "unico" ? { activo: true, pagado_en: null } : (String(c.proximo) > vence ? { proximo: vence } : null);
    if (!cambios) return;
    if (!nube) { const d = leer(); Object.assign(d.compromisos.find(x => x.id === cid), cambios); escribir(d); return; }
    await sb.from("fin_compromisos").update(cambios).eq("id", cid);
  }

  async function presupuestosAlLimite() {
    const p = yo(); if (!p) return [];
    const ambs = [D.puede(p, "verFinanzas") ? "empresa" : null, D.puede(p, "finanzasPersonales") ? "personal" : null].filter(Boolean);
    const mes = hoy().slice(0, 7), out = [];
    for (const a of ambs) {
      let pres, movs, cuentas, cats, cambio;
      if (!nube) { const d = leer(); pres = delAmbito(d.presupuestos, a); if (!pres.length) continue; movs = delAmbito(d.movimientos, a).filter(m => m.tipo === "gasto" && !m.anulado && String(m.fecha).slice(0, 7) === mes); cuentas = delAmbito(d.cuentas, a); cats = delAmbito(d.categorias, a); cambio = Number(d.cambio) || 7.75; }
      else {
        const uid = (await sb.auth.getUser()).data.user?.id; const fl = q => a === "personal" ? q.eq("ambito", a).eq("dueno", uid) : q.eq("ambito", a);
        const pr = await fl(sb.from("fin_presupuestos").select("categoria_id, monto")); pres = pr.error ? [] : pr.data; if (!pres.length) continue;
        const [mv, cu, ct, aj] = await Promise.all([fl(sb.from("fin_movimientos").select("monto, cuenta_id, categoria_id").eq("tipo", "gasto").eq("anulado", false).gte("fecha", mes + "-01")), fl(sb.from("fin_cuentas").select("id, moneda")), fl(sb.from("fin_categorias").select("id, nombre")), sb.from("ajustes").select("valor").eq("clave", "tipo_cambio").maybeSingle()]);
        movs = mv.data || []; cuentas = cu.data || []; cats = ct.data || []; cambio = Number(aj.data && aj.data.valor && aj.data.valor.usd) || 7.75;
      }
      const mon = Object.fromEntries(cuentas.map(c => [c.id, c.moneda])), nom = Object.fromEntries(cats.map(c => [c.id, c.nombre])), g = {};
      movs.forEach(m => { if (m.categoria_id) g[m.categoria_id] = (g[m.categoria_id] || 0) + enQ(Number(m.monto), mon[m.cuenta_id], cambio); });
      pres.forEach(x => { const gas = r2(g[x.categoria_id] || 0), mo = Number(x.monto); if (mo > 0 && gas >= mo * 0.9 && nom[x.categoria_id]) out.push({ ambito: a, nombre: nom[x.categoria_id], gastado: gas, monto: mo, pasa: gas > mo }); });
    }
    return out;
  }

  async function porPagarPronto() {
    const p = yo(); if (!p) return [];
    const ambs = [D.puede(p, "verFinanzas") ? "empresa" : null, D.puede(p, "finanzasPersonales") ? "personal" : null].filter(Boolean);
    if (!ambs.length) return [];
    let l;
    if (!nube) l = ambs.flatMap(a => delAmbito(leer().compromisos, a));
    else { const uid = (await sb.auth.getUser()).data.user?.id; const r = await sb.from("fin_compromisos").select("*").eq("activo", true).lte("proximo", siguiente(hoy(), "bimestral")); l = r.error ? [] : r.data.filter(c => ambs.includes(c.ambito) && (c.ambito === "empresa" || c.dueno === uid)); }
    const h = hoy();
    return l.filter(c => c.activo !== false).filter(c => { const lim = new Date(Date.UTC(...c.proximo.split("-").map((n, i) => i === 1 ? n - 1 : Number(n)))); lim.setUTCDate(lim.getUTCDate() - (Number(c.aviso_dias) || 0)); return lim.toISOString().slice(0, 10) <= h; }).map(c => ({ ...c, monto: c.monto == null ? null : Number(c.monto), vencido: c.proximo < h }));
  }

  async function cuentasFin(ambito) {
    const p = yo();
    if (!p || (ambito === "personal" ? !D.puede(p, "finanzasPersonales") : !D.puede(p, "verFinanzas"))) return [];
    if (!nube) return delAmbito(leer().cuentas, ambito).filter(c => c.activo !== false);
    const uid = (await sb.auth.getUser()).data.user?.id;
    let q = sb.from("fin_cuentas").select("id, nombre, tipo, moneda, activo, ambito, dueno").eq("ambito", ambito).eq("activo", true);
    if (ambito === "personal") q = q.eq("dueno", uid);
    const r = await q.order("orden").order("id");
    return r.error ? [] : r.data;
  }

  async function categoriaPorNombre(ambito, nombre, tipo) {
    if (!nombre) return null;
    let l;
    if (!nube) l = delAmbito(leer().categorias, ambito);
    else { const uid = (await sb.auth.getUser()).data.user?.id; let q = sb.from("fin_categorias").select("id, nombre, tipo").eq("ambito", ambito); if (ambito === "personal") q = q.eq("dueno", uid); const r = await q; l = r.error ? [] : r.data; }
    const x = l.find(c => c.tipo === tipo && c.nombre.toLowerCase() === nombre.toLowerCase());
    return x ? x.id : null;
  }

  async function ligarMovimiento(m) {
    const categoria_id = m.categoria_id || await categoriaPorNombre(m.ambito, m.categoria, m.tipo);
    return guardarMovimientoFin(m.ambito, { ...m, categoria_id }, null);
  }

  async function porOrigen(origen, origen_id) {
    if (!nube) return leer().movimientos.filter(x => x.origen === origen && String(x.origen_id) === String(origen_id) && !x.anulado);
    const r = await sb.from("fin_movimientos").select("id, ambito, monto, fecha, descripcion, cuenta_id").eq("origen", origen).eq("origen_id", String(origen_id)).eq("anulado", false);
    return r.error ? [] : r.data;
  }
  async function anularPorOrigen(origen, origen_id, motivo) {
    for (const x of await porOrigen(origen, origen_id)) await anularMovimientoFin(x.id, motivo);
  }
  async function actualizarPorOrigen(origen, origen_id, cambios) {
    const l = await porOrigen(origen, origen_id);
    const datos = {}; if (cambios.monto != null) datos.monto = r2(cambios.monto); if (cambios.fecha) datos.fecha = fechaO(cambios.fecha) || hoy(); if (cambios.descripcion != null) datos.descripcion = o(cambios.descripcion);
    for (const x of l) {
      if (!nube) { const d = leer(); Object.assign(d.movimientos.find(z => z.id === x.id), datos); escribir(d); }
      else await ok(await sb.from("fin_movimientos").update(datos).eq("id", x.id), "No se pudo actualizar el movimiento en Finanzas.");
    }
    return l.length;
  }

  Object.assign(D, { presupuestosAlLimite, finSiguiente: siguiente, guardarPresupuestos, guardarMeta, aportarMeta, FIN_FRECUENCIAS: FRECUENCIAS, guardarCompromiso, pagarCompromiso, revertirCompromiso, porPagarPronto, cuentasFin, ligarMovimiento, anularPorOrigen, actualizarPorOrigen, FIN_TIPOS_CUENTA: TIPOS_CUENTA, FIN_MONEDAS: MONEDAS, finanzas, enQ, guardarCuentaFin, guardarCategoriaFin, guardarMovimientoFin, anularMovimientoFin, guardarTipoCambio, fotoFin });
})();
