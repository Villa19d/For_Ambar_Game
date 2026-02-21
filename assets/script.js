/* ════════════════════════════════════════════════════════════════
   script.js — Para Ámbar 💛  v4.1  (física corregida)
════════════════════════════════════════════════════════════════ */

/* ── 0. CONFIGURACIÓN ─────────────────────────────────────── */
const CFG = {
  // --- MOVIMIENTO ---
  speed:      18,    // velocidad máxima real (unidades/s) — antes 60, era demasiado
  accel:      28,    // aceleración (unidades/s²) — suave pero responsiva
  brakeForce: 55,    // fuerza de freno al ir hacia atrás
  friction:   0.015, // fricción por segundo (fracción de velocidad que se pierde)
                     // Se aplica como: vel *= (1 - friction * 60 * dt) → frame-rate independiente

  // --- GIRO ---
  turn:       90,    // grados/segundo de giro máximo
  steerLerp:  8,     // suavidad del volante (más alto = más rápido)

  // --- DERRAPE ---
  grip:       0.82,  // qué tanto agarra las ruedas (0=hielo, 1=grip perfecto)
                     // La magia del derrape está aquí: la velocidad lateral no se cancela 100%

  // --- CÁMARA ---
  camLerp:    0.08,  // suavidad de cámara

  // --- SALTO ---
  jumpForce:  9,     // impulso vertical inicial
  gravity:    22,    // gravedad (más bajo = más flotante, más alto = más pesado)
};

const CHECKPOINTS = [
  { id:'modal-1', label:'El Cofre',  icon:'🗝️', x:-14, z:-10, color:0xc9963c, emissive:0x6b4d10 },
  { id:'modal-2', label:'La Radio',  icon:'📻', x: 16, z: -8, color:0xe8714a, emissive:0x7a2c0f },
  { id:'modal-3', label:'El Faro',   icon:'🏮', x:  2, z:-24, color:0xa8d4a0, emissive:0x2a5c25 },
  { id:'jukebox', label:'La Rocola', icon:'🎵', x: -6, z:  14, color:0xd4a8ff, emissive:0x4a1a8c, isJukebox:true },
];
const TRIGGER_DIST = 3.5;

const CARTA_TEXTO =
`Hay lugares en el mundo que no están en ningún mapa,
pero que existen porque tú los iluminaste.

Este pequeño rincón lo construí pensando en ti,
en tu forma de reír cuando algo te sorprende,
y en cómo todo se vuelve más bonito cuando estás cerca.

Gracias por ser mi lugar favorito.`;

const SONGS = [
  { title: 'Canción #1 — Artista', color: '#c9963c' },
  { title: 'Canción #2 — Artista', color: '#e8714a' },
  { title: 'Canción #3 — Artista', color: '#a8d4a0' },
  { title: 'Canción #4 — Artista', color: '#d4a8ff' },
];
let currentSong = 0;
let jukeboxOpen = false;

const GRASS_CFG = {
  GLB_PATH : 'models/grass/grass.glb',
  COUNT    : 300,
  MIN_SCALE: 0.8,
  MAX_SCALE: 2.2,
  SPREAD   : 40,
};

/* ── 1. RENDERER + ESCENA + CÁMARA + LUCES ────────────────── */
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a2e);
scene.fog = new THREE.FogExp2(0x2a0a3e, 0.016);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
const CAM_OFFSET = new THREE.Vector3(0, 8, 11);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

let camZoom = 1.7;  // más alejado al inicio — el usuario puede acercar con scroll
window.addEventListener('wheel', e => {
  camZoom += e.deltaY * 0.001;
  camZoom  = Math.max(0.4, Math.min(2.8, camZoom));
}, { passive: true });

scene.add(new THREE.HemisphereLight(0xff6030, 0x1a0a2e, 1.1));

const sun = new THREE.DirectionalLight(0xff8040, 2.8);
sun.position.set(30, 18, 20);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -70;
sun.shadow.camera.right = sun.shadow.camera.top   =  70;
sun.shadow.camera.far   = 150;
sun.shadow.bias = -0.001;
scene.add(sun);

const fillLight = new THREE.PointLight(0x6020ff, 0.8, 120);
fillLight.position.set(-10, 2, 8);
scene.add(fillLight);

const ambientPurple = new THREE.PointLight(0xff2090, 0.5, 200);
ambientPurple.position.set(0, 15, 0);
scene.add(ambientPurple);

/* ══════════════════════════════════════════════════════════
   2. MUNDO
══════════════════════════════════════════════════════════ */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xc84820, roughness: 0.92, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(400, 80, 0xe05020, 0xe05020);
grid.material.opacity = 0.18;
grid.material.transparent = true;
grid.position.y = 0.01;
scene.add(grid);

/* ─── PISTA ──────────────────────────────────────────────── */
(function buildCleanTrack() {
  const trackPoints = [
    new THREE.Vector3(-35, 0.1,  30),
    new THREE.Vector3(-40, 0.1,  10),
    new THREE.Vector3(-38, 1.2,  -5),
    new THREE.Vector3(-35, 3.2, -10),
    new THREE.Vector3(-30, 2.5, -15),
    new THREE.Vector3(-20, 1.0, -20),
    new THREE.Vector3(  0, 0.1, -25),
    new THREE.Vector3( 15, 0.8, -15),
    new THREE.Vector3( 25, 0.1,   0),
    new THREE.Vector3( 30, 3.5,  15),
    new THREE.Vector3( 20, 0.1,  25),
    new THREE.Vector3(  0, 0.1,  30),
    new THREE.Vector3(-20, 0.5,  28),
    new THREE.Vector3(-35, 0.1,  30),
  ];

  const curve = new THREE.CatmullRomCurve3(trackPoints, true);
  const SEGMENTS = 400;
  const TRACK_W = 8.5;

  window._trackCurve = curve;

  // Mesh de colisión invisible
  const collisionPositions = [];
  const collisionIndices = [];

  for(let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const p = curve.getPoint(t);
    const tNext = (i + 1) / SEGMENTS;
    const pNext = curve.getPoint(tNext);
    const tan = new THREE.Vector3().subVectors(pNext, p).normalize();
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const colWidth = TRACK_W - 1.0;

    const left = p.clone().addScaledVector(norm, -colWidth * 0.5);
    const right = p.clone().addScaledVector(norm, colWidth * 0.5);
    const leftBottom = left.clone(); leftBottom.y = p.y - 0.2;
    const rightBottom = right.clone(); rightBottom.y = p.y - 0.2;
    const leftTop = left.clone(); leftTop.y = p.y;
    const rightTop = right.clone(); rightTop.y = p.y;

    collisionPositions.push(
      leftBottom.x, leftBottom.y, leftBottom.z,
      rightBottom.x, rightBottom.y, rightBottom.z,
      leftTop.x, leftTop.y, leftTop.z,
      rightTop.x, rightTop.y, rightTop.z
    );

    if(i < SEGMENTS) {
      const b = i * 4;
      collisionIndices.push(b, b+1, b+2, b+1, b+3, b+2, b+2, b+3, b+6, b+3, b+7, b+6);
    }
  }

  const collisionGeo = new THREE.BufferGeometry();
  collisionGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(collisionPositions), 3));
  collisionGeo.setIndex(collisionIndices);
  collisionGeo.computeVertexNormals();

  const collisionMesh = new THREE.Mesh(collisionGeo, new THREE.MeshStandardMaterial({ visible: false }));
  scene.add(collisionMesh);
  window._trackCollision = collisionMesh;

  // Pista visual rosa
  const visPositions = [], visUvs = [], visIndices = [];

  for(let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const p = curve.getPoint(t);
    const tNext = (i + 1) / SEGMENTS;
    const pNext = curve.getPoint(tNext);
    const tan = new THREE.Vector3().subVectors(pNext, p).normalize();
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const left = p.clone().addScaledVector(norm, -TRACK_W * 0.5);
    const right = p.clone().addScaledVector(norm, TRACK_W * 0.5);
    left.y = p.y + 0.02; right.y = p.y + 0.02;
    visPositions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    visUvs.push(0, i * 0.4, 1, i * 0.4);
    if(i < SEGMENTS) { const b = i * 2; visIndices.push(b, b+1, b+2, b+1, b+3, b+2); }
  }

  const visGeo = new THREE.BufferGeometry();
  visGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(visPositions), 3));
  visGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(visUvs), 2));
  visGeo.setIndex(visIndices);
  visGeo.computeVertexNormals();

  const visMesh = new THREE.Mesh(visGeo, new THREE.MeshStandardMaterial({
    color: 0xe83a6f, roughness: 0.6, metalness: 0.05,
    emissive: 0x3a0f1a, emissiveIntensity: 0.15,
  }));
  visMesh.receiveShadow = true;
  scene.add(visMesh);
  window._trackMesh = visMesh;

  // Topes a cuadros
  const checkerW = 1.2, checkerH = 0.15, checkerD = 1.2;
  [-0.52, 0.52].forEach((side, sideIdx) => {
    for(let i = 0; i < 200; i++) {
      if(i % 3 === 0) continue;
      const t = i / 200;
      const p = curve.getPoint(t);
      const pNext = curve.getPoint((i + 0.02) / 200);
      const tan = new THREE.Vector3().subVectors(pNext, p).normalize();
      const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const pos = p.clone().addScaledVector(norm, side * (TRACK_W * 0.5 + 0.3));
      pos.y = p.y + 0.08;
      const isWhite = (i + sideIdx) % 2 === 0;
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(checkerW, checkerH, checkerD),
        new THREE.MeshStandardMaterial({ color: isWhite ? 0xffffff : 0xc41e3a, roughness: 0.5 })
      );
      curb.position.copy(pos);
      curb.rotation.y = Math.atan2(tan.x, tan.z);
      curb.castShadow = curb.receiveShadow = true;
      scene.add(curb);
    }
  });

  console.log('%c🏁 Pista lista', 'color:#e83a6f;font-weight:bold');
})();

