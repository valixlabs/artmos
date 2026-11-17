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
    for (let t = 0; t < len; t += w * (opt.flat ? 1.5 : .95)) {
      const cx = x1 + ux * t, cy = y1 + uy * t;
      const a = [cx + nx * w * .5 - ux * w * .35, cy + ny * w * .5 - uy * w * .35];
      const b = [cx - nx * w * .5 + ux * w * .35, cy - ny * w * .5 + uy * w * .35];
      twist += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      if (r() < (opt.flat ? .04 : .09)) { // 보풀
        const s = r() < .5 ? 1 : -1, l = 3 + r() * 6;
        const fx = cx + nx * s * w * .5, fy = cy + ny * s * w * .5;
        fuzz += `M${fx.toFixed(1)} ${fy.toFixed(1)}q${(nx * s * l * .6 + ux * l * .5).toFixed(1)} ${(ny * s * l * .6 + uy * l * .5).toFixed(1)} ${(nx * s * l + ux * (r() - .3) * l).toFixed(1)} ${(ny * s * l + uy * (r() - .3) * l).toFixed(1)}`;
      }
    }
  }
  return `<g class="red-thread">
<path d="${d}" stroke="#3a1a14" stroke-opacity=".28" stroke-width="${w + 1.6}" transform="translate(2.2 3)"${opt.flat ? '' : ' filter="url(#sl-soft)"'} fill="none" stroke-linecap="round"/>
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


// ───────── 인물(원작처럼 이목구비 없이 윤곽선 + 머리카락 결) ─────────
// 머리카락: 정수리에서 아래로 흘러내리는 실 가닥 여러 개
function hairStrands(cx, cy, r, len, n, seed, opt = {}) {
  // 정수리 가르마에서 머리 윤곽을 따라 바깥으로 흘러내리는 가닥
  const R = rng(seed), out = [];
  const a0 = opt.a0 ?? Math.PI * 1.05, a1 = opt.a1 ?? Math.PI * 1.95, fall = opt.fall ?? 1;
  const top = [cx + (opt.part ?? 0), cy - r * 1.04];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i / (n - 1)) + (R() - .5) * .06;
    const ex = cx + Math.cos(a) * r * 1.06, ey = cy + Math.sin(a) * r * 1.04;
    const mid = [cx + Math.cos((a + Math.PI * 1.5) / 2) * r * 1.08, cy + Math.sin((a + Math.PI * 1.5) / 2) * r * 1.06];
    const side = Math.cos(a) < 0 ? -1 : 1;
    const l = len * (.6 + R() * .5) * fall;
    out.push(curve([[top[0] + (R() - .5) * 6, top[1] + R() * 3], mid, [ex, ey], [ex + side * (2 + R() * 4), ey + l]], 6));
  }
  return out;
}
// 짧은 곱슬(파마) 머리
function curls(cx, cy, r, n, seed) {
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (.95 + R() * 1.15), rr = r * (.85 + R() * .3);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    out.push(ellipse(x, y, 5 + R() * 4, 4 + R() * 3, R() * 6, R() * 6 + Math.PI * 1.6, 10));
  }
  return out;
}
const T = (pts, dx, dy, k = 1) => pts.map(([x, y]) => [dx + x * k, dy + y * k]);

// 원작처럼 방 모서리 선
const roomCorner = [
  [[150, 60], [150, 640]], [[150, 640], [40, 760]], [[150, 640], [940, 640]],
];

// ───────── 장면 정의: lines(검은 실), hatch(그림자), red(붉은 실 점 목록) ─────────
function ellipse(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 36) {
  const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}

export const SCENES = {
  // 정옥(71): 몸을 숙여 리어카를 끄는 옆모습. 손잡이에 딸의 머리끈
  cart: () => {
    const L = [[[30, 640], [970, 640]]], F = [];
    // 수레
    L.push([[300, 470], [700, 450], [710, 560], [310, 580], [300, 470]]);
    L.push([[700, 450], [760, 430], [770, 535], [710, 560]]);
    L.push([[300, 470], [360, 440], [760, 430]]);
    L.push([[330, 470], [350, 380], [690, 365], [700, 450]]);
    L.push([[350, 380], [400, 340], [720, 330], [690, 365]]);
    L.push([[720, 330], [740, 420], [700, 450]]);
    L.push([[360, 420], [690, 405]]); L.push([[340, 445], [695, 430]]);
    L.push(ellipse(420, 600, 52, 52)); L.push(ellipse(420, 600, 10, 10));
    L.push(ellipse(660, 590, 52, 52)); L.push(ellipse(660, 590, 10, 10));
    for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; L.push([[420, 600], [420 + Math.cos(t) * 50, 600 + Math.sin(t) * 50]]); L.push([[660, 590], [660 + Math.cos(t) * 50, 590 + Math.sin(t) * 50]]); }
    L.push([[305, 500], [226, 404]]); L.push([[312, 532], [234, 426]]); L.push([[226, 404], [234, 426]]); // 손잡이
    // 인물
    const k = .85, ox = 0, oy = 147, P = (pts) => T(pts, ox, oy, k);
    F.push(P(ellipse(110, 82, 38, 42)));
    F.push(...curls(112, 76, 36, 46, 41).map(P));
    F.push(P(curve([[74, 70], [68, 84], [64, 92], [72, 98]], 5)));            // 코
    F.push(P(curve([[76, 108], [84, 120], [96, 124]], 5)));                   // 턱
    F.push(P(curve([[138, 116], [176, 150], [204, 230], [214, 300], [218, 332]], 10))); // 굽은 등
    F.push(P(curve([[94, 126], [102, 162], [122, 232], [140, 300], [150, 332]], 10)));
    F.push(P(curve([[150, 332], [186, 346], [222, 334]], 6)));                 // 외투 자락
    F.push(P(curve([[150, 336], [130, 430], [106, 516], [96, 560]], 8)));      // 앞다리
    F.push(P(curve([[172, 346], [152, 440], [130, 520], [122, 560]], 8)));
    F.push(P(curve([[176, 346], [188, 440], [192, 520], [200, 560]], 8)));     // 뒷다리
    F.push(P(curve([[204, 342], [216, 430], [226, 520], [240, 560]], 8)));
    F.push(P([[96, 560], [60, 566], [62, 580], [124, 580], [122, 560]]));
    F.push(P([[200, 560], [192, 580], [264, 580], [262, 566], [240, 560]]));
    F.push(P(curve([[150, 142], [188, 230], [240, 292]], 8)));                 // 뒤로 뻗은 팔
    F.push(P(curve([[170, 166], [206, 252], [248, 306]], 8)));
    F.push(P(ellipse(254, 304, 14, 11)));
    for (let i = 0; i < 14; i++) F.push(P([[150 + i * 4, 200 + i * 9], [168 + i * 4, 196 + i * 9]]));  // 외투 빗금
    for (let i = 0; i < 6; i++) F.push(P(curve([[120 + i * 4, 190 + i * 22], [132 + i * 4, 214 + i * 22]], 3)));
    L.push(...F);
    const hz = hatch(310, 540, 400, 40, .9, 7, rng(3));
    const red = [...curve([[-20, 150], [140, 150], [236, 300], [250, 432]]), ...loop(262, 446, 9, 14, 1.6, -Math.PI / 2),
      ...curve([[268, 462], [300, 640], [420, 720], [700, 760], [1020, 720]])];
    return { L, hz, red };
  },
  // 민재(24): 편의점 문 옆, 접은 상자를 더미 위에 올려놓는 옆모습
  boxes: () => {
    const L = [[[100, 60], [100, 760]], [[100, 760], [960, 760]]], F = [];
    L.push([[160, 90], [480, 90], [480, 760]]); L.push([[160, 90], [160, 760]]);
    L.push([[190, 120], [450, 120], [450, 730], [190, 730], [190, 120]]);
    L.push([[425, 400], [425, 470]]);
    L.push([[220, 160], [300, 260]]); L.push([[240, 150], [330, 260]]);
    for (let i = 0; i < 4; i++) {
      const y = 700 - i * 34, x = 600 + (i % 2) * 8;
      L.push([[x, y], [x + 290, y - 6], [x + 292, y + 24], [x + 2, y + 30], [x, y]]);
      L.push([[x + 145, y - 3], [x + 146, y + 27]]);
    }
    const k = .75, ox = 462, oy = 318, P = (pts) => T(pts, ox, oy, k);
    F.push(P(ellipse(150, 72, 40, 46)));
    F.push(...hairStrands(150, 64, 42, 34, 26, 51, { a0: Math.PI * .95, a1: Math.PI * 2.05, fall: .7 }).map(P));
    F.push(P(curve([[186, 66], [196, 80], [190, 92]], 4)));                     // 앞머리 끝
    F.push(P(curve([[188, 92], [194, 100], [186, 104]], 4)));                   // 코끝
    F.push(P([[140, 116], [140, 136]])); F.push(P([[166, 114], [168, 136]]));
    F.push(P(curve([[126, 140], [106, 172], [100, 262], [108, 362]], 10)));    // 등
    F.push(P(curve([[176, 140], [200, 176], [206, 262], [198, 362]], 10)));
    F.push(P([[108, 362], [198, 362]]));
    F.push(P(curve([[132, 150], [128, 260], [130, 356]], 6))); F.push(P(curve([[184, 162], [186, 260], [188, 356]], 6))); // 조끼
    F.push(P(curve([[180, 160], [216, 232], [286, 270]], 8)));                 // 팔
    F.push(P(curve([[196, 186], [226, 248], [290, 290]], 8)));
    F.push(P(curve([[116, 362], [118, 470], [122, 584]], 8))); F.push(P(curve([[150, 366], [150, 470], [148, 584]], 8)));
    F.push(P(curve([[160, 366], [170, 470], [180, 584]], 8))); F.push(P(curve([[196, 362], [202, 470], [214, 584]], 8)));
    F.push(P([[122, 584], [118, 596], [166, 598], [148, 584]])); F.push(P([[180, 584], [178, 596], [236, 598], [214, 584]]));
    F.push(P([[262, 262], [470, 250], [472, 276], [264, 292], [262, 262]]));   // 들고 있는 상자
    for (let i = 0; i < 10; i++) F.push(P([[110 + i * 2, 200 + i * 15], [126 + i * 2, 196 + i * 15]]));
    L.push(...F);
    const hz = hatch(605, 735, 290, 22, .7, 7, rng(5));
    const red = [...curve([[-20, 520], [300, 600], [560, 580], [745, 568]]),
      [745, 568], [748, 752], [752, 760], [756, 752], [753, 590],
      ...curve([[753, 590], [730, 560], [780, 540], [800, 575], [760, 585]]),
      ...curve([[760, 585], [840, 640], [1020, 610]])];
    return { L, hz, red };
  },
  // 영호(58): 버스 좌석에 앉아 목도리를 뜨는 정면 모습. 붉은 털실
  scarf: () => {
    const L = [], F = [];
    L.push([[80, 80], [920, 80], [920, 380], [80, 380], [80, 80]]);
    L.push([[500, 80], [500, 380]]); L.push([[95, 360], [905, 360]]);
    L.push([[120, 470], [880, 470], [900, 720], [100, 720], [120, 470]]);
    L.push([[100, 720], [100, 800]]); L.push([[900, 720], [900, 800]]);
    L.push([[140, 380], [140, 470]]); L.push([[860, 380], [860, 470]]);
    const k = 1, ox = 350, oy = 170, P = (pts) => T(pts, ox, oy, k);
    F.push(P(ellipse(150, 92, 42, 48)));
    F.push(P(curve([[104, 80], [110, 40], [150, 28], [192, 40], [198, 80]], 8)));  // 모자
    F.push(P([[104, 80], [198, 80]])); F.push(P(curve([[100, 92], [150, 108], [204, 92]], 6)));
    F.push(P(ellipse(150, 56, 8, 7)));
    for (let i = 0; i < 6; i++) { F.push(P([[110, 96 + i * 6], [114, 102 + i * 6]])); F.push(P([[190, 96 + i * 6], [186, 102 + i * 6]])); } // 옆머리
    F.push(P(curve([[104, 104], [98, 112], [104, 122]], 4))); F.push(P(curve([[196, 104], [202, 112], [196, 122]], 4))); // 귀
    F.push(P(curve([[130, 138], [150, 176], [170, 138]], 6)));                       // 깃
    F.push(P(curve([[130, 138], [80, 160], [62, 200], [58, 330]], 10)));             // 어깨·몸
    F.push(P(curve([[170, 138], [220, 160], [238, 200], [242, 330]], 10)));
    F.push(P(curve([[150, 176], [148, 260], [150, 330]], 6)));
    for (let i = 0; i < 3; i++) F.push(P(ellipse(156, 200 + i * 34, 3, 3)));
    F.push(P(curve([[66, 202], [70, 282], [112, 336]], 8))); F.push(P(curve([[92, 212], [96, 282], [128, 322]], 8)));   // 팔
    F.push(P(curve([[234, 202], [230, 282], [188, 336]], 8))); F.push(P(curve([[208, 212], [204, 282], [172, 322]], 8)));
    F.push(P(ellipse(120, 330, 13, 10))); F.push(P(ellipse(180, 330, 13, 10)));     // 손
    F.push(P([[96, 296], [204, 372]])); F.push(P([[204, 296], [96, 372]]));          // 뜨개바늘
    F.push(P(curve([[58, 330], [150, 342], [242, 330]], 6)));                        // 무릎 위
    F.push(P(curve([[62, 340], [66, 470], [70, 560]], 8))); F.push(P(curve([[136, 348], [130, 470], [126, 560]], 8)));
    F.push(P(curve([[164, 348], [170, 470], [174, 560]], 8))); F.push(P(curve([[238, 340], [234, 470], [230, 560]], 8)));
    F.push(P([[70, 560], [60, 572], [128, 574], [126, 560]])); F.push(P([[174, 560], [172, 574], [240, 572], [230, 560]]));
    // 무릎 위로 흘러내린 목도리(겉뜨기 무늬)
    F.push(P([[112, 340], [192, 340], [196, 520], [108, 520], [112, 340]]));
    for (let row = 0; row < 9; row++) for (let c = 0; c < 4; c++) { const x = 118 + c * 19, y = 352 + row * 19; F.push(P([[x, y], [x + 6, y + 11], [x + 12, y]])); }
    for (let i = 0; i < 6; i++) F.push(P([[114 + i * 15, 520], [112 + i * 15, 548]]));  // 술
    for (let i = 0; i < 12; i++) { F.push(P([[66, 220 + i * 9], [80, 214 + i * 9]])); F.push(P([[224, 214 + i * 9], [238, 220 + i * 9]])); }
    L.push(...F);
    const hz = hatch(110, 690, 790, 28, .6, 8, rng(9));
    const red = [...curve([[-20, 560], [250, 600], [400, 540], [446, 470]]),
      ...curve([[446, 470], [500, 482], [554, 468], [640, 520], [700, 720], [850, 850], [1020, 830]])];
    return { L, hz, red, width: 6.5 };
  },
  // 란(31): 휴게 의자에 앉아 휴대폰 속 딸을 보는 옆모습. 손목에 딸이 묶어 준 실 팔찌
  phone: () => {
    const L = [[[60, 640], [960, 640]], [[700, 60], [700, 640]]], F = [];
    L.push([[250, 520], [610, 520], [640, 560], [230, 560], [250, 520]]);
    L.push([[260, 560], [250, 760]]); L.push([[610, 560], [620, 760]]);
    L.push([[300, 560], [295, 700]]); L.push([[570, 560], [575, 700]]);
    L.push([[760, 120], [920, 120], [920, 300], [760, 300], [760, 120]]); L.push([[840, 120], [840, 300]]);
    const k = 1, ox = 262, oy = 184, P = (pts) => T(pts, ox, oy, k);
    F.push(P(ellipse(140, 80, 36, 42)));
    F.push(...hairStrands(140, 72, 38, 22, 20, 61, { a0: Math.PI * .95, a1: Math.PI * 2.0, fall: .5 }).map(P));
    for (let i = 0; i < 7; i++) F.push(P(curve([[104, 76 + i * 2], [90 - i, 112 + i * 3], [80 + i * 3, 172 + i * 5], [88 + i * 4, 230 + i * 3]], 6))); // 꽁지머리
    F.push(P(ellipse(104, 74, 6, 8)));
    F.push(P(curve([[174, 74], [184, 90], [176, 98]], 4)));   // 코
    F.push(P(curve([[172, 112], [160, 124]], 3)));
    F.push(P([[128, 120], [126, 140]])); F.push(P([[156, 122], [160, 140]]));
    F.push(P(curve([[118, 140], [98, 182], [94, 262], [108, 334]], 10)));
    F.push(P(curve([[162, 140], [180, 182], [184, 252], [180, 334]], 10)));
    F.push(P(curve([[108, 334], [180, 334], [262, 336]], 6)));  // 허벅지
    F.push(P(curve([[120, 362], [200, 362], [262, 362]], 6)));
    F.push(P(curve([[262, 336], [270, 350], [262, 362]], 4)));
    F.push(P(curve([[262, 340], [268, 440], [272, 540]], 8))); F.push(P(curve([[244, 362], [246, 450], [250, 540]], 8)));
    F.push(P([[250, 540], [246, 552], [300, 554], [272, 540]]));
    F.push(P(curve([[150, 160], [160, 232], [204, 262], [240, 242]], 8)));   // 팔
    F.push(P(curve([[168, 166], [178, 226], [206, 246], [236, 228]], 8)));
    F.push(P([[232, 188], [262, 182], [268, 250], [238, 256], [232, 188]]));  // 휴대폰
    F.push(P([[238, 196], [258, 192], [262, 242], [242, 246], [238, 196]]));
    for (let i = 0; i < 4; i++) F.push(P([[228, 196 + i * 8], [196, 150 + i * 6]]));  // 화면 빛
    for (let i = 0; i < 10; i++) F.push(P([[104 + i * 2, 200 + i * 12], [120 + i * 2, 196 + i * 12]]));
    L.push(...F);
    const hz = hatch(230, 560, 410, 40, .8, 7, rng(11));
    const red = [...curve([[-20, 420], [220, 470], [430, 452], [462, 440]]), ...loop(472, 438, 8, 13, 1.3, Math.PI),
      ...curve([[478, 452], [600, 470], [720, 400], [810, 300], [850, 330], [860, 520], [920, 610], [1020, 600]])];
    return { L, hz, red };
  },
  // 서윤: 닫힌 문, 문고리의 반찬 봉지. 복도 끝으로 걸어가는 정옥의 뒷모습
  door: () => {
    const L = [[[60, 820], [960, 820]]], F = [];
    L.push([[280, 60], [720, 60], [720, 820]]); L.push([[280, 60], [280, 820]]);
    L.push([[310, 90], [690, 90], [690, 820]]); L.push([[310, 90], [310, 820]]);
    L.push(ellipse(640, 470, 18, 18)); L.push([[640, 470], [600, 472]]);
    L.push(curve([[612, 500], [585, 560], [570, 650], [600, 720], [660, 728], [700, 690], [705, 610], [680, 545], [652, 500]], 8));
    L.push(curve([[598, 600], [620, 640], [612, 690]], 8)); L.push(curve([[680, 600], [672, 660]], 8));
    L.push(curve([[612, 500], [622, 482], [640, 470]], 6)); L.push(curve([[652, 500], [650, 482], [640, 470]], 6));
    L.push([[312, 812], [688, 812]]);
    L.push([[720, 300], [960, 360]]); L.push([[720, 760], [960, 720]]);   // 복도
    const k = .58, ox = 772, oy = 418, P = (pts) => T(pts, ox, oy, k);
    F.push(P(ellipse(100, 70, 36, 40)));
    F.push(...curls(100, 66, 34, 50, 71).map(P));
    F.push(P(curve([[70, 110], [45, 140], [35, 200], [38, 330]], 8)));
    F.push(P(curve([[130, 110], [155, 140], [165, 200], [162, 330]], 8)));
    F.push(P([[38, 330], [162, 330]])); F.push(P(curve([[100, 116], [100, 220], [100, 326]], 6)));
    F.push(P(curve([[45, 150], [30, 240], [35, 310]], 6))); F.push(P(curve([[60, 160], [50, 240], [52, 305]], 6)));
    F.push(P(curve([[155, 150], [170, 240], [165, 310]], 6))); F.push(P(curve([[140, 160], [150, 240], [148, 305]], 6)));
    F.push(P(curve([[60, 330], [58, 440], [56, 520]], 6))); F.push(P(curve([[95, 332], [92, 440], [90, 520]], 6)));
    F.push(P(curve([[105, 332], [110, 440], [112, 520]], 6))); F.push(P(curve([[140, 330], [142, 440], [146, 520]], 6)));
    F.push(P([[56, 520], [52, 534], [92, 534], [90, 520]])); F.push(P([[112, 520], [110, 534], [150, 534], [146, 520]]));
    for (let i = 0; i < 12; i++) F.push(P([[48 + i * 9, 180 + (i % 3) * 30], [52 + i * 9, 230 + (i % 3) * 30]]));
    L.push(...F);
    const hz = [...hatch(312, 790, 376, 22, 0.5, 9, rng(13), .4), ...hatch(720, 60, 40, 760, 1.2, 14, rng(14))];
    const red = [...curve([[-20, 380], [300, 430], [600, 500]]), ...loop(632, 505, 26, 9, 1.3, Math.PI),
      ...curve([[650, 520], [720, 640], [640, 790], [500, 812], [400, 818], [200, 840], [-20, 860]])];
    return { L, hz, red };
  },
  // 아직 수놓이지 않은 장: 바늘구멍만
  blank: () => {
    const r = rng(17), holes = [];
    for (let i = 0; i < 90; i++) holes.push([120 + r() * 760, 120 + r() * 760]);
    return { L: [], hz: [], red: null, holes };
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
${opt.noRed ? '' : '<rect x="-60" y="-60" width="1120" height="1120" fill="#ECEAE4"/>'}
<rect x="-14" y="-14" width="1028" height="1028" fill="#d9d5cc"${opt.noRed ? ' opacity=".55"' : ''}/>
<rect x="0" y="0" width="1000" height="1000" fill="#F3F0E8"/>
<rect x="0" y="0" width="1000" height="1000" filter="url(#sl-paper)"/>
<g fill="#3b3631" opacity=".35">${holes}</g>
<g stroke="#191716" fill="none" stroke-linecap="round" stroke-linejoin="round">${hz}</g>
<g stroke="#141312" fill="none" stroke-linecap="round" stroke-linejoin="round">${ink}</g>
<style>.holes{fill:#5a524a;stroke:none;opacity:.45}</style>
${red}
</svg>`;
}
