"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = "emtecsa.sistema.planos";
  const DISTRIBUIDORAS = { energuate: { n: "Energuate", logo: "marcas/energuate.png" }, eegsa: { n: "EEGSA", logo: "marcas/eegsa.png" }, municipal: { n: "Empresa municipal", logo: null } };
  const leer = () => { try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.v === 1) return d; } catch (e) {} return { v: 1, cambios: false, sig: 1, planos: [], logos: {} }; };
  const escribir = d => { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar el plano en este equipo. Revise el espacio del navegador."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const vacio = () => ({ k: 0.25, elementos: [], lineas: [], textos: [], sig: 1, vista: null });

  async function plano(tipo, id) {
    const col = tipo === "obra" ? "obra_id" : "cotizacion_id";
    if (!nube) { const p = leer().planos.find(x => x[col] === id); return p ? JSON.parse(JSON.stringify(p)) : null; }
    return ok(await sb.from("planos").select("*").eq(col, id).maybeSingle(), "No se pudo leer el plano.");
  }

  async function guardarPlano(tipo, id, datos, machote) {
    const col = tipo === "obra" ? "obra_id" : "cotizacion_id";
    const fila = { datos, machote, actualizado: new Date().toISOString() };
    if (!nube) {
      const d = leer();
      const x = d.planos.find(p => p[col] === id);
      if (x) Object.assign(x, fila); else d.planos.push({ id: d.sig++, cotizacion_id: tipo === "obra" ? null : id, obra_id: tipo === "obra" ? id : null, ...fila });
      escribir(d); return;
    }
    const ya = await ok(await sb.from("planos").select("id").eq(col, id).maybeSingle(), "No se pudo guardar el plano.");
    await ok(ya ? await sb.from("planos").update(fila).eq("id", ya.id) : await sb.from("planos").insert({ ...fila, [col]: id }), "No se pudo guardar el plano.");
  }

  async function copiarPlanoAObra(cotId, obraId) {
    const p = await plano("cot", cotId);
    if (!p || await plano("obra", obraId)) return;
    await guardarPlano("obra", obraId, p.datos, p.machote);
  }

  async function logosDistribuidoras() {
    if (!nube) return leer().logos || {};
    const r = await sb.from("ajustes").select("valor").eq("clave", "logos_distribuidoras").maybeSingle();
    return (r.data && r.data.valor) || {};
  }
  async function guardarLogoDistribuidora(clave, dataUrl) {
    if (!DISTRIBUIDORAS[clave]) throw new Error("Distribuidora no válida.");
    if (dataUrl && dataUrl.length > 700000) throw new Error("El logo pesa mucho. Use una imagen más pequeña (menos de 500 KB).");
    if (!nube) { const d = leer(); d.logos = d.logos || {}; if (dataUrl) d.logos[clave] = dataUrl; else delete d.logos[clave]; escribir(d); return; }
    const actual = await logosDistribuidoras();
    if (dataUrl) actual[clave] = dataUrl; else delete actual[clave];
    await ok(await sb.from("ajustes").upsert({ clave: "logos_distribuidoras", valor: actual }), "No se pudo guardar el logo.");
  }

  Object.assign(D, { DISTRIBUIDORAS, planoVacio: vacio, plano, guardarPlano, copiarPlanoAObra, logosDistribuidoras, guardarLogoDistribuidora });
})();
