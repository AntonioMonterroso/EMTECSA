"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.licitaciones";
  const MODALIDADES = { licitacion: "Licitación", cotizacion: "Cotización", baja_cuantia: "Baja cuantía", compra_directa: "Compra directa", contrato_abierto: "Contrato abierto", otra: "Otra" };
  const ESTADOS = { preparando: "Preparando", presentada: "Presentada", ganada: "Ganada", perdida: "Perdida", desierta: "Desierta", no_participa: "No participamos" };
  const ACTIVAS = ["preparando", "presentada"];
  const FECHAS = { publicacion: "Publicación", preguntas: "Último día de preguntas", ofertas: "Entrega de ofertas", apertura: "Apertura de plicas", adjudicacion: "Adjudicación" };
  const BASE = ["Constancia de inscripción en el RGAE", "RTU actualizado", "Patente de comercio de empresa", "Patente de comercio de sociedad", "Escritura de constitución", "Nombramiento del representante legal", "DPI del representante legal", "Solvencia fiscal (SAT)", "Estados financieros", "Constancias de experiencia"];
  const PROPIOS = ["Declaración jurada", "Fianza de sostenimiento de oferta", "Oferta técnica", "Oferta económica"];
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const montoO = s => { const v = String(s == null ? "" : s).replace(/[Q,\s]/g, ""); if (!v) return null; const n = Number(v); if (!isFinite(n) || n < 0) throw new Error("Revise los montos: solo números."); return r2(n); };
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const vacio = () => ({ v: 1, sig: 1, sigDoc: 1, lics: [], docs: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const idb = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-licitaciones", 1); r.onupgradeneeded = () => r.result.createObjectStore("archivos"); r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (modo, fn) => abrir().then(db => new Promise((bien, mal) => { const x = db.transaction("archivos", modo); const q = fn(x.objectStore("archivos")); x.oncomplete = () => bien(q && q.result); x.onerror = () => mal(x.error); }));
    return { poner: (k, v) => tx("readwrite", s => s.put(v, k)), leer: k => tx("readonly", s => s.get(k)), quitar: k => tx("readwrite", s => s.delete(k)) };
  })();
  const num = x => ({ ...x, monto_base: x.monto_base == null ? null : Number(x.monto_base), monto_oferta: x.monto_oferta == null ? null : Number(x.monto_oferta) });

  async function subir(carpeta, file) {
    if (!file || !file.size) throw new Error("Escoja el archivo.");
    if (file.size > 20 * 1024 * 1024) throw new Error(`«${file.name}» pesa más de 20 MB.`);
    const ext = (file.name.match(/\.[a-z0-9]{1,5}$/i) || [""])[0].toLowerCase();
    const ref = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    if (!nube) await idb.poner(ref, file);
    else { const r = await sb.storage.from("licitaciones").upload(ref, file, { contentType: file.type || "application/octet-stream" }); if (r.error) throw new Error("No se pudo subir el archivo."); }
    return ref;
  }
  async function borrarArchivo(ref) { if (!ref) return; if (!nube) await idb.quitar(ref).catch(() => {}); else await sb.storage.from("licitaciones").remove([ref]).catch(() => {}); }
  const urls = {};
  async function archivoLicitacion(ref) {
    if (urls[ref]) return urls[ref];
    if (!nube) { const b = await idb.leer(ref); return b ? (urls[ref] = URL.createObjectURL(b)) : null; }
    const r = await sb.storage.from("licitaciones").createSignedUrl(ref, 3600); return r.error ? null : (urls[ref] = r.data.signedUrl);
  }

  async function documentosEmpresa() {
    if (!nube) {
      const d = leer();
      if (!d.docs.length && !d.docsListos) { d.docs = BASE.map((nombre, i) => ({ id: d.sigDoc++, nombre, vence: null, archivo: null, archivo_nombre: null, en_lista: true, orden: i + 1, notas: null })); d.docsListos = true; escribir(d); }
      return d.docs.slice().sort((a, b) => a.orden - b.orden || a.id - b.id);
    }
    return ok(await sb.from("documentos_empresa").select("*").order("orden").order("id"), "No se pudieron leer los papeles de la empresa.");
  }
  function estadoDoc(x, fecha) {
    if (!x.vence) return { k: x.archivo ? "ok" : "falta", n: x.archivo ? "Al día" : "Sin archivo" };
    if (x.vence < hoy()) return { k: "vencido", n: "Vencido" };
    if (fecha && x.vence < fecha) return { k: "vencido", n: "Vence antes de la entrega" };
    const d = Math.round((new Date(x.vence + "T12:00:00") - new Date(hoy() + "T12:00:00")) / 864e5);
    if (!fecha && d <= 30) return { k: "pronto", n: d === 0 ? "Vence hoy" : `Vence en ${d} ${d === 1 ? "día" : "días"}` };
    return { k: x.archivo ? "ok" : "falta", n: x.archivo ? "Al día" : "Sin archivo" };
  }
  async function guardarDocEmpresa(x, archivo) {
    const datos = { nombre: t(x.nombre), vence: fechaO(x.vence), en_lista: x.en_lista !== false, notas: o(x.notas), actualizado: new Date().toISOString() };
    if (!datos.nombre) throw new Error("Escriba el nombre del papel.");
    const previo = x.id ? (await documentosEmpresa()).find(z => z.id === x.id) : null;
    if (archivo) { datos.archivo = await subir("empresa", archivo); datos.archivo_nombre = archivo.name; if (previo && previo.archivo) await borrarArchivo(previo.archivo); }
    if (!nube) {
      const d = leer();
      if (x.id) Object.assign(d.docs.find(z => z.id === x.id), datos);
      else d.docs.push({ id: d.sigDoc++, archivo: null, archivo_nombre: null, orden: d.docs.length + 1, ...datos });
      escribir(d); return;
    }
    if (x.id) await ok(await sb.from("documentos_empresa").update(datos).eq("id", x.id), "No se pudo guardar el papel.");
    else await ok(await sb.from("documentos_empresa").insert({ ...datos, orden: (await documentosEmpresa()).length + 1 }), "No se pudo guardar el papel.");
  }
  async function quitarDocEmpresa(id) {
    const x = (await documentosEmpresa()).find(z => z.id === id); if (!x) return;
    await borrarArchivo(x.archivo);
    if (!nube) { const d = leer(); d.docs = d.docs.filter(z => z.id !== id); escribir(d); return; }
    await ok(await sb.from("documentos_empresa").delete().eq("id", id), "No se pudo quitar el papel.");
  }

  async function licitaciones() {
    const l = !nube ? leer().lics : await ok(await sb.from("licitaciones").select("*").order("ofertas", { ascending: true, nullsFirst: false }), "No se pudieron leer las licitaciones.");
    return l.map(num).sort((a, b) => (ACTIVAS.includes(b.estado) - ACTIVAS.includes(a.estado)) || String(a.ofertas || "9999").localeCompare(String(b.ofertas || "9999")) || b.id - a.id);
  }
  async function licitacion(id) { return (await licitaciones()).find(x => x.id === id) || null; }

  function proximaFecha(x) {
    const h = hoy();
    const l = ["preguntas", "ofertas", "apertura", "adjudicacion"].filter(k => x[k] && x[k] >= h).map(k => ({ k, n: FECHAS[k], f: x[k] }));
    return l.sort((a, b) => a.f.localeCompare(b.f))[0] || null;
  }

  async function poner(id, cambios) {
    if (!nube) { const d = leer(); Object.assign(d.lics.find(z => z.id === id), cambios, { actualizado: new Date().toISOString() }); escribir(d); return; }
    await ok(await sb.from("licitaciones").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id), "No se pudo guardar la licitación.");
  }

  async function guardarLicitacion(x) {
    const datos = {
      nog: o(String(x.nog || "").replace(/\D/g, "")), titulo: t(x.titulo), entidad: t(x.entidad), modalidad: MODALIDADES[x.modalidad] ? x.modalidad : "licitacion",
      responsable: x.responsable || null, responsable_nombre: o(x.responsable_nombre), monto_base: montoO(x.monto_base),
      publicacion: fechaO(x.publicacion), preguntas: fechaO(x.preguntas), ofertas: fechaO(x.ofertas), ofertas_hora: /^\d{2}:\d{2}$/.test(t(x.ofertas_hora)) ? t(x.ofertas_hora) : null, apertura: fechaO(x.apertura), adjudicacion: fechaO(x.adjudicacion),
      notas: o(x.notas), actualizado: new Date().toISOString()
    };
    if (!datos.titulo) throw new Error("Escriba qué se compra, por ejemplo «Mejoras eléctricas del centro de salud».");
    if (!datos.entidad) throw new Error("Escriba la entidad que compra.");
    if (datos.nog && datos.nog.length < 5) throw new Error("Revise el NOG: es el número de Guatecompras.");
    if (datos.preguntas && datos.ofertas && datos.preguntas > datos.ofertas) throw new Error("El último día de preguntas va antes de la entrega de ofertas.");
    if (datos.apertura && datos.ofertas && datos.apertura < datos.ofertas) throw new Error("La apertura va el día de la entrega o después.");
    const todas = await licitaciones();
    if (datos.nog && todas.some(z => z.nog === datos.nog && z.id !== x.id)) throw new Error(`El NOG ${datos.nog} ya está registrado.`);
    let id = x.id;
    if (!id) {
      const docs = await documentosEmpresa();
      datos.papeles = docs.filter(z => z.en_lista).map(z => ({ nombre: z.nombre, doc_id: z.id, listo: false })).concat(PROPIOS.map(nombre => ({ nombre, doc_id: null, listo: false })));
      const opId = D.guardarOportunidad ? await D.guardarOportunidad({ titulo: datos.titulo, prospecto: { nombre: datos.entidad }, origen: "licitacion", etapa: "cotizando", monto: datos.monto_base, cierre: datos.adjudicacion || datos.ofertas, responsable: datos.responsable, responsable_nombre: datos.responsable_nombre, notas: datos.nog ? `NOG ${datos.nog}` : null }).catch(() => null) : null;
      datos.oportunidad_id = opId;
      if (!nube) { const d = leer(); id = d.sig++; d.lics.push({ id, estado: "preparando", monto_oferta: null, archivos: [], resultado: null, creado: new Date().toISOString(), ...datos }); escribir(d); }
      else id = (await ok(await sb.from("licitaciones").insert(datos).select("id").single(), "No se pudo guardar la licitación.")).id;
      return id;
    }
    await poner(id, datos);
    const previo = todas.find(z => z.id === id);
    if (previo && previo.oportunidad_id && D.oportunidades) {
      const op = (await D.oportunidades().catch(() => [])).find(z => z.id === previo.oportunidad_id);
      if (op && D.ABIERTAS_OP.includes(op.etapa)) await D.guardarOportunidad({ ...op, titulo: datos.titulo, monto: previo.monto_oferta != null ? previo.monto_oferta : datos.monto_base, cierre: datos.adjudicacion || datos.ofertas, responsable: datos.responsable, responsable_nombre: datos.responsable_nombre, prospecto: op.cliente_id ? null : { ...(op.prospecto || {}), nombre: datos.entidad } }).catch(() => {});
    }
    return id;
  }

  async function marcarPapel(x, i, listo) { const p = (x.papeles || []).map((z, k) => k === i ? { ...z, listo: !!listo } : z); await poner(x.id, { papeles: p }); return p; }
  async function agregarPapel(x, nombre) { if (!t(nombre)) throw new Error("Escriba qué papel piden."); const p = (x.papeles || []).concat({ nombre: t(nombre), doc_id: null, listo: false }); await poner(x.id, { papeles: p }); return p; }
  async function quitarPapel(x, i) { const p = (x.papeles || []).filter((z, k) => k !== i); await poner(x.id, { papeles: p }); return p; }

  async function agregarArchivo(x, file, tipo) { const ref = await subir(`lic-${x.id}`, file); const a = (x.archivos || []).concat({ ref, nombre: file.name, tipo: t(tipo) || "Otro", fecha: hoy() }); await poner(x.id, { archivos: a }); return a; }
  async function quitarArchivo(x, ref) { await borrarArchivo(ref); const a = (x.archivos || []).filter(z => z.ref !== ref); await poner(x.id, { archivos: a }); return a; }

  async function presentar(x, monto) {
    const m = montoO(monto);
    if (m == null || !(m > 0)) throw new Error("Escriba el monto de la oferta que se presentó.");
    await poner(x.id, { estado: "presentada", monto_oferta: m });
    if (x.oportunidad_id && D.oportunidades) {
      const op = (await D.oportunidades().catch(() => [])).find(z => z.id === x.oportunidad_id);
      if (op && D.ABIERTAS_OP.includes(op.etapa)) { await D.guardarOportunidad({ ...op, monto: m, etapa: "negociacion" }).catch(() => {}); }
    }
  }

  async function guardarResultado(x, res) {
    const estado = ["ganada", "perdida", "desierta", "no_participa"].includes(res.estado) ? res.estado : null;
    if (!estado) throw new Error("Escoja cómo terminó.");
    const r = { ganador: estado === "perdida" ? t(res.ganador) || null : null, monto_ganador: estado === "perdida" ? montoO(res.monto_ganador) : null, notas: o(res.notas), fecha: fechaO(res.fecha) || hoy() };
    if (estado === "perdida" && !r.ganador) throw new Error("Escriba quién ganó; sirve para ver a la competencia.");
    await poner(x.id, { estado, resultado: r });
    if (x.oportunidad_id && D.moverOportunidad) {
      if (estado === "ganada") await D.moverOportunidad(x.oportunidad_id, "ganada").catch(() => {});
      else {
        const motivo = estado === "perdida" ? `Licitación: ganó ${r.ganador}${r.monto_ganador != null ? " por Q " + r.monto_ganador.toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}` : estado === "desierta" ? "Licitación desierta" : "No participamos en la licitación";
        await D.moverOportunidad(x.oportunidad_id, "perdida", motivo).catch(() => {});
      }
    }
    return r;
  }
  async function reabrirLicitacion(x) {
    await poner(x.id, { estado: x.monto_oferta != null ? "presentada" : "preparando", resultado: null });
    if (x.oportunidad_id && D.moverOportunidad) await D.moverOportunidad(x.oportunidad_id, x.monto_oferta != null ? "negociacion" : "cotizando").catch(() => {});
  }
  async function quitarLicitacion(x) {
    for (const a of x.archivos || []) await borrarArchivo(a.ref);
    if (!nube) { const d = leer(); d.lics = d.lics.filter(z => z.id !== x.id); escribir(d); }
    else await ok(await sb.from("licitaciones").delete().eq("id", x.id), "No se pudo quitar la licitación.");
  }

  function competencia(l) {
    const cerr = l.filter(x => x.estado === "ganada" || x.estado === "perdida");
    const filas = l.filter(x => x.estado === "perdida" && x.resultado && x.resultado.ganador).map(x => ({ x, ganador: x.resultado.ganador, monto: x.resultado.monto_ganador, nuestro: x.monto_oferta, dif: x.resultado.monto_ganador != null && x.monto_oferta ? Math.round((x.monto_oferta - x.resultado.monto_ganador) / x.resultado.monto_ganador * 1000) / 10 : null }));
    const porGanador = {};
    filas.forEach(f => { const k = D.normal ? D.normal(f.ganador) : f.ganador.toLowerCase(); (porGanador[k] = porGanador[k] || { nombre: f.ganador, veces: 0, difs: [] }); porGanador[k].veces++; if (f.dif != null) porGanador[k].difs.push(f.dif); });
    return {
      presentadas: l.filter(x => x.monto_oferta != null).length, ganadas: cerr.filter(x => x.estado === "ganada").length, cerradas: cerr.length,
      tasa: cerr.length ? Math.round(cerr.filter(x => x.estado === "ganada").length / cerr.length * 100) : null,
      ganadoMonto: r2(l.filter(x => x.estado === "ganada").reduce((a, x) => a + (x.monto_oferta || 0), 0)),
      filas, rivales: Object.values(porGanador).map(g => ({ ...g, difProm: g.difs.length ? Math.round(g.difs.reduce((a, b) => a + b, 0) / g.difs.length * 10) / 10 : null })).sort((a, b) => b.veces - a.veces)
    };
  }

  Object.assign(D, { MODALIDADES_LIC: MODALIDADES, ESTADOS_LIC: ESTADOS, ACTIVAS_LIC: ACTIVAS, FECHAS_LIC: FECHAS, documentosEmpresa, estadoDoc, guardarDocEmpresa, quitarDocEmpresa, archivoLicitacion, licitaciones, licitacion, proximaFecha, guardarLicitacion, marcarPapel, agregarPapel, quitarPapel, agregarArchivo, quitarArchivo, presentar, guardarResultadoLicitacion: guardarResultado, reabrirLicitacion, quitarLicitacion, competencia });
})();
