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

  async function siguienteNumero() {
    const n = await op("ajustes", "readwrite", st => {
      const r = st.get("consecutivo");
      r.onsuccess = () => st.put((r.result || 0) + 1, "consecutivo");
      return r;
    });
    return "PED-" + String((n || 0) + 1).padStart(4, "0");
  }

  async function guardar(p) {
    p.actualizado = new Date().toISOString();
    await op("pedidos", "readwrite", st => st.put(p));
    emitir({ tipo: "pedido", id: p.id, estado: p.estado });
    return p;
  }
  const leer = id => op("pedidos", "readonly", st => st.get(id));
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

  window.EMT_ALMACEN = { siguienteNumero, guardar, leer, todos, guardarArchivo, leerArchivo, emitir, alOir: f => oyentes.add(f), avisar, sw, q };
})();