/* ─── RÍO ──────────────────────────────────────────────────── */
(function buildRiver(){
  const riverPoints = [
    new THREE.Vector3( 25, -0.1,  30), new THREE.Vector3( 28, -0.1,  10),
    new THREE.Vector3( 26, -0.1, -10), new THREE.Vector3( 18, -0.1, -22),
    new THREE.Vector3(  8, -0.1, -30), new THREE.Vector3( -5, -0.1, -28),
  ];
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints, false);
  const RIVER_SEG = 60, RIVER_W = 5.5;
  const rPos = [], rUV = [], rIdx = [];

  for(let i = 0; i <= RIVER_SEG; i++){
    const t0 = i / RIVER_SEG, t1 = Math.min((i + 0.01) / RIVER_SEG, 1);
    const p = riverCurve.getPoint(t0), p2 = riverCurve.getPoint(t1);
    const tan = new THREE.Vector3().subVectors(p2, p).normalize();
    if(tan.length() < 0.001) tan.set(1,0,0);
    const norm = new THREE.Vector3(-tan.z, 0, tan.x);
    const L = p.clone().addScaledVector(norm, -RIVER_W * 0.5);
    const R = p.clone().addScaledVector(norm,  RIVER_W * 0.5);
    rPos.push(L.x, -0.1, L.z, R.x, -0.1, R.z);
    rUV.push(0, t0 * 8, 1, t0 * 8);
    if(i < RIVER_SEG){ const b = i*2; rIdx.push(b, b+1, b+2, b+1, b+3, b+2); }
  }

  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rPos), 3));
  rGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(rUV), 2));
  rGeo.setIndex(rIdx); rGeo.computeVertexNormals();

  const riverMesh = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({
    color: 0x2255ff, emissive: 0x001144, emissiveIntensity: 0.4,
    roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.82, side: THREE.DoubleSide,
  }));
  riverMesh.receiveShadow = true;
  scene.add(riverMesh);
  window._riverMesh = riverMesh;

  [0.55, -0.55].forEach(side => {
    const foamPos = [], foamUV = [], foamIdx = [];
    for(let i = 0; i <= RIVER_SEG; i++){
      const t0 = i / RIVER_SEG, t1 = Math.min((i+0.01)/RIVER_SEG, 1);
      const p = riverCurve.getPoint(t0), p2 = riverCurve.getPoint(t1);
      const tan = new THREE.Vector3().subVectors(p2, p).normalize();
      if(tan.length() < 0.001) tan.set(1,0,0);
      const norm = new THREE.Vector3(-tan.z, 0, tan.x);
      const inner = p.clone().addScaledVector(norm, side * RIVER_W * 0.5);
      const outer = p.clone().addScaledVector(norm, side * (RIVER_W * 0.5 + 0.8));
      foamPos.push(inner.x,-0.05,inner.z, outer.x,-0.05,outer.z);
      foamUV.push(0,t0*6, 1,t0*6);
      if(i<RIVER_SEG){ const b=i*2; foamIdx.push(b,b+1,b+2,b+1,b+3,b+2); }
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(foamPos),3));
    fg.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(foamUV),2));
    fg.setIndex(foamIdx); fg.computeVertexNormals();
    scene.add(new THREE.Mesh(fg, new THREE.MeshStandardMaterial({
      color:0xffffff, emissive:0xaaddff, emissiveIntensity:0.5,
      transparent:true, opacity:0.65, roughness:0.9,
    })));
  });

  const WATER_PARTS = 120;
  const wpPos = new Float32Array(WATER_PARTS * 3);
  const wpData = [];
  for(let i = 0; i < WATER_PARTS; i++){
    const t = Math.random(), p = riverCurve.getPoint(t);
    const off = (Math.random() - 0.5) * RIVER_W * 0.8;
    wpPos[i*3] = p.x + off; wpPos[i*3+1] = 0.15 + Math.random() * 0.3; wpPos[i*3+2] = p.z;
    wpData.push({ t, off, speed: 0.004 + Math.random() * 0.006 });
  }
  const wpGeo = new THREE.BufferGeometry();
  wpGeo.setAttribute('position', new THREE.BufferAttribute(wpPos, 3));
  const wpMesh = new THREE.Points(wpGeo, new THREE.PointsMaterial({
    color: 0x88ccff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false,
  }));
  scene.add(wpMesh);
  window._riverParticles = { mesh: wpMesh, data: wpData, curve: riverCurve, W: RIVER_W };

  const riverLight = new THREE.PointLight(0x2255ff, 2.5, 18);
  riverLight.position.set(22, 2, 5);
  scene.add(riverLight);
  window._riverLight = riverLight;
})();

/* ══════════════════════════════════════════════════════════════
   3. JEEP
══════════════════════════════════════════════════════════════ */

const car = new THREE.Group();
scene.add(car);

const carGlow = new THREE.PointLight(0xff6600, 0, 7);
carGlow.position.set(0, 0.1, 0);
car.add(carGlow);

const C = {
  body:   0x8b1a1a, body2:  0x5a0f0f, dark:   0x111118,
  chrome: 0xb0b8c8, amber:  0xffaa00, amberG: 0xff8800,
  rubber: 0x0d0d12, glass:  0x0a1a2e, accent: 0xff3300,
};

const M  = (c,r=0.4,m=0,e=0,ei=0) => new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e,emissiveIntensity:ei});
const MT = (c,op=0.5) => new THREE.MeshStandardMaterial({color:c,transparent:true,opacity:op,roughness:0.05,metalness:0.3});

const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 4.0), M(C.body2,0.6,0.1));
chassis.position.y = 0.5; chassis.castShadow = true; car.add(chassis);
const skid = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.06,1.1), M(C.chrome,0.3,0.85));
skid.position.set(0,0.39,-1.55); car.add(skid);

const body = new THREE.Mesh(new THREE.BoxGeometry(1.95,0.72,3.6), M(C.body,0.35,0.08));
body.position.y = 0.97; body.castShadow = true; car.add(body);
const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.14,1.45), M(C.body2,0.4,0.1));
hood.position.set(0,1.34,-1.0); hood.castShadow=true; car.add(hood);
const hoodBulge = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.1,1.3), M(C.dark,0.5,0.05));
hoodBulge.position.set(0,1.42,-1.0); car.add(hoodBulge);
for(let i=0;i<4;i++){
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.02,0.06), M(0x222228,0.8));
  slot.position.set(0,1.475,-1.35+i*0.2); car.add(slot);
}
const roof = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.1,1.7), M(C.dark,0.4,0.05));
roof.position.set(0,1.83,0.25); roof.castShadow=true; car.add(roof);

[[-1.06,-0.85],[1.06,-0.85],[-1.06,0.88],[1.06,0.88]].forEach(([x,z])=>{
  const fg = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.35,1.05), M(C.dark,0.55,0.05));
  fg.position.set(x,0.78,z); fg.castShadow=true; car.add(fg);
});

[[-0.85],[0.85]].forEach(([x])=>{
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.75,0.07), M(C.dark,0.3,0.4));
  post.position.set(x,1.56,0.78); car.add(post);
});
const rbar = new THREE.Mesh(new THREE.BoxGeometry(1.72,0.07,0.07), M(C.dark,0.3,0.4));
rbar.position.set(0,1.93,0.78); car.add(rbar);
const rdiag = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.8), M(C.dark,0.3,0.4));
rdiag.position.set(0,1.74,0.4); rdiag.rotation.x=0.55; car.add(rdiag);

