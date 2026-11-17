"use strict";
(function () {
  const D = window.EMT_CATALOGO, A = window.EMT_ALMACEN, ico = window.EMT.ico;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const q = A.q;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINO = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const PROD = Object.fromEntries(D.productos.map(p => [p.id, p]));
  const LINEA = Object.fromEntries(D.lineas.map(l => [l.id, l]));
  const DEPTOS = ["Guatemala", "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"];

  const leerLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const ponerLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let carrito = leerLS("emtecsa.carrito", []);
  let notaObra = leerLS("emtecsa.nota", "");
  const filtro = { linea: "todo", texto: "" };

  const mini = {};
  const esperaMini = {};
  function miniDe(tipo) {
    if (mini[tipo]) return Promise.resolve(mini[tipo]);
    if (!esperaMini[tipo]) esperaMini[tipo] = new Promise(r => { esperaMini[tipo].r = r; });
    return esperaMini[tipo];
  }
  function pintarMini(tipo, url) {
    mini[tipo] = url;
    if (esperaMini[tipo] && esperaMini[tipo].r) esperaMini[tipo].r(url);
    $$(`img[data-modelo="${tipo}"]`).forEach(img => {
      if (img.src !== url) { img.src = url; img.onload = () => img.classList.add("listo"); }
      const c = img.parentElement.querySelector(".cargando"); if (c) c.remove();
    });
  }
  async function generarMinis() {
    const tipos = [...new Set([...D.lineas.map(l => l.modelo), ...D.productos.map(p => p.modelo)])];
    for (const t of tipos) {
      await new Promise(r => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 60)));
      try { pintarMini(t, await window.EMT3D.miniatura(t)); } catch (e) {}
    }
  }
  function sin3D() {
    $$(".prod-vista .cargando").forEach(c => { c.outerHTML = `<span class="sin3d">${ico("box", 54)}</span>`; });
  }

  function aviso(texto, icono = "check", accion) {
    const caja = $("#avisos");
    const el = document.createElement("div");
    el.className = "aviso";
    el.innerHTML = ico(icono, 18) + `<span>${esc(texto)}</span>` + (accion ? `<button class="aviso-accion" type="button">${esc(accion.txt)}</button>` : "");
    caja.appendChild(el);
    while (caja.children.length > 3) caja.firstChild.remove();
    const quitar = () => { el.classList.add("sale"); setTimeout(() => el.remove(), 280); };
    if (accion) $(".aviso-accion", el).onclick = () => { accion.fn(); quitar(); };
    setTimeout(quitar, accion ? 5200 : 3200);
  }

  function etiquetaOpciones(op) { return Object.values(op || {}).join(" · "); }
  function precioDe(it) { const p = PROD[it.id]; return p && p.modo === "precio" ? p.precio : null; }
  function totales() {
    let total = 0, cot = 0, n = 0;
    for (const it of carrito) { n += it.cant; const pr = precioDe(it); if (pr == null) cot += 1; else total += pr * it.cant; }
    return { total, cot, n };
  }
  function guardarCarrito() {
    ponerLS("emtecsa.carrito", carrito);
    const { n } = totales();
    const b = $("#burbuja");
    const mio = leerLS("emtecsa.miPedido", null);
    if (n) { b.hidden = false; b.textContent = n; b.classList.remove("estado"); }
    else if (mio) { b.hidden = false; b.innerHTML = ico("check", 12); b.classList.add("estado"); }
    else b.hidden = true;
  }

  function agregar(id, opciones, cant, desde) {
    const clave = id + "|" + JSON.stringify(opciones || {});
    const ya = carrito.find(x => x.clave === clave);
    if (ya) ya.cant += cant; else carrito.push({ clave, id, opciones: opciones || {}, cant });
    guardarCarrito();
    volar(desde, PROD[id].modelo);
    aviso(PROD[id].modo === "precio" ? `Agregado: ${PROD[id].nombre}` : `Para cotizar: ${PROD[id].nombre}`, PROD[id].modo === "precio" ? "check" : "send");
  }

  function volar(desde, tipo) {
    const btn = $("#abrir-carrito");
    const pegar = () => { btn.classList.remove("late"); void btn.offsetWidth; btn.classList.add("late"); };
    if (QUIETO || !desde || !mini[tipo]) { pegar(); return; }
    const a = desde.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const tam = 84;
    const x0 = a.left + a.width / 2 - tam / 2, y0 = a.top + a.height / 2 - tam / 2;
    const x1 = b.left + b.width / 2 - tam / 2, y1 = b.top + b.height / 2 - tam / 2;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 140;
    const el = document.createElement("div");
    el.className = "vuela";
    el.innerHTML = `<img src="${mini[tipo]}" alt="">`;
    document.body.appendChild(el);
    const pasos = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, u = 1 - t;
      const x = u * u * x0 + 2 * u * t * mx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * my + t * t * y1;
      const s = 1 - t * 0.7;
      pasos.push({ transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${t * -24}deg)`, opacity: t > 0.9 ? 0.4 : 1 });
    }
    const anim = el.animate(pasos, { duration: 720, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" });
    for (let k = 1; k <= 5; k++) {
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const d = document.createElement("i");
        d.className = "estela";
        d.style.left = r.left + r.width / 2 + "px"; d.style.top = r.top + r.height / 2 + "px";
        document.body.appendChild(d);
        d.animate([{ opacity: 0.9, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.3)" }], { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }).onfinish = () => d.remove();
      }, k * 110);
    }
    anim.onfinish = () => { el.remove(); pegar(); };
  }

  function inclinar(el, fuerza = 8) {
    if (!FINO || QUIETO) return;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add("moviendo");
      el.style.setProperty("--ry", (px * fuerza).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-py * fuerza).toFixed(2) + "deg");
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
      el.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("moviendo");
      ["--rx", "--ry", "--px", "--py"].forEach(v => el.style.setProperty(v, v.startsWith("--r") ? "0deg" : "0"));
    });
  }

  function pintarLineas() {
    const caja = $("#lineas-lista");
    caja.innerHTML = D.lineas.map((l, i) => `
      <button class="linea revela" type="button" style="--d:${i}" data-linea="${l.id}" aria-label="Ver ${esc(l.nombre)} en el catálogo">
        <img class="linea-foto" src="${l.foto}" alt="" loading="lazy" decoding="async">
        <img class="linea-modelo" data-modelo="${l.modelo}" alt="">
        <span class="linea-txt"><span class="num-c">${l.n}</span><h3>${esc(l.nombre)}</h3><p>${esc(l.texto)}</p><span class="ver">Ver productos ${ico("arrow", 16)}</span></span>
      </button>`).join("");
    $$(".linea", caja).forEach(el => {
      inclinar(el, 7);
      el.addEventListener("click", () => { ponerFiltro(el.dataset.linea); irA("#productos"); });
    });
    $$(".linea-modelo", caja).forEach(img => img.addEventListener("load", () => img.classList.add("listo")));
  }

  function pintarChips() {
    const ops = [{ id: "todo", nombre: "Todo" }, ...D.lineas];
    $("#chips").innerHTML = ops.map(o => `<button class="e-chip" type="button" data-f="${o.id}" aria-pressed="${filtro.linea === o.id}">${esc(o.nombre)}</button>`).join("");
  }
  function ponerFiltro(id) {
    filtro.linea = id;
    $$("#chips .e-chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === id)));
    pintarProductos(true);
  }

  function normal(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function pintarProductos(animar) {
    const t = normal(filtro.texto.trim());
    const lista = D.productos.filter(p => (filtro.linea === "todo" || p.linea === filtro.linea) && (!t || normal([p.nombre, p.detalle, LINEA[p.linea].nombre, ...(p.opciones || []).flatMap(o => o.valores), ...(p.ficha || []).flat()].join(" ")).includes(t)));
    $("#sin-resultados").hidden = lista.length > 0;
    $("#productos-lista").innerHTML = lista.map((p, i) => {
      const precio = p.modo === "precio"
        ? `<span class="precio">${q(p.precio)}<small>por ${esc(p.unidad)}</small></span>`
        : `<span class="a-cotizar">A cotizar<small>${p.opciones ? esc(p.opciones.map(o => o.valores.length > 2 ? `${o.valores[0]} a ${o.valores[o.valores.length - 1]}` : o.valores.join(" y ")).join(" · ")) : "Según su obra"}</small></span>`;
      const boton = p.modo === "precio"
        ? `<button class="agregar" type="button" data-agregar="${p.id}" aria-label="Agregar ${esc(p.nombre)} al carrito">${ico("plus", 16)}Agregar</button>`
        : `<button class="agregar contorno" type="button" data-ver="${p.id}" aria-label="Cotizar ${esc(p.nombre)}">Cotizar</button>`;
      return `<article class="prod${animar ? " entra" : ""}" style="--i:${i}">
        <button class="prod-vista" type="button" data-ver="${p.id}" aria-label="Ver ${esc(p.nombre)} en 3D">
          <span class="prod-3d">${ico("spark", 12)}3D</span>
          ${mini[p.modelo] ? "" : '<span class="cargando"></span>'}
          <img data-modelo="${p.modelo}" ${mini[p.modelo] ? `src="${mini[p.modelo]}" class="listo"` : ""} alt="">
        </button>
        <div class="prod-info"><span class="eti">${esc(LINEA[p.linea].nombre)}</span><h3>${esc(p.nombre)}</h3><p>${esc(p.detalle)}</p>
          <div class="prod-pie">${precio}${boton}</div></div>
      </article>`;
    }).join("");
    $$("#productos-lista .prod").forEach(el => inclinar(el, 0));
    $$("#productos-lista img[data-modelo]").forEach(img => { if (!img.classList.contains("listo")) img.addEventListener("load", () => img.classList.add("listo")); });
  }

  let fichaActual = null, visor = null, ultimoFoco = null;
  function abrirFicha(id) {
    const p = PROD[id];
    fichaActual = { id, opciones: Object.fromEntries((p.opciones || []).map(o => [o.id, o.valores[0]])), cant: 1 };
    const info = $("#ficha-info");
    const pintar = () => {
      const precio = p.modo === "precio"
        ? `<span class="precio">${q(p.precio * fichaActual.cant)}<small>${q(p.precio)} por ${esc(p.unidad)}</small></span>`
        : `<span class="a-cotizar">Cantidad<small>Le enviamos el precio por esta cantidad</small></span>`;
      info.innerHTML = `
        <span class="eti">${esc(LINEA[p.linea].nombre)}</span>
        <h2 id="ficha-t">${esc(p.nombre)}</h2>
        <p>${esc(p.detalle)}</p>
        ${(p.opciones || []).map(o => `<div class="opcion"><span>${esc(o.nombre)}</span><div class="e-chips" role="group" aria-label="${esc(o.nombre)}">${o.valores.map(v => `<button class="e-chip" type="button" data-op="${o.id}" data-v="${esc(v)}" aria-pressed="${fichaActual.opciones[o.id] === v}">${esc(v)}</button>`).join("")}</div></div>`).join("")}
        <table class="tabla-ficha"><tbody>${(p.ficha || []).map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table>
        <div class="ficha-compra">
          <div class="fila">${precio}
            <div class="paso-cant" role="group" aria-label="Cantidad"><button type="button" data-cant="-1" aria-label="Quitar uno">−</button><output aria-live="polite">${fichaActual.cant}</output><button type="button" data-cant="1" aria-label="Agregar uno">+</button></div>
          </div>
          <button class="e-btn e-btn-p" type="button" data-ficha-agregar data-i="${p.modo === "precio" ? "cart" : "send"}">${p.modo === "precio" ? "Agregar al carrito" : "Agregar a la cotización"}</button>
        </div>`;
      window.EMT.iconos(info);
    };
    pintar();
    info.onclick = e => {
      const op = e.target.closest("[data-op]");
      if (op) { fichaActual.opciones[op.dataset.op] = op.dataset.v; pintar(); return; }
      const c = e.target.closest("[data-cant]");
      if (c) { fichaActual.cant = Math.max(1, Math.min(999, fichaActual.cant + +c.dataset.cant)); pintar(); return; }
      if (e.target.closest("[data-ficha-agregar]")) {
        const desde = $("#ficha-visor");
        agregar(id, p.opciones ? { ...fichaActual.opciones } : {}, fichaActual.cant, desde);
        cerrarFicha();
      }
    };
    ultimoFoco = document.activeElement;
    const f = $("#ficha");
    f.hidden = false;
    abrirVelo();
    requestAnimationFrame(() => f.classList.add("abierta"));
    const bp = $("#ver-piezas");
    bp.hidden = true;
    bp.setAttribute("aria-pressed", "false");
    bp.lastChild.textContent = "Ver piezas";
    if (window.EMT3D) {
      visor = window.EMT3D.abrirVisor($("#ficha-visor"), p.modelo);
      const revisar = () => { if (visor) bp.hidden = !visor.tienePartes(); };
      revisar();
      window.EMT3D.listo.then(() => setTimeout(revisar, 60));
    }
    $(".ficha-cerrar").focus();
  }
  function cerrarFicha() {
    const f = $("#ficha");
    if (f.hidden) return;
    f.classList.remove("abierta");
    if (visor) { visor.cerrar(); visor = null; }
    setTimeout(() => { f.hidden = true; }, 240);
    if ($("#carrito").hidden) cerrarVelo();
    if (ultimoFoco) ultimoFoco.focus({ preventScroll: true });
  }

  let lenis = null;
  function irA(destino) {
    const el = typeof destino === "string" ? document.querySelector(destino) : destino;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -84, duration: 1.4 });
    else el.scrollIntoView({ behavior: QUIETO ? "auto" : "smooth" });
  }
  function abrirVelo() {
    if (lenis) lenis.stop();
    const v = $("#velo");
    v.hidden = false;
    document.body.classList.add("trabado");
    requestAnimationFrame(() => v.classList.add("abierto"));
  }
  function cerrarVelo() {
    if (lenis) lenis.start();
    const v = $("#velo");
    v.classList.remove("abierto");
    document.body.classList.remove("trabado");
    setTimeout(() => { if (!v.classList.contains("abierto")) v.hidden = true; }, 300);
  }

  let paso = 1, pasoAntes = 1, pedido = null, modoCotizar = false, lectura = null, archivoComp = null;
  const JUNTOS = {
    transformadores: ["ai-corta", "ai-fusible", "cr-soporte", "he-perno"],
    postes: ["cr-metal", "ai-poste", "he-ojo", "he-pica"],
    cruceros: ["ai-poste", "he-perno", "he-grillete", "ai-suspension"],
    herrajes: ["he-cuna", "he-grapa", "he-pica", "ai-carrete"],
    aislamiento: ["ai-fusible", "he-grillete", "he-ojo", "he-cuna"]
  };
  const giroUrl = {};
  function ponerGiro(el, tipo) {
    if (QUIETO || !window.EMT3D || !window.EMT3D.giro) return;
    const listo = url => { el.style.backgroundImage = `url("${url}")`; el.classList.add("gira"); };
    if (giroUrl[tipo]) { listo(giroUrl[tipo]); return; }
    window.EMT3D.giro(tipo).then(url => { giroUrl[tipo] = url; if (el.isConnected) listo(url); });
  }
  function contar(el, hasta) {
    if (!el) return;
    const desde = parseFloat(el.dataset.v || "0");
    el.dataset.v = hasta;
    if (QUIETO || desde === hasta) { el.textContent = q(hasta); return; }
    const t0 = performance.now(), dur = 650;
    const f = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = q(desde + (hasta - desde) * e);
      if (k < 1 && el.dataset.v == String(hasta)) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  let ultimoTotal = 0;
  let escena = null;
  function marcarFila(clave, desdeEscena) {
    $$(".item2").forEach(f => f.classList.toggle("elegida", f.dataset.clave === clave));
    if (desdeEscena) { const f = $(`.item2[data-clave="${CSS.escape(clave)}"]`); if (f) f.scrollIntoView({ block: "nearest", behavior: QUIETO ? "auto" : "smooth" }); }
  }
  function cerrarEscena() { if (escena) { escena.cerrar(); escena = null; } }
  const TITULOS = { 1: "Su carrito", 2: "Sus datos", 3: "Transfiera aquí", 4: "Su comprobante", 5: "Su pedido", 6: "Solicitud enviada" };

  async function abrirCarrito(p, cotizar) {
    modoCotizar = !!cotizar;
    ultimoFoco = document.activeElement;
    const mio = leerLS("emtecsa.miPedido", null);
    if (p) paso = p;
    else if (!carrito.length && !modoCotizar && mio) {
      pedido = await A.leer(mio);
      paso = pedido ? (pedido.estado === "esperando-pago" ? 3 : pedido.estado === "cotizacion" ? 6 : 5) : 1;
    } else paso = 1;
    const c = $("#carrito");
    c.hidden = false;
    ultimoTotal = 0;
    pasoAntes = paso;
    abrirVelo();
    await pintarPaso();
    requestAnimationFrame(() => c.classList.add("abierto"));
    setTimeout(() => $("#carrito [data-cerrar]").focus(), 60);
  }
  function cerrarCarrito(sinFoco) {
    const c = $("#carrito");
    if (c.hidden || c.dataset.cerrando) return;
    c.dataset.cerrando = "1";
    c.classList.remove("abierto");
    cerrarEscena();
    setTimeout(() => { c.hidden = true; delete c.dataset.cerrando; }, 420);
    if ($("#ficha").hidden) cerrarVelo();
    if (ultimoFoco && !sinFoco) ultimoFoco.focus({ preventScroll: true });
  }

  function pintarEtapas() {
    const n = Math.min(paso, 4);
    const pulso = $("#etapas-pulso");
    const e = paso >= 5 ? 1 : (n - 1) / 3;
    pulso.style.setProperty("--e", e);
    if (paso !== pasoAntes) { pulso.classList.remove("corre"); void pulso.offsetWidth; pulso.classList.add("corre"); }
    $("#carrito-paso").textContent = paso >= 5 ? (pedido ? pedido.id : "Listo") : `Paso ${n} de 4`;
    $("#carrito-t").textContent = TITULOS[paso];
    $$("#etapas li").forEach((li, i) => {
      li.classList.toggle("hecha", i + 1 < n || paso >= 5);
      li.classList.toggle("actual", i + 1 === n && paso < 5);
    });
    $("#etapas").style.setProperty("--e", paso >= 5 ? 1 : (n - 1) / 3);
  }

  async function pintarPaso() {
    pintarEtapas();
    const cuerpo = $("#carrito-cuerpo"), pie = $("#carrito-pie");
    cuerpo.scrollTop = 0;
    cuerpo.classList.toggle("atras", paso < pasoAntes);
    if (paso !== 1) cerrarEscena();
    $("#carrito").classList.toggle("con-resumen", paso >= 2 && paso <= 5);
    pasoAntes = paso;
    if (paso === 1) await pasoCarrito(cuerpo, pie);
    else if (paso === 2) pasoDatos(cuerpo, pie);
    else if (paso === 3) pasoTicket(cuerpo, pie);
    else if (paso === 4) pasoComprobante(cuerpo, pie);
    else if (paso === 5) await pasoEstado(cuerpo, pie);
    else if (paso === 6) pasoSolicitud(cuerpo, pie);
    pintarResumen();
    window.EMT.iconos($("#carrito"));
  }

  async function pedidoEnCurso() {
    const mio = leerLS("emtecsa.miPedido", null);
    if (!mio) return "";
    const p = await A.leer(mio);
    if (!p) return "";
    const txt = { "esperando-pago": "Falta subir el comprobante", "comprobante-recibido": "Revisando su depósito", "comprobante-rechazado": "Hay que subir otro comprobante", "en-marcha": "En marcha", "cotizacion": "Le enviaremos el precio" }[p.estado] || "";
    return `<button class="aviso-cotizar" type="button" data-ir-pedido style="width:100%;cursor:pointer;text-align:left;font:inherit">${ico("clock", 18)}<span><b style="color:var(--claro)">Pedido ${esc(p.id)}</b><br>${esc(txt)} · Ver</span></button>`;
  }

  function filaItem(it) {
    const p = PROD[it.id], pr = precioDe(it);
    return `<div class="item2 fila-c" data-clave="${esc(it.clave)}">
      <div class="fc-img"><img data-modelo="${p.modelo}" ${mini[p.modelo] ? `src="${mini[p.modelo]}" class="listo"` : ""} alt=""></div>
      <div class="fc-info">
        <h4>${esc(p.nombre)}</h4>
        <small>${esc(etiquetaOpciones(it.opciones) || p.detalle)}</small>
        <small class="fc-unit">${pr == null ? "Precio por cotizar" : q(pr)}</small>
        <div class="fc-acciones">
          <div class="fc-cant" role="group" aria-label="Cantidad de ${esc(p.nombre)}"><button type="button" data-mas="${esc(it.clave)}" data-d="-1" aria-label="Quitar uno">−</button><output class="rueda" aria-live="polite"><span>${it.cant}</span></output><button type="button" data-mas="${esc(it.clave)}" data-d="1" aria-label="Agregar uno">+</button></div>
          <button class="quitar" type="button" data-quitar="${esc(it.clave)}" aria-label="Quitar ${esc(p.nombre)}">${ico("trash", 17)}</button>
        </div>
      </div>
      <span class="item-monto">${pr == null ? '<span class="fc-cotizar">A cotizar</span>' : `<b data-monto>${q(pr * it.cant)}</b>`}</span>
    </div>`;
  }

  function sugerencias() {
    const ya = new Set(carrito.map(it => it.id));
    const lineas = [...new Set(carrito.map(it => PROD[it.id].linea))];
    const ids = [...new Set(lineas.flatMap(l => JUNTOS[l] || []))].filter(id => PROD[id] && !ya.has(id)).slice(0, 4);
    if (!ids.length) return "";
    return `<section class="sugeridos"><h3>También le puede servir</h3>
      <div class="sug-grilla">${ids.map(id => { const p = PROD[id]; return `<article class="sug-tarjeta">
        <div class="sug-foto"><img data-modelo="${p.modelo}" ${mini[p.modelo] ? `src="${mini[p.modelo]}" class="listo"` : ""} alt=""></div>
        <b>${esc(p.nombre)}</b>
        <small>${p.modo === "precio" ? q(p.precio) : "A cotizar"}</small>
        <button class="sug-agregar" type="button" data-sug="${id}">${p.modo === "precio" ? "Agregar" : "Cotizar"}</button>
      </article>`; }).join("")}</div></section>`;
  }

  function pieCarrito() {
    const { total, cot } = totales();
    return `<div class="pie-total"><span>Total estimado</span><b data-pie-total data-v="${total}">${q(total)}</b></div>
      <p class="pie-nota">IVA incluido. La entrega se coordina con usted.${cot ? ` Lo marcado «A cotizar» se lo enviamos con su precio.` : ""}</p>`;
  }

  async function pasoCarrito(cuerpo, pie) {
    const enCurso = await pedidoEnCurso();
    const n = totales().n;
    const nota = `<label class="e-campo nota-obra">${carrito.length ? "Algo más para su obra (opcional)" : "¿Qué necesita?"}<textarea id="nota-obra" placeholder="Ejemplo: acometida para bodega en Escuintla, transformador de 50 kVA y 6 postes de 35 pies">${esc(notaObra)}</textarea></label>`;
    $("#carrito-t").innerHTML = `Su carrito${n ? ` <span class="cuenta-c">${n}</span>` : ""}`;
    cuerpo.innerHTML = enCurso + (carrito.length
      ? `<div class="lista-c">${carrito.map(filaItem).join("")}</div>${nota}${sugerencias()}`
      : `<div class="carrito-vacio">${modoCotizar ? "<h3>Pida su cotización</h3><p>Escríbanos lo que necesita, o agregue productos del catálogo.</p>" : "<h3>Su carrito está vacío</h3><p>Agregue productos del catálogo o escriba lo que necesita.</p>"}${nota}<a class="e-btn btn-vidrio" href="#productos" data-cerrar>Ir al catálogo</a></div>`);
    const puede = carrito.length || notaObra.trim().length > 4;
    pie.innerHTML = `${carrito.length ? pieCarrito() : ""}<button class="e-btn e-btn-p" type="button" data-sig ${puede ? "" : "disabled"}>Continuar</button>`;
    const ta = $("#nota-obra");
    ta.addEventListener("input", () => { notaObra = ta.value; ponerLS("emtecsa.nota", notaObra); const b = $("[data-sig]", pie); if (b) b.disabled = !(carrito.length || notaObra.trim().length > 4); });
    $$("img[data-modelo]", cuerpo).forEach(img => { if (!mini[img.dataset.modelo]) miniDe(img.dataset.modelo).then(u => { img.src = u; img.classList.add("listo"); }); });
  }

  function actualizarItem(clave, d) {
    const it = carrito.find(x => x.clave === clave);
    if (!it) return;
    const antes = it.cant;
    it.cant = Math.max(1, Math.min(999, it.cant + d));
    if (it.cant === antes) return;
    guardarCarrito();
    const fila = $(`.item2[data-clave="${CSS.escape(clave)}"]`);
    if (!fila) return;
    $(".rueda", fila).innerHTML = `<span>${it.cant}</span>`;
    const pr = precioDe(it);
    if (pr != null) $("[data-monto]", fila).textContent = q(pr * it.cant);
    const n = totales().n;
    const cuenta = $("#carrito-t .cuenta-c");
    if (cuenta) cuenta.textContent = n;
    contar($("[data-pie-total]"), totales().total);
    pintarResumen();
  }

  function quitarItem(clave) {
    const i = carrito.findIndex(x => x.clave === clave);
    if (i < 0) return;
    const it = carrito[i];
    const fila = $(`.item2[data-clave="${CSS.escape(clave)}"]`);
    const fin = () => {
      carrito.splice(carrito.indexOf(it), 1);
      guardarCarrito();
      pintarPaso();
      aviso(`Quitó: ${PROD[it.id].nombre}`, "trash", { txt: "Deshacer", fn: () => { carrito.splice(Math.min(i, carrito.length), 0, it); guardarCarrito(); if (!$("#carrito").hidden && paso === 1) pintarPaso(); } });
    };
    if (!fila || QUIETO) { fin(); return; }
    fila.style.height = fila.offsetHeight + "px";
    requestAnimationFrame(() => { fila.classList.add("saliendo"); fila.style.height = "0px"; });
    setTimeout(fin, 320);
  }

  function deslizar(fila) {
    const t = $(".item2-tarjeta", fila);
    let x0 = null, dx = 0, activo = false;
    t.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; x0 = e.clientX; dx = 0; activo = false; });
    t.addEventListener("pointermove", e => {
      if (x0 == null) return;
      dx = Math.min(0, e.clientX - x0);
      if (!activo && dx < -8) { activo = true; t.setPointerCapture(e.pointerId); fila.classList.add("arrastra"); }
      if (activo) { t.style.transform = `translateX(${dx}px)`; fila.style.setProperty("--k", Math.min(1, -dx / (t.offsetWidth * 0.4))); }
    });
    const soltar = () => {
      if (x0 == null) return;
      x0 = null;
      fila.classList.remove("arrastra");
      if (activo && -dx > t.offsetWidth * 0.4) { t.style.transform = "translateX(-110%)"; quitarItem(fila.dataset.clave); }
      else { t.style.transform = ""; fila.style.setProperty("--k", 0); }
    };
    t.addEventListener("pointerup", soltar);
    t.addEventListener("pointercancel", soltar);
  }

  function agregarSugerido(id) {
    const p = PROD[id];
    const op = Object.fromEntries((p.opciones || []).map(o => [o.id, o.valores[0]]));
    const clave = id + "|" + JSON.stringify(op);
    if (!carrito.find(x => x.clave === clave)) carrito.push({ clave, id, opciones: op, cant: 1 });
    guardarCarrito();
    pintarPaso().then(() => { const f = $(`.item2[data-clave="${CSS.escape(clave)}"]`); if (f) f.classList.add("nuevo"); });
    aviso(`Agregado: ${p.nombre}`, "check");
  }

  function pintarResumen() {
    const caja = $("#carrito-resumen");
    if (!caja) return;
    const usarPedido = paso >= 3 && pedido;
    const items = usarPedido ? pedido.items.map(i => ({ nombre: i.nombre, cant: i.cant, precio: i.precio })) : carrito.map(it => ({ nombre: PROD[it.id].nombre, cant: it.cant, precio: precioDe(it) }));
    const total = usarPedido ? pedido.total : totales().total;
    const conPrecio = items.filter(i => i.precio != null), cot = items.filter(i => i.precio == null);
    const piezas = conPrecio.reduce((a, i) => a + i.cant, 0);
    const iva = total - total / 1.12;
    if (!items.length && !usarPedido) { caja.innerHTML = `<div class="res-papel vacio"><span class="eti">Resumen</span><p>Aquí verá el total de su pedido.</p></div>`; return; }
    const abierto = caja.querySelector(".res-papel.abierto") ? " abierto" : "";
    caja.innerHTML = `<div class="res-papel${abierto}">
      <div class="res-cab"><img src="../logo/emtecsa-logo.svg" alt="EMTECSA"><span>${usarPedido ? esc(pedido.id) : "Resumen"}</span></div>
      <div class="res-detalle">
        <div class="res-lineas">${conPrecio.map(i => `<div><span>${i.cant} × ${esc(i.nombre)}</span><span>${q(i.precio * i.cant)}</span></div>`).join("") || '<div><span>Sin productos con precio</span><span></span></div>'}</div>
        <div class="res-filas">
          <div><span>Piezas</span><b>${piezas}</b></div>
          <div><span>IVA incluido (12 %)</span><b>${q(iva)}</b></div>
          <div><span>Entrega</span><b>A coordinar</b></div>
        </div>
      </div>
      <div class="res-corte" aria-hidden="true"><i></i><i></i></div>
      <div class="res-total"><span>Total a pagar<button class="res-ver" type="button" data-res-ver>${abierto ? "Ocultar" : "Ver detalle"}</button></span><b data-total data-v="${ultimoTotal}">${q(ultimoTotal)}</b></div>
      ${cot.length ? `<div class="res-sello"><span class="sello">Por cotizar</span><ul>${cot.map(i => `<li>${i.cant} × ${esc(i.nombre)}</li>`).join("")}</ul><p>Le enviamos el precio de esto aparte.</p></div>` : ""}
    </div>`;
    contar($("[data-total]", caja), total);
    ultimoTotal = total;
  }

  function pasoDatos(cuerpo, pie) {
    const c = leerLS("emtecsa.cliente", {});
    cuerpo.innerHTML = `<form class="campos" id="form-datos" novalidate>
      <label class="e-campo" data-c="nombre">Nombre o empresa<input name="nombre" autocomplete="organization" required value="${esc(c.nombre)}"></label>
      <div class="dos">
        <label class="e-campo" data-c="telefono">Teléfono o WhatsApp<input name="telefono" type="tel" inputmode="tel" autocomplete="tel" required value="${esc(c.telefono)}" placeholder="5555 5555"></label>
        <label class="e-campo">Correo <small>Opcional</small><input name="correo" type="email" autocomplete="email" value="${esc(c.correo)}"></label>
      </div>
      <div class="dos">
        <label class="e-campo">NIT <small>Opcional</small><input name="nit" autocomplete="off" value="${esc(c.nit)}"></label>
        <label class="e-campo" data-c="depto">Departamento<select name="depto" required><option value="">Escoja…</option>${DEPTOS.map(d => `<option ${c.depto === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
      </div>
      <label class="e-campo" data-c="direccion">Dirección de entrega u obra<input name="direccion" autocomplete="street-address" required value="${esc(c.direccion)}" placeholder="Municipio, zona, referencia"></label>
    </form>`;
    const conPrecio = totales().total > 0;
    pie.innerHTML = `<div class="fila-btn"><button class="e-btn" type="button" data-atras>Volver</button><button class="e-btn e-btn-p" type="button" data-enviar-datos data-i="${conPrecio ? "wallet" : "send"}">${conPrecio ? "Ver la cuenta" : "Enviar solicitud"}</button></div>`;
  }

  function validarDatos() {
    const f = $("#form-datos");
    const d = Object.fromEntries(new FormData(f));
    let ok = true;
    const marca = (c, msj) => {
      const el = $(`[data-c="${c}"]`, f);
      el.classList.toggle("error", !!msj);
      let m = $(".msj", el);
      if (msj) { if (!m) { m = document.createElement("span"); m.className = "msj"; el.appendChild(m); } m.textContent = msj; ok = false; }
      else if (m) m.remove();
    };
    marca("nombre", d.nombre.trim().length < 3 ? "Escriba su nombre o el de la empresa." : "");
    marca("telefono", d.telefono.replace(/\D/g, "").length < 8 ? "Escriba un número de 8 dígitos." : "");
    marca("depto", d.depto ? "" : "Escoja el departamento.");
    marca("direccion", d.direccion.trim().length < 5 ? "Díganos dónde entregamos." : "");
    if (!ok) { const e = $(".error input, .error select", f); if (e) e.focus(); return null; }
    ponerLS("emtecsa.cliente", d);
    return d;
  }

  async function crearPedido(cliente) {
    const { total, cot } = totales();
    const id = await A.siguienteNumero();
    const p = {
      id, creado: new Date().toISOString(), cliente, nota: notaObra.trim(),
      items: carrito.map(it => ({ id: it.id, nombre: PROD[it.id].nombre, opciones: it.opciones, cant: it.cant, precio: precioDe(it), unidad: PROD[it.id].unidad || null })),
      total, cotizar: cot + (carrito.length ? 0 : 1),
      estado: total > 0 ? "esperando-pago" : "cotizacion",
      historia: [{ estado: total > 0 ? "esperando-pago" : "cotizacion", fecha: new Date().toISOString() }]
    };
    await A.guardar(p);
    ponerLS("emtecsa.miPedido", id);
    carrito = []; notaObra = "";
    ponerLS("emtecsa.nota", "");
    guardarCarrito();
    if (D.modoPrueba) A.avisar(total > 0 ? `Nuevo pedido ${id}` : `Nueva cotización ${id}`, `${cliente.nombre} · ${total > 0 ? q(total) : "a cotizar"}`, id);
    return p;
  }

  function filaBanco(et, v, copiar) {
    return `<div class="t-fila"><span>${et}</span><span>${v ? `<b>${esc(v)}</b>` : '<b class="pend">Por confirmar</b>'}${copiar ? `<button class="copiar" type="button" data-copiar="${esc(v || "")}" ${v ? "" : "disabled"} aria-label="Copiar ${et.toLowerCase()}">${ico("file", 16)}</button>` : ""}</span></div>`;
  }

  function pasoTicket(cuerpo, pie) {
    const b = D.banco;
    const fecha = new Date(pedido.creado).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
    const pend = !b.numero;
    cuerpo.innerHTML = `<div class="ticket" id="ticket">
      <div class="ticket-cab"><div class="arriba"><img src="../logo/emtecsa-logo-blanco.svg" alt="EMTECSA"><span class="ped">${esc(pedido.id)}</span></div>
        <div class="monto"><span>Total a transferir</span><b>${q(pedido.total)}</b></div></div>
      <div class="ticket-corte" aria-hidden="true"><i></i><i></i></div>
      <div class="ticket-cuerpo">
        ${filaBanco("Banco", b.banco)}
        ${filaBanco("Tipo de cuenta", b.tipo)}
        ${filaBanco("Número de cuenta", b.numero, true)}
        ${filaBanco("A nombre de", b.nombre)}
        ${filaBanco("Moneda", b.moneda)}
        <div class="t-nota">Escriba <b>${esc(pedido.id)}</b> en la descripción de la transferencia.${pend ? " Los datos de la cuenta se confirman pronto." : ""}</div>
        <div class="t-items">${pedido.items.filter(i => i.precio != null).map(i => `<div><span>${i.cant} × ${esc(i.nombre)}</span><span>${q(i.precio * i.cant)}</span></div>`).join("")}${pedido.cotizar ? `<div><span>${pedido.cotizar} por cotizar</span><span>Le escribimos</span></div>` : ""}<div><span>${esc(fecha)}</span><span></span></div></div>
        <div class="t-barras" aria-hidden="true"></div>
      </div></div>`;
    pie.innerHTML = `<button class="e-btn e-btn-p" type="button" data-ir="4" data-i="download">Ya transferí: subir comprobante</button>
      <button class="e-btn e-btn-salida" type="button" data-imprimir data-i="printer">Guardar o imprimir el ticket</button>`;
  }

  function pasoComprobante(cuerpo, pie) {
    lectura = null; archivoComp = null;
    const rechazo = pedido.estado === "comprobante-rechazado" && pedido.notaEmtecsa ? `<div class="veredicto ojo" style="margin-bottom:16px">${ico("bell", 18)}<span>EMTECSA dice: ${esc(pedido.notaEmtecsa)}</span></div>` : "";
    cuerpo.innerHTML = `${rechazo}<label class="zona" id="zona">${ico("download", 30)}<b>Suba la foto o captura</b><span>Imagen o PDF del comprobante de ${esc(pedido.id)} por ${q(pedido.total)}</span><input id="archivo" type="file" accept="image/*,application/pdf"></label><div id="lectura"></div>`;
    pie.innerHTML = `<div class="fila-btn"><button class="e-btn" type="button" data-ir="3">Ver el ticket</button><button class="e-btn e-btn-p" type="button" data-enviar-comp disabled data-i="send">Enviar</button></div>`;
    const zona = $("#zona"), inp = $("#archivo");
    ["dragenter", "dragover"].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add("encima"); }));
    ["dragleave", "drop"].forEach(t => zona.addEventListener(t, () => zona.classList.remove("encima")));
    zona.addEventListener("drop", e => { e.preventDefault(); if (e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]); });
    inp.addEventListener("change", () => { if (inp.files[0]) leerArchivo(inp.files[0]); });
  }

  async function leerArchivo(f) {
    if (f.size > 12 * 1024 * 1024) { aviso("El archivo pesa más de 12 MB. Suba una captura.", "x"); return; }
    archivoComp = f;
    const caja = $("#lectura");
    const esPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    let vista = esPdf ? null : URL.createObjectURL(f);
    $("#zona").hidden = true;
    caja.innerHTML = `<div class="escaneo" id="escaneo">${vista ? `<img src="${vista}" alt="Comprobante subido">` : `<div style="padding:60px;color:var(--suave)">${ico("file", 40)}</div>`}<span class="rayo"></span><span class="estado-ocr" id="estado-ocr">Leyendo el comprobante…</span></div>`;
    let r;
    try {
      if (esPdf) {
        const img = await window.EMT_OCR.pdfAImagen(f);
        vista = URL.createObjectURL(img);
        $("#escaneo").insertAdjacentHTML("afterbegin", `<img src="${vista}" alt="Comprobante subido">`);
        $("#escaneo > div") && $("#escaneo > div").remove();
      }
      r = await window.EMT_OCR.leer(f, pedido.total, p => { const e = $("#estado-ocr"); if (e) e.textContent = `Leyendo… ${Math.round(p * 100)} %`; });
    } catch (e) {
      r = { banco: null, monto: null, fecha: null, referencia: null, error: true };
    }
    $("#escaneo").classList.add("hecho");
    $("#estado-ocr").textContent = r.error ? "No se pudo leer: escriba los datos" : "Leído";
    lectura = r;
    pintarLeido();
  }

  function veredicto() {
    if (!lectura) return { ok: false, txt: "" };
    if (lectura.monto == null) return { ok: false, txt: "No encontramos el monto. Escríbalo para seguir." };
    if (Math.abs(lectura.monto - pedido.total) < 0.01) return { ok: true, txt: `El monto cuadra con su pedido: ${q(pedido.total)}.` };
    return { ok: false, txt: `El comprobante dice ${q(lectura.monto)} y su pedido es ${q(pedido.total)}. EMTECSA lo revisará.` };
  }

  function pintarLeido() {
    const campos = [["banco", "Banco", lectura.banco], ["monto", "Monto", lectura.monto != null ? q(lectura.monto) : ""], ["fecha", "Fecha", lectura.fecha], ["referencia", "Referencia o autorización", lectura.referencia]];
    const v = veredicto();
    $("#lectura").insertAdjacentHTML("beforeend", `<div class="leido" id="leido"><h4>Esto leímos. Corrija si algo no está bien.</h4>
      ${campos.map(([k, et, val], i) => `<div class="dato ${val ? "ok" : "ojo"}" style="--i:${i}">${ico(val ? "check" : "pen", 18)}<label>${et}<input data-dato="${k}" value="${esc(val || "")}" ${k === "monto" ? 'inputmode="decimal"' : ""} placeholder="${k === "monto" ? "Q 0.00" : "Escriba aquí"}"></label></div>`).join("")}
      <div class="veredicto ${v.ok ? "ok" : "ojo"}" id="veredicto">${ico(v.ok ? "check" : "bell", 18)}<span>${esc(v.txt)}</span></div></div>`);
    $$("[data-dato]").forEach(inp => inp.addEventListener("input", () => {
      const k = inp.dataset.dato;
      if (k === "monto") { const n = parseFloat(inp.value.replace(/[^\d.]/g, "")); lectura.monto = isNaN(n) ? null : n; }
      else lectura[k] = inp.value.trim() || null;
      inp.closest(".dato").className = "dato " + (inp.value.trim() ? "ok" : "ojo");
      const w = veredicto(), el = $("#veredicto");
      el.className = "veredicto " + (w.ok ? "ok" : "ojo");
      el.innerHTML = ico(w.ok ? "check" : "bell", 18) + `<span>${esc(w.txt)}</span>`;
      $("[data-enviar-comp]").disabled = lectura.monto == null;
    }));
    $("[data-enviar-comp]").disabled = lectura.monto == null;
  }

  async function enviarComprobante() {
    const b = $("[data-enviar-comp]");
    b.disabled = true;
    const v = veredicto();
    await A.guardarArchivo(pedido.id + "-comprobante", archivoComp);
    pedido.comprobante = { nombre: archivoComp.name, tipo: archivoComp.type, subido: new Date().toISOString(), leido: { banco: lectura.banco, monto: lectura.monto, fecha: lectura.fecha, referencia: lectura.referencia, cuenta: lectura.cuenta || null, pedido: lectura.pedido || null }, cuadra: v.ok, texto: (lectura.texto || "").slice(0, 4000) };
    pedido.estado = "comprobante-recibido";
    pedido.notaEmtecsa = null;
    pedido.historia.push({ estado: "comprobante-recibido", fecha: new Date().toISOString() });
    await A.guardar(pedido);
    if (D.modoPrueba) A.avisar(`Comprobante de ${pedido.id}`, `${q(lectura.monto)}${lectura.banco ? " · " + lectura.banco : ""} · ${v.ok ? "cuadra" : "revisar monto"}`, pedido.id);
    guardarCarrito();
    paso = 5;
    await pintarPaso();
  }

  async function pasoEstado(cuerpo, pie) {
    pedido = await A.leer(pedido ? pedido.id : leerLS("emtecsa.miPedido", null));
    if (!pedido) { paso = 1; return pintarPaso(); }
    const e = pedido.estado;
    const nivel = { "esperando-pago": 0, "comprobante-recibido": 1, "comprobante-rechazado": 1, "en-marcha": 3 }[e] ?? 0;
    const etapas = [
      ["Pedido recibido", new Date(pedido.creado).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }), "check"],
      ["Comprobante recibido", pedido.comprobante ? `${q(pedido.comprobante.leido.monto)}${pedido.comprobante.leido.banco ? " · " + pedido.comprobante.leido.banco : ""}` : "Pendiente", "file"],
      ["Pago confirmado", e === "en-marcha" ? "EMTECSA confirmó el depósito" : e === "comprobante-rechazado" ? "Hay que subir otro comprobante" : "EMTECSA lo está revisando", "wallet"],
      ["Trabajo en marcha", e === "en-marcha" ? "Ya estamos preparando su pedido" : "Arrancamos al confirmar", "zap"]
    ];
    const cab = e === "en-marcha"
      ? `<div class="listo-grande"><span class="check-grande">${ico("check", 30)}</span><h3>¡Arrancamos!</h3><p>Su pago está confirmado. Le escribimos al ${esc(pedido.cliente.telefono)} para coordinar la entrega.</p></div>`
      : e === "comprobante-rechazado"
        ? `<div class="veredicto ojo">${ico("bell", 18)}<span>EMTECSA pide otro comprobante${pedido.notaEmtecsa ? ": " + esc(pedido.notaEmtecsa) : "."}</span></div>`
        : `<div class="listo-grande"><span class="check-grande">${ico("check", 30)}</span><h3>Recibido</h3><p>Le avisamos aquí mismo cuando EMTECSA confirme el depósito. Puede cerrar esta ventana.</p></div>`;
    cuerpo.innerHTML = `${cab}<ol class="linea-tiempo">${etapas.map(([t, s, i], k) => {
      const cls = k <= nivel && !(e === "comprobante-rechazado" && k === 2) ? "hecho" : (k === nivel + 1 || (e === "comprobante-rechazado" && k === 2)) ? "actual" : "";
      return `<li class="${cls}"><span class="punto">${ico(cls === "hecho" ? "check" : i, 15)}</span><span><b>${t}</b><small>${esc(s)}</small></span></li>`;
    }).join("")}</ol>`;
    pie.innerHTML = e === "comprobante-rechazado"
      ? `<button class="e-btn e-btn-p" type="button" data-ir="4" data-i="download">Subir otro comprobante</button>`
      : `<button class="e-btn" type="button" data-nuevo>Hacer otro pedido</button>`;
  }

  function pasoSolicitud(cuerpo, pie) {
    cuerpo.innerHTML = `<div class="listo-grande"><span class="check-grande">${ico("check", 30)}</span><h3>Solicitud enviada</h3><p>EMTECSA revisa lo que necesita y le escribe al ${esc(pedido.cliente.telefono)} con el precio. Cuando lo acepte, le damos la cuenta para transferir.</p></div>`;
    pie.innerHTML = `<button class="e-btn" type="button" data-nuevo>Seguir viendo el catálogo</button>`;
  }

  async function clicCarrito(e) {
    const t = e.target;
    const cierre = t.closest("[data-cerrar]");
    if (cierre) { if (!cierre.matches('a[href^="#"]')) cerrarCarrito(); return; }
    const mas = t.closest("[data-mas]");
    if (mas) { actualizarItem(mas.dataset.mas, +mas.dataset.d); return; }
    const qu = t.closest("[data-quitar]");
    if (qu) { quitarItem(qu.dataset.quitar); return; }
    const sg = t.closest("[data-sug]");
    if (sg) { agregarSugerido(sg.dataset.sug); return; }
    if (t.closest("[data-res-ver]")) { const papel = $("#carrito-resumen .res-papel"); papel.classList.toggle("abierto"); t.closest("[data-res-ver]").textContent = papel.classList.contains("abierto") ? "Ocultar" : "Ver detalle"; return; }
    if (t.closest("[data-sig]")) { paso = 2; pintarPaso(); return; }
    if (t.closest("[data-atras]")) { paso = 1; pintarPaso(); return; }
    if (t.closest("[data-ir-pedido]")) { pedido = await A.leer(leerLS("emtecsa.miPedido", null)); paso = pedido.estado === "esperando-pago" ? 3 : pedido.estado === "cotizacion" ? 6 : 5; pintarPaso(); return; }
    const ir = t.closest("[data-ir]");
    if (ir) { paso = +ir.dataset.ir; pintarPaso(); return; }
    if (t.closest("[data-enviar-datos]")) {
      const d = validarDatos();
      if (!d) return;
      const b = t.closest("[data-enviar-datos]"); b.disabled = true;
      pedido = await crearPedido(d);
      paso = pedido.estado === "esperando-pago" ? 3 : 6;
      pintarPaso();
      return;
    }
    if (t.closest("[data-enviar-comp]")) { enviarComprobante(); return; }
    if (t.closest("[data-imprimir]")) { window.print(); return; }
    const cp = t.closest("[data-copiar]");
    if (cp && cp.dataset.copiar) { try { await navigator.clipboard.writeText(cp.dataset.copiar); aviso("Número de cuenta copiado"); } catch (x) { aviso("No se pudo copiar", "x"); } return; }
    if (t.closest("[data-nuevo]")) { try { localStorage.removeItem("emtecsa.miPedido"); } catch (x) {} pedido = null; guardarCarrito(); paso = 1; cerrarCarrito(); }
  }

  function encerrarFoco(e) {
    if (e.key !== "Tab") return;
    const abierto = !$("#ficha").hidden ? $("#ficha") : !$("#carrito").hidden ? $("#carrito") : null;
    if (!abierto) return;
    const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', abierto).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  function revelar() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    $$(".revela, .obra").forEach(el => io.observe(el));
  }

  function recorrido() {
    const barra = $("#barra");
    const ind = $$("[data-ind]");
    const orden = ind.map(a => a.dataset.ind);
    const secciones = orden.map(id => document.getElementById(id));
    const pill = $(".ind-movil");
    let marcada = -2;
    pill.addEventListener("click", e => {
      const b = e.target.closest("[data-ind-ir]");
      if (!b) return;
      const sig = orden[Math.max(0, marcada) + Number(b.dataset.indIr)];
      if (sig) irA("#" + sig);
    });
    const menu = $$(".menu a");
    const pasos = $("#pasos");
    const fotos = $$(".banda-foto, .final-foto");
    const heroe = $("#inicio"), heroeIn = $(".heroe-in"), caps = $$(".heroe-cap");
    if (QUIETO) heroe.classList.add("fijo");
    let pend = false;
    const marco = () => {
      pend = false;
      const vh = innerHeight, y = scrollY, max = document.documentElement.scrollHeight - vh;
      const avance = max > 0 ? y / max : 0;
      barra.classList.toggle("solida", heroe.getBoundingClientRect().bottom < 90);
      const rh = heroe.getBoundingClientRect();
      const ph = QUIETO ? 0 : Math.max(0, Math.min(1, -rh.top / Math.max(1, rh.height - vh)));
      heroeIn.classList.toggle("oculto", ph > 0.12);
      caps[0].classList.toggle("activa", ph > 0.26 && ph < 0.46);
      caps[1].classList.toggle("activa", ph > 0.56 && ph < 0.76);
      caps[2].classList.toggle("activa", ph > 0.88);
      let actual = -1;
      secciones.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.5) actual = i; });
      const enHeroe = rh.bottom > vh * 0.35;
      document.documentElement.classList.toggle("ind-ver", !enHeroe);
      pill.classList.toggle("fuera", enHeroe);
      if (actual !== marcada) {
        marcada = actual;
        const k = Math.max(0, actual);
        ind.forEach((a, i) => a.setAttribute("aria-current", String(i === actual)));
        $("[data-ind-n]").textContent = String(k + 1).padStart(2, "0");
        $("[data-ind-nombre]").textContent = ind[k].title;
        $('[data-ind-ir="-1"]', pill).disabled = k === 0;
        $('[data-ind-ir="1"]', pill).disabled = k === orden.length - 1;
      }
      menu.forEach(a => a.setAttribute("aria-current", String(actual >= 0 && a.getAttribute("href") === "#" + orden[actual])));
      const r = pasos.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / (r.height + vh * 0.2)));
      pasos.style.setProperty("--avance", QUIETO ? 1 : p.toFixed(3));
      $$(".paso", pasos).forEach((el, i, todos) => el.classList.toggle("vivo", (QUIETO ? 1 : p) >= i / (todos.length - 1) - 0.02));
      if (!QUIETO) fotos.forEach(f => { const b = f.parentElement.getBoundingClientRect(); if (b.bottom > 0 && b.top < vh) f.style.setProperty("--par", ((b.top + b.height / 2 - vh / 2) * -0.14).toFixed(1) + "px"); });
    };
    addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(marco); } }, { passive: true });
    addEventListener("resize", marco);
    marco();
  }

  function obras() {
    const caja = $("#obras-lista");
    caja.innerHTML = D.obras.map(o => `<figure class="obra"><img src="${o.foto}" alt="${esc(o.titulo)}" loading="lazy" decoding="async"><figcaption><b>${esc(o.titulo)}</b><span>${esc(o.texto)}</span></figcaption></figure>`).join("");
    const mover = d => { const w = caja.querySelector(".obra").getBoundingClientRect().width + 20; caja.scrollBy({ left: d * w, behavior: QUIETO ? "auto" : "smooth" }); };
    $("#obras-ant").onclick = () => mover(-1);
    $("#obras-sig").onclick = () => mover(1);
    caja.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); mover(1); } if (e.key === "ArrowLeft") { e.preventDefault(); mover(-1); } });
    if (!FINO) return;
    let arr = null;
    caja.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; arr = { x: e.clientX, s: caja.scrollLeft, m: false }; });
    addEventListener("pointermove", e => { if (!arr) return; const dx = e.clientX - arr.x; if (Math.abs(dx) > 4) { arr.m = true; caja.classList.add("arrastrando"); } caja.scrollLeft = arr.s - dx; });
    addEventListener("pointerup", () => { if (!arr) return; arr = null; caja.classList.remove("arrastrando"); });
  }

  function marquesina() {
    if (!$("#marquesina")) return;
    const t = D.lineas.map(l => `<span>${esc(l.nombre)}<i></i></span>`).join("");
    $("#marquesina").innerHTML = t + t + t + t;
  }

  function pie() {
    const e = D.empresa, d = [];
    if (e.telefono) d.push(`<a href="tel:${esc(e.telefono.replace(/\s/g, ""))}">${esc(e.telefono)}</a>`);
    if (e.whatsapp) d.push(`<a href="https://wa.me/${esc(e.whatsapp.replace(/\D/g, ""))}" rel="noopener">WhatsApp</a>`);
    if (e.correo) d.push(`<a href="mailto:${esc(e.correo)}">${esc(e.correo)}</a>`);
    if (e.direccion) d.push(`<span>${esc(e.direccion)}</span>`);
    $("#pie-datos").innerHTML = d.join("");
    $("#anio").textContent = new Date().getFullYear();
  }

  async function alCambiar(msg) {
    const mio = leerLS("emtecsa.miPedido", null);
    if (!msg || msg.tipo !== "pedido" || msg.id !== mio) return;
    const p = await A.leer(mio);
    if (!p) return;
    if (p.estado === "en-marcha") aviso(`EMTECSA confirmó su pago de ${p.id}. Arrancamos.`, "zap");
    if (p.estado === "comprobante-rechazado") aviso(`EMTECSA pide otro comprobante para ${p.id}.`, "bell");
    if (!$("#carrito").hidden && paso >= 5 && pedido && pedido.id === p.id) { pedido = p; pintarPaso(); }
  }

  let entradaFuera = false;
  const t0Entrada = performance.now();
  function cargar() {}
  function quitarEntrada() {
    if (entradaFuera) return;
    entradaFuera = true;
    const ent = $("#entrada");
    const abrir = () => setTimeout(() => {
      if (ent) ent.classList.add("fuera");
      document.documentElement.classList.remove("cargando");
      if (lenis) lenis.start();
      document.body.classList.add("en-escena");
      dispatchEvent(new Event("emt-entrada-fuera"));
      setTimeout(() => { if (ent) ent.remove(); }, 900);
      setTimeout(() => {
        if (!window.EMT3D) { sin3D(); return; }
        const meta = $("#lineas");
        if (!meta || !("IntersectionObserver" in window)) { generarMinis(); return; }
        const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); generarMinis(); } }, { rootMargin: "0px 0px 500px 0px" });
        io.observe(meta);
      }, 900);
    }, 220);
    const e = window.__entrada;
    if (!e || document.hidden) { abrir(); return; }
    Promise.all([e.a.finished, e.b.finished]).catch(() => {}).then(() => {
      const o = { duration: QUIETO ? 120 : 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" };
      const c = e.m.animate([{ transform: "translateX(-10%)" }, { transform: "translateX(0)" }], o);
      e.l.animate([{ transform: "translateX(10%)" }, { transform: "translateX(0)" }], o);
      c.finished.catch(() => {}).then(abrir);
    });
  }

  function iniciar3D() {
    if (!window.EMT3D) { quitarEntrada(); return; }
    try { window.EMT3D.heroe($("#lienzo-heroe")); } catch (e) { quitarEntrada(); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!QUIETO && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
      const paso = t => { lenis.raf(t); requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    }
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      const destino = document.querySelector(a.getAttribute("href"));
      if (!destino) return;
      e.preventDefault();
      if (a.hasAttribute("data-cerrar")) { cerrarCarrito(true); setTimeout(() => irA(destino), 120); return; }
      irA(destino);
    });
    $("#cinta-prueba").hidden = !D.modoPrueba;
    $("#nota-iva").textContent = "Precios con IVA incluido. Lo que dice «A cotizar» se lo enviamos con su precio." + (D.modoPrueba ? " Precios de muestra mientras EMTECSA confirma los suyos." : "");
    pintarLineas(); pintarChips(); pintarProductos(false); marquesina(); obras(); pie();
    guardarCarrito();
    window.EMT.iconos();
    revelar(); recorrido();
    addEventListener("emt-portada-lista", quitarEntrada, { once: true });
    setTimeout(quitarEntrada, 9000);
    if (lenis) lenis.stop();

    $("#chips").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) ponerFiltro(b.dataset.f); });
    let tb;
    $("#buscar").addEventListener("input", e => { clearTimeout(tb); tb = setTimeout(() => { filtro.texto = e.target.value; pintarProductos(true); }, 140); });
    $("#productos-lista").addEventListener("click", e => {
      const v = e.target.closest("[data-ver]"); if (v) { abrirFicha(v.dataset.ver); return; }
      const a = e.target.closest("[data-agregar]"); if (a) {
        agregar(a.dataset.agregar, {}, 1, a.closest(".prod").querySelector(".prod-vista"));
        a.classList.add("hecho"); a.innerHTML = ico("check", 16) + "Listo";
        setTimeout(() => { a.classList.remove("hecho"); a.innerHTML = ico("plus", 16) + "Agregar"; }, 1400);
      }
    });
    $("#abrir-carrito").addEventListener("click", () => abrirCarrito());
    $$("[data-abrir-carrito]").forEach(b => b.addEventListener("click", () => abrirCarrito()));
    $$("[data-cotizar]").forEach(b => b.addEventListener("click", () => abrirCarrito(1, true)));
    $("#carrito").addEventListener("click", clicCarrito);
    $("#ver-piezas").addEventListener("click", e => {
      const b = e.currentTarget, si = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(si));
      b.lastChild.textContent = si ? "Armar" : "Ver piezas";
      if (visor) visor.despiezar(si);
    });
    $("#ficha").addEventListener("click", e => { if (e.target.closest("[data-cerrar-ficha]") || e.target === $("#ficha")) cerrarFicha(); });
    $("#velo").addEventListener("click", () => { if (!$("#ficha").hidden) cerrarFicha(); else cerrarCarrito(); });
    addEventListener("keydown", e => {
      if (e.key === "Escape") { if (!$("#ficha").hidden) cerrarFicha(); else cerrarCarrito(); }
      encerrarFoco(e);
    });
    A.alOir(alCambiar);
    if (D.modoPrueba) A.sw();
    if (window.EMT3D) iniciar3D(); else addEventListener("emt3d-listo", iniciar3D, { once: true });
    setTimeout(() => { if (!window.EMT3D) sin3D(); }, 9000);
  });
})();
