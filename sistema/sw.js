"use strict";
const VERSION = "emtecsa-2026-11-18-25";
const BASE = [
  "./", "./index.html", "./manifest.webmanifest", "./css/sistema.css", "./css/temas.css", "./js/temas.js",
  "./js/config.js", "./js/semilla.js", "./js/datos.js", "./js/datos-clientes.js", "./js/datos-cotizaciones.js", "./js/datos-obras.js", "./js/datos-cobros.js", "./js/simbolos.js", "./js/datos-compras.js", "./js/datos-planos.js", "./js/cola.js", "./js/rapido.js", "./js/planos.js", "./js/datos-tienda.js", "./js/tienda.js", "./js/datos-docs.js", "./js/expediente.js", "./js/datos-enlaces.js", "./js/datos-conteo.js", "./js/conteo.js", "./js/datos-energuate.js", "./js/energuate-docs.js", "./js/energuate.js", "./js/datos-equipo.js", "./js/equipo.js", "./js/datos-costos.js", "./js/costos.js", "./js/datos-seguimiento.js", "./js/seguimiento.js", "./js/perfil.js", "./js/dev.js", "./js/vista-previa.js", "./plantillas/dictamen-capacidad.xlsx", "./plantillas/dictamen-medida-centralizacion.xlsx", "./plantillas/derecho-de-paso.docx", "./plantillas/boleta-solicitante.pdf", "./plantillas/requisitos-licencia.pdf", "./js/constancia-pdf.js", "./js/enlaces.js", "./marcas/energuate.png", "./marcas/eegsa.png",
  "./js/app.js", "./js/clientes.js", "./js/cotizaciones.js", "./js/obras.js", "./js/cobros.js", "./js/finanzas.js", "./js/datos-finanzas.js", "./js/compras.js", "./js/empresa.js", "./js/propuesta-pdf.js", "./js/cobros-pdf.js",
  "./fuentes/PlusJakartaSans-Regular.ttf", "./fuentes/PlusJakartaSans-SemiBold.ttf", "./fuentes/PlusJakartaSans-Bold.ttf", "./fuentes/PlusJakartaSans-ExtraBold.ttf",
  "./iconos/icono-192.png", "./iconos/icono-512.png", "./iconos/apple-touch-icon.png",
  "../emtecsa-tokens.css", "../emtecsa-base.css", "../emtecsa-ui.js", "../emtecsa-geo.js", "../emtecsa-errores.js",
  "../logo/emtecsa-icono.svg", "../logo/emtecsa-logo.svg", "../logo/emtecsa-logo-blanco.svg",
  "../img/sistema-noche.jpg", "../img/lineas-luna.jpg", "../img/torre-luna-2.jpg", "../img/aisladores.jpg", "../img/torre-luna.jpg", "../img/subestacion-luces.jpg", "../img/torre-hora-azul.jpg", "../img/poste-noche.jpg", "../img/cables-negros.jpg"
];
const LIBRERIAS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
];
const AFUERA = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all([
    ...BASE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => null)),
    ...LIBRERIAS.map(u => c.add(new Request(u, { mode: "cors", credentials: "omit" })).catch(() => null))
  ])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("emtecsa-") && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const red = await fetch(r);
        if (red && red.ok && red.type === "basic") c.put(r, red.clone());
        return red;
      } catch (err) {
        const guardada = await c.match(r, { ignoreSearch: true });
        if (guardada) return guardada;
        if (r.mode === "navigate") return (await c.match("./index.html")) || Response.error();
        return Response.error();
      }
    })());
    return;
  }
  if (AFUERA.includes(u.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const guardada = await c.match(r);
      const red = fetch(r).then(x => { if (x && (x.ok || x.type === "opaque")) c.put(r, x.clone()); return x; }).catch(() => null);
      return guardada || (await red) || Response.error();
    })());
  }
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: "EMTECSA", cuerpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "EMTECSA", { body: d.cuerpo || "", icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: d.etiqueta || "emtecsa", renotify: true, data: { url: d.url || "./#/hoy" } }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./#/tienda", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    const c = l.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
