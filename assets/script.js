/* ════════════════════════════════════════════════════════════════
   script.js — Para Ámbar 💛  v4.0  (modelo GLB real)
════════════════════════════════════════════════════════════════ */

/* ── 0. CONFIGURACIÓN ─────────────────────────────────────── */
const CFG = {
  speed:     60,   // velocidad máxima (unidades/s) — ajustado por usuario
  accel:    300,   // aceleración (unidades/s²)
  friction: 0.90,  // frenado por frame (0=resbaladizo 1=frena ya)
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
scene.background = new THREE.Color(0x1a0a2e);   // azul-morado oscuro (atardecer)
scene.fog = new THREE.FogExp2(0x2a0a3e, 0.016); // niebla violeta suave

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

// Cielo atardecer — naranja-rosado arriba, morado oscuro abajo
scene.add(new THREE.HemisphereLight(0xff6030, 0x1a0a2e, 1.1));

// Sol rasante — naranja muy cálido, sombras largas
const sun = new THREE.DirectionalLight(0xff8040, 2.8);
sun.position.set(30, 18, 20);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -70;
sun.shadow.camera.right = sun.shadow.camera.top   =  70;
sun.shadow.camera.far   = 150;
sun.shadow.bias = -0.001;
scene.add(sun);

// Luz de relleno azul-violeta desde abajo (rebote del cielo)
const fillLight = new THREE.PointLight(0x6020ff, 0.8, 120);
fillLight.position.set(-10, 2, 8);
scene.add(fillLight);

// Luz ambiente suave morada para dar profundidad
const ambientPurple = new THREE.PointLight(0xff2090, 0.5, 200);
ambientPurple.position.set(0, 15, 0);
scene.add(ambientPurple);

/* ═══════════════════════════════════════════════════════════
   2. MUNDO — Suelo, Pista, Río, Árboles, Partículas
   Estilo: atardecer violeta-naranja, low-poly animado
═══════════════════════════════════════════════════════════ */

// ── SUELO — terreno anaranjado-rosa (como imagen referencia) ──
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400, 1, 1),
  new THREE.MeshStandardMaterial({
    color: 0xc84820,          // rojo-naranja oscuro
    roughness: 0.92,
    metalness: 0.0,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid sutil para dar textura al suelo (cuadriculado como en imagen)
const grid = new THREE.GridHelper(400, 80, 0xe05020, 0xe05020);
grid.material.opacity = 0.18;
grid.material.transparent = true;
grid.position.y = 0.01;
scene.add(grid);

/* ─────────────────────────────────────────────────────────
   PISTA CON MONTAÑA NATURAL — sin bordes feos, física real
───────────────────────────────────────────────────────── */
(function buildCleanTrack() {
  // =========================================================
  // PUNTOS DE CONTROL — Montaña GRANDE y natural
  // =========================================================
  const trackPoints = [
    new THREE.Vector3(-35, 0.1,  30),  // Inicio
    new THREE.Vector3(-40, 0.1,  10),  // Curva
    
    // MONTAÑA GRANDE (más natural, suave)
    new THREE.Vector3(-38, 1.2,  -5),  // Subida suave
    new THREE.Vector3(-35, 3.2, -10),  // PICO de la montaña (altura 3.2)
    new THREE.Vector3(-30, 2.5, -15),  // Bajada
    new THREE.Vector3(-20, 1.0, -20),  // Fin de montaña
    
    new THREE.Vector3(  0, 0.1, -25),  // Curva
    new THREE.Vector3( 15, 0.8, -15),  // Tope pequeño
    new THREE.Vector3( 25, 0.1,   0),  // Recta
    new THREE.Vector3( 30, 3.5,  15),  // ¡SALTO GRANDE!
    new THREE.Vector3( 20, 0.1,  25),  // Aterrizaje
    new THREE.Vector3(  0, 0.1,  30),  // Curva final
    new THREE.Vector3(-20, 0.5,  28),  // Último tope
    new THREE.Vector3(-35, 0.1,  30),  // Regreso
  ];

  const curve = new THREE.CatmullRomCurve3(trackPoints, true);
  const SEGMENTS = 400;
  const TRACK_W = 8.5;

  window._trackCurve = curve;

  // =========================================================
  // 1. BASE DE LA PISTA (oculta) — solo para colisiones
  // =========================================================
  // Esta capa NO se ve, solo sirve para que el carro choque
  const collisionPositions = [];
  const collisionIndices = [];

  for(let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const p = curve.getPoint(t);
    
    const tNext = (i + 1) / SEGMENTS;
    const pNext = curve.getPoint(tNext);
    
    const tan = new THREE.Vector3().subVectors(pNext, p).normalize();
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    
    // Capa de colisión: más angosta que la pista visual
    const colWidth = TRACK_W - 1.0;  // Un poco más angosta
    const colThickness = 0.2;         // Muy delgada (invisible)
    
    const left = p.clone().addScaledVector(norm, -colWidth * 0.5);
    const right = p.clone().addScaledVector(norm, colWidth * 0.5);
    
    // Punto inferior (un poco más abajo)
    const leftBottom = left.clone();
    leftBottom.y = p.y - colThickness;
    
    const rightBottom = right.clone();
    rightBottom.y = p.y - colThickness;
    
    // Punto superior (superficie)
    const leftTop = left.clone();
    leftTop.y = p.y;
    
    const rightTop = right.clone();
    rightTop.y = p.y;
    
    collisionPositions.push(
      leftBottom.x, leftBottom.y, leftBottom.z,
      rightBottom.x, rightBottom.y, rightBottom.z,
      leftTop.x, leftTop.y, leftTop.z,
      rightTop.x, rightTop.y, rightTop.z
    );
    
    if(i < SEGMENTS) {
      const b = i * 4;
      collisionIndices.push(b, b+1, b+2);
      collisionIndices.push(b+1, b+3, b+2);
      collisionIndices.push(b+2, b+3, b+6);
      collisionIndices.push(b+3, b+7, b+6);
    }
  }

  const collisionGeo = new THREE.BufferGeometry();
  collisionGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(collisionPositions), 3));
  collisionGeo.setIndex(collisionIndices);
  collisionGeo.computeVertexNormals();

  // Material INVISIBLE (no se renderiza)
  const collisionMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    visible: false,  // ¡No se ve!
    transparent: true,
    opacity: 0
  });

  const collisionMesh = new THREE.Mesh(collisionGeo, collisionMat);
  collisionMesh.receiveShadow = false;
  collisionMesh.castShadow = false;
  scene.add(collisionMesh);
  window._trackCollision = collisionMesh;  // Para colisiones

  // =========================================================
  // 2. PISTA VISUAL (rosa) — SOLO lo que se ve
  // =========================================================
  const visPositions = [];
  const visUvs = [];
  const visIndices = [];

  for(let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const p = curve.getPoint(t);
    
    const tNext = (i + 1) / SEGMENTS;
    const pNext = curve.getPoint(tNext);
    
    const tan = new THREE.Vector3().subVectors(pNext, p).normalize();
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    
    const left = p.clone().addScaledVector(norm, -TRACK_W * 0.5);
    const right = p.clone().addScaledVector(norm, TRACK_W * 0.5);
    
    // La pista visual va EXACTAMENTE en la superficie
    left.y = p.y + 0.02;   // +0.02 para evitar z-fighting
    right.y = p.y + 0.02;
    
    visPositions.push(left.x, left.y, left.z);
    visPositions.push(right.x, right.y, right.z);
    
    visUvs.push(0, i * 0.4);
    visUvs.push(1, i * 0.4);
    
    if(i < SEGMENTS) {
      const b = i * 2;
      visIndices.push(b, b+1, b+2);
      visIndices.push(b+1, b+3, b+2);
    }
  }

  const visGeo = new THREE.BufferGeometry();
  visGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(visPositions), 3));
  visGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(visUvs), 2));
  visGeo.setIndex(visIndices);
  visGeo.computeVertexNormals();

  const visMat = new THREE.MeshStandardMaterial({
    color: 0xe83a6f,
    roughness: 0.6,
    metalness: 0.05,
    emissive: 0x3a0f1a,
    emissiveIntensity: 0.15,
  });

  const visMesh = new THREE.Mesh(visGeo, visMat);
  visMesh.receiveShadow = true;
  visMesh.castShadow = false;
  scene.add(visMesh);
  window._trackMesh = visMesh;

  // =========================================================
  // 3. TOPES A CUADROS (opcional, los dejamos bonitos)
  // =========================================================
  const checkerW = 1.2;
  const checkerH = 0.15;  // Más delgados
  const checkerD = 1.2;
  const steps = 200;

  [-0.52, 0.52].forEach((side, sideIdx) => {
    for(let i = 0; i < steps; i++) {
      if(i % 3 === 0) continue;  // Espaciado para que no se vean tan densos
      
      const t = i / steps;
      const p = curve.getPoint(t);
      const pNext = curve.getPoint((i + 0.02) / steps);
      
      const tan = new THREE.Vector3().subVectors(pNext, p).normalize();
      const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      
      const pos = p.clone().addScaledVector(norm, side * (TRACK_W * 0.5 + 0.3));
      pos.y = p.y + 0.08;
      
      const isWhite = (i + sideIdx) % 2 === 0;
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(checkerW, checkerH, checkerD),
        new THREE.MeshStandardMaterial({
          color: isWhite ? 0xffffff : 0xc41e3a,
          roughness: 0.5,
        })
      );
      curb.position.copy(pos);
      curb.rotation.y = Math.atan2(tan.x, tan.z);
      
      curb.castShadow = true;
      curb.receiveShadow = true;
      scene.add(curb);
    }
  });

  console.log('%c🏁 Pista limpia con montaña natural', 'color:#e83a6f;font-weight:bold');
})();

