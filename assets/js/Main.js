/* ═══════════════════════════════════════════════════════════
   Main.js  —  Entrada del juego, estilo Bruno Simon
   Orden: Renderer → Scene → Modules → Tick → UI
   ═══════════════════════════════════════════════════════════ */

/* ══ 1. RENDERER ═══════════════════════════════════════════ */
const canvas   = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

/* ══ 2. SCENE + CAMERA ════════════════════════════════════ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a2e);
scene.fog        = new THREE.FogExp2(0x2a0a3e, 0.008);  // fog más suave para el mundo grande

const threeCamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 350);
threeCamera.position.set(0, 8, 15);
threeCamera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  threeCamera.aspect = innerWidth / innerHeight;
  threeCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

/* ══ 3. MÓDULOS ════════════════════════════════════════════
   Orden idéntico a Bruno Simon: Input → Audio → World → Vehicle → Camera → UI
════════════════════════════════════════════════════════════ */
const input      = new Input();
const gameAudio  = new GameAudio();
const world      = new World(scene);
const vehicle    = new Vehicle(scene, world.colliders);

// ── MOVER EL CARRO MÁS ATRÁS (para que no spawnee entre las letras) ──
vehicle.group.position.set(0, 0.5, 10); // 15 unidades hacia atrás (Z positivo)


// 2. Crear ModalManager y conectar GameAudio
window._modalManager = new ModalManager();
window._modalManager.setAudio(gameAudio);  // ¡Importante!
const gameCamera = new GameCamera(threeCamera, canvas);

/* ══ 4. INTRO PARTÍCULAS ═══════════════════════════════════ */
(function buildIntroParticles() {
  const c = document.getElementById('intro-particles');
  if(!c) return;
  for(let i = 0; i < 35; i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const s = 2 + Math.random() * 5;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;bottom:${Math.random()*40}%;--dur:${4+Math.random()*6}s;--delay:${Math.random()*5}s;`;
    c.appendChild(p);
  }
})();

/* ══ 5. TICK LOOP ══════════════════════════════════════════
   Orden de Bruno: pre-physics → world → camera → UI
════════════════════════════════════════════════════════════ */
const clock  = new THREE.Clock();
let gameOn   = false;
let lastAction = false;

function tick() {
  requestAnimationFrame(tick);
  renderer.render(scene, threeCamera);
  if(!gameOn) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = Date.now() * 0.001;

  // 1. Física del vehículo
  vehicle.update(dt, t, input);

  // 2. Cámara
  gameCamera.update(dt, vehicle);

  // 3. Mundo + islas (pasan input para detectar interacción)
  const actionNow = input.action && !lastAction;   // flanco de subida
  world.update(dt, t, vehicle.group.position, actionNow, lastAction);
  lastAction = input.action;
}

/* ══ 6. BOTÓN INICIO ═══════════════════════════════════════ */
document.getElementById('start-btn').addEventListener('click', async () => {
    const intro = document.getElementById('intro-screen');
    
    // Iniciar música base a través de GameAudio
    const jukebox = gameAudio.initJukebox();
    await jukebox.startBaseMusic();
    
    gsap.to(intro, {
        opacity: 0, duration: 0.7, ease: 'power2.inOut',
        onComplete: () => {
            intro.style.display = 'none';
            document.getElementById('hud').classList.remove('hidden');
            gameOn = true;
            clock.start();
        }
    });
});

document.getElementById('replay-btn')?.addEventListener('click', () => location.reload());

tick();
console.log('%c💛 Para Ámbar — modular, estilo Bruno Simon', 'color:#ffd60a;font-size:1.2rem;font-weight:bold');