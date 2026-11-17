import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { GLTFLoader } from "./vendor/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/jsm/libs/meshopt_decoder.module.js";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";
import { Reflector } from "./vendor/jsm/objects/Reflector.js";
import { Line2 } from "./vendor/jsm/lines/Line2.js";
import { LineMaterial } from "./vendor/jsm/lines/LineMaterial.js";
import { LineGeometry } from "./vendor/jsm/lines/LineGeometry.js";
import { crearModelo, ponerPiezas, piezas } from "./modelos.js";

const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TACTIL = matchMedia("(pointer: coarse)").matches;
const salida = t => 1 - Math.pow(1 - t, 4);
const suave = t => t * t * (3 - 2 * t);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));

const NIVEL = (() => {
  const mem = navigator.deviceMemory || 8, nucleos = navigator.hardwareConcurrency || 8;
  if (TACTIL && (mem <= 2 || nucleos <= 2)) return 0;
  if (TACTIL) return 1;
  return 2;
})();

const avisarCarga = p => dispatchEvent(new CustomEvent("emt-progreso", { detail: p }));
avisarCarga(32);
const listoPiezas = new Promise(ok => {
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load("modelos/postes.glb",
    g => {
      const seguir = () => { avisarCarga(86); ponerPiezas(g.scene); ok(true); };
      (window.__emtQuieto || (f => f()))(seguir);
    },
    ev => { if (ev.total) avisarCarga(32 + (ev.loaded / ev.total) * 52); },
    () => ok(false));
});

