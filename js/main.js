/* STARS OF BLOOD 3D - chapter one: the tithe. Three.js WebGL. */
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import { DRACOLoader } from '../lib/DRACOLoader.js';
import * as SkeletonUtils from '../lib/SkeletonUtils.js';

const AU = window.SOBAudio;
const TAU = Math.PI*2;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* ---------- renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer: new URLSearchParams(location.search).has('shot')});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030507);
scene.fog = new THREE.FogExp2(0x030507, 0.00055);
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, .5, 9000);

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* lights: cool ambient + hard key + green port glow handled per-object */
scene.add(new THREE.AmbientLight(0x24333a, 1.05));
const key = new THREE.DirectionalLight(0xdceaf2, 2.7); key.position.set(1,.6,.4); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb0c8, .75); rim.position.set(-1,-.3,-.6); scene.add(rim);

/* ---------- sky: starfield + nebula sprites ---------- */
function nebulaTexture(c1, c2){
  const cv = document.createElement('canvas'); cv.width=cv.height=256;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,c1); g.addColorStop(.55,c2); g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,256,256);
  const t = new THREE.CanvasTexture(cv); return t;
}
const skySpace = new THREE.Group(); scene.add(skySpace);
{
  const n = 2600, pos = new Float32Array(n*3), col = new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(3200,7000));
    pos.set([v.x,v.y,v.z], i*3);
    const b = rand(.3,1); col.set([b*.85,b*.95,b*.9], i*3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color', new THREE.BufferAttribute(col,3));
  skySpace.add(new THREE.Points(geo, new THREE.PointsMaterial({size:9, vertexColors:true, sizeAttenuation:true, fog:false})));
  // hero stars: fewer, brighter, bluer - the Bleed's cold suns
  const n2=420, pos2=new Float32Array(n2*3), col2=new Float32Array(n2*3);
  for(let i=0;i<n2;i++){
    const v=new THREE.Vector3().randomDirection().multiplyScalar(rand(3400,7000));
    pos2.set([v.x,v.y,v.z],i*3);
    const b=rand(.7,1); col2.set([b*.9,b*.98,b],i*3);
  }
  const geo2=new THREE.BufferGeometry();
  geo2.setAttribute('position',new THREE.BufferAttribute(pos2,3));
  geo2.setAttribute('color',new THREE.BufferAttribute(col2,3));
  skySpace.add(new THREE.Points(geo2,new THREE.PointsMaterial({size:20,vertexColors:true,sizeAttenuation:true,fog:false})));
  // archive plates: mist, not candy - few, huge, faint
  const nebs = [
    ['rgba(46,140,115,.34)','rgba(20,70,60,.16)'],   // teal
    ['rgba(120,90,110,.3)','rgba(60,45,60,.15)'],    // pale rose
    ['rgba(60,80,120,.3)','rgba(35,45,75,.15)'],     // slate blue
    ['rgba(150,70,48,.26)','rgba(90,40,28,.13)'],    // ember, rare
  ];
  for(let i=0;i<16;i++){
    const t = nebulaTexture(...nebs[i%nebs.length]);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthWrite:false, fog:false, opacity:rand(.22,.45)}));
    sp.name='skyNeb'; sp.userData.o0=sp.material.opacity;
    sp.position.copy(new THREE.Vector3().randomDirection().multiplyScalar(rand(4200,6800)));
    const s = rand(3600,8200); sp.scale.set(s,s,1);
    skySpace.add(sp);
  }
  // the Bleed's sun, along the key light (archive plate 015)
  const sunCv=document.createElement('canvas'); sunCv.width=sunCv.height=256;
  { const x=sunCv.getContext('2d');
    const g=x.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,'rgba(255,252,238,1)'); g.addColorStop(.07,'rgba(255,250,228,.95)');
    g.addColorStop(.22,'rgba(190,215,235,.25)'); g.addColorStop(1,'rgba(120,160,200,0)');
    x.fillStyle=g; x.fillRect(0,0,256,256); }
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(sunCv),transparent:true,depthWrite:false,fog:false}));
  sun.name='skySun';
  sun.position.set(6000,3600,2400); sun.scale.set(3400,3400,1); skySpace.add(sun);
  // red-brown moon with maria, off the shoulder (plate 015)
  const moonCv=document.createElement('canvas'); moonCv.width=moonCv.height=256;
  { const x=moonCv.getContext('2d');
    const g=x.createRadialGradient(106,98,12,128,128,124);
    g.addColorStop(0,'rgba(172,96,66,1)'); g.addColorStop(.55,'rgba(128,66,46,.98)');
    g.addColorStop(.9,'rgba(78,40,30,.96)'); g.addColorStop(.99,'rgba(54,28,22,.9)'); g.addColorStop(1,'rgba(40,20,16,0)');
    x.fillStyle=g; x.beginPath(); x.arc(128,128,124,0,7); x.fill();
    x.fillStyle='rgba(88,46,34,.45)';
    [[92,98,26],[152,142,20],[118,172,14],[172,88,12],[140,60,9]].forEach(b=>{x.beginPath();x.arc(b[0],b[1],b[2],0,7);x.fill();}); }
  const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(moonCv),transparent:true,depthWrite:false,fog:false}));
  moon.name='skyMoon';
  moon.position.set(-4600,1800,-4600); moon.scale.set(1150,1150,1); skySpace.add(moon);
  // stationcolor5: luminous white-blue core the quietwar chapter silhouettes against
  const coreGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture('rgba(240,248,255,.95)','rgba(140,170,235,.28)'),transparent:true,depthWrite:false,fog:false,opacity:0,blending:THREE.AdditiveBlending}));
  coreGlow.name='skyCoreGlow'; coreGlow.position.set(2600,500,-5400); coreGlow.scale.set(6200,6200,1); skySpace.add(coreGlow);
  // plate 003: warm sun burning through the rose mist behind the basalt
  const sunBloom=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture('rgba(255,246,230,.9)','rgba(240,205,170,.22)'),transparent:true,depthWrite:false,fog:false,opacity:0,blending:THREE.AdditiveBlending}));
  sunBloom.name='skySunBloom'; sunBloom.position.set(-2400,1500,-5400); sunBloom.scale.set(5200,5200,1); skySpace.add(sunBloom);
}
/* ---------- per-chapter sky themes (plate-true environment pass) ---------- */
function bgTexture(stops){ const cv=document.createElement('canvas'); cv.width=cv.height=512;
  const x=cv.getContext('2d');
  const g=x.createRadialGradient(256,256,10,256,256,360);
  for(const [o,c] of stops) g.addColorStop(o,c);
  x.fillStyle=g; x.fillRect(0,0,512,512);
  const t=new THREE.CanvasTexture(cv); return t; }
const SKY_THEMES={
  tithe:   {bg:null, bgC:0x030507, fog:0x030507, fogD:.00055, key:[0xdceaf2,2.7], sun:1,  moon:1, neb:1,  star:1, core:0, bloom:0},
  quietwar:{bg:bgTexture([[0,'rgba(245,248,255,1)'],[.28,'rgba(180,200,235,.9)'],[.6,'rgba(105,110,160,.85)'],[1,'rgba(64,50,86,1)']]),
                       fog:0x0a0c14, fogD:.00045, key:[0xd8e2f8,2.9], sun:.6, moon:.8, neb:1.2, star:.7, core:.85, bloom:0},
  bleed:   {bg:bgTexture([[0,'rgba(246,232,216,1)'],[.35,'rgba(226,196,172,.95)'],[.7,'rgba(168,128,112,.9)'],[1,'rgba(96,70,64,1)']]),
                       fog:0xdcc6b2, fogD:.0005, key:[0xf2e2d2,2.5], sun:0,  moon:0,  neb:.5, star:.18, core:0, bloom:.6},
};
function setSkyTheme(name){ const t=SKY_THEMES[name]||SKY_THEMES.tithe; G.skyTheme=name;
  if(planet.on) return;
  if(t.bg){ scene.background=t.bg; } else scene.background=new THREE.Color(t.bgC);
  scene.fog.color.set(t.fog); scene.fog.density=t.fogD;
  key.color.set(t.key[0]); key.intensity=t.key[1];
  const sunO=skySpace.getObjectByName('skySun'), moonO=skySpace.getObjectByName('skyMoon');
  if(sunO) sunO.material.opacity=t.sun;
  if(moonO) moonO.material.opacity=t.moon;
  const coreO=skySpace.getObjectByName('skyCoreGlow'), bloomO=skySpace.getObjectByName('skySunBloom');
  if(coreO) coreO.material.opacity=t.core;
  if(bloomO) bloomO.material.opacity=t.bloom;
  skySpace.traverse(o=>{ if(o.name==='skyNeb') o.material.opacity=o.userData.o0*t.neb;
    if(o.isPoints){ o.material.transparent=true; o.material.opacity=t.star; } });
}

/* ---------- wreck graveyard (Bleed mood plate) + green lamp ---------- */
const wrecks=[];
{
  const wreckMat = new THREE.MeshStandardMaterial({color:0x0d1512, roughness:.85, metalness:.5});
  const rustMat  = new THREE.MeshStandardMaterial({color:0x1a120c, roughness:.9, metalness:.35});
  for(let i=0;i<55;i++){
    const big = i<7;
    let mesh;
    if(big){
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(rand(6,14),rand(10,20),rand(60,160),7), wreckMat);
    } else {
      const g = Math.random()<.5 ? new THREE.TetrahedronGeometry(rand(3,11)) : new THREE.BoxGeometry(rand(3,14),rand(2,9),rand(4,16));
      mesh = new THREE.Mesh(g, Math.random()<.7?wreckMat:rustMat);
    }
    const v = new THREE.Vector3().randomDirection();
    v.y*=.45;
    mesh.position.copy(v.normalize().multiplyScalar(rand(420,2600)));
    mesh.rotation.set(rand(0,6.3),rand(0,6.3),rand(0,6.3));
    mesh.userData.spin = new THREE.Vector3(rand(-.14,.14),rand(-.14,.14),rand(-.14,.14));
    scene.add(mesh); wrecks.push(mesh);
  }
  // Free Port's green lamp, visible across the graveyard
  const lampTex = nebulaTexture('rgba(120,255,190,.9)','rgba(40,180,120,.35)');
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({map:lampTex,transparent:true,depthWrite:false,fog:false,opacity:.95}));
  lamp.name='portLamp'; lamp.scale.set(90,90,1);
  scene.add(lamp);
}

/* ---------- space dust (speed feel) ---------- */
const DUST_N=320, DUST_BOX=130;
const dustPos=new Float32Array(DUST_N*3);
for(let i=0;i<DUST_N*3;i++) dustPos[i]=rand(-DUST_BOX,DUST_BOX);
const dustGeo=new THREE.BufferGeometry();
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dustTexCv=document.createElement('canvas'); dustTexCv.width=dustTexCv.height=32;
{ const x=dustTexCv.getContext('2d'); const g=x.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.4,'rgba(255,255,255,.6)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,32,32); }
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0x9fd8c8,size:.9,map:new THREE.CanvasTexture(dustTexCv),sizeAttenuation:true,transparent:true,opacity:.6,fog:false,depthWrite:false}));
scene.add(dust);
function updateDust(){
  const p=player.obj.position;
  dust.position.set(Math.round(p.x/DUST_BOX)*0,0,0); // keep at origin of wrap space
  for(let i=0;i<DUST_N*3;i+=3){
    for(let k=0;k<3;k++){
      const c=k===0?'x':k===1?'y':'z';
      let v=dustPos[i+k]-p[c];
      v=((v%DUST_BOX)+DUST_BOX*1.5)%DUST_BOX-DUST_BOX/2;
      dustPos[i+k]=p[c]+v;
    }
  }
  dustGeo.attributes.position.needsUpdate=true;
}

/* ---------- materials ---------- */
const M = {
  hull:  new THREE.MeshStandardMaterial({color:0x2e4a42, roughness:.55, metalness:.6}),
  hullD: new THREE.MeshStandardMaterial({color:0x22333d, roughness:.5, metalness:.65}),
  comb:  new THREE.MeshStandardMaterial({color:0x33383f, roughness:.45, metalness:.7}),
  brass: new THREE.MeshStandardMaterial({color:0x5a4a33, roughness:.6, metalness:.5}),
  teal:  new THREE.MeshStandardMaterial({color:0x7fd8b8, emissive:0x2a8a66, emissiveIntensity:1.4}),
  red:   new THREE.MeshStandardMaterial({color:0xff5030, emissive:0xaa1808, emissiveIntensity:2.2}),
  orange:new THREE.MeshStandardMaterial({color:0xff9a50, emissive:0xcc5200, emissiveIntensity:1.8}),
  green: new THREE.MeshStandardMaterial({color:0x5affaa, emissive:0x1a9a5a, emissiveIntensity:1.6}),
  glass: new THREE.MeshStandardMaterial({color:0xbff5e2, emissive:0x3a7a66, emissiveIntensity:.8, roughness:.1, metalness:.2}),
};

/* ---------- procedural ships (GLB hot-swap: assets/glb/<name>.glb) ---------- */
const glbLoader = new GLTFLoader();
const draco = new DRACOLoader(); draco.setDecoderPath('./lib/draco/gltf/');
glbLoader.setDRACOLoader(draco);
const glbCache = {};
function glb(name){
  if (glbCache[name] !== undefined) return glbCache[name];
  glbCache[name] = null;
  glbLoader.load('assets/glb/'+name+'.glb', g=>{ glbCache[name] = {scene:g.scene, animations:g.animations||[]}; }, undefined, ()=>{});
  return null;
}
['interceptor','sentinel','cutter','freighter','port','frigate','strider','warship015','manta','temple_spire','rock_spire_a','rock_spire_b','rock_column','rock_arch','old_captain_bust'].forEach(glb);

function buildInterceptor(){
  const g = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.ConeGeometry(2.2, 14, 6), M.hullD);
  fus.rotation.x = Math.PI/2; fus.position.z = 3; g.add(fus);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.6,2.2,5,6), M.hullD);
  tail.rotation.x = Math.PI/2; tail.position.z = -6; g.add(tail);
  for (const s of [-1,1]){
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11,.5,5), M.hull);
    wing.position.set(s*5.4, 0, -3.5); wing.rotation.y = s*.42; g.add(wing);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1,8,8), M.orange);
    tip.position.set(s*9.6, 0, -5.4); g.add(tip);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.5,4,4), M.hull);
  fin.position.set(0,2,-5); g.add(fin);
  const cock = new THREE.Mesh(new THREE.SphereGeometry(1.1,10,10), M.glass);
  cock.position.set(0,1.1,1.5); g.add(cock);
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,.6,8), M.orange);
  eng.rotation.x = Math.PI/2; eng.position.z = -8.6; g.add(eng);
  return g;
}
function buildSentinel(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.6,5,4), M.comb);
  body.rotation.x = Math.PI/2; g.add(body);
  for(let i=0;i<3;i++){ const a=i*TAU/3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.22,.14,4.4,5), M.comb);
    leg.position.set(Math.cos(a)*1.8, Math.sin(a)*1.8, -1.6);
    leg.rotation.z = a; leg.rotation.x = .7; g.add(leg); }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.7,8,8), M.red);
  eye.position.z = 2.2; g.add(eye);
  return g;
}
function buildCutter(){
  const g = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.4,2,16,6), M.comb);
  fus.rotation.x = Math.PI/2; g.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13,.5,6), M.comb);
  wing.position.set(2.5,0,-2); wing.rotation.y = .5; g.add(wing);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.9,8,8), M.red);
  eye.position.set(0,0,7.6); g.add(eye);
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,.6,8), M.teal);
  eng.rotation.x = Math.PI/2; eng.position.z = -8.2; g.add(eng);
  return g;
}
function buildFreighter(){
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(3,3.6,22,8), M.brass);
  hull.rotation.x = Math.PI/2; g.add(hull);
  const cols = [0x6a8a9a,0x9a8a5a,0x9a5a5a];
  for(let i=0;i<6;i++){ const s = i%2?1:-1, row = (i/2)|0;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,5), new THREE.MeshStandardMaterial({color:cols[i%3],roughness:.7}));
    pod.position.set(s*3.4, row%2? 1.2:-1.2, -6+row*6); g.add(pod); }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3,2.4,3), M.hullD);
  bridge.position.set(0,1.6,10.4); g.add(bridge);
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.6,.8,.4), M.glass);
  win.position.set(0,1.9,11.8); g.add(win);
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.6,2,.7,8), M.orange);
  eng.rotation.x = Math.PI/2; eng.position.z = -11.4; g.add(eng);
  return g;
}
function buildFrigate(){
  const g = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(4,7,42,7), M.comb);
  fus.rotation.x = Math.PI/2; g.add(fus);
  for (const s of [-1,1]){
    const wing = new THREE.Mesh(new THREE.BoxGeometry(26,.8,14), M.comb);
    wing.position.set(s*12,0,-6); wing.rotation.y = s*.35; g.add(wing);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(2.4,10,10), M.red);
  eye.position.set(0,0,20); g.add(eye);
  for(let i=0;i<4;i++){ const rib = new THREE.Mesh(new THREE.TorusGeometry(5+i*1.1,.4,6,14), M.comb);
    rib.position.z = -8-i*6; g.add(rib); }
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(3,4,1,8), M.teal);
  eng.rotation.x = Math.PI/2; eng.position.z = -28; g.add(eng);
  return g;
}
function buildPort(){
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(46,6,10,40), M.hullD); g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(30,2.4,8,32), M.green); g.add(ring2);
  for(let i=0;i<8;i++){ const a=i*TAU/8;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(2,2,18), M.hullD);
    spoke.position.set(Math.cos(a)*37, Math.sin(a)*37, 0);
    spoke.rotation.z = a+Math.PI/2; g.add(spoke);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,2.6), M.green);
    lamp.position.set(Math.cos(a)*46, Math.sin(a)*46, 0); g.add(lamp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(9,9,10,10), M.hullD);
  hub.rotation.x = Math.PI/2; g.add(hub);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(2,10,10), M.green);
  g.add(beacon);
  const light = new THREE.PointLight(0x5affaa, 4, 700); g.add(light);
  return g;
}
const builders = {interceptor:buildInterceptor, sentinel:buildSentinel, cutter:buildCutter,
  freighter:buildFreighter, port:buildPort, frigate:buildFrigate};
