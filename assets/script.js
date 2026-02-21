/* ════════════════════════════════════════════════════════════════
   script.js — Para Ámbar 💛  v4.0  (modelo GLB real)
════════════════════════════════════════════════════════════════ */

/* ── 0. CONFIGURACIÓN ─────────────────────────────────────── */
const CFG = {
  speed:     80,   // velocidad máxima (unidades/s) — ajustado por usuario
  accel:    500,   // aceleración (unidades/s²)
  friction: 0.87,  // frenado por frame (0=resbaladizo 1=frena ya)
  turn:     170,   // grados/segundo de giro
  camLerp:  0.09,  // suavidad de cámara
  jumpForce: 6,    // impulso del salto — más corto y natural
  gravity:   38,   // gravedad alta — cae rápido, no "vuela"
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
  GLB_PATH : 'models/grass/grass.glb',  // ← ya funciona, no tocar
  COUNT    : 300,
  MIN_SCALE: 0.8,
  MAX_SCALE: 2.2,
  SPREAD   : 40,
};

/* ── 1. RENDERER + ESCENA + CÁMARA + LUCES ────────────────── */
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('webgl-canvas'), antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x130903);
scene.fog = new THREE.FogExp2(0x1f0c04, 0.022);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
// Offset: cámara arriba-atrás del carro (eje Z positivo = detrás)
const CAM_OFFSET = new THREE.Vector3(0, 8, 11);  // más cerca y baja
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

// ── Zoom con scroll del mouse ─────────────────────────────────
// camZoom va de 0.5 (muy cerca) a 2.5 (lejos)
let camZoom = 1.0;
window.addEventListener('wheel', e => {
  camZoom += e.deltaY * 0.001;
  camZoom  = Math.max(0.4, Math.min(2.8, camZoom));
}, { passive: true });

scene.add(new THREE.HemisphereLight(0xffe4b5, 0x3d1a04, 0.9));
const sun = new THREE.DirectionalLight(0xffd580, 2.4);
sun.position.set(15, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -60;
sun.shadow.camera.right = sun.shadow.camera.top   =  60;
sun.shadow.camera.far   = 120;
sun.shadow.bias = -0.001;
scene.add(sun);
const fillLight = new THREE.PointLight(0xff7c2a, 1.2, 80);
fillLight.position.set(-8, 4, 5);
scene.add(fillLight);

/* ── 2. SUELO ─────────────────────────────────────────────── */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0xb85e2e, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(400, 120, 0x9a4c22, 0x9a4c22);
grid.material.opacity = 0.12;
grid.material.transparent = true;
grid.position.y = 0.01;
scene.add(grid);

/* ══════════════════════════════════════════════════════════════
   3. JEEP TÁCTICO — low-poly, estilo imagen de referencia
   Rojo oscuro / negro / faros amarillos brillantes
   Ruedas enormes, barra LED, capó musculoso
   FÍSICA: volteo real + recuperación girando ruedas (A/D en el suelo)
══════════════════════════════════════════════════════════════ */

const car = new THREE.Group();
scene.add(car);

/* Estado de movimiento */
const carVel      = new THREE.Vector3();
let   carYaw      = 0;   // rotación Y (hacia dónde mira)
let   carVelY     = 0;   // velocidad vertical
let   carRoll     = 0;   // ángulo Z actual (inclinación)
let   isOnGround  = true;
let   isFlipped   = false; // true cuando está boca arriba / de lado

/* Underglow */
const carGlow = new THREE.PointLight(0xff6600, 0, 7);
carGlow.position.set(0, 0.1, 0);
car.add(carGlow);

/* ── Paleta ─────────────────────────────────────────────────── */
const C = {
  body:   0x8b1a1a,  // rojo oscuro profundo (color principal)
  body2:  0x5a0f0f,  // rojo muy oscuro (capó, guardafangos)
  dark:   0x111118,  // negro casi puro (techo, rollbar, detalles)
  chrome: 0xb0b8c8,  // plata cromada (rines, parachoques)
  amber:  0xffaa00,  // amarillo ámbar (faros encendidos)
  amberG: 0xff8800,  // naranja ámbar (halo de faros)
  rubber: 0x0d0d12,  // negro goma (llantas)
  glass:  0x0a1a2e,  // azul oscuro (parabrisas)
  accent: 0xff3300,  // naranja-rojo vivo (detalles DRL)
};

const M  = (c,r=0.4,m=0,e=0,ei=0) => new THREE.MeshStandardMaterial(
  {color:c,roughness:r,metalness:m,emissive:e,emissiveIntensity:ei});
const MT = (c,op=0.5) => new THREE.MeshStandardMaterial(
  {color:c,transparent:true,opacity:op,roughness:0.05,metalness:0.3});

/* ════════════════════════════════════════════
   CHASIS — base plana y ancha, muy pegada al suelo
════════════════════════════════════════════ */
const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 4.0), M(C.body2,0.6,0.1));
chassis.position.y = 0.5; chassis.castShadow = true; car.add(chassis);

