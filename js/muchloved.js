// c008 MUCH LOVED — 김규진. 닳고 해진 애착 인형을 손끝으로 다시 만나는 전시. (v3, 2026-11-19)
// 세로 스크롤 하나로 이어짐: 0 쥐기 → 1 액자 속 인형(레진 7) → 2 서랍(TOMMY) → 3 소파(레진 3) + 감싸기
//   → 4 은빛 바닥(알루미늄 4) + 잠들기 → 5 나의 인형(남긴 자국) → 6 맺음
// 레진 인형은 도록 사진 한 장으로 만든 앞면 입체(뒷면 없음). 인형마다 '자국 지도'(캔버스, R 손때 · G 해진 곳 · B 눌림)를
// 셰이더가 읽어: 문지르면 손때가 쌓이고, 후~ 불면 해진 곳이 벌어지며 솜이 날리고, 꾹 누르면 눌렸다가 조금 납작하게 남고,
// 흔들면 해진 틈으로 솜이 빠져나옴. 체험 효과는 이 화면에만 생기고 '원래대로'로 언제든 작품 원래 모습.
// 알루미늄은 사진: 만지면 입김처럼 뿌옇게 흐렸다가 다시 맑아짐(닳지 않는 금속).
// 모든 센서에 버튼·끌기 대체. 마이크·카메라는 누른 사람에게만. 문서: docs/exhibitions/c008-muchloved/
import * as THREE from './vendor/three.module.js';
import { sensor, IS_MOBILE, startMic, startCamera, keepAwake } from './sensors.js?v=6';
import { lang, langSwitcher } from './i18n.js?v=7';
import { t, ARTIST } from './muchloved-i18n.js?v=2';
import { snd } from './muchloved-sound.js?v=1';

const $ = (s, el = document) => el.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IN_FRAME = window !== window.top;
const A = 'assets/muchloved/';
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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
// 인형마다 앞세우는 동작 (모든 동작은 어디서나 됨)
// 인형마다 체험 하나씩 (2026-11-19 소유자: 각 인형별로 다른 체험, 하나씩만)
const MODE = { snow: 'rub', dino: 'blow', floopy: 'press', hobby: 'shake', fufu: 'hug', 'peanut-frame': 'tap', moon: 'stretch', jake: 'roll', peanut: 'pull', mas: 'call' };
const TEXT = {
  rub: [t('문질러 보세요'), t('만질수록 손때가 묻어요')],
  blow: [t('후~ 불어 보세요'), t('해진 곳이 벌어지고 솜이 날려요')],
  press: [t('꾹 누르고 있어 보세요'), t('눌린 자리가 납작하게 남아요')],
  shake: [IS_MOBILE ? t('휴대폰을 흔들어 보세요') : t('흔들기를 눌러 보세요'), t('해진 틈으로 솜이 빠져나와요')],
  hug: [IS_MOBILE ? t('두 손가락으로 감싸 보세요') : t('꾹 누르고 있어 보세요'), t('폭 안기며 심장이 뛰어요')],
  tap: [t('톡톡 두드려 보세요'), t('두드린 자리가 반들반들 닳아요')],
  stretch: [t('잡아당겨 보세요'), t('천이 늘어나요 · 세게 당기면 실밥이 터져요')],
  roll: [IS_MOBILE ? t('휴대폰을 좌우로 기울여 보세요') : t('인형을 좌우로 끌어 보세요'), t('소파 위를 구르며 먼지가 일어요')],
  pull: [t('위로 끌어 꺼내 보세요'), t('쿠션 틈에 끼어 있어요')],
  call: [t('이름을 불러 보세요'), t('목소리에 귀를 기울여요')],
};
const BTN = { blow: t('후~ 불기'), shake: IS_MOBILE ? t('흔들기 (버튼)') : t('흔들기'), call: t('이름 부르기 (누르고 있기)') };
const MARKS = new Set(['rub', 'blow', 'press', 'shake', 'tap', 'stretch', 'roll']); // 자국이 남는 체험 → '원래대로'
const TOUCH = new Set(['rub', 'press', 'hug', 'tap', 'stretch', 'pull', ...(IS_MOBILE ? [] : ['roll'])]); // 인형 위 터치로 하는 체험(이때만 스크롤 대신 체험)
const tagHTML = (id) => `<b>${W[id][0]}</b><span>${W[id][2]}mm · ${W[id][1]} · 2025</span>`;

// ── 진동 + 화면 박동 (아이폰 웹은 진동이 없어서 가장자리가 박동에 맞춰 밝아짐)
const edge = $('#ml-edge');
function beat(p = [30, 120, 30]) { sensor.vibrate(p); snd.fx('heart', 0.9); if (RM) return; edge.classList.remove('beat'); void edge.offsetWidth; edge.classList.add('beat'); }
const back = $('#ml-back');
const setBack = (c) => { back.style.backgroundColor = c; };

// ── 화면
const dollSec = (id, ch, extra = '') => `
<section class="sc dsec" data-i="${ch}" data-doll="${id}">
  <div class="stk">
    <div class="d-top"><div class="tag show">${tagHTML(id)}${id === 'peanut' ? `<span style="color:#888">${t('액자 작품과 이름이 같아요 · 작가 확인 중')}</span>` : ''}</div></div>
    ${extra}
    <div class="d-bot">
      <p class="d-verb"><b>${TEXT[MODE[id]][0]}</b><span>${TEXT[MODE[id]][1]}</span></p>
      <p class="d-meter" aria-live="polite"></p>
      <div class="chip-row">${BTN[MODE[id]] ? `<button class="chip hold" data-act="${MODE[id]}">${BTN[MODE[id]]}</button>` : ''}${MARKS.has(MODE[id]) ? `<button class="chip ghost" data-act="reset">${t('원래대로')}</button>` : ''}</div>
    </div>
  </div>
</section>`;
const chapter = (ch, n, title, lead) => `<section class="sc chap" data-i="${ch}"><p class="sc-head">${n}</p><h2 class="sc-title">${title}</h2><p class="sc-lead">${lead}</p><p class="scroll-cue">${t('아래로 ↓')}</p></section>`;
const floorSec = (id) => `
<section class="sc fsec" data-i="4" data-floor="${id}">
  <div class="stk">
    <div class="ph"><img src="${A}p/${id}.webp" alt="${W[id][0]}" loading="lazy" draggable="false"><canvas class="fog"></canvas><i class="sheen"></i></div>
    <div class="d-bot"><div class="tag show">${tagHTML(id)}</div><p class="d-verb"><span>${t(IS_MOBILE ? '만져 보거나 기울여 보세요' : '마우스로 쓸어 보세요')} · ${t('금속은 닳지 않아요')}</span></p></div>
  </div>
</section>`;

