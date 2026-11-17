"use strict";
window.EMT_COSTOS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  let buscaM = "", soloPasado = false;
  const hoyISO = () => new Date().toLocaleDateString("en-CA");
  const fCorta = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };
  const signo = (Q, n) => n > 0 ? "+ " + Q(n) : n < 0 ? "− " + Q(-n) : Q(0);

  function editarJornada(obraId, j, emp, verCosto, alGuardar, nombres) {
    const { esc, modal, cerrarCapas, aviso } = A();
    modal({
      titulo: j ? "Días de trabajo" : "Anotar días de trabajo", guardarTxt: "Guardar",
      quitar: j ? async () => { await D.quitarJornada(j.id); cerrarCapas(); aviso("Quitado."); await alGuardar(); } : null,
      cuerpo: `<div class="f-fila"><label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(j ? j.fecha : hoyISO())}"></label>
        <label class="f-campo">Quién trabajó<input name="cuadrilla" list="cuadrillas" value="${esc(j ? j.cuadrilla : "")}" placeholder="Cuadrilla de Luis" autocomplete="off"><datalist id="cuadrillas">${nombres.map(n => `<option value="${esc(n)}">`).join("")}</datalist></label></div>
        <div class="f-fila"><label class="f-campo">Personas<input name="personas" inputmode="numeric" value="${esc(j ? j.personas : 3)}" autocomplete="off"></label>
        <label class="f-campo">Días<input name="dias" inputmode="decimal" value="${esc(j ? j.dias : 1)}" autocomplete="off"><small>Medio día: 0.5</small></label></div>
        ${verCosto ? A().campoMonto("costo", "Costo del día por persona", j && j.costo_dia != null ? j.costo_dia : null, emp.costo_dia_persona ? `Vacío = el de Empresa (Q ${esc(emp.costo_dia_persona)})` : "Póngalo aquí o en Empresa › Costos de obra") : ""}
        <label class="f-campo">Nota<input name="nota" value="${esc(j && j.nota || "")}" placeholder="Hincado de postes, tendido…" autocomplete="off"></label>`,
      alAbrir: f => A().formatoAlSalir(f),
      alGuardar: async f => {
        await D.guardarJornada({ id: j ? j.id : null, obra_id: obraId, fecha: f.fecha.value, cuadrilla: f.cuadrilla.value, personas: f.personas.value, dias: String(f.dias.value).replace(",", "."), costo_dia: verCosto ? A().numero(f.costo.value) : (j ? j.costo_dia : null), nota: f.nota.value });
        cerrarCapas(); aviso("Días guardados."); await alGuardar();
      }
    });
  }

  async function tabObra(box, o, recargar) {
    const { esc, ico, Q, cant } = A();
    const p = A().sesion().perfil;
    const verCosto = D.puede(p, "verCosto"), anota = verCosto || D.puede(p, "verGastos");
    const [c, emp, todas] = await Promise.all([D.costosObra(o.id), D.empresa(), D.jornadas(null)]);
    const nombres = [...new Set(todas.map(j => j.cuadrilla))].sort((a, b) => a.localeCompare(b, "es"));
    const jorHTML = `<div class="sub"><h2>Mano de obra</h2>${anota ? `<button class="s-btn suave-b" type="button" data-jor-nueva>${ico("plus", 15)}Anotar días</button>` : ""}</div>
      ${c.jornadas.length ? `<div class="lista">${c.jornadas.map(j => `<div class="fila con-lapiz" style="cursor:default"><span class="icono azul">${ico("users", 18)}</span><span><b>${esc(j.cuadrilla)}</b><small>${esc(fCorta(j.fecha))} · ${esc(cant(j.personas))} ${j.personas === 1 ? "persona" : "personas"} × ${esc(cant(j.dias))} ${j.dias === 1 ? "día" : "días"}${verCosto ? ` × ${esc(Q(j.costoUsado))}` : ""}${j.nota ? " · " + esc(j.nota) : ""}</small></span>${verCosto ? `<span class="der"><span class="e-cifra">${esc(Q(j.total))}</span></span>` : "<span></span>"}${anota ? `<button class="s-ib" type="button" aria-label="Editar los días de ${esc(j.cuadrilla)}" data-jor-ed="${j.id}">${ico("pen", 15)}</button>` : ""}</div>`).join("")}</div>` : `<div class="vacio chico"><p>Todavía no se anotan días de trabajo.</p></div>`}`;
    if (!verCosto) { box.innerHTML = jorHTML; enlazar(); return; }
    const t = c.cotizado, r = c.real;
    const pct = c.avance == null ? null : Math.round(c.avance);
    const estado = c.pasada ? ["ambar", "Se pasó"] : pct != null && pct > 100 ? ["laton", "Arriba de lo presupuestado"] : ["verde", "Dentro de lo presupuestado"];
    const filaT = (n, a, b) => `<div class="cr-f"><span>${n}</span><span data-l="Presupuesto">${esc(Q(a))}</span><span data-l="Real">${esc(Q(b))}</span><b data-l="Diferencia" class="${b - a > 0.004 ? "falta" : b - a < -0.004 ? "sobra" : ""}">${esc(signo(Q, Math.round((b - a) * 100) / 100))}</b></div>`;
    const mats = c.materiales.filter(m => m.usado || m.cotCant);
    const cerrada = o.estado === "terminada" || o.estado === "cancelada";
    const porUsar = m => !cerrada && !m.usado && m.cotCant > 0;
    box.innerHTML = `
      <section class="caja cr-hero ${c.pasada ? "pasada" : ""}">
        <div class="cr-g"><span><small>Ganancia real</small><b class="e-cifra ${c.ganancia.real < 0 ? "falta" : ""}">${esc(Q(c.ganancia.real))}</b><small>Cotizada: ${esc(Q(c.ganancia.cotizada))} · venta sin IVA ${esc(Q(c.venta))}</small></span><span class="chip ${estado[0]}">${esc(estado[1])}</span></div>
        ${pct != null ? `<div class="cr-barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="transform:scaleX(${Math.min(1, pct / 100)})" class="${pct > 100 ? "mas" : ""}"></i></div><p class="cr-nota">Lleva gastado <b>${pct} %</b> de lo presupuestado (${esc(Q(r.total))} de ${esc(Q(t.total))}). Avisa al pasar el ${esc(c.umbral)} %.</p>` : `<p class="cr-nota">${c.cot ? `${ico("alerta", 14)} La cotización ${esc(c.cot.numero)} no tiene costos: ponga el costo a los materiales en <a href="#/catalogo/precios">Catálogo</a> para comparar.` : "Esta obra no viene de una cotización: no hay presupuesto para comparar."}</p>`}
        ${!c.hayMov ? `<p class="cr-nota">${ico("alerta", 14)} Todavía no sale material de bodega; el material cuenta cuando sale a la obra.</p>` : ""}
        ${c.sinCostos && pct != null ? `<p class="cr-nota">${ico("alerta", 14)} Algunos materiales no tenían costo al cotizar: su presupuesto sale en cero.</p>` : ""}
      </section>
      <div class="sub"><h2>Presupuesto contra real</h2></div>
      <div class="caja cr-tabla"><div class="cr-f cr-cab"><span></span><span>Presupuesto</span><span>Real</span><span>Diferencia</span></div>
        ${filaT("Materiales", t.materiales, r.materiales)}${filaT("Transporte, equipo y gastos", t.gastos, r.gastos)}${filaT("Mano de obra", t.mano, r.mano)}
        <div class="cr-f cr-tot"><span>Total de costos</span><span data-l="Presupuesto">${esc(Q(t.total))}</span><span data-l="Real">${esc(Q(r.total))}</span><b data-l="Diferencia" class="${r.total - t.total > 0 ? "falta" : "sobra"}">${esc(signo(Q, Math.round((r.total - t.total) * 100) / 100))}</b></div>
        <p class="cr-ayuda">Mano de obra presupuestada es la que se cobró al cliente; los gastos se anotan en la pestaña ${D.puede(p, "verCobros") ? "Cobros" : "Gastos"} (${c.gastos.length} ${c.gastos.length === 1 ? "gasto" : "gastos"}).</p></div>
      ${jorHTML}
      <details class="caja plegable cr-mats" ${mats.some(m => (m.dif || 0) > 0) ? "open" : ""}><summary><span class="pl-t"><h2>Materiales</h2><span class="suave">${mats.filter(m => (m.dif || 0) > 0.004).length} se pasaron · ${mats.filter(m => (m.dif || 0) < -0.004 && !porUsar(m)).length} sobraron${cerrada ? "" : ` · ${mats.filter(porUsar).length} por usar`}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
        <div class="herr"><label class="busca-v"><span class="sr">Buscar material</span>${ico("search", 16)}<input type="search" data-cr-busca value="${esc(buscaM)}" placeholder="Buscar material o código" autocomplete="off"></label><label class="f-check"><input type="checkbox" data-cr-solo ${soloPasado ? "checked" : ""}><span>Solo lo que se pasó</span></label></div>
        <div class="lista" data-cr-l>${mats.map(m => `<div class="fila cr-m ${(m.dif || 0) > 0.004 ? "mas" : ""}" style="cursor:default" data-dif="${m.dif || 0}"><span><b>${esc(m.material.descripcion)}</b><small>Cotizado ${esc(cant(m.cotCant))} × ${m.cotCostoU == null ? "sin costo" : esc(Q(m.cotCostoU))} · usado ${esc(cant(m.usado))} × ${m.precioU == null ? "—" : esc(Q(m.precioU))}${m.pagado ? " (pagado)" : ""}</small></span><span class="der">${porUsar(m) ? `<span class="chip gris">Por usar</span>` : `<b class="e-cifra ${(m.dif || 0) > 0.004 ? "falta" : (m.dif || 0) < -0.004 ? "sobra" : ""}">${m.dif == null ? "—" : esc(signo(Q, m.dif))}</b>`}</span></div>`).join("") || `<p class="suave" style="padding:12px 16px;margin:0">Sin materiales.</p>`}</div>
      </div></details>`;
    const filtrar = () => { const l = box.querySelector("[data-cr-l]"); if (!l) return; A().filtrar(l, ".fila", buscaM); if (soloPasado) l.querySelectorAll(".fila").forEach(f => { if (!(Number(f.dataset.dif) > 0.004)) f.hidden = true; }); };
    filtrar();
    box.oninput = e => { if (e.target.matches("[data-cr-busca]")) { buscaM = e.target.value; filtrar(); } };
    box.onchange = e => { if (e.target.matches("[data-cr-solo]")) { soloPasado = e.target.checked; filtrar(); } };
    enlazar();
    function enlazar() {
      box.onclick = e => {
        if (e.target.closest("[data-jor-nueva]")) { editarJornada(o.id, null, emp, verCosto, recargar, nombres); return; }
        const b = e.target.closest("[data-jor-ed]"); if (b) editarJornada(o.id, c.jornadas.find(j => j.id === Number(b.dataset.jorEd)), emp, verCosto, recargar, nombres);
      };
    }
  }

  async function resumen(box) {
    const { esc, ico, Q } = A();
    box.innerHTML = `<p class="suave" style="font-size:13.5px">Calculando…</p>`;
    const [l0, cls] = await Promise.all([D.resumenCostos(), D.clientes().catch(() => [])]);
    const l = l0.filter(c => c.cot), nomCli = Object.fromEntries(cls.map(x => [x.id, x.nombre]));
    const venta = l.reduce((a, c) => a + c.venta, 0), real = l.reduce((a, c) => a + c.real.total, 0), gan = l.reduce((a, c) => a + c.ganancia.real, 0), ganC = l.reduce((a, c) => a + c.ganancia.cotizada, 0);
    l.sort((a, b) => Number(b.pasada) - Number(a.pasada) || (b.avance || 0) - (a.avance || 0));
    box.innerHTML = `<div class="widgets">
        <div class="w"><span class="l">Ganancia real</span><b class="${gan < 0 ? "falta" : ""}">${esc(Q(gan))}</b><small>Cotizada ${esc(Q(ganC))}</small></div>
        <div class="w"><span class="l">Costo real</span><b>${esc(Q(real))}</b><small>De ${esc(Q(venta))} vendidos sin IVA</small></div>
        <div class="w"><span class="l">Se pasaron</span><b>${l.filter(c => c.pasada).length}</b><small>de ${l.length} ${l.length === 1 ? "obra" : "obras"}</small></div>
      </div>
      <div class="lista">${l.map(c => `<a class="fila" href="#/obras/${c.o.id}/costos"><span class="icono ${c.pasada ? "ambar" : "verde"}">${ico(c.pasada ? "alerta" : "check", 18)}</span><span><b>${esc(c.o.numero)} · ${esc(c.o.titulo)}</b><small>${esc(nomCli[c.o.cliente_id] || "")} · ${c.avance == null ? "sin costos para comparar" : `lleva ${Math.round(c.avance)} % de lo presupuestado`}</small></span><span class="der"><span class="e-cifra ${c.ganancia.real < 0 ? "falta" : ""}">${esc(Q(c.ganancia.real))}</span><small>${c.pasada ? `<span class="chip ambar">Se pasó</span>` : `cotizada ${esc(Q(c.ganancia.cotizada))}`}</small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`).join("") || `<div class="vacio"><h2>Todavía no hay obras de una cotización</h2></div>`}</div>`;
  }

  async function avisos() {
    const p = A().sesion().perfil;
    if (!D.puede(p, "verCosto")) return [];
    try { return (await D.resumenCostos()).filter(c => c.pasada).map(c => ({ c: "ambar", i: "alerta", t: `${c.o.numero} se pasó ${Math.round(c.avance - 100)} % de lo presupuestado`, d: `${c.o.titulo} · ganancia real ${A().Q(c.ganancia.real)}`, chip: "Revisar", h: `#/obras/${c.o.id}/costos` })); } catch (e) { return []; }
  }

  return { tabObra, resumen, avisos };
})();