const glbNorm = {};
function normalizedGLB(name){
  const src = glbCache[name];
  if (!src) return null;
  if (src.animations.length){ // rigged hero models: deskin (single-root-bone skins fight node transforms), rebuild every call
    const inner = SkeletonUtils.clone(src.scene);
    deskin(inner);
    return buildNormWrap(name, inner);
  }
  if (!glbNorm[name]){
    const inner = src.scene.clone(true);
    glbNorm[name] = buildNormWrap(name, inner, true);
  }
  const c = glbNorm[name].clone(true);
  c.userData.clips = src.animations; // clone() JSON-roundtrips userData; reattach real clips
  return c;
}
function deskin(root){
  const swaps=[];
  root.traverse(o=>{ if(o.isSkinnedMesh) swaps.push(o); });
  swaps.forEach(sm=>{ const m=new THREE.Mesh(sm.geometry, sm.material);
    m.name=sm.name; m.position.copy(sm.position); m.quaternion.copy(sm.quaternion); m.scale.copy(sm.scale);
    sm.parent.add(m); sm.removeFromParent(); });
}
function buildNormWrap(name, inner, cache){
    const proto = builders[name]();
    const ps = new THREE.Box3().setFromObject(proto).getSize(new THREE.Vector3());
    if(name==='frigate'||name==='warship015'){ inner.rotation.y = Math.PI; } // nose -Z -> nose +Z
    else if(name==='interceptor') inner.rotation.y = Math.PI; // hero v1 actually ships Y-up nose -Z (new convention), not +Y as labeled
    else inner.rotation.x = Math.PI/2; // asset lane renders nose-up (+Y) -> nose +Z
    // archive palette pass (plate 015): Regime hulls slate grey-blue, escorts scrappy warm; teal stays in lights
    const glbTint={frigate:[0x78828c,.55,3.2], warship015:[0x9aa2a8,0,1.0], // hero v4: keep lane-authored plate palette freighter:[0x7a8288,.35,1.8], port:[0x55606a,.35,1.7],
                   sentinel:[0x6a5f4c,.3,1.6], cutter:[0x6a5f4c,.3,1.6], interceptor:[0x5c6a62,0,1.0]}; // hero swap: keep lane-authored fighter1 palette
    inner.traverse(m=>{ if(m.isMesh&&m.material){ m.material=m.material.clone();
      const mt=m.material; const t=glbTint[name];
      if(mt.color){ mt.color.multiplyScalar(t?t[2]:1.4); if(t) mt.color.lerp(new THREE.Color(t[0]), t[1]); }
      if('metalness' in mt) mt.metalness=Math.min(mt.metalness,0.3);
      if(mt.emissive) mt.emissiveIntensity=(mt.emissiveIntensity||1)*2.0; } });
    const gs = new THREE.Box3().setFromObject(inner);
    const size = gs.getSize(new THREE.Vector3());
    const target = Math.max(ps.x,ps.y,ps.z), cur = Math.max(size.x,size.y,size.z)||1;
    const c = gs.getCenter(new THREE.Vector3());
    inner.position.sub(c);
    const wrap = new THREE.Group();
    wrap.add(inner); wrap.scale.setScalar(target/cur);
    return wrap;
}
builders.warship015 = builders.frigate; // size/scale proto alias
function makeShip(name){
  if (name==='frigate'){ const w = normalizedGLB('warship015'); if (w) return w; }
  const g = normalizedGLB(name);
  if (g) return g;
  return builders[name]();
}
/* place a non-fleet lane GLB scaled to a target size; null until the file ships (no preload, no 404s) */
function tryPlaceGLB(name, targetMax){
  const src = glbCache[name];
  if (!src) return null;
  const inner = src.animations.length ? SkeletonUtils.clone(src.scene) : src.scene.clone(true);
  // lane convention (confirmed): Y-up, nose/face -Z; standing models feet at y=0, flyers centered
  const gs = new THREE.Box3().setFromObject(inner);
  const size = gs.getSize(new THREE.Vector3());
  const cur = Math.max(size.x,size.y,size.z)||1;
  const c = gs.getCenter(new THREE.Vector3());
  inner.position.x -= c.x; inner.position.z -= c.z; // center X/Z, keep Y as authored (feet on y=0)
  inner.traverse(m=>{ if(m.isMesh&&m.material&&'metalness' in m.material) m.material.metalness=Math.min(m.material.metalness,0.3); });
  const wrap = new THREE.Group();
  wrap.add(inner); wrap.scale.setScalar(targetMax/cur);
  wrap.userData.clips = src.animations;
  return wrap;
}
/* place a rock GLB scaled by HEIGHT (authored aspects kept; bases sit on position.y) */
function placeRock(name, targetH){
  const w=tryPlaceGLB(name, 100); if(!w) return null;
  const bs=new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3());
  w.scale.multiplyScalar(targetH/(bs.y||1));
  return w;
}
function playClip(wrap, pref){
  const clips = wrap.userData.clips||[];
  if (!clips.length) return null;
  const mixer = new THREE.AnimationMixer(wrap);
  const clip = clips.find(c=>c.name===pref) || clips.find(c=>c.name==='main') || clips[0];
  mixer.clipAction(clip).play();
  return mixer;
}

/* ---------- procedural animation variants: additive bone drivers layered on the baked clips ---------- */
const ANIM_VARS = [
  {name:'A - CLIP ONLY (baked walk, nothing added)', gait:1,   stride:0,   sway:0,   tend:0,  tendF:0,   flap:0},
  {name:'B - HEAVY GRAZER (slow gait, wide stride)', gait:.7,  stride:.10, sway:.05, tend:.10,tendF:.8,  flap:.05},
  {name:'C - FAST SCUTTLE (quick gait, busy tendrils)', gait:1.6, stride:.06, sway:.03, tend:.16,tendF:1.7, flap:.10},
  {name:'D - SWAY + FLUTTER (languid body roll)',    gait:1,   stride:.04, sway:.09, tend:.35,tendF:2.3, flap:.22},
  {name:'E - FULL DRESS (everything on)',            gait:.85, stride:.12, sway:.07, tend:.5, tendF:1.2, flap:.15},
];
function boneMap(wrap){ if(wrap.userData.bones) return wrap.userData.bones;
  const b={}; wrap.traverse(o=>{ if(o.isBone) b[o.name]=o; });
  return wrap.userData.bones=b; }
function addOff(o,rx,ry,rz,py){ const p=o.userData._off||(o.userData._off={x:0,y:0,z:0,py:0});
  o.rotation.x+=rx-p.x; o.rotation.y+=ry-p.y; o.rotation.z+=rz-p.z;
  if(py!==undefined){ o.position.y+=py-p.py; p.py=py; }
  p.x=rx; p.y=ry; p.z=rz; }
function driveStrider(wrap, vi, t){
  const v=ANIM_VARS[vi]; if(!v) return;
  const b=boneMap(wrap); if(!b.body) return;
  addOff(b.body, 0, 0, v.sway*Math.sin(t*1.4), v.sway*6*Math.sin(t*2.8));
  for(let i=0;i<4;i++){ const up=b['leg'+i+'_up'];
    if(up) addOff(up, v.stride*Math.sin(t*3.1+(i%2?Math.PI:0)+(i>1?.6:0)), 0, 0); }
  for(let i=0;i<9;i++){ const td=b['tend'+i];
    if(td) addOff(td, v.tend*Math.sin(t*v.tendF*2.2+i*.7), 0, v.tend*.6*Math.sin(t*v.tendF*1.7+i*1.1)); }
  for(let i=0;i<5;i++){ const f=b['flap.00'+i];
    if(f) addOff(f, v.flap*Math.sin(t*2.6+i*.9), 0, 0); }
}
let striderVar=1;

/* ---------- game state ---------- */
const G = { state:'title', t:0, freeze:0, shake:0, kick:0, credits:250, cargo:0, cargoMax:12,
  upgrades:{gun:0,eng:0,hull:0,msl:0}, missionIndex:0, missionState:null, kills:0 };
const UPG = {
  gun:{cost:[400,900,1800]}, eng:{cost:[350,800,1600]}, hull:{cost:[350,800,1600]}, msl:{cost:[300,700,1400]},
  name:{gun:['RUST SPITTERS','TWIN MAG-COILS','VOID REAPERS','THE TITHE-EATER'],
        eng:['SALVAGE DRIVE','ION SKATES','WRAITH COILS','STARLESS BURN'],
        hull:['SCRAP PLATE','RAZOR LAMINATE','DREAD ARMOR','BLOODPROOF'],
        msl:['2-TUBE RACK','4-TUBE RACK','6-TUBE RACK','THE CHOIR']},
};
const player = {
  obj: makeShip('interceptor'), vel: new THREE.Vector3(),
  hull:100, hullMax:100, alive:true, gunCd:0, missiles:2, inv:0, boost:0,
};
scene.add(player.obj);
const port = { obj: makeShip('port'), dockR: 260, hullMax:2000, hull:2000 };
let portExtras=null;
scene.add(port.obj);
const dockRing = new THREE.Mesh(new THREE.TorusGeometry(port.dockR, 1.2, 6, 64),
  new THREE.MeshBasicMaterial({color:0x5affaa, transparent:true, opacity:.25}));
scene.add(dockRing);
/* the Old Captain memorial bust at Free Port (commissioned: image-to-3D off the oldcaptain2 plate) */
let portBust=null;
const tryBust=()=>{ if(portBust) return;
  const b=tryPlaceGLB('old_captain_bust',46);
  if(!b){ setTimeout(tryBust,450); return; }
  b.rotation.y=Math.PI*1.25; b.position.y=6;
  b.traverse(m=>{ if(m.isMesh&&m.material&&m.material.color) m.material.color.multiplyScalar(1.15); });
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(15,19,12,8), new THREE.MeshStandardMaterial({color:0x1d2430, roughness:.9}));
  portBust=new THREE.Group(); portBust.add(plinth); portBust.add(b);
  if(port&&port.obj) portBust.position.copy(port.obj.position).add(new THREE.Vector3(120,-45,120));
  scene.add(portBust); };
setTimeout(tryBust,450);

let enemies=[], lasers=[], elasers=[], missiles=[], pods=[], parts=[], allies=[];

/* ---------- particles ---------- */
const partPool = [];
function spawnParts(p, n, color, spd){
  for(let i=0;i<n;i++){
    let s = partPool.find(s=>!s.userData.live);
    if (!s){ s = new THREE.Sprite(new THREE.SpriteMaterial({map:PART_TEX, color:0xffffff,
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}));
      scene.add(s); partPool.push(s); }
    s.userData.live = true; s.userData.t = s.userData.mx = rand(.3,1.1);
    s.position.copy(p);
    s.userData.vel = new THREE.Vector3().randomDirection().multiplyScalar(rand(spd*.3,spd));
    s.material.color.set(color);
    const sc = rand(2,6); s.scale.set(sc,sc,1);
  }
}
const PART_TEX = (()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32;
  const x=cv.getContext('2d'); const g=x.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,32,32); return new THREE.CanvasTexture(cv); })();

/* ---------- input ---------- */
const keys={}; const mouse={x:0,y:0};
addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true; AU.init(); AU.resume(); handleKey(e.key.toLowerCase()); });
addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
addEventListener('mousemove',e=>{ mouse.x=(e.clientX/innerWidth)*2-1; mouse.y=(e.clientY/innerHeight)*2-1; });
addEventListener('mousedown',()=>{ keys[' ']=true; AU.init(); AU.resume();
  if (G.state==='title') newGame(); });
addEventListener('mouseup',()=>{ keys[' ']=false; });
addEventListener('touchstart',()=>{ AU.init(); AU.resume(); if(G.state==='title') newGame(); }, {passive:true});

function handleKey(k){
  if (G.state==='title'){ if (k==='enter') newGame();
    if (k==='c'){ if(loadSave()) startPlay(true); else newGame(); } return; }
  if (k==='m'){ toast(AU.toggleMute()?'SOUND MUTED':'SOUND ON'); return; }
  if (G.state==='playing'){
    if (k==='p'){ G.state='paused'; toast('PAUSED - P TO RESUME'); return; }
    if (k==='e') tryDock();
    if (k==='q') fireMissile();
    if (k==='v'){ striderVar=(striderVar+1)%ANIM_VARS.length;
      toast('STRIDER VARIANT: '+ANIM_VARS[striderVar].name,4); return; }
    return;
  }
  if (G.state==='paused' && k==='p'){ G.state='playing'; toast(''); }
  if (G.state==='docked' && (k==='e'||k==='escape')) undock();
}

/* ---------- HUD / dialogue ---------- */
const $ = id=>document.getElementById(id);
let toastT=0;
const PORTRAITS={'MUMBIUS':'mumbius','OLD CAPTAIN':'oldcaptain','OVERSEER':'overseer'};
function toast(msg,dur){ $('toast').textContent=msg; $('toast').style.opacity=msg?1:0; toastT=dur||3;
  if(!msg) $('portrait').style.opacity=0; }
function say(who,line,dur){
  $('toast').innerHTML='<b style="color:#5affaa">'+who+':</b> '+line;
  $('toast').style.opacity=1; toastT=dur||4.5; AU.uiClick();
  const p=PORTRAITS[who];
  if(p){ $('portrait').src='assets/portrait-'+p+'.png'; $('portrait').style.opacity=1; }
}
function setMissionUI(t,o){ $('mission').innerHTML = t ?
  '<div class="t">'+t+'</div><div class="obj">'+o+'</div>' : ''; }

/* ---------- save ---------- */
const SAVE_KEY='sob3d_save_v1';
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify({
  credits:G.credits,cargo:G.cargo,upgrades:G.upgrades,missionIndex:G.missionIndex,kills:G.kills })); }catch(e){} }
function loadSave(){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(!s) return false; G.credits=s.credits; G.cargo=s.cargo; G.upgrades=s.upgrades;
  G.missionIndex=s.missionIndex; G.kills=s.kills||0; return true; }catch(e){ return false; } }

/* ---------- stats ---------- */
function applyStats(){ player.hullMax = 100+G.upgrades.hull*60; }
function mslCap(){ return 2+G.upgrades.msl*2; }
function playerSpeed(){ return 90+G.upgrades.eng*22; }
function gunDmg(){ return 8+G.upgrades.gun*5; }
function gunRate(){ return .15-G.upgrades.gun*.022; }

/* ---------- flow ---------- */
function newGame(){ G.credits=250; G.cargo=0; G.upgrades={gun:0,eng:0,hull:0,msl:0};
  G.missionIndex=0; G.kills=0; startPlay(false); }
