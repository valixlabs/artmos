// c008 MUCH LOVED — 김규진. 닳고 해진 애착 인형을 손끝으로 다시 만나는 전시.
// 장면: 0 쥐기 → 1 액자의 벽(레진 7, 앞면 입체 + 먼지 천) → 2 서랍(TOMMY) → 3 소파(레진 3, 입체 + 쿠션) + 감싸기
//      → 4 은빛 바닥(알루미늄 4, 사진) + 잠들기 → 5 나의 인형(이름표) → 6 맺음
// 원칙: 작품 사진은 고치지 않음(닳고 걷히는 건 우리 층만) · 모든 센서에 버튼·끌기 대체 · 마이크·카메라는 누른 사람에게만.
// 문서: docs/exhibitions/c008-muchloved/
import * as THREE from './vendor/three.module.js';
import { sensor, IS_MOBILE, startMic, startCamera, keepAwake, onPinch } from './sensors.js?v=6';
import './i18n.js?v=7'; // 앱 안 전시 주소 값(lang·app·snd·me) 받기, 앱 안 홈 링크 처리

const $ = (s, el = document) => el.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IN_FRAME = window !== window.top;
const A = 'assets/muchloved/';
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

// ── 작품
const RESIN = 'Resin, Acrylic Paint', ALU = 'Aluminium, Urethane Paint';
const W = {
  snow: ['SNOW', RESIN, '120×75×210'], dino: ['DINO', RESIN, '100×65×200'], floopy: ['FLOOPY', RESIN, '190×120×345'],
  hobby: ['HOBBY', RESIN, '160×130×303'], fufu: ['FU FU', RESIN, '230×140×410'], 'peanut-frame': ['PEANUT', RESIN, '200×54×200'],
  moon: ['MOON', RESIN, '170×150×340'], jake: ['JAKE', RESIN, '210×120×300'], peanut: ['PEANUT', RESIN, '200×54×200'],
  mas: ['MAS', RESIN, '240×160×410'], tommy: ['TOMMY', ALU, '200×125×350'], pin: ['PIN', ALU, '120×65×200'],
  moa: ['MOA', ALU, '70×65×150'], jelly: ['JELLY', ALU, '110×75×200'], bread: ['BREAD', ALU, '150×84×230'],
};
const WALL = ['snow', 'dino', 'floopy', 'hobby', 'fufu', 'peanut-frame', 'moon'];
const SOFA = ['jake', 'peanut', 'mas'];
const FLOOR = ['pin', 'moa', 'jelly', 'bread'];
const ORDER = ['tommy', ...WALL, ...SOFA, ...FLOOR];
const tagHTML = (id) => `<b>${W[id][0]}</b><span>${W[id][2]}mm · ${W[id][1]} · 2025</span>`;

// ── 진동 + 화면 박동 (아이폰 웹은 진동이 없어서 가장자리가 박동에 맞춰 밝아짐)
const edge = $('#ml-edge');
function beat(p = [30, 120, 30]) { sensor.vibrate(p); if (RM) return; edge.classList.remove('beat'); void edge.offsetWidth; edge.classList.add('beat'); }
const back = $('#ml-back');
const setBack = (c) => { back.style.backgroundColor = c; };

