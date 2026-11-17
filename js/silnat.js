// 실낱 같은 희망(c007) — 스크롤하면 붉은 실 한 줄이 끊기지 않고 이어지는 단독 페이지.
// 센서 없음. 원작 Take 1·2(작가 허락, 선을 벡터로 옮김)는 숨 쉬고 고개를 든다.
import { sceneSVG, SCENES, redThread, curve, loop } from './silnat-art.js?v=2';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IN_FRAME = window !== window.top;
const $ = (s, el = document) => el.querySelector(s);

// ───────── 글(가상의 인물 · 전시 문안) ─────────
const PEOPLE = [
  { id: 'cart', no: '하나', time: '새벽 네 시의 리어카', who: '정옥', age: 71, body: [
    '새벽 네 시, 정옥 씨의 하루는 리어카 바퀴 소리로 시작됩니다.',
    '골목마다 내놓인 상자를 접어 싣고, 고물상 저울에 올립니다. 그날 번 돈은 두 딸의 밥값이 됩니다.',
    '정옥 씨는 오늘도 저녁을 건너뜁니다. 리어카 손잡이에는 작은딸이 두고 간 머리끈이 묶여 있습니다.'] },
  { id: 'boxes', no: '둘', time: '밤 열한 시의 편의점', who: '민재', age: 24, body: [
    '민재 씨는 밤새 편의점을 지킵니다.',
    '새벽이 가까워지면 빈 상자를 하나씩 접어 문 옆에 쌓아 둡니다. 누가 가져가는지는 정확히 모릅니다.',
    '다만 아침이면 상자가 없어져 있고, 가끔 문 앞에 사탕 한 알이 놓여 있습니다.'] },
  { id: 'scarf', no: '셋', time: '첫차', who: '영호', age: 58, body: [
    '영호 씨는 첫차를 몹니다. 정류장마다 같은 얼굴들이 같은 자리에 앉습니다.',
    '일을 마치면 요양병원에 들러, 이제 영호 씨를 잘 알아보지 못하는 아내 곁에 앉습니다.',
    '그리고 목도리를 뜹니다. 하루에 한 줄씩. 겨울이 오기 전에 끝내려고요.'] },
  { id: 'phone', no: '넷', time: '오후의 영상통화', who: '란', age: 31, body: [
    '란 씨는 영호 씨 버스의 단골입니다. 맨 뒷자리 창가에서 늘 졸다가 내립니다.',
    '공장 쉬는 시간, 란 씨는 휴대폰 화면 속 딸과 이야기합니다.',
    '손목의 실 팔찌는 떠나오던 날 딸이 묶어 주었습니다. “엄마, 이거 풀리면 오는 거야.” 팔찌는 아직 단단합니다.'] },
  { id: 'door', no: '다섯', time: '문고리의 봉지', who: '서윤', age: 22, body: [
    '서윤 씨는 며칠째 방 밖으로 나가지 못했습니다. 이유를 설명하기도 어렵습니다.',
    '저녁마다 문고리가 조금 흔들리고, 발소리가 멀어집니다. 문을 열면 반찬 봉지가 걸려 있습니다.',
    '붉은 끈으로 단단히 묶은 매듭. 옆집 할머니의 매듭입니다.'] },
];

// ───────── 원작 선(벡터) 불러오기 ─────────
async function inkPath(name) {
  const t = await (await fetch(`assets/silnat/${name}-ink.svg?v=1`)).text();
  return t.match(/ d="([^"]+)"/)[1];
}
const T1_SHIFT = [-46, 32];           // Take 1 인물을 Take 2 인물 자리에 맞춤(628×656 기준)
const FIG1 = '88,250 230,240 345,255 380,380 378,562 86,562 76,400';     // Take 1 인물 둘레(676×650)
const FIG2 = '52,282 196,272 318,296 334,420 326,592 56,596 40,450';     // Take 2 인물 둘레
const STUB = [[531, 548], [534, 532], [529, 521], [533, 512]];             // Take 2의 붉은 실