const ws = new THREE.Mesh(new THREE.BoxGeometry(1.75,0.6,0.07), MT(C.glass,0.5));
ws.position.set(0,1.56,-0.22); ws.rotation.x=0.2; car.add(ws);
const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(1.82,0.65,0.04), M(C.dark,0.4,0.1));
wsFrame.position.set(0,1.56,-0.19); wsFrame.rotation.x=0.2; car.add(wsFrame);
[-0.99,0.99].forEach(x=>{
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.38,0.85), MT(C.glass,0.4));
  win.position.set(x,1.56,0.3); car.add(win);
});

const bump = new THREE.Mesh(new THREE.BoxGeometry(2.1,0.28,0.15), M(C.dark,0.4,0.15));
bump.position.set(0,0.56,-2.08); bump.castShadow=true; car.add(bump);
[[-0.7],[0.7]].forEach(([x])=>{
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.42,0.22), M(C.dark,0.45,0.1));
  plate.position.set(x,0.58,-2.04); car.add(plate);
});
[[-0.88],[0.88]].forEach(([x])=>{
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.25,8), M(C.chrome,0.3,0.8));
  hook.rotation.x=Math.PI/2; hook.position.set(x,0.42,-2.18); car.add(hook);
});

const WHEEL_R = 0.52, WHEEL_W = 0.38;
const wheelMeshes = [], frontPivots = [];

function buildWheel(){
  const wg = new THREE.Group();
  wg.rotation.z = Math.PI/2;
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,WHEEL_W,28), M(C.rubber,0.95));
  tire.castShadow=true; wg.add(tire);
  for(let b=0;b<5;b++){
    const band = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R+0.012,WHEEL_R+0.012,0.032,24), M(0x0a0a10,0.98));
    band.position.y=-WHEEL_W*0.35+b*(WHEEL_W*0.18); wg.add(band);
  }
  for(let i=0;i<6;i++){
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055,WHEEL_R*0.78,0.045), M(C.chrome,0.2,0.9));
    spoke.rotation.z=(i/6)*Math.PI*2; wg.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,WHEEL_W+0.01,12), M(C.chrome,0.2,0.95));
  wg.add(hub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R*0.58,0.018,8,24), M(C.amber,0.15,0.2,C.amber,0.5));
  wg.add(ring);
  for(let i=0;i<6;i++){
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.06,6), M(C.chrome,0.2,0.9));
    const ang=(i/6)*Math.PI*2;
    nut.position.set(Math.cos(ang)*0.16,0,Math.sin(ang)*0.16);
    nut.position.y=WHEEL_W*0.52; wg.add(nut);
  }
  return wg;
}

[[1.18,-1.28],[-1.18,-1.28]].forEach(([x,z])=>{
  const pivot = new THREE.Group();
  pivot.position.set(x, WHEEL_R, z);
  const wg = buildWheel();
  pivot.add(wg); car.add(pivot);
  frontPivots.push(pivot);
  wheelMeshes.push(wg);
});
[[1.18,1.28],[-1.18,1.28]].forEach(([x,z])=>{
  const wg = buildWheel();
  wg.position.set(x, WHEEL_R, z);
  car.add(wg); wheelMeshes.push(wg);
});

[-0.63,0.63].forEach(x=>{
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.58,0.26,0.1), M(C.dark,0.3,0.15));
  house.position.set(x,1.0,-2.07); car.add(house);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,0.05), M(C.amber,0.05,0.1,C.amber,3.5));
  lens.position.set(x,1.0,-2.11); car.add(lens);
  const fl = new THREE.SpotLight(0xffcc44,6,22,Math.PI*0.13,0.55);
  fl.position.set(x,1.0,-2.2); fl.target.position.set(x*0.4,0,-14);
  car.add(fl); car.add(fl.target);
  const halo = new THREE.PointLight(C.amberG,1.2,4.5);
  halo.position.set(x,1.0,-2.15); car.add(halo);
});

const drl = new THREE.Mesh(new THREE.BoxGeometry(1.26,0.055,0.04), M(C.accent,0.1,0.1,C.accent,4.0));
drl.position.set(0,0.82,-2.1); car.add(drl);

const ledCase = new THREE.Mesh(new THREE.BoxGeometry(1.4,0.14,0.18), M(C.dark,0.35,0.2));
ledCase.position.set(0,2.0,-0.22); car.add(ledCase);
for(let i=0;i<4;i++){
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.1,0.06), M(C.amber,0.05,0.05,C.amber,4.5));
  cell.position.set(-0.45+i*0.3,2.0,-0.32); car.add(cell);
  const sl = new THREE.SpotLight(0xffcc44,2.5,18,Math.PI*0.12,0.6);
  sl.position.set(-0.45+i*0.3,2.0,-0.36); sl.target.position.set(-0.45+i*0.3*0.3,0,-12);
  car.add(sl); car.add(sl.target);
}

[-0.65,0.65].forEach(x=>{
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.14,0.04), M(0xff1100,0.1,0.05,0xff1100,2.0));
  rl.position.set(x,0.98,2.08); car.add(rl);
  const rpt = new THREE.PointLight(0xff2200,1.2,5);
  rpt.position.set(x,0.98,2.2); car.add(rpt);
});

console.log('%c🚙 Jeep listo', 'color:#ffaa00;font-weight:bold');

/* ── 4. COLLIDERS ─────────────────────────────────────────── */
const _pendingColliders = [];
function addCollider(x, z, r){ _pendingColliders.push({x, z, r}); }

/* ══════════════════════════════════════════════════════════
   5. MUNDO — Árboles, Rocas, Partículas
══════════════════════════════════════════════════════════ */

window._trees = [];

function makeTree(x, z, s=1, type=-1){
  const kind = type >= 0 ? type : Math.floor(Math.random() * 4);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.windPhase  = Math.random() * Math.PI * 2;
  g.userData.windSpeed  = 0.6 + Math.random() * 0.8;
  g.userData.treeScale  = s;

  const trunkColor = [0x5c2e08, 0x3a2208, 0x6b2a10, 0x4a3010][kind];
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14*s, 0.22*s, (1.4 + kind*0.3)*s, 7),
    new THREE.MeshStandardMaterial({ color:trunkColor, roughness:0.95 })
  );
  trunk.position.y = (0.7 + kind*0.15)*s; trunk.castShadow = true; g.add(trunk);

  if(kind === 0){
    const colors = [0xdd6611, 0xe07720, 0xcc5500, 0xf08830];
    [{ry:2.1,rs:1.4,dx:0,dz:0},{ry:2.6,rs:1.0,dx:0.8,dz:0.3},{ry:2.4,rs:0.9,dx:-0.7,dz:0.2},{ry:3.1,rs:0.75,dx:0.1,dz:-0.5}]
    .forEach(({ry,rs,dx,dz},i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(rs*s,7,5),
        new THREE.MeshStandardMaterial({color:colors[i],roughness:0.8,emissive:colors[i],emissiveIntensity:0.05}));
      l.position.set(dx*s,ry*s,dz*s); l.castShadow=true; g.add(l);
    });
  } else if(kind === 1){
    [[0,1.5,1.6],[0,2.8,1.2],[0,3.8,0.85]].forEach(([dx,ry,rs]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rs*s,2.0*s,7),
        new THREE.MeshStandardMaterial({color:0x224422,roughness:0.85,emissive:0x112211,emissiveIntensity:0.08}));
      cone.position.set(dx*s,ry*s,0); cone.castShadow=true; g.add(cone);
    });
  } else if(kind === 2){
    const flowerColors = [0xff44aa,0xcc2288,0xff66cc,0xee3399];
    [{ry:1.8,rs:1.6,dx:0,dz:0},{ry:2.2,rs:1.1,dx:0.9,dz:0},{ry:2.2,rs:1.1,dx:-0.9,dz:0},{ry:2.5,rs:0.9,dx:0,dz:0.8}]
    .forEach(({ry,rs,dx,dz},i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(rs*s,6,5),
        new THREE.MeshStandardMaterial({color:flowerColors[i],roughness:0.75,emissive:flowerColors[i],emissiveIntensity:0.08}));
      l.position.set(dx*s,ry*s,dz*s); l.castShadow=true; g.add(l);
    });
  } else {
    const yColors = [0xddaa00,0xffcc22,0xcc9900,0xeebb11];
    [{ry:2.0,rw:2.4,rh:1.8,dx:0,dz:0},{ry:3.2,rw:1.8,rh:1.4,dx:0.3,dz:0.2},{ry:2.6,rw:1.4,rh:1.2,dx:-0.5,dz:0.3}]
    .forEach(({ry,rw,rh,dx,dz},i) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(rw*s,rh*s,rw*s*0.85),
        new THREE.MeshStandardMaterial({color:yColors[i],roughness:0.8,emissive:yColors[i],emissiveIntensity:0.06}));
      l.position.set(dx*s,ry*s,dz*s); l.rotation.y=Math.random()*Math.PI; l.castShadow=true; g.add(l);
    });
  }

  const LEAF_N = 18;
  const leafPos = new Float32Array(LEAF_N * 3);
  const leafData = [];
  for(let i = 0; i < LEAF_N; i++){
    const angle = Math.random()*Math.PI*2, radius = 0.5+Math.random()*1.8*s;
    leafPos[i*3] = Math.cos(angle)*radius; leafPos[i*3+1] = 1.5*s+Math.random()*2.5*s; leafPos[i*3+2] = Math.sin(angle)*radius;
    leafData.push({angle, radius, speed:0.3+Math.random()*0.5, yOff:Math.random()*Math.PI*2});
  }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  const leafColors = [[0xffaa44,0xff8822,0xffcc66,0xff6633],[0x44ff88,0x22dd66,0x55ee99,0x33cc77],[0xff88cc,0xff44aa,0xffaadd,0xee3399],[0xffdd22,0xffbb00,0xffee55,0xddaa00]][kind];
  const leafPts = new THREE.Points(leafGeo, new THREE.PointsMaterial({
    color:leafColors[Math.floor(Math.random()*leafColors.length)],size:0.18*s,sizeAttenuation:true,transparent:true,opacity:0.85,depthWrite:false,
  }));
  g.add(leafPts);
  g.userData.leafPts  = leafPts;
  g.userData.leafData = leafData;
  scene.add(g); window._trees.push(g);
  addCollider(x, z, (kind===1 ? 0.3 : 0.5)*s);
  return g;
}

