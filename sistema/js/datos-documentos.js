"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.docsobra";
  const NUM = { contrato: "ct", ot: "ot", acta: "ae" };
  const NOMBRES = { contrato: "Contrato", ot: "Orden de trabajo", acta: "Acta de entrega" };
  const ESTADOS = { borrador: "Borrador", enviado: "Esperando firma", firmado: "Firmado", anulado: "Anulado" };
  const t = s => String(s == null ? "" : s).trim();
  const fechaO = s => /^\d{4}-\d{2}-\d{2}$/.test(t(s)) ? t(s) : null;
  const hoy = () => (d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10))(new Date());
  const Q = n => "Q " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fLarga = f => { if (!f) return ""; const [y, m, d] = String(f).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" }); };

  const PLANTILLA = `CONTRATO DE OBRA {numero}

En {ciudad}, el {fecha}, comparecen por una parte {empresa}, NIT {empresa_nit}, representada por {empresa_representante}, {empresa_puesto}, a quien en adelante se le llama «EL CONTRATISTA»; y por la otra parte {cliente}, NIT {cliente_nit}, representada por {cliente_representante}, {cliente_puesto}, a quien en adelante se le llama «EL CLIENTE». Ambas partes convienen en celebrar el presente contrato de obra, conforme a las cláusulas siguientes:

PRIMERA. Objeto. EL CONTRATISTA se obliga a ejecutar la obra «{trabajo}»{en_sitio}, conforme a la propuesta {propuesta}, que forma parte de este contrato.

SEGUNDA. Precio. El precio total de la obra es de {monto} ({monto_letras}){con_iva}.

TERCERA. Forma de pago. {forma_pago}

CUARTA. Plazo. La obra iniciará el {inicio} y se estima terminarla en {plazo}. El plazo se ampliará por causas que no dependan de EL CONTRATISTA, como trámites con la distribuidora, lluvia o cambios pedidos por EL CLIENTE.

QUINTA. Cambios a la obra. Todo trabajo que se agregue o se quite se hará por medio de una orden de cambio firmada por ambas partes, que ajustará el precio y el plazo.

SEXTA. Obligaciones de EL CLIENTE. Dar acceso al sitio, los permisos que le correspondan y los datos necesarios para los trámites con la distribuidora.

SÉPTIMA. Garantía. {garantia}

OCTAVA. Entrega. Al terminar la obra, las partes firmarán un acta de entrega. EL CLIENTE tendrá cinco días hábiles para señalar observaciones; pasado ese plazo, la obra se tendrá por recibida.

NOVENA. Terminación. Cualquiera de las partes podrá dar por terminado este contrato por incumplimiento de la otra, avisándolo por escrito con quince días de anticipación. EL CLIENTE pagará lo ejecutado hasta esa fecha.

DÉCIMA. Ley aplicable. Este contrato se rige por las leyes de la República de Guatemala. Para cualquier diferencia, las partes se someten a los tribunales de {ciudad}.

Las partes leen el presente contrato y, enteradas de su contenido, objeto, validez y efectos legales, lo aceptan y firman.`;
  const CAMPOS = ["numero", "ciudad", "fecha", "empresa", "empresa_nit", "empresa_representante", "empresa_puesto", "cliente", "cliente_nit", "cliente_representante", "cliente_puesto", "trabajo", "en_sitio", "propuesta", "monto", "monto_letras", "con_iva", "anticipo", "forma_pago", "inicio", "plazo", "garantia"];

  const vacio = () => ({ v: 1, sig: 1, docs: [] });
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return vacio(); }
  function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); } }
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }

  async function plantillaContrato() {
    if (!nube) { try { const v = (JSON.parse(localStorage.getItem("emtecsa.sistema.cotizaciones")) || {}).ajustes; if (v && t(v.contrato_plantilla)) return v.contrato_plantilla; } catch (e) {} return PLANTILLA; }
    const r = await sb.from("ajustes").select("valor").eq("clave", "contrato_plantilla").maybeSingle();
    return (r.data && typeof r.data.valor === "string" && t(r.data.valor)) ? r.data.valor : PLANTILLA;
  }
  async function guardarPlantillaContrato(texto) {
    const v = t(texto); if (v.length < 50) throw new Error("El contrato quedó muy corto.");
    if (!nube) { const k = "emtecsa.sistema.cotizaciones"; let d = {}; try { d = JSON.parse(localStorage.getItem(k)) || {}; } catch (e) {} d.ajustes = d.ajustes || {}; d.ajustes.contrato_plantilla = v; localStorage.setItem(k, JSON.stringify(d)); return; }
    await ok(await sb.from("ajustes").upsert({ clave: "contrato_plantilla", valor: v }), "No se pudo guardar el contrato.");
  }

  async function documentosObra(obraId) {
    if (!nube) return leer().docs.filter(x => x.obra_id === obraId).sort((a, b) => String(a.creado).localeCompare(String(b.creado)));
    return ok(await sb.from("obra_documentos").select("*").eq("obra_id", obraId).order("creado"), "No se pudieron leer los documentos de la obra.");
  }
  async function numerosDe(tipo) {
    if (!nube) return leer().docs.filter(x => x.tipo === tipo).map(x => x.numero);
    return (await ok(await sb.from("obra_documentos").select("numero").eq("tipo", tipo), "")).map(x => x.numero);
  }
  async function doc(id) {
    if (!nube) { const x = leer().docs.find(z => z.id === id); if (!x) throw new Error("Ese documento ya no existe."); return x; }
    const x = await ok(await sb.from("obra_documentos").select("*").eq("id", id).maybeSingle(), "No se pudo leer el documento.");
    if (!x) throw new Error("Ese documento ya no existe."); return x;
  }

  async function guardarDocumento(obra, x0) {
    const tipo = NOMBRES[x0.tipo] ? x0.tipo : null; if (!tipo) throw new Error("Ese documento no existe.");
    const fila = { fecha: fechaO(x0.fecha) || hoy(), datos: x0.datos || {}, programacion_fecha: fechaO(x0.programacion_fecha), actualizado: new Date().toISOString() };
    if (x0.id) {
      const v = await doc(x0.id);
      if (v.estado === "firmado" || v.estado === "anulado") throw new Error("Un documento firmado no se cambia.");
      if (!nube) { const d = leer(); Object.assign(d.docs.find(z => z.id === x0.id), fila); escribir(d); return x0.id; }
      await ok(await sb.from("obra_documentos").update(fila).eq("id", x0.id), "No se pudo guardar el documento."); return x0.id;
    }
    const numero = await D.numeroDe(NUM[tipo], await numerosDe(tipo));
    fila.datos = { ...fila.datos, numero };
    if (!nube) { const d = leer(); const id = d.sig++; d.docs.push({ id, obra_id: obra.id, tipo, numero, estado: "borrador", firma: null, creado: new Date().toISOString(), ...fila }); escribir(d); return id; }
    return (await ok(await sb.from("obra_documentos").insert({ obra_id: obra.id, tipo, numero, estado: "borrador", ...fila }).select("id").single(), "No se pudo guardar el documento.")).id;
  }
  async function poner(id, cambios) {
    if (!nube) { const d = leer(); Object.assign(d.docs.find(z => z.id === id), cambios, { actualizado: new Date().toISOString() }); escribir(d); return; }
    await ok(await sb.from("obra_documentos").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id), "No se pudo guardar el documento.");
  }
  async function mandarDocumento(id) { const x = await doc(id); if (x.estado === "borrador") await poner(id, { estado: "enviado" }); }
  async function regresarDocumento(id) { const x = await doc(id); if (x.estado !== "enviado") throw new Error("Solo se regresa un documento que espera firma."); await poner(id, { estado: "borrador" }); }
  async function firmarDocumento(id, f) {
    const x = await doc(id); if (x.estado === "firmado") throw new Error("Ya está firmado.");
    const n = t(f.nombre).replace(/\s+/g, " "); if (n.length < 3) throw new Error("Escriba el nombre de quien firma.");
    if (f.firma && !/^data:image\/png;base64,/.test(f.firma)) throw new Error("Falta la firma.");
    await poner(id, { estado: "firmado", firma: { nombre: n, puesto: t(f.puesto) || null, firma: f.firma || null, fecha: new Date().toISOString(), en: f.en || "sistema", por: t(f.por) || null } });
  }
  async function anularDocumento(id, motivo) { if (!t(motivo)) throw new Error("Escriba por qué se anula."); await poner(id, { estado: "anulado", motivo_anulado: t(motivo) }); }
  async function quitarDocumento(id) {
    const x = await doc(id); if (x.estado !== "borrador") throw new Error("Solo se quita un documento en borrador.");
    if (!nube) { const d = leer(); d.docs = d.docs.filter(z => z.id !== id); escribir(d); return; }
    await ok(await sb.from("obra_documentos").delete().eq("id", id), "No se pudo quitar el documento.");
  }

  async function datosContrato(obra, rep) {
    const [emp, cli, cot, cat, r] = await Promise.all([D.empresa(), D.cliente(obra.cliente_id).catch(() => null), obra.cotizacion_id ? D.cotizacion(obra.cotizacion_id).catch(() => null) : null, D.catalogo(), D.resumenCobros().catch(() => null)]);
    const k = cot ? D.calcularCotizacion(cot, cat) : null;
    const plan = r ? r.partes.filter(p => p.obra_id === obra.id && (p.orden || 0) < 100) : [];
    const ant = plan.find(p => /anticipo/i.test(p.descripcion));
    const total = k ? k.total : plan.reduce((a, p) => a + p.monto, 0);
    const sitio = cli && (cli.sitios || []).find(s => s.id === obra.sitio_id);
    const cs = (cli && cli.contactos) || [];
    const ct = (cot && cs.find(c => c.id === cot.contacto_id)) || cs.find(c => c.principal) || null;
    const cond = (cot && cot.condiciones) || {};
    const fin = (obra.etapas || []).map(e => e.fin).filter(Boolean).sort().pop();
    const dias = obra.fecha_inicio && fin ? D.habilesEntre(obra.fecha_inicio, fin) + 1 : null;
    const formaPlan = plan.length ? plan.map(p => `${p.descripcion}${p.porcentaje != null ? ` (${p.porcentaje} %)` : ""}: ${Q(p.monto)}`).join("; ") + "." : "";
    return {
      numero: "", ciudad: emp.ciudad || "Guatemala", fecha: fLarga(hoy()),
      empresa: emp.razon_social || emp.nombre || "EMTECSA", empresa_nit: emp.nit ? D.nitBonito(emp.nit) : "", empresa_representante: emp.firma_nombre || "", empresa_puesto: emp.firma_puesto || "",
      cliente: cli ? (cli.razon_social || cli.nombre) : "", cliente_nit: cli ? D.nitBonito(cli.nit || "CF") : "", cliente_representante: (rep && rep.nombre) || (ct && ct.nombre) || "", cliente_puesto: (rep && rep.puesto) || (ct && ct.puesto) || "",
      trabajo: obra.titulo || (cot && cot.titulo) || "", en_sitio: sitio ? `, en ${[sitio.nombre, sitio.direccion, sitio.municipio, sitio.departamento].filter(Boolean).join(", ")}` : "",
      propuesta: cot ? cot.numero + (Number(cot.version) > 1 ? ` versión ${cot.version}` : "") : "aceptada por EL CLIENTE",
      monto: Q(total), monto_letras: D.enLetras(total), con_iva: k && k.iva ? ", con IVA incluido" : "",
      anticipo: ant ? Q(ant.monto) : "", forma_pago: t(cond.forma_pago) || formaPlan || "Según el plan de pagos acordado.",
      inicio: obra.fecha_inicio ? fLarga(obra.fecha_inicio) : "la fecha que acuerden las partes", plazo: dias ? `${dias} días hábiles, hasta el ${fLarga(fin)}` : (t(cond.tiempo_entrega) || "el tiempo indicado en la propuesta"),
      garantia: t(cond.garantia) || "EL CONTRATISTA garantiza la mano de obra por doce meses desde la entrega. Los equipos tienen la garantía de su fabricante."
    };
  }
  function llenar(plantilla, v) { return plantilla.replace(/\{([a-z_]+)\}/g, (m, k) => k === "numero" && !t(v.numero) ? m : CAMPOS.includes(k) ? (t(v[k]) || (k === "en_sitio" || k === "con_iva" ? "" : "______")) : m); }

  async function datosOT(obra, fecha, recursosDia) {
    const [cli, pl, cat] = await Promise.all([D.cliente(obra.cliente_id).catch(() => null), D.plantillasCheck().catch(() => ({})), D.catalogo()]);
    const sitio = cli && (cli.sitios || []).find(s => s.id === obra.sitio_id);
    const et = (obra.etapas || []).slice().sort((a, b) => a.orden - b.orden);
    const delDia = et.filter(e => !e.hecha && e.inicio && e.fin && e.inicio <= fecha && e.fin >= fecha);
    const toca = delDia.length ? delDia : et.filter(e => !e.hecha).slice(0, 1);
    const porMat = Object.fromEntries(cat.materiales.map(m => [m.id, m]));
    const material = (obra.previstos || []).filter(p => Number(p.cantidad) > 0).map(p => { const m = porMat[p.material_id]; return { d: m ? m.descripcion : "Material", codigo: m ? m.codigo : "", unidad: m ? m.unidad || "" : "", c: Number(p.cantidad) }; });
    const sitioTxt = sitio ? [sitio.nombre, sitio.direccion, sitio.municipio, sitio.departamento].filter(Boolean).join(", ") : "";
    return {
      fecha, obra: { numero: obra.numero, titulo: obra.titulo || "", responsable: obra.responsable || "" },
      cliente: cli ? (cli.razon_social || cli.nombre) : "", contacto: cli ? (((cli.contactos || []).find(c => c.principal) || {}).nombre || "") : "", telefono: cli ? cli.telefono || "" : "",
      sitio: sitioTxt, mapa: sitio && sitio.lat != null && sitio.lng != null ? `https://maps.google.com/?q=${sitio.lat},${sitio.lng}` : "",
      recursos: recursosDia.map(x => ({ nombre: x.nombre, tipo: x.tipo, detalle: x.detalle || "", personas: x.personas || null, telefono: x.telefono || "", turno: x.turno, nota: x.nota || "" })),
      etapas: toca.map(e => ({ nombre: e.nombre, inicio: e.inicio, fin: e.fin })),
      material, seguridad: (pl.seguridad || []).slice(0, 20)
    };
  }

  async function datosActa(obra, extra) {
    const [cli, inst, cat, chk] = await Promise.all([D.cliente(obra.cliente_id).catch(() => null), D.instalacion ? D.instalacion(obra.id).catch(() => []) : [], D.catalogo(), D.checklist ? D.checklist(obra.id, "entrega").catch(() => []) : []]);
    const porMat = Object.fromEntries(cat.materiales.map(m => [m.id, m]));
    const sitio = cli && (cli.sitios || []).find(s => s.id === obra.sitio_id);
    const grupos = {};
    inst.forEach(x => { const g = grupos[x.grupo] = grupos[x.grupo] || []; const m = porMat[x.material_id]; g.push({ d: m ? m.descripcion : "Material", c: x.cantidad, unidad: m ? m.unidad || "" : "", instalado: !!x.instalado }); });
    const equipos = sitio ? (sitio.equipos || []).map(e => ({ tipo: e.tipo || "", d: [{ transformador: "Transformador", tablero: "Tablero", medidor: "Medidor" }[e.tipo] || "Equipo", e.kva ? `${e.kva} kVA` : "", e.marca].filter(Boolean).join(" · "), serie: e.serie || "", kva: e.kva || null })) : [];
    return {
      fecha: fechaO(extra.fecha) || hoy(), obra: { numero: obra.numero, titulo: obra.titulo || "" }, cliente: cli ? (cli.razon_social || cli.nombre) : "", sitio: sitio ? [sitio.nombre, sitio.municipio, sitio.departamento].filter(Boolean).join(", ") : "",
      instalado: Object.entries(grupos).map(([g, l]) => ({ g, l })), equipos,
      revision: chk.map(x => ({ texto: x.texto, hecho: !!x.hecho, nota: x.nota || "" })),
      pruebas: t(extra.pruebas), observaciones: t(extra.observaciones), recibe: { nombre: t(extra.nombre), puesto: t(extra.puesto) }, entrega: t(extra.entrega)
    };
  }

  Object.assign(D, { TIPOS_DOC_OBRA: NOMBRES, ESTADOS_DOC_OBRA: ESTADOS, CAMPOS_CONTRATO: CAMPOS, PLANTILLA_CONTRATO: PLANTILLA, plantillaContrato, guardarPlantillaContrato, documentosObra, docObra: doc, guardarDocumento, mandarDocumento, regresarDocumento, firmarDocumento, anularDocumento, quitarDocumento, datosContrato, llenarContrato: llenar, datosOT, datosActa });
})();
