// QR 코드 만들기 (외부 라이브러리 없음). 바이트 모드 · 오류 정정 M · 버전 1~6(약 100글자까지).
// qrSVG('https://…') → <svg> 문자열 (흰 바탕에 검은 칸, 둘레 여백 4칸)
const ECC = [10, 16, 26, 18, 24, 16];   // 블록마다 오류 정정 글자 수 (M, 버전 1~6)
const BLK = [1, 1, 1, 2, 2, 4];         // 블록 수 (M, 버전 1~6)

const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; } return r; };
const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC[v - 1] * BLK[v - 1];

function gmul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; }
function rsDivisor(d) { const r = new Array(d).fill(0); r[d - 1] = 1; let root = 1; for (let i = 0; i < d; i++) { for (let j = 0; j < d; j++) { r[j] = gmul(r[j], root); if (j + 1 < d) r[j] ^= r[j + 1]; } root = gmul(root, 2); } return r; }
function rsRemainder(data, div) { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); } return r; }

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1; while (v <= 6 && 4 + 8 + bytes.length * 8 > dataCodewords(v) * 8) v++;
  if (v > 6) throw new Error('QR: 글자가 너무 길어요');
  // 비트 쌓기
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach((b) => put(b, 8));
  const cap = dataCodewords(v) * 8;
  put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) put(p, 8);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // 오류 정정 + 섞기
  const nb = BLK[v - 1], el = ECC[v - 1], raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
  const div = rsDivisor(el), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += dat.length;
    const blk = dat.concat(rsRemainder(dat, div)); if (i < nShort) blk.splice(shortLen - el, 0, 0); blocks.push(blk);
  }
  const words = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) words.push(b[i]); });
  // 판 그리기
  const n = v * 4 + 17, M = [...Array(n)].map(() => new Array(n).fill(false)), F = [...Array(n)].map(() => new Array(n).fill(false));
  const fn = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
  for (let i = 0; i < n; i++) { fn(6, i, i % 2 === 0); fn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < n && y >= 0 && y < n) fn(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
  if (v >= 2) { const p = [6, n - 7]; for (const a of p) for (const b of p) { if ((a === 6 && b === 6) || (a === 6 && b === n - 7) || (a === n - 7 && b === 6)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fn(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); } }
  const format = (mask) => {
    const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, g = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) fn(8, i, g(i)); fn(8, 7, g(6)); fn(8, 8, g(7)); fn(7, 8, g(8));
    for (let i = 9; i < 15; i++) fn(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) fn(n - 1 - i, 8, g(i));
    for (let i = 8; i < 15; i++) fn(8, n - 15 + i, g(i));
    fn(8, n - 8, true);
  };
  format(0);
  let k = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
      if (!F[y][x] && k < words.length * 8) { M[y][x] = ((words[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  const apply = (m) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && MASKS[m](x, y)) M[y][x] = !M[y][x]; };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let a = 0; a < 2; a++) for (let i = 0; i < n; i++) { let run = 1; for (let j = 1; j <= n; j++) { const c = j < n && (a ? M[j][i] : M[i][j]) === (a ? M[j - 1][i] : M[i][j - 1]); if (c) run++; else { if (run >= 5) p += run - 2; run = 1; } } }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
    const pat = [1, 0, 1, 1, 1, 0, 1];
    for (let y = 0; y < n; y++) for (let x = 0; x + 7 <= n; x++) { if (pat.every((b, i) => M[y][x + i] === !!b)) p += 40; if (pat.every((b, i) => M[x + i][y] === !!b)) p += 40; }
    for (const row of M) for (const c of row) if (c) dark++;
    return p + Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { apply(m); format(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } apply(m); }
  apply(best); format(best);
  return M;
}

export function qrSVG(text, { quiet = 4 } = {}) {
  const M = qrMatrix(text), n = M.length, s = n + quiet * 2;
  let d = ''; M.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + quiet} ${y + quiet}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
