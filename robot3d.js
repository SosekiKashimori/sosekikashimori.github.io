// 3D model of the COGS 300 robot, recreated from the team's photo and videos.
// Units are roughly centimetres. The robot faces +x.
import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';

const host = document.getElementById('bot3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail() { host.classList.add('no-gl'); }

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) { fail(); throw e; }
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.querySelector('.gl').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xefebe3, 62, 120);
const camera = new THREE.PerspectiveCamera(32, 1, .1, 400);
camera.position.set(34, 24, 30);

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8478, 1.15));
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(14, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xdfe8ff, .7); rim.position.set(-20, 14, -18); scene.add(rim);

// ---------- Helpers ----------
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o });
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m); return m;
}
function cyl(r, h, mat, x = 0, y = 0, z = 0, parent, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m); return m;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Parts that can be highlighted from the list
const parts = {};
function part(name) { const g = new THREE.Group(); g.name = name; parts[name] = g; scene.add(g); return g; }

// ---------- Floor + tape ----------
const floor = new THREE.Mesh(new THREE.CircleGeometry(160, 64), M(0x8e9196, { roughness: .9 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const tapeMat = M(0xf4f2ec, { roughness: .8 });
function tape(x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const t = new THREE.Mesh(new THREE.PlaneGeometry(len + 2.2, 2.2), tapeMat);
  t.rotation.x = -Math.PI / 2; t.rotation.z = -Math.atan2(z2 - z1, x2 - x1);
  t.position.set((x1 + x2) / 2, .02, (z1 + z2) / 2); t.receiveShadow = true; scene.add(t);
}
tape(-40, -3.5, 12, -3.5); tape(12, -3.5, 26, -18); tape(26, -18, 40, -18);

// ---------- Chassis (clear acrylic) ----------
const chassis = part('chassis');
const acrylic = new THREE.MeshPhysicalMaterial({ color: 0xeef3f4, roughness: .25, transmission: .55, thickness: .3, transparent: true, opacity: .9, clearcoat: .6 });
const shape = new THREE.Shape();
(function () { const w = 21, d = 13.5, r = 2.6, x0 = -11, z0 = -d / 2;
  shape.moveTo(x0 + r, z0); shape.lineTo(x0 + w - r, z0); shape.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  shape.lineTo(x0 + w, z0 + d - r); shape.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  shape.lineTo(x0 + r, z0 + d); shape.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  shape.lineTo(x0, z0 + r); shape.quadraticCurveTo(x0, z0, x0 + r, z0); })();
const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: .3, bevelEnabled: false });
plateGeo.rotateX(Math.PI / 2);
const plate = new THREE.Mesh(plateGeo, acrylic); plate.position.y = 3.9; plate.castShadow = true; plate.receiveShadow = true; chassis.add(plate);
// bits of white tape / hot glue on the plate, like the real one
const glue = M(0xf7f5f0, { roughness: .4 });
for (let i = 0; i < 9; i++) box(1.2 + rnd() * 2.4, .12, .9 + rnd() * 1.6, glue, -9 + rnd() * 17, 3.97, -5.5 + rnd() * 11, chassis).rotation.y = rnd() * 3;

// ---------- Motors + wheels ----------
const drive = part('drive');
const yellow = M(0xf2c200, { roughness: .45 });
const tireMat = M(0x1d1d1f, { roughness: .85 });
function wheel(z, side) {
  const g = new THREE.Group(); g.position.set(-5.8, 3.3, z); drive.add(g);
  // rounded tyre via lathe
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + Math.PI * i / 12; pts.push(new THREE.Vector2(2.75 + .55 * Math.cos(a), 1.25 * Math.sin(a))); }
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), tireMat); tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
  const rimM = cyl(2.6, 2.3, yellow, 0, 0, 0, g, 40); rimM.rotation.x = Math.PI / 2;
  const holeMat = M(0x2a2a2a);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const h = cyl(.62, .1, holeMat, Math.cos(a) * 1.45, Math.sin(a) * 1.45, side * 1.17, g, 16); h.rotation.x = Math.PI / 2; }
  const hub = cyl(.55, .2, M(0xd9b000), 0, 0, side * 1.2, g, 20); hub.rotation.x = Math.PI / 2;
  g.userData.spin = true; return g;
}
const wheels = [wheel(7.9, 1), wheel(-7.9, -1)];
[5.2, -5.2].forEach(z => { box(6.8, 2.1, 2.2, yellow, -4.6, 2.75, z, drive); cyl(.9, 1.6, M(0xf5f5f2), -1.4, 2.75, z, drive).rotation.z = Math.PI / 2; });
// front caster
cyl(.5, 2.3, M(0xb8bcc0, { metalness: .8, roughness: .3 }), 7.5, 2.4, 0, chassis);
const ball = new THREE.Mesh(new THREE.SphereGeometry(.9, 20, 16), M(0xc9ccd0, { metalness: .9, roughness: .25 })); ball.position.set(7.5, .9, 0); ball.castShadow = true; chassis.add(ball);
// battery pack under the plate
box(5.8, 1.6, 3.2, M(0x202022, { roughness: .7 }), 1.2, 2.9, 0, drive);