function takeDefs(d1, d2) {
  return `<defs>
<path id="t1ink" d="${d1}" fill="#151413" fill-rule="evenodd"/>
<path id="t2ink" d="${d2}" fill="#151413" fill-rule="evenodd"/>
<clipPath id="c-fig1"><polygon points="${FIG1}"/></clipPath>
<clipPath id="c-fig2"><polygon points="${FIG2}"/></clipPath>
<mask id="m-room1" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="900"><rect x="-100" y="-100" width="900" height="900" fill="#fff"/><polygon points="${FIG1}" fill="#000"/></mask>
<mask id="m-room2" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="900"><rect x="-100" y="-100" width="900" height="900" fill="#fff"/><polygon points="${FIG2}" fill="#000"/></mask>
<filter id="sl-soft"><feGaussianBlur stdDeviation="1"/></filter>
<filter id="pp"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .52  0 0 0 0 .47  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs>`;
}
// 방(가만히) + 인물(숨 쉼)
const takeGroup = (n, id, extra = '') =>
  `<g id="${id}" ${extra}><use href="#t${n}ink" mask="url(#m-room${n})"/>` +
  `<g class="fig" clip-path="url(#c-fig${n})"><g class="breathe"><use href="#t${n}ink"/></g></g></g>`;
const paper = (w, h) => `<rect width="${w}" height="${h}" fill="#F3F0E8"/><rect width="${w}" height="${h}" filter="url(#pp)"/>`;

