import * as THREE from "three";

const M = {};
let PZ = null;
const cargador = new THREE.TextureLoader();
function tex(nombre, color, rep) {
  const t = cargador.load("modelos/texturas/" + nombre);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function zinc() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#b9bec4";
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const v = 150 + Math.floor(Math.random() * 90);
    x.fillStyle = `rgb(${v},${v + 3},${v + 7})`;
    x.beginPath();
    const cx = Math.random() * 256, cy = Math.random() * 256, r = 6 + Math.random() * 22, n = 5 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + Math.random() * 0.6; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function mats() {
  if (M.listo) return M;
  const z = zinc();
  M.galv = new THREE.MeshPhysicalMaterial({ color: 0xd2d7dc, map: z, roughnessMap: z, metalness: 0.92, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  M.galvOsc = new THREE.MeshPhysicalMaterial({ color: 0x9aa1a9, map: z, roughnessMap: z, metalness: 0.9, roughness: 0.5 });
  M.alu = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e7, metalness: 0.85, roughness: 0.32, clearcoat: 0.2 });
  M.pintura = new THREE.MeshPhysicalMaterial({ color: 0x95a0aa, metalness: 0.35, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  M.pinturaOsc = new THREE.MeshStandardMaterial({ color: 0x5f6a75, metalness: 0.3, roughness: 0.55 });
  M.porcelana = new THREE.MeshPhysicalMaterial({ color: 0x5b2617, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.4, sheenColor: 0x8a4a30 });
  M.porcelanaGris = new THREE.MeshPhysicalMaterial({ color: 0x8f949b, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 });
  M.crema = new THREE.MeshPhysicalMaterial({ color: 0xe6dfcf, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
  M.silicon = new THREE.MeshPhysicalMaterial({ color: 0x6c747d, metalness: 0.02, roughness: 0.55, sheen: 0.6, sheenColor: 0x9aa4ae });
  M.laton = new THREE.MeshStandardMaterial({ color: 0xc8a96a, metalness: 1, roughness: 0.24 });
  M.cobre = new THREE.MeshPhysicalMaterial({ color: 0xc27b45, metalness: 1, roughness: 0.28, clearcoat: 0.3 });
  M.madera = new THREE.MeshStandardMaterial({ color: 0x9a8063, map: tex("rough_pine_door-color.jpg", true, [1, 4]), roughnessMap: tex("rough_pine_door-rugosidad.jpg", false, [1, 4]), normalMap: tex("rough_pine_door-normal.jpg", false, [1, 4]), metalness: 0, roughness: 1 });
  M.maderaClara = new THREE.MeshStandardMaterial({ color: 0xc2a582, map: tex("rough_pine_door-color.jpg", true, [3, 0.4]), roughnessMap: tex("rough_pine_door-rugosidad.jpg", false, [3, 0.4]), normalMap: tex("rough_pine_door-normal.jpg", false, [3, 0.4]), metalness: 0, roughness: 1 });
  M.concreto = new THREE.MeshStandardMaterial({ color: 0xcfcbc3, map: tex("concrete_wall_009-color.jpg", true, [1, 5]), roughnessMap: tex("concrete_wall_009-rugosidad.jpg", false, [1, 5]), normalMap: tex("concrete_wall_009-normal.jpg", false, [1, 5]), metalness: 0, roughness: 1 });
  M.negro = new THREE.MeshStandardMaterial({ color: 0x2a2724, metalness: 0.1, roughness: 0.5 });
  M.cafeTubo = new THREE.MeshPhysicalMaterial({ color: 0x4a2c1a, roughness: 0.25, clearcoat: 0.9 });
  M.placa = new THREE.MeshStandardMaterial({ color: 0xd9c08a, metalness: 0.9, roughness: 0.3 });
  M.listo = true;
  return M;
}

export function ponerPiezas(escena) {
  PZ = new Map();
  const preset = new THREE.Group();
  for (const n of [...escena.children]) {
    n.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (n.name.startsWith("preset_01_")) preset.add(n.clone());
    else PZ.set(n.name, n);
  }
  const base = preset.children.find(n => n.name === "preset_01_pole");
  if (base) { const dx = base.position.x, dz = base.position.z; preset.children.forEach(n => { n.position.x -= dx; n.position.z -= dz; }); }
  PZ.set("preset", preset);
}
export const hayPiezas = () => !!PZ;
function pz(nombre, y) {
  if (!PZ || !PZ.get(nombre)) return null;
  const o = PZ.get(nombre).clone();
  if (y != null) o.position.set(0, y, 0);
  return o;
}

function malla(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
function cil(rt, rb, h, mat, seg = 48) { return malla(new THREE.CylinderGeometry(rt, rb, h, seg), mat); }
function caja(x, y, z, mat) { return malla(new THREE.BoxGeometry(x, y, z), mat); }
function en(obj, x = 0, y = 0, z = 0) { obj.position.set(x, y, z); return obj; }
function rot(obj, x = 0, y = 0, z = 0) { obj.rotation.set(x, y, z); return obj; }

function torno(perfil, mat, seg = 64) {
  const pts = perfil.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return malla(g, mat);
}

function aletas(base, alto, n, rMin, rMax, grueso = 0.04) {
  const p = [[rMin, base]];
  const paso = alto / n;
  for (let i = 0; i < n; i++) {
    const y = base + i * paso;
    p.push([rMin, y + paso * 0.18]);
    p.push([rMax, y + paso * 0.36]);
    p.push([rMax * 0.97, y + paso * 0.36 + grueso]);
    p.push([rMin, y + paso * 0.62]);
  }
  p.push([rMin, base + alto]);
  return p;
}

function tuerca(r, h, mat) { const t = cil(r, r, h, mat, 6); return t; }
function arandela(rIn, rOut, h, mat) {
  return torno([[rIn, -h / 2], [rOut, -h / 2], [rOut, h / 2], [rIn, h / 2], [rIn, -h / 2]], mat, 48);
}

function roscas(largo, r, mat, paso = 0.045) {
  const n = Math.floor(largo / paso);
  const g = new THREE.TorusGeometry(r, r * 0.16, 6, 24);
  const im = new THREE.InstancedMesh(g, mat, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    o.position.set(0, -largo / 2 + i * paso + paso / 2, 0);
    o.rotation.set(Math.PI / 2 + 0.08, 0, 0);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
  }
  im.castShadow = true;
  return im;
}

function perno(largo = 1.6, r = 0.07, ojo = false) {
  const m = mats(), g = new THREE.Group();
  g.add(cil(r * 0.92, r * 0.92, largo, m.galv, 24));
  g.add(roscas(ojo ? largo * 0.55 : largo * 0.96, r * 0.95, m.galv));
  if (ojo) {
    g.children[1].position.y = -largo * 0.2;
    const anillo = malla(new THREE.TorusGeometry(r * 2.4, r * 0.75, 20, 48), m.galv);
    g.add(en(anillo, 0, largo / 2 + r * 2.2, 0));
  } else {
    g.add(en(tuerca(r * 2.2, r * 1.6, m.galv), 0, largo / 2 - r * 1.2, 0));
  }
  g.add(en(tuerca(r * 2.2, r * 1.6, m.galv), 0, -largo / 2 + r * 2.2, 0));
  g.add(en(arandela(r * 1.1, r * 3, r * 0.4, m.galvOsc), 0, -largo / 2 + r * 3.6, 0));
  if (!ojo) g.add(en(arandela(r * 1.1, r * 3, r * 0.4, m.galvOsc), 0, largo / 2 - r * 2.6, 0));
  return g;
}

function aisladorPoste(mat) {
  const m = mats(), g = new THREE.Group();
  const cuerpo = torno([
    [0.0, 0], [0.2, 0], [0.22, 0.05], [0.2, 0.1],
    ...aletas(0.1, 0.7, 4, 0.17, 0.36, 0.05).slice(1),
    [0.15, 0.86], [0.16, 0.92], [0.12, 0.98], [0.06, 1.0], [0.0, 1.0]
  ], mat || m.porcelana);
  g.add(cuerpo);
  const silla = malla(new THREE.TorusGeometry(0.13, 0.035, 16, 40, Math.PI), m.galvOsc);
  g.add(rot(en(silla, 0, 0.96, 0), 0, Math.PI / 2, 0));
  g.add(en(cil(0.13, 0.15, 0.08, m.galv, 32), 0, -0.04, 0));
  g.add(en(cil(0.045, 0.045, 0.32, m.galv, 20), 0, -0.24, 0));
  return g;
}

function transformador() {
  const m = mats(), g = new THREE.Group();
  const tanque = cil(0.55, 0.55, 1.3, m.pintura, 64);
  g.add(tanque);
  g.add(en(cil(0.56, 0.5, 0.08, m.pinturaOsc, 64), 0, -0.69, 0));
  g.add(en(cil(0.6, 0.6, 0.07, m.pintura, 64), 0, 0.68, 0));
  const tapa = malla(new THREE.SphereGeometry(0.58, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.18), m.pintura);
  tapa.scale.set(1, 0.55, 1);
  g.add(en(tapa, 0, 0.42, 0));
  for (const y of [-0.35, 0.3]) g.add(rot(en(malla(new THREE.TorusGeometry(0.555, 0.018, 12, 80), m.pinturaOsc), 0, y, 0), Math.PI / 2, 0, 0));
  const bt = aisladorPoste(m.porcelanaGris);
  bt.scale.setScalar(0.55);
  g.add(en(bt, 0.18, 0.86, 0.05));
  g.add(en(cil(0.035, 0.035, 0.14, m.laton, 16), 0.18, 1.45, 0.05));
  for (let i = 0; i < 3; i++) {
    const a = -0.55 + i * 0.55;
    const bb = new THREE.Group();
    bb.add(torno([[0, 0], [0.07, 0], [0.09, 0.04], [0.07, 0.07], [0.09, 0.11], [0.06, 0.15], [0.045, 0.18], [0, 0.18]], m.porcelanaGris, 32));
    bb.add(en(cil(0.022, 0.022, 0.12, m.laton, 12), 0, 0.22, 0));
    bb.add(en(caja(0.08, 0.03, 0.06, m.laton), 0, 0.28, 0));
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    bb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    bb.position.copy(dir.multiplyScalar(0.53)).setY(0.36);
    g.add(bb);
  }
  const placa = caja(0.26, 0.17, 0.012, m.placa);
  g.add(en(placa, -0.0, -0.12, 0.555));
  for (const y of [0.32, -0.42]) {
    const s = caja(0.16, 0.1, 0.32, m.galvOsc);
    g.add(en(s, 0, y, -0.66));
  }
  g.add(en(caja(0.12, 1.1, 0.04, m.galvOsc), 0, -0.05, -0.82));
  for (const x of [-0.42, 0.42]) {
    const o = malla(new THREE.TorusGeometry(0.06, 0.018, 10, 24), m.pinturaOsc);
    g.add(rot(en(o, x, 0.76, 0), 0, Math.PI / 2, 0));
  }
  return g;
}

function banco() {
  const m = mats(), g = new THREE.Group();
  g.add(en(caja(3.4, 0.12, 0.12, m.galv), 0, 0.95, -0.95));
  g.add(en(caja(3.4, 0.12, 0.12, m.galv), 0, -0.6, -0.95));
  g.add(en(cil(0.22, 0.24, 2.6, m.concreto, 32), 0, 0.1, -1.18));
  for (const x of [-1.15, 0, 1.15]) {
    const t = transformador();
    t.scale.setScalar(0.82);
    g.add(en(t, x, 0, 0));
  }
  return g;
}

function crucetaMetal(largo = 2.4) {
  const m = mats(), g = new THREE.Group();
  const s = new THREE.Shape();
  const a = 0.12, e = 0.016;
  s.moveTo(0, 0); s.lineTo(a, 0); s.lineTo(a, e); s.lineTo(e, e); s.lineTo(e, a); s.lineTo(0, a); s.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: largo, bevelEnabled: false });
  geo.translate(-a / 2, -a / 2, -largo / 2);
  const ang = malla(geo, m.galv);
  ang.rotation.y = Math.PI / 2;
  g.add(ang);
  for (const x of [-1.05, -0.55, 0.55, 1.05]) {
    g.add(en(cil(0.02, 0.02, 0.16, m.galvOsc, 12), x * largo / 2.4, 0.06, 0));
    g.add(en(tuerca(0.035, 0.03, m.galvOsc), x * largo / 2.4, 0.08, 0));
  }
  for (const sg of [-1, 1]) {
    const p = caja(0.04, 0.9, 0.012, m.galvOsc);
    p.rotation.z = sg * 0.62;
    g.add(en(p, sg * 0.3, -0.38, 0.05));
  }
  return g;
}

function crucetaMadera(largo = 2.4) {
  const m = mats(), g = new THREE.Group();
  const v = caja(largo, 0.14, 0.16, m.maderaClara);
  g.add(v);
  for (const x of [-1.05, -0.5, 0.5, 1.05]) {
    g.add(en(cil(0.018, 0.018, 0.13, m.galv, 12), x * largo / 2.4, 0.08, 0));
    g.add(en(arandela(0.02, 0.045, 0.012, m.galv), x * largo / 2.4, 0.055, 0));
  }
  for (const sg of [-1, 1]) {
    const p = caja(0.045, 0.85, 0.012, m.galv);
    p.rotation.z = sg * 0.6;
    g.add(en(p, sg * 0.28, -0.38, 0.07));
  }
  return g;
}

function soporte() {
  const m = mats(), g = new THREE.Group();
  g.add(caja(0.12, 1.4, 0.02, m.galv));
  for (const y of [0.5, -0.5]) {
    const brazo = caja(0.12, 0.02, 0.42, m.galv);
    g.add(en(brazo, 0, y, 0.2));
    const gancho = malla(new THREE.TorusGeometry(0.07, 0.016, 12, 24, Math.PI), m.galv);
    g.add(rot(en(gancho, 0, y + 0.07, 0.42), 0, Math.PI / 2, 0));
  }
  for (const y of [0.25, -0.25]) {
    const ab = malla(new THREE.TorusGeometry(0.17, 0.018, 12, 40, Math.PI), m.galvOsc);
    g.add(rot(en(ab, 0, y, -0.02), Math.PI / 2, 0, Math.PI / 2));
  }
  return g;
}

function poste(material, cruceta) {
  const m = mats(), g = new THREE.Group();
  const alto = 4.2;
  g.add(en(cil(0.14, 0.2, alto, material, 40), 0, -alto / 2 + 0.6, 0));
  if (material === m.concreto) {
    for (let i = 0; i < 6; i++) g.add(en(cil(0.012, 0.012, 0.02, m.negro, 8), 0, 0.3 - i * 0.55, 0.16 + i * 0.004));
  }
  g.add(en(cil(0.15, 0.14, 0.03, material, 40), 0, 0.61, 0));
  const c = cruceta === "madera" ? crucetaMadera() : crucetaMetal();
  g.add(en(c, 0, 0.25, 0.16));
  for (const x of [-1.05, 0, 1.05]) {
    const a = aisladorPoste(m.porcelana);
    a.scale.setScalar(0.42);
    g.add(en(a, x, x === 0 ? 0.66 : 0.4, x === 0 ? 0 : 0.16));
  }
  return g;
}

function grillete() {
  const m = mats(), g = new THREE.Group();
  const cur = new THREE.CurvePath();
  cur.add(new THREE.LineCurve3(new THREE.Vector3(-0.3, 0.6, 0), new THREE.Vector3(-0.3, -0.2, 0)));
  cur.add(new THREE.CubicBezierCurve3(new THREE.Vector3(-0.3, -0.2, 0), new THREE.Vector3(-0.3, -0.62, 0), new THREE.Vector3(0.3, -0.62, 0), new THREE.Vector3(0.3, -0.2, 0)));
  cur.add(new THREE.LineCurve3(new THREE.Vector3(0.3, -0.2, 0), new THREE.Vector3(0.3, 0.6, 0)));
  g.add(malla(new THREE.TubeGeometry(cur, 80, 0.075, 20, false), m.galv));
  for (const x of [-0.3, 0.3]) g.add(rot(en(malla(new THREE.TorusGeometry(0.1, 0.05, 14, 28), m.galv), x, 0.62, 0), 0, Math.PI / 2, 0));
  const pin = cil(0.05, 0.05, 0.9, m.galvOsc, 20);
  g.add(rot(en(pin, 0, 0.62, 0), 0, 0, Math.PI / 2));
  g.add(rot(en(cil(0.09, 0.09, 0.06, m.galvOsc, 6), -0.46, 0.62, 0), 0, 0, Math.PI / 2));
  g.add(rot(en(tuerca(0.085, 0.08, m.galvOsc), 0.45, 0.62, 0), 0, 0, Math.PI / 2));
  return g;
}

function grapa() {
  const m = mats(), g = new THREE.Group();
  const cuerpo = malla(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 48, 1, false, Math.PI / 2, Math.PI), m.alu);
  cuerpo.rotation.z = Math.PI / 2;
  g.add(cuerpo);
  for (const x of [-0.6, 0.6]) {
    const borde = malla(new THREE.TorusGeometry(0.22, 0.03, 10, 40, Math.PI), m.alu);
    g.add(rot(en(borde, x, 0, 0), 0, Math.PI / 2, Math.PI));
  }
  g.add(rot(en(cil(0.06, 0.06, 1.7, m.negro, 24), 0, 0, 0), 0, 0, Math.PI / 2));
  for (const x of [-0.28, 0.28]) {
    const u = malla(new THREE.TorusGeometry(0.2, 0.025, 12, 32, Math.PI), m.galv);
    g.add(rot(en(u, x, 0.02, 0), 0, Math.PI / 2, 0));
    for (const z of [-0.2, 0.2]) g.add(en(tuerca(0.045, 0.05, m.galv), x, -0.02, z));
  }
  g.add(en(caja(0.18, 0.36, 0.05, m.alu), 0, -0.36, 0));
  g.add(rot(en(cil(0.04, 0.04, 0.2, m.galvOsc, 16), 0, -0.48, 0), Math.PI / 2, 0, 0));
  return g;
}

function conector() {
  const m = mats(), g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.32, 0.22); s.quadraticCurveTo(-0.44, 0.22, -0.44, 0.1); s.lineTo(-0.44, -0.1); s.quadraticCurveTo(-0.44, -0.22, -0.32, -0.22);
  s.lineTo(0.32, -0.22); s.quadraticCurveTo(0.44, -0.22, 0.44, -0.1); s.lineTo(0.44, 0.1); s.quadraticCurveTo(0.44, 0.22, 0.32, 0.22);
  s.lineTo(0.3, 0.16); s.lineTo(0.36, 0.08); s.lineTo(0.36, -0.08); s.lineTo(0.3, -0.16); s.lineTo(-0.3, -0.16); s.lineTo(-0.36, -0.08); s.lineTo(-0.36, 0.08); s.lineTo(-0.3, 0.16); s.lineTo(-0.32, 0.22);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3 });
  geo.translate(0, 0, -0.25);
  g.add(malla(geo, m.cobre));
  g.add(malla(new THREE.BoxGeometry(0.42, 0.18, 0.62), m.laton));
  for (const x of [-0.36, 0.36]) {
    const c = cil(0.07, 0.07, 1.8, m.alu, 18);
    g.add(rot(en(c, x, 0, 0), Math.PI / 2, 0, 0));
  }
  return g;
}