// ── 화면 그리기
const main = $('#ml');
main.innerHTML = `
<section class="sc" id="s0" data-i="0">
  <div>
    <h1 class="s0-name">MUCH<br>LOVED</h1>
    <p class="s0-by">김규진 · KIM GYUZIN</p>
    <div class="ring"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="39"/><circle class="fg" cx="42" cy="42" r="39"/></svg></div>
    <p class="hint" id="h0">화면을 꾹 누르고 있어 보세요</p>
    <div class="lines" id="lines"></div>
    <div class="under"><button class="btn" id="go1" hidden>들어가기</button></div>
  </div>
</section>

<section class="sc" id="s1" data-i="1" data-gl="wall">
  <p class="sc-head">1 · 액자의 벽</p>
  <h2 class="sc-title">먼지 쌓인 액자</h2>
  <p class="sc-lead">손가락으로 문질러 천을 걷어 보세요.</p>
  <div class="stage" id="st1">
    <button class="nav l" id="w-prev" aria-label="이전 액자">‹</button><button class="nav r" id="w-next" aria-label="다음 액자">›</button>
  </div>
  <div class="under">
    <span class="count" id="w-count"></span>
    <div class="tag" id="w-tag"></div>
    <p class="hint" id="h1"></p>
    <div class="chip-row"><button class="chip" id="w-blow">후~ 불어 먼지 털기</button><span class="chip" style="cursor:default">두 손가락으로 벌리면 가까이</span></div>
    <button class="btn line" id="go2" hidden>서랍으로</button>
  </div>
</section>

<section class="sc" id="s2" data-i="2">
  <p class="sc-head">2 · 서랍</p>
  <h2 class="sc-title">넣어 둔 기억</h2>
  <p class="sc-lead">${IS_MOBILE ? '휴대폰 위쪽을 몸 쪽으로 천천히 당겨 세워 보세요. 손잡이를 아래로 끌어도 열려요.' : '손잡이를 아래로 천천히 끌어 보세요.'}</p>
  <div class="drawer" id="drawer"><img src="${A}p/tommy.webp" alt="나무 서랍 안에서 고개를 내민 TOMMY" loading="lazy"><div class="front"></div></div>
  <div class="under" style="margin-top:16px"><div class="tag" id="d-tag">${tagHTML('tommy')}</div><p class="hint" id="h2"></p><button class="btn line" id="go3" hidden>소파로</button></div>
</section>

<section class="sc" id="s3" data-i="3" data-gl="sofa">
  <p class="sc-head">3 · 소파</p>
  <h2 class="sc-title">생활 속에 숨은 인형</h2>
  <p class="sc-lead">${IS_MOBILE ? '좌우로 기울이면 쿠션 틈이 벌어져요. 찾았다면 살살 흔들어 토닥여 주세요.' : '쿠션을 옆으로 끌어 벌려 보세요.'}</p>
  <div class="stage" id="st3">
    <div class="cush l" id="cl"></div><div class="cush r" id="cr"></div>
    <button class="nav l" id="f-prev" aria-label="이전 인형">‹</button><button class="nav r" id="f-next" aria-label="다음 인형">›</button>
  </div>
  <div class="under">
    <span class="count" id="f-count"></span>
    <div class="tag" id="f-tag"></div>
    <p class="hint" id="h3"></p>
    <button class="chip" id="pat">토닥토닥 (누르고 있기)</button>
  </div>
  <div class="hug" id="hug">
    <p class="sc-title" style="font-size:18px">두 손으로 감싸 보세요</p>
    <p class="sc-lead" style="margin:6px auto 0">아래 동그라미를 두 손가락 이상으로 덮고 있거나, 꾹 누르고 있어요.</p>
    <div class="hug-pad" id="hugpad">여기를 감싸기</div>
    <p class="hint" id="h4"></p>
    <div class="chip-row"><button class="chip" id="chest">가슴에 안아 보기 (카메라)</button></div>
    <p class="hint" style="font-size:11px;color:#666">카메라는 화면이 가려졌는지 밝기만 읽어요. 영상은 보지도 저장하지도 않아요.</p>
    <button class="btn line" id="go4" hidden>은빛 바닥으로</button>
  </div>
</section>

<section class="sc" id="s4" data-i="4">
  <p class="sc-head">4 · 은빛 바닥</p>
  <h2 class="sc-title">굳어 버린 시간</h2>
  <p class="sc-lead">${IS_MOBILE ? '화면을 바라본 채 휴대폰을 돌리면 다음 인형이 나와요.' : '화살표로 넘겨 보세요.'}</p>
  <div class="slide" id="slide">${FLOOR.map((k, i) => `<img src="${A}p/${k}.webp" alt="${W[k][0]}" loading="lazy" class="${i ? '' : 'on'}">`).join('')}
    <button class="nav l" id="s-prev" aria-label="이전">‹</button><button class="nav r" id="s-next" aria-label="다음">›</button></div>
  <div class="under" style="margin-top:14px">
    <span class="count" id="s-count"></span><div class="tag show" id="s-tag"></div>
    <div id="sleepbox" hidden style="text-align:center;margin-top:18px">
      <p class="sc-title" style="font-size:18px">함께 잠들어 볼까요?</p>
      <p class="sc-lead" style="margin:6px auto 12px">${IS_MOBILE ? '휴대폰을 엎어 두거나, 손바닥을 화면에 얹어 보세요.' : '버튼을 누르면 잠들어요.'}</p>
      <button class="btn line" id="sleepbtn">잠들기</button>
      <p class="hint" id="h5"></p>
    </div>
    <button class="btn line" id="go5" hidden>나의 인형</button>
  </div>
</section>

<section class="sc" id="s5" data-i="5">
  <p class="sc-head">5 · 나의 인형</p>
  <h2 class="sc-title">당신의 인형 이름은<br>무엇이었나요?</h2>
  <div class="my">
    <input id="myname" maxlength="12" placeholder="이름 (12자까지)" autocomplete="off" enterkeyhint="done">
    <canvas id="tagcv" width="640" height="400"></canvas>
    <button class="btn" id="sew">꾹 눌러 바느질하기</button>
    <a class="btn line" id="keep" hidden download="much-loved-tag.png">간직하기</a>
    <p class="hint" style="font-size:11px;color:#666">이름은 이 기기에만 저장돼요.</p>
    <button class="skip" id="skip">건너뛰기</button>
  </div>
</section>

<section class="sc" id="s6" data-i="6" style="display:block">
  <p class="end-msg">닳은 자리마다,<br>사랑이 머물렀다.</p>
  <div class="note">
    <p>아기에게 인형은 장난감이라기보다 불안을 견디게 해 준 첫 번째 타자에 가깝습니다. 쥐고, 물고, 끌어안고 잠든 시간이 때와 닳음과 찢어짐으로 남습니다.</p>
    <p>작가는 그 흔적을 고치지 않습니다. 사라진 자리를 그대로 굳혀, 결핍을 슬픔이 아니라 사랑이 머문 자리로, 상처를 시간이 남긴 문장으로 보여 줍니다.</p>
    <small>작가 노트에서 (요약)</small>
  </div>
  <img class="space" src="${A}p/space-wall.webp" alt="액자 벽과 서랍장 설치 전경" loading="lazy">
  <img class="space" src="${A}p/space-sofa.webp" alt="소파 설치 전경" loading="lazy">
  <img class="space" src="${A}p/space-table.webp" alt="은빛 탁자 설치 전경" loading="lazy">
  <div class="grid">${ORDER.map((k) => `<figure><img src="${A}t/${k}.webp" alt="${W[k][0]}" loading="lazy"><figcaption><b>${W[k][0]}</b><br>${W[k][1]}<br>${W[k][2]}mm, 2025</figcaption></figure>`).join('')}</div>
  <div class="bio"><h3>작가</h3>김규진 (KIM GYUZIN, 1991). 충남대학교 조소과, 성신여자대학교 조소과 석사·박사 수료.<br>개인전 〈Kidult〉(2024, Vista Valley), 〈Journey to Childhood〉(2023, 성신여대 파이룸).<br>2025 〈차세대 작가 展 Forefesta〉(자하미술관) 외 단체전 다수. 2020 대한민국미술대전 비구상부문 평론가상.</div>
  <div class="credit"><h3>크레딧</h3>© KIM GYUZIN 2026 · Photo: Studio Yumull · 도록 《MUCH LOVED》 발행 HJ Design, 디자인 ATST<br>작품 이미지는 작가와 촬영자의 허락을 받아 사용했습니다. 레진 작품의 입체는 도록 사진 한 장으로 만든 앞면 입체이며, 뒷면은 만들지 않았습니다.<br>센서·마이크·카메라 정보는 이 기기 안에서만 쓰고 저장하거나 보내지 않습니다.</div>
  <a class="btn exit ml-exit" href="./">전시 행성 나가기</a>
</section>`;

