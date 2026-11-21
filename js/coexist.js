// c009 자연선택 — 새로운 공존의 시작. 신예진 작가의 나무와 기계 작업에서 출발한 ARTMOS 3D 기획 전시.
// v2 (2026-11-21 소유자: 하나뿐이라 짧다 → 여러 장으로 쭉, 실제 질감으로):
//   세로 스크롤 한 줄. 장이 바뀌면 카메라가 안개 속을 날아 다음 작품으로 감.
//   1 신성한 숲(도자기 탑 + 엔진을 품은 나무: 엔진 누르기·나무 문지르기·공존)
//   2 이끼가 덮은 나무(문지르면 그 자리부터 이끼가 번짐)
//   3 기계를 품은 조각(받침 위 조각 셋, 옆으로 밀어 돌리면 톱니·베어링이 맞물려 돎)
//   4 빛을 내는 존재(꾹 누르고 있으면 빛 고리와 전조등 눈이 깨어남)
//   5 맺음
// 모양은 모두 코드로 새로 만든 재해석(작품 사진 없음). 질감은 CC0 스캔(assets/coexist/tex, README 참고).
// 소리는 earshot으로 만든 파일(assets/coexist/snd). 휴대폰은 기울이면 시점이 조금 움직임. #debug면 window.__co.
import * as THREE from './vendor/three.module.js';
import { sensor, IS_MOBILE, keepAwake } from './sensors.js?v=6';
const IN_FRAME = window !== window.top;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const $=id=>document.getElementById(id);
const PORTRAIT=innerWidth<innerHeight;

/* ---------- renderer / scene ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true,canvas:$('co-gl')});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,IS_MOBILE?1.75:2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.useLegacyLights=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x000000);
scene.fog=new THREE.FogExp2(0x0b0b0c,0.06);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.05,120);

// 반사용 주변 빛(어두운 전시장 + 위 조명 판) — 쇠·도자기가 실제처럼 빛을 되비침
(function makeEnv(){
  const s=new THREE.Scene();const g=new THREE.SphereGeometry(10,32,16);const pos=g.attributes.position;const col=[];
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/10;const c=y>0?0.03+0.2*y*y:0.015;col.push(c,c*0.96,c*0.9);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  s.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const panel=(w,h,x,y,z,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(k,k*0.95,k*0.86),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);s.add(m);};
  panel(6,3,0,8,2,4);panel(3,4,-7,3,-3,1.4);panel(2,5,7,2,4,1);panel(8,1,0,-2,-8,0.4);
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(s,0.04).texture;pm.dispose();
})();

scene.add(new THREE.HemisphereLight(0x9aa0a8,0x0a0806,0.3));
const key=new THREE.SpotLight(0xfff1dd,2.4,34,0.6,0.65,1.1);
key.position.set(3,9,6);key.target.position.set(0.4,2.4,0);key.castShadow=true;
key.shadow.mapSize.set(IS_MOBILE?1024:2048,IS_MOBILE?1024:2048);key.shadow.bias=-0.0006;key.shadow.normalBias=0.02;
scene.add(key,key.target);
const rim=new THREE.DirectionalLight(0x8899aa,0.55);rim.position.set(-5,4,-6);scene.add(rim,rim.target);

/* ---------- textures ---------- */
const TL=new THREE.TextureLoader();
function tex(n,srgb,rep){const t=TL.load('assets/coexist/tex/'+n);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(rep)t.repeat.set(rep,rep);return t;}
const BARK={map:tex('bark_diff.jpg',1),normalMap:tex('bark_nor.jpg')};
const METAL={map:tex('metal_diff.jpg',1),normalMap:tex('metal_nor.jpg'),roughnessMap:tex('metal_rough.jpg')};
function softTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const SOFT=softTex();
function inkTex(){ // 백자 탑에 그린 먹 무늬(직접 그린 무늬)
  const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d');
  g.fillStyle='#f3efe6';g.fillRect(0,0,256,512);
  for(let i=0;i<40;i++){g.strokeStyle=`rgba(${20+rnd(0,25)},${22+rnd(0,25)},${28+rnd(0,25)},${rnd(.5,.9)})`;g.lineWidth=rnd(1.5,7);g.lineCap='round';
    const x=rnd(0,256),y=rnd(0,512);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+rnd(-30,30),y+rnd(-30,30),x+rnd(-40,40),y+rnd(-20,20));g.stroke();}
  for(let i=0;i<12;i++){const x=rnd(10,246),y=rnd(10,500),s=rnd(5,12);g.fillStyle=`rgba(25,25,30,${rnd(.6,.9)})`;
    g.beginPath();g.ellipse(x-s*.6,y,s*.7,s*.4,-.6,0,7);g.ellipse(x+s*.6,y,s*.7,s*.4,.6,0,7);g.fill();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}

/* ---------- 바닥 ---------- */
const floorMat=new THREE.MeshStandardMaterial({map:tex('floor_diff.jpg',1,70),normalMap:tex('floor_nor.jpg',0,70),roughnessMap:tex('floor_rough.jpg',0,70),
  color:0x55524e,roughness:.55,metalness:0,envMapIntensity:.6});
const floor=new THREE.Mesh(new THREE.CircleGeometry(260,64),floorMat);
floor.rotation.x=-Math.PI/2;floor.position.x=90;floor.receiveShadow=true;scene.add(floor);

/* ---------- 장 위치 ---------- */
const CH_POS=[V(0,0,0),V(60,0,0),V(120,0,0),V(180,0,0)];
const VIEW=[
  {t:V(0.45,2.5,0),r:PORTRAIT?9.6:7.2,phi:.12},
  {t:V(0,1.9,0),r:PORTRAIT?7.4:5.8,phi:.16},
  {t:V(0,1.35,0),r:PORTRAIT?9.4:7,phi:.2},
  {t:V(-0.2,2.1,0),r:PORTRAIT?11.5:8.6,phi:.13},
  {t:V(0.45,2.6,0),r:PORTRAIT?21:17,phi:.55,at:0}];

/* ---------- 나무 만들기(합친 한 덩어리) ---------- */
let geos=[],branchPts=[],tips=[];
const UP=V(0,1,0);
function addSeg(a,b,r0,r1){
  const d=b.clone().sub(a),h=d.length();if(h<1e-4)return;
  const g=new THREE.CylinderGeometry(r1,r0,h,9,1,true);
  const pos=g.attributes.position,uv=g.attributes.uv;const ru=Math.max(1,Math.round(r0*8));
  for(let i=0;i<pos.count;i++){const j=0.08*r0;pos.setX(i,pos.getX(i)+rnd(-j,j));pos.setZ(i,pos.getZ(i)+rnd(-j,j));
    uv.setX(i,uv.getX(i)*ru);uv.setY(i,uv.getY(i)*h*1.3+a.y*1.3);}
  g.translate(0,h/2,0);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.normalize()));g.translate(a.x,a.y,a.z);geos.push(g);
  const s=new THREE.SphereGeometry(r0*1.02,9,6);s.translate(a.x,a.y,a.z);geos.push(s);
}
function chain(pts,r0,r1){for(let i=0;i<pts.length-1;i++){const t0=i/(pts.length-1),t1=(i+1)/(pts.length-1);
  const ra=r0+(r1-r0)*t0,rb=r0+(r1-r0)*t1;addSeg(pts[i],pts[i+1],ra,rb);branchPts.push({p:pts[i+1].clone(),r:rb});}}
