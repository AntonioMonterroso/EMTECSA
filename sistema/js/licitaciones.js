"use strict";
window.EMT_LICITACIONES = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { preparando: "azul", presentada: "ambar", ganada: "verde", perdida: "gris", desierta: "gris", no_participa: "gris" };
  const CHIP_DOC = { ok: "verde", falta: "gris", pronto: "ambar", vencido: "rojo" };
  const hoyISO = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const deIso = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const fCorta = f => f ? deIso(f).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: deIso(f).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }) : "";
  const fLarga = f => f ? deIso(f).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" }) : "";
  const dias = f => Math.round((deIso(f) - deIso(hoyISO())) / 864e5);
  const cuando = f => { const d = dias(f); return d === 0 ? "Hoy" : d === 1 ? "Mañana" : d === -1 ? "Ayer" : d > 0 ? `En ${d} días` : `Hace ${-d} días`; };
  const guate = nog => `https://www.guatecompras.gt/concursos/consultaConcurso.aspx?nog=${encodeURIComponent(nog)}`;
  let modo = "activas";

  async function vendedores() {
    const p = A().sesion().perfil;
    const us = D.usuarios ? await D.usuarios().catch(() => []) : [];
    const l = us.filter(u => u.activo !== false && u.rol && D.puede({ rol: u.rol }, "editarCotizacion"));
    if (!l.some(u => u.id === p.id)) l.unshift({ id: p.id, nombre: p.nombre });
    return l;
  }
  const listos = x => (x.papeles || []).filter(z => z.listo).length;

  async function vista(v, sub) {
    if (/^\d+$/.test(sub || "")) return ficha(v, Number(sub));
    if (["activas", "cerradas", "papeles", "competencia"].includes(sub)) modo = sub;
    const { esc, ico, Q } = A();
    const [l, docs] = await Promise.all([D.licitaciones(), D.documentosEmpresa()]);
    const act = l.filter(x => D.ACTIVAS_LIC.includes(x.estado));
    const prox = act.filter(x => x.ofertas && x.ofertas >= hoyISO() && x.estado === "preparando").sort((a, b) => a.ofertas.localeCompare(b.ofertas))[0];
    const c = D.competencia(l);
    const malos = docs.filter(z => z.en_lista && ["vencido", "pronto"].includes(D.estadoDoc(z).k));
    const fila = x => {
      const pf = D.proximaFecha(x);
      const tot = (x.papeles || []).length, ls = listos(x);
      const urg = pf && dias(pf.f) <= 3;
      return `<a class="fila lic-f" href="#/licitaciones/${x.id}"><span class="icono ${x.estado === "ganada" ? "verde" : D.ACTIVAS_LIC.includes(x.estado) ? "laton" : "gris"}">${ico(x.estado === "ganada" ? "check" : "file", 18)}</span>
        <span><b>${esc(x.titulo)}</b><small>${esc([x.nog ? "NOG " + x.nog : "", x.entidad].filter(Boolean).join(" · "))}</small>
        ${D.ACTIVAS_LIC.includes(x.estado) ? `<small class="${urg ? "falta" : ""}">${pf ? `${esc(pf.n)}: ${esc(cuando(pf.f).toLowerCase())}${pf.k === "ofertas" && x.ofertas_hora ? " a las " + esc(x.ofertas_hora) : ""}` : "Sin fechas por venir"}${x.estado === "preparando" && tot ? ` · papeles ${ls} de ${tot}` : ""}</small>` : x.resultado && x.resultado.ganador ? `<small>Ganó ${esc(x.resultado.ganador)}${x.resultado.monto_ganador != null ? " · " + esc(Q(x.resultado.monto_ganador)) : ""}</small>` : ""}</span>
        <span class="der"><span class="chip ${CHIP[x.estado]}">${esc(D.ESTADOS_LIC[x.estado])}</span>${x.monto_oferta != null || x.monto_base != null ? `<small class="nw">${esc(Q(x.monto_oferta != null ? x.monto_oferta : x.monto_base))}</small>` : ""}</span></a>`;
    };
    const docFila = z => { const e = D.estadoDoc(z); return `<div class="fila con-lapiz lic-doc"><span class="icono ${e.k === "vencido" ? "rojo" : e.k === "pronto" ? "ambar" : e.k === "ok" ? "verde" : "gris"}">${ico(e.k === "ok" ? "check" : e.k === "falta" ? "file" : "clock", 18)}</span>
      <span><b>${esc(z.nombre)}</b><small>${z.vence ? `${z.vence < hoyISO() ? "Venció" : "Vence"} el ${esc(fCorta(z.vence))}` : "Sin vencimiento"}${z.archivo_nombre ? " · " + esc(z.archivo_nombre) : ""}${z.en_lista ? "" : " · no se copia a las licitaciones"}</small></span>
      <span class="der"><span class="chip ${CHIP_DOC[e.k]}">${esc(e.n)}</span>${z.archivo ? `<button class="s-ib" type="button" aria-label="Ver el archivo de ${esc(z.nombre)}" data-doc-ver="${z.id}">${ico("eye", 16)}</button>` : ""}<button class="s-ib" type="button" aria-label="Cambiar ${esc(z.nombre)}" data-doc-ed="${z.id}">${ico("pen", 15)}</button></span></div>`; };
    let cuerpo = "";
    if (modo === "activas") cuerpo = act.length ? `<div class="lista">${act.map(fila).join("")}</div>` : `<div class="vacio chico"><p>No hay licitaciones en curso. Toque «Nueva licitación» cuando vea un concurso en Guatecompras.</p></div>`;
    else if (modo === "cerradas") { const ce = l.filter(x => !D.ACTIVAS_LIC.includes(x.estado)); cuerpo = ce.length ? `<div class="lista">${ce.map(fila).join("")}</div>` : `<div class="vacio chico"><p>Todavía no hay licitaciones cerradas.</p></div>`; }
    else if (modo === "papeles") cuerpo = `<div class="sub"><h2>Papeles de la empresa</h2><button class="s-btn suave-b chico" type="button" data-doc-nuevo>${ico("plus", 14)}Agregar papel</button></div><p class="suave lic-nota">Los que están en la lista se copian a cada licitación nueva. Hoy avisa 30 días antes de que venzan.</p><div class="lista">${docs.map(docFila).join("")}</div>`;
    else cuerpo = `<div class="vm-prev lic-res">${[["Presentadas", c.presentadas], ["Ganadas", c.ganadas], ["Tasa de ganadas", c.tasa != null ? c.tasa + " %" : "—"], ["Monto ganado", Q(c.ganadoMonto)]].map(([a, b]) => `<div><span>${a}</span><b>${esc(b)}</b></div>`).join("")}</div>
      <div class="sub"><h2>Quién nos ha ganado</h2></div>
      ${c.rivales.length ? `<div class="lista">${c.rivales.map(g => `<div class="fila" style="cursor:default"><span class="icono gris">${ico("users", 18)}</span><span><b>${esc(g.nombre)}</b><small>${g.veces} ${g.veces === 1 ? "vez" : "veces"}${g.difProm != null ? ` · nuestra oferta iba ${Math.abs(g.difProm)} % ${g.difProm >= 0 ? "más alta" : "más baja"} en promedio` : ""}</small></span><span></span></div>`).join("")}</div>
        <div class="sub"><h2>Concurso por concurso</h2></div><div class="lista">${c.filas.map(f => `<a class="fila" href="#/licitaciones/${f.x.id}"><span class="icono gris">${ico("file", 18)}</span><span><b>${esc(f.x.titulo)}</b><small>${esc(f.ganador)}: ${f.monto != null ? esc(Q(f.monto)) : "sin monto"} · nosotros: ${f.nuestro != null ? esc(Q(f.nuestro)) : "—"}</small></span><span class="der">${f.dif != null ? `<span class="chip ${f.dif > 0 ? "ambar" : "verde"} nw">${f.dif > 0 ? "+" : ""}${esc(f.dif)} %</span>` : ""}</span></a>`).join("")}</div>`
        : `<div class="vacio chico"><p>Cuando se pierda una licitación, anote quién ganó y por cuánto; aquí se juntan los precios de la competencia.</p></div>`}`;
    const pestG = v.querySelector(".pest-grupo");
    v.innerHTML = `<div class="cuerpo licv">
      <div class="cab-v"><div><h1 class="t">Licitaciones</h1><p class="desc">Los concursos de Guatecompras: fechas, papeles y resultado. Cada licitación entra al embudo como oportunidad.</p></div><button class="s-btn lleno" type="button" data-lic-nueva>${ico("plus", 16)}Nueva licitación</button></div>
      <div class="widgets">
        <div class="w"><span class="w-cab"><span class="icono laton">${ico("file", 18)}</span></span><span class="l">En curso</span><b>${act.length}</b><small>${act.filter(x => x.estado === "presentada").length} esperando resultado</small></div>
        <div class="w"><span class="w-cab"><span class="icono azul">${ico("clock", 18)}</span></span><span class="l">Próxima entrega</span><b>${prox ? esc(cuando(prox.ofertas)) : "—"}</b><small>${prox ? esc((prox.nog ? "NOG " + prox.nog + " · " : "") + prox.entidad) : "Nada por entregar"}</small></div>
        <a class="w" href="#/licitaciones/papeles" data-lic-modo="papeles"><span class="w-cab"><span class="icono ${malos.length ? "ambar" : "verde"}">${ico("shield", 18)}</span><span class="chev">${ico("chev", 16, 2.2)}</span></span><span class="l">Papeles de la empresa</span><b>${malos.length ? malos.length + " por renovar" : "Al día"}</b><small>${docs.filter(z => z.archivo).length} de ${docs.length} con archivo</small></a>
      </div>
      <div class="herr"><nav class="seg lic-modo" aria-label="Ver">${[["activas", "En curso"], ["cerradas", "Cerradas"], ["papeles", "Papeles"], ["competencia", "Competencia"]].map(([k, n]) => `<button type="button" data-lic-modo="${k}" aria-pressed="${modo === k}">${n}</button>`).join("")}</nav></div>
      ${cuerpo}
    </div>`;
    if (pestG) v.querySelector(".cuerpo").prepend(pestG);
    const recargar = () => A().quieto(() => vista(v, ""));
    v.onclick = async e => {
      const md = e.target.closest("[data-lic-modo]"); if (md) { e.preventDefault(); modo = md.dataset.licModo; if (location.hash !== "#/licitaciones") history.replaceState(null, "", "#/licitaciones"); await recargar(); return; }
      if (e.target.closest("[data-lic-nueva]")) { editar(null, async id => { location.hash = `#/licitaciones/${id}`; }); return; }
      if (e.target.closest("[data-doc-nuevo]")) { editarDoc(null, recargar); return; }
      const de = e.target.closest("[data-doc-ed]"); if (de) { editarDoc(docs.find(z => z.id === Number(de.dataset.docEd)), recargar); return; }
      const dv = e.target.closest("[data-doc-ver]"); if (dv) { const z = docs.find(k => k.id === Number(dv.dataset.docVer)); abrirArchivo(z.archivo); }
    };
  }

  async function abrirArchivo(ref) {
    const w = window.open("", "_blank");
    const u = await D.archivoLicitacion(ref);
    if (!u) { if (w) w.close(); A().aviso("No se encontró el archivo.", "mal"); return; }
    if (w) w.location = u; else location.href = u;
  }

  function editarDoc(z, recargar) {
    const { modal, esc, cerrarCapas, aviso } = A();
    let archivo = null;
    modal({
      titulo: z ? z.nombre : "Agregar papel", guardarTxt: "Guardar",
      quitar: z ? async () => { await D.quitarDocEmpresa(z.id); cerrarCapas(); aviso("Papel quitado."); await recargar(); } : null,
      cuerpo: `<label class="f-campo">Nombre<input name="nombre" value="${esc(z ? z.nombre : "")}" autocomplete="off" placeholder="Constancia de inscripción en el RGAE"></label>
        <label class="f-campo">Vence <small>opcional</small><input type="date" name="vence" value="${esc(z && z.vence || "")}"></label>
        <div class="f-campo"><span>Archivo</span>${z && z.archivo_nombre ? `<p class="suave" style="margin:0;font-size:13.5px">Ahora: ${esc(z.archivo_nombre)}</p>` : ""}<label class="s-btn suave-b chico vis-subir">${A().ico("plus", 14)}${z && z.archivo ? "Cambiar el archivo" : "Subir el archivo"}<input type="file" accept="application/pdf,image/*" data-doc-arch hidden></label><small data-doc-n></small></div>
        <label class="chk-f"><input type="checkbox" name="lista" ${!z || z.en_lista ? "checked" : ""}><span>Copiarlo a cada licitación nueva</span></label>
        <label class="f-campo">Notas <small>opcional</small><input name="notas" value="${esc(z && z.notas || "")}" autocomplete="off"></label>`,
      alAbrir: f => { f.querySelector("[data-doc-arch]").addEventListener("change", ev => { archivo = ev.target.files[0] || null; f.querySelector("[data-doc-n]").textContent = archivo ? archivo.name : ""; }); },
      alGuardar: async f => { await D.guardarDocEmpresa({ id: z ? z.id : null, nombre: f.nombre.value, vence: f.vence.value, en_lista: f.lista.checked, notas: f.notas.value }, archivo); cerrarCapas(); aviso("Papel guardado."); await recargar(); }
    });
  }

  async function editar(x0, despues) {
    const { modal, esc, cerrarCapas, aviso, campoMonto, formatoAlSalir, numero } = A();
    const p = A().sesion().perfil;
    const vend = await vendedores();
    const resp = x0 ? x0.responsable || "" : p.id;
    const fecha = (k, n, extra) => `<label class="f-campo">${n}${extra || ""}<input type="date" name="${k}" value="${esc(x0 && x0[k] || "")}"></label>`;
    modal({
      titulo: x0 ? "Cambiar la licitación" : "Nueva licitación", guardarTxt: "Guardar",
      quitar: x0 ? async () => { const mm = modal({ titulo: "¿Quitar la licitación?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita «${esc(x0.titulo)}» con sus archivos. La oportunidad y la cotización, si tiene, no se tocan.</p>`, alGuardar: async () => { await D.quitarLicitacion(x0); cerrarCapas(); aviso("Licitación quitada."); location.hash = "#/licitaciones"; } }); return mm; } : null,
      cuerpo: `<div class="f-fila"><label class="f-campo">NOG de Guatecompras<input name="nog" inputmode="numeric" value="${esc(x0 && x0.nog || "")}" autocomplete="off" placeholder="Por ejemplo 21045678"></label>
          <label class="f-campo">Modalidad<select name="modalidad">${Object.entries(D.MODALIDADES_LIC).map(([k, n]) => `<option value="${k}" ${(x0 ? x0.modalidad : "licitacion") === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label></div>
        <label class="f-campo">Entidad que compra<input name="entidad" value="${esc(x0 && x0.entidad || "")}" autocomplete="off" placeholder="Municipalidad de Villa Nueva"></label>
        <label class="f-campo">Qué se compra<input name="titulo" value="${esc(x0 && x0.titulo || "")}" autocomplete="off" placeholder="Mejoras eléctricas del mercado municipal"></label>
        <div class="f-fila">${campoMonto("base", "Monto base", x0 ? x0.monto_base : null, "Opcional.")}<label class="f-campo">Quién la lleva<select name="resp">${vend.map(u => `<option value="${esc(u.id)}" ${u.id === resp ? "selected" : ""}>${esc(u.nombre)}</option>`).join("")}<option value="" ${resp ? "" : "selected"}>Nadie todavía</option></select></label></div>
        <fieldset class="lic-fechas"><legend>Calendario del concurso</legend>
          <div class="f-fila">${fecha("publicacion", "Publicación")}${fecha("preguntas", "Último día de preguntas")}</div>
          <div class="f-fila">${fecha("ofertas", "Entrega de ofertas")}<label class="f-campo">Hora de entrega<input type="time" name="hora" value="${esc(x0 && x0.ofertas_hora || "")}"></label></div>
          <div class="f-fila">${fecha("apertura", "Apertura de plicas")}${fecha("adjudicacion", "Adjudicación", " <small>aproximada</small>")}</div></fieldset>
        <label class="f-campo">Notas <small>opcional</small><textarea name="notas" rows="2">${esc(x0 && x0.notas || "")}</textarea></label>`,
      alAbrir: (f, mm) => { mm.classList.add("modal-ancho"); formatoAlSalir(f); },
      alGuardar: async f => {
        const u = vend.find(z => z.id === f.resp.value);
        const id = await D.guardarLicitacion({ id: x0 ? x0.id : null, nog: f.nog.value, modalidad: f.modalidad.value, entidad: f.entidad.value, titulo: f.titulo.value, monto_base: f.base.value ? numero(f.base.value) : null, responsable: u ? u.id : null, responsable_nombre: u ? u.nombre : null, publicacion: f.publicacion.value, preguntas: f.preguntas.value, ofertas: f.ofertas.value, ofertas_hora: f.hora.value, apertura: f.apertura.value, adjudicacion: f.adjudicacion.value, notas: f.notas.value });
        cerrarCapas(); aviso(x0 ? "Licitación guardada." : "Licitación creada. También quedó en Oportunidades.");
        await despues(id);
      }
    });
  }

  async function ficha(v, id) {
    const { esc, ico, Q, aviso, modal, cerrarCapas } = A();
    const x = await D.licitacion(id);
    if (!x) { v.innerHTML = `<div class="cuerpo"><a class="volver" href="#/licitaciones">${ico("chev", 14, 2.2)}Licitaciones</a><div class="vacio"><p>Esa licitación ya no existe.</p></div></div>`; return; }
    const [docs, ops] = await Promise.all([D.documentosEmpresa(), D.oportunidades ? D.oportunidades().catch(() => []) : []]);
    const op = x.oportunidad_id ? ops.find(z => z.id === x.oportunidad_id) : null;
    const cotId = op && op.cotizacion_id;
    const cot = cotId && D.cotizacion ? await D.cotizacion(cotId).catch(() => null) : null;
    const activa = D.ACTIVAS_LIC.includes(x.estado);
    const tot = (x.papeles || []).length, ls = listos(x);
    const docDe = z => z.doc_id ? docs.find(k => k.id === z.doc_id) : null;
    const principal = x.estado === "preparando" ? ["presentar", "Presentar la oferta", "send"] : x.estado === "presentada" ? ["resultado", "Anotar el resultado", "check"] : x.estado === "ganada" && cotId ? ["obra", "Crear la obra", "hammer"] : null;
    const fechas = Object.entries(D.FECHAS_LIC).filter(([k]) => x[k]).map(([k, n]) => ({ k, n, f: x[k] })).sort((a, b) => a.f.localeCompare(b.f));
    const pend = (x.papeles || []).filter(z => !z.listo).length;
    const pestG = v.querySelector(".pest-grupo");
    v.innerHTML = `<div class="cuerpo licv lic-ficha">
      <a class="volver" href="#/licitaciones">${ico("chev", 14, 2.2)}Licitaciones</a>
      <div class="cab-v"><div><h1 class="t">${esc(x.titulo)}</h1><p class="desc">${esc(x.entidad)}${x.nog ? ` · NOG ${esc(x.nog)}` : ""} · ${esc(D.MODALIDADES_LIC[x.modalidad])}</p></div>
        <div class="fila-b">${principal ? `<button class="s-btn lleno" type="button" data-lf="${principal[0]}">${ico(principal[2], 16)}${principal[1]}</button>` : ""}<button class="s-ib" type="button" aria-label="Cambiar la licitación" data-lf="editar">${ico("pen", 16)}</button></div></div>
      <p class="est-estado"><span class="chip ${CHIP[x.estado]}">${esc(D.ESTADOS_LIC[x.estado])}</span><span class="suave">${esc(x.responsable_nombre || "Nadie la lleva todavía")}</span></p>
      <div class="fila-b lic-acc">${x.nog ? `<a class="s-btn suave-b chico" href="${esc(guate(x.nog))}" target="_blank" rel="noopener">${ico("link", 14)}Ver en Guatecompras</a>` : ""}
        ${cotId ? `<a class="s-btn suave-b chico" href="#/cotizaciones/${cotId}">${ico("file", 14)}Abrir la oferta económica</a>` : activa && op ? `<button class="s-btn suave-b chico" type="button" data-lf="cotizar">${ico("file", 14)}Armar la oferta económica</button>` : ""}
        ${op ? `<a class="s-btn suave-b chico" href="#/oportunidades" data-lf-op>${ico("chart", 14)}Oportunidad: ${esc(D.ETAPAS_OP[op.etapa].n)}</a>` : ""}
        ${!activa ? `<button class="s-btn suave-b chico" type="button" data-lf="reabrir">${ico("clock", 14)}Volver a abrir</button>` : ""}</div>
      <div class="lic-grid">
        <section class="caja"><div class="caja-cab"><h2>Montos</h2></div><div class="vm-prev">
          <div><span>Monto base</span><b class="nw">${x.monto_base != null ? esc(Q(x.monto_base)) : "—"}</b></div>
          <div><span>Nuestra oferta</span><b class="nw">${x.monto_oferta != null ? esc(Q(x.monto_oferta)) : cot && cot.total ? `${esc(Q(cot.total))} <small class="suave">(cotización)</small>` : "—"}</b></div>
          ${x.monto_base && x.monto_oferta != null ? `<div><span>Contra la base</span><b class="nw">${esc(((x.monto_oferta - x.monto_base) / x.monto_base * 100).toFixed(1))} %</b></div>` : ""}
          ${x.resultado && x.resultado.ganador ? `<div><span>Ganó ${esc(x.resultado.ganador)}</span><b class="nw">${x.resultado.monto_ganador != null ? esc(Q(x.resultado.monto_ganador)) : "—"}</b></div>` : ""}
          ${x.resultado && x.resultado.notas ? `<div><span>Notas</span><b>${esc(x.resultado.notas)}</b></div>` : ""}</div></section>
        <section class="caja"><div class="caja-cab"><h2>Calendario</h2></div>${fechas.length ? `<ol class="lic-cal">${fechas.map(z => { const d = dias(z.f); return `<li class="${d < 0 ? "paso" : d <= 3 && activa ? "pronto" : ""}"><span class="lic-punto"></span><span><b>${esc(z.n)}</b><small>${esc(fLarga(z.f).replace(/^./, c => c.toUpperCase()))}${z.k === "ofertas" && x.ofertas_hora ? " · " + esc(x.ofertas_hora) : ""}</small></span><span class="suave nw">${esc(cuando(z.f))}</span></li>`; }).join("")}</ol>` : `<p class="suave" style="margin:0">Sin fechas. Tóquelas con el lápiz.</p>`}</section>
      </div>
      <section class="caja"><div class="caja-cab"><h2>Papeles</h2><span class="suave">${ls} de ${tot} listos</span></div>
        <div class="lic-barra" role="img" aria-label="${ls} de ${tot} papeles listos"><i style="transform:scaleX(${tot ? ls / tot : 0})"></i></div>
        ${tot ? `<div class="lic-pap-acc"><button class="s-btn suave-b chico" type="button" data-lf="todos">${pend ? "Marcar todos listos" : "Desmarcar todos"}</button></div>` : ""}
        <div class="lista lic-pap">${(x.papeles || []).map((z, i) => { const d = docDe(z); const e = d ? D.estadoDoc(d, x.estado === "preparando" ? x.ofertas : null) : null; return `<div class="fila lic-p">
          <label class="lic-chk"><input type="checkbox" data-pap="${i}" ${z.listo ? "checked" : ""}><span><b>${esc(z.nombre)}</b>${e && (e.k === "vencido" || e.k === "falta") ? `<small class="${e.k === "vencido" ? "falta" : ""}">${esc(e.k === "falta" ? "Sin archivo guardado" : e.n)}${d.vence ? " (" + esc(fCorta(d.vence)) + ")" : ""}</small>` : d ? `<small>De los papeles de la empresa</small>` : ""}</span></label>
          <span class="der">${d && d.archivo ? `<button class="s-ib" type="button" aria-label="Ver ${esc(z.nombre)}" data-pap-ver="${d.id}">${ico("eye", 15)}</button>` : ""}<button class="s-ib" type="button" aria-label="Quitar ${esc(z.nombre)} de esta licitación" data-pap-q="${i}">${ico("pen", 15)}</button></span></div>`; }).join("")}</div>
        <form class="lic-add" data-pap-add><label class="f-campo"><span class="sr">Otro papel que piden</span><input name="nuevo" autocomplete="off" placeholder="Otro papel que piden las bases"></label><button class="s-btn suave-b" type="submit">${ico("plus", 15)}Agregar</button></form></section>
      <section class="caja"><div class="caja-cab"><h2>Archivos</h2><label class="s-btn suave-b chico vis-subir">${ico("plus", 14)}Subir archivo<input type="file" data-arch-in hidden></label></div>
        ${(x.archivos || []).length ? `<div class="lista">${x.archivos.map(a => `<div class="fila lic-doc"><span class="icono gris">${ico("file", 18)}</span><span><b>${esc(a.nombre)}</b><small>${esc(a.tipo)} · ${esc(fCorta(a.fecha))}</small></span><span class="der"><button class="s-ib" type="button" aria-label="Ver ${esc(a.nombre)}" data-arch-ver="${esc(a.ref)}">${ico("eye", 15)}</button><button class="s-ib" type="button" aria-label="Opciones de ${esc(a.nombre)}" data-arch-q="${esc(a.ref)}">${ico("pen", 15)}</button></span></div>`).join("")}</div>` : `<p class="suave" style="margin:0;font-size:14px">Suba las bases, las aclaraciones y la oferta que se entregó.</p>`}</section>
      ${x.notas ? `<p class="suave" style="font-size:14px">${esc(x.notas)}</p>` : ""}
    </div>`;
    if (pestG) v.querySelector(".cuerpo").prepend(pestG);
    const recargar = () => A().quieto(() => ficha(v, id));
    v.onchange = async e => {
      const c = e.target.closest("[data-pap]"); if (c) { try { await D.marcarPapel(x, Number(c.dataset.pap), c.checked); await recargar(); } catch (er) { aviso(er.message, "mal"); } return; }
      if (e.target.matches("[data-arch-in]")) {
        const file = e.target.files[0]; if (!file) return;
        modal({ titulo: "¿Qué archivo es?", guardarTxt: "Subir", cuerpo: `<p class="suave" style="margin:0;font-size:14px">${esc(file.name)}</p><label class="f-campo">Tipo<select name="tipo">${["Bases", "Aclaraciones", "Oferta técnica", "Oferta económica", "Fianza", "Acta de adjudicación", "Otro"].map(n => `<option>${n}</option>`).join("")}</select></label>`,
          alGuardar: async f => { aviso("Subiendo…"); await D.agregarArchivo(x, file, f.tipo.value); cerrarCapas(); aviso("Archivo subido."); await recargar(); } });
      }
    };
    v.onsubmit = async e => { if (!e.target.matches("[data-pap-add]")) return; e.preventDefault(); try { await D.agregarPapel(x, e.target.nuevo.value); await recargar(); const i = v.querySelector("[data-pap-add] input"); if (i) i.focus(); } catch (er) { aviso(er.message, "mal"); } };
    v.onclick = async e => {
      const pv = e.target.closest("[data-pap-ver]"); if (pv) { abrirArchivo(docs.find(z => z.id === Number(pv.dataset.papVer)).archivo); return; }
      const av = e.target.closest("[data-arch-ver]"); if (av) { abrirArchivo(av.dataset.archVer); return; }
      const pq = e.target.closest("[data-pap-q]"); if (pq) { const i = Number(pq.dataset.papQ); modal({ titulo: x.papeles[i].nombre, guardarTxt: "Listo", quitar: async () => { await D.quitarPapel(x, i); cerrarCapas(); aviso("Papel quitado de esta licitación."); await recargar(); }, quitarTxt: "Quitar de esta licitación", cuerpo: `<p class="suave" style="font-size:14.5px;margin:0">Si las bases no lo piden, se puede quitar de esta licitación. Los papeles de la empresa no se tocan.</p>`, alGuardar: async () => cerrarCapas() }); return; }
      const aq = e.target.closest("[data-arch-q]"); if (aq) { const a = x.archivos.find(z => z.ref === aq.dataset.archQ); modal({ titulo: a.nombre, guardarTxt: "Listo", quitar: async () => { await D.quitarArchivo(x, a.ref); cerrarCapas(); aviso("Archivo quitado."); await recargar(); }, quitarTxt: "Quitar el archivo", cuerpo: `<p class="suave" style="font-size:14.5px;margin:0">${esc(a.tipo)} · subido el ${esc(fCorta(a.fecha))}.</p>`, alGuardar: async () => cerrarCapas() }); return; }
      const b = e.target.closest("[data-lf]"); if (!b) return;
      const k = b.dataset.lf;
      if (k === "editar") editar(x, async () => recargar());
      if (k === "todos") { const p = (x.papeles || []).map(z => ({ ...z, listo: pend > 0 })); for (let i = 0; i < p.length; i++) if (!!x.papeles[i].listo !== p[i].listo) x.papeles = await D.marcarPapel(x, i, p[i].listo); await recargar(); }
      if (k === "cotizar") { if (!op) return; const cid = await D.cotizarOportunidad(op, { nombre: x.entidad }); aviso("Cotización creada. La entidad quedó como cliente."); location.hash = `#/cotizaciones/${cid}`; }
      if (k === "reabrir") { await D.reabrirLicitacion(x); aviso("Volvió a estar en curso."); await recargar(); }
      if (k === "presentar") presentar(x, cot, pend, recargar);
      if (k === "resultado") resultado(x, recargar);
      if (k === "obra") { const [c2, cat] = await Promise.all([D.cotizacion(cotId), D.catalogo()]); const cli = await D.cliente(c2.cliente_id); window.EMT_OBRAS.desdeCotizacion(c2, D.calcularCotizacion(c2, cat), cli); }
    };
  }

  function presentar(x, cot, pend, recargar) {
    const { modal, esc, cerrarCapas, aviso, campoMonto, formatoAlSalir, numero, Q } = A();
    modal({
      titulo: "Presentar la oferta", guardarTxt: "Ya se presentó",
      cuerpo: `${pend ? `<p class="aviso-caja ambar" style="margin:0">Faltan ${pend} ${pend === 1 ? "papel" : "papeles"} por marcar. Revíselos antes de entregar.</p>` : ""}
        ${campoMonto("monto", "Monto de la oferta", x.monto_oferta != null ? x.monto_oferta : cot && cot.total ? cot.total : null, cot && cot.total ? `La cotización suma ${Q(cot.total)}.` : "Con IVA, como va en la oferta.")}
        <p class="suave" style="margin:0;font-size:13.5px">La oportunidad pasa a negociación con este monto. Al salir el resultado, toque «Anotar el resultado».</p>`,
      alAbrir: f => formatoAlSalir(f),
      alGuardar: async f => { await D.presentar(x, f.monto.value ? numero(f.monto.value) : null); cerrarCapas(); aviso("Oferta presentada."); await recargar(); }
    });
  }

  function resultado(x, recargar) {
    const { modal, esc, cerrarCapas, aviso, campoMonto, formatoAlSalir, numero } = A();
    modal({
      titulo: "Resultado de la licitación", guardarTxt: "Guardar",
      cuerpo: `<div class="seg lic-res-seg" role="group" aria-label="Cómo terminó">${[["ganada", "La ganamos"], ["perdida", "Ganó otro"], ["desierta", "Desierta"], ["no_participa", "No participamos"]].map(([k, n], i) => `<button type="button" data-r="${k}" aria-pressed="${i === 0}">${n}</button>`).join("")}</div>
        <div data-r-otro hidden><div class="f-fila"><label class="f-campo">Quién ganó<input name="ganador" autocomplete="off" placeholder="Nombre de la empresa"></label>${campoMonto("mg", "Por cuánto", null, "Lo que dice el acta.")}</div></div>
        <label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(x.adjudicacion && x.adjudicacion <= hoyISO() ? x.adjudicacion : hoyISO())}"></label>
        <label class="f-campo">Notas <small>opcional</small><input name="notas" autocomplete="off" placeholder="Por qué se ganó o se perdió"></label>`,
      alAbrir: (f, mm) => { formatoAlSalir(f); f.dataset.r = "ganada"; mm.addEventListener("click", ev => { const b = ev.target.closest("[data-r]"); if (!b) return; f.dataset.r = b.dataset.r; mm.querySelectorAll("[data-r]").forEach(z => z.setAttribute("aria-pressed", String(z === b))); f.querySelector("[data-r-otro]").hidden = b.dataset.r !== "perdida"; }); },
      alGuardar: async f => {
        await D.guardarResultadoLicitacion(x, { estado: f.dataset.r, ganador: f.ganador.value, monto_ganador: f.mg.value ? numero(f.mg.value) : null, fecha: f.fecha.value, notas: f.notas.value });
        cerrarCapas(); aviso(f.dataset.r === "ganada" ? "¡Ganada! La oportunidad pasó a ganada." : "Resultado guardado."); await recargar();
      }
    });
  }

  async function avisosHoy(p) {
    if (!D.puede(p, "editarCotizacion")) return [];
    const [l, docs] = await Promise.all([D.licitaciones().catch(() => []), D.documentosEmpresa().catch(() => [])]);
    const mio = x => !x.responsable || x.responsable === p.id || p.rol === "gerencia";
    const out = [];
    l.filter(x => D.ACTIVAS_LIC.includes(x.estado) && mio(x)).forEach(x => {
      ["preguntas", "ofertas", "apertura", "adjudicacion"].forEach(k => {
        if (!x[k]) return; const d = dias(x[k]); if (d < 0 || d > 3) return;
        if (k === "ofertas" && x.estado === "presentada") return;
        const falta = (x.papeles || []).filter(z => !z.listo).length;
        out.push({ c: d === 0 ? "ambar" : "laton", i: "file", t: `${D.FECHAS_LIC[k]}${d === 0 ? " hoy" : d === 1 ? " mañana" : ` en ${d} días`}: ${x.entidad}`, d: `${x.nog ? "NOG " + x.nog + " · " : ""}${x.titulo}${k === "ofertas" && x.ofertas_hora ? " · " + x.ofertas_hora : ""}${k === "ofertas" && falta ? ` · faltan ${falta} papeles` : ""}`, chip: "Licitación", accion: "Ver", h: `#/licitaciones/${x.id}` });
      });
    });
    docs.filter(z => z.en_lista).forEach(z => { const e = D.estadoDoc(z); if (e.k === "vencido" || e.k === "pronto") out.push({ c: e.k === "vencido" ? "ambar" : "laton", i: "shield", t: `${e.k === "vencido" ? "Papel vencido" : "Renovar pronto"}: ${z.nombre}`, d: e.k === "vencido" ? `Venció el ${fCorta(z.vence)} · lo piden en las licitaciones` : `${e.n}, el ${fCorta(z.vence)} · lo piden en las licitaciones`, chip: e.k === "vencido" ? "Vencido" : "Pronto", accion: "Renovar", h: "#/licitaciones/papeles" }); });
    return out;
  }

  return { vista, avisosHoy };
})();
