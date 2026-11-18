import cv2, numpy as np, sys
src, mpath, out = sys.argv[1], sys.argv[2], sys.argv[3]
im = cv2.imread(src); m = cv2.imread(mpath,0)
h,w = m.shape
mb = (m>127).astype(np.uint8)
d = cv2.distanceTransform(mb,cv2.DIST_L2,5)
z = np.sqrt(d)                      # inflate: bigger parts bulge more
z = cv2.GaussianBlur(z,(0,0),14)
z /= z.max()
# fine surface detail from the photo (seams, wear) — small weight
g = cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
hp = g - cv2.GaussianBlur(g,(0,0),5)
z = np.clip(z + 0.02*hp*(z>0.02), 0, 1) * mb
z = cv2.GaussianBlur(z,(0,0),1.2)
# textures
W = min(1024, w)//2*2; H = int(W*h/w)//2*2
col = cv2.cvtColor(im,cv2.COLOR_BGR2BGRA); col[:,:,3] = m
cv2.imwrite(out+'_color.webp', cv2.resize(col,(W,H),interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 88])
zs = cv2.resize(z,(512,int(512*h/w)),interpolation=cv2.INTER_AREA)
cv2.imwrite(out+'_depth.png', (zs*255).astype(np.uint8))
# normal map (scale to taste)
zn = cv2.resize(z,(W,H),interpolation=cv2.INTER_AREA)*60
gx = cv2.Sobel(zn,cv2.CV_32F,1,0,ksize=3); gy = cv2.Sobel(zn,cv2.CV_32F,0,1,ksize=3)
n = np.dstack([-gx,gy,np.full_like(gx,8)]); n /= np.linalg.norm(n,axis=2,keepdims=True)
nm = ((n*0.5+0.5)*255).astype(np.uint8)
cv2.imwrite(out+'_normal.png', cv2.cvtColor(nm,cv2.COLOR_RGB2BGR))
cv2.imwrite(out+'_depth_view.png', (zs*255).astype(np.uint8))
print(W,H)
