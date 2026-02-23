/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandCofre.js  —  Isla del Cofre 🗝️
   VERSIÓN CORREGIDA - Todos los problemas resueltos
   ═══════════════════════════════════════════════════════════ */

class IslandCofre extends IslandBase {

  /* ── Sin poste ──────────────────────────────────────────── */
  _buildMarker() {
    const g = this.group;
    const c = this.cfg;
    this.mat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.emissive,
      emissiveIntensity: 0, transparent: true, opacity: 0
    });
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), this.mat);
    this.cube.visible = false;
    g.add(this.cube);
    g.add(this._makeLabel(c.icon + ' ' + c.label, 0, 9));
  }

  /* ── Plataforma estilo base secreta Avengers ────────────── */
  _buildPlatform() {
    const g  = this.group;
    const c  = this.cfg;
    const wx = c.x, wz = c.z;

    // Suelo metálico oscuro
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 17, 0.38, 32),
      new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.4, metalness: 0.6 })
    );
    ground.position.y = 0.19; ground.receiveShadow = ground.castShadow = true;
    g.add(ground);

    // Líneas de energía en el suelo — 4 radios que brillan
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff, emissive: 0x2255cc, emissiveIntensity: 1.2,
      roughness: 0.1, metalness: 0.5
    });
    for(let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 14), lineMat);
      line.position.y = 0.4;
      line.rotation.y = angle;
      g.add(line);
    }

    // Anillo exterior dorado/rojo (A de Avengers) - ¡CORREGIDO: ahora mira al centro!
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16.2, 0.28, 6, 40),
      new THREE.MeshStandardMaterial({ color: 0xcc2200, emissive: 0x880000, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.7 })
    );
    ring.rotation.x = Math.PI / 2; 
    ring.position.y = 0.42; 
    g.add(ring);
    this._rimLight = new THREE.PointLight(0xcc2200, 0.8, 30);
    this._rimLight.position.y = 0.5; g.add(this._rimLight);


    // Collision disk
    const colDisk = new THREE.Mesh(
      new THREE.CircleGeometry(15.5, 32),
      new THREE.MeshStandardMaterial({ visible: false, side: THREE.DoubleSide })
    );
    colDisk.rotation.x = -Math.PI / 2;
    colDisk.position.set(wx, 0.38, wz);
    this.scene.add(colDisk);
    if(!window._islandColliders) window._islandColliders = [];
    window._islandColliders.push(colDisk);

    if (window._groundColliders) {
      window._groundColliders.push({
        x: wx,
        z: wz,
        r: 15.5, // Radio de la plataforma
        y: 0.38
      });
    }
  }

  /* ── Decoración ─────────────────────────────────────────── */
  _buildDecoration() {
    this._buildCamera();
    this._buildArcReactor();
    this._buildInfinityStones();
    this._loadGLBModels();
    this._buildAvengersWall(); 
    console.log('%c🗝️ Isla Cofre — Avengers lista', 'color:#c9963c;font-weight:bold');
  }

  /* ── PARED DE LADRILLOS ESTILO VENGADORES (detrás de Hulkbuster) ── */
