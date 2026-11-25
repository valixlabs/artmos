// c010 Humming Letter — 권지안 (ARTMOS 온라인 전시)
// 세로 스크롤 한 줄, 장마다 작품 한두 점과 체험 하나. 작품 사진 자체는 고치지 않고 위에 덮인 층(빛·꽃잎·선·안개)만 움직입니다.
import { IS_MOBILE, sensor, keepAwake } from './sensors.js?v=6';
import { voice, startVoice } from './humming-voice.js?v=1';
import { snd } from './humming-sound.js?v=1';

const PC = !IS_MOBILE;
const A = 'assets/humming/';
const IN_APP = (() => { try { return window.parent !== window && /[?&]app=1(?:&|$)/.test(location.search); } catch (e) { return false; } })();
if (IN_APP) try { sessionStorage.setItem('artmos-in-app', '1'); } catch (e) {}
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── 상태 표시줄 높이(앱 안 아이폰) — 빛쌀과 같은 방법
(function sat() {
  let top = 0;
  if (IN_APP && /iPhone/.test(navigator.userAgent)) top = screen.height >= 852 ? 59 : screen.height >= 812 ? 47 : 20;
  if (top) document.documentElement.style.setProperty('--sat', top + 'px');
  addEventListener('message', (e) => { if (e.data && e.data.type === 'artmos:safe' && e.data.top != null) { document.documentElement.style.setProperty('--sat', e.data.top + 'px'); try { readSat(); } catch (er) {} } });
})();

// ── 작품 14점
const W = (id, title, size, year) => ({ id, title, size, year, material: 'Mixed media on Canvas', img: A + id + '.webp', thumb: A + id + '-s.webp' });
const WORKS = [
  W('hl-01', 'Humming Letter #01', '146×112cm', 2022),
  W('hl-monet', 'Humming Letter with the Monet', '351×91cm (3폭)', 2023),
  W('hl-path', 'Humming Letter', '131×163cm', 2023),
  W('hl-lake', 'Humming Letter', '131×163cm', 2023),
  W('hl-red', 'Humming Letter', '91×63cm', 2023),
  W('hl-garden', 'Humming Letter', '91×63cm', 2023),
  W('hl-sun', 'Humming Letter', '117×91cm', 2023),
  W('hl-amber', 'Humming Letter', '131×163cm', 2023),
  W('hl-pink', 'Humming Letter', '131×163cm', 2023),
  W('hl-blue', 'Humming Letter', '91×63cm', 2023),
  W('hl-vase', 'Humming Letter', '91×63cm', 2023),
  W('hl-pale', 'Humming Letter', '91×73cm', 2023),
  W('hl-03', 'Humming Letter #03', '146×112cm', 2022),
  W('hl-tide', 'Humming Letter', '91×63cm', 2023),
];
const WK = Object.fromEntries(WORKS.map((w) => [w.id, w]));

// 그림 불러오기 + 색 뽑기(꽃잎 색)
const IMG = {}, PAL = {};
function img(id, small) {
  const key = id + (small ? '-s' : '');
  if (IMG[key]) return IMG[key];
  const im = new Image(); im.decoding = 'async'; im.src = small ? WK[id].thumb : WK[id].img;
  im.onload = () => { im._ok = true; if (!PAL[id]) PAL[id] = palette(im); };
  return (IMG[key] = im);
}
function palette(im) {
  try {
    const c = document.createElement('canvas'); c.width = 24; c.height = 24;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 24, 24);
    const d = x.getImageData(0, 0, 24, 24).data, out = [];
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], s = Math.max(r, g, b) - Math.min(r, g, b); if (s > 40 || r + g + b > 600) out.push(`rgb(${r},${g},${b})`); }
    return out.length ? out : ['#fff'];
  } catch (e) { return ['#f4d', '#fe8', '#fff']; }
}
const pal = (id) => (PAL[id] && PAL[id].length ? PAL[id][Math.floor(Math.random() * PAL[id].length)] : '#fff');

// ── 장 구성 (작가 노트의 흐름: 지침 → 정원 → 천국 → 바람 → 손가락 → 리듬 → 아버지의 꽃 → 보통의 포착 → 허밍 편지 → 꽃밭 위에 허밍)
const CH = [];
const def = (o) => CH.push(Object.assign({ len: 300, grab: true }, o));

// 공용 그리기
function fit(im, box, cover) {
  const iw = im.naturalWidth || 1, ih = im.naturalHeight || 1, s = cover ? Math.max(box.w / iw, box.h / ih) : Math.min(box.w / iw, box.h / ih);
  const w = iw * s, h = ih * s; return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
function artBox(c) { // 작품을 둘 자리(아래 글·버튼 자리를 남김)
  const { W: w, H: h } = c;
  if (w > h * 1.1) return { x: w * 0.08, y: h * 0.13, w: w * 0.84, h: h * 0.62 };
  return { x: w * 0.06, y: h * 0.15 + topPad(), w: w * 0.88, h: h * 0.53 - topPad() };
}
let SAT = 0; const topPad = () => SAT; const readSat = () => { SAT = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0; };
function drawImg(x, im, r, a = 1) { if (!im._ok) return; x.globalAlpha = a; x.drawImage(im, r.x, r.y, r.w, r.h); x.globalAlpha = 1; }
function shadowFrame(x, r) { x.save(); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 30; x.fillStyle = '#000'; x.fillRect(r.x, r.y, r.w, r.h); x.restore(); }
// 작품을 가로 띠로 나눠 그리며 띠마다 조금씩 옆으로 — 바람·물결(몇 px만)
function drawStrips(x, im, r, off, n = 28) {
  if (!im._ok) return; const iw = im.naturalWidth, ih = im.naturalHeight;
  for (let i = 0; i < n; i++) {
    const y0 = (i / n) * ih, y1 = ((i + 1) / n) * ih, f = (i + 0.5) / n;
    x.drawImage(im, 0, y0, iw, y1 - y0 + 1, r.x + off(f), r.y + (i / n) * r.h, r.w, r.h / n + 1);
  }
}
function particles(x, list, dt, draw) {
  for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.t += dt; if (p.t > p.life) { list.splice(i, 1); continue; } draw(p); }
}
const inR = (r, px, py, pad = 0) => px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;

