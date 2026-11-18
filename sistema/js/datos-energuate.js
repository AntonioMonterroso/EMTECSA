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
    F("obra_departamento", "Departamento de la obra", "obra", { docs: ["boleta", "medida", "paso"], geoD: "obra", par: "obra_municipio" }),
    F("obra_municipio", "Municipio de la obra", "obra", { docs: ["boleta", "medida", "paso"], geoM: "obra", par: "obra_departamento" }),
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
    F("paso_desde_dep", "La línea sale del departamento de", "obra", { docs: ["paso"], geoD: "desde", par: "paso_desde_mun" }), F("paso_desde_mun", "Del municipio de", "obra", { docs: ["paso"], geoM: "desde", par: "paso_desde_dep" }),
    F("paso_hasta_dep", "Llega al departamento de", "obra", { docs: ["paso"], geoD: "hasta", par: "paso_hasta_mun" }), F("paso_hasta_mun", "Del municipio de", "obra", { docs: ["paso"], geoM: "hasta", par: "paso_hasta_dep" })
  ];
  const TERRENO = [["nombre", "Nombre del poseedor"], ["edad", "Edad"], ["civil", "Estado civil"], ["profesion", "Profesión u oficio"], ["domicilio", "Departamento donde vive"], ["dpi", "DPI"], ["ubicacion", "Ubicación del inmueble"], ["departamento", "Departamento"], ["municipio", "Municipio"], ["norte", "Colinda al norte con"], ["sur", "Al sur con"], ["oriente", "Al oriente con"], ["poniente", "Al poniente con"], ["area", "Metros cuadrados del paso"], ["largo", "Metros de largo"], ["ancho", "Metros de ancho"]];

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
  const ACTIVIDAD = { industria: "Industrial", comercio: "Comercial", gobierno: "Servicio público", residencial: "Residencial", distribuidora: "Distribución de energía" };
  const FUSIBLES = [1, 2, 3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 65, 80, 100, 140, 200];
  const FLIPONES = [15, 20, 30, 40, 50, 60, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000];
  const arriba = (l, n) => l.find(z => z >= n) || l[l.length - 1];
  function protecciones(kva, kv, fases, vbt) {
    if (!(kva > 0)) return { p: "", s: "" };
    const kvl = Number(kv) >= 30 ? 34.5 : 13.8, r3 = Math.sqrt(3), v = Number(vbt) || 240;
    const ip = fases >= 3 ? kva / (r3 * kvl) : fases === 2 ? kva / kvl : kva / (kvl / r3);
    const is = fases >= 3 ? kva * 1000 / (r3 * v) : kva * 1000 / v;
    return { p: String(arriba(FUSIBLES, ip * 1.5)), s: String(arriba(FLIPONES, is * 1.25)) };
  }
  const voltDe = mc => { const t = String((mc && mc.servicio) || ""); return /480/.test(t) ? "480" : /208/.test(t) ? "208" : "240"; };
  const claveIng = g => String((g && (g.colegiado || g.nombre)) || "");
  async function anteriores(obraId) {
    let l = [];
    if (!nube) l = Object.entries(leer().obras).filter(([id]) => String(id) !== String(obraId)).map(([, g]) => (g && g.campos) || {}).sort((a, b) => String(b._fecha || "").localeCompare(String(a._fecha || "")));
    else { const r = await sb.from("obra_energuate").select("obra_id, datos, actualizado").neq("obra_id", obraId).order("actualizado", { ascending: false }).limit(300); l = (r.data || []).map(z => (z.datos && z.datos.campos) || {}); }
    return l;
  }
  function recordar(lista, mun, dep) {
    const r = {};
    const igual = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase() && String(a || "").trim() !== "";
    ["region", "subestacion", "smt"].forEach(k => {
      const c = lista.find(z => !vacioS(z[k]) && igual(z._mun, mun) && igual(z._dep, dep)) || (k === "region" ? lista.find(z => !vacioS(z[k]) && igual(z._dep, dep)) : null);
      if (c) r[k] = c[k];
    });
    return r;
  }
  const POSTE_LONG = { poste9_pr: "9 M", poste106_pr: "10.67 M" };

  async function contexto(obraId) {
    const o = await D.obra(obraId);
    if (!o) return null;
    const [cat, cfg, emp, cot, cli, guard, previas] = await Promise.all([D.catalogo(), D.ajustesConteo(), D.empresa(), o.cotizacion_id ? D.cotizacion(o.cotizacion_id) : null, D.cliente(o.cliente_id), guardado(obraId), anteriores(obraId).catch(() => [])]);
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
    const ings = D.ingenierosDe(emp);
    const ing = ings.find(g => claveIng(g) === guard.campos.ingeniero) || ings[0] || {};
    const empV = { ...emp, ...Object.fromEntries(Object.entries(D.ING_K).map(([a, b]) => [a, ing[b] || ""])) };
    const quien = String(guard.campos.interesado || "");
    const kSel = cli && quien.startsWith("k:") ? cli.contactos.find(z => String(z.id) === quien.slice(2)) : null;
    const kDe = kSel || contacto;
    const rec = recordar(previas, sitio && sitio.municipio, sitio && sitio.departamento);
    const fasesV = plano.fases;
    const vbt = !vacioS(guard.campos.volt_bt) ? guard.campos.volt_bt : voltDe(pl && pl.machote);
    const pr = protecciones(kva, op.kv, fasesV, vbt);
    const act = cli ? ACTIVIDAD[cli.tipo] || "" : "";
    const auto = {
      sol_nombre: kSel ? kSel.nombre : cli ? (cli.razon_social || cli.nombre) : "", sol_telefono: (kDe && kDe.telefono) || (cli && cli.telefono) || "", sol_correo: (kDe && kDe.correo) || (cli && cli.correo) || "", sol_direccion: (cli && cli.direccion) || "",
      actividad: act, descripcion_carga: act ? `Carga ${act.toLowerCase()} para ${(cot && cot.titulo) || o.titulo || "la obra"}` : "",
      matricula_ct: plano.matricula || "", region: rec.region || "", prot_primaria: pr.p, prot_secundaria: pr.s,
      obra_direccion: sitio ? (sitio.direccion || sitio.nombre || "") : "", obra_municipio: (sitio && sitio.municipio) || "", obra_departamento: (sitio && sitio.departamento) || "",
      tension: `${Number(op.kv) >= 30 ? "34.5" : "13.8"} ${plano.fases >= 2 ? "Trifásico" : "Monofásico"}`, tipo_trafo: "Autoprotegido", servicio: "Exclusivo", fases: plano.fases >= 3 ? "RST" : plano.fases === 2 ? "RS" : "R",
      conductor: /4\/0/.test(op.calibre) ? "4/0 AWG Penguin" : "1/0 AWG Raven", neutro: "1/0 AWG Raven", bt: op.triplex === "4/0" ? "Triplex 4/0 AAC-4/0 AAAC" : "Triplex 1/0 AAC-1/0 AAAC",
      poste_material: (plano.postes.find(q => q.material) || {}).material || "Concreto", medicion: kva > 50 ? "BT Indirecto" : "BT Simple", clientes_n: "1", incremento: "0", trafo_medida: "Convencional", volt_bt: voltDe(pl && pl.machote), tipo_medida: "Indirecta en Baja Tensión",
      potencia_kw: kva ? String(Math.round(kva * 0.9)) : "", medida_x: plano.arranque ? String(plano.arranque.x) : "", medida_y: plano.arranque ? String(plano.arranque.y) : "",
      paso_desde_mun: (sitio && sitio.municipio) || "", paso_desde_dep: (sitio && sitio.departamento) || "", paso_hasta_mun: (sitio && sitio.municipio) || "", paso_hasta_dep: (sitio && sitio.departamento) || ""
    };
    const v = {};
    CAMPOS.forEach(c => {
      const g = c.donde === "emp" ? empV[c.k] : c.donde === "sol" ? (!vacioS(solCot[c.k]) ? solCot[c.k] : !vacioS(guard.campos[c.k]) ? guard.campos[c.k] : solCliente[c.k]) : guard.campos[c.k];
      v[c.k] = !vacioS(g) ? g : (auto[c.k] != null ? auto[c.k] : "");
    });
    v.centralizacion = !!guard.campos.centralizacion;
    const terrenos = (guard.terrenos && guard.terrenos.length ? guard.terrenos : (en && en.tramite && en.tramite.terrenos) || []).map(t => ({ ...t }));
    const fianzaC = fz ? (fz.fianzas || []).find(f => f.obra_id === obraId && f.tipo === "cumplimiento") : null;
    const fijos = await D.docsFijos().catch(() => []);
    const gc = k => !vacioS(guard.campos[k]) ? guard.campos[k] : (rec[k] || "");
    return { o, cot, k, cli, sitio, contacto, emp, empV, ings, ing, cat, cfg, pl, d, conteo, plano, op, kva, v, guard, terrenos, en, fianzaC, fijos, solCliente, rec, gc };
  }

  function analizarPlano(d, cat, cfg, mc) {
    const r = { kva: 0, trafos: {}, otros: 0, metrosMT: 0, metrosBT: 0, postes: [], fases: 1, arranque: null, centros: [], sinUtm: 0, gps: [], matricula: "", puntos: [], tramo: () => 0 };
    if (!d) return r;
    const m = Object.fromEntries(d.elementos.map(e => [e.id, e]));
    const ref = d.ref;
    const pos = e => (e.utm && e.utm.e != null && e.utm.n != null && ref) ? [Number(e.utm.e) - ref.e, ref.n - Number(e.utm.n)] : [e.x, e.y];
    const utmDe = e => { if (e.utm && e.utm.e != null && e.utm.n != null) return { x: Number(e.utm.e), y: Number(e.utm.n) }; if (ref) { const [x, y] = pos(e); return { x: Math.round(ref.e + x), y: Math.round(ref.n - y) }; } return null; };
    const MT = { mt1f: 1, mt2f: 2, mt3f: 3 };
    const ady = {};
    d.lineas.forEach(l => {
      if (l.e !== "proyectado") return;
      const a = m[l.a], b = m[l.b]; if (!a || !b) return;
      const mts = l.m != null && String(l.m).trim() !== "" && isFinite(Number(String(l.m).replace(",", "."))) ? Number(String(l.m).replace(",", ".")) : Math.hypot(pos(a)[0] - pos(b)[0], pos(a)[1] - pos(b)[1]);
      if (MT[l.t]) { r.metrosMT += mts; r.fases = Math.max(r.fases, MT[l.t]); } else if (l.t === "triplex" || l.t === "bt") r.metrosBT += mts;
      (ady[l.a] = ady[l.a] || []).push([l.b, mts]); (ady[l.b] = ady[l.b] || []).push([l.a, mts]);
    });
    r.metrosMT = Math.round(r.metrosMT); r.metrosBT = Math.round(r.metrosBT);
    const postes = d.elementos.filter(e => /^poste/.test(e.s) || e.s === "tubo_ex");
    postes.forEach(e => {
      const u = utmDe(e);
      if (/_pr$/.test(e.s)) { const det = String(e.det || "").toUpperCase(); r.postes.push({ e, long: POSTE_LONG[e.s] || "", utm: u, material: /METAL|CHAPA|ACERO/.test(det) ? "Chapa Metálica" : /MADERA/.test(det) ? "Madera" : /CONCRETO/.test(det) ? "Concreto" : null }); if (!u) r.sinUtm++; }
      if (u) r.gps.push({ cod: e.cod || "", tipo: /_pr$/.test(e.s) ? "Nuevo" : "Existente", desc: [window.EMT_SIMB && window.EMT_SIMB.P[e.s] ? window.EMT_SIMB.P[e.s].n : e.s, String(e.det || "").split("\n")[0]].filter(Boolean).join(" · "), x: u.x, y: u.y, zona: (e.utm && e.utm.z) || "15 P" });
    });
    const arr = postes.find(e => !/_pr$/.test(e.s) && D.situacionPoste(d, e, cfg, m)) || postes.find(e => /_pr$/.test(e.s));
    if (arr) {
      r.arranque = utmDe(arr);
      const [ax, ay] = pos(arr);
      const t = d.elementos.filter(e => e.s === "trafo_ex").map(e => [e, Math.hypot(pos(e)[0] - ax, pos(e)[1] - ay)]).sort((a, b) => a[1] - b[1])[0];
      if (t) { const mm = String(t[0].det || "").match(/matr[ií]cula\s*[:#.]?\s*([A-Z0-9-]+)/i) || String(t[0].det || "").match(/\bMAT\.?\s*[:#]?\s*([A-Z0-9-]+)/i); r.matricula = mm ? mm[1] : String(t[0].cod || "").trim(); }
    }
    let sinCod = 0;
    r.puntos = postes.filter(e => ady[e.id]).map(e => ({ id: e.id, cod: String(e.cod || "").trim() || `Poste sin código ${++sinCod}` }));
    r.tramo = (a, b) => {
      if (a == null || b == null || a === "" || b === "" || !ady[a] || !ady[b]) return 0;
      if (String(a) === String(b)) return 0;
      const dist = { [a]: 0 }, hecho = new Set();
      for (;;) {
        let u = null; Object.keys(dist).forEach(k => { if (!hecho.has(k) && (u == null || dist[k] < dist[u])) u = k; });
        if (u == null) return 0;
        if (String(u) === String(b)) return Math.round(dist[u] * 100) / 100;
        hecho.add(u);
        (ady[u] || []).forEach(([w, mm]) => { const n = dist[u] + mm; if (dist[w] == null || n < dist[w]) dist[w] = n; });
      }
    };
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