// ───────── 페이지 만들기 ─────────
const story = $('#story');
function build(d1, d2) {
  const persons = PEOPLE.map((p) => `
<section class="sl-person" data-scene="${p.id}">
  <div class="art">${sceneSVG(p.id, { noRed: true, label: `${p.time} — ${p.who}` })}</div>
  <div class="card reveal">
    <p class="no">${p.no} · ${p.time}</p>
    <h2>${p.who}<small>${p.age}</small></h2>
    ${p.body.map((t) => `<p>${t}</p>`).join('')}
  </div>
</section>`).join('');
  story.innerHTML = `
<section class="sl-hero alive" id="hero">
  <div class="stick">
    <div class="intro"><h1>실낱 같은 희망</h1><p class="by">김바늘 · 혼합매체 · 섬유미술</p><p class="hint">천천히 내려 보세요</p></div>
    <svg class="take" id="heroSvg" viewBox="0 0 628 656" role="img" aria-label="김바늘, 실낱 같은 희망 Take 1·2. 방 한구석에 웅크린 사람이 고개를 들어 붉은 실을 본다.">
      ${takeDefs(d1, d2)}${paper(628, 656)}
      <clipPath id="c-in"><rect id="inRect" x="0" y="0" width="628" height="0"/></clipPath>
      <g clip-path="url(#c-in)">
        <g id="h1" transform="translate(${T1_SHIFT})">${takeGroup(1, 'h1in')}</g>
        <g id="h2" opacity="0">${takeGroup(2, 'h2in')}</g>
      </g>
      <g id="stub" opacity="0">${redThread(STUB, 3, { width: 2.4 })}</g>
    </svg>
    <div class="cap">
      <p data-cap="1">흰 종이 위, 방 한구석.<br>한 사람이 무릎을 안고 앉아 있습니다.</p>
      <p data-cap="2">그러다, 고개를 듭니다.</p>
      <p data-cap="3">저기, 붉은 실 한 가닥.</p>
    </div>
  </div>
</section>
${persons}
<section class="sl-return alive" id="ret">
  <svg class="take" id="retSvg" viewBox="0 0 628 656" role="img" aria-label="다시 그 방. 붉은 실이 웅크린 사람의 발치에 닿는다.">
    ${paper(628, 656)}${takeGroup(2, 'r2')}<g id="knot"></g>
  </svg>
  <div class="card reveal">
    <p class="no">다시, 그 방</p>
    <p>실은 문틈으로 들어가, 방 한구석에 닿습니다.</p>
    <p>실낱 같은 희망은 크지 않습니다.<br>다만 끊기지 않을 뿐입니다.</p>
    <button class="knot-btn" type="button">실 끝에 매듭 짓기</button>
  </div>
</section>
<section class="sl-blank">
  <div class="row">${[1, 2, 3].map((i) => `<div>${sceneSVG('blank', { label: `Take ${i + 2}, 아직 수놓이지 않음` })}</div>`).join('')}</div>
  <div class="card reveal"><p class="no">TAKE 3 · 4 · 5</p><h2>아직 수놓이지 않은 장</h2>
    <p>《실낱 같은 희망》은 다섯 점으로 이어지는 연작입니다. 나머지 세 점은 작가가 지금 수놓고 있습니다.</p></div>
</section>
<section class="sl-part2">
  <div class="works">
    <figure><svg viewBox="0 0 676 650" role="img" aria-label="Take 1">${paper(676, 650)}<use href="#t1ink"/></svg><figcaption>Take 1</figcaption></figure>
    <figure><svg viewBox="0 0 628 656" role="img" aria-label="Take 2">${paper(628, 656)}<use href="#t2ink"/>${redThread(STUB, 3, { width: 2.4, flat: true })}</svg><figcaption>Take 2</figcaption></figure>
  </div>
  <div class="card reveal">
    <p class="no">PART 2 · 작품과 작가</p>
    <h2>김바늘 《실낱 같은 희망》</h2>
    <p>흰 종이 위에 바늘과 실로 선을 수놓습니다. 다섯 점으로 이어지는 연작 가운데 첫 두 점입니다. 구상과 시놉시스부터 한 땀 한 땀의 실, 마지막 액자 작업까지 작가가 직접 했습니다.</p>
    <p>[작가 노트 — 작가에게 받을 예정]</p>
    <dl><dt>작가</dt><dd>김바늘 · 혼합매체, 섬유미술</dd><dt>재료</dt><dd>종이에 실 [확인 필요]</dd><dt>연작</dt><dd>Take 1 · Take 2 (5점 중 2점)</dd></dl>
    <p class="note">© 김바늘. 작품 이미지는 작가의 허락을 받아 사용했고, 화면의 선은 원작 사진을 옮긴 것입니다. 다섯 사람의 장면 그림은 작가의 허락을 받은 전시용 일러스트이고, 다섯 사람은 가상의 인물입니다(전시 문안).</p>
  </div>
</section>
<section class="sl-end">
  <p>오늘, 당신의 실은<br>어디에 묶여 있나요.</p>
  <a class="sl-back" href="./">전시 행성 나가기</a>
  <p class="help">마음이 힘들 때는 자살예방 상담전화 <b>109</b>(24시간),<br>카카오톡·문자 상담 ‘마들랜’에서 이야기를 들어 줍니다.</p>
</section>`;
}

// ───────── 붉은 실 한 줄 ─────────
const th = $('#thread');
let PATH = null; // { pts, len[], ey[], total }
let shown = 0, needle = null;

const pageBox = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
const mapVB = (box, vb, [x, y]) => [box.x + (x - vb[0]) / vb[2] * box.w, box.y + (y - vb[1]) / vb[3] * box.h];

function route(a, b, gapY, L, R) {
  // a에서 가까운 가장자리로 나가 세로로 내려가고, 장면 사이 빈 곳(gapY)에서만 건너가 b로 들어감
  const ea = a[0] < (L + R) / 2 ? L : R, eb = b[0] < (L + R) / 2 ? L : R;
  const pts = [a, [ea + (a[0] > ea ? 6 : -6), a[1] + 36], [ea, Math.min(gapY - 60, Math.max(a[1] + 80, gapY - 60))]];
  if (ea !== eb) pts.push([(ea + eb) / 2 + (eb > ea ? -20 : 20), gapY + 6], [eb, gapY + 60]);
  pts.push([eb, Math.max(gapY + 100, b[1] - 50)], b);
  return curve(pts, 16).slice(1);
}

