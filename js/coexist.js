// c009 새로운 공존의 시작 — 신예진 작가의 나무와 기계 작업에서 출발한 3D 전시 (2026-11-21).
// 나무를 문지르면 깨어나고, 엔진을 누르면 돌아감. 둘이 함께 가면 엔진의 빛이 가지로 흐르고 이끼·새소리가 들어옴.
// 모양은 모두 코드로 새로 만듦(작품 사진 없음). 소리는 earshot으로 만든 파일(assets/coexist/snd, docs/exhibitions/c009-coexist).
// 휴대폰은 기울이면 시점이 조금 움직임(앱 안이면 센서 중계). #debug면 window.__co.
import * as THREE from './vendor/three.module.js';
import { sensor, IS_MOBILE, keepAwake } from './sensors.js?v=6';
const IN_FRAME = window !== window.top;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

/* ---------- renderer / scene ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.useLegacyLights=true;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x000000);
scene.fog=new THREE.FogExp2(0x0b0b0c,0.06);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.05,100);

scene.add(new THREE.HemisphereLight(0x9aa0a8,0x0a0806,0.35));
const key=new THREE.SpotLight(0xfff1dd,2.2,30,0.55,0.6,1.2);
key.position.set(3,9,6);key.target.position.set(0.4,2.4,0);scene.add(key,key.target);
const rim=new THREE.DirectionalLight(0x8899aa,0.5);rim.position.set(-5,4,-6);scene.add(rim);
const engineLight=new THREE.PointLight(0xffe2b0,0,6,2);scene.add(engineLight);

/* ---------- textures ---------- */
function barkTex(){
  const c=document.createElement('canvas');c.width=128;c.height=512;const g=c.getContext('2d');
  g.fillStyle='#7d6a58';g.fillRect(0,0,128,512);
  for(let i=0;i<900;i++){const x=Math.random()*128,w=rnd(1,4),y=Math.random()*512,h=rnd(20,140);
    const l=rnd(25,75);g.fillStyle=`hsla(28,${rnd(10,30)}%,${l}%,${rnd(.08,.3)})`;g.fillRect(x,y,w,h);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);return t;
}
function softTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
const SOFT=softTex();

/* ---------- floor ---------- */
const floor=new THREE.Mesh(new THREE.CircleGeometry(14,48),
  new THREE.MeshStandardMaterial({color:0x141414,roughness:.45,metalness:.25}));
floor.rotation.x=-Math.PI/2;scene.add(floor);
const blob=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshBasicMaterial({map:SOFT,color:0,transparent:true,opacity:.7,depthWrite:false}));
blob.rotation.x=-Math.PI/2;blob.position.y=0.005;scene.add(blob);
{ // pebbles
  const n=70,m=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xb8b2a8,roughness:.9}),n);
  const o=new THREE.Object3D();
  for(let i=0;i<n;i++){const a=Math.random()*6.28,r=rnd(0.4,2.2),s=rnd(.02,.08);
    o.position.set(Math.cos(a)*r,s*.5,Math.sin(a)*r);o.scale.set(s,s*.6,s);o.rotation.set(rnd(0,3),rnd(0,3),0);o.updateMatrix();m.setMatrixAt(i,o.matrix);}
  scene.add(m);
}

