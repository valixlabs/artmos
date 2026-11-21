// ARTMOS SCREEN — 장승효 · 나비의 정원. 큰 화면(사이니지·노트북·데스크톱·스탠바이미)에 장승효 작가의 작품이 조각으로 숨어 있고,
// 휴대폰으로 각자 나비 한 마리를 조종해 떠다니는 작품 조각을 모으면 모두 함께 작품이 완성됨. 많은 사람이 동시에(MAX_P).
// 나비는 작품 속 나비를 오려 낸 그림(assets/screen/jangsh-bf-*.webp, 작가 전시·게임 사용 허락 있음 — 2026-11-21 소유자 확인).
// 연결은 screen-link.js: 폰 입력은 그 폰 통로로만, 진행률·완성은 큰 통로로 모두에게.
import { open, room, newCode, newId, linkMode } from './screen-link.js?v=1';
import { qrSVG } from './qr.js?v=1';

const $ = (s) => document.querySelector(s);
const MAX_P = 40;                 // 동시에 나는 나비 수
const NEXT_AFTER = 22;            // 완성 뒤 다음 작품까지(초)
const params = new URLSearchParams(location.search);
const KIOSK = params.has('kiosk');
const me = 'screen-' + newId(), bornAt = Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const abs = (p) => new URL(p, location.href).href;
const img = (src) => { const i = new Image(); i.src = src; return i; };

/* ---------- 작품 · 나비 ---------- */
// 작품 이름은 작가에게 확인 뒤 title에 넣기(지금은 비워 둠 → '장승효 작가의 나비'로만 표시)
const ARTS = [
  { src: 'assets/screen/jangsh-art-2.webp', cols: 10, rows: 10, title: '' },
  { src: 'assets/screen/jangsh-art-1.webp', cols: 14, rows: 6, title: '' },
].map((a) => ({ ...a, img: img(a.src), url: abs(a.src) }));
const BF_SRC = ['assets/screen/jangsh-bf-1.webp', 'assets/screen/jangsh-bf-2.webp'];
const BF = BF_SRC.map(img);
const BODY = [.51, .495]; // 몸통 가로 위치(비율) — 여기를 축으로 날개를 접었다 폄
// 여러 모양의 나비: 같은 그림이라도 크기·날개 폭·날갯짓 빠르기·좌우가 다름
const FORMS = [
  { b: 0, s: 1, ax: 1, flap: 7, name: '사탕 날개' },
  { b: 1, s: 1, ax: 1, flap: 7.5, name: '꽃구름 날개' },
  { b: 0, s: .72, ax: .82, flap: 11, name: '작은 사탕 나비' },
  { b: 1, s: .78, ax: 1.18, flap: 6, name: '너른 날개' },
  { b: 0, s: 1.22, ax: 1.05, flap: 5, name: '큰 사탕 나비', mir: true },
  { b: 1, s: .62, ax: .9, flap: 13, name: '꼬마 나비', mir: true },
  { b: 0, s: .9, ax: 1.25, flap: 6.5, name: '나풀 날개' },
  { b: 1, s: 1.1, ax: .85, flap: 9, name: '날쌘 나비', mir: true },
];

/* ---------- 판(숨은 작품) ---------- */
let round = 0, art = ARTS[0], tiles = [], revealed = 0, pieces = [], doneAt = 0, flashes = [];
const rev = document.createElement('canvas'), rctx = rev.getContext('2d'); // 드러난 조각만 그린 판
function startRound(k) {
  round = k; art = ARTS[k % ARTS.length]; revealed = 0; doneAt = 0; pieces = []; flashes = [];
  tiles = []; for (let r = 0; r < art.rows; r++) for (let c = 0; c < art.cols; c++) tiles.push({ c, r, state: 0 }); // 0 숨음 · 1 떠다님 · 2 날아가는 중 · 3 드러남
  const go = () => { rev.width = art.img.naturalWidth; rev.height = art.img.naturalHeight; rctx.clearRect(0, 0, rev.width, rev.height); };
  if (art.img.complete && art.img.naturalWidth) go(); else art.img.addEventListener('load', go, { once: true });
  for (const p of people.values()) p.score = 0;
  if (main) main.send({ t: 'round', title: artTitle(), total: tiles.length });
  sendProg(true); if (typeof layout === 'function' && W) layout();
}
const artTitle = () => art.title || '장승효 작가의 나비';
function spawnPiece() {
  const hidden = tiles.filter((t) => t.state === 0); if (!hidden.length) return;
  const t = hidden[Math.floor(Math.random() * hidden.length)]; t.state = 1;
  const side = Math.random() * 4 | 0, m = 60;
  const x = side === 0 ? -m : side === 1 ? W + m : Math.random() * W, y = side === 2 ? -m : side === 3 ? H + m : Math.random() * H * .9;
  pieces.push({ t, x, y, vx: 0, vy: 0, ph: Math.random() * 6.3, rot: Math.random() * 6.3, born: performance.now(), fly: null });
}

