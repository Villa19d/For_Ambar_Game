/* ═══════════════════════════════════════════════════════════
   script.js — Para Ámbar 💛
   VERSION FINAL — sin Cannon.js para el movimiento
   Movimiento 100% en Three.js (simple, robusto, funciona)
═══════════════════════════════════════════════════════════ */

/* ─── 0. TEXTO DE LA CARTA — edita esto ──────────────────── */
const CARTA_TEXTO =
`Hay lugares en el mundo que no están en ningún mapa,
pero que existen porque tú los iluminaste.

Este pequeño rincón lo construí pensando en ti,
en tu forma de reír cuando algo te sorprende,
y en cómo todo se vuelve más bonito cuando estás cerca.

Gracias por ser mi lugar favorito.`;

/* ─── 0b. CHECKPOINTS — posiciones en el mapa ────────────── */
const CHECKPOINTS_DATA = [
  { id:'modal-1', label:'El Cofre', icon:'🗝️', x:-12, z:-8,  color:0xc9963c, emissive:0x6b4d10 },
  { id:'modal-2', label:'La Radio', icon:'📻', x: 14, z:-6,  color:0xe8714a, emissive:0x7a2c0f },
  { id:'modal-3', label:'El Faro',  icon:'🏮', x:  2, z:-22, color:0xa8d4a0, emissive:0x2a5c25 },
];

const TRIGGER_DIST  = 3.5;   // distancia para activar checkpoint
const CAR_ACCEL     = 30;    // aceleración (unidades/s²)
const CAR_MAX_SPEED = 12;    // velocidad tope (unidades/s)
const CAR_FRICTION  = 0.87;  // multiplicador de frenado por frame
const CAR_TURN_SPD  = 130;   // grados por segundo al girar

/* ═══════════════════════════════════════════════════════════
   1. RENDERER + ESCENA + CÁMARA + LUCES
═══════════════════════════════════════════════════════════ */
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('webgl-canvas'),
  antialias: true
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x130903);
scene.fog = new THREE.FogExp2(0x1f0c04, 0.024);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 150);
// offset fijo de cámara: arriba y detrás del carrito (vista cenital Bruno Simon)
const CAM_OFFSET = new THREE.Vector3(0, 16, 13);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

// Luces
scene.add(new THREE.HemisphereLight(0xffe4b5, 0x3d1a04, 0.9));

const sun = new THREE.DirectionalLight(0xffd580, 2.2);
sun.position.set(15, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far  = 100;
[-45, 45].forEach(v => {
  sun.shadow.camera.left   = sun.shadow.camera.bottom = -45;
  sun.shadow.camera.right  = sun.shadow.camera.top    =  45;
});
sun.shadow.bias = -0.001;
scene.add(sun);

const fill = new THREE.PointLight(0xff7c2a, 1.0, 60);
fill.position.set(-8, 4, 5);
scene.add(fill);

/* ═══════════════════════════════════════════════════════════
   2. SUELO
═══════════════════════════════════════════════════════════ */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshStandardMaterial({ color: 0xc96d3a, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(300, 100, 0xa5562a, 0xa5562a);
grid.material.opacity = 0.14;
grid.material.transparent = true;
grid.position.y = 0.01;
scene.add(grid);

/* ═══════════════════════════════════════════════════════════
   3. CARRITO
═══════════════════════════════════════════════════════════ */
const car = new THREE.Group();
scene.add(car);

// Cuerpo
const carBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.65, 2.4),
  new THREE.MeshStandardMaterial({ color: 0xd63a2f, roughness: 0.25, metalness: 0.35 })
);
carBody.position.y = 0.35;
carBody.castShadow = true;
car.add(carBody);

// Cabina
const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.55, 1.1),
  new THREE.MeshStandardMaterial({ color: 0xeb5a4e, roughness: 0.2, metalness: 0.2 })
);
cabin.position.set(0, 0.97, -0.3);
cabin.castShadow = true;
car.add(cabin);

// Parabrisas
const glass = new THREE.Mesh(
  new THREE.BoxGeometry(1.05, 0.38, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.8, transparent: true, opacity: 0.7 })
);
glass.position.set(0, 1.0, 0.26);
car.add(glass);

// Ruedas
const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
const rimGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 12);
const rimMat   = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.3, metalness: 0.8 });
const wheelMeshes = [];

[[0.78,0.75],[-0.78,0.75],[0.78,-0.75],[-0.78,-0.75]].forEach(([x,z]) => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0, z);
  w.castShadow = true;
  car.add(w);
  wheelMeshes.push(w);

  const r = new THREE.Mesh(rimGeo, rimMat);
  r.rotation.z = Math.PI / 2;
  r.position.set(x, 0, z);
  car.add(r);
});

// Estado del movimiento — todo en Three.js, sin física externa
const carVel = new THREE.Vector3();   // velocidad actual
let   carYaw = 0;                     // rotación Y (radianes)

