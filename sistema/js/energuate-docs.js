"use strict";
window.EMT_EG_DOCS = (() => {
  const D = window.EMT_DATOS;
  const LIBS = {
    excel: ["https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js", "sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz", () => window.ExcelJS],
    zip: ["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG", () => window.JSZip]
  };
  const cargas = {};
  const lib = k => cargas[k] || (cargas[k] = new Promise((ok, mal) => { const [src, integrity, g] = LIBS[k]; if (g()) return ok(g()); const s = document.createElement("script"); s.src = src; s.integrity = integrity; s.crossOrigin = "anonymous"; s.onload = () => ok(g()); s.onerror = () => { delete cargas[k]; mal(new Error("No se pudo cargar la herramienta. Revise el internet.")); }; document.head.appendChild(s); }));
  const plantilla = async f => { const r = await fetch("plantillas/" + f); if (!r.ok) throw new Error("No se encontró el formato de Energuate."); return r.arrayBuffer(); };
  const Q = n => "Q " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cant = n => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const hoyTxt = () => new Date().toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
  const fechaTxt = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }); };
  const limpio = s => String(s || "").replace(/[\\/:*?"<>|]/g, "").trim();

  async function pdfBase() {
    const [fR, fS, fB, fX] = await window.EMT_PDF.base.preparar();
    const { PDFDocument, rgb } = window.PDFLib;
    const doc = await PDFDocument.create(); doc.registerFontkit(window.fontkit);
    const F = { r: await doc.embedFont(fR, { subset: true }), s: await doc.embedFont(fS, { subset: true }), b: await doc.embedFont(fB, { subset: true }), x: await doc.embedFont(fX, { subset: true }) };
    const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    return { doc, F, hex, PDFDocument };
  }

  async function hoja({ titulo, sub, codigo, membrete, x, carta }) {
    const b = await pdfBase();
    const { doc, F, hex } = b;
    const W = 612, H = 792, M = 50;
    const partir = window.EMT_PDF.base.partir;
    let pg = null, y = 0;
    const txt = (t, xx, yy, { f = F.r, s = 9.5, c = "#0E1D33", der = false, cen = false } = {}) => { const tt = String(t == null ? "" : t); const w = f.widthOfTextAtSize(tt, s); pg.drawText(tt, { x: der ? xx - w : cen ? xx - w / 2 : xx, y: yy, size: s, font: f, color: hex(c) }); };
    let logo = null;
    if (membrete) { try { const png = await window.EMT_PDF.base.svgAPng("../logo/emtecsa-logo.svg", 900); logo = await doc.embedPng(png); } catch (e) {} }
    const nueva = () => {
      pg = doc.addPage([W, H]); y = H - M;
      if (membrete) {
        if (logo) { const h = 26, w = logo.width * h / logo.height; pg.drawImage(logo, { x: M, y: y - h, width: w, height: h }); }
        const e = x.emp;
        txt([e.razon_social || e.nombre, e.nit ? "NIT " + e.nit : ""].filter(Boolean).join(" · "), W - M, y - 8, { s: 8, c: "#4F5B69", der: true });
        txt([e.telefono, e.correo].filter(Boolean).join(" · "), W - M, y - 20, { s: 8, c: "#4F5B69", der: true });
        pg.drawLine({ start: { x: M, y: y - 34 }, end: { x: W - M, y: y - 34 }, thickness: 1.2, color: hex("#C8A96A") });
        y -= 64;
      } else if (carta) { y -= 24; } else {
        txt("DISTRIBUIDORA DE ELECTRICIDAD DE OCCIDENTE / ORIENTE · ENERGUATE", M, y, { f: F.b, s: 8, c: "#4F5B69" });
        if (codigo) txt(codigo, W - M, y, { f: F.s, s: 8, c: "#4F5B69", der: true });
        y -= 26;
        partir(titulo, F.x, 15, W - 2 * M).forEach(l => { txt(l, M, y, { f: F.x, s: 15 }); y -= 19; });
        if (sub) { txt(sub, M, y, { s: 9, c: "#4F5B69" }); y -= 14; }
        pg.drawLine({ start: { x: M, y: y }, end: { x: W - M, y }, thickness: 1, color: hex("#0E1D33") });
        y -= 20;
      }
    };
    nueva();
    const lugar = h => { if (y - h < 60) nueva(); };
    const seccion = t => { lugar(40); y -= 4; pg.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 16, color: hex("#EBEEF2") }); txt(t.toUpperCase(), M + 6, y, { f: F.b, s: 8 }); y -= 22; };
    const campo = (et, val, { ancho = W - 2 * M, x0 = M } = {}) => {
      const lw = 122;
      const ls = partir(String(val == null || val === "" ? "" : val), F.s, 9.5, ancho - lw - 8);
      const ets = partir(et, F.r, 8.5, lw - 6);
      const h = Math.max(ls.length || 1, ets.length) * 12 + 6;
      lugar(h);
      ets.forEach((l, i) => txt(l, x0, y - i * 11, { s: 8.5, c: "#4F5B69" }));
      ls.forEach((l, i) => txt(l, x0 + lw, y - i * 12, { f: F.s, s: 9.5 }));
      pg.drawLine({ start: { x: x0 + lw, y: y - (ls.length || 1) * 12 + 8 }, end: { x: x0 + ancho, y: y - (ls.length || 1) * 12 + 8 }, thickness: 0.4, color: hex("#B4BDC7") });
      y -= h;
    };
    const dos = (a, b2) => { const y0 = y; campo(a[0], a[1], { ancho: (W - 2 * M) / 2 - 8 }); const y1 = y; y = y0; campo(b2[0], b2[1], { ancho: (W - 2 * M) / 2 - 8, x0: M + (W - 2 * M) / 2 + 8 }); y = Math.min(y, y1); };
    const tabla = (cols, filas) => {
      const tot = cols.reduce((a, c) => a + c.w, 0), esc = (W - 2 * M) / tot;
      const cab = () => { lugar(30); let xx = M; pg.drawRectangle({ x: M, y: y - 5, width: W - 2 * M, height: 16, color: hex("#102440") }); cols.forEach(c => { txt(c.t, c.der ? xx + c.w * esc - 4 : xx + 4, y, { f: F.b, s: 7.5, c: "#FFFFFF", der: c.der }); xx += c.w * esc; }); y -= 18; };
      cab();
      filas.forEach((f, i) => {
        const celdas = cols.map((c, j) => partir(String(f[j] == null ? "" : f[j]), j === 0 ? F.s : F.r, 8.5, c.w * esc - 8));
        const h = Math.max(...celdas.map(l => l.length || 1)) * 11 + 6;
        if (y - h < 60) { nueva(); cab(); }
        if (i % 2) pg.drawRectangle({ x: M, y: y - h + 9, width: W - 2 * M, height: h, color: hex("#F6F7F9") });
        let xx = M; cols.forEach((c, j) => { celdas[j].forEach((l, k) => txt(l, c.der ? xx + c.w * esc - 4 : xx + 4, y - k * 11, { f: j === 0 ? F.s : F.r, s: 8.5, der: c.der })); xx += c.w * esc; });
        y -= h;
      });
      y -= 6;
    };
    const parrafo = (t, { s = 10, f = F.r, lh = 15 } = {}) => { partir(t, f, s, W - 2 * M).forEach(l => { lugar(lh); txt(l, M, y, { f, s }); y -= lh; }); };
    const firma = (nombre, puesto) => { lugar(80); y -= 40; pg.drawLine({ start: { x: M, y }, end: { x: M + 220, y }, thickness: 0.7, color: hex("#0E1D33") }); y -= 14; if (nombre) { txt(nombre, M, y, { f: F.b, s: 10 }); y -= 13; } if (puesto) { txt(puesto, M, y, { s: 9, c: "#4F5B69" }); y -= 13; } };
    const nota = t => { lugar(30); partir(t, F.r, 7.5, W - 2 * M).forEach(l => { txt(l, M, y, { s: 7.5, c: "#4F5B69" }); y -= 10; }); y -= 4; };
    const espacio = n => { y -= n; };
    return { ...b, W, H, M, txt, seccion, campo, dos, tabla, parrafo, firma, nota, espacio, lugar, get y() { return y; }, set y(v) { y = v; }, get pg() { return pg; }, guardar: () => doc.save() };
  }

  const v = (x, k) => (x.v[k] == null ? "" : String(x.v[k]));
  const obraN = x => (x.cot && x.cot.titulo) || x.o.titulo || "";
  const empN = x => x.emp.razon_social || x.emp.nombre || "EMTECSA";

  async function boleta(x) {
    const { doc, F, hex } = await pdfDesde("boleta-solicitante.pdf");
    const pg = doc.getPage(0);
    const put = (t, X, Y, s = 9) => { const tt = String(t || ""); if (!tt) return; let ss = s; while (F.s.widthOfTextAtSize(tt, ss) > 280 && ss > 6) ss -= 0.5; pg.drawText(tt, { x: X, y: Y, size: ss, font: F.s, color: hex("#0E1D33") }); };
    const X = 272;
    put(v(x, "sol_nombre"), X, 569); put(v(x, "sol_correo"), X, 550); put(v(x, "sol_telefono"), X, 530); put(v(x, "sol_dpi"), X, 510);
    const dir = window.EMT_PDF.base.partir(v(x, "sol_direccion"), F.s, 9, 278); dir.slice(0, 3).forEach((l, i) => put(l, X, 490 - i * 16));
    put(v(x, "sol_ref_nombre"), 350, 459); put(v(x, "sol_ref_telefono"), 470, 459);
    put(empN(x), X, 346); put(v(x, "resp_nombre"), X, 326); put(x.emp.correo, X, 306); put(x.emp.telefono, X, 286); put(v(x, "resp_dpi"), X, 264); put(obraN(x), X, 244);
    put([v(x, "obra_departamento"), v(x, "obra_municipio")].filter(Boolean).join(" / "), X, 225); put(v(x, "obra_direccion"), X, 205);
    put(`${x.emp.ciudad || "Guatemala"}, ${hoyTxt()}`, 126, 136);
    return { bytes: await doc.save(), nombre: `01 Boleta del solicitante - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }
  async function pdfDesde(f) {
    const [fR, fS] = await window.EMT_PDF.base.preparar();
    const { PDFDocument, rgb } = window.PDFLib;
    const doc = await PDFDocument.load(await plantilla(f)); doc.registerFontkit(window.fontkit);
    const F = { r: await doc.embedFont(fR, { subset: true }), s: await doc.embedFont(fS, { subset: true }) };
    const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    return { doc, F, hex };
  }

  async function requisitos(x) {
    const { doc, F, hex } = await pdfDesde("requisitos-licencia.pdf");
    const pg = doc.getPage(0);
    const Y = ty => 792 - ty * 0.75;
    const put = (t, X, YY, s = 9, max = 330) => { const tt = String(t || ""); if (!tt) return; let ss = s; while (F.s.widthOfTextAtSize(tt, ss) > max && ss > 6) ss -= 0.5; pg.drawText(tt, { x: X, y: YY, size: ss, font: F.s, color: hex("#102440") }); };
    put(obraN(x), 214, Y(161.8) + 1, 9.5, 390); put([v(x, "obra_direccion"), v(x, "obra_municipio"), v(x, "obra_departamento")].filter(Boolean).join(", "), 228, Y(192.5) + 1, 9.5, 376); put(empN(x), 170, Y(223) + 1, 9.5, 190); put(fechaTxt(x.guard.campos.fecha_entrega || new Date().toISOString()), 450, Y(223) + 1, 9, 95);
    const fila = { 1: 270.7, 2: 288, 3: 339.4, 4: 363.8, 5: 376.8, 6: 401.9, 7: 427.2, 8: 448.2, 9: 465, 10: 490.1, 11: 507.5, 12: 523.8, 13: 540.6, 14: 590.2, 15: 615.5, 16: 632.2, 17: 649.6, 18: 674.9, 19: 736.8, 20: 762.1 };
    D.REQUISITOS_EG.forEach(rq => { const e = D.estadoRequisito(rq, x); const t = e.e === "listo" || e.e === "lleno" || e.e === "firmar" ? "Listo" : e.e === "no_aplica" ? "No aplica" : ""; if (!t) return; const w = F.s.widthOfTextAtSize(t, 7.5); pg.drawText(t, { x: 522 - w / 2, y: Y(fila[rq.n]) + 1, size: 7.5, font: F.s, color: hex(t === "No aplica" ? "#4F5B69" : "#2A7353") }); });
    return { bytes: await doc.save(), nombre: `00 Requisitos de la licencia - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function capacidadPDF(x) {
    const h = await hoja({ titulo: "Solicitud de Dictamen de Capacidad", sub: "No se autoriza efectuar pagos con este dictamen · vigencia máxima 6 meses", codigo: "FO.PE.DIS.17.01", x });
    const p = x.plano;
    h.dos(["Lugar", x.emp.ciudad || "Guatemala"], ["Fecha y hora", new Date().toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" })]);
    h.dos(["Empresa constructora", empN(x)], ["Teléfono", x.emp.telefono]);
    h.campo("Dirección electrónica para respuesta", x.emp.correo);
    h.campo("Nombre de la obra", obraN(x)); h.campo("Dirección de la obra", [v(x, "obra_direccion"), v(x, "obra_municipio"), v(x, "obra_departamento")].filter(Boolean).join(", "));
    h.dos(["Capacidad requerida", x.kva ? x.kva + " kVA" : ""], ["Tensión de servicio", v(x, "tension")]);
    h.seccion("Transformadores");
    h.tabla([{ t: "DESCRIPCIÓN", w: 3 }, { t: "CANTIDAD", w: 1.2, der: true }, { t: "TIPO", w: 1.6 }, { t: "kVA", w: 1, der: true }], [10, 25, 50, 75].map(k => [`Monofásico ${k} kVA`, p.trafos[k] || 0, p.trafos[k] ? v(x, "tipo_trafo") : "", (p.trafos[k] || 0) * k]).concat([["Otros", p.otros, "", ""], ["Potencia total", Object.values(p.trafos).reduce((a, b) => a + b, 0) + p.otros, "", x.kva]]));
    h.campo("Descripción de la carga", v(x, "descripcion_carga"));
    h.dos(["Longitud del circuito de media tensión", p.metrosMT ? p.metrosMT + " m" : ""], ["Longitud del circuito de baja tensión", p.metrosBT ? p.metrosBT + " m" : ""]);
    h.seccion("Tipo de conductor a utilizar");
    h.dos(["En fases", v(x, "conductor")], ["En neutro", v(x, "neutro")]); h.campo("En baja tensión", v(x, "bt"));
    h.dos(["Número de clientes a conectar", v(x, "clientes_n")], ["Tipo de servicio", v(x, "servicio")]);
    h.campo("Nombre del interesado o representante", v(x, "sol_nombre"));
    h.seccion("Coordenadas UTM del punto de arranque");
    h.dos(["X (m)", p.arranque ? p.arranque.x : ""], ["Y (m)", p.arranque ? p.arranque.y : ""]);
    h.seccion("Coordenadas UTM de cada centro de transformación");
    h.tabla([{ t: "No.", w: 0.6 }, { t: "X (m)", w: 2, der: true }, { t: "Y (m)", w: 2, der: true }], p.centros.length ? p.centros.map((u, i) => [String(i + 1).padStart(2, "0"), u ? u.x : "", u ? u.y : ""]) : [["01", "", ""]]);
    h.dos(["Tipo de medición", v(x, "medicion")], ["Fases que pretende utilizar", v(x, "fases")]);
    h.campo("Matrícula del centro de transformación más cercano al entronque", v(x, "matricula_ct"));
    h.seccion("Profesional que solicita");
    h.campo("Ing. electricista o mecánico electricista", v(x, "ing_nombre"));
    h.dos(["No. de colegiado activo", v(x, "ing_colegiado")], ["Teléfono", v(x, "ing_telefono")]);
    h.dos(["Identificador", v(x, "ing_id")], ["Vencimiento de la constancia", fechaTxt(v(x, "ing_vence"))]);
    h.campo("Breve descripción de la obra", obraN(x));
    h.seccion("Postes");
    const gp = {}; p.postes.forEach(q => { const k = q.long + "|" + (q.material || v(x, "poste_material")); gp[k] = (gp[k] || 0) + 1; });
    h.tabla([{ t: "CANTIDAD", w: 1, der: true }, { t: "LONGITUD", w: 1.5 }, { t: "MATERIAL", w: 2 }], Object.entries(gp).map(([k, n]) => [n, ...k.split("|")]).concat(Object.keys(gp).length ? [] : [["", "", ""]]));
    h.campo("Porcentaje de incremento de carga", v(x, "incremento") ? v(x, "incremento") + " %" : "");
    h.firma(v(x, "ing_nombre"), `Colegiado ${v(x, "ing_colegiado")}`);
    h.nota("IMPORTANTE: El presente dictamen no autoriza construcción alguna en la red.");
    return { bytes: await h.guardar(), nombre: `08 Solicitud de Dictamen de Capacidad - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function capacidadXLSX(x) {
    const ExcelJS = await lib("excel");
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await plantilla("dictamen-capacidad.xlsx"));
    const ws = wb.getWorksheet("Dictamen de Capacidad");
    const p = x.plano;
    const s = (c, val) => { if (val === "" || val == null) return; ws.getCell(c).value = val; };
    s("B6", x.emp.ciudad || "Guatemala"); s("G6", new Date().toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" }));
    s("C7", empN(x)); s("G7", x.emp.telefono); s("D8", x.emp.correo); s("C9", obraN(x));
    s("C10", [v(x, "obra_direccion"), v(x, "obra_municipio"), v(x, "obra_departamento")].filter(Boolean).join(", ")); s("C11", x.kva ? x.kva + " kVA" : ""); s("D12", v(x, "tension"));
    [10, 25, 50, 75].forEach((k, i) => { ws.getCell("B" + (15 + i)).value = p.trafos[k] || 0; ws.getCell("D" + (15 + i)).value = (p.trafos[k] || 0) * k; if (p.trafos[k]) ws.getCell("C" + (15 + i)).value = v(x, "tipo_trafo"); });
    ws.getCell("B19").value = p.otros; ws.getCell("D19").value = 0; ws.getCell("B20").value = Object.values(p.trafos).reduce((a, b) => a + b, 0) + p.otros; ws.getCell("D20").value = x.kva;
    const desc = v(x, "descripcion_carga"); const trozos = desc.match(/.{1,60}(\s|$)/g) || []; ["E16", "E17", "E18", "E20"].forEach((c, i) => { if (trozos[i]) s(c, trozos[i].trim()); });
    s("E21", p.metrosMT || ""); s("E22", p.metrosBT || ""); s("B24", v(x, "conductor")); s("E24", v(x, "neutro")); s("H24", v(x, "bt"));
    s("D25", Number(v(x, "clientes_n")) || v(x, "clientes_n")); s("D26", v(x, "servicio")); s("D27", v(x, "sol_nombre"));
    if (p.arranque) { s("B29", p.arranque.x); s("F29", p.arranque.y); }
    p.centros.slice(0, 20).forEach((u, i) => { if (!u) return; const r = 31 + (i % 10); s((i < 10 ? "B" : "F") + r, u.x); s((i < 10 ? "D" : "H") + r, u.y); });
    s("C42", v(x, "medicion")); s("F45", v(x, "matricula_ct")); s("C46", v(x, "fases")); s("E47", v(x, "ing_nombre")); s("C48", v(x, "ing_colegiado")); s("B49", v(x, "ing_telefono")); s("E50", v(x, "ing_id")); s("E51", fechaTxt(v(x, "ing_vence"))); s("C52", obraN(x));
    const gp = {}; p.postes.forEach(q => { const k = q.long + "|" + (q.material || v(x, "poste_material")); gp[k] = (gp[k] || 0) + 1; });
    ws.getCell("A57").value = null; Object.entries(gp).slice(0, 6).forEach(([k, n], i) => { const [l, m] = k.split("|"); s("A" + (57 + i), n); s("B" + (57 + i), l); s("C" + (57 + i), m); });
    s("C65", v(x, "incremento") ? Number(v(x, "incremento")) / 100 : "");
    const buf = await wb.xlsx.writeBuffer();
    return { bytes: buf, nombre: `08 Solicitud de Dictamen de Capacidad - ${limpio(obraN(x))}.xlsx`, tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }

  async function medidaPDF(x) {
    const cen = !!x.v.centralizacion;
    const h = await hoja({ titulo: cen ? "Solicitud de Dictamen de Centralización" : "Solicitud de Dictamen de Medida", sub: "Versión 2026", codigo: "v.2026", x });
    h.dos(["No. dictamen de capacidad", x.guard.campos.dictamen_no || ""], ["Fecha de emisión", fechaTxt(x.guard.campos.dictamen_fecha)]);
    h.dos(["Nombre subestación", x.guard.campos.subestacion || ""], ["Nombre SMT", x.guard.campos.smt || ""]);
    h.seccion("Datos específicos del dictamen");
    h.campo("Nombre propietario o representante legal", v(x, "sol_nombre")); h.campo("Nombre del proyecto", obraN(x));
    h.dos(["Teléfono solicitante", v(x, "sol_telefono")], ["Dirección del proyecto", v(x, "obra_direccion")]);
    h.dos(["Correo electrónico solicitante", v(x, "sol_correo")], ["Municipio", v(x, "obra_municipio")]);
    h.dos(["Empresa constructora", empN(x)], ["Departamento", v(x, "obra_departamento")]);
    h.dos(["Teléfono constructora", x.emp.telefono], ["Región", v(x, "region")]);
    h.campo("Correo electrónico constructora", x.emp.correo);
    h.seccion("Especificaciones técnicas de la medición");
    h.dos(["Capacidad del banco de transformación", x.kva ? x.kva + " kVA" : ""], cen ? ["Tipo de transformador", v(x, "trafo_medida")] : ["Potencia a contratar", v(x, "potencia_kw") ? v(x, "potencia_kw") + " kW" : ""]);
    if (!cen) h.campo("Tipo de transformador", v(x, "trafo_medida"));
    h.dos(["Voltaje MT", x.op.kv ? x.op.kv + " kV" : ""], ["Protección principal primaria", v(x, "prot_primaria") ? v(x, "prot_primaria") + " A" : ""]);
    h.dos(["Voltaje BT", v(x, "volt_bt") ? v(x, "volt_bt") + " V" : ""], ["Protección principal secundaria", v(x, "prot_secundaria") ? v(x, "prot_secundaria") + " A" : ""]);
    if (cen) {
      h.seccion("Panel de medidores");
      h.dos(["Marca", v(x, "panel_marca")], ["Tipo de panel", v(x, "panel_tipo")]);
      h.dos(["Medidores base A", v(x, "panel_base_a")], ["Medidores tipo socket", v(x, "panel_socket")]);
      h.dos(["Ampacidad barras principales", v(x, "panel_amp_p")], ["Ampacidad barras secundarias", v(x, "panel_amp_s")]);
    } else {
      h.campo("Tipo de medida", v(x, "tipo_medida"));
      h.seccion("Transformadores de corriente (CT)");
      h.tabla([{ t: "MARCA", w: 1 }, { t: "TIPO", w: 1 }, { t: "RELACIÓN", w: 1 }, { t: "AÑO", w: 0.7 }, { t: "PRECISIÓN", w: 0.9 }, { t: "RF", w: 0.6 }], [[v(x, "ct_marca"), v(x, "ct_tipo"), v(x, "ct_relacion"), v(x, "ct_anio"), v(x, "ct_precision"), v(x, "ct_rf")]]);
      h.tabla([{ t: "SERIE R", w: 1 }, { t: "SERIE S", w: 1 }, { t: "SERIE T", w: 1 }], [[v(x, "ct_r"), v(x, "ct_s"), v(x, "ct_t")]]);
      h.seccion("Transformadores de potencial (PT)");
      h.tabla([{ t: "MARCA", w: 1 }, { t: "TIPO", w: 1 }, { t: "RELACIÓN", w: 1 }, { t: "AÑO", w: 0.7 }, { t: "PRECISIÓN", w: 0.9 }, { t: "V PRIM / SEC", w: 1 }], [[v(x, "pt_marca"), v(x, "pt_tipo"), v(x, "pt_relacion"), v(x, "pt_anio"), v(x, "pt_precision"), v(x, "pt_v")]]);
      h.tabla([{ t: "SERIE R", w: 1 }, { t: "SERIE S", w: 1 }, { t: "SERIE T", w: 1 }], [[v(x, "pt_r"), v(x, "pt_s"), v(x, "pt_t")]]);
    }
    h.seccion("Ubicación");
    h.dos(["Punto de medida X", v(x, "medida_x")], ["Punto de medida Y", v(x, "medida_y")]);
    h.dos(["Punto de entronque X", x.plano.arranque ? x.plano.arranque.x : ""], ["Punto de entronque Y", x.plano.arranque ? x.plano.arranque.y : ""]);
    h.seccion("Profesional");
    h.dos(["Nombre del profesional", v(x, "ing_nombre")], ["Título", v(x, "ing_titulo")]);
    h.dos(["Número de colegiado activo", v(x, "ing_colegiado")], ["Colegiado vigente hasta", fechaTxt(v(x, "ing_vence"))]);
    h.firma(v(x, "ing_nombre"), "Firma, sello y timbre del profesional");
    h.firma(v(x, "sol_nombre"), "Propietario o representante legal");
    h.nota("La empresa constructora deberá cumplir con las Especificaciones Técnicas de la Medida (ETM) vigentes emitidas por Energuate. Cualquier modificación a las especificaciones consignadas anulará el dictamen.");
    return { bytes: await h.guardar(), nombre: `09 Solicitud de Dictamen de ${cen ? "Centralización" : "Medida"} - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function medidaXLSX(x) {
    const ExcelJS = await lib("excel");
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await plantilla("dictamen-medida-centralizacion.xlsx"));
    const cen = !!x.v.centralizacion;
    const ws = wb.getWorksheet(cen ? "Dictamen de Centralización" : "Dictamen de Medida");
    wb.removeWorksheet(wb.getWorksheet(cen ? "Dictamen de Medida" : "Dictamen de Centralización").id);
    const s = (c, val) => { if (val === "" || val == null) return; ws.getCell(c).value = val; };
    const fila = et => { let r = null; ws.eachRow((row, n) => { if (r) return; row.eachCell(c => { if (!r && typeof c.value === "string" && c.value.trim().toLowerCase().startsWith(et.toLowerCase())) r = n; }); }); return r; };
    s("E9", x.guard.campos.dictamen_no); s("K9", fechaTxt(x.guard.campos.dictamen_fecha)); s("D11", x.guard.campos.subestacion); s("J11", x.guard.campos.smt);
    s("F16", v(x, "sol_nombre")); s("E19", obraN(x)); s("E21", v(x, "sol_telefono")); s("K21", v(x, "obra_direccion")); s("E22", v(x, "sol_correo")); s("E23", v(x, "sol_telefono")); s("K23", v(x, "obra_municipio"));
    s("E24", empN(x)); s("K24", v(x, "obra_departamento")); s("E25", x.emp.telefono); s("J25", v(x, "region")); s("E26", x.emp.correo);
    s("F30", x.kva || ""); s("E31", v(x, "trafo_medida")); s("C32", x.op.kv || ""); s("K32", v(x, "prot_primaria")); s("C33", v(x, "volt_bt")); s("K33", v(x, "prot_secundaria"));
    if (cen) {
      s("C35", v(x, "panel_marca")); s("K35", v(x, "panel_tipo")); s("E36", v(x, "panel_base_a")); s("K36", v(x, "panel_socket")); s("E37", v(x, "panel_amp_p")); s("K37", v(x, "panel_amp_s"));
      s("G39", v(x, "medida_x")); s("K39", v(x, "medida_y")); if (x.plano.arranque) { s("G40", x.plano.arranque.x); s("K40", x.plano.arranque.y); }
    } else {
      s("K30", v(x, "potencia_kw")); s("D34", v(x, "tipo_medida"));
      s("C36", v(x, "ct_marca")); s("G36", v(x, "ct_tipo")); s("K36", v(x, "ct_relacion")); s("C37", v(x, "ct_anio")); s("G37", v(x, "ct_precision")); s("K37", v(x, "ct_rf")); s("C38", v(x, "ct_r")); s("G38", v(x, "ct_s")); s("K38", v(x, "ct_t"));
      s("C40", v(x, "pt_marca")); s("G40", v(x, "pt_tipo")); s("K40", v(x, "pt_relacion")); s("C41", v(x, "pt_anio")); s("G41", v(x, "pt_precision")); s("K41", v(x, "pt_v")); s("C42", v(x, "pt_r")); s("G42", v(x, "pt_s")); s("K42", v(x, "pt_t"));
      s("G44", v(x, "medida_x")); s("K44", v(x, "medida_y")); if (x.plano.arranque) { s("G45", x.plano.arranque.x); s("K45", x.plano.arranque.y); }
    }
    const rN = fila("Nombre del Profesional"); if (rN) { s("D" + rN, v(x, "ing_nombre")); s("D" + (rN + 1), v(x, "ing_titulo")); s("D" + (rN + 2), v(x, "ing_colegiado")); s("D" + (rN + 3), fechaTxt(v(x, "ing_vence"))); }
    const rP = fila("Nombre:"); if (rP) s("D" + rP, v(x, "sol_nombre"));
    const buf = await wb.xlsx.writeBuffer();
    return { bytes: buf, nombre: `09 Solicitud de Dictamen de ${cen ? "Centralización" : "Medida"} - ${limpio(obraN(x))}.xlsx`, tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }

  async function cartaLicencia(x) {
    const h = await hoja({ x, carta: true });
    const p = x.plano;
    h.txt(`${x.v.obra_municipio || x.emp.ciudad || "Guatemala"}, ${hoyTxt()}`, h.M, h.y); h.espacio(36);
    h.parrafo("Señores", { f: h.F.s }); h.parrafo("Distribuidora de Electricidad de Occidente, S. A. / Distribuidora de Electricidad de Oriente, S. A.", { f: h.F.s }); h.parrafo("Energuate"); h.parrafo("Presente."); h.espacio(12);
    h.parrafo(`Por este medio solicito la emisión de la licencia de construcción para el proyecto «${obraN(x)}», ubicado en ${[v(x, "obra_direccion"), v(x, "obra_municipio"), v(x, "obra_departamento")].filter(Boolean).join(", ")}.`); h.espacio(8);
    const ten = v(x, "tension").split(" "); const partes = [p.metrosMT ? `${cant(p.metrosMT)} metros de línea de media tensión ${ten[1] ? ten[1].toLowerCase().replace(/o$/, "a") : ""} de ${ten[0]} kV`.replace("  ", " ") : "", p.metrosBT ? `${cant(p.metrosBT)} metros de baja tensión` : "", p.postes.length ? `${p.postes.length} ${p.postes.length === 1 ? "poste nuevo" : "postes nuevos"}` : "", x.kva ? `${x.kva} kVA de transformación` : ""].filter(Boolean);
    h.parrafo(`Descripción general del proyecto: ${partes.length ? partes.join(", ") + "." : obraN(x) + "."} La construcción estará a cargo de ${empN(x)}.`); h.espacio(8);
    if (v(x, "descripcion_carga")) { h.parrafo(`Uso de la energía: ${v(x, "descripcion_carga")}.`); h.espacio(8); }
    h.parrafo("Adjunto la documentación requerida según la lista de requisitos para solicitud de licencia de construcción."); h.espacio(8);
    h.parrafo("Atentamente,");
    h.firma(v(x, "sol_nombre"), "Propietario del proyecto");
    if (v(x, "sol_dpi")) h.parrafo(`DPI ${v(x, "sol_dpi")}`, { s: 9 });
    return { bytes: await h.guardar(), nombre: `05 Carta de solicitud de licencia - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function cartaNormas(x) {
    const h = await hoja({ x, membrete: true });
    h.txt(`${x.emp.ciudad || "Guatemala"}, ${hoyTxt()}`, h.M, h.y); h.espacio(36);
    h.parrafo("Señores", { f: h.F.s }); h.parrafo("Energuate"); h.parrafo("Presente."); h.espacio(12);
    h.parrafo(`${empN(x)}, empresa constructora del proyecto «${obraN(x)}», hace constar que tuvo a la vista el documento «Normas de Seguridad & Medio Ambiente, Licencias de Construcción» y, enterada de su contenido, se compromete a cumplirlo en todos los trabajos de este proyecto.`); h.espacio(8);
    h.parrafo("Nuestro personal trabajará con el equipo de protección personal y colectivo que corresponde a cada actividad y respetará las reglas de seguridad y medio ambiente indicadas.");
    h.espacio(8); h.parrafo("Atentamente,");
    h.firma(v(x, "resp_nombre"), `${empN(x)} · firma y sello`);
    return { bytes: await h.guardar(), nombre: `06 Carta del constructor sobre las normas - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function clientes(x) {
    const h = await hoja({ titulo: "Listado de clientes a conectar", sub: obraN(x), x });
    const lista = (x.guard.campos.clientes_lista && x.guard.campos.clientes_lista.length) ? x.guard.campos.clientes_lista : [{ nombre: v(x, "sol_nombre"), actividad: v(x, "actividad") }];
    h.tabla([{ t: "No.", w: 0.5 }, { t: "CLIENTE", w: 3 }, { t: "ACTIVIDAD ECONÓMICA", w: 3 }], lista.map((c, i) => [i + 1, c.nombre, c.actividad]));
    return { bytes: await h.guardar(), nombre: `07 Listado de clientes a conectar - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function presupuesto(x) {
    const h = await hoja({ titulo: "Presupuesto de la obra", sub: `${obraN(x)} · ${x.cot ? x.cot.numero : ""}`, x });
    const k = x.k;
    h.tabla([{ t: "DESCRIPCIÓN", w: 4 }, { t: "CANT.", w: 0.8, der: true }, { t: "PRECIO UNIT.", w: 1.3, der: true }, { t: "TOTAL", w: 1.4, der: true }], k.partidas.filter(p => p.incluida !== false).map(p => [p.descripcion, cant(p.cantidad), Q(p.precio_unitario), Q(p.total)]).concat((x.cot.cargos || []).map(g => [g.descripcion, 1, Q(g.monto), Q(g.monto)])));
    h.tabla([{ t: "", w: 5 }, { t: "MONTO", w: 2, der: true }], [["Subtotal", Q(k.subtotal + (k.cargos || 0))], ...(k.imprevistos ? [["Imprevistos y administración", Q(k.imprevistos)]] : []), ...(k.descuento ? [["Descuento", "− " + Q(k.descuento)]] : []), ...(x.cot.iva ? [["IVA 12 %", Q(k.iva)]] : []), [x.cot.iva ? "Total con IVA" : "Total", Q(k.total)]]);
    return { bytes: await h.guardar(), nombre: `10 Presupuesto de la obra - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function materiales(x) {
    const h = await hoja({ titulo: "Listado de materiales", sub: `${obraN(x)} · detalle técnico, precio por unidad y total`, x });
    const l = x.k.materiales;
    h.tabla([{ t: "CÓDIGO", w: 1 }, { t: "DESCRIPCIÓN TÉCNICA", w: 4 }, { t: "CANT.", w: 0.8, der: true }, { t: "PRECIO UNIT.", w: 1.3, der: true }, { t: "TOTAL", w: 1.4, der: true }], l.map(m => [m.material.codigo, m.material.descripcion + (m.material.unidad ? ` (${m.material.unidad})` : ""), cant(m.cantidad), m.precioU == null ? "" : Q(m.precioU), m.venta == null ? "" : Q(m.venta)]).concat([["", "Total de materiales", "", "", Q(l.reduce((a, m) => a + (m.venta || 0), 0))]]));
    return { bytes: await h.guardar(), nombre: `11 Listado de materiales - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function gps(x) {
    const h = await hoja({ titulo: "Libreta de puntos GPS", sub: `${obraN(x)} · coordenadas UTM de los postes`, x });
    h.tabla([{ t: "POSTE", w: 1 }, { t: "TIPO", w: 1 }, { t: "DESCRIPCIÓN", w: 2.6 }, { t: "ZONA", w: 0.8 }, { t: "X (ESTE)", w: 1.3, der: true }, { t: "Y (NORTE)", w: 1.3, der: true }], x.plano.gps.map(g => [g.cod, g.tipo, g.desc, g.zona, g.x, g.y]));
    return { bytes: await h.guardar(), nombre: `12 Libreta de puntos GPS - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  async function plano(x) {
    const mc = window.EMT_PLANOS.machoteInicial(x.pl.machote || {});
    return { bytes: await window.EMT_PLANOS.planoBytes(x.d, mc, "Plano"), nombre: `13 Plano de planta general - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  const NUM = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve", "treinta", "treinta y uno"];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function valoresPaso(x, t) {
    const f = new Date(), kv = Number(x.op.kv || 13.2);
    return { 1: t.nombre, 2: t.edad ? `${t.edad}` : "", 3: t.civil, 4: t.profesion, 5: t.domicilio, 6: t.dpi, 7: t.ubicacion, 8: t.municipio, 9: t.departamento, 10: t.norte, 11: t.sur, 12: t.oriente, 13: t.poniente, 14: t.area, 15: t.largo, 16: t.ancho, 17: "media tensión de", 18: `${kv}`, 19: v(x, "paso_desde_mun"), 20: v(x, "paso_desde_dep"), 21: v(x, "paso_hasta_mun"), 22: v(x, "paso_hasta_dep"), 23: NUM[f.getDate()] || String(f.getDate()), 24: MESES[f.getMonth()], 25: NUM[f.getFullYear() - 2000] || String(f.getFullYear() - 2000) };
  }
  async function pasoDOCX(x, t, i) {
    const JSZip = await lib("zip");
    const z = await JSZip.loadAsync(await plantilla("derecho-de-paso.docx"));
    let xml = await z.file("word/document.xml").async("string");
    const val = valoresPaso(x, t);
    const e = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    xml = xml.replace(/\{\{p(\d+)\|(\d+)\}\}/g, (m, n, l) => val[n] ? e(val[n]) : "_".repeat(Number(l)));
    xml = xml.replace("{{tipo}}", "OBRA PARA NUEVO SUMINISTRO").replace("{{solicitada}}", e(`SOLICITADA POR: ${v(x, "sol_nombre")} · ${obraN(x)}`));
    z.file("word/document.xml", xml);
    const blob = await z.generateAsync({ type: "uint8array" });
    return { bytes: blob, nombre: `16 Derecho de paso ${i + 1} - ${limpio(t.nombre || "terreno")}.docx`, tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  async function pasoPDF(x, t, i) {
    const h = await hoja({ titulo: "Constitución de derecho de paso de línea de energía eléctrica", sub: `Obra para nuevo suministro · solicitada por ${v(x, "sol_nombre")} · ${obraN(x)}`, codigo: "(PE.2676.GT-PS)-FO.07", x });
    const val = valoresPaso(x, t), r = k => val[k] || "______________";
    h.parrafo(`Yo, ${r(1)}, de ${r(2)} años de edad, estado civil ${r(3)}, guatemalteco, de profesión u oficio ${r(4)}, domiciliado en el departamento de ${r(5)}, me identifico con el Documento Personal de Identificación, con código único de identificación número ${r(6)}, extendido por el Registro Nacional de las Personas de la República de Guatemala, por este medio declaro bajo juramento, con conocimiento de las penas relativas al delito de perjurio lo siguiente:`, { s: 9.5, lh: 14 }); h.espacio(6);
    h.parrafo(`Primero: Soy legítimo poseedor del inmueble ubicado en ${r(7)}, municipio de ${r(8)}, del departamento de ${r(9)}, el cual colinda al norte con: ${r(10)}; al sur con: ${r(11)}; al oriente con: ${r(12)}; y al poniente con: ${r(13)}. He mantenido mi derecho de posesión sobre el inmueble de forma continua, pública y pacífica, por lo que tengo el total y absoluto derecho para disponer de éste en la forma que más convenga a mis intereses.`, { s: 9.5, lh: 14 }); h.espacio(6);
    h.parrafo("Segundo: Por este medio otorgo autorización expresa e irrevocable de Derecho de Paso de Conducción de Línea de Energía Eléctrica a favor de la entidad DISTRIBUIDORA DE ELECTRICIDAD DE OCCIDENTE, SOCIEDAD ANÓNIMA o a cualquier entidad a la que ésta cediere en el futuro los derechos que se derivan de este documento, para que pueda realizar en el inmueble los trabajos de construcción de instalaciones para distribución de energía eléctrica, incluyéndose para ello el derecho de paso por el inmueble, conforme a lo indicado en el formato oficial.", { s: 9.5, lh: 14 }); h.espacio(6);
    h.parrafo(`Tercero: El Derecho de Paso otorgado será de ${r(14)} metros cuadrados, los cuales se componen de ${r(15)} metros de largo por ${r(16)} metros de ancho, conforme al plano general parcelario del proyecto. Este permiso corresponde a un tramo de la línea de ${r(17)} ${r(18)} kilovoltios que conduce energía eléctrica desde el municipio de ${r(19)}, del departamento de ${r(20)}, hasta el municipio de ${r(21)}, del departamento de ${r(22)}.`, { s: 9.5, lh: 14 }); h.espacio(6);
    h.parrafo(`Manifiesto que el presente documento ha sido completado en su totalidad, razón por la cual lo acepto, ratifico y firmo. Dado el día ${r(23)} del mes de ${r(24)} del año dos mil ${r(25)}.`, { s: 9.5, lh: 14 });
    h.firma(t.nombre, `DPI ${t.dpi || ""}`);
    h.nota("El texto completo y el acta de legalización de firma van en el documento de Word con el formato oficial de Energuate; el notario completa la legalización.");
    return { bytes: await h.guardar(), nombre: `16 Derecho de paso ${i + 1} - ${limpio(t.nombre || "terreno")}.pdf`, tipo: "application/pdf" };
  }

  const GEN = {
    boleta: { pdf: boleta }, capacidad: { pdf: capacidadPDF, original: capacidadXLSX }, medida: { pdf: medidaPDF, original: medidaXLSX },
    carta_licencia: { pdf: cartaLicencia }, carta_normas: { pdf: cartaNormas }, clientes: { pdf: clientes }, presupuesto: { pdf: presupuesto },
    materiales: { pdf: materiales }, gps: { pdf: gps }, plano: { pdf: plano }
  };

  function descargar(r) { const b = new Blob([r.bytes], { type: r.tipo }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = r.nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }

  async function expediente(x) {
    const b = await pdfBase();
    const { doc, F, hex, PDFDocument } = b;
    const W = 612, H = 792;
    const partes = [];
    partes.push({ t: "Lista de requisitos", bytes: (await requisitos(x)).bytes });
    const subirDe = async rq => { const e = D.estadoRequisito(rq, x); const l = []; for (const a of [...(e.fijos || []), ...(e.archivos || [])]) { const bl = await D.archivo(a.ref); if (bl) l.push({ t: a.nombre, blob: bl, tipo: a.tipo || bl.type }); } return l; };
    for (const rq of D.REQUISITOS_EG) {
      const e = D.estadoRequisito(rq, x);
      if (e.e === "no_aplica") continue;
      const items = [];
      if (rq.doc && GEN[rq.doc] && !(e.faltan && e.faltan.length)) { try { const r = await GEN[rq.doc].pdf(x); items.push({ t: rq.t, bytes: r.bytes }); } catch (er) {} }
      if (rq.doc === "paso") for (const [i, t] of x.terrenos.entries()) { if ((e.archivos || []).length) break; try { const r = await pasoPDF(x, t, i); items.push({ t: `Derecho de paso: ${t.nombre || "terreno " + (i + 1)}`, bytes: r.bytes }); } catch (er) {} }
      items.push(...await subirDe(rq));
      if (items.length) partes.push({ n: rq.n, t: rq.t, items });
    }
    for (const p of partes) {
      if (p.n) {
        const sp = doc.addPage([W, H]);
        sp.drawRectangle({ x: 0, y: H - 260, width: W, height: 260, color: hex("#07111F") });
        sp.drawText(String(p.n).padStart(2, "0"), { x: 56, y: H - 120, size: 54, font: F.x, color: hex("#C8A96A") });
        window.EMT_PDF.base.partir(p.t, F.x, 22, W - 112).slice(0, 3).forEach((l, i) => sp.drawText(l, { x: 56, y: H - 170 - i * 28, size: 22, font: F.x, color: hex("#FFFFFF") }));
      }
      for (const it of (p.items || [{ bytes: p.bytes }])) {
        try {
          if (it.bytes || (it.tipo || "").includes("pdf")) {
            const src = await PDFDocument.load(it.bytes || await it.blob.arrayBuffer(), { ignoreEncryption: true });
            (await doc.copyPages(src, src.getPageIndices())).forEach(pg => doc.addPage(pg));
          } else {
            const by = await it.blob.arrayBuffer();
            const im = /png/.test(it.tipo) ? await doc.embedPng(by) : await doc.embedJpg(by);
            const pg = doc.addPage([W, H]); const e2 = Math.min((W - 72) / im.width, (H - 72) / im.height);
            pg.drawImage(im, { x: (W - im.width * e2) / 2, y: (H - im.height * e2) / 2, width: im.width * e2, height: im.height * e2 });
          }
        } catch (er) { const pg = doc.addPage([W, H]); pg.drawText(`${it.t || "Archivo"}: no se pudo unir (dañado o protegido).`, { x: 56, y: H - 100, size: 11, font: F.s, color: hex("#B3261E") }); }
      }
    }
    const n = doc.getPageCount();
    doc.getPages().forEach((pg, i) => { const { width } = pg.getSize(); const t = `Licencia de construcción · ${obraN(x)} · ${i + 1} de ${n}`; pg.drawText(t, { x: width - 24 - F.r.widthOfTextAtSize(t, 6.5), y: 14, size: 6.5, font: F.r, color: hex("#4F5B69") }); });
    return { bytes: await doc.save(), nombre: `Expediente licencia de construcción - ${limpio(obraN(x))}.pdf`, tipo: "application/pdf" };
  }

  return { GEN, requisitos, pasoDOCX, pasoPDF, expediente, descargar };
})();
