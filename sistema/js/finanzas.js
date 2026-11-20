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
    const filaCuenta = c => `<div class="fila con-lapiz" style="cursor:default"><span class="icono ${c.tipo === "tarjeta" ? "ambar" : ambito === "personal" ? "mezcla" : "azul"}">${ico(ICONO_C[c.tipo] || "wallet", 18)}</span><span><b>${esc(c.nombre)}</b><small>${esc([D.FIN_TIPOS_CUENTA[c.tipo], c.banco, c.numero ? "··" + String(c.numero).slice(-4) : ""].filter(Boolean).join(" · "))}</small></span><span class="der"><b class="e-cifra ${c.saldo < 0 ? "falta" : ""}">${c.tipo === "tarjeta" && c.saldo < 0 ? "Debe " + esc(dinero(-c.saldo, c.moneda)) : esc(dinero(c.saldo, c.moneda))}</b>${c.moneda === "USD" ? `<small>≈ ${esc(Q(enQ(c)))}</small>` : ""}</span><button class="s-ib" type="button" aria-label="Editar ${esc(c.nombre)}" data-ed-cuenta="${c.id}">${ico("pen", 15)}</button></div>`;
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

  function editarMov(ambito, m0, f, recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ico, montoTxt } = A();
    const activas = f.cuentas.filter(c => c.activo !== false || (m0 && (c.id === m0.cuenta_id || c.id === m0.cuenta_destino_id)));
    const porId = Object.fromEntries(f.cuentas.map(c => [c.id, c]));
    let tipo = m0 ? m0.tipo : "gasto", archivo = null, catNueva = false;
    const auto = m0 && (m0.origen === "pago" || m0.origen === "gasto_obra"), ret = m0 && m0.origen === "retiro";
    const solo = m0 && (m0.anulado || auto || ret);
    const ultima = (est[ambito].cuenta && activas.find(c => String(c.id) === String(est[ambito].cuenta))) || activas[0];
    const cats = tp => f.categorias.filter(c => c.tipo === tp && (c.activo !== false || (m0 && c.id === m0.categoria_id)));
    const m = modal({
      titulo: m0 ? (solo ? "Movimiento anulado" : "Movimiento") : "Registrar movimiento", guardarTxt: solo ? "Cerrar" : "Guardar",
      extra: m0 && (!solo || (ret && !m0.anulado)) ? `<button class="s-btn suave-b" type="button" data-anular>${ico("trash", 15)}Anular</button>` : "",
      cuerpo: `<fieldset class="bloq" ${solo ? "disabled" : ""} style="border:0;padding:0;margin:0;display:grid;gap:14px">
        <div class="seg ancho" role="group" aria-label="Tipo de movimiento">${TIPOS_M.map(([k, n]) => `<button type="button" data-tm="${k}" aria-pressed="${tipo === k}">${n}</button>`).join("")}</div>
        <div class="f-fila">${campoMonto("monto", "Monto", m0 ? m0.monto : null)}<label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(m0 ? m0.fecha : hoy())}" max="${hoy()}"></label></div>
        <label class="f-campo"><span data-et-cuenta>Cuenta</span><select name="cuenta">${activas.map(c => `<option value="${c.id}" ${(m0 ? m0.cuenta_id : ultima && ultima.id) === c.id ? "selected" : ""}>${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
        <div data-solo-tr hidden><label class="f-campo">Pasa a la cuenta<select name="destino"><option value="">Escoja…</option>${activas.map(c => `<option value="${c.id}" ${m0 && m0.cuenta_destino_id === c.id ? "selected" : ""}>${esc(c.nombre)}${c.moneda === "USD" ? " (US$)" : ""}</option>`).join("")}</select></label>
          <div data-solo-cambio hidden>${campoMonto("destino_monto", "Lo que llega a esa cuenta", m0 ? m0.monto_destino : null, "Las dos cuentas tienen distinta moneda.")}</div></div>
        <div data-solo-cat><label class="f-campo">Categoría<select name="categoria"></select></label><label class="f-campo" data-cat-nueva hidden>Nombre de la categoría nueva<input name="cat_nueva" autocomplete="off"></label></div>
        <label class="f-campo">Descripción<input name="desc" value="${esc(m0 && m0.descripcion || "")}" placeholder="En qué o de quién" autocomplete="off"></label>
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
