"use strict";
window.EMT_OBRAS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { programada: "gris", en_curso: "azul", pausada: "ambar", terminada: "verde", cancelada: "gris" };
  const CHIP_T = { pendiente: "gris", en_tramite: "azul", aprobado: "verde", rechazado: "ambar", no_aplica: "gris" };
  const DISTRIBUIDORAS = ["EEGSA", "Energuate", "Empresa municipal"];
  const GRUPOS_O = [["avance", "Avance"], ["material", "Material"], ["tramites", "Trámites"], ["dinero", "Dinero"]];
  const VIEJA_O = { etapas: "avance", bitacora: "avance", materiales: "material", checklist: "material", plano: "tramites", tramites: "tramites", cobros: "dinero", costos: "dinero" };
  const ANCLA_O = { bitacora: "b", checklist: "b", plano: "b", costos: "b" };
  let estadoF = "", buscaO = "", buscaP = "", obraP = 0;
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };
  const hoyISO = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());

  async function vista(v, sub, pest) {
    const id = Number(sub);
    if (sub && id) return ficha(v, id, pest || "etapas");
    return lista(v);
  }

  async function lista(v) {
    const { $, esc, ico } = A();
    const p = A().sesion().perfil;
    const puede = D.puede(p, "editarObra");
    const todas = await D.obras();
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Obras</h1><p class="desc">De la cotización aprobada hasta energizar: etapas, bitácora con fotos, materiales y trámites con la distribuidora.</p></div>${puede ? `<button class="s-btn lleno" type="button" data-nueva-obra>${ico("plus", 16)}Nueva obra</button>` : ""}</div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: las obras y sus fotos se guardan en esta computadora y se suben a la base de EMTECSA cuando se conecte.</span></div>`}
        <div class="herr">
          <div class="chips-f" role="group" aria-label="Estado de la obra">${[["", "Todas"], ...Object.entries(D.ESTADOS_OBRA)].map(([k, n]) => `<button type="button" data-estado-o="${k}" aria-pressed="${estadoF === k}">${esc(n)}</button>`).join("")}</div>
          <label class="busca-v"><span class="sr">Buscar obra</span>${ico("search", 16)}<input type="search" placeholder="Número, cliente, NIT, teléfono o trabajo" value="${esc(buscaO)}" data-busca-o></label>
        </div>
        <div data-res-o></div>
      </div>`;
    const res = $("[data-res-o]", v);
    const pintar = () => {
      if (!todas.length) { res.innerHTML = `<div class="vacio"><span class="icono mezcla">${ico("hammer", 24)}</span><h2>Todavía no hay obras</h2><p>Cuando una cotización quede aprobada, ábrala y toque «Crear obra». Para una emergencia se puede crear aquí a mano.</p>${puede ? `<button class="s-btn lleno" type="button" data-nueva-obra>${ico("plus", 16)}Nueva obra</button>` : ""}</div>`; return; }
      const q = A().normal(buscaO.trim()), qd = buscaO.replace(/\D/g, ""), qn = D.normalNit ? D.normalNit(buscaO) : "";
      const l = todas.filter(o => { if (estadoF && o.estado !== estadoF) return false; if (!q) return true; const c = o.cliente || {}; return A().normal([o.numero, o.titulo, c.nombre, c.razon_social, c.codigo].join(" ")).includes(q) || (qd.length >= 4 && String(c.telefono || "").replace(/\D/g, "").includes(qd)) || (qn.length >= 3 && D.normalNit && D.normalNit(c.nit || "").includes(qn)); });
      res.innerHTML = l.length ? `<div class="grupo-t">${l.length} ${l.length === 1 ? "obra" : "obras"}</div><div class="lista">${l.map(o => `
        <a class="fila" href="#/obras/${o.id}"><span class="icono mezcla">${ico("hammer", 18)}</span><span><b>${esc(o.cliente ? o.cliente.nombre : "Cliente no encontrado")}</b><small>${esc(o.numero)}${o.titulo ? " · " + esc(o.titulo) : ""}${o.etapa_actual ? " · ahora: " + esc(o.etapa_actual) : ""}</small><i class="mini-av"><span style="transform:scaleX(${o.avance / 100})"></span></i></span>
        <span class="der"><b class="e-cifra">${o.avance} %</b><small><span class="chip ${CHIP[o.estado]}">${esc(D.ESTADOS_OBRA[o.estado])}</span></small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`).join("")}</div>`
        : `<div class="vacio"><h2>Nada con ese filtro</h2><p>Pruebe con otro número, cliente o estado.</p></div>`;
    };
    pintar();
    $("[data-busca-o]", v).addEventListener("input", e => { buscaO = e.target.value; pintar(); });
    v.onclick = e => {
      const t = e.target.closest("[data-estado-o]");
      if (t) { estadoF = t.dataset.estadoO; v.querySelectorAll("[data-estado-o]").forEach(b => b.setAttribute("aria-pressed", String(b === t))); pintar(); }
      if (e.target.closest("[data-nueva-obra]")) nueva();
    };
  }

  async function camposObra(f0, plantillas, sitios) {
    const { esc } = A();
    return `
      <label class="f-campo">Trabajo<input name="titulo" value="${esc(f0.titulo || "")}" autocomplete="off"></label>
      ${sitios ? `<label class="f-campo">Sitio<select name="sitio"><option value="">Sin sitio</option>${sitios.map(s => `<option value="${s.id}" ${f0.sitio_id === s.id ? "selected" : ""}>${esc(s.nombre)}</option>`).join("")}</select></label>` : ""}
      ${plantillas ? `<label class="f-campo">Tipo de trabajo<select name="plantilla">${plantillas.map(p => `<option value="${p.id}">${esc(p.nombre)} · ${p.etapas.length} etapas</option>`).join("")}<option value="">Sin etapas, las agrego yo</option></select><small>Las etapas salen de la plantilla y después se pueden cambiar.</small></label>` : ""}
      <div class="f-fila"><label class="f-campo">Responsable<input name="responsable" value="${esc(f0.responsable || "")}" autocomplete="off" placeholder="Quién lleva la obra"></label>
      <label class="f-campo">Fecha de inicio<input type="date" name="inicio" value="${esc(f0.fecha_inicio || "")}"></label></div>`;
  }

  async function desdeCotizacion(c, k, cli) {
    const { modal, cerrarCapas, aviso, ir } = A();
    const ya = await D.obraDeCotizacion(c.id);
    if (ya) { ir("obras", ya); return; }
    const pl = await D.plantillas();
    modal({
      titulo: "Crear obra", guardarTxt: "Crear obra",
      cuerpo: `<p class="suave" style="font-size:14px">Se crea con el cliente, el sitio y los ${k.materiales.length} materiales de la cotización ${c.numero} como lo previsto.</p>` + await camposObra({ titulo: c.titulo }, pl, null),
      alGuardar: async f => {
        const id = await D.crearObra({ cotizacion_id: c.id, cliente_id: c.cliente_id, sitio_id: c.sitio_id, titulo: f.titulo.value, plantilla_id: f.plantilla.value, responsable: f.responsable.value, fecha_inicio: f.inicio.value, previstos: k.materiales.map(m => ({ material_id: m.material.id, cantidad: m.cantidad })) });
        cerrarCapas(); aviso("Obra creada."); ir("obras", id);
      }
    });
  }

  async function nueva() {
    const { modal, esc, ico, cerrarCapas, aviso, ir } = A();
    const [clientes, pl] = await Promise.all([D.clientes().then(l => l.filter(c => c.activo !== false)), D.plantillas()]);
    if (!clientes.length) { modal({ titulo: "Primero un cliente", guardarTxt: "Agregar cliente", cuerpo: `<p class="suave" style="font-size:15px">Para crear una obra hace falta el cliente.</p>`, alGuardar: async () => { cerrarCapas(); ir("clientes"); } }); return; }
    let elegido = null, full = null;
    modal({
      titulo: "Nueva obra", guardarTxt: "Crear obra",
      cuerpo: `<p class="suave" style="font-size:13.5px">Para emergencias o trabajos sin cotización. Lo normal es crearla desde la cotización aprobada.</p>
        <div class="f-campo"><span>Cliente</span><div data-o-cli></div><div data-o-buscar><span class="f-busca">${ico("search", 15)}<input data-o-busca placeholder="Buscar por nombre, NIT o teléfono" autocomplete="off" aria-label="Buscar cliente"></span><div class="f-res" data-o-res></div></div></div>
        <div data-o-sitio></div>` + await camposObra({}, pl, null),
      alAbrir: (f, m) => {
        const inp = f.querySelector("[data-o-busca]"), res = f.querySelector("[data-o-res]");
        const pintarRes = () => { const q = inp.value.toLowerCase().trim(); const l = clientes.filter(c => !q || [c.nombre, c.razon_social, c.codigo].join(" ").toLowerCase().includes(q) || (q.length > 2 && D.normalNit(c.nit).includes(D.normalNit(inp.value)))).slice(0, 6); res.innerHTML = l.length ? l.map(c => `<button type="button" data-o-c="${c.id}"><b>${esc(c.nombre)}</b><small>NIT ${esc(D.nitBonito(c.nit))}</small></button>`).join("") : `<p class="suave">Nadie con «${esc(inp.value)}».</p>`; };
        inp.addEventListener("input", pintarRes); pintarRes();
        m.addEventListener("click", async e => {
          const b = e.target.closest("[data-o-c]");
          if (b) { elegido = clientes.find(c => c.id === Number(b.dataset.oC)); full = await D.cliente(elegido.id); f.querySelector("[data-o-cli]").innerHTML = `<div class="cli-elegido"><span><b>${esc(elegido.nombre)}</b><small>NIT ${esc(D.nitBonito(elegido.nit))}</small></span><button class="s-btn suave-b chico" type="button" data-o-cambiar>Cambiar</button></div>`; f.querySelector("[data-o-buscar]").hidden = true; f.querySelector("[data-o-sitio]").innerHTML = `<label class="f-campo">Sitio<select name="sitio"><option value="">Sin sitio</option>${full.sitios.map(s => `<option value="${s.id}">${esc(s.nombre)}</option>`).join("")}</select></label>`; f.titulo.focus(); }
          if (e.target.closest("[data-o-cambiar]")) { elegido = null; f.querySelector("[data-o-cli]").innerHTML = ""; f.querySelector("[data-o-sitio]").innerHTML = ""; f.querySelector("[data-o-buscar]").hidden = false; inp.focus(); }
        });
      },
      alGuardar: async f => {
        if (!elegido) throw new Error("Escoja el cliente.");
        const id = await D.crearObra({ cliente_id: elegido.id, sitio_id: f.sitio && f.sitio.value ? Number(f.sitio.value) : null, titulo: f.titulo.value, plantilla_id: f.plantilla.value, responsable: f.responsable.value, fecha_inicio: f.inicio.value, previstos: [] });
        cerrarCapas(); aviso("Obra creada."); ir("obras", id);
      }
    });
  }

  async function ficha(v, id, pest) {
    const { $, esc, ico, aviso } = A();
    const p = A().sesion().perfil;
    const ed = D.puede(p, "editarObra"), mover = D.puede(p, "moverMaterial");
    const [o, cat] = await Promise.all([D.obra(id), D.catalogo()]);
    if (!o) { v.innerHTML = `<div class="vacio"><h2>No se encontró esa obra</h2><a class="s-btn suave-b" href="#/obras">Ver obras</a></div>`; return; }
    const cli = await D.cliente(o.cliente_id);
    if (obraP !== o.id) { obraP = o.id; buscaP = ""; }
    const sitio = cli && cli.sitios.find(s => s.id === o.sitio_id);
    const cot = o.cotizacion_id ? (await D.cotizaciones()).find(x => x.id === o.cotizacion_id) : null;
    const av = o.etapas.length ? Math.round(o.etapas.filter(e => e.hecha).length / o.etapas.length * 100) : 0;
    const verDinero = D.puede(p, "verCobros") || D.puede(p, "verGastos") || D.puede(p, "verCosto");
    const gruposVis = GRUPOS_O.filter(([k]) => k !== "dinero" || verDinero);
    const grupo = gruposVis.some(([k]) => k === pest) ? pest : (VIEJA_O[pest] && gruposVis.some(([k]) => k === VIEJA_O[pest]) ? VIEJA_O[pest] : "avance");
    const ancla = ANCLA_O[pest] || null;
    const etOrd = o.etapas.slice().sort((a, b) => a.orden - b.orden), sigE = etOrd.find(e => !e.hecha);
    const cerrada = o.estado === "terminada" || o.estado === "cancelada";
    const tocaHTML = cerrada ? "" : !etOrd.length ? (ed ? `<section class="caja toca-obra"><span><small>Lo que toca ahora</small><b>Ponerle etapas a la obra</b></span><a class="s-btn lleno" href="#/obras/${o.id}/avance">${ico("plus", 15)}Agregar etapas</a></section>` : "")
      : sigE ? `<section class="caja toca-obra"><span><small>Lo que toca ahora</small><b>${esc(sigE.nombre)}</b><small>${[sigE.inicio || sigE.fin ? `${esc(fCorta(sigE.inicio) || "…")} → ${esc(fCorta(sigE.fin) || "…")}` : "", sigE.responsable ? esc(sigE.responsable) : ""].filter(Boolean).join(" · ") || "Etapa " + (etOrd.indexOf(sigE) + 1) + " de " + etOrd.length}</small></span>${ed ? `<button class="s-btn lleno" type="button" data-toca-hecha="${sigE.id}">${ico("check", 15)}Marcar hecha</button>` : ""}</section>`
      : ed ? `<section class="caja toca-obra"><span><small>Lo que toca ahora</small><b>Todas las etapas están hechas</b></span><button class="s-btn lleno" type="button" data-toca-fin>${ico("check", 15)}Dar la obra por terminada</button></section>` : "";
    v.innerHTML = `
      <div class="cuerpo">
        <a class="volver" href="#/obras">${ico("chev", 16, 2.2)}Obras</a>
        <div class="cab-v">
          <div><span class="eti">${esc(o.numero)}${cot ? ` · <a href="#/cotizaciones/${cot.id}">desde ${esc(cot.numero)}</a>` : ""}</span><h1 class="t">${esc(o.titulo || "Sin título")}</h1><p>${cli ? `<a href="#/clientes/${cli.id}">${esc(cli.nombre)}</a>` : "Cliente no encontrado"}${sitio ? " · " + esc(sitio.nombre) : ""}${o.responsable ? " · " + esc(o.responsable) : ""}${o.fecha_inicio ? " · inicia " + esc(fCorta(o.fecha_inicio)) : ""}</p></div>
          <div class="fila-b">${ed ? `<label class="estado-sel"><span class="sr">Estado de la obra</span><select data-estado-obra>${Object.entries(D.ESTADOS_OBRA).map(([k, n]) => `<option value="${k}" ${o.estado === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label><button class="s-btn suave-b" type="button" data-ed-obra>${ico("pen", 15)}Editar</button>` : `<span class="chip ${CHIP[o.estado]}">${esc(D.ESTADOS_OBRA[o.estado])}</span>`}</div>
        </div>
        <div class="avance-o"><span><b>${av} %</b> de las etapas hechas</span><i><span style="transform:scaleX(${av / 100})"></span></i></div>
        ${tocaHTML}
        <div class="herr"><nav class="seg pest-o pest-obra" aria-label="Partes de la obra">${gruposVis.map(([k, n]) => `<a href="#/obras/${o.id}/${k}" ${grupo === k ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
        <label class="busca-v"><span class="sr">Buscar en esta pestaña</span>${ico("search", 16)}<input type="search" data-busca-pest placeholder="Buscar en esta pestaña" value="${esc(buscaP)}" autocomplete="off"></label></div>
        <div data-pest></div>
      </div>`;
    const box = $("[data-pest]", v);
    const recargar = () => A().quieto(() => ficha(v, id, grupo));
    box.innerHTML = `<div class="sub-o" data-sub="a"></div><div class="sub-o" data-sub="b"></div>`;
    const sa = box.querySelector('[data-sub="a"]'), sb2 = box.querySelector('[data-sub="b"]');
    if (grupo === "avance") { pEtapas(sa, o, ed, recargar); await pBitacora(sb2, o, ed, recargar); }
    else if (grupo === "material") { pMateriales(sa, o, cat, mover, recargar); await window.EMT_COMPRAS.tabObra(sb2, o, recargar); }
    else if (grupo === "tramites") {
      pTramites(sa, o, ed, recargar);
      if (o.cotizacion_id) await D.copiarPlanoAObra(o.cotizacion_id, o.id);
      const mini = await window.EMT_PLANOS.miniatura("obra", o.id);
      sb2.innerHTML = `<div class="sub"><h2>Plano</h2><a class="s-btn suave-b" href="#/plano/obra/${o.id}">${ico(mini ? "pen" : "plus", 15)}${mini ? "Abrir el plano" : "Dibujar el plano"}</a></div>${mini ? `<a class="caja mini-plano-c" href="#/plano/obra/${o.id}">${mini}</a>` : `<div class="vacio chico"><p>${o.cotizacion_id ? "La cotización no tiene plano." : "Todavía no hay plano."}</p></div>`}`;
    }
    else if (grupo === "dinero") {
      if (D.puede(p, "verCobros") || D.puede(p, "verGastos")) await window.EMT_COBROS.tabObra(sa, o, recargar);
      if (D.puede(p, "verCosto") || D.puede(p, "verGastos")) await window.EMT_COSTOS.tabObra(sb2, o, recargar);
    }
    if (ancla && sb2.innerHTML) setTimeout(() => { const y = sb2.getBoundingClientRect().top + scrollY - 90; scrollTo({ top: Math.max(0, y), behavior: "instant" }); }, 0);
    const filtrarP = () => { A().filtrar(box, ".lista > .fila, .tm-fila, section.dia", buscaP); [sa, sb2].forEach(b => b.trasFiltro && b.trasFiltro()); box.querySelectorAll("details.movs").forEach(d => { const q = buscaP.trim(); const vis = [...d.querySelectorAll(".lista > .fila")].some(f => !f.hidden); d.hidden = !!q && !vis; if (q && vis) d.open = true; }); };
    filtrarP();
    v.oninput = e => { if (e.target.matches("[data-busca-pest]")) { buscaP = e.target.value; filtrarP(); } };
    v.onchange = async e => {
      if (e.target.matches("[data-estado-obra]")) {
        const sel = e.target, nuevo = sel.value;
        const guardar = async () => { await D.guardarObra({ ...o, estado: nuevo }); aviso("Estado de la obra: " + D.ESTADOS_OBRA[nuevo] + "."); await recargar(); };
        if (nuevo === "terminada" || nuevo === "cancelada") {
          const faltan = o.etapas.filter(x => !x.hecha).length;
          let hecho = false;
          const m = A().modal({ titulo: nuevo === "terminada" ? "¿Dar la obra por terminada?" : "¿Cancelar la obra?", guardarTxt: nuevo === "terminada" ? "Sí, terminada" : "Sí, cancelar",
            cuerpo: `<p class="suave" style="font-size:15px">${esc(o.numero)} · ${esc(o.titulo || "")}</p>${nuevo === "terminada" && faltan ? `<p class="aviso-cot">${ico("alerta", 15)}<span>Todavía ${faltan === 1 ? "falta 1 etapa" : `faltan ${faltan} etapas`} por marcar como hechas.</span></p>` : ""}${nuevo === "cancelada" ? `<p class="suave" style="font-size:14px">Se puede volver a abrir cambiando el estado.</p>` : ""}`,
            alGuardar: async () => { hecho = true; A().cerrarCapas(); try { await guardar(); } catch (err) { aviso(err.message, "mal"); sel.value = o.estado; } } });
          if (nuevo === "cancelada") m.querySelector("[data-guardar]").classList.add("peligro-b");
          new MutationObserver((r, ob) => { if (!document.body.contains(m)) { ob.disconnect(); if (!hecho) sel.value = o.estado; } }).observe(document.body, { childList: true, subtree: true });
          return;
        }
        try { await guardar(); } catch (err) { aviso(err.message, "mal"); sel.value = o.estado; }
      }
    };
    v.onclick = async e => {
      if (e.target.closest("[data-ed-obra]")) editarObra(o, cli, recargar);
      const th = e.target.closest("[data-toca-hecha]");
      if (th) { th.disabled = true; try { const x = o.etapas.find(z => z.id === Number(th.dataset.tocaHecha)); await D.guardarEtapa(o.id, { ...x, hecha: true, fecha_hecha: null }); aviso(`«${x.nombre}» quedó hecha.`); await recargar(); } catch (err) { th.disabled = false; aviso(err.message, "mal"); } return; }
      if (e.target.closest("[data-toca-fin]")) { try { await D.guardarObra({ ...o, estado: "terminada" }); aviso("La obra quedó terminada."); await recargar(); } catch (err) { aviso(err.message, "mal"); } return; }
      for (const b of box.querySelectorAll("[data-sub]")) if (b.onclic && b.contains(e.target)) await b.onclic(e);
    };
  }

  function editarObra(o, cli, recargar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    modal({
      titulo: "Editar obra",
      cuerpo: `<label class="f-campo">Trabajo<input name="titulo" value="${esc(o.titulo || "")}" autocomplete="off"></label>
        <label class="f-campo">Sitio<select name="sitio"><option value="">Sin sitio</option>${(cli ? cli.sitios : []).map(s => `<option value="${s.id}" ${o.sitio_id === s.id ? "selected" : ""}>${esc(s.nombre)}</option>`).join("")}</select></label>
        <div class="f-fila"><label class="f-campo">Responsable<input name="responsable" value="${esc(o.responsable || "")}" autocomplete="off"></label>
        <label class="f-campo">Fecha de inicio<input type="date" name="inicio" value="${esc(o.fecha_inicio || "")}"></label></div>
        <label class="f-campo">Notas<textarea name="notas" rows="3">${esc(o.notas || "")}</textarea></label>`,
      alGuardar: async f => { await D.guardarObra({ ...o, titulo: f.titulo.value, sitio_id: f.sitio.value ? Number(f.sitio.value) : null, responsable: f.responsable.value, fecha_inicio: f.inicio.value, notas: f.notas.value }); cerrarCapas(); aviso("Obra guardada."); await recargar(); }
    });
  }

  function pEtapas(box, o, ed, recargar) {
    const { esc, ico, modal, cerrarCapas, aviso } = A();
    const et = o.etapas.slice().sort((a, b) => a.orden - b.orden);
    box.innerHTML = `
      <div class="sub"><h2>Etapas · ${et.length}</h2>${ed ? `<button class="s-btn suave-b" type="button" data-nueva-etapa>${ico("plus", 15)}Agregar etapa</button>` : ""}</div>
      ${et.length ? `<div class="lista">${et.map(e => `
        <div class="fila etapa ${e.hecha ? "hecha" : ""}" style="cursor:default"><button class="chk" type="button" ${ed ? "" : "disabled"} aria-pressed="${e.hecha}" aria-label="${e.hecha ? "Marcar como pendiente" : "Marcar como hecha"}: ${esc(e.nombre)}" data-hecha="${e.id}">${e.hecha ? ico("check", 16) : ""}</button>
          <span><b>${esc(e.nombre)}</b><small>${e.hecha ? `Hecha el ${esc(fCorta(e.fecha_hecha))}` : [e.inicio || e.fin ? `${esc(fCorta(e.inicio) || "…")} → ${esc(fCorta(e.fin) || "…")}` : "Sin fechas", e.responsable ? esc(e.responsable) : ""].filter(Boolean).join(" · ")}${!e.hecha && e.fin && e.fin < hoyISO() ? ' · <span class="falta">atrasada</span>' : ""}</small></span>
          ${ed ? `<button class="s-ib" type="button" aria-label="Editar ${esc(e.nombre)}" data-ed-etapa="${e.id}">${ico("pen", 15)}</button>` : "<span></span>"}</div>`).join("")}</div>` : `<div class="vacio chico"><p>Esta obra no tiene etapas. Agréguelas con el botón.</p></div>`}`;
    const editar = e0 => modal({
      titulo: e0 ? "Editar etapa" : "Etapa nueva",
      quitar: e0 ? () => { const m = modal({ titulo: "¿Quitar la etapa?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita la etapa «${esc(e0.nombre)}» de esta obra.</p>`, alGuardar: async () => { await D.quitarObraItem(o.id, "etapas", e0.id); cerrarCapas(); aviso("Etapa quitada."); await recargar(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
      cuerpo: `<label class="f-campo">Etapa<input name="nombre" value="${esc(e0 ? e0.nombre : "")}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">Inicio<input type="date" name="inicio" value="${esc(e0 && e0.inicio || "")}"></label><label class="f-campo">Fin<input type="date" name="fin" value="${esc(e0 && e0.fin || "")}"></label></div>
        <label class="f-campo">Responsable<input name="responsable" value="${esc(e0 && e0.responsable || o.responsable || "")}" autocomplete="off"></label>`,
      alGuardar: async f => { await D.guardarEtapa(o.id, { ...(e0 || {}), nombre: f.nombre.value, inicio: f.inicio.value, fin: f.fin.value, responsable: f.responsable.value }); cerrarCapas(); aviso(e0 ? "Etapa guardada." : "Etapa agregada."); await recargar(); }
    });
    box.onclick = async e => {
      if (e.target.closest("[data-nueva-etapa]")) editar(null);
      const ee = e.target.closest("[data-ed-etapa]"); if (ee) editar(et.find(x => x.id === Number(ee.dataset.edEtapa)));
      const h = e.target.closest("[data-hecha]");
      if (h && !h.disabled) { const x = et.find(z => z.id === Number(h.dataset.hecha)); try { await D.guardarEtapa(o.id, { ...x, hecha: !x.hecha, fecha_hecha: null }); await recargar(); } catch (err) { aviso(err.message, "mal"); } }
    };
  }

  async function pBitacora(box, o, ed, recargar) {
    const { esc, ico, modal, cerrarCapas, aviso } = A();
    const dias = o.bitacora.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.creado).localeCompare(String(a.creado)));
    const segR = D.resumenSeguridad ? await D.resumenSeguridad(o.id).catch(() => ({})) : {};
    box.innerHTML = `
      <div class="sub"><h2>Bitácora · ${dias.length}</h2>${ed ? `<button class="s-btn suave-b" type="button" data-nuevo-dia>${ico("plus", 15)}Agregar día</button>` : ""}</div>
      ${dias.length ? dias.map(b => `
        <section class="dia">
          <div class="dia-cab"><span class="icono mezcla chico">${ico("clock", 15)}</span><b>${esc(fCorta(b.fecha))}</b>${segR[b.fecha] ? `<span class="chip ${segR[b.fecha].hechos === segR[b.fecha].total ? "verde" : "ambar"} chico-c">Seguridad ${segR[b.fecha].hechos}/${segR[b.fecha].total}</span>` : ""}${b.pendiente ? '<span class="chip ambar chico-c">Por subir</span>' : ""}${ed && !(b.id < 0) ? `<div class="acc"><button class="s-ib" type="button" aria-label="Editar el día" data-ed-dia="${b.id}">${ico("pen", 15)}</button></div>` : ""}</div>
          <p>${esc(b.texto)}</p>
          ${b.personal ? `<p class="suave"><b>Personal:</b> ${esc(b.personal)}</p>` : ""}
          ${b.problemas ? `<p class="problema">${ico("alerta", 15)}<span>${esc(b.problemas)}</span></p>` : ""}
          ${b.fotos.length ? `<div class="fotos-d">${b.fotos.map((f, i) => `<button type="button" class="foto-d" data-ver-foto="${esc(f)}" aria-label="Ver foto ${i + 1}"><img data-ref="${esc(f)}" alt=""></button>`).join("")}</div>` : ""}
        </section>`).join("") : `<div class="vacio chico"><p>Todavía no hay días anotados. Cada día se anota qué se hizo, quiénes fueron, los problemas y las fotos.</p></div>`}`;
    for (const img of box.querySelectorAll("img[data-ref]")) D.fotoUrl(img.dataset.ref).then(u => { if (u) img.src = u; });
    const editar = b0 => {
      let fotos = b0 ? b0.fotos.slice() : [], nuevas = [], marcada = null;
      const quitadas = [];
      modal({
        titulo: b0 ? "Editar día" : "Día nuevo",
        quitar: b0 ? () => { const m = modal({ titulo: "¿Quitar el día?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita el día ${esc(fCorta(b0.fecha))} con sus ${b0.fotos.length} fotos. No se puede deshacer.</p>`, alGuardar: async () => { await D.quitarObraItem(o.id, "bitacora", b0.id); cerrarCapas(); aviso("Día quitado."); await recargar(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
        cuerpo: `<label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(b0 ? b0.fecha : hoyISO())}"></label>
          <label class="f-campo">Qué se hizo<textarea name="texto" rows="3">${esc(b0 ? b0.texto : "")}</textarea></label>
          <label class="f-campo">Personal<input name="personal" value="${esc(b0 && b0.personal || "")}" autocomplete="off" placeholder="Quiénes fueron"></label>
          <label class="f-campo">Problemas<textarea name="problemas" rows="2" placeholder="Si hubo algo que atrasó o falta">${esc(b0 && b0.problemas || "")}</textarea></label>
          <div class="f-campo"><span>Fotos</span><div class="fotos-d ed" data-fotos-ed></div>
          <label class="s-btn suave-b chico subir-f">${ico("plus", 14)}Agregar fotos<input type="file" accept="image/*" multiple hidden data-subir-f></label></div>`,
        alAbrir: (f, m) => {
          const caja = f.querySelector("[data-fotos-ed]");
          const pintar = () => {
            const pieza = (img, k, i, n) => `<span class="foto-d">${img}${marcada === k + i ? `<button class="s-btn peligro-b chico quitar-f" type="button" data-q${k}="${i}">Quitar</button>` : `<button class="s-ib" type="button" aria-label="Foto ${n}: quitar" data-mf="${k}${i}">${ico("pen", 13)}</button>`}</span>`;
            caja.innerHTML = fotos.map((r, i) => pieza(`<img data-r="${esc(r)}" alt="">`, "f", i, i + 1)).join("") + nuevas.map((nv, i) => pieza(`<img src="${nv.url}" alt="">`, "n", i, fotos.length + i + 1)).join("");
            caja.querySelectorAll("img[data-r]").forEach(img => D.fotoUrl(img.dataset.r).then(u => { if (u) img.src = u; }));
          };
          pintar();
          f.querySelector("[data-subir-f]").addEventListener("change", ev => { [...ev.target.files].forEach(file => nuevas.push({ file, url: URL.createObjectURL(file) })); ev.target.value = ""; pintar(); });
          m.addEventListener("click", ev => {
            const mf = ev.target.closest("[data-mf]"); if (mf) { marcada = marcada === mf.dataset.mf ? null : mf.dataset.mf; pintar(); return; }
            const qf = ev.target.closest("[data-qf]"); if (qf) { quitadas.push(fotos.splice(Number(qf.dataset.qf), 1)[0]); marcada = null; pintar(); return; }
            const qn = ev.target.closest("[data-qn]"); if (qn) { const [n] = nuevas.splice(Number(qn.dataset.qn), 1); URL.revokeObjectURL(n.url); marcada = null; pintar(); return; }
          });
        },
        alGuardar: async f => {
          aviso(nuevas.length ? "Guardando las fotos…" : "Guardando…");
          await D.guardarBitacora(o.id, { id: b0 ? b0.id : null, fecha: f.fecha.value, texto: f.texto.value, personal: f.personal.value, problemas: f.problemas.value, fotos }, nuevas.map(n => n.file));
          for (const r of quitadas) await D.quitarFoto(r);
          nuevas.forEach(n => URL.revokeObjectURL(n.url));
          cerrarCapas(); aviso(b0 ? "Día guardado." : "Día agregado a la bitácora."); await recargar();
        }
      });
    };
    box.onclick = async e => {
      if (e.target.closest("[data-nuevo-dia]")) editar(null);
      const ed2 = e.target.closest("[data-ed-dia]"); if (ed2) editar(dias.find(x => x.id === Number(ed2.dataset.edDia)));
      const vf = e.target.closest("[data-ver-foto]");
      if (vf) { const u = await D.fotoUrl(vf.dataset.verFoto); const m = modal({ titulo: "Foto", guardarTxt: "Cerrar", cuerpo: `<img class="foto-grande" src="${esc(u || "")}" alt="Foto de la obra">`, alGuardar: async () => cerrarCapas() }); m.classList.add("modal-foto"); }
    };
  }

  function pMateriales(box, o, cat, mover, recargar) {
    const { esc, ico, cant, modal, cerrarCapas, aviso } = A();
    const porId = Object.fromEntries(cat.materiales.map(m => [m.id, m]));
    const filas = {};
    const fila = id => (filas[id] = filas[id] || { material: porId[id], previsto: 0, salio: 0, regreso: 0 });
    o.previstos.forEach(p => { fila(p.material_id).previsto += Number(p.cantidad); });
    o.movimientos.forEach(m => { fila(m.material_id)[m.tipo === "salida" ? "salio" : "regreso"] += Number(m.cantidad); });
    const l = Object.entries(filas).filter(([, f]) => f.material).map(([id, f]) => ({ id: Number(id), ...f, usado: f.salio - f.regreso })).sort((a, b) => a.material.descripcion.localeCompare(b.material.descripcion, "es"));
    const movs = o.movimientos.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
    const r3 = n => Math.round(n * 1000) / 1000;
    box.innerHTML = `
      <div class="sub"><h2>Materiales</h2>${mover ? `<div class="fila-b"><button class="s-btn suave-b" type="button" data-mov="salida">${ico("arrowR", 15)}Registrar salida</button><button class="s-btn suave-b" type="button" data-mov="regreso">${ico("download", 15)}Registrar regreso</button></div>` : ""}</div>
      ${l.length ? `<div class="tabla-m"><div class="tm-cab"><span>Material</span><span>Previsto</span><span>Salió</span><span>Regresó</span><span>En la obra</span></div>${l.map(f => { const dif = r3(f.usado - f.previsto); return `
        <div class="tm-fila"><span><b>${esc(f.material.descripcion)}</b><small>${esc(f.material.codigo)}${f.previsto && dif ? ` · <span class="${dif > 0 ? "falta" : "sobra"}">${dif > 0 ? cant(dif) + " más de lo previsto" : cant(-dif) + " menos de lo previsto"}</span>` : ""}</small><small class="tm-res">Previsto ${cant(f.previsto)} · salió ${cant(f.salio)}${f.regreso ? " · regresó " + cant(f.regreso) : ""} · <b>en la obra ${cant(r3(f.usado))}</b></small></span>
        <span data-l="Previsto">${cant(f.previsto)}</span><span data-l="Salió">${cant(f.salio)}</span><span data-l="Regresó">${cant(f.regreso)}</span><span data-l="En la obra"><b>${cant(r3(f.usado))}</b></span></div>`; }).join("")}</div>` : `<div class="vacio chico"><p>${o.cotizacion_id ? "La cotización no tenía materiales." : "Esta obra no viene de una cotización, así que no tiene materiales previstos."} Registre la salida de bodega con el botón.</p></div>`}
      ${movs.length ? `<details class="caja plegable movs" data-grupo="movs"><summary><span class="pl-t"><h2>Movimientos</h2><span class="suave">${movs.length} · salidas y regresos</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div class="lista">${movs.map(m => `
        <div class="fila con-lapiz" style="cursor:default"><span class="icono ${m.tipo === "salida" ? "azul" : "verde"} chico">${ico(m.tipo === "salida" ? "arrowR" : "download", 14)}</span><span><b>${esc(porId[m.material_id] ? porId[m.material_id].descripcion : "Material")}</b><small>${m.tipo === "salida" ? "Salió" : "Regresó"} el ${esc(fCorta(m.fecha))}${m.nota ? " · " + esc(m.nota) : ""}</small></span><span class="der"><b class="e-cifra">${m.tipo === "salida" ? "" : "+"}${cant(m.cantidad)}</b></span>${mover ? `<button class="s-ib" type="button" aria-label="Corregir el movimiento de ${esc(porId[m.material_id] ? porId[m.material_id].descripcion : "material")}" data-ed-mov="${m.id}">${ico("pen", 15)}</button>` : "<span></span>"}</div>`).join("")}</div></div></details>` : ""}`;
    const registrar = tipo => {
      const base = tipo === "salida" ? l.map(f => ({ material: f.material, falta: Math.max(0, r3(f.previsto - f.usado)), cantidad: "" })) : l.filter(f => f.salio - f.regreso > 0).map(f => ({ material: f.material, falta: r3(f.salio - f.regreso), cantidad: "" }));
      let items = base;
      modal({
        titulo: tipo === "salida" ? "Salida de bodega a la obra" : "Regreso a bodega",
        guardarTxt: "Registrar",
        cuerpo: `<div class="f-fila"><label class="f-campo">Fecha<input type="date" name="fecha" value="${hoyISO()}"></label><label class="f-campo">Nota<input name="nota" autocomplete="off" placeholder="${tipo === "salida" ? "Quién lo llevó, vehículo…" : "Por qué regresó"}"></label></div>
          ${tipo === "salida" && base.some(x => x.falta > 0) ? `<button class="s-btn suave-b chico" type="button" data-llenar>Llenar con lo que falta sacar</button>` : ""}
          ${base.length ? `<label class="busca-v ancho-busca"><span class="sr">Buscar en la lista</span>${ico("search", 16)}<input type="search" data-mov-filtro placeholder="Buscar en la lista" autocomplete="off"></label>` : ""}
          <div class="f-mats" data-mov-filas></div>
          ${tipo === "salida" ? `<div class="f-agregar"><span class="f-busca">${ico("search", 15)}<input data-mov-busca placeholder="Otro material: escriba para buscar" autocomplete="off" aria-label="Agregar otro material"></span><div class="f-res" data-mov-res hidden></div></div>` : ""}`,
        alAbrir: (f, m) => {
          const caja = f.querySelector("[data-mov-filas]");
          const filtrar = () => { const q = A().normal(f.querySelector("[data-mov-filtro]")?.value || ""); let n = 0; caja.querySelectorAll(".f-mat").forEach((el, i) => { const ok = !q || A().normal(items[i].material.descripcion + " " + items[i].material.codigo).includes(q); el.hidden = !ok; if (ok) n++; }); let nada = caja.querySelector("[data-nada]"); if (!n && items.length) { if (!nada) { nada = document.createElement("p"); nada.className = "suave"; nada.dataset.nada = ""; nada.style.padding = "12px 14px"; caja.append(nada); } nada.textContent = "Nada con ese nombre en la lista."; } else nada?.remove(); };
          const pintar = () => { caja.innerHTML = items.length ? items.map((x, i) => `<div class="f-mat"><span><b>${esc(x.material.descripcion)}</b><small>${tipo === "salida" ? (x.falta ? `Falta sacar ${cant(x.falta)}` : "Ya salió lo previsto") : `En la obra: ${cant(x.falta)}`}</small></span><label class="f-cant"><span class="sr">Cantidad</span><input inputmode="decimal" value="${esc(x.cantidad)}" placeholder="0" data-mc="${i}" autocomplete="off"></label><span></span></div>`).join("") : `<p class="suave" style="padding:12px 14px">${tipo === "salida" ? "Busque abajo el material." : "No hay materiales en la obra para regresar."}</p>`; filtrar(); };
          pintar();
          f.addEventListener("input", ev => {
            if (ev.target.matches("[data-mc]")) items[Number(ev.target.dataset.mc)].cantidad = ev.target.value;
            if (ev.target.matches("[data-mov-filtro]")) filtrar();
            if (ev.target.matches("[data-mov-busca]")) {
              const q = ev.target.value.toLowerCase().trim(), res = f.querySelector("[data-mov-res]");
              if (!q) { res.hidden = true; return; }
              const ya = new Set(items.map(x => x.material.id));
              const r = cat.materiales.filter(x => !ya.has(x.id) && (x.descripcion + " " + x.codigo).toLowerCase().includes(q)).slice(0, 8);
              res.hidden = false; res.innerHTML = r.length ? r.map(x => `<button type="button" data-mov-add="${x.id}"><b>${esc(x.descripcion)}</b><small>${esc(x.codigo)}</small></button>`).join("") : `<p class="suave">No hay materiales con «${esc(ev.target.value)}».</p>`;
            }
          });
          m.addEventListener("click", ev => {
            if (ev.target.closest("[data-llenar]")) { items.forEach(x => { if (x.falta > 0) x.cantidad = String(x.falta); }); pintar(); }
            const ad = ev.target.closest("[data-mov-add]"); if (ad) { items.push({ material: porId[Number(ad.dataset.movAdd)], falta: 0, cantidad: "1" }); f.querySelector("[data-mov-busca]").value = ""; f.querySelector("[data-mov-res]").hidden = true; pintar(); }
          });
        },
        alGuardar: async f => {
          const sal = items.map(x => ({ material_id: x.material.id, cantidad: Number(String(x.cantidad).replace(/,/g, "")) || 0, tope: x.falta }));
          if (sal.some(x => x.cantidad < 0)) throw new Error("Las cantidades no pueden ser negativas.");
          if (tipo === "regreso" && sal.some(x => x.cantidad > x.tope)) throw new Error("No puede regresar más de lo que salió a la obra.");
          await D.registrarMovimientos(o.id, tipo, f.fecha.value, f.nota.value, sal);
          if (tipo === "salida" && D.compras) { try { const ids = new Set(sal.filter(x => x.cantidad > 0).map(x => x.material_id)); const cl = (await D.compras(o, cat)).filter(c => ids.has(c.material_id) && c.estado !== "recibido"); if (cl.length) await D.guardarCompras(o.id, cl.map(c => ({ ...c, estado: "recibido", fecha_pedido: c.fecha_pedido || f.fecha.value, fecha_recibido: f.fecha.value }))); } catch (er) {} }
          cerrarCapas(); aviso(tipo === "salida" ? "Salida registrada." : "Regreso registrado."); await recargar();
        }
      });
    };
    box.onclick = async e => {
      const mv = e.target.closest("[data-mov]"); if (mv) registrar(mv.dataset.mov);
      const em = e.target.closest("[data-ed-mov]");
      if (em) {
        const mv = movs.find(x => x.id === Number(em.dataset.edMov)), mat = porId[mv.material_id];
        const nombre = mat ? mat.descripcion : "Material";
        modal({
          titulo: mv.tipo === "salida" ? "Corregir salida" : "Corregir regreso",
          quitar: () => {
            const c2 = modal({ titulo: "¿Quitar el movimiento?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita ${mv.tipo === "salida" ? "la salida" : "el regreso"} de ${esc(cant(mv.cantidad))} · ${esc(nombre)} del ${esc(fCorta(mv.fecha))}.</p>`,
              alGuardar: async () => { await D.quitarObraItem(o.id, "movimientos", mv.id); cerrarCapas(); aviso("Movimiento quitado."); await recargar(); } });
            c2.querySelector("[data-guardar]").classList.add("peligro-b");
          },
          cuerpo: `<p class="suave" style="font-size:13.5px"><b style="color:var(--text)">${esc(nombre)}</b>${mat ? " · " + esc(mat.codigo) : ""}</p>
            <div class="f-fila"><label class="f-campo">Cantidad<input name="cantidad" inputmode="decimal" value="${esc(cant(mv.cantidad))}" autocomplete="off"></label><label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(mv.fecha)}"></label></div>
            <label class="f-campo">Nota<input name="nota" value="${esc(mv.nota || "")}" autocomplete="off"></label>`,
          alGuardar: async f => { await D.guardarMovimiento(o.id, mv.id, { cantidad: String(f.cantidad.value).replace(/,/g, ""), fecha: f.fecha.value, nota: f.nota.value }); cerrarCapas(); aviso("Movimiento corregido."); await recargar(); }
        });
      }
    };
  }

  function pTramites(box, o, ed, recargar) {
    const { esc, ico, modal, cerrarCapas, aviso } = A();
    const orden = Object.keys(D.PASOS);
    const tr = o.tramites.slice().sort((a, b) => orden.indexOf(a.paso) - orden.indexOf(b.paso));
    const dist = (tr.find(x => x.distribuidora) || {}).distribuidora || "";
    const conEg = !dist || /energuate/i.test(dist);
    box.innerHTML = `<div class="sub"><h2>Trámites con la distribuidora</h2></div>
      <div class="lista">${tr.map((r, i) => `
        <div class="fila tramite" style="cursor:default"><span class="paso-n ${r.estado}">${r.estado === "aprobado" ? ico("check", 15) : i + 1}</span>
          <span><b>${esc(D.PASOS[r.paso])}</b><small>${esc([r.distribuidora, r.expediente ? "exp. " + r.expediente : "", r.fecha_solicitud ? "pedido " + fCorta(r.fecha_solicitud) : "", r.fecha_resuelto ? "resuelto " + fCorta(r.fecha_resuelto) : ""].filter(Boolean).join(" · ") || "Sin datos todavía")}</small></span>
          <span class="der"><span class="chip ${CHIP_T[r.estado]}">${esc(D.ESTADOS_TRAMITE[r.estado])}</span></span>
          ${ed ? `<button class="s-ib" type="button" aria-label="Editar ${esc(D.PASOS[r.paso])}" data-ed-tr="${r.id}">${ico("pen", 15)}</button>` : "<span></span>"}</div>`).join("")}</div>${conEg ? `<div data-eg-obra></div>` : ""}`;
    if (conEg && window.EMT_ENERGUATE) window.EMT_ENERGUATE.pantalla(box.querySelector("[data-eg-obra]"), o.id, ed).catch(() => {});
    box.onclick = async e => {
      const b = e.target.closest("[data-ed-tr]"); if (!b) return;
      const r = tr.find(x => x.id === Number(b.dataset.edTr));
      const previa = tr.find(x => x.distribuidora);
      modal({
        titulo: D.PASOS[r.paso],
        cuerpo: `<div class="f-fila"><label class="f-campo">Estado<select name="estado">${Object.entries(D.ESTADOS_TRAMITE).map(([k, n]) => `<option value="${k}" ${r.estado === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
          <label class="f-campo">Distribuidora<input name="dist" list="distribuidoras" value="${esc(r.distribuidora || (previa && previa.distribuidora) || "")}" autocomplete="off"></label></div>
          <datalist id="distribuidoras">${DISTRIBUIDORAS.map(x => `<option value="${x}">`).join("")}</datalist>
          <label class="f-campo">Número de expediente o solicitud<input name="exp" value="${esc(r.expediente || "")}" autocomplete="off"></label>
          <div class="f-fila"><label class="f-campo">Fecha de solicitud<input type="date" name="sol" value="${esc(r.fecha_solicitud || "")}"></label><label class="f-campo">Fecha de respuesta<input type="date" name="res" value="${esc(r.fecha_resuelto || "")}"></label></div>
          <label class="f-campo">Notas<textarea name="notas" rows="2">${esc(r.notas || "")}</textarea></label>`,
        alGuardar: async f => { await D.guardarTramite(o.id, { id: r.id, estado: f.estado.value, distribuidora: f.dist.value, expediente: f.exp.value, fecha_solicitud: f.sol.value, fecha_resuelto: f.res.value, notas: f.notas.value }); cerrarCapas(); aviso("Trámite guardado."); await recargar(); }
      });
    };
  }

  return { vista, desdeCotizacion, CHIP };
})();
