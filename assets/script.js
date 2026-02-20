/**
 * script.js — Para Ámbar 💛
 * ══════════════════════════════════════════════════════════════════
 *
 * ARQUITECTURA (orden de lectura recomendado):
 *   0.  CONFIGURACIÓN PERSONALIZABLE  ← edita esto primero
 *   1.  Setup: renderer, escena, cámara, luces
 *   2.  Mundo físico (Cannon.js)
 *   3.  Suelo (visual + físico)
 *   4.  Carrito (visual + físico)
 *   5.  Checkpoints (los 3 objetos interactivos)
 *   6.  Partículas decorativas flotantes
 *   7.  Controles de teclado
 *   8.  Audio (Howler.js)
 *   9.  Sistema de modales (GSAP)
 *  10.  Loop de animación (requestAnimationFrame)
 *  11.  Resize handler
 *  12.  UI: Intro & botones
 *
 * CÓMO AÑADIR TUS FOTOS:
 *   En index.html busca la clase .photo-inner y cambia el contenido
 *   por: <img src="carpeta/tu-foto.jpg" alt="descripción">
 *
 * CÓMO PERSONALIZAR LA CARTA:
 *   Edita la constante CARTA_TEXTO más abajo.
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   0. CONFIGURACIÓN PERSONALIZABLE
   ══════════════════════════════════════════════════════════════════ */

/**
 * Texto de la carta (modal 3).
 * Escribe aquí tu mensaje real. Usa \n para saltos de línea.
 */
const CARTA_TEXTO = `Hay lugares en el mundo que no están en ningún mapa,
pero que existen porque tú los iluminaste.

Este pequeño rincón lo construí pensando en ti,
en tu forma de reír cuando algo te sorprende,
y en cómo todo se vuelve más bonito cuando estás cerca.

Gracias por ser mi lugar favorito.`;

/**
 * Posiciones de los 3 checkpoints [x, z].
 * El carrito empieza en (0,0). Ajusta las distancias según quieras.
 */
const CHECKPOINT_CONFIG = [
  {
    id: 1,
    label: 'El Cofre',
    position: { x: -12, z: -8 },
    color: '#c9963c',       // dorado
    emissive: '#6b4d10',
    modal: 'modal-1',
    icon: '🗝️',
  },
  {
    id: 2,
    label: 'La Radio',
    position: { x: 14, z: -6 },
    color: '#e8714a',       // naranja
    emissive: '#7a2c0f',
    modal: 'modal-2',
    icon: '📻',
  },
  {
    id: 3,
    label: 'El Faro',
    position: { x: 2, z: -22 },
    color: '#a8d4a0',       // verde suave
    emissive: '#2a5c25',
    modal: 'modal-3',
    icon: '🏮',
  },
];

/** Distancia en unidades 3D para activar un checkpoint */
const TRIGGER_DISTANCE = 3.2;

/** Fuerza que se aplica al carrito con cada tecla */
const CART_FORCE = 18;

/**
 * Velocidad angular de giro (rad/s).
 * En Cannon 0.6.2 no existe applyTorque, así que
 * seteamos angularVelocity.y directamente.
 */
const CART_TURN_SPEED = 2.2;

/** Máxima velocidad lineal del carrito (unidades/s) */
const MAX_SPEED = 14;