function grow(p,dir,len,r,depth,path,lift=1){
  let cur=p.clone(),d=dir.clone();const pts=[cur.clone()];const segs=4;const rEnd=r*0.62;
  for(let i=0;i<segs;i++){d.add(V(rnd(-.35,.35),rnd(-.15,.3)*lift,rnd(-.35,.35))).normalize();
    const nx=cur.clone().addScaledVector(d,len/segs);const ra=r+(rEnd-r)*i/segs,rb=r+(rEnd-r)*(i+1)/segs;addSeg(cur,nx,ra,rb);
    branchPts.push({p:nx.clone(),r:rb});cur=nx;pts.push(cur.clone());}
  const np=path.concat(pts);
  if(depth===0||rEnd<0.018){tips.push(np);return;}
  const kids=depth>=3?2:(Math.random()<.5?2:3);
  for(let k=0;k<kids;k++){const axis=V(rnd(-1,1),rnd(-.2,.2),rnd(-1,1)).normalize();
    const nd=d.clone().applyAxisAngle(axis,rnd(.4,.95));nd.y=Math.max(nd.y,-.1);nd.normalize();
    grow(cur,nd,len*rnd(.62,.8),rEnd*rnd(.62,.8),depth-1,np,lift);}
}
function roots(c,n,y0,r0,L0,L1){for(let k=0;k<n;k++){const a=k/n*6.28+rnd(-.3,.3),L=rnd(L0,L1);const pts=[V(c.x,y0,c.z)];
  for(let i=1;i<=6;i++){const t=i/6;pts.push(V(c.x+Math.cos(a+t*rnd(-.4,.4))*L*t,y0*(1-t)+0.04+c.y,c.z+Math.sin(a+t*rnd(-.4,.4))*L*t));}
  chain(pts,r0,0.025);}}
function merge(list){
  let n=0,ni=0;list.forEach(g=>{n+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;});
  const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),I=new Uint32Array(ni);let o=0,oi=0;
  list.forEach(g=>{const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);
    if(g.attributes.uv)U.set(g.attributes.uv.array,o*2);
    if(g.index){const a=g.index.array;for(let i=0;i<a.length;i++)I[oi++]=a[i]+o;}else{for(let i=0;i<c;i++)I[oi++]=i+o;}
    o+=c;g.dispose();});
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));
  m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('uv',new THREE.BufferAttribute(U,2));
  m.setIndex(new THREE.BufferAttribute(I,1));m.computeVertexNormals();return m;}
function buildWood(fn){const saved=[geos,branchPts,tips];geos=[];branchPts=[];tips=[];fn();
  const out={geo:merge(geos),pts:branchPts,tips};[geos,branchPts,tips]=saved;return out;}
const woodMat=(color)=>new THREE.MeshStandardMaterial({...BARK,color,roughness:.95,metalness:0,normalScale:new THREE.Vector2(1.3,1.3),envMapIntensity:.35});
const shadowy=(o)=>{o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return o;};

/* 공용 쇠 재질 */
const steel=new THREE.MeshStandardMaterial({...METAL,color:0x80858c,metalness:.85,roughness:1,envMapIntensity:1.1});
const dark=new THREE.MeshStandardMaterial({...METAL,color:0x3f4247,metalness:.8,roughness:1,envMapIntensity:.9});
const bright=new THREE.MeshStandardMaterial({color:0xbfc3c9,metalness:1,roughness:.24,envMapIntensity:1.3});
const cableMat=new THREE.MeshStandardMaterial({color:0x0c0c0c,roughness:.55,metalness:.2});
function gearGeo(r,teeth,depth){const s=new THREE.Shape();
  for(let i=0;i<teeth*2;i++){const a=i/(teeth*2)*Math.PI*2,rr=i%2?r*0.84:r,a2=a+Math.PI/(teeth*2);
    if(i===0)s.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else s.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);s.lineTo(Math.cos(a2)*rr,Math.sin(a2)*rr);}
  const hole=new THREE.Path();hole.absarc(0,0,r*0.3,0,Math.PI*2,true);s.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);return g;}
function cables(from,n,spread,y0){const cg=[];for(let k=0;k<n;k++){
  const sx=from.x+rnd(-spread,spread),sz=from.z+rnd(-.2,.3);const ex=sx+rnd(-.6,.6),ez=sz+rnd(.1,.9);const R=rnd(.12,.32);
  const pts=[V(sx,y0,sz),V(sx+rnd(-.1,.1),y0*.5,sz+rnd(0,.2)),V(ex,0.35,ez)];
  for(let i=0;i<=24;i++){const a=i/24*Math.PI*4+rnd(0,.2);pts.push(V(ex+Math.cos(a)*R*(1-i/60),0.012+i*0.0008,ez+Math.sin(a)*R*(1-i/60)));}
  cg.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,0.011,5));}
  const m=new THREE.Mesh(merge(cg),cableMat);m.castShadow=true;return m;}
function chains(points,top){const per=Math.ceil((top-points[0].y)/0.06);const im=new THREE.InstancedMesh(new THREE.TorusGeometry(0.035,0.011,6,12),bright,per*points.length);
  const o=new THREE.Object3D();let k=0;points.forEach(w=>{for(let i=0;i<per;i++){o.position.set(w.x,w.y+0.05+i*0.06,w.z);o.rotation.set(0,i%2?Math.PI/2:0,Math.PI/2);o.updateMatrix();im.setMatrixAt(k++,o.matrix);}});
  return im;}

/* ===================== 1장 · 신성한 숲 ===================== */
const DRY=new THREE.Color(0x8f8a84),ALIVE=new THREE.Color(0xffffff);
const t1=buildWood(()=>{
  grow(V(0,0,0),V(0.05,1,0),3.3,0.34,4,[]);
  roots(V(0,0,0),6,0.35,0.2,1.2,2.4);
  chain([V(0.02,1.85,0.18),V(0.55,1.98,0.58),V(1.15,2.45,0.56),V(1.45,3.05,0.25),V(1.75,3.6,-0.05),V(1.9,4.1,-0.1)],0.13,0.03);
  chain([V(0,2.95,-0.18),V(0.7,2.98,-0.55),V(1.3,2.7,-0.5),V(1.62,2.2,-0.2),V(1.7,1.7,0.05)],0.1,0.025);
  chain([V(0.05,2.2,0),V(0.6,1.75,-0.35),V(1.0,1.6,-0.1),V(1.3,1.75,0.3)],0.08,0.02);
});
const treeMat=woodMat(DRY.clone());treeMat.emissive=new THREE.Color(0x1a0d00);treeMat.emissiveIntensity=0;
const tree=new THREE.Mesh(t1.geo,treeMat);tree.castShadow=tree.receiveShadow=true;scene.add(tree);
// 엔진
const E=new THREE.Group();const EBASE=V(0.78,2.32,0.12);E.position.copy(EBASE);E.rotation.set(0.05,-0.35,0.08);scene.add(E);
const glowMat=new THREE.MeshStandardMaterial({color:0x222222,emissive:0xffd9a0,emissiveIntensity:0});
const add=(g,m,x,y,z,par=E)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);par.add(o);return o;};
add(new THREE.BoxGeometry(1.15,0.82,0.78),dark,0,0,0);
add(new THREE.BoxGeometry(1.22,0.24,0.84),steel,0,0.53,0);
add(new THREE.BoxGeometry(1.0,0.12,0.6),bright,0,0.7,0);
for(let i=0;i<4;i++)add(new THREE.BoxGeometry(0.04,0.5,0.02),glowMat,-0.42+i*0.28,-0.02,0.395);
for(let i=0;i<4;i++){const z=-0.28+i*0.19;add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-0.55,0.62,z),V(-1.0,0.75,z),V(-0.95,0.05,z*0.6)),16,0.045,8),bright,0,0,0);}
add(new THREE.CylinderGeometry(0.11,0.11,0.9,10),steel,-0.95,-0.2,0).rotation.x=Math.PI/2;
const valves=[];for(let i=0;i<4;i++)valves.push(add(new THREE.CylinderGeometry(0.035,0.035,0.18,8),bright,-0.36+i*0.24,0.82,0));
function pulley(r,x,y){const g=new THREE.Group();
  const w=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.08,28),steel);w.rotation.x=Math.PI/2;g.add(w);
  for(let k=0;k<4;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(r*1.6,0.03,0.1),dark);s.rotation.z=k*Math.PI/4;g.add(s);}
  const h=new THREE.Mesh(new THREE.CylinderGeometry(r*0.25,r*0.25,0.14,12),bright);h.rotation.x=Math.PI/2;g.add(h);
  g.position.set(x,y,0.45);E.add(g);return g;}