/* ---------- tree (merged geometry) ---------- */
const geos=[];const branchPts=[];const tips=[];
const UP=V(0,1,0);
function addSeg(a,b,r0,r1){
  const d=b.clone().sub(a),h=d.length();if(h<1e-4)return;
  const g=new THREE.CylinderGeometry(r1,r0,h,7,1,true);
  const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const j=0.12*r0;pos.setX(i,pos.getX(i)+rnd(-j,j));pos.setZ(i,pos.getZ(i)+rnd(-j,j));}
  g.translate(0,h/2,0);
  const q=new THREE.Quaternion().setFromUnitVectors(UP,d.normalize());
  g.applyQuaternion(q);g.translate(a.x,a.y,a.z);geos.push(g);
  const s=new THREE.SphereGeometry(r0*1.02,7,5);s.translate(a.x,a.y,a.z);geos.push(s);
}
function chain(pts,r0,r1){ // tapered polyline
  for(let i=0;i<pts.length-1;i++){const t0=i/(pts.length-1),t1=(i+1)/(pts.length-1);
    const ra=r0+(r1-r0)*t0,rb=r0+(r1-r0)*t1;addSeg(pts[i],pts[i+1],ra,rb);branchPts.push({p:pts[i+1].clone(),r:rb});}
}
function grow(p,dir,len,r,depth,path){
  let cur=p.clone(),d=dir.clone();const pts=[cur.clone()];const segs=4;const rEnd=r*0.62;
  for(let i=0;i<segs;i++){
    d.add(V(rnd(-.35,.35),rnd(-.15,.3),rnd(-.35,.35))).normalize();
    const nx=cur.clone().addScaledVector(d,len/segs);
    const ra=r+(rEnd-r)*i/segs,rb=r+(rEnd-r)*(i+1)/segs;addSeg(cur,nx,ra,rb);
    branchPts.push({p:nx.clone(),r:rb});cur=nx;pts.push(cur.clone());
  }
  const np=path.concat(pts);
  if(depth===0||rEnd<0.018){tips.push(np);return;}
  const kids=depth>=3?2:(Math.random()<.5?2:3);
  for(let k=0;k<kids;k++){
    const axis=V(rnd(-1,1),rnd(-.2,.2),rnd(-1,1)).normalize();
    const nd=d.clone().applyAxisAngle(axis,rnd(.4,.95));nd.y=Math.max(nd.y,-.1);nd.normalize();
    grow(cur,nd,len*rnd(.62,.8),rEnd*rnd(.62,.8),depth-1,np);
  }
}
grow(V(0,0,0),V(0.05,1,0),3.3,0.34,4,[]);
// roots spreading on the floor
for(let k=0;k<6;k++){
  const a=k/6*6.28+rnd(-.3,.3),L=rnd(1.2,2.4);const pts=[V(0,0.35,0)];
  for(let i=1;i<=6;i++){const t=i/6;pts.push(V(Math.cos(a+t*rnd(-.4,.4))*L*t,0.35*(1-t)+0.04,Math.sin(a+t*rnd(-.4,.4))*L*t));}
  chain(pts,0.2,0.025);
}
// arms that wrap the engine
chain([V(0.02,1.85,0.18),V(0.55,1.98,0.58),V(1.15,2.45,0.56),V(1.45,3.05,0.25),V(1.75,3.6,-0.05),V(1.9,4.1,-0.1)],0.13,0.03);
chain([V(0,2.95,-0.18),V(0.7,2.98,-0.55),V(1.3,2.7,-0.5),V(1.62,2.2,-0.2),V(1.7,1.7,0.05)],0.1,0.025);
chain([V(0.05,2.2,0),V(0.6,1.75,-0.35),V(1.0,1.6,-0.1),V(1.3,1.75,0.3)],0.08,0.02);

function merge(list){
  let n=0,ni=0;list.forEach(g=>{n+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;});
  const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),I=new Uint32Array(ni);let o=0,oi=0;
  list.forEach(g=>{const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);
    if(g.attributes.uv)U.set(g.attributes.uv.array,o*2);
    if(g.index){const a=g.index.array;for(let i=0;i<a.length;i++)I[oi++]=a[i]+o;}else{for(let i=0;i<c;i++)I[oi++]=i+o;}
    o+=c;g.dispose();});
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));
  m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('uv',new THREE.BufferAttribute(U,2));
  m.setIndex(new THREE.BufferAttribute(I,1));m.computeVertexNormals();return m;
}
const DRY=new THREE.Color(0x6a625b),ALIVE=new THREE.Color(0x96714c);
const treeMat=new THREE.MeshStandardMaterial({color:DRY.clone(),map:barkTex(),roughness:.95,metalness:0,flatShading:true,emissive:0x1a0d00,emissiveIntensity:0});
const tree=new THREE.Mesh(merge(geos),treeMat);scene.add(tree);