function buildThread() {
  const W = document.documentElement.clientWidth, vh = innerHeight;
  const hero = $('#hero'), stick = $('.stick', hero), svg = $('#heroSvg');
  const hb = pageBox(hero), sb = svg.getBoundingClientRect(), kb = stick.getBoundingClientRect();
  // 스티키가 끝날 때의 원작 위치
  const heroSvgBox = { x: sb.left + scrollX, y: hb.y + hb.h - vh + (sb.top - kb.top), w: sb.width, h: sb.height };
  const VB = [0, 0, 628, 656];
  const edges = (el) => { const bx = pageBox(el); return [Math.max(12, bx.x - 22), Math.min(W - 12, bx.x + bx.w + 22)]; };
  let pts = [mapVB(heroSvgBox, VB, STUB[0]), mapVB(heroSvgBox, VB, [560, 600]), mapVB(heroSvgBox, VB, [628, 640])];
  for (const sec of document.querySelectorAll('.sl-person')) {
    const art = $('.art svg', sec), box = pageBox(art), vb = [-60, -60, 1120, 1120];
    const [L, R] = edges(art);
    const sp = SCENES[sec.dataset.scene]().red.map((p) => mapVB(box, vb, p)).map(([x, y]) => [Math.max(L, Math.min(R, x)), y]);
    const gapY = pageBox(sec).y + innerHeight * .08;
    pts.push(...route(pts[pts.length - 1], sp[0], gapY, L, R), ...sp.slice(1));
  }
  // 다시 그 방: 오른쪽 구석으로 들어와 발치까지
  const retSvg = $('#retSvg'), rb = pageBox(retSvg), [L, R] = edges(retSvg);
  const into = [[640, 470], [600, 520], [531, 548], [470, 575], [400, 584], [338, 580]].map((p) => mapVB(rb, VB, p));
  into[0][0] = Math.min(R, into[0][0]);
  pts.push(...route(pts[pts.length - 1], into[0], pageBox($('#ret')).y + innerHeight * .08, L, R), ...curve(into, 10).slice(1));
  // 길이와 '나타날 높이'(가로로 가거나 감길 때는 조금 늦게 = 그 자리에 머묾)
  const len = [0], ey = [pts[0][1]];
  for (let i = 1; i < pts.length; i++) {
    const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    len.push(len[i - 1] + s);
    ey.push(Math.max(ey[i - 1] + s * .3, pts[i][1]));
  }
  PATH = { pts, len, ey, total: len[len.length - 1], end: pts[pts.length - 1] };
  const H = document.documentElement.scrollHeight;
  PATH.W = W;
  // 실을 짧은 조각으로 나눠, 화면에 보이는 조각만 그리고 바늘이 지나는 조각에만 가림막(mask)을 씀
  const chunks = [];
  for (let i = 0; i < pts.length - 1;) {
    let j = i + 1; while (j < pts.length - 1 && len[j] - len[i] < 280) j++;
    const seg = pts.slice(i, j + 1), ys = seg.map((q) => q[1]);
    chunks.push({ i, j, L0: len[i], L1: len[j], y0: Math.min(...ys) - 40, y1: Math.max(...ys) + 40, seg });
    i = j;
  }
  // 조각마다 작은 SVG를 제자리에 둠 → 스크롤할 때는 다시 그리지 않고 옮기기만 함
  th.style.height = document.documentElement.scrollHeight + 'px';
  th.innerHTML = chunks.map((c, k) => {
    const d = 'M' + c.seg.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L'), L = c.L1 - c.L0, h = c.y1 - c.y0;
    return `<svg class="ch" style="top:${c.y0.toFixed(0)}px;height:${h.toFixed(0)}px;display:none" viewBox="0 ${c.y0.toFixed(0)} ${W} ${h.toFixed(0)}" width="${W}" height="${h.toFixed(0)}">` +
      `<defs><mask id="rv${k}" maskUnits="userSpaceOnUse" x="0" y="${c.y0}" width="${W}" height="${h}"><path d="${d}" stroke="#fff" stroke-width="28" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${L.toFixed(1)} ${(L + 60).toFixed(1)}" stroke-dashoffset="${L.toFixed(1)}"/></mask></defs>` +
      `<g>${redThread(c.seg, 11 + k, { width: 4, flat: true })}</g></svg>`;
  }).join('') + `<svg id="needle" class="needle" viewBox="-32 -8 46 16" width="46" height="16" style="opacity:0"><path d="M-30 0 L6 0" stroke="#8a8580" stroke-width="2" stroke-linecap="round"/><ellipse cx="-24" cy="0" rx="4" ry="1.6" fill="none" stroke="#8a8580" stroke-width="1.2"/><path d="M6 0 L12 0" stroke="#b9b4ae" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  const svgs = th.querySelectorAll('svg.ch');
  chunks.forEach((c, k) => { c.svg = svgs[k]; c.g = svgs[k].querySelector('g'); c.m = svgs[k].querySelector('mask path'); c.k = k; c.state = ''; });
  PATH.chunks = chunks;
  needle = $('#needle', th);
  shown = Math.min(shown, PATH.total);
}

function targetLen() {
  const t = scrollY + innerHeight * .64;
  const { ey, len } = PATH;
  if (t <= ey[0]) return 0;
  let lo = 0, hi = ey.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ey[m] <= t) lo = m; else hi = m - 1; }
  if (lo >= ey.length - 1) return PATH.total;
  const f = (t - ey[lo]) / Math.max(1, ey[lo + 1] - ey[lo]);
  return len[lo] + (len[lo + 1] - len[lo]) * Math.min(1, f);
}
function pointAt(L) {
  const { len, pts } = PATH;
  let lo = 0, hi = len.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (len[m] <= L) lo = m; else hi = m - 1; }
  const a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)];
  const f = (L - len[lo]) / Math.max(.001, (len[lo + 1] ?? len[lo]) - len[lo]);
  return [a[0] + (b[0] - a[0]) * Math.min(1, f), a[1] + (b[1] - a[1]) * Math.min(1, f), Math.atan2(b[1] - a[1], b[0] - a[0])];
}

// ───────── 첫 장면(스크롤 진행도) ─────────
const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
function heroFrame() {
  const hero = $('#hero'); if (!hero) return;
  const r = hero.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
  $('.intro', hero).style.opacity = String(1 - ease((p - .06) / .08));
  $('#inRect').setAttribute('height', String(656 * ease((p - .04) / .14)));
  const t = ease((p - .44) / .14);
  $('#h1').setAttribute('transform', `translate(${T1_SHIFT[0]} ${T1_SHIFT[1] - 6 * t})`);
  $('#h1').setAttribute('opacity', String(1 - t));
  $('#h2').setAttribute('transform', `translate(0 ${6 * (1 - t)})`);
  $('#h2').setAttribute('opacity', String(t));
  $('#stub').setAttribute('opacity', String(ease((p - .66) / .1)));
  const cap = p < .12 ? 0 : p < .4 ? 1 : p < .5 ? 0 : p < .7 ? 2 : 3;
  hero.querySelectorAll('.cap p').forEach((el) => el.classList.toggle('on', +el.dataset.cap === cap));
}

// ───────── 소리(아주 작게, 끌 수 있음) ─────────
let ac = null, rustle = null;
function soundOn() {
  if (ac) { ac.resume(); return; }
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .7;
  rustle = ac.createGain(); rustle.gain.value = 0;
  src.connect(bp).connect(rustle).connect(ac.destination); src.start();
}
function pluck() {
  if (!ac || ac.state !== 'running') return;
  const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
  o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(140, now + .4);
  g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.12, now + .01); g.gain.exponentialRampToValueAtTime(.0001, now + .6);
  o.connect(g).connect(ac.destination); o.start(now); o.stop(now + .7);
}
const sndBtn = $('.sl-snd');
let sndOn = false;
sndBtn.addEventListener('click', () => {
  sndOn = !sndOn; sndBtn.setAttribute('aria-pressed', String(sndOn)); sndBtn.textContent = sndOn ? '소리 끄기' : '소리 켜기';
  if (sndOn) soundOn(); else if (ac) ac.suspend();
});
document.addEventListener('visibilitychange', () => { if (ac && sndOn) document.hidden ? ac.suspend() : ac.resume(); });

// ───────── 매 프레임 ─────────
let lastY = scrollY, ticking = false;
function frame() {
  ticking = false;
  heroFrame();
  if (!PATH) return;
  const target = targetLen();
  shown += (target - shown) * (RM ? 1 : .18);
  if (Math.abs(target - shown) < .5) shown = target;
  const top = scrollY - 60, bot = scrollY + innerHeight + 60;
  for (const c of PATH.chunks) {
    const vis = shown > c.L0 && c.y1 > top && c.y0 < bot;
    const st = !vis ? 'off' : shown >= c.L1 ? 'full' : 'part';
    if (st !== c.state) {
      c.svg.style.display = st === 'off' ? 'none' : '';
      if (st === 'part') c.g.setAttribute('mask', `url(#rv${c.k})`); else c.g.removeAttribute('mask');
      c.state = st;
    }
    if (st === 'part') c.m.setAttribute('stroke-dashoffset', String((c.L1 - c.L0) - (shown - c.L0)));
  }
  const [x, y, a] = pointAt(shown);
  needle.style.opacity = shown > 2 && shown < PATH.total - 2 ? '1' : '0';
  needle.style.transform = `translate(${(x - 32).toFixed(1)}px, ${(y - 8).toFixed(1)}px) rotate(${(a * 180 / Math.PI).toFixed(1)}deg)`;
  if (rustle && sndOn) { const v = Math.min(1, Math.abs(scrollY - lastY) / 40); rustle.gain.setTargetAtTime(v * .035, ac.currentTime, .05); }
  lastY = scrollY;
  if (Math.abs(target - shown) > .5) request();
}
const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
addEventListener('scroll', request, { passive: true });