/* ─────────────────────────────────────────────────────────
   RÍO ANIMADO — shader de agua con ondas y color
   Posición: serpentea al lado de la pista
───────────────────────────────────────────────────────── */
(function buildRiver(){
  // Trazado del río (paralelo a parte de la pista pero más irregular)
  const riverPoints = [
    new THREE.Vector3( 25, -0.1,  30),
    new THREE.Vector3( 28, -0.1,  10),
    new THREE.Vector3( 26, -0.1, -10),
    new THREE.Vector3( 18, -0.1, -22),
    new THREE.Vector3(  8, -0.1, -30),
    new THREE.Vector3( -5, -0.1, -28),
  ];
  const riverCurve  = new THREE.CatmullRomCurve3(riverPoints, false);
  const RIVER_SEG   = 60;
  const RIVER_W     = 5.5;

  const rPos = [], rUV = [], rIdx = [];

  for(let i = 0; i <= RIVER_SEG; i++){
    const t0 = i / RIVER_SEG;
    const t1 = Math.min((i + 0.01) / RIVER_SEG, 1);
    const p  = riverCurve.getPoint(t0);
    const p2 = riverCurve.getPoint(t1);
    const tan  = new THREE.Vector3().subVectors(p2, p).normalize();
    if(tan.length() < 0.001) tan.set(1,0,0);
    const norm = new THREE.Vector3(-tan.z, 0, tan.x);
    const L = p.clone().addScaledVector(norm, -RIVER_W * 0.5);
    const R = p.clone().addScaledVector(norm,  RIVER_W * 0.5);
    rPos.push(L.x, -0.1, L.z,  R.x, -0.1, R.z);
    rUV.push(0, t0 * 8,  1, t0 * 8);
    if(i < RIVER_SEG){
      const b = i*2;
      rIdx.push(b, b+1, b+2,  b+1, b+3, b+2);
    }
  }

  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rPos), 3));
  rGeo.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array(rUV), 2));
  rGeo.setIndex(rIdx);
  rGeo.computeVertexNormals();

  // Material agua: MeshStandardMaterial con envMap-like approach
  const waterMat = new THREE.MeshStandardMaterial({
    color:       0x2255ff,
    emissive:    0x001144,
    emissiveIntensity: 0.4,
    roughness:   0.05,
    metalness:   0.6,
    transparent: true,
    opacity:     0.82,
    side:        THREE.DoubleSide,
  });

  const riverMesh = new THREE.Mesh(rGeo, waterMat);
  riverMesh.receiveShadow = true;
  scene.add(riverMesh);
  window._riverMesh = riverMesh;

  // ── Espuma / orillas — tira clara a cada lado ───────────────
  [0.55, -0.55].forEach(side => {
    const foamPos = [], foamUV = [], foamIdx = [];
    for(let i = 0; i <= RIVER_SEG; i++){
      const t0 = i / RIVER_SEG;
      const t1 = Math.min((i+0.01)/RIVER_SEG, 1);
      const p  = riverCurve.getPoint(t0);
      const p2 = riverCurve.getPoint(t1);
      const tan  = new THREE.Vector3().subVectors(p2, p).normalize();
      if(tan.length() < 0.001) tan.set(1,0,0);
      const norm = new THREE.Vector3(-tan.z, 0, tan.x);
      const inner = p.clone().addScaledVector(norm, side * RIVER_W * 0.5);
      const outer = p.clone().addScaledVector(norm, side * (RIVER_W * 0.5 + 0.8));
      foamPos.push(inner.x,-0.05,inner.z, outer.x,-0.05,outer.z);
      foamUV.push(0,t0*6,  1,t0*6);
      if(i<RIVER_SEG){ const b=i*2; foamIdx.push(b,b+1,b+2,b+1,b+3,b+2); }
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(foamPos),3));
    fg.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(foamUV),2));
    fg.setIndex(foamIdx); fg.computeVertexNormals();
    const foam = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({
      color:0xffffff, emissive:0xaaddff, emissiveIntensity:0.5,
      transparent:true, opacity:0.65, roughness:0.9,
    }));
    scene.add(foam);
  });

  // ── Partículas de agua flotando sobre el río ────────────────
  const WATER_PARTS = 120;
  const wpPos = new Float32Array(WATER_PARTS * 3);
  const wpData = [];  // {t, offset, speed, y}

  for(let i = 0; i < WATER_PARTS; i++){
    const t  = Math.random();
    const p  = riverCurve.getPoint(t);
    const off = (Math.random() - 0.5) * RIVER_W * 0.8;
    wpPos[i*3]   = p.x + off;
    wpPos[i*3+1] = 0.15 + Math.random() * 0.3;
    wpPos[i*3+2] = p.z;
    wpData.push({ t, off, speed: 0.004 + Math.random() * 0.006 });
  }
  const wpGeo = new THREE.BufferGeometry();
  wpGeo.setAttribute('position', new THREE.BufferAttribute(wpPos, 3));
  const wpMesh = new THREE.Points(wpGeo, new THREE.PointsMaterial({
    color: 0x88ccff, size: 0.18, sizeAttenuation: true,
    transparent: true, opacity: 0.7, depthWrite: false,
  }));
  scene.add(wpMesh);
  window._riverParticles = { mesh: wpMesh, data: wpData, curve: riverCurve, W: RIVER_W };

  // Luz azul pulsante sobre el río
  const riverLight = new THREE.PointLight(0x2255ff, 2.5, 18);
  riverLight.position.set(22, 2, 5);
  scene.add(riverLight);
  window._riverLight = riverLight;

})();

