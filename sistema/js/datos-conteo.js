"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.conteo";
  const SITUACION = { recta: "Recta", angulo: "En ángulo", angulo_grande: "Ángulo grande", final: "Final de línea", derivacion: "Derivación", arranque: "Arranque en poste existente" };
  const MT = { mt1f: 1, mt2f: 2, mt3f: 3 };
  const KVA = [10, 15, 25, 50, 75];
  const COSAS = [
    ["poste9_pr", "Poste de 9.00 m proyectado"], ["poste106_pr", "Poste de 10.60 m proyectado"],
    ["ret_ancla_s", "Retenida de ancla simple"], ["ret_ancla_d", "Retenida de ancla doble"], ["ret_vert_s", "Retenida vertical simple"], ["ret_vert_d", "Retenida vertical doble"], ["ret_poste", "Retenida de poste a poste"],
    ["corta_pr|13.2", "Cortacircuitos 13.2 kV"], ["corta_pr|34.5", "Cortacircuitos 34.5 kV"], ["pararrayos", "Pararrayos"], ["para_linea", "Pararrayos de línea"], ["seccionador", "Seccionador de línea"],
    ["tierra", "Puesta a tierra"], ["anillo_tierra", "Anillo de tierra para transformador"], ["caja_deriv", "Caja de derivación monofásica"],
    ["cable|4/0 ACSR", "Cable de media tensión 4/0 ACSR"], ["cable|1/0 ACSR", "Cable de media tensión 1/0 ACSR"], ["triplex|4/0", "Triplex 4/0"], ["triplex|1/0", "Triplex 1/0"], ["bt", "Cable de baja tensión"]
  ];
  const DEF = {
    holgura: 5, angulo: 30, kv: 13.2, calibre: "4/0 ACSR", triplex: "1/0",
    tipos: { recta: 1, angulo: 2, angulo_grande: 4, final: 3, derivacion: 5, arranque: 5 },
    conductores: { mt1f: 2, mt2f: 3, mt3f: 4 },
    parejas: { "corta_pr|13.2": "MAT-010", "corta_pr|34.5": "MAT-011", tierra: "MAT-037", "triplex|4/0": "MAT-015", "triplex|1/0": "MAT-016" }
  };
  const mezclar = x => ({ ...DEF, ...(x || {}), tipos: { ...DEF.tipos, ...((x || {}).tipos || {}) }, conductores: { ...DEF.conductores, ...((x || {}).conductores || {}) }, parejas: { ...DEF.parejas, ...((x || {}).parejas || {}) } });

  async function ajustesConteo() {
    if (!nube) { try { return mezclar(JSON.parse(localStorage.getItem(CLAVE))); } catch (e) { return mezclar(null); } }
    const r = await sb.from("ajustes").select("valor").eq("clave", "conteo_plano").maybeSingle();
    return mezclar(r.data && r.data.valor);
  }
  async function guardarAjustesConteo(x) {
    const h = Number(x.holgura), a = Number(x.angulo);
    if (!(h >= 0 && h <= 50)) throw new Error("La holgura va de 0 a 50 %.");
    if (!(a >= 5 && a <= 90)) throw new Error("El ángulo va de 5 a 90 grados.");
    if (Object.values(x.conductores).some(n => !(Number(n) >= 1 && Number(n) <= 6))) throw new Error("Los conductores por línea van de 1 a 6.");
    const v = mezclar(x);
    if (!nube) { try { localStorage.setItem(CLAVE, JSON.stringify({ ...v, cambios: true })); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } return; }
    const r = await sb.from("ajustes").upsert({ clave: "conteo_plano", valor: v });
    if (r.error) throw new Error("No se pudieron guardar los ajustes del conteo.");
  }

  const esPoste = s => /^poste/.test(s) || s === "tubo_ex" || s === "caja_deriv";
  const esProyectado = s => /_pr$/.test(s);
  const tipoDe = e => Number((String(e.nombre).match(/tipo\s+(\d)/i) || [])[1] || 0);

  function opcionesPlano(d, cfg, mc) {
    const o = d.conteo || {};
    const t = String((mc && mc.tension) || "").replace(",", ".");
    const kvM = /34[.,]?5/.test(t) ? 34.5 : /13[.,]?[28]/.test(t) ? 13.2 : null;
    return { kv: Number(o.kv || kvM || cfg.kv), calibre: o.calibre || cfg.calibre, triplex: o.triplex || cfg.triplex, parejas: o.parejas || {} };
  }

  function posDe(d, e) { const r = d.ref; if (e.utm && e.utm.e != null && e.utm.n != null && r) return [Number(e.utm.e) - r.e, r.n - Number(e.utm.n)]; return [e.x, e.y]; }
  function largo(d, l, m) { if (l.m != null && String(l.m).trim() !== "" && isFinite(Number(String(l.m).replace(",", ".")))) return Number(String(l.m).replace(",", ".")); const a = m[l.a], b = m[l.b]; if (!a || !b) return 0; const [ax, ay] = posDe(d, a), [bx, by] = posDe(d, b); return Math.hypot(bx - ax, by - ay); }

  function situacion(d, e, cfg, m) {
    const ls = d.lineas.filter(l => (l.a === e.id || l.b === e.id) && MT[l.t] && l.e === "proyectado");
    if (!ls.length) return null;
    const fases = Math.max(...ls.map(l => MT[l.t]));
    if (!esProyectado(e.s)) return { sit: "arranque", fases, angulo: null };
    if (ls.length === 1) return { sit: "final", fases, angulo: null };
    if (ls.length >= 3) return { sit: "derivacion", fases, angulo: null };
    const [px, py] = posDe(d, e);
    const vec = l => { const o = m[l.a === e.id ? l.b : l.a]; if (!o) return null; const [ox, oy] = posDe(d, o); return [ox - px, oy - py]; };
    const v1 = vec(ls[0]), v2 = vec(ls[1]);
    if (!v1 || !v2) return { sit: "recta", fases, angulo: 0 };
    const ang = Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1)))) * 180 / Math.PI;
    const desvio = Math.round(180 - ang);
    return { sit: desvio <= 5 ? "recta" : desvio <= Number(cfg.angulo) ? "angulo" : "angulo_grande", fases, angulo: desvio };
  }

  function estructuraSugerida(cat, sit, op, cfg) {
    const n = cfg.tipos[sit.sit];
    if (!n) return null;
    const f = sit.fases >= 2 ? 3 : 1;
    return cat.estructuras.find(x => x.clase === "linea" && Number(x.fases) === f && Number(x.voltaje_kv) === Number(op.kv) && x.conductor === op.calibre && tipoDe(x) === Number(n)) || null;
  }

  function buscarCodigo(cat, codigo) {
    if (!codigo || codigo === "-") return null;
    const e = cat.estructuras.find(x => x.codigo === codigo); if (e) return { tipo: "e", id: e.id, codigo, nombre: e.nombre };
    const mt = cat.materiales.find(x => x.codigo === codigo); if (mt) return { tipo: "m", id: mt.id, codigo, nombre: mt.descripcion };
    return null;
  }

  function contar(d, cat, cfg, mc) {
    const op = opcionesPlano(d, cfg, mc);
    const m = Object.fromEntries(d.elementos.map(e => [e.id, e]));
    const filas = new Map(), sin = new Map(), postes = [];
    const nombreCosa = Object.fromEntries(COSAS);
    const sumar = (it, cant, det) => { const k = it.tipo + it.id; const f = filas.get(k) || { ...it, cantidad: 0, det: [] }; f.cantidad += cant; if (det) f.det.push(det); filas.set(k, f); };
    const faltar = (clave, nombre, cant, det, unidad, id) => { const f = sin.get(clave) || { clave, nombre, cantidad: 0, det: [], ids: [], unidad: unidad || "" }; f.cantidad += cant; if (det) f.det.push(det); if (id != null) f.ids.push(id); sin.set(clave, f); };
    const pareja = clave => { const c = op.parejas[clave] != null ? op.parejas[clave] : cfg.parejas[clave]; return c === "-" ? "-" : buscarCodigo(cat, c); };
    const cosa = (clave, cant, det, unidad) => { const p = pareja(clave); if (p === "-") return; if (p) sumar(p, cant, det); else faltar(clave, nombreCosa[clave] || clave, cant, det, unidad); };
    const etiqueta = e => e.cod || (S2(e.s));
    const S2 = s => (window.EMT_SIMB && window.EMT_SIMB.P[s] ? window.EMT_SIMB.P[s].n : s);

    d.elementos.forEach(e => {
      if (e.noCot || e.s === "punto") return;
      if (esPoste(e.s)) {
        const sit = situacion(d, e, cfg, m);
        if (esProyectado(e.s)) cosa(e.s, 1, etiqueta(e));
        if (!sit) { if (esProyectado(e.s)) postes.push({ e, sit: null, est: null, propia: false }); return; }
        const sug = estructuraSugerida(cat, sit, op, cfg);
        const propia = e.est != null && e.est !== "";
        const est = propia ? (e.est === "-" ? "-" : cat.estructuras.find(x => x.codigo === e.est) || null) : sug;
        postes.push({ e, sit, sug, est, propia });
        if (est === "-") return;
        if (est) sumar({ tipo: "e", id: est.id, codigo: est.codigo, nombre: est.nombre }, 1, etiqueta(e));
        else faltar("poste:" + sit.sit + ":" + (sit.fases >= 2 ? 3 : 1), `Estructura ${SITUACION[sit.sit].toLowerCase()} ${sit.fases >= 2 ? "trifásica" : "monofásica"} ${op.calibre} ${op.kv} kV`, 1, etiqueta(e), "", e.id);
        return;
      }
      if (e.s === "trafo_pr") {
        const kva = Number(e.kva || 0);
        const t = kva && cat.estructuras.find(x => x.clase === "transformador" && Number(x.kva) === kva && Number(x.voltaje_kv) === Number(op.kv));
        if (t) sumar({ tipo: "e", id: t.id, codigo: t.codigo, nombre: t.nombre }, 1, e.cod || null);
        else faltar("trafo:" + (kva || "?"), kva ? `Transformador ${kva} kVA ${op.kv} kV` : "Transformador sin kVA: tóquelo en el plano y escoja los kVA", 1, e.cod || null, "", e.id);
        return;
      }
      if (e.s === "corta_pr") { cosa(`corta_pr|${op.kv}`, 1, e.cod || null); return; }
      if (["ret_ancla_s", "ret_ancla_d", "ret_vert_s", "ret_vert_d", "ret_poste", "pararrayos", "para_linea", "seccionador", "tierra", "anillo_tierra"].includes(e.s)) cosa(e.s, 1, e.cod || null);
    });

    const h = 1 + Number(cfg.holgura || 0) / 100;
    const cable = { mt: 0, triplex: 0, bt: 0 }, metrosMT = { mt1f: 0, mt2f: 0, mt3f: 0 };
    d.lineas.forEach(l => {
      if (l.e !== "proyectado") return;
      const mts = largo(d, l, m);
      if (MT[l.t]) { metrosMT[l.t] += mts; cable.mt += mts * Number(cfg.conductores[l.t] || MT[l.t]); }
      else if (l.t === "triplex") cable.triplex += mts;
      else if (l.t === "bt") cable.bt += mts;
    });
    const redondo = x => Math.ceil(x * h);
    if (cable.mt > 0) cosa(`cable|${op.calibre}`, redondo(cable.mt), `${Math.round(cable.mt)} m + ${cfg.holgura} %`, "m");
    if (cable.triplex > 0) cosa(`triplex|${op.triplex}`, redondo(cable.triplex), `${Math.round(cable.triplex)} m + ${cfg.holgura} %`, "m");
    if (cable.bt > 0) cosa("bt", redondo(cable.bt), `${Math.round(cable.bt)} m + ${cfg.holgura} %`, "m");

    const lineaM = Object.values(metrosMT).reduce((a, b) => a + b, 0);
    return {
      op, postes, filas: [...filas.values()].sort((a, b) => (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, "es") : a.tipo === "e" ? -1 : 1)), sin: [...sin.values()],
      resumen: { postes: postes.filter(x => esProyectado(x.e.s)).length, trafos: d.elementos.filter(e => e.s === "trafo_pr" && !e.noCot).length, metros: Math.round(lineaM + cable.triplex + cable.bt) }
    };
  }

  function partidasDe(conteo) {
    return conteo.filas.map(f => f.tipo === "e" ? { estructura_id: f.id, material_id: null, descripcion: "", cantidad: f.cantidad, costo_materiales: 0, mano_obra: 0, precio_unitario: 0, del_plano: true } : { estructura_id: null, material_id: f.id, descripcion: "", cantidad: f.cantidad, costo_materiales: 0, mano_obra: 0, precio_unitario: 0, del_plano: true });
  }
  function aplicarConteo(c, conteo) {
    const antes = c.partidas.filter(p => p.del_plano).length;
    c.partidas = [...c.partidas.filter(p => !p.del_plano), ...partidasDe(conteo)];
    return { antes, ahora: conteo.filas.length };
  }

  Object.assign(D, { SITUACION_POSTE: SITUACION, KVA_TRAFO: KVA, COSAS_CONTEO: COSAS, ajustesConteo, guardarAjustesConteo, opcionesConteo: opcionesPlano, situacionPoste: situacion, estructuraSugerida, contarPlano: contar, aplicarConteo, tipoEstructura: tipoDe });
})();
