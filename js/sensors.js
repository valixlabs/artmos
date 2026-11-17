// ARTMOS 모바일 센서: 기울기 · 나침반 · 흔들기 · 진동 · 카메라
// PC에서는 아무것도 하지 않습니다. iPhone은 사용자의 탭(입장 버튼 등) 안에서 enable()을 불러야 권한을 물을 수 있습니다.

export const IS_MOBILE = matchMedia('(hover: none) and (pointer: coarse)').matches || (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && innerWidth < 1100);

const listeners = { shake: [], tilt: [], spin: [], face: [], blow: [] };
export const sensor = {
  on: false,          // 센서 사용 중
  tiltX: 0, tiltY: 0, // -1~1 (좌우, 앞뒤), 부드럽게 보정된 값
  heading: null,      // 0~360 나침반 방향 (북쪽 = 0), 모르면 null
  shake: 0,           // 0~1 최근 흔들림 세기 (서서히 줄어듦)
  spin: 0,            // 화면을 바라본 채 폰을 돌리는 속도 (도/초, 부호 = 방향)
  faceDown: false,    // 화면이 바닥을 향해 엎어져 있는지
  blow: 0,            // 0~1 마이크에 '후~' 부는 세기
  micOn: false,
  micLevel: 0,        // 0~1 마이크에 들어오는 소리 크기(평소보다 얼마나 큰지)
  async enable() {
    if (!IS_MOBILE || this.on) return this.on;
    // 앱 틀(껍데기) 안의 전시: 아이폰은 다른 출처 iframe에 기울기 신호를 주지 않아서, 앱 화면이 받아 넘겨줌(아래 'artmos:sensor')
    if (inAppFrame()) { this.on = true; try { parent.postMessage({ type: 'artmos:sensor-want' }, '*'); } catch (e) {} return true; }
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false;
      }
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try { await DeviceMotionEvent.requestPermission(); } catch (e) {}
      }
    } catch (e) { return false; }
    addEventListener('deviceorientation', onOrient, true);
    addEventListener('deviceorientationabsolute', onAbs, true);
    addEventListener('devicemotion', onMotion, true);
    this.on = true;
    return true;
  },
  onShake(fn) { listeners.shake.push(fn); },
  onSpin(fn) { listeners.spin.push(fn); },         // 한 바퀴의 1/4쯤 빠르게 돌렸을 때 (부호 = 방향)
  onFaceDown(fn) { listeners.face.push(fn); },     // fn(true) 엎음 · fn(false) 다시 듦
  onBlow(fn) { listeners.blow.push(fn); },         // 한 번 세게 불었을 때
  vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} },
};