/* ══════════════════════════════════════════════════════════════════
   1. SETUP: RENDERER, ESCENA, CÁMARA, LUCES
   ══════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById('webgl-canvas');

// ── Renderer ────────────────────────────────────────────────────
// WebGLRenderer es el motor que convierte objetos 3D en píxeles.
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,    // bordes suavizados
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
// pixelRatio cap en 2 para no sobrecargar pantallas retina de alta gama
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Tone mapping cinematográfico — da ese look de "película cálida"
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputEncoding = THREE.sRGBEncoding;

// ── Escena ───────────────────────────────────────────────────────
// La Scene es el contenedor de TODOS los objetos, luces y cámaras.
const scene = new THREE.Scene();
scene.background = new THREE.Color('#130903');
// La niebla hace que los objetos distantes se desvanezcan — efecto infinito
scene.fog = new THREE.FogExp2('#1f0c04', 0.028);

// ── Cámara ───────────────────────────────────────────────────────
// PerspectiveCamera(fov, aspect, near, far)
// FOV 50° da vista más "cinematográfica" que 75°
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  120,
);
// Offset de cámara: elevada y ligeramente detrás (vista cenital inclinada)
const CAM_OFFSET = new THREE.Vector3(0, 14, 10);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

// ── Luces ────────────────────────────────────────────────────────

// Luz ambiental hemisférica: cielo cálido, suelo oscuro
const hemiLight = new THREE.HemisphereLight('#ffe4b5', '#3d1a04', 0.7);
scene.add(hemiLight);

// Luz direccional principal (el "sol")
const sunLight = new THREE.DirectionalLight('#ffd580', 2.0);
sunLight.position.set(15, 25, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left   = -40;
sunLight.shadow.camera.right  =  40;
sunLight.shadow.camera.top    =  40;
sunLight.shadow.camera.bottom = -40;
sunLight.shadow.bias = -0.001; // reduce el "shadow acne"
scene.add(sunLight);

// Luz de relleno naranja (ambiente cálido desde el suelo)
const fillLight = new THREE.PointLight('#ff7c2a', 1.2, 50);
fillLight.position.set(-8, 3, 5);
scene.add(fillLight);


/* ══════════════════════════════════════════════════════════════════
   2. MUNDO FÍSICO (CANNON.JS)
   ══════════════════════════════════════════════════════════════════
   Cannon.js simula la física: gravedad, colisiones, fuerzas.
   Cada objeto Three.js tiene un "cuerpo" Cannon equivalente.
   En el loop, copiamos la posición/rotación de Cannon → Three.
   ══════════════════════════════════════════════════════════════════ */

const physWorld = new CANNON.World();
physWorld.gravity.set(0, -25, 0);   // gravedad negativa en Y = hacia abajo
physWorld.broadphase = new CANNON.SAPBroadphase(physWorld); // más rápido que Naive
physWorld.solver.iterations = 12;
physWorld.allowSleep = true; // objetos en reposo "duermen" (optimización)

// ContactMaterial: define fricción y rebote entre materiales
const groundMat = new CANNON.Material('ground');
const cartMat   = new CANNON.Material('cart');
const contactMat = new CANNON.ContactMaterial(groundMat, cartMat, {
  friction: 0.5,
  restitution: 0.15,
});
physWorld.addContactMaterial(contactMat);

// Array de pares {mesh, body} para sincronizar Three ↔ Cannon
const physicsObjects = [];

/**
 * Registra un par Three.Mesh + CANNON.Body para sincronización automática.
 */
function registerPhysics(mesh, body) {
  physicsObjects.push({ mesh, body });
  physWorld.addBody(body);
}


/* ══════════════════════════════════════════════════════════════════
   3. SUELO
   ══════════════════════════════════════════════════════════════════ */

// ── Visual (Three.js) ────────────────────────────────────────────
// PlaneGeometry(ancho, alto, segX, segY) — muy grande para parecer infinito
const groundGeo = new THREE.PlaneGeometry(300, 300, 60, 60);
const groundMesh3 = new THREE.MeshStandardMaterial({
  color: '#c96d3a',
  roughness: 0.88,
  metalness: 0.02,
});
const groundMesh = new THREE.Mesh(groundGeo, groundMesh3);
groundMesh.rotation.x = -Math.PI / 2; // rotar de vertical a horizontal
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Cuadrícula decorativa encima del suelo
const grid = new THREE.GridHelper(300, 100, '#a5562a', '#a5562a');
grid.material.opacity = 0.18;
grid.material.transparent = true;
grid.position.y = 0.01; // ligeramente elevada para evitar z-fighting
scene.add(grid);

