// Humming Letter — 허밍 듣기: 소리 크기와 높낮이만 이 기기 안에서 계산합니다. 녹음·저장·전송하지 않습니다.
export const voice = {
  on: false,
  level: 0,    // 0~1 평소보다 얼마나 큰지
  pitch: 0,    // Hz (모르면 0)
  clarity: 0,  // 0~1 음 높이가 또렷한 정도(허밍·노래는 높고, 바람 소리는 낮음)
  note: 0.5,   // 0~1 높낮이(110Hz=0 … 880Hz=1)
  voiced: false, // 지금 흥얼거리는 중
  blow: 0,     // 0~1 '후~' 세기(크고, 음 높이가 흐릿한 소리)
  ready: false, // 마이크 소리가 실제로 들어오는 중(소리 장치가 깨어 있음)
  error: '',   // 못 켰을 때 이유
};
let ac = null, an = null, stream = null, buf = null, ds = null, floor = 0, timer = 0;

// 꼭 '누른 순간' 바로 부를 것(await 뒤에 부르면 아이폰·크롬이 소리 장치를 멈춘 채로 둠)
export async function startVoice() {
  if (voice.on) { try { ac.resume(); } catch (e) {} return true; }
  voice.error = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { voice.error = 'unsupported'; throw new Error('unsupported'); }
  // 아이폰: 소리 장치를 터치 순간에 만들고 바로 깨움
  ac = new (window.AudioContext || window.webkitAudioContext)();
  try { ac.resume(); } catch (e) {}
  // 전시 배경음이 마이크로 다시 들어가 혼자 편지가 써지지 않게 메아리 지우기는 켬
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } }); }
  catch (e) { voice.error = (e && e.name) || 'error'; try { ac.close(); } catch (x) {} ac = null; throw e; }
  try { await ac.resume(); } catch (e) {}
  const src = ac.createMediaStreamSource(stream);
  an = ac.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
  src.connect(an);
  buf = new Float32Array(an.fftSize); ds = new Float32Array(an.fftSize / 2);
  voice.on = true;
  timer = setInterval(read, 33);
  // 앱 전환·잠금 뒤 마이크가 끊기면 다시 켤 수 있게
  stream.getAudioTracks().forEach((t) => t.addEventListener('ended', () => { stopVoice(); voice.error = 'ended'; }));
  return true;
}
export function stopVoice() {
  if (!voice.on) return; clearInterval(timer);
  try { stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
  try { ac.close(); } catch (e) {}
  voice.on = false; voice.ready = false; voice.level = 0; voice.voiced = false; voice.blow = 0;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && ac) { try { ac.resume(); } catch (e) {} } });
['touchend', 'pointerup', 'click'].forEach((t) => addEventListener(t, () => { if (ac && ac.state !== 'running') { try { ac.resume(); } catch (e) {} } }, { capture: true, passive: true }));

const D = new Float32Array(400);
function read() {
  voice.ready = !!an && ac.state === 'running';
  if (!voice.ready) { voice.level *= 0.8; return; }
  an.getFloatTimeDomainData(buf);
  // 반으로 줄여(샘플 2개 평균) 계산을 가볍게
  let sq = 0;
  for (let i = 0; i < ds.length; i++) { const v = (buf[2 * i] + buf[2 * i + 1]) * 0.5; ds[i] = v; sq += v * v; }
  const rms = Math.sqrt(sq / ds.length) || 1e-6;
  if (!floor) floor = rms;
  const snr = 20 * Math.log10(rms / Math.max(floor, 2e-4));
  floor += (rms - floor) * (rms < floor ? 0.25 : snr < 6 ? 0.02 : 0.0006);
  const lvl = Math.max(0, Math.min(1, (snr - 6) / 26));
  voice.level += (lvl - voice.level) * (lvl > voice.level ? 0.5 : 0.18);

  // 높낮이: YIN 방식(차이 함수 → 누적 평균으로 나눔 → 처음으로 0.2보다 작은 곳)
  const sr = ac.sampleRate / 2, minLag = Math.floor(sr / 900), maxLag = Math.min(D.length - 1, Math.floor(sr / 85));
  const N = ds.length - maxLag;
  let f = 0, clar = 0;
  if (lvl > 0.04) {
    let run = 0; D[0] = 1;
    for (let tau = 1; tau <= maxLag; tau++) {
      let s = 0; for (let i = 0; i < N; i += 2) { const d = ds[i] - ds[i + tau]; s += d * d; }
      run += s; D[tau] = run ? (s * tau) / run : 1;
    }
    let best = -1;
    for (let tau = minLag; tau < maxLag; tau++) {
      if (D[tau] < 0.2) { while (tau + 1 < maxLag && D[tau + 1] < D[tau]) tau++; best = tau; break; }
    }
    if (best < 0) { let m = 9; for (let tau = minLag; tau < maxLag; tau++) if (D[tau] < m) { m = D[tau]; best = tau; } }
    if (best > 0) {
      const a = D[best - 1], b = D[best], c = D[best + 1] ?? b;
      const sh = (a - c) / (2 * (a - 2 * b + c) || 1);
      f = sr / (best + (isFinite(sh) ? Math.max(-1, Math.min(1, sh)) : 0));
      clar = Math.max(0, Math.min(1, 1 - D[best]));
    }
  }
  voice.clarity += (clar - voice.clarity) * 0.4;
  const voiced = voice.level > 0.07 && clar > 0.72 && f > 85 && f < 900;
  voice.voiced = voiced;
  if (voiced) {
    voice.pitch = voice.pitch ? voice.pitch + (f - voice.pitch) * 0.45 : f;
    const n = Math.max(0, Math.min(1, Math.log2(voice.pitch / 110) / 3));
    voice.note += (n - voice.note) * 0.35;
  }
  const b = voice.level > 0.12 && clar < 0.55 ? Math.min(1, voice.level * 1.3) : 0;
  voice.blow += (b - voice.blow) * (b > voice.blow ? 0.6 : 0.15);
}
