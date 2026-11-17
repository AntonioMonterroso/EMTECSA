"use strict";
window.EMT_COBROS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  let buscaC = "";
  const PEST = [["", "Por cobrar"], ["pagos", "Pagos"], ["clientes", "Clientes"], ["fianzas", "Fianzas"]];
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const diasA = f => Math.round((new Date(f) - new Date(hoyISO())) / 864e5);
  const chipVenc = p => p.venc === "vencido" ? '<span class="chip ambar">Vencido</span>' : p.venc === "pronto" ? '<span class="chip azul">Vence pronto</span>' : '<span class="chip gris">Al día</span>';
  const estadoFianza = f => f.liberada ? ["gris", "Liberada"] : !f.vence ? ["gris", "Sin fecha"] : diasA(f.vence) < 0 ? ["ambar", "Vencida"] : diasA(f.vence) <= 30 ? ["azul", `Vence en ${diasA(f.vence)} días`] : ["verde", "Vigente"];

  async function vista(v, sub, sub2) {
    const { $, esc, ico, Q } = A();
    const p = A().sesion().perfil;
    if (!D.puede(p, "verCobros")) { v.innerHTML = `<div class="vacio"><h2>Sin acceso a cobros</h2><p>Esta parte la ven gerencia, administración y ventas.</p><a class="s-btn suave-b" href="#/hoy">Regresar a Hoy</a></div>`; return; }
    const r = await D.resumenCobros();
    const pestL = PEST.concat(D.puede(p, "verCosto") ? [["costos", "Costos"]] : []);
    const pest = pestL.some(([k]) => k === sub) ? sub : "";
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Cobros</h1><p class="desc">Lo que falta cobrar de cada obra, los pagos con su recibo, el estado de cuenta de cada cliente y las fianzas.</p></div></div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: los cobros se guardan en esta computadora y se suben a la base de EMTECSA cuando se conecte.</span></div>`}
        <div class="widgets">
          <a class="w" href="#/cobros"><span class="w-cab"><span class="icono laton">${ico("wallet", 18)}</span></span><span class="l">Por cobrar</span><b>${esc(Q(r.porCobrar))}</b><small>${r.pendientes.length} ${r.pendientes.length === 1 ? "cobro pendiente" : "cobros pendientes"}</small></a>
          <a class="w" href="#/cobros"><span class="w-cab"><span class="icono ambar">${ico("alerta", 18)}</span></span><span class="l">Vencido</span><b>${esc(Q(r.vencido))}</b>${r.vencido ? `<small class="aviso-t">${(n => n + (n === 1 ? " cobro vencido" : " cobros vencidos"))(r.pendientes.filter(x => x.venc === "vencido").length)}</small>` : "<small>Nada vencido</small>"}</a>
          <a class="w" href="#/cobros/pagos"><span class="w-cab"><span class="icono verde">${ico("check", 18)}</span></span><span class="l">Cobrado este mes</span><b>${esc(Q(r.cobradoMes))}</b><small>${(n => n + (n === 1 ? " pago" : " pagos"))(r.pagos.filter(x => !x.anulado && String(x.fecha).slice(0, 7) === hoyISO().slice(0, 7)).length)}</small></a>
        </div>
        <div class="herr"><nav class="seg pest-o" aria-label="Partes de cobros">${pestL.map(([k, n]) => `<a href="#/cobros${k ? "/" + k : ""}" ${pest === k ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
        <label class="busca-v"><span class="sr">Buscar</span>${ico("search", 16)}<input type="search" data-busca-cob placeholder="Buscar cliente, obra o recibo" value="${esc(buscaC)}" autocomplete="off"></label></div>
        <div data-cob></div>
      </div>`;
    const box = $("[data-cob]", v);
    const recargar = () => A().quieto(() => vista(v, sub, sub2));
    if (pest === "pagos") pPagos(box, r, recargar);
    else if (pest === "clientes") await pClientes(box, r, Number(sub2) || null);
    else if (pest === "fianzas") await pFianzas(box, r, recargar);
    else if (pest === "costos") await window.EMT_COSTOS.resumen(box);
    else pPorCobrar(box, r, recargar);
    const filtrarC = () => A().filtrar(box, ".lista > .fila, .tm-fila", buscaC);
    filtrarC();
    v.oninput = e => { if (e.target.matches("[data-busca-cob]")) { buscaC = e.target.value; filtrarC(); } };
    v.onclick = e => { if (box.onclic) box.onclic(e); };
  }

  function pPorCobrar(box, r, recargar) {
    const { esc, ico, Q } = A();
    const puede = D.puede(A().sesion().perfil, "registrarPago");
    box.innerHTML = r.pendientes.length ? `<div class="lista">${r.pendientes.map(p => `
      <div class="fila cobro" style="cursor:default"><span class="icono ${p.venc === "vencido" ? "ambar" : "laton"}">${ico("wallet", 18)}</span>
        <span><b>${esc(p.cliente ? p.cliente.nombre : "Cliente")}</b><small>${p.obra ? `<a href="#/obras/${p.obra.id}/cobros">${esc(p.obra.numero)}</a> · ` : ""}${esc(p.descripcion)}${p.vence ? " · vence " + esc(fCorta(p.vence)) : " · sin fecha"}${p.pagado ? ` · abonado ${esc(Q(p.pagado))}` : ""}</small></span>
        <span class="der"><b class="e-cifra">${esc(Q(p.saldo))}</b><small>${chipVenc(p)}</small></span>
        ${puede ? `<button class="s-btn suave-b chico" type="button" data-cobrar="${p.id}">Cobrar</button>` : "<span></span>"}</div>`).join("")}</div>`
      : `<div class="vacio"><span class="icono laton">${ico("wallet", 24)}</span><h2>No hay nada pendiente de cobrar</h2><p>Los cobros salen del plan de pagos de cada obra: abra la obra, pestaña «Cobros y gastos», y arme sus pagos (por ejemplo 60 % de anticipo y 40 % al entregar).</p><a class="s-btn suave-b" href="#/obras">Ver obras</a></div>`;
    box.onclic = e => { const b = e.target.closest("[data-cobrar]"); if (b) cobrar(r.pendientes.find(x => x.id === Number(b.dataset.cobrar)), recargar); };
  }

  async function cobrar(parte, recargar) {
    const { modal, esc, Q, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso } = A();
    modal({
      titulo: "Registrar pago", guardarTxt: "Registrar pago",
      cuerpo: `<div class="cli-elegido"><span><b>${esc(parte.cliente ? parte.cliente.nombre : "")}</b><small>${parte.obra ? esc(parte.obra.numero) + " · " : ""}${esc(parte.descripcion)} · saldo ${esc(Q(parte.saldo))}</small></span></div>
        <div class="f-fila">${campoMonto("monto", "Monto que pagó", parte.saldo)}<label class="f-campo">Fecha<input type="date" name="fecha" value="${hoyISO()}"></label></div>
        <div class="f-fila"><label class="f-campo">Forma de pago<select name="forma">${Object.entries(D.FORMAS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
        <label class="f-campo">Banco<input name="banco" autocomplete="off"></label></div>
        <label class="f-campo">Número de boleta, transferencia o cheque<input name="ref" autocomplete="off"></label>
        <label class="f-campo">Notas<input name="notas" autocomplete="off"></label>`,
      alAbrir: f => formatoAlSalir(f),
      alGuardar: async f => {
        const res = await D.registrarPago({ cliente_id: parte.cliente_id, obra_id: parte.obra_id, parte_id: parte.id, monto: numero(f.monto.value), fecha: f.fecha.value, forma: f.forma.value, banco: f.banco.value, referencia: f.ref.value, notas: f.notas.value, tope: parte.saldo });
        cerrarCapas(); aviso(`Pago registrado: recibo ${res.numero}.`);
        await recargar();
        ofrecerRecibo(res.id);
      }
    });
  }

  async function datosRecibo(pagoId) {
    const r = await D.resumenCobros();
    const pago = r.pagos.find(x => x.id === pagoId);
    const cli = await D.cliente(pago.cliente_id);
    const obra = pago.obra_id ? r.obras[pago.obra_id] : null;
    const parte = pago.parte_id ? r.partes.find(x => x.id === pago.parte_id) : null;
    const saldoObra = obra ? r.partes.filter(x => x.obra_id === obra.id).reduce((a, x) => a + x.saldo, 0) : null;
    return { pago, cli, obra, parte, saldoObra, emp: await D.empresa() };
  }
  function ofrecerRecibo(pagoId) {
    const { modal, ico, cerrarCapas } = A();
    modal({ titulo: "Recibo listo", guardarTxt: "Descargar recibo", extra: `<button class="s-btn suave-b" type="button" data-ver-rec>${ico("eye", 15)}Ver recibo</button>`,
      cuerpo: `<p class="suave" style="font-size:15px">El pago quedó registrado. ¿Quiere el recibo en PDF para mandárselo al cliente?</p>`,
      alAbrir: (f, m) => m.querySelector("[data-ver-rec]").addEventListener("click", () => abrirRecibo(pagoId, "ver")),
      alGuardar: async () => { await abrirRecibo(pagoId, "bajar"); cerrarCapas(); } });
  }
  async function abrirRecibo(pagoId, modo) {
    const { aviso } = A();
    try {
      aviso("Armando el recibo…");
      const d = await datosRecibo(pagoId);
      const b = await window.EMT_PDF.recibo(d);
      if (modo === "ver") window.EMT_PDF.ver(b); else window.EMT_PDF.descargar(b, `Recibo ${d.pago.numero} - ${d.cli ? d.cli.nombre.replace(/[\\/:*?"<>|]/g, "") : ""}.pdf`);
    } catch (err) { aviso(/[áéíóúñ]/i.test(err.message) ? err.message : "No se pudo armar el recibo. Intente otra vez.", "mal"); }
  }

  function pPagos(box, r, recargar) {
    const { esc, ico, Q, modal, cerrarCapas, aviso } = A();
    const puede = D.puede(A().sesion().perfil, "registrarPago");
    const cl = {}; Object.values(r.obras).forEach(o => { if (o.cliente) cl[o.cliente_id] = o.cliente; });
    const l = r.pagos.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.numero.localeCompare(a.numero));
    box.innerHTML = l.length ? `<div class="lista">${l.map(p => `
      <div class="fila cobro ${p.anulado ? "anulado" : ""}" style="cursor:default"><span class="icono ${p.anulado ? "gris" : "verde"}">${ico("file", 18)}</span>
        <span><b>${esc(p.numero)} · ${esc(cl[p.cliente_id] ? cl[p.cliente_id].nombre : "Cliente")}</b><small>${esc(fCorta(p.fecha))} · ${esc(D.FORMAS[p.forma])}${p.referencia ? " " + esc(p.referencia) : ""}${p.anulado ? " · anulado: " + esc(p.motivo_anulado || "") : ""}</small></span>
        <span class="der"><b class="e-cifra">${esc(Q(p.monto))}</b>${p.anulado ? '<small><span class="chip gris">Anulado</span></small>' : ""}</span>
        <span class="acc">${!p.anulado ? `<button class="s-ib" type="button" aria-label="Ver recibo ${esc(p.numero)}" data-rec="${p.id}">${ico("eye", 15)}</button>${puede ? `<button class="s-ib" type="button" aria-label="Abrir el recibo ${esc(p.numero)}" data-anular="${p.id}">${ico("pen", 15)}</button>` : ""}` : ""}</span></div>`).join("")}</div>`
      : `<div class="vacio chico"><p>Todavía no hay pagos registrados.</p></div>`;
    box.onclic = e => {
      const rb = e.target.closest("[data-rec]"); if (rb) abrirRecibo(Number(rb.dataset.rec), "ver");
      const an = e.target.closest("[data-anular]");
      if (an) {
        const p = l.find(x => x.id === Number(an.dataset.anular));
        const anular = () => { const m = modal({ titulo: `¿Anular el recibo ${p.numero}?`, guardarTxt: "Anular", cuerpo: `<p class="suave" style="font-size:14.5px">El recibo no se borra: queda anulado y el monto vuelve a quedar pendiente de cobro.</p><label class="f-campo">Motivo<input name="motivo" autocomplete="off"></label>`, alGuardar: async f => { await D.anularPago(p.id, f.motivo.value); cerrarCapas(); aviso("Recibo anulado."); await recargar(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); };
        modal({ titulo: `Recibo ${p.numero}`, guardarTxt: "Ver recibo", quitar: anular, quitarTxt: "Anular",
          cuerpo: `<div class="vm-prev"><div><span>Cliente</span><b>${esc(cl[p.cliente_id] ? cl[p.cliente_id].nombre : "")}</b></div><div><span>Fecha</span><b>${esc(fCorta(p.fecha))}</b></div><div class="g"><span>Monto</span><b>${esc(Q(p.monto))}</b></div><div><span>Forma de pago</span><b>${esc(D.FORMAS[p.forma])}${p.banco ? " · " + esc(p.banco) : ""}</b></div>${p.referencia ? `<div><span>Boleta o referencia</span><b>${esc(p.referencia)}</b></div>` : ""}${p.notas ? `<div><span>Notas</span><b>${esc(p.notas)}</b></div>` : ""}</div>
            <p class="suave" style="font-size:13px;margin:0">Un recibo no se cambia ni se borra. Si tiene un error, se anula y se registra el pago otra vez.</p>`,
          alGuardar: async () => { cerrarCapas(); await abrirRecibo(p.id, "ver"); } });
      }
    };
  }

  async function pClientes(box, r, clienteId) {
    const { esc, ico, Q } = A();
    if (clienteId) {
      const [cli, ec] = await Promise.all([D.cliente(clienteId), D.estadoCuenta(clienteId)]);
      box.innerHTML = `
        <a class="volver" href="#/cobros/clientes">${ico("chev", 16, 2.2)}Todos los clientes</a>
        <div class="sub"><h2>${esc(cli ? cli.nombre : "Cliente")}</h2><button class="e-btn e-btn-salida" type="button" data-ec-pdf>${ico("download", 16)}Estado de cuenta en PDF</button></div>
        <div class="datos-cli"><div><small>Cobros</small><span class="e-cifra">${esc(Q(ec.cargos))}</span></div><div><small>Pagado</small><span class="e-cifra">${esc(Q(ec.abonos))}</span></div><div><small>Saldo</small><span class="e-cifra"><b>${esc(Q(ec.saldo))}</b></span></div><div><small>Vencido</small><span class="e-cifra ${ec.vencido ? "falta" : ""}">${esc(Q(ec.vencido))}</span></div></div>
        ${ec.mov.length ? `<div class="tabla-m ec"><div class="tm-cab"><span>Fecha y concepto</span><span>Cobro</span><span>Pago</span><span>Saldo</span></div>${ec.mov.map(m => `<div class="tm-fila"><span><b>${esc(m.texto)}</b><small>${esc(fCorta(m.fecha) || "Sin fecha")}${m.venc === "vencido" ? ' · <span class="falta">vencido</span>' : ""}</small></span><span data-l="Cobro">${m.cargo ? esc(Q(m.cargo)) : ""}</span><span data-l="Pago">${m.abono ? esc(Q(m.abono)) : ""}</span><span data-l="Saldo"><b>${esc(Q(m.saldo))}</b></span></div>`).join("")}</div>` : `<div class="vacio chico"><p>Sin movimientos.</p></div>`}`;
      box.onclic = async e => {
        if (!e.target.closest("[data-ec-pdf]")) return;
        try { A().aviso("Armando el estado de cuenta…"); const b = await window.EMT_PDF.estadoCuenta({ cli, ec, emp: await D.empresa() }); window.EMT_PDF.descargar(b, `Estado de cuenta - ${cli.nombre.replace(/[\\/:*?"<>|]/g, "")}.pdf`); }
        catch (err) { A().aviso("No se pudo armar el estado de cuenta.", "mal"); }
      };
      return;
    }
    const ids = [...new Set([...r.partes.map(p => p.cliente_id), ...r.pagos.map(p => p.cliente_id)].filter(Boolean))];
    const filas = await Promise.all(ids.map(async id => ({ id, cli: await D.cliente(id), ec: await D.estadoCuenta(id) })));
    filas.sort((a, b) => b.ec.saldo - a.ec.saldo);
    box.innerHTML = filas.length ? `<div class="lista">${filas.map(x => `
      <a class="fila" href="#/cobros/clientes/${x.id}"><span class="icono azul">${ico("building", 18)}</span><span><b>${esc(x.cli ? x.cli.nombre : "Cliente")}</b><small>Cobros ${esc(Q(x.ec.cargos))} · pagado ${esc(Q(x.ec.abonos))}</small></span>
      <span class="der"><b class="e-cifra">${esc(Q(x.ec.saldo))}</b><small>${x.ec.vencido ? `<span class="chip ambar">Vencido ${esc(Q(x.ec.vencido))}</span>` : '<span class="chip verde">Al día</span>'}</small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`).join("")}</div>`
      : `<div class="vacio chico"><p>Todavía ningún cliente tiene cobros.</p></div>`;
    box.onclic = null;
  }

  async function pFianzas(box, r, recargar) {
    const { esc, ico, Q } = A();
    const puede = D.puede(A().sesion().perfil, "registrarPago");
    const cl = {}; for (const f of r.fianzas) if (!cl[f.cliente_id]) cl[f.cliente_id] = await D.cliente(f.cliente_id);
    const l = r.fianzas.slice().sort((a, b) => Number(a.liberada) - Number(b.liberada) || String(a.vence).localeCompare(String(b.vence)));
    box.innerHTML = `<div class="sub"><h2>Fianzas · ${l.length}</h2>${puede ? `<button class="s-btn suave-b" type="button" data-nueva-fz>${ico("plus", 15)}Agregar fianza</button>` : ""}</div>
      ${l.length ? `<div class="lista">${l.map(f => { const [c, t] = estadoFianza(f); return `
        <div class="fila cobro" style="cursor:default"><span class="icono ${c === "ambar" ? "ambar" : "marino"}">${ico("shield", 18)}</span><span><b>${esc(D.TIPOS_FIANZA[f.tipo])} · ${esc(cl[f.cliente_id] ? cl[f.cliente_id].nombre : "")}</b><small>${esc([f.aseguradora, f.numero ? "No. " + f.numero : "", f.obra_id && r.obras[f.obra_id] ? r.obras[f.obra_id].numero : "", f.vence ? "vence " + fCorta(f.vence) : ""].filter(Boolean).join(" · "))}</small></span>
        <span class="der"><b class="e-cifra">${esc(Q(f.monto))}</b><small><span class="chip ${c}">${esc(t)}</span></small></span>${puede ? `<button class="s-ib" type="button" aria-label="Editar fianza" data-ed-fz="${f.id}">${ico("pen", 15)}</button>` : "<span></span>"}</div>`; }).join("")}</div>` : `<div class="vacio chico"><p>No hay fianzas registradas. Agregue las que pida cada cliente para que el sistema avise antes de que venzan.</p></div>`}`;
    box.onclic = e => {
      if (e.target.closest("[data-nueva-fz]")) editarFianza(null, r, recargar);
      const b = e.target.closest("[data-ed-fz]"); if (b) editarFianza(l.find(x => x.id === Number(b.dataset.edFz)), r, recargar);
    };
  }

  async function editarFianza(f0, r, recargar) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso } = A();
    const clientes = await D.clientes();
    const obras = Object.values(r.obras);
    const actual = f0 ? clientes.find(c => c.id === f0.cliente_id) : null;
    modal({
      titulo: f0 ? "Editar fianza" : "Fianza nueva",
      cuerpo: `<label class="f-campo">Cliente<input name="cliente" list="lista-cli" value="${esc(actual ? actual.nombre : "")}" autocomplete="off" placeholder="Escriba para buscar"></label>
        <datalist id="lista-cli">${clientes.map(c => `<option value="${esc(c.nombre)}">`).join("")}</datalist>
        <label class="f-campo">Obra<select name="obra"><option value="">Sin obra</option>${obras.map(o => `<option value="${o.id}" ${f0 && f0.obra_id === o.id ? "selected" : ""}>${esc(o.numero)} · ${esc(o.cliente ? o.cliente.nombre : "")}</option>`).join("")}</select></label>
        <div class="f-fila"><label class="f-campo">Tipo<select name="tipo">${Object.entries(D.TIPOS_FIANZA).map(([k, n]) => `<option value="${k}" ${(f0 ? f0.tipo : "cumplimiento") === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>${campoMonto("monto", "Monto", f0 ? f0.monto : null)}</div>
        <div class="f-fila"><label class="f-campo">Aseguradora<input name="aseg" value="${esc(f0 && f0.aseguradora || "")}" autocomplete="off"></label><label class="f-campo">Número de póliza<input name="num" value="${esc(f0 && f0.numero || "")}" autocomplete="off"></label></div>
        <div class="f-fila"><label class="f-campo">Emitida<input type="date" name="emision" value="${esc(f0 && f0.emision || "")}"></label><label class="f-campo">Vence<input type="date" name="vence" value="${esc(f0 && f0.vence || "")}"></label></div>
        <label class="f-check"><input type="checkbox" name="liberada" ${f0 && f0.liberada ? "checked" : ""}><span>Ya fue liberada</span></label>`,
      alAbrir: f => formatoAlSalir(f),
      alGuardar: async f => {
        const obra = f.obra.value ? r.obras[Number(f.obra.value)] : null;
        const cli = clientes.find(c => c.nombre === f.cliente.value.trim()) || (obra ? { id: obra.cliente_id } : null);
        if (!cli) throw new Error("Escoja el cliente de la lista.");
        await D.guardarFianza({ id: f0 ? f0.id : null, cliente_id: cli.id, obra_id: obra ? obra.id : null, tipo: f.tipo.value, monto: numero(f.monto.value) || 0, aseguradora: f.aseg.value, numero: f.num.value, emision: f.emision.value, vence: f.vence.value, liberada: f.liberada.checked });
        cerrarCapas(); aviso("Fianza guardada."); await recargar();
      }
    });
  }

  async function tabObra(box, o, recargar) {
    const { esc, ico, Q, modal, cerrarCapas, aviso } = A();
    const p = A().sesion().perfil;
    const verC = D.puede(p, "verCobros"), edC = D.puede(p, "registrarPago"), verG = D.puede(p, "verGastos"), interno = D.puede(p, "verAumento");
    const r = await D.resumenCobros();
    const partes = r.partes.filter(x => x.obra_id === o.id).sort((a, b) => a.orden - b.orden);
    const pagos = r.pagos.filter(x => x.obra_id === o.id && !x.anulado);
    const gastos = r.gastos.filter(x => x.obra_id === o.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const cot = o.cotizacion_id ? await D.cotizacion(o.cotizacion_id) : null;
    const cat = await D.catalogo();
    const kc = cot ? D.calcularCotizacion(cot, cat) : null;
    const total = kc ? kc.total : partes.reduce((a, x) => a + x.monto, 0);
    const cobrado = pagos.reduce((a, x) => a + x.monto, 0), gastado = gastos.reduce((a, x) => a + x.monto, 0);
    let costoMat = null, sinIva = null;
    if (interno && kc) { costoMat = kc.costoMat; sinIva = kc.neto; }
    box.innerHTML = `
      ${verC ? `<div class="sub"><h2>Plan de pagos</h2>${edC ? `<button class="s-btn suave-b" type="button" data-plan>${ico("pen", 15)}${partes.length ? "Cambiar el plan" : "Armar el plan"}</button>` : ""}</div>
      ${partes.length ? `<div class="lista">${partes.map(x => `<div class="fila cobro" style="cursor:default"><span class="icono ${x.saldo <= 0 ? "verde" : x.venc === "vencido" ? "ambar" : "laton"}">${ico(x.saldo <= 0 ? "check" : "wallet", 18)}</span><span><b>${esc(x.descripcion)}${x.porcentaje != null ? ` · ${A().cant(x.porcentaje)} %` : ""}</b><small>${x.vence ? "vence " + esc(fCorta(x.vence)) : "sin fecha"}${x.pagado ? ` · pagado ${esc(Q(x.pagado))}` : ""}${x.pagado && x.saldo > 0 ? ` · falta ${esc(Q(x.saldo))}` : ""}</small></span><span class="der"><b class="e-cifra">${esc(Q(x.monto))}</b><small>${x.saldo <= 0 ? '<span class="chip verde">Pagado</span>' : chipVenc(x)}</small></span>${edC && x.saldo > 0 ? `<button class="s-btn suave-b chico" type="button" data-cobrar-o="${x.id}">Cobrar</button>` : "<span></span>"}</div>`).join("")}</div>`
        : `<div class="vacio chico"><p>Todavía no hay plan de pagos. ${cot ? `El total de la cotización es ${esc(Q(total))}.` : ""}</p></div>`}` : ""}
      ${verG ? `<div class="sub"><h2>Gastos de la obra · ${esc(Q(gastado))}</h2><button class="s-btn suave-b" type="button" data-gasto>${ico("plus", 15)}Agregar gasto</button></div>
      ${gastos.length ? `<div class="lista">${gastos.map(g => `<div class="fila cobro" style="cursor:default"><span class="icono gris">${ico("cart", 18)}</span><span><b>${esc(g.descripcion)}</b><small>${esc(D.TIPOS_GASTO[g.tipo])} · ${esc(fCorta(g.fecha))}</small></span><span class="der"><b class="e-cifra">${esc(Q(g.monto))}</b></span><span class="acc"><button class="s-ib" type="button" aria-label="Editar gasto" data-ed-gasto="${g.id}">${ico("pen", 15)}</button></span></div>`).join("")}</div>` : `<div class="vacio chico"><p>Sin gastos anotados: viáticos, combustible, grúa, subcontratos…</p></div>`}` : ""}
      ${interno ? `<div class="sub"><h2>Cómo va la obra</h2></div><div class="datos-cli"><div><small>Total con IVA</small><span class="e-cifra">${esc(Q(total))}</span></div><div><small>Cobrado</small><span class="e-cifra">${esc(Q(cobrado))}</span></div><div><small>Gastos</small><span class="e-cifra">${esc(Q(gastado))}</span></div><div><small>Queda (sin IVA)</small><span class="e-cifra"><b>${sinIva != null ? esc(Q(sinIva - costoMat - gastado)) : "—"}</b></span></div>
        <div class="ancho2"><small>Cómo se calcula</small><span class="suave" style="font-size:13px">${sinIva != null ? `Total sin IVA ${esc(Q(sinIva))} menos costo de materiales ${esc(Q(costoMat))} menos gastos ${esc(Q(gastado))}. Solo lo ve gerencia.` : "Necesita una cotización para calcularlo."}</span></div></div>` : ""}`;
    const editarGasto = g0 => modal({
      titulo: g0 ? "Editar gasto" : "Gasto de la obra",
      quitar: g0 ? () => { const m = modal({ titulo: "¿Quitar el gasto?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita «${esc(g0.descripcion)}» por ${esc(Q(g0.monto))}.</p>`, alGuardar: async () => { await D.quitarGasto(g0.id); cerrarCapas(); aviso("Gasto quitado."); await recargar(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
      cuerpo: `<label class="f-campo">En qué se gastó<input name="desc" value="${esc(g0 ? g0.descripcion : "")}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">Tipo<select name="tipo">${Object.entries(D.TIPOS_GASTO).map(([k, n]) => `<option value="${k}" ${(g0 ? g0.tipo : "otro") === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>${A().campoMonto("monto", "Monto", g0 ? g0.monto : null)}</div>
        <label class="f-campo">Fecha<input type="date" name="fecha" value="${esc(g0 ? g0.fecha : hoyISO())}"></label>`,
      alAbrir: f => A().formatoAlSalir(f),
      alGuardar: async f => { await D.guardarGasto({ id: g0 ? g0.id : null, obra_id: o.id, descripcion: f.desc.value, tipo: f.tipo.value, monto: A().numero(f.monto.value), fecha: f.fecha.value }); cerrarCapas(); aviso("Gasto guardado."); await recargar(); }
    });
    box.onclic = async e => {
      if (e.target.closest("[data-plan]")) armarPlan(o, partes, total, !!cot, recargar);
      const c = e.target.closest("[data-cobrar-o]"); if (c) cobrar({ ...partes.find(x => x.id === Number(c.dataset.cobrarO)), cliente: o.cliente || await D.cliente(o.cliente_id), cliente_id: o.cliente_id, obra: o }, recargar);
      if (e.target.closest("[data-gasto]")) editarGasto(null);
      const eg = e.target.closest("[data-ed-gasto]"); if (eg) editarGasto(gastos.find(x => x.id === Number(eg.dataset.edGasto)));
    };
  }

  function armarPlan(o, partes, total, deCot, recargar) {
    const { modal, esc, ico, Q, montoTxt, numero, cerrarCapas, aviso } = A();
    let base = total;
    let filas = partes.length ? partes.map(x => ({ id: x.id, descripcion: x.descripcion, porcentaje: x.porcentaje, monto: x.monto, vence: x.vence || "" }))
      : [{ descripcion: "Anticipo", porcentaje: 60, monto: Math.round(total * 60) / 100, vence: o.fecha_inicio || hoyISO() }, { descripcion: "Al entregar", porcentaje: 40, monto: Math.round(total * 40) / 100, vence: "" }];
    modal({
      titulo: "Plan de pagos", guardarTxt: "Guardar plan",
      cuerpo: `<label class="f-campo">Total a cobrar<span class="f-monto"><span>Q</span><input name="total" inputmode="decimal" value="${esc(montoTxt(base))}" ${deCot ? "readonly" : ""} autocomplete="off"></span><small>${deCot ? "Sale de la cotización, con IVA si lo lleva." : "Esta obra no tiene cotización: escriba el total."}</small></label>
        <div class="plan-filas" data-plan-filas></div>
        <button class="s-btn suave-b chico" type="button" data-plan-mas>${ico("plus", 14)}Agregar pago</button>
        <p class="suave" data-plan-suma style="font-size:13px"></p>`,
      alAbrir: (f, m) => {
        const caja = f.querySelector("[data-plan-filas]");
        const suma = () => { const s = filas.reduce((a, x) => a + (Number(x.monto) || 0), 0), pct = filas.reduce((a, x) => a + (Number(x.porcentaje) || 0), 0); const el = f.querySelector("[data-plan-suma]"); el.textContent = `Suma ${Q(s)} de ${Q(base)}${Math.abs(s - base) > 0.01 ? ` · ${s < base ? "faltan " + Q(base - s) : "sobran " + Q(s - base)}` : " · completo"}${pct ? ` · ${Math.round(pct * 100) / 100} %` : ""}`; el.style.color = Math.abs(s - base) > 0.01 ? "var(--aviso)" : ""; };
        const pintar = () => {
          caja.innerHTML = filas.map((x, i) => `<div class="plan-fila"><label class="f-campo">Pago<input data-pd="${i}" value="${esc(x.descripcion)}" autocomplete="off"></label><label class="f-campo">%<input data-pp="${i}" inputmode="decimal" value="${esc(x.porcentaje ?? "")}" autocomplete="off"></label><label class="f-campo">Monto<span class="f-monto"><span>Q</span><input data-pm="${i}" inputmode="decimal" value="${esc(montoTxt(x.monto))}" autocomplete="off"></span></label><label class="f-campo">Vence<input type="date" data-pv="${i}" value="${esc(x.vence || "")}"></label><button class="s-ib" type="button" aria-label="Quitar pago" data-pq="${i}">${ico("x", 14)}</button></div>`).join("");
          suma();
        };
        pintar();
        f.addEventListener("input", ev => {
          const t = ev.target;
          if (t.name === "total") { try { base = numero(t.value) || 0; } catch (er) { base = 0; } filas.forEach((x, i) => { if (x.porcentaje != null && x.porcentaje !== "") { x.monto = Math.round(base * x.porcentaje) / 100; const mi = caja.querySelector(`[data-pm="${i}"]`); if (mi) mi.value = montoTxt(x.monto); } }); suma(); }
          if (t.dataset.pd != null) filas[Number(t.dataset.pd)].descripcion = t.value;
          if (t.dataset.pp != null) { const i = Number(t.dataset.pp), n = Number(t.value.replace(/,/g, "")); filas[i].porcentaje = t.value.trim() === "" ? null : n; if (t.value.trim() !== "" && isFinite(n)) { filas[i].monto = Math.round(base * n) / 100; caja.querySelector(`[data-pm="${i}"]`).value = montoTxt(filas[i].monto); } suma(); }
          if (t.dataset.pm != null) { const i = Number(t.dataset.pm); try { filas[i].monto = numero(t.value) || 0; } catch (er) { filas[i].monto = 0; } filas[i].porcentaje = null; caja.querySelector(`[data-pp="${i}"]`).value = ""; suma(); }
          if (t.dataset.pv != null) filas[Number(t.dataset.pv)].vence = t.value;
        });
        m.addEventListener("click", ev => {
          if (ev.target.closest("[data-plan-mas]")) { filas.push({ descripcion: "", porcentaje: null, monto: 0, vence: "" }); pintar(); caja.querySelector(`[data-pd="${filas.length - 1}"]`)?.focus(); }
          const q = ev.target.closest("[data-pq]"); if (q) { filas.splice(Number(q.dataset.pq), 1); pintar(); }
        });
      },
      alGuardar: async () => { await D.guardarPlan(o.id, filas); cerrarCapas(); aviso("Plan de pagos guardado."); await recargar(); }
    });
  }

  return { vista, tabObra, estadoFianza, chipVenc };
})();