// Placa skid delantera
const skid = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.06,1.1), M(C.chrome,0.3,0.85));
skid.position.set(0,0.39,-1.55); car.add(skid);

/* ════════════════════════════════════════════
   CARROCERÍA — forma caja musculosa
════════════════════════════════════════════ */
// Cuerpo principal
const body = new THREE.Mesh(new THREE.BoxGeometry(1.95,0.72,3.6), M(C.body,0.35,0.08));
body.position.y = 0.97; body.castShadow = true; car.add(body);

// Capó musculoso (ligeramente elevado)
const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.14,1.45), M(C.body2,0.4,0.1));
hood.position.set(0,1.34,-1.0); hood.castShadow=true; car.add(hood);

// Bulge del capó — caja central elevada con rejillas
const hoodBulge = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.1,1.3), M(C.dark,0.5,0.05));
hoodBulge.position.set(0,1.42,-1.0); car.add(hoodBulge);
// Rejillas del bulge (4 líneas)
for(let i=0;i<4;i++){
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.02,0.06), M(0x222228,0.8));
  slot.position.set(0,1.475,-1.35+i*0.2); car.add(slot);
}

// Techo corto — Jeep no tiene techo largo
const roof = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.1,1.7), M(C.dark,0.4,0.05));
roof.position.set(0,1.83,0.25); roof.castShadow=true; car.add(roof);

// Guardafangos — sobresalen de la carrocería, forma cuadrada robusta
[[-1.06,-0.85],[1.06,-0.85],[-1.06,0.88],[1.06,0.88]].forEach(([x,z])=>{
  const fg = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.35,1.05), M(C.dark,0.55,0.05));
  fg.position.set(x,0.78,z); fg.castShadow=true; car.add(fg);
});

/* ════════════════════════════════════════════
   ROLLBAR — elemento icónico (arco interior visible)
════════════════════════════════════════════ */
// Postes laterales del rollbar
[[-0.85],[0.85]].forEach(([x])=>{
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.75,0.07), M(C.dark,0.3,0.4));
  post.position.set(x,1.56,0.78); car.add(post);
});
// Barra superior horizontal
const rbar = new THREE.Mesh(new THREE.BoxGeometry(1.72,0.07,0.07), M(C.dark,0.3,0.4));
rbar.position.set(0,1.93,0.78); car.add(rbar);
// Barra diagonal refuerzo
const rdiag = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.8), M(C.dark,0.3,0.4));
rdiag.position.set(0,1.74,0.4); rdiag.rotation.x=0.55; car.add(rdiag);

/* ════════════════════════════════════════════
   PARABRISAS + VENTANAS
════════════════════════════════════════════ */
const ws = new THREE.Mesh(new THREE.BoxGeometry(1.75,0.6,0.07), MT(C.glass,0.5));
ws.position.set(0,1.56,-0.22); ws.rotation.x=0.2; car.add(ws);
// Marco del parabrisas
const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(1.82,0.65,0.04), M(C.dark,0.4,0.1));
wsFrame.position.set(0,1.56,-0.19); wsFrame.rotation.x=0.2; car.add(wsFrame);
// Ventanas laterales pequeñas
[-0.99,0.99].forEach(x=>{
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.38,0.85), MT(C.glass,0.4));
  win.position.set(x,1.56,0.3); car.add(win);
});

/* ════════════════════════════════════════════
   PARACHOQUES FRONT — agresivo
════════════════════════════════════════════ */
// Barra principal
const bump = new THREE.Mesh(new THREE.BoxGeometry(2.1,0.28,0.15), M(C.dark,0.4,0.15));
bump.position.set(0,0.56,-2.08); bump.castShadow=true; car.add(bump);
// Planchas del parachoques
[[-0.7],[0.7]].forEach(([x])=>{
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.42,0.22), M(C.dark,0.45,0.1));
  plate.position.set(x,0.58,-2.04); plate.castShadow=true; car.add(plate);
});
// Tow hooks
[[-0.88],[0.88]].forEach(([x])=>{
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.25,8), M(C.chrome,0.3,0.8));
  hook.rotation.x=Math.PI/2; hook.position.set(x,0.42,-2.18); car.add(hook);
});