/* ═══════════════════════════════════════════════════════════
   4. CHECKPOINTS
═══════════════════════════════════════════════════════════ */
const checkpoints = [];

CHECKPOINTS_DATA.forEach(cfg => {
  const g = new THREE.Group();
  g.position.set(cfg.x, 0, cfg.z);
  scene.add(g);

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
    new THREE.CylinderGeometry(0.18, 0.2, 2.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.7 })
  );
  col.position.y = 1.55;
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
  cube.position.y = 3.35;
  cube.castShadow = true;
  g.add(cube);

  // Luz de color
  const pt = new THREE.PointLight(cfg.color, 2.0, 14);
  pt.position.y = 3.5;
  g.add(pt);

  // Etiqueta sprite
  const label = makeLabel(cfg.icon + ' ' + cfg.label);
  label.position.y = 5.2;
  g.add(label);

  checkpoints.push({ cfg, cube, mat, triggered: false, wasInRange: false });
});

function makeLabel(text) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(20,10,4,0.78)';
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
    depthTest: false
  }));
  sp.scale.set(4.5, 1.1, 1);
  return sp;
}

/* ═══════════════════════════════════════════════════════════
   5. PARTÍCULAS
═══════════════════════════════════════════════════════════ */
(function(){
  const n = 300, r = 60, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i*3]   = (Math.random()-0.5)*r;
    pos[i*3+1] = Math.random()*10;
    pos[i*3+2] = (Math.random()-0.5)*r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xc9963c, size: 0.07, sizeAttenuation: true,
    transparent: true, opacity: 0.5, depthWrite: false
  }));
  scene.add(pts);
  window._pts = pts;
})();

/* ═══════════════════════════════════════════════════════════
   6. TECLADO
═══════════════════════════════════════════════════════════ */
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
const open  = () => pressing('e', 'E');

/* ═══════════════════════════════════════════════════════════
   7. AUDIO
═══════════════════════════════════════════════════════════ */
let _actx = null;
const actx = () => _actx || (_actx = new (AudioContext || webkitAudioContext)());

function tone(freq, dur, type='sine', vol=0.18) {
  try {
    const c = actx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  } catch(_){}
}
const sfxProx = () => tone(660, 0.18, 'sine', 0.16);
const sfxOpen = () => { tone(523,0.1,'triangle',0.14); setTimeout(()=>tone(784,0.2,'triangle',0.14),90); };

/* ═══════════════════════════════════════════════════════════
   8. MODALES
═══════════════════════════════════════════════════════════ */
let currentModal = null;
let discovered   = 0;
const discEl  = document.getElementById('disc-count');
const hintEl  = document.getElementById('proximity-hint');

function openModal(id) {
  if (currentModal === id) return;
  if (currentModal) closeModal(currentModal);
  currentModal = id;
  const el = document.getElementById(id);
  el.classList.add('open');
  el.setAttribute('aria-hidden','false');
  sfxOpen();
  if (id === 'modal-3') typewrite();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  gsap.to(el, { opacity:0, duration:0.25, ease:'power2.in', onComplete:() => {
    el.classList.remove('open');
    el.setAttribute('aria-hidden','true');
    gsap.set(el, { clearProps:'opacity' });
  }});
  if (currentModal === id) currentModal = null;
}

document.querySelectorAll('.modal-close').forEach(b =>
  b.addEventListener('click', () => closeModal(b.dataset.modal))
);
document.querySelectorAll('.modal-backdrop').forEach(el =>
  el.addEventListener('click', e => { if (e.target===el) closeModal(el.id); })
);
window.addEventListener('keydown', e => {
  if (e.key==='Escape' && currentModal) closeModal(currentModal);
});

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
    ['💛','🌻','💫','✨','🌼','💕'].forEach((e,i) => {
      for (let j=0; j<4; j++) {
        const h = document.createElement('span');
        h.className = 'heart-float'; h.textContent = e;
        h.style.setProperty('--l', Math.random()*100+'%');
        h.style.setProperty('--d', (3+Math.random()*5)+'s');
        h.style.setProperty('--del', Math.random()*3+'s');
        cont.appendChild(h);
      }
    });
  }, 600);
}

document.getElementById('replay-btn').addEventListener('click', () => location.reload());

/* ═══════════════════════════════════════════════════════════
   9. LOOP DE ANIMACIÓN
═══════════════════════════════════════════════════════════ */
const clock    = new THREE.Clock();
const _camPos  = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _fwd     = new THREE.Vector3();
const _car2D   = new THREE.Vector2();
const _cp2D    = new THREE.Vector2();
let gameOn     = false;
let lastOpen   = false;
let closestCp  = null;

