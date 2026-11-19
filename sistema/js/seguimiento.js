"use strict";
window.EMT_SEGUIMIENTO = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const fCorta = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };
  const cuando = (s, h) => { if (s === h) return "hoy"; const n = Math.round((new Date(h) - new Date(s)) / 86400000); return n === 1 ? "ayer" : n > 1 ? `hace ${n} días` : n === -1 ? "mañana" : `el ${fCorta(s)}`; };

  function persona(c, cli) {
    const ks = (cli && cli.contactos) || [];
    const k = ks.find(x => x.id === c.contacto_id) || ks.find(x => x.principal && x.telefono) || ks.find(x => x.telefono);
    return { nombre: k ? k.nombre : cli ? cli.nombre : "", tel: D.telefonoWa(k && k.telefono) || D.telefonoWa(cli && cli.telefono) };
  }

  function editarContacto(c, k0, s, alGuardar, medio) {
    const { esc, modal, cerrarCapas, aviso } = A();
    const h = D.hoyGT();
    const sug = D.sumarDias(h, 3) > s.vence ? s.vence : D.sumarDias(h, 3);
    const m = modal({
      titulo: k0 ? "Contacto con el cliente" : "Anotar contacto", guardarTxt: "Guardar",
      quitar: k0 ? async () => { await D.quitarContacto(k0.id); cerrarCapas(); aviso("Contacto quitado."); await alGuardar(); } : null,
      cuerpo: `<div class="f-campo"><span>Cómo se contactó</span><div class="chips-medio" role="radiogroup" aria-label="Cómo se contactó">${Object.entries(D.MEDIOS_CONTACTO).map(([v, n]) => `<label><input type="radio" name="medio" value="${v}" ${(k0 ? k0.medio : medio || "llamada") === v ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div></div>
        <label class="f-campo">Qué dijo<textarea name="nota" rows="3" placeholder="La está revisando con el dueño; pide bajar el transporte…">${esc(k0 && k0.nota || "")}</textarea></label>
        <div class="f-fila"><label class="f-campo">Fecha<input type="date" name="fecha" max="${h}" value="${esc(k0 ? k0.fecha : h)}"></label>
        <label class="f-campo">Próximo contacto<input type="date" name="proximo" min="${D.sumarDias(h, 1)}" value="${esc(k0 ? k0.proximo || "" : c.estado === "enviada" ? sug : "")}"><small>${c.estado === "enviada" ? `Vence el ${esc(fCorta(s.vence))}. Vacío = el sistema le recuerda.` : "Opcional."}</small></label></div>`,
      alGuardar: async f => {
        await D.guardarSeguimiento({ id: k0 ? k0.id : null, cotizacion_id: c.id, medio: (f.querySelector("[name=medio]:checked") || {}).value, nota: f.nota.value, fecha: f.fecha.value, proximo: f.proximo.value || null });
        cerrarCapas(); aviso("Contacto anotado."); await alGuardar();
      }
    });
    return m;
  }

  function motivo(c, k0, alGuardar) {
    const { esc, modal, cerrarCapas } = A();
    modal({
      titulo: "¿Por qué no se ganó?", guardarTxt: k0 ? "Guardar" : "Marcar rechazada",
      cuerpo: `<p class="suave" style="margin:0;font-size:14px">Sirve para ver después por qué se pierden las cotizaciones.</p>
        <div class="f-campo"><span>Motivo</span><div class="motivos" role="radiogroup" aria-label="Motivo">${Object.entries(D.MOTIVOS_PERDIDA).map(([v, n]) => `<label class="f-check"><input type="radio" name="motivo" value="${v}" ${k0 && k0.motivo === v ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div></div>
        <label class="f-campo">Nota<textarea name="nota" rows="2" placeholder="Con quién se fue, cuánto le cobraron…">${esc(k0 && k0.nota || "")}</textarea></label>`,
      alGuardar: async f => {
        const mv = f.querySelector("[name=motivo]:checked");
        await D.guardarSeguimiento({ id: k0 ? k0.id : null, cotizacion_id: c.id, medio: "cierre", motivo: mv ? mv.value : null, nota: f.nota.value, fecha: k0 ? k0.fecha : D.hoyGT() });
        cerrarCapas(); await alGuardar();
      }
    });
  }

  function extender(c, s, ctx) {
    const { esc, modal, cerrarCapas, aviso } = A();
    const h = D.hoyGT();
    modal({
      titulo: "Darle más días", guardarTxt: "Extender",
      cuerpo: `<p class="suave" style="margin:0;font-size:14px">${c.numero} venció el ${esc(fCorta(s.vence))}. Escoja hasta cuándo vale; los precios no cambian${ctx.enlace ? " y el enlace del cliente vuelve a abrir" : ""}.</p>
        <label class="f-campo">Vale hasta<input type="date" name="hasta" min="${D.sumarDias(h, 1)}" value="${D.sumarDias(h, 15)}"></label>`,
      alGuardar: async f => {
        const hasta = f.hasta.value;
        if (!hasta || hasta <= h) throw new Error("Escoja una fecha después de hoy.");
        const dias = Math.round((new Date(hasta) - new Date(String(c.fecha).slice(0, 10))) / 86400000);
        await D.cambiarVigencia(c.id, dias);
        if (ctx.enlace) await D.cambiarEnlace(ctx.enlace.id, { vence: hasta, activo: true });
        cerrarCapas(); aviso(`Vale hasta el ${fCorta(hasta)}.`); await ctx.recargar();
      }
    });
  }

  async function seccion(box, ctx) {
    if (!box) return;
    const { esc, ico, aviso } = A();
    const c = ctx.c;
    if (c.estado === "borrador") { box.innerHTML = ""; return; }
    const [lista, emp, enlace] = await Promise.all([D.contactosCotizacion(c.id), D.empresa(), D.puede(A().sesion().perfil, "verEnlaces") ? D.enlaceDe(c.id).catch(() => null) : null]);
    ctx.enlace = enlace;
    const s = D.estadoSeguimiento(c, lista, emp);
    const h = D.hoyGT();
    const per = persona(c, ctx.cli);
    const notas = lista.filter(x => x.medio !== "cierre");
    let cab = "", chip = "";
    if (c.estado === "enviada") {
      if (s.vencida) { chip = `<span class="chip ambar">Venció</span>`; cab = `Venció el ${esc(fCorta(s.vence))} sin respuesta.`; }
      else if (s.toca) { chip = `<span class="chip ${s.atraso ? "ambar" : "azul"}">${s.atraso ? `Atrasado ${s.atraso} ${s.atraso === 1 ? "día" : "días"}` : "Toca hoy"}</span>`; cab = `${s.porque}: contactar a ${esc(per.nombre)} ${s.atraso ? "desde el " + esc(fCorta(s.proximo)) : "hoy"}.`; }
      else if (s.proximo) { chip = `<span class="chip gris">${esc(fCorta(s.proximo))}</span>`; cab = `Próximo contacto el ${esc(fCorta(s.proximo))} (${esc(s.porque.toLowerCase())}). Vence el ${esc(fCorta(s.vence))}.`; }
    } else if (c.estado === "rechazada") {
      chip = `<span class="chip ambar">Rechazada</span>`;
      cab = s.cierre ? `No se ganó por: <b>${esc(D.MOTIVOS_PERDIDA[s.cierre.motivo] || "")}</b>${s.cierre.nota ? " · " + esc(s.cierre.nota) : ""}` : "Falta anotar por qué no se ganó.";
    } else if (c.estado === "aprobada") { chip = `<span class="chip verde">Ganada</span>`; cab = `Se ganó${notas.length ? ` después de ${notas.length} ${notas.length === 1 ? "contacto" : "contactos"}` : ""}.`; }
    const puede = ctx.puede;
    const botones = [];
    if (puede && c.estado === "enviada" && s.vencida) botones.push(`<button class="s-btn lleno" type="button" data-seg-ext>Darle más días</button>`, `<button class="s-btn suave-b" type="button" data-seg-rech>Marcar rechazada</button>`);
    if (puede && per.tel && c.estado !== "aprobada") botones.push(`<button class="s-btn ${s.toca && !s.vencida ? "lleno" : "suave-b"}" type="button" data-seg-wa>${ico("chat", 15)}WhatsApp</button>`);
    if (puede) botones.push(`<button class="s-btn suave-b" type="button" data-seg-nuevo>${ico("plus", 15)}Anotar contacto</button>`);
    if (puede && c.estado === "rechazada") botones.push(`<button class="s-btn suave-b" type="button" data-seg-mot>${ico("pen", 15)}${s.cierre ? "Cambiar el motivo" : "Anotar el motivo"}</button>`);
    box.innerHTML = `<section class="caja seg-caja ${s.vencida || (s.toca && s.atraso) ? "aviso-c" : ""}">
      <div class="sub" style="margin:0"><h2>Seguimiento</h2>${chip}</div>
      ${cab ? `<p class="seg-cab">${cab}</p>` : ""}
      ${botones.length ? `<div class="fila-b">${botones.join("")}</div>` : ""}
      ${!per.tel && c.estado === "enviada" && puede ? `<p class="suave" style="margin:0;font-size:13px">Para mandar WhatsApp, ponga el teléfono del contacto en <a href="#/clientes/${c.cliente_id}">el cliente</a>.</p>` : ""}
      ${notas.length ? `<details class="plegable seg-hist" ${notas.length <= 3 ? "open" : ""}><summary><span class="pl-t"><b>${notas.length} ${notas.length === 1 ? "contacto" : "contactos"}</b><span class="suave">el último ${esc(cuando(notas[0].fecha, h))}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary>
        <div class="lista">${notas.map(x => `<div class="fila ${puede ? "con-lapiz" : ""}" style="cursor:default"><span class="icono gris">${ico(x.medio === "whatsapp" || x.medio === "correo" ? (x.medio === "correo" ? "mail" : "chat") : x.medio === "visita" ? "building" : "phone", 17)}</span><span><b>${esc(D.MEDIOS_CONTACTO[x.medio] || "")} · ${esc(fCorta(x.fecha))}${x.quien ? ` · ${esc(x.quien)}` : ""}</b><small>${esc(x.nota || "")}${x.proximo ? ` · próximo ${esc(fCorta(x.proximo))}` : ""}</small></span><span></span>${puede ? `<button class="s-ib" type="button" aria-label="Editar el contacto del ${esc(fCorta(x.fecha))}" data-seg-ed="${x.id}">${ico("pen", 15)}</button>` : ""}</div>`).join("")}</div></details>` : c.estado === "enviada" ? `<p class="suave" style="margin:0;font-size:13.5px">Todavía no se anota ningún contacto.</p>` : ""}
    </section>`;
    box.onclick = e => {
      if (e.target.closest("[data-seg-nuevo]")) { editarContacto(c, null, s, ctx.recargarSeg); return; }
      const ed = e.target.closest("[data-seg-ed]"); if (ed) { editarContacto(c, lista.find(x => x.id === Number(ed.dataset.segEd)), s, ctx.recargarSeg); return; }
      if (e.target.closest("[data-seg-mot]")) { motivo(c, s.cierre, ctx.recargarSeg); return; }
      if (e.target.closest("[data-seg-rech]")) { ctx.marcarRechazada(); return; }
      if (e.target.closest("[data-seg-ext]")) { if (ctx.sucio()) { aviso("Guarde primero los cambios de la cotización.", "mal"); return; } extender(c, s, ctx); return; }
      if (e.target.closest("[data-seg-wa]")) {
        const url = enlace && enlace.activo ? D.urlEnlace(enlace.token) : "";
        const txt = `Buenos días${per.nombre ? ", " + per.nombre.split(" ")[0] : ""}. Le escribo de ${emp.nombre || "EMTECSA"} por la propuesta ${c.numero}${c.titulo ? " (" + c.titulo + ")" : ""}.${url ? " Aquí la puede ver y aprobar: " + url : ""} ¿Tuvo oportunidad de revisarla?`;
        window.open(`https://wa.me/${per.tel}?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
        editarContacto(c, null, s, ctx.recargarSeg, "whatsapp");
      }
    };
  }

  async function avisos() {
    const p = A().sesion().perfil;
    if (!D.puede(p, "editarCotizacion")) return [];
    try {
      return (await D.pendientesSeguimiento()).map(({ c, s }) => s.vencida
        ? { c: "ambar", i: "alerta", t: `Venció ${c.numero} · ${c.cliente ? c.cliente.nombre : ""}`, d: `Sin respuesta desde el ${fCorta(s.vence)}`, chip: "", h: `#/cotizaciones/${c.id}` }
        : { c: s.atraso ? "ambar" : "azul", i: "phone", t: `Contactar a ${c.cliente ? c.cliente.nombre : ""} · ${c.numero}`, d: `${s.porque} · ${A().Q(c.total)}${s.ultimo ? ` · último contacto ${fCorta(s.ultimo.fecha)}` : ""}`, chip: s.atraso ? `Atrasado ${s.atraso} ${s.atraso === 1 ? "día" : "días"}` : "Hoy", h: `#/cotizaciones/${c.id}` });
    } catch (e) { return []; }
  }

  return { seccion, avisos, motivo };
})();
