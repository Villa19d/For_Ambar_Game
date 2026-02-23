/* ═══════════════════════════════════════════════════════════
   Main.js  —  Entrada del juego con LOADER
   ═══════════════════════════════════════════════════════════ */

// ── PARCHAR RUTAS PARA USAR EL ZIP DE MODELOS (CORREGIDO) ──
(function patchGLBPaths() {
  const BASE_URL = 'https://github.com/Villa19d/For_Ambar_Game/releases/download/v1.0-modelos/models.zip';
  //                                falta la barra? no, está bien aquí 👆

  const originalGLTFLoad = THREE.GLTFLoader.prototype.load;

  THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
    if (url.includes('.glb') && !url.includes('http')) {
      let cleanPath = url.replace(/^(\.\/|models\/)/, '');
      const encodedPath = cleanPath.replace(/ /g, '%20');
      
      // ✅ AHORA SÍ: BASE_URL + /models/ + archivo
      const newUrl = `${BASE_URL}/models/${encodedPath}`;
      
      console.log(`%c📦 GLB desde ZIP: ${url} → ${newUrl}`, 'color:#ff9900;font-weight:bold');

      return originalGLTFLoad.call(this, newUrl, onLoad, onProgress, onError);
    }
    return originalGLTFLoad.call(this, url, onLoad, onProgress, onError);
  };

  console.log('%c🔥 Parche activado: usando ZIP de GitHub Releases', 'color:#ffaa00;font-weight:bold');
})();

/* ══ 1. RENDERER (siempre presente) ═══════════════════════ */
const canvas   = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

/* ══ 2. SCENE + CAMERA (siempre presentes) ═══════════════ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a2e);
scene.fog        = new THREE.FogExp2(0x2a0a3e, 0.008);

const threeCamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 350);
threeCamera.position.set(0, 8, 15);
threeCamera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  threeCamera.aspect = innerWidth / innerHeight;
  threeCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

/* ══ 3. MÓDULOS BÁSICOS (INPUT Y AUDIO SIEMPRE LISTOS) ════ */
const input      = new Input();
const gameAudio  = new GameAudio();

// Variables globales que se llenarán después
let world = null;
let vehicle = null;
let gameCamera = null;
let gameOn = false;
let lastAction = false;
let loading = false;

/* ══ 4. INTRO PARTÍCULAS (solo decoración) ════════════════ */
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

/* ══ 5. FUNCIÓN DE CARGA (se ejecuta al hacer click) ═══════ */
async function loadGame() {
  if (loading) return;
  loading = true;
  
  const startBtn = document.getElementById('start-btn');
  const loaderEl = document.getElementById('game-loader');
  
  // Deshabilitar botón y mostrar loader
  startBtn.disabled = true;
  startBtn.style.opacity = '0.5';
  loaderEl.classList.remove('hidden');
  
  console.log('%c⏳ Cargando mundo...', 'color:#ffaa00;font-size:14px');
  
  // Simular progreso (opcional)
  let progress = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + 5, 90);
    loaderEl.style.setProperty('--progress', `${progress}%`);
  }, 100);
  
  // Usamos setTimeout para no bloquear el hilo principal
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Crear el mundo (AQUÍ SÍ SE CONSTRUYE TODO)
  world = new World(scene);
  vehicle = new Vehicle(scene, world.colliders);
  vehicle.group.position.set(0, 0.5, 10);
  
  window._modalManager = new ModalManager();
  window._modalManager.setAudio(gameAudio);
  gameCamera = new GameCamera(threeCamera, canvas);
  
  // Iniciar música base
  const jukebox = gameAudio.initJukebox();
  if (!jukebox.isBasePlaying) {
    await jukebox.startBaseMusic();
  }
  
  // Carga completada
  clearInterval(interval);
  loaderEl.style.setProperty('--progress', '100%');
  
  // Pequeña pausa para ver el 100%
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Ocultar intro y empezar juego
  const intro = document.getElementById('intro-screen');
  gsap.to(intro, {
    opacity: 0, duration: 0.7, ease: 'power2.inOut',
    onComplete: () => {
      intro.style.display = 'none';
      document.getElementById('hud').classList.remove('hidden');
      gameOn = true;
      clock.start();
      loaderEl.classList.add('hidden');
      console.log('%c✅ Juego listo!', 'color:#00ff00;font-size:16px');
    }
  });
}

/* ══ 6. TICK LOOP (SIEMPRE CORRE) ════════════════════════ */
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  renderer.render(scene, threeCamera);
  
  // Si el juego no ha empezado, solo renderizar la escena vacía
  if (!gameOn || !world || !vehicle || !gameCamera) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = Date.now() * 0.001;

  vehicle.update(dt, t, input);
  gameCamera.update(dt, vehicle);

  const actionNow = input.action && !lastAction;
  world.update(dt, t, vehicle.group.position, actionNow, lastAction);
  lastAction = input.action;
}

/* ══ 7. BOTÓN INICIO (AHORA LLAMA A LOADGAME) ════════════ */
document.getElementById('start-btn').addEventListener('click', loadGame);

document.getElementById('replay-btn')?.addEventListener('click', () => location.reload());

tick();
console.log('%c💛 Para Ámbar — con sistema de carga diferida', 'color:#ffd60a;font-size:1.2rem;font-weight:bold');