"use strict";
window.EMT_PROGRAMACION = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const deIso = f => { const [y, m, d] = f.split("-").map(Number); return new Date(y, m - 1, d); };
  const sumar = (f, n) => { const x = deIso(f); x.setDate(x.getDate() + n); return iso(x); };
  const hoyISO = () => iso(new Date());
  const lunesDe = f => { const x = deIso(f); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return iso(x); };
  const semanaActual = () => deIso(hoyISO()).getDay() === 0 ? sumar(hoyISO(), 1) : lunesDe(hoyISO());
  const fDia = f => deIso(f).toLocaleDateString("es-GT", { day: "numeric", month: "short" });
  const TURNO_C = { dia: "", manana: "Mañana", tarde: "Tarde" };
  let semana = null, diaSel = null;

  async function vista(v) {
    const { esc, ico } = A();
    const ed = D.puede(A().sesion().perfil, "editarObra");
    if (!semana) semana = semanaActual();
    const dias = DIAS.map((n, i) => ({ n, f: sumar(semana, i) }));
    if (!diaSel || !dias.some(d => d.f === diaSel)) diaSel = (dias.find(d => d.f === hoyISO()) || dias[0]).f;
    const [rec, prog, obras] = await Promise.all([D.recursos(), D.programacion(dias[0].f, dias[5].f), D.obras()]);
    const activos = rec.filter(r => r.activo !== false);
    const obraPor = Object.fromEntries(obras.map(o => [o.id, o]));
    const elegibles = obras.filter(o => o.estado === "programada" || o.estado === "en_curso" || o.estado === "pausada");
    const chip = p => { const o = obraPor[p.obra_id]; return `<button class="prog-chip" type="button" data-prog-ed="${p.id}" aria-label="Cambiar: ${esc(o ? o.numero : "obra")}${TURNO_C[p.turno] ? ", " + TURNO_C[p.turno].toLowerCase() : ""}"><b class="nw">${esc(o ? o.numero : "Obra")}</b><small>${esc(o ? (o.titulo || (o.cliente ? o.cliente.nombre : "")) : "Ya no existe")}</small>${TURNO_C[p.turno] ? `<span class="prog-t">${TURNO_C[p.turno]}</span>` : ""}</button>`; };
    const celda = (r, f) => { const l = prog.filter(p => p.recurso_id === r.id && p.fecha === f).sort((a, b) => (a.turno === "manana" ? 0 : 1) - (b.turno === "manana" ? 0 : 1)); const lleno = l.some(p => p.turno === "dia") || l.length >= 2; return `${l.map(chip).join("")}${ed && !lleno ? `<button class="prog-mas" type="button" data-prog-nuevo="${r.id}|${f}" aria-label="Programar ${esc(r.nombre)} el ${esc(fDia(f))}">${ico("plus", 14)}</button>` : ""}${!l.length && !ed ? `<span class="suave prog-libre">Libre</span>` : ""}`; };
    const icoR = r => `<span class="icono ${r.tipo === "cuadrilla" ? "azul" : "laton"}">${ico(r.tipo === "cuadrilla" ? "users" : "truck", 16)}</span>`;
    const nombreR = r => `<span class="prog-r">${icoR(r)}<span><b>${esc(r.nombre)}</b><small>${esc([r.tipo === "cuadrilla" && r.personas ? `${r.personas} personas` : "", r.detalle].filter(Boolean).join(" · ") || D.TIPOS_REC[r.tipo])}</small></span></span>`;
    const pestG = v.querySelector(".pest-grupo");
    v.innerHTML = `<div class="cuerpo prog">
      <div class="cab-v"><div><h1 class="t">Programación</h1><p class="desc">Qué cuadrilla y qué vehículos van a cada obra, día por día. No deja poner el mismo recurso en dos obras a la vez.</p></div>${ed ? `<button class="s-btn suave-b" type="button" data-recursos>${ico("users", 15)}Cuadrillas y vehículos</button>` : ""}</div>
      <div class="prog-nav"><button class="s-ib" type="button" aria-label="Semana anterior" data-sem="-7">${ico("chev", 16, 2.2)}</button><b>${esc(fDia(dias[0].f))} – ${esc(fDia(dias[5].f))}</b><button class="s-ib prog-sig" type="button" aria-label="Semana siguiente" data-sem="7">${ico("chev", 16, 2.2)}</button>${semana !== semanaActual() ? `<button class="s-btn suave-b chico" type="button" data-sem-hoy>Esta semana</button>` : ""}${ed && !prog.length && activos.length ? `<button class="s-btn suave-b chico" type="button" data-copiar>${ico("layers", 14)}Copiar la semana pasada</button>` : ""}</div>
      ${!activos.length ? `<div class="vacio"><span class="icono gris">${ico("users", 22)}</span><h2>Todavía no hay cuadrillas ni vehículos</h2><p>Agréguelos una vez y después se programan cada semana.</p>${ed ? `<button class="s-btn lleno" type="button" data-recursos>${ico("plus", 15)}Agregar cuadrillas y vehículos</button>` : ""}</div>` : `
      <div class="prog-grid" style="--dias:${dias.length}">
        <div class="prog-h"></div>${dias.map(d => `<div class="prog-h ${d.f === hoyISO() ? "hoy" : ""}"><b>${d.n}</b><small>${esc(fDia(d.f))}</small></div>`).join("")}
        ${activos.map(r => `<div class="prog-rc">${nombreR(r)}</div>${dias.map(d => `<div class="prog-c ${d.f === hoyISO() ? "hoy" : ""}">${celda(r, d.f)}</div>`).join("")}`).join("")}
      </div>
      <div class="prog-movil">
        <nav class="seg prog-dias" aria-label="Día">${dias.map(d => `<button type="button" data-dia="${d.f}" aria-pressed="${d.f === diaSel}"><b>${d.n}</b><small>${deIso(d.f).getDate()}</small></button>`).join("")}</nav>
        <div class="lista prog-lista">${activos.map(r => `<div class="fila prog-mf">${nombreR(r)}<span class="prog-cm">${celda(r, diaSel)}</span></div>`).join("")}</div>
      </div>`}
    </div>`;
    if (pestG) v.querySelector(".cuerpo").prepend(pestG);
    const recargar = () => A().quieto(() => vista(v));
    v.onclick = async e => {
      const s = e.target.closest("[data-sem]"); if (s) { semana = sumar(semana, Number(s.dataset.sem)); diaSel = null; await recargar(); return; }
      if (e.target.closest("[data-sem-hoy]")) { semana = semanaActual(); diaSel = null; await recargar(); return; }
      const dd = e.target.closest("[data-dia]"); if (dd) { diaSel = dd.dataset.dia; await recargar(); return; }
      if (e.target.closest("[data-recursos]")) { gestionar(recargar); return; }
      if (e.target.closest("[data-copiar]")) { try { const r = await D.copiarSemana(sumar(semana, -7), semana); A().aviso(r.n ? `Se copiaron ${r.n} ${r.n === 1 ? "asignación" : "asignaciones"}${r.saltadas ? `; ${r.saltadas} no, porque chocaban` : ""}.` : "La semana pasada estaba vacía."); await recargar(); } catch (er) { A().aviso(er.message, "mal"); } return; }
      const n = e.target.closest("[data-prog-nuevo]"); if (n) { const [rid, f] = n.dataset.progNuevo.split("|"); asignar({ recurso_id: Number(rid), fecha: f }, activos, elegibles, obraPor, recargar); return; }
      const pe = e.target.closest("[data-prog-ed]"); if (pe && ed) { const p = prog.find(x => x.id === Number(pe.dataset.progEd)); if (p) asignar(p, activos, elegibles, obraPor, recargar); }
    };
  }

  function asignar(p0, recursos, obras, obraPor, recargar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const r = recursos.find(x => x.id === p0.recurso_id);
    const lista = obras.slice(); if (p0.obra_id && !lista.some(o => o.id === p0.obra_id) && obraPor[p0.obra_id]) lista.unshift(obraPor[p0.obra_id]);
    let turno = p0.turno || "dia";
    const m = modal({
      titulo: `${r ? r.nombre : "Programar"} · ${fDia(p0.fecha)}`, guardarTxt: "Guardar",
      quitar: p0.id ? async () => { try { await D.quitarAsignacion(p0.id); cerrarCapas(); aviso("Quitado de la programación."); await recargar(); } catch (er) { aviso(er.message, "mal"); } } : null,
      cuerpo: lista.length ? `<label class="f-campo">Obra<select name="obra"><option value="">Escoja la obra</option>${lista.map(o => `<option value="${o.id}" ${o.id === p0.obra_id ? "selected" : ""}>${esc(o.numero)} · ${esc(o.cliente ? o.cliente.nombre : "")}${o.titulo ? " · " + esc(o.titulo) : ""}</option>`).join("")}</select></label>
        <div class="f-campo"><span>Turno</span><div class="seg" role="group" aria-label="Turno">${Object.entries(D.TURNOS).map(([k, t]) => `<button type="button" data-turno="${k}" aria-pressed="${k === turno}">${t}</button>`).join("")}</div></div>
        <label class="f-campo">Nota <small>opcional</small><input name="nota" value="${esc(p0.nota || "")}" autocomplete="off" placeholder="Por ejemplo: llevar escalera de 32 pies"></label>`
        : `<p class="suave" style="font-size:15px">No hay obras programadas ni en curso para escoger.</p>`,
      alAbrir: (f, mm) => mm.addEventListener("click", ev => { const b = ev.target.closest("[data-turno]"); if (!b) return; turno = b.dataset.turno; mm.querySelectorAll("[data-turno]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }),
      alGuardar: async f => { if (!f.obra) { cerrarCapas(); return; } await D.asignar({ id: p0.id || null, fecha: p0.fecha, recurso_id: p0.recurso_id, obra_id: f.obra.value, turno, nota: f.nota.value }); cerrarCapas(); aviso("Programado."); await recargar(); }
    });
    return m;
  }

  async function gestionar(alCerrar) {
    const { modal, esc, ico, cerrarCapas, aviso } = A();
    const l = await D.recursos();
    const fila = r => `<div class="fila num-f" style="cursor:default"><span class="icono ${r.activo === false ? "gris" : r.tipo === "cuadrilla" ? "azul" : "laton"}">${ico(r.tipo === "cuadrilla" ? "users" : "truck", 16)}</span><span><b>${esc(r.nombre)}</b><small>${esc([D.TIPOS_REC[r.tipo], r.tipo === "cuadrilla" && r.personas ? `${r.personas} personas` : "", r.detalle, r.activo === false ? "no se usa" : ""].filter(Boolean).join(" · "))}</small></span><button class="s-ib" type="button" aria-label="Cambiar ${esc(r.nombre)}" data-rec-ed="${r.id}">${ico("pen", 15)}</button></div>`;
    modal({
      titulo: "Cuadrillas y vehículos", guardarTxt: "Listo", soloUno: true,
      cuerpo: `${l.length ? `<div class="lista sin-chip">${l.map(fila).join("")}</div>` : `<p class="suave" style="font-size:15px">Agregue sus cuadrillas y sus vehículos o equipo: camión, canasta, grúa…</p>`}
        <div class="fila-b"><button class="s-btn suave-b" type="button" data-rec-nuevo="cuadrilla">${ico("plus", 15)}Cuadrilla</button><button class="s-btn suave-b" type="button" data-rec-nuevo="vehiculo">${ico("plus", 15)}Vehículo o equipo</button></div>`,
      alAbrir: (f, mm) => mm.addEventListener("click", ev => {
        const n = ev.target.closest("[data-rec-nuevo]"); if (n) { editarRec({ tipo: n.dataset.recNuevo }, alCerrar); return; }
        const e = ev.target.closest("[data-rec-ed]"); if (e) editarRec(l.find(r => r.id === Number(e.dataset.recEd)), alCerrar);
      }),
      alGuardar: async () => { cerrarCapas(); await alCerrar(); }
    });
  }

  function editarRec(r0, alCerrar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const cuad = r0.tipo === "cuadrilla";
    modal({
      titulo: r0.id ? `Cambiar ${r0.nombre}` : cuad ? "Cuadrilla nueva" : "Vehículo o equipo nuevo", guardarTxt: "Guardar",
      cuerpo: `<label class="f-campo">Nombre<input name="nombre" value="${esc(r0.nombre || "")}" autocomplete="off" placeholder="${cuad ? "Cuadrilla de Luis" : "Canasta 1"}"></label>
        <div class="f-fila"><label class="f-campo">${cuad ? "Jefe de cuadrilla" : "Tipo y placa"} <small>opcional</small><input name="detalle" value="${esc(r0.detalle || "")}" autocomplete="off" placeholder="${cuad ? "Luis Pérez" : "Grúa · P-123ABC"}"></label>
        ${cuad ? `<label class="f-campo">Personas <small>opcional</small><input name="personas" inputmode="numeric" value="${esc(r0.personas || "")}" autocomplete="off"></label>` : `<label class="f-campo">Teléfono <small>opcional</small><input name="telefono" inputmode="tel" value="${esc(r0.telefono || "")}" autocomplete="off"></label>`}</div>
        ${cuad ? `<label class="f-campo">Teléfono <small>opcional</small><input name="telefono" inputmode="tel" value="${esc(r0.telefono || "")}" autocomplete="off"></label>` : ""}
        ${r0.id ? `<label class="sw-fila"><span>Se usa<small style="display:block;font-size:12.5px;color:var(--text-muted)">Si lo apaga, ya no sale en la agenda.</small></span><input type="checkbox" class="sw" name="activo" ${r0.activo !== false ? "checked" : ""}></label>` : ""}`,
      alGuardar: async f => {
        await D.guardarRecurso({ id: r0.id || null, tipo: r0.tipo, nombre: f.nombre.value, detalle: f.detalle.value, telefono: f.telefono ? f.telefono.value : null, personas: f.personas ? f.personas.value.trim() : null, activo: f.activo ? f.activo.checked : true });
        cerrarCapas(); aviso("Guardado."); await alCerrar(); gestionar(alCerrar);
      }
    });
  }

  async function deObra(box, o) {
    if (!box) return;
    const { esc, ico } = A();
    const desde = hoyISO(), hasta = sumar(desde, 13);
    const [prog, rec] = await Promise.all([D.programacion(desde, hasta, o.id), D.recursos()]);
    if (!prog.length) { box.innerHTML = ""; return; }
    const rp = Object.fromEntries(rec.map(r => [r.id, r]));
    const porDia = {}; prog.forEach(p => { (porDia[p.fecha] = porDia[p.fecha] || []).push(p); });
    const dia = f => deIso(f).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short" });
    box.innerHTML = `<div class="sub"><h2>Programado</h2><a class="s-btn suave-b" href="#/programacion">${ico("clock", 15)}Ver la agenda</a></div>
      <div class="lista sin-chip">${Object.keys(porDia).sort().map(f => `<div class="fila" style="cursor:default"><span class="icono ${f === desde ? "azul" : "gris"}">${ico("clock", 16)}</span><span><b>${esc(dia(f))}${f === desde ? " · hoy" : ""}</b><small>${porDia[f].map(p => `${esc(rp[p.recurso_id] ? rp[p.recurso_id].nombre : "Recurso")}${TURNO_C[p.turno] ? ` (${TURNO_C[p.turno].toLowerCase()})` : ""}`).join(" · ")}</small></span><span></span></div>`).join("")}</div>`;
  }

  return { vista, deObra };
})();
