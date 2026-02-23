/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandLetras.js  —  Letras "PARA ÁMBAR 💛"
   • Usa modelos GLB para las letras y el corazón
   • COLISIÓN SIMPLE Y PRECISA - Solo colliders en las letras
   • SIN disco de plataforma invisible
   ═══════════════════════════════════════════════════════════ */

class IslandLetras extends IslandBase {
  
  // ── CONFIGURACIÓN CENTRALIZADA ───────────────────────────
  static CONFIG = {
    basePosition: { x: 0, y: 0, z: 5 },
    globalScale: 1.0,
    heightOffset: 0.5,
    
    letters: [
      // Grupo "PARA"
      { file: 'P_letter.glb', scale: 5.0, x: -11.5, y: 0, z: -7, collisionRadius: 2.0 },
      { file: 'A_letter.glb', scale: 5.0, x: -9.9, y: .5, z: -7.1, collisionRadius: 2.0 },
      { file: 'R_letter.glb', scale: 5.0, x: -6.5, y: 0, z: -7, collisionRadius: 2.0 },
      { file: 'A_letter.glb', scale: 5.0, x: -4.5,  y: .5, z: -7.1, collisionRadius: 2.0 },
      
      { file: null }, // Espacio
      
      // Grupo "ÁMBAR"
      { file: 'A_letter.glb', scale: 5.0, x: -.5,  y: 0.5, z: -7.2, accent: true, collisionRadius: 2.0 },
      { file: 'M_letter.glb', scale: 5.0, x: 2.8,  y: 0, z: -7, collisionRadius: 2.0 },
      { file: 'B_letter.glb', scale: 5.0, x: 5.7,  y: 0, z: -7, collisionRadius: 2.0 },
      { file: 'A_letter.glb', scale: 5.0, x: 8,  y: 0.5, z: -7.15, collisionRadius: 2.0 },
      { file: 'R_letter.glb', scale: 5.0, x: 11, y: 0, z: -7, collisionRadius: 2.0 },
    ],
    
    heart: {
      file: 'pumping_heart_model.glb',
      enabled: true,
      scale: 0.02,
      x: 13, y: 0.5, z: -6,
      color: 0xff3366,
      collisionRadius: 1.5,
      bounce: true
    },
    
    accent: {
      enabled: true,
      scale: 0.6,
      offsetY: 1.0,
      color: 0xffffff,
      collisionRadius: 0.8
    }
  };

  /* ── CONSTRUCTOR: Limpiar colliders de otras islas ── */
  constructor(scene, colliders, cfg) {
    super(scene, colliders, cfg);
    
    // No llamamos a _buildPlatform ni _buildMarker
    // Directamente construimos las letras
    setTimeout(() => {
      this._buildDecoration();
    }, 10);
  }

  /* ── SOBRESCRIBIR PARA EVITAR PLATAFORMA Y MARCADOR ── */
  _buildMarker() {
    // NO HACER NADA - sin poste
  }

  _buildPlatform() {
    // NO HACER NADA - sin plataforma ni colliders invisibles
  }

  /* ── CONSTRUIR LETRAS ── */
  _buildDecoration() {
    this._loadLetterModels();
    console.log('%c🔤 Letras GLB "PARA ÁMBAR 💛" cargadas', 'color:#ffffff;font-weight:bold');
  }

  /* ── CARGAR MODELOS ── */
  _loadLetterModels() {
    const config = IslandLetras.CONFIG;
    const basePath = 'models/Letras/';
    const heartPath = 'models/Corazon/';
    
    this._letterObjects = [];
    this._heartModel = null;
    
    const loader = new THREE.GLTFLoader();

    // Cargar cada letra
    config.letters.forEach((letter, i) => {
      if (!letter.file) return;
      
      const xPos = config.basePosition.x + (letter.x || 0);
      const yPos = config.basePosition.y + config.heightOffset + (letter.y || 0);
      const zPos = config.basePosition.z + (letter.z || 0);
      const scale = config.globalScale * (letter.scale || 1.0);
      
      this._loadLetter(
        loader,
        basePath + letter.file,
        xPos, yPos, zPos,
        scale,
        `letter_${i}`,
        letter.collisionRadius || 2.0
      );
      
      if (config.accent.enabled && letter.accent) {
        this._addAccent(
          xPos, 
          yPos + config.accent.offsetY, 
          zPos, 
          config.accent.scale,
          config.accent.color,
          config.accent.collisionRadius
        );
      }
    });
    
    // Cargar corazón
    if (config.heart.enabled) {
      this._loadHeart(
        loader,
        heartPath + config.heart.file,
        config.basePosition.x + config.heart.x,
        config.basePosition.y + config.heart.y,
        config.basePosition.z + config.heart.z,
        config.globalScale * config.heart.scale,
        config.heart
      );
    }
    
    // IMPORTANTE: Eliminar cualquier collider que no sea de letras
    this._cleanColliders();
  }

  /* ── LIMPIAR COLLIDERS QUE NO SEAN DE LETRAS ── */
  _cleanColliders() {
    if (!window._islandColliders) return;
    
    // Filtrar para quedarnos SOLO con los que son de letras
    // Los colliders de islas normales tienen .isMesh === true
    window._islandColliders = window._islandColliders.filter(c => {
      // Si no tiene isMesh, lo dejamos (son los de letras)
      // Si tiene isMesh, lo quitamos (son de otras islas)
      return !c.isMesh;
    });
    
    console.log(`%c🧹 Colliders limpiados: ${window._islandColliders.length} colliders de letras`, 'color:#ffaa00');
  }