function startPlay(continued){
  $('title').classList.add('hidden');
  resetWorld(); G.state='playing'; AU.init(); AU.setMode('field');
  if(!continued){
    say('MUMBIUS','So the Bleed has a new rat. Dock is behind you. The Combine tithe fleet comes at cycle\'s end - and the port cannot pay.', 6);
    setTimeout(()=>{ if(G.state==='playing') say('OLD CAPTAIN','Fly. Raid what the Combine bleeds. Come back alive, or don\'t come back.', 5); }, 6500);
  }
  startMission(G.missionIndex);
}
function resetWorld(){
  setPlanetary(false);
  for(const e of enemies) scene.remove(e.obj);
  for(const p of pods) scene.remove(p.obj);
  enemies=[]; lasers=[]; elasers=[]; missiles=[]; pods=[]; allies=[];
  port.obj.position.set(rand(-600,600), rand(-200,200), rand(-600,600));
  if(portBust) portBust.position.copy(port.obj.position).add(new THREE.Vector3(120,-45,120));
  player.obj.position.copy(port.obj.position).add(new THREE.Vector3(160,20,160));
  player.obj.quaternion.identity();
  player.vel.set(0,0,0);
  applyStats(); player.hull=player.hullMax; player.alive=true; player.missiles=mslCap();
}

/* ---------- Bleed monument field (plate 003) + the manta ---------- */
const bleedMon = new THREE.Group(); scene.add(bleedMon);
{
  const rockM = new THREE.MeshStandardMaterial({color:0x2c3644, roughness:.92, metalness:.1});
  const rockM2= new THREE.MeshStandardMaterial({color:0x3a4658, roughness:.88, metalness:.08});
  let rocksBuilt=false;
  const buildRocks=()=>{
    if(rocksBuilt) return;
    const rockNames=['rock_spire_a','rock_spire_b','rock_column','rock_arch'];
    if(!rockNames.every(n=>glbCache[n]) && !buildRocks.giveUp){ setTimeout(buildRocks,400); return; }
    rocksBuilt=true;
  for(let i=0;i<15;i++){
    const a=rand(0,TAU), d=rand(1900,3400);
    const h=rand(500,1500), r=rand(60,170);
    const rockH=[h, h, rand(350,800)][i%3];
    let sp=placeRock(['rock_spire_a','rock_spire_b','rock_column'][i%3], rockH);
    if(sp){ sp.position.set(Math.cos(a)*d, rand(-500,-120), Math.sin(a)*d); sp.rotation.y=rand(0,TAU); }
    else{
    sp=new THREE.Mesh(new THREE.CylinderGeometry(r*rand(.25,.5), r, h, 7), Math.random()<.6?rockM:rockM2);
    sp.position.set(Math.cos(a)*d, rand(-260,240), Math.sin(a)*d);
    sp.rotation.set(rand(-.14,.14), rand(0,TAU), rand(-.14,.14));
    bleedMon.add(sp);
    if(Math.random()<.5){ const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*rand(.5,.8), r*rand(.3,.5), h*.22, 7), rockM2);
      cap.position.copy(sp.position); cap.position.y+=h*.55; cap.rotation.copy(sp.rotation); bleedMon.add(cap); }
    continue; }
    bleedMon.add(sp);
  }
  // the natural arch: two giants bridged (plate 003 centerpiece)
  const archGLB=placeRock('rock_arch',950);
  if(archGLB){ archGLB.position.set(2650,-80,-1900); archGLB.rotation.y=Math.atan2(-300,-550); bleedMon.add(archGLB); }
  else{
  const archA=new THREE.Mesh(new THREE.CylinderGeometry(70,150,1300,7), rockM);
  archA.position.set(2350,-80,-1750); archA.rotation.z=.1; bleedMon.add(archA);
  const archB=new THREE.Mesh(new THREE.CylinderGeometry(60,130,1150,7), rockM);
  archB.position.set(2950,-60,-2050); archB.rotation.z=-.08; bleedMon.add(archB);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(340,58,7,14,Math.PI), rockM);
  arch.position.set(2650,470,-1900); arch.rotation.y=Math.atan2(-300,-550); arch.rotation.x=0; bleedMon.add(arch);
  }
  };
  setTimeout(()=>{ buildRocks.giveUp=true; buildRocks(); }, 6000);
  buildRocks();
  // monument mist: the pale rose-cream fog wall the rocks silhouette against (plate 003)
  const mistCols=[['rgba(228,205,190,.55)','rgba(190,160,150,.22)'],
                  ['rgba(215,220,225,.5)','rgba(175,180,195,.2)'],
                  ['rgba(228,205,190,.45)','rgba(190,160,150,.18)']];
  const mistDir=[[3200,300,-2600],[2400,-200,-3800],[4200,600,-1400]];
  for(let i=0;i<3;i++){
    const t=nebulaTexture(...mistCols[i]);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false,opacity:.8}));
    sp.position.set(...mistDir[i]); const sc=rand(3400,4600); sp.scale.set(sc,sc,1);
    bleedMon.add(sp);
  }
}
/* the manta: glides the monument ring trailing a teal beam (plate 003) */
const manta=new THREE.Group();
{
  const mM=new THREE.MeshStandardMaterial({color:0x232f3a, roughness:.7, metalness:.2});
  const bd=new THREE.Mesh(new THREE.OctahedronGeometry(34,1), mM); bd.scale.set(2.6,.32,1.5); manta.add(bd);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(5,90,5), mM); tail.rotation.z=Math.PI/2; tail.position.set(-70,0,0); manta.add(tail);
  const finM=new THREE.MeshStandardMaterial({color:0x2c3a46, roughness:.75, side:THREE.DoubleSide});
  for(const sd of [-1,1]){ const f=new THREE.Mesh(new THREE.PlaneGeometry(60,26), finM);
    f.position.set(-6,4,sd*42); f.rotation.x=sd*.5; manta.add(f); }
}
scene.add(manta);
function tryMantaGLB(){ if(manta.userData.glb) return;
  const gl=tryPlaceGLB('manta',110);
  if(!gl){ setTimeout(tryMantaGLB,450); return; }
  while(manta.children.length) manta.remove(manta.children[0]);
  gl.rotation.y=-Math.PI/2; manta.add(gl); mantaMixer=playClip(gl,'fly'); manta.userData.glb=true; }
setTimeout(tryMantaGLB,450);
const MANTA_TRAIL=70;
const mantaHist=[];
let mantaMixer=null;
const mantaTrailGeo=new THREE.BufferGeometry();
mantaTrailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MANTA_TRAIL*3),3));
const mantaTrail=new THREE.Line(mantaTrailGeo, new THREE.LineBasicMaterial({color:0x5fffe0, transparent:true, opacity:.55, blending:THREE.AdditiveBlending, depthWrite:false}));
mantaTrail.frustumCulled=false; scene.add(mantaTrail);
const mantaGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture('rgba(120,255,225,.9)','rgba(40,200,160,.3)'),transparent:true,depthWrite:false,opacity:.9}));
mantaGlow.scale.set(60,60,1); scene.add(mantaGlow);
function updateBleed(dt){
  if(planet.on) return;
  if(mantaMixer && !window.__mantaA) mantaMixer.update(dt);
  if(playerMixer) playerMixer.update(dt);
  const frozen=(window.__mantaA!==undefined);
  const a=frozen?window.__mantaA:G.t*.045;
  const x=Math.cos(a)*1500, z=Math.sin(a)*1500, y=frozen?250:240+Math.sin(G.t*.3)*40;
  manta.position.set(x,y,z);
  manta.rotation.y=-a-Math.PI/2; manta.rotation.z=frozen?0:Math.sin(G.t*.5)*.12;
  mantaGlow.position.set(x+Math.sin(a)*55, y, z-Math.cos(a)*55);
  if(frozen){
    if(!mantaHist.length) for(let i=0;i<MANTA_TRAIL;i++){ const aa=a-i*.022; mantaHist.push(new THREE.Vector3(Math.cos(aa)*1500,y,Math.sin(aa)*1500)); }
  } else {
    mantaHist.unshift(manta.position.clone());
    if(mantaHist.length>MANTA_TRAIL) mantaHist.pop();
  }
  const pa=mantaTrailGeo.attributes.position;
  for(let i=0;i<MANTA_TRAIL;i++){ const v=mantaHist[Math.min(i,mantaHist.length-1)]||manta.position; pa.setXYZ(i,v.x,v.y,v.z); }
  pa.needsUpdate=true;
}