// ── Físico (Cannon.js) ───────────────────────────────────────────
// El suelo físico es un plano infinito (mass=0 → estático, no se mueve)
const groundBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Plane(),
  material: groundMat,
});
// El plano Cannon es vertical por defecto; lo rotamos -90° en X = horizontal
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
physWorld.addBody(groundBody);


/* ══════════════════════════════════════════════════════════════════
   4. CARRITO (placeholder: grupo de cubos)
   ══════════════════════════════════════════════════════════════════ */

// ── Visual ───────────────────────────────────────────────────────
// Usamos un Group para agrupar cuerpo, cabina y ruedas
const cartGroup = new THREE.Group();
scene.add(cartGroup);

// Cuerpo principal
const bodyGeo = new THREE.BoxGeometry(1.4, 0.65, 2.4);
const bodyMat = new THREE.MeshStandardMaterial({
  color: '#d63a2f',
  roughness: 0.25,
  metalness: 0.35,
});
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.position.y = 0.35;
bodyMesh.castShadow = true;
cartGroup.add(bodyMesh);

// Cabina
const cabinGeo = new THREE.BoxGeometry(1.1, 0.55, 1.1);
const cabinMat = new THREE.MeshStandardMaterial({
  color: '#eb5a4e',
  roughness: 0.2,
  metalness: 0.2,
});
const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
cabinMesh.position.set(0, 0.97, -0.3);
cabinMesh.castShadow = true;
cartGroup.add(cabinMesh);

// Ventana (vidrio azul oscuro)
const windshieldGeo = new THREE.BoxGeometry(1.05, 0.38, 0.05);
const windshieldMat = new THREE.MeshStandardMaterial({
  color: '#1a3a5c',
  roughness: 0.0,
  metalness: 0.8,
  transparent: true,
  opacity: 0.7,
});
const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
windshield.position.set(0, 1.0, 0.26);
cartGroup.add(windshield);

// Ruedas — 4 cilindros
const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20);
const wheelMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
const wheelRimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 12);
const wheelRimMat = new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 0.3, metalness: 0.8 });

const wheelPos = [
  { x:  0.78, z:  0.75 },
  { x: -0.78, z:  0.75 },
  { x:  0.78, z: -0.75 },
  { x: -0.78, z: -0.75 },
];

const wheelMeshes = []; // referencia para animar rotación
wheelPos.forEach(({ x, z }) => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0, z);
  w.castShadow = true;
  cartGroup.add(w);

  const r = new THREE.Mesh(wheelRimGeo, wheelRimMat);
  r.rotation.z = Math.PI / 2;
  r.position.set(x, 0, z);
  cartGroup.add(r);

  wheelMeshes.push(w);
});

// ── Físico ───────────────────────────────────────────────────────
const cartBody = new CANNON.Body({
  mass: 1.2,
  // Box(halfExtents): la mitad de las dimensiones del mesh
  shape: new CANNON.Box(new CANNON.Vec3(0.7, 0.4, 1.2)),
  material: cartMat,
  linearDamping: 0.65,  // amortiguación al moverse (frena solo)
  angularDamping: 0.95, // evita que el carrito gire locamente
});
cartBody.position.set(0, 1, 0);
physWorld.addBody(cartBody);

// En Cannon 0.6.2 no existe angularFactor, pero podemos bloquear
// los ejes X y Z del angularVelocity en cada frame para evitar volcados.
// Esto se hace en el tick() después del step.

// Alineamos el group visual con el body físico inicialmente
cartGroup.position.copy(cartBody.position);


/* ══════════════════════════════════════════════════════════════════
   5. CHECKPOINTS — Los 3 objetos interactivos
   ══════════════════════════════════════════════════════════════════ */

const checkpoints = []; // array con refs a mesh, body, config y estado

