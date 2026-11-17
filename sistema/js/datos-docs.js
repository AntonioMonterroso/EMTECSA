"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.docs";
  const TIPOS = { "application/pdf": "PDF", "image/jpeg": "Foto", "image/png": "Imagen", "image/webp": "Imagen" };
  const MAX = 15 * 1024 * 1024;
  const leer = () => { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return { v: 1, cambios: false, sig: 1, fijos: [], fichas: {} }; };
  const escribir = d => { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo. Revise el espacio del navegador."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }

  const idb = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-docs", 1); r.onupgradeneeded = () => r.result.createObjectStore("archivos"); r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (modo, fn) => abrir().then(db => new Promise((bien, mal) => { const x = db.transaction("archivos", modo); const r = fn(x.objectStore("archivos")); x.oncomplete = () => bien(r && r.result); x.onerror = () => mal(x.error); }));
    return { poner: (k, v) => tx("readwrite", s => s.put(v, k)), leer: k => tx("readonly", s => s.get(k)), quitar: k => tx("readwrite", s => s.delete(k)) };
  })();

  const tipoDe = f => f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : /\.png$/i.test(f.name) ? "image/png" : /\.jpe?g$/i.test(f.name) ? "image/jpeg" : "");
  async function subirArchivo(file, carpeta = "docs") {
    const tipo = tipoDe(file);
    if (!TIPOS[tipo]) throw new Error(`«${file.name}» no es PDF ni foto. Suba un PDF, JPG o PNG.`);
    if (file.size > MAX) throw new Error(`«${file.name}» pesa más de 15 MB. Use un archivo más liviano.`);
    const ext = tipo === "application/pdf" ? "pdf" : tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
    const ref = `${carpeta}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    if (!nube) await idb.poner(ref, file);
    else await ok(await sb.storage.from("documentos").upload(ref, file, { contentType: tipo }), "No se pudo subir el archivo.");
    return { ref, nombre: file.name.replace(/\.[^.]+$/, ""), tipo, tam: file.size };
  }
  async function archivo(ref) {
    if (!ref) return null;
    if (!nube) return (await idb.leer(ref)) || null;
    const r = await sb.storage.from("documentos").download(ref);
    return r.error ? null : r.data;
  }
  async function quitarArchivo(ref) {
    if (!ref) return;
    try { if (!nube) await idb.quitar(ref); else await sb.storage.from("documentos").remove([ref]); } catch (e) {}
  }

  async function ajuste(clave, def) {
    const r = await sb.from("ajustes").select("valor").eq("clave", clave).maybeSingle();
    return (r.data && r.data.valor) || def;
  }
  async function docsFijos() {
    if (!nube) return leer().fijos.slice().sort((a, b) => a.orden - b.orden);
    return (await ajuste("documentos_fijos", [])).slice().sort((a, b) => a.orden - b.orden);
  }
  async function escribirFijos(lista) {
    const l = lista.map((x, i) => ({ ...x, orden: i }));
    if (!nube) { const d = leer(); d.fijos = l; escribir(d); return; }
    await ok(await sb.from("ajustes").upsert({ clave: "documentos_fijos", valor: l }), "No se pudieron guardar los documentos.");
  }
  async function guardarDocFijo(doc, file) {
    const nombre = String(doc.nombre || "").trim().replace(/\s+/g, " ");
    if (!nombre) throw new Error("Escriba el nombre del documento.");
    const l = await docsFijos();
    if (l.some(x => x.id !== doc.id && x.nombre.toLowerCase() === nombre.toLowerCase())) throw new Error("Ya hay un documento con ese nombre.");
    let x = doc.id ? l.find(y => y.id === doc.id) : null;
    if (!x && !file) throw new Error("Escoja el archivo del documento.");
    if (file) { const a = await subirArchivo(file, "fijos"); if (x) await quitarArchivo(x.ref); x = { ...(x || {}), ref: a.ref, tipo: a.tipo, tam: a.tam }; }
    x = { ...x, id: x.id || Date.now(), nombre, siempre: doc.siempre !== false };
    const nuevo = l.some(y => y.id === x.id) ? l.map(y => y.id === x.id ? x : y) : [...l, x];
    await escribirFijos(nuevo);
    return x;
  }
  async function quitarDocFijo(id) {
    const l = await docsFijos(), x = l.find(y => y.id === id);
    if (x) await quitarArchivo(x.ref);
    await escribirFijos(l.filter(y => y.id !== id));
  }
  async function ordenarDocsFijos(ids) {
    const l = await docsFijos();
    await escribirFijos(ids.map(id => l.find(x => x.id === id)).filter(Boolean));
  }

  async function fichas() {
    if (!nube) return leer().fichas || {};
    return ajuste("fichas_tecnicas", {});
  }
  async function ponerFicha(materialId, file) {
    const mapa = { ...(await fichas()) };
    const vieja = mapa[materialId];
    if (file) { const a = await subirArchivo(file, "fichas"); mapa[materialId] = { ref: a.ref, nombre: a.nombre, tipo: a.tipo, tam: a.tam }; }
    else delete mapa[materialId];
    if (vieja) await quitarArchivo(vieja.ref);
    if (!nube) { const d = leer(); d.fichas = mapa; escribir(d); return mapa[materialId] || null; }
    await ok(await sb.from("ajustes").upsert({ clave: "fichas_tecnicas", valor: mapa }), "No se pudo guardar la ficha técnica.");
    return mapa[materialId] || null;
  }

  const tamTxt = n => !n ? "" : n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1024 / 1024).toFixed(1) + " MB";
  async function guardarBlob(ref, blob, tipo) {
    if (!nube) { await idb.poner(ref, blob); return; }
    await ok(await sb.storage.from("documentos").upload(ref, blob, { contentType: tipo || blob.type, upsert: true }), "No se pudo subir el archivo.");
  }
  async function urlFirmada(ref, segundos) {
    if (!nube) return null;
    const r = await sb.storage.from("documentos").createSignedUrl(ref, segundos);
    if (r.error) throw new Error("No se pudo preparar el archivo para el cliente.");
    return r.data.signedUrl;
  }
  Object.assign(D, { guardarBlob, urlFirmada, TIPOS_DOC: TIPOS, subirArchivo, archivo, quitarArchivo, docsFijos, guardarDocFijo, quitarDocFijo, ordenarDocsFijos, fichas, ponerFicha, tamTxt });
})();