function makeRock(x, z, s=1) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const rockColors = [0x7a6a55,0x6a5a8a,0x8a7060,0x5a6a7a];
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6*s, 0),
    new THREE.MeshStandardMaterial({color:rockColors[Math.floor(Math.random()*rockColors.length)],roughness:1,metalness:0.05}));
  r.scale.y=0.5; r.rotation.y=Math.random()*Math.PI; r.position.y=0.18*s; r.castShadow=r.receiveShadow=true;
  const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3*s, 0), r.material.clone());
  r2.scale.y=0.55; r2.rotation.y=Math.random()*Math.PI; r2.position.set(0.5*s,0.1*s,0.3*s);
  g.add(r); g.add(r2); scene.add(g);
  addCollider(x, z, 0.55*s);
}

function isPointOnTrack(x, z, margin = 4.0) {
  if (!window._trackCurve) return false;
  const curve = window._trackCurve;
  let minDist = Infinity;
  for (let i = 0; i <= 100; i++) {
    const p = curve.getPoint(i / 100);
    const dx = p.x - x, dz = p.z - z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < minDist) minDist = dist;
  }
  return minDist < margin;
}

function getValidPosition(avoidRadius = 4.0, maxAttempts = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random()*Math.PI*2, radius = 10+Math.random()*40;
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
    if (!isPointOnTrack(x, z, avoidRadius)) return { x, z, valid: true };
  }
  return { x: 999, z: 999, valid: false };
}

for (let i = 0; i < 30; i++) {
  const pos = getValidPosition(5.0);
  if (pos.valid) makeTree(pos.x, pos.z, 0.8+Math.random()*0.8, [0,1,2,3][Math.floor(Math.random()*4)]);
}
for (let i = 0; i < 12; i++) {
  const pos = getValidPosition(5.5);
  if (pos.valid) makeRock(pos.x, pos.z, 0.7+Math.random()*0.8);
}
[{x:-14,z:-10,type:2,scale:1.2},{x:16,z:-8,type:1,scale:1.4},{x:2,z:-24,type:0,scale:1.3},{x:-6,z:14,type:3,scale:1.1}]
.forEach(spot => {
  const angle = Math.random()*Math.PI*2;
  makeTree(spot.x+Math.cos(angle)*3, spot.z+Math.sin(angle)*3, spot.scale, spot.type);
});

/* ── 6. PASTO GLB ─────────────────────────────────────────── */
function spawnGrass(model) {
  model.traverse(c => {
    if (!c.isMesh) return;
    c.castShadow = false; c.receiveShadow = true;
    if (c.material) { c.material.side = THREE.DoubleSide; c.material.alphaTest = 0.2; }
  });
  let placed = 0;
  for (let attempt = 0; attempt < 1000 && placed < GRASS_CFG.COUNT; attempt++) {
    const angle = Math.random()*Math.PI*2, radius = 8+Math.random()*42;
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
    if (!isPointOnTrack(x, z, 4.5)) {
      const clone = model.clone();
      clone.position.set(x, 0, z); clone.rotation.y = Math.random()*Math.PI*2;
      const s = GRASS_CFG.MIN_SCALE + Math.random()*(GRASS_CFG.MAX_SCALE - GRASS_CFG.MIN_SCALE);
      clone.scale.setScalar(s); scene.add(clone); placed++;
    }
  }
  console.log(`%c🌿 ${placed} mechones de pasto`, 'color:#4a8c2a');
}

function buildFallbackGrass() {
  console.warn('⚠ grass.glb no encontrado — pasto procedural');
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([-0.3,0,0.3, 0.3,0,-0.3, 0.3,0.8,-0.3, -0.3,0,0.3, 0.3,0.8,-0.3, -0.3,0.8,0.3, -0.3,0,-0.3, 0.3,0,0.3, 0.3,0.8,0.3, -0.3,0,-0.3, 0.3,0.8,0.3, -0.3,0.8,-0.3]);
  const uv = new Float32Array([0,0,1,0,1,1, 0,0,1,1,0,1, 0,0,1,0,1,1, 0,0,1,1,0,1]);
  geo.setAttribute('position', new THREE.BufferAttribute(v,3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  geo.computeVertexNormals();
  const colors = [0x2d6e1a,0x3a8c22,0x4aa830,0x5db83a,0x6ec848];
  const perMesh = Math.floor(GRASS_CFG.COUNT/colors.length);
  const meshes = colors.map(c => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({color:c,side:THREE.DoubleSide,alphaTest:0.1,roughness:1}), perMesh);
    scene.add(m); return m;
  });
  window._grassMeshes = meshes;
  const d = new THREE.Object3D();
  meshes.forEach((m) => {
    for (let i=0;i<perMesh;i++){
      const a=Math.random()*Math.PI*2, r=3+Math.pow(Math.random(),0.5)*GRASS_CFG.SPREAD, s=0.6+Math.random()*1.0;
      d.position.set(Math.cos(a)*r,0,Math.sin(a)*r); d.rotation.y=Math.random()*Math.PI*2;
      d.scale.set(s,s*(0.9+Math.random()*0.4),s); d.updateMatrix(); m.setMatrixAt(i,d.matrix);
    }
    m.instanceMatrix.needsUpdate=true;
  });
}

(function loadGrass() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  s.onload = () => { new THREE.GLTFLoader().load(GRASS_CFG.GLB_PATH, gltf => spawnGrass(gltf.scene), null, () => buildFallbackGrass()); };
  s.onerror = () => buildFallbackGrass();
  document.head.appendChild(s);
})();

/* ── 7. CHECKPOINTS + ROCOLA ──────────────────────────────── */
const cpObjects = [];

function makeLabel(text) {
  const cv = document.createElement('canvas');
  cv.width=512; cv.height=128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='rgba(20,10,4,0.8)';
  ctx.beginPath(); ctx.roundRect(8,8,496,112,20); ctx.fill();
  ctx.fillStyle='#f5e8d0'; ctx.font='bold 44px serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,256,64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
  sp.scale.set(4.5,1.1,1);
  return sp;
}

