// ARTMOS SCREEN — 큰 화면(디지털 사이니지·노트북·데스크톱). 휴대폰(remote.html)이 들어와 빛을 움직이고 별을 놓아 별자리를 남김.
// 연결은 screen-link.js. 휴대폰 입력은 그 휴대폰 통로로만 오고, 완성한 별자리는 그 휴대폰에만 보냄.
import { open, room, newCode, newId, linkMode } from './screen-link.js?v=1';
import { qrSVG } from './qr.js?v=1';

const $ = (s) => document.querySelector(s);
const MAX_P = 6, MAX_STARS = 12, DUR = 75; // 동시 인원 · 한 사람 별 수 · 한 사람 시간(초)
const SHAPES = ['circle', 'tri', 'square', 'diamond', 'cross', 'star'];
const NOUNS = ['등불', '고래', '새벽', '씨앗', '우산', '편지', '종', '나침반', '그네', '다리', '연', '물결', '숲', '열쇠', '돛', '등대', '새', '꽃잎', '찻잔', '사다리', '바람개비', '오르골', '창문', '모래시계'];
const SKY_KEY = 'artmos-screen-sky';
const params = new URLSearchParams(location.search);
const KIOSK = params.has('kiosk');
const me = 'screen-' + newId(), bornAt = Date.now();