/* ---------- engine ---------- */
const E=new THREE.Group();const EBASE=V(0.78,2.32,0.12);E.position.copy(EBASE);E.rotation.set(0.05,-0.35,0.08);scene.add(E);
const steel=new THREE.MeshStandardMaterial({color:0x4a4e54,metalness:.85,roughness:.38});
const dark=new THREE.MeshStandardMaterial({color:0x26282c,metalness:.8,roughness:.5});
const bright=new THREE.MeshStandardMaterial({color:0xa9adb3,metalness:.95,roughness:.22});
const glowMat=new THREE.MeshStandardMaterial({color:0x222222,emissive:0xffd9a0,emissiveIntensity:0});
const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);E.add(o);return o;};
add(new THREE.BoxGeometry(1.15,0.82,0.78),dark,0,0,0);
add(new THREE.BoxGeometry(1.22,0.24,0.84),steel,0,0.53,0);
add(new THREE.BoxGeometry(1.0,0.12,0.6),bright,0,0.7,0);
for(let i=0;i<4;i++){add(new THREE.BoxGeometry(0.04,0.5,0.02),glowMat,-0.42+i*0.28,-0.02,0.395);} // glowing slits
for(let i=0;i<4;i++){ // intake runners
  const z=-0.28+i*0.19;const c=new THREE.QuadraticBezierCurve3(V(-0.55,0.62,z),V(-1.0,0.75,z),V(-0.95,0.05,z*0.6));
  add(new THREE.TubeGeometry(c,16,0.045,8),bright,0,0,0);
}
add(new THREE.CylinderGeometry(0.11,0.11,0.9,10),steel,-0.95,-0.2,0).rotation.x=Math.PI/2;
const valves=[];for(let i=0;i<4;i++){valves.push(add(new THREE.CylinderGeometry(0.035,0.035,0.18,8),bright,-0.36+i*0.24,0.82,0));}
function pulley(r,x,y){const g=new THREE.Group();
  const w=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.08,24),steel);w.rotation.x=Math.PI/2;g.add(w);
  for(let k=0;k<4;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(r*1.6,0.03,0.1),dark);s.rotation.z=k*Math.PI/4;g.add(s);}
  const h=new THREE.Mesh(new THREE.CylinderGeometry(r*0.25,r*0.25,0.14,12),bright);h.rotation.x=Math.PI/2;g.add(h);
  g.position.set(x,y,0.45);E.add(g);return g;}
function gear(r,teeth,x,y){const s=new THREE.Shape();
  for(let i=0;i<teeth*2;i++){const a=i/(teeth*2)*Math.PI*2,rr=i%2?r*0.84:r;const a2=a+Math.PI/(teeth*2);
    if(i===0)s.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else s.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);s.lineTo(Math.cos(a2)*rr,Math.sin(a2)*rr);}
  const h=new THREE.Path();h.absarc(0,0,r*0.3,0,Math.PI*2,true);s.holes.push(h);
  const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:0.05,bevelEnabled:false}),bright);m.position.set(x,y,0.5);E.add(m);return m;}
const crank=pulley(0.22,0.2,-0.22),cam=pulley(0.19,0.3,0.42),alt=pulley(0.11,-0.32,0.3);
const camGear=gear(0.16,18,0.3,0.42),sideGear=gear(0.12,12,0.62,0.05);sideGear.position.z=0.42;
{const pts=[V(0.2,-0.45,0.45),V(0.44,-0.2,0.45),V(0.5,0.42,0.45),V(0.3,0.62,0.45),V(-0.32,0.42,0.45),V(-0.44,0.3,0.45),V(-0.05,-0.3,0.45)];
 add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),60,0.018,6,true),new THREE.MeshStandardMaterial({color:0x111111,roughness:.8}),0,0,0);}
// cables falling to the floor and coiling
{const cg=[];for(let k=0;k<7;k++){
  const sx=EBASE.x+rnd(-.45,.45),sz=EBASE.z+rnd(-.2,.3);const ex=sx+rnd(-.6,.6),ez=sz+rnd(.1,.9);const R=rnd(.12,.32);
  const pts=[V(sx,EBASE.y-0.35,sz),V(sx+rnd(-.1,.1),1.2,sz+rnd(0,.2)),V(ex,0.35,ez)];
  for(let i=0;i<=24;i++){const a=i/24*Math.PI*4+rnd(0,.2);pts.push(V(ex+Math.cos(a)*R*(1-i/60),0.012+i*0.0008,ez+Math.sin(a)*R*(1-i/60)));}
  cg.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,0.011,5));}
 scene.add(new THREE.Mesh(merge(cg),new THREE.MeshStandardMaterial({color:0x0c0c0c,roughness:.6,metalness:.3})));}
