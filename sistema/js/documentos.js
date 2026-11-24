"use strict";
window.EMT_DOCUMENTOS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { borrador: "gris", enviado: "azul", firmado: "verde", anulado: "gris" };
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };
  const hoyISO = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const telDe = t => { const d = String(t || "").replace(/\D/g, ""); return d ? (d.length === 8 ? "502" + d : d) : ""; };
  const limpio = s => String(s || "").replace(/[\\/:*?"<>|]/g, "").trim();
  const ZIP = ["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG"];
  let zipP = null;
  const jszip = () => window.JSZip ? Promise.resolve(window.JSZip) : zipP || (zipP = new Promise((ok, mal) => { const s = document.createElement("script"); s.src = ZIP[0]; s.integrity = ZIP[1]; s.crossOrigin = "anonymous"; s.onload = () => ok(window.JSZip); s.onerror = () => { zipP = null; mal(new Error("No se pudo preparar la carpeta. Revise el internet.")); }; document.head.appendChild(s); }));

  function pad(canvas) {
    const ctx = canvas.getContext("2d");
    let trazos = [], act = null;
    const medir = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dib(); };
    const linea = (c, t, e) => { if (!t.length) return; c.lineWidth = 2.4 * e; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#0E1D33"; c.beginPath(); c.moveTo(t[0].x * e, t[0].y * e); if (t.length === 1) c.lineTo(t[0].x * e + 0.1, t[0].y * e + 0.1); for (let i = 1; i < t.length; i++) c.lineTo(t[i].x * e, t[i].y * e); c.stroke(); };
    const dib = () => { const r = canvas.getBoundingClientRect(); ctx.clearRect(0, 0, r.width, r.height); trazos.forEach(t => linea(ctx, t, 1)); };
    const pt = ev => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    canvas.addEventListener("pointerdown", ev => { ev.preventDefault(); { const r = canvas.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1); if (Math.abs(canvas.width - Math.round(r.width * dpr)) > 2 || Math.abs(canvas.height - Math.round(r.height * dpr)) > 2) medir(); } try { canvas.setPointerCapture(ev.pointerId); } catch (e) {} act = [pt(ev)]; trazos.push(act); dib(); canvas.dispatchEvent(new Event("firma")); });
    canvas.addEventListener("pointermove", ev => { if (!act) return; ev.preventDefault(); act.push(pt(ev)); dib(); });
    const fin = () => { if (act) { act = null; canvas.dispatchEvent(new Event("firma")); } };
    ["pointerup", "pointercancel", "pointerleave"].forEach(k => canvas.addEventListener(k, fin));
    medir();
    return {
      borrar() { trazos = []; dib(); canvas.dispatchEvent(new Event("firma")); },
      tinta: () => trazos.length > 0,
      vacia() { const p = trazos.flat(); if (p.length < 8) return true; const xs = p.map(z => z.x), ys = p.map(z => z.y); return (Math.max(...xs) - Math.min(...xs)) < 30 && (Math.max(...ys) - Math.min(...ys)) < 14; },
      png() { const p = trazos.flat(); const xs = p.map(z => z.x), ys = p.map(z => z.y); const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10, w = Math.max(...xs) - x0 + 10, h = Math.max(...ys) - y0 + 10; const e = Math.min(2, 900 / w); const o = document.createElement("canvas"); o.width = Math.round(w * e); o.height = Math.round(h * e); const c = o.getContext("2d"); c.translate(-x0 * e, -y0 * e); trazos.forEach(t => linea(c, t, e)); return o.toDataURL("image/png"); }
    };
  }

  function firmar(titulo, texto, ini, alFirmar) {
    const { modal, esc } = A();
    let fp = null;
    modal({
      titulo, guardarTxt: "Firmar",
      cuerpo: `<p class="suave" style="font-size:14px;margin:0">${esc(texto)}</p>
        <div class="f-fila"><label class="f-campo">Nombre<input name="nombre" value="${esc(ini.nombre || "")}" autocomplete="off"></label><label class="f-campo">Puesto <small>opcional</small><input name="puesto" value="${esc(ini.puesto || "")}" autocomplete="off"></label></div>
        <div class="f-campo"><span class="firma-cab">Firma con el dedo<button class="s-btn suave-b chico" type="button" data-borrar-firma>Borrar</button></span><div class="firma-caja"><canvas data-pad aria-label="Recuadro para firmar"></canvas><span class="firma-guia" data-guia>Firme aquí</span></div></div>`,
      alAbrir: (f, mm) => { mm.classList.add("modal-ancho"); setTimeout(() => { fp = pad(f.querySelector("[data-pad]")); f.querySelector("[data-pad]").addEventListener("firma", () => { f.querySelector("[data-guia]").hidden = fp.tinta(); }); }, 60); mm.addEventListener("click", ev => { if (ev.target.closest("[data-borrar-firma]") && fp) fp.borrar(); }); },
      alGuardar: async f => { if (!fp || fp.vacia()) throw new Error("Falta la firma."); await alFirmar({ nombre: f.nombre.value, puesto: f.puesto.value, firma: fp.png() }); }
    });
  }

  async function pdfDe(d) {
    const emp = await D.empresa();
    const b = d.tipo === "contrato" ? await window.EMT_PDF.contrato({ doc: d, emp }) : d.tipo === "ot" ? await window.EMT_PDF.ordenTrabajo({ doc: d, emp }) : await window.EMT_PDF.actaEntrega({ doc: d, emp });
    return { bytes: b, nombre: `${d.numero} - ${D.TIPOS_DOC_OBRA[d.tipo]}.pdf` };
  }
  async function verPdf(d) {
    const { aviso } = A();
    try { aviso("Armando el documento…"); const r = await pdfDe(await D.docObra(d.id)); window.EMT_PDF.ver(r.bytes, r.nombre); }
    catch (er) { aviso(/[áéíóúñ]/i.test(er.message) ? er.message : "No se pudo armar el documento. Intente otra vez.", "mal"); }
  }

  async function panel(o, alCambiar) {
    const { modal, esc, ico, aviso, cerrarCapas } = A();
    const p = A().sesion().perfil;
    if (o.cotizacion_id && D.pendientesEnlace && D.puede(p, "verEnlaces")) {
      const ids = (await D.pendientesEnlace().catch(() => [])).filter(z => z.tipo === "contrato" && z.cotizacion_id === o.cotizacion_id).map(z => z.id);
      if (ids.length) { await D.atenderEventos(ids).catch(() => {}); if (window.EMT_ENLACES) window.EMT_ENLACES.insignia(); }
    }
    const [docs, est, oc, r] = await Promise.all([D.documentosObra(o.id), D.puede(p, "verCobros") ? D.estimacionesDe(o).catch(() => null) : null, D.puede(p, "verCobros") ? D.cambiosDe(o).catch(() => null) : null, D.puede(p, "verCobros") ? D.resumenCobros().catch(() => null) : null]);
    const vivos = docs.filter(d => d.estado !== "anulado");
    const contrato = vivos.find(d => d.tipo === "contrato"), acta = vivos.find(d => d.tipo === "acta");
    const ots = vivos.filter(d => d.tipo === "ot").sort((a, b) => String(b.programacion_fecha || b.fecha).localeCompare(String(a.programacion_fecha || a.fecha)));
    const puedeC = D.puede(p, "registrarPago") || D.puede(p, "editarCotizacion"), puedeO = D.puede(p, "editarObra");
    const chip = d => `<span class="chip ${CHIP[d.estado]}">${esc(D.ESTADOS_DOC_OBRA[d.estado])}</span>`;
    const fila = (ic, t, sub, der, attrs) => `<div class="fila num-f" style="cursor:default"><span class="icono gris">${ico(ic, 16)}</span><span><b>${t}</b><small>${sub}</small></span>${der}</div>`;
    const btnAbrir = (d, txt2) => `<button class="s-btn suave-b chico" type="button" data-doc-abrir="${d.id}">${txt2 || "Abrir"}</button>`;
    const pdfB = (k, id, txt2 = "Ver PDF") => `<button class="s-btn suave-b chico" type="button" data-doc-pdf="${k}:${id}">${ico("eye", 14)}${txt2}</button>`;
    const pagos = r ? r.pagos.filter(x => x.obra_id === o.id && !x.anulado) : [];
    const otros = [
      ...(o.cotizacion_id ? [fila("file", "Propuesta", "La que aprobó el cliente", pdfB("cot", o.cotizacion_id))] : []),
      ...((est && est.lista) || []).filter(e => e.estado !== "anulada").map(e => fila("chart", `Estimación ${esc(e.correlativo)} · <span class="nw">${esc(e.numero)}</span>`, `${esc(D.ESTADOS_EST[e.estado])} · ${esc(fCorta(e.fecha))}`, pdfB("est", e.id))),
      ...((oc && oc.lista) || []).filter(e => e.estado !== "anulada").map(e => fila(e.tipo === "deductivo" ? "minus" : "plus", `Orden de cambio ${esc(e.correlativo)} · <span class="nw">${esc(e.numero)}</span>`, `${esc(D.ESTADOS_EST[e.estado])} · ${esc(fCorta(e.fecha))}`, pdfB("oc", e.id))),
      ...pagos.map(x => fila("wallet", `Recibo <span class="nw">${esc(x.numero)}</span>`, esc(fCorta(x.fecha)), pdfB("rec", x.id)))
    ];
    const m = modal({
      titulo: `Documentos de la obra · ${o.numero}`, guardarTxt: "Bajar todo en una carpeta", soloUno: true,
      cuerpo: `${puedeC || contrato ? `<section class="docs-s"><h3>Contrato</h3><div class="lista sin-chip">${contrato ? fila("file", `Contrato · <span class="nw">${esc(contrato.numero)}</span>`, `${chip(contrato)}${contrato.firma ? ` · ${esc(contrato.firma.nombre)}` : ""}`, btnAbrir(contrato)) : fila("file", "Contrato de obra", "Se llena solo con los datos de la obra y la propuesta", puedeC ? `<button class="s-btn suave-b chico" type="button" data-doc-nuevo="contrato">${ico("plus", 14)}Armar</button>` : "<span></span>")}</div></section>` : ""}
        <section class="docs-s"><h3>Órdenes de trabajo</h3>${ots.length ? `<div class="lista sin-chip">${ots.map(d => fila("users", `${esc(fCorta(d.programacion_fecha || d.fecha))} · <span class="nw">${esc(d.numero)}</span>`, `${chip(d)} · ${esc((d.datos.recursos || []).map(x => x.nombre).join(", ") || "Sin cuadrilla")}`, btnAbrir(d))).join("")}</div>` : `<p class="suave docs-vacio">Salen de la Programación: en el día que va una cuadrilla, toque su obra y «Orden de trabajo».</p>`}</section>
        <section class="docs-s"><h3>Acta de entrega</h3><div class="lista sin-chip">${acta ? fila("check", `Acta · <span class="nw">${esc(acta.numero)}</span>`, `${chip(acta)}${acta.firma ? ` · recibió ${esc(acta.firma.nombre)}` : ""}`, btnAbrir(acta)) : fila("check", "Acta de entrega", "Con lo instalado, las pruebas y la revisión de entrega; el cliente firma en el teléfono", puedeO ? `<button class="s-btn suave-b chico" type="button" data-doc-nuevo="acta">${ico("plus", 14)}Armar</button>` : "<span></span>")}</div></section>
        ${otros.length ? `<section class="docs-s"><h3>Lo demás de la obra</h3><div class="lista sin-chip">${otros.join("")}</div></section>` : ""}`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho");
        mm.addEventListener("click", async ev => {
          const n = ev.target.closest("[data-doc-nuevo]"); if (n) { if (n.dataset.docNuevo === "contrato") armarContrato(o, null, alCambiar); else armarActa(o, null, alCambiar); return; }
          const a = ev.target.closest("[data-doc-abrir]"); if (a) { abrir(o, Number(a.dataset.docAbrir), alCambiar); return; }
          const pb = ev.target.closest("[data-doc-pdf]"); if (pb) { const [k, id] = pb.dataset.docPdf.split(":"); pb.disabled = true; try { const x = await pdfOtro(o, k, Number(id)); window.EMT_PDF.ver(x.bytes, x.nombre); } catch (er) { aviso("No se pudo armar el documento.", "mal"); } finally { pb.disabled = false; } }
        });
      },
      alGuardar: async () => {
        aviso("Armando la carpeta…");
        const JSZip = await jszip(); const z = new JSZip(); let k = 0;
        const poner = async fn => { try { const x = await fn(); z.file(x.nombre, x.bytes); k++; } catch (e) {} };
        if (o.cotizacion_id) await poner(() => pdfOtro(o, "cot", o.cotizacion_id));
        for (const d of vivos) await poner(async () => pdfDe(await D.docObra(d.id)));
        for (const e of ((est && est.lista) || []).filter(e => e.estado !== "anulada")) await poner(() => pdfOtro(o, "est", e.id));
        for (const e of ((oc && oc.lista) || []).filter(e => e.estado !== "anulada")) await poner(() => pdfOtro(o, "oc", e.id));
        for (const x of pagos) await poner(() => pdfOtro(o, "rec", x.id));
        if (!k) throw new Error("Todavía no hay documentos.");
        const bytes = await z.generateAsync({ type: "uint8array" });
        const b = new Blob([bytes], { type: "application/zip" }); const u = URL.createObjectURL(b); const el = document.createElement("a"); el.href = u; el.download = `Documentos ${o.numero}${o.titulo ? " - " + limpio(o.titulo) : ""}.zip`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
        cerrarCapas(); aviso(`Se bajaron ${k} ${k === 1 ? "documento" : "documentos"}.`);
      }
    });
    return m;
  }

  async function pdfOtro(o, k, id) {
    const emp = await D.empresa();
    if (k === "est") { const est = await D.estimacion(id); return { bytes: await window.EMT_PDF.estimacion({ est, emp }), nombre: `${est.numero} - Estimación ${est.correlativo}.pdf` }; }
    if (k === "oc") { const oc = await D.cambio(id); return { bytes: await window.EMT_PDF.ordenCambio({ oc, emp }), nombre: `${oc.numero} - Orden de cambio ${oc.correlativo}.pdf` }; }
    if (k === "rec") { const r = await D.resumenCobros(); const pago = r.pagos.find(x => x.id === id); const cli = await D.cliente(pago.cliente_id); return { bytes: await window.EMT_PDF.recibo({ pago, cli, obra: r.obras[pago.obra_id], parte: r.partes.find(x => x.id === pago.parte_id), saldoObra: null, emp }), nombre: `Recibo ${pago.numero}.pdf` }; }
    const c = await D.cotizacion(id); const cat = await D.catalogo(); const cli = await D.cliente(c.cliente_id);
    return { bytes: await window.EMT_PDF.generar({ c, k: D.calcularCotizacion(c, cat), cli, emp, contacto: cli && (cli.contactos || []).find(x => x.id === c.contacto_id), sitio: cli && (cli.sitios || []).find(x => x.id === c.sitio_id), cat }), nombre: window.EMT_PDF.nombreArchivo(c, cli) };
  }

  async function armarContrato(o, d0, alCambiar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const plantilla = await D.plantillaContrato();
    const base = d0 ? d0.datos : { ...(await D.datosContrato(o)), numero: ((await D.proximosNumeros().catch(() => ({}))).ct || {}).siguiente || "" };
    let editado = !!d0;
    modal({
      titulo: d0 ? `Cambiar el contrato ${d0.numero}` : "Contrato de obra", guardarTxt: "Guardar",
      cuerpo: `<div class="f-fila"><label class="f-campo">Representante del cliente<input name="rep" value="${esc(base.cliente_representante || "")}" autocomplete="off"></label><label class="f-campo">Puesto<input name="puesto" value="${esc(base.cliente_puesto || "")}" autocomplete="off" placeholder="Gerente general"></label></div>
        <label class="f-campo">Texto del contrato<textarea name="texto" rows="16" class="contrato-t">${esc(d0 ? d0.datos.texto : D.llenarContrato(plantilla, base))}</textarea><small>Ya trae los datos de la obra. Lo que diga «______» falta llenarlo. El texto base se cambia en Empresa.</small></label>`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho");
        f.texto.addEventListener("input", () => { editado = true; });
        const rehacer = () => { if (editado) return; f.texto.value = D.llenarContrato(plantilla, { ...base, cliente_representante: f.rep.value, cliente_puesto: f.puesto.value }); };
        f.rep.addEventListener("input", rehacer); f.puesto.addEventListener("input", rehacer);
      },
      alGuardar: async f => {
        const texto = f.texto.value.trim(); if (texto.length < 50) throw new Error("El contrato quedó muy corto.");
        const id = await D.guardarDocumento(o, { id: d0 ? d0.id : null, tipo: "contrato", datos: { ...base, cliente_representante: f.rep.value.trim(), cliente_puesto: f.puesto.value.trim(), texto, ...(d0 ? { numero: d0.numero } : {}) } });
        if (!d0 && base.numero) { const dn = await D.docObra(id); if (dn.numero !== base.numero && texto.includes(base.numero)) await D.guardarDocumento(o, { id, tipo: "contrato", datos: { ...dn.datos, texto: texto.split(base.numero).join(dn.numero) } }); }
        cerrarCapas(); aviso("Contrato guardado."); if (alCambiar) await alCambiar(); abrir(o, id, alCambiar);
      }
    });
  }

  async function armarActa(o, d0, alCambiar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const cli = await D.cliente(o.cliente_id).catch(() => null);
    const k = ((cli && cli.contactos) || []).find(c => c.principal) || {};
    const x = d0 ? d0.datos : {};
    const prev = await D.datosActa(o, {});
    const nInst = prev.instalado.reduce((a, g) => a + g.l.length, 0), nOk = prev.instalado.reduce((a, g) => a + g.l.filter(m => m.instalado).length, 0);
    const rOk = prev.revision.filter(r => r.hecho).length;
    modal({
      titulo: d0 ? `Cambiar el acta ${d0.numero}` : "Acta de entrega", guardarTxt: "Guardar",
      cuerpo: `<p class="suave" style="font-size:13.5px;margin:0">Lleva lo instalado (${nOk} de ${nInst} renglones marcados), ${prev.equipos.length} ${prev.equipos.length === 1 ? "equipo" : "equipos"} del sitio y la revisión de entrega (${rOk} de ${prev.revision.length} puntos).</p>
        <div class="f-fila"><label class="f-campo">Fecha de entrega<input type="date" name="fecha" value="${esc(x.fecha || hoyISO())}"></label><label class="f-campo">Entrega por EMTECSA<input name="entrega" value="${esc(x.entrega || o.responsable || A().sesion().perfil.nombre)}" autocomplete="off"></label></div>
        <div class="f-fila"><label class="f-campo">Recibe<input name="nombre" value="${esc((x.recibe && x.recibe.nombre) || k.nombre || "")}" autocomplete="off"></label><label class="f-campo">Puesto <small>opcional</small><input name="puesto" value="${esc((x.recibe && x.recibe.puesto) || k.puesto || "")}" autocomplete="off"></label></div>
        <label class="f-campo">Pruebas realizadas <small>opcional</small><textarea name="pruebas" rows="3" placeholder="Por ejemplo: resistencia de aislamiento 2,000 MΩ; relación de transformación correcta">${esc(x.pruebas || "")}</textarea></label>
        <label class="f-campo">Observaciones <small>opcional</small><textarea name="obs" rows="2">${esc(x.observaciones || "")}</textarea></label>`,
      alAbrir: (f, mm) => mm.classList.add("modal-ancho"),
      alGuardar: async f => {
        const datos = await D.datosActa(o, { fecha: f.fecha.value, nombre: f.nombre.value, puesto: f.puesto.value, pruebas: f.pruebas.value, observaciones: f.obs.value, entrega: f.entrega.value });
        if (!datos.recibe.nombre) throw new Error("Escriba quién recibe la obra.");
        const id = await D.guardarDocumento(o, { id: d0 ? d0.id : null, tipo: "acta", fecha: datos.fecha, datos: d0 ? { ...datos, numero: d0.numero } : datos });
        cerrarCapas(); aviso("Acta guardada."); if (alCambiar) await alCambiar(); abrir(o, id, alCambiar);
      }
    });
  }

  async function ordenDelDia(obraId, fecha) {
    const { aviso } = A();
    try {
      const o = await D.obra(obraId);
      const [prog, rec, docs] = await Promise.all([D.programacion(fecha, fecha, obraId), D.recursos(), D.documentosObra(obraId)]);
      const rp = Object.fromEntries(rec.map(r => [r.id, r]));
      const del = prog.map(p => ({ ...(rp[p.recurso_id] || { nombre: "Recurso" }), turno: p.turno, nota: p.nota }));
      const ya = docs.find(d => d.tipo === "ot" && d.estado !== "anulado" && d.programacion_fecha === fecha);
      if (ya && ya.estado === "firmado") { abrir(o, ya.id); return; }
      const datos = await D.datosOT(o, fecha, del);
      const id = await D.guardarDocumento(o, { id: ya ? ya.id : null, tipo: "ot", fecha: hoyISO(), programacion_fecha: fecha, datos: ya ? { ...datos, numero: ya.numero } : datos });
      abrir(o, id);
    } catch (er) { aviso(er.message, "mal"); }
  }

  async function abrir(o, id, alCambiar) {
    const { modal, esc, ico, aviso, cerrarCapas } = A();
    const p = A().sesion().perfil;
    let d; try { d = await D.docObra(id); } catch (er) { aviso(er.message, "mal"); return; }
    const puede = d.tipo === "contrato" ? D.puede(p, "registrarPago") || D.puede(p, "editarCotizacion") : D.puede(p, "editarObra");
    const recargar = async () => { if (alCambiar) await alCambiar(); };
    const btn = (k, i, t) => `<button class="s-btn suave-b" type="button" data-da="${k}">${ico(i, 15)}${t}</button>`;
    const extras = [];
    let principal = "Ver PDF", accion = () => verPdf(d);
    let en = null;
    if (d.tipo === "contrato" && o.cotizacion_id && D.enlaceDe) { en = await D.enlaceDe(o.cotizacion_id).catch(() => null); if (en && !(en.activo && en.aprobado)) en = null; }
    if (puede && d.estado === "borrador") {
      extras.push(btn("pdf", "eye", "Ver PDF"), btn("cambiar", "pen", "Cambiar"));
      if (d.tipo === "contrato") { if (en) { principal = "Mandar al cliente"; accion = () => mandar(o, d, en, recargar); } else { principal = "Firmó en papel"; accion = () => papel(d, recargar, o); } }
      else { principal = d.tipo === "ot" ? "Firma el jefe de cuadrilla" : "Firma el cliente"; accion = () => firmarDoc(o, d, recargar); }
    } else if (puede && d.estado === "enviado") {
      extras.push(btn("pdf", "eye", "Ver PDF"), btn("papel", "check", "Firmó en papel"), btn("regresar", "pen", "Regresar a borrador"));
      principal = "Mandar otra vez"; accion = () => mandar(o, d, en, recargar);
    }
    const desc = d.tipo === "contrato" ? (d.estado === "firmado" ? `Firmado por ${d.firma.nombre}${d.firma.puesto ? ", " + d.firma.puesto : ""}${d.firma.en === "enlace" ? " en su enlace" : ""}.` : d.estado === "enviado" ? "Está en el enlace del cliente, esperando su firma." : en ? "Borrador: el cliente todavía no lo ve." : "Borrador. La obra no tiene enlace aprobado; se puede imprimir y firmar en papel.")
      : d.tipo === "ot" ? `${fCorta(d.programacion_fecha)} · ${(d.datos.recursos || []).map(x => x.nombre).join(", ") || "sin cuadrilla programada"}${d.estado === "firmado" ? ` · recibió ${d.firma.nombre}` : ""}`
      : d.estado === "firmado" ? `Recibió ${d.firma.nombre}${d.firma.puesto ? ", " + d.firma.puesto : ""} el ${fCorta(d.firma.fecha)}.` : `Recibe ${(d.datos.recibe && d.datos.recibe.nombre) || "el cliente"}. Falta su firma.`;
    const m = modal({
      titulo: `${D.TIPOS_DOC_OBRA[d.tipo]} · ${d.numero}`, guardarTxt: principal, extra: extras.join(""), soloUno: true,
      quitar: !puede ? null : d.estado === "borrador" ? async () => { try { await D.quitarDocumento(d.id); cerrarCapas(); aviso("Documento quitado."); await recargar(); } catch (er) { aviso(er.message, "mal"); } } : d.estado !== "anulado" ? () => anular(d, recargar) : null,
      quitarTxt: d.estado === "borrador" ? "Quitar" : "Anular",
      cuerpo: `<p class="est-estado"><span class="chip ${CHIP[d.estado]}">${esc(D.ESTADOS_DOC_OBRA[d.estado])}</span><span class="suave">${esc(desc)}</span></p>
        ${d.tipo === "ot" && (d.datos.etapas || []).length ? `<p class="suave" style="margin:0;font-size:13.5px">Toca: ${esc(d.datos.etapas.map(e => e.nombre).join(", "))}${d.datos.sitio ? ` · ${esc(d.datos.sitio)}` : ""}</p>` : ""}`,
      alGuardar: async () => { await accion(); }
    });
    m.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-da]"); if (!b) return;
      const k = b.dataset.da;
      if (k === "pdf") verPdf(d);
      if (k === "cambiar") { if (d.tipo === "contrato") armarContrato(o, d, alCambiar); else if (d.tipo === "acta") armarActa(o, d, alCambiar); else ordenDelDia(o.id, d.programacion_fecha); }
      if (k === "papel") papel(d, recargar, o);
      if (k === "regresar") { try { await D.regresarDocumento(d.id); cerrarCapas(); aviso("Regresó a borrador. El cliente ya no lo ve."); await recargar(); } catch (er) { aviso(er.message, "mal"); } }
    });
  }

  function firmarDoc(o, d, recargar) {
    const { cerrarCapas, aviso } = A();
    const ini = d.tipo === "acta" ? (d.datos.recibe || {}) : { nombre: ((d.datos.recursos || []).find(x => x.tipo === "cuadrilla") || {}).detalle || "" };
    firmar(d.tipo === "ot" ? "Recibe la orden de trabajo" : "Recibe la obra", d.tipo === "ot" ? "El jefe de cuadrilla firma que recibió la orden y el material." : "El cliente firma que recibe la obra. Tiene cinco días hábiles para señalar observaciones.", ini, async f => {
      await D.firmarDocumento(d.id, { ...f, en: "obra", por: A().sesion().perfil.nombre });
      cerrarCapas(); aviso("Firmado."); await recargar();
      if (d.tipo === "acta") ofrecerTerminar(o, recargar); else abrir(o, d.id);
    });
  }
  function ofrecerTerminar(o, recargar) {
    if (o.estado === "terminada" || o.estado === "cancelada" || !D.puede(A().sesion().perfil, "editarObra")) return;
    const { modal, cerrarCapas, aviso, esc } = A();
    modal({ titulo: "¿Dar la obra por terminada?", guardarTxt: "Sí, terminada",
      cuerpo: `<p class="suave" style="font-size:15px">El cliente ya recibió la obra. ${esc(o.numero)} pasa a «Terminada».</p>`,
      alGuardar: async () => { await D.guardarObra({ ...o, estado: "terminada" }); cerrarCapas(); aviso("La obra quedó terminada."); await recargar(); } });
  }
  function papel(d, recargar, o) {
    const { modal, cerrarCapas, aviso } = A();
    modal({ titulo: "Firmó en papel", guardarTxt: "Marcar firmado",
      cuerpo: `<p class="suave" style="font-size:14.5px">Para cuando lo firmaron impreso. Guarde el papel firmado.</p><label class="f-campo">Quién firmó<input name="nombre" value="${A().esc(d.datos.cliente_representante || (d.datos.recibe && d.datos.recibe.nombre) || "")}" autocomplete="off"></label><label class="f-campo">Puesto <small>opcional</small><input name="puesto" value="${A().esc(d.datos.cliente_puesto || "")}" autocomplete="off"></label>`,
      alGuardar: async f => { await D.firmarDocumento(d.id, { nombre: f.nombre.value, puesto: f.puesto.value, en: "papel", por: A().sesion().perfil.nombre }); cerrarCapas(); aviso("Marcado como firmado."); await recargar(); if (d.tipo === "acta" && o) ofrecerTerminar(o, recargar); } });
  }
  function anular(d, recargar) {
    const { modal, cerrarCapas, aviso } = A();
    const m = modal({ titulo: `¿Anular ${d.numero}?`, guardarTxt: "Anular", cuerpo: `<label class="f-campo">Por qué se anula<input name="motivo" autocomplete="off"></label>`,
      alGuardar: async f => { await D.anularDocumento(d.id, f.motivo.value); cerrarCapas(); aviso("Documento anulado."); await recargar(); } });
    m.querySelector("[data-guardar]").classList.add("peligro-b");
  }
  async function mandar(o, d, en, recargar) {
    const { modal, esc, ico, cerrarCapas, aviso } = A();
    if (!en) { aviso("La obra no tiene un enlace aprobado del cliente.", "mal"); return; }
    await D.mandarDocumento(d.id);
    const cli = await D.cliente(o.cliente_id).catch(() => null);
    const k = ((cli && cli.contactos) || []).find(c => c.principal);
    const tel = telDe((k && k.telefono) || (cli && cli.telefono));
    const url = D.urlEnlace(en.token);
    const txt = `Buen día${k ? ", " + k.nombre.split(/\s+/)[0] : ""}. Le comparto el contrato ${d.numero} de la obra ${o.titulo || o.numero}. En su enlace lo puede leer y firmar: ${url}`;
    await recargar();
    modal({ titulo: "Contrato listo para el cliente", guardarTxt: "Listo", soloUno: true,
      cuerpo: `<p class="suave" style="font-size:15px">Ya aparece en el enlace del cliente. Mándele el aviso para que lo lea y lo firme.</p><div class="fila-b">${tel ? `<a class="s-btn suave-b" href="${esc(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`)}" target="_blank" rel="noopener">${ico("chat", 15)}WhatsApp</a>` : ""}<button class="s-btn suave-b" type="button" data-copiar>${ico("link", 15)}Copiar el mensaje</button></div>`,
      alAbrir: (f, mm) => mm.addEventListener("click", async ev => { if (!ev.target.closest("[data-copiar]")) return; try { await navigator.clipboard.writeText(txt); aviso("Mensaje copiado."); } catch (er) { aviso("No se pudo copiar.", "mal"); } }),
      alGuardar: async () => cerrarCapas() });
  }

  return { panel, ordenDelDia, firmar };
})();