function pica() {
  const m = mats(), g = new THREE.Group();
  g.add(cil(0.045, 0.045, 2.6, m.cobre, 24));
  g.add(en(malla(new THREE.ConeGeometry(0.045, 0.14, 24), m.cobre), 0, -1.37, 0));
  g.children[1].rotation.x = Math.PI;
  const abraz = new THREE.Group();
  abraz.add(cil(0.09, 0.09, 0.16, m.laton, 24));
  abraz.add(rot(en(cil(0.03, 0.03, 0.22, m.laton, 12), 0.12, 0, 0), 0, 0, Math.PI / 2));
  abraz.add(rot(en(tuerca(0.05, 0.05, m.laton), 0.22, 0, 0), 0, 0, Math.PI / 2));
  g.add(en(abraz, 0, 1.1, 0));
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 1.1, 0.08), new THREE.Vector3(0.3, 1.3, 0.25), new THREE.Vector3(0.45, 1.7, 0.2)]);
  g.add(malla(new THREE.TubeGeometry(cable, 40, 0.03, 10, false), m.cobre));
  return g;
}

function aisladorSuspension() {
  const m = mats(), g = new THREE.Group();
  const p = [[0.05, 0]];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const y = 0.08 + i * 0.16;
    const r = i % 2 === 0 ? 0.3 : 0.22;
    p.push([0.05, y], [r, y + 0.04], [r * 0.96, y + 0.06], [0.05, y + 0.12]);
  }
  p.push([0.05, 0.08 + n * 0.16]);
  const nucleo = torno(p, m.silicon, 56);
  nucleo.position.y = -0.66;
  g.add(nucleo);
  g.add(en(cil(0.08, 0.08, 0.22, m.galv, 32), 0, -0.76, 0));
  g.add(en(cil(0.08, 0.08, 0.22, m.galv, 32), 0, 0.76, 0));
  const ojo = malla(new THREE.TorusGeometry(0.08, 0.03, 14, 30), m.galv);
  g.add(en(ojo, 0, 0.96, 0));
  const lengua = caja(0.05, 0.22, 0.14, m.galv);
  g.add(en(lengua, 0, -0.96, 0));
  g.add(rot(en(cil(0.025, 0.025, 0.12, m.galvOsc, 12), 0, -1.0, 0), 0, 0, Math.PI / 2));
  g.rotation.z = Math.PI / 2;
  const w = new THREE.Group();
  w.add(g);
  return w;
}