function preparar(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

let texBrillo = null;
function brillo() {
  if (texBrillo) return texBrillo;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.15, "rgba(255,240,205,0.85)");
  g.addColorStop(0.4, "rgba(200,169,106,0.25)");
  g.addColorStop(1, "rgba(200,169,106,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  texBrillo = new THREE.CanvasTexture(c);
  texBrillo.colorSpace = THREE.SRGBColorSpace;
  return texBrillo;
}
function chispa(tam, color = [2.4, 1.9, 1.15]) {
  const m = new THREE.SpriteMaterial({ map: brillo(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
  m.color.setRGB(...color);
  const s = new THREE.Sprite(m);
  s.scale.setScalar(tam);
  return s;
}

function texNiebla() {
  const n = 256, c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d");
  const img = x.createImageData(n, n);
  const r = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const ruido = (u, v) => {
    const i = Math.floor(u), j = Math.floor(v), f = u - i, g = v - j;
    const a = r(i, j), b = r(i + 1, j), cc = r(i, j + 1), d = r(i + 1, j + 1);
    const su = f * f * (3 - 2 * f), sv = g * g * (3 - 2 * g);
    return a + (b - a) * su + (cc - a) * sv + (a - b - cc + d) * su * sv;
  };
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    let v = 0, amp = 0.5, fr = 4 / n;
    for (let o = 0; o < 5; o++) { v += ruido(xx * fr, y * fr) * amp; amp *= 0.5; fr *= 2; }
    const dx = xx / n - 0.5, dy = y / n - 0.5;
    const borde = Math.max(0, 1 - Math.sqrt(dx * dx * 2.2 + dy * dy * 6) * 1.6);
    const k = (y * n + xx) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
    img.data[k + 3] = Math.max(0, Math.min(255, (v - 0.25) * 2 * borde * 255));
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cielo() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uT: { value: 0 }, uLuna: { value: new THREE.Vector3(-0.62, 0.42, -0.66).normalize() } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform float uT; uniform vec3 uLuna; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 cenit = vec3(0.004, 0.012, 0.03), hor = vec3(0.045, 0.085, 0.16), suelo = vec3(0.006, 0.012, 0.022);
        vec3 c = h > 0.0 ? mix(hor, cenit, pow(smoothstep(0.0, 0.75, h), 0.55)) : mix(hor * 0.55, suelo, smoothstep(0.0, 0.12, -h));
        c += vec3(0.78, 0.58, 0.3) * 0.075 * exp(-abs(h) * 16.0);
        float m = max(dot(d, uLuna), 0.0);
        c += vec3(0.62, 0.72, 0.9) * (pow(m, 90.0) * 0.07 + pow(m, 8.0) * 0.03);
        c += vec3(1.0, 0.97, 0.9) * smoothstep(0.99984, 0.99991, m) * 2.4;
        if (h > 0.015) {
          vec2 uv = vec2(atan(d.z, d.x), asin(h)) * 190.0;
          vec2 id = floor(uv); float r = h21(id);
          if (r > 0.982) {
            vec2 f = fract(uv) - 0.5;
            float s = smoothstep(0.16, 0.0, length(f));
            float tw = 0.55 + 0.45 * sin(uT * 1.7 + r * 90.0);
            c += vec3(0.85, 0.9, 1.0) * s * tw * smoothstep(0.015, 0.25, h) * (r - 0.982) * 70.0;
          }
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  return new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), mat);
}

function cableVivo(curva, fase, radio = 0.013) {
  const N = 96;
  const base = curva.getSpacedPoints(N);
  const pos = new Float32Array((N + 1) * 3);
  base.forEach((q, k) => { pos[k * 3] = q.x; pos[k * 3 + 1] = q.y; pos[k * 3 + 2] = q.z; });
  const geo = new LineGeometry();
  geo.setPositions(pos);
  const mat = new LineMaterial({ color: 0x0c1218, linewidth: 1.5, worldUnits: false, alphaToCoverage: true, fog: true });
  mat.uniforms.uGrosor = { value: radio * 2 };
  mat.vertexShader = mat.vertexShader
    .replace("uniform float linewidth;", "uniform float linewidth;\nuniform float uGrosor;")
    .replace("offset *= linewidth;", "vec4 cSel = ( position.y < 0.5 ) ? clipStart : clipEnd;\n\t\t\t\toffset *= max( linewidth, uGrosor * projectionMatrix[ 1 ][ 1 ] * resolution.y * 0.5 / max( cSel.w, 0.001 ) );");
  const m = new Line2(geo, mat);
  m.frustumCulled = false;
  const c = { m, mat, curva, fase, radio };
  c.actualizar = t => {
    const datos = geo.attributes.instanceStart.data;
    const arr = datos.array;
    let ax = 0, ay = 0, az = 0;
    for (let k = 0; k <= N; k++) {
      const u = k / N, sw = Math.sin(Math.PI * u), q = base[k];
      const x = q.x + Math.sin(t * 0.8 + fase + u * 2) * 0.16 * sw;
      const y = q.y + Math.sin(t * 1.1 + fase * 1.7) * 0.05 * sw;
      const z = q.z;
      if (k > 0) { const o = (k - 1) * 6; arr[o] = ax; arr[o + 1] = ay; arr[o + 2] = az; arr[o + 3] = x; arr[o + 4] = y; arr[o + 5] = z; }
      ax = x; ay = y; az = z;
    }
    datos.needsUpdate = true;
  };
  return c;
}
function puntoCable(c, u, t) {
  const p = c.curva.getPointAt(u);
  const sw = Math.sin(Math.PI * u);
  p.x += Math.sin(t * 0.8 + c.fase + u * 2) * 0.16 * sw;
  p.y += Math.sin(t * 1.1 + c.fase * 1.7) * 0.05 * sw;
  return p;
}
function vano(a, b, comba) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const p = a.clone().lerp(b, t);
    p.y -= comba * 4 * t * (1 - t);
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

function cajaDe(o) { return new THREE.Box3().setFromObject(o); }

function armarPosteReal() {
  const pr = crearPreset();
  if (!pr) return null;
  const g = pr;
  g.updateMatrixWorld(true);
  const buscar = n => g.children.find(o => o.name === n);
  const alto = buscar("preset_01_connection_large_02") || buscar("preset_01_connection_small_02");
  const bajo = buscar("preset_01_connection_small_02");
  const puntas = o => {
    const b = cajaDe(o), c = b.getCenter(new THREE.Vector3());
    const w = b.max.x - b.min.x;
    return [-0.44, 0, 0.44].map(k => new THREE.Vector3(c.x + k * w, b.max.y - 0.03, c.z));
  };
  const trafo = buscar("preset_01_transformer_01");
  const fusible = buscar("preset_01_fuse_01") || buscar("preset_01_fuse_02");
  return {
    g,
    altas: alto ? puntas(alto) : [],
    bajas: bajo && bajo !== alto ? puntas(bajo).filter((_, i) => i !== 1) : [],
    trafo: trafo ? cajaDe(trafo).getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 3.9, 0.3),
    fusible: fusible ? cajaDe(fusible) : new THREE.Box3(new THREE.Vector3(-0.2, 4.4, 0), new THREE.Vector3(0.2, 4.8, 0.3)),
    tope: cajaDe(g).max.y
  };
}
function crearPreset() {
  const m = crearModeloCrudo("poste-madera");
  return m;
}
function crearModeloCrudo(tipo) {
  const g = crearModelo(tipo, 1);
  const crudo = g.children[0];
  const nuevo = new THREE.Group();
  crudo.children.slice().forEach(o => nuevo.add(o));
  return nuevo.children.length > 2 ? nuevo : null;
}

function armarPosteSimple() {
  const { mats: m, transformador, aisladorPoste, crucetaMetal, cil, en } = piezas();
  const g = new THREE.Group();
  g.add(en(cil(0.09, 0.14, 6.2, m.madera, 40), 0, 3.1, 0));
  const cr = crucetaMetal(1.3);
  cr.rotation.y = 0;
  g.add(en(cr, 0, 5.75, 0.1));
  const altas = [];
  for (const x of [-0.55, 0, 0.55]) {
    const a = aisladorPoste(m.porcelana);
    a.scale.setScalar(0.22);
    g.add(en(a, x, 5.8, 0.1));
    altas.push(new THREE.Vector3(x, 6.02, 0.1));
  }
  const t = transformador();
  t.scale.setScalar(0.45);
  g.add(en(t, 0, 3.9, 0.35));
  return { g, altas, bajas: [], trafo: new THREE.Vector3(0, 3.9, 0.35), fusible: new THREE.Box3(new THREE.Vector3(-0.1, 4.6, 0.1), new THREE.Vector3(0.1, 4.9, 0.3)), tope: 6.3 };
}


function perfil(ancho, n, alturas, rugos, semilla) {
  const pts = [];
  const r = i => { const v = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453; return v - Math.floor(v); };
  const ruido = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return r(i) * (1 - u) + r(i + 1) * u; };
  for (let i = 0; i <= n; i++) {
    const x = -ancho / 2 + (i / n) * ancho;
    let y = (ruido(x * 0.05) * 0.6 + ruido(x * 0.17) * 0.3 + ruido(x * 0.6) * 0.1) * rugos;
    for (const [x0, h, w] of alturas) {
      const d = Math.abs(x - x0) / w;
      if (d < 1) y = Math.max(y, h * Math.pow(1 - d, 1.7) - (d < 0.05 ? (0.05 - d) * h * 0.6 : 0));
    }
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}
function capaMontes(pts, color, dist, dir) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0].x, -30);
  pts.forEach(q => sh.lineTo(q.x, q.y));
  sh.lineTo(pts[pts.length - 1].x, -30);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, fog: false }));
  m.position.copy(dir).multiplyScalar(dist).setY(-1.5);
  m.lookAt(0, -1.5, 0);
  return m;
}
function volcanes(scene, nivel) {
  const dir = new THREE.Vector3(-0.74, 0, -0.67).normalize();
  const g = new THREE.Group();
  const lejos = perfil(420, 320, [[-58, 40, 58], [12, 34, 44], [30, 37, 38], [120, 22, 48]], 11, 1);
  const medio = perfil(330, 220, [[-120, 14, 40], [70, 12, 50]], 9, 2);
  const cerca = perfil(240, 260, [], 5.5, 3);
  g.add(capaMontes(lejos, 0x16294a, 150, dir));
  g.add(capaMontes(medio, 0x0f1f37, 108, dir));
  g.add(capaMontes(cerca, 0x0a1627, 72, dir));
  scene.add(g);
  const crater = new THREE.Vector3();
  const plano = g.children[0];
  plano.updateMatrixWorld(true);
  crater.set(30, 37, 0.5).applyMatrix4(plano.matrixWorld);
  const fuego = chispa(3.2, [0.62, 0.24, 0.09]);
  fuego.material.fog = false;
  fuego.position.copy(crater);
  scene.add(fuego);
  const lava = chispa(1.1, [0.8, 0.3, 0.1]);
  lava.material.fog = false;
  lava.position.copy(crater).add(new THREE.Vector3(-0.6, -1.6, 0));
  scene.add(lava);
  const n = nivel === 0 ? 60 : 180;
  const pos = new Float32Array(n * 3);
  const medioM = g.children[1];
  medioM.updateMatrixWorld(true);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 300, -1 + Math.random() * 2.5, 0.6).applyMatrix4(medioM.matrixWorld);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
  }
  const luces = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.5, 0.7), size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, toneMapped: false }));
  scene.add(luces);
  return { fuego, lava, luces };
}

