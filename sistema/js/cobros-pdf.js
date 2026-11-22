"use strict";
(() => {
  const P = window.EMT_PDF;
  const { preparar, svgAPng, partir, COL, W, H, M, PIE, Q } = P.base;
  const nb = n => { const D = window.EMT_DATOS; return D && D.nitBonito ? D.nitBonito(n) : n; };
  const fLarga = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" }); };
  const fCorta = f => { if (!f) return "Sin fecha"; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" }); };

  async function nuevo(titulo, emp) {
    const [fR, fS, fB, fX] = await preparar();
    const { PDFDocument, rgb } = window.PDFLib;
    const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    doc.setTitle(titulo); doc.setAuthor(emp.nombre || "EMTECSA"); doc.setCreator("Sistema EMTECSA");
    const F = { r: await doc.embedFont(fR, { subset: true }), s: await doc.embedFont(fS, { subset: true }), b: await doc.embedFont(fB, { subset: true }), x: await doc.embedFont(fX, { subset: true }) };
    const logo = await doc.embedPng(await svgAPng("../logo/emtecsa-logo-blanco.svg", 1000));
    const txt = (pg, t, x, y, { f = F.r, s = 10, c = COL.texto, der = false, centro = false } = {}) => { const tt = String(t == null ? "" : t); const w = f.widthOfTextAtSize(tt, s); pg.drawText(tt, { x: der ? x - w : centro ? x - w / 2 : x, y, size: s, font: f, color: hex(c) }); };
    const cabeza = (pg, eti, grande, chico) => {
      pg.drawRectangle({ x: 0, y: H - 118, width: W, height: 118, color: hex(COL.noche) });
      const lw = 128; pg.drawImage(logo, { x: M, y: H - 59 - lw * logo.height / logo.width / 2, width: lw, height: lw * logo.height / logo.width });
      txt(pg, eti, W - M, H - 48, { f: F.b, s: 8.5, c: COL.laton, der: true });
      txt(pg, grande, W - M, H - 76, { f: F.x, s: 22, c: "#FFFFFF", der: true });
      if (chico) txt(pg, chico, W - M, H - 94, { s: 9, c: COL.claro, der: true });
      pg.drawRectangle({ x: 0, y: H - 121, width: W, height: 3, color: hex(COL.laton) });
    };
    const pie = pg => {
      const t = [emp.razon_social || emp.nombre, emp.nit ? "NIT " + nb(emp.nit) : "", emp.telefono, emp.correo, emp.web].filter(x => String(x || "").trim()).join("  ·  ");
      pg.drawLine({ start: { x: M, y: PIE + 10 }, end: { x: W - M, y: PIE + 10 }, thickness: 0.5, color: hex(COL.linea) });
      txt(pg, t, M, PIE - 4, { s: 7.5, c: COL.gris });
      if (String(emp.direccion || "").trim()) txt(pg, [emp.direccion, emp.ciudad].filter(x => String(x || "").trim()).join(", "), M, PIE - 14, { s: 7.5, c: COL.gris });
    };
    return { doc, F, hex, txt, cabeza, pie };
  }

  async function recibo({ pago, cli, obra, parte, saldoObra, emp }) {
    const { doc, F, hex, txt, cabeza, pie } = await nuevo(`Recibo ${pago.numero}`, emp);
    const pg = doc.addPage([W, H]);
    cabeza(pg, "RECIBO DE PAGO", pago.numero, (emp.ciudad ? emp.ciudad + ", " : "") + fLarga(pago.fecha));
    let y = H - 170;
    const campo = (eti, val, x, yy, w) => { txt(pg, eti.toUpperCase(), x, yy, { f: F.b, s: 7.5, c: COL.gris }); partir(val || "—", F.s, 11.5, w).slice(0, 3).forEach((l, i) => txt(pg, l, x, yy - 16 - i * 15, { f: F.s, s: 11.5 })); };
    campo("Recibimos de", (cli && (cli.razon_social || cli.nombre)) || "", M, y, 330);
    campo("NIT", cli ? nb(cli.nit || "CF") : "", 420, y, W - M - 420);
    y -= 66;
    pg.drawRectangle({ x: M, y: y - 70, width: W - 2 * M, height: 82, color: hex(COL.fondo) });
    pg.drawRectangle({ x: M, y: y - 70, width: 4, height: 82, color: hex(COL.laton) });
    txt(pg, "LA CANTIDAD DE", M + 22, y - 8, { f: F.b, s: 7.5, c: COL.gris });
    txt(pg, Q(pago.monto), W - M - 22, y - 30, { f: F.x, s: 26, c: COL.marino, der: true });
    partir(window.EMT_DATOS.enLetras(pago.monto), F.s, 11, 300).slice(0, 3).forEach((l, i) => txt(pg, l, M + 22, y - 28 - i * 14, { f: F.s, s: 11 }));
    y -= 110;
    const concepto = [parte ? parte.descripcion : "Pago a cuenta", obra ? `${obra.numero}${obra.titulo ? " · " + obra.titulo : ""}` : ""].filter(Boolean).join(" · ");
    campo("Por concepto de", concepto, M, y, W - 2 * M);
    y -= 30 + Math.min(3, partir(concepto, F.s, 11.5, W - 2 * M).length) * 15;
    const D = window.EMT_DATOS;
    campo("Forma de pago", D.FORMAS[pago.forma] + (pago.banco ? " · " + pago.banco : ""), M, y, 230);
    campo("Número de boleta, transferencia o cheque", pago.referencia || "", 310, y, W - M - 310);
    y -= 52;
    if (Number(pago.ret_iva) > 0) {
      campo("Retención de IVA", `${Q(pago.ret_iva)}${pago.const_iva ? " · constancia " + pago.const_iva : ""}`, M, y, 250);
      campo("Total abonado a la cuenta", Q(Number(pago.monto) + Number(pago.ret_iva)), 310, y, W - M - 310);
      y -= 52;
    }
    if (saldoObra != null) { campo("Saldo pendiente de la obra", Q(saldoObra), M, y, 230); }
    if (pago.notas) campo("Notas", pago.notas, 310, y, W - M - 310);
    y -= 70;
    const fx = W - M - 220;
    pg.drawLine({ start: { x: fx, y }, end: { x: W - M, y }, thickness: 0.8, color: hex(COL.texto) });
    txt(pg, emp.firma_nombre || "", fx + 110, y - 16, { f: F.b, s: 10, centro: true });
    txt(pg, ["Recibido por", emp.firma_puesto].filter(Boolean).join(" · "), fx + 110, y - 30, { s: 8.5, c: COL.gris, centro: true });
    if (pago.anulado) {
      txt(pg, "ANULADO", W / 2, H / 2 - 40, { f: F.x, s: 80, c: "#B3261E", centro: true });
      txt(pg, pago.motivo_anulado || "", W / 2, H / 2 - 66, { f: F.s, s: 11, c: "#B3261E", centro: true });
    }
    pie(pg);
    return doc.save();
  }

  async function estadoCuenta({ cli, ec, emp }) {
    const { doc, F, hex, txt, cabeza, pie } = await nuevo(`Estado de cuenta · ${cli ? cli.nombre : ""}`, emp);
    const hoy = (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
    const paginas = [];
    const COLS = [[M, "FECHA"], [M + 78, "CONCEPTO"], [W - M - 170, "COBRO"], [W - M - 85, "PAGO"], [W - M, "SALDO"]];
    const cabTabla = (pg, y) => { pg.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: hex(COL.marino) }); COLS.forEach(([x, t], i) => txt(pg, t, x + (i < 2 ? 8 : -8), y, { f: F.b, s: 7.5, c: "#FFFFFF", der: i >= 2 })); return y - 26; };
    let pg = doc.addPage([W, H]); paginas.push(pg);
    cabeza(pg, "ESTADO DE CUENTA", (cli && cli.nombre) || "", "Al " + fLarga(hoy));
    let y = H - 162;
    txt(pg, "CLIENTE", M, y, { f: F.b, s: 7.5, c: COL.gris });
    txt(pg, (cli && (cli.razon_social || cli.nombre)) || "", M, y - 16, { f: F.s, s: 11.5 });
    txt(pg, "NIT " + nb((cli && cli.nit) || "CF"), M, y - 31, { s: 9.5, c: COL.gris });
    y -= 62;
    const bw = (W - 2 * M - 30) / 4;
    [["Cobros", ec.cargos], ["Pagado", ec.abonos], ["Saldo", ec.saldo], ["Vencido", ec.vencido]].forEach(([t, n], i) => {
      const x = M + i * (bw + 10);
      pg.drawRectangle({ x, y: y - 46, width: bw, height: 54, color: hex(i === 2 ? COL.noche : COL.fondo) });
      txt(pg, t.toUpperCase(), x + 12, y - 8, { f: F.b, s: 7.5, c: i === 2 ? COL.laton : COL.gris });
      txt(pg, Q(n), x + 12, y - 32, { f: F.x, s: 13, c: i === 2 ? "#FFFFFF" : i === 3 && n ? "#8A5A00" : COL.marino });
    });
    y -= 82;
    y = cabTabla(pg, y);
    ec.mov.forEach((m, i) => {
      const l = partir(m.texto + (m.venc === "vencido" ? " · vencido" : ""), F.r, 9, W - M - 170 - (M + 78) - 70).slice(0, 3);
      const alto = 10 + l.length * 12;
      if (y - alto < PIE + 30) { pg = doc.addPage([W, H]); paginas.push(pg); y = cabTabla(pg, H - M - 10); }
      if (i % 2 === 1) pg.drawRectangle({ x: M, y: y - alto + 12, width: W - 2 * M, height: alto, color: hex("#F5F7F9") });
      txt(pg, fCorta(m.fecha), M + 8, y, { s: 9, c: COL.gris });
      l.forEach((t, j) => txt(pg, t, M + 86, y - j * 12, { s: 9, f: m.tipo === "abono" ? F.r : F.s }));
      if (m.cargo) txt(pg, Q(m.cargo), W - M - 178, y, { s: 9, der: true });
      if (m.abono) txt(pg, Q(m.abono), W - M - 93, y, { s: 9, der: true, c: "#1F6B4C" });
      txt(pg, Q(m.saldo), W - M - 8, y, { s: 9, f: F.b, der: true });
      y -= alto;
    });
    if (!ec.mov.length) { txt(pg, "Sin movimientos.", M + 8, y, { s: 10, c: COL.gris }); y -= 20; }
    pg.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.8, color: hex(COL.linea) });
    txt(pg, "SALDO A LA FECHA", W - M - 178, y - 14, { f: F.b, s: 8, c: COL.gris, der: true });
    txt(pg, Q(ec.saldo), W - M - 8, y - 15, { f: F.x, s: 12, c: COL.marino, der: true });
    paginas.forEach((p, i) => { pie(p); txt(p, `Página ${i + 1} de ${paginas.length}`, W - M, PIE - 4, { s: 7.5, c: COL.gris, der: true }); });
    return doc.save();
  }

  async function pedido({ prov, obra, cli, sitio, lineas, emp, conPrecio }) {
    const { doc, F, hex, txt, cabeza, pie } = await nuevo(`Pedido ${obra.numero} · ${prov.nombre}`, emp);
    const hoy = (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
    const paginas = [];
    const cant = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
    const COLS = conPrecio ? [[M, "CÓDIGO"], [M + 70, "MATERIAL"], [W - M - 190, "CANTIDAD"], [W - M - 95, "PRECIO C/U"], [W - M, "TOTAL"]] : [[M, "CÓDIGO"], [M + 70, "MATERIAL"], [W - M - 60, "UNIDAD"], [W - M, "CANTIDAD"]];
    const cabTabla = (pg, y) => { pg.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: hex(COL.marino) }); COLS.forEach(([x, t], i) => txt(pg, t, x + (i < 2 ? 8 : -8), y, { f: F.b, s: 7.5, c: "#FFFFFF", der: i >= 2 })); return y - 26; };
    let pg = doc.addPage([W, H]); paginas.push(pg);
    cabeza(pg, "PEDIDO DE MATERIALES", obra.numero, (emp.ciudad ? emp.ciudad + ", " : "") + fLarga(hoy));
    let y = H - 162;
    const dato = (eti, val, x, yy, w) => { txt(pg, eti.toUpperCase(), x, yy, { f: F.b, s: 7.5, c: COL.gris }); partir(val || "—", F.s, 11, w).slice(0, 2).forEach((l, i) => txt(pg, l, x, yy - 15 - i * 14, { f: F.s, s: 11 })); };
    dato("Para", prov.nombre + (prov.contacto ? " · " + prov.contacto : ""), M, y, 300);
    dato("Teléfono", prov.telefono || "", 400, y, W - M - 400);
    y -= 52;
    dato("Obra", [obra.titulo, cli ? cli.nombre : ""].filter(Boolean).join(" · "), M, y, 300);
    dato("Entregar en", sitio ? [sitio.nombre, sitio.direccion, sitio.municipio].filter(Boolean).join(", ") : "Bodega de EMTECSA", 400, y, W - M - 400);
    y -= 60;
    y = cabTabla(pg, y);
    let total = 0;
    lineas.forEach((x, i) => {
      const l = partir(x.material.descripcion, F.r, 9, (conPrecio ? W - M - 190 : W - M - 60) - (M + 78) - 50).slice(0, 3);
      const alto = 10 + l.length * 12;
      if (y - alto < PIE + 70) { pg = doc.addPage([W, H]); paginas.push(pg); y = cabTabla(pg, H - M - 10); }
      if (i % 2 === 1) pg.drawRectangle({ x: M, y: y - alto + 12, width: W - 2 * M, height: alto, color: hex("#F5F7F9") });
      txt(pg, x.material.codigo, M + 8, y, { s: 8.5, c: COL.gris });
      l.forEach((t, j) => txt(pg, t, M + 78, y - j * 12, { s: 9, f: F.s }));
      if (conPrecio) {
        const pu = x.precio_ref;
        txt(pg, cant(x.cantidad) + (x.material.unidad ? " " + x.material.unidad : ""), W - M - 198, y, { s: 9, der: true });
        txt(pg, pu == null ? "—" : Q(pu), W - M - 103, y, { s: 9, der: true });
        txt(pg, pu == null ? "—" : Q(pu * x.cantidad), W - M - 8, y, { s: 9, f: F.b, der: true });
        if (pu != null) total += pu * x.cantidad;
      } else {
        txt(pg, x.material.unidad || "", W - M - 68, y, { s: 9, der: true });
        txt(pg, cant(x.cantidad), W - M - 8, y, { s: 9, f: F.b, der: true });
      }
      y -= alto;
    });
    pg.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.8, color: hex(COL.linea) });
    txt(pg, `${lineas.length} ${lineas.length === 1 ? "material" : "materiales"}`, M + 8, y - 14, { s: 9, c: COL.gris });
    if (conPrecio && total) { txt(pg, "TOTAL ESTIMADO", W - M - 103, y - 14, { f: F.b, s: 8, c: COL.gris, der: true }); txt(pg, Q(Math.round(total * 100) / 100), W - M - 8, y - 15, { f: F.x, s: 12, c: COL.marino, der: true }); }
    y -= 64;
    if (y < PIE + 60) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 60; }
    pg.drawLine({ start: { x: M, y }, end: { x: M + 220, y }, thickness: 0.8, color: hex(COL.texto) });
    txt(pg, emp.firma_nombre || "", M + 110, y - 16, { f: F.b, s: 10, centro: true });
    txt(pg, ["Pide", emp.firma_puesto].filter(Boolean).join(" · "), M + 110, y - 30, { s: 8.5, c: COL.gris, centro: true });
    paginas.forEach((p, i) => { pie(p); txt(p, `Página ${i + 1} de ${paginas.length}`, W - M, PIE - 4, { s: 7.5, c: COL.gris, der: true }); });
    return doc.save();
  }

  async function reporteFinanzas({ titulo, ambito, etRes, ti, tg, res, ing, gas, emp }) {
    const { doc, F, hex, txt, cabeza, pie } = await nuevo(`Finanzas · ${titulo}`, emp);
    const hoy = (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
    const paginas = [];
    let pg = doc.addPage([W, H]); paginas.push(pg);
    cabeza(pg, ambito === "empresa" ? "FINANZAS DE LA EMPRESA" : "FINANZAS PERSONALES", titulo.charAt(0).toUpperCase() + titulo.slice(1), "Hecho el " + fLarga(hoy));
    let y = H - 160;
    const bw = (W - 2 * M - 20) / 3;
    [["Ingresos", ti], ["Gastos", tg], [etRes, res]].forEach(([t, n], i) => {
      const x = M + i * (bw + 10);
      pg.drawRectangle({ x, y: y - 46, width: bw, height: 54, color: hex(i === 2 ? COL.noche : COL.fondo) });
      txt(pg, t.toUpperCase(), x + 12, y - 8, { f: F.b, s: 7.5, c: i === 2 ? COL.laton : COL.gris });
      txt(pg, Q(n), x + 12, y - 32, { f: F.x, s: 13, c: i === 2 ? "#FFFFFF" : i === 0 ? "#1F6B4C" : COL.marino });
    });
    y -= 84;
    const bloque = (t, l, tot) => {
      if (y < PIE + 90) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 10; }
      pg.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: hex(COL.marino) });
      txt(pg, t.toUpperCase(), M + 8, y, { f: F.b, s: 7.5, c: "#FFFFFF" }); txt(pg, "MONTO", W - M - 60, y, { f: F.b, s: 7.5, c: "#FFFFFF", der: true }); txt(pg, "%", W - M - 8, y, { f: F.b, s: 7.5, c: "#FFFFFF", der: true });
      y -= 26;
      if (!l.length) { txt(pg, "Nada.", M + 8, y, { s: 9.5, c: COL.gris }); y -= 22; return; }
      l.forEach((x, i) => {
        if (y < PIE + 40) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 10; }
        if (i % 2 === 1) pg.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: hex("#F5F7F9") });
        txt(pg, partir(x.n, F.r, 9.5, W - 2 * M - 160)[0], M + 8, y, { s: 9.5 });
        txt(pg, Q(x.v), W - M - 60, y, { s: 9.5, der: true });
        txt(pg, (tot ? Math.round(x.v / tot * 100) : 0) + " %", W - M - 8, y, { s: 9.5, c: COL.gris, der: true });
        y -= 20;
      });
      y -= 16;
    };
    bloque("Gastos por categoría", gas, tg);
    bloque("Ingresos por categoría", ing, ti);
    if (arguments[0].prest) { if (y < PIE + 40) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 10; } txt(pg, `Préstamos recibidos: ${Q(arguments[0].prest)} (no se cuentan como ingreso porque se tienen que devolver).`, M, y, { s: 9, c: COL.gris }); }
    paginas.forEach((p, i) => { pie(p); txt(p, `Página ${i + 1} de ${paginas.length}`, W - M, PIE - 4, { s: 7.5, c: COL.gris, der: true }); });
    return doc.save();
  }

  async function estimacion({ est, emp }) {
    const d = est.datos || {};
    const { doc, F, hex, txt, cabeza, pie } = await nuevo(`${est.numero} · Estimación ${est.correlativo}`, emp);
    const cant = n => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
    const pct = n => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} %`;
    const paginas = [];
    let pg = doc.addPage([W, H]); paginas.push(pg);
    cabeza(pg, "ESTIMACIÓN DE AVANCE", est.numero, (emp.ciudad ? emp.ciudad + ", " : "") + fLarga(est.fecha));
    if (est.estado === "borrador") txt(pg, "BORRADOR", W / 2, H / 2 - 40, { f: F.x, s: 80, c: "#EEF1F4", centro: true });
    let y = H - 162;
    const dato = (eti, val, x, yy, w) => { txt(pg, eti.toUpperCase(), x, yy, { f: F.b, s: 7.5, c: COL.gris }); partir(val || "—", F.s, 11, w).slice(0, 2).forEach((l, i) => txt(pg, l, x, yy - 15 - i * 14, { f: F.s, s: 11 })); };
    dato("Cliente", d.cliente || "", M, y, 300);
    dato("Estimación", `No. ${est.correlativo}`, 400, y, W - M - 400);
    y -= 52;
    dato("Obra", [d.obra && d.obra.numero, d.obra && d.obra.titulo].filter(Boolean).join(" · "), M, y, 300);
    dato("Período", [d.desde && fCorta(d.desde), d.hasta && fCorta(d.hasta)].filter(Boolean).join(" al ") || fCorta(est.fecha), 400, y, W - M - 400);
    y -= 60;
    const filas = d.filas || [];
    if (filas.length) {
      const COLS = [[M, "DESCRIPCIÓN"], [W - M - 250, "CONTRATADO"], [W - M - 185, "ANTERIOR"], [W - M - 120, "ESTE PERÍODO"], [W - M - 50, "A LA FECHA"], [W - M, "%"]];
      const cabTabla = (p2, yy) => { p2.drawRectangle({ x: M, y: yy - 8, width: W - 2 * M, height: 24, color: hex(COL.marino) }); COLS.forEach(([x, t], i) => txt(p2, t, x + (i < 1 ? 8 : -6), yy, { f: F.b, s: 7, c: "#FFFFFF", der: i >= 1 })); return yy - 26; };
      y = cabTabla(pg, y);
      filas.forEach((f, i) => {
        const l = partir(f.d, F.r, 9, W - M - 250 - M - 70).slice(0, 3);
        const alto = 10 + l.length * 12;
        if (y - alto < PIE + 40) { pg = doc.addPage([W, H]); paginas.push(pg); y = cabTabla(pg, H - M - 10); }
        if (i % 2 === 1) pg.drawRectangle({ x: M, y: y - alto + 12, width: W - 2 * M, height: alto, color: hex("#F5F7F9") });
        l.forEach((t, j) => txt(pg, t, M + 8, y - j * 12, { s: 9, f: F.s }));
        txt(pg, cant(f.c), W - M - 256, y, { s: 9, der: true, c: COL.gris });
        txt(pg, cant(f.ant), W - M - 191, y, { s: 9, der: true, c: COL.gris });
        txt(pg, cant(f.per), W - M - 126, y, { s: 9, der: true, f: f.per > 0 ? F.b : F.r });
        txt(pg, cant(f.acum), W - M - 56, y, { s: 9, der: true });
        txt(pg, pct(f.c ? f.acum / f.c * 100 : 0), W - M - 6, y, { s: 8.5, der: true, c: COL.gris });
        y -= alto;
      });
      y -= 14;
    }
    const lineas = [["Total del contrato", Q(d.contrato)], [`Avance a la fecha: ${pct(d.pct_acum)}${est.correlativo > 1 ? ` (antes ${pct(d.pct_ant)})` : ""}`, Q(d.bruto_acum)]];
    if (est.correlativo > 1) lineas.push(["Menos lo estimado antes", "− " + Q(d.bruto_prev)]);
    lineas.push(["Esta estimación", Q(est.bruto), 1]);
    if (est.anticipo) lineas.push([`Menos anticipo (${Q(d.anticipo_total)} en total)`, "− " + Q(est.anticipo)]);
    if (est.garantia) lineas.push([`Menos garantía retenida ${pct(d.garantia_pct)}`, "− " + Q(est.garantia)]);
    const altoRes = lineas.length * 18 + 60;
    if (y - altoRes < PIE + 150) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 10; }
    const rx = W - M - 300;
    lineas.forEach(([t, v, neg]) => { txt(pg, t, rx, y, { s: 9.5, f: neg ? F.b : F.r, c: neg ? COL.texto : COL.gris }); txt(pg, v, W - M, y, { s: 9.5, f: neg ? F.b : F.s, der: true }); y -= 18; });
    pg.drawRectangle({ x: rx - 12, y: y - 34, width: W - M - rx + 12, height: 44, color: hex(COL.noche) });
    txt(pg, "A COBRAR", rx, y - 12, { f: F.b, s: 8, c: COL.laton });
    txt(pg, Q(est.neto), W - M - 10, y - 18, { f: F.x, s: 16, c: "#FFFFFF", der: true });
    y -= 50;
    txt(pg, d.con_iva ? "Montos con IVA, en la misma proporción del contrato." : "Montos en la misma proporción del contrato.", rx, y, { s: 8, c: COL.gris });
    if (d.notas) { y -= 22; partir("Notas: " + d.notas, F.r, 9, W - 2 * M).slice(0, 4).forEach((l, i) => txt(pg, l, M, y - i * 12, { s: 9, c: COL.gris })); y -= 48; }
    y -= 60;
    if (y < PIE + 70) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 90; }
    const ap = est.aprobado;
    const firmaX = (x, nombre, rol) => { pg.drawLine({ start: { x, y }, end: { x: x + 210, y }, thickness: 0.8, color: hex(COL.texto) }); txt(pg, nombre || "", x + 105, y - 16, { f: F.b, s: 10, centro: true }); txt(pg, rol, x + 105, y - 30, { s: 8.5, c: COL.gris, centro: true }); };
    firmaX(M, emp.firma_nombre || emp.nombre || "EMTECSA", ["Elaboró", emp.firma_puesto].filter(Boolean).join(" · "));
    if (ap && ap.firma && /^data:image\/png;base64,/.test(ap.firma)) {
      try { const img = await doc.embedPng(Uint8Array.from(atob(ap.firma.split(",")[1]), c => c.charCodeAt(0))); const hF = 46, wF = Math.min(200, hF * img.width / img.height); pg.drawImage(img, { x: W - M - 105 - wF / 2, y: y + 4, width: wF, height: hF }); } catch (e) {}
    }
    firmaX(W - M - 210, ap ? ap.nombre : "", ap ? [ap.puesto, "Aprobó · " + new Date(ap.fecha).toLocaleString("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · ") : "Aprobó por el cliente");
    if (est.estado === "anulada") { txt(pg, "ANULADA", W / 2, H / 2 - 40, { f: F.x, s: 80, c: "#B3261E", centro: true }); txt(pg, est.motivo_anulado || "", W / 2, H / 2 - 66, { f: F.s, s: 11, c: "#B3261E", centro: true }); }
    paginas.forEach((p, i) => { pie(p); txt(p, `Página ${i + 1} de ${paginas.length}`, W - M, PIE - 4, { s: 7.5, c: COL.gris, der: true }); });
    return doc.save();
  }

  async function ordenCambio({ oc, emp }) {
    const d = oc.datos || {};
    const ded = oc.tipo === "deductivo";
    const { doc, F, hex, txt, cabeza, pie } = await nuevo(`${oc.numero} · Orden de cambio ${oc.correlativo}`, emp);
    const cant = n => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
    const paginas = [];
    let pg = doc.addPage([W, H]); paginas.push(pg);
    cabeza(pg, ded ? "ORDEN DE CAMBIO · DEDUCTIVO" : "ORDEN DE CAMBIO", oc.numero, (emp.ciudad ? emp.ciudad + ", " : "") + fLarga(oc.fecha));
    if (oc.estado === "borrador") txt(pg, "BORRADOR", W / 2, H / 2 - 40, { f: F.x, s: 80, c: "#EEF1F4", centro: true });
    let y = H - 162;
    const dato = (eti, val, x, yy, w, lin = 2) => { txt(pg, eti.toUpperCase(), x, yy, { f: F.b, s: 7.5, c: COL.gris }); const l = partir(val || "—", F.s, 11, w).slice(0, lin); l.forEach((t, i) => txt(pg, t, x, yy - 15 - i * 14, { f: F.s, s: 11 })); return l.length; };
    dato("Cliente", d.cliente || "", M, y, 300);
    dato("Orden de cambio", `No. ${oc.correlativo} · ${ded ? "quita trabajo" : "agrega trabajo"}`, 400, y, W - M - 400);
    y -= 52;
    dato("Obra", [d.obra && d.obra.numero, d.obra && d.obra.titulo].filter(Boolean).join(" · "), M, y, W - 2 * M);
    y -= 52;
    const nl = dato("Qué pidió el cliente", oc.motivo, M, y, W - 2 * M, 4);
    y -= 30 + nl * 14;
    const COLS = [[M, "DESCRIPCIÓN"], [W - M - 190, "CANTIDAD"], [W - M - 95, "PRECIO C/U"], [W - M, "TOTAL"]];
    const cabTabla = (p2, yy) => { p2.drawRectangle({ x: M, y: yy - 8, width: W - 2 * M, height: 24, color: hex(COL.marino) }); COLS.forEach(([x, t], i) => txt(p2, t, x + (i < 1 ? 8 : -8), yy, { f: F.b, s: 7.5, c: "#FFFFFF", der: i >= 1 })); return yy - 26; };
    y = cabTabla(pg, y);
    (d.renglones || []).forEach((r, i) => {
      const l = partir(r.d, F.r, 9, W - M - 190 - M - 70).slice(0, 3);
      const alto = 10 + l.length * 12;
      if (y - alto < PIE + 40) { pg = doc.addPage([W, H]); paginas.push(pg); y = cabTabla(pg, H - M - 10); }
      if (i % 2 === 1) pg.drawRectangle({ x: M, y: y - alto + 12, width: W - 2 * M, height: alto, color: hex("#F5F7F9") });
      l.forEach((t, j) => txt(pg, t, M + 8, y - j * 12, { s: 9, f: F.s }));
      txt(pg, cant(r.c), W - M - 198, y, { s: 9, der: true });
      txt(pg, Q(r.u), W - M - 103, y, { s: 9, der: true, c: COL.gris });
      txt(pg, Q(Math.round(r.c * r.u * 100) / 100), W - M - 8, y, { s: 9, der: true, f: F.s });
      y -= alto;
    });
    y -= 14;
    const s = ded ? "− " : "+ ";
    const lineas = d.proporcional ? [["A precio de la cotización", Q(oc.subtotal)]] : [["Subtotal", Q(oc.subtotal)], ...(d.iva ? [["IVA 12 %", Q(d.iva)]] : [])];
    if (d.contrato_antes != null) lineas.push(["Contrato antes de este cambio", Q(d.contrato_antes)]);
    if (oc.dias_plazo) lineas.push(["Plazo adicional", `${oc.dias_plazo} ${oc.dias_plazo === 1 ? "día" : "días"}`]);
    if (y - (lineas.length * 18 + 110) < PIE + 150) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 10; }
    const rx = W - M - 300;
    lineas.forEach(([t, v]) => { txt(pg, t, rx, y, { s: 9.5, c: COL.gris }); txt(pg, v, W - M, y, { s: 9.5, f: F.s, der: true }); y -= 18; });
    pg.drawRectangle({ x: rx - 12, y: y - 34, width: W - M - rx + 12, height: 44, color: hex(COL.noche) });
    txt(pg, ded ? "SE QUITA DEL CONTRATO" : "SE AGREGA AL CONTRATO", rx, y - 12, { f: F.b, s: 8, c: COL.laton });
    txt(pg, s + Q(oc.total), W - M - 10, y - 18, { f: F.x, s: 16, c: "#FFFFFF", der: true });
    y -= 50;
    if (d.contrato_despues != null) { txt(pg, `El contrato queda en ${Q(d.contrato_despues)}.`, rx, y, { s: 9, f: F.b }); y -= 14; }
    if (d.proporcional) { txt(pg, "Incluye IVA y lo demás de la cotización, en la misma proporción.", rx, y, { s: 8, c: COL.gris }); y -= 14; }
    if (oc.notas) { y -= 10; partir("Notas: " + oc.notas, F.r, 9, W - 2 * M).slice(0, 4).forEach((l, i) => txt(pg, l, M, y - i * 12, { s: 9, c: COL.gris })); y -= 48; }
    y -= 60;
    if (y < PIE + 70) { pg = doc.addPage([W, H]); paginas.push(pg); y = H - M - 90; }
    const ap = oc.aprobado;
    const firmaX = (x, nombre, rol) => { pg.drawLine({ start: { x, y }, end: { x: x + 210, y }, thickness: 0.8, color: hex(COL.texto) }); txt(pg, nombre || "", x + 105, y - 16, { f: F.b, s: 10, centro: true }); txt(pg, rol, x + 105, y - 30, { s: 8.5, c: COL.gris, centro: true }); };
    firmaX(M, emp.firma_nombre || emp.nombre || "EMTECSA", ["Elaboró", emp.firma_puesto].filter(Boolean).join(" · "));
    if (ap && ap.firma && /^data:image\/png;base64,/.test(ap.firma)) {
      try { const img = await doc.embedPng(Uint8Array.from(atob(ap.firma.split(",")[1]), c => c.charCodeAt(0))); const hF = 46, wF = Math.min(200, hF * img.width / img.height); pg.drawImage(img, { x: W - M - 105 - wF / 2, y: y + 4, width: wF, height: hF }); } catch (e) {}
    }
    firmaX(W - M - 210, ap ? ap.nombre : "", ap ? [ap.puesto, "Aprobó · " + new Date(ap.fecha).toLocaleString("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · ") : "Aprobó por el cliente");
    if (oc.estado === "anulada") { txt(pg, "ANULADA", W / 2, H / 2 - 40, { f: F.x, s: 80, c: "#B3261E", centro: true }); txt(pg, oc.motivo_anulado || "", W / 2, H / 2 - 66, { f: F.s, s: 11, c: "#B3261E", centro: true }); }
    paginas.forEach((p, i) => { pie(p); txt(p, `Página ${i + 1} de ${paginas.length}`, W - M, PIE - 4, { s: 7.5, c: COL.gris, der: true }); });
    return doc.save();
  }

  Object.assign(P, { recibo, estadoCuenta, pedido, reporteFinanzas, estimacion, ordenCambio });
})();
