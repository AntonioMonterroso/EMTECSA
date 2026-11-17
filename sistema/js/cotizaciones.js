"use strict";
window.EMT_COTIZACIONES = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const CHIP = { borrador: "gris", enviada: "azul", aprobada: "verde", rechazada: "ambar" };
  let estadoF = "", buscaQ = "";

  const fechaCorta = f => { const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }); };

  async function vista(v, sub) {
    const id = Number(sub);
    if (sub && id) return editor(v, id);
    return lista(v);
  }

  async function lista(v) {
    const { $, esc, ico, Q } = A();
    const p = A().sesion().perfil;
    const puede = D.puede(p, "editarCotizacion");
    const todas = await D.cotizaciones();
    const seg = D.puede(p, "verEnlaces") ? await D.resumenEnlaces().catch(() => ({})) : {};
    const segTxt = id => { const x = seg[id]; if (!x || x.aprobado) return ""; return x.vistas ? ` · la vio ${x.vistas === 1 ? "1 vez" : x.vistas + " veces"}` : " · enlace sin abrir"; };
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Cotizaciones</h1><p class="desc">Se escoge lo que se vende y el sistema arma el precio y la lista de materiales para comprar.</p></div>${puede ? `<button class="s-btn lleno" type="button" data-nueva-cot>${ico("plus", 16)}Nueva cotización</button>` : ""}</div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: las cotizaciones se guardan en esta computadora y se suben a la base de EMTECSA cuando se conecte.</span></div>`}
        <div class="herr">
          <div class="chips-f" role="group" aria-label="Estado">${[["", "Todas"], ...Object.entries(D.ESTADOS)].map(([k, n]) => `<button type="button" data-estado-f="${k}" aria-pressed="${estadoF === k}">${esc(k ? n.replace(/a$/, "as").replace(/r$/, "res") : n)}</button>`).join("")}</div>
          <label class="busca-v"><span class="sr">Buscar cotización</span>${ico("search", 16)}<input type="search" placeholder="Buscar por número, cliente o trabajo" value="${esc(buscaQ)}" data-busca-cot></label>
        </div>
        <div data-res-cot></div>
      </div>`;
    const res = $("[data-res-cot]", v);
    const pintar = () => {
      if (!todas.length) { res.innerHTML = `<div class="vacio"><span class="icono laton">${ico("file", 24)}</span><h2>Todavía no hay cotizaciones</h2><p>Escoja el cliente, agregue las estructuras con su cantidad y el sistema arma el precio y la lista de materiales.</p>${puede ? `<button class="s-btn lleno" type="button" data-nueva-cot>${ico("plus", 16)}Nueva cotización</button>` : ""}</div>`; return; }
      const q = buscaQ.toLowerCase().trim();
      const l = todas.filter(c => (!estadoF || c.estado === estadoF) && (!q || [c.numero, c.titulo, c.cliente && c.cliente.nombre].join(" ").toLowerCase().includes(q)));
      res.innerHTML = l.length ? `<div class="grupo-t">${l.length} ${l.length === 1 ? "cotización" : "cotizaciones"}</div><div class="lista">${l.map(c => `
        <a class="fila" href="#/cotizaciones/${c.id}"><span class="icono laton">${ico("file", 18)}</span><span><b>${esc(c.cliente ? c.cliente.nombre : "Cliente no encontrado")}</b><small>${esc(c.numero)}${c.titulo ? " · " + esc(c.titulo) : ""} · ${esc(fechaCorta(c.fecha))}${esc(segTxt(c.id))}</small></span>
        <span class="der"><span class="e-cifra">${esc(Q(c.total))}</span><small><span class="chip ${CHIP[c.estado]}">${esc(D.ESTADOS[c.estado])}</span></small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`).join("")}</div>`
        : `<div class="vacio"><h2>Nada con ese filtro</h2><p>Pruebe con otro número, cliente o estado.</p></div>`;
    };
    pintar();
    $("[data-busca-cot]", v).addEventListener("input", e => { buscaQ = e.target.value; pintar(); });
    v.onclick = e => {
      const t = e.target.closest("[data-estado-f]");
      if (t) { estadoF = t.dataset.estadoF; v.querySelectorAll("[data-estado-f]").forEach(b => b.setAttribute("aria-pressed", String(b === t))); pintar(); }
      if (e.target.closest("[data-nueva-cot]")) nueva();
    };
  }

  async function nueva(clienteId) {
    const { modal, esc, ico, cerrarCapas, aviso, ir } = A();
    const clientes = await D.clientes();
    if (!clientes.length) {
      modal({ titulo: "Primero un cliente", guardarTxt: "Agregar cliente", cuerpo: `<p class="suave" style="font-size:15px">Para cotizar hace falta al menos un cliente con su NIT.</p>`, alGuardar: async () => { cerrarCapas(); ir("clientes"); } });
      return;
    }
    let elegido = clienteId ? clientes.find(c => c.id === clienteId) : null;
    modal({
      titulo: "Nueva cotización",
      guardarTxt: "Crear cotización",
      cuerpo: `
        <div class="f-campo"><span>Cliente</span><div data-cli-elegido></div>
          <div data-cli-buscar><span class="f-busca">${ico("search", 15)}<input data-busca-cli-n placeholder="Buscar por nombre, NIT o teléfono" autocomplete="off" aria-label="Buscar cliente"></span><div class="f-res" data-res-cli-n></div></div></div>
        <div class="f-fila"><label class="f-campo">Sitio<select name="sitio" disabled><option value="">Escoja primero el cliente</option></select></label>
        <label class="f-campo">Contacto<select name="contacto" disabled><option value="">Escoja primero el cliente</option></select></label></div>
        <label class="f-campo">Trabajo<input name="titulo" autocomplete="off" placeholder="Por ejemplo: línea de media tensión y transformador 50 kVA"></label>`,
      alAbrir: async (f, m) => {
        const caja = f.querySelector("[data-cli-elegido]"), busc = f.querySelector("[data-cli-buscar]"), res = f.querySelector("[data-res-cli-n]"), inp = f.querySelector("[data-busca-cli-n]");
        const pintarRes = () => {
          const q = inp.value.toLowerCase().trim(), qt = inp.value.replace(/\D/g, "");
          const l = clientes.filter(c => !q || [c.nombre, c.razon_social, c.codigo].join(" ").toLowerCase().includes(q) || (q.length > 2 && D.normalNit(c.nit).includes(D.normalNit(inp.value))) || (qt.length > 3 && [c.telefono, ...c.contactos.map(k => k.telefono)].some(t => String(t || "").replace(/\D/g, "").includes(qt)))).slice(0, 6);
          res.innerHTML = l.length ? l.map(c => `<button type="button" data-cli-n="${c.id}"><b>${esc(c.nombre)}</b><small>NIT ${esc(D.nitBonito(c.nit))} · ${esc(D.TIPOS[c.tipo])}</small></button>`).join("") : `<p class="suave">Nadie con «${esc(inp.value)}».</p>`;
        };
        const elegir = async c => {
          elegido = c;
          caja.innerHTML = c ? `<div class="cli-elegido"><span><b>${esc(c.nombre)}</b><small>NIT ${esc(D.nitBonito(c.nit))}</small></span><button class="s-btn suave-b chico" type="button" data-cambiar-cli>Cambiar</button></div>` : "";
          busc.hidden = !!c;
          if (!c) { f.sitio.disabled = f.contacto.disabled = true; pintarRes(); inp.focus(); return; }
          const full = await D.cliente(c.id);
          f.sitio.disabled = f.contacto.disabled = false;
          f.sitio.innerHTML = `<option value="">${full.sitios.length ? "Sin sitio" : "El cliente no tiene sitios"}</option>` + full.sitios.map(s => `<option value="${s.id}">${esc(s.nombre)}</option>`).join("");
          if (full.sitios.length === 1) f.sitio.value = String(full.sitios[0].id);
          f.contacto.innerHTML = `<option value="">${full.contactos.length ? "Sin contacto" : "El cliente no tiene contactos"}</option>` + full.contactos.map(k => `<option value="${k.id}" ${k.principal ? "selected" : ""}>${esc(k.nombre)}${k.puesto ? " · " + esc(k.puesto) : ""}</option>`).join("");
          f.titulo.focus();
        };
        inp.addEventListener("input", pintarRes);
        inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); res.querySelector("[data-cli-n]")?.click(); } });
        m.addEventListener("click", e => {
          const b = e.target.closest("[data-cli-n]"); if (b) elegir(clientes.find(c => c.id === Number(b.dataset.cliN)));
          if (e.target.closest("[data-cambiar-cli]")) elegir(null);
        });
        pintarRes();
        if (elegido) await elegir(elegido); else inp.focus();
      },
      alGuardar: async f => {
        if (!elegido) throw new Error("Escoja el cliente.");
        const id = await D.crearCotizacion({ cliente_id: elegido.id, sitio_id: f.sitio.value ? Number(f.sitio.value) : null, contacto_id: f.contacto.value ? Number(f.contacto.value) : null, titulo: f.titulo.value });
        cerrarCapas(); aviso("Cotización creada."); ir("cotizaciones", id);
      }
    });
  }

  const plegados = new Map(); let plegCot = 0;
  async function editor(v, id) {
    const { $, $$, esc, ico, Q, cant, aviso, numero, montoTxt } = A();
    const p = A().sesion().perfil;
    const puede = D.puede(p, "editarCotizacion"), verAum = D.puede(p, "verAumento");
    const [orig, cat0] = await Promise.all([D.cotizacion(id), D.catalogo()]);
    const cat = await D.catalogoParaCotizacion(cat0, id);
    if (!orig) { v.innerHTML = `<div class="vacio"><h2>No se encontró esa cotización</h2><a class="s-btn suave-b" href="#/cotizaciones">Ver cotizaciones</a></div>`; return; }
    const cli = await D.cliente(orig.cliente_id);
    const obraId = await D.obraDeCotizacion(id);
    const puedeObra = D.puede(p, "editarObra");
    const c = JSON.parse(JSON.stringify(orig));
    let sucio = false;
    const fijo = () => c.estado !== "borrador" || !puede;
    const marcar = () => { sucio = true; const s = $("[data-estado-guardado]", v); if (s) { s.textContent = "Cambios sin guardar"; s.className = "guardado sin"; } };
    A().guardia({ limpio: () => !sucio, soltar: () => { sucio = false; } });

    if (plegCot !== c.id) { plegCot = c.id; plegados.clear(); }
    const ab = (k, def) => (plegados.has(k) ? plegados.get(k) : def) ? "open" : "";
    v.innerHTML = `
      <div class="cuerpo">
        <a class="volver" href="#/cotizaciones">${ico("chev", 16, 2.2)}Cotizaciones</a>
        <div class="cab-v">
          <div><span class="eti">${esc(c.numero)} · ${esc(fechaCorta(c.fecha))}</span><h1 class="t" data-h1>${esc(c.titulo || "Sin título")}</h1><p>${cli ? `<a href="#/clientes/${cli.id}">${esc(cli.nombre)}</a> · NIT ${esc(D.nitBonito(cli.nit))}` : "Cliente no encontrado"}</p></div>
          ${obraId ? `<a class="s-btn suave-b" href="#/obras/${obraId}">${ico("hammer", 15)}Ver la obra</a>` : orig.estado === "aprobada" && puedeObra ? `<button class="s-btn suave-b" type="button" data-crear-obra>${ico("hammer", 15)}Crear obra</button>` : ""}
        </div>
        <div class="pasos-cot" data-pasos></div>
        <div data-enlace></div>
        <div data-seg></div>
        <div class="nota-fija" data-nota-fija hidden>${ico("shield", 18)}<span></span></div>
        <div class="cot">
          <div class="cot-izq">
            <fieldset class="bloq" data-bloq>
            <details class="caja plegable" data-pl="datos" ${ab("datos", !c.titulo && !c.partidas.length)}><summary><span class="pl-t"><h2>Datos</h2><span class="suave" data-res-datos></span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
              <label class="f-campo">Trabajo<input data-c="titulo" value="${esc(c.titulo || "")}" autocomplete="off" placeholder="Por ejemplo: línea de media tensión y transformador 50 kVA"></label>
              <div class="f-fila"><label class="f-campo">Sitio<select data-c="sitio_id"><option value="">Sin sitio</option>${(cli ? cli.sitios : []).map(s => `<option value="${s.id}" ${c.sitio_id === s.id ? "selected" : ""}>${esc(s.nombre)}</option>`).join("")}</select></label>
              <label class="f-campo">Contacto<select data-c="contacto_id"><option value="">Sin contacto</option>${(cli ? cli.contactos : []).map(k => `<option value="${k.id}" ${c.contacto_id === k.id ? "selected" : ""}>${esc(k.nombre)}</option>`).join("")}</select></label></div>
              <div class="f-fila"><label class="f-campo">Fecha<input type="date" data-c="fecha" value="${esc(String(c.fecha).slice(0, 10))}"></label>
              <label class="f-campo">Vigencia (días)<input inputmode="numeric" data-c="vigencia_dias" value="${esc(c.vigencia_dias)}" autocomplete="off"></label></div>
              <label class="f-campo">Notas para el cliente<textarea data-c="notas" rows="2" placeholder="Tiempo de entrega, forma de pago, lo que no incluye…">${esc(c.notas || "")}</textarea></label>
            </div></details>
            <section class="caja">
              <div class="caja-cab"><h2>Lo que se cotiza</h2><span class="suave" data-n-part></span>${puede ? `<button class="s-btn suave-b chico" type="button" data-opciones>${ico("layers", 14)}Opciones y extras</button>` : ""}</div>
              <div class="partidas" data-partidas></div>
              <div class="f-agregar"><label class="agregar-a" data-agregar-a-l hidden><span>Agregar a</span><select data-agregar-a></select></label><span class="f-busca">${ico("search", 15)}<input data-busca-est placeholder="Agregar: escriba estructura, kV o kVA" autocomplete="off" aria-label="Agregar estructura"></span><div class="f-res" data-res-est hidden></div></div>
            </section>
            <details class="caja plegable" data-pl="cargos" ${ab("cargos", false)}><summary><span class="pl-t"><h2>Transporte y equipo</h2><span class="suave" data-res-cargos></span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
              <div class="cargos" data-cargos></div>
              <button class="s-btn suave-b chico" type="button" data-nuevo-cargo>${ico("plus", 14)}Agregar transporte o equipo</button>
            </div></details>
            <details class="caja plegable" data-pl="pdf" ${ab("pdf", false)}><summary><span class="pl-t"><h2>Propuesta en PDF</h2><span class="suave" data-res-pdf></span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
              <div class="f-campo"><span>Foto de la portada</span><div class="fotos-p" role="radiogroup" aria-label="Foto de la portada">${window.EMT_PDF.FOTOS.map(([id, n]) => `<label class="foto-p"><input type="radio" name="foto" value="${id}" data-foto ${(c.foto || "torre-luna-2") === id ? "checked" : ""}><img src="../img/${id}.jpg" alt="" loading="lazy"><span>${esc(n)}</span></label>`).join("")}</div></div>
              <div class="f-fila"><label class="f-campo">El trabajo incluye<textarea data-c="alcance_incluye" rows="4" placeholder="Uno por línea">${esc(c.alcance_incluye || "")}</textarea></label>
              <label class="f-campo">No incluye<textarea data-c="alcance_excluye" rows="4" placeholder="Uno por línea">${esc(c.alcance_excluye || "")}</textarea></label></div>
              <label class="f-campo">Forma de pago<textarea data-cond="forma_pago" rows="2">${esc((c.condiciones || {}).forma_pago || "")}</textarea></label>
              <div class="f-fila"><label class="f-campo">Tiempo de entrega<textarea data-cond="tiempo_entrega" rows="2">${esc((c.condiciones || {}).tiempo_entrega || "")}</textarea></label>
              <label class="f-campo">Garantía<textarea data-cond="garantia" rows="2">${esc((c.condiciones || {}).garantia || "")}</textarea></label></div>
            </div></details>
            </fieldset>
            <details class="caja plegable" data-pl="expediente" ${ab("expediente", false)}><summary><span class="pl-t"><h2>Expediente</h2><span class="suave" data-res-exp>Todo en un solo PDF</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-exp></div></details>
            <details class="caja plegable" data-pl="energuate" ${ab("energuate", false)}><summary><span class="pl-t"><h2>Datos para Energuate</h2><span class="suave" data-res-eg>DPI y terrenos del cliente</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-eg-cot></div></details>
            <details class="caja plegable" data-pl="plano" ${ab("plano", false)}><summary><span class="pl-t"><h2>Plano</h2><span class="suave" data-res-plano>Simbología de Energuate</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div data-plano-mini></div><div class="cnt-cot" data-cnt-cot></div><div class="fila-b"><a class="s-btn suave-b" href="#/plano/cot/${c.id}">${ico("pen", 15)}Abrir el plano</a></div></div></details>
            ${verAum ? `<details class="caja plegable" data-pp-caja data-pl="piezas" ${ab("piezas", false)}><summary><span class="pl-t"><h2>Precio por pieza</h2><span class="suave" data-res-piezas></span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
              <p class="suave" style="font-size:13.5px;margin:0">Lo que costó cada pieza, lo que se le dice al cliente y lo que se gana. Con el lápiz cambia el precio solo en esta cotización; el catálogo no cambia.</p>
              <label class="busca-v ancho-busca"><span class="sr">Buscar pieza</span>${ico("search", 16)}<input type="search" data-pp-busca placeholder="Buscar material o código" autocomplete="off"></label>
              <div data-pp></div>
            </div></details>` : ""}
            <details class="caja mats-cot" data-mats>
              <summary><h2>Lista de materiales para comprar</h2><span class="suave" data-n-mats></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary>
              <label class="busca-v ancho-busca"><span class="sr">Buscar en la lista</span>${ico("search", 16)}<input type="search" data-lm-busca placeholder="Buscar material o código" autocomplete="off"></label>
              <div data-lista-mats></div>
            </details>
          </div>
          <aside class="cot-der">
            <section class="caja resumen-cot">
              <fieldset class="bloq" data-bloq2>
              ${verAum ? `<label class="f-campo aumento">Aumento sobre el costo<span class="f-pct grande"><input data-c="aumento_pct" inputmode="decimal" value="${esc(c.aumento_pct)}" autocomplete="off"><span>%</span></span><small>No lo ve el cliente. Se aplica al material; la mano de obra va aparte.</small></label>` : ""}
              <div class="opc">
                <label class="sw-fila"><span>IVA 12 %</span><input type="checkbox" class="sw" data-opc="iva" ${c.iva ? "checked" : ""}></label>
                <label class="sw-fila"><span>Imprevistos o administración</span><input type="checkbox" class="sw" data-opc="imp" ${c.imprevistos_pct != null ? "checked" : ""}></label>
                <div class="sub-opc" data-sub-imp ${c.imprevistos_pct != null ? "" : "hidden"}><span class="f-pct"><input data-c="imprevistos_pct" inputmode="decimal" value="${esc(c.imprevistos_pct ?? "")}" placeholder="5" aria-label="Porcentaje de imprevistos" autocomplete="off"><span>%</span></span></div>
                <label class="sw-fila"><span>Descuento</span><input type="checkbox" class="sw" data-opc="desc" ${c.descuento_tipo ? "checked" : ""}></label>
                <div class="sub-opc" data-sub-desc ${c.descuento_tipo ? "" : "hidden"}><div class="seg chico" role="group" aria-label="Tipo de descuento"><button type="button" data-dtipo="monto" aria-pressed="${c.descuento_tipo !== "pct"}">Q</button><button type="button" data-dtipo="pct" aria-pressed="${c.descuento_tipo === "pct"}">%</button></div><input class="f-desc" data-c="descuento" inputmode="decimal" value="${esc(c.descuento ?? "")}" placeholder="0" aria-label="Descuento" autocomplete="off"></div>
              </div>
              </fieldset>
              <div data-opc-res></div>
              <div class="tot" data-tot></div>
              ${verAum ? `<div class="interno" data-interno></div>` : ""}
              <div data-avisos-cot></div>
              ${puede ? `<button class="s-btn lleno ancho-b" type="button" data-guardar-cot>${ico("check", 16)}Guardar</button><span class="guardado" data-estado-guardado>Todo guardado</span>` : ""}
              <div class="fila-b pdf-b"><button class="e-btn e-btn-salida" type="button" data-pdf="ver">${ico("eye", 16)}Ver PDF</button><button class="e-btn e-btn-salida" type="button" data-pdf="bajar">${ico("download", 16)}Descargar PDF</button><button class="e-btn e-btn-salida" type="button" data-exp-bajar>${ico("layers", 16)}Expediente</button></div>
            </section>
          </aside>
        </div>
        <div class="barra-cot" data-barra-cot><span><small data-total-barra-t>Total</small><b data-total-barra></b></span>${puede ? `<button class="s-btn lleno" type="button" data-guardar-cot>Guardar</button>` : ""}</div>
      </div>`;

    const PASOS = ["borrador", "enviada", "aprobada"];
    const AYUDA = {
      borrador: ["Se está armando.", "Siguiente: márquela «Enviada» cuando se la mande al cliente."],
      enviada: ["Ya se le mandó al cliente; sus precios quedaron fijos.", "Siguiente: márquela «Aprobada» cuando la acepte, o «Rechazada» si no."],
      aprobada: ["El cliente la aceptó; sus precios quedaron fijos.", obraId ? "Su obra ya está creada." : "Siguiente: crear la obra."],
      rechazada: ["El cliente no la aceptó.", "Si quiere ajustarla y mandarla otra vez, vuélvala a «Borrador»."]
    };
    const pintarPasos = () => {
      const est = c.estado, i0 = est === "rechazada" ? 1 : PASOS.indexOf(est), dis = puede ? "" : "disabled";
      $("[data-pasos]", v).innerHTML = `<div class="pasos-fila"><ol class="pasos-l" aria-label="Fase de la cotización">${PASOS.map((k, i) => { const cl = est !== "rechazada" && k === est ? "actual" : i <= i0 ? "hecho" : "pendiente"; return `<li class="paso ${cl}"><button type="button" data-estado="${k}" ${dis} ${k === est ? 'aria-current="step"' : ""} aria-label="${D.ESTADOS[k]}${cl === "hecho" ? ", hecha" : cl === "actual" ? ", fase actual" : ""}"><span class="paso-c">${cl === "hecho" ? ico("check", 14, 2.6) : i + 1}</span><span class="paso-t">${D.ESTADOS[k]}</span></button></li>`; }).join("")}</ol>
        <button type="button" class="paso-x ${est === "rechazada" ? "actual" : ""}" data-estado="rechazada" ${dis} ${est === "rechazada" ? 'aria-current="step"' : ""}>${ico("x", 13, 2.4)}Rechazada</button></div>
        <p class="paso-ayuda"><b>${esc(AYUDA[est][0])}</b> ${esc(est === "enviada" && enlO.hayEnlace ? "Si la aprueba desde su enlace, pasa sola a «Aprobada»." : AYUDA[est][1])}</p>`;
    };
    const congelar = () => {
      const kb = D.calcularCotizacion({ ...c, estado: "borrador" }, cat, { todo: true });
      c.precios_fijos = Object.fromEntries(kb.materiales.map(m => [m.material.id, { costo: m.costoU, precio: m.precioU, origen: m.origen, pct: m.pct }]));
      c.partidas = kb.partidas.map(pp => ({ estructura_id: pp.estructura_id || null, material_id: pp.material_id || null, materiales: pp.materiales || null, descripcion: pp.descripcion, cantidad: pp.cantidad, costo_materiales: pp.costo_materiales, mano_obra: pp.mano_obra, precio_unitario: pp.precio_unitario, del_plano: !!pp.del_plano, grupo: pp.grupo || null }));
    };
    const partBox = $("[data-partidas]", v), cargoBox = $("[data-cargos]", v), resEst = $("[data-res-est]", v), buscaEst = $("[data-busca-est]", v);
    let k = D.calcularCotizacion(c, cat);

    const pintarTotales = () => {
      k = D.calcularCotizacion(c, cat, verEsc());
      pintarOpcRes();
      k.partidas.forEach((pp, i) => { const el = partBox.querySelector(`[data-ptot="${i}"]`); if (el) el.textContent = Q(pp.total); const u = partBox.querySelector(`[data-punit="${i}"]`); if (u) u.textContent = Q(pp.precio_unitario); });
      const fila = (t, val, cl = "") => `<div class="${cl}"><span>${t}</span><b class="e-cifra">${esc(val)}</b></div>`;
      $("[data-tot]", v).innerHTML = fila("Subtotal", Q(k.subtotal))
        + (k.cargos ? fila("Transporte y equipo", Q(k.cargos)) : "")
        + (c.imprevistos_pct != null ? fila(`Imprevistos y administración ${cant(c.imprevistos_pct)} %`, Q(k.imprevistos)) : "")
        + (c.descuento_tipo ? fila(`Descuento${c.descuento_tipo === "pct" ? " " + cant(c.descuento || 0) + " %" : ""}`, "− " + Q(k.descuento)) : "")
        + (c.iva ? fila("Total sin IVA", Q(k.neto)) + fila("IVA 12 %", Q(k.iva)) : "")
        + fila(c.iva ? "Total con IVA" : "Total", Q(k.total), "g");
      const ib = $("[data-interno]", v);
      if (ib) ib.innerHTML = `<small>${ico("ojoNo", 13)}Solo para gerencia</small>` + fila("Costo de materiales", Q(k.costoMat)) + fila("Mano de obra", Q(k.manoObra)) + fila("Ganancia estimada", Q(k.ganancia), k.ganancia < 0 ? "mal" : "");
      const avisos = [];
      if (c.estado === "borrador" && k.faltan) avisos.push(`${k.faltan} materiales sin costo en el catálogo: esas estructuras salen más baratas de lo que son.`);
      if (c.estado === "borrador" && k.sinMano) avisos.push(`${k.sinMano} ${k.sinMano === 1 ? "estructura no tiene" : "estructuras no tienen"} mano de obra en el catálogo.`);
      if (verAum && c.estado === "borrador" && k.conAumento && !(Number(c.aumento_pct) > 0)) avisos.push(`Falta el aumento: ${k.conAumento} ${k.conAumento === 1 ? "pieza sale" : "piezas salen"} al mismo precio que el costo.`);
      if (verAum && k.sinCosto) avisos.push(`${k.sinCosto} ${k.sinCosto === 1 ? "pieza no tiene" : "piezas no tienen"} costo: su ganancia no se puede calcular.`);
      $("[data-avisos-cot]", v).innerHTML = avisos.map(a => `<p class="aviso-cot">${ico("alerta", 15)}<span>${esc(a)}</span></p>`).join("");
      $("[data-total-barra]", v).textContent = Q(k.total);
      $("[data-total-barra-t]", v).textContent = !k.escenario || k.escenario.todo ? "Total" : c.eleccion && k.escenario.opcion === c.eleccion.opcion && JSON.stringify(k.escenario.extras) === JSON.stringify(c.eleccion.extras || []) ? "Total · lo que escogió" : k.escenario.opcion ? `Total · opción ${k.escenario.opcion}${k.escenario.extras.length ? " + extras" : ""}` : k.escenario.extras.length ? "Total con extras" : "Total";
      $("[data-n-part]", v).textContent = `${c.partidas.length} ${c.partidas.length === 1 ? "partida" : "partidas"}`;
      $("[data-n-mats]", v).textContent = `${k.materiales.length} materiales`;
      const rs = (sel, t) => { const el = $(sel, v); if (el) el.textContent = t; };
      const sitioN = cli && cli.sitios.find(x => x.id === c.sitio_id);
      rs("[data-res-datos]", [sitioN ? sitioN.nombre : "", `vigencia ${c.vigencia_dias} días`].filter(Boolean).join(" · "));
      rs("[data-res-cargos]", c.cargos.length ? `${c.cargos.length} · ${Q(k.cargos)}` : "Opcional");
      rs("[data-res-pdf]", "Foto, alcance y condiciones");
      rs("[data-res-piezas]", `${k.materiales.length} piezas · gana ${Q(k.materiales.reduce((a2, m) => a2 + (m.ganancia || 0), 0))}`);
      pintarMats(); pintarPiezas();
    };

    const hayOp = () => { const o = c.opciones || {}; return (o.lista || []).length >= 2 || (o.extras || []).length > 0; };
    const gruposOp = () => { const o = c.opciones || {}; return [null, ...(o.lista || []).map(x => "o:" + x.id), ...(o.extras || []).map(x => "x:" + x.id)]; };
    let verOp = null, verX = null, destino = null;
    const verEsc = () => hayOp() ? { opcion: verOp || (c.eleccion && c.eleccion.opcion) || ((c.opciones.lista || [])[0] || {}).id || null, extras: verX || (c.eleccion && c.eleccion.extras) || [] } : null;
    const filaP = (pp, i) => `
        <div class="partida"><span class="icono ${pp.material_id ? "gris" : pp.estructura && pp.estructura.clase === "transformador" ? "laton" : "azul"} chico">${ico(pp.material_id ? "box" : pp.estructura && pp.estructura.clase === "transformador" ? "zap" : "torre", 15)}</span>
          <span class="p-nom"><b>${esc(pp.descripcion)}${pp.ajustada ? ' <span class="chip azul chico-c">Ajustada</span>' : ""}${pp.del_plano ? ' <span class="chip gris chico-c">Del plano</span>' : ""}${hayOp() && puede && !fijo() ? ` <button type="button" class="chip-g" data-pgrupo="${i}">Mover</button>` : ""}</b><small>${pp.material_id ? (pp.material ? esc(pp.material.codigo) + " · material suelto" : "Ya no está en el catálogo") : pp.estructura ? esc(pp.estructura.codigo + " · " + cant(pp.estructura.voltaje_kv) + " kV") : "Ya no está en el catálogo"} · <span data-punit="${i}">${esc(Q(pp.precio_unitario))}</span> c/u${pp.faltCosto ? ` · <span class="falta">${pp.faltCosto} sin costo</span>` : ""}</small></span>
          <label class="f-cant"><span class="sr">Cantidad</span><input inputmode="decimal" value="${esc(cant(pp.cantidad))}" data-pcant="${i}" autocomplete="off"></label>
          <b class="e-cifra p-tot" data-ptot="${i}">${esc(Q(pp.total))}</b>
          ${pp.estructura ? `<button class="s-ib p-aj" type="button" aria-label="Ajustar materiales de ${esc(pp.descripcion)} en esta cotización" title="Ajustar materiales solo en esta cotización" data-pajustar="${i}">${ico("pen", 15)}</button>` : '<span class="p-aj"></span>'}
          <button class="s-ib p-qu" type="button" aria-label="Quitar ${esc(pp.descripcion)}" data-pquitar="${i}">${ico("x", 15)}</button></div>`;
    const pintarPartidas = () => {
      const sel = $("[data-agregar-a]", v), lab = $("[data-agregar-a-l]", v);
      if (lab) { lab.hidden = !hayOp(); if (hayOp()) { if (!gruposOp().includes(destino)) destino = null; sel.innerHTML = gruposOp().map(g => `<option value="${esc(g || "")}" ${g === destino ? "selected" : ""}>${esc(D.nombreGrupo(c, g))}</option>`).join(""); } }
      if (!c.partidas.length) { partBox.innerHTML = `<p class="suave vacio-p">Todavía no hay nada. Busque abajo la estructura, el transformador o un material suelto.</p>`; return; }
      if (!hayOp()) { partBox.innerHTML = k.partidas.map(filaP).join(""); return; }
      const gs = gruposOp();
      partBox.innerHTML = gs.map(g => {
        const l = k.partidas.map((pp, i) => [pp, i]).filter(([pp]) => (gs.includes(pp.grupo || null) ? (pp.grupo || null) : null) === g);
        return `<div class="grupo-p ${g ? (g[0] === "o" ? "op" : "ex") : ""}"><span>${esc(D.nombreGrupo(c, g))}</span><small>${l.length ? esc(Q(l.reduce((a, [pp]) => a + pp.total, 0))) : g ? "Nada todavía" : ""}</small></div>` + l.map(([pp, i]) => filaP(pp, i)).join("");
      }).join("");
    };
    const pintarOpcRes = () => {
      const box = $("[data-opc-res]", v); if (!box) return;
      if (!hayOp()) { box.innerHTML = ""; return; }
      const es = D.escenariosCotizacion(c, cat), ve = verEsc();
      box.innerHTML = `<div class="opc-res">${es.opciones.length ? `<p class="opc-t">${c.eleccion ? "El cliente escogió" : "Opciones · el cliente escoge una"}</p>${es.opciones.map(o => `<label class="opc-f ${c.eleccion && c.eleccion.opcion === o.id ? "elegida" : ""}"><input type="radio" name="verop" value="${esc(o.id)}" ${ve.opcion === o.id ? "checked" : ""}><span><b>Opción ${esc(o.id)}</b><small>${esc(o.nombre)}</small></span><b class="e-cifra">${esc(Q(o.k.total))}</b></label>`).join("")}` : ""}
        ${es.extras.length ? `<p class="opc-t">Extras · se suman si los quiere</p>${es.extras.map(x => `<label class="opc-f ${c.eleccion && (c.eleccion.extras || []).includes(x.id) ? "elegida" : ""}"><input type="checkbox" data-verx="${esc(x.id)}" ${ve.extras.includes(x.id) ? "checked" : ""}><span><b>${esc(x.nombre)}</b></span><b class="e-cifra">+ ${esc(Q(x.monto))}</b></label>`).join("")}` : ""}
        <p class="opc-nota">Los totales de abajo son de lo marcado.</p></div>`;
    };
    const pintarCargos = () => {
      cargoBox.innerHTML = c.cargos.map((g, i) => `<div class="cargo"><label class="f-campo"><span class="sr">Descripción</span><input data-gdesc="${i}" value="${esc(g.descripcion)}" placeholder="Flete, grúa, camión canasta…" autocomplete="off"></label>
        <label class="f-campo"><span class="sr">Monto</span><span class="f-monto"><span>Q</span><input data-gmonto="${i}" inputmode="decimal" value="${esc(montoTxt(g.monto))}" placeholder="0.00" autocomplete="off"></span></label>
        <button class="s-ib" type="button" aria-label="Quitar cargo" data-gquitar="${i}">${ico("x", 15)}</button></div>`).join("");
    };
    const ORIGEN = { cotizacion: ["azul", "Solo aquí"], catalogo: ["verde", "Del catálogo"], aumento: ["gris", "Aumento"], fijo: ["gris", "Fijo"] };
    const pasaBusca = (m, q) => !q || (m.material.descripcion + " " + m.material.codigo).toLowerCase().includes(q);
    const pintarPiezas = () => {
      const box = $("[data-pp]", v); if (!box) return;
      const q = ($("[data-pp-busca]", v).value || "").toLowerCase().trim();
      const l = k.materiales.filter(m => pasaBusca(m, q));
      const ed = !fijo();
      const sum = f => k.materiales.reduce((a, m) => a + (m[f] || 0), 0);
      box.innerHTML = !k.materiales.length ? `<p class="suave vacio-p">Aparece al agregar estructuras o materiales.</p>` : `<div class="pp-tabla">
        <div class="pp-cab"><span>Pieza</span><span>Cant.</span><span>Costó c/u</span><span>Al cliente c/u</span><span>Gana c/u</span><span>Gana total</span><span></span></div>
        ${l.map(m => { const [cc, ct] = ORIGEN[m.origen] || ORIGEN.fijo; return `<div class="pp-fila"><span class="pp-nom"><b>${esc(m.material.descripcion)}</b><small>${esc(m.material.codigo)} · <span class="chip ${cc} chico-c">${ct}${m.origen === "aumento" || (m.pct != null && m.origen !== "fijo") ? " " + esc(cant(m.pct)) + " %" : ""}</span></small></span>
          <span data-l="Cant.">${esc(cant(m.cantidad))}</span>
          <span data-l="Costó c/u">${m.costoU == null ? '<span class="falta">Sin costo</span>' : esc(Q(m.costoU))}</span>
          <span data-l="Al cliente c/u"><b>${m.precioU == null ? "—" : esc(Q(m.precioU))}</b></span>
          <span data-l="Gana c/u" class="${m.gananciaU != null && m.gananciaU < 0 ? "falta" : ""}">${m.gananciaU == null ? "—" : esc(Q(m.gananciaU))}</span>
          <span data-l="Gana total" class="${m.ganancia != null && m.ganancia < 0 ? "falta" : ""}">${m.ganancia == null ? "—" : esc(Q(m.ganancia))}</span>
          <span class="pp-acc">${ed ? `<button class="s-ib" type="button" aria-label="Cambiar el precio de ${esc(m.material.descripcion)} en esta cotización" data-pp-ed="${m.material.id}">${ico("pen", 15)}</button>` : ""}</span></div>`; }).join("") || `<p class="suave vacio-p">Nada con «${esc(q)}».</p>`}
        <div class="pp-fila pp-tot"><span class="pp-nom"><b>Todas las piezas</b><small>${k.materiales.length} materiales</small></span><span></span><span data-l="Costó">${esc(Q(sum("costo")))}</span><span data-l="Al cliente"><b>${esc(Q(sum("venta")))}</b></span><span></span><span data-l="Gana total"><b>${esc(Q(sum("ganancia")))}</b></span><span></span></div></div>`;
    };
    const precioPieza = mid => {
      const m = k.materiales.find(x => x.material.id === mid); if (!m) return;
      const actual = (c.precios || {})[mid] || null;
      let modo = actual ? actual.modo : "";
      const cat0 = D.precioPieza(m.material, c.aumento_pct, null);
      A().modal({
        titulo: "Precio en esta cotización", guardarTxt: "Aplicar",
        cuerpo: `<p class="suave" style="font-size:13.5px"><b style="color:var(--text)">${esc(m.material.descripcion)}</b> · ${esc(cant(m.cantidad))} ${m.material.unidad ? esc(m.material.unidad) : "piezas"} en esta cotización. El catálogo no cambia.</p>
          <div class="f-campo"><span>Precio al cliente</span><div class="seg ancho" role="group" aria-label="Forma del precio">${[["", "Como el catálogo"], ["precio", "Precio fijo"], ["pct", "% sobre el costo"]].map(([k2, n]) => `<button type="button" data-pm="${k2}" aria-pressed="${modo === k2}">${n}</button>`).join("")}</div></div>
          <div data-pm-precio ${modo === "precio" ? "" : "hidden"}>${A().campoMonto("precio", "Precio por unidad", actual && actual.modo === "precio" ? actual.valor : cat0.precio)}</div>
          <label class="f-campo" data-pm-pct ${modo === "pct" ? "" : "hidden"}>Aumento sobre el costo<span class="f-pct"><input name="pct" inputmode="decimal" value="${esc(actual && actual.modo === "pct" ? actual.valor : (cat0.pct ?? ""))}" autocomplete="off"><span>%</span></span></label>
          <div class="vm-prev" data-pm-prev></div>`,
        alAbrir: (f, mm) => {
          A().formatoAlSalir(f);
          const leer = () => { let pr = null, pc = null; try { pr = numero(f.precio.value); } catch (er) {} try { pc = numero(f.pct.value); } catch (er) {} return { pr, pc }; };
          const prev = () => {
            const { pr, pc } = leer();
            const ov = modo === "precio" ? { [mid]: { modo, valor: pr } } : modo === "pct" ? { [mid]: { modo, valor: pc } } : null;
            const z = ov && ov[mid].valor == null ? { costo: m.material.costo, precio: null, ganancia: null } : D.precioPieza(m.material, c.aumento_pct, ov);
            f.querySelector("[data-pm-prev]").innerHTML = `<div><span>Costó c/u</span><b>${z.costo == null ? "Sin costo" : esc(Q(z.costo))}</b></div><div><span>Al cliente c/u</span><b>${z.precio == null ? "—" : esc(Q(z.precio))}</b></div><div class="g"><span>Gana c/u</span><b class="${z.ganancia != null && z.ganancia < 0 ? "falta" : ""}">${z.ganancia == null ? "—" : esc(Q(z.ganancia))}</b></div><div><span>Gana en esta cotización</span><b>${z.ganancia == null ? "—" : esc(Q(Math.round(z.ganancia * m.cantidad * 100) / 100))}</b></div>`;
          };
          f.addEventListener("input", prev);
          mm.addEventListener("click", ev => { const b = ev.target.closest("[data-pm]"); if (!b) return; modo = b.dataset.pm; f.querySelectorAll("[data-pm]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); f.querySelector("[data-pm-precio]").hidden = modo !== "precio"; f.querySelector("[data-pm-pct]").hidden = modo !== "pct"; (modo === "precio" ? f.precio : modo === "pct" ? f.pct : null)?.focus(); prev(); });
          prev();
        },
        alGuardar: async f => {
          const pr = numero(f.precio.value), pc = numero(f.pct.value);
          c.precios = { ...(c.precios || {}) };
          if (!modo) delete c.precios[mid];
          else {
            const valor = modo === "precio" ? pr : pc;
            if (valor == null || !(valor >= 0)) throw new Error(modo === "precio" ? "Escriba el precio por unidad." : "Escriba el porcentaje.");
            c.precios[mid] = { modo, valor };
          }
          A().cerrarCapas(); k = D.calcularCotizacion(c, cat); pintarPartidas(); marcar(); pintarTotales();
          aviso(modo ? "Precio cambiado solo en esta cotización." : "Quedó con el precio del catálogo.");
        }
      });
    };
    const pintarMats = () => {
      const verCosto = D.puede(p, "verCosto");
      const qm = ($("[data-lm-busca]", v).value || "").toLowerCase().trim();
      $("[data-lm-busca]", v).closest("label").hidden = !k.materiales.length;
      $("[data-lista-mats]", v).innerHTML = k.materiales.length ? `<div class="mats-l">${k.materiales.filter(m => pasaBusca(m, qm)).map(m => `<div><span>${esc(m.material.descripcion)}<small>${esc(m.material.codigo)}${m.material.unidad ? " · " + esc(m.material.unidad) : ""}</small></span><b>${esc(cant(m.cantidad))}</b>${verCosto ? `<span class="e-cifra">${m.costo == null ? "Sin costo" : esc(Q(m.costo))}</span>` : ""}</div>`).join("")}</div>
        <div class="fila-b"><button class="e-btn e-btn-salida" type="button" data-bajar-mats>${ico("download", 16)}Descargar la lista</button></div>` : `<p class="suave vacio-p">La lista sale sola al agregar estructuras.</p>`;
    };
    const aplicarFijo = () => {
      const f = fijo();
      $$("[data-bloq], [data-bloq2]", v).forEach(fs => { fs.disabled = f; });
      const nota = $("[data-nota-fija]", v);
      nota.hidden = true;
      nota.querySelector("span").textContent = c.estado === "borrador" ? "" : `Esta cotización está ${D.ESTADOS[c.estado].toLowerCase()}: sus precios quedaron fijos. Para cambiarla, pásela a Borrador.`;
    };

    const enlO = { box: $("[data-enlace]", v), c, cli, cat, emp: await D.empresa(), puede, hayEnlace: false, sucio: () => sucio,
      prepararEnvio: async () => { if (c.estado === "borrador") { congelar(); c.estado = "enviada"; } const kk = D.calcularCotizacion(c, cat); await D.guardarCotizacion(c, kk); sucio = false; return { c, k: kk }; },
      recargar: () => A().quieto(() => editor(v, id)),
      alAprobar: async () => { if (!sucio) await A().quieto(() => editor(v, id)); else { c.estado = "aprobada"; pintarPasos(); aplicarFijo(); await window.EMT_ENLACES.panel(enlO); } } };
    pintarPasos(); pintarPartidas(); pintarCargos(); pintarTotales(); aplicarFijo();
    if (D.puede(p, "verEnlaces")) window.EMT_ENLACES.panel(enlO).then(() => pintarPasos()).catch(() => {});
    const segCtx = { c, cli, puede, sucio: () => sucio, recargar: () => A().quieto(() => editor(v, id)), recargarSeg: () => pintarSeg(), marcarRechazada: () => { const b = $('[data-estado="rechazada"]', v); if (b) b.click(); } };
    const pintarSeg = () => window.EMT_SEGUIMIENTO ? window.EMT_SEGUIMIENTO.seccion($("[data-seg]", v), segCtx).catch(() => {}) : null;
    pintarSeg();
    const pintarExp = async () => {
      const box = $("[data-exp]", v); if (!box) return;
      const pz = await window.EMT_EXPEDIENTE.piezas(c, k);
      const cf = pz.cf, partes = Object.fromEntries(pz.partes.map(x => [x.k, x]));
      const n = pz.partes.filter(x => x.on && x.docs.length).length;
      const res = $("[data-res-exp]", v); if (res) res.textContent = `${n} ${n === 1 ? "parte" : "partes"} en un solo PDF`;
      const sw = (key, t, sub, dis) => `<label class="sw-fila exp-p ${dis ? "apagado" : ""}"><span><b>${t}</b><small>${sub}</small></span><input type="checkbox" class="sw" data-exp-parte="${key}" ${cf.partes[key] && !dis ? "checked" : ""} ${dis ? "disabled" : ""}></label>`;
      box.innerHTML = `
        <p class="suave" style="margin:0;font-size:13.5px">Lleva portada, índice con páginas y un separador antes de cada parte. Escoja qué va.</p>
        <div class="exp-lista">
          ${sw("propuesta", "Propuesta técnica y económica", "Portada, carta, precios y condiciones.", false)}
          ${sw("plano", "Plano", pz.plano ? "Hoja tabloide con simbología y machote." : "Esta cotización todavía no tiene plano.", !pz.plano)}
          ${sw("fichas", "Fichas técnicas", pz.conFicha.length ? `${pz.conFicha.length} ${pz.conFicha.length === 1 ? "ficha" : "fichas"} de los materiales${pz.sinFicha.length ? ` · ${pz.sinFicha.length} sin ficha` : ""}.` : k.materiales.length ? "Ningún material de esta cotización tiene ficha. Se suben en el catálogo." : "Aparecen al agregar estructuras.", !pz.conFicha.length)}
          ${sw("fijos", "Documentos de la empresa", pz.fijos.length ? "Escoja abajo cuáles van." : "Todavía no hay. Se suben en Empresa.", !pz.fijos.length)}
          ${pz.fijos.length && cf.partes.fijos ? `<div class="exp-sub">${pz.fijos.map(x => `<label class="f-check"><input type="checkbox" data-exp-fijo="${x.id}" ${(cf.fijos[x.id] != null ? cf.fijos[x.id] : x.siempre) ? "checked" : ""}><span>${esc(x.nombre)}</span></label>`).join("")}</div>` : ""}
          ${sw("anexos", "Otros documentos", cf.anexos.length ? `${cf.anexos.length} ${cf.anexos.length === 1 ? "archivo agregado" : "archivos agregados"} solo a esta cotización.` : "Archivos solo para esta cotización.", false)}
          ${cf.partes.anexos ? `<div class="exp-sub">${cf.anexos.map((a, i) => `<div class="exp-anx"><span>${ico("file", 15)}<b>${esc(a.nombre)}</b><small>${esc(D.TIPOS_DOC[a.tipo] || "")} · ${esc(D.tamTxt(a.tam))}</small></span><span class="acc"><button class="s-ib" type="button" aria-label="Ver ${esc(a.nombre)}" data-exp-ver="${i}">${ico("eye", 15)}</button><button class="s-ib" type="button" aria-label="Editar ${esc(a.nombre)}" data-exp-ed="${i}">${ico("pen", 15)}</button></span></div>`).join("")}
            <label class="s-btn suave-b chico">${ico("plus", 14)}Agregar archivo<input type="file" accept="application/pdf,image/jpeg,image/png" multiple hidden data-exp-anexo></label></div>` : ""}
        </div>
        ${pz.sinFicha.length && pz.conFicha.length ? `<details class="exp-falta"><summary>${pz.sinFicha.length} ${pz.sinFicha.length === 1 ? "material sin ficha" : "materiales sin ficha"}</summary><p class="suave">${pz.sinFicha.slice(0, 12).map(m => esc(m.descripcion)).join(" · ")}${pz.sinFicha.length > 12 ? " …" : ""}</p></details>` : ""}
        <button class="e-btn e-btn-salida" type="button" data-exp-bajar>${ico("download", 16)}Descargar el expediente</button>`;
    };
    const exp = () => { c.expediente = window.EMT_EXPEDIENTE.config(c); return c.expediente; };
    pintarExp().catch(() => {});
    if (window.EMT_ENERGUATE) window.EMT_ENERGUATE.seccionCotizacion($("[data-eg-cot]", v), c, puede).catch(() => {});
    $(".cuerpo", v).addEventListener("toggle", e => { if (e.target.dataset && e.target.dataset.pl === "expediente" && e.target.open) { k = D.calcularCotizacion(c, cat); pintarExp().catch(() => {}); } }, true);
    window.EMT_PLANOS.miniatura("cot", c.id).then(m => { const el = $("[data-plano-mini]", v); if (el) el.innerHTML = m ? `<a class="mini-plano-c" href="#/plano/cot/${c.id}">${m}</a>` : `<p class="suave" style="margin:0;font-size:13.5px">Todavía no hay plano. Se dibuja con la simbología de Energuate y sale en PDF tabloide con el machote abajo.</p>`; const r = $("[data-res-plano]", v); if (r && m) r.textContent = "Con plano"; pintarCnt(); }).catch(() => {});
    async function pintarCnt() {
      const box = $("[data-cnt-cot]", v); if (!box) return;
      const pl = await D.plano("cot", c.id).catch(() => null);
      if (!pl || !pl.datos || !(pl.datos.elementos || []).length) { box.innerHTML = ""; return; }
      const r = D.contarPlano(pl.datos, cat, await D.ajustesConteo(), pl.machote);
      const nP = c.partidas.filter(x => x.del_plano).length;
      box.innerHTML = `<div class="cnt-cot-f"><span><b>Del plano: ${r.resumen.postes} ${r.resumen.postes === 1 ? "poste" : "postes"} · ${r.resumen.trafos} ${r.resumen.trafos === 1 ? "transformador" : "transformadores"} · ${cant(r.resumen.metros)} m</b><small>${nP ? `${nP} ${nP === 1 ? "renglón vino" : "renglones vinieron"} del plano` : `${r.filas.length} ${r.filas.length === 1 ? "renglón listo" : "renglones listos"} para pasar`}${r.sin.length ? ` · ${r.sin.length} sin pareja` : ""}</small></span><button class="s-btn lleno chico" type="button" data-conteo>${ico("layers", 14)}${c.estado === "borrador" && puede ? "Pasar a la cotización" : "Ver el conteo"}</button></div>`;
    }
    if (!puede) $$("[data-bloq], [data-bloq2]", v).forEach(fs => { fs.disabled = true; });

    const buscar = () => {
      const q = buscaEst.value.toLowerCase().trim();
      if (!q) { resEst.hidden = true; return; }
      const l = cat.estructuras.filter(e => (e.nombre + " " + e.codigo + " " + e.voltaje_kv + " kv " + (e.kva || "") + " kva").toLowerCase().includes(q)).slice(0, 6);
      const lm = cat.materiales.filter(m => (m.descripcion + " " + m.codigo).toLowerCase().includes(q)).slice(0, 6);
      resEst.hidden = false;
      resEst.innerHTML = (l.length ? `<p class="res-t">Estructuras</p>` + l.map(e => { const pe = D.precioEstructura(e, c.aumento_pct, c.precios); return `<button type="button" data-add-est="${e.id}"><b>${esc(e.nombre)}</b><small>${esc(e.codigo)} · ${cant(e.voltaje_kv)} kV · ${esc(Q(pe.unitario))} c/u${pe.faltCosto ? " · faltan costos" : ""}</small></button>`; }).join("") : "")
        + (lm.length ? `<p class="res-t">Materiales sueltos</p>` + lm.map(m => `<button type="button" data-add-mat="${m.id}"><b>${esc(m.descripcion)}</b><small>${esc(m.codigo)} · ${(z => z.precio == null ? "sin costo" : esc(Q(z.precio)) + " c/u")(D.precioPieza(m, c.aumento_pct, c.precios))}</small></button>`).join("") : "")
        || `<p class="suave">No hay estructuras ni materiales con «${esc(buscaEst.value)}».</p>`;
    };
    buscaEst.addEventListener("input", buscar);
    buscaEst.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); resEst.querySelector("[data-add-est], [data-add-mat]")?.click(); } });
    const ajustar = i => {
      const pp = k.partidas[i], part = c.partidas[i];
      const base = pp.estructura.materiales.map(r => ({ material: r.material, cantidad: r.cantidad }));
      let filas = pp.mats.map(r => ({ material: r.material, cantidad: r.cantidad }));
      const verCosto = D.puede(p, "verCosto");
      A().modal({
        titulo: "Materiales en esta cotización",
        guardarTxt: "Aplicar",
        extra: `<button class="s-btn suave-b" type="button" data-restablecer>${ico("layers", 15)}Como en el catálogo</button>`,
        cuerpo: `<p class="suave" style="font-size:13.5px"><b style="color:var(--text)">${esc(pp.descripcion)}</b>. Los cambios valen solo para esta cotización; el catálogo no cambia.</p>
          <div class="f-mats" data-aj-filas></div>
          <div class="f-agregar"><span class="f-busca">${ico("search", 15)}<input data-aj-busca placeholder="Agregar material: escriba para buscar" autocomplete="off" aria-label="Agregar material"></span><div class="f-res" data-aj-res hidden></div></div>
          <div class="f-totales" data-aj-tot></div>`,
        alAbrir: (f, m) => {
          const caja = f.querySelector("[data-aj-filas]"), res = f.querySelector("[data-aj-res]"), busca = f.querySelector("[data-aj-busca]");
          const tot = () => {
            const kk = D.precioEstructura({ materiales: filas, mano_obra: pp.estructura.mano_obra }, c.aumento_pct, c.precios);
            f.querySelector("[data-aj-tot]").innerHTML = (verCosto ? `<div><span>Costo de materiales</span><b>${esc(Q(kk.costo))}</b></div>` : "") + `<div><span>Mano de obra</span><b>${kk.mo == null ? "Sin poner" : esc(Q(kk.mo))}</b></div><div class="g"><span>Precio por unidad en esta cotización</span><b>${esc(Q(kk.unitario))}</b></div>`;
          };
          const pintar = () => {
            caja.innerHTML = filas.length ? filas.map((r, j) => `<div class="f-mat"><span><b>${esc(r.material.descripcion)}</b><small>${esc(r.material.codigo)}${r.material.costo == null ? " · sin costo" : ""}</small></span>
              <label class="f-cant"><span class="sr">Cantidad de ${esc(r.material.descripcion)}</span><input inputmode="decimal" value="${esc(cant(r.cantidad))}" data-aj-cant="${j}" autocomplete="off"></label>
              <button class="s-ib" type="button" aria-label="Quitar ${esc(r.material.descripcion)}" data-aj-quitar="${j}">${ico("x", 15)}</button></div>`).join("") : `<p class="suave" style="padding:12px 14px">Sin materiales. Agréguelos abajo.</p>`;
            tot();
          };
          pintar();
          f.addEventListener("input", ev => {
            if (ev.target.matches("[data-aj-cant]")) { const n = Number(String(ev.target.value).replace(/,/g, "")); filas[Number(ev.target.dataset.ajCant)].cantidad = isFinite(n) ? n : 0; tot(); }
            if (ev.target === busca) {
              const q = busca.value.toLowerCase().trim();
              if (!q) { res.hidden = true; return; }
              const ya = new Set(filas.map(r => r.material.id));
              const l = cat.materiales.filter(x => !ya.has(x.id) && (x.descripcion + " " + x.codigo).toLowerCase().includes(q)).slice(0, 8);
              res.hidden = false;
              res.innerHTML = l.length ? l.map(x => `<button type="button" data-aj-add="${x.id}"><b>${esc(x.descripcion)}</b><small>${esc(x.codigo)}</small></button>`).join("") : `<p class="suave">No hay más materiales con «${esc(busca.value)}».</p>`;
            }
          });
          m.addEventListener("click", ev => {
            const ad = ev.target.closest("[data-aj-add]"); if (ad) { filas.push({ material: cat.materiales.find(x => x.id === Number(ad.dataset.ajAdd)), cantidad: 1 }); busca.value = ""; res.hidden = true; pintar(); const u = caja.querySelectorAll("[data-aj-cant]"); u[u.length - 1]?.focus(); u[u.length - 1]?.select(); }
            const qq = ev.target.closest("[data-aj-quitar]"); if (qq) { filas.splice(Number(qq.dataset.ajQuitar), 1); pintar(); }
            if (ev.target.closest("[data-restablecer]")) { filas = base.map(r => ({ ...r })); pintar(); }
          });
        },
        alGuardar: async () => {
          if (filas.some(r => !(r.cantidad > 0))) throw new Error("Cada material necesita una cantidad mayor que cero; para quitarlo use la X.");
          const igual = filas.length === base.length && filas.every(r => { const b = base.find(x => x.material.id === r.material.id); return b && Number(b.cantidad) === Number(r.cantidad); });
          part.materiales = igual ? null : filas.map(r => ({ material_id: r.material.id, cantidad: Number(r.cantidad) }));
          A().cerrarCapas(); k = D.calcularCotizacion(c, cat); pintarPartidas(); marcar(); pintarTotales();
          aviso(igual ? "Quedó como en el catálogo." : "Materiales ajustados solo para esta cotización.");
        }
      });
    };

    const leerNum = (t, def = null) => { try { const n = numero(t); return n == null ? def : n; } catch (e) { return def; } };
    $(".cuerpo", v).addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.pl) plegados.set(d.dataset.pl, d.open); }, true);
    v.oninput = e => {
      const t = e.target;
      if (t.matches("[data-pp-busca]")) { pintarPiezas(); return; }
      if (t.matches("[data-lm-busca]")) { pintarMats(); return; }
      if (t.dataset.c) {
        const k2 = t.dataset.c;
        if (k2 === "titulo") { c.titulo = t.value; $("[data-h1]", v).textContent = t.value.trim() || "Sin título"; }
        else if (k2 === "notas" || k2 === "fecha" || k2 === "alcance_incluye" || k2 === "alcance_excluye") c[k2] = t.value;
        else if (k2 === "vigencia_dias") c.vigencia_dias = Number(t.value.replace(/\D/g, "")) || 0;
        else if (k2 === "aumento_pct") c.aumento_pct = leerNum(t.value, 0);
        else if (k2 === "imprevistos_pct") c.imprevistos_pct = leerNum(t.value, 0);
        else if (k2 === "descuento") c.descuento = leerNum(t.value, 0);
        marcar(); pintarTotales();
      }
      if (t.dataset.cond) { c.condiciones = { ...(c.condiciones || {}), [t.dataset.cond]: t.value }; marcar(); }
      if (t.dataset.pcant != null) { const n = Number(String(t.value).replace(/,/g, "")); c.partidas[Number(t.dataset.pcant)].cantidad = isFinite(n) ? n : 0; marcar(); pintarTotales(); }
      if (t.dataset.gdesc != null) { c.cargos[Number(t.dataset.gdesc)].descripcion = t.value; marcar(); }
      if (t.dataset.gmonto != null) { c.cargos[Number(t.dataset.gmonto)].monto = leerNum(t.value, 0); marcar(); pintarTotales(); }
    };
    v.onchange = async e => {
      const t = e.target;
      if (t.matches("[data-agregar-a]")) { destino = t.value || null; return; }
      if (t.name === "verop" && t.closest("[data-opc-res]")) { verOp = t.value; await A().quieto(pintarTotales); return; }
      if (t.dataset.verx) { const ve = verEsc(); verX = t.checked ? [...new Set([...ve.extras, t.dataset.verx])] : ve.extras.filter(x => x !== t.dataset.verx); await A().quieto(pintarTotales); return; }
      if (t.dataset.expParte) { exp().partes[t.dataset.expParte] = t.checked; marcar(); await A().quieto(pintarExp); return; }
      if (t.dataset.expFijo) { exp().fijos[t.dataset.expFijo] = t.checked; marcar(); return; }
      if (t.matches("[data-exp-anexo]")) {
        const files = [...t.files]; t.value = "";
        for (const f of files) { try { const a = await D.subirArchivo(f, "anexos"); exp().anexos.push(a); } catch (err) { aviso(err.message, "mal"); } }
        marcar(); await A().quieto(pintarExp); aviso(files.length === 1 ? "Archivo agregado. Recuerde guardar." : "Archivos agregados. Recuerde guardar.");
        return;
      }
      if (t.dataset.c === "sitio_id" || t.dataset.c === "contacto_id") { c[t.dataset.c] = t.value ? Number(t.value) : null; marcar(); }
      if (t.matches("[data-foto]")) { c.foto = t.value; marcar(); }
      if (t.dataset.opc === "iva") { c.iva = t.checked; marcar(); pintarTotales(); }
      if (t.dataset.opc === "imp") { c.imprevistos_pct = t.checked ? (leerNum($('[data-c="imprevistos_pct"]', v).value, 0)) : null; $("[data-sub-imp]", v).hidden = !t.checked; marcar(); pintarTotales(); if (t.checked) $('[data-c="imprevistos_pct"]', v).focus(); }
      if (t.dataset.opc === "desc") { c.descuento_tipo = t.checked ? ($('[data-dtipo="pct"]', v).getAttribute("aria-pressed") === "true" ? "pct" : "monto") : null; c.descuento = t.checked ? leerNum($('[data-c="descuento"]', v).value, 0) : null; $("[data-sub-desc]", v).hidden = !t.checked; marcar(); pintarTotales(); if (t.checked) $('[data-c="descuento"]', v).focus(); }
      if (t.dataset.gmonto != null) t.value = montoTxt(leerNum(t.value, 0));
    };
    const elegir = boton => {
      const es = D.escenariosCotizacion(c, cat);
      A().modal({ titulo: "¿Qué escogió el cliente?", guardarTxt: "Marcar aprobada",
        cuerpo: `${es.opciones.length ? `<div class="f-campo"><span>Opción</span>${es.opciones.map((o, i) => `<label class="opc-f"><input type="radio" name="op" value="${esc(o.id)}" ${i === 0 ? "checked" : ""}><span><b>Opción ${esc(o.id)}</b><small>${esc(o.nombre)}</small></span><b class="e-cifra">${esc(Q(o.k.total))}</b></label>`).join("")}</div>` : ""}
          ${es.extras.length ? `<div class="f-campo"><span>Extras que quiso</span>${es.extras.map(x => `<label class="opc-f"><input type="checkbox" name="x" value="${esc(x.id)}"><span><b>${esc(x.nombre)}</b></span><b class="e-cifra">+ ${esc(Q(x.monto))}</b></label>`).join("")}</div>` : ""}
          <p class="suave" style="margin:0;font-size:13.5px">La cotización queda con eso: total, lista de materiales y obra.</p>`,
        alGuardar: async f => {
          c.eleccion = { opcion: f.op ? (f.querySelector("[name=op]:checked") || {}).value || null : null, extras: [...f.querySelectorAll("[name=x]:checked")].map(x => x.value) };
          verOp = null; verX = null;
          A().cerrarCapas(); boton.dataset.elegido = "1"; boton.click();
        } });
    };
    const moverPartida = i => {
      const p = c.partidas[i];
      A().modal({ titulo: "¿En qué va?", guardarTxt: "Mover",
        cuerpo: `<p class="suave" style="margin:0;font-size:13.5px"><b style="color:var(--text)">${esc(k.partidas[i].descripcion)}</b></p>${gruposOp().map(g => `<label class="opc-f"><input type="radio" name="g" value="${esc(g || "")}" ${(p.grupo || null) === g ? "checked" : ""}><span><b>${esc(D.nombreGrupo(c, g))}</b><small>${!g ? "Sale en todas las opciones" : g[0] === "o" ? "Solo si escoge esta opción" : "Se suma si lo quiere"}</small></span></label>`).join("")}`,
        alGuardar: async f => { const val = (f.querySelector("[name=g]:checked") || {}).value || ""; p.grupo = val || null; A().cerrarCapas(); pintarPartidas(); marcar(); pintarTotales(); }
      });
    };
    const opciones = () => {
      const o = JSON.parse(JSON.stringify(c.opciones || { lista: [], extras: [] }));
      o.lista = o.lista || []; o.extras = o.extras || [];
      const letra = () => "ABCDEFGH".split("").find(l => !o.lista.some(x => x.id === l));
      const nx = () => { let n = 1; while (o.extras.some(x => x.id === "x" + n)) n++; return "x" + n; };
      const pin = f => {
        f.querySelector("[data-op-l]").innerHTML = o.lista.map((x, i) => `<div class="op-fila"><span class="op-letra">${esc(x.id)}</span><input data-op-n="${i}" value="${esc(x.nombre)}" placeholder="Por ejemplo: transformador 50 kVA" aria-label="Nombre de la opción ${esc(x.id)}" autocomplete="off"><button class="s-btn suave-b chico" type="button" data-op-q="${i}">Quitar</button></div>`).join("") || `<p class="suave" style="margin:0;font-size:13.5px">Sin opciones: una sola propuesta.</p>`;
        f.querySelector("[data-ex-l]").innerHTML = o.extras.map((x, i) => `<div class="op-fila"><span class="op-letra ex">+</span><input data-ex-n="${i}" value="${esc(x.nombre)}" placeholder="Por ejemplo: alumbrado del parqueo" aria-label="Nombre del extra" autocomplete="off"><button class="s-btn suave-b chico" type="button" data-ex-q="${i}">Quitar</button></div>`).join("") || `<p class="suave" style="margin:0;font-size:13.5px">Sin extras.</p>`;
      };
      A().modal({ titulo: "Opciones y extras", guardarTxt: "Listo",
        cuerpo: `<p class="suave" style="margin:0;font-size:13.5px">Lo que va en todas se pone una vez; cada opción lleva solo lo que cambia. Después, con «Mover», se dice en qué va cada renglón.</p>
          <div class="f-campo"><span>Opciones · el cliente escoge una</span><div class="op-l" data-op-l></div><button class="s-btn suave-b chico" type="button" data-op-mas>${ico("plus", 14)}Agregar opción</button></div>
          <div class="f-campo"><span>Extras · se suman si los quiere</span><div class="op-l" data-ex-l></div><button class="s-btn suave-b chico" type="button" data-ex-mas>${ico("plus", 14)}Agregar extra</button></div>`,
        alAbrir: (f, mm) => {
          pin(f);
          f.addEventListener("input", ev => { const t = ev.target; if (t.dataset.opN != null) o.lista[Number(t.dataset.opN)].nombre = t.value; if (t.dataset.exN != null) o.extras[Number(t.dataset.exN)].nombre = t.value; });
          mm.addEventListener("click", ev => {
            if (ev.target.closest("[data-op-mas]")) { const l = letra(); if (!l) return; o.lista.push({ id: l, nombre: "" }); if (o.lista.length === 1) o.lista.push({ id: letra(), nombre: "" }); pin(f); [...f.querySelectorAll("[data-op-n]")].find(x => !x.value)?.focus(); }
            if (ev.target.closest("[data-ex-mas]")) { o.extras.push({ id: nx(), nombre: "" }); pin(f); f.querySelector(`[data-ex-n="${o.extras.length - 1}"]`)?.focus(); }
            const q1 = ev.target.closest("[data-op-q]"); if (q1) { const [x] = o.lista.splice(Number(q1.dataset.opQ), 1); pin(f); }
            const q2 = ev.target.closest("[data-ex-q]"); if (q2) { const [x] = o.extras.splice(Number(q2.dataset.exQ), 1); pin(f); }
          });
        },
        alGuardar: async () => {
          if (o.lista.length === 1) throw new Error("Con opciones hacen falta al menos dos. Agregue otra o quite la que hay.");
          if ([...o.lista, ...o.extras].some(x => !String(x.nombre || "").trim())) throw new Error("Escriba el nombre de cada opción y de cada extra.");
          o.lista.forEach(x => { x.nombre = x.nombre.trim(); }); o.extras.forEach(x => { x.nombre = x.nombre.trim(); });
          let movidos = 0;
          c.opciones = o.lista.length || o.extras.length ? o : null;
          const validos = new Set(gruposOp());
          c.partidas.forEach(pp => { if (pp.grupo && !validos.has(pp.grupo)) { pp.grupo = null; movidos++; } });
          if (c.eleccion) c.eleccion = null;
          verOp = null; verX = null;
          A().cerrarCapas(); k = D.calcularCotizacion(c, cat, verEsc()); pintarPartidas(); marcar(); pintarTotales();
          aviso(movidos ? `Listo. ${movidos} ${movidos === 1 ? "renglón pasó" : "renglones pasaron"} a «Va en todas».` : c.opciones ? "Listo. Ahora use «Mover» en cada renglón." : "Listo.");
        } });
    };
    v.onclick = async e => {
      if (e.target.closest("[data-opciones]")) { if (fijo()) { aviso("Para cambiar las opciones, pase la cotización a Borrador.", "mal"); return; } opciones(); return; }
      const mg = e.target.closest("[data-pgrupo]"); if (mg) { moverPartida(Number(mg.dataset.pgrupo)); return; }
      if (e.target.closest("[data-conteo]")) {
        const pl = await D.plano("cot", c.id); if (!pl) return;
        await window.EMT_CONTEO.revisar({ d: pl.datos, mc: pl.machote, c, guardarPlano: () => D.guardarPlano("cot", c.id, pl.datos, pl.machote),
          aplicar: async () => { k = D.calcularCotizacion(c, cat); pintarPartidas(); marcar(); pintarTotales(); pintarCnt(); } });
        return;
      }
      if (e.target.closest("[data-enl-mandar]")) { window.EMT_ENLACES.mandar(enlO).catch(err => aviso(err.message, "mal")); return; }
      const a = e.target.closest("[data-add-est]");
      if (a) { const eid = Number(a.dataset.addEst); const ya = c.partidas.find(x => x.estructura_id === eid && (x.grupo || null) === (hayOp() ? destino : null)); if (ya) ya.cantidad += 1; else c.partidas.push({ grupo: hayOp() ? destino : null, estructura_id: eid, descripcion: "", cantidad: 1, costo_materiales: 0, mano_obra: 0, precio_unitario: 0 }); buscaEst.value = ""; resEst.hidden = true; k = D.calcularCotizacion(c, cat); pintarPartidas(); marcar(); pintarTotales(); const i = ya ? c.partidas.indexOf(ya) : c.partidas.length - 1; const inp = partBox.querySelector(`[data-pcant="${i}"]`); inp?.focus(); inp?.select(); }
      const am = e.target.closest("[data-add-mat]");
      if (am) { const mid = Number(am.dataset.addMat); const ya = c.partidas.find(x => x.material_id === mid && (x.grupo || null) === (hayOp() ? destino : null)); if (ya) ya.cantidad += 1; else c.partidas.push({ grupo: hayOp() ? destino : null, estructura_id: null, material_id: mid, descripcion: "", cantidad: 1, costo_materiales: 0, mano_obra: 0, precio_unitario: 0 }); buscaEst.value = ""; resEst.hidden = true; k = D.calcularCotizacion(c, cat); pintarPartidas(); marcar(); pintarTotales(); const i = ya ? c.partidas.indexOf(ya) : c.partidas.length - 1; const inp = partBox.querySelector(`[data-pcant="${i}"]`); inp?.focus(); inp?.select(); }
      const pa = e.target.closest("[data-pajustar]"); if (pa && !pa.closest("fieldset:disabled")) ajustar(Number(pa.dataset.pajustar));
      const q = e.target.closest("[data-pquitar]"); if (q) { c.partidas.splice(Number(q.dataset.pquitar), 1); k = D.calcularCotizacion(c, cat); pintarPartidas(); marcar(); pintarTotales(); }
      if (e.target.closest("[data-nuevo-cargo]")) { c.cargos.push({ descripcion: "", monto: 0 }); pintarCargos(); marcar(); cargoBox.querySelector(`[data-gdesc="${c.cargos.length - 1}"]`)?.focus(); }
      const gq = e.target.closest("[data-gquitar]"); if (gq) { c.cargos.splice(Number(gq.dataset.gquitar), 1); pintarCargos(); marcar(); pintarTotales(); }
      const dt = e.target.closest("[data-dtipo]"); if (dt && !dt.closest("fieldset:disabled")) { c.descuento_tipo = dt.dataset.dtipo; $$("[data-dtipo]", v).forEach(b => b.setAttribute("aria-pressed", String(b === dt))); marcar(); pintarTotales(); }
      const es = e.target.closest("[data-estado]");
      if (es && es.dataset.estado !== c.estado && es.dataset.estado === "aprobada" && hayOp() && !es.dataset.elegido) { elegir(es); return; }
      if (es && es.dataset.estado === "rechazada" && c.estado !== "rechazada" && !es.dataset.motivo && window.EMT_SEGUIMIENTO) { window.EMT_SEGUIMIENTO.motivo(c, null, async () => { es.dataset.motivo = "1"; es.click(); }); return; }
      if (es && es.dataset.estado !== c.estado) {
        delete es.dataset.elegido;
        const conMotivo = !!es.dataset.motivo; delete es.dataset.motivo;
        if (es.dataset.estado !== "aprobada") c.eleccion = null;
        const antes = c.estado;
        if (antes === "borrador") congelar();
        c.estado = es.dataset.estado;
        pintarPasos();
        if (antes !== "borrador" && c.estado === "borrador") aviso("En borrador los precios se recalculan con el catálogo de hoy.");
        k = D.calcularCotizacion(c, cat); pintarPartidas(); aplicarFijo(); marcar(); pintarTotales();
        if (conMotivo) { const g = $("[data-guardar-cot]", v); if (g) g.click(); }
      }
      if (e.target.closest("[data-guardar-cot]")) {
        const bs = $$("[data-guardar-cot]", v); bs.forEach(b => { b.disabled = true; });
        try {
          if (c.estado === "borrador") congelar();
          await D.guardarCotizacion(c, D.calcularCotizacion(c, cat));
          if (verAum && c.estado === "borrador") await D.guardarAumentoDefecto(c.aumento_pct);
          sucio = false; const s = $("[data-estado-guardado]", v); if (s) { s.textContent = "Todo guardado"; s.className = "guardado"; }
          aviso("Cotización guardada."); pintarSeg();
        } catch (err) { aviso(err.message, "mal"); }
        finally { bs.forEach(b => { b.disabled = false; }); }
      }
      if (e.target.closest("[data-bajar-mats]")) bajarLista(c, k, cli);
      const ppe = e.target.closest("[data-pp-ed]"); if (ppe && !fijo()) precioPieza(Number(ppe.dataset.ppEd));
      if (e.target.closest("[data-crear-obra]")) {
        if (sucio) { aviso("Guarde primero los cambios de la cotización.", "mal"); return; }
        if (c.estado !== "aprobada") { aviso("La obra se crea con la cotización aprobada.", "mal"); return; }
        window.EMT_OBRAS.desdeCotizacion(c, D.calcularCotizacion(c, cat), cli);
      }
      const ev2 = e.target.closest("[data-exp-ver]");
      if (ev2) { const a = exp().anexos[Number(ev2.dataset.expVer)]; const b = await D.archivo(a.ref); if (!b) { aviso("No se encontró el archivo.", "mal"); return; } const u = URL.createObjectURL(b); const w = window.open(u, "_blank"); if (w) w.opener = null; setTimeout(() => URL.revokeObjectURL(u), 60000); return; }
      const ee2 = e.target.closest("[data-exp-ed]");
      if (ee2) {
        const i = Number(ee2.dataset.expEd), a = exp().anexos[i];
        A().modal({ titulo: "Archivo del expediente", guardarTxt: "Listo",
          quitar: async () => { exp().anexos.splice(i, 1); await D.quitarArchivo(a.ref); A().cerrarCapas(); marcar(); await A().quieto(pintarExp); aviso("Archivo quitado. Recuerde guardar."); },
          cuerpo: `<label class="f-campo">Nombre en el índice<input name="nombre" value="${esc(a.nombre)}" autocomplete="off"></label>`,
          alGuardar: async f => { const n = f.nombre.value.trim(); if (!n) throw new Error("Escriba el nombre."); a.nombre = n; A().cerrarCapas(); marcar(); await A().quieto(pintarExp); } });
        return;
      }
      const eb = e.target.closest("[data-exp-bajar]");
      if (eb) {
        const todos = $$("[data-exp-bajar]", v); todos.forEach(b => { b.disabled = true; });
        aviso("Armando el expediente… puede tardar unos segundos.");
        try {
          const emp = await D.empresa();
          const b = await window.EMT_EXPEDIENTE.armar({ c, k: D.calcularCotizacion(c, cat), cli, emp, contacto: cli && cli.contactos.find(x => x.id === c.contacto_id), sitio: cli && cli.sitios.find(x => x.id === c.sitio_id) });
          window.EMT_PDF.descargar(b, window.EMT_EXPEDIENTE.nombreArchivo(c, cli));
        } catch (err) { aviso(/[áéíóúñ]/i.test(err.message) ? err.message : "No se pudo armar el expediente. Intente otra vez.", "mal"); }
        finally { todos.forEach(b => { b.disabled = false; }); }
        return;
      }
      const bp = e.target.closest("[data-pdf]");
      if (bp) {
        const todos = $$("[data-pdf]", v); todos.forEach(b => { b.disabled = true; });
        aviso("Armando el PDF…");
        try {
          const emp = await D.empresa();
          const kk = D.calcularCotizacion(c, cat);
          const b = await window.EMT_PDF.generar({ c, k: kk, cli, emp, contacto: cli && cli.contactos.find(x => x.id === c.contacto_id), sitio: cli && cli.sitios.find(x => x.id === c.sitio_id) });
          if (bp.dataset.pdf === "ver") window.EMT_PDF.ver(b); else window.EMT_PDF.descargar(b, window.EMT_PDF.nombreArchivo(c, cli));
        } catch (err) { aviso(/[áéíóúñ]/i.test(err.message) ? err.message : "No se pudo armar el PDF. Intente otra vez.", "mal"); }
        finally { todos.forEach(b => { b.disabled = false; }); }
      }
    };
  }

  function bajarLista(c, k, cli) {
    const verCosto = D.puede(A().sesion().perfil, "verCosto");
    const celda = t => `"${String(t == null ? "" : t).replace(/"/g, '""')}"`;
    const verAum = D.puede(A().sesion().perfil, "verAumento");
    const n2 = x => x == null ? "" : Number(x).toFixed(2);
    const filas = [["Código", "Material", "Unidad", "Cantidad", ...(verCosto ? ["Costo"] : []), ...(verAum ? ["Costo c/u", "Al cliente c/u", "Gana c/u", "Gana total"] : [])]].concat(k.materiales.map(m => [m.material.codigo, m.material.descripcion, m.material.unidad || "", m.cantidad, ...(verCosto ? [n2(m.costo)] : []), ...(verAum ? [n2(m.costoU), n2(m.precioU), n2(m.gananciaU), n2(m.ganancia)] : [])]));
    const csv = "﻿" + filas.map(f => f.map(celda).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${c.numero} materiales${cli ? " - " + cli.nombre : ""}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function delCliente(clienteId) {
    const l = await D.cotizaciones();
    return l.filter(c => c.cliente_id === clienteId);
  }

  return { vista, nueva, delCliente, fechaCorta, CHIP };
})();