function ave(color = 0x04070c) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const cuerpo = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 6), mat);
  cuerpo.rotation.x = Math.PI / 2;
  g.add(cuerpo);
  const forma = new THREE.Shape();
  forma.moveTo(0, 0); forma.quadraticCurveTo(0.28, 0.1, 0.62, -0.02); forma.quadraticCurveTo(0.3, -0.06, 0, -0.12);
  const geo = new THREE.ShapeGeometry(forma);
  const izq = new THREE.Group(), der = new THREE.Group();
  const ai = new THREE.Mesh(geo, mat); ai.rotation.x = -Math.PI / 2; izq.add(ai);
  const ad = new THREE.Mesh(geo, mat); ad.rotation.x = -Math.PI / 2; ad.scale.x = -1; der.add(ad);
  g.add(izq, der);
  g.userData.alas = [izq, der];
  return g;
}
function bandada(scene, n) {
  const aves = [];
  for (let i = 0; i < n; i++) {
    const a = ave();
    a.scale.setScalar(0.9 + Math.random() * 0.5);
    a.userData.fila = { dx: -Math.abs(i - (n - 1) / 2) * 1.6, dz: (i - (n - 1) / 2) * 1.4, dy: Math.random() * 0.6, fase: Math.random() * 6 };
    scene.add(a);
    aves.push(a);
  }
  return { aves, t0: 2, ruta: null };
}
function posada(color = 0x05080d) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat);
  c.scale.set(1, 1.25, 1.5);
  c.position.y = 0.09;
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat);
  cab.position.set(0, 0.2, 0.06);
  const cola = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), mat);
  cola.position.set(0, 0.05, -0.13);
  cola.rotation.x = -2.2;
  g.add(c, cab, cola);
  return g;
}

function farolCalle(scene, nivel) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x1b2129, metalness: 0.7, roughness: 0.45 });
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.6, 16), metal);
  poste.position.y = 2.3;
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10), metal);
  brazo.rotation.z = Math.PI / 2;
  brazo.position.set(-0.5, 4.55, 0);
  const cabeza = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.12, 20), metal);
  cabeza.position.set(-1.0, 4.5, 0);
  const foco = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.05, 0.6), toneMapped: false }));
  foco.rotation.x = Math.PI / 2;
  foco.position.set(-1.0, 4.43, 0);
  g.add(poste, brazo, cabeza, foco);
  const cono = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.4, 40, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform float uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); float a = pow(vUv.y, 1.8) * f * (0.16 + 0.02 * sin(uT * 3.0)); gl_FragColor = vec4(vec3(1.0, 0.68, 0.36) * a, a); }"
  }));
  cono.position.set(-1.0, 2.25, 0);
  cono.visible = false;
  g.add(cono);
  const luz = new THREE.SpotLight(0xffa860, nivel === 0 ? 40 : 70, 16, 0.75, 0.8, 2);
  luz.position.set(-1.0, 4.4, 0);
  luz.target.position.set(-1.6, 0, -0.6);
  g.add(luz, luz.target);
  g.position.set(-4.2, 0, 3.4);
  g.rotation.y = Math.PI + 0.35;
  scene.add(g);
  return { g, cono };
}