CHECKPOINTS.forEach(cfg => {
  const g = new THREE.Group();
  g.position.set(cfg.x,0,cfg.z);
  scene.add(g);

  if (cfg.isJukebox) {
    buildJukebox(g, cfg.color);
    cpObjects.push({cfg,cube:null,mat:null,triggered:false,wasInRange:false,isJukebox:true});
    addCollider(cfg.x, cfg.z, 1.2);
    return;
  }

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,0.3,16),
    new THREE.MeshStandardMaterial({color:0x2e1608,roughness:0.8}));
  base.position.y=0.15; base.castShadow=base.receiveShadow=true; g.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,2.8,10),
    new THREE.MeshStandardMaterial({color:0x3d2010,roughness:0.7}));
  col.position.y=1.7; col.castShadow=true; g.add(col);
  const mat = new THREE.MeshStandardMaterial({color:cfg.color,emissive:cfg.emissive,emissiveIntensity:0.8,roughness:0.2,metalness:0.4});
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),mat);
  cube.position.y=3.6; cube.castShadow=true; g.add(cube);
  const pt = new THREE.PointLight(cfg.color,2.2,16); pt.position.y=3.8; g.add(pt);
  const lbl = makeLabel(cfg.icon+' '+cfg.label); lbl.position.set(0,5.4,0); g.add(lbl);
  cpObjects.push({cfg,cube,mat,triggered:false,wasInRange:false,isJukebox:false});
});

function buildJukebox(parent, color) {
  const mb = new THREE.MeshStandardMaterial({color:0x1a0a2e,roughness:0.3,metalness:0.6});
  const ma = new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.6,roughness:0.2,metalness:0.5});
  const mg = new THREE.MeshStandardMaterial({color:0x88aaff,roughness:0,metalness:1,transparent:true,opacity:0.5});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.6,2.4,0.9),mb);
  body.position.y=1.2; body.castShadow=true; parent.add(body);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.9,16,1,false,0,Math.PI),mb);
  top.position.set(0,2.4,0); top.rotation.z=Math.PI/2; top.rotation.y=Math.PI/2; parent.add(top);
  const screen=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.9,0.05),mg);
  screen.position.set(0,1.6,0.48); parent.add(screen);
  [-0.5,0,0.5].forEach(x => {
    const s=new THREE.Mesh(new THREE.BoxGeometry(0.08,2.2,0.02),ma);
    s.position.set(x,1.2,0.46); parent.add(s);
  });
  [[-0.3,0.7],[0,0.7],[0.3,0.7]].forEach(([bx,by]) => {
    const btn=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.06,10),
      new THREE.MeshStandardMaterial({color:0xff4466,emissive:0x880022,emissiveIntensity:0.8}));
    btn.position.set(bx,by,0.48); btn.rotation.x=Math.PI/2; parent.add(btn);
  });
  const pt=new THREE.PointLight(color,3,18); pt.position.set(0,2,1); parent.add(pt);
  window._jukeboxLight=pt;
  const lbl=makeLabel('🎵 La Rocola'); lbl.position.set(0,4,0); parent.add(lbl);
}

/* ── 8. VIENTO ────────────────────────────────────────────── */
const WIND_COUNT = 200;
const windPos = new Float32Array(WIND_COUNT*3);
const windSpd = [];
for (let i=0;i<WIND_COUNT;i++){
  windPos[i*3]=(Math.random()-0.5)*80; windPos[i*3+1]=Math.random()*3; windPos[i*3+2]=(Math.random()-0.5)*80;
  windSpd.push(0.5+Math.random()*1.5);
}
const windGeo = new THREE.BufferGeometry();
windGeo.setAttribute('position',new THREE.BufferAttribute(windPos,3));
const windPts = new THREE.Points(windGeo,
  new THREE.PointsMaterial({color:0xddccaa,size:0.12,sizeAttenuation:true,transparent:true,opacity:0.45,depthWrite:false}));
scene.add(windPts);

function updateWind(dt) {
  const pos = windGeo.attributes.position.array;
  const tt = Date.now()*0.0002, wx = Math.cos(tt)*8, wz = Math.sin(tt*0.7)*4;
  for (let i=0;i<WIND_COUNT;i++){
    const s=windSpd[i];
    pos[i*3]+=wx*s*dt; pos[i*3+1]+=0.3*s*dt; pos[i*3+2]+=wz*s*dt;
    if(pos[i*3]> 40)pos[i*3]=-40; if(pos[i*3]<-40)pos[i*3]=40;
    if(pos[i*3+1]>4)pos[i*3+1]=0.1;
    if(pos[i*3+2]> 40)pos[i*3+2]=-40; if(pos[i*3+2]<-40)pos[i*3+2]=40;
  }
  windGeo.attributes.position.needsUpdate=true;
}

(function(){
  const n=180,r=55,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){pos[i*3]=(Math.random()-0.5)*r;pos[i*3+1]=Math.random()*12;pos[i*3+2]=(Math.random()-0.5)*r;}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xc9963c,size:0.06,sizeAttenuation:true,transparent:true,opacity:0.4,depthWrite:false}));
  scene.add(pts); window._dustPts=pts;
})();

/* ── 9. TECLADO ───────────────────────────────────────────── */
const keys = new Set();
window.addEventListener('keydown', e=>{
  keys.add(e.key);
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>keys.delete(e.key));
const pressing = (...k) => k.some(x=>keys.has(x));
const fwd  = () => pressing('ArrowUp',   'w','W');
const bwd  = () => pressing('ArrowDown', 's','S');
const left = () => pressing('ArrowLeft', 'a','A');
const right= () => pressing('ArrowRight','d','D');
const openK= () => pressing('e','E');
const jumpK= () => pressing(' ');

/* ── 10. AUDIO ────────────────────────────────────────────── */
let _actx=null;
const actx=()=>_actx||(_actx=new(AudioContext||webkitAudioContext)());
function tone(freq,dur,type='sine',vol=0.18){
  try{const c=actx(),o=c.createOscillator(),g=c.createGain();
    o.connect(g);g.connect(c.destination);o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
    o.start();o.stop(c.currentTime+dur);}catch(_){}
}
const sfxProx=()=>tone(660,0.18,'sine',0.14);
const sfxOpen=()=>{tone(523,0.1,'triangle',0.13);setTimeout(()=>tone(784,0.2,'triangle',0.13),90);};

let jbOsc=null;
function startJukeboxSong(idx){
  stopJukeboxSong();
  const freqs=[[261,329,392,523],[220,277,330,440],[196,247,294,392],[174,220,261,349]][idx%4];
  try{const c=actx();
    const jg=c.createGain(); jg.gain.value=0.12; jg.connect(c.destination);
    let beat=0;
    const play=()=>{const o=c.createOscillator(),g=c.createGain();
      o.connect(g);g.connect(jg);o.type='triangle';o.frequency.value=freqs[beat%freqs.length];
      g.gain.setValueAtTime(0.5,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.35);
      o.start();o.stop(c.currentTime+0.4);beat++;};
    play(); jbOsc=setInterval(play,400);
  }catch(_){}
}
function stopJukeboxSong(){if(jbOsc){clearInterval(jbOsc);jbOsc=null;}}

/* ── 11. MODALES + ROCOLA ─────────────────────────────────── */
let currentModal=null, discovered=0;
const discEl=document.getElementById('disc-count');
const hintEl=document.getElementById('proximity-hint');

function openModal(id){
  if(currentModal===id)return;
  if(currentModal)closeModal(currentModal);
  currentModal=id;
  const el=document.getElementById(id); if(!el)return;
  el.classList.add('open'); el.setAttribute('aria-hidden','false');
  sfxOpen();
  if(id==='modal-3')typewrite();
  if(id==='jukebox')openJukebox();
}
function closeModal(id){
  const el=document.getElementById(id); if(!el)return;
  gsap.to(el,{opacity:0,duration:0.25,ease:'power2.in',onComplete:()=>{
    el.classList.remove('open'); el.setAttribute('aria-hidden','true');
    gsap.set(el,{clearProps:'opacity'});
  }});
  if(currentModal===id)currentModal=null;
  if(id==='jukebox'){stopJukeboxSong();jukeboxOpen=false;}
}
document.querySelectorAll('.modal-close').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.modal)));
document.querySelectorAll('.modal-backdrop').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)closeModal(el.id);}));
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&currentModal)closeModal(currentModal);
  if(jukeboxOpen){if(e.key==='ArrowLeft')changeSong(-1);if(e.key==='ArrowRight')changeSong(+1);}
});

function openJukebox(){jukeboxOpen=true;updateJukeboxUI();startJukeboxSong(currentSong);}
function changeSong(dir){
  currentSong=(currentSong+dir+SONGS.length)%SONGS.length;
  updateJukeboxUI(); startJukeboxSong(currentSong); tone(440+currentSong*110,0.15,'sine',0.1);
}
function updateJukeboxUI(){
  const n=document.getElementById('jukebox-song-name');
  if(n)n.textContent=SONGS[currentSong].title;
  document.querySelectorAll('.jukebox-dot').forEach((d,i)=>{
    d.classList.toggle('active',i===currentSong);
    d.style.background=i===currentSong?SONGS[currentSong].color:'';
  });
}
document.addEventListener('click',e=>{
  if(e.target.id==='jukebox-prev')changeSong(-1);
  if(e.target.id==='jukebox-next')changeSong(+1);
});

