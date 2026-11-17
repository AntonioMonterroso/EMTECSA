"use strict";
(() => {
  const D = window.EMT_DATOS;
  if (!D.nube) return;
  const VIGENCIA = 45000;
  const LECTURAS = ["catalogo", "clientes", "cliente", "cotizaciones", "cotizacion", "obras", "obra", "empresa", "plantillas", "resumenCobros", "pedidosTienda", "pedidoTienda", "usuarios", "permisos", "historial", "resumenEnlaces", "pendientesEnlace", "enlaceDe", "jornadas", "contactosCotizacion", "filasCompras", "compras", "proveedores", "aumentoDefecto", "plantillasCheck", "checklist", "instalacion", "estadoCuenta", "miFirma"];
  const ESCRITURA = /^(guardar|quitar|registrar|crear|cambiar|anular|marcar|agregar|ligar|aplicar|publicar|atender|subir|copiar|borrar|aprobar|importar|mover|salir|entrar|registrarse|congelar|recuperar)/;
  const memoria = new Map();
  let epoca = 0;
  const copiar = v => { if (v == null || typeof v !== "object") return v; try { return structuredClone(v); } catch (e) { return JSON.parse(JSON.stringify(v)); } };
  const olvidar = () => { memoria.clear(); epoca++; };

  LECTURAS.forEach(nombre => {
    const orig = D[nombre];
    if (typeof orig !== "function") return;
    D[nombre] = (...args) => {
      let k;
      try { k = nombre + ":" + JSON.stringify(args); } catch (e) { return orig(...args); }
      const g = memoria.get(k);
      if (g && Date.now() - g.t < VIGENCIA) return g.p.then(copiar);
      const miEpoca = epoca;
      const p = orig(...args);
      memoria.set(k, { t: Date.now(), p });
      p.then(() => { if (miEpoca !== epoca) memoria.delete(k); }, () => memoria.delete(k));
      return p.then(copiar);
    };
  });

  const ppc = D.catalogoParaCotizacion;
  if (typeof ppc === "function") {
    D.catalogoParaCotizacion = (cat, cotId) => {
      if (!cat || !cat.costosOcultos) return ppc(cat, cotId);
      const k = "ppc:" + (cotId == null ? "nueva" : cotId) + ":" + (cat.materiales || []).length;
      const g = memoria.get(k);
      if (g && Date.now() - g.t < VIGENCIA) return g.p.then(r => { const pv = Object.fromEntries(r.materiales.map(m => [m.id, m.pv])); return { ...cat, materiales: cat.materiales.map(m => ({ ...m, pv: pv[m.id] })) }; });
      const p = ppc(cat, cotId);
      memoria.set(k, { t: Date.now(), p });
      p.catch(() => memoria.delete(k));
      return p.then(copiar);
    };
  }

  Object.keys(D).forEach(nombre => {
    const f = D[nombre];
    if (typeof f !== "function" || !ESCRITURA.test(nombre)) return;
    D[nombre] = function (...args) {
      olvidar();
      let r;
      try { r = f.apply(this, args); } catch (e) { olvidar(); throw e; }
      if (r && typeof r.then === "function") return r.finally(olvidar);
      olvidar();
      return r;
    };
  });

  if (typeof D.alPedido === "function") D.alPedido(olvidar);
  if (typeof D.alEnlace === "function") { try { D.alEnlace(olvidar); } catch (e) {} }
  D.olvidarLecturas = olvidar;
})();
