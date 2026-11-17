"use strict";
window.EMT_CONTEO = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const cantTxt = (f, cant) => `${cant(f.cantidad)}${f.unidad === "m" || /m \+/.test((f.det || [])[0] || "") ? " m" : ""}`;

  function selector(box, cat, { titulo, actual, filtro, nada = true }, alEscoger, alVolver) {
    const { esc, ico } = A();
    let q = "";
    const todos = [...cat.estructuras.filter(e => !filtro || filtro(e, "e")).map(e => ({ t: "e", codigo: e.codigo, n: e.nombre, s: `${e.codigo} · ${e.voltaje_kv} kV` })), ...cat.materiales.filter(m => !filtro || filtro(m, "m")).map(m => ({ t: "m", codigo: m.codigo, n: m.descripcion, s: `${m.codigo} · material` }))];
    box.innerHTML = `<div class="cnt-sel"><div class="cnt-sel-cab">${alVolver ? `<button class="s-btn suave-b chico" type="button" data-cs-volver>${ico("chev", 14, 2.2)}Volver</button>` : ""}<b>${esc(titulo)}</b></div>
      <label class="busca-v ancho-busca"><span class="sr">Buscar en el catálogo</span>${ico("search", 16)}<input type="search" data-cs-q placeholder="Buscar estructura, material o código" autocomplete="off"></label>
      <div class="cnt-sel-l" data-cs-l></div>
      ${nada ? `<button class="s-btn suave-b chico" type="button" data-cs="-">${ico("x", 14)}No se cotiza</button>` : ""}</div>`;
    const lista = box.querySelector("[data-cs-l]");
    const pin = () => { const nq = A().normal(q); const l = todos.filter(x => !nq || A().normal(x.n + " " + x.codigo).includes(nq)).slice(0, 40); lista.innerHTML = l.map(x => `<button type="button" class="${x.codigo === actual ? "on" : ""}" data-cs="${esc(x.codigo)}"><b>${esc(x.n)}</b><small>${esc(x.s)}</small></button>`).join("") || `<p class="suave">Nada con «${esc(q)}». Si no está, agréguelo primero al catálogo.</p>`; };
    pin();
    box.querySelector("[data-cs-q]").addEventListener("input", e => { q = e.target.value; pin(); });
    box.onclick = e => { const b = e.target.closest("[data-cs]"); if (b) { alEscoger(b.dataset.cs); return; } if (e.target.closest("[data-cs-volver]") && alVolver) alVolver(); };
    box.querySelector("[data-cs-q]").focus({ preventScroll: true });
  }

  async function revisar({ d, mc, guardarPlano, c, aplicar }) {
    const { esc, ico, cant, aviso, modal, cerrarCapas } = A();
    const [cat, cfg] = await Promise.all([D.catalogo(), D.ajustesConteo()]);
    const perfil = A().sesion().perfil;
    const puedePlano = D.puede(perfil, "editarPlano"), puedeEmp = D.puede(perfil, "editarEmpresa");
    const borrador = c && c.estado === "borrador" && D.puede(perfil, "editarCotizacion");
    const yaPlano = c ? c.partidas.filter(p => p.del_plano).length : 0;
    let r = null, cuerpo = null;
    const guardarP = async () => { if (puedePlano) await guardarPlano().catch(er => aviso(er.message, "mal")); };
    const pintar = () => {
      r = D.contarPlano(d, cat, cfg, mc);
      const op = r.op;
      const fila = f => `<div class="cnt-f"><span><b>${esc(f.nombre)}</b>${f.det.length ? `<small>${esc(f.det.filter(Boolean).join(", "))}</small>` : ""}</span><b class="e-cifra">${esc(cantTxt(f, cant))}</b></div>`;
      cuerpo.innerHTML = `
        <div class="cnt-op">
          <label class="f-campo">Tensión<select data-cop="kv">${[13.2, 34.5].map(x => `<option value="${x}" ${Number(op.kv) === x ? "selected" : ""}>${x} kV</option>`).join("")}</select></label>
          <label class="f-campo">Cable de media<select data-cop="calibre">${["4/0 ACSR", "1/0 ACSR"].map(x => `<option ${op.calibre === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
          <label class="f-campo">Triplex<select data-cop="triplex">${["4/0", "1/0"].map(x => `<option ${op.triplex === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        </div>
        <p class="cnt-res">${r.resumen.postes} ${r.resumen.postes === 1 ? "poste" : "postes"} · ${r.resumen.trafos} ${r.resumen.trafos === 1 ? "transformador" : "transformadores"} · ${cant(r.resumen.metros)} m de línea</p>
        ${r.sin.length ? `<div class="cnt-g amb"><h3>${ico("alerta", 15)}Falta decir con qué se cotiza <small>${r.sin.length}</small></h3>${r.sin.map((f, i) => `<div class="cnt-f"><span><b>${esc(f.nombre)}</b><small>${esc(cantTxt(f, cant))}${f.det.filter(Boolean).length ? " · " + esc(f.det.filter(Boolean).join(", ")) : ""}</small></span>${puedePlano || puedeEmp ? `<button class="s-btn suave-b chico" type="button" data-cnt-sin="${i}">Escoger</button>` : ""}</div>`).join("")}</div>` : ""}
        <div class="cnt-g"><h3>Va a la cotización <small>${r.filas.length} ${r.filas.length === 1 ? "renglón" : "renglones"}</small></h3>${r.filas.map(fila).join("") || `<p class="suave" style="margin:0;font-size:13.5px">Todavía nada. Ponga postes proyectados y líneas rojas en el plano.</p>`}</div>
        ${r.postes.length ? `<details class="cnt-g cnt-postes"><summary>Estructura de cada poste <small>${r.postes.length}</small></summary>${r.postes.map((p, i) => `<div class="cnt-p"><span><b>${esc(p.e.cod || "Poste")}</b><small>${p.sit ? esc(D.SITUACION_POSTE[p.sit.sit]) + (p.sit.angulo ? ` · ${p.sit.angulo}°` : "") : "Sin línea de media tensión"}</small></span>${p.sit ? `<select data-cnt-poste="${i}" ${puedePlano ? "" : "disabled"} aria-label="Estructura de ${esc(p.e.cod || "poste")}">${opcionesPoste(cat, p, op)}</select>` : ""}</div>`).join("")}</details>` : ""}
        <p class="suave cnt-nota">${!c ? "" : !borrador ? (c.estado === "borrador" ? "Su usuario no puede cambiar cotizaciones." : "La cotización ya no está en borrador. Para pasarle el conteo, vuélvala a «Borrador».") : yaPlano ? `Ya se pasó antes: se cambian los ${yaPlano} renglones que vinieron del plano. Lo que agregó a mano se queda.` : "Se agregan a lo que ya tiene la cotización."}</p>`;
    };
    const m = modal({
      titulo: "Conteo del plano", guardarTxt: borrador ? "Pasar a la cotización" : "Cerrar",
      cuerpo: `<div data-cnt></div>`,
      alAbrir: (f, mm) => {
        cuerpo = f.querySelector("[data-cnt]");
        pintar();
        mm.addEventListener("change", async e => {
          const t = e.target;
          if (t.dataset.cop) { d.conteo = { ...(d.conteo || {}), [t.dataset.cop]: t.dataset.cop === "kv" ? Number(t.value) : t.value }; await guardarP(); pintar(); return; }
          if (t.dataset.cntPoste != null) { const p = r.postes[Number(t.dataset.cntPoste)]; p.e.est = t.value === "" ? null : t.value; if (p.e.est == null) delete p.e.est; await guardarP(); pintar(); cuerpo.querySelector(".cnt-postes").open = true; }
        });
        mm.addEventListener("click", e => {
          const b = e.target.closest("[data-cnt-sin]"); if (!b) return;
          const s = r.sin[Number(b.dataset.cntSin)];
          const esPoste = /^poste:/.test(s.clave), esTrafo = /^trafo:/.test(s.clave);
          const filtro = esPoste ? (x, t) => t === "e" && x.clase === "linea" && Number(x.voltaje_kv) === Number(r.op.kv) : esTrafo ? (x, t) => t === "e" && x.clase === "transformador" && Number(x.voltaje_kv) === Number(r.op.kv) : null;
          selector(cuerpo, cat, { titulo: `¿Con qué se cotiza: ${s.nombre}?`, filtro, nada: !esTrafo }, async codigo => {
            if (esPoste) { s.ids.forEach(id => { const el = d.elementos.find(x => x.id === id); if (el) el.est = codigo; }); await guardarP(); }
            else if (esTrafo) { const t = cat.estructuras.find(x => x.codigo === codigo); s.ids.forEach(id => { const el = d.elementos.find(x => x.id === id); if (el && t) el.kva = t.kva; }); d.conteo = { ...(d.conteo || {}), kv: t ? Number(t.voltaje_kv) : (d.conteo || {}).kv }; await guardarP(); }
            else if (puedeEmp) { cfg.parejas[s.clave] = codigo; await D.guardarAjustesConteo(cfg).catch(er => aviso(er.message, "mal")); aviso("Listo. Se recuerda para los próximos planos."); }
            else { d.conteo = { ...(d.conteo || {}), parejas: { ...((d.conteo || {}).parejas || {}), [s.clave]: codigo } }; await guardarP(); }
            pintar();
          }, pintar);
        });
      },
      alGuardar: async () => {
        if (!borrador) { cerrarCapas(); return; }
        if (!r.filas.length) throw new Error("No hay nada que pasar todavía.");
        const res = D.aplicarConteo(c, r);
        await aplicar(res, r);
        cerrarCapas();
        aviso(res.antes ? `Se cambiaron los renglones del plano: ahora son ${res.ahora}.` : `Se agregaron ${res.ahora} ${res.ahora === 1 ? "renglón" : "renglones"} del plano.`);
      }
    });
    m.classList.add("modal-cnt");
  }

  function opcionesPoste(cat, p, op) {
    const { esc } = A();
    const linea = cat.estructuras.filter(x => x.clase === "linea" && Number(x.voltaje_kv) === Number(op.kv));
    const g = f => linea.filter(x => Number(x.fases) === f).map(x => `<option value="${esc(x.codigo)}" ${p.propia && p.e.est === x.codigo ? "selected" : ""}>${esc(x.nombre.replace(/^Estructura /, ""))}</option>`).join("");
    return `<option value="" ${!p.propia ? "selected" : ""}>${p.sug ? "Sugerida: " + esc(p.sug.nombre.replace(/^Estructura /, "")) : "Sugerida: no hay en el catálogo"}</option><optgroup label="Monofásicas">${g(1)}</optgroup><optgroup label="Trifásicas">${g(3)}</optgroup><option value="-" ${p.e.est === "-" ? "selected" : ""}>Ninguna</option>`;
  }

  function propsElemento(e, d, cat, cfg, mc) {
    const { esc } = A();
    if (!cat || !cfg) return "";
    const op = D.opcionesConteo(d, cfg, mc);
    const esPoste = /^poste/.test(e.s) || e.s === "tubo_ex" || e.s === "caja_deriv";
    let h = "";
    if (esPoste) {
      const m = Object.fromEntries(d.elementos.map(x => [x.id, x]));
      const sit = D.situacionPoste(d, e, cfg, m);
      if (sit) {
        const sug = D.estructuraSugerida(cat, sit, op, cfg);
        const propia = e.est != null && e.est !== "";
        h += `<label class="f-campo">Estructura para la cotización<select data-pe="est">${opcionesPoste(cat, { e, sug, propia }, op)}</select><small>${esc(D.SITUACION_POSTE[sit.sit])}${sit.angulo ? ` · desvío de ${sit.angulo}°` : ""} · ${sit.fases >= 2 ? "trifásica" : "monofásica"} · ${op.kv} kV · ${esc(op.calibre)}</small></label>`;
      }
    }
    if (e.s === "trafo_pr") h += `<label class="f-campo">Capacidad para la cotización<select data-pe="kva"><option value="">Escoja los kVA</option>${D.KVA_TRAFO.map(k => `<option value="${k}" ${Number(e.kva) === k ? "selected" : ""}>${k} kVA</option>`).join("")}</select></label>`;
    if (["ret_ancla_s", "ret_ancla_d", "ret_vert_s", "ret_vert_d", "ret_poste", "pararrayos", "para_linea", "seccionador", "tierra", "anillo_tierra"].includes(e.s)) h += `<label class="f-check"><input type="checkbox" data-pe="noCot" ${e.noCot ? "checked" : ""}><span>Ya existe: no se cotiza</span></label>`;
    return h ? `<div class="pe-cnt">${h}</div>` : "";
  }

  async function seccionEmpresa(box, puede) {
    const { esc, ico, aviso, modal, cerrarCapas } = A();
    const [cat, cfg] = await Promise.all([D.catalogo(), D.ajustesConteo()]);
    const nombreDe = codigo => { if (codigo === "-") return "No se cotiza"; const e = cat.estructuras.find(x => x.codigo === codigo); if (e) return e.nombre; const m = cat.materiales.find(x => x.codigo === codigo); return m ? m.descripcion : null; };
    const dis = puede ? "" : "disabled";
    const pin = () => {
      box.innerHTML = `
        <p class="suave" style="margin:0;font-size:13.5px">Con esto el plano sugiere las estructuras y saca los metros de cable para la cotización. Se guarda solo.</p>
        <div class="f-fila"><label class="f-campo">Holgura del cable<span class="f-pct"><input data-ce="holgura" inputmode="decimal" value="${esc(cfg.holgura)}" ${dis}><span>%</span></span><small>Por la flecha y los amarres.</small></label>
        <label class="f-campo">«En ángulo» hasta<span class="f-pct"><input data-ce="angulo" inputmode="numeric" value="${esc(cfg.angulo)}" ${dis}><span>°</span></span><small>Más que eso es ángulo grande.</small></label></div>
        <div class="f-campo"><span>Estructura según cómo pasa la línea</span><div class="cnt-tipos">${Object.entries(D.SITUACION_POSTE).map(([k, n]) => `<label><span>${n}</span><select data-ct="${k}" ${dis}>${[1, 2, 3, 4, 5, 6].map(t => `<option value="${t}" ${Number(cfg.tipos[k]) === t ? "selected" : ""}>Tipo ${t}</option>`).join("")}<option value="0" ${!Number(cfg.tipos[k]) ? "selected" : ""}>No se pone</option></select></label>`).join("")}</div></div>
        <div class="f-campo"><span>Cables por línea (con el neutro)</span><div class="f-fila tres">${[["mt1f", "1F"], ["mt2f", "2F"], ["mt3f", "3F"]].map(([k, n]) => `<label class="f-campo">${n}<input data-cc="${k}" inputmode="numeric" value="${esc(cfg.conductores[k])}" ${dis}></label>`).join("")}</div></div>
        <div class="f-campo"><span>Con qué se cotiza cada cosa del plano</span><div class="cnt-par">${D.COSAS_CONTEO.map(([k, n]) => { const c = cfg.parejas[k]; const nn = c ? nombreDe(c) : null; return `<div class="cnt-f"><span><b>${esc(n)}</b><small class="${nn ? "" : "falta"}">${nn ? esc(nn) : "Sin pareja: el plano lo pide al pasar"}</small></span>${puede ? `<button class="s-ib" type="button" aria-label="Cambiar con qué se cotiza ${esc(n)}" data-cpar="${esc(k)}">${ico("pen", 15)}</button>` : ""}</div>`; }).join("")}</div></div>`;
    };
    pin();
    const guardar = async () => { try { await D.guardarAjustesConteo(cfg); aviso("Guardado."); } catch (er) { aviso(er.message, "mal"); } };
    box.addEventListener("change", e => {
      const t = e.target;
      if (t.dataset.ce) { cfg[t.dataset.ce] = Number(String(t.value).replace(",", ".")); guardar(); }
      if (t.dataset.ct) { cfg.tipos[t.dataset.ct] = Number(t.value); guardar(); }
      if (t.dataset.cc) { cfg.conductores[t.dataset.cc] = Number(t.value); guardar(); }
    });
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-cpar]"); if (!b) return;
      const k = b.dataset.cpar, n = (D.COSAS_CONTEO.find(x => x[0] === k) || [])[1];
      modal({ titulo: "Con qué se cotiza", guardarTxt: "Cerrar", soloUno: true, cuerpo: `<div data-cpar-box></div>`,
        alAbrir: f => selector(f.querySelector("[data-cpar-box]"), cat, { titulo: n, actual: cfg.parejas[k] }, async codigo => { cfg.parejas[k] = codigo; await guardar(); cerrarCapas(); pin(); }),
        alGuardar: async () => cerrarCapas() });
    });
  }

  return { revisar, propsElemento, seccionEmpresa };
})();
