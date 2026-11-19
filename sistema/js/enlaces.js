"use strict";
window.EMT_ENLACES = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  let vivo = null;

  const fechaC = f => { const s = String(f); const dt = s.length > 10 ? new Date(s) : (([y, m, d]) => new Date(y, m - 1, d))(s.slice(0, 10).split("-").map(Number)); return dt.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };
  const cuando = iso => {
    if (!iso) return "";
    const f = new Date(iso), h = new Date(), ay = new Date(); ay.setDate(h.getDate() - 1);
    const hora = f.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
    if (f.toDateString() === h.toDateString()) return `hoy ${hora}`;
    if (f.toDateString() === ay.toDateString()) return `ayer ${hora}`;
    return `${f.toLocaleDateString("es-GT", { day: "numeric", month: "short" })} ${hora}`;
  };
  const telDe = t => { const d = String(t || "").replace(/\D/g, ""); return d ? (d.length === 8 ? "502" + d : d) : ""; };
  const urlEquipo = token => new URL("../propuesta/?equipo#" + token, location.href).href;
  const textoMensaje = (c, contacto, url) => `Buen día${contacto ? ", " + contacto.nombre.split(/\s+/)[0] : ""}. Le comparto la propuesta ${c.numero} de EMTECSA${c.titulo ? " para " + c.titulo : ""}. Aquí puede verla, descargarla y aprobarla con su firma: ${url}`;

  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); A().aviso("Enlace copiado."); }
    catch (e) { const i = document.createElement("input"); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand("copy"); A().aviso("Enlace copiado."); } catch (er) { A().aviso("No se pudo copiar. Mantenga presionado el enlace para copiarlo.", "mal"); } i.remove(); }
  }
  const destino = (contacto, cli) => { const pr = cli && (cli.contactos || []).find(k => k.principal); return { tel: telDe((contacto && contacto.telefono) || (pr && pr.telefono) || (cli && cli.telefono)), correo: (contacto && contacto.correo) || (pr && pr.correo) || (cli && cli.correo) || "" }; };
  const botonesCompartir = (c, contacto, url, cli) => {
    const { ico, esc } = A();
    const dst = destino(contacto, cli), tel = dst.tel;
    const wa = `https://wa.me/${tel}?text=${encodeURIComponent(textoMensaje(c, contacto, url))}`;
    const mail = `mailto:${dst.correo ? encodeURIComponent(dst.correo) : ""}?subject=${encodeURIComponent(`Propuesta ${c.numero} · EMTECSA`)}&body=${encodeURIComponent(textoMensaje(c, contacto, url))}`;
    return `<button class="s-btn suave-b" type="button" data-enl-copiar>${ico("link", 15)}Copiar</button>
      <a class="s-btn suave-b" href="${esc(wa)}" target="_blank" rel="noopener">${ico("chat", 15)}WhatsApp</a>
      <a class="s-btn suave-b" href="${esc(mail)}">${ico("mail", 15)}Correo</a>`;
  };

  async function constancia(en) {
    A().aviso("Armando la constancia…");
    try { const b = await window.EMT_CONSTANCIA.armar({ d: en.datos, ap: en.aprobado, base: "" }); window.EMT_PDF.descargar(b, window.EMT_CONSTANCIA.nombreArchivo(en.datos)); }
    catch (e) { A().aviso("No se pudo armar la constancia. Intente otra vez.", "mal"); }
  }

  async function panel(o) {
    const { box, c, cli } = o;
    const { esc, ico, Q } = A();
    let en = await D.enlaceDe(c.id).catch(() => null);
    vivo = { id: c.id, refrescar: o.alAprobar, pintar: () => panel(o) };
    if (en) {
      const ids = en.eventos.filter(x => !x.atendido && x.tipo !== "mensaje").map(x => x.id);
      if (ids.length) { await D.atenderEventos(ids).catch(() => {}); insignia(); }
    }
    o.hayEnlace = !!en;
    const contacto = cli && cli.contactos.find(x => x.id === c.contacto_id);
    if (!en) {
      box.innerHTML = o.puede && c.estado === "enviada" ? `<div class="enl enl-nuevo"><span class="icono laton">${ico("send", 18)}</span><span class="enl-t"><b>Mandar al cliente</b><small>Lo ve en su teléfono y la aprueba con su firma.</small></span><button class="s-btn suave-b" type="button" data-enl-mandar>${ico("send", 15)}Mandar</button></div>` : "";
      return;
    }
    const hoy = D.hoyGT();
    const ap = en.aprobado, vencido = !ap && en.vence < hoy;
    const k = D.calcularCotizacion(c, o.cat);
    const huellaHoy = D.huellaEnlace(D.enlacePublico({ c, k, cli, emp: o.emp, contacto, sitio: cli && cli.sitios.find(x => x.id === c.sitio_id), cat: o.cat }));
    const cambio = !ap && en.activo && huellaHoy !== en.huella;
    const [chipC, chipT] = ap ? ["verde", "Aprobada"] : !en.activo ? ["gris", "Desactivado"] : vencido ? ["ambar", "Venció"] : en.vistas ? ["azul", `Visto ${en.vistas} ${en.vistas === 1 ? "vez" : "veces"}`] : ["gris", "Sin abrir"];
    const msgs = en.eventos.filter(x => x.tipo === "mensaje");
    const pend = msgs.filter(x => !x.atendido), viejos = msgs.filter(x => x.atendido);
    const desc = en.descargas || {};
    const descTxt = [desc.propuesta ? `la propuesta ${desc.propuesta === 1 ? "1 vez" : desc.propuesta + " veces"}` : "", desc.expediente ? `el expediente ${desc.expediente === 1 ? "1 vez" : desc.expediente + " veces"}` : ""].filter(Boolean).join(" y ");
    const url = D.urlEnlace(en.token);
    box.innerHTML = `<div class="enl">
      <div class="enl-cab"><span class="icono ${chipC === "verde" ? "verde" : "laton"}">${ico(ap ? "check" : "send", 18)}</span><span class="enl-t"><b>Enlace del cliente</b><small>Mandado el ${esc(fechaC(en.creado))}${ap ? "" : ` · ${vencido ? "venció" : "válido hasta"} el ${esc(fechaC(en.vence))}`}</small></span><span class="chip ${chipC}">${esc(chipT)}</span>${o.puede ? `<button class="s-ib" type="button" aria-label="Editar el enlace" data-enl-ed>${ico("pen", 15)}</button>` : ""}</div>
      ${ap ? `<div class="enl-ap"><span><b>${esc(ap.nombre)}${ap.puesto ? " · " + esc(ap.puesto) : ""}</b><small>La aprobó con su firma ${esc(cuando(ap.fecha))} · ${esc(Q(ap.total))}${ap.eleccion_txt ? " · " + esc(ap.eleccion_txt) : ""}</small></span><span class="acc"><button class="s-btn suave-b chico" type="button" data-enl-firma>${ico("eye", 14)}Ver la firma</button><button class="e-btn e-btn-salida" type="button" data-enl-const>${ico("download", 16)}Constancia</button></span></div>` : ""}
      <p class="enl-vis">${en.vistas ? `${ico("eye", 14)}Lo abrió ${en.vistas === 1 ? "1 vez" : en.vistas + " veces"} · la última ${esc(cuando(en.ultima_vista))}` : `${ico("clock", 14)}Todavía no lo abre`}${descTxt ? ` · descargó ${esc(descTxt)}` : ""}</p>
      ${pend.map(m => `<div class="enl-msg"><span>${ico("chat", 15)}</span><div><p>${esc(m.texto)}</p><small>${esc(cuando(m.fecha))}</small></div>${o.puede ? `<span class="acc">${destino(contacto, cli).tel ? `<a class="s-btn suave-b chico" href="${esc(`https://wa.me/${destino(contacto, cli).tel}?text=${encodeURIComponent(`Buen día${contacto ? ", " + contacto.nombre.split(/\s+/)[0] : ""}. Sobre su pregunta en la propuesta ${c.numero}: «${m.texto}»\n\n`)}`)}" target="_blank" rel="noopener">${ico("chat", 14)}Responder por WhatsApp</a>` : ""}<button class="s-btn suave-b chico" type="button" data-enl-atender="${m.id}">${ico("check", 14)}Ya lo atendí</button></span>` : ""}</div>`).join("")}
      ${viejos.length ? `<details class="enl-viejos"><summary>${viejos.length} ${viejos.length === 1 ? "mensaje atendido" : "mensajes atendidos"}</summary>${viejos.map(m => `<div class="enl-msg viejo"><span>${ico("chat", 15)}</span><div><p>${esc(m.texto)}</p><small>${esc(cuando(m.fecha))}</small></div></div>`).join("")}</details>` : ""}
      ${cambio && o.puede ? `<div class="enl-cambio">${ico("alerta", 15)}<span>La cotización cambió desde que la mandó. El cliente sigue viendo la anterior.</span><button class="s-btn lleno chico" type="button" data-enl-mandar>Actualizar el enlace</button></div>` : ""}
      ${en.activo && !vencido ? `<div class="enl-acc">${ap ? "" : botonesCompartir(c, contacto, url, cli)}<a class="s-btn suave-b" href="${esc(urlEquipo(en.token))}" target="_blank" rel="noopener">${ico("eye", 15)}Verlo como el cliente</a></div>` : vencido && o.puede ? `<div class="enl-acc"><button class="s-btn suave-b" type="button" data-enl-ed>${ico("clock", 15)}Abrirlo otra vez</button></div>` : ""}
    </div>`;
    box.onclick = async e => {
      if (e.target.closest("[data-enl-copiar]")) copiar(url);
      if (e.target.closest("[data-enl-const]")) constancia(en);
      if (e.target.closest("[data-enl-firma]")) A().modal({ titulo: "Firma del cliente", guardarTxt: "Cerrar", soloUno: true, cuerpo: `<div class="enl-firma"><img src="${esc(ap.firma)}" alt="Firma de ${esc(ap.nombre)}"></div><p class="suave" style="font-size:14px;margin:0"><b style="color:var(--text)">${esc(ap.nombre)}</b>${ap.puesto ? " · " + esc(ap.puesto) : ""} · ${esc(new Date(ap.fecha).toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" }))}</p>`, alGuardar: async () => A().cerrarCapas() });
      const at = e.target.closest("[data-enl-atender]"); if (at) { await D.atenderEventos([Number(at.dataset.enlAtender)]); insignia(); await A().quieto(() => panel(o)); A().aviso("Listo, quedó atendido."); }
      if (e.target.closest("[data-enl-ed]")) editar(en, o);
    };
  }

  function editar(en, o) {
    const { esc } = A();
    const hoy = D.hoyGT();
    const vencido = en.vence < hoy;
    A().modal({
      titulo: "Enlace del cliente", guardarTxt: "Guardar",
      cuerpo: `<label class="f-campo">Válido hasta<input type="date" name="vence" min="${esc(hoy)}" value="${esc(vencido ? D.venceDe({ fecha: hoy, vigencia_dias: o.c.vigencia_dias }) : en.vence)}"><small>${vencido ? `Venció el ${esc(fechaC(en.vence))}. Escoja hasta cuándo lo puede ver otra vez.` : "Después de esa fecha el cliente ve «Esta propuesta venció; escríbanos para actualizarla»."}</small></label>
        <label class="sw-fila"><span>Enlace activo<small style="display:block;font-size:12.5px;color:var(--text-muted)">Si lo apaga, el cliente ve que ya no está activo.</small></span><input type="checkbox" class="sw" name="activo" ${en.activo ? "checked" : ""}></label>`,
      alGuardar: async f => {
        await D.cambiarEnlace(en.id, { vence: en.aprobado ? null : f.vence.value, activo: f.activo.checked });
        A().cerrarCapas(); await A().quieto(() => panel(o)); A().aviso("Enlace guardado.");
      }
    });
  }

  async function mandar(o) {
    const { esc, ico, aviso } = A();
    const { c, cli } = o;
    if (o.sucio()) { aviso("Guarde primero los cambios de la cotización.", "mal"); return; }
    if (!c.partidas.length) { aviso("Agregue primero lo que se cotiza.", "mal"); return; }
    const ya = await D.enlaceDe(c.id).catch(() => null);
    const k0 = D.calcularCotizacion(c, o.cat);
    const pz = await window.EMT_EXPEDIENTE.piezas(c, k0);
    const extra = pz.partes.filter(x => x.k !== "propuesta" && x.on && x.docs.length).map(x => x.t.toLowerCase());
    const vence = D.venceDe(c);
    const venc = vence < D.hoyGT();
    A().modal({
      titulo: ya ? "Actualizar el enlace" : "Mandar al cliente", guardarTxt: ya ? "Actualizar" : "Crear el enlace",
      cuerpo: `<p class="suave" style="font-size:14.5px;margin:0">${ya ? "El cliente verá esta versión en el mismo enlace que ya tiene." : `${esc(cli ? cli.nombre : "El cliente")} recibe un enlace para ver la propuesta en el teléfono, descargarla y aprobarla con su firma.`}</p>
        ${extra.length ? `<label class="sw-fila"><span>Incluir el expediente completo<small style="display:block;font-size:12.5px;color:var(--text-muted)">Con ${esc(extra.join(", "))}.</small></span><input type="checkbox" class="sw" name="exp" checked></label>` : ""}
        <div class="enl-info">${c.estado === "borrador" ? `<p>${ico("check", 14)}Pasa a «Enviada» y sus precios quedan fijos.</p>` : ""}<p>${ico("clock", 14)}${venc ? `<b>Con esa fecha ya venció.</b> Cambie la fecha o los días de vigencia en Datos.` : `Lo puede ver hasta el ${esc(fechaC(vence))}: ${esc(c.vigencia_dias)} días desde la fecha de la cotización.`}</p><p>${ico("bell", 14)}Le avisamos cuando lo abra, cuando vuelva a verlo, cuando pregunte y cuando lo apruebe.</p></div>`,
      alGuardar: async f => {
        if (venc) throw new Error("Con esa fecha la propuesta ya venció. Cambie la fecha o la vigencia.");
        const b = f.closest(".modal") && f.closest(".modal").querySelector("[data-guardar]"); if (b) b.textContent = "Armando los PDF…";
        const listo = await o.prepararEnvio();
        const emp = await D.empresa();
        const contacto = cli && cli.contactos.find(x => x.id === c.contacto_id), sitio = cli && cli.sitios.find(x => x.id === c.sitio_id);
        const en = await D.publicarEnlace({ c: listo.c, k: listo.k, cli, emp, contacto, sitio, cat: o.cat }, { expediente: !!(f.exp && f.exp.checked) });
        A().cerrarCapas();
        await o.recargar();
        listoModal(listo.c, contacto, en, !!ya, cli);
      }
    });
  }

  function listoModal(c, contacto, en, actualizado, cli) {
    const { esc, ico } = A();
    const url = D.urlEnlace(en.token);
    const m = A().modal({
      titulo: actualizado ? "Enlace actualizado" : "Enlace listo", guardarTxt: "Listo", soloUno: true,
      cuerpo: `<p class="suave" style="font-size:14.5px;margin:0">${actualizado ? "El cliente ya ve la versión nueva en el mismo enlace." : `Mándeselo a ${esc(contacto ? contacto.nombre : "su cliente")}. Le avisamos en cuanto lo abra.`}</p>
        <label class="f-campo">Enlace<input readonly value="${esc(url)}" data-enl-url></label>
        <div class="enl-acc">${botonesCompartir(c, contacto, url, cli)}<a class="s-btn suave-b" href="${esc(urlEquipo(en.token))}" target="_blank" rel="noopener">${ico("eye", 15)}Verlo como el cliente</a></div>`,
      alAbrir: (f, mm) => { mm.addEventListener("click", e => { if (e.target.closest("[data-enl-copiar]")) copiar(url); }); f.querySelector("[data-enl-url]").addEventListener("focus", e => e.target.select()); },
      alGuardar: async () => A().cerrarCapas()
    });
    return m;
  }

  const TXT = {
    aprobo: x => ({ c: "verde", i: "check", t: `Aprobó: ${x.cliente}`, d: `${x.numero} · firmó ${x.texto || ""}`, chip: "Aprobada" }),
    mensaje: x => ({ c: "laton", i: "chat", t: `Pregunta de ${x.cliente}`, d: `${x.numero} · «${String(x.texto || "").slice(0, 90)}${String(x.texto || "").length > 90 ? "…" : ""}»`, chip: "Responder" }),
    abrio: x => ({ c: "azul", i: "eye", t: `Abrió la propuesta: ${x.cliente}`, d: `${x.numero} · ${cuando(x.fecha)}`, chip: "Visto" }),
    volvio: x => ({ c: "azul", i: "eye", t: `Volvió a verla: ${x.cliente}`, d: `${x.numero} · ${cuando(x.fecha)}`, chip: "Otra vez" }),
    datos: x => ({ c: "verde", i: "file", t: `Mandó sus datos para Energuate: ${x.cliente}`, d: `${x.numero} · ${cuando(x.fecha)}`, chip: "Datos" })
  };
  const ORDEN = { aprobo: 0, mensaje: 1, datos: 2, volvio: 3, abrio: 4 };
  async function porAtender() {
    if (!D.puede(A().sesion().perfil, "verEnlaces")) return [];
    const l = await D.pendientesEnlace().catch(() => []);
    const vistos = new Set();
    return l.filter(x => { const k = x.tipo === "mensaje" ? "m" + x.id : x.tipo + x.cotizacion_id; if (vistos.has(k)) return false; vistos.add(k); return true; })
      .sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo])
      .map(x => ({ ...TXT[x.tipo]({ cliente: x.cotizacion && x.cotizacion.cliente ? x.cotizacion.cliente.nombre : "Cliente", numero: x.cotizacion ? x.cotizacion.numero : "", texto: x.texto, fecha: x.fecha }), h: `#/cotizaciones/${x.cotizacion_id}`, tipo: x.tipo }));
  }

  async function insignia() {
    let n = 0;
    try { if (D.puede(A().sesion().perfil, "verEnlaces")) n = (await D.pendientesEnlace()).filter(x => x.tipo === "aprobo" || x.tipo === "mensaje").length; } catch (e) {}
    const m = document.querySelector(".barra [data-menu]"); if (m) { m.dataset.pCot = n; m.classList.toggle("con-punto", Number(m.dataset.pCot || 0) + Number(m.dataset.pTienda || 0) + Number(m.dataset.pEq || 0) > 0); }
    if (A().marcarInsignia) A().marcarInsignia("cotizaciones", n);
  }

  async function notificar(titulo, cuerpo, id) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const ops = { body: cuerpo, icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: "cot-" + id, renotify: true, data: { url: "./#/cotizaciones/" + id } };
    try { const r = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null; if (r) { await r.showNotification(titulo, ops); return; } } catch (e) {}
    try { const n = new Notification(titulo, ops); n.onclick = () => { focus(); location.hash = "#/cotizaciones/" + id; }; } catch (e) {}
  }

  D.alEnlace(async m => {
    if (!m || !A() || !A().sesion() || !D.puede(A().sesion().perfil, "verEnlaces")) return;
    let l = [], x = null;
    for (let i = 0; i < 12 && !x; i++) { if (i) await new Promise(r => setTimeout(r, 120)); l = await D.pendientesEnlace().catch(() => []); x = l.find(y => y.id === m.id); }
    x = x || l.find(y => y.cotizacion_id === m.cotizacion_id && y.tipo === m.tipo);
    const cliN = x && x.cotizacion && x.cotizacion.cliente ? x.cotizacion.cliente.nombre : "El cliente";
    const num = x && x.cotizacion ? x.cotizacion.numero : "";
    const T = { aprobo: [`${cliN} aprobó ${num}`, x && x.texto ? "Firmó " + x.texto : "Con su firma"], mensaje: [`Pregunta de ${cliN}`, x ? String(x.texto || "").slice(0, 120) : ""], abrio: [`${cliN} abrió la propuesta`, num], volvio: [`${cliN} volvió a ver la propuesta`, num], datos: [`${cliN} mandó sus datos para Energuate`, num] }[m.tipo];
    if (!T) return;
    A().aviso(T[0] + (m.tipo === "mensaje" ? "" : ""));
    notificar(T[0], T[1], m.cotizacion_id);
    insignia();
    const h = location.hash;
    if (vivo && vivo.id === m.cotizacion_id && new RegExp(`^#/cotizaciones/${m.cotizacion_id}$`).test(h)) {
      if (m.tipo === "aprobo" && vivo.refrescar) await vivo.refrescar(); else await A().quieto(vivo.pintar);
    } else if ((h === "#/hoy" || h === "" || h === "#/") && !document.querySelector(".modal")) {
      const v = document.getElementById("vista"); if (v && A().recargarHoy) await A().recargarHoy();
    }
  });

  return { panel, mandar, porAtender, insignia, constancia };
})();
