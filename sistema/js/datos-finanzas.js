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

  const vacio = () => ({ v: 1, sig: 1, cuentas: [], categorias: [], movimientos: [], cambio: 7.75 });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
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
    let cuentas, categorias, movimientos, cambio;
    if (!nube) {
      let d = leer();
      if (!delAmbito(d.categorias, ambito).length) { await sembrar(ambito); d = leer(); }
      cuentas = delAmbito(d.cuentas, ambito); categorias = delAmbito(d.categorias, ambito); movimientos = delAmbito(d.movimientos, ambito); cambio = Number(d.cambio) || 7.75;
    } else {
      const uid = (await sb.auth.getUser()).data.user?.id;
      const filtro = q => ambito === "personal" ? q.eq("ambito", "personal").eq("dueno", uid) : q.eq("ambito", "empresa");
      let cat = await ok(await filtro(sb.from("fin_categorias").select("*")).order("orden"), "No se pudieron leer las categorías.");
      if (!cat.length) { await sembrar(ambito); cat = await ok(await filtro(sb.from("fin_categorias").select("*")).order("orden"), "No se pudieron leer las categorías."); }
      const [cu, mv, aj] = await Promise.all([
        ok(await filtro(sb.from("fin_cuentas").select("*")).order("orden").order("id"), "No se pudieron leer las cuentas."),
        ok(await filtro(sb.from("fin_movimientos").select("*")).order("fecha", { ascending: false }).order("id", { ascending: false }).limit(5000), "No se pudieron leer los movimientos."),
        sb.from("ajustes").select("valor").eq("clave", "tipo_cambio").maybeSingle()
      ]);
      cuentas = cu; categorias = cat; movimientos = mv; cambio = Number(aj.data && aj.data.valor && aj.data.valor.usd) || 7.75;
    }
    const num = m => ({ ...m, monto: Number(m.monto), monto_destino: m.monto_destino == null ? null : Number(m.monto_destino) });
    movimientos = movimientos.map(num).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
    cuentas = saldos(cuentas.map(c => ({ ...c, saldo_inicial: Number(c.saldo_inicial) })), movimientos);
    return { cuentas, categorias: categorias.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es")), movimientos, cambio };
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

  Object.assign(D, { FIN_TIPOS_CUENTA: TIPOS_CUENTA, FIN_MONEDAS: MONEDAS, finanzas, enQ, guardarCuentaFin, guardarCategoriaFin, guardarMovimientoFin, anularMovimientoFin, guardarTipoCambio, fotoFin });
})();