const main = $('#ml');
main.innerHTML = `
<section class="sc" id="s0" data-i="0">
  <div>
    <h1 class="s0-name"><img src="assets/posters/c008-logo.webp" alt="MUCH LOVED" width="900" height="391"></h1>
    <p class="s0-by">${lang === 'ko' ? '김규진 · KIM GYUZIN' : 'KIM GYUZIN'}</p>
    <div class="ring"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="39"/><circle class="fg" cx="42" cy="42" r="39"/></svg></div>
    <p class="hint" id="h0">${t('화면을 꾹 누르고 있어 보세요')}</p>
    <div class="lines" id="lines"></div>
    <div class="under"><button class="btn" id="go1" hidden>${t('들어가기')}</button></div>
  </div>
</section>
${chapter(1, t('1 · 액자 속 인형들'), t('많이 사랑받은 것은 닳는다'), t('인형마다 만나는 방법이 하나씩 달라요. 문지르고, 불고, 누르고, 흔들고, 껴안고, 두드리고, 잡아당겨 보세요. ‘원래대로’를 누르면 언제든 작품의 원래 모습으로 돌아가요.'))}
${WALL.map((id) => dollSec(id, 1)).join('')}
${chapter(2, t('2 · 서랍'), t('넣어 둔 기억'), t('천천히 내려가면 서랍이 열려요.'))}
<section class="sc tsec" id="s2" data-i="2">
  <div class="stk">
    <div class="drawer" id="drawer"><img src="${A}p/tommy.webp" alt="${t('나무 서랍 안에서 고개를 내민 TOMMY')}" loading="lazy" draggable="false"><div class="front"></div></div>
    <div class="d-bot"><div class="tag" id="d-tag">${tagHTML('tommy')}</div><p class="d-verb" id="h2"><span>${t(IS_MOBILE ? '천천히 내려 보세요 · 휴대폰을 몸 쪽으로 당겨 세워도 열려요' : '천천히 내려 보세요')}</span></p></div>
  </div>
</section>
${chapter(3, t('3 · 소파'), t('생활 속에 숨은 인형'), t('소파에 놓인 인형들이에요. 굴리고, 꺼내고, 불러 보세요.'))}
${SOFA.map((id) => dollSec(id, 3)).join('')}
<section class="sc" id="s3h" data-i="3">
  <div class="hug" id="hug">
    <p class="sc-title" style="font-size:18px">${t('두 손으로 감싸 보세요')}</p>
    <p class="sc-lead" style="margin:6px auto 0">${t('아래 동그라미를 두 손가락 이상으로 덮고 있거나, 꾹 누르고 있어요.')}</p>
    <div class="hug-pad" id="hugpad">${t('여기를 감싸기')}</div>
    <p class="hint" id="h4"></p>
    <div class="chip-row"><button class="chip" id="chest">${t('가슴에 안아 보기 (카메라)')}</button></div>
    <p class="hint" style="font-size:11px;color:#666">${t('카메라는 화면이 가려졌는지 밝기만 읽어요. 영상은 보지도 저장하지도 않아요.')}</p>
  </div>
</section>
${chapter(4, t('4 · 은빛 바닥'), t('굳어 버린 시간'), t('금속이 된 인형은 더 이상 닳지 않아요. 만지면 입김처럼 흐려졌다가 다시 맑아져요.'))}
${FLOOR.map(floorSec).join('')}
<section class="sc" id="s4s" data-i="4">
  <div style="text-align:center;margin:auto 0">
    <p class="sc-title">${t('함께 잠들어 볼까요?')}</p>
    <p class="sc-lead" style="margin:10px auto 16px">${t(IS_MOBILE ? '휴대폰을 엎어 두거나, 손바닥을 화면에 얹어 보세요.' : '버튼을 누르면 잠들어요.')}</p>
    <button class="btn line" id="sleepbtn">${t('잠들기')}</button>
    <p class="hint" id="h5"></p>
  </div>
</section>
<section class="sc" id="s5" data-i="5">
  <p class="sc-head">${t('5 · 나의 인형')}</p>
  <h2 class="sc-title">${t('당신이 남긴 자국')}</h2>
  <div class="marks" id="marks"></div>
  <h2 class="sc-title" style="margin-top:34px">${t('당신의 인형 이름은<br>무엇이었나요?')}</h2>
  <div class="my">
    <input id="myname" maxlength="12" placeholder="${t('이름 (12자까지)')}" autocomplete="off" enterkeyhint="done">
    <canvas id="tagcv" width="640" height="400"></canvas>
    <button class="btn" id="sew">${t('꾹 눌러 바느질하기')}</button>
    <a class="btn line" id="keep" hidden download="much-loved-tag.png">${t('간직하기')}</a>
    <p class="hint" style="font-size:11px;color:#666">${t('이름은 이 기기에만 저장돼요.')}</p>
  </div>
</section>
<section class="sc" id="s6" data-i="6" style="display:block">
  <p class="end-msg">${t('닳은 자리마다,<br>사랑이 머물렀다.')}</p>
  <div class="note">
    <p>${t('아기에게 인형은 장난감이라기보다 불안을 견디게 해 준 첫 번째 타자에 가깝습니다. 쥐고, 물고, 끌어안고 잠든 시간이 때와 닳음과 찢어짐으로 남습니다.')}</p>
    <p>${t('작가는 그 흔적을 고치지 않습니다. 사라진 자리를 그대로 굳혀, 결핍을 슬픔이 아니라 사랑이 머문 자리로, 상처를 시간이 남긴 문장으로 보여 줍니다.')}</p>
    <small>${t('작가 노트에서 (요약)')}</small>
  </div>
  <img class="space" src="${A}p/space-wall.webp" alt="${t('액자 벽과 서랍장 설치 전경')}" loading="lazy">
  <img class="space" src="${A}p/space-sofa.webp" alt="${t('소파 설치 전경')}" loading="lazy">
  <img class="space" src="${A}p/space-table.webp" alt="${t('은빛 탁자 설치 전경')}" loading="lazy">
  <div class="grid">${ORDER.map((k) => `<figure><img src="${A}t/${k}.webp" alt="${W[k][0]}" loading="lazy"><figcaption><b>${W[k][0]}</b><br>${W[k][1]}<br>${W[k][2]}mm, 2025</figcaption></figure>`).join('')}</div>
  <div class="bio"><h3>${t('작가')}</h3>${t('BIO')}</div>
  <div class="credit"><h3>${t('크레딧')}</h3>${t('CREDIT')}</div>
  <a class="btn exit ml-exit" href="./">${t('전시 행성 나가기')}</a>
</section>`;

// ── 진행 점(장 단위)
const dots = $('#ml-dots');
dots.innerHTML = '<i></i>'.repeat(7);
const done = new Set();
function mark(i) { done.add(i); [...dots.children].forEach((d, k) => d.classList.toggle('done', done.has(k))); }
const goto = (el) => (typeof el === 'string' ? $(el) : el).scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
let cur = -1;
const secs = [...document.querySelectorAll('.sc')];
const vis = new Map();
const io = new IntersectionObserver((es) => {
  es.forEach((e) => vis.set(e.target, e.intersectionRatio));
  let best = null, br = 0; vis.forEach((r, el) => { if (r > br) { br = r; best = el; } });
  if (!best) return; const i = +best.dataset.i;
  if (i !== cur) { cur = i; if (!sleeping) snd.scene(['intro', 'wall', 'drawer', 'sofa', 'floor', 'end', 'end'][i] || 'wall'); [...dots.children].forEach((d, k) => d.classList.toggle('now', k === i)); store.set('valix-muchloved-step', String(i)); if (i > 0) mark(i - 1); }
}, { threshold: [0, .25, .5, .75, 1] });
secs.forEach((s) => io.observe(s));

// ════════════════ 3D: 인형마다 자국 지도 ════════════════
const cv = $('#ml-gl');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 0, 6);
const VH = 2 * 6 * Math.tan(THREE.MathUtils.degToRad(15)); // 화면 높이(월드)
scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.2));
const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(1.2, 1.6, 3); scene.add(key);
// 전시장 조명: 위 앞에서 비추는 스포트라이트 하나가 지금 보이는 인형을 따라가며 액자 안·소파에 그림자를 드리움
const spot = new THREE.SpotLight(0xfff6ea, 26, 0, 0.42, 0.55, 1.6);
spot.castShadow = true; spot.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048); spot.shadow.bias = -0.0004; spot.shadow.radius = 6;
spot.shadow.camera.near = 1; spot.shadow.camera.far = 14;
scene.add(spot, spot.target);
const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(u, color) {
  if (!texCache.has(u)) texCache.set(u, new Promise((r) => loader.load(u, (t) => { if (color) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; } r(t); }, undefined, () => r(null))));
  return texCache.get(u);
}
const DEPTH = 0.36, BACK = 0.3, FRONT_K = 0.8, BACK_K = 0.7, MAX = THREE.MathUtils.degToRad(22), TURN = THREE.MathUtils.degToRad(42);