function heroe(lienzo) {
  const seccion = lienzo.closest(".heroe");
  let nivel = NIVEL;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: "high-performance" });
  preparar(renderer);
  let escala = 1;
  const razon = () => Math.max(1, Math.min(devicePixelRatio, nivel === 0 ? 1.5 : 2) * escala);
  renderer.setPixelRatio(razon());
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1628, 0.024);
  const domo = cielo();
  domo.renderOrder = -10;
  scene.add(domo);
  const montes = volcanes(scene, nivel);
  const calle = farolCalle(scene, nivel);
  const aves = bandada(scene, nivel === 0 ? 4 : 7);
  const posadas = [];
  const envEscena = new THREE.Scene();
  envEscena.add(cielo());
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envEscena, 0.02).texture;
  scene.environmentIntensity = 0.55;

  const luna = new THREE.DirectionalLight(0xaec4ff, 1.5);
  luna.position.copy(domo.material.uniforms.uLuna.value).multiplyScalar(30);
  const farol = new THREE.PointLight(0xffb070, 24, 14, 2);
  farol.position.set(3.2, 3.6, 3.8);
  const relleno = new THREE.HemisphereLight(0x2a4470, 0x05080f, 0.45);
  const destello = new THREE.PointLight(0xcfe0ff, 0, 7, 2);
  scene.add(luna, farol, relleno, destello);

  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x060b13, roughness: 0.92 }));
  suelo.rotation.x = -Math.PI / 2;
  scene.add(suelo);

  const camara = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
  const rig = new THREE.Group();
  scene.add(rig);

  const cables = [], pulsos = [];
  let datos = null;
  let chispas = null, arco = null;

  function montar(real) {
    datos = (real && armarPosteReal()) || armarPosteSimple();
    rig.add(datos.g);
    const vecinos = nivel === 0 ? [-30, 30] : [-62, -30, 30, 62];
    const desplaz = z => new THREE.Vector3(z * 0.035, 0, z);
    const postes = [new THREE.Vector3(0, 0, 0)];
    for (const z of vecinos) {
      const o = desplaz(z);
      const c = (real && crearPreset()) || armarPosteSimple().g;
      c.position.copy(o);
      rig.add(c);
      postes.push(o);
    }
    const orden = postes.slice().sort((a, b) => a.z - b.z);
    const lineas = [...datos.altas.map(p => ({ p, comba: 0.95 })), ...datos.bajas.map(p => ({ p, comba: 1.2 }))];
    lineas.forEach((ln, i) => {
      for (let k = 0; k < orden.length - 1; k++) {
        const a = ln.p.clone().add(orden[k]), b = ln.p.clone().add(orden[k + 1]);
        const cerca = Math.abs(orden[k].z) < 1 || Math.abs(orden[k + 1].z) < 1;
        const c = cableVivo(vano(a, b, ln.comba), i * 1.3 + k * 0.7, cerca ? 0.012 : 0.016);
        c.cerca = cerca; c.baja = i >= datos.altas.length;
        c.mat.resolution.set(ancho, alto);
        rig.add(c.m);
        cables.push(c);
        if (cerca && i < datos.altas.length) {
          const s = chispa(0.42);
          rig.add(s);
          pulsos.push({ s, c, t: (i * 0.23 + k * 0.5) % 1, v: 0.05 + i * 0.012, inv: orden[k].z < -1 });
        }
      }
    });
    const ancla = datos.fusible.getCenter(new THREE.Vector3()).setY(datos.fusible.max.y);
    arco = {
      a: ancla.clone().add(new THREE.Vector3(-0.04, -0.02, 0)),
      b: ancla.clone().add(new THREE.Vector3(0.22, 0.16, 0.06)),
      linea: new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(3.2, 3.4, 4.0), transparent: true, toneMapped: false })),
      halo: chispa(0.7, [2.2, 2.5, 3.2]),
      vida: -1, prox: QUIETO ? 1e9 : 3.5
    };
    arco.linea.material.opacity = 0;
    arco.halo.material.opacity = 0;
    arco.halo.position.copy(arco.a).lerp(arco.b, 0.5);
    rig.add(arco.linea, arco.halo);
    destello.position.copy(arco.halo.position);
    const n = nivel === 0 ? 24 : 70;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    chispas = { p: new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })), v: [], vida: new Float32Array(n), n };
    for (let i = 0; i < n; i++) { chispas.v.push(new THREE.Vector3()); chispas.vida[i] = 0; pos[i * 3 + 1] = -99; }
    rig.add(chispas.p);
    const baja = cables.find(c => c.cerca && c.baja) || cables.find(c => c.cerca);
    if (baja) for (const u of [0.31, 0.345, 0.62]) { const b = posada(); b.scale.setScalar(0.9 + Math.random() * 0.3); rig.add(b); posadas.push({ b, c: baja, u, giro: Math.random() * 6 }); }
    armarRuta();
    lienzo.classList.add("listo");
  }

  const nieblas = [];
  const tn = texNiebla();
  for (let i = 0; i < (nivel === 0 ? 4 : 10); i++) {
    const m = new THREE.SpriteMaterial({ map: tn, color: 0x8aa2c4, transparent: true, opacity: 0.05 + Math.random() * 0.07, depthWrite: false, fog: false });
    const s = new THREE.Sprite(m);
    s.scale.set(16 + Math.random() * 14, 4 + Math.random() * 4, 1);
    s.position.set((Math.random() - 0.5) * 30, 0.6 + Math.random() * 3.4, (Math.random() - 0.5) * 50);
    s.userData.v = 0.12 + Math.random() * 0.25;
    scene.add(s);
    nieblas.push(s);
  }
  const nPolvo = nivel === 0 ? 80 : 260;
  const polvoPos = new Float32Array(nPolvo * 3);
  for (let i = 0; i < nPolvo; i++) { polvoPos[i * 3] = (Math.random() - 0.5) * 7; polvoPos[i * 3 + 1] = 0.5 + Math.random() * 7; polvoPos[i * 3 + 2] = (Math.random() - 0.5) * 7; }
  const polvo = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(polvoPos, 3)), new THREE.PointsMaterial({ color: 0xffe9bf, size: 0.022, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(polvo);

  let ruta = null;
  function armarRuta() {
    const tr = datos.trafo.clone();
    const lado = new THREE.Vector3(tr.x, 0, tr.z);
    if (lado.lengthSq() < 0.01) lado.set(0, 0, 1);
    lado.normalize();
    const cruz = new THREE.Vector3(-lado.z, 0, lado.x);
    const top = datos.tope;
    ruta = [
      { p: 0, pos: new THREE.Vector3(6.3, 1.7, 5.8), mira: new THREE.Vector3(-0.3, top * 0.62, -0.5) },
      { p: 0.34, pos: tr.clone().add(lado.clone().multiplyScalar(2.9)).add(cruz.clone().multiplyScalar(1.6)).add(new THREE.Vector3(0, 0.55, 0)), mira: tr.clone().add(new THREE.Vector3(0, 0.15, 0)) },
      { p: 0.64, pos: new THREE.Vector3(0, top - 0.2, 0).add(lado.clone().multiplyScalar(2.0)).add(cruz.clone().multiplyScalar(-1.5)), mira: new THREE.Vector3(0, top - 0.6, 0) },
      { p: 1, pos: new THREE.Vector3(10, 8.5, 14), mira: new THREE.Vector3(-24, 1.5, -30) }
    ];
  }

  let composer = null, bloom = null;
  function armarComposer() {
    if (nivel === 0) { composer = null; return; }
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: nivel === 2 ? 4 : 2 }));
    composer.addPass(new RenderPass(scene, camara));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.78);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  armarComposer();

  const puntero = { x: 0, y: 0, tx: 0, ty: 0 };
  let ancho = 1, alto = 1, visible = true, inicio = performance.now(), pSuave = -1;
  function medir() {
    const r = lienzo.getBoundingClientRect();
    ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setPixelRatio(razon());
    renderer.setSize(ancho, alto, false);
    if (composer) { composer.setPixelRatio(razon()); composer.setSize(ancho, alto); }
    camara.aspect = ancho / alto;
    camara.fov = camara.aspect < 0.85 ? 46 : 32;
    camara.updateProjectionMatrix();
    for (const c of cables) c.mat.resolution.set(ancho, alto);
  }
  medir();
  new ResizeObserver(medir).observe(lienzo);
  addEventListener("pointermove", e => {
    if (QUIETO || e.pointerType === "touch") return;
    puntero.tx = (e.clientX / innerWidth) * 2 - 1;
    puntero.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  addEventListener("deviceorientation", e => {
    if (QUIETO || e.gamma == null) return;
    puntero.tx = lim(e.gamma / 30, -1, 1);
    puntero.ty = lim((e.beta - 45) / 40, -1, 1);
  }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(lienzo);

  function progreso() {
    if (QUIETO || !seccion) return 0;
    const r = seccion.getBoundingClientRect();
    return lim(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  }

  const tmpP = new THREE.Vector3(), tmpM = new THREE.Vector3();
  function enRuta(p) {
    let k = 0;
    while (k < ruta.length - 2 && p > ruta[k + 1].p) k++;
    const f = suave(lim((p - ruta[k].p) / (ruta[k + 1].p - ruta[k].p), 0, 1));
    tmpP.copy(ruta[k].pos).lerp(ruta[k + 1].pos, f);
    tmpM.copy(ruta[k].mira).lerp(ruta[k + 1].mira, f);
  }

  function rayo() {
    const pos = arco.linea.geometry.attributes.position;
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const p = arco.a.clone().lerp(arco.b, t);
      const j = Math.sin(Math.PI * t) * 0.05;
      p.x += (Math.random() - 0.5) * j; p.y += (Math.random() - 0.5) * j; p.z += (Math.random() - 0.5) * j;
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
  }
  function soltarChispas() {
    const pos = chispas.p.geometry.attributes.position;
    for (let i = 0; i < chispas.n; i++) {
      if (chispas.vida[i] > 0 && Math.random() > 0.3) continue;
      pos.setXYZ(i, arco.halo.position.x, arco.halo.position.y, arco.halo.position.z);
      chispas.v[i].set((Math.random() - 0.5) * 2.4, Math.random() * 1.8 + 0.3, (Math.random() - 0.5) * 2.4);
      chispas.vida[i] = 0.6 + Math.random() * 0.9;
    }
  }

  const reloj = new THREE.Clock();
  let muestras = 0, sumaDt = 0;
  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible || document.hidden || !datos) { reloj.getDelta(); return; }
    const dt = Math.min(reloj.getDelta(), 0.05);
    const t = (performance.now() - inicio) / 1000;
    if (muestras < 120 && t > 1.5) {
      muestras++; sumaDt += dt;
      if (muestras === 120 && sumaDt / 120 > 0.034) {
        if (composer) composer = null; else escala = 0.8;
        medir();
      }
    }
    puntero.x += (puntero.tx - puntero.x) * (1 - Math.exp(-dt * 2.5));
    puntero.y += (puntero.ty - puntero.y) * (1 - Math.exp(-dt * 2.5));
    const pMeta = progreso();
    if (pSuave < 0) pSuave = pMeta;
    pSuave += (pMeta - pSuave) * (1 - Math.exp(-dt * 3.2));
    const p = pSuave;
    const entrada = QUIETO ? 1 : salida(lim(t / 2.6, 0, 1));
    enRuta(p);
    camara.position.copy(tmpP);
    camara.position.x += puntero.x * 0.45 + (QUIETO ? 0 : Math.sin(t * 0.18) * 0.25);
    camara.position.y += -puntero.y * 0.3 + (1 - entrada) * -1.2;
    camara.position.z += (1 - entrada) * 5;
    camara.lookAt(tmpM);
    const corrimiento = camara.aspect >= 0.85 ? (1 - suave(lim(p / 0.25, 0, 1))) * 0.2 : 0;
    camara.setViewOffset(ancho, alto, -ancho * corrimiento, 0, ancho, alto);
    domo.position.copy(camara.position);
    domo.material.uniforms.uT.value = t;
    calle.cono.material.uniforms.uT.value = t;
    const lat = 0.75 + Math.sin(t * 0.9) * 0.12 + Math.sin(t * 2.3) * 0.06;
    montes.fuego.material.opacity = lat;
    montes.lava.material.opacity = 0.6 + Math.sin(t * 1.7) * 0.25;
    montes.luces.material.opacity = 0.7 + Math.sin(t * 3.1) * 0.08;
    for (const q of posadas) { q.b.position.copy(puntoCable(q.c, q.u, QUIETO ? 0 : t)); q.b.rotation.y = q.giro + (QUIETO ? 0 : Math.sin(t * 0.7 + q.giro) * 0.4); }
    if (!QUIETO) {
      const ciclo = 26, fase = (t - aves.t0) % ciclo, k = fase / 14;
      aves.aves.forEach(a => {
        const f = a.userData.fila;
        const x = -45 + k * 90 + f.dx, z = -22 + f.dz - k * 6, y = 13 + f.dy + Math.sin(k * 4 + f.fase) * 0.6;
        a.visible = k <= 1;
        a.position.set(x, y, z);
        a.rotation.set(0, Math.PI / 2 - 0.08, Math.sin(t * 2 + f.fase) * 0.06);
        const aleteo = Math.sin(t * 9 + f.fase) * 0.65;
        a.userData.alas[0].rotation.z = aleteo;
        a.userData.alas[1].rotation.z = -aleteo;
      });
    } else aves.aves.forEach(a => { a.visible = false; });
    if (!QUIETO && p > 0.58 && p < 0.72 && arco.vida < 0 && t - (arco.ultimo || 0) > 2.2) { arco.vida = 0; arco.ultimo = t; soltarChispas(); }
    for (const c of cables) c.actualizar(QUIETO ? 0 : t);
    for (const q of pulsos) {
      if (!QUIETO) q.t = (q.t + q.v * dt) % 1;
      const u = q.inv ? 1 - q.t : q.t;
      q.s.position.copy(puntoCable(q.c, u, QUIETO ? 0 : t));
      q.s.material.opacity = QUIETO ? 0.6 : Math.min(1, Math.sin(Math.PI * u) * 2) * entrada;
    }
    if (!QUIETO) {
      for (const s of nieblas) { s.position.x += s.userData.v * dt; if (s.position.x > 18) s.position.x = -18; }
      polvo.rotation.y += dt * 0.02;
      polvo.position.y = Math.sin(t * 0.3) * 0.15;
      if (t > arco.prox && arco.vida < 0) { arco.vida = 0; arco.ultimo = t; arco.prox = t + 3.5 + Math.random() * 4.5; soltarChispas(); }
    }
    if (arco.vida >= 0) {
      arco.vida += dt;
      const k = arco.vida / 0.38;
      const parpadeo = Math.random() > 0.35 ? 1 : 0.25;
      rayo();
      arco.linea.material.opacity = (1 - k) * parpadeo;
      arco.halo.material.opacity = (1 - k) * parpadeo;
      destello.intensity = (1 - k) * 22 * parpadeo;
      if (k >= 1) { arco.vida = -1; arco.linea.material.opacity = 0; arco.halo.material.opacity = 0; destello.intensity = 0; }
    }
    const cp = chispas.p.geometry.attributes.position, cc = chispas.p.geometry.attributes.color;
    for (let i = 0; i < chispas.n; i++) {
      if (chispas.vida[i] <= 0) { cc.setXYZ(i, 0, 0, 0); continue; }
      chispas.vida[i] -= dt;
      chispas.v[i].y -= 9.8 * dt * 0.6;
      cp.setXYZ(i, cp.getX(i) + chispas.v[i].x * dt, cp.getY(i) + chispas.v[i].y * dt, cp.getZ(i) + chispas.v[i].z * dt);
      const f = lim(chispas.vida[i], 0, 1);
      cc.setXYZ(i, 3 * f, 2.3 * f, 1.2 * f);
    }
    cp.needsUpdate = true; cc.needsUpdate = true;
    if (composer) composer.render(); else renderer.render(scene, camara);
  }

  let entradaFuera = !document.documentElement.classList.contains("cargando");
  addEventListener("emt-entrada-fuera", () => { entradaFuera = true; if (datos) inicio = performance.now(); });
  listoPiezas.then(real => (window.__emtQuieto || (f => f()))(() => {
    montar(real);
    if (entradaFuera) inicio = performance.now() - 4000;
    avisarCarga(92);
    try { renderer.compile(scene, camara); } catch (e) {}
    cuadro();
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => dispatchEvent(new Event("emt-portada-lista")))));
  }));
}

