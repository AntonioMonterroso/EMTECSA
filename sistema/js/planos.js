"use strict";
window.EMT_PLANOS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const S = window.EMT_SIMB;
  const W = 1224, H = 792;
  const FUENTE = "Arial, Helvetica, sans-serif";
  const LINEAS_PALETA = [["mt3f", "3F media tensión"], ["mt2f", "2F media tensión"], ["mt1f", "1F media tensión"], ["bt", "Baja tensión"], ["triplex", "Triplex No. 2"], ["at69", "Alta tensión 69 kV"], ["cerco", "Cerco o lindero"], ["zanjon", "Zanjón o quebrada"], ["camino", "Camino"]];
  const HERR = [["mover", "Mover", "map"], ["simbolo", "Símbolo", "plus"], ["linea", "Línea", "cable"], ["texto", "Texto", "pen"]];
  const MES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  let est = { herr: "mover", simbolo: "poste9_pr", linea: { t: "mt1f", e: "proyectado" }, sel: null, desde: null };
  const x2 = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n2 = n => (Math.round(n * 100) / 100).toFixed(2);

  const ref = d => d.ref || null;
  function pos(d, e) { const r = ref(d); if (e.utm && e.utm.e != null && e.utm.n != null && r) return [Number(e.utm.e) - r.e, r.n - Number(e.utm.n)]; return [e.x, e.y]; }
  const porId = d => Object.fromEntries(d.elementos.map(e => [e.id, e]));
  const metros = (d, l, m) => { const a = m[l.a], b = m[l.b]; if (!a || !b) return 0; const [ax, ay] = pos(d, a), [bx, by] = pos(d, b); return Math.hypot(bx - ax, by - ay); };
  const colorEl = e => { const p = S.P[e.s]; return p && p.e === "proyectado" ? S.ROJO : S.NEGRO; };

  function lineasEtiqueta(e) {
    const l = [];
    if (e.cod) l.push([e.cod, colorEl(e)]);
    String(e.det || "").split("\n").map(t => t.trim()).filter(Boolean).forEach(t => l.push([t, colorEl(e)]));
    if (e.verUtm && e.utm && e.utm.e != null) { l.push([`${e.utm.z || "15 P"} ${String(e.utm.e).padStart(7, "0")}`, S.NEGRO]); l.push([`UTM ${e.utm.n}`, S.NEGRO]); }
    return l;
  }

  function dibujo(d, op = {}) {
    const k = d.k || 0.25, m = porId(d), fs = 7 * k;
    let s = "";
    d.lineas.forEach(l => {
      const a = m[l.a], b = m[l.b]; if (!a || !b) return;
      const [ax, ay] = pos(d, a), [bx, by] = pos(d, b);
      s += `<g data-ln="${l.id}" class="${op.sel === "l" + l.id ? "sel" : ""}"><g transform="scale(${k})">${S.trazo(l.t, l.e, ax / k, ay / k, bx / k, by / k, op.sel === "l" + l.id ? 2.6 : 1.3)}</g>`;
      if (op.editor) s += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="transparent" stroke-width="${8 * k}"/>`;
      if (l.verM !== false && S.L[l.t] && !S.L[l.t].color) {
        const txt = l.m ? l.m : n2(Math.hypot(bx - ax, by - ay));
        const mx = (ax + bx) / 2, my = (ay + by) / 2, ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI, rot = ang > 90 || ang < -90 ? ang + 180 : ang;
        s += `<text x="${mx}" y="${my - 2.2 * k}" font-size="${fs * 1.35}" font-family="${FUENTE}" fill="${S.colorLinea(l.t, l.e)}" text-anchor="middle" transform="rotate(${rot.toFixed(1)} ${mx} ${my})">${x2(txt)}</text>`;
      }
      s += "</g>";
    });
    d.elementos.forEach(e => {
      const [x, y] = pos(d, e);
      const sel = op.sel === "e" + e.id, desde = op.desde === e.id;
      if (e.s === "punto") { if (op.editor) s += `<g data-el="${e.id}"><circle cx="${x}" cy="${y}" r="${(sel || desde ? 3 : 2) * k}" fill="${sel || desde ? "#2F6FED" : "#8F98A3"}"/><circle cx="${x}" cy="${y}" r="${8 * k}" fill="transparent"/></g>`; return; }
      const p = S.P[e.s]; if (!p) return;
      s += `<g data-el="${e.id}" class="${sel ? "sel" : ""}">${sel || desde ? `<circle cx="${x}" cy="${y}" r="${13 * k}" fill="${desde ? "rgba(47,111,237,.18)" : "rgba(200,169,106,.25)"}"/>` : ""}<g transform="translate(${x} ${y}) rotate(${e.rot || 0}) scale(${k})">${p.svg()}</g>${op.editor ? `<circle cx="${x}" cy="${y}" r="${12 * k}" fill="transparent"/>` : ""}</g>`;
      const et = lineasEtiqueta(e);
      if (et.length) {
        const dx = e.eti ? e.eti.dx : 16 * k, dy = e.eti ? e.eti.dy : -16 * k;
        const lx = x + dx, ly = y + dy, alto = fs * 1.25;
        const ancho = Math.max(...et.map(([t]) => t.length)) * fs * 0.6;
        const der = dx < 0;
        const tx = der ? lx - ancho : lx;
        s += `<g data-eti="${e.id}"><line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="${S.NEGRO}" stroke-width="${0.5 * k}"/><line x1="${tx}" y1="${ly}" x2="${tx + ancho}" y2="${ly}" stroke="${S.NEGRO}" stroke-width="${0.5 * k}"/>`;
        et.forEach(([t, c], i) => { s += `<text x="${der ? lx : tx + ancho}" y="${ly + (i + 1) * alto}" font-size="${fs}" font-family="${FUENTE}" fill="${c}" text-anchor="end">${x2(t)}</text>`; });
        if (op.editor) s += `<rect x="${tx}" y="${ly}" width="${ancho}" height="${alto * et.length + fs * 0.4}" fill="transparent"/>`;
        s += "</g>";
      }
      if (e.num) s += `<g><circle cx="${x + 9 * k}" cy="${y + 14 * k}" r="${5 * k}" fill="none" stroke="${S.NEGRO}" stroke-width="${0.6 * k}"/><text x="${x + 9 * k}" y="${y + 16.4 * k}" font-size="${fs}" font-family="${FUENTE}" text-anchor="middle" fill="${S.NEGRO}">${x2(e.num)}</text></g>`;
    });
    d.textos.forEach(t => {
      const f = fs * (t.tam || 1);
      s += `<g data-tx="${t.id}" class="${op.sel === "t" + t.id ? "sel" : ""}">`;
      String(t.txt || "").split("\n").forEach((ln, i) => { s += `<text x="${t.x}" y="${t.y + i * f * 1.2}" font-size="${f}" font-family="${FUENTE}" fill="${t.c === "r" ? S.ROJO : S.NEGRO}">${x2(ln)}</text>`; });
      if (op.editor) s += `<rect x="${t.x}" y="${t.y - f}" width="${Math.max(4, String(t.txt || "").split("\n").reduce((a, z) => Math.max(a, z.length), 0) * f * 0.6)}" height="${String(t.txt || "").split("\n").length * f * 1.2}" fill="transparent"/>`;
      s += "</g>";
    });
    return s;
  }

  function limites(d) {
    const k = d.k || 0.25, pts = [];
    d.elementos.forEach(e => { const [x, y] = pos(d, e); pts.push([x - 14 * k, y - 14 * k], [x + 14 * k, y + 14 * k]); const et = lineasEtiqueta(e); if (et.length) { const dx = e.eti ? e.eti.dx : 16 * k, dy = e.eti ? e.eti.dy : -16 * k, ancho = Math.max(...et.map(([t]) => t.length)) * 7 * k * 0.6; pts.push([x + dx + (dx < 0 ? -ancho : ancho), y + dy + et.length * 7 * k * 1.25 + 2 * k]); } });
    d.textos.forEach(t => pts.push([t.x, t.y - 7 * k], [t.x + String(t.txt || "").length * 7 * k * 0.6 * (t.tam || 1), t.y + 7 * k]));
    if (!pts.length) return { x: -50, y: -35, w: 100, h: 70 };
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(10, Math.max(...xs) - x0), h = Math.max(8, Math.max(...ys) - y0);
    return { x: x0 - w * 0.12, y: y0 - h * 0.12, w: w * 1.24, h: h * 1.24 };
  }

  const coordTrafo = d => {
    const u = e => e.utm && e.utm.e != null && e.utm.n != null ? e.utm : null;
    const t = d.elementos.find(e => e.s === "trafo_pr" && u(e)) || d.elementos.find(e => /^trafo/.test(e.s) && u(e)) || d.elementos.find(e => e.s === "trafo_pr") || d.elementos.find(e => /^trafo/.test(e.s));
    if (!t) return ["", ""];
    let x = u(t);
    if (!x) { const [tx, ty] = pos(d, t); const c = d.elementos.filter(e => /^poste/.test(e.s) && u(e)).map(e => [e, Math.hypot(pos(d, e)[0] - tx, pos(d, e)[1] - ty)]).sort((a2, b2) => a2[1] - b2[1])[0]; if (c && c[1] < 8) x = u(c[0]); }
    return x ? [`${x.z || "15 P"} ${String(x.e).padStart(7, "0")}`, `UTM ${x.n}`] : ["", ""];
  };

  function machoteSVG(mc, d, logos) {
    const t = (x, y, s, v, o = {}) => `<text x="${x}" y="${y}" font-size="${o.f || 5.6}" font-family="${FUENTE}" ${o.b ? 'font-weight="700"' : ""} ${o.m ? 'text-anchor="middle"' : ""} fill="${o.c || "#111"}">${x2(String(v == null ? "" : v))}</text>`;
    const r = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#111" stroke-width="0.6"/>`;
    const l = (a, b, c, e) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}" stroke="#111" stroke-width="0.5"/>`;
    const Y = 654, Hm = 124;
    let s = `<g data-machote="1">${r(14, Y, W - 28, Hm)}`;
    s += r(14, Y, 236, Hm) + t(132, Y + 13, "", (mc.proyecto || "").toUpperCase(), { f: 7.6, m: true }) + l(14, Y + 18, 250, Y + 18);
    [["Nombre del solicitante:", mc.solicitante], ["Dirección del proyecto:", mc.direccion], ["Servicio solicitado:", mc.servicio], ["Obra SGT:", mc.obra_sgt], ["Exped. SGC:", mc.exped_sgc]].forEach(([a, v], i) => { const yy = Y + 18 + i * 21.2; s += (i ? l(14, yy, 250, yy) : "") + t(17, yy + 13, "", a, { f: 5.6 }) + t(92, yy + 13, "", (v || "").toUpperCase(), { f: 6.2 }); });
    s += r(250, Y, 140, Hm) + t(320, Y + 13, "", "UBICACIÓN DE DISEÑO", { f: 7, m: true }) + l(250, Y + 18, 390, Y + 18) + l(310, Y + 18, 310, Y + Hm);
    [["COMUNIDAD", mc.comunidad], ["ALDEA", mc.aldea], ["MUNICIPIO", mc.municipio], ["DEPARTAMENTO", mc.departamento]].forEach(([a, v], i) => { const yy = Y + 18 + i * 26.5; s += (i ? l(250, yy, 390, yy) : "") + t(253, yy + 15, "", a, { f: 5.4 }) + t(313, yy + 15, "", (v || "").toUpperCase(), { f: 5.6 }); });
    s += r(390, Y, 170, Hm);
    if (logos && logos.dist) s += `<image href="${logos.dist}" x="396" y="${Y + 8}" width="158" height="${Hm - 16}" preserveAspectRatio="xMidYMid meet"/>`;
    else s += t(475, Y + 66, "", (D.DISTRIBUIDORAS[mc.distribuidora] || {}).n || "", { f: 14, b: true, m: true, c: "#1F4E8C" });
    s += r(560, Y, 14, Hm) + `<text x="569" y="${Y + Hm / 2}" font-size="5.4" font-family="${FUENTE}" text-anchor="middle" transform="rotate(-90 569 ${Y + Hm / 2})">MODIFICACIONES</text>`;
    s += r(574, Y, 216, Hm);
    const cols = [574, 592, 622, 712, 738, 764, 790], rh = Hm / 6;
    for (let i = 1; i < 6; i++) s += l(574, Y + i * rh, 790, Y + i * rh);
    cols.slice(1, -1).forEach(x => { s += l(x, Y, x, Y + Hm); });
    ["N°", "FECHA", "DESCRIPCIÓN", "DISEÑO", "REVISÓ", "APROBÓ"].forEach((h, i) => { s += t((cols[i] + cols[i + 1]) / 2, Y + Hm - 6, "", h, { f: 4.6, m: true }); });
    (mc.mods || []).slice(0, 5).forEach((m, i) => { const yy = Y + (4 - i) * rh + rh - 6; [m.n, m.fecha, m.desc, m.diseno, m.reviso, m.aprobo].forEach((v, j) => { s += t((cols[j] + cols[j + 1]) / 2, yy, "", (v || "").toUpperCase(), { f: 4.8, m: true }); }); });
    s += r(790, Y, 170, Hm) + l(875, Y, 875, Y + Hm);
    [["SOLICITÓ:", mc.solicito, "SUPERVISÓ:", mc.superviso], ["LEVANTÓ:", mc.levanto, "VERIFICÓ:", mc.verifico], ["DIBUJÓ:", mc.dibujo, "JEFE PROY.:", mc.jefe], ["", "", "APROBÓ:", mc.aprobo]].forEach(([a, v, b, w2], i) => { const yy = Y + i * (Hm / 4); s += (i ? l(790, yy, 960, yy) : "") + t(793, yy + 7, "", a, { f: 4.8 }) + t(832, yy + 21, "", (v || "").toUpperCase(), { f: 6.4, m: true }) + t(878, yy + 7, "", b, { f: 4.8 }) + t(917, yy + 21, "", (w2 || "").toUpperCase(), { f: 6.4, m: true }); });
    s += r(960, Y, 120, Hm);
    if (logos && logos.emp) s += `<image href="${logos.emp}" x="968" y="${Y + 36}" width="104" height="52" preserveAspectRatio="xMidYMid meet"/>`;
    s += r(1080, Y, W - 14 - 1080, Hm);
    const [c1, c2] = coordTrafo(d);
    const fil = [["TENSIÓN DE PROYECTO:", mc.tension], ["COORDENADAS UTM TRANSFORMADOR", ""], ["FECHA:", mc.fecha], ["ESCALA:", mc.escala], ["FORMATO:", mc.formato]];
    fil.forEach(([a, v], i) => { const yy = Y + i * (Hm / 5); s += (i ? l(1080, yy, W - 14, yy) : "") + t(1083, yy + 9, "", a, { f: 4.8 }) + (i === 1 ? t(1090, yy + 19, "", c1, { f: 4.8 }) + t(1150, yy + 19, "", c2, { f: 4.8 }) : t(1135, yy + 19, "", (v || "").toUpperCase(), { f: 5.6 })); if (i === 3) s += t(1160, yy + 9, "", "DIMENSIONES:", { f: 4.8 }) + t(1190, yy + 19, "", (mc.dimensiones || "").toUpperCase(), { f: 5.2 }); });
    return s + "</g>";
  }

  function leyendaSVG() {
    const x = 1004, y = 138, w = 204, filas = S.LEYENDA.length, rh = 9.6, cab = 30;
    let s = `<g data-leyenda="1"><rect x="${x}" y="${y}" width="${w}" height="${cab + filas * rh}" fill="#fff" stroke="#111" stroke-width="0.6"/><text x="${x + w / 2}" y="${y + 13}" font-size="9" font-family="${FUENTE}" text-anchor="middle" text-decoration="underline">SIMBOLOGÍA</text><line x1="${x}" y1="${y + 18}" x2="${x + w}" y2="${y + 18}" stroke="#111" stroke-width="0.5"/><text x="${x + 22}" y="${y + 26}" font-size="4.6" font-family="${FUENTE}" text-anchor="middle">SÍMBOLO</text><text x="${x + 120}" y="${y + 26}" font-size="4.6" font-family="${FUENTE}" text-anchor="middle">DESCRIPCIÓN</text><line x1="${x + 44}" y1="${y + 18}" x2="${x + 44}" y2="${y + cab + filas * rh}" stroke="#111" stroke-width="0.5"/>`;
    S.LEYENDA.forEach((f, i) => { const yy = y + cab + i * rh; s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="#111" stroke-width="0.35"/><g transform="translate(${x + 22} ${yy + rh / 2}) scale(0.34)">${S.muestra(f, 90)}</g><text x="${x + 47}" y="${yy + rh / 2 + 1.7}" font-size="4.5" font-family="${FUENTE}">${x2(S.textoLeyenda(f))}</text>`; });
    return s + "</g>";
  }

  function hojaSVG(d, mc, logos) {
    const zx = 26, zy = 34, zw = 974, zh = 612;
    const b = limites(d);
    const esc = Math.min(zw / b.w, zh / b.h, 12 / (7 * (d.k || 0.25)));
    const ox = zx + (zw - b.w * esc) / 2 - b.x * esc, oy = zy + (zh - b.h * esc) / 2 - b.y * esc;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#111" stroke-width="0.8"/>`;
    for (let i = 0; i <= 13; i++) { const xx = 14 + i * ((W - 28) / 13.4); s += `<text x="${xx + 2}" y="12" font-size="6" font-family="${FUENTE}">${i}</text><line x1="${xx}" y1="10" x2="${xx}" y2="14" stroke="#111" stroke-width="0.5"/>`; }
    "ABCDEFGHIJKLM".split("").forEach((c, i) => { const yy = 34 + i * 48; s += `<text x="5" y="${yy + 4}" font-size="6" font-family="${FUENTE}">${c}</text><line x1="10" y1="${yy}" x2="14" y2="${yy}" stroke="#111" stroke-width="0.5"/>`; });
    s += `<svg x="${zx}" y="${zy}" width="${zw}" height="${zh}" viewBox="${(zx - ox) / esc} ${(zy - oy) / esc} ${zw / esc} ${zh / esc}" overflow="hidden">${dibujo(d)}</svg>`;
    s += `<g transform="translate(1170 72) scale(1.6)">${S.P.norte.svg()}</g>`;
    s += leyendaSVG();
    s += `<g><path d="M48 600 A16 16 0 1 0 48 636" fill="none" stroke="#111" stroke-width="1.6"/><line x1="40" y1="618" x2="235" y2="618" stroke="#111" stroke-width="0.8"/><text x="52" y="614" font-size="15" font-family="${FUENTE}">${x2((mc.titulo || "PLANTA DE DISTRIBUCIÓN").toUpperCase())}</text><text x="60" y="632" font-size="9.5" font-family="${FUENTE}">${x2((mc.subtitulo || "PROYECTADO").toUpperCase())}</text><text x="240" y="626" font-size="4.6" font-family="${FUENTE}">ESCALA ${x2((mc.escala || "INDICADA").toUpperCase())}</text><rect x="240" y="629" width="30" height="2.4" fill="#111"/></g>`;
    s += machoteSVG(mc, d, logos);
    return s + "</svg>";
  }

  async function aDataUrl(url) {
    const r = await fetch(url); if (!r.ok) throw new Error("No se encontró un logo del plano.");
    const b = await r.blob();
    return new Promise((bien, mal) => { const fr = new FileReader(); fr.onload = () => bien(fr.result); fr.onerror = () => mal(new Error("No se pudo leer un logo.")); fr.readAsDataURL(b); });
  }
  async function logosDe(mc) {
    const guard = await D.logosDistribuidoras().catch(() => ({}));
    const dist = D.DISTRIBUIDORAS[mc.distribuidora] || null;
    const out = {};
    try { out.emp = await aDataUrl("../logo/emtecsa-logo.svg"); } catch (e) {}
    if (guard[mc.distribuidora]) out.dist = guard[mc.distribuidora];
    else if (dist && dist.logo) { try { out.dist = await aDataUrl(dist.logo); } catch (e) {} }
    return out;
  }

  async function planoBytes(d, mc, nombre) {
    const svg = hojaSVG(d, mc, await logosDe(mc));
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const f = 2.6, cv = document.createElement("canvas");
    cv.width = W * f; cv.height = H * f;
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    const png = await new Promise(r => cv.toBlob(r, "image/png"));
    await window.EMT_PDF.base.preparar();
    const doc = await window.PDFLib.PDFDocument.create();
    doc.setTitle(nombre); doc.setCreator("Sistema EMTECSA");
    const pg = doc.addPage([W, H]);
    const im = await doc.embedPng(await png.arrayBuffer());
    pg.drawImage(im, { x: 0, y: 0, width: W, height: H });
    return doc.save();
  }
  async function pdf(d, mc, nombre) { window.EMT_PDF.mostrar(await planoBytes(d, mc, nombre), nombre + ".pdf", nombre); }

  function machoteInicial(base) {
    const hoy = new Date();
    return { proyecto: "Proyecto introducción energía eléctrica", titulo: "Planta de distribución", subtitulo: "Proyectado", servicio: "120V", tension: "13.8 kV", fecha: `${MES[hoy.getMonth()]} ${hoy.getFullYear()}`, escala: "Indicada", dimensiones: "Mts.", formato: "1/1", distribuidora: "energuate", levanto: "EMTECSA", mods: [], ...base };
  }

  async function datosBase(tipo, id) {
    if (tipo === "obra") {
      const o = await D.obra(id); if (!o) return null;
      const cli = await D.cliente(o.cliente_id), sitio = cli && cli.sitios.find(s => s.id === o.sitio_id);
      const tr = (o.tramites || []).find(x => x.distribuidora);
      const dist = tr && /eegsa/i.test(tr.distribuidora) ? "eegsa" : tr && /munic/i.test(tr.distribuidora) ? "municipal" : "energuate";
      return { titulo: o.numero + (o.titulo ? " · " + o.titulo : ""), volver: `#/obras/${o.id}/plano`, cot: o.cotizacion_id, base: { solicitante: cli ? (cli.razon_social || cli.nombre) : "", direccion: sitio ? sitio.direccion || sitio.nombre : "", municipio: sitio ? sitio.municipio : "", departamento: sitio ? sitio.departamento : "", distribuidora: dist, solicito: (D.DISTRIBUIDORAS[dist] || {}).n || "", dibujo: A().sesion().perfil.nombre } };
    }
    const c = await D.cotizacion(id); if (!c) return null;
    const cli = await D.cliente(c.cliente_id), sitio = cli && cli.sitios.find(s => s.id === c.sitio_id);
    return { titulo: c.numero + (c.titulo ? " · " + c.titulo : ""), volver: `#/cotizaciones/${c.id}`, base: { solicitante: cli ? (cli.razon_social || cli.nombre) : "", direccion: sitio ? sitio.direccion || sitio.nombre : "", municipio: sitio ? sitio.municipio : "", departamento: sitio ? sitio.departamento : "", solicito: "Energuate", dibujo: A().sesion().perfil.nombre } };
  }

  async function miniatura(tipo, id) {
    const p = await D.plano(tipo, id);
    if (!p || !p.datos || !(p.datos.elementos || []).length) return "";
    return hojaSVG(p.datos, p.machote || {}, null).replace("<svg ", '<svg class="mini-plano" role="img" aria-label="Vista del plano" ');
  }

  async function vista(v, tipoR, idR) {
    const { $, esc, ico, aviso, modal, cerrarCapas } = A();
    const tipo = tipoR === "obra" ? "obra" : "cot", id = Number(idR);
    const info = await datosBase(tipo, id);
    if (!info) { v.innerHTML = `<div class="vacio"><h2>No se encontró</h2><a class="s-btn suave-b" href="#/hoy">Ir a Hoy</a></div>`; return; }
    let p = await D.plano(tipo, id);
    if (!p && tipo === "obra" && info.cot) { await D.copiarPlanoAObra(info.cot, id); p = await D.plano(tipo, id); }
    const d = p && p.datos && p.datos.elementos ? p.datos : D.planoVacio();
    const mc = machoteInicial({ ...info.base, ...((p && p.machote) || {}) });
    const puede = D.puede(A().sesion().perfil, "editarPlano");
    const [catC, cfgC] = tipo === "cot" ? await Promise.all([D.catalogo(), D.ajustesConteo()]) : [null, null];
    est.sel = null; est.desde = null;
    let vb = d.vista || null, guardando = null, buscaS = "";
    v.innerHTML = `
      <div class="cuerpo plano-v">
        <a class="volver" href="${info.volver}">${ico("chev", 16, 2.2)}${esc(info.titulo)}</a>
        <div class="cab-v"><div><h1 class="t">Plano</h1></div><div class="fila-b"><span class="guardado" data-pl-est>Todo guardado</span>${tipo === "cot" ? `<button class="s-btn suave-b" type="button" data-conteo-pl>${ico("layers", 15)}Conteo</button>` : ""}<button class="s-btn suave-b" type="button" data-hoja>${ico("eye", 15)}Ver la hoja</button><button class="e-btn e-btn-salida" type="button" data-pl-pdf>${ico("download", 15)}PDF tabloide</button></div></div>
        ${puede ? `<div class="pl-herr" role="toolbar" aria-label="Herramientas">${HERR.map(([k, n, i]) => `<button type="button" data-herr="${k}" aria-pressed="${est.herr === k}">${ico(i, 16)}<span>${n}</span></button>`).join("")}<span class="esp"></span><button type="button" data-zoom="-1" aria-label="Alejar">−</button><button type="button" data-zoom="1" aria-label="Acercar">+</button><button type="button" data-encajar aria-label="Ver todo">${ico("layers", 16)}</button></div>` : ""}
        <div class="pl-ayuda" data-pl-ayuda></div>
        <div class="pl-lienzo"><svg data-lienzo xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg><div class="pl-norte" aria-hidden="true"><svg viewBox="-20 -20 40 40">${S.P.norte.svg()}</svg></div></div>
        <div data-pl-props></div>
        <details class="caja plegable pl-mach" data-pl="machote" open><summary><span class="pl-t"><h2>Machote</h2><span class="suave">Sale abajo de cada hoja</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div class="mach-vista" data-mach-vista></div><div data-mach-form></div></div></details>
      </div>`;
    const svg = $("[data-lienzo]", v), props = $("[data-pl-props]", v), ayuda = $("[data-pl-ayuda]", v);
    const encajar = () => { const b = limites(d); const r = svg.getBoundingClientRect(); const asp = r.width / Math.max(1, r.height); let w = b.w, h = b.h; if (w / h < asp) w = h * asp; else h = w / asp; vb = { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h }; };
    if (!vb) encajar();
    const marcar = () => {
      const s2 = $("[data-pl-est]", v); s2.textContent = "Guardando…"; s2.className = "guardado sin";
      clearTimeout(guardando);
      guardando = setTimeout(async () => { try { d.vista = vb; await D.guardarPlano(tipo, id, d, mc); s2.textContent = "Todo guardado"; s2.className = "guardado"; } catch (err) { s2.textContent = "No se guardó"; aviso(err.message, "mal"); } }, 700);
      pintarMach();
    };
    A().guardia({ limpio: () => !guardando || $("[data-pl-est]", v).textContent === "Todo guardado" });
    const pintar = () => {
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      const k = d.k || 0.25, paso = vb.w > 400 ? 50 : vb.w > 120 ? 10 : 5;
      let grid = "";
      for (let x = Math.floor(vb.x / paso) * paso; x < vb.x + vb.w; x += paso) grid += `<line x1="${x}" y1="${vb.y}" x2="${x}" y2="${vb.y + vb.h}" stroke="#E6EAEF" stroke-width="${vb.w / 900}"/>`;
      for (let y = Math.floor(vb.y / paso) * paso; y < vb.y + vb.h; y += paso) grid += `<line x1="${vb.x}" y1="${y}" x2="${vb.x + vb.w}" y2="${y}" stroke="#E6EAEF" stroke-width="${vb.w / 900}"/>`;
      svg.innerHTML = `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="#fff"/>${grid}${dibujo(d, { editor: true, sel: est.sel, desde: est.desde })}`;
      const msg = { mover: "Toque un símbolo, una línea o un texto para editarlo. Arrastre para moverlo; arrastre el fondo para recorrer el plano.", simbolo: `Toque el plano para poner: <b>${esc(S.P[est.simbolo].n)}${S.P[est.simbolo].e ? " " + S.P[est.simbolo].e : ""}</b>. <button class="s-link" type="button" data-paleta>Cambiar símbolo</button>`, linea: `${est.desde ? "Ahora toque el poste donde termina" : "Toque el poste donde empieza"} la línea: <b>${esc(S.L[est.linea.t].n)} ${S.L[est.linea.t].color ? "" : est.linea.e}</b>. Tocar el fondo pone un punto de quiebre. <button class="s-link" type="button" data-paleta-l>Cambiar línea</button>`, texto: "Toque el plano donde va el texto." };
      ayuda.innerHTML = puede ? msg[est.herr] : "Vista del plano.";
    };
    const mundo = (cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; const r = pt.matrixTransform(svg.getScreenCTM().inverse()); return [r.x, r.y]; };
    const nuevoId = () => d.sig++;

    const pintarMach = () => { $("[data-mach-vista]", v).innerHTML = `<svg viewBox="12 650 ${W - 24} 130" class="mach-svg" role="img" aria-label="Machote">${machoteSVG(mc, d, { dist: (D.DISTRIBUIDORAS[mc.distribuidora] || {}).logo || null, emp: "../logo/emtecsa-logo.svg" })}</svg>`; };
    const CAMPOS = [["proyecto", "Proyecto"], ["solicitante", "Nombre del solicitante"], ["direccion", "Dirección del proyecto"], ["servicio", "Servicio solicitado"], ["obra_sgt", "Obra SGT"], ["exped_sgc", "Exped. SGC"], ["comunidad", "Comunidad"], ["aldea", "Aldea"], ["departamento", "Departamento"], ["municipio", "Municipio"], ["solicito", "Solicitó"], ["superviso", "Supervisó"], ["levanto", "Levantó"], ["verifico", "Verificó"], ["dibujo", "Dibujó"], ["jefe", "Jefe de proyecto"], ["aprobo", "Aprobó"], ["tension", "Tensión de proyecto"], ["fecha", "Fecha"], ["escala", "Escala"], ["dimensiones", "Dimensiones"], ["formato", "Formato"], ["titulo", "Título del plano"], ["subtitulo", "Subtítulo"]];
    const pintarForm = () => {
      $("[data-mach-form]", v).innerHTML = `<fieldset class="bloq" ${puede ? "" : "disabled"}><label class="f-campo">Distribuidora<select data-mc="distribuidora">${Object.entries(D.DISTRIBUIDORAS).map(([k2, x]) => `<option value="${k2}" ${mc.distribuidora === k2 ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select><small>El logo sale de Empresa › Logos de distribuidoras.</small></label>
        <div class="mach-campos">${CAMPOS.map(([k2, n]) => `<label class="f-campo">${n}${k2 === "departamento" ? `<select data-mc="${k2}" data-geo-depto="mach">${window.EMT_GEO.opcionesDepto(mc[k2])}</select>` : `<input data-mc="${k2}" value="${esc(mc[k2] || "")}" autocomplete="off" ${k2 === "municipio" ? 'data-geo-muni="mach"' : ""}>`}</label>`).join("")}</div>
        <div class="f-campo"><span>Modificaciones</span>${[0, 1, 2, 3, 4].map(i => `<div class="mod-f">${[["n", "N°"], ["fecha", "Fecha"], ["desc", "Descripción"], ["diseno", "Diseño"], ["reviso", "Revisó"], ["aprobo", "Aprobó"]].map(([k2, n]) => `<input data-mod="${i}:${k2}" value="${esc(((mc.mods || [])[i] || {})[k2] || "")}" placeholder="${n}" aria-label="${n} de la modificación ${i + 1}" autocomplete="off">`).join("")}</div>`).join("")}</div></fieldset>`;
    };
    pintarMach(); pintarForm();

    const elSel = () => est.sel && est.sel[0] === "e" ? d.elementos.find(e => e.id === Number(est.sel.slice(1))) : null;
    const lnSel = () => est.sel && est.sel[0] === "l" ? d.lineas.find(l => l.id === Number(est.sel.slice(1))) : null;
    const txSel = () => est.sel && est.sel[0] === "t" ? d.textos.find(t => t.id === Number(est.sel.slice(1))) : null;
    const pintarProps = () => {
      if (props.contains(document.activeElement) && document.activeElement.matches("select[data-pe]")) document.activeElement.blur();
      const e = elSel(), l = lnSel(), t = txSel();
      if (!puede || (!e && !l && !t)) { props.innerHTML = ""; return; }
      const quitar = `<span class="acc"><button class="s-btn suave-b chico" type="button" data-quitar-sel>${ico("trash", 14)}Quitar</button><button class="s-btn lleno chico" type="button" data-listo-sel>Listo</button></span>`;
      if (e && e.s === "punto") { props.innerHTML = `<div class="caja pl-props"><div class="caja-cab"><h2>Punto de quiebre</h2>${quitar}</div><p class="suave" style="margin:0;font-size:13.5px">Sirve para doblar una línea. Arrástrelo para moverlo.</p></div>`; return; }
      if (e) {
        const u = e.utm || {};
        props.innerHTML = `<div class="caja pl-props"><div class="caja-cab"><h2>${esc(S.P[e.s].n)}</h2>${quitar}</div>
          <div class="f-fila"><label class="f-campo">Símbolo<select data-p="s">${S.PALETA.map(([g, ks]) => `<optgroup label="${esc(g)}">${ks.map(k2 => `<option value="${k2}" ${e.s === k2 ? "selected" : ""}>${esc(S.P[k2].n)}${S.P[k2].e ? " · " + S.P[k2].e : ""}</option>`).join("")}</optgroup>`).join("")}</select></label>
          <label class="f-campo">Código<input data-p="cod" value="${esc(e.cod || "")}" placeholder="P-01" autocomplete="off"></label></div>
          ${window.EMT_CONTEO.propsElemento(e, d, catC, cfgC, mc)}
          <label class="f-campo">Detalle<textarea data-p="det" rows="2" placeholder="10/500daN METAL, 10 KVA, TEN 13.8…">${esc(e.det || "")}</textarea></label>
          <div class="f-fila utm-f"><label class="f-campo">Zona<input data-u="z" value="${esc(u.z || "15 P")}" autocomplete="off"></label><label class="f-campo">Este (X)<input data-u="e" inputmode="numeric" value="${esc(u.e ?? "")}" placeholder="0609490" autocomplete="off"></label><label class="f-campo">Norte (Y)<input data-u="n" inputmode="numeric" value="${esc(u.n ?? "")}" placeholder="1674240" autocomplete="off"></label></div>
          <div class="f-fila"><label class="f-check"><input type="checkbox" data-p="verUtm" ${e.verUtm ? "checked" : ""}><span>Mostrar las coordenadas en el plano</span></label><label class="f-campo">Número en círculo<input data-p="num" value="${esc(e.num || "")}" inputmode="numeric" placeholder="1" autocomplete="off"></label></div>
          <label class="f-campo">Girar<input type="range" min="-180" max="180" step="5" data-p="rot" value="${e.rot || 0}"></label>
          ${e.utm && e.utm.e != null && e.utm.n != null ? `<p class="suave" style="margin:0;font-size:13px">Con coordenadas queda en su lugar real. Para moverlo, cambie las coordenadas.</p>` : ""}</div>`;
        return;
      }
      if (l) {
        const m = porId(d);
        props.innerHTML = `<div class="caja pl-props"><div class="caja-cab"><h2>Línea</h2>${quitar}</div>
          <div class="f-fila"><label class="f-campo">Tipo<select data-l="t">${LINEAS_PALETA.map(([k2, n]) => `<option value="${k2}" ${l.t === k2 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="f-campo">Estado<select data-l="e" ${S.L[l.t].color ? "disabled" : ""}><option value="proyectado" ${l.e === "proyectado" ? "selected" : ""}>Proyectado (rojo)</option><option value="existente" ${l.e === "existente" ? "selected" : ""}>Existente (negro)</option></select></label></div>
          <div class="f-fila"><label class="f-campo">Metros<input data-l="m" value="${esc(l.m || "")}" placeholder="${n2(metros(d, l, m))}" inputmode="decimal" autocomplete="off"><small>Vacío = la distancia medida en el plano.</small></label><label class="f-check"><input type="checkbox" data-l="verM" ${l.verM !== false ? "checked" : ""}><span>Mostrar los metros</span></label></div></div>`;
        return;
      }
      props.innerHTML = `<div class="caja pl-props"><div class="caja-cab"><h2>Texto</h2>${quitar}</div><label class="f-campo">Texto<textarea data-t="txt" rows="3">${esc(t.txt || "")}</textarea></label>
        <div class="f-fila"><label class="f-campo">Color<select data-t="c"><option value="n" ${t.c !== "r" ? "selected" : ""}>Negro (existente)</option><option value="r" ${t.c === "r" ? "selected" : ""}>Rojo (proyectado)</option></select></label><label class="f-campo">Tamaño<select data-t="tam">${[[0.8, "Pequeño"], [1, "Normal"], [1.5, "Grande"], [2.2, "Título"]].map(([x, n]) => `<option value="${x}" ${(t.tam || 1) === x ? "selected" : ""}>${n}</option>`).join("")}</select></label></div></div>`;
    };

    const paleta = () => modal({
      titulo: "Escoger símbolo", guardarTxt: "Cerrar",
      cuerpo: `<label class="busca-v ancho-busca"><span class="sr">Buscar símbolo</span>${ico("search", 16)}<input type="search" data-bs placeholder="Buscar: poste, transformador, retenida…" value="${esc(buscaS)}" autocomplete="off"></label><div class="paleta" data-pal-lista></div>`,
      alAbrir: (f, mm) => {
        const caja = f.querySelector("[data-pal-lista]");
        const pin = () => { const q = A().normal(buscaS); caja.innerHTML = S.PALETA.map(([g, ks]) => { const l = ks.filter(k2 => !q || A().normal(S.P[k2].n + " " + g + " " + S.P[k2].e).includes(q)); return l.length ? `<p class="res-t">${esc(g)}</p><div class="paleta-g">${l.map(k2 => `<button type="button" class="pal-b ${est.simbolo === k2 ? "on" : ""}" data-escoger="${k2}">${S.icono(["p", k2], 44)}<span>${esc(S.P[k2].n)}${S.P[k2].e ? `<small>${S.P[k2].e}</small>` : ""}</span></button>`).join("")}</div>` : ""; }).join("") || `<p class="suave">Nada con «${esc(buscaS)}».</p>`; };
        pin();
        f.querySelector("[data-bs]").addEventListener("input", ev => { buscaS = ev.target.value; pin(); });
        mm.addEventListener("click", ev => { const b = ev.target.closest("[data-escoger]"); if (!b) return; est.simbolo = b.dataset.escoger; est.herr = "simbolo"; cerrarCapas(); actualizarHerr(); pintar(); });
      },
      alGuardar: async () => cerrarCapas()
    });
    const paletaL = () => modal({
      titulo: "Escoger línea", guardarTxt: "Listo",
      cuerpo: `<div class="seg ancho" role="group" aria-label="Estado de la línea"><button type="button" data-le="proyectado" aria-pressed="${est.linea.e === "proyectado"}">Proyectada (roja)</button><button type="button" data-le="existente" aria-pressed="${est.linea.e === "existente"}">Existente (negra)</button></div><div class="paleta-g lineas">${LINEAS_PALETA.map(([k2, n]) => `<button type="button" class="pal-b ${est.linea.t === k2 ? "on" : ""}" data-lt="${k2}"><svg viewBox="-24 -6 48 12" width="70" height="18" aria-hidden="true">${S.trazo(k2, est.linea.e, -22, 0, 22, 0)}</svg><span>${n}</span></button>`).join("")}</div>`,
      alAbrir: (f, mm) => { mm.addEventListener("click", ev => { const a = ev.target.closest("[data-le]"); if (a) { est.linea.e = a.dataset.le; f.querySelectorAll("[data-le]").forEach(b => b.setAttribute("aria-pressed", String(b === a))); f.querySelectorAll("[data-lt] svg").forEach((s2, i) => { s2.innerHTML = S.trazo(LINEAS_PALETA[i][0], est.linea.e, -22, 0, 22, 0); }); } const b = ev.target.closest("[data-lt]"); if (b) { est.linea.t = b.dataset.lt; f.querySelectorAll("[data-lt]").forEach(x => x.classList.toggle("on", x === b)); } }); },
      alGuardar: async () => { est.herr = "linea"; est.desde = null; cerrarCapas(); actualizarHerr(); pintar(); }
    });
    const actualizarHerr = () => v.querySelectorAll("[data-herr]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.herr === est.herr)));

    const ptrs = new Map();
    let arr = null, pinch = null;
    svg.addEventListener("pointerdown", e => {
      try { svg.setPointerCapture(e.pointerId); } catch (er) {}
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; pinch = { dist: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), vb: { ...vb }, c: mundo((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2) }; arr = null; return; }
      const [wx, wy] = mundo(e.clientX, e.clientY);
      const el = e.target.closest("[data-el]"), eti = e.target.closest("[data-eti]"), ln = e.target.closest("[data-ln]"), tx = e.target.closest("[data-tx]");
      arr = { x0: e.clientX, y0: e.clientY, wx, wy, mov: false, el: el && Number(el.dataset.el), eti: eti && Number(eti.dataset.eti), ln: ln && Number(ln.dataset.ln), tx: tx && Number(tx.dataset.tx), vb: { ...vb } };
    });
    svg.addEventListener("pointermove", e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; const f = pinch.dist / Math.max(10, Math.hypot(p1[0] - p2[0], p1[1] - p2[1])); const w = Math.min(5000, Math.max(5, pinch.vb.w * f)), h = pinch.vb.h * (w / pinch.vb.w); vb = { x: pinch.c[0] - (pinch.c[0] - pinch.vb.x) * (w / pinch.vb.w), y: pinch.c[1] - (pinch.c[1] - pinch.vb.y) * (w / pinch.vb.w), w, h }; pintar(); return; }
      if (!arr) return;
      if (!arr.mov && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 6) return;
      arr.mov = true;
      const [wx, wy] = mundo(e.clientX, e.clientY);
      const editable = puede && est.herr === "mover";
      if (editable && arr.eti != null) { const x = d.elementos.find(z => z.id === arr.eti); const [px, py] = pos(d, x); x.eti = { dx: wx - px, dy: wy - py }; pintar(); arr.cambio = true; return; }
      if (editable && arr.el != null) { const x = d.elementos.find(z => z.id === arr.el); if (!(x.utm && x.utm.e != null && x.utm.n != null && ref(d))) { x.x = wx; x.y = wy; pintar(); arr.cambio = true; return; } }
      if (editable && arr.tx != null) { const x = d.textos.find(z => z.id === arr.tx); if (!arr.off) arr.off = [x.x - arr.wx, x.y - arr.wy]; x.x = wx + arr.off[0]; x.y = wy + arr.off[1]; pintar(); arr.cambio = true; return; }
      const r = svg.getBoundingClientRect(), esc2 = arr.vb.w / r.width;
      vb = { ...arr.vb, x: arr.vb.x - (e.clientX - arr.x0) * esc2, y: arr.vb.y - (e.clientY - arr.y0) * esc2 * (arr.vb.h / arr.vb.w) / (r.height / r.width) };
      pintar();
    });
    const soltar = e => {
      ptrs.delete(e.pointerId);
      if (pinch) { if (ptrs.size < 2) pinch = null; marcarVista(); return; }
      const a = arr; arr = null;
      if (!a) return;
      if (a.mov) { if (a.cambio) marcar(); else marcarVista(); return; }
      if (!puede) return;
      const [wx, wy] = [a.wx, a.wy];
      if (est.herr === "simbolo") { const n = { id: nuevoId(), s: est.simbolo, x: wx, y: wy, rot: 0 }; if (/^poste/.test(est.simbolo)) n.cod = `P-${String(d.elementos.filter(z => /^poste/.test(z.s)).length).padStart(2, "0")}`; d.elementos.push(n); est.sel = "e" + n.id; marcar(); pintar(); pintarProps(); return; }
      if (est.herr === "texto") { const n = { id: nuevoId(), x: wx, y: wy, txt: "Texto", c: "n", tam: 1 }; d.textos.push(n); est.sel = "t" + n.id; marcar(); pintar(); pintarProps(); setTimeout(() => { const ta = props.querySelector('[data-t="txt"]'); ta && (ta.focus(), ta.select()); }, 30); return; }
      if (est.herr === "linea") {
        let destino = a.el != null ? a.el : a.eti;
        if (destino == null) { const n = { id: nuevoId(), s: "punto", x: wx, y: wy }; d.elementos.push(n); destino = n.id; }
        if (est.desde == null) est.desde = destino;
        else if (est.desde !== destino) { d.lineas.push({ id: nuevoId(), t: est.linea.t, e: est.linea.e, a: est.desde, b: destino, verM: true }); est.desde = destino; marcar(); }
        pintar(); return;
      }
      est.sel = a.el != null ? "e" + a.el : a.eti != null ? "e" + a.eti : a.ln != null ? "l" + a.ln : a.tx != null ? "t" + a.tx : null;
      if (est.sel && matchMedia("(max-width: 900px)").matches) {
        const r = svg.getBoundingClientRect(), tope = innerHeight * 0.46, py = a.y0;
        if (py > tope) { const deseado = (Math.max(r.top, 70) + tope) / 2; vb = { ...vb, y: vb.y + (py - deseado) * (vb.h / r.height) }; }
      }
      pintar(); pintarProps();
    };
    let vistaT = null;
    const marcarVista = () => { clearTimeout(vistaT); vistaT = setTimeout(() => { d.vista = vb; D.guardarPlano(tipo, id, d, mc).catch(() => {}); }, 1200); };
    svg.addEventListener("pointerup", soltar);
    svg.addEventListener("pointercancel", soltar);
    svg.addEventListener("wheel", e => { e.preventDefault(); const [cx, cy] = mundo(e.clientX, e.clientY); const f = Math.exp(e.deltaY * 0.0015); const w = Math.min(5000, Math.max(5, vb.w * f)), h = vb.h * (w / vb.w); vb = { x: cx - (cx - vb.x) * (w / vb.w), y: cy - (cy - vb.y) * (w / vb.w), w, h }; pintar(); marcarVista(); }, { passive: false });

    v.oninput = e => {
      const t = e.target;
      if (t.dataset.mc) { mc[t.dataset.mc] = t.value; marcar(); return; }
      if (t.dataset.mod) { const [i, k2] = t.dataset.mod.split(":"); mc.mods = mc.mods || []; for (let j = 0; j <= Number(i); j++) mc.mods[j] = mc.mods[j] || {}; mc.mods[Number(i)][k2] = t.value; marcar(); return; }
      const x = elSel(), l = lnSel(), tx = txSel();
      if (x && t.dataset.p) { const k2 = t.dataset.p; x[k2] = t.type === "checkbox" ? t.checked : k2 === "rot" ? Number(t.value) : t.value; if (k2 === "s") { pintarProps(); } pintar(); marcar(); return; }
      if (x && t.dataset.u) {
        x.utm = x.utm || { z: "15 P", e: null, n: null };
        const k2 = t.dataset.u; x.utm[k2] = k2 === "z" ? t.value : (t.value.replace(/[^\d.]/g, "") === "" ? null : Number(t.value.replace(/[^\d.]/g, "")));
        if (x.utm.e != null && x.utm.n != null) {
          if (!d.ref) { d.ref = { e: x.utm.e - x.x, n: x.utm.n + x.y }; }
          if (!x.verUtm && k2 !== "z") x.verUtm = true;
        }
        pintar(); marcar(); return;
      }
      if (l && t.dataset.l) { const k2 = t.dataset.l; l[k2] = t.type === "checkbox" ? t.checked : t.value; if (k2 === "t") pintarProps(); pintar(); marcar(); return; }
      if (tx && t.dataset.t) { const k2 = t.dataset.t; tx[k2] = k2 === "tam" ? Number(t.value) : t.value; pintar(); marcar(); }
    };
    v.onchange = e => {
      if (e.target.dataset.p === "verUtm" || e.target.dataset.l === "verM") v.oninput(e);
      const x = elSel(), k2 = e.target.dataset.pe;
      if (x && k2) { if (k2 === "noCot") { if (e.target.checked) x.noCot = true; else delete x.noCot; } else if (e.target.value === "") delete x[k2]; else x[k2] = k2 === "kva" ? Number(e.target.value) : e.target.value; marcar(); pintarProps(); }
    };
    v.onclick = async e => {
      const h = e.target.closest("[data-herr]");
      if (h) { if (h.dataset.herr === "simbolo" && est.herr === "simbolo") { paleta(); return; } if (h.dataset.herr === "linea" && est.herr === "linea") { paletaL(); return; } est.herr = h.dataset.herr; est.desde = null; if (est.herr === "simbolo" && !d.elementos.length) paleta(); actualizarHerr(); pintar(); return; }
      if (e.target.closest("[data-paleta]")) { paleta(); return; }
      if (e.target.closest("[data-paleta-l]") && !e.target.closest(".modal")) { paletaL(); return; }
      const z = e.target.closest("[data-zoom]"); if (z) { const f = z.dataset.zoom === "1" ? 0.7 : 1.4; const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2; vb = { x: cx - vb.w * f / 2, y: cy - vb.h * f / 2, w: vb.w * f, h: vb.h * f }; pintar(); marcarVista(); return; }
      if (e.target.closest("[data-encajar]")) { encajar(); pintar(); marcarVista(); return; }
      if (e.target.closest("[data-listo-sel]")) { est.sel = null; pintar(); pintarProps(); return; }
      if (e.target.closest("[data-quitar-sel]")) {
        const x = elSel(), l = lnSel(), tx = txSel();
        if (x) { d.elementos = d.elementos.filter(z2 => z2 !== x); d.lineas = d.lineas.filter(z2 => z2.a !== x.id && z2.b !== x.id); }
        if (l) d.lineas = d.lineas.filter(z2 => z2 !== l);
        if (tx) d.textos = d.textos.filter(z2 => z2 !== tx);
        est.sel = null; pintar(); pintarProps(); marcar(); aviso("Quitado del plano."); return;
      }
      if (e.target.closest("[data-conteo-pl]")) {
        const c = await D.cotizacion(id); if (!c) return;
        await window.EMT_CONTEO.revisar({ d, mc, c, guardarPlano: async () => { d.vista = vb; await D.guardarPlano(tipo, id, d, mc); },
          aplicar: async () => { await D.guardarCotizacion(c, D.calcularCotizacion(c, catC)); } });
        return;
      }
      if (e.target.closest("[data-hoja]")) {
        const logos = await logosDe(mc);
        const m = modal({ titulo: "Hoja del plano", guardarTxt: "Cerrar", cuerpo: `<div class="hoja-plano">${hojaSVG(d, mc, logos)}</div>`, alGuardar: async () => cerrarCapas() });
        m.classList.add("modal-hoja");
        return;
      }
      if (e.target.closest("[data-pl-pdf]")) {
        const b = e.target.closest("[data-pl-pdf]"); b.disabled = true;
        try { aviso("Armando el PDF del plano…"); await pdf(d, mc, `Plano ${info.titulo.split(" · ")[0]} - ${(mc.solicitante || "").replace(/[\\/:*?"<>|]/g, "")}`); }
        catch (err) { aviso(/[áéíóúñ]/i.test(err.message) ? err.message : "No se pudo armar el PDF del plano.", "mal"); }
        finally { b.disabled = false; }
      }
    };
    $(".plano-v", v).addEventListener("keydown", e => { if ((e.key === "Delete" || e.key === "Backspace") && est.sel && !/input|textarea|select/i.test(e.target.tagName)) v.querySelector("[data-quitar-sel]")?.click(); });
    pintar(); pintarProps();
    new ResizeObserver(() => { const r = svg.getBoundingClientRect(); if (r.width && vb) { const asp = r.width / r.height; vb = { ...vb, h: vb.w / asp }; pintar(); } }).observe(svg);
  }

  return { vista, hojaSVG, miniatura, planoBytes, machoteInicial };
})();
