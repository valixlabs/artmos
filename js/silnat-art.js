// 실낱 같은 희망(c007) — 장면 그림 생성기
// 종이 위 검은 실 스케치(백스티치) + 진짜 실처럼 보이는 붉은 실.
// 이미지 파일 없이 SVG 문자열을 만든다. 인물은 그리지 않는다(작가 원작만 사용).

const W = 1000, H = 1000;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 점 목록을 잘게 나누고 손 떨림을 더함
function wobble(pts, r, amp = 1.6, step = 14) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([x1 + (x2 - x1) * t + (r() - .5) * amp, y1 + (y2 - y1) * t + (r() - .5) * amp]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const fmt = (p) => p.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join('');

// 부드러운 곡선(Catmull-Rom → 점)
export function curve(pts, seg = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// 검은 실: 땀이 보이는 백스티치(땀 사이 아주 작은 틈 + 바늘구멍)
function blackStitch(pts, r, w = 2.4) {
  const p = wobble(pts, r, 1.4, 9);
  let segs = '', holes = '';
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[i + 1];
    const g = .12; // 땀 사이 틈
    const ax = x1 + (x2 - x1) * g, ay = y1 + (y2 - y1) * g;
    segs += `M${ax.toFixed(1)} ${ay.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    if (r() < .35) holes += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r=".9"/>`;
  }
  const ww = w * (.85 + r() * .3);
  // 실 한 가닥: 굵은 결 + 살짝 비낀 둘째 가닥(옅게) + 위쪽 윤기
  const off = (.5 + r() * .7).toFixed(2);
  return `<path d="${segs}" stroke-width="${ww.toFixed(2)}"/>` +
    `<path d="${segs}" stroke-width="${(ww * .55).toFixed(2)}" opacity=".35" transform="translate(${off} ${(-off * .6).toFixed(2)})"/>` +
    `<path d="${segs}" stroke="#6d6660" stroke-width="${(ww * .25).toFixed(2)}" opacity=".5" transform="translate(-.4 -.5)"/>` +
    `<g class="holes">${holes}</g>`;
}

// 빗금(그림자): 짧은 실 땀 여러 개
function hatch(x, y, w, h, ang, gap, r, len = 1) {
  const lines = [];
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = -Math.max(w, h); i < Math.max(w, h) * 2; i += gap) {
    const x1 = x + i, y1 = y + h, x2 = x1 + c * h * len * 1.4, y2 = y1 - s * h * len * 1.4;
    const k = .55 + r() * .45;
    lines.push([[x1, y1], [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]]);
  }
  // 상자 안으로 자르기
  const clip = (pt) => [Math.min(x + w, Math.max(x, pt[0])), Math.min(y + h, Math.max(y, pt[1]))];
  return lines.map((l) => [clip(l[0]), clip(l[1])]).filter(([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 6);
}

// 붉은 실: 두 가닥 꼬임 + 보풀 + 종이 위 그림자
export function redThread(pts, seed = 7, opt = {}) {
  const r = rng(seed);
  const w = opt.width || 4.2;
  const p = wobble(pts, r, .8, 6);
  const d = fmt(p);
  // 꼬임 무늬: 실 굵기만큼 비스듬한 짧은 빗금
  let twist = '', fuzz = '';
  let acc = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1); if (!len) continue;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
    for (let t = (acc ? 0 : 0); t < len; t += w * .95) {
      const cx = x1 + ux * t, cy = y1 + uy * t;
      const a = [cx + nx * w * .5 - ux * w * .35, cy + ny * w * .5 - uy * w * .35];
      const b = [cx - nx * w * .5 + ux * w * .35, cy - ny * w * .5 + uy * w * .35];
      twist += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      if (r() < .09) { // 보풀
        const s = r() < .5 ? 1 : -1, l = 3 + r() * 6;
        const fx = cx + nx * s * w * .5, fy = cy + ny * s * w * .5;
        fuzz += `M${fx.toFixed(1)} ${fy.toFixed(1)}q${(nx * s * l * .6 + ux * l * .5).toFixed(1)} ${(ny * s * l * .6 + uy * l * .5).toFixed(1)} ${(nx * s * l + ux * (r() - .3) * l).toFixed(1)} ${(ny * s * l + uy * (r() - .3) * l).toFixed(1)}`;
      }
    }
  }
  return `<g class="red-thread">
<path d="${d}" stroke="#3a1a14" stroke-opacity=".28" stroke-width="${w + 1.6}" transform="translate(2.2 3)" filter="url(#sl-soft)" fill="none" stroke-linecap="round"/>
<path d="${d}" stroke="#7d1512" stroke-width="${w + .6}" fill="none" stroke-linecap="round"/>
<path d="${d}" stroke="#b3231c" stroke-width="${w - .4}" fill="none" stroke-linecap="round"/>
<path d="${twist}" stroke="#6e100d" stroke-width="${(w * .32).toFixed(2)}" fill="none" stroke-linecap="round" opacity=".85"/>
<path d="${d}" stroke="#e0584c" stroke-width="${(w * .22).toFixed(2)}" fill="none" stroke-linecap="round" stroke-dasharray="${(w * .5).toFixed(1)} ${(w * .45).toFixed(1)}" opacity=".7" transform="translate(-.6 -.8)"/>
<path d="${fuzz}" stroke="#b3231c" stroke-width=".7" fill="none" stroke-linecap="round" opacity=".8"/>
</g>`;
}