/* ════════════════════════════════════════════
   RUEDAS — enormes, off-road, estilo imagen
   Radio 0.52 → Y center = 0.52 (toca suelo exacto)
════════════════════════════════════════════ */
const WHEEL_R = 0.52;
const WHEEL_W = 0.38;
const wheelMeshes  = [];  // todas las ruedas (para girar en X al avanzar)
const frontPivots  = [];  // solo las delanteras (para girar en Y al torcer)

// Helper que construye una rueda y la devuelve como Group
function buildWheel(){
  const wg = new THREE.Group();
  wg.rotation.z = Math.PI/2;

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,WHEEL_W,28), M(C.rubber,0.95));
  tire.castShadow=true; wg.add(tire);

  for(let b=0;b<5;b++){
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_R+0.012,WHEEL_R+0.012,0.032,24), M(0x0a0a10,0.98));
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

// ── Ruedas DELANTERAS (z=-1.28) — con pivote de dirección ────────
// Estructura: car → pivot (Y varia con el volante) → wg (rueda)
[[1.18,-1.28],[-1.18,-1.28]].forEach(([x,z])=>{
  const pivot = new THREE.Group();      // este grupo gira en Y (dirección)
  pivot.position.set(x, WHEEL_R, z);
  const wg = buildWheel();
  pivot.add(wg);
  car.add(pivot);
  frontPivots.push(pivot);   // para animar dirección
  wheelMeshes.push(wg);      // para animar rotación por avance
});

// ── Ruedas TRASERAS (z=+1.28) — sin pivote, dirección fija ───────
[[1.18,1.28],[-1.18,1.28]].forEach(([x,z])=>{
  const wg = buildWheel();
  wg.position.set(x, WHEEL_R, z);
  car.add(wg);
  wheelMeshes.push(wg);
});

/* ════════════════════════════════════════════
   FAROS — bloques grandes, muy amarillos (como en imagen)
════════════════════════════════════════════ */
// Faros delanteros rectangulares grandes
[-0.63,0.63].forEach(x=>{
  // Carcasa exterior
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.58,0.26,0.1), M(C.dark,0.3,0.15));
  house.position.set(x,1.0,-2.07); car.add(house);
  // Cristal ámbar encendido
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,0.05), M(C.amber,0.05,0.1,C.amber,3.5));
  lens.position.set(x,1.0,-2.11); car.add(lens);
  // SpotLight real
  const fl = new THREE.SpotLight(0xffcc44,6,22,Math.PI*0.13,0.55);
  fl.position.set(x,1.0,-2.2);
  fl.target.position.set(x*0.4,0,-14);
  car.add(fl); car.add(fl.target);
  // Halo de luz ambiental en el faro
  const halo = new THREE.PointLight(C.amberG,1.2,4.5);
  halo.position.set(x,1.0,-2.15); car.add(halo);
});

// DRL — tira naranja-rojo entre los faros (como en imagen: línea horizontal)
const drl = new THREE.Mesh(new THREE.BoxGeometry(1.26,0.055,0.04), M(C.accent,0.1,0.1,C.accent,4.0));
drl.position.set(0,0.82,-2.1); car.add(drl);

/* ════════════════════════════════════════════
   BARRA LED RALLY — arriba del parabrisas (icónica)
   En la imagen se ven 4 cuadrados ámbar alineados
════════════════════════════════════════════ */
// Caja de la barra
const ledCase = new THREE.Mesh(new THREE.BoxGeometry(1.4,0.14,0.18), M(C.dark,0.35,0.2));
ledCase.position.set(0,2.0,-0.22); car.add(ledCase);
// 4 celdas LED cuadradas (como en imagen)
for(let i=0;i<4;i++){
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.1,0.06), M(C.amber,0.05,0.05,C.amber,4.5));
  cell.position.set(-0.45+i*0.3,2.0,-0.32); car.add(cell);
  // SpotLight de cada celda
  const sl = new THREE.SpotLight(0xffcc44,2.5,18,Math.PI*0.12,0.6);
  sl.position.set(-0.45+i*0.3,2.0,-0.36);
  sl.target.position.set(-0.45+i*0.3*0.3,0,-12);
  car.add(sl); car.add(sl.target);
}

// Luces traseras rojas
[-0.65,0.65].forEach(x=>{
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.14,0.04), M(0xff1100,0.1,0.05,0xff1100,2.0));
  rl.position.set(x,0.98,2.08); car.add(rl);
  const rpt = new THREE.PointLight(0xff2200,1.2,5);
  rpt.position.set(x,0.98,2.2); car.add(rpt);
});

console.log('%c🚙 Jeep táctico listo', 'color:#ffaa00;font-weight:bold');