let estudio = null;
function crearEstudio(tam) {
  const lienzo = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  preparar(renderer);
  renderer.setPixelRatio(1);
  renderer.setSize(tam, tam, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const llave = new THREE.DirectionalLight(0xffe7c2, 2.6);
  llave.position.set(-2.5, 5, 3.5);
  llave.castShadow = true;
  llave.shadow.mapSize.set(TACTIL ? 512 : 1024, TACTIL ? 512 : 1024);
  llave.shadow.radius = 10;
  llave.shadow.blurSamples = 16;
  Object.assign(llave.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 14 });
  const borde = new THREE.DirectionalLight(0x86aee6, 3.2);
  borde.position.set(4, 2.5, -5);
  scene.add(llave, borde, new THREE.HemisphereLight(0xb8cce6, 0x0b1a2e, 0.35));
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.45 }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.receiveShadow = true;
  scene.add(sombra);
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camara.position.set(0, 0.6, 5.4);
  camara.lookAt(0, -0.05, 0);
  return { lienzo, renderer, scene, camara, sombra };
}

function asentar(m, piso) {
  m.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m);
  m.position.y += piso - b.min.y;
}

async function miniatura(tipo) {
  await listoPiezas;
  if (!estudio) estudio = crearEstudio(TACTIL ? 380 : 560);
  const { renderer, scene, camara, lienzo, sombra } = estudio;
  const m = crearModelo(tipo, 2.3);
  m.rotation.set(0.12, -0.62, 0);
  asentar(m, -1.12);
  sombra.position.y = -1.12;
  scene.add(m);
  renderer.render(scene, camara);
  scene.remove(m);
  return new Promise(r => lienzo.toBlob(b => r(URL.createObjectURL(b)), "image/png"));
}

