# 인형 입체 v2 (2026-11-21): 둥근 단면으로 부풀리기
# 예전(relief.py)은 거리 지도의 제곱근을 흐려서 가운데가 뾰족한 언덕(지붕 모양)이었음.
# 이번엔 인형 안쪽 모든 점에 '그 자리에 들어가는 가장 큰 공'을 놓고 그 공들을 합친 높이를 씀:
#   h(x)^2 = max_q ( d(q)^2 - |x-q|^2 )   (d = 테두리까지 거리)
# → 머리는 공, 팔·다리·귀는 원통처럼 둥글고, 목·팔이 붙는 곳은 자연스럽게 잘록해짐.
# 높이는 픽셀 단위 그대로라 폭과 두께의 비율이 실제 둥근 물체와 같음(scale = hmax / 이미지 높이).
# 쓰는 법: python3 relief2.py assets/muchloved/r  (각 *_color.webp의 알파를 모양으로 씀, depth·normal·depth.json을 새로 씀)
import cv2, numpy as np, sys, json, glob, os

def maxplus_1d(f):
    # 행마다 g[x] = max_q f[q] - (x-q)^2  (벡터 계산, 행 길이 ≤ 600)
    n = f.shape[1]
    x = np.arange(n, dtype=np.float32)
    D = (x[:, None] - x[None, :]) ** 2            # (x, q)
    out = np.empty_like(f)
    for i in range(0, f.shape[0], 32):
        blk = f[i:i + 32]                          # (b, q)
        out[i:i + 32] = (blk[:, None, :] - D[None]).max(axis=2)
    return out

def inflate(mask):
    d = cv2.distanceTransform(mask, cv2.DIST_L2, 5).astype(np.float32)
    f = np.where(mask > 0, d * d, -1e9).astype(np.float32)
    g = maxplus_1d(f)          # 가로
    g = maxplus_1d(g.T).T      # 세로
    return np.sqrt(np.clip(g, 0, None)) * (mask > 0)

def run(folder):
    scales = {}
    for cp in sorted(glob.glob(os.path.join(folder, '*_color.webp'))):
        id_ = os.path.basename(cp)[:-len('_color.webp')]
        col = cv2.imread(cp, cv2.IMREAD_UNCHANGED)
        H, W = col.shape[:2]
        w = 480; h = int(round(w * H / W))
        a = cv2.resize(col[:, :, 3], (w, h), interpolation=cv2.INTER_AREA)
        m = (a > 127).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        z = inflate(m)
        z = cv2.GaussianBlur(z, (0, 0), 1.6) * m       # 공 사이 이음매만 살짝 고르게
        # 가장자리에서 두께가 0이 되게(2026-11-25): 둥근 단면은 테두리에서 가파르게 솟아서
        # 앞면·뒷면이 테두리에서 만나지 못하고 틈이 벌어져 '찢어진' 것처럼 보였음
        de = cv2.distanceTransform(m, cv2.DIST_L2, 5).astype(np.float32)
        e = np.clip(de / 10.0, 0, 1); z *= e * e * (3 - 2 * e)   # 테두리 10px 안에서 부드럽게 0으로(격자 4칸쯤)
        # 천의 주름·솔기: 사진 밝기의 잔결을 아주 조금
        g = cv2.cvtColor(cv2.resize(col[:, :, :3], (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        hp = g - cv2.GaussianBlur(g, (0, 0), 4)
        zmax = float(z.max())
        z = np.clip(z + hp * zmax * 0.025 * (z > zmax * 0.05), 0, None) * m
        zmax = float(z.max())
        scales[id_] = round(zmax / h, 4)               # 인형 높이 1에 대한 가장 두꺼운 곳(반쪽)
        zn = z / zmax
        dw = 512; dh = int(round(dw * H / W))
        cv2.imwrite(os.path.join(folder, f'{id_}_depth.png'), (cv2.resize(zn, (dw, dh), interpolation=cv2.INTER_LINEAR) * 255).astype(np.uint8))
        # 노멀: 실제 굴곡 그대로(앞면 두께 0.85배에 맞춤)
        zs = cv2.resize(z * 0.85 * (W / w), (W, H), interpolation=cv2.INTER_CUBIC)
        gx = cv2.Sobel(zs, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(zs, cv2.CV_32F, 0, 1, ksize=3)
        n = np.dstack([-gx, gy, np.full_like(gx, 8)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
        nm = ((n * 0.5 + 0.5) * 255).astype(np.uint8)
        cv2.imwrite(os.path.join(folder, f'{id_}_normal.webp'), cv2.cvtColor(nm, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_WEBP_QUALITY, 90])
        print(id_, W, H, 'thick', scales[id_])
    json.dump(scales, open(os.path.join(folder, 'depth.json'), 'w'), indent=1)

if __name__ == '__main__':
    run(sys.argv[1])
