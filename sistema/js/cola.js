"use strict";
(() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const db = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-cola", 1); r.onupgradeneeded = () => { r.result.createObjectStore("cola", { keyPath: "id", autoIncrement: true }); r.result.createObjectStore("lecturas"); }; r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (st, modo, fn) => abrir().then(x => new Promise((bien, mal) => { const t = x.transaction(st, modo); const r = fn(t.objectStore(st)); t.oncomplete = () => bien(r && r.result); t.onerror = () => mal(t.error); }));
    return {
      poner: v => tx("cola", "readwrite", s => s.add(v)),
      todas: () => tx("cola", "readonly", s => s.getAll()),
      quitar: id => tx("cola", "readwrite", s => s.delete(id)),
      guardarLectura: (k, v) => tx("lecturas", "readwrite", s => s.put(v, k)),
      leerLectura: k => tx("lecturas", "readonly", s => s.get(k))
    };
  })();

  const sinRed = err => !navigator.onLine || (err && (err.name === "TypeError" || /fetch|network|red|internet/i.test(String(err.message))));
  const clon = v => JSON.parse(JSON.stringify(v == null ? null : v));
  let pendientes = [];

  async function refrescarPendientes() { try { pendientes = D.nube ? await db.todas() : []; } catch (e) { pendientes = []; } pintarPill(); }

  function pintarPill() {
    const der = document.querySelector(".barra .der");
    let pill = document.querySelector("[data-estado-red]");
    if (der && !pill) { pill = document.createElement("span"); pill.className = "red-pill"; pill.dataset.estadoRed = ""; pill.setAttribute("role", "status"); der.prepend(pill); }
    if (!pill) return;
    const n = pendientes.length;
    if (!navigator.onLine) { pill.hidden = false; pill.className = "red-pill sin"; pill.textContent = n ? `Sin señal · ${n} por subir` : "Sin señal"; pill.title = D.nube ? "Lo que anote se guarda en el teléfono y se sube al volver la señal." : "Puede seguir trabajando: todo se guarda en este equipo."; }
    else if (n) { pill.hidden = false; pill.className = "red-pill subiendo"; pill.textContent = `Subiendo ${n}…`; pill.title = ""; }
    else { pill.hidden = true; }
  }

  const leer = (nombre, clave) => {
    const orig = D[nombre];
    D[nombre] = async (...args) => {
      if (!D.nube) return orig(...args);
      const k = nombre + ":" + clave(...args);
      try { const r = await orig(...args); db.guardarLectura(k, clon(r)).catch(() => {}); return encima(nombre, args, r); }
      catch (err) { if (!sinRed(err)) throw err; const g = await db.leerLectura(k).catch(() => null); if (g == null) throw new Error("Sin señal: esta pantalla todavía no se había abierto en este teléfono."); return encima(nombre, args, g); }
    };
  };

  function encima(nombre, args, r) {
    if (!r || !pendientes.length) return r;
    if (nombre === "obra") {
      const dias = pendientes.filter(p => p.tipo === "bitacora" && p.obraId === r.id);
      if (!dias.length) return r;
      const x = clon(r);
      dias.forEach(p => { const b = p.args[1]; const fotos = (b.fotos || []).concat((p.archivos || []).map((f, i) => `cola:${p.id}:${i}`)); if (b.id) Object.assign(x.bitacora.find(z => z.id === b.id) || {}, b, { fotos, pendiente: true }); else x.bitacora.push({ ...b, id: -p.id, fotos, creado: new Date(p.fecha).toISOString(), pendiente: true }); });
      return x;
    }
    if (nombre === "instalacion") {
      const x = clon(r);
      pendientes.filter(p => p.tipo === "instalado" && p.obraId === args[0]).forEach(p => x.forEach(f => { if (p.args[1].includes(f.id)) { f.instalado = !!p.args[2]; f.pendiente = true; } }));
      return x;
    }
    if (nombre === "checklist") {
      const x = clon(r);
      pendientes.filter(p => p.tipo === "punto" && p.obraId === args[0] && (p.args[1].tipo || "") === args[1]).forEach(p => { const pt = p.args[1]; const y = pt.id && x.find(z => z.id === pt.id); if (y) Object.assign(y, pt, { pendiente: true }); else if (!pt.id) x.push({ ...pt, id: -p.id, orden: 9999, pendiente: true }); });
      return x;
    }
    if (nombre === "compras") {
      const x = clon(r);
      pendientes.filter(p => p.tipo === "compras" && p.obraId === args[0].id).forEach(p => p.args[1].forEach(c => { const y = x.find(z => z.material_id === c.material_id); if (y) Object.assign(y, c, { pendiente: true }); }));
      return x.map(y => { const m = r.find(z => z.material_id === y.material_id); return m ? { ...y, material: m.material, proveedor: m.proveedor, opciones: m.opciones } : y; });
    }
    return r;
  }

  const escribir = (nombre, tipo, obraDe, conArchivos) => {
    const orig = D[nombre];
    D[nombre] = async (...args) => {
      if (!D.nube) return orig(...args);
      const guardarEnCola = async () => {
        const archivos = conArchivos ? [...(args[2] || [])] : [];
        await db.poner({ tipo, nombre, obraId: obraDe(args), args: clon(conArchivos ? args.slice(0, 2) : args), archivos, fecha: Date.now() });
        await refrescarPendientes();
        A() && A().aviso("Sin señal: quedó guardado en el teléfono y se sube al volver la señal.");
      };
      if (!navigator.onLine) return guardarEnCola();
      try { return await orig(...args); }
      catch (err) { if (sinRed(err)) return guardarEnCola(); throw err; }
    };
    D["_orig_" + nombre] = orig;
  };

  let subiendo = false;
  async function subir() {
    if (subiendo || !D.nube || !navigator.onLine) return;
    subiendo = true;
    let n = 0, mal = 0;
    try {
      await refrescarPendientes();
      for (const p of pendientes.slice().sort((a, b) => a.id - b.id)) {
        try {
          const f = D["_orig_" + p.nombre];
          if (p.tipo === "bitacora") await f(p.args[0], p.args[1], p.archivos.map((b, i) => new File([b], `foto-${i + 1}.jpg`, { type: b.type || "image/jpeg" })));
          else await f(...p.args);
          await db.quitar(p.id); n++;
        } catch (err) { if (sinRed(err)) break; mal++; }
      }
    } finally {
      subiendo = false;
      await refrescarPendientes();
      if (n && A()) A().aviso(`Volvió la señal: se ${n === 1 ? "subió 1 cambio" : `subieron ${n} cambios`}.`);
      if (mal && A()) A().aviso(`${mal} ${mal === 1 ? "cambio no se pudo subir" : "cambios no se pudieron subir"}. Revíselos con gerencia.`, "mal");
    }
  }

  const fotoUrlOrig = D.fotoUrl;
  const urls = {};
  D.fotoUrl = async ref => {
    const m = /^cola:(\d+):(\d+)$/.exec(ref || "");
    if (!m) return fotoUrlOrig(ref);
    if (urls[ref]) return urls[ref];
    const p = pendientes.find(x => x.id === Number(m[1]));
    const b = p && p.archivos[Number(m[2])];
    return b ? (urls[ref] = URL.createObjectURL(b)) : null;
  };

  [["obras", () => ""], ["obra", id => id], ["catalogo", () => ""], ["clientes", () => ""], ["cliente", id => id], ["cotizaciones", () => ""], ["cotizacion", id => id], ["empresa", () => ""], ["plantillas", () => ""], ["instalacion", id => id], ["checklist", (id, t) => id + ":" + t], ["compras", o => o.id], ["proveedores", () => ""], ["plantillasCheck", () => ""], ["resumenCobros", () => ""], ["estadoCuenta", id => id], ["aumentoDefecto", () => ""]].forEach(([n, k]) => { if (D[n]) leer(n, k); });
  escribir("guardarBitacora", "bitacora", a => a[0], true);
  escribir("guardarPunto", "punto", a => a[0], false);
  escribir("marcarInstalado", "instalado", a => a[0], false);
  escribir("guardarCompras", "compras", a => a[0], false);

  addEventListener("online", () => { pintarPill(); subir(); });
  addEventListener("offline", pintarPill);
  const vigilar = new MutationObserver(() => { if (document.querySelector(".barra .der") && !document.querySelector("[data-estado-red]")) pintarPill(); });
  const iniciar = () => { vigilar.observe(document.body, { childList: true, subtree: true }); refrescarPendientes().then(subir); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();

  let instalar = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; });
  addEventListener("appinstalled", () => { instalar = null; A() && A().aviso("La app de EMTECSA quedó instalada."); });
  const yaInstalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  async function pedirInstalar() {
    const { modal, cerrarCapas, ico } = A();
    if (yaInstalada()) { A().aviso("Ya está usando la app instalada."); return; }
    if (instalar) { instalar.prompt(); const r = await instalar.userChoice; if (r.outcome === "accepted") instalar = null; return; }
    modal({
      titulo: "Instalar en el teléfono", guardarTxt: "Entendido",
      cuerpo: esIphone()
        ? `<ol class="pasos-inst"><li>Abra esta página en <b>Safari</b>.</li><li>Toque el botón <b>Compartir</b> ${ico("arrowR", 14)} abajo de la pantalla.</li><li>Escoja <b>Agregar a pantalla de inicio</b> y toque <b>Agregar</b>.</li></ol><p class="suave" style="font-size:13.5px">Queda el ícono de EMTECSA y abre sin la barra del navegador.</p>`
        : `<ol class="pasos-inst"><li>Abra el menú del navegador (los tres puntos arriba a la derecha).</li><li>Toque <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li></ol><p class="suave" style="font-size:13.5px">Queda el ícono de EMTECSA y abre sin la barra del navegador.</p>`,
      alGuardar: async () => cerrarCapas()
    });
  }

  if ("serviceWorker" in navigator && /^(https:|http:\/\/(localhost|127\.0\.0\.1))/.test(location.href)) {
    addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
  }

  Object.assign(D, { subirPendientes: subir, pedirInstalar, appInstalada: yaInstalada });
})();