// ── 진행 점·이어 보기
const dots = $('#ml-dots');
dots.innerHTML = '<i></i>'.repeat(7);
const done = new Set();
function mark(i) { done.add(i); [...dots.children].forEach((d, k) => d.classList.toggle('done', done.has(k))); }
const goto = (id) => $(id).scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });

// ════════════════ 3D (레진 앞면 입체) ════════════════
const cv = $('#ml-gl');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 1.6); scene.add(key);
const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(u, color) {
  if (!texCache.has(u)) texCache.set(u, new Promise((r) => loader.load(u, (t) => { if (color) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; } r(t); }, undefined, () => r(null))));
  return texCache.get(u);
}
const relief = (id) => Promise.all([tex(A + `r/${id}_color.webp`, 1), tex(A + `r/${id}_depth.png`), tex(A + `r/${id}_normal.webp`)]);
const DEPTH = 0.28, MAX = THREE.MathUtils.degToRad(20);

const mat = new THREE.MeshStandardMaterial({ alphaTest: 0.5, roughness: 0.82, metalness: 0, displacementScale: DEPTH, normalScale: new THREE.Vector2(1, 1) });
const doll = new THREE.Mesh(new THREE.BufferGeometry(), mat);
const holder = new THREE.Group(); holder.add(doll); scene.add(holder);
// 액자 (흰 틀 + 연회색 바탕) — 우리가 그린 면
const frame = new THREE.Group(); holder.add(frame);
const mount = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xd8d8d6, roughness: 1 }));
mount.position.z = -0.01; frame.add(mount);
const barMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.7 });
const bars = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), barMat); frame.add(m); return m; });
// 먼지 천 (지울 수 있는 캔버스 텍스처, 처음부터 반투명 → 인형이 흐리게 비침)
const dustCv = document.createElement('canvas'), dctx = dustCv.getContext('2d', { willReadFrequently: true });
const dustTex = new THREE.CanvasTexture(dustCv); dustTex.colorSpace = THREE.SRGBColorSpace;
const dust = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: dustTex, transparent: true, depthWrite: false }));
holder.add(dust);

let mode = null, curId = null, dw = 1, dh = 1, token = 0;
async function showDoll(id, kind) {
  const my = ++token; curId = id;
  const [c, d, n] = await relief(id); if (my !== token || !c) return;
  const asp = c.image.width / c.image.height;
  dh = kind === 'wall' ? 2.1 : (asp > 0.8 ? 1.75 : 2.0); dw = dh * asp;
  doll.geometry.dispose(); doll.geometry = new THREE.PlaneGeometry(dw, dh, 220, Math.max(64, Math.round(220 / asp)));
  Object.assign(mat, { map: c, displacementMap: d, normalMap: n }); mat.needsUpdate = true;
  frame.visible = dust.visible = kind === 'wall';
  if (kind === 'wall') {
    const fw = dw * 1.22, fh = dh * 1.14, t = 0.08, z = 0.06;
    mount.scale.set(fw, fh, 1);
    bars[0].scale.set(fw + t * 2, t, z * 2); bars[0].position.set(0, fh / 2 + t / 2, z / 2);
    bars[1].scale.set(fw + t * 2, t, z * 2); bars[1].position.set(0, -fh / 2 - t / 2, z / 2);
    bars[2].scale.set(t, fh, z * 2); bars[2].position.set(-fw / 2 - t / 2, 0, z / 2);
    bars[3].scale.set(t, fh, z * 2); bars[3].position.set(fw / 2 + t / 2, 0, z / 2);
    dust.scale.set(fw, fh, 1); dust.position.z = DEPTH + 0.04;
    resetDust(fw / fh);
  }
  holder.rotation.set(kind === 'sofa' ? -0.12 : 0, 0, 0);
  fit();
}
function fit() {
  const w = innerWidth, h = innerHeight;
  if (fit.w !== w || fit.h !== h) { fit.w = w; fit.h = h; renderer.setSize(w, h, false); }
  camera.aspect = w / h;
  // 무대 밖으로는 그리지 않음
  if (stageEl) { const r = stageEl.getBoundingClientRect(); renderer.setScissorTest(true); renderer.setScissor(r.left, h - r.bottom, r.width, r.height); }
  const tn = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const bw = (frame.visible ? dw * 1.4 : dw) * zoom, bh = (frame.visible ? dh * 1.3 : dh) * zoom;
  // 장면 머리·아래 글을 피해 화면 가운데 약 50% 높이에
  const z = Math.max(bh / 0.42, bw / 0.84 / camera.aspect) / tn;
  // 무대 영역 가운데에 오게: 무대가 화면 가운데보다 위에 있으면 그만큼 올림
  const sh = stageShift();
  camera.position.set(0, -bh * 0.02 + sh * z * tn, z); camera.lookAt(0, -bh * 0.02 + sh * z * tn, 0); camera.updateProjectionMatrix();
}
let zoom = 1;
addEventListener('resize', () => fit());
// 3D는 무대(#st1·#st3)가 화면에 보일 때만, 무대 높이 가운데에 맞춤
let stageEl = null;
function stageShift() { if (!stageEl) return 0; const r = stageEl.getBoundingClientRect(); const c = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2; return (c - innerHeight / 2) / innerHeight; }
const stIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.target === stageEl) { glVis = e.intersectionRatio > 0.35; cv.classList.toggle('on', glOn && glVis); } }), { threshold: [0, .2, .35, .5, .8, 1] });
let glVis = false;

