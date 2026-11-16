// 빛쌀(휴대폰): 장마다 쌀알이 이루는 모양. 좌표는 가운데 0, 위아래 대략 -1~1.
// 선(외곽)을 따라 쌀알을 고르게 놓고, 일부는 안을 채움. 글자 모양(7, 문서)은 캔버스 글자를 쌀알로 바꿈.

const TAU = Math.PI * 2;
const ell = (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 64) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + (a1 - a0) * (k / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const quad = (p0, p1, p2, n = 32) => Array.from({ length: n + 1 }, (_, k) => { const t = k / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
const line = (a, b) => [a, b];
const mirror = (pl) => pl.map(([x, y]) => [-x, y]);

// 결정적인 난수 (같은 모양은 늘 같게)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// 모양 정의: lines(외곽선 묶음) + fills(안 채우기: () => [x, y])
const DEF = {
  // 밥상: 둥근 상 + 다리 + 그릇 셋
  table: () => {
    const bowls = [-0.48, 0, 0.48].map((x, k) => [ell(x, -0.2 - (k === 1 ? 0.06 : 0), 0.15, 0.05), ell(x, -0.17 - (k === 1 ? 0.06 : 0), 0.12, 0.09, 0, Math.PI, 20)]).flat();
    return { lines: [ell(0, 0, 0.95, 0.3), ell(0, 0.06, 0.95, 0.3, 0, Math.PI), line([-0.62, 0.3], [-0.7, 0.85]), line([0.62, 0.3], [0.7, 0.85]), line([0, 0.36], [0, 0.95]), ...bowls],
      fills: [[0.12, (r) => { const k = Math.floor(r() * 3), x = [-0.48, 0, 0.48][k], a = r() * Math.PI, rr = Math.sqrt(r()); return [x + Math.cos(a + Math.PI) * 0.13 * rr, -0.22 - (k === 1 ? 0.06 : 0) - Math.sin(a) * 0.09 * rr]; }]] };
  },
  // 쌀독: 항아리 몸통 + 입 + 뚜껑
  jar: () => {
    const side = [...quad([0.3, -0.62], [0.95, -0.4], [0.72, 0.3]), ...quad([0.72, 0.3], [0.55, 0.88], [0, 0.9])];
    return { lines: [side, mirror(side), ell(0, -0.64, 0.32, 0.07), ell(0, -0.76, 0.38, 0.08), ell(0, -0.86, 0.1, 0.05)],
      fills: [[0.18, (r) => { const y = -0.1 + r() * 0.9, w = 0.62 * Math.sqrt(Math.max(0, 1 - ((y - 0.25) / 0.68) ** 2)); return [(r() * 2 - 1) * w, y]; }]] };
  },
  // 쌀 한 톨 (크게)
  grain: () => ({ lines: [ell(0, 0, 0.42, 0.9, 0, TAU, 96), quad([0, -0.82], [0.12, 0], [0, 0.82])],
    fills: [[0.35, (r) => { const a = r() * TAU, rr = Math.sqrt(r()); return [Math.cos(a) * 0.38 * rr, Math.sin(a) * 0.84 * rr]; }]] }),
  // 등잔 (켜지 않은): 받침 + 기둥 + 기름 접시 + 심지
  lamp: () => ({ lines: [ell(0, 0.86, 0.48, 0.09), ell(0, 0.92, 0.48, 0.09, 0, Math.PI), line([-0.05, 0.82], [-0.05, -0.28]), line([0.05, 0.82], [0.05, -0.28]), ell(0, 0.3, 0.16, 0.04),
    ell(0, -0.38, 0.42, 0.08), ell(0, -0.36, 0.42, 0.16, 0, Math.PI, 40), line([0.22, -0.4], [0.32, -0.56])], fills: [] }),
  // 경찰: 모자(챙·띠·휘장) + 얼굴 윤곽 + 어깨·옷깃·단추 (이목구비 없음)
  police: () => {
    const crown = [...quad([-0.42, -0.5], [-0.5, -0.86], [0, -0.9]), ...quad([0, -0.9], [0.5, -0.86], [0.42, -0.5])];
    const shoulder = [...quad([-0.16, 0.18], [-0.6, 0.26], [-0.82, 0.42]), ...quad([-0.82, 0.42], [-0.95, 0.6], [-0.95, 0.98])];
    return { lines: [crown, line([-0.42, -0.5], [0.42, -0.5]), quad([-0.5, -0.47], [0, -0.32], [0.5, -0.47]), ell(0, -0.7, 0.07, 0.07, 0, TAU, 20),
      ell(0, -0.16, 0.3, 0.36, -0.15, Math.PI + 0.15, 48), line([-0.14, 0.15], [-0.16, 0.24]), line([0.14, 0.15], [0.16, 0.24]),
      shoulder, mirror(shoulder), [[-0.16, 0.22], [0, 0.46], [0.16, 0.22]], ell(0, 0.6, 0.035, 0.035, 0, TAU, 12), ell(0, 0.8, 0.035, 0.035, 0, TAU, 12)], fills: [] };
  },
  // 고무신 한 켤레
  shoes: () => {
    const shoe = (ox, oy, s) => { const P = (x, y) => [ox + x * s, oy + y * s]; return [[...quad(P(-1, 0.1), P(0, 0.5), P(1.05, -0.1)), ...quad(P(1.05, -0.1), P(1.25, -0.45), P(0.95, -0.35))], [...quad(P(-1, 0.1), P(-1.1, -0.3), P(-0.7, -0.32)), ...quad(P(-0.7, -0.32), P(0.2, -0.3), P(0.95, -0.35))], ell(ox - 0.25 * s, oy - 0.3 * s, 0.45 * s, 0.1 * s)]; };
    return { lines: [...shoe(-0.38, -0.05, 0.42), ...shoe(0.42, 0.38, 0.42)], fills: [] };
  },
  // 밥 한 그릇 (수북한 밥)
  bowl: () => ({ lines: [ell(0, 0, 0.75, 0.18), ell(0, 0.02, 0.75, 0.62, 0, Math.PI, 64), ell(0, 0.66, 0.28, 0.06), line([-0.24, 0.6], [-0.26, 0.66]), line([0.24, 0.6], [0.26, 0.66])],
    fills: [[0.4, (r) => { const x = (r() * 2 - 1) * 0.68, h = 0.42 * Math.sqrt(Math.max(0, 1 - (x / 0.7) ** 2)); return [x, -r() * h]; }]] }),
  // 주먹밥: 둥근 세모 + 김 띠
  riceball: () => {
    const tri = [...quad([-0.1, -0.78], [0, -0.86], [0.1, -0.78]), ...quad([0.1, -0.78], [0.5, -0.1], [0.78, 0.52]), ...quad([0.78, 0.52], [0.8, 0.72], [0.55, 0.72]), ...quad([0.55, 0.72], [0, 0.74], [-0.55, 0.72]), ...quad([-0.55, 0.72], [-0.8, 0.72], [-0.78, 0.52]), ...quad([-0.78, 0.52], [-0.5, -0.1], [-0.1, -0.78])];
    return { lines: [tri, [[-0.3, 0.72], [-0.3, 0.18], [0.3, 0.18], [0.3, 0.72]]],
      fills: [[0.35, (r) => { for (;;) { const x = r() * 1.5 - 0.75, y = r() * 1.45 - 0.75; if (Math.abs(x) < (y + 0.78) * 0.52 && !(Math.abs(x) < 0.3 && y > 0.18)) return [x, y]; } }]] };
  },
  // 빛: 불꽃 + 둘레의 작은 빛
  flame: () => {
    const side = [...quad([0, -0.85], [0.18, -0.4], [0.32, -0.05]), ...quad([0.32, -0.05], [0.42, 0.35], [0, 0.45])];
    const rays = Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * TAU; return line([Math.cos(a) * 0.62, -0.12 + Math.sin(a) * 0.62], [Math.cos(a) * 0.78, -0.12 + Math.sin(a) * 0.78]); });
    return { lines: [side, mirror(side), [...quad([0, -0.35], [0.12, -0.05], [0.08, 0.2]), ...quad([0.08, 0.2], [0, 0.3], [-0.08, 0.2]), ...quad([-0.08, 0.2], [-0.12, -0.05], [0, -0.35])], ...rays, line([0, 0.45], [0, 0.95])], fills: [] };
  },
};

function sample(def, n, seed) {
  const r = rng(seed), out = [];
  const fills = def.fills || [], fillShare = fills.reduce((s, f) => s + f[0], 0);
  const nLine = Math.round(n * (1 - fillShare));
  const segs = []; let total = 0;
  def.lines.forEach((pl) => { for (let k = 1; k < pl.length; k++) { const [a, b] = [pl[k - 1], pl[k]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 0) { segs.push([a, b, total, L]); total += L; } } });
  for (let j = 0; j < nLine; j++) {
    const d = ((j + r() * 0.6) / nLine) * total; let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m][2] <= d) lo = m; else hi = m - 1; }
    const [a, b, s0, L] = segs[lo], t = Math.min(1, (d - s0) / L), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, off = (r() - 0.5) * 0.025;
    out.push({ x: a[0] + (b[0] - a[0]) * t + nx * off, y: a[1] + (b[1] - a[1]) * t + ny * off, r: Math.atan2(b[1] - a[1], b[0] - a[0]) + (r() - 0.5) * 0.5 });
  }
  fills.forEach(([share, fn]) => { const m = Math.round(n * share); for (let j = 0; j < m; j++) { const [x, y] = fn(r); out.push({ x, y, r: r() * Math.PI }); } });
  return out;
}