function aisladorCarrete() {
  const m = mats();
  const g = new THREE.Group();
  g.add(torno([[0.1, 0], [0.32, 0], [0.34, 0.03], [0.32, 0.08], [0.24, 0.14], [0.22, 0.3], [0.24, 0.46], [0.32, 0.52], [0.34, 0.57], [0.32, 0.6], [0.1, 0.6], [0.1, 0]], m.crema, 64));
  g.add(en(cil(0.06, 0.06, 0.9, m.galv, 20), 0, 0.3, 0));
  g.add(en(tuerca(0.1, 0.07, m.galv), 0, 0.68, 0));
  g.add(en(arandela(0.06, 0.14, 0.02, m.galvOsc), 0, 0.63, 0));
  g.position.y = -0.3;
  const w = new THREE.Group(); w.add(g); return w;
}

function cortacircuitos() {
  const m = mats(), g = new THREE.Group();
  const cuerpo = torno(aletas(0, 1.3, 6, 0.09, 0.2, 0.03), m.porcelanaGris, 56);
  cuerpo.position.y = -0.65;
  const ais = new THREE.Group(); ais.add(cuerpo);
  ais.rotation.z = 0.32;
  g.add(ais);
  g.add(en(caja(0.08, 0.42, 0.08, m.galv), -0.02, 0, -0.18));
  g.add(en(caja(0.08, 0.08, 0.4, m.galv), -0.02, -0.2, -0.36));
  const sup = new THREE.Group();
  sup.add(caja(0.3, 0.06, 0.14, m.laton));
  sup.add(en(caja(0.06, 0.18, 0.12, m.laton), 0.14, -0.08, 0.06));
  sup.position.set(-0.26, 0.74, 0.12);
  g.add(sup);
  const inf = new THREE.Group();
  inf.add(caja(0.3, 0.06, 0.14, m.laton));
  inf.add(en(malla(new THREE.TorusGeometry(0.06, 0.016, 10, 20), m.laton), 0.08, -0.06, 0.08));
  inf.position.set(0.24, -0.72, 0.12);
  g.add(inf);
  const tubo = new THREE.Group();
  tubo.add(cil(0.05, 0.05, 1.3, m.cafeTubo, 24));
  tubo.add(en(cil(0.065, 0.065, 0.14, m.laton, 24), 0, 0.65, 0));
  tubo.add(en(cil(0.065, 0.065, 0.16, m.laton, 24), 0, -0.64, 0));
  tubo.add(rot(en(malla(new THREE.TorusGeometry(0.05, 0.014, 10, 20), m.laton), 0.07, 0.62, 0), 0, Math.PI / 2, 0));
  tubo.rotation.z = 0.32;
  tubo.position.set(0, 0, 0.26);
  g.add(tubo);
  return g;
}