// 먼지 천
let dustDone = false, dustFade = 1;
function resetDust(asp) {
  dustCv.width = 256; dustCv.height = Math.round(256 / asp);
  const W2 = dustCv.width, H2 = dustCv.height, img = dctx.createImageData(W2, H2);
  for (let i = 0; i < W2 * H2; i++) { const v = 150 + Math.random() * 30 + Math.sin(i * 0.37) * 6; img.data.set([v, v, v * 0.98, 180], i * 4); }
  dctx.putImageData(img, 0, 0);
  dctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 40; i++) { dctx.strokeStyle = `rgba(120,120,118,${0.15 + Math.random() * 0.15})`; dctx.beginPath(); const y = Math.random() * H2; dctx.moveTo(0, y); dctx.bezierCurveTo(W2 * .3, y + 8, W2 * .6, y - 8, W2, y + 3); dctx.stroke(); }
  dustTex.dispose(); dustTex.needsUpdate = true; dustDone = false; dustFade = 1; dust.material.opacity = 1;
}
function rub(u, v, r = 15) {
  if (dustDone) return;
  const x = u * dustCv.width, y = (1 - v) * dustCv.height;
  dctx.globalCompositeOperation = 'destination-out';
  const g = dctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.5, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, 6.3); dctx.fill();
  dustTex.needsUpdate = true; needCheck = true;
}
let needCheck = false, lastCheck = 0;
function checkDust(now) {
  if (!needCheck || now - lastCheck < 250 || dustDone) return; needCheck = false; lastCheck = now;
  const d = dctx.getImageData(0, 0, dustCv.width, dustCv.height).data; let clear = 0, n = 0;
  for (let i = 3; i < d.length; i += 16) { n++; if (d[i] < 60) clear++; }
  if (clear / n > 0.55) { dustDone = true; onWallClear(); }
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hitDust(e) {
  const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); const h = ray.intersectObject(pick)[0]; if (!h) return null;
  // 넓은 판(3배)에서 맞힌 자리를 천 좌표로 바꾸고, 천 밖이면 가장자리로 붙임(액자 밖에서 끝난 쓸기도 이어지게)
  const u = (h.uv.x - 0.5) * 3 + 0.5, v = (h.uv.y - 0.5) * 3 + 0.5;
  if (u < -0.15 || u > 1.15 || v < -0.15 || v > 1.15) return null;
  return { x: Math.min(1, Math.max(0, u)), y: Math.min(1, Math.max(0, v)) };
}
const pick = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ visible: false }));
dust.add(pick);

// 렌더 루프 (3D 장면이 보일 때만)
let tx = 0, ty = 0, rx = 0, ry = 0, mouse = null, glOn = false;
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  if (!glOn) return;
  const t = clock.getElapsedTime(), now = performance.now();
  if (sensor.on) { tx = THREE.MathUtils.clamp(-sensor.tiltY, -1, 1) * MAX * 0.8; ty = THREE.MathUtils.clamp(sensor.tiltX, -1, 1) * MAX; }
  else if (mouse) { ty = mouse.x * MAX; tx = mouse.y * MAX * 0.6; }
  const k = RM ? 1 : 0.1; rx += (tx - rx) * k; ry += (ty - ry) * k;
  const idle = RM || sensor.on || mouse ? 0 : 1;
  holder.rotation.x = (mode === 'sofa' ? -0.12 : 0) + rx + Math.sin(t * 0.5) * 0.025 * idle;
  holder.rotation.y = ry + Math.sin(t * 0.37) * 0.07 * idle;
  key.position.set(1.2 - ry * 6, 1.6 + rx * 5, 3);
  if (now - (loop.f || 0) > 120) { loop.f = now; fit(); }
  if (mode === 'wall') { checkDust(now); if (dustDone && dustFade > 0) { dustFade = Math.max(0, dustFade - 0.03); dust.material.opacity = dustFade; } }
  if (mode === 'sofa') sofaTick(now);
  if (mode === 'wall') wallTick(now);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') mouse = { x: e.clientX / innerWidth * 2 - 1, y: e.clientY / innerHeight * 2 - 1 }; });

// 지금 보이는 장면 → 3D 켜고 끄기, 진행 점
const secs = [...document.querySelectorAll('.sc')];
let cur = -1;
const vis = new Map();
const io = new IntersectionObserver((es) => {
  es.forEach((e) => vis.set(e.target, e.intersectionRatio));
  let best = null, br = 0; vis.forEach((r, el) => { if (r > br) { br = r; best = el; } });
  if (!best) return; const i = +best.dataset.i;
  if (i !== cur) { cur = i; enter(i, best.dataset.gl || null); }
}, { threshold: [0, .2, .4, .6, .8, 1] });
secs.forEach((s) => io.observe(s));
function enter(i, gl) {
  [...dots.children].forEach((d, k) => d.classList.toggle('now', k === i));
  store.set('valix-muchloved-step', String(i));
  glOn = !!gl;
  if (stageEl) stIO.unobserve(stageEl); stageEl = gl ? $(gl === 'wall' ? '#st1' : '#st3') : null; glVis = false; if (stageEl) stIO.observe(stageEl); cv.classList.toggle('on', false);
  if (gl && gl !== mode) { mode = gl; zoom = 1; if (gl === 'wall') { wallEnter(); } else { sofaEnter(); } }
  if (!gl) mode = null;
  setBack(i === 3 ? '#151515' : '#000');
  if (i === 2) drawerEnter();
  if (i === 4) floorEnter();
}

