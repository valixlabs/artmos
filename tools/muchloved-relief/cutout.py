import cv2, numpy as np, sys
k,src,x0,y0,x1,y1 = sys.argv[1],sys.argv[2],*map(float,sys.argv[3:7])
im=cv2.imread(src); H,W=im.shape[:2]
im=im[int(y0*H):int(y1*H), int(x0*W):int(x1*W)].copy(); h,w=im.shape[:2]
lab=cv2.cvtColor(im,cv2.COLOR_BGR2LAB).astype(np.int16)
a,b=lab[:,:,1]-128, lab[:,:,2]-128
chroma=np.hypot(a,b)
mask=np.full((h,w),cv2.GC_PR_BGD,np.uint8)
mask[(b>10)|(chroma>16)]=cv2.GC_PR_FGD           # yellowish / colourful = doll
mask[(b>18)|((chroma>22)&(b>-2))]=cv2.GC_FGD
mask[(b<-3)]=cv2.GC_BGD                          # bluish background
mask[:6,:]=mask[-6:,:]=cv2.GC_BGD; mask[:,:6]=mask[:,-6:]=cv2.GC_BGD
bg=np.zeros((1,65)); fg=np.zeros((1,65))
cv2.grabCut(im,mask,None,bg,fg,8,cv2.GC_INIT_WITH_MASK)
m=np.where((mask==1)|(mask==3),255,0).astype(np.uint8)
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
n,lb,st,_=cv2.connectedComponentsWithStats(m); kk=1+np.argmax(st[1:,4]); m=np.where(lb==kk,255,0).astype(np.uint8)
ff=m.copy(); cv2.floodFill(ff,None,(0,0),255); m=m|cv2.bitwise_not(ff)
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)); m=cv2.GaussianBlur(m,(5,5),0)
cv2.imwrite(f'src_{k}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,95]); cv2.imwrite(f'{k}_mask.png',m)
ov=im.copy(); ov[m<128]=(ov[m<128]*0.2).astype(np.uint8); s=400/max(h,w); cv2.imwrite(f'chk_{k}.jpg',cv2.resize(ov,(int(w*s),int(h*s))))
