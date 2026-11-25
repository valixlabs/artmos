// Humming Letter — 소리 (음원 파일 없이 Web Audio로 만듦)
// 배경: 장마다 바뀌는 부드러운 허밍 화음 / 체험: 물방울·바람·손가락 스침·박자·셔터·꽃 피는 종
let ac = null, out = null, padBus = null, pads = [], windG = null, windF = null, rustG = null, on = false, chord = null;
const pref = () => { try { return localStorage.getItem('xpace-sound') !== 'off'; } catch (e) { return true; } };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 장마다 화음(미디 번호) — 따뜻한 F장조 근처에서 천천히 옮겨 다님
const CHORDS = {
  gate: [53, 60, 65, 69], tired: [50, 57, 62, 65], garden: [53, 60, 64, 69], heaven: [55, 62, 67, 71],
  wind: [52, 59, 64, 67], finger: [57, 64, 67, 72], rhythm: [50, 57, 62, 66], always: [48, 55, 60, 64],
  ordinary: [53, 57, 60, 65], letter: [55, 59, 62, 67], finale: [53, 60, 65, 69, 72], works: [53, 60, 65],
};

function noiseBuf(sec = 2) {
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function build() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
  out = ac.createGain(); out.gain.value = 0;
  out.connect(comp); comp.connect(ac.destination);
  padBus = ac.createGain(); padBus.gain.value = 0.16;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.4;
  padBus.connect(lp); lp.connect(out);
  for (let i = 0; i < 5; i++) {
    const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle';
    const g = ac.createGain(); g.gain.value = 0;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07 + i * 0.023;
    const lg = ac.createGain(); lg.gain.value = 0.035; lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(padBus); o.start(); lfo.start();
    pads.push({ o, g });
  }
  const nb = noiseBuf(3);
  const wn = ac.createBufferSource(); wn.buffer = nb; wn.loop = true;
  windF = ac.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 0.7;
  windG = ac.createGain(); windG.gain.value = 0;
  wn.connect(windF); windF.connect(windG); windG.connect(out); wn.start();
  const rn = ac.createBufferSource(); rn.buffer = nb; rn.loop = true; rn.playbackRate.value = 0.7;
  const rf = ac.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2200;
  rustG = ac.createGain(); rustG.gain.value = 0;
  rn.connect(rf); rf.connect(rustG); rustG.connect(out); rn.start();
  // 아이폰 무음 스위치·앱 전환 뒤 다시 깨우기
  document.addEventListener('visibilitychange', () => { if (!document.hidden && on) try { ac.resume(); } catch (e) {} });
}
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(freq, { type = 'sine', vol = 0.15, a = 0.005, d = 0.9, when = 0, glide = 0 } = {}) {
  if (!on || !ac) return;
  const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t + a + d);
  env(g, t, a, vol, d); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05);
}
function burst({ vol = 0.2, d = 0.12, hp = 1500, when = 0 } = {}) {
  if (!on || !ac) return;
  const t = ac.currentTime + when, s = ac.createBufferSource(); s.buffer = noiseBuf(0.4);
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ac.createGain(); env(g, t, 0.003, vol, d);
  s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + 0.1);
}

export const snd = {
  get on() { return on; },
  start() { // 첫 터치 안에서 부름
    if (!ac) build();
    try { ac.resume(); } catch (e) {}
    if (pref()) this.setOn(true);
  },
  setOn(v) {
    if (!ac) build();
    on = !!v; try { localStorage.setItem('xpace-sound', on ? 'on' : 'off'); } catch (e) {}
    const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.3);
    if (on) { try { ac.resume(); } catch (e) {} this.chapter(chord || 'gate', true); }
  },
  chapter(k, force) {
    if (k === chord && !force) return; chord = k;
    if (!ac) return;
    const ns = CHORDS[k] || CHORDS.gate, t = ac.currentTime;
    pads.forEach((p, i) => {
      const n = ns[i % ns.length] + (i >= ns.length ? 12 : 0);
      p.o.frequency.setTargetAtTime(mtof(n), t, 1.2);
      p.g.gain.setTargetAtTime(i < ns.length ? 0.06 : 0.02, t, 1.5);
    });
    padBus.gain.setTargetAtTime(k === 'ordinary' || k === 'always' ? 0.1 : k === 'finale' ? 0.2 : 0.15, t, 1.5);
  },
  wind(v) { if (!ac) return; const t = ac.currentTime; windG.gain.setTargetAtTime(on ? Math.min(0.5, v * 0.45) : 0, t, 0.15); windF.frequency.setTargetAtTime(300 + v * 900, t, 0.2); },
  rustle(v) { if (!ac) return; rustG.gain.setTargetAtTime(on ? Math.min(0.3, v * 0.3) : 0, ac.currentTime, 0.06); },
  drop(v = 1) { const f = 700 + Math.random() * 700; tone(f, { vol: 0.12 * v, a: 0.002, d: 0.35, glide: 0.45 }); tone(f * 1.5, { vol: 0.04 * v, a: 0.002, d: 0.2, glide: 0.5, when: 0.03 }); },
  chime(m = 77, v = 1) { tone(mtof(m), { vol: 0.11 * v, d: 2.2 }); tone(mtof(m + 12), { vol: 0.035 * v, d: 1.4, when: 0.01 }); },
  beat(v = 1) { tone(90, { vol: 0.32 * v, a: 0.003, d: 0.25, glide: 0.5 }); const m = [65, 67, 69, 72, 74][Math.floor(Math.random() * 5)]; tone(mtof(m), { type: 'triangle', vol: 0.09 * v, a: 0.003, d: 0.5 }); },
  crack() { burst({ vol: 0.12, d: 0.08, hp: 2500 }); tone(mtof(84 + Math.floor(Math.random() * 5)), { vol: 0.03, d: 0.6 }); },
  shutter() { burst({ vol: 0.3, d: 0.05, hp: 3000 }); burst({ vol: 0.2, d: 0.06, hp: 2000, when: 0.09 }); },
  bloom(big) { const ns = big ? [65, 69, 72, 77, 81, 84] : [72 + Math.floor(Math.random() * 3) * 2]; ns.forEach((m, i) => tone(mtof(m), { vol: big ? 0.08 : 0.04, d: big ? 2.4 : 0.9, when: i * 0.11 })); },
  pen(v) { this.rustle(v * 0.5); },
  level() { return out ? out.gain.value : 0; },
};
