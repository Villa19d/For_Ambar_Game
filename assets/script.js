/* ════════════════════════════════════════════════════════════════
   script.js — Para Ámbar 💛  v3.0
   ────────────────────────────────────────────────────────────────
   NOVEDADES v3:
   • Carrito más rápido y bien posicionado (no hundido)
   • Colisiones simples con objetos del mundo (rocas, árboles)
   • Viento visual: partículas que vuelan con dirección
   • Pasto: mechones verdes esparcidos por el mapa
   • Rocola interactiva: 4ª parada — cambia la música con ←→
   • Árbol decorativo, rocas y vallas de madera
════════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────────────
   0. CONFIGURACIÓN — EDITA AQUÍ SIN MIEDO
──────────────────────────────────────────────────────────────── */

// ── Velocidad y manejo del carrito ──────────────────────────────
const CFG = {
  speed:    38,    // velocidad máxima (unidades/s)
  accel:    90,    // qué tan rápido alcanza la velocidad máxima
  friction: 0.84,  // 0=resbaladizo  1=frena al instante
  turn:     170,   // grados/segundo de giro
  camLerp:  0.09,  // suavidad de cámara (0.01=muy suave, 1=rígida)
  jumpForce: 12,   // impulso vertical al saltar
  gravity:   28,   // gravedad (m/s²) — más alto = cae más rápido
};

// ── Checkpoints ──────────────────────────────────────────────────
const CHECKPOINTS = [
  { id:'modal-1', label:'El Cofre',  icon:'🗝️', x:-14, z:-10, color:0xc9963c, emissive:0x6b4d10 },
  { id:'modal-2', label:'La Radio',  icon:'📻', x: 16, z: -8, color:0xe8714a, emissive:0x7a2c0f },
  { id:'modal-3', label:'El Faro',   icon:'🏮', x:  2, z:-24, color:0xa8d4a0, emissive:0x2a5c25 },
  // La rocola es el 4° punto — NO cuenta para los 3 descubiertos
  { id:'jukebox', label:'La Rocola', icon:'🎵', x:-6,  z: 14, color:0xd4a8ff, emissive:0x4a1a8c, isJukebox:true },
];

const TRIGGER_DIST = 3.5;

// ── Carta ────────────────────────────────────────────────────────
const CARTA_TEXTO =
`Hay lugares en el mundo que no están en ningún mapa,
pero que existen porque tú los iluminaste.

Este pequeño rincón lo construí pensando en ti,
en tu forma de reír cuando algo te sorprende,
y en cómo todo se vuelve más bonito cuando estás cerca.

Gracias por ser mi lugar favorito.`;

// ── Playlist de la Rocola ────────────────────────────────────────
// Para usar canciones reales: pon archivos .mp3 en una carpeta /music/
// y cambia el src de cada canción. Por ahora son tonos sintéticos.
const SONGS = [
  { title: 'Canción #1 — Artista', color: '#c9963c' },
  { title: 'Canción #2 — Artista', color: '#e8714a' },
  { title: 'Canción #3 — Artista', color: '#a8d4a0' },
  { title: 'Canción #4 — Artista', color: '#d4a8ff' },
];
let currentSong = 0;
let jukeboxOpen = false;


/* ────────────────────────────────────────────────────────────────
   1. RENDERER + ESCENA + CÁMARA + LUCES
──────────────────────────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('webgl-canvas'),
  antialias: true,
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

// Cámara — vista cenital inclinada estilo Bruno Simon
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 150);
// Offset: la cámara está siempre 16u arriba y 13u detrás del carrito
const CAM_OFFSET = new THREE.Vector3(0, 16, 13);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

// Luces
scene.add(new THREE.HemisphereLight(0xffe4b5, 0x3d1a04, 0.9));

const sun = new THREE.DirectionalLight(0xffd580, 2.4);
sun.position.set(15, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -60;
sun.shadow.camera.right = sun.shadow.camera.top   =  60;
sun.shadow.camera.far = 120;
sun.shadow.bias = -0.001;
scene.add(sun);

const fill = new THREE.PointLight(0xff7c2a, 1.2, 80);
fill.position.set(-8, 4, 5);
scene.add(fill);


/* ────────────────────────────────────────────────────────────────
   2. SUELO
──────────────────────────────────────────────────────────────── */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0xb85e2e, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Cuadrícula decorativa muy sutil
const grid = new THREE.GridHelper(400, 120, 0x9a4c22, 0x9a4c22);
grid.material.opacity = 0.12;
grid.material.transparent = true;
grid.position.y = 0.01;
scene.add(grid);