CHECKPOINT_CONFIG.forEach((cfg) => {
  // ── Visual: torre (caja + esfera en la punta) ──────────────────
  const group = new THREE.Group();
  scene.add(group);
  group.position.set(cfg.position.x, 0, cfg.position.z);

  // Base cilíndrica
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.7, 0.3, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: '#2e1608', roughness: 0.8 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.15;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Columna
  const colGeo = new THREE.CylinderGeometry(0.18, 0.2, 2.5, 10);
  const colMat = new THREE.MeshStandardMaterial({ color: '#3d2010', roughness: 0.7 });
  const colMesh = new THREE.Mesh(colGeo, colMat);
  colMesh.position.y = 1.55;
  colMesh.castShadow = true;
  group.add(colMesh);

  // Cubo luminoso en la punta (con emissive = brillo propio)
  const cubeGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    emissive: cfg.emissive,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.4,
  });
  const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
  cubeMesh.position.y = 3.35;
  cubeMesh.castShadow = true;
  group.add(cubeMesh);

  // Luz puntual del mismo color (da brillo al suelo)
  const pointLight = new THREE.PointLight(cfg.color, 1.5, 12);
  pointLight.position.y = 3.5;
  group.add(pointLight);

  // Etiqueta flotante (sprite con canvas 2D)
  const labelSprite = makeLabelSprite(cfg.icon + ' ' + cfg.label);
  labelSprite.position.y = 5.2;
  group.add(labelSprite);

  // ── Físico: caja colisionable ────────────────────────────────
  const cpBody = new CANNON.Body({
    mass: 0, // estático
    shape: new CANNON.Box(new CANNON.Vec3(0.55, 1.7, 0.55)),
  });
  cpBody.position.set(cfg.position.x, 0, cfg.position.z);
  physWorld.addBody(cpBody);

  // Guardamos todo en el array
  checkpoints.push({
    config: cfg,
    group,
    cubeMesh,
    cubeMat,
    pointLight,
    labelSprite,
    body: cpBody,
    triggered: false,   // ¿ya se mostró el modal?
    inRange: false,     // ¿el carrito está cerca ahora mismo?
  });
});

/**
 * Crea un THREE.Sprite con texto — útil como etiqueta 3D.
 * Sprite = siempre mira a la cámara (billboard).
 */
function makeLabelSprite(text) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');

  // Fondo redondeado
  ctx.fillStyle = 'rgba(20,10,4,0.7)';
  ctx.beginPath();
  ctx.roundRect(8, 8, cv.width - 16, cv.height - 16, 20);
  ctx.fill();

  // Texto
  ctx.fillStyle = '#f5e8d0';
  ctx.font = 'bold 44px Cormorant Garamond, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2);

  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.5, 1.1, 1);
  return sprite;
}


/* ══════════════════════════════════════════════════════════════════
   6. PARTÍCULAS DECORATIVAS (polvo dorado flotando)
   ══════════════════════════════════════════════════════════════════ */

(function createParticles() {
  const count = 300;
  const positions = new Float32Array(count * 3);
  const range = 60;

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * range; // x
    positions[i * 3 + 1] = Math.random() * 10;            // y (altura)
    positions[i * 3 + 2] = (Math.random() - 0.5) * range; // z
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: '#c9963c',
    size: 0.06,
    sizeAttenuation: true,   // más pequeños con la distancia
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // Las guardamos para animarlas en el loop
  window._particles = particles;
})();


/* ══════════════════════════════════════════════════════════════════
   7. CONTROLES DE TECLADO
   ══════════════════════════════════════════════════════════════════ */

// Usamos un objeto plano para registrar qué teclas están presionadas.
// Esto es más eficiente que manejar eventos "keydown/keyup" en el loop.
const keys = {
  ArrowUp: false, w: false, W: false,
  ArrowDown: false, s: false, S: false,
  ArrowLeft: false, a: false, A: false,
  ArrowRight: false, d: false, D: false,
  e: false, E: false,
};