// ── 1. 블루, 지친 날 — #01: 어두운 파랑 막에 금이 가 있고, 문지르면 틈이 열려 그림이 드러남
def({
  k: 'tired', works: ['hl-01'], title: '블루, 지친 날',
  story: ['다섯 번째 셀프 콜라보레이션 ‘블루’를 끝낸 뒤, 작가는 지쳐 있었습니다.', '무언가를 비우려 애쓸수록, 진짜 쉼이 그리웠습니다.'],
  hint: '어두운 막을 손끝으로 문질러 틈을 열어 보세요', hintPc: '마우스로 문질러 틈을 열어 보세요',
  setup(c) {
    c.open = 0; c.cracks = []; let seed = 3;
    const R = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 16; k++) { let px = R(), py = R(), a = R() * 6.28; const pts = [[px, py]]; for (let s = 0; s < 9; s++) { a += (R() - 0.5) * 1.3; px = clamp(px + Math.cos(a) * 0.07, 0.02, 0.98); py = clamp(py + Math.sin(a) * 0.07, 0.02, 0.98); pts.push([px, py]); } c.cracks.push(pts); }
    c.mask = document.createElement('canvas'); c.rubs = []; c.done = false;
  },
  frame(c, dt) {
    const x = c.x, im = img('hl-01'), r = fit(im, artBox(c)); c.r = r;
    if (!c.mask.width || c.mask._w !== Math.round(r.w)) { c.mask.width = Math.round(r.w / 2); c.mask.height = Math.round(r.h / 2); c.mask._w = Math.round(r.w); c.dirty = true; }
    shadowFrame(x, r); drawImg(x, im, r, c.artA);
    if (c.play && !c.done) { const add = dt * 0.015; c.open = clamp(c.open + add); c.dirty = true; }
    if (c.dirty) { // 막 다시 그리기
      const m = c.mask.getContext('2d'), mw = c.mask.width, mh = c.mask.height;
      m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, mw, mh);
      const g = m.createLinearGradient(0, 0, mw, mh); g.addColorStop(0, '#0a1a3d'); g.addColorStop(1, '#06102a'); m.fillStyle = g; m.fillRect(0, 0, mw, mh);
      m.globalCompositeOperation = 'destination-out'; m.lineCap = 'round'; m.lineJoin = 'round';
      m.lineWidth = 1 + c.open * mw * 0.09; m.strokeStyle = '#000';
      c.cracks.forEach((pts) => { m.beginPath(); pts.forEach(([u, v], i) => (i ? m.lineTo(u * mw, v * mh) : m.moveTo(u * mw, v * mh))); m.stroke(); });
      c.rubs.forEach(([u, v, s]) => { const gr = m.createRadialGradient(u * mw, v * mh, 0, u * mw, v * mh, s * mw); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = gr; m.fillRect(u * mw - s * mw, v * mh - s * mw, s * mw * 2, s * mw * 2); });
      c.dirty = false;
    }
    const cov = c.done ? Math.max(0, 1 - (c.t - c.doneAt) / 1.6) : 1;
    if (cov > 0) {
      x.globalAlpha = cov; x.drawImage(c.mask, r.x, r.y, r.w, r.h);
      // 틈으로 새는 빛
      x.globalCompositeOperation = 'lighter'; x.strokeStyle = `rgba(255,214,150,${0.25 + c.open * 0.35})`; x.lineWidth = 1.2 + c.open * 3; x.shadowColor = '#ffd79a'; x.shadowBlur = 12;
      c.cracks.forEach((pts) => { x.beginPath(); pts.forEach(([u, v], i) => (i ? x.lineTo(r.x + u * r.w, r.y + v * r.h) : x.moveTo(r.x + u * r.w, r.y + v * r.h))); x.stroke(); });
      x.shadowBlur = 0; x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    }
    if (!c.done && c.open >= 1) { c.done = true; c.doneAt = c.t; snd.chime(77); meter(c, '틈이 열렸어요. 쉼이 들어올 자리'); }
    else if (!c.done) meter(c, `열린 틈 ${Math.round(c.open * 100)}%`);
  },
  move(c, px, py, d) {
    if (!c.r || c.done || !inR(c.r, px, py)) return;
    c.rubs.push([(px - c.r.x) / c.r.w, (py - c.r.y) / c.r.h, 0.05]); if (c.rubs.length > 400) c.rubs.shift();
    c.open = clamp(c.open + d / 2600); c.dirty = true; snd.rustle(Math.min(1, d / 30));
    if (Math.random() < 0.04) snd.crack();
  },
});

// ── 2. 정원을 걷다 — 3폭 모네: 몸을 돌리거나 기울여 연못을 따라 걷고, 수면을 톡
def({
  k: 'garden', works: ['hl-monet'], title: '정원을 걷다',
  story: ['2018년, 환경을 바꾸려 떠난 유럽 여행.', '우연히 프랑스 지베르니, 모네의 정원에 닿았습니다. 그림으로만 보던 곳이었습니다.'],
  hint: '몸을 돌리거나 좌우로 기울여 연못을 따라 걸어요 · 수면을 톡', hintPc: '끌어서 연못을 따라 걸어요 · 수면을 눌러 물결을',
  setup(c) { c.pan = 0; c.v = 0; c.rip = []; c.seen = new Array(24).fill(0); c.h0 = null; c.done = false; },
  frame(c, dt) {
    const x = c.x, im = img('hl-monet'); if (!im._ok) return;
    const box = artBox(c), ratio = im.naturalWidth / im.naturalHeight;
    let h = Math.min(box.h * 0.95, c.H * 0.46), w = h * ratio;
    if (w < box.w) { w = box.w; h = w / ratio; }
    const range = Math.max(0, w - c.W);
    // 움직임: 기울기·나침반·끌기
    if (c.play && sensor.on) {
      c.v += sensor.tiltX * 900 * dt;
      if (sensor.heading != null) { if (c.h0 == null) c.h0 = sensor.heading; let dh = sensor.heading - c.h0; dh = ((dh + 540) % 360) - 180; c.v += dh * 18; c.h0 = sensor.heading; }
    }
    c.pan = clamp(c.pan + c.v * dt, 0, range); c.v *= Math.pow(0.04, dt);
    const r = { x: range ? -c.pan : (c.W - w) / 2, y: box.y + (box.h - h) / 2, w, h }; c.r = r;
    shadowFrame(x, r); drawImg(x, im, r, c.artA);
    // 걸어 본 곳
    for (let i = 0; i < 24; i++) { const sx = r.x + (i + 0.5) / 24 * w; if (sx > 0 && sx < c.W) c.seen[i] = 1; }
    // 물결
    particles(x, c.rip, dt, (p) => {
      const k = p.t / p.life, rad = 8 + k * 90;
      x.strokeStyle = `rgba(255,255,255,${0.55 * (1 - k)})`; x.lineWidth = 1.6;
      for (let j = 0; j < 3; j++) { const rr = rad - j * 16; if (rr <= 2) continue; x.beginPath(); x.ellipse(p.x + r.x, p.y, rr, rr * 0.32, 0, 0, 6.283); x.stroke(); }
    });
    // 아래 작은 지도(지금 보는 자리)
    if (range) { const mw = Math.min(160, c.W * 0.4), mx = (c.W - mw) / 2, my = r.y + h + 14; x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(mx, my, mw, 3); x.fillStyle = '#fff'; x.fillRect(mx + (c.pan / w) * mw, my, (c.W / w) * mw, 3); }
    const pct = Math.round((c.seen.reduce((a, b) => a + b, 0) / 24) * 100);
    if (!c.done && pct >= 100 && c.play) { c.done = true; snd.chime(79); meter(c, '연못을 끝까지 걸었어요. 351cm의 정원'); }
    else if (!c.done) meter(c, `걸어 본 연못 ${pct}%`);
  },
  down(c, px, py) { c.dx = px; c.moved = 0; },
  move(c, px, py, d, dx) { c.moved += d; c.pan = clamp(c.pan - dx, 0, 1e9); },
  up(c, px, py) { if (c.moved < 10 && c.r && inR(c.r, px, py)) { c.rip.push({ x: px - c.r.x, y: py, t: 0, life: 2.2 }); snd.drop(); sensor.vibrate(8); } },
});

// ── 3. 천국 그 자체 — 꽃나무 물길 → 호수: 꾹 누르면 향기가 피어오르고, 기울이면 빛이 움직임
def({
  k: 'heaven', works: ['hl-path', 'hl-lake'], title: '천국 그 자체',
  story: ['실제로 본 그 광경은 천국 그 자체였습니다.', '돌아와서 남은 것은 자연의 향기, 그리고 그 평온함을 가끔 흩뜨리며 춤추는 바람.'],
  hint: '꾹 누르고 있으면 향기가 피어올라요 · 기울이면 빛이 움직여요', hintPc: '꾹 누르고 있으면 향기가 피어올라요 · 마우스로 빛을 움직여요',
  setup(c) { c.par = []; c.scent = 0; c.hold = null; c.lx = 0; c.done = false; },
  frame(c, dt) {
    const x = c.x, a = img('hl-path'), b = img('hl-lake'), mix = smooth(0.55, 0.68, c.p);
    const lt = PC ? (c.mx != null ? (c.mx / c.W - 0.5) * 2 : 0) : sensor.tiltX;
    c.lx += (lt - c.lx) * Math.min(1, dt * 4);
    const box = artBox(c), r = fit(a._ok ? a : b, box), r2 = fit(b._ok ? b : a, box);
    const sh = c.lx * 10; c.r = mix < 0.5 ? r : r2;
    shadowFrame(x, c.r);
    if (mix < 1) drawImg(x, a, { ...r, x: r.x + sh }, c.artA * (1 - mix));
    if (mix > 0) drawImg(x, b, { ...r2, x: r2.x + sh }, c.artA * mix);
    // 빛줄기(그림 안에서만)
    x.save(); x.beginPath(); x.rect(c.r.x, c.r.y, c.r.w, c.r.h); x.clip(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const cx = c.W * (0.2 + i * 0.22) + c.lx * c.W * 0.25, top = c.r.y - 40, w0 = 30 + i * 14;
      const g = x.createLinearGradient(0, top, 0, c.r.y + c.r.h); g.addColorStop(0, 'rgba(255,246,220,.16)'); g.addColorStop(1, 'rgba(255,246,220,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx - w0 / 2, top); x.lineTo(cx + w0 / 2, top); x.lineTo(cx + w0 * 2 + c.lx * 120, c.r.y + c.r.h); x.lineTo(cx - w0 + c.lx * 120, c.r.y + c.r.h); x.fill();
    }
    x.restore();
    // 향기
    if (c.hold && c.play) {
      c.hold.t += dt; const n = Math.min(4, 1 + c.hold.t * 2);
      for (let i = 0; i < n; i++) c.par.push({ x: c.hold.x + rnd(-14, 14), y: c.hold.y, vx: rnd(-20, 20), vy: rnd(-70, -30), s: rnd(2, 5), col: pal(mix < 0.5 ? 'hl-path' : 'hl-lake'), t: 0, life: rnd(1.6, 3) });
      if (!c.done) c.scent = clamp(c.scent + dt / 7);
      snd.wind(0.12);
    } else snd.wind(0);
    x.save(); x.globalCompositeOperation = 'lighter';
    particles(x, c.par, dt, (p) => { p.x += (p.vx + Math.sin(p.t * 3 + p.s) * 20) * dt; p.y += p.vy * dt; const k = p.t / p.life; x.globalAlpha = (1 - k) * 0.85; x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.s * (1 + k), 0, 6.283); x.fill(); });
    x.restore(); x.globalAlpha = 1;
    if (!c.done && c.scent >= 1) { c.done = true; snd.bloom(true); meter(c, '향기가 오래 남았어요'); } else if (!c.done) meter(c, `향기 ${Math.round(c.scent * 100)}%`);
  },
  down(c, px, py) { c.hold = { x: px, y: py, t: 0 }; },
  move(c, px, py) { if (c.hold) { c.hold.x = px; c.hold.y = py; } },
  up(c) { c.hold = null; },
  hover(c, px) { c.mx = px; },
});