const crank=pulley(0.22,0.2,-0.22),cam=pulley(0.19,0.3,0.42),alt=pulley(0.11,-0.32,0.3);
const camGear=add(new THREE.Mesh(gearGeo(0.16,18,0.05)).geometry,bright,0.3,0.42,0.5);
const sideGear=add(gearGeo(0.12,12,0.05),bright,0.62,0.05,0.42);
add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.2,-0.45,0.45),V(0.44,-0.2,0.45),V(0.5,0.42,0.45),V(0.3,0.62,0.45),V(-0.32,0.42,0.45),V(-0.44,0.3,0.45),V(-0.05,-0.3,0.45)],true),60,0.018,6,true),cableMat,0,0,0);
shadowy(E);
scene.add(cables(EBASE,7,.45,EBASE.y-0.35));
E.updateMatrixWorld();scene.add(chains([E.localToWorld(V(-0.4,0.6,0)),E.localToWorld(V(0.45,0.6,0))],5));
const engineLight=new THREE.PointLight(0xffe2b0,0,6,2);scene.add(engineLight);
// 백자 탑 숲(먹 무늬 도자기를 쌓은 탑 10개)
const porcelain=new THREE.MeshPhysicalMaterial({map:inkTex(),color:0xffffff,roughness:.2,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1});
function pillarGeo(){const pts=[V(0,0,0)];let y=0;const n=3+((Math.random()*3)|0);
  for(let k=0;k<n;k++){const u=rnd(.32,.55),w=rnd(.85,1.2);
    [[.13,0],[.2,.05],[.27,.35],[.22,.7],[.1,.85],[.12,.93],[.2,1]].forEach(([r,f])=>pts.push(new THREE.Vector2(r*w,y+f*u)));y+=u;}
  pts.push(new THREE.Vector2(0,y));const g=new THREE.LatheGeometry(pts.slice(1).map(p=>new THREE.Vector2(p.x,p.y)),30);return g;}
for(let i=0;i<10;i++){const a=i/10*Math.PI*2+rnd(-.15,.15),R=rnd(2.7,4.3);const m=new THREE.Mesh(pillarGeo(),porcelain);
  m.position.set(Math.cos(a)*R+0.3,0,Math.sin(a)*R);m.rotation.y=rnd(0,6);m.castShadow=m.receiveShadow=true;scene.add(m);}
// 이끼·새싹 (공존하면 자라고 남음)
const MOSS=360;const moss=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),MOSS);
const mossData=[];const tmp=new THREE.Object3D();const cA=new THREE.Color(0x8fb33a),cB=new THREE.Color(0xd6c94a),cC=new THREE.Color(0x4f7a32);
{const cand=t1.pts.filter(b=>b.p.y>0.25);for(let i=0;i<MOSS;i++){const b=cand[(Math.random()*cand.length)|0];
  const off=V(rnd(-1,1),rnd(-.4,1),rnd(-1,1)).normalize().multiplyScalar(b.r*0.9);
  mossData.push({p:b.p.clone().add(off),s:rnd(.025,.07)*(b.r>.12?1.3:1),th:Math.random(),rot:V(rnd(0,3),rnd(0,3),rnd(0,3))});
  moss.setColorAt(i,Math.random()<.6?cA.clone().lerp(cC,Math.random()):cB.clone().lerp(cA,Math.random()*.5));}
 moss.instanceColor.needsUpdate=true;}
scene.add(moss);let mossShown=-1;
function updateMoss(g){if(Math.abs(g-mossShown)<0.003)return;mossShown=g;
  for(let i=0;i<MOSS;i++){const d=mossData[i];const s=d.s*clamp((g-d.th*0.9)*6,0,1);
    tmp.position.copy(d.p);tmp.rotation.set(d.rot.x,d.rot.y,d.rot.z);tmp.scale.setScalar(Math.max(s,1e-4));tmp.updateMatrix();moss.setMatrixAt(i,tmp.matrix);}
  moss.instanceMatrix.needsUpdate=true;}
updateMoss(0);
// 엔진 빛이 가지로 흐름
const NS=160;const sapPaths=[];
t1.tips.forEach(t=>{const i=t.findIndex(p=>p.y>2.1);if(i>=0)sapPaths.push([EBASE.clone()].concat(t.slice(i)));});
if(!sapPaths.length)sapPaths.push([EBASE.clone(),V(0,4,0),V(0.5,6,0)]);
const sapPos=new Float32Array(NS*3);const sap=[];for(let i=0;i<NS;i++)sap.push({path:sapPaths[(Math.random()*sapPaths.length)|0],s:Math.random()*8,v:rnd(.6,1.4)});
const sapGeo=new THREE.BufferGeometry();sapGeo.setAttribute('position',new THREE.BufferAttribute(sapPos,3));
const sapMat=new THREE.PointsMaterial({size:0.07,map:SOFT,color:0xfff0c8,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
scene.add(new THREE.Points(sapGeo,sapMat));

/* ===================== 2장 · 이끼가 덮은 나무 ===================== */
const C2=CH_POS[1];
const plinthMat=new THREE.MeshStandardMaterial({color:0x26272a,roughness:.5,metalness:.15,envMapIntensity:.6});
{const p=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.55,0.5,48),plinthMat);p.position.set(C2.x,0.25,C2.z);p.castShadow=p.receiveShadow=true;scene.add(p);}
const t2=buildWood(()=>{
  const b=V(C2.x,0.5,C2.z);
  grow(b,V(0.15,1,0.05),2.3,0.24,3,[]);
  grow(b.clone().add(V(0.1,0.1,0)),V(-0.9,0.5,0.2),1.2,0.12,2,[],0.5);
  grow(b.clone().add(V(-0.1,0.05,0.1)),V(0.8,0.35,-0.5),1.0,0.1,2,[],0.4);
  roots(b,4,0.25,0.12,0.6,1.1);
});
const wood2=new THREE.Mesh(t2.geo,woodMat(0xe9dfd0));wood2.castShadow=wood2.receiveShadow=true;scene.add(wood2);
const M2=900;const moss2=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({roughness:1,flatShading:true,envMapIntensity:.4}),M2);
const m2d=[];{const Y=[new THREE.Color(0xe0c63a),new THREE.Color(0xc9c23c),new THREE.Color(0xa3b33a),new THREE.Color(0xd99a6a),new THREE.Color(0x7f9a35)];
  const cand=t2.pts;for(let i=0;i<M2;i++){const b=cand[(Math.random()*cand.length)|0];const n=V(rnd(-1,1),rnd(-.2,1),rnd(-1,1)).normalize();
    m2d.push({p:b.p.clone().addScaledVector(n,b.r*rnd(.7,1.05)),s:rnd(.03,.085)*(b.r>.1?1.2:.8),rot:V(rnd(0,3),rnd(0,3),rnd(0,3)),v:0});
    const c=Y[(Math.random()<.08)?3:((Math.random()*5)|0)%5].clone();c.offsetHSL(rnd(-.02,.02),0,rnd(-.08,.06));moss2.setColorAt(i,c);}
  moss2.instanceColor.needsUpdate=true;}
