"use strict";
window.EMT_COMPRAS = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const SUB = [["compras", "Compras"], ["instalacion", "Instalación"], ["seguridad", "Seguridad"], ["entrega", "Entrega"]];
  const CHIP_E = { falta: "ambar", pedido: "azul", recibido: "verde" };
  const SIG = { falta: "pedido", pedido: "recibido" };
  let sub = "compras", filtroE = "", abiertos = new Set(), diaS = null;
  const hoyL = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const fCorta = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };

  async function tabObra(box, o, recargar) {
    const { esc, ico } = A();
    box.innerHTML = `<div class="seg sub-seg" role="tablist" aria-label="Tipo de checklist">${SUB.map(([k, n]) => `<button type="button" role="tab" data-subc="${k}" aria-selected="${sub === k}" aria-pressed="${sub === k}">${n}</button>`).join("")}</div><div class="ck" data-ck></div>`;
    const ck = box.querySelector("[data-ck]");
    const pintarSub = async () => {
      ck.onclic = null;
      if (sub === "compras") await pCompras(ck, o, pintarSub);
      else if (sub === "instalacion") await pInstalacion(ck, o, pintarSub);
      else await pChecklist(ck, o, sub, pintarSub);
      box.trasFiltro && box.trasFiltro();
    };
    const recargarSub = () => A().quieto(pintarSub);
    await pintarSub();
    box.onclic = async e => {
      const s = e.target.closest("[data-subc]");
      if (s) { sub = s.dataset.subc; box.querySelectorAll("[data-subc]").forEach(b => { const on = b === s; b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-selected", String(on)); }); await recargarSub(); return; }
      if (ck.onclic) await ck.onclic(e, recargarSub);
    };
    box.addEventListener("toggle", e => { const d = e.target.closest && e.target.closest("details[data-grupo]"); if (d) { if (d.open) abiertos.add(d.dataset.grupo); else abiertos.delete(d.dataset.grupo); } }, true);
    box.trasFiltro = () => {
      const q = (box.closest(".cuerpo")?.querySelector("[data-busca-pest]")?.value || "").trim();
      box.querySelectorAll("details[data-grupo]").forEach(d => {
        const vis = [...d.querySelectorAll(".lista > .fila")].some(f => !f.hidden);
        d.hidden = !!q && !vis;
        if (q && vis) d.open = true; else if (!q) d.open = abiertos.has(d.dataset.grupo);
      });
    };
  }

  async function pCompras(ck, o, repintar) {
    const { esc, ico, Q, cant, modal, cerrarCapas, aviso, campoMonto, formatoAlSalir, numero, montoTxt } = A();
    const p = A().sesion().perfil;
    const ed = D.puede(p, "editarCompras"), verCosto = D.puede(p, "verCosto");
    const cat = await D.catalogo();
    const [lineas, pv] = await Promise.all([D.compras(o, cat), D.proveedores()]);
    if (!lineas.length) { ck.innerHTML = `<div class="vacio chico"><p>${o.cotizacion_id ? "La cotización no tenía materiales." : "Esta obra no viene de una cotización."} Los materiales de la obra aparecen aquí para comprarlos.</p></div>`; return; }
    const cuenta = e => lineas.filter(x => x.estado === e).length;
    const vis = lineas.filter(x => !filtroE || x.estado === filtroE);
    const grupos = {};
    vis.forEach(x => { const k = x.proveedor_id || 0; (grupos[k] = grupos[k] || []).push(x); });
    const orden = Object.keys(grupos).map(Number).sort((a, b) => (a === 0) - (b === 0) || ((pv.proveedores.find(x => x.id === a) || {}).nombre || "").localeCompare((pv.proveedores.find(x => x.id === b) || {}).nombre || "", "es"));
    const estimado = lineas.reduce((a, x) => a + (x.precio_ref || 0) * x.cantidad, 0), pagado = lineas.filter(x => x.precio_real != null).reduce((a, x) => a + x.precio_real * x.cantidad, 0);
    ck.innerHTML = `
      <div class="ck-res" role="group" aria-label="Filtrar por estado">${[["falta", "Falta comprar"], ["pedido", "Pedido"], ["recibido", "Recibido"]].map(([k, n]) => `<button type="button" class="ck-n ${CHIP_E[k]}" data-filtro-e="${k}" aria-pressed="${filtroE === k}"><b>${cuenta(k)}</b><span>${n}</span></button>`).join("")}</div>
      ${filtroE ? `<p class="ck-filtro"><span>Viendo solo «${esc(D.ESTADOS_COMPRA[filtroE])}»</span><button class="s-link" type="button" data-filtro-e="">Ver todo</button></p>` : ""}
      ${orden.map(k => { const l = grupos[k], prov = pv.proveedores.find(x => x.id === k); const listos = l.filter(x => x.estado === "recibido").length; const g = "c" + k; return `
        <details class="grupo-ck" data-grupo="${g}" ${abiertos.has(g) ? "open" : ""}>
          <summary><span class="icono ${prov ? "laton" : "gris"} chico">${ico("cart", 15)}</span><span class="gk-t"><b>${esc(prov ? prov.nombre : "Sin proveedor")}</b><small>${listos} de ${l.length} recibidos${prov && prov.telefono ? " · " + esc(prov.telefono) : ""}</small></span><i class="mini-av"><span style="transform:scaleX(${l.length ? listos / l.length : 0})"></span></i><span class="chev">${ico("chev", 15, 2.2)}</span></summary>
          <div class="lista">${l.map(x => `<div class="fila ck-f" style="cursor:default"><span class="ck-txt"><b>${esc(x.material.descripcion)}</b><small>${esc(cant(x.cantidad))}${x.material.unidad ? " " + esc(x.material.unidad) : ""}${x.precio_real != null && verCosto ? " · pagado " + esc(Q(x.precio_real)) + " c/u" : ""}${x.estado === "pedido" && x.fecha_pedido ? " · pedido " + esc(fCorta(x.fecha_pedido)) : ""}${x.estado === "recibido" && x.fecha_recibido ? " · llegó " + esc(fCorta(x.fecha_recibido)) : ""}</small></span>
            <button class="chip-b est ${CHIP_E[x.estado]}" type="button" ${ed && SIG[x.estado] ? `data-avanzar="${x.material_id}" aria-label="${esc(x.material.descripcion)}: ${esc(D.ESTADOS_COMPRA[x.estado])}. Tocar para marcar ${esc(D.ESTADOS_COMPRA[SIG[x.estado]].toLowerCase())}"` : "disabled"}>${esc(D.ESTADOS_COMPRA[x.estado])}</button>
            ${ed ? `<button class="s-ib" type="button" aria-label="Editar la compra de ${esc(x.material.descripcion)}" data-ed-compra="${x.material_id}">${ico("pen", 15)}</button>` : "<span></span>"}</div>`).join("")}</div>
          <div class="gk-acc">${prov ? `<button class="e-btn e-btn-salida chico" type="button" data-pedido-pdf="${k}">${ico("download", 15)}Pedido en PDF</button>` : ""}${ed && l.some(x => x.estado === "falta") ? `<button class="s-btn suave-b chico" type="button" data-todo="${k}:pedido">Todo pedido</button>` : ""}${ed && l.some(x => x.estado === "pedido") ? `<button class="s-btn suave-b chico" type="button" data-todo="${k}:recibido">Todo recibido</button>` : ""}</div>
        </details>`; }).join("") || `<div class="vacio chico"><p>Nada en «${esc(D.ESTADOS_COMPRA[filtroE])}».</p></div>`}
      ${verCosto ? `<p class="ck-pie">Estimado ${esc(Q(estimado))}${pagado ? ` · pagado hasta hoy ${esc(Q(pagado))}` : ""}</p>` : ""}`;
    const editar = x => {
      const ops = pv.proveedores.map(pr => { const mp = x.opciones.find(y => y.proveedor_id === pr.id); return { pr, mp }; }).sort((a, b) => !!b.mp - !!a.mp);
      modal({
        titulo: "Compra del material",
        cuerpo: `<p class="suave" style="font-size:13.5px"><b style="color:var(--text)">${esc(x.material.descripcion)}</b> · ${esc(x.material.codigo)}${x.previsto ? ` · previsto ${esc(cant(x.previsto))}` : ""}</p>
          <div class="f-campo"><span>Estado</span><div class="seg ancho" role="group" aria-label="Estado">${Object.entries(D.ESTADOS_COMPRA).map(([k, n]) => `<button type="button" data-est="${k}" aria-pressed="${x.estado === k}">${n}</button>`).join("")}</div></div>
          <div class="f-fila"><label class="f-campo">Cantidad<input name="cantidad" inputmode="decimal" value="${esc(cant(x.cantidad))}" autocomplete="off"></label>
          <label class="f-campo">Proveedor<select name="prov"><option value="">Sin proveedor</option>${ops.map(({ pr, mp }) => `<option value="${pr.id}" ${x.proveedor_id === pr.id ? "selected" : ""}>${esc(pr.nombre)}${mp ? (mp.principal ? " · principal" : "") + (mp.precio != null && verCosto ? " · " + Q(mp.precio) : "") : ""}</option>`).join("")}</select></label></div>
          ${verCosto ? campoMonto("precio", "Precio que se pagó por unidad", x.precio_real, x.precio_ref != null ? `Precio de referencia: ${Q(x.precio_ref)}` : "") : ""}
          <label class="f-campo">Notas<input name="notas" value="${esc(x.notas || "")}" autocomplete="off" placeholder="Factura del proveedor, quién recogió…"></label>`,
        alAbrir: (f, m) => { formatoAlSalir(f); f._est = x.estado; m.addEventListener("click", ev => { const b = ev.target.closest("[data-est]"); if (!b) return; f._est = b.dataset.est; f.querySelectorAll("[data-est]").forEach(y => y.setAttribute("aria-pressed", String(y === b))); }); },
        alGuardar: async f => {
          const c = Number(String(f.cantidad.value).replace(/,/g, ""));
          await D.guardarCompras(o.id, [{ material_id: x.material_id, cantidad: isFinite(c) ? c : 0, proveedor_id: f.prov.value ? Number(f.prov.value) : null, estado: f._est, fecha_pedido: f._est === x.estado ? x.fecha_pedido : null, fecha_recibido: f._est === x.estado ? x.fecha_recibido : null, precio_real: verCosto ? numero(f.precio.value) : x.precio_real, notas: f.notas.value }]);
          cerrarCapas(); aviso("Compra guardada."); await repintarQuieto();
        }
      });
    };
    const repintarQuieto = () => A().quieto(repintar);
    const guardarVarios = async (l, estado) => { await D.guardarCompras(o.id, l.map(x => ({ ...x, estado, fecha_pedido: estado === "pedido" ? null : x.fecha_pedido, fecha_recibido: null }))); };
    ck.onclic = async e => {
      const fe = e.target.closest("[data-filtro-e]"); if (fe) { filtroE = filtroE === fe.dataset.filtroE ? "" : fe.dataset.filtroE; await repintarQuieto(); return; }
      const av = e.target.closest("[data-avanzar]");
      if (av) { const x = lineas.find(y => y.material_id === Number(av.dataset.avanzar)); try { await guardarVarios([x], SIG[x.estado]); aviso(`${x.material.descripcion}: ${D.ESTADOS_COMPRA[SIG[x.estado]].toLowerCase()}.`); await repintarQuieto(); } catch (err) { aviso(err.message, "mal"); } return; }
      const ec = e.target.closest("[data-ed-compra]"); if (ec) { editar(lineas.find(y => y.material_id === Number(ec.dataset.edCompra))); return; }
      const td = e.target.closest("[data-todo]");
      if (td) { const [k, est] = td.dataset.todo.split(":"); const desde = est === "pedido" ? "falta" : "pedido"; const l = (grupos[Number(k)] || []).filter(x => x.estado === desde); try { await guardarVarios(l, est); aviso(`${l.length} ${l.length === 1 ? "material quedó" : "materiales quedaron"} como ${D.ESTADOS_COMPRA[est].toLowerCase()}.`); await repintarQuieto(); } catch (err) { aviso(err.message, "mal"); } return; }
      const pp = e.target.closest("[data-pedido-pdf]");
      if (pp) {
        const k = Number(pp.dataset.pedidoPdf), prov = pv.proveedores.find(x => x.id === k);
        try {
          aviso("Armando el pedido…");
          const cli = await D.cliente(o.cliente_id);
          const b = await window.EMT_PDF.pedido({ prov, obra: o, cli, sitio: cli && cli.sitios.find(s => s.id === o.sitio_id), lineas: (grupos[k] || []).filter(x => x.estado !== "recibido"), emp: await D.empresa(), conPrecio: verCosto });
          window.EMT_PDF.mostrar(b, `Pedido ${o.numero} - ${prov.nombre.replace(/[\\/:*?"<>|]/g, "")}.pdf`);
        } catch (err) { aviso(/[áéíóúñ]/i.test(err.message) ? err.message : "No se pudo armar el pedido.", "mal"); }
      }
    };
  }

  async function pInstalacion(ck, o, repintar) {
    const { esc, ico, cant, modal, cerrarCapas, aviso } = A();
    const ed = D.puede(A().sesion().perfil, "editarInstalacion");
    const cat = await D.catalogo();
    let filas = await D.instalacion(o.id);
    if (!filas.length && o.cotizacion_id && ed) {
      const cot = await D.cotizacion(o.cotizacion_id);
      if (cot) {
        const k = D.calcularCotizacion(cot, cat);
        const grupos = k.partidas.filter(pp => pp.estructura && pp.incluida !== false).map(pp => ({ grupo: pp.descripcion + (pp.cantidad !== 1 ? " × " + cant(pp.cantidad) : ""), items: pp.mats.map(m => ({ material_id: m.material.id, cantidad: m.cantidad * pp.cantidad })) }));
        const sueltos = k.partidas.filter(pp => pp.material_id && pp.material && pp.incluida !== false);
        if (sueltos.length) grupos.push({ grupo: "Materiales sueltos", items: sueltos.map(pp => ({ material_id: pp.material_id, cantidad: pp.cantidad })) });
        if (grupos.length) { await D.agregarGrupos(o.id, grupos); filas = await D.instalacion(o.id); }
      }
    }
    const comprasL = await D.compras(o, cat);
    const estadoC = Object.fromEntries(comprasL.map(x => [x.material_id, x.estado]));
    const porMat = Object.fromEntries(cat.materiales.map(m => [m.id, m]));
    const grupos = [];
    filas.forEach(f => { let g = grupos.find(x => x.orden === f.grupo_orden); if (!g) grupos.push(g = { orden: f.grupo_orden, nombre: f.grupo, filas: [] }); g.filas.push(f); });
    const completas = grupos.filter(g => g.filas.every(f => f.instalado)).length;
    ck.innerHTML = `
      <div class="ck-sub"><span><b>${completas} de ${grupos.length}</b> ${grupos.length === 1 ? "estructura instalada" : "estructuras instaladas"}</span>${ed ? `<button class="s-btn suave-b chico" type="button" data-nuevo-grupo>${ico("plus", 14)}Agregar estructura</button>` : ""}</div>
      ${grupos.length ? grupos.map(g => { const n = g.filas.filter(f => f.instalado).length, todo = n === g.filas.length, gk = "i" + g.orden; return `
        <details class="grupo-ck ${todo ? "listo" : ""}" data-grupo="${gk}" ${abiertos.has(gk) ? "open" : ""}>
          <summary><span class="icono ${todo ? "verde" : "azul"} chico">${ico(todo ? "check" : "torre", 15)}</span><span class="gk-t"><b>${esc(g.nombre)}</b><small>${n} de ${g.filas.length} piezas instaladas</small></span><i class="mini-av"><span style="transform:scaleX(${g.filas.length ? n / g.filas.length : 0})"></span></i><span class="chev">${ico("chev", 15, 2.2)}</span></summary>
          <div class="lista">${g.filas.map(f => { const m = porMat[f.material_id], ec = estadoC[f.material_id] || "falta"; return `<div class="fila ck-f pieza" style="cursor:default"><button class="chk" type="button" ${ed ? "" : "disabled"} aria-pressed="${f.instalado}" aria-label="${f.instalado ? "Quitar instalado" : "Marcar instalado"}: ${esc(m ? m.descripcion : "Material")}" data-inst="${f.id}">${f.instalado ? ico("check", 15) : ""}</button>
            <span class="ck-txt"><b>${esc(m ? m.descripcion : "Material")}</b><small>${esc(cant(f.cantidad))}${m && m.unidad ? " " + esc(m.unidad) : ""}${f.instalado && f.fecha_instalado ? " · instalado " + esc(fCorta(f.fecha_instalado)) : ""}</small></span>
            ${f.instalado ? "<span></span>" : `<span class="chip ${CHIP_E[ec]} chico-c">${esc(D.ESTADOS_COMPRA[ec])}</span>`}</div>`; }).join("")}</div>
          ${ed ? `<div class="gk-acc">${!todo ? `<button class="s-btn suave-b chico" type="button" data-todo-inst="${g.orden}">${ico("check", 14)}Todo instalado</button>` : `<button class="s-btn suave-b chico" type="button" data-nada-inst="${g.orden}">Desmarcar todo</button>`}<button class="s-link" type="button" data-quitar-grupo="${g.orden}">Quitar estructura</button></div>` : ""}
        </details>`; }).join("") : `<div class="vacio chico"><p>${o.cotizacion_id ? "La cotización no tiene estructuras." : "Agregue las estructuras de esta obra para marcar lo que se va instalando."}</p></div>`}`;
    const quieto = () => A().quieto(repintar);
    ck.onclic = async e => {
      const ib = e.target.closest("[data-inst]");
      if (ib && !ib.disabled) { const f = filas.find(x => x.id === Number(ib.dataset.inst)); try { await D.marcarInstalado(o.id, [f.id], !f.instalado); await quieto(); } catch (err) { aviso(err.message, "mal"); } return; }
      const ti = e.target.closest("[data-todo-inst], [data-nada-inst]");
      if (ti) { const ord = Number(ti.dataset.todoInst ?? ti.dataset.nadaInst); try { await D.marcarInstalado(o.id, filas.filter(x => x.grupo_orden === ord).map(x => x.id), ti.dataset.todoInst != null); await quieto(); } catch (err) { aviso(err.message, "mal"); } return; }
      const qg = e.target.closest("[data-quitar-grupo]");
      if (qg) { const g = grupos.find(x => x.orden === Number(qg.dataset.quitarGrupo)); const m = modal({ titulo: "¿Quitar la estructura?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita «${esc(g.nombre)}» del checklist de instalación.</p>`, alGuardar: async () => { await D.quitarGrupo(o.id, g.orden); cerrarCapas(); aviso("Estructura quitada."); await quieto(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); return; }
      if (e.target.closest("[data-nuevo-grupo]")) {
        let elegida = null;
        modal({
          titulo: "Agregar estructura", guardarTxt: "Agregar",
          cuerpo: `<div class="f-agregar"><span class="f-busca">${ico("search", 15)}<input data-g-busca placeholder="Escriba estructura, kV o kVA" autocomplete="off" aria-label="Buscar estructura"></span><div class="f-res" data-g-res hidden></div></div>
            <p class="suave" data-g-sel style="font-size:14px">Escoja la estructura.</p>
            <label class="f-campo">Cantidad<input name="cantidad" inputmode="decimal" value="1" autocomplete="off"></label>`,
          alAbrir: (f, m) => {
            const busca = f.querySelector("[data-g-busca]"), res = f.querySelector("[data-g-res]");
            busca.addEventListener("input", () => { const q = A().normal(busca.value); if (!q) { res.hidden = true; return; } const l = cat.estructuras.filter(x => x.activo !== false && A().normal(x.nombre + " " + x.codigo + " " + x.voltaje_kv + " kv " + (x.kva || "")).includes(q)).slice(0, 8); res.hidden = false; res.innerHTML = l.length ? l.map(x => `<button type="button" data-g-add="${x.id}"><b>${esc(x.nombre)}</b><small>${esc(x.codigo)} · ${cant(x.voltaje_kv)} kV · ${x.materiales.length} piezas</small></button>`).join("") : `<p class="suave">Nada con «${esc(busca.value)}».</p>`; });
            m.addEventListener("click", ev => { const a = ev.target.closest("[data-g-add]"); if (!a) return; elegida = cat.estructuras.find(x => x.id === Number(a.dataset.gAdd)); res.hidden = true; busca.value = ""; f.querySelector("[data-g-sel]").innerHTML = `<b style="color:var(--text)">${esc(elegida.nombre)}</b> · ${elegida.materiales.length} piezas`; f.cantidad.focus(); f.cantidad.select(); });
          },
          alGuardar: async f => {
            if (!elegida) throw new Error("Busque y escoja la estructura.");
            const n = Number(String(f.cantidad.value).replace(/,/g, ""));
            if (!(n > 0)) throw new Error("La cantidad tiene que ser mayor que cero.");
            await D.agregarGrupos(o.id, [{ grupo: elegida.nombre + (n !== 1 ? " × " + cant(n) : ""), items: elegida.materiales.map(r => ({ material_id: r.material.id, cantidad: r.cantidad * n })) }]);
            cerrarCapas(); aviso("Estructura agregada."); await quieto();
          }
        });
      }
    };
  }

  async function pChecklist(ck, o, tipo, repintar) {
    const { esc, ico, modal, cerrarCapas, aviso } = A();
    const ed = D.puede(A().sesion().perfil, "editarInstalacion");
    const deDia = tipo === "seguridad", hoy = hoyL();
    if (deDia && (!diaS || diaS.obra !== o.id)) diaS = { obra: o.id, dia: hoy };
    const dia = deDia ? diaS.dia : null;
    const l = await D.checklist(o.id, tipo, dia);
    const res = deDia ? await D.resumenSeguridad(o.id) : {};
    const dias = Object.keys(res).sort().reverse().slice(0, 8);
    const n = l.filter(x => x.hecho).length;
    ck.innerHTML = `
      ${deDia ? `<div class="ck-dia"><label class="f-campo">Día de trabajo<input type="date" data-dia-seg value="${dia}" max="${hoy}"></label>${dias.length ? `<div class="ck-dias" role="group" aria-label="Días revisados">${dias.map(d => `<button type="button" class="chip-b est ${res[d].hechos === res[d].total ? "verde" : "ambar"}" data-dia-ir="${d}" aria-pressed="${d === dia}">${esc(d === hoy ? "Hoy" : fCorta(d))} · ${res[d].hechos}/${res[d].total}</button>`).join("")}</div>` : ""}</div>` : ""}
      ${deDia && !l.length ? `<div class="vacio chico"><p>Ese día no se revisó la seguridad.</p></div>` : `<div class="ck-sub"><span><b>${n} de ${l.length}</b> listos${deDia ? (dia === hoy ? " hoy" : " el " + esc(fCorta(dia))) : ""}</span>${ed ? `<button class="s-btn suave-b chico" type="button" data-nuevo-punto>${ico("plus", 14)}Agregar punto</button>` : ""}</div>
      ${l.length ? `<div class="lista">${l.map(x => `<div class="fila ck-f punto ${x.hecho ? "hecha" : ""}" style="cursor:default"><button class="chk" type="button" ${ed ? "" : "disabled"} aria-pressed="${x.hecho}" aria-label="${x.hecho ? "Desmarcar" : "Marcar"}: ${esc(x.texto)}" data-punto="${x.id}">${x.hecho ? ico("check", 15) : ""}</button>
        <span class="ck-txt"><b>${esc(x.texto)}</b>${x.hecho || x.nota ? `<small>${[x.hecho && x.fecha ? "listo " + esc(fCorta(x.fecha)) : "", x.nota ? esc(x.nota) : ""].filter(Boolean).join(" · ")}</small>` : ""}</span>
        ${ed && x.id > 0 ? `<button class="s-ib" type="button" aria-label="Editar: ${esc(x.texto)}" data-ed-punto="${x.id}">${ico("pen", 15)}</button>` : x.pendiente ? '<span class="chip ambar chico-c">Por subir</span>' : "<span></span>"}</div>`).join("")}</div>` : `<div class="vacio chico"><p>Sin puntos. Agréguelos con el botón o póngalos en Empresa para que cada obra los traiga.</p></div>`}`}`;
    const quieto = () => A().quieto(repintar);
    const editar = x => modal({
      titulo: x ? "Editar punto" : "Punto nuevo",
      quitar: x ? async () => { try { await D.quitarPunto(x.id); cerrarCapas(); aviso("Punto quitado."); await quieto(); } catch (err) { aviso(err.message, "mal"); } } : null,
      cuerpo: `<label class="f-campo">Punto<input name="texto" value="${esc(x ? x.texto : "")}" autocomplete="off"></label><label class="f-campo">Nota<input name="nota" value="${esc(x && x.nota || "")}" autocomplete="off" placeholder="Quién lo revisó, medida tomada…"></label>`,
      alGuardar: async f => { await D.guardarPunto(o.id, { ...(x || { tipo, hecho: false, dia }), texto: f.texto.value, nota: f.nota.value }); cerrarCapas(); aviso(x ? "Punto guardado." : "Punto agregado."); await quieto(); }
    });
    ck.onchange = async e => { if (e.target.matches("[data-dia-seg]") && e.target.value && diaS) { diaS.dia = e.target.value > hoy ? hoy : e.target.value; await quieto(); } };
    ck.onclic = async e => {
      const di = e.target.closest("[data-dia-ir]"); if (di && diaS) { diaS.dia = di.dataset.diaIr; await quieto(); return; }
      const pb = e.target.closest("[data-punto]");
      if (pb && !pb.disabled) { const x = l.find(y => y.id === Number(pb.dataset.punto)); try { await D.guardarPunto(o.id, { ...x, hecho: !x.hecho, fecha: null }); await quieto(); } catch (err) { aviso(err.message, "mal"); } return; }
      if (e.target.closest("[data-nuevo-punto]")) editar(null);
      const ep = e.target.closest("[data-ed-punto]"); if (ep) editar(l.find(y => y.id === Number(ep.dataset.edPunto)));
    };
  }

  return { tabObra };
})();