/* ---------- planetary environment (THE SAND TITHE) ---------- */
const planet = { on:false, ground:null, town:null, sky:null, smokes:[], beacons:[], strider:null };
function duneH(X,Z){ return Math.sin(X*.004)*Math.cos(Z*.005)*22 + Math.sin(X*.011-Z*.007)*9 - Math.sin(X*.031)*Math.sin(Z*.027)*3.5; }
function buildPlanet(){
  if (planet.ground) return;
  // dunes: displaced plane, deterministic sine-noise (golden, per SandTemple plate)
  const g = new THREE.PlaneGeometry(7000,7000,110,110);
  const pa = g.attributes.position;
  for(let i=0;i<pa.count;i++){
    const x=pa.getX(i), y=pa.getY(i);
    pa.setZ(i, Math.sin(x*.004)*Math.cos(y*.005)*22 + Math.sin(x*.011+y*.007)*9 + Math.sin(x*.031)*Math.sin(y*.027)*3.5);
  }
  g.computeVertexNormals();
  const gm = new THREE.MeshStandardMaterial({color:0xc99f62, roughness:1, metalness:0});
  planet.ground = new THREE.Mesh(g, gm);
  planet.ground.rotation.x = -Math.PI/2; planet.ground.position.y = 0;
  scene.add(planet.ground);
  // sky dome: teal-blue zenith to cream haze at the horizon (SandTemple plate)
  const skyCv=document.createElement('canvas'); skyCv.width=4; skyCv.height=256;
  { const x=skyCv.getContext('2d'); const gr=x.createLinearGradient(0,0,0,256);
    gr.addColorStop(0,'#6f9ab2'); gr.addColorStop(.45,'#aec2c0'); gr.addColorStop(.72,'#e2d6b6'); gr.addColorStop(1,'#f0e2c0');
    x.fillStyle=gr; x.fillRect(0,0,4,256); }
  planet.sky = new THREE.Mesh(new THREE.SphereGeometry(6200,24,16),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(skyCv), side:THREE.BackSide, fog:false}));
  scene.add(planet.sky);
  // low warm sun-haze near the horizon
  const hz=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture('rgba(255,240,210,.8)','rgba(240,220,180,.25)'),transparent:true,depthWrite:false,fog:false,opacity:.7}));
  hz.position.set(5200,700,-3600); hz.scale.set(5200,2600,1); planet.sky.add? null:0; scene.add(hz); planet.haze=hz;
  // collection town: dense tan flat-roofs (plate 008), low blocks with lit slits
  planet.town = new THREE.Group();
  const blockM = new THREE.MeshStandardMaterial({color:0x8a6a46, roughness:.95});
  const blockM2= new THREE.MeshStandardMaterial({color:0x74563a, roughness:.95});
  const winM = new THREE.MeshStandardMaterial({color:0x201408, emissive:0xff8a30, emissiveIntensity:1.5});
  const wrecksM= new THREE.MeshStandardMaterial({color:0x5a4c40, roughness:.85, metalness:.35});
  for(let i=0;i<22;i++){
    const w=rand(26,62), h=rand(18,95), d=rand(26,62);
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), Math.random()<.5?blockM:blockM2);
    b.position.set(-620+(i%6)*120+rand(-30,30), 0, -260+Math.floor(i/6)*130+rand(-30,30));
    b.position.y = duneH(b.position.x,b.position.z)+h/2-8;
    planet.town.add(b);
    for(let k=0;k<2;k++){ const win=new THREE.Mesh(new THREE.BoxGeometry(w*.3,3,1), winM);
      win.position.set(b.position.x+rand(-w/4,w/4), b.position.y+rand(0,h*.3), b.position.z+d/2+1); planet.town.add(win); }
  }
  for(let i=0;i<7;i++){ const wr=new THREE.Mesh(new THREE.BoxGeometry(rand(14,44),rand(6,14),rand(8,20)), wrecksM);
    wr.position.set(rand(-700,500), 0, rand(60,420));
    wr.position.y=duneH(wr.position.x,wr.position.z)+rand(0,4);
    wr.rotation.y=rand(0,TAU); wr.rotation.z=rand(-.3,.3); planet.town.add(wr); }
  // factorytown plate: ambient industrial quarter - tall chimney stacks, big drifting plume columns, blinking red beacons
  const stackM=new THREE.MeshStandardMaterial({color:0x4a5049, roughness:.8, metalness:.35});
  for(const [sx,sz] of [[-720,-160],[-560,40],[-300,330],[-760,260]]){
    const sh=rand(170,230);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(9,14,sh,9), stackM);
    const gy=duneH(sx,sz);
    st.position.set(sx, gy+sh/2-4, sz); planet.town.add(st);
    const tipY=gy+sh-4;
    const bc=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexRed,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.9}));
    bc.position.set(sx,tipY+16,sz); bc.scale.set(30,30,1); planet.town.add(bc);
    planet.beacons.push({sp:bc,seed:Math.random()*7});
    for(let k=0;k<8;k++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex(),transparent:true,depthWrite:false,opacity:.35}));
      sp.position.set(sx,tipY+k*30,sz); planet.town.add(sp);
      planet.smokes.push({sp, base:new THREE.Vector3(sx,tipY,sz), seed:Math.random(), rise:260, drift:1.8}); }
  }
  // grey industrial haze bank hanging over the town (factorytown plate)
  for(const [hx,hy,hz2,hs] of [[-560,240,120,1500],[-300,300,-100,1200]]){
    const hb=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture('rgba(210,214,206,.35)','rgba(190,196,188,.12)'),transparent:true,depthWrite:false,fog:false,opacity:.5}));
    hb.position.set(hx,hy,hz2); hb.scale.set(hs,hs*.45,1); planet.town.add(hb);
  }
  // plate 008: rooftop field running to the horizon + a distant dark cathedral spire in the haze
  const farM=new THREE.MeshStandardMaterial({color:0x6e5a42, roughness:1});
  const farM2=new THREE.MeshStandardMaterial({color:0x5d4c3a, roughness:1});
  for(let i=0;i<110;i++){
    const a=rand(0,TAU), r=rand(1300,3200);
    const w=rand(60,180), h=rand(14,70), d=rand(60,180);
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), Math.random()<.5?farM:farM2);
    const X=-300+Math.cos(a)*r, Z=100+Math.sin(a)*r;
    b.position.set(X, duneH(X,Z)+h/2-6, Z);
    b.rotation.y=(Math.random()*4|0)*Math.PI/2; planet.town.add(b);
  }
  const dSpireM=new THREE.MeshStandardMaterial({color:0x2c2620, roughness:1});
  const ds=new THREE.Group();
  const dbase=new THREE.Mesh(new THREE.CylinderGeometry(150,215,190,8), dSpireM); dbase.position.y=95; ds.add(dbase);
  const dmain=new THREE.Mesh(new THREE.ConeGeometry(72,940,7), dSpireM); dmain.position.y=190+470; ds.add(dmain);
  for(let i=0;i<5;i++){ const a=i*TAU/5; const s2=new THREE.Mesh(new THREE.ConeGeometry(26,430,6), dSpireM);
    s2.position.set(Math.cos(a)*155,215,Math.sin(a)*155); ds.add(s2); }
  ds.position.set(-2400, duneH(-2400,2600), 2600); planet.town.add(ds);
  // temple: rust-orange stepped spire complex with a docked ledger-ship (SandTemple plate + 015)
  const templeM = new THREE.MeshStandardMaterial({color:0x9c5636, roughness:.9, metalness:.05});
  const procTemple=new THREE.Group(); planet.town.add(procTemple);
  for(let i=0;i<6;i++){ const sz=240-i*34;
    const t=new THREE.Mesh(new THREE.BoxGeometry(sz,30,sz*.8), templeM);
    t.position.set(600, 15+i*30, -260); procTemple.add(t); }
  const spire=new THREE.Mesh(new THREE.ConeGeometry(16,300,7), templeM);
  spire.position.set(600, 180+140, -260); procTemple.add(spire);
  for(const dx of [-170,150]){ const s2=new THREE.Mesh(new THREE.ConeGeometry(10,180,6), templeM);
    s2.position.set(600+dx, 90, -260+dx*.25); procTemple.add(s2); }
  const tryTempleGLB=()=>{ if(planet.town.userData.templeGLB) return;
    const g=tryPlaceGLB('temple_spire',520);
    if(!g){ setTimeout(tryTempleGLB,450); return; }
    procTemple.visible=false;
    g.position.set(600,0,-260); planet.town.add(g); planet.town.userData.templeGLB=true; };
  setTimeout(tryTempleGLB,450);
  const shipM=new THREE.MeshStandardMaterial({color:0x848c92, roughness:.5, metalness:.6});
  const dockShip=new THREE.Group();
  const hullB=new THREE.Mesh(new THREE.BoxGeometry(230,26,42), shipM); dockShip.add(hullB);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(150,64,6), shipM); fin.position.set(-24,42,0); dockShip.add(fin);
  const prow=new THREE.Mesh(new THREE.ConeGeometry(16,60,4), shipM); prow.rotation.z=-Math.PI/2; prow.position.set(140,0,0); dockShip.add(prow);
  const engM=new THREE.MeshStandardMaterial({color:0x551111, emissive:0xcc2a10, emissiveIntensity:2.5});
  for(const dz of [-15,15]){ const en=new THREE.Mesh(new THREE.CylinderGeometry(7,10,22,8), engM);
    en.rotation.z=Math.PI/2; en.position.set(-126,0,dz); dockShip.add(en); }
  dockShip.position.set(600, planet.town.userData.templeGLB?404:510, -260); dockShip.rotation.y=.5;
  Object.defineProperty(planet.town.userData,'templeGLB',{get(){return this._tglb;},set(v){ this._tglb=v; if(v) dockShip.position.y=404; },configurable:true});
  planet.town.add(dockShip);
  scene.add(planet.town);
  buildStrider();
}
/* the strider: colossal Bleed megafauna, grazing the far dunes (creature plate) */
function buildStrider(){
  const gl=tryPlaceGLB('strider',150);
  if(gl){ const inner=gl.children[0]; if(inner) inner.rotation.y=-Math.PI/2;
    gl.traverse(m=>{ if(m.isMesh&&m.material&&m.material.color) m.material.color.multiplyScalar(1.1); });
    gl.position.set(-1000, duneH(-1000,-900), -900); gl.rotation.y=.8;
    gl.userData.t=0; gl.userData.wings=[]; scene.add(gl); planet.strider=gl;
    planet.striderMixer=playClip(gl,'walk'); return; }
  const g=new THREE.Group();
  const bodyM=new THREE.MeshStandardMaterial({color:0xc89a70, roughness:.85});
  const body=new THREE.Mesh(new THREE.SphereGeometry(26,10,8), bodyM);
  body.scale.set(2.4,.7,.62); body.position.y=118; body.rotation.z=-.12; g.add(body);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(5,8,42,6), bodyM); neck.rotation.z=1.0; neck.position.set(56,128,0); g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(9,8,6), bodyM); head.scale.set(1.6,.8,.8); head.position.set(76,138,0); g.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(4,30,6), bodyM); beak.rotation.z=-1.35; beak.position.set(92,130,0); g.add(beak);
  const wingM=new THREE.MeshStandardMaterial({color:0xd8ac7e, roughness:.8, side:THREE.DoubleSide});
  g.userData.wings=[];
  for(const sd of [-1,1]){ for(let k=0;k<4;k++){
    const w=new THREE.Mesh(new THREE.PlaneGeometry(70-k*10,6), wingM);
    w.position.set(-16-k*9,126-k*8,sd*(10+k*6));
    w.rotation.set(sd*.35, sd*(.4+k*.18), -(.5+k*.22));
    g.add(w); g.userData.wings.push(w); } }
  const legM=new THREE.MeshStandardMaterial({color:0xb0805a, roughness:.9});
  for(let i=0;i<4;i++){
    const fx=[34,12,-16,-38][i], fz=[26,-24,30,-28][i];
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(1.6,3.2,150,6), legM);
    leg.position.set(fx*.45,58,fz*.5);
    leg.rotation.z=(fx>0?-.16:.16); leg.rotation.x=(fz>0?.14:-.14);
    g.add(leg);
  }
  g.position.set(-1000, duneH(-1000,-900), -900); g.rotation.y=.8;
  g.userData.t=0;
  scene.add(g); planet.strider=g;
}
function updatePlanetFx(dt){
  if(!planet.on) return;
  for(const sm of planet.smokes){
    if(!sm.sp.visible) continue;
    const rise=sm.rise||150, dr=sm.drift||1;
    const h=(G.t*16+sm.seed*47)%rise;
    sm.sp.position.set(sm.base.x+h*.3*dr, sm.base.y+h, sm.base.z+h*.1*dr);
    sm.sp.material.opacity=.42*(1-h/rise);
    const sc=22+h*.4; sm.sp.scale.set(sc,sc,1);
  }
  for(const bc of planet.beacons){ bc.sp.material.opacity=.3+.65*Math.max(0,Math.sin(G.t*2.4+bc.seed)); }
  if(planet.striderMixer){ planet.striderMixer.timeScale=ANIM_VARS[striderVar].gait; planet.striderMixer.update(dt); }
  if(window.__animRow){ for(const r of window.__animRow){
    if(r.mx){ r.mx.timeScale=ANIM_VARS[r.i].gait; r.mx.update(dt); }
    driveStrider(r.c, r.i, G.t); } }
  if(planet.strider){
    const st=planet.strider; st.userData.t+=dt;
    driveStrider(st, striderVar, st.userData.t);
    const a=st.userData.t*.016;
    const x=-1000+Math.cos(a)*280, z=-900+Math.sin(a)*280;
    st.position.set(x, duneH(x,z)+Math.sin(st.userData.t*.9)*2.5, z);
    st.rotation.y=-a+2.4;
    for(let i=0;i<st.userData.wings.length;i++){ st.userData.wings[i].rotation.z=-(.5+(i%4)*.22)+Math.sin(st.userData.t*.7+i)*0.07; }
  }
}
function setPlanetary(on){
  if (on===planet.on) return; planet.on=on;
  if (on){
    buildPlanet();
    scene.background=new THREE.Color(0x0b0e10); scene.fog.color.set(0xdccfae); scene.fog.density=0.0011;
    planet.ground.visible=true; planet.town.visible=true; planet.sky.visible=true; planet.haze.visible=true;
    if(planet.strider) planet.strider.visible=true;
    for(const sm of planet.smokes) sm.sp.visible=true;
    skySpace.visible=false;
    bleedMon.visible=false; manta.visible=false; mantaTrail.visible=false; mantaGlow.visible=false;
    for(const w of wrecks) w.visible=false;
    port.obj.visible=false; dockRing.visible=false; if(portBust) portBust.visible=false; if(portExtras) portExtras.visible=false;
    const lamp=scene.getObjectByName('portLamp'); if(lamp) lamp.visible=false;
  } else {
    setSkyTheme(G.skyTheme||'tithe');
    if (planet.ground) planet.ground.visible=false;
    if (planet.town) planet.town.visible=false;
    if (planet.sky) planet.sky.visible=false;
    if (planet.haze) planet.haze.visible=false;
    if (planet.strider) planet.strider.visible=false;
    for(const sm of planet.smokes) sm.sp.visible=false;
    skySpace.visible=true;
    bleedMon.visible=true; manta.visible=true; mantaTrail.visible=true; mantaGlow.visible=true;
    for(const w of wrecks) w.visible=true;
    port.obj.visible=true; dockRing.visible=true; if(portBust) portBust.visible=true; if(portExtras) portExtras.visible=true;
    const lamp=scene.getObjectByName('portLamp'); if(lamp) lamp.visible=true;
  }
}
const smokeTex=()=>nebulaTexture('rgba(238,238,232,.5)','rgba(215,215,208,.16)');
function spawnStack(p){
  const o=new THREE.Mesh(new THREE.CylinderGeometry(13,17,110,10), M.comb); o.position.copy(p);
  addGlow(o, glowTexRed, 26).position.set(0,58,0);
  scene.add(o);
  // white smoke plume, red-capped (factorytown plate)
  for(let k=0;k<5;k++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex(),transparent:true,depthWrite:false,opacity:.4}));
    sp.position.copy(p).add(new THREE.Vector3(0,60+k*26,0));
    scene.add(sp);
    planet.smokes.push({sp, base:new THREE.Vector3(p.x,p.y+60,p.z), seed:Math.random()});
  }
  enemies.push({kind:'stack',obj:o,hull:150,hullMax:150,r:20,spd:0,fireCd:3,score:200,big:true});
}
function spawnVault(p){
  const o=new THREE.Mesh(new THREE.OctahedronGeometry(26,0), M.brass); o.position.copy(p);
  addGlow(o, glowTexRed, 30);
  scene.add(o);
  enemies.push({kind:'vault',obj:o,hull:420,hullMax:420,r:28,spd:0,fireCd:2.2,shielded:true,score:700,big:true});
}
function spawnTempleGun(p){
  const o=new THREE.Mesh(new THREE.SphereGeometry(7,10,8), M.red); o.position.copy(p);
  scene.add(o);
  enemies.push({kind:'turret',obj:o,hull:85,hullMax:85,r:10,spd:0,fireCd:rand(1.5,3),score:150,temple:true});
}

/* ---------- combat ---------- */
const laserGeo = new THREE.CylinderGeometry(.35,.35,14,5);
const glowTexGreen = nebulaTexture('rgba(140,255,200,.95)','rgba(60,220,140,.4)');
const glowTexRed   = nebulaTexture('rgba(255,150,120,.95)','rgba(220,70,40,.4)');
function addGlow(mesh, tex, s){
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.9}));
  sp.scale.set(s,s,1); mesh.add(sp); return sp;
}
const engineGlow = addGlow(player.obj, glowTexGreen, 7);
engineGlow.position.set(0,0,-10);
/* hero GLB hot-swap: module-scope player starts procedural; swap in the lane model once Draco decode lands */
let playerMixer=null;
const tryPlayerGLB=()=>{
  const g = normalizedGLB('interceptor');
  if(!g){ setTimeout(tryPlayerGLB,400); return; }
  g.position.copy(player.obj.position); g.quaternion.copy(player.obj.quaternion);
  player.obj.remove(engineGlow); g.add(engineGlow);
  scene.remove(player.obj); player.obj=g; scene.add(g);
  playerMixer = null; // deskinned hero model: no rig to animate (fly clip was root-bone only)
};
setTimeout(tryPlayerGLB,400);
const flashes=[];
function muzzleFlash(pos){
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexGreen,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:1}));
  sp.position.copy(pos); sp.scale.setScalar(rand(7,10)); sp.userData.life=.07;
  scene.add(sp); flashes.push(sp);
}
const laserMat = new THREE.MeshBasicMaterial({color:0xaef7d8, blending:THREE.AdditiveBlending, transparent:true, opacity:.95});
/* port1 plate: Free Port reads as a white disc-city - silver disc rim, needle cluster, hanging tendrils, orbiting traffic */
portExtras=new THREE.Group();
{
  const discM=new THREE.MeshStandardMaterial({color:0xd8dee4, roughness:.45, metalness:.25});
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(190,168,10,48), discM); disc.position.y=-58; portExtras.add(disc);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(190,4,8,64), discM); rim.rotation.x=Math.PI/2; rim.position.y=-53; portExtras.add(rim);
  const needleM=new THREE.MeshStandardMaterial({color:0xe8ecf0, roughness:.35, metalness:.2});
  for(let i=0;i<7;i++){ const a=i*TAU/6, r=i===0?0:rand(18,58);
    const h=i===0?175:rand(55,125);
    const s=new THREE.Mesh(new THREE.ConeGeometry(i===0?8:5,h,6), needleM);
    s.position.set(Math.cos(a)*r, 40+h/2, Math.sin(a)*r); portExtras.add(s); }
  portExtras.userData.tendrils=[];
  const tendM=new THREE.MeshStandardMaterial({color:0x9aa4ac, roughness:.7});
  for(let i=0;i<12;i++){ const a=i*TAU/12, r=rand(60,168);
    const len=rand(60,150);
    const t=new THREE.Mesh(new THREE.CylinderGeometry(.8,2.2,len,5), tendM);
    t.position.set(Math.cos(a)*r, -63-len/2, Math.sin(a)*r);
    t.userData={seed:rand(0,7)};
    portExtras.add(t); portExtras.userData.tendrils.push(t); }
  portExtras.userData.traffic=[];
  for(let i=0;i<4;i++){
    const sh=new THREE.Group();
    const hull=new THREE.Mesh(new THREE.ConeGeometry(2.4,9,5), new THREE.MeshStandardMaterial({color:0xcfd6dc, roughness:.5}));
    hull.rotation.x=Math.PI/2; sh.add(hull);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexGreen,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.8}));
    gl.scale.set(9,9,1); gl.position.z=-5; sh.add(gl);
    sh.userData={a:rand(0,TAU), r:rand(235,335), h:rand(-30,95), spd:rand(.08,.18)*(i%2?1:-1)};
    portExtras.add(sh); portExtras.userData.traffic.push(sh); }
}
scene.add(portExtras);
function updatePortExtras(dt){
  if(!portExtras||!portExtras.visible) return;
  portExtras.position.copy(port.obj.position);
  for(const t of portExtras.userData.tendrils){ t.rotation.x=Math.sin(G.t*.5+t.userData.seed)*.07; t.rotation.z=Math.cos(G.t*.42+t.userData.seed)*.07; }
  for(const sh of portExtras.userData.traffic){ const u=sh.userData; u.a+=u.spd*dt;
    const lx=Math.cos(u.a)*u.r, lz=Math.sin(u.a)*u.r, ly=u.h+Math.sin(G.t*.3+u.r)*8;
    sh.position.set(lx,ly,lz);
    const wp=new THREE.Vector3(Math.cos(u.a+.12)*u.r, ly, Math.sin(u.a+.12)*u.r).add(portExtras.position);
    sh.lookAt(wp); }
}

