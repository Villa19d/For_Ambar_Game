/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandLetras.js  —  Letras "PARA ÁMBAR 💛"
   • Usa modelos GLB para las letras y el corazón
   • CONFIGURACIÓN MEJORADA - Control total de posiciones
   • Actúan como obstáculos con colisión
   • Ubicadas en el spawn point (alrededor de 0,0)
   • SIN poste flotante
   ═══════════════════════════════════════════════════════════ */

class IslandLetras extends IslandBase {
  
  // ── CONFIGURACIÓN CENTRALIZADA ───────────────────────────
  // ¡AJUSTA TODO DESDE AQUÍ!
  static CONFIG = {
    // Posición general de toda la frase (desplaza todo el conjunto)
    basePosition: { x: 0, y: 0, z: 5 }, // Z=5 para que esté detrás del spawn
    
    // Escala general (multiplica todas las escalas individuales)
    globalScale: 1.0,
    
    // Altura base sobre el suelo
    heightOffset: 0.5,
    
    // ── CONFIGURACIÓN DE LETRAS INDIVIDUALES ──
    // Cada letra tiene su propia posición y escala
    letters: [
      // Grupo "PARA"
      { file: 'P_letter.glb', scale: 5.0, x: -11.5, y: 0, z: -7 }, // Letra P
      { file: 'A_letter.glb', scale: 5.0, x: -9.9, y: .5, z: -7.1}, // Letra A
      { file: 'R_letter.glb', scale: 5.0, x: -6.5, y: 0, z: -7 }, // Letra R
      { file: 'A_letter.glb', scale: 5.0, x: -4.5,  y: .5, z: -7.1 }, // Letra A
      
      // Espacio más grande entre PARA y ÁMBAR
      { file: null }, // Espacio (no poner nada)
      
      // Grupo "ÁMBAR" (con acento en la primera A)
      { file: 'A_letter.glb', scale: 5.0, x: -.5,  y: 0.5, z: -7.2, accent: true }, // Letra Á
      { file: 'M_letter.glb', scale: 5.0, x: 2.8,  y: 0, z: -7 }, // Letra M
      { file: 'B_letter.glb', scale: 5.0, x: 5.7,  y: 0, z: -7 }, // Letra B
      { file: 'A_letter.glb', scale: 5.0, x: 8,  y: 0.5, z: -7.15 }, // Letra A
      { file: 'R_letter.glb', scale: 5.0, x: 11, y: 0, z: -7 }, // Letra R
    ],
    
    // ── CONFIGURACIÓN DEL CORAZÓN (CONTROL TOTAL) ──
    heart: {
      file: 'pumping_heart_model.glb',
      enabled: true,
      scale: 0.02,        // <--- CAMBIA ESTO PARA EL TAMAÑO (0.8 es más pequeño)
      x: 13,            // Posición X (después de la R)
      y: 0.5,             // Posición Y (altura)
      z: -6,               // Posición Z (profundidad)
      color: 0xff3366,    // Color rojo/rosa
      // Opciones adicionales
      rotateY: 0,         // Rotación en Y (grados en radianes)
      bounce: true        // Animación de latido
    },
    
    // ── CONFIGURACIÓN DEL ACENTO (para la Á) ──
    accent: {
      enabled: true,
      scale: 0.6,
      offsetY: 1.0,       // Altura sobre la letra A
      color: 0xffffff
    }
  };