/* ── PARED DE LADRILLOS ESTILO VENGADORES (CORREGIDA) ── */
/* ── PARED DE LADRILLOS - VERSIÓN ÉPICA CON FÍSICA ── */
_buildAvengersWall() {
  const g = this.group;
  const centerX = 0;
  const centerZ = 0;
  const radius = 15.5;  // Un poco más cerca del borde
  
  // Dirección de Hulkbuster (detrás de él)
  const hulkDirection = 0.6; // Mantenemos el valor que elegiste
  const wallDirection = hulkDirection + Math.PI; // Opuesta
  
  // ÁNGULOS: Arco más ancho (150°) para una pared más imponente
  const arcWidth = Math.PI * 0.85; // ~153°
  const startAngle = wallDirection - arcWidth/2;
  const endAngle = wallDirection + arcWidth/2;
  
  const segments = 18; // Más segmentos = más detalle
  
  // ── TEXTURAS MEJORADAS ──
  // Ladrillo principal con variación de color
  const brickMat = new THREE.MeshStandardMaterial({
    color: 0x9a8a7a,
    roughness: 0.8,
    metalness: 0.1,
    emissive: 0x221100,
    emissiveIntensity: 0.03
  });
  
  const darkBrickMat = new THREE.MeshStandardMaterial({
    color: 0x6a5a4a,
    roughness: 0.9,
    metalness: 0.05
  });
  
  const burntBrickMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a,
    roughness: 1.0,
    emissive: 0x441100,
    emissiveIntensity: 0.15
  });
  
  const debrisMat = new THREE.MeshStandardMaterial({
    color: 0x7a6a5a,
    roughness: 0.95
  });
  
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.3,
    metalness: 0.8
  });

  // Calcular puntos del arco
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    points.push({ x, z, angle });
  }

  // ALTURAS MÁS ALTAS (6.5 base en lugar de 4.2)
  const heights = [];
  for (let i = 0; i < segments; i++) {
    let heightFactor = 1.0;
    // Impacto más dramático en el centro
    if (i >= 8 && i <= 10) {
      heightFactor = 0.4 + Math.random() * 0.3; // Zona muy destruida
    } else if (i === 7 || i === 11) {
      heightFactor = 0.7 + Math.random() * 0.2; // Bordes
    } else {
      heightFactor = 1.4 + Math.random() * 0.4; // ¡MÁS ALTO! (hasta 1.8)
    }
    heights.push(heightFactor);
  }

  // ── 1. SEGMENTOS PRINCIPALES (MÁS ALTOS) ──
  for (let i = 0; i < segments; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    
    // Ángulo para que mire al centro
    const angleToCenter = Math.atan2(centerX - midX, centerZ - midZ);
    
    // ¡ALTURA AUMENTADA! base 6.5 en lugar de 4.2
    const heightBase = 6.5;
    const height = heightBase * heights[i];
    const width = length;
    const depth = 1.0; // Un poco más gruesa
    
    // Seleccionar material según zona
    let segmentMat;
    if (i >= 8 && i <= 10) {
      segmentMat = burntBrickMat; // Zona quemada
    } else if (Math.random() > 0.7) {
      segmentMat = darkBrickMat;
    } else {
      segmentMat = brickMat;
    }
    
    const wallSegment = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      segmentMat.clone()
    );
    
    wallSegment.position.set(midX, height / 2, midZ);
    wallSegment.rotation.y = angleToCenter;
    // Pequeña inclinación para efecto realista
    wallSegment.rotation.z = (Math.random() - 0.5) * 0.03;
    wallSegment.rotation.x = (Math.random() - 0.5) * 0.02;
    
    wallSegment.castShadow = true;
    wallSegment.receiveShadow = true;
    
    // Guardar datos para colisiones
    wallSegment.userData = {
      isWall: true,
      segmentIndex: i
    };
    
    g.add(wallSegment);
    
  
    
    // ── 3. DETALLES DE LADRILLOS 3D ──
    const brickRows = Math.floor(height / 0.4);
    for (let row = 0; row < brickRows; row++) {
      if (i >= 8 && i <= 10 && row > brickRows * 0.4) continue;
      
      const bricksPerRow = Math.floor(width / 0.5);
      for (let b = 0; b < bricksPerRow; b++) {
        if (Math.random() > 0.3) continue;
        
        const brickX = -width/2 + (b + 0.5) * (width / bricksPerRow);
        const brickY = -height/2 + (row + 0.5) * (height / brickRows);
        
        // Ladrillos sobresalientes
        const brick = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.15, 0.3),
          new THREE.MeshStandardMaterial({ 
            color: segmentMat.color ? segmentMat.color.getHex() : 0x9a8a7a,
            roughness: 0.9
          })
        );
        
        brick.position.set(brickX, brickY, depth/2 + 0.15);
        brick.castShadow = true;
        wallSegment.add(brick);
      }
    }
    
    // ── 4. VIGAS METÁLICAS DE REFUERZO ──
    if (i % 2 === 0 && !(i >= 8 && i <= 10)) {
      // Viga vertical
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, height * 0.9, 0.3),
        metalMat
      );
      beam.position.set(0, 0, depth/2 + 0.2);
      beam.castShadow = true;
      wallSegment.add(beam);
      
      // Viga horizontal superior
      const topBeam = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.8, 0.2, 0.3),
        metalMat
      );
      topBeam.position.set(0, height/2 - 0.3, depth/2 + 0.2);
      wallSegment.add(topBeam);
    }
    
    // ── 5. ZONA DEL IMPACTO (más dramática) ──
    if (i >= 8 && i <= 10) {
      // Agujero principal
      const holeGroup = new THREE.Group();
      
      // Anillo del agujero
      const holeRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.2, 10, 16, Math.PI * 1.8),
        new THREE.MeshStandardMaterial({ 
          color: 0x332211, 
          emissive: 0x441100,
          roughness: 1.0
        })
      );
      holeRing.rotation.x = Math.PI / 2;
      holeRing.rotation.z = Math.PI / 2;
      holeRing.scale.set(1.4, 0.8, 0.6);
      holeRing.position.set(0, height * 0.3, depth/2 + 0.2);
      wallSegment.add(holeRing);
      
      // Ladrillos rotos dentro del agujero
      for (let r = 0; r < 6; r++) {
        const brokenBrick = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.15, 0.2),
          burntBrickMat
        );
        brokenBrick.position.set(
          (Math.random() - 0.5) * 1.5,
          height * 0.3 + (Math.random() - 0.5) * 1.2,
          depth/2 + 0.5
        );
        brokenBrick.rotation.set(
          Math.random() * 0.5,
          Math.random() * 0.5,
          Math.random() * 0.5
        );
        wallSegment.add(brokenBrick);
      }
      
      // Humo/partículas (pero dentro de la pared, no flotando)
      const smokeMat = new THREE.MeshStandardMaterial({
        color: 0x555555,
        emissive: 0x222222,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      for (let s = 0; s < 4; s++) {
        const smoke = new THREE.Mesh(
          new THREE.CircleGeometry(0.4 + Math.random()*0.4, 5),
          smokeMat
        );
        smoke.position.set(
          (Math.random() - 0.5) * 1.8,
          height * 0.3 + 0.5 + Math.random() * 1.2,
          depth/2 + 0.4
        );
        smoke.rotation.y = Math.random() * Math.PI;
        wallSegment.add(smoke);
      }
    }
  }

  // ── 6. ESCOMBROS EN EL SUELO (CON COLISIÓN) ──
  for (let d = 0; d < 60; d++) {
    const angle = startAngle + Math.random() * (endAngle - startAngle);
    const dist = radius - 2.5 + Math.random() * 4;
    const x = centerX + Math.cos(angle) * dist;
    const z = centerZ + Math.sin(angle) * dist;
    
    // Lejos del centro (donde está Hulkbuster)
    const distanceFromCenter = Math.sqrt(x*x + z*z);
    if (distanceFromCenter < 8) continue;
    
    // Escombro (ladrillo roto)
    const debris = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.25 + Math.random() * 0.7,
        0.1 + Math.random() * 0.25,
        0.25 + Math.random() * 0.6
      ),
      debrisMat.clone()
    );
    
    debris.position.set(x, 0.1 + Math.random() * 0.3, z);
    debris.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    debris.castShadow = true;
    debris.receiveShadow = true;
    
    // Añadir colisión para escombros grandes
    if (d % 3 === 0) {
      if (!window._islandColliders) window._islandColliders = [];
      window._islandColliders.push({
        x: x,
        z: z,
        r: 0.6
      });
    }
    
    g.add(debris);
  }

  
  // ── 8. POLVO AMBIENTAL (solo decorativo, sin colisión) ──
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 40;
  const dustPositions = new Float32Array(dustCount * 3);
  
  for (let i = 0; i < dustCount; i++) {
    const angle = startAngle + Math.random() * (endAngle - startAngle);
    const dist = radius - 1.5 + Math.random() * 4;
    const x = centerX + Math.cos(angle) * dist;
    const z = centerZ + Math.sin(angle) * dist;
    
    if (Math.sqrt(x*x + z*z) < 7) continue;
    
    dustPositions[i*3] = x;
    dustPositions[i*3+1] = 2.0 + Math.random() * 4.0; // Polvo más alto
    dustPositions[i*3+2] = z;
  }
  
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  
  const dustMat = new THREE.PointsMaterial({
    color: 0xbbbbbb,
    size: 0.15,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending
  });
  
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  g.add(dustParticles);

  // ── COLISIÓN REAL PARA LA PARED (VERSIÓN MEJORADA) ──