/* ══════════════════════════════════════════════════════════════
   3. JEEP TÁCTICO — low-poly, estilo imagen de referencia
   Rojo oscuro / negro / faros amarillos brillantes
   Ruedas enormes, barra LED, capó musculoso
   FÍSICA: volteo real + recuperación girando ruedas (A/D en el suelo)
══════════════════════════════════════════════════════════════ */

const car = new THREE.Group();
scene.add(car);

/* estado del carro → ver objeto 'state' antes del tick */

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


/* ── 4. COLLIDERS — registro de obstáculos para colisiones ── */
const _pendingColliders = [];   // ← declarado ANTES de addCollider y makeTree
function addCollider(x, z, r){ _pendingColliders.push({x, z, r}); }

/* ═══════════════════════════════════════════════════════════
   5. MUNDO — Árboles animados, rocas, partículas de hojas
═══════════════════════════════════════════════════════════ */

// Registro de árboles para animación de viento
window._trees = [];

/* ─── TIPOS DE ÁRBOL ────────────────────────────────────────
   type 0: roble naranja — copa redondeada múltiple
   type 1: pino alto — cono apilado
   type 2: árbol de flor — copa rosa baja y ancha
   type 3: árbol amarillo — copa cúbica low-poly
───────────────────────────────────────────────────────── */
function makeTree(x, z, s=1, type=-1){
  const kind = type >= 0 ? type : Math.floor(Math.random() * 4);
  const g    = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.windPhase  = Math.random() * Math.PI * 2;
  g.userData.windSpeed  = 0.6 + Math.random() * 0.8;
  g.userData.treeScale  = s;

  // Trunk colors por tipo
  const trunkColor = [0x5c2e08, 0x3a2208, 0x6b2a10, 0x4a3010][kind];
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14*s, 0.22*s, (1.4 + kind*0.3)*s, 7),
    new THREE.MeshStandardMaterial({ color:trunkColor, roughness:0.95 })
  );
  trunk.position.y = (0.7 + kind*0.15)*s;
  trunk.castShadow = true;
  g.add(trunk);

  if(kind === 0){
    // Roble — 4 esferas naranjas irregulares (estilo imagen)
    const colors = [0xdd6611, 0xe07720, 0xcc5500, 0xf08830];
    [
      {ry:2.1, rs:1.4, dx:0,    dz:0},
      {ry:2.6, rs:1.0, dx:0.8,  dz:0.3},
      {ry:2.4, rs:0.9, dx:-0.7, dz:0.2},
      {ry:3.1, rs:0.75,dx:0.1,  dz:-0.5},
    ].forEach(({ry,rs,dx,dz},i) => {
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(rs*s, 7, 5),
        new THREE.MeshStandardMaterial({
          color: colors[i], roughness:0.8,
          emissive: colors[i], emissiveIntensity: 0.05
        })
      );
      l.position.set(dx*s, ry*s, dz*s);
      l.castShadow = true;
      g.add(l);
    });

  } else if(kind === 1){
    // Pino — 3 conos apilados
    [[0,1.5,1.6],[0,2.8,1.2],[0,3.8,0.85]].forEach(([dx,ry,rs]) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(rs*s, 2.0*s, 7),
        new THREE.MeshStandardMaterial({
          color: 0x224422, roughness:0.85,
          emissive:0x112211, emissiveIntensity:0.08
        })
      );
      cone.position.set(dx*s, ry*s, 0);
      cone.castShadow = true;
      g.add(cone);
    });

  } else if(kind === 2){
    // Árbol de flor — copa ancha baja, colores rosados-morados
    const flowerColors = [0xff44aa, 0xcc2288, 0xff66cc, 0xee3399];
    [
      {ry:1.8, rs:1.6, dx:0,    dz:0},
      {ry:2.2, rs:1.1, dx:0.9,  dz:0},
      {ry:2.2, rs:1.1, dx:-0.9, dz:0},
      {ry:2.5, rs:0.9, dx:0,    dz:0.8},
    ].forEach(({ry,rs,dx,dz},i) => {
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(rs*s, 6, 5),
        new THREE.MeshStandardMaterial({
          color: flowerColors[i], roughness:0.75,
          emissive: flowerColors[i], emissiveIntensity: 0.08
        })
      );
      l.position.set(dx*s, ry*s, dz*s);
      l.castShadow = true;
      g.add(l);
    });

  } else {
    // Árbol amarillo — copa cúbica low-poly (como imagen fondo)
    const yColors = [0xddaa00, 0xffcc22, 0xcc9900, 0xeebb11];
    [
      {ry:2.0, rw:2.4, rh:1.8, dx:0,   dz:0},
      {ry:3.2, rw:1.8, rh:1.4, dx:0.3, dz:0.2},
      {ry:2.6, rw:1.4, rh:1.2, dx:-0.5,dz:0.3},
    ].forEach(({ry,rw,rh,dx,dz},i) => {
      const l = new THREE.Mesh(
        new THREE.BoxGeometry(rw*s, rh*s, rw*s*0.85),
        new THREE.MeshStandardMaterial({
          color: yColors[i], roughness:0.8,
          emissive: yColors[i], emissiveIntensity: 0.06
        })
      );
      l.position.set(dx*s, ry*s, dz*s);
      l.rotation.y = Math.random() * Math.PI;
      l.castShadow = true;
      g.add(l);
    });
  }

  // Partículas de hojas flotando alrededor del árbol
  const LEAF_N = 18;
  const leafPos = new Float32Array(LEAF_N * 3);
  const leafData = [];
  for(let i = 0; i < LEAF_N; i++){
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 1.8 * s;
    leafPos[i*3]   = Math.cos(angle) * radius;
    leafPos[i*3+1] = 1.5*s + Math.random() * 2.5*s;
    leafPos[i*3+2] = Math.sin(angle) * radius;
    leafData.push({ angle, radius, speed: 0.3 + Math.random()*0.5, yOff: Math.random()*Math.PI*2 });
  }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  const leafColors = [
    [0xffaa44,0xff8822,0xffcc66,0xff6633],  // naranja
    [0x44ff88,0x22dd66,0x55ee99,0x33cc77],  // verde
    [0xff88cc,0xff44aa,0xffaadd,0xee3399],  // rosa
    [0xffdd22,0xffbb00,0xffee55,0xddaa00],  // amarillo
  ][kind];
  const leafMat = new THREE.PointsMaterial({
    color: leafColors[Math.floor(Math.random()*leafColors.length)],
    size: 0.18*s, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false,
  });
  const leafPts = new THREE.Points(leafGeo, leafMat);
  g.add(leafPts);
  g.userData.leafPts  = leafPts;
  g.userData.leafData = leafData;

  scene.add(g);
  window._trees.push(g);
  addCollider(x, z, (kind===1 ? 0.3 : 0.5)*s);
  return g;
}