/* ── 4. COLISIONES ────────────────────────────────────────── */
const colliders = [];
function addCollider(x, z, r) { colliders.push({ x, z, r }); }

function resolveCollisions() {
  const R = 0.9;
  for (const col of colliders) {
    const dx = car.position.x - col.x;
    const dz = car.position.z - col.z;
    const d  = Math.sqrt(dx*dx + dz*dz);
    const md = R + col.r;
    if (d < md && d > 0.001) {
      const overlap = md - d;
      const nx = dx/d, nz = dz/d;

      // Separar el carro del obstáculo
      car.position.x += nx * overlap;
      car.position.z += nz * overlap;

      // Velocidad de impacto (componente en la dirección de colisión)
      const dot = carVel.x*nx + carVel.z*nz;
      if (dot < 0) {
        // Rebote — cuánto rebota depende de la velocidad
        const bounce = 1.2;
        carVel.x -= dot * nx * bounce;
        carVel.z -= dot * nz * bounce;

        // ── VOLTEO por impacto fuerte ──────────────────────────
        // Si choca con velocidad > 35% del máximo y está en el suelo → voltea
        const impactSpd = Math.abs(dot);
        const flipThreshold = CFG.speed * 0.35;   // ~28 u/s

        if(impactSpd > flipThreshold && isOnGround && !isFlipped){
          isFlipped = true;
          // Dirección del volteo: depende del lado del impacto
          // Producto cruzado simplificado: si el impacto viene de la derecha → vuelca a la izq
          const cross = nx * Math.cos(carYaw) - nz * Math.sin(carYaw);
          carRoll = cross > 0 ? 1.8 : -1.8;   // ~103°, boca de lado
          carVel.multiplyScalar(0.25);          // pierde velocidad al chocar
          tone(120, 0.4, 'sawtooth', 0.12);    // SFX choque
        }
      }
    }
  }
}

/* ── 5. MUNDO — Árboles, rocas, pasto, vallas ─────────────── */
function makeTree(x, z, s=1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18*s, 0.25*s, 1.8*s, 8),
    new THREE.MeshStandardMaterial({ color:0x5c3317, roughness:0.9 })
  );
  trunk.position.y = 0.9*s; trunk.castShadow = true; g.add(trunk);
  [{ry:2.2*s,rs:1.2*s,c:0x3a7c2e},{ry:3.2*s,rs:0.95*s,c:0x4a9c3e},{ry:4.0*s,rs:0.7*s,c:0x5ab44e}]
  .forEach(({ry,rs,c}) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(rs,8,6),
      new THREE.MeshStandardMaterial({color:c,roughness:0.85}));
    l.position.y = ry; l.castShadow = true; g.add(l);
  });
  scene.add(g);
  addCollider(x, z, 0.4*s);
}

function makeRock(x, z, s=1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const r = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6*s, 0),
    new THREE.MeshStandardMaterial({color:0x7a6a55,roughness:1})
  );
  r.scale.y = 0.5; r.rotation.y = Math.random()*Math.PI;
  r.position.y = 0.18*s; r.castShadow = r.receiveShadow = true;
  g.add(r); scene.add(g);
  addCollider(x, z, 0.55*s);
}

function makeFence(x, z, len=5, ry=0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const pm = new THREE.MeshStandardMaterial({color:0x6b4423,roughness:0.9});
  const bm = new THREE.MeshStandardMaterial({color:0x8b5c32,roughness:0.85});
  const posts = Math.floor(len/1.5)+1;
  for (let i=0; i<posts; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12,1.2,0.12),pm);
    p.position.set(i*1.5-len/2, 0.6, 0); p.castShadow=true; g.add(p);
  }
  [0.35,0.75].forEach(y => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len,0.12,0.07),bm);
    b.position.set(0,y,0); b.castShadow=true; g.add(b);
  });
  scene.add(g);
}

// Árboles
makeTree(-8,-18,1.2); makeTree(10,-20,1.0); makeTree(-18,-4,1.4);
makeTree(20,8,1.1);   makeTree(-4,18,0.9);  makeTree(24,-16,1.3);
makeTree(-22,12,1.0); makeTree(8,22,1.2);   makeTree(-14,20,0.85);

// Rocas
makeRock(6,-8,1.0);  makeRock(-10,12,1.3); makeRock(18,4,0.8);
makeRock(-4,-6,0.9); makeRock(14,18,1.1);  makeRock(-18,-14,1.2);

// Vallas
makeFence(-12,-4,8,0);       makeFence(6,-4,6,0);
makeFence(10,10,6,Math.PI/2); makeFence(-16,10,8,Math.PI/2);