// ════════════════ 0 쥐기 ════════════════
const LINES = ['당신이 가장 오래 쥐고 있던 것은<br>무엇인가요?', '손에 쥐고, 입에 넣고,<br>끌어안고 잠들던 것.', '그것은 닳고, 해지고,<br>어느 부분은 사라졌습니다.', '그래도 놓지 않았습니다.', '지금 손에 쥔 그것일지도 모릅니다.', 'MUCH LOVED · 많이 사랑받은 것들'];
(() => {
  const s0 = $('#s0'), fg = $('#s0 .fg'), h0 = $('#h0'), box = $('#lines'), go = $('#go1');
  box.innerHTML = LINES.map((l, i) => `<p class="${i === LINES.length - 1 ? 'big' : ''}">${l}</p>`).join('');
  let n = 0, held = false, timer = 0, hold0 = 0;
  const step = () => {
    if (!held || n >= LINES.length) return;
    beat(); box.children[n].classList.add('in'); n++;
    fg.style.strokeDashoffset = 245 * (1 - n / LINES.length);
    if (n >= LINES.length) { finish(); return; }
    timer = setTimeout(step, 1200);
  };
  const finish = () => { held = false; h0.textContent = ''; go.hidden = false; mark(0); };
  const down = (e) => { if (n >= LINES.length || e.target.closest('button,a')) return; held = true; h0.textContent = '그대로 쥐고 있어요'; clearTimeout(hold0); hold0 = setTimeout(step, 600); };
  const up = () => { if (!held) return; held = false; clearTimeout(hold0); clearTimeout(timer); if (n < LINES.length) h0.textContent = '다시 꾹 누르면 이어져요'; };
  s0.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => { if (e.code === 'Space' && cur === 0 && !e.repeat) { e.preventDefault(); down(e); } });
  addEventListener('keyup', (e) => { if (e.code === 'Space') up(); });
  go.addEventListener('click', async () => { await sensor.enable(); keepAwake(); goto('#s1'); });
})();

// ════════════════ 1 액자의 벽 ════════════════
let wi = 0, wSeen = new Set(), headBase = null, wallStart = 0, lastHeadIdx = 0;
const h1 = $('#h1'), wtag = $('#w-tag');
function wallShow(i) {
  wi = (i + WALL.length) % WALL.length; const id = WALL[wi];
  $('#w-count').textContent = `${wi + 1} / ${WALL.length}`;
  wtag.classList.remove('show'); wtag.innerHTML = tagHTML(id);
  h1.textContent = '문질러 천을 걷어 보세요'; h1.classList.remove('warn');
  showDoll(id, 'wall'); wallStart = performance.now();
  const nx = WALL[(wi + 1) % WALL.length]; relief(nx);
}
function wallEnter() { headBase = sensor.heading; wallShow(wi); }
function onWallClear() {
  wtag.classList.add('show'); beat([15, 60, 15]); wSeen.add(WALL[wi]);
  h1.textContent = wi < WALL.length - 1 ? (sensor.heading != null ? '몸을 오른쪽으로 돌리면 다음 액자로 가요' : '› 를 눌러 다음 액자로') : '모든 액자를 보았어요';
  $('#go2').hidden = false; mark(1);
}
function wallTick(now) {
  // 몸 돌리기: 들어온 방향에서 30°마다 액자 하나
  if (sensor.heading != null) {
    if (headBase == null) headBase = sensor.heading;
    let d = ((sensor.heading - headBase + 540) % 360) - 180; const k = THREE.MathUtils.clamp(Math.round(d / 30), 0, WALL.length - 1);
    if (k !== lastHeadIdx && now - wallStart > 900) { lastHeadIdx = k; wallShow(k); }
  }
  // 다 걷지 않아도 6초 뒤엔 다음으로 가도 됨(첫 액자는 걷어야 '서랍으로'가 열림)
  if (!dustDone && now - wallStart > 6000 && wSeen.size && !h1.dataset.soft) { h1.dataset.soft = 1; h1.textContent = '다 걷지 않아도 다음 액자로 넘어가도 돼요'; }
}
$('#w-prev').onclick = () => wallShow(wi - 1);
$('#w-next').onclick = () => wallShow(wi + 1);
$('#go2').onclick = () => goto('#s2');
(() => {
  const st = $('#st1'); let down = false, last = null;
  // 빠르게 쓸어도 끊기지 않게 앞 점과 사이를 이어서 지움
  const at = (x) => { const uv = hitDust(x); if (!uv) { last = null; return; }
    if (last) { const dx = (uv.x - last.x) * dustCv.width, dy = (uv.y - last.y) * dustCv.height, n = Math.ceil(Math.hypot(dx, dy) / 5);
      for (let i = 1; i <= n; i++) rub(last.x + (uv.x - last.x) * i / n, last.y + (uv.y - last.y) * i / n); }
    else rub(uv.x, uv.y);
    last = { x: uv.x, y: uv.y }; };
  st.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; e.preventDefault(); down = true; last = null; st.setPointerCapture(e.pointerId); at(e); });
  st.addEventListener('pointermove', (e) => { if (!down || mode !== 'wall') return; let ev = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (!ev.length) ev = [e]; ev.forEach(at); });
  const up = () => { down = false; last = null; }; st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  onPinch(st, (f) => { zoom = THREE.MathUtils.clamp(zoom / f, 0.45, 1); fit(); });
  st.addEventListener('wheel', (e) => { if (mode !== 'wall') return; if (!e.ctrlKey && Math.abs(e.deltaY) < 40) return; }, { passive: true });
  st.addEventListener('dblclick', () => { zoom = zoom < 1 ? 1 : 0.55; fit(); });
})();
// 후~
let micAsked = false;
$('#w-blow').onclick = async (e) => {
  const b = e.currentTarget;
  if (!micAsked) {
    micAsked = true;
    try { await startMic(); b.classList.add('on'); b.textContent = '후~ 불어 보세요'; }
    catch (err) { b.textContent = '눌러서 먼지 털기'; }
  }
  if (!sensor.micOn) blowDust();
};
function blowDust() { for (let i = 0; i < 26; i++) rub(Math.random(), Math.random(), 10 + Math.random() * 18); beat(12); }
sensor.onBlow(() => { if (mode === 'wall') blowDust(); });

