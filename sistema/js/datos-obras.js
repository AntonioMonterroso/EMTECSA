"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.obras";
  const ESTADOS_OBRA = { programada: "Programada", en_curso: "En curso", pausada: "Pausada", terminada: "Terminada", cancelada: "Cancelada" };
  const PASOS = { factibilidad: "Factibilidad", diseno: "Aprobación del diseño", libranza: "Libranza", inspeccion: "Inspección", conexion: "Conexión" };
  const ESTADOS_TRAMITE = { pendiente: "Pendiente", en_tramite: "En trámite", aprobado: "Aprobado", rechazado: "Rechazado", no_aplica: "No aplica" };
  const PLANTILLAS = [
    { id: 1, nombre: "Línea de media tensión", orden: 1, etapas: ["Visita y replanteo", "Pedido de materiales", "Trámite con la distribuidora", "Postes y herrajes", "Tendido de conductor", "Conexión y pruebas", "Energización y entrega"] },
    { id: 2, nombre: "Transformador", orden: 2, etapas: ["Visita técnica", "Pedido del transformador", "Trámite con la distribuidora", "Montaje", "Conexión y pruebas de aislamiento", "Energización y entrega"] },
    { id: 3, nombre: "Mantenimiento", orden: 3, etapas: ["Inspección", "Trabajos de mantenimiento", "Pruebas", "Informe al cliente"] }
  ];
  const hoy = () => new Date().toISOString().slice(0, 10);
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;

  const vacio = () => ({ v: 1, cambios: false, sig: { o: 1, x: 1, p: 4 }, plantillas: JSON.parse(JSON.stringify(PLANTILLAS)), obras: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const obraLocal = (d, id) => { const x = d.obras.find(z => z.id === id); if (!x) throw new Error("Esa obra ya no existe."); return x; };

  const idb = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-fotos", 1); r.onupgradeneeded = () => r.result.createObjectStore("fotos"); r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (modo, fn) => abrir().then(db => new Promise((bien, mal) => { const x = db.transaction("fotos", modo); const r = fn(x.objectStore("fotos")); x.oncomplete = () => bien(r && r.result); x.onerror = () => mal(x.error); }));
    return { poner: (k, v) => tx("readwrite", s => s.put(v, k)), leer: k => tx("readonly", s => s.get(k)), quitar: k => tx("readwrite", s => s.delete(k)) };
  })();

  async function comprimir(file) {
    if (!/^image\//.test(file.type)) throw new Error(`«${file.name}» no es una foto.`);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const lado = 1600, f = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * f); cv.height = Math.round(img.naturalHeight * f);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise((bien, mal) => cv.toBlob(b => b ? bien(b) : mal(new Error("No se pudo leer la foto.")), "image/jpeg", 0.8));
    } catch (e) { throw new Error(`No se pudo leer la foto «${file.name}». Pruebe con otra.`); }
    finally { URL.revokeObjectURL(url); }
  }
  const urls = {};
  async function fotoUrl(ref) {
    if (urls[ref]) return urls[ref];
    if (!nube) { const b = await idb.leer(ref); if (!b) return null; return (urls[ref] = URL.createObjectURL(b)); }
    const r = await sb.storage.from("obras").createSignedUrl(ref, 3600);
    return r.error ? null : (urls[ref] = r.data.signedUrl);
  }

  async function plantillas() {
    if (!nube) return leer().plantillas.slice().sort((a, b) => a.orden - b.orden);
    return (await ok(await sb.from("plantillas_etapas").select("*").order("orden"), "No se pudieron leer las plantillas.")).map(p => ({ ...p, etapas: p.etapas || [] }));
  }
  async function guardarPlantillas(lista) {
    const limpia = lista.map((p, i) => ({ id: p.id || null, nombre: t(p.nombre), orden: i + 1, etapas: (p.etapas || []).map(t).filter(Boolean) })).filter(p => p.nombre);
    if (new Set(limpia.map(p => p.nombre.toLowerCase())).size !== limpia.length) throw new Error("Hay dos tipos de trabajo con el mismo nombre.");
    if (limpia.some(p => !p.etapas.length)) throw new Error("Cada tipo de trabajo necesita al menos una etapa.");
    if (!nube) { const d = leer(); limpia.forEach(p => { if (!p.id) p.id = d.sig.p++; }); d.plantillas = limpia; escribir(d); return; }
    const actuales = await plantillas();
    for (const p of limpia) {
      const r = p.id ? await sb.from("plantillas_etapas").update({ nombre: p.nombre, orden: p.orden, etapas: p.etapas }).eq("id", p.id) : await sb.from("plantillas_etapas").insert({ nombre: p.nombre, orden: p.orden, etapas: p.etapas });
      await ok(r, "No se pudieron guardar las plantillas.");
    }
    const quedan = new Set(limpia.filter(p => p.id).map(p => p.id));
    for (const p of actuales) if (!quedan.has(p.id)) await ok(await sb.from("plantillas_etapas").delete().eq("id", p.id), "No se pudo quitar una plantilla.");
  }

  const avance = etapas => etapas.length ? Math.round(etapas.filter(e => e.hecha).length / etapas.length * 100) : 0;
  const siguiente = etapas => (etapas.slice().sort((a, b) => a.orden - b.orden).find(e => !e.hecha) || {}).nombre || null;

  async function obras() {
    if (!nube) {
      const d = leer();
      const cl = Object.fromEntries((await D.clientes()).map(c => [c.id, c]));
      return d.obras.map(x => ({ ...x, cliente: cl[x.cliente_id] || null, avance: avance(x.etapas), etapa_actual: siguiente(x.etapas) })).sort((a, b) => b.numero.localeCompare(a.numero));
    }
    const l = await ok(await sb.from("obras").select("*, clientes (id, nombre, nit), obra_etapas (nombre, orden, hecha)").order("numero", { ascending: false }), "No se pudo leer la lista de obras.");
    return l.map(x => ({ ...x, cliente: x.clientes, avance: avance(x.obra_etapas), etapa_actual: siguiente(x.obra_etapas) }));
  }

  async function obra(id) {
    if (!nube) { const x = leer().obras.find(z => z.id === id); return x ? JSON.parse(JSON.stringify(x)) : null; }
    const x = await ok(await sb.from("obras").select("*, obra_etapas (*), obra_bitacora (*), obra_previstos (*), obra_movimientos (*), obra_tramites (*)").eq("id", id).maybeSingle(), "No se pudo leer la obra.");
    if (!x) return null;
    const n = v => v == null ? v : Number(v);
    const r = { ...x, etapas: x.obra_etapas.sort((a, b) => a.orden - b.orden), bitacora: x.obra_bitacora, previstos: x.obra_previstos.map(p => ({ ...p, cantidad: n(p.cantidad) })), movimientos: x.obra_movimientos.map(m => ({ ...m, cantidad: n(m.cantidad) })), tramites: x.obra_tramites };
    ["obra_etapas", "obra_bitacora", "obra_previstos", "obra_movimientos", "obra_tramites"].forEach(k => delete r[k]);
    return r;
  }

  async function obraDeCotizacion(cotId) {
    if (!nube) { const x = leer().obras.find(z => z.cotizacion_id === cotId); return x ? x.id : null; }
    const r = await sb.from("obras").select("id").eq("cotizacion_id", cotId).maybeSingle();
    return r.data ? r.data.id : null;
  }

  function siguienteNumero(l) { const n = l.map(x => Number((String(x.numero).match(/^OB-(\d+)$/) || [])[1] || 0)).reduce((a, b) => Math.max(a, b), 0); return "OB-" + String(n + 1).padStart(3, "0"); }

  async function crearObra(a) {
    if (!a.cliente_id) throw new Error("Escoja el cliente.");
    const pl = (await plantillas()).find(p => p.id === Number(a.plantilla_id));
    const etapas = (pl ? pl.etapas : []).map((nombre, i) => ({ nombre, orden: i, inicio: null, fin: null, responsable: null, hecha: false, fecha_hecha: null }));
    const cab = { cotizacion_id: a.cotizacion_id || null, cliente_id: a.cliente_id, sitio_id: a.sitio_id || null, titulo: t(a.titulo), estado: "programada", responsable: o(a.responsable), fecha_inicio: fechaO(a.fecha_inicio), notas: null };
    const pasos = Object.keys(PASOS).map(paso => ({ paso, estado: "pendiente", distribuidora: null, expediente: null, fecha_solicitud: null, fecha_resuelto: null, notas: null }));
    const previstos = (a.previstos || []).filter(p => p.cantidad > 0);
    if (!nube) {
      const d = leer();
      if (cab.cotizacion_id && d.obras.some(x => x.cotizacion_id === cab.cotizacion_id)) throw new Error("Esa cotización ya tiene su obra.");
      const id = d.sig.o++;
      d.obras.push({ id, numero: siguienteNumero(d.obras), ...cab, creado: new Date().toISOString(), etapas: etapas.map(e => ({ id: d.sig.x++, ...e })), bitacora: [], previstos, movimientos: [], tramites: pasos.map(p => ({ id: d.sig.x++, ...p })) });
      escribir(d); return id;
    }
    const nums = await ok(await sb.from("obras").select("numero"), "No se pudo crear la obra.");
    const r = await sb.from("obras").insert({ ...cab, numero: siguienteNumero(nums) }).select("id").single();
    if (r.error) throw new Error(/duplicate|unique/i.test(r.error.message) ? "Esa cotización ya tiene su obra." : "No se pudo crear la obra.");
    const id = r.data.id;
    if (etapas.length) await ok(await sb.from("obra_etapas").insert(etapas.map(e => ({ ...e, obra_id: id }))), "No se pudieron crear las etapas.");
    if (previstos.length) await ok(await sb.from("obra_previstos").insert(previstos.map(p => ({ ...p, obra_id: id }))), "No se pudieron guardar los materiales previstos.");
    await ok(await sb.from("obra_tramites").insert(pasos.map(p => ({ ...p, obra_id: id }))), "No se pudieron crear los trámites.");
    return id;
  }

  async function guardarObra(x) {
    const cab = { titulo: t(x.titulo), estado: ESTADOS_OBRA[x.estado] ? x.estado : "programada", responsable: o(x.responsable), fecha_inicio: fechaO(x.fecha_inicio), sitio_id: x.sitio_id || null, notas: o(x.notas) };
    if (!nube) { const d = leer(); Object.assign(obraLocal(d, x.id), cab); escribir(d); return; }
    await ok(await sb.from("obras").update(cab).eq("id", x.id), "No se pudo guardar la obra.");
  }

  async function guardarEtapa(obraId, e) {
    const datos = { nombre: t(e.nombre), inicio: fechaO(e.inicio), fin: fechaO(e.fin), responsable: o(e.responsable), hecha: !!e.hecha, fecha_hecha: e.hecha ? (fechaO(e.fecha_hecha) || hoy()) : null };
    if (!datos.nombre) throw new Error("Escriba el nombre de la etapa.");
    if (datos.inicio && datos.fin && datos.fin < datos.inicio) throw new Error("La fecha de fin no puede ser antes del inicio.");
    if (!nube) {
      const d = leer(); const x = obraLocal(d, obraId);
      if (e.id) Object.assign(x.etapas.find(z => z.id === e.id), datos);
      else x.etapas.push({ id: d.sig.x++, orden: x.etapas.length ? Math.max(...x.etapas.map(z => z.orden)) + 1 : 0, ...datos });
      escribir(d); return;
    }
    if (e.id) await ok(await sb.from("obra_etapas").update(datos).eq("id", e.id), "No se pudo guardar la etapa.");
    else { const n = await ok(await sb.from("obra_etapas").select("orden").eq("obra_id", obraId), ""); await ok(await sb.from("obra_etapas").insert({ ...datos, obra_id: obraId, orden: n.length ? Math.max(...n.map(z => z.orden)) + 1 : 0 }), "No se pudo agregar la etapa."); }
  }

  async function guardarBitacora(obraId, b, archivos) {
    const texto = t(b.texto);
    if (!texto) throw new Error("Escriba qué se hizo ese día.");
    const fecha = fechaO(b.fecha) || hoy();
    const fotos = (b.fotos || []).slice();
    for (const f of archivos || []) {
      const blob = await comprimir(f);
      if (!nube) { const ref = "F-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); await idb.poner(ref, blob); fotos.push(ref); }
      else { const ref = `${obraId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`; await ok(await sb.storage.from("obras").upload(ref, blob, { contentType: "image/jpeg" }), "No se pudo subir una foto."); fotos.push(ref); }
    }
    const datos = { fecha, texto, personal: o(b.personal), problemas: o(b.problemas), fotos };
    if (!nube) {
      const d = leer(); const x = obraLocal(d, obraId);
      if (b.id) Object.assign(x.bitacora.find(z => z.id === b.id), datos);
      else x.bitacora.push({ id: d.sig.x++, creado: new Date().toISOString(), ...datos });
      escribir(d); return;
    }
    if (b.id) await ok(await sb.from("obra_bitacora").update(datos).eq("id", b.id), "No se pudo guardar el día.");
    else await ok(await sb.from("obra_bitacora").insert({ ...datos, obra_id: obraId }), "No se pudo guardar el día.");
  }

  async function quitarFoto(ref) {
    if (!nube) { await idb.quitar(ref); return; }
    await sb.storage.from("obras").remove([ref]);
  }

  async function registrarMovimientos(obraId, tipo, fecha, nota, items) {
    const filas = items.filter(i => i.cantidad > 0).map(i => ({ material_id: i.material_id, tipo, cantidad: Number(i.cantidad), fecha: fechaO(fecha) || hoy(), nota: o(nota) }));
    if (!filas.length) throw new Error("Escriba la cantidad de al menos un material.");
    if (!["salida", "regreso"].includes(tipo)) throw new Error("Movimiento no válido.");
    if (!nube) { const d = leer(); const x = obraLocal(d, obraId); filas.forEach(f => x.movimientos.push({ id: d.sig.x++, ...f })); escribir(d); return; }
    await ok(await sb.from("obra_movimientos").insert(filas.map(f => ({ ...f, obra_id: obraId }))), "No se pudieron guardar los materiales.");
  }

  async function guardarMovimiento(obraId, id, cambios) {
    const datos = { cantidad: Number(cambios.cantidad), fecha: fechaO(cambios.fecha) || hoy(), nota: o(cambios.nota) };
    if (!(datos.cantidad > 0)) throw new Error("La cantidad tiene que ser mayor que cero. Para quitarlo use «Quitar».");
    const ob = await obra(obraId);
    const mv = ob.movimientos.find(z => z.id === id);
    if (!mv) throw new Error("Ese movimiento ya no existe.");
    const suma = tipo => ob.movimientos.filter(z => z.material_id === mv.material_id && z.tipo === tipo).reduce((a, z) => a + (z.id === id ? datos.cantidad : Number(z.cantidad)), 0);
    if (suma("regreso") > suma("salida") + 0.0005) throw new Error(mv.tipo === "regreso" ? "No puede regresar más de lo que salió a la obra." : "Ya regresó más de eso a bodega: corrija primero el regreso.");
    if (!nube) { const d = leer(); Object.assign(obraLocal(d, obraId).movimientos.find(z => z.id === id), datos); escribir(d); return; }
    await ok(await sb.from("obra_movimientos").update(datos).eq("id", id), "No se pudo guardar el movimiento.");
  }

  async function guardarTramite(obraId, r) {
    const datos = { estado: ESTADOS_TRAMITE[r.estado] ? r.estado : "pendiente", distribuidora: o(r.distribuidora), expediente: o(r.expediente), fecha_solicitud: fechaO(r.fecha_solicitud), fecha_resuelto: fechaO(r.fecha_resuelto), notas: o(r.notas) };
    if (datos.fecha_solicitud && datos.fecha_resuelto && datos.fecha_resuelto < datos.fecha_solicitud) throw new Error("La fecha de respuesta no puede ser antes de la solicitud.");
    if (!nube) { const d = leer(); Object.assign(obraLocal(d, obraId).tramites.find(z => z.id === r.id), datos); escribir(d); return; }
    await ok(await sb.from("obra_tramites").update(datos).eq("id", r.id), "No se pudo guardar el trámite.");
  }

  async function quitarObraItem(obraId, tabla, id) {
    const T = { etapas: "obra_etapas", bitacora: "obra_bitacora", movimientos: "obra_movimientos" };
    if (!T[tabla]) throw new Error("No se puede quitar eso.");
    if (!nube) {
      const d = leer(); const x = obraLocal(d, obraId);
      const it = x[tabla].find(z => z.id === id);
      if (tabla === "bitacora" && it) for (const f of it.fotos || []) await quitarFoto(f);
      x[tabla] = x[tabla].filter(z => z.id !== id); escribir(d); return;
    }
    if (tabla === "bitacora") { const r = await sb.from("obra_bitacora").select("fotos").eq("id", id).maybeSingle(); if (r.data && r.data.fotos.length) await sb.storage.from("obras").remove(r.data.fotos); }
    await ok(await sb.from(T[tabla]).delete().eq("id", id), "No se pudo quitar.");
  }

  Object.assign(D, { ESTADOS_OBRA, PASOS, ESTADOS_TRAMITE, plantillas, guardarPlantillas, obras, obra, obraDeCotizacion, crearObra, guardarObra, guardarEtapa, guardarBitacora, quitarFoto, fotoUrl, registrarMovimientos, guardarMovimiento, guardarTramite, quitarObraItem });
})();
