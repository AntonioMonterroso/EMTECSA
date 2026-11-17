"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.energuate";
  const leer = () => { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return { v: 1, cambios: false, obras: {} }; };
  const escribir = d => { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }

  const REGIONES = ["Nor Oriente I", "Nor Oriente II", "Sur Occidente I", "Sur Occidente II", "Centro Occidente I", "Centro Occidente II", "Sur Oriente", "Petén", "Centro Oriente", "Nor Occidente"];
  const MENUS = {
    tension: ["13.8 Monofásico", "13.8 Trifásico", "34.5 Monofásico", "34.5 Trifásico"],
    tipo_trafo: ["Autoprotegido", "Otro"], servicio: ["Colectivo", "Exclusivo"], fases: ["R", "S", "T", "RS", "RT", "ST", "RST"],
    conductor: ["477 MCM Hawk", "266 MCM Partridge", "4/0 AWG Penguin", "Conductor Aislado 1/0 15 kV Neutro Completo", "Conductor Aislado 1/0 35 kV Neutro Completo", "Conductor Aislado 4/0 15 kV Neutro 1/3", "Conductor Aislado 4/0 35 kV Neutro 1/3", "1/0 AWG Raven", "Otro"],
    neutro: ["266 MCM Partridge", "1/0 AWG Raven", "Otro"],
    bt: ["Triplex #2 AAC-#2 AAAC", "Triplex 1/0 AAC-1/0 AAAC", "Triplex 4/0 AAC-4/0 AAAC", "Cuadruplex 1/0 AAC-1/0 AAAC", "Cuadruplex 4/0 AAC-4/0 AAAC", "Cuadruplex 336.4 AAC-4/0 AAAC", "Duplex #6 AAC-#6 AAC", "Otro"],
    poste_material: ["Concreto", "Chapa Metálica", "Madera"], medicion: ["BT Simple", "BT Indirecto", "MT"],
    trafo_medida: ["Convencional", "Pad Mounted"], tipo_medida: ["Indirecta en Baja Tensión", "Indirecta en Media Tensión"], panel_base: ["Base A", "Socket", "Combinado"]
  };

  const F = (k, n, donde, o = {}) => ({ k, n, donde, ...o });
  const CAMPOS = [
    F("sol_nombre", "Nombre completo del interesado o representante", "sol", { docs: ["boleta", "capacidad", "medida", "carta_licencia", "requisitos"] }),
    F("sol_dpi", "DPI del interesado", "sol", { docs: ["boleta"], dpi: true }),
    F("sol_telefono", "Teléfono del interesado", "sol", { docs: ["boleta", "medida"] }),
    F("sol_correo", "Correo del interesado", "sol", { docs: ["boleta", "medida"], opcional: true }),
    F("sol_direccion", "Dirección del interesado", "sol", { docs: ["boleta"] }),
    F("sol_ref_nombre", "Referencia: nombre", "sol", { docs: ["boleta"], opcional: true }),
    F("sol_ref_telefono", "Referencia: teléfono", "sol", { docs: ["boleta"], opcional: true }),
    F("resp_nombre", "Responsable de la constructora", "emp", { docs: ["boleta", "carta_normas"] }),
    F("resp_dpi", "DPI del responsable de la constructora", "emp", { docs: ["boleta"], dpi: true }),
    F("ing_nombre", "Ingeniero electricista que firma", "emp", { docs: ["capacidad", "medida"] }),
    F("ing_titulo", "Título del ingeniero", "emp", { docs: ["medida"] }),
    F("ing_colegiado", "Número de colegiado activo", "emp", { docs: ["capacidad", "medida"] }),
    F("ing_vence", "Constancia de colegiado vigente hasta", "emp", { docs: ["capacidad", "medida"], tipo: "date" }),
    F("ing_telefono", "Teléfono del ingeniero", "emp", { docs: ["capacidad"] }),
    F("ing_id", "Identificador del ingeniero en Energuate", "emp", { docs: ["capacidad"], opcional: true }),
    F("obra_direccion", "Dirección de la obra", "obra", { docs: ["boleta", "capacidad", "medida", "requisitos", "carta_licencia"] }),
    F("obra_municipio", "Municipio de la obra", "obra", { docs: ["boleta", "medida", "paso"] }),
    F("obra_departamento", "Departamento de la obra", "obra", { docs: ["boleta", "medida", "paso"] }),
    F("region", "Región de Energuate", "obra", { docs: ["medida"], menu: REGIONES }),
    F("tension", "Tensión de servicio", "obra", { docs: ["capacidad"], menu: MENUS.tension }),
    F("tipo_trafo", "Tipo de transformador", "obra", { docs: ["capacidad"], menu: MENUS.tipo_trafo }),
    F("servicio", "Tipo de servicio", "obra", { docs: ["capacidad"], menu: MENUS.servicio }),
    F("fases", "Fases que va a usar", "obra", { docs: ["capacidad"], menu: MENUS.fases }),
    F("conductor", "Conductor en fases", "obra", { docs: ["capacidad"], menu: MENUS.conductor }),
    F("neutro", "Conductor en neutro", "obra", { docs: ["capacidad"], menu: MENUS.neutro }),
    F("bt", "Conductor de baja tensión", "obra", { docs: ["capacidad"], menu: MENUS.bt }),
    F("poste_material", "Material de los postes", "obra", { docs: ["capacidad"], menu: MENUS.poste_material }),
    F("medicion", "Tipo de medición", "obra", { docs: ["capacidad"], menu: MENUS.medicion }),
    F("descripcion_carga", "Descripción de la carga", "obra", { docs: ["capacidad"], area: true }),
    F("clientes_n", "Número de clientes a conectar", "obra", { docs: ["capacidad"], num: true }),
    F("actividad", "Actividad económica de los clientes a conectar", "obra", { docs: ["clientes"] }),
    F("matricula_ct", "Matrícula del centro de transformación más cercano al entronque", "obra", { docs: ["capacidad"] }),
    F("incremento", "Porcentaje de incremento de carga", "obra", { docs: ["capacidad"], num: true, opcional: true }),
    F("potencia_kw", "Potencia a contratar (kW)", "obra", { docs: ["medida"], num: true }),
    F("trafo_medida", "Tipo de transformador (medida)", "obra", { docs: ["medida"], menu: MENUS.trafo_medida }),
    F("volt_bt", "Voltaje de baja tensión (V)", "obra", { docs: ["medida"], num: true }),
    F("prot_primaria", "Protección principal primaria (A)", "obra", { docs: ["medida"], num: true }),
    F("prot_secundaria", "Protección principal secundaria (A)", "obra", { docs: ["medida"], num: true }),
    F("tipo_medida", "Tipo de medida", "obra", { docs: ["medida"], menu: MENUS.tipo_medida }),
    F("ct_marca", "CT: marca", "obra", { docs: ["medida"], grupo: "ct" }), F("ct_tipo", "CT: tipo", "obra", { docs: ["medida"], grupo: "ct" }), F("ct_relacion", "CT: relación", "obra", { docs: ["medida"], grupo: "ct" }),
    F("ct_anio", "CT: año de fabricación", "obra", { docs: ["medida"], grupo: "ct" }), F("ct_precision", "CT: precisión", "obra", { docs: ["medida"], grupo: "ct" }), F("ct_rf", "CT: RF", "obra", { docs: ["medida"], grupo: "ct" }),
    F("ct_r", "CT: serie R", "obra", { docs: ["medida"], grupo: "ct" }), F("ct_s", "CT: serie S", "obra", { docs: ["medida"], grupo: "ct" }), F("ct_t", "CT: serie T", "obra", { docs: ["medida"], grupo: "ct" }),
    F("pt_marca", "PT: marca", "obra", { docs: ["medida"], grupo: "pt", opcional: true }), F("pt_tipo", "PT: tipo", "obra", { docs: ["medida"], grupo: "pt", opcional: true }), F("pt_relacion", "PT: relación", "obra", { docs: ["medida"], grupo: "pt", opcional: true }),
    F("pt_anio", "PT: año", "obra", { docs: ["medida"], grupo: "pt", opcional: true }), F("pt_precision", "PT: precisión", "obra", { docs: ["medida"], grupo: "pt", opcional: true }), F("pt_v", "PT: V primario / secundario", "obra", { docs: ["medida"], grupo: "pt", opcional: true }),
    F("pt_r", "PT: serie R", "obra", { docs: ["medida"], grupo: "pt", opcional: true }), F("pt_s", "PT: serie S", "obra", { docs: ["medida"], grupo: "pt", opcional: true }), F("pt_t", "PT: serie T", "obra", { docs: ["medida"], grupo: "pt", opcional: true }),
    F("medida_x", "Punto de medida: X (UTM)", "obra", { docs: ["medida"], num: true }), F("medida_y", "Punto de medida: Y (UTM)", "obra", { docs: ["medida"], num: true }),
    F("panel_marca", "Panel de medidores: marca", "obra", { docs: ["centralizacion"] }), F("panel_tipo", "Panel: tipo", "obra", { docs: ["centralizacion"], menu: MENUS.panel_base }),
    F("panel_base_a", "Medidores base A", "obra", { docs: ["centralizacion"], num: true }), F("panel_socket", "Medidores tipo socket", "obra", { docs: ["centralizacion"], num: true }),
    F("panel_amp_p", "Ampacidad de barras principales", "obra", { docs: ["centralizacion"] }), F("panel_amp_s", "Ampacidad de barras secundarias", "obra", { docs: ["centralizacion"] }),
    F("paso_desde_mun", "La línea sale del municipio de", "obra", { docs: ["paso"] }), F("paso_desde_dep", "Del departamento de", "obra", { docs: ["paso"] }),
    F("paso_hasta_mun", "Llega al municipio de", "obra", { docs: ["paso"] }), F("paso_hasta_dep", "Del departamento de", "obra", { docs: ["paso"] })
  ];
  const TERRENO = [["nombre", "Nombre del poseedor"], ["edad", "Edad"], ["civil", "Estado civil"], ["profesion", "Profesión u oficio"], ["domicilio", "Departamento donde vive"], ["dpi", "DPI"], ["ubicacion", "Ubicación del inmueble"], ["municipio", "Municipio"], ["departamento", "Departamento"], ["norte", "Colinda al norte con"], ["sur", "Al sur con"], ["oriente", "Al oriente con"], ["poniente", "Al poniente con"], ["area", "Metros cuadrados del paso"], ["largo", "Metros de largo"], ["ancho", "Metros de ancho"]];

  const REQUISITOS = [
    { n: 1, t: "Formato de información del interesado y del constructor", doc: "boleta" },
    { n: 2, t: "Documentación legal del cliente y de la constructora (DPI, nombramiento, patente y RTU)", subir: true, fijos: /patente|rtu|nombramiento|sociedad/i },
    { n: 3, t: "Fianza de cumplimiento del 10 % con 180 días de vigencia", subir: true, fianza: "cumplimiento" },
    { n: 4, t: "Fianza de contratación", subir: true },
    { n: 5, t: "Carta de solicitud de la licencia firmada por el propietario", doc: "carta_licencia" },
    { n: 6, t: "Carta del constructor sobre las Normas de Seguridad y Medio Ambiente", doc: "carta_normas" },
    { n: 7, t: "Listado de clientes a conectar y su actividad económica", doc: "clientes" },
    { n: 8, t: "Solicitud de Dictamen de Capacidad", doc: "capacidad" },
    { n: 9, t: "Documentos para el Dictamen de Medida (centralización o más de 50 kVA)", doc: "medida", aplica: x => x.kva > 50 || x.v.centralizacion },
    { n: 10, t: "Presupuesto de la obra", doc: "presupuesto" },
    { n: 11, t: "Listado de materiales con detalle técnico, precio por unidad y total", doc: "materiales" },
    { n: 12, t: "Libreta de puntos GPS de los postes (UTM)", doc: "gps" },
    { n: 13, t: "Plano de planta general firmado, sellado y timbrado", doc: "plano", firmar: true },
    { n: 14, t: "Memoria de cálculo firmada, sellada y timbrada", subir: true },
    { n: 15, t: "Constancia de colegiado activo (6 meses de vigencia)", subir: true, fijos: /colegiad/i },
    { n: 16, t: "Derechos de vía autenticados por abogado o alcalde", doc: "paso", subir: true },
    { n: 17, t: "Factura y protocolo de los postes", subir: true },
    { n: 18, t: "Facturas y garantía de los transformadores (libres de PCB)", subir: true },
    { n: 19, t: "Autorización para alumbrado público", subir: true, opcional: true },
    { n: 20, t: "Constancia de autorización forestal (CONAP, INAB o MARN)", subir: true, opcional: true }
  ];

  async function guardado(obraId) {
    if (!nube) return JSON.parse(JSON.stringify(leer().obras[obraId] || { campos: {}, requisitos: {}, terrenos: [] }));
    const r = await sb.from("obra_energuate").select("datos").eq("obra_id", obraId).maybeSingle();
    return (r.data && r.data.datos) || { campos: {}, requisitos: {}, terrenos: [] };
  }
  async function guardarEnerguate(obraId, datos) {
    const x = { campos: datos.campos || {}, requisitos: datos.requisitos || {}, terrenos: datos.terrenos || [] };
    if (!nube) { const d = leer(); d.obras[obraId] = x; escribir(d); return; }
    await ok(await sb.from("obra_energuate").upsert({ obra_id: obraId, datos: x, actualizado: new Date().toISOString() }), "No se pudieron guardar los datos de Energuate.");
  }

  const vacioS = v => v == null || String(v).trim() === "";
  const POSTE_LONG = { poste9_pr: "9 M", poste106_pr: "10.67 M" };

  async function contexto(obraId) {
    const o = await D.obra(obraId);
    if (!o) return null;
    const [cat, cfg, emp, cot, cli, guard] = await Promise.all([D.catalogo(), D.ajustesConteo(), D.empresa(), o.cotizacion_id ? D.cotizacion(o.cotizacion_id) : null, D.cliente(o.cliente_id), guardado(obraId)]);
    let pl = await D.plano("obra", obraId).catch(() => null);
    if ((!pl || !pl.datos || !(pl.datos.elementos || []).length) && o.cotizacion_id) pl = await D.plano("cot", o.cotizacion_id).catch(() => null);
    const en = o.cotizacion_id && D.enlaceDe ? await D.enlaceDe(o.cotizacion_id).catch(() => null) : null;
    const sitio = cli && cli.sitios.find(s => s.id === (o.sitio_id || (cot && cot.sitio_id)));
    const contacto = cli && cot && cli.contactos.find(k => k.id === cot.contacto_id);
    const k = cot ? D.calcularCotizacion(cot, await D.catalogoParaCotizacion(cat, cot.id)) : null;
    const fz = D.resumenCobros ? await D.resumenCobros().catch(() => null) : null;
    const d = pl && pl.datos && (pl.datos.elementos || []).length ? pl.datos : null;
    const conteo = d ? D.contarPlano(d, cat, cfg, pl.machote) : null;
    const plano = analizarPlano(d, cat, cfg, pl && pl.machote);
    const solCliente = (en && en.tramite && en.tramite.sol) || {};
    const solCot = (cot && cot.tramite && cot.tramite.sol) || {};
    const kvaCot = k ? k.partidas.filter(p => p.incluida !== false && p.estructura && p.estructura.clase === "transformador").reduce((a, p) => a + Number(p.estructura.kva || 0) * p.cantidad, 0) : 0;
    const kva = plano.kva || kvaCot;
    const op = d ? D.opcionesConteo(d, cfg, pl.machote) : { kv: cfg.kv, calibre: cfg.calibre, triplex: cfg.triplex };
    const auto = {
      sol_nombre: cli ? (cli.razon_social || cli.nombre) : "", sol_telefono: (contacto && contacto.telefono) || (cli && cli.telefono) || "", sol_correo: (contacto && contacto.correo) || (cli && cli.correo) || "", sol_direccion: (cli && cli.direccion) || "",
      obra_direccion: sitio ? (sitio.direccion || sitio.nombre || "") : "", obra_municipio: (sitio && sitio.municipio) || "", obra_departamento: (sitio && sitio.departamento) || "",
      tension: `${Number(op.kv) >= 30 ? "34.5" : "13.8"} ${plano.fases >= 2 ? "Trifásico" : "Monofásico"}`, tipo_trafo: "Autoprotegido", servicio: "Exclusivo", fases: plano.fases >= 3 ? "RST" : plano.fases === 2 ? "RS" : "R",
      conductor: /4\/0/.test(op.calibre) ? "4/0 AWG Penguin" : "1/0 AWG Raven", neutro: "1/0 AWG Raven", bt: op.triplex === "4/0" ? "Triplex 4/0 AAC-4/0 AAAC" : "Triplex 1/0 AAC-1/0 AAAC",
      poste_material: (plano.postes.find(q => q.material) || {}).material || "Concreto", medicion: kva > 50 ? "BT Indirecto" : "BT Simple", clientes_n: "1", incremento: "0", trafo_medida: "Convencional", volt_bt: "240", tipo_medida: "Indirecta en Baja Tensión",
      potencia_kw: kva ? String(Math.round(kva * 0.9)) : "", medida_x: plano.arranque ? String(plano.arranque.x) : "", medida_y: plano.arranque ? String(plano.arranque.y) : "",
      paso_desde_mun: (sitio && sitio.municipio) || "", paso_desde_dep: (sitio && sitio.departamento) || "", paso_hasta_mun: (sitio && sitio.municipio) || "", paso_hasta_dep: (sitio && sitio.departamento) || ""
    };
    const v = {};
    CAMPOS.forEach(c => {
      const g = c.donde === "emp" ? emp[c.k] : c.donde === "sol" ? (!vacioS(solCot[c.k]) ? solCot[c.k] : solCliente[c.k]) : guard.campos[c.k];
      v[c.k] = !vacioS(g) ? g : (auto[c.k] != null ? auto[c.k] : "");
    });
    v.centralizacion = !!guard.campos.centralizacion;
    const terrenos = (guard.terrenos && guard.terrenos.length ? guard.terrenos : (en && en.tramite && en.tramite.terrenos) || []).map(t => ({ ...t }));
    const fianzaC = fz ? (fz.fianzas || []).find(f => f.obra_id === obraId && f.tipo === "cumplimiento") : null;
    const fijos = await D.docsFijos().catch(() => []);
    return { o, cot, k, cli, sitio, contacto, emp, cat, cfg, pl, d, conteo, plano, op, kva, v, guard, terrenos, en, fianzaC, fijos, solCliente };
  }

  function analizarPlano(d, cat, cfg, mc) {
    const r = { kva: 0, trafos: {}, otros: 0, metrosMT: 0, metrosBT: 0, postes: [], fases: 1, arranque: null, centros: [], sinUtm: 0, gps: [] };
    if (!d) return r;
    const m = Object.fromEntries(d.elementos.map(e => [e.id, e]));
    const ref = d.ref;
    const pos = e => (e.utm && e.utm.e != null && e.utm.n != null && ref) ? [Number(e.utm.e) - ref.e, ref.n - Number(e.utm.n)] : [e.x, e.y];
    const utmDe = e => { if (e.utm && e.utm.e != null && e.utm.n != null) return { x: Number(e.utm.e), y: Number(e.utm.n) }; if (ref) { const [x, y] = pos(e); return { x: Math.round(ref.e + x), y: Math.round(ref.n - y) }; } return null; };
    const MT = { mt1f: 1, mt2f: 2, mt3f: 3 };
    d.lineas.forEach(l => {
      if (l.e !== "proyectado") return;
      const a = m[l.a], b = m[l.b]; if (!a || !b) return;
      const mts = l.m != null && String(l.m).trim() !== "" && isFinite(Number(String(l.m).replace(",", "."))) ? Number(String(l.m).replace(",", ".")) : Math.hypot(pos(a)[0] - pos(b)[0], pos(a)[1] - pos(b)[1]);
      if (MT[l.t]) { r.metrosMT += mts; r.fases = Math.max(r.fases, MT[l.t]); } else if (l.t === "triplex" || l.t === "bt") r.metrosBT += mts;
    });
    r.metrosMT = Math.round(r.metrosMT); r.metrosBT = Math.round(r.metrosBT);
    const postes = d.elementos.filter(e => /^poste/.test(e.s) || e.s === "tubo_ex");
    postes.forEach(e => {
      const u = utmDe(e);
      if (/_pr$/.test(e.s)) { const det = String(e.det || "").toUpperCase(); r.postes.push({ e, long: POSTE_LONG[e.s] || "", utm: u, material: /METAL|CHAPA|ACERO/.test(det) ? "Chapa Metálica" : /MADERA/.test(det) ? "Madera" : /CONCRETO/.test(det) ? "Concreto" : null }); if (!u) r.sinUtm++; }
      if (u) r.gps.push({ cod: e.cod || "", tipo: /_pr$/.test(e.s) ? "Nuevo" : "Existente", desc: [window.EMT_SIMB && window.EMT_SIMB.P[e.s] ? window.EMT_SIMB.P[e.s].n : e.s, String(e.det || "").split("\n")[0]].filter(Boolean).join(" · "), x: u.x, y: u.y, zona: (e.utm && e.utm.z) || "15 P" });
    });
    const arr = postes.find(e => !/_pr$/.test(e.s) && D.situacionPoste(d, e, cfg, m)) || postes.find(e => /_pr$/.test(e.s));
    if (arr) r.arranque = utmDe(arr);
    d.elementos.filter(e => e.s === "trafo_pr" && !e.noCot).forEach(e => {
      const kva = Number(e.kva || 0);
      r.kva += kva;
      if ([10, 25, 50, 75].includes(kva)) r.trafos[kva] = (r.trafos[kva] || 0) + 1; else r.otros += kva ? 1 : 0;
      const [tx, ty] = pos(e);
      const cerca = postes.map(p => [p, Math.hypot(pos(p)[0] - tx, pos(p)[1] - ty)]).sort((a, b) => a[1] - b[1])[0];
      const u = e.utm && e.utm.e != null && e.utm.n != null ? utmDe(e) : cerca && cerca[1] < 8 ? utmDe(cerca[0]) : utmDe(e) || (cerca && cerca[1] < 20 ? utmDe(cerca[0]) : null);
      r.centros.push(u);
    });
    return r;
  }

  function faltan(doc, x) {
    const l = CAMPOS.filter(c => (c.docs || []).includes(doc) && !c.opcional && vacioS(x.v[c.k]));
    if (doc === "paso" && !x.terrenos.length) l.push({ k: "_terrenos", n: "Datos de cada terreno por donde pasa la línea" });
    if (doc === "gps" && (!x.plano.gps.length || x.plano.sinUtm)) l.push({ k: "_utm", n: x.plano.gps.length ? `${x.plano.sinUtm} postes nuevos sin coordenadas UTM en el plano` : "Coordenadas UTM de los postes en el plano" });
    if (doc === "capacidad" && !x.d) l.push({ k: "_plano", n: "El plano de la obra" });
    if (doc === "capacidad" && x.d && !x.kva) l.push({ k: "_kva", n: "Los kVA de los transformadores en el plano" });
    if (doc === "medida" && !x.plano.arranque) l.push({ k: "_arranque", n: "Coordenadas UTM del punto de entronque en el plano" });
    if (["presupuesto", "materiales"].includes(doc) && !x.k) l.push({ k: "_cot", n: "La cotización de la obra" });
    if (doc === "plano" && !x.d) l.push({ k: "_plano", n: "El plano de la obra" });
    if (doc === "centralizacion" && !x.v.centralizacion) return [];
    return l;
  }

  function estadoRequisito(rq, x) {
    const g = x.guard.requisitos[rq.n] || {};
    if (g.no_aplica) return { e: "no_aplica", t: "No aplica" };
    if (rq.aplica && !rq.aplica(x)) return { e: "no_aplica", t: "No aplica", auto: true };
    const archivos = g.archivos || [];
    const fijos = rq.fijos ? x.fijos.filter(f => rq.fijos.test(f.nombre)) : [];
    if (rq.fianza && x.fianzaC) return { e: "listo", t: "Fianza registrada" + (archivos.length ? " · documento subido" : ""), archivos, fijos };
    if (rq.doc) {
      const f = faltan(rq.doc, x);
      if (rq.doc === "paso") { if (archivos.length) return { e: "listo", t: `${archivos.length} ${archivos.length === 1 ? "autenticado subido" : "autenticados subidos"}`, archivos }; return f.length ? { e: "falta", t: (f.length === 1 ? "Falta 1 dato" : `Faltan ${f.length} datos`), faltan: f, archivos } : { e: "firmar", t: "Listo para firmar y autenticar", archivos }; }
      if (f.length) return { e: "falta", t: (f.length === 1 ? "Falta 1 dato" : `Faltan ${f.length} datos`), faltan: f, archivos };
      return { e: g.listo || archivos.length ? "listo" : rq.firmar ? "firmar" : "lleno", t: g.listo || archivos.length ? "Listo" : rq.firmar ? "Listo para firmar y sellar" : "Se llena solo", archivos };
    }
    if (archivos.length || g.listo) return { e: "listo", t: archivos.length ? `${archivos.length} ${archivos.length === 1 ? "archivo" : "archivos"}` : "Ya lo tienen", archivos, fijos };
    if (fijos.length) return { e: "listo", t: `De Empresa: ${fijos.map(f => f.nombre).join(", ")}`, archivos, fijos };
    return { e: rq.opcional ? "opcional" : "subir", t: rq.opcional ? "Solo si aplica" : "Falta subir", archivos };
  }

  async function guardarSolicitante(cotId, sol) {
    const c = await D.cotizacion(cotId); if (!c) throw new Error("No se encontró la cotización.");
    c.tramite = { ...(c.tramite || {}), sol: { ...((c.tramite || {}).sol || {}), ...sol } };
    if (!nube) { const k = "emtecsa.sistema.cotizaciones"; const d = JSON.parse(localStorage.getItem(k)); const x = d.cotizaciones.find(y => y.id === cotId); x.tramite = c.tramite; d.cambios = true; localStorage.setItem(k, JSON.stringify(d)); return; }
    await ok(await sb.from("cotizaciones").update({ tramite: c.tramite }).eq("id", cotId), "No se pudieron guardar los datos del solicitante.");
  }

  Object.assign(D, { REGIONES_EG: REGIONES, MENUS_EG: MENUS, CAMPOS_EG: CAMPOS, TERRENO_EG: TERRENO, REQUISITOS_EG: REQUISITOS, contextoEnerguate: contexto, guardarEnerguate, faltanEnerguate: faltan, estadoRequisito, guardarSolicitante });
})();