// ── 4. 바람의 춤 — 붉은 꽃밭 → 초록 들: 기울이면 바람, 흔들면 돌풍, 후~ 불어도, 쓸어도
def({
  k: 'wind', works: ['hl-red', 'hl-garden'], title: '바람의 춤',
  story: ['평온함을 흩뜨리는 바람이 불면', '작가의 손은 그 바람을 따라 춤을 춥니다.'],
  hint: '기울이면 바람이 불어요 · 흔들면 돌풍 · 후~ 불어도 돼요', hintPc: '옆으로 쓸어 바람을 보내요 · 마이크가 있으면 후~',
  setup(c) { c.wind = 0; c.gust = 0; c.pet = []; c.count = 0; c.done = false; sensor.onShake(() => { if (c.play && cur === c) { c.gust = (Math.random() < 0.5 ? -1 : 1) * 1.4; c.count++; } }); },
  frame(c, dt) {
    const x = c.x, a = img('hl-red'), b = img('hl-garden'), mix = smooth(0.58, 0.7, c.p), id = mix < 0.5 ? 'hl-red' : 'hl-garden';
    const box = artBox(c), ra = fit(a, box), rb = fit(b, box); c.r = mix < 0.5 ? ra : rb;
    let tgt = (c.play ? (PC ? 0 : sensor.tiltX * 0.9) : 0) + c.gust;
    if (c.play && voice.blow > 0.3) { tgt += voice.blow * 1.2; if (!c._bl) { c._bl = 1; c.count++; } } else c._bl = 0;
    c.wind += (tgt - c.wind) * Math.min(1, dt * 3); c.gust *= Math.pow(0.25, dt);
    const amp = Math.min(7, c.W * 0.018), t = c.t, wv = c.wind;
    const off = (f) => wv * amp * Math.sin(f * Math.PI) * (0.6 + 0.4 * Math.sin(t * 2.3 + f * 6));
    shadowFrame(x, c.r);
    x.globalAlpha = c.artA * (1 - mix); if (mix < 1) drawStrips(x, a, ra, off);
    x.globalAlpha = c.artA * mix; if (mix > 0) drawStrips(x, b, rb, off); x.globalAlpha = 1;
    // 꽃잎
    const n = Math.abs(c.wind) * 60 * dt + (c.play ? 0.3 * dt * 10 : 0);
    for (let i = 0; i < n; i++) { if (c.pet.length > 260) break; c.pet.push({ x: c.r.x + rnd(c.r.w), y: c.r.y + c.r.h * rnd(0.25, 0.95), vx: 0, vy: rnd(-10, 10), s: rnd(2.5, 6), a: rnd(6.28), col: pal(id), t: 0, life: rnd(2, 4) }); }
    particles(x, c.pet, dt, (p) => {
      p.vx += (c.wind * 260 - p.vx) * dt * 1.5; p.vy += (Math.sin(p.t * 4 + p.a) * 40 - 8) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * (2 + Math.abs(p.vx) / 60);
      const k = p.t / p.life; x.globalAlpha = (1 - k * k) * 0.95; x.fillStyle = p.col;
      x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.beginPath(); x.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, 6.283); x.fill(); x.restore();
    });
    x.globalAlpha = 1;
    snd.wind(c.play ? Math.min(1, Math.abs(c.wind)) : 0);
    if (!c.done && c.count >= 6) { c.done = true; snd.chime(76); meter(c, '바람과 함께 춤췄어요'); } else if (!c.done) meter(c, `지나간 바람 ${c.count} / 6`);
  },
  down(c, px) { c.sx = px; c.st = performance.now(); },
  move(c, px, py, d, dx) { c.wind = clamp(c.wind + dx / 120, -2, 2); },
  up(c, px) { const dx = px - (c.sx ?? px), ms = performance.now() - (c.st || 0); if (Math.abs(dx) > 60 && ms < 600) { c.gust = Math.sign(dx) * 1.3; c.count++; } },
});

