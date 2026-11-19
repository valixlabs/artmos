// ARTMOS SCREEN 컨트롤러 — 휴대폰을 조이스틱처럼(행성 뽑기). 앱 설치 없이(QR → 브라우저) 또는 앱 '스크린' 탭(앱 안 전시 틀)에서.
// 입력은 내 통로(artmos-scr-<코드>-<내 id>)로만 큰 화면에 보냄. 뽑은 행성은 이 휴대폰에만 도착.
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
  const s = S = { code, pid, nick, tries: 3, won: [], endAt: 0, lastHeard: Date.now(), welcomed: false, view: 'wait' };
  s.ch = open(room(code) + '-' + pid, (m) => onScreen(s, m));
  s.main = open(room(code), () => {});
  s.ping = setInterval(() => { if (s.welcomed) s.ch.send({ t: 'ping' }); }, 3000); // 기다리거나 결과를 보는 동안에도 '아직 있어요'
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
  if (m.t === 'welcome') { s.welcomed = true; s.machine = m.machine; s.tries = m.tries; if (s.view !== 'play') { s.won = []; playView(s); buzz(30); } }
  else if (m.t === 'queue') { s.welcomed = true; queueView(s, m.pos); }
  else if (m.t === 'aim') { s.tries = m.tries; s.endAt = Date.now() + m.left * 1000; if (s.view !== 'play') playView(s); setBusy(s, ''); }
  else if (m.t === 'phase') setBusy(s, m.p === 'drop' ? '집게가 내려가요…' : '올라가는 중… 꼭 잡아라!');
  else if (m.t === 'result') { s.tries = m.tries; if (m.win) s.won.push(m.prize); resultView(s, m); }
  else if (m.t === 'over') { s.overWon = m.won || s.won; if (s.view !== 'result') overView(s); }
  else if (m.t === 'full') { close(s); enterView('지금 줄이 가득 찼어요. 조금 뒤에 다시 들어와 주세요.'); }
}
setInterval(() => { // 화면 소식이 9초 넘게 없으면 끊긴 것
  const s = S; if (!s || !s.welcomed) return;
  if (Date.now() - s.lastHeard > 9000) { close(s); enterView('큰 화면과 연결이 끊겼어요. 다시 연결해 주세요.'); }
}, 1000);

/* ---------- 기다리기 ---------- */
function queueView(s, pos) {
  stopPlay(); s.view = 'queue';
  app.innerHTML = `<section class="rmt-wait"><i class="rmt-spin"></i><p>${pos <= 1 ? '곧 차례예요' : `앞에 ${pos - 1}명이 기다리고 있어요`}</p><small>기계가 비면 바로 시작해요 · 화면을 켜 두세요</small></section>`;
}

/* ---------- 조작 화면 (조이스틱 + 잡기) ---------- */
let vx = 0, sentX = 9, sentAt = 0, sendT = 0, hudT = 0, tilt = false, off = 0, knob = null, padR = 1, dragId = null;
function stopPlay() { clearInterval(sendT); clearInterval(hudT); sendT = hudT = 0; dragId = null; vx = 0; }
const dots = (n) => [0, 1, 2].map((k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('');
function playView(s) {
  stopPlay(); s.view = 'play';
  app.innerHTML = `<section class="rmt-play">
      <div class="rmt-hud"><span class="rmt-me"><b>ARTMOS 0${s.machine || 1}</b><small>${esc(s.nick)}</small></span><span class="rmt-dots" id="dots" aria-label="남은 기회">${dots(s.tries)}</span><span id="left">--</span></div>
      <p class="rmt-tip" id="tip">조이스틱을 좌우로 밀어 집게를 옮기고 <b>잡기</b>를 눌러요</p>
      <div class="rmt-pad h" id="pad"><i class="rmt-ar l">‹</i><i class="rmt-ar r">›</i><i class="rmt-knob" id="knob"></i></div>
      <div class="rmt-mode" role="group" aria-label="움직이는 방법">
        <button data-mode="push" class="on" type="button">밀어서</button>
        <button data-mode="tilt" type="button"${IS_MOBILE ? '' : ' disabled'}>기울여서</button>
      </div>
      <button id="grab" class="rmt-btn grab" type="button"><b>잡기</b></button>
    </section>`;
  knob = $('#knob'); tilt = false;
  const pad = $('#pad');
  const measure = () => { const r = pad.getBoundingClientRect(); padR = r.width / 2 - 40; return r; };
  measure();
  const setFrom = (e) => { const r = measure(), dx = e.clientX - (r.left + r.width / 2); vx = clamp(dx / padR, -1, 1); };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); if (tilt || s.busy) return; dragId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (x) {} setFrom(e); pad.classList.add('on'); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === dragId) setFrom(e); });
  const end = (e) => { if (e.pointerId !== dragId) return; dragId = null; vx = 0; pad.classList.remove('on'); pushInput(true); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const want = b.dataset.mode === 'tilt';
    const mark = () => { app.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', (x.dataset.mode === 'tilt') === tilt)); pad.classList.toggle('tilt', tilt); };
    if (want) sensor.enable().then((ok) => { if (!ok) { toast('기울기를 켜지 못했어요. 밀어서 움직여 주세요.'); return; } tilt = true; off = sensor.tiltX; mark(); toast('지금 든 자세가 가운데예요'); });
    else { tilt = false; vx = 0; mark(); }
  }));
  const g = $('#grab');
  g.addEventListener('pointerdown', (e) => { e.preventDefault(); if (s.busy) return; g.classList.add('down'); vx = 0; pushInput(true); s.ch.send({ t: 'grab' }); buzz(25); setBusy(s, '집게가 내려가요…'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => g.addEventListener(ev, () => g.classList.remove('down')));
  sendT = setInterval(() => pushInput(false), 66); // 초당 15번까지, 바뀔 때만
  hudT = setInterval(() => paintHud(s), 250); paintHud(s); setBusy(s, '');
  requestAnimationFrame(drawKnob);
}
function setBusy(s, text) {
  s.busy = !!text; const g = $('#grab'), t = $('#tip'), pad = $('#pad');
  if (g) { g.disabled = s.busy; g.querySelector('b').textContent = s.busy ? '잡는 중' : '잡기'; }
  if (pad) pad.classList.toggle('off', s.busy);
  if (t) t.innerHTML = text ? esc(text) : '조이스틱을 좌우로 밀어 집게를 옮기고 <b>잡기</b>를 눌러요';
  if (s.busy) { vx = 0; dragId = null; }
}
function pushInput(force) {
  const s = S; if (!s || s.view !== 'play') return;
  if (tilt && !s.busy) { vx = clamp((sensor.tiltX - off) * 1.8, -1, 1); if (Math.abs(vx) < .08) vx = 0; }
  const now = Date.now();
  if (force || Math.abs(vx - sentX) > .03 || now - sentAt > 2000) { s.ch.send({ t: 'in', x: +vx.toFixed(3) }); sentX = vx; sentAt = now; }
}
function drawKnob() {
  if (!knob || !knob.isConnected) return;
  knob.style.transform = `translate(calc(-50% + ${vx * padR}px), -50%)`;
  requestAnimationFrame(drawKnob);
}
function paintHud(s) {
  const l = $('#left'), d = $('#dots'); if (!l) return;
  if (d) d.innerHTML = dots(s.tries);
  const sec = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)); l.textContent = s.busy ? '' : `${sec}초`; l.classList.toggle('urgent', sec <= 5);
}