function makeRock(x, z, s=1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  // Variedad de colores de roca
  const rockColors = [0x7a6a55, 0x6a5a8a, 0x8a7060, 0x5a6a7a];
  const r = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6*s, 0),
    new THREE.MeshStandardMaterial({
      color: rockColors[Math.floor(Math.random()*rockColors.length)],
      roughness:1, metalness:0.05
    })
  );
  r.scale.y = 0.5; r.rotation.y = Math.random()*Math.PI;
  r.position.y = 0.18*s; r.castShadow = r.receiveShadow = true;
  // Segundo fragmento de roca más pequeño al lado
  const r2 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.3*s, 0),
    r.material.clone()
  );
  r2.scale.y = 0.55; r2.rotation.y = Math.random()*Math.PI;
  r2.position.set(0.5*s, 0.1*s, 0.3*s);
  g.add(r); g.add(r2); scene.add(g);
  addCollider(x, z, 0.55*s);
}

// ── Poblar el mundo ──────────────────────────────────────────
// Árboles: distribuidos alrededor de la pista y el río
// type: 0=naranja, 1=pino, 2=flores, 3=amarillo

/* ─────────────────────────────────────────────────────────
   DISTRIBUCIÓN INTELIGENTE — árboles y rocas FUERA de la pista
───────────────────────────────────────────────────────── */
function isPointOnTrack(x, z, margin = 4.0) {
  // Busca la distancia mínima a la pista
  if (!window._trackCurve) return false;
  
  const curve = window._trackCurve;
  let minDist = Infinity;
  
  // Muestrear la curva cada cierto intervalo
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const p = curve.getPoint(t);
    const dx = p.x - x;
    const dz = p.z - z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < minDist) minDist = dist;
  }
  
  // Si está muy cerca de la pista, rechazar
  return minDist < margin;
}

