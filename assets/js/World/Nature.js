// /* ═══════════════════════════════════════════════════════════
//    World/Nature.js  —  Naturaleza: árboles, bancos, farolas
//    • Todos los modelos GLB de Bruno Simon
//    • Configuración centralizada para fácil ajuste
//    • Colisiones opcionales
//    • Evita islas, pista y letras automáticamente
//    ═══════════════════════════════════════════════════════════ */

// class Nature {
//   constructor(scene, colliders) {
//     this.scene = scene;
//     this.colliders = colliders;
//     this.models = [];
    
//     // ── CONFIGURACIÓN CENTRALIZADA ───────────────────────────
//     // ¡AJUSTA TODO AQUÍ!
//     this.CONFIG = {
//       // PASTO (más abundante)
//       grass: {
//         count: 1000,              // <-- AUMENTADO de 300 a 800
//         minScale: 0.6,
//         maxScale: 1.8,
//         spreadRadius: 70,        // Radio del mapa donde aparece
//         collision: false          // El pasto no tiene colisión
//       },
      
//       // ÁRBOLES DE ROBLE (oakTrees) - ¡MUCHOS!
//       oakTrees: {
//         enabled: true,
//         models: [
//           { file: 'oakTreesVisual.glb', weight: 3 },  // Más común
//           { file: 'ArbolTorcido.glb', weight: 1 }      // Menos común
//         ],
//         count: 60,                 // <-- Número total de robles
//         minScale: 1.2,
//         maxScale: 2.5,
//         collision: true,            // Chocan con el carro
//         collisionRadius: 1.5,
//         avoidRadius: 8              // Evitar agruparse
//       },
      
//       // ÁRBOL CON MUSGO (solo 1)
//       mossTree: {
//         enabled: true,
//         file: 'arbol__con_musgo.glb',
//         count: 1,                   // Solo 1 en todo el mapa
//         scale: 2.5,
//         position: { x: -30, z: 40 }, // Ubicación especial
//         collision: true,
//         collisionRadius: 2.0
//       },
      
//       // BANCOS DE PARQUE
//       benches: {
//         enabled: true,
//         file: 'benches.glb',        // Usar benches.glb
//         count: 2,
//         minScale: 0.9,
//         maxScale: 1.1,
//         collision: true,
//         collisionRadius: 1.2
//       },
      
//       // FAROLAS (sin poste, a nivel del suelo)
//       lanterns: {
//         enabled: true,
//         file: 'lanterns.glb',       // Usar lanterns.glb
//         count: 10,
//         minScale: 0.8,
//         maxScale: 1.0,
//         collision: true,
//         collisionRadius: 0.8,
//         lightColor: 0xffaa33,        // Color de la luz
//         lightIntensity: 1.5
//       }
//     };
    
//     this._loadAll();
//     console.log('%c🌳 Nature system initialized', 'color:#4a8c2a;font-weight:bold');
//   }

//   /* ── CARGAR TODOS LOS ELEMENTOS ── */
//   _loadAll() {
//     const loader = new THREE.GLTFLoader();
    
//     // 1. PASTO (usando sistema existente pero con más cantidad)
//     this._enhanceGrass();
    
//     // 2. ÁRBOLES DE ROBLE
//     if (this.CONFIG.oakTrees.enabled) {
//       this._loadOakTrees(loader);
//     }
    
//     // 3. ÁRBOL CON MUSGO (solo 1)
//     if (this.CONFIG.mossTree.enabled) {
//       this._loadMossTree(loader);
//     }
    
//     // 4. BANCOS
//     if (this.CONFIG.benches.enabled) {
//       this._loadBenches(loader);
//     }
    
//     // 5. FAROLAS
//     if (this.CONFIG.lanterns.enabled) {
//       this._loadLanterns(loader);
//     }
//   }

