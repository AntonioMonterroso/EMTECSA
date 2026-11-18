"use strict";
window.EMT_ERRORES = (() => {
  const yo = document.currentScript;
  const origen = (yo && yo.dataset.origen) || "sistema";
  const version = (yo && yo.dataset.version) || "";
  const CFG = () => window.EMTECSA_CONFIG || {};
  const vistos = new Map();
  let enviados = 0;
  const limpiar = s => String(s == null ? "" : s)
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[correo]")
    .replace(/\b\d{4}\s?\d{5}\s?\d{4}\b/g, "[dpi]")
    .replace(/\b\d{4}[\s-]?\d{4}\b/g, "[teléfono]")
    .replace(/(token|p_token|access_token|apikey)=[^&\s"]+/gi, "$1=[oculto]")
    .replace(/#[A-Za-z0-9_-]{30,}/g, "#[enlace]")
    .replace(/Q\s?[\d,]+\.\d{2}/g, "Q [monto]");
  const pantalla = () => limpiar(location.pathname.replace(/^.*\/EMTECSA/, "") + location.hash.replace(/\/\d+/g, "/:id"));
  const huella = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
  const tokenUsuario = () => {
    try {
      const ref = new URL(CFG().url).host.split(".")[0];
      const s = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`));
      return s && s.access_token && s.expires_at * 1000 > Date.now() + 30000 ? s.access_token : null;
    } catch (e) { return null; }
  };
  const fetchOrig = window.fetch.bind(window);

  function anotar({ tipo = "error", mensaje = "", pila = "", paso = "" }) {
    const c = CFG();
    if (!c.url || !c.llave) return;
    const msg = limpiar(mensaje).slice(0, 500) || "Sin mensaje";
    const primera = String(pila || "").split("\n").find(l => /:\d+:\d+/.test(l)) || "";
    const h = huella([origen, tipo, msg.replace(/\d+/g, "#"), primera.replace(/\?[^:]*/, "").replace(/:\d+:\d+/, "")].join("|"));
    const ahora = Date.now();
    if (vistos.has(h) && ahora - vistos.get(h) < 60000) return;
    if (++enviados > 40) return;
    vistos.set(h, ahora);
    const datos = { origen, huella: h, tipo, mensaje: msg, pila: limpiar(pila).slice(0, 4000), pantalla: pantalla(), paso: limpiar(paso).slice(0, 200), version, navegador: navigator.userAgent.slice(0, 200) };
    const t = tokenUsuario();
    try {
      fetchOrig(c.url + "/rest/v1/rpc/anotar_error", { method: "POST", keepalive: true, headers: { apikey: c.llave, Authorization: "Bearer " + (t || c.llave), "Content-Type": "application/json" }, body: JSON.stringify({ p: datos }) }).catch(() => {});
    } catch (e) {}
  }

  window.addEventListener("error", e => {
    const t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      const u = String(t.src || t.href);
      if (u.startsWith(location.origin)) anotar({ tipo: "carga", mensaje: "No cargó " + u.replace(location.origin, ""), paso: t.tagName });
      return;
    }
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    if (!e.message && !e.error) return;
    anotar({ tipo: "error", mensaje: e.message || (e.error && e.error.message), pila: e.error && e.error.stack, paso: e.filename ? e.filename.replace(location.origin, "") + ":" + e.lineno : "" });
  }, true);

  window.addEventListener("unhandledrejection", e => {
    const r = e.reason;
    if (!navigator.onLine) return;
    const m = r && r.message ? r.message : String(r);
    if (/^[¿¡«A-ZÁÉÍÓÚÑ][^]*[a-záéíóúñ.]$/.test(m) && !(r instanceof TypeError) && !(r instanceof ReferenceError) && !(r instanceof SyntaxError) && !(r instanceof RangeError)) return;
    anotar({ tipo: "promesa", mensaje: m, pila: r && r.stack });
  });

  window.fetch = async (recurso, op) => {
    const url = typeof recurso === "string" ? recurso : recurso && recurso.url;
    const c = CFG();
    let r;
    try { r = await fetchOrig(recurso, op); }
    catch (err) {
      if (c.url && url && url.startsWith(c.url) && navigator.onLine && !/anotar_error/.test(url)) anotar({ tipo: "red", mensaje: "No se pudo conectar con la base: " + (err && err.message), paso: (op && op.method || "GET") + " " + url.replace(c.url, "").split("?")[0] });
      throw err;
    }
    if (c.url && url && url.startsWith(c.url) && r.status >= 400 && ![401, 406, 416].includes(r.status) && !/anotar_error|\/auth\/v1\/token/.test(url)) {
      r.clone().json().then(d => {
        if (d && d.code === "P0001") return;
        anotar({ tipo: "base", mensaje: `${r.status} ${d && d.code ? d.code + " " : ""}${d && (d.message || d.msg || d.error_description || d.error) || ""}`, paso: (op && op.method || "GET") + " " + url.replace(c.url, "").split("?")[0] });
      }).catch(() => anotar({ tipo: "base", mensaje: `${r.status}`, paso: (op && op.method || "GET") + " " + url.replace(c.url, "").split("?")[0] }));
    }
    return r;
  };

  return { anotar };
})();