// Generador de posiciones válidas (fuera de pista)
function getValidPosition(avoidRadius = 4.0, maxAttempts = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 40;  // entre 10 y 50 unidades del centro
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Verificar que no esté sobre la pista
    if (!isPointOnTrack(x, z, avoidRadius)) {
      return { x, z, valid: true };
    }
  }
  return { x: 999, z: 999, valid: false }; // punto de respaldo
}


// Árboles: 30 árboles bien distribuidos
const treeTypes = [0, 1, 2, 3];  // naranja, pino, flor, amarillo
for (let i = 0; i < 30; i++) {
  const pos = getValidPosition(5.0);
  if (pos.valid) {
    const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    const scale = 0.8 + Math.random() * 0.8;
    makeTree(pos.x, pos.z, scale, type);
  }
}

// Rocas: 12 rocas
for (let i = 0; i < 12; i++) {
  const pos = getValidPosition(5.5);
  if (pos.valid) {
    const scale = 0.7 + Math.random() * 0.8;
    makeRock(pos.x, pos.z, scale);
  }
}

// Árboles especiales (cerca de checkpoints, pero no encima)
const specialSpots = [
  { x: -14, z: -10, type: 2, scale: 1.2 },  // cerca cofre
  { x: 16, z: -8, type: 1, scale: 1.4 },    // cerca radio
  { x: 2, z: -24, type: 0, scale: 1.3 },    // cerca faro
  { x: -6, z: 14, type: 3, scale: 1.1 },    // cerca rocola
];
specialSpots.forEach(spot => {
  // Desplazar ligeramente para que no tape el checkpoint
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle) * 3;
  const dz = Math.sin(angle) * 3;
  makeTree(spot.x + dx, spot.z + dz, spot.scale, spot.type);
});

