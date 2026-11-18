"use strict";
(() => {
  const D = window.EMT_DATOS;
  const app = document.getElementById("app");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MAS = {
    chev: '<path d="m9 18 6-6-6-6"/>',
    salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    ojo: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    ojoNo: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>',
    alerta: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    bien: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    arriba: '<path d="m18 15-6-6-6 6"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    asa: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>'
  };
  const ico = (n, w = 18, g = 1.8) => MAS[n]
    ? `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${g}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MAS[n]}</svg>`
    : window.EMT.ico(n, w);
  const Q = n => "Q\u00A0" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cant = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const LOGO = '<img class="logo-o" src="../logo/emtecsa-logo-blanco.svg" alt="EMTECSA" width="137" height="22"><img class="logo-c" src="../logo/emtecsa-logo.svg" alt="EMTECSA" width="137" height="22">';

  const SECCIONES = [
    { id: "hoy", n: "Hoy", i: "home", c: "marino" },
    { id: "clientes", n: "Clientes", i: "building", c: "azul" },
    { id: "cotizaciones", n: "Cotizaciones", i: "file", c: "laton" },
    { id: "obras", n: "Obras", i: "hammer", c: "verde" },
    { id: "catalogo", n: "Catálogo", i: "box", c: "gris" },
    { id: "cobros", n: "Cobros", i: "wallet", c: "ambar" },
    { id: "tienda", n: "Tienda", i: "cart", c: "laton" }
  ];
  const MENU = [
    { id: "hoy", n: "Hoy", i: "home", c: "marino" },
    { id: "ventas", n: "Ventas", i: "file", c: "laton", ir: "cotizaciones", grupo: ["cotizaciones", "clientes", "tienda"] },
    { id: "obras", n: "Obras", i: "hammer", c: "verde" },
    { id: "dinero", n: "Dinero", i: "wallet", c: "ambar", ir: "cobros", grupo: ["cobros"] },
    { id: "catalogo", n: "Catálogo", i: "box", c: "gris" }
  ];
  const PESTANAS_GRUPO = { ventas: [["cotizaciones", "Cotizaciones"], ["clientes", "Clientes"], ["tienda", "Tienda", "verTienda"]] };
  const menuDe = s => MENU.find(m => m.id === s || (m.grupo || []).includes(s));
  const menuVisible = () => MENU.filter(m => m.id !== "dinero" || !sesion || D.puede(sesion.perfil, "verCobros") || D.puede(sesion.perfil, "verCosto"));
  const conteos = {};
  const ponerInsignia = (a, n, txt) => { let b = a.querySelector(".insignia"); if (!n) { if (b) b.parentNode.removeChild(b); return; } if (!b) { b = document.createElement("span"); b.className = "insignia"; a.appendChild(b); } b.textContent = n; b.setAttribute("aria-label", `${n} ${txt || "por atender"}`); };
  function pintarInsignias() {
    MENU.forEach(m => { const a = document.querySelector(`.barra [data-sec="${m.id}"]`); if (a) ponerInsignia(a, (m.grupo || [m.id]).reduce((t, k) => t + (conteos[k] || 0), 0)); });
    document.querySelectorAll("[data-tab-sec]").forEach(a => ponerInsignia(a, conteos[a.dataset.tabSec] || 0));
  }
  function marcarInsignia(clave, n) { conteos[clave] = Number(n) || 0; pintarInsignias(); }
  function pestanasGrupo(v, s, sub) {
    const m = menuDe(s); const l = m && PESTANAS_GRUPO[m.id]; if (!l || sub) return;
    const vis = l.filter(([, , perm]) => !perm || D.puede(sesion.perfil, perm)); if (vis.length < 2) return;
    const cu = v.querySelector(".cuerpo"); if (!cu || cu.querySelector(".pest-grupo")) return;
    const n = document.createElement("nav"); n.className = "seg pest-o pest-grupo"; n.setAttribute("aria-label", m.n);
    n.innerHTML = vis.map(([k, t]) => `<a href="#/${k}" data-tab-sec="${k}" ${k === s ? 'aria-current="page"' : ""}>${t}</a>`).join("");
    cu.prepend(n); pintarInsignias();
  }
  function infoEnTitulos(v) {
    $$(".cab-v p.desc", v).forEach(p => {
      const h = p.parentElement.querySelector("h1"); const t = p.textContent.trim(); if (!h || !t || h.querySelector("[data-info]")) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "info-b"; b.dataset.info = t; b.setAttribute("aria-label", "Qué es esto"); b.textContent = "i";
      h.appendChild(b); p.parentNode.removeChild(p);
    });
  }
  function quitarInfo() { const p = document.querySelector(".info-pop"); if (p) p.parentNode.removeChild(p); return p; }
  function abrirInfo(b) {
    const ya = quitarInfo(); if (ya && ya.dataset.de === b.dataset.info) return;
    const p = document.createElement("div"); p.className = "info-pop"; p.dataset.de = b.dataset.info; p.setAttribute("role", "tooltip"); p.textContent = b.dataset.info;
    document.body.appendChild(p);
    const r = b.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
    p.style.width = w + "px"; p.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + "px"; p.style.top = (r.bottom + scrollY + 8) + "px";
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-info]"); if (b) { e.preventDefault(); abrirInfo(b); return; } if (!e.target.closest(".info-pop")) quitarInfo(); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") quitarInfo(); });
  const PENDIENTE = {
    clientes: ["La empresa cliente con su NIT, sus plantas y sus contactos.", ["Ficha de cada empresa con razón social, NIT y condiciones de crédito", "Varias plantas o sitios, cada uno con su ubicación", "Contactos por área: gerencia, mantenimiento y compras", "Equipos instalados en cada sitio"]],
    cotizaciones: ["Se escoge lo que se vende y la lista de materiales sale sola.", ["Escoger estructuras y transformadores con su cantidad", "Lista de todo el material que hay que comprar, sumada", "Mano de obra, condiciones y propuesta en PDF", "Enlace para que el cliente la revise y la apruebe"]],
    obras: ["De la orden de compra hasta energizar.", ["Etapas según el tipo de trabajo, con fechas y responsable", "Materiales de la obra salidos de la cotización aprobada", "Bitácora diaria con fotos", "Trámites con la distribuidora"]],
  };

  let sesion = null;
  let busqueda = "";
  let mantener = false;
  let vistaActual = "";

  function aviso(texto, tipo = "bien") {
    const caja = $("[data-avisos]");
    const el = document.createElement("div");
    el.className = "aviso " + tipo;
    el.innerHTML = ico(tipo === "mal" ? "alerta" : "bien", 18) + "<span></span>";
    el.querySelector("span").textContent = texto;
    caja.appendChild(el);
    setTimeout(() => { el.classList.add("sale"); setTimeout(() => el.remove(), 220); }, 3600);
  }

  function ponerModo(m) {
    if (m === "claro" || m === "oscuro") document.documentElement.dataset.modo = m; else delete document.documentElement.dataset.modo;
    try { localStorage.setItem("emtecsa.sistema.modo", m); } catch (e) {}
  }

  function saludo() { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; }
  const fechaLarga = () => new Date().toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });
  const iniciales = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  const avatar = p => p && p.foto ? `<img src="${esc(p.foto)}" alt="">` : esc(iniciales(p && p.nombre));
  const pintarAvatar = () => { const b = document.querySelector("[data-cuenta]"); if (b && sesion) b.innerHTML = avatar(sesion.perfil); };

  function pintarRegistro() {
    document.title = "Crear mi cuenta · EMTECSA";
    app.innerHTML = `
      <section class="entrada">
        <img src="../img/lineas-luna.jpg" alt="">
        <form class="entrada-caja" novalidate data-form>
          ${LOGO}
          <div><h1 class="t">Crear mi cuenta</h1><p style="margin-top:10px">Gerencia la tiene que aprobar y ponerle su rol antes de que pueda entrar.</p></div>
          <label class="campo">Nombre completo<span class="caja-in"><input name="nombre" autocomplete="name" required></span></label>
          <label class="campo">Correo<span class="caja-in"><input type="email" name="correo" autocomplete="username" inputmode="email" required placeholder="nombre@emtecsa.com"></span></label>
          <label class="campo">Contraseña<span class="caja-in"><input type="password" name="clave" autocomplete="new-password" minlength="8" required><button class="ver-clave" type="button" aria-label="Mostrar la contraseña" data-ver-clave>${ico("ojo", 18)}</button></span><small class="suave" style="font-size:12.5px">Al menos 8 letras o números.</small></label>
          <button class="s-btn lleno" type="submit">Crear mi cuenta</button>
          <button class="enlace-b" type="button" data-otro>Ya tengo cuenta: entrar</button>
        </form>
      </section>`;
    const f = $("[data-form]");
    f.addEventListener("click", e => {
      if (e.target.closest("[data-otro]")) pintarEntrada(false);
      const v = e.target.closest("[data-ver-clave]");
      if (v) { const i = f.clave; const ver = i.type === "password"; i.type = ver ? "text" : "password"; v.innerHTML = ico(ver ? "ojoNo" : "ojo", 18); v.setAttribute("aria-label", ver ? "Ocultar la contraseña" : "Mostrar la contraseña"); }
    });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const b = f.querySelector('[type="submit"]'); b.disabled = true;
      try {
        await D.registrarse({ nombre: f.nombre.value, correo: f.correo.value, clave: f.clave.value });
        app.querySelector(".entrada-caja").innerHTML = `${LOGO}<div><h1 class="t">Listo</h1><p style="margin-top:10px">Su cuenta quedó esperando que gerencia la apruebe. Cuando la aprueben ya puede entrar con su correo y contraseña.</p></div><button class="s-btn lleno" type="button" data-volver>Ir a entrar</button>`;
        app.querySelector("[data-volver]").addEventListener("click", () => pintarEntrada(false));
      } catch (err) { aviso(err.message, "mal"); b.disabled = false; }
    });
  }

  function pintarEntrada(recuperar = false) {
    document.title = "Entrar · EMTECSA";
    app.innerHTML = `
      <section class="entrada">
        <img src="../img/lineas-luna.jpg" alt="">
        <form class="entrada-caja" novalidate data-form>
          ${LOGO}
          <div><h1 class="t">${recuperar ? "Nueva contraseña" : "Entrar"}</h1><p style="margin-top:10px">${recuperar ? "Escriba su correo y le mandamos un enlace para crear una contraseña nueva." : "Use el correo y la contraseña que le dio gerencia."}</p></div>
          ${D.nube ? "" : `<div class="nota-prueba"><span>La base de EMTECSA todavía no está conectada. Mientras tanto puede ver el sistema en modo de prueba, con el catálogo del Excel.</span><button class="s-btn vidrio" type="button" data-prueba>Entrar a la prueba</button></div>`}
          <label class="campo">Correo<span class="caja-in"><input type="email" name="correo" autocomplete="username" inputmode="email" required placeholder="nombre@emtecsa.com"></span></label>
          ${recuperar ? "" : `<label class="campo">Contraseña<span class="caja-in"><input type="password" name="clave" autocomplete="current-password" required><button class="ver-clave" type="button" aria-label="Mostrar la contraseña" data-ver-clave>${ico("ojo", 18)}</button></span></label>`}
          <button class="s-btn lleno" type="submit">${recuperar ? "Enviar enlace" : "Entrar"}</button>
          <button class="enlace-b" type="button" data-otro>${recuperar ? "Regresar a entrar" : "¿Olvidó su contraseña?"}</button>
          ${recuperar ? "" : `<button class="enlace-b" type="button" data-registro>¿Es nuevo en EMTECSA? Crear mi cuenta</button>`}
        </form>
      </section>`;
    const f = $("[data-form]");
    f.addEventListener("click", async e => {
      if (e.target.closest("[data-otro]")) pintarEntrada(!recuperar);
      if (e.target.closest("[data-registro]")) pintarRegistro();
      if (e.target.closest("[data-prueba]")) { sesion = await D.entrarPrueba(); arrancarApp(); }
      const v = e.target.closest("[data-ver-clave]");
      if (v) { const i = f.clave; const ver = i.type === "password"; i.type = ver ? "text" : "password"; v.innerHTML = ico(ver ? "ojoNo" : "ojo", 18); v.setAttribute("aria-label", ver ? "Ocultar la contraseña" : "Mostrar la contraseña"); }
    });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const correo = f.correo.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { aviso("Escriba un correo válido.", "mal"); f.correo.focus(); return; }
      const b = f.querySelector('[type="submit"]'); b.disabled = true;
      try {
        if (recuperar) { await D.recuperar(correo); aviso("Listo. Revise su correo para crear la contraseña nueva."); pintarEntrada(false); return; }
        if (!f.clave.value) { aviso("Escriba su contraseña.", "mal"); f.clave.focus(); return; }
        sesion = await D.entrar(correo, f.clave.value);
        arrancarApp();
      } catch (err) { aviso(err.message, "mal"); }
      finally { b.disabled = false; }
    });
  }

  function arrancarApp() {
    ponerModo(sesion.perfil.modo || "oscuro");
    document.title = "EMTECSA";
    app.innerHTML = `
      <header class="barra"><div class="ancho">
        <a class="marca" href="#/hoy" aria-label="EMTECSA, ir a Hoy">${LOGO}</a>
        <nav class="seg" aria-label="Secciones">${menuVisible().map(s => `<a href="#/${s.ir || s.id}" data-sec="${s.id}">${s.n}</a>`).join("")}</nav>
        <div class="der">
          <label class="buscar"><span class="sr">Buscar en el catálogo</span>${ico("search", 15)}<input type="search" placeholder="Buscar" data-buscar></label>
          <button class="s-ib solo-angosto" type="button" aria-label="Abrir el menú" data-menu>${ico("menu", 18)}</button>
          <button class="av" type="button" aria-label="Su cuenta" aria-haspopup="true" data-cuenta>${avatar(sesion.perfil)}</button>
        </div>
      </div></header>
      ${sesion.perfil.dev ? `<div class="probando dev-banda"><span>${ico("wrench", 15)}<span><b>Modo desarrollo:</b> datos de muestra. Nada de lo que haga toca la base real.</span></span><a class="s-btn suave-b chico" href="#/errores">Errores<b class="dev-n" data-dev-n></b></a></div>` : ""}
      ${sesion.perfil.probando ? `<div class="probando"><span>${ico("shield", 15)}Está viendo el sistema como <b>${esc(D.ROLES[sesion.perfil.rol])}</b></span><button class="s-btn suave-b chico" type="button" data-volver-rol-b>Volver a gerencia</button></div>` : ""}
      <main class="vista ancho" id="vista" tabindex="-1"></main>`;
    const vr = app.querySelector("[data-volver-rol-b]"); if (vr) vr.addEventListener("click", () => window.EMT_EQUIPO.verComo(sesion.perfil.rolReal || "gerencia"));
    app.onclick = clicApp;
    $("[data-buscar]").addEventListener("keydown", e => { if (e.key === "Enter") { busqueda = e.target.value.trim(); mantener = true; ir("catalogo"); } });
    addEventListener("hashchange", ruta);
    ruta();
  }

  function ir(sec, sub) { const h = "#/" + sec + (sub ? "/" + sub : ""); if (location.hash === h) ruta(); else location.hash = h; }

  let guardiaAct = null, rutaActual = "", ignorarHash = false;
  const PESTANAS_SEC = { catalogo: ["", "materiales", "precios", "proveedores"], cobros: ["", "pagos", "clientes", "fianzas", "costos"], equipo: ["", "personas", "permisos", "historial"] };
  const pantallaDe = (s, sub, sub2) => (PESTANAS_SEC[s] && PESTANAS_SEC[s].includes(sub) ? s : s + "/" + sub) + (/^\d+$/.test(sub2) ? "/" + sub2 : "");
  const normal = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  function filtrar(cont, sel, q) {
    const t = normal(q);
    const els = [...cont.querySelectorAll(sel)];
    let n = 0;
    els.forEach(el => { const ok = !t || normal(el.textContent).includes(t); el.hidden = !ok; if (ok) n++; });
    let nada = cont.querySelector(":scope > [data-nada]");
    if (t && els.length && !n) { if (!nada) { nada = document.createElement("div"); nada.className = "vacio chico"; nada.dataset.nada = ""; cont.append(nada); } nada.innerHTML = `<p>Nada con «${esc(q)}» aquí.</p>`; }
    else nada?.remove();
    return n;
  }
  function chipsASelect(root) {
    root.querySelectorAll(".chips-f").forEach(g => {
      if (g.nextElementSibling && g.nextElementSibling.matches(".chips-sel")) return;
      const bs = [...g.querySelectorAll("button")];
      const lab = document.createElement("label"); lab.className = "chips-sel";
      lab.innerHTML = `<span class="sr">${esc(g.getAttribute("aria-label") || "Filtro")}</span><select>${bs.map((b, i) => `<option value="${i}" ${b.getAttribute("aria-pressed") === "true" ? "selected" : ""}>${esc(b.textContent.trim())}</option>`).join("")}</select>`;
      g.after(lab);
      const sel = lab.querySelector("select");
      sel.addEventListener("change", () => bs[Number(sel.value)].click());
      g.addEventListener("click", () => setTimeout(() => { const i = bs.findIndex(b => b.getAttribute("aria-pressed") === "true"); if (i >= 0) sel.value = String(i); }));
    });
  }
  function altoNatural(v) {
    const r = v.getBoundingClientRect();
    let b = 0;
    for (const h of v.children) { const cr = h.getBoundingClientRect(); b = Math.max(b, cr.bottom - r.top + (parseFloat(getComputedStyle(h).marginBottom) || 0)); }
    return b + (parseFloat(getComputedStyle(v).paddingBottom) || 0);
  }
  function sostener() {
    const v = $("#vista"); if (!v) return;
    const arriba = v.getBoundingClientRect().top;
    const necesario = Math.max(altoNatural(v), innerHeight - arriba);
    v.style.minHeight = Math.ceil(necesario) + "px";
  }
  addEventListener("scroll", () => sostener(), { passive: true });
  addEventListener("resize", () => sostener(), { passive: true });
  function guardia(g) { guardiaAct = g; }
  function preguntarSalida(destino) {
    modal({ titulo: "¿Salir sin guardar?", guardarTxt: "Salir sin guardar", cuerpo: `<p class="suave" style="font-size:15px">Tiene cambios sin guardar. Si sale ahora, se pierden.</p>`,
      alGuardar: async () => { guardiaAct = null; cerrarCapas(); location.hash = destino; } });
  }
  async function ruta() {
    if (!sesion) return;
    if (ignorarHash) { ignorarHash = false; return; }
    if (guardiaAct && location.hash !== rutaActual && !guardiaAct.limpio()) { const destino = location.hash; ignorarHash = true; location.hash = rutaActual; preguntarSalida(destino); return; }
    guardiaAct = null;
    const [sec = "hoy", sub = "", sub2 = ""] = location.hash.replace(/^#\/?/, "").split("/");
    const s = SECCIONES.find(x => x.id === sec) || sec === "empresa" || sec === "plano" || sec === "equipo" || sec === "perfil" || sec === "errores" ? sec : "hoy";
    const mActual = menuDe(s);
    $$("[data-sec]").forEach(a => { if (mActual && a.dataset.sec === mActual.id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const v = $("#vista");
    const clave = pantallaDe(s, sub, sub2);
    if (vistaActual !== clave) { v.style.minHeight = ""; scrollTo({ top: 0, behavior: "instant" }); if (!mantener) busqueda = ""; }
    else sostener();
    mantener = false;
    vistaActual = clave;
    v.onclick = v.oninput = v.onchange = null;
    if (!v.children.length) v.innerHTML = `<div class="cargando">Cargando…</div>`;
    const barra = setTimeout(() => document.body.classList.add("cargando-r"), 150);
    try {
      if (s === "hoy") await vHoy(v);
      else if (s === "catalogo") await vCatalogo(v, ["materiales", "precios", "proveedores"].includes(sub) ? sub : "estructuras");
      else if (s === "clientes") await window.EMT_CLIENTES.vista(v, sub);
      else if (s === "cotizaciones") await window.EMT_COTIZACIONES.vista(v, sub);
      else if (s === "empresa") await window.EMT_EMPRESA.vista(v);
      else if (s === "obras") await window.EMT_OBRAS.vista(v, sub, sub2);
      else if (s === "cobros") await window.EMT_COBROS.vista(v, sub, sub2);
      else if (s === "plano") await window.EMT_PLANOS.vista(v, sub, sub2);
      else if (s === "tienda") await window.EMT_TIENDA.vista(v, sub);
      else if (s === "equipo") await window.EMT_EQUIPO.vista(v, sub);
      else if (s === "perfil") await window.EMT_PERFIL.vista(v);
      else if (s === "errores") await window.EMT_DEV.vista(v);
      else vPendiente(v, s);
    } catch (err) { if (window.EMT_ERRORES) window.EMT_ERRORES.anotar({ tipo: "pantalla", mensaje: err && err.message, pila: err && err.stack, paso: "abrir " + s }); v.innerHTML = `<div class="vacio"><span class="icono ambar">${ico("alerta", 22)}</span><h2>No se pudo cargar</h2><p>${esc(/[áéíóúñ¿]/i.test(err.message) ? err.message : "Algo falló al abrir esta pantalla. Intente otra vez.")}</p><button class="s-btn lleno" type="button" data-reintentar>Intentar otra vez</button></div>`; }
    clearTimeout(barra); document.body.classList.remove("cargando-r");
    rutaActual = location.hash;
    pestanasGrupo(v, s, sub);
    infoEnTitulos(v);
    chipsASelect(v);
    if (window.EMT_TIENDA) window.EMT_TIENDA.insignia();
    if (window.EMT_ENLACES) window.EMT_ENLACES.insignia();
    if (window.EMT_EQUIPO) window.EMT_EQUIPO.insignia();
    v.focus({ preventScroll: true });
    cerrarCapas();
  }

  async function vHoy(v) {
    if (D.nube) [D.catalogo(), D.clientes(), D.obras(), D.cotizaciones(), D.empresa(), D.puede(sesion.perfil, "verCobros") && D.resumenCobros(), D.puede(sesion.perfil, "verTienda") && D.pedidosTienda && D.pedidosTienda(), window.EMT_ENLACES && window.EMT_ENLACES.porAtender(), window.EMT_EQUIPO && window.EMT_EQUIPO.pendientes(), window.EMT_COSTOS && window.EMT_COSTOS.avisos(), window.EMT_SEGUIMIENTO && window.EMT_SEGUIMIENTO.avisos()].forEach(p => { if (p && p.catch) p.catch(() => {}); });
    const c = await D.catalogo();
    const sinPrecio = c.materiales.filter(m => m.costo == null).length;
    const sinMano = c.estructuras.filter(e => e.mano_obra == null).length;
    const nClientes = (await D.clientes()).length;
    const obrasL = await D.obras();
    const enCurso = obrasL.filter(x => x.estado === "en_curso" || x.estado === "programada"), pausadas = obrasL.filter(x => x.estado === "pausada").length;
    const mes = new Date().toISOString().slice(0, 7);
    const delMes = (await D.cotizaciones()).filter(x => String(x.fecha).slice(0, 7) === mes && x.estado !== "rechazada");
    const cotizado = delMes.reduce((a, x) => a + Number(x.total || 0), 0), aprobadas = delMes.filter(x => x.estado === "aprobada").length;
    const verC = D.puede(sesion.perfil, "verCobros");
    const rc = verC ? await D.resumenCobros() : null;
    const avisosC = rc ? [...rc.pendientes.filter(x => x.venc).map(x => ({ c: x.venc === "vencido" ? "ambar" : "azul", i: "wallet", t: `${x.venc === "vencido" ? "Cobro vencido" : "Cobrar pronto"}: ${x.cliente ? x.cliente.nombre : ""}`, d: `${x.obra ? x.obra.numero + " · " : ""}${x.descripcion} · ${Q(x.saldo)}`, chip: x.venc === "vencido" ? "Vencido" : "Esta semana", h: x.obra ? `#/obras/${x.obra.id}/cobros` : "#/cobros" })),
      ...rc.fianzasPorVencer.map(f => { const [c2, t2] = window.EMT_COBROS.estadoFianza(f); return { c: c2 === "verde" ? "azul" : c2, i: "shield", t: `Fianza de ${D.TIPOS_FIANZA[f.tipo].toLowerCase()}${f.obra_id && rc.obras[f.obra_id] ? " · " + rc.obras[f.obra_id].numero : ""}`, d: `${f.aseguradora || "Sin aseguradora"} · ${Q(f.monto)}`, chip: t2, h: "#/cobros/fianzas" }; })] : [];
    const tiendaL = D.puede(sesion.perfil, "verTienda") && D.pedidosTienda ? await D.pedidosTienda().catch(() => []) : [];
    const enlL = window.EMT_ENLACES ? await window.EMT_ENLACES.porAtender() : [];
    avisosC.unshift(...tiendaL.filter(x => x.estado === "comprobante-recibido" || (x.estado === "cotizacion" && !x.cotizacion_id)).map(x => ({ c: x.estado === "cotizacion" ? "azul" : "laton", i: x.estado === "cotizacion" ? "send" : "file", t: `${x.estado === "cotizacion" ? "Cotizar" : "Revisar comprobante"}: ${x.cliente ? x.cliente.nombre : ""}`, d: `Tienda · ${x.id}${x.total ? " · " + Q(x.total) : ""}`, chip: x.estado === "cotizacion" ? "A cotizar" : "Por revisar", h: `#/tienda/${encodeURIComponent(x.id)}` })));
    avisosC.unshift(...enlL.filter(x => x.tipo === "aprobo" || x.tipo === "mensaje" || x.tipo === "datos"));
    const vistos = enlL.filter(x => x.tipo === "abrio" || x.tipo === "volvio");
    if (window.EMT_COSTOS) avisosC.unshift(...await window.EMT_COSTOS.avisos());
    if (window.EMT_SEGUIMIENTO) avisosC.unshift(...await window.EMT_SEGUIMIENTO.avisos());
    const pend = [];
    if (sinPrecio) pend.push({ c: "ambar", i: "box", t: `Poner el costo a ${sinPrecio} materiales`, d: "Es el precio de compra; la cotización le suma el aumento.", h: "#/catalogo/precios" });
    if (sinMano) pend.push({ c: "ambar", i: "wrench", t: `Poner la mano de obra de ${sinMano} estructuras`, d: "Se suma a los materiales en cada cotización.", h: "#/catalogo" });
    if (!nClientes) pend.push({ c: "azul", i: "building", t: "Agregar sus clientes principales", d: "Con su NIT, sus plantas, contactos y equipos.", h: "#/clientes" });
    const espera = [];
    if (!D.nube) espera.push({ i: "shield", t: "Conectar la base de EMTECSA", d: "Cuando EMTECSA cree su cuenta de Supabase." });
    const porAprobar = window.EMT_EQUIPO ? await window.EMT_EQUIPO.pendientes() : [];
    avisosC.unshift(...porAprobar.map(u => ({ c: "laton", i: "users", t: `Aprobar a ${u.nombre}`, d: `${u.correo || ""} · pidió entrar al sistema`, chip: "Esperando", h: "#/equipo" })));
    if (sesion.perfil.rol === "gerencia" && !D.nube) espera.push({ i: "users", t: "Que su equipo cree sus cuentas", d: "Se hace después de conectar la base; usted las aprueba en Equipo." });
    else if (sesion.perfil.rol === "gerencia" && (await D.usuarios().catch(() => [])).filter(u => u.activo).length < 2) pend.push({ c: "gris", i: "users", t: "Que su equipo cree sus cuentas", d: "Cada uno toca «Crear mi cuenta» en la entrada y usted lo aprueba.", h: "#/equipo" });
    const VERBO = { wallet: "Cobrar", send: "Cotizar", file: "Revisar", users: "Aprobar", phone: "Llamar", alerta: "Revisar", shield: "Ver", chat: "Responder", mail: "Responder", check: "Ver", eye: "Ver" };
    const verbo = x => x.accion || (x.chip === "Responder" ? "Responder" : VERBO[x.i]) || "Abrir";
    const toca = x => `<a class="fila toca-f" href="${x.h}"><span class="icono ${x.c}">${ico(x.i, 18)}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}${x.chip && x.chip !== verbo(x) ? " · " + esc(x.chip) : ""}</small></span><span class="der"><span class="toca-b">${esc(verbo(x))}</span></span></a>`;
    const fila = x => `<a class="fila" href="${x.h}"><span class="icono ${x.c}">${ico(x.i, 18)}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`;
    const abierto = k => { try { return localStorage.getItem("emtecsa.sistema.hoy." + k) === "1"; } catch (e) { return false; } };
    const pl = (k, titulo, res, cuerpo) => `<details class="caja plegable" data-hoy-pl="${k}" ${abierto(k) ? "open" : ""}><summary><span class="pl-t"><h2>${titulo}</h2><span class="suave">${res}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">${cuerpo}</div></details>`;
    const esperando = vistos.map(x => ({ ...x, h: x.h })).concat(espera.map(x => ({ c: "gris", i: x.i, t: x.t, d: x.d, h: "" })));
    const primeros = avisosC.slice(0, 5), resto = avisosC.slice(5);
    v.innerHTML = `
      <div class="cuerpo hoy">
        <section class="hoy-cab">
          <div><span class="eti">${esc(fechaLarga())}</span><h1 class="t">${saludo()}, ${esc(sesion.perfil.nombre.split(" ")[0])}.</h1></div>
          <a class="s-btn lleno" href="#/cotizaciones">${ico("plus", 16)}Nueva cotización</a>
        </section>
        <div class="sub"><h2>Lo que toca hoy</h2>${avisosC.length ? `<span class="suave">${avisosC.length}</span>` : ""}</div>
        ${avisosC.length ? `<div class="lista toca">${primeros.map(toca).join("")}</div>${resto.length ? `<details class="mas-toca"><summary>Ver ${resto.length} más</summary><div class="lista toca">${resto.map(toca).join("")}</div></details>` : ""}`
          : `<div class="toca-vacio">${ico("check", 18)}<span>Todo al día.</span></div>`}
        ${pend.length ? pl("listo", "Para dejarlo listo", `${pend.length} ${pend.length === 1 ? "paso" : "pasos"}`, `<div class="lista sin-chip">${pend.map(fila).join("")}</div>`) : ""}
        ${esperando.length ? pl("espera", "Esperando a otros", `${esperando.length}`, `<div class="lista sin-chip">${esperando.map(x => x.h ? fila(x) : `<div class="fila" style="cursor:default"><span class="icono gris">${ico(x.i, 18)}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span></span></div>`).join("")}</div>`) : ""}
        ${pl("mes", "Este mes", `${esc(Q(cotizado))} cotizado · ${enCurso.length} ${enCurso.length === 1 ? "obra" : "obras"}`, `<div class="widgets">
          <a class="w" href="#/cotizaciones"><span class="w-cab"><span class="icono laton">${ico("file", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Cotizado</span><b>${Q(cotizado)}</b><small>${delMes.length} ${delMes.length === 1 ? "cotización" : "cotizaciones"} · ${aprobadas} ${aprobadas === 1 ? "aprobada" : "aprobadas"}</small></a>
          <a class="w" href="#/obras"><span class="w-cab"><span class="icono azul">${ico("hammer", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Obras en curso</span><b>${enCurso.length}</b><small>${enCurso.filter(x => x.estado === "programada").length} por empezar${pausadas ? ` · ${pausadas} en pausa` : ""}</small></a>
          <a class="w" href="#/catalogo/materiales"><span class="w-cab"><span class="icono verde">${ico("box", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Materiales</span><b>${c.materiales.length}</b><small>${sinPrecio ? `${sinPrecio} sin costo` : "Todos con costo"}</small></a>
        </div>`)}
      </div>`;
    v.querySelectorAll("[data-hoy-pl]").forEach(d => d.addEventListener("toggle", () => { try { localStorage.setItem("emtecsa.sistema.hoy." + d.dataset.hoyPl, d.open ? "1" : "0"); } catch (e) {} }));
  }

  const UNIDADES = ["unidad", "metro", "pie", "juego", "pieza", "kilogramo", "rollo", "galón", "servicio"];
  const numero = v => { const t = String(v == null ? "" : v).replace(/[Q,\s]/g, ""); if (!t) return null; const n = Number(t); if (!isFinite(n)) throw new Error("Revise los montos: solo números."); return n; };
  const montoTxt = n => n == null ? "" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function calc(e) {
    let costo = 0, falt = 0;
    e.materiales.forEach(r => { if (r.material.costo == null) falt++; else costo += r.material.costo * r.cantidad; });
    const mo = e.mano_obra == null ? null : Number(e.mano_obra);
    return { costo, falt, mo, total: falt || mo == null ? null : costo + mo };
  }
  const abiertos = new Set();

  async function vCatalogo(v, pestana) {
    const c = await D.catalogo();
    const p = sesion.perfil;
    const verCosto = D.puede(p, "verCosto"), verAum = D.puede(p, "verAumento");
    if (pestana === "precios" && !verAum) pestana = "materiales";
    const pv = pestana === "proveedores" ? await D.proveedores() : null;
    const edP = D.puede(p, "editarProveedor");
    const edM = D.puede(p, "editarMaterial"), edE = D.puede(p, "editarEstructura");
    const usos = {};
    c.estructuras.forEach(e => e.materiales.forEach(r => { usos[r.material.id] = (usos[r.material.id] || 0) + 1; }));
    const boton = pestana === "estructuras" ? (edE ? `<button class="s-btn lleno" type="button" data-nueva-est>${ico("plus", 16)}Agregar estructura</button>` : "") : (edM ? `<button class="s-btn lleno" type="button" data-nuevo-mat>${ico("plus", 16)}Agregar material</button>` : "");
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Catálogo</h1><p class="desc">Lo que vende EMTECSA y el material que lleva cada cosa. Aquí va el costo de compra de cada material y la mano de obra; el precio para el cliente se arma en cada cotización con el aumento.</p></div>${boton}</div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: lo que guarde se queda en esta computadora y se sube a la base de EMTECSA cuando se conecte.</span></div>`}
        <div class="herr">
          <nav class="seg" aria-label="Ver"><a href="#/catalogo" ${pestana === "estructuras" ? 'aria-current="page"' : ""}>Lo que vende</a><a href="#/catalogo/materiales" ${pestana === "materiales" ? 'aria-current="page"' : ""}>Materiales</a>${verAum ? `<a href="#/catalogo/precios" ${pestana === "precios" ? 'aria-current="page"' : ""}>Precios</a>` : ""}<a href="#/catalogo/proveedores" ${pestana === "proveedores" ? 'aria-current="page"' : ""}>Proveedores</a></nav>
          <label class="busca-v"><span class="sr">Buscar</span>${ico("search", 16)}<input type="search" placeholder="${pestana === "estructuras" ? "Buscar estructura, kV o kVA" : "Buscar material o código"}" value="${esc(busqueda)}" data-filtro></label>
        </div>
        <div data-res></div>
      </div>`;
    const res = $("[data-res]", v);
    const pintar = () => {
      const q = busqueda.toLowerCase();
      if (pestana === "estructuras") {
        const pasa = e => !q || (e.nombre + " " + e.codigo + " " + e.voltaje_kv + " kv " + (e.kva || "") + " kva").toLowerCase().includes(q);
        const grupos = [["linea", "Estructuras de línea"], ["transformador", "Transformadores en poste"]].flatMap(([cl, t]) =>
          [...new Set(c.estructuras.filter(e => e.clase === cl).map(e => Number(e.voltaje_kv)))].sort((a, b) => a - b).map(kv => [`${t} · ${cant(kv)} kV`, c.estructuras.filter(e => e.clase === cl && Number(e.voltaje_kv) === kv && pasa(e))]))
          .filter(([, l]) => l.length);
        res.innerHTML = grupos.length ? grupos.map(([t, l]) => `<div class="grupo-t">${t} · ${l.length}</div><div class="lista">${l.map(e => {
          const k = calc(e);
          const der = k.total != null ? (verCosto ? `<span class="e-cifra">${esc(Q(k.total))}</span><small>costo y mano de obra</small>` : '<span class="chip verde">Completa</span>') : `<span class="chip ambar">${k.falt ? `Faltan ${k.falt} costos` : "Falta mano de obra"}</span>`;
          return `<details class="est" data-est="${e.id}" ${abiertos.has(e.id) ? "open" : ""}><summary class="fila"><span class="icono ${e.clase === "linea" ? "azul" : "laton"}">${ico(e.clase === "linea" ? "torre" : "zap", 18)}</span><span><b>${esc(e.nombre)}</b><small>${esc(e.codigo)} · ${cant(e.voltaje_kv)} kV · ${e.materiales.length} materiales</small></span><span class="der">${der}</span><span class="chev">${ico("chev", 16, 2.2)}</span></summary>
          <div class="mats">
            <div class="resumen-est">
              ${verCosto ? `<span><small>Costo de materiales</small><b>${k.falt ? `${k.falt} sin costo` : esc(Q(k.costo))}</b></span>` : `<span><small>Materiales</small><b>${k.falt ? `${k.falt} sin costo` : "Todos con costo"}</b></span>`}
              <span><small>Mano de obra</small><b>${k.mo == null ? "Sin poner" : esc(Q(k.mo))}</b></span>
              ${edE ? `<button class="s-btn suave-b" type="button" data-editar-est="${e.id}">${ico("pen", 15)}Editar</button>` : ""}
            </div>
            ${e.materiales.map(r => `<div><span>${esc(r.material.descripcion)}</span><span>${cant(r.cantidad)}${verCosto && r.material.costo != null ? ` <small class="suave">× ${esc(Q(r.material.costo))}</small>` : ""}</span></div>`).join("")}
          </div></details>`; }).join("")}</div>`).join("") : `<div class="vacio"><h2>Nada con «${esc(busqueda)}»</h2><p>Pruebe con otra palabra, el voltaje o los kVA.</p></div>`;
      } else if (pestana === "precios") {
        pintarPrecios(res, c, q);
      } else if (pestana === "proveedores") {
        const cuenta = id => pv.matprov.filter(x => x.proveedor_id === id).length;
        const l = pv.proveedores.filter(x => !q || normal([x.nombre, x.codigo, x.contacto, x.telefono, x.nit].join(" ")).includes(normal(q)));
        res.innerHTML = !pv.proveedores.length ? `<div class="vacio"><span class="icono laton">${ico("cart", 24)}</span><h2>Todavía no hay proveedores</h2><p>Agregue a quién le compran y qué materiales le compran a cada uno. Así cada obra arma su lista de compra por proveedor.</p>${edP ? `<button class="s-btn lleno" type="button" data-nuevo-prov>${ico("plus", 16)}Agregar proveedor</button>` : ""}</div>`
          : l.length ? `<div class="grupo-t">${l.length} ${l.length === 1 ? "proveedor" : "proveedores"}</div><div class="lista">${l.map(x => { const n = cuenta(x.id); return `
          <div class="fila con-lapiz prov" style="cursor:default"><span class="icono laton">${ico("cart", 18)}</span><span><b>${esc(x.nombre)}</b><small>${esc([x.contacto, n ? n + (n === 1 ? " material" : " materiales") : "sin materiales"].filter(Boolean).join(" · "))}</small></span>
          <span class="acc">${x.telefono ? `<a class="s-ib" href="tel:${esc(String(x.telefono).replace(/[^\d+]/g, ""))}" aria-label="Llamar a ${esc(x.nombre)}">${ico("phone", 15)}</a>` : ""}</span>
          ${edP ? `<button class="s-ib" type="button" aria-label="Editar ${esc(x.nombre)}" data-ed-prov="${x.id}">${ico("pen", 16)}</button>` : "<span></span>"}</div>`; }).join("")}</div>`
          : `<div class="vacio"><h2>Nada con «${esc(busqueda)}»</h2><p>Pruebe con otro nombre o teléfono.</p></div>`;
      } else {
        const l = c.materiales.filter(m => !q || (m.descripcion + " " + m.codigo).toLowerCase().includes(q));
        res.innerHTML = l.length ? `<div class="grupo-t">${l.length} ${l.length === 1 ? "material" : "materiales"} · ${l.filter(m => m.costo == null).length} sin costo</div><div class="lista">${l.map(m => `
          <div class="fila ${edM ? "con-lapiz" : ""}" style="cursor:default"><span class="icono gris">${ico("box", 18)}</span><span><b>${esc(m.descripcion)}</b><small>${esc(m.codigo)}${m.unidad ? " · por " + esc(m.unidad) : ""} · en ${usos[m.id] || 0} estructuras</small></span>
          <span class="der">${m.costo == null && !(verAum && m.venta_modo === "precio") ? '<span class="chip ambar">Sin costo</span>' : verAum ? ventaTxt(m) : verCosto ? `<span class="e-cifra">${esc(Q(m.costo))}</span>` : '<span class="chip verde">Con costo</span>'}</span>
          ${edM ? `<button class="s-ib" type="button" aria-label="Editar ${esc(m.descripcion)}" data-editar-mat="${m.id}">${ico("pen", 16)}</button>` : "<span></span>"}</div>`).join("")}</div>` : `<div class="vacio"><h2>Nada con «${esc(busqueda)}»</h2><p>Pruebe con otra palabra o con el código.</p></div>`;
      }
    };
    pintar();
    $("[data-filtro]", v).addEventListener("input", e => { busqueda = e.target.value; pintar(); });
    if (pestana === "precios") { $("[data-filtro]", v).placeholder = "Buscar material o código"; $(".cab-v > .s-btn", v)?.remove(); }
    if (pestana === "proveedores") { $("[data-filtro]", v).placeholder = "Buscar proveedor o teléfono"; const b = $(".cab-v > .s-btn", v); if (b) { if (edP) { b.outerHTML = `<button class="s-btn lleno" type="button" data-nuevo-prov>${ico("plus", 16)}Agregar proveedor</button>`; } else b.remove(); } }
    res.addEventListener("toggle", e => { const d = e.target.closest("[data-est]"); if (d) { const id = Number(d.dataset.est); if (d.open) abiertos.add(id); else abiertos.delete(id); } }, true);
    if (pestana === "precios") {
      guardia({ limpio: () => !preciosPend.size, soltar: () => preciosPend.clear() });
      const cambiar = (id, cambios) => {
        const m = c.materiales.find(x => x.id === id);
        const x = { ...(preciosPend.get(id) || { venta_modo: m.venta_modo || "", precio: m.precio, venta_pct: m.venta_pct }), ...cambios };
        if ((x.venta_modo || "") === (m.venta_modo || "") && (x.venta_modo !== "precio" || Number(x.precio) === Number(m.precio)) && (x.venta_modo !== "pct" || Number(x.venta_pct) === Number(m.venta_pct))) preciosPend.delete(id); else preciosPend.set(id, x);
      };
      res.addEventListener("change", e => {
        const md = e.target.dataset.prModo;
        if (md) { cambiar(Number(md), { venta_modo: e.target.value }); pintar(); res.querySelector(`[data-pr-val="${md}"]`)?.focus(); }
        const vl = e.target.dataset.prVal;
        if (vl) { const m = preciosPend.get(Number(vl)); if (m && m.venta_modo === "precio") e.target.value = montoTxt(m.precio); }
      });
      res.addEventListener("input", e => {
        const vl = e.target.dataset.prVal; if (!vl) return;
        const id = Number(vl), x = preciosPend.get(id) || {}, m = c.materiales.find(y => y.id === id);
        const modo = x.venta_modo ?? m.venta_modo;
        let n = null; try { n = numero(e.target.value); } catch (er) { n = null; }
        cambiar(id, modo === "precio" ? { venta_modo: modo, precio: n } : { venta_modo: modo, venta_pct: n });
        const fila = res.querySelector(`[data-pr="${id}"]`), z = D.precioPieza({ ...m, ...(preciosPend.get(id) || {}), venta_modo: (preciosPend.get(id) || m).venta_modo || null }, null, null);
        fila.classList.toggle("cambio", preciosPend.has(id));
        fila.querySelector(".pr-p").innerHTML = z.precio == null ? "—" : esc(Q(z.precio));
        fila.querySelector(".pr-g").innerHTML = z.ganancia == null ? '<span class="suave">—</span>' : `<b class="${z.ganancia < 0 ? "falta" : ""}">${esc(Q(z.ganancia))}</b>`;
        const nn = preciosPend.size, est = res.querySelector("[data-pr-est]");
        est.textContent = nn ? `${nn} ${nn === 1 ? "cambio sin guardar" : "cambios sin guardar"}` : "Todo guardado"; est.className = "guardado" + (nn ? " sin" : "");
        res.querySelector("[data-pr-guardar]").disabled = !nn;
      });
    }
    v.onclick = async e => {
      const pg = e.target.closest("[data-pr-guardar]");
      if (pg) {
        pg.disabled = true;
        try {
          for (const [id, x] of preciosPend) { const m = c.materiales.find(y => y.id === id); await D.guardarMaterial({ ...m, venta_modo: x.venta_modo || null, precio: x.precio ?? null, venta_pct: x.venta_pct ?? null }); preciosPend.delete(id); }
          aviso("Precios guardados."); await refrescar();
        } catch (err) { aviso(err.message, "mal"); pg.disabled = false; }
        return;
      }
      if (e.target.closest("[data-nuevo-prov]")) editarProveedor(null, c, pv);
      const ep = e.target.closest("[data-ed-prov]"); if (ep) editarProveedor(pv.proveedores.find(x => x.id === Number(ep.dataset.edProv)), c, pv);
      const em = e.target.closest("[data-editar-mat]"); if (em) editarMaterial(c.materiales.find(m => m.id === Number(em.dataset.editarMat)), c);
      if (e.target.closest("[data-nuevo-mat]")) editarMaterial(null, c);
      const ee = e.target.closest("[data-editar-est]"); if (ee) editarEstructura(c.estructuras.find(x => x.id === Number(ee.dataset.editarEst)), c);
      if (e.target.closest("[data-nueva-est]")) editarEstructura(null, c);
    };
  }

  const MODOS_VENTA = [["", "Aumento de la cotización"], ["precio", "Precio fijo"], ["pct", "% propio"]];
  function ventaTxt(m) {
    const z = D.precioPieza(m, null, null);
    const costo = m.costo == null ? "Sin costo" : Q(m.costo);
    if (!m.venta_modo) return `<span class="e-cifra">${esc(costo)}</span><small>aumento de la cotización</small>`;
    return `<span class="e-cifra">${esc(costo)} → ${esc(z.precio == null ? "—" : Q(z.precio))}</span><small>${m.venta_modo === "pct" ? "+" + esc(cant(m.venta_pct)) + " %" : "precio fijo"}${z.ganancia != null ? " · gana " + esc(Q(z.ganancia)) : ""}</small>`;
  }
  const preciosPend = new Map();
  function pintarPrecios(res, c, q) {
    const l = c.materiales.filter(m => !q || (m.descripcion + " " + m.codigo).toLowerCase().includes(q));
    const val = m => preciosPend.has(m.id) ? preciosPend.get(m.id) : { venta_modo: m.venta_modo || "", precio: m.precio, venta_pct: m.venta_pct };
    const fila = m => {
      const x = val(m);
      const z = D.precioPieza({ ...m, venta_modo: x.venta_modo || null, precio: x.precio, venta_pct: x.venta_pct }, null, null);
      return `<div class="pr-fila${preciosPend.has(m.id) ? " cambio" : ""}" data-pr="${m.id}">
        <span class="pr-nom"><b>${esc(m.descripcion)}</b><small>${esc(m.codigo)}${m.unidad ? " · por " + esc(m.unidad) : ""}</small></span>
        <span class="pr-c" data-l="Costo">${m.costo == null ? '<span class="falta">Sin costo</span>' : esc(Q(m.costo))}</span>
        <label class="pr-m f-campo"><span class="sr">Forma de precio de ${esc(m.descripcion)}</span><select data-pr-modo="${m.id}">${MODOS_VENTA.map(([k2, n]) => `<option value="${k2}" ${x.venta_modo === k2 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="pr-v f-campo"><span class="sr">Valor</span>${x.venta_modo === "precio" ? `<span class="f-monto"><span>Q</span><input data-pr-val="${m.id}" inputmode="decimal" value="${esc(montoTxt(x.precio))}" placeholder="0.00" autocomplete="off"></span>` : x.venta_modo === "pct" ? `<span class="f-pct"><input data-pr-val="${m.id}" inputmode="decimal" value="${esc(x.venta_pct ?? "")}" placeholder="0" autocomplete="off"><span>%</span></span>` : '<span class="suave pr-auto">El de cada cotización</span>'}</label>
        <span class="pr-p" data-l="Al cliente">${x.venta_modo ? (z.precio == null ? "—" : esc(Q(z.precio))) : '<span class="suave">—</span>'}</span>
        <span class="pr-g" data-l="Gana c/u">${x.venta_modo && z.ganancia != null ? `<b class="${z.ganancia < 0 ? "falta" : ""}">${esc(Q(z.ganancia))}</b>` : '<span class="suave">—</span>'}</span>
      </div>`;
    };
    const n = preciosPend.size;
    res.innerHTML = `<div class="pr-nota"><span>${ico("ojoNo", 15)}Solo lo ve gerencia. Cada material puede llevar su propio precio al cliente: un precio fijo o un % sobre el costo. Si lo deja en «Aumento de la cotización», usa el % que se ponga en cada cotización.</span></div>
      <div class="pr-acc"><span class="grupo-t" style="margin:0">${l.length} ${l.length === 1 ? "material" : "materiales"} · ${c.materiales.filter(m => m.venta_modo).length} con precio propio</span><span class="esp"></span><span class="guardado ${n ? "sin" : ""}" data-pr-est>${n ? `${n} ${n === 1 ? "cambio sin guardar" : "cambios sin guardar"}` : "Todo guardado"}</span><button class="s-btn lleno" type="button" data-pr-guardar ${n ? "" : "disabled"}>${ico("check", 16)}Guardar precios</button></div>
      ${l.length ? `<div class="pr-tabla"><div class="pr-cab"><span>Material</span><span>Costo</span><span>Forma</span><span>Valor</span><span>Al cliente</span><span>Gana c/u</span></div>${l.map(fila).join("")}</div>` : `<div class="vacio"><h2>Nada con «${esc(busqueda)}»</h2><p>Pruebe con otra palabra o con el código.</p></div>`}`;
  }

  async function quieto(fn) {
    const y = scrollY;
    sostener();
    await fn();
    sostener();
    scrollTo({ top: y, behavior: "instant" });
  }

  async function refrescar() {
    const y = scrollY;
    sostener();
    await D.catalogo(true);
    const v = $("#vista");
    const [, sub = ""] = location.hash.replace(/^#\/?/, "").split("/");
    await vCatalogo(v, ["materiales", "precios", "proveedores"].includes(sub) ? sub : "estructuras");
    sostener();
    scrollTo({ top: y, behavior: "instant" });
  }

  function modal({ titulo, cuerpo, guardarTxt = "Guardar", extra = "", quitar, quitarTxt = "Quitar", alAbrir, alGuardar, soloUno }) {
    if (quitar) extra = `<button class="s-btn suave-b" type="button" data-quitar-modal>${ico("trash", 15)}${esc(quitarTxt)}</button>` + extra;
    cerrarCapas();
    const velo = document.createElement("div"); velo.className = "velo";
    const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "modal-t");
    m.innerHTML = `<div class="modal-cab"><h2 id="modal-t">${esc(titulo)}</h2><button class="s-ib" type="button" aria-label="Cerrar" data-cerrar>${ico("x", 16)}</button></div>
      <form class="modal-cuerpo" novalidate data-modal-form>${cuerpo}</form>
      <div class="modal-pie">${extra}<span class="esp"></span>${soloUno ? "" : `<button class="s-btn suave-b" type="button" data-cerrar>Cancelar</button>`}<button class="s-btn lleno" type="button" data-guardar>${esc(guardarTxt)}</button></div>`;
    document.body.append(velo, m);
    const f = $("[data-modal-form]", m);
    velo.addEventListener("click", cerrarCapas);
    m.addEventListener("click", async e => {
      if (e.target.closest("[data-cerrar]")) cerrarCapas();
      if (quitar && e.target.closest("[data-quitar-modal]")) quitar();
      if (e.target.closest("[data-guardar]")) {
        const b = e.target.closest("[data-guardar]"); b.disabled = true;
        try { await alGuardar(f, m); } catch (err) { aviso(err.message, "mal"); } finally { b.disabled = false; }
      }
    });
    f.addEventListener("submit", e => { e.preventDefault(); $("[data-guardar]", m).click(); });
    if (alAbrir) alAbrir(f, m);
    $("input, select", f)?.focus({ preventScroll: true });
    return m;
  }

  function campoMonto(nombre, etiqueta, valor, ayuda = "") {
    return `<label class="f-campo">${etiqueta}<span class="f-monto"><span>Q</span><input name="${nombre}" inputmode="decimal" autocomplete="off" value="${esc(montoTxt(valor))}" placeholder="0.00"></span>${ayuda ? `<small>${ayuda}</small>` : ""}</label>`;
  }
  function formatoAlSalir(f) { $$(".f-monto input", f).forEach(i => i.addEventListener("blur", () => { try { const n = numero(i.value); i.value = montoTxt(n); } catch (e) {} })); }

  function editarProveedor(prov, c, pv) {
    const verCosto = D.puede(sesion.perfil, "verCosto");
    const p0 = prov || { nombre: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", notas: "" };
    const porMat = Object.fromEntries(c.materiales.map(m => [m.id, m]));
    let filas = prov ? pv.matprov.filter(x => x.proveedor_id === prov.id && porMat[x.material_id]).map(x => ({ material: porMat[x.material_id], precio: x.precio, principal: x.principal })) : [];
    const otroPrincipal = id => pv.matprov.find(x => x.material_id === id && x.principal && (!prov || x.proveedor_id !== prov.id));
    const provNombre = id => (pv.proveedores.find(x => x.id === id) || {}).nombre || "otro proveedor";
    modal({
      titulo: prov ? "Editar proveedor" : "Proveedor nuevo",
      quitar: prov ? () => { const m = modal({ titulo: "¿Quitar el proveedor?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita <b style="color:var(--text)">${esc(prov.nombre)}</b> con su lista de materiales. Las compras que ya tenía quedan sin proveedor.</p>`, alGuardar: async () => { await D.quitarProveedor(prov.id); cerrarCapas(); aviso("Proveedor quitado."); await refrescar(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
      cuerpo: `
        <label class="f-campo">Nombre<input name="nombre" value="${esc(p0.nombre)}" autocomplete="off" placeholder="Ferretería, distribuidora…"></label>
        <div class="f-fila"><label class="f-campo">Contacto<input name="contacto" value="${esc(p0.contacto || "")}" autocomplete="off" placeholder="A quién se le pide"></label>
        <label class="f-campo">Teléfono<input name="telefono" value="${esc(p0.telefono || "")}" inputmode="tel" autocomplete="off"></label></div>
        <details class="mas-datos"><summary>Más datos${p0.correo || p0.nit || p0.direccion || p0.notas ? " · con datos" : ""}</summary>
          <div class="f-fila"><label class="f-campo">Correo<input name="correo" type="email" value="${esc(p0.correo || "")}" autocomplete="off"></label>
          <label class="f-campo">NIT<input name="nit" value="${esc(p0.nit || "")}" autocomplete="off"></label></div>
          <label class="f-campo">Dirección<input name="direccion" value="${esc(p0.direccion || "")}" autocomplete="off"></label>
          <label class="f-campo">Notas<input name="notas" value="${esc(p0.notas || "")}" autocomplete="off" placeholder="Días de entrega, crédito…"></label>
        </details>
        <div class="f-campo"><span>Lo que le compran <small class="suave" data-n-pm></small></span>
          <div class="f-agregar"><span class="f-busca">${ico("search", 15)}<input data-pm-busca placeholder="Agregar material: escriba para buscar" autocomplete="off" aria-label="Agregar material"></span><div class="f-res" data-pm-res hidden></div></div>
          <div class="f-mats pm-lista" data-pm-filas></div>
        </div>`,
      alAbrir: (f, m) => {
        const caja = f.querySelector("[data-pm-filas]"), res = f.querySelector("[data-pm-res]"), busca = f.querySelector("[data-pm-busca]");
        const pintar = () => {
          f.querySelector("[data-n-pm]").textContent = filas.length ? `· ${filas.length}` : "";
          caja.innerHTML = filas.length ? filas.map((r, j) => { const otro = otroPrincipal(r.material.id); return `<div class="f-mat pm"><span><b>${esc(r.material.descripcion)}</b><small>${esc(r.material.codigo)}${!r.principal && otro ? " · principal: " + esc(provNombre(otro.proveedor_id)) : ""}</small></span>
            ${verCosto ? `<label class="f-cant pm-precio"><span class="sr">Precio de ${esc(r.material.descripcion)}</span><span class="f-monto"><span>Q</span><input inputmode="decimal" value="${esc(montoTxt(r.precio))}" placeholder="0.00" data-pm-precio="${j}" autocomplete="off"></span></label>` : ""}
            <button class="chip-b ${r.principal ? "on" : ""}" type="button" aria-pressed="${r.principal}" data-pm-princ="${j}">${r.principal ? ico("check", 13) : ""}Principal</button>
            <button class="s-ib" type="button" aria-label="Quitar ${esc(r.material.descripcion)}" data-pm-quitar="${j}">${ico("x", 14)}</button></div>`; }).join("") : `<p class="suave" style="padding:12px 14px">Busque arriba los materiales que le compran.</p>`;
        };
        pintar();
        f.addEventListener("input", ev => {
          if (ev.target.matches("[data-pm-precio]")) { try { filas[Number(ev.target.dataset.pmPrecio)].precio = numero(ev.target.value); } catch (er) {} }
          if (ev.target === busca) {
            const q = normal(busca.value);
            if (!q) { res.hidden = true; return; }
            const ya = new Set(filas.map(r => r.material.id));
            const l = c.materiales.filter(x => !ya.has(x.id) && normal(x.descripcion + " " + x.codigo).includes(q)).slice(0, 8);
            res.hidden = false;
            res.innerHTML = l.length ? l.map(x => `<button type="button" data-pm-add="${x.id}"><b>${esc(x.descripcion)}</b><small>${esc(x.codigo)}${otroPrincipal(x.id) ? " · ya lo vende " + esc(provNombre(otroPrincipal(x.id).proveedor_id)) : ""}</small></button>`).join("") : `<p class="suave">No hay más materiales con «${esc(busca.value)}».</p>`;
          }
        });
        f.addEventListener("change", ev => { if (ev.target.matches("[data-pm-precio]")) { try { ev.target.value = montoTxt(numero(ev.target.value)); } catch (er) {} } });
        m.addEventListener("click", ev => {
          const ad = ev.target.closest("[data-pm-add]"); if (ad) { const id = Number(ad.dataset.pmAdd); filas.unshift({ material: porMat[id], precio: null, principal: !otroPrincipal(id) }); busca.value = ""; res.hidden = true; pintar(); busca.focus(); }
          const pr = ev.target.closest("[data-pm-princ]"); if (pr) { const r = filas[Number(pr.dataset.pmPrinc)]; r.principal = !r.principal; pintar(); }
          const qq = ev.target.closest("[data-pm-quitar]"); if (qq) { filas.splice(Number(qq.dataset.pmQuitar), 1); pintar(); }
        });
      },
      alGuardar: async f => {
        const datos = { id: prov ? prov.id : null, nombre: f.nombre.value, contacto: f.contacto.value, telefono: f.telefono.value, correo: f.correo.value, nit: f.nit.value, direccion: f.direccion.value, notas: f.notas.value };
        await D.guardarProveedor(datos, filas.map(r => ({ material_id: r.material.id, precio: r.precio, principal: r.principal })));
        cerrarCapas(); aviso(prov ? "Proveedor guardado." : "Proveedor agregado."); await refrescar();
      }
    });
  }

  async function editarMaterial(mat, c) {
    const fichaAct = mat ? (await D.fichas().catch(() => ({})))[mat.id] || null : null;
    let fichaNueva = null, fichaQuitar = false;
    const p = sesion.perfil, verCosto = D.puede(p, "verCosto"), verAum = D.puede(p, "verAumento");
    const nuevo = !mat;
    const m0 = mat || { codigo: D.siguienteCodigo(c.materiales, "MAT"), descripcion: "", unidad: "", costo: null, precio: null, venta_modo: null, venta_pct: null };
    modal({
      titulo: nuevo ? "Material nuevo" : "Editar material",
      cuerpo: `
        <div class="f-fila"><label class="f-campo">Código<input name="codigo" value="${esc(m0.codigo)}" autocomplete="off"></label>
        <label class="f-campo">Unidad<input name="unidad" list="unidades" value="${esc(m0.unidad || "")}" placeholder="unidad, metro, juego…" autocomplete="off"></label></div>
        <datalist id="unidades">${UNIDADES.map(u => `<option value="${u}">`).join("")}</datalist>
        <label class="f-campo">Descripción<input name="descripcion" value="${esc(m0.descripcion)}" autocomplete="off"></label>
        ${verCosto ? campoMonto("costo", "Costo (precio de compra)", m0.costo, "Lo que le cuesta a EMTECSA.") : ""}
        ${verAum ? `<div class="f-campo"><span>Precio al cliente</span><div class="seg ancho" role="group" aria-label="Forma del precio al cliente">${MODOS_VENTA.map(([k2, n]) => `<button type="button" data-vm="${k2}" aria-pressed="${(m0.venta_modo || "") === k2}">${n}</button>`).join("")}</div></div>
        <div data-vm-precio ${m0.venta_modo === "precio" ? "" : "hidden"}>${campoMonto("precio", "Precio al cliente por unidad", m0.precio)}</div>
        <label class="f-campo" data-vm-pct ${m0.venta_modo === "pct" ? "" : "hidden"}>Aumento sobre el costo<span class="f-pct"><input name="venta_pct" inputmode="decimal" value="${esc(m0.venta_pct ?? "")}" placeholder="50" autocomplete="off"><span>%</span></span></label>
        <div class="vm-prev" data-vm-prev></div>` : ""}
        <div class="f-campo ficha-m"><span>Ficha técnica <small class="suave">opcional · para el expediente</small></span><div class="ficha-fila"><span data-ficha-est>${fichaAct ? `${ico("file", 15)}<b>${esc(fichaAct.nombre)}</b><small>${esc(D.TIPOS_DOC[fichaAct.tipo] || "")} · ${esc(D.tamTxt(fichaAct.tam))}</small>` : `<small>Sin ficha</small>`}</span><span class="acc">${fichaAct ? `<button class="s-ib" type="button" aria-label="Ver la ficha" data-ficha-ver>${ico("eye", 15)}</button><button class="s-ib" type="button" aria-label="Quitar la ficha" data-ficha-q>${ico("trash", 15)}</button>` : ""}<label class="s-btn suave-b chico">${ico("plus", 14)}${fichaAct ? "Cambiar" : "Subir"}<input type="file" accept="application/pdf,image/jpeg,image/png" hidden data-ficha-arch></label></span></div></div>`,
      alAbrir: (f, mm) => {
        formatoAlSalir(f);
        const est = f.querySelector("[data-ficha-est]");
        f.querySelector("[data-ficha-arch]").addEventListener("change", ev => { fichaNueva = ev.target.files[0] || null; fichaQuitar = false; if (fichaNueva) est.innerHTML = `${ico("file", 15)}<b>${esc(fichaNueva.name)}</b><small>Se sube al guardar</small>`; });
        mm.addEventListener("click", async ev => {
          if (ev.target.closest("[data-ficha-q]")) { fichaQuitar = true; fichaNueva = null; est.innerHTML = `<small>Se quita al guardar</small>`; }
          if (ev.target.closest("[data-ficha-ver]") && fichaAct) { const b = await D.archivo(fichaAct.ref); if (!b) { aviso("No se encontró el archivo.", "mal"); return; } const u = URL.createObjectURL(b); const w = window.open(u, "_blank"); if (w) w.opener = null; setTimeout(() => URL.revokeObjectURL(u), 60000); }
        });
        if (!verAum) return;
        let modo = m0.venta_modo || "";
        const prev = () => {
          let costo = null, precio = null, pct = null;
          try { costo = verCosto ? numero(f.costo.value) : m0.costo; } catch (er) {}
          try { precio = numero(f.precio.value); } catch (er) {}
          try { pct = numero(f.venta_pct.value); } catch (er) {}
          const z = D.precioPieza({ id: 0, costo, venta_modo: modo || null, precio, venta_pct: pct }, null, null);
          f.querySelector("[data-vm-prev]").innerHTML = !modo ? `<span class="suave">Usa el aumento que se ponga en cada cotización.</span>` : `<div><span>Costo</span><b>${costo == null ? "Sin costo" : esc(Q(costo))}</b></div><div><span>Al cliente</span><b>${z.precio == null ? "—" : esc(Q(z.precio))}</b></div><div class="g"><span>Gana por pieza</span><b class="${z.ganancia != null && z.ganancia < 0 ? "falta" : ""}">${z.ganancia == null ? "—" : esc(Q(z.ganancia)) + (costo ? ` · ${cant(Math.round(z.ganancia / costo * 1000) / 10)} %` : "")}</b></div>`;
        };
        f.addEventListener("input", prev);
        mm.addEventListener("click", ev => { const b = ev.target.closest("[data-vm]"); if (!b) return; modo = b.dataset.vm; f.querySelectorAll("[data-vm]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); f.querySelector("[data-vm-precio]").hidden = modo !== "precio"; f.querySelector("[data-vm-pct]").hidden = modo !== "pct"; (modo === "precio" ? f.precio : modo === "pct" ? f.venta_pct : null)?.focus(); prev(); });
        f._modo = () => modo;
        prev();
      },
      alGuardar: async (f) => {
        const datos = { id: mat ? mat.id : null, codigo: f.codigo.value, descripcion: f.descripcion.value, unidad: f.unidad.value, costo: verCosto ? numero(f.costo.value) : (mat ? mat.costo : null), venta_modo: mat ? mat.venta_modo : null, precio: mat ? mat.precio : null, venta_pct: mat ? mat.venta_pct : null };
        if (verAum) { datos.venta_modo = f._modo() || null; datos.precio = numero(f.precio.value); datos.venta_pct = numero(f.venta_pct.value); }
        const idM = await D.guardarMaterial(datos);
        if (fichaNueva) { aviso("Subiendo la ficha técnica…"); await D.ponerFicha(idM, fichaNueva); }
        else if (fichaQuitar) await D.ponerFicha(idM, null);
        cerrarCapas(); aviso(nuevo ? "Material agregado." : "Material guardado."); await refrescar();
      }
    });
  }

  function editarEstructura(est, c, copia) {
    const p = sesion.perfil, verCosto = D.puede(p, "verCosto");
    const nuevo = !est || copia;
    const base = est || { codigo: "", nombre: "", voltaje_kv: 13.2, clase: "linea", fases: 1, conductor: null, kva: null, mano_obra: null, materiales: [] };
    const e0 = { ...base, codigo: nuevo ? D.siguienteCodigo(c.estructuras, "EST") : base.codigo, nombre: copia ? base.nombre + " (copia)" : base.nombre };
    let filas = base.materiales.map(r => ({ material: r.material, cantidad: r.cantidad }));
    const kvs = [...new Set([13.2, 34.5, ...c.estructuras.map(x => Number(x.voltaje_kv))])].sort((a, b) => a - b);
    modal({
      titulo: copia ? "Copia de estructura" : nuevo ? "Estructura nueva" : "Editar estructura",
      extra: !nuevo ? `<button class="s-btn suave-b" type="button" data-duplicar>${ico("layers", 15)}Duplicar</button>` : "",
      cuerpo: `
        <div class="f-fila"><label class="f-campo">Código<input name="codigo" value="${esc(e0.codigo)}" autocomplete="off"></label>
        <label class="f-campo">Voltaje<select name="kv">${kvs.map(k => `<option value="${k}" ${Number(e0.voltaje_kv) === k ? "selected" : ""}>${cant(k)} kV</option>`).join("")}</select></label></div>
        <label class="f-campo">Nombre<input name="nombre" value="${esc(e0.nombre)}" autocomplete="off"></label>
        <div class="f-fila tres"><label class="f-campo">Tipo<select name="clase"><option value="linea" ${e0.clase === "linea" ? "selected" : ""}>Estructura de línea</option><option value="transformador" ${e0.clase === "transformador" ? "selected" : ""}>Transformador</option></select></label>
        <label class="f-campo">Fases<select name="fases"><option value="1" ${Number(e0.fases) === 1 ? "selected" : ""}>Monofásica</option><option value="3" ${Number(e0.fases) === 3 ? "selected" : ""}>Trifásica</option></select></label>
        <label class="f-campo" data-kva ${e0.clase === "transformador" ? "" : "hidden"}>kVA<input name="kva" inputmode="decimal" value="${e0.kva == null ? "" : esc(e0.kva)}" autocomplete="off"></label></div>
        ${campoMonto("mano", "Mano de obra", e0.mano_obra, "Por cada una que se instala.")}
        <div class="f-sub"><h3>Materiales</h3><span class="suave" data-n></span></div>
        <div class="f-mats" data-filas></div>
        <div class="f-agregar"><label class="f-campo"><span class="sr">Agregar material</span><span class="f-busca">${ico("search", 15)}<input data-busca-mat placeholder="Agregar material: escriba para buscar" autocomplete="off"></span></label><div class="f-res" data-res-mat hidden></div></div>
        <div class="f-totales" data-totales></div>`,
      alAbrir: (f, m) => {
        formatoAlSalir(f);
        const cajaF = $("[data-filas]", f), res = $("[data-res-mat]", f), busca = $("[data-busca-mat]", f);
        const totales = () => {
          let costo = 0, faltC = 0;
          filas.forEach(r => { if (r.material.costo == null) faltC++; else costo += r.material.costo * (Number(r.cantidad) || 0); });
          let mo = null; try { mo = numero(f.mano.value); } catch (e) {}
          $("[data-n]", f).textContent = `${filas.length} ${filas.length === 1 ? "material" : "materiales"}`;
          $("[data-totales]", f).innerHTML = `
            <div><span>Costo de materiales</span><b>${faltC ? `${faltC} sin costo` : verCosto ? esc(Q(costo)) : "Completo"}</b></div>
            <div><span>Mano de obra</span><b>${mo == null ? "Sin poner" : esc(Q(mo))}</b></div>
            ${verCosto ? `<div class="g"><span>Costo y mano de obra</span><b>${faltC || mo == null ? "Falta completar" : esc(Q(costo + mo))}</b></div>` : ""}
            <p class="suave" style="font-size:12.5px;padding:8px 0 4px">El precio para el cliente se arma en cada cotización con el aumento.</p>`;
        };
        const pintarFilas = () => {
          cajaF.innerHTML = filas.length ? filas.map((r, i) => `<div class="f-mat"><span><b>${esc(r.material.descripcion)}</b><small>${esc(r.material.codigo)}${r.material.costo == null ? " · sin costo" : verCosto ? " · " + esc(Q(r.material.costo)) : ""}</small></span>
            <label class="f-cant"><span class="sr">Cantidad de ${esc(r.material.descripcion)}</span><input inputmode="decimal" value="${esc(cant(r.cantidad))}" data-cant="${i}" autocomplete="off"></label>
            <button class="s-ib" type="button" aria-label="Quitar ${esc(r.material.descripcion)}" data-quitar="${i}">${ico("x", 15)}</button></div>`).join("") : `<p class="suave" style="padding:12px 4px">Todavía no tiene materiales. Búsquelos abajo.</p>`;
          totales();
        };
        pintarFilas();
        f.addEventListener("input", e => {
          if (e.target.matches("[data-cant]")) { const n = Number(String(e.target.value).replace(/,/g, "")); filas[Number(e.target.dataset.cant)].cantidad = isFinite(n) ? n : 0; totales(); }
          if (e.target.name === "mano") totales();
          if (e.target.name === "clase") $("[data-kva]", f).hidden = e.target.value !== "transformador";
        });
        f.addEventListener("change", e => { if (e.target.name === "clase") $("[data-kva]", f).hidden = e.target.value !== "transformador"; });
        const buscar = () => {
          const q = busca.value.trim().toLowerCase();
          if (!q) { res.hidden = true; return; }
          const ya = new Set(filas.map(r => r.material.id));
          const l = c.materiales.filter(x => !ya.has(x.id) && (x.descripcion + " " + x.codigo).toLowerCase().includes(q)).slice(0, 8);
          res.hidden = false;
          res.innerHTML = l.length ? l.map(x => `<button type="button" data-add="${x.id}"><b>${esc(x.descripcion)}</b><small>${esc(x.codigo)}${x.costo == null ? " · sin costo" : verCosto ? " · " + esc(Q(x.costo)) : ""}</small></button>`).join("") : `<p class="suave">No hay más materiales con «${esc(busca.value)}». Agréguelo primero en Materiales.</p>`;
        };
        busca.addEventListener("input", buscar);
        busca.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("[data-add]", res)?.click(); } });
        m.addEventListener("click", e => {
          const a = e.target.closest("[data-add]");
          if (a) { filas.push({ material: c.materiales.find(x => x.id === Number(a.dataset.add)), cantidad: 1 }); busca.value = ""; res.hidden = true; pintarFilas(); const ult = $$("[data-cant]", f).pop(); ult?.focus(); ult?.select(); }
          const qq = e.target.closest("[data-quitar]");
          if (qq) { filas.splice(Number(qq.dataset.quitar), 1); pintarFilas(); }
          if (e.target.closest("[data-duplicar]")) editarEstructura({ ...est, materiales: filas.map(r => ({ ...r })) }, c, true);
        });
      },
      alGuardar: async (f) => {
        const kva = f.clase.value === "transformador" ? numero(f.kva.value) : null;
        const datos = { id: nuevo ? null : est.id, codigo: f.codigo.value, nombre: f.nombre.value, voltaje_kv: Number(f.kv.value), clase: f.clase.value, fases: Number(f.fases.value), conductor: e0.conductor, kva, mano_obra: numero(f.mano.value), materiales: filas.map(r => ({ material_id: r.material.id, cantidad: Number(r.cantidad) })) };
        const id = await D.guardarEstructura(datos);
        abiertos.add(id);
        cerrarCapas(); aviso(nuevo ? "Estructura agregada." : "Estructura guardada."); await refrescar();
      }
    });
  }

  function vPendiente(v, s) {
    const sec = SECCIONES.find(x => x.id === s);
    const [d, lista] = PENDIENTE[s];
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">${sec.n}</h1><p>${esc(d)}</p></div></div>
        <div class="vacio"><span class="icono ${sec.c}">${ico(sec.i, 24)}</span><h2>Esta parte se construye después</h2><p>Ya tiene su lugar en el sistema. Se diseña con usted, pantalla por pantalla, y va a tener:</p>
          <ul>${lista.map(x => `<li>${ico("check", 18)}<span>${esc(x)}</span></li>`).join("")}</ul>
          <a class="s-btn suave-b" href="#/hoy">Regresar a Hoy</a></div>
      </div>`;
  }

  function cerrarCapas() { $$(".pop, .velo, .hoja-m, .modal").forEach(x => x.remove()); }

  function abrirCuenta(boton) {
    cerrarCapas();
    const r = boton.getBoundingClientRect();
    const p = sesion.perfil;
    const pop = document.createElement("div");
    pop.className = "pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Su cuenta");
    pop.style.top = (r.bottom + 10) + "px"; pop.style.right = Math.max(12, innerWidth - r.right) + "px";
    const modo = (() => { try { return localStorage.getItem("emtecsa.sistema.modo") || p.modo; } catch (e) { return p.modo; } })();
    pop.innerHTML = `
      <div class="pop-cab"><span class="av" style="cursor:default">${avatar(p)}</span><span><b>${esc(p.nombre)}</b><small>${esc(D.ROLES[p.rol] || p.rol)} · ${esc(sesion.correo)}</small></span></div>
      <div class="pop-sec"><small class="suave" style="font-size:12.5px;font-weight:600">Modo</small><div class="seg" role="group" aria-label="Modo de la pantalla">${[["oscuro", "Oscuro"], ["claro", "Claro"], ["auto", "Automático"]].map(([k, n]) => `<button type="button" data-modo="${k}" aria-pressed="${modo === k}">${n}</button>`).join("")}</div></div>
      <div style="padding:6px 0 0"><a class="pop-item" href="#/perfil" data-a-empresa>${ico("pen", 18)}Mi perfil</a>${p.dev || (D.nube && p.rol === "gerencia") ? `<a class="pop-item" href="#/errores" data-a-empresa>${ico("alerta", 18)}Errores del sistema</a>` : ""}${p.probando ? `<button class="pop-item" type="button" data-volver-rol>${ico("shield", 18)}Volver a gerencia</button>` : ""}${p.rol === "gerencia" ? `<a class="pop-item" href="#/equipo" data-a-empresa>${ico("users", 18)}Equipo y permisos</a>` : ""}${D.puede(p, "editarEmpresa") ? `<a class="pop-item" href="#/empresa" data-a-empresa>${ico("building", 18)}Datos de la empresa</a>` : ""}${D.nube ? "" : `<button class="pop-item" type="button" data-borrar-prueba>${ico("trash", 18)}Borrar los datos de prueba</button>`}${D.appInstalada && !D.appInstalada() ? `<button class="pop-item" type="button" data-instalar>${ico("phone", 18)}Instalar en el teléfono</button>` : ""}<button class="pop-item peligro" type="button" data-salir>${ico("salir", 18)}Cerrar sesión</button></div>`;
    document.body.appendChild(pop);
    const velo = document.createElement("div"); velo.className = "velo"; velo.style.background = "transparent"; velo.addEventListener("click", cerrarCapas);
    document.body.insertBefore(velo, pop);
    pop.addEventListener("click", async e => {
      if (e.target.closest("[data-a-empresa]")) setTimeout(cerrarCapas, 0);
      if (e.target.closest("[data-instalar]")) { cerrarCapas(); D.pedirInstalar(); return; }
      if (e.target.closest("[data-volver-rol]")) { cerrarCapas(); window.EMT_EQUIPO.verComo(p.rolReal || "gerencia"); return; }
      if (e.target.closest("[data-borrar-prueba]")) {
        modal({ titulo: "¿Borrar los datos de prueba?", guardarTxt: "Borrar", cuerpo: `<p class="suave" style="font-size:15px">Se borran de esta computadora los costos, clientes, cotizaciones y datos de la empresa que escribió en el modo de prueba. El catálogo vuelve a quedar como en el Excel.</p>`,
          alGuardar: async () => { ["emtecsa.sistema.catalogo", "emtecsa.sistema.clientes", "emtecsa.sistema.cotizaciones", "emtecsa.sistema.obras", "emtecsa.sistema.cobros", "emtecsa.sistema.proveedores", "emtecsa.sistema.checklist", "emtecsa.sistema.planos", "emtecsa.sistema.docs", "emtecsa.sistema.enlaces", "emtecsa.sistema.enlaces-atendidos", "emtecsa.sistema.conteo", "emtecsa.sistema.energuate", "emtecsa.sistema.equipo", "emtecsa.sistema.costos", "emtecsa.sistema.seguimiento"].forEach(x => { try { localStorage.removeItem(x); } catch (er) {} }); guardiaAct = null; location.hash = "#/hoy"; location.reload(); } }).querySelector("[data-guardar]").classList.add("peligro-b");
        return;
      }
      const m = e.target.closest("[data-modo]");
      if (m) {
        $$("[data-modo]", pop).forEach(b => b.setAttribute("aria-pressed", String(b === m)));
        ponerModo(m.dataset.modo);
        try { await D.guardarModo(p, m.dataset.modo); } catch (err) { aviso(err.message, "mal"); }
      }
      if (e.target.closest("[data-salir]")) { await D.salir(); sesion = null; vistaActual = ""; removeEventListener("hashchange", ruta); cerrarCapas(); history.replaceState(null, "", location.pathname); pintarEntrada(); }
    });
    $("[data-modo][aria-pressed='true']", pop)?.focus();
  }

  function abrirMenu() {
    cerrarCapas();
    const velo = document.createElement("div"); velo.className = "velo"; velo.addEventListener("click", cerrarCapas);
    const h = document.createElement("div"); h.className = "hoja-m"; h.setAttribute("role", "dialog"); h.setAttribute("aria-label", "Menú");
    const mA = menuDe((location.hash.replace(/^#\/?/, "").split("/")[0]) || "hoy"), actual = mA ? mA.id : "";
    h.innerHTML = `<div class="tirador"></div>
      <label class="buscar-m"><span class="sr">Buscar en el catálogo</span><input type="search" placeholder="Buscar en el catálogo" data-buscar-m></label>
      ${menuVisible().map(s => `<a href="#/${s.ir || s.id}" ${s.id === actual ? 'aria-current="page"' : ""}><span class="ic icono ${s.c}">${ico(s.i, 17)}</span>${s.n}${document.querySelector(`.barra [data-sec="${s.id}"] .insignia`) ? `<span class="insignia-m">${document.querySelector(`.barra [data-sec="${s.id}"] .insignia`).textContent}</span>` : ""}</a>`).join("")}`;
    document.body.append(velo, h);
    h.addEventListener("click", e => { if (e.target.closest("a")) setTimeout(cerrarCapas, 0); });
    $("[data-buscar-m]", h).addEventListener("keydown", e => { if (e.key === "Enter") { busqueda = e.target.value.trim(); mantener = true; ir("catalogo"); } });
    $("a[aria-current]", h)?.focus();
  }

  function clicApp(e) {
    if (e.target.closest("[data-cuenta]")) abrirCuenta(e.target.closest("[data-cuenta]"));
    if (e.target.closest("[data-menu]")) abrirMenu();
    if (e.target.closest("[data-reintentar]")) ruta();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarCapas(); });

  async function arrancar() {
    app.innerHTML = `<div class="cargando">Cargando…</div>`;
    try { sesion = await D.sesion(); } catch (err) { aviso(err.message, "mal"); sesion = null; }
    D.alCambiarSesion(ev => { if (ev === "SIGNED_OUT") { sesion = null; pintarEntrada(); } });
    if (sesion) arrancarApp(); else pintarEntrada();
  }
  window.EMT_APP = { marcarInsignia, pintarAvatar, iniciales, $, $$, esc, ico, Q, cant, aviso, modal, cerrarCapas, numero, montoTxt, campoMonto, formatoAlSalir, ir, guardia, quieto, sostener, filtrar, normal, chipsASelect, sesion: () => sesion, recargarHoy: () => { const v = document.getElementById("vista"); return v && /^#\/hoy$|^#?\/?$/.test(location.hash) ? quieto(() => vHoy(v)) : null; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar); else arrancar();
})();
