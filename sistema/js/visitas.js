"use strict";
window.EMT_VISITAS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const deIso = f => { const [y, m, d] = f.split("-").map(Number); return new Date(y, m - 1, d); };
  const sumar = (f, n) => { const x = deIso(f); x.setDate(x.getDate() + n); return iso(x); };
  const hoyISO = () => iso(new Date());
  const fDia = f => deIso(f).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });
  const fCorto = f => deIso(f).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short" });
  const telDe = t => { const d = String(t || "").replace(/\D/g, ""); return d ? (d.length === 8 ? "502" + d : d) : ""; };
  const CHIP = { programada: "azul", hecha: "verde", cancelada: "gris" };
  let dia = null, quienF = null;

  async function ingenieros() {
    const p = A().sesion().perfil;
    const us = D.usuarios ? await D.usuarios().catch(() => []) : [];
    const l = us.filter(u => u.activo !== false && ["ingenieria", "ventas", "gerencia"].includes(u.rol));
    if (!l.some(u => u.id === p.id)) l.unshift({ id: p.id, nombre: p.nombre, rol: p.rol });
    return l;
  }
  const mensaje = (v, emp) => { const n = (v.contacto || (v.prospecto && v.prospecto.nombre) || "").split(/\s+/)[0]; return `Buen día${n ? ", " + n : ""}. Le escribimos de ${emp.nombre || "EMTECSA"} para confirmar la visita técnica del ${fDia(v.fecha)}${v.hora ? " a las " + v.hora : ""}. Va ${v.ingeniero_nombre || "nuestro ingeniero"}${v.lugar ? ` a ${v.lugar}` : ""}. ¿Nos confirma, por favor?`; };

  async function vista(v) {
    const { esc, ico } = A();
    const p = A().sesion().perfil;
    if (!dia) dia = hoyISO();
    if (quienF == null) quienF = p.rol === "ingenieria" ? p.id : "todos";
    const lunes = (f => { const x = deIso(f); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); })(dia);
    const semana = Array.from({ length: 7 }, (_, i) => sumar(lunes, i));
    const [todas, ings, emp] = await Promise.all([D.visitas(semana[0], semana[6]), ingenieros(), D.empresa()]);
    const deQuien = x => quienF === "todos" || x.ingeniero === quienF;
    const delDia = todas.filter(x => x.fecha === dia && deQuien(x));
    const porIng = {}; delDia.filter(x => x.estado !== "cancelada").forEach(x => { (porIng[x.ingeniero || "-"] = porIng[x.ingeniero || "-"] || []).push(x); });
    const tarjeta = x => {
      const tel = telDe(x.telefono || (x.prospecto && x.prospecto.telefono) || (x.cliente && x.cliente.telefono));
      const mapa = x.lat != null && x.lng != null ? `https://maps.google.com/?q=${x.lat},${x.lng}` : x.lugar ? `https://maps.google.com/?q=${encodeURIComponent(x.lugar)}` : "";
      return `<article class="vis-t ${x.estado}"><div class="vis-h"><b class="vis-hora">${esc(x.hora || "—")}</b><span><b>${esc(x.quien)}</b><small>${esc([x.lugar, x.motivo].filter(Boolean).join(" · ") || "Sin lugar")}</small></span><span class="chip ${CHIP[x.estado]}">${esc(D.ESTADOS_VISITA[x.estado])}</span></div>
        ${x.estado === "hecha" && x.resultado ? `<p class="suave vis-r">${esc(x.resultado.que)}${x.resultado.siguiente ? ` · siguiente: ${esc(D.SIGUIENTE_VISITA[x.resultado.siguiente].toLowerCase())}` : ""}</p>` : ""}
        <div class="fila-b vis-acc">${x.estado === "programada" ? `<button class="s-btn ${x.fecha <= hoyISO() ? "lleno" : "suave-b"} chico" type="button" data-vis-res="${x.id}">${ico("check", 14)}Anotar el levantamiento</button>` : `<button class="s-btn suave-b chico" type="button" data-vis-res="${x.id}">${ico("eye", 14)}Ver levantamiento</button>`}
        ${tel && x.estado === "programada" ? `<a class="s-btn suave-b chico" href="${esc(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje(x, emp))}`)}" target="_blank" rel="noopener" data-vis-rec="${x.id}">${ico("chat", 14)}${x.recordada ? "Recordar otra vez" : "Recordar"}</a>` : ""}
        ${mapa ? `<a class="s-btn suave-b chico" href="${esc(mapa)}" target="_blank" rel="noopener">${ico("map", 14)}Mapa</a>` : ""}
        <button class="s-ib" type="button" aria-label="Cambiar la visita a ${esc(x.quien)}" data-vis-ed="${x.id}">${ico("pen", 15)}</button></div></article>`;
    };
    const pestG = v.querySelector(".pest-grupo");
    v.innerHTML = `<div class="cuerpo visv">
      <div class="cab-v"><div><h1 class="t">Visitas</h1><p class="desc">Las visitas técnicas por ingeniero y por día. Al terminar se anota el levantamiento y se pasa a cotizar.</p></div><button class="s-btn lleno" type="button" data-vis-nueva>${ico("plus", 16)}Agendar visita</button></div>
      <div class="herr vis-herr">${ings.length > 1 ? `<label class="vis-quien"><span class="sr">De quién</span><select data-vis-quien><option value="todos" ${quienF === "todos" ? "selected" : ""}>Todos</option>${ings.map(u => `<option value="${esc(u.id)}" ${quienF === u.id ? "selected" : ""}>${esc(u.nombre)}${u.id === p.id ? " (yo)" : ""}</option>`).join("")}</select></label>` : ""}
        <span class="vis-nav"><button class="s-ib" type="button" aria-label="Semana anterior" data-vis-sem="-7">${ico("chev", 16, 2.2)}</button><button class="s-ib vis-sig" type="button" aria-label="Semana siguiente" data-vis-sem="7">${ico("chev", 16, 2.2)}</button>${dia !== hoyISO() ? `<button class="s-btn suave-b chico" type="button" data-vis-hoy>Hoy</button>` : ""}</span></div>
      <nav class="seg vis-dias" aria-label="Día">${semana.map(f => { const n = todas.filter(x => x.fecha === f && x.estado !== "cancelada" && deQuien(x)).length; return `<button type="button" data-vis-dia="${f}" aria-pressed="${f === dia}" class="${f === hoyISO() ? "es-hoy" : ""}"><b>${esc(deIso(f).toLocaleDateString("es-GT", { weekday: "short" }).replace(".", ""))}</b><small>${deIso(f).getDate()}</small>${n ? `<i>${n}</i>` : ""}</button>`; }).join("")}</nav>
      <div class="sub"><h2>${esc(fDia(dia).replace(/^./, c => c.toUpperCase()))}</h2></div>
      ${delDia.length ? Object.entries(porIng).map(([id, l]) => { const ruta = D.rutaVisitas(l.filter(x => x.estado === "programada")); return `<section class="vis-ing"><div class="vis-ing-c"><b>${esc(l[0].ingeniero_nombre || "Sin asignar")}</b><small>${l.length} ${l.length === 1 ? "visita" : "visitas"}</small>${ruta ? `<a class="s-btn suave-b chico" href="${esc(ruta)}" target="_blank" rel="noopener">${ico("map", 14)}Ruta del día</a>` : ""}</div>${l.map(tarjeta).join("")}</section>`; }).join("") + (delDia.some(x => x.estado === "cancelada") ? `<p class="suave" style="font-size:13px">${delDia.filter(x => x.estado === "cancelada").length} cancelada(s) este día.</p>` : "")
        : `<div class="vacio chico"><p>No hay visitas este día.</p></div>`}
    </div>`;
    if (pestG) v.querySelector(".cuerpo").prepend(pestG);
    const recargar = () => A().quieto(() => vista(v));
    v.onchange = async e => { if (e.target.matches("[data-vis-quien]")) { quienF = e.target.value; await recargar(); } };
    v.onclick = async e => {
      if (e.target.closest("[data-vis-nueva]")) { agendar({ fecha: dia }, recargar); return; }
      const s = e.target.closest("[data-vis-sem]"); if (s) { dia = sumar(dia, Number(s.dataset.visSem)); await recargar(); return; }
      if (e.target.closest("[data-vis-hoy]")) { dia = hoyISO(); await recargar(); return; }
      const d = e.target.closest("[data-vis-dia]"); if (d) { dia = d.dataset.visDia; await recargar(); return; }
      const rc = e.target.closest("[data-vis-rec]"); if (rc) { D.marcarRecordada(Number(rc.dataset.visRec)).catch(() => {}); return; }
      const ed = e.target.closest("[data-vis-ed]"); if (ed) { agendar(todas.find(x => x.id === Number(ed.dataset.visEd)), recargar); return; }
      const r = e.target.closest("[data-vis-res]"); if (r) levantamiento(todas.find(x => x.id === Number(r.dataset.visRes)), recargar);
    };
  }

  async function agendar(v0, recargar, op0) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const [ings, clientes, ops] = await Promise.all([ingenieros(), D.clientes(), D.oportunidades ? D.oportunidades().catch(() => []) : []]);
    const abiertas = ops.filter(x => D.ABIERTAS_OP.includes(x.etapa));
    const p = A().sesion().perfil;
    const esNueva = !v0 || !v0.id;
    const opIni = op0 || (v0 && v0.oportunidad_id ? ops.find(x => x.id === v0.oportunidad_id) : null);
    let cli = v0 && v0.cliente_id ? clientes.find(c => c.id === v0.cliente_id) : opIni && opIni.cliente_id ? clientes.find(c => c.id === opIni.cliente_id) : null;
    let cliFull = cli ? await D.cliente(cli.id).catch(() => null) : null;
    const pr = (v0 && v0.prospecto) || (opIni && opIni.prospecto) || null;
    const sitiosHTML = c => c && (c.sitios || []).length ? `<option value="">Otro lugar</option>${c.sitios.map(s => `<option value="${s.id}" ${v0 && v0.sitio_id === s.id ? "selected" : ""}>${esc(s.nombre)}${s.municipio ? " · " + esc(s.municipio) : ""}</option>`).join("")}` : `<option value="">El cliente no tiene sitios</option>`;
    const m = modal({
      titulo: esNueva ? "Agendar visita técnica" : "Cambiar la visita", guardarTxt: "Guardar",
      quitar: !esNueva ? async () => { if (v0.estado === "programada") { await D.cancelarVisita(v0.id); aviso("Visita cancelada."); } else { await D.quitarVisita(v0.id); aviso("Visita quitada."); } cerrarCapas(); await recargar(); } : null, quitarTxt: !esNueva && v0.estado === "programada" ? "Cancelar visita" : "Quitar",
      cuerpo: `${abiertas.length ? `<label class="f-campo">Oportunidad <small>opcional</small><select name="op"><option value="">Sin oportunidad</option>${abiertas.map(x => `<option value="${x.id}" ${opIni && opIni.id === x.id ? "selected" : ""}>${esc(x.titulo)} · ${esc(x.quien)}</option>`).join("")}</select></label>` : ""}
        <div class="f-campo" data-v-cli ${pr && !cli ? "hidden" : ""}><span>Cliente</span><div data-pick-cli></div></div>
        ${pr && !cli ? `<p class="suave" data-v-pro style="margin:0;font-size:14px">Prospecto: <b>${esc(pr.nombre)}</b>${pr.telefono ? " · " + esc(pr.telefono) : ""}</p>` : ""}
        <div class="f-fila"><label class="f-campo">Día<input type="date" name="fecha" value="${esc((v0 && v0.fecha) || hoyISO())}"></label><label class="f-campo">Hora<input type="time" name="hora" value="${esc((v0 && v0.hora) || "09:00")}"></label></div>
        <label class="f-campo">Quién va<select name="ing">${ings.map(u => `<option value="${esc(u.id)}" ${((v0 && v0.ingeniero) || (p.rol === "ingenieria" ? p.id : "")) === u.id ? "selected" : ""}>${esc(u.nombre)}</option>`).join("")}</select></label>
        <label class="f-campo">Sitio del cliente<select name="sitio">${sitiosHTML(cliFull)}</select></label>
        <div class="f-fila"><label class="f-campo">Dónde<input name="lugar" value="${esc((v0 && v0.lugar) || (pr && pr.direccion) || "")}" autocomplete="off" placeholder="Dirección o referencia"></label><label class="f-campo">Ubicación <small>opcional</small><input name="mapa" value="${esc(v0 && v0.lat != null ? `${v0.lat}, ${v0.lng}` : "")}" autocomplete="off" placeholder="Enlace de Google Maps"></label></div>
        <div class="f-fila"><label class="f-campo">Contacto en el sitio<input name="contacto" value="${esc((v0 && v0.contacto) || (pr && pr.nombre) || "")}" autocomplete="off"></label><label class="f-campo">Teléfono<input name="tel" inputmode="tel" value="${esc((v0 && v0.telefono) || (pr && pr.telefono) || (cli && cli.telefono) || "")}" autocomplete="off"></label></div>
        <label class="f-campo">A qué va <small>opcional</small><input name="motivo" value="${esc((v0 && v0.motivo) || "")}" autocomplete="off" placeholder="Levantamiento para transformador de 75 kVA"></label>`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho");
        const pick = f.querySelector("[data-pick-cli]");
        const alCli = async c => { cli = c; cliFull = c ? await D.cliente(c.id).catch(() => null) : null; f.sitio.innerHTML = sitiosHTML(cliFull); if (c && !f.tel.value) f.tel.value = c.telefono || ""; };
        if (window.EMT_COBROS && window.EMT_COBROS.buscadorCliente) window.EMT_COBROS.buscadorCliente(pick, clientes, alCli, cli);
        if (f.op) f.op.addEventListener("change", async () => { const x = abiertas.find(z => z.id === Number(f.op.value)); if (x && x.cliente_id) { const c = clientes.find(z => z.id === x.cliente_id); if (window.EMT_COBROS) window.EMT_COBROS.buscadorCliente(pick, clientes, alCli, c); await alCli(c); } if (x && !f.motivo.value) f.motivo.value = x.titulo; });
        f.sitio.addEventListener("change", () => { const s = cliFull && (cliFull.sitios || []).find(z => z.id === Number(f.sitio.value)); if (s) { f.lugar.value = [s.direccion, s.municipio, s.departamento].filter(Boolean).join(", ") || s.nombre; f.mapa.value = s.mapa || (s.lat != null ? `${s.lat}, ${s.lng}` : ""); } });
      },
      alGuardar: async f => {
        const opSel = f.op && f.op.value ? abiertas.find(z => z.id === Number(f.op.value)) : opIni;
        const u = ings.find(z => z.id === f.ing.value);
        const id = await D.guardarVisita({ id: esNueva ? null : v0.id, fecha: f.fecha.value, hora: f.hora.value, ingeniero: u ? u.id : null, ingeniero_nombre: u ? u.nombre : null, oportunidad_id: opSel ? opSel.id : null, cliente_id: cli ? cli.id : null, prospecto: !cli ? (opSel && opSel.prospecto) || pr : null, sitio_id: f.sitio.value || null, lugar: f.lugar.value, mapa: f.mapa.value, contacto: f.contacto.value, telefono: f.tel.value, motivo: f.motivo.value });
        cerrarCapas(); aviso(esNueva ? "Visita agendada. Le llega el aviso a quien va." : "Visita guardada."); dia = f.fecha.value; await recargar();
        return id;
      }
    });
    return m;
  }

  async function levantamiento(v, recargar) {
    const { modal, esc, ico, cerrarCapas, aviso } = A();
    const r = v.resultado || {};
    let archivos = [], quitar = [];
    const fotosHTML = async () => (await Promise.all((v.fotos || []).map(async (ref, i) => { const u = await D.fotoVisita(ref); return u ? `<figure class="vis-foto"><img src="${esc(u)}" alt="Foto ${i + 1} de la visita"><button class="s-ib" type="button" aria-label="Opciones de la foto ${i + 1}" data-vf="${esc(ref)}">${ico("pen", 13)}</button></figure>` : ""; }))).join("");
    const ya = await fotosHTML();
    const m = modal({
      titulo: `Levantamiento · ${v.quien}`, guardarTxt: v.estado === "hecha" ? "Guardar" : "Visita hecha",
      cuerpo: `<p class="suave" style="margin:0;font-size:13.5px">${esc(fDia(v.fecha).replace(/^./, c => c.toUpperCase()))}${v.hora ? " · " + esc(v.hora) : ""}${v.lugar ? " · " + esc(v.lugar) : ""}</p>
        <label class="f-campo">Qué se vio<textarea name="que" rows="3" placeholder="Por ejemplo: acometida en mal estado, tablero sin espacio, piden 75 kVA para ampliar la bodega">${esc(r.que || "")}</textarea></label>
        <div class="f-fila"><label class="f-campo">Carga instalada (kW)<input name="carga" inputmode="decimal" value="${esc(r.carga_kw ?? "")}" autocomplete="off"></label><label class="f-campo">Voltaje<input name="voltaje" value="${esc(r.voltaje || "")}" autocomplete="off" placeholder="240/120 V"></label></div>
        <div class="f-fila"><label class="f-campo">Corriente (A)<input name="corr" inputmode="decimal" value="${esc(r.corriente ?? "")}" autocomplete="off"></label><label class="f-campo">Factor de potencia<input name="fp" inputmode="decimal" value="${esc(r.fp ?? "")}" autocomplete="off" placeholder="0.92"></label></div>
        <div class="f-fila"><label class="f-campo">Transformador actual (kVA)<input name="kva" inputmode="decimal" value="${esc(r.trafo_kva ?? "")}" autocomplete="off"></label><label class="f-campo">Estado del transformador<select name="trafo"><option value="">No hay o no se vio</option>${["Bueno", "Regular", "Malo", "Sobrecargado"].map(x => `<option ${r.trafo_estado === x ? "selected" : ""}>${x}</option>`).join("")}</select></label></div>
        <div class="f-campo"><span>Fotos</span><div class="vis-fotos" data-fotos>${ya}</div><label class="s-btn suave-b chico vis-subir">${ico("plus", 14)}Agregar fotos<input type="file" accept="image/*" multiple capture="environment" data-fotos-in hidden></label><small data-fotos-n></small></div>
        <div class="f-campo"><span>Siguiente paso</span><div class="seg" role="group" aria-label="Siguiente paso">${Object.entries(D.SIGUIENTE_VISITA).map(([k, n]) => `<button type="button" data-sig="${k}" aria-pressed="${(r.siguiente || "cotizar") === k}">${n}</button>`).join("")}</div></div>
        <label class="f-campo">Notas <small>opcional</small><textarea name="notas" rows="2">${esc(r.notas || "")}</textarea></label>`,
      alAbrir: (f, mm) => {
        mm.classList.add("modal-ancho");
        f.dataset.sig = r.siguiente || "cotizar";
        mm.addEventListener("click", ev => {
          const s = ev.target.closest("[data-sig]"); if (s) { f.dataset.sig = s.dataset.sig; mm.querySelectorAll("[data-sig]").forEach(b => b.setAttribute("aria-pressed", String(b === s))); }
          const q = ev.target.closest("[data-vf]"); if (q) { const fig = q.closest("figure"); const on = fig.classList.toggle("quitar"); if (on) quitar.push(q.dataset.vf); else quitar = quitar.filter(x => x !== q.dataset.vf); }
        });
        f.querySelector("[data-fotos-in]").addEventListener("change", ev => { archivos = archivos.concat([...ev.target.files]); f.querySelector("[data-fotos-n]").textContent = `${archivos.length} ${archivos.length === 1 ? "foto nueva" : "fotos nuevas"} para subir${quitar.length ? ` · ${quitar.length} para quitar` : ""}.`; });
      },
      alGuardar: async f => {
        aviso(archivos.length ? "Guardando y subiendo fotos…" : "Guardando…");
        const res = await D.guardarResultado(v, { que: f.que.value, carga_kw: f.carga.value, voltaje: f.voltaje.value, corriente: f.corr.value, fp: f.fp.value, trafo_kva: f.kva.value, trafo_estado: f.trafo.value, siguiente: f.dataset.sig, notas: f.notas.value }, archivos, quitar);
        cerrarCapas(); await recargar();
        if (res.siguiente === "otra") { aviso("Levantamiento guardado. Agende la otra visita."); agendar({ fecha: sumar(v.fecha, 7), ingeniero: v.ingeniero, cliente_id: v.cliente_id, prospecto: v.prospecto, oportunidad_id: v.oportunidad_id, lugar: v.lugar, lat: v.lat, lng: v.lng, contacto: v.contacto, telefono: v.telefono, motivo: v.motivo, hora: v.hora }, recargar); return; }
        if (res.siguiente === "cotizar" && v.oportunidad_id && D.cotizarOportunidad) {
          const op = (await D.oportunidades()).find(z => z.id === v.oportunidad_id);
          if (op && !op.cotizacion_id) { aviso("Levantamiento guardado."); modal({ titulo: "Levantamiento guardado", guardarTxt: "Cotizar ahora", cuerpo: `<p class="suave" style="font-size:15px">La oportunidad «${esc(op.titulo)}» está lista para cotizar.</p>`, alGuardar: async () => { if (!op.cliente_id) { cerrarCapas(); location.hash = "#/oportunidades"; aviso("Abra la oportunidad y toque «Cotizar» para crear la ficha del cliente."); return; } const cot = await D.cotizarOportunidad(op); cerrarCapas(); location.hash = `#/cotizaciones/${cot}`; } }); return; }
        }
        aviso("Levantamiento guardado.");
      }
    });
    return m;
  }

  async function avisosHoy(p) {
    const h = hoyISO(), man = sumar(h, 1);
    const l = await D.visitas(h, man).catch(() => []);
    const mias = l.filter(x => x.estado === "programada" && x.ingeniero === p.id && x.fecha === h);
    const out = mias.map(x => ({ c: "azul", i: "map", t: `Visita hoy${x.hora ? " " + x.hora : ""}: ${x.quien}`, d: [x.lugar, x.motivo].filter(Boolean).join(" · ") || "Visita técnica", chip: "Hoy", accion: "Ver", h: "#/visitas" }));
    if (D.puede(p, "editarCotizacion")) {
      const emp = await D.empresa();
      l.filter(x => x.estado === "programada" && x.fecha === man && !x.recordada && (p.rol === "gerencia" || p.rol === "administracion" || x.creado_por === p.id || x.ingeniero === p.id)).forEach(x => {
        const tel = telDe(x.telefono || (x.prospecto && x.prospecto.telefono) || (x.cliente && x.cliente.telefono));
        if (!tel) return;
        out.push({ c: "laton", i: "chat", t: `Recordar visita de mañana: ${x.quien}`, d: `${fCorto(x.fecha)}${x.hora ? " " + x.hora : ""} · va ${x.ingeniero_nombre || "alguien del equipo"}`, chip: "WhatsApp", accion: "Recordar", h: `https://wa.me/${tel}?text=${encodeURIComponent(mensaje(x, emp))}`, externo: true, recordar: x.id });
      });
    }
    return out;
  }

  return { vista, agendar, avisosHoy };
})();