/* ────────────────────────────────────────────────────────────────
   3. CARRITO
   El carrito vive en Y=0 y tiene altura propia de sus piezas.
   La rueda tiene radio 0.32 → su centro queda en Y=0.32
   El cuerpo tiene height 0.65 → su centro en Y=0.32+0.32=0.64
──────────────────────────────────────────────────────────────── */

const car = new THREE.Group();
// El grupo está en Y=0 (suelo). Las piezas tienen Y positivo.
scene.add(car);

// Cuerpo principal
const carBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.65, 2.4),
  new THREE.MeshStandardMaterial({ color: 0xd63a2f, roughness: 0.22, metalness: 0.38 })
);
// Centro del cuerpo: radio_rueda + mitad_altura_cuerpo = 0.32 + 0.325 = 0.645
carBody.position.y = 0.645;
carBody.castShadow = true;
car.add(carBody);

// Cabina
const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.55, 1.1),
  new THREE.MeshStandardMaterial({ color: 0xeb5a4e, roughness: 0.18, metalness: 0.22 })
);
cabin.position.set(0, 1.27, -0.3);
cabin.castShadow = true;
car.add(cabin);

// Parabrisas
const glass = new THREE.Mesh(
  new THREE.BoxGeometry(1.05, 0.38, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.8, transparent: true, opacity: 0.7 })
);
glass.position.set(0, 1.3, 0.26);
car.add(glass);

// Ruedas — radio 0.32, su centro debe estar a Y=0.32 desde el suelo
const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 20);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const rimGeo   = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12);
const rimMat   = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });
const wheelMeshes = [];

// [x, z] posición de cada rueda — Y siempre 0.32 (radio de la rueda)
[[0.78, 0.78], [-0.78, 0.78], [0.78, -0.78], [-0.78, -0.78]].forEach(([x, z]) => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.z = Math.PI / 2;      // girar para que quede como rueda
  w.position.set(x, 0.32, z);      // Y=0.32 → toca el suelo perfectamente
  w.castShadow = true;
  car.add(w);
  wheelMeshes.push(w);

  const r = new THREE.Mesh(rimGeo, rimMat);
  r.rotation.z = Math.PI / 2;
  r.position.set(x, 0.32, z);
  car.add(r);
});

// ── Estado del movimiento ─────────────────────────────────────
const carVel    = new THREE.Vector3(); // velocidad horizontal
let   carYaw    = 0;                  // rotación Y del carrito
let   carVelY   = 0;                  // velocidad vertical (salto)
let   isOnGround = true;              // true cuando toca el suelo

// ── Objetos de colisión: círculos en XZ ──────────────────────
// Cada objeto colisionable se registra como { x, z, r } (círculo)
const colliders = [];


/* ────────────────────────────────────────────────────────────────
   4. MUNDO — Objetos decorativos + colisiones
   Funciones helper para crear elementos reutilizables
──────────────────────────────────────────────────────────────── */

/**
 * Añade un colisionable circular al mundo.
 * El carrito rebotará al chocar contra él.
 */
function addCollider(x, z, r) {
  colliders.push({ x, z, r });
}

/**
 * Árbol estilizado: tronco cilíndrico + copa esférica
 */
function makeTree(x, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Tronco
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.25 * scale, 1.8 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.9 })
  );
  trunk.position.y = 0.9 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  // Copa (3 esferas escalonadas)
  [
    { ry: 2.2 * scale, rs: 1.2 * scale, c: 0x3a7c2e },
    { ry: 3.2 * scale, rs: 0.95 * scale, c: 0x4a9c3e },
    { ry: 4.0 * scale, rs: 0.7 * scale, c: 0x5ab44e },
  ].forEach(({ ry, rs, c }) => {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(rs, 8, 6),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })
    );
    leaf.position.y = ry;
    leaf.castShadow = true;
    g.add(leaf);
  });

  scene.add(g);
  addCollider(x, z, 0.4 * scale); // colisión con el tronco
  return g;
}

/**
 * Roca: esfera aplanada y deformada visualmente
 */
