// Humming Letter — 작품을 3D로 '모델링'해서 보여 줌
// 작품 한 점 = 캔버스 상자(옆면 두께) + 물감 높낮이(변위·노멀 지도) 앞면 + 바람에 따로 흔들리는 꽃 층 + 떠오르는 흰 선(허밍 편지) 층
// + 벽에 비친 조명 웅덩이와 그림자. 색은 사진 그대로, 지도는 tools/humming-model/model.py 로 만듦.
import * as THREE from './vendor/three.module.js';

const M = 'assets/humming/m/';
export const G = { ok: false };
let renderer, scene, camera, light, amb, vw = 1, vh = 1, K = 1;
const E = {}; // id → 작품 모델
let used = new Set(), T = 0;
let shadowTex, poolTex;

export function init3D(canvas, dpr) {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.useLegacyLights = true;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100); camera.position.set(0, 0, 10);
  amb = new THREE.AmbientLight(0xffffff, 0.6); scene.add(amb);
  light = new THREE.DirectionalLight(0xfff3e2, 0.9); light.position.set(-0.6, 0.9, 1); scene.add(light);
  shadowTex = softRect(); poolTex = radial();
  resize3D();
  G.ok = true; return true;
}
export function resize3D() {
  if (!renderer) return;
  vw = innerWidth; vh = innerHeight;
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh; camera.updateProjectionMatrix();
  K = (2 * camera.position.z * Math.tan((camera.fov / 2) * Math.PI / 180)) / vh; // 화면 1px = 세계 몇 칸
}