// 셰이더: 표준 재질에 자국 지도(R 손때 · G 해진 곳 · B 눌림)와 누르는 자리(uPress)를 더함
function wearMaterial(d) {
  const m = new THREE.MeshStandardMaterial({ map: d.col, displacementMap: d.dep, normalMap: d.nor, displacementScale: d.dz, alphaTest: 0.5, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWear = { value: d.wearTex };
    sh.uniforms.uPress = { value: d.press };
    sh.uniforms.uPull = { value: d.pull };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uWear; uniform vec4 uPress; uniform vec4 uPull; varying vec2 vWUv; varying float vDent;')
      .replace('#include <displacementmap_vertex>', `#include <displacementmap_vertex>
        vWUv = uv;
        vec3 wv = texture2D(uWear, uv).rgb; float flat_ = wv.b;
        vec2 dd = (uv - uPress.xy) * vec2(uPress.w, 1.0);
        float dent = uPress.z * exp(-dot(dd, dd) / 0.012);
        vDent = dent + flat_ * 0.6;
        transformed -= normalize(objectNormal) * (flat_ * 0.22 + dent * 0.45 - smoothstep(0.35, 0.7, wv.g) * 0.07);
        vec2 pd = (uv - uPull.xy) * vec2(uPress.w, 1.0); transformed.xy += uPull.zw * exp(-dot(pd, pd) / 0.02);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.3, clamp(texture2D(uWear, vWUv).b * 1.6, 0.0, 1.0));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uWear; varying vec2 vWUv; varying float vDent;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 wr = texture2D(uWear, vWUv).rgb;
        float n1 = vn(vWUv * 90.0), n2 = vn(vWUv * 23.0);
        float tear = min(wr.g, 0.72) + (n1 - 0.5) * 0.25 + (n2 - 0.5) * 0.2;
        // 손때: 문지른 만큼 어둡고 누렇게, 결을 따라 얼룩지게
        float dirt = clamp(wr.r * (0.7 + n2 * 0.6) * 1.3, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.42, 0.34, 0.26), dirt);
        // 해진 곳: 가장자리는 실밥처럼 어둡고, 안쪽은 비어져 나온 솜
        float rim = smoothstep(0.22, 0.34, tear) * (1.0 - smoothstep(0.34, 0.42, tear));
        float fluff = smoothstep(0.36, 0.5, tear);
        diffuseColor.rgb *= 1.0 - rim * 0.45;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.94, 0.89) * (0.78 + n1 * 0.25), fluff);
        // 눌린 자리: 오목하게 그늘
        diffuseColor.rgb *= 1.0 - clamp(vDent, 0.0, 1.0) * 0.6;`);
  };
  m.customProgramCacheKey = () => 'wear5';
  return m;
}

// 인형 (가까워지면 한 번 만들어 둠, 자국은 페이지를 떠날 때까지 남음)
const dolls = new Map(); // id → doll (만들어진 것)
const making = new Map(); // id → Promise
let _th = null;
const thick = () => _th || (_th = fetch(A + 'r/depth.json?v=1').then((r) => r.json()).catch(() => ({})));
function makeDoll(id) {
  if (making.has(id)) return making.get(id);
  const p = (async () => {
    const [col, dep, nor, TH] = await Promise.all([tex(A + `r/${id}_color.webp`, 1), tex(A + `r/${id}_depth.png`), tex(A + `r/${id}_normal.webp`), thick()]);
    if (!col) return null;
    const asp = col.image.width / col.image.height;
    // 인형마다 실제 두께(둥근 단면, tools/muchloved-relief/relief2.py) — 없으면 예전 값
    const th = TH[id] || 0.18, dz = th * FRONT_K, bz = th * BACK_K;
    const wc = document.createElement('canvas'); wc.width = 256; wc.height = Math.round(256 / asp);
    const wx = wc.getContext('2d', { willReadFrequently: true }); wx.fillStyle = '#000'; wx.fillRect(0, 0, wc.width, wc.height);
    const wearTex = new THREE.CanvasTexture(wc);
    // 인형 모양(알파) — 투명한 곳 거르기·자국 비율·씨앗
    const mc = document.createElement('canvas'); mc.width = 64; mc.height = Math.round(64 / asp);
    const mx = mc.getContext('2d', { willReadFrequently: true }); mx.drawImage(col.image, 0, 0, mc.width, mc.height);
    const md = mx.getImageData(0, 0, mc.width, mc.height).data; const inside = [];
    const grid = new Uint8Array(mc.width * mc.height);
    for (let y = 0; y < mc.height; y++) for (let x = 0; x < mc.width; x++) if (md[(y * mc.width + x) * 4 + 3] > 200) { inside.push([(x + 0.5) / mc.width, 1 - (y + 0.5) / mc.height]); grid[y * mc.width + x] = 1; }
    const isIn = (u, v) => { const x = Math.floor(u * mc.width), y = Math.floor((1 - v) * mc.height); return x >= 0 && y >= 0 && x < mc.width && y < mc.height && grid[y * mc.width + x] === 1; };
    const d = { id, mode: MODE[id], col, dep, nor, asp, dz, bz, wc, wx, wearTex, inside, isIn, press: new THREE.Vector4(0.5, 0.5, 0, asp), pull: new THREE.Vector4(0.5, 0.5, 0, 0), seeds: [], stats: { dirt: 0, tear: 0, flat: 0 }, touched: false, rz: 0, rollT: 0, hug: 0, hugT: 0, out: 0, outT: 0, call: 0, n: 0, m: 0, note: '' };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(asp, 1, 200, Math.max(64, Math.round(200 / asp))), wearMaterial(d));
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: col, alphaTest: 0.5, displacementMap: dep, displacementScale: d.dz });
    const back = backMesh(col, dep, asp, d.bz);
    const spin = new THREE.Group(); spin.add(mesh, back);
    const g = new THREE.Group(); g.add(spin); g.visible = false; scene.add(g);
    const box = SOFA.includes(id) ? sofaCatcher(asp, MODE[id] === 'pull') : frameBox(asp);
    g.add(box);
    Object.assign(d, { mesh, back, spin, box, g, w: asp, h: 1 });
    dolls.set(id, d);
    return d;
  })();
  making.set(id, p); return p;
}

// 뒷면: 앞면 사진을 흐리게(얼굴·무늬가 사라진 천 뒷모습) + 깊이를 뒤로 → 앞면과 가장자리에서 만나 닫힌 몸통
function backMesh(col, dep, asp, bz) {
  const im = col.image, w = 512, h = Math.round(512 / asp);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.filter = `blur(${Math.round(w * 0.022)}px) saturate(0.8) brightness(0.78)`; x.drawImage(im, 0, 0, w, h); x.filter = 'none';
  x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0, w, h); // 원래 테두리(알파)는 그대로
  const bt = new THREE.CanvasTexture(c); bt.colorSpace = THREE.SRGBColorSpace;
  // 깊이를 꼭짓점에 직접 옮김(빛·그림자가 실제 굴곡을 따르게)
  const sx = 120, sy = Math.max(48, Math.round(120 / asp));
  const geo = new THREE.PlaneGeometry(asp, 1, sx, sy);
  const dc = document.createElement('canvas'); dc.width = sx + 1; dc.height = sy + 1; const dx = dc.getContext('2d', { willReadFrequently: true });
  dx.drawImage(dep.image, 0, 0, sx + 1, sy + 1); const dd = dx.getImageData(0, 0, sx + 1, sy + 1).data;
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i), px = Math.round(u * sx), py = Math.round((1 - v) * sy);
    const z = dd[(py * (sx + 1) + px) * 4] / 255; pos.setZ(i, -z * bz);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bt, alphaTest: 0.5, roughness: 0.92, side: THREE.DoubleSide }));
  m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: bt, alphaTest: 0.5 });
  return m;
}
// 액자 상자: 깊은 나무 틀 + 안쪽 판(그림자가 드리움). 인형 크기 1을 기준으로
const FR = { mat: new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.7 }), inner: new THREE.MeshStandardMaterial({ color: 0x3a3936, roughness: 1 }) };
const frameW = (asp) => asp * 1.22 + 0.16;
function frameBox(asp) {
  const g = new THREE.Group(), W2 = frameW(asp), H2 = 1.3, D = 0.62, t = 0.06, zb = -0.42;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W2, H2), FR.inner); panel.position.z = zb; panel.receiveShadow = true; g.add(panel);
  const bar = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), FR.mat); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); };
  const zc = zb + D / 2;
  bar(W2 + 2 * t, t, D, 0, H2 / 2 + t / 2, zc); bar(W2 + 2 * t, t, D, 0, -H2 / 2 - t / 2, zc);
  bar(t, H2, D, -W2 / 2 - t / 2, 0, zc); bar(t, H2, D, W2 / 2 + t / 2, 0, zc);
  // 안쪽 판 위 조명 웅덩이(전시장 핀 조명 느낌)
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(W2, H2), new THREE.MeshBasicMaterial({ map: poolTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
  pool.position.z = zb + 0.002; g.add(pool);
  g.userData.zb = zb;
  return g;
}
let _pool = null;
function poolTex() {
  if (_pool) return _pool; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 46, 4, 64, 60, 76); gr.addColorStop(0, 'rgba(255,248,236,.55)'); gr.addColorStop(1, 'rgba(255,248,236,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return (_pool = new THREE.CanvasTexture(c));
}
// 소파 인형: 천 쿠션 두 개(등받이·앉는 자리) 위에 놓임 — 그림자가 쿠션 굴곡을 따라 드리움
const CUSH = new THREE.MeshStandardMaterial({ color: 0x5e5b57, roughness: 1 });
function pillow(w, h, d) {
  // 둥근 상자(모서리가 부푼 쿠션): 구를 늘리고 가운데를 평평하게
  const g = new THREE.SphereGeometry(1, 48, 32), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.45); x = k(x); y = k(y); z = Math.sign(z) * Math.pow(Math.abs(z), 0.8);
    P.setXYZ(i, x * w / 2, y * h / 2, z * d / 2);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, CUSH); m.receiveShadow = true; m.castShadow = true; return m;
}
function sofaCatcher(asp, front) {
  const g = new THREE.Group(), W2 = Math.max(asp * 1.7 + 0.6, 1.6);
  const backC = pillow(W2, 1.25, 0.42); backC.position.set(0, 0.12, -0.62); backC.rotation.x = -0.12; g.add(backC);
  const seat = pillow(W2 * 1.05, 0.34, 1.1); seat.position.set(0, -0.62, -0.05); g.add(seat);
  if (front) { const f = pillow(W2 * 1.1, 0.78, 0.55); f.position.set(0, -0.42, 0.42); f.rotation.x = 0.1; g.add(f); } // 쿠션 틈(꺼내기)
  g.userData.zb = -0.45; return g;
}