// ---------- Arduino Uno ----------
const ard = part('arduino');
const pcbTeal = M(0x1e7a8c, { roughness: .45 });
const ab = new THREE.Group(); ab.position.set(-6.6, 4.35, -2.4); ab.rotation.y = .06; ard.add(ab);
box(6.9, .16, 5.3, pcbTeal, 0, 0, 0, ab);
box(1.7, 1.1, 1.2, M(0xcfd3d6, { metalness: .85, roughness: .25 }), -3.0, .62, -1.7, ab);   // USB-B
box(1.4, 1.1, .9, M(0x161616), -3.1, .62, 1.8, ab);                                         // power jack
box(3.4, .45, .8, M(0x141414), .9, .3, .6, ab);                                              // ATmega chip
const hdr = M(0x111111);
box(5.4, .85, .26, hdr, .3, .5, -2.45, ab); box(4.8, .85, .26, hdr, .6, .5, 2.45, ab);       // headers
const on = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x44ff66, emissive: 0x33ff55, emissiveIntensity: 2 }));
on.position.set(2.3, .2, -.9); ab.add(on);
box(.6, .3, .6, M(0xe8e8e8), 1.9, .25, 1.6, ab); // reset button

// ---------- Breadboards ----------
const bread = part('breadboard');
function boardTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 340; const x = c.getContext('2d');
  x.fillStyle = '#f3f1ea'; x.fillRect(0, 0, 512, 340);
  x.fillStyle = '#c94a3a'; x.fillRect(14, 16, 484, 3); x.fillRect(14, 321, 484, 3);
  x.fillStyle = '#2f5aa8'; x.fillRect(14, 30, 484, 3); x.fillRect(14, 307, 484, 3);
  x.fillStyle = '#dad6cb'; x.fillRect(14, 162, 484, 16);
  x.fillStyle = '#6d6a63';
  for (let i = 0; i < 30; i++) for (let j = 0; j < 10; j++) x.fillRect(22 + i * 16, 52 + j * 26 + (j >= 5 ? 22 : 0), 6, 6);
  for (let i = 0; i < 25; i++) { x.fillRect(30 + i * 19, 20, 5, 5); x.fillRect(30 + i * 19, 314, 5, 5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const bbTop = new THREE.MeshStandardMaterial({ map: boardTex(), roughness: .6 });
const bbSide = M(0xeceae2);
function breadboard(w, d, x, z, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, .85, d), [bbSide, bbSide, bbTop, bbSide, bbSide, bbSide]);
  m.position.set(x, 4.5, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; bread.add(m); return m;
}
breadboard(8.2, 5.4, 1.4, 2.6, 0);
breadboard(8.2, 5.4, 3.4, -3.2, .04);
// small blue motor-driver board with red LEDs
box(3.2, .16, 2.4, M(0x2456b0), -1.6, 4.25, -4.9, bread);
[[-1.0, -4.3], [-.6, -4.3]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2a1a, emissiveIntensity: 2.2 })); l.position.set(x, 4.45, z); bread.add(l); });