function makeRock(x, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6 * scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 1.0 })
  );
  rock.scale.y = 0.5;              // aplanar
  rock.rotation.y = Math.random() * Math.PI;
  rock.position.y = 0.18 * scale;
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);

  scene.add(g);
  addCollider(x, z, 0.55 * scale);
  return g;
}

/**
 * Mechón de pasto: varias láminas delgadas que apuntan arriba
 * (instanced geometry — eficiente para muchos)
 */
function makeGrassClump(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const bladeGeo = new THREE.PlaneGeometry(0.12, 0.45);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x4a8c2a,
    roughness: 1,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(
      (Math.random() - 0.5) * 0.3,
      0.225,
      (Math.random() - 0.5) * 0.3
    );
    blade.rotation.y = (i / 6) * Math.PI + Math.random() * 0.4;
    blade.rotation.z = (Math.random() - 0.5) * 0.3; // inclinación
    g.add(blade);
  }

  scene.add(g);
}

/**
 * Valla de madera: postes + tablas horizontales
 */
function makeFence(x, z, length = 5, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x8b5c32, roughness: 0.85 });

  const posts = Math.floor(length / 1.5) + 1;
  for (let i = 0; i < posts; i++) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.2, 0.12),
      postMat
    );
    post.position.set(i * 1.5 - length / 2, 0.6, 0);
    post.castShadow = true;
    g.add(post);
  }

  // Tablas horizontales
  [0.35, 0.75].forEach(yOff => {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.12, 0.07),
      boardMat
    );
    board.position.set(0, yOff, 0);
    board.castShadow = true;
    g.add(board);
  });

  scene.add(g);
}

// ── Poblar el mapa ────────────────────────────────────────────

// Árboles esparcidos
makeTree( -8,  -18, 1.2);
makeTree( 10,  -20, 1.0);
makeTree(-18,   -4, 1.4);
makeTree( 20,    8, 1.1);
makeTree( -4,   18, 0.9);
makeTree( 24,  -16, 1.3);
makeTree(-22,   12, 1.0);
makeTree(  8,   22, 1.2);
makeTree(-14,   20, 0.85);

// Rocas
makeRock(  6,  -8, 1.0);
makeRock(-10,  12, 1.3);
makeRock( 18,   4, 0.8);
makeRock( -4,  -6, 0.9);
makeRock( 14,  18, 1.1);
makeRock(-18, -14, 1.2);

// ── PASTO — InstancedMesh (eficiente para miles de instancias) ──
// En lugar de crear 800 Mesh separados (lento), creamos 1 InstancedMesh
// que dibuja la misma geometría 800 veces en posiciones distintas.
// Esto es como Bruno Simon lo haría — eficiente y denso visualmente.
(function buildGrass() {
  const GRASS_COUNT  = 800;
  const CLUMP_BLADES = 5;      // láminas por mechón
  const TOTAL        = GRASS_COUNT * CLUMP_BLADES;

  // Geometría compartida: una lámina plana
  const bladeGeo = new THREE.PlaneGeometry(0.13, 0.55);

  // Dos colores de pasto para variedad
  const colors = [0x4a8c2a, 0x3d7a22, 0x5da030, 0x6ab034];

  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a8c2a,
    roughness: 1.0,
    side: THREE.DoubleSide,
    alphaTest: 0.1,
  });

  const mesh = new THREE.InstancedMesh(bladeGeo, mat, TOTAL);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  let idx = 0;

  for (let i = 0; i < GRASS_COUNT; i++) {
    // Distribución polar: más densa cerca del centro, llega lejos
    const angle  = Math.random() * Math.PI * 2;
    const radius = 3 + Math.pow(Math.random(), 0.6) * 38;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;

    // Evitar colocar pasto encima del carrito inicial
    if (Math.abs(cx) < 2.5 && Math.abs(cz) < 2.5) continue;

    const scale = 0.7 + Math.random() * 0.7;

    for (let b = 0; b < CLUMP_BLADES; b++) {
      // Cada lámina se mueve un poco dentro del mechón
      const bx = cx + (Math.random() - 0.5) * 0.5;
      const bz = cz + (Math.random() - 0.5) * 0.5;

      dummy.position.set(bx, 0.275 * scale, bz);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.3,          // inclinación aleatoria
        (b / CLUMP_BLADES) * Math.PI + Math.random() * 0.5, // abanico
        0
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx++, dummy.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;

  // Guardar referencia para animar el pasto con el viento en el tick
  window._grassMesh = mesh;
})();

