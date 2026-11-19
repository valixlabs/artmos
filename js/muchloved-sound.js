// MUCH LOVED 소리 — 음원 파일 없이 Web Audio로 실시간 합성 (2026-11-19)
// 배경음: 자장가 오르골(직접 지은 선율) + 부드러운 화음 + 방 공기. 장마다 분위기가 바뀜
//   intro(박동만) · wall(맑은 오르골) · drawer(조금 느리게) · sofa(낮고 따뜻하게) · floor(금속 종, 태엽이 풀리듯 느려짐) · sleep(거의 고요) · end(다시 밝게)
// 체험 소리: 천 스침·바람·실밥 찢어짐·눌림·솜·심장·톡톡·천 늘어남·실밥 끊김·소파 구름·쿠션에서 빠져나옴·뽁·대답하는 종·서랍·입김·금속·바느질
// 소리 끄기(xpace-sound=off)를 따르고, 아이폰 무음 스위치가 켜져 있어도 나게 함.
let ctx = null, meter = null, master, comp, dry, wet, rev, music, sfx, pad = [], loops = {}, on = false, scene = 'intro';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function impulse(sec = 3.2) {
  const len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, 2.4); } }
  return b;
}
let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// 아이폰 무음 스위치가 켜져 있어도 소리가 나게
let unlockEl = null;
function unlockIOS() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  if (!/iP(hone|ad|od)/.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return;
  if (!unlockEl) { const n = 2000, a = new Uint8Array(44 + n), v = new DataView(a.buffer), w = (o, t) => [...t].forEach((ch, i) => { a[o + i] = ch.charCodeAt(0); }); w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); a.fill(128, 44); let str = ''; a.forEach((x) => { str += String.fromCharCode(x); }); unlockEl = document.createElement('audio'); unlockEl.src = 'data:audio/wav;base64,' + btoa(str); unlockEl.loop = true; unlockEl.setAttribute('playsinline', ''); }
  unlockEl.play().catch(() => {});
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  meter = ctx.createAnalyser(); meter.fftSize = 1024; master.connect(meter);
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(master);
  rev = ctx.createConvolver(); rev.buffer = impulse();
  wet = ctx.createGain(); wet.gain.value = 0.45; rev.connect(wet); wet.connect(comp);
  dry = ctx.createGain(); dry.gain.value = 0.75; dry.connect(comp);
  music = ctx.createGain(); music.gain.value = 0.5; music.connect(dry); music.connect(rev);
  sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(dry); const sw = ctx.createGain(); sw.gain.value = 0.35; sfx.connect(sw); sw.connect(rev);
  // 부드러운 화음(세 목소리, 저음 거르기)
  const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 650; pf.Q.value = 0.3; pf.connect(music);
  for (let k = 0; k < 3; k++) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine'; o2.detune.value = 6 + k * 3; g.gain.value = 0;
    o.connect(g); o2.connect(g); g.connect(pf); o.start(); o2.start(); pad.push({ o, o2, g });
  }
  pad.filter = pf;
  // 방 공기(아주 옅은 숨)
  const air = ctx.createBufferSource(); air.buffer = noise(); air.loop = true;
  const af = ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 380;
  const ag = ctx.createGain(); ag.gain.value = 0.012; air.connect(af); af.connect(ag); ag.connect(music); air.start();
  // 계속 이어지는 체험 소리(세기만 바꿈)
  loops.rustle = noiseLoop('bandpass', 2600, 0.9, 0.5);      // 천 스침(문지르기·쿠션)
  loops.wind = noiseLoop('bandpass', 700, 0.6, 0.55, 0.12);  // 후~ 바람
  loops.rumble = noiseLoop('lowpass', 160, 0.7, 0.9);         // 소파 위 구름
  loops.slide = noiseLoop('lowpass', 900, 1.2, 0.5, 6);      // 나무 서랍 미끄러짐
  loops.creak = toneLoop('sawtooth', 110, 'bandpass', 900, 3, 0.18); // 천이 늘어나는 삐걱
  loops.squeak = toneLoop('sine', 900, 'highpass', 300, 0.5, 0.06);  // 쿠션 틈에서 빠져나오는 끽끽
}
function noiseLoop(type, f, q, max, lfo = 0) {
  const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true; s.playbackRate.value = 0.7 + Math.random() * 0.3;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(sfx); s.start();
  if (lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfo; lg.gain.value = f * 0.35; l.connect(lg); lg.connect(fl.frequency); l.start(); }
  return { g, f: fl, max, base: f };
}
function toneLoop(wave, f, ftype, ff, q, max) {
  const o = ctx.createOscillator(); o.type = wave; o.frequency.value = f;
  const fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.value = ff; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0; o.connect(fl); fl.connect(g); g.connect(sfx); o.start();
  return { g, f: fl, o, max, base: f };
}

