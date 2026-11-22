"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.clientes";
  const TIPOS = { industria: "Industria", comercio: "Comercio", gobierno: "Gobierno o municipalidad", residencial: "Residencial", distribuidora: "Distribuidora" };
  const DEPARTAMENTOS = ["Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"];

  const vacio = () => ({ v: 1, cambios: false, sig: { c: 1, s: 1, k: 1, q: 1 }, clientes: [], sitios: [], contactos: [], equipos: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  const limpio = s => String(s == null ? "" : s).trim().replace(/\s+/g, " ");
  const o = s => limpio(s) || null;

  function normalNit(t) {
    const n = String(t || "").toUpperCase().replace(/[\s.-]/g, "");
    return n === "CF" || n === "C/F" ? "CF" : n;
  }
  function nitValido(t) {
    const n = normalNit(t);
    if (n === "CF") return true;
    if (!/^\d{1,12}[\dK]$/.test(n)) return false;
    const cuerpo = n.slice(0, -1), dv = n.slice(-1);
    let suma = 0;
    for (let i = 0; i < cuerpo.length; i++) suma += Number(cuerpo[i]) * (cuerpo.length + 1 - i);
    const r = (11 - (suma % 11)) % 11;
    return (r === 10 ? "K" : String(r)) === dv;
  }
  const nitBonito = t => { const n = normalNit(t); return n === "CF" || n.length < 2 ? n : n.slice(0, -1) + "-" + n.slice(-1); };

  function coordsDe(texto) {
    const t = String(texto || "");
    const m = t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) || t.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) || t.match(/[?&](?:q|query|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/) || t.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
    if (!m) return null;
    const lat = Number(m[1]), lng = Number(m[2]);
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  }

  const esCorto = t => /^\s*https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(String(t || ""));
  const largos = new Map();
  async function resolverMapa(texto) {
    const t = String(texto || "").trim();
    const c = coordsDe(t);
    if (c || !esCorto(t)) return c;
    if (!nube) throw new Error("Los enlaces cortos de Maps se leen cuando la base está conectada. Pegue las coordenadas o el enlace largo.");
    if (!largos.has(t)) largos.set(t, sb.rpc("expandir_mapa", { p_url: t.split(/\s/)[0] }).then(r => { if (r.error) throw new Error("No se pudo abrir ese enlace de Maps. Revise que esté completo."); return r.data; }).catch(e => { largos.delete(t); throw e; }));
    const largo = await largos.get(t);
    return largo ? coordsDe(largo) : null;
  }

  function siguienteCodigo(lista) {
    const n = lista.map(x => Number((String(x.codigo).match(/^CLI-(\d+)$/) || [])[1] || 0)).reduce((a, b) => Math.max(a, b), 0);
    return "CLI-" + String(n + 1).padStart(3, "0");
  }

  function revisarCliente(c, lista) {
    const nombre = limpio(c.nombre), nit = normalNit(c.nit), codigo = limpio(c.codigo).toUpperCase();
    if (!nombre) throw new Error("Escriba el nombre del cliente.");
    if (!nit) throw new Error("Escriba el NIT, o CF si no tiene.");
    if (!codigo) throw new Error("Escriba el código del cliente.");
    if (nit !== "CF" && lista.some(x => x.id !== c.id && normalNit(x.nit) === nit)) throw new Error(`Ya hay un cliente con el NIT ${nitBonito(nit)}.`);
    if (lista.some(x => x.id !== c.id && x.codigo.toUpperCase() === codigo)) throw new Error(`Ya hay un cliente con el código ${codigo}.`);
    if (c.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio(c.correo))) throw new Error("Revise el correo del cliente.");
    const dias = c.dias_credito == null || c.dias_credito === "" ? 0 : Number(c.dias_credito);
    if (!Number.isInteger(dias) || dias < 0) throw new Error("Los días de crédito van en números enteros.");
    if (c.limite_credito != null && !(c.limite_credito >= 0)) throw new Error("El límite de crédito no puede ser negativo.");
    const retPct = c.ret_iva_pct == null || c.ret_iva_pct === "" ? 15 : Number(String(c.ret_iva_pct).replace(/[%,\s]/g, ""));
    if (c.agente_iva && !(retPct > 0 && retPct <= 100)) throw new Error("El porcentaje de retención de IVA va de 1 a 100.");
    return { codigo, nombre, razon_social: o(c.razon_social), nit, tipo: TIPOS[c.tipo] ? c.tipo : "industria", direccion: o(c.direccion), telefono: o(c.telefono), correo: o(c.correo), dias_credito: dias, limite_credito: c.limite_credito == null ? null : Number(c.limite_credito), notas: o(c.notas), departamento: o(c.departamento), municipio: o(c.municipio), agente_iva: !!c.agente_iva, ret_iva_pct: c.agente_iva ? retPct : 15 };
  }
  function revisarSitio(s) {
    const nombre = limpio(s.nombre);
    if (!nombre) throw new Error("Escriba el nombre del sitio, por ejemplo «Planta Villa Nueva».");
    const c = s.mapa ? coordsDe(s.mapa) : null;
    if (s.mapa && !c) throw new Error("No se encontró la ubicación en el enlace. Pegue el enlace de Google Maps o escriba «latitud, longitud».");
    const g = window.EMT_GEO ? window.EMT_GEO.revisar(s.departamento, s.municipio) : { departamento: s.departamento, municipio: s.municipio };
    return { nombre, direccion: o(s.direccion), municipio: o(g.municipio), departamento: o(g.departamento), lat: c ? c.lat : null, lng: c ? c.lng : null };
  }
  function revisarContacto(k) {
    const nombre = limpio(k.nombre);
    if (!nombre) throw new Error("Escriba el nombre del contacto.");
    if (!o(k.telefono) && !o(k.correo)) throw new Error("Escriba al menos un teléfono o un correo.");
    if (k.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio(k.correo))) throw new Error("Revise el correo del contacto.");
    return { nombre, puesto: o(k.puesto), telefono: o(k.telefono), correo: o(k.correo), sitio_id: k.sitio_id || null, principal: !!k.principal };
  }
  function revisarEquipo(q) {
    const anio = q.anio == null || q.anio === "" ? null : Number(q.anio);
    if (anio != null && !(Number.isInteger(anio) && anio >= 1950 && anio <= 2100)) throw new Error("Revise el año del equipo.");
    const kva = q.kva == null || q.kva === "" ? null : Number(String(q.kva).replace(/,/g, ""));
    if (kva != null && !(kva > 0)) throw new Error("Los kVA van en números mayores que cero.");
    return { tipo: ["transformador", "tablero", "medidor", "otro"].includes(q.tipo) ? q.tipo : "otro", kva, fases: q.fases ? Number(q.fases) : null, voltaje_primario: o(q.voltaje_primario), voltaje_secundario: o(q.voltaje_secundario), marca: o(q.marca), serie: o(q.serie), anio, notas: o(q.notas) };
  }

  async function nubeOk(r, msg) { if (r.error) throw new Error(/duplicate|unique/i.test(r.error.message) ? "Ya existe un cliente con ese NIT o código." : msg); return r.data; }

  async function clientes() {
    if (!nube) {
      const d = leer();
      return d.clientes.map(c => ({ ...c,
        sitios: d.sitios.filter(s => s.cliente_id === c.id).length,
        contactos: d.contactos.filter(k => k.cliente_id === c.id),
        equipos: d.equipos.filter(q => d.sitios.some(s => s.id === q.sitio_id && s.cliente_id === c.id)).length }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }
    const r = await sb.from("clientes").select("*, sitios (id, equipos (id)), contactos (nombre, telefono, correo)").order("nombre");
    const l = await nubeOk(r, "No se pudo leer la lista de clientes.");
    return l.map(c => ({ ...c, sitios: c.sitios.length, equipos: c.sitios.reduce((a, s) => a + s.equipos.length, 0) }));
  }

  async function cliente(id) {
    if (!nube) {
      const d = leer();
      const c = d.clientes.find(x => x.id === id);
      if (!c) return null;
      const sitios = d.sitios.filter(s => s.cliente_id === id).map(s => ({ ...s, equipos: d.equipos.filter(q => q.sitio_id === s.id) }));
      return { ...c, sitios, contactos: d.contactos.filter(k => k.cliente_id === id).sort((a, b) => Number(b.principal) - Number(a.principal) || a.nombre.localeCompare(b.nombre, "es")) };
    }
    const r = await sb.from("clientes").select("*, sitios (*, equipos (*)), contactos (*)").eq("id", id).maybeSingle();
    const c = await nubeOk(r, "No se pudo leer el cliente.");
    if (c) c.contactos.sort((a, b) => Number(b.principal) - Number(a.principal) || a.nombre.localeCompare(b.nombre, "es"));
    return c;
  }

  async function guardarCliente(c) {
    if (!nube) {
      const d = leer(); const ok = revisarCliente(c, d.clientes);
      if (c.id) Object.assign(d.clientes.find(x => x.id === c.id), ok);
      else { c.id = d.sig.c++; d.clientes.push({ id: c.id, activo: true, creado: new Date().toISOString(), ...ok }); }
      escribir(d); return c.id;
    }
    const lista = (await nubeOk(await sb.from("clientes").select("id, codigo, nit"), "No se pudo revisar el NIT."));
    const ok = revisarCliente(c, lista);
    const r = c.id ? await sb.from("clientes").update(ok).eq("id", c.id).select("id").single() : await sb.from("clientes").insert(ok).select("id").single();
    return (await nubeOk(r, "No se pudo guardar el cliente.")).id;
  }

  async function guardarSitio(s) {
    if (s.mapa && esCorto(s.mapa)) { const k = await resolverMapa(s.mapa); if (!k) throw new Error("No se encontró la ubicación en ese enlace de Maps."); s = { ...s, mapa: `${k.lat}, ${k.lng}` }; }
    const ok = revisarSitio(s);
    if (!nube) {
      const d = leer();
      if (s.id) Object.assign(d.sitios.find(x => x.id === s.id), ok);
      else { s.id = d.sig.s++; d.sitios.push({ id: s.id, cliente_id: s.cliente_id, ...ok }); }
      escribir(d); return s.id;
    }
    const r = s.id ? await sb.from("sitios").update(ok).eq("id", s.id).select("id").single() : await sb.from("sitios").insert({ ...ok, cliente_id: s.cliente_id }).select("id").single();
    return (await nubeOk(r, "No se pudo guardar el sitio.")).id;
  }

  async function guardarContacto(k) {
    const ok = revisarContacto(k);
    if (!nube) {
      const d = leer();
      if (ok.principal) d.contactos.filter(x => x.cliente_id === k.cliente_id && x.id !== k.id).forEach(x => { x.principal = false; });
      if (k.id) Object.assign(d.contactos.find(x => x.id === k.id), ok);
      else { k.id = d.sig.k++; d.contactos.push({ id: k.id, cliente_id: k.cliente_id, ...ok }); }
      escribir(d); return k.id;
    }
    if (ok.principal) await nubeOk(await sb.from("contactos").update({ principal: false }).eq("cliente_id", k.cliente_id).neq("id", k.id || 0), "No se pudo guardar el contacto.");
    const r = k.id ? await sb.from("contactos").update(ok).eq("id", k.id).select("id").single() : await sb.from("contactos").insert({ ...ok, cliente_id: k.cliente_id }).select("id").single();
    return (await nubeOk(r, "No se pudo guardar el contacto.")).id;
  }

  async function guardarEquipo(q) {
    const ok = revisarEquipo(q);
    if (!nube) {
      const d = leer();
      if (q.id) Object.assign(d.equipos.find(x => x.id === q.id), ok);
      else { q.id = d.sig.q++; d.equipos.push({ id: q.id, sitio_id: q.sitio_id, ...ok }); }
      escribir(d); return q.id;
    }
    const r = q.id ? await sb.from("equipos").update(ok).eq("id", q.id).select("id").single() : await sb.from("equipos").insert({ ...ok, sitio_id: q.sitio_id }).select("id").single();
    return (await nubeOk(r, "No se pudo guardar el equipo.")).id;
  }

  async function archivarCliente(id, archivado) {
    if (!nube) { const d = leer(); const c = d.clientes.find(x => x.id === id); if (!c) throw new Error("Ese cliente ya no existe."); c.activo = !archivado; escribir(d); return; }
    await nubeOk(await sb.from("clientes").update({ activo: !archivado }).eq("id", id), "No se pudo archivar el cliente.");
  }

  async function quitar(tabla, id) {
    if (!["sitios", "contactos", "equipos"].includes(tabla)) throw new Error("No se puede quitar eso.");
    if (!nube) {
      const d = leer();
      if (tabla === "sitios") { if (d.equipos.some(q => q.sitio_id === id)) throw new Error("Ese sitio tiene equipos. Quítelos primero."); d.contactos.forEach(k => { if (k.sitio_id === id) k.sitio_id = null; }); }
      d[tabla] = d[tabla].filter(x => x.id !== id); escribir(d); return;
    }
    if (tabla === "sitios") { const e = await sb.from("equipos").select("id", { count: "exact", head: true }).eq("sitio_id", id); if (e.count) throw new Error("Ese sitio tiene equipos. Quítelos primero."); }
    await nubeOk(await sb.from(tabla).delete().eq("id", id), "No se pudo quitar.");
  }

  async function codigoNuevo() { const l = nube ? await nubeOk(await sb.from("clientes").select("codigo"), "") : leer().clientes; return siguienteCodigo(l); }

  Object.assign(D, { TIPOS, DEPARTAMENTOS, normalNit, nitValido, nitBonito, coordsDe, resolverMapa, clientes, cliente, guardarCliente, guardarSitio, guardarContacto, guardarEquipo, quitar, codigoNuevo, archivarCliente });
})();
