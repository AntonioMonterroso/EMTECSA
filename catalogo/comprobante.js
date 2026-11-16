"use strict";
(function () {
  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
  const PDFW = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  const cargados = {};
  function script(src) {
    if (!cargados[src]) cargados[src] = new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = ok; s.onerror = () => mal(new Error("No se pudo cargar el lector"));
      document.head.appendChild(s);
    });
    return cargados[src];
  }

  async function pdfAImagen(archivo) {
    await script(PDFJS);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFW;
    const doc = await window.pdfjsLib.getDocument({ data: await archivo.arrayBuffer() }).promise;
    const pag = await doc.getPage(1);
    const vp = pag.getViewport({ scale: 2.2 });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    await pag.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    return new Promise(r => c.toBlob(r, "image/png"));
  }

  let trabajador = null, avance = null;
  async function lector() {
    await script(TESS);
    if (!trabajador) {
      trabajador = window.Tesseract.createWorker("spa", 1, {
        logger: m => { if (m.status === "recognizing text" && avance) avance(m.progress); }
      });
    }
    return trabajador;
  }

  const BANCOS = [
    [/banrural|desarrollo\s+rural/i, "Banrural"],
    [/banco\s+industrial|bi\s*en\s*l[ií]nea|\bzigi\b|\bbi\b/i, "Banco Industrial"],
    [/g\s*&\s*t|continental/i, "G&T Continental"],
    [/\bbam\b|agromercantil|banco\s+am[eé]rica\s+central/i, "BAM"],
    [/promerica/i, "Promerica"],
    [/bantrab|banco\s+de\s+los\s+trabajadores/i, "Bantrab"],
    [/inmobiliario/i, "Banco Inmobiliario"],
    [/ficohsa/i, "Ficohsa"],
    [/azteca/i, "Banco Azteca"],
    [/vivibanco/i, "Vivibanco"],
    [/cr[eé]dito\s+hipotecario|\bchn\b/i, "CHN"],
    [/banco\s+de\s+antigua/i, "Banco de Antigua"],
    [/cuscatl[aá]n/i, "Cuscatlán"],
    [/interbanco|banco\s+internacional/i, "Interbanco"]
  ];
  const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };

  function numero(s) {
    const t = s.replace(/\s/g, "");
    if (/,\d{2}$/.test(t) && !/\.\d{2}$/.test(t)) return parseFloat(t.replace(/\./g, "").replace(",", "."));
    return parseFloat(t.replace(/,/g, ""));
  }

  function interpretar(texto, esperado) {
    const t = texto.replace(/[|]/g, " ").replace(/[ \t]+/g, " ");
    const r = { texto: t, banco: null, monto: null, fecha: null, referencia: null, cuenta: null, pedido: null };
    for (const [re, n] of BANCOS) if (re.test(t)) { r.banco = n; break; }

    const montos = [];
    const reM = /(?:Q|GTQ)\s*\.?\s*([0-9]{1,3}(?:[,. ][0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})/gi;
    let m;
    while ((m = reM.exec(t))) {
      const v = numero(m[1]);
      const antes = t.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
      montos.push({ v, clave: /monto|total|importe|valor|cantidad|transferid|debitad|pagad/.test(antes) });
    }
    if (!montos.length) {
      const reN = /(?:monto|total|importe|valor)[^\d]{0,20}([0-9]{1,3}(?:[,. ][0-9]{3})*[.,][0-9]{2})/gi;
      while ((m = reN.exec(t))) montos.push({ v: numero(m[1]), clave: true });
    }
    if (montos.length) {
      const igual = esperado != null && montos.find(x => Math.abs(x.v - esperado) < 0.01);
      r.monto = (igual || montos.find(x => x.clave) || montos.reduce((a, b) => (b.v > a.v ? b : a))).v;
    }

    let f = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
    if (f) {
      const a = f[3].length === 2 ? "20" + f[3] : f[3];
      r.fecha = `${f[1].padStart(2, "0")}/${f[2].padStart(2, "0")}/${a}`;
    } else if ((f = t.match(/\b(\d{1,2})\s*(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?\s*(?:de\s+|del\s+)?(\d{4})/i))) {
      r.fecha = `${f[1].padStart(2, "0")}/${String(MESES[f[2].toLowerCase().slice(0, 3)]).padStart(2, "0")}/${f[3]}`;
    }

    const ref = t.match(/(?:referencia|no\.?\s*de\s*(?:transacci[oó]n|autorizaci[oó]n|boleta|operaci[oó]n|documento)|autorizaci[oó]n|n[uú]mero\s+de\s+(?:transacci[oó]n|operaci[oó]n)|boleta|transacci[oó]n|operaci[oó]n|comprobante)\s*(?:no\.?|#|:)?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-]{4,})/i);
    if (ref) r.referencia = ref[1];
    const cta = t.match(/(?:cuenta|cta\.?)\s*(?:destino|acreditada|de\s+destino|a\s+acreditar)?[^\d]{0,25}([\d][\d\- ]{5,}\d)/i);
    if (cta) r.cuenta = cta[1].replace(/\s/g, "");
    const ped = t.match(/PED\s*-?\s*(\d{3,5})/i);
    if (ped) r.pedido = "PED-" + ped[1].padStart(4, "0");
    return r;
  }

  async function leer(archivo, esperado, alAvanzar) {
    let img = archivo;
    if (archivo.type === "application/pdf" || /\.pdf$/i.test(archivo.name)) img = await pdfAImagen(archivo);
    avance = alAvanzar;
    const w = await lector();
    const { data } = await w.recognize(img);
    return interpretar(data.text || "", esperado);
  }

  window.EMT_OCR = { leer, interpretar, pdfAImagen };
})();
