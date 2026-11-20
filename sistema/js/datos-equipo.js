"use strict";
(() => {
  const D = window.EMT_DATOS;
  const { nube, sb } = D;
  const CLAVE = D.CLAVE_EQUIPO;
  const ACCIONES = [
    ["Catálogo", [["verCosto", "Ver el costo de compra"], ["editarMaterial", "Editar materiales y costos"], ["editarEstructura", "Editar lo que se vende y sus materiales"], ["editarProveedor", "Editar proveedores"], ["verAumento", "Ver y poner el aumento y la ganancia"]]],
    ["Clientes y ventas", [["editarCliente", "Editar clientes, sitios y contactos"], ["editarCotizacion", "Hacer y cambiar cotizaciones"], ["verEnlaces", "Ver los avisos del enlace del cliente"], ["editarPlano", "Dibujar planos"], ["verTienda", "Ver la tienda"], ["editarTienda", "Confirmar pagos de la tienda"]]],
    ["Obras", [["editarObra", "Llevar las obras (etapas, bitácora, trámites)"], ["editarEquipo", "Editar los equipos de los clientes"], ["moverMaterial", "Sacar y devolver material"], ["editarCompras", "Pedir y recibir compras"], ["editarInstalacion", "Marcar lo instalado y los checklists"], ["editarEnerguate", "Documentos de Energuate"], ["subirDocumentos", "Subir documentos y fichas"]]],
    ["Dinero", [["verCobros", "Ver cobros, pagos y fianzas"], ["registrarPago", "Registrar pagos y fianzas"], ["verGastos", "Ver y anotar gastos de obra"], ["verFinanzas", "Ver y llevar las finanzas de la empresa (cuentas y saldos)"]]],
    ["Empresa", [["editarEmpresa", "Datos de la empresa y ajustes"]]]
  ];
  const ROLES_EDIT = Object.keys(D.ROLES).filter(r => r !== "gerencia");

  const leer = () => { let d = null; try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) {} if (!d || d.v !== 1) d = { v: 1, usuarios: [], historial: [], permisos: null }; return d; };
  const escribir = d => { d.cambios = true; try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } };
  async function ok(r, msg) { if (r.error) throw new Error(msg); return r.data; }
  const yo = () => { const s = window.EMT_APP && window.EMT_APP.sesion(); return s ? s.perfil : null; };

  async function usuarios() {
    if (!nube) {
      const d = leer(), p = yo();
      const lista = d.usuarios.slice();
      if (!lista.some(u => u.id === "prueba")) lista.unshift({ id: "prueba", nombre: "Daniel", correo: "prueba@emtecsa", rol: "gerencia", activo: true, aprobado: true, creado: null, yo: true });
      return lista.map(u => ({ ...u, yo: u.id === "prueba" }));
    }
    const r = await sb.from("perfiles").select("id, nombre, correo, rol, activo, aprobado, creado").order("creado");
    const me = (await sb.auth.getUser()).data.user;
    return (await ok(r, "No se pudo leer el equipo.")).map(u => ({ ...u, yo: me && u.id === me.id }));
  }

  async function guardarUsuario(u) {
    const nombre = String(u.nombre || "").trim().replace(/\s+/g, " ");
    if (nombre.length < 2) throw new Error("Escriba el nombre.");
    if (u.activo && !D.ROLES[u.rol]) throw new Error("Escoja el rol.");
    const lista = await usuarios();
    const antes = lista.find(x => x.id === u.id);
    if (antes && antes.yo && (!u.activo || u.rol !== "gerencia")) throw new Error("No puede quitarse a sí mismo de gerencia ni desactivarse.");
    if (antes && antes.rol === "gerencia" && antes.activo && (!u.activo || u.rol !== "gerencia") && lista.filter(x => x.rol === "gerencia" && x.activo).length < 2) throw new Error("Tiene que quedar al menos una persona de gerencia activa.");
    const datos = { nombre, rol: u.rol || (antes && antes.rol) || "ventas", activo: !!u.activo, aprobado: !!(u.activo || (antes && antes.aprobado)) };
    if (!nube) {
      const d = leer();
      if (u.id === "prueba") { const s = JSON.parse(sessionStorage.getItem("emtecsa.sistema.prueba") || "null"); if (s) { s.nombre = nombre; sessionStorage.setItem("emtecsa.sistema.prueba", JSON.stringify(s)); } }
      else { const x = d.usuarios.find(z => z.id === u.id); if (!x) throw new Error("Esa persona ya no está."); Object.assign(x, datos); }
      escribir(d);
      registrar(antes && !antes.aprobado && datos.activo ? `Aprobó a ${nombre} como ${D.ROLES[datos.rol]}` : antes && antes.activo && !datos.activo ? `Desactivó a ${nombre}` : antes && !antes.activo && datos.activo ? `Activó a ${nombre}` : antes && antes.rol !== datos.rol ? `Cambió el rol de ${nombre} a ${D.ROLES[datos.rol]}` : `Cambió los datos de ${nombre}`, "usuario");
      return;
    }
    await ok(await sb.from("perfiles").update(datos).eq("id", u.id), "No se pudo guardar. Solo gerencia puede cambiar el equipo.");
  }

  async function permisos() {
    let m = null;
    if (!nube) m = leer().permisos;
    else { const r = await sb.from("ajustes").select("valor").eq("clave", "permisos").maybeSingle(); m = r.data && r.data.valor; }
    const ef = {};
    ACCIONES.forEach(([, l]) => l.forEach(([k]) => { ef[k] = ((m && m[k]) || D.PERMISOS[k] || []).filter(r => r !== "gerencia"); }));
    return ef;
  }
  async function guardarPermisos(ef, texto) {
    const v = {};
    Object.entries(ef).forEach(([k, roles]) => { v[k] = ["gerencia", ...roles.filter(r => ROLES_EDIT.includes(r))]; });
    if (!nube) { const d = leer(); d.permisos = v; escribir(d); }
    else await ok(await sb.from("ajustes").upsert({ clave: "permisos", valor: v }), "No se pudieron guardar los permisos. Solo gerencia puede cambiarlos.");
    await D.cargarPermisos();
    if (texto) registrar(texto, "permisos");
  }
  async function permisosDeFabrica() {
    if (!nube) { const d = leer(); d.permisos = null; escribir(d); }
    else await ok(await sb.from("ajustes").upsert({ clave: "permisos", valor: {} }), "No se pudieron restablecer los permisos.");
    await D.cargarPermisos();
    registrar("Dejó los permisos como venían", "permisos");
  }

  function registrar(texto, tipo) {
    if (nube) return;
    try {
      const d = leer(), p = yo();
      d.historial.unshift({ id: Date.now() + Math.random(), fecha: new Date().toISOString(), quien: p ? p.nombre : "Sistema", rol: p ? p.rol : null, tipo: tipo || "otro", texto });
      d.historial = d.historial.slice(0, 1500);
      localStorage.setItem(CLAVE, JSON.stringify(d));
    } catch (e) {}
  }
  async function historial({ limite = 300 } = {}) {
    if (!nube) return leer().historial.slice(0, limite);
    const r = await sb.from("historial").select("id, fecha, quien, rol, tipo, texto").order("fecha", { ascending: false }).limit(limite);
    return ok(r, "No se pudo leer el historial.");
  }

  const envolver = (nombre, texto) => {
    const f = D[nombre]; if (typeof f !== "function") return;
    D[nombre] = async function (...a) { const antes = await texto.antes?.(...a); const r = await f.apply(this, a); try { const t = await texto.despues(r, antes, ...a); if (t) registrar(t[0], t[1]); } catch (e) {} return r; };
  };
  if (!nube) {
    envolver("crearCotizacion", { despues: async (id) => { const c = await D.cotizacion(id); return [`Creó la cotización ${c.numero}${c.titulo ? " · " + c.titulo : ""}`, "cotizacion"]; } });
    envolver("guardarCotizacion", { antes: async c => { const x = await D.cotizacion(c.id); return x && x.estado; }, despues: async (r, antes, c) => [antes && antes !== c.estado ? `Pasó ${c.numero} de ${D.ESTADOS[antes]} a ${D.ESTADOS[c.estado]}` : `Guardó la cotización ${c.numero} (${c.partidas.length} ${c.partidas.length === 1 ? "renglón" : "renglones"})`, "cotizacion"] });
    envolver("crearObra", { despues: async (id, a, x) => [`Creó la obra ${x && x.titulo ? "«" + x.titulo + "»" : ""}`.trim(), "obra"] });
    envolver("registrarPago", { despues: async (r, a, x) => [`Registró un pago de Q ${Number(x && x.monto || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "dinero"] });
    envolver("anularPago", { despues: async () => ["Anuló un pago", "dinero"] });
    envolver("guardarFianza", { despues: async (r, a, x) => [`Guardó una fianza${x && x.aseguradora ? " de " + x.aseguradora : ""}`, "dinero"] });
    envolver("guardarMaterial", { antes: async m => { if (!m.id) return null; const c = await D.catalogo(); return c.materiales.find(z => z.id === m.id) || null; }, despues: async (id, antes, m) => { if (!antes) return [`Agregó el material ${m.codigo || ""} ${m.descripcion || ""}`.trim(), "catalogo"]; const ch = []; if (Number(antes.costo) !== Number(m.costo)) ch.push(`costo ${antes.costo ?? "—"} → ${m.costo ?? "—"}`); if (Number(antes.precio) !== Number(m.precio) && m.precio != null) ch.push(`precio ${antes.precio ?? "—"} → ${m.precio}`); return [`Cambió ${antes.codigo}${ch.length ? ": " + ch.join(", ") : ""}`, "catalogo"]; } });
    envolver("guardarEstructura", { despues: async (id, a, e) => [`${e.id ? "Cambió" : "Agregó"} ${e.codigo || ""} ${e.nombre || ""}`.trim(), "catalogo"] });
    envolver("guardarCliente", { despues: async (id, a, c) => [`${c.id ? "Cambió" : "Agregó"} el cliente ${c.nombre}`, "cliente"] });
    envolver("guardarEmpresa", { despues: async () => ["Cambió los datos de la empresa", "empresa"] });
  }

  Object.assign(D, { ACCIONES_EQ: ACCIONES, ROLES_EDIT, usuarios, guardarUsuario, permisos, guardarPermisos, permisosDeFabrica, historial, registrarHistorial: registrar });
})();