// ════════════════ 2 서랍 ════════════════
let dOpen = 0, dBase = null, dHist = [], dStuck = 0, dDone = false;
const drawer = $('#drawer'), front = $('.front', drawer), h2 = $('#h2');
function drawerEnter() { dBase = null; }
function drawerSet(v) {
  if (dDone) return; dOpen = THREE.MathUtils.clamp(v, 0, 1);
  front.style.transform = `translateY(${dOpen * 100}%)`;
  if (dOpen >= 0.99) { dDone = true; $('#d-tag').classList.add('show'); h2.textContent = ''; beat([15, 60, 15]); $('#go3').hidden = false; mark(2); }
}
(function drawerTick() {
  requestAnimationFrame(drawerTick);
  if (cur !== 2 || !sensor.on || dDone) return;
  const now = performance.now(); if (now < dStuck) return;
  if (dBase == null) dBase = sensor.tiltY;
  const target = THREE.MathUtils.clamp((sensor.tiltY - dBase) / 0.6, 0, 1);
  dHist.push([now, target]); while (dHist.length && now - dHist[0][0] > 500) dHist.shift();
  if (dHist.length > 2 && target - dHist[0][1] > 0.4) { dStuck = now + 600; dHist = []; drawer.classList.remove('stuck'); void drawer.offsetWidth; drawer.classList.add('stuck'); sensor.vibrate(12); h2.textContent = '천천히'; h2.classList.add('warn'); return; }
  h2.classList.remove('warn'); if (h2.textContent === '천천히') h2.textContent = '';
  if (target > dOpen) drawerSet(dOpen + Math.min(0.03, target - dOpen));
})();
(() => {
  let y0 = null, v0 = 0;
  drawer.addEventListener('pointerdown', (e) => { e.preventDefault(); y0 = e.clientY; v0 = dOpen; drawer.setPointerCapture(e.pointerId); });
  drawer.addEventListener('pointermove', (e) => { if (y0 == null) return; drawerSet(v0 + (e.clientY - y0) / (drawer.clientHeight * 0.6)); });
  const up = () => { y0 = null; if (!dDone && dOpen > 0.75) { const f = () => { if (dDone) return; drawerSet(dOpen + 0.05); requestAnimationFrame(f); }; f(); } }; drawer.addEventListener('pointerup', up); drawer.addEventListener('pointercancel', up);
})();
$('#go3').onclick = () => goto('#s3');

