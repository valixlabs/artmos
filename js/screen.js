// ARTMOS SCREEN — 행성 뽑기(인형뽑기). 큰 화면(사이니지·노트북·데스크톱·스탠바이미)에 뽑기 기계, 휴대폰(remote.html)이 조이스틱.
// 캡슐 안에는 지금 열린 ARTMOS 전시 행성. 뽑은 행성은 그 폰에만 도착하고, 거기서 바로 전시로 갈 수 있음.
// 연결은 screen-link.js. 폰 입력은 그 폰 통로로만 오고, 결과도 그 폰에만 보냄.
import { open, room, newCode, newId, linkMode } from './screen-link.js?v=1';
import { qrSVG } from './qr.js?v=1';
import { loadLocalData } from './data.js?v=37';
import { planetURL } from './planets.js?v=4';

const $ = (s) => document.querySelector(s);
const MACHINES = 3, TRIES = 3, AIM = 20, QUEUE_MAX = 12; // 기계 수(동시 인원) · 한 사람 기회 · 한 번 조준 시간(초) · 대기 줄
const params = new URLSearchParams(location.search);
const KIOSK = params.has('kiosk');
const me = 'screen-' + newId(), bornAt = Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- 경품 = 열린 전시 ---------- */
const POSTER_S = { c005: 'assets/posters/c005-poster-s.webp', g001: 'assets/posters/g001-poster-s.webp', c007: 'assets/posters/c007-poster-s.webp', c008: 'assets/posters/c008-poster-s.webp', c009: 'assets/posters/c009-poster-s.webp' };
let prizes = [];
const short = (t) => String(t || '').replace(/^\s*(?:(?:CELL|X|N|A)\s*-?\s*\d+\s*[·:|–-]\s*)+/i, '');
loadLocalData().then(({ cells }) => {
  prizes = cells.filter((c) => c.status === 'open').map((c) => {
    const img = new Image(); img.src = planetURL(c, 128);
    const abs = (p) => (p ? new URL(p, location.href).href : '');
    return { id: c.id, code: c.code, title: short(c.title), artist: c.artist || '', url: abs(c.url || `cell.html?id=${encodeURIComponent(c.id)}`), img: abs(POSTER_S[c.id] || c.poster || ''), planet: img };
  });
  machines.forEach((m) => m.balls.forEach((b) => { b.prize = pickPrize(); }));
}).catch(() => {});

/* ---------- 기계 (가로 1000 × 세로 1300 단위) ---------- */
const MW = 1000, MH = 1300, RAIL = 120, FLOOR = 1190, R = 62, CH_L = 40, CH_R = 270, WALL_TOP = 1010, HOME = 155;
function makeMachine(i) {
  const m = { i, player: null, x: HOME, tip: RAIL + 70, open: 0, phase: 'idle', t: 0, held: null, grip: 0, aimEnd: 0, sway: 0, balls: [], flash: 0, msg: '', sparks: [], wob: 0, sw: 0, sv: 0 };
  for (let k = 0; k < 22; k++) addBall(m, CH_R + R + 10 + ((k * 137) % (MW - CH_R - 2 * R - 60)), 300 + (k % 6) * 130);
  return m;
}
const pickPrize = () => (prizes.length ? prizes[Math.floor(Math.random() * prizes.length)] : null);
function addBall(m, x, y) { m.balls.push({ x, y, vx: 0, vy: 0, prize: pickPrize(), rot: Math.random() * 6.28 }); }
const machines = Array.from({ length: MACHINES }, (_, i) => makeMachine(i));