/* ── 6. PASTO GLB ─────────────────────────────────────────── */
function spawnGrass(model) {
  model.traverse(c => {
    if (!c.isMesh) return;
    c.castShadow = false; c.receiveShadow = true;
    if (c.material) {
      c.material.side = THREE.DoubleSide;
      c.material.alphaTest = 0.3;
      c.material.depthWrite = false;
    }
  });
  for (let i=0; i<GRASS_CFG.COUNT; i++) {
    const a = Math.random()*Math.PI*2;
    const r = 3 + Math.pow(Math.random(),0.5)*GRASS_CFG.SPREAD;
    const x = Math.cos(a)*r, z = Math.sin(a)*r;
    if (Math.abs(x)<2.5 && Math.abs(z)<2.5) continue;
    const clone = model.clone();
    clone.position.set(x,0,z);
    clone.rotation.y = Math.random()*Math.PI*2;
    const s = GRASS_CFG.MIN_SCALE + Math.random()*(GRASS_CFG.MAX_SCALE-GRASS_CFG.MIN_SCALE);
    clone.scale.setScalar(s);
    scene.add(clone);
  }
  console.log(`%c🌿 ${GRASS_CFG.COUNT} mechones de pasto cargados`, 'color:#4a8c2a');
}

function buildFallbackGrass() {
  console.warn('⚠ grass.glb no encontrado — pasto procedural activado');
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([
    -0.3,0,0.3,  0.3,0,-0.3,  0.3,0.8,-0.3,
    -0.3,0,0.3,  0.3,0.8,-0.3, -0.3,0.8,0.3,
    -0.3,0,-0.3, 0.3,0,0.3,   0.3,0.8,0.3,
    -0.3,0,-0.3, 0.3,0.8,0.3, -0.3,0.8,-0.3,
  ]);
  const uv = new Float32Array([0,0,1,0,1,1, 0,0,1,1,0,1, 0,0,1,0,1,1, 0,0,1,1,0,1]);
  geo.setAttribute('position', new THREE.BufferAttribute(v,3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uv,2));
  geo.computeVertexNormals();
  const colors = [0x2d6e1a,0x3a8c22,0x4aa830,0x5db83a,0x6ec848];
  const perMesh = Math.floor(GRASS_CFG.COUNT/colors.length);
  const meshes = colors.map(c => {
    const m = new THREE.InstancedMesh(geo,
      new THREE.MeshStandardMaterial({color:c,side:THREE.DoubleSide,alphaTest:0.1,roughness:1}),
      perMesh);
    scene.add(m); return m;
  });
  window._grassMeshes = meshes;
  const d = new THREE.Object3D();
  meshes.forEach((m,mi) => {
    for (let i=0; i<perMesh; i++) {
      const a=Math.random()*Math.PI*2, r=3+Math.pow(Math.random(),0.5)*GRASS_CFG.SPREAD;
      const s=0.6+Math.random()*1.0;
      d.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
      d.rotation.y=Math.random()*Math.PI*2;
      d.scale.set(s,s*(0.9+Math.random()*0.4),s);
      d.updateMatrix(); m.setMatrixAt(i,d.matrix);
    }
    m.instanceMatrix.needsUpdate=true;
  });
}

(function loadGrass() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  s.onload = () => {
    new THREE.GLTFLoader().load(
      GRASS_CFG.GLB_PATH,
      gltf => spawnGrass(gltf.scene),
      null,
      ()   => buildFallbackGrass()
    );
  };
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
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text,256,64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(cv), transparent:true, depthTest:false,
  }));
  sp.scale.set(4.5,1.1,1);
  return sp;
}

