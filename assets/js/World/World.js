/* ═══════════════════════════════════════════════════════════
   World/World.js  —  Orquestador del mundo

   Estructura escalable:
   World/
   ├── World.js          ← este archivo (solo orquesta)
   ├── Ground.js         ← suelo
   ├── Track.js          ← pista
   ├── Foliage.js        ← árboles, pasto, viento
   └── Islands/
       ├── IslandBase.js
       ├── IslandCofre.js
       ├── IslandRadio.js
       ├── IslandFaro.js
       └── IslandRocola.js

   Para agregar una isla nueva:
   1. Crear IslandNueva.js extendiendo IslandBase
   2. Agregar el <script> en index.html
   3. Instanciar en _buildIslands() con su config
   ═══════════════════════════════════════════════════════════ */

class World {
  constructor(scene) {
    this.scene     = scene;
    this.colliders = [];

    this._buildLighting();
    this.ground  = new Ground(scene);
    this.track   = new Track(scene);
    this.foliage = new Foliage(scene, this.colliders);
    this._buildIslands();

    // EXPONER ISLAS PARA EL VEHÍCULO
    window._islands = this.islands;
  }

  /* ─── ILUMINACIÓN ──────────────────────────────────────── */
  _buildLighting() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xff7040, 0x1a0530, 1.3));

    this.sun = new THREE.DirectionalLight(0xffa060, 3.2);
    this.sun.position.set(40, 22, 15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(2048);
    this.sun.shadow.camera.left   = -120;
    this.sun.shadow.camera.right  =  120;
    this.sun.shadow.camera.bottom = -120;
    this.sun.shadow.camera.top    =  120;
    this.sun.shadow.camera.far    = 250;
    this.sun.shadow.bias = -0.0008;
    s.add(this.sun);

    const fillA = new THREE.DirectionalLight(0x4010aa, 0.6);
    fillA.position.set(-30, 10, -20);
    s.add(fillA);

    const fillB = new THREE.PointLight(0xff5020, 0.9, 200);
    fillB.position.set(0, -2, 0);
    s.add(fillB);
  }

  /* ─── ISLAS ─────────────────────────────────────────────── */
  _buildIslands() {
    this.islands = [];

    const islandConfigs = [
      {
        Class: IslandCofre,
        cfg: { id:'modal-1', label:'El Cofre', icon:'🗝️', x:-55, z:-40, color:0xc9963c, emissive:0x6b4d10 }
      },
      {
        Class: IslandRadio,
        cfg: { id:'modal-2', label:'La Radio', icon:'📻', x:58, z:-38, color:0xe8714a, emissive:0x7a2c0f }
      },
      {
        Class: IslandFaro,
        cfg: { id:'modal-3', label:'El Faro', icon:'🏮', x:5, z:-70, color:0xa8d4a0, emissive:0x2a5c25 }
      },
      {
        Class: IslandRocola,
        cfg: { id:'jukebox', label:'La Rocola', icon:'🎵', x:-8, z:68, color:0xd4a8ff, emissive:0x4a1a8c, isJukebox:true }
      },
      // Agrega más islas aquí — solo copiar un bloque y crear el .js
    ];

    islandConfigs.forEach(({ Class, cfg }) => {
      this.islands.push(new Class(this.scene, this.colliders, cfg));
    });

    console.log(`%c🏝️ ${this.islands.length} islas listas`, 'color:#d4a8ff;font-weight:bold');
  }

  /* ─── UPDATE ────────────────────────────────────────────── */
  update(dt, t, carPos, input, lastAction) {
    this.foliage.update(dt, t);

    let anyInRange = false;
    this.islands.forEach(island => {
      const inRange = island.update(t, carPos, input, lastAction);
      if(inRange) anyInRange = true;
    });

    // Delegar hint de proximidad al ModalManager
    if(window._modalManager) window._modalManager.update(anyInRange);

    const skyH = 0.78 + Math.sin(t * 0.04) * 0.06;
    this.scene.background.setHSL(skyH, 0.65 + Math.sin(t*0.07)*0.1, 0.07 + Math.sin(t*0.05)*0.02);
  }

  /* ─── Isla más cercana al carro ─────────────────────────── */
  getClosestIsland(carPos) {
    const car2D = new THREE.Vector2(carPos.x, carPos.z);
    let closest = null, minD = Infinity;
    this.islands.forEach(island => {
      const d = car2D.distanceTo(new THREE.Vector2(island.cfg.x, island.cfg.z));
      if(d < minD){ minD = d; closest = island; }
    });
    return minD < TRIGGER_DIST ? closest : null;
  }
}