function physics(m, dt) {
  const B = m.balls;
  for (const b of B) {
    if (b === m.held) continue;
    b.vy += 2200 * dt; b.vx *= 1 - 1.2 * dt; b.vy *= 1 - .4 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt / R;
    if (b.x < CH_L + R) { b.x = CH_L + R; b.vx = Math.abs(b.vx) * .4; }
    if (b.x > MW - 40 - R) { b.x = MW - 40 - R; b.vx = -Math.abs(b.vx) * .4; }
    const inChute = b.x < CH_R;
    if (!inChute && b.y > FLOOR - R) { b.y = FLOOR - R; b.vy = -b.vy * .25; b.vx *= .9; }
    // 칸막이 벽(배출구와 캡슐 더미 사이)
    if (b.y > WALL_TOP - R * .7) {
      if (b.x > CH_R - R && b.x < CH_R + 20 + R && !inChute) { b.x = CH_R + 20 + R; b.vx = Math.abs(b.vx) * .3; }
      else if (inChute && b.x > CH_R - R) { b.x = CH_R - R; b.vx = -Math.abs(b.vx) * .3; }
    }
  }
  for (let s = 0; s < 3; s++) for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const a = B[i], b = B[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = R * 2;
    if (d > 0 && d < min) {
      const nx = dx / d, ny = dy / d, o = (min - d) / 2, ha = a === m.held, hb = b === m.held;
      if (!ha) { a.x -= nx * o * (hb ? 2 : 1); a.y -= ny * o * (hb ? 2 : 1); }
      if (!hb) { b.x += nx * o * (ha ? 2 : 1); b.y += ny * o * (ha ? 2 : 1); }
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const imp = -rv * .6; if (!ha) { a.vx -= nx * imp; a.vy -= ny * imp; } if (!hb) { b.vx += nx * imp; b.vy += ny * imp; } }
    }
  }
}