function fusible() {
  const m = mats(), g = new THREE.Group();
  const cur = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0.05, 0.1, 0.05), new THREE.Vector3(-0.15, -0.5, 0.1), new THREE.Vector3(0.25, -1.0, 0.2), new THREE.Vector3(0.6, -1.15, 0.1)]);
  g.add(malla(new THREE.TubeGeometry(cur, 80, 0.025, 10, false), m.galv));
  g.add(en(cil(0.06, 0.06, 0.34, m.negro, 24), 0, 0.42, 0));
  g.add(en(cil(0.2, 0.2, 0.05, m.laton, 40), 0, 0.62, 0));
  g.add(en(cil(0.07, 0.07, 0.08, m.laton, 24), 0, 0.68, 0));
  return g;
}

function crucetaSola(tipo) { return tipo === "madera" ? crucetaMadera() : crucetaMetal(); }

function envolver(o, rx = 0, ry = 0, rz = 0) { const w = new THREE.Group(); o.rotation.set(rx, ry, rz); w.add(o); return w; }

function posteReal(material) {
  const g = new THREE.Group();
  g.add(en(cil(0.11, 0.16, 6.2, material, 40), 0, 3.0, 0));
  const arriba = pz("connection_large_01", 5.75);
  if (arriba) g.add(arriba);
  const t = pz("transformer_01", 4.0);
  if (t) g.add(t);
  for (const y of [3.7, 4.3]) { const r = pz("ring_large", y); if (r) g.add(r); }
  const c = pz("cap", 6.1);
  if (c) g.add(c);
  return g;
}