// ── 5. 손가락으로 — 해바라기: 바닥에 깔고(평평하게), 마르기 전 40초 안에 문질러 그림을 드러냄
const DRY = 40;
def({
  k: 'finger', works: ['hl-sun'], title: '손가락으로',
  story: ['캔버스를 바닥에 깔고, 손이 가는 대로 물감을 뿌리고, 나만의 리듬에 몸을 맡깁니다.', '붓 대신 손가락. 재료가 마르기 전에, 흔들리는 순간을 한 번에 그려 내야 합니다.'],
  hint: '휴대폰을 탁자에 평평하게 내려놓고 문질러 보세요 · 40초 안에', hintPc: '마우스로 문질러 그림을 드러내요 · 물감이 마르기 전 40초 안에',
  ui: (c) => `<button class="hl-btn" data-act="start">${PC ? '시작' : '바닥에 깔았어요'}</button><button class="hl-btn line" data-act="again" hidden>다시</button>`,
  setup(c) { c.state = 'wait'; c.left = DRY; c.flat = 0; c.cov = document.createElement('canvas'); c.pct = 0; c.trail = []; },
  reset(c) { c.state = 'wait'; c.left = DRY; c.cov._w = 0; c.pct = 0; c.trail = []; c.ui.querySelector('[data-act=again]').hidden = true; c.ui.querySelector('[data-act=start]').hidden = false; },
  act(c, a) { if (a === 'start') this.begin(c); if (a === 'again') this.reset(c); },
  begin(c) { if (c.state !== 'wait') return; c.state = 'paint'; c.left = DRY; snd.chime(72, 0.7); sensor.vibrate(20); c.ui.querySelector('[data-act=start]').hidden = true; },
  frame(c, dt) {
    const x = c.x, im = img('hl-sun'), r = fit(im, artBox(c)); c.r = r;
    if (c.cov._w !== Math.round(r.w)) { // 흰 물감 막
      c.cov.width = Math.round(r.w); c.cov.height = Math.round(r.h); c.cov._w = Math.round(r.w);
      const m = c.cov.getContext('2d', { willReadFrequently: true }); m.fillStyle = '#efe9de'; m.fillRect(0, 0, c.cov.width, c.cov.height);
      for (let i = 0; i < 900; i++) { m.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '190,180,165'},${rnd(0.05, 0.18)})`; m.beginPath(); m.ellipse(rnd(c.cov.width), rnd(c.cov.height), rnd(4, 18), rnd(1, 4), rnd(3.14), 0, 6.283); m.fill(); }
    }
    shadowFrame(x, r); drawImg(x, im, r, c.artA); x.drawImage(c.cov, r.x, r.y, r.w, r.h);
    // 손가락 결(흰 하이라이트, 마르면 굳음)
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1.2; x.lineCap = 'round';
    c.trail.forEach((s) => { x.beginPath(); x.moveTo(r.x + s[0] * r.w, r.y + s[1] * r.h); x.lineTo(r.x + s[2] * r.w, r.y + s[3] * r.h); x.stroke(); });
    if (c.state === 'wait' && c.play && sensor.on) { // 평평하게 놓였나
      const flat = sensor.tiltY < -0.72 && Math.abs(sensor.tiltX) < 0.2 && !sensor.faceDown;
      c.flat = flat ? c.flat + dt : 0; if (c.flat > 1.2) this.begin(c);
    }
    if (c.state === 'paint') {
      c.left -= dt;
      if ((c._pc = (c._pc || 0) + dt) > 0.4) { c._pc = 0; c.pct = coverPct(c.cov); }
      if (c.left <= 0) { c.state = 'dry'; c.pct = coverPct(c.cov); snd.chime(69); c.ui.querySelector('[data-act=again]').hidden = false; }
      // 마르는 동안 막이 조금씩 누렇게
      x.fillStyle = `rgba(120,95,40,${(1 - c.left / DRY) * 0.06})`; x.fillRect(r.x, r.y, r.w, r.h);
    }
    meter(c, c.state === 'wait' ? (PC ? '시작을 누르거나 바로 문질러 보세요' : sensor.on ? `탁자에 평평하게 내려놓으면 시작해요${c.flat ? ' …' : ''}` : '‘바닥에 깔았어요’를 누르거나 바로 문질러 보세요')
      : c.state === 'paint' ? `마르기까지 ${Math.ceil(c.left)}초 · 드러난 그림 ${c.pct}%` : `물감이 말랐어요. 당신의 손이 드러낸 해바라기 ${c.pct}%`);
  },
  move(c, px, py, d, dx, dy) {
    if (!c.r || !inR(c.r, px, py) || c.state === 'dry') return;
    if (c.state === 'wait') this.begin(c);
    const m = c.cov.getContext('2d'), u = px - c.r.x, v = py - c.r.y, rad = Math.max(14, c.r.w * 0.045);
    m.globalCompositeOperation = 'destination-out';
    const g = m.createRadialGradient(u, v, 0, u, v, rad); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(0.7, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g; m.fillRect(u - rad, v - rad, rad * 2, rad * 2); m.globalCompositeOperation = 'source-over';
    if (d > 2 && c.trail.length < 1500) for (let k = -1; k <= 1; k++) c.trail.push([(u - dx + k * 5) / c.r.w, (v - dy + k * 4) / c.r.h, (u + k * 5) / c.r.w, (v + k * 4) / c.r.h]);
    snd.rustle(Math.min(1, d / 25));
  },
});
function coverPct(cv) { // 드러난 비율
  try { const m = cv.getContext('2d'), w = cv.width, h = cv.height, d = m.getImageData(0, 0, w, h).data; let o = 0, n = 0; const st = Math.max(1, Math.floor(w / 40)); for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st) { n++; if (d[(y * w + x) * 4 + 3] < 128) o++; } return Math.round((o / n) * 100); } catch (e) { return 0; }
}

// ── 6. 나만의 리듬 — 주황 결 → 분홍 꽃줄기: 박자에 맞춰 두드리면 결이 울리고, 일정하면 그림이 춤춤
def({
  k: 'rhythm', works: ['hl-amber', 'hl-pink'], title: '나만의 리듬',
  story: ['음악에서 시작한 작가.', '바람과 꽃의 풍경을 리듬과 허밍에 빗대어, 손으로 자유롭게 그립니다.'],
  hint: '박자에 맞춰 톡톡 두드려 보세요 · 일정하면 그림이 춤춰요', hintPc: '클릭이나 스페이스바로 박자를 두드려 보세요',
  setup(c) { c.taps = []; c.bands = []; c.pulse = 0; c.bpm = 0; c.auto = 0; c.next = 0; c.bur = []; c.done = false; sensor.onShake(() => { if (c.play && cur === c) this.tap(c); }); },
  tap(c, px, py, auto) {
    const now = c.t; c.pulse = 1; snd.beat(auto ? 0.7 : 1); sensor.vibrate(10);
    const r = c.r || { x: 0, y: 0, w: c.W, h: c.H };
    c.bands.push({ y: py != null ? py : r.y + rnd(r.h), t: 0, life: 1.1 });
    const id = c.p > 0.64 ? 'hl-pink' : 'hl-amber';
    for (let i = 0; i < 18; i++) c.bur.push({ x: px != null ? px : r.x + rnd(r.w), y: py != null ? py : r.y + rnd(r.h * 0.6), vx: rnd(-120, 120), vy: rnd(-160, -20), s: rnd(2, 5), col: pal(id), t: 0, life: rnd(0.8, 1.6) });
    if (auto) return;
    c.taps.push(now); if (c.taps.length > 6) c.taps.shift();
    if (c.taps.length >= 5) {
      const iv = []; for (let i = 1; i < c.taps.length; i++) iv.push(c.taps[i] - c.taps[i - 1]);
      const mean = iv.reduce((a, b) => a + b, 0) / iv.length, sd = Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length);
      if (sd / mean < 0.14 && mean > 0.28 && mean < 1.3) { c.bpm = Math.round(60 / mean); c.auto = 8; c.next = now + mean; c.iv = mean; if (!c.done) { c.done = true; snd.chime(74); } }
    }
  },
  frame(c, dt) {
    const x = c.x, a = img('hl-amber'), b = img('hl-pink'), mix = smooth(0.58, 0.7, c.p);
    const box = artBox(c), ra = fit(a, box), rb = fit(b, box); c.r = mix < 0.5 ? ra : rb;
    if (c.auto > 0 && c.t >= c.next) { c.auto--; c.next += c.iv; this.tap(c, null, null, true); }
    c.pulse *= Math.pow(0.02, dt);
    const s = 1 + c.pulse * 0.014, sc = (r) => ({ x: r.x - (r.w * (s - 1)) / 2, y: r.y - (r.h * (s - 1)) / 2, w: r.w * s, h: r.h * s });
    shadowFrame(x, c.r);
    if (mix < 1) drawImg(x, a, sc(ra), c.artA * (1 - mix));
    if (mix > 0) drawImg(x, b, sc(rb), c.artA * mix);
    x.save(); x.globalCompositeOperation = 'lighter';
    particles(x, c.bands, dt, (p) => { const k = p.t / p.life, w = c.r.w * Math.min(1, k * 2.2); const g = x.createLinearGradient(0, p.y - 10, 0, p.y + 10); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.5, `rgba(255,240,210,${0.5 * (1 - k)})`); g.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = g; x.fillRect(c.r.x + (c.r.w - w) / 2, p.y - 10, w, 20); });
    particles(x, c.bur, dt, (p) => { p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt; x.globalAlpha = 1 - p.t / p.life; x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.s, 0, 6.283); x.fill(); });
    x.restore(); x.globalAlpha = 1;
    meter(c, c.bpm ? `리듬을 찾았어요 · ${c.bpm} BPM${c.auto > 0 ? ' · 그림이 춤추는 중' : ''}` : `두드린 박자 ${c.taps.length} · 고르게 다섯 번`);
  },
  up(c, px, py) { if (c.r && inR(c.r, px, py, 20) && !c._dragged) this.tap(c, px, py); c._dragged = false; },
  move(c, px, py, d) { if (d > 12) c._dragged = true; },
  key(c, e) { if (e.code === 'Space') { e.preventDefault(); this.tap(c); } },
});

// ── 7. 꽃은 항상 그 자리에 — 파란 물결 → 화분의 꽃: 흔들어도 꽃은 그 자리에 / 한 줄 적으면 꽃 한 송이
const PLANTED = [];
def({
  k: 'always', works: ['hl-blue', 'hl-vase'], title: '꽃은 항상 그 자리에', len: 380,
  story: ['작가의 아버지는 친구들보다 꽃을 더 좋아하셨습니다.', '“아빠, 꽃이 왜 좋아?”<br>“꽃은 항상 그 자리에 있잖아.”', '변하는 것투성이인 세상에 변하지 않는 것도 있다는, 든든하고 친절한 대답이었습니다.'],
  story2: ['풍경에 빠져 화사한 천국을 그려, 꽃을 사랑한 아버지에게 보여 주고 싶었습니다.', '아버지는 그 그림을 보지 못하고 떠나셨고, 작가는 한동안 풍경을 그리지 않았습니다. 지금에서야, 다시 풍경이 그리고 싶어졌습니다.'],
  hint: '흔들어 보세요. 물결은 출렁여도 꽃은 그 자리에 있어요', hintPc: '그림 위를 이리저리 끌어 보세요. 물결은 출렁여도 꽃은 그 자리에',
  hint2: '당신에게 항상 그 자리에 있는 것은 무엇인가요?',
  ui: () => `<form class="hl-plant" hidden><input maxlength="20" placeholder="예: 엄마의 목소리" aria-label="항상 그 자리에 있는 것"><button class="hl-btn">꽃 심기</button></form>`,
  setup(c) {
    c.wave = 0; c.flw = [];
    sensor.onShake((v) => { if (c.play && cur === c) c.wave = Math.min(1.6, c.wave + 0.6 + v); });
    const f = c.ui.querySelector('form');
    f.addEventListener('submit', (e) => { e.preventDefault(); const i = f.querySelector('input'), v = i.value.trim(); if (!v) return; i.value = ''; i.blur(); this.plant(c, v); });
  },
  plant(c, text) {
    PLANTED.push(text); if (PLANTED.length > 6) PLANTED.shift();
    c.flw.push({ text, u: 0.12 + ((c.flw.length * 0.37) % 0.76), t: 0, col: ['#e8304a', '#f05a78', '#ff8aa0', '#d81e3c'][c.flw.length % 4] });
    if (c.flw.length > 6) c.flw.shift();
    snd.bloom(); sensor.vibrate(15);
  },
  frame(c, dt) {
    const x = c.x, a = img('hl-blue'), b = img('hl-vase'), mix = smooth(0.5, 0.6, c.p);
    const box = artBox(c), ra = fit(a, box), rb = fit(b, box); c.r = mix < 0.5 ? ra : rb;
    // 2부 글·입력칸
    const two = c.p > 0.55; if (two !== c._two) { c._two = two; c.ui.querySelector('form').hidden = !two; c.el.querySelector('.hl-hint').textContent = two ? this.hint2 : PC ? this.hintPc : this.hint; c.el.classList.toggle('two', two); }
    if (c.play && !PC) c.wave = Math.min(1.6, c.wave + Math.abs(sensor.tiltX - (c._tx ?? sensor.tiltX)) * 3); c._tx = sensor.tiltX;
    c.wave *= Math.pow(0.35, dt);
    const t = c.t, wv = c.wave;
    shadowFrame(x, c.r);
    if (mix < 1) { x.globalAlpha = c.artA * (1 - mix); drawStrips(x, a, ra, (f) => (f < 0.42 ? 0 : wv * 9 * Math.sin(f * 22 - t * 5) * smooth(0.42, 0.6, f)), 36); x.globalAlpha = 1; }
    if (mix > 0) drawImg(x, b, rb, c.artA * mix);
    if (mix < 0.5 && c.play && wv > 0.3) { x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 13px Pretendard, sans-serif'; x.textAlign = 'center'; x.globalAlpha = Math.min(1, wv); x.fillText('꽃은 그대로예요', ra.x + ra.w / 2, ra.y + ra.h * 0.2); x.globalAlpha = 1; }
    // 심은 꽃
    if (mix > 0.5) c.flw.forEach((f) => {
      f.t += dt; const g = smooth(0, 1.2, f.t), bx = rb.x + rb.w * f.u, by = rb.y + rb.h * 0.97, top = by - rb.h * (0.16 + 0.05 * Math.sin(f.u * 9)) * g;
      x.strokeStyle = '#3e8f6a'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + 6, (by + top) / 2, bx + Math.sin(t * 1.4 + f.u * 5) * 3, top); x.stroke();
      const hx = bx + Math.sin(t * 1.4 + f.u * 5) * 3; x.fillStyle = f.col; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(hx + Math.cos(i) * 5 * g, top + Math.sin(i) * 5 * g, 5 * g, 0, 6.283); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.92)'; x.font = '500 11px Pretendard, sans-serif'; x.textAlign = 'center'; x.globalAlpha = smooth(0.8, 1.6, f.t); x.fillText(f.text, hx, top - 12); x.globalAlpha = 1;
    });
    meter(c, mix < 0.5 ? (wv > 0.2 ? '물결이 출렁여요. 꽃은 그 자리에' : '흔들어 보세요') : c.flw.length ? `심은 꽃 ${c.flw.length}송이 · 이 화면에만 남아요` : '적은 한 줄은 이 기기 밖으로 나가지 않아요');
  },
  move(c, px, py, d) { if (c.p <= 0.5) c.wave = Math.min(1.6, c.wave + d / 200); },
});

// ── 8. 보통의 포착 — 옅은 꽃밭: 3초 가만히 있으면 안개가 걷히고 '오늘'이 찍힘
def({
  k: 'ordinary', works: ['hl-pale'], title: '보통의 포착',
  story: ['바쁘고 화려해 보이는 쇼윈도 라이프 시대, 보통의 하루에 감사했던 적은 언제였을까요.', '작가의 풍경은 가장 아름다운 순간이 아니라, 가장 평범한 순간의 포착입니다.'],
  hint: '휴대폰을 3초 동안 가만히 들고 있으면 오늘이 찍혀요', hintPc: '3초 동안 마우스를 멈추면 오늘이 찍혀요',
  ui: () => `<button class="hl-btn line" data-act="shot">바로 찍기</button>`,
  setup(c) { c.still = 0; c.shots = []; c.flash = 0; c.lastMove = 0; c.cool = 0; },
  act(c, a) { if (a === 'shot') this.shot(c); },
  shot(c) {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    c.shots.push(`${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${d.getHours() < 12 ? '오전' : '오후'} ${((d.getHours() + 11) % 12) + 1}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    c.flash = 1; c.still = 0; c.cool = 2.5; snd.shutter(); sensor.vibrate([10, 40, 10]);
  },
  frame(c, dt) {
    const x = c.x, im = img('hl-pale'), r = fit(im, artBox(c)); c.r = r;
    const mot = PC ? (c.t - c.lastMove < 0.15 ? 1 : 0) : sensor.shake * 4 + Math.abs(sensor.tiltX - (c._tx ?? 0)) * 30 + Math.abs(sensor.tiltY - (c._ty ?? 0)) * 30;
    c._tx = sensor.tiltX; c._ty = sensor.tiltY;
    c.cool = Math.max(0, c.cool - dt);
    if (c.play && !c.cool) { c.still = mot > 0.35 ? Math.max(0, c.still - dt * 2) : c.still + dt / 3; if (c.still >= 1) this.shot(c); }
    shadowFrame(x, r); drawImg(x, im, r, c.artA);
    // 안개
    const mist = c.play ? (1 - c.still) * 0.55 * (c.cool ? 0 : 1) : 0.3;
    if (mist > 0.01) { x.fillStyle = `rgba(230,232,236,${mist})`; x.fillRect(r.x, r.y, r.w, r.h); }
    // 찍힌 테두리
    if (c.shots.length) {
      const k = Math.min(1, (2.5 - c.cool) / 0.6); x.strokeStyle = `rgba(255,255,255,${c.cool ? k : 0.9})`; x.lineWidth = Math.max(8, r.w * 0.03); x.strokeRect(r.x - x.lineWidth / 2, r.y - x.lineWidth / 2, r.w + x.lineWidth, r.h + x.lineWidth);
      x.fillStyle = '#fff'; x.fillRect(r.x - x.lineWidth, r.y + r.h, r.w + x.lineWidth * 2, 30);
      x.fillStyle = '#222'; x.font = '500 12px Pretendard, sans-serif'; x.textAlign = 'center'; x.fillText(`${c.shots[c.shots.length - 1]} · 보통의 오늘`, r.x + r.w / 2, r.y + r.h + 20);
    }
    // 가만히 고리
    if (c.play && !c.cool && c.still > 0.02) { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.beginPath(); x.arc(r.x + r.w / 2, r.y + r.h / 2, 28, -1.57, -1.57 + c.still * 6.283); x.stroke(); }
    if (c.flash > 0) { x.fillStyle = `rgba(255,255,255,${c.flash})`; x.fillRect(0, 0, c.W, c.H); c.flash = Math.max(0, c.flash - dt * 3); }
    meter(c, c.shots.length ? `찍은 오늘 ${c.shots.length}장 · 무탈한 오늘` : '가만히… 안개가 걷히면 찍혀요');
  },
  hover(c) { c.lastMove = c.t; },
  move(c) { c.lastMove = c.t; },
});

// ── 9. 허밍 편지 — #03: 흥얼거리면 높낮이대로 흰 선이 다섯 줄 써짐(손가락으로도)
const LETTER = { rows: [], done: false };
def({
  k: 'letter', works: ['hl-03'], title: '허밍 편지', len: 360,
  story: ['그림 위를 지나는 가는 흰 선은 허밍으로 쓴 편지입니다.', '말이 되기 전의 흥얼거림, 바람에 흔들리는 기억을 손끝으로 받아 적습니다.'],
  hint: '흥얼거리면 높낮이대로 편지가 써져요 · 손가락으로 줄을 따라 그어도 돼요', hintPc: '흥얼거리면 높낮이대로 편지가 써져요 · 마우스로 줄을 따라 그어도 돼요',
  ui: () => `<button class="hl-btn" data-act="mic" hidden>허밍 켜기 (마이크)</button><button class="hl-btn" data-act="save" hidden>편지 간직하기</button><button class="hl-btn line" data-act="again" hidden>다시 쓰기</button>`,
  setup(c) { this.reset(c); },
  reset(c) { LETTER.rows = [[]]; LETTER.done = false; c.pen = 0; c.lift = true; if (c.ui) { c.ui.querySelector('[data-act=save]').hidden = true; c.ui.querySelector('[data-act=again]').hidden = true; } },
  act(c, a) {
    if (a === 'mic') startVoice().then(() => { c.ui.querySelector('[data-act=mic]').hidden = true; }).catch(() => toast('마이크를 쓸 수 없어요. 손가락으로 그어 보세요'));
    if (a === 'save') saveLetter(); if (a === 'again') this.reset(c);
  },
  rowY(c, i) { const r = c.r; return r.y + r.h * (0.16 + i * 0.17); },
  frame(c, dt) {
    const x = c.x, im = img('hl-03'), r = fit(im, artBox(c)); c.r = r;
    c.ui.querySelector('[data-act=mic]').hidden = voice.on || !c.play;
    shadowFrame(x, r); drawImg(x, im, r, c.artA * (LETTER.done ? 1 : 0.5));
    const rh = r.h * 0.12;
    if (!LETTER.done) { // 줄 안내
      x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1; x.setLineDash([3, 6]);
      for (let i = LETTER.rows.length - 1; i < 5; i++) { const y = this.rowY(c, i); x.beginPath(); x.moveTo(r.x + 8, y); x.lineTo(r.x + r.w - 8, y); x.stroke(); }
      x.setLineDash([]);
    }
    // 허밍으로 쓰기
    if (c.play && !LETTER.done && voice.on) {
      if (voice.voiced || voice.level > 0.14) {
        const i = LETTER.rows.length - 1, y = this.rowY(c, i) - (voice.note - 0.5) * rh * 1.6 + Math.sin(c.t * 23) * 2 * voice.level;
        c.pen += dt / 6; if (c.lift) LETTER.rows[i].push(null); LETTER.rows[i].push([c.pen, (y - r.y) / r.h, 1 + voice.level * 3]); c.lift = false;
        snd.pen(voice.level);
        if (c.pen >= 1) this.nextRow(c);
      } else { c.lift = true; snd.pen(0); }
    }
    // 선 그리기
    x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.shadowColor = 'rgba(255,255,255,.6)'; x.shadowBlur = 6;
    LETTER.rows.forEach((row) => { let prev = null; row.forEach((p) => { if (!p) { prev = null; return; } if (prev) { x.lineWidth = p[2]; x.beginPath(); x.moveTo(r.x + 8 + prev[0] * (r.w - 16), r.y + prev[1] * r.h); x.lineTo(r.x + 8 + p[0] * (r.w - 16), r.y + p[1] * r.h); x.stroke(); } prev = p; }); });
    if (!LETTER.done && c.play) { const i = LETTER.rows.length - 1, px = r.x + 8 + c.pen * (r.w - 16), py = this.rowY(c, i); x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 3 + (voice.on ? voice.level * 4 : 0), 0, 6.283); x.fill(); }
    x.restore();
    meter(c, LETTER.done ? '나의 허밍 편지가 완성됐어요' : `${LETTER.rows.length}번째 줄 · ${Math.round(c.pen * 100)}%${voice.on ? (voice.voiced ? ' · 흥얼거리는 중' : '') : ''} · 소리는 녹음하지 않아요`);
  },
  nextRow(c) {
    c.pen = 0; c.lift = true; snd.chime(72 + LETTER.rows.length * 2, 0.6);
    if (LETTER.rows.length >= 5) { LETTER.done = true; snd.bloom(true); c.ui.querySelector('[data-act=save]').hidden = false; c.ui.querySelector('[data-act=again]').hidden = false; return; }
    LETTER.rows.push([]);
  },
  down(c, px, py) { c.finger = c.r && inR(c.r, px, py); c.lift = true; },
  move(c, px, py) {
    if (!c.finger || LETTER.done || !c.play) return;
    const r = c.r, i = LETTER.rows.length - 1, ry = this.rowY(c, i), rh = r.h * 0.12;
    const u = clamp((px - r.x - 8) / (r.w - 16)); if (u < c.pen - 0.02) return;
    c.pen = Math.max(c.pen, u);
    if (c.lift) LETTER.rows[i].push(null); LETTER.rows[i].push([c.pen, (clamp(py, ry - rh, ry + rh) - r.y) / r.h, 1.6]); c.lift = false;
    snd.pen(0.5); if (c.pen >= 0.995) this.nextRow(c);
  },
  up(c) { c.finger = false; c.lift = true; snd.pen(0); },
});
function saveLetter() { // 작품 그림은 넣지 않고, 내가 쓴 선과 날짜만
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '300 64px "Noto Serif KR", serif'; x.fillText('Humming Letter', 540, 170);
  x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineJoin = 'round'; x.shadowColor = 'rgba(255,255,255,.5)'; x.shadowBlur = 8;
  const L = 120, Wd = 840, T = 300, Hh = 900;
  LETTER.rows.forEach((row) => { let prev = null; row.forEach((p) => { if (!p) { prev = null; return; } if (prev) { x.lineWidth = p[2] * 2.2; x.beginPath(); x.moveTo(L + prev[0] * Wd, T + (prev[1] - 0.08) * Hh); x.lineTo(L + p[0] * Wd, T + (p[1] - 0.08) * Hh); x.stroke(); } prev = p; }); });
  x.shadowBlur = 0; const d = new Date();
  x.font = '400 30px Pretendard, sans-serif'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), 540, 1180);
  x.font = '400 24px Pretendard, sans-serif'; x.fillStyle = 'rgba(255,255,255,.5)'; x.fillText('ARTMOS · 권지안 《Humming Letter》 전시에서 쓴 나의 허밍 편지', 540, 1240);
  cv.toBlob(async (b) => {
    const f = new File([b], 'humming-letter.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: '나의 허밍 편지' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'humming-letter.png'; document.body.appendChild(a); a.click(); a.remove();
    toast('편지를 저장했어요');
  }, 'image/png');
}

