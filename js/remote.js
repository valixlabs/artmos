// ARTMOS SCREEN 컨트롤러 — 휴대폰이 나비 한 마리(장승효 · 나비의 정원). 앱 설치 없이(QR → 브라우저) 또는 앱 '스크린' 탭(앱 안 전시 틀)에서.
// 입력은 내 통로(artmos-scr-<코드>-<내 id>)로만 큰 화면에 보냄. 내 기록은 이 휴대폰에만 도착.
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

/* ---------- 연결 ---------- */
let S = null;
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
  const s = S = { code, pid, nick, mine: 0, done: 0, total: 0, hz: 15, lastHeard: Date.now(), welcomed: false, view: 'wait' };
  s.ch = open(room(code) + '-' + pid, (m) => onScreen(s, m));
  s.main = open(room(code), (m) => onAll(s, m)); // 진행률·완성·새 작품은 모두에게 한 번에
  s.ping = setInterval(() => { if (s.welcomed) s.ch.send({ t: 'ping' }); }, 3000);
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
  if (m.t === 'welcome') { const first = !s.welcomed; s.welcomed = true; Object.assign(s, { bf: m.bf, mir: m.mir, formName: m.formName, hz: m.hz || 15, title: m.title, total: m.total, done: m.done, mine: m.mine }); if (first || s.view !== 'play') { playView(s); buzz(30); } }
  else if (m.t === 'got') { s.mine = m.mine; paintHud(s); buzz(15); popGot(); }
  else if (m.t === 'complete') completeView(s, m);
  else if (m.t === 'full') { close(s); enterView('지금 나비가 가득 찼어요. 조금 뒤에 다시 들어와 주세요.'); }
}
function onAll(s, m) {
  if (S !== s || !m) return;
  if (m.t === 'prog') { s.done = m.done; s.total = m.total; s.lastHeard = Date.now(); paintHud(s); }
  else if (m.t === 'rate') s.hz = m.hz || s.hz;
  else if (m.t === 'round') { s.title = m.title; s.total = m.total; s.done = 0; s.mine = 0; if (s.welcomed && s.view !== 'play') { playView(s); toast('새 작품이 숨었어요! 다시 모아 볼까요'); } }
}
setInterval(() => { // 화면 소식이 9초 넘게 없으면 끊긴 것
  const s = S; if (!s || !s.welcomed) return;
  if (Date.now() - s.lastHeard > 9000) { close(s); enterView('큰 화면과 연결이 끊겼어요. 다시 연결해 주세요.'); }
}, 1000);