const cache = new Map();
export function shapePoints(name, n = 900) {
  const key = name + n;
  if (!cache.has(key)) { const d = DEF[name]; cache.set(key, d ? sample(d(), n, name.length * 7919 + n) : null); }
  return cache.get(key);
}

// 글자·문서를 쌀알로: 캔버스에 그린 뒤 밝은 곳에서 점을 고름. lines = [{ text, size, weight, y, x?, align? }], w·h는 그림 크기(px), 결과는 -1~1(긴 쪽 기준)
export function inkPoints(key, w, h, lines, n = 900, extra) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textBaseline = 'middle';
  lines.forEach((l) => { g.font = `${l.weight || 400} ${l.size}px 'Nanum Myeongjo','Noto Serif KR','AppleMyungjo',serif`; g.textAlign = l.align || 'left'; g.fillText(l.text, l.x ?? 16, l.y); });
  if (extra) extra(g);
  const d = g.getImageData(0, 0, w, h).data, on = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (d[(y * w + x) * 4 + 3] > 140) on.push([x, y]);
  const r = rng(n + w * 31 + h), s = Math.max(w, h) / 2, out = [];
  for (let j = 0; j < n; j++) { const [x, y] = on.length ? on[Math.floor(r() * on.length)] : [w / 2, h / 2]; out.push({ x: (x - w / 2) / s, y: (y - h / 2) / s, r: (r() - 0.5) * 0.6 }); }
  cache.set(key, out); return out;
}