// chains holding the engine
{const per=40,ends=[V(-0.4,0.6,0),V(0.45,0.6,0)];const n=per*ends.length;
 const im=new THREE.InstancedMesh(new THREE.TorusGeometry(0.035,0.011,6,12),bright,n);const o=new THREE.Object3D();let k=0;
 E.updateMatrixWorld();ends.forEach(e=>{const w=E.localToWorld(e.clone());
   for(let i=0;i<per;i++){o.position.set(w.x,w.y+0.05+i*0.06,w.z);o.rotation.set(0,i%2?Math.PI/2:0,Math.PI/2);o.updateMatrix();im.setMatrixAt(k++,o.matrix);}});
 scene.add(im);}

/* ---------- moss & sprouts ---------- */
const MOSS=360;const mossGeo=new THREE.IcosahedronGeometry(1,0);
const moss=new THREE.InstancedMesh(mossGeo,new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),MOSS);
const mossData=[];const tmp=new THREE.Object3D();const cA=new THREE.Color(0x8fb33a),cB=new THREE.Color(0xd6c94a),cC=new THREE.Color(0x4f7a32);
{const cand=branchPts.filter(b=>b.p.y>0.25);
 for(let i=0;i<MOSS;i++){const b=cand[(Math.random()*cand.length)|0];
   const off=V(rnd(-1,1),rnd(-.4,1),rnd(-1,1)).normalize().multiplyScalar(b.r*0.9);
   mossData.push({p:b.p.clone().add(off),s:rnd(.025,.07)*(b.r>.12?1.3:1),th:Math.random(),rot:V(rnd(0,3),rnd(0,3),rnd(0,3))});
   const col=Math.random()<.6?cA.clone().lerp(cC,Math.random()):cB.clone().lerp(cA,Math.random()*.5);moss.setColorAt(i,col);}
 moss.instanceColor.needsUpdate=true;}
scene.add(moss);
function updateMoss(g){
  for(let i=0;i<MOSS;i++){const d=mossData[i];const s=d.s*clamp((g-d.th*0.9)*6,0,1);
    tmp.position.copy(d.p);tmp.rotation.set(d.rot.x,d.rot.y,d.rot.z);tmp.scale.setScalar(Math.max(s,1e-4));tmp.updateMatrix();moss.setMatrixAt(i,tmp.matrix);}
  moss.instanceMatrix.needsUpdate=true;
}
updateMoss(0);

/* ---------- sap: light flowing from engine into branches ---------- */
const NS=160;const sapPaths=[];
tips.forEach(t=>{const i=t.findIndex(p=>p.y>2.1);if(i>=0)sapPaths.push([EBASE.clone()].concat(t.slice(i)));});
if(!sapPaths.length)sapPaths.push([EBASE.clone(),V(0,4,0),V(0.5,6,0)]);
const sapPos=new Float32Array(NS*3);const sap=[];for(let i=0;i<NS;i++)sap.push({path:sapPaths[(Math.random()*sapPaths.length)|0],s:Math.random()*8,v:rnd(.6,1.4)});
const sapGeo=new THREE.BufferGeometry();sapGeo.setAttribute('position',new THREE.BufferAttribute(sapPos,3));
const sapMat=new THREE.PointsMaterial({size:0.07,map:SOFT,color:0xfff0c8,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
scene.add(new THREE.Points(sapGeo,sapMat));

/* ---------- fog sprites ---------- */
const mists=[];for(let i=0;i<10;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:SOFT,color:0xbfc3c8,transparent:true,opacity:.07,depthWrite:false}));
  const s=rnd(3,6);m.scale.set(s,s*.45,1);m.position.set(rnd(-3,3),rnd(.2,1),rnd(-3,3));m.userData.v=rnd(.05,.15)*(Math.random()<.5?-1:1);scene.add(m);mists.push(m);}

