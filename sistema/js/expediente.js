"use strict";
window.EMT_EXPEDIENTE = (() => {
  const D = window.EMT_DATOS;
  const PARTES = [["propuesta", "Propuesta técnica y económica"], ["plano", "Plano"], ["fichas", "Fichas técnicas"], ["fijos", "Documentos de la empresa"], ["anexos", "Otros documentos"]];
  const LW = 612, LH = 792;
  const COL = { noche: "#07111F", marino: "#102440", laton: "#C8A96A", texto: "#0E1D33", gris: "#4F5B69", linea: "#D5DBE2", claro: "#D7DFEA" };

  const config = c => {
    const e = c.expediente || {};
    return { partes: { propuesta: true, plano: true, fichas: true, fijos: true, anexos: true, ...(e.partes || {}) }, fijos: { ...(e.fijos || {}) }, anexos: (e.anexos || []).slice() };
  };

  async function piezas(c, k) {
    const cf = config(c);
    const [fichas, fijos, plano] = await Promise.all([D.fichas(), D.docsFijos(), D.plano("cot", c.id).catch(() => null)]);
    const vistos = new Set();
    const conFicha = [], sinFicha = [];
    k.materiales.forEach(m => { const f = fichas[m.material.id]; if (f) { if (!vistos.has(f.ref)) { vistos.add(f.ref); conFicha.push({ nombre: m.material.descripcion, ref: f.ref, tipo: f.tipo }); } } else sinFicha.push(m.material); });
    const hayPlano = !!(plano && plano.datos && (plano.datos.elementos || []).length);
    const fijosSel = fijos.filter(x => cf.fijos[x.id] != null ? cf.fijos[x.id] : x.siempre);
    return {
      cf, fijos, plano: hayPlano ? plano : null, sinFicha, conFicha,
      partes: [
        { k: "propuesta", t: PARTES[0][1], on: cf.partes.propuesta, docs: [{ nombre: `Propuesta ${c.numero}`, origen: "propuesta" }] },
        { k: "plano", t: PARTES[1][1], on: cf.partes.plano && hayPlano, docs: hayPlano ? [{ nombre: "Plano tabloide con simbología y machote", origen: "plano" }] : [] },
        { k: "fichas", t: PARTES[2][1], on: cf.partes.fichas && conFicha.length > 0, docs: conFicha },
        { k: "fijos", t: PARTES[3][1], on: cf.partes.fijos && fijosSel.length > 0, docs: fijosSel.map(x => ({ nombre: x.nombre, ref: x.ref, tipo: x.tipo })) },
        { k: "anexos", t: PARTES[4][1], on: cf.partes.anexos && cf.anexos.length > 0, docs: cf.anexos }
      ]
    };
  }

  async function armar({ c, k, cli, emp, contacto, sitio }) {
    const fuentes = await window.EMT_PDF.base.preparar();
    const { PDFDocument, rgb } = window.PDFLib;
    const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    const { partir } = window.EMT_PDF.base;
    const pz = await piezas(c, k);
    const activas = pz.partes.filter(p => p.on && p.docs.length);
    if (!activas.length) throw new Error("Escoja al menos una parte para el expediente.");
    const out = await PDFDocument.create();
    out.registerFontkit(window.fontkit);
    out.setTitle(`Expediente ${c.numero}${cli ? " · " + cli.nombre : ""}`); out.setAuthor(emp.nombre || "EMTECSA"); out.setCreator("Sistema EMTECSA");
    const F = { r: await out.embedFont(fuentes[0], { subset: true }), s: await out.embedFont(fuentes[1], { subset: true }), b: await out.embedFont(fuentes[2], { subset: true }), x: await out.embedFont(fuentes[3], { subset: true }) };
    const txt = (pg, t, x, y, { f = F.r, s = 10, c: col = COL.texto, der = false } = {}) => { const tt = String(t == null ? "" : t); pg.drawText(tt, { x: der ? x - f.widthOfTextAtSize(tt, s) : x, y, size: s, font: f, color: hex(col) }); };

    const fuentesDoc = [];
    for (const p of activas) {
      const lista = [];
      for (const d of p.docs) {
        try {
          if (d.origen === "propuesta") { const b = await window.EMT_PDF.generar({ c, k, cli, emp, contacto, sitio }); lista.push({ ...d, pdf: await PDFDocument.load(b) }); continue; }
          if (d.origen === "plano") { const b = await window.EMT_PLANOS.planoBytes(pz.plano.datos, window.EMT_PLANOS.machoteInicial(pz.plano.machote || {}), `Plano ${c.numero}`); lista.push({ ...d, pdf: await PDFDocument.load(b) }); continue; }
          const blob = await D.archivo(d.ref);
          if (!blob) { lista.push({ ...d, falla: "No se encontró el archivo." }); continue; }
          const bytes = await blob.arrayBuffer();
          if ((d.tipo || blob.type) === "application/pdf") lista.push({ ...d, pdf: await PDFDocument.load(bytes, { ignoreEncryption: true }) });
          else lista.push({ ...d, img: bytes, tipo: d.tipo || blob.type });
        } catch (e) { lista.push({ ...d, falla: "El archivo está dañado o protegido y no se pudo unir." }); }
      }
      fuentesDoc.push({ ...p, lista });
    }

    const nPag = d => d.pdf ? d.pdf.getPageCount() : 1;
    const conProp = fuentesDoc[0].k === "propuesta" && fuentesDoc[0].lista[0] && fuentesDoc[0].lista[0].pdf;
    let pag = 3;
    const indice = [];
    fuentesDoc.forEach((p, i) => {
      if (p.k === "propuesta" && conProp) { indice.push({ t: p.t, pag: 1, docs: [] }); pag += nPag(p.lista[0]) - 1; return; }
      const ent = { t: p.t, pag, docs: [] }; pag += 1;
      p.lista.forEach(d => { ent.docs.push({ t: d.nombre, pag }); pag += nPag(d); });
      indice.push(ent);
    });
    const total = pag - 1;

    if (conProp) { const [pg] = await out.copyPages(fuentesDoc[0].lista[0].pdf, [0]); out.addPage(pg); }
    else {
      const pg = out.addPage([LW, LH]);
      pg.drawRectangle({ x: 0, y: 0, width: LW, height: LH, color: hex(COL.noche) });
      txt(pg, "EXPEDIENTE", 56, 520, { f: F.b, s: 11, c: COL.laton });
      partir(c.titulo || "Propuesta", F.x, 34, LW - 112).slice(0, 3).forEach((l, i) => txt(pg, l, 56, 480 - i * 40, { f: F.x, s: 34, c: "#FFFFFF" }));
      txt(pg, `${c.numero}${cli ? " · " + cli.nombre : ""}`, 56, 340, { f: F.s, s: 13, c: COL.claro });
    }

    const pi = out.addPage([LW, LH]);
    pi.drawRectangle({ x: 0, y: LH - 6, width: LW, height: 6, color: hex(COL.laton) });
    txt(pi, "EXPEDIENTE " + c.numero, 56, LH - 70, { f: F.b, s: 9, c: COL.laton });
    txt(pi, "Contenido", 56, LH - 108, { f: F.x, s: 30, c: COL.marino });
    if (cli) txt(pi, cli.razon_social || cli.nombre, 56, LH - 130, { f: F.s, s: 11, c: COL.gris });
    let y = LH - 180;
    const lineaPuntos = (pg, x1, x2, yy) => { for (let x = x1; x < x2; x += 4) pg.drawCircle({ x, y: yy + 3, size: 0.5, color: hex("#9AA5B1") }); };
    indice.forEach((e, i) => {
      if (y < 90) return;
      const num = String(i + 1).padStart(2, "0");
      txt(pi, num, 56, y, { f: F.x, s: 13, c: COL.laton });
      txt(pi, e.t, 86, y, { f: F.b, s: 13, c: COL.texto });
      const w = F.b.widthOfTextAtSize(e.t, 13);
      lineaPuntos(pi, 86 + w + 8, LW - 80, y);
      txt(pi, String(e.pag), LW - 56, y, { f: F.b, s: 13, der: true });
      y -= 22;
      e.docs.forEach(dd => {
        if (y < 90) return;
        const t1 = partir(dd.t, F.r, 10.5, LW - 200)[0];
        txt(pi, t1, 100, y, { s: 10.5, c: COL.gris });
        lineaPuntos(pi, 100 + F.r.widthOfTextAtSize(t1, 10.5) + 8, LW - 80, y);
        txt(pi, String(dd.pag), LW - 56, y, { s: 10.5, c: COL.gris, der: true });
        y -= 17;
      });
      y -= 12;
    });

    for (const [i, p] of fuentesDoc.entries()) {
      if (p.k === "propuesta" && conProp) {
        const n = p.lista[0].pdf.getPageCount();
        if (n > 1) { const pgs = await out.copyPages(p.lista[0].pdf, [...Array(n - 1).keys()].map(x => x + 1)); pgs.forEach(x => out.addPage(x)); }
        continue;
      }
      const sp = out.addPage([LW, LH]);
      sp.drawRectangle({ x: 0, y: LH - 300, width: LW, height: 300, color: hex(COL.noche) });
      sp.drawRectangle({ x: 0, y: LH - 303, width: LW, height: 3, color: hex(COL.laton) });
      txt(sp, String(i + 1).padStart(2, "0"), 56, LH - 120, { f: F.x, s: 54, c: COL.laton });
      partir(p.t, F.x, 30, LW - 112).slice(0, 2).forEach((l, j) => txt(sp, l, 56, LH - 190 - j * 36, { f: F.x, s: 30, c: "#FFFFFF" }));
      txt(sp, `Expediente ${c.numero}`, 56, LH - 270, { f: F.s, s: 11, c: COL.claro });
      let yy = LH - 360;
      p.lista.forEach(d => { if (yy < 80) return; partir(d.nombre, F.s, 12, LW - 140).slice(0, 2).forEach((l, j) => txt(sp, (j ? "   " : "•  ") + l, 56, yy - j * 16, { f: F.s, s: 12 })); yy -= 26; });
      for (const d of p.lista) {
        if (d.pdf) { const pgs = await out.copyPages(d.pdf, d.pdf.getPageIndices()); pgs.forEach(x => out.addPage(x)); continue; }
        const pg = out.addPage([LW, LH]);
        if (d.falla) { txt(pg, d.nombre, 56, LH - 100, { f: F.b, s: 14 }); partir(d.falla, F.r, 11, LW - 112).forEach((l, j) => txt(pg, l, 56, LH - 126 - j * 16, { s: 11, c: COL.gris })); continue; }
        const im = /png/.test(d.tipo) ? await out.embedPng(d.img) : await out.embedJpg(d.img);
        const m = 36, esc = Math.min((LW - 2 * m) / im.width, (LH - 2 * m) / im.height);
        pg.drawImage(im, { x: (LW - im.width * esc) / 2, y: (LH - im.height * esc) / 2, width: im.width * esc, height: im.height * esc });
      }
    }

    const etiqueta = `${c.numero} · Expediente`;
    out.getPages().forEach((pg, i) => {
      if (i === 0) return;
      const { width, height } = pg.getSize();
      const t = `${etiqueta} · ${i + 1} de ${out.getPageCount()}`;
      const w = F.s.widthOfTextAtSize(t, 7) + 14;
      pg.drawRectangle({ x: width - w - 16, y: height - 22, width: w, height: 13, color: hex("#FFFFFF"), opacity: 0.92, borderColor: hex(COL.linea), borderWidth: 0.4 });
      txt(pg, t, width - 23, height - 18, { f: F.s, s: 7, c: COL.gris, der: true });
    });
    return out.save();
  }

  const nombreArchivo = (c, cli) => `Expediente ${c.numero}${cli ? " - " + cli.nombre.replace(/[\\/:*?"<>|]/g, "") : ""}.pdf`;
  return { PARTES, config, piezas, armar, nombreArchivo };
})();