const elaserMat = new THREE.MeshBasicMaterial({color:0xff7a50, blending:THREE.AdditiveBlending, transparent:true, opacity:.95});
function fireGuns(){
  if (player.gunCd>0) return;
  player.gunCd = gunRate();
  const fwd = new THREE.Vector3(0,0,1).applyQuaternion(player.obj.quaternion);
  const right = new THREE.Vector3(1,0,0).applyQuaternion(player.obj.quaternion);
  for (const s of [-1,1]){
    const l = new THREE.Mesh(laserGeo, laserMat); addGlow(l, glowTexGreen, 5);
    l.position.copy(player.obj.position).addScaledVector(fwd,12).addScaledVector(right,s*2.4);
    l.quaternion.copy(player.obj.quaternion); l.rotateX(Math.PI/2);
    l.userData = {vel: fwd.clone().multiplyScalar(560).add(player.vel), life:1.4, dmg:gunDmg()};
    scene.add(l); lasers.push(l);
    muzzleFlash(l.position);
  }
  AU.laser(); G.shake=Math.min(10,G.shake+.5); G.kick=Math.min(3.2,G.kick+1.15);
}
function fireMissile(){
  if (player.missiles<=0){ toast('MISSILE RACK EMPTY'); return; }
  if (!enemies.length){ toast('NO TARGET'); return; }
  let best=null,bd=1e12;
  for(const e of enemies){ const d=e.obj.position.distanceToSquared(player.obj.position); if(d<bd){bd=d;best=e;} }
  player.missiles--;
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.2,6,6), M.orange);
  m.position.copy(player.obj.position);
  m.userData={vel:player.vel.clone(), target:best, life:6, dmg:70};
  scene.add(m); missiles.push(m); AU.missile(); if(best) AU.missileLock();
}
function damagePlayer(d){
  if (player.inv>0||!player.alive) return;
  player.hull-=d; player.inv=.3; G.shake=Math.min(20,G.shake+7); AU.hullHit();
  spawnParts(player.obj.position, 10, 0xffb060, 60);
  $('vignette').style.opacity=.9;
  if (player.hull<=0) killPlayer();
}
function killPlayer(){
  player.alive=false; AU.boom(true); AU.stinger('death'); G.freeze=.4; G.shake=30;
  spawnParts(player.obj.position, 90, 0xff9a50, 160); spawnParts(player.obj.position, 40, 0x7fd8b8, 120);
  setTimeout(()=>{
    G.credits=Math.max(0,Math.floor(G.credits*.8));
    toast('YOUR HULK IS TOWED TO FREE PORT. THE BLEED TAKES ITS CUT. -20% CR',5);
    player.hull=player.hullMax; player.alive=true; player.inv=2;
    player.obj.position.copy(port.obj.position).add(new THREE.Vector3(140,10,80));
    player.vel.set(0,0,0); save();
  },2600);
}
function damageEnemy(e,d,p){
  if(e.shielded){ if(p) spawnParts(p,3,0x5affaa,30); AU.shieldHit(); return; }
  e.hull-=d; e.flash=.12; AU.hit();
  if(p) spawnParts(p,4,0xffd0a0,50);
  if (e.kind==='freighter' && e.dropped<4 && e.hull<e.hullMax*(1-(e.dropped+1)*.18)){
    e.dropped++; dropPod(e.obj.position); toast('CARGO POD LOOSE',1.4); }
  if (e.hull<=0) killEnemy(e);
}
function killEnemy(e){
  e.dead=true; G.kills++; G.credits+=e.score;
  AU.boom(e.big); G.shake=Math.min(24,G.shake+(e.big?16:5)); if(e.big) G.freeze=.2;
  spawnParts(e.obj.position, e.big?110:24, e.big?0xff5030:0xffd0a0, e.big?200:90);
  if (e.kind==='boss'){ if(G.missionState) G.missionState.bossDead=true;
    for(let i=0;i<6;i++) dropPod(e.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(20,60)))); }
  if (e.kind==='cutter' && Math.random()<.4) dropPod(e.obj.position);
  if (e.kind==='mine'){ AU.mineDetonate(); // sympathetic detonation: hurts everything close, including the player
    spawnParts(e.obj.position,60,0xff7a40,170); AU.boom(true); G.shake=Math.min(24,G.shake+10);
    for(const o of enemies){ if(o!==e && !o.dead && o.obj.position.distanceToSquared(e.obj.position)<120*120) damageEnemy(o,60,o.obj.position); }
    if(player.alive && player.obj.position.distanceToSquared(e.obj.position)<110*110) damagePlayer(28);
    for(const a of allies){ if(a.obj.position.distanceToSquared(e.obj.position)<110*110){ a.hull-=40; } } }
  if (e.kind==='node'){ AU.turretDie(); const left=enemies.filter(x=>x.kind==='node'&&!x.dead).length;
    if(left===0){ const c=enemies.find(x=>x.kind==='core'); if(c){ c.shielded=false; toast('CORE SHIELD DOWN',3); AU.shieldDown(); AU.alarm(); } } }
  if (e.kind==='core'){ if(G.missionState) G.missionState.coreDead=true;
    for(let i=0;i<8;i++) dropPod(e.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(20,80)))); }
  if (e.kind==='ace' && G.missionState) G.missionState.dead=true;
  if (e.kind==='turret'){ AU.turretDie(); const left=enemies.filter(x=>x.kind==='turret'&&!x.dead).length;
    if(left===0){ const c=enemies.find(x=>x.kind==='citadel'); if(c){ c.shielded=false; toast('CITADEL SHIELD DOWN',3); AU.shieldDown(); AU.alarm(); } } }
  if (e.kind==='stack'){ AU.furnaceDie(); }
  if (e.kind==='vault'){ if(G.missionState) G.missionState.vaultDead=true;
    for(let i=0;i<6;i++) spawnParts(e.obj.position,4,0xffd27a,60); }
  if (e.kind==='citadel'){ if(G.missionState) G.missionState.dead=true;
    for(let i=0;i<10;i++) dropPod(e.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(30,90)))); }
  if (e.kind==='freighter'){ for(let i=e.dropped;i<4;i++)
    dropPod(e.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(10,40)))); }
}
function dropPod(p){
  const o = new THREE.Mesh(new THREE.BoxGeometry(4,4,4), new THREE.MeshStandardMaterial({color:0x4a3d2b, emissive:0x7a5a20, emissiveIntensity:.6}));
  o.position.copy(p); o.rotation.set(rand(0,3),rand(0,3),0);
  o.userData.vel = new THREE.Vector3().randomDirection().multiplyScalar(rand(2,8));
  scene.add(o); pods.push({obj:o, t:0});
}

/* ---------- spawning ---------- */
function spawnSentinel(p){ const o=makeShip('sentinel'); o.position.copy(p); scene.add(o);
  enemies.push({kind:'sentinel',obj:o,hull:16,hullMax:16,r:6,spd:rand(52,66),fireCd:rand(1,2.5),sep:rand(0,TAU),score:25}); }
function spawnCutter(p){ const o=makeShip('cutter'); o.position.copy(p); scene.add(o);
  enemies.push({kind:'cutter',obj:o,hull:70,hullMax:70,r:12,spd:44,fireCd:rand(1,2),strafe:Math.random()<.5?-1:1,score:80}); }
function spawnFreighter(p){ const o=makeShip('freighter'); o.position.copy(p); scene.add(o);
  enemies.push({kind:'freighter',obj:o,hull:140,hullMax:140,r:16,spd:14,fireCd:2,dropped:0,score:60,big:true,
    flee:new THREE.Vector3().randomDirection()}); }
function spawnFreighterGroup(p){ spawnFreighter(p);
  spawnSentinel(p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(60,140))));
  spawnSentinel(p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(60,140)))); }
function spawnAce(p){ const o=makeShip('cutter'); o.position.copy(p);
  o.traverse(c=>{ if(c.isMesh && c.material && c.material.emissive) c.material=c.material.clone(); });
  const g=addGlow(o,glowTexRed,10); g.position.set(0,0,-6);
  scene.add(o);
  enemies.push({kind:'ace',obj:o,hull:650,hullMax:650,r:12,spd:86,fireCd:1.2,strafe:1,sep:0,score:400}); }
function spawnMine(p){ const o=new THREE.Mesh(new THREE.SphereGeometry(7,10,8),
    new THREE.MeshStandardMaterial({color:0x22262a,roughness:.6,metalness:.7,emissive:0x5a1408,emissiveIntensity:.5}));
  const g=addGlow(o,glowTexRed,6);
  o.position.copy(p); scene.add(o);
  enemies.push({kind:'mine',obj:o,hull:10,hullMax:10,r:9,spd:0,armT:rand(0,2),score:15}); AU.mineArm(); }
function spawnAlly(name,p){ const o=makeShip('freighter'); o.position.copy(p);
  const g=addGlow(o,glowTexGreen,12); g.position.set(0,6,0);
  scene.add(o);
  allies.push({kind:'ally',name,obj:o,hull:380,hullMax:380,r:18,spd:60,wait:0}); }
function spawnStation(p){
  const core=new THREE.Mesh(new THREE.CylinderGeometry(26,34,90,10),
    new THREE.MeshStandardMaterial({color:0x2a3238,roughness:.5,metalness:.8,emissive:0x0a2a3a,emissiveIntensity:.7}));
  core.position.copy(p); scene.add(core);
  addGlow(core,glowTexRed,26).position.set(0,50,0);
  enemies.push({kind:'core',obj:core,hull:600,hullMax:600,r:40,spd:0,fireCd:2,burstCd:6,shielded:true,score:600,big:true});
  for(let i=0;i<4;i++){
    const a=i/4*TAU;
    const n=new THREE.Mesh(new THREE.OctahedronGeometry(12,0),
      new THREE.MeshStandardMaterial({color:0x3a4448,roughness:.4,metalness:.85,emissive:0x5affaa,emissiveIntensity:.5}));
    n.position.copy(p).add(new THREE.Vector3(Math.cos(a)*150,rand(-30,30),Math.sin(a)*150));
    scene.add(n); addGlow(n,glowTexGreen,9);
    enemies.push({kind:'node',obj:n,hull:60,hullMax:60,r:14,spd:0,fireCd:rand(2,4),score:120,corePos:p.clone()}); }
}
function spawnHarvester(p){ const o=makeShip('freighter'); o.position.copy(p);
  o.traverse(c=>{ if(c.isMesh&&c.material&&c.material.emissive) c.material=c.material.clone(); });
  const g=addGlow(o,glowTexRed,12); g.position.set(0,8,0);
  scene.add(o);
  enemies.push({kind:'harvester',obj:o,hull:260,hullMax:260,r:16,spd:26,fireCd:2.5,latched:false,score:220,big:true}); }
function spawnCitadel(){
  const p=port.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1400));
  const o=makeShip('frigate'); o.position.copy(p);
  o.scale.multiplyScalar(1.6);
  const g=addGlow(o,glowTexRed,30); g.position.set(0,20,0);
  scene.add(o);
  const cit={kind:'citadel',obj:o,hull:1600,hullMax:1600,r:55,spd:5,fireCd:1.1,burstCd:5,shielded:true,score:1200,big:true,angle:0};
  enemies.push(cit);
  for(let i=0;i<6;i++){
    const t=new THREE.Mesh(new THREE.SphereGeometry(7,10,8),
      new THREE.MeshStandardMaterial({color:0x3a4448,roughness:.4,metalness:.85,emissive:0xff5030,emissiveIntensity:.6}));
    scene.add(t); addGlow(t,glowTexRed,8);
    enemies.push({kind:'turret',obj:t,hull:85,hullMax:85,r:10,spd:0,fireCd:rand(1.5,3),score:150,host:cit,orbA:i/6*TAU,orbY:rand(-25,25)}); }
}
function spawnBoss(){
  const p = port.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(900));
  const o=makeShip('frigate'); o.position.copy(p); scene.add(o);
  enemies.push({kind:'boss',obj:o,hull:1000,hullMax:1000,r:34,spd:9,fireCd:1.3,burstCd:4,score:500,big:true});
  spawnCutter(p.clone().add(new THREE.Vector3(120,40,0)));
  spawnCutter(p.clone().add(new THREE.Vector3(-120,-40,0)));
}


/* ---------- recovered concept art: slideshow, mission cards, gallery ---------- */
(function(){
  const css = document.createElement('style');
  css.textContent = `
    #artbg{position:fixed;inset:0;z-index:0;overflow:hidden;background:#030807}
    #artbg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 2.2s}
    #artbg img.on{opacity:.5}
    #artbg .cap{position:absolute;left:14px;bottom:10px;font-size:10px;letter-spacing:.18em;color:#5affaa;opacity:.7;text-transform:uppercase}
    #title{z-index:2}
    #artlink{cursor:pointer;color:#ffd27a;text-decoration:underline dotted}
    #mcard{position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:5;display:flex;gap:14px;align-items:center;
      background:rgba(3,8,7,.88);border:1px solid #2a5a44;padding:12px 18px;max-width:640px;transition:opacity .8s}
    #mcard img{width:180px;height:110px;object-fit:cover;border:1px solid #2a5a44}
    #mcard .mt{color:#ffd27a;font-size:13px;letter-spacing:.12em;margin-bottom:6px}
    #mcard .mo{color:#b8d8c8;font-size:12px;line-height:1.4}
    #gallery{position:fixed;inset:0;z-index:9;background:rgba(2,6,5,.97);overflow-y:auto;padding:22px}
    #gallery .gh{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
    #gallery .gh b{color:#5affaa;letter-spacing:.2em;font-size:13px;margin-right:10px}
    #gallery button{background:#0a1a14;border:1px solid #2a5a44;color:#b8d8c8;padding:4px 10px;cursor:pointer;font-size:11px;letter-spacing:.1em}
    #gallery button.sel{background:#2a5a44;color:#fff}
    #gallery .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
    #gallery .grid img{width:100%;height:120px;object-fit:cover;border:1px solid #16382a;cursor:pointer}
    #gallery .grid .fn{font-size:9px;color:#4a8a6a;letter-spacing:.08em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #artzoom{position:fixed;inset:0;z-index:10;background:rgba(0,0,0,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer}
    #artzoom img{max-width:94%;max-height:88%;border:1px solid #2a5a44}
    #artzoom .zc{color:#5affaa;font-size:11px;letter-spacing:.15em;margin-top:10px}
  `;
  document.head.appendChild(css);
  // title slideshow
  const bg = document.createElement('div'); bg.id='artbg';
  const cap = document.createElement('div'); cap.className='cap';
  bg.appendChild(cap); document.body.prepend(bg);
  const list = window.SOB_SLIDESHOW||[]; let ai=0;
  function slide(){
    if (G.state!=='title'){ bg.style.display='none'; return; }
    bg.style.display='block';
    const url=list[ai%list.length]; ai++;
    const img=document.createElement('img'); img.src=url;
    img.onload=()=>{ bg.querySelectorAll('img.on').forEach(e=>{e.classList.remove('on'); setTimeout(()=>e.remove(),2400);}); img.classList.add('on');
      cap.textContent='RECOVERED VALVE ARCHIVE · '+decodeURIComponent(url.split('/').pop()); };
    bg.insertBefore(img,cap);
  }
  setInterval(slide, 6000); slide();
  // archive gallery
  const gal=document.createElement('div'); gal.id='gallery'; gal.className='hidden'; document.body.appendChild(gal);
  const zoom=document.createElement('div'); zoom.id='artzoom'; zoom.className='hidden'; document.body.appendChild(zoom);
  zoom.addEventListener('click',()=>zoom.classList.add('hidden'));
  let selCat='ALL';
  function renderGal(){
    const A=window.SOB_ART; const cats=['ALL',...Object.keys(A.archive),'COMMISSIONED'];
    let h='<div class="gh"><b>THE RECOVERED ARCHIVE</b>'+cats.map(c=>'<button data-c="'+c+'"'+(c===selCat?' class="sel"':'')+'>'+c+'</button>').join('')+'<button data-c="CLOSE" style="margin-left:auto">CLOSE [ESC]</button></div><div class="grid">';
    const add=(urls,tag)=>urls.forEach(u=>{ h+='<div><img loading="lazy" src="'+u+'" data-z="'+u+'" data-t="'+tag+'"><div class="fn">'+decodeURIComponent(u.split('/').pop())+'</div></div>'; });
    if(selCat==='ALL'){ Object.keys(A.archive).forEach(c=>add(A.archive[c],c)); add(A.concept,'COMMISSIONED'); }
    else if(selCat==='COMMISSIONED') add(A.concept,'COMMISSIONED'); else add(A.archive[selCat]||[],selCat);
    gal.innerHTML=h+'</div>';
    gal.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.c==='CLOSE'){ gal.classList.add('hidden'); AU.gallery(false); AU.uiBack(); return; }
      selCat=b.dataset.c; renderGal(); }));
    gal.querySelectorAll('img').forEach(im=>im.addEventListener('click',()=>{
      zoom.innerHTML='<img src="'+im.dataset.z+'"><div class="zc">'+im.dataset.t+' · '+decodeURIComponent(im.dataset.z.split('/').pop())+' · STARS OF BLOOD - VALVE ARCHIVE</div>';
      zoom.classList.remove('hidden'); AU.artZoom(); }));
  }
  window.openArchive=function(){ selCat='ALL'; renderGal(); gal.classList.remove('hidden'); AU.gallery(true); AU.galleryOpen(); };
  addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(!gal.classList.contains('hidden')) AU.uiBack(); gal.classList.add('hidden'); zoom.classList.add('hidden'); AU.gallery(false); } });
  // mission cards
  const card=document.createElement('div'); card.id='mcard'; card.className='hidden'; document.body.appendChild(card);
  window.showMissionCard=function(art,title,obj){
    if(!art) return;
    card.innerHTML='<img src="'+art+'"><div><div class="mt">'+title+'</div><div class="mo">'+obj+'</div></div>';
    card.style.opacity=1; card.classList.remove('hidden');
    clearTimeout(card._t); card._t=setTimeout(()=>{ card.style.opacity=0; setTimeout(()=>card.classList.add('hidden'),900); },5200);
  };
})();