// Vallas decorativas alrededor del mapa
makeFence(-12,  -4,  8, 0);
makeFence(  6,  -4,  6, 0);
makeFence( 10,  10,  6, Math.PI / 2);
makeFence(-16,  10,  8, Math.PI / 2);


/* ────────────────────────────────────────────────────────────────
   5. CHECKPOINTS + ROCOLA
──────────────────────────────────────────────────────────────── */

const cpObjects = [];

CHECKPOINTS.forEach(cfg => {
  const g = new THREE.Group();
  g.position.set(cfg.x, 0, cfg.z);
  scene.add(g);

  if (cfg.isJukebox) {
    // ── Rocola especial ──────────────────────────────────────
    buildJukebox(g, cfg.color);
    cpObjects.push({ cfg, cube: null, mat: null, triggered: false, wasInRange: false, isJukebox: true });
    addCollider(cfg.x, cfg.z, 1.2);
    return;
  }

  // ── Checkpoint estándar ───────────────────────────────────
  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0x2e1608, roughness: 0.8 })
  );
  base.position.y = 0.15;
  base.castShadow = base.receiveShadow = true;
  g.add(base);

  // Columna
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 2.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.7 })
  );
  col.position.y = 1.7;
  col.castShadow = true;
  g.add(col);

  // Cubo flotante luminoso
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    emissive: cfg.emissive,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.4,
  });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat);
  cube.position.y = 3.6;
  cube.castShadow = true;
  g.add(cube);

  // Luz de color
  const pt = new THREE.PointLight(cfg.color, 2.2, 16);
  pt.position.y = 3.8;
  g.add(pt);

  // Etiqueta — NO usar Object.assign con propiedades de Three.js (son read-only)
  // En su lugar creamos el sprite, movemos con .position.set() y luego lo añadimos
  const label = makeLabel(cfg.icon + ' ' + cfg.label);
  label.position.set(0, 5.4, 0);
  g.add(label);

  cpObjects.push({ cfg, cube, mat, triggered: false, wasInRange: false, isJukebox: false });
});

/**
 * Construye la rocola 3D con colores y formas vistosas
 */
function buildJukebox(parent, color) {
  const matBody = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.3, metalness: 0.6 });
  const matAccent = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.5 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x88aaff, roughness: 0, metalness: 1, transparent: true, opacity: 0.5 });

  // Cuerpo principal
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.9), matBody);
  body.position.y = 1.2;
  body.castShadow = true;
  parent.add(body);

  // Parte superior redondeada (arco)
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.9, 16, 1, false, 0, Math.PI), matBody);
  top.position.set(0, 2.4, 0);
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  parent.add(top);

  // Pantalla de "vidrio"
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.05), matGlass);
  screen.position.set(0, 1.6, 0.48);
  parent.add(screen);

  // Franjas de acento neón
  [-0.5, 0, 0.5].forEach(xOff => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.02), matAccent);
    stripe.position.set(xOff, 1.2, 0.46);
    parent.add(stripe);
  });

  // Botones
  [[-0.3, 0.7], [0, 0.7], [0.3, 0.7]].forEach(([bx, by]) => {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10),
      new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0x880022, emissiveIntensity: 0.8 })
    );
    btn.position.set(bx, by, 0.48);
    btn.rotation.x = Math.PI / 2;
    parent.add(btn);
  });

  // Luz puntual de color
  const pt = new THREE.PointLight(color, 3.0, 18);
  pt.position.set(0, 2, 1);
  parent.add(pt);
  window._jukeboxLight = pt;   // referencia para animar

  // Etiqueta
  const jukeLabel = makeLabel('🎵 La Rocola');
  jukeLabel.position.set(0, 4.0, 0);
  parent.add(jukeLabel);
}

function makeLabel(text) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(20,10,4,0.8)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 20);
  ctx.fill();
  ctx.fillStyle = '#f5e8d0';
  ctx.font = 'bold 44px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv),
    transparent: true,
    depthTest: false,
  }));
  sp.scale.set(4.5, 1.1, 1);
  return sp;
}


/* ────────────────────────────────────────────────────────────────
   6. VIENTO — partículas que se mueven con dirección
──────────────────────────────────────────────────────────────── */

// Cada partícula de viento tiene posición y velocidad propias
const WIND_COUNT  = 200;
const windPositions = new Float32Array(WIND_COUNT * 3);
const windVelocities = [];