// 결과는 집게가 닫히는 순간 '얼마나 가운데로 잡았나(grip)'로 정하고, 그다음 움직임이 그 결과를 연기함
// 승률(대략): 아주 가운데 42% · 조금 빗나감 24% · 많이 빗나감 10% · 그보다 더 빗나가면 헛손질 → 평균 20~30%
const winChance = (g) => (g >= .85 ? .42 : g >= .6 ? .24 : .1);
function step(m, dt, now) {
  physics(m, dt);
  m.flash = Math.max(0, m.flash - dt * 1.5);
  const p = m.player;
  const toward = (target, sp) => { const d = target - m.x; m.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt); return Math.abs(d) < 2; };
  // 줄 흔들림: 집게가 가속·멈출 때 반대로 흔들렸다가 잦아듦
  const v = (m.x - (m.px ?? m.x)) / Math.max(dt, 1e-3), acc = (v - (m.v || 0)) / Math.max(dt, 1e-3);
  m.px = m.x; m.v = v;
  m.sv = (m.sv || 0) + (-(m.sw || 0) * 16 - clamp(acc, -6000, 6000) * .00042) * dt; m.sv *= 1 - 2.6 * dt;
  m.sw = clamp((m.sw || 0) + m.sv * dt, -.32, .32);
  const L = m.tip - RAIL - 20; m.hx = m.x + Math.sin(m.sw) * L; m.hy = RAIL + 20 + Math.cos(m.sw) * L; // 집게 머리 실제 위치
  // 흔들려 미끄러지는 중이면 캡슐이 떨림
  if (m.held) {
    const jig = m.wob > 0 ? Math.sin(now / 28) * 7 * (m.wob / .5) : 0, sag = m.wob > 0 ? (1 - m.wob / .5) * R * .35 : 0;
    m.held.x = m.hx + Math.sin(m.sw) * R * .95 + jig; m.held.y = m.hy + Math.cos(m.sw) * R * .95 + sag; m.held.vx = m.held.vy = 0;
  }
  if (m.wob > 0) { m.wob -= dt; if (m.wob <= 0) { drop(m, m.slipVx || 0); send(m, { t: 'phase', p: 'slipped' }); m.msg = ''; } }
  // 배출구로 떨어진 캡슐
  for (let i = m.balls.length - 1; i >= 0; i--) {
    const b = m.balls[i];
    if (b.x < CH_R && b.y > FLOOR + R) { m.balls.splice(i, 1); if (m.player && (m.phase === 'release' || m.phase === 'settle' || m.phase === 'carry')) { m.wonBall = b; burst(m, (CH_L + CH_R) / 2, FLOOR); } }
  }
  for (let i = m.sparks.length - 1; i >= 0; i--) { const s = m.sparks[i]; s.life -= dt * 1.3; if (s.life <= 0) { m.sparks.splice(i, 1); continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; }
  switch (m.phase) {
    case 'idle': m.sway += dt; toward(HOME + Math.sin(m.sway * .6) * 30, 120); m.open += (.15 - m.open) * dt * 4; break;
    case 'aim':
      m.open += (.15 - m.open) * dt * 6;
      m.x = clamp(m.x + (p ? p.ix : 0) * 560 * dt, CH_R + R * .6, MW - 40 - R * .6);
      if (now > m.aimEnd) grab(m);
      break;
    case 'drop': { // 벌리면서 점점 빨리 내려감 → 캡슐에 닿으면 살짝 튐
      m.open = Math.min(1, m.open + dt * 3); m.dv = Math.min(900, (m.dv || 150) + 1500 * dt); m.tip += m.dv * dt;
      const hit = m.balls.some((b) => Math.abs(b.x - m.hx) < R * .95 && m.tip > b.y - R * 1.05);
      if (hit || m.tip > FLOOR - R * 2) { m.tip -= 10; m.phase = 'close'; m.t = 0; m.dv = 0; m.decided = false; m.out = ''; m.target = null; send(m, { t: 'phase', p: 'close' }); }
      break;
    }
    case 'close': {
      m.t += dt;
      if (!m.decided) { m.decided = true; // 닿은 순간 결과를 정함 (프레임 길이와 상관없이 한 번)
        let best = null, bd = 1e9;
        for (const b of m.balls) { const d = Math.hypot(b.x - m.hx, b.y - (m.tip + R)); if (d < R * 1.1 && d < bd) { bd = d; best = b; } }
        m.grip = best ? clamp(1 - Math.abs(best.x - m.hx) / (R * 1.05), 0, 1) : 0;
        if (!best || m.grip < .28) { m.out = 'miss'; m.target = null; if (best) best.vx += Math.sign(best.x - m.hx || 1) * 160; }
        else { m.target = best; m.out = Math.random() < winChance(m.grip) ? 'win' : (Math.random() < .55 ? 'slipRise' : 'slipCarry'); }
        (m.hist = m.hist || []).push(`${m.out}:${m.grip.toFixed(2)}`); if (m.hist.length > 60) m.hist.shift();
        m.shut = m.out === 'win' ? 1 : m.out === 'miss' ? 1 : .72; // 헐겁게 잡힐 결과는 덜 오므림
      }
      m.open = Math.max(1 - m.shut, 1 - m.t / .6 * m.shut);
      if (m.t > .6) {
        if (m.target) m.held = m.target;
        m.phase = 'rise'; m.t = 0; m.slipAt = .3 + Math.random() * .5; m.checked = false; m.carryFrom = 0;
        send(m, { t: 'phase', p: m.out === 'miss' ? 'miss' : 'rise' });
      }
      break;
    }
    case 'rise':
      m.tip -= Math.min(480, 120 + m.t * 900) * dt; m.t += dt;
      if (m.held && m.out === 'slipRise' && !m.checked && m.t > m.slipAt) { m.checked = true; slip(m, (Math.random() - .5) * 120); }
      if (m.tip <= RAIL + 70) { m.tip = RAIL + 70; m.phase = 'carry'; m.carryFrom = m.x; m.t = 0; }
      break;
    case 'carry': {
      m.t += dt; const sp = Math.min(430, 80 + m.t * 700);
      const half = (m.carryFrom + HOME) / 2;
      if (m.held && m.out === 'slipCarry' && !m.wob && m.x < half + 40 && m.x > CH_R + R * 2.5) slip(m, -90);
      if (m.held && m.out === 'slipCarry' && m.x <= CH_R + R * 2.5 && !m.wob) { slip(m, 0); } // 너무 가까우면 바로 미끄러짐(배출구에 안 들어가게 칸막이 쪽에)
      if (!m.wob && toward(HOME, sp)) { m.phase = 'release'; m.t = 0; }
      break;
    }
    case 'release':
      m.t += dt; m.open = Math.min(1, m.open + dt * 3);
      if (m.t > .25 && m.held) drop(m, 0);
      if (m.t > .45) { m.phase = 'settle'; m.t = 0; }
      break;
    case 'settle':
      m.t += dt; m.open += (.15 - m.open) * dt * 3;
      if (m.wonBall) { const b = m.wonBall; m.wonBall = null; finishTry(m, b.prize, 'win'); }
      else if (m.t > 1.4) finishTry(m, null, m.out === 'miss' ? 'miss' : 'slip');
      break;
    case 'show': m.t += dt; if (m.t > 2) nextTry(m); break;
  }
  if (m.balls.length < 12 && m.phase !== 'settle' && m.phase !== 'release') addBall(m, CH_R + R + Math.random() * (MW - CH_R - 2 * R - 80), -R);
}
function slip(m, vx) { m.wob = .5; m.slipVx = vx; send(m, { t: 'phase', p: 'slip' }); }
function burst(m, x, y) { m.flash = 1; for (let i = 0; i < 36; i++) { const a = -Math.PI * Math.random(), s = 300 + Math.random() * 700; m.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 }); } }
function drop(m, vx = 0) { if (!m.held) return; if (m.phase !== 'release') { m.held.x = Math.max(m.held.x, CH_R + 24 + R); vx = Math.max(vx, m.held.x < CH_R + R * 2 ? 40 : vx); } m.held.vy = 80; m.held.vx = vx; m.held = null; m.wob = 0; }
function grab(m) { if (m.phase !== 'aim') return; m.phase = 'drop'; m.dv = 150; send(m, { t: 'phase', p: 'drop' }); }
const MSG = { win: '뽑았다!', miss: '놓쳤다!', slip: '아깝다!' };
function finishTry(m, prize, why) {
  const p = m.player; m.phase = 'show'; m.t = 0; m.msg = MSG[why];
  if (!p) return;
  p.tries--; if (prize) p.won.push(prize);
  send(m, { t: 'result', win: !!prize, why, prize: prize && pub(prize), tries: p.tries });
  if (prize) toast(`${p.nick}님이 ${prize.code} ${prize.title} 행성을 뽑았어요`);
  layout();
}
const pub = (z) => ({ id: z.id, code: z.code, title: z.title, artist: z.artist, url: z.url, img: z.img });
function nextTry(m) {
  const p = m.player; m.msg = '';
  if (!p) { m.phase = 'idle'; return; }
  if (p.tries > 0) { if (p.ready) startAim(m); else { m.phase = 'wait'; m.waitAt = performance.now(); } }
  else { send(m, { t: 'over', won: p.won.map(pub) }); freeMachine(m); }
}
function startAim(m) { m.phase = 'aim'; m.aimEnd = performance.now() + AIM * 1000; m.player.ready = false; send(m, { t: 'aim', left: AIM, tries: m.player.tries }); }
const send = (m, msg) => { if (m.player) m.player.ch.send(msg); };

