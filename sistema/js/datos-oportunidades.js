"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.oportunidades";
  const ETAPAS = { nueva: { n: "Nueva", p: 10 }, visita: { n: "Visita", p: 25 }, cotizando: { n: "Cotizando", p: 50 }, negociacion: { n: "Negociación", p: 75 }, ganada: { n: "Ganada", p: 100 }, perdida: { n: "Perdida", p: 0 } };
  const ABIERTAS = ["nueva", "visita", "cotizando", "negociacion"];
  const ORIGENES = { cliente: "Cliente actual", referido: "Referido", visita: "Visita o llamada", licitacion: "Licitación", tienda: "Tienda o catálogo", web: "Página web", otro: "Otro" };
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const vacio = () => ({ v: 1, sig: 1, ops: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const num = x => ({ ...x, monto: x.monto == null ? null : Number(x.monto), probabilidad: x.probabilidad == null ? null : Number(x.probabilidad) });
  const probDe = x => x.probabilidad != null ? x.probabilidad : ETAPAS[x.etapa].p;

  async function oportunidades() {
    let l;
    if (!nube) {
      const d = leer(); l = d.ops.map(num);
      const cots = Object.fromEntries((await D.cotizaciones().catch(() => [])).map(c => [c.id, c]));
      let cambio = false;
      d.ops.forEach(x => {
        const c = x.cotizacion_id && cots[x.cotizacion_id]; if (!c) return;
        const nueva = c.estado === "aprobada" ? "ganada" : c.estado === "rechazada" && x.etapa !== "ganada" ? "perdida" : c.estado === "enviada" && (x.etapa === "nueva" || x.etapa === "visita") ? "cotizando" : x.etapa;
        if (nueva !== x.etapa) { x.etapa = nueva; if (nueva === "ganada" || nueva === "perdida") x.cerrada = x.cerrada || hoy(); if (nueva === "ganada" && c.total) x.monto = Number(c.total); cambio = true; }
      });
      if (cambio) escribir(d);
      l = d.ops.map(num);
    } else l = (await ok(await sb.from("oportunidades").select("*").order("creado", { ascending: false }), "No se pudieron leer las oportunidades.")).map(num);
    const cl = Object.fromEntries((await D.clientes().catch(() => [])).map(c => [c.id, c]));
    return l.map(x => ({ ...x, cliente: x.cliente_id ? cl[x.cliente_id] || null : null, quien: x.cliente_id && cl[x.cliente_id] ? cl[x.cliente_id].nombre : (x.prospecto && x.prospecto.nombre) || "Sin nombre", prob: probDe(x) }));
  }

  function resumen(l) {
    const ab = l.filter(x => ABIERTAS.includes(x.etapa));
    const mes = hoy().slice(0, 7), h90 = (d => { d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); })(new Date());
    const cerr = l.filter(x => (x.etapa === "ganada" || x.etapa === "perdida") && (x.cerrada || "") >= h90);
    const gan = cerr.filter(x => x.etapa === "ganada").length;
    return {
      abiertas: ab.length,
      abierto: r2(ab.reduce((a, x) => a + (x.monto || 0), 0)),
      ponderado: r2(ab.reduce((a, x) => a + (x.monto || 0) * x.prob / 100, 0)),
      ganadoMes: r2(l.filter(x => x.etapa === "ganada" && String(x.cerrada || "").slice(0, 7) === mes).reduce((a, x) => a + (x.monto || 0), 0)),
      tasa: cerr.length ? Math.round(gan / cerr.length * 100) : null, cerradas90: cerr.length,
      vencidas: ab.filter(x => x.cierre && x.cierre < hoy())
    };
  }

  async function guardarOportunidad(x) {
    const p = x.prospecto || {};
    const datos = {
      titulo: t(x.titulo), cliente_id: x.cliente_id ? Number(x.cliente_id) : null,
      prospecto: x.cliente_id ? null : { nombre: t(p.nombre), nit: o(p.nit), telefono: o(p.telefono), correo: o(p.correo), direccion: o(p.direccion), departamento: o(p.departamento), municipio: o(p.municipio) },
      origen: ORIGENES[x.origen] ? x.origen : "otro", etapa: ETAPAS[x.etapa] ? x.etapa : "nueva",
      monto: x.monto == null || x.monto === "" ? null : r2(x.monto), probabilidad: x.probabilidad == null || x.probabilidad === "" ? null : Math.round(Number(x.probabilidad)),
      cierre: fechaO(x.cierre), responsable: x.responsable || null, responsable_nombre: o(x.responsable_nombre), notas: o(x.notas), actualizado: new Date().toISOString()
    };
    if (!datos.titulo) throw new Error("Escriba qué trabajo es, por ejemplo «Transformador 75 kVA para bodega nueva».");
    if (!datos.cliente_id && !datos.prospecto.nombre) throw new Error("Escoja el cliente o escriba el nombre del prospecto.");
    if (datos.prospecto && datos.prospecto.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.prospecto.correo)) throw new Error("Revise el correo del prospecto.");
    if (datos.monto != null && !(datos.monto >= 0)) throw new Error("Revise el monto estimado.");
    if (datos.probabilidad != null && !(datos.probabilidad >= 0 && datos.probabilidad <= 100)) throw new Error("La probabilidad va de 0 a 100 %.");
    if ((datos.etapa === "ganada" || datos.etapa === "perdida")) datos.cerrada = x.cerrada || hoy(); else datos.cerrada = null;
    if (!nube) { const d = leer(); if (x.id) Object.assign(d.ops.find(z => z.id === x.id), datos); else { const id = d.sig++; d.ops.push({ id, ...datos, cotizacion_id: null, pedido_id: null, motivo: null, creado: new Date().toISOString() }); escribir(d); return id; } escribir(d); return x.id; }
    if (x.id) { await ok(await sb.from("oportunidades").update(datos).eq("id", x.id), "No se pudo guardar la oportunidad."); return x.id; }
    return (await ok(await sb.from("oportunidades").insert(datos).select("id").single(), "No se pudo guardar la oportunidad.")).id;
  }
  async function poner(id, cambios) {
    if (!nube) { const d = leer(); Object.assign(d.ops.find(z => z.id === id), cambios, { actualizado: new Date().toISOString() }); escribir(d); return; }
    await ok(await sb.from("oportunidades").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id), "No se pudo guardar la oportunidad.");
  }
  async function moverOportunidad(id, etapa, motivo) {
    if (!ETAPAS[etapa]) throw new Error("Esa etapa no existe.");
    if (etapa === "perdida" && !t(motivo)) throw new Error("Escoja por qué se perdió.");
    await poner(id, { etapa, motivo: etapa === "perdida" ? t(motivo) : null, cerrada: etapa === "ganada" || etapa === "perdida" ? hoy() : null });
  }
  async function quitarOportunidad(id) {
    if (!nube) { const d = leer(); d.ops = d.ops.filter(z => z.id !== id); escribir(d); return; }
    await ok(await sb.from("oportunidades").delete().eq("id", id), "No se pudo quitar la oportunidad.");
  }
  async function cotizarOportunidad(x, datosCliente) {
    let cid = x.cliente_id;
    if (!cid) {
      const p = { ...(x.prospecto || {}), ...(datosCliente || {}) };
      cid = await D.guardarCliente({ codigo: await D.codigoNuevo(), nombre: p.nombre, nit: p.nit || "CF", telefono: p.telefono, correo: p.correo, direccion: p.direccion, departamento: p.departamento, municipio: p.municipio, dias_credito: 0 });
    }
    const cot = await D.crearCotizacion({ cliente_id: cid, titulo: x.titulo });
    await poner(x.id, { cliente_id: cid, cotizacion_id: cot, etapa: ABIERTAS.indexOf(x.etapa) < 2 ? "cotizando" : x.etapa });
    return cot;
  }
  async function ligarCotizacion(id, cotId) { await poner(id, { cotizacion_id: cotId }); }

  Object.assign(D, { ETAPAS_OP: ETAPAS, ABIERTAS_OP: ABIERTAS, ORIGENES_OP: ORIGENES, oportunidades, resumenOportunidades: resumen, guardarOportunidad, moverOportunidad, quitarOportunidad, cotizarOportunidad, ligarCotizacion, probOportunidad: probDe });
})();