//   /* ── MEJORAR EL PASTO (más cantidad) ── */
//   _enhanceGrass() {
//     // Modificar la configuración global de pasto
//     if (typeof GRASS_CFG !== 'undefined') {
//       GRASS_CFG.COUNT = this.CONFIG.grass.count;
//       GRASS_CFG.MIN_SCALE = this.CONFIG.grass.minScale;
//       GRASS_CFG.MAX_SCALE = this.CONFIG.grass.maxScale;
//       GRASS_CFG.SPREAD = this.CONFIG.grass.spreadRadius;
//     }
//   }

//   /* ── CARGAR ROBLES ── */
//   _loadOakTrees(loader) {
//     const config = this.CONFIG.oakTrees;
//     const basePath = 'models/oakTrees/';
    
//     // Posiciones prohibidas (islas, pista, letras)
//     const forbiddenZones = this._getForbiddenZones();
    
//     let loaded = 0;
//     const attempts = 200; // Intentos para encontrar posiciones
    
//     for (let attempt = 0; attempt < attempts && loaded < config.count; attempt++) {
//       // Generar posición aleatoria
//       const angle = Math.random() * Math.PI * 2;
//       const radius = 15 + Math.random() * 50; // Entre 15 y 65 del centro
//       const x = Math.cos(angle) * radius;
//       const z = Math.sin(angle) * radius;
      
//       // Verificar que sea válida
//       if (!this._isValidPosition(x, z, forbiddenZones, config.avoidRadius)) {
//         continue;
//       }
      
//       // Seleccionar modelo según peso
//       const modelIndex = this._selectWeightedModel(config.models);
//       const modelFile = config.models[modelIndex].file;
      
//       // Escala aleatoria
//       const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
      
//       this._placeModel(loader, basePath + modelFile, x, z, scale, {
//         collision: config.collision,
//         radius: config.collisionRadius * scale,
//         type: 'oakTree'
//       });
      
//       loaded++;
//     }
    
//     console.log(`%c🌳 ${loaded} robles colocados`, 'color:#4a8c2a');
//   }

//   /* ── CARGAR ÁRBOL CON MUSGO (solo 1) ── */
//   _loadMossTree(loader) {
//     const config = this.CONFIG.mossTree;
//     const basePath = 'models/arbol con musgo/';
    
//     const x = config.position.x;
//     const z = config.position.z;
    
//     this._placeModel(loader, basePath + config.file, x, z, config.scale, {
//       collision: config.collision,
//       radius: config.collisionRadius,
//       type: 'mossTree'
//     });
    
//     console.log(`%c🌲 Árbol con musgo en (${x}, ${z})`, 'color:#4a8c2a');
//   }

//   /* ── CARGAR BANCOS ── */
//   _loadBenches(loader) {
//     const config = this.CONFIG.benches;
//     const basePath = 'models/Bancos/';
//     const forbiddenZones = this._getForbiddenZones();
    
//     let loaded = 0;
//     const attempts = 100;
    
//     for (let attempt = 0; attempt < attempts && loaded < config.count; attempt++) {
//       const angle = Math.random() * Math.PI * 2;
//       const radius = 20 + Math.random() * 45;
//       const x = Math.cos(angle) * radius;
//       const z = Math.sin(angle) * radius;
      
//       if (!this._isValidPosition(x, z, forbiddenZones, 5)) continue;
      
//       const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
      
//       // Los bancos tienen rotación aleatoria
//       const rotation = Math.random() * Math.PI * 2;
      
//       this._placeModel(loader, basePath + config.file, x, z, scale, {
//         collision: config.collision,
//         radius: config.collisionRadius * scale,
//         rotation: rotation,
//         type: 'bench'
//       });
      
//       loaded++;
//     }
    
//     console.log(`%c🪑 ${loaded} bancos colocados`, 'color:#8B4513');
//   }

//   /* ── CARGAR FAROLAS ── */
//   _loadLanterns(loader) {
//     const config = this.CONFIG.lanterns;
//     const basePath = 'models/Farolas sin el poste/';
//     const forbiddenZones = this._getForbiddenZones();
    
//     let loaded = 0;
//     const attempts = 150;
    
//     for (let attempt = 0; attempt < attempts && loaded < config.count; attempt++) {
//       const angle = Math.random() * Math.PI * 2;
//       const radius = 18 + Math.random() * 50;
//       const x = Math.cos(angle) * radius;
//       const z = Math.sin(angle) * radius;
      