// ════════════════ 3 소파 + 감싸기 ════════════════
let fi = 0, part = 0, partDrag = 0, found = false, patT = 0, patting = false, patBtn = false;
const h3 = $('#h3'), ftag = $('#f-tag'), cl = $('#cl'), cr = $('#cr');
function sofaShow(i) {
  fi = (i + SOFA.length) % SOFA.length; const id = SOFA[fi];
  $('#f-count').textContent = `${fi + 1} / ${SOFA.length}`;
  ftag.classList.remove('show'); ftag.innerHTML = tagHTML(id) + (id === 'peanut' ? '<span style="color:#888">액자 작품과 이름이 같아요 · 작가 확인 중</span>' : '');
  found = false; part = 0; partDrag = 0; patT = 0; h3.textContent = IS_MOBILE ? '좌우로 기울여 쿠션 틈을 벌려 보세요' : '쿠션을 옆으로 끌어 보세요';
  showDoll(id, 'sofa'); relief(SOFA[(fi + 1) % SOFA.length]);
}
function sofaEnter() { sofaShow(fi); }
function sofaTick(now) {
  const want = Math.max(sensor.on ? Math.min(1, Math.abs(sensor.tiltX) / 0.45) : 0, partDrag, found ? 1 : 0);
  part += (want - part) * 0.15;
  cl.style.transform = `translateX(${-part * 92}%)`; cr.style.transform = `translateX(${part * 92}%)`;
  if (!found && part > 0.85) { found = true; h3.textContent = IS_MOBILE ? '찾았어요. 살살 흔들어 토닥여 주세요' : '찾았어요. 토닥토닥 버튼을 누르고 있어 보세요'; beat(12); }
  // 토닥: 약한 흔들림이 1.5초 이어지면
  const gentle = sensor.on && sensor.shake > 0.12 && sensor.shake < 0.5;
  const dt = Math.min(250, now - (sofaTick.t || now)); sofaTick.t = now;
  if (found && (gentle || patBtn)) { const b4 = patT; patT += dt; if (Math.floor(patT / 500) > Math.floor(b4 / 500)) sensor.vibrate([15, 80, 15]); }
  else patT = Math.max(0, patT - dt / 2);
  if (found && patT > 1500 && !ftag.classList.contains('show')) { ftag.classList.add('show'); beat([15, 80, 15]); h3.textContent = fi < SOFA.length - 1 ? '› 다음 인형도 찾아 보세요' : ''; mark(3); }
}
sensor.onShake((s) => { if (mode === 'sofa' && s > 0.6) { h3.textContent = '살살'; h3.classList.add('warn'); setTimeout(() => h3.classList.remove('warn'), 1200); } });
$('#f-prev').onclick = () => sofaShow(fi - 1);
$('#f-next').onclick = () => sofaShow(fi + 1);
(() => {
  const st = $('#st3'); let x0 = null, p0 = 0;
  st.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; e.preventDefault(); x0 = e.clientX; p0 = partDrag; st.setPointerCapture(e.pointerId); });
  st.addEventListener('pointermove', (e) => { if (x0 == null) return; partDrag = THREE.MathUtils.clamp(p0 + Math.abs(e.clientX - x0) / (st.clientWidth * 0.4), 0, 1); });
  const up = () => { x0 = null; }; st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  const pb = $('#pat');
  const on = (e) => { e.preventDefault(); patBtn = true; pb.classList.add('on'); }, off = () => { patBtn = false; pb.classList.remove('on'); };
  pb.addEventListener('pointerdown', on); pb.addEventListener('pointerup', off); pb.addEventListener('pointerleave', off); pb.addEventListener('pointercancel', off);
})();
// 감싸기: 두 손가락 이상으로 덮기 · 꾹 누르기 · (덤) 카메라로 가슴에 안기
(() => {
  const pad = $('#hugpad'), h4 = $('#h4'); let held = 0, since = 0, total = 0, timer = 0, beatT = 0, camHeld = false, last = 0;
  const pts = new Set();
  const tick = () => {
    const now = performance.now(), on = held > 0 || camHeld;
    pad.classList.toggle('held', on);
    if (on) {
      total += now - last; if (now - beatT > 1200) { beatT = now; beat(); }
      setBack(`rgb(${Math.min(42, 21 + total / 4000 * 21) | 0},${Math.min(42, 21 + total / 4000 * 21) | 0},${Math.min(42, 21 + total / 4000 * 21) | 0})`);
      h4.textContent = total > 6000 ? '곁에 있었어요' : '그대로 있어요';
      if (total > 6000) { $('#go4').hidden = false; mark(3); }
    } else if (total) { setBack('#151515'); }
    last = now; timer = requestAnimationFrame(tick);
  };
  last = performance.now(); tick();
  pad.addEventListener('pointerdown', (e) => { pts.add(e.pointerId); held = pts.size; pad.setPointerCapture(e.pointerId); e.preventDefault(); });
  const up = (e) => { pts.delete(e.pointerId); held = pts.size; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  $('#chest').onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const v = $('#ml-cam'); const stop = await startCamera(v);
      const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d', { willReadFrequently: true });
      let dark = 0; h4.textContent = '휴대폰 뒷면을 가슴에 대 보세요';
      const iv = setInterval(() => {
        if (cur !== 3) { clearInterval(iv); stop(); camHeld = false; b.disabled = false; return; }
        x.drawImage(v, 0, 0, 16, 16); const d = x.getImageData(0, 0, 16, 16).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
        const avg = s / 256; if (avg < 18) dark += 200; else if (avg > 40) dark = 0;
        camHeld = dark >= 800;
      }, 200);
    } catch (err) { b.textContent = '카메라 없이 동그라미를 감싸 주세요'; }
  };
})();
$('#go4').onclick = () => goto('#s4');

// ════════════════ 4 은빛 바닥 + 잠들기 ════════════════
let si = 0, sSeen = new Set([0]);
const imgs = [...document.querySelectorAll('#slide img')];
function slideShow(i) {
  si = (i + FLOOR.length) % FLOOR.length; sSeen.add(si);
  imgs.forEach((im, k) => im.classList.toggle('on', k === si));
  $('#s-count').textContent = `${si + 1} / ${FLOOR.length}`; $('#s-tag').innerHTML = tagHTML(FLOOR[si]);
  if (sSeen.size === FLOOR.length) $('#sleepbox').hidden = false;
}
function floorEnter() { slideShow(si); }
$('#s-prev').onclick = () => slideShow(si - 1);
$('#s-next').onclick = () => slideShow(si + 1);
sensor.onSpin((d) => { if (cur === 4 && !sleeping) slideShow(si + d); });
(() => { // 좌우로 쓸기
  const sl = $('#slide'); let x0 = null;
  sl.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) x0 = e.clientX; });
  sl.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 40) slideShow(si + (e.clientX < x0 ? 1 : -1)); x0 = null; });
})();
let sleeping = false, sleepAt = 0, sleepIv = 0, ready = false, palm = false;
const sl = $('#ml-sleep'), slT = $('.ml-sleep-t', sl), slH = $('.ml-sleep-h', sl), h5 = $('#h5');
function sleep(how) {
  if (sleeping) return; sleeping = true; sleepAt = Date.now();
  slH.textContent = how === 'palm' ? '손을 떼면 깨어나요' : how === 'face' ? '들어 올리면 깨어나요' : '화면을 누르면 깨어나요';
  sl.hidden = false; slT.textContent = '00:00'; keepAwake();
  clearInterval(sleepIv); sleepIv = setInterval(() => {
    const s = Math.floor((Date.now() - sleepAt) / 1000); slT.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (s >= 600) wake(); // 10분이면 배터리를 위해 깨움
  }, 1000);
}
function wake() {
  if (!sleeping) return; sleeping = false; clearInterval(sleepIv); sl.hidden = true;
  const s = Math.max(1, Math.floor((Date.now() - sleepAt) / 1000)), m = Math.floor(s / 60);
  h5.textContent = `${m ? m + '분 ' : ''}${s % 60}초 동안 곁에 있었어요`; beat([20, 100, 20]);
  $('#go5').hidden = false; mark(4);
}
$('#sleepbtn').onclick = () => { h5.textContent = '들어 올리면 깨어나요'; setTimeout(() => sleep('btn'), RM ? 0 : 1500); };
sl.addEventListener('pointerdown', () => { if (!palm) wake(); });
sensor.onFaceDown((down) => {
  if (cur !== 4 || $('#sleepbox').hidden) return;
  if (down) sleep('face'); else wake();
});
// 손바닥 얹기: 손가락 3개 이상 또는 넓은 터치
addEventListener('touchstart', (e) => {
  if (cur !== 4 || $('#sleepbox').hidden || sleeping) return;
  const big = [...e.touches].some((t) => (t.radiusX || 0) > 30);
  if (e.touches.length >= 3 || big) { palm = true; sleep('palm'); }
}, { passive: true });
addEventListener('touchend', (e) => { if (palm && e.touches.length === 0) { palm = false; wake(); } }, { passive: true });
$('#go5').onclick = () => goto('#s5');