moss2.castShadow=true;scene.add(moss2);
// 산호·자갈(받침 위)
{const coral=buildWood(()=>{for(let k=0;k<5;k++){const a=rnd(0,6.28),r=rnd(.4,1.1);grow(V(C2.x+Math.cos(a)*r,0.5,C2.z+Math.sin(a)*r),V(rnd(-.3,.3),1,rnd(-.3,.3)),.35,.03,2,[]);}});
 const cm=new THREE.Mesh(coral.geo,new THREE.MeshStandardMaterial({color:0xf3ede2,roughness:.75}));cm.castShadow=true;scene.add(cm);
 const n=90,pm=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xcfc8bc,roughness:.85}),n);
 for(let i=0;i<n;i++){const a=rnd(0,6.28),r=Math.sqrt(Math.random())*1.4,s=rnd(.02,.07);tmp.position.set(C2.x+Math.cos(a)*r,0.5+s*.4,C2.z+Math.sin(a)*r);
   tmp.scale.set(s,s*.6,s);tmp.rotation.set(rnd(0,3),rnd(0,3),0);tmp.updateMatrix();pm.setMatrixAt(i,tmp.matrix);
   pm.setColorAt(i,new THREE.Color().setHSL(rnd(0,1),rnd(.05,.4),rnd(.55,.85)));}
 pm.instanceColor.needsUpdate=true;scene.add(pm);}
const seeds=[{p:V(C2.x+0.1,0.8,C2.z),r:0,max:.45},{p:V(C2.x-0.4,1.6,C2.z),r:0,max:.3}];let mossPct=0;
function updateMoss2(dt){let any=false;seeds.forEach(s=>{if(s.r<s.max){s.r=Math.min(s.max,s.r+dt*0.22);any=true;}});
  if(!any&&updateMoss2.done)return;updateMoss2.done=!any;let vis=0;
  for(let i=0;i<M2;i++){const d=m2d[i];let g=0;for(const s of seeds){const v=(s.r-d.p.distanceTo(s.p))*4;if(v>g)g=v;}
    g=clamp(g,0,1);d.v=g;if(g>.5)vis++;tmp.position.copy(d.p);tmp.rotation.set(d.rot.x,d.rot.y,d.rot.z);tmp.scale.setScalar(Math.max(d.s*g,1e-4));tmp.updateMatrix();moss2.setMatrixAt(i,tmp.matrix);}
  moss2.instanceMatrix.needsUpdate=true;mossPct=vis/M2;}
function seedMoss(p){let near=null;for(const s of seeds)if(s.p.distanceTo(p)<.3){near=s;break;}
  if(near){near.max=Math.min(1.6,near.max+.06);}else if(seeds.length<48)seeds.push({p:p.clone(),r:0,max:.5});updateMoss2.done=false;}

/* ===================== 3장 · 기계를 품은 조각 ===================== */
const C3=CH_POS[2];const tables=[];
for(let i=0;i<3;i++){const x=C3.x+(i-1)*2.7;
  const pl=new THREE.Mesh(new THREE.CylinderGeometry(.78,.82,1.0,48),new THREE.MeshStandardMaterial({color:0x111214,roughness:.35,metalness:.2,envMapIntensity:.8}));
  pl.position.set(x,.5,C3.z);pl.castShadow=pl.receiveShadow=true;scene.add(pl);
  const tt=new THREE.Group();tt.position.set(x,1.0,C3.z);tt.userData={idx:i,vel:0,rot:0,parts:[]};scene.add(tt);
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,.03,48),new THREE.MeshStandardMaterial({color:0x0a0a0a,roughness:.3,metalness:.3}));plate.position.y=.015;tt.add(plate);
  const w=buildWood(()=>{grow(V(0,0.03,0),V(rnd(-.3,.3),1,rnd(-.3,.3)),1.0+i*.2,0.13,2,[]);grow(V(.1,0.03,.05),V(.8,.45,.2),.7,.07,1,[],.5);roots(V(0,0,0),3,0.1,.06,.3,.55);});
  const wm=new THREE.Mesh(w.geo,woodMat(0xd9cbb8));wm.castShadow=wm.receiveShadow=true;tt.add(wm);
  const sp=w.pts.filter(b=>b.p.y>.3&&b.p.y<1.1);
  const put=(o,b)=>{o.position.copy(b.p);o.lookAt(b.p.clone().add(V(rnd(-1,1),rnd(-.2,.4),1)));tt.add(o);};
  const g1=new THREE.Mesh(gearGeo(.17,16,.05),bright);put(g1,sp[(sp.length*.3)|0]||{p:V(0,.6,0)});tt.userData.parts.push({o:g1,k:3});
  const g2=new THREE.Mesh(gearGeo(.1,11,.05),steel);put(g2,sp[(sp.length*.6)|0]||{p:V(.1,.8,0)});tt.userData.parts.push({o:g2,k:-5});
  const bear=new THREE.Group();bear.add(new THREE.Mesh(new THREE.TorusGeometry(.14,.025,10,32),bright));
  for(let k=0;k<10;k++){const b=new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),steel);const a=k/10*6.28;b.position.set(Math.cos(a)*.14,Math.sin(a)*.14,0);bear.add(b);}
  put(bear,sp[(sp.length*.85)|0]||{p:V(0,1,0)});tt.userData.parts.push({o:bear,k:2});
  const hel=[];for(let k=0;k<=80;k++){const a=k/80*Math.PI*10;hel.push(V(Math.cos(a)*.05,k/80*.35,Math.sin(a)*.05));}
  const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hel),200,.008,6),bright);put(spring,sp[(sp.length*.45)|0]||{p:V(0,.5,0)});
  const pipe=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(.3,.05,.2),V(.35,.4,.25),V(.15,.7,.1),V(.05,.9,0)]),40,.025,8),dark);tt.add(pipe);
  const n=26,pm=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xd8d2c8,roughness:.85}),n);
  for(let k=0;k<n;k++){const a=rnd(0,6.28),r=rnd(.2,.62),s=rnd(.02,.06);tmp.position.set(Math.cos(a)*r,.03+s*.4,Math.sin(a)*r);tmp.scale.set(s,s*.6,s);tmp.rotation.set(rnd(0,3),rnd(0,3),0);tmp.updateMatrix();pm.setMatrixAt(k,tmp.matrix);
    pm.setColorAt(k,new THREE.Color().setHSL(rnd(0,1),rnd(.05,.45),rnd(.5,.85)));}
  pm.instanceColor.needsUpdate=true;tt.add(pm);
  shadowy(tt);tables.push(tt);}
let spinAmt=0,tickAcc=0;