window.addEventListener('keydown', (e) => {
  if (e.key in keys) { keys[e.key] = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keys) { keys[e.key] = false; }
});

/** Devuelve true si la tecla "adelante" está activa (W o ArrowUp) */
const goFwd  = () => keys.ArrowUp    || keys.w || keys.W;
const goBwd  = () => keys.ArrowDown  || keys.s || keys.S;
const goLeft = () => keys.ArrowLeft  || keys.a || keys.A;
const goRight= () => keys.ArrowRight || keys.d || keys.D;
const doOpen = () => keys.e || keys.E;

// Estado interno
let closestCheckpoint = null; // el checkpoint más cercano (si está en rango)
let lastOpenKey = false;      // para detectar "flanco de subida" de E


/* ══════════════════════════════════════════════════════════════════
   8. AUDIO (Howler.js)
   ══════════════════════════════════════════════════════════════════
   Howler maneja audio cross-browser, incluyendo WebAudio API.
   Generamos sonidos con osciladores cuando no hay archivos .mp3.
   ══════════════════════════════════════════════════════════════════ */

/**
 * Genera un sonido sintético usando Web Audio API.
 * Esto elimina la necesidad de archivos .mp3 externos.
 * @param {number} freq   - frecuencia en Hz
 * @param {number} dur    - duración en segundos
 * @param {'sine'|'square'|'triangle'} type - forma de onda
 */
function playTone(freq = 440, dur = 0.15, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (_) { /* silencio si el navegador no soporta AudioContext */ }
}

/** Sonido de "entrada en zona" del checkpoint */
const playProximitySound = () => playTone(660, 0.2, 'sine');

/** Sonido de "abrir modal" */
const playOpenSound = () => {
  playTone(523, 0.1, 'triangle');
  setTimeout(() => playTone(784, 0.15, 'triangle'), 80);
};

/** Sonido de motor (llama cada frame mientras se mueve) */
let motorPlaying = false;
let motorCtx = null;
let motorGain = null;
let motorOsc = null;

function startMotor() {
  if (motorPlaying) return;
  motorPlaying = true;
  try {
    motorCtx = new (window.AudioContext || window.webkitAudioContext)();
    motorOsc = motorCtx.createOscillator();
    motorGain = motorCtx.createGain();
    motorOsc.connect(motorGain);
    motorGain.connect(motorCtx.destination);
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.setValueAtTime(80, motorCtx.currentTime);
    motorGain.gain.setValueAtTime(0.04, motorCtx.currentTime);
    motorOsc.start();
  } catch (_) {}
}

function stopMotor() {
  if (!motorPlaying) return;
  motorPlaying = false;
  if (motorGain) motorGain.gain.setValueAtTime(0, motorCtx.currentTime);
  if (motorOsc) { motorOsc.stop(); motorOsc = null; }
}

function updateMotorPitch(speed) {
  if (motorOsc && motorCtx) {
    const targetFreq = 60 + speed * 8;
    motorOsc.frequency.setTargetAtTime(targetFreq, motorCtx.currentTime, 0.05);
  }
}


/* ══════════════════════════════════════════════════════════════════
   9. SISTEMA DE MODALES (GSAP)
   ══════════════════════════════════════════════════════════════════ */

let activeModal = null;       // id del modal abierto actualmente
let discoveredCount = 0;      // contador de checkpoints visitados
const discCountEl = document.getElementById('disc-count');
const proximityHint = document.getElementById('proximity-hint');

/**
 * Abre un modal.
 * GSAP anima la opacidad del backdrop y la posición del panel.
 */
function openModal(modalId) {
  if (activeModal === modalId) return;
  if (activeModal) closeModal(activeModal);

  const backdrop = document.getElementById(modalId);
  if (!backdrop) return;

  activeModal = modalId;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');

  playOpenSound();

  // Si es el modal de la carta, iniciamos el efecto typewriter
  if (modalId === 'modal-3') {
    startTypewriter();
  }
}