/* ---------- 결과 (이 휴대폰에만) ---------- */
const prizeCard = (z) => `<div class="rmt-prize">${z.img ? `<img src="${esc(z.img)}" alt="" draggable="false">` : '<i class="rmt-cap"></i>'}<div><small>${esc(z.code || '')}</small><b>${esc(z.title || '')}</b><span>${esc(z.artist || '')}</span></div></div>`;
function resultView(s, m) {
  stopPlay(); s.view = 'result'; buzz(m.win ? [30, 60, 30, 60, 80] : 40);
  const more = s.tries > 0;
  app.innerHTML = m.win
    ? `<section class="rmt-result win"><p class="rmt-kick">행성 캡슐을 뽑았어요</p><h1>뽑았다!</h1>${prizeCard(m.prize)}
        <div class="rmt-row"><button id="go" class="rmt-btn main" type="button">이 전시 보러 가기</button></div>
        <div class="rmt-row">${more ? `<button id="next" class="rmt-btn" type="button">다음 기회 (${s.tries}번 남음)</button>` : `<button id="sum" class="rmt-btn" type="button">내가 뽑은 행성 보기</button>`}</div></section>`
    : `<section class="rmt-result"><p class="rmt-kick">${more ? `남은 기회 ${s.tries}번` : '기회를 다 썼어요'}</p><h1>아깝다!</h1><p class="rmt-lead">집게 가운데로 캡슐을 잡을수록 덜 미끄러져요.</p>
        <div class="rmt-row">${more ? `<button id="next" class="rmt-btn main" type="button">다시 도전</button>` : `<button id="sum" class="rmt-btn main" type="button">결과 보기</button>`}</div></section>`;
  $('#go')?.addEventListener('click', () => openPrize(m.prize));
  $('#next')?.addEventListener('click', () => { s.ch.send({ t: 'next' }); s.view = 'wait'; app.innerHTML = `<section class="rmt-wait"><i class="rmt-spin"></i><p>집게를 준비하는 중…</p></section>`; });
  $('#sum')?.addEventListener('click', () => overView(s));
}
function overView(s) {
  stopPlay(); s.view = 'over';
  const won = s.overWon || s.won;
  app.innerHTML = `<section class="rmt-result"><p class="rmt-kick">${esc(s.nick)}님의 뽑기</p><h1>${won.length ? `행성 ${won.length}개` : '다음엔 꼭!'}</h1>
      ${won.length ? `<div class="rmt-list">${won.map((z, i) => `<button class="rmt-li" data-i="${i}" type="button">${prizeCard(z)}<em>보러 가기 ›</em></button>`).join('')}</div>` : '<p class="rmt-lead">이번엔 뽑지 못했어요.</p>'}
      <div class="rmt-row"><button id="again" class="rmt-btn main" type="button">다시 줄 서기</button></div>
      <div class="rmt-row"><button id="out" class="rmt-btn" type="button">나가기</button></div></section>`;
  app.querySelectorAll('.rmt-li').forEach((b) => b.addEventListener('click', () => openPrize(won[+b.dataset.i])));
  $('#again').addEventListener('click', () => { s.overWon = null; s.won = []; s.ch.send({ t: 'again' }); queueView(s, 1); });
  $('#out').addEventListener('click', leaveAll);
}
function openPrize(z) { // 앱 안이면 앱이 그 전시를 열고, 웹이면 그 전시 주소로
  if (!z) return;
  if (IN_APP) { try { parent.postMessage({ type: 'artmos:open-exhibit', id: z.id }, '*'); } catch (e) {} return; }
  close(S); location.href = z.url;
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
