"use strict";
window.EMT_FINANZAS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const ICONO_C = { banco: "building", caja: "wallet", efectivo: "wallet", tarjeta: "sheet" };
  const TIPOS_M = [["gasto", "Gasto"], ["ingreso", "Ingreso"], ["transferencia", "Pasar entre cuentas"]];
  const FILTROS = [["", "Todo"], ["gasto", "Gastos"], ["ingreso", "Ingresos"], ["transferencia", "Entre cuentas"]];
  const est = { empresa: { filtro: "", cuenta: "", mes: "", busca: "" }, personal: { filtro: "", cuenta: "", mes: "", busca: "" } };
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const fLarga = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" }); };
  const mesTxt = m => { const [y, n] = m.split("-").map(Number); return new Date(y, n - 1, 1).toLocaleDateString("es-GT", { month: "long", year: "numeric" }); };
  const ORIGEN = { pago: "viene de Cobros", gasto_obra: "gasto de obra", retiro: "sacado de la empresa" };
  const fCorta = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };
  const diasA = f => Math.round((Date.UTC(...String(f).split("-").map((n, i) => i === 1 ? n - 1 : Number(n))) - Date.UTC(...hoy().split("-").map((n, i) => i === 1 ? n - 1 : Number(n)))) / 864e5);
  const venceTxt = f => { const n = diasA(f); return n < 0 ? (n === -1 ? "Venció ayer" : `Venció hace ${-n} días`) : n === 0 ? "Vence hoy" : n === 1 ? "Vence mañana" : `En ${n} días`; };
  const dinero = (n, moneda) => moneda === "USD" ? "US$ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : A().Q(n);

  async function vista(v, ambito) {
    const { esc, ico, Q } = A();
    const p = A().sesion().perfil;
    if (ambito === "personal" ? !D.puede(p, "finanzasPersonales") : !D.puede(p, "verFinanzas")) { v.innerHTML = `<div class="vacio"><h2>Sin acceso</h2><p>${ambito === "personal" ? "Las finanzas personales son solo de gerencia." : "Las finanzas de la empresa las ven gerencia y administración."}</p><a class="s-btn suave-b" href="#/hoy">Regresar a Hoy</a></div>`; return; }
    const pg = v.querySelector(".pest-grupo");
    const f = await D.finanzas(ambito);
    const e = est[ambito];
    if (!e.mes) e.mes = hoy().slice(0, 7);
    const activas = f.cuentas.filter(c => c.activo !== false), archivadas = f.cuentas.filter(c => c.activo === false);
    const porId = Object.fromEntries(f.cuentas.map(c => [c.id, c])), catId = Object.fromEntries(f.categorias.map(c => [c.id, c]));
    const conUSD = f.cuentas.some(c => c.moneda === "USD");
    const enQ = c => D.enQ(c.saldo, c.moneda, f.cambio);
    const disponible = activas.filter(c => c.tipo !== "tarjeta").reduce((a, c) => a + enQ(c), 0);
    const deuda = activas.filter(c => c.tipo === "tarjeta").reduce((a, c) => a + Math.min(0, enQ(c)), 0);
    const delMes = f.movimientos.filter(m => !m.anulado && String(m.fecha).slice(0, 7) === e.mes);
    const qMov = m => D.enQ(m.monto, (porId[m.cuenta_id] || {}).moneda, f.cambio);
    const entro = delMes.filter(m => m.tipo === "ingreso").reduce((a, m) => a + qMov(m), 0), salio = delMes.filter(m => m.tipo === "gasto").reduce((a, m) => a + qMov(m), 0);
    const titulo = ambito === "personal" ? "Finanzas personales" : "Finanzas de la empresa";
    const filaCuenta = c => `<div class="fila con-lapiz" style="cursor:default"><span class="icono ${c.tipo === "tarjeta" ? "ambar" : ambito === "personal" ? "mezcla" : "azul"}">${ico(ICONO_C[c.tipo] || "wallet", 18)}</span><span><b>${esc(c.nombre)}</b><small>${esc([D.FIN_TIPOS_CUENTA[c.tipo], c.banco, c.numero ? "··" + String(c.numero).slice(-4) : ""].filter(Boolean).join(" · "))}</small></span><span class="der"><b class="e-cifra ${c.saldo < 0 ? "falta" : ""}">${c.tipo === "tarjeta" && c.saldo < 0 ? "Debe " + esc(dinero(-c.saldo, c.moneda)) : esc(dinero(c.saldo, c.moneda))}</b>${c.moneda === "USD" ? `<small>≈ ${esc(Q(enQ(c)))}</small>` : ""}${c.tipo === "tarjeta" && c.saldo < 0 && c.activo !== false ? `<small><button class="chip-b est azul" type="button" data-pagar-tarjeta="${c.id}">Pagar tarjeta</button></small>` : ""}</span><button class="s-ib" type="button" aria-label="Editar ${esc(c.nombre)}" data-ed-cuenta="${c.id}">${ico("pen", 15)}</button></div>`;
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">${titulo}</h1><p class="desc">${ambito === "personal" ? "Sus cuentas, ingresos y gastos personales. Solo usted los ve: ni el resto del equipo ni la empresa." : "Las cuentas de EMTECSA con su saldo, y cada ingreso y gasto con su categoría. Lo ven gerencia y administración."}</p></div><div class="fila-b">${D.puede(p, "finanzasPersonales") ? `<button class="s-btn suave-b" type="button" data-retiro>${ico("layers", 15)}Sacar para mí</button>` : ""}${activas.length ? `<button class="s-btn lleno" type="button" data-nuevo-mov>${ico("plus", 16)}Registrar movimiento</button>` : ""}</div></div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: lo que anote se queda en esta computadora.</span></div>`}
        <div class="widgets">
          <div class="w"><span class="w-cab"><span class="icono laton">${ico("wallet", 18)}</span></span><span class="l">Disponible</span><b>${esc(Q(disponible))}</b><small>${deuda < 0 ? `Tarjetas: debe ${esc(Q(-deuda))}` : `${activas.length} ${activas.length === 1 ? "cuenta" : "cuentas"}`}</small></div>
          <div class="w"><span class="w-cab"><span class="icono verde">${ico("download", 18)}</span></span><span class="l">Entró en ${esc(mesTxt(e.mes).split(" ")[0])}</span><b>${esc(Q(entro))}</b><small>${(n => n + (n === 1 ? " ingreso" : " ingresos"))(delMes.filter(m => m.tipo === "ingreso").length)}</small></div>
          <div class="w"><span class="w-cab"><span class="icono gris">${ico("arrowR", 18)}</span></span><span class="l">Salió en ${esc(mesTxt(e.mes).split(" ")[0])}</span><b>${esc(Q(salio))}</b><small>${entro - salio >= 0 ? "Quedan " + esc(Q(entro - salio)) : "Faltan " + esc(Q(salio - entro))}</small></div>
        </div>
        ${pintarPorPagar(f, ambito)}
        ${pintarPresupuesto(f, e.mes, porId)}
        ${ambito === "personal" ? pintarMetas(f) : await pintarFlujo(f, porId)}
        ${pintarPrestamos(f)}
        ${pintarCuadreYReportes(f, ambito)}
        <section class="caja"><div class="caja-cab"><h2>Cuentas</h2><button class="s-btn suave-b" type="button" data-nueva-cuenta>${ico("plus", 15)}Agregar cuenta</button></div>
          ${activas.length ? `<div class="lista">${activas.map(filaCuenta).join("")}</div>` : `<div class="vacio chico"><p>${ambito === "personal" ? "Agregue sus cuentas: banco, efectivo y tarjetas." : "Agregue las cuentas de la empresa: bancos, caja chica y tarjetas."} Cada una con lo que tiene hoy.</p></div>`}
          ${conUSD ? `<p class="suave fin-cambio">1 US$ = ${esc(Q(f.cambio))}<button class="s-ib" type="button" aria-label="Cambiar el tipo de cambio" data-cambio>${ico("pen", 14)}</button></p>` : ""}
          ${archivadas.length ? `<details class="plegable-l"><summary>Archivadas · ${archivadas.length}</summary><div class="lista">${archivadas.map(filaCuenta).join("")}</div></details>` : ""}
        </section>
        ${activas.length ? `<div class="herr fin-herr">
          <div class="chips-f" role="group" aria-label="Tipo de movimiento">${FILTROS.map(([k, n]) => `<button type="button" data-f="${k}" aria-pressed="${e.filtro === k}">${n}</button>`).join("")}</div>
          <label class="f-campo fin-sel"><span class="sr">Cuenta</span><select data-f-cuenta><option value="">Todas las cuentas</option>${activas.map(c => `<option value="${c.id}" ${String(e.cuenta) === String(c.id) ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select></label>
          <label class="f-campo fin-sel"><span class="sr">Mes</span><input type="month" data-f-mes value="${e.mes}" max="${hoy().slice(0, 7)}"></label>
          <label class="busca-v"><span class="sr">Buscar</span>${ico("search", 16)}<input type="search" data-f-busca placeholder="Buscar en los movimientos" value="${esc(e.busca)}" autocomplete="off"></label>
        </div>
        <div data-movs></div>` : ""}
        <details class="caja plegable"><summary><span class="pl-t"><h2>Categorías</h2><span class="suave">${f.categorias.filter(c => c.activo !== false).length} · para ordenar los gastos e ingresos</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
          ${["gasto", "ingreso"].map(tp => `<div class="fin-cats"><div class="caja-cab"><h3>${tp === "gasto" ? "De gastos" : "De ingresos"}</h3><button class="s-btn suave-b chico" type="button" data-nueva-cat="${tp}">${ico("plus", 14)}Agregar</button></div><div class="lista">${f.categorias.filter(c => c.tipo === tp).map(c => `<div class="fila con-lapiz ${c.activo === false ? "anulado" : ""}" style="cursor:default"><span><b>${esc(c.nombre)}</b>${c.activo === false ? "<small>Archivada</small>" : ""}</span><span></span><button class="s-ib" type="button" aria-label="Editar ${esc(c.nombre)}" data-ed-cat="${c.id}">${ico("pen", 15)}</button></div>`).join("")}</div></div>`).join("")}
        </div></details>
      </div>`;
    if (pg) v.querySelector(".cuerpo").prepend(pg);
    const box = v.querySelector("[data-movs]");
    const pintarMovs = () => {
      if (!box) return;
      const q = A().normal(e.busca);
      const l = f.movimientos.filter(m => String(m.fecha).slice(0, 7) === e.mes && (!e.filtro || m.tipo === e.filtro) && (!e.cuenta || String(m.cuenta_id) === String(e.cuenta) || String(m.cuenta_destino_id) === String(e.cuenta)) && (!q || A().normal([m.descripcion, m.referencia, (catId[m.categoria_id] || {}).nombre, (porId[m.cuenta_id] || {}).nombre, m.monto].join(" ")).includes(q)));
      if (!l.length) { box.innerHTML = `<div class="vacio chico"><p>${f.movimientos.length ? `Nada en ${esc(mesTxt(e.mes))} con ese filtro.` : "Todavía no hay movimientos. Toque «Registrar movimiento»."}</p></div>`; return; }
      const dias = [...new Set(l.map(m => m.fecha))];
      box.innerHTML = dias.map(d => `<div class="grupo-t">${esc(fLarga(d))}</div><div class="lista">${l.filter(m => m.fecha === d).map(m => {
        const c = porId[m.cuenta_id] || {}, cat = catId[m.categoria_id], dest = porId[m.cuenta_destino_id];
        const titulo2 = m.descripcion || (m.tipo === "transferencia" ? `A ${dest ? dest.nombre : "otra cuenta"}` : cat ? cat.nombre : "Sin descripción");
        const sub = m.tipo === "transferencia" ? `${c.nombre || ""} → ${dest ? dest.nombre : ""}` : [cat && m.descripcion ? cat.nombre : "", c.nombre, m.referencia].filter(Boolean).join(" · ");
        const signo = m.tipo === "ingreso" ? "+" : m.tipo === "gasto" ? "−" : "";
        return `<div class="fila con-lapiz fin-mov ${m.anulado ? "anulado" : ""}" style="cursor:default"><span class="icono ${m.tipo === "ingreso" ? "verde" : m.tipo === "gasto" ? "gris" : "azul"} chico">${ico(m.tipo === "ingreso" ? "download" : m.tipo === "gasto" ? "arrowR" : "layers", 15)}</span><span><b>${esc(titulo2)}</b><small>${esc(sub)}${m.foto ? " · con recibo" : ""}${ORIGEN[m.origen] ? " · " + ORIGEN[m.origen] : ""}${m.anulado ? " · anulado: " + esc(m.motivo_anulado || "") : ""}</small></span><span class="der"><b class="e-cifra ${m.tipo === "ingreso" ? "fin-mas" : ""}">${signo}${esc(dinero(m.monto, c.moneda))}</b></span><button class="s-ib" type="button" aria-label="Abrir ${esc(titulo2)}" data-ed-mov="${m.id}">${ico("pen", 15)}</button></div>`;
      }).join("")}</div>`).join("");
    };
    pintarMovs();
    const recargar = () => A().quieto(() => vista(v, ambito));
    v.oninput = ev => { if (ev.target.matches("[data-f-busca]")) { e.busca = ev.target.value; pintarMovs(); } };
    v.onchange = ev => {
      if (ev.target.matches("[data-f-cuenta]")) { e.cuenta = ev.target.value; pintarMovs(); }
      if (ev.target.matches("[data-f-mes]") && ev.target.value) { e.mes = ev.target.value; recargar(); }
    };
    v.onclick = async ev => {
      const fb = ev.target.closest("[data-f]"); if (fb) { e.filtro = fb.dataset.f; v.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", String(b === fb))); pintarMovs(); return; }
      if (ev.target.closest("[data-nueva-cuenta]")) { editarCuenta(ambito, null, f, recargar); return; }
      const ec = ev.target.closest("[data-ed-cuenta]"); if (ec) { editarCuenta(ambito, f.cuentas.find(x => x.id === Number(ec.dataset.edCuenta)), f, recargar); return; }
      if (ev.target.closest("[data-nuevo-mov]")) { editarMov(ambito, null, f, recargar); return; }
      const em = ev.target.closest("[data-ed-mov]"); if (em) { editarMov(ambito, f.movimientos.find(x => x.id === Number(em.dataset.edMov)), f, recargar); return; }
      const nc = ev.target.closest("[data-nueva-cat]"); if (nc) { editarCat(ambito, { tipo: nc.dataset.nuevaCat }, recargar); return; }
      const ecat = ev.target.closest("[data-ed-cat]"); if (ecat) { editarCat(ambito, f.categorias.find(x => x.id === Number(ecat.dataset.edCat)), recargar); return; }
      if (ev.target.closest("[data-cambio]")) { cambio(f, recargar); return; }
      if (ev.target.closest("[data-retiro]")) { retiro(recargar); return; }
      const ptj = ev.target.closest("[data-pagar-tarjeta]"); if (ptj) { const tj = f.cuentas.find(x => x.id === Number(ptj.dataset.pagarTarjeta)); editarMov(ambito, null, f, recargar, { tipo: "transferencia", destino: tj.id, monto: -tj.saldo, desc: "Pago de " + tj.nombre }); return; }
      if (ev.target.closest("[data-nuevo-prest]")) { editarPrestamo(ambito, null, f, recargar); return; }
      const epr = ev.target.closest("[data-ed-prest]"); if (epr) { editarPrestamo(ambito, f.prestamos.find(x => x.id === Number(epr.dataset.edPrest)), f, recargar); return; }
      const cq = ev.target.closest("[data-cuadre]"); if (cq) { cuadre(ambito, f.cuentas.find(x => x.id === Number(cq.dataset.cuadre)), f, recargar); return; }
      const rp = ev.target.closest("[data-reporte]"); if (rp) { reporte(ambito, f, porId, rp.dataset.reporte); return; }
      if (ev.target.closest("[data-presu]")) { presupuesto(ambito, f, e.mes, porId, recargar); return; }
      if (ev.target.closest("[data-nueva-meta]")) { editarMeta(ambito, null, recargar); return; }
      const emt = ev.target.closest("[data-ed-meta]"); if (emt) { editarMeta(ambito, f.metas.find(x => x.id === Number(emt.dataset.edMeta)), recargar); return; }
      const apm = ev.target.closest("[data-aportar]"); if (apm) { aportar(f.metas.find(x => x.id === Number(apm.dataset.aportar)), recargar); return; }
      if (ev.target.closest("[data-nuevo-pp]")) { editarPP(ambito, null, f, recargar); return; }
      const epp = ev.target.closest("[data-ed-pp]"); if (epp) { editarPP(ambito, f.compromisos.find(x => x.id === Number(epp.dataset.edPp)), f, recargar); return; }
      const pg = ev.target.closest("[data-pagar]"); if (pg) { pagar(ambito, f.compromisos.find(x => x.id === Number(pg.dataset.pagar)), f, recargar); return; }
    };
  }

  function editarCuenta(ambito, c0, f, recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico } = A();
    const c = c0 || { tipo: "banco", moneda: "GTQ", saldo_inicial: 0, fecha_inicial: hoy() };
    const usada = c0 && f.movimientos.some(m => m.cuenta_id === c0.id || m.cuenta_destino_id === c0.id);
    modal({
      titulo: c0 ? "Editar cuenta" : "Cuenta nueva", guardarTxt: "Guardar",
      extra: c0 ? `<button class="s-btn suave-b" type="button" data-arch-c>${ico("box", 15)}${c0.activo === false ? "Volver a activar" : "Archivar"}</button>` : "",
      cuerpo: `<label class="f-campo">Nombre<input name="nombre" value="${esc(c.nombre || "")}" placeholder="${ambito === "personal" ? "Ej. Mi cuenta del BI" : "Ej. Monetaria BI"}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">Tipo<select name="tipo">${Object.entries(D.FIN_TIPOS_CUENTA).map(([k, n]) => `<option value="${k}" ${c.tipo === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="f-campo">Moneda<select name="moneda" ${usada ? "disabled" : ""}>${Object.entries(D.FIN_MONEDAS).map(([k, n]) => `<option value="${k}" ${c.moneda === k ? "selected" : ""}>${n}</option>`).join("")}</select>${usada ? "<small>Ya tiene movimientos: la moneda no se cambia.</small>" : ""}</label></div>
        <div class="f-fila" data-banco><label class="f-campo">Banco<input name="banco" value="${esc(c.banco || "")}" autocomplete="off"></label><label class="f-campo">Número<input name="numero" value="${esc(c.numero || "")}" inputmode="numeric" autocomplete="off"></label></div>
        <div class="f-fila">${campoMonto("saldo", c.tipo === "tarjeta" ? "Lo que debe hoy" : "Lo que tiene hoy", c.tipo === "tarjeta" ? -Math.min(0, c.saldo_inicial) : c.saldo_inicial, "Con esto empieza el saldo.")}<label class="f-campo">Desde el día<input type="date" name="fecha" value="${esc(c.fecha_inicial || hoy())}"></label></div>`,
      alAbrir: (fm, m) => {
        formatoAlSalir(fm);
        const ver = () => { const tp = fm.tipo.value; fm.querySelector("[data-banco]").hidden = !(tp === "banco" || tp === "tarjeta"); fm.querySelector('[name="saldo"]').closest("label").firstChild.textContent = tp === "tarjeta" ? "Lo que debe hoy" : "Lo que tiene hoy"; };
        fm.tipo.addEventListener("change", ver); ver();
        m.addEventListener("click", async ev => {
          if (!ev.target.closest("[data-arch-c]")) return;
          try { await D.guardarCuentaFin(ambito, { ...c0, activo: c0.activo === false }); cerrarCapas(); aviso(c0.activo === false ? "Cuenta activada." : "Cuenta archivada: ya no sale para escoger."); await recargar(); } catch (err) { aviso(err.message, "mal"); }
        });
      },
      alGuardar: async fm => {
        const tipo = fm.tipo.value; let s = numero(fm.saldo.value) || 0; if (tipo === "tarjeta") s = -Math.abs(s);
        await D.guardarCuentaFin(ambito, { ...c0, nombre: fm.nombre.value, tipo, moneda: usada ? c.moneda : fm.moneda.value, banco: fm.banco.value, numero: fm.numero.value, saldo_inicial: s, fecha_inicial: fm.fecha.value });
        cerrarCapas(); aviso(c0 ? "Cuenta guardada." : "Cuenta agregada."); await recargar();
      }
    });
  }

  function editarMov(ambito, m0, f, recargar, pre) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico, montoTxt } = A();
    const activas = f.cuentas.filter(c => c.activo !== false || (m0 && (c.id === m0.cuenta_id || c.id === m0.cuenta_destino_id)));
    const porId = Object.fromEntries(f.cuentas.map(c => [c.id, c]));
    let tipo = m0 ? m0.tipo : pre && pre.tipo || "gasto", archivo = null, catNueva = false;
    const auto = m0 && (m0.origen === "pago" || m0.origen === "gasto_obra"), ret = m0 && m0.origen === "retiro";
    const solo = m0 && (m0.anulado || auto || ret);
    const ultima = pre ? (activas.find(c => c.tipo !== "tarjeta" && c.id !== pre.destino) || activas[0]) : (est[ambito].cuenta && activas.find(c => String(c.id) === String(est[ambito].cuenta))) || activas[0];
    const cats = tp => f.categorias.filter(c => c.tipo === tp && (c.activo !== false || (m0 && c.id === m0.categoria_id)));
    const m = modal({
      titulo: m0 ? (solo ? "Movimiento anulado" : "Movimiento") : "Registrar movimiento", guardarTxt: solo ? "Cerrar" : "Guardar",
      extra: m0 && (!solo || (ret && !m0.anulado)) ? `<button class="s-btn suave-b" type="button" data-anular>${ico("trash", 15)}Anular</button>` : "",
      cuerpo: `<fieldset class="bloq" ${solo ? "disabled" : ""} style="border:0;padding:0;margin:0;display:grid;gap:14px">
        <div class="seg ancho" role="group" aria-label="Tipo de movimiento">${TIPOS_M.map(([k, n]) => `<button type="button" data-tm="${k}" aria-pressed="${tipo === k}">${n}</button>`).join("")}</div>
        <div class="f-fila">${campoMonto("monto", "Monto", m0 ? m0.monto : pre && pre.monto || null)}<label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(m0 ? m0.fecha : hoy())}" max="${hoy()}"></label></div>
        <label class="f-campo"><span data-et-cuenta>Cuenta</span><select name="cuenta">${activas.map(c => `<option value="${c.id}" ${(m0 ? m0.cuenta_id : ultima && ultima.id) === c.id ? "selected" : ""}>${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
        <div data-solo-tr hidden><label class="f-campo">Pasa a la cuenta<select name="destino"><option value="">Escoja…</option>${activas.map(c => `<option value="${c.id}" ${(m0 ? m0.cuenta_destino_id : pre && pre.destino) === c.id ? "selected" : ""}>${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
          <div data-solo-cambio hidden>${campoMonto("destino_monto", "Lo que llega a esa cuenta", m0 ? m0.monto_destino : null, "Las dos cuentas tienen distinta moneda.")}</div></div>
        <div data-solo-cat><label class="f-campo">Categoría<select name="categoria"></select></label><label class="f-campo" data-cat-nueva hidden>Nombre de la categoría nueva<input name="cat_nueva" autocomplete="off"></label></div>
        <label class="f-campo">Descripción<input name="desc" value="${esc(m0 && m0.descripcion || pre && pre.desc || "")}" placeholder="En qué o de quién" autocomplete="off"></label>
        <label class="f-campo">Referencia<input name="ref" value="${esc(m0 && m0.referencia || "")}" placeholder="No. de boleta, cheque o transferencia" autocomplete="off"></label>
        <div class="f-campo"><span>Recibo o comprobante <small class="suave">opcional</small></span><div class="ficha-fila"><span data-foto-est>${m0 && m0.foto ? `${ico("file", 15)}<b>Tiene recibo</b>` : "<small>Sin recibo</small>"}</span><span class="acc">${m0 && m0.foto ? `<button class="s-ib" type="button" aria-label="Ver el recibo" data-ver-foto>${ico("eye", 15)}</button>` : ""}${solo ? "" : `<label class="s-btn suave-b chico">${ico("plus", 14)}${m0 && m0.foto ? "Cambiar" : "Foto"}<input type="file" accept="image/*,application/pdf" hidden data-foto></label>`}</span></div></div>
        ${m0 && m0.anulado ? `<p class="aviso-cot">${ico("alerta", 15)}<span>Anulado: ${esc(m0.motivo_anulado || "")}. No cuenta en los saldos.</span></p>` : auto ? `<p class="aviso-cot">${ico("bell", 15)}<span>${m0.origen === "pago" ? "Viene de un recibo de Cobros" : "Viene de un gasto de obra"}: se cambia o se anula allá y aquí se actualiza solo.</span></p>` : ret ? `<p class="aviso-cot">${ico("bell", 15)}<span>Se sacó de la empresa para usted: está en la empresa y en lo personal. Si lo anula, se anula en los dos lados.</span></p>` : ""}
      </fieldset>`,
      alAbrir: (fm, mm) => {
        formatoAlSalir(fm);
        const pintar = () => {
          mm.querySelectorAll("[data-tm]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tm === tipo)));
          fm.querySelector("[data-et-cuenta]").textContent = tipo === "ingreso" ? "Entra a la cuenta" : "Sale de la cuenta";
          fm.querySelector("[data-solo-tr]").hidden = tipo !== "transferencia";
          fm.querySelector("[data-solo-cat]").hidden = tipo === "transferencia";
          if (tipo !== "transferencia") { const sel = fm.categoria, ant = sel.value || (m0 && m0.categoria_id); sel.innerHTML = `<option value="">Sin categoría</option>${cats(tipo).map(c => `<option value="${c.id}" ${String(ant) === String(c.id) ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}<option value="+">+ Categoría nueva…</option>`; fm.querySelector("[data-cat-nueva]").hidden = true; catNueva = false; }
          monedas();
        };
        const monedas = () => { const a = porId[Number(fm.cuenta.value)], b = porId[Number(fm.destino.value)]; fm.querySelector("[data-solo-cambio]").hidden = !(tipo === "transferencia" && a && b && a.moneda !== b.moneda); };
        pintar();
        fm.addEventListener("change", ev => {
          if (ev.target.name === "cuenta" || ev.target.name === "destino") monedas();
          if (ev.target.name === "categoria") { catNueva = ev.target.value === "+"; fm.querySelector("[data-cat-nueva]").hidden = !catNueva; if (catNueva) fm.cat_nueva.focus(); }
          if (ev.target.matches("[data-foto]") && ev.target.files[0]) { archivo = ev.target.files[0]; fm.querySelector("[data-foto-est]").innerHTML = `${ico("file", 15)}<b>${esc(archivo.name)}</b><small>Se sube al guardar</small>`; }
        });
        mm.addEventListener("click", async ev => {
          const b = ev.target.closest("[data-tm]"); if (b && !solo) { tipo = b.dataset.tm; pintar(); return; }
          if (ev.target.closest("[data-ver-foto]")) { const u = await D.fotoFin(m0.foto); if (!u) { aviso("No se encontró el recibo.", "mal"); return; } const w = window.open(u, "_blank"); if (w) w.opener = null; return; }
          if (ev.target.closest("[data-anular]")) {
            const c2 = modal({ titulo: "¿Anular el movimiento?", guardarTxt: "Anular", cuerpo: `<p class="suave" style="font-size:14.5px">No se borra: queda anulado y deja de contar en el saldo. Si tenía un error, anúlelo y regístrelo otra vez.</p><label class="f-campo">Motivo<input name="motivo" autocomplete="off"></label>`,
              alGuardar: async f2 => { if (ret) await D.anularPorOrigen("retiro", m0.origen_id, f2.motivo.value); else await D.anularMovimientoFin(m0.id, f2.motivo.value); if (m0.origen === "compromiso") await D.revertirCompromiso(m0.origen_id).catch(() => {}); cerrarCapas(); aviso(ret ? "Anulado en la empresa y en lo personal." : "Movimiento anulado."); await recargar(); } });
            c2.querySelector("[data-guardar]").classList.add("peligro-b");
          }
        });
      },
      alGuardar: async fm => {
        if (solo) { cerrarCapas(); return; }
        let categoria_id = tipo === "transferencia" ? null : fm.categoria.value;
        if (categoria_id === "+") { categoria_id = await D.guardarCategoriaFin(ambito, { nombre: fm.cat_nueva.value, tipo }); }
        const a = porId[Number(fm.cuenta.value)], b = porId[Number(fm.destino.value)];
        const mismaMoneda = !(tipo === "transferencia" && a && b && a.moneda !== b.moneda);
        await D.guardarMovimientoFin(ambito, { ...(m0 || {}), tipo, monto: numero(fm.monto.value), fecha: fm.fecha.value, cuenta_id: fm.cuenta.value, cuenta_destino_id: fm.destino.value, monto_destino: mismaMoneda ? null : numero(fm.destino_monto.value), categoria_id, descripcion: fm.desc.value, referencia: fm.ref.value }, archivo);
        if (!m0) est[ambito].mes = (fm.fecha.value || hoy()).slice(0, 7);
        cerrarCapas(); aviso(m0 ? "Movimiento guardado." : "Movimiento registrado."); await recargar();
      }
    });
    return m;
  }

  function pintarPorPagar(f, ambito) {
    const { esc, ico, Q } = A();
    const act = f.compromisos.filter(c => c.activo !== false);
    const porCuenta = Object.fromEntries(f.cuentas.map(c => [c.id, c]));
    const mes = hoy().slice(0, 7), delMes = act.filter(c => String(c.proximo).slice(0, 7) <= mes);
    const total = delMes.reduce((a, c) => a + (c.monto || 0), 0);
    const fila = c => { const n = diasA(c.proximo), cu = porCuenta[c.cuenta_id]; return `<div class="fila con-lapiz fin-pp" style="cursor:default"><span class="icono ${n < 0 ? "ambar" : n <= (c.aviso_dias || 0) ? "laton" : "gris"} chico">${ico("clock", 15)}</span><span><b>${esc(c.nombre)}</b><small>${esc([c.a_quien, c.tipo === "unico" ? "Una sola vez" : D.FIN_FRECUENCIAS[c.frecuencia], cu ? cu.nombre : ""].filter(Boolean).join(" · "))}</small></span><span class="der"><b class="e-cifra">${c.monto != null ? esc((c.variable ? "≈ " : "") + Q(c.monto)) : "Variable"}</b><small><span class="chip ${n < 0 ? "ambar" : n <= (c.aviso_dias || 0) ? "laton" : "gris"}">${esc(venceTxt(c.proximo))} · ${esc(fCorta(c.proximo))}</span></small></span><span class="acc"><button class="s-btn suave-b chico" type="button" data-pagar="${c.id}">Pagar</button><button class="s-ib" type="button" aria-label="Editar ${esc(c.nombre)}" data-ed-pp="${c.id}">${ico("pen", 15)}</button></span></div>`; };
    return `<section class="caja"><div class="caja-cab"><h2>Por pagar</h2><button class="s-btn suave-b" type="button" data-nuevo-pp>${ico("plus", 15)}Agregar</button></div>
      ${act.length ? `<p class="suave fin-pp-res">${delMes.length ? `Este mes ${delMes.length === 1 ? "falta 1 pago" : `faltan ${delMes.length} pagos`} · ${esc(Q(total))}${delMes.some(c => c.monto == null || c.variable) ? " aprox." : ""}` : "Nada por pagar este mes."}</p><div class="lista">${act.map(fila).join("")}</div>`
        : `<div class="vacio chico"><p>${ambito === "personal" ? "Anote sus pagos fijos (colegio, luz, teléfono, tarjeta) y le avisamos antes de que venzan." : "Anote los gastos fijos (alquiler, luz, planilla) y lo que se le debe a cada proveedor. Le avisamos en Hoy antes de que venzan."}</p></div>`}</section>`;
  }

  const barra = (p, cls) => `<i class="mini-av fin-barra ${cls || ""}"><span style="transform:scaleX(${Math.max(0, Math.min(1, p))})"></span></i>`;
  const gastadoMes = (f, mes, porId) => { const g = {}; f.movimientos.filter(m => !m.anulado && m.tipo === "gasto" && String(m.fecha).slice(0, 7) === mes && m.categoria_id).forEach(m => { g[m.categoria_id] = (g[m.categoria_id] || 0) + D.enQ(m.monto, (porId[m.cuenta_id] || {}).moneda, f.cambio); }); return g; };

  function pintarPresupuesto(f, mes, porId) {
    const { esc, ico, Q } = A();
    const g = gastadoMes(f, mes, porId), cat = Object.fromEntries(f.categorias.map(c => [c.id, c]));
    const l = f.presupuestos.filter(p => cat[p.categoria_id]).map(p => ({ ...p, cat: cat[p.categoria_id], gastado: g[p.categoria_id] || 0 })).sort((a, b) => b.gastado / b.monto - a.gastado / a.monto);
    const tot = l.reduce((a, x) => a + x.monto, 0), gas = l.reduce((a, x) => a + x.gastado, 0), pasadas = l.filter(x => x.gastado > x.monto).length;
    const res = l.length ? `Lleva ${Q(gas)} de ${Q(tot)}${pasadas ? ` · ${pasadas === 1 ? "1 categoría se pasó" : pasadas + " categorías se pasaron"}` : ""}` : "Sin presupuesto todavía";
    return `<details class="caja plegable fin-pl"><summary><span class="pl-t"><h2>Presupuesto de ${esc(mesTxt(mes).split(" ")[0])}</h2><span class="suave ${pasadas ? "falta" : ""}">${esc(res)}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
      ${l.length ? `<div class="lista">${l.map(x => { const p = x.gastado / x.monto, pasa = x.gastado > x.monto; return `<div class="fila fin-pr" style="cursor:default"><span><b>${esc(x.cat.nombre)}</b><small>${esc(Q(x.gastado))} de ${esc(Q(x.monto))}</small>${barra(p, pasa ? "pasa" : p >= .9 ? "casi" : "")}</span><span class="der"><span class="chip ${pasa ? "ambar" : p >= .9 ? "laton" : "verde"}">${pasa ? "Se pasó " + esc(Q(x.gastado - x.monto)) : "Le quedan " + esc(Q(x.monto - x.gastado))}</span></span></div>`; }).join("")}</div>` : `<p class="suave" style="margin:0;font-size:14px">Ponga cuánto quiere gastar al mes en cada categoría y aquí verá cuánto lleva.</p>`}
      <button class="s-btn suave-b chico" type="button" data-presu>${ico("pen", 14)}${l.length ? "Cambiar el presupuesto" : "Poner presupuesto"}</button>
    </div></details>`;
  }

  function presupuesto(ambito, f, mes, porId, recargar) {
    const { modal, esc, Q, numero, montoTxt, cerrarCapas, aviso } = A();
    const [y, m] = mes.split("-").map(Number), ant = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    const gAnt = gastadoMes(f, ant, porId), pres = Object.fromEntries(f.presupuestos.map(p => [p.categoria_id, p.monto]));
    const cats = f.categorias.filter(c => c.tipo === "gasto" && c.activo !== false);
    modal({
      titulo: "Presupuesto de cada mes", guardarTxt: "Guardar presupuesto",
      cuerpo: `<p class="suave" style="font-size:13.5px;margin:0">Cuánto quiere gastar al mes en cada categoría. Deje vacío lo que no quiera controlar.</p>
        <div class="f-mats fin-presu">${cats.map(c => `<div class="f-mat"><span><b>${esc(c.nombre)}</b><small>${gAnt[c.id] ? "El mes pasado: " + esc(Q(gAnt[c.id])) : "El mes pasado: nada"}</small></span><label class="f-cant"><span class="sr">Presupuesto de ${esc(c.nombre)}</span><span class="f-monto"><span>Q</span><input inputmode="decimal" data-pres="${c.id}" value="${esc(montoTxt(pres[c.id]))}" placeholder="0.00" autocomplete="off"></span></label></div>`).join("")}</div>`,
      alAbrir: fm => fm.querySelectorAll("[data-pres]").forEach(i => i.addEventListener("blur", () => { try { i.value = montoTxt(numero(i.value)); } catch (e) {} })),
      alGuardar: async fm => {
        const l = [...fm.querySelectorAll("[data-pres]")].map(i => { let n; try { n = numero(i.value); } catch (e) { throw new Error("Revise los montos: solo números."); } return { categoria_id: Number(i.dataset.pres), monto: n }; });
        await D.guardarPresupuestos(ambito, l); cerrarCapas(); aviso("Presupuesto guardado."); await recargar();
      }
    });
  }

  function pintarMetas(f) {
    const { esc, ico, Q } = A();
    const l = f.metas.filter(m => m.activo !== false);
    const mesesA = para => { const [y, m] = hoy().split("-").map(Number), [y2, m2] = String(para).split("-").map(Number); return Math.max(1, (y2 - y) * 12 + (m2 - m)); };
    const res = l.length ? `${l.length === 1 ? "1 meta" : l.length + " metas"} · ${Q(l.reduce((a, m) => a + m.ahorrado, 0))} ahorrado` : "Ninguna todavía";
    return `<details class="caja plegable fin-pl"><summary><span class="pl-t"><h2>Metas de ahorro</h2><span class="suave">${esc(res)}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
      ${l.length ? `<div class="lista">${l.map(m => { const p = m.ahorrado / m.objetivo, falta = Math.max(0, m.objetivo - m.ahorrado); return `<div class="fila con-lapiz fin-meta" style="cursor:default"><span class="icono ${p >= 1 ? "verde" : "mezcla"} chico">${ico(p >= 1 ? "check" : "chart", 15)}</span><span><b>${esc(m.nombre)}</b><small>${esc(Q(m.ahorrado))} de ${esc(Q(m.objetivo))}${p >= 1 ? " · ¡Lograda!" : ` · faltan ${esc(Q(falta))}`}${m.para && p < 1 ? ` · para ${esc(fCorta(m.para))}: ${esc(Q(falta / mesesA(m.para)))} al mes` : ""}</small>${barra(p, p >= 1 ? "lista" : "")}</span><span class="acc"><button class="s-btn suave-b chico" type="button" data-aportar="${m.id}">Aportar</button><button class="s-ib" type="button" aria-label="Editar ${esc(m.nombre)}" data-ed-meta="${m.id}">${ico("pen", 15)}</button></span></div>`; }).join("")}</div>` : `<p class="suave" style="margin:0;font-size:14px">Por ejemplo: fondo de emergencia, el carro o un viaje. Ponga cuánto quiere juntar y para cuándo, y le decimos cuánto apartar al mes.</p>`}
      <button class="s-btn suave-b chico" type="button" data-nueva-meta>${ico("plus", 14)}Agregar meta</button>
    </div></details>`;
  }

  function editarMeta(ambito, m0, recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico } = A();
    modal({
      titulo: m0 ? "Editar meta" : "Meta nueva",
      extra: m0 ? `<button class="s-btn suave-b" type="button" data-arch-meta>${ico("box", 15)}Archivar</button>` : "",
      cuerpo: `<label class="f-campo">Para qué<input name="nombre" value="${esc(m0 ? m0.nombre : "")}" placeholder="Ej. Fondo de emergencia" autocomplete="off"></label>
        <div class="f-fila">${campoMonto("objetivo", "Cuánto quiere juntar", m0 ? m0.objetivo : null)}<label class="f-campo">Para cuándo <small class="suave">opcional</small><input type="date" name="para" value="${esc(m0 && m0.para || "")}"></label></div>
        ${m0 ? "" : campoMonto("ya", "Ya tiene ahorrado", null, "Opcional.")}`,
      alAbrir: (fm, mm) => { formatoAlSalir(fm); mm.addEventListener("click", async ev => { if (!ev.target.closest("[data-arch-meta]")) return; try { await D.guardarMeta(ambito, { ...m0, activo: false }); cerrarCapas(); aviso("Meta archivada."); await recargar(); } catch (err) { aviso(err.message, "mal"); } }); },
      alGuardar: async fm => {
        const ya = m0 ? null : numero(fm.ya.value);
        await D.guardarMeta(ambito, { ...(m0 || {}), nombre: fm.nombre.value, objetivo: numero(fm.objetivo.value), para: fm.para.value, aportes: m0 ? m0.aportes : (ya > 0 ? [{ fecha: hoy(), monto: ya, nota: "Lo que ya tenía" }] : []) });
        cerrarCapas(); aviso(m0 ? "Meta guardada." : "Meta agregada."); await recargar();
      }
    });
  }

  function aportar(m, recargar) {
    const { modal, esc, Q, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso } = A();
    let sacar = false;
    modal({
      titulo: m.nombre, guardarTxt: "Anotar",
      cuerpo: `<p class="suave" style="font-size:13.5px;margin:0">Lleva ${esc(Q(m.ahorrado))} de ${esc(Q(m.objetivo))}.</p>
        <div class="seg ancho" role="group" aria-label="Qué hace">${[["no", "Aportar"], ["si", "Sacar"]].map(([k, n]) => `<button type="button" data-sacar="${k}" aria-pressed="${k === "no"}">${n}</button>`).join("")}</div>
        <div class="f-fila">${campoMonto("monto", "Monto", null)}<label class="f-campo">Fecha<input type="date" name="fecha" value="${hoy()}" max="${hoy()}"></label></div>
        <label class="f-campo">Nota<input name="nota" autocomplete="off"></label>
        ${m.aportes.length ? `<details class="plegable-l"><summary>Lo anotado · ${m.aportes.length}</summary><div class="lista">${m.aportes.slice().reverse().map(a => `<div class="fila" style="cursor:default"><span><b>${esc(fCorta(a.fecha))}</b><small>${esc(a.nota || "")}</small></span><span class="der"><span class="e-cifra ${a.monto < 0 ? "falta" : "fin-mas"}">${a.monto < 0 ? "−" : "+"}${esc(Q(Math.abs(a.monto)))}</span></span></div>`).join("")}</div></details>` : ""}`,
      alAbrir: (fm, mm) => { formatoAlSalir(fm); mm.addEventListener("click", ev => { const b = ev.target.closest("[data-sacar]"); if (!b) return; sacar = b.dataset.sacar === "si"; mm.querySelectorAll("[data-sacar]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }); },
      alGuardar: async fm => { const n = numero(fm.monto.value); if (!(n > 0)) throw new Error("Escriba el monto."); await D.aportarMeta(m, { monto: sacar ? -n : n, fecha: fm.fecha.value, nota: fm.nota.value }); cerrarCapas(); aviso(sacar ? "Anotado lo que sacó." : "Aporte anotado."); await recargar(); }
    });
  }

  async function pintarFlujo(f, porId) {
    const { esc, ico, Q } = A();
    const p = A().sesion().perfil, h = hoy(), lim = (() => { const x = new Date(Date.UTC(...h.split("-").map((n, i) => i === 1 ? n - 1 : Number(n)))); x.setUTCDate(x.getUTCDate() + 90); return x.toISOString().slice(0, 10); })();
    const inicio = f.cuentas.filter(c => c.activo !== false && c.tipo !== "tarjeta").reduce((a, c) => a + D.enQ(c.saldo, c.moneda, f.cambio), 0);
    const ev = [], sinFecha = { cobro: 0, n: 0 };
    if (D.puede(p, "verCobros") && D.resumenCobros) { try { const r = await D.resumenCobros(); r.pendientes.forEach(x => { if (!x.vence) { sinFecha.cobro += x.saldo; sinFecha.n++; return; } if (x.vence <= lim) ev.push({ f: x.vence < h ? h : x.vence, m: x.saldo, t: `Cobro: ${x.cliente ? x.cliente.nombre : ""} · ${x.descripcion}` }); }); } catch (e) {} }
    let variables = 0;
    f.compromisos.filter(c => c.activo !== false).forEach(c => {
      if (c.monto == null) { variables++; return; }
      let d = c.proximo, k = 0;
      while (d <= lim && k < 60) { ev.push({ f: d < h ? h : d, m: -c.monto, t: `Pago: ${c.nombre}` }); if (c.tipo === "unico") break; d = D.finSiguiente(d, c.frecuencia); k++; }
    });
    ev.sort((a, b) => a.f.localeCompare(b.f) || b.m - a.m);
    let s = inicio, bajo = { s: inicio, f: h }, negativo = null;
    ev.forEach(x => { s += x.m; x.s = s; if (s < bajo.s) bajo = { s, f: x.f }; if (s < 0 && !negativo) negativo = x; });
    const en = dias => { const x = new Date(Date.UTC(...h.split("-").map((n, i) => i === 1 ? n - 1 : Number(n)))); x.setUTCDate(x.getUTCDate() + dias); const lf = x.toISOString().slice(0, 10); const u = ev.filter(e => e.f <= lf).pop(); return u ? u.s : inicio; };
    const res = negativo ? `El ${fCorta(negativo.f)} faltarían ${Q(-negativo.s)}` : `El punto más bajo: ${Q(bajo.s)}${bajo.f !== h ? " el " + fCorta(bajo.f) : ""}`;
    return `<details class="caja plegable fin-pl"><summary><span class="pl-t"><h2>Flujo de los próximos 90 días</h2><span class="suave ${negativo ? "falta" : ""}">${esc(res)}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
      <div class="fin-flujo">${[["Hoy", inicio], ["En 30 días", en(30)], ["En 60 días", en(60)], ["En 90 días", en(90)]].map(([t2, n]) => `<div><small>${t2}</small><b class="e-cifra ${n < 0 ? "falta" : ""}">${esc(Q(n))}</b></div>`).join("")}</div>
      ${negativo ? `<p class="aviso-cot">${ico("alerta", 15)}<span>El ${esc(fCorta(negativo.f))} no alcanzaría: faltarían ${esc(Q(-negativo.s))}. Adelante un cobro o mueva un pago.</span></p>` : ""}
      ${ev.length ? `<div class="lista">${ev.slice(0, 20).map(x => `<div class="fila" style="cursor:default"><span><b>${esc(x.t)}</b><small>${esc(fCorta(x.f))} · queda ${esc(Q(x.s))}</small></span><span class="der"><span class="e-cifra ${x.m > 0 ? "fin-mas" : ""}">${x.m > 0 ? "+" : "−"}${esc(Q(Math.abs(x.m)))}</span></span></div>`).join("")}</div>${ev.length > 20 ? `<p class="suave" style="font-size:13px;margin:0">y ${ev.length - 20} más</p>` : ""}` : `<p class="suave" style="margin:0;font-size:14px">No hay cobros ni pagos con fecha en los próximos 90 días.</p>`}
      <p class="suave" style="font-size:12.5px;margin:0">Sale de lo que hay hoy en las cuentas (sin tarjetas), más los cobros de obras con fecha, menos lo que está en Por pagar.${sinFecha.n ? ` Hay ${esc(Q(sinFecha.cobro))} por cobrar sin fecha que no se cuentan.` : ""}${variables ? ` ${variables === 1 ? "1 pago" : variables + " pagos"} sin monto fijo no se cuentan.` : ""}</p>
    </div></details>`;
  }

  function pintarPrestamos(f) {
    const { esc, ico, Q } = A();
    const l = f.prestamos.filter(p => p.activo !== false), porComp = Object.fromEntries(f.compromisos.map(c => [c.id, c]));
    const deuda = l.reduce((a, p) => a + p.saldo, 0);
    return `<details class="caja plegable fin-pl"><summary><span class="pl-t"><h2>Préstamos</h2><span class="suave">${l.length ? `Debe ${esc(Q(deuda))} · ${l.length === 1 ? "1 préstamo" : l.length + " préstamos"}` : "Ninguno"}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
      ${l.length ? `<div class="lista">${l.map(p => { const c = porComp[p.compromiso_id], pg = 1 - p.saldo / p.monto; return `<div class="fila con-lapiz" style="cursor:default"><span class="icono gris chico">${ico("sheet", 15)}</span><span><b>${esc(p.nombre)}</b><small>${esc([p.acreedor, `${Q(p.cuota)} al mes`, p.plazo_meses ? `${p.cuotas_pagadas} de ${p.plazo_meses} cuotas` : `${p.cuotas_pagadas} ${p.cuotas_pagadas === 1 ? "cuota pagada" : "cuotas pagadas"}`, c && c.activo !== false ? "próxima " + fCorta(c.proximo) : ""].filter(Boolean).join(" · "))}</small>${barra(pg, pg >= 1 ? "lista" : "")}</span><span class="der"><b class="e-cifra">${esc(Q(p.saldo))}</b><small>de ${esc(Q(p.monto))}</small></span><button class="s-ib" type="button" aria-label="Editar ${esc(p.nombre)}" data-ed-prest="${p.id}">${ico("pen", 15)}</button></div>`; }).join("")}</div>` : `<p class="suave" style="margin:0;font-size:14px">Anote cada préstamo con su cuota: la cuota sale sola en Por pagar cada mes y aquí ve cuánto debe.</p>`}
      <button class="s-btn suave-b chico" type="button" data-nuevo-prest>${ico("plus", 14)}Agregar préstamo</button>
    </div></details>`;
  }

  function editarPrestamo(ambito, p0, f, recargar) {
    const { modal, esc, Q, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico } = A();
    const cuentas = f.cuentas.filter(c => c.activo !== false && c.tipo !== "tarjeta");
    const comp = p0 && f.compromisos.find(c => c.id === p0.compromiso_id);
    modal({
      titulo: p0 ? "Editar préstamo" : "Préstamo nuevo",
      extra: p0 ? `<button class="s-btn suave-b" type="button" data-prest-fin>${ico("check", 15)}${p0.activo === false ? "Volver a activar" : "Ya lo terminé de pagar"}</button>` : "",
      cuerpo: `<div class="f-fila"><label class="f-campo">Nombre<input name="nombre" value="${esc(p0 ? p0.nombre : "")}" placeholder="Ej. Préstamo del pickup" autocomplete="off"></label><label class="f-campo">Con quién<input name="acreedor" value="${esc(p0 && p0.acreedor || "")}" placeholder="Banco o persona" autocomplete="off"></label></div>
        <div class="f-fila">${campoMonto("monto", "Monto prestado", p0 ? p0.monto : null)}<label class="f-campo">Interés al año <small class="suave">opcional</small><span class="f-pct"><input name="tasa" inputmode="decimal" value="${esc(p0 && p0.tasa_anual != null ? p0.tasa_anual : "")}" placeholder="0" autocomplete="off"><span>%</span></span></label></div>
        <div class="f-fila"><label class="f-campo">Plazo en meses <small class="suave">opcional</small><input name="plazo" inputmode="numeric" value="${esc(p0 && p0.plazo_meses || "")}" autocomplete="off"></label>${campoMonto("cuota", "Cuota al mes", p0 ? p0.cuota : null, "Con interés y plazo se calcula sola.")}</div>
        <div class="f-fila"><label class="f-campo">${p0 ? "Próxima cuota" : "Primera cuota"}<input type="date" name="primer" value="${esc(comp ? comp.proximo : p0 ? p0.primer_pago : "")}" ${p0 ? "disabled" : ""}></label><label class="f-campo">Se paga de<select name="cuenta"><option value="">Escoger al pagar</option>${cuentas.map(c => `<option value="${c.id}" ${comp && comp.cuenta_id === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select></label></div>
        ${p0 ? "" : `<label class="f-campo">El dinero del préstamo entró a<select name="recibir"><option value="">No anotarlo (ya estaba en una cuenta)</option>${cuentas.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("")}</select></label>`}`,
      alAbrir: (fm, mm) => {
        formatoAlSalir(fm);
        let tocada = !!p0;
        fm.addEventListener("input", ev => { if (ev.target.name === "cuota") { tocada = true; return; } if (tocada && ev.target.name !== "monto" && ev.target.name !== "tasa" && ev.target.name !== "plazo") return; let n = null, t2 = null, p2 = null; try { n = numero(fm.monto.value); t2 = numero(fm.tasa.value); p2 = Number(fm.plazo.value) || null; } catch (e) { return; } const c = D.finCuotaDe(n, t2, p2); if (c && !tocada) fm.cuota.value = A().montoTxt(c); });
        mm.addEventListener("click", async ev => { if (!ev.target.closest("[data-prest-fin]")) return; try { await D.guardarPrestamo(ambito, { ...p0, cuenta_id: comp ? comp.cuenta_id : null, activo: p0.activo === false }); cerrarCapas(); aviso(p0.activo === false ? "Préstamo activado." : "Préstamo terminado: ya no sale la cuota en Por pagar."); await recargar(); } catch (err) { aviso(err.message, "mal"); } });
      },
      alGuardar: async fm => {
        await D.guardarPrestamo(ambito, { ...(p0 || {}), nombre: fm.nombre.value, acreedor: fm.acreedor.value, monto: numero(fm.monto.value), tasa_anual: fm.tasa.value.trim() === "" ? null : numero(fm.tasa.value), plazo_meses: fm.plazo.value, cuota: numero(fm.cuota.value), primer_pago: p0 ? p0.primer_pago : fm.primer.value, cuenta_id: fm.cuenta.value }, p0 ? null : fm.recibir.value);
        cerrarCapas(); aviso(p0 ? "Préstamo guardado." : "Préstamo agregado: la cuota ya está en Por pagar."); await recargar();
      }
    });
  }

  function pintarCuadreYReportes(f, ambito) {
    const { esc, ico, Q } = A();
    const bancos = f.cuentas.filter(c => c.activo !== false && (c.tipo === "banco" || c.tipo === "tarjeta"));
    const h = hoy(), mesAnt = (([y, m]) => new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7))(h.split("-").map(Number));
    return `${bancos.length ? `<details class="caja plegable fin-pl"><summary><span class="pl-t"><h2>Cuadre con el banco</h2><span class="suave">${bancos.map(c => c.cuadre && c.cuadre.mes ? `${c.nombre}: ${mesTxt(c.cuadre.mes).split(" ")[0]}` : null).filter(Boolean).join(" · ") || "Marque lo que ya salió en el estado de cuenta"}</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
      <div class="lista">${bancos.map(c => { const pend = f.movimientos.filter(m => !m.anulado && !m.conciliado && (m.cuenta_id === c.id || m.cuenta_destino_id === c.id)).length; return `<div class="fila" style="cursor:default"><span class="icono ${c.tipo === "tarjeta" ? "ambar" : "azul"} chico">${ico(ICONO_C[c.tipo] || "building", 15)}</span><span><b>${esc(c.nombre)}</b><small>${pend ? `${pend} sin marcar` : "Todo marcado"}${c.cuadre && c.cuadre.mes ? ` · último cuadre: ${esc(mesTxt(c.cuadre.mes))}` : ""}</small></span><span class="der"><button class="s-btn suave-b chico" type="button" data-cuadre="${c.id}">Cuadrar</button></span></div>`; }).join("")}</div>
    </div></details>` : ""}
    <details class="caja plegable fin-pl"><summary><span class="pl-t"><h2>Reportes</h2><span class="suave">Ingresos, gastos y ${ambito === "empresa" ? "ganancia" : "ahorro"} en PDF y Excel</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
      <div class="fila-b">${[[`mes:${h.slice(0, 7)}`, "Este mes"], [`mes:${mesAnt}`, "Mes pasado"], [`anio:${h.slice(0, 4)}`, "Este año"], [`anio:${Number(h.slice(0, 4)) - 1}`, "Año pasado"]].map(([k, n]) => `<button class="e-btn e-btn-salida chico-e" type="button" data-reporte="${k}">${ico("file", 15)}${n}</button>`).join("")}</div>
    </div></details>`;
  }

  let excelP = null;
  const libExcel = () => window.ExcelJS ? Promise.resolve(window.ExcelJS) : (excelP = excelP || new Promise((ok2, mal) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.integrity = "sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz"; s.crossOrigin = "anonymous"; s.onload = () => ok2(window.ExcelJS); s.onerror = () => { excelP = null; mal(new Error("No se pudo abrir el lector de Excel. Revise el internet.")); }; document.head.append(s); }));
  const fechaDe = v => { if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); const s2 = String(v || "").trim(); let m = s2.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; } m = s2.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : null; };
  const numDe = v => { if (typeof v === "number") return v; if (v && typeof v === "object" && typeof v.result === "number") return v.result; const s2 = String(v || "").replace(/[Q$\s,]/g, "").replace(/^\((.*)\)$/, "-$1"); if (!s2) return null; const n = Number(s2); return isFinite(n) ? n : null; };
  async function leerBanco(file) {
    let filas = [];
    if (/\.csv$/i.test(file.name) || /csv|text/.test(file.type)) { const t2 = await file.text(); const sep = (t2.split("\n")[0].match(/;/g) || []).length > (t2.split("\n")[0].match(/,/g) || []).length ? ";" : ","; filas = t2.split(/\r?\n/).filter(Boolean).map(l => l.split(sep).map(x => x.replace(/^"|"$/g, "").trim())); }
    else { const ExcelJS = await libExcel(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); const ws = wb.worksheets[0]; ws.eachRow({ includeEmpty: false }, r => { const a = []; r.eachCell({ includeEmpty: true }, (c, i) => { a[i - 1] = c.value && c.value.richText ? c.value.richText.map(x => x.text).join("") : c.value; }); filas.push(a); }); }
    let hdr = -1, col = {};
    for (let i = 0; i < Math.min(15, filas.length); i++) { const h2 = filas[i].map(x => A().normal(String(x == null ? "" : x))); const c = {}; h2.forEach((t2, j) => { if (c.fecha == null && /fecha/.test(t2)) c.fecha = j; else if (c.desc == null && /descrip|concepto|detalle|referencia/.test(t2)) c.desc = j; else if (c.deb == null && /debito|cargo|retiro|salida/.test(t2)) c.deb = j; else if (c.cred == null && /credito|abono|deposito|entrada/.test(t2)) c.cred = j; else if (c.monto == null && /monto|importe|valor/.test(t2)) c.monto = j; }); if (c.fecha != null && (c.monto != null || c.deb != null || c.cred != null)) { hdr = i; col = c; break; } }
    if (hdr < 0) throw new Error("No encontré las columnas. El archivo necesita Fecha y Monto (o Débito y Crédito).");
    return filas.slice(hdr + 1).map(r => { const f2 = fechaDe(r[col.fecha]); let n = col.monto != null ? numDe(r[col.monto]) : (numDe(r[col.cred]) || 0) - (numDe(r[col.deb]) || 0); return f2 && n ? { fecha: f2, monto: Math.round(n * 100) / 100, desc: String(col.desc != null && r[col.desc] != null ? r[col.desc] : "").trim() } : null; }).filter(Boolean);
  }

  function cuadre(ambito, c, f, recargar) {
    const { modal, esc, Q, numero, montoTxt, cerrarCapas, aviso, ico } = A();
    let mes = (c.cuadre && c.cuadre.mes) || hoy().slice(0, 7), marcas = new Map(), banco = [];
    const efecto = m => m.cuenta_id === c.id ? (m.tipo === "ingreso" ? m.monto : -m.monto) : (m.monto_destino || m.monto);
    const delMes = () => f.movimientos.filter(m => !m.anulado && String(m.fecha).slice(0, 7) === mes && (m.cuenta_id === c.id || m.cuenta_destino_id === c.id)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    const marcado = m => marcas.has(m.id) ? marcas.get(m.id) : !!m.conciliado;
    const finMes = (([y, mm]) => new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10));
    const saldoSistema = () => { const lim = finMes(mes.split("-").map(Number)); return Math.round((c.saldo_inicial + f.movimientos.filter(m => !m.anulado && m.fecha <= lim && (m.cuenta_id === c.id || m.cuenta_destino_id === c.id)).reduce((a, m) => a + efecto(m), 0)) * 100) / 100; };
    const mm = modal({
      titulo: `Cuadrar ${c.nombre}`, guardarTxt: "Guardar el cuadre",
      cuerpo: `<div class="f-fila"><label class="f-campo">Mes<input type="month" name="mes" value="${mes}" max="${hoy().slice(0, 7)}"></label><label class="f-campo">Saldo del banco al fin del mes<span class="f-monto"><span>Q</span><input name="saldo_banco" inputmode="decimal" value="${esc(c.cuadre && c.cuadre.mes === mes ? montoTxt(c.cuadre.saldo_banco) : "")}" placeholder="Del estado de cuenta" autocomplete="off"></span></label></div>
        <div class="fila-b"><label class="s-btn suave-b chico">${ico("download", 14)}Subir estado de cuenta (Excel o CSV)<input type="file" accept=".xlsx,.csv,text/csv" hidden data-banco-arch></label><button class="s-btn suave-b chico" type="button" data-marcar-todo>Marcar todo</button></div>
        <div data-cuadre-res></div><div data-cuadre-l></div><div data-cuadre-banco></div>`,
      alAbrir: (fm, m2) => {
        const pintar = () => {
          const l = delMes(), sis = saldoSistema(); let sb2 = null; try { sb2 = numero(fm.saldo_banco.value); } catch (e) {}
          const sinMarcar = l.filter(m => !marcado(m));
          const dif = sb2 == null ? null : Math.round((sb2 - sis) * 100) / 100;
          fm.querySelector("[data-cuadre-res]").innerHTML = `<div class="fin-flujo"><div><small>Según el sistema</small><b class="e-cifra">${esc(Q(sis))}</b></div><div><small>Según el banco</small><b class="e-cifra">${sb2 == null ? "—" : esc(Q(sb2))}</b></div><div><small>Diferencia</small><b class="e-cifra ${dif ? "falta" : ""}">${dif == null ? "—" : esc(Q(dif))}</b></div><div><small>Sin marcar</small><b>${sinMarcar.length}</b></div></div>${dif === 0 ? `<p class="suave" style="margin:0;color:var(--exito)">${ico("check", 14)} Cuadra con el banco.</p>` : dif ? `<p class="aviso-cot">${ico("alerta", 15)}<span>No cuadra por ${esc(Q(Math.abs(dif)))}. Revise lo que no está marcado o lo que falta anotar.</span></p>` : ""}`;
          fm.querySelector("[data-cuadre-l]").innerHTML = l.length ? `<div class="lista">${l.map(m => { const e2 = efecto(m), mk = marcado(m); return `<div class="fila ck-f ${mk ? "hecha" : ""}" style="cursor:default"><button class="chk" type="button" aria-pressed="${mk}" aria-label="${mk ? "Quitar la marca" : "Ya salió en el banco"}: ${esc(m.descripcion || "")}" data-mk="${m.id}">${mk ? ico("check", 15) : ""}</button><span><b>${esc(m.descripcion || (m.tipo === "transferencia" ? "Entre cuentas" : "Movimiento"))}</b><small>${esc(fCorta(m.fecha))}${m.referencia ? " · " + esc(m.referencia) : ""}</small></span><span class="der"><span class="e-cifra ${e2 > 0 ? "fin-mas" : ""}">${e2 > 0 ? "+" : "−"}${esc(Q(Math.abs(e2)))}</span></span></div>`; }).join("")}</div>` : `<p class="suave" style="margin:0">No hay movimientos de esta cuenta en ${esc(mesTxt(mes))}.</p>`;
          const libres = banco.filter(b => !b.usado);
          fm.querySelector("[data-cuadre-banco]").innerHTML = libres.length ? `<h3 class="fin-sub">En el banco, pero no en el sistema · ${libres.length}</h3><div class="lista">${libres.map((b, i) => `<div class="fila" style="cursor:default"><span><b>${esc(b.desc || "Sin descripción")}</b><small>${esc(fCorta(b.fecha))}</small></span><span class="der"><span class="e-cifra ${b.monto > 0 ? "fin-mas" : ""}">${b.monto > 0 ? "+" : "−"}${esc(Q(Math.abs(b.monto)))}</span><small><button class="chip-b" type="button" data-agregar-b="${banco.indexOf(b)}">Anotar</button></small></span></div>`).join("")}</div>` : "";
        };
        pintar();
        fm.addEventListener("input", ev => { if (ev.target.name === "saldo_banco") pintar(); });
        fm.addEventListener("change", async ev => {
          if (ev.target.name === "mes" && ev.target.value) { mes = ev.target.value; banco = []; pintar(); }
          if (ev.target.matches("[data-banco-arch]") && ev.target.files[0]) {
            try {
              aviso("Leyendo el estado de cuenta…");
              const lineas = await leerBanco(ev.target.files[0]); ev.target.value = "";
              const meses = [...new Set(lineas.map(x => x.fecha.slice(0, 7)))].sort(); if (meses.length && !meses.includes(mes)) { mes = meses[meses.length - 1]; fm.mes.value = mes; }
              const disp = delMes().filter(m => !marcado(m)); let n = 0;
              banco = lineas.filter(x => x.fecha.slice(0, 7) === mes).map(b => { const i = disp.findIndex(m => Math.abs(efecto(m) - b.monto) < 0.005 && Math.abs((new Date(m.fecha) - new Date(b.fecha)) / 864e5) <= 4); if (i >= 0) { marcas.set(disp[i].id, true); disp.splice(i, 1); n++; return { ...b, usado: true }; } return b; });
              aviso(`Se marcaron ${n} movimientos solos.${banco.filter(b => !b.usado).length ? ` ${banco.filter(b => !b.usado).length} del banco no están en el sistema.` : ""}`);
              pintar();
            } catch (err) { aviso(err.message, "mal"); }
          }
        });
        m2.addEventListener("click", async ev => {
          const k = ev.target.closest("[data-mk]"); if (k) { const id = Number(k.dataset.mk), m = f.movimientos.find(x => x.id === id); marcas.set(id, !marcado(m)); pintar(); return; }
          if (ev.target.closest("[data-marcar-todo]")) { delMes().forEach(m => marcas.set(m.id, true)); pintar(); return; }
          const ab = ev.target.closest("[data-agregar-b]"); if (ab) {
            const b = banco[Number(ab.dataset.agregarB)];
            try { const id = await D.guardarMovimientoFin(ambito, { tipo: b.monto > 0 ? "ingreso" : "gasto", monto: Math.abs(b.monto), fecha: b.fecha, cuenta_id: c.id, descripcion: b.desc || "Del estado de cuenta", referencia: null }, null); await D.marcarConciliado([id], true); b.usado = true; const nf = await D.finanzas(ambito); f.movimientos = nf.movimientos; marcas.set(id, true); aviso("Anotado y marcado."); pintar(); } catch (err) { aviso(err.message, "mal"); }
          }
        });
      },
      alGuardar: async fm => {
        const si = [...marcas].filter(([, v]) => v).map(([k]) => k), no = [...marcas].filter(([, v]) => !v).map(([k]) => k);
        await D.marcarConciliado(si, true); await D.marcarConciliado(no, false);
        let sb2 = null; try { sb2 = numero(fm.saldo_banco.value); } catch (e) {}
        await D.guardarCuadre(c.id, { mes, saldo_banco: sb2, fecha: hoy() });
        cerrarCapas(); aviso("Cuadre guardado."); await recargar();
      }
    });
    mm.classList.add("modal-ancho");
  }

  function datosReporte(f, porId, periodo) {
    const [tipoP, val] = periodo.split(":");
    const dentro = m => tipoP === "mes" ? String(m.fecha).slice(0, 7) === val : String(m.fecha).slice(0, 4) === val;
    const cat = Object.fromEntries(f.categorias.map(c => [c.id, c.nombre]));
    const esPrest = m => m.tipo === "ingreso" && (m.origen === "prestamo" || cat[m.categoria_id] === "Préstamos recibidos");
    const todos = f.movimientos.filter(m => !m.anulado && m.tipo !== "transferencia" && dentro(m));
    const prest = Math.round(todos.filter(esPrest).reduce((a, m) => a + D.enQ(m.monto, (porId[m.cuenta_id] || {}).moneda, f.cambio), 0) * 100) / 100;
    const l = todos.filter(m => !esPrest(m));
    const suma = tp => { const g = {}; l.filter(m => m.tipo === tp).forEach(m => { const k = cat[m.categoria_id] || "Sin categoría"; g[k] = (g[k] || 0) + D.enQ(m.monto, (porId[m.cuenta_id] || {}).moneda, f.cambio); }); return Object.entries(g).map(([n, v]) => ({ n, v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v); };
    const ing = suma("ingreso"), gas = suma("gasto"), ti = ing.reduce((a, x) => a + x.v, 0), tg = gas.reduce((a, x) => a + x.v, 0);
    const titulo = tipoP === "mes" ? mesTxt(val) : "Año " + val;
    return { titulo, ing, gas, ti, tg, prest, res: Math.round((ti - tg) * 100) / 100, n: todos.length };
  }

  function reporte(ambito, f, porId, periodo) {
    const { modal, esc, Q, cerrarCapas, aviso, ico } = A();
    const r = datosReporte(f, porId, periodo), etRes = ambito === "empresa" ? "Ganancia" : "Ahorro";
    const tabla = (l, tot) => l.length ? `<div class="lista">${l.map(x => `<div class="fila" style="cursor:default"><span><b>${esc(x.n)}</b>${barra(tot ? x.v / tot : 0)}</span><span class="der"><b class="e-cifra">${esc(Q(x.v))}</b><small>${tot ? Math.round(x.v / tot * 100) : 0} %</small></span></div>`).join("")}</div>` : `<p class="suave" style="margin:0">Nada.</p>`;
    const mm = modal({
      titulo: `${ambito === "empresa" ? "Finanzas de la empresa" : "Finanzas personales"} · ${r.titulo}`, guardarTxt: "Cerrar", soloUno: true,
      extra: `<button class="e-btn e-btn-salida chico-e" type="button" data-rep-pdf>${ico("file", 15)}PDF</button><button class="e-btn e-btn-salida chico-e" type="button" data-rep-xls>${ico("sheet", 15)}Excel</button>`,
      cuerpo: `<div class="fin-flujo"><div><small>Ingresos</small><b class="e-cifra fin-mas">${esc(Q(r.ti))}</b></div><div><small>Gastos</small><b class="e-cifra">${esc(Q(r.tg))}</b></div><div><small>${etRes}</small><b class="e-cifra ${r.res < 0 ? "falta" : ""}">${esc(Q(r.res))}</b></div><div><small>Movimientos</small><b>${r.n}</b></div></div>
        <h3 class="fin-sub">Gastos por categoría</h3>${tabla(r.gas, r.tg)}<h3 class="fin-sub">Ingresos por categoría</h3>${tabla(r.ing, r.ti)}
        ${r.prest ? `<p class="suave" style="font-size:13px;margin:0">Préstamos recibidos: ${esc(Q(r.prest))}. No se cuentan como ingreso porque se tienen que devolver.</p>` : ""}
        <p class="suave" style="font-size:12.5px;margin:0">No incluye lo pasado entre cuentas ni lo anulado. Lo que está en dólares se suma en quetzales a ${esc(Q(f.cambio))}.</p>`,
      alAbrir: (fm, m2) => m2.addEventListener("click", async ev => {
        if (ev.target.closest("[data-rep-pdf]")) { try { aviso("Armando el PDF…"); const b = await window.EMT_PDF.reporteFinanzas({ ...r, ambito, etRes, emp: await D.empresa() }); window.EMT_PDF.mostrar(b, `Finanzas ${ambito === "empresa" ? "EMTECSA" : "personales"} - ${r.titulo}.pdf`); } catch (err) { aviso("No se pudo armar el PDF.", "mal"); } }
        if (ev.target.closest("[data-rep-xls]")) {
          try {
            aviso("Armando el Excel…");
            const ExcelJS = await libExcel(), wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet("Resumen"); ws.columns = [{ width: 36 }, { width: 18 }, { width: 10 }];
            ws.addRow([`${ambito === "empresa" ? "Finanzas de la empresa" : "Finanzas personales"} · ${r.titulo}`]).font = { bold: true, size: 13 }; ws.addRow([]);
            [["Ingresos", r.ti], ["Gastos", r.tg], [etRes, r.res]].forEach(x => { const rw = ws.addRow(x); rw.getCell(2).numFmt = '"Q" #,##0.00'; });
            ws.addRow([]); ws.addRow(["Gastos por categoría", "Monto", "%"]).font = { bold: true };
            r.gas.forEach(x => { const rw = ws.addRow([x.n, x.v, r.tg ? x.v / r.tg : 0]); rw.getCell(2).numFmt = '"Q" #,##0.00'; rw.getCell(3).numFmt = "0%"; });
            ws.addRow([]); ws.addRow(["Ingresos por categoría", "Monto", "%"]).font = { bold: true };
            r.ing.forEach(x => { const rw = ws.addRow([x.n, x.v, r.ti ? x.v / r.ti : 0]); rw.getCell(2).numFmt = '"Q" #,##0.00'; rw.getCell(3).numFmt = "0%"; });
            const [tipoP, val] = periodo.split(":"), porId2 = Object.fromEntries(f.cuentas.map(c => [c.id, c])), cat = Object.fromEntries(f.categorias.map(c => [c.id, c.nombre]));
            const wm = wb.addWorksheet("Movimientos"); wm.columns = [{ header: "Fecha", width: 12 }, { header: "Tipo", width: 14 }, { header: "Cuenta", width: 22 }, { header: "Categoría", width: 24 }, { header: "Descripción", width: 40 }, { header: "Referencia", width: 16 }, { header: "Monto", width: 14 }, { header: "Moneda", width: 9 }];
            wm.getRow(1).font = { bold: true };
            f.movimientos.filter(m => !m.anulado && (tipoP === "mes" ? String(m.fecha).slice(0, 7) === val : String(m.fecha).slice(0, 4) === val)).slice().reverse().forEach(m => { const c = porId2[m.cuenta_id] || {}; const rw = wm.addRow([m.fecha, { ingreso: "Ingreso", gasto: "Gasto", transferencia: "Entre cuentas" }[m.tipo], c.nombre || "", cat[m.categoria_id] || "", m.descripcion || "", m.referencia || "", m.monto, c.moneda === "USD" ? "US$" : "Q"]); rw.getCell(7).numFmt = "#,##0.00"; });
            const u = URL.createObjectURL(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
            const a = document.createElement("a"); a.href = u; a.download = `Finanzas ${ambito === "empresa" ? "EMTECSA" : "personales"} - ${r.titulo}.xlsx`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
          } catch (err) { aviso(err.message || "No se pudo armar el Excel.", "mal"); }
        }
      }),
      alGuardar: async () => cerrarCapas()
    });
    mm.classList.add("modal-ancho");
  }

  function pagar(ambito, c, f, recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico } = A();
    const cuentas = f.cuentas.filter(x => x.activo !== false);
    if (!cuentas.length) { aviso("Primero agregue una cuenta.", "mal"); return; }
    let archivo = null;
    modal({
      titulo: `Pagar ${c.nombre}`, guardarTxt: "Anotar el pago",
      cuerpo: `<p class="suave" style="font-size:13.5px;margin:0">${esc(c.a_quien || "")}${c.a_quien ? " · " : ""}${esc(venceTxt(c.proximo))} (${esc(fCorta(c.proximo))})${c.tipo === "fijo" ? ` · el próximo queda para el ${esc(fCorta(siguienteTxt(c)))}` : ""}</p>
        <div class="f-fila">${campoMonto("monto", "Monto pagado", c.monto)}<label class="f-campo">Fecha<input type="date" name="fecha" value="${hoy()}" max="${hoy()}"></label></div>
        <label class="f-campo">Sale de la cuenta<select name="cuenta">${cuentas.map(x => `<option value="${x.id}" ${x.id === c.cuenta_id ? "selected" : ""}>${esc(x.nombre)}${x.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
        <label class="f-campo">Referencia<input name="ref" autocomplete="off" placeholder="No. de boleta, cheque o transferencia"></label>
        <div class="f-campo"><span>Recibo <small class="suave">opcional</small></span><div class="ficha-fila"><span data-foto-est><small>Sin recibo</small></span><span class="acc"><label class="s-btn suave-b chico">${ico("plus", 14)}Foto<input type="file" accept="image/*,application/pdf" hidden data-foto></label></span></div></div>`,
      alAbrir: fm => { formatoAlSalir(fm); fm.addEventListener("change", ev => { if (ev.target.matches("[data-foto]") && ev.target.files[0]) { archivo = ev.target.files[0]; fm.querySelector("[data-foto-est]").innerHTML = `${ico("file", 15)}<b>${esc(archivo.name)}</b>`; } }); },
      alGuardar: async fm => { await D.pagarCompromiso(ambito, c, { monto: numero(fm.monto.value), fecha: fm.fecha.value, cuenta_id: fm.cuenta.value, referencia: fm.ref.value }, archivo); cerrarCapas(); aviso(c.tipo === "fijo" ? "Pago anotado. El próximo ya quedó en su fecha." : "Pago anotado."); await recargar(); }
    });
  }
  const siguienteTxt = c => { const [y, m, d] = c.proximo.split("-").map(Number); if (c.frecuencia === "semanal" || c.frecuencia === "quincenal") return new Date(Date.UTC(y, m - 1, d + (c.frecuencia === "semanal" ? 7 : 15))).toISOString().slice(0, 10); const k = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[c.frecuencia] || 1; const ult = new Date(Date.UTC(y, m - 1 + k + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, m - 1 + k, Math.min(d, ult))).toISOString().slice(0, 10); };

  async function editarPP(ambito, c0, f, recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico } = A();
    const c = c0 || { tipo: "fijo", frecuencia: "mensual", proximo: hoy(), aviso_dias: 3 };
    let tipo = c.tipo;
    const provs = ambito === "empresa" && D.proveedores ? ((await D.proveedores().catch(() => ({ proveedores: [] }))).proveedores || []) : [];
    const cats = f.categorias.filter(x => x.tipo === "gasto" && (x.activo !== false || x.id === c.categoria_id));
    const cuentas = f.cuentas.filter(x => x.activo !== false || x.id === c.cuenta_id);
    modal({
      titulo: c0 ? "Editar pago" : "Agregar a Por pagar",
      extra: c0 ? `<button class="s-btn suave-b" type="button" data-pp-fin>${ico("box", 15)}Ya no se paga</button>` : "",
      cuerpo: `<div class="seg ancho" role="group" aria-label="Cada cuánto">${[["fijo", "Se repite"], ["unico", "Una sola vez"]].map(([k, n]) => `<button type="button" data-ppt="${k}" aria-pressed="${tipo === k}">${n}</button>`).join("")}</div>
        <label class="f-campo">Qué se paga<input name="nombre" value="${esc(c.nombre || "")}" placeholder="${ambito === "personal" ? "Ej. Colegio de los niños" : "Ej. Alquiler de la bodega"}" autocomplete="off"></label>
        <label class="f-campo">A quién<input name="a_quien" list="pp-provs" value="${esc(c.a_quien || "")}" autocomplete="off"></label>${provs.length ? `<datalist id="pp-provs">${provs.map(p => `<option value="${esc(p.nombre)}">`).join("")}</datalist>` : ""}
        <div class="f-fila">${campoMonto("monto", "Monto", c.monto)}<label class="f-campo"><span data-et-fecha>${tipo === "unico" ? "Vence el" : "Próximo pago"}</span><input type="date" name="proximo" value="${esc(c.proximo || hoy())}"></label></div>
        <label class="f-check"><input type="checkbox" name="variable" ${c.variable ? "checked" : ""}><span>El monto cambia cada vez (luz, agua, teléfono…)</span></label>
        <div class="f-fila"><label class="f-campo" data-frec ${tipo === "unico" ? "hidden" : ""}>Cada cuánto<select name="frecuencia">${Object.entries(D.FIN_FRECUENCIAS).map(([k, n]) => `<option value="${k}" ${c.frecuencia === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="f-campo">Avisar antes<select name="aviso">${[0, 1, 2, 3, 5, 7, 10, 15].map(n => `<option value="${n}" ${Number(c.aviso_dias) === n ? "selected" : ""}>${n === 0 ? "El mismo día" : n === 1 ? "1 día antes" : n + " días antes"}</option>`).join("")}</select></label></div>
        <div class="f-fila"><label class="f-campo">Categoría<select name="categoria"><option value="">Sin categoría</option>${cats.map(x => `<option value="${x.id}" ${x.id === c.categoria_id ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}</select></label>
        <label class="f-campo">Se paga de<select name="cuenta"><option value="">Escoger al pagar</option>${cuentas.map(x => `<option value="${x.id}" ${x.id === c.cuenta_id ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}</select></label></div>
        <label class="f-campo">Notas<input name="notas" value="${esc(c.notas || "")}" autocomplete="off"></label>`,
      alAbrir: (fm, mm) => {
        formatoAlSalir(fm);
        mm.addEventListener("click", async ev => {
          const b = ev.target.closest("[data-ppt]"); if (b) { tipo = b.dataset.ppt; mm.querySelectorAll("[data-ppt]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); fm.querySelector("[data-frec]").hidden = tipo === "unico"; fm.querySelector("[data-et-fecha]").textContent = tipo === "unico" ? "Vence el" : "Próximo pago"; return; }
          if (ev.target.closest("[data-pp-fin]")) { try { await D.guardarCompromiso(ambito, { ...c0, activo: false }); cerrarCapas(); aviso("Quitado de Por pagar. Los pagos ya anotados se quedan."); await recargar(); } catch (err) { aviso(err.message, "mal"); } }
        });
      },
      alGuardar: async fm => {
        await D.guardarCompromiso(ambito, { ...c0, tipo, nombre: fm.nombre.value, a_quien: fm.a_quien.value, monto: numero(fm.monto.value), variable: fm.variable.checked, frecuencia: fm.frecuencia.value, proximo: fm.proximo.value, aviso_dias: fm.aviso.value, categoria_id: fm.categoria.value, cuenta_id: fm.cuenta.value, notas: fm.notas.value });
        cerrarCapas(); aviso(c0 ? "Guardado." : "Agregado a Por pagar."); await recargar();
      }
    });
  }

  async function retiro(recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso } = A();
    const [ce, cp] = await Promise.all([D.cuentasFin("empresa"), D.cuentasFin("personal")]);
    const ceOk = ce.filter(c => c.tipo !== "tarjeta"), cpOk = cp.filter(c => c.tipo !== "tarjeta");
    if (!ceOk.length || !cpOk.length) { modal({ titulo: "Falta una cuenta", guardarTxt: "Entendido", soloUno: true, cuerpo: `<p class="suave" style="font-size:15px">Para sacar dinero de la empresa hace falta ${!ceOk.length ? "una cuenta de la empresa (Finanzas › Empresa)" : ""}${!ceOk.length && !cpOk.length ? " y " : ""}${!cpOk.length ? "una cuenta personal (Finanzas › Personal)" : ""}.</p>`, alGuardar: async () => cerrarCapas() }); return; }
    const TIPOS_R = [["sueldo", "Sueldo", "Planilla y sueldos", "Sueldo"], ["retiro", "Retiro de ganancias", "Retiros del dueño", "Retiro de la empresa"], ["prestamo", "Préstamo de la empresa", "Retiros del dueño", "Retiro de la empresa"]];
    let tr = "retiro";
    const porId = Object.fromEntries([...ce, ...cp].map(c => [c.id, c]));
    modal({
      titulo: "Sacar de la empresa para mí", guardarTxt: "Anotar en los dos lados",
      cuerpo: `<p class="suave" style="font-size:13.5px;margin:0">Se anota una sola vez: sale de la cuenta de la empresa y entra a su cuenta personal. Cada lado queda en su lugar.</p>
        <div class="seg ancho" role="group" aria-label="Qué es">${TIPOS_R.map(([k, n]) => `<button type="button" data-tr="${k}" aria-pressed="${tr === k}">${n}</button>`).join("")}</div>
        <div class="f-fila">${campoMonto("monto", "Monto", null)}<label class="f-campo">Fecha<input type="date" name="fecha" value="${hoy()}" max="${hoy()}"></label></div>
        <label class="f-campo">Sale de la empresa<select name="de">${ceOk.map(c => `<option value="${c.id}">${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
        <label class="f-campo">Entra a su cuenta<select name="a">${cpOk.map(c => `<option value="${c.id}">${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
        <div data-r-cambio hidden>${campoMonto("monto_a", "Lo que entra a su cuenta", null, "Las dos cuentas tienen distinta moneda.")}</div>
        <label class="f-campo">Nota<input name="nota" autocomplete="off" placeholder="Ej. Sueldo de noviembre"></label>`,
      alAbrir: (fm, mm) => {
        formatoAlSalir(fm);
        const mon = () => { const a = porId[Number(fm.de.value)], b = porId[Number(fm.a.value)]; fm.querySelector("[data-r-cambio]").hidden = !(a && b && a.moneda !== b.moneda); };
        fm.addEventListener("change", mon); mon();
        mm.addEventListener("click", ev => { const b = ev.target.closest("[data-tr]"); if (!b) return; tr = b.dataset.tr; mm.querySelectorAll("[data-tr]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
      },
      alGuardar: async fm => {
        const t0 = TIPOS_R.find(x => x[0] === tr), monto = numero(fm.monto.value);
        if (!(monto > 0)) throw new Error("Escriba el monto.");
        const a = porId[Number(fm.de.value)], b = porId[Number(fm.a.value)];
        const montoA = a.moneda !== b.moneda ? numero(fm.monto_a.value) : monto;
        if (!(montoA > 0)) throw new Error("Escriba lo que entra a su cuenta.");
        const oid = "R-" + Date.now().toString(36), nota = fm.nota.value.trim(), fecha = fm.fecha.value;
        await D.ligarMovimiento({ ambito: "empresa", tipo: "gasto", cuenta_id: a.id, monto, fecha, categoria: t0[2], descripcion: `${t0[1]} del dueño${nota ? " · " + nota : ""}`, origen: "retiro", origen_id: oid });
        try { await D.ligarMovimiento({ ambito: "personal", tipo: "ingreso", cuenta_id: b.id, monto: montoA, fecha, categoria: t0[3], descripcion: `${t0[1]} de EMTECSA${nota ? " · " + nota : ""}`, origen: "retiro", origen_id: oid }); }
        catch (err) { await D.anularPorOrigen("retiro", oid, "No se pudo anotar en lo personal").catch(() => {}); throw err; }
        cerrarCapas(); aviso("Anotado en la empresa y en lo personal."); await recargar();
      }
    });
  }

  function editarCat(ambito, c0, recargar) {
    const { modal, esc, cerrarCapas, aviso, ico } = A();
    modal({
      titulo: c0.id ? "Editar categoría" : (c0.tipo === "ingreso" ? "Categoría de ingresos" : "Categoría de gastos"),
      extra: c0.id ? `<button class="s-btn suave-b" type="button" data-arch-cat>${ico("box", 15)}${c0.activo === false ? "Volver a activar" : "Archivar"}</button>` : "",
      cuerpo: `<label class="f-campo">Nombre<input name="nombre" value="${esc(c0.nombre || "")}" autocomplete="off"></label>`,
      alAbrir: (fm, m) => m.addEventListener("click", async ev => { if (!ev.target.closest("[data-arch-cat]")) return; try { await D.guardarCategoriaFin(ambito, { ...c0, activo: c0.activo === false }); cerrarCapas(); aviso(c0.activo === false ? "Categoría activada." : "Categoría archivada."); await recargar(); } catch (err) { aviso(err.message, "mal"); } }),
      alGuardar: async fm => { await D.guardarCategoriaFin(ambito, { ...c0, nombre: fm.nombre.value }); cerrarCapas(); aviso("Categoría guardada."); await recargar(); }
    });
  }

  function cambio(f, recargar) {
    const { modal, esc, cerrarCapas, aviso, numero } = A();
    modal({ titulo: "Tipo de cambio", cuerpo: `<label class="f-campo">Quetzales por cada dólar<span class="f-monto"><span>Q</span><input name="cambio" inputmode="decimal" value="${esc(f.cambio)}" autocomplete="off"></span><small>Se usa para sumar en quetzales las cuentas en dólares.</small></label>`,
      alGuardar: async fm => { await D.guardarTipoCambio(numero(fm.cambio.value)); cerrarCapas(); aviso("Tipo de cambio guardado."); await recargar(); } });
  }

  const ultimaCuenta = clave => { try { return localStorage.getItem("emtecsa.sistema.fin-" + clave) || ""; } catch (e) { return ""; } };
  const recordarCuenta = (clave, id) => { try { if (id) localStorage.setItem("emtecsa.sistema.fin-" + clave, String(id)); } catch (e) {} };
  function campoCuenta(cuentas, etiqueta, clave) {
    if (!cuentas || !cuentas.length) return "";
    const { esc } = A(), u = ultimaCuenta(clave), def = cuentas.some(c => String(c.id) === u) ? u : String(cuentas[0].id);
    return `<label class="f-campo">${etiqueta}<select name="fin_cuenta"><option value="">No anotar en Finanzas</option>${cuentas.map(c => `<option value="${c.id}" ${String(c.id) === def ? "selected" : ""}>${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select><small>Queda anotado en Finanzas › Empresa.</small></label>`;
  }
  async function ligar(f, clave, mov) {
    const id = f.fin_cuenta && f.fin_cuenta.value; if (!id) return false;
    recordarCuenta(clave, id);
    try { await D.ligarMovimiento({ ambito: "empresa", cuenta_id: Number(id), ...mov }); return true; }
    catch (err) { A().aviso("Quedó guardado, pero no se pudo anotar en Finanzas: " + err.message, "mal"); return false; }
  }

  return { vista, campoCuenta, ligar };
})();
