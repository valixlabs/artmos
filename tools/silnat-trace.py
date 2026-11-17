import sys, cv2, numpy as np
src, out, scale = sys.argv[1], sys.argv[2], 4
img = cv2.imread(src)
h, w = img.shape[:2]
big = cv2.resize(img, (w*scale, h*scale), interpolation=cv2.INTER_CUBIC)
b,g,r = [c.astype(int) for c in cv2.split(big)]
red = ((r - g > 45) & (r - b > 35)).astype(np.uint8)*255
gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
gray = cv2.GaussianBlur(gray, (3,3), 0)
ink = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 11)
ink[red>0] = 0
m=8*scale; ink[:m,:]=0; ink[-m:,:]=0; ink[:,:m]=0; ink[:,-m:]=0
# 작은 점 잡티 제거
n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
keep = np.zeros_like(ink)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] >= 40: keep[lab==i] = 255
def paths(mask, eps):
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d=[]
    for c in cs:
        if cv2.contourArea(c) < 6: continue
        c = cv2.approxPolyDP(c, eps, True).reshape(-1,2)/scale
        if len(c)<3: continue
        d.append('M'+'L'.join(f'{x:.1f} {y:.1f}' for x,y in c)+'Z')
    return ''.join(d)
ink_d = paths(keep, .8)
red_d = paths(red, .8)
ys,xs = np.nonzero(red)
print(f'size {w}x{h} ink_len {len(ink_d)} red_len {len(red_d)} red_bbox', (xs.min()/scale, ys.min()/scale, xs.max()/scale, ys.max()/scale) if len(xs) else None)
open(out,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="#F3F0E8"/><path d="{ink_d}" fill="#151413" fill-rule="evenodd"/><path d="{red_d}" fill="#b3231c"/></svg>')
