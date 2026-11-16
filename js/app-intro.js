// 앱 첫 화면 인트로: 꾹 눌러 우주로 들어가기 → 작은 ART COSMOS가 ARTMOS로 (앱을 켤 때마다 한 번)
// 1) 대기: 검은 우주에 작은 빛 하나와 둥근 링. 별 터널이 느리게 흐름. 화면을 꾹 누르면 링이 차오르고 별이 빨라지며 낮은 화음이 차오름
//    (첫 터치가 소리를 풀어 주므로 이후 연출 소리가 처음부터 화면과 맞음). 중간에 떼면 다시 식음.
// 2) 다 차면: 'ART COSMOS'가 작게 나타남 → COS가 흩어지고 MOS가 붙어 ARTMOS → 빛·북·종 화음, 로고가 커짐 → 카피 → 자동으로 앱.
//    연출이 시작된 뒤에는 눌러서 건너뛸 수 없음(소유자 요청: 꼭 끝까지 봄).
// 가볍게: 별 터널은 한 캔버스에 색·밝기별로 묶어 한 번에 긋고(상태 변경 최소화), 느린 기기는 별 수·해상도를 자동으로 낮춤.
//        글자 연출은 transform/opacity만 씀(blur·글자 그림자 애니메이션 없음, 위치 이동도 top 대신 transform). 소리 잔향은 짧게·가볍게 만듦.
// 모션 줄이기: 별 터널 없이 정지 화면(꾹 누르기는 똑같이 필요). 소리 끄기(xpace-sound=off): 소리만 없음.
(() => {
  const L = (() => { // 앱(i18n.js)과 같은 순서: 주소 ?lang= → 지난번 선택 → 기기 언어 → 한국어
    const ok = (l) => ['ko', 'en', 'zh', 'ja'].includes(l);
    try { const q = new URLSearchParams(location.search).get('lang'); if (ok(q)) return q; const s = localStorage.getItem('xpace-lang'); if (ok(s)) return s; } catch (e) {}
    const n = (navigator.language || 'ko').slice(0, 2).toLowerCase(); return ok(n) ? n : 'ko';
  })();
  const COPY = { // [카피, 꾹 누르기 안내]
    ko: ['세상의 예술을 가까이 만나는 공간', '준비가 됐다면 꾹 누르세요'],
    en: ['A space to meet the world’s art up close', 'If you’re ready, press and hold'],
    zh: ['近距离遇见世界艺术的空间', '准备好了，就请长按'],
    ja: ['世界のアートに、もっと近くで出会える場所', '準備ができたら、長押ししてください'],
  };
  const C = COPY[L] || COPY.ko;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || (() => { try { return localStorage.getItem('valix-motion') === 'reduce'; } catch (e) { return false; } })();
  const soundOn = (() => { try { return localStorage.getItem('xpace-sound') !== 'off'; } catch (e) { return true; } })();
  const T = { art: 300, cosmos: 650, scatter: 1850, join: 1900, hit: 2600, copy: 3200, end: 3950 }; // ms (꾹 누르기가 끝난 순간부터)
  const HOLD = 1500, RELEASE = 650, TAIL = 1200; // 꾹 누르는 시간 / 떼면 식는 시간 / 연출 끝난 뒤 머무는 시간(ms)

  const css = `
  .ai{position:fixed;inset:0;z-index:80;background:#000;overflow:hidden;color:#fff;font-family:Pretendard,-apple-system,'Apple SD Gothic Neo',sans-serif;transition:opacity .7s ease;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none}
  .ai.out{opacity:0;pointer-events:none}
  .ai canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  @font-face{font-family:'ARTMOS Michroma';src:url('assets/fonts/michroma-latin-400.woff2') format('woff2');font-display:block}
  .ai .stage{position:absolute;left:0;right:0;top:calc(50% - 70px);width:100%;height:140px;display:flex;align-items:center;justify-content:center;transition:transform 1s cubic-bezier(.3,.7,.2,1);pointer-events:none}
  .ai:not(.run) .stage{visibility:hidden}
  .ai.copyon .stage{transform:translateY(-100px)}
  .ai .word{position:relative;display:flex;align-items:center;font-family:'ARTMOS Michroma','Michroma',sans-serif;font-weight:400;font-size:calc(clamp(22px,7vw,56px) * 1.35);letter-spacing:.18em;white-space:nowrap;-webkit-text-stroke:.055em currentColor}
  .ai .live{transform:scale(.4296);transition:transform 1.3s cubic-bezier(.3,.7,.2,1)}
  .ai .live.mid{transform:scale(.7407)}
  .ai .live.big{transform:scale(1)}
  .ai .word.ghost{position:absolute;visibility:hidden}
  .ai .ch{display:inline-block;opacity:0;transform:translateY(16px);transition:transform .95s cubic-bezier(.65,0,.2,1),opacity .6s}
  .ai .ch.on{opacity:1;transform:none}
  .ai .gap{display:inline-block;width:.9em}
  .ai .ch.dust{opacity:0!important;transition:transform 1s cubic-bezier(.2,.7,.2,1),opacity .9s}
  .ai.run .ch,.ai.run .live,.ai.run .stage,.ai.run .flash,.ai.run .copy{will-change:transform,opacity}
  .ai .flash{position:absolute;left:50%;top:50%;width:340px;height:340px;margin:-170px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.45) 0%,rgba(255,255,255,.12) 26%,rgba(255,255,255,0) 62%);opacity:0;pointer-events:none}
  .ai .flash.on{animation:aiFlash 1.2s ease-out forwards}
  .ai .copy{position:absolute;left:0;right:0;top:calc(50% - 16px);text-align:center;padding:0 28px;opacity:0;transform:translateY(8px);transition:opacity .9s,transform .9s;pointer-events:none}
  .ai.copyon .copy{opacity:1;transform:none}
  .ai .copy b{display:block;font-weight:400;font-size:clamp(17px,4.8vw,22px);line-height:1.5;color:#e9e9ee;letter-spacing:.02em}
  .ai .hint{position:absolute;left:0;right:0;top:calc(50% + 86px);text-align:center;padding:0 24px;opacity:1;transition:opacity .35s;pointer-events:none}
  .ai .hint span{display:inline-block;font-size:clamp(13px,3.7vw,15px);letter-spacing:.16em;color:#fff;opacity:0;animation:aiHint 1s .5s ease-out forwards,aiBreath 3.2s 1.6s ease-in-out infinite}
  .ai.press .hint,.ai.run .hint{opacity:0}
  .ai .by{position:absolute;left:0;right:0;text-align:center;bottom:calc(env(safe-area-inset-bottom,0px) + 30px);font-size:11px;letter-spacing:.3em;color:#fff;opacity:.85;pointer-events:none}
  .ai.rm .live,.ai.rm .stage{transition:none}
  .ai.rm .hint span{animation:none;opacity:.85}
  @keyframes aiHint{to{opacity:.85}}
  @keyframes aiBreath{0%,100%{opacity:.85}50%{opacity:.45}}
  @keyframes aiFlash{0%{opacity:0;transform:scale(.2)}16%{opacity:1;transform:scale(.7)}to{opacity:0;transform:scale(1.9)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = document.createElement('div'); el.className = 'ai' + (reduce ? ' rm' : ''); el.dataset.phase = 'idle';
  el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'ARTMOS — ' + C[1]);
  const span = (t, cls = '') => `<span class="ch ${cls}" data-c="${t}">${t}</span>`;
  el.innerHTML = `<canvas></canvas>
    <div class="stage">
      <div class="word ghost" aria-hidden="true">${[...'ARTMOS'].map((t) => span(t, 'on')).join('')}</div>
      <div class="word live" aria-hidden="true">
        <span class="art">${[...'ART'].map((t, i) => span(t, 'k k' + i)).join('')}</span><span class="gap"></span>
        <span class="cos">${span('C', 'x')}${span('O', 'x')}${span('S', 'x')}${span('M', 'k k3')}${span('O', 'k k4')}${span('S', 'k k5')}</span>
      </div>
      <span class="flash"></span>
    </div>
    <div class="copy"><b>${C[0]}</b></div>
    <div class="hint"><span>${C[1]}</span></div>
    <p class="by">ARTMOS · BY VALIX LAB</p>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s), $$ = (s) => [...el.querySelectorAll(s)];
  try { document.fonts.load("40px 'ARTMOS Michroma'").catch(() => {}); } catch (e) {} // 꾹 누르는 동안 미리 받아 둠

  // ---------- 화면: 한 캔버스(불투명)에 별 터널 + 중앙 빛/링 ----------
  const cv = $('canvas'), cx = cv.getContext('2d', { alpha: false });
  let dpr = Math.min(devicePixelRatio || 1, 1.5), W = 0, H = 0;
  const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); const onResize = () => size(); addEventListener('resize', onResize); visualViewport?.addEventListener('resize', onResize);
  // 화면 크기가 늦게 정해지거나(글꼴·CSS 늦게 도착, 주소창 접힘) resize가 안 오는 브라우저가 있어, 매 프레임 크기가 달라졌는지 보고 다시 맞춤 — 안 하면 별·링이 찌그러져 보임
  const spr = document.createElement('canvas'); spr.width = spr.height = 128; // 번지는 빛 그림 한 장(여러 번 재사용)
  { const g = spr.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const NS_MAX = 220, NB = 6, COL = ['255,255,255', '255,255,255'];
  let ns = NS_MAX; const S = [];
  const star = (z) => ({ a: Math.random() * 6.283, d: 0.05 + Math.pow(Math.random(), 0.7) * 0.95, z, c: Math.random() < 0.75 ? 0 : 1 });
  for (let i = 0; i < NS_MAX; i++) S.push(star(0.05 + Math.random() * 0.95));
  const SS = []; for (let c = 0; c < 2; c++) for (let k = 0; k < NB; k++) SS.push(`rgba(${COL[c]},${((k + 1) / NB * 0.62).toFixed(3)})`);
  const buf = Array.from({ length: 2 * NB }, () => new Float32Array(NS_MAX * 4)), cnt = new Int32Array(2 * NB);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // ---------- 소리: 공용 출력 + 꾹 누르는 동안 차오르는 화음 + 합쳐지는 순간 북·종 ----------
  let ac = null, out = null, nb = null, drone = null;
  // 잔향·바람 소리 재료(잡음)는 대기 중 쉬는 틈에 조금씩 미리 만들어 둠 → 꾹 누르는 순간 끊기지 않음 (48kHz 기준 길이, 다른 샘플레이트여도 질감 차이 없음)
  const IR_N = 168000, NZ_N = 96000, TOTAL = IR_N * 2 + NZ_N, irL = new Float32Array(IR_N), irR = new Float32Array(IR_N), nz = new Float32Array(NZ_N);
  let gen = 0;
  function genTo(lim) {
    lim = Math.min(lim, TOTAL);
    for (; gen < lim; gen++) {
      if (gen < IR_N) { const x = 1 - gen / IR_N; irL[gen] = (Math.random() * 2 - 1) * x * x * x; }
      else if (gen < IR_N * 2) { const i = gen - IR_N, x = 1 - i / IR_N; irR[i] = (Math.random() * 2 - 1) * x * x * x; }
      else nz[gen - IR_N * 2] = Math.random() * 2 - 1;
    }
  }
  if (soundOn) { const step = () => { if (closing) return; if (gen >= TOTAL) { setTimeout(() => { if (phase === 'idle') audioBuild(); }, 150); return; } genTo(gen + 14000); if (window.requestIdleCallback) requestIdleCallback(step, { timeout: 250 }); else setTimeout(step, 40); }; setTimeout(step, 300); }
  function audioBuild() { // 소리 장치(잔향·압축기)를 만들어 둠. 대기 중에 미리 해 두면(멈춰 있는 상태) 터치 순간에 끊기지 않음
    if (!soundOn || ac) return;
    try {
      {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        out = ac.createGain(); out.gain.value = 0.85;
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.003;
        genTo(TOTAL); // 아직 못 만든 재료가 있으면 마저(보통은 이미 끝나 있음)
        const ir = ac.createBuffer(2, IR_N, ac.sampleRate); ir.copyToChannel(irL, 0); ir.copyToChannel(irR, 1); // 큰 홀 잔향
        const verb = ac.createConvolver(); verb.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.6;
        out.connect(comp); comp.connect(ac.destination); out.connect(verb); verb.connect(wet); wet.connect(comp);
        nb = ac.createBuffer(1, NZ_N, ac.sampleRate); nb.copyToChannel(nz, 0);
      }
    } catch (e) { ac = null; }
  }
  function audioInit() { // 첫 터치 안에서 소리를 풀어 줌(브라우저는 터치 없이는 소리를 못 켬)
    if (!soundOn) return;
    audioBuild(); if (!ac) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { if (ac.state === 'suspended') ac.resume(); } catch (e) {}
  }
  function droneStart() { // 꾹 누르는 동안: 낮은 화음 + 바람 소리가 누른 만큼 열림
    if (!ac || drone) return;
    try {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9; lp.frequency.value = 140;
      const g = ac.createGain(); g.gain.value = 0.0001; lp.connect(g); g.connect(out);
      const oscs = [65.41, 98, 130.81].flatMap((f) => [-5, 5].map((det) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(); return o; }));
      const src = ac.createBufferSource(); src.buffer = nb; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.value = 400;
      const ng = ac.createGain(); ng.gain.value = 0.0001; src.connect(bp); bp.connect(ng); ng.connect(out); src.start();
      drone = { lp, g, bp, ng, oscs, src };
    } catch (e) { drone = null; }
  }
  function droneSet(e) {
    if (!drone) return; const t = ac.currentTime;
    drone.g.gain.setTargetAtTime(0.0001 + 0.1 * e, t, 0.08); drone.lp.frequency.setTargetAtTime(140 + 1700 * e * e, t, 0.1);
    drone.bp.frequency.setTargetAtTime(300 + 4200 * e, t, 0.1); drone.ng.gain.setTargetAtTime(0.0001 + 0.09 * e * e, t, 0.1);
  }
  function droneStop(fade = 0.12) {
    if (!drone) return; const d = drone; drone = null;
    try { const t = ac.currentTime; d.g.gain.setTargetAtTime(0.0001, t, fade); d.ng.gain.setTargetAtTime(0.0001, t, fade); const end = t + fade * 8; d.oscs.forEach((o) => o.stop(end)); d.src.stop(end); } catch (e) {}
  }
  function sound(at = 0) { // 합쳐지는 순간까지 차오르는 화음 → 북 + 종 화음 + 큰 홀 잔향
    if (!ac) return;
    try {
      const s0 = ac.currentTime + 0.05 - at, hit = s0 + T.hit / 1000;
      const env = (g, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(peak, a + hold); g.gain.exponentialRampToValueAtTime(0.0001, a + hold + rel); };
      // 1) 차오르는 화음(낮은 금관·현 느낌): C2-G2-C3-E3, 톱니파 두 겹을 살짝 어긋나게 + 열리는 필터
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(220, s0); lp.frequency.exponentialRampToValueAtTime(1800, hit); lp.frequency.exponentialRampToValueAtTime(500, hit + 2.5);
      const pad = ac.createGain(); pad.gain.setValueAtTime(0.0001, s0); pad.gain.exponentialRampToValueAtTime(0.11, hit - 0.05); pad.gain.exponentialRampToValueAtTime(0.06, hit + 0.4); pad.gain.exponentialRampToValueAtTime(0.0001, hit + 3.2);
      lp.connect(pad); pad.connect(out);
      [65.41, 98, 130.81, 164.81].forEach((f) => [-6, 6].forEach((det) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(s0); o.stop(hit + 3.4); }));
      // 2) 공기가 빨려 들어가는 소리(합쳐지기 직전)
      const air = ac.createBufferSource(); air.buffer = nb; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5;
      bp.frequency.setValueAtTime(300, hit - 1.2); bp.frequency.exponentialRampToValueAtTime(5000, hit - 0.02);
      const ag = ac.createGain(); env(ag, hit - 1.2, 0.14, 1.15, 0.12); air.connect(bp); bp.connect(ag); ag.connect(out); air.start(hit - 1.2); air.stop(hit + 0.3);
      // 3) 합쳐지는 순간: 깊은 북(팀파니) + 서브 저음
      const boom = ac.createOscillator(); boom.type = 'sine'; boom.frequency.setValueAtTime(110, hit); boom.frequency.exponentialRampToValueAtTime(42, hit + 0.6);
      const bg = ac.createGain(); env(bg, hit, 0.55, 0.008, 1.6); boom.connect(bg); bg.connect(out); boom.start(hit); boom.stop(hit + 1.8);
      const thump = ac.createBufferSource(); thump.buffer = nb; const tl = ac.createBiquadFilter(); tl.type = 'lowpass'; tl.frequency.value = 900;
      const tg = ac.createGain(); env(tg, hit, 0.25, 0.004, 0.25); thump.connect(tl); tl.connect(tg); tg.connect(out); thump.start(hit); thump.stop(hit + 0.4);
      // 4) 종 화음 C4-G4-E5-B5-D6 (배음 섞은 종소리, 조금씩 늦게 퍼짐)
      [[261.63, 0.13], [392, 0.1], [659.25, 0.085], [987.77, 0.05], [1174.66, 0.035]].forEach(([f, g], k) => [1, 2.76, 5.4].forEach((m, j) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * m * (1 + (k % 2 ? 0.0015 : -0.001));
        const gg = ac.createGain(); env(gg, hit + 0.02 + k * 0.05, g / (j + 1) / (j ? 2.5 : 1), 0.01, j ? 1.3 : 3.6);
        o.connect(gg); gg.connect(out); o.start(hit + k * 0.05); o.stop(hit + 4.2);
      }));
      // 5) 위성이 고리를 도는 반짝임
      const sh = ac.createOscillator(); sh.type = 'triangle'; sh.frequency.setValueAtTime(2093, hit + 0.2); sh.frequency.exponentialRampToValueAtTime(4186, hit + 1.6);
      const shg = ac.createGain(); env(shg, hit + 0.2, 0.018, 0.4, 1.1); sh.connect(shg); shg.connect(out); sh.start(hit + 0.2); sh.stop(hit + 1.8);
    } catch (e) {}
  }

  // ---------- 진행: 대기 → 꾹 누르기 → 연출(run) → 앱 ----------
  let phase = 'idle', pressed = false, p = 0, raf = 0, lt = 0, t0 = 0, tRun = 0, ev = [], evI = 0, closing = false, spCur = 0.07, lastDrone = 0, qN = 0, qAcc = 0;
  const held = new Set();
  const setPhase = (v) => { phase = v; el.dataset.phase = v; };
  function press(id) { if (phase !== 'idle') return; held.add(id); pressed = true; el.classList.add('press'); audioInit(); droneStart(); }
  function release(id) { held.delete(id); if (held.size) return; pressed = false; el.classList.remove('press'); }
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} press('p' + e.pointerId); });
  const up = (e) => release('p' + e.pointerId);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); press('key'); } });
  el.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') release('key'); });
  const onHide = () => { held.clear(); pressed = false; el.classList.remove('press'); };
  addEventListener('blur', onHide); document.addEventListener('visibilitychange', onHide);

  function finish() {
    if (closing) return; closing = true; el.classList.add('out');
    setTimeout(() => {
      cancelAnimationFrame(raf); el.remove(); st.remove(); removeEventListener('resize', onResize); visualViewport?.removeEventListener('resize', onResize); removeEventListener('blur', onHide); document.removeEventListener('visibilitychange', onHide); droneStop();
      if (ac && ac.state !== 'closed') setTimeout(() => ac.close().catch(() => {}), 4000);
    }, 720);
  }
  function commit(now) { // 링이 다 참 → 연출 시작
    setPhase('run'); el.classList.remove('press'); el.classList.add('run'); tRun = now; pressed = false; held.clear(); p = 1;
    try { navigator.vibrate && navigator.vibrate(25); } catch (e) {}
    droneStop(0.25);
    const live = $('.live'), E = (ms, fn) => ev.push([ms, fn]);
    if (reduce) {
      sound(T.hit / 1000 - 0.45);
      E(80, () => { $$('.live .k').forEach((c) => c.classList.add('on')); $$('.live .x').forEach((c) => c.remove()); $('.live .gap').remove(); live.classList.add('big'); el.classList.add('copyon'); });
      E(2300, finish);
    } else {
      sound(0);
      $$('.art .ch').forEach((c, i) => E(T.art + i * 110, () => c.classList.add('on')));
      $$('.cos .ch').forEach((c, i) => E(T.cosmos + i * 70, () => c.classList.add('on')));
      E(T.scatter, () => $$('.cos .x').forEach((c, i) => { c.classList.add('dust'); c.style.transform = `translate(${(i - 1) * 40}px,${-54 - i * 16}px) scale(.4)`; })); // COS가 흩어짐
      E(T.join, () => { // 남은 글자를 ARTMOS 자리로(ghost 단어의 글자 위치, 크기 변환과 무관한 레이아웃 값) + 작던 글씨가 자라남
        const ghost = $$('.ghost .ch'), liveCh = [0, 1, 2, 3, 4, 5].map((i) => $('.live .k' + i)), gw = $('.ghost');
        const mid = (c, w) => c.offsetLeft + c.offsetWidth / 2 - w.offsetWidth / 2;
        liveCh.forEach((c, i) => { c.style.transform = `translate(${mid(ghost[i], gw) - mid(c, live)}px,0)`; });
        live.classList.add('mid');
      });
      E(T.hit - 40, () => { $('.flash').classList.add('on'); live.classList.add('big'); });
      E(T.copy, () => el.classList.add('copyon'));
      E(T.end + TAIL, finish);
    }
    ev.sort((a, b) => a[0] - b[0]);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (cv.clientWidth !== W || cv.clientHeight !== H) size();
    if (!t0) t0 = now; const dt = Math.min(0.05, (now - (lt || now)) / 1000); lt = now;
    if (qN < 70) { qN++; if (qN > 20) qAcc += dt; if (qN === 70 && qAcc / 50 > 0.026 && ns > 110) { ns = 110; if (dpr > 1) { dpr = 1; size(); } } } // 느린 기기: 별 수·해상도 자동으로 낮춤
    let e = 0;
    if (phase === 'idle') {
      p = pressed ? Math.min(1, p + dt * 1000 / HOLD) : Math.max(0, p - dt * 1000 / RELEASE);
      e = p * p * (3 - 2 * p);
      if (p >= 1) commit(now);
      else if (now - lastDrone > 60) { lastDrone = now; droneSet(e); if (!pressed && p === 0) droneStop(); }
    }
    const tr = phase === 'run' ? now - tRun : 0;
    if (phase === 'run') while (evI < ev.length && tr >= ev[evI][0]) ev[evI++][1]();
    let target; // 별 터널 속도
    if (phase === 'idle') target = 0.07 + 0.95 * e * e;
    else { const u = Math.min(1, tr / T.hit); target = tr < T.hit ? 1 + 0.4 * u * u : 0.45 + 0.95 * (1 - Math.min(1, (tr - T.hit) / 1400)); }
    spCur += (target - spCur) * Math.min(1, dt * 8);

    cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    const mx = W / 2, my = H / 2, M = Math.max(W, H), Rf = M * 0.1;
    if (!reduce) {
      const fade = Math.min(1, (now - t0) / 700), swirl = (now - t0) * 0.00015; cnt.fill(0);
      for (let i = 0; i < ns; i++) {
        const s = S[i]; s.z -= spCur * dt * (0.6 + s.d * 0.6);
        const rad = s.d * Rf / s.z;
        if (s.z < 0.03 || rad > M * 0.8) { Object.assign(s, star(1)); continue; }
        const pz = Math.min(1.2, s.z + spCur * dt * 2.2), prad = s.d * Rf / pz, ang = s.a + swirl, ca = Math.cos(ang), sa = Math.sin(ang) * 0.82;
        const al = Math.min(1, (1 - s.z) * 1.25 + 0.08) * fade * Math.min(1, rad / 110); if (al <= 0.01) continue;
        const bi = s.c * NB + Math.min(NB - 1, (al * NB) | 0), b = buf[bi], n = cnt[bi]++ * 4;
        b[n] = mx + ca * prad; b[n + 1] = my + sa * prad; b[n + 2] = mx + ca * rad; b[n + 3] = my + sa * rad;
      }
      cx.lineCap = 'round';
      for (let bi = 0; bi < 2 * NB; bi++) { // 색·밝기별로 묶어서 한 번에 긋기
        const n = cnt[bi]; if (!n) continue; const b = buf[bi];
        cx.strokeStyle = SS[bi]; cx.lineWidth = 0.6 + ((bi % NB) + 1) / NB * 1.1; cx.beginPath();
        for (let k = 0; k < n * 4; k += 4) { cx.moveTo(b[k], b[k + 1]); cx.lineTo(b[k + 2], b[k + 3]); }
        cx.stroke();
      }
    }
    if (phase === 'idle') { // 가운데 빛 + 링(꾹 누르면 차오름)
      const r = 9 + 2 * Math.sin(now / 650) + 30 * e, R = r * 2.4;
      cx.globalAlpha = Math.min(1, 0.55 + 0.45 * e); cx.drawImage(spr, mx - R, my - R, 2 * R, 2 * R);
      cx.globalAlpha = 1; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(mx, my, 2.2 + 2.5 * e, 0, 6.283); cx.fill();
      cx.lineWidth = 1.5; cx.strokeStyle = 'rgba(255,255,255,.16)'; cx.beginPath(); cx.arc(mx, my, 46, 0, 6.283); cx.stroke();
      if (p > 0.004) { cx.lineWidth = 2.4; cx.lineCap = 'round'; cx.strokeStyle = 'rgba(255,255,255,.95)'; cx.beginPath(); cx.arc(mx, my, 46, -1.5708, -1.5708 + p * 6.283); cx.stroke(); }
    } else if (phase === 'run' && tr < 650) { // 합쳐지기 시작: 빛이 번짐
      const u = tr / 650, R = 50 + 320 * easeOut(u); cx.globalAlpha = (1 - u) * 0.85; cx.drawImage(spr, mx - R, my - R, 2 * R, 2 * R); cx.globalAlpha = 1;
    }
  }
  raf = requestAnimationFrame(frame);
})();
