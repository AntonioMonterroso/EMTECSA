"use strict";
window.EMT_PERFIL = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;

  async function fotoDe(archivo) {
    const url = URL.createObjectURL(archivo);
    try {
      const img = await new Promise((bien, mal) => { const i = new Image(); i.onload = () => bien(i); i.onerror = () => mal(new Error("No se pudo abrir esa imagen. Escoja una foto JPG o PNG.")); i.src = url; });
      const lado = Math.min(img.naturalWidth, img.naturalHeight), t = 320;
      const c = document.createElement("canvas"); c.width = t; c.height = t;
      c.getContext("2d").drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, t, t);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }

  function lienzo(cv) {
    const ctx = cv.getContext("2d");
    let trazos = [], actual = null, caja = null;
    const linea = (c, t, e) => {
      if (!t.length) return;
      c.lineWidth = 2.4 * e;
      c.beginPath(); c.moveTo(t[0].x * e, t[0].y * e);
      if (t.length === 1) c.lineTo(t[0].x * e + 0.1, t[0].y * e + 0.1);
      for (let i = 1; i < t.length - 1; i++) { const mx = (t[i].x + t[i + 1].x) / 2, my = (t[i].y + t[i + 1].y) / 2; c.quadraticCurveTo(t[i].x * e, t[i].y * e, mx * e, my * e); }
      if (t.length > 1) c.lineTo(t[t.length - 1].x * e, t[t.length - 1].y * e);
      c.stroke();
    };
    const dibujar = () => { const r = cv.getBoundingClientRect(); ctx.clearRect(0, 0, r.width, r.height); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0E1D33"; trazos.forEach(t => linea(ctx, t, 1)); };
    const medir = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dibujar(); };
    const punto = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    cv.addEventListener("pointerdown", ev => { ev.preventDefault(); try { cv.setPointerCapture(ev.pointerId); } catch (e) {} actual = [punto(ev)]; trazos.push(actual); dibujar(); });
    cv.addEventListener("pointermove", ev => { if (!actual) return; ev.preventDefault(); const co = ev.getCoalescedEvents ? ev.getCoalescedEvents() : []; (co.length ? co : [ev]).forEach(x => actual.push(punto(x))); dibujar(); });
    const fin = () => { actual = null; };
    cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin); cv.addEventListener("pointerleave", fin);
    requestAnimationFrame(medir);
    return {
      borrar() { trazos = []; dibujar(); },
      vacia() {
        const pts = trazos.flat(); if (pts.length < 8) return true;
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        caja = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
        return (caja.x1 - caja.x0) < 30 && (caja.y1 - caja.y0) < 14;
      },
      png() {
        const pad = 10, w = caja.x1 - caja.x0 + 2 * pad, h = caja.y1 - caja.y0 + 2 * pad;
        const e = Math.min(2, 700 / w);
        const o = document.createElement("canvas"); o.width = Math.round(w * e); o.height = Math.round(h * e);
        const c = o.getContext("2d"); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#0E1D33";
        c.translate((pad - caja.x0) * e, (pad - caja.y0) * e);
        trazos.forEach(t => linea(c, t, e));
        return o.toDataURL("image/png");
      }
    };
  }

  const VAPID = "BI9GRkGDq08uB6Z-NFRad_PIyBAD_M6rK2xOViF7ZIDnX-XEEX5lvfzImY2NhI8Wota57ytJRH4tgJcluIulaio";
  const b64 = s => { const p = "=".repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const clienteSb = () => D.sb || D.sbErrores;
  async function estadoAvisos() {
    if (!clienteSb() || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return esIphone() && !instalada() ? "instalar" : "no";
    if (Notification.permission === "denied") return "bloqueado";
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    return sub ? "activo" : "apagado";
  }
  async function activarAvisos() {
    const sb = clienteSb(); if (!sb) throw new Error("Los avisos funcionan con la base de EMTECSA conectada.");
    const per = await Notification.requestPermission(); if (per !== "granted") throw new Error("El teléfono no dio permiso para avisos. Actívelo en los ajustes del navegador.");
    const reg = await navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready);
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
    const j = sub.toJSON();
    const r = await sb.from("push_suscripciones").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, navegador: navigator.userAgent.slice(0, 200) }, { onConflict: "endpoint" });
    if (r.error) throw new Error("No se pudo guardar este teléfono para avisos.");
    await sb.rpc("probar_aviso");
  }
  async function apagarAvisos() {
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { const sb = clienteSb(); if (sb) await sb.from("push_suscripciones").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
  }

  async function vista(v) {
    const { esc, ico, aviso, modal, cerrarCapas, guardia } = A();
    const s = A().sesion(), p = s.perfil;
    let firma = null;
    try { firma = await D.miFirma(p); } catch (e) {}
    let foto = p.foto || null, sucio = false;
    const av = () => foto ? `<img src="${esc(foto)}" alt="Su foto">` : `<span>${esc(A().iniciales(p.nombre))}</span>`;
    v.innerHTML = `
      <div class="cuerpo pf">
        <div class="cab-v"><div><h1 class="t">Mi perfil</h1><p class="desc">Sus datos en el sistema. Solo usted los cambia.</p></div></div>
        <section class="caja pf-cab">
          <button class="pf-foto" type="button" data-pf-foto aria-label="Cambiar su foto">${av()}<i>${ico("pen", 14)}</i></button>
          <div class="pf-quien"><b data-pf-nom>${esc(p.nombre)}</b><small>${esc(D.ROLES[p.rol] || p.rol)}${p.puesto ? " · " + esc(p.puesto) : ""}</small><small>${esc(s.correo)}</small></div>
        </section>
        <section class="caja">
          <div class="sub" style="margin:0"><h2>Sus datos</h2></div>
          <label class="f-campo">Nombre completo<input data-pf="nombre" value="${esc(p.nombre)}" autocomplete="name" maxlength="80"></label>
          <div class="f-fila"><label class="f-campo">Teléfono<input data-pf="telefono" value="${esc(p.telefono || "")}" inputmode="tel" autocomplete="tel" placeholder="5555 1234"></label>
          <label class="f-campo">Puesto<input data-pf="puesto" value="${esc(p.puesto || "")}" maxlength="60" placeholder="Jefe de obra"></label></div>
          <div class="f-fila"><div class="f-campo"><span>Correo</span><p class="pf-fijo">${esc(s.correo)}</p><small>Para entrar al sistema. Lo cambia gerencia.</small></div>
          <div class="f-campo"><span>Rol</span><p class="pf-fijo">${esc(D.ROLES[p.rol] || p.rol)}</p><small>Lo asigna gerencia.</small></div></div>
          <div class="fila-b"><button class="s-btn lleno" type="button" data-pf-guardar>${ico("check", 16)}Guardar</button><span class="guardado" data-pf-est>Todo guardado</span></div>
        </section>
        <details class="caja plegable"><summary><span class="pl-t"><h2>Firma</h2><span class="suave" data-pf-res-firma>${firma ? "Ya tiene su firma" : "Todavía no tiene firma"}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-pf-firma></div></details>
        <details class="caja plegable" open><summary><span class="pl-t"><h2>Avisos en este teléfono</h2><span class="suave" data-av-res>Revisando…</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-avisos></div></details>
        ${D.nube ? `<details class="caja plegable"><summary><span class="pl-t"><h2>Contraseña</h2><span class="suave">Cambiarla</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
          <label class="f-campo">Contraseña actual<input type="password" data-pf-clave="actual" autocomplete="current-password"></label>
          <div class="f-fila"><label class="f-campo">Nueva<input type="password" data-pf-clave="nueva" autocomplete="new-password"><small>Al menos 8, con letras y números.</small></label>
          <label class="f-campo">Repita la nueva<input type="password" data-pf-clave="otra" autocomplete="new-password"></label></div>
          <div class="fila-b"><button class="s-btn suave-b" type="button" data-pf-cambiar-clave>Cambiar contraseña</button></div>
        </div></details>` : ""}
      </div>`;
    const est = v.querySelector("[data-pf-est]");
    const marcar = () => { sucio = true; est.textContent = "Cambios sin guardar"; est.className = "guardado sin"; };
    guardia({ limpio: () => !sucio });
    const pintarFirma = () => {
      const box = v.querySelector("[data-pf-firma]");
      box.innerHTML = `${firma ? `<div class="pf-firma"><img src="${esc(firma)}" alt="Su firma"></div>` : `<p class="suave" style="margin:0;font-size:13.5px">Se usará en las propuestas y documentos que usted firme.</p>`}
        <div class="fila-b"><button class="s-btn suave-b" type="button" data-pf-dibujar>${ico("pen", 15)}${firma ? "Cambiar mi firma" : "Dibujar mi firma"}</button></div>`;
      v.querySelector("[data-pf-res-firma]").textContent = firma ? "Ya tiene su firma" : "Todavía no tiene firma";
    };
    pintarFirma();
    const pintarAvisos = async () => {
      const box = v.querySelector("[data-avisos]"), res = v.querySelector("[data-av-res]"); if (!box) return;
      const st = await estadoAvisos().catch(() => "no");
      const T = { activo: ["Activados", "Le llegan avisos aunque el sistema esté cerrado."], apagado: ["Apagados", "Actívelos para enterarse al momento de pedidos, comprobantes y lo que el cliente haga en su enlace."], bloqueado: ["Bloqueados", "El navegador tiene bloqueados los avisos de esta página. Permítalos en sus ajustes y vuelva aquí."], instalar: ["Falta instalar", "En iPhone los avisos llegan solo con la app instalada: Compartir › Agregar a pantalla de inicio. Luego ábrala desde el ícono."], no: ["No disponibles", D.nube || D.sbErrores ? "Este navegador no recibe avisos. Pruebe con Chrome o Safari actualizados." : "Los avisos funcionan con la base de EMTECSA conectada."] }[st];
      res.textContent = T[0];
      box.innerHTML = `<p class="suave" style="margin:0;font-size:13.5px">${esc(T[1])}</p><div class="fila-b">${st === "apagado" ? `<button class="s-btn lleno" type="button" data-av-on>${ico("check", 15)}Activar avisos</button>` : st === "activo" ? `<button class="s-btn suave-b" type="button" data-av-prueba>Mandar un aviso de prueba</button><button class="s-btn suave-b" type="button" data-av-off>Apagar en este teléfono</button>` : st === "instalar" && D.pedirInstalar ? `<button class="s-btn suave-b" type="button" data-av-inst>Cómo instalar</button>` : ""}</div>`;
    };
    pintarAvisos();
    v.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-av-on], [data-av-off], [data-av-prueba], [data-av-inst]"); if (!b) return;
      b.disabled = true;
      try {
        if (b.matches("[data-av-on]")) { await activarAvisos(); aviso("Avisos activados. Le llegará uno de prueba."); }
        else if (b.matches("[data-av-off]")) { await apagarAvisos(); aviso("Avisos apagados en este teléfono."); }
        else if (b.matches("[data-av-prueba]")) { await clienteSb().rpc("probar_aviso"); aviso("Aviso de prueba enviado."); }
        else if (b.matches("[data-av-inst]")) D.pedirInstalar();
      } catch (err) { aviso(err.message || "No se pudo.", "mal"); if (window.EMT_ERRORES) window.EMT_ERRORES.anotar({ tipo: "avisos", mensaje: "Activar avisos: " + ((err && err.message) || String(err)), pila: err && err.stack, paso: "Mi perfil · " + (Notification && Notification.permission) }); }
      finally { b.disabled = false; pintarAvisos(); }
    });
    const quitarFoto = () => {
      const m = modal({ titulo: "¿Quitar su foto?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Vuelven a salir sus iniciales.</p>`,
        alGuardar: async () => { foto = null; await D.guardarMiPerfil(p, { nombre: p.nombre, telefono: p.telefono, puesto: p.puesto, foto: null }); cerrarCapas(); A().pintarAvatar(); v.querySelector("[data-pf-foto]").innerHTML = av() + `<i>${ico("pen", 14)}</i>`; aviso("Foto quitada."); } });
      m.querySelector("[data-guardar]").classList.add("peligro-b");
    };
    const elegirFoto = () => modal({
      titulo: "Su foto", guardarTxt: "Listo", soloUno: true,
      quitar: foto ? quitarFoto : null, quitarTxt: "Quitar foto",
      cuerpo: `<div class="pf-foto-g">${foto ? `<img src="${esc(foto)}" alt="">` : `<span>${esc(A().iniciales(p.nombre))}</span>`}</div>
        <label class="s-btn lleno ancho-b">${ico("plus", 16)}${foto ? "Escoger otra foto" : "Escoger foto"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden data-pf-archivo></label>
        <p class="suave" style="margin:0;font-size:13px;text-align:center">Se recorta en cuadrado y se guarda chiquita.</p>`,
      alAbrir: f => {
        f.querySelector("[data-pf-archivo]").addEventListener("change", async ev => {
          const a = ev.target.files && ev.target.files[0]; if (!a) return;
          try {
            foto = await fotoDe(a);
            await D.guardarMiPerfil(p, { nombre: p.nombre, telefono: p.telefono, puesto: p.puesto, foto });
            cerrarCapas(); A().pintarAvatar(); v.querySelector("[data-pf-foto]").innerHTML = av() + `<i>${ico("pen", 14)}</i>`; aviso("Foto guardada.");
          } catch (err) { aviso(err.message, "mal"); }
        });
      },
      alGuardar: async () => { cerrarCapas(); }
    });
    const dibujarFirma = () => {
      let pad = null;
      modal({
        titulo: "Su firma", guardarTxt: "Guardar firma",
        quitar: firma ? async () => { await D.guardarFirma(p, null); firma = null; cerrarCapas(); pintarFirma(); aviso("Firma quitada."); } : null, quitarTxt: "Quitar firma",
        cuerpo: `<p class="suave" style="margin:0;font-size:13.5px">Firme con el dedo o el mouse dentro del cuadro.</p>
          <div class="pf-lienzo"><canvas data-pf-cv aria-label="Espacio para firmar"></canvas></div>
          <div class="fila-b"><button class="s-btn suave-b chico" type="button" data-pf-borrar>Borrar y empezar otra vez</button></div>`,
        alAbrir: f => { pad = lienzo(f.querySelector("[data-pf-cv]")); f.querySelector("[data-pf-borrar]").addEventListener("click", () => pad.borrar()); },
        alGuardar: async () => {
          if (!pad || pad.vacia()) throw new Error("Dibuje su firma dentro del cuadro.");
          const png = pad.png();
          await D.guardarFirma(p, png); firma = png; cerrarCapas(); pintarFirma(); aviso("Firma guardada.");
        }
      });
    };
    v.oninput = e => { if (e.target.matches("[data-pf]")) marcar(); };
    v.onclick = async e => {
      if (e.target.closest("[data-pf-foto]")) { elegirFoto(); return; }
      if (e.target.closest("[data-pf-dibujar]")) { dibujarFirma(); return; }
      const g = e.target.closest("[data-pf-guardar]");
      if (g) {
        g.disabled = true;
        try {
          const val = k => v.querySelector(`[data-pf="${k}"]`).value;
          await D.guardarMiPerfil(p, { nombre: val("nombre"), telefono: val("telefono"), puesto: val("puesto"), foto });
          sucio = false; est.textContent = "Todo guardado"; est.className = "guardado";
          v.querySelector("[data-pf-nom]").textContent = p.nombre;
          A().pintarAvatar(); aviso("Perfil guardado.");
        } catch (err) { aviso(err.message, "mal"); }
        finally { g.disabled = false; }
        return;
      }
      const cc = e.target.closest("[data-pf-cambiar-clave]");
      if (cc) {
        const c = k => v.querySelector(`[data-pf-clave="${k}"]`);
        if (c("nueva").value !== c("otra").value) { aviso("Las dos contraseñas nuevas no son iguales.", "mal"); return; }
        cc.disabled = true;
        try { await D.cambiarClave(s.correo, c("actual").value, c("nueva").value); ["actual", "nueva", "otra"].forEach(k => { c(k).value = ""; }); aviso("Contraseña cambiada."); }
        catch (err) { aviso(err.message, "mal"); }
        finally { cc.disabled = false; }
      }
    };
  }

  return { vista };
})();