/* ===================== 4장 · 빛을 내는 존재 ===================== */
const C4=CH_POS[3];const BODY=V(C4.x,2.55,C4.z);
const creature=new THREE.Group();scene.add(creature);
const t4=buildWood(()=>{
  for(let k=0;k<7;k++){const a=k/7*6.28;grow(BODY.clone().add(V(rnd(-.2,.2),rnd(-.1,.2),rnd(-.2,.2))),V(Math.cos(a),rnd(-.2,.5),Math.sin(a)*.6),rnd(.6,1.1),.11,2,[],.3);}
  const legEnds=[[-2.6,1.6],[-2.9,-1.2],[0.2,2.6],[0.4,-2.7],[2.7,1.4],[2.9,-1.3]];
  legEnds.forEach(([dx,dz])=>{const s=BODY.clone().add(V(dx*.15,-.1,dz*.15)),e=V(C4.x+dx,0.02,C4.z+dz);
    const m=s.clone().lerp(e,.42);m.y=BODY.y+rnd(.4,.9);chain([s,s.clone().lerp(m,.5).add(V(0,.15,0)),m,m.clone().lerp(e,.5).add(V(rnd(-.2,.2),.2,rnd(-.2,.2))),e],.09,.025);});
});
const body4=new THREE.Mesh(t4.geo,woodMat(0xc9b6a0));body4.castShadow=body4.receiveShadow=true;creature.add(body4);
{const blk=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.6),steel);blk.position.copy(BODY).add(V(.35,0,0));blk.rotation.set(.1,.3,-.05);creature.add(blk);
 const fin=new THREE.Mesh(gearGeo(.25,20,.06),bright);fin.position.copy(BODY).add(V(.5,.05,.32));creature.add(fin);}
const head=new THREE.Group();head.position.copy(BODY).add(V(-1.05,.35,.1));head.rotation.set(0,-.25,.12);creature.add(head);
{const hs=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,.32,40,1,true),bright);hs.rotation.z=Math.PI/2;head.add(hs);
 const back=new THREE.Mesh(new THREE.SphereGeometry(.4,32,16,0,Math.PI*2,0,Math.PI/2),dark);back.rotation.z=Math.PI/2;back.position.x=.16;head.add(back);}
const lensMat=new THREE.MeshStandardMaterial({color:0xddeeff,emissive:0xfff6e6,emissiveIntensity:.05,roughness:.1,metalness:0,envMapIntensity:1.5});
const lens=new THREE.Mesh(new THREE.SphereGeometry(.33,32,16),lensMat);lens.scale.set(.35,1,1.2);lens.position.x=-.17;head.add(lens);
const headLight=new THREE.SpotLight(0xfff3dc,0,14,.5,.6,1.2);headLight.position.copy(BODY).add(V(-1.3,.35,.1));headLight.target.position.set(C4.x-4,0,C4.z+1);scene.add(headLight,headLight.target);
const tubeMat=new THREE.MeshStandardMaterial({color:0x333333,emissive:0xfff1d6,emissiveIntensity:.03,roughness:.3});
const tubes=[];for(let k=0;k<5;k++){const r=rnd(.45,.95);const m=new THREE.Mesh(new THREE.TorusGeometry(r,.022,8,64,rnd(3.2,5.2)),tubeMat);m.position.copy(BODY).add(V(rnd(-.4,.6),rnd(-.15,.25),rnd(-.2,.2)));m.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3));creature.add(m);tubes.push(m);}
const bodyLight=new THREE.PointLight(0xffe7c4,0,7,2);bodyLight.position.copy(BODY);scene.add(bodyLight);
creature.add(cables(BODY,6,.5,BODY.y-.25));
scene.add(chains([BODY.clone().add(V(-.3,.3,0)),BODY.clone().add(V(.5,.3,0))],8));
shadowy(creature);
let wake=0,holding=false,woke=false;

/* ===================== 움직이는 배경 (모든 장 공통, 지금 장을 따라감) ===================== */
const sky=new THREE.Mesh(new THREE.SphereGeometry(40,48,24),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{uT:{value:0},uS:{value:0},uL:{value:0},uH:{value:0}},
  vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`precision highp float;varying vec3 vD;uniform float uT,uS,uL,uH;
  float h(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fb(vec3 p){float a=.5,s=0.;for(int k=0;k<4;k++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
  void main(){vec3 d=normalize(vD);float y=d.y;vec2 p=vec2(atan(d.z,d.x)*1.9,y*2.6);
    float q=fb(vec3(p*1.3,uT*.04));
    float w=fb(vec3(p*2.0+vec2(q*2.2,-uT*.16),uT*.06));
    float v=fb(vec3(p*3.1-vec2(uT*.03,q*1.5),uT*.05+3.));
    vec3 c=vec3(.012,.011,.014);
    c+=vec3(1.,.52,.16)*smoothstep(.56,.92,w)*(.07+.6*uS)*(1.-.45*uH);
    c+=vec3(.9,.35,.08)*pow(smoothstep(.62,.98,w),3.)*(.4*uS);
    c+=mix(vec3(.3,.72,.32),vec3(.25,.62,.7),q)*smoothstep(.52,.9,v)*(.05+.45*uL);
    c+=vec3(.95,.86,.62)*pow(max(0.,y),3.)*(.12+.5*uH);
    c+=vec3(.55,.42,.3)*exp(-abs(y+.05)*7.)*(.04+.1*uH);
    vec2 g=floor(p*42.);float s=h(vec3(g,7.));float tw=step(.992,s)*(.5+.5*sin(uT*(2.+s*3.)+s*60.));
    c+=vec3(1.,.9,.7)*tw*(.35+.5*uH);
    gl_FragColor=vec4(c,1.);}`
}));
sky.renderOrder=-10;scene.add(sky);
const decor=new THREE.Group();scene.add(decor);
const bigGearMat=new THREE.MeshStandardMaterial({...METAL,color:0x4a3f33,metalness:.9,roughness:1,emissive:0xff8a2a,emissiveIntensity:0,envMapIntensity:.8});
const bigGears=[];for(let i=0;i<9;i++){const r=rnd(1.4,3.2);const m=new THREE.Mesh(gearGeo(r,Math.round(r*9),0.25),bigGearMat);
  const a=i/9*Math.PI*2+rnd(-.2,.2),R=rnd(13,17);m.position.set(Math.cos(a)*R,rnd(1,8),Math.sin(a)*R);m.lookAt(0,m.position.y,0);
  m.userData={v:rnd(.15,.35)*(i%2?1:-1)};decor.add(m);bigGears.push(m);}
const wingShape=new THREE.Shape();wingShape.moveTo(0,0);
wingShape.bezierCurveTo(.08,.22,.32,.34,.36,.16);wingShape.bezierCurveTo(.38,.04,.2,0,0,0);
wingShape.bezierCurveTo(.18,-.02,.3,-.1,.26,-.2);wingShape.bezierCurveTo(.2,-.28,.06,-.16,0,0);
const wingGeo=new THREE.ShapeGeometry(wingShape,10);wingGeo.rotateX(-Math.PI/2);
const leafMat=new THREE.MeshStandardMaterial({color:0x9cc24a,roughness:.7,side:THREE.DoubleSide,emissive:0x2c4a10,emissiveIntensity:.4});
const leafMat2=new THREE.MeshStandardMaterial({color:0xd8c24c,roughness:.7,side:THREE.DoubleSide,emissive:0x3a3410,emissiveIntensity:.4});
const brassMat=new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:.9,roughness:.28,side:THREE.DoubleSide,emissive:0x5a3208,emissiveIntensity:.5});
const flies=[];
for(let i=0;i<24;i++){const metal=i%2===1;const g=new THREE.Group();const mat=metal?brassMat:(i%4===0?leafMat2:leafMat);
  const wl=new THREE.Group(),wr=new THREE.Group();const ml=new THREE.Mesh(wingGeo,mat),mr=new THREE.Mesh(wingGeo,mat);mr.scale.x=-1;
  wl.add(ml);wr.add(mr);g.add(wl,wr);
  const bd=new THREE.Mesh(new THREE.CylinderGeometry(.012,.008,.16,5),metal?bright:new THREE.MeshStandardMaterial({color:0x3a2a1a}));bd.rotation.x=Math.PI/2;g.add(bd);
  g.userData={metal,wl,wr,R:rnd(1.6,4.6),h:rnd(1.2,6.2),w:rnd(.25,.6)*(Math.random()<.5?1:-1),a:rnd(0,6.28),ph:rnd(0,6.28),f:rnd(9,14),s:0,k:(i>>1)/12};
  g.scale.setScalar(.001);decor.add(g);flies.push(g);}