// ── 10. 꽃밭 위에 허밍 — 모든 감각: 허밍·기울이기·흔들기·두드리기·문지르기가 꽃이 되고, 다 차면 만개
def({
  k: 'finale', works: ['hl-tide'], title: '꽃밭 위에 허밍', len: 380,
  story: ['‘꽃밭 위에 허밍’을 경쾌하게.', '움츠러들었던 모두의 마음이 힘차게 피어오르는, 충만한 춤.'],
  hint: '허밍하고, 기울이고, 흔들고, 두드려 보세요. 무엇이든 꽃이 돼요', hintPc: '허밍하고, 클릭하고, 끌어 보세요. 무엇이든 꽃이 돼요',
  setup(c) { c.E = 0; c.fl = []; c.full = 0; sensor.onShake((v) => { if (c.play && cur === c) this.push(c, 0.6 + v, null, null, 10); }); },
  push(c, v, px, py, n = 4) {
    if (!c.full) c.E = clamp(c.E + v * 0.012);
    const ids = WORKS.map((w) => w.id);
    for (let i = 0; i < n; i++) { const id = ids[Math.floor(Math.random() * ids.length)]; c.fl.push({ x: px != null ? px + rnd(-30, 30) : rnd(c.W), y: py != null ? py : c.H + 10, vx: rnd(-30, 30), vy: rnd(-180, -70), s: rnd(5, 12), col: pal(id), t: 0, life: rnd(2, 3.6), k: Math.floor(rnd(5, 8)) }); }
    if (c.fl.length > 420) c.fl.splice(0, c.fl.length - 420);
  },
  frame(c, dt) {
    const x = c.x, im = img('hl-tide'), box = artBox(c), r = fit(im, box); c.r = r;
    // 둘레를 도는 작품들
    const thumbs = WORKS.filter((w) => w.id !== 'hl-tide');
    const R = Math.min(c.W, c.H) * (0.36 + c.full * 0.12), cx = c.W / 2, cy = r.y + r.h / 2;
    thumbs.forEach((w, i) => {
      const t = img(w.id, true); if (!t._ok) return;
      const a = (i / thumbs.length) * 6.283 + c.t * 0.08, s = Math.min(c.W, c.H) * (0.1 + c.full * 0.05);
      const fr = fit(t, { x: cx + Math.cos(a) * R * 1.15 - s / 2, y: cy + Math.sin(a) * R * 0.9 - s / 2, w: s, h: s });
      x.globalAlpha = (0.18 + c.E * 0.4 + c.full * 0.42) * c.artA; x.drawImage(t, fr.x, fr.y, fr.w, fr.h);
    });
    x.globalAlpha = 1;
    shadowFrame(x, r); drawImg(x, im, r, c.artA);
    // 입력 → 꽃
    if (c.play) {
      let v = 0;
      if (voice.on) v += voice.level * 1.6;
      if (!PC) v += Math.abs(sensor.tiltX - (c._tx ?? sensor.tiltX)) * 8 + Math.abs(sensor.tiltY - (c._ty ?? sensor.tiltY)) * 8;
      c._tx = sensor.tiltX; c._ty = sensor.tiltY;
      if (v > 0.05) this.push(c, v * dt * 6, null, null, Math.min(6, Math.ceil(v * 3)));
    }
    x.save(); x.globalCompositeOperation = 'lighter';
    particles(x, c.fl, dt, (p) => {
      p.x += (p.vx + Math.sin(p.t * 2 + p.s) * 30) * dt; p.y += p.vy * dt; p.vy *= 0.995;
      const k = p.t / p.life, g = Math.min(1, p.t * 2.5), rr = p.s * g;
      x.globalAlpha = (1 - k) * 0.9; x.fillStyle = p.col;
      for (let j = 0; j < p.k; j++) { const a = (j / p.k) * 6.283 + p.t; x.beginPath(); x.ellipse(p.x + Math.cos(a) * rr * 0.7, p.y + Math.sin(a) * rr * 0.7, rr * 0.55, rr * 0.3, a, 0, 6.283); x.fill(); }
    });
    x.restore(); x.globalAlpha = 1;
    // 앞에서 남긴 것들: 심은 꽃 이름·허밍 편지 선
    if (c.E > 0.3 || c.full) {
      x.font = '500 12px Pretendard, sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.8)';
      PLANTED.forEach((s, i) => { const yy = r.y + r.h + 18 - ((c.t * 14 + i * 40) % (r.h + 40)); x.globalAlpha = 0.7 * Math.min(1, c.E * 2); x.fillText(s, r.x + r.w * (0.15 + (i * 0.23) % 0.7), yy); });
      x.globalAlpha = 1;
      if (LETTER.rows.length && LETTER.rows[0].length) { x.save(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.2; LETTER.rows.forEach((row) => { let pr = null; row.forEach((p) => { if (!p) { pr = null; return; } if (pr) { x.beginPath(); x.moveTo(r.x + pr[0] * r.w, r.y + pr[1] * r.h); x.lineTo(r.x + p[0] * r.w, r.y + p[1] * r.h); x.stroke(); } pr = p; }); }); x.restore(); }
    }
    if (!c.full && c.E >= 1) { c.full = 0.001; snd.bloom(true); sensor.vibrate([30, 60, 30, 60, 80]); for (let i = 0; i < 12; i++) setTimeout(() => this.push(c, 0, null, null, 14), i * 90); }
    if (c.full) c.full = Math.min(1, c.full + dt / 2);
    // 진행 고리
    const rad = 22, gx = c.W / 2, gy = r.y + r.h + 30;
    x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 3; x.beginPath(); x.arc(gx, gy, rad, 0, 6.283); x.stroke();
    x.strokeStyle = '#fff'; x.beginPath(); x.arc(gx, gy, rad, -1.57, -1.57 + c.E * 6.283); x.stroke();
    snd.wind(c.play ? Math.min(0.5, (voice.on ? voice.level : 0) + c.E * 0.1) : 0);
    meter(c, c.full ? '만개했어요. 꽃밭 위에 허밍' : `피어난 꽃 ${Math.round(c.E * 100)}%`);
  },
  down(c, px, py) { this.push(c, 1.4, px, py, 8); sensor.vibrate(8); snd.bloom(); },
  move(c, px, py, d) { if (d > 3) this.push(c, d / 60, px, py, 1); },
  key(c, e) { if (e.code === 'Space') { e.preventDefault(); this.push(c, 1.2, null, null, 8); snd.beat(0.6); } },
});

// ── 화면 만들기
const main = $('#hl');
function meter(c, s) { if (c._m !== s) { c._m = s; c.meterEl.textContent = s; } }
let toastT = 0; function toast(s) { const t = $('#hl-toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }

CH.forEach((d, i) => {
  const sec = document.createElement('section'); sec.className = 'hl-ch'; sec.dataset.k = d.k; sec.style.setProperty('--len', d.len + 'svh');
  sec.innerHTML = `<div class="hl-stk">
    <canvas class="hl-cv" aria-hidden="true"></canvas>
    <p class="hl-cap"><b>${String(i + 1).padStart(2, '0')}</b> ${esc(d.title)}</p>
    <div class="hl-story">${d.story.map((s) => `<p>${s}</p>`).join('')}</div>
    ${d.story2 ? `<div class="hl-story hl-story2">${d.story2.map((s) => `<p>${s}</p>`).join('')}</div>` : ''}
    <div class="hl-low"><p class="hl-hint">${esc(PC ? d.hintPc : d.hint)}</p><p class="hl-meter"></p><div class="hl-ui">${d.ui ? d.ui() : ''}</div></div>
  </div>`;
  main.appendChild(sec);
  const c = Object.assign(Object.create(d), { el: sec, cv: sec.querySelector('canvas'), meterEl: sec.querySelector('.hl-meter'), ui: sec.querySelector('.hl-ui'), t: 0, p: 0, play: false, artA: 0.35 });
  c.x = c.cv.getContext('2d');
  d.setup && d.setup.call(d, c);
  d._c = c;
  c.ui.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && d.act) d.act.call(d, c, b.dataset.act); });
  bindPointer(c, d);
});
main.insertAdjacentHTML('beforeend', worksHTML());

