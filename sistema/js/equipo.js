"use strict";
window.EMT_EQUIPO = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const PEST = [["personas", "Personas"], ["permisos", "Permisos"], ["historial", "Historial"]];
  const TIPOS_H = { cotizacion: ["azul", "file"], obra: ["laton", "hammer"], dinero: ["claro", "wallet"], catalogo: ["gris", "box"], cliente: ["azul", "building"], usuario: ["laton", "users"], permisos: ["laton", "shield"], empresa: ["gris", "building"], otro: ["gris", "file"] };
  let pest = "personas", rolSel = "ventas", buscaP = "", buscaH = "", quienH = "";

  const cuando = iso => { if (!iso) return ""; const f = new Date(iso); return f.toLocaleString("es-GT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
  const iniciales = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();

  async function vista(v, sub) {
    const { esc, ico } = A();
    const p = A().sesion().perfil;
    if (p.rol !== "gerencia" && !p.probando) { v.innerHTML = `<div class="vacio"><span class="icono gris">${ico("shield", 22)}</span><h2>Solo gerencia</h2><p>El equipo y los permisos los maneja gerencia.</p></div>`; return; }
    if (PEST.some(x => x[0] === sub)) pest = sub;
    v.innerHTML = `<div class="cuerpo">
      <div class="cab-v"><div><h1 class="t">Equipo</h1><p class="desc">Quién entra al sistema, qué puede hacer cada rol y quién hizo cada cambio.</p></div></div>
      ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: las personas que se registren aquí no pueden entrar hasta conectar la base. Puede ver el sistema como otro rol para revisar los permisos.</span></div>`}
      <div class="herr"><nav class="seg" aria-label="Partes del equipo">${PEST.map(([k, n]) => `<a href="#/equipo/${k}" ${pest === k ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav></div>
      <div data-eq></div></div>`;
    const box = v.querySelector("[data-eq]");
    if (pest === "personas") await personas(box);
    else if (pest === "permisos") await permisos(box);
    else await historial(box);
  }

  async function personas(box) {
    const { esc, ico, modal, cerrarCapas, aviso } = A();
    const lista = await D.usuarios();
    const pend = lista.filter(u => !u.aprobado && !u.activo), act = lista.filter(u => u.activo), inact = lista.filter(u => !u.activo && u.aprobado);
    const fila = u => `<div class="fila eq-f" data-txt="${esc((u.nombre + " " + (u.correo || "") + " " + (D.ROLES[u.rol] || "")).toLowerCase())}"><span class="eq-av ${u.activo ? "" : "off"}">${esc(iniciales(u.nombre))}</span><span><b>${esc(u.nombre)}${u.yo ? ' <span class="chip gris chico-c">Usted</span>' : ""}</b><small>${esc(u.correo || "")}</small></span>${u.activo || u.aprobado ? `<span class="der"><span class="chip ${u.activo ? (u.rol === "gerencia" ? "laton" : "azul") : "gris"}">${esc(u.activo ? D.ROLES[u.rol] : "Desactivado")}</span></span><button class="s-ib" type="button" aria-label="Editar a ${esc(u.nombre)}" data-eq-ed="${esc(u.id)}">${ico("pen", 15)}</button>` : `<span class="der"><button class="s-btn lleno chico" type="button" data-eq-ap="${esc(u.id)}">Aprobar</button></span>`}</div>`;
    box.innerHTML = `
      ${pend.length ? `<div class="sub"><h2>Esperando aprobación</h2><span class="suave">${pend.length}</span></div><div class="lista eq-pend">${pend.map(u => fila(u).replace('class="fila eq-f"', 'class="fila eq-f pend"').replace(`<small>${esc(u.correo || "")}`, `<small>${esc(u.correo || "")} · se registró ${esc(cuando(u.creado))}`)).join("")}</div>` : ""}
      <div class="sub"><h2>Personas con acceso</h2><span class="suave">${act.length}</span></div>
      <label class="busca-v ancho-busca"><span class="sr">Buscar persona</span>${ico("search", 16)}<input type="search" data-eq-busca placeholder="Buscar por nombre, correo o rol" value="${esc(buscaP)}" autocomplete="off"></label>
      <div class="lista" data-eq-act>${act.map(fila).join("")}</div>
      ${inact.length ? `<details class="caja plegable eq-inact"><summary><span class="pl-t"><h2>Desactivados</h2><span class="suave">${inact.length} · lo que hicieron sigue a su nombre</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div class="lista">${inact.map(fila).join("")}</div></div></details>` : ""}
      <div class="eq-como"><span class="icono gris">${ico("users", 18)}</span><span><b>¿Cómo entra alguien nuevo?</b><small>En la pantalla de entrada toca «Crear mi cuenta» con su correo. Aparece aquí en «Esperando aprobación»; usted le pone su rol y lo aprueba.</small></span></div>`;
    const filtrar = () => A().filtrar(box.querySelector("[data-eq-act]"), ".fila", buscaP);
    filtrar();
    box.querySelector("[data-eq-busca]").addEventListener("input", e => { buscaP = e.target.value; filtrar(); });
    const editar = (u, aprobar) => {
      const roles = Object.entries(D.ROLES);
      modal({
        titulo: aprobar ? `Aprobar a ${u.nombre}` : u.nombre, guardarTxt: aprobar ? "Aprobar" : "Guardar",
        quitar: !aprobar && u.activo && !u.yo ? async () => { const m = modal({ titulo: `¿Desactivar a ${u.nombre}?`, guardarTxt: "Desactivar", cuerpo: `<p class="suave" style="font-size:15px;margin:0">Ya no podrá entrar al sistema. Todo lo que hizo sigue a su nombre y lo puede volver a activar cuando quiera.</p>`, alGuardar: async () => { await D.guardarUsuario({ ...u, activo: false }); cerrarCapas(); aviso(`${u.nombre} ya no puede entrar.`); await A().quieto(() => personas(box)); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
        quitarTxt: "Desactivar",
        cuerpo: `<label class="f-campo">Nombre<input name="nombre" value="${esc(u.nombre)}" autocomplete="off"></label>
          <p class="suave" style="margin:0;font-size:13.5px">${esc(u.correo || "")}</p>
          <div class="f-campo"><span>Rol</span><div class="eq-roles">${roles.map(([k, n]) => `<label class="opc-f"><input type="radio" name="rol" value="${k}" ${(u.rol || (aprobar ? "" : "ventas")) === k && !aprobar ? "checked" : ""} ${u.yo && k !== "gerencia" ? "disabled" : ""}><span><b>${esc(n)}</b><small>${esc(resumenRol(k))}</small></span></label>`).join("")}</div></div>
          ${!aprobar && !u.activo ? `<label class="sw-fila"><span>Volver a dar acceso</span><input type="checkbox" class="sw" name="reactivar"></label>` : ""}`,
        alGuardar: async f => {
          const rol = (f.querySelector("[name=rol]:checked") || {}).value;
          if (!rol) throw new Error("Escoja el rol.");
          await D.guardarUsuario({ ...u, nombre: f.nombre.value, rol, activo: aprobar || u.activo || !!(f.reactivar && f.reactivar.checked) });
          cerrarCapas(); aviso(aprobar ? `${f.nombre.value.trim()} ya puede entrar como ${D.ROLES[rol]}.` : "Guardado."); await A().quieto(() => personas(box)); insignia();
        }
      });
    };
    box.onclick = e => {
      const a = e.target.closest("[data-eq-ap]"); if (a) { editar(lista.find(u => String(u.id) === a.dataset.eqAp), true); return; }
      const b = e.target.closest("[data-eq-ed]"); if (b) editar(lista.find(u => String(u.id) === b.dataset.eqEd), false);
    };
  }

  const resumenRol = k => k === "gerencia" ? "Todo, incluido el equipo y los permisos." : D.ACCIONES_EQ.flatMap(([, l]) => l).filter(([a]) => D.puede({ rol: k }, a)).slice(0, 3).map(([, n]) => n.toLowerCase()).join(", ") + "…";

  async function permisos(box) {
    const { esc, ico, aviso, modal, cerrarCapas } = A();
    const ef = await D.permisos();
    const roles = D.ROLES_EDIT;
    if (!roles.includes(rolSel)) rolSel = roles[0];
    const pintar = () => {
      const n = D.ACCIONES_EQ.flatMap(([, l]) => l).filter(([k]) => ef[k].includes(rolSel)).length;
      box.innerHTML = `
        <p class="suave" style="margin:0 0 12px;font-size:13.5px">Escoja un rol y marque lo que puede hacer. Gerencia siempre puede todo. Se guarda solo, y vale también en la base de datos.</p>
        <div class="eq-rol-sel"><div class="seg ancho eq-rol-seg" role="group" aria-label="Rol">${roles.map(r => `<button type="button" data-rol="${r}" aria-pressed="${r === rolSel}">${esc(D.ROLES[r])}</button>`).join("")}</div>
          <label class="f-campo eq-rol-movil"><span class="sr">Rol</span><select data-rol-sel>${roles.map(r => `<option value="${r}" ${r === rolSel ? "selected" : ""}>${esc(D.ROLES[r])}</option>`).join("")}</select></label></div>
        <p class="eq-cuenta"><b>${esc(D.ROLES[rolSel])}</b> puede ${n} de ${D.ACCIONES_EQ.flatMap(([, l]) => l).length} cosas.${D.nube ? "" : ` <button class="s-link" type="button" data-ver-como="${rolSel}">Ver el sistema como ${esc(D.ROLES[rolSel])}</button>`}</p>
        ${D.ACCIONES_EQ.map(([g, l]) => `<section class="caja eq-grupo"><h2>${esc(g)}</h2>${l.map(([k, nombre]) => `<label class="sw-fila"><span>${esc(nombre)}<small>${esc(ef[k].length ? "Pueden: Gerencia, " + ef[k].map(r => D.ROLES[r]).join(", ") : "Solo gerencia")}</small></span><input type="checkbox" class="sw" data-perm="${k}" ${ef[k].includes(rolSel) ? "checked" : ""}></label>`).join("")}</section>`).join("")}
        <div class="fila-b"><button class="s-btn suave-b" type="button" data-fabrica>${ico("layers", 15)}Dejar como venía</button></div>`;
    };
    pintar();
    box.onchange = async e => {
      const t = e.target;
      if (t.matches("[data-rol-sel]")) { rolSel = t.value; await A().quieto(async () => pintar()); return; }
      if (!t.dataset.perm) return;
      const k = t.dataset.perm;
      ef[k] = t.checked ? [...new Set([...ef[k], rolSel])] : ef[k].filter(r => r !== rolSel);
      const nombre = D.ACCIONES_EQ.flatMap(([, l]) => l).find(x => x[0] === k)[1];
      try { await D.guardarPermisos(ef, `${t.checked ? "Dio" : "Quitó"} a ${D.ROLES[rolSel]}: ${nombre.toLowerCase()}`); aviso(`${D.ROLES[rolSel]}: ${t.checked ? "ya puede" : "ya no puede"} ${nombre.toLowerCase()}.`); await A().quieto(async () => pintar()); }
      catch (er) { aviso(er.message, "mal"); t.checked = !t.checked; }
    };
    box.onclick = async e => {
      const r = e.target.closest("[data-rol]"); if (r) { rolSel = r.dataset.rol; await A().quieto(async () => pintar()); return; }
      const vc = e.target.closest("[data-ver-como]"); if (vc) { verComo(vc.dataset.verComo); return; }
      if (e.target.closest("[data-fabrica]")) {
        const m = modal({ titulo: "¿Dejar los permisos como venían?", guardarTxt: "Dejar como venían", cuerpo: `<p class="suave" style="font-size:15px;margin:0">Se quitan todos los cambios que hizo en los permisos de los 5 roles.</p>`, alGuardar: async () => { await D.permisosDeFabrica(); cerrarCapas(); aviso("Permisos como venían."); await A().quieto(() => permisos(box)); } });
        m.querySelector("[data-guardar]").classList.add("peligro-b");
      }
    };
  }

  function verComo(rol) {
    try {
      const s = JSON.parse(sessionStorage.getItem("emtecsa.sistema.prueba"));
      s.rolReal = s.rolReal || s.rol; s.rol = rol; s.probando = rol !== s.rolReal; if (!s.probando) delete s.rolReal;
      sessionStorage.setItem("emtecsa.sistema.prueba", JSON.stringify(s));
    } catch (e) {}
    location.hash = "#/hoy"; location.reload();
  }

  async function historial(box) {
    const { esc, ico } = A();
    const l = await D.historial({ limite: 500 });
    const personas = [...new Set(l.map(x => x.quien))].sort((a, b) => a.localeCompare(b, "es"));
    const pintar = () => {
      const q = A().normal(buscaH);
      const f = l.filter(x => (!quienH || x.quien === quienH) && (!q || A().normal(x.texto + " " + x.quien).includes(q)));
      let dia = "";
      const lista = box.querySelector("[data-h-lista]");
      lista.innerHTML = f.length ? f.slice(0, 300).map(x => { const d = new Date(x.fecha).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" }); const cab = d !== dia ? `<p class="h-dia">${esc(d)}</p>` : ""; dia = d; const [c, i] = TIPOS_H[x.tipo] || TIPOS_H.otro; return cab + `<div class="h-f"><span class="icono ${c} chico">${ico(i, 14)}</span><span><b>${esc(x.quien)}</b>${x.rol ? ` <small class="suave">${esc(D.ROLES[x.rol] || "")}</small>` : ""}<p>${esc(x.texto)}</p></span><time>${esc(new Date(x.fecha).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }))}</time></div>`; }).join("") : `<div class="vacio"><h2>${l.length ? "Nada con ese filtro" : "Todavía no hay cambios"}</h2><p>${l.length ? "Pruebe con otra palabra o persona." : "Aquí sale quién creó, cambió o aprobó cotizaciones, obras, pagos, precios y usuarios."}</p></div>`;
    };
    box.innerHTML = `<div class="herr"><label class="busca-v"><span class="sr">Buscar en el historial</span>${ico("search", 16)}<input type="search" data-h-busca placeholder="Buscar: COT-0003, pago, costo…" value="${esc(buscaH)}" autocomplete="off"></label>
      <label class="f-campo h-quien"><span class="sr">Persona</span><select data-h-quien><option value="">Todas las personas</option>${personas.map(n => `<option ${n === quienH ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label></div>
      <div class="caja h-caja" data-h-lista></div>`;
    pintar();
    box.querySelector("[data-h-busca]").addEventListener("input", e => { buscaH = e.target.value; pintar(); });
    box.querySelector("[data-h-quien]").addEventListener("change", e => { quienH = e.target.value; pintar(); });
  }

  async function pendientes() {
    const p = A() && A().sesion() && A().sesion().perfil;
    if (!p || p.rol !== "gerencia") return [];
    try { return (await D.usuarios()).filter(u => !u.aprobado && !u.activo); } catch (e) { return []; }
  }
  async function insignia() {
    const n = (await pendientes()).length;
    const m = document.querySelector(".barra [data-menu]"); if (m) { m.dataset.pEq = n; m.classList.toggle("con-punto", ["pCot", "pTienda", "pEq"].reduce((a, k) => a + Number(m.dataset[k] || 0), 0) > 0); }
    const c = document.querySelector("[data-cuenta]"); if (c) c.classList.toggle("con-punto", n > 0);
  }

  return { vista, pendientes, insignia, verComo };
})();