let lastW = 0, rt = 0;
addEventListener('resize', () => {
  const w = document.documentElement.clientWidth;
  if (w === lastW) return; // 주소창 때문에 높이만 바뀌면 무시
  lastW = w; clearTimeout(rt); rt = setTimeout(() => { buildThread(); request(); }, 150);
});

// ───────── 시작 ─────────
(async () => {
  const [d1, d2] = await Promise.all([inkPath('take1'), inkPath('take2')]);
  build(d1, d2);
  lastW = document.documentElement.clientWidth;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  buildThread(); frame();
  if (document.fonts) document.fonts.ready.then(() => { buildThread(); request(); });
  // 글 나타나기
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  // 화면 밖 원작은 숨 쉬기를 멈춤
  const live = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('alive', e.isIntersecting && !RM)));
  document.querySelectorAll('.sl-hero, .sl-return').forEach((el) => live.observe(el));
  // 매듭
  const kb = $('.knot-btn');
  kb.addEventListener('click', () => {
    kb.disabled = true; kb.textContent = '매듭을 지었어요';
    $('#knot').innerHTML = redThread(loop(338, 578, 6, 4, 1.4, 0, 30), 21, { width: 2.6, flat: true });
    pluck();
  });
  // 나가기
  document.querySelectorAll('.sl-back').forEach((a) => a.addEventListener('click', (e) => {
    if (IN_FRAME) { e.preventDefault(); try { parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); } catch (err) {} setTimeout(() => (location.href = './'), 600); }
  }));
})();