function bindPointer(c, d) {
  const cv = c.cv; let last = null;
  const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  // 작품 위에서 시작한 터치만 스크롤 대신 체험 (그 밖은 그대로 스크롤)
  cv.addEventListener('touchstart', (e) => { if (!c.play || !d.grab || !c.r) return; const t = e.touches[0], b = cv.getBoundingClientRect(); if (inR(c.r, t.clientX - b.left, t.clientY - b.top)) e.preventDefault(); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => { if (!c.play) return; first(); const [x, y] = pos(e); last = [x, y]; try { cv.setPointerCapture(e.pointerId); } catch (er) {} d.down && d.down.call(d, c, x, y); });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = pos(e);
    if (!last) { d.hover && c.play && d.hover.call(d, c, x, y); return; }
    const dx = x - last[0], dy = y - last[1]; last = [x, y];
    d.move && d.move.call(d, c, x, y, Math.hypot(dx, dy), dx, dy);
  });
  const end = (e) => { if (!last) return; const [x, y] = pos(e); last = null; d.up && d.up.call(d, c, x, y); snd.rustle(0); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
addEventListener('keydown', (e) => { if (cur && cur.key && cur.play && !/input|textarea/i.test(document.activeElement && document.activeElement.tagName)) cur.key.call(Object.getPrototypeOf(cur), cur, e); });

function worksHTML() {
  return `<section class="hl-end" id="hl-works">
    <p class="hl-kick">Humming Letter · 권지안</p>
    <h2>무탈한, 아주 평범한 오늘이<br>모두에게 파라다이스이길.</h2>
    <div class="hl-note"><p>권지안은 음악에서 시작해, 바람과 꽃의 풍경을 리듬과 허밍에 빗대어 손가락으로 그립니다. 캔버스를 바닥에 깔고, 마르기를 기다리지 않고 색을 섞어 흔들리는 순간을 한 번에 그려 내는 지두화(指頭畫). 그림 위를 지나는 흰 선은 허밍으로 쓴 편지입니다.</p></div>
    <h3>작품 ${WORKS.length}점</h3>
    <ul class="hl-grid">${WORKS.map((w) => `<li><img src="${w.thumb}" alt="${esc(w.title)}" loading="lazy"><b>${esc(w.title)}</b><span>${esc(w.size)} · ${esc(w.material)} · ${w.year}</span></li>`).join('')}</ul>
    <div class="hl-collect"><p>전시와 함께, 작품을 소장해 보세요.</p><a class="hl-btn" href="collect.html?cell=c010" id="hl-col">소장 상담</a></div>
    <p class="hl-credit">© 권지안. 작품 이미지는 작가의 허락을 받아 사용했습니다.<br>화면 속 꽃잎·빛·물결·선·안개는 이 화면에만 그려지는 효과이며 작품의 실제 모습이 아닙니다.<br>마이크·센서는 이 기기 안에서만 쓰고 녹음·저장·전송하지 않습니다.<br>기획 ARTMOS · VALIX LAB</p>
    <button class="hl-btn line hl-exit">전시 행성 나가기</button>
  </section>`;
}

// ── 입장
const gate = $('#hl-gate'), gcv = $('#hl-gate-cv'), gx = gcv.getContext('2d');
let entered = false, firstDone = false;
function first() { if (firstDone) return; firstDone = true; snd.start(); updSnd(); }
async function enter(withMic) {
  if (entered) return; entered = true; first();
  try { await sensor.enable(); } catch (e) {}
  if (withMic) startVoice().catch(() => toast('마이크 없이 볼게요. 손가락으로도 다 할 수 있어요'));
  keepAwake().catch(() => {});
  gate.classList.add('out'); setTimeout(() => (gate.hidden = true), 900);
  document.body.classList.add('in');
  CH.slice(0, 2).forEach((d) => d.works.forEach((id) => img(id)));
}
$('#hl-enter').addEventListener('click', () => enter(true));
$('#hl-enter2').addEventListener('click', () => enter(false));
function updSnd() { const b = $('#hl-snd'); b.textContent = snd.on ? '소리 켜짐' : '소리 꺼짐'; b.setAttribute('aria-pressed', snd.on); }
$('#hl-snd').addEventListener('click', () => { first(); snd.setOn(!snd.on); updSnd(); });
document.addEventListener('click', (e) => {
  const ex = e.target.closest('.hl-exit');
  if (ex) { e.preventDefault(); if (IN_APP) { try { parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); } catch (er) {} } else location.href = './'; }
  const col = e.target.closest('#hl-col');
  if (col && IN_APP) { e.preventDefault(); try { parent.postMessage({ type: 'artmos:go-tab', tab: 'shop' }, '*'); } catch (er) {} }
});

