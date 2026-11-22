"use strict";
window.EMT_DATOS = (() => {
  const CFG = window.EMTECSA_CONFIG || {};
  const CLAVE_DEV = "emtecsa.sistema.dev";
  const DEV = (() => { try { return JSON.parse(sessionStorage.getItem(CLAVE_DEV)); } catch (e) { return null; } })();
  const conectado = !!(CFG.url && CFG.llave && window.supabase);
  const nube = conectado && !DEV;
  const cliente = () => window.supabase.createClient(CFG.url, CFG.llave, { auth: { persistSession: true, autoRefreshToken: true } });
  const sb = nube ? cliente() : null;
  const sbErrores = sb || (DEV && conectado ? cliente() : null);
  const CLAVE_PRUEBA = "emtecsa.sistema.prueba";
  const CLAVE_LOCAL = "emtecsa.sistema.catalogo";
  const ROLES = { gerencia: "Gerencia", ventas: "Ventas", ingenieria: "Ingeniería", obra: "Obra", bodega: "Bodega", administracion: "Administración", desarrollo: "Desarrollo" };
  const PERMISOS = {
    verCosto: ["gerencia", "administracion", "bodega"],
    editarMaterial: ["gerencia", "bodega", "administracion"],
    editarEstructura: ["gerencia", "ingenieria", "administracion"],
    editarCliente: ["gerencia", "ventas", "administracion"],
    editarEquipo: ["gerencia", "ingenieria", "obra", "administracion"],
    editarCotizacion: ["gerencia", "ventas", "administracion"],
    verAumento: ["gerencia", "administracion"],
    editarEmpresa: ["gerencia", "administracion"],
    editarObra: ["gerencia", "ingenieria", "obra", "administracion"],
    moverMaterial: ["gerencia", "obra", "bodega", "administracion"],
    verCobros: ["gerencia", "administracion", "ventas"],
    registrarPago: ["gerencia", "administracion"],
    verGastos: ["gerencia", "administracion", "obra"],
    editarProveedor: ["gerencia", "administracion", "bodega"],
    editarCompras: ["gerencia", "administracion", "bodega", "obra"],
    editarInstalacion: ["gerencia", "administracion", "ingenieria", "obra"],
    editarPlano: ["gerencia", "administracion", "ingenieria", "ventas", "obra"],
    verTienda: ["gerencia", "administracion", "ventas"],
    subirDocumentos: ["gerencia", "administracion", "ventas", "bodega", "ingenieria"],
    editarEnerguate: ["gerencia", "administracion", "ingenieria", "obra", "ventas"],
    editarTienda: ["gerencia", "administracion"],
    verEnlaces: ["gerencia", "ventas", "administracion"],
    verFinanzas: ["gerencia", "administracion"],
    finanzasPersonales: [],
    autorizarDescuento: []
  };
  const CLAVE_EQUIPO = "emtecsa.sistema.equipo";
  let EF = null;
  const puede = (perfil, accion) => !!perfil && (perfil.rol === "gerencia" || ((EF && EF[accion]) || PERMISOS[accion] || []).includes(perfil.rol));
  async function cargarPermisos() {
    try {
      if (!nube) { const d = JSON.parse(localStorage.getItem(CLAVE_EQUIPO)); EF = d && d.permisos ? d.permisos : null; return; }
      const r = await sb.from("ajustes").select("valor").eq("clave", "permisos").maybeSingle();
      EF = r.data && r.data.valor && Object.keys(r.data.valor).length ? r.data.valor : null;
    } catch (e) { EF = null; }
  }

  function base() {
    const S = window.EMTECSA_SEMILLA || { materiales: [], estructuras: [] };
    const idDe = {};
    const materiales = S.materiales.map((m, i) => { idDe[m.codigo] = i + 1; return { id: i + 1, codigo: m.codigo, descripcion: m.descripcion, unidad: m.unidad, costo: m.costo, precio: m.precio, venta_modo: null, venta_pct: null, activo: true }; });
    const estructuras = S.estructuras.map((e, i) => ({
      id: i + 1, codigo: e.codigo, nombre: e.nombre, voltaje_kv: e.kv, clase: e.clase, fases: e.fases, conductor: e.conductor, kva: e.kva, mano_obra: null, activo: true,
      materiales: e.materiales.map(([c, cantidad]) => [idDe[c], cantidad])
    }));
    return { v: 1, cambios: false, sig: { m: materiales.length + 1, e: estructuras.length + 1 }, materiales, estructuras };
  }
  function leerLocal() {
    try { const d = JSON.parse(localStorage.getItem(CLAVE_LOCAL)); if (d && d.v === 1) return d; } catch (e) {}
    return base();
  }
  function escribirLocal(d) {
    try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(d)); } catch (e) { throw new Error("No se pudo guardar en esta computadora. Revise el espacio del navegador."); }
  }
  function armar(d) {
    const porId = Object.fromEntries(d.materiales.map(m => [m.id, m]));
    return {
      materiales: d.materiales.slice().sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es")),
      estructuras: d.estructuras.slice().sort((a, b) => a.codigo.localeCompare(b.codigo, "es")).map(e => ({ ...e, materiales: e.materiales.map(([id, cantidad]) => ({ material: porId[id], cantidad: Number(cantidad) })).filter(r => r.material) }))
    };
  }

  async function sesion() {
    if (DEV) {
      if (!sbErrores || !(await sbErrores.auth.getSession()).data.session) { try { sessionStorage.removeItem(CLAVE_DEV); } catch (e) {} location.reload(); return new Promise(() => {}); }
      const m = mioPrueba();
      await cargarPermisos();
      return { correo: DEV.correo, perfil: { id: DEV.id, nombre: m.nombre || DEV.nombre, rol: "gerencia", modo: DEV.modo || "oscuro", tema: DEV.tema || null, activo: true, dev: true, telefono: m.telefono || null, puesto: m.puesto || null, foto: m.foto || null } };
    }
    if (!nube) {
      let p = null; try { p = JSON.parse(sessionStorage.getItem(CLAVE_PRUEBA)); } catch (e) {}
      if (!p) return null;
      if (!p.probando) { const m = mioPrueba(); p.nombre = m.nombre || "Daniel"; p.telefono = m.telefono || null; p.puesto = m.puesto || null; p.foto = m.foto || null; }
      await cargarPermisos();
      return { correo: "prueba@emtecsa", perfil: p };
    }
    const { data } = await sb.auth.getSession();
    const u = data.session && data.session.user;
    if (!u) return null;
    const { data: perfil, error } = await sb.from("perfiles").select("id, nombre, rol, modo, tema, activo, aprobado, telefono, puesto, foto").eq("id", u.id).maybeSingle();
    if (error && !navigator.onLine) { try { const g = JSON.parse(localStorage.getItem("emtecsa.sistema.perfil")); if (g && g.id === u.id) return { correo: u.email, perfil: g }; } catch (e) {} }
    if (!error && perfil && !perfil.activo && !perfil.aprobado) { await sb.auth.signOut(); throw new Error("Su cuenta está esperando que gerencia la apruebe. Le avisarán cuando ya pueda entrar."); }
    if (error || !perfil || !perfil.activo) { await sb.auth.signOut(); throw new Error("Su usuario no tiene acceso. Pídale a gerencia que lo active."); }
    if (perfil.rol === "desarrollo") { try { sessionStorage.setItem(CLAVE_DEV, JSON.stringify({ id: perfil.id, nombre: perfil.nombre, correo: u.email, modo: perfil.modo, tema: perfil.tema })); } catch (e) {} location.reload(); return new Promise(() => {}); }
    await cargarPermisos();
    try { localStorage.setItem("emtecsa.sistema.perfil", JSON.stringify(perfil)); } catch (e) {}
    return { correo: u.email, perfil };
  }

  async function entrar(correo, clave) {
    if (!nube) throw new Error("La base de EMTECSA todavía no está conectada.");
    const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
    if (error) throw new Error(/invalid/i.test(error.message) ? "El correo o la contraseña no coinciden." : "No se pudo entrar. Revise su conexión e intente otra vez.");
    return sesion();
  }

  async function entrarPrueba() {
    const p = { id: "prueba", nombre: "Daniel", rol: "gerencia", modo: "oscuro", activo: true };
    try { sessionStorage.setItem(CLAVE_PRUEBA, JSON.stringify(p)); } catch (e) {}
    await cargarPermisos();
    return { correo: "prueba@emtecsa", perfil: p };
  }

  async function registrarse({ nombre, correo, clave }) {
    const n = limpio(nombre), c = String(correo || "").trim().toLowerCase();
    if (n.length < 3) throw new Error("Escriba su nombre completo.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) throw new Error("Escriba un correo válido.");
    if (String(clave || "").length < 8) throw new Error("La contraseña necesita al menos 8 letras o números.");
    if (!nube) {
      let d = null; try { d = JSON.parse(localStorage.getItem(CLAVE_EQUIPO)); } catch (e) {}
      d = d && d.v === 1 ? d : { v: 1, usuarios: [], historial: [], permisos: null };
      if (d.usuarios.some(u => u.correo === c)) throw new Error("Ya hay una cuenta con ese correo.");
      d.usuarios.push({ id: "u" + Date.now().toString(36), nombre: n, correo: c, rol: null, activo: false, aprobado: false, creado: new Date().toISOString() });
      localStorage.setItem(CLAVE_EQUIPO, JSON.stringify(d)); return;
    }
    const { error } = await sb.auth.signUp({ email: c, password: clave, options: { data: { nombre: n }, emailRedirectTo: location.href.split("#")[0] } });
    if (error) throw new Error(/registered|exists/i.test(error.message) ? "Ya hay una cuenta con ese correo." : /password/i.test(error.message) ? "La contraseña es muy débil. Use al menos 8 letras y números." : "No se pudo crear la cuenta. Intente otra vez.");
    await sb.auth.signOut();
  }

  async function salir() {
    if (DEV) { try { sessionStorage.removeItem(CLAVE_DEV); } catch (e) {} if (sbErrores) await sbErrores.auth.signOut().catch(() => {}); }
    if (nube) await sb.auth.signOut();
    try { sessionStorage.removeItem(CLAVE_PRUEBA); } catch (e) {}
  }

  async function recuperar(correo) {
    if (!nube) throw new Error("La base de EMTECSA todavía no está conectada.");
    const { error } = await sb.auth.resetPasswordForEmail(correo, { redirectTo: location.href.split("#")[0] });
    if (error) throw new Error("No se pudo enviar el correo. Revise la dirección.");
  }

  const CLAVE_MIO = "emtecsa.sistema.miperfil";
  const mioPrueba = () => { try { return JSON.parse(localStorage.getItem(CLAVE_MIO)) || {}; } catch (e) { return {}; } };
  async function guardarMiPerfil(perfil, datos) {
    const nombre = limpio(datos.nombre), telefono = limpio(datos.telefono) || null, puesto = limpio(datos.puesto) || null;
    if (nombre.length < 3 || nombre.length > 80) throw new Error("Escriba su nombre completo.");
    if (telefono && !/^[0-9 +()-]{8,20}$/.test(telefono)) throw new Error("Revise el teléfono: solo números, de 8 dígitos o más.");
    if (puesto && puesto.length > 60) throw new Error("El puesto es muy largo.");
    const foto = datos.foto === undefined ? perfil.foto || null : datos.foto;
    if (foto && foto.length > 300000) throw new Error("La foto pesa mucho. Escoja otra.");
    const cambios = { nombre, telefono, puesto, foto };
    if (!nube) { const m = { ...mioPrueba(), ...cambios }; try { localStorage.setItem(CLAVE_MIO, JSON.stringify(m)); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } }
    else { const { error } = await sb.from("perfiles").update(cambios).eq("id", perfil.id); if (error) throw new Error("No se pudo guardar su perfil. Revise su conexión."); }
    Object.assign(perfil, cambios);
    try { if (nube) localStorage.setItem("emtecsa.sistema.perfil", JSON.stringify(perfil)); else sessionStorage.setItem(CLAVE_PRUEBA, JSON.stringify(perfil)); } catch (e) {}
    return perfil;
  }
  async function miFirma(perfil) {
    if (!nube) return mioPrueba().firma || null;
    const { data, error } = await sb.from("perfiles").select("firma").eq("id", perfil.id).maybeSingle();
    if (error) throw new Error("No se pudo leer su firma.");
    return data ? data.firma : null;
  }
  async function guardarFirma(perfil, firma) {
    if (firma && (!/^data:image\/png;base64,/.test(firma) || firma.length > 200000)) throw new Error("La firma no se pudo guardar. Dibújela otra vez.");
    if (!nube) { const m = { ...mioPrueba(), firma: firma || null }; try { localStorage.setItem(CLAVE_MIO, JSON.stringify(m)); } catch (e) { throw new Error("No se pudo guardar en este equipo."); } return; }
    const { error } = await sb.from("perfiles").update({ firma: firma || null }).eq("id", perfil.id);
    if (error) throw new Error("No se pudo guardar su firma.");
  }
  async function cambiarClave(correo, actual, nueva) {
    if (!nube) throw new Error("En el modo de prueba no hay contraseña.");
    if (String(nueva || "").length < 8 || !/[0-9]/.test(nueva) || !/[a-zA-Z]/.test(nueva)) throw new Error("La contraseña nueva necesita al menos 8 caracteres, con letras y números.");
    if (nueva === actual) throw new Error("La contraseña nueva es igual a la actual.");
    const r1 = await sb.auth.signInWithPassword({ email: correo, password: actual });
    if (r1.error) throw new Error(/invalid/i.test(r1.error.message) ? "La contraseña actual no es correcta." : "No se pudo revisar su contraseña. Revise su conexión.");
    const r2 = await sb.auth.updateUser({ password: nueva });
    if (r2.error) throw new Error(/weak|short|password/i.test(r2.error.message) ? "Esa contraseña es muy débil. Use una más larga." : "No se pudo cambiar la contraseña.");
  }

  async function guardarModo(perfil, modo) {
    perfil.modo = modo;
    if (!nube) { try { sessionStorage.setItem(CLAVE_PRUEBA, JSON.stringify(perfil)); } catch (e) {} return; }
    const { error } = await sb.from("perfiles").update({ modo }).eq("id", perfil.id);
    if (error) throw new Error("No se pudo guardar su preferencia.");
  }

  async function guardarTema(perfil, tema) {
    if (!/^[a-z]{2,20}$/.test(tema)) throw new Error("Ese color no existe.");
    perfil.tema = tema;
    if (!nube) { try { sessionStorage.setItem(CLAVE_PRUEBA, JSON.stringify(perfil)); if (DEV) { const d = JSON.parse(sessionStorage.getItem(CLAVE_DEV)); d.tema = tema; sessionStorage.setItem(CLAVE_DEV, JSON.stringify(d)); } } catch (e) {} return; }
    const { error } = await sb.from("perfiles").update({ tema }).eq("id", perfil.id);
    if (error) throw new Error("No se pudo guardar su color.");
  }
  const CLAVE_TEMAS = "emtecsa.sistema.temas-ocultos";
  async function temasOcultos() {
    if (!nube) { try { return JSON.parse(localStorage.getItem(CLAVE_TEMAS)) || []; } catch (e) { return []; } }
    const r = await sb.from("ajustes").select("valor").eq("clave", "temas").maybeSingle();
    const l = r.data && r.data.valor && r.data.valor.ocultos;
    return Array.isArray(l) ? l : [];
  }
  async function guardarTemasOcultos(l) {
    const limpia = [...new Set(l)].filter(t => /^[a-z]{2,20}$/.test(t) && t !== "emtecsa");
    if (!nube) { try { localStorage.setItem(CLAVE_TEMAS, JSON.stringify(limpia)); } catch (e) {} return; }
    const r = await sb.from("ajustes").upsert({ clave: "temas", valor: { ocultos: limpia } });
    if (r.error) throw new Error("No se pudieron guardar los colores.");
  }

  let cache = null;
  async function catalogo(forzar) {
    if (cache && !forzar) return cache;
    if (!nube) return (cache = armar(leerLocal()));
    const [m, e, pv] = await Promise.all([
      sb.from("materiales").select("id, codigo, descripcion, unidad, precio, venta_modo, activo").order("descripcion"),
      sb.from("estructuras").select("id, codigo, nombre, voltaje_kv, clase, fases, conductor, kva, mano_obra, activo, estructura_materiales (cantidad, material_id)").order("codigo"),
      sb.rpc("privado_materiales")
    ]);
    if (m.error || e.error) throw new Error("No se pudo leer el catálogo.");
    const priv = Object.fromEntries(((pv && pv.data) || []).map(x => [x.id, x]));
    const nn = v => v == null ? null : Number(v);
    m.data.forEach(x => { const z = priv[x.id]; x.costo = z ? nn(z.costo) : null; x.venta_pct = z ? nn(z.venta_pct) : null; if (x.precio != null) x.precio = Number(x.precio); });
    const ocultos = !!m.data.length && !Object.keys(priv).length;
    const porId = Object.fromEntries(m.data.map(x => [x.id, x]));
    const estructuras = e.data.map(x => ({ ...x, materiales: x.estructura_materiales.map(r => ({ material: porId[r.material_id], cantidad: Number(r.cantidad) })).filter(r => r.material) }));
    return (cache = { materiales: m.data, estructuras, costosOcultos: ocultos });
  }

  const limpio = s => String(s || "").trim().replace(/\s+/g, " ");
  function revisarMaterial(m, lista) {
    const codigo = limpio(m.codigo).toUpperCase(), descripcion = limpio(m.descripcion);
    if (!descripcion) throw new Error("Escriba la descripción del material.");
    if (!codigo) throw new Error("Escriba el código del material.");
    if (lista.some(x => x.id !== m.id && x.codigo.toUpperCase() === codigo)) throw new Error(`Ya hay otro material con el código ${codigo}.`);
    if (lista.some(x => x.id !== m.id && x.descripcion.toUpperCase() === descripcion.toUpperCase())) throw new Error("Ya hay otro material con esa descripción.");
    for (const k of ["costo", "precio", "venta_pct"]) if (m[k] != null && !(m[k] >= 0)) throw new Error("Los montos no pueden ser negativos.");
    const modo = m.venta_modo === "precio" || m.venta_modo === "pct" ? m.venta_modo : null;
    if (modo === "precio" && m.precio == null) throw new Error("Escriba el precio al cliente o escoja otra forma.");
    if (modo === "pct" && m.venta_pct == null) throw new Error("Escriba el porcentaje de aumento o escoja otra forma.");
    return { codigo, descripcion, unidad: limpio(m.unidad) || null, costo: m.costo, precio: modo === "precio" ? m.precio : null, venta_modo: modo, venta_pct: modo === "pct" ? m.venta_pct : null };
  }
  function revisarEstructura(e, lista) {
    const codigo = limpio(e.codigo).toUpperCase(), nombre = limpio(e.nombre);
    if (!nombre) throw new Error("Escriba el nombre de lo que vende.");
    if (!codigo) throw new Error("Escriba el código.");
    if (lista.some(x => x.id !== e.id && x.codigo.toUpperCase() === codigo)) throw new Error(`Ya hay otra estructura con el código ${codigo}.`);
    if (lista.some(x => x.id !== e.id && x.nombre === nombre && Number(x.voltaje_kv) === Number(e.voltaje_kv))) throw new Error("Ya hay otra estructura con ese nombre y voltaje.");
    if (e.mano_obra != null && !(e.mano_obra >= 0)) throw new Error("La mano de obra no puede ser negativa.");
    if (!e.materiales.length) throw new Error("Agregue al menos un material.");
    if (e.materiales.some(r => !(r.cantidad > 0))) throw new Error("Cada material necesita una cantidad mayor que cero.");
    return { codigo, nombre, voltaje_kv: Number(e.voltaje_kv), clase: e.clase, fases: Number(e.fases), conductor: e.conductor || null, kva: e.kva == null ? null : Number(e.kva), mano_obra: e.mano_obra };
  }

  async function guardarMaterial(m) {
    if (!nube) {
      const d = leerLocal();
      const ok = revisarMaterial(m, d.materiales);
      if (m.id) Object.assign(d.materiales.find(x => x.id === m.id), ok);
      else { m.id = d.sig.m++; d.materiales.push({ id: m.id, activo: true, ...ok }); }
      d.cambios = true; escribirLocal(d); cache = null; return m.id;
    }
    const lista = (await catalogo()).materiales;
    const ok = revisarMaterial(m, lista);
    const r = m.id ? await sb.from("materiales").update(ok).eq("id", m.id).select("id").single() : await sb.from("materiales").insert(ok).select("id").single();
    if (r.error) throw new Error("No se pudo guardar el material.");
    cache = null; return r.data.id;
  }

  async function guardarEstructura(e) {
    if (!nube) {
      const d = leerLocal();
      const ok = revisarEstructura(e, d.estructuras);
      const mats = e.materiales.map(r => [r.material_id, Number(r.cantidad)]);
      if (e.id) Object.assign(d.estructuras.find(x => x.id === e.id), ok, { materiales: mats });
      else { e.id = d.sig.e++; d.estructuras.push({ id: e.id, activo: true, ...ok, materiales: mats }); }
      d.cambios = true; escribirLocal(d); cache = null; return e.id;
    }
    const lista = (await catalogo()).estructuras;
    const ok = revisarEstructura(e, lista);
    const r = e.id ? await sb.from("estructuras").update(ok).eq("id", e.id).select("id").single() : await sb.from("estructuras").insert(ok).select("id").single();
    if (r.error) throw new Error("No se pudo guardar la estructura.");
    const id = r.data.id;
    const borrar = await sb.from("estructura_materiales").delete().eq("estructura_id", id);
    if (borrar.error) throw new Error("No se pudieron guardar los materiales de la estructura.");
    const meter = await sb.from("estructura_materiales").insert(e.materiales.map(x => ({ estructura_id: id, material_id: x.material_id, cantidad: Number(x.cantidad) })));
    if (meter.error) throw new Error("No se pudieron guardar los materiales de la estructura.");
    cache = null; return id;
  }

  async function cambiarCatalogo(tabla, id, cambios) {
    if (!nube) {
      const d = leerLocal(); const x = (tabla === "materiales" ? d.materiales : d.estructuras).find(z => z.id === id);
      if (!x) throw new Error("Ya no existe."); Object.assign(x, cambios); d.cambios = true; escribirLocal(d); cache = null; return;
    }
    const r = await sb.from(tabla).update(cambios).eq("id", id);
    if (r.error) throw new Error("No se pudo guardar."); cache = null;
  }
  const activarCatalogo = (tabla, id, activo) => cambiarCatalogo(tabla, id, { activo: !!activo });
  async function guardarManoObra(id, mo) {
    if (mo != null && !(mo >= 0)) throw new Error("La mano de obra no puede ser negativa.");
    await cambiarCatalogo("estructuras", id, { mano_obra: mo });
  }

  function siguienteCodigo(lista, prefijo) {
    const n = lista.map(x => Number((x.codigo.match(new RegExp("^" + prefijo + "-(\\d+)$")) || [])[1] || 0)).reduce((a, b) => Math.max(a, b), 0);
    return `${prefijo}-${String(n + 1).padStart(3, "0")}`;
  }

  function cambiosLocales() { if (nube) return false; try { const d = JSON.parse(localStorage.getItem(CLAVE_LOCAL)); return !!(d && d.cambios); } catch (e) { return false; } }

  function alCambiarSesion(fn) { if (nube) sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT" || ev === "PASSWORD_RECOVERY") fn(ev); }); }

  return { nube, sb, sbErrores, DEV: !!DEV, conectado, ROLES, PERMISOS, CLAVE_EQUIPO, puede, cargarPermisos, registrarse, sesion, entrar, entrarPrueba, salir, recuperar, guardarModo, guardarTema, temasOcultos, guardarTemasOcultos, guardarMiPerfil, miFirma, guardarFirma, cambiarClave, catalogo, guardarMaterial, guardarEstructura, activarCatalogo, guardarManoObra, siguienteCodigo, cambiosLocales, alCambiarSesion };
})();
