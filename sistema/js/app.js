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
  const Q = n => (Number(n) < 0 ? "-" : "") + "Q\u00A0" + Math.abs(Number(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cant = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const LOGO = '<img class="logo-o" src="../logo/emtecsa-logo-blanco.svg" alt="EMTECSA" width="137" height="22"><img class="logo-c" src="../logo/emtecsa-logo.svg" alt="EMTECSA" width="137" height="22">';

  const SECCIONES = [
    { id: "hoy", n: "Hoy", i: "home", c: "marino" },
    { id: "clientes", n: "Clientes", i: "building", c: "azul" },
    { id: "cotizaciones", n: "Cotizaciones", i: "file", c: "laton" },
    { id: "obras", n: "Obras", i: "hammer", c: "mezcla" },
    { id: "catalogo", n: "Catálogo", i: "box", c: "gris" },
    { id: "cobros", n: "Cobros", i: "wallet", c: "claro" },
    { id: "tienda", n: "Tienda", i: "cart", c: "laton" }
  ];
  const MENU = [
    { id: "hoy", n: "Hoy", i: "home", c: "marino" },
    { id: "ventas", n: "Ventas", i: "file", c: "laton", ir: "cotizaciones", grupo: ["cotizaciones", "clientes", "tienda"] },
    { id: "obras", n: "Obras", i: "hammer", c: "mezcla" },
    { id: "dinero", n: "Finanzas", i: "wallet", c: "claro", ir: "cobros", grupo: ["cobros", "finanzas", "personal"] },
    { id: "catalogo", n: "Catálogo", i: "box", c: "gris" }
  ];
  const PESTANAS_GRUPO = { ventas: [["cotizaciones", "Cotizaciones"], ["clientes", "Clientes"], ["tienda", "Tienda", "verTienda"]], dinero: [["cobros", "Cobros", "verCobros"], ["finanzas", "Empresa", "verFinanzas"], ["personal", "Personal", "finanzasPersonales"]] };
  const menuDe = s => MENU.find(m => m.id === s || (m.grupo || []).includes(s));
  const menuVisible = () => MENU.filter(m => m.id !== "dinero" || !sesion || D.puede(sesion.perfil, "verCobros") || D.puede(sesion.perfil, "verCosto") || D.puede(sesion.perfil, "verFinanzas"));
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
  let pulsarLuego = null;
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

  function pintarBarra() {
    const m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    const c = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (c && !/var\(/.test(c)) m.content = c;
  }
  if (window.matchMedia) { try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pintarBarra); } catch (e) {} }
  function aplicarModo() {
    let m = null; try { m = localStorage.getItem("emtecsa.sistema.modo"); } catch (e) {}
    if (m === "claro" || m === "oscuro") document.documentElement.dataset.modo = m; else delete document.documentElement.dataset.modo;
    pintarBarra();
  }
  function ponerModo(m) {
    try { localStorage.setItem("emtecsa.sistema.modo", m); } catch (e) {}
    aplicarModo();
  }

  function ponerTema(t) {
    const ok = t && t !== "emtecsa" && (window.EMT_TEMAS || []).some(x => x.id === t);
    if (ok) document.documentElement.dataset.tema = t; else delete document.documentElement.dataset.tema;
    try { localStorage.setItem("emtecsa.sistema.tema", ok ? t : "emtecsa"); localStorage.removeItem("emtecsa.sistema.tema-claro"); } catch (e) {}
    aplicarModo();
  }
  const temaActual = () => document.documentElement.dataset.tema || "emtecsa";
  const FAMILIAS_TEMA = [["clasicos", "Clásicos"], ["pastel", "Pastel"], ["joyas", "Joyas"], ["vivos", "Vivos"], ["naturales", "Naturales"]];
  const mitadTema = (cl, [f, c, b, a]) => `<span class="tm-m ${cl}" style="--tf:${f};--tc:${c};--tb:${b};--ta:${a}"><i class="tm-b"></i><i class="tm-c"><i></i><i></i></i><i class="tm-p"></i></span>`;
  const muestraTema = x => `<span class="tm" aria-hidden="true">${mitadTema("tm-l", x.l)}${mitadTema("tm-o", x.o)}</span>`;

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
    ponerTema(sesion.perfil.tema || "emtecsa");
    D.temasOcultos().then(o => { if (o.includes(temaActual())) ponerTema("emtecsa"); }).catch(() => {});
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
    const s = SECCIONES.find(x => x.id === sec) || sec === "empresa" || sec === "plano" || sec === "equipo" || sec === "perfil" || sec === "errores" || sec === "finanzas" || sec === "personal" ? sec : "hoy";
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
      else if (s === "finanzas" || s === "personal") await window.EMT_FINANZAS.vista(v, s === "personal" ? "personal" : "empresa");
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
    if (pulsarLuego) { const sel = pulsarLuego; pulsarLuego = null; const b = v.querySelector(sel); if (b) b.click(); }
    if (window.EMT_TIENDA) window.EMT_TIENDA.insignia();
    if (window.EMT_ENLACES) window.EMT_ENLACES.insignia();
    if (window.EMT_EQUIPO) window.EMT_EQUIPO.insignia();
    v.focus({ preventScroll: true });
    cerrarCapas();
  }

  async function vHoy(v) {
    if (D.nube) [D.catalogo(), D.clientes(), D.obras(), D.cotizaciones(), D.empresa(), D.puede(sesion.perfil, "verCobros") && D.resumenCobros(), D.puede(sesion.perfil, "verTienda") && D.pedidosTienda && D.pedidosTienda(), window.EMT_ENLACES && window.EMT_ENLACES.porAtender(), window.EMT_EQUIPO && window.EMT_EQUIPO.pendientes(), window.EMT_COSTOS && window.EMT_COSTOS.avisos(), window.EMT_SEGUIMIENTO && window.EMT_SEGUIMIENTO.avisos()].forEach(p => { if (p && p.catch) p.catch(() => {}); });
    const c = await D.catalogo();
    const sinPrecio = c.materiales.filter(m => m.activo !== false && m.costo == null).length;
    const sinMano = c.estructuras.filter(e => e.activo !== false && e.mano_obra == null).length;
    const nClientes = (await D.clientes()).length;
    const obrasL = await D.obras();
    const enCurso = obrasL.filter(x => x.estado === "en_curso" || x.estado === "programada"), pausadas = obrasL.filter(x => x.estado === "pausada").length;
    const mes = (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 7))(new Date());
    const delMes = (await D.cotizaciones()).filter(x => String(x.fecha).slice(0, 7) === mes && x.estado !== "rechazada");
    const cotizado = delMes.reduce((a, x) => a + Number(x.total || 0), 0), aprobadas = delMes.filter(x => x.estado === "aprobada").length;
    const verC = D.puede(sesion.perfil, "verCobros");
    const rc = verC ? await D.resumenCobros() : null;
    const avisosC = rc ? [...rc.pendientes.filter(x => x.venc).map(x => ({ c: x.venc === "vencido" ? "ambar" : "azul", i: "wallet", t: `${x.venc === "vencido" ? "Cobro vencido" : "Cobrar pronto"}: ${x.cliente ? x.cliente.nombre : ""}`, d: `${x.obra ? x.obra.numero + " · " : ""}${x.descripcion} · ${Q(x.saldo)}`, chip: x.venc === "vencido" ? "Vencido" : "Esta semana", h: x.obra ? `#/obras/${x.obra.id}/cobros` : "#/cobros" })),
      ...rc.fianzasPorVencer.map(f => { const [c2, t2] = window.EMT_COBROS.estadoFianza(f); return { c: c2 === "verde" ? "azul" : c2, i: "shield", t: `Fianza de ${D.TIPOS_FIANZA[f.tipo].toLowerCase()}${f.obra_id && rc.obras[f.obra_id] ? " · " + rc.obras[f.obra_id].numero : ""}`, d: `${f.aseguradora || "Sin aseguradora"} · ${Q(f.monto)}`, chip: t2, h: "#/cobros/fianzas" }; })] : [];
    const tiendaL = D.puede(sesion.perfil, "verTienda") && D.pedidosTienda ? await D.pedidosTienda().catch(() => []) : [];
    const enlL = window.EMT_ENLACES ? await window.EMT_ENLACES.porAtender() : [];
    const pagarL = D.porPagarPronto ? await D.porPagarPronto().catch(() => []) : [];
    const fTxt = f => { const [y, m, d] = String(f).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };
    avisosC.unshift(...pagarL.map(c => ({ c: c.vencido ? "ambar" : "laton", i: "clock", t: `Pagar: ${c.nombre}`, d: `${c.ambito === "personal" ? "Personal · " : ""}${c.monto != null ? Q(c.monto) : "monto variable"} · ${c.vencido ? "venció el" : "vence el"} ${fTxt(c.proximo)}`, chip: c.vencido ? "Vencido" : "Pronto", accion: "Pagar", h: c.ambito === "personal" ? "#/personal" : "#/finanzas" })));
    const presL = D.presupuestosAlLimite ? await D.presupuestosAlLimite().catch(() => []) : [];
    avisosC.push(...presL.map(x => ({ c: x.pasa ? "ambar" : "laton", i: "chart", t: `Presupuesto: ${x.nombre}`, d: `${x.ambito === "personal" ? "Personal · " : ""}lleva ${Q(x.gastado)} de ${Q(x.monto)} este mes`, chip: x.pasa ? "Se pasó" : "Casi", accion: "Ver", h: x.ambito === "personal" ? "#/personal" : "#/finanzas" })));
    const comprarL = tiendaL.filter(x => x.porComprar).map(x => ({ x, l: (x.items || []).filter((it, i) => !x.porComprar[i]) })).filter(y => y.l.length);
    avisosC.push(...comprarL.map(({ x, l }) => ({ c: "laton", i: "cart", t: `Comprar: ${l.length === 1 ? `${l[0].cant} × ${l[0].nombre}` : `${l.length} cosas vendidas`}`, d: `Tienda · ${x.id}${x.cliente ? " · " + x.cliente.nombre : ""}`, accion: "Comprar", h: `#/tienda/${encodeURIComponent(x.id)}` })));
    avisosC.unshift(...tiendaL.filter(x => x.estado === "comprobante-recibido" || (x.estado === "cotizacion" && !x.cotizacion_id)).map(x => ({ c: x.estado === "cotizacion" ? "azul" : "laton", i: x.estado === "cotizacion" ? "send" : "file", t: `${x.estado === "cotizacion" ? "Cotizar" : "Revisar comprobante"}: ${x.cliente ? x.cliente.nombre : ""}`, d: `Tienda · ${x.id}${x.total ? " · " + Q(x.total) : ""}`, chip: x.estado === "cotizacion" ? "A cotizar" : "Por revisar", h: `#/tienda/${encodeURIComponent(x.id)}` })));
    avisosC.unshift(...enlL.filter(x => x.tipo === "aprobo" || x.tipo === "mensaje" || x.tipo === "datos" || x.tipo === "estimacion"));
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
    const pp = sesion.perfil;
    const accesos = [
      D.puede(pp, "registrarPago") && verC ? { t: "Registrar pago", i: "wallet", c: "claro", h: "#/cobros", p: "[data-reg-pago]" } : null,
      D.puede(pp, "editarCliente") ? { t: "Agregar cliente", i: "building", c: "azul", h: "#/clientes", p: "[data-nuevo-cli]" } : null,
      { t: "Obras", i: "hammer", c: "mezcla", h: "#/obras" },
      { t: "Catálogo", i: "box", c: "gris", h: "#/catalogo" },
      D.puede(pp, "verTienda") ? { t: "Tienda", i: "cart", c: "laton", h: "#/tienda" } : null
    ].filter(Boolean).slice(0, 4);
    v.innerHTML = `
      <div class="cuerpo hoy">
        <section class="hoy-cab">
          <div><span class="eti">${esc(fechaLarga())}</span><h1 class="t">${saludo()}, ${esc(sesion.perfil.nombre.split(" ")[0])}.</h1></div>
          <a class="s-btn lleno" href="#/cotizaciones">${ico("plus", 16)}Nueva cotización</a>
        </section>
        ${accesos.length ? `<nav class="hoy-acc" aria-label="Accesos rápidos">${accesos.map(a => `<a class="hoy-a" href="${a.h}"${a.p ? ` data-pulsar="${a.p}"` : ""}><span class="icono ${a.c}">${ico(a.i, 16)}</span><span>${a.t}</span></a>`).join("")}</nav>` : ""}
        <div class="hoy-cols">
          <div class="hoy-izq">
            <section class="hoy-toca">
              <div class="sub"><h2>Lo que toca hoy</h2>${avisosC.length ? `<span class="suave">${avisosC.length}</span>` : ""}</div>
              ${avisosC.length ? `<div class="lista toca">${primeros.map(toca).join("")}</div>${resto.length ? `<details class="mas-toca"><summary>Ver ${resto.length} más</summary><div class="lista toca">${resto.map(toca).join("")}</div></details>` : ""}`
                : `<div class="toca-vacio">${ico("check", 18)}<span>Todo al día.</span></div>`}
            </section>
            ${pend.length || esperando.length ? `<section class="hoy-pls">
              ${pend.length ? pl("listo", "Para dejarlo listo", `${pend.length} ${pend.length === 1 ? "paso" : "pasos"}`, `<div class="lista sin-chip">${pend.map(fila).join("")}</div>`) : ""}
              ${esperando.length ? pl("espera", "Esperando a otros", `${esperando.length}`, `<div class="lista sin-chip">${esperando.map(x => x.h ? fila(x) : `<div class="fila" style="cursor:default"><span class="icono gris">${ico(x.i, 18)}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span></span></div>`).join("")}</div>`) : ""}
            </section>` : ""}
          </div>
          <div class="hoy-der">
            <section class="hoy-mes">
              <div class="sub"><h2>Este mes</h2></div>
              <div class="widgets hoy-w">
                <a class="w" href="#/cotizaciones"><span class="w-cab"><span class="icono laton">${ico("file", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Cotizado</span><b>${Q(cotizado)}</b><small>${delMes.length} ${delMes.length === 1 ? "cotización" : "cotizaciones"} · ${aprobadas} ${aprobadas === 1 ? "aprobada" : "aprobadas"}</small></a>
                <a class="w" href="#/obras"><span class="w-cab"><span class="icono azul">${ico("hammer", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Obras en curso</span><b>${enCurso.length}</b><small>${enCurso.filter(x => x.estado === "programada").length} por empezar${pausadas ? ` · ${pausadas} en pausa` : ""}</small></a>
                <a class="w" href="#/catalogo/materiales"><span class="w-cab"><span class="icono mezcla">${ico("box", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Materiales</span><b>${c.materiales.length}</b><small>${sinPrecio ? `${sinPrecio} sin costo` : "Todos con costo"}</small></a>
              </div>
            </section>
            <section class="hoy-obras">
              <div class="sub"><h2>Obras en curso</h2>${enCurso.length ? `<a href="#/obras">Ver todas</a>` : ""}</div>
              ${enCurso.length ? `<div class="lista">${enCurso.slice().sort((a, b) => (a.estado === "en_curso" ? 0 : 1) - (b.estado === "en_curso" ? 0 : 1) || b.avance - a.avance).slice(0, 4).map(o => `<a class="fila obra-av" href="#/obras/${o.id}"><span class="icono mezcla">${ico("hammer", 18)}</span><span><b>${esc(o.cliente ? o.cliente.nombre : "Cliente no encontrado")}</b><small>${esc(o.numero)}${o.etapa_actual ? " · ahora: " + esc(o.etapa_actual) : o.estado === "programada" ? " · por empezar" : ""}</small><i class="mini-av"><span style="transform:scaleX(${o.avance / 100})"></span></i></span><span class="der"><b class="e-cifra">${o.avance} %</b></span></a>`).join("")}</div>`
                : `<div class="hoy-nada">${ico("hammer", 18)}<span>No hay obras en curso.</span></div>`}
            </section>
          </div>
        </div>
      </div>`;
    v.onclick = e => { const a = e.target.closest("[data-pulsar]"); if (a) pulsarLuego = a.dataset.pulsar; };
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
    const enTabla = (pestana === "estructuras" && tablaMO) || (pestana === "materiales" && tablaC);
    const boton = enTabla ? "" : pestana === "estructuras" ? (edE ? `<button class="s-btn lleno" type="button" data-nueva-est>${ico("plus", 16)}Agregar estructura</button>` : "") : (edM ? `<button class="s-btn lleno" type="button" data-nuevo-mat>${ico("plus", 16)}Agregar material</button>` : "");
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Catálogo</h1><p class="desc">Lo que vende EMTECSA y el material que lleva cada cosa. Aquí va el costo de compra de cada material y la mano de obra; el precio para el cliente se arma en cada cotización con el aumento.</p></div>${boton}</div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: lo que guarde se queda en esta computadora y se sube a la base de EMTECSA cuando se conecte.</span></div>`}
        <div class="herr">
          <label class="busca-v"><span class="sr">Buscar</span>${ico("search", 16)}<input type="search" placeholder="${pestana === "estructuras" ? "Buscar estructura, kV o kVA" : "Buscar material o código"}" value="${esc(busqueda)}" data-filtro></label>
          <nav class="seg pest-cat" aria-label="Ver"><a href="#/catalogo" ${pestana === "estructuras" ? 'aria-current="page"' : ""}>Lo que vende</a><a href="#/catalogo/materiales" ${pestana === "materiales" ? 'aria-current="page"' : ""}>Materiales</a>${verAum ? `<a href="#/catalogo/precios" ${pestana === "precios" ? 'aria-current="page"' : ""}>Precios</a>` : ""}<a href="#/catalogo/proveedores" ${pestana === "proveedores" ? 'aria-current="page"' : ""}>Proveedores</a></nav>
        </div>
        <div data-res></div>
      </div>`;
    const res = $("[data-res]", v);
    const pintar = () => {
      const q = normal(busqueda);
      if (pestana === "estructuras") {
        const pasa = e => (!q || normal(e.nombre + " " + e.codigo + " " + e.voltaje_kv + " kv " + (e.kva || "") + " kva " + (e.clase === "linea" ? "linea estructura" : "transformador") + " " + (Number(e.fases) === 3 ? "trifasica" : "monofasica")).includes(q));
        const act = c.estructuras.filter(e => e.activo !== false), sinMO = act.filter(e => e.mano_obra == null).length;
        const barra = `<div class="pr-acc ct-barra">${sinMO || soloSinM ? `<button type="button" class="chip-b est ${soloSinM ? "ambar" : ""}" data-solo-sin aria-pressed="${soloSinM}">Solo sin mano de obra · ${sinMO}</button>` : ""}<span class="esp"></span>${tablaMO ? `<span class="guardado ${moPend.size ? "sin" : ""}" data-ct-est>${moPend.size ? `${moPend.size} ${moPend.size === 1 ? "cambio sin guardar" : "cambios sin guardar"}` : "Todo guardado"}</span><button class="s-btn suave-b" type="button" data-tabla-listo>Listo</button><button class="s-btn lleno" type="button" data-mo-guardar ${moPend.size ? "" : "disabled"}>${ico("check", 16)}Guardar mano de obra</button>` : edE ? `<button class="s-btn suave-b" type="button" data-tabla-mo>${ico("pen", 15)}Poner mano de obra en tabla</button>` : ""}</div>`;
        const vis = act.filter(e => pasa(e) && (!soloSinM || e.mano_obra == null));
        if (tablaMO) {
          res.innerHTML = barra + (vis.length ? `<div class="pr-tabla ct-tabla">${vis.map(e => { const x = moPend.has(e.id) ? moPend.get(e.id) : montoTxt(e.mano_obra); return `<div class="ct-fila mo${moPend.has(e.id) ? " cambio" : ""}" data-ct="${e.id}"><span class="pr-nom"><b>${esc(e.nombre)}</b><small>${esc(e.codigo)} · ${cant(e.voltaje_kv)} kV · ${e.materiales.length} materiales</small></span><label class="f-campo"><span class="sr">Mano de obra de ${esc(e.nombre)}</span><span class="f-monto"><span>Q</span><input data-mo-v="${e.id}" inputmode="decimal" value="${esc(x)}" placeholder="0.00" autocomplete="off"></span></label></div>`; }).join("")}</div>` : `<div class="vacio chico"><p>${soloSinM ? "Todas tienen mano de obra." : `Nada con «${esc(busqueda)}».`}</p></div>`);
          return;
        }
        const grupos = [["linea", "Estructuras de línea"], ["transformador", "Transformadores en poste"]].flatMap(([cl, t]) =>
          [...new Set(act.filter(e => e.clase === cl).map(e => Number(e.voltaje_kv)))].sort((a, b) => a - b).map(kv => [`${t} · ${cant(kv)} kV`, vis.filter(e => e.clase === cl && Number(e.voltaje_kv) === kv)]))
          .filter(([, l]) => l.length);
        const arch = c.estructuras.filter(e => e.activo === false && pasa(e));
        res.innerHTML = barra + (grupos.length ? grupos.map(([t, l]) => `<div class="grupo-t">${t} · ${l.length}</div><div class="lista">${l.map(e => {
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
          </div></details>`; }).join("")}</div>`).join("") : soloSinM && !q ? `<div class="vacio chico"><p>Todas tienen mano de obra.</p></div>` : `<div class="vacio"><h2>Nada con «${esc(busqueda)}»</h2><p>Pruebe con otra palabra, el voltaje o los kVA.</p></div>`)
          + archivados(arch.map(e => ({ id: e.id, t: e.nombre, s: `${e.codigo} · ${cant(e.voltaje_kv)} kV`, d: "est" })), edE);
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
        const pasaM = m => !q || normal(m.descripcion + " " + m.codigo + " " + (m.unidad || "")).includes(q);
        const act = c.materiales.filter(m => m.activo !== false), sinC = act.filter(m => m.costo == null).length;
        const l = act.filter(m => pasaM(m) && (!soloSinC || m.costo == null));
        const barra = `<div class="pr-acc ct-barra">${verCosto && (sinC || soloSinC) ? `<button type="button" class="chip-b est ${soloSinC ? "ambar" : ""}" data-solo-sin aria-pressed="${soloSinC}">Solo sin costo · ${sinC}</button>` : ""}<span class="esp"></span>${tablaC ? `<span class="guardado ${costosPend.size ? "sin" : ""}" data-ct-est>${costosPend.size ? `${costosPend.size} ${costosPend.size === 1 ? "cambio sin guardar" : "cambios sin guardar"}` : "Todo guardado"}</span><button class="s-btn suave-b" type="button" data-tabla-listo>Listo</button><button class="s-btn lleno" type="button" data-ct-guardar ${costosPend.size ? "" : "disabled"}>${ico("check", 16)}Guardar costos</button>` : edM ? `${verCosto ? `<button class="s-btn suave-b" type="button" data-tabla-c>${ico("pen", 15)}Poner costos en tabla</button>` : ""}<button class="s-btn suave-b" type="button" data-excel-sub>${ico("download", 15)}Cargar desde Excel</button><button class="e-btn e-btn-salida chico-e" type="button" data-excel-baj>${ico("file", 15)}Lista en Excel</button>` : ""}</div>`;
        if (tablaC) {
          res.innerHTML = barra + `<datalist id="unidades-c">${UNIDADES.map(u => `<option value="${u}">`).join("")}</datalist>` + (l.length ? `<div class="pr-tabla ct-tabla">${l.map(m => { const x = costosPend.get(m.id) || {}; return `<div class="ct-fila${costosPend.has(m.id) ? " cambio" : ""}" data-ct="${m.id}"><span class="pr-nom"><b>${esc(m.descripcion)}</b><small>${esc(m.codigo)}</small></span><label class="f-campo"><span class="sr">Unidad de ${esc(m.descripcion)}</span><input data-ct-u="${m.id}" list="unidades-c" value="${esc(x.unidad ?? (m.unidad || ""))}" placeholder="unidad" autocomplete="off"></label><label class="f-campo"><span class="sr">Costo de ${esc(m.descripcion)}</span><span class="f-monto"><span>Q</span><input data-ct-c="${m.id}" inputmode="decimal" value="${esc(x.costo ?? montoTxt(m.costo))}" placeholder="0.00" autocomplete="off"></span></label></div>`; }).join("")}</div>` : `<div class="vacio chico"><p>${soloSinC ? "Todos tienen costo." : `Nada con «${esc(busqueda)}».`}</p></div>`);
          return;
        }
        const arch = c.materiales.filter(m => m.activo === false && pasaM(m));
        res.innerHTML = barra + (l.length ? `<div class="grupo-t">${l.length} ${l.length === 1 ? "material" : "materiales"} · ${l.filter(m => m.costo == null).length} sin costo</div><div class="lista">${l.map(m => `
          <div class="fila ${edM ? "con-lapiz" : ""}" style="cursor:default"><span class="icono gris">${ico("box", 18)}</span><span><b>${esc(m.descripcion)}</b><small>${esc(m.codigo)}${m.unidad ? " · por " + esc(m.unidad) : ""} · en ${usos[m.id] || 0} estructuras</small></span>
          <span class="der">${m.costo == null && !(verAum && m.venta_modo === "precio") ? '<span class="chip ambar">Sin costo</span>' : verAum ? ventaTxt(m) : verCosto ? `<span class="e-cifra">${esc(Q(m.costo))}</span>` : '<span class="chip verde">Con costo</span>'}</span>
          ${edM ? `<button class="s-ib" type="button" aria-label="Editar ${esc(m.descripcion)}" data-editar-mat="${m.id}">${ico("pen", 16)}</button>` : "<span></span>"}</div>`).join("")}</div>` : soloSinC && !q ? `<div class="vacio chico"><p>Todos tienen costo.</p></div>` : `<div class="vacio"><h2>Nada con «${esc(busqueda)}»</h2><p>Pruebe con otra palabra o con el código.</p></div>`)
          + archivados(arch.map(m => ({ id: m.id, t: m.descripcion, s: m.codigo, d: "mat" })), edM);
      }
    };
    pintar();
    $("[data-filtro]", v).addEventListener("input", e => { busqueda = e.target.value; pintar(); });
    if (pestana === "precios") { $("[data-filtro]", v).placeholder = "Buscar material o código"; $(".cab-v > .s-btn", v)?.remove(); }
    if (pestana === "proveedores") { $("[data-filtro]", v).placeholder = "Buscar proveedor o teléfono"; const b = $(".cab-v > .s-btn", v); if (b) { if (edP) { b.outerHTML = `<button class="s-btn lleno" type="button" data-nuevo-prov>${ico("plus", 16)}Agregar proveedor</button>`; } else b.remove(); } }
    res.addEventListener("toggle", e => { const d = e.target.closest("[data-est]"); if (d) { const id = Number(d.dataset.est); if (d.open) abiertos.add(id); else abiertos.delete(id); } }, true);
    if (enTabla) guardia({ limpio: () => !costosPend.size && !moPend.size, soltar: () => { costosPend.clear(); moPend.clear(); tablaC = tablaMO = false; } });
    const marcarEst = () => { const n = pestana === "materiales" ? costosPend.size : moPend.size; const est = res.querySelector("[data-ct-est]"); if (est) { est.textContent = n ? `${n} ${n === 1 ? "cambio sin guardar" : "cambios sin guardar"}` : "Todo guardado"; est.className = "guardado" + (n ? " sin" : ""); } const g = res.querySelector("[data-ct-guardar], [data-mo-guardar]"); if (g) g.disabled = !n; };
    res.addEventListener("input", e => {
      const t = e.target;
      if (t.dataset.ctU || t.dataset.ctC) {
        const fila = t.closest("[data-ct]"), id = Number(fila.dataset.ct), m = c.materiales.find(x => x.id === id);
        const u = fila.querySelector("[data-ct-u]").value.trim(), co = fila.querySelector("[data-ct-c]").value.trim();
        let n = null, bien = true; try { n = numero(co); } catch (er) { bien = false; }
        if (bien && u === (m.unidad || "") && (n == null ? m.costo == null : Number(m.costo) === n)) costosPend.delete(id); else costosPend.set(id, { unidad: u, costo: co });
        fila.classList.toggle("cambio", costosPend.has(id)); marcarEst();
      }
      if (t.dataset.moV) {
        const id = Number(t.dataset.moV), e2 = c.estructuras.find(x => x.id === id);
        let n = null, bien = true; try { n = numero(t.value.trim()); } catch (er) { bien = false; }
        if (bien && (n == null ? e2.mano_obra == null : Number(e2.mano_obra) === n)) moPend.delete(id); else moPend.set(id, t.value.trim());
        t.closest("[data-ct]").classList.toggle("cambio", moPend.has(id)); marcarEst();
      }
    });
    res.addEventListener("focusout", e => { if (e.target.matches("[data-ct-c], [data-mo-v]")) { try { e.target.value = montoTxt(numero(e.target.value)); } catch (er) {} } });
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
      if (e.target.closest("[data-solo-sin]")) { if (pestana === "materiales") soloSinC = !soloSinC; else soloSinM = !soloSinM; pintar(); return; }
      if (e.target.closest("[data-tabla-c]")) { tablaC = true; await quieto(() => vCatalogo(v, pestana)); return; }
      if (e.target.closest("[data-tabla-mo]")) { tablaMO = true; await quieto(() => vCatalogo(v, pestana)); return; }
      if (e.target.closest("[data-tabla-listo]")) { if (costosPend.size || moPend.size) { aviso("Guarde los cambios primero.", "mal"); return; } tablaC = tablaMO = false; guardia(null); await quieto(() => vCatalogo(v, pestana)); return; }
      const cg = e.target.closest("[data-ct-guardar], [data-mo-guardar]");
      if (cg) {
        cg.disabled = true;
        try {
          if (cg.matches("[data-ct-guardar]")) for (const [id, x] of [...costosPend]) { const m = c.materiales.find(y => y.id === id); let costo; try { costo = numero(x.costo); } catch (er) { throw new Error(`Revise el costo de ${m.descripcion}.`); } await D.guardarMaterial({ ...m, unidad: x.unidad, costo }); costosPend.delete(id); }
          else for (const [id, x] of [...moPend]) { const es = c.estructuras.find(y => y.id === id); let mo; try { mo = numero(x); } catch (er) { throw new Error(`Revise la mano de obra de ${es.nombre}.`); } await D.guardarManoObra(id, mo); moPend.delete(id); }
          aviso(cg.matches("[data-ct-guardar]") ? "Costos guardados." : "Mano de obra guardada."); await refrescar();
        } catch (err) { aviso(err.message, "mal"); cg.disabled = false; await refrescar(); }
        return;
      }
      if (e.target.closest("[data-excel-sub]")) { cargarExcel(c); return; }
      if (e.target.closest("[data-excel-baj]")) { bajarExcel(c); return; }
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
  const preciosPend = new Map(), costosPend = new Map(), moPend = new Map();
  let tablaC = false, tablaMO = false, soloSinC = false, soloSinM = false;
  const archivados = (l, ed) => l.length ? `<details class="caja plegable arch-cat"><summary><span class="pl-t"><h2>Archivados</h2><span class="suave">${l.length} · no salen al cotizar</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div class="lista">${l.map(x => `<div class="fila ${ed ? "con-lapiz" : ""}" style="cursor:default"><span class="icono gris">${ico("box", 18)}</span><span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span><span class="der"><span class="chip gris">Archivado</span></span>${ed ? `<button class="s-ib" type="button" aria-label="Editar ${esc(x.t)}" data-editar-${x.d === "mat" ? "mat" : "est"}="${x.id}">${ico("pen", 16)}</button>` : "<span></span>"}</div>`).join("")}</div></div></details>` : "";
  function pintarPrecios(res, c, q) {
    const l = c.materiales.filter(m => m.activo !== false && (!q || normal(m.descripcion + " " + m.codigo).includes(q)));
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

  let excelP = null;
  const libExcel = () => window.ExcelJS ? Promise.resolve(window.ExcelJS) : (excelP = excelP || new Promise((ok, mal) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.integrity = "sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz"; s.crossOrigin = "anonymous"; s.onload = () => ok(window.ExcelJS); s.onerror = () => { excelP = null; mal(new Error("No se pudo abrir el lector de Excel. Revise el internet.")); }; document.head.append(s); }));
  async function bajarExcel(c) {
    try {
      aviso("Armando el Excel…");
      const ExcelJS = await libExcel(), verC = D.puede(sesion.perfil, "verCosto");
      const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Materiales");
      ws.columns = [{ header: "Código", key: "codigo", width: 12 }, { header: "Descripción", key: "descripcion", width: 54 }, { header: "Unidad", key: "unidad", width: 14 }, ...(verC ? [{ header: "Costo", key: "costo", width: 14, style: { numFmt: '"Q" #,##0.00' } }] : [])];
      ws.getRow(1).font = { bold: true };
      c.materiales.filter(m => m.activo !== false).forEach(m => ws.addRow({ codigo: m.codigo, descripcion: m.descripcion, unidad: m.unidad || "", ...(verC ? { costo: m.costo } : {}) }));
      const u = URL.createObjectURL(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a"); a.href = u; a.download = "Materiales EMTECSA.xlsx"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
    } catch (err) { aviso(err.message || "No se pudo armar el Excel.", "mal"); }
  }
  function leerExcel(wb) {
    const txt = v => { if (v == null) return ""; if (typeof v === "object") { if (v instanceof Date) return v.toISOString().slice(0, 10); if (v.richText) return v.richText.map(r => r.text).join("").trim(); if (v.result != null) return String(v.result).trim(); if (v.text != null) return String(v.text).trim(); return ""; } return String(v).trim(); };
    for (const ws of wb.worksheets) {
      for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
        const col = {};
        ws.getRow(r).eachCell((cel, i) => { const h = normal(txt(cel.value)); if (!h) return; if (col.codigo == null && /^cod/.test(h)) col.codigo = i; else if (col.descripcion == null && /descrip|material|nombre/.test(h)) col.descripcion = i; else if (col.unidad == null && /^(unidad|u\.?m|medida)/.test(h)) col.unidad = i; else if (col.costo == null && /costo|precio/.test(h)) col.costo = i; });
        if (col.codigo == null && col.descripcion == null) continue;
        const filas = [];
        for (let k = r + 1; k <= ws.rowCount; k++) { const row = ws.getRow(k), g = i => i == null ? "" : txt(row.getCell(i).value), cv = col.costo == null ? null : row.getCell(col.costo).value; const x = { fila: k, codigo: g(col.codigo).toUpperCase(), descripcion: g(col.descripcion), unidad: g(col.unidad), costo: typeof cv === "number" ? cv : (cv && typeof cv === "object" && typeof cv.result === "number" ? cv.result : g(col.costo)), conCosto: col.costo != null }; if (x.codigo || x.descripcion) filas.push(x); }
        return filas;
      }
    }
    throw new Error("No encontré los encabezados. La primera fila debe decir Código, Descripción, Unidad y Costo.");
  }
  function cargarExcel(c) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    inp.addEventListener("change", async () => {
      const file = inp.files[0]; if (!file) return;
      try { aviso("Leyendo el Excel…"); const ExcelJS = await libExcel(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); revisarCarga(c, leerExcel(wb), file.name); }
      catch (err) { aviso(/[áéíóúñ]/i.test(err.message) ? err.message : "Ese archivo no se pudo leer. Guárdelo como Excel (.xlsx) y súbalo otra vez.", "mal"); }
    });
    inp.click();
  }
  function revisarCarga(c, filas, nombre) {
    const verC = D.puede(sesion.perfil, "verCosto");
    const act = c.materiales;
    const porCod = Object.fromEntries(act.map(m => [m.codigo.toUpperCase(), m])), porDesc = Object.fromEntries(act.map(m => [m.descripcion.toUpperCase(), m]));
    const nuevos = [], cambios = [], malos = [], vistos = new Set(); let iguales = 0;
    for (const x of filas) {
      let costo = null, conC = verC && x.conCosto && x.costo !== "" && x.costo != null;
      if (conC) { if (typeof x.costo === "number") costo = Math.round(x.costo * 100) / 100; else { try { costo = numero(x.costo); } catch (er) { malos.push({ x, por: "el costo no es un número" }); continue; } } if (costo != null && costo < 0) { malos.push({ x, por: "el costo es negativo" }); continue; } }
      const llave = x.codigo || "D:" + x.descripcion.toUpperCase();
      if (vistos.has(llave)) { malos.push({ x, por: "está repetido en el Excel" }); continue; }
      vistos.add(llave);
      const m = x.codigo ? porCod[x.codigo] : porDesc[x.descripcion.toUpperCase()];
      if (m) {
        const ch = {};
        if (x.descripcion && x.descripcion !== m.descripcion) { const otro = porDesc[x.descripcion.toUpperCase()]; if (otro && otro.id !== m.id) { malos.push({ x, por: `esa descripción ya la tiene ${otro.codigo}` }); continue; } ch.descripcion = x.descripcion; }
        if (x.unidad && x.unidad !== (m.unidad || "")) ch.unidad = x.unidad;
        if (conC && costo != null && costo !== (m.costo == null ? null : Number(m.costo))) ch.costo = costo;
        if (Object.keys(ch).length) cambios.push({ m, ch }); else iguales++;
      } else {
        if (!x.descripcion) { malos.push({ x, por: `el código ${x.codigo} no existe y no trae descripción` }); continue; }
        if (porDesc[x.descripcion.toUpperCase()]) { malos.push({ x, por: `esa descripción ya la tiene ${porDesc[x.descripcion.toUpperCase()].codigo}` }); continue; }
        nuevos.push({ codigo: x.codigo, descripcion: x.descripcion, unidad: x.unidad, costo: conC ? costo : null });
      }
    }
    const mx = 40, mas = n => n > mx ? `<p class="suave" style="font-size:13px;margin:6px 4px 0">y ${n - mx} más</p>` : "";
    const cambioTxt = ({ m, ch }) => [ch.descripcion ? `Descripción: ${ch.descripcion}` : "", ch.unidad != null ? `Unidad: ${m.unidad || "—"} → ${ch.unidad}` : "", ch.costo !== undefined ? `Costo: ${m.costo == null ? "sin costo" : Q(m.costo)} → ${Q(ch.costo)}` : ""].filter(Boolean).join(" · ");
    if (!nuevos.length && !cambios.length) { modal({ titulo: "Nada que cargar", guardarTxt: "Cerrar", soloUno: true, cuerpo: `<p class="suave" style="font-size:15px">«${esc(nombre)}» ya coincide con el catálogo${malos.length ? `, y ${malos.length} ${malos.length === 1 ? "fila tiene" : "filas tienen"} problemas:` : "."}</p>${malos.length ? `<div class="lista">${malos.slice(0, mx).map(z => `<div class="fila" style="cursor:default"><span><b>Fila ${z.x.fila} · ${esc(z.x.codigo || z.x.descripcion)}</b><small>${esc(z.por)}</small></span></div>`).join("")}</div>` : ""}`, alGuardar: async () => cerrarCapas() }); return; }
    modal({
      titulo: "Cargar desde Excel", guardarTxt: "Cargar",
      cuerpo: `<p class="suave" style="font-size:14px;margin:0">${esc(nombre)} · ${filas.length} filas${iguales ? ` · ${iguales} ya estaban igual` : ""}</p>
        ${nuevos.length ? `<section class="carga-p"><div class="caja-cab"><h3>Nuevos · ${nuevos.length}</h3><span class="chip verde">Segura</span></div><label class="f-check"><input type="checkbox" name="nuevos" checked><span>${nuevos.length === 1 ? "Agregar el material nuevo" : `Agregar los ${nuevos.length} materiales nuevos`}</span></label><div class="lista">${nuevos.slice(0, mx).map(n => `<div class="fila" style="cursor:default"><span><b>${esc(n.descripcion)}</b><small>${esc([n.codigo || "código nuevo", n.unidad, n.costo != null ? Q(n.costo) : ""].filter(Boolean).join(" · "))}</small></span></div>`).join("")}</div>${mas(nuevos.length)}</section>` : ""}
        ${cambios.length ? `<section class="carga-p"><div class="caja-cab"><h3>Cambios · ${cambios.length}</h3><span class="chip ambar">Revisar</span></div><label class="f-check"><input type="checkbox" name="cambios" checked><span>${cambios.length === 1 ? "Aplicar el cambio" : `Aplicar los ${cambios.length} cambios`}</span></label><div class="lista">${cambios.slice(0, mx).map(z => `<div class="fila" style="cursor:default"><span><b>${esc(z.m.codigo)} · ${esc(z.m.descripcion)}</b><small>${esc(cambioTxt(z))}</small></span></div>`).join("")}</div>${mas(cambios.length)}</section>` : ""}
        ${malos.length ? `<section class="carga-p"><div class="caja-cab"><h3>No se cargan · ${malos.length}</h3><span class="chip gris">Con problema</span></div><div class="lista">${malos.slice(0, mx).map(z => `<div class="fila" style="cursor:default"><span><b>Fila ${z.x.fila} · ${esc(z.x.codigo || z.x.descripcion)}</b><small>${esc(z.por)}</small></span></div>`).join("")}</div>${mas(malos.length)}</section>` : ""}`,
      alGuardar: async f => {
        const conN = !f.nuevos || f.nuevos.checked, conC = !f.cambios || f.cambios.checked;
        if (!(conN && nuevos.length) && !(conC && cambios.length)) throw new Error("Marque qué quiere cargar.");
        const codigos = act.map(m => ({ codigo: m.codigo })); let n = 0, k = 0; const fallas = [];
        aviso("Cargando…");
        if (conN) for (const x of nuevos) { const codigo = x.codigo || D.siguienteCodigo(codigos, "MAT"); try { await D.guardarMaterial({ codigo, descripcion: x.descripcion, unidad: x.unidad, costo: x.costo, precio: null, venta_modo: null, venta_pct: null }); codigos.push({ codigo }); n++; } catch (er) { fallas.push(`${x.descripcion}: ${er.message}`); } }
        if (conC) for (const z of cambios) { try { await D.guardarMaterial({ ...z.m, ...z.ch }); k++; } catch (er) { fallas.push(`${z.m.codigo}: ${er.message}`); } }
        cerrarCapas(); aviso(`Listo: ${n} ${n === 1 ? "nuevo" : "nuevos"} y ${k} ${k === 1 ? "cambio" : "cambios"}.${fallas.length ? ` ${fallas.length} no se pudieron.` : ""}`, fallas.length ? "mal" : undefined);
        await refrescar();
      }
    });
  }

  function archivar(tabla, x, c) {
    const esMat = tabla === "materiales", nombre = esMat ? x.descripcion : x.nombre;
    const usos = esMat ? c.estructuras.filter(e => e.activo !== false && e.materiales.some(r => r.material.id === x.id)).length : 0;
    const vuelve = x.activo === false;
    modal({ titulo: vuelve ? `¿Volver a activar ${esMat ? "el material" : "la estructura"}?` : `¿Archivar ${esMat ? "el material" : "la estructura"}?`, guardarTxt: vuelve ? "Volver a activar" : "Archivar",
      cuerpo: `<p class="suave" style="font-size:15px"><b style="color:var(--text)">${esc(nombre)}</b></p><p class="suave" style="font-size:14px">${vuelve ? "Vuelve a salir al cotizar, en el plano y al sacar material." : `Deja de salir al cotizar, en el plano y al sacar material. No se borra: queda en «Archivados» y se puede volver a activar.${usos ? ` Está en ${usos} ${usos === 1 ? "estructura" : "estructuras"}, que lo siguen usando.` : ""}`}</p>`,
      alGuardar: async () => { await D.activarCatalogo(tabla, x.id, vuelve); cerrarCapas(); aviso(vuelve ? "Activado otra vez." : "Archivado."); await refrescar(); } });
  }

  async function editarMaterial(mat, c) {
    const fichaAct = mat ? (await D.fichas().catch(() => ({})))[mat.id] || null : null;
    let fichaNueva = null, fichaQuitar = false;
    const p = sesion.perfil, verCosto = D.puede(p, "verCosto"), verAum = D.puede(p, "verAumento");
    const nuevo = !mat;
    const m0 = mat || { codigo: D.siguienteCodigo(c.materiales, "MAT"), descripcion: "", unidad: "", costo: null, precio: null, venta_modo: null, venta_pct: null };
    modal({
      titulo: nuevo ? "Material nuevo" : "Editar material",
      extra: nuevo ? "" : `<button class="s-btn suave-b" type="button" data-archivar-x>${ico("box", 15)}${mat.activo === false ? "Volver a activar" : "Archivar"}</button>`,
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
          if (ev.target.closest("[data-archivar-x]")) { archivar("materiales", mat, c); return; }
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
    let filas = base.materiales.map(r => ({ material: r.material, cantidad: r.cantidad })), marcadaE = null;
    const kvs = [...new Set([13.2, 34.5, ...c.estructuras.map(x => Number(x.voltaje_kv))])].sort((a, b) => a - b);
    modal({
      titulo: copia ? "Copia de estructura" : nuevo ? "Estructura nueva" : "Editar estructura",
      extra: !nuevo ? `<button class="s-btn suave-b" type="button" data-archivar-x>${ico("box", 15)}${est.activo === false ? "Volver a activar" : "Archivar"}</button><button class="s-btn suave-b" type="button" data-duplicar>${ico("layers", 15)}Duplicar</button>` : "",
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
            ${marcadaE === i ? `<button class="s-btn peligro-b chico" type="button" data-quitar="${i}">Quitar</button>` : `<button class="s-ib" type="button" aria-label="Quitar ${esc(r.material.descripcion)}" data-marca-q="${i}">${ico("pen", 15)}</button>`}</div>`).join("") : `<p class="suave" style="padding:12px 4px">Todavía no tiene materiales. Búsquelos abajo.</p>`;
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
          const l = c.materiales.filter(x => x.activo !== false && !ya.has(x.id) && normal(x.descripcion + " " + x.codigo).includes(normal(q))).slice(0, 8);
          res.hidden = false;
          res.innerHTML = l.length ? l.map(x => `<button type="button" data-add="${x.id}"><b>${esc(x.descripcion)}</b><small>${esc(x.codigo)}${x.costo == null ? " · sin costo" : verCosto ? " · " + esc(Q(x.costo)) : ""}</small></button>`).join("") : `<p class="suave">No hay más materiales con «${esc(busca.value)}». Agréguelo primero en Materiales.</p>`;
        };
        busca.addEventListener("input", buscar);
        busca.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("[data-add]", res)?.click(); } });
        m.addEventListener("click", e => {
          const a = e.target.closest("[data-add]");
          if (a) { filas.push({ material: c.materiales.find(x => x.id === Number(a.dataset.add)), cantidad: 1 }); busca.value = ""; res.hidden = true; pintarFilas(); const ult = $$("[data-cant]", f).pop(); ult?.focus(); ult?.select(); }
          const mq = e.target.closest("[data-marca-q]"); if (mq) { marcadaE = marcadaE === Number(mq.dataset.marcaQ) ? null : Number(mq.dataset.marcaQ); pintarFilas(); return; }
          const qq = e.target.closest("[data-quitar]");
          if (qq) { filas.splice(Number(qq.dataset.quitar), 1); marcadaE = null; pintarFilas(); }
          if (e.target.closest("[data-archivar-x]")) { archivar("estructuras", est, c); return; }
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
      <div style="padding:6px 0 0"><a class="pop-item" href="#/perfil" data-a-empresa>${ico("pen", 18)}Mi perfil</a>${p.dev ? `<a class="pop-item" href="#/errores" data-a-empresa>${ico("alerta", 18)}Errores del sistema</a>` : ""}${p.probando ? `<button class="pop-item" type="button" data-volver-rol>${ico("shield", 18)}Volver a gerencia</button>` : ""}${p.rol === "gerencia" ? `<a class="pop-item" href="#/equipo" data-a-empresa>${ico("users", 18)}Equipo y permisos</a>` : ""}${D.puede(p, "editarEmpresa") ? `<a class="pop-item" href="#/empresa" data-a-empresa>${ico("building", 18)}Datos de la empresa</a>` : ""}${D.nube ? "" : `<button class="pop-item" type="button" data-borrar-prueba>${ico("trash", 18)}Borrar los datos de prueba</button>`}${D.appInstalada && !D.appInstalada() ? `<button class="pop-item" type="button" data-instalar>${ico("phone", 18)}Instalar en el teléfono</button>` : ""}<button class="pop-item peligro" type="button" data-salir>${ico("salir", 18)}Cerrar sesión</button></div>`;
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
  window.EMT_APP = { marcarInsignia, pintarAvatar, iniciales, $, $$, esc, ico, Q, cant, aviso, modal, cerrarCapas, numero, montoTxt, campoMonto, formatoAlSalir, ir, guardia, quieto, sostener, filtrar, normal, chipsASelect, ponerTema, temaActual, muestraTema, FAMILIAS_TEMA, sesion: () => sesion, recargarHoy: () => { const v = document.getElementById("vista"); return v && /^#\/hoy$|^#?\/?$/.test(location.hash) ? quieto(() => vHoy(v)) : null; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar); else arrancar();
})();