/* ---------- 입장 숫자 · QR ---------- */
let code = '', main = null;
const people = new Map(); // pid → 사람 (기계에 있거나 줄 서 있음)
const queue = [];
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

/* ---------- 사람 · 줄 서기 ---------- */
function onMain(m) {
  if (!m || m.t !== 'join' || !m.pid) return;
  const ex = people.get(m.pid);
  if (ex) { greet(ex); return; }
  const ch = open(room(code) + '-' + m.pid, (x) => onPerson(m.pid, x));
  if (people.size >= MACHINES + QUEUE_MAX) { ch.ready.then(() => { ch.send({ t: 'full' }); setTimeout(() => ch.close(), 1500); }); return; }
  const p = { pid: m.pid, ch, nick: String(m.nick || '').slice(0, 20) || '방랑자', ix: 0, seen: Date.now(), machine: null, tries: TRIES, won: [], ready: true };
  people.set(m.pid, p); queue.push(p);
  ch.ready.then(() => seat());
  toast(`${p.nick}님이 들어왔어요`); layout();
}
function greet(p) {
  if (p.machine) p.ch.send({ t: 'welcome', machine: p.machine.i + 1, tries: p.tries, aim: AIM });
  else p.ch.send({ t: 'queue', pos: queue.indexOf(p) + 1 });
}
function seat() { // 빈 기계에 줄 맨 앞 사람을 앉힘
  for (const m of machines) {
    if (m.player || !queue.length) continue;
    const p = queue.shift(); m.player = p; p.machine = m; p.tries = TRIES; p.won = []; p.ready = true;
    m.held = null; m.tip = RAIL + 70; m.msg = ''; m.wonBall = null; m.wob = 0;
    greet(p); startAim(m);
  }
  queue.forEach((p, i) => p.ch.send({ t: 'queue', pos: i + 1 }));
  layout();
}
function freeMachine(m) { const p = m.player; if (p) p.machine = null; m.player = null; drop(m); m.wonBall = null; m.phase = 'idle'; seat(); }
function onPerson(pid, msg) {
  const p = people.get(pid); if (!p || !msg) return;
  p.seen = Date.now();
  const m = p.machine;
  if (msg.t === 'in') p.ix = clamp(+msg.x || 0, -1, 1);
  else if (msg.t === 'grab' && m) grab(m);
  else if (msg.t === 'next' && m) { p.ready = true; if (m.phase === 'wait') startAim(m); }
  else if (msg.t === 'again' && !m && !queue.includes(p)) { p.tries = TRIES; queue.push(p); seat(); }
  else if (msg.t === 'bye') leave(p);
}
function leave(p) {
  if (!people.has(p.pid)) return;
  people.delete(p.pid); const qi = queue.indexOf(p); if (qi >= 0) queue.splice(qi, 1);
  if (p.machine) freeMachine(p.machine); else seat();
  p.ch.close(); layout();
}
let hbTick = 0;
setInterval(() => {
  const now = Date.now(), hb = ++hbTick % 6 === 0;
  for (const p of [...people.values()]) { if (hb) p.ch.send({ t: 'hb' }); if (now - p.seen > 10000) leave(p); }
  for (const m of machines) if (m.phase === 'wait' && m.player && performance.now() - m.waitAt > 15000) startAim(m); // '다음'을 안 눌러도 15초 뒤엔 계속
}, 500);