// 자국 그리기 (캔버스에 채널별로 더함)
function stamp(d, u, v, r, ch, a) {
  const x = u * d.wc.width, y = (1 - v) * d.wc.height, c = d.wx;
  c.globalCompositeOperation = 'lighter';
  const col = ch === 'r' ? '255,0,0' : ch === 'g' ? '0,255,0' : '0,0,255';
  const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
  d.wearTex.needsUpdate = true; d.touched = true; d.dirty = true;
}
function resetDoll(d) { Object.assign(d, { n: 0, m: 0, note: '', rollT: 0 }); d.wx.globalCompositeOperation = 'source-over'; d.wx.fillStyle = '#000'; d.wx.fillRect(0, 0, d.wc.width, d.wc.height); d.wearTex.needsUpdate = true; d.seeds = []; d.dirty = true; d.stats = { dirt: 0, tear: 0, flat: 0 }; }
function measure(d) {
  const px = d.wx.getImageData(0, 0, d.wc.width, d.wc.height).data, W2 = d.wc.width, H2 = d.wc.height; let n = 0, r = 0, g = 0, b = 0;
  for (const [u, v] of d.inside) { const i = (Math.min(H2 - 1, Math.floor((1 - v) * H2)) * W2 + Math.min(W2 - 1, Math.floor(u * W2))) * 4; n++; if (px[i] > 70) r++; if (px[i + 1] > 110) g++; if (px[i + 2] > 25) b++; }
  d.stats = { dirt: Math.round(r / n * 100), tear: Math.round(g / n * 100), flat: Math.round(b / n * 100) }; d.dirty = false;
}

// 해진 곳 씨앗: 손때가 많은 곳부터(없으면 아무 데나)
function seedsOf(d) {
  if (d.seeds.length) return d.seeds;
  const px = d.wx.getImageData(0, 0, d.wc.width, d.wc.height).data; const cand = [];
  for (let k = 0; k < 60; k++) { const [u, v] = d.inside[(Math.random() * d.inside.length) | 0]; const i = (Math.min(d.wc.height - 1, Math.floor((1 - v) * d.wc.height)) * d.wc.width + Math.floor(u * d.wc.width)) * 4; cand.push([u, v, px[i] + Math.random() * 60]); }
  cand.sort((a, b) => b[2] - a[2]);
  d.seeds = cand.slice(0, 3).map(([u, v]) => ({ u, v, a: Math.random() * 6.28 }));
  return d.seeds;
}
let lastRip = 0;
function tearStep(d, power) {
  if (d.stats.tear > 30) { seedsOf(d).forEach((s) => Math.random() < 0.3 && puff(d, s.u, s.v, 1)); return; } // 인형이 남아 있게 30%까지만
  seedsOf(d).forEach((s) => {
    s.a += (Math.random() - 0.5) * 0.9; const step = 0.012 * power;
    const nu = s.u + Math.cos(s.a) * step / d.asp, nv = s.v + Math.sin(s.a) * step;
    if (d.isIn(nu, nv)) { s.u = nu; s.v = nv; } else s.a += Math.PI * 0.7;
    stamp(d, s.u, s.v, 7 + Math.random() * 8 * power, 'g', 0.5);
    if (Math.random() < 0.45) { puff(d, s.u, s.v, 1); if (Math.random() < 0.3) snd.fx('fluff'); }
    const nw = performance.now(); if (nw - lastRip > 170) { lastRip = nw; snd.fx('rip', 0.5 + power * 0.5); }
  });
}

// 솜 입자
const PN = 360, pPos = new Float32Array(PN * 3), pVel = [], pLife = new Float32Array(PN);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const dotCv = document.createElement('canvas'); dotCv.width = dotCv.height = 32; { const c = dotCv.getContext('2d'), g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,253,246,1)'); g.addColorStop(0.5, 'rgba(245,242,232,.6)'); g.addColorStop(1, 'rgba(240,236,226,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); }
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.08, map: new THREE.CanvasTexture(dotCv), transparent: true, depthWrite: false }));
pts.frustumCulled = false; scene.add(pts);
for (let i = 0; i < PN; i++) { pVel.push(new THREE.Vector3()); pPos[i * 3 + 2] = -99; }
let pi = 0;
const tmpV = new THREE.Vector3();
function puff(d, u, v, n, fall = false) {
  for (let k = 0; k < n; k++) {
    tmpV.set((u - 0.5) * d.w, (v - 0.5) * d.h, d.dz * 0.6); d.mesh.localToWorld(tmpV);
    pPos[pi * 3] = tmpV.x; pPos[pi * 3 + 1] = tmpV.y; pPos[pi * 3 + 2] = tmpV.z;
    pVel[pi].set((Math.random() - 0.5) * 0.02, fall ? -0.004 - Math.random() * 0.01 : 0.008 + Math.random() * 0.02, 0.01 + Math.random() * 0.02);
    pLife[pi] = 1; pi = (pi + 1) % PN;
  }
}
function puffTick() {
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) continue; pLife[i] -= 0.012;
    pVel[i].y -= 0.0003; pVel[i].multiplyScalar(0.985); pVel[i].x += (Math.random() - 0.5) * 0.002;
    pPos[i * 3] += pVel[i].x; pPos[i * 3 + 1] += pVel[i].y; pPos[i * 3 + 2] += pVel[i].z;
    if (pLife[i] <= 0) pPos[i * 3 + 2] = -99;
  }
  pGeo.attributes.position.needsUpdate = true;
}