// ── 스크롤 · 그리기
let cur = null, vh = innerHeight, vw = innerWidth, lastT = performance.now();
const DPR = Math.min(devicePixelRatio || 1, IS_MOBILE ? 1.5 : 2);
function sizeAll() {
  readSat(); vw = innerWidth; vh = innerHeight;
  CH.forEach((d) => { const c = d._c, w = c.cv.clientWidth || vw, h = c.cv.clientHeight || vh; c.W = w; c.H = h; c.cv.width = Math.round(w * DPR); c.cv.height = Math.round(h * DPR); });
}
let lastW = 0, lastH = 0;
addEventListener('resize', () => { if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return; lastW = innerWidth; lastH = innerHeight; sizeAll(); });
sizeAll(); lastW = innerWidth; lastH = innerHeight;

function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  const sy = scrollY; let best = null;
  CH.forEach((d, i) => {
    const c = d._c, top = c.el.offsetTop, len = c.el.offsetHeight - vh;
    c.p = clamp((sy - top) / Math.max(1, len));
    const vis = sy + vh > top && sy < top + c.el.offsetHeight;
    if (sy + vh * 0.5 >= top && sy + vh * 0.5 < top + c.el.offsetHeight) best = c;
    if (!vis) { if (c.play) { c.play = false; c.up && c.up(c); } return; }
    // 다음 장 그림 미리 받기
    if (!c._pre) { c._pre = 1; d.works.forEach((id) => img(id)); (CH[i + 1] || { works: [] }).works.forEach((id) => img(id)); }
    c.t += dt;
    const story = 1 - smooth(0.16, 0.3, c.p), story2 = d.story2 ? smooth(0.52, 0.58, c.p) * (1 - smooth(0.64, 0.7, c.p)) : 0;
    c.artA = 0.28 + 0.72 * (1 - Math.max(story, story2));
    c.play = entered && c.p > 0.24 && c.p < 0.985 && story2 < 0.5;
    c.el.style.setProperty('--story', story.toFixed(3)); c.el.style.setProperty('--story2', story2.toFixed(3));
    c.el.style.setProperty('--low', (c.play ? 1 : 0).toString());
    const x = c.x; x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, c.W, c.H);
    try { d.frame.call(d, c, dt); } catch (e) { if (!c._err) { c._err = 1; console.error(e); } }
    const veil = Math.max(1 - smooth(0.16, 0.3, c.p), story2) * 0.55; if (veil > 0.01) { x.fillStyle = `rgba(0,0,0,${veil})`; x.fillRect(0, 0, c.W, c.H); }
    const fade = smooth(0.93, 1, c.p) + (1 - smooth(0, 0.06, c.p)) * (i ? 1 : 0);
    if (fade > 0.01) { x.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; x.fillRect(0, 0, c.W, c.H); }
  });
  if (best !== cur) { cur = best; if (cur) snd.chapter(cur.k); else snd.chapter('works'); if (!cur) snd.wind(0); }
  // 진행 막대·장 점
  const tot = document.documentElement.scrollHeight - vh; $('#hl-bar').style.transform = `scaleX(${clamp(sy / Math.max(1, tot))})`;
  drawGate(now / 1000);
  requestAnimationFrame(tick);
}
// 입장 화면: 흰 선 한 줄이 허밍처럼 출렁임
function drawGate(t) {
  if (gate.hidden) return;
  const w = gcv.clientWidth, h = gcv.clientHeight; if (gcv.width !== Math.round(w * DPR)) { gcv.width = Math.round(w * DPR); gcv.height = Math.round(h * DPR); }
  gx.setTransform(DPR, 0, 0, DPR, 0, 0); gx.clearRect(0, 0, w, h);
  const y0 = h * 0.5, lv = voice.on ? voice.level : 0;
  gx.strokeStyle = '#fff'; gx.lineWidth = 1.6; gx.lineCap = 'round'; gx.shadowColor = 'rgba(255,255,255,.6)'; gx.shadowBlur = 8;
  gx.beginPath();
  for (let x = w * 0.08; x <= w * 0.92; x += 3) {
    const u = x / w, y = y0 + Math.sin(u * 19 + t * 2.2) * (6 + lv * 30) * Math.sin(u * 3.14) + Math.sin(u * 53 - t * 3.1) * 2.5 + Math.sin(u * 7 + t) * 4;
    x === w * 0.08 ? gx.moveTo(x, y) : gx.lineTo(x, y);
  }
  gx.stroke(); gx.shadowBlur = 0;
}
requestAnimationFrame(tick);
img('hl-01'); img('hl-monet');

if (location.hash === '#debug') window.__hl = { CH, voice, sensor, snd, LETTER, PLANTED, enter, cur: () => cur };
