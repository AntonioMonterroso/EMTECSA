"use strict";
window.EMT_ENERGUATE = (() => {
  const D = window.EMT_DATOS;
  const A = () => window.EMT_APP;
  const G = () => window.EMT_EG_DOCS;
  const CHIP = { listo: ["verde", "check"], lleno: ["azul", "check"], firmar: ["laton", "pen"], falta: ["ambar", "alerta"], subir: ["gris", "plus"], opcional: ["gris", "plus"], no_aplica: ["gris", "x"] };
  const ORIG = { capacidad: "Excel", medida: "Excel" };
  const claveIng = g => String((g && (g.colegiado || g.nombre)) || "");
  const ING_C = { ing_nombre: "nombre", ing_titulo: "titulo", ing_colegiado: "colegiado", ing_vence: "vence", ing_telefono: "telefono", ing_id: "id" };

  function selQuien(x) {
    const { esc } = A();
    if (!x.cli) return "";
    const cli = x.cli, sel = String(x.guard.campos.interesado || "");
    const op = [{ v: "", n: `${cli.razon_social || cli.nombre}${cli.tipo === "residencial" ? "" : " (la empresa)"}`, t: cli.telefono || "", c: cli.correo || "" }].concat((cli.contactos || []).map(k => ({ v: "k:" + k.id, n: k.nombre, p: k.puesto, t: k.telefono || "", c: k.correo || "" })));
    if (op.length < 2) return "";
    return `<label class="f-campo">Va como interesado<select name="interesado" data-quien>${op.map(o => `<option value="${esc(o.v)}" data-n="${esc(o.n.replace(/ \(la empresa\)$/, ""))}" data-t="${esc(o.t)}" data-c="${esc(o.c)}" ${o.v === sel ? "selected" : ""}>${esc(o.n)}${o.p ? " · " + esc(o.p) : ""}</option>`).join("")}</select></label>`;
  }
  function selIng(x) {
    const { esc } = A();
    if (x.ings.length < 2) return "";
    const sel = claveIng(x.ing);
    return `<label class="f-campo">Ingeniero que firma<select name="ingeniero" data-ing-sel>${x.ings.map(g => `<option value="${esc(claveIng(g))}" ${claveIng(g) === sel ? "selected" : ""}>${esc(g.nombre)}${g.colegiado ? " · colegiado " + esc(g.colegiado) : ""}</option>`).join("")}</select></label>`;
  }

  function campoHTML(c, val) {
    const { esc } = A();
    const n = `name="${esc(c.k)}"`;
    const inp = c.geoD ? `<select ${n} data-geo-depto="${esc(c.geoD)}">${window.EMT_GEO.opcionesDepto(val)}</select>`
      : c.geoM ? `<input ${n} data-geo-muni="${esc(c.geoM)}" value="${esc(val)}" autocomplete="off">`
      : c.menu ? `<select ${n}><option value="">Escoja</option>${c.menu.map(o => `<option ${String(val) === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : c.area ? `<textarea ${n} rows="2">${esc(val)}</textarea>`
      : `<input ${n} value="${esc(c.tipo === "date" ? String(val || "").slice(0, 10) : val)}" ${c.tipo === "date" ? 'type="date"' : c.num ? 'inputmode="decimal"' : ""} autocomplete="off">`;
    return `<label class="f-campo">${esc(c.n)}${c.donde === "emp" ? ' <small class="suave">· se guarda en Empresa</small>' : c.donde === "sol" ? ' <small class="suave">· del cliente</small>' : ""}${inp}</label>`;
  }

  function completar(x, { doc = null, todos = false, alGuardar }) {
    const { modal, cerrarCapas, aviso, esc } = A();
    let lista = D.CAMPOS_EG.filter(c => todos ? (!doc || (c.docs || []).includes(doc)) : (doc ? D.faltanEnerguate(doc, x).some(f => f.k === c.k) : D.REQUISITOS_EG.some(rq => rq.doc && D.faltanEnerguate(rq.doc, x).some(f => f.k === c.k))));
    if (!x.v.centralizacion) lista = lista.filter(c => !(c.docs || []).every(d => d === "centralizacion"));
    if (!(x.kva > 50 || x.v.centralizacion)) lista = lista.filter(c => !(c.docs || []).every(d => d === "medida" || d === "centralizacion"));
    lista.slice().forEach(c => { if (c.par && !lista.some(z => z.k === c.par)) { const p2 = D.CAMPOS_EG.find(z => z.k === c.par); if (p2) lista.push(p2); } });
    lista = D.CAMPOS_EG.filter(c => lista.includes(c));
    const otros = doc ? D.faltanEnerguate(doc, x).filter(f => f.k[0] === "_") : [];
    const grupos = [["sol", "Del cliente"], ["emp", "De EMTECSA"], ["obra", "De la obra"]];
    modal({
      titulo: todos ? "Datos para Energuate" : "Completar lo que falta", guardarTxt: "Guardar",
      cuerpo: `${otros.length ? `<div class="eg-otros">${otros.map(f => `<p>${A().ico("alerta", 14)}<span>${esc(f.n)}</span></p>`).join("")}</div>` : ""}
        ${lista.length ? grupos.map(([g, t]) => { const l = lista.filter(c => c.donde === g); const sel = g === "sol" && l.some(c => c.k === "sol_nombre") ? selQuien(x) : g === "emp" && l.some(c => ING_C[c.k]) ? selIng(x) : ""; return l.length ? `<div class="eg-grupo"><p class="eg-gt">${t}</p>${sel}${l.map(c => campoHTML(c, x.v[c.k])).join("")}</div>` : ""; }).join("") : `<p class="suave" style="margin:0">No falta ningún dato que se escriba aquí.</p>`}
        ${todos ? `<label class="sw-fila"><span>Lleva centralización de medidores</span><input type="checkbox" class="sw" name="centralizacion" ${x.v.centralizacion ? "checked" : ""}></label>
          <div class="f-fila"><label class="f-campo">No. de dictamen de capacidad <small class="suave">cuando lo den</small><input name="dictamen_no" value="${esc(x.guard.campos.dictamen_no || "")}" autocomplete="off"></label><label class="f-campo">Fecha del dictamen<input type="date" name="dictamen_fecha" value="${esc(x.guard.campos.dictamen_fecha || "")}"></label></div>
          <div class="f-fila"><label class="f-campo">Subestación<input name="subestacion" value="${esc(x.gc("subestacion"))}" autocomplete="off"></label><label class="f-campo">SMT<input name="smt" value="${esc(x.gc("smt"))}" autocomplete="off"></label></div>
          <label class="f-campo">Fecha de entrega del expediente<input type="date" name="fecha_entrega" value="${esc(x.guard.campos.fecha_entrega || "")}"></label>` : ""}`,
      alAbrir: f => f.addEventListener("change", e => {
        const q = e.target.closest("[data-quien]");
        if (q) { const o = q.selectedOptions[0]; [["sol_nombre", o.dataset.n], ["sol_telefono", o.dataset.t], ["sol_correo", o.dataset.c]].forEach(([k, val]) => { if (f.elements[k] && val) f.elements[k].value = val; }); return; }
        const g = e.target.closest("[data-ing-sel]");
        if (g) { const ing = x.ings.find(z => claveIng(z) === g.value) || {}; Object.entries(ING_C).forEach(([k, b]) => { if (f.elements[k]) f.elements[k].value = ing[b] || ""; }); }
      }),
      alGuardar: async f => {
        const val = k => f.elements[k] ? String(f.elements[k].value || "").trim() : undefined;
        const emp = {}, sol = {}, obra = {};
        lista.forEach(c => { const v = val(c.k); if (v === undefined) return; (c.donde === "emp" ? emp : c.donde === "sol" ? sol : obra)[c.k] = v; });
        lista.filter(c => c.geoD).forEach(c => { const g = window.EMT_GEO.revisar(obra[c.k], obra[c.par], c.geoD === "obra" ? " de la obra" : c.geoD === "desde" ? " de donde sale la línea" : " a donde llega la línea"); obra[c.k] = g.departamento; obra[c.par] = g.municipio; });
        if (todos) { obra.centralizacion = f.elements.centralizacion.checked; ["dictamen_no", "dictamen_fecha", "subestacion", "smt", "fecha_entrega"].forEach(k => { obra[k] = val(k); }); }
        if (val("interesado") !== undefined) obra.interesado = val("interesado");
        if (val("ingeniero") !== undefined) obra.ingeniero = val("ingeniero");
        const ingC = Object.keys(emp).filter(k => ING_C[k]);
        if (ingC.length) {
          const l = x.ings.map(g => ({ ...g }));
          const clave = obra.ingeniero != null ? obra.ingeniero : claveIng(x.ing);
          let i = l.findIndex(g => claveIng(g) === clave); if (i < 0) { i = l.length ? 0 : l.push({}) - 1; }
          ingC.forEach(k => { l[i][ING_C[k]] = emp[k]; delete emp[k]; });
          if (!String(l[i].nombre || "").trim()) throw new Error("Escriba el nombre del ingeniero que firma.");
          emp.ingenieros = l;
          if (x.ings.length > 1 || obra.ingeniero != null) obra.ingeniero = claveIng(l[i]);
        }
        obra._mun = obra.obra_municipio != null ? obra.obra_municipio : x.v.obra_municipio; obra._dep = obra.obra_departamento != null ? obra.obra_departamento : x.v.obra_departamento; obra._fecha = new Date().toISOString();
        if (Object.keys(emp).length) await D.guardarEmpresa({ ...x.emp, ...emp });
        if (Object.keys(sol).length) { if (x.cot) await D.guardarSolicitante(x.cot.id, sol); else Object.assign(obra, sol); }
        x.guard.campos = { ...x.guard.campos, ...obra };
        await D.guardarEnerguate(x.o.id, x.guard);
        cerrarCapas(); aviso("Datos guardados."); alGuardar && alGuardar();
      }
    });
  }

  function terrenos(x, alGuardar) {
    const { modal, cerrarCapas, aviso, esc, ico } = A();
    const lista = x.terrenos.map(t => ({ ...t }));
    const editar = i => {
      const t = i == null ? { departamento: (x.sitio && x.sitio.departamento) || "", municipio: (x.sitio && x.sitio.municipio) || "" } : lista[i];
      const pts = x.plano.puntos || [];
      const selP = (k, n) => `<label class="f-campo">${n}<select name="${k}" data-tramo><option value="">Escoja</option>${pts.map(p => `<option value="${esc(p.id)}" ${String(t[k] ?? "") === String(p.id) ? "selected" : ""}>${esc(p.cod)}</option>`).join("")}</select></label>`;
      const tramoHTML = pts.length > 1 ? `<div class="f-fila" style="grid-column:1/-1">${selP("desde", "El paso empieza en el poste")}${selP("hasta", "Y termina en el poste")}</div>` : "";
      modal({ titulo: i == null ? "Terreno nuevo" : "Terreno", guardarTxt: "Guardar",
        alAbrir: f => {
          const num = k => Number(String(f.elements[k].value || "").replace(",", "."));
          const area = () => { const l = num("largo"), a = num("ancho"); if (l > 0 && a > 0) f.elements.area.value = String(Math.round(l * a * 100) / 100); };
          f.addEventListener("change", e => { if (!e.target.closest("[data-tramo]")) return; const m = x.plano.tramo(f.elements.desde.value, f.elements.hasta.value); if (m > 0) { f.elements.largo.value = String(m); area(); } });
          f.addEventListener("input", e => { if (e.target.name === "largo" || e.target.name === "ancho") area(); });
        },
        quitar: i == null ? null : async () => { lista.splice(i, 1); x.guard.terrenos = lista; await D.guardarEnerguate(x.o.id, x.guard); x.terrenos = lista; cerrarCapas(); aviso("Terreno quitado."); terrenos(x, alGuardar); alGuardar && alGuardar(); },
        cuerpo: `<p class="suave" style="margin:0;font-size:13.5px">Uno por cada terreno por donde pasa la línea. Con esto se llena el derecho de paso.</p><div class="eg-terreno">${D.TERRENO_EG.map(([k, n]) => `${k === "area" ? tramoHTML : ""}<label class="f-campo">${esc(n)}${k === "departamento" ? `<select name="${k}" data-geo-depto="ter">${window.EMT_GEO.opcionesDepto(t[k])}</select>` : k === "domicilio" ? `<select name="${k}">${window.EMT_GEO.opcionesDepto(t[k])}</select>` : `<input name="${k}" value="${esc(t[k] || "")}" autocomplete="off" ${k === "municipio" ? 'data-geo-muni="ter"' : ""} ${["edad", "area", "largo", "ancho"].includes(k) ? 'inputmode="decimal"' : ""}>`}</label>`).join("")}</div>`,
        alGuardar: async f => {
          const n = {}; D.TERRENO_EG.forEach(([k]) => { n[k] = String(f.elements[k].value || "").trim(); });
          if (f.elements.desde) { n.desde = f.elements.desde.value; n.hasta = f.elements.hasta.value; }
          if (!n.nombre) throw new Error("Escriba el nombre del poseedor.");
          const g = window.EMT_GEO.revisar(n.departamento, n.municipio, " del terreno"); n.departamento = g.departamento; n.municipio = g.municipio;
          if (i == null) lista.push(n); else lista[i] = n;
          x.guard.terrenos = lista; x.terrenos = lista; await D.guardarEnerguate(x.o.id, x.guard);
          cerrarCapas(); aviso("Terreno guardado."); terrenos(x, alGuardar); alGuardar && alGuardar();
        } });
    };
    modal({ titulo: "Terrenos por donde pasa la línea", guardarTxt: "Listo", soloUno: true,
      cuerpo: `${x.solCliente && x.en && x.en.tramite && (x.en.tramite.terrenos || []).length && !(x.guard.terrenos || []).length ? `<p class="suave" style="margin:0;font-size:13.5px">Estos los mandó el cliente desde su enlace.</p>` : ""}
        <div class="cnt-par">${lista.map((t, i) => `<div class="cnt-f"><span><b>${esc(t.nombre || "Sin nombre")}</b><small>${esc([t.ubicacion, t.municipio].filter(Boolean).join(", ") || "Faltan datos")}${t.area ? " · " + esc(t.area) + " m²" : ""}</small></span><span class="acc"><button class="s-btn suave-b chico" type="button" data-t-word="${i}">Word</button><button class="s-btn suave-b chico" type="button" data-t-pdf="${i}">PDF</button><button class="s-ib" type="button" aria-label="Editar ${esc(t.nombre || "terreno")}" data-t-ed="${i}">${ico("pen", 15)}</button></span></div>`).join("") || `<p class="suave" style="margin:8px 0">Todavía no hay terrenos.</p>`}</div>
        <button class="s-btn suave-b chico" type="button" data-t-nuevo>${ico("plus", 14)}Agregar terreno</button>`,
      alAbrir: (f, m) => m.addEventListener("click", async e => {
        if (e.target.closest("[data-t-nuevo]")) { editar(null); return; }
        const b = e.target.closest("[data-t-ed]"); if (b) { editar(Number(b.dataset.tEd)); return; }
        const w = e.target.closest("[data-t-word], [data-t-pdf]"); if (!w) return;
        const i = Number(w.dataset.tWord ?? w.dataset.tPdf); w.disabled = true;
        try { G().descargar(w.dataset.tWord != null ? await G().pasoDOCX(x, lista[i], i) : await G().pasoPDF(x, lista[i], i)); } catch (er) { aviso(er.message, "mal"); } finally { w.disabled = false; }
      }),
      alGuardar: async () => cerrarCapas() });
  }

  async function pantalla(box, obraId, ed) {
    const { esc, ico, aviso, modal, cerrarCapas } = A();
    box.innerHTML = `<p class="suave" style="font-size:13.5px">Revisando los documentos…</p>`;
    let x = await D.contextoEnerguate(obraId);
    if (!x) { box.innerHTML = ""; return; }
    const pintar = () => {
      const est = D.REQUISITOS_EG.map(rq => ({ rq, e: D.estadoRequisito(rq, x) }));
      const listos = est.filter(z => ["listo", "lleno", "firmar", "no_aplica"].includes(z.e.e)).length;
      const nFalta = est.filter(z => z.e.e === "falta").length, nSubir = est.filter(z => z.e.e === "subir").length;
      box.innerHTML = `<section class="caja eg">
        <div class="eg-cab"><div><h2>Licencia de construcción · Energuate</h2><p class="suave">${listos} de 20 listos${nFalta ? ` · ${nFalta} con datos que faltan` : ""}${nSubir ? ` · ${nSubir} por subir` : ""}</p></div>
          <div class="eg-barra" role="progressbar" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${listos}"><span style="width:${listos * 5}%"></span></div></div>
        <div class="fila-b eg-acc">${ed && nFalta ? `<button class="s-btn lleno" type="button" data-eg-completar>${ico("pen", 15)}Completar lo que falta</button>` : ""}<button class="e-btn e-btn-salida" type="button" data-eg-docs>${ico("download", 16)}Todos los documentos</button><button class="e-btn e-btn-salida" type="button" data-eg-exp>${ico("layers", 16)}Expediente en orden</button><button class="e-btn e-btn-salida" type="button" data-eg-req>${ico("download", 16)}Lista de requisitos</button>${ed ? `<button class="s-btn suave-b" type="button" data-eg-todos>${ico("file", 15)}Todos los datos</button>` : ""}</div>
        <div class="eg-lista">${est.map(({ rq, e }) => {
          const [cc, ic] = CHIP[e.e] || CHIP.subir;
          const acc = [];
          if (rq.doc && rq.doc !== "paso" && !(e.faltan && e.faltan.length) && e.e !== "no_aplica") { acc.push(`<button class="e-btn e-btn-salida chico-e" type="button" data-eg-pdf="${rq.doc}">${ico("download", 14)}PDF</button>`); if (ORIG[rq.doc]) acc.push(`<button class="s-btn suave-b chico" type="button" data-eg-orig="${rq.doc}">${ORIG[rq.doc]}</button>`); }
          if (rq.doc === "paso") acc.push(`<button class="s-btn suave-b chico" type="button" data-eg-terrenos>${x.terrenos.length ? `${x.terrenos.length} ${x.terrenos.length === 1 ? "terreno" : "terrenos"}` : "Terrenos"}</button>`);
          if (e.faltan && e.faltan.length && ed) acc.push(`<button class="s-btn lleno chico" type="button" data-eg-falta="${rq.doc}">Completar</button>`);
          if ((rq.subir || rq.firmar) && ed && e.e !== "no_aplica") acc.push(`<label class="s-btn suave-b chico">${ico("plus", 14)}Subir<input type="file" accept="application/pdf,image/jpeg,image/png" multiple hidden data-eg-subir="${rq.n}"></label>`);
          (e.archivos || []).forEach((a, i) => acc.push(`<button class="s-ib" type="button" aria-label="Ver ${esc(a.nombre)}" data-eg-ver="${rq.n}:${i}">${ico("eye", 15)}</button>`));
          if (ed) acc.push(`<button class="s-ib" type="button" aria-label="Editar el requisito ${rq.n}" data-eg-ed="${rq.n}">${ico("pen", 15)}</button>`);
          return `<div class="eg-f ${e.e}"><span class="num-l">${rq.n}</span><span class="eg-t"><b>${esc(rq.t)}</b><small><span class="chip ${cc} chico-c">${esc(e.t)}</span>${e.faltan && e.faltan.length ? ` ${esc(e.faltan.slice(0, 3).map(f => f.n).join(" · "))}${e.faltan.length > 3 ? " …" : ""}` : ""}</small></span><span class="eg-a">${acc.join("")}</span></div>`;
        }).join("")}</div></section>`;
    };
    const recargar = async () => { x = await D.contextoEnerguate(obraId); await A().quieto(async () => pintar()); };
    pintar();
    box.onchange = async e => {
      const t = e.target; if (!t.dataset.egSubir) return;
      const n = Number(t.dataset.egSubir), files = [...t.files]; t.value = "";
      const g = x.guard.requisitos[n] = x.guard.requisitos[n] || {}; g.archivos = g.archivos || [];
      for (const f of files) { try { g.archivos.push(await D.subirArchivo(f, "energuate")); } catch (er) { aviso(er.message, "mal"); } }
      await D.guardarEnerguate(obraId, x.guard); aviso(files.length === 1 ? "Archivo subido." : "Archivos subidos."); await recargar();
    };
    box.onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      const ocupado = async fn => { b.disabled = true; try { await fn(); } catch (er) { aviso(/[áéíóúñ]/i.test(er.message) ? er.message : "No se pudo armar el documento. Intente otra vez.", "mal"); } finally { b.disabled = false; } };
      if (b.matches("[data-eg-completar]")) { completar(x, { alGuardar: recargar }); return; }
      if (b.matches("[data-eg-todos]")) { completar(x, { todos: true, alGuardar: recargar }); return; }
      if (b.dataset.egFalta) { if (b.dataset.egFalta === "paso" && !x.terrenos.length) { terrenos(x, recargar); return; } completar(x, { doc: b.dataset.egFalta, alGuardar: recargar }); return; }
      if (b.matches("[data-eg-terrenos]")) { terrenos(x, recargar); return; }
      if (b.dataset.egPdf) { await ocupado(async () => { aviso("Armando el documento…"); G().descargar(await G().GEN[b.dataset.egPdf].pdf(x)); }); return; }
      if (b.dataset.egOrig) { await ocupado(async () => { aviso("Llenando el formato de Energuate…"); G().descargar(await G().GEN[b.dataset.egOrig].original(x)); }); return; }
      if (b.matches("[data-eg-docs]")) {
        const l = G().planTodos(x), ok = l.filter(z => !z.falta.length && z.hacer);
        modal({ titulo: "Todos los documentos", guardarTxt: "Bajar carpeta",
          cuerpo: `<p class="suave" style="margin:0;font-size:13.5px">${ok.length} de ${l.length} listos. Se bajan en una carpeta, cada uno con su número; el dictamen también en su Excel y el derecho de paso también en Word.</p>
            <div class="cnt-par">${l.map(z => `<div class="cnt-f"><span><b>${esc(z.nombre)}</b>${z.falta.length ? `<small>${esc(z.falta.slice(0, 3).join(" · "))}${z.falta.length > 3 ? " …" : ""}</small>` : ""}</span><span class="acc"><span class="chip ${z.falta.length ? "ambar" : "verde"} chico-c">${z.falta.length ? "Falta" : "Listo"}</span></span></div>`).join("")}</div>`,
          alGuardar: async () => {
            if (!ok.length) throw new Error("Todavía no hay documentos listos. Use «Completar lo que falta».");
            aviso("Armando los documentos…");
            const r = await G().todos(x);
            G().bajarDirecto(r); cerrarCapas(); aviso(r.n === 1 ? "Se bajó 1 documento." : `Se bajaron ${r.n} documentos.`);
          } });
        return;
      }
      if (b.matches("[data-eg-req]")) { await ocupado(async () => G().descargar(await G().requisitos(x))); return; }
      if (b.matches("[data-eg-exp]")) { await ocupado(async () => { aviso("Armando el expediente en el orden de Energuate… puede tardar."); G().descargar(await G().expediente(x)); }); return; }
      if (b.dataset.egVer) { const [n, i] = b.dataset.egVer.split(":").map(Number); const a = x.guard.requisitos[n].archivos[i]; const bl = await D.archivo(a.ref); if (!bl) { aviso("No se encontró el archivo.", "mal"); return; } const u = URL.createObjectURL(bl); const w = window.open(u, "_blank"); if (w) w.opener = null; setTimeout(() => URL.revokeObjectURL(u), 60000); return; }
      if (b.dataset.egEd) {
        const n = Number(b.dataset.egEd), rq = D.REQUISITOS_EG.find(r => r.n === n), g = x.guard.requisitos[n] || {};
        modal({ titulo: `Requisito ${n}`, guardarTxt: "Guardar",
          cuerpo: `<p class="suave" style="margin:0;font-size:14px"><b style="color:var(--text)">${esc(rq.t)}</b></p>
            <label class="sw-fila"><span>No aplica a esta obra</span><input type="checkbox" class="sw" name="na" ${g.no_aplica ? "checked" : ""}></label>
            ${rq.subir || rq.firmar ? `<label class="sw-fila"><span>Ya lo tienen (en papel)</span><input type="checkbox" class="sw" name="listo" ${g.listo ? "checked" : ""}></label>` : ""}
            ${(g.archivos || []).length ? `<div class="f-campo"><span>Archivos subidos</span>${g.archivos.map((a, i) => `<label class="f-check"><input type="checkbox" name="q${i}"><span>Quitar «${esc(a.nombre)}»</span></label>`).join("")}</div>` : ""}`,
          alGuardar: async f => {
            const q = (g.archivos || []).filter((a, i) => f.elements["q" + i] && f.elements["q" + i].checked);
            for (const a of q) await D.quitarArchivo(a.ref);
            x.guard.requisitos[n] = { ...g, no_aplica: f.elements.na.checked, listo: f.elements.listo ? f.elements.listo.checked : g.listo, archivos: (g.archivos || []).filter(a => !q.includes(a)) };
            await D.guardarEnerguate(obraId, x.guard); cerrarCapas(); aviso("Requisito guardado."); await recargar();
          } });
      }
    };
  }

  async function seccionCotizacion(box, c, puede) {
    const { esc, ico, modal, cerrarCapas, aviso } = A();
    const en = D.enlaceDe ? await D.enlaceDe(c.id).catch(() => null) : null;
    const cli = (en && en.tramite) || {};
    const sol = { ...(cli.sol || {}), ...Object.fromEntries(Object.entries((c.tramite || {}).sol || {}).filter(([, v]) => String(v || "").trim())) };
    const CAMP = D.CAMPOS_EG.filter(x => x.donde === "sol");
    const llenos = CAMP.filter(x => !x.opcional && String(sol[x.k] || "").trim()).length, total = CAMP.filter(x => !x.opcional).length;
    const ter = (cli.terrenos || []).length;
    box.innerHTML = `<p class="suave" style="margin:0;font-size:13.5px">Para la licencia de construcción se necesitan el DPI y los datos del interesado, y de cada terreno por donde pasa la línea. El cliente los puede llenar desde su enlace después de aprobar.</p>
      <div class="cnt-cot-f"><span><b>${llenos} de ${total} datos del interesado${ter ? ` · ${ter} ${ter === 1 ? "terreno" : "terrenos"}` : ""}</b><small>${cli.fecha ? "El cliente los mandó desde su enlace" : "Todavía no los manda el cliente"}</small></span>${puede ? `<button class="s-btn suave-b chico" type="button" data-sol-ed>${ico("pen", 14)}Completar</button>` : ""}</div>`;
    const r = box.closest("details") && box.closest("details").querySelector("[data-res-eg]"); if (r) r.textContent = `${llenos} de ${total} datos${ter ? ` · ${ter} terrenos` : ""}`;
    box.onclick = e => {
      if (!e.target.closest("[data-sol-ed]")) return;
      modal({ titulo: "Datos del interesado", guardarTxt: "Guardar", cuerpo: CAMP.map(x => campoHTML(x, sol[x.k] || "")).join(""),
        alGuardar: async f => { const n = {}; CAMP.forEach(x => { n[x.k] = String(f.elements[x.k].value || "").trim(); }); await D.guardarSolicitante(c.id, n); c.tramite = { ...(c.tramite || {}), sol: { ...((c.tramite || {}).sol || {}), ...n } }; cerrarCapas(); aviso("Datos guardados."); seccionCotizacion(box, c, puede); } });
    };
  }

  return { pantalla, seccionCotizacion, completar };
})();
