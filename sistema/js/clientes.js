"use strict";
window.EMT_CLIENTES = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const ICONO = { industria: ["building", "marino"], comercio: ["cart", "azul"], gobierno: ["shield", "gris"], residencial: ["home", "verde"], distribuidora: ["zap", "laton"] };
  const VOLT_P = ["13.2 kV", "34.5 kV", "69 kV"];
  const VOLT_S = ["120/240 V", "240/120 V", "208/120 V", "480/277 V"];
  const telLimpio = t => String(t || "").replace(/[^\d+]/g, "");
  const iniciales = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  let tipoF = "", buscaC = "";

  async function vista(v, sub) {
    const id = Number(sub);
    if (sub && id) return ficha(v, id);
    return lista(v);
  }

  async function lista(v) {
    const { $, esc, ico } = A();
    const p = A().sesion().perfil;
    const puede = D.puede(p, "editarCliente");
    const todos = await D.clientes();
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Clientes</h1><p class="desc">Las empresas que le compran a EMTECSA, con sus plantas, contactos, crédito y equipos instalados.</p></div>${puede ? `<button class="s-btn lleno" type="button" data-nuevo-cli>${ico("plus", 16)}Agregar cliente</button>` : ""}</div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: los clientes se guardan en esta computadora y se suben a la base de EMTECSA cuando se conecte.</span></div>`}
        <div class="herr">
          <div class="chips-f" role="group" aria-label="Tipo de cliente">${[["", "Todos"], ...Object.entries(D.TIPOS)].map(([k, n]) => `<button type="button" data-tipo="${k}" aria-pressed="${tipoF === k}">${esc(n)}</button>`).join("")}</div>
          <label class="busca-v"><span class="sr">Buscar cliente</span>${ico("search", 16)}<input type="search" placeholder="Buscar por nombre, NIT, contacto o teléfono" value="${esc(buscaC)}" data-busca-cli></label>
        </div>
        <div data-res-cli></div>
      </div>`;
    const res = $("[data-res-cli]", v);
    const pintar = () => {
      const q = buscaC.toLowerCase().trim(), qn = D.normalNit(buscaC), qt = buscaC.replace(/\D/g, "");
      const l = todos.filter(c => (!tipoF || c.tipo === tipoF) && (!q
        || [c.nombre, c.razon_social, c.codigo, c.correo, ...c.contactos.map(k => k.nombre + " " + (k.correo || ""))].join(" ").toLowerCase().includes(q)
        || (qn.length > 2 && D.normalNit(c.nit).includes(qn))
        || (qt.length > 3 && [c.telefono, ...c.contactos.map(k => k.telefono)].some(t => telLimpio(t).includes(qt)))));
      if (!todos.length) { res.innerHTML = `<div class="vacio"><span class="icono azul">${ico("building", 24)}</span><h2>Todavía no hay clientes</h2><p>Agregue la primera empresa con su NIT. Después le pone sus plantas, contactos y los equipos que tiene instalados.</p>${puede ? `<button class="s-btn lleno" type="button" data-nuevo-cli>${ico("plus", 16)}Agregar cliente</button>` : ""}</div>`; return; }
      res.innerHTML = l.length ? `<div class="grupo-t">${l.length} ${l.length === 1 ? "cliente" : "clientes"}</div><div class="lista">${l.map(c => {
        const [i, col] = ICONO[c.tipo] || ICONO.industria;
        return `<a class="fila" href="#/clientes/${c.id}"><span class="icono ${col}">${ico(i, 18)}</span><span><b>${esc(c.nombre)}</b><small>NIT ${esc(D.nitBonito(c.nit))} · ${esc(D.TIPOS[c.tipo])} · ${c.sitios} ${c.sitios === 1 ? "sitio" : "sitios"} · ${c.contactos.length} ${c.contactos.length === 1 ? "contacto" : "contactos"}</small></span>
          <span class="der">${c.dias_credito ? `<span class="chip verde">Crédito ${c.dias_credito} días</span>` : '<span class="chip gris">Contado</span>'}</span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`; }).join("")}</div>`
        : `<div class="vacio"><h2>Nadie con «${esc(buscaC)}»</h2><p>Busque por nombre, NIT, contacto o teléfono${tipoF ? ", o quite el filtro de tipo" : ""}.</p></div>`;
    };
    pintar();
    $("[data-busca-cli]", v).addEventListener("input", e => { buscaC = e.target.value; pintar(); });
    v.onclick = e => {
      const t = e.target.closest("[data-tipo]");
      if (t) { tipoF = t.dataset.tipo; v.querySelectorAll("[data-tipo]").forEach(b => b.setAttribute("aria-pressed", String(b === t))); pintar(); }
      if (e.target.closest("[data-nuevo-cli]")) editarCliente(null);
    };
  }

  async function ficha(v, id) {
    const { $, esc, ico, Q } = A();
    const c = await D.cliente(id);
    const cots = c ? await window.EMT_COTIZACIONES.delCliente(id) : [];
    const p = A().sesion().perfil;
    const edC = D.puede(p, "editarCliente"), edQ = D.puede(p, "editarEquipo");
    if (!c) { v.innerHTML = `<div class="vacio"><h2>No se encontró ese cliente</h2><p>Puede que lo hayan quitado.</p><a class="s-btn suave-b" href="#/clientes">Ver clientes</a></div>`; return; }
    const [ic, col] = ICONO[c.tipo] || ICONO.industria;
    const nitOk = D.nitValido(c.nit);
    const sitioDe = sid => (c.sitios.find(s => s.id === sid) || {}).nombre;
    const equipoTxt = q => {
      const nom = { transformador: "Transformador", tablero: "Tablero", medidor: "Medidor", otro: "Equipo" }[q.tipo] || "Equipo";
      return [nom + (q.kva ? ` ${A().cant(q.kva)} kVA` : ""), q.fases ? (q.fases === 3 ? "trifásico" : "monofásico") : ""].filter(Boolean).join(" · ");
    };
    v.innerHTML = `
      <div class="cuerpo">
        <a class="volver" href="#/clientes">${ico("chev", 16, 2.2)}Clientes</a>
        <div class="cab-v">
          <div class="cab-cli"><span class="icono ${col} grande">${ico(ic, 26)}</span><div><h1 class="t">${esc(c.nombre)}</h1><p>${c.razon_social ? esc(c.razon_social) + " · " : ""}NIT ${esc(D.nitBonito(c.nit))} · ${esc(D.TIPOS[c.tipo])} · ${esc(c.codigo)}</p>${!nitOk ? `<p class="aviso-nit">${ico("alerta", 15)}El dígito verificador del NIT no coincide. Revíselo.</p>` : ""}</div></div>
          <div class="fila-b">${edC ? `<button class="s-btn suave-b" type="button" data-ed-cli>${ico("pen", 15)}Editar</button>` : ""}${D.puede(p, "editarCotizacion") ? `<button class="s-btn lleno" type="button" data-nueva-cot>${ico("plus", 16)}Nueva cotización</button>` : ""}</div>
        </div>
        <div class="datos-cli">
          <div><small>Dirección fiscal</small><span>${esc(c.direccion || "—")}</span></div>
          <div><small>Teléfono</small><span>${c.telefono ? `<a href="tel:${esc(telLimpio(c.telefono))}">${esc(c.telefono)}</a>` : "—"}</span></div>
          <div><small>Correo</small><span>${c.correo ? `<a href="mailto:${esc(c.correo)}">${esc(c.correo)}</a>` : "—"}</span></div>
          <div><small>Crédito</small><span>${c.dias_credito ? `${c.dias_credito} días` : "Contado"}${c.limite_credito != null ? ` · límite <span class="e-cifra">${esc(Q(c.limite_credito))}</span>` : ""}</span></div>
          ${c.notas ? `<div class="ancho2"><small>Notas</small><span>${esc(c.notas)}</span></div>` : ""}
        </div>

        <div class="sub"><h2>Sitios · ${c.sitios.length}</h2>${edC ? `<button class="s-btn suave-b" type="button" data-nuevo-sitio>${ico("plus", 15)}Agregar sitio</button>` : ""}</div>
        ${c.sitios.length ? c.sitios.map(s => `
          <section class="sitio">
            <div class="sitio-cab"><span class="icono azul">${ico("map", 18)}</span><div><b>${esc(s.nombre)}</b><small>${esc([s.direccion, s.municipio, s.departamento].filter(Boolean).join(", ") || "Sin dirección")}</small></div>
              <div class="acc">${s.lat != null ? `<a class="s-ib" href="https://www.google.com/maps?q=${s.lat},${s.lng}" target="_blank" rel="noopener" aria-label="Abrir ${esc(s.nombre)} en el mapa">${ico("map", 16)}</a>` : ""}${edC ? `<button class="s-ib" type="button" aria-label="Editar ${esc(s.nombre)}" data-ed-sitio="${s.id}">${ico("pen", 15)}</button>` : ""}</div></div>
            <div class="equipos">${s.equipos.length ? s.equipos.map(q => `<div class="equipo"><span class="icono laton chico">${ico("zap", 15)}</span><div><b>${esc(equipoTxt(q))}</b><small>${esc([[q.voltaje_primario, q.voltaje_secundario].filter(Boolean).join(" → "), q.marca, q.serie ? "serie " + q.serie : "", q.anio].filter(Boolean).join(" · ") || "Sin datos técnicos")}</small></div>
              ${edQ ? `<div class="acc"><button class="s-ib" type="button" aria-label="Editar equipo" data-ed-equipo="${q.id}">${ico("pen", 15)}</button></div>` : ""}</div>`).join("") : `<p class="suave sin">Sin equipos registrados.</p>`}
              ${edQ ? `<button class="s-btn suave-b chico" type="button" data-nuevo-equipo="${s.id}">${ico("plus", 14)}Agregar equipo</button>` : ""}</div>
          </section>`).join("") : `<div class="vacio chico"><p>Todavía no tiene sitios. Agregue la planta o el lugar donde se trabaja.</p></div>`}

        <div class="sub"><h2>Contactos · ${c.contactos.length}</h2>${edC ? `<button class="s-btn suave-b" type="button" data-nuevo-contacto>${ico("plus", 15)}Agregar contacto</button>` : ""}</div>
        ${c.contactos.length ? `<div class="lista">${c.contactos.map(k => `
          <div class="fila contacto" style="cursor:default"><span class="av-k">${esc(iniciales(k.nombre))}</span><span><b>${esc(k.nombre)}${k.principal ? ' <span class="chip azul">Principal</span>' : ""}</b><small>${esc([k.puesto, sitioDe(k.sitio_id)].filter(Boolean).join(" · ") || "Sin puesto")}${k.telefono ? " · " + esc(k.telefono) : ""}</small></span>
            <span class="acc">${k.telefono ? `<a class="s-ib" href="tel:${esc(telLimpio(k.telefono))}" aria-label="Llamar a ${esc(k.nombre)}">${ico("phone", 15)}</a>` : ""}${k.correo ? `<a class="s-ib" href="mailto:${esc(k.correo)}" aria-label="Escribir a ${esc(k.nombre)}">${ico("send", 15)}</a>` : ""}${edC ? `<button class="s-ib" type="button" aria-label="Editar ${esc(k.nombre)}" data-ed-contacto="${k.id}">${ico("pen", 15)}</button>` : ""}</span></div>`).join("")}</div>` : `<div class="vacio chico"><p>Todavía no tiene contactos.</p></div>`}

        <div class="sub"><h2>Cotizaciones · ${cots.length}</h2></div>
        ${cots.length ? `<div class="lista">${cots.map(q => `<a class="fila" href="#/cotizaciones/${q.id}"><span class="icono laton">${ico("file", 18)}</span><span><b>${esc(q.numero)}${q.titulo ? " · " + esc(q.titulo) : ""}</b><small>${esc(window.EMT_COTIZACIONES.fechaCorta(q.fecha))}</small></span><span class="der"><span class="e-cifra">${esc(Q(q.total))}</span><small><span class="chip ${window.EMT_COTIZACIONES.CHIP[q.estado]}">${esc(D.ESTADOS[q.estado])}</span></small></span><span class="chev">${ico("chev", 16, 2.2)}</span></a>`).join("")}</div>` : `<div class="vacio chico"><p>Todavía no tiene cotizaciones.</p></div>`}
      </div>`;
    v.onclick = e => {
      if (e.target.closest("[data-ed-cli]")) editarCliente(c);
      if (e.target.closest("[data-nueva-cot]")) window.EMT_COTIZACIONES.nueva(c.id);
      if (e.target.closest("[data-nuevo-sitio]")) editarSitio(c, null);
      const es = e.target.closest("[data-ed-sitio]"); if (es) editarSitio(c, c.sitios.find(s => s.id === Number(es.dataset.edSitio)));
      if (e.target.closest("[data-nuevo-contacto]")) editarContacto(c, null);
      const ek = e.target.closest("[data-ed-contacto]"); if (ek) editarContacto(c, c.contactos.find(k => k.id === Number(ek.dataset.edContacto)));
      const nq = e.target.closest("[data-nuevo-equipo]"); if (nq) editarEquipo(Number(nq.dataset.nuevoEquipo), null);
      const eq = e.target.closest("[data-ed-equipo]"); if (eq) { const q = c.sitios.flatMap(s => s.equipos).find(x => x.id === Number(eq.dataset.edEquipo)); editarEquipo(q.sitio_id, q); }
      const qq = e.target.closest("[data-quitar]"); if (qq) { const [t, i] = qq.dataset.quitar.split(":"); confirmarQuitar(t, Number(i), qq.getAttribute("aria-label").replace(/^Quitar /, "")); }
    };
  }

  async function recargar() {
    const [, sub = ""] = location.hash.replace(/^#\/?/, "").split("/");
    await A().quieto(() => vista(document.getElementById("vista"), sub));
  }

  function confirmarQuitar(tabla, id, que) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const m = modal({ titulo: "¿Quitar?", guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita <b style="color:var(--text)">${esc(que)}</b> de este cliente. No se puede deshacer.</p>`,
      alGuardar: async () => { await D.quitar(tabla, id); cerrarCapas(); aviso("Listo, se quitó."); await recargar(); } });
    m.querySelector("[data-guardar]").classList.add("peligro-b");
  }

  async function editarCliente(c) {
    const { modal, esc, campoMonto, formatoAlSalir, numero, cerrarCapas, aviso, ir } = A();
    const nuevo = !c;
    const c0 = c || { codigo: await D.codigoNuevo(), nombre: "", razon_social: "", nit: "", tipo: tipoF || "industria", direccion: "", telefono: "", correo: "", dias_credito: 0, limite_credito: null, notas: "" };
    modal({
      titulo: nuevo ? "Cliente nuevo" : "Editar cliente",
      cuerpo: `
        <div class="f-fila"><label class="f-campo">Código<input name="codigo" value="${esc(c0.codigo)}" autocomplete="off"></label>
        <label class="f-campo">Tipo<select name="tipo">${Object.entries(D.TIPOS).map(([k, n]) => `<option value="${k}" ${c0.tipo === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label></div>
        <label class="f-campo">Nombre comercial<input name="nombre" value="${esc(c0.nombre)}" autocomplete="off" placeholder="Como lo conocen"></label>
        <label class="f-campo">Razón social<input name="razon_social" value="${esc(c0.razon_social || "")}" autocomplete="off" placeholder="Nombre legal de la empresa"></label>
        <div class="f-fila"><label class="f-campo">NIT<input name="nit" value="${esc(c0.nit ? D.nitBonito(c0.nit) : "")}" autocomplete="off" placeholder="1234567-8 o CF"><small data-nit-ok></small></label>
        <label class="f-campo">Teléfono<input name="telefono" value="${esc(c0.telefono || "")}" inputmode="tel" autocomplete="off"></label></div>
        <label class="f-campo">Correo<input name="correo" type="email" value="${esc(c0.correo || "")}" autocomplete="off"></label>
        <label class="f-campo">Dirección fiscal<input name="direccion" value="${esc(c0.direccion || "")}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">Días de crédito<input name="dias" inputmode="numeric" value="${esc(c0.dias_credito || 0)}" autocomplete="off"><small>0 es al contado.</small></label>
        ${campoMonto("limite", "Límite de crédito", c0.limite_credito, "Opcional.")}</div>
        <label class="f-campo">Notas<textarea name="notas" rows="3">${esc(c0.notas || "")}</textarea></label>`,
      alAbrir: f => {
        formatoAlSalir(f);
        const hint = () => { const el = f.querySelector("[data-nit-ok]"); const t = f.nit.value.trim(); if (!t) { el.textContent = ""; return; } const ok = D.nitValido(t); el.textContent = ok ? "NIT con dígito verificador correcto." : "El dígito verificador no coincide; revíselo."; el.className = ok ? "ok" : "mal"; };
        f.nit.addEventListener("input", hint); f.nit.addEventListener("blur", () => { if (f.nit.value.trim()) f.nit.value = D.nitBonito(f.nit.value); hint(); }); hint();
      },
      alGuardar: async f => {
        const datos = { id: c ? c.id : null, codigo: f.codigo.value, tipo: f.tipo.value, nombre: f.nombre.value, razon_social: f.razon_social.value, nit: f.nit.value, telefono: f.telefono.value, correo: f.correo.value, direccion: f.direccion.value, dias_credito: f.dias.value.trim() === "" ? 0 : Number(f.dias.value), limite_credito: numero(f.limite.value), notas: f.notas.value };
        const id = await D.guardarCliente(datos);
        cerrarCapas(); aviso(nuevo ? "Cliente agregado." : "Cliente guardado.");
        if (nuevo) ir("clientes", id); else await recargar();
      }
    });
  }

  function editarSitio(c, s) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const s0 = s || { nombre: "", direccion: "", municipio: "", departamento: "", lat: null, lng: null };
    modal({
      titulo: s ? "Editar sitio" : "Sitio nuevo",
      quitar: s ? () => confirmarQuitar("sitios", s.id, s.nombre) : null,
      cuerpo: `
        <label class="f-campo">Nombre del sitio<input name="nombre" value="${esc(s0.nombre)}" autocomplete="off" placeholder="Planta Villa Nueva, Bodega central…"></label>
        <label class="f-campo">Dirección<input name="direccion" value="${esc(s0.direccion || "")}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">Municipio<input name="municipio" value="${esc(s0.municipio || "")}" autocomplete="off"></label>
        <label class="f-campo">Departamento<select name="departamento"><option value="">Sin escoger</option>${D.DEPARTAMENTOS.map(d => `<option ${s0.departamento === d ? "selected" : ""}>${d}</option>`).join("")}</select></label></div>
        <label class="f-campo">Ubicación<input name="mapa" value="${s0.lat != null ? esc(s0.lat + ", " + s0.lng) : ""}" autocomplete="off" placeholder="Pegue el enlace de Google Maps"><small data-coords>Abra el lugar en Google Maps, copie el enlace y péguelo aquí.</small></label>`,
      alAbrir: f => {
        const ver = () => { const el = f.querySelector("[data-coords]"); const t = f.mapa.value.trim(); if (!t) { el.textContent = "Abra el lugar en Google Maps, copie el enlace y péguelo aquí."; el.className = ""; return; } const k = D.coordsDe(t); el.textContent = k ? `Ubicación encontrada: ${k.lat}, ${k.lng}` : "No se encuentra la ubicación en ese texto."; el.className = k ? "ok" : "mal"; };
        f.mapa.addEventListener("input", ver); ver();
      },
      alGuardar: async f => {
        await D.guardarSitio({ id: s ? s.id : null, cliente_id: c.id, nombre: f.nombre.value, direccion: f.direccion.value, municipio: f.municipio.value, departamento: f.departamento.value, mapa: f.mapa.value.trim() });
        cerrarCapas(); aviso(s ? "Sitio guardado." : "Sitio agregado."); await recargar();
      }
    });
  }

  function editarContacto(c, k) {
    const { modal, esc, cerrarCapas, aviso } = A();
    const k0 = k || { nombre: "", puesto: "", telefono: "", correo: "", sitio_id: null, principal: !c.contactos.length };
    modal({
      titulo: k ? "Editar contacto" : "Contacto nuevo",
      quitar: k ? () => confirmarQuitar("contactos", k.id, k.nombre) : null,
      cuerpo: `
        <label class="f-campo">Nombre<input name="nombre" value="${esc(k0.nombre)}" autocomplete="off"></label>
        <div class="f-fila"><label class="f-campo">Puesto o área<input name="puesto" value="${esc(k0.puesto || "")}" autocomplete="off" placeholder="Gerencia, mantenimiento, compras…"></label>
        <label class="f-campo">Sitio<select name="sitio"><option value="">Todos los sitios</option>${c.sitios.map(s => `<option value="${s.id}" ${k0.sitio_id === s.id ? "selected" : ""}>${esc(s.nombre)}</option>`).join("")}</select></label></div>
        <div class="f-fila"><label class="f-campo">Teléfono<input name="telefono" value="${esc(k0.telefono || "")}" inputmode="tel" autocomplete="off"></label>
        <label class="f-campo">Correo<input name="correo" type="email" value="${esc(k0.correo || "")}" autocomplete="off"></label></div>
        <label class="f-check"><input type="checkbox" name="principal" ${k0.principal ? "checked" : ""}><span>Contacto principal del cliente</span></label>`,
      alGuardar: async f => {
        await D.guardarContacto({ id: k ? k.id : null, cliente_id: c.id, nombre: f.nombre.value, puesto: f.puesto.value, sitio_id: f.sitio.value ? Number(f.sitio.value) : null, telefono: f.telefono.value, correo: f.correo.value, principal: f.principal.checked });
        cerrarCapas(); aviso(k ? "Contacto guardado." : "Contacto agregado."); await recargar();
      }
    });
  }

  function editarEquipo(sitioId, q) {
    const { modal, esc, cerrarCapas, aviso, cant } = A();
    const q0 = q || { tipo: "transformador", kva: null, fases: 1, voltaje_primario: "13.2 kV", voltaje_secundario: "", marca: "", serie: "", anio: null, notas: "" };
    modal({
      titulo: q ? "Editar equipo" : "Equipo nuevo",
      quitar: q ? () => confirmarQuitar("equipos", q.id, "el equipo " + equipoTxt(q)) : null,
      cuerpo: `
        <div class="f-fila"><label class="f-campo">Tipo<select name="tipo">${[["transformador", "Transformador"], ["tablero", "Tablero"], ["medidor", "Medidor"], ["otro", "Otro"]].map(([v2, n]) => `<option value="${v2}" ${q0.tipo === v2 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="f-campo">Fases<select name="fases"><option value="">Sin dato</option><option value="1" ${q0.fases === 1 ? "selected" : ""}>Monofásico</option><option value="3" ${q0.fases === 3 ? "selected" : ""}>Trifásico</option></select></label></div>
        <div class="f-fila"><label class="f-campo">kVA<input name="kva" inputmode="decimal" value="${q0.kva == null ? "" : esc(cant(q0.kva))}" autocomplete="off"></label>
        <label class="f-campo">Año<input name="anio" inputmode="numeric" value="${q0.anio == null ? "" : esc(q0.anio)}" autocomplete="off"></label></div>
        <div class="f-fila"><label class="f-campo">Voltaje primario<input name="vp" list="volt-p" value="${esc(q0.voltaje_primario || "")}" autocomplete="off"></label>
        <label class="f-campo">Voltaje secundario<input name="vs" list="volt-s" value="${esc(q0.voltaje_secundario || "")}" autocomplete="off"></label></div>
        <datalist id="volt-p">${VOLT_P.map(x => `<option value="${x}">`).join("")}</datalist><datalist id="volt-s">${VOLT_S.map(x => `<option value="${x}">`).join("")}</datalist>
        <div class="f-fila"><label class="f-campo">Marca<input name="marca" value="${esc(q0.marca || "")}" autocomplete="off"></label>
        <label class="f-campo">Número de serie<input name="serie" value="${esc(q0.serie || "")}" autocomplete="off"></label></div>
        <label class="f-campo">Notas<textarea name="notas" rows="2">${esc(q0.notas || "")}</textarea></label>`,
      alGuardar: async f => {
        await D.guardarEquipo({ id: q ? q.id : null, sitio_id: sitioId, tipo: f.tipo.value, fases: f.fases.value, kva: f.kva.value.trim(), anio: f.anio.value.trim(), voltaje_primario: f.vp.value, voltaje_secundario: f.vs.value, marca: f.marca.value, serie: f.serie.value, notas: f.notas.value });
        cerrarCapas(); aviso(q ? "Equipo guardado." : "Equipo agregado."); await recargar();
      }
    });
  }

  return { vista };
})();