/* ---------- 입장 숫자 · QR ---------- */
let code = '', main = null;
const people = new Map();
function remoteUrl(c) { const u = new URL('remote.html', location.href); u.search = ''; u.searchParams.set('c', c); if (linkMode === 'local') u.searchParams.set('local', '1'); return u.href; }
function setCode(c) {
  code = c; const url = remoteUrl(c);
  $('#qr').innerHTML = qrSVG(url); $('#qr2').innerHTML = qrSVG(url);
  $('#code').textContent = c.split('').join(' '); $('#code2').textContent = c;
  $('#url').textContent = url.replace(/^https?:\/\//, '').replace(/\?.*$/, '') + '  ·  ' + c;
}
function openRoom() {
  if (main) main.close();
  setCode(newCode()); const mine = code;
  main = open(room(code), onMain, { presence: me, onPresence(list) { if (mine === code && !people.size && list.some((s) => s.screen && s.screen !== me && s.at < bornAt)) openRoom(); } });
  main.ready.then((ok) => {
    $('#net').textContent = ok ? (linkMode === 'local' ? '시험 연결(같은 기기)' : '연결됨') : '연결 안 됨 · 다시 시도 중';
    $('#net').classList.toggle('bad', !ok);
    if (ok) main.track({ screen: me, at: bornAt }); else setTimeout(() => { if (mine === code) openRoom(); }, 4000);
  });
}
// 사람이 많을수록 폰이 덜 자주 보내게(실시간 서버 한도 안에서) — 화면은 속도로 부드럽게 이어 그림
const hzFor = (n) => clamp(Math.floor(90 / Math.max(1, n)), 3, 15);
let lastHz = 0;

/* ---------- 사람 ---------- */
function onMain(m) {
  if (!m || m.t !== 'join' || !m.pid) return;
  const ex = people.get(m.pid);
  if (ex) { ex.ch.send(welcome(ex)); return; }
  const ch = open(room(code) + '-' + m.pid, (x) => onPerson(m.pid, x));
  if (people.size >= MAX_P) { ch.ready.then(() => { ch.send({ t: 'full' }); setTimeout(() => ch.close(), 1500); }); return; }
  const used = new Map(); for (const p of people.values()) used.set(p.form, (used.get(p.form) || 0) + 1);
  let form = 0, best = 1e9; FORMS.forEach((_, i) => { const u = used.get(i) || 0; if (u < best) { best = u; form = i; } }); // 덜 쓰인 모양부터
  const p = { pid: m.pid, ch, nick: String(m.nick || '').slice(0, 20) || '나비', form, x: .15 + Math.random() * .7, y: .2 + Math.random() * .6, vx: 0, vy: 0, ix: 0, iy: 0, ang: 0, ph: Math.random() * 6, dash: 0, dashCool: 0, score: 0, seen: Date.now(), born: performance.now() };
  people.set(m.pid, p);
  ch.ready.then(() => ch.send(welcome(p)));
  toast(`${p.nick}님의 나비가 날아왔어요`); layout(); rate();
}
const welcome = (p) => { const f = FORMS[p.form]; return { t: 'welcome', form: p.form, formName: f.name, bf: abs(BF_SRC[f.b]), mir: !!f.mir, hz: hzFor(people.size), title: artTitle(), total: tiles.length, done: revealed, mine: p.score }; };
function rate() { const hz = hzFor(people.size); if (hz !== lastHz && main) { lastHz = hz; main.send({ t: 'rate', hz }); } }
function onPerson(pid, msg) {
  const p = people.get(pid); if (!p || !msg) return;
  p.seen = Date.now();
  if (msg.t === 'in') { p.ix = clamp(+msg.x || 0, -1, 1); p.iy = clamp(+msg.y || 0, -1, 1); }
  else if (msg.t === 'dash' && p.dashCool <= 0) { p.dash = .7; p.dashCool = 1.6; for (let i = 0; i < 14; i++) sparkle(p.x * W, p.y * H, 220); }
  else if (msg.t === 'bye') leave(p);
}
function leave(p) { if (!people.has(p.pid)) return; people.delete(p.pid); p.ch.close(); layout(); rate(); }
let hbTick = 0;
setInterval(() => {
  const now = Date.now(), hb = ++hbTick % 6 === 0;
  for (const p of [...people.values()]) { if (hb) p.ch.send({ t: 'hb' }); if (now - p.seen > 10000) leave(p); }
}, 500);
let progAt = 0;
function sendProg(force) { const now = performance.now(); if (!main || (!force && now - progAt < 900)) return; progAt = now; main.send({ t: 'prog', done: revealed, total: tiles.length }); }

/* ---------- 화면 배치 ---------- */
function layout() {
  const any = people.size > 0;
  $('#lobby').classList.toggle('off', any); $('#corner').hidden = !any;
  $('#players').innerHTML = any && !doneAt ? `<div class="pl q"><b>나비 ${people.size}마리</b><span>함께 작품을 완성하고 있어요</span></div>` : '';
}
let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

/* ---------- 그림 ---------- */
const cv = $('#sky'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, board = { x: 0, y: 0, w: 0, h: 0 };
const bg = [], sparks = [];
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bg.length = 0; for (let i = 0, n = Math.round(W * H / 2600); i < n; i++) bg.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + .2, a: Math.random() * .6 + .1, p: Math.random() * 6.3 });
}
addEventListener('resize', resize); resize();
function fitBoard() {
  const iw = art.img.naturalWidth || art.cols, ih = art.img.naturalHeight || art.rows, top = H * .12, maxH = H * .7, maxW = W * .7;
  const s = Math.min(maxW / iw, maxH / ih); board = { w: iw * s, h: ih * s, x: (W - iw * s) / 2, y: top + (maxH - ih * s) / 2 };
}
function sparkle(x, y, sp = 160) { const a = Math.random() * 6.283, s = sp * (.3 + Math.random()); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, r: 1.5 + Math.random() * 2.5 }); }
function drawButterfly(x, y, size, form, ph, ang, alpha = 1) {
  const f = FORMS[form], im = BF[f.b]; if (!im.complete || !im.naturalWidth) return;
  const iw = im.naturalWidth, ih = im.naturalHeight, w = size * f.s * f.ax, h = (size * f.s) * ih / iw, bx = iw * BODY[f.b];
  const open = .28 + .72 * Math.abs(Math.cos(ph)); // 날개를 접었다 폄
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(ang); if (f.mir) ctx.scale(-1, 1);
  const L = w * BODY[f.b], Rw = w - L;
  ctx.save(); ctx.scale(open, 1); ctx.drawImage(im, 0, 0, bx, ih, -L, -h / 2, L, h); ctx.drawImage(im, bx, 0, iw - bx, ih, 0, -h / 2, Rw, h); ctx.restore();
  ctx.restore();
}
// 사람이 없을 때 화면을 지키는 나비들(사이니지 대기 화면)
const idle = Array.from({ length: 3 }, (_, i) => ({ form: i * 3 % FORMS.length, t: Math.random() * 100, ph: Math.random() * 6 }));

