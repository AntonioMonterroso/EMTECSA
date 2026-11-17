"use strict";
(() => {
  const D = window.EMT_DATOS;
  const BASE = "emtecsa-catalogo";
  const ESTADOS_TIENDA = {
    "comprobante-recibido": { n: "Por revisar", chip: "laton", icono: "file" },
    "esperando-pago": { n: "Esperando pago", chip: "ambar", icono: "clock" },
    "comprobante-rechazado": { n: "Otro comprobante", chip: "ambar", icono: "bell" },
    "en-marcha": { n: "En marcha", chip: "verde", icono: "zap" },
    "cotizacion": { n: "A cotizar", chip: "azul", icono: "send" }
  };
  let abierta = null;
  function db() {
    if (abierta) return abierta;
    abierta = new Promise((bien, mal) => {
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains("pedidos")) d.createObjectStore("pedidos", { keyPath: "id" }); if (!d.objectStoreNames.contains("archivos")) d.createObjectStore("archivos"); if (!d.objectStoreNames.contains("ajustes")) d.createObjectStore("ajustes"); };
      r.onsuccess = () => bien(r.result);
      r.onerror = () => mal(new Error("No se pudieron leer los pedidos de la tienda."));
    });
    return abierta;
  }
  async function op(almacen, modo, fn) {
    const d = await db();
    return new Promise((bien, mal) => { const tx = d.transaction(almacen, modo); const r = fn(tx.objectStore(almacen)); tx.oncomplete = () => bien(r && "result" in r ? r.result : undefined); tx.onerror = () => mal(tx.error); });
  }
  const canal = "BroadcastChannel" in window ? new BroadcastChannel("emtecsa-pedidos") : null;
  const oyentes = new Set();
  if (canal) canal.onmessage = e => oyentes.forEach(f => { try { f(e.data); } catch (x) {} });

  async function pedidos() { return ((await op("pedidos", "readonly", s => s.getAll())) || []).sort((a, b) => String(b.actualizado || b.creado || "").localeCompare(String(a.actualizado || a.creado || ""))); }
  const pedido = id => op("pedidos", "readonly", s => s.get(id));
  const comprobante = id => op("archivos", "readonly", s => s.get(id + "-comprobante"));

  async function cambiarEstadoPedido(id, estado, nota) {
    if (!ESTADOS_TIENDA[estado]) throw new Error("Estado no válido.");
    const p = await pedido(id);
    if (!p) throw new Error("Ese pedido ya no existe.");
    const ahora = new Date().toISOString();
    p.estado = estado; p.notaEmtecsa = nota || null; p.actualizado = ahora;
    p.historia = [...(p.historia || []), { estado, fecha: ahora, nota: nota || null, por: (window.EMT_APP && window.EMT_APP.sesion() && window.EMT_APP.sesion().perfil.nombre) || null }];
    await op("pedidos", "readwrite", s => s.put(p));
    if (canal) canal.postMessage({ tipo: "pedido", id, estado });
    return p;
  }

  async function ligarCotizacion(id, cotId) {
    const p = await pedido(id); if (!p) return;
    p.cotizacion_id = cotId; p.actualizado = new Date().toISOString();
    await op("pedidos", "readwrite", s => s.put(p));
  }

  Object.assign(D, { ESTADOS_TIENDA, pedidosTienda: pedidos, pedidoTienda: pedido, comprobanteTienda: comprobante, cambiarEstadoPedido, ligarCotizacion, alPedido: f => oyentes.add(f), quitarOyentePedido: f => oyentes.delete(f) });
})();