let visor = null;
function piso() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, "rgba(11,26,46,0.55)");
  g.addColorStop(0.7, "rgba(11,26,46,0.9)");
  g.addColorStop(1, "rgba(11,26,46,1)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function abrirVisor(caja, tipo) {
  const PISO = -1.15;
  if (!visor) {
    const lienzo = document.createElement("canvas");
    lienzo.className = "visor-lienzo";
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    preparar(renderer);
    renderer.setPixelRatio(Math.min(devicePixelRatio, NIVEL === 2 ? 2 : 1.5));
    renderer.shadowMap.enabled = NIVEL > 0;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.9;
    const llave = new THREE.DirectionalLight(0xffe7c2, 2.6);
    llave.position.set(-2.5, 5, 3.5);
    llave.castShadow = true;
    llave.shadow.mapSize.set(TACTIL ? 512 : 1024, TACTIL ? 512 : 1024);
    llave.shadow.radius = 10;
    llave.shadow.blurSamples = 16;
    Object.assign(llave.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 14 });
    const borde = new THREE.DirectionalLight(0x86aee6, 3.2);
    borde.position.set(4, 2.5, -5);
    scene.add(llave, borde, new THREE.HemisphereLight(0xb8cce6, 0x0b1a2e, 0.35));
    let espejo = null;
    if (NIVEL > 0) {
      espejo = new Reflector(new THREE.CircleGeometry(3.2, 64), { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x6f7f95 });
      espejo.rotation.x = -Math.PI / 2;
      espejo.position.y = PISO - 0.002;
      scene.add(espejo);
    }
    const velo = new THREE.Mesh(new THREE.CircleGeometry(3.22, 64), new THREE.MeshBasicMaterial({ map: piso(), transparent: true, depthWrite: false }));
    velo.rotation.x = -Math.PI / 2;
    velo.position.y = PISO;
    scene.add(velo);
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.ShadowMaterial({ opacity: 0.5 }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = PISO + 0.002;
    sombra.receiveShadow = true;
    scene.add(sombra);
    const anillo = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.515, 128), new THREE.MeshBasicMaterial({ color: 0xc8a96a, transparent: true, opacity: 0.5 }));
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = PISO + 0.004;
    scene.add(anillo);
    const camara = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    visor = { lienzo, renderer, scene, camara, anillo, modelo: null, activo: false, yaw: -0.6, pitch: 0.18, vy: 0, vp: 0, dist: 7, distObj: 7, toques: new Map(), quieto: 0, t0: 0, abre: 0, abreObj: 0 };
    const zoom = d => { visor.distObj = lim(visor.distObj * d, 3.2, 9.5); visor.quieto = 0; };
    lienzo.addEventListener("wheel", e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });
    lienzo.addEventListener("pointerdown", e => { visor.toques.set(e.pointerId, { x: e.clientX, y: e.clientY }); visor.quieto = 0; lienzo.setPointerCapture(e.pointerId); });
    lienzo.addEventListener("pointermove", e => {
      const prev = visor.toques.get(e.pointerId);
      if (!prev) return;
      if (visor.toques.size === 2) {
        const [a, b] = [...visor.toques.values()];
        const antes = Math.hypot(a.x - b.x, a.y - b.y);
        visor.toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [c, d] = [...visor.toques.values()];
        const ahora = Math.hypot(c.x - d.x, c.y - d.y);
        if (antes > 0 && ahora > 0) zoom(antes / ahora);
        return;
      }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      visor.toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      visor.vy = dx * 0.008; visor.vp = dy * 0.006;
      visor.yaw += visor.vy; visor.pitch = lim(visor.pitch + visor.vp, -0.35, 0.85);
    });
    const soltar = e => visor.toques.delete(e.pointerId);
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);
    lienzo.addEventListener("dblclick", () => { visor.yaw = -0.6; visor.pitch = 0.18; visor.distObj = 7; });
    const reloj = new THREE.Clock();
    const cuadro = () => {
      requestAnimationFrame(cuadro);
      const dt = Math.min(reloj.getDelta(), 0.05);
      if (!visor.activo || !visor.modelo) return;
      const r = visor.lienzo.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (visor.w !== w || visor.h !== h) { visor.w = w; visor.h = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); }
      if (!visor.toques.size) {
        visor.vy *= 0.94; visor.vp *= 0.9;
        visor.yaw += visor.vy;
        visor.quieto += dt;
        if (!QUIETO && visor.quieto > 1.6) visor.yaw += dt * 0.32;
      }
      visor.dist += (visor.distObj - visor.dist) * 0.12;
      const k = QUIETO ? 1 : salida(lim((performance.now() - visor.t0) / 800, 0, 1));
      camara.position.set(Math.sin(visor.yaw) * Math.cos(visor.pitch) * visor.dist, 0.2 + Math.sin(visor.pitch) * visor.dist, Math.cos(visor.yaw) * Math.cos(visor.pitch) * visor.dist);
      camara.lookAt(0, -0.05, 0);
      visor.modelo.rotation.y = -(1 - k) * 1.4;
      visor.modelo.scale.setScalar(visor.escala * (0.95 + 0.05 * k));
      visor.anillo.material.opacity = 0.5 * k;
      visor.abre += (visor.abreObj - visor.abre) * (QUIETO ? 1 : Math.min(1, dt * 7));
      const partes = visor.modelo.userData.partes;
      if (partes) for (const q of partes) q.o.position.copy(q.base).addScaledVector(q.dir, visor.abre);
      renderer.render(scene, camara);
    };
    cuadro();
  }
  const ponerModelo = () => {
    if (visor.modelo) visor.scene.remove(visor.modelo);
    const m = crearModelo(tipo, 2.3);
    asentar(m, PISO);
    visor.escala = m.scale.x;
    visor.modelo = m;
    visor.scene.add(m);
    visor.t0 = performance.now();
  };
  ponerModelo();
  listoPiezas.then(real => { if (real && visor.activo && visor.tipo === tipo) ponerModelo(); });
  visor.tipo = tipo;
  visor.yaw = -0.6; visor.pitch = 0.18; visor.vy = 0; visor.quieto = 0; visor.distObj = visor.dist = 7; visor.abre = visor.abreObj = 0;
  caja.appendChild(visor.lienzo);
  visor.activo = true;
  return {
    cerrar() { visor.activo = false; },
    tienePartes: () => !!(visor.modelo && visor.modelo.userData.partes),
    despiezar(si) { visor.abreObj = si ? 1 : 0; visor.quieto = 0; }
  };
}