let twTimer=null;
function typewrite(){
  const el=document.getElementById('typewriter-out'); if(!el)return;
  el.textContent=''; el.classList.remove('done'); let i=0; clearInterval(twTimer);
  twTimer=setInterval(()=>{
    if(i<CARTA_TEXTO.length)el.textContent+=CARTA_TEXTO[i++];
    else{clearInterval(twTimer);el.classList.add('done');}
  },36);
}
function finalScreen(){
  setTimeout(()=>{
    document.getElementById('final-screen').classList.remove('hidden');
    const cont=document.getElementById('final-hearts');
    ['💛','🌻','💫','✨','🌼','💕'].forEach(em=>{
      for(let j=0;j<4;j++){
        const h=document.createElement('span');
        h.className='heart-float'; h.textContent=em;
        h.style.setProperty('--l',Math.random()*100+'%');
        h.style.setProperty('--d',(3+Math.random()*5)+'s');
        h.style.setProperty('--del',Math.random()*3+'s');
        cont.appendChild(h);
      }
    });
  },600);
}
document.getElementById('replay-btn').addEventListener('click',()=>location.reload());

/* ══════════════════════════════════════════════════════════════
   12. FÍSICA — Sistema limpio, estable, Bruno Simon-like
   ─────────────────────────────────────────────────────────────
   CÓMO FUNCIONA EL DERRAPE:
   El carro tiene una velocidad "world space" (velX, velZ).
   En cada frame separamos esa velocidad en dos componentes:
     • longitudinal: cuánto va hacia adelante/atrás (dirección del carro)
     • lateral:      cuánto va de lado (el "derrape")
   Luego aplicamos "grip" solo a la componente lateral:
     velLateral *= (1 - grip * 60 * dt)
   → grip = 1.0: agarre perfecto, nunca derrapa
   → grip = 0.8: derrapa un poco (como en Bruno Simon)
   → grip = 0.5: hielo, derrapa muchísimo
   La velocidad longitudinal se frena normalmente con friction.
══════════════════════════════════════════════════════════════ */

const clock = new THREE.Clock();

/* ══════════════════════════════════════════════════════════════
   CÁMARA DE ÓRBITA — Click derecho para rotar libremente
   ─────────────────────────────────────────────────────────────
   Sistema de dos modos:
   • Modo SEGUIMIENTO (default): cámara detrás del carro, sigue su dirección
   • Modo ÓRBITA (click derecho): el usuario arrastra para ver cualquier ángulo
   
   Cuando sueltas el click derecho, la cámara hace lerp suave
   de vuelta a la posición de seguimiento.
══════════════════════════════════════════════════════════════ */
const camOrbit = {
  active:   false,   // ¿está el usuario arrastrando ahora mismo?
  theta:    0,       // ángulo horizontal de órbita (rad) — relativo al carro
  phi:      0.4,     // ángulo vertical de órbita (rad) — 0=horizontal, π/2=desde arriba
  prevX:    0,       // posición mouse anterior (para delta)
  prevY:    0,
  returning:false,   // ¿está volviendo a la posición de seguimiento?
  returnT:  0,       // progreso del retorno (0→1)
};

// Sensibilidad del arrastre
const ORB_SENSITIVITY = 0.006;
const ORB_PHI_MIN     = 0.15;   // no bajar demasiado (no ver desde el suelo)
const ORB_PHI_MAX     = 1.35;   // no subir demasiado (no ver desde el cielo puro)

canvas.addEventListener('contextmenu', e => e.preventDefault()); // quitar menú contextual

canvas.addEventListener('mousedown', e => {
  if (e.button === 2) { // click derecho
    camOrbit.active    = true;
    camOrbit.returning = false;
    camOrbit.prevX     = e.clientX;
    camOrbit.prevY     = e.clientY;
    canvas.style.cursor = 'grabbing';
  }
});

window.addEventListener('mousemove', e => {
  if (!camOrbit.active) return;
  const dx = e.clientX - camOrbit.prevX;
  const dy = e.clientY - camOrbit.prevY;
  camOrbit.prevX = e.clientX;
  camOrbit.prevY = e.clientY;

  camOrbit.theta -= dx * ORB_SENSITIVITY;
  camOrbit.phi   += dy * ORB_SENSITIVITY;
  camOrbit.phi    = Math.max(ORB_PHI_MIN, Math.min(ORB_PHI_MAX, camOrbit.phi));
});

window.addEventListener('mouseup', e => {
  if (e.button === 2 && camOrbit.active) {
    camOrbit.active    = false;
    camOrbit.returning = true;
    camOrbit.returnT   = 0;
    canvas.style.cursor = '';
  }
});

// También soporte táctil para mobile (dos dedos = órbita)
let _touchOrbit = null;
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    _touchOrbit = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    camOrbit.active = true; camOrbit.returning = false;
    e.preventDefault();
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && _touchOrbit) {
    const dx = e.touches[0].clientX - _touchOrbit.x;
    const dy = e.touches[0].clientY - _touchOrbit.y;
    _touchOrbit = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    camOrbit.theta -= dx * ORB_SENSITIVITY * 1.5;
    camOrbit.phi   += dy * ORB_SENSITIVITY * 1.5;
    camOrbit.phi    = Math.max(ORB_PHI_MIN, Math.min(ORB_PHI_MAX, camOrbit.phi));
    e.preventDefault();
  }
}, { passive: false });
canvas.addEventListener('touchend', e => {
  if (e.touches.length < 2 && camOrbit.active) {
    camOrbit.active = false; camOrbit.returning = true; camOrbit.returnT = 0; _touchOrbit = null;
  }
});

// ── Vectores reutilizables (sin new en el loop) ─────────────
const _camPos  = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _fwdDir  = new THREE.Vector3();
const _latDir  = new THREE.Vector3();
const _car2D   = new THREE.Vector2();
const _cp2D    = new THREE.Vector2();

let gameOn = false, lastOpen = false, closestCp = null;

// ── ESTADO FÍSICO ────────────────────────────────────────────
const state = {
  // Velocidad en world space (XZ)
  velX: 0,
  velZ: 0,

  // Vertical
  velY:     0,
  onGround: true,

  // Orientación
  yaw:      0,  // rotación actual del carro (rad)
  steer:    0,  // ángulo del volante (-1 = izq, +1 = der)

  // Inclinación visual en curvas (cosmético, no afecta física)
  visualRoll: 0,
};

// ── RAYCASTER para detectar altura de la pista ──────────────
const _raycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDown   = new THREE.Vector3(0, -1, 0);

function getGroundY(worldX, worldZ, carY) {
  // Lanza un rayo hacia abajo desde la posición ACTUAL del carro (no desde arriba fijo)
  // Así, si el carro está DEBAJO de la pista, el rayo no detecta esa superficie
  // porque el origen del rayo ya está por debajo de ella
  _rayOrigin.set(worldX, carY + 0.5, worldZ); // 0.5 unidades sobre el carro
  _raycaster.set(_rayOrigin, _rayDown);

  if (window._trackCollision) {
    const hits = _raycaster.intersectObject(window._trackCollision);
    if (hits.length > 0) {
      const hitY = hits[0].point.y;
      // Solo considerar el suelo si está MUY CERCA del carro hacia abajo
      // Esto evita que detecte la pista elevada cuando estamos pasando por debajo
      if (hitY <= carY + 0.3) {
        return hitY;
      }
    }
  }
  return 0; // suelo plano de respaldo
}