/**
 * Cierra un modal con animación GSAP.
 */
function closeModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (!backdrop) return;

  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
      gsap.set(backdrop, { opacity: '' }); // limpiar inline style
    },
  });

  if (activeModal === modalId) activeModal = null;
}

// ── Botones de cierre ────────────────────────────────────────────
document.querySelectorAll('.modal-close').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.modal;
    closeModal(id);
  });
});

// Cerrar con Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModal) closeModal(activeModal);
});

// Cerrar al hacer clic en el backdrop
document.querySelectorAll('.modal-backdrop').forEach((el) => {
  el.addEventListener('click', (e) => {
    if (e.target === el) closeModal(el.id);
  });
});


/* ── Efecto typewriter ───────────────────────────────────────────
   Escribe la carta letra por letra en el DOM.
*/
let typewriterTimer = null;

function startTypewriter() {
  const el = document.getElementById('typewriter-out');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('done');

  let i = 0;
  clearInterval(typewriterTimer);

  typewriterTimer = setInterval(() => {
    if (i < CARTA_TEXTO.length) {
      el.textContent += CARTA_TEXTO[i];
      i++;
    } else {
      clearInterval(typewriterTimer);
      el.classList.add('done'); // oculta el cursor parpadeante
    }
  }, 38); // velocidad en ms por carácter
}


/* ── Pantalla final ──────────────────────────────────────────────
   Se muestra cuando los 3 checkpoints han sido visitados.
*/
function showFinalScreen() {
  setTimeout(() => {
    const screen = document.getElementById('final-screen');
    screen.classList.remove('hidden');

    // Corazones flotantes decorativos
    const container = document.getElementById('final-hearts');
    const emojis = ['💛', '🌻', '💫', '✨', '🌼', '💕'];
    for (let i = 0; i < 20; i++) {
      const h = document.createElement('span');
      h.className = 'heart-float';
      h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      h.style.setProperty('--l', `${Math.random() * 100}%`);
      h.style.setProperty('--d', `${3 + Math.random() * 5}s`);
      h.style.setProperty('--del', `${Math.random() * 3}s`);
      container.appendChild(h);
    }
  }, 800);
}

// Botón "Volver a explorar" — recarga la página
document.getElementById('replay-btn').addEventListener('click', () => {
  window.location.reload();
});


/* ══════════════════════════════════════════════════════════════════
   10. LOOP DE ANIMACIÓN
   ══════════════════════════════════════════════════════════════════
   requestAnimationFrame llama a esta función ~60 veces por segundo.
   Es el corazón de cualquier aplicación Three.js.
   ══════════════════════════════════════════════════════════════════ */

const clock = new THREE.Clock();

// Vector reutilizable para evitar crear objetos en cada frame (garbage collection)
const _cameraTarget   = new THREE.Vector3();
const _cameraPosition = new THREE.Vector3();
const _cartPos2D      = new THREE.Vector2(); // posición en XZ para distancias
const _cpPos2D        = new THREE.Vector2();

