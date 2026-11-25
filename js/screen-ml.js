// ARTMOS SCREEN — 김규진 · MUCH LOVED (2026-11-25 소유자: 스크린에도 하나 추가)
// 큰 화면 가운데 애착 인형(레진 조각) 하나가 차갑게 바랜 채 서 있고, 휴대폰마다 작은 손 하나.
// '쓰다듬기'를 누르고 있으면 손이 지나간 자리부터 원래 색과 금빛 온기가 돌아옴(닳은 자리 = 사랑받은 자리).
// 두 사람 이상이 함께 쓰다듬으면 인형이 폭 안기며 심장이 뛰고 더 빨리 채워짐. 다 채우면 금빛으로 빛나고 다음 인형.
// 연결 방식은 나비의 정원(screen.js)과 같음: 폰 입력은 그 폰 통로로만, 진행률·완성은 큰 통로로.
import { open, room, newCode, newId, linkMode } from './screen-link.js?v=1';
import { qrSVG } from './qr.js?v=1';

const $ = (s) => document.querySelector(s);
const MAX_P = 30, NEXT_AFTER = 20, GOAL = .78; // 인형 넓이의 78%를 채우면 완성(가는 귀·꼬리 끝까지는 어려워서)
const params = new URLSearchParams(location.search);
const KIOSK = params.has('kiosk');
const me = 'screen-' + newId(), bornAt = Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const abs = (p) => new URL(p, location.href).href;
const img = (src) => { const i = new Image(); i.src = src; return i; };

/* ---------- 인형 (작가 계약·사진 사용 허락 — MUCH LOVED 전시와 같은 그림) ---------- */
const A = 'assets/muchloved/r/';
const DOLLS = [
  ['snow', 'SNOW', '손때 묻은 자리가 빛나요. 그만큼 오래 쥐었다는 뜻이에요'],
  ['fufu', 'FU FU', '안겨 있던 시간이 몸에 남았어요'],
  ['hobby', 'HOBBY', '흔들리고 빠져나가도, 곁에 남았어요'],
  ['moon', 'MOON', '터진 실밥까지 그대로 굳혀 두었어요'],
  ['mas', 'MAS', '이름을 부르면, 언제나 돌아봐요'],
  ['floopy', 'FLOOPY', '납작해진 곳은 기대어 잠들던 자리예요'],
  ['jake', 'JAKE', '함께 뒹굴던 소파의 먼지까지'],
  ['dino', 'DINO', '해진 곳도 그대로, 사랑받은 자리예요'],
  ['peanut-frame', 'PEANUT', '반들해진 곳은 자꾸 만지던 자리예요'],
].map(([id, name, line]) => ({ id, name, line, src: A + id + '_color.webp?v=2', im: img(A + id + '_color.webp?v=2') }));
const HUES = [18, 42, 200, 330, 150, 265, 8, 95, 225, 300]; // 손 색(사람마다)

/* ---------- 사랑 지도: 인형 모양 안의 '채워진 정도' ---------- */
const LW = 150; let LH = 200, mask = null, cov = null, inside = 0, covered = 0, dollRef = null;
const covCv = document.createElement('canvas'), covCtx = covCv.getContext('2d');
let covImg = null;
function buildMask(d) {
  if (!d.im.complete || !d.im.naturalWidth) return false;
  LH = Math.round(LW * d.im.naturalHeight / d.im.naturalWidth);
  const c = document.createElement('canvas'); c.width = LW; c.height = LH; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(d.im, 0, 0, LW, LH); const a = g.getImageData(0, 0, LW, LH).data;
  mask = new Uint8Array(LW * LH); cov = new Float32Array(LW * LH); inside = 0; covered = 0;
  for (let i = 0; i < LW * LH; i++) if (a[i * 4 + 3] > 140) { mask[i] = 1; inside++; }
  covCv.width = LW; covCv.height = LH; covImg = covCtx.createImageData(LW, LH); dollRef = d; return true;
}
function stamp(u, v, r, amt, p) { // u,v 0~1(인형 그림 기준), r은 지도 픽셀
  if (!mask) return 0;
  const cx = u * LW, cy = v * LH, x0 = Math.max(0, cx - r | 0), x1 = Math.min(LW - 1, cx + r | 0), y0 = Math.max(0, cy - r | 0), y1 = Math.min(LH - 1, cy + r | 0);
  let gainN = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * LW + x; if (!mask[i]) continue;
    const d = Math.hypot(x - cx, y - cy) / r; if (d > 1) continue;
    const old = cov[i], nv = Math.min(1, old + amt * (1 - d * d));
    if (nv === old) continue; cov[i] = nv;
    if (old < .5 && nv >= .5) { covered++; gainN++; }
  }
  if (gainN && p) p.cnt += gainN;
  return gainN;
}
function paintCov() { const d = covImg.data; for (let i = 0; i < LW * LH; i++) { d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; d[i * 4 + 3] = mask[i] ? Math.min(255, cov[i] * 300) : 0; } covCtx.putImageData(covImg, 0, 0); }
const progress = () => inside ? Math.min(1, covered / (inside * GOAL)) : 0;