CHECKPOINTS.forEach(cfg => {
  const g = new THREE.Group();
  g.position.set(cfg.x,0,cfg.z);
  scene.add(g);

  if (cfg.isJukebox) {
    buildJukebox(g, cfg.color);
    cpObjects.push({cfg, cube:null, mat:null, triggered:false, wasInRange:false, isJukebox:true});
    addCollider(cfg.x, cfg.z, 1.2);
    return;
  }

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,0.3,16),
    new THREE.MeshStandardMaterial({color:0x2e1608,roughness:0.8}));
  base.position.y=0.15; base.castShadow=base.receiveShadow=true; g.add(base);

  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,2.8,10),
    new THREE.MeshStandardMaterial({color:0x3d2010,roughness:0.7}));
  col.position.y=1.7; col.castShadow=true; g.add(col);

  const mat = new THREE.MeshStandardMaterial({
    color:cfg.color, emissive:cfg.emissive, emissiveIntensity:0.8, roughness:0.2, metalness:0.4,
  });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),mat);
  cube.position.y=3.6; cube.castShadow=true; g.add(cube);

  const pt = new THREE.PointLight(cfg.color,2.2,16);
  pt.position.y=3.8; g.add(pt);

  const lbl = makeLabel(cfg.icon+' '+cfg.label);
  lbl.position.set(0,5.4,0); g.add(lbl);

  cpObjects.push({cfg, cube, mat, triggered:false, wasInRange:false, isJukebox:false});
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
for (let i=0; i<WIND_COUNT; i++) {
  windPos[i*3]  =(Math.random()-0.5)*80;
  windPos[i*3+1]= Math.random()*3;
  windPos[i*3+2]=(Math.random()-0.5)*80;
  windSpd.push(0.5+Math.random()*1.5);
}
const windGeo = new THREE.BufferGeometry();
windGeo.setAttribute('position',new THREE.BufferAttribute(windPos,3));
const windPts = new THREE.Points(windGeo,
  new THREE.PointsMaterial({color:0xddccaa,size:0.12,sizeAttenuation:true,transparent:true,opacity:0.45,depthWrite:false}));
scene.add(windPts);

function updateWind(dt) {
  const pos = windGeo.attributes.position.array;
  const tt  = Date.now()*0.0002;
  const wx  = Math.cos(tt)*8, wz = Math.sin(tt*0.7)*4;
  for (let i=0; i<WIND_COUNT; i++) {
    const s=windSpd[i];
    pos[i*3]  +=wx*s*dt; pos[i*3+1]+=0.3*s*dt; pos[i*3+2]+=wz*s*dt;
    if(pos[i*3]> 40) pos[i*3]=-40; if(pos[i*3]<-40) pos[i*3]=40;
    if(pos[i*3+1]>4) pos[i*3+1]=0.1;
    if(pos[i*3+2]> 40) pos[i*3+2]=-40; if(pos[i*3+2]<-40) pos[i*3+2]=40;
  }
  windGeo.attributes.position.needsUpdate=true;
}

