"use strict";
(function () {
  const D = window.EMT_CATALOGO, A = window.EMT_ALMACEN, ico = window.EMT.ico;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const q = A.q;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ANCHO = matchMedia("(min-width: 1100px)");

  const ESTADOS = {
    "comprobante-recibido": { txt: "Por revisar", cls: "laton", icono: "file", tono: "" },
    "esperando-pago": { txt: "Esperando pago", cls: "aviso", icono: "clock", tono: "ambar" },
    "comprobante-rechazado": { txt: "Otro comprobante", cls: "peligro", icono: "bell", tono: "ambar" },
    "en-marcha": { txt: "En marcha", cls: "exito", icono: "zap", tono: "verde" },
    "cotizacion": { txt: "A cotizar", cls: "info", icono: "send", tono: "azul" }
  };
  const FILTROS = [["todos", "Todos"], ["comprobante-recibido", "Por revisar"], ["esperando-pago", "Esperando pago"], ["en-marcha", "En marcha"], ["cotizacion", "A cotizar"], ["comprobante-rechazado", "Otro comprobante"]];

  let pedidos = [], filtro = "todos", actual = null, nuevos = new Set(), urlFoto = null;

  function aviso(texto, icono = "check") {
    const caja = $("#avisos");
    const el = document.createElement("div");
    el.className = "aviso";
    el.innerHTML = ico(icono, 18) + `<span>${esc(texto)}</span>`;
    caja.appendChild(el);
    while (caja.children.length > 3) caja.firstChild.remove();
    setTimeout(() => { el.classList.add("sale"); setTimeout(() => el.remove(), 280); }, 3600);
  }

  function hace(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "hace un momento";
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short" });
  }

  function cifras() {
    const de = e => pedidos.filter(p => p.estado === e);
    const suma = l => l.reduce((a, p) => a + (p.total || 0), 0);
    const rev = de("comprobante-recibido"), esp = de("esperando-pago"), mar = de("en-marcha");
    $("#cifras").innerHTML = [
      ["file", "Comprobantes por revisar", rev.length, suma(rev)],
      ["clock", "Esperando pago", esp.length, suma(esp)],
      ["zap", "En marcha", mar.length, suma(mar)]
    ].map(([i, t, n, s]) => `<div class="cifra"><span>${ico(i, 16)}${t}</span><b>${n}</b><small>${q(s)}</small></div>`).join("");
  }

  function chips() {
    $("#filtro").innerHTML = FILTROS.map(([id, t]) => {
      const n = id === "todos" ? pedidos.length : pedidos.filter(p => p.estado === id).length;
      return `<button class="e-chip" type="button" data-f="${id}" aria-pressed="${filtro === id}">${t} · ${n}</button>`;
    }).join("");
  }

  function lista() {
    const l = pedidos.filter(p => filtro === "todos" || p.estado === filtro);
    $("#lista").innerHTML = l.length ? l.map(p => {
      const e = ESTADOS[p.estado] || ESTADOS["esperando-pago"];
      return `<button class="fila-ped${nuevos.has(p.id) ? " nuevo" : ""}" type="button" data-id="${esc(p.id)}" aria-current="${actual === p.id}">
        <span class="icono ${e.tono}">${ico(e.icono, 20)}</span>
        <span><b>${esc(p.id)} · ${esc(p.cliente.nombre)}</b><small>${esc(p.cliente.depto)} · ${hace(p.actualizado || p.creado)}</small></span>
        <span class="der"><span class="e-cifra">${p.total ? q(p.total) : "A cotizar"}</span><span class="e-estado ${e.cls}">${e.txt}</span></span>
      </button>`;
    }).join("") : `<div class="vacio-ped">${ico("box", 34)}<b>${pedidos.length ? "Nada con ese filtro" : "Todavía no hay pedidos"}</b><span>${pedidos.length ? "Escoja otro filtro." : "Cuando un cliente pida desde el catálogo, aparece aquí y le llega el aviso."}</span></div>`;
    nuevos.clear();
  }

  async function detalle() {
    const caja = $("#detalle");
    if (!actual) { caja.hidden = true; $("#tablero").classList.remove("con-detalle"); return; }
    const p = pedidos.find(x => x.id === actual);
    if (!p) { actual = null; return detalle(); }
    const e = ESTADOS[p.estado] || ESTADOS["esperando-pago"];
    const c = p.cliente;
    const tel = (c.telefono || "").replace(/\D/g, "");
    const wa = tel ? `https://wa.me/${tel.length === 8 ? "502" + tel : tel}?text=${encodeURIComponent(`Hola, le escribimos de EMTECSA por su pedido ${p.id}.`)}` : null;
    const filas = p.items.map(i => `<tr><td>${esc(i.nombre)}<small>${esc(Object.values(i.opciones || {}).join(" · "))}</small></td><td class="num">${i.cant}</td><td class="num">${i.precio == null ? "A cotizar" : q(i.precio * i.cant)}</td></tr>`).join("");
    let comp = "";
    if (p.comprobante) {
      const l = p.comprobante.leido || {};
      comp = `<div class="det-bloque"><h3>Comprobante</h3><div class="comp">
        <button class="comp-foto" type="button" data-ver-foto aria-label="Ver el comprobante completo"><img id="foto-comp" alt="Comprobante de ${esc(p.id)}"><span class="ojo">${ico("eye", 16)}</span></button>
        <div class="leido-ped">
          <div><span>Monto leído</span><b>${l.monto != null ? q(l.monto) : "—"}</b></div>
          <div><span>Banco</span><b>${esc(l.banco || "—")}</b></div>
          <div><span>Fecha</span><b>${esc(l.fecha || "—")}</b></div>
          <div><span>Referencia</span><b>${esc(l.referencia || "—")}</b></div>
          ${l.pedido ? `<div><span>Pedido escrito</span><b>${esc(l.pedido)}</b></div>` : ""}
          <div class="veredicto ${p.comprobante.cuadra ? "ok" : "ojo"}" style="display:flex">${ico(p.comprobante.cuadra ? "check" : "bell", 18)}<span>${p.comprobante.cuadra ? "El monto cuadra con el pedido." : `No cuadra: el pedido es ${q(p.total)}.`}</span></div>
        </div></div></div>`;
    }
    const acciones = [];
    if (p.estado === "comprobante-recibido") {
      acciones.push(`<button class="e-btn e-btn-p" type="button" data-confirmar data-i="check">Confirmar pago y arrancar</button>`);
      acciones.push(`<button class="e-btn" type="button" data-rechazar>Pedir otro comprobante</button>`);
    }
    if (wa) acciones.push(`<a class="e-btn wa" href="${wa}" target="_blank" rel="noopener" data-i="send">WhatsApp</a>`);
    caja.innerHTML = `
      <div class="det-cab"><div><span class="e-estado ${e.cls}">${e.txt}</span><h2>${esc(p.id)}</h2><p class="sub">${new Date(p.creado).toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" })}</p></div>
        <button class="e-btn redondo" type="button" data-cerrar-det aria-label="Cerrar el detalle" data-i="x"></button></div>
      ${acciones.length ? `<div class="acciones">${acciones.join("")}</div>` : ""}
      ${comp}
      <div class="det-bloque"><h3>Cliente</h3><div class="datos-cli">
        <div><span>Nombre o empresa</span><b>${esc(c.nombre)}</b></div>
        <div><span>Teléfono</span><b>${esc(c.telefono)}</b></div>
        ${c.correo ? `<div><span>Correo</span><b>${esc(c.correo)}</b></div>` : ""}
        ${c.nit ? `<div><span>NIT</span><b>${esc(c.nit)}</b></div>` : ""}
        <div class="ancho2"><span>Entrega</span><b>${esc(c.direccion)}, ${esc(c.depto)}</b></div>
      </div></div>
      <div class="det-bloque"><h3>Pedido</h3><table class="tabla-ped"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Monto</th></tr></thead><tbody>${filas || `<tr><td colspan="3">Solo nota del cliente</td></tr>`}</tbody>
        <tfoot><tr><td>Total con IVA</td><td></td><td class="num">${q(p.total)}</td></tr></tfoot></table>
        ${p.nota ? `<div class="aviso-cotizar">${ico("pen", 18)}<span>${esc(p.nota)}</span></div>` : ""}
        ${p.notaEmtecsa ? `<div class="veredicto ojo">${ico("bell", 18)}<span>Le pedimos: ${esc(p.notaEmtecsa)}</span></div>` : ""}
      </div>`;
    window.EMT.iconos(caja);
    caja.hidden = false;
    $("#tablero").classList.add("con-detalle");
    if (!ANCHO.matches) { abrirVelo(); requestAnimationFrame(() => caja.classList.add("abierto")); }
    if (p.comprobante) {
      const blob = await A.leerArchivo(p.id + "-comprobante");
      if (blob) {
        if (urlFoto) URL.revokeObjectURL(urlFoto);
        urlFoto = URL.createObjectURL(blob);
        if (/pdf/.test(blob.type)) $("#foto-comp").replaceWith(Object.assign(document.createElement("span"), { innerHTML: ico("file", 40), style: "display:grid;place-items:center;height:100%;color:#C8A96A" }));
        else $("#foto-comp").src = urlFoto;
      }
    }
  }

  function abrirVelo() { const v = $("#velo"); v.hidden = false; requestAnimationFrame(() => v.classList.add("abierto")); document.body.classList.add("trabado"); }
  function cerrarVelo() { const v = $("#velo"); v.classList.remove("abierto"); document.body.classList.remove("trabado"); setTimeout(() => { if (!v.classList.contains("abierto")) v.hidden = true; }, 300); }
  function cerrarDetalle() {
    const caja = $("#detalle");
    actual = null;
    if (!ANCHO.matches) { caja.classList.remove("abierto"); cerrarVelo(); setTimeout(() => { if (!actual) { caja.hidden = true; $("#tablero").classList.remove("con-detalle"); } }, 420); }
    else detalle();
    lista();
  }

  function dialogo(titulo, texto, campo, botonTxt) {
    return new Promise(res => {
      const d = $("#dialogo");
      d.innerHTML = `<div class="dialogo-caja"><h2 id="dialogo-t">${esc(titulo)}</h2><p>${esc(texto)}</p>${campo ? `<label class="e-campo">Qué le decimos al cliente<textarea id="dlg-txt">El monto o la cuenta no coinciden. Por favor suba el comprobante correcto.</textarea></label>` : ""}<div class="acciones"><button class="e-btn" type="button" data-no>Cancelar</button><button class="e-btn e-btn-p" type="button" data-si>${esc(botonTxt)}</button></div></div>`;
      d.hidden = false;
      const fin = v => { d.hidden = true; d.innerHTML = ""; res(v); };
      $("[data-no]", d).onclick = () => fin(null);
      $("[data-si]", d).onclick = () => fin(campo ? ($("#dlg-txt").value.trim() || "Suba otro comprobante, por favor.") : true);
      d.onclick = e => { if (e.target === d) fin(null); };
      $("[data-si]", d).focus();
    });
  }

  async function cambiarEstado(p, estado, nota) {
    p.estado = estado;
    p.notaEmtecsa = nota || null;
    p.historia = [...(p.historia || []), { estado, fecha: new Date().toISOString(), nota: nota || null }];
    await A.guardar(p);
    await cargar();
  }

  async function cargar() {
    pedidos = await A.todos();
    cifras(); chips(); lista();
    if (actual) await detalle();
  }

  async function alOir(msg) {
    if (!msg || msg.tipo !== "pedido") return;
    const antes = pedidos.find(p => p.id === msg.id);
    const cambio = !antes || antes.estado !== msg.estado;
    if (!cambio) return;
    nuevos.add(msg.id);
    await cargar();
    const p = pedidos.find(x => x.id === msg.id);
    if (!p) return;
    if (!antes) { aviso(`Nuevo pedido ${p.id} · ${p.cliente.nombre}`, "cart"); A.avisar(p.total ? `Nuevo pedido ${p.id}` : `Nueva cotización ${p.id}`, `${p.cliente.nombre} · ${p.total ? q(p.total) : "a cotizar"}`, p.id); }
    else if (p.estado === "comprobante-recibido") {
      const l = p.comprobante.leido;
      aviso(`Comprobante de ${p.id}: ${q(l.monto)}`, "file");
      A.avisar(`Comprobante de ${p.id}`, `${q(l.monto)}${l.banco ? " · " + l.banco : ""} · ${p.comprobante.cuadra ? "cuadra" : "revisar monto"}`, p.id);
    }
  }

  function botonAvisos() {
    const b = $("#avisos-btn");
    if (!("Notification" in window)) { b.hidden = true; return; }
    const on = Notification.permission === "granted";
    b.classList.toggle("activo", on);
    b.innerHTML = ico("bell", 17) + (on ? "Avisos activos" : Notification.permission === "denied" ? "Avisos bloqueados" : "Activar avisos");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    window.EMT.iconos();
    $("#nota-prueba").textContent = D.modoPrueba
      ? "Modo de prueba: aquí aparecen los pedidos hechos desde este mismo navegador. Cuando se conecte la base de EMTECSA, llegan los de todos los clientes."
      : "Pedidos y comprobantes que llegan del catálogo.";
    A.sw();
    botonAvisos();
    await cargar();

    $("#filtro").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; filtro = b.dataset.f; chips(); lista(); });
    $("#lista").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (!b) return; actual = b.dataset.id; lista(); detalle(); });
    $("#detalle").addEventListener("click", async e => {
      const p = pedidos.find(x => x.id === actual);
      if (e.target.closest("[data-cerrar-det]")) { cerrarDetalle(); return; }
      if (e.target.closest("[data-ver-foto]") && urlFoto) {
        const v = $("#visor-foto");
        v.innerHTML = `<img src="${urlFoto}" alt="Comprobante de ${esc(p.id)}"><button class="e-btn redondo" type="button" aria-label="Cerrar">${ico("x", 18)}</button>`;
        v.hidden = false;
        v.onclick = () => { v.hidden = true; };
        $("button", v).focus();
        return;
      }
      if (e.target.closest("[data-confirmar]")) {
        const ok = await dialogo(`¿Confirmar el pago de ${p.id}?`, `${q(p.comprobante.leido.monto)} de ${p.cliente.nombre.replace(/\.$/, "")}. El cliente verá «Arrancamos» al momento.`, false, "Confirmar y arrancar");
        if (ok) { await cambiarEstado(p, "en-marcha"); aviso(`${p.id} en marcha`, "zap"); }
        return;
      }
      if (e.target.closest("[data-rechazar]")) {
        const nota = await dialogo("Pedir otro comprobante", `El cliente de ${p.id} lo verá en su pedido y podrá subir otro.`, true, "Enviar");
        if (nota) { await cambiarEstado(p, "comprobante-rechazado", nota); aviso("Se le pidió otro comprobante", "bell"); }
      }
    });
    $("#velo").addEventListener("click", cerrarDetalle);
    addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!$("#visor-foto").hidden) $("#visor-foto").hidden = true;
      else if (!$("#dialogo").hidden) $("[data-no]", $("#dialogo")).click();
      else if (actual) cerrarDetalle();
    });
    $("#avisos-btn").addEventListener("click", async () => {
      if (Notification.permission === "default") await Notification.requestPermission();
      botonAvisos();
      if (Notification.permission === "granted") { await A.avisar("Avisos activos", "Aquí le avisaremos de cada pedido y comprobante.", "prueba"); aviso("Listo: le avisaremos de cada pedido"); }
      else if (Notification.permission === "denied") aviso("El navegador bloqueó los avisos. Actívelos en los ajustes del sitio.", "bell");
    });
    let instalar = null;
    addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; $("#instalar").hidden = false; });
    $("#instalar").addEventListener("click", async () => { if (!instalar) return; instalar.prompt(); await instalar.userChoice; instalar = null; $("#instalar").hidden = true; });
    A.alOir(alOir);
    ANCHO.addEventListener("change", () => { if (actual) { $("#detalle").classList.remove("abierto"); cerrarVelo(); detalle(); } });
    setInterval(lista, 60000);
  });
})();
