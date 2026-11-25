"""Humming Letter 작품 '모델링' — 사진 한 장에서 3D에 쓸 지도 다섯 장을 뽑습니다.
  -c  색(원본 그대로, 긴 변 1280)
  -n  표면 결(노멀 지도): 손가락으로 쌓은 두꺼운 물감의 높낮이를 밝기 변화로 어림
  -h  높이(변위 지도): 물감 덩어리의 굵은 높낮이 + 흰 선은 조금 더 솟게
  -f  꽃 층(알파): 채도 높은 꽃 색 덩어리 — 바람에 따로 흔들리는 앞 층
  -l  흰 선 층(알파): 그림 위를 지나는 가는 흰 선(허밍 편지)
쓰는 법: python3 tools/humming-model/model.py <원본 폴더> assets/humming/m
작품 사진의 색은 바꾸지 않습니다. 지도는 화면 연출(빛·흔들림·떠오름)에만 씁니다.
"""
import sys, os, glob, json
import numpy as np, cv2

SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)
# 작품마다 꽃 층·흰 선 층을 쓸지 (색만 보고 자르면 주황 결·호수처럼 전체가 잡히는 그림이 있어서)
CFG = {
  'hl-01': dict(flower=True, lines=False), 'hl-03': dict(flower=True, lines=True),
  'hl-monet': dict(flower=True, lines=True), 'hl-path': dict(flower=True, lines=False),
  'hl-lake': dict(flower=False, lines=False), 'hl-red': dict(flower=True, lines=True),
  'hl-garden': dict(flower=True, lines=True), 'hl-sun': dict(flower=True, lines=True),
  'hl-amber': dict(flower=False, lines=False), 'hl-pink': dict(flower=True, lines=False),
  'hl-blue': dict(flower=True, lines=True), 'hl-vase': dict(flower=True, lines=False),
  'hl-pale': dict(flower=False, lines=False), 'hl-tide': dict(flower=False, lines=False),
}
def resize(a, long):
  h, w = a.shape[:2]; s = long / max(h, w)
  return cv2.resize(a, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
def save(path, a, q=82):
  cv2.imwrite(path, a, [cv2.IMWRITE_WEBP_QUALITY, q])

meta = {}
for f in sorted(glob.glob(os.path.join(SRC, 'hl-*.webp'))):
  k = os.path.basename(f)[:-5]
  if k not in CFG: continue
  bgr = cv2.imread(f, cv2.IMREAD_COLOR)
  c = resize(bgr, 1152) if max(bgr.shape[:2]) > 1152 else bgr
  save(f'{DST}/{k}-c.webp', c, 80)
  w = resize(bgr, 768)
  lab = cv2.cvtColor(w, cv2.COLOR_BGR2LAB).astype(np.float32)
  L = lab[..., 0] / 255.0
  hsv = cv2.cvtColor(w, cv2.COLOR_BGR2HSV).astype(np.float32)
  H, S, V = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255

  # ── 흰 선: 밝고 무채색이고 가늘다(주변보다 튀는 능선)
  tophat = cv2.morphologyEx((L * 255).astype(np.uint8), cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))).astype(np.float32) / 255
  line = ((V > 0.78) & (S < 0.22) & (tophat > 0.08)).astype(np.uint8)
  n, lab_, st, _ = cv2.connectedComponentsWithStats(line, 8)
  keep = np.zeros_like(line)
  for i in range(1, n):
    x, y, ww, hh, area = st[i]
    if area >= 14 and max(ww, hh) >= 10: keep[lab_ == i] = 1   # 점 같은 반짝임은 빼고 선만
  line_a = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 0.8)
  if not CFG[k]['lines']: line_a[:] = 0

  # ── 높이: 물감 덩어리(중간 크기 결) + 굵은 붓질, 흰 선은 조금 더 솟게
  g = cv2.GaussianBlur(L, (0, 0), 1.2)
  mid = g - cv2.GaussianBlur(g, (0, 0), 6)
  low = cv2.GaussianBlur(g, (0, 0), 6) - cv2.GaussianBlur(g, (0, 0), 30)
  tex = cv2.GaussianBlur(S, (0, 0), 2) - cv2.GaussianBlur(S, (0, 0), 14)
  h = mid * 2.2 + low * 0.9 + tex * 0.5 + line_a * 0.25
  h = (h - np.percentile(h, 1)) / (np.percentile(h, 99) - np.percentile(h, 1) + 1e-6)
  h = np.clip(h, 0, 1)
  save(f'{DST}/{k}-h.webp', (resize(h, 384) * 255).astype(np.uint8), 90)

  # ── 노멀: 높이의 기울기 + 잔결
  hn = cv2.GaussianBlur(h, (0, 0), 0.7)
  gx = cv2.Sobel(hn, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(hn, cv2.CV_32F, 0, 1, ksize=3)
  strength = 3.2
  nx, ny, nz = -gx * strength, gy * strength, np.ones_like(hn)
  ln = np.sqrt(nx * nx + ny * ny + nz * nz)
  nm = np.dstack([(nz / ln + 1) / 2, (ny / ln + 1) / 2, (nx / ln + 1) / 2])  # BGR로 저장(R=x,G=y,B=z)
  save(f'{DST}/{k}-n.webp', (nm * 255).astype(np.uint8), 90)

  # ── 꽃: 빨강·분홍·주황·노랑·보라 계열의 진한 색 덩어리(초록 잎·파란 하늘·물은 뺌)
  flower = np.zeros_like(S)
  if CFG[k]['flower']:
    hue_ok = (H < (46 if k == 'hl-sun' else 62)) | (H > 280)
    m = (hue_ok & (S > (0.22 if k == 'hl-monet' else 0.33)) & (V > 0.32)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    n, lab_, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
      if st[i][4] >= 40: keep[lab_ == i] = 1
    flower = cv2.GaussianBlur(cv2.dilate(keep, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 1.5)
    if flower.mean() > 0.62: flower *= 0  # 거의 전부가 잡히면 꽃 층을 쓰지 않음
  save(f'{DST}/{k}-f.webp', (np.clip(flower, 0, 1) * 255).astype(np.uint8), 88)
  save(f'{DST}/{k}-l.webp', (np.clip(line_a * 1.4, 0, 1) * 255).astype(np.uint8), 90)
  meta[k] = dict(w=int(c.shape[1]), h=int(c.shape[0]), flower=round(float(flower.mean()), 3), lines=round(float(line_a.mean()), 4))
  print(k, meta[k])
json.dump(meta, open(f'{DST}/meta.json', 'w'), indent=1)