const NP=520;const pPos=new Float32Array(NP*3),pCol=new Float32Array(NP*3),pv=[];
for(let i=0;i<NP;i++){const a=rnd(0,6.28),r=Math.sqrt(Math.random())*7;pPos[i*3]=Math.cos(a)*r;pPos[i*3+1]=rnd(0,10);pPos[i*3+2]=Math.sin(a)*r;
  const warm=i%2;pCol[i*3]=warm?1:.6;pCol[i*3+1]=warm?.7:.95;pCol[i*3+2]=warm?.35:.45;pv.push({v:rnd(.15,.5),sw:rnd(0,6.28),warm});}
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pMat=new THREE.PointsMaterial({size:.06,map:SOFT,vertexColors:true,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});
decor.add(new THREE.Points(pGeo,pMat));
const beam=new THREE.Mesh(new THREE.ConeGeometry(3.2,11,40,1,true),new THREE.MeshBasicMaterial({color:0xfff1d8,transparent:true,opacity:.04,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false}));
beam.position.set(0.4,5.6,0);decor.add(beam);
const tmpV=new THREE.Vector3();
function updateBackdrop(dt,t,S,L,H){
  const U=sky.material.uniforms;U.uT.value=t;U.uS.value=S;U.uL.value=L;U.uH.value=H;
  bigGears.forEach(g=>{g.rotateZ(dt*g.userData.v*(0.25+1.6*S));});bigGearMat.emissiveIntensity=S*0.35+H*0.2;
  const nLeaf=0.3+0.7*Math.max(L,H),nMetal=0.3+0.7*Math.max(S,H);
  flies.forEach(g=>{const u=g.userData;const on=u.k<(u.metal?nMetal:nLeaf);u.s+=((on?1:0)-u.s)*dt*1.5;
    if(u.s<0.01){g.visible=false;return;}g.visible=true;
    u.a+=dt*u.w*(0.7+0.6*H);const R=u.R+Math.sin(t*.3+u.ph)*.6;
    const x=Math.cos(u.a)*R+0.3,z=Math.sin(u.a)*R,y=u.h+Math.sin(t*.8+u.ph)*.5;
    tmpV.set(Math.cos(u.a+0.15*Math.sign(u.w))*R+0.3,y+Math.cos(t*.8+u.ph)*.06,Math.sin(u.a+0.15*Math.sign(u.w))*R).add(decor.position);
    g.position.set(x,y,z);g.lookAt(tmpV);
    const fl=Math.sin(t*u.f+u.ph)*1.05;u.wl.rotation.z=fl;u.wr.rotation.z=-fl;
    g.scale.setScalar(u.s*(u.metal?0.9:1)*(1+0.25*H));});
  brassMat.emissiveIntensity=.4+S*.6;leafMat.emissiveIntensity=leafMat2.emissiveIntensity=.3+L*.6;
  for(let i=0;i<NP;i++){const q=pv[i];pPos[i*3+1]+=dt*q.v*(0.4+(q.warm?S:L)*1.4);pPos[i*3]+=Math.sin(t*.6+q.sw)*dt*.08;if(pPos[i*3+1]>10)pPos[i*3+1]=0;}
  pGeo.attributes.position.needsUpdate=true;pMat.opacity=.35+.4*Math.max(S,L)+.25*H;
  beam.material.opacity=.03+.06*H+.01*Math.sin(t*1.7);
}

/* ---------- 소리 (earshot으로 만든 파일) ---------- */
const LOOPS={bgm:23.1132,forest_wind:20,forest_birds:20,engine_idle:10.9301,gears:3.166};
const SHOTS=['tree_creak','touch_wood','touch_metal','machine_start','machine_stop','bloom'];
let ctx=null,master=null,bufs={},beds={},muted=false;
function setP(node,v){if(node.positionX){node.positionX.value=v.x;node.positionY.value=v.y;node.positionZ.value=v.z;}else node.setPosition(v.x,v.y,v.z);}
function panner(v){const p=ctx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2.5;p.rolloffFactor=1;setP(p,v);return p;}
function loadBuf(n){return fetch('assets/coexist/snd/'+n+'.mp3').then(r=>r.arrayBuffer()).then(ab=>new Promise((res,rej)=>ctx.decodeAudioData(ab,res,rej))).then(b=>{bufs[n]=b;});}
function bed(n,pos){const s=ctx.createBufferSource();s.buffer=bufs[n];s.loop=true;s.loopStart=0.1;s.loopEnd=0.1+LOOPS[n];
  const g=ctx.createGain();g.gain.value=0;s.connect(g);if(pos){const p=panner(pos);g.connect(p);p.connect(master);}else g.connect(master);
  s.start(0,0.1);return {s,g};}
function shot(n,pos,gain,rate){if(!ctx||!bufs[n])return;const s=ctx.createBufferSource();s.buffer=bufs[n];s.playbackRate.value=rate||1;
  const g=ctx.createGain();g.gain.value=gain||1;s.connect(g);if(pos){const p=panner(pos);g.connect(p);p.connect(master);}else g.connect(master);s.start();}
async function startAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx=new AC();ctx.resume&&ctx.resume();
  master=ctx.createGain();master.gain.value=1;const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
  await Promise.all(Object.keys(LOOPS).concat(SHOTS).map(loadBuf));
  beds.bgm=bed('bgm');beds.wind=bed('forest_wind');beds.birds=bed('forest_birds');
  beds.engine=bed('engine_idle',EBASE);beds.gears=bed('gears',EBASE);
  beds.gears3=bed('gears',V(C3.x,1.2,C3.z));beds.hum=bed('engine_idle',BODY);
}
addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend&&ctx.suspend();else ctx.resume&&ctx.resume();});
function updateListener(){if(!ctx)return;const L=ctx.listener;const f=new THREE.Vector3();camera.getWorldDirection(f);
  if(L.positionX){L.positionX.value=camera.position.x;L.positionY.value=camera.position.y;L.positionZ.value=camera.position.z;
    L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0;}
  else{L.setPosition(camera.position.x,camera.position.y,camera.position.z);L.setOrientation(f.x,f.y,f.z,0,1,0);}}
function mix(){if(!ctx||!beds.wind)return;const t=ctx.currentTime;const on=k=>ch===k?1:0;
  const machineAlone=on(0)*Math.max(0,speed-life);
  beds.bgm.g.gain.setTargetAtTime(1.4*(1-0.45*machineAlone)+0.7*(on(0)*harm+on(3)*wake+on(4)),t,1.2);
  beds.wind.g.gain.setTargetAtTime((on(0)+on(1)*1.2+on(2)*.6+on(3)*.5+on(4)*.8)*1.5*(1-0.5*machineAlone),t,.6);
  beds.birds.g.gain.setTargetAtTime(1.9*(on(0)*harm*harm+on(1)*mossPct*1.2+on(4)*.8),t,.8);
  beds.engine.g.gain.setTargetAtTime(on(0)*2.4*speed*(1-0.35*harm),t,.3);
  beds.engine.s.playbackRate.setTargetAtTime(0.55+0.5*speed,t,.3);
  beds.gears.g.gain.setTargetAtTime(on(0)*1.6*speed,t,.3);
  beds.gears.s.playbackRate.setTargetAtTime(0.6+0.5*speed,t,.3);
  const sv=clamp(Math.abs(tables.reduce((m,tt)=>Math.max(m,Math.abs(tt.userData.vel)),0))*.25,0,1);
  beds.gears3.g.gain.setTargetAtTime(on(2)*2.2*sv,t,.15);beds.gears3.s.playbackRate.setTargetAtTime(.5+.9*sv,t,.15);
  beds.hum.g.gain.setTargetAtTime(on(3)*2.2*wake,t,.4);beds.hum.s.playbackRate.setTargetAtTime(.38+.25*wake,t,.4);}

