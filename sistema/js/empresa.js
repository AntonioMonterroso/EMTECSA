"use strict";
window.EMT_EMPRESA = (() => {
  const GRUPOS_E = [
    ["empresa", "La empresa", ["Datos de la empresa", "Constructora e ingeniero", "Logos de distribuidoras"]],
    ["firmas", "Firmas y documentos", ["Quién firma las propuestas", "Carta de presentación", "Documentos de la empresa"]],
    ["cotizar", "Cómo se cotiza", ["Textos para cada cotización nueva", "Seguimiento de cotizaciones", "Del plano a la cotización"]],
    ["obras", "Obras", ["Etapas por tipo de trabajo", "Checklists de cada obra", "Costos de obra"]]
  ];
  let grupoE = "empresa";
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;

  async function vista(v) {
    const { $, esc, ico, aviso } = A();
    const p = A().sesion().perfil;
    const puede = D.puede(p, "editarEmpresa");
    const e = await D.empresa();
    let pls = (await D.plantillas()).map(x => ({ ...x, etapas: x.etapas.slice() }));
    let plSel = 0;
    const ckl = await D.plantillasCheck();
    let logosD = await D.logosDistribuidoras();
    let fijos = await D.docsFijos();
    setTimeout(() => { const b = v.querySelector("[data-conteo-emp]"); if (b) window.EMT_CONTEO.seccionEmpresa(b, puede).catch(() => {}); }, 0);
    const ck = { seguridad: (ckl.seguridad || []).slice(), entrega: (ckl.entrega || []).slice() };
    const CK = { seguridad: ["Seguridad", "Lo que se revisa antes de empezar a trabajar en el sitio."], entrega: ["Entrega", "Lo que se revisa al terminar y entregar la obra."] };
    let ckTab = "seguridad", ckBusca = "";
    let sucio = false;
    A().guardia({ limpio: () => !sucio });
    const campo = (k, t, ayuda = "", extra = "") => `<label class="f-campo">${t}<input data-e="${k}" value="${esc(e[k] || "")}" autocomplete="off" ${extra}>${ayuda ? `<small>${ayuda}</small>` : ""}</label>`;
    const area = (k, t, ayuda = "", filas = 3) => `<label class="f-campo">${t}<textarea data-e="${k}" rows="${filas}">${esc(e[k] || "")}</textarea>${ayuda ? `<small>${ayuda}</small>` : ""}</label>`;
    v.innerHTML = `
      <div class="cuerpo">
        <div class="cab-v"><div><h1 class="t">Empresa</h1><p class="desc">Los datos de EMTECSA que salen en cada propuesta en PDF y los textos que se ponen solos en cada cotización nueva.</p></div></div>
        ${D.nube ? "" : `<div class="nota-local">${ico("shield", 18)}<span>Modo de prueba: estos datos se guardan en esta computadora y se suben a la base de EMTECSA cuando se conecte.</span></div>`}
        <nav class="seg pest-o pest-emp" aria-label="Partes de Empresa">${GRUPOS_E.map(([k, t]) => `<button type="button" data-ge="${k}" aria-pressed="${grupoE === k}">${t}</button>`).join("")}</nav>
        <fieldset class="bloq empresa" data-grupo-act="${grupoE}" ${puede ? "" : "disabled"}>
          <details class="caja plegable" open><summary><span class="pl-t"><h2>Datos de la empresa</h2></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            <div class="f-fila">${campo("nombre", "Nombre comercial")}${campo("razon_social", "Razón social")}</div>
            <div class="f-fila">${campo("nit", "NIT")}${campo("telefono", "Teléfono", "", 'inputmode="tel"')}</div>
            <div class="f-fila">${campo("correo", "Correo", "", 'type="email"')}${campo("web", "Sitio web")}</div>
            ${campo("correo_pedidos", "Correo que recibe los pedidos del catálogo", "Si queda vacío, se usa el correo de arriba.", 'type="email"')}
            <div class="f-fila">${campo("direccion", "Dirección")}${campo("ciudad", "Ciudad", "Sale en la fecha de la carta.")}</div>
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Seguimiento de cotizaciones</h2><span class="suave">Cuándo recordar al cliente</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            <div class="f-fila">${campo("seg_primer", "Primer recordatorio: días después de la fecha de la cotización", "", 'inputmode="numeric"')}${campo("seg_antes", "Recordar otra vez: días antes de que venza", "", 'inputmode="numeric"')}</div>
            <p class="suave" style="margin:0;font-size:13px">Los recordatorios salen en Hoy a quien hace cotizaciones. Si al anotar un contacto se pone la fecha del próximo, manda esa fecha.</p>
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Costos de obra</h2><span class="suave">Mano de obra y aviso</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            <div class="f-fila">${D.puede(p, "verCosto") ? campo("costo_dia_persona", "Costo del día por persona (Q)") : ""}${campo("umbral_costos", "Avisar cuando una obra pase lo presupuestado en (%)")}</div>
            <p class="suave" style="margin:0;font-size:13px">Con el costo del día se calcula la mano de obra real cuando en la obra solo anotan los días. El aviso sale en Hoy.</p>
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Constructora e ingeniero</h2><span class="suave">Para los trámites con Energuate</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            <div class="f-fila">${campo("resp_nombre", "Responsable de la constructora")}${campo("resp_dpi", "DPI del responsable")}</div>
            <div class="f-fila">${campo("ing_nombre", "Ingeniero electricista que firma")}${campo("ing_titulo", "Título")}</div>
            <div class="f-fila">${campo("ing_colegiado", "No. de colegiado activo")}${campo("ing_vence", "Constancia vigente hasta (aaaa-mm-dd)")}</div>
            <div class="f-fila">${campo("ing_telefono", "Teléfono del ingeniero")}${campo("ing_id", "Identificador en Energuate")}</div>
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Quién firma las propuestas</h2></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            <div class="f-fila">${campo("firma_nombre", "Nombre")}${campo("firma_puesto", "Puesto")}</div>
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Carta de presentación</h2></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            ${area("carta", "Texto de la carta", "Se completa sola con: {cliente}, {contacto}, {trabajo}, {sitio} y {en_sitio} (que pone «, en …» solo si la cotización tiene sitio).", 7)}
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Textos para cada cotización nueva</h2></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo">
            <p class="suave" style="font-size:13.5px">Se copian en cada cotización nueva y ahí se pueden cambiar.</p>
            ${area("incluye", "El trabajo incluye", "Uno por línea.", 3)}
            ${area("excluye", "El trabajo no incluye", "Uno por línea.", 3)}
            ${area("forma_pago", "Forma de pago", "", 2)}
            <div class="f-fila">${area("tiempo_entrega", "Tiempo de entrega", "", 2)}${area("garantia", "Garantía", "", 2)}</div>
          </div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Etapas por tipo de trabajo</h2><span class="suave">Para cada obra nueva</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-pls></div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Documentos de la empresa</h2><span class="suave">Para el expediente</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-fijos></div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Del plano a la cotización</h2><span class="suave">Estructuras y metros de cable</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-conteo-emp></div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Logos de distribuidoras</h2><span class="suave">Para el machote de los planos</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo"><div class="logos-d" data-logos-d></div></div></details>
          <details class="caja plegable"><summary><span class="pl-t"><h2>Checklists de cada obra</h2><span class="suave">Cada obra nueva los trae</span></span><span class="chev">${ico("chev", 16, 2.2)}</span></summary><div class="pl-cuerpo" data-ck-pl></div></details>
        </fieldset>
        ${puede ? `<div class="fila-b"><button class="s-btn lleno" type="button" data-guardar-emp>${ico("check", 16)}Guardar</button><span class="guardado" data-est-emp style="margin:0;align-self:center">Todo guardado</span></div>` : ""}
      </div>`;
    v.querySelectorAll("fieldset.empresa > details.plegable").forEach(d => { const h = d.querySelector("summary h2"); const t = h ? h.textContent.trim() : ""; const g = GRUPOS_E.find(([, , l]) => l.includes(t)); d.dataset.grupoE = g ? g[0] : "empresa"; });
    v.addEventListener("click", ev => { const b = ev.target.closest("[data-ge]"); if (!b) return; grupoE = b.dataset.ge; v.querySelectorAll("[data-ge]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); const fs = v.querySelector("fieldset.empresa"); if (fs) fs.dataset.grupoAct = grupoE; });
    const filaNum = (t, i, n, pre) => `<div class="fila ck-pl-f" style="cursor:default">${puede ? `<button class="ck-asa" type="button" aria-label="Arrastrar para mover: ${esc(t)}" data-asa="${pre}:${i}">${ico("asa", 16)}</button>` : "<span></span>"}<span class="num-l">${i + 1}</span><span class="ck-t">${esc(t)}</span>
      <span class="acc">${puede ? `<button class="s-ib" type="button" aria-label="Subir: ${esc(t)}" data-${pre}-sube="${i}" ${i === 0 ? "disabled" : ""}>${ico("arriba", 15)}</button><button class="s-ib" type="button" aria-label="Bajar: ${esc(t)}" data-${pre}-baja="${i}" ${i === n - 1 ? "disabled" : ""}>${ico("abajo", 15)}</button><button class="s-ib" type="button" aria-label="Editar: ${esc(t)}" data-${pre}-ed="${i}">${ico("pen", 15)}</button>` : ""}</span></div>`;
    const pintarPls = () => {
      if (plSel >= pls.length) plSel = Math.max(0, pls.length - 1);
      const x = pls[plSel];
      $("[data-pls]", v).innerHTML = `
        <div class="pl-tipos">${`<label class="chips-sel pl-sel-m"><span class="sr">Tipo de trabajo</span><select data-pl-sel>${pls.map((y, k) => `<option value="${k}" ${k === plSel ? "selected" : ""}>${esc(y.nombre || "Sin nombre")} · ${y.etapas.length} etapas</option>`).join("")}</select></label>`}${pls.length <= 3 ? `<div class="seg ancho" role="tablist" aria-label="Tipo de trabajo">${pls.map((y, k) => `<button type="button" role="tab" data-pl-tab="${k}" aria-selected="${k === plSel}" aria-pressed="${k === plSel}">${esc(y.nombre || "Sin nombre")}</button>`).join("")}</div>` : `<label class="chips-sel" style="display:block"><span class="sr">Tipo de trabajo</span><select data-pl-sel>${pls.map((y, k) => `<option value="${k}" ${k === plSel ? "selected" : ""}>${esc(y.nombre || "Sin nombre")} · ${y.etapas.length} etapas</option>`).join("")}</select></label>`}</div>
        ${x ? `<div class="pl-cab-t"><span><b>${esc(x.nombre || "Sin nombre")}</b><small class="suave">${x.etapas.length} ${x.etapas.length === 1 ? "etapa" : "etapas"}</small></span>${puede ? `<span class="acc"><button class="s-btn suave-b chico" type="button" data-pl-ren>${ico("pen", 14)}Nombre</button><button class="s-btn suave-b chico" type="button" data-nueva-pl>${ico("plus", 14)}Nuevo tipo</button></span>` : ""}</div>
        <div class="lista ck-pl">${x.etapas.length ? x.etapas.map((t, k) => filaNum(t, k, x.etapas.length, "et")).join("") : `<p class="suave" style="padding:14px 16px;margin:0">Todavía no tiene etapas.</p>`}</div>
        ${puede ? `<button class="s-btn suave-b chico" type="button" data-et-nuevo>${ico("plus", 14)}Agregar etapa</button>` : ""}` : `${puede ? `<button class="s-btn suave-b chico" type="button" data-nueva-pl>${ico("plus", 14)}Nuevo tipo de trabajo</button>` : ""}`}`;
    };
    const arrastrar = e => {
      const asa = e.target.closest("[data-asa]"); if (!asa || !puede) return;
      e.preventDefault();
      const [pre, i0] = asa.dataset.asa.split(":"), idx0 = Number(i0);
      const fila = asa.closest(".fila"), filas = [...fila.parentElement.querySelectorAll(":scope > .fila")];
      const arr = pre === "ck" ? ck[ckTab] : pre === "doc" ? fijos : pls[plSel].etapas;
      const rects = filas.map(f => f.getBoundingClientRect()), alto = rects[idx0].height, y0 = e.clientY;
      let destino = idx0, movio = false;
      try { asa.setPointerCapture(e.pointerId); } catch (er) {}
      fila.classList.add("arrastrando");
      const mover = ev => {
        const dy = ev.clientY - y0; if (Math.abs(dy) > 3) movio = true;
        fila.style.transform = `translateY(${dy}px)`;
        const centro = rects[idx0].top + alto / 2 + dy;
        destino = rects.filter((r, k) => k !== idx0 && r.top + r.height / 2 < centro).length;
        filas.forEach((f, k) => { if (k === idx0) return; const s2 = idx0 < destino && k > idx0 && k <= destino ? -alto : idx0 > destino && k >= destino && k < idx0 ? alto : 0; f.style.transform = s2 ? `translateY(${s2}px)` : ""; });
      };
      const soltar = () => {
        asa.removeEventListener("pointermove", mover); asa.removeEventListener("pointerup", soltar); asa.removeEventListener("pointercancel", soltar);
        filas.forEach(f => { f.style.transform = ""; }); fila.classList.remove("arrastrando");
        if (movio && destino !== idx0) { const [x] = arr.splice(idx0, 1); arr.splice(destino, 0, x); if (pre === "doc") D.ordenarDocsFijos(fijos.map(z => z.id)).then(() => aviso("Orden guardado.")).catch(er => aviso(er.message, "mal")); else sinGuardar(); }
        if (pre === "ck") pintarCk(); else if (pre === "doc") pintarFijos(); else pintarPls();
      };
      asa.addEventListener("pointermove", mover); asa.addEventListener("pointerup", soltar); asa.addEventListener("pointercancel", soltar);
    };
    $(".cuerpo", v).addEventListener("pointerdown", arrastrar);
    const editarEtapa = i => {
      const x = pls[plSel], nuevo = i == null, t0 = nuevo ? "" : x.etapas[i];
      A().modal({
        titulo: nuevo ? `Etapa nueva · ${x.nombre}` : `Editar etapa ${i + 1}`,
        guardarTxt: nuevo ? "Agregar" : "Listo",
        quitar: nuevo ? null : () => { x.etapas.splice(i, 1); A().cerrarCapas(); pintarPls(); sinGuardar(); aviso("Etapa quitada. Recuerde guardar."); },
        cuerpo: `<label class="f-campo">Etapa<input name="texto" value="${esc(t0)}" autocomplete="off" placeholder="Por ejemplo: Tendido de conductor"></label>`,
        alGuardar: async f => {
          const t = f.texto.value.trim().replace(/\s+/g, " ");
          if (!t) throw new Error("Escriba el nombre de la etapa.");
          if (x.etapas.some((y, j) => j !== i && y.toLowerCase() === t.toLowerCase())) throw new Error("Esa etapa ya está en la lista.");
          if (nuevo) x.etapas.push(t); else x.etapas[i] = t;
          A().cerrarCapas(); pintarPls(); sinGuardar();
        }
      });
    };
    const editarTipo = nuevo => {
      const x = nuevo ? null : pls[plSel];
      A().modal({
        titulo: nuevo ? "Nuevo tipo de trabajo" : "Nombre del tipo de trabajo",
        guardarTxt: nuevo ? "Agregar" : "Listo",
        quitar: !nuevo && pls.length > 1 ? () => { const m = A().modal({ titulo: `¿Quitar «${x.nombre}»?`, guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita este tipo de trabajo con sus ${x.etapas.length} etapas. Las obras que ya existen no cambian.</p>`, alGuardar: async () => { pls.splice(plSel, 1); plSel = 0; A().cerrarCapas(); pintarPls(); sinGuardar(); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
        cuerpo: `<label class="f-campo">Tipo de trabajo<input name="nombre" value="${esc(x ? x.nombre : "")}" autocomplete="off" placeholder="Por ejemplo: Acometida en baja tensión"></label>`,
        alGuardar: async f => {
          const n = f.nombre.value.trim().replace(/\s+/g, " ");
          if (!n) throw new Error("Escriba el nombre del tipo de trabajo.");
          if (pls.some((y, j) => (nuevo || j !== plSel) && y.nombre.toLowerCase() === n.toLowerCase())) throw new Error("Ya hay un tipo de trabajo con ese nombre.");
          if (nuevo) { pls.push({ id: null, nombre: n, etapas: [] }); plSel = pls.length - 1; } else x.nombre = n;
          A().cerrarCapas(); pintarPls(); sinGuardar();
          if (nuevo) setTimeout(() => editarEtapa(null), 60);
        }
      });
    };
    pintarPls();
    v.oninput = ev => {
      if (ev.target.matches("[data-ck-busca]")) { ckBusca = ev.target.value; filtrarCk(); return; }
      if (ev.target.dataset.e) { e[ev.target.dataset.e] = ev.target.value; sucio = true; const s = $("[data-est-emp]", v); if (s) { s.textContent = "Cambios sin guardar"; s.className = "guardado sin"; } } };
    const sinGuardar = () => { sucio = true; const s2 = $("[data-est-emp]", v); if (s2) { s2.textContent = "Cambios sin guardar"; s2.className = "guardado sin"; } };
    const filtrarCk = () => A().filtrar($("[data-ck-lista]", v), ".fila", ckBusca);
    const pintarCk = () => {
      const l = ck[ckTab];
      $("[data-ck-pl]", v).innerHTML = `
        <div class="seg ancho" role="tablist" aria-label="Tipo de checklist">${Object.entries(CK).map(([k, [n]]) => `<button type="button" role="tab" data-ck-tab="${k}" aria-selected="${ckTab === k}" aria-pressed="${ckTab === k}">${n} · ${ck[k].length}</button>`).join("")}</div>
        <p class="suave" style="margin:0;font-size:13.5px">${CK[ckTab][1]} Las obras que ya tienen su checklist no cambian.</p>
        ${l.length > 5 ? `<label class="busca-v ancho-busca"><span class="sr">Buscar punto</span>${ico("search", 16)}<input type="search" data-ck-busca placeholder="Buscar punto" value="${esc(ckBusca)}" autocomplete="off"></label>` : ""}
        <div class="lista ck-pl" data-ck-lista>${l.length ? l.map((t, i) => filaNum(t, i, l.length, "ck")).join("") : `<p class="suave" style="padding:14px 16px;margin:0">Todavía no hay puntos.</p>`}</div>
        ${puede ? `<button class="s-btn suave-b chico" type="button" data-ck-nuevo>${ico("plus", 14)}Agregar punto</button>` : ""}`;
      filtrarCk();
    };
    const editarPunto = i => {
      const nuevo = i == null, t0 = nuevo ? "" : ck[ckTab][i];
      A().modal({
        titulo: nuevo ? `Punto nuevo · ${CK[ckTab][0]}` : `Editar punto ${i + 1}`,
        guardarTxt: nuevo ? "Agregar" : "Listo",
        quitar: nuevo ? null : () => { ck[ckTab].splice(i, 1); A().cerrarCapas(); pintarCk(); sinGuardar(); aviso("Punto quitado. Recuerde guardar."); },
        cuerpo: `<label class="f-campo">Qué se revisa<input name="texto" value="${esc(t0)}" autocomplete="off" placeholder="${ckTab === "seguridad" ? "Por ejemplo: Equipo de protección completo" : "Por ejemplo: Prueba de aislamiento"}"></label>`,
        alGuardar: async f => {
          const t = f.texto.value.trim().replace(/\s+/g, " ");
          if (!t) throw new Error("Escriba qué se revisa.");
          if (ck[ckTab].some((x, j) => j !== i && x.toLowerCase() === t.toLowerCase())) throw new Error("Ese punto ya está en la lista.");
          if (nuevo) ck[ckTab].push(t); else ck[ckTab][i] = t;
          A().cerrarCapas(); pintarCk(); sinGuardar();
        }
      });
    };
    pintarCk();
    const pintarFijos = () => {
      $("[data-fijos]", v).innerHTML = `
        <p class="suave" style="margin:0;font-size:13.5px">Registro de contratista, certificaciones, seguros, patente, RTU… Se suben una vez y cada cotización escoge cuáles lleva en su expediente. Los que dicen «Siempre» ya vienen marcados.</p>
        <div class="lista ck-pl">${fijos.length ? fijos.map((x, i) => `<div class="fila ck-pl-f doc-f" style="cursor:default">${puede ? `<button class="ck-asa" type="button" aria-label="Arrastrar para mover: ${esc(x.nombre)}" data-asa="doc:${i}">${ico("asa", 16)}</button>` : "<span></span>"}<span class="num-l">${i + 1}</span><span class="ck-t"><b>${esc(x.nombre)}</b><small class="suave">${esc(D.TIPOS_DOC[x.tipo] || "Archivo")} · ${esc(D.tamTxt(x.tam))}${x.siempre ? " · Siempre" : ""}</small></span>
          <span class="acc"><button class="s-ib" type="button" aria-label="Ver ${esc(x.nombre)}" data-fijo-ver="${x.id}">${ico("eye", 15)}</button>${puede ? `<button class="s-ib" type="button" aria-label="Editar ${esc(x.nombre)}" data-fijo-ed="${x.id}">${ico("pen", 15)}</button>` : ""}</span></div>`).join("") : `<p class="suave" style="padding:14px 16px;margin:0">Todavía no hay documentos.</p>`}</div>
        ${puede ? `<button class="s-btn suave-b chico" type="button" data-fijo-nuevo>${ico("plus", 14)}Agregar documento</button>` : ""}`;
    };
    pintarFijos();
    const editarFijo = x => {
      let archivoSel = null;
      A().modal({
        titulo: x ? "Editar documento" : "Documento nuevo", guardarTxt: x ? "Guardar" : "Agregar",
        quitar: x ? () => { const m = A().modal({ titulo: `¿Quitar «${x.nombre}»?`, guardarTxt: "Quitar", cuerpo: `<p class="suave" style="font-size:15px">Se quita de Empresa y ya no sale en los expedientes nuevos.</p>`, alGuardar: async () => { await D.quitarDocFijo(x.id); fijos = await D.docsFijos(); A().cerrarCapas(); pintarFijos(); aviso("Documento quitado."); } }); m.querySelector("[data-guardar]").classList.add("peligro-b"); } : null,
        cuerpo: `<label class="f-campo">Nombre<input name="nombre" value="${esc(x ? x.nombre : "")}" autocomplete="off" placeholder="Por ejemplo: Registro de contratista"></label>
          <div class="f-campo"><span>Archivo (PDF o foto)</span><label class="s-btn suave-b chico subir-doc">${ico("plus", 14)}<span data-arch-n>${x ? "Cambiar el archivo" : "Escoger el archivo"}</span><input type="file" accept="application/pdf,image/jpeg,image/png" hidden data-arch></label>${x ? `<small>Ahora: ${esc(D.TIPOS_DOC[x.tipo] || "Archivo")} · ${esc(D.tamTxt(x.tam))}</small>` : ""}</div>
          <label class="f-check"><input type="checkbox" name="siempre" ${!x || x.siempre ? "checked" : ""}><span>Que venga marcado en todas las cotizaciones</span></label>`,
        alAbrir: f => { f.querySelector("[data-arch]").addEventListener("change", ev => { archivoSel = ev.target.files[0] || null; if (archivoSel) { f.querySelector("[data-arch-n]").textContent = archivoSel.name; if (!f.nombre.value.trim()) f.nombre.value = archivoSel.name.replace(/\.[^.]+$/, ""); } }); },
        alGuardar: async f => { aviso(archivoSel ? "Subiendo el archivo…" : "Guardando…"); await D.guardarDocFijo({ id: x ? x.id : null, nombre: f.nombre.value, siempre: f.siempre.checked }, archivoSel); fijos = await D.docsFijos(); A().cerrarCapas(); pintarFijos(); aviso(x ? "Documento guardado." : "Documento agregado."); }
      });
    };
    const pintarLogos = () => {
      $("[data-logos-d]", v).innerHTML = Object.entries(D.DISTRIBUIDORAS).map(([k, x]) => { const src = logosD[k] || x.logo; return `<div class="logo-d"><div class="logo-d-img">${src ? `<img src="${esc(src)}" alt="Logo de ${esc(x.n)}">` : `<span class="suave">Sin logo</span>`}</div><div><b>${esc(x.n)}</b><small class="suave">${logosD[k] ? "Logo subido" : x.logo ? "Logo de ejemplo" : "Falta el logo"}</small></div><div class="acc">${puede ? `<label class="s-btn suave-b chico">${ico("plus", 14)}${src ? "Cambiar" : "Subir"}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden data-logo-sub="${k}"></label>${logosD[k] ? `<button class="s-link" type="button" data-logo-q="${k}">Quitar</button>` : ""}` : ""}</div></div>`; }).join("");
    };
    pintarLogos();
    v.onchange = async ev => {
      if (ev.target.matches("[data-pl-sel]")) { plSel = Number(ev.target.value); pintarPls(); return; }
      const k = ev.target.dataset.logoSub; if (!k || !ev.target.files[0]) return;
      const f = ev.target.files[0];
      try {
        const url = await new Promise((bien, mal) => { const fr = new FileReader(); fr.onload = () => bien(fr.result); fr.onerror = () => mal(new Error("No se pudo leer la imagen.")); fr.readAsDataURL(f); });
        let final = url;
        if (!/svg/.test(f.type)) { const img = new Image(); img.src = url; await img.decode(); const lado = 900, fx = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight)); const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * fx); cv.height = Math.round(img.naturalHeight * fx); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); final = cv.toDataURL("image/png"); }
        await D.guardarLogoDistribuidora(k, final); logosD = await D.logosDistribuidoras(); pintarLogos(); aviso("Logo guardado.");
      } catch (err) { aviso(err.message, "mal"); }
      ev.target.value = "";
    };
    v.onclick = async ev => {
      if (ev.target.closest("[data-fijo-nuevo]")) { editarFijo(null); return; }
      const fe = ev.target.closest("[data-fijo-ed]"); if (fe) { editarFijo(fijos.find(x => x.id === Number(fe.dataset.fijoEd))); return; }
      const fv = ev.target.closest("[data-fijo-ver]"); if (fv) { const x = fijos.find(y => y.id === Number(fv.dataset.fijoVer)); const b = x && await D.archivo(x.ref); if (!b) { aviso("No se encontró el archivo.", "mal"); return; } const u = URL.createObjectURL(b); const w = window.open(u, "_blank"); if (w) w.opener = null; setTimeout(() => URL.revokeObjectURL(u), 60000); return; }
      const ct = ev.target.closest("[data-ck-tab]"); if (ct) { ckTab = ct.dataset.ckTab; ckBusca = ""; pintarCk(); return; }
      if (ev.target.closest("[data-ck-nuevo]")) { editarPunto(null); return; }
      const ce = ev.target.closest("[data-ck-ed]"); if (ce) { editarPunto(Number(ce.dataset.ckEd)); return; }
      const cs = ev.target.closest("[data-ck-sube], [data-ck-baja]");
      if (cs && !cs.disabled) { const i = Number(cs.dataset.ckSube ?? cs.dataset.ckBaja), j = cs.dataset.ckSube != null ? i - 1 : i + 1; const l = ck[ckTab]; [l[i], l[j]] = [l[j], l[i]]; pintarCk(); sinGuardar(); const b = $(`[data-ck-${cs.dataset.ckSube != null ? "sube" : "baja"}="${j}"]`, v); if (b && !b.disabled) b.focus(); return; }
      const lq = ev.target.closest("[data-logo-q]"); if (lq) { try { await D.guardarLogoDistribuidora(lq.dataset.logoQ, null); logosD = await D.logosDistribuidoras(); pintarLogos(); aviso("Quedó el logo de ejemplo."); } catch (err) { aviso(err.message, "mal"); } return; }
      if (ev.target.closest("[data-nueva-pl]")) { editarTipo(true); return; }
      if (ev.target.closest("[data-pl-ren]")) { editarTipo(false); return; }
      const pt = ev.target.closest("[data-pl-tab]"); if (pt) { plSel = Number(pt.dataset.plTab); pintarPls(); return; }
      if (ev.target.closest("[data-et-nuevo]")) { editarEtapa(null); return; }
      const ee = ev.target.closest("[data-et-ed]"); if (ee) { editarEtapa(Number(ee.dataset.etEd)); return; }
      const es = ev.target.closest("[data-et-sube], [data-et-baja]");
      if (es && !es.disabled) { const i = Number(es.dataset.etSube ?? es.dataset.etBaja), j = es.dataset.etSube != null ? i - 1 : i + 1; const l = pls[plSel].etapas; [l[i], l[j]] = [l[j], l[i]]; pintarPls(); sinGuardar(); const b = $(`[data-et-${es.dataset.etSube != null ? "sube" : "baja"}="${j}"]`, v); if (b && !b.disabled) b.focus(); return; }
      if (!ev.target.closest("[data-guardar-emp]")) return;
      const b = ev.target.closest("[data-guardar-emp]"); b.disabled = true;
      try { await D.guardarEmpresa(e); await D.guardarPlantillas(pls.map(x => ({ id: x.id, nombre: x.nombre, etapas: x.etapas }))); await D.guardarPlantillasCheck(ck); pls = (await D.plantillas()).map(x => ({ ...x, etapas: x.etapas.slice() })); pintarPls(); sucio = false; const s = $("[data-est-emp]", v); s.textContent = "Todo guardado"; s.className = "guardado"; aviso("Datos de la empresa guardados."); }
      catch (err) { aviso(err.message, "mal"); }
      finally { b.disabled = false; }
    };
  }

  return { vista };
})();