// ---------- Front deck + ultrasonic ----------
const sonar = part('sonar');
const deck = box(4.6, .45, 9.4, M(0xe6d79a, { roughness: .7 }), 12.3, 4.05, 0, chassis); deck.rotation.z = -.05;
const sb = new THREE.Group(); sb.position.set(9.6, 5.6, .2); sonar.add(sb);
box(.16, 2.1, 4.5, M(0x1f4fa6), 0, 0, 0, sb);
const silver = M(0xd6d9dc, { metalness: .9, roughness: .28 });
const mesh = M(0x2b2b2b, { roughness: .9 });
[-1.3, 1.3].forEach(z => {
  const c = cyl(.82, 1.3, silver, .72, 0, z, sb, 32); c.rotation.z = Math.PI / 2;
  const f = cyl(.68, .05, mesh, 1.38, 0, z, sb, 28); f.rotation.z = Math.PI / 2;
});
box(.5, .5, 1.1, silver, .3, .75, 0, sb);
// second ultrasonic on the left side, facing out, for wall following
const sb2 = new THREE.Group(); sb2.position.set(6.2, 5.6, -6.95); sb2.rotation.y = Math.PI / 2; sonar.add(sb2);
box(.16, 2.1, 4.5, M(0x1f4fa6), 0, 0, 0, sb2);
[-1.3, 1.3].forEach(z => {
  const c = cyl(.82, 1.3, silver, .72, 0, z, sb2, 32); c.rotation.z = Math.PI / 2;
  const f = cyl(.68, .05, mesh, 1.38, 0, z, sb2, 28); f.rotation.z = Math.PI / 2;
});
box(.5, .5, 1.1, silver, .3, .75, 0, sb2);
box(3.2, .9, .5, M(0xe6d79a, { roughness: .7 }), 6.2, 4.4, -6.7, sonar); // mount

// ---------- IR line sensors (TCRT5000-style) ----------
const ir = part('ir');
const glowLights = [];
[4.5, -4.5].forEach(z => {
  const g = new THREE.Group(); g.position.set(14.1, 2.35, z); ir.add(g);
  box(.15, 3.3, 1.2, M(0x2050a8), 0, 0, 0, g);
  box(.5, .55, .55, M(0x1f6fd0), .3, .9, 0, g);                                  // sensitivity knob
  const pot = cyl(.15, .2, M(0xf0f0f0), .62, .9, 0, g, 10); pot.rotation.z = Math.PI / 2;
  cyl(.24, .7, M(0x151515), .25, -1.75, -.28, g, 16);                             // IR receiver (black)
  cyl(.24, .7, M(0xe9f1ff, { roughness: .2 }), .25, -1.75, .28, g, 16);           // IR emitter (clear)
  [.25, -.2].forEach(y => { const l = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5dff9a, emissive: 0x2fff7a, emissiveIntensity: 3 })); l.position.set(.12, y, .35); g.add(l); });
  const pl = new THREE.PointLight(0x2fff7a, 18, 7, 1.6); pl.position.set(.6, -1.2, 0); g.add(pl); glowLights.push(pl);
});

// ---------- Jumper wires ----------
const wires = part('wires');
const wireCols = [0xd23b2c, 0x1b1b1b, 0xf0c419, 0xe8792b, 0xf2f2f2, 0x2e9a4c, 0x2a5cc8, 0x7a4a2a, 0x9a9a9a, 0xd23b2c, 0x1b1b1b];
function wire(a, b, h, col) {
  const mid = a.clone().lerp(b, .5); mid.y += h;
  const c = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, h * .5, 0)), mid, b.clone().add(new THREE.Vector3(0, h * .5, 0)), b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, .075, 6), M(col, { roughness: .45 }));
  m.castShadow = true; wires.add(m);
}
const v = (x, y, z) => new THREE.Vector3(x, y, z);
for (let i = 0; i < 26; i++) {
  const fromArd = rnd() < .7;
  const a = fromArd ? v(-9 + rnd() * 5.6, 5.1, rnd() < .5 ? -4.8 : .1) : v(-2 + rnd() * 9, 5, -5.5 + rnd() * 11);
  const targets = [v(-2 + rnd() * 7, 5, 1 + rnd() * 3), v(1 + rnd() * 6, 5, -5 + rnd() * 3.5), v(9.6, 6.5, -1 + rnd() * 2.4), v(13.6, 3.9, rnd() < .5 ? 4.5 : -4.5), v(-1.6, 4.5, -4.9), v(5 + rnd() * 2.4, 6.5, -6.8)];
  wire(a, targets[Math.floor(rnd() * targets.length)], 1.2 + rnd() * 3.4, wireCols[i % wireCols.length]);
}