/* ---------- 움직이는 배경 (2026-11-21 소유자: 뒤 배경이 화려하게 움직이게) ----------
   ① 둘레 하늘: 흐르는 빛의 결(기계가 돌면 호박빛 줄기, 나무가 깨면 초록 결, 공존이면 위에서 빛) + 반짝임
   ② 멀리 둘러선 큰 톱니들이 천천히 돎  ③ 나비 24마리(잎 나비 12 · 놋쇠 나비 12)가 나무 둘레를 날아다님
   ④ 떠오르는 불티·꽃가루  ⑤ 위에서 내려오는 빛줄기 */
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
// ② 멀리 둘러선 톱니
function gearGeo(r,teeth,depth){const s=new THREE.Shape();
  for(let i=0;i<teeth*2;i++){const a=i/(teeth*2)*Math.PI*2,rr=i%2?r*0.86:r,a2=a+Math.PI/(teeth*2);
    if(i===0)s.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else s.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);s.lineTo(Math.cos(a2)*rr,Math.sin(a2)*rr);}
  const hole=new THREE.Path();hole.absarc(0,0,r*0.62,0,Math.PI*2,true);s.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);return g;}
const bigGearMat=new THREE.MeshStandardMaterial({color:0x3a3128,metalness:.9,roughness:.42,emissive:0xff8a2a,emissiveIntensity:0});
const bigGears=[];for(let i=0;i<9;i++){const r=rnd(1.4,3.2);const m=new THREE.Mesh(gearGeo(r,Math.round(r*9),0.25),bigGearMat);
  const a=i/9*Math.PI*2+rnd(-.2,.2),R=rnd(13,17);m.position.set(Math.cos(a)*R,rnd(1,8),Math.sin(a)*R);m.lookAt(0,m.position.y,0);
  m.userData={v:rnd(.15,.35)*(i%2?1:-1)};scene.add(m);bigGears.push(m);}
// ③ 나비
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
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.012,.008,.16,5),metal?bright:new THREE.MeshStandardMaterial({color:0x3a2a1a}));body.rotation.x=Math.PI/2;g.add(body);
  g.userData={metal,wl,wr,R:rnd(1.6,4.6),h:rnd(1.2,6.2),w:rnd(.25,.6)*(Math.random()<.5?1:-1),a:rnd(0,6.28),ph:rnd(0,6.28),f:rnd(9,14),s:0,k:(i>>1)/12};
  g.scale.setScalar(.001);scene.add(g);flies.push(g);}
