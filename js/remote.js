// ARTMOS SCREEN 컨트롤러 — 휴대폰을 조이스틱처럼. 앱 설치 없이(QR → 브라우저) 또는 앱 '스크린' 탭(앱 안 전시 틀)에서.
// 입력은 내 통로(artmos-scr-<코드>-<내 id>)로만 큰 화면에 보냄. 완성한 별자리는 이 휴대폰에만 도착.
import { open, room, newId, linkMode } from './screen-link.js?v=1';
import { IS_MOBILE, sensor } from './sensors.js?v=6';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const P = new URLSearchParams(location.search);
const IN_APP = P.get('app') === '1' && window.parent !== window;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const buzz = (p) => sensor.vibrate(p);
// 앱 안(전시 틀)에서는 아이폰이 상태 표시줄 높이를 0으로 줌 → 빛쌀과 같은 방법으로 어림, 앱이 정확한 값을 보내면 그걸 씀
{ const setSat = (px) => document.documentElement.style.setProperty('--sat', `${Math.round(px)}px`);
  if (IN_APP && /iPhone|iPod/.test(navigator.userAgent)) {
    const pr = document.createElement('div'); pr.style.cssText = 'position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top);visibility:hidden'; document.body.appendChild(pr);
    const env = parseFloat(getComputedStyle(pr).paddingTop) || 0; pr.remove();
    if (env < 1) { const h = Math.max(screen.height, screen.width); setSat(h >= 852 ? 59 : h >= 812 ? 47 : 20); }
  }
  addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'artmos:safe' && typeof d.top === 'number' && d.top > 0) setSat(d.top); }); }