/* ── 6. PASTO GLB ─────────────────────────────────────────── */
function spawnGrass(model) {
  model.traverse(c => {
    if (!c.isMesh) return;
    c.castShadow = false;
    c.receiveShadow = true;
    if (c.material) {
      c.material.side = THREE.DoubleSide;
      c.material.alphaTest = 0.2;
    }
  });

  let placed = 0;
  const maxAttempts = 1000;
  
  for (let attempt = 0; attempt < maxAttempts && placed < GRASS_CFG.COUNT; attempt++) {
    // Posición aleatoria en un radio grande
    const angle = Math.random() * Math.PI * 2;
    const radius = 8 + Math.random() * 42;  // desde 8 hasta 50
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Verificar que no esté sobre la pista (margen más pequeño para pasto)
    if (!isPointOnTrack(x, z, 4.5)) {
      const clone = model.clone();
      clone.position.set(x, 0, z);
      clone.rotation.y = Math.random() * Math.PI * 2;
      
      // Variación de escala
      const s = GRASS_CFG.MIN_SCALE + Math.random() * (GRASS_CFG.MAX_SCALE - GRASS_CFG.MIN_SCALE);
      clone.scale.setScalar(s);
      
      scene.add(clone);
      placed++;
    }
  }
  
  console.log(`%c🌿 ${placed} mechones de pasto colocados`, 'color:#4a8c2a');
  
  // Si no alcanzamos la cuenta, ponemos algunos cerca de los bordes
  if (placed < GRASS_CFG.COUNT) {
    console.warn('No se alcanzó la cantidad deseada de pasto, usando posiciones de respaldo');
    // ... lógica de respaldo
  }
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

// Estado físico del carro — un solo objeto, nunca pierde scope
const state = {
  vel:      new THREE.Vector3(),  // velocidad XZ
  velY:     0,                    // velocidad vertical
  yaw:      0,                    // rotación Y (hacia dónde mira)
  roll:     0,                    // inclinación Z (volteo)
  rollVel:  0,                    // velocidad angular de volteo (rad/s)
  onGround: true,
  flipped:  false,
};

function tick(){
  requestAnimationFrame(tick);
  renderer.render(scene, camera);
  if(!gameOn) return;

  const dt  = Math.min(clock.getDelta(), 0.05);
  const t   = Date.now() * 0.001;

  /* ════════════════════════════════════════════════════════════
     FÍSICA PROPIA — sin motores externos
     Variables de estado (todas en scope de tick para claridad):
       carVel   → velocidad XZ (Three.Vector3, módulo)
       carVelY  → velocidad vertical
       carYaw   → ángulo de giro Y
       carRoll  → ángulo de volteo Z (rad) — calculado por física
       rollVel  → velocidad angular de volteo
       isOnGround
  ════════════════════════════════════════════════════════════ */

  // ── 1. GIRO (yaw) ─────────────────────────────────────────
  // Solo gira si hay algo de velocidad
  const spd = state.vel.length();
  const tf  = Math.min(spd / 10, 1.0);

  if(left())  state.yaw += THREE.MathUtils.degToRad(CFG.turn) * dt * tf;
  if(right()) state.yaw -= THREE.MathUtils.degToRad(CFG.turn) * dt * tf;

  // ── 2. TRACCIÓN ────────────────────────────────────────────
  _fwdDir.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));

  if(!state.flipped){
    if(fwd()) state.vel.addScaledVector(_fwdDir,  CFG.accel * dt);
    if(bwd()) state.vel.addScaledVector(_fwdDir, -(spd > 2 ? CFG.accel * 1.3 : CFG.accel * 0.5) * dt);
  }

  // Fricción y límite
  state.vel.multiplyScalar(state.onGround ? CFG.friction : 0.997);
  if(state.vel.length() > CFG.speed) state.vel.normalize().multiplyScalar(CFG.speed);

  // Mover en XZ
  car.position.x += state.vel.x * dt;
  car.position.z += state.vel.z * dt;

  // ── 3. GRAVEDAD Y SALTO ────────────────────────────────────
  if(jumpK() && state.onGround && !state.flipped){
    state.velY     = CFG.jumpForce;
    state.onGround = false;
  }

 state.velY -= CFG.gravity * dt;
 car.position.y += state.velY * dt;
  

  if(car.position.y <= 0){
    car.position.y = 0;
    // Efecto squash solo en aterrizajes duros
    const impact = Math.min(Math.abs(state.velY) / CFG.jumpForce, 1);
    if(impact > 0.3){
      car.scale.set(1 + impact*0.12, 1 - impact*0.18, 1 + impact*0.12);
      gsap.to(car.scale, {x:1,y:1,z:1, duration:0.2, ease:'elastic.out(1,0.5)'});
    }
    state.velY     = 0;
    state.onGround = true;
  }

// DETECCIÓN DE SUELO mejorada
let hitGround = false;
let groundY = -Infinity;

// Usar el mesh de colisión invisible
if (window._trackCollision) {
  // Posición del carro (usamos 4 puntos para mejor detección)
  const checkPoints = [
    car.position.clone(),
    car.position.clone().add(new THREE.Vector3( 0.8, 0,  0.8)),
    car.position.clone().add(new THREE.Vector3(-0.8, 0,  0.8)),
    car.position.clone().add(new THREE.Vector3( 0.8, 0, -0.8)),
    car.position.clone().add(new THREE.Vector3(-0.8, 0, -0.8)),
  ];
  
  // Raycaster para detectar el suelo
  const raycaster = new THREE.Raycaster();
  
  for (const point of checkPoints) {
    // Rayo hacia abajo desde un poco arriba
    raycaster.set(point.clone().add(new THREE.Vector3(0, 0.5, 0)), new THREE.Vector3(0, -1, 0));
    
    const intersects = raycaster.intersectObject(window._trackCollision);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitY = hit.point.y;
      
      if (hitY > groundY) {
        groundY = hitY;
        hitGround = true;
      }
    }
  }
}

// Aplicar colisión
if (hitGround) {
  const carBottom = car.position.y - 0.2;  // Altura de las ruedas
  
  if (carBottom < groundY + 0.1) {
    // Estamos tocando el suelo
    
    // Si estamos DEBAJO del suelo (por error), subir
    if (car.position.y < groundY + 0.2) {
      car.position.y = groundY + 0.2;
      
      // Rebote suave si caía rápido
      if (state.velY < -0.3) {
        state.velY = -state.velY * 0.25;
        // Sonido de aterrizaje
        tone(120 + Math.random()*30, 0.15, 'sawtooth', 0.08);
      } else {
        state.velY = 0;
      }
    }
    
    state.onGround = true;
  } else {
    // Estamos en el aire
    state.onGround = false;
  }
} else {
  // No hay suelo detectado (caída libre)
  state.onGround = false;
  
  // Suelo plano de respaldo (muy abajo)
  if (car.position.y < -5) {
    car.position.y = -5;
    state.velY = 0;
    state.onGround = true;
  }
}