function bancoReal() {
  const g = new THREE.Group();
  g.add(en(cil(0.11, 0.13, 1.9, mats().concreto, 40), 0, 2.05, -0.2));
  const s1 = pz("support_large_01", 2.5), s2 = pz("support_large_02", 1.7);
  if (s1) { s1.scale.set(1.5, 1, 1); g.add(s1); }
  for (const x of [-0.62, 0, 0.62]) { const t = pz("transformer_01"); if (t) { t.position.set(x, 1.95, 0.18); g.add(t); } }
  return g;
}

const FAB = {
  "transformador": () => { const t = pz("transformer_01"); return t ? envolver(t) : transformador(); },
  "banco": () => (PZ ? bancoReal() : banco()),
  "poste-concreto": () => (PZ ? posteReal(mats().concreto) : poste(mats().concreto, "metal")),
  "poste-madera": () => (PZ ? pz("preset") : poste(mats().madera, "madera")),
  "cruceta-metal": () => { const r = pz("support_large_01"); return r ? envolver(r, 0.35, -0.5, 0) : envolver(crucetaSola("metal"), 0.5, -0.42, 0.18); },
  "cruceta-madera": () => envolver(crucetaSola("madera"), 0.5, -0.42, 0.18),
  "soporte": soporte,
  "perno": () => envolver(perno(1.6, 0.07, false), 0, 0, -0.9),
  "tornillo-ojo": () => envolver(perno(1.5, 0.07, true), 0, 0, -0.85),
  "grillete": grillete,
  "grapa": grapa,
  "conector": conector,
  "pica": () => envolver(pica(), 0, 0, -0.45),
  "aislador-poste": () => { const a = aisladorPoste(); a.position.y = -0.4; const w = new THREE.Group(); w.add(a); return w; },
  "aislador-suspension": () => { const r = pz("insulator_02"); return r ? envolver(r, 0, -0.9, 0) : aisladorSuspension(); },
  "aislador-carrete": aisladorCarrete,
  "cortacircuitos": () => { const r = pz("fuse_01"); return r ? envolver(r, 0, -0.6, 0) : cortacircuitos(); },
  "fusible": fusible
};