// Dirección global del viento (cambia suavemente con el tiempo)
const windDir = new THREE.Vector3(1, 0.1, 0.3).normalize();
const WIND_SPEED = 8; // unidades/segundo

for (let i = 0; i < WIND_COUNT; i++) {
  windPositions[i * 3]     = (Math.random() - 0.5) * 80;
  windPositions[i * 3 + 1] = Math.random() * 3;          // baja altura
  windPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  windVelocities.push(0.5 + Math.random() * 1.5);         // velocidad individual
}

const windGeo = new THREE.BufferGeometry();
windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));

const windMat = new THREE.PointsMaterial({
  color: 0xddccaa,
  size: 0.12,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});

const windParticles = new THREE.Points(windGeo, windMat);
scene.add(windParticles);

/**
 * Actualiza las posiciones del viento cada frame.
 * Cuando una partícula sale del "área", reaparece del lado opuesto.
 */
function updateWind(dt) {
  const pos = windGeo.attributes.position.array;
  // El viento rota suavemente con el tiempo
  const t = Date.now() * 0.0002;
  const wx = Math.cos(t) * WIND_SPEED;
  const wz = Math.sin(t * 0.7) * WIND_SPEED * 0.5;

  for (let i = 0; i < WIND_COUNT; i++) {
    const spd = windVelocities[i];
    pos[i * 3]     += wx * spd * dt;
    pos[i * 3 + 1] += 0.3 * spd * dt; // sube un poco
    pos[i * 3 + 2] += wz * spd * dt;

    // Reaparecer en el mapa si sale del rango
    if (pos[i * 3]     >  40) pos[i * 3]     = -40;
    if (pos[i * 3]     < -40) pos[i * 3]     =  40;
    if (pos[i * 3 + 1] >   4) pos[i * 3 + 1] = 0.1;
    if (pos[i * 3 + 2] >  40) pos[i * 3 + 2] = -40;
    if (pos[i * 3 + 2] < -40) pos[i * 3 + 2] =  40;
  }
  windGeo.attributes.position.needsUpdate = true; // decirle a Three.js que cambió
}

// Partículas de polvo dorado (ambiente)
(function () {
  const n = 180, r = 55, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * r;
    pos[i * 3 + 1] = Math.random() * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xc9963c, size: 0.06, sizeAttenuation: true,
    transparent: true, opacity: 0.4, depthWrite: false,
  }));
  scene.add(pts);
  window._dustPts = pts;
})();


/* ────────────────────────────────────────────────────────────────
   7. TECLADO
──────────────────────────────────────────────────────────────── */

const keys = new Set();
window.addEventListener('keydown', e => {
  keys.add(e.key);
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
    e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.key));

const pressing = (...k) => k.some(x => keys.has(x));
const fwd   = () => pressing('ArrowUp',    'w', 'W');
const bwd   = () => pressing('ArrowDown',  's', 'S');
const left  = () => pressing('ArrowLeft',  'a', 'A');
const right = () => pressing('ArrowRight', 'd', 'D');
const openK = () => pressing('e', 'E');
const jumpK = () => pressing(' ');          // ESPACIO = saltar


/* ────────────────────────────────────────────────────────────────
   8. AUDIO — sintetizador + control de la Rocola
──────────────────────────────────────────────────────────────── */

let _actx = null;
const actx = () => _actx || (_actx = new (AudioContext || webkitAudioContext)());

function tone(freq, dur, type = 'sine', vol = 0.18) {
  try {
    const c = actx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  } catch (_) {}
}

// Sintetiza una "melodía" de demo según el índice de canción
// Reemplaza esto con Howl() + archivos .mp3 reales cuando los tengas
let jukeboxOscillator = null;
let jukeboxGain       = null;

function startJukeboxSong(index) {
  stopJukeboxSong();
  const freqs = [
    [261, 329, 392, 523], // Do Mi Sol Do — acorde mayor
    [220, 277, 330, 440], // La Do Mi La
    [196, 247, 294, 392], // Sol Si Re Sol
    [174, 220, 261, 349], // Fa La Do Fa
  ][index % 4];

  try {
    const c = actx();
    jukeboxGain = c.createGain();
    jukeboxGain.gain.setValueAtTime(0.12, c.currentTime);
    jukeboxGain.connect(c.destination);

    // Arpeggio simple en loop
    let beat = 0;
    const playBeat = () => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(jukeboxGain);
      o.type = 'triangle';
      o.frequency.value = freqs[beat % freqs.length];
      g.gain.setValueAtTime(0.5, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      o.start(); o.stop(c.currentTime + 0.4);
      beat++;
    };

    // Tocar cada 400ms
    playBeat();
    jukeboxOscillator = setInterval(playBeat, 400);
  } catch (_) {}
}