let estudioGiro = null;
const giros = {};
let colaGiro = Promise.resolve();
function giro(tipo, n = 24, tam = 220) {
  if (giros[tipo]) return giros[tipo];
  giros[tipo] = colaGiro = colaGiro.then(async () => {
    await listoPiezas;
    if (!estudioGiro) estudioGiro = crearEstudio(tam);
    const { renderer, scene, camara, lienzo, sombra } = estudioGiro;
    const tira = document.createElement("canvas");
    tira.width = tam * n; tira.height = tam;
    const x = tira.getContext("2d");
    const m = crearModelo(tipo, 2.3);
    scene.add(m);
    for (let i = 0; i < n; i++) {
      m.position.set(0, 0, 0);
      m.rotation.set(0.12, -0.62 + (i / n) * Math.PI * 2, 0);
      asentar(m, -1.12);
      sombra.position.y = -1.12;
      renderer.render(scene, camara);
      x.drawImage(lienzo, i * tam, 0, tam, tam);
      if (i % 6 === 5) await new Promise(r => setTimeout(r, 0));
    }
    scene.remove(m);
    return new Promise(r => tira.toBlob(bl => r(URL.createObjectURL(bl)), "image/png"));
  });
  return giros[tipo];
}


const TAM_TIPO = { "transformador": 1.45, "banco": 2.1, "poste-concreto": 2.6, "poste-madera": 2.6, "cruceta-metal": 1.9, "cruceta-madera": 1.9, "soporte": 1.1, "aislador-poste": 0.95, "aislador-suspension": 1.25, "aislador-carrete": 0.6, "cortacircuitos": 1.15, "fusible": 0.8, "perno": 0.85, "tornillo-ojo": 0.85, "grillete": 0.6, "grapa": 0.75, "conector": 0.6, "pica": 1.6 };
let esc = null;
function escenario(caja, alElegir) {
  const PISO = 0;
  if (!esc) {
    const lienzo = document.createElement("canvas");
    lienzo.className = "esc-lienzo";
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    preparar(renderer);
    renderer.setPixelRatio(Math.min(devicePixelRatio, NIVEL === 2 ? 2 : 1.5));
    renderer.shadowMap.enabled = NIVEL > 0;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;
    const llave = new THREE.DirectionalLight(0xffe7c2, 2.2);
    llave.position.set(-3, 7, 5);
    llave.castShadow = true;
    llave.shadow.mapSize.set(TACTIL ? 512 : 1024, TACTIL ? 512 : 1024);
    llave.shadow.radius = 12;
    llave.shadow.blurSamples = 16;
    Object.assign(llave.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 0.5, far: 25 });
    const borde = new THREE.DirectionalLight(0x86aee6, 2.6);
    borde.position.set(5, 3, -6);
    const foco = new THREE.SpotLight(0xffd69a, 0, 14, 0.32, 0.65, 1.4);
    foco.position.set(0, 7, 3);
    scene.add(llave, borde, foco, foco.target, new THREE.HemisphereLight(0xb8cce6, 0x0b1a2e, 0.3));
    if (NIVEL > 0) {
      const espejo = new Reflector(new THREE.PlaneGeometry(30, 12), { clipBias: 0.003, textureWidth: 1024, textureHeight: 512, color: 0x5d6c82 });
      espejo.rotation.x = -Math.PI / 2;
      espejo.position.y = PISO - 0.002;
      scene.add(espejo);
    }
    const velo = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ map: piso(), transparent: true, depthWrite: false }));
    velo.rotation.x = -Math.PI / 2;
    velo.position.y = PISO;
    scene.add(velo);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.ShadowMaterial({ opacity: 0.5 }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = PISO + 0.002;
    sombra.receiveShadow = true;
    scene.add(sombra);
    const aro = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.64, 96), new THREE.MeshBasicMaterial({ color: 0xc8a96a, transparent: true, opacity: 0 }));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = PISO + 0.006;
    scene.add(aro);
    const camara = new THREE.PerspectiveCamera(30, 2, 0.1, 80);
    esc = { lienzo, renderer, scene, camara, foco, aro, piezas: new Map(), elegida: null, activo: false, mira: new THREE.Vector3(0, 0.8, 0), miraObj: new THREE.Vector3(0, 0.8, 0), giroCam: 0, giroObj: 0, ancho: 4, alElegir: null };
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let arr = null;
    const tocar = e => {
      const r = lienzo.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camara);
      let mejor = null, d = Infinity;
      for (const [clave, q] of esc.piezas) { const h = ray.intersectObject(q.g, true)[0]; if (h && h.distance < d) { d = h.distance; mejor = clave; } }
      return mejor;
    };
    lienzo.addEventListener("pointerdown", e => { arr = { x: e.clientX, g: esc.giroObj, mov: false }; });
    lienzo.addEventListener("pointermove", e => {
      if (arr) { const dx = e.clientX - arr.x; if (Math.abs(dx) > 5) arr.mov = true; esc.giroObj = lim(arr.g - dx * 0.004, -0.6, 0.6); return; }
      if (e.pointerType === "mouse") lienzo.style.cursor = tocar(e) ? "pointer" : "grab";
    });
    addEventListener("pointerup", e => {
      if (!arr) return;
      const fue = arr.mov; arr = null;
      if (fue || e.target !== lienzo) return;
      const c = tocar(e);
      if (c) { elegir(c); if (esc.alElegir) esc.alElegir(c); }
    });
    const reloj = new THREE.Clock();
    const cuadro = () => {
      requestAnimationFrame(cuadro);
      const dt = Math.min(reloj.getDelta(), 0.05);
      if (!esc.activo) return;
      const r = lienzo.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (esc.w !== w || esc.h !== h) { esc.w = w; esc.h = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); }
      const t = performance.now() / 1000;
      for (const [clave, q] of esc.piezas) {
        q.k = Math.min(1, q.k + dt / 0.75);
        const e = salida(q.k);
        const sel = esc.elegida === clave;
        q.real += ((sel ? 1 : 0) - q.real) * Math.min(1, dt * 6);
        const salir = q.saliendo ? salida(Math.min(1, (performance.now() - q.saliendo) / 380)) : 0;
        q.g.position.set(q.x, (1 - e) * 1.4 - salir * 0.5, q.z + q.real * 0.7);
        q.g.scale.setScalar(q.esc * (0.95 + 0.05 * e) * (1 + q.real * 0.1) * (1 - salir * 0.05));
        q.g.visible = salir < 0.98;
        if (!QUIETO) q.g.rotation.y = q.giro + t * (sel ? 0.7 : 0.18);
      }
      const q = esc.elegida && esc.piezas.get(esc.elegida);
      if (q) {
        esc.foco.position.set(q.x, 6.5, q.z + 3);
        esc.foco.target.position.set(q.x, 0.4, q.z + 0.7);
        esc.foco.intensity += (60 - esc.foco.intensity) * Math.min(1, dt * 5);
        esc.aro.position.x = q.x; esc.aro.position.z = q.z + 0.7;
        esc.aro.scale.setScalar(Math.max(0.6, q.radio));
        esc.aro.material.opacity += (0.7 - esc.aro.material.opacity) * Math.min(1, dt * 5);
        esc.miraObj.set(q.x * 0.55, 0.75, q.z * 0.5);
      } else {
        esc.foco.intensity += (0 - esc.foco.intensity) * Math.min(1, dt * 5);
        esc.aro.material.opacity += (0 - esc.aro.material.opacity) * Math.min(1, dt * 5);
        esc.miraObj.set(0, 0.75, 0);
      }
      esc.mira.lerp(esc.miraObj, Math.min(1, dt * 3));
      esc.giroCam += (esc.giroObj - esc.giroCam) * Math.min(1, dt * 4);
      const dist = Math.max(4.4, (esc.ancho / 2 + 0.7) / (Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.aspect) + 1.2);
      camara.position.set(esc.mira.x + Math.sin(esc.giroCam) * dist, 2.1 + dist * 0.16, Math.cos(esc.giroCam) * dist);
      camara.lookAt(esc.mira);
      renderer.render(scene, camara);
    };
    cuadro();
  }
  function elegir(clave) { esc.elegida = esc.elegida === clave ? null : clave; }
  function acomodar() {
    const vivas = [...esc.piezas.values()].filter(q => !q.saliendo);
    const n = vivas.length;
    let x = 0;
    const anchos = vivas.map(q => Math.max(0.9, q.radio * 2 + 0.35));
    const total = anchos.reduce((a, b) => a + b, 0);
    vivas.forEach((q, i) => {
      const cx = -total / 2 + x + anchos[i] / 2;
      x += anchos[i];
      q.x = cx;
      q.z = -Math.abs(cx) * 0.18;
    });
    esc.ancho = Math.max(3, total);
  }
  async function poner(items) {
    await listoPiezas;
    const vigentes = new Set(items.map(i => i.clave));
    for (const [clave, q] of esc.piezas) if (!vigentes.has(clave) && !q.saliendo) {
      q.saliendo = performance.now();
      setTimeout(() => { esc.scene.remove(q.g); esc.piezas.delete(clave); if (esc.elegida === clave) esc.elegida = null; }, 400);
    }
    items.forEach((it, i) => {
      if (esc.piezas.has(it.clave)) return;
      const tam = TAM_TIPO[it.tipo] || 1;
      const g = crearModelo(it.tipo, tam);
      asentar(g, PISO);
      const caja3 = new THREE.Box3().setFromObject(g);
      const s = caja3.getSize(new THREE.Vector3());
      const pivote = new THREE.Group();
      g.position.x -= (caja3.min.x + caja3.max.x) / 2;
      g.position.z -= (caja3.min.z + caja3.max.z) / 2;
      pivote.add(g);
      esc.scene.add(pivote);
      esc.piezas.set(it.clave, { g: pivote, esc: 1, k: -i * 0.12, real: 0, giro: -0.6 + i * 0.7, radio: Math.max(s.x, s.z) / 2 + 0.05, x: 0, z: 0 });
    });
    acomodar();
  }
  esc.alElegir = alElegir;
  caja.appendChild(esc.lienzo);
  esc.activo = true;
  return {
    poner,
    elegir(clave) { esc.elegida = clave; },
    soltar() { esc.elegida = null; },
    cerrar() { esc.activo = false; }
  };
}

window.EMT3D = { heroe, miniatura, abrirVisor, giro, escenario, nivel: NIVEL, listo: listoPiezas };
window.dispatchEvent(new Event("emt3d-listo"));