/* ---------- 조작 화면 (조이스틱 + 날갯짓) ---------- */
let vx = 0, vy = 0, sentX = 9, sentY = 9, sentAt = 0, sendT = 0, tilt = false, off = { x: 0, y: 0 }, knob = null, padR = 1, dragId = null;
function stopPlay() { clearTimeout(sendT); sendT = 0; dragId = null; vx = vy = 0; }
function playView(s) {
  stopPlay(); s.view = 'play';
  app.innerHTML = `<section class="rmt-play">
      <div class="rmt-hud"><span class="rmt-me"><b>${esc(s.nick)}</b><small>${esc(s.formName || '나비')}</small></span><span id="mine" class="rmt-mine">조각 ${s.mine}</span></div>
      <div class="rmt-prog"><i id="prog"></i><span id="progT"></span></div>
      <p class="rmt-tip" id="tip">나비를 움직여 떠다니는 <b>작품 조각</b>에 닿으면 모아져요</p>
      <div class="rmt-pad" id="pad"><i class="rmt-ring"></i><i class="rmt-knob bf" id="knob">${s.bf ? `<img src="${esc(s.bf)}" alt="" draggable="false" style="${s.mir ? 'transform:scaleX(-1)' : ''}">` : ''}</i></div>
      <div class="rmt-mode" role="group" aria-label="움직이는 방법">
        <button data-mode="push" class="on" type="button">밀어서</button>
        <button data-mode="tilt" type="button"${IS_MOBILE ? '' : ' disabled'}>기울여서</button>
      </div>
      <button id="dash" class="rmt-btn grab" type="button"><b>힘껏 날갯짓</b></button>
    </section>`;
  knob = $('#knob'); tilt = false;
  const pad = $('#pad');
  const measure = () => { const r = pad.getBoundingClientRect(); padR = r.width / 2 - 40; return r; };
  measure();
  const setFrom = (e) => { const r = measure(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), k = d > padR ? padR / d : 1; vx = dx * k / padR; vy = dy * k / padR; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); if (tilt) return; dragId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (x) {} setFrom(e); pad.classList.add('on'); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === dragId) setFrom(e); });
  const end = (e) => { if (e.pointerId !== dragId) return; dragId = null; vx = vy = 0; pad.classList.remove('on'); pushInput(true); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const want = b.dataset.mode === 'tilt';
    const mark = () => { app.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', (x.dataset.mode === 'tilt') === tilt)); pad.classList.toggle('tilt', tilt); };
    if (want) sensor.enable().then((ok) => { if (!ok) { toast('기울기를 켜지 못했어요. 밀어서 움직여 주세요.'); return; } tilt = true; off = { x: sensor.tiltX, y: sensor.tiltY }; mark(); toast('지금 든 자세가 가운데예요'); });
    else { tilt = false; vx = vy = 0; mark(); }
  }));
  const g = $('#dash');
  g.addEventListener('pointerdown', (e) => { e.preventDefault(); if (g.disabled) return; g.classList.add('down'); s.ch.send({ t: 'dash' }); buzz([15, 30, 15]); g.disabled = true; setTimeout(() => g.classList.remove('down'), 160); setTimeout(() => { g.disabled = false; }, 1600); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => g.addEventListener(ev, () => g.classList.remove('down')));
  const loop = () => { pushInput(false); sendT = setTimeout(loop, 1000 / (S ? S.hz : 10)); }; loop(); // 사람이 많으면 화면이 알려 준 만큼 덜 자주
  paintHud(s);
  requestAnimationFrame(drawKnob);
}
function pushInput(force) {
  const s = S; if (!s || s.view !== 'play') return;
  if (tilt) { vx = clamp((sensor.tiltX - off.x) * 1.8, -1, 1); vy = clamp((sensor.tiltY - off.y) * 1.8, -1, 1); if (Math.hypot(vx, vy) < .08) vx = vy = 0; }
  const now = Date.now();
  if (force || Math.abs(vx - sentX) > .04 || Math.abs(vy - sentY) > .04 || now - sentAt > 2500) { s.ch.send({ t: 'in', x: +vx.toFixed(2), y: +vy.toFixed(2) }); sentX = vx; sentY = vy; sentAt = now; }
}
function drawKnob() {
  if (!knob || !knob.isConnected) return;
  knob.style.transform = `translate(calc(-50% + ${vx * padR}px), calc(-50% + ${vy * padR}px)) rotate(${(Math.hypot(vx, vy) > .1 ? Math.atan2(vx, -vy) : 0) * .5}rad)`;
  requestAnimationFrame(drawKnob);
}
function paintHud(s) {
  const m = $('#mine'), p = $('#prog'), t = $('#progT');
  if (m) m.textContent = `조각 ${s.mine}`;
  if (p) p.style.transform = `scaleX(${s.total ? s.done / s.total : 0})`;
  if (t) t.textContent = s.total ? `함께 완성 ${Math.round(s.done / s.total * 100)}%` : '';
}
function popGot() { const m = $('#mine'); if (!m) return; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); }

/* ---------- 완성 (이 휴대폰에만 내 기록) ---------- */
function completeView(s, m) {
  stopPlay(); s.view = 'done'; buzz([30, 60, 30, 60, 80]);
  app.innerHTML = `<section class="rmt-result win"><p class="rmt-kick">나비 ${m.players}마리가 함께</p><h1>작품을 완성했어요!</h1>
      <div class="rmt-art"><img src="${esc(m.img)}" alt="" draggable="false"></div>
      <p class="rmt-meta">${m.title && m.title !== '장승효 작가의 나비' ? esc(m.title) + ' · ' : ''}장승효</p>
      <p class="rmt-lead">내가 모은 조각 <b>${m.mine}개</b>${m.rank && m.players > 1 ? ` · ${m.players}마리 중 ${m.rank}번째로 많이` : ''}</p>
      ${m.top && m.top.length ? `<p class="rmt-note">가장 많이 모은 나비 · ${m.top.map((x) => `${esc(x.nick)} ${x.n}`).join(' · ')}</p>` : ''}
      <div class="rmt-row"><button id="collect" class="rmt-btn main" type="button">장승효 작품 소장하러 가기</button></div>
      <p class="rmt-note">잠시 뒤 새 작품이 숨어요. 이 화면을 켜 두면 바로 이어서 날 수 있어요.</p>
      <div class="rmt-row"><button id="out" class="rmt-btn" type="button">나가기</button></div></section>`;
  $('#collect').addEventListener('click', () => {
    if (IN_APP) { try { parent.postMessage({ type: 'artmos:go-tab', tab: 'shop' }, '*'); } catch (e) {} return; }
    close(S); location.href = new URL('collect.html', location.href).href;
  });
  $('#out').addEventListener('click', leaveAll);
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