// ════════════════ 5 나의 인형 ════════════════
(() => {
  const inp = $('#myname'), tc = $('#tagcv'), x = tc.getContext('2d'), sew = $('#sew'), keep = $('#keep');
  const saved = store.get('valix-muchloved-tag'); if (saved) inp.value = saved;
  const today = new Date(); const ds = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  let prog = 0, holding = false, lastStitch = 0, doneTag = false;
  function draw() {
    x.clearRect(0, 0, 640, 400);
    x.fillStyle = '#f2f0ec'; x.beginPath(); x.roundRect(10, 10, 620, 380, 8); x.fill();
    // 천 결
    x.globalAlpha = 0.05; x.fillStyle = '#000'; for (let i = 0; i < 380; i += 3) x.fillRect(10, 10 + i, 620, 1); x.globalAlpha = 1;
    x.fillStyle = '#111'; x.textAlign = 'center';
    x.font = '700 54px Pretendard, sans-serif'; x.fillText(inp.value.trim() || '이름', 320, 190);
    x.font = '400 20px Pretendard, sans-serif'; x.fillStyle = '#555'; x.fillText(ds, 320, 240);
    x.font = '700 16px Pretendard, sans-serif'; x.fillText('M U C H   L O V E D', 320, 300);
    // 바느질 테두리: 진행만큼
    const P = [[34, 34], [606, 34], [606, 366], [34, 366], [34, 34]];
    const L = 2 * (572 + 332); let need = prog * L; x.strokeStyle = '#7d7a74'; x.lineWidth = 3; x.setLineDash([12, 9]); x.beginPath(); x.moveTo(34, 34);
    for (let i = 1; i < P.length && need > 0; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i]; const seg = Math.hypot(bx - ax, by - ay), f = Math.min(1, need / seg); x.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); need -= seg; }
    x.stroke(); x.setLineDash([]);
  }
  draw(); inp.addEventListener('input', () => { draw(); });
  (function tick() {
    requestAnimationFrame(tick);
    if (!holding || doneTag) return; const now = performance.now();
    prog = Math.min(1, prog + 1 / 300); draw();
    if (now - lastStitch > 250) { lastStitch = now; sensor.vibrate(6); }
    if (prog >= 1) {
      doneTag = true; holding = false; sew.textContent = '완성했어요'; sew.disabled = true; beat([20, 80, 20]);
      store.set('valix-muchloved-tag', inp.value.trim());
      try { keep.href = tc.toDataURL('image/png'); keep.hidden = false; } catch (e) {}
      mark(5); setTimeout(() => goto('#s6'), 2600);
    }
  })();
  const on = (e) => { e.preventDefault(); if (!doneTag) holding = true; }, off = () => { holding = false; };
  sew.addEventListener('pointerdown', on); sew.addEventListener('pointerup', off); sew.addEventListener('pointerleave', off); sew.addEventListener('pointercancel', off);
  $('#skip').onclick = () => { mark(5); goto('#s6'); };
})();

// ════════════════ 6 맺음 · 나가기 ════════════════
new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) mark(6); }), { threshold: 0.3 }).observe($('#s6'));
document.querySelectorAll('.ml-exit').forEach((a) => a.addEventListener('click', (e) => {
  if (e.defaultPrevented) return;
  if (IN_FRAME) { e.preventDefault(); try { parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); } catch (err) {} setTimeout(() => (location.href = './'), 600); }
}));

// 상단 바: 아래로 내리면 숨고 올리면 나옴 (휴대폰)
(() => {
  const top = $('.ml-top'); let y0 = scrollY;
  addEventListener('scroll', () => { if (!IS_MOBILE) return; const y = scrollY; if (y < 120) top.classList.remove('hide'); else if (y - y0 > 24) top.classList.add('hide'); else if (y0 - y > 14) top.classList.remove('hide'); y0 = y; }, { passive: true });
})();
fit();
if (location.hash === '#debug') window.__ml = { sensor, wallShow, sofaShow, slideShow, sleep, wake, drawerSet, hitDust, dustCv, rub, get dustDone() { return dustDone; }, camera, get cur() { return cur; }, get mode() { return mode; }, get pat() { return [patT, patBtn, found, glOn]; } };
