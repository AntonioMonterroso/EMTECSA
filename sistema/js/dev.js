"use strict";
window.EMT_DEV = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const sb = D.sbErrores;
  const ORIGEN = { sistema: "Sistema", catalogo: "Catálogo", propuesta: "Página del cliente" };
  const TIPO = { error: ["Error de código", "alerta"], promesa: ["Error de código", "alerta"], pantalla: ["No abrió una pantalla", "file"], base: ["La base respondió con error", "shield"], red: ["Sin conexión con la base", "send"], carga: ["No cargó un archivo", "download"] };
  let filtro = "pendientes", busca = "", ultimos = [], oyendo = false;
  const puedeVer = () => { const s = A() && A().sesion(); return !!(sb && s && (s.perfil.dev || (D.nube && s.perfil.rol === "gerencia"))); };
  const cuando = f => { const d = new Date(f), m = Math.round((Date.now() - d) / 60000); return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : d.toLocaleDateString("es-GT", { day: "numeric", month: "short" }); };

  async function leer() {
    const r = await sb.from("errores_sistema").select("id, creado, origen, huella, tipo, mensaje, pila, pantalla, paso, version, navegador, rol, usuario, resuelto, resuelto_nota, resuelto_por, resuelto_en").order("creado", { ascending: false }).limit(1500);
    if (r.error) throw new Error("No se pudieron leer los errores.");
    return r.data;
  }
  function agrupar(l) {
    const g = new Map();
    l.forEach(e => {
      let x = g.get(e.huella);
      if (!x) { x = { huella: e.huella, mensaje: e.mensaje, tipo: e.tipo, origen: e.origen, pila: e.pila, paso: e.paso, ultimo: e.creado, primero: e.creado, veces: 0, usuarios: new Set(), pantallas: new Set(), versiones: new Set(), navegadores: new Set(), roles: new Set(), pend: 0, nota: null, por: null, en: null, ids: [] }; g.set(e.huella, x); }
      x.veces++; x.ids.push(e.id); x.primero = e.creado;
      x.usuarios.add(e.usuario || "sin cuenta"); if (e.pantalla) x.pantallas.add(e.pantalla); if (e.version) x.versiones.add(e.version); if (e.navegador) x.navegadores.add(navegador(e.navegador)); x.roles.add(e.rol ? (D.ROLES[e.rol] || e.rol) : "Sin cuenta");
      if (!e.resuelto) x.pend++; else if (!x.nota && e.resuelto_nota) { x.nota = e.resuelto_nota; x.por = e.resuelto_por; x.en = e.resuelto_en; }
      if (e.resuelto && !x.en) { x.por = e.resuelto_por; x.en = e.resuelto_en; }
    });
    return [...g.values()].map(x => ({ ...x, volvio: x.pend > 0 && !!x.en })).sort((a, b) => (b.pend > 0) - (a.pend > 0) || String(b.ultimo).localeCompare(String(a.ultimo)));
  }
  const navegador = u => /iPhone|iPad/.test(u) ? "iPhone/iPad" : /Android/.test(u) ? "Android" : /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : /Firefox\//.test(u) ? "Firefox" : "Otro";

  function insignia(grupos) {
    const n = grupos.filter(x => x.pend > 0).length;
    document.querySelectorAll("[data-dev-n]").forEach(b => { b.textContent = n ? " " + n : ""; });
  }
  const esDev = () => { const s = A() && A().sesion(); return !!(sb && s && s.perfil.dev); };
  let ultimaInsignia = 0;
  async function refrescarInsignia(forzar) { if (!esDev() || (!forzar && Date.now() - ultimaInsignia < 60000)) return; ultimaInsignia = Date.now(); try { insignia(agrupar(await leer())); } catch (e) {} }

  function reporte(x) {
    const f = d => new Date(d).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
    return [
      `Error en el sistema de EMTECSA (${(TIPO[x.tipo] || TIPO.error)[0].toLowerCase()})`,
      ``,
      `Mensaje: ${x.mensaje}`,
      `Dónde: ${ORIGEN[x.origen] || x.origen}`,
      `Pantallas: ${[...x.pantallas].join(", ") || "—"}`,
      x.paso ? `Paso: ${x.paso}` : null,
      `Veces: ${x.veces}, a ${x.usuarios.size} ${x.usuarios.size === 1 ? "usuario" : "usuarios"}`,
      `Roles: ${[...x.roles].join(", ")}`,
      `Navegadores: ${[...x.navegadores].join(", ") || "—"}`,
      `Versiones: ${[...x.versiones].join(", ") || "—"}`,
      `Primera vez: ${f(x.primero)} · Última vez: ${f(x.ultimo)}`,
      x.en ? `Se había marcado resuelto${x.nota ? ": " + x.nota : ""}` : null,
      ``,
      `Dónde falló en el código:`,
      x.pila || "(sin detalle)",
      ``,
      `Archivos del sistema: EMTECSA/sistema/js, EMTECSA/catalogo y EMTECSA/propuesta.`,
      `Busca la causa, corrígela sin cambiar nada más y dime qué cambiaste y cómo probarlo.`
    ].filter(l => l !== null).join("\n");
  }
  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {} a.remove(); return ok; }
  }

  function detalle(x, recargar) {
    const { esc, modal, cerrarCapas, aviso } = A();
    const lista = s => [...s].map(esc).join(" · ") || "—";
    const m = modal({
      titulo: (TIPO[x.tipo] || TIPO.error)[0], guardarTxt: x.pend ? "Marcar resuelto" : "Volver a abrir",
      cuerpo: `<p class="dev-msj">${esc(x.mensaje)}</p>
        <div class="datos-cli dev-datos">
          <div><small>Dónde</small><span>${esc(ORIGEN[x.origen] || x.origen)}</span></div>
          <div><small>Veces</small><span>${x.veces} · ${x.usuarios.size} ${x.usuarios.size === 1 ? "usuario" : "usuarios"}</span></div>
          <div><small>Primera vez</small><span>${esc(new Date(x.primero).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }))}</span></div>
          <div><small>Última vez</small><span>${esc(new Date(x.ultimo).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }))}</span></div>
          <div class="ancho2"><small>Pantallas</small><span>${lista(x.pantallas)}</span></div>
          ${x.paso ? `<div class="ancho2"><small>Paso</small><span>${esc(x.paso)}</span></div>` : ""}
          <div><small>Roles</small><span>${lista(x.roles)}</span></div>
          <div><small>Navegadores</small><span>${lista(x.navegadores)}</span></div>
          <div class="ancho2"><small>Versiones</small><span>${lista(x.versiones)}</span></div>
          ${x.en ? `<div class="ancho2"><small>${x.pend ? "Se había resuelto" : "Resuelto"}</small><span>${esc(new Date(x.en).toLocaleDateString("es-GT"))}${x.por ? " · " + esc(x.por) : ""}${x.nota ? " · " + esc(x.nota) : ""}</span></div>` : ""}
        </div>
        <button class="s-btn lleno ancho-b" type="button" data-dev-copiar>${A().ico("file", 16)}Copiar el reporte</button>
        ${x.pila ? `<details class="dev-pila"><summary>Ver dónde falló en el código</summary><pre>${esc(x.pila)}</pre></details>` : ""}
        ${x.pend ? `<label class="f-campo">Qué se arregló<textarea name="nota" rows="2" placeholder="Se corrigió la lectura de…"></textarea></label>` : ""}`,
      alGuardar: async f => {
        const s = A().sesion();
        const cambios = x.pend ? { resuelto: true, resuelto_nota: String(f.nota.value || "").trim() || null, resuelto_por: s.perfil.nombre, resuelto_en: new Date().toISOString() } : { resuelto: false };
        let q = sb.from("errores_sistema").update(cambios).eq("huella", x.huella);
        q = x.pend ? q.eq("resuelto", false) : q.eq("resuelto", true);
        const r = await q;
        if (r.error) throw new Error("No se pudo guardar.");
        cerrarCapas(); aviso(x.pend ? "Marcado como resuelto." : "Volvió a quedar pendiente."); await recargar();
      }
    });
    m.querySelector("[data-dev-copiar]").addEventListener("click", async () => { aviso(await copiar(reporte(x)) ? "Reporte copiado. Péguelo para pedir el arreglo." : "No se pudo copiar. Mantenga presionado el texto para copiarlo.", "bien"); });
    return m;
  }

  async function vista(v) {
    const { esc, ico } = A();
    if (!puedeVer()) { v.innerHTML = `<div class="vacio"><h2>Sin acceso</h2><p>${sb ? "Esta parte la ven Desarrollo y gerencia." : "Los errores se ven cuando la base de EMTECSA está conectada."}</p><a class="s-btn suave-b" href="#/hoy">Regresar a Hoy</a></div>`; return; }
    v.innerHTML = `<div class="cuerpo"><div class="cab-v"><div><h1 class="t">Errores del sistema</h1><p class="desc">Lo que falló a cualquier usuario en el sistema, el catálogo o la página del cliente. Sin montos ni datos de clientes.</p></div></div><p class="suave" style="font-size:13.5px">Cargando…</p></div>`;
    ultimos = await leer();
    const recargar = () => A().quieto(() => vista(v));
    const pintar = () => {
      const g = agrupar(ultimos);
      insignia(g);
      const pend = g.filter(x => x.pend > 0), hoy = ultimos.filter(e => Date.now() - new Date(e.creado) < 86400000).length;
      const vis = filtro === "pendientes" ? pend : filtro === "resueltos" ? g.filter(x => !x.pend) : g;
      v.innerHTML = `<div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Errores del sistema</h1><p class="desc">Lo que falló a cualquier usuario en el sistema, el catálogo o la página del cliente. Sin montos ni datos de clientes.</p></div></div>
        <div class="widgets">
          <div class="w"><span class="w-cab"><span class="icono ambar">${ico("alerta", 18)}</span></span><span class="l">Por resolver</span><b>${pend.length}</b><small>${pend.filter(x => x.volvio).length ? `${pend.filter(x => x.volvio).length} volvieron a pasar` : "Errores distintos"}</small></div>
          <div class="w"><span class="w-cab"><span class="icono azul">${ico("file", 18)}</span></span><span class="l">Últimas 24 horas</span><b>${hoy}</b><small>${hoy === 1 ? "vez" : "veces"} en total</small></div>
          <div class="w"><span class="w-cab"><span class="icono verde">${ico("check", 18)}</span></span><span class="l">Resueltos</span><b>${g.filter(x => !x.pend).length}</b><small>de ${g.length} distintos</small></div>
        </div>
        <div class="herr"><div class="chips-f" role="group" aria-label="Mostrar">${[["pendientes", "Por resolver"], ["resueltos", "Resueltos"], ["todos", "Todos"]].map(([k, n]) => `<button type="button" data-dev-f="${k}" aria-pressed="${filtro === k}">${n}</button>`).join("")}</div>
        <label class="busca-v"><span class="sr">Buscar error</span>${ico("search", 16)}<input type="search" data-dev-busca value="${esc(busca)}" placeholder="Buscar mensaje o pantalla" autocomplete="off"></label></div>
        <div class="lista" data-dev-l>${vis.map(x => `<button class="fila con-lapiz" type="button" data-dev-h="${esc(x.huella)}" data-txt="${esc((x.mensaje + " " + [...x.pantallas].join(" ") + " " + (ORIGEN[x.origen] || "")).toLowerCase())}"><span class="icono ${x.pend ? (x.volvio ? "ambar" : "laton") : "verde"}">${ico(x.pend ? (TIPO[x.tipo] || TIPO.error)[1] : "check", 18)}</span><span><b>${esc(x.mensaje)}</b><small>${esc(ORIGEN[x.origen] || x.origen)} · ${esc([...x.pantallas][0] || "—")} · ${x.veces} ${x.veces === 1 ? "vez" : "veces"} · ${x.usuarios.size} ${x.usuarios.size === 1 ? "usuario" : "usuarios"} · ${esc(cuando(x.ultimo))}</small></span><span class="der">${x.volvio ? '<span class="chip ambar">Volvió</span>' : x.pend ? "" : '<span class="chip verde">Resuelto</span>'}</span><span class="s-ib" aria-hidden="true">${ico("pen", 15)}</span></button>`).join("") || `<div class="vacio chico"><p>${filtro === "pendientes" ? "No hay errores por resolver." : "No hay nada aquí."}</p></div>`}</div>
      </div>`;
      const l = v.querySelector("[data-dev-l]"); A().filtrar(l, ".fila", busca);
    };
    pintar();
    v.oninput = e => { if (e.target.matches("[data-dev-busca]")) { busca = e.target.value; A().filtrar(v.querySelector("[data-dev-l]"), ".fila", busca); } };
    v.onclick = e => {
      const f = e.target.closest("[data-dev-f]"); if (f) { filtro = f.dataset.devF; pintar(); return; }
      const h = e.target.closest("[data-dev-h]"); if (h) { const x = agrupar(ultimos).find(z => z.huella === h.dataset.devH); if (x) detalle(x, recargar); }
    };
  }

  function oir() {
    if (oyendo || !esDev()) return;
    oyendo = true;
    try {
      sb.channel("errores-sistema").on("postgres_changes", { event: "INSERT", schema: "public", table: "errores_sistema" }, async p => {
        const e = p.new || {};
        const enVista = /^#\/errores/.test(location.hash);
        if (enVista && !document.querySelector(".modal")) { const v = document.getElementById("vista"); if (v) { await A().quieto(() => vista(v)); return; } }
        A().aviso(`Error nuevo en ${ORIGEN[e.origen] || "el sistema"}: ${String(e.mensaje || "").slice(0, 90)}`, "mal");
        refrescarInsignia(true);
      }).subscribe();
    } catch (e) { oyendo = false; }
  }

  addEventListener("hashchange", () => { oir(); refrescarInsignia(); });
  setTimeout(() => { oir(); refrescarInsignia(true); }, 1500);
  return { vista, refrescarInsignia };
})();
