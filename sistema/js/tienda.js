"use strict";
window.EMT_TIENDA = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const FILTROS = [["", "Todos"], ["comprobante-recibido", "Por revisar"], ["esperando-pago", "Esperando pago"], ["en-marcha", "En marcha"], ["cotizacion", "A cotizar"], ["comprobante-rechazado", "Otro comprobante"]];
  let filtro = "", busca = "", urlFoto = null;
  const hace = iso => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return "hace un momento"; if (s < 3600) return `hace ${Math.round(s / 60)} min`; if (s < 86400) return `hace ${Math.round(s / 3600)} h`; return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };
  const est = p => D.ESTADOS_TIENDA[p.estado] || D.ESTADOS_TIENDA["esperando-pago"];
  const telWa = t => { const n = String(t || "").replace(/\D/g, ""); return n ? (n.length === 8 ? "502" + n : n) : ""; };

  async function vista(v, sub) {
    const p = A().sesion().perfil;
    if (!D.puede(p, "verTienda")) { v.innerHTML = `<div class="vacio"><h2>Sin acceso a la tienda</h2><p>Esta parte la ven gerencia, administración y ventas.</p><a class="s-btn suave-b" href="#/hoy">Regresar a Hoy</a></div>`; return; }
    if (sub) return detalle(v, decodeURIComponent(sub));
    return lista(v);
  }

  async function lista(v) {
    const { $, esc, ico, Q } = A();
    let todos = [];
    try { todos = await D.pedidosTienda(); } catch (err) { todos = []; }
    const de = e => todos.filter(x => x.estado === e), suma = l => l.reduce((a, x) => a + (x.total || 0), 0);
    const rev = de("comprobante-recibido"), esp = de("esperando-pago"), mar = de("en-marcha");
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Tienda</h1><p class="desc">Los pedidos, comprobantes de pago y cotizaciones que llegan del catálogo en línea.</p></div>${botonAvisos()}</div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: aquí salen los pedidos hechos desde el catálogo en este mismo navegador.</span></div>`}
        <div class="widgets">
          <a class="w" href="#/tienda" data-ir-f="comprobante-recibido"><span class="w-cab"><span class="icono laton">${ico("file", 18)}</span></span><span class="l">Por revisar</span><b>${rev.length}</b><small>${esc(Q(suma(rev)))}</small></a>
          <a class="w" href="#/tienda" data-ir-f="esperando-pago"><span class="w-cab"><span class="icono ambar">${ico("clock", 18)}</span></span><span class="l">Esperando pago</span><b>${esp.length}</b><small>${esc(Q(suma(esp)))}</small></a>
          <a class="w" href="#/tienda" data-ir-f="en-marcha"><span class="w-cab"><span class="icono verde">${ico("zap", 18)}</span></span><span class="l">En marcha</span><b>${mar.length}</b><small>${esc(Q(suma(mar)))}</small></a>
        </div>
        <div class="herr">
          <div class="chips-f" role="group" aria-label="Estado del pedido">${FILTROS.map(([k, n]) => `<button type="button" data-f="${k}" aria-pressed="${filtro === k}">${n} · ${k ? de(k).length : todos.length}</button>`).join("")}</div>
          <label class="busca-v"><span class="sr">Buscar pedido</span>${ico("search", 16)}<input type="search" data-busca-t placeholder="Buscar pedido, cliente o teléfono" value="${esc(busca)}" autocomplete="off"></label>
        </div>
        <div data-res-t></div>
      </div>`;
    const res = $("[data-res-t]", v);
    const pintar = () => {
      const q = A().normal(busca);
      const l = todos.filter(x => (!filtro || x.estado === filtro) && (!q || A().normal([x.id, x.cliente && x.cliente.nombre, x.cliente && x.cliente.telefono, x.cliente && x.cliente.nit].join(" ")).includes(q)));
      res.innerHTML = l.length ? `<div class="lista">${l.map(x => { const e = est(x); return `<a class="fila" href="#/tienda/${encodeURIComponent(x.id)}"><span class="icono ${e.chip}">${ico(e.icono, 18)}</span><span><b>${esc(x.id)} · ${esc(x.cliente ? x.cliente.nombre : "")}</b><small>${esc([x.cliente && x.cliente.depto, hace(x.actualizado || x.creado)].filter(Boolean).join(" · "))}</small></span><span class="der"><b class="e-cifra">${x.total ? esc(Q(x.total)) : "A cotizar"}</b><small><span class="chip ${e.chip}">${esc(e.n)}</span></small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`; }).join("")}</div>`
        : `<div class="vacio"><span class="icono laton">${ico("cart", 24)}</span><h2>${todos.length ? "Nada con ese filtro" : "Todavía no hay pedidos"}</h2><p>${todos.length ? "Escoja otro estado o busque otra cosa." : "Cuando un cliente pida o suba un comprobante desde el catálogo, aparece aquí y le llega el aviso."}</p></div>`;
    };
    pintar();
    v.oninput = e => { if (e.target.matches("[data-busca-t]")) { busca = e.target.value; pintar(); } };
    v.onclick = async e => {
      const f = e.target.closest("[data-f]"); if (f) { filtro = f.dataset.f; v.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", String(b === f))); pintar(); return; }
      const w = e.target.closest("[data-ir-f]"); if (w) { e.preventDefault(); filtro = filtro === w.dataset.irF ? "" : w.dataset.irF; v.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === filtro))); const s = v.querySelector(".chips-sel select"); if (s) s.value = String(FILTROS.findIndex(([k]) => k === filtro)); pintar(); return; }
      if (e.target.closest("[data-avisos-t]")) activarAvisos();
    };
  }

  function botonAvisos() {
    const { ico } = A();
    if (!("Notification" in window) || Notification.permission === "granted") return "";
    return `<button class="s-btn suave-b" type="button" data-avisos-t>${ico("bell", 15)}${Notification.permission === "denied" ? "Avisos bloqueados" : "Activar avisos"}</button>`;
  }
  async function activarAvisos() {
    const { aviso } = A();
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") { aviso("Listo: le avisaremos de cada pedido y comprobante."); avisar("Avisos activos", "Aquí le avisaremos de cada pedido y comprobante.", "prueba"); document.querySelector("[data-avisos-t]")?.remove(); }
    else if (Notification.permission === "denied") aviso("El navegador bloqueó los avisos. Actívelos en los ajustes del sitio.", "mal");
  }
  async function avisar(titulo, cuerpo, id) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const ops = { body: cuerpo, icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: id || titulo, renotify: true, data: { url: "./#/tienda" + (id && id !== "prueba" ? "/" + encodeURIComponent(id) : "") } };
    try { const r = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null; if (r) { await r.showNotification(titulo, ops); return; } } catch (e) {}
    try { const n = new Notification(titulo, ops); n.onclick = () => { focus(); location.hash = ops.data.url.slice(1); }; } catch (e) {}
  }

  async function detalle(v, id) {
    const { $, esc, ico, Q, aviso, modal, cerrarCapas } = A();
    const p = await D.pedidoTienda(id);
    if (!p) { v.innerHTML = `<div class="vacio"><h2>No se encontró ese pedido</h2><a class="s-btn suave-b" href="#/tienda">Ver la tienda</a></div>`; return; }
    const perfil = A().sesion().perfil, puede = D.puede(perfil, "editarTienda"), cotizar = D.puede(perfil, "editarCotizacion");
    const e = est(p), c = p.cliente || {}, wa = telWa(c.telefono);
    const l = (p.comprobante && p.comprobante.leido) || {};
    const accion = [];
    if (puede && p.estado === "comprobante-recibido") accion.push(`<button class="s-btn lleno" type="button" data-confirmar>${ico("check", 16)}Confirmar pago y arrancar</button>`, `<button class="s-btn suave-b" type="button" data-rechazar>${ico("bell", 15)}Pedir otro comprobante</button>`);
    if (cotizar && (p.estado === "cotizacion" || p.items.some(i => i.precio == null))) accion.push(p.cotizacion_id ? `<a class="s-btn suave-b" href="#/cotizaciones/${p.cotizacion_id}">${ico("file", 15)}Ver la cotización</a>` : `<button class="s-btn ${p.estado === "cotizacion" ? "lleno" : "suave-b"}" type="button" data-cotizar>${ico("file", 15)}Hacer la cotización</button>`);
    if (wa) accion.push(`<a class="s-btn suave-b" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola, le escribimos de EMTECSA por su pedido ${p.id}.`)}" target="_blank" rel="noopener">${ico("send", 15)}WhatsApp</a>`);
    v.innerHTML = `
      <div class="cuerpo">
        <a class="volver" href="#/tienda">${ico("chev", 16, 2.2)}Tienda</a>
        <div class="cab-v"><div><span class="eti">${esc(new Date(p.creado).toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" }))}</span><h1 class="t">${esc(p.id)}</h1><p><span class="chip ${e.chip}">${esc(e.n)}</span> ${esc(c.nombre || "")}</p></div></div>
        ${accion.length ? `<div class="fila-b acc-t">${accion.join("")}</div>` : ""}
        ${p.notaEmtecsa ? `<p class="aviso-cot">${ico("bell", 15)}<span>Le pedimos: ${esc(p.notaEmtecsa)}</span></p>` : ""}
        ${p.comprobante ? `<section class="caja"><div class="caja-cab"><h2>Comprobante</h2><span class="chip ${p.comprobante.cuadra ? "verde" : "ambar"}">${p.comprobante.cuadra ? "Cuadra con el pedido" : "No cuadra"}</span></div>
          <div class="comp-t"><button class="comp-foto-t" type="button" data-ver-comp aria-label="Ver el comprobante completo"><span data-foto-comp>${ico("file", 28)}</span></button>
          <div class="datos-cli"><div><small>Monto leído</small><span class="e-cifra"><b>${l.monto != null ? esc(Q(l.monto)) : "—"}</b></span></div><div><small>Banco</small><span>${esc(l.banco || "—")}</span></div><div><small>Fecha</small><span>${esc(l.fecha || "—")}</span></div><div><small>Referencia</small><span>${esc(l.referencia || "—")}</span></div>${l.pedido ? `<div class="ancho2"><small>Pedido escrito en el comprobante</small><span>${esc(l.pedido)}</span></div>` : ""}</div></div>
          ${!p.comprobante.cuadra && p.total ? `<p class="aviso-cot">${ico("alerta", 15)}<span>El pedido es de ${esc(Q(p.total))}. Revise el monto antes de confirmar.</span></p>` : ""}</section>` : ""}
        <section class="caja"><h2>Lo que pidió</h2>
          <div class="lista items-t">${(p.items || []).map(i => `<div class="fila" style="cursor:default"><span class="cant-t">${esc(i.cant)}</span><span><b>${esc(i.nombre)}</b>${Object.values(i.opciones || {}).length ? `<small>${esc(Object.values(i.opciones).join(" · "))}</small>` : ""}</span><span class="der"><span class="e-cifra">${i.precio == null ? "A cotizar" : esc(Q(i.precio * i.cant))}</span></span><span></span></div>`).join("") || `<p class="suave" style="padding:14px 16px;margin:0">Solo dejó una nota.</p>`}</div>
          <div class="tot-t"><span>Total con IVA</span><b class="e-cifra">${p.total ? esc(Q(p.total)) : "A cotizar"}</b></div>
          ${p.nota ? `<p class="nota-t">${ico("pen", 15)}<span>${esc(p.nota)}</span></p>` : ""}</section>
        <section class="caja"><h2>Cliente</h2><div class="datos-cli"><div><small>Nombre o empresa</small><span>${esc(c.nombre || "—")}</span></div><div><small>Teléfono</small><span>${c.telefono ? `<a href="tel:${esc(String(c.telefono).replace(/[^\d+]/g, ""))}">${esc(c.telefono)}</a>` : "—"}</span></div><div><small>Correo</small><span>${esc(c.correo || "—")}</span></div><div><small>NIT</small><span>${esc(c.nit || "CF")}</span></div><div class="ancho2"><small>Entrega</small><span>${esc([c.direccion, c.municipio, c.depto].filter(Boolean).join(", ") || "—")}</span></div></div></section>
        ${(p.historia || []).length ? `<details class="caja plegable"><summary><span class="pl-t"><h2>Historial</h2><span class="suave">${p.historia.length} ${p.historia.length === 1 ? "paso" : "pasos"}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><ol class="hist-t">${p.historia.slice().reverse().map(h => `<li><b>${esc((D.ESTADOS_TIENDA[h.estado] || { n: h.estado }).n)}</b><small>${esc(new Date(h.fecha).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }))}${h.por ? " · " + esc(h.por) : ""}${h.nota ? " · " + esc(h.nota) : ""}</small></li>`).join("")}</ol></div></details>` : ""}
      </div>`;
    if (p.comprobante) {
      const b = await D.comprobanteTienda(p.id).catch(() => null);
      if (b) { if (urlFoto) URL.revokeObjectURL(urlFoto); urlFoto = URL.createObjectURL(b); if (!/pdf/.test(b.type)) $("[data-foto-comp]", v).innerHTML = `<img src="${urlFoto}" alt="Comprobante de ${esc(p.id)}">`; }
    }
    const cambiar = async (estado, nota, txt) => { await D.cambiarEstadoPedido(p.id, estado, nota); cerrarCapas(); aviso(txt); await A().quieto(() => detalle(v, id)); insignia(); };
    v.onclick = async ev => {
      if (ev.target.closest("[data-ver-comp]") && urlFoto) { const m = modal({ titulo: `Comprobante de ${p.id}`, guardarTxt: "Cerrar", cuerpo: /pdf/.test((await D.comprobanteTienda(p.id)).type) ? `<p><a class="s-btn suave-b" href="${urlFoto}" target="_blank" rel="noopener">${ico("eye", 15)}Abrir el PDF</a></p>` : `<img class="foto-grande" src="${urlFoto}" alt="Comprobante de ${esc(p.id)}">`, alGuardar: async () => cerrarCapas() }); m.classList.add("modal-foto"); return; }
      if (ev.target.closest("[data-confirmar]")) {
        modal({ titulo: `¿Confirmar el pago de ${p.id}?`, guardarTxt: "Confirmar y arrancar", cuerpo: `<p class="suave" style="font-size:15px">${esc(Q(l.monto != null ? l.monto : p.total))} de ${esc(c.nombre || "")}. El cliente verá «Arrancamos» en su pedido al momento.</p>`, alGuardar: async () => cambiar("en-marcha", null, `${p.id} quedó en marcha.`) });
        return;
      }
      if (ev.target.closest("[data-rechazar]")) {
        const m = modal({ titulo: "Pedir otro comprobante", guardarTxt: "Enviar al cliente", cuerpo: `<p class="suave" style="font-size:14.5px">El cliente lo verá en su pedido y podrá subir otro.</p><label class="f-campo">Qué le decimos<textarea name="nota" rows="3">El monto o la cuenta no coinciden. Por favor suba el comprobante correcto.</textarea></label>`,
          alGuardar: async f => cambiar("comprobante-rechazado", f.nota.value.trim() || "Suba otro comprobante, por favor.", "Se le pidió otro comprobante.") });
        m.querySelector("textarea").focus();
        return;
      }
      if (ev.target.closest("[data-cotizar]")) {
        modal({ titulo: "Hacer la cotización", guardarTxt: "Crear cotización", cuerpo: `<p class="suave" style="font-size:14.5px">Se crea ${esc(c.nombre || "el cliente")} en Clientes (si todavía no está) y una cotización en borrador con lo que pidió escrito en las notas. Ahí se agregan las estructuras y los precios.</p>`,
          alGuardar: async () => { const cid = await aCotizacion(p); cerrarCapas(); aviso("Cotización creada."); A().ir("cotizaciones", cid); } });
      }
    };
  }

  async function aCotizacion(p) {
    const c = p.cliente || {};
    const lista = await D.clientes();
    const nit = D.normalNit ? D.normalNit(c.nit || "") : String(c.nit || "").toUpperCase();
    let cli = lista.find(x => nit && nit !== "CF" && D.normalNit && D.normalNit(x.nit || "") === nit) || lista.find(x => A().normal(x.nombre) === A().normal(c.nombre));
    let clienteId = cli ? cli.id : null, sitioId = null;
    if (!clienteId) {
      clienteId = await D.guardarCliente({ codigo: await D.codigoNuevo(), nombre: c.nombre || "Cliente de la tienda", razon_social: c.nombre || "", nit: c.nit || "CF", tipo: "comercio", telefono: c.telefono || "", correo: c.correo || "", direccion: c.direccion || "", dias_credito: 0, limite_credito: null, notas: `Llegó por la tienda en línea (${p.id}).` });
      if (c.direccion) { try { sitioId = await D.guardarSitio({ cliente_id: clienteId, nombre: c.direccion, direccion: c.direccion, municipio: (window.EMT_GEO && window.EMT_GEO.municipio(c.depto, c.municipio)) || "", departamento: (window.EMT_GEO && window.EMT_GEO.depto(c.depto)) || "", mapa: "" }); } catch (e) { sitioId = null; } }
    }
    const cid = await D.crearCotizacion({ cliente_id: clienteId, sitio_id: sitioId, titulo: `Pedido ${p.id} de la tienda` });
    const cot = await D.cotizacion(cid);
    cot.notas = [`Pedido ${p.id} de la tienda en línea:`, ...(p.items || []).map(i => `• ${i.cant} × ${i.nombre}${Object.values(i.opciones || {}).length ? " (" + Object.values(i.opciones).join(", ") + ")" : ""}`), p.nota ? `Nota del cliente: ${p.nota}` : ""].filter(Boolean).join("\n");
    await D.guardarCotizacion(cot, D.calcularCotizacion(cot, await D.catalogo()));
    await D.ligarCotizacion(p.id, cid);
    return cid;
  }

  async function insignia() {
    const a = document.querySelector('.barra [data-sec="tienda"]'); if (!a) return;
    let n = 0;
    try { n = (await D.pedidosTienda()).filter(x => x.estado === "comprobante-recibido").length; } catch (e) {}
    const m = document.querySelector(".barra [data-menu]"); if (m) { m.dataset.pTienda = n; m.classList.toggle("con-punto", Number(m.dataset.pCot || 0) + Number(m.dataset.pEq || 0) + n > 0); m.setAttribute("aria-label", n ? `Abrir el menú, ${n} ${n === 1 ? "comprobante" : "comprobantes"} por revisar` : "Abrir el menú"); }
    let b = a.querySelector(".insignia");
    if (!n) { b && b.remove(); return; }
    if (!b) { b = document.createElement("span"); b.className = "insignia"; a.appendChild(b); }
    b.textContent = n; b.setAttribute("aria-label", `${n} por revisar`);
  }

  const conocidos = new Map();
  D.pedidosTienda().then(l => l.forEach(x => conocidos.set(x.id, x.estado))).catch(() => {});
  D.alPedido(async msg => {
    if (!msg || msg.tipo !== "pedido") return;
    const antes = conocidos.get(msg.id);
    if (antes === msg.estado) return;
    conocidos.set(msg.id, msg.estado);
    const p = await D.pedidoTienda(msg.id).catch(() => null);
    insignia();
    if (!p || !A() || !A().sesion() || !D.puede(A().sesion().perfil, "verTienda")) return;
    const { aviso, Q } = A();
    if (!antes) { aviso(`Nuevo pedido ${p.id} · ${p.cliente ? p.cliente.nombre : ""}`); avisar(p.total ? `Nuevo pedido ${p.id}` : `Nueva cotización ${p.id}`, `${p.cliente ? p.cliente.nombre : ""} · ${p.total ? Q(p.total) : "a cotizar"}`, p.id); }
    else if (p.estado === "comprobante-recibido") { const l = (p.comprobante && p.comprobante.leido) || {}; aviso(`Comprobante de ${p.id}: ${Q(l.monto || 0)}`); avisar(`Comprobante de ${p.id}`, `${Q(l.monto || 0)}${l.banco ? " · " + l.banco : ""} · ${p.comprobante && p.comprobante.cuadra ? "cuadra" : "revisar monto"}`, p.id); }
    const h = location.hash;
    if (/^#\/tienda/.test(h) && !document.querySelector(".modal")) { const v = document.getElementById("vista"); const sub = h.split("/")[2]; await A().quieto(() => vista(v, sub)); A().chipsASelect && A().chipsASelect(v); }
  });

  return { vista, insignia };
})();