// ④ 불티·꽃가루
const NP=520;const pPos=new Float32Array(NP*3),pCol=new Float32Array(NP*3),pv=[];
for(let i=0;i<NP;i++){const a=rnd(0,6.28),r=Math.sqrt(Math.random())*7;pPos[i*3]=Math.cos(a)*r;pPos[i*3+1]=rnd(0,10);pPos[i*3+2]=Math.sin(a)*r;
  const warm=i%2;pCol[i*3]=warm?1:.6;pCol[i*3+1]=warm?.7:.95;pCol[i*3+2]=warm?.35:.45;pv.push({v:rnd(.15,.5),sw:rnd(0,6.28),warm});}
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pMat=new THREE.PointsMaterial({size:.06,map:SOFT,vertexColors:true,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});
scene.add(new THREE.Points(pGeo,pMat));
// ⑤ 빛줄기
const beam=new THREE.Mesh(new THREE.ConeGeometry(3.2,11,40,1,true),new THREE.MeshBasicMaterial({color:0xfff1d8,transparent:true,opacity:.04,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false}));
beam.position.set(0.4,5.6,0);scene.add(beam);
function updateBackdrop(dt,t){
  const U=sky.material.uniforms;U.uT.value=t;U.uS.value=speed;U.uL.value=life;U.uH.value=harm;
  bigGears.forEach(g=>{g.rotateZ(dt*g.userData.v*(0.25+1.6*speed));});bigGearMat.emissiveIntensity=speed*0.35+harm*0.2;
  const nLeaf=0.3+0.7*Math.max(life,harm),nMetal=0.3+0.7*Math.max(speed,harm);
  flies.forEach(g=>{const u=g.userData;const on=u.k<(u.metal?nMetal:nLeaf);u.s+=((on?1:0)-u.s)*dt*1.5;
    if(u.s<0.01){g.visible=false;return;}g.visible=true;
    u.a+=dt*u.w*(0.7+0.6*harm);const R=u.R+Math.sin(t*.3+u.ph)*.6;
    const x=Math.cos(u.a)*R+0.3,z=Math.sin(u.a)*R,y=u.h+Math.sin(t*.8+u.ph)*.5;
    tmpV.set(Math.cos(u.a+0.15*Math.sign(u.w))*R+0.3,y+Math.cos(t*.8+u.ph)*.06,Math.sin(u.a+0.15*Math.sign(u.w))*R);
    g.position.set(x,y,z);g.lookAt(tmpV);
    const fl=Math.sin(t*u.f+u.ph)*1.05;u.wl.rotation.z=fl;u.wr.rotation.z=-fl;
    g.scale.setScalar(u.s*(u.metal?0.9:1)*(1+0.25*harm));});
  brassMat.emissiveIntensity=.4+speed*.6;leafMat.emissiveIntensity=leafMat2.emissiveIntensity=.3+life*.6;
  for(let i=0;i<NP;i++){const q=pv[i];pPos[i*3+1]+=dt*q.v*(0.4+(q.warm?speed:life)*1.4);
    pPos[i*3]+=Math.sin(t*.6+q.sw)*dt*.08;if(pPos[i*3+1]>10)pPos[i*3+1]=0;}
  pGeo.attributes.position.needsUpdate=true;pMat.opacity=.35+.4*Math.max(speed,life)+.25*harm;
  beam.material.opacity=.03+.06*harm+.01*Math.sin(t*1.7);
}
const tmpV=new THREE.Vector3();

/* ---------- audio (sounds made with earshot) ---------- */
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
}
function updateListener(){if(!ctx)return;const L=ctx.listener;const f=new THREE.Vector3();camera.getWorldDirection(f);
  if(L.positionX){L.positionX.value=camera.position.x;L.positionY.value=camera.position.y;L.positionZ.value=camera.position.z;
    L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0;}
  else{L.setPosition(camera.position.x,camera.position.y,camera.position.z);L.setOrientation(f.x,f.y,f.z,0,1,0);}}
function mix(){if(!ctx||!beds.wind)return;const t=ctx.currentTime;
  const machineAlone=Math.max(0,speed-life);
  beds.bgm.g.gain.setTargetAtTime(1.4*(1-0.45*machineAlone)+0.7*harm,t,1.2);
  beds.wind.g.gain.setTargetAtTime(1.5*(1-0.5*machineAlone),t,.4);
  beds.birds.g.gain.setTargetAtTime(1.9*harm*harm,t,.8);
  beds.engine.g.gain.setTargetAtTime(2.4*speed*(1-0.35*harm),t,.3);
  beds.engine.s.playbackRate.setTargetAtTime(0.55+0.5*speed,t,.3);
  beds.gears.g.gain.setTargetAtTime(1.6*speed,t,.3);
  beds.gears.s.playbackRate.setTargetAtTime(0.6+0.5*speed,t,.3);}

/* ---------- state ---------- */
let machineOn=false,speed=0,life=0,harm=0,growth=0,bloomed=false,rot=0;

/* ---------- camera orbit + interaction ---------- */
const target=V(0.45,2.5,0);let theta=0.55,phi=0.12,radius=innerWidth<innerHeight?9.5:7.2,lastTouch=0;
let tiltT=0,tiltP=0;
function placeCam(){const th=theta+tiltT*0.5,ph=clamp(phi-tiltP*0.25,-0.05,0.95);camera.position.set(target.x+radius*Math.sin(th)*Math.cos(ph),target.y+radius*Math.sin(ph),target.z+radius*Math.cos(th)*Math.cos(ph));camera.lookAt(target);}
const ray=new THREE.Raycaster();const ndc=new THREE.Vector2();
function pick(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
  const hE=ray.intersectObject(E,true)[0],hT=ray.intersectObject(tree,false)[0];
  if(hE&&(!hT||hE.distance<=hT.distance))return {what:'engine',p:hE.point};
  if(hT)return {what:'tree',p:hT.point};return null;}