/* ---------- 상태 ---------- */
let machineOn=false,speed=0,life=0,harm=0,growth=0,bloomed=false,rot=0;
let ch=0,chP=0;

/* ---------- 카메라 ---------- */
const camC=CH_POS[0].clone().add(VIEW[0].t);let camR=VIEW[0].r,camPhi=VIEW[0].phi;let theta=0.55,tiltT=0,tiltP=0,lastTouch=0,dragTheta=0;
function placeCam(){const th=theta+dragTheta+tiltT*0.5+(chP-.5)*0.9,ph=clamp(camPhi-tiltP*0.25,-0.05,1.1);
  camera.position.set(camC.x+camR*Math.sin(th)*Math.cos(ph),camC.y+camR*Math.sin(ph),camC.z+camR*Math.cos(th)*Math.cos(ph));camera.lookAt(camC);}
const chCenter=k=>CH_POS[VIEW[k].at!==undefined?VIEW[k].at:k];

/* ---------- 스크롤 장 ---------- */
const secs=[...document.querySelectorAll('.ch')];let secTop=[];
function measure(){secTop=secs.map(s=>{const r=s.getBoundingClientRect();return [r.top+scrollY,r.height];});}
measure();addEventListener('resize',()=>{measure();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
addEventListener('load',measure);
function readScroll(){const mid=scrollY+innerHeight*.5;let k=0;for(let i=0;i<secTop.length;i++)if(mid>=secTop[i][0])k=i;
  const [top,h]=secTop[k]||[0,1];chP=clamp((mid-top)/h,0,1);
  if(k!==ch){ch=k;document.body.dataset.ch=ch;holding=false;}}

/* ---------- 손 ---------- */
const ray=new THREE.Raycaster();const ndc=new THREE.Vector2();
const cv=renderer.domElement;
function pick(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
  if(ch===0){const hE=ray.intersectObject(E,true)[0],hT=ray.intersectObject(tree,false)[0];
    if(hE&&(!hT||hE.distance<=hT.distance))return {what:'engine',p:hE.point};if(hT)return {what:'tree',p:hT.point};return null;}
  if(ch===1){const h=ray.intersectObject(wood2,false)[0]||ray.intersectObject(moss2,false)[0];return h?{what:'wood2',p:h.point}:null;}
  if(ch===2){const h=ray.intersectObjects(tables,true)[0];if(!h)return null;let o=h.object;while(o&&!tables.includes(o))o=o.parent;return o?{what:'table',p:h.point,tt:o}:null;}
  if(ch===3){const h=ray.intersectObject(creature,true)[0];return h?{what:'creature',p:h.point}:null;}
  return null;}
cv.addEventListener('touchstart',e=>{const t=e.touches[0];if(t&&pick(t.clientX,t.clientY))e.preventDefault();},{passive:false});
let mode=null,downAt=null,rubAcc=0,lastKnock=0,lastCreak=0,prevX=0,prevY=0;
cv.addEventListener('pointerdown',e=>{lastTouch=performance.now();const h=pick(e.clientX,e.clientY);downAt={x:e.clientX,y:e.clientY,h};prevX=e.clientX;prevY=e.clientY;
  if(!h){mode=e.pointerType==='mouse'?'orbit':null;if(mode)cv.setPointerCapture(e.pointerId);return;}
  cv.setPointerCapture(e.pointerId);
  if(h.what==='tree'){mode='rub';shot('touch_wood',h.p,.7,rnd(.85,1.1));}
  else if(h.what==='engine')mode='tap';
  else if(h.what==='wood2'){mode='rub2';seedMoss(h.p);shot('touch_wood',h.p,.6,rnd(.9,1.15));}
  else if(h.what==='table'){mode='spin';downAt.tt=h.tt;h.tt.userData.vel=0;shot('touch_metal',h.p,.35,rnd(.9,1.2));}
  else if(h.what==='creature'){mode='hold';holding=true;}});
cv.addEventListener('pointermove',e=>{if(!mode)return;const dx=e.clientX-prevX,dy=e.clientY-prevY;prevX=e.clientX;prevY=e.clientY;lastTouch=performance.now();
  if(mode==='orbit'){dragTheta-=dx*0.006;return;}
  if(mode==='rub'){const h=pick(e.clientX,e.clientY);if(!h||h.what!=='tree')return;rubAcc+=Math.hypot(dx,dy);const now=performance.now();
    while(rubAcc>30){rubAcc-=30;life=Math.min(1,life+0.035);}
    if(now-lastKnock>170){lastKnock=now;shot('touch_wood',h.p,.35,rnd(.7,1.2));}
    if(now-lastCreak>2600&&Math.random()<.5){lastCreak=now;shot('tree_creak',h.p,.6,rnd(.85,1.05));}return;}
  if(mode==='rub2'){const h=pick(e.clientX,e.clientY);if(!h)return;rubAcc+=Math.hypot(dx,dy);if(rubAcc>22){rubAcc=0;seedMoss(h.p);}
    const now=performance.now();if(now-lastKnock>200){lastKnock=now;shot('touch_wood',h.p,.25,rnd(1,1.3));}return;}
  if(mode==='spin'){const u=downAt.tt.userData;const d=dx*0.012;u.rot+=d;u.vel=d/0.016;spinAmt=Math.min(1,spinAmt+Math.abs(d)*.04);}});
function up(e){if(mode==='tap'&&downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)<12){
    machineOn=!machineOn;shot('touch_metal',downAt.h.p,.5);shot(machineOn?'machine_start':'machine_stop',EBASE,machineOn?.6:.5);}
  if(mode==='hold')holding=false;mode=null;downAt=null;}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);

/* ---------- 화면 글 ---------- */
$('enter').addEventListener('click',()=>{$('loading').textContent='소리를 불러오는 중…';
  if(IS_MOBILE){try{sensor.enable();}catch(e){}try{keepAwake();}catch(e){}}
  startAudio().catch(()=>{}).finally(()=>{const i=$('intro');i.style.opacity=0;setTimeout(()=>i.remove(),1000);measure();});});
$('mute').addEventListener('click',()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:1,ctx.currentTime,.1);$('mute').textContent=muted?'소리 켜기':'소리 끄기';});
let lastMsg='';function say(m){if(m===lastMsg)return;lastMsg=m;const s=$('status');s.style.opacity=0;setTimeout(()=>{s.textContent=m;s.style.opacity=.92;},350);}
function statusText(){
  if(ch===0){if(bloomed&&harm>.6)return '기계의 힘이 나무로 흐르고, 나무가 기계를 품고 있어요.';
    if(speed>.5&&life<.35)return '기계만 돌면 숲이 탁해져요. 나무도 문질러 깨워 주세요.';
    if(life>.5&&speed<.3)return '나무가 깨어났어요. 이제 엔진을 눌러 움직여 보세요.';
    if(speed>.5&&life>.35)return '기계와 나무가 서로에게 닿고 있어요. 조금 더요.';
    return '엔진을 눌러 깨우고, 나무를 문질러 보세요.';}
  if(ch===1)return mossPct>.85?'나무 전체에 이끼가 번졌어요.':mossPct>.15?`이끼가 번지고 있어요 · ${Math.round(mossPct*100)}%`:'나무를 문지르면 그 자리부터 이끼가 번져요.';
  if(ch===2)return spinAmt>.6?'톱니와 베어링이 나무와 함께 돌아요.':'조각을 옆으로 밀어 돌려 보세요.';
  if(ch===3)return woke?'깨어났어요. 기계의 빛을 눈으로 삼은 존재예요.':wake>.05?'깨어나는 중…':'존재를 꾹 누르고 있으면 깨어나요.';
  return '';}