function softRect() { // 그림 뒤 그림자(흐린 사각형)
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.filter = 'blur(10px)'; x.fillStyle = '#000'; x.fillRect(22, 22, 84, 84);
  if (x.filter === 'none' || !x.filter) { const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const t = new THREE.CanvasTexture(c); return t;
}
function radial() { // 벽에 비친 조명 웅덩이
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 118, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,244,226,.55)'); g.addColorStop(0.45, 'rgba(255,244,226,.16)'); g.addColorStop(1, 'rgba(255,244,226,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

const loader = new THREE.TextureLoader();
function tex(url, srgb) { const t = loader.load(url); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// 미리 받기(장이 가까워지면)
export function prefetch(id, small) {
  const key = id + (small ? '-s' : '');
  if (E[key] || !G.ok) return E[key];
  const e = E[key] = { id, small, ready: false, last: performance.now() };
  if (small) {
    e.map = loader.load('assets/humming/' + id + '-s.webp', (t) => { e.ready = true; e.aspect = t.image.width / t.image.height; e.avg = avgColor(t.image); });
    e.map.colorSpace = THREE.SRGBColorSpace;
  } else {
    e.map = loader.load(M + id + '-c.webp', (t) => { e.ready = true; e.aspect = t.image.width / t.image.height; e.avg = avgColor(t.image); });
    e.map.colorSpace = THREE.SRGBColorSpace; e.map.anisotropy = 4;
    e.nrm = tex(M + id + '-n.webp'); e.hgt = tex(M + id + '-h.webp'); e.flw = tex(M + id + '-f.webp'); e.lin = tex(M + id + '-l.webp');
  }
  return e;
}
function avgColor(im) {
  try { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return new THREE.Color(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear(); } catch (e) { return new THREE.Color(0.2, 0.2, 0.2); }
}

// 흔들림·물결·떠오름을 셰이더에 넣음
function patch(mat, kind, U) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform float uWave; uniform float uLift;\n' + sh.vertexShader.replace('#include <displacementmap_vertex>', `#include <displacementmap_vertex>
      ${kind === 'base' ? `
        float wm = smoothstep(0.6, 0.36, uv.y);
        transformed.z += uWave * 0.05 * sin(uv.x * 17.0 + uTime * 3.4 + uv.y * 9.0) * wm;
        transformed.x += uWave * 0.012 * sin(uv.y * 26.0 + uTime * 2.6) * wm;` : ''}
      ${kind === 'flower' ? `
        float fw = smoothstep(0.02, 0.85, uv.y) * (0.65 + 0.35 * sin(uTime * 2.3 + uv.x * 9.0));
        transformed.x += uWind * 0.045 * fw;
        transformed.z += (abs(uWind) * 0.05 + 0.004) * sin(uTime * 3.0 + uv.x * 14.0 + uv.y * 6.0) * fw;` : ''}
      ${kind === 'line' ? `
        transformed.z += uLift * (0.28 + 0.12 * sin(uv.x * 11.0 + uTime * 2.0 + uv.y * 5.0));
        transformed.y += uLift * 0.035 * sin(uv.x * 7.0 + uTime * 1.6);` : ''}`);
  };
}

function build(e, u0 = 0, u1 = 1) { // 작품(또는 3폭 중 한 폭) 하나 만들기
  const g = new THREE.Group();
  const span = u1 - u0;
  const sub = (t) => { if (span === 1 || !t) return t; const c = t.clone(); c.needsUpdate = true; c.repeat.set(span, 1); c.offset.set(u0, 0); c.wrapS = THREE.ClampToEdgeWrapping; return c; };
  const asp = e.aspect * span; // 폭/높이
  const sx = Math.min(200, Math.round(200 * Math.min(1, asp))), sy = Math.min(200, Math.round(200 / Math.max(1, asp)));
  const geo = new THREE.PlaneGeometry(1, 1, e.small ? 1 : sx, e.small ? 1 : sy);
  const U = { uTime: { value: 0 }, uWind: { value: 0 }, uWave: { value: 0 }, uLift: { value: 0 } };
  const base = new THREE.MeshStandardMaterial({ map: sub(e.map), roughness: 0.62, metalness: 0 });
  if (!e.small) Object.assign(base, { normalMap: sub(e.nrm), normalScale: new THREE.Vector2(1.15, 1.15), displacementMap: sub(e.hgt), displacementScale: 0.045 });
  patch(base, 'base', U);
  const front = new THREE.Mesh(geo, base); g.add(front);
  // 캔버스 상자(옆면): 작품 평균색을 어둡게
  const side = new THREE.MeshStandardMaterial({ color: (e.avg || new THREE.Color(0.2, 0.2, 0.2)).clone().multiplyScalar(0.55), roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), side); g.add(box);
  // 꽃 층·흰 선 층
  let fl = null, ln = null;
  if (!e.small) {
    const fm = new THREE.MeshStandardMaterial({ map: sub(e.map), alphaMap: sub(e.flw), transparent: true, depthWrite: false, normalMap: sub(e.nrm), displacementMap: sub(e.hgt), displacementScale: 0.06, roughness: 0.55 });
    patch(fm, 'flower', U); fl = new THREE.Mesh(geo, fm); fl.position.z = 0.02; fl.renderOrder = 2; g.add(fl);
    const lm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, alphaMap: sub(e.lin), transparent: true, depthWrite: false, displacementMap: sub(e.hgt), displacementScale: 0.05, roughness: 0.4 });
    patch(lm, 'line', U); ln = new THREE.Mesh(geo, lm); ln.position.z = 0.03; ln.renderOrder = 3; g.add(ln);
  }
  return { g, front, box, fl, ln, U, mats: [base, side, fl && fl.material, ln && ln.material].filter(Boolean), asp, geo };
}

function ensure(e, panels) {
  if (e.parts) return;
  e.root = new THREE.Group(); scene.add(e.root);
  // 벽의 조명 웅덩이·그림자(작품마다)
  e.pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  e.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 }));
  e.pool.renderOrder = -2; e.shadow.renderOrder = -1;
  scene.add(e.pool, e.shadow);
  e.parts = [];
  const n = panels || 1;
  for (let i = 0; i < n; i++) { const p = build(e, i / n, (i + 1) / n); e.root.add(p.g); e.parts.push(p); }
}

export function begin(t) { T = t; used = new Set(); }

// 작품 한 점을 화면 사각형(뷰포트 px)에 맞춰 놓음. 준비 안 됐으면 false(그럼 2D로 그림)
export function show(id, r, o = {}) {
  if (!G.ok) return false;
  const e = prefetch(id, o.small); e.last = performance.now();
  if (!e.ready) return false;
  ensure(e, o.panels);
  used.add(e);
  const a = o.a ?? 1, dim = o.dim ?? 1;
  const cx = (r.x + r.w / 2 - vw / 2) * K, cy = -(r.y + r.h / 2 - vh / 2) * K, W = r.w * K, H = r.h * K;
  const s = o.scale || 1, depth = Math.max(W, H) * (o.small ? 0.05 : 0.035);
  e.root.visible = true;
  e.root.position.set(cx, cy, o.z || 0);
  e.root.rotation.set(-(o.ty || 0) * 0.2, (o.tx || 0) * 0.28 + (o.ry || 0), 0);
  const n = e.parts.length, gap = n > 1 ? W * 0.008 : 0, pw = (W - gap * (n - 1)) / n;
  e.parts.forEach((p, i) => {
    const fold = n > 1 ? (i - (n - 1) / 2) * -0.17 : 0; // 3폭은 병풍처럼 살짝 접힘
    p.g.position.set(n > 1 ? -W / 2 + pw / 2 + i * (pw + gap) : 0, 0, n > 1 ? -Math.abs(i - 1) * pw * 0.06 : 0);
    p.g.rotation.y = fold;
    p.g.scale.set(pw * s, H * s, 1);
    p.box.scale.set(1.002, 1.002, depth); p.box.position.z = -depth / 2 - 0.002;
    p.U.uTime.value = T; p.U.uWind.value = o.wind || 0; p.U.uWave.value = o.wave || 0; p.U.uLift.value = o.lift || 0;
    p.mats.forEach((m) => { m.opacity = a; m.transparent = a < 0.999 || m === (p.fl && p.fl.material) || m === (p.ln && p.ln.material); });
    p.front.material.color.setScalar(dim); if (p.fl) p.fl.material.color.setScalar(dim);
    if (p.ln) { p.ln.visible = !o.noLines; p.ln.material.opacity = a * (o.lineA ?? 0.9); p.ln.material.emissiveIntensity = 0.45 + (o.lift || 0) * 0.8; }
  });
  // 벽: 그림 뒤 조명 웅덩이 + 빛 반대쪽으로 진 그림자
  const lx = light.position.x, ly = light.position.y;
  e.pool.visible = e.shadow.visible = true;
  e.pool.position.set(cx, cy + H * 0.08, -0.9 + (o.z || 0)); e.pool.scale.set(W * 2.4, H * 2.4, 1); e.pool.material.opacity = a * dim * (o.small ? 0.25 : 0.7);
  e.shadow.position.set(cx - lx * 0.12, cy - ly * 0.1 - H * 0.02, -0.5 + (o.z || 0)); e.shadow.scale.set(W * 1.25, H * 1.25, 1); e.shadow.material.opacity = a * 0.8;
  return true;
}

// 빛의 방향(기울기·마우스로)
export function setLight(tx, ty, warm = 0) {
  if (!G.ok) return;
  light.position.set(-0.55 + tx * 1.1, 0.85 - ty * 0.7, 1.0);
  light.intensity = 0.9 + warm * 0.5; amb.intensity = 0.6 - warm * 0.05;
}

export function end() {
  if (!G.ok) return;
  const now = performance.now();
  for (const k in E) {
    const e = E[k]; if (!e.root) continue;
    if (!used.has(e)) { e.root.visible = e.pool.visible = e.shadow.visible = false; if (now - e.last > 12000) dispose(k); }
  }
  renderer.render(scene, camera);
}
function dispose(k) { // 오래 안 쓴 작품은 메모리에서 내림
  const e = E[k]; if (!e) return;
  e.parts && e.parts.forEach((p) => { p.geo.dispose(); p.box.geometry.dispose(); p.mats.forEach((m) => { ['map', 'normalMap', 'displacementMap', 'alphaMap'].forEach((s) => m[s] && m[s] !== e.map && m[s].dispose()); m.dispose(); }); });
  [e.map, e.nrm, e.hgt, e.flw, e.lin].forEach((t) => t && t.dispose());
  if (e.root) scene.remove(e.root, e.pool, e.shadow);
  delete E[k];
}
