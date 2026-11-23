"""Makes docs/icons/hearthstone.png from the game icon INV_Misc_Rune_01 (FileDataID 134414).
Get the BLP from https://wago.tools/api/casc/134414?download, convert it to a.png with Pillow, then run
python hearthstone-icon.py <folder with a.png>. It cuts the stone out of the icon frame, rebuilds the edges the
frame cut off by fitting an ellipse to the outline, and writes stone2.png."""
import sys,numpy as np
from PIL import Image
from collections import deque
d=sys.argv[1]
src=np.array(Image.open(d+'/a.png').convert('RGBA')).astype(float)
C0,C1=6,58
im=src[C0:C1,C0:C1];H,W=im.shape[:2]
lum=im[...,:3].max(-1);bg=np.zeros((H,W),bool);q=deque([(x,y) for x in range(W) for y in (0,H-1)]+[(x,y) for y in range(H) for x in (0,W-1)])
while q:
  x,y=q.popleft()
  if x<0 or y<0 or x>=W or y>=H or bg[y,x] or lum[y,x]>60:continue
  bg[y,x]=True;q.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
known=~bg
pts=[]
for y in range(H):
  for x in range(W):
    if not known[y,x] or x<=1 or y<=1 or x>=W-2 or y>=H-2:continue
    if any(not known[y+dy,x+dx] for dx,dy in((1,0),(-1,0),(0,1),(0,-1))):pts.append((x+.5,y+.5))
P=np.array(pts);x,y=P[:,0],P[:,1]
D=np.stack([x*x,x*y,y*y,x,y,np.ones_like(x)],1)
_,_,V=np.linalg.svd(D);co=V[-1]
F=lambda X,Y:co[0]*X*X+co[1]*X*Y+co[2]*Y*Y+co[3]*X+co[4]*Y+co[5]
cy,cx=np.argwhere(known).mean(0);sgn=np.sign(F(cx+.5,cy+.5))
PAD=8;S=8;Wn,Hn=W+2*PAD,H+2*PAD
ys,xs=np.mgrid[0:Hn*S,0:Wn*S];X=(xs+.5)/S-PAD;Y=(ys+.5)/S-PAD
m=((F(X,Y)*sgn)>0).reshape(Hn,S,Wn,S).mean((1,3))
can=np.zeros((Hn,Wn,4));kn=np.zeros((Hn,Wn),bool)
can[PAD:PAD+H,PAD:PAD+W]=im;kn[PAD:PAD+H,PAD:PAD+W]=known
# drop a 1px fringe of known pixels next to background (dark halo)
k2=kn.copy()
for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):k2&=np.roll(np.roll(kn,dy,0),dx,1)
kn=k2
need=(m>0)&~kn
for it in range(60):
  if not need.any():break
  acc=np.zeros((Hn,Wn,3));cnt=np.zeros((Hn,Wn))
  for dy in(-1,0,1):
    for dx in(-1,0,1):
      if dy==dx==0:continue
      sh=np.roll(np.roll(kn,dy,0),dx,1);sc=np.roll(np.roll(can[...,:3],dy,0),dx,1)
      acc+=sc*sh[...,None];cnt+=sh
  fill=need&(cnt>0)
  can[fill,:3]=acc[fill]/cnt[fill][:,None];kn|=fill;need&=~fill
can[...,3]=m*255
out=Image.fromarray(np.clip(can,0,255).astype(np.uint8),'RGBA');bb=out.getbbox();out=out.crop(bb);print(bb,out.size)
out.save(d+'/stone2.png')