  /* ── CARGAR UNA LETRA ── */
  _loadLetter(loader, path, x, y, z, scale, id, collisionRadius) {
    loader.load(path, (gltf) => {
      const model = gltf.scene;
      
      model.scale.setScalar(scale);
      model.position.set(x, y, z);
      
      // Color blanco
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(mat => {
                mat.color.setHex(0xffffff);
                mat.roughness = 0.3;
                mat.metalness = 0.1;
              });
            } else {
              node.material.color.setHex(0xffffff);
              node.material.roughness = 0.3;
              node.material.metalness = 0.1;
            }
          }
        }
      });
      
      this.group.add(model);
      
      // ── UN SOLO COLLIDER POR LETRA ──
       this._addLetterCollider(x, z, 3.0, id); // <-- Radio 3.5 para probar
      
      console.log(`%c✅ Letra ${id} en (${x.toFixed(1)}, ${z.toFixed(1)}) radio ${collisionRadius}`, 'color:#ffffff');
      
    }, undefined, (error) => {
      console.warn(`⚠️ No se pudo cargar la letra ${path}:`, error);
      this._addFallbackLetter(x, y, z, scale, id, collisionRadius);
    });
  }

  /* ── AÑADIR COLLIDER OBVIO (radio grande para pruebas) ── */
_addLetterCollider(x, z, radius, id) {
  if (!window._islandColliders) {
    window._islandColliders = [];
  }
  
  // Radio MUY grande para pruebas (después lo ajustamos)
  const testRadius = radius; // <-- CAMBIA ESTO para hacer las letras más "chocables"
  
  window._islandColliders.push({
    x: x,
    z: z,
    r: testRadius, // Radio grande para asegurar que choque
    isLetter: true,
    id: id
  });
  
  // AÑADIR TAMBIÉN a this.colliders (por si acaso)
  if (this.colliders) {
    this.colliders.push({
      x: x,
      z: z,
      r: testRadius,
      isLetter: true,
      id: id
    });
  }
  
  console.log(`%c💥 Collider para ${id} en (${x.toFixed(1)}, ${z.toFixed(1)}) radio ${testRadius}`, 'color:#ffaa00');
}

  /* ── CARGAR CORAZÓN ── */
  _loadHeart(loader, path, x, y, z, scale, heartConfig) {
    loader.load(path, (gltf) => {
      const model = gltf.scene;
      
      model.scale.setScalar(scale);
      model.position.set(x, y, z);
      
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(mat => {
                mat.color.setHex(heartConfig.color);
                mat.emissive.setHex(0x440011);
              });
            } else {
              node.material.color.setHex(heartConfig.color);
              node.material.emissive.setHex(0x440011);
            }
          }
        }
      });
      
      this.group.add(model);
      this._heartModel = model;
      
      if (heartConfig.bounce) {
        model.userData = {
          baseScale: scale,
          phase: Math.random() * Math.PI * 2
        };
      }
      
      this._addLetterCollider(x, z, heartConfig.collisionRadius || 1.5, 'heart');
      
      console.log(`%c✅ Corazón en (${x.toFixed(1)}, ${z.toFixed(1)}) radio ${heartConfig.collisionRadius}`, 'color:#ff3366');
      
    }, undefined, (error) => {
      console.warn('⚠️ No se pudo cargar el corazón:', error);
      this._addFallbackHeart(x, y, z, scale, heartConfig);
    });
  }

  /* ── AÑADIR ACENTO ── */
  _addAccent(x, y, z, scale, color, collisionRadius) {
    const accentMat = new THREE.MeshStandardMaterial({
      color: color || 0xffffff,
      roughness: 0.3,
      metalness: 0.1
    });
    
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.3 * scale),
      accentMat
    );
    accent.position.set(x, y, z);
    accent.rotation.z = 0.2;
    accent.castShadow = true;
    this.group.add(accent);
    
    this._addLetterCollider(x, z, collisionRadius || 0.8, 'accent');
  }

  /* ── FALLBACKS ── */
  _addFallbackLetter(x, y, z, scale, id, collisionRadius) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 * scale, 2.2 * scale, 0.8 * scale),
      mat
    );
    box.position.set(x, y + (1.1 * scale), z);
    box.castShadow = true;
    this.group.add(box);
    
    this._addLetterCollider(x, z, collisionRadius || 2.0, id + '_fallback');
  }

  _addFallbackHeart(x, y, z, scale, heartConfig) {
    const heartGroup = new THREE.Group();
    heartGroup.position.set(x, y + (1.5 * scale), z);
    
    const mat = new THREE.MeshStandardMaterial({ color: heartConfig.color, roughness: 0.3 });
    
    const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 16), mat);
    sphere1.position.set(-0.6 * scale, 0.8 * scale, 0);
    heartGroup.add(sphere1);
    
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 16), mat);
    sphere2.position.set(0.6 * scale, 0.8 * scale, 0);
    heartGroup.add(sphere2);
    
    const triangle = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 1.6 * scale, 4), mat);
    triangle.position.set(0, -0.4 * scale, 0);
    triangle.rotation.y = Math.PI / 4;
    heartGroup.add(triangle);
    
    this.group.add(heartGroup);
    this._addLetterCollider(x, z, heartConfig.collisionRadius || 1.5, 'heart_fallback');
  }

  /* ── UPDATE ── */
  update(t, carPos, input, lastAction) {
    if (this._heartModel && this._heartModel.userData) {
      const heartbeat = 1 + Math.sin(t * 8 + this._heartModel.userData.phase) * 0.05;
      this._heartModel.scale.setScalar(this._heartModel.userData.baseScale * heartbeat);
    }
    return false;
  }
}