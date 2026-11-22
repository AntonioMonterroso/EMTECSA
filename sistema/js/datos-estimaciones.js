"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.estimaciones";
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;
  const t = s => String(s == null ? "" : s).trim();
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const masDias = (f, n) => { const [y, m, d] = f.split("-").map(Number); const x = new Date(y, m - 1, d + (Number(n) || 0)); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  const cantTxt = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const ESTADOS = { borrador: "Borrador", enviada: "Esperando al cliente", aprobada: "Aprobada", anulada: "Anulada" };

  const vacio = () => ({ v: 1, sig: { x: 1 }, config: [], est: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const numCfg = c => c && ({ ...c, contrato: Number(c.contrato), anticipo: Number(c.anticipo), garantia_pct: Number(c.garantia_pct) });
  const numEst = e => ({ ...e, pct_acum: Number(e.pct_acum), bruto: Number(e.bruto), anticipo: Number(e.anticipo), garantia: Number(e.garantia), neto: Number(e.neto) });

  async function leerObra(obraId) {
    if (!nube) { const d = leer(); return { cfg: numCfg(d.config.find(c => c.obra_id === obraId)) || null, lista: d.est.filter(e => e.obra_id === obraId).map(numEst) }; }
    const [c, e] = await Promise.all([sb.from("estimacion_config").select("*").eq("obra_id", obraId).maybeSingle(), sb.from("estimaciones").select("*").eq("obra_id", obraId).order("correlativo")]);
    if (c.error || e.error) throw new Error("No se pudieron leer las estimaciones.");
    return { cfg: numCfg(c.data), lista: e.data.map(numEst) };
  }

  async function renglonesObra(obra, excluir) {
    let l = null, grupos = {}, contratoCot = null, conIva = true, cot = null;
    if (obra.cotizacion_id) {
      cot = await D.cotizacion(obra.cotizacion_id);
      if (cot) {
        const k = D.calcularCotizacion(cot, await D.catalogo());
        l = [
          ...k.partidas.filter(p => p.incluida !== false).map((p, i) => ({ k: "p" + (p.id != null ? p.id : i), d: t(p.descripcion) || "Partida", c: Number(p.cantidad), u: r2(p.precio_unitario), g: "cot", estructura_id: p.estructura_id || null, material_id: p.material_id || null })),
          ...(cot.cargos || []).map((g, i) => ({ k: "g" + (g.id != null ? g.id : i), d: t(g.descripcion) || "Transporte y equipo", c: 1, u: r2(g.monto), g: "cot" }))
        ].filter(x => x.c > 0 && x.u > 0);
        const b = r2(l.reduce((a, x) => a + x.c * x.u, 0));
        if (b > 0) grupos.cot = { base: b, total: k.total }; else l = null;
        contratoCot = k.total; conIva = !!cot.iva;
      }
    }
    let extra = 0;
    const ocs = D.ordenesCambio ? (await D.ordenesCambio(obra.id)).filter(x => x.estado === "aprobada" && x.id !== excluir) : [];
    for (const oc of ocs) {
      if (oc.tipo === "adicional") {
        extra = r2(extra + oc.total);
        if (l) {
          const g = "oc" + oc.id, rs = oc.renglones.map((r, i) => ({ k: `oc${oc.id}:${i}`, d: `${r.d} · ${oc.numero}`, c: r.c, u: r.u, g })).filter(r => r.c > 0 && r.u > 0);
          const b = r2(rs.reduce((a, x) => a + x.c * x.u, 0));
          if (b > 0) { l.push(...rs); grupos[g] = { base: b, total: oc.total }; }
        }
      } else {
        extra = r2(extra - oc.total);
        if (l) oc.renglones.forEach(r => {
          const z = r.k ? l.find(y => y.k === r.k) : null; if (!z) return;
          const g = grupos[z.g], f = g.base > 0 ? g.total / g.base : 1;
          z.c = r3(z.c - r.c); g.total = r2(g.total - r2(r.c * z.u * f)); g.base = r2(g.base - r.c * z.u);
        });
      }
    }
    const renglones = l ? l.filter(x => x.c > 0) : null;
    return { renglones: renglones && renglones.length ? renglones : null, grupos, contratoCot, conIva, extra, aumento: cot ? Number(cot.aumento_pct) || 0 : null, precios: cot ? cot.precios || null : null };
  }

  function calcular(avance, ctx, prevs) {
    const { cfg, renglones } = ctx;
    const ult = prevs[prevs.length - 1] || null;
    const antes = (ult && ult.avance) || {};
    const pctAnt = ult ? Number(ult.pct_acum) : 0;
    let pct, filas = null;
    if (renglones) {
      filas = renglones.map(r => {
        const ant = Number(antes[r.k]) || 0;
        const v = avance[r.k];
        const acum = v == null || v === "" ? ant : Number(String(v).replace(/,/g, ""));
        return { k: r.k, d: r.d, c: r.c, u: r.u, g: r.g, ant: r3(ant), acum: r3(acum), per: r3(acum - ant) };
      });
      for (const f of filas) {
        if (!isFinite(f.acum) || f.acum < 0) throw new Error(`Revise la cantidad de «${f.d}».`);
        if (f.acum > f.c + 1e-9) throw new Error(`«${f.d}» pasa de lo contratado (${cantTxt(f.c)}). Lo que sea adicional va en una orden de cambio.`);
        if (f.acum < f.ant - 1e-9) throw new Error(`«${f.d}» no puede bajar de lo que ya se estimó antes (${cantTxt(f.ant)}).`);
      }
      const val = {}; filas.forEach(f => { val[f.g] = (val[f.g] || 0) + f.acum * f.u; });
      const acumExacto = Object.entries(ctx.grupos).reduce((a, [g, x]) => a + (x.base > 0 ? x.total * (val[g] || 0) / x.base : 0), 0);
      pct = filas.every(f => f.acum >= f.c - 1e-9) ? 100 : acumExacto / cfg.contrato * 100;
    } else {
      pct = Number(String(avance.general == null ? "" : avance.general).replace(/,/g, ""));
      if (!isFinite(pct) || pct < 0 || pct > 100) throw new Error("Escriba el avance de la obra entre 0 y 100 %.");
      if (pct < pctAnt - 1e-9) throw new Error(`El avance no puede bajar del ${cantTxt(pctAnt)} % que ya se estimó.`);
    }
    const exacto = Math.min(100, pct);
    pct = Math.min(100, r3(pct));
    const completo = exacto >= 99.9995;
    const brutoPrev = r2(prevs.reduce((a, e) => a + e.bruto, 0));
    const antPrev = r2(prevs.reduce((a, e) => a + e.anticipo, 0));
    const brutoAcum = completo ? cfg.contrato : r2(cfg.contrato * exacto / 100);
    const bruto = r2(brutoAcum - brutoPrev);
    const quedaAnt = r2(Math.max(0, cfg.anticipo - antPrev));
    const anticipo = completo ? quedaAnt : Math.min(r2(bruto * cfg.anticipo / cfg.contrato), quedaAnt);
    const garantia = r2(bruto * cfg.garantia_pct / 100);
    return { filas, pct_ant: pctAnt, pct_acum: pct, brutoPrev, brutoAcum, bruto, anticipo, garantia, neto: r2(bruto - anticipo - garantia) };
  }

  async function estimacionesDe(obra) {
    const [{ cfg: cfg0, lista }, rg] = await Promise.all([leerObra(obra.id), renglonesObra(obra)]);
    const cfg = cfg0 ? { ...cfg0, contrato_base: cfg0.contrato, contrato: r2(cfg0.contrato + rg.extra) } : null;
    lista.sort((a, b) => a.correlativo - b.correlativo);
    const vigentes = lista.filter(e => e.estado !== "anulada");
    const aprobadas = vigentes.filter(e => e.estado === "aprobada");
    const ult = vigentes[vigentes.length - 1] || null;
    return {
      ...rg, cfg, lista, vigentes, aprobadas,
      pendiente: vigentes.find(e => e.estado === "borrador" || e.estado === "enviada") || null,
      pctAcum: ult ? ult.pct_acum : 0,
      estimado: r2(vigentes.reduce((a, e) => a + e.bruto, 0)),
      aprobado: r2(aprobadas.reduce((a, e) => a + e.bruto, 0)),
      retenido: r2(aprobadas.reduce((a, e) => a + e.garantia, 0)),
      anticipoDesc: r2(aprobadas.reduce((a, e) => a + e.anticipo, 0))
    };
  }

  async function guardarConfigEst(obra, c, quitarPartes) {
    const x = await estimacionesDe(obra);
    const datos = { contrato: r2(c.contrato), anticipo: r2(c.anticipo), garantia_pct: Number(c.garantia_pct) || 0 };
    if (!(datos.contrato > 0)) throw new Error("Escriba el total del contrato.");
    if (datos.anticipo < 0 || datos.anticipo >= datos.contrato) throw new Error("El anticipo tiene que ser menor que el total del contrato.");
    if (datos.garantia_pct < 0 || datos.garantia_pct > 20) throw new Error("La garantía va de 0 a 20 %.");
    if (x.cfg && x.vigentes.length) throw new Error("Ya hay estimaciones: para cambiar esto primero anule las estimaciones.");
    if (quitarPartes && quitarPartes.length) {
      const r = await D.resumenCobros();
      const quedan = r.partes.filter(p => p.obra_id === obra.id && (p.orden || 0) < 100 && !quitarPartes.includes(p.id)).sort((a, b) => a.orden - b.orden);
      await D.guardarPlan(obra.id, quedan.map(p => ({ id: p.id, descripcion: p.descripcion, porcentaje: p.porcentaje, monto: p.monto, vence: p.vence })));
    }
    if (!nube) {
      const d = leer(); const y = d.config.find(z => z.obra_id === obra.id);
      if (y) Object.assign(y, datos, { actualizado: new Date().toISOString() }); else d.config.push({ obra_id: obra.id, ...datos, garantia_parte_id: null, creado: new Date().toISOString() });
      escribir(d); return;
    }
    await ok(x.cfg ? await sb.from("estimacion_config").update({ ...datos, actualizado: new Date().toISOString() }).eq("obra_id", obra.id) : await sb.from("estimacion_config").insert({ obra_id: obra.id, ...datos }), "No se pudo guardar cómo se cobra la obra.");
  }

  async function quitarConfigEst(obra) {
    const x = await estimacionesDe(obra);
    if (x.lista.some(e => e.estado !== "anulada" && e.estado !== "borrador")) throw new Error("Ya hay estimaciones mandadas o aprobadas: anúlelas primero.");
    if (!nube) { const d = leer(); d.config = d.config.filter(c => c.obra_id !== obra.id); d.est = d.est.filter(e => e.obra_id !== obra.id || e.estado === "anulada"); escribir(d); return; }
    await ok(await sb.from("estimaciones").delete().eq("obra_id", obra.id).eq("estado", "borrador"), "No se pudo quitar.");
    await ok(await sb.from("estimacion_config").delete().eq("obra_id", obra.id), "No se pudo quitar.");
  }


  function armarDatos(obra, cli, x, e, k) {
    return {
      numero: e.numero, correlativo: e.correlativo, fecha: e.fecha, desde: e.desde, hasta: e.hasta,
      obra: { numero: obra.numero, titulo: obra.titulo || "" }, cliente: cli ? (cli.razon_social || cli.nombre) : "",
      filas: k.filas ? k.filas.map(f => ({ d: f.d, c: f.c, ant: f.ant, per: f.per, acum: f.acum })) : null,
      pct_ant: k.pct_ant, pct_acum: k.pct_acum, contrato: x.cfg.contrato, anticipo_total: x.cfg.anticipo, garantia_pct: x.cfg.garantia_pct,
      bruto_prev: k.brutoPrev, bruto_acum: k.brutoAcum, bruto: k.bruto, anticipo: k.anticipo, garantia: k.garantia, neto: k.neto,
      con_iva: x.conIva, notas: e.notas || null
    };
  }

  async function guardarEstimacion(obra, e0) {
    const x = await estimacionesDe(obra);
    if (!x.cfg) throw new Error("Primero escoja «Cobrar por estimaciones».");
    const viejo = e0.id ? x.lista.find(e => e.id === e0.id) : null;
    if (e0.id && (!viejo || viejo.estado !== "borrador")) throw new Error("Solo se puede cambiar una estimación en borrador.");
    if (!e0.id && x.pendiente) throw new Error(`Termine primero la ${x.pendiente.numero}.`);
    const correlativo = viejo ? viejo.correlativo : (x.lista.reduce((a, e) => Math.max(a, e.correlativo), 0) + 1);
    const prevs = x.vigentes.filter(e => e.correlativo < correlativo);
    const k = calcular(e0.avance || {}, x, prevs);
    if (!(k.bruto > 0)) throw new Error("No hay avance nuevo desde la estimación anterior.");
    const fecha = fechaO(e0.fecha) || hoy(), desde = fechaO(e0.desde), hasta = fechaO(e0.hasta);
    if (desde && hasta && hasta < desde) throw new Error("El período termina antes de empezar.");
    const avance = k.filas ? Object.fromEntries(k.filas.map(f => [f.k, f.acum])) : { general: k.pct_acum };
    const cli = await D.cliente(obra.cliente_id).catch(() => null);
    const fila = { fecha, desde, hasta, avance, pct_acum: k.pct_acum, bruto: k.bruto, anticipo: k.anticipo, garantia: k.garantia, neto: k.neto, notas: t(e0.notas) || null, actualizado: new Date().toISOString() };
    if (!nube) {
      const d = leer();
      if (viejo) { const y = d.est.find(z => z.id === viejo.id); Object.assign(y, fila); y.datos = armarDatos(obra, cli, x, y, k); escribir(d); return y.id; }
      const y = { id: d.sig.x++, obra_id: obra.id, numero: await D.numeroDe("est", d.est), correlativo, estado: "borrador", aprobado: null, parte_id: null, creado: new Date().toISOString(), ...fila };
      y.datos = armarDatos(obra, cli, x, y, k); d.est.push(y); escribir(d); return y.id;
    }
    if (viejo) { await ok(await sb.from("estimaciones").update({ ...fila, datos: armarDatos(obra, cli, x, { ...viejo, ...fila }, k) }).eq("id", viejo.id), "No se pudo guardar la estimación."); return viejo.id; }
    const nums = await ok(await sb.from("estimaciones").select("numero"), "No se pudo guardar la estimación.");
    const numero = await D.numeroDe("est", nums);
    const r = await ok(await sb.from("estimaciones").insert({ obra_id: obra.id, numero, correlativo, estado: "borrador", ...fila, datos: armarDatos(obra, cli, x, { numero, correlativo, ...fila }, k) }).select("id").single(), "No se pudo guardar la estimación.");
    return r.id;
  }

  async function una(id) {
    if (!nube) { const e = leer().est.find(z => z.id === id); if (!e) throw new Error("Esa estimación ya no existe."); return numEst(e); }
    const e = await ok(await sb.from("estimaciones").select("*").eq("id", id).maybeSingle(), "No se pudo leer la estimación.");
    if (!e) throw new Error("Esa estimación ya no existe."); return numEst(e);
  }
  async function poner(id, cambios) {
    if (!nube) { const d = leer(); Object.assign(d.est.find(z => z.id === id), cambios, { actualizado: new Date().toISOString() }); escribir(d); return; }
    await ok(await sb.from("estimaciones").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id), "No se pudo guardar la estimación.");
  }

  async function quitarEstimacion(id) {
    const e = await una(id); if (e.estado !== "borrador") throw new Error("Solo se quita una estimación en borrador.");
    if (!nube) { const d = leer(); d.est = d.est.filter(z => z.id !== id); escribir(d); return; }
    await ok(await sb.from("estimaciones").delete().eq("id", id), "No se pudo quitar la estimación.");
  }

  async function mandarEstimacion(id) { const e = await una(id); if (e.estado !== "borrador" && e.estado !== "enviada") throw new Error("Esta estimación ya no se puede mandar."); if (e.estado === "borrador") await poner(id, { estado: "enviada" }); }
  async function regresarBorrador(id) { const e = await una(id); if (e.estado !== "enviada") throw new Error("Solo se regresa una estimación que está esperando al cliente."); await poner(id, { estado: "borrador" }); }

  async function aprobarEstimacion(obra, id, nombre, puesto, por) {
    const e = await una(id);
    if (e.estado !== "borrador" && e.estado !== "enviada") throw new Error("Esta estimación ya no se puede aprobar.");
    const n = t(nombre).replace(/\s+/g, " ");
    if (n.length < 3) throw new Error("Escriba el nombre de quien la aprobó.");
    const cli = await D.cliente(obra.cliente_id).catch(() => null);
    const parte_id = e.neto > 0 ? await D.agregarParte(obra.id, { descripcion: `Estimación ${e.correlativo} · ${e.numero}`, monto: e.neto, vence: masDias(hoy(), cli && cli.dias_credito), orden: 100 + e.correlativo }) : null;
    await poner(id, { estado: "aprobada", parte_id, aprobado: { nombre: n, puesto: t(puesto).replace(/\s+/g, " ") || null, fecha: new Date().toISOString(), en: "sistema", por: t(por) || null } });
  }

  async function anularEstimacion(obra, id, motivo) {
    if (!t(motivo)) throw new Error("Escriba por qué se anula.");
    const x = await estimacionesDe(obra);
    const e = x.lista.find(z => z.id === id); if (!e || e.estado === "anulada") throw new Error("Esa estimación ya no existe.");
    if (x.vigentes[x.vigentes.length - 1].id !== id) throw new Error("Anule primero las estimaciones que van después de esta.");
    if (x.cfg.garantia_parte_id) throw new Error("Ya se cobró la garantía retenida: quite primero ese cobro.");
    if (e.parte_id) {
      const r = await D.resumenCobros(); const p = r.partes.find(z => z.id === e.parte_id);
      if (p && p.pagado > 0) throw new Error("Esta estimación ya tiene pagos. Anule primero los recibos.");
      if (p) await D.quitarParte(p.id);
    }
    await poner(id, { estado: "anulada", motivo_anulado: t(motivo), parte_id: null });
  }

  async function cobrarGarantia(obra) {
    const x = await estimacionesDe(obra);
    if (!x.cfg || !(x.retenido > 0)) throw new Error("No hay garantía retenida.");
    if (x.cfg.garantia_parte_id) throw new Error("La garantía retenida ya está en Por cobrar.");
    if (x.pendiente) throw new Error(`Termine primero la ${x.pendiente.numero}.`);
    const pid = await D.agregarParte(obra.id, { descripcion: "Devolución de garantía retenida", monto: x.retenido, vence: hoy(), orden: 200 });
    if (!nube) { const d = leer(); d.config.find(c => c.obra_id === obra.id).garantia_parte_id = pid; escribir(d); return; }
    await ok(await sb.from("estimacion_config").update({ garantia_parte_id: pid, actualizado: new Date().toISOString() }).eq("obra_id", obra.id), "No se pudo guardar.");
  }

  Object.assign(D, { ESTADOS_EST: ESTADOS, CLAVE_EST: CLAVE, renglonesObra, estimacionesDe, calcularEstimacion: calcular, guardarConfigEst, quitarConfigEst, guardarEstimacion, quitarEstimacion, mandarEstimacion, regresarBorrador, aprobarEstimacion, anularEstimacion, cobrarGarantia, estimacion: una });
})();
