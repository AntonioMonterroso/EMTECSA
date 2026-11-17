"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.enlaces";
  const ANIO = 365 * 86400;
  const vacio = () => ({ v: 1, sig: { e: 1, ev: 1 }, enlaces: [], eventos: [] });
  const CLAVE_AT = "emtecsa.sistema.enlaces-atendidos";
  const atendidos = () => { try { return JSON.parse(localStorage.getItem(CLAVE_AT)) || {}; } catch (e) { return {}; } };
  const leer = () => {
    let d = null; try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) {}
    if (!d || d.v !== 1) d = vacio();
    const at = atendidos(); d.eventos.forEach(x => { if (at[x.id]) { x.atendido = true; x.atendido_en = at[x.id]; } });
    return d;
  };
  const escribir = d => { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo. Revise el espacio del navegador."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const canal = "BroadcastChannel" in window ? new BroadcastChannel("emtecsa-enlaces") : null;

  const lineas = t => String(t || "").split(/\n/).map(x => x.replace(/^[\s•\-–*]+/, "").trim()).filter(Boolean);
  const venceDe = c => { const [y, m, d] = String(c.fecha).slice(0, 10).split("-").map(Number); const f = new Date(y, m - 1, d + (Number(c.vigencia_dias) || 0)); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`; };
  const hoyGT = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });

  function publico({ c, k, cli, emp, contacto, sitio, cat }) {
    const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
    const totDe = kk => ({ subtotal: kk.subtotal, cargos: kk.cargos, imp_pct: c.imprevistos_pct, imprevistos: kk.imprevistos, desc_pct: c.descuento_tipo === "pct" ? Number(c.descuento) : null, descuento: kk.descuento, con_iva: !!c.iva, neto: kk.neto, iva: kk.iva, total: kk.total });
    const es = !c.eleccion && cat ? D.escenariosCotizacion(c, cat) : null;
    if (es && es.hay) k = es.base;
    const gruposN = es && es.hay ? Object.fromEntries([null, ...es.opciones.map(x => "o:" + x.id), ...es.extras.map(x => "x:" + x.id)].map(g => [g || "", D.nombreGrupo(c, g)])) : null;
    return {
      opciones: es && es.hay ? { lista: es.opciones.map(o => ({ id: o.id, nombre: o.nombre, tot: totDe(o.k) })), extras: es.extras.map(x => ({ id: x.id, nombre: x.nombre, monto: x.monto })), grupos: gruposN } : null,
      numero: c.numero, titulo: String(c.titulo || "").trim(), fecha: String(c.fecha).slice(0, 10), vigencia_dias: Number(c.vigencia_dias), vence: venceDe(c), foto: c.foto || "torre-luna-2",
      cliente: cli ? { nombre: cli.nombre, razon_social: cli.razon_social || null } : null,
      contacto: contacto ? { nombre: contacto.nombre, puesto: contacto.puesto || null } : null,
      sitio: sitio ? { nombre: sitio.nombre, lugar: [sitio.municipio, sitio.departamento].filter(Boolean).join(", ") || null } : null,
      empresa: { nombre: emp.nombre || "EMTECSA", razon_social: emp.razon_social || null, nit: emp.nit || null, telefono: emp.telefono || null, correo: emp.correo || null, web: emp.web || null, ciudad: emp.ciudad || null, firma_nombre: emp.firma_nombre || null, firma_puesto: emp.firma_puesto || null },
      partidas: k.partidas.filter(p => (es && es.hay) || p.incluida !== false).map(p => ({ d: p.descripcion, c: Number(p.cantidad), u: r2(p.precio_unitario), t: r2(p.total), g: es && es.hay ? p.grupo || null : null })),
      cargos: (c.cargos || []).map(g => ({ d: String(g.descripcion || "").trim(), m: r2(g.monto) })),
      tot: totDe(k),
      incluye: lineas(c.alcance_incluye), excluye: lineas(c.alcance_excluye),
      condiciones: { forma_pago: String((c.condiciones || {}).forma_pago || "").trim() || null, tiempo_entrega: String((c.condiciones || {}).tiempo_entrega || "").trim() || null, garantia: String((c.condiciones || {}).garantia || "").trim() || null },
      notas: String(c.notas || "").trim() || null
    };
  }
  function huella(datos) {
    const s = JSON.stringify(datos);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }
  function nuevoToken() {
    const b = crypto.getRandomValues(new Uint8Array(30));
    return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  const urlDe = token => new URL("../propuesta/#" + token, location.href).href;

  async function enlaceDe(cotId) {
    if (!nube) { const d = leer(); const e = d.enlaces.filter(x => x.cotizacion_id === cotId).sort((a, b) => b.id - a.id)[0]; return e ? { ...e, eventos: d.eventos.filter(x => x.enlace_id === e.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))) } : null; }
    const r = await sb.from("enlaces").select("*").eq("cotizacion_id", cotId).order("id", { ascending: false }).limit(1).maybeSingle();
    const e = await ok(r, "No se pudo leer el enlace del cliente.");
    if (!e) return null;
    const ev = await ok(await sb.from("enlace_eventos").select("*").eq("enlace_id", e.id).order("fecha", { ascending: false }), "No se pudo leer el enlace del cliente.");
    return { ...e, eventos: ev };
  }

  async function publicar(ctx, { expediente }) {
    const { c, cli } = ctx;
    const ya = await enlaceDe(c.id);
    if (ya && ya.aprobado) throw new Error("El cliente ya la aprobó; ese enlace ya no se cambia.");
    const datos = publico(ctx);
    if (datos.vence < hoyGT()) throw new Error("Con esa fecha y vigencia la propuesta ya venció. Cambie la fecha o los días de vigencia.");
    const token = ya ? ya.token : nuevoToken();
    const archivos = [];
    const subir = async (cual, nombre, bytes) => {
      const ref = `enlaces/${token}/${cual}.pdf`;
      const blob = new Blob([bytes], { type: "application/pdf" });
      await D.guardarBlob(ref, blob, "application/pdf");
      archivos.push({ cual, nombre, tam: blob.size, ref, url: nube ? await D.urlFirmada(ref, ANIO) : null });
    };
    await subir("propuesta", window.EMT_PDF.nombreArchivo(c, cli), await window.EMT_PDF.generar(ctx));
    if (expediente) await subir("expediente", window.EMT_EXPEDIENTE.nombreArchivo(c, cli), await window.EMT_EXPEDIENTE.armar(ctx));
    if (ya) for (const a of ya.archivos || []) if (!archivos.some(x => x.ref === a.ref)) await D.quitarArchivo(a.ref);
    const fila = { datos, huella: huella(datos), archivos, vence: datos.vence, activo: true, actualizado: new Date().toISOString() };
    if (!nube) {
      const d = leer();
      if (ya) { const i = d.enlaces.findIndex(x => x.id === ya.id); d.enlaces[i] = { ...d.enlaces[i], ...fila }; }
      else d.enlaces.push({ id: d.sig.e++, cotizacion_id: c.id, token, ...fila, creado: fila.actualizado, vistas: 0, primera_vista: null, ultima_vista: null, descargas: {}, aprobado: null });
      escribir(d);
    } else if (ya) await ok(await sb.from("enlaces").update(fila).eq("id", ya.id), "No se pudo guardar el enlace.");
    else await ok(await sb.from("enlaces").insert({ cotizacion_id: c.id, token, ...fila }), "No se pudo guardar el enlace.");
    return enlaceDe(c.id);
  }

  async function cambiarEnlace(id, cambios) {
    const f = {};
    if (cambios.vence != null) { if (!/^\d{4}-\d{2}-\d{2}$/.test(cambios.vence)) throw new Error("Escoja la fecha."); if (cambios.vence < hoyGT()) throw new Error("La fecha ya pasó. Escoja una de hoy en adelante."); f.vence = cambios.vence; }
    if (cambios.activo != null) f.activo = !!cambios.activo;
    f.actualizado = new Date().toISOString();
    if (!nube) { const d = leer(); const e = d.enlaces.find(x => x.id === id); if (!e) throw new Error("Ese enlace ya no existe."); Object.assign(e, f); escribir(d); return; }
    await ok(await sb.from("enlaces").update(f).eq("id", id), "No se pudo cambiar el enlace.");
  }

  async function pendientesEnlace() {
    if (!nube) {
      const d = leer();
      const cots = Object.fromEntries((await D.cotizaciones()).map(c => [c.id, c]));
      return d.eventos.filter(x => !x.atendido && cots[x.cotizacion_id]).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map(x => ({ ...x, cotizacion: cots[x.cotizacion_id] }));
    }
    const r = await sb.from("enlace_eventos").select("*, cotizaciones (id, numero, titulo, total, clientes (nombre))").eq("atendido", false).order("fecha", { ascending: false }).limit(60);
    return (await ok(r, "No se pudieron leer los avisos de los clientes.")).map(x => ({ ...x, cotizacion: x.cotizaciones && { ...x.cotizaciones, cliente: x.cotizaciones.clientes } }));
  }
  async function atenderEventos(ids) {
    if (!ids.length) return;
    if (!nube) { const at = atendidos(), f = new Date().toISOString(); ids.forEach(i => { at[i] = at[i] || f; }); try { localStorage.setItem(CLAVE_AT, JSON.stringify(at)); } catch (e) {} return; }
    await ok(await sb.from("enlace_eventos").update({ atendido: true, atendido_en: new Date().toISOString(), atendido_por: (await sb.auth.getUser()).data.user?.id || null }).in("id", ids), "No se pudo marcar como atendido.");
  }
  async function resumenEnlaces() {
    if (!nube) return Object.fromEntries(leer().enlaces.map(e => [e.cotizacion_id, { vistas: e.vistas, ultima_vista: e.ultima_vista, aprobado: !!e.aprobado, activo: e.activo }]));
    const r = await sb.from("enlaces").select("cotizacion_id, vistas, ultima_vista, activo, aprobado->>fecha");
    return Object.fromEntries((await ok(r, "No se pudo leer el seguimiento.")).map(e => [e.cotizacion_id, { vistas: e.vistas, ultima_vista: e.ultima_vista, aprobado: !!e.fecha, activo: e.activo }]));
  }

  const oyentes = new Set();
  const emitir = m => oyentes.forEach(fn => { try { fn(m); } catch (e) {} });
  if (canal) canal.onmessage = e => emitir(e.data);
  let suscrito = false;
  function alEnlace(fn) {
    oyentes.add(fn);
    if (nube && !suscrito) {
      suscrito = true;
      try { sb.channel("enlace-eventos").on("postgres_changes", { event: "INSERT", schema: "public", table: "enlace_eventos" }, p => emitir({ tipo: p.new.tipo, cotizacion_id: p.new.cotizacion_id, id: p.new.id })).subscribe(); } catch (e) {}
    }
    return () => oyentes.delete(fn);
  }

  Object.assign(D, { CLAVES_ENLACES: [CLAVE, CLAVE_AT], enlacePublico: publico, huellaEnlace: huella, venceDe, hoyGT, urlEnlace: urlDe, enlaceDe, publicarEnlace: publicar, cambiarEnlace, pendientesEnlace, atenderEventos, resumenEnlaces, alEnlace });
})();