// 인형 장면: 붙박이 칸(.stk)을 따라 3D가 함께 오르내림
const dsecs = [...document.querySelectorAll('.dsec')];
const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) makeDoll(e.target.dataset.doll); }), { rootMargin: '150% 0px' });
dsecs.forEach((s) => near.observe(s));
let active = null; // 지금 만질 수 있는 인형 장면 { s, d }
function layout() { const H = innerHeight, Wd = innerWidth; renderer.setSize(Wd, H, false); camera.aspect = Wd / H; camera.updateProjectionMatrix(); }
addEventListener('resize', layout); layout();
let tx = 0, ty = 0, rx = 0, ry = 0, mouse = null;
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') mouse = { x: e.clientX / innerWidth * 2 - 1, y: e.clientY / innerHeight * 2 - 1 }; });
const clock = new THREE.Clock();
let anyOn = false, lastActive = null;
function frame() {
  requestAnimationFrame(frame);
  const H = innerHeight, t = clock.getElapsedTime(), VW = VH * camera.aspect;
  let show = false; active = null;
  if (sensor.on) { tx = clamp(-sensor.tiltY, -1, 1) * MAX * 0.8; ty = clamp(sensor.tiltX, -1, 1) * MAX; }
  else if (mouse && !press) { ty = mouse.x * MAX * 0.7; tx = mouse.y * MAX * 0.4; }
  const k = RM ? 1 : 0.1; rx += (tx - rx) * k; ry += (ty - ry) * k;
  const idle = RM || sensor.on || mouse ? 0 : 1;
  for (const s of dsecs) {
    const d = dolls.get(s.dataset.doll); if (!d) continue;
    const r = s.getBoundingClientRect(), on = r.bottom > 0 && r.top < H;
    d.g.visible = on; if (!on) continue; show = true;
    const stk = s._stk || (s._stk = $('.stk', s)); const sr = stk.getBoundingClientRect();
    const sofa = SOFA.includes(d.id), sp = d.spin;
    const anchor = sr.top + H * (sofa ? 0.45 : 0.465);
    const hT = sofa ? Math.min(VH * 0.42, VW * 0.8 / d.asp) : Math.min(VH * 0.42, VW * 0.84 / frameW(d.asp));
    d.g.scale.setScalar(hT); d.g.position.set(0, (0.5 - anchor / H) * VH, 0);
    // 장면 전체(액자+인형): 기울기에 조금만 → 액자 깊이가 보이는 시차
    d.g.rotation.set((sofa ? -0.12 : 0) + rx * 0.45, ry * 0.45, 0);
    // 들어올 때·나갈 때 옆으로 돌며(두께·뒷모습) 앞으로 나옴
    const enter = clamp(r.top / H, 0, 1), leave = clamp((H - r.bottom) / H, 0, 1);
    const turnIn = (enter - leave) * 1.35;
    const sway = Math.sin(t * 0.33 + d.asp * 3) * 0.32 * idle;
    sp.rotation.set(rx * 1.1 + Math.sin(t * 0.5 + d.asp) * 0.03 * idle, turnIn + ry * (TURN / MAX) + sway, 0);
    sp.position.set(0, 0, 0.12 + (enter + leave) * 0.25); sp.scale.set(1, 1, 1);
    if (d.mode === 'roll') { sp.rotation.z = -d.rz * 0.55; sp.position.x += d.rz * Math.min(0.3, VW * 0.18 / hT); }
    if (d.mode === 'hug') sp.scale.set(1 + 0.07 * d.hug, 1 - 0.09 * d.hug, 1 - 0.25 * d.hug);
    if (d.mode === 'pull') { sp.position.y += -(1 - d.out) * 0.2 + d.out * 0.24; sp.position.z += d.out * 0.3; }
    if (d.mode === 'call') { sp.rotation.y += d.call * 0.6; sp.position.y += Math.sin(t * 9) * d.call * 0.015; }
    if (!(press && press.d === d)) { d.pull.z *= 0.86; d.pull.w *= 0.86; }
    s.style.setProperty('--p', clamp(-r.top / Math.max(1, r.height - H), 0, 1).toFixed(3));
    if (r.top <= 2 && r.bottom >= H - 2) active = { s, d };
    if (!(press && press.d === d)) d.press.z *= 0.9;
  }
  key.position.set(1.2 - ry * 6, 1.6 + rx * 5, 3);
  // 스포트라이트: 화면 가운데에 가장 가까운 인형 위 앞에서
  let near0 = null, nd = 1e9; for (const [, d] of dolls) if (d.g.visible) { const k = Math.abs(d.g.position.y); if (k < nd) { nd = k; near0 = d; } }
  if (near0) {
    const P = near0.g.position, sc = near0.g.scale.y, lx = (mouse && !sensor.on ? mouse.x : ry / MAX) * 0.6;
    spot.position.set(P.x + (0.35 + lx) * sc * 2, P.y + 1.9 * sc, P.z + 2.2 * sc); spot.target.position.set(P.x, P.y - 0.05 * sc, P.z - 0.2 * sc); spot.target.updateMatrixWorld();
    spot.distance = 0; spot.shadow.camera.far = 6 * sc; spot.shadow.camera.near = 0.3 * sc;
  }
  // 만지는 인형이 바뀌면 지난 인형의 솜은 치움
  const aid = active && active.d.id; if (aid !== lastActive) { lastActive = aid; if (aid) { pLife.fill(0); for (let i = 0; i < PN; i++) pPos[i * 3 + 2] = -99; pGeo.attributes.position.needsUpdate = true; } }
  key.intensity = 1.0 + (active && active.d.mode === 'call' ? active.d.call * 0.9 : 0);
  if (show !== anyOn) { anyOn = show; cv.classList.toggle('on', show); }
  if (!show) return;
  interact();
  puffTick();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ── 만지기: 인형 위에서 시작한 터치는(그 인형이 터치로 하는 체험일 때만) 스크롤 대신 체험
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hitDoll(x, y, loose) {
  if (!active) return null; const d = active.d;
  d.g.updateMatrixWorld();
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const h = ray.intersectObject(d.mesh)[0]; if (!h) return null;
  const { x: u, y: v } = h.uv; if (!loose && !d.isIn(u, v)) return null; // 투명한 곳은 빼기
  return { d, u, v };
}
const pxToLocal = (px, d) => px * (VH / innerHeight) / d.g.scale.y; // 화면 px → 인형 크기 단위
let press = null; // { d, u, v, x, y, t0, moved, last }
let rubLevel = 0, creakLevel = 0, callMuteUntil = 0;
const hugIds = new Set();
const skip = (t) => t.closest && t.closest('button, a, input, .hug, .ph, .drawer');
document.addEventListener('touchstart', (e) => {
  if (!active || !TOUCH.has(active.d.mode) || skip(e.target)) return;
  if ([...e.touches].some((t) => hitDoll(t.clientX, t.clientY, true))) e.preventDefault();
}, { passive: false });
addEventListener('pointerdown', (e) => {
  if (skip(e.target) || !active || !TOUCH.has(active.d.mode)) return;
  const h = hitDoll(e.clientX, e.clientY, active.d.mode === 'pull' || active.d.mode === 'hug'); if (!h) return;
  e.preventDefault();
  if (h.d.mode === 'hug') { hugIds.add(e.pointerId); }
  if (press) return; // 두 번째 손가락은 껴안기에만
  press = { ...h, x: e.clientX, y: e.clientY, t0: performance.now(), moved: 0, last: { u: h.u, v: h.v }, out0: h.d.out, burst: false };
  if (h.d.mode === 'rub') stamp(h.d, h.u, h.v, 11, 'r', 0.2);
});
addEventListener('pointermove', (e) => {
  if (!press) return; const d = press.d, m = d.mode;
  const dx = e.clientX - press.x, dy = e.clientY - press.y; press.moved = Math.max(press.moved, Math.hypot(dx, dy));
  if (m === 'rub') {
    let ev = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (!ev.length) ev = [e];
    ev.forEach((x) => {
      const h = hitDoll(x.clientX, x.clientY); if (!h || h.d !== d) return;
      const l = press.last, du = (h.u - l.u) * d.wc.width, dv = (h.v - l.v) * d.wc.height, n = Math.ceil(Math.hypot(du, dv) / 4);
      for (let i = 1; i <= n; i++) stamp(d, l.u + (h.u - l.u) * i / n, l.v + (h.v - l.v) * i / n, 11, 'r', 0.16);
      rubLevel = Math.min(1, rubLevel + Math.hypot(du, dv) / 30); press.last = { u: h.u, v: h.v };
      if (Math.random() < 0.04) sensor.vibrate(4);
    });
  } else if (m === 'stretch') {
    // 잡은 자리를 끌면 천이 늘어남, 많이 당기면 실밥이 터짐(한 번 잡을 때 한 번)
    let lx = pxToLocal(dx, d), ly = -pxToLocal(dy, d); const L = Math.hypot(lx, ly), MX = 0.22;
    if (L > MX) { lx *= MX / L; ly *= MX / L; }
    d.pull.set(press.u, press.v, lx, ly); creakLevel = Math.min(1, L / MX); press.creak = L / MX;
    if (L > 0.2 && !press.burst) { snd.fx('snap'); press.burst = true; d.m++; stamp(d, press.u, press.v, 12, 'g', 0.6); stamp(d, press.u, press.v, 7, 'g', 0.5); puff(d, press.u, press.v, 8); beat([25, 50, 25]); }
    if (Math.random() < 0.05) sensor.vibrate(5);
  } else if (m === 'roll') {
    d.rollDrag = clamp(dx / (innerWidth * 0.3), -1, 1);
  } else if (m === 'pull') {
    d.outT = clamp(press.out0 + (-dy) / (innerHeight * 0.28), 0, 1);
  }
});
const release = (e) => {
  if (e && e.pointerId != null) hugIds.delete(e.pointerId);
  if (!press) return; const d = press.d, now = performance.now();
  if (d.mode === 'press' && d.press.z > 0.15) { stamp(d, d.press.x, d.press.y, 20, 'b', 0.55 * d.press.z); d.n++; snd.fx('unsquish'); } // 눌린 자리가 조금 남음
  if (d.mode === 'tap' && now - press.t0 < 320 && press.moved < 12) { stamp(d, press.u, press.v, 7, 'b', 0.35); d.n++; sensor.vibrate(8); snd.fx('knock'); }
  if (d.mode === 'stretch' && press.moved > 30) d.n++;
  if (d.mode === 'roll') d.rollDrag = 0;
  creakLevel = 0; press = null;
};
addEventListener('pointerup', release); addEventListener('pointercancel', release);

// 버튼: 후~ 불기 / 흔들기 / 이름 부르기 (누르고 있는 동안) · 원래대로
let micTried = false, holdAct = null;
document.querySelectorAll('.dsec .chip').forEach((b) => {
  const act = b.dataset.act, sec = b.closest('.dsec');
  if (act === 'reset') { b.onclick = () => { const d = dolls.get(sec.dataset.doll); if (d) { resetDoll(d); snd.fx('reset'); $('.d-meter', sec).textContent = t('작품의 원래 모습이에요'); } }; return; }
  const on = async (e) => {
    e.preventDefault(); holdAct = { act, s: sec, t: performance.now() }; b.classList.add('on');
    if ((act === 'blow' || act === 'call') && !micTried && IS_MOBILE) { micTried = true; try { await startMic(); } catch (err) {} }
    if (act === 'shake') shakeNow(0.7, sec);
  };
  const off = () => { holdAct = null; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
function shakeNow(s, sec) {
  const d = sec ? dolls.get(sec.dataset.doll) : active && active.d; if (!d || d.mode !== 'shake') return;
  if (!d.stats.tear) tearStep(d, 0.6);
  const k = Math.round(4 + s * 10); seedsOf(d).forEach((sd) => puff(d, sd.u, sd.v, k, true)); d.n++;
  if (s > 0.5) tearStep(d, 0.4);
  sensor.vibrate([20, 40, 20]); snd.fx('puff', 0.6 + s * 0.5);
}
let lastShake = 0;
sensor.onShake((s) => { const now = performance.now(); if (active && now - lastShake > 350) { lastShake = now; shakeNow(Math.min(1, s)); } });

const holding = (act) => holdAct && holdAct.act === act && holdAct.s === active.s;
let lastMeter = 0, lastI = 0;
function interact() {
  const now = performance.now(), dt = Math.min(250, now - (lastI || now)); lastI = now;
  rubLevel *= Math.pow(0.82, dt / 16);
  if (!active) { ['rustle', 'wind', 'creak', 'rumble', 'squeak'].forEach((k) => snd.set(k, 0)); return; }
  const d = active.d, m = d.mode;
  snd.set('rustle', m === 'rub' ? rubLevel : Math.max(0, cushV));
  snd.set('creak', m === 'stretch' ? creakLevel : 0, creakLevel * 0.8);
  if (m === 'press' && press && press.d === d && press.moved < 10 && now - press.t0 > 300) {
    if (!press.squished) { press.squished = true; snd.fx('squish'); }
    // 꾹 누르기: 300ms 넘게 가만히 → 그 자리가 눌림(1.2초면 가장 깊게)
    d.press.x = press.u; d.press.y = press.v; d.press.z = Math.min(1, d.press.z + dt / 1200);
    if (Math.random() < 0.05) sensor.vibrate(6);
  }
  if (m === 'blow') {
    const bp = Math.max(sensor.micOn && sensor.blow > 0.3 ? sensor.blow : 0, holding('blow') ? 0.8 : 0);
    if (bp > 0 && Math.random() < dt / 32) tearStep(d, bp);
    snd.set('wind', bp, bp * 0.4);
  } else snd.set('wind', 0);
  if (m === 'shake' && holding('shake') && now - holdAct.t > 500 && Math.random() < dt / 200) shakeNow(0.5);
  if (m === 'hug') {
    const on = hugIds.size >= 2 || (press && press.d === d && now - press.t0 > 400);
    d.hug += ((on ? 1 : 0) - d.hug) * Math.min(1, dt / 160);
    if (on) { d.hugT += dt; d.touched = true; if (Math.floor(d.hugT / 1100) > Math.floor((d.hugT - dt) / 1100)) beat(); }
  }
  if (m === 'roll') {
    const target = sensor.on ? clamp(sensor.tiltX / 0.6, -1, 1) : (d.rollDrag || 0);
    const prev = d.rz; d.rz += (target - d.rz) * Math.min(1, dt / 220);
    const v = Math.abs(d.rz - prev); d.rollT += v;
    if (v > 0.004 && Math.random() < v * 40) { // 구르면 아래쪽에 먼지 자국·먼지
      const pts = d.inside.filter(([, y]) => y < 0.35); const [u, y] = pts[(Math.random() * pts.length) | 0] || [0.5, 0.2];
      stamp(d, u, y, 9, 'r', 0.12); puff(d, u, y, 1, true); if (Math.random() < 0.25) snd.fx('thud', 0.3);
    }
    snd.set('rumble', Math.min(1, v * 70), d.rz * 0.3);
  } else snd.set('rumble', 0);
  if (m === 'pull') {
    const o0 = d.out; d.out += (d.outT - d.out) * Math.min(1, dt / 140);
    snd.set('squeak', Math.min(1, Math.abs(d.out - o0) * 60), d.out * 0.8);
    if (d.out > 0.95 && !d.found) { d.found = true; d.touched = true; beat([20, 80, 20]); snd.fx('pop'); }
  } else snd.set('squeak', 0);
  if (m === 'call') {
    const lv = Math.max(sensor.micOn && now > callMuteUntil ? sensor.micLevel : 0, holding('call') ? 0.8 : 0);
    if (lv > 0.3 && d.call < 0.3) { d.n++; d.touched = true; setTimeout(() => { snd.fx('answer'); callMuteUntil = performance.now() + 1200; }, 260); }
    d.call += (lv - d.call) * Math.min(1, dt / (lv > d.call ? 120 : 600));
  }
  if (now - lastMeter > 500) {
    lastMeter = now; if (d.dirty) measure(d);
    const st = d.stats, sec = Math.round(d.hugT / 1000);
    const note = {
      rub: st.dirt ? t('손때 {p}%', { p: st.dirt }) : '',
      blow: st.tear ? t('해진 곳 {p}%', { p: st.tear }) : '',
      press: d.n ? t('{n}번 눌렀어요 · 납작해진 곳 {p}%', { n: d.n, p: st.flat }) : '',
      shake: d.n ? t('{n}번 흔들었어요 · 해진 틈 {p}%', { n: d.n, p: st.tear }) : '',
      hug: sec ? t('{s}초 동안 안았어요', { s: sec }) : '',
      tap: d.n ? t('{n}번 두드렸어요 · 반들해진 곳 {p}%', { n: d.n, p: st.flat }) : '',
      stretch: d.n || d.m ? t('{n}번 당겼어요', { n: d.n }) + (d.m ? t(' · 터진 실밥 {m}곳', { m: d.m }) : '') : '',
      roll: d.rollT > 0.05 ? t('소파 위를 굴렀어요 · 묻은 먼지 {p}%', { p: Math.max(1, st.dirt) }) : '',
      pull: d.found ? t('찾았다! 쿠션 틈에서 꺼냈어요') : '',
      call: d.n ? t('목소리를 {n}번 들었어요', { n: d.n }) : '',
    }[m];
    if (note) { d.note = note; $('.d-meter', active.s).textContent = note; }
  }
}

// ════════════════ 0 쥐기 ════════════════
const LINES = ['당신이 가장 오래 쥐고 있던 것은<br>무엇인가요?', '손에 쥐고, 입에 넣고,<br>끌어안고 잠들던 것.', '그것은 닳고, 해지고,<br>어느 부분은 사라졌습니다.', '그래도 놓지 않았습니다.', '지금 손에 쥔 그것일지도 모릅니다.', 'MUCH LOVED · 많이 사랑받은 것들'].map((l) => t(l));
(() => {
  const s0 = $('#s0'), fg = $('#s0 .fg'), h0 = $('#h0'), box = $('#lines'), go = $('#go1');
  box.innerHTML = LINES.map((l, i) => `<p class="${i === LINES.length - 1 ? 'big' : ''}">${l}</p>`).join('');
  let n = 0, held = false, timer = 0, hold0 = 0;
  const step = () => {
    if (!held || n >= LINES.length) return;
    beat(); box.children[n].classList.add('in'); n++;
    fg.style.strokeDashoffset = 245 * (1 - n / LINES.length);
    if (n >= LINES.length) { held = false; h0.textContent = ''; go.hidden = false; mark(0); return; }
    timer = setTimeout(step, 1200);
  };
  const down = (e) => { if (n >= LINES.length || (e.target && e.target.closest && e.target.closest('button,a'))) return; held = true; h0.textContent = t('그대로 쥐고 있어요'); clearTimeout(hold0); hold0 = setTimeout(step, 600); };
  const up = () => { if (!held) return; held = false; clearTimeout(hold0); clearTimeout(timer); if (n < LINES.length) h0.textContent = t('다시 꾹 누르면 이어져요'); };
  s0.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => { if (e.code === 'Space' && cur === 0 && !e.repeat) { e.preventDefault(); down(e); } });
  addEventListener('keyup', (e) => { if (e.code === 'Space') up(); });
  go.addEventListener('click', async () => { await sensor.enable(); keepAwake(); goto(document.querySelector('.chap')); });
})();
// 휴대폰: 들어가기를 안 누르고 내려온 사람도 첫 탭에 센서 켜기
if (IS_MOBILE) addEventListener('click', () => { if (!sensor.on) sensor.enable(); }, { once: true });

// ════════════════ 2 서랍: 내려갈수록 열림(+ 몸 쪽으로 당기기) ════════════════
(() => {
  const s2 = $('#s2'), front = $('.front', s2), tag = $('#d-tag'); let base = null, opened = false, lastO = 0;
  (function tick() {
    requestAnimationFrame(tick);
    const r = s2.getBoundingClientRect(), H = innerHeight; if (r.bottom < 0 || r.top > H) { if (base !== null) snd.set('slide', 0); base = null; return; }
    const p = clamp(-r.top / Math.max(1, r.height - H), 0, 1);
    let tilt = 0; if (sensor.on) { if (base == null) base = sensor.tiltY; tilt = clamp((sensor.tiltY - base) / 0.6, 0, 1); }
    const o = Math.max(clamp((p - 0.1) / 0.55, 0, 1), tilt);
    front.style.transform = `translateY(${o * 100}%)`;
    snd.set('slide', Math.min(1, Math.abs(o - lastO) * 50)); lastO = o;
    if (o > 0.98 && !opened) { opened = true; tag.classList.add('show'); beat([15, 60, 15]); snd.fx('clunk'); setTimeout(() => snd.fx('chime', [72, 76, 79]), 200); mark(2); }
  })();
})();

// ════════════════ 3 소파: 쿠션은 내려갈수록 벌어짐(+ 기울이기) ════════════════
let cushV = 0;
(function cushTick() {
  requestAnimationFrame(cushTick); cushV *= 0.85;
  document.querySelectorAll('.dsec').forEach((s) => {
    const l = $('.cush.l', s); if (!l) return; const r = $('.cush.r', s);
    const rr = s.getBoundingClientRect(); if (rr.bottom < 0 || rr.top > innerHeight) return;
    const p = parseFloat(s.style.getPropertyValue('--p')) || 0;
    const part = Math.max(clamp((p - 0.04) / 0.3, 0, 1), sensor.on ? clamp(Math.abs(sensor.tiltX) / 0.45, 0, 1) : 0);
    l.style.transform = `translateX(${-part * 96}%)`; r.style.transform = `translateX(${part * 96}%)`;
    cushV = Math.max(cushV, Math.min(1, Math.abs(part - (s._part || 0)) * 25)); s._part = part;
  });
})();
// 감싸기
(() => {
  const pad = $('#hugpad'), h4 = $('#h4'); let held = 0, total = 0, beatT = 0, camHeld = false, last = performance.now();
  const ptsSet = new Set();
  (function tick() {
    const now = performance.now(), on = held > 0 || camHeld;
    pad.classList.toggle('held', on);
    if (on) {
      total += now - last; if (now - beatT > 1200) { beatT = now; beat(); }
      const g = Math.min(42, 21 + total / 4000 * 21) | 0; setBack(`rgb(${g},${g},${g})`);
      h4.textContent = t(total > 6000 ? '곁에 있었어요' : '그대로 있어요');
      if (total > 6000) mark(3);
    } else if (total) setBack('#000');
    last = now; requestAnimationFrame(tick);
  })();
  pad.addEventListener('pointerdown', (e) => { ptsSet.add(e.pointerId); held = ptsSet.size; pad.setPointerCapture(e.pointerId); e.preventDefault(); });
  const up = (e) => { ptsSet.delete(e.pointerId); held = ptsSet.size; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  $('#chest').onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const v = $('#ml-cam'); const stop = await startCamera(v);
      const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d', { willReadFrequently: true });
      let dark = 0; h4.textContent = t('휴대폰 뒷면을 가슴에 대 보세요');
      const hug = $('#s3h');
      const iv = setInterval(() => {
        const r = hug.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) { clearInterval(iv); stop(); camHeld = false; b.disabled = false; return; }
        x.drawImage(v, 0, 0, 16, 16); const d = x.getImageData(0, 0, 16, 16).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
        const avg = s / 256; if (avg < 18) dark += 200; else if (avg > 40) dark = 0; camHeld = dark >= 800;
      }, 200);
    } catch (err) { b.textContent = t('카메라 없이 동그라미를 감싸 주세요'); }
  };
})();

// ════════════════ 4 은빛 바닥: 입김 흐림 + 기울이면 빛 ════════════════
document.querySelectorAll('.fsec').forEach((s) => {
  const ph = $('.ph', s), fc = $('.fog', s), fx = fc.getContext('2d'), sheen = $('.sheen', s), img = $('img', ph); let down = false;
  const size = () => { fc.width = Math.max(1, ph.clientWidth >> 1); fc.height = Math.max(1, ph.clientHeight >> 1); };
  new ResizeObserver(size).observe(ph);
  const fog = (e) => { const r = ph.getBoundingClientRect(), x = (e.clientX - r.left) / 2, y = (e.clientY - r.top) / 2; const g = fx.createRadialGradient(x, y, 0, x, y, 40); g.addColorStop(0, 'rgba(235,238,240,.5)'); g.addColorStop(1, 'rgba(235,238,240,0)'); fx.fillStyle = g; fx.beginPath(); fx.arc(x, y, 40, 0, 6.3); fx.fill(); };
  ph.addEventListener('pointerdown', (e) => { down = true; fog(e); snd.fx('breath'); if (Math.random() < 0.6) snd.fx('ding'); });
  ph.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse') fog(e); });
  addEventListener('pointerup', () => { down = false; });
  (function tick() {
    requestAnimationFrame(tick); const r = s.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = 'rgba(0,0,0,.025)'; fx.fillRect(0, 0, fc.width, fc.height); fx.globalCompositeOperation = 'source-over';
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    const tilt = sensor.on ? sensor.tiltX : (mouse ? mouse.x : Math.sin(performance.now() / 1600) * 0.4);
    sheen.style.transform = `translateX(${tilt * 40}%)`; img.style.transform = `scale(${1.08 - p * 0.08})`;
  })();
});
// 잠들기
let sleeping = false, sleepAt = 0, sleepIv = 0, palm = false;
const sl = $('#ml-sleep'), slT = $('.ml-sleep-t', sl), slH = $('.ml-sleep-h', sl), h5 = $('#h5'), s4s = $('#s4s');
const inSleepSec = () => { const r = s4s.getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4; };
function sleep(how) {
  if (sleeping) return; sleeping = true; sleepAt = Date.now();
  slH.textContent = t(how === 'palm' ? '손을 떼면 깨어나요' : how === 'face' ? '들어 올리면 깨어나요' : '화면을 누르면 깨어나요');
  sl.hidden = false; slT.textContent = '00:00'; keepAwake(); snd.scene('sleep');
  clearInterval(sleepIv); sleepIv = setInterval(() => {
    const s = Math.floor((Date.now() - sleepAt) / 1000); slT.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (s >= 600) wake();
  }, 1000);
}
function wake() {
  if (!sleeping) return; sleeping = false; clearInterval(sleepIv); sl.hidden = true;
  const s = Math.max(1, Math.floor((Date.now() - sleepAt) / 1000)), m = Math.floor(s / 60);
  h5.textContent = m ? t('{m}분 {s}초 동안 곁에 있었어요', { m, s: s % 60 }) : t('{s}초 동안 곁에 있었어요', { s }); snd.scene('floor'); snd.fx('wake'); beat([20, 100, 20]); mark(4);
}
$('#sleepbtn').onclick = () => { h5.textContent = t('들어 올리면 깨어나요'); setTimeout(() => sleep('btn'), RM ? 0 : 1500); };
sl.addEventListener('pointerdown', () => { if (!palm) wake(); });
sensor.onFaceDown((down) => { if (!inSleepSec() && !sleeping) return; if (down) sleep('face'); else wake(); });
addEventListener('touchstart', (e) => {
  if (!inSleepSec() || sleeping) return;
  const big = [...e.touches].some((t) => (t.radiusX || 0) > 30);
  if (e.touches.length >= 3 || big) { palm = true; sleep('palm'); }
}, { passive: true });
addEventListener('touchend', (e) => { if (palm && e.touches.length === 0) { palm = false; wake(); } }, { passive: true });

// ════════════════ 5 남긴 자국 + 나의 인형 ════════════════
new IntersectionObserver((es) => {
  if (!es[0].isIntersecting) return; const rows = [];
  for (const id of [...WALL, ...SOFA]) { const d = dolls.get(id); if (!d || !d.note) continue; rows.push(`<li><b>${W[id][0]}</b><span>${d.note}</span></li>`); }
  $('#marks').innerHTML = rows.length ? `<ul>${rows.join('')}</ul><p class="sc-lead">${t('당신의 손이 지나간 자리예요. 인형들은 이렇게 사랑받아 왔어요.')}</p>` : `<p class="sc-lead">${t('아직 만진 인형이 없어요. 위로 올라가 한 번 만져 보세요.')}</p>`;
}, { threshold: 0.1 }).observe($('#s5'));
(() => {
  const inp = $('#myname'), tc = $('#tagcv'), x = tc.getContext('2d'), sew = $('#sew'), keep = $('#keep');
  const saved = store.get('valix-muchloved-tag'); if (saved) inp.value = saved;
  const today = new Date(); const ds = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  let prog = 0, holding = false, lastStitch = 0, doneTag = false;
  function draw() {
    x.clearRect(0, 0, 640, 400);
    x.fillStyle = '#f2f0ec'; x.beginPath(); x.roundRect(10, 10, 620, 380, 8); x.fill();
    x.globalAlpha = 0.05; x.fillStyle = '#000'; for (let i = 0; i < 380; i += 3) x.fillRect(10, 10 + i, 620, 1); x.globalAlpha = 1;
    x.fillStyle = '#111'; x.textAlign = 'center';
    x.font = '700 54px Pretendard, sans-serif'; x.fillText(inp.value.trim() || t('이름'), 320, 190);
    x.font = '400 20px Pretendard, sans-serif'; x.fillStyle = '#555'; x.fillText(ds, 320, 240);
    x.font = '700 16px Pretendard, sans-serif'; x.fillText('M U C H   L O V E D', 320, 300);
    const P = [[34, 34], [606, 34], [606, 366], [34, 366], [34, 34]];
    const L = 2 * (572 + 332); let need = prog * L; x.strokeStyle = '#7d7a74'; x.lineWidth = 3; x.setLineDash([12, 9]); x.beginPath(); x.moveTo(34, 34);
    for (let i = 1; i < P.length && need > 0; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i]; const seg = Math.hypot(bx - ax, by - ay), f = Math.min(1, need / seg); x.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); need -= seg; }
    x.stroke(); x.setLineDash([]);
  }
  draw(); inp.addEventListener('input', draw);
  (function tick() {
    requestAnimationFrame(tick);
    if (!holding || doneTag) return; const now = performance.now();
    prog = Math.min(1, prog + 1 / 300); draw();
    if (now - lastStitch > 250) { lastStitch = now; sensor.vibrate(6); snd.fx('stitch'); }
    if (prog >= 1) {
      doneTag = true; holding = false; sew.textContent = t('완성했어요'); sew.disabled = true; beat([20, 80, 20]); snd.fx('chime', [72, 76, 79, 84], 0.18);
      store.set('valix-muchloved-tag', inp.value.trim());
      try { keep.href = tc.toDataURL('image/png'); keep.hidden = false; } catch (e) {}
      mark(5);
    }
  })();
  const on = (e) => { e.preventDefault(); if (!doneTag) holding = true; }, off = () => { holding = false; };
  sew.addEventListener('pointerdown', on); sew.addEventListener('pointerup', off); sew.addEventListener('pointerleave', off); sew.addEventListener('pointercancel', off);
})();