function stopJukeboxSong() {
  if (jukeboxOscillator) { clearInterval(jukeboxOscillator); jukeboxOscillator = null; }
}

const sfxProx = () => tone(660, 0.18, 'sine', 0.14);
const sfxOpen = () => {
  tone(523, 0.1, 'triangle', 0.13);
  setTimeout(() => tone(784, 0.2, 'triangle', 0.13), 90);
};


/* ────────────────────────────────────────────────────────────────
   9. MODALES + ROCOLA UI
──────────────────────────────────────────────────────────────── */

let currentModal = null;
let discovered   = 0;
const discEl  = document.getElementById('disc-count');
const hintEl  = document.getElementById('proximity-hint');

function openModal(id) {
  if (currentModal === id) return;
  if (currentModal) closeModal(currentModal);
  currentModal = id;
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  sfxOpen();
  if (id === 'modal-3') typewrite();
  if (id === 'jukebox') openJukebox();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  gsap.to(el, {
    opacity: 0, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      gsap.set(el, { clearProps: 'opacity' });
    },
  });
  if (currentModal === id) currentModal = null;
  if (id === 'jukebox') { stopJukeboxSong(); jukeboxOpen = false; }
}

document.querySelectorAll('.modal-close').forEach(b =>
  b.addEventListener('click', () => closeModal(b.dataset.modal))
);
document.querySelectorAll('.modal-backdrop').forEach(el =>
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); })
);
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && currentModal) closeModal(currentModal);
  // Cambiar canción con ← → cuando la rocola está abierta
  if (jukeboxOpen) {
    if (e.key === 'ArrowLeft')  changeSong(-1);
    if (e.key === 'ArrowRight') changeSong(+1);
  }
});

// ── Lógica de la Rocola ──────────────────────────────────────
function openJukebox() {
  jukeboxOpen = true;
  updateJukeboxUI();
  startJukeboxSong(currentSong);
}

function changeSong(dir) {
  currentSong = (currentSong + dir + SONGS.length) % SONGS.length;
  updateJukeboxUI();
  startJukeboxSong(currentSong);
  tone(440 + currentSong * 110, 0.15, 'sine', 0.1);
}

function updateJukeboxUI() {
  const nameEl = document.getElementById('jukebox-song-name');
  const dotEls = document.querySelectorAll('.jukebox-dot');
  if (nameEl) nameEl.textContent = SONGS[currentSong].title;
  dotEls.forEach((d, i) => {
    d.classList.toggle('active', i === currentSong);
    d.style.background = i === currentSong ? SONGS[currentSong].color : '';
  });
}

// ── Typewriter ────────────────────────────────────────────────
let twTimer = null;
function typewrite() {
  const el = document.getElementById('typewriter-out');
  if (!el) return;
  el.textContent = ''; el.classList.remove('done');
  let i = 0; clearInterval(twTimer);
  twTimer = setInterval(() => {
    if (i < CARTA_TEXTO.length) el.textContent += CARTA_TEXTO[i++];
    else { clearInterval(twTimer); el.classList.add('done'); }
  }, 36);
}

function finalScreen() {
  setTimeout(() => {
    document.getElementById('final-screen').classList.remove('hidden');
    const cont = document.getElementById('final-hearts');
    ['💛','🌻','💫','✨','🌼','💕'].forEach(emoji => {
      for (let j = 0; j < 4; j++) {
        const h = document.createElement('span');
        h.className = 'heart-float'; h.textContent = emoji;
        h.style.setProperty('--l', Math.random() * 100 + '%');
        h.style.setProperty('--d', (3 + Math.random() * 5) + 's');
        h.style.setProperty('--del', Math.random() * 3 + 's');
        cont.appendChild(h);
      }
    });
  }, 600);
}

document.getElementById('replay-btn').addEventListener('click', () => location.reload());

