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

  Object.assign(P, { recibo, estadoCuenta, pedido, reporteFinanzas });
})();