//       if (!this._isValidPosition(x, z, forbiddenZones, 4)) continue;
      
//       const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
      
//       this._placeModel(loader, basePath + config.file, x, z, scale, {
//         collision: config.collision,
//         radius: config.collisionRadius * scale,
//         rotation: Math.random() * Math.PI * 2,
//         type: 'lantern',
//         addLight: true,
//         lightColor: config.lightColor,
//         lightIntensity: config.lightIntensity
//       });
      
//       loaded++;
//     }
    
//     console.log(`c💡 ${loaded} farolas colocadas`, 'color:#ffaa00');
//   }

//   /* ── COLOCAR UN MODELO EN EL MUNDO ── */
//   _placeModel(loader, path, x, z, scale, options = {}) {
//     loader.load(path, (gltf) => {
//       const model = gltf.scene;
      
//       model.position.set(x, 0, z);
//       model.scale.setScalar(scale);
      
//       if (options.rotation) {
//         model.rotation.y = options.rotation;
//       }
      
//       // Sombras
//       model.traverse(node => {
//         if (node.isMesh) {
//           node.castShadow = true;
//           node.receiveShadow = true;
//         }
//       });
      
//       this.scene.add(model);
      
//       // Añadir luz si es farola
//       if (options.addLight) {
//         const light = new THREE.PointLight(options.lightColor, options.lightIntensity, 8);
//         light.position.set(x, 2.5, z);
//         this.scene.add(light);
//       }
      
//       // Añadir collider si tiene colisión
//       if (options.collision && this.colliders) {
//         this.colliders.push({
//           x: x,
//           z: z,
//           r: options.radius || 1.0,
//           type: options.type,
//           isNature: true
//         });
//       }
      
//     }, undefined, (error) => {
//       console.warn(`⚠️ No se pudo cargar ${path}:`, error);
//     });
//   }

//   /* ── SELECCIONAR MODELO POR PESO ── */
//   _selectWeightedModel(models) {
//     const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
//     let random = Math.random() * totalWeight;
    
//     for (let i = 0; i < models.length; i++) {
//       if (random < models[i].weight) return i;
//       random -= models[i].weight;
//     }
//     return 0;
//   }

//   /* ── ZONAS PROHIBIDAS (islas, pista, letras) ── */
//   _getForbiddenZones() {
//     return [
//       // Islas
//       { x: -55, z: -40, radius: 18 }, // Cofre
//       { x: 58, z: -38, radius: 18 },  // Mirador
//       { x: 5, z: -70, radius: 18 },   // Faro
//       { x: -8, z: 68, radius: 20 },   // Rocola
//       { x: 0, z: 0, radius: 15 },     // Letras (zona central)
      
//       // Pista (aproximación poligonal)
//       { type: 'track', radius: 6 }
//     ];
//   }

//   /* ── VERIFICAR POSICIÓN VÁLIDA ── */
//   _isValidPosition(x, z, forbiddenZones, minDist) {
//     // Evitar islas
//     for (const zone of forbiddenZones) {
//       if (zone.type === 'track') {
//         // Verificar cerca de la pista
//         if (window._trackCurve) {
//           for (let i = 0; i <= 50; i++) {
//             const p = window._trackCurve.getPoint(i / 50);
//             if (Math.hypot(p.x - x, p.z - z) < 8) {
//               return false;
//             }
//           }
//         }
//       } else {
//         const dist = Math.hypot(x - zone.x, z - zone.z);
//         if (dist < zone.radius + minDist) {
//           return false;
//         }
//       }
//     }
    
//     // Evitar otros objetos ya colocados (para no encimar)
//     for (const model of this.models) {
//       if (Math.hypot(x - model.x, z - model.z) < minDist) {
//         return false;
//       }
//     }
    
//     return true;
//   }

//   /* ── UPDATE (para animar farolas, etc) ── */
//   update(t) {
//     // Aquí podrías animar las farolas (parpadeo) si quieres
//   }
// }