// Botones prev/next de la rocola en el modal
document.addEventListener('click', e => {
  if (e.target.id === 'jukebox-prev') changeSong(-1);
  if (e.target.id === 'jukebox-next') changeSong(+1);
});


/* ────────────────────────────────────────────────────────────────
   10. COLISIONES — sistema simple de círculos en XZ
──────────────────────────────────────────────────────────────── */

/**
 * Resuelve colisiones entre el carrito (radio ~0.7) y todos los
 * colisionables registrados. Si hay solapamiento, empuja el carrito.
 * Es un algoritmo de "separación por penalidad" — simple y efectivo.
 */
function resolveCollisions() {
  const CAR_RADIUS = 0.75;
  const _sep = new THREE.Vector2();

  for (const col of colliders) {
    const dx = car.position.x - col.x;
    const dz = car.position.z - col.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = CAR_RADIUS + col.r;

    if (dist < minDist && dist > 0.001) {
      // Calcular cuánto se solapan y separar
      const overlap = minDist - dist;
      const nx = dx / dist; // normal de separación
      const nz = dz / dist;

      // Mover el carrito fuera del obstáculo
      car.position.x += nx * overlap;
      car.position.z += nz * overlap;

      // Reducir la velocidad en la dirección del choque (rebote suave)
      const dot = carVel.x * nx + carVel.z * nz;
      if (dot < 0) { // solo si se mueve hacia el obstáculo
        carVel.x -= dot * nx * 1.4;
        carVel.z -= dot * nz * 1.4;
      }
    }
  }
}


/* ────────────────────────────────────────────────────────────────
   11. LOOP DE ANIMACIÓN
──────────────────────────────────────────────────────────────── */

const clock    = new THREE.Clock();
const _camPos  = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _fwdDir  = new THREE.Vector3();
const _car2D   = new THREE.Vector2();
const _cp2D    = new THREE.Vector2();
let gameOn     = false;
let lastOpen   = false;
let closestCp  = null;

