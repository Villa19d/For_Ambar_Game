/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandBase.js  —  Clase base para todas las islas

   Cada isla es una zona del mapa alejada del centro con:
   - Una plataforma elevada o área decorada diferente
   - Un checkpoint (cubo flotante + modal)
   - Decoración propia (luces, props)
   - Colisión registrada en colliders

   Uso:
     class IslandCofre extends IslandBase {
       _buildDecoration(g) { ... }
     }
   ═══════════════════════════════════════════════════════════ */

class IslandBase {
  constructor(scene, colliders, cfg) {
    this.scene     = scene;
    this.colliders = colliders;
    this.cfg       = cfg;   // { x, z, id, label, icon, color, emissive }

    this.group     = new THREE.Group();
    this.group.position.set(cfg.x, 0, cfg.z);
    scene.add(this.group);

    this._triggered  = false;
    this._wasInRange = false;
    this.cube        = null;
    this.mat         = null;

    this._buildPlatform();
    this._buildMarker();
    this._buildDecoration();    // override en cada subclase

    // Registrar zona de colisión de la isla (barrera visual)
    colliders.push({ x: cfg.x, z: cfg.z, r: 3.5 });
  }

  /* ── Plataforma base ──────────────────────────────────── */
  _buildPlatform() {
    const g = this.group;
    const c = this.cfg;

    // Suelo de la isla — ligeramente elevado y con color propio
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 10, 0.35, 18),
      new THREE.MeshStandardMaterial({ color: 0x6b1a06, roughness: 0.85 })
    );
    ground.position.y = 0.17;
    ground.receiveShadow = ground.castShadow = true;
    g.add(ground);

    // Borde decorativo
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(9.3, 0.18, 6, 28),
      new THREE.MeshStandardMaterial({ color: c.color, emissive: c.emissive, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.5 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.38;
    g.add(rim);

    // Luz de suelo coloreada
    const glow = new THREE.PointLight(c.color, 1.2, 18);
    glow.position.y = 0.5;
    g.add(glow);
    this._rimLight = glow;

    // Camino de acceso (strip de tierra hacia la pista)
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 14),
      new THREE.MeshStandardMaterial({ color: 0x8a2808, roughness: 0.9 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 11);   // apunta hacia el centro del mapa
    path.receiveShadow = true;
    g.add(path);
  }

  /* ── Marcador del checkpoint ────────────────────────── */
  _buildMarker() {
    const g = this.group;
    const c = this.cfg;

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x2e1608, roughness: 0.8 }));
    base.position.y = 0.5; base.castShadow = true; g.add(base);

    // Columna
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.7 }));
    col.position.y = 2.2; col.castShadow = true; g.add(col);

    // Cubo flotante
    this.mat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.emissive, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4
    });
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), this.mat);
    this.cube.position.y = 4.2; this.cube.castShadow = true; g.add(this.cube);

    // Luz del cubo
    const pt = new THREE.PointLight(c.color, 2.5, 18);
    pt.position.y = 4.4; g.add(pt);

    // Label
    g.add(this._makeLabel(c.icon + ' ' + c.label, 0, 5.8));
  }

  /* ── Label canvas ───────────────────────────────────── */
  _makeLabel(text, x=0, y=0) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(20,10,4,0.85)';
    ctx.beginPath(); ctx.roundRect(8, 8, 496, 112, 20); ctx.fill();
    ctx.fillStyle = '#f5e8d0'; ctx.font = 'bold 44px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false
    }));
    sp.scale.set(4.5, 1.1, 1);
    sp.position.set(x, y, 0);
    return sp;
  }

  /* ── Override en subclases ──────────────────────────── */
  _buildDecoration() {
    // vacío por defecto
  }

  /* ── Update — llamado desde World.update() ──────────── */
  update(t, carPos, input, lastAction) {
    // Animar cubo flotante
    if(this.cube) {
      this.cube.position.y = 4.2 + Math.sin(t * 1.8 + this.cfg.x) * 0.3;
      this.cube.rotation.y += 0.009;
      this.mat.emissiveIntensity = 0.5 + Math.sin(t * 2 + this.cfg.z) * 0.45;
    }
    if(this._rimLight) this._rimLight.intensity = 1.0 + Math.sin(t * 1.3 + this.cfg.x) * 0.4;

    // Detectar proximidad
    const d = new THREE.Vector2(carPos.x, carPos.z)
                .distanceTo(new THREE.Vector2(this.cfg.x, this.cfg.z));

    const inRange = d < TRIGGER_DIST;
    if(inRange && !this._wasInRange && typeof gameAudio !== 'undefined')
      gameAudio.proximity();
    this._wasInRange = inRange;

    // Trigger con acción
    if(inRange && input && !lastAction) {
      if(typeof window.openModal === 'function') window.openModal(this.cfg.id);
      if(!this._triggered && !this.cfg.isJukebox) {
        this._triggered = true;
        if(this.mat && typeof gsap !== 'undefined')
          gsap.to(this.mat, { emissiveIntensity: 3, duration: 0.25, yoyo: true, repeat: 4 });
        if(typeof window.onIslandDiscovered === 'function')
          window.onIslandDiscovered(this.cfg.id);
      }
    }

    return inRange;
  }
}