"use strict";
window.EMT_CAMBIOS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { borrador: "gris", enviada: "azul", aprobada: "verde", anulada: "gris" };
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };
  const hoyISO = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const telDe = t => { const d = String(t || "").replace(/\D/g, ""); return d ? (d.length === 8 ? "502" + d : d) : ""; };
  const nombreOC = e => `Orden de cambio ${e.correlativo} · ${e.numero}`;
  const firmado = (e, Q) => `${e.tipo === "deductivo" ? "− " : "+ "}${Q(e.total)}`;
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  async function seccion(box, o, ctx) {
    const { esc, ico, Q } = A();
    const edC = D.puede(A().sesion().perfil, "registrarPago");
    if (o.cotizacion_id && D.pendientesEnlace && D.puede(A().sesion().perfil, "verEnlaces")) {
      const ids = (await D.pendientesEnlace().catch(() => [])).filter(z => z.tipo === "cambio" && z.cotizacion_id === o.cotizacion_id).map(z => z.id);
      if (ids.length) { await D.atenderEventos(ids).catch(() => {}); if (window.EMT_ENLACES) window.EMT_ENLACES.insignia(); }
    }
    const x = await D.cambiosDe(o);
    const partePor = Object.fromEntries(ctx.partes.map(p => [p.id, p]));
    const fila = e => {
      const p = e.parte_id ? partePor[e.parte_id] : null;
      const cobrar = edC && e.estado === "aprobada" && p && p.monto > 0 && p.saldo > 0;
      const chip = e.estado === "aprobada" && p && p.monto > 0 ? (p.saldo <= 0 ? '<span class="chip verde">Pagada</span>' : '<span class="chip verde">Aprobada</span>') : `<span class="chip ${CHIP[e.estado]}">${esc(D.ESTADOS_EST[e.estado])}</span>`;
      return `<div class="fila cobro est-f${e.estado === "anulada" ? " est-anulada" : ""}" data-oc-ver="${e.id}"><span class="icono ${e.tipo === "deductivo" ? "gris" : e.estado === "aprobada" ? "verde" : "azul"}">${ico(e.tipo === "deductivo" ? "minus" : "plus", 18)}</span><span><b>Orden de cambio ${esc(e.correlativo)} · <span class="nw">${esc(e.numero)}</span></b><small>${esc(fCorta(e.fecha))} · ${esc(D.TIPOS_OC[e.tipo].toLowerCase())} · ${esc(String(e.motivo).slice(0, 70))}</small></span><span class="der"><b class="e-cifra">${esc(firmado(e, Q))}</b><small>${chip}</small></span>${cobrar ? `<button class="s-btn suave-b chico" type="button" data-oc-cobrar="${p.id}">Cobrar</button>` : `<button class="s-ib" type="button" aria-label="Abrir la ${esc(nombreOC(e))}" data-oc-ver="${e.id}">${ico("pen", 15)}</button>`}</div>`;
    };
    const res = x.aprobadas.length ? `<p class="suave oc-res">${x.adicional ? `Agregado ${esc(Q(x.adicional))}` : ""}${x.adicional && x.deductivo ? " · " : ""}${x.deductivo ? `quitado ${esc(Q(x.deductivo))}` : ""}${x.porEst ? `. El contrato queda en ${esc(Q(x.est.cfg.contrato))} y lo nuevo se cobra con las estimaciones.` : ". Lo agregado entra a Por cobrar al aprobarse; lo quitado se descuenta."}</p>` : "";
    box.innerHTML = `
      <div class="sub"><h2>Órdenes de cambio</h2>${edC && !x.pendiente ? `<button class="s-btn suave-b" type="button" data-oc-nueva>${ico("plus", 15)}Nueva orden de cambio</button>` : ""}</div>
      ${res}
      ${x.lista.length ? `<div class="lista">${x.lista.slice().reverse().map(fila).join("")}</div>` : `<div class="vacio chico"><p>Para trabajos que el cliente pide durante la obra, o que se quitan. El cliente la aprueba con su firma en su enlace.</p></div>`}`;
    box.onclick = e => {
      const c = e.target.closest("[data-oc-cobrar]"); if (c) { e.stopPropagation(); ctx.cobrar(partePor[Number(c.dataset.ocCobrar)]); return; }
      if (e.target.closest("[data-oc-nueva]")) { editar(o, x, null, ctx); return; }
      const v = e.target.closest("[data-oc-ver]"); if (v) ver(o, Number(v.dataset.ocVer), ctx);
    };
  }

  async function editar(o, x, e0, ctx) {
    const { modal, esc, ico, Q, cerrarCapas, aviso, montoTxt } = A();
    const base = await D.renglonesObra(o, e0 ? e0.id : null);
    const ult = x.est.vigentes[x.est.vigentes.length - 1];
    const ultAcum = ult ? ult.avance : {};
    const cat = await D.catalogo();
    const pct = base.aumento != null ? base.aumento : await D.aumentoDefecto().catch(() => 0);
    const opciones = [
      ...cat.estructuras.filter(z => z.activo !== false).map(z => ({ d: z.nombre, u: D.precioEstructura({ materiales: z.materiales, mano_obra: z.mano_obra }, pct, base.precios).unitario, ref: "e" + z.id, b: norm(z.nombre + " " + (z.codigo || "")) })),
      ...cat.materiales.filter(z => z.activo !== false).map(z => ({ d: z.descripcion, u: (D.precioPieza(z, pct, base.precios).precio) || 0, ref: "m" + z.id, b: norm(z.descripcion + " " + (z.codigo || "")) }))
    ];
    let tipo = e0 ? e0.tipo : "adicional";
    let filas = e0 && e0.tipo === "adicional" ? e0.renglones.map(r => ({ ...r })) : [];
    const quita = {}; if (e0 && e0.tipo === "deductivo") e0.renglones.forEach(r => { if (r.k) quita[r.k] = r.c; else filas.push({ ...r }); });
    const conLista = () => tipo === "deductivo" && base.renglones;
    const m = modal({
      titulo: e0 ? `Cambiar la ${nombreOC(e0)}` : "Orden de cambio", guardarTxt: "Guardar",
      cuerpo: `<div class="seg oc-tipo" role="group" aria-label="Tipo de cambio"><button type="button" data-tipo="adicional" aria-pressed="${tipo === "adicional"}">Agrega trabajo</button><button type="button" data-tipo="deductivo" aria-pressed="${tipo === "deductivo"}">Quita trabajo</button></div>
        <label class="f-campo">Qué pidió el cliente<input name="motivo" autocomplete="off" value="${esc(e0 ? e0.motivo : "")}" placeholder="Por ejemplo: 4 postes más para llegar a la bodega nueva"></label>
        <div class="f-fila"><label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(e0 ? e0.fecha : hoyISO())}"></label><label class="f-campo">Días más de plazo <small>opcional</small><input name="dias" inputmode="numeric" autocomplete="off" value="${esc(e0 && e0.dias_plazo ? e0.dias_plazo : "")}"></label></div>
        <div data-oc-cuerpo></div>
        <label class="chk-f" data-oc-iva><input type="checkbox" name="iva" ${(e0 ? e0.iva : base.conIva) ? "checked" : ""}><span>Lleva IVA (12 %)</span></label>
        <label class="f-campo">Notas <small>opcional</small><textarea name="notas" rows="2">${esc(e0 ? e0.notas || "" : "")}</textarea></label>
        <div class="est-cuenta" data-oc-cuenta aria-live="polite"></div>`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho");
        const cuerpo = f.querySelector("[data-oc-cuerpo]"), cuenta = f.querySelector("[data-oc-cuenta]");
        const renglonesCalc = () => conLista() ? base.renglones.filter(r => Number(String(quita[r.k] || "").replace(/,/g, "")) > 0).map(r => ({ k: r.k, d: r.d, c: quita[r.k], u: r.u })) : filas;
        const pintarCuenta = () => {
          f.querySelector("[data-oc-iva]").hidden = !!conLista();
          try {
            const k = D.calcularCambio(tipo, renglonesCalc(), f.iva.checked, base, ultAcum);
            const l = (t2, v, cl = "") => `<div class="${cl}"><span>${t2}</span><b class="e-cifra">${v}</b></div>`;
            const s = tipo === "deductivo" ? "− " : "+ ";
            cuenta.innerHTML = (k.conFactor ? l("A precio de la cotización", esc(Q(k.subtotal))) + l("Con IVA y lo demás de la cotización", s + esc(Q(k.total)), "est-total") : l("Subtotal", esc(Q(k.subtotal))) + (k.iva ? l("IVA 12 %", esc(Q(k.iva))) : "") + l(tipo === "deductivo" ? "Se quita del contrato" : "Se agrega al contrato", s + esc(Q(k.total)), "est-total"))
              + (x.porEst ? l("El contrato queda en", esc(Q(x.est.cfg.contrato + (tipo === "deductivo" ? -k.total : k.total)))) : "");
            cuenta.classList.remove("mal");
          } catch (er) { cuenta.innerHTML = `<p>${esc(er.message)}</p>`; cuenta.classList.add("mal"); }
        };
        const filaHTML = (r, i) => `<div class="oc-r"><label class="f-campo oc-d"><span>Descripción</span><input data-od="${i}" value="${esc(r.d)}" autocomplete="off"></label><label class="f-campo"><span>Cantidad</span><input data-oq="${i}" inputmode="decimal" value="${esc(r.c ?? "")}" autocomplete="off"></label><label class="f-campo"><span>Precio c/u</span><span class="f-monto"><span>Q</span><input data-ou="${i}" inputmode="decimal" value="${esc(Number.isFinite(Number(r.u)) ? montoTxt(Number(r.u)) : "")}" autocomplete="off"></span></label><button class="s-ib" type="button" aria-label="Opciones del renglón ${esc(r.d || i + 1)}" data-oe="${i}">${ico("pen", 14)}</button><div class="fila-b" style="grid-column:1/-1;margin:0" data-oe-acc="${i}" hidden><button class="s-btn suave-b chico" type="button" data-oqt="${i}">${ico("trash", 14)}Quitar este renglón</button></div></div>`;
        const pintar = () => {
          mm.querySelectorAll("[data-tipo]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tipo === tipo)));
          if (conLista()) {
            cuerpo.innerHTML = `<p class="suave" style="font-size:13.5px;margin:0">Escriba cuánto se quita de cada renglón. Lo que ya se estimó no se puede quitar.</p><div class="est-rs">${base.renglones.map(r => { const max = Math.max(0, Math.round((r.c - (Number(ultAcum[r.k]) || 0)) * 1000) / 1000); return `<div class="est-r"><span class="est-d"><b>${esc(r.d)}</b><small>Contratado ${esc(A().cant(r.c))} · se puede quitar hasta ${esc(A().cant(max))}</small></span><label class="f-campo est-in"><span>Se quita</span><input data-qk="${esc(r.k)}" inputmode="decimal" autocomplete="off" value="${esc(quita[r.k] || "")}" ${max ? "" : "disabled"}></label><span></span></div>`; }).join("")}</div>`;
          } else {
            cuerpo.innerHTML = `${tipo === "adicional" ? `<div class="f-campo oc-busca"><span>Agregar del catálogo</span><span class="f-busca">${ico("search", 15)}<input data-oc-q placeholder="Buscar estructura o material" autocomplete="off" aria-label="Buscar en el catálogo"></span><div class="f-res" data-oc-res hidden></div></div>` : ""}
              <div class="oc-rs" data-oc-rs>${filas.map(filaHTML).join("")}</div>
              <button class="s-btn suave-b chico" type="button" data-oc-libre>${ico("plus", 14)}${tipo === "adicional" ? "Renglón libre" : "Agregar renglón"}</button>`;
          }
          pintarCuenta();
        };
        f.addEventListener("input", ev => {
          const t = ev.target;
          if (t.dataset.od != null) filas[Number(t.dataset.od)].d = t.value;
          if (t.dataset.oq != null) filas[Number(t.dataset.oq)].c = t.value;
          if (t.dataset.ou != null) { let n = 0; try { n = A().numero(t.value) || 0; } catch (er) { n = NaN; } filas[Number(t.dataset.ou)].u = n; }
          if (t.dataset.qk != null) quita[t.dataset.qk] = t.value;
          if (t.matches("[data-oc-q]")) {
            const q = norm(t.value.trim()), box = f.querySelector("[data-oc-res]");
            const l = q.length < 2 ? [] : opciones.filter(z => q.split(/\s+/).every(p => z.b.includes(p))).slice(0, 8);
            box.hidden = q.length < 2;
            box.innerHTML = l.length ? l.map((z, i) => `<button type="button" data-oc-pick="${opciones.indexOf(z)}"><b>${esc(z.d)}</b><small>${z.u ? esc(Q(z.u)) + " c/u" : "sin precio en el catálogo: escríbalo"}</small></button>`).join("") : `<p class="suave">Nada con «${esc(t.value.trim())}». Use «Renglón libre».</p>`;
            return;
          }
          pintarCuenta();
        });
        f.addEventListener("change", ev => { if (ev.target.name === "iva") pintarCuenta(); });
        mm.addEventListener("click", ev => {
          const tb = ev.target.closest("[data-tipo]"); if (tb && tb.dataset.tipo !== tipo) { tipo = tb.dataset.tipo; filas = []; Object.keys(quita).forEach(k => delete quita[k]); pintar(); return; }
          const pk = ev.target.closest("[data-oc-pick]"); if (pk) { const z = opciones[Number(pk.dataset.ocPick)]; filas.push({ d: z.d, c: 1, u: z.u, ref: z.ref }); pintar(); const i = cuerpo.querySelector(`[data-oq="${filas.length - 1}"]`); if (i) { i.focus(); i.select(); } return; }
          if (ev.target.closest("[data-oc-libre]")) { filas.push({ d: "", c: 1, u: 0 }); pintar(); cuerpo.querySelector(`[data-od="${filas.length - 1}"]`)?.focus(); return; }
          const pe = ev.target.closest("[data-oe]"); if (pe) { const a = cuerpo.querySelector(`[data-oe-acc="${pe.dataset.oe}"]`); if (a) a.hidden = !a.hidden; return; }
          const qt = ev.target.closest("[data-oqt]"); if (qt) { filas.splice(Number(qt.dataset.oqt), 1); pintar(); }
        });
        pintar();
      },
      alGuardar: async f => {
        const rs = conLista() ? base.renglones.filter(r => Number(String(quita[r.k] || "").replace(/,/g, "")) > 0).map(r => ({ k: r.k, d: r.d, c: quita[r.k], u: r.u })) : filas;
        const id = await D.guardarCambio(o, { id: e0 ? e0.id : null, tipo, motivo: f.motivo.value, fecha: f.fecha.value, dias_plazo: f.dias.value.trim(), renglones: rs, iva: f.iva.checked, notas: f.notas.value });
        cerrarCapas(); aviso("Orden de cambio guardada."); await ctx.recargar(); ver(o, id, ctx);
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
    return { contacto: k, tel: telDe((k && k.telefono) || (cli && cli.telefono)), enlace: en && en.activo && en.aprobado ? en : null };
  }

  async function ver(o, id, ctx) {
    const { modal, esc, ico, Q, cerrarCapas, aviso } = A();
    const edC = D.puede(A().sesion().perfil, "registrarPago");
    let e;
    try { e = await D.cambio(id); } catch (er) { aviso(er.message, "mal"); return; }
    const d = e.datos || {};
    const dst = await destinoDe(o);
    const r = await D.resumenCobros();
    const p = e.parte_id ? r.partes.find(z => z.id === e.parte_id) : null;
    const l = (t2, v, cl = "") => `<div class="${cl}"><span>${t2}</span><b class="e-cifra">${v}</b></div>`;
    const estadoTxt = e.estado === "aprobada" && e.aprobado ? `Aprobada por ${esc(e.aprobado.nombre)}${e.aprobado.puesto ? ", " + esc(e.aprobado.puesto) : ""} · ${esc(new Date(e.aprobado.fecha).toLocaleString("es-GT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}${e.aprobado.en === "enlace" ? " · firmó en su enlace" : " · anotado en el sistema"}`
      : e.estado === "enviada" ? (dst.enlace ? "Está en el enlace del cliente, esperando su firma." : "Esperando la aprobación del cliente.")
      : e.estado === "anulada" ? `Anulada: ${esc(e.motivo_anulado || "")}` : "Borrador: el cliente todavía no la ve.";
    const btn = (k, i, t2) => `<button class="s-btn suave-b" type="button" data-ov="${k}">${ico(i, 15)}${t2}</button>`;
    const extras = [];
    let principal = "Ver PDF", accion = () => pdf(o, e);
    if (edC && e.estado === "borrador") {
      extras.push(btn("pdf", "eye", "Ver PDF"), btn("editar", "pen", "Cambiar"));
      if (dst.enlace) { principal = "Mandar al cliente"; accion = () => mandar(o, e, dst, ctx); extras.push(btn("anotar", "check", "Aprobó en papel")); }
      else { principal = "Anotar aprobación"; accion = () => anotar(o, e, ctx); }
    } else if (edC && e.estado === "enviada") {
      extras.push(btn("pdf", "eye", "Ver PDF"), btn("anotar", "check", "Aprobó en papel"), btn("regresar", "pen", "Regresar a borrador"));
      principal = dst.enlace ? "Mandar otra vez" : "Anotar aprobación"; accion = () => dst.enlace ? mandar(o, e, dst, ctx) : anotar(o, e, ctx);
    } else if (edC && e.estado === "aprobada" && p && p.monto > 0 && p.saldo > 0) {
      extras.push(btn("pdf", "eye", "Ver PDF")); principal = "Cobrar"; accion = () => { cerrarCapas(); ctx.cobrar(p); };
    }
    const s = e.tipo === "deductivo" ? "− " : "+ ";
    const m = modal({
      titulo: nombreOC(e), guardarTxt: principal, extra: extras.join(""), soloUno: true,
      quitar: !edC ? null : e.estado === "borrador" ? async () => { try { await D.quitarCambio(e.id); cerrarCapas(); aviso("Orden de cambio quitada."); await ctx.recargar(); } catch (er) { aviso(er.message, "mal"); } } : e.estado === "aprobada" ? () => anular(o, e, ctx) : null,
      quitarTxt: e.estado === "aprobada" ? "Anular" : "Quitar",
      cuerpo: `<p class="est-estado"><span class="chip ${CHIP[e.estado]}">${esc(D.ESTADOS_EST[e.estado])}</span><span class="suave">${estadoTxt}</span></p>
        <p style="margin:0;font-size:15px"><b>${esc(D.TIPOS_OC[e.tipo])}:</b> ${esc(e.motivo)}</p>
        <div class="lista sin-chip">${(d.renglones || []).map(x => `<div class="fila" style="cursor:default"><span></span><span><b>${esc(x.d)}</b><small>${esc(A().cant(x.c))} × ${esc(Q(x.u))}</small></span><span class="der"><b class="e-cifra">${esc(Q(Math.round(x.c * x.u * 100) / 100))}</b></span></div>`).join("")}</div>
        <div class="est-cuenta">${d.proporcional ? l("A precio de la cotización", esc(Q(e.subtotal))) : l("Subtotal", esc(Q(e.subtotal))) + (d.iva ? l("IVA 12 %", esc(Q(d.iva))) : "")}${l(e.tipo === "deductivo" ? "Se quita del contrato" : "Se agrega al contrato", s + esc(Q(e.total)), "est-total")}${d.contrato_despues != null ? l("El contrato queda en", esc(Q(d.contrato_despues))) : ""}${e.dias_plazo ? l("Plazo", `+ ${esc(e.dias_plazo)} ${e.dias_plazo === 1 ? "día" : "días"}`) : ""}</div>
        ${p ? `<p class="suave" style="font-size:13.5px;margin:0">${p.monto > 0 ? `En Por cobrar: ${esc(Q(p.monto))}${p.pagado ? `, pagado ${esc(Q(p.pagado))}` : ""}${p.vence ? `, vence el ${esc(fCorta(p.vence))}` : ""}.` : `Se descontó ${esc(Q(-p.monto))} de lo que falta cobrar de la obra.`}</p>` : ""}
        ${e.notas ? `<p class="suave" style="font-size:13.5px;margin:0">${esc(e.notas)}</p>` : ""}`,
      alGuardar: async () => { await accion(); }
    });
    m.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-ov]"); if (!b) return;
      const k = b.dataset.ov;
      if (k === "pdf") pdf(o, e);
      if (k === "editar") { const x = await D.cambiosDe(o); editar(o, x, x.lista.find(z => z.id === e.id), ctx); }
      if (k === "anotar") anotar(o, e, ctx);
      if (k === "regresar") { try { await D.regresarCambio(e.id); cerrarCapas(); aviso("La orden regresó a borrador. El cliente ya no la ve."); await ctx.recargar(); } catch (er) { aviso(er.message, "mal"); } }
    });
  }

  async function pdf(o, e) {
    const { aviso } = A();
    try {
      aviso("Armando la orden de cambio…");
      const oc = await D.cambio(e.id);
      const b = await window.EMT_PDF.ordenCambio({ oc, emp: await D.empresa() });
      window.EMT_PDF.ver(b, `${oc.numero} - Orden de cambio ${oc.correlativo} - ${o.numero}.pdf`);
    } catch (er) { aviso(/[áéíóúñ]/i.test(er.message) ? er.message : "No se pudo armar la orden de cambio. Intente otra vez.", "mal"); }
  }

  async function mandar(o, e, dst, ctx) {
    const { modal, esc, ico, Q, cerrarCapas, aviso } = A();
    await D.mandarCambio(e.id);
    const url = D.urlEnlace(dst.enlace.token);
    const nom = dst.contacto ? dst.contacto.nombre.split(/\s+/)[0] : "";
    const txt = `Buen día${nom ? ", " + nom : ""}. Le comparto la orden de cambio ${e.correlativo} (${e.numero}) de la obra ${o.titulo || o.numero}: ${e.motivo}, ${e.tipo === "deductivo" ? "se quitan" : "se agregan"} ${Q(e.total)}. En su enlace la puede revisar y aprobar con su firma: ${url}`;
    await ctx.recargar();
    modal({
      titulo: "Orden de cambio lista para el cliente", guardarTxt: "Listo", soloUno: true,
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
      cuerpo: `<p class="suave" style="font-size:14.5px">Para cuando el cliente la aprobó en papel o por correo. ${esc(nombreOC(e))}: ${e.tipo === "deductivo" ? "se quitan" : "se agregan"} ${esc(Q(e.total))}.</p>
        <label class="f-campo">Quién la aprobó<input name="nombre" autocomplete="off"></label>
        <label class="f-campo">Cargo <small>opcional</small><input name="puesto" autocomplete="off" placeholder="Supervisor de la obra"></label>`,
      alGuardar: async f => { await D.aprobarCambio(o, e.id, f.nombre.value, f.puesto.value, A().sesion().perfil.nombre); cerrarCapas(); aviso("Orden de cambio aprobada."); await ctx.recargar(); }
    });
  }

  function anular(o, e, ctx) {
    const { modal, cerrarCapas, aviso } = A();
    const m = modal({
      titulo: `¿Anular la ${nombreOC(e)}?`, guardarTxt: "Anular",
      cuerpo: `<p class="suave" style="font-size:14.5px">El contrato vuelve a como estaba antes de esta orden. Solo se puede si no tiene pagos.</p><label class="f-campo">Por qué se anula<input name="motivo" autocomplete="off"></label>`,
      alGuardar: async f => { await D.anularCambio(o, e.id, f.motivo.value); cerrarCapas(); aviso("Orden de cambio anulada."); await ctx.recargar(); }
    });
    m.querySelector("[data-guardar]").classList.add("peligro-b");
  }

  return { seccion };
})();