function tick() {
  requestAnimationFrame(tick);
  renderer.render(scene, camera);
  if (!gameOn) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = Date.now() * 0.001;

  /* ── A. MOVIMIENTO ──────────────────────────────────────── */

  // 1. Girar yaw con A / D
  if (left())  carYaw += THREE.MathUtils.degToRad(CFG.turn) * dt;
  if (right()) carYaw -= THREE.MathUtils.degToRad(CFG.turn) * dt;
  car.rotation.y = carYaw;

  // 2. Dirección adelante del carrito en espacio mundial
  _fwdDir.set(-Math.sin(carYaw), 0, -Math.cos(carYaw));

  // 3. Acumular velocidad
  if (fwd()) carVel.addScaledVector(_fwdDir,  CFG.accel * dt);
  if (bwd()) carVel.addScaledVector(_fwdDir, -CFG.accel * dt);

  // 4. Fricción + tope
  carVel.multiplyScalar(CFG.friction);
  if (carVel.length() > CFG.speed) carVel.normalize().multiplyScalar(CFG.speed);

  // 5. Mover en XZ
  car.position.addScaledVector(carVel, dt);

  // 6. SALTO — física vertical independiente del movimiento XZ
  //    - ESPACIO lanza el carrito hacia arriba (solo si está en el suelo)
  //    - carVelY acumula gravedad cada frame (como en la realidad)
  //    - Cuando Y baja a 0 → aterrizó, frenamos y activamos isOnGround
  if (jumpK() && isOnGround) {
    carVelY    = CFG.jumpForce;  // impulso inicial hacia arriba
    isOnGround = false;
  }

  if (!isOnGround) {
    carVelY        -= CFG.gravity * dt; // gravedad tira hacia abajo
    car.position.y += carVelY * dt;     // aplicar velocidad vertical

    if (car.position.y <= 0) {          // tocó el suelo
      car.position.y = 0;
      carVelY        = 0;
      isOnGround     = true;
      // Pequeña squash al aterrizar — visual impact
      car.scale.set(1.15, 0.75, 1.15);
      setTimeout(() => car.scale.set(1, 1, 1), 120);
    }
  } else {
    car.position.y = 0;
  }

  // 7. Resolver colisiones con objetos del mundo
  resolveCollisions();

  // 8. Rotar ruedas según velocidad (solo si está en el suelo)
  const spd = carVel.length();
  if (isOnGround) wheelMeshes.forEach(w => { w.rotation.x -= spd * dt * 1.7; });

  // Inclinación del carrito al acelerar / girar (como coche real)
  const targetTilt = left() ? 0.08 : right() ? -0.08 : 0;
  car.rotation.z += (targetTilt - car.rotation.z) * 8 * dt;

  /* ── B. CÁMARA ──────────────────────────────────────────── */
  _camPos.set(
    car.position.x + CAM_OFFSET.x,
    car.position.y + CAM_OFFSET.y,
    car.position.z + CAM_OFFSET.z
  );
  camera.position.lerp(_camPos, CFG.camLerp);
  _camLook.set(car.position.x, car.position.y + 0.5, car.position.z);
  camera.lookAt(_camLook);

  /* ── C. VIENTO ──────────────────────────────────────────── */
  updateWind(dt);

  // Polvo girando suavemente
  if (window._dustPts) window._dustPts.rotation.y += dt * 0.018;

  // Pasto mecido por el viento — oscilación lateral suave en todo el mesh
  // Rotamos el InstancedMesh completo levemente en X: simula el balanceo
  if (window._grassMesh) {
    window._grassMesh.rotation.x = Math.sin(t * 0.9) * 0.04;
    window._grassMesh.rotation.z = Math.sin(t * 0.7) * 0.03;
  }

  /* ── D. CHECKPOINTS ─────────────────────────────────────── */
  _car2D.set(car.position.x, car.position.z);
  closestCp = null;
  let minD  = Infinity;

  cpObjects.forEach(cp => {
    // Animación del cubo flotante (solo para checkpoints normales)
    if (cp.cube) {
      cp.cube.position.y    = 3.6 + Math.sin(t * 1.8 + cp.cfg.x) * 0.3;
      cp.cube.rotation.y   += dt * 0.9;
      cp.mat.emissiveIntensity = 0.5 + Math.sin(t * 2 + cp.cfg.z) * 0.45;
    }

    // Animación de la luz de la rocola
    if (cp.isJukebox && window._jukeboxLight) {
      window._jukeboxLight.intensity = 2.5 + Math.sin(t * 4) * 1.5;
    }

    if (cp.triggered && !cp.isJukebox) return;

    _cp2D.set(cp.cfg.x, cp.cfg.z);
    const d = _car2D.distanceTo(_cp2D);

    if (d < TRIGGER_DIST) {
      if (!cp.wasInRange) { cp.wasInRange = true; sfxProx(); }
      if (d < minD) { minD = d; closestCp = cp; }
    } else {
      cp.wasInRange = false;
    }
  });

  // HUD hint
  if (closestCp && !currentModal) hintEl.classList.remove('hidden');
  else                             hintEl.classList.add('hidden');

  // Abrir modal (flanco de subida de E)
  const openNow = openK();
  if (openNow && !lastOpen && closestCp && !currentModal) {
    openModal(closestCp.cfg.id);
    if (!closestCp.triggered && !closestCp.isJukebox) {
      closestCp.triggered = true;
      discovered++;
      discEl.textContent = discovered;
      if (cp && cp.mat)
        gsap.to(closestCp.mat, { emissiveIntensity: 3, duration: 0.25, yoyo: true, repeat: 4 });
      if (discovered === 3) finalScreen();
    }
  }
  lastOpen = openNow;
}


/* ────────────────────────────────────────────────────────────────
   12. RESIZE
──────────────────────────────────────────────────────────────── */

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});


/* ────────────────────────────────────────────────────────────────
   13. INTRO
──────────────────────────────────────────────────────────────── */

(function spawnIntroParticles() {
  const c = document.getElementById('intro-particles');
  if (!c) return;
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const s = 2 + Math.random() * 5;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;bottom:${Math.random()*40}%;--dur:${4+Math.random()*6}s;--delay:${Math.random()*5}s;`;
    c.appendChild(p);
  }
})();

document.getElementById('start-btn').addEventListener('click', () => {
  const intro = document.getElementById('intro-screen');
  gsap.to(intro, {
    opacity: 0, duration: 0.7, ease: 'power2.inOut',
    onComplete: () => {
      intro.style.display = 'none';
      document.getElementById('hud').classList.remove('hidden');
      gameOn = true;
      clock.start();
    },
  });
});

tick();
console.log('%c💛 Para Ámbar v3 — con amor y Three.js', 'color:#c9963c;font-size:1.2rem;font-weight:bold');