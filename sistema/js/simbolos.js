"use strict";
window.EMT_SIMB = (() => {
  const NEGRO = "#151515", ROJO = "#E0201B", GRIS = "#8F98A3", VERDE = "#2E7D32", ROSA = "#F08A86";
  const ln = (x1, y1, x2, y2, c, w = 1.3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const ci = (x, y, r, c, relleno = "none", w = 1.3) => `<circle cx="${x}" cy="${y}" r="${r}" stroke="${c}" stroke-width="${w}" fill="${relleno}"/>`;
  const sector = (r, a1, a2, c) => { const p = a => [Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r]; const [x1, y1] = p(a1), [x2, y2] = p(a2); return `<path d="M0 0 L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${c}"/>`; };
  const equis = (c, s = 7.5) => ln(-s, -s, s, s, c) + ln(-s, s, s, -s, c);
  const arco = (x, c) => `<path d="M${x} -4 Q${x + 3} 0 ${x} 4" stroke="${c}" stroke-width="1.3" fill="none"/>`;
  const arcoI = (x, c) => `<path d="M${x} -4 Q${x - 3} 0 ${x} 4" stroke="${c}" stroke-width="1.3" fill="none"/>`;
  const txt = (x, y, t, c, s = 4.2) => `<text x="${x}" y="${y}" font-size="${s}" font-family="Arial, sans-serif" font-weight="700" fill="${c}">${t}</text>`;

  const P = {
    poste6_ex: { n: "Poste de 6.00 m", g: "Postes existentes", e: "existente", svg: () => equis(NEGRO) + ci(0, 0, 4.5, NEGRO) },
    poste9lum_ex: { n: "Poste de 9.00 m (30') con luminaria", g: "Postes existentes", e: "existente", svg: () => equis(NEGRO) + sector(5, -90, 0, NEGRO) + ci(0, 0, 5, NEGRO) },
    poste106lum_ex: { n: "Poste de 10.60 m (35') con luminaria", g: "Postes existentes", e: "existente", svg: () => equis(NEGRO) + sector(5, 90, 270, NEGRO) + ci(0, 0, 5, NEGRO) },
    poste9_ex: { n: "Poste de 9.00 m (30')", g: "Postes existentes", e: "existente", svg: () => sector(5, -90, 0, NEGRO) + ci(0, 0, 5, NEGRO) },
    poste106_ex: { n: "Poste de 10.60 m (35')", g: "Postes existentes", e: "existente", svg: () => sector(5, 90, 270, NEGRO) + ci(0, 0, 5, NEGRO) },
    poste12_ex: { n: "Poste de 12.00 m", g: "Postes existentes", e: "existente", svg: () => sector(5, 0, 270, NEGRO) + ci(0, 0, 5, NEGRO) },
    poste14_ex: { n: "Poste de 14.00 m", g: "Postes existentes", e: "existente", svg: () => sector(5, -135, -45, NEGRO) + sector(5, 45, 135, NEGRO) + ci(0, 0, 5, NEGRO) },
    tubo_ex: { n: "Tubo metálico", g: "Postes existentes", e: "existente", svg: () => ci(0, 0, 3.6, NEGRO, NEGRO) },
    poste9_pr: { n: "Poste de 9.00 m (30')", g: "Postes proyectados", e: "proyectado", svg: () => ci(0, 0, 5, ROJO) },
    poste106_pr: { n: "Poste de 10.60 m (35')", g: "Postes proyectados", e: "proyectado", svg: () => ci(0, 0, 5, ROJO) + ln(0, -5, 0, 5, ROJO) },
    poste_madera: { n: "Poste de madera", g: "Material del poste", e: "", svg: () => ci(-2, 0, 4.5, NEGRO) + txt(3.5, 4.5, "PM", ROJO, 3.6) },
    poste_concreto: { n: "Poste de concreto", g: "Material del poste", e: "", svg: () => ci(-2, 0, 4.5, NEGRO) + txt(3.5, 4.5, "PC", ROJO, 3.6) },
    poste_chapa: { n: "Poste de chapa metálica", g: "Material del poste", e: "", svg: () => ci(-4, 0, 4.5, NEGRO) + txt(1.5, 4.5, "PCHM", ROJO, 3.4) },
    ret_ancla_s: { n: "Retenida de ancla simple", g: "Retenidas", e: "", svg: () => arco(-11, NEGRO) + ln(-9, 0, 4, 0, NEGRO) + ci(7.5, 0, 3.5, NEGRO) },
    ret_ancla_d: { n: "Retenida de ancla doble", g: "Retenidas", e: "", svg: () => arco(-11, NEGRO) + ln(-9, -1.2, 4, -1.2, NEGRO, 1) + ln(-9, 1.2, 4, 1.2, NEGRO, 1) + ci(7.5, 0, 3.5, NEGRO) },
    ret_vert_s: { n: "Retenida vertical simple", g: "Retenidas", e: "", svg: () => arco(-11, NEGRO) + ln(-9, 0, 4, 0, NEGRO) + ln(-3, -3, -3, 3, NEGRO) + ci(7.5, 0, 3.5, NEGRO) },
    ret_vert_d: { n: "Retenida vertical doble", g: "Retenidas", e: "", svg: () => arco(-11, NEGRO) + ln(-9, 0, 4, 0, NEGRO) + ln(-4.5, -3, -4.5, 3, NEGRO) + ln(-1.5, -3, -1.5, 3, NEGRO) + ci(7.5, 0, 3.5, NEGRO) },
    ret_poste: { n: "Retenida de poste a poste", g: "Retenidas", e: "", svg: () => ln(-12, 0, -3, 0, ROJO) + arco(-3, ROJO) + arcoI(3, ROJO) + ln(3, 0, 12, 0, ROJO) },
    caja_deriv: { n: "Poste con caja de derivación monofásica", g: "Postes existentes", e: "", svg: () => ci(-5, 0, 4, NEGRO) + ln(-1, 0, 3, 0, NEGRO) + `<rect x="3" y="-3" width="6" height="6" stroke="${ROJO}" stroke-width="1.2" fill="none"/>` },
    corta_ex: { n: "Cortacircuitos amperaje indicado", g: "Protección", e: "existente", svg: () => ln(-12, 0, -6, 0, NEGRO) + `<rect x="-6" y="-3.5" width="12" height="7" stroke="${NEGRO}" stroke-width="1.3" fill="none"/>` + ln(-3, -3.5, -3, 3.5, NEGRO, 1) + ln(6, 0, 12, 0, NEGRO) },
    corta_pr: { n: "Cortacircuitos amperaje indicado", g: "Protección", e: "proyectado", svg: () => ln(-12, 0, -6, 0, ROJO) + `<rect x="-6" y="-3.5" width="12" height="7" stroke="${ROJO}" stroke-width="1.3" fill="none"/>` + ln(-3, -3.5, -3, 3.5, ROJO, 1) + ln(6, 0, 12, 0, ROJO) },
    pararrayos: { n: "Pararrayos voltaje indicado", g: "Protección", e: "", svg: () => ln(-11, -3, -11, 3, NEGRO) + ln(-8, -4, -8, 4, NEGRO) + ln(-5, -4, -5, 4, NEGRO) + ln(-5, 0, 6, 0, NEGRO) + ci(8, 0, 2, NEGRO) + ln(10, 0, 12, 0, NEGRO) },
    para_linea: { n: "Pararrayos de línea", g: "Protección", e: "", svg: () => ln(-12, 0, -3, 0, ROJO) + ci(-1, 0, 2, ROJO) + ci(4, 0, 2, ROJO) + `<path d="M7 -2.5 L11 0 L7 2.5" stroke="${ROJO}" stroke-width="1.2" fill="none"/>` },
    seccionador: { n: "Seccionador de línea", g: "Protección", e: "", svg: () => ln(-12, 0, -4, 0, ROJO) + ln(-4, 0, 4, -5, ROJO) + ln(4, 0, 12, 0, ROJO) },
    trafo_ex: { n: "Transformador capacidad indicada", g: "Transformadores", e: "existente", svg: () => `<path d="M-8 -6 L4 0 L-8 6 Z" fill="${NEGRO}"/>` + ln(4, 0, 11, 0, NEGRO) },
    trafo_pr: { n: "Transformador capacidad indicada", g: "Transformadores", e: "proyectado", svg: () => `<path d="M-8 -6 L4 0 L-8 6 Z" fill="none" stroke="${ROJO}" stroke-width="1.3"/>` + ln(4, 0, 11, 0, ROJO) },
    tierra: { n: "Puesta a tierra", g: "Protección", e: "", svg: () => ln(-10, -3, -10, 3, GRIS) + ln(-7, -4.5, -7, 4.5, GRIS) + ln(-4, -6, -4, 6, GRIS) + ln(-4, 0, 11, 0, GRIS) },
    anillo_tierra: { n: "Anillo de puesta a tierra para transformador", g: "Protección", e: "", svg: () => ln(-10, -3, -10, 3, GRIS) + ln(-7, -4.5, -7, 4.5, GRIS) + ln(-4, -6, -4, 6, GRIS) + ln(-4, 0, 3, 0, GRIS) + ln(3, -6, 3, 6, GRIS) + ln(3, -6, 9, -6, GRIS) + ln(3, 6, 9, 6, GRIS) },
    casa: { n: "Casa interesada", g: "Lugares", e: "", svg: () => `<path d="M-7 8 V-1 L0 -8 L7 -1 V8 Z" stroke="${ROSA}" stroke-width="1.2" fill="none"/>` },
    iglesia: { n: "Iglesia", g: "Lugares", e: "", svg: () => `<rect x="-3" y="-5" width="10" height="10" stroke="${GRIS}" stroke-width="1.2" fill="none"/>` + ln(-9, 0, -3, 0, GRIS, 1) + ln(-6, -3, -6, 3, GRIS, 1) },
    escuela: { n: "Escuela", g: "Lugares", e: "", svg: () => `<rect x="-2" y="-5" width="10" height="10" stroke="${GRIS}" stroke-width="1.2" fill="none"/>` + `<rect x="-10" y="-3" width="6" height="7" stroke="${GRIS}" stroke-width="1" fill="none"/>` + ln(-10, 0.5, -4, 0.5, GRIS, 1) },
    gasolinera: { n: "Gasolinera", g: "Lugares", e: "", svg: () => `<rect x="-5" y="-7" width="8" height="14" rx="1.5" stroke="${NEGRO}" stroke-width="1.3" fill="none"/>` + `<rect x="-3" y="-5" width="4" height="3.5" fill="${NEGRO}"/>` + `<path d="M3 -3 H6 V5" stroke="${NEGRO}" stroke-width="1.2" fill="none"/>` },
    puesto_salud: { n: "Puesto de salud", g: "Lugares", e: "", svg: () => `<rect x="-6" y="-6" width="12" height="12" stroke="${NEGRO}" stroke-width="1.2" fill="none"/>` + ln(0, -3.5, 0, 3.5, NEGRO, 1.4) + ln(-3.5, 0, 3.5, 0, NEGRO, 1.4) },
    subestacion: { n: "Subestación eléctrica", g: "Lugares", e: "", svg: () => `<path d="M0 -9 L3.5 9 L0 5 L-3.5 9 Z" fill="${NEGRO}"/>` },
    puente: { n: "Puente", g: "Terreno", e: "", svg: () => ln(-11, -5, 11, -5, GRIS) + ln(-11, 5, 11, 5, GRIS) + [-8, -4, 0, 4, 8].map(x => ln(x, -5, x, 5, GRIS, 1)).join("") },
    bosque: { n: "Bosque, monte alto", g: "Terreno", e: "", svg: () => [-9, -4.5, 0, 4.5, 9].map(x => ci(x, 0, 2.2, VERDE, "none", 1.4) + ci(x, 0, 1, VERDE, "none", 0.8)).join("") },
    norte: { n: "Norte", g: "Plano", e: "", svg: () => `<circle cx="0" cy="0" r="9" stroke="${GRIS}" stroke-width="1" fill="none"/><path d="M0 -14 L3 0 L0 -2 L-3 0 Z" fill="${GRIS}"/>` + txt(-2.4, 4.5, "N", NEGRO, 5) }
  };

  const L = {
    mt3f: { n: "Conductor 3F de media tensión", da: "11 2.5 1 2 1 2 1 2.5" },
    mt2f: { n: "Conductor 2F de media tensión", da: "11 2.5 1 2 1 2.5" },
    mt1f: { n: "Conductor 1F de media tensión", da: "11 2.5 1 2.5" },
    bt: { n: "Conductor de baja tensión", da: "" },
    triplex: { n: "Conductor triplex No. 2", da: "6 4" },
    at69: { n: "Línea de alta tensión 69 kV", da: "10 6", color: GRIS },
    cerco: { n: "Cerco o lindero", da: "7 3", color: GRIS, marca: "x" },
    zanjon: { n: "Zanjón, riachuelo, quebrada", da: "", color: GRIS, onda: true },
    camino: { n: "Camino", da: "", color: GRIS, doble: true }
  };
  const colorLinea = (k, estado) => L[k].color || (estado === "proyectado" ? ROJO : NEGRO);

  const LEYENDA = [
    ["l", "mt3f", "existente"], ["l", "mt2f", "existente"], ["l", "mt1f", "existente"], ["l", "bt", "existente"], ["l", "triplex", "existente"],
    ["l", "mt3f", "proyectado"], ["l", "mt2f", "proyectado"], ["l", "mt1f", "proyectado"], ["l", "triplex", "proyectado"],
    ["p", "poste6_ex"], ["p", "poste9lum_ex"], ["p", "poste106lum_ex"], ["p", "poste9_ex"], ["p", "poste106_ex"], ["p", "poste12_ex"], ["p", "poste14_ex"], ["p", "tubo_ex"],
    ["p", "poste9_pr"], ["p", "poste106_pr"], ["p", "ret_ancla_s"], ["p", "ret_ancla_d"], ["p", "caja_deriv"], ["p", "ret_vert_s"], ["p", "ret_vert_d"], ["p", "ret_poste"],
    ["p", "corta_ex"], ["p", "corta_pr"], ["p", "pararrayos"], ["p", "trafo_ex"], ["p", "trafo_pr"], ["p", "casa"], ["p", "iglesia"], ["p", "escuela"], ["p", "gasolinera"],
    ["p", "tierra"], ["p", "anillo_tierra"], ["l", "cerco"], ["l", "zanjon"], ["l", "camino"], ["p", "bosque"], ["p", "puente"], ["p", "puesto_salud"], ["p", "subestacion"],
    ["p", "poste_madera"], ["p", "poste_concreto"], ["p", "poste_chapa"], ["l", "at69"], ["p", "para_linea"], ["p", "seccionador"]
  ];
  const textoLeyenda = ([t, k, e]) => {
    const n = (t === "l" ? L[k].n : P[k].n).toUpperCase().replace(/(\d) M\b/g, "$1 m");
    const est = t === "l" ? (L[k].color ? "" : e) : P[k].e;
    return n + (est ? " " + est : "");
  };

  function trazo(k, estado, x1, y1, x2, y2, w = 1.3) {
    const d = L[k], c = colorLinea(k, estado);
    if (d.doble) { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ox = -dy / l * 2.2, oy = dx / l * 2.2; return ln(x1 + ox, y1 + oy, x2 + ox, y2 + oy, c, w * 0.8) + ln(x1 - ox, y1 - oy, x2 - ox, y2 - oy, c, w * 0.8); }
    if (d.onda) { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(l / 8)), nx = -dy / l, ny = dx / l; let p = `M${x1} ${y1}`; for (let i = 1; i <= n; i++) { const t0 = (i - 0.5) / n, t1 = i / n, a = (i % 2 ? 2.5 : -2.5); p += ` Q${(x1 + dx * t0 + nx * a).toFixed(2)} ${(y1 + dy * t0 + ny * a).toFixed(2)} ${(x1 + dx * t1).toFixed(2)} ${(y1 + dy * t1).toFixed(2)}`; } return `<path d="${p}" stroke="${c}" stroke-width="${w}" fill="none"/>`; }
    let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${d.da ? `stroke-dasharray="${d.da}"` : ""} stroke-linecap="butt"/>`;
    if (d.marca === "x") { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.floor(l / 14)); for (let i = 1; i <= n; i++) { const t = i / (n + 1), cx = x1 + dx * t, cy = y1 + dy * t; s += ln(cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6, c, 0.9) + ln(cx - 1.6, cy + 1.6, cx + 1.6, cy - 1.6, c, 0.9); } }
    return s;
  }

  const muestra = (fila, ancho = 40) => fila[0] === "l" ? trazo(fila[1], fila[2], -ancho / 2, 0, ancho / 2, 0) : P[fila[1]].svg();
  const icono = (fila, px = 40) => `<svg viewBox="-20 -12 40 24" width="${px}" height="${px * 0.6}" aria-hidden="true">${muestra(fila)}</svg>`;

  const PALETA = [
    ["Postes", ["poste9_pr", "poste106_pr", "poste6_ex", "poste9_ex", "poste106_ex", "poste12_ex", "poste14_ex", "poste9lum_ex", "poste106lum_ex", "tubo_ex", "caja_deriv", "poste_madera", "poste_concreto", "poste_chapa"]],
    ["Transformador y protección", ["trafo_pr", "trafo_ex", "corta_pr", "corta_ex", "pararrayos", "para_linea", "seccionador", "tierra", "anillo_tierra"]],
    ["Retenidas", ["ret_ancla_s", "ret_ancla_d", "ret_vert_s", "ret_vert_d", "ret_poste"]],
    ["Lugares y terreno", ["casa", "iglesia", "escuela", "gasolinera", "puesto_salud", "subestacion", "puente", "bosque"]]
  ];

  return { P, L, LEYENDA, PALETA, textoLeyenda, trazo, muestra, icono, colorLinea, NEGRO, ROJO, GRIS };
})();