/* ---------- missions ---------- */
const MISSIONS = [
  { id:'shakedown', title:'CHAPTER ONE - THE TITHE · I. THE SHAKEDOWN',
    obj:'Raid the freighter MERCY OF QADESH. Break her escort, crack her hull, take 4 cargo.',
    setup(){ G.missionState={got:0};
      spawnFreighterGroup(player.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(700,1000))));
      say('MUMBIUS','A Combine tithe-haul crosses the Bleed unescorted but for drones. Take her cargo. The port eats tonight.',5.5); },
    update(){ if(G.missionState.got>=4) completeMission(400,
      'OLD CAPTAIN','Four crates of Combine tithe, flown back through the dark. You might be worth the air you burn.'); },
    track(){ return 'CARGO TAKEN: '+G.missionState.got+' / 4'; } },
  { id:'swarm', title:'CHAPTER ONE - THE TITHE · II. THE SWARM',
    obj:'Sentinel packs hunt the wreck field. Destroy all three waves.',
    setup(){ G.missionState={wave:0,pending:3,spawnT:1.5};
      say('MUMBIUS','The Combine is not stupid, rat. It sent its ticks to find who bleeds it. Show them what the Bleed does to ticks.',5.5); },
    update(dt){ const m=G.missionState;
      if(m.pending>0 && enemies.length===0){ m.spawnT-=dt;
        if(m.spawnT<=0){ m.wave++; m.pending--;
          for(let i=0;i<3+m.wave*2;i++) spawnSentinel(player.obj.position.clone()
            .add(new THREE.Vector3().randomDirection().multiplyScalar(rand(300,500))));
          toast('WAVE '+m.wave+' OF 3'); AU.alarm(); m.spawnT=2; } }
      if(m.pending===0 && enemies.length===0 && m.wave>=3) completeMission(600,
        'OLD CAPTAIN','Three waves of swarm, and you are still a shape in my scope. Good.'); },
    track(){ const m=G.missionState; return 'WAVE '+Math.max(1,m.wave)+' / 3 · HOSTILES: '+enemies.length; } },
  { id:'tithe', title:'CHAPTER ONE - THE TITHE · III. THE TITHE',
    obj:'The tithe frigate VESSEL OF QUIET DEBT has found Free Port. Defend the port. Kill the frigate.',
    setup(){ G.missionState={bossDead:false,warned:false}; spawnBoss();
      say('OLD CAPTAIN','All hands. The Quiet Debt is in our sky. If that frigate burns the port, the Bleed goes dark. Kill it.',6); AU.alarm(); },
    update(){ const m=G.missionState;
      if(!m.warned && port.hull<port.hullMax*.5){ m.warned=true;
        say('MUMBIUS','The port is bleeding, rat! Kill it faster!',4); }
      if(m.bossDead) completeMission(1200,
        'MUMBIUS','The Quiet Debt is quiet forever. Drink tonight, rat. Tomorrow the Combine sends worse - and we will be ready. CHAPTER ONE COMPLETE.'); },
    track(){ const b=enemies.find(e=>e.kind==='boss');
      return 'FRIGATE HULL: '+(b?Math.ceil(b.hull/b.hullMax*100)+'%':'--')+' · PORT: '+Math.max(0,Math.ceil(port.hull/port.hullMax*100))+'%'; } },
  { id:'longhaul', title:'CHAPTER TWO - THE QUIET WAR · IV. THE LONG HAUL',
    obj:'Escort the smuggler LUCKY MARROW through the mine belt. She holds when hostiles close. Keep her alive.',
    setup(){ const m=G.missionState={leg:0};
      const dir=new THREE.Vector3().randomDirection(); dir.y*=.3; dir.normalize();
      m.legs=[1,2,3].map(i=>port.obj.position.clone().addScaledVector(dir,900*i));
      spawnAlly('LUCKY MARROW', port.obj.position.clone().add(new THREE.Vector3(160,20,0)));
      for(let i=0;i<14;i++){ const t=rand(.12,.95);
        spawnMine(port.obj.position.clone().addScaledVector(dir,2700*t)
          .add(new THREE.Vector3().randomDirection().multiplyScalar(rand(60,260)))); }
      say('MUMBIUS','The Marrow runs medicine past the Combine mine belt. She is slow and she is soft. Fly shotgun, rat.',6); },
    update(){ const m=G.missionState, a=allies[0];
      if(a && a.hull<=0){ failMission('OLD CAPTAIN','The Marrow is debris. Tell her crew the Bleed thanks them. We run it again.'); allies=[]; return; }
      if(a && a.done){ allies=[]; completeMission(900,
        'MUMBIUS','Medicine delivered, children breathing, Combine none the wiser. You fly like a port legend, rat.'); } },
    track(){ const m=G.missionState, a=allies[0]; if(!a) return '';
      const holding=enemies.some(e=>!e.dead&&e.kind!=='mine'&&e.obj.position.distanceToSquared(a.obj.position)<700*700);
      return 'MARROW HULL: '+Math.max(0,Math.ceil(a.hull/a.hullMax*100))+'% · LEG '+Math.min(3,m.leg+1)+' / 3'+(holding?' · HOLDING (HOSTILES NEAR)':''); } },
  { id:'bounty', title:'CHAPTER TWO - THE QUIET WAR · V. BLOOD MONEY',
    obj:'The Combine sent a hunter-killer for you: THE AUDITOR. Kill it in the wreck field.',
    setup(){ G.missionState={dead:false};
      spawnAce(player.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(900)));
      say('OLD CAPTAIN','They priced your head, pirate. The Auditor never loses. Make it a first.',5.5); },
    update(){ if(G.missionState.dead) completeMission(1100,
      'MUMBIUS','The Auditor, audited. The Combine will double the price. Wear it proudly, rat.'); },
    track(){ const e=enemies.find(e=>e.kind==='ace');
      return 'AUDITOR HULL: '+(e&&!e.dead?Math.ceil(e.hull/e.hullMax*100)+'%':'DOWN'); } },
  { id:'quietwar', title:'CHAPTER TWO - THE QUIET WAR · VI. THE LISTENING STATION',
    obj:'Assault Combine listening station EAR OF THE REGIME. Kill 4 shield pylons, then the core.',
    setup(){ G.missionState={coreDead:false,spawnT:20};
      const p=port.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1600));
      spawnStation(p);
      for(let i=0;i<3;i++) spawnCutter(p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(200,400))));
      say('OLD CAPTAIN','That ear hears every whisper in the Bleed. Deafen the Regime. Pylons first - the core is shielded while they stand.',6.5); },
    update(dt){ const m=G.missionState;
      const core=enemies.find(e=>e.kind==='core'&&!e.dead);
      if(core){ m.spawnT-=dt;
        if(m.spawnT<=0){ m.spawnT=20;
          const sens=enemies.filter(e=>e.kind==='sentinel'&&!e.dead).length;
          if(sens<6){ spawnSentinel(core.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(150,300))));
            spawnSentinel(core.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(150,300)))); } } }
      if(m.coreDead) completeMission(1600,
        'OLD CAPTAIN','The Ear is deaf. The Regime is blind in the Bleed. Whatever comes next, we meet it loud. CHAPTER TWO COMPLETE.'); },
    track(){ const nodes=enemies.filter(e=>e.kind==='node'&&!e.dead).length;
      const core=enemies.find(e=>e.kind==='core');
      return 'PYLONS: '+nodes+' LEFT · CORE: '+(core&&!core.dead?(core.shielded?'SHIELDED':Math.ceil(core.hull/core.hullMax*100)+'%'):'DESTROYED'); } },
  { id:'collectors', title:'CHAPTER THREE - THE BLEED REMEMBERS · VII. THE COLLECTORS',
    obj:'Three harvester ships close on Free Port to drain it dry. Kill all three before they latch on.',
    setup(){ G.missionState={done:false};
      for(let i=0;i<3;i++){ const a=i*TAU/3+rand(-.3,.3);
        spawnHarvester(port.obj.position.clone().add(new THREE.Vector3(Math.cos(a)*1500,rand(-150,150),Math.sin(a)*1500))); }
      say('MUMBIUS','Collectors, rat. They latch onto a port and drink it. Three of them. Do not let them touch us.',6); },
    update(){ if(port.hull<=0){ port.hull=port.hullMax*.4; failMission('OLD CAPTAIN','The port went dark. We scatter, we regroup, we hit them again.'); return; }
      const m=G.missionState;
      const left=enemies.filter(e=>e.kind==='harvester'&&!e.dead).length;
      if(left===0&&!m.done){ m.done=true; completeMission(1400,
        'MUMBIUS','Three collectors, three new reefs in the wreck field. The port drinks TO the collectors tonight.'); } },
    track(){ const latched=enemies.some(e=>e.kind==='harvester'&&!e.dead&&e.latched);
      return 'COLLECTORS: '+enemies.filter(e=>e.kind==='harvester'&&!e.dead).length+' · PORT: '+Math.max(0,Math.ceil(port.hull/port.hullMax*100))+'%'+(latched?' · LATCHED!':''); } },
  { id:'parley', title:'CHAPTER THREE - THE BLEED REMEMBERS · VIII. THE PARLEY',
    obj:'The overseer requests parley at the old beacon. Go armed. Go suspicious.',
    setup(){ G.missionState={beacon:port.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1400)),phase:0};
      say('MUMBIUS',"The Regime's overseer offers terms at the old beacon. It smells of trap. It IS a trap. Go anyway - spring it and break it.",6.5); },
    update(){ const m=G.missionState, b=m.beacon;
      if(m.phase===0&&player.obj.position.distanceToSquared(b)<300*300){
        m.phase=1;
        say('OVERSEER','Pirate. The Regime accepts your surrender. (It was never a parley.)',4.5);
        setTimeout(()=>{ if(G.state==='playing'){ AU.alarm();
          spawnAce(b.clone().add(new THREE.Vector3(400,60,0)));
          for(let i=0;i<5;i++) spawnSentinel(b.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(250,450))));
        }},4200); }
      if(m.phase===1&&enemies.filter(e=>!e.dead).length===0&&player.obj.position.distanceToSquared(b)<900*900){ m.phase=2;
        toast('SECOND WAVE',2.5); AU.alarm();
        spawnCutter(b.clone().add(new THREE.Vector3(500,100,150))); spawnCutter(b.clone().add(new THREE.Vector3(-500,-100,-150)));
        for(let i=0;i<6;i++) spawnSentinel(b.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(300,500)))); }
      if(m.phase===2&&enemies.filter(e=>!e.dead).length===0){ completeMission(1500,
        'OLD CAPTAIN','Their parley, their funeral. One left, pirate. The Regime is sending its ledger in person.'); } },
    track(){ const m=G.missionState;
      if(m.phase===0) return 'REACH THE BEACON · '+Math.round(player.obj.position.distanceTo(m.beacon))+'m';
      return 'SURVIVE · HOSTILES: '+enemies.filter(e=>!e.dead).length; } },
  { id:'sandtithe', title:'CHAPTER THREE - THE BLEED REMEMBERS · IX. THE SAND TITHE',
    obj:'Dive to the collection outpost. Burn the three furnace stacks, crack the temple vault, lift the tithe back to orbit.',
    setup(){ const m=G.missionState={phase:1,got:0,vaultDead:false,orbitTold:false};
      setPlanetary(true); AU.stinger('descent');
      player.obj.position.set(-160,300,620); player.vel.set(0,0,0);
      player.obj.lookAt(-380,60,0);
      spawnStack(new THREE.Vector3(-520,55,-60)); spawnStack(new THREE.Vector3(-390,55,30)); spawnStack(new THREE.Vector3(-450,55,170));
      spawnVault(new THREE.Vector3(600,150,-260));
      for(let i=0;i<4;i++){ const a=i/4*TAU;
        spawnTempleGun(new THREE.Vector3(600+Math.cos(a)*120, 60, -260+Math.sin(a)*120)); }
      for(let i=0;i<6;i++) spawnSentinel(new THREE.Vector3(rand(-560,-300),rand(120,240),rand(-100,220)));
      spawnCutter(new THREE.Vector3(-460,190,60)); spawnCutter(new THREE.Vector3(-330,160,-80));
      say('OLD CAPTAIN','Down there is every credit they ever bled out of us. Burn the furnaces. Crack the vault. Bring the tithe home.',7);
      AU.alarm(); },
    update(){ const m=G.missionState;
      if(m.phase===1 && !enemies.some(e=>e.kind==='stack'&&!e.dead)){ m.phase=2; AU.setPhase(2);
        const v=enemies.find(e=>e.kind==='vault'); if(v){ v.shielded=false; AU.shieldDown(); }
        say('MUMBIUS','The furnaces are out and the vault is bare. Crack it, rat - gently. What is inside is ours.',5); }
      if(m.phase===2 && m.vaultDead){ m.phase=3; AU.setPhase(3); AU.stinger('vaultcrack');
        for(let i=0;i<6;i++) dropPod(new THREE.Vector3(600+rand(-90,90), rand(30,80), -260+rand(-90,90)));
        toast('THE TITHE IS LOOSE - TAKE 4',4); AU.alarm(); }
      if(m.phase===3 && m.got>=4){
        if(!m.orbitTold){ m.orbitTold=true; toast('LIFT IT TO ORBIT - CLIMB, RAT, CLIMB',4); AU.stinger('ascent'); }
        if(player.obj.position.y>900) completeMission(1800,
          'OLD CAPTAIN','The tithe comes home twice as heavy as it left. Let their ledgers choke on it.'); } },
    track(){ const m=G.missionState;
      const st=enemies.filter(e=>e.kind==='stack'&&!e.dead).length;
      const v=enemies.find(e=>e.kind==='vault');
      if(m.phase===1) return 'FURNACE STACKS: '+st+' LEFT';
      if(m.phase===2) return 'TEMPLE GUNS: '+enemies.filter(e=>e.kind==='turret'&&!e.dead&&e.temple).length+' · VAULT: '+(v&&!v.dead?(v.shielded?'SHIELDED':Math.ceil(v.hull/v.hullMax*100)+'%'):'CRACKED');
      return 'TITHE: '+m.got+' / 4 · ALT: '+Math.max(0,Math.floor(player.obj.position.y))+' / 900'; } },
  { id:'finalaccount', title:'CHAPTER THREE - THE BLEED REMEMBERS · X. THE FINAL ACCOUNT',
    obj:"The Regime's ledger-ship FINAL ACCOUNT has come to close the Bleed. Strip its turrets. Kill it. End the debt.",
    setup(){ G.missionState={dead:false}; spawnCitadel();
      say('OLD CAPTAIN','This is the one they wrote us all into. Six turrets, then the heart. The Bleed remembers what you do today.',6.5);
      AU.alarm(); },
    update(){ if(port.hull<=0){ port.hull=port.hullMax*.4; failMission('OLD CAPTAIN','The port is gone. The Bleed is embers. We begin again from ash.'); return; }
      if(G.missionState.dead){ completeMission(2500,
        'MUMBIUS','The Final Account is closed forever. No tithe. No debt. No masters. The Bleed is free, rat - and it remembers you. CAMPAIGN COMPLETE.'); } },
    track(){ const t=enemies.filter(e=>e.kind==='turret'&&!e.dead).length;
      const c=enemies.find(e=>e.kind==='citadel');
      return 'TURRETS: '+t+' · FINAL ACCOUNT: '+(c&&!c.dead?(c.shielded?'SHIELDED':Math.ceil(c.hull/c.hullMax*100)+'%'):'DESTROYED')+' · PORT: '+Math.max(0,Math.ceil(port.hull/port.hullMax*100))+'%'; } },
];
function startMission(i){
  setSkyTheme(i<=2?'tithe':i<=5?'quietwar':'bleed');
  if (i>=MISSIONS.length){ setMissionUI('THE BLEED','Free raid. The Combine always sends more.'); return; }
  const M=MISSIONS[i];
  window.showMissionCard((window.SOB_MISSION_ART||{})[M.id], M.title, M.obj);
  AU.setMission(i);
  M.setup();
}
function completeMission(reward,who,line){
  setPlanetary(false);
  G.credits+=reward; G.missionIndex++; port.hull=port.hullMax; save();
  say(who,line,7); toast('CONTRACT COMPLETE +'+reward+' CR',4); AU.dock(); AU.stinger(G.missionIndex===2||G.missionIndex===5||G.missionIndex===9?'chapter':'victory');
  G.awaitingDock=true;
  setMissionUI('RETURN TO FREE PORT','Dock (E) to repair and spend. Next contract with Mumbius.');
}

/* ---------- allies ---------- */
function updateAllies(dt){
  const m=G.missionState;
  for(const a of allies){
    if(a.hull<=0) continue;
    const ap=a.obj.position;
    let danger=false;
    for(const e of enemies){ if(!e.dead && e.kind!=='mine' && e.obj.position.distanceToSquared(ap)<700*700){ danger=true; break; } }
    if(!danger && m && m.legs && m.legs[m.leg]){
      const tgt=m.legs[m.leg];
      _v.copy(tgt).sub(ap); const d=_v.length();
      if(d>5){ _v.normalize(); ap.addScaledVector(_v,Math.min(a.spd,d)*dt);
        a.obj.lookAt(ap.clone().add(_v)); }
      if(d<60){ m.leg++;
        if(m.leg>=m.legs.length){ a.done=true; }
        else { toast('CHECKPOINT CLEAR - HOSTILES INBOUND',3); AU.alarm();
          for(let i=0;i<4;i++) spawnSentinel(ap.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(300,500))));
          spawnCutter(ap.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(450))); } }
    }
  }
}
function failMission(who,line){
  setPlanetary(false);
  say(who,line,6.5); toast('CONTRACT FAILED - REGROUP',4); AU.stinger('failed');
  for(const e of enemies){ spawnParts(e.obj.position,10,0xff9a50,60); scene.remove(e.obj); }
  enemies=[];
  setTimeout(()=>{ if(G.state==='playing') startMission(G.missionIndex); },5000);
}

/* ---------- dock ---------- */
function tryDock(){
  if (player.obj.position.distanceTo(port.obj.position) < port.dockR){ G.state='docked';
    AU.dock(); AU.stinger('dock'); AU.setMode('port'); openDock(); }
  else toast('NO DOCK IN RANGE');
}
function undock(){ $('dock').classList.add('hidden'); G.state='playing'; AU.dockUndock(); AU.setMode('field'); save(); }