// Polvo dorado ambiente
(function(){
  const n=180, r=55, pos=new Float32Array(n*3);
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
  const el=document.getElementById(id);
  if(!el)return;
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

/* ── 12. LOOP DE ANIMACIÓN ────────────────────────────────── */
const clock   = new THREE.Clock();
const _camPos = new THREE.Vector3();
const _camLook= new THREE.Vector3();
const _fwdDir = new THREE.Vector3();
const _car2D  = new THREE.Vector2();
const _cp2D   = new THREE.Vector2();
let gameOn=false, lastOpen=false, closestCp=null;

function tick(){
  requestAnimationFrame(tick);
  renderer.render(scene,camera);
  if(!gameOn)return;

  const dt = Math.min(clock.getDelta(),0.05);
  const t  = Date.now()*0.001;

  /* ── MOVIMIENTO ──────────────────────────────────────────── */
  const spd = carVel.length();
  // Giro proporcional a velocidad (sin velocidad no gira mucho)
  const tf = Math.min(spd/6, 1.0);
  if(left())  carYaw += THREE.MathUtils.degToRad(CFG.turn)*dt*tf;
  if(right()) carYaw -= THREE.MathUtils.degToRad(CFG.turn)*dt*tf;
  car.rotation.y = carYaw;

  _fwdDir.set(-Math.sin(carYaw),0,-Math.cos(carYaw));

  if(fwd()) carVel.addScaledVector(_fwdDir,  CFG.accel*dt);
  if(bwd()) carVel.addScaledVector(_fwdDir, -(spd>2?CFG.accel*1.4:CFG.accel*0.6)*dt);

  carVel.multiplyScalar(isOnGround?CFG.friction:0.995);
  if(carVel.length()>CFG.speed) carVel.normalize().multiplyScalar(CFG.speed);

  car.position.addScaledVector(carVel,dt);

  /* ══════════════════════════════════════════════════════════
     FÍSICA VERTICAL: Salto + Gravedad + Volteo + Recuperación
     ══════════════════════════════════════════════════════════

     SISTEMA DE VOLTEO:
     • carRoll es el ángulo Z real del carro (rad)
     • Si |carRoll| > π/2 (90°) → está boca arriba = isFlipped
     • Estando volteado, A/D giran las ruedas para recuperarse
     • Cuando carRoll vuelve a 0 → isFlipped = false, sigue normal
     ────────────────────────────────────────────────────────── */

  // ── SALTO ────────────────────────────────────────────────
  if(jumpK() && isOnGround && !isFlipped){
    carVelY = CFG.jumpForce; isOnGround = false;
  }

  if(!isOnGround){
    carVelY        -= CFG.gravity * dt;
    car.position.y += carVelY * dt;

    if(car.position.y <= 0){
      car.position.y = 0;
      isOnGround     = true;
      const impact   = Math.min(Math.abs(carVelY) / CFG.jumpForce, 1);
      carVelY        = 0;

      // Squash de aterrizaje
      car.scale.set(1 + impact*0.16, 1 - impact*0.22, 1 + impact*0.16);
      gsap.to(car.scale, {x:1,y:1,z:1,duration:0.22,ease:'elastic.out(1,0.5)'});

      // Volteo al aterrizar con roll extremo (>55°)
      if(Math.abs(carRoll) > 0.96){
        isFlipped = true;
        carVel.multiplyScalar(0.15); // pierde velocidad al voltearse
      }
    }
  } else {
    car.position.y = 0;
  }

  /* ── ROLL VISUAL + VOLTEO ───────────────────────────────────
     
     MODO NORMAL (isFlipped=false):
       • Inclinación suave en curvas (visual, no vuelca)
       • Volteo REAL: chocas fuerte contra un obstáculo con velocidad
         → la colisión detecta impacto fuerte → activa isFlipped
     
     MODO VOLTEADO (isFlipped=true):
       • A/D giran las ruedas → empujan el carro de vuelta
       • Gravedad ayuda a centrarlo
       • Al pasar de 0 ± 25° → se levanta solo
  ─────────────────────────────────────────────────────────── */

  const rollForce = (left()?1:right()?-1:0) * tf * (spd / CFG.speed);

  if(!isFlipped){
    // Roll visual suave en curvas (solo cosmético)
    const targetRoll = rollForce * 0.11;
    carRoll += (targetRoll - carRoll) * 8 * dt;
    // Clampar — nunca supera 15° en modo normal
    carRoll = Math.max(-0.26, Math.min(0.26, carRoll));

  } else {
    /* ── RECUPERACIÓN CON A/D ─────────────────────────────── */
    // A/D hacen que el carro ruede: presiona el lado que está abajo
    const recoverDir = carRoll > 0 ? 1 : -1;
    if(left())  carRoll -= recoverDir * 2.8 * dt;
    if(right()) carRoll += recoverDir * 2.8 * dt;

    // Gravedad: si no haces nada, lentamente el carro vuelve al centro
    carRoll -= carRoll * 0.5 * dt;

    // Bloquear movimiento XZ mientras está volteado (no puede manejar)
    carVel.multiplyScalar(0.92);

    // Mostrar hint en HUD
    if(!document.getElementById('flip-hint')?.classList.contains('visible')){
      const fh = document.getElementById('flip-hint');
      if(fh){ fh.classList.add('visible'); }
    }

    // ¿Recuperado? (dentro de ±20°)
    if(Math.abs(carRoll) < 0.35 && isOnGround){
      isFlipped = false;
      carRoll   = 0;
      const fh  = document.getElementById('flip-hint');
      if(fh){ fh.classList.remove('visible'); }
      // Bounce al levantarse
      gsap.to(car.scale,{x:1.1,y:0.85,z:1.1,duration:0.1,
        onComplete:()=>gsap.to(car.scale,{x:1,y:1,z:1,duration:0.3,ease:'bounce.out'})});
    }

    // Ruedas delanteras giran al recuperar
    wheelMeshes.forEach(w=>{ w.rotation.x += (left()?-1.5:right()?1.5:0)*dt; });
  }

  car.rotation.z = carRoll;

  // ── SUSPENSIÓN visual (solo en modo normal) ───────────────
  if(isOnGround && !isFlipped)
    car.position.y += Math.sin(t * spd * 0.8) * 0.005 * Math.min(spd / CFG.speed, 1);

  /* ── COLISIONES ──────────────────────────────────────────── */
  resolveCollisions();

  /* ── RUEDAS ──────────────────────────────────────────────── */
  wheelMeshes.forEach(w=>{ w.rotation.x -= spd*dt*1.7; });

  /* ── UNDERGLOW: pulsa con velocidad ─────────────────────── */
  carGlow.intensity = 0.5 + (spd/CFG.speed)*3.0;
  carGlow.color.setHSL(0.54+Math.sin(t*1.5)*0.06, 1, 0.55);

  /* ── CHIRRIIDO al derrapar ───────────────────────────────── */
  if(spd>CFG.speed*0.8&&isOnGround&&(left()||right())&&Math.random()<0.015)
    tone(180+Math.random()*40,0.08,'sawtooth',0.04);

  /* ── RUEDAS DELANTERAS — dirección (giro en Y) ─────────────── */
  // Las ruedas delanteras giran hacia donde apuntan A/D
  // MAX_STEER: ángulo máximo de dirección (rad)
  const MAX_STEER    = 0.45;
  const targetSteer  = left() ? MAX_STEER : right() ? -MAX_STEER : 0;
  // Interpolar suavemente hacia el ángulo objetivo
  frontPivots.forEach(p => {
    p.rotation.y += (targetSteer - p.rotation.y) * 10 * dt;
  });

  /* ── CÁMARA ADAPTATIVA ───────────────────────────────────────
     Problema anterior: lerp fijo = cámara se queda atrás a alta vel.
     Solución: lerp que crece con la velocidad — rígida al acelerar,
     suave al frenar/parar. También un "lookahead" que desplaza el
     punto de mira ligeramente hacia adelante del carro.
  ─────────────────────────────────────────────────────────────── */
  const zZ = CAM_OFFSET.z * camZoom;
  const zY = CAM_OFFSET.y * camZoom;

  // Offset detrás del carro según su yaw
  const camBehindX = Math.sin(carYaw) * zZ;
  const camBehindZ = Math.cos(carYaw) * zZ;

  _camPos.set(
    car.position.x + camBehindX,
    car.position.y + zY,
    car.position.z + camBehindZ
  );

  // Lerp adaptativo: más rígido a más velocidad
  // - parado (spd≈0): lerp 0.04 — suave y cinematográfico
  // - máxima velocidad: lerp 0.22 — casi pega al carro
  const adaptiveLerp = 0.04 + (spd / CFG.speed) * 0.18;
  camera.position.lerp(_camPos, adaptiveLerp);

  // LookAt con lookahead: mira ligeramente ADELANTE del carro
  // Así la cámara "anticipa" la dirección de movimiento
  const lookAheadDist = 2.5 * (spd / CFG.speed);  // 0 parado, 2.5 a max
  const lookAheadX    = car.position.x - Math.sin(carYaw) * lookAheadDist;
  const lookAheadZ    = car.position.z - Math.cos(carYaw) * lookAheadDist;
  _camLook.set(lookAheadX, car.position.y + 0.8, lookAheadZ);

  // lookAt también se interpola (evita saltos bruscos)
  const _currentLook = new THREE.Vector3();
  camera.getWorldDirection(_currentLook);
  camera.lookAt(_camLook);

  /* ── VIENTO ──────────────────────────────────────────────── */
  updateWind(dt);
  if(window._dustPts) window._dustPts.rotation.y+=dt*0.018;
  if(window._grassMeshes) window._grassMeshes.forEach((m,i)=>{
    m.rotation.x=Math.sin(t*0.9+i*0.3)*0.035;
    m.rotation.z=Math.sin(t*0.7+i*0.2)*0.025;
  });
  if(window._jukeboxLight) window._jukeboxLight.intensity=2.5+Math.sin(t*4)*1.5;

  /* ── CHECKPOINTS ─────────────────────────────────────────── */
  _car2D.set(car.position.x,car.position.z);
  closestCp=null; let minD=Infinity;

  cpObjects.forEach(cp=>{
    if(cp.cube){ cp.cube.position.y=3.6+Math.sin(t*1.8+cp.cfg.x)*0.3;
      cp.cube.rotation.y+=dt*0.9; cp.mat.emissiveIntensity=0.5+Math.sin(t*2+cp.cfg.z)*0.45; }
    if(cp.triggered&&!cp.isJukebox)return;
    _cp2D.set(cp.cfg.x,cp.cfg.z);
    const d=_car2D.distanceTo(_cp2D);
    if(d<TRIGGER_DIST){
      if(!cp.wasInRange){cp.wasInRange=true;sfxProx();}
      if(d<minD){minD=d;closestCp=cp;}
    } else { cp.wasInRange=false; }
  });

  if(closestCp&&!currentModal) hintEl.classList.remove('hidden');
  else                          hintEl.classList.add('hidden');

  const openNow=openK();
  if(openNow&&!lastOpen&&closestCp&&!currentModal){
    openModal(closestCp.cfg.id);
    if(!closestCp.triggered&&!closestCp.isJukebox){
      closestCp.triggered=true; discovered++; discEl.textContent=discovered;
      if(closestCp.mat) gsap.to(closestCp.mat,{emissiveIntensity:3,duration:0.25,yoyo:true,repeat:4});
      if(discovered===3)finalScreen();
    }
  }
  lastOpen=openNow;
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
console.log('%c💛 Para Ámbar v4 — con amor', 'color:#ffd60a;font-size:1.2rem;font-weight:bold');