let mic = null; // 마이크 분석기 (startMic)
// ── 앱 틀 안에서 전시를 볼 때: 앱 화면(부모)이 보낸 기울기·움직임 값을 받아 같은 계산에 넣음
const inAppFrame = () => { try { return window.parent !== window && (sessionStorage.getItem('artmos-in-app') === '1' || /[?&]app=1(?:&|$)/.test(location.search)); } catch (e) { return false; } };
let relayed = false;
addEventListener('message', (e) => {
  const d = e.data; if (e.source !== window.parent || !d || d.type !== 'artmos:sensor') return;
  relayed = true;
  if (d.o) onOrient(d.o, true); if (d.a) onAbs(d.a, true); if (d.m) onMotion(d.m, true);
});
let rawX = 0, rawY = 0, lastShake = 0, absSeen = false, faceRaw = false, faceSince = 0, spinAcc = 0, lastSpin = 0, loopT = 0;
function onOrient(e, fromApp) {
  if (relayed && !fromApp) return; // 앱이 넘겨주는 값을 쓰는 중이면 직접 받은 값은 무시(겹치지 않게)
  if (e.gamma == null) return;
  // 화면 방향(세로/가로)에 맞춰 좌우·앞뒤 기울기 계산
  const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  let x = e.gamma / 45, y = (e.beta - 40) / 45; // 폰을 40도쯤 세워 든 자세를 0으로
  if (ang === 90) [x, y] = [(e.beta) / 45, -e.gamma / 45];
  if (ang === -90 || ang === 270) [x, y] = [-(e.beta) / 45, e.gamma / 45];
  rawX = Math.max(-1, Math.min(1, x)); rawY = Math.max(-1, Math.min(1, y));
  faceRaw = Math.abs(e.beta) > 150 && Math.abs(e.gamma) < 35;
  if (e.webkitCompassHeading != null) sensor.heading = e.webkitCompassHeading; // iPhone
  else if (!absSeen && e.absolute && e.alpha != null) sensor.heading = (360 - e.alpha) % 360;
}
function onAbs(e, fromApp) {
  if (relayed && !fromApp) return;
  if (e.alpha != null) { absSeen = true; sensor.heading = (360 - e.alpha) % 360; }
}
function onMotion(e, fromApp) {
  if (relayed && !fromApp) return; // 앱이 넘겨주는 값을 쓰는 중이면 직접 받은 값은 무시(겹치지 않게)
  const rr = e.rotationRate;
  if (rr && rr.alpha != null) { const v = rr.alpha; sensor.spin += (v - sensor.spin) * 0.3; } // 화면 수직축 회전
  const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
  let m;
  if (a) m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  else { const g = e.accelerationIncludingGravity; if (!g) return; m = Math.abs(Math.hypot(g.x || 0, g.y || 0, g.z || 0) - 9.8); }
  if (m > 3) {
    sensor.shake = Math.min(1, sensor.shake + m / 25);
    const now = performance.now();
    if (m > 11 && now - lastShake > 350) { lastShake = now; listeners.shake.forEach((f) => f(Math.min(1, m / 25))); }
  }
}
// 부드럽게 따라가기 + 흔들림 감쇠 (매 프레임)
(function loop() {
  sensor.tiltX += (rawX - sensor.tiltX) * 0.12;
  sensor.tiltY += (rawY - sensor.tiltY) * 0.12;
  sensor.shake *= 0.94;
  const now = performance.now();
  if (faceRaw !== sensor.faceDown) { if (!faceSince) faceSince = now; if (now - faceSince > (faceRaw ? 1200 : 300)) { sensor.faceDown = faceRaw; faceSince = 0; listeners.face.forEach((f) => f(faceRaw)); } } else faceSince = 0;
  const dt = Math.min(0.1, (now - (loopT || now)) / 1000); loopT = now;
  if (Math.abs(sensor.spin) > 90) { spinAcc += sensor.spin * dt; if (Math.abs(spinAcc) > 80 && now - lastSpin > 500) { lastSpin = now; listeners.spin.forEach((f) => f(Math.sign(spinAcc))); spinAcc = 0; } } else spinAcc *= 0.9;
  if (mic) readMic(now);
  requestAnimationFrame(loop);
})();

// 카메라 (AR 배경): 뒤쪽 카메라 영상을 <video>로 깔기. 영상은 이 화면에서만 쓰이고 저장·전송되지 않음
export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  videoEl.srcObject = stream; videoEl.muted = true; videoEl.playsInline = true; await videoEl.play();
  return () => stream.getTracks().forEach((t) => t.stop());
}

// 마이크: '후~' 불기 감지. 소리는 이 기기 안에서만 분석되고 녹음·전송되지 않음
export async function startMic() {
  if (mic) { try { mic.ac.resume(); } catch (e) {} return true; }
  // 아이폰: 소리 장치는 터치 순간에 만들고 바로 깨워야 함(권한 창을 기다린 뒤 만들면 '멈춤' 상태라 소리가 0으로만 들어옴)
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  try { ac.resume(); } catch (e) {}
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
  catch (e) { try { ac.close(); } catch (x) {} throw e; }
  try { await ac.resume(); } catch (e) {}
  const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.3;
  src.connect(an);
  mic = { ac, an, stream, src, tb: new Float32Array(an.fftSize), fb: new Float32Array(an.frequencyBinCount), floor: 0, last: 0, t: 0, poke: 0 };
  sensor.micOn = true;
  return true;
}
// 멈춘 소리 장치는 다음 터치 때 다시 깨움
['touchend', 'pointerup', 'click'].forEach((t) => addEventListener(t, () => { if (mic && mic.ac.state !== 'running') { try { mic.ac.resume(); } catch (e) {} } }, { capture: true, passive: true }));