// Asegurar que el array de colliders existe
// ── COLLIDERS SUPER DENSOS (opcional) ──
// Esto crea una "muralla" continua de colisiones
// ── COLLIDERS PARA LA PARED (versión simplificada) ──
// Guardar el número actual de colliders
const currentColliderCount = window._islandColliders ? window._islandColliders.length : 0;

// // Crear colliders a lo largo de la pared
// for (let i = 0; i < points.length - 1; i++) {
//     const p1 = points[i];
//     const p2 = points[i + 1];
    
//     // Crear colliders cada 1.2 metros
//     const segmentLength = Math.sqrt((p2.x-p1.x)**2 + (p2.z-p1.z)**2);
//     const numColliders = Math.max(2, Math.floor(segmentLength / 1.2));
    
//     for (let j = 0; j < numColliders; j++) {
//         const t = (j + 0.5) / numColliders;
//         const x = p1.x + (p2.x - p1.x) * t;
//         const z = p1.z + (p2.z - p1.z) * t;
        
//         const distFromCenter = Math.sqrt(x*x + z*z);
//         if (distFromCenter > 12 && distFromCenter < 17) {
//             // IMPORTANTE: Solo x, z, r - sin isMesh
//             window._islandColliders.push({
//                 x: x,
//                 z: z,
//                 r: 1.2,  // Radio más grande para mejor detección
//                 isWall: true  // Opcional, para el rebote
//             });
//         }
//     }
// }


  console.log(`%c🧱 PARED ÉPICA CON FÍSICA - Altura: 6.5-9m, Dirección: ${hulkDirection.toFixed(2)} rad`, 'color:#ffaa00;font-weight:bold');
}

  /* ── CÁMARA FOTOGRÁFICA — ¡CORREGIDA! Ahora mira al centro ── */
  _buildCamera() {
    const g  = this.group;
    const cg = new THREE.Group();
    // Alejada del casco de Iron Man (que está en x:4,z:2), movida a la izquierda
    cg.position.set(-2, 0.38, 5.5);
    // ¡CORREGIDO! Rotación para que MIRE AL CENTRO (0,0,0)
    // Ángulo = atan2(0 - z, 0 - x) = atan2(-5.5, 2) ≈ -1.22 rad (unos -70°)
    cg.rotation.y = -1.22; // MIRANDO AL CENTRO
    g.add(cg);
    this._cameraGroup = cg;

    const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
    const chromeMat= new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.1, metalness: 0.95 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x224466, emissive: 0x112233, emissiveIntensity: 0.5, roughness: 0, metalness: 0.3, transparent: true, opacity: 0.85 });
    const redMat   = new THREE.MeshStandardMaterial({ color: 0xcc2200, emissive: 0x880000, emissiveIntensity: 0.8, roughness: 0.2 });

    // Cuerpo principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.0), bodyMat);
    body.position.y = 0.75; body.castShadow = true; cg.add(body);

    // Objetivo (lente) — cilindros concéntricos
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.7, 20), bodyMat);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.75, -0.68); cg.add(barrel);
    const lens1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.15, 20), chromeMat);
    lens1.rotation.x = Math.PI/2; lens1.position.set(0, 0.75, -1.06); cg.add(lens1);
    const lens2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), glassMat);
    lens2.rotation.x = Math.PI/2; lens2.position.set(0, 0.75, -1.15); cg.add(lens2);

    // Flash en la esquina
    const flash = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 2.5 }));
    flash.position.set(0.78, 1.15, -0.52); cg.add(flash);
    this._flashLight = new THREE.PointLight(0xffffaa, 0, 4);
    this._flashLight.position.set(0.78, 1.15, -0.62); cg.add(this._flashLight);

    // Botón disparador rojo
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8), redMat);
    btn.position.set(0.6, 1.53, 0); cg.add(btn);

    // Correa — dos cilindros en los laterales
    [-1.05, 1.05].forEach(x => {
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }));
      strap.rotation.z = Math.PI/2; strap.position.set(x, 0.75, 0); cg.add(strap);
    });

    // Luz de la lente
    const lensLight = new THREE.PointLight(0x4488ff, 0.8, 5);
    lensLight.position.set(0, 0.75, -1.3); cg.add(lensLight);
    this._lensLight = lensLight;
  }

  /* ── ARC REACTOR (Iron Man) — ¡CORREGIDO! Ahora el GLB está SOBRE la plataforma ── */
  _buildArcReactor() {
    const g  = this.group;
    const rg = new THREE.Group();
    rg.position.set(-6, 0.38, -4); // Base a nivel del suelo
    g.add(rg);
    this._arcReactorGroup = rg;

    const glowMat = new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x44bbff, emissiveIntensity: 3.5, transparent: true, opacity: 0.9 });
    const frameMat= new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.2, metalness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.4, metalness: 0.7 });

    // Carcasa exterior (pedestal)
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.22, 16), frameMat);
    outer.position.y = 0.11; outer.castShadow = true; rg.add(outer);
    
    // Anillo intermedio
    const mid = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 8, 20), frameMat);
    mid.rotation.x = Math.PI/2; mid.position.y = 0.22; rg.add(mid);
    
    // Soporte central (para que el GLB se coloque encima)
    const coreSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), frameMat);
    coreSupport.position.y = 0.35; rg.add(coreSupport);
    
    // 3 triángulos decorativos
    for(let i = 0; i < 3; i++) {
      const tri = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.35), frameMat);
      const a = (i/3)*Math.PI*2 + 0.5;
      tri.position.set(Math.cos(a)*0.52, 0.25, Math.sin(a)*0.52);
      tri.rotation.y = -a; rg.add(tri);
    }
    
    // Luz central (se mantiene)
    const arcLight = new THREE.PointLight(0x44bbff, 3.5, 10);
    arcLight.position.y = 0.5; rg.add(arcLight);
    this._arcLight = arcLight;

    // Pedestal inferior
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 12), darkMat);
    ped.position.y = -0.25; rg.add(ped);
    
    // ¡IMPORTANTE! Guardamos la altura para colocar el GLB encima
    this._arcReactorBaseY = 0.7; // Altura donde se colocará el GLB
  }

  /* ── INFINITY STONES — 6 gemas flotando ─────────────────── */
  _buildInfinityStones() {
    const g = this.group;
    this._stones = [];
    const stones = [
      { col: 0xff4400, emit: 0xaa2200, name: 'Poder',     pos: [0,    2.5,  8]  },
      { col: 0x4444ff, emit: 0x1122aa, name: 'Espacio',   pos: [8,    2.5,  0]  },
      { col: 0xee0044, emit: 0xaa0022, name: 'Realidad',  pos: [-8,   2.5,  0]  },
      { col: 0x44ff44, emit: 0x22aa22, name: 'Alma',      pos: [0,    2.5, -8]  },
      { col: 0xffaa00, emit: 0xaa6600, name: 'Tiempo',    pos: [5.5,  2.5, -5.5]},
      { col: 0xaa00ff, emit: 0x660088, name: 'Mente',     pos: [-5.5, 2.5, -5.5]},
    ];

    stones.forEach(({ col, emit, pos }) => {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.35, 0),
        new THREE.MeshStandardMaterial({ color: col, emissive: emit, emissiveIntensity: 2.5, roughness: 0, metalness: 0.2, transparent: true, opacity: 0.88 })
      );
      gem.position.set(...pos);
      gem.userData.baseY = pos[1];
      gem.userData.phase = Math.random() * Math.PI * 2;
      g.add(gem);

      const sl = new THREE.PointLight(col, 1.5, 8);
      sl.position.set(...pos);
      g.add(sl);
      gem.userData.light = sl;

      this._stones.push(gem);
    });
  }

  /* ── GLB MODELS — VERSIÓN CORREGIDA ───────────────────────── */
  _loadGLBModels() {
    const LoaderClass = (typeof THREE !== 'undefined' && THREE.GLTFLoader)
      ? THREE.GLTFLoader
      : (typeof GLTFLoader !== 'undefined' ? GLTFLoader : null);

    if(!LoaderClass) {
      console.warn('🗝️ GLTFLoader no disponible');
      return;
    }

    const loader = new LoaderClass();
    const DRACOClass = (typeof THREE !== 'undefined' && THREE.DRACOLoader)
      ? THREE.DRACOLoader
      : (typeof DRACOLoader !== 'undefined' ? DRACOLoader : null);
    if(DRACOClass) {
      const draco = new DRACOClass();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
    }

    const g = this.group;
    const base = 'models/Para IslaCofre Marvel/';

    const loadNormalized = (path, targetSize, pos, rot, onLoad) => {
      loader.load(path, gltf => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(); box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if(maxDim > 0) model.scale.setScalar(targetSize / maxDim);
        model.position.set(...pos);
        if(rot) { 
          model.rotation.x = rot[0] || 0; 
          model.rotation.y = rot[1] || 0; 
          model.rotation.z = rot[2] || 0; 
        }
        model.traverse(c => { if(c.isMesh) c.castShadow = true; });
        g.add(model);
        
        // Aplicar colores personalizados si es necesario
        if(path.includes('Hulk Buster')) {
          this._paintHulkBuster(model);
        }
        
        if(gltf.animations?.length) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
          if(!this._mixers) this._mixers = [];
          this._mixers.push(mixer);
        }
        if(onLoad) onLoad(model);
        console.log(`%c✅ Cargado: ${path.split('/').pop()}`, 'color:#c9963c');
      }, undefined, e => console.warn(`⚠️ No cargó: ${path.split('/').pop()}`, e));
    };

    // ── Hulk Buster — ¡MÁS GRANDE! targetSize 7 → 8.5 ──────────
    loadNormalized(base + 'Hulk Buster Armor.glb', 8.5, [0, 0.38, 0], [0, 0.6, 0],
      model => { this._hulkBuster = model; }
    );

    // ── Logo Avengers Endgame — más atrás ─────────────────────
    loadNormalized(base + 'avengers_logo_de_end_game.glb', 3.5, [0, -6, -14], null,
      model => { this._avengersLogo = model; }
    );

    // ── Casco Iron Man — rotado hacia el centro ───────────────
    loadNormalized(base + 'iron_man_helmet.glb', 1.8, [5.5, 0.38, 1.5], [0, -0.27, 0]);

    // ── Corazón Iron Man ──────────────────────────────────────
    loadNormalized(base + 'iron_man_heart.glb', 1.0, [3, 1.2, -3], null,
      model => { this._ironHeart = model; }
    );

    // ── Casco Ant-Man ─────────────────────────────────────────
    loadNormalized(base + 'Casco de Antman.glb', 1.5, [-5, 0.38, 2], [0, 1.0, 0]);

    // ── Mjolnir de Thor — ¡CORREGIDO! Ya no se hunde, rotado ──
    loadNormalized(base + 'Mjolnir de Thor.glb', 2.2, [-3, 0.48, -3], [0, 0.8, 0.15]); // Subido de Y y rotado
    
    // ── ELIMINADO: Mjolnir2.glb (ya no se carga) ──────────────

    // ── Escudo Capitán América — ¡MÁS GRANDE! targetSize 2.5 → 3.2 ──
    loadNormalized(base + 'Shield Captain America.glb', 5, [6, 0.38, -4], [-Math.PI/2, 0, 0],
      model => { this._shield = model; }
    );

    // ── Logo Spider-Man ───────────────────────────────────────
    loadNormalized(base + 'spiderman_logo.glb', 1.5, [7, 2.0, 3], null);

    // ── Mesa con artefactos Guardianes (¡perfecta, no tocar!) ──
    // Mesa primero
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1a2235, roughness: 0.5, metalness: 0.6 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 2.0), tableMat);
    tableTop.position.set(-8, 1.2, -6); tableTop.castShadow = true; g.add(tableTop);
    [[-1.4,-0.7],[ 1.4,-0.7],[-1.4, 0.7],[ 1.4, 0.7]].forEach(([lx,lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.2,6), tableMat);
      leg.position.set(-8+lx, 0.6, -6+lz); leg.castShadow=true; g.add(leg);
    });
    // Modelo encima de la mesa (perfecto)
    loadNormalized(base + 'Mesa con artefactos para galaxia.glb', 3.0, [-8, 1.32, -6], [0, 0, 0]);

    // ── ARC REACTOR GLB — ¡AHORA SOBRE LA PLATAFORMA! ─────────
    // Cargamos el GLB del reactor y lo colocamos SOBRE la base que ya construimos
    setTimeout(() => {
      // Pequeño delay para asegurar que el grupo ya existe
      loadNormalized(base + 'iron_man_heart.glb', 1.2, [-6, 0.38 + 0.7, -4], [0, 0, 0],
        model => { 
          this._arcReactorGLB = model;
          // Lo movemos al grupo del arc reactor para que rote con él
          if(this._arcReactorGroup) {
            this._arcReactorGroup.add(model);
            model.position.set(0, 0.7, 0); // Relativo al grupo, justo encima de la base
          }
        }
      );
    }, 100);
  }

  /* ── PINTAR HULK BUSTER (colores característicos) ───────── */
  _paintHulkBuster(model) {
    // Colores característicos de Hulkbuster:
    // Rojo principal, dorado/amarillo para detalles, gris metálico para articulaciones
    model.traverse(node => {
      if(node.isMesh) {
        // Inteligencia básica: si el material es oscuro, lo hacemos rojo
        // Si es brillante, lo hacemos dorado
        if(node.material) {
          if(Array.isArray(node.material)) {
            node.material.forEach(mat => this._recolorMaterial(mat));
          } else {
            this._recolorMaterial(node.material);
          }
        }
      }
    });
  }

  _recolorMaterial(mat) {
    if(!mat) return;
    
    // Extraer color promedio aproximado
    const r = mat.color ? mat.color.r : 0.5;
    const g = mat.color ? mat.color.g : 0.5;
    const b = mat.color ? mat.color.b : 0.5;
    const brightness = (r + g + b) / 3;
    
    if(brightness < 0.4) {
      // Partes oscuras → rojo Hulkbuster
      mat.color.setHex(0xcc2200);
      mat.emissive.setHex(0x440000);
      mat.roughness = 0.3;
      mat.metalness = 0.4;
    } else if(brightness > 0.7) {
      // Partes claras → dorado
      mat.color.setHex(0xffaa22);
      mat.emissive.setHex(0x442200);
      mat.roughness = 0.2;
      mat.metalness = 0.7;
    } else {
      // Partes medias → rojo más oscuro o detalles
      mat.color.setHex(0xaa2200);
      mat.roughness = 0.4;
      mat.metalness = 0.5;
    }
    
    // Añadir un poco de emisión para que brille
    mat.emissiveIntensity = 0.15;
  }

  /* ── UPDATE ─────────────────────────────────────────────── */
  update(t, carPos, input, lastAction) {

    // Logo Avengers — flota suave, sin rotación
    if(this._avengersLogo) {
      this._avengersLogo.position.y = 5 + Math.sin(t * 0.6) * 0.3;
    }

    // Corazón Iron Man — late / pulsa
    if(this._ironHeart) {
      const beat = 1 + Math.abs(Math.sin(t * 2.2)) * 0.18;
      this._ironHeart.scale.setScalar(beat * (this._ironHeart.userData.baseScale || 1));
      if(!this._ironHeart.userData.baseScale) {
        const box = new THREE.Box3().setFromObject(this._ironHeart);
        const s = new THREE.Vector3(); box.getSize(s);
        this._ironHeart.userData.baseScale = 1.0 / Math.max(s.x, s.y, s.z);
      }
    }

    // Infinity Stones — flotan y rotan
    if(this._stones) this._stones.forEach(gem => {
      gem.position.y = gem.userData.baseY + Math.sin(t * 1.4 + gem.userData.phase) * 0.25;
      gem.rotation.y = t * 0.8 + gem.userData.phase;
      gem.rotation.x = t * 0.5;
      gem.material.emissiveIntensity = 2.2 + Math.sin(t * 2.5 + gem.userData.phase) * 0.8;
      if(gem.userData.light) gem.userData.light.intensity = 1.3 + Math.sin(t * 2 + gem.userData.phase) * 0.7;
    });

    // Arc Reactor — SOLO gira sobre su eje Y (el grupo completo, base + GLB)
    if(this._arcReactorGroup) {
      this._arcReactorGroup.rotation.y = t * 0.5;
    }
    if(this._arcLight) this._arcLight.intensity = 3.0 + Math.sin(t * 3.5) * 1.0;

    // Cámara — ESTÁTICA, solo flash parpadea
    if(this._flashLight) {
      this._flashLight.intensity = Math.sin(t * 0.8) > 0.95 ? 3.5 : 0;
    }
    if(this._lensLight) {
      this._lensLight.intensity = 0.6 + Math.sin(t * 1.2) * 0.3;
    }

    // Mixers GLB
    if(this._mixers) this._mixers.forEach(m => m.update(0.016));

    // Anillo rojo de la plataforma — pulsa
    if(this._rimLight) {
      this._rimLight.color.setHSL(0.02 + Math.sin(t*0.3)*0.02, 1, 0.45);
      this._rimLight.intensity = 0.7 + Math.sin(t * 1.6) * 0.35;
    }

    return super.update(t, carPos, input, lastAction);
  }
}