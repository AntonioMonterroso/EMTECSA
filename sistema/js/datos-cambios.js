"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.cambios";
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;
  const t = s => String(s == null ? "" : s).trim();
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const masDias = (f, n) => { const [y, m, d] = f.split("-").map(Number); const x = new Date(y, m - 1, d + (Number(n) || 0)); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  const cantTxt = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const TIPOS = { adicional: "Agrega trabajo", deductivo: "Quita trabajo" };

  const vacio = () => ({ v: 1, sig: { x: 1 }, oc: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const num = x => ({ ...x, subtotal: Number(x.subtotal), total: Number(x.total), dias_plazo: Number(x.dias_plazo) || 0, renglones: (x.renglones || []).map(r => ({ ...r, c: Number(r.c), u: Number(r.u) })) });

  async function ordenesCambio(obraId) {
    if (!nube) return leer().oc.filter(x => x.obra_id === obraId).map(num).sort((a, b) => a.correlativo - b.correlativo);
    return (await ok(await sb.from("ordenes_cambio").select("*").eq("obra_id", obraId).order("correlativo"), "No se pudieron leer las órdenes de cambio.")).map(num);
  }

  async function cambiosDe(obra) {
    const [lista, cfg] = await Promise.all([ordenesCambio(obra.id), D.estimacionesDe(obra)]);
    const vigentes = lista.filter(x => x.estado !== "anulada");
    const aprobadas = vigentes.filter(x => x.estado === "aprobada");
    const signo = x => x.tipo === "deductivo" ? -x.total : x.total;
    return {
      lista, vigentes, aprobadas, est: cfg, porEst: !!cfg.cfg,
      pendiente: vigentes.find(x => x.estado === "borrador" || x.estado === "enviada") || null,
      neto: r2(aprobadas.reduce((a, x) => a + signo(x), 0)),
      adicional: r2(aprobadas.filter(x => x.tipo === "adicional").reduce((a, x) => a + x.total, 0)),
      deductivo: r2(aprobadas.filter(x => x.tipo === "deductivo").reduce((a, x) => a + x.total, 0))
    };
  }

  function calcularCambio(tipo, renglones, iva, base, ultAcum) {
    const l = renglones.map(r => ({ ...r, d: t(r.d), c: r3(String(r.c == null ? "" : r.c).replace(/,/g, "")), u: r2(String(r.u == null ? "" : r.u).replace(/[Q,\s]/g, "")) })).filter(r => r.c || r.d);
    if (!l.length) throw new Error(tipo === "deductivo" ? "Escriba cuánto se quita de al menos un renglón." : "Agregue al menos un renglón.");
    let subtotal = 0, total = 0, conFactor = false;
    for (const r of l) {
      if (!r.d) throw new Error("Cada renglón necesita su descripción.");
      if (!(r.c > 0)) throw new Error(`Revise la cantidad de «${r.d}».`);
      if (!(r.u >= 0)) throw new Error(`Revise el precio de «${r.d}».`);
      const obj = r.k && base && base.renglones ? base.renglones.find(z => z.k === r.k) : null;
      if (tipo === "deductivo" && obj) {
        const ya = Number((ultAcum || {})[r.k]) || 0;
        const max = r3(obj.c - ya);
        if (r.c > max + 1e-9) throw new Error(`De «${r.d}» se puede quitar hasta ${cantTxt(Math.max(0, max))}${ya ? ` (ya se estimaron ${cantTxt(ya)})` : ""}.`);
        const g = base.grupos[obj.g]; const f = g && g.base > 0 ? g.total / g.base : 1;
        r.u = obj.u; subtotal += r2(r.c * r.u); total += r2(r.c * r.u * f); conFactor = true;
      } else { subtotal += r2(r.c * r.u); }
    }
    subtotal = r2(subtotal);
    const ivaM = conFactor ? 0 : iva ? r2(subtotal * 0.12) : 0;
    total = conFactor ? r2(total) : r2(subtotal + ivaM);
    return { renglones: l.map(r => ({ k: r.k || null, d: r.d, c: r.c, u: r.u, ref: r.ref || null })), subtotal, iva: ivaM, total, conFactor };
  }


  async function guardarCambio(obra, x0) {
    const x = await cambiosDe(obra);
    const viejo = x0.id ? x.lista.find(z => z.id === x0.id) : null;
    if (x0.id && (!viejo || viejo.estado !== "borrador")) throw new Error("Solo se puede cambiar una orden en borrador.");
    if (!x0.id && x.pendiente) throw new Error(`Termine primero la ${x.pendiente.numero}.`);
    const tipo = x0.tipo === "deductivo" ? "deductivo" : "adicional";
    if (!t(x0.motivo)) throw new Error("Escriba qué pidió el cliente.");
    const dias = x0.dias_plazo === "" || x0.dias_plazo == null ? 0 : Number(x0.dias_plazo);
    if (!Number.isInteger(dias) || dias < 0) throw new Error("Los días de plazo van en números enteros.");
    const base = await D.renglonesObra(obra, viejo ? viejo.id : null);
    const ult = x.est.vigentes[x.est.vigentes.length - 1];
    const k = calcularCambio(tipo, x0.renglones || [], x0.iva !== false, base, ult ? ult.avance : {});
    const cli = await D.cliente(obra.cliente_id).catch(() => null);
    const correlativo = viejo ? viejo.correlativo : x.lista.reduce((a, z) => Math.max(a, z.correlativo), 0) + 1;
    const contratoAntes = x.porEst ? x.est.cfg.contrato : null;
    const fila = { fecha: fechaO(x0.fecha) || hoy(), tipo, motivo: t(x0.motivo), renglones: k.renglones, iva: k.conFactor ? true : x0.iva !== false, subtotal: k.subtotal, total: k.total, dias_plazo: dias, notas: t(x0.notas) || null, actualizado: new Date().toISOString() };
    const datos = n => ({ numero: n, correlativo, fecha: fila.fecha, tipo, motivo: fila.motivo, renglones: k.renglones.map(r => ({ d: r.d, c: r.c, u: r.u })), subtotal: k.subtotal, iva: k.iva, total: k.total, proporcional: k.conFactor, dias_plazo: dias, obra: { numero: obra.numero, titulo: obra.titulo || "" }, cliente: cli ? (cli.razon_social || cli.nombre) : "", contrato_antes: contratoAntes, contrato_despues: contratoAntes == null ? null : r2(contratoAntes + (tipo === "deductivo" ? -k.total : k.total)), notas: fila.notas });
    if (!nube) {
      const d = leer();
      if (viejo) { const y = d.oc.find(z => z.id === viejo.id); Object.assign(y, fila, { datos: datos(y.numero) }); escribir(d); return y.id; }
      const numero = await D.numeroDe("oc", d.oc);
      const y = { id: d.sig.x++, obra_id: obra.id, numero, correlativo, estado: "borrador", aprobado: null, parte_id: null, creado: new Date().toISOString(), ...fila, datos: datos(numero) };
      d.oc.push(y); escribir(d); return y.id;
    }
    if (viejo) { await ok(await sb.from("ordenes_cambio").update({ ...fila, datos: datos(viejo.numero) }).eq("id", viejo.id), "No se pudo guardar la orden de cambio."); return viejo.id; }
    const numero = await D.numeroDe("oc", await ok(await sb.from("ordenes_cambio").select("numero"), "No se pudo guardar la orden de cambio."));
    return (await ok(await sb.from("ordenes_cambio").insert({ obra_id: obra.id, numero, correlativo, estado: "borrador", ...fila, datos: datos(numero) }).select("id").single(), "No se pudo guardar la orden de cambio.")).id;
  }

  async function una(id) {
    if (!nube) { const e = leer().oc.find(z => z.id === id); if (!e) throw new Error("Esa orden de cambio ya no existe."); return num(e); }
    const e = await ok(await sb.from("ordenes_cambio").select("*").eq("id", id).maybeSingle(), "No se pudo leer la orden de cambio.");
    if (!e) throw new Error("Esa orden de cambio ya no existe."); return num(e);
  }
  async function poner(id, cambios) {
    if (!nube) { const d = leer(); Object.assign(d.oc.find(z => z.id === id), cambios, { actualizado: new Date().toISOString() }); escribir(d); return; }
    await ok(await sb.from("ordenes_cambio").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id), "No se pudo guardar la orden de cambio.");
  }
  async function quitarCambio(id) {
    const e = await una(id); if (e.estado !== "borrador") throw new Error("Solo se quita una orden en borrador.");
    if (!nube) { const d = leer(); d.oc = d.oc.filter(z => z.id !== id); escribir(d); return; }
    await ok(await sb.from("ordenes_cambio").delete().eq("id", id), "No se pudo quitar la orden de cambio.");
  }
  async function mandarCambio(id) { const e = await una(id); if (e.estado !== "borrador" && e.estado !== "enviada") throw new Error("Esta orden ya no se puede mandar."); if (e.estado === "borrador") await poner(id, { estado: "enviada" }); }
  async function regresarCambio(id) { const e = await una(id); if (e.estado !== "enviada") throw new Error("Solo se regresa una orden que está esperando al cliente."); await poner(id, { estado: "borrador" }); }

  async function aprobarCambio(obra, id, nombre, puesto, por) {
    const e = await una(id);
    if (e.estado !== "borrador" && e.estado !== "enviada") throw new Error("Esta orden ya no se puede aprobar.");
    const n = t(nombre).replace(/\s+/g, " "); if (n.length < 3) throw new Error("Escriba el nombre de quien la aprobó.");
    const x = await cambiosDe(obra);
    let parte_id = null;
    if (!x.porEst && e.total > 0) {
      const cli = await D.cliente(obra.cliente_id).catch(() => null);
      const ded = e.tipo === "deductivo";
      parte_id = await D.agregarParte(obra.id, { descripcion: `${ded ? "Deductivo" : "Orden de cambio"} · ${e.numero}`, monto: ded ? -e.total : e.total, vence: ded ? hoy() : masDias(hoy(), cli && cli.dias_credito), orden: 300 + e.correlativo });
    }
    await poner(id, { estado: "aprobada", parte_id, aprobado: { nombre: n, puesto: t(puesto).replace(/\s+/g, " ") || null, fecha: new Date().toISOString(), en: "sistema", por: t(por) || null } });
  }

  async function anularCambio(obra, id, motivo) {
    if (!t(motivo)) throw new Error("Escriba por qué se anula.");
    const x = await cambiosDe(obra);
    const e = x.lista.find(z => z.id === id); if (!e || e.estado !== "aprobada") throw new Error("Solo se anula una orden aprobada.");
    if (x.aprobadas[x.aprobadas.length - 1].id !== id) throw new Error("Anule primero las órdenes de cambio que van después de esta.");
    if (x.porEst && e.aprobado && x.est.vigentes.some(s => String(s.creado || "") > String(e.aprobado.fecha))) throw new Error("Ya hay estimaciones hechas después de aprobar esta orden. Anúlelas primero.");
    if (e.parte_id) {
      const r = await D.resumenCobros(); const p = r.partes.find(z => z.id === e.parte_id);
      if (p && p.monto > 0 && p.pagado > 0) throw new Error("Esta orden ya tiene pagos. Anule primero los recibos.");
      if (p) await D.quitarParte(p.id);
    }
    await poner(id, { estado: "anulada", motivo_anulado: t(motivo), parte_id: null });
  }

  Object.assign(D, { TIPOS_OC: TIPOS, ordenesCambio, cambiosDe, calcularCambio, guardarCambio, cambio: una, quitarCambio, mandarCambio, regresarCambio, aprobarCambio, anularCambio });
})();
