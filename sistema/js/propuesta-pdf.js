"use strict";
window.EMT_PDF = (() => {
  const LIBS = [
    ["https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js", "sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI"],
    ["https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js", "sha384-2p6U+1mmqF10USehFeRiyG2ESG9FwIqN+jxULn5w9jjQIihSn9Pt13dVCn/Hawjn"]
  ];
  const FOTOS = [
    ["torre-luna-2", "Torre con luna"], ["aisladores", "Subestación"], ["torre-luna", "Línea de noche"], ["subestacion-luces", "Subestación de noche"],
    ["torre-hora-azul", "Torre en hora azul"], ["poste-noche", "Poste de noche"], ["cables-negros", "Cables"], ["lineas-luna", "Líneas al anochecer"]
  ];
  const W = 612, H = 792, M = 56, PIE = 46;
  const COL = { noche: "#07111F", marino: "#102440", laton: "#C8A96A", latonT: "#7A5C22", texto: "#0E1D33", gris: "#4F5B69", linea: "#D5DBE2", fondo: "#EBEEF2", claro: "#D7DFEA" };
  let libs = null, fuentes = null;
  const Q = n => (Number(n || 0) < 0 ? "-" : "") + "Q " + Math.abs(Number(n || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cant = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });

  function cargarScript([src, integrity]) {
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = src; s.integrity = integrity; s.crossOrigin = "anonymous";
      s.onload = ok; s.onerror = () => mal(new Error("No se pudo cargar la herramienta del PDF. Revise el internet."));
      document.head.appendChild(s);
    });
  }
  async function preparar() {
    if (!libs) libs = (async () => { for (const l of LIBS) await cargarScript(l); })();
    await libs;
    if (!fuentes) fuentes = Promise.all(["Regular", "SemiBold", "Bold", "ExtraBold"].map(w => fetch(`fuentes/PlusJakartaSans-${w}.ttf`).then(r => { if (!r.ok) throw new Error("No se encontró la letra del PDF."); return r.arrayBuffer(); })));
    return fuentes;
  }
  async function bytes(url) { const r = await fetch(url); if (!r.ok) throw new Error("No se encontró una imagen del PDF."); return r.arrayBuffer(); }
  async function svgAPng(url, ancho) {
    const img = new Image(); img.src = url; await img.decode();
    const alto = Math.round(ancho * img.naturalHeight / img.naturalWidth);
    const cv = document.createElement("canvas"); cv.width = ancho; cv.height = alto;
    cv.getContext("2d").drawImage(img, 0, 0, ancho, alto);
    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    return blob.arrayBuffer();
  }

  function partir(texto, font, size, ancho) {
    const lineas = [];
    String(texto || "").split(/\n/).forEach(par => {
      const palabras = par.split(/\s+/).filter(Boolean);
      if (!palabras.length) { lineas.push(""); return; }
      let l = "";
      palabras.forEach(p => {
        const prueba = l ? l + " " + p : p;
        if (font.widthOfTextAtSize(prueba, size) <= ancho) l = prueba;
        else { if (l) lineas.push(l); l = p; while (font.widthOfTextAtSize(l, size) > ancho && l.length > 1) { let i = l.length - 1; while (i > 1 && font.widthOfTextAtSize(l.slice(0, i), size) > ancho) i--; lineas.push(l.slice(0, i)); l = l.slice(i); } }
      });
      lineas.push(l);
    });
    return lineas;
  }

  async function generar({ c, k, cli, emp, contacto, sitio, cat }) {
    const [fR, fS, fB, fX] = await preparar();
    const D = window.EMT_DATOS;
    const op = c.opciones || {};
    const conOp = !c.eleccion && ((op.lista || []).length >= 2 || (op.extras || []).length > 0);
    const es = conOp ? D.escenariosCotizacion(c, cat || await D.catalogo()) : null;
    const { PDFDocument, rgb } = window.PDFLib;
    const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    doc.setTitle(`Propuesta ${c.numero}${cli ? " · " + cli.nombre : ""}`);
    doc.setAuthor(emp.nombre || "EMTECSA");
    doc.setCreator("Sistema EMTECSA");
    const F = { r: await doc.embedFont(fR, { subset: true }), s: await doc.embedFont(fS, { subset: true }), b: await doc.embedFont(fB, { subset: true }), x: await doc.embedFont(fX, { subset: true }) };
    const [fotoB, logoB, logoC] = await Promise.all([bytes(`../img/${(FOTOS.find(f => f[0] === c.foto) || FOTOS[0])[0]}.jpg`), svgAPng("../logo/emtecsa-logo-blanco.svg", 1200), svgAPng("../logo/emtecsa-logo.svg", 1200)]);
    const foto = await doc.embedJpg(fotoB), logoBl = await doc.embedPng(logoB), logoCo = await doc.embedPng(logoC);
    const txt = (pg, t, x, y, { f = F.r, s = 10, c: col = COL.texto, der = false } = {}) => { const tt = String(t == null ? "" : t); pg.drawText(tt, { x: der ? x - f.widthOfTextAtSize(tt, s) : x, y, size: s, font: f, color: hex(col) }); };
    const fecha = (() => { const [y, m, d] = String(c.fecha).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); })();
    const fechaLarga = fecha.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
    const titulo = (c.titulo || "").trim() || "Propuesta técnica y económica";

    const p1 = doc.addPage([W, H]);
    const s = Math.max(W / foto.width, H / foto.height);
    p1.drawImage(foto, { x: (W - foto.width * s) / 2, y: (H - foto.height * s) / 2, width: foto.width * s, height: foto.height * s });
    p1.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex(COL.noche), opacity: 0.18 });
    const tiras = 48, alto = H * 0.62;
    for (let i = 0; i < tiras; i++) p1.drawRectangle({ x: 0, y: i * alto / tiras, width: W, height: alto / tiras + 0.6, color: hex(COL.noche), opacity: 0.94 * Math.pow(1 - i / tiras, 1.15) });
    for (let i = 0; i < 20; i++) p1.drawRectangle({ x: 0, y: H - (i + 1) * 7, width: W, height: 7.4, color: hex(COL.noche), opacity: 0.55 * (1 - i / 20) });
    const lw = 150; p1.drawImage(logoBl, { x: M, y: H - M - lw * logoBl.height / logoBl.width, width: lw, height: lw * logoBl.height / logoBl.width });
    const lt = partir(titulo, F.x, 38, W - 2 * M).slice(0, 4);
    let y = 214 + lt.length * 42;
    txt(p1, `PROPUESTA TÉCNICA Y ECONÓMICA · ${c.numero}`, M, y + 14, { f: F.b, s: 9, c: COL.laton });
    lt.forEach((l, i) => txt(p1, l, M, y - 30 - i * 42, { f: F.x, s: 38, c: "#FFFFFF" }));
    p1.drawLine({ start: { x: M, y: 196 }, end: { x: W - M, y: 196 }, thickness: 1.2, color: hex(COL.laton) });
    txt(p1, "PARA", M, 172, { f: F.b, s: 8, c: COL.claro });
    partir(cli ? (cli.razon_social || cli.nombre) : "", F.b, 13, (W - 2 * M) / 2 - 12).slice(0, 2).forEach((l, i) => txt(p1, l, M, 154 - i * 16, { f: F.b, s: 13, c: "#FFFFFF" }));
    if (sitio) txt(p1, sitio.nombre, M, 122, { s: 10, c: COL.claro });
    txt(p1, "FECHA", W / 2 + 6, 172, { f: F.b, s: 8, c: COL.claro });
    txt(p1, fechaLarga, W / 2 + 6, 154, { f: F.b, s: 13, c: "#FFFFFF" });
    txt(p1, `Válida por ${c.vigencia_dias} días`, W / 2 + 6, 138, { s: 10, c: COL.claro });

    const paginas = [];
    let pg = null;
    const cab = () => {
      pg = doc.addPage([W, H]); paginas.push(pg);
      const lh = 110 * logoCo.height / logoCo.width;
      pg.drawImage(logoCo, { x: M, y: H - 46 - lh, width: 110, height: lh });
      txt(pg, `PROPUESTA ${c.numero}`, W - M, H - 46 - lh + 4, { f: F.b, s: 8, c: COL.latonT, der: true });
      pg.drawLine({ start: { x: M, y: H - 70 }, end: { x: W - M, y: H - 70 }, thickness: 1.6, color: hex(COL.laton) });
      y = H - 104;
    };
    const lugar = h => { if (y - h < PIE + 30) cab(); };
    const parrafo = (t, { f = F.r, s = 10.5, col = COL.texto, ancho = W - 2 * M, x = M, lh = s * 1.55, antes = 0 } = {}) => {
      y -= antes;
      partir(t, f, s, ancho).forEach(l => { lugar(lh); txt(pg, l, x, y, { f, s, c: col }); y -= lh; });
    };
    const titulo2 = t => { lugar(70); y -= 6; txt(pg, t, M, y, { f: F.x, s: 20, c: COL.texto }); y -= 26; };

    cab();
    const ciudad = (emp.ciudad || "Guatemala").trim();
    txt(pg, `${ciudad}, ${fechaLarga}`, M, y); y -= 34;
    txt(pg, "Señores", M, y); y -= 16;
    parrafo(cli ? (cli.razon_social || cli.nombre) : "", { f: F.b, s: 11 });
    if (sitio) parrafo(sitio.nombre, { col: COL.gris, s: 10 });
    txt(pg, "Presente.", M, y); y -= 22;
    if (contacto) { parrafo(`Atención: ${contacto.nombre}${contacto.puesto ? ", " + contacto.puesto : ""}`, { f: F.s, s: 10.5 }); y -= 8; }
    parrafo("Reciba un cordial saludo.", { antes: 6 }); y -= 8;
    const carta = String(emp.carta || "").replace(/\{cliente\}/g, cli ? cli.nombre : "").replace(/\{contacto\}/g, contacto ? contacto.nombre : "").replace(/\{trabajo\}/g, (c.titulo || "el trabajo solicitado").trim().replace(/^./, m => m.toLowerCase())).replace(/\{sitio\}/g, sitio ? sitio.nombre : "").replace(/\{en_sitio\}/g, sitio ? `, en ${sitio.nombre}` : "");
    carta.split(/\n\s*\n/).forEach(p => { parrafo(p.replace(/\n/g, " ")); y -= 10; });
    y -= 8; parrafo("Atentamente,"); y -= 46;
    lugar(60);
    pg.drawLine({ start: { x: M, y: y + 14 }, end: { x: M + 200, y: y + 14 }, thickness: 0.6, color: hex(COL.linea) });
    if (emp.firma_nombre) parrafo(emp.firma_nombre, { f: F.b });
    if (emp.firma_puesto) parrafo(emp.firma_puesto, { col: COL.gris, s: 10 });
    parrafo(emp.razon_social || emp.nombre || "EMTECSA", { col: COL.gris, s: 10 });

    cab();
    const lista = t => String(t || "").split(/\n/).map(x => x.replace(/^[-•·*\s]+/, "").trim()).filter(Boolean);
    const inc = lista(c.alcance_incluye), exc = lista(c.alcance_excluye);
    if (inc.length || exc.length) {
      titulo2("Alcance del trabajo");
      const vinetas = (t, items) => {
        lugar(40); txt(pg, t.toUpperCase(), M, y, { f: F.b, s: 8.5, c: COL.latonT }); y -= 18;
        items.forEach(it => { const ls = partir(it, F.r, 10.5, W - 2 * M - 16); lugar(ls.length * 16); pg.drawCircle({ x: M + 3, y: y + 3.5, size: 2.2, color: hex(COL.laton) }); ls.forEach(l => { txt(pg, l, M + 14, y, { s: 10.5 }); y -= 16; }); y -= 2; });
        y -= 10;
      };
      if (inc.length) vinetas("Incluye", inc);
      if (exc.length) vinetas("No incluye", exc);
      y -= 8;
    }

    const ivaTxt = c.iva ? " con IVA" : "";
    if (es) {
      titulo2(es.opciones.length ? "Compare las opciones" : "Precio y extras");
      if (es.opciones.length) parrafo(`Escoja una opción${es.extras.length ? " y, si quiere, sume los extras" : ""}. Cada una ya trae lo que va en todas.`, { col: COL.gris, s: 10 });
      y -= 6;
      const cols = es.opciones.length ? es.opciones : [{ id: "", nombre: "Propuesta", k: es.base }];
      const x0 = M + 150, cw = (W - M - x0) / cols.length;
      const enc = cols.map(o => partir(o.nombre, F.b, 9.5, cw - 12).slice(0, 3));
      const hEnc = 22 + Math.max(...enc.map(l => l.length)) * 12;
      const comun = r => r.k.partidas.filter(pp => pp.incluida && !pp.grupo).reduce((a, pp) => a + pp.total, 0) + (r.k.cargos || 0);
      const propio = r => r.k.partidas.filter(pp => pp.incluida && pp.grupo).reduce((a, pp) => a + pp.total, 0);
      const filasC = [["Lo que va en todas", r => Q(comun(r))], ...(es.opciones.length ? [["Lo propio de la opción", r => Q(propio(r))]] : []), ...(c.imprevistos_pct != null ? [[`Imprevistos (${cant(c.imprevistos_pct)} %)`, r => Q(r.k.imprevistos)]] : []), ...(c.descuento_tipo ? [["Descuento", r => "− " + Q(r.k.descuento)]] : []), ...(c.iva ? [["IVA 12 %", r => Q(r.k.iva)]] : [])];
      lugar(hEnc + filasC.length * 22 + 70);
      cols.forEach((o, i) => {
        const x = x0 + i * cw;
        pg.drawRectangle({ x: x + 4, y: y - hEnc - filasC.length * 22 - 44, width: cw - 8, height: hEnc + filasC.length * 22 + 50, color: hex(i % 2 ? "#FFFFFF" : COL.fondo) });
        if (o.id) txt(pg, `OPCIÓN ${o.id}`, x + 12, y - 8, { f: F.b, s: 8, c: COL.latonT });
        enc[i].forEach((l, j) => txt(pg, l, x + 12, y - 24 - j * 12, { f: F.b, s: 9.5 }));
      });
      y -= hEnc + 8;
      filasC.forEach(([t, fn]) => { txt(pg, t, M, y, { s: 9.5, c: COL.gris }); cols.forEach((o, i) => txt(pg, fn(o), x0 + (i + 1) * cw - 12, y, { f: F.s, s: 9.5, der: true })); y -= 8; pg.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: hex(COL.linea) }); y -= 14; });
      txt(pg, `TOTAL${ivaTxt.toUpperCase()}`, M, y - 6, { f: F.b, s: 8.5, c: COL.latonT });
      cols.forEach((o, i) => { const x = x0 + i * cw; pg.drawRectangle({ x: x + 4, y: y - 18, width: cw - 8, height: 30, color: hex(COL.noche) }); txt(pg, Q(o.k.total), x + cw - 12, y - 8, { f: F.x, s: cw < 120 ? 10.5 : 12.5, c: "#FFFFFF", der: true }); });
      y -= 46;
      if (es.extras.length) {
        lugar(40 + es.extras.length * 20);
        txt(pg, "EXTRAS · SE SUMAN AL TOTAL SI LOS QUIERE", M, y, { f: F.b, s: 8.5, c: COL.latonT }); y -= 18;
        es.extras.forEach(x => { txt(pg, x.nombre, M, y, { f: F.s, s: 10 }); txt(pg, `+ ${Q(x.monto)}${ivaTxt}`, W - M, y, { f: F.b, s: 10, der: true }); y -= 8; pg.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: hex(COL.linea) }); y -= 14; });
        y -= 6;
      }
      y -= 10;
    }
    titulo2(es ? "Detalle de cada opción" : "Detalle de la propuesta");
    const cx = { d: M, c: 352, u: 446, t: W - M };
    const encabezado = () => {
      lugar(30);
      [["DESCRIPCIÓN", cx.d, false], ["CANT.", cx.c, true], ["PRECIO UNIT.", cx.u, true], ["TOTAL", cx.t, true]].forEach(([t, x, d]) => txt(pg, t, x, y, { f: F.b, s: 7.5, c: COL.gris, der: d }));
      y -= 8; pg.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: hex(COL.linea) }); y -= 16;
    };
    encabezado();
    const filaT = (desc, cantTxt, unit, total, sub = "") => {
      const ls = partir(desc, F.s, 10, cx.c - cx.d - 50);
      const alto = ls.length * 14 + (sub ? 13 : 0) + 10;
      if (y - alto < PIE + 30) { cab(); encabezado(); }
      ls.forEach((l, i) => txt(pg, l, cx.d, y - i * 14, { f: F.s, s: 10 }));
      if (sub) txt(pg, sub, cx.d, y - ls.length * 14, { s: 8.5, c: COL.gris });
      txt(pg, cantTxt, cx.c, y, { s: 10, der: true });
      txt(pg, unit, cx.u, y, { s: 10, der: true });
      txt(pg, total, cx.t, y, { f: F.b, s: 10, der: true });
      y -= alto - 4;
      pg.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.5, color: hex(COL.fondo) });
      y -= 8;
    };
    const subF = p => p.estructura ? `${p.estructura.codigo} · ${cant(p.estructura.voltaje_kv)} kV` : p.material ? p.material.codigo : "";
    const kd = es ? es.base : k;
    if (!es) {
      k.partidas.filter(p => p.incluida !== false).forEach(p => filaT(p.descripcion, cant(p.cantidad), Q(p.precio_unitario), Q(p.total), subF(p)));
      (c.cargos || []).forEach(g => filaT(g.descripcion, "1", Q(g.monto), Q(g.monto), "Transporte y equipo"));
    } else {
      const gs = [null, ...(op.lista || []).map(x => "o:" + x.id), ...(op.extras || []).map(x => "x:" + x.id)];
      gs.forEach(g => {
        const l = kd.partidas.filter(p => (p.grupo || null) === g);
        if (!l.length && !(g === null && (c.cargos || []).length)) return;
        lugar(60); y -= 4;
        txt(pg, D.nombreGrupo(c, g).toUpperCase(), M, y, { f: F.b, s: 8.5, c: g ? COL.latonT : COL.gris }); y -= 16;
        l.forEach(p => filaT(p.descripcion, cant(p.cantidad), Q(p.precio_unitario), Q(p.total), subF(p)));
        if (g === null) (c.cargos || []).forEach(gg => filaT(gg.descripcion, "1", Q(gg.monto), Q(gg.monto), "Transporte y equipo"));
        const st = l.reduce((a, p) => a + p.total, 0) + (g === null ? (k.cargos || 0) : 0);
        txt(pg, "Subtotal", 330, y, { s: 9.5, c: COL.gris }); txt(pg, Q(st), W - M, y, { f: F.s, s: 9.5, der: true }); y -= 24;
      });
    }
    y -= 6;
    if (!es) {
    const filas = [["Subtotal", Q(k.subtotal)]];
    if (k.cargos) filas.push(["Transporte y equipo", Q(k.cargos)]);
    if (c.imprevistos_pct != null) filas.push([`Imprevistos y administración (${cant(c.imprevistos_pct)} %)`, Q(k.imprevistos)]);
    if (c.descuento_tipo) filas.push([`Descuento${c.descuento_tipo === "pct" ? ` (${cant(c.descuento || 0)} %)` : ""}`, "− " + Q(k.descuento)]);
    if (c.iva) { filas.push(["Total sin IVA", Q(k.neto)]); filas.push(["IVA 12 %", Q(k.iva)]); }
    lugar(filas.length * 20 + 64);
    filas.forEach(([t, v]) => { txt(pg, t, 330, y, { s: 10, c: COL.gris }); txt(pg, v, W - M, y, { f: F.s, s: 10, der: true }); y -= 20; });
    y -= 8;
    pg.drawRectangle({ x: 318, y: y - 18, width: W - M - 318, height: 40, color: hex(COL.noche) });
    txt(pg, c.iva ? "TOTAL CON IVA" : "TOTAL", 332, y - 2, { f: F.b, s: 8.5, c: COL.laton });
    txt(pg, Q(k.total), W - M - 14, y - 4, { f: F.x, s: 15, c: "#FFFFFF", der: true });
    y -= 52;
    }
    if (c.eleccion && ((op.lista || []).length || (op.extras || []).length)) {
      const o = (op.lista || []).find(x => x.id === c.eleccion.opcion), xs = (op.extras || []).filter(x => (c.eleccion.extras || []).includes(x.id));
      parrafo(`Escogida: ${o ? `opción ${o.id}, ${o.nombre}` : "la propuesta base"}${xs.length ? `, con ${xs.map(x => x.nombre).join(" y ")}` : ""}.`, { f: F.s, s: 10, col: COL.gris }); y -= 8;
    }

    const cond = c.condiciones || {};
    const vence = new Date(fecha); vence.setDate(vence.getDate() + Number(c.vigencia_dias || 0));
    const items = [["Vigencia", `${c.vigencia_dias} días, hasta el ${vence.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })}.`], ["Forma de pago", cond.forma_pago], ["Tiempo de entrega", cond.tiempo_entrega], ["Garantía", cond.garantia], ["Notas", c.notas]].filter(([, v]) => String(v || "").trim());
    titulo2("Condiciones");
    items.forEach(([t, v]) => { lugar(40); txt(pg, t.toUpperCase(), M, y, { f: F.b, s: 8.5, c: COL.latonT }); y -= 16; parrafo(v); y -= 10; });

    titulo2("Aceptación");
    if (es) parrafo(`Aceptamos la propuesta ${c.numero}${es.opciones.length ? ", opción ______" : ""}${es.extras.length ? ", con los extras ______________________" : ""}, por un total de Q ______________${c.iva ? ", IVA incluido" : ""}, con el alcance y las condiciones descritas.`);
    else parrafo(`Aceptamos la propuesta ${c.numero} por un total de ${Q(k.total)}${c.iva ? ", IVA incluido" : ""}, con el alcance y las condiciones descritas.`);
    y -= 16; lugar(122);
    const caja = (x, yy, w, t) => { pg.drawRectangle({ x, y: yy - 52, width: w, height: 52, borderColor: hex(COL.linea), borderWidth: 0.8 }); txt(pg, t.toUpperCase(), x + 10, yy - 14, { f: F.b, s: 7.5, c: COL.gris }); };
    const mw = (W - 2 * M - 14) / 2;
    caja(M, y, mw, "Nombre"); caja(M + mw + 14, y, mw, "Puesto"); y -= 66;
    caja(M, y, mw, "Firma y sello"); caja(M + mw + 14, y, mw, "Fecha"); y -= 66;

    const pie = [emp.razon_social || emp.nombre, emp.nit ? "NIT " + emp.nit : "", emp.telefono, emp.correo, emp.web].filter(x => String(x || "").trim()).join("  ·  ");
    paginas.forEach((p, i) => {
      p.drawLine({ start: { x: M, y: PIE + 10 }, end: { x: W - M, y: PIE + 10 }, thickness: 0.5, color: hex(COL.linea) });
      txt(p, pie, M, PIE - 4, { s: 7.5, c: COL.gris });
      txt(p, `Página ${i + 2} de ${paginas.length + 1}`, W - M, PIE - 4, { s: 7.5, c: COL.gris, der: true });
    });
    return doc.save();
  }

  function nombreArchivo(c, cli) { return `Propuesta ${c.numero}${cli ? " - " + cli.nombre.replace(/[\\/:*?"<>|]/g, "") : ""}.pdf`; }
  function descargar(b, nombre) {
    const url = URL.createObjectURL(new Blob([b], { type: "application/pdf" }));
    const a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function mostrar(b, nombre, titulo) {
    if (window.EMT_PREVIA) { window.EMT_PREVIA.abrir({ titulo: titulo || String(nombre || "Documento").replace(/\.pdf$/i, ""), pdf: b, nombre: nombre || "documento.pdf" }); return; }
    descargar(b, nombre || "documento.pdf");
  }
  function ver(b, nombre) {
    if (window.EMT_PREVIA) { mostrar(b, nombre || "documento.pdf"); return; }
    const url = URL.createObjectURL(new Blob([b], { type: "application/pdf" }));
    const w = window.open(url, "_blank");
    if (w) w.opener = null; else descargar(b, "propuesta.pdf");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  return { FOTOS, generar, descargar, ver, mostrar, nombreArchivo, base: { preparar, svgAPng, partir, COL, W, H, M, PIE, Q, cant } };
})();