// 고리(감기): 중심 둘레를 한 바퀴 감는 점 목록
export function loop(cx, cy, rx, ry, turns = 1.15, start = -Math.PI / 2, n = 40) {
  const pts = [];
  for (let i = 0; i <= n * turns; i++) {
    const a = start + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry + i * .25]);
  }
  return pts;
}

// 원작처럼 방 모서리 선
const roomCorner = [
  [[150, 60], [150, 640]], [[150, 640], [40, 760]], [[150, 640], [940, 640]],
];

// ───────── 장면 정의: lines(검은 실), hatch(그림자), red(붉은 실 점 목록) ─────────
function ellipse(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 36) {
  const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}

export const SCENES = {
  // 정옥: 리어카와 접힌 상자, 손잡이에 묶인 머리끈
  cart: () => {
    const L = [...roomCorner];
    // 수레 몸통
    L.push([[300, 470], [700, 450], [710, 560], [310, 580], [300, 470]]);
    L.push([[700, 450], [760, 430], [770, 535], [710, 560]]);
    L.push([[300, 470], [360, 440], [760, 430]]);
    // 쌓인 상자(납작)
    L.push([[330, 470], [350, 380], [690, 365], [700, 450]]);
    L.push([[350, 380], [400, 340], [720, 330], [690, 365]]);
    L.push([[720, 330], [740, 420], [700, 450]]);
    L.push([[360, 420], [690, 405]]); L.push([[340, 445], [695, 430]]);
    // 바퀴
    L.push(ellipse(420, 600, 52, 52)); L.push(ellipse(420, 600, 10, 10));
    L.push(ellipse(660, 590, 52, 52)); L.push(ellipse(660, 590, 10, 10));
    for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; L.push([[420, 600], [420 + Math.cos(t) * 50, 600 + Math.sin(t) * 50]]); L.push([[660, 590], [660 + Math.cos(t) * 50, 590 + Math.sin(t) * 50]]); }
    // 손잡이
    L.push([[310, 520], [190, 540], [150, 548]]); L.push([[315, 555], [195, 575], [155, 580]]);
    L.push([[150, 548], [155, 580]]);
    const hz = [...hatch(310, 540, 400, 40, .9, 7, rng(3))];
    // 붉은 실: 위에서 내려와 손잡이를 감고(머리끈) 오른쪽으로 나감
    const red = [...curve([[-20, 300], [80, 420], [175, 515]]), ...loop(178, 560, 14, 26, 1.6, -Math.PI / 2), ...curve([[180, 590], [260, 700], [600, 760], [1020, 720]])];
    return { L, hz, red };
  },
  // 민재: 편의점 유리문 옆, 끈으로 묶은 접힌 상자 더미
  boxes: () => {
    const L = [[[100, 60], [100, 760]], [[100, 760], [960, 760]]];
    // 유리문
    L.push([[160, 90], [480, 90], [480, 760]]); L.push([[160, 90], [160, 760]]);
    L.push([[190, 120], [450, 120], [450, 730], [190, 730], [190, 120]]);
    L.push([[425, 400], [425, 470]]);
    L.push([[220, 160], [300, 260]]); L.push([[240, 150], [330, 260]]);
    // 상자 더미(4장)
    for (let i = 0; i < 4; i++) {
      const y = 700 - i * 34, x = 560 + (i % 2) * 8;
      L.push([[x, y], [x + 300, y - 6], [x + 302, y + 24], [x + 2, y + 30], [x, y]]);
      L.push([[x + 150, y - 3], [x + 151, y + 27]]);
    }
    const hz = hatch(565, 735, 300, 22, .7, 7, rng(5));
    // 붉은 실: 더미를 세로로 한 바퀴 묶고 매듭
    const red = [...curve([[-20, 520], [300, 600], [520, 560], [705, 568]]),
      [705, 568], [708, 752], [712, 760], [716, 752], [713, 590],
      ...curve([[713, 590], [690, 560], [740, 540], [760, 575], [720, 585]]),
      ...curve([[720, 585], [800, 640], [1020, 610]])];
    return { L, hz, red };
  },
  // 영호: 버스 창가 좌석의 뜨개 중인 목도리와 바늘, 털실이 이어짐
  scarf: () => {
    const L = [];
    // 버스 창과 좌석
    L.push([[80, 80], [920, 80], [920, 380], [80, 380], [80, 80]]);
    L.push([[500, 80], [500, 380]]); L.push([[95, 360], [905, 360]]);
    L.push([[120, 470], [880, 470], [900, 720], [100, 720], [120, 470]]);
    L.push([[100, 720], [100, 800]]); L.push([[900, 720], [900, 800]]);
    L.push([[140, 380], [140, 470]]); L.push([[860, 380], [860, 470]]);
    // 목도리(스케치, 겉뜨기 V무늬)
    const sx = 260, sy = 540, sw = 380, sh = 110;
    L.push([[sx, sy], [sx + sw, sy - 20], [sx + sw + 10, sy + sh - 20], [sx + 5, sy + sh], [sx, sy]]);
    for (let row = 0; row < 5; row++) for (let c = 0; c < 15; c++) {
      const x = sx + 14 + c * 24, y = sy + 14 + row * 19 - c * 1.3;
      L.push([[x, y], [x + 7, y + 12], [x + 14, y]]);
    }
    // 술
    for (let i = 0; i < 8; i++) L.push([[sx + 2 + i * 1, sy + 8 + i * 13], [sx - 30 - (i % 3) * 6, sy + 12 + i * 13]]);
    // 뜨개바늘 두 개
    L.push([[600, 470], [720, 640]]); L.push([[640, 470], [690, 650]]);
    L.push(ellipse(600, 466, 6, 6)); L.push(ellipse(640, 466, 6, 6));
    const hz = hatch(110, 690, 790, 28, .6, 8, rng(9));
    // 붉은 털실: 굵게, 바늘 끝에서 나와 아래로 늘어지며 다음으로
    const red = [...curve([[-20, 430], [200, 440], [450, 470], [636, 548]]),
      ...curve([[636, 548], [680, 640], [720, 760], [850, 860], [1020, 840]])];
    return { L, hz, red, width: 6.5 };
  },
  // 란: 공장 휴게 의자 위 휴대폰(빛만), 옆에 실 팔찌
  phone: () => {
    const L = [[[60, 640], [960, 640]], [[700, 60], [700, 640]]];
    // 등 없는 의자
    L.push([[250, 520], [610, 520], [640, 560], [230, 560], [250, 520]]);
    L.push([[260, 560], [250, 760]]); L.push([[610, 560], [620, 760]]);
    L.push([[300, 560], [295, 700]]); L.push([[570, 560], [575, 700]]);
    // 휴대폰
    L.push([[340, 500], [470, 480], [490, 510], [358, 532], [340, 500]]);
    L.push([[352, 503], [466, 486], [480, 508], [364, 525], [352, 503]]);
    // 빛(점선 몇 줄)
    for (let i = 0; i < 6; i++) L.push([[410 + i * 4, 470 - i * 6], [395 + i * 14, 380 - i * 10]]);
    // 창(공장 높은 창)
    L.push([[760, 120], [920, 120], [920, 300], [760, 300], [760, 120]]); L.push([[840, 120], [840, 300]]);
    const hz = hatch(230, 560, 410, 40, .8, 7, rng(11));
    // 붉은 실: 의자 위 팔찌 고리를 만들고 창 밖 먼 곳까지 뻗었다 돌아옴
    const red = [...curve([[-20, 420], [180, 470], [520, 512]]), ...loop(560, 505, 34, 12, 1.25, Math.PI),
      ...curve([[575, 515], [680, 430], [780, 300], [825, 270], [810, 420], [860, 600], [1020, 600]])];
    return { L, hz, red };
  },
  // 서윤: 닫힌 문, 문고리에 걸린 반찬 봉지(붉은 끈으로 묶음)
  door: () => {
    const L = [[[60, 820], [960, 820]]];
    L.push([[280, 60], [720, 60], [720, 820]]); L.push([[280, 60], [280, 820]]);
    L.push([[310, 90], [690, 90], [690, 820]]); L.push([[310, 90], [310, 820]]);
    // 문고리
    L.push(ellipse(640, 470, 18, 18)); L.push([[640, 470], [600, 472]]);
    // 봉지(부드러운 비닐)
    L.push(curve([[612, 500], [585, 560], [570, 650], [600, 720], [660, 728], [700, 690], [705, 610], [680, 545], [652, 500]], 8));
    L.push(curve([[598, 600], [620, 640], [612, 690]], 8)); L.push(curve([[680, 600], [672, 660]], 8));
    L.push(curve([[612, 500], [622, 482], [640, 470]], 6)); L.push(curve([[652, 500], [650, 482], [640, 470]], 6));
    // 문 아래 틈
    L.push([[312, 812], [688, 812]]);
    const hz = [...hatch(312, 790, 376, 22, 0.5, 9, rng(13), .4), ...hatch(720, 60, 40, 760, 1.2, 14, rng(14))];
    // 붉은 실: 봉지 목을 감아 묶고, 아래로 내려와 문틈으로 들어감
    const red = [...curve([[-20, 380], [300, 430], [600, 500]]), ...loop(632, 505, 26, 9, 1.3, Math.PI),
      ...curve([[650, 520], [720, 640], [640, 790], [500, 812], [420, 816]])];
    return { L, hz, red };
  },
  // 아직 수놓이지 않은 장: 바늘구멍만
  blank: () => {
    const r = rng(17), L = [], holes = [];
    for (let i = 0; i < 90; i++) holes.push([120 + r() * 760, 120 + r() * 760]);
    return { L, hz: [], red: null, holes };
  },
};