const ptrs=new Map();let mode=null,downAt=null,rubAcc=0,lastKnock=0,lastCreak=0,pinch0=0,r0=radius;
const cv=renderer.domElement;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});lastTouch=performance.now();
  if(ptrs.size===2){mode='pinch';const a=[...ptrs.values()];pinch0=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);r0=radius;return;}
  const h=pick(e.clientX,e.clientY);downAt={x:e.clientX,y:e.clientY,h};
  mode=h&&h.what==='tree'?'rub':'orbit';
  if(h&&h.what==='tree'){shot('touch_wood',h.p,.7,rnd(.85,1.1));}});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const prev=ptrs.get(e.pointerId);const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});lastTouch=performance.now();
  if(mode==='pinch'&&ptrs.size===2){const a=[...ptrs.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);radius=clamp(r0*pinch0/Math.max(d,1),4,13);return;}
  if(mode==='orbit'){theta-=dx*0.006;phi=clamp(phi+dy*0.004,-0.05,0.9);return;}
  if(mode==='rub'){const h=pick(e.clientX,e.clientY);if(!h||h.what!=='tree')return;
    rubAcc+=Math.hypot(dx,dy);const now=performance.now();
    while(rubAcc>30){rubAcc-=30;life=Math.min(1,life+0.035);}
    if(now-lastKnock>170){lastKnock=now;shot('touch_wood',h.p,.35,rnd(.7,1.2));}
    if(now-lastCreak>2600&&Math.random()<.5){lastCreak=now;shot('tree_creak',h.p,.6,rnd(.85,1.05));}}});
function up(e){ptrs.delete(e.pointerId);
  if(mode!=='pinch'&&downAt&&downAt.h&&downAt.h.what==='engine'&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)<12){
    machineOn=!machineOn;shot('touch_metal',downAt.h.p,.5);shot(machineOn?'machine_start':'machine_stop',EBASE,machineOn?.6:.5);}
  if(ptrs.size===0){mode=null;downAt=null;}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{radius=clamp(radius+e.deltaY*0.005,4,13);},{passive:true});

/* ---------- UI ---------- */
const $=id=>document.getElementById(id);
$('enter').addEventListener('click',()=>{ $('loading').textContent='소리를 불러오는 중…';
  if(IS_MOBILE){try{sensor.enable();}catch(e){} try{keepAwake();}catch(e){}}
  startAudio().catch(()=>{}).finally(()=>{const i=$('intro');i.style.opacity=0;setTimeout(()=>i.remove(),1000);});});
$('mute').addEventListener('click',()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:1,ctx.currentTime,.1);$('mute').textContent=muted?'소리 켜기':'소리 끄기';});
let lastMsg='';function say(m){if(m===lastMsg)return;lastMsg=m;const s=$('status');s.style.opacity=0;setTimeout(()=>{s.textContent=m;s.style.opacity=.92;},350);}
function statusText(){
  if(bloomed&&harm>.6)return '기계의 힘이 나무로 흐르고, 나무가 기계를 품고 있어요.';
  if(speed>.5&&life<.35)return '기계만 돌면 숲이 탁해져요. 나무도 문질러 깨워 주세요.';
  if(life>.5&&speed<.3)return '나무가 깨어났어요. 이제 기계를 눌러 움직여 보세요.';
  if(speed>.5&&life>.35)return '기계와 나무가 서로에게 닿고 있어요. 조금 더요.';
  return '기계를 눌러 깨우고, 나무를 문질러 보세요.';}