/* ---------- 입장 숫자 · QR ---------- */
let code = '', main = null;
const players = new Map(); // pid → player
function remoteUrl(c) {
  const u = new URL('remote.html', location.href); u.search = '';
  u.searchParams.set('c', c); if (linkMode === 'local') u.searchParams.set('local', '1');
  return u.href;
}
function setCode(c) {
  code = c; const url = remoteUrl(c);
  $('#qr').innerHTML = qrSVG(url); $('#qr2').innerHTML = qrSVG(url);
  $('#code').textContent = c.split('').join(' '); $('#code2').textContent = c;
  $('#url').textContent = url.replace(/^https?:\/\//, '').replace(/\?.*$/, '') + '  ·  ' + c;
}
function openRoom() {
  if (main) main.close();
  setCode(newCode());
  const mine = code;
  main = open(room(code), onMain, {
    presence: me,
    onPresence(list) { // 같은 숫자를 먼저 쓰는 화면이 있으면 숫자를 바꿈
      if (mine !== code) return;
      if (list.some((s) => s.screen && s.screen !== me && s.at < bornAt) && !players.size) openRoom();
    },
  });
  main.ready.then((ok) => {
    $('#net').textContent = ok ? (linkMode === 'local' ? '시험 연결(같은 기기)' : '연결됨') : '연결 안 됨 · 다시 시도 중';
    $('#net').classList.toggle('bad', !ok);
    if (ok) main.track({ screen: me, at: bornAt }); else setTimeout(() => { if (mine === code) openRoom(); }, 4000);
  });
}

/* ---------- 참여자 ---------- */
function onMain(m) {
  if (!m || m.t !== 'join' || !m.pid) return;
  const ex = players.get(m.pid);
  if (ex) { ex.ch.send(welcomeMsg(ex)); return; } // 환영을 못 받아 다시 보낸 것
  const ch = open(room(code) + '-' + m.pid, (x) => onPlayer(m.pid, x));
  if (players.size >= MAX_P) { ch.ready.then(() => { ch.send({ t: 'full' }); setTimeout(() => ch.close(), 1500); }); return; }
  const used = new Set([...players.values()].map((p) => p.slot));
  let slot = 0; while (used.has(slot)) slot++;
  const p = {
    pid: m.pid, ch, slot, shape: SHAPES[slot], nick: String(m.nick || '').slice(0, 20) || `방랑자 ${slot + 1}`,
    x: .2 + Math.random() * .6, y: .25 + Math.random() * .5, vx: 0, vy: 0, ix: 0, iy: 0,
    stars: [], pull: false, seen: Date.now(), start: Date.now(), done: false, trail: [], flash: 0,
  };
  players.set(m.pid, p);
  ch.ready.then(() => ch.send(welcomeMsg(p)));
  toast(`${p.nick}님이 들어왔어요`); layout();
}
const welcomeMsg = (p) => ({ t: 'welcome', slot: p.slot, shape: p.shape, max: MAX_STARS, dur: DUR, left: Math.max(0, Math.round(DUR - (Date.now() - p.start) / 1000)) });
function onPlayer(pid, m) {
  const p = players.get(pid); if (!p || !m) return;
  p.seen = Date.now();
  if (m.t === 'in') { p.ix = clamp(+m.x || 0, -1, 1); p.iy = clamp(+m.y || 0, -1, 1); }
  else if (m.t === 'star' && !p.done) placeStar(p);
  else if (m.t === 'pull') p.pull = !!m.on && !p.done;
  else if (m.t === 'burst') burst(p);
  else if (m.t === 'done') finish(p);
  else if (m.t === 'again') { p.stars = []; p.done = false; p.start = Date.now(); p.ch.send(welcomeMsg(p)); layout(); }
  else if (m.t === 'bye') leave(p);
}
function leave(p) { if (!players.has(p.pid)) return; players.delete(p.pid); p.ch.close(); layout(); }
function placeStar(p) {
  if (p.stars.length >= MAX_STARS) return;
  p.stars.push({ x: p.x, y: p.y, t: performance.now() }); p.flash = 1;
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 140; sparks.push({ x: p.x * W, y: p.y * H, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 }); }
  p.ch.send({ t: 'state', n: p.stars.length });
  if (p.stars.length >= MAX_STARS) setTimeout(() => finish(p), 900);
  layout();
}
function burst(p) {
  const cx = p.x * W, cy = p.y * H, R = Math.min(W, H) * .3;
  for (const d of dust) { const dx = d.x - cx, dy = d.y - cy, r = Math.hypot(dx, dy); if (r < R && r > 1) { const f = (1 - r / R) * 520; d.vx += dx / r * f; d.vy += dy / r * f; } }
  ring.push({ x: cx, y: cy, r: 0, life: 1 });
}
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function nameFor(p) {
  const taken = new Set(kept.map((k) => k.name));
  let i = hash(p.nick + p.stars.map((s) => (s.x * 97 | 0) + (s.y * 89 | 0)).join(',')) % NOUNS.length;
  for (let k = 0; k < NOUNS.length && taken.has(NOUNS[i] + '자리'); k++) i = (i + 1) % NOUNS.length;
  return NOUNS[i] + '자리';
}
function finish(p) {
  if (p.done) return; p.done = true; p.pull = false;
  const sec = Math.round((Date.now() - p.start) / 1000);
  if (!p.stars.length) { p.ch.send({ t: 'result', n: 0, sec }); layout(); return; }
  const name = nameFor(p), pts = p.stars.map((s) => [+s.x.toFixed(4), +s.y.toFixed(4)]);
  const k = { name, pts, shape: p.shape, nick: p.nick, at: Date.now(), born: performance.now() };
  kept.push(k); while (kept.length > 24) kept.shift(); saveSky();
  p.ch.send({ t: 'result', name, pts, aspect: +(W / H).toFixed(3), n: pts.length, sec });
  p.stars = []; layout();
}
let hbTick = 0;
setInterval(() => { // 시간이 다 되면 마무리, 10초 동안 소식이 없으면 나간 것으로, 3초마다 '화면 살아 있음'
  const now = Date.now(), hb = ++hbTick % 6 === 0;
  for (const p of [...players.values()]) {
    if (hb) p.ch.send({ t: 'hb' });
    if (now - p.seen > 10000) leave(p);
    else if (!p.done && now - p.start > DUR * 1000) finish(p);
  }
  layout();
}, 500);

/* ---------- 남은 별자리 (이 화면에 쌓임, 이 기기에만 저장) ---------- */
let kept = [];
try { kept = (JSON.parse(localStorage.getItem(SKY_KEY) || '[]') || []).filter((k) => Date.now() - k.at < 7 * 864e5).map((k) => ({ ...k, born: -1e9 })); } catch (e) {}
const saveSky = () => { try { localStorage.setItem(SKY_KEY, JSON.stringify(kept.map(({ born, ...k }) => k))); } catch (e) {} };