function showCaption(h,p){const c=$('caption');c.querySelector('h2').textContent=h;c.querySelector('p').innerHTML=p;c.style.opacity=1;setTimeout(()=>c.style.opacity=0,6000);}

/* ---------- 매 프레임 ---------- */
const clock=new THREE.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  readScroll();
  // 1장
  speed+=((machineOn?1:0)-speed)*dt*(machineOn?0.7:1.2);life=Math.max(0,life-dt*0.012);
  harm+=(Math.min(speed,life)-harm)*dt*0.8;growth=Math.max(growth,harm);
  if(!bloomed&&harm>0.82){bloomed=true;shot('bloom',null,.7);showCaption('새로운 공존의 시작','기계는 나무에 힘을 보내고, 나무는 기계를 품어요.<br>누구도 한쪽만 빼앗지 않는 세계예요.');}
  if(ch<=1||speed>.01){
    rot+=dt*speed*11;crank.rotation.z=-rot;cam.rotation.z=-rot*.5;camGear.rotation.z=-rot*.5;alt.rotation.z=-rot*1.9;sideGear.rotation.z=rot*1.4;
    valves.forEach((v,i)=>v.position.y=0.82+Math.max(0,Math.sin(rot*.5+i*Math.PI/2))*0.05*speed);
    const j=0.007*speed;E.position.set(EBASE.x+rnd(-j,j),EBASE.y+rnd(-j,j),EBASE.z+rnd(-j,j));}
  glowMat.emissiveIntensity=speed*(1.4+0.4*Math.sin(t*9));engineLight.position.copy(EBASE).add(V(0,0,0.7));engineLight.intensity=speed*1.6+harm*0.8;
  treeMat.color.copy(DRY).lerp(ALIVE,life);treeMat.emissiveIntensity=harm*0.4;updateMoss(growth);
  sapMat.opacity=clamp(speed*(0.25+0.75*life),0,1)*0.9;
  if(speed>0.02&&ch===0){for(let i=0;i<NS;i++){const s=sap[i];s.s+=dt*s.v*(1.5+3*speed);if(s.s>=s.path.length-1){s.s=0;s.path=sapPaths[(Math.random()*sapPaths.length)|0];}
    const k=Math.floor(s.s),f=s.s-k,a=s.path[k],b=s.path[Math.min(k+1,s.path.length-1)];
    sapPos[i*3]=a.x+(b.x-a.x)*f;sapPos[i*3+1]=a.y+(b.y-a.y)*f;sapPos[i*3+2]=a.z+(b.z-a.z)*f;}sapGeo.attributes.position.needsUpdate=true;}
  // 2장
  updateMoss2(dt);
  // 3장
  tables.forEach(tt=>{const u=tt.userData;if(!(mode==='spin'&&downAt&&downAt.tt===tt)){u.rot+=u.vel*dt;u.vel*=Math.pow(0.35,dt);}
    tt.rotation.y=u.rot;u.parts.forEach(p=>{p.o.rotateZ(u.vel*dt*p.k);});
    tickAcc+=Math.abs(u.vel*dt);});
  if(tickAcc>0.45){tickAcc=0;if(ch===2)shot('touch_metal',V(C3.x,1.2,C3.z),.18,rnd(1.3,1.8));}
  // 4장
  wake=clamp(wake+(holding?dt*0.42:-dt*0.1),0,1);
  if(!woke&&wake>.96){woke=true;shot('bloom',BODY,.8,.8);showCaption('빛을 내는 존재','가지를 다리 삼아 선 존재가 기계의 빛으로 눈을 떴어요.');}
  const wk=wake*wake;tubeMat.emissiveIntensity=.03+wk*3.2+Math.sin(t*3)*.15*wk;lensMat.emissiveIntensity=.05+wk*4;
  headLight.intensity=wk*5;bodyLight.intensity=wk*2.2;creature.position.y=Math.sin(t*1.1)*0.03*wake;
  // 지금 장의 분위기 → 배경
  let S=0,L=0,H=0;if(ch===0){S=speed;L=life;H=harm;}else if(ch===1){L=mossPct;H=mossPct*.5;}else if(ch===2){S=Math.min(1,spinAmt+Math.abs(tables[1].userData.vel)*.1);}else if(ch===3){S=wake*.6;H=wk*.8;}else{S=.4;L=.6;H=1;}
  updateBackdrop(dt,t,S,L,H);
  const alone=ch===0?Math.max(0,speed-life):0;
  scene.fog.density=(ch===4?0.025:0.055)+0.05*alone-0.03*H;scene.fog.color.setRGB(0.045+0.05*alone,0.045+0.05*alone,0.05+0.05*alone);
  // 카메라: 장이 바뀌면 안개 속을 날아감
  const vw=VIEW[ch]||VIEW[0];const goal=chCenter(ch).clone().add(vw.t);const k=1-Math.exp(-dt*2.2);
  camC.lerp(goal,k);camR+=(vw.r-camR)*k;camPhi+=(vw.phi-camPhi)*k;
  if(performance.now()-lastTouch>3500&&!mode)theta+=dt*0.05;
  tiltT+=((IS_MOBILE?sensor.tiltX:0)-tiltT)*0.08;tiltP+=((IS_MOBILE?sensor.tiltY:0)-tiltP)*0.08;
  placeCam();sky.position.copy(camera.position);
  decor.position.lerp(chCenter(ch),k);
  key.target.position.copy(camC);key.position.copy(camC).add(V(3,7,6));key.intensity=2.2+1.2*H;
  updateListener();mix();
  $('mTree').style.width=(life*100)+'%';$('mMach').style.width=(speed*100)+'%';$('mHarm').style.width=(harm*100)+'%';
  say(statusText());
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
document.body.dataset.ch=0;placeCam();frame();

/* ---------- ARTMOS: 나가기 · 상단 안전 영역 ---------- */
document.querySelectorAll('.co-exit').forEach(a=>a.addEventListener('click',e=>{
  if(IN_FRAME){e.preventDefault();try{parent.postMessage({type:'artmos:close-exhibit'},'*');}catch(err){}setTimeout(()=>{location.href='./';},600);}}));
addEventListener('message',e=>{const d=e.data||{};if(d.type==='artmos:safe'&&typeof d.top==='number')document.documentElement.style.setProperty('--sat',d.top+'px');});
if(IN_FRAME&&/iPhone/.test(navigator.userAgent)){const Hh=screen.height;document.documentElement.style.setProperty('--sat',(Hh>=852?59:Hh>=812?47:20)+'px');}
if(location.hash==='#debug')window.__co={get ch(){return ch;},get speed(){return speed;},get life(){return life;},get harm(){return harm;},get moss(){return mossPct;},get wake(){return wake;},
  setMachine:v=>{machineOn=!!v;},setLife:v=>{life=v;},setWake:v=>{wake=v;}};