// 액자(흰 매트) + 종이 질감 + 장면
export function sceneSVG(name, opt = {}) {
  const s = SCENES[name](); const r = rng(name.length * 97 + 3);
  const ink = s.L.map((pl) => blackStitch(pl, r)).join('');
  const hz = (s.hz || []).map((pl) => blackStitch(pl, r, 1.2)).join('');
  const holes = (s.holes || []).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6"/>`).join('');
  const red = s.red && !opt.noRed ? redThread(s.red, name.length * 13, { width: s.width }) : '';
  const label = opt.label ? ` aria-label="${opt.label}"` : '';
  return `<svg viewBox="-60 -60 1120 1120" xmlns="http://www.w3.org/2000/svg" role="img"${label}>
<defs>
<filter id="sl-paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .52  0 0 0 0 .47  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="sl-soft"><feGaussianBlur stdDeviation="1.6"/></filter>
</defs>
<rect x="-60" y="-60" width="1120" height="1120" fill="#ECEAE4"/>
<rect x="-14" y="-14" width="1028" height="1028" fill="#d9d5cc"/>
<rect x="0" y="0" width="1000" height="1000" fill="#F3F0E8"/>
<rect x="0" y="0" width="1000" height="1000" filter="url(#sl-paper)"/>
<g fill="#3b3631" opacity=".35">${holes}</g>
<g stroke="#191716" fill="none" stroke-linecap="round" stroke-linejoin="round">${hz}</g>
<g stroke="#141312" fill="none" stroke-linecap="round" stroke-linejoin="round">${ink}</g>
<style>.holes{fill:#5a524a;stroke:none;opacity:.45}</style>
${red}
</svg>`;
}