/* ---------- 움직이는 배경 (2026-11-21 소유자: 화려하게, 뒤 배경이 움직이게 — 'Collage + Dreaming Butterfly' 느낌) ----------
   ① 작품 자체를 크게 흐리게 깔고 천천히 돌고 숨 쉼 ② 작품 속 사탕·꽃·보석 조각이 가운데 소용돌이에서 흘러나옴
   ③ 따뜻한 빛 번짐 ④ 멀리 작은 나비들. 가운데(작품 판)는 어둡게 눌러 게임이 잘 보이게. */
const BG = { blur: null, artRef: null, chips: [], floaters: [], bgBf: [], glints: [] };
function buildBlur() {
  if (!art.img.complete || !art.img.naturalWidth || BG.artRef === art) return;
  BG.artRef = art;
  const c = document.createElement('canvas'), w = 960, h = Math.round(960 * art.img.naturalHeight / art.img.naturalWidth); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.filter = 'blur(1.5px) saturate(1.3) brightness(1.08)'; g.drawImage(art.img, -4, -4, w + 8, h + 8); BG.blur = c;
}
function buildChips() { // 두 작품에서 색이 짙은 작은 조각(사탕·꽃·보석)을 골라 둥근 그림으로
  if (BG.chips.length) return;
  for (const a of ARTS) {
    const im = a.img; if (!im.complete || !im.naturalWidth) return;
  }
  for (const a of ARTS) {
    const im = a.img, iw = im.naturalWidth, ih = im.naturalHeight, sm = document.createElement('canvas'), sw = 120, sh = Math.round(120 * ih / iw);
    sm.width = sw; sm.height = sh; const sg = sm.getContext('2d', { willReadFrequently: true }); sg.drawImage(im, 0, 0, sw, sh);
    const d = sg.getImageData(0, 0, sw, sh).data, cand = [];
    for (let y = 2; y < sh - 2; y++) for (let x = 2; x < sw - 2; x++) {
      const i = (y * sw + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      if (mx > 120 && (mx - mn) / mx > .45) cand.push([x / sw, y / sh]);
    }
    for (let k = 0; k < 18 && cand.length; k++) {
      const [u, v] = cand[Math.floor(Math.random() * cand.length)], R = 40, c = document.createElement('canvas'); c.width = c.height = R * 2;
      const g = c.getContext('2d'), cs = iw * (.025 + Math.random() * .03);
      g.beginPath(); g.arc(R, R, R, 0, 6.283); g.clip(); g.drawImage(im, u * iw - cs / 2, v * ih - cs / 2, cs, cs, 0, 0, R * 2, R * 2);
      const gr = g.createRadialGradient(R * .7, R * .6, 2, R, R, R); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, R * 2, R * 2);
      BG.chips.push(c);
    }
  }
  for (let i = 0; i < 130; i++) BG.floaters.push(newFloater(true));
  for (let i = 0; i < 60; i++) BG.glints.push({ x: Math.random(), y: Math.random(), p: Math.random() * 6.3, s: .6 + Math.random() * 1.4 });
  for (let i = 0; i < 6; i++) BG.bgBf.push({ form: i % FORMS.length, t: Math.random() * 100, ph: Math.random() * 6, sp: .05 + Math.random() * .05 });
}
function newFloater(anyR) {
  return { a: Math.random() * 6.283, r: anyR ? Math.random() : 0, z: .25 + Math.random() * .75, rot: Math.random() * 6.283, vr: (Math.random() - .5) * 1.6, chip: Math.floor(Math.random() * Math.max(1, BG.chips.length)), wob: Math.random() * 6.3 };
}
function drawBg(now, dt, dim) {
  buildBlur(); buildChips();
  const t = now / 1000, cx = W / 2, cy = H / 2, D = Math.hypot(W, H) / 2;
  // ① 작품이 천천히 돌고 숨 쉼
  if (BG.blur) {
    const sc = Math.max(W / BG.blur.width, H / BG.blur.height) * (1.25 + .06 * Math.sin(t * .23));
    ctx.save(); ctx.globalAlpha = .78 * dim; ctx.translate(cx + Math.sin(t * .07) * W * .03, cy + Math.cos(t * .09) * H * .03); ctx.rotate(Math.sin(t * .05) * .12);
    ctx.drawImage(BG.blur, -BG.blur.width * sc / 2, -BG.blur.height * sc / 2, BG.blur.width * sc, BG.blur.height * sc); ctx.restore();
  }
  // ③ 따뜻한 빛 번짐(가운데에서 천천히 맥박)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const a = t * (.11 + k * .04) + k * 2.1, x = cx + Math.cos(a) * W * .28, y = cy + Math.sin(a * 1.3) * H * .26, r = D * (.35 + .08 * Math.sin(t * .5 + k));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,${170 + k * 25},${90 + k * 40},${.10 * dim})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  // ② 소용돌이에서 흘러나오는 사탕·꽃·보석
  if (BG.chips.length) for (const f of BG.floaters) {
    f.r += dt * (.035 + f.z * .05); f.a += dt * (.35 - f.r * .22) * (.6 + f.z * .6); f.rot += f.vr * dt; f.wob += dt;
    if (f.r > 1.15) Object.assign(f, newFloater(false));
    const rr = f.r * D * (1 + .05 * Math.sin(f.wob)), x = cx + Math.cos(f.a) * rr, y = cy + Math.sin(f.a) * rr * .8;
    const size = (10 + 70 * f.z) * (.35 + Math.min(1, f.r * 1.6)), al = Math.min(1, f.r * 4) * (1.15 - f.r) * (.3 + .7 * f.z) * dim;
    if (al <= .01) continue;
    ctx.save(); ctx.globalAlpha = Math.min(1, al); ctx.translate(x, y); ctx.rotate(f.rot); ctx.drawImage(BG.chips[f.chip % BG.chips.length], -size / 2, -size / 2, size, size); ctx.restore();
  }
  // ④ 멀리 작은 나비들
  for (const b of BG.bgBf) { b.t += dt * b.sp; b.ph += dt * FORMS[b.form].flap * .8; const x = (.5 + .48 * Math.sin(b.t * 1.1 + b.form * 1.7)) * W, y = (.5 + .45 * Math.sin(b.t * 1.6 + b.form)) * H; drawButterfly(x, y, Math.min(W, H) * .05, b.form, b.ph, Math.sin(b.t * 3) * .4, .3 * dim); }
  // ⑤ 반짝이(네 갈래 빛)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
  for (const g of BG.glints) { const k = Math.max(0, Math.sin(t * 1.7 * g.s + g.p)); if (k < .55) continue; const a = (k - .55) / .45 * dim, x = g.x * W, y = g.y * H, L = 6 + 14 * g.s * a; ctx.globalAlpha = a * .9; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill(); }
  ctx.restore();
  // 가장자리 어둡게 + 가운데(판) 눌러 주기
  const v = ctx.createRadialGradient(cx, cy, D * .15, cx, cy, D); v.addColorStop(0, `rgba(0,0,0,${.35 * dim})`); v.addColorStop(.6, 'rgba(0,0,0,.05)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (const s of bg) { ctx.globalAlpha = s.a * (.7 + .3 * Math.sin(now / 1500 + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }
  ctx.globalAlpha = 1;
  drawBg(now, dt, people.size ? (doneAt ? .55 : 1) : .85); // 사람이 없을 땐 안내 글이 잘 보이게 조금 흐리게
  const size = Math.min(W, H) * .125;
  if (!people.size) {
    for (const b of idle) { b.t += dt * .12; b.ph += dt * FORMS[b.form].flap; const x = (.5 + .42 * Math.sin(b.t * 1.3 + b.form)) * W, y = (.5 + .38 * Math.sin(b.t * 1.7 + b.form * 2)) * H; drawButterfly(x, y, size * .9, b.form, b.ph, Math.sin(b.t * 2) * .35, .35); }
  } else {
    fitBoard();
    const { x: bx, y: by, w: bw, h: bh } = board, iw = rev.width || 1, ih = rev.height || 1, tw = bw / art.cols, th = bh / art.rows;
    // 숨은 작품: 아주 흐리게 + 드러난 조각
    const doneK = doneAt ? clamp((now - doneAt) / 1800, 0, 1) : 0;
    ctx.fillStyle = `rgba(0,0,0,${.82 * (1 - doneK)})`; ctx.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
    if (art.img.complete) { ctx.globalAlpha = .07 + doneK * .93; ctx.drawImage(art.img, bx, by, bw, bh); ctx.globalAlpha = 1; }
    ctx.drawImage(rev, bx, by, bw, bh);
    ctx.strokeStyle = `rgba(255,255,255,${.25 + doneK * .5})`; ctx.lineWidth = 1 + doneK * 2; ctx.strokeRect(bx - .5, by - .5, bw + 1, bh + 1);
    if (!doneAt) { ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath(); for (let c = 1; c < art.cols; c++) { ctx.moveTo(bx + c * tw, by); ctx.lineTo(bx + c * tw, by + bh); } for (let r = 1; r < art.rows; r++) { ctx.moveTo(bx, by + r * th); ctx.lineTo(bx + bw, by + r * th); } ctx.stroke(); }
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.life -= dt * 2; if (f.life <= 0) { flashes.splice(i, 1); continue; } ctx.fillStyle = `rgba(255,255,255,${f.life * .7})`; ctx.fillRect(bx + f.c * tw, by + f.r * th, tw, th); }
    // 진행 막대
    const pr = tiles.length ? revealed / tiles.length : 0, pw = Math.min(W * .5, 640), px = (W - pw) / 2, py = H * .055;
    { const tg = ctx.createLinearGradient(0, 0, 0, H * .11); tg.addColorStop(0, 'rgba(0,0,0,.75)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H * .11); }
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(px, py, pw, 4); ctx.fillStyle = '#fff'; ctx.fillRect(px, py, pw * pr, 4);
    ctx.font = `600 ${Math.round(clamp(W * .013, 14, 22))}px Pretendard, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(doneAt ? `${artTitle()} · 모두 함께 완성했어요` : `${artTitle()} · 함께 완성한 조각 ${revealed}/${tiles.length}`, W / 2, py - 10);
    // 떠다니는 조각
    const want = doneAt ? 0 : Math.min(26, 6 + people.size * 2);
    if (pieces.filter((p) => !p.fly).length < want && Math.random() < dt * 4) spawnPiece();
    const pr0 = clamp(Math.max(tw, th) * .55, 16, 46);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const q = pieces[i], t = q.t;
      if (q.fly) { // 제자리로 날아감
        q.fly.k = Math.min(1, q.fly.k + dt / .75); const e = 1 - Math.pow(1 - q.fly.k, 3);
        const tx = bx + (t.c + .5) * tw, ty = by + (t.r + .5) * th;
        q.x = q.fly.x + (tx - q.fly.x) * e; q.y = q.fly.y + (ty - q.fly.y) * e - Math.sin(e * Math.PI) * 60;
        if (q.fly.k >= 1) { pieces.splice(i, 1); reveal(t); continue; }
      } else {
        q.ph += dt; q.vx += Math.sin(q.ph * .7 + q.rot) * 14 * dt; q.vy += Math.cos(q.ph * .5 + q.rot * 2) * 14 * dt; q.vx *= .99; q.vy *= .99;
        const age = (now - q.born) / 1000; if (age < 2.5) { q.vx += (W / 2 - q.x) * .02 * dt; q.vy += (H / 2 - q.y) * .02 * dt; }
        q.x += q.vx * dt * 3; q.y += q.vy * dt * 3; q.x = clamp(q.x, -80, W + 80); q.y = clamp(q.y, H * .11, H + 80); // 위쪽 제목 줄은 비움 q.rot += dt * .3;
      }
      const r = q.fly ? pr0 * (1 - q.fly.k * .3) : pr0 * (1 + Math.sin(q.ph * 2) * .06);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.fly ? 0 : Math.sin(q.rot) * .4);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.save(); ctx.clip();
      if (art.img.complete) { const sx = t.c * iw / art.cols, sy = t.r * ih / art.rows, sw = iw / art.cols, sh = ih / art.rows, k = Math.max(r * 2 / sw, r * 2 / sh); ctx.drawImage(art.img, sx, sy, sw, sh, -sw * k / 2, -sh * k / 2, sw * k, sh * k); }
      ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r + 5 + Math.sin(q.ph * 3) * 2, 0, 6.283); ctx.stroke();
      ctx.restore();
    }
    // 나비
    const sp = Math.min(W, H) * .5;
    for (const p of people.values()) {
      p.dash = Math.max(0, p.dash - dt); p.dashCool = Math.max(0, p.dashCool - dt);
      const boost = p.dash > 0 ? 2.1 : 1, k = Math.min(1, 5 * dt);
      p.vx += (p.ix * sp * boost - p.vx) * k; p.vy += (p.iy * sp * boost - p.vy) * k;
      p.x = clamp(p.x + p.vx * dt / W, .02, .98); p.y = clamp(p.y + p.vy * dt / H, .04, .96);
      const v = Math.hypot(p.vx, p.vy), target = v > 20 ? clamp(Math.atan2(p.vx, -p.vy), -1.2, 1.2) * Math.min(1, v / sp) : 0;
      p.ang += (target - p.ang) * Math.min(1, 4 * dt);
      p.ph += dt * FORMS[p.form].flap * (1 + (boost - 1) * .6 + v / sp * .5);
      const x = p.x * W, y = p.y * H + Math.sin(p.ph * .5) * 4;
      if (p.dash > 0 && Math.random() < .6) sparkle(x, y, 60);
      // 조각 줍기
      const reach = size * FORMS[p.form].s * .42 + pr0;
      if (!doneAt) for (const q of pieces) if (!q.fly && Math.hypot(q.x - x, q.y - y) < reach) { q.fly = { x: q.x, y: q.y, k: 0 }; q.t.state = 2; p.score++; p.ch.send({ t: 'got', mine: p.score }); for (let i = 0; i < 10; i++) sparkle(q.x, q.y, 140); }
      const a = Math.min(1, (now - p.born) / 600); // 나타날 때 서서히
      drawButterfly(x, y, size, p.form, p.ph, p.ang, a);
      ctx.globalAlpha = .75 * a; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `500 ${Math.round(clamp(W * .009, 11, 16))}px Pretendard, sans-serif`;
      ctx.globalAlpha = a; ctx.font = `700 ${Math.round(clamp(W * .010, 12, 18))}px Pretendard, sans-serif`; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(p.nick, x, y + size * FORMS[p.form].s * .38);
      ctx.fillText(p.nick, x, y + size * FORMS[p.form].s * .38); ctx.globalAlpha = 1;
    }
    if (doneAt) finale(now);
  }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt * 1.6; if (s.life <= 0) { sparks.splice(i, 1); continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .95; s.vy *= .95; ctx.globalAlpha = s.life; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
function reveal(t) {
  t.state = 3; revealed++;
  const iw = rev.width, ih = rev.height, sw = iw / art.cols, sh = ih / art.rows;
  if (art.img.complete && iw) rctx.drawImage(art.img, t.c * sw, t.r * sh, sw, sh, t.c * sw, t.r * sh, sw, sh);
  flashes.push({ c: t.c, r: t.r, life: 1 });
  sendProg(false);
  if (revealed >= tiles.length && !doneAt) complete();
}
function complete() {
  doneAt = performance.now(); pieces = [];
  const ranked = [...people.values()].sort((a, b) => b.score - a.score);
  const top = ranked.filter((p) => p.score > 0).slice(0, 3).map((p) => ({ nick: p.nick, n: p.score }));
  sendProg(true);
  for (const p of people.values()) p.ch.send({ t: 'complete', title: artTitle(), img: art.url, mine: p.score, players: people.size, top, rank: ranked.indexOf(p) + 1 });
  for (let i = 0; i < 160; i++) sparkle(board.x + Math.random() * board.w, board.y + Math.random() * board.h, 260);
  layout();
  const r = round; setTimeout(() => { if (doneAt && round === r) startRound(round + 1); }, NEXT_AFTER * 1000);
}
function finale(now) { // 완성: 작품이 온전히 드러나고 함께한 나비들을 알림
  const k = clamp((now - doneAt) / 1500, 0, 1), list = [...people.values()].filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const big = Math.round(clamp(W * .03, 22, 52)), small = Math.round(clamp(W * .012, 13, 20)), y0 = Math.min(H - big - small * 2.6, board.y + board.h + 18);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = `rgba(255,255,255,${k})`;
  ctx.font = `800 ${big}px Pretendard, sans-serif`; ctx.fillText('모두 함께 완성했어요', W / 2, y0);
  ctx.font = `500 ${small}px Pretendard, sans-serif`; ctx.fillStyle = `rgba(255,255,255,${k * .75})`;
  ctx.fillText(`장승효 · 참여한 나비 ${people.size}마리${list.length ? '  ·  가장 많이 모은 나비 ' + list.map((p) => `${p.nick} ${p.score}`).join(' · ') : ''}`, W / 2, y0 + big * 1.3);
  if (Math.random() < .3) sparkle(board.x + Math.random() * board.w, board.y + Math.random() * board.h, 120);
}
requestAnimationFrame(frame);

/* ---------- 사이니지용 ---------- */
$('#fs').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); });
const keep = () => { if (navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').catch(() => {}); };
document.addEventListener('visibilitychange', keep); keep();
let idleT = 0;
const showCursor = () => { document.body.classList.remove('hide-cursor'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('hide-cursor'), KIOSK ? 800 : 3000); };
addEventListener('mousemove', showCursor); showCursor();
if (KIOSK) document.body.classList.add('kiosk');

openRoom(); startRound(0); layout();
if (location.hash === '#debug') window.__scr = { people, get pieces() { return pieces; }, get tiles() { return tiles; }, get code() { return code; }, get revealed() { return revealed; }, finishAll() { tiles.forEach((t) => { if (t.state < 3) reveal(t); }); } };