/* ---------- loop ---------- */
const clock=new THREE.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  speed+=((machineOn?1:0)-speed)*dt*(machineOn?0.7:1.2);
  life=Math.max(0,life-dt*0.012);
  const hT=Math.min(speed,life);harm+=(hT-harm)*dt*0.8;growth=Math.max(growth,harm);
  if(!bloomed&&harm>0.82){bloomed=true;shot('bloom',null,.7);const c=$('caption');c.style.opacity=1;setTimeout(()=>c.style.opacity=0,6500);}
  // engine
  rot+=dt*speed*11;crank.rotation.z=-rot;cam.rotation.z=-rot*.5;camGear.rotation.z=-rot*.5;alt.rotation.z=-rot*1.9;sideGear.rotation.z=rot*1.4;
  valves.forEach((v,i)=>v.position.y=0.82+Math.max(0,Math.sin(rot*.5+i*Math.PI/2))*0.05*speed);
  const j=0.007*speed;E.position.set(EBASE.x+rnd(-j,j),EBASE.y+rnd(-j,j),EBASE.z+rnd(-j,j));
  glowMat.emissiveIntensity=speed*(1.4+0.4*Math.sin(t*9));engineLight.position.copy(EBASE).add(V(0,0,0.7));engineLight.intensity=speed*1.6+harm*0.8;
  // tree
  treeMat.color.copy(DRY).lerp(ALIVE,life);treeMat.emissiveIntensity=harm*0.5;
  updateMoss(growth);
  // sap
  sapMat.opacity=clamp(speed*(0.25+0.75*life),0,1)*0.9;
  if(speed>0.02){for(let i=0;i<NS;i++){const s=sap[i];const P=s.path;s.s+=dt*s.v*(1.5+3*speed);if(s.s>=P.length-1){s.s=0;s.path=sapPaths[(Math.random()*sapPaths.length)|0];}
    const k=Math.floor(s.s),f=s.s-k,a=s.path[k],b=s.path[Math.min(k+1,s.path.length-1)];
    sapPos[i*3]=a.x+(b.x-a.x)*f;sapPos[i*3+1]=a.y+(b.y-a.y)*f;sapPos[i*3+2]=a.z+(b.z-a.z)*f;}
    sapGeo.attributes.position.needsUpdate=true;}
  // fog: thick and grey when the machine runs alone, lifting in coexistence
  const alone=Math.max(0,speed-life);scene.fog.density=0.055+0.05*alone-0.03*harm;
  scene.fog.color.setRGB(0.045+0.05*alone,0.045+0.05*alone,0.05+0.05*alone);
  mists.forEach(m=>{m.position.x+=m.userData.v*dt;if(Math.abs(m.position.x)>4)m.userData.v*=-1;m.material.opacity=0.06+0.08*alone-0.03*harm;});
  key.intensity=2.0+1.2*harm;
  // camera drift when idle
  if(performance.now()-lastTouch>3500&&!mode)theta+=dt*0.06;
  tiltT+=((IS_MOBILE?sensor.tiltX:0)-tiltT)*0.08;tiltP+=((IS_MOBILE?sensor.tiltY:0)-tiltP)*0.08;
  updateBackdrop(dt,t);
  placeCam();updateListener();mix();
  $('mTree').style.width=(life*100)+'%';$('mMach').style.width=(speed*100)+'%';$('mHarm').style.width=(harm*100)+'%';
  say(statusText());
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
placeCam();frame();
/* ---------- ARTMOS: 나가기 · 상단 안전 영역 ---------- */
document.querySelectorAll('.co-exit').forEach(a=>a.addEventListener('click',e=>{
  if(IN_FRAME){e.preventDefault();try{parent.postMessage({type:'artmos:close-exhibit'},'*');}catch(err){}setTimeout(()=>{location.href='./';},600);}}));
addEventListener('message',e=>{const d=e.data||{};if(d.type==='artmos:safe'&&typeof d.top==='number')document.documentElement.style.setProperty('--sat',d.top+'px');});
if(IN_FRAME&&/iPhone/.test(navigator.userAgent)){const H=screen.height;document.documentElement.style.setProperty('--sat',(H>=852?59:H>=812?47:20)+'px');}
if(location.hash==='#debug')window.__co={get speed(){return speed;},get life(){return life;},get harm(){return harm;},setMachine:v=>{machineOn=!!v;},setLife:v=>{life=v;}};
