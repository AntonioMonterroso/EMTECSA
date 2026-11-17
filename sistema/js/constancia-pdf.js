"use strict";
window.EMT_CONSTANCIA = (() => {
  const LIBS = [
    ["https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js", "sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI"],
    ["https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js", "sha384-2p6U+1mmqF10USehFeRiyG2ESG9FwIqN+jxULn5w9jjQIihSn9Pt13dVCn/Hawjn"]
  ];
  const COL = { marino: "#102440", laton: "#C8A96A", latonT: "#7A5C22", texto: "#0E1D33", gris: "#4F5B69", linea: "#D5DBE2", fondo: "#F6F7F9" };
  const W = 612, H = 792, M = 56;
  const Q = n => "Q " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let libs = null;
  const cargar = ([src, integrity]) => new Promise((ok, mal) => { if ([...document.scripts].some(s => s.src === src)) { const t = setInterval(() => { if (src.includes("fontkit") ? window.fontkit : window.PDFLib) { clearInterval(t); ok(); } }, 50); return; } const s = document.createElement("script"); s.src = src; s.integrity = integrity; s.crossOrigin = "anonymous"; s.onload = ok; s.onerror = () => mal(new Error("No se pudo cargar la herramienta del PDF. Revise el internet.")); document.head.appendChild(s); });
  async function preparar(base) {
    if (!(window.PDFLib && window.fontkit)) { if (!libs) libs = (async () => { for (const l of LIBS) await cargar(l); })(); await libs; }
    return Promise.all(["Regular", "SemiBold", "Bold", "ExtraBold"].map(w => fetch(`${base}fuentes/PlusJakartaSans-${w}.ttf`).then(r => { if (!r.ok) throw new Error("No se encontró la letra del PDF."); return r.arrayBuffer(); })));
  }
  async function svgAPng(url, ancho) {
    const img = new Image(); img.src = url; await img.decode();
    const cv = document.createElement("canvas"); cv.width = ancho; cv.height = Math.round(ancho * img.naturalHeight / img.naturalWidth);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return (await new Promise(r => cv.toBlob(r, "image/png"))).arrayBuffer();
  }
  const fechaHora = iso => new Date(iso).toLocaleString("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fechaTxt = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" }); };
  async function referencia(d, ap) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode([d.numero, ap.nombre, ap.fecha, ap.total, ap.huella || ""].join("|")));
    return [...new Uint8Array(b)].slice(0, 6).map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
  }

  async function armar({ d, ap, base = "" }) {
    const [fR, fS, fB, fX] = await preparar(base);
    const { PDFDocument, rgb } = window.PDFLib;
    const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    const emp = d.empresa || {};
    doc.setTitle(`Constancia de aprobación ${d.numero}`); doc.setAuthor(emp.nombre || "EMTECSA"); doc.setCreator("Sistema EMTECSA");
    const F = { r: await doc.embedFont(fR, { subset: true }), s: await doc.embedFont(fS, { subset: true }), b: await doc.embedFont(fB, { subset: true }), x: await doc.embedFont(fX, { subset: true }) };
    const pg = doc.addPage([W, H]);
    const txt = (t, x, y, { f = F.r, s = 10, c = COL.texto, der = false } = {}) => { const tt = String(t == null ? "" : t); pg.drawText(tt, { x: der ? x - f.widthOfTextAtSize(tt, s) : x, y, size: s, font: f, color: hex(c) }); };
    const partir = (texto, f, s, ancho) => { const out = []; let l = ""; String(texto || "").split(/\s+/).filter(Boolean).forEach(p => { const pr = l ? l + " " + p : p; if (f.widthOfTextAtSize(pr, s) <= ancho) l = pr; else { if (l) out.push(l); l = p; } }); if (l) out.push(l); return out; };

    pg.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: hex(COL.laton) });
    try { const logo = await doc.embedPng(await svgAPng(`${base}../logo/emtecsa-logo.svg`, 900)); const h = 30, w = logo.width * h / logo.height; pg.drawImage(logo, { x: M, y: H - 70, width: w, height: h }); } catch (e) { txt(emp.nombre || "EMTECSA", M, H - 62, { f: F.x, s: 18, c: COL.marino }); }
    txt("CONSTANCIA DE APROBACIÓN", W - M, H - 52, { f: F.b, s: 8.5, c: COL.latonT, der: true });
    txt(d.numero, W - M, H - 68, { f: F.s, s: 10, c: COL.gris, der: true });

    txt("Propuesta aprobada", M, H - 132, { f: F.x, s: 28, c: COL.marino });
    const frase = `${ap.nombre}${ap.puesto ? ", " + ap.puesto + "," : ""} aprobó con su firma la propuesta ${d.numero} de ${emp.nombre || "EMTECSA"}${d.titulo ? " para " + d.titulo : ""}${ap.eleccion_txt ? " (" + ap.eleccion_txt + ")" : ""}, por ${Q(ap.total != null ? ap.total : d.tot.total)}${d.tot && d.tot.con_iva ? " con IVA" : ""}.`;
    let y = H - 162;
    partir(frase, F.r, 11.5, W - 2 * M).forEach(l => { txt(l, M, y, { s: 11.5, c: COL.texto }); y -= 17; });

    y -= 14;
    const filas = [
      ["Propuesta", `${d.numero} · enviada el ${fechaTxt(d.fecha)}`],
      ["Trabajo", d.titulo || "—"],
      ["Cliente", d.cliente ? (d.cliente.razon_social || d.cliente.nombre) : "—"],
      ...(d.sitio ? [["Sitio", d.sitio.nombre + (d.sitio.lugar ? " · " + d.sitio.lugar : "")]] : []),
      ...(ap.eleccion_txt ? [["Escogió", ap.eleccion_txt]] : []),
      ["Total aprobado", `${Q(ap.total != null ? ap.total : d.tot.total)}${d.tot && d.tot.con_iva ? " con IVA" : ""}`],
      ["Aprobada el", fechaHora(ap.fecha)],
      ["Nombre", ap.nombre],
      ...(ap.puesto ? [["Puesto", ap.puesto]] : []),
      ["Forma", "Firma en el enlace de la propuesta"]
    ];
    const alto = filas.reduce((a, [, v]) => a + Math.max(1, partir(v, F.s, 10.5, W - 2 * M - 150).length) * 14 + 12, 0) + 8;
    pg.drawRectangle({ x: M, y: y - alto, width: W - 2 * M, height: alto, color: hex(COL.fondo), borderColor: hex(COL.linea), borderWidth: 0.6 });
    let yy = y - 22;
    filas.forEach(([k, v], i) => {
      txt(k, M + 16, yy, { f: F.r, s: 9.5, c: COL.gris });
      const ls = partir(v, F.s, 10.5, W - 2 * M - 150);
      ls.forEach((l, j) => txt(l, M + 134, yy - j * 14, { f: k === "Total aprobado" ? F.b : F.s, s: 10.5 }));
      yy -= Math.max(1, ls.length) * 14 + 12;
      if (i < filas.length - 1) pg.drawLine({ start: { x: M + 16, y: yy + 17 }, end: { x: W - M - 16, y: yy + 17 }, thickness: 0.4, color: hex(COL.linea) });
    });
    y -= alto + 36;

    txt("Firma", M, y, { f: F.b, s: 9, c: COL.latonT });
    y -= 12;
    const caja = { w: 260, h: 110 };
    try {
      const png = await doc.embedPng(ap.firma);
      const e = Math.min((caja.w - 20) / png.width, (caja.h - 16) / png.height);
      pg.drawImage(png, { x: M + (caja.w - png.width * e) / 2, y: y - caja.h + (caja.h - png.height * e) / 2, width: png.width * e, height: png.height * e });
    } catch (e) {}
    pg.drawLine({ start: { x: M, y: y - caja.h - 4 }, end: { x: M + caja.w, y: y - caja.h - 4 }, thickness: 0.8, color: hex(COL.texto) });
    txt(ap.nombre, M, y - caja.h - 20, { f: F.b, s: 10.5 });
    if (ap.puesto) txt(ap.puesto, M, y - caja.h - 34, { s: 9.5, c: COL.gris });

    const ref = await referencia(d, ap);
    pg.drawLine({ start: { x: M, y: 74 }, end: { x: W - M, y: 74 }, thickness: 0.5, color: hex(COL.linea) });
    txt(`Referencia ${ref}`, M, 56, { f: F.s, s: 8.5, c: COL.gris });
    txt([emp.razon_social || emp.nombre, emp.nit ? "NIT " + emp.nit : "", emp.telefono].filter(Boolean).join(" · "), W - M, 56, { s: 8.5, c: COL.gris, der: true });
    txt("Esta constancia acompaña la propuesta enviada al cliente y registra su aprobación desde el enlace.", M, 42, { s: 8, c: COL.gris });
    return doc.save();
  }
  const nombreArchivo = d => `Constancia ${d.numero}${d.cliente ? " - " + String(d.cliente.nombre).replace(/[\\/:*?"<>|]/g, "") : ""}.pdf`;
  return { armar, nombreArchivo, referencia };
})();
