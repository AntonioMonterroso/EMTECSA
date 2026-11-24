"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.visitas";
  const ESTADOS = { programada: "Programada", hecha: "Hecha", cancelada: "Cancelada" };
  const SIGUIENTE = { cotizar: "Cotizar", otra: "Otra visita", no_aplica: "No aplica" };
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const numO = s => { const v = String(s == null ? "" : s).replace(/,/g, "").trim(); if (!v) return null; const n = Number(v); return isFinite(n) ? n : NaN; };
  const vacio = () => ({ v: 1, sig: 1, visitas: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const idb = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-visitas", 1); r.onupgradeneeded = () => r.result.createObjectStore("fotos"); r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (modo, fn) => abrir().then(db => new Promise((bien, mal) => { const x = db.transaction("fotos", modo); const q = fn(x.objectStore("fotos")); x.oncomplete = () => bien(q && q.result); x.onerror = () => mal(x.error); }));
    return { poner: (k, v) => tx("readwrite", s => s.put(v, k)), leer: k => tx("readonly", s => s.get(k)), quitar: k => tx("readwrite", s => s.delete(k)) };
  })();

  async function visitas(desde, hasta) {
    let l = !nube ? leer().visitas.filter(v => (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta))
      : await ok(await (() => { let q = sb.from("visitas").select("*").order("fecha").order("hora"); if (desde) q = q.gte("fecha", desde); if (hasta) q = q.lte("fecha", hasta); return q; })(), "No se pudieron leer las visitas.");
    const cl = Object.fromEntries((await D.clientes().catch(() => [])).map(c => [c.id, c]));
    return l.map(v => ({ ...v, cliente: v.cliente_id ? cl[v.cliente_id] || null : null, quien: v.cliente_id && cl[v.cliente_id] ? cl[v.cliente_id].nombre : (v.prospecto && v.prospecto.nombre) || "Sin nombre" })).sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.hora || "99").localeCompare(String(b.hora || "99")));
  }
  async function visitasDeOportunidad(opId) {
    if (!nube) return leer().visitas.filter(v => v.oportunidad_id === opId);
    return ok(await sb.from("visitas").select("*").eq("oportunidad_id", opId).order("fecha"), "No se pudieron leer las visitas.");
  }

  async function guardarVisita(x) {
    let lat = x.lat, lng = x.lng;
    if (t(x.mapa)) { const c = D.coordsDe ? D.coordsDe(x.mapa) : null; if (!c) throw new Error("No se encontró la ubicación. Pegue el enlace de Google Maps o escriba «latitud, longitud»."); lat = c.lat; lng = c.lng; }
    const datos = {
      fecha: fechaO(x.fecha), hora: /^\d{2}:\d{2}$/.test(t(x.hora)) ? t(x.hora) : null, ingeniero: x.ingeniero || null, ingeniero_nombre: o(x.ingeniero_nombre),
      oportunidad_id: x.oportunidad_id ? Number(x.oportunidad_id) : null, cliente_id: x.cliente_id ? Number(x.cliente_id) : null, prospecto: x.cliente_id ? null : (x.prospecto && t(x.prospecto.nombre) ? x.prospecto : null),
      sitio_id: x.sitio_id ? Number(x.sitio_id) : null, lugar: o(x.lugar), lat: lat == null || lat === "" ? null : Number(lat), lng: lng == null || lng === "" ? null : Number(lng),
      contacto: o(x.contacto), telefono: o(x.telefono), motivo: o(x.motivo), actualizado: new Date().toISOString()
    };
    if (!datos.fecha) throw new Error("Escoja el día de la visita.");
    if (!datos.cliente_id && !datos.prospecto) throw new Error("Escoja el cliente o la oportunidad.");
    if (!datos.ingeniero) throw new Error("Escoja quién va a la visita.");
    if (!datos.lugar && !datos.sitio_id && datos.lat == null) throw new Error("Escriba dónde es la visita o escoja el sitio del cliente.");
    const todas = await visitas(datos.fecha, datos.fecha);
    const choque = datos.hora && todas.find(v => v.id !== x.id && v.estado === "programada" && v.ingeniero === datos.ingeniero && v.hora && Math.abs((+v.hora.slice(0, 2) * 60 + +v.hora.slice(3)) - (+datos.hora.slice(0, 2) * 60 + +datos.hora.slice(3))) < 60);
    if (choque) throw new Error(`${datos.ingeniero_nombre || "Esa persona"} ya tiene una visita a las ${choque.hora} con ${String(choque.quien).replace(/\.$/, "")}. Deje al menos una hora entre visitas.`);
    let id = x.id;
    if (!nube) { const d = leer(); if (x.id) Object.assign(d.visitas.find(z => z.id === x.id), datos); else { id = d.sig++; d.visitas.push({ id, ...datos, estado: "programada", recordada: null, resultado: null, fotos: [], creado_por: window.EMT_APP && window.EMT_APP.sesion() ? window.EMT_APP.sesion().perfil.id : null, creado: new Date().toISOString() }); } escribir(d); }
    else if (x.id) await ok(await sb.from("visitas").update(datos).eq("id", x.id), "No se pudo guardar la visita.");
    else id = (await ok(await sb.from("visitas").insert(datos).select("id").single(), "No se pudo guardar la visita.")).id;
    if (datos.oportunidad_id && !x.id && D.oportunidades) {
      const op = (await D.oportunidades().catch(() => [])).find(z => z.id === datos.oportunidad_id);
      if (op && op.etapa === "nueva") await D.moverOportunidad(op.id, "visita").catch(() => {});
    }
    return id;
  }
  async function poner(id, cambios) {
    if (!nube) { const d = leer(); Object.assign(d.visitas.find(z => z.id === id), cambios, { actualizado: new Date().toISOString() }); escribir(d); return; }
    await ok(await sb.from("visitas").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id), "No se pudo guardar la visita.");
  }
  const marcarRecordada = id => poner(id, { recordada: new Date().toISOString() });
  async function cancelarVisita(id) { await poner(id, { estado: "cancelada" }); }
  async function quitarVisita(id) {
    if (!nube) { const d = leer(); d.visitas = d.visitas.filter(z => z.id !== id); escribir(d); return; }
    await ok(await sb.from("visitas").delete().eq("id", id), "No se pudo quitar la visita.");
  }

  async function comprimir(file) {
    if (!/^image\//.test(file.type)) throw new Error(`«${file.name}» no es una foto.`);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const f = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * f); cv.height = Math.round(img.naturalHeight * f);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise((bien, mal) => cv.toBlob(b => b ? bien(b) : mal(new Error("No se pudo leer la foto.")), "image/jpeg", 0.8));
    } finally { URL.revokeObjectURL(url); }
  }
  async function subirFoto(visitaId, file) {
    const b = await comprimir(file);
    const ref = `${visitaId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    if (!nube) await idb.poner(ref, b);
    else { const r = await sb.storage.from("visitas").upload(ref, b, { contentType: "image/jpeg" }); if (r.error) throw new Error("No se pudo subir la foto."); }
    return ref;
  }
  const urls = {};
  async function fotoVisita(ref) {
    if (urls[ref]) return urls[ref];
    if (!nube) { const b = await idb.leer(ref); return b ? (urls[ref] = URL.createObjectURL(b)) : null; }
    const r = await sb.storage.from("visitas").createSignedUrl(ref, 3600); return r.error ? null : (urls[ref] = r.data.signedUrl);
  }

  async function guardarResultado(v, res, archivos, quitar) {
    const r = {
      que: t(res.que), carga_kw: numO(res.carga_kw), voltaje: t(res.voltaje) || null, corriente: numO(res.corriente), fp: numO(res.fp),
      trafo_kva: numO(res.trafo_kva), trafo_estado: t(res.trafo_estado) || null, siguiente: SIGUIENTE[res.siguiente] ? res.siguiente : "cotizar", notas: t(res.notas) || null, fecha: new Date().toISOString()
    };
    if (!r.que) throw new Error("Escriba qué se vio en la visita.");
    for (const k of ["carga_kw", "corriente", "fp", "trafo_kva"]) if (Number.isNaN(r[k])) throw new Error("Revise las mediciones: solo números.");
    if (r.fp != null && !(r.fp > 0 && r.fp <= 1)) throw new Error("El factor de potencia va de 0 a 1, por ejemplo 0.92.");
    let fotos = (v.fotos || []).filter(f => !(quitar || []).includes(f));
    for (const f of (quitar || [])) { if (!nube) await idb.quitar(f).catch(() => {}); else await sb.storage.from("visitas").remove([f]).catch(() => {}); }
    for (const f of archivos || []) fotos.push(await subirFoto(v.id, f));
    await poner(v.id, { estado: "hecha", resultado: r, fotos });
    if (v.oportunidad_id && D.moverOportunidad) {
      if (r.siguiente === "no_aplica") await D.moverOportunidad(v.oportunidad_id, "perdida", "No aplica (visita técnica)").catch(() => {});
      if (r.siguiente === "cotizar") { const op = (await D.oportunidades().catch(() => [])).find(z => z.id === v.oportunidad_id); if (op && (op.etapa === "nueva" || op.etapa === "visita")) await D.moverOportunidad(op.id, "cotizando").catch(() => {}); }
    }
    return r;
  }

  function rutaDe(l) {
    const p = l.map(v => v.lat != null && v.lng != null ? `${v.lat},${v.lng}` : [v.lugar].filter(Boolean).join(", ")).filter(Boolean);
    if (!p.length) return null;
    const enc = encodeURIComponent;
    if (p.length === 1) return `https://www.google.com/maps/dir/?api=1&destination=${enc(p[0])}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${enc(p[p.length - 1])}&waypoints=${p.slice(0, -1).map(enc).join("%7C")}`;
  }

  Object.assign(D, { ESTADOS_VISITA: ESTADOS, SIGUIENTE_VISITA: SIGUIENTE, visitas, visitasDeOportunidad, guardarVisita, marcarRecordada, cancelarVisita, quitarVisita, guardarResultado, fotoVisita, rutaVisitas: rutaDe });
})();
