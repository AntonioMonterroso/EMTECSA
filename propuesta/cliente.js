"use strict";
(() => {
  const CFG = window.EMTECSA_CONFIG || {};
  const nube = !!(CFG.url && CFG.llave && window.supabase);
  const sb = nube ? window.supabase.createClient(CFG.url, CFG.llave, { auth: { persistSession: true, autoRefreshToken: false } }) : null;
  const token = decodeURIComponent(location.hash.slice(1)).trim();
  const verEquipo = new URLSearchParams(location.search).has("equipo");
  const raiz = document.getElementById("p");
  const MAS = {
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    tel: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    firma: '<path d="M3 17c3-3 4-9 6-9s1 8 3 8 3-4 4-4 1 3 3 3"/><path d="M3 21h18"/>'
  };
  const ico = (n, w = 18) => MAS[n] ? `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MAS[n]}</svg>` : window.EMT.ico(n, w);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const Q = n => "Q " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cant = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const fecha = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" }); };
  const fechaHora = iso => new Date(iso).toLocaleString("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const tam = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".0", "") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const hoyGT = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
  const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  function eleccionDe(d, el) {
    const o = d.opciones; if (!o) return { ok: true, eleccion: null, total: d.tot.total, txt: null };
    const lista = o.lista || [], xs = o.extras || [];
    const op = lista.length ? lista.find(x => x.id === (el && el.opcion)) : null;
    if (lista.length && !op) return { ok: false };
    const ex = ((el && el.extras) || []).filter((v, i, a) => a.indexOf(v) === i);
    if (ex.some(id => !xs.some(x => x.id === id))) return { ok: false };
    const exs = xs.filter(x => ex.includes(x.id));
    const total = r2((op ? op.tot.total : d.tot.total) + exs.reduce((a, x) => a + Number(x.monto || 0), 0));
    const txt = [op ? `Opción ${op.id} · ${op.nombre}` : "", ...exs.map(x => x.nombre)].filter(Boolean).join(" + ") || "Sin extras";
    return { ok: true, eleccion: { opcion: op ? op.id : null, extras: exs.map(x => x.id) }, total, txt, op, exs };
  }

  function aviso(t, tipo) {
    const box = document.querySelector("[data-avisos]");
    const el = document.createElement("div"); el.className = "aviso" + (tipo === "mal" ? " mal" : ""); el.textContent = t;
    box.appendChild(el); setTimeout(() => { el.classList.add("sale"); setTimeout(() => el.remove(), 300); }, 3800);
  }

  const L = (() => {
    const CE = "emtecsa.sistema.enlaces", CC = "emtecsa.sistema.cotizaciones";
    const canal = "BroadcastChannel" in window ? new BroadcastChannel("emtecsa-enlaces") : null;
    const leer = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    const poner = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const ahora = () => new Date().toISOString();
    const hace = (iso, ms) => !iso || Date.now() - new Date(iso).getTime() > ms;
    const buscar = t => { const d = leer(CE); const e = d && d.enlaces.find(x => x.token === t && x.activo); return { d, e }; };
    const estadoCot = id => { const c = leer(CC); const x = c && c.cotizaciones.find(y => y.id === id); return x ? x.estado : null; };
    const evento = (d, e, tipo, texto) => { const ev = { id: d.sig.ev++, enlace_id: e.id, cotizacion_id: e.cotizacion_id, tipo, texto: texto || null, fecha: ahora(), atendido: false }; d.eventos.push(ev); return ev; };
    const avisar = ev => { try { canal && canal.postMessage({ tipo: ev.tipo, cotizacion_id: ev.cotizacion_id, id: ev.id }); } catch (e) {} };
    const idb = ref => new Promise(ok => { const r = indexedDB.open("emtecsa-docs", 1); r.onupgradeneeded = () => r.result.createObjectStore("archivos"); r.onerror = () => ok(null); r.onsuccess = () => { try { const g = r.result.transaction("archivos").objectStore("archivos").get(ref); g.onsuccess = () => ok(g.result || null); g.onerror = () => ok(null); } catch (e) { ok(null); } }; });
    return {
      async ver(t) {
        const { d, e } = buscar(t); if (!e) return null;
        const nuevos = [];
        if (!verEquipo && hace(e.ultima_vista, 30 * 60000)) {
          if (!e.primera_vista) nuevos.push(evento(d, e, "abrio"));
          else if (hace(e.ultima_vista, 86400000)) nuevos.push(evento(d, e, "volvio"));
          e.vistas = (e.vistas || 0) + 1; e.primera_vista = e.primera_vista || ahora(); e.ultima_vista = ahora();
          poner(CE, d); nuevos.forEach(avisar);
        }
        const vencido = !e.aprobado && e.vence < hoyGT();
        const dt = e.datos;
        return { datos: vencido ? { numero: dt.numero, titulo: dt.titulo, empresa: dt.empresa, cliente: dt.cliente, contacto: dt.contacto } : dt, archivos: vencido ? [] : e.archivos, vence: e.vence, vencido, estado: e.aprobado ? "aprobada" : estadoCot(e.cotizacion_id), aprobado: e.aprobado, mensajes: d.eventos.filter(x => x.enlace_id === e.id && x.tipo === "mensaje").map(x => ({ texto: x.texto, fecha: x.fecha })), equipo: verEquipo };
      },
      async aprobar(t, nombre, puesto, firma, eleccion) {
        const { d, e } = buscar(t); if (!e) throw new Error("no_existe");
        const el = eleccionDe(e.datos, eleccion); if (!el.ok) throw new Error("eleccion");
        if (e.aprobado) return e.aprobado;
        if (e.vence < hoyGT()) throw new Error("vencida");
        const c = leer(CC); const cot = c && c.cotizaciones.find(y => y.id === e.cotizacion_id);
        if (!cot || cot.estado !== "enviada") throw new Error("no_disponible");
        const n = nombre.replace(/\s+/g, " ").trim(), pu = puesto.replace(/\s+/g, " ").trim() || null;
        if (n.length < 3 || n.length > 120) throw new Error("nombre");
        if (!/^data:image\/png;base64,/.test(firma) || firma.length < 200 || firma.length > 400000) throw new Error("firma");
        e.aprobado = { nombre: n, puesto: pu, firma, fecha: ahora(), numero: e.datos.numero, total: el.total, huella: e.huella, eleccion: el.eleccion, eleccion_txt: e.datos.opciones ? el.txt : null };
        if (el.eleccion) { cot.eleccion = el.eleccion; cot.total = el.total; }
        const ev = evento(d, e, "aprobo", n + (pu ? " · " + pu : "") + (e.datos.opciones ? " · " + el.txt : ""));
        cot.estado = "aprobada"; c.cambios = true;
        poner(CC, c); poner(CE, d); avisar(ev);
        return e.aprobado;
      },
      async mensaje(t, texto) {
        const { d, e } = buscar(t); if (!e) throw new Error("no_existe");
        const tx = texto.trim(); if (tx.length < 2 || tx.length > 2000) throw new Error("texto");
        if (d.eventos.filter(x => x.enlace_id === e.id && x.tipo === "mensaje" && !hace(x.fecha, 86400000)).length >= 20) throw new Error("muchos");
        const ev = evento(d, e, "mensaje", tx); poner(CE, d); avisar(ev);
        return { texto: tx, fecha: ev.fecha };
      },
      async tramite(t, datos) {
        const { d, e } = buscar(t); if (!e) throw new Error("no_existe"); if (!e.aprobado) throw new Error("no_aprobada");
        e.tramite = { sol: datos.sol || {}, terrenos: (datos.terrenos || []).slice(0, 30), fecha: ahora() };
        const ev = evento(d, e, "datos", "Mandó sus datos para los trámites con Energuate."); poner(CE, d); avisar(ev); return e.tramite;
      },
      async verTramite(t) { const { e } = buscar(t); return e && e.tramite || null; },
      async descarga(t, cual) { if (verEquipo) return; const { d, e } = buscar(t); if (!e) return; e.descargas = e.descargas || {}; e.descargas[cual] = (e.descargas[cual] || 0) + 1; poner(CE, d); },
      archivo: a => idb(a.ref),
      async estimaciones(t) {
        const { e } = buscar(t); if (!e || !e.aprobado) return [];
        const ob = (leer("emtecsa.sistema.obras") || { obras: [] }).obras.find(o => o.cotizacion_id === e.cotizacion_id); if (!ob) return [];
        return ((leer("emtecsa.sistema.estimaciones") || { est: [] }).est).filter(s => s.obra_id === ob.id && (s.estado === "enviada" || s.estado === "aprobada")).sort((a, b) => a.correlativo - b.correlativo)
          .map(s => ({ id: s.id, numero: s.numero, estado: s.estado, datos: s.datos, aprobado: s.aprobado ? { ...s.aprobado, firma: undefined } : null }));
      },
      async aprobarEst(t, id, nombre, puesto, firma) {
        const { d, e } = buscar(t); if (!e) throw new Error("no_existe"); if (!e.aprobado) throw new Error("no_aprobada");
        const ob = (leer("emtecsa.sistema.obras") || { obras: [] }).obras.find(o => o.cotizacion_id === e.cotizacion_id);
        const de = leer("emtecsa.sistema.estimaciones"); const s = ob && de && de.est.find(x => x.id === id && x.obra_id === ob.id); if (!s) throw new Error("no_existe");
        if (s.estado === "aprobada") return { ...s.aprobado, firma: undefined };
        if (s.estado !== "enviada") throw new Error("no_disponible");
        const n = nombre.replace(/\s+/g, " ").trim(), pu = puesto.replace(/\s+/g, " ").trim() || null;
        if (n.length < 3 || n.length > 120) throw new Error("nombre");
        if (!/^data:image\/png;base64,/.test(firma) || firma.length < 200 || firma.length > 400000) throw new Error("firma");
        const cl = ((leer("emtecsa.sistema.clientes") || { clientes: [] }).clientes).find(c => c.id === ob.cliente_id);
        const [y, m, dd] = hoyGT().split("-").map(Number); const v = new Date(y, m - 1, dd + (Number(cl && cl.dias_credito) || 0));
        let pid = null;
        if (Number(s.neto) > 0) { const dc = leer("emtecsa.sistema.cobros") || { v: 1, cambios: false, sig: { x: 1 }, partes: [], pagos: [], fianzas: [], gastos: [] }; pid = dc.sig.x++; dc.partes.push({ id: pid, obra_id: ob.id, descripcion: `Estimación ${s.correlativo} · ${s.numero}`, porcentaje: null, monto: Number(s.neto), vence: `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`, orden: 100 + s.correlativo }); dc.cambios = true; poner("emtecsa.sistema.cobros", dc); }
        s.estado = "aprobada"; s.parte_id = pid; s.aprobado = { nombre: n, puesto: pu, firma, fecha: ahora(), en: "enlace" }; s.actualizado = ahora();
        poner("emtecsa.sistema.estimaciones", de);
        const ev = evento(d, e, "estimacion", `${s.numero} · ${n}${pu ? " · " + pu : ""}`); poner(CE, d); avisar(ev);
        return { ...s.aprobado, firma: undefined };
      }
    };
  })();

  const N = {
    async ver(t) { const r = await sb.rpc("enlace_ver", { p_token: t }); if (r.error) throw new Error("red"); return r.data; },
    async aprobar(t, nombre, puesto, firma, eleccion) { const r = await sb.rpc("enlace_aprobar", { p_token: t, p_nombre: nombre, p_puesto: puesto, p_firma: firma, p_eleccion: eleccion }); if (r.error) throw new Error((r.error.message || "").match(/no_existe|vencida|no_disponible|nombre|puesto|firma|eleccion/)?.[0] || "red"); return r.data; },
    async mensaje(t, texto) { const r = await sb.rpc("enlace_mensaje", { p_token: t, p_texto: texto }); if (r.error) throw new Error((r.error.message || "").match(/no_existe|texto|muchos/)?.[0] || "red"); return r.data; },
    async tramite(t, datos) { const r = await sb.rpc("enlace_tramite", { p_token: t, p_datos: datos }); if (r.error) throw new Error((r.error.message || "").match(/no_existe|no_aprobada|datos/)?.[0] || "red"); return r.data; },
    async verTramite(t) { const r = await sb.rpc("enlace_ver_tramite", { p_token: t }); return r.error ? null : r.data; },
    async descarga(t, cual) { try { await sb.rpc("enlace_descarga", { p_token: t, p_cual: cual }); } catch (e) {} },
    async archivo(a) { try { const r = await fetch(a.url); return r.ok ? await r.blob() : null; } catch (e) { return null; } },
    async estimaciones(t) { const r = await sb.rpc("enlace_estimaciones", { p_token: t }); return r.error ? [] : r.data || []; },
    async aprobarEst(t, id, nombre, puesto, firma) { const r = await sb.rpc("enlace_aprobar_estimacion", { p_token: t, p_id: id, p_nombre: nombre, p_puesto: puesto, p_firma: firma }); if (r.error) throw new Error((r.error.message || "").match(/no_existe|no_aprobada|no_disponible|nombre|puesto|firma/)?.[0] || "red"); return r.data; }
  };
  const API = nube ? N : L;
  const ERR = {
    no_existe: "Este enlace ya no está activo. Escríbale a EMTECSA para que le mande uno nuevo.",
    vencida: "La propuesta venció. Escríbanos para actualizarla.",
    no_disponible: "EMTECSA está ajustando esta propuesta. Por ahora no se puede aprobar; le avisarán cuando esté lista.",
    nombre: "Escriba su nombre completo.", puesto: "El puesto es muy largo.", firma: "Falta su firma. Firme en el recuadro.",
    eleccion: "Escoja una de las opciones.",
    texto: "Escriba su mensaje.", no_aprobada: "Primero apruebe la propuesta.", datos: "Revise los datos: hay algo que no se pudo guardar.", muchos: "Ya mandó muchos mensajes hoy. Llame a EMTECSA o intente mañana.",
    red: "No hay conexión. Revise el internet e intente otra vez."
  };

  let R = null, SEL = null;
  const selActual = () => { const o = R.datos.opciones; if (!SEL) SEL = { opcion: o && o.lista.length ? o.lista[0].id : null, extras: [] }; return eleccionDe(R.datos, SEL); };

  const bajar = (blob, nombre) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); };
  const telDe = t => { const d = String(t || "").replace(/\D/g, ""); return d ? (d.length === 8 ? "502" + d : d) : ""; };

  function contactoHTML(emp, numero) {
    const tel = telDe(emp.telefono);
    const btns = [
      tel ? `<a class="e-btn" href="https://wa.me/${tel}?text=${encodeURIComponent(`Hola, les escribo por la propuesta ${numero}.`)}" target="_blank" rel="noopener">${ico("chat", 17)}WhatsApp</a>` : "",
      tel ? `<a class="e-btn" href="tel:+${tel}">${ico("tel", 17)}Llamar</a>` : "",
      emp.correo ? `<a class="e-btn" href="mailto:${esc(emp.correo)}?subject=${encodeURIComponent("Propuesta " + numero)}">${ico("mail", 17)}Correo</a>` : ""
    ].filter(Boolean).join("");
    return btns ? `<section class="pc-caja contacto"><h2>¿Dudas? Hable con ${esc(emp.nombre || "EMTECSA")}</h2>${emp.firma_nombre ? `<p class="suave">${esc(emp.firma_nombre)}${emp.firma_puesto ? " · " + esc(emp.firma_puesto) : ""}</p>` : ""}<div class="btns">${btns}</div></section>` : "";
  }
  function pie(emp) {
    return `<footer class="pp"><b>${esc(emp.razon_social || emp.nombre || "EMTECSA")}</b>${[emp.nit ? "NIT " + emp.nit : "", emp.ciudad, emp.web].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join("")}</footer>`;
  }

  function pintarNoHay() {
    raiz.innerHTML = `<section class="vacio-c"><span class="ic-c">${ico("link", 26)}</span><h1>Este enlace ya no está activo</h1><p>Puede ser que EMTECSA lo haya cambiado. Escríbales para que le manden uno nuevo.</p></section>`;
  }

  function pintarVencido() {
    const d = R.datos, emp = d.empresa || {};
    document.querySelector("[data-num]").textContent = d.numero;
    raiz.innerHTML = `<section class="vacio-c"><span class="ic-c ambar">${ico("clock", 26)}</span><span class="eti">Propuesta ${esc(d.numero)}</span><h1>Esta propuesta venció</h1><p>Era válida hasta el ${esc(fecha(R.vence))}. Escríbanos y se la actualizamos.</p>
      <div class="btns"><button class="e-btn e-btn-p" type="button" data-msg>${ico("chat", 17)}Escribir a ${esc(emp.nombre || "EMTECSA")}</button></div></section>
      ${mensajesHTML()}${contactoHTML(emp, d.numero)}${pie(emp)}`;
  }

  function mensajesHTML() {
    if (!R.mensajes || !R.mensajes.length) return "";
    return `<section class="pc-caja msgs"><h2>Sus mensajes</h2>${R.mensajes.slice().reverse().map(m => `<div class="msg"><p>${esc(m.texto)}</p><small>Enviado el ${esc(fechaHora(m.fecha))}</small></div>`).join("")}</section>`;
  }

  function estadoHTML() {
    const ap = R.aprobado;
    if (R.equipo) return `<div class="banda azul">${ico("eye", 17)}<span><b>Así la ve su cliente.</b> Esta visita no se cuenta.</span></div>`;
    if (ap && !(R.est || []).some(s => s.estado === "enviada")) return "";
    if (R.estado === "borrador") return `<div class="banda ambar">${ico("alerta", 17)}<span><b>EMTECSA está ajustando esta propuesta.</b> Por ahora no se puede aprobar; le avisarán cuando esté lista.</span></div>`;
    const pe = ap && (R.est || []).find(s => s.estado === "enviada");
    if (pe) return `<div class="banda azul est-banda">${ico("firma", 17)}<span><b>Tiene una estimación de avance por aprobar.</b> Estimación ${esc(pe.datos.correlativo)} por ${esc(Q(pe.datos.neto))}.</span><button class="e-btn e-btn-p" type="button" data-est="${pe.id}">Revisar</button></div>`;
    if (R.estado === "rechazada") return `<div class="banda gris">${ico("alerta", 17)}<span><b>Esta propuesta quedó cerrada.</b> Escríbanos si quiere retomarla.</span></div>`;
    return "";
  }

  function escogerHTML(d) {
    const o = d.opciones, el = selActual();
    return `<div class="esc">${o.lista.length ? `<p class="esc-t">Escoja una opción</p>${o.lista.map(x => `<label class="esc-f"><input type="radio" name="op" value="${esc(x.id)}" ${el.eleccion.opcion === x.id ? "checked" : ""}><span><b>Opción ${esc(x.id)}</b><small>${esc(x.nombre)}</small></span><b class="e-cifra">${esc(Q(x.tot.total))}</b></label>`).join("")}` : ""}
      ${o.extras.length ? `<p class="esc-t">Extras · si los quiere</p>${o.extras.map(x => `<label class="esc-f"><input type="checkbox" name="ex" value="${esc(x.id)}" ${el.eleccion.extras.includes(x.id) ? "checked" : ""}><span><b>${esc(x.nombre)}</b></span><b class="e-cifra">+ ${esc(Q(x.monto))}</b></label>`).join("")}` : ""}</div>`;
  }
  function partidasHTML(d) {
    const fila = p => `<div class="pr"><span class="pr-d"><b>${esc(p.d)}</b><small>${esc(cant(p.c))} × ${esc(Q(p.u))}</small></span><b class="e-cifra">${esc(Q(p.t))}</b></div>`;
    if (!d.opciones) return d.partidas.map(fila).join("");
    const gs = Object.keys(d.opciones.grupos);
    return gs.map(g => { const l = d.partidas.filter(p => (p.g || "") === g); if (!l.length) return ""; return `<p class="gr-t ${g ? (g[0] === "o" ? "op" : "ex") : ""}"><span>${esc(d.opciones.grupos[g])}</span><small>${esc(Q(l.reduce((a, p) => a + p.t, 0)))}</small></p>` + l.map(fila).join(""); }).join("");
  }

  const pctT = n => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}\u00a0%`;
  const periodoT = d => [d.desde && fecha(d.desde), d.hasta && fecha(d.hasta)].filter(Boolean).join(" al ") || fecha(d.fecha);
  function cuentaEst(d) {
    const l = (k, v, cl = "") => `<div class="${cl}"><span>${k}</span><b>${v}</b></div>`;
    return `<div class="tots est-cu">${l("Avance de la obra a la fecha", esc(pctT(d.pct_acum)) + (d.correlativo > 1 ? ` <small>(antes ${esc(pctT(d.pct_ant))})</small>` : ""))}${l("Esta estimación", esc(Q(d.bruto)))}${d.anticipo ? l("Menos anticipo", "− " + esc(Q(d.anticipo))) : ""}${d.garantia ? l(`Menos garantía retenida ${esc(pctT(d.garantia_pct))}`, "− " + esc(Q(d.garantia))) : ""}${l("A pagar", esc(Q(d.neto)), "g")}</div>`;
  }
  function estimacionesHTML() {
    const l = R.est || []; if (!R.aprobado || !l.length) return "";
    return `<section class="pc-caja est-c" id="estimaciones"><h2>Estimaciones de avance</h2><p class="suave chico">Cobro según lo avanzado de la obra. Revise cada una y apruébela con su firma.</p>
      ${l.slice().reverse().map(s => { const d = s.datos || {}; return `<div class="est-f"><span class="pr-d"><b>Estimación ${esc(d.correlativo)} · ${esc(s.numero)}</b><small>${esc(periodoT(d))} · avance ${esc(pctT(d.pct_acum))}</small>${s.estado === "aprobada" && s.aprobado ? `<small class="ok">Aprobada por ${esc(s.aprobado.nombre)} · ${esc(fechaHora(s.aprobado.fecha))}</small>` : ""}</span><span class="est-der"><b class="e-cifra">${esc(Q(d.neto))}</b>${s.estado === "enviada" ? `<button class="e-btn e-btn-p" type="button" data-est="${s.id}">${ico("firma", 17)}Revisar y aprobar</button>` : `<button class="e-btn" type="button" data-est="${s.id}">Ver</button>`}</span></div>`; }).join("")}</section>`;
  }

  function pintar() {
    const d = R.datos, emp = d.empresa || {}, t = d.tot || {}, ap = R.aprobado;
    const puedeAprobar = !ap && R.estado === "enviada";
    document.title = `Propuesta ${d.numero} · ${emp.nombre || "EMTECSA"}`;
    document.querySelector("[data-num]").textContent = d.numero;
    const arch = R.archivos || [];
    const prop = arch.find(a => a.cual === "propuesta"), expd = arch.find(a => a.cual === "expediente");
    const fila = (k, v, cl = "") => `<div class="${cl}"><span>${k}</span><b>${esc(v)}</b></div>`;
    const lista = l => `<ul>${l.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const cond = [["Forma de pago", d.condiciones && d.condiciones.forma_pago], ["Tiempo de entrega", d.condiciones && d.condiciones.tiempo_entrega], ["Garantía", d.condiciones && d.condiciones.garantia]].filter(x => x[1]);
    const nPart = d.partidas.length + (d.cargos || []).length;
    raiz.innerHTML = `
      <section class="hero-c">
        <img src="../img/${esc(d.foto || "torre-luna-2")}.jpg" alt="">
        <div class="hero-t">
          <span class="eti">Propuesta técnica y económica</span>
          <h1>${esc(d.titulo || "Propuesta")}</h1>
          <p>Para ${esc(d.cliente ? d.cliente.nombre : "")}${d.sitio ? " · " + esc(d.sitio.nombre) : ""}${d.contacto ? `<br>Atención: ${esc(d.contacto.nombre)}${d.contacto.puesto ? ", " + esc(d.contacto.puesto) : ""}` : ""}</p>
        </div>
      </section>
      ${estadoHTML()}
      <div class="rejilla">
        <aside class="lado">
          <section class="pc-caja total-c">
            ${ap ? `<div class="aprobada">${ico("check", 20)}<span><b>Aprobada</b><small>${esc(fechaHora(ap.fecha))} · ${esc(ap.nombre)}</small></span></div>` : ""}
            ${d.opciones && !ap ? escogerHTML(d) : ""}
            ${ap && ap.eleccion_txt ? `<p class="escogio"><span>Escogió</span><b>${esc(ap.eleccion_txt)}</b></p>` : ""}
            <span class="l">${d.opciones && !ap ? (t.con_iva ? "Total con lo escogido, con IVA" : "Total con lo escogido") : t.con_iva ? "Total con IVA" : "Total"}</span>
            <b class="e-cifra grande" data-total-vivo>${esc(Q(ap ? ap.total : d.opciones ? selActual().total : t.total))}</b>
            <small class="suave">${ap ? "Gracias por su confianza. EMTECSA ya recibió el aviso y le contactará para programar el trabajo." : R.vencido ? "" : `Válida hasta el ${esc(fecha(R.vence))}`}</small>
            <div class="acc">
              ${puedeAprobar ? `<button class="e-btn e-btn-p ancho" type="button" data-aprobar>${ico("firma", 18)}Aprobar con mi firma</button>` : ""}
              ${ap ? `<button class="e-btn e-btn-p ancho" type="button" data-constancia>${ico("download", 18)}Constancia de aprobación</button>` : ""}
              ${prop ? `<button class="e-btn e-btn-salida ancho" type="button" data-bajar="propuesta">${ico("download", 17)}<span>Propuesta en PDF<small>${esc(tam(prop.tam))}</small></span></button>` : ""}
              ${expd ? `<button class="e-btn e-btn-salida ancho" type="button" data-bajar="expediente">${ico("layers", 17)}<span>Expediente completo<small>PDF · ${esc(tam(expd.tam))}</small></span></button>` : ""}
              <button class="e-btn ancho" type="button" data-msg>${ico("chat", 17)}Pedir un cambio o preguntar</button>
            </div>
          </section>
        </aside>
        <div class="princ">
          <details class="pc-caja plg" ${window.innerWidth >= 900 ? "open" : ""}><summary><span><h2>Detalle de precios</h2><small>${nPart} ${nPart === 1 ? "renglón" : "renglones"}</small></span><span class="chev">${ico("chev", 18)}</span></summary>
            <div class="part">${partidasHTML(d)}
              ${(d.cargos || []).map(g => `<div class="pr"><span class="pr-d"><b>${esc(g.d)}</b><small>Transporte y equipo</small></span><b class="e-cifra">${esc(Q(g.m))}</b></div>`).join("")}</div>
            <div class="tots">${d.opciones ? `<p class="suave chico" style="margin:0 0 4px">${d.opciones.lista.length ? "Los totales de cada opción están arriba, junto al botón de aprobar." : "Los extras se suman al total si los escoge."}</p>` : ""}${d.opciones && d.opciones.lista.length ? "" : fila("Subtotal", Q(t.subtotal + (t.cargos || 0)))}${t.imp_pct != null ? fila(`Imprevistos y administración ${cant(t.imp_pct)} %`, Q(t.imprevistos)) : ""}${t.descuento ? fila(`Descuento${t.desc_pct != null ? " " + cant(t.desc_pct) + " %" : ""}`, "− " + Q(t.descuento)) : ""}${t.con_iva ? fila("Total sin IVA", Q(t.neto)) + fila("IVA 12 %", Q(t.iva)) : ""}${fila(t.con_iva ? "Total con IVA" : "Total", Q(t.total), "g")}</div>
          </details>
          ${d.incluye.length || d.excluye.length ? `<details class="pc-caja plg"><summary><span><h2>Lo que incluye</h2><small>${d.incluye.length} ${d.incluye.length === 1 ? "punto" : "puntos"}${d.excluye.length ? ` · ${d.excluye.length} no incluidos` : ""}</small></span><span class="chev">${ico("chev", 18)}</span></summary>
            ${d.incluye.length ? `<div class="alc"><h3>Incluye</h3>${lista(d.incluye)}</div>` : ""}${d.excluye.length ? `<div class="alc no"><h3>No incluye</h3>${lista(d.excluye)}</div>` : ""}</details>` : ""}
          ${cond.length || d.notas ? `<details class="pc-caja plg"><summary><span><h2>Condiciones</h2><small>${cond.map(x => x[0]).join(" · ") || "Notas"}</small></span><span class="chev">${ico("chev", 18)}</span></summary>
            <dl class="cond">${cond.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}${d.notas ? `<div><dt>Notas</dt><dd>${esc(d.notas)}</dd></div>` : ""}</dl></details>` : ""}
          ${estimacionesHTML()}
          ${ap ? `<section class="pc-caja tramite-c"><h2>Para los trámites con Energuate</h2><p class="suave chico">${R.tramite && R.tramite.fecha ? "Ya mandó sus datos. Puede corregirlos si hace falta." : "Para pedir la licencia de construcción hacen falta sus datos y los de cada terreno por donde pasará la línea."}</p><button class="e-btn ${R.tramite && R.tramite.fecha ? "" : "e-btn-p"} ancho" type="button" data-tramite>${ico("pen", 17)}${R.tramite && R.tramite.fecha ? "Corregir mis datos" : "Llenar mis datos"}</button></section>` : ""}
          ${mensajesHTML()}
          ${contactoHTML(emp, d.numero)}
        </div>
      </div>
      ${pie(emp)}
      ${puedeAprobar ? `<div class="barra-c"><span><small>${t.con_iva ? "Total con IVA" : "Total"}</small><b data-total-vivo>${esc(Q(d.opciones ? selActual().total : t.total))}</b></span><button class="e-btn e-btn-p" type="button" data-aprobar>${ico("firma", 18)}Aprobar</button></div>` : ""}`;
    document.body.classList.toggle("con-barra", puedeAprobar);
    const barra = raiz.querySelector(".barra-c"), boton = raiz.querySelector(".lado [data-aprobar]");
    if (barra && boton && "IntersectionObserver" in window) { barra.classList.add("oculta"); new IntersectionObserver(([x]) => barra.classList.toggle("oculta", x.isIntersecting || x.boundingClientRect.top > 0)).observe(boton); }
  }

  let capa = null;
  function abrirHoja(html, alAbrir) {
    cerrarHoja(true);
    const fondo = document.createElement("div"); fondo.className = "hoja-f";
    fondo.innerHTML = `<div class="hoja" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
    document.body.appendChild(fondo); document.body.classList.add("sin-scroll");
    const h = fondo.querySelector(".hoja");
    const antes = document.activeElement;
    capa = { fondo, antes };
    requestAnimationFrame(() => fondo.classList.add("abierta"));
    fondo.addEventListener("click", e => { if (e.target === fondo || e.target.closest("[data-cerrar]")) cerrarHoja(); });
    fondo.addEventListener("keydown", e => { if (e.key === "Escape") cerrarHoja(); });
    alAbrir && alAbrir(h);
    (window.matchMedia("(pointer: coarse)").matches ? h : h.querySelector("input, textarea") || h).focus({ preventScroll: true });
    return h;
  }
  function cerrarHoja(ya) {
    if (!capa) return;
    const { fondo, antes } = capa; capa = null;
    document.body.classList.remove("sin-scroll");
    if (ya || quieto()) fondo.remove(); else { fondo.classList.remove("abierta"); fondo.classList.add("sale"); setTimeout(() => fondo.remove(), 200); }
    if (antes && antes.focus) antes.focus({ preventScroll: true });
  }

  function lienzo(cv) {
    const ctx = cv.getContext("2d");
    let trazos = [], actual = null, caja = null;
    const medir = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dibujar();
    };
    const dibujar = () => {
      const r = cv.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0E1D33";
      trazos.forEach(t => linea(ctx, t, 1));
    };
    const linea = (c, t, e) => {
      if (!t.length) return;
      c.lineWidth = 2.4 * e;
      c.beginPath(); c.moveTo(t[0].x * e, t[0].y * e);
      if (t.length === 1) c.lineTo(t[0].x * e + 0.1, t[0].y * e + 0.1);
      for (let i = 1; i < t.length - 1; i++) { const mx = (t[i].x + t[i + 1].x) / 2, my = (t[i].y + t[i + 1].y) / 2; c.quadraticCurveTo(t[i].x * e, t[i].y * e, mx * e, my * e); }
      if (t.length > 1) c.lineTo(t[t.length - 1].x * e, t[t.length - 1].y * e);
      c.stroke();
    };
    const punto = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    cv.addEventListener("pointerdown", ev => { ev.preventDefault(); try { cv.setPointerCapture(ev.pointerId); } catch (e) {} actual = [punto(ev)]; trazos.push(actual); dibujar(); cv.dispatchEvent(new Event("firma")); });
    cv.addEventListener("pointermove", ev => { if (!actual) return; ev.preventDefault(); const co = ev.getCoalescedEvents ? ev.getCoalescedEvents() : []; const evs = co.length ? co : [ev]; evs.forEach(x => actual.push(punto(x))); dibujar(); });
    const fin = () => { if (actual) { actual = null; cv.dispatchEvent(new Event("firma")); } };
    cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin); cv.addEventListener("pointerleave", fin);
    medir();
    const ro = "ResizeObserver" in window ? new ResizeObserver(medir) : null; ro && ro.observe(cv);
    return {
      borrar() { trazos = []; dibujar(); cv.dispatchEvent(new Event("firma")); },
      tinta: () => trazos.length > 0,
      vacia() {
        const pts = trazos.flat(); if (pts.length < 8) return true;
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        caja = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
        return (caja.x1 - caja.x0) < 30 && (caja.y1 - caja.y0) < 14;
      },
      png() {
        this.vacia();
        const pad = 10, w = caja.x1 - caja.x0 + 2 * pad, h = caja.y1 - caja.y0 + 2 * pad;
        const e = Math.min(2, 900 / w);
        const o = document.createElement("canvas"); o.width = Math.round(w * e); o.height = Math.round(h * e);
        const c = o.getContext("2d"); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#0E1D33";
        c.translate((pad - caja.x0) * e, (pad - caja.y0) * e);
        trazos.forEach(t => linea(c, t, e));
        return o.toDataURL("image/png");
      },
      soltar() { ro && ro.disconnect(); }
    };
  }

  function aprobar() {
    const d = R.datos, t = d.tot;
    let firma = null;
    abrirHoja(`
      <div class="hoja-cab"><h2>Aprobar la propuesta</h2><button class="x" type="button" aria-label="Cerrar" data-cerrar>${ico("x", 18)}</button></div>
      <p class="res-ap"><span>${esc(d.numero)}${d.titulo ? " · " + esc(d.titulo) : ""}${d.opciones ? `<br><b class="res-esc">${esc(selActual().txt)}</b>` : ""}</span><b class="e-cifra">${esc(Q(d.opciones ? selActual().total : t.total))}${t.con_iva ? " <small>con IVA</small>" : ""}</b></p>
      <form data-f-ap novalidate>
        <label class="campo">Su nombre completo<input name="nombre" autocomplete="name" value="${esc(d.contacto ? d.contacto.nombre : "")}" required></label>
        <label class="campo"><span>Puesto <small>opcional</small></span><input name="puesto" autocomplete="organization-title" value="${esc(d.contacto && d.contacto.puesto || "")}"></label>
        <div class="campo"><span class="firma-t">Su firma<button class="lnk" type="button" data-borrar>Borrar</button></span><div class="firma-c"><canvas data-lienzo aria-label="Recuadro para firmar con el dedo o el mouse"></canvas><span class="firma-g" data-guia>Firme aquí con el dedo o el mouse</span></div></div>
        <label class="chk"><input type="checkbox" name="acepto"><span>Acepto la propuesta ${esc(d.numero)}${d.opciones ? " (" + esc(selActual().txt) + ")" : ""} por ${esc(Q(d.opciones ? selActual().total : t.total))}${t.con_iva ? " con IVA" : ""} y sus condiciones.</span></label>
        <p class="err" data-err hidden></p>
        <button class="e-btn e-btn-p ancho" type="submit" data-enviar>${ico("check", 18)}Aprobar y firmar</button>
      </form>`, h => {
      const f = h.querySelector("[data-f-ap]");
      firma = lienzo(h.querySelector("[data-lienzo]"));
      const guia = h.querySelector("[data-guia]");
      h.querySelector("[data-lienzo]").addEventListener("firma", () => { guia.hidden = firma.tinta(); });
      h.querySelector("[data-borrar]").addEventListener("click", () => firma.borrar());
      const err = h.querySelector("[data-err]");
      const mal = m => { err.textContent = m; err.hidden = false; };
      f.addEventListener("submit", async ev => {
        ev.preventDefault(); err.hidden = true;
        if (f.nombre.value.trim().length < 3) { mal(ERR.nombre); f.nombre.focus(); return; }
        if (firma.vacia()) { mal(ERR.firma); return; }
        if (!f.acepto.checked) { mal("Marque la casilla de aceptación."); return; }
        const b = h.querySelector("[data-enviar]"); b.disabled = true; b.lastChild.textContent = "Aprobando…";
        try {
          const ap = await API.aprobar(token, f.nombre.value, f.puesto.value, firma.png(), R.datos.opciones ? selActual().eleccion : null);
          R.aprobado = ap; R.estado = "aprobada";
          firma.soltar(); cerrarHoja(true); pintar(); window.scrollTo({ top: 0, behavior: quieto() ? "auto" : "smooth" });
          gracias();
        } catch (e) { mal(ERR[e.message] || ERR.red); b.disabled = false; b.lastChild.textContent = "Aprobar y firmar"; if (e.message === "no_disponible" || e.message === "vencida") { await cargar(); } }
      });
    });
  }

  const SOL = [["sol_nombre", "Nombre completo (propietario o representante legal)", "name"], ["sol_dpi", "Número de DPI", "off"], ["sol_telefono", "Teléfono", "tel"], ["sol_correo", "Correo", "email"], ["sol_direccion", "Dirección", "street-address"], ["sol_ref_nombre", "Una referencia: nombre", "off"], ["sol_ref_telefono", "Teléfono de la referencia", "off"]];
  const TER = [["nombre", "Nombre del poseedor del terreno"], ["dpi", "DPI del poseedor"], ["edad", "Edad"], ["civil", "Estado civil"], ["profesion", "Profesión u oficio"], ["domicilio", "Departamento donde vive"], ["ubicacion", "Ubicación del terreno"], ["departamento", "Departamento"], ["municipio", "Municipio"], ["norte", "Colinda al norte con"], ["sur", "Al sur con"], ["oriente", "Al oriente con"], ["poniente", "Al poniente con"]];
  function tramite() {
    const t0 = R.tramite || {}, sol = t0.sol || {}, ters = (t0.terrenos || []).map(x => ({ ...x }));
    const terHTML = (t, i) => `<fieldset class="ter" data-ter="${i}"><legend>Terreno ${i + 1}</legend>${TER.map(([k, n]) => `<label class="campo">${esc(n)}${k === "departamento" || k === "domicilio" ? `<select data-tk="${k}" ${k === "departamento" ? 'data-geo-depto="ter"' : ""}>${window.EMT_GEO.opcionesDepto(t[k])}</select>` : `<input data-tk="${k}" value="${esc(t[k] || "")}" autocomplete="off" ${k === "municipio" ? 'data-geo-muni="ter"' : ""} ${k === "edad" ? 'inputmode="numeric"' : ""}>`}</label>`).join("")}<button class="lnk" type="button" data-ter-q="${i}">Quitar este terreno</button></fieldset>`;
    abrirHoja(`
      <div class="hoja-cab"><h2>Datos para Energuate</h2><button class="x" type="button" aria-label="Cerrar" data-cerrar>${ico("x", 18)}</button></div>
      <form data-f-tr novalidate>
        <p class="suave chico">Con esto EMTECSA llena la boleta del solicitante y los permisos de paso para la licencia de construcción.</p>
        ${SOL.map(([k, n, ac]) => `<label class="campo">${esc(n)}${/ref_|correo/.test(k) ? " <small>opcional</small>" : ""}<input name="${k}" value="${esc(sol[k] || "")}" autocomplete="${ac}" ${k === "sol_dpi" ? 'inputmode="numeric"' : ""}></label>`).join("")}
        <p class="esc-t" style="margin-top:8px">Terrenos de otras personas por donde pasa la línea</p>
        <div data-ters>${ters.map(terHTML).join("")}</div>
        <button class="e-btn ancho" type="button" data-ter-mas>${ico("plus", 17)}Agregar un terreno</button>
        <p class="err" data-err hidden></p>
        <button class="e-btn e-btn-p ancho" type="submit">${ico("send", 17)}Mandar mis datos</button>
      </form>`, h => {
      const f = h.querySelector("[data-f-tr]"), box = h.querySelector("[data-ters]"), err = h.querySelector("[data-err]");
      const leerT = () => [...box.querySelectorAll("[data-ter]")].map(fs => Object.fromEntries([...fs.querySelectorAll("[data-tk]")].map(i => [i.dataset.tk, i.value.trim()])));
      h.addEventListener("click", e => {
        if (e.target.closest("[data-ter-mas]")) { const l = leerT(); l.push({}); box.innerHTML = l.map(terHTML).join(""); box.lastElementChild.querySelector("input, select").focus(); }
        const q = e.target.closest("[data-ter-q]"); if (q) { const l = leerT(); l.splice(Number(q.dataset.terQ), 1); box.innerHTML = l.map(terHTML).join(""); }
      });
      f.addEventListener("submit", async ev => {
        ev.preventDefault(); err.hidden = true;
        const s = Object.fromEntries(SOL.map(([k]) => [k, f.elements[k].value.trim()]));
        if (s.sol_nombre.length < 3) { err.textContent = "Escriba su nombre completo."; err.hidden = false; return; }
        if (s.sol_dpi && !/^\d[\d\s-]{11,16}$/.test(s.sol_dpi)) { err.textContent = "Revise el DPI: son 13 números."; err.hidden = false; return; }
        const terrenos = leerT().filter(t => Object.values(t).some(Boolean));
        if (terrenos.some(t => !t.nombre)) { err.textContent = "Cada terreno necesita el nombre de quien lo posee."; err.hidden = false; return; }
        try { terrenos.forEach((t, i) => { const g = window.EMT_GEO.revisar(t.departamento, t.municipio, ` del terreno ${i + 1}`); t.departamento = g.departamento; t.municipio = g.municipio; }); } catch (e2) { err.textContent = e2.message; err.hidden = false; return; }
        const b = f.querySelector("button[type=submit]"); b.disabled = true;
        try { R.tramite = await API.tramite(token, { sol: s, terrenos }); cerrarHoja(); pintar(); aviso("Datos enviados. Gracias."); }
        catch (e) { err.textContent = ERR[e.message] || ERR.red; err.hidden = false; b.disabled = false; }
      });
    });
  }

  function verEst(id) {
    const s = (R.est || []).find(x => x.id === id); if (!s) return;
    const d = s.datos || {}, filas = (d.filas || []).filter(f => f.per > 0);
    const puede = s.estado === "enviada" && !R.equipo;
    let firma = null;
    abrirHoja(`
      <div class="hoja-cab"><h2>Estimación ${esc(d.correlativo)} · ${esc(s.numero)}</h2><button class="x" type="button" aria-label="Cerrar" data-cerrar>${ico("x", 18)}</button></div>
      <p class="suave chico">${esc(d.obra ? [d.obra.numero, d.obra.titulo].filter(Boolean).join(" · ") : "")}<br>Período: ${esc(periodoT(d))}</p>
      ${cuentaEst(d)}
      ${filas.length ? `<details class="pc-caja plg est-det"><summary><span><h2>Lo hecho en este período</h2><small>${filas.length} ${filas.length === 1 ? "renglón" : "renglones"}</small></span><span class="chev">${ico("chev", 18)}</span></summary><div class="part">${filas.map(f => `<div class="pr"><span class="pr-d"><b>${esc(f.d)}</b><small>${esc(cant(f.per))} en este período · ${esc(cant(f.acum))} de ${esc(cant(f.c))} a la fecha</small></span></div>`).join("")}</div></details>` : ""}
      ${d.notas ? `<p class="suave chico">${esc(d.notas)}</p>` : ""}
      ${s.estado === "aprobada" && s.aprobado ? `<p class="escogio"><span>Aprobada</span><b>${esc(s.aprobado.nombre)}${s.aprobado.puesto ? ", " + esc(s.aprobado.puesto) : ""} · ${esc(fechaHora(s.aprobado.fecha))}</b></p>` : ""}
      ${puede ? `<form data-f-est novalidate>
        <label class="campo">Su nombre completo<input name="nombre" autocomplete="name" value="${esc(R.datos.contacto ? R.datos.contacto.nombre : "")}" required></label>
        <label class="campo"><span>Puesto <small>opcional</small></span><input name="puesto" autocomplete="organization-title" value="${esc(R.datos.contacto && R.datos.contacto.puesto || "")}"></label>
        <div class="campo"><span class="firma-t">Su firma<button class="lnk" type="button" data-borrar>Borrar</button></span><div class="firma-c"><canvas data-lienzo aria-label="Recuadro para firmar con el dedo o el mouse"></canvas><span class="firma-g" data-guia>Firme aquí con el dedo o el mouse</span></div></div>
        <label class="chk"><input type="checkbox" name="acepto"><span>Apruebo la estimación ${esc(d.correlativo)} (${esc(s.numero)}) por ${esc(Q(d.neto))}${d.con_iva ? " con IVA" : ""}.</span></label>
        <p class="err" data-err hidden></p>
        <button class="e-btn e-btn-p ancho" type="submit" data-enviar>${ico("check", 18)}Aprobar y firmar</button>
      </form>` : ""}`, h => {
      const f = h.querySelector("[data-f-est]"); if (!f) return;
      firma = lienzo(h.querySelector("[data-lienzo]"));
      const guia = h.querySelector("[data-guia]");
      h.querySelector("[data-lienzo]").addEventListener("firma", () => { guia.hidden = firma.tinta(); });
      h.querySelector("[data-borrar]").addEventListener("click", () => firma.borrar());
      const err = h.querySelector("[data-err]");
      const mal = m => { err.textContent = m; err.hidden = false; };
      f.addEventListener("submit", async ev => {
        ev.preventDefault(); err.hidden = true;
        if (f.nombre.value.trim().length < 3) { mal(ERR.nombre); f.nombre.focus(); return; }
        if (firma.vacia()) { mal(ERR.firma); return; }
        if (!f.acepto.checked) { mal("Marque la casilla de aprobación."); return; }
        const b = h.querySelector("[data-enviar]"); b.disabled = true; b.lastChild.textContent = "Aprobando…";
        try {
          await API.aprobarEst(token, s.id, f.nombre.value, f.puesto.value, firma.png());
          firma.soltar(); cerrarHoja(true);
          R.est = await API.estimaciones(token).catch(() => R.est);
          pintar(); aviso(`Estimación ${d.correlativo} aprobada. Gracias.`);
        } catch (e) { mal(ERR[e.message] || ERR.red); b.disabled = false; b.lastChild.textContent = "Aprobar y firmar"; if (e.message === "no_disponible") { R.est = await API.estimaciones(token).catch(() => R.est); } }
      });
    });
  }

  function gracias() {
    const ap = R.aprobado;
    abrirHoja(`<div class="hecho"><span class="ic-c verde">${ico("check", 28)}</span><h2>Propuesta aprobada</h2><p><b>Firmada por ${esc(ap.nombre)}</b><br>${esc(fechaHora(ap.fecha))}</p>${ap.eleccion_txt ? `<p class="escogio"><span>Escogió</span><b>${esc(ap.eleccion_txt)} · ${esc(Q(ap.total))}</b></p>` : ""}<p>${esc(R.datos.empresa.nombre || "EMTECSA")} ya recibió el aviso y le contactará para programar el trabajo.</p>
      <button class="e-btn e-btn-p ancho" type="button" data-tramite>${ico("pen", 18)}Llenar mis datos para Energuate</button><button class="e-btn ancho" type="button" data-constancia>${ico("download", 18)}Descargar la constancia</button><button class="e-btn ancho" type="button" data-cerrar>Después</button></div>`);
  }

  function mensaje() {
    const d = R.datos;
    abrirHoja(`
      <div class="hoja-cab"><h2>${R.vencido ? "Escribir a " + esc(d.empresa.nombre || "EMTECSA") : "Pedir un cambio o preguntar"}</h2><button class="x" type="button" aria-label="Cerrar" data-cerrar>${ico("x", 18)}</button></div>
      <form data-f-msg novalidate>
        <label class="campo">Su mensaje<textarea name="texto" rows="5" maxlength="2000" placeholder="${R.vencido ? "Por ejemplo: necesitamos la propuesta actualizada para este mes." : "Por ejemplo: ¿se puede cambiar el transformador a 75 kVA?"}"></textarea></label>
        <p class="suave chico">Le llega directo a quien preparó la propuesta.</p>
        <p class="err" data-err hidden></p>
        <button class="e-btn e-btn-p ancho" type="submit">${ico("send", 17)}Enviar</button>
      </form>`, h => {
      const f = h.querySelector("[data-f-msg]"), err = h.querySelector("[data-err]");
      f.addEventListener("submit", async ev => {
        ev.preventDefault(); err.hidden = true;
        const tx = f.texto.value.trim();
        if (tx.length < 2) { err.textContent = ERR.texto; err.hidden = false; f.texto.focus(); return; }
        const b = f.querySelector("button[type=submit]"); b.disabled = true;
        try { const m = await API.mensaje(token, tx); R.mensajes = [...(R.mensajes || []), m]; cerrarHoja(); if (R.vencido) pintarVencido(); else pintar(); aviso("Mensaje enviado. Le responderán pronto."); }
        catch (e) { err.textContent = ERR[e.message] || ERR.red; err.hidden = false; b.disabled = false; }
      });
    });
  }

  async function descargar(cual, b) {
    const a = (R.archivos || []).find(x => x.cual === cual); if (!a) return;
    b.disabled = true;
    try { const blob = await API.archivo(a); if (!blob) throw new Error(); bajar(blob, a.nombre); API.descarga(token, cual); }
    catch (e) { aviso("No se pudo descargar. Revise el internet e intente otra vez.", "mal"); }
    finally { b.disabled = false; }
  }
  async function constancia(b) {
    b.disabled = true; aviso("Armando la constancia…");
    try { const bytes = await window.EMT_CONSTANCIA.armar({ d: R.datos, ap: R.aprobado, base: "../sistema/" }); bajar(new Blob([bytes], { type: "application/pdf" }), window.EMT_CONSTANCIA.nombreArchivo(R.datos)); API.descarga(token, "constancia"); }
    catch (e) { aviso("No se pudo armar la constancia. Intente otra vez.", "mal"); }
    finally { b.disabled = false; }
  }

  document.addEventListener("change", e => {
    const t = e.target;
    if (!R || !R.datos.opciones || !t.closest(".esc")) return;
    if (t.name === "op") SEL = { ...SEL, opcion: t.value };
    if (t.name === "ex") SEL = { ...SEL, extras: t.checked ? [...SEL.extras, t.value] : SEL.extras.filter(x => x !== t.value) };
    const tot = selActual().total;
    document.querySelectorAll("[data-total-vivo]").forEach(b => { b.textContent = Q(tot); if (!quieto()) { b.classList.remove("late"); void b.offsetWidth; b.classList.add("late"); } });
  });
  document.addEventListener("click", e => {
    if (e.target.closest("[data-aprobar]")) aprobar();
    if (e.target.closest("[data-msg]")) mensaje();
    if (e.target.closest("[data-tramite]")) tramite();
    const bj = e.target.closest("[data-bajar]"); if (bj) descargar(bj.dataset.bajar, bj);
    const cs = e.target.closest("[data-constancia]"); if (cs) constancia(cs);
    const es = e.target.closest("[data-est]"); if (es) verEst(Number(es.dataset.est));
  });

  async function cargar() {
    if (!token || token.length < 32) { pintarNoHay(); return; }
    try { R = await API.ver(token); }
    catch (e) { raiz.innerHTML = `<section class="vacio-c"><span class="ic-c ambar">${ico("alerta", 26)}</span><h1>No se pudo abrir la propuesta</h1><p>${esc(ERR.red)}</p><div class="btns"><button class="e-btn e-btn-p" type="button" onclick="location.reload()">Intentar otra vez</button></div></section>`; return; }
    if (!R) { pintarNoHay(); return; }
    if (R.aprobado) { R.tramite = await API.verTramite(token).catch(() => null); R.est = await API.estimaciones(token).catch(() => []); }
    if (R.vencido) pintarVencido(); else pintar();
  }
  window.addEventListener("hashchange", () => location.reload());
  cargar();
})();
