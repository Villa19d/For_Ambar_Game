/* ═══════════════════════════════════════════════════════════
   Config.js  —  Configuración global  —  Para Ámbar 💛

   Valores de física traducidos EXACTAMENTE de Bruno Simon:
   
   Bruno (Rapier)          Nosotros (custom)
   ─────────────────────────────────────────────────────
   engineForceAmplitude:300  accel:180  (menos = arranque más suave)
   topSpeed: 5 (Rapier u)    speed: 22  (nuestras unidades, ~4x mundo)
   idleBrake: 0.06           idleBrake: 0.06  ← idéntico
   reverseBrake: 0.4         reverseBrake: 0.4 ← idéntico
   steeringAmplitude: 0.5rad steeringAmplitude en Vehicle.params
   sideFriction: 3 (Rapier)  lateralDamping: 12 ← simula Rapier

   ANTES el carro se iba de largo porque:
   1. speed:110 era 5x demasiado rápido
   2. No había fricción lateral (Rapier la daba gratis)
   3. El idleBrake se aplicaba como Math.pow() en lugar de
      brake * brakeAmplitude * dt como Bruno
   ═══════════════════════════════════════════════════════════ */

const CFG = {
  /* ── VEHÍCULO ──────────────────────────────────────────── */
  speed:        22,     // topSpeed — Bruno usa 5 en Rapier; 22 = equivalente en nuestro espacio
  accel:        180,    // engineForceAmplitude — Bruno usa 300; 180 = arranque más suave y controlable
  idleBrake:    0.06,   // Bruno: 0.06 — idéntico, freno suave sin input
  reverseBrake: 0.4,    // Bruno: 0.4 — freno fuerte al ir dirección contraria
  steerLerp:    8,      // suavidad del volante visual

  /* ── CÁMARA ────────────────────────────────────────────── */
  camLerp:   0.09,
  camOffset: { y: 8, z: 11 },

  /* ── SALTO / GRAVEDAD ──────────────────────────────────── */
  jumpForce: 10,
  gravity:   38,
};

/* ─── CHECKPOINTS ──────────────────────────────────────────── */
const CHECKPOINTS = [
  { id:'modal-1', label:'El Cofre',  icon:'🗝️', x:-14, z:-10, color:0xc9963c, emissive:0x6b4d10 },
  { id:'modal-2', label:'La Radio',  icon:'📻', x: 16, z: -8, color:0xe8714a, emissive:0x7a2c0f },
  { id:'modal-3', label:'El Faro',   icon:'🏮', x:  2, z:-24, color:0xa8d4a0, emissive:0x2a5c25 },
  { id:'jukebox', label:'La Rocola', icon:'🎵', x: -6, z: 14, color:0xd4a8ff, emissive:0x4a1a8c, isJukebox:true },
];
const TRIGGER_DIST = 6;    // más grande para la isla Rocola ampliada

const CARTA_TEXTO =
`Hay lugares en el mundo que no están en ningún mapa,
pero que existen porque tú los iluminaste.

Este pequeño rincón lo construí pensando en ti,
en tu forma de reír cuando algo te sorprende,
y en cómo todo se vuelve más bonito cuando estás cerca.

Gracias por ser mi lugar favorito.`;

const SONGS = [
    { 
        title: 'DAISIES', 
        artist: 'Justin Bieber',
        file: 'DAISIES.mp3',
        cover: 'Daises.jpg',
        startTime: 65, // 1:05 en segundos
        color: '#f5e56b'
    },
    { 
        title: 'Pegao', 
        artist: 'Camilo',
        file: 'Pegao.mp3',
        cover: 'Pegao.jpg',
        startTime: 18, // 0:18
        color: '#ff9966'
    },
    { 
        title: 'Fallin All In You', 
        artist: 'Shawn Mendes',
        file: 'Fallin All In You.mp3',
        cover: 'Fallin All In You.jpg',
        startTime: 60, // 1:00
        color: '#ff6b6b'
    },
    { 
        title: 'Chachacha', 
        artist: 'Josean Log',
        file: 'Chachacha.mp3',
        cover: 'Chachacha.jpg',
        startTime: 93, // 1:33
        color: '#66cc99'
    },
    { 
        title: 'The World Is Ugly', 
        artist: 'My Chemical Romance',
        file: 'The World Is Ugly.mp3',
        cover: 'The World Is Ugly.png',
        startTime: 133, // 2:13
        color: '#aa88ff'
    },
    { 
        title: 'Serotonina', 
        artist: 'Humbe',
        file: 'Serotonina.mp3',
        cover: 'Serotonina.jpg',
        startTime: 105, // 1:45
        color: '#ff88aa'
    },
];

// Canción base (loop ambiental)
const BASE_SONG = {
    title: 'Daises Guitar',
    artist: 'Ambient',
    file: 'Song Base/daises chill.mp3',
    cover: 'Daises.jpg', // Usar misma carátula
    loop: true,
    volume: 0.3
};

const GRASS_CFG = {
  GLB_PATH : 'models/grass/grass.glb',
  COUNT    : 500,
  MIN_SCALE: 0.8,
  MAX_SCALE: 2.2,
  SPREAD   : 40,
};