// ════════════════ 6 맺음 · 나가기 ════════════════
new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) mark(6); }), { threshold: 0.3 }).observe($('#s6'));
document.querySelectorAll('.ml-exit').forEach((a) => a.addEventListener('click', (e) => {
  if (IN_FRAME) { e.preventDefault(); try { parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); } catch (err) {} setTimeout(() => (location.href = './'), 600); }
}));
(() => {
  const top = $('.ml-top'); let y0 = scrollY;
  addEventListener('scroll', () => { if (!IS_MOBILE) return; const y = scrollY; if (y < 120) top.classList.remove('hide'); else if (y - y0 > 24) top.classList.add('hide'); else if (y0 - y > 14) top.classList.remove('hide'); y0 = y; }, { passive: true });
})();
// ── 소리: 첫 터치에 켜짐(소리 끄기를 고른 사람은 그대로), 상단 버튼으로 켜고 끄기
const sb = $('#ml-snd');
const sbUI = () => { sb.classList.toggle('on', snd.on); sb.setAttribute('aria-pressed', String(snd.on)); sb.textContent = t(snd.on ? '소리 켜짐' : '소리 꺼짐'); };
sb.addEventListener('click', async (e) => { e.stopPropagation(); if (snd.on) { snd.stop(); try { localStorage.setItem('xpace-sound', 'off'); } catch (err) {} } else { try { localStorage.setItem('xpace-sound', 'on'); } catch (err) {} await snd.start(); snd.scene(['intro', 'wall', 'drawer', 'sofa', 'floor', 'end', 'end'][Math.max(0, cur)] || 'intro'); } sbUI(); });
const firstTouch = async (e) => { if (e.target === sb || snd.on || !snd.allowed()) return; await snd.start(); snd.scene(['intro', 'wall', 'drawer', 'sofa', 'floor', 'end', 'end'][Math.max(0, cur)] || 'intro'); sbUI(); };
addEventListener('pointerdown', firstTouch, true); addEventListener('keydown', firstTouch, true);
sbUI();
document.title = `MUCH LOVED — ${ARTIST} | ARTMOS`;
{ const dm = document.querySelector('meta[name=description]'); if (dm) dm.content = t('닳고 해진 애착 인형을 손끝으로 다시 만나는 온라인 전시. 김규진 《MUCH LOVED》.'); }
langSwitcher($('.ml-top'), { before: sb, cls: 'ml-lang' });
$('.ml-sleep-h').textContent = t('들어 올리면 깨어나요');
if (location.hash === '#debug') window.__ml = { sensor, dolls, get active() { return active; }, tearStep, shakeNow, stamp, measure, resetDoll, hugIds, snd, get cur() { return cur; } };