function tick() {
  requestAnimationFrame(tick);

  // Si el juego no ha comenzado, no actualizamos nada
  if (!gameStarted) {
    renderer.render(scene, camera);
    return;
  }

  const delta = Math.min(clock.getDelta(), 0.05); // cap en 50ms para evitar saltos

  // ── A. Actualizar físicas ──────────────────────────────────────
  // Step del mundo físico: (timestep fijo, delta real, max sub-steps)
  physWorld.step(1 / 60, delta, 3);

  // Bloquear rotación en X y Z para que el carrito no se vuelque.
  // (En Cannon 0.6.2 no existe angularFactor, lo hacemos manual)
  cartBody.angularVelocity.x = 0;
  cartBody.angularVelocity.z = 0;
  // Extraer solo la rotación Y del quaternion y reconstruirlo limpio
  // Esto evita que el carrito se incline aunque la física empuje en X/Z
  const quat = cartBody.quaternion;
  const sinY = 2 * (quat.w * quat.y);
  const cosY = 1 - 2 * (quat.y * quat.y);
  const angleY = Math.atan2(sinY, cosY);
  cartBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angleY);

  // ── B. Controles → fuerzas sobre el carrito ───────────────────
  //
  // CANNON.js 0.6.2 NO tiene applyTorque() ni applyLocalForce().
  // Solución:
  //   • Movimiento: applyForce() con vector rotado al espacio mundial.
  //   • Giro: modificar angularVelocity.y directamente.
  //
  const isMoving = goFwd() || goBwd() || goLeft() || goRight();

  if (isMoving) {
    startMotor();
    const speed = cartBody.velocity.length();
    updateMotorPitch(speed);

    // Obtener el vector "adelante" del carrito en espacio mundial.
    // El carrito apunta hacia (0,0,-1) localmente; vmult lo rota.
    const localFwd = new CANNON.Vec3(0, 0, -1);
    const worldFwd = new CANNON.Vec3();
    cartBody.quaternion.vmult(localFwd, worldFwd);

    if (speed < MAX_SPEED) {
      if (goFwd()) {
        cartBody.applyForce(
          new CANNON.Vec3(worldFwd.x * CART_FORCE, 0, worldFwd.z * CART_FORCE),
          cartBody.position
        );
      }
      if (goBwd()) {
        cartBody.applyForce(
          new CANNON.Vec3(-worldFwd.x * CART_FORCE, 0, -worldFwd.z * CART_FORCE),
          cartBody.position
        );
      }
    }

    // Giro directo sobre angularVelocity.y (funciona en Cannon 0.6.2)
    if (goLeft())  cartBody.angularVelocity.y =  CART_TURN_SPEED;
    if (goRight()) cartBody.angularVelocity.y = -CART_TURN_SPEED;
    if (!goLeft() && !goRight()) cartBody.angularVelocity.y *= 0.85;

  } else {
    stopMotor();
    cartBody.angularVelocity.y *= 0.8;
  }

  // ── C. Sincronizar Three.js ↔ Cannon.js ──────────────────────
  // Copiamos posición y rotación del cuerpo físico al mesh visual
  cartGroup.position.copy(cartBody.position);
  cartGroup.quaternion.copy(cartBody.quaternion);

  // Animar ruedas: rotan proporcional a la velocidad
  const cartSpeed = cartBody.velocity.length();
  wheelMeshes.forEach((w) => { w.rotation.x -= cartSpeed * delta * 1.5; });

  // ── D. Cámara suave (lerp = interpolación lineal) ─────────────
  // Calculamos dónde debería estar la cámara basándonos en la posición del carrito
  _cameraPosition.set(
    cartBody.position.x + CAM_OFFSET.x,
    cartBody.position.y + CAM_OFFSET.y,
    cartBody.position.z + CAM_OFFSET.z,
  );
  // lerp(target, alpha): alpha=0.05 → movimiento muy suave (cámara "perezosa")
  camera.position.lerp(_cameraPosition, 0.06);

  // La cámara siempre mira al carrito (con pequeño offset vertical)
  _cameraTarget.set(
    cartBody.position.x,
    cartBody.position.y + 1,
    cartBody.position.z,
  );
  camera.lookAt(_cameraTarget);

  // ── E. Checkpoints: detección de proximidad ───────────────────
  _cartPos2D.set(cartBody.position.x, cartBody.position.z);
  closestCheckpoint = null;
  let minDist = Infinity;

  checkpoints.forEach((cp) => {
    // Animación flotante del cubo
    const t = Date.now() * 0.001;
    cp.cubeMesh.position.y = 3.35 + Math.sin(t * 1.8 + cp.config.id) * 0.25;
    cp.cubeMesh.rotation.y += delta * 0.9;

    // Pulso en el brillo emissive
    cp.cubeMat.emissiveIntensity = 0.6 + Math.sin(t * 2 + cp.config.id) * 0.4;

    // Etiqueta siempre mira a la cámara (ya lo hace THREE.Sprite automático)

    if (cp.triggered) return; // ya visitado, no revisamos distancia

    _cpPos2D.set(cp.config.position.x, cp.config.position.z);
    const dist = _cartPos2D.distanceTo(_cpPos2D);

    if (dist < TRIGGER_DISTANCE) {
      cp.inRange = true;
      if (dist < minDist) {
        minDist = dist;
        closestCheckpoint = cp;
      }

      // Primera vez que entra en rango: sonido de proximidad
      if (!cp._enteredRange) {
        cp._enteredRange = true;
        playProximitySound();
      }
    } else {
      cp.inRange = false;
      cp._enteredRange = false;
    }
  });

  // Mostrar/ocultar el hint de "presiona E"
  if (closestCheckpoint && !activeModal) {
    proximityHint.classList.remove('hidden');
  } else {
    proximityHint.classList.add('hidden');
  }

  // Detectar tecla E (flanco de subida para evitar repetición)
  const openNow = doOpen();
  if (openNow && !lastOpenKey && closestCheckpoint && !activeModal) {
    const cp = closestCheckpoint;
    openModal(cp.config.modal);

    if (!cp.triggered) {
      cp.triggered = true;
      discoveredCount++;
      discCountEl.textContent = discoveredCount;

      // Efecto visual: brillo intenso al descubrir
      gsap.to(cp.cubeMat, { emissiveIntensity: 3, duration: 0.3, yoyo: true, repeat: 3 });

      if (discoveredCount === 3) {
        setTimeout(showFinalScreen, 1200);
      }
    }
  }
  lastOpenKey = openNow;

  // ── F. Animar partículas (rotación lenta) ─────────────────────
  if (window._particles) {
    window._particles.rotation.y += delta * 0.03;
  }

  // ── G. Renderizar ─────────────────────────────────────────────
  renderer.render(scene, camera);
}


