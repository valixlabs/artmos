# 오린 인형 테두리에 묻은 배경색(흰 띠)을 안쪽 천 색으로 채움 (2026-11-25)
# 테두리 3px만 바꾸고 알파(모양)는 그대로. 쓰는 법: python3 edgebleed.py assets/muchloved/r
import cv2, numpy as np, sys, glob
for p in sorted(glob.glob(sys.argv[1] + '/*_color.webp')):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED); a = im[:, :, 3]
    inside = (a > 127).astype(np.uint8)
    d = cv2.distanceTransform(inside, cv2.DIST_L2, 5)
    band = (inside > 0) & (d <= 3.5)
    core = ((d > 3.5) * 255).astype(np.uint8)
    # 안쪽 색을 바깥으로 번지게: 가려진 곳(band) 채우기
    rgb = im[:, :, :3].copy(); mask = (band | (inside == 0)).astype(np.uint8) * 255
    filled = cv2.inpaint(rgb, mask, 5, cv2.INPAINT_TELEA)
    im[:, :, :3][band | (inside == 0)] = filled[band | (inside == 0)]
    cv2.imwrite(p, im, [cv2.IMWRITE_WEBP_QUALITY, 88]); print(p)
