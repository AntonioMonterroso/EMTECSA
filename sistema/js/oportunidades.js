"use strict";
window.EMT_OPORTUNIDADES = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { nueva: "gris", visita: "azul", cotizando: "azul", negociacion: "ambar", ganada: "verde", perdida: "gris" };
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };
  const hoyISO = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  let modo = "tablero", filtro = null, etapaMovil = "nueva", busca = "", verCerradas = false;

  async function vista(v) {
    const { esc, ico, Q } = A();
    const p = A().sesion().perfil;
    const todasVe = p.rol === "gerencia" || p.rol === "administracion";
    if (filtro == null) filtro = todasVe ? "todas" : "mias";
    const todas = await D.oportunidades();
    const mia = x => x.responsable === p.id || (!x.responsable && (x.responsable_nombre || "").toLowerCase() === (p.nombre || "").toLowerCase());
    const q = A().normal(busca);
    const l = todas.filter(x => (filtro === "todas" || mia(x)) && (!q || A().normal([x.titulo, x.quien, x.notas, x.prospecto && x.prospecto.telefono].join(" ")).includes(q)));
    const r = D.resumenOportunidades(l);
    const tarjeta = x => {
      const venc = D.ABIERTAS_OP.includes(x.etapa) && x.cierre && x.cierre < hoyISO();
      return `<button class="op-t" type="button" data-op="${x.id}"><b>${esc(x.titulo)}</b><small>${esc(x.quien)}${x.cliente_id ? "" : " · prospecto"}</small>
        <span class="op-l"><span class="e-cifra">${x.monto != null ? esc(Q(x.monto)) : "Sin monto"}</span><span class="op-p">${esc(x.prob)} %</span></span>
        <span class="op-l"><span class="${venc ? "falta" : "suave"}">${x.cierre ? (venc ? "Cierre vencido · " : "Cierra ") + esc(fCorta(x.cierre)) : "Sin fecha de cierre"}</span>${x.responsable_nombre ? `<span class="suave">${esc(x.responsable_nombre.split(" ")[0])}</span>` : ""}</span>
        ${x.origen === "tienda" || x.origen === "licitacion" ? `<span class="chip ${x.origen === "tienda" ? "azul" : "ambar"} op-o">${esc(D.ORIGENES_OP[x.origen])}</span>` : ""}</button>`;
    };
    const col = k => { const xs = l.filter(x => x.etapa === k).sort((a, b) => String(a.cierre || "9999").localeCompare(String(b.cierre || "9999"))); return `<section class="op-col"><div class="op-col-c"><b>${esc(D.ETAPAS_OP[k].n)}</b><small>${xs.length} · ${esc(Q(xs.reduce((a, x) => a + (x.monto || 0), 0)))}</small></div>${xs.map(tarjeta).join("") || `<p class="suave op-vacia">Nada aquí</p>`}</section>`; };
    const cerradas = l.filter(x => x.etapa === "ganada" || x.etapa === "perdida").sort((a, b) => String(b.cerrada || "").localeCompare(String(a.cerrada || "")));
    const fila = x => `<button class="fila op-f" type="button" data-op="${x.id}"><span class="icono ${x.etapa === "ganada" ? "verde" : x.etapa === "perdida" ? "gris" : "laton"}">${ico(x.etapa === "ganada" ? "check" : x.etapa === "perdida" ? "x" : "chart", 16)}</span><span><b>${esc(x.titulo)}</b><small>${esc(x.quien)} · ${esc(D.ETAPAS_OP[x.etapa].n)}${D.ABIERTAS_OP.includes(x.etapa) ? ` · ${esc(x.prob)} %` : ""}${x.cierre && D.ABIERTAS_OP.includes(x.etapa) ? ` · cierra ${esc(fCorta(x.cierre))}` : x.cerrada ? ` · ${esc(fCorta(x.cerrada))}` : ""}</small></span><span class="der"><b class="e-cifra">${x.monto != null ? esc(Q(x.monto)) : "—"}</b></span></button>`;
    const pestG = v.querySelector(".pest-grupo");
    v.innerHTML = `<div class="cuerpo opv">
      <div class="cab-v"><div><h1 class="t">Oportunidades</h1><p class="desc">Los trabajos posibles antes de cotizar: de dónde vienen, en qué van y cuánto podrían dejar. Al cotizar quedan ligados a su cotización.</p></div><button class="s-btn lleno" type="button" data-op-nueva>${ico("plus", 16)}Nueva oportunidad</button></div>
      <div class="widgets op-w">
        <div class="w"><span class="w-cab"><span class="icono laton">${ico("chart", 18)}</span></span><span class="l">En el embudo</span><b>${esc(Q(r.abierto))}</b><small>${r.abiertas} ${r.abiertas === 1 ? "abierta" : "abiertas"}</small></div>
        <div class="w"><span class="w-cab"><span class="icono azul">${ico("layers", 18)}</span></span><span class="l">Ponderado</span><b>${esc(Q(r.ponderado))}</b><small>Monto por probabilidad</small></div>
        <div class="w"><span class="w-cab"><span class="icono verde">${ico("check", 18)}</span></span><span class="l">Ganado este mes</span><b>${esc(Q(r.ganadoMes))}</b><small>${r.tasa != null ? `Cierra ${r.tasa} % (90 días)` : "Sin cierres en 90 días"}</small></div>
      </div>
      <div class="herr op-herr"><div class="seg" role="group" aria-label="Ver"><button type="button" data-op-modo="tablero" aria-pressed="${modo === "tablero"}">Tablero</button><button type="button" data-op-modo="lista" aria-pressed="${modo === "lista"}">Lista</button></div>
        <div class="seg" role="group" aria-label="De quién"><button type="button" data-op-filtro="mias" aria-pressed="${filtro === "mias"}">Mías</button><button type="button" data-op-filtro="todas" aria-pressed="${filtro === "todas"}">Todas</button></div>
        <label class="busca-v"><span class="sr">Buscar oportunidad</span>${ico("search", 16)}<input type="search" data-op-busca placeholder="Buscar por trabajo, cliente o teléfono" value="${esc(busca)}" autocomplete="off"></label></div>
      ${!todas.length ? `<div class="vacio"><span class="icono gris">${ico("chart", 22)}</span><h2>Todavía no hay oportunidades</h2><p>Anote cada trabajo posible desde la primera llamada. Las solicitudes de la Tienda entran solas.</p></div>`
        : modo === "tablero" ? `<nav class="seg op-etapas" aria-label="Etapa">${D.ABIERTAS_OP.map(k => `<button type="button" data-etapa-m="${k}" aria-pressed="${etapaMovil === k}">${esc(D.ETAPAS_OP[k].n)}<small>${l.filter(x => x.etapa === k).length}</small></button>`).join("")}</nav>
          <div class="op-tablero" data-etapa-m-act="${etapaMovil}">${D.ABIERTAS_OP.map(k => `<div class="op-colw" data-col="${k}">${col(k)}</div>`).join("")}</div>
          ${cerradas.length ? `<details class="caja plegable op-cerr" ${verCerradas ? "open" : ""}><summary><span class="pl-t"><h2>Ganadas y perdidas</h2><span class="suave">${cerradas.filter(x => x.etapa === "ganada").length} ganadas · ${cerradas.filter(x => x.etapa === "perdida").length} perdidas</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div class="lista">${cerradas.map(fila).join("")}</div></div></details>` : ""}`
        : `<div class="lista">${l.slice().sort((a, b) => (D.ABIERTAS_OP.includes(a.etapa) ? 0 : 1) - (D.ABIERTAS_OP.includes(b.etapa) ? 0 : 1) || String(a.cierre || "9999").localeCompare(String(b.cierre || "9999"))).map(fila).join("") || `<p class="suave">Nada con ese filtro.</p>`}</div>`}
    </div>`;
    if (pestG) v.querySelector(".cuerpo").prepend(pestG);
    const recargar = () => A().quieto(() => vista(v));
    const cerr = v.querySelector(".op-cerr"); if (cerr) cerr.addEventListener("toggle", () => { verCerradas = cerr.open; });
    v.oninput = e => { if (e.target.matches("[data-op-busca]")) { busca = e.target.value; clearTimeout(vista._t); vista._t = setTimeout(async () => { await recargar(); const i = v.querySelector("[data-op-busca]"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } };
    v.onclick = async e => {
      if (e.target.closest("[data-op-nueva]")) { editar(null, recargar); return; }
      const m = e.target.closest("[data-op-modo]"); if (m) { modo = m.dataset.opModo; await recargar(); return; }
      const f = e.target.closest("[data-op-filtro]"); if (f) { filtro = f.dataset.opFiltro; await recargar(); return; }
      const em = e.target.closest("[data-etapa-m]"); if (em) { etapaMovil = em.dataset.etapaM; v.querySelectorAll("[data-etapa-m]").forEach(b => b.setAttribute("aria-pressed", String(b === em))); v.querySelector(".op-tablero").dataset.etapaMAct = etapaMovil; return; }
      const op = e.target.closest("[data-op]"); if (op) ver(todas.find(x => x.id === Number(op.dataset.op)), recargar);
    };
  }

  async function editar(x0, recargar) {
    const { modal, esc, cerrarCapas, aviso, campoMonto, formatoAlSalir, numero } = A();
    const p = A().sesion().perfil;
    const [clientes, usuarios] = await Promise.all([D.clientes(), D.usuarios ? D.usuarios().catch(() => []) : []]);
    const vend = usuarios.filter(u => u.activo !== false && u.rol && D.puede({ rol: u.rol }, "editarCotizacion"));
    if (!vend.some(u => u.id === p.id)) vend.unshift({ id: p.id, nombre: p.nombre });
    let cli = x0 && x0.cliente_id ? clientes.find(c => c.id === x0.cliente_id) : null;
    let esProspecto = !!(x0 ? !x0.cliente_id : false);
    const pr = (x0 && x0.prospecto) || {};
    const resp = x0 ? x0.responsable || "" : p.id;
    const m = modal({
      titulo: x0 ? "Cambiar la oportunidad" : "Nueva oportunidad", guardarTxt: "Guardar",
      quitar: x0 ? async () => { const mm = modal({ titulo: "¿Quitar la oportunidad?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita «${esc(x0.titulo)}». La cotización, si tiene, no se toca.</p>`, alGuardar: async () => { await D.quitarOportunidad(x0.id); cerrarCapas(); aviso("Oportunidad quitada."); await recargar(); } }); mm.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
      cuerpo: `<label class="f-campo">Qué trabajo es<input name="titulo" value="${esc(x0 ? x0.titulo : "")}" autocomplete="off" placeholder="Transformador 75 kVA para la bodega nueva"></label>
        <div class="seg op-quien" role="group" aria-label="Para quién"><button type="button" data-qp="cliente" aria-pressed="${!esProspecto}">Cliente</button><button type="button" data-qp="prospecto" aria-pressed="${esProspecto}">Prospecto nuevo</button></div>
        <div class="f-campo" data-q-cli ${esProspecto ? "hidden" : ""}><span>Cliente</span><div data-pick-cli></div></div>
        <div data-q-pro ${esProspecto ? "" : "hidden"}><div class="f-fila"><label class="f-campo">Nombre o empresa<input name="pnombre" value="${esc(pr.nombre || "")}" autocomplete="off"></label><label class="f-campo">Teléfono<input name="ptel" inputmode="tel" value="${esc(pr.telefono || "")}" autocomplete="off"></label></div>
          <div class="f-fila"><label class="f-campo">Correo <small>opcional</small><input name="pcorreo" type="email" value="${esc(pr.correo || "")}" autocomplete="off"></label><label class="f-campo">NIT <small>opcional</small><input name="pnit" value="${esc(pr.nit || "")}" autocomplete="off"></label></div></div>
        <div class="f-fila"><label class="f-campo">De dónde vino<select name="origen">${Object.entries(D.ORIGENES_OP).map(([k, n]) => `<option value="${k}" ${(x0 ? x0.origen : "cliente") === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
          <label class="f-campo">Quién la lleva<select name="resp">${vend.map(u => `<option value="${esc(u.id)}" ${u.id === resp ? "selected" : ""}>${esc(u.nombre)}</option>`).join("")}<option value="" ${resp ? "" : "selected"}>Nadie todavía</option></select></label></div>
        <div class="f-fila">${campoMonto("monto", "Monto estimado", x0 ? x0.monto : null, "Opcional.")}<label class="f-campo">Cierre esperado<input type="date" name="cierre" value="${esc(x0 && x0.cierre || "")}"></label></div>
        <label class="f-campo">Probabilidad (%) <small>opcional</small><input name="prob" inputmode="numeric" value="${esc(x0 && x0.probabilidad != null ? x0.probabilidad : "")}" placeholder="Sola según la etapa" autocomplete="off"></label>
        <label class="f-campo">Notas <small>opcional</small><textarea name="notas" rows="2">${esc(x0 && x0.notas || "")}</textarea></label>`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho"); formatoAlSalir(f);
        if (window.EMT_COBROS && window.EMT_COBROS.buscadorCliente) window.EMT_COBROS.buscadorCliente(f.querySelector("[data-pick-cli]"), clientes, c => { cli = c; }, cli);
        else f.querySelector("[data-pick-cli]").innerHTML = `<select name="cli"><option value="">Escoja</option>${clientes.map(c => `<option value="${c.id}" ${cli && cli.id === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select>`;
        mm.addEventListener("click", ev => { const b = ev.target.closest("[data-qp]"); if (!b) return; esProspecto = b.dataset.qp === "prospecto"; mm.querySelectorAll("[data-qp]").forEach(z => z.setAttribute("aria-pressed", String(z === b))); f.querySelector("[data-q-cli]").hidden = esProspecto; f.querySelector("[data-q-pro]").hidden = !esProspecto; });
      },
      alGuardar: async f => {
        if (!esProspecto && !cli && f.cli) cli = clientes.find(c => c.id === Number(f.cli.value)) || null;
        if (!esProspecto && !cli) throw new Error("Escoja el cliente, o toque «Prospecto nuevo».");
        const u = vend.find(z => z.id === f.resp.value);
        const id = await D.guardarOportunidad({ id: x0 ? x0.id : null, titulo: f.titulo.value, cliente_id: esProspecto ? null : cli.id, prospecto: { nombre: f.pnombre.value, telefono: f.ptel.value, correo: f.pcorreo.value, nit: f.pnit.value }, origen: f.origen.value, etapa: x0 ? x0.etapa : "nueva", monto: numero(f.monto.value), probabilidad: f.prob.value.trim(), cierre: f.cierre.value, responsable: u ? u.id : null, responsable_nombre: u ? u.nombre : null, notas: f.notas.value, cerrada: x0 ? x0.cerrada : null });
        cerrarCapas(); aviso("Oportunidad guardada."); await recargar();
        if (!x0) { const l = await D.oportunidades(); const n = l.find(z => z.id === id); if (n) ver(n, recargar); }
      }
    });
    return m;
  }

  function ver(x, recargar) {
    const { modal, esc, ico, Q, cerrarCapas, aviso } = A();
    const abierta = D.ABIERTAS_OP.includes(x.etapa);
    const pr = x.prospecto || {};
    const tel = String((pr.telefono) || (x.cliente && x.cliente.telefono) || "").replace(/\D/g, "");
    const l = (t2, v2) => `<div><span>${t2}</span><b>${v2}</b></div>`;
    const extras = [`<button class="s-btn suave-b" type="button" data-ov="editar">${ico("pen", 15)}Cambiar</button>`];
    if (tel) extras.push(`<a class="s-btn suave-b" href="https://wa.me/${tel.length === 8 ? "502" + tel : tel}" target="_blank" rel="noopener">${ico("chat", 15)}WhatsApp</a>`);
    if (abierta) extras.push(`<button class="s-btn suave-b" type="button" data-ov="ganada">${ico("check", 15)}Ganada</button><button class="s-btn suave-b" type="button" data-ov="perdida">${ico("x", 15)}Perdida</button>`);
    else extras.push(`<button class="s-btn suave-b" type="button" data-ov="reabrir">${ico("clock", 15)}Volver a abrir</button>`);
    const principal = x.cotizacion_id ? "Abrir la cotización" : abierta ? "Cotizar" : "Listo";
    const m = modal({
      titulo: x.titulo, guardarTxt: principal, extra: extras.join(""), soloUno: true,
      cuerpo: `<p class="est-estado"><span class="chip ${CHIP[x.etapa]}">${esc(D.ETAPAS_OP[x.etapa].n)}</span><span class="suave">${esc(x.quien)}${x.cliente_id ? "" : " · prospecto"}${x.etapa === "perdida" && x.motivo ? " · " + esc(x.motivo) : ""}</span></p>
        ${abierta ? `<div class="seg op-mover" role="group" aria-label="Mover a la etapa">${D.ABIERTAS_OP.map(k => `<button type="button" data-mover="${k}" aria-pressed="${x.etapa === k}">${esc(D.ETAPAS_OP[k].n)}</button>`).join("")}</div>` : ""}
        <div class="vm-prev">${l("Monto estimado", x.monto != null ? esc(Q(x.monto)) : "—")}${l("Probabilidad", `${esc(x.prob)} %${x.probabilidad == null ? " (por etapa)" : ""}`)}${l("Cierre esperado", x.cierre ? esc(fCorta(x.cierre)) : "—")}${l("De dónde vino", esc(D.ORIGENES_OP[x.origen]))}${l("Quién la lleva", esc(x.responsable_nombre || "Nadie todavía"))}${pr.telefono && !x.cliente_id ? l("Teléfono", esc(pr.telefono)) : ""}</div>
        ${x.notas ? `<p class="suave" style="margin:0;font-size:13.5px">${esc(x.notas)}</p>` : ""}`,
      alGuardar: async () => {
        if (x.cotizacion_id) { cerrarCapas(); location.hash = `#/cotizaciones/${x.cotizacion_id}`; return; }
        if (!abierta) { cerrarCapas(); return; }
        if (!x.cliente_id) { crearCliente(x, recargar); return; }
        const cot = await D.cotizarOportunidad(x); cerrarCapas(); aviso("Cotización creada y ligada a la oportunidad."); location.hash = `#/cotizaciones/${cot}`;
      }
    });
    m.addEventListener("click", async ev => {
      const mv = ev.target.closest("[data-mover]"); if (mv && mv.dataset.mover !== x.etapa) { try { await D.moverOportunidad(x.id, mv.dataset.mover); cerrarCapas(); aviso(`Pasó a ${D.ETAPAS_OP[mv.dataset.mover].n}.`); await recargar(); } catch (er) { aviso(er.message, "mal"); } return; }
      const b = ev.target.closest("[data-ov]"); if (!b) return;
      if (b.dataset.ov === "editar") editar(x, recargar);
      if (b.dataset.ov === "ganada") { await D.moverOportunidad(x.id, "ganada"); cerrarCapas(); aviso("¡Ganada!"); await recargar(); }
      if (b.dataset.ov === "reabrir") { await D.moverOportunidad(x.id, "negociacion"); cerrarCapas(); aviso("Volvió a negociación."); await recargar(); }
      if (b.dataset.ov === "perdida") {
        const MOT = D.MOTIVOS_PERDIDA || { precio: "Precio", tiempo: "Tiempo de entrega", otro: "Se fue con otro", otra: "Otra razón" };
        modal({ titulo: "¿Por qué se perdió?", guardarTxt: "Marcar perdida",
          cuerpo: `<label class="f-campo">Motivo<select name="mot">${Object.values(MOT).map(n => `<option>${esc(n)}</option>`).join("")}</select></label><label class="f-campo">Detalle <small>opcional</small><input name="det" autocomplete="off" placeholder="Con quién se fue, cuánto le cobraron…"></label>`,
          alGuardar: async f => { await D.moverOportunidad(x.id, "perdida", f.mot.value + (f.det.value.trim() ? ": " + f.det.value.trim() : "")); cerrarCapas(); aviso("Marcada como perdida."); await recargar(); } });
      }
    });
  }

  function crearCliente(x, recargar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const pr = x.prospecto || {};
    modal({ titulo: "Crear la ficha del cliente", guardarTxt: "Crear y cotizar",
      cuerpo: `<p class="suave" style="font-size:14px;margin:0">Para cotizar, el prospecto pasa a ser cliente. Revise sus datos.</p>
        <label class="f-campo">Nombre o empresa<input name="nombre" value="${esc(pr.nombre || "")}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">NIT<input name="nit" value="${esc(pr.nit || "CF")}" autocomplete="off"><small>CF si no tiene.</small></label><label class="f-campo">Teléfono<input name="tel" inputmode="tel" value="${esc(pr.telefono || "")}" autocomplete="off"></label></div>
        <label class="f-campo">Correo <small>opcional</small><input name="correo" type="email" value="${esc(pr.correo || "")}" autocomplete="off"></label>`,
      alGuardar: async f => { const cot = await D.cotizarOportunidad(x, { nombre: f.nombre.value, nit: f.nit.value, telefono: f.tel.value, correo: f.correo.value }); cerrarCapas(); aviso("Cliente creado y cotización lista."); location.hash = `#/cotizaciones/${cot}`; } });
  }

  async function avisosHoy(p) {
    if (!D.puede(p, "editarCotizacion")) return [];
    const l = await D.oportunidades().catch(() => []);
    const todasVe = p.rol === "gerencia" || p.rol === "administracion";
    const h = hoyISO();
    return l.filter(x => D.ABIERTAS_OP.includes(x.etapa) && x.cierre && x.cierre < h && (todasVe || x.responsable === p.id))
      .map(x => ({ c: "ambar", i: "chart", t: `Oportunidad sin cerrar: ${x.titulo}`, d: `${x.quien} · el cierre era el ${fCorta(x.cierre)}${x.responsable_nombre ? " · " + x.responsable_nombre : ""}`, chip: "Vencida", accion: "Ver", h: "#/oportunidades" }));
  }

  return { vista, avisosHoy };
})();
