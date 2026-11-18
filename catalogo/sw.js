const CACHE = "emtecsa-catalogo-v7";
const BASE = ["./", "index.html", "catalogo.css", "catalogo.js", "almacen.js", "../sistema/js/config.js", "../emtecsa-geo.js", "../emtecsa-errores.js", "datos.js", "comprobante.js", "escena.js", "modelos.js", "vendor/three.module.min.js", "vendor/RoomEnvironment.js", "iconos/icono-192.png", "../emtecsa-tokens.css", "../emtecsa-base.css", "../emtecsa-ui.js", "../logo/emtecsa-logo-blanco.svg", "../logo/emtecsa-icono.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
    return res;
  }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: "EMTECSA", cuerpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "EMTECSA", { body: d.cuerpo || "", icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: d.etiqueta || "emtecsa", data: { url: d.url || "../sistema/#/tienda" } }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "../sistema/#/tienda", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lista => {
    const ya = lista.find(c => c.url.startsWith(url));
    if (ya) return ya.focus();
    return self.clients.openWindow(url);
  }));
});