/* ══════════════════════════════════════════════════════════════════
   11. RESIZE HANDLER
   ══════════════════════════════════════════════════════════════════
   Cuando el usuario redimensiona la ventana, actualizamos
   el renderer y el aspect ratio de la cámara.
   ══════════════════════════════════════════════════════════════════ */

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Actualizar proporción de la cámara
  camera.aspect = w / h;
  camera.updateProjectionMatrix(); // ← SIEMPRE llamar tras cambiar propiedades

  // Actualizar tamaño del renderer
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});


/* ══════════════════════════════════════════════════════════════════
   12. UI: INTRO & CONTROLES
   ══════════════════════════════════════════════════════════════════ */

let gameStarted = false;

// Partículas decorativas de la intro (generadas con JS)
(function spawnIntroParticles() {
  const container = document.getElementById('intro-particles');
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 5;
    p.style.cssText = `
      width:${size}px;
      height:${size}px;
      left:${Math.random() * 100}%;
      bottom:${Math.random() * 40}%;
      --dur:${4 + Math.random() * 6}s;
      --delay:${Math.random() * 5}s;
    `;
    container.appendChild(p);
  }
})();

// Botón de inicio
document.getElementById('start-btn').addEventListener('click', () => {
  const intro = document.getElementById('intro-screen');

  gsap.to(intro, {
    opacity: 0,
    duration: 0.7,
    ease: 'power2.inOut',
    onComplete: () => {
      intro.style.display = 'none';
      document.getElementById('hud').classList.remove('hidden');
      gameStarted = true;
      clock.start();
    },
  });
});

// Arrancar el loop inmediatamente (renderiza la escena antes del clic para
// que la carga de assets no cause lag al iniciar)
tick();

console.log(
  '%c💛 Para Ámbar %c— Hecho con amor y Three.js',
  'color:#c9963c;font-size:1.2rem;font-weight:bold',
  'color:#7a4a2a;font-size:.9rem',
);