"use strict";
window.EMT_ESTIMACIONES = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { borrador: "gris", enviada: "azul", aprobada: "verde", anulada: "gris" };
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };
  const hoyISO = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const pctTxt = n => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}\u00a0%`;
  const telDe = t => { const d = String(t || "").replace(/\D/g, ""); return d ? (d.length === 8 ? "502" + d : d) : ""; };
  const nombreEst = e => `Estimación ${e.correlativo} · ${e.numero}`;

  async function seccion(box, o, ctx) {
    const { esc, ico, Q } = A();
    const edC = D.puede(A().sesion().perfil, "registrarPago");
    const x = await D.estimacionesDe(o);
    if (o.cotizacion_id && D.pendientesEnlace && D.puede(A().sesion().perfil, "verEnlaces")) {
      const ids = (await D.pendientesEnlace().catch(() => [])).filter(z => z.tipo === "estimacion" && z.cotizacion_id === o.cotizacion_id).map(z => z.id);
      if (ids.length) { await D.atenderEventos(ids).catch(() => {}); if (window.EMT_ENLACES) window.EMT_ENLACES.insignia(); }
    }
    if (!x.cfg) {
      box.innerHTML = edC ? `<div class="sub"><h2>Estimaciones de avance</h2></div>
        <div class="vacio chico est-vacio"><p>Para obras que se cobran según lo avanzado. Cada estimación descuenta su parte del anticipo y la garantía retenida, y el cliente la aprueba con su firma en su enlace.</p><button class="s-btn suave-b" type="button" data-est-activar>${ico("chart", 15)}Cobrar por estimaciones</button></div>` : "";
      box.onclick = e => { if (e.target.closest("[data-est-activar]")) configurar(o, x, ctx); };
      return;
    }
    const partePor = Object.fromEntries(ctx.partes.map(p => [p.id, p]));
    const gar = x.cfg.garantia_parte_id ? partePor[x.cfg.garantia_parte_id] : null;
    const puedeGar = edC && x.retenido > 0 && !x.cfg.garantia_parte_id && !x.pendiente && (x.pctAcum >= 100 || o.estado === "terminada");
    const falta = Math.max(0, Math.round((x.cfg.contrato - x.estimado) * 100) / 100);
    const fila = e => {
      const p = e.parte_id ? partePor[e.parte_id] : null;
      const chip = e.estado === "aprobada" && p ? (p.saldo <= 0 ? '<span class="chip verde">Pagada</span>' : p.pagado ? '<span class="chip ambar">Pago parcial</span>' : '<span class="chip verde">Aprobada</span>') : `<span class="chip ${CHIP[e.estado]}">${esc(D.ESTADOS_EST[e.estado])}</span>`;
      const cobrar = edC && e.estado === "aprobada" && p && p.saldo > 0;
      return `<div class="fila cobro est-f${e.estado === "anulada" ? " est-anulada" : ""}" data-est-ver="${e.id}"><span class="icono ${e.estado === "aprobada" ? "verde" : e.estado === "enviada" ? "azul" : "gris"}">${ico(e.estado === "aprobada" ? "check" : e.estado === "enviada" ? "send" : "file", 18)}</span><span><b>Estimación ${esc(e.correlativo)} · <span class="nw">${esc(e.numero)}</span></b><small>${esc(fCorta(e.fecha))} · avance ${esc(pctTxt(e.pct_acum))}${p && p.saldo > 0 && p.vence ? " · vence " + esc(fCorta(p.vence)) : ""}</small></span><span class="der"><b class="e-cifra">${esc(Q(e.neto))}</b><small>${chip}</small></span>${cobrar ? `<button class="s-btn suave-b chico" type="button" data-est-cobrar="${p.id}">Cobrar</button>` : `<button class="s-ib" type="button" aria-label="Abrir la ${esc(nombreEst(e))}" data-est-ver="${e.id}">${ico("pen", 15)}</button>`}</div>`;
    };
    const filaGar = gar ? `<div class="fila cobro"><span class="icono ${gar.saldo <= 0 ? "verde" : "laton"}">${ico("shield", 18)}</span><span><b>Devolución de garantía retenida</b><small>${gar.saldo > 0 ? "en Por cobrar" : "cobrada"}</small></span><span class="der"><b class="e-cifra">${esc(Q(gar.monto))}</b><small>${gar.saldo <= 0 ? '<span class="chip verde">Pagada</span>' : '<span class="chip ambar">Por cobrar</span>'}</small></span>${edC && gar.saldo > 0 ? `<button class="s-btn suave-b chico" type="button" data-est-cobrar="${gar.id}">Cobrar</button>` : "<span></span>"}</div>` : "";
    const principal = x.pendiente ? "" : puedeGar ? `<button class="s-btn suave-b" type="button" data-est-gar>${ico("shield", 15)}Cobrar la garantía retenida</button>` : edC && x.pctAcum < 100 ? `<button class="s-btn suave-b" type="button" data-est-nueva>${ico("plus", 15)}Nueva estimación</button>` : "";
    box.innerHTML = `
      <div class="sub"><h2>Estimaciones de avance</h2><span class="fila-b est-acc">${principal}${edC && !x.vigentes.length ? `<button class="s-ib" type="button" aria-label="Cambiar cómo se cobra por estimaciones" data-est-cfg>${ico("pen", 15)}</button>` : ""}</span></div>
      <div class="datos-cli est-res-o">
        <div><small>Contrato</small><span class="e-cifra">${esc(Q(x.cfg.contrato))}</span></div>
        <div><small>Avance estimado</small><span class="e-cifra"><b>${esc(pctTxt(x.pctAcum))}</b></span></div>
        <div><small>Estimado</small><span class="e-cifra">${esc(Q(x.estimado))}</span></div>
        <div><small>Falta estimar</small><span class="e-cifra">${esc(Q(falta))}</span></div>
        <div class="ancho2"><i class="mini-av est-barra"><span style="transform:scaleX(${Math.min(1, x.pctAcum / 100)})"></span></i><span class="suave" style="font-size:13px">Anticipo ${esc(Q(x.cfg.anticipo))}, descontado ${esc(Q(x.anticipoDesc))}.${x.cfg.garantia_pct ? ` Garantía ${esc(pctTxt(x.cfg.garantia_pct))}, retenido ${esc(Q(x.retenido))}${x.retenido && !x.cfg.garantia_parte_id ? ", se cobra al terminar la obra" : ""}.` : " Sin garantía retenida."}</span></div>
      </div>
      ${x.lista.length || gar ? `<div class="lista">${x.lista.slice().reverse().map(fila).join("")}${filaGar}</div>` : `<div class="vacio chico"><p>Todavía no hay estimaciones. Haga la primera cuando haya avance para cobrar.</p></div>`}`;
    box.onclick = async e => {
      const c = e.target.closest("[data-est-cobrar]"); if (c) { e.stopPropagation(); ctx.cobrar(partePor[Number(c.dataset.estCobrar)]); return; }
      if (e.target.closest("[data-est-cfg]")) { configurar(o, x, ctx); return; }
      if (e.target.closest("[data-est-nueva]")) { editar(o, x, null, ctx); return; }
      if (e.target.closest("[data-est-gar]")) { garantia(o, x, ctx); return; }
      const v = e.target.closest("[data-est-ver]"); if (v) ver(o, Number(v.dataset.estVer), ctx);
    };
  }

  function configurar(o, x, ctx) {
    const { modal, esc, Q, numero, cerrarCapas, aviso, campoMonto, formatoAlSalir } = A();
    const plan = ctx.partes.filter(p => (p.orden || 0) < 100);
    const ant = plan.find(p => /anticipo/i.test(p.descripcion));
    const quitables = plan.filter(p => p !== ant && !(p.pagado > 0));
    const contrato = x.cfg ? x.cfg.contrato : x.contratoCot != null ? x.contratoCot : ctx.total;
    const m = modal({
      titulo: "Cobrar por estimaciones", guardarTxt: "Guardar",
      quitar: x.cfg ? async () => { try { await D.quitarConfigEst(o); cerrarCapas(); aviso("La obra ya no se cobra por estimaciones."); await ctx.recargar(); } catch (er) { aviso(er.message, "mal"); } } : null, quitarTxt: "Ya no cobrar así",
      cuerpo: `${campoMonto("contrato", "Total del contrato", contrato, x.contratoCot != null ? "Sale de la cotización aprobada." : "Esta obra no tiene cotización: escriba el total.")}
        <div class="f-fila">${campoMonto("anticipo", "Anticipo", x.cfg ? x.cfg.anticipo : ant ? ant.monto : 0, "Cada estimación descuenta la parte que le toca.")}
        <label class="f-campo">Garantía retenida (%)<input name="gar" inputmode="decimal" autocomplete="off" value="${esc(x.cfg ? x.cfg.garantia_pct : 5)}"><small>Se retiene de cada estimación y se cobra al terminar. Ponga 0 si no lleva.</small></label></div>
        ${x.cfg ? "" : x.renglones ? `<p class="suave" style="font-size:13.5px;margin:0">El avance se anota por partida de la cotización (${x.renglones.length} ${x.renglones.length === 1 ? "renglón" : "renglones"}).</p>` : `<p class="suave" style="font-size:13.5px;margin:0">Sin cotización, el avance se anota como porcentaje de la obra.</p>`}
        ${!x.cfg && quitables.length ? `<fieldset class="est-quitar"><legend>Del plan de pagos, quitar lo que ahora se cobra con estimaciones</legend>${quitables.map(p => `<label class="chk-f"><input type="checkbox" name="q" value="${p.id}" checked><span>${esc(p.descripcion)} · ${esc(Q(p.monto))}</span></label>`).join("")}<small class="suave">${ant ? `El ${esc(ant.descripcion.toLowerCase())} se queda en el plan.` : "Si hay anticipo, déjelo en el plan para cobrarlo aparte."}</small></fieldset>` : ""}`,
      alAbrir: f => { formatoAlSalir(f); if (x.contratoCot != null) f.contrato.readOnly = true; },
      alGuardar: async f => {
        const q = [...f.querySelectorAll('[name="q"]:checked')].map(i => Number(i.value));
        await D.guardarConfigEst(o, { contrato: numero(f.contrato.value), anticipo: numero(f.anticipo.value) || 0, garantia_pct: Number(String(f.gar.value).replace(/[%,\s]/g, "")) || 0 }, q);
        cerrarCapas(); aviso("Listo: la obra se cobra por estimaciones."); await ctx.recargar();
      }
    });
    return m;
  }

  function editar(o, x, e0, ctx) {
    const { modal, esc, ico, Q, cerrarCapas, aviso } = A();
    const prevs = x.vigentes.filter(e => !e0 || e.correlativo < e0.correlativo);
    const ult = prevs[prevs.length - 1] || null;
    const antes = (ult && ult.avance) || {};
    const val = k => e0 ? e0.avance[k] : antes[k] || 0;
    const corr = e0 ? e0.correlativo : x.lista.reduce((a, e) => Math.max(a, e.correlativo), 0) + 1;
    const desde0 = e0 ? e0.desde : ult && ult.hasta ? (([y, m, d]) => { const z = new Date(y, m - 1, d + 1); return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`; })(ult.hasta.split("-").map(Number)) : o.fecha_inicio || "";
    const cuerpoR = x.renglones ? `<div class="est-rs" data-est-rs>${x.renglones.map(r => `<div class="est-r"><span class="est-d"><b>${esc(r.d)}</b><small>Contratado ${esc(A().cant(r.c))} · antes ${esc(A().cant(antes[r.k] || 0))}</small></span><label class="f-campo est-in"><span>Hecho a la fecha</span><input data-est-k="${esc(r.k)}" inputmode="decimal" autocomplete="off" value="${esc(val(r.k))}"></label><button class="s-btn suave-b chico" type="button" data-est-todo="${esc(r.k)}" data-c="${r.c}">Todo</button></div>`).join("")}</div>`
      : `<label class="f-campo">Avance de la obra a la fecha (%)<input name="general" inputmode="decimal" autocomplete="off" value="${esc(e0 ? e0.avance.general : ult ? ult.pct_acum : "")}"><small>${ult ? `La estimación anterior llegó a ${esc(pctTxt(ult.pct_acum))}.` : "Porcentaje de toda la obra que ya está hecho."}</small></label>`;
    const m = modal({
      titulo: e0 ? `Cambiar la ${nombreEst(e0)}` : `Estimación ${corr}`, guardarTxt: "Guardar",
      cuerpo: `<div class="f-fila est-fechas"><label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(e0 ? e0.fecha : hoyISO())}"></label><label class="f-campo">Período desde<input type="date" name="desde" value="${esc(desde0 || "")}"></label><label class="f-campo">Hasta<input type="date" name="hasta" value="${esc(e0 ? e0.hasta || "" : hoyISO())}"></label></div>
        ${cuerpoR}
        <label class="f-campo">Notas <small>opcional</small><textarea name="notas" rows="2">${esc(e0 ? e0.notas || "" : "")}</textarea></label>
        <div class="est-cuenta" data-est-cuenta aria-live="polite"></div>`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho");
        const leerAv = () => x.renglones ? Object.fromEntries([...f.querySelectorAll("[data-est-k]")].map(i => [i.dataset.estK, i.value.trim()])) : { general: f.general.value.trim() };
        const cuenta = f.querySelector("[data-est-cuenta]");
        const pintar = () => {
          try {
            const k = D.calcularEstimacion(leerAv(), x, prevs);
            const l = (t2, v, cl = "") => `<div class="${cl}"><span>${t2}</span><b class="e-cifra">${v}</b></div>`;
            cuenta.innerHTML = l("Avance a la fecha", `${esc(pctTxt(k.pct_acum))}${prevs.length ? ` <small>(antes ${esc(pctTxt(k.pct_ant))})</small>` : ""}`)
              + l(`Lo hecho en total: ${esc(pctTxt(k.pct_acum))} de ${esc(Q(x.cfg.contrato))}`, esc(Q(k.brutoAcum)))
              + (prevs.length ? l("Menos lo estimado antes", "− " + esc(Q(k.brutoPrev))) : "")
              + l("Esta estimación", esc(Q(k.bruto)), "est-sub")
              + (x.cfg.anticipo ? l("Menos anticipo", "− " + esc(Q(k.anticipo))) : "")
              + (x.cfg.garantia_pct ? l(`Menos garantía ${esc(pctTxt(x.cfg.garantia_pct))}`, "− " + esc(Q(k.garantia))) : "")
              + l("A cobrar", esc(Q(k.neto)), "est-total");
            cuenta.classList.remove("mal");
          } catch (er) { cuenta.innerHTML = `<p>${esc(er.message)}</p>`; cuenta.classList.add("mal"); }
        };
        f.addEventListener("input", pintar);
        mm.addEventListener("click", ev => { const b = ev.target.closest("[data-est-todo]"); if (b) { const i = f.querySelector(`[data-est-k="${CSS.escape(b.dataset.estTodo)}"]`); i.value = b.dataset.c; pintar(); } });
        pintar();
      },
      alGuardar: async f => {
        const avance = x.renglones ? Object.fromEntries([...f.querySelectorAll("[data-est-k]")].map(i => [i.dataset.estK, i.value.trim()])) : { general: f.general.value.trim() };
        const id = await D.guardarEstimacion(o, { id: e0 ? e0.id : null, fecha: f.fecha.value, desde: f.desde.value, hasta: f.hasta.value, avance, notas: f.notas.value });
        cerrarCapas(); aviso("Estimación guardada."); await ctx.recargar(); ver(o, id, ctx);
      }
    });
    return m;
  }

  async function destinoDe(o) {
    const cli = await D.cliente(o.cliente_id).catch(() => null);
    const cot = o.cotizacion_id ? await D.cotizacion(o.cotizacion_id).catch(() => null) : null;
    const cs = (cli && cli.contactos) || [];
    const k = (cot && cs.find(c => c.id === cot.contacto_id)) || cs.find(c => c.principal) || null;
    const en = o.cotizacion_id && D.enlaceDe ? await D.enlaceDe(o.cotizacion_id).catch(() => null) : null;
    return { cli, contacto: k, tel: telDe((k && k.telefono) || (cli && cli.telefono)), enlace: en && en.activo && en.aprobado ? en : null };
  }

  async function ver(o, id, ctx) {
    const { modal, esc, ico, Q, cerrarCapas, aviso } = A();
    const edC = D.puede(A().sesion().perfil, "registrarPago");
    let e;
    try { e = await D.estimacion(id); } catch (er) { aviso(er.message, "mal"); return; }
    const d = e.datos || {};
    const dst = await destinoDe(o);
    const r = await D.resumenCobros();
    const p = e.parte_id ? r.partes.find(z => z.id === e.parte_id) : null;
    const l = (t2, v, cl = "") => `<div class="${cl}"><span>${t2}</span><b class="e-cifra">${v}</b></div>`;
    const filas = (d.filas || []).filter(f => f.per > 0);
    const estadoTxt = e.estado === "aprobada" && e.aprobado ? `Aprobada por ${esc(e.aprobado.nombre)}${e.aprobado.puesto ? ", " + esc(e.aprobado.puesto) : ""} · ${esc(new Date(e.aprobado.fecha).toLocaleString("es-GT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}${e.aprobado.en === "enlace" ? " · firmó en su enlace" : " · anotado en el sistema"}`
      : e.estado === "enviada" ? (dst.enlace ? "Está en el enlace del cliente, esperando su firma." : "Esperando la aprobación del cliente.")
      : e.estado === "anulada" ? `Anulada: ${esc(e.motivo_anulado || "")}` : "Borrador: el cliente todavía no la ve.";
    const btn = (k, i, t2) => `<button class="s-btn suave-b" type="button" data-ev="${k}">${ico(i, 15)}${t2}</button>`;
    const extras = [];
    let principal = "Ver PDF", accion = () => pdf(o, e);
    if (edC && e.estado === "borrador") {
      extras.push(btn("pdf", "eye", "Ver PDF"), btn("editar", "pen", "Cambiar"));
      if (dst.enlace) { principal = "Mandar al cliente"; accion = () => mandar(o, e, dst, ctx); extras.push(btn("anotar", "check", "Aprobó en papel")); }
      else { principal = "Anotar aprobación"; accion = () => anotar(o, e, ctx); }
    } else if (edC && e.estado === "enviada") {
      extras.push(btn("pdf", "eye", "Ver PDF"), btn("anotar", "check", "Aprobó en papel"), btn("regresar", "pen", "Regresar a borrador"));
      principal = dst.enlace ? "Mandar otra vez" : "Anotar aprobación"; accion = () => dst.enlace ? mandar(o, e, dst, ctx) : anotar(o, e, ctx);
    } else if (edC && e.estado === "aprobada" && p && p.saldo > 0) {
      extras.push(btn("pdf", "eye", "Ver PDF")); principal = "Cobrar"; accion = () => { cerrarCapas(); ctx.cobrar(p); };
    }
    const m = modal({
      titulo: nombreEst(e), guardarTxt: principal, extra: extras.join(""),
      quitar: !edC ? null : e.estado === "borrador" ? async () => { try { await D.quitarEstimacion(e.id); cerrarCapas(); aviso("Estimación quitada."); await ctx.recargar(); } catch (er) { aviso(er.message, "mal"); } }
        : e.estado === "aprobada" ? () => anular(o, e, ctx) : null,
      quitarTxt: e.estado === "aprobada" ? "Anular" : "Quitar",
      cuerpo: `<p class="est-estado"><span class="chip ${CHIP[e.estado]}">${esc(D.ESTADOS_EST[e.estado])}</span><span class="suave">${estadoTxt}</span></p>
        <div class="est-cuenta">${l("Período", esc([d.desde && fCorta(d.desde), d.hasta && fCorta(d.hasta)].filter(Boolean).join(" al ") || fCorta(e.fecha)))}${l("Avance a la fecha", `${esc(pctTxt(e.pct_acum))}${d.correlativo > 1 ? ` <small>(antes ${esc(pctTxt(d.pct_ant))})</small>` : ""}`)}${l("Esta estimación", esc(Q(e.bruto)), "est-sub")}${e.anticipo ? l("Menos anticipo", "− " + esc(Q(e.anticipo))) : ""}${e.garantia ? l(`Menos garantía ${esc(pctTxt(d.garantia_pct))}`, "− " + esc(Q(e.garantia))) : ""}${l("A cobrar", esc(Q(e.neto)), "est-total")}</div>
        ${filas.length ? `<details class="est-det"><summary>Lo que se hizo en este período · ${filas.length} ${filas.length === 1 ? "renglón" : "renglones"}</summary><div class="lista sin-chip">${filas.map(f => `<div class="fila" style="cursor:default"><span></span><span><b>${esc(f.d)}</b><small>${esc(A().cant(f.per))} en este período · ${esc(A().cant(f.acum))} de ${esc(A().cant(f.c))} a la fecha</small></span><span></span></div>`).join("")}</div></details>` : ""}
        ${p ? `<p class="suave" style="font-size:13.5px;margin:0">En Por cobrar: ${esc(Q(p.monto))}${p.pagado ? `, pagado ${esc(Q(p.pagado))}` : ""}${p.vence ? `, vence el ${esc(fCorta(p.vence))}` : ""}.</p>` : ""}
        ${e.notas ? `<p class="suave" style="font-size:13.5px;margin:0">${esc(e.notas)}</p>` : ""}`,
      soloUno: true,
      alGuardar: async () => { await accion(); }
    });
    m.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-ev]"); if (!b) return;
      const k = b.dataset.ev;
      if (k === "pdf") pdf(o, e);
      if (k === "editar") { const x = await D.estimacionesDe(o); editar(o, x, x.lista.find(z => z.id === e.id), ctx); }
      if (k === "anotar") anotar(o, e, ctx);
      if (k === "regresar") { try { await D.regresarBorrador(e.id); cerrarCapas(); aviso("La estimación regresó a borrador. El cliente ya no la ve."); await ctx.recargar(); } catch (er) { aviso(er.message, "mal"); } }
    });
  }

  async function pdf(o, e) {
    const { aviso } = A();
    try {
      aviso("Armando la estimación…");
      const est = await D.estimacion(e.id);
      const b = await window.EMT_PDF.estimacion({ est, emp: await D.empresa() });
      window.EMT_PDF.ver(b, `${est.numero} - Estimación ${est.correlativo} - ${o.numero}.pdf`);
    } catch (er) { aviso(/[áéíóúñ]/i.test(er.message) ? er.message : "No se pudo armar la estimación. Intente otra vez.", "mal"); }
  }

  async function mandar(o, e, dst, ctx) {
    const { modal, esc, ico, Q, cerrarCapas, aviso } = A();
    await D.mandarEstimacion(e.id);
    const url = D.urlEnlace(dst.enlace.token);
    const nom = dst.contacto ? dst.contacto.nombre.split(/\s+/)[0] : "";
    const txt = `Buen día${nom ? ", " + nom : ""}. Le comparto la estimación ${e.correlativo} (${e.numero}) de la obra ${o.titulo || o.numero}, por ${Q(e.neto)}. En su enlace la puede revisar y aprobar con su firma: ${url}`;
    await ctx.recargar();
    modal({
      titulo: "Estimación lista para el cliente", guardarTxt: "Listo", soloUno: true,
      cuerpo: `<p class="suave" style="font-size:15px">Ya aparece en el enlace del cliente. Mándele el aviso para que la revise y la firme.</p>
        <div class="fila-b">${dst.tel ? `<a class="s-btn suave-b" href="${esc(`https://wa.me/${dst.tel}?text=${encodeURIComponent(txt)}`)}" target="_blank" rel="noopener">${ico("chat", 15)}WhatsApp</a>` : ""}<button class="s-btn suave-b" type="button" data-copiar>${ico("link", 15)}Copiar el mensaje</button></div>`,
      alAbrir: (f, mm) => mm.addEventListener("click", async ev => { if (!ev.target.closest("[data-copiar]")) return; try { await navigator.clipboard.writeText(txt); aviso("Mensaje copiado."); } catch (er) { aviso("No se pudo copiar.", "mal"); } }),
      alGuardar: async () => cerrarCapas()
    });
  }

  function anotar(o, e, ctx) {
    const { modal, esc, Q, cerrarCapas, aviso } = A();
    modal({
      titulo: "Anotar la aprobación", guardarTxt: "Aprobada",
      cuerpo: `<p class="suave" style="font-size:14.5px">Para cuando el cliente la aprobó en papel o por correo. ${esc(nombreEst(e))} por ${esc(Q(e.neto))} pasa a Por cobrar.</p>
        <label class="f-campo">Quién la aprobó<input name="nombre" autocomplete="off"></label>
        <label class="f-campo">Cargo <small>opcional</small><input name="puesto" autocomplete="off" placeholder="Supervisor de la obra"></label>`,
      alGuardar: async f => {
        await D.aprobarEstimacion(o, e.id, f.nombre.value, f.puesto.value, A().sesion().perfil.nombre);
        cerrarCapas(); aviso("Estimación aprobada: ya está en Por cobrar."); await ctx.recargar();
      }
    });
  }

  function anular(o, e, ctx) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const m = modal({
      titulo: `¿Anular la ${nombreEst(e)}?`, guardarTxt: "Anular",
      cuerpo: `<p class="suave" style="font-size:14.5px">Se quita de Por cobrar. Solo se puede si no tiene pagos.</p><label class="f-campo">Por qué se anula<input name="motivo" autocomplete="off"></label>`,
      alGuardar: async f => { await D.anularEstimacion(o, e.id, f.motivo.value); cerrarCapas(); aviso("Estimación anulada."); await ctx.recargar(); }
    });
    m.querySelector("[data-guardar]").classList.add("peligro-b");
  }

  function garantia(o, x, ctx) {
    const { modal, esc, Q, cerrarCapas, aviso } = A();
    modal({
      titulo: "Cobrar la garantía retenida", guardarTxt: "Pasar a Por cobrar",
      cuerpo: `<p class="suave" style="font-size:15px">Se retuvieron ${esc(Q(x.retenido))} en ${x.aprobadas.length} ${x.aprobadas.length === 1 ? "estimación" : "estimaciones"}. Al pasarlo a Por cobrar queda como «Devolución de garantía retenida».</p>`,
      alGuardar: async () => { await D.cobrarGarantia(o); cerrarCapas(); aviso("La garantía retenida ya está en Por cobrar."); await ctx.recargar(); }
    });
  }

  return { seccion };
})();
