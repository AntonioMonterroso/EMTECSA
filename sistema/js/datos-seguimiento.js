"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.seguimiento";
  const MEDIOS = { llamada: "Llamada", whatsapp: "WhatsApp", correo: "Correo", visita: "Visita" };
  const MOTIVOS = { precio: "Precio", tiempo: "Tiempo de entrega", otro: "Se fue con otro", no_hizo: "No hizo la obra", sin_respuesta: "No contestó", cambio: "Cambió lo que necesitaba", otra: "Otra razón" };
  const leer = () => { let d = null; try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) {} return d && d.v === 1 ? d : { v: 1, cambios: false, sig: 1, contactos: [] }; };
  const escribir = d => { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const iso = f => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  const sumar = (s, n) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return iso(new Date(y, m - 1, d + n)); };
  const entre = (a, b) => { const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number); return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000); };
  const hoy = () => D.hoyGT ? D.hoyGT() : iso(new Date());
  const quien = () => { const s = window.EMT_APP && window.EMT_APP.sesion(); return s && s.perfil ? s.perfil.nombre : null; };

  async function contactos(cotId) {
    if (!nube) return leer().contactos.filter(x => cotId == null || x.cotizacion_id === cotId).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
    let q = sb.from("cotizacion_contactos").select("*").order("fecha", { ascending: false }).order("id", { ascending: false });
    if (cotId != null) q = q.eq("cotizacion_id", cotId);
    return ok(await q, "No se pudo leer el seguimiento.");
  }
  async function guardarContacto(k) {
    const cierre = k.medio === "cierre";
    const datos = { cotizacion_id: k.cotizacion_id, fecha: k.fecha || hoy(), medio: k.medio, nota: String(k.nota || "").trim() || null, proximo: cierre ? null : (k.proximo || null), motivo: cierre ? k.motivo : null };
    if (!cierre && !MEDIOS[datos.medio]) throw new Error("Escoja cómo se contactó.");
    if (cierre && !MOTIVOS[datos.motivo]) throw new Error("Escoja por qué no se ganó.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) throw new Error("Escoja la fecha.");
    if (datos.fecha > hoy()) throw new Error("La fecha del contacto no puede ser después de hoy.");
    if (datos.proximo && datos.proximo <= datos.fecha) throw new Error("El próximo contacto va después de la fecha de este.");
    if (!cierre && !datos.nota) throw new Error("Escriba qué dijo el cliente, aunque sea corto.");
    if (!nube) {
      const d = leer();
      if (k.id) { const x = d.contactos.find(z => z.id === k.id); if (!x) throw new Error("Ese contacto ya no existe."); Object.assign(x, datos); }
      else d.contactos.push({ id: d.sig++, ...datos, quien: quien(), creado: new Date().toISOString() });
      escribir(d); return;
    }
    await ok(k.id ? await sb.from("cotizacion_contactos").update(datos).eq("id", k.id) : await sb.from("cotizacion_contactos").insert({ ...datos, quien: quien() }), "No se pudo guardar el contacto.");
  }
  async function quitarContacto(id) {
    if (!nube) { const d = leer(); d.contactos = d.contactos.filter(x => x.id !== id); escribir(d); return; }
    await ok(await sb.from("cotizacion_contactos").delete().eq("id", id), "No se pudo quitar.");
  }

  function estado(c, lista, emp) {
    const h = hoy();
    const vence = D.venceDe(c);
    const primer = Math.max(0, parseInt(emp.seg_primer, 10) || 0), antes = Math.max(0, parseInt(emp.seg_antes, 10) || 0);
    const notas = lista.filter(x => x.medio !== "cierre");
    const cierre = lista.find(x => x.medio === "cierre") || null;
    const ult = notas[0] || null;
    let proximo = null, porque = "";
    if (ult && ult.proximo) { proximo = ult.proximo; porque = "Lo que quedó de acordar"; }
    else {
      const op = [];
      if (!notas.length) op.push([sumar(c.fecha, primer), "Primer contacto"]);
      const antesF = sumar(vence, -antes);
      if (!notas.some(x => x.fecha >= antesF)) op.push([antesF, "Antes de que venza"]);
      op.sort((a, b) => a[0].localeCompare(b[0]));
      if (op.length) [proximo, porque] = op[0];
    }
    if (proximo && proximo > vence) { proximo = vence; porque = "Antes de que venza"; }
    const vencida = c.estado === "enviada" && h > vence;
    const toca = c.estado === "enviada" && !vencida && proximo && proximo <= h;
    return { vence, vencida, proximo, porque, toca, atraso: toca ? entre(proximo, h) : 0, diasVencida: vencida ? entre(vence, h) : 0, ultimo: ult, cierre, n: notas.length };
  }

  async function pendientesSeguimiento() {
    const [cots, todos, emp] = await Promise.all([D.cotizaciones(), contactos(null), D.empresa()]);
    const porCot = {};
    todos.forEach(x => { (porCot[x.cotizacion_id] = porCot[x.cotizacion_id] || []).push(x); });
    return cots.filter(c => c.estado === "enviada").map(c => ({ c, s: estado(c, porCot[c.id] || [], emp) })).filter(x => x.s.toca || x.s.vencida)
      .sort((a, b) => Number(b.s.vencida) - Number(a.s.vencida) || b.s.atraso - a.s.atraso);
  }

  function telefonoWa(t) {
    let n = String(t || "").replace(/\D/g, "");
    if (n.length === 8) n = "502" + n;
    return n.length >= 10 ? n : null;
  }

  Object.assign(D, { MEDIOS_CONTACTO: MEDIOS, MOTIVOS_PERDIDA: MOTIVOS, CLAVE_SEGUIMIENTO: CLAVE, contactosCotizacion: contactos, guardarContacto, quitarContacto, estadoSeguimiento: estado, pendientesSeguimiento, telefonoWa, sumarDias: sumar });
})();
