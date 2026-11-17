"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.costos";
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;
  const leer = () => { let d = null; try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) {} return d && d.v === 1 ? d : { v: 1, cambios: false, sig: 1, jornadas: [] }; };
  const escribir = d => { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const numJ = x => ({ ...x, personas: Number(x.personas), dias: Number(x.dias), costo_dia: x.costo_dia == null ? null : Number(x.costo_dia) });

  async function jornadas(obraId) {
    if (!nube) return leer().jornadas.filter(x => obraId == null || x.obra_id === obraId).map(numJ);
    let q = sb.from("obra_jornadas").select("id, obra_id, fecha, cuadrilla, personas, dias, nota, creado_por, creado").order("fecha", { ascending: false });
    if (obraId != null) q = q.eq("obra_id", obraId);
    const [l, pr] = await Promise.all([q, sb.rpc("privado_jornadas", { p_obra: obraId == null ? null : obraId })]);
    const costos = Object.fromEntries(((pr && pr.data) || []).map(x => [x.id, x.costo_dia]));
    return (await ok(l, "No se pudieron leer los días de trabajo.")).map(x => numJ({ ...x, costo_dia: costos[x.id] == null ? null : costos[x.id] }));
  }
  async function guardarJornada(j) {
    const datos = { obra_id: j.obra_id, fecha: j.fecha || new Date().toISOString().slice(0, 10), cuadrilla: String(j.cuadrilla || "").trim().replace(/\s+/g, " "), personas: Number(j.personas), dias: Number(j.dias), costo_dia: j.costo_dia == null || j.costo_dia === "" ? null : Number(j.costo_dia), nota: String(j.nota || "").trim() || null };
    if (!datos.cuadrilla) throw new Error("Escriba quién trabajó, por ejemplo «Cuadrilla de Luis».");
    if (!(datos.personas >= 1 && datos.personas <= 50)) throw new Error("Las personas van de 1 a 50.");
    if (!(datos.dias > 0 && datos.dias <= 60)) throw new Error("Los días van de 0.5 a 60.");
    if (datos.costo_dia != null && !(datos.costo_dia >= 0)) throw new Error("Revise el costo del día.");
    if (!nube) { const d = leer(); if (j.id) Object.assign(d.jornadas.find(x => x.id === j.id), datos); else d.jornadas.push({ id: d.sig++, ...datos }); escribir(d); D.registrarHistorial && D.registrarHistorial(`${j.id ? "Cambió" : "Anotó"} ${datos.dias} ${datos.dias === 1 ? "día" : "días"} de ${datos.cuadrilla}`, "obra"); return; }
    const s2 = window.EMT_APP && window.EMT_APP.sesion();
    if (!D.puede(s2 && s2.perfil, "verCosto")) delete datos.costo_dia;
    await ok(j.id ? await sb.from("obra_jornadas").update(datos).eq("id", j.id) : await sb.from("obra_jornadas").insert(datos), "No se pudieron guardar los días de trabajo.");
  }
  async function quitarJornada(id) {
    if (!nube) { const d = leer(); d.jornadas = d.jornadas.filter(x => x.id !== id); escribir(d); return; }
    await ok(await sb.from("obra_jornadas").delete().eq("id", id), "No se pudo quitar.");
  }

  async function costosObra(obraId, base) {
    const o = base && base.o || await D.obra(obraId);
    if (!o) return null;
    const cat0 = base && base.cat || await D.catalogo();
    const [cot, jor, comp, r, emp] = await Promise.all([o.cotizacion_id ? D.cotizacion(o.cotizacion_id) : null, base && base.jor ? base.jor.filter(x => x.obra_id === obraId) : jornadas(obraId), D.filasCompras ? D.filasCompras(obraId).catch(() => []) : [], base && base.r || D.resumenCobros().catch(() => null), base && base.emp || D.empresa()]);
    const cat = cot ? await D.catalogoParaCotizacion(cat0, cot.id) : cat0;
    const k = cot ? D.calcularCotizacion(cot, cat) : null;
    const porMat = Object.fromEntries(cat.materiales.map(m => [m.id, m]));
    const filas = {};
    const fila = id => (filas[id] = filas[id] || { material: porMat[id], cotCant: 0, cotCostoU: null, previsto: 0, salio: 0, regreso: 0, pagadoU: null });
    if (k) k.materiales.forEach(m => { const f = fila(m.material.id); f.cotCant = m.cantidad; f.cotCostoU = m.costoU; });
    (o.previstos || []).forEach(p => { fila(p.material_id).previsto += Number(p.cantidad); });
    (o.movimientos || []).forEach(m => { fila(m.material_id)[m.tipo === "salida" ? "salio" : "regreso"] += Number(m.cantidad); });
    (comp || []).forEach(c => { if (c.precio_real != null) fila(c.material_id).pagadoU = Number(c.precio_real); });
    const hayMov = (o.movimientos || []).length > 0;
    const materiales = Object.entries(filas).filter(([, f]) => f.material).map(([id, f]) => {
      const usado = r3(f.salio - f.regreso);
      const precioU = f.pagadoU != null ? f.pagadoU : f.cotCostoU != null ? f.cotCostoU : (f.material.costo != null ? Number(f.material.costo) : null);
      const cotizado = f.cotCostoU == null ? null : r2(f.cotCostoU * f.cotCant);
      const real = precioU == null ? null : r2(precioU * usado);
      return { id: Number(id), material: f.material, cotCant: f.cotCant, previsto: r3(f.previsto), usado, salio: r3(f.salio), regreso: r3(f.regreso), cotCostoU: f.cotCostoU, precioU, pagado: f.pagadoU != null, cotizado, real, dif: cotizado == null || real == null ? null : r2(real - cotizado), difCant: r3(usado - (f.cotCant || f.previsto)) };
    }).sort((a, b) => (b.dif || 0) - (a.dif || 0));
    const gastos = r ? (r.gastos || []).filter(g => g.obra_id === obraId) : [];
    const diaBase = Number(String(emp.costo_dia_persona || "").replace(/[Q,\s]/g, "")) || 0;
    const jorObra = (jor || []).map(j => ({ ...j, costoUsado: j.costo_dia != null ? j.costo_dia : diaBase, total: r2(j.personas * j.dias * (j.costo_dia != null ? j.costo_dia : diaBase)) }));
    const real = {
      materiales: hayMov ? r2(materiales.reduce((a, m) => a + (m.real || 0), 0)) : 0,
      gastos: r2(gastos.reduce((a, g) => a + Number(g.monto), 0)),
      mano: r2(jorObra.reduce((a, j) => a + j.total, 0))
    };
    real.total = r2(real.materiales + real.gastos + real.mano);
    const matCot = k ? (k.materiales.some(m => m.costo != null) ? r2(k.materiales.reduce((a, m) => a + (m.costo || 0), 0)) : k.costoMat) : 0;
    const cotizado = k ? { materiales: matCot, gastos: k.cargos, mano: k.manoObra, total: r2(matCot + k.cargos + k.manoObra) } : { materiales: 0, gastos: 0, mano: 0, total: 0 };
    const venta = k ? k.neto : 0;
    const umbral = Number(emp.umbral_costos || 10) || 10;
    const avance = cotizado.total ? r2(real.total / cotizado.total * 100) : null;
    return {
      o, cot, k, materiales, gastos, jornadas: jorObra, hayMov, cotizado, real, venta, umbral, avance,
      ganancia: { cotizada: r2(venta - cotizado.total), real: r2(venta - real.total) },
      pasada: !!(cotizado.total && real.total > cotizado.total * (1 + umbral / 100)),
      sinCostos: k ? k.materiales.some(m => m.costoU == null) : false
    };
  }

  async function resumenCostos() {
    const [obras, cat, jor, r, emp] = await Promise.all([D.obras(), D.catalogo(), jornadas(null), D.resumenCobros().catch(() => null), D.empresa()]);
    const l = [];
    for (const ob of obras) {
      const o = await D.obra(ob.id);
      if (!o) continue;
      const c = await costosObra(ob.id, { o, cat, jor, r, emp });
      if (c) l.push(c);
    }
    return l;
  }

  Object.assign(D, { jornadas, guardarJornada, quitarJornada, costosObra, resumenCostos });
})();