/* ── LOOP PRINCIPAL ────────────────────────────────────────── */
function tick(){
  requestAnimationFrame(tick);
  renderer.render(scene, camera);
  if (!gameOn) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = Date.now() * 0.001;

  /* ════════════════════════════════════════════════════════
     FÍSICA — MOVIMIENTO
  ════════════════════════════════════════════════════════ */

  // 1. Dirección actual del carro
  const sinYaw = Math.sin(state.yaw);
  const cosYaw = Math.cos(state.yaw);

  // Velocidad total
  const speed = Math.sqrt(state.velX * state.velX + state.velZ * state.velZ);

  // ── GIRO (yaw) ────────────────────────────────────────────
  // El carro puede girar desde velocidades muy bajas
  // A más velocidad → gira un poco menos (comportamiento real)
  if (state.onGround) {
    // turnFactor: 0.35 en parado, 1.0 a velocidad máxima
    // Esto permite girar incluso lento, sin quedarse "clavado"
    const turnFactor = 0.35 + 0.65 * Math.min(speed / CFG.speed, 1.0);
    const turnRad = THREE.MathUtils.degToRad(CFG.turn) * dt * turnFactor;

    if (left())  state.yaw += turnRad;
    if (right()) state.yaw -= turnRad;
  }

  // ── VOLANTE (visual) ──────────────────────────────────────
  const targetSteer = left() ? 1 : right() ? -1 : 0;
  state.steer += (targetSteer - state.steer) * CFG.steerLerp * dt;

  // ── TRACCIÓN ──────────────────────────────────────────────
  if (state.onGround) {
    if (fwd()) {
      state.velX += -sinYaw * CFG.accel * dt;
      state.velZ += -cosYaw * CFG.accel * dt;
    }
    if (bwd()) {
      // Freno/marcha atrás: más fuerte si ya va hacia adelante (freno real)
      const isBraking = (state.velX * -sinYaw + state.velZ * -cosYaw) > 0;
      const force = isBraking ? CFG.brakeForce : CFG.accel * 0.5;
      state.velX -= -sinYaw * force * dt;
      state.velZ -= -cosYaw * force * dt;
    }
  }

  // ── LÍMITE DE VELOCIDAD ───────────────────────────────────
  if (speed > CFG.speed) {
    const scale = CFG.speed / speed;
    state.velX *= scale;
    state.velZ *= scale;
  }

  // ── DERRAPE (grip) ────────────────────────────────────────
  // Separamos la velocidad en componente longitudinal y lateral
  // Componente longitudinal: proyección sobre el eje del carro
  const fwdX = -sinYaw, fwdZ = -cosYaw; // dirección "adelante" del carro
  const latX =  cosYaw, latZ = -sinYaw; // dirección "lateral" del carro (perpendicular)

  // Cuánto de la velocidad va en cada dirección
  const velFwd = state.velX * fwdX + state.velZ * fwdZ; // escalar
  const velLat = state.velX * latX + state.velZ * latZ; // escalar

  // El grip reduce la velocidad lateral (el derrape)
  // Frame-rate independent: grip por segundo
  const gripFactor = Math.pow(CFG.grip, 60 * dt); // equivale a: velLat *= grip cada 1/60 s
  const newVelLat  = velLat * gripFactor;

  // Recombinar: la longitudinal no cambia, la lateral se reduce
  state.velX = fwdX * velFwd + latX * newVelLat;
  state.velZ = fwdZ * velFwd + latZ * newVelLat;

  // ── FRICCIÓN (desaceleración general) ─────────────────────
  // Frame-rate independent
  if (!fwd() && !bwd()) {
    // Sin input: fricción más agresiva (frena solo)
    const frictionFactor = Math.pow(1 - CFG.friction * 4, 60 * dt);
    state.velX *= frictionFactor;
    state.velZ *= frictionFactor;
  } else {
    // Con input: fricción normal (resistencia del aire)
    const frictionFactor = Math.pow(1 - CFG.friction, 60 * dt);
    state.velX *= frictionFactor;
    state.velZ *= frictionFactor;
  }

  // Parar completamente si la velocidad es muy baja
  const newSpeed = Math.sqrt(state.velX * state.velX + state.velZ * state.velZ);
  if (newSpeed < 0.05 && !fwd() && !bwd()) {
    state.velX = 0;
    state.velZ = 0;
  }

  // ── MOVER EN XZ ──────────────────────────────────────────
  car.position.x += state.velX * dt;
  car.position.z += state.velZ * dt;

  /* ════════════════════════════════════════════════════════
     FÍSICA — ALTURA (gravedad + pista elevada)
  ════════════════════════════════════════════════════════ */

  // Detectar altura del suelo bajo el carro
  const groundY = getGroundY(car.position.x, car.position.z, car.position.y);

  // Salto
  if (jumpK() && state.onGround) {
    state.velY     = CFG.jumpForce;
    state.onGround = false;
  }

  // Aplicar gravedad
  state.velY -= CFG.gravity * dt;

  // Mover vertical
  car.position.y += state.velY * dt;

  // Colisión con el suelo
  if (car.position.y <= groundY) {
    car.position.y = groundY;

    // Squash de aterrizaje solo en caídas fuertes
    if (state.velY < -5) {
      const impact = Math.min(Math.abs(state.velY) / CFG.jumpForce, 1);
      car.scale.set(1 + impact * 0.12, 1 - impact * 0.18, 1 + impact * 0.12);
      gsap.to(car.scale, {x:1,y:1,z:1, duration:0.25, ease:'elastic.out(1,0.5)'});
    }

    state.velY     = 0;
    state.onGround = true;
  } else {
    state.onGround = false;
  }

  /* ════════════════════════════════════════════════════════
     VISUAL — Inclinación en curvas (puro cosmético)
  ════════════════════════════════════════════════════════ */

  // La inclinación es proporcional a velocidad lateral (el "lean" real de un carro)
  const speedRatio = Math.min(newSpeed / CFG.speed, 1);
  const targetRoll = -state.steer * speedRatio * 0.08; // máximo ~4.5 grados
  state.visualRoll += (targetRoll - state.visualRoll) * 8 * dt;

  car.rotation.y = state.yaw;
  car.rotation.z = state.visualRoll;

  /* ════════════════════════════════════════════════════════
     COLISIONES CON OBSTÁCULOS
  ════════════════════════════════════════════════════════ */
  const CAR_R = 0.9;
  for (const col of _pendingColliders) {
    const dx = car.position.x - col.x;
    const dz = car.position.z - col.z;
    const d  = Math.sqrt(dx*dx + dz*dz);
    const md = CAR_R + col.r;
    if (d < md && d > 0.001) {
      const nx = dx/d, nz = dz/d;
      car.position.x += nx * (md - d);
      car.position.z += nz * (md - d);

      // Rebotar la componente de velocidad que apunta al obstáculo
      const dot = state.velX * nx + state.velZ * nz;
      if (dot < 0) {
        state.velX -= dot * nx * 1.4; // pequeño rebote
        state.velZ -= dot * nz * 1.4;
        // Perder algo de velocidad en el impacto
        state.velX *= 0.55;
        state.velZ *= 0.55;
        if (Math.abs(dot) > 3) tone(110 + Math.random()*40, 0.3, 'sawtooth', 0.08);
      }
    }
  }

  /* ════════════════════════════════════════════════════════
     SUSPENSIÓN VISUAL (bounce suave mientras rueda)
  ════════════════════════════════════════════════════════ */
  if (state.onGround && newSpeed > 1) {
    car.position.y += Math.sin(t * newSpeed * 1.1) * 0.003 * speedRatio;
  }

  /* ════════════════════════════════════════════════════════
     RUEDAS
  ════════════════════════════════════════════════════════ */
  // Girar en X (avance) proporcional a velocidad longitudinal
  const wheelSpin = velFwd * dt * 1.4;
  wheelMeshes.forEach(w => { w.rotation.x -= wheelSpin; });

  // Girar en Y (dirección) — ruedas delanteras
  frontPivots.forEach(p => {
    p.rotation.y += (state.steer * 0.40 - p.rotation.y) * 10 * dt;
  });

  /* ════════════════════════════════════════════════════════
     UNDERGLOW + EFECTOS
  ════════════════════════════════════════════════════════ */
  carGlow.intensity = 0.3 + speedRatio * 2.5;
  carGlow.color.setHSL(0.54 + Math.sin(t * 1.5) * 0.06, 1, 0.55);

  /* ════════════════════════════════════════════════════════
     CÁMARA — Seguimiento + Órbita con click derecho
  ════════════════════════════════════════════════════════ */
  const zDist = CAM_OFFSET.z * camZoom; // distancia radial
  const zY    = CAM_OFFSET.y * camZoom; // altura base

  if (camOrbit.active) {
    // ── MODO ÓRBITA: el usuario está arrastrando ──────────────
    // Posición en esfera alrededor del carro
    const orbitR = zDist;
    _camPos.set(
      car.position.x + orbitR * Math.sin(camOrbit.theta) * Math.cos(camOrbit.phi) * -1,
      car.position.y + orbitR * Math.sin(camOrbit.phi),
      car.position.z + orbitR * Math.cos(camOrbit.theta) * Math.cos(camOrbit.phi) * -1
    );
    // En órbita la cámara es más rígida (responde al arrastre directamente)
    camera.position.lerp(_camPos, 0.35);
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z);

  } else if (camOrbit.returning) {
    // ── MODO RETORNO: volviendo suavemente a posición de seguimiento ──
    camOrbit.returnT += dt * 1.5; // velocidad de retorno
    if (camOrbit.returnT >= 1) {
      camOrbit.returning = false;
      camOrbit.returnT   = 1;
      // Reset theta hacia detrás del carro gradualmente en siguiente frame
    }
    // Animar theta de vuelta a 0 (detrás del carro = yaw + 0)
    camOrbit.theta += (0 - camOrbit.theta) * dt * 3.0;
    camOrbit.phi   += (0.4 - camOrbit.phi) * dt * 3.0; // 0.4 = ángulo normal

    // Mezcla entre posición de órbita actual y posición de seguimiento
    const orbitR = zDist;
    const orbitPos = new THREE.Vector3(
      car.position.x + orbitR * Math.sin(camOrbit.theta) * Math.cos(camOrbit.phi) * -1,
      car.position.y + orbitR * Math.sin(camOrbit.phi),
      car.position.z + orbitR * Math.cos(camOrbit.theta) * Math.cos(camOrbit.phi) * -1
    );
    const followPos = new THREE.Vector3(
      car.position.x + Math.sin(state.yaw) * zDist,
      car.position.y + zY,
      car.position.z + Math.cos(state.yaw) * zDist
    );
    _camPos.lerpVectors(orbitPos, followPos, camOrbit.returnT);
    camera.position.lerp(_camPos, 0.12);
    camera.lookAt(car.position.x, car.position.y + 0.8, car.position.z);

  } else {
    // ── MODO SEGUIMIENTO: cámara normal detrás del carro ─────
    _camPos.set(
      car.position.x + Math.sin(state.yaw) * zDist,
      car.position.y + zY,
      car.position.z + Math.cos(state.yaw) * zDist
    );

    // Lerp de cámara: más rígido a más velocidad
    const adaptiveLerp = CFG.camLerp + speedRatio * 0.18;
    camera.position.lerp(_camPos, adaptiveLerp);

    // Lookahead: mira un poco adelante del carro
    const laDist = 2.0 * speedRatio;
    _camLook.set(
      car.position.x - Math.sin(state.yaw) * laDist,
      car.position.y + 0.8,
      car.position.z - Math.cos(state.yaw) * laDist
    );
    camera.lookAt(_camLook);

    // Mantener theta sincronizado con el yaw del carro
    // para que cuando se active la órbita, empiece desde la posición correcta
    camOrbit.theta = state.yaw + Math.PI; // detrás = yaw + 180°
    camOrbit.phi   = 0.4;
  }

  /* ════════════════════════════════════════════════════════
     MUNDO ANIMADO
  ════════════════════════════════════════════════════════ */
  updateWind(dt);
  if(window._dustPts) window._dustPts.rotation.y += dt * 0.015;
  if(window._grassMeshes) window._grassMeshes.forEach((m,i) => {
    m.rotation.x = Math.sin(t*0.9+i*0.3)*0.038;
    m.rotation.z = Math.sin(t*0.7+i*0.2)*0.028;
  });
  if(window._jukeboxLight) window._jukeboxLight.intensity = 2.5 + Math.sin(t*4)*1.5;

  if(window._trees) window._trees.forEach((tree) => {
    const ph = tree.userData.windPhase || 0, spd2 = tree.userData.windSpeed || 1, sc = tree.userData.treeScale || 1;
    tree.rotation.x = Math.sin(t * spd2 + ph) * 0.018 * sc;
    tree.rotation.z = Math.cos(t * spd2 * 0.7 + ph) * 0.012 * sc;
    const lp = tree.userData.leafPts, ld = tree.userData.leafData;
    if(lp && ld){
      const pos = lp.geometry.attributes.position;
      ld.forEach((leaf, i) => {
        leaf.angle += leaf.speed * dt;
        pos.setXYZ(i,
          Math.cos(leaf.angle) * leaf.radius,
          1.5*sc + Math.sin(t*0.8 + leaf.yOff) * 0.35*sc + Math.cos(leaf.angle * 0.5) * 0.2*sc,
          Math.sin(leaf.angle) * leaf.radius
        );
      });
      pos.needsUpdate = true;
      lp.material.opacity = 0.65 + Math.sin(t * 1.2 + ph) * 0.2;
    }
  });

  if(window._riverMesh){
    const hue = 0.58 + Math.sin(t * 0.4) * 0.06;
    window._riverMesh.material.color.setHSL(hue, 0.85 + Math.sin(t * 0.9) * 0.1, 0.38 + Math.sin(t * 0.6) * 0.08);
    window._riverMesh.material.emissive.setHSL(hue, 1, 0.12 + Math.sin(t*1.1)*0.06);
    window._riverMesh.material.emissiveIntensity = 0.35 + Math.sin(t*0.7)*0.15;
    window._riverMesh.position.y = -0.05 + Math.sin(t * 1.8) * 0.015;
  }

  if(window._riverParticles){
    const { mesh, data, curve, W } = window._riverParticles;
    const pos = mesh.geometry.attributes.position;
    data.forEach((p, i) => {
      p.t = (p.t + p.speed * dt) % 1;
      const pt = curve.getPoint(p.t);
      const pt2 = curve.getPoint((p.t + 0.01) % 1);
      const tan = new THREE.Vector3().subVectors(pt2, pt).normalize();
      if(tan.length() < 0.001) tan.set(1,0,0);
      const nor = new THREE.Vector3(-tan.z, 0, tan.x);
      pos.setXYZ(i, pt.x + nor.x * p.off, 0.12 + Math.sin(t * 2.2 + i * 0.4) * 0.08, pt.z + nor.z * p.off);
    });
    pos.needsUpdate = true;
    mesh.material.color.setHSL(0.55 + Math.sin(t*0.5)*0.08, 1, 0.7);
    mesh.material.opacity = 0.5 + Math.sin(t*1.4)*0.2;
  }

  if(window._riverLight){
    window._riverLight.intensity = 1.8 + Math.sin(t * 1.1) * 0.8;
    window._riverLight.color.setHSL(0.58 + Math.sin(t*0.3)*0.08, 1, 0.5);
  }

  const skyH = 0.72 + Math.sin(t * 0.05) * 0.04;
  scene.background.setHSL(skyH, 0.7, 0.08 + Math.sin(t*0.04)*0.02);

  /* ════════════════════════════════════════════════════════
     CHECKPOINTS
  ════════════════════════════════════════════════════════ */
  _car2D.set(car.position.x, car.position.z);
  closestCp = null;
  let minD = Infinity;

  cpObjects.forEach(cp => {
    if(cp.cube){
      cp.cube.position.y = 3.6 + Math.sin(t*1.8 + cp.cfg.x)*0.3;
      cp.cube.rotation.y += dt * 0.9;
      cp.mat.emissiveIntensity = 0.5 + Math.sin(t*2 + cp.cfg.z)*0.45;
    }
    if(cp.triggered && !cp.isJukebox) return;
    _cp2D.set(cp.cfg.x, cp.cfg.z);
    const d = _car2D.distanceTo(_cp2D);
    if(d < TRIGGER_DIST){
      if(!cp.wasInRange){ cp.wasInRange = true; sfxProx(); }
      if(d < minD){ minD = d; closestCp = cp; }
    } else { cp.wasInRange = false; }
  });

  if(closestCp && !currentModal) hintEl.classList.remove('hidden');
  else                            hintEl.classList.add('hidden');

  const openNow = openK();
  if(openNow && !lastOpen && closestCp && !currentModal){
    openModal(closestCp.cfg.id);
    if(!closestCp.triggered && !closestCp.isJukebox){
      closestCp.triggered = true;
      discovered++;
      discEl.textContent = discovered;
      if(closestCp.mat) gsap.to(closestCp.mat,{emissiveIntensity:3,duration:0.25,yoyo:true,repeat:4});
      if(discovered === 3) finalScreen();
    }
  }
  lastOpen = openNow;
}

/* ── 13. RESIZE ───────────────────────────────────────────── */
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
});

/* ── 14. INTRO ────────────────────────────────────────────── */
(function(){
  const c=document.getElementById('intro-particles'); if(!c)return;
  for(let i=0;i<35;i++){
    const p=document.createElement('div'); p.className='particle';
    const s=2+Math.random()*5;
    p.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;bottom:${Math.random()*40}%;--dur:${4+Math.random()*6}s;--delay:${Math.random()*5}s;`;
    c.appendChild(p);
  }
})();

document.getElementById('start-btn').addEventListener('click',()=>{
  const intro=document.getElementById('intro-screen');
  gsap.to(intro,{opacity:0,duration:0.7,ease:'power2.inOut',onComplete:()=>{
    intro.style.display='none';
    document.getElementById('hud').classList.remove('hidden');
    gameOn=true; clock.start();
  }});
});

tick();
console.log('%c💛 Para Ámbar v4.1 — física corregida', 'color:#ffd60a;font-size:1.2rem;font-weight:bold');