/* ---------- 판 ---------- */
let round = 0, doll = DOLLS[0], doneAt = 0, hugT = 0, hugOn = 0, beatAt = 0;
function startRound(k) {
  round = k; doll = DOLLS[k % DOLLS.length]; doneAt = 0; mask = null; hugT = 0;
  for (const p of people.values()) p.cnt = 0;
  if (main) main.send({ t: 'round', title: doll.name, total: 100 });
  sendProg(true); layout();
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
const hzFor = (n) => clamp(Math.floor(90 / Math.max(1, n)), 3, 15);
let lastHz = 0;
function onMain(m) {
  if (!m || m.t !== 'join' || !m.pid) return;
  const ex = people.get(m.pid); if (ex) { ex.ch.send(welcome(ex)); return; }
  const ch = open(room(code) + '-' + m.pid, (x) => onPerson(m.pid, x));
  if (people.size >= MAX_P) { ch.ready.then(() => { ch.send({ t: 'full' }); setTimeout(() => ch.close(), 1500); }); return; }
  const used = new Set([...people.values()].map((p) => p.hue));
  const hue = HUES.find((h) => !used.has(h)) ?? Math.floor(Math.random() * 360);
  const p = { pid: m.pid, ch, nick: String(m.nick || '').slice(0, 20) || '손', hue, x: .2 + Math.random() * .6, y: .3 + Math.random() * .5, vx: 0, vy: 0, ix: 0, iy: 0, rub: false, on: false, cnt: 0, seen: Date.now(), born: performance.now(), ph: Math.random() * 6 };
  people.set(m.pid, p);
  ch.ready.then(() => ch.send(welcome(p)));
  toast(`${p.nick}님의 손이 들어왔어요`); layout(); rate();
}
const myPct = (p) => inside ? Math.round(p.cnt / inside * 100) : 0;
const welcome = (p) => ({ t: 'welcome', game: 'ml', hue: p.hue, formName: '따뜻한 손', hz: hzFor(people.size), title: doll.name, total: 100, done: Math.round(progress() * 100), mine: myPct(p) });
function rate() { const hz = hzFor(people.size); if (hz !== lastHz && main) { lastHz = hz; main.send({ t: 'rate', hz }); } }
function onPerson(pid, msg) {
  const p = people.get(pid); if (!p || !msg) return;
  p.seen = Date.now();
  if (msg.t === 'in') { p.ix = clamp(+msg.x || 0, -1, 1); p.iy = clamp(+msg.y || 0, -1, 1); }
  else if (msg.t === 'rub') p.rub = !!msg.on;
  else if (msg.t === 'bye') leave(p);
}
function leave(p) { if (!people.has(p.pid)) return; people.delete(p.pid); p.ch.close(); layout(); rate(); }
let hbTick = 0;
setInterval(() => { const now = Date.now(), hb = ++hbTick % 6 === 0; for (const p of [...people.values()]) { if (hb) p.ch.send({ t: 'hb' }); if (now - p.seen > 10000) leave(p); } }, 500);
let progAt = 0, mineAt = 0;
function sendProg(force) { const now = performance.now(); if (!main || (!force && now - progAt < 900)) return; progAt = now; main.send({ t: 'prog', done: Math.round(progress() * 100), total: 100 }); }

/* ---------- 화면 배치 ---------- */
function layout() {
  const any = people.size > 0;
  $('#lobby').classList.toggle('off', any); $('#corner').hidden = !any;
  $('#players').innerHTML = any && !doneAt ? `<div class="pl q"><b>손 ${people.size}개</b><span>함께 인형을 쓰다듬고 있어요</span></div>` : '';
}
let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

/* ---------- 그림 ---------- */
const cv = $('#sky'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const motes = [], sparks = [], rings = [];
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  motes.length = 0; for (let i = 0; i < 90; i++) motes.push({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, s: .006 + Math.random() * .014, p: Math.random() * 6.3 });
}
addEventListener('resize', resize); resize();
const warmCv = document.createElement('canvas'), warmCtx = warmCv.getContext('2d');
function sparkle(x, y, sp = 120, gold = true) { const a = Math.random() * 6.283, s = sp * (.3 + Math.random()); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 1, r: 1.2 + Math.random() * 2.4, gold }); }
function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * .3); ctx.bezierCurveTo(x, y - s * .2, x - s, y - s * .2, x - s, y + s * .25); ctx.bezierCurveTo(x - s, y + s * .7, x, y + s * .95, x, y + s * 1.15); ctx.bezierCurveTo(x, y + s * .95, x + s, y + s * .7, x + s, y + s * .25); ctx.bezierCurveTo(x + s, y - s * .2, x, y - s * .2, x, y + s * .3); ctx.fill(); }
function drawHand(x, y, s, hue, pressing, a) { // 둥근 손바닥 + 손가락 넷(위)
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(pressing ? .9 : 1, pressing ? .9 : 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6); g.addColorStop(0, `hsla(${hue},90%,75%,${pressing ? .45 : .22})`); g.addColorStop(1, `hsla(${hue},90%,75%,0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, 6.283); ctx.fill();
  ctx.fillStyle = `hsl(${hue},70%,88%)`; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { const fx = (-0.45 + k * .3) * s, fh = s * (k === 1 || k === 2 ? .62 : .5); ctx.beginPath(); ctx.ellipse(fx, -s * .38 - fh * .45, s * .13, fh * .5, 0, 0, 6.283); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(s * .55, s * .02, s * .13, s * .3, -.9, 0, 6.283); ctx.fill(); ctx.stroke(); // 엄지
  ctx.beginPath(); ctx.ellipse(0, 0, s * .58, s * .5, 0, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.restore();
}

let last = performance.now(), dollBox = { x: 0, y: 0, w: 1, h: 1 };
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
  if (dollRef !== doll || !mask) buildMask(doll);
  // 방: 따뜻한 어둠 + 위에서 내려오는 핀 조명
  ctx.fillStyle = '#0b0806'; ctx.fillRect(0, 0, W, H);
  const pr = progress(), warm = doneAt ? 1 : pr;
  { const g = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .7); g.addColorStop(0, `rgba(${90 + 60 * warm},${60 + 40 * warm},${40 + 10 * warm},.55)`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(255,230,190,${.10 + .08 * warm})`); g.addColorStop(1, 'rgba(255,230,190,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W * .44, 0); ctx.lineTo(W * .56, 0); ctx.lineTo(W * .72, H); ctx.lineTo(W * .28, H); ctx.closePath(); ctx.fill(); ctx.restore(); }
  for (const m of motes) { m.y -= m.s * dt; m.p += dt; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); } ctx.globalAlpha = .25 + .25 * Math.sin(m.p); ctx.fillStyle = '#ffe9c8'; ctx.beginPath(); ctx.arc((m.x + Math.sin(m.p * .3) * .01) * W, m.y * H, m.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  // 인형 자리
  const im = doll.im, ok = im.complete && im.naturalWidth;
  if (ok) {
    const asp = im.naturalWidth / im.naturalHeight, bh = Math.min(H * .68, W * .46 / asp), bw = bh * asp;
    // 함께 안기: 2명 이상이 인형 위에서 쓰다듬는 중
    let onCount = 0; for (const p of people.values()) if (p.on && p.rub) onCount++;
    const hugging = onCount >= 2 && !doneAt; hugOn += ((hugging ? 1 : 0) - hugOn) * Math.min(1, dt * 5);
    if (hugging) { hugT += dt; if (now - beatAt > 1100) { beatAt = now; rings.push({ x: W / 2, y: H * .5, life: 1, big: true }); } }
    const beat = Math.max(0, 1 - (now - beatAt) / 260);
    const sx = 1 + .006 * Math.sin(t * 1.6) + hugOn * .05 + beat * .03, sy = 1 + .006 * Math.sin(t * 1.6) - hugOn * .06;
    const done = doneAt ? clamp((now - doneAt) / 1600, 0, 1) : 0, lift = Math.sin(Math.PI * done) * H * .03;
    const cx = W / 2, cy = H * .5 - lift;
    dollBox = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
    // 바닥 그림자
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.filter = 'blur(14px)'; ctx.beginPath(); ctx.ellipse(cx, H * .5 + bh * .5 + 6, bw * .42, bh * .05, 0, 0, 6.283); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(cx, cy + bh / 2); ctx.scale(sx, sy); ctx.translate(-bw / 2, -bh);
    // ① 바랜 인형(차갑고 어두움)
    ctx.filter = `grayscale(${.9 - .4 * warm}) brightness(${.5 + .25 * warm})`; ctx.drawImage(im, 0, 0, bw, bh); ctx.filter = 'none';
    // ② 쓰다듬은 자리만 원래 색
    if (mask) {
      paintCov();
      warmCv.width = Math.round(bw); warmCv.height = Math.round(bh);
      warmCtx.drawImage(im, 0, 0, bw, bh);
      warmCtx.globalCompositeOperation = 'destination-in'; warmCtx.imageSmoothingEnabled = true;
      if (doneAt) { warmCtx.globalAlpha = 1; warmCtx.drawImage(im, 0, 0, bw, bh); } else warmCtx.drawImage(covCv, 0, 0, bw, bh);
      warmCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(warmCv, 0, 0);
      // ③ 금빛 온기(닳은 자리 = 사랑받은 자리)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = doneAt ? .38 + .14 * Math.sin(t * 2) : .22;
      warmCtx.globalCompositeOperation = 'source-in'; warmCtx.fillStyle = '#ffb45a'; warmCtx.fillRect(0, 0, bw, bh); warmCtx.globalCompositeOperation = 'source-over';
      ctx.filter = 'blur(6px)'; ctx.drawImage(warmCv, 0, 0); ctx.filter = 'none'; ctx.restore();
    }
    ctx.restore();
    if (doneAt && Math.random() < .5) sparkle(cx + (Math.random() - .5) * bw * .8, cy + (Math.random() - .5) * bh * .8, 60);
  }
  // 위 진행 줄
  if (people.size || doneAt) {
    const pw = Math.min(W * .5, 640), px = (W - pw) / 2, py = H * .055;
    { const tg = ctx.createLinearGradient(0, 0, 0, H * .11); tg.addColorStop(0, 'rgba(0,0,0,.7)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H * .11); }
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(px, py, pw, 4); ctx.fillStyle = '#ffd59a'; ctx.fillRect(px, py, pw * (doneAt ? 1 : pr), 4);
    ctx.font = `600 ${Math.round(clamp(W * .013, 14, 22))}px Pretendard, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(doneAt ? `${doll.name} · 사랑이 가득 찼어요` : `${doll.name} · 함께 채운 사랑 ${Math.round(pr * 100)}%`, W / 2, py - 10);
    if (hugOn > .3 && !doneAt) { ctx.globalAlpha = hugOn; ctx.font = `700 ${Math.round(clamp(W * .018, 16, 30))}px Pretendard, sans-serif`; ctx.fillStyle = '#ffe3b5'; ctx.textBaseline = 'top'; ctx.fillText('함께 꼭 안았어요', W / 2, py + 18); ctx.globalAlpha = 1; }
  }
  // 손
  const sp = Math.min(W, H) * .42, hs = Math.min(W, H) * .045;
  for (const p of people.values()) {
    const k = Math.min(1, 6 * dt); p.vx += (p.ix * sp - p.vx) * k; p.vy += (p.iy * sp - p.vy) * k;
    p.x = clamp(p.x + p.vx * dt / W, .03, .97); p.y = clamp(p.y + p.vy * dt / H, .08, .95); p.ph += dt;
    const x = p.x * W, y = p.y * H, u = (x - dollBox.x) / dollBox.w, v = (y - dollBox.y) / dollBox.h;
    p.on = u > 0 && u < 1 && v > 0 && v < 1 && mask && mask[(clamp(v * LH | 0, 0, LH - 1)) * LW + clamp(u * LW | 0, 0, LW - 1)] === 1;
    if (p.rub && !doneAt && mask) {
      const moving = Math.hypot(p.vx, p.vy) > 15 ? 1 : .45, r = 9 * (1 + hugOn * .6);
      const g = stamp(u, v, r, dt * 3.4 * moving * (1 + hugOn * .8), p);
      if (g && Math.random() < .5) sparkle(x, y, 70);
      if (hugOn > .5 && Math.random() < dt * 6) { const [ru, rv] = randInside(); stamp(ru, rv, 5, .6, p); } // 안긴 동안 몸 곳곳이 데워짐
    }
    const a = Math.min(1, (now - p.born) / 600);
    drawHand(x, y + Math.sin(p.ph * 2) * 2, hs, p.hue, p.rub, a);
    ctx.globalAlpha = a; ctx.font = `700 ${Math.round(clamp(W * .011, 13, 20))}px Pretendard, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(p.nick, x, y + hs * 1.05); ctx.fillStyle = '#fff'; ctx.fillText(p.nick, x, y + hs * 1.05); ctx.globalAlpha = 1;
  }
  if (!doneAt && people.size) {
    sendProg(false);
    if (now - mineAt > 700) { mineAt = now; for (const p of people.values()) { const m = myPct(p); if (m !== p.sent) { p.sent = m; p.ch.send({ t: 'got', mine: m }); } } }
    if (progress() >= 1) complete();
  }
  if (doneAt) finale(now);
  for (let i = rings.length - 1; i >= 0; i--) { const g = rings[i]; g.life -= dt * 1.6; if (g.life <= 0) { rings.splice(i, 1); continue; } ctx.globalAlpha = g.life * .7; ctx.strokeStyle = '#ffd59a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, (1 - g.life) * (g.big ? Math.min(W, H) * .5 : 90) + 20, 0, 6.283); ctx.stroke(); }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt * 1.2; if (s.life <= 0) { sparks.splice(i, 1); continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .96; s.vy = s.vy * .96 - 20 * dt; ctx.globalAlpha = s.life; ctx.fillStyle = s.gold ? '#ffd38a' : '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
function randInside() { for (let k = 0; k < 20; k++) { const u = Math.random(), v = Math.random(); if (mask[(v * LH | 0) * LW + (u * LW | 0)]) return [u, v]; } return [.5, .5]; }

function complete() {
  doneAt = performance.now();
  for (let i = 0; i < 160; i++) sparkle(W / 2 + (Math.random() - .5) * dollBox.w, H / 2 + (Math.random() - .5) * dollBox.h, 260);
  rings.push({ x: W / 2, y: H / 2, life: 1, big: true });
  const ranked = [...people.values()].sort((a, b) => b.cnt - a.cnt);
  const top = ranked.filter((p) => p.cnt > 0).slice(0, 3).map((p) => ({ nick: p.nick, n: myPct(p) }));
  sendProg(true);
  for (const p of people.values()) p.ch.send({ t: 'complete', game: 'ml', title: doll.name, line: doll.line, img: abs(doll.src), mine: myPct(p), players: people.size, top, rank: ranked.indexOf(p) + 1 });
  layout();
  const r = round; setTimeout(() => { if (doneAt && round === r) startRound(round + 1); }, NEXT_AFTER * 1000);
}
function finale(now) {
  const k = clamp((now - doneAt) / 1200, 0, 1);
  for (let i = 0; i < 2; i++) if (Math.random() < .3) { ctx.globalAlpha = .7; ctx.fillStyle = '#ffb4a8'; heart(Math.random() * W, H * (.7 + Math.random() * .3), 6 + Math.random() * 8); }
  const big = Math.round(clamp(W * .028, 22, 50)), small = Math.round(clamp(W * .012, 13, 20)), y0 = Math.min(H - big - small * 3.4, dollBox.y + dollBox.h + 24);
  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  ctx.font = `800 ${big}px Pretendard, sans-serif`; ctx.lineWidth = 6; ctx.strokeStyle = `rgba(0,0,0,${.7 * k})`; ctx.strokeText('닳은 자리마다, 사랑이 머물렀다', W / 2, y0); ctx.fillStyle = `rgba(255,236,205,${k})`; ctx.fillText('닳은 자리마다, 사랑이 머물렀다', W / 2, y0);
  const list = [...people.values()].filter((p) => p.cnt > 0).sort((a, b) => b.cnt - a.cnt).slice(0, 3);
  const sub = `${doll.name} · ${doll.line}`, sub2 = `김규진 · 함께한 손 ${people.size}개${list.length ? '  ·  가장 많이 쓰다듬은 손 ' + list.map((p) => `${p.nick} ${myPct(p)}%`).join(' · ') : ''}`;
  ctx.font = `600 ${small}px Pretendard, sans-serif`; ctx.lineWidth = 4;
  ctx.strokeText(sub, W / 2, y0 + big * 1.3); ctx.fillStyle = `rgba(255,255,255,${k * .9})`; ctx.fillText(sub, W / 2, y0 + big * 1.3);
  ctx.strokeText(sub2, W / 2, y0 + big * 1.3 + small * 1.6); ctx.fillStyle = `rgba(255,255,255,${k * .7})`; ctx.fillText(sub2, W / 2, y0 + big * 1.3 + small * 1.6);
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
{ const sw = $('#switch'); if (sw) { const u = new URL('screen.html', location.href); for (const [k, v] of params) u.searchParams.set(k, v); sw.href = u.href; } }

openRoom(); startRound(0); layout();
if (location.hash === '#debug') window.__scr = { people, get code() { return code; }, get progress() { return progress(); }, finishAll() { if (!mask) buildMask(doll); for (let i = 0; i < LW * LH; i++) if (mask[i]) cov[i] = 1; covered = inside; const p = [...people.values()][0]; if (p) p.cnt = inside; } };