/* ---------- 화면 배치 ---------- */
function layout() {
  const any = players.size > 0;
  $('#lobby').classList.toggle('off', any); $('#corner').hidden = !any;
  $('#players').innerHTML = [...players.values()].sort((a, b) => a.slot - b.slot).map((p) => {
    const left = Math.max(0, DUR - (Date.now() - p.start) / 1000);
    return `<div class="pl${p.done ? ' done' : ''}">${shapeSVG(p.shape)}<b>${esc(p.nick)}</b><span>${p.done ? '완성' : `별 ${p.stars.length}/${MAX_STARS}`}</span><i style="--w:${p.done ? 0 : left / DUR * 100}%"></i></div>`;
  }).join('');
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shapeSVG(s) {
  const P = { circle: '<circle cx="12" cy="12" r="7"/>', tri: '<path d="M12 4.5 20 19H4z"/>', square: '<rect x="5.5" y="5.5" width="13" height="13"/>', diamond: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>', cross: '<path d="M6 6l12 12M18 6 6 18"/>', star: '<path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z"/>' };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${P[s] || P.circle}</svg>`;
}
let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

/* ---------- 그림 ---------- */
const cv = $('#sky'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const bg = [], dust = [], sparks = [], ring = [];
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bg.length = 0; const nb = Math.round(W * H / 2600);
  for (let i = 0; i < nb; i++) bg.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + .2, a: Math.random() * .6 + .1, p: Math.random() * 6.3 });
  if (!dust.length) for (let i = 0; i < 1100; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, a: Math.random() * .45 + .1, s: Math.random() * 1.4 + .4 });
  else for (const d of dust) { d.x = Math.min(d.x, W); d.y = Math.min(d.y, H); }
}
addEventListener('resize', resize); resize();
const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();
function marker(s, x, y, r) {
  ctx.beginPath();
  if (s === 'circle') ctx.arc(x, y, r, 0, 6.283);
  else if (s === 'tri') { ctx.moveTo(x, y - r); ctx.lineTo(x + r * .95, y + r * .7); ctx.lineTo(x - r * .95, y + r * .7); ctx.closePath(); }
  else if (s === 'square') ctx.rect(x - r * .8, y - r * .8, r * 1.6, r * 1.6);
  else if (s === 'diamond') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
  else if (s === 'cross') { ctx.moveTo(x - r * .75, y - r * .75); ctx.lineTo(x + r * .75, y + r * .75); ctx.moveTo(x + r * .75, y - r * .75); ctx.lineTo(x - r * .75, y + r * .75); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  ctx.stroke();
}
function drawConst(pts, a, lineA, now, born) {
  ctx.strokeStyle = `rgba(255,255,255,${lineA})`; ctx.lineWidth = 1.2; ctx.beginPath();
  pts.forEach(([x, y], i) => { const px = x * W, py = y * H; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
  pts.forEach(([x, y], i) => { const tw = .75 + .25 * Math.sin(now / 700 + i * 1.7), s = 22 * tw; ctx.globalAlpha = a * tw; ctx.drawImage(glow, x * W - s / 2, y * H - s / 2, s, s); });
  ctx.globalAlpha = 1;
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // 먼 별
  for (const s of bg) { ctx.globalAlpha = s.a * (.7 + .3 * Math.sin(now / 1500 + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }
  // 성운 먼지 (끌어당기면 빛 쪽으로 모여 돎)
  const pulls = [...players.values()].filter((p) => p.pull).map((p) => ({ x: p.x * W, y: p.y * H }));
  const R = Math.min(W, H) * .32;
  for (const d of dust) {
    for (const c of pulls) { const dx = c.x - d.x, dy = c.y - d.y, r = Math.hypot(dx, dy) + 8; if (r < R) { const f = (1 - r / R) * 900 * dt; d.vx += dx / r * f - dy / r * f * .9; d.vy += dy / r * f + dx / r * f * .9; } }
    d.vx *= 1 - 1.6 * dt; d.vy *= 1 - 1.6 * dt; d.x += (d.vx + 4) * dt; d.y += (d.vy + 1.5) * dt;
    if (d.x > W) d.x -= W; if (d.x < 0) d.x += W; if (d.y > H) d.y -= H; if (d.y < 0) d.y += H;
    const sp = Math.min(1, Math.hypot(d.vx, d.vy) / 260); ctx.globalAlpha = d.a + sp * .5; ctx.fillStyle = '#fff'; ctx.fillRect(d.x, d.y, d.s + sp, d.s + sp);
  }
  ctx.globalAlpha = 1;
  // 남은 별자리
  ctx.font = '500 13px Pretendard, sans-serif'; ctx.textAlign = 'center';
  for (const k of kept) {
    const age = (now - k.born) / 1000, fresh = age < 8 ? 1 - age / 8 : 0, base = players.size ? .32 : .55;
    const a = base + fresh * (1 - base);
    drawConst(k.pts, a, a * .45, now, k.born);
    const by = Math.max(...k.pts.map((p) => p[1])) * H + 26, half = fresh > 0 ? 260 : 60;
    const cx = clamp(k.pts.reduce((s, p) => s + p[0], 0) / k.pts.length * W, half, W - half);
    if (fresh <= 0) { ctx.fillStyle = `rgba(255,255,255,${a * .8})`; ctx.fillText(k.name, cx, Math.min(H - 90, by)); }
    else { ctx.font = `600 ${22 + fresh * 10}px Pretendard, sans-serif`; ctx.fillStyle = `rgba(255,255,255,${fresh})`; ctx.fillText(`${k.nick}님의 ${k.name}`, cx, Math.min(H - 110, by + 10)); ctx.font = '500 13px Pretendard, sans-serif'; }
  }
  // 참여자 빛
  const sp = Math.min(W, H) * .55;
  for (const p of players.values()) {
    p.vx += (p.ix * sp - p.vx) * Math.min(1, 7 * dt); p.vy += (p.iy * sp - p.vy) * Math.min(1, 7 * dt);
    p.x = clamp(p.x + p.vx * dt / W, .03, .97); p.y = clamp(p.y + p.vy * dt / H, .05, .9);
    const x = p.x * W, y = p.y * H;
    p.trail.push([x, y]); if (p.trail.length > 26) p.trail.shift();
    if (p.stars.length) drawConst(p.stars.map((s) => [s.x, s.y]), 1, .7, now);
    if (p.stars.length && !p.done) { // 마지막 별에서 지금 빛까지 이어질 선
      const l = p.stars[p.stars.length - 1]; ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(l.x * W, l.y * H); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    }
    if (p.done) continue;
    ctx.lineCap = 'round';
    p.trail.forEach(([tx, ty], i) => { if (!i) return; const [px, py] = p.trail[i - 1]; ctx.strokeStyle = `rgba(255,255,255,${i / p.trail.length * .5})`; ctx.lineWidth = i / p.trail.length * 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke(); });
    const s = 54 + p.flash * 60 + (p.pull ? 18 * Math.sin(now / 90) : 0); ctx.drawImage(glow, x - s / 2, y - s / 2, s, s);
    p.flash = Math.max(0, p.flash - dt * 2.5);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; marker(p.shape, x, y, 15 + (p.pull ? 3 : 0));
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 13px Pretendard, sans-serif'; ctx.fillText(p.nick, x, y - 28);
  }
  // 불꽃·고리
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt * 1.4; if (s.life <= 0) { sparks.splice(i, 1); continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .96; s.vy *= .96; ctx.globalAlpha = s.life; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, 2, 2); }
  for (let i = ring.length - 1; i >= 0; i--) { const r = ring[i]; r.life -= dt * 1.2; r.r += dt * Math.min(W, H) * .5; if (r.life <= 0) { ring.splice(i, 1); continue; } ctx.globalAlpha = r.life; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke(); }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- 사이니지용: 전체 화면 · 화면 꺼짐 막기 · 마우스 숨기기 ---------- */
$('#fs').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); });
let wake = null;
const keep = () => { if (navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((w) => { wake = w; }).catch(() => {}); };
document.addEventListener('visibilitychange', keep); keep();
let idleT = 0;
const showCursor = () => { document.body.classList.remove('hide-cursor'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('hide-cursor'), KIOSK ? 800 : 3000); };
addEventListener('mousemove', showCursor); showCursor();
if (KIOSK) document.body.classList.add('kiosk');

openRoom(); layout();
if (location.hash === '#debug') window.__scr = { players, kept, get code() { return code; } };