/* ---------- enemy AI ---------- */
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function updateEnemies(dt){
  const pp = player.obj.position;
  for(const e of enemies){
    e.flash=Math.max(0,(e.flash||0)-dt);
    const ep = e.obj.position, dp = ep.distanceTo(pp);
    if (e.kind==='sentinel'){
      e.vel = e.vel||new THREE.Vector3();
      _v.copy(pp).sub(ep).normalize().multiplyScalar(e.spd);
      for(const o of enemies){ if(o!==e&&o.kind==='sentinel'){
        const d=ep.distanceTo(o.obj.position);
        if(d<26&&d>0){ _v2.copy(ep).sub(o.obj.position).normalize().multiplyScalar((26-d)*3); _v.add(_v2); } } }
      e.sep+=dt*2;
      if (dp<120){ _v2.copy(pp).sub(ep).normalize().cross(new THREE.Vector3(0,1,0)).multiplyScalar(Math.sin(e.sep)*e.spd*.8); _v.add(_v2); }
      e.vel.lerp(_v, dt*2); ep.addScaledVector(e.vel,dt);
      e.obj.lookAt(ep.clone().add(e.vel));
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<240&&player.alive){ e.fireCd=rand(1.4,2.6); enemyShot(e,8,300); }
    }
    else if (e.kind==='cutter'){
      e.vel = e.vel||new THREE.Vector3();
      _v.copy(pp).sub(ep).normalize().multiplyScalar(e.spd);
      if (dp<180){ _v2.copy(pp).sub(ep).normalize().cross(new THREE.Vector3(0,1,0)).multiplyScalar(e.strafe*e.spd); _v.add(_v2); }
      if (dp<90) e.strafe*=-1;
      e.vel.lerp(_v,dt*1.6); ep.addScaledVector(e.vel,dt);
      e.obj.lookAt(pp);
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<300&&player.alive){ e.fireCd=rand(1.6,2.4);
        enemyShot(e,10,340); enemyShot(e,10,340,.06); enemyShot(e,10,340,-.06); }
    }
    else if (e.kind==='mine'){
      e.armT-=dt;
      e.obj.rotation.y+=dt*.8;
      const blink=.5+.5*Math.sin(G.t*(e.armT>0?4:12));
      e.obj.children.forEach(c=>{ if(c.isSprite) c.material.opacity=.3+.7*blink; });
      if(e.armT<=0){
        if(player.alive && ep.distanceToSquared(pp)<80*80) damageEnemy(e,99,ep);
        for(const a of allies){ if(ep.distanceToSquared(a.obj.position)<80*80) damageEnemy(e,99,ep); }
      }
    }
    else if (e.kind==='node'){
      e.obj.rotation.y+=dt*1.4;
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<420&&player.alive){ e.fireCd=rand(2.4,3.6); enemyShot(e,9,320); }
    }
    else if (e.kind==='core'){
      e.obj.rotation.y+=dt*.3;
      e.burstCd-=dt;
      if(e.burstCd<=0&&dp<700){ e.burstCd=7;
        for(let i=0;i<12;i++){ const l=new THREE.Mesh(laserGeo,elaserMat); addGlow(l,glowTexRed,5);
          const a=i/12*TAU; l.position.copy(ep);
          l.userData={vel:new THREE.Vector3(Math.cos(a),rand(-.2,.2),Math.sin(a)).normalize().multiplyScalar(300),dmg:10,life:3.4};
          l.lookAt(l.position.clone().add(l.userData.vel)); l.rotateX(Math.PI/2);
          scene.add(l); elasers.push(l); }
        AU.enemyLaser(); }
    }
    else if (e.kind==='ace'){
      e.vel = e.vel||new THREE.Vector3();
      _v.copy(pp).sub(ep).normalize().multiplyScalar(e.spd);
      e.sep+=dt*3;
      _v2.copy(pp).sub(ep).normalize().cross(new THREE.Vector3(0,1,0)).multiplyScalar(Math.sin(e.sep)*e.spd*.9);
      _v.add(_v2);
      e.vel.lerp(_v,dt*3.2); ep.addScaledVector(e.vel,dt);
      e.obj.lookAt(pp);
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<340&&player.alive){ e.fireCd=rand(.9,1.5);
        enemyShot(e,9,380); enemyShot(e,9,380,.05); enemyShot(e,9,380,-.05); }
    }
    else if (e.kind==='harvester'){
      if(e.latched){
        e.obj.lookAt(port.obj.position);
        port.hull-=38*dt;
        if(Math.random()<dt*8) spawnParts(ep.clone().lerp(port.obj.position,.3),2,0xff7a40,40);
      } else {
        _v.copy(port.obj.position).sub(ep);
        const d=_v.length();
        if(d<port.dockR+40){ e.latched=true; toast('A COLLECTOR HAS LATCHED ON',3); AU.latch(); AU.alarm(); }
        else { _v.normalize(); ep.addScaledVector(_v,e.spd*dt); e.obj.lookAt(port.obj.position); }
      }
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<320&&player.alive){ e.fireCd=rand(2,3); enemyShot(e,8,300); }
    }
    else if (e.kind==='turret'){
      e.orbA+=dt*.25;
      const h=e.host;
      if(h && !h.dead){ e.obj.position.set(
        h.obj.position.x+Math.cos(e.orbA)*95,
        h.obj.position.y+e.orbY,
        h.obj.position.z+Math.sin(e.orbA)*95); }
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<420&&player.alive){ e.fireCd=rand(1.8,2.8); enemyShot(e,9,340); }
    }
    else if (e.kind==='citadel'){
      _v.copy(port.obj.position).sub(ep);
      if(_v.length()>500){ _v.normalize(); ep.addScaledVector(_v,e.spd*dt); e.obj.lookAt(port.obj.position); }
      e.fireCd-=dt; e.burstCd-=dt;
      if(e.fireCd<=0&&dp<520&&player.alive){ e.fireCd=rand(1.2,1.9); enemyShot(e,11,360); enemyShot(e,11,360,.07); enemyShot(e,11,360,-.07); }
      if(e.burstCd<=0){ e.burstCd=8;
        for(let i=0;i<14;i++){ const l=new THREE.Mesh(laserGeo,elaserMat); addGlow(l,glowTexRed,5);
          const a=i/14*TAU; l.position.copy(ep);
          l.userData={vel:new THREE.Vector3(Math.cos(a),rand(-.25,.25),Math.sin(a)).normalize().multiplyScalar(320),dmg:10,life:4};
          l.lookAt(l.position.clone().add(l.userData.vel)); l.rotateX(Math.PI/2);
          scene.add(l); elasers.push(l); }
        AU.enemyLaser(); }
    }
    else if (e.kind==='freighter'){
      e.vel = e.vel||e.flee.clone().multiplyScalar(e.spd);
      e.vel.lerp(_v.copy(e.flee).multiplyScalar(e.spd), dt*.4);
      ep.addScaledVector(e.vel,dt); e.obj.lookAt(ep.clone().add(e.vel));
      e.fireCd-=dt;
      if(e.fireCd<=0&&dp<220&&player.alive){ e.fireCd=2.2; enemyShot(e,10,240); }
    }
    else if (e.kind==='boss'){
      e.vel = e.vel||new THREE.Vector3();
      const tgt = dp<400 ? pp : port.obj.position;
      _v.copy(tgt).sub(ep).normalize().multiplyScalar(e.spd);
      e.vel.lerp(_v,dt*.6); ep.addScaledVector(e.vel,dt); e.obj.lookAt(tgt);
      e.fireCd-=dt; e.burstCd-=dt;
      if(e.fireCd<=0&&ep.distanceTo(tgt)<500){ e.fireCd=1.4;
        enemyShot(e,12,300); enemyShot(e,12,300,.1); enemyShot(e,12,300,-.1); }
      if(e.burstCd<=0){ e.burstCd=6;
        for(let i=0;i<10;i++){ const l=new THREE.Mesh(laserGeo,elaserMat); addGlow(l,glowTexRed,5);
          l.position.copy(ep);
          _v.randomDirection();
          l.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),_v);
          l.userData={vel:_v.clone().multiplyScalar(180),life:4,dmg:8};
          scene.add(l); elasers.push(l); }
        AU.alarm(); }
      if (ep.distanceTo(port.obj.position)<160) port.hull-=10*dt;
    }
  }
  enemies = enemies.filter(e=>{ if(e.dead){ scene.remove(e.obj); return false; } return true; });
}
function enemyShot(e,dmg,spd,off){
  const l = new THREE.Mesh(laserGeo, elaserMat);
  l.position.copy(e.obj.position);
  _v.copy(player.obj.position).sub(e.obj.position).normalize();
  if (off){ _v2.crossVectors(_v,new THREE.Vector3(0,1,0)).normalize(); _v.addScaledVector(_v2,off).normalize(); }
  l.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),_v);
  l.userData={vel:_v.clone().multiplyScalar(spd),life:3,dmg};
  scene.add(l); elasers.push(l); AU.enemyLaser();
}

/* ---------- projectiles / pods / particles ---------- */
function updateProjectiles(dt){
  for(const l of lasers){ l.position.addScaledVector(l.userData.vel,dt); l.userData.life-=dt;
    for(const e of enemies){ if(!e.dead && l.position.distanceToSquared(e.obj.position)<(e.r+3)*(e.r+3)){
      damageEnemy(e,l.userData.dmg,l.position); l.userData.life=0; break; } } }
  lasers = lasers.filter(l=>{ if(l.userData.life<=0){ scene.remove(l); return false; } return true; });
  for(const l of elasers){ l.position.addScaledVector(l.userData.vel,dt); l.userData.life-=dt;
    if(player.alive && l.position.distanceToSquared(player.obj.position)<81){ damagePlayer(l.userData.dmg); l.userData.life=0; }
    if(G.missionIndex>=2 && l.position.distanceToSquared(port.obj.position)<3600){ port.hull-=l.userData.dmg; l.userData.life=0; }
    for(const a of allies){ if(a.hull>0 && l.position.distanceToSquared(a.obj.position)<(a.r+6)*(a.r+6)){ a.hull-=l.userData.dmg; l.userData.life=0;
      spawnParts(l.position,4,0xffd0a0,40); } } }
  elasers = elasers.filter(l=>{ if(l.userData.life<=0){ scene.remove(l); return false; } return true; });
  for(const m of missiles){ const u=m.userData;
    if(u.target && !u.target.dead){ _v.copy(u.target.obj.position).sub(m.position).normalize().multiplyScalar(420);
      u.vel.lerp(_v,dt*3); }
    if(u.target && u.target.dead) u.target=enemies[0]||null;
    m.position.addScaledVector(u.vel,dt); u.life-=dt;
    spawnParts(m.position,1,0xff9a50,4);
    if(u.target && !u.target.dead && m.position.distanceToSquared(u.target.obj.position)<(u.target.r+5)*(u.target.r+5)){
      damageEnemy(u.target,u.dmg,m.position); G.shake=Math.min(18,G.shake+6); u.life=0; } }
  missiles = missiles.filter(m=>{ if(m.userData.life<=0){ scene.remove(m); return false; } return true; });
  for(const p of pods){ p.t+=dt; p.obj.position.addScaledVector(p.obj.userData.vel,dt);
    p.obj.rotation.x+=dt; p.obj.rotation.y+=dt*.7;
    if(player.alive && p.obj.position.distanceToSquared(player.obj.position)<144){
      if(G.cargo<G.cargoMax){ G.cargo++; p.got=true; AU.pickup();
        if(G.missionState && G.missionState.got!==undefined) G.missionState.got++; }
      else if(!p.warned){ p.warned=true; toast('CARGO HOLD FULL - SELL AT FREE PORT'); } } }
  pods = pods.filter(p=>{ if(p.got){ scene.remove(p.obj); return false; } return true; });
}
function updateParts(dt){
  for(const s of partPool){ if(!s.userData.live) continue;
    s.userData.t-=dt;
    if(s.userData.t<=0){ s.userData.live=false; s.material.opacity=0; continue; }
    s.position.addScaledVector(s.userData.vel,dt);
    s.material.opacity = s.userData.t/s.userData.mx; }
}

/* ---------- player ---------- */
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function updatePlayer(dt){
  if(!player.alive) return;
  player.inv=Math.max(0,player.inv-dt);
  player.gunCd=Math.max(0,player.gunCd-dt);
  // mouse steer: yaw/pitch toward cursor offset, roll bank
  const yaw = -mouse.x*1.9*dt, pitch = -mouse.y*1.5*dt;
  const rollTarget = -mouse.x*.7;
  _e.set(pitch, yaw, 0, 'XYZ'); _q.setFromEuler(_e);
  player.obj.quaternion.multiply(_q).normalize();
  // ease roll visually on a child? apply roll directly around forward:
  _e.set(0,0,(rollTarget-(player.roll||0))*dt*4,'XYZ'); _q.setFromEuler(_e);
  player.obj.quaternion.multiply(_q).normalize();
  player.roll = (player.roll||0)+((rollTarget-(player.roll||0))*dt*4);
  const fwd = new THREE.Vector3(0,0,1).applyQuaternion(player.obj.quaternion);
  const acc = playerSpeed()*2.4;
  player.boost=0;
  if(keys['w']){ player.vel.addScaledVector(fwd,acc*dt); }
  if(keys['shift']){ if(!player.boost) AU.boost(); player.vel.addScaledVector(fwd,acc*1.7*dt); player.boost=1; }
  if(planet.on){
    if(Math.random()<dt/7) AU.windGust();
    player.vel.y -= 13*dt; // gravity
    if(player.obj.position.y<8){ player.obj.position.y=8;
      if(player.vel.y<-60){ damagePlayer(Math.min(20,Math.floor(-player.vel.y/12))); G.shake=Math.min(24,G.shake+10); }
      player.vel.y=Math.abs(player.vel.y)*.25; }
  }
  if(keys['s']){ player.vel.multiplyScalar(Math.pow(.25,dt)); }
  const max = playerSpeed()*(player.boost?1.9:1), sp = player.vel.length();
  if(sp>max) player.vel.multiplyScalar(max/sp);
  player.vel.multiplyScalar(Math.pow(.55,dt));
  player.obj.position.addScaledVector(player.vel, dt);
  if(keys[' '] && G.state==='playing') fireGuns();
  if((keys['w']||player.boost) && Math.random()<dt*30){
    const ep = player.obj.position.clone().addScaledVector(fwd,-9);
    spawnParts(ep,1,player.boost?0xffd27a:0xff9a50,10);
  }
  // engine glow follows thrust
  const eg = 3.5 + player.vel.length()/playerSpeed()*2.5 + player.boost*2.5 + Math.sin(G.t*30)*.4;
  engineGlow.scale.set(eg,eg,1);
  engineGlow.material.color.setHex(player.boost?0xffb060:0x8fffc8);
  // danger music
  let danger=false;
  for(const e of enemies){ if(e.obj.position.distanceToSquared(player.obj.position)<360*360){ danger=true; break; } }
  AU.setMode(danger?'combat':'field');
}

/* ---------- camera ---------- */
const camPos = new THREE.Vector3(0,60,-140), camTgt = new THREE.Vector3();
function updateCamera(dt){
  if(window.__camTarget){ const b=window.__camTarget();
    if(b){ camera.position.copy(b.obj.position).add(window.__camOffset||new THREE.Vector3(70,26,70));
      camera.lookAt(b.obj.position); camera.fov=60; camera.updateProjectionMatrix(); return; } }
  const fwd = new THREE.Vector3(0,0,1).applyQuaternion(player.obj.quaternion);
  const up = new THREE.Vector3(0,1,0).applyQuaternion(player.obj.quaternion);
  _v.copy(player.obj.position).addScaledVector(fwd,-34).addScaledVector(up,10);
  camPos.lerp(_v, 1-Math.pow(.0015,dt));
  _v.addScaledVector(fwd,-G.kick*2.2); camPos.add(_v.subVectors(_v,camPos).multiplyScalar(.55));
  const sx=(Math.random()-.5)*G.shake*.5, sy=(Math.random()-.5)*G.shake*.5;
  camera.position.set(camPos.x+sx, camPos.y+sy, camPos.z);
  camTgt.copy(player.obj.position).addScaledVector(fwd,60);
  camera.lookAt(camTgt);
  const wantFov = 68 + player.vel.length()/playerSpeed()*10 + player.boost*8;
  camera.fov += (wantFov-camera.fov)*dt*3; camera.updateProjectionMatrix();
}