  /* ── SIN POSTE ── */
  _buildMarker() {
    // Solo un cubo invisible para mantener compatibilidad
    const g = this.group;
    const c = this.cfg;
    this.mat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.emissive,
      emissiveIntensity: 0, transparent: true, opacity: 0
    });
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), this.mat);
    this.cube.visible = false;
    g.add(this.cube);
  }

  /* ── SIN PLATAFORMA ── */
  _buildPlatform() {
    // No hay plataforma, las letras van directo sobre el suelo
  }

  /* ── CONSTRUIR LETRAS CON MODELOS GLB ── */
  _buildDecoration() {
    this._loadLetterModels();
    console.log('%c🔤 Letras GLB "PARA ÁMBAR 💛" cargadas', 'color:#ffffff;font-weight:bold');
  }

  /* ── CARGAR MODELOS DE LETRAS ── */
  _loadLetterModels() {
    const config = IslandLetras.CONFIG;
    const basePath = 'models/Letras/';
    const heartPath = 'models/Corazon/';
    
    // Guardar referencias
    this._letterObjects = [];
    this._heartModel = null;
    
    // Configurar loader
    const loader = new THREE.GLTFLoader();

    // Cargar cada letra
    config.letters.forEach((letter, i) => {
      if (!letter.file) return; // Espacio
      
      const xPos = config.basePosition.x + (letter.x || 0);
      const yPos = config.basePosition.y + config.heightOffset + (letter.y || 0);
      const zPos = config.basePosition.z + (letter.z || 0);
      const scale = config.globalScale * (letter.scale || 1.0);
      
      this._loadLetter(
        loader,
        basePath + letter.file,
        xPos, yPos, zPos,
        scale,
        `letter_${i}`
      );
      
      // Añadir acento si es necesario
      if (config.accent.enabled && letter.accent) {
        this._addAccent(
          xPos, 
          yPos + config.accent.offsetY, 
          zPos, 
          config.accent.scale,
          config.accent.color
        );
      }
    });
    
    // Cargar corazón si está habilitado
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
  }

  /* ── CARGAR UNA LETRA INDIVIDUAL ── */
  _loadLetter(loader, path, x, y, z, scale, id) {
    loader.load(path, (gltf) => {
      const model = gltf.scene;
      
      model.scale.setScalar(scale);
      model.position.set(x, y, z);
      model.rotation.y = 0;
      
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
      
      // Guardar referencia
      this._letterObjects.push({
        model: model,
        x: x, y: y, z: z,
        scale: scale,
        id: id
      });
      
      // Añadir collider
      this._addLetterCollider(x, z, scale * 0.8);
      
      console.log(`%c✅ Letra ${id} cargada en (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`, 'color:#ffffff');
      
    }, undefined, (error) => {
      console.warn(`⚠️ No se pudo cargar la letra ${path}:`, error);
      this._addFallbackLetter(x, y, z, scale);
    });
  }

  /* ── CARGAR CORAZÓN CON CONTROL TOTAL ── */
  _loadHeart(loader, path, x, y, z, scale, heartConfig) {
    loader.load(path, (gltf) => {
      const model = gltf.scene;
      
      model.scale.setScalar(scale);
      model.position.set(x, y, z);
      
      // Rotación si es necesaria
      if (heartConfig.rotateY) {
        model.rotation.y = heartConfig.rotateY;
      }
      
      // Ajustar color
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
      
      // Guardar para animación
      if (heartConfig.bounce) {
        model.userData = {
          baseScale: scale,
          phase: Math.random() * Math.PI * 2
        };
      }
      
      // Añadir collider
      this._addLetterCollider(x, z, scale * 0.9);
      
      console.log(`%c✅ Corazón cargado en (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) con escala ${scale.toFixed(2)}`, 'color:#ff3366');
      
    }, undefined, (error) => {
      console.warn('⚠️ No se pudo cargar el corazón:', error);
      this._addFallbackHeart(x, y, z, scale, heartConfig.color);
    });
  }

  /* ── AÑADIR ACENTO ── */
  _addAccent(x, y, z, scale, color) {
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
    
    this._addLetterCollider(x, z, scale * 0.4);
  }

  /* ── LETRA DE RESPALDO ── */
  _addFallbackLetter(x, y, z, scale) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1
    });
    
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 * scale, 2.2 * scale, 0.8 * scale),
      mat
    );
    box.position.set(x, y + (1.1 * scale), z);
    box.castShadow = true;
    this.group.add(box);
    
    this._addLetterCollider(x, z, scale);
  }

  /* ── CORAZÓN DE RESPALDO ── */
  _addFallbackHeart(x, y, z, scale, color) {
    const heartGroup = new THREE.Group();
    heartGroup.position.set(x, y + (1.5 * scale), z);
    
    const mat = new THREE.MeshStandardMaterial({
      color: color || 0xff3366,
      roughness: 0.3,
      metalness: 0.1
    });
    
    // Dos esferas
    const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 16), mat);
    sphere1.position.set(-0.6 * scale, 0.8 * scale, 0);
    sphere1.castShadow = true;
    heartGroup.add(sphere1);
    
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 16), mat);
    sphere2.position.set(0.6 * scale, 0.8 * scale, 0);
    sphere2.castShadow = true;
    heartGroup.add(sphere2);
    
    // Triángulo
    const triangle = new THREE.Mesh(
      new THREE.ConeGeometry(1.2 * scale, 1.6 * scale, 4),
      mat
    );
    triangle.position.set(0, -0.4 * scale, 0);
    triangle.rotation.y = Math.PI / 4;
    triangle.castShadow = true;
    heartGroup.add(triangle);
    
    this.group.add(heartGroup);
    this._addLetterCollider(x, z, scale);
  }

  /* ── AÑADIR COLLIDER ── */
  _addLetterCollider(x, z, radius) {
    if (!window._islandColliders) window._islandColliders = [];
    
    // Añadir colliders a diferentes alturas
    [0.5, 1.5, 2.5].forEach(() => {
      window._islandColliders.push({
        x: x,
        z: z,
        r: radius * 0.8,
        isLetter: true
      });
    });
  }

  /* ── UPDATE (con animación de latido para el corazón) ── */
  update(t, carPos, input, lastAction) {
    // Animar corazón si tiene latido
    if (this._heartModel && this._heartModel.userData) {
      const heartbeat = 1 + Math.sin(t * 8 + this._heartModel.userData.phase) * 0.05;
      this._heartModel.scale.setScalar(this._heartModel.userData.baseScale * heartbeat);
    }
    
    return false;
  }
}