let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }
function myNick() {
  const q = P.get('me'); if (q) return q.slice(0, 20);
  try { const m = JSON.parse(localStorage.getItem('valix-me') || 'null'); if (m && m.nick) return m.nick; } catch (e) {}
  try { const s = localStorage.getItem('artmos-screen-nick'); if (s) return s; } catch (e) {}
  return '';
}
const SHAPE = { circle: '<circle cx="12" cy="12" r="7"/>', tri: '<path d="M12 4.5 20 19H4z"/>', square: '<rect x="5.5" y="5.5" width="13" height="13"/>', diamond: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>', cross: '<path d="M6 6l12 12M18 6 6 18"/>', star: '<path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z"/>' };
const shapeSVG = (s) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${SHAPE[s] || SHAPE.circle}</svg>`;

/* ---------- 연결 ---------- */
let S = null; // { code, pid, ch, main, nick, shape, max, n, endAt, lastHeard }
function enterView(err = '') {
  stopPlay();
  const code = (P.get('c') || '').replace(/\D/g, '').slice(0, 4);
  app.innerHTML = `<section class="rmt-enter">
      <h1>큰 화면과 연결하기</h1>
      <p class="rmt-lead">화면에 보이는 <b>숫자 4자리</b>를 넣어 주세요.</p>
      <input id="code" class="rmt-code" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="0000" value="${esc(code)}" aria-label="입장 숫자">
      <label class="rmt-nick"><span>화면에 보일 이름</span><input id="nick" maxlength="20" placeholder="방랑자" value="${esc(myNick())}"></label>
      ${err ? `<p class="rmt-err">${esc(err)}</p>` : ''}
      <button id="go" class="rmt-btn main" type="button">연결하기</button>
      <p class="rmt-note">움직임·기울기는 이 화면을 움직이는 데에만 쓰고 저장하지 않아요.${linkMode === 'local' ? '<br>시험 연결(같은 기기)' : ''}</p>
    </section>`;
  const inp = $('#code');
  inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); });
  $('#go').addEventListener('click', () => {
    const c = inp.value; if (c.length !== 4) { inp.focus(); toast('숫자 4자리를 넣어 주세요'); return; }
    const nick = $('#nick').value.trim().slice(0, 20) || '방랑자';
    try { localStorage.setItem('artmos-screen-nick', nick); } catch (e) {}
    if (IS_MOBILE) sensor.enable().catch(() => {}); // 누른 순간 안에서 권한(아이폰)
    connect(c, nick);
  });
  if (!code) setTimeout(() => inp.focus(), 300);
}
function connect(code, nick) {
  app.innerHTML = `<section class="rmt-wait"><i class="rmt-spin"></i><p>화면에 연결하는 중…</p><small>입장 숫자 ${esc(code)}</small></section>`;
  const pid = newId();
  const s = S = { code, pid, nick, n: 0, max: 12, endAt: 0, lastHeard: Date.now(), welcomed: false };
  s.ch = open(room(code) + '-' + pid, (m) => onScreen(s, m));
  s.main = open(room(code), () => {});
  s.ping = setInterval(() => { if (s.welcomed) s.ch.send({ t: 'ping' }); }, 3000); // 결과를 보는 동안에도 '아직 있어요'
  Promise.all([s.ch.ready, s.main.ready]).then(([a, b]) => {
    if (S !== s) return;
    if (!a || !b) { close(s); enterView('연결하지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.'); return; }
    let tries = 0;
    const knock = () => {
      if (S !== s || s.welcomed) return;
      if (tries++ >= 6) { close(s); enterView('그 숫자의 화면을 찾지 못했어요. 큰 화면의 숫자를 다시 확인해 주세요.'); return; }
      s.main.send({ t: 'join', pid, nick }); setTimeout(knock, 1500);
    };
    knock();
  });
}
function close(s) { if (!s) return; clearInterval(s.ping); try { s.ch.send({ t: 'bye' }); } catch (e) {} setTimeout(() => { s.ch.close(); s.main.close(); }, 300); if (S === s) S = null; }
function onScreen(s, m) {
  if (S !== s || !m) return;
  s.lastHeard = Date.now();
  if (m.t === 'welcome') {
    const first = !s.welcomed; s.welcomed = true; s.shape = m.shape; s.max = m.max; s.endAt = Date.now() + m.left * 1000;
    if (first || s.view !== 'play') { s.n = 0; playView(s); buzz(30); }
  } else if (m.t === 'full') { close(s); enterView('지금 화면이 가득 찼어요(최대 6명). 조금 뒤에 다시 들어와 주세요.'); }
  else if (m.t === 'state') { s.n = m.n; paintHud(s); }
  else if (m.t === 'result') resultView(s, m);
}
setInterval(() => { // 화면 소식이 9초 넘게 없으면 끊긴 것
  const s = S; if (!s || !s.welcomed) return;
  if (Date.now() - s.lastHeard > 9000) { close(s); enterView('큰 화면과 연결이 끊겼어요. 다시 연결해 주세요.'); }
}, 1000);

/* ---------- 조작 화면 ---------- */
let vx = 0, vy = 0, sentX = 9, sentY = 9, sentAt = 0, sendT = 0, hudT = 0, tilt = false, off = { x: 0, y: 0 }, knob = null, padR = 1, dragId = null;
function stopPlay() { clearInterval(sendT); clearInterval(hudT); sendT = hudT = 0; dragId = null; vx = vy = 0; }
function playView(s) {
  stopPlay(); s.view = 'play';
  app.innerHTML = `<section class="rmt-play">
      <div class="rmt-hud"><span class="rmt-me">${shapeSVG(s.shape)}<b>${esc(s.nick)}</b></span><span id="cnt">별 0/${s.max}</span><span id="left">--</span></div>
      <p class="rmt-tip" id="tip">가운데를 밀어 빛을 움직이고, <b>별 놓기</b>를 눌러요</p>
      <div class="rmt-pad" id="pad"><i class="rmt-ring"></i><i class="rmt-knob" id="knob">${shapeSVG(s.shape)}</i></div>
      <div class="rmt-mode" role="group" aria-label="움직이는 방법">
        <button data-mode="push" class="on" type="button">밀어서</button>
        <button data-mode="tilt" type="button"${IS_MOBILE ? '' : ' disabled'}>기울여서</button>
      </div>
      <div class="rmt-acts">
        <button id="pull" class="rmt-btn" type="button">꾹 눌러<br><b>끌어당기기</b></button>
        <button id="star" class="rmt-btn star" type="button"><b>별 놓기</b></button>
        <button id="burst" class="rmt-btn" type="button">${IS_MOBILE ? '흔들어도 돼요<br>' : ''}<b>퍼뜨리기</b></button>
      </div>
      <button id="done" class="rmt-link" type="button">이 별자리로 완성하기</button>
    </section>`;
  knob = $('#knob'); tilt = false;
  const pad = $('#pad');
  const measure = () => { const r = pad.getBoundingClientRect(); padR = r.width / 2 - 34; return r; };
  measure();
  const setFrom = (e) => { const r = measure(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), k = d > padR ? padR / d : 1; vx = dx * k / padR; vy = dy * k / padR; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); if (tilt) return; dragId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (x) {} setFrom(e); pad.classList.add('on'); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === dragId) setFrom(e); });
  const end = (e) => { if (e.pointerId !== dragId) return; dragId = null; vx = vy = 0; pad.classList.remove('on'); pushInput(true); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const want = b.dataset.mode === 'tilt';
    if (want) { sensor.enable().then((ok) => { if (!ok) { toast('기울기를 켜지 못했어요. 밀어서 움직여 주세요.'); return; } tilt = true; off = { x: sensor.tiltX, y: sensor.tiltY }; mark(); toast('지금 든 자세가 가운데예요'); }); }
    else { tilt = false; vx = vy = 0; mark(); }
    function mark() { app.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', (x.dataset.mode === 'tilt') === tilt)); pad.classList.toggle('tilt', tilt); }
  }));
  const press = (el, on) => el.classList.toggle('down', on);
  $('#star').addEventListener('pointerdown', (e) => { e.preventDefault(); press(e.currentTarget, true); if (s.n >= s.max) { toast('별을 모두 놓았어요'); return; } s.ch.send({ t: 'star' }); s.n++; paintHud(s); buzz(18); $('#tip').textContent = s.n >= s.max ? '마지막 별! 별자리가 완성돼요' : s.n === 1 ? '움직여서 다음 별을 놓으면 선으로 이어져요' : '좋아요. 별이 이어지고 있어요'; });
  const pull = $('#pull');
  pull.addEventListener('pointerdown', (e) => { e.preventDefault(); try { pull.setPointerCapture(e.pointerId); } catch (x) {} press(pull, true); s.ch.send({ t: 'pull', on: true }); buzz(10); });
  const pullEnd = () => { if (!pull.classList.contains('down')) return; press(pull, false); s.ch.send({ t: 'pull', on: false }); };
  pull.addEventListener('pointerup', pullEnd); pull.addEventListener('pointercancel', pullEnd);
  $('#burst').addEventListener('pointerdown', (e) => { e.preventDefault(); press(e.currentTarget, true); s.ch.send({ t: 'burst' }); buzz([10, 30, 10]); });
  app.querySelectorAll('.rmt-btn').forEach((b) => ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => { if (b.id !== 'pull') press(b, false); })));
  $('#done').addEventListener('click', () => { if (!s.n) { toast('별을 하나 이상 놓아 주세요'); return; } s.ch.send({ t: 'done' }); });
  sendT = setInterval(() => pushInput(false), 66); // 초당 15번까지, 바뀔 때만
  hudT = setInterval(() => paintHud(s), 250); paintHud(s);
  requestAnimationFrame(drawKnob);
}
function pushInput(force) {
  const s = S; if (!s || s.view !== 'play') return;
  if (tilt) { vx = clamp((sensor.tiltX - off.x) * 1.7, -1, 1); vy = clamp((sensor.tiltY - off.y) * 1.7, -1, 1); if (Math.hypot(vx, vy) < .08) vx = vy = 0; }
  const now = Date.now(), moved = Math.abs(vx - sentX) > .03 || Math.abs(vy - sentY) > .03;
  if (force || moved || now - sentAt > 2000) { s.ch.send({ t: 'in', x: +vx.toFixed(3), y: +vy.toFixed(3) }); sentX = vx; sentY = vy; sentAt = now; }
}
function drawKnob() {
  if (!knob || !knob.isConnected) return;
  knob.style.transform = `translate(calc(-50% + ${vx * padR}px), calc(-50% + ${vy * padR}px))`;
  requestAnimationFrame(drawKnob);
}
function paintHud(s) {
  const c = $('#cnt'), l = $('#left'); if (!c || !l) return;
  c.textContent = `별 ${s.n}/${s.max}`;
  const sec = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)); l.textContent = `${sec}초`; l.classList.toggle('urgent', sec <= 10);
}
sensor.onShake(() => { const s = S; if (s && s.view === 'play') { s.ch.send({ t: 'burst' }); buzz(20); } });

/* ---------- 결과 (이 휴대폰에만) ---------- */
function resultView(s, m) {
  stopPlay(); s.view = 'result'; buzz([30, 60, 30]);
  if (!m.n) {
    app.innerHTML = `<section class="rmt-result"><p class="rmt-kick">시간이 다 됐어요</p><h1>별을 놓지 않았어요</h1><p class="rmt-lead">다음엔 별 놓기를 눌러 보세요.</p><div class="rmt-row"><button id="again" class="rmt-btn main" type="button">한 번 더</button><button id="out" class="rmt-btn" type="button">나가기</button></div></section>`;
  } else {
    const svg = constSVG(m.pts, m.aspect || 16 / 9);
    app.innerHTML = `<section class="rmt-result">
        <p class="rmt-kick">${esc(s.nick)}님의 별자리</p>
        <h1>${esc(m.name)}</h1>
        <div class="rmt-card">${svg}</div>
        <p class="rmt-meta">별 ${m.n}개 · ${m.sec}초 · ${new Date().toLocaleDateString('ko')}</p>
        <p class="rmt-lead">큰 화면 하늘에도 잠시 남아 있어요.</p>
        <div class="rmt-row"><button id="save" class="rmt-btn main" type="button">이미지로 간직하기</button></div>
        <div class="rmt-row"><button id="again" class="rmt-btn" type="button">한 번 더</button><button id="out" class="rmt-btn" type="button">나가기</button></div>
      </section>`;
    $('#save').addEventListener('click', () => saveCard(s, m));
  }
  $('#again').addEventListener('click', () => { s.ch.send({ t: 'again' }); s.view = 'wait'; app.innerHTML = `<section class="rmt-wait"><i class="rmt-spin"></i><p>다시 시작하는 중…</p></section>`; });
  $('#out').addEventListener('click', leaveAll);
}
function fit(pts, aspect, w, h, pad) { // 별 위치(화면 비율 그대로)를 카드 안에 맞춤
  const xs = pts.map((p) => p[0] * aspect), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sc = Math.min((w - pad * 2) / Math.max(.05, x1 - x0), (h - pad * 2) / Math.max(.05, y1 - y0));
  const ox = (w - (x1 - x0) * sc) / 2, oy = (h - (y1 - y0) * sc) / 2;
  return pts.map((p, i) => [ox + (xs[i] - x0) * sc, oy + (ys[i] - y0) * sc]);
}
function constSVG(pts, aspect) {
  const q = fit(pts, aspect, 300, 300, 40);
  return `<svg viewBox="0 0 300 300" aria-hidden="true"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <polyline points="${q.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" class="rmt-line"/>
    ${q.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="url(#g)" style="animation-delay:${i * 90}ms"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#fff"/>`).join('')}</svg>`;
}
async function saveCard(s, m) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { g.globalAlpha = Math.random() * .5 + .1; g.fillStyle = '#fff'; const r = Math.random() * 2 + .5; g.fillRect(Math.random() * W, Math.random() * H, r, r); }
  g.globalAlpha = 1;
  const q = fit(m.pts, m.aspect || 16 / 9, W, 900, 140).map(([x, y]) => [x, y + 200]);
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  for (const [x, y] of q) { const gr = g.createRadialGradient(x, y, 0, x, y, 46); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - 46, y - 46, 92, 92); }
  await document.fonts.ready.catch(() => {});
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = "400 30px 'ARTMOS Michroma', sans-serif"; g.fillText('A R T M O S   S C R E E N', W / 2, 120);
  g.font = '700 84px Pretendard, sans-serif'; g.fillText(m.name, W / 2, 1180);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '500 34px Pretendard, sans-serif'; g.fillText(`${s.nick}님의 별자리 · 별 ${m.n}개 · ${new Date().toLocaleDateString('ko')}`, W / 2, 1250);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], `artmos-${m.name}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: m.name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('이미지를 저장했어요');
}

/* ---------- 나가기 ---------- */
function leaveAll() {
  close(S); stopPlay();
  if (IN_APP) { try { parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); } catch (e) {} return; }
  P.delete('c'); enterView();
}
$('#exit').addEventListener('click', () => { if (S) leaveAll(); else if (IN_APP) parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); else location.href = './'; });
addEventListener('pagehide', () => { if (S) try { S.ch.send({ t: 'bye' }); } catch (e) {} });

const c0 = (P.get('c') || '').replace(/\D/g, '');
const n0 = myNick();
if (c0.length === 4 && IN_APP && n0) connect(c0, n0); // 앱 '스크린' 탭에서 숫자를 넣고 온 경우 바로 연결
else enterView();
if (location.hash === '#debug') window.__rmt = { get S() { return S; } };