// ── 한 번 나는 소리들
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(f, { t = 0, a = 0.004, d = 0.4, v = 0.2, wave = 'sine', to = null, bus = sfx, pan = 0 } = {}) {
  const at = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain(); o.type = wave; o.frequency.setValueAtTime(f, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + a + d);
  env(g, at, a, v, d); o.connect(g);
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
  o.start(at); o.stop(at + a + d + 0.05);
}
function burst({ t = 0, type = 'bandpass', f = 2000, q = 1, a = 0.002, d = 0.08, v = 0.3, rate = 1 } = {}) {
  const at = ctx.currentTime + t, s = ctx.createBufferSource(); s.buffer = noise(); s.playbackRate.value = rate;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); env(g, at, a, v, d); s.connect(fl); fl.connect(g); g.connect(sfx);
  s.start(at, Math.random() * 1.5); s.stop(at + a + d + 0.05);
}
// 오르골 한 음: 맑은 바탕음 + 높은 배음, 빨리 사라짐
function boxNote(m, v = 0.12, t = 0, metal = false) {
  const f = mtof(m), at = ctx.currentTime + t;
  const parts = metal ? [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]] : [[1, 1], [2, 0.35], [3.01, 0.12], [4.2, 0.06]];
  parts.forEach(([r, amp]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * r;
    const dec = (metal ? 3.2 : 1.6) / Math.sqrt(r);
    env(g, at, 0.003, v * amp, dec); o.connect(g); g.connect(music); o.start(at); o.stop(at + dec + 0.1);
  });
}
const FX = {
  heart(v = 1) { tone(78, { d: 0.32, v: 0.5 * v, to: 46 }); tone(72, { t: 0.36, d: 0.3, v: 0.32 * v, to: 44 }); },
  rip(v = 1) { for (let i = 0; i < 5; i++) burst({ t: i * 0.018 + Math.random() * 0.01, f: 2400 + Math.random() * 1600, q: 3, d: 0.025, v: 0.16 * v }); },
  fluff() { burst({ type: 'lowpass', f: 700, d: 0.12, v: 0.08 }); },
  squish() { burst({ type: 'lowpass', f: 420, q: 0.8, a: 0.04, d: 0.35, v: 0.35, rate: 0.6 }); tone(110, { a: 0.03, d: 0.4, v: 0.12, to: 70 }); },
  unsquish() { burst({ type: 'lowpass', f: 600, a: 0.05, d: 0.25, v: 0.14, rate: 0.8 }); },
  puff(v = 1) { for (let i = 0; i < 3; i++) burst({ t: i * 0.07, type: 'lowpass', f: 500, d: 0.09, v: 0.14 * v, rate: 0.7 }); },
  knock() { tone(250 + Math.random() * 30, { d: 0.09, v: 0.3, to: 180 }); burst({ type: 'highpass', f: 2500, d: 0.015, v: 0.08 }); },
  snap() { burst({ type: 'highpass', f: 3000, d: 0.03, v: 0.4 }); tone(1900, { t: 0.01, d: 0.25, v: 0.06, to: 1200 }); FX.rip(0.8); },
  thud(v = 0.4) { tone(90, { d: 0.18, v: 0.3 * v, to: 55 }); burst({ type: 'lowpass', f: 300, d: 0.1, v: 0.12 * v }); },
  pop() { tone(380, { d: 0.12, v: 0.3, to: 950 }); burst({ type: 'bandpass', f: 1400, d: 0.04, v: 0.15 }); setTimeout(() => FX.chime([79, 84]), 120); },
  chime(ms = [76, 81], gap = 0.16, v = 0.14) { ms.forEach((m, i) => boxNote(m, v, i * gap)); },
  answer() { FX.chime([79, 83, 86], 0.14, 0.13); },
  clunk() { tone(140, { d: 0.12, v: 0.3, to: 90 }); burst({ type: 'lowpass', f: 500, d: 0.08, v: 0.2 }); },
  ding() { boxNote(88 + Math.floor(Math.random() * 3) * 2, 0.05, 0, true); },
  breath() { burst({ type: 'bandpass', f: 1200, q: 0.4, a: 0.12, d: 0.5, v: 0.06, rate: 0.5 }); },
  stitch() { burst({ type: 'highpass', f: 4000, d: 0.012, v: 0.06 }); },
  wake() { FX.chime([72, 76, 79, 84], 0.2, 0.12); },
  reset() { FX.chime([84, 79], 0.12, 0.08); },
};

