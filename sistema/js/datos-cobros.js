"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.cobros";
  const FORMAS = { transferencia: "Transferencia", deposito: "Depósito", cheque: "Cheque", efectivo: "Efectivo" };
  const TIPOS_FIANZA = { sostenimiento: "Sostenimiento de oferta", anticipo: "Anticipo", cumplimiento: "Cumplimiento", calidad: "Calidad" };
  const TIPOS_GASTO = { viaticos: "Viáticos", combustible: "Combustible", equipo: "Grúa o equipo", subcontrato: "Subcontrato", materiales: "Materiales extra", otro: "Otro" };
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const t = s => String(s == null ? "" : s).trim();
  const o = s => t(s) || null;
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;

  const vacio = () => ({ v: 1, cambios: false, sig: { x: 1 }, partes: [], pagos: [], fianzas: [], gastos: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const num = x => ({ ...x, monto: Number(x.monto), ret_iva: Number(x.ret_iva) || 0, porcentaje: x.porcentaje == null ? null : Number(x.porcentaje) });
  const aplicado = p => r2(p.monto + (Number(p.ret_iva) || 0));

  async function todo() {
    if (!nube) { const d = leer(); return { partes: d.partes, pagos: d.pagos, fianzas: d.fianzas, gastos: d.gastos }; }
    const [p, g, f, x] = await Promise.all([sb.from("cobros_partes").select("*"), sb.from("pagos").select("*").order("numero"), sb.from("fianzas").select("*"), sb.from("gastos_obra").select("*")]);
    if (p.error || g.error) throw new Error("No se pudieron leer los cobros.");
    return { partes: p.data.map(num), pagos: g.data.map(num), fianzas: (f.data || []).map(num), gastos: (x.data || []).map(num) };
  }

  async function resumen() {
    const [b, obras] = await Promise.all([todo(), D.obras()]);
    const porObra = Object.fromEntries(obras.map(x => [x.id, x]));
    const pagado = {}, libre = {};
    b.pagos.filter(p => !p.anulado).forEach(p => {
      if (p.parte_id) pagado[p.parte_id] = r2((pagado[p.parte_id] || 0) + aplicado(p));
      else if (p.obra_id) libre[p.obra_id] = r2((libre[p.obra_id] || 0) + aplicado(p));
    });
    b.partes.forEach(p => { const x = pagado[p.id] || 0; if (x > p.monto) { libre[p.obra_id] = r2((libre[p.obra_id] || 0) + x - p.monto); pagado[p.id] = r2(p.monto); } });
    b.partes.slice().sort((x, y) => String(x.vence || "9999").localeCompare(String(y.vence || "9999")) || (x.orden || 0) - (y.orden || 0)).forEach(p => {
      const queda = libre[p.obra_id] || 0; if (!(queda > 0)) return;
      const toma = Math.min(queda, r2(p.monto - (pagado[p.id] || 0))); if (!(toma > 0)) return;
      pagado[p.id] = r2((pagado[p.id] || 0) + toma); libre[p.obra_id] = r2(queda - toma);
    });
    const partes = b.partes.map(p => {
      const ob = porObra[p.obra_id];
      const pag = pagado[p.id] || 0, saldo = r2(p.monto - pag);
      const venc = saldo > 0 && p.vence ? (p.vence < hoy() ? "vencido" : (new Date(p.vence) - new Date(hoy())) / 864e5 <= 7 ? "pronto" : "") : "";
      return { ...p, obra: ob || null, cliente: ob ? ob.cliente : null, cliente_id: ob ? ob.cliente_id : null, pagado: pag, saldo, venc };
    });
    const pendientes = partes.filter(p => p.saldo > 0).sort((a, b) => String(a.vence || "9999").localeCompare(String(b.vence || "9999")));
    const mes = hoy().slice(0, 7);
    return {
      ...b, partes, pendientes, obras: porObra,
      porCobrar: r2(pendientes.reduce((a, p) => a + p.saldo, 0)),
      vencido: r2(pendientes.filter(p => p.venc === "vencido").reduce((a, p) => a + p.saldo, 0)),
      cobradoMes: r2(b.pagos.filter(p => !p.anulado && String(p.fecha).slice(0, 7) === mes).reduce((a, p) => a + p.monto, 0)),
      fianzasPorVencer: b.fianzas.filter(f => !f.liberada && f.vence && (new Date(f.vence) - new Date(hoy())) / 864e5 <= 30)
    };
  }

  async function guardarPlan(obraId, partes) {
    const l = partes.map((p, i) => ({ id: p.id || null, descripcion: t(p.descripcion), porcentaje: p.porcentaje == null || p.porcentaje === "" ? null : Number(p.porcentaje), monto: r2(p.monto), vence: fechaO(p.vence), orden: i }));
    if (l.some(p => !p.descripcion)) throw new Error("Cada pago necesita su descripción, por ejemplo «Anticipo».");
    if (l.some(p => !(p.monto >= 0))) throw new Error("Revise los montos del plan de pagos.");
    const b = await todo();
    const conPagos = new Set(b.pagos.filter(x => !x.anulado && x.parte_id).map(x => x.parte_id));
    const quitadas = b.partes.filter(p => p.obra_id === obraId && (p.orden || 0) < 100 && !l.some(x => x.id === p.id));
    if (quitadas.some(p => conPagos.has(p.id))) throw new Error("No se puede quitar un pago del plan que ya tiene cobros registrados.");
    if (!nube) {
      const d = leer();
      d.partes = d.partes.filter(p => p.obra_id !== obraId || (p.orden || 0) >= 100 || l.some(x => x.id === p.id));
      l.forEach(p => { if (p.id) Object.assign(d.partes.find(x => x.id === p.id), p); else d.partes.push({ ...p, id: d.sig.x++, obra_id: obraId }); });
      escribir(d); return;
    }
    for (const p of quitadas) await ok(await sb.from("cobros_partes").delete().eq("id", p.id), "No se pudo cambiar el plan de pagos.");
    for (const p of l) {
      const { id, ...datos } = p;
      await ok(id ? await sb.from("cobros_partes").update(datos).eq("id", id) : await sb.from("cobros_partes").insert({ ...datos, obra_id: obraId }), "No se pudo guardar el plan de pagos.");
    }
  }

  async function agregarParte(obraId, p) {
    const datos = { obra_id: obraId, descripcion: t(p.descripcion), porcentaje: null, monto: r2(p.monto), vence: fechaO(p.vence), orden: Number(p.orden) || 100 };
    if (!nube) { const d = leer(); const id = d.sig.x++; d.partes.push({ id, ...datos }); escribir(d); return id; }
    return (await ok(await sb.from("cobros_partes").insert(datos).select("id").single(), "No se pudo agregar el cobro.")).id;
  }
  async function quitarParte(id) {
    if (!nube) { const d = leer(); d.partes = d.partes.filter(p => p.id !== id); escribir(d); return; }
    await ok(await sb.from("cobros_partes").delete().eq("id", id), "No se pudo quitar el cobro.");
  }


  async function registrarPago(p) {
    const datos = { cliente_id: p.cliente_id, obra_id: p.obra_id || null, parte_id: p.parte_id || null, fecha: fechaO(p.fecha) || hoy(), monto: r2(p.monto), forma: FORMAS[p.forma] ? p.forma : "transferencia", referencia: o(p.referencia), banco: o(p.banco), notas: o(p.notas), anulado: false, motivo_anulado: null };
    const ret = r2(p.ret_iva);
    if (ret) Object.assign(datos, { ret_iva: ret, const_iva: o(p.const_iva), const_ref: o(p.const_ref) });
    if (!datos.cliente_id) throw new Error("Falta el cliente del pago.");
    if (!(datos.monto > 0)) throw new Error("Escriba el monto que pagó el cliente.");
    if (ret < 0) throw new Error("La retención no puede ser negativa.");
    if (ret && !datos.const_iva) throw new Error("Escriba el número de la constancia de retención de IVA.");
    if (p.tope != null && r2(datos.monto + ret) > r2(p.tope) + 0.001) throw new Error(`El pago${ret ? " con la retención" : ""} pasa de lo que falta cobrar (${"Q " + r2(p.tope).toLocaleString("en-US", { minimumFractionDigits: 2 })}).`);
    if (!nube) { const d = leer(); const id = d.sig.x++; const numero = await D.numeroDe("rec", d.pagos); d.pagos.push({ id, numero, creado: new Date().toISOString(), ...datos }); escribir(d); return { id, numero }; }
    const nums = await ok(await sb.from("pagos").select("numero"), "No se pudo registrar el pago.");
    const r = await sb.from("pagos").insert({ ...datos, numero: await D.numeroDe("rec", nums) }).select("id, numero").single();
    return ok(r, "No se pudo registrar el pago.");
  }

  async function anularPago(id, motivo) {
    if (!t(motivo)) throw new Error("Escriba por qué se anula el recibo.");
    if (!nube) { const d = leer(); Object.assign(d.pagos.find(x => x.id === id), { anulado: true, motivo_anulado: t(motivo) }); escribir(d); return; }
    await ok(await sb.from("pagos").update({ anulado: true, motivo_anulado: t(motivo) }).eq("id", id), "No se pudo anular el recibo.");
  }

  async function guardarFianza(f) {
    const datos = { cliente_id: f.cliente_id, obra_id: f.obra_id || null, tipo: TIPOS_FIANZA[f.tipo] ? f.tipo : "cumplimiento", aseguradora: o(f.aseguradora), numero: o(f.numero), monto: r2(f.monto), emision: fechaO(f.emision), vence: fechaO(f.vence), liberada: !!f.liberada, notas: o(f.notas) };
    if (!datos.cliente_id) throw new Error("Escoja el cliente de la fianza.");
    if (!datos.vence) throw new Error("Escriba la fecha en que vence la fianza.");
    if (datos.emision && datos.vence < datos.emision) throw new Error("La fianza no puede vencer antes de emitirse.");
    if (!nube) { const d = leer(); if (f.id) Object.assign(d.fianzas.find(x => x.id === f.id), datos); else d.fianzas.push({ id: d.sig.x++, ...datos }); escribir(d); return; }
    await ok(f.id ? await sb.from("fianzas").update(datos).eq("id", f.id) : await sb.from("fianzas").insert(datos), "No se pudo guardar la fianza.");
  }

  async function guardarGasto(g) {
    const datos = { obra_id: g.obra_id, fecha: fechaO(g.fecha) || hoy(), tipo: TIPOS_GASTO[g.tipo] ? g.tipo : "otro", descripcion: t(g.descripcion), monto: r2(g.monto) };
    if (!datos.descripcion) throw new Error("Escriba en qué se gastó.");
    if (!(datos.monto > 0)) throw new Error("Escriba el monto del gasto.");
    if (!nube) { const d = leer(); if (g.id) { Object.assign(d.gastos.find(x => x.id === g.id), datos); escribir(d); return g.id; } const id = d.sig.x++; d.gastos.push({ id, ...datos }); escribir(d); return id; }
    if (g.id) { await ok(await sb.from("gastos_obra").update(datos).eq("id", g.id), "No se pudo guardar el gasto."); return g.id; }
    const r = await ok(await sb.from("gastos_obra").insert(datos).select("id").single(), "No se pudo guardar el gasto.");
    return r.id;
  }

  async function quitarGasto(id) {
    if (!nube) { const d = leer(); d.gastos = d.gastos.filter(x => x.id !== id); escribir(d); return; }
    await ok(await sb.from("gastos_obra").delete().eq("id", id), "No se pudo quitar el gasto.");
  }

  async function estadoCuenta(clienteId) {
    const r = await resumen();
    const mov = [];
    r.partes.filter(p => p.cliente_id === clienteId).forEach(p => mov.push({ fecha: p.vence || (p.obra && p.obra.fecha_inicio) || "", tipo: "cargo", texto: `${p.descripcion}${p.obra ? " · " + p.obra.numero : ""}`, cargo: p.monto, abono: 0, vence: p.vence, venc: p.venc }));
    const ped = D.pedidosTienda ? await D.pedidosTienda().catch(() => []) : [];
    ped.filter(p => p.clienteId === clienteId && p.pagoId && Number(p.total) > 0).forEach(p => { const h = (p.historia || []).find(x => x.estado === "en-marcha"); mov.push({ fecha: String((h && h.fecha) || p.actualizado || "").slice(0, 10), tipo: "cargo", texto: `Pedido ${p.id} de la tienda`, cargo: r2(p.total), abono: 0 }); });
    r.pagos.filter(p => p.cliente_id === clienteId && !p.anulado).forEach(p => mov.push({ fecha: p.fecha, tipo: "abono", texto: `Pago ${p.numero} · ${FORMAS[p.forma]}${p.referencia ? " " + p.referencia : ""}${p.ret_iva ? ` · retención de IVA ${"Q " + r2(p.ret_iva).toLocaleString("en-US", { minimumFractionDigits: 2 })}${p.const_iva ? ", constancia " + p.const_iva : ""}` : ""}`, cargo: 0, abono: aplicado(p) }));
    mov.sort((a, b) => String(a.fecha || "9999").localeCompare(String(b.fecha || "9999")) || (a.tipo === "cargo" ? -1 : 1));
    let s = 0; mov.forEach(m => { s = r2(s + m.cargo - m.abono); m.saldo = s; });
    const cargos = r2(mov.reduce((a, m) => a + m.cargo, 0)), abonos = r2(mov.reduce((a, m) => a + m.abono, 0));
    return { mov, cargos, abonos, saldo: r2(cargos - abonos), vencido: r2(r.pendientes.filter(p => p.cliente_id === clienteId && p.venc === "vencido").reduce((a, p) => a + p.saldo, 0)) };
  }

  const idbC = (() => {
    let a;
    const abrir = () => a || (a = new Promise((bien, mal) => { const r = indexedDB.open("emtecsa-cobros", 1); r.onupgradeneeded = () => r.result.createObjectStore("archivos"); r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error); }));
    const tx = (modo, fn) => abrir().then(db => new Promise((bien, mal) => { const x = db.transaction("archivos", modo); const q = fn(x.objectStore("archivos")); x.oncomplete = () => bien(q && q.result); x.onerror = () => mal(x.error); }));
    return { poner: (k, v) => tx("readwrite", s => s.put(v, k)), leer: k => tx("readonly", s => s.get(k)) };
  })();
  async function subirConstancia(file) {
    if (!file) return null;
    if (!/^image\/|^application\/pdf$/.test(file.type)) throw new Error("La constancia va en foto o PDF.");
    if (file.size > 8 * 1048576) throw new Error("La constancia pesa más de 8 MB.");
    const ext = file.type === "application/pdf" ? "pdf" : (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const ref = `constancias/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    if (!nube) { await idbC.poner(ref, file); return ref; }
    const r = await sb.storage.from("cobros").upload(ref, file, { contentType: file.type, upsert: false });
    if (r.error) throw new Error("No se pudo subir la constancia. Intente otra vez.");
    return ref;
  }
  async function constanciaUrl(ref) {
    if (!ref) return null;
    if (!nube) { const b = await idbC.leer(ref); return b ? URL.createObjectURL(b) : null; }
    const r = await sb.storage.from("cobros").createSignedUrl(ref, 600);
    return r.error ? null : r.data.signedUrl;
  }

  function enLetras(n) {
    const U = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
    const DEC = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
    const CEN = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
    const menorMil = x => { if (x === 0) return ""; if (x === 100) return "cien"; const c = Math.floor(x / 100), r = x % 100; let s = CEN[c]; if (r) { const t2 = r < 30 ? U[r] : DEC[Math.floor(r / 10)] + (r % 10 ? " y " + U[r % 10] : ""); s = (s ? s + " " : "") + t2; } return s; };
    const entero = Math.floor(r2(n)), cent = Math.round((r2(n) - entero) * 100);
    const partes = [];
    const mill = Math.floor(entero / 1e6), miles = Math.floor((entero % 1e6) / 1000), resto = entero % 1000;
    const apoc = s2 => s2.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
    if (mill) partes.push(mill === 1 ? "un millón" : apoc(menorMil(mill)) + " millones");
    if (miles) partes.push(miles === 1 ? "mil" : apoc(menorMil(miles)) + " mil");
    if (resto) partes.push(apoc(menorMil(resto)));
    const txt = (partes.join(" ") || "cero") + (entero && entero % 1e6 === 0 ? " de" : "") + (entero === 1 ? " quetzal" : " quetzales") + ` con ${String(cent).padStart(2, "0")}/100`;
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  Object.assign(D, { FORMAS, TIPOS_FIANZA, TIPOS_GASTO, resumenCobros: resumen, guardarPlan, agregarParte, quitarParte, subirConstancia, constanciaUrl, aplicadoPago: aplicado, registrarPago, anularPago, guardarFianza, guardarGasto, quitarGasto, estadoCuenta, enLetras });
})();