function tick() {
  requestAnimationFrame(tick);

  /* Siempre renderizamos — esto es vital para que la escena
     sea visible ANTES de que el usuario pulse "Comenzar"     */
  renderer.render(scene, camera);

  if (!gameOn) return;   // lógica de juego solo si comenzó

  const dt = Math.min(clock.getDelta(), 0.05);

  /* ── MOVIMIENTO ─────────────────────────────────────────
     1. Rotar el yaw según A / D
     2. Calcular dirección adelante a partir del yaw
     3. Acumular velocidad con W / S
     4. Aplicar fricción (frena solo al soltar)
     5. Mover y mantener en Y=0                           */

  if (left())  carYaw += THREE.MathUtils.degToRad(CAR_TURN_SPD) * dt;
  if (right()) carYaw -= THREE.MathUtils.degToRad(CAR_TURN_SPD) * dt;

  car.rotation.y = carYaw;

  // Dirección adelante en espacio mundial
  _fwd.set(-Math.sin(carYaw), 0, -Math.cos(carYaw));

  if (fwd()) carVel.addScaledVector(_fwd,  CAR_ACCEL * dt);
  if (bwd()) carVel.addScaledVector(_fwd, -CAR_ACCEL * dt);

  // Fricción y tope de velocidad
  carVel.multiplyScalar(CAR_FRICTION);
  if (carVel.length() > CAR_MAX_SPEED)
    carVel.normalize().multiplyScalar(CAR_MAX_SPEED);

  car.position.addScaledVector(carVel, dt);
  car.position.y = 0;  // siempre pegado al suelo

  // Rotar ruedas según velocidad
  const spd = carVel.length();
  wheelMeshes.forEach(w => { w.rotation.x -= spd * dt * 1.6; });

  /* ── CÁMARA ─────────────────────────────────────────────
     Sigue al carrito con lerp (movimiento suave/perezoso)  */
  _camPos.set(
    car.position.x + CAM_OFFSET.x,
    car.position.y + CAM_OFFSET.y,
    car.position.z + CAM_OFFSET.z
  );
  camera.position.lerp(_camPos, 0.08);
  _camLook.set(car.position.x, car.position.y + 0.5, car.position.z);
  camera.lookAt(_camLook);

  /* ── CHECKPOINTS ────────────────────────────────────────
     Distancia 2D (XZ) entre carrito y cada checkpoint.
     Al entrar en rango → hint. Tecla E → abrir modal.     */
  _car2D.set(car.position.x, car.position.z);
  closestCp = null;
  let minD = Infinity;

  checkpoints.forEach(cp => {
    // Animación flotante + giro del cubo
    const t = Date.now() * 0.001;
    cp.cube.position.y    = 3.35 + Math.sin(t * 1.8 + cp.cfg.x) * 0.3;
    cp.cube.rotation.y   += dt * 0.9;
    cp.mat.emissiveIntensity = 0.5 + Math.sin(t * 2 + cp.cfg.z) * 0.45;

    if (cp.triggered) return;

    _cp2D.set(cp.cfg.x, cp.cfg.z);
    const d = _car2D.distanceTo(_cp2D);

    if (d < TRIGGER_DIST) {
      if (!cp.wasInRange) { cp.wasInRange = true; sfxProx(); }
      if (d < minD) { minD = d; closestCp = cp; }
    } else {
      cp.wasInRange = false;
    }
  });

  // Hint "Presiona E"
  if (closestCp && !currentModal) hintEl.classList.remove('hidden');
  else                             hintEl.classList.add('hidden');

  // Abrir modal (flanco de subida de E)
  const openNow = open();
  if (openNow && !lastOpen && closestCp && !currentModal) {
    openModal(closestCp.cfg.id);
    if (!closestCp.triggered) {
      closestCp.triggered = true;
      discovered++;
      discEl.textContent = discovered;
      gsap.to(closestCp.mat, { emissiveIntensity:3, duration:0.25, yoyo:true, repeat:4 });
      if (discovered === 3) finalScreen();
    }
  }
  lastOpen = openNow;

  if (window._pts) window._pts.rotation.y += dt * 0.02;
}

/* ═══════════════════════════════════════════════════════════
   10. RESIZE
═══════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

/* ═══════════════════════════════════════════════════════════
   11. INTRO
═══════════════════════════════════════════════════════════ */
// Partículas CSS de la intro
(function(){
  const c = document.getElementById('intro-particles');
  if (!c) return;
  for (let i=0; i<35; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const s = 2 + Math.random()*5;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;bottom:${Math.random()*40}%;--dur:${4+Math.random()*6}s;--delay:${Math.random()*5}s;`;
    c.appendChild(p);
  }
})();

document.getElementById('start-btn').addEventListener('click', () => {
  const intro = document.getElementById('intro-screen');
  gsap.to(intro, {
    opacity: 0,
    duration: 0.7,
    ease: 'power2.inOut',
    onComplete: () => {
      intro.style.display = 'none';
      document.getElementById('hud').classList.remove('hidden');
      gameOn = true;
      clock.start();     // reinicia el clock para que delta sea 0 el primer frame
    }
  });
});

// Arrancar el loop (renderiza la escena desde el primer momento)
tick();

console.log('%c💛 Para Ámbar — Hecho con amor', 'color:#c9963c;font-size:1.2rem;font-weight:bold');