// Visualizar si estamos en el aire o suelo (debug)
if (state.onGround) {
  document.body.style.borderBottom = '2px solid green';
} else {
  document.body.style.borderBottom = '2px solid red';
}

  // ── 4. FÍSICA DE VOLTEO ────────────────────────────────────
  // rollVel: velocidad angular Z en rad/s (persiste entre frames)
  // La gravedad crea torque si el carro no está vertical
  // Colisiones laterales añaden rollVel

  if(!state.flipped){
    // Inclinación visual suave en curvas
    const curveRoll = -(left() ? 1 : right() ? -1 : 0) * tf * (spd / CFG.speed) * 0.10;
    state.roll += (curveRoll - state.roll) * 9 * dt;
    state.roll  = Math.max(-0.18, Math.min(0.18, state.roll));

    // Si el rollVel externo (de una colisión) supera umbral → voltear
    if(Math.abs(state.rollVel) > 2.8 && state.onGround){
      state.flipped = true;
      state.roll    = state.rollVel > 0 ? 0.2 : -0.2; // inicio del volteo
      state.vel.multiplyScalar(0.2);
    }

  } else {
    // MODO VOLTEADO — física real de balanceo
    // Gravedad aplica torque proporcional al seno del ángulo
    // (como un péndulo invertido)
    const gravTorque = -Math.sin(state.roll) * 6.0;  // tira hacia 0 o hacia ±π
    state.rollVel   += gravTorque * dt;
    state.rollVel   *= 0.92; // amortiguación del suelo

    // // A/D aplican torque para ayudar a levantarse
    // if(left())  state.rollVel -= 4.5 * dt;
    // if(right()) state.rollVel += 4.5 * dt;

    state.roll    += state.rollVel * dt;

    // Limitar a ±π (no da vueltas infinitas)
    state.roll = Math.max(-Math.PI, Math.min(Math.PI, state.roll));

    // Bloquear movimiento mientras está volteado
    state.vel.multiplyScalar(0.88);

    // ¿Recuperado? — dentro de ±18° de vertical
    if(Math.abs(state.roll) < 0.32 && state.onGround){
      state.flipped  = false;
      state.roll     = 0;
      state.rollVel  = 0;
      gsap.to(car.scale, {x:1.1,y:0.85,z:1.1, duration:0.1,
        onComplete:()=>gsap.to(car.scale,{x:1,y:1,z:1,duration:0.3,ease:'bounce.out'})});
    }

    // Hint HUD
    const fh = document.getElementById('flip-hint');
    if(fh) fh.classList.add('visible');
  }

  // Quitar hint cuando no está volteado
  if(!state.flipped){
    const fh = document.getElementById('flip-hint');
    if(fh) fh.classList.remove('visible');
  }

  // Aplicar rotaciones al mesh
  car.rotation.y = state.yaw;
  car.rotation.z = state.roll;

  // ── 5. COLISIONES CON OBSTÁCULOS ──────────────────────────
  // Los objetos del mundo registran colliders circulares (XZ)
  // Al chocar, además de separar el carro, añadimos rollVel
  const CAR_R = 0.9;
  for(const col of _pendingColliders){
    const dx = car.position.x - col.x;
    const dz = car.position.z - col.z;
    const d  = Math.sqrt(dx*dx + dz*dz);
    const md = CAR_R + col.r;
    if(d < md && d > 0.001){
      // Separar
      const nx = dx/d, nz = dz/d;
      car.position.x += nx * (md - d);
      car.position.z += nz * (md - d);

      // Impacto en dirección normal
      const dot = state.vel.x*nx + state.vel.z*nz;
      if(dot < 0){
        state.vel.x -= dot * nx * 1.3;
        state.vel.z -= dot * nz * 1.3;

        // Componente lateral del impacto → genera rollVel (volteo real)
        // cross2D = componente lateral del impacto respecto del eje del carro
        const cross = nx * Math.cos(state.yaw) - nz * Math.sin(state.yaw);
        const impactStrength = Math.abs(dot);  // velocidad de impacto

        // Solo voltea si el impacto es lateral y fuerte
        if(impactStrength > CFG.speed * 0.25 && Math.abs(cross) > 0.3){
          state.rollVel += cross * impactStrength * 0.12;
          tone(100 + Math.random()*40, 0.35, 'sawtooth', 0.10); // SFX choque
        }
      }
    }
  }

  // ── 6. SUSPENSIÓN visual ───────────────────────────────────
  if(state.onGround && !state.flipped && spd > 2)
    car.position.y += Math.sin(t * spd * 0.9) * 0.004 * Math.min(spd / CFG.speed, 1);

  // ── 7. RUEDAS ─────────────────────────────────────────────
  wheelMeshes.forEach(w => { w.rotation.x -= spd * dt * 1.6; });

  // Ruedas delanteras: giro de dirección en Y
  const targetSteer = left() ? 0.42 : right() ? -0.42 : 0;
  frontPivots.forEach(p => {
    p.rotation.y += (targetSteer - p.rotation.y) * 10 * dt;
  });

  // ── 8. EFECTOS ────────────────────────────────────────────
  carGlow.intensity = 0.4 + (spd / CFG.speed) * 2.8;
  carGlow.color.setHSL(0.54 + Math.sin(t * 1.5) * 0.06, 1, 0.55);

  if(spd > CFG.speed * 0.75 && state.onGround && (left()||right()) && Math.random() < 0.012)
    tone(160 + Math.random()*40, 0.08, 'sawtooth', 0.04);

  // ── 9. CÁMARA ─────────────────────────────────────────────
  // Siempre usa car.position (actualizado arriba) y state.yaw
  // Lerp adaptativo: más rígido a más velocidad
  const zZ = CAM_OFFSET.z * camZoom;
  const zY = CAM_OFFSET.y * camZoom;

  _camPos.set(
    car.position.x + Math.sin(state.yaw) * zZ,
    car.position.y + zY,
    car.position.z + Math.cos(state.yaw) * zZ
  );

  const adaptiveLerp = 0.05 + (spd / CFG.speed) * 0.20;
  camera.position.lerp(_camPos, adaptiveLerp);

  // Lookahead suave — mira un poco adelante del carro
  const laDist = 1.8 * (spd / CFG.speed);
  _camLook.set(
    car.position.x - Math.sin(state.yaw) * laDist,
    car.position.y + 0.8,
    car.position.z - Math.cos(state.yaw) * laDist
  );
  camera.lookAt(_camLook);

  // ── 10. VIENTO + MUNDO ANIMADO ───────────────────────────
  updateWind(dt);

  // Polvo de fondo
  if(window._dustPts) window._dustPts.rotation.y += dt * 0.015;

  // Pasto GLB — ondea con el viento
  if(window._grassMeshes) window._grassMeshes.forEach((m,i) => {
    m.rotation.x = Math.sin(t*0.9+i*0.3)*0.038;
    m.rotation.z = Math.sin(t*0.7+i*0.2)*0.028;
  });

  // Jukebox light
  if(window._jukeboxLight) window._jukeboxLight.intensity = 2.5 + Math.sin(t*4)*1.5;

  // ── ÁRBOLES: viento suave + hojas orbitando ──────────────
  if(window._trees) window._trees.forEach((tree, ti) => {
    const ph   = tree.userData.windPhase  || 0;
    const spd2 = tree.userData.windSpeed  || 1;
    const sc   = tree.userData.treeScale  || 1;

    // Bamboleo del tronco entero (eje X y Z levemente)
    const sway = Math.sin(t * spd2 + ph) * 0.018 * sc;
    tree.rotation.x = sway;
    tree.rotation.z = Math.cos(t * spd2 * 0.7 + ph) * 0.012 * sc;

    // Animar partículas de hojas — cada hoja orbita y flota
    const lp = tree.userData.leafPts;
    const ld = tree.userData.leafData;
    if(lp && ld){
      const pos = lp.geometry.attributes.position;
      ld.forEach((leaf, i) => {
        leaf.angle += leaf.speed * dt;
        const px = Math.cos(leaf.angle) * leaf.radius;
        const pz = Math.sin(leaf.angle) * leaf.radius;
        const py = 1.5*sc + Math.sin(t*0.8 + leaf.yOff) * 0.35*sc
                   + Math.cos(leaf.angle * 0.5) * 0.2*sc;
        pos.setXYZ(i, px, py, pz);
      });
      pos.needsUpdate = true;

      // Pulso de opacidad — parpadeo suave de las hojas
      lp.material.opacity = 0.65 + Math.sin(t * 1.2 + ph) * 0.2;
    }
  });

  // ── RÍO: olas de color + partículas de agua ──────────────
  // Color del agua oscila entre azul eléctrico y cian-turquesa
  if(window._riverMesh){
    const hue = 0.58 + Math.sin(t * 0.4) * 0.06;    // azul ↔ cian
    const sat = 0.85 + Math.sin(t * 0.9) * 0.1;
    const lit = 0.38 + Math.sin(t * 0.6) * 0.08;
    window._riverMesh.material.color.setHSL(hue, sat, lit);
    window._riverMesh.material.emissive.setHSL(hue, 1, 0.12 + Math.sin(t*1.1)*0.06);
    window._riverMesh.material.emissiveIntensity = 0.35 + Math.sin(t*0.7)*0.15;

    // Desplazar UVs para simular flujo del agua
    // (Three.js no tiene offsetU nativo fácil, usamos rotation del mesh como proxy visual)
    window._riverMesh.position.y = -0.05 + Math.sin(t * 1.8) * 0.015; // microondas
  }

  // Partículas de agua flotantes — se mueven a lo largo del río
  if(window._riverParticles){
    const { mesh, data, curve, W } = window._riverParticles;
    const pos = mesh.geometry.attributes.position;
    data.forEach((p, i) => {
      p.t = (p.t + p.speed * dt) % 1;
      const pt  = curve.getPoint(p.t);
      // Calcular normal para el offset lateral
      const pt2 = curve.getPoint((p.t + 0.01) % 1);
      const tan = new THREE.Vector3().subVectors(pt2, pt).normalize();
      if(tan.length() < 0.001) tan.set(1,0,0);
      const nor = new THREE.Vector3(-tan.z, 0, tan.x);
      pos.setXYZ(i,
        pt.x + nor.x * p.off,
        0.12 + Math.sin(t * 2.2 + i * 0.4) * 0.08,
        pt.z + nor.z * p.off
      );
    });
    pos.needsUpdate = true;
    // Pulseo de color de las partículas de agua
    const wHue = 0.55 + Math.sin(t*0.5)*0.08;
    mesh.material.color.setHSL(wHue, 1, 0.7);
    mesh.material.opacity = 0.5 + Math.sin(t*1.4)*0.2;
  }

  // Luz del río pulsa y cambia de color
  if(window._riverLight){
    const rl = window._riverLight;
    rl.intensity = 1.8 + Math.sin(t * 1.1) * 0.8;
    rl.color.setHSL(0.58 + Math.sin(t*0.3)*0.08, 1, 0.5);
  }

  // Cielo: cambio sutil del fondo (amanecer ↔ atardecer)
  const skyH = 0.72 + Math.sin(t * 0.05) * 0.04;
  scene.background.setHSL(skyH, 0.7, 0.08 + Math.sin(t*0.04)*0.02);

  // ── 11. CHECKPOINTS ───────────────────────────────────────
  _car2D.set(car.position.x, car.position.z);
  closestCp = null;
  let minD  = Infinity;

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
console.log('%c💛 Para Ámbar v4 — con amor', 'color:#ffd60a;font-size:1.2rem;font-weight:bold');