/* ---------- 화면 배치 ---------- */
function layout() {
  const any = people.size > 0;
  $('#lobby').classList.toggle('off', any); $('#corner').hidden = !any;
  $('#players').innerHTML = queue.length ? `<div class="pl q"><b>기다리는 사람 ${queue.length}명</b><span>${queue.slice(0, 4).map((p) => esc(p.nick)).join(' · ')}${queue.length > 4 ? ' …' : ''}</span></div>` : '';
}
let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }

/* ---------- 그림 ---------- */
const cv = $('#sky'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const bg = [];
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bg.length = 0; for (let i = 0, n = Math.round(W * H / 2600); i < n; i++) bg.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + .2, a: Math.random() * .6 + .1, p: Math.random() * 6.3 });
}
addEventListener('resize', resize); resize();
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function drawBall(b) {
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.clip();
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(-R, -R, R * 2, R * 2);
  const pl = b.prize && b.prize.planet;
  if (pl && pl.complete && pl.naturalWidth) { ctx.save(); ctx.rotate(b.rot * .3); ctx.drawImage(pl, -R * .78, -R * .78, R * 1.56, R * 1.56); ctx.restore(); }
  const g = ctx.createRadialGradient(-R * .35, -R * .45, R * .1, 0, 0, R);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.35, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(255,255,255,.22)');
  ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, R, R * .22, 0, 0, 6.283); ctx.stroke(); // 캡슐 이음매
}
function drawClaw(m) {
  const o = m.open, L = m.tip - RAIL - 20;
  ctx.fillStyle = '#fff'; rr(m.x - 50, RAIL - 8, 100, 32, 9); ctx.fill(); // 이동 장치
  ctx.save(); ctx.translate(m.x, RAIL + 20); ctx.rotate(-m.sw); // 줄 끝에 매달려 흔들림
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, L - 40); ctx.stroke();
  ctx.translate(0, L);
  ctx.fillStyle = '#fff'; rr(-36, -44, 72, 44, 12); ctx.fill(); // 집게 머리
  ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) { // 집게 팔 두 개: 벌렸다가 오므리면 캡슐 아래를 감쌈
    ctx.save(); ctx.translate(s * 28, -8); ctx.rotate(s * (o * .7 - .05));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * R * .62, R * .55); ctx.lineTo(s * R * .5, R * 1.25); ctx.lineTo(s * R * .05, R * 1.6); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function drawMachine(m, ox, oy, sc, now) {
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  // 머리판
  ctx.fillStyle = '#0d0d0d'; rr(0, -130, MW, 120, 26); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = "400 30px 'ARTMOS Michroma', sans-serif"; ctx.fillText(`ARTMOS  0${m.i + 1}`, 40, -88);
  const p = m.player;
  ctx.font = '700 44px Pretendard, sans-serif'; ctx.fillStyle = p ? '#fff' : 'rgba(255,255,255,.4)'; ctx.fillText(p ? p.nick : '비어 있어요', 40, -42);
  if (p) {
    ctx.textAlign = 'right';
    for (let k = 0; k < TRIES; k++) { ctx.beginPath(); ctx.arc(MW - 50 - k * 34, -88, 11, 0, 6.283); ctx.fillStyle = k < p.tries ? '#fff' : 'rgba(255,255,255,.18)'; ctx.fill(); }
    if (m.phase === 'aim') { const left = Math.max(0, (m.aimEnd - now) / 1000); ctx.fillStyle = left < 5 ? '#fff' : 'rgba(255,255,255,.75)'; ctx.font = '800 46px Pretendard, sans-serif'; ctx.fillText(`${Math.ceil(left)}초`, MW - 40, -40); }
  }
  // 유리 상자
  const g = ctx.createLinearGradient(0, 0, MW, MH); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.5, 'rgba(255,255,255,.02)'); g.addColorStop(1, 'rgba(255,255,255,.06)');
  ctx.fillStyle = '#050505'; rr(0, 0, MW, MH, 30); ctx.fill(); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = m.flash ? `rgba(255,255,255,${.5 + m.flash * .5})` : 'rgba(255,255,255,.45)'; ctx.lineWidth = 4 + m.flash * 8; ctx.stroke();
  ctx.save(); rr(0, 0, MW, MH, 30); ctx.clip();
  // 레일
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, RAIL + 9); ctx.lineTo(MW - 40, RAIL + 9); ctx.stroke();
  // 배출구 · 칸막이
  ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(CH_L, WALL_TOP, CH_R - CH_L, MH - WALL_TOP);
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(CH_R, WALL_TOP, 20, FLOOR - WALL_TOP);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(CH_R + 20, FLOOR, MW - CH_R - 60, 6);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = "400 26px 'ARTMOS Michroma', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('OUT', (CH_L + CH_R) / 2, FLOOR + 60);
  ctx.setLineDash([10, 12]); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CH_L, FLOOR); ctx.lineTo(CH_R, FLOOR); ctx.stroke(); ctx.setLineDash([]);
  // 조준선
  if (m.phase === 'aim') { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.moveTo(m.hx ?? m.x, m.tip + R * 1.7); ctx.lineTo(m.hx ?? m.x, FLOOR); ctx.stroke(); ctx.setLineDash([]); }
  for (const b of m.balls) if (b !== m.held) drawBall(b);
  if (m.held) drawBall(m.held);
  drawClaw(m);
  for (const sp of m.sparks) { ctx.globalAlpha = sp.life; ctx.fillStyle = '#fff'; ctx.fillRect(sp.x - 3, sp.y - 3, 6, 6); }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (m.msg) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, m.t * 3)})`; ctx.font = '800 110px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(m.msg, MW / 2, MH * .4); }
  ctx.restore();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.033, (now - last) / 1000); last = now;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (const s of bg) { ctx.globalAlpha = s.a * (.7 + .3 * Math.sin(now / 1500 + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }
  ctx.globalAlpha = 1;
  for (const m of machines) step(m, dt, now);
  if (people.size) {
    const lastUsed = machines.reduce((k, m, i) => (m.player ? i : k), 0);
    const shown = machines.slice(0, lastUsed + 1); // 쓰는 기계까지 왼쪽부터
    const n = shown.length, gap = 36, side = Math.min(W * .2, 280), top = 150 * Math.min(1, H / 900) + 30, bottom = 70;
    const sc = Math.min((H - top - bottom) / MH, (W - side - 60 - gap * (n - 1)) / (n * MW));
    const total = n * MW * sc + gap * (n - 1), ox0 = (W - side - total) / 2 + 20;
    shown.forEach((m, k) => drawMachine(m, ox0 + k * (MW * sc + gap), top, sc, now));
  }
  requestAnimationFrame(frame);
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

openRoom(); layout();
if (location.hash === '#debug') window.__scr = { people, queue, machines, get code() { return code; } };
