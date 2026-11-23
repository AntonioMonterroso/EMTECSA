"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.programacion";
  const TIPOS_REC = { cuadrilla: "Cuadrilla", vehiculo: "Vehículo o equipo" };
  const TURNOS = { dia: "Todo el día", manana: "Mañana", tarde: "Tarde" };
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const vacio = () => ({ v: 1, sig: 1, recursos: [], prog: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }

  async function recursos() {
    const l = !nube ? leer().recursos : await ok(await sb.from("recursos").select("*"), "No se pudieron leer las cuadrillas y vehículos.");
    return l.slice().sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "cuadrilla" ? -1 : 1) || a.nombre.localeCompare(b.nombre, "es"));
  }
  async function guardarRecurso(x) {
    const datos = { tipo: TIPOS_REC[x.tipo] ? x.tipo : "cuadrilla", nombre: t(x.nombre), detalle: o(x.detalle), telefono: o(x.telefono), personas: x.personas === "" || x.personas == null ? null : Number(x.personas), activo: x.activo !== false };
    if (!datos.nombre) throw new Error(datos.tipo === "cuadrilla" ? "Escriba el nombre de la cuadrilla, por ejemplo «Cuadrilla de Luis»." : "Escriba el nombre del vehículo, por ejemplo «Canasta 1».");
    if (datos.personas != null && !(Number.isInteger(datos.personas) && datos.personas >= 1 && datos.personas <= 50)) throw new Error("Las personas van de 1 a 50.");
    const todos = await recursos();
    if (todos.some(r => r.id !== x.id && r.tipo === datos.tipo && r.nombre.toLowerCase() === datos.nombre.toLowerCase())) throw new Error(`Ya hay ${datos.tipo === "cuadrilla" ? "una cuadrilla" : "un vehículo"} con ese nombre.`);
    if (!nube) { const d = leer(); if (x.id) Object.assign(d.recursos.find(r => r.id === x.id), datos); else d.recursos.push({ id: d.sig++, ...datos }); escribir(d); return; }
    await ok(x.id ? await sb.from("recursos").update(datos).eq("id", x.id) : await sb.from("recursos").insert(datos), "No se pudo guardar.");
  }

  async function programacion(desde, hasta, obraId) {
    if (!nube) return leer().prog.filter(p => p.fecha >= desde && p.fecha <= hasta && (obraId == null || p.obra_id === obraId));
    let q = sb.from("programacion").select("*").gte("fecha", desde).lte("fecha", hasta);
    if (obraId != null) q = q.eq("obra_id", obraId);
    return ok(await q, "No se pudo leer la programación.");
  }
  const choca = (a, b) => a.turno === "dia" || b.turno === "dia" || a.turno === b.turno;
  async function asignar(x) {
    const datos = { fecha: fechaO(x.fecha), obra_id: Number(x.obra_id) || null, recurso_id: Number(x.recurso_id) || null, turno: TURNOS[x.turno] ? x.turno : "dia", nota: o(x.nota) };
    if (!datos.fecha) throw new Error("Escoja el día.");
    if (!datos.obra_id) throw new Error("Escoja la obra.");
    if (!datos.recurso_id) throw new Error("Escoja la cuadrilla o el vehículo.");
    const ese = await programacion(datos.fecha, datos.fecha);
    const otro = ese.find(p => p.id !== x.id && p.recurso_id === datos.recurso_id && choca(p, datos));
    if (otro) {
      const ob = await D.obra(otro.obra_id).catch(() => null);
      const rec = (await recursos()).find(r => r.id === datos.recurso_id);
      throw new Error(`${rec ? rec.nombre : "Ese recurso"} ya está ese día en ${ob ? ob.numero + (ob.titulo ? " · " + ob.titulo : "") : "otra obra"}${otro.turno !== "dia" ? ` (${TURNOS[otro.turno].toLowerCase()})` : ""}.`);
    }
    if (!nube) { const d = leer(); if (x.id) Object.assign(d.prog.find(p => p.id === x.id), datos); else d.prog.push({ id: d.sig++, ...datos, creado: new Date().toISOString() }); escribir(d); return; }
    const r = x.id ? await sb.from("programacion").update(datos).eq("id", x.id) : await sb.from("programacion").insert(datos);
    if (r.error) { const m = String(r.error.message || "").match(/choque:(.+)/); throw new Error(m ? `Ese recurso ya está ese día en ${m[1]}.` : "No se pudo guardar la programación."); }
  }
  async function quitarAsignacion(id) {
    if (!nube) { const d = leer(); d.prog = d.prog.filter(p => p.id !== id); escribir(d); return; }
    await ok(await sb.from("programacion").delete().eq("id", id), "No se pudo quitar.");
  }
  async function copiarSemana(desdeAnt, desdeNueva) {
    const sum = (f, n) => { const [y, m, d] = f.split("-").map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
    const ant = await programacion(desdeAnt, sum(desdeAnt, 6));
    let n = 0, saltadas = 0;
    for (const p of ant) { try { await asignar({ fecha: sum(p.fecha, 7), obra_id: p.obra_id, recurso_id: p.recurso_id, turno: p.turno, nota: p.nota }); n++; } catch (e) { saltadas++; } }
    return { n, saltadas };
  }

  Object.assign(D, { TIPOS_REC, TURNOS, recursos, guardarRecurso, programacion, asignar, quitarAsignacion, copiarSemana });
})();