/* ---------- HUD ---------- */
function updateHUD(){
  const f = clamp(player.hull/player.hullMax,0,1);
  $('hullfill').style.width=(f*100)+'%';
  $('hullfill').style.background = f>.5?'#5affaa':f>.25?'#ffd27a':'#ff5030';
  $('statline').textContent = 'HULL '+Math.max(0,Math.ceil(player.hull))+'/'+player.hullMax+
    ' · CR '+G.credits+' · CARGO '+G.cargo+'/'+G.cargoMax+' · MSL '+player.missiles;
  $('speed').textContent = Math.round(player.vel.length()*3.6)+' m/s';
  $('vignette').style.opacity = Math.max(0, $('vignette').style.opacity - .02,
    (player.alive&&player.hull<player.hullMax*.35)? .5+.3*Math.sin(G.t*6):0);
}

/* ---------- dock UI (built in JS) ---------- */
const dockDiv = document.createElement('div');
dockDiv.id='dock'; dockDiv.className='overlay hidden';
dockDiv.style.pointerEvents='auto';
dockDiv.style.background='linear-gradient(rgba(3,8,7,.78),rgba(3,8,7,.94)), url(assets/concept/freeport-dock.png) center/cover';
document.body.appendChild(dockDiv);
function openDock(){
  const rep = Math.ceil((player.hullMax-player.hull)*1.2)+(player.missiles<mslCap()?(mslCap()-player.missiles)*25:0);
  const sell = G.cargo*90;
  let h = '<div style="padding:34px 44px;min-width:min(560px,92vw);border:1px solid #1d3a30;background:rgba(3,8,7,.95)">';
  h += '<h2 style="margin:0 0 4px;color:#5affaa;letter-spacing:.24em;font-size:18px">FREE PORT "UMBRA"</h2>';
  h += '<div style="color:#7fae9c;font-size:12px;letter-spacing:.2em;margin-bottom:20px">THE LAST HONEST DOCK IN THE BLEED</div>';
  h += row('CREDITS', G.credits+' CR','');
  h += row('REPAIR + RESTOCK', rep>0?rep+' CR':'FULL', rep>0&&G.credits>=rep?btn('repair','REPAIR'):'');
  for(const k of ['gun','eng','hull','msl']){
    const lvl=G.upgrades[k], nm={gun:'CANNONS',eng:'ENGINE',hull:'HULL PLATING',msl:'MISSILE RACK'}[k];
    h += row(nm, UPG.name[k][lvl]+(lvl>=3?' (MAX)':' -> '+UPG[k].cost[lvl]+' CR'),
      lvl<3&&G.credits>=UPG[k].cost[lvl]?btn('up-'+k,'UPGRADE'):'');
  }
  h += row('SELL CARGO', G.cargo>0?G.cargo+' x TITHE CRATE = '+sell+' CR':'HOLD EMPTY',
    G.cargo>0?btn('sell','SELL'):'');
  h += row('CONTRACTS','',btn('mission','SEE MUMBIUS'));
  h += '<div style="margin-top:20px;color:#4d6f63;font-size:11px;letter-spacing:.12em">E / ESC - UNDOCK</div></div>';
  dockDiv.innerHTML=h;
  dockDiv.classList.remove('hidden');
  dockDiv.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>dockAction(b.dataset.a)));
}
function row(k,v,b){ return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 4px;border-bottom:1px solid #12241e;font-size:14px"><span style="color:#9fc4b6">'+k+'</span><span style="color:#e8f6ee">'+v+' '+b+'</span></div>'; }
function btn(a,t){ return '<button data-a="'+a+'" style="background:#0a1a14;border:1px solid #2a5a46;color:#5affaa;font:inherit;padding:4px 14px;cursor:pointer;margin-left:10px">'+t+'</button>'; }
function dockAction(a){
  AU.uiClick();
  if(a==='repair'){ const c=Math.ceil((player.hullMax-player.hull)*1.2)+(player.missiles<mslCap()?(mslCap()-player.missiles)*25:0);
    if(G.credits>=c&&c>0){ G.credits-=c; player.hull=player.hullMax; player.missiles=mslCap(); AU.shopBuy(); } }
  else if(a==='sell'){ if(G.cargo>0){ G.credits+=G.cargo*90; G.cargo=0; AU.pickup(); } }
  else if(a==='mission'){ if(G.missionIndex<MISSIONS.length && G.awaitingDock){ G.awaitingDock=false; undock(); startMission(G.missionIndex); return; }
    else if(G.missionIndex>=MISSIONS.length) say('MUMBIUS','No more contracts, rat. Only legend.',4);
    else say('MUMBIUS','Finish the contract you are on, rat. Then we talk.',4); }
  else if(a.startsWith('up-')){ const k=a.slice(3), lvl=G.upgrades[k];
    if(lvl<3&&G.credits>=UPG[k].cost[lvl]){ G.credits-=UPG[k].cost[lvl]; G.upgrades[k]++; applyStats(); AU.shopBuy();
      if(k==='hull') player.hull=player.hullMax; if(k==='msl') player.missiles=mslCap(); } }
  save(); openDock();
}

/* ---------- main loop ---------- */
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt=Math.min(.05,(now-last)/1000); last=now;
  if(G.state==='paused'){ renderer.render(scene,camera); return; }
  if(G.freeze>0){ G.freeze-=dt; dt*=.08; }
  G.t+=dt; G.shake=Math.max(0,G.shake-dt*26); G.kick=Math.max(0,G.kick-dt*10);
  for(let i=flashes.length-1;i>=0;i--){ const f=flashes[i]; f.userData.life-=dt;
    if(f.userData.life<=0){ scene.remove(f); f.material.dispose(); flashes.splice(i,1); }
    else f.material.opacity=f.userData.life/.07; }
  if(toastT>0){ toastT-=dt; if(toastT<=0){ $('toast').style.opacity=0; $('portrait').style.opacity=0; } }
  if(G.state==='playing'||G.state==='docked'||G.state==='title'){
    if(G.state==='playing'){
      updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt);
      const Md=MISSIONS[G.missionIndex];
      if(Md && !G.awaitingDock){ Md.update(dt); setMissionUI(Md.title, Md.obj+'<br><span style="color:#ffd27a">'+Md.track()+'</span>'); }
      port.hull=Math.min(port.hullMax,port.hull);
    }
    port.obj.rotation.z += dt*.05;
    dockRing.position.copy(port.obj.position); dockRing.rotation.x = Math.PI/2;
    updatePortExtras(dt);
    dockRing.rotation.z = -G.t*.1;
    for(const w of wrecks){ w.rotation.x+=w.userData.spin.x*dt; w.rotation.y+=w.userData.spin.y*dt; w.rotation.z+=w.userData.spin.z*dt; }
    updateDust(); updatePlanetFx(dt); updateBleed(dt);
    const lamp=scene.getObjectByName('portLamp');
    if(lamp){ lamp.position.copy(port.obj.position).add(new THREE.Vector3(0,34,0)); const p=1+Math.sin(G.t*2.2)*.12; lamp.scale.set(90*p,90*p,1); }
    updateParts(dt);
    updateCamera(dt); updateHUD();
    renderer.render(scene,camera);
    // white flash on freeze
    if(G.freeze>0){ renderer.domElement.style.filter='brightness('+(1+G.freeze*2)+')'; }
    else renderer.domElement.style.filter='';
  }
}
requestAnimationFrame(frame);

/* ---------- QA hooks ---------- */
const qp = new URLSearchParams(location.search);
window.__SOB3 = {G, player, port, enemies:()=>enemies, newGame, spawnSentinel, spawnCutter, spawnBoss, spawnFreighterGroup, tryDock, keys, mouse};
if (qp.get('shot')){
  const mode=qp.get('shot');
  { const h=document.createElement('img'); h.src='/hang'; h.style.display='none'; document.body.appendChild(h); }
  setTimeout(()=>{
    newGame();
    if(mode==='combat'){
      for(let i=0;i<4;i++) spawnSentinel(player.obj.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(120,260))));
      spawnCutter(player.obj.position.clone().add(new THREE.Vector3(200,40,300)));
      keys['w']=true; keys[' ']=true; mouse.x=.2;
    }
    if(mode==='boss'){ G.missionIndex=2; startMission(2); keys['w']=true; }
    if(mode==='forient'){
      const fwd=new THREE.Vector3(0,0,1).applyQuaternion(player.obj.quaternion);
      const base=player.obj.position.clone().addScaledVector(fwd,160);
      const a=makeShip('frigate'); scene.add(a); a.position.copy(base); a.lookAt(base.clone().add(fwd));
      const b=builders.frigate(); scene.add(b); b.position.copy(base).add(new THREE.Vector3(0,70,0)); b.lookAt(base.clone().add(fwd));
      const d=document.getElementById('errbox')||(()=>{const x=document.createElement('div');x.id='errbox';document.documentElement.appendChild(x);return x})();
      const gs=new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3());
      const ps=new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
      d.textContent+=' GLBFRIG=('+gs.x.toFixed(1)+','+gs.y.toFixed(1)+','+gs.z.toFixed(1)+') PROCFRIG=('+ps.x.toFixed(1)+','+ps.y.toFixed(1)+','+ps.z.toFixed(1)+')';
    }
    if(mode==='planet'){ G.missionIndex=8; startMission(8); keys['w']=true; }
    if(mode==='hero'){ newGame();
      const tryH=()=>{ if(!playerMixer){ setTimeout(tryH,300); return; }
        player.obj.position.set(2650,300,-700); player.obj.quaternion.identity(); player.vel.set(0,0,0);
        window.__camTarget=()=>player; window.__camOffset=new THREE.Vector3(21,6,26); };
      setTimeout(tryH,300); }
    if(mode==='bleed'){ newGame();
      if(qp.get('mi')){ const mi=parseInt(qp.get('mi')); G.missionIndex=mi; startMission(mi); }
      player.obj.position.set(2650,300,-900); player.obj.lookAt(2650,430,-1900); }
    if(mode==='manta'){ newGame(); window.__mantaA=5.5;
      player.obj.position.set(1400,290,-750); player.obj.lookAt(1063,250,-1058); }
    if(mode==='bust'){ newGame();
      const tryB=()=>{ if(!portBust){ setTimeout(tryB,400); return; }
        player.obj.position.copy(portBust.position).add(new THREE.Vector3(95,30,95));
        player.obj.lookAt(portBust.position.clone().add(new THREE.Vector3(0,25,0))); };
      tryB(); }
    if(mode==='warship'){ newGame();
      const tryW=()=>{ if(!glbCache['warship015']){ setTimeout(tryW,300); return; }
        const sh=makeShip('frigate'); scene.add(sh);
        sh.position.set(2650,600,-1650); sh.rotation.set(0,Math.PI/2,0);
        player.obj.position.set(2650,620,-1300); player.obj.lookAt(2650,600,-1650); };
      tryW(); }
    if(mode==='outpost'){ G.missionIndex=8; startMission(8);
      player.obj.position.set(-180,210,620); player.obj.lookAt(-620,140,-80); }
    if(mode==='temple'){ G.missionIndex=8; startMission(8);
      player.obj.position.set(600,150,320); player.obj.lookAt(600,300,-260); }
    if(mode==='animvar'){ G.missionIndex=8; startMission(8);
      window.__animRow=[];
      const buildRow=()=>{ if(!glbCache['strider']){ setTimeout(buildRow,400); return; }
        for(let i=0;i<ANIM_VARS.length;i++){ const c=tryPlaceGLB('strider',150); if(!c) return;
          if(c.children[0]) c.children[0].rotation.y=-Math.PI/2;
          const x=-1420+i*190, z=-1150; c.position.set(x,duneH(x,z),z); c.rotation.y=.5;
          scene.add(c); window.__animRow.push({c:c,mx:playClip(c,'walk'),i:i}); } };
      buildRow();
      if(planet.strider) planet.strider.visible=false;
      const vb=document.createElement('div'); vb.id='varbox';
      vb.style.cssText='position:fixed;left:24px;top:140px;color:#efe9d6;font:12px monospace;white-space:pre;text-shadow:0 1px 3px #000;line-height:1.5';
      vb.textContent='PROCEDURAL STRIDER VARIANTS (left to right: A B C D E)\n'+ANIM_VARS.map(v=>v.name).join('\n');
      document.body.appendChild(vb);
      player.obj.position.set(-1060,230,-640); player.obj.lookAt(-1060,110,-1150); }
    if(mode==='strider'){ G.missionIndex=8; startMission(8);
      player.obj.position.set(-620,140,-520); player.obj.lookAt(-1000,110,-900); }
    if(mode==='bossview'){ const mi=parseInt(qp.get('mi')||'2'); G.missionIndex=mi; startMission(mi);
      window.__camTarget=()=>enemies.find(e=>e.kind==='boss'||e.kind==='citadel');
      window.__camOffset=new THREE.Vector3(parseFloat(qp.get('ox')||'150'),parseFloat(qp.get('oy')||'90'),parseFloat(qp.get('oz')||'60')); }
    if(mode==='escort'){ G.missionIndex=3; startMission(3); keys['w']=true; }
    if(mode==='ace'){ G.missionIndex=4; startMission(4); keys['w']=true; keys[' ']=true; }
    if(mode==='station'){ G.missionIndex=5; startMission(5); keys['w']=true; keys[' ']=true; }
    if(mode==='collectors'){ G.missionIndex=6; startMission(6); keys['w']=true; keys[' ']=true; }
    if(mode==='citadel'){ G.missionIndex=9; startMission(9); keys['w']=true; keys[' ']=true; }
    if(mode==='freighter'){ spawnFreighterGroup(player.obj.position.clone().add(new THREE.Vector3(150,20,260))); keys['w']=true; keys[' ']=true; }
    if(mode==='dock'){ player.obj.position.copy(port.obj.position).add(new THREE.Vector3(60,0,0)); setTimeout(()=>tryDock(),900); }
    if(mode==='port'){ player.obj.position.copy(port.obj.position).add(new THREE.Vector3(220,60,220));
      player.obj.lookAt(port.obj.position); }
    if(mode==='lineup'){
      const trySpawn=()=>{
        const names=['interceptor','sentinel','cutter','freighter','port','frigate'];
        if(!names.every(n=>glbCache[n])){ setTimeout(trySpawn,300); return; }
        const fwd=new THREE.Vector3(0,0,1).applyQuaternion(player.obj.quaternion);
        const right=new THREE.Vector3(1,0,0).applyQuaternion(player.obj.quaternion);
        const base=player.obj.position.clone().addScaledVector(fwd,120);
        names.forEach((n,i)=>{
          const s=makeShip(n); scene.add(s);
          s.position.copy(base).addScaledVector(right,(i-2)*70);
          s.lookAt(s.position.clone().add(fwd));
        });
        // and the procedural equivalents above them for comparison
        names.forEach((n,i)=>{
          const s=builders[n](); scene.add(s);
          s.position.copy(base).addScaledVector(right,(i-2)*70).add(new THREE.Vector3(0,60,0));
          s.lookAt(s.position.clone().add(fwd));
        });
        const d=document.getElementById('errbox')||(()=>{const x=document.createElement('div');x.id='errbox';document.documentElement.appendChild(x);return x})();
        d.textContent+=' SIZES='+names.map(n=>{
          const gs=new THREE.Box3().setFromObject(makeShip(n)).getSize(new THREE.Vector3());
          const ps=new THREE.Box3().setFromObject(builders[n]()).getSize(new THREE.Vector3());
          return n+':GLB('+gs.x.toFixed(1)+','+gs.y.toFixed(1)+','+gs.z.toFixed(1)+')PROC('+ps.x.toFixed(1)+','+ps.y.toFixed(1)+','+ps.z.toFixed(1)+')';
        }).join(' ');
      };
      trySpawn();
    }
  },400);
  if(qp.get('shot')) setTimeout(()=>{
    const d=document.getElementById('errbox')||(()=>{const x=document.createElement('div');x.id='errbox';document.documentElement.appendChild(x);return x})();
    d.textContent='TRIS='+renderer.info.render.triangles+' CALLS='+renderer.info.render.calls+' GLB='+JSON.stringify(Object.keys(glbCache).map(k=>k+':'+(glbCache[k]?'Y':'N')))+' ERRS='+window.__errs.slice(0,6).join(' ## ');
    d.textContent+=' CAM='+JSON.stringify(camera.position)+' PL='+JSON.stringify(player.obj.position)+' PORT='+JSON.stringify(port.obj.position);
    if(qp.get('flat')) scene.overrideMaterial = new THREE.MeshNormalMaterial();
    if(qp.get('snap')){ const im=document.createElement('img'); im.id='snapimg';
      im.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9999;object-fit:cover';
      renderer.render(scene,camera); im.src=renderer.domElement.toDataURL('image/png');
      document.body.appendChild(im); }
  },6000);
}