function partesDe(raiz) {
  let n = raiz;
  while (n.children.length === 1 && n.children[0].children.length) n = n.children[0];
  return n.children.length >= 3 ? n : null;
}

export function crearModelo(tipo, tam = 2.2) {
  mats();
  const crudo = (FAB[tipo] || transformador)();
  crudo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const caja3 = new THREE.Box3().setFromObject(crudo);
  const c = caja3.getCenter(new THREE.Vector3());
  const s = caja3.getSize(new THREE.Vector3());
  crudo.position.sub(c);
  const g = new THREE.Group();
  g.add(crudo);
  g.scale.setScalar(tam / Math.max(s.x, s.y, s.z));
  g.updateMatrixWorld(true);
  const padre = partesDe(crudo);
  if (padre) {
    const cajaP = new THREE.Box3().setFromObject(padre);
    const escala = padre.getWorldScale(new THREE.Vector3()).x;
    const centro = padre.worldToLocal(cajaP.getCenter(new THREE.Vector3()));
    const largo = cajaP.getSize(new THREE.Vector3()).length() / escala;
    g.userData.partes = padre.children.map(o => {
      const cp = padre.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()));
      const dir = cp.sub(centro);
      if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
      return { o, base: o.position.clone(), dir: dir.normalize().multiplyScalar(largo * 0.18) };
    });
  }
  return g;
}

export function piezas() {
  return { mats: mats(), transformador, aisladorPoste, crucetaMetal, cortacircuitos, cil, caja, en, rot };
}
