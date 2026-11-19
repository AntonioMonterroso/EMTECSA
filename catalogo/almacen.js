"use strict";
(function () {
  const BASE = "emtecsa-catalogo";
  let abierta = null;

  function db() {
    if (abierta) return abierta;
    abierta = new Promise((ok, mal) => {
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("pedidos")) d.createObjectStore("pedidos", { keyPath: "id" });
        if (!d.objectStoreNames.contains("archivos")) d.createObjectStore("archivos");
        if (!d.objectStoreNames.contains("ajustes")) d.createObjectStore("ajustes");
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => mal(r.error);
    });
    return abierta;
  }

  async function op(almacen, modo, fn) {
    const d = await db();
    return new Promise((ok, mal) => {
      const tx = d.transaction(almacen, modo);
      const st = tx.objectStore(almacen);
      const r = fn(st);
      tx.oncomplete = () => ok(r && "result" in r ? r.result : undefined);
      tx.onerror = () => mal(tx.error);
    });
  }

  const canal = "BroadcastChannel" in window ? new BroadcastChannel("emtecsa-pedidos") : null;
  const oyentes = new Set();
  if (canal) canal.onmessage = e => oyentes.forEach(f => f(e.data));
  addEventListener("storage", e => {
    if (!canal && e.key === "emtecsa.senal" && e.newValue) { try { const d = JSON.parse(e.newValue); oyentes.forEach(f => f(d)); } catch (x) {} }
  });
  function emitir(msg) {
    if (canal) { canal.postMessage(msg); return; }
    try { localStorage.setItem("emtecsa.senal", JSON.stringify({ ...msg, n: Date.now() })); } catch (x) {}
  }

  const CFG = window.EMTECSA_CONFIG || {};
  const nube = !!(CFG.url && CFG.llave);
  const ERRORES = { telefono_invalido: "Revise su número de teléfono.", nombre_invalido: "Revise su nombre.", muchos_pedidos: "Ya recibimos varios pedidos de este número. Espere un momento o escríbanos.", archivo_grande: "El comprobante pesa mucho. Tómele una foto más pequeña o mande el PDF.", tipo_invalido: "Mande el comprobante como foto o PDF.", no_espera_comprobante: "Este pedido ya tiene comprobante. Espere la revisión de EMTECSA.", pedido_no_existe: "No encontramos su pedido. Escríbanos para ayudarle." };
  async function rpc(fn, args) {
    let r;
    try { r = await fetch(CFG.url + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: CFG.llave, Authorization: "Bearer " + CFG.llave, "Content-Type": "application/json" }, body: JSON.stringify(args) }); }
    catch (x) { throw new Error("No hay conexión. Revise su internet e intente otra vez."); }
    let d = null; try { d = await r.json(); } catch (x) {}
    if (!r.ok) throw new Error(ERRORES[d && d.message] || "No se pudo enviar a EMTECSA. Intente otra vez en un momento.");
    return d;
  }
  const DEL_SERVIDOR = ["id", "estado", "total", "comprobante", "notaEmtecsa", "historia", "creado", "actualizado"];
  const mezclar = (p, s) => { if (s) DEL_SERVIDOR.forEach(k => { if (s[k] !== undefined) p[k] = s[k]; }); return p; };

  function aBase64(blob) {
    return new Promise((bien, mal) => { const r = new FileReader(); r.onload = () => bien(String(r.result).split(",")[1] || ""); r.onerror = () => mal(new Error("No se pudo leer el comprobante.")); r.readAsDataURL(blob); });
  }
  async function achicar(blob) {
    if (!/^image\/(jpeg|png|webp)$/.test(blob.type) || blob.size < 900000 || !("createImageBitmap" in window)) return blob;
    try {
      const img = await createImageBitmap(blob);
      const k = Math.min(1, 1800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const salida = await new Promise(b => c.toBlob(b, "image/jpeg", 0.82));
      return salida && salida.size < blob.size ? salida : blob;
    } catch (x) { return blob; }
  }

  async function siguienteNumero() {
    if (nube) return "PED-NUEVO";
    const n = await op("ajustes", "readwrite", st => {
      const r = st.get("consecutivo");
      r.onsuccess = () => st.put((r.result || 0) + 1, "consecutivo");
      return r;
    });
    return "PED-" + String((n || 0) + 1).padStart(4, "0");
  }

  async function guardar(p) {
    p.actualizado = new Date().toISOString();
    if (nube && !p.token) {
      const s = await rpc("tienda_pedir", { p_datos: { cliente: p.cliente, nota: p.nota, items: p.items, total: p.total, cotizar: p.cotizar } });
      p.token = s.token; mezclar(p, s);
    } else if (nube && p.estado === "comprobante-recibido" && p.comprobante && !p.comprobante.enviado) {
      const blob = await achicar(await leerArchivo(p.id + "-comprobante"));
      if (!blob) throw new Error("No se pudo leer el comprobante.");
      const s = await rpc("tienda_comprobante", { p_token: p.token, p_contenido: await aBase64(blob), p_tipo: blob.type || "image/jpeg", p_nombre: p.comprobante.nombre || "comprobante", p_leido: p.comprobante.leido || null });
      mezclar(p, s); p.comprobante.enviado = true;
    }
    await op("pedidos", "readwrite", st => st.put(p));
    emitir({ tipo: "pedido", id: p.id, estado: p.estado });
    return p;
  }
  async function leer(id) {
    const p = await op("pedidos", "readonly", st => st.get(id));
    if (!nube || !p || !p.token) return p;
    try {
      const s = await rpc("tienda_ver", { p_token: p.token });
      if (s) { const env = p.comprobante && p.comprobante.enviado; mezclar(p, s); if (p.comprobante && env) p.comprobante.enviado = true; await op("pedidos", "readwrite", st => st.put(p)); }
    } catch (x) {}
    return p;
  }
  const todos = async () => ((await op("pedidos", "readonly", st => st.getAll())) || []).sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
  const guardarArchivo = (id, blob) => op("archivos", "readwrite", st => st.put(blob, id));
  const leerArchivo = id => op("archivos", "readonly", st => st.get(id));

  let registro = null;
  function sw() {
    if (!("serviceWorker" in navigator)) return Promise.resolve(null);
    if (!registro) registro = navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).catch(() => null);
    return registro;
  }

  async function avisar(titulo, cuerpo, etiqueta) {
    if (!("Notification" in window) || Notification.permission !== "granted") return false;
    const r = await sw();
    const ops = { body: cuerpo, icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: etiqueta || titulo, renotify: true, data: { url: "../sistema/#/tienda/" + encodeURIComponent(etiqueta || "") } };
    if (r) { await r.showNotification(titulo, ops); return true; }
    new Notification(titulo, ops);
    return true;
  }

  const q = n => "Q " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function empresa() {
    if (nube) return rpc("catalogo_empresa", {});
    try { const d = JSON.parse(localStorage.getItem("emtecsa.sistema.cotizaciones")); return (d && d.ajustes && d.ajustes.empresa) || null; } catch (x) { return null; }
  }
  window.EMT_ALMACEN = { nube, empresa, siguienteNumero, guardar, leer, todos, guardarArchivo, leerArchivo, emitir, alOir: f => oyentes.add(f), avisar, sw, q };
})();