// ── 배경음: 직접 지은 자장가(8마디, 8분음표) + 화음
const MEL = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74, 71, 74, 79, 74, 72, 76, 79, 76, 69, 72, 77, 72, 71, 74, 72, 0];
const CH = [[48, 55, 64], [50, 57, 65], [48, 55, 64], [43, 55, 62], [43, 55, 62], [48, 55, 64], [41, 53, 60], [43, 55, 62]];
const SC = {
  intro: { vol: 0.5, bpm: 0, oct: 0, pad: 0.04, cut: 500 },
  wall: { vol: 1, bpm: 76, oct: 0, pad: 0.05, cut: 700 },
  drawer: { vol: 0.9, bpm: 64, oct: 0, pad: 0.05, cut: 650 },
  sofa: { vol: 0.95, bpm: 66, oct: -12, pad: 0.07, cut: 520 },
  floor: { vol: 0.8, bpm: 54, oct: 12, pad: 0.035, cut: 900, metal: true, unwind: true },
  sleep: { vol: 0.12, bpm: 0, oct: 0, pad: 0.02, cut: 300 },
  end: { vol: 1, bpm: 80, oct: 0, pad: 0.06, cut: 800 },
};
let step = 0, nextT = 0, timer = 0, unwind = 1;
function tick() {
  if (!ctx || !on) return; const s = SC[scene] || SC.wall;
  if (!s.bpm) { nextT = ctx.currentTime + 0.1; return; }
  while (nextT < ctx.currentTime + 0.25) {
    const m = MEL[step % MEL.length];
    if (s.unwind) unwind = Math.max(0.45, unwind * 0.996); else unwind = Math.min(1, unwind + 0.05);
    if (m && !(s.metal && Math.random() < 0.35)) boxNote(m + s.oct, (s.metal ? 0.07 : 0.1) * (0.85 + Math.random() * 0.3), Math.max(0, nextT - ctx.currentTime), s.metal);
    if (step % 4 === 0) { const c = CH[Math.floor(step / 4) % CH.length]; pad.forEach((p, k) => { const f = mtof(c[k] + Math.min(0, s.oct)); p.o.frequency.setTargetAtTime(f, nextT, 0.4); p.o2.frequency.setTargetAtTime(f, nextT, 0.4); }); }
    step++; nextT += 60 / (s.bpm * 2) / unwind;
  }
}
function applyScene() {
  if (!ctx) return; const s = SC[scene] || SC.wall, t = ctx.currentTime;
  music.gain.setTargetAtTime(0.5 * s.vol, t, scene === 'sleep' ? 1.5 : 0.8);
  pad.forEach((p) => p.g.gain.setTargetAtTime(s.pad, t, 1.2));
  pad.filter.frequency.setTargetAtTime(s.cut, t, 1);
  wet.gain.setTargetAtTime(s.metal ? 0.65 : 0.45, t, 1);
}

export const snd = {
  get on() { return on; },
  allowed() { try { return localStorage.getItem('xpace-sound') !== 'off'; } catch (e) { return true; } },
  async start() {
    unlockIOS(); if (!ctx) build();
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) {} }
    on = true; master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.8); nextT = ctx.currentTime + 0.1;
    applyScene(); clearInterval(timer); timer = setInterval(tick, 100);
  },
  stop() { on = false; clearInterval(timer); if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, 0.3); Object.values(loops).forEach((l) => l.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05)); } if (unlockEl) unlockEl.pause(); },
  scene(n) { if (n === scene) return; scene = n; if (n !== 'floor') unwind = 1; applyScene(); },
  // 이어지는 소리 세기(0~1), 매 프레임 불러도 됨
  set(name, v, pitch) {
    if (!ctx || !on) return; const l = loops[name]; if (!l) return; const t = ctx.currentTime;
    l.g.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * l.max, t, 0.06);
    if (pitch != null && l.o) l.o.frequency.setTargetAtTime(l.base * (1 + pitch), t, 0.05);
    if (pitch != null && !l.o) l.f.frequency.setTargetAtTime(l.base * (1 + pitch), t, 0.08);
  },
  fx(name, ...a) { if (ctx && on && FX[name]) FX[name](...a); },
  // 시험용: 지금 나오는 소리 크기(RMS)
  level() { if (!meter) return 0; const b = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return Math.sqrt(s / b.length); },
};
// 앱 전환·전화 뒤에 멈춘 소리를 다시 켬 (iPhone)
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { if (unlockEl) unlockEl.pause(); } else if (on) { unlockIOS(); if (ctx.state !== 'running') ctx.resume().catch(() => {}); } });
addEventListener('touchend', () => { if (ctx && on && ctx.state !== 'running') ctx.resume().catch(() => {}); }, { passive: true });