// ---------- Hotspots ----------
const spots = {
  arduino: v(-6.6, 5.4, -2.4), ir: v(14.2, 2.8, 4.5), sonar: v(10.6, 6.9, .2), sonar2: v(6.2, 7, -7.6), drive: v(-5.8, 6.9, 7.9), breadboard: v(2.4, 5.6, -3.2)
};
const dots = {};
host.querySelectorAll('[data-spot]').forEach(d => { dots[d.dataset.spot] = d; });

// highlight: tint emissive of a part group
let active = null, pulse = 0;
const saved = new Map();
function setActive(name) {
  if (active === name) return;
  // restore
  saved.forEach((val, mat) => { mat.emissive.setHex(val.e); mat.emissiveIntensity = val.i; }); saved.clear();
  active = name;
  document.querySelectorAll('[data-part]').forEach(el => el.classList.toggle('on', el.dataset.part === name));
  Object.entries(dots).forEach(([k, d]) => d.classList.toggle('on', k === name || (name === 'sonar' && k === 'sonar2')));
  if (!name || !parts[name]) return;
  parts[name].traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(mat => { if (mat.emissive && !saved.has(mat)) saved.set(mat, { e: mat.emissive.getHex(), i: mat.emissiveIntensity }); }); } });
}
document.querySelectorAll('[data-part]').forEach(el => {
  el.addEventListener('mouseenter', () => setActive(el.dataset.part));
  el.addEventListener('mouseleave', () => setActive(null));
  el.addEventListener('focus', () => setActive(el.dataset.part));
  el.addEventListener('blur', () => setActive(null));
  el.addEventListener('click', () => setActive(active === el.dataset.part ? null : el.dataset.part));
});
Object.entries(dots).forEach(([k, d]) => {
  const pk = k === 'sonar2' ? 'sonar' : k;
  d.addEventListener('mouseenter', () => setActive(pk)); d.addEventListener('mouseleave', () => setActive(null));
  d.addEventListener('click', () => setActive(active === pk ? null : pk));
});

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(2, 3.6, 0);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.enableZoom = false; controls.enablePan = false;
controls.minPolarAngle = .35; controls.maxPolarAngle = 1.38;
controls.autoRotate = !reduce; controls.autoRotateSpeed = -.9;
let idleT = 0;
controls.addEventListener('start', () => { controls.autoRotate = false; idleT = 0; host.classList.add('touched'); });
controls.addEventListener('end', () => { idleT = 0.001; });

// ---------- Resize + loop ----------
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.position.setLength(w < 520 ? 60 : 46);
  camera.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);

let visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);
const tmp = new THREE.Vector3(), clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, clock.getDelta());
  if (!visible) return;
  if (idleT > 0) { idleT += dt; if (idleT > 4 && !reduce) { controls.autoRotate = true; idleT = 0; } }
  controls.update();
  if (!reduce) wheels.forEach(w => { w.rotation.z -= dt * 1.2; });
  pulse += dt;
  glowLights.forEach((l, i) => { l.intensity = 16 + Math.sin(pulse * 3 + i) * 3; });
  if (active) { const k = .75 + .35 * Math.sin(pulse * 5); saved.forEach((_, mat) => { mat.emissive.setHex(0xb8442c); mat.emissiveIntensity = k; }); }
  renderer.render(scene, camera);
  const W = host.clientWidth, H = host.clientHeight;
  for (const [k, p] of Object.entries(spots)) {
    const d = dots[k]; if (!d) continue;
    tmp.copy(p).project(camera);
    d.style.transform = `translate(${(tmp.x * .5 + .5) * W}px, ${(-tmp.y * .5 + .5) * H}px)`;
  }
}
host.classList.add('ready');
frame();