// '후~' 판단: 조용할 때의 소리 크기(바닥)를 계속 재 두고, 그보다 얼마나 큰지 + 낮은 소리(바람 소리)가 얼마나 많은지로 정함
// 폰마다 마이크 감도가 달라도 '평소보다 크게'로 보므로 잘 맞음
function readMic(now) {
  if (now - mic.t < 30) return; mic.t = now; // 초당 약 30번
  if (mic.ac.state !== 'running') { if (now - mic.poke > 1000) { mic.poke = now; try { mic.ac.resume(); } catch (e) {} } return; }
  const { an, tb, fb } = mic;
  an.getFloatTimeDomainData(tb);
  let sq = 0; for (let i = 0; i < tb.length; i++) sq += tb[i] * tb[i];
  const rms = Math.sqrt(sq / tb.length) || 1e-6;
  an.getFloatFrequencyData(fb);
  const hz = mic.ac.sampleRate / an.fftSize;
  let lo = 0, mid = 0, hi = 0, lsum = 0, psum = 0, n = 0;
  for (let i = 1; i < fb.length; i++) {
    const f = i * hz; if (f > 8000) break;
    const p = Math.pow(10, (isFinite(fb[i]) ? fb[i] : -140) / 10);
    if (f < 500) lo += p; else if (f < 3000) mid += p; else hi += p;
    if (f > 150 && f < 4000) { lsum += Math.log(p + 1e-14); psum += p; n++; }
  }
  const lowShare = lo / (lo + mid + hi + 1e-14);
  const flat = n ? Math.exp(lsum / n) / (psum / n + 1e-14) : 0; // 1에 가까우면 '쉬~' 같은 바람 소리, 0에 가까우면 목소리·악기
  if (!mic.floor) mic.floor = rms;
  const snr = 20 * Math.log10(rms / Math.max(mic.floor, 2e-4));
  // 바닥은 조용해지면 빨리 내려가고, 커질 땐 아주 천천히 올라감(계속 불어도 바닥이 따라 올라오지 않게)
  mic.floor += (rms - mic.floor) * (rms < mic.floor ? 0.25 : snr < 8 ? 0.02 : 0.0008);
  sensor.micLevel = Math.max(0, Math.min(1, (snr - 4) / 30));
  const loud = Math.max(0, Math.min(1, (snr - 12) / 20)) + (rms > 0.25 && snr > 6 ? 0.4 : 0); // 아주 가까이서 불면 바로
  const windy = Math.max(Math.min(1, Math.max(0, lowShare - 0.25) / 0.35), Math.min(1, Math.max(0, flat - 0.06) / 0.18));
  const b = Math.min(1, loud * (0.35 + 0.65 * windy));
  sensor.blow += (b - sensor.blow) * (b > sensor.blow ? 0.6 : 0.15);
  if (sensor.blow > 0.45 && now - mic.last > 600) { mic.last = now; listeners.blow.forEach((f) => f(sensor.blow)); }
}
export function stopMic() { if (!mic) return; mic.stream.getTracks().forEach((t) => t.stop()); try { mic.ac.close(); } catch (e) {} mic = null; sensor.micOn = false; sensor.blow = 0; sensor.micLevel = 0; }

// 위치: 두 지점 사이 거리(km). 위치는 이 기기 안에서만 계산하고 어디에도 보내지 않음
export function getPosition() {
  return new Promise((ok, no) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => ok(p.coords), no, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }) : no(new Error('no geolocation')));
}
export function distanceKm(a, b) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 화면 꺼짐 방지: 전시를 보는 동안 화면이 어두워지지 않게 (지원하는 브라우저만)
let lock = null;
export async function keepAwake() {
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible') { lock = await navigator.wakeLock.request('screen'); } } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (lock && document.visibilityState === 'visible') keepAwake(); });

// 두 손가락 핀치: fn(배율 변화) · 여러 손가락 탭: 손가락 위치 목록
export function onPinch(el, fn) {
  let d0 = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  el.addEventListener('touchstart', (e) => { if (e.touches.length === 2) d0 = dist(e.touches); }, { passive: true });
  el.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && d0) { const d = dist(e.touches); fn(d / d0); d0 = d; } }, { passive: true });
  el.addEventListener('touchend', () => { d0 = 0; }, { passive: true });
}
