/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandRocola.js  —  Isla de la Rocola 🎵
   
   Plataforma más grande que el resto (radio 15 vs 9).
   Contenido:
   • Árbol recursivo de cubos de colores (estilo threejs.org/examples)
     adaptado a r128 clásico (sin WebGPU / TSL)
   • Rocola rediseñada estilo Bruno Simon
   • Pista de baile 5×5 con luces de discoteca
   • Arcos de notas musicales
   • 4 altavoces en las esquinas
   • Luces de spot que rotan
   ═══════════════════════════════════════════════════════════ */

class IslandRocola extends IslandBase {

  /* ── Plataforma propia — más grande que la base ─────────── */
  _buildPlatform() {
    const g = this.group;
    const c = this.cfg;

    // Suelo principal — radio 15 (vs 9 del base)
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 16.5, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x0d0520, roughness: 0.7, metalness: 0.1 })
    );
    ground.position.y = 0.2;
    ground.receiveShadow = ground.castShadow = true;
    g.add(ground);

    // Segundo nivel elevado en el centro (escenario)
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7.5, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x1a0535, roughness: 0.5, metalness: 0.2 })
    );
    stage.position.y = 0.55;
    stage.receiveShadow = stage.castShadow = true;
    g.add(stage);
    this._stage = stage;

    // Borde exterior con LEDs arcoíris
    const rimColors = [0xff44aa, 0xaa44ff, 0x44aaff, 0xffaa44, 0x44ffaa];
    rimColors.forEach((col, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(15.2, 0.22, 6, 40, Math.PI * 2 / rimColors.length),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.2 })
      );
      arc.rotation.x = Math.PI / 2;
      arc.rotation.z = (i / rimColors.length) * Math.PI * 2;
      arc.position.y = 0.45;
      g.add(arc);
    });
    this._rimLight = new THREE.PointLight(c.color, 1.5, 35);
    this._rimLight.position.y = 0.5;
    g.add(this._rimLight);

    // Camino de acceso
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 18),
      new THREE.MeshStandardMaterial({ color: 0x1a0a30, roughness: 0.8 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, 17);
    path.receiveShadow = true;
    g.add(path);

    // Luces en el camino
    [-1.8, 1.8].forEach(x => {
      for(let zi = 0; zi < 4; zi++){
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 4),
          new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 1.5 })
        );
        lamp.position.set(x, 0.35, 11 + zi * 3);
        g.add(lamp);
        const ll = new THREE.PointLight(c.color, 0.8, 4);
        ll.position.set(x, 0.5, 11 + zi * 3);
        g.add(ll);
      }
    });

    // ── Fix altura del carro: disco invisible para raycast ────
    const colDisk = new THREE.Mesh(
      new THREE.CircleGeometry(14.5, 32),
      new THREE.MeshStandardMaterial({ visible: false, side: THREE.DoubleSide })
    );
    colDisk.rotation.x = -Math.PI / 2;
    colDisk.position.set(this.cfg.x, 0.4, this.cfg.z);
    this.scene.add(colDisk);
    if(!window._islandColliders) window._islandColliders = [];
    window._islandColliders.push(colDisk);
  }

  /* ── Decoración principal ───────────────────────────────── */
  _buildDecoration() {
    this._buildTree();
    this._buildJukebox();
    this._buildDanceFloor();
    this._buildSpeakers();
    this._buildSpotlights();
    this._buildNoteArches();
    this._buildDiscoball();

    console.log('%c🎵 Isla Rocola lista — full', 'color:#d4a8ff;font-weight:bold');
  }

  /* ── ÁRBOL RECURSIVO DE CUBOS ──────────────────────────────
     Versión r128 del ejemplo threejs.org/examples/#webgpu_reflection
     Sin WebGPU ni TSL — usa InstancedMesh clásico con colores por instancia
  ──────────────────────────────────────────────────────────── */
  _buildTree() {
    const g = this.group;

    // Generar datos del árbol recursivamente
    const positions = [], colors = [], scales = [];
    const maxSteps = 5;

    const rnd = () => (Math.random() - 0.5) * 2;
    const col = new THREE.Color();

    function branch(angle, x, y, z, length, depth) {
      if(Math.random() > (maxSteps / depth) * 0.28) return;
      if(depth >= maxSteps) return;

      const len    = length * 0.8;
      const nx     = x + Math.cos(angle) * length;
      const ny     = y + Math.sin(angle) * length;
      const spread = Math.min(3.2, depth * depth);
      const nz     = z + (Math.random() * spread - spread / 2) * length;

      let size = (30 - depth * 8) / 100;
      size = Math.max(0.10, Math.min(0.25, size));

      const steps = 40;
      for(let i = 0; i < steps; i++){
        const t  = i / steps;
        const px = x + (nx - x) * t + rnd() * size * 3;
        const py = y + (ny - y) * t + rnd() * size * 3;
        const pz = z + (nz - z) * t + rnd() * size * 3;
        positions.push(px, py, pz);
        scales.push(size * (Math.random() + 0.5));
        col.setHSL((depth / maxSteps) * 0.55 + Math.random() * 0.06, 0.9, 0.55 + Math.random() * 0.15);
        colors.push(col.r, col.g, col.b);
      }

      for(let k = 0; k < 5; k++)
        branch(angle + rnd(), nx, ny, nz, len + rnd() * 0.3, depth + 1);
    }

    branch(Math.PI * 0.5, 0, 0, 0, 16, 0);

    const count = positions.length / 3;
    const geo   = new THREE.BoxGeometry(1, 1, 1);
    const mat   = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1 });

    // Vertex colors via instanced color
    const mesh  = new THREE.InstancedMesh(geo, mat, count);
    mesh.scale.setScalar(0.05);
    mesh.frustumCulled = false;
    mesh.castShadow = true;

    const dummy  = new THREE.Object3D();
    const instCol = new THREE.Color();
    for(let i = 0; i < count; i++){
      dummy.position.set(positions[i*3], positions[i*3+1], positions[i*3+2]);
      const s = scales[i];
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      instCol.setRGB(colors[i*3], colors[i*3+1], colors[i*3+2]);
      mesh.setColorAt(i, instCol);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Centrar árbol en el medio de la isla, sobre el escenario
    mesh.position.set(0, 0.7, 0);
    g.add(mesh);
    this._treeMesh = mesh;

    // Luz dentro del árbol
    const tl = new THREE.PointLight(0xaaffcc, 2.5, 12);
    tl.position.set(0, 5, 0);
    g.add(tl);
    this._treeLight = tl;
  }

  /* ── ROCOLA estilo Bruno Simon ──────────────────────────── */
  _buildJukebox() {
    const g   = this.group;
    const col = 0xd4a8ff;

    // Posición: a la derecha del árbol
    const jg = new THREE.Group();
    jg.position.set(9, 0.6, -4);
    jg.rotation.y = -0.4;
    g.add(jg);

    const dark  = new THREE.MeshStandardMaterial({ color: 0x0d0520, roughness: 0.25, metalness: 0.7 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xccddff, roughness: 0.1, metalness: 0.95 });
    const glow  = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.0, roughness: 0.1 });

    // ── Cuerpo principal ──────────────────────────────────
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 1.1), dark);
    body.position.y = 1.6; body.castShadow = true; jg.add(body);

    // Cúpula superior (media esfera)
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.0, 20, 1, false, 0, Math.PI), dark);
    const dome2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark);
    dome2.position.y = 3.2; dome2.castShadow = true; jg.add(dome2);

    // Patas
    [[-0.8, -0.2], [0.8, -0.2], [-0.8, 0.2], [0.8, 0.2]].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.35, 8), chrome);
      leg.position.set(px, -0.17, pz); jg.add(leg);
    });

    // ── Pantalla central con brillo ───────────────────────
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.1, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x8844ff, emissiveIntensity: 0.6, roughness: 0, metalness: 0.8, transparent: true, opacity: 0.9 })
    );
    screen.position.set(0, 2.0, 0.58); jg.add(screen);

    // Marco de la pantalla
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.22, 0.04), chrome);
    frame.position.set(0, 2.0, 0.56); jg.add(frame);

    // ── Rejillas de los altavoces internos ────────────────
    [-0.65, 0.65].forEach(sx => {
      const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), dark);
      grille.rotation.x = Math.PI / 2;
      grille.position.set(sx, 1.0, 0.58); jg.add(grille);
      // Cono del altavoz
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.8 }));
      cone.rotation.x = Math.PI / 2;
      cone.position.set(sx, 1.0, 0.55); jg.add(cone);
    });

    // ── Tiras de LEDs verticales (estilo Bruno) ────────────
    const ledCols = [0xff44aa, 0xaa44ff, 0x44ddff, 0xffaa22];
    ledCols.forEach((lc, i) => {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 2.8, 0.03),
        new THREE.MeshStandardMaterial({ color: lc, emissive: lc, emissiveIntensity: 1.2 })
      );
      strip.position.set(-0.82 + i * 0.54, 1.7, 0.57);
      jg.add(strip);

      // Luz puntual de cada strip
      const sl = new THREE.PointLight(lc, 0.6, 5);
      sl.position.set(-0.82 + i * 0.54, 2.5, 1.0);
      jg.add(sl);
    });
    this._ledStrips = ledCols; // para animar

    // ── Panel de botones ──────────────────────────────────
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.08), dark);
    panel.position.set(0, 0.65, 0.55); jg.add(panel);

    // Botones de colores
    const btnCols = [0xff2244, 0xffaa00, 0x22ddff, 0xaa44ff, 0x44ff88, 0xff44aa];
    btnCols.forEach((bc, i) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10),
        new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.9 }));
      btn.position.set(-0.62 + (i % 3) * 0.62, 0.65 + (Math.floor(i/3) - 0.5) * 0.22, 0.60);
      btn.rotation.x = Math.PI / 2; jg.add(btn);
    });

    // ── Antenas ───────────────────────────────────────────
    [[-0.8, 0.8]].forEach(([ax]) => {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), chrome);
      ant.position.set(ax, 4.3, 0); ant.rotation.z = ax > 0 ? 0.25 : -0.25; jg.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2 }));
      tip.position.set(ax + (ax > 0 ? 0.5 : -0.5), 5.3, 0); jg.add(tip);
    });

    // Luz principal de la rocola
    const jl = new THREE.PointLight(col, 4, 22);
    jl.position.set(0, 3, 1.5);
    jg.add(jl);
    this._jukeboxLight = jl;
    window._jukeboxLight = jl;

    this._jukeboxGroup = jg;
  }

  /* ── PISTA DE BAILE 5×5 ─────────────────────────────────── */
  _buildDanceFloor() {
    const g = this.group;
    this._tiles = [];

    const COLS = 6, ROWS = 6;
    const tileW = 1.6, tileD = 1.6;
    const tileColors = [
      0xff44aa, 0xaa44ff, 0x44ddff,
      0xffaa22, 0x44ffaa, 0xff4466,
    ];

    for(let row = 0; row < ROWS; row++){
      for(let col2 = 0; col2 < COLS; col2++){
        const ci  = (row + col2) % tileColors.length;
        const mat = new THREE.MeshStandardMaterial({
          color:    tileColors[ci],
          emissive: tileColors[ci],
          emissiveIntensity: 0.25,
          roughness: 0.05,
          metalness: 0.8,
        });
        const tile = new THREE.Mesh(new THREE.BoxGeometry(tileW - 0.06, 0.08, tileD - 0.06), mat);
        const tx = (col2 - (COLS - 1) / 2) * tileW;
        const tz = (row  - (ROWS - 1) / 2) * tileD - 3;  // desplazada hacia el frente
        tile.position.set(tx, 0.62, tz);
        tile.receiveShadow = true;
        tile.userData.phase = ((row * COLS + col2) / (ROWS * COLS)) * Math.PI * 2;
        tile.userData.col   = tileColors[ci];
        g.add(tile);
        this._tiles.push(tile);

        // Mini luz debajo de cada tile
        if((row + col2) % 3 === 0){
          const tl = new THREE.PointLight(tileColors[ci], 0.5, 2.5);
          tl.position.set(tx, 0.8, tz);
          g.add(tl);
        }
      }
    }

    // Marco de la pista
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(COLS * tileW + 0.3, 0.1, ROWS * tileD + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.3, metalness: 0.9 })
    );
    border.position.set(0, 0.59, -3);
    g.add(border);
  }

  /* ── 4 ALTAVOCES EN LAS ESQUINAS ────────────────────────── */
  _buildSpeakers() {
    const g = this.group;
    const positions = [[-11, -11], [11, -11], [-11, 11], [11, 11]];

    positions.forEach(([sx, sz]) => {
      const sg = new THREE.Group();
      sg.position.set(sx, 0.6, sz);
      sg.rotation.y = Math.atan2(-sx, -sz);

      // Cuerpo
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0d0520, roughness: 0.4, metalness: 0.4 }));
      body.position.y = 1.0; body.castShadow = true; sg.add(body);

      // Cono altavoz
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 }));
      cone.rotation.x = Math.PI / 2; cone.position.set(0, 1.3, 0.5); sg.add(cone);

      const cone2 = cone.clone(); cone2.position.set(0, 0.7, 0.5); sg.add(cone2);

      // LED bar en el top
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xd4a8ff, emissive: 0xd4a8ff, emissiveIntensity: 1.0 }));
      bar.position.set(0, 2.1, 0.46); sg.add(bar);

      g.add(sg);
    });
  }

  /* ── SPOTLIGHTS GIRATORIOS ──────────────────────────────── */
  _buildSpotlights() {
    const g = this.group;
    this._spots = [];

    const spotColors = [0xff44aa, 0x44ddff, 0xffaa22, 0xaa44ff];
    const positions  = [[-7, 7], [7, 7], [-7, -7], [7, -7]];

    positions.forEach(([sx, sz], i) => {
      // Poste
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x223355, roughness: 0.3, metalness: 0.8 })
      );
      pole.position.set(sx, 3.1, sz);
      g.add(pole);

      // Cabeza del spot (pivote)
      const pivot = new THREE.Group();
      pivot.position.set(sx, 5.8, sz);
      g.add(pivot);

      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.22, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.2, metalness: 0.9 })
      );
      head.rotation.x = Math.PI / 2;
      pivot.add(head);

      const spot = new THREE.SpotLight(spotColors[i], 5, 25, Math.PI * 0.08, 0.5);
      spot.position.set(0, 0, 0);
      spot.target.position.set(0, -6, 3);
      pivot.add(spot);
      pivot.add(spot.target);

      pivot.userData.baseAngle = (i / 4) * Math.PI * 2;
      pivot.userData.speed     = 0.4 + i * 0.15;
      this._spots.push(pivot);
    });
  }

  /* ── ARCOS DE NOTAS MUSICALES ───────────────────────────── */
  _buildNoteArches() {
    const g = this.group;
    this._noteParticles = [];

    // 3 arcos con notas flotantes
    const archAngles = [0, Math.PI * 2/3, Math.PI * 4/3];
    const noteCols   = [0xff44aa, 0x44ddff, 0xffaa22];

    archAngles.forEach((angle, ai) => {
      const archR = 11.5;
      const aGroup = new THREE.Group();
      aGroup.rotation.y = angle;
      g.add(aGroup);

      // Arco decorativo
      const archGeo = new THREE.TorusGeometry(2.5, 0.06, 6, 24, Math.PI);
      const arch = new THREE.Mesh(archGeo,
        new THREE.MeshStandardMaterial({ color: noteCols[ai], emissive: noteCols[ai], emissiveIntensity: 0.6 }));
      arch.position.set(archR, 3.5, 0);
      arch.rotation.z = Math.PI / 2;
      aGroup.add(arch);

      // Notas flotantes en cada arco
      for(let n = 0; n < 5; n++){
        const note = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 4),
          new THREE.MeshStandardMaterial({ color: noteCols[ai], emissive: noteCols[ai], emissiveIntensity: 1.5 })
        );
        const t = n / 5;
        note.position.set(
          archR + Math.sin(t * Math.PI) * 2.5,
          3.5 - Math.cos(t * Math.PI) * 2.5,
          (Math.random() - 0.5) * 0.5
        );
        note.userData.phase   = n * 0.4 + ai * 1.2;
        note.userData.archR   = archR;
        note.userData.t       = t;
        note.userData.col     = noteCols[ai];
        aGroup.add(note);
        this._noteParticles.push({ mesh: note, group: aGroup, t, archR, phase: n * 0.4 + ai * 1.2 });
      }
    });
  }

  /* ── BOLA DE DISCOTECA ──────────────────────────────────── */
  _buildDiscoball() {
    const g = this.group;

    // Cable
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5 })
    );
    cable.position.set(0, 9.5, 0);
    g.add(cable);

    // Bola
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 1.0 })
    );
    ball.position.set(0, 7.5, 0);
    ball.castShadow = true;
    g.add(ball);
    this._discoball = ball;

    // Facetas (cuadraditos que la recubren)
    const faceGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
    const faceCount = 80;
    const faceMesh = new THREE.InstancedMesh(faceGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 1 }),
      faceCount
    );
    const dummy = new THREE.Object3D();
    for(let i = 0; i < faceCount; i++){
      const phi   = Math.acos(-1 + (2 * i) / faceCount);
      const theta = Math.sqrt(faceCount * Math.PI) * phi;
      dummy.position.setFromSphericalCoords(0.82, phi, theta);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      faceMesh.setMatrixAt(i, dummy.matrix);
    }
    faceMesh.instanceMatrix.needsUpdate = true;
    faceMesh.position.set(0, 7.5, 0);
    g.add(faceMesh);
    this._discofacets = faceMesh;

    // Luz de la bola que rota y cambia color
    this._discoLight = new THREE.SpotLight(0xff44aa, 6, 20, Math.PI * 0.1, 0.3);
    this._discoLight.position.set(0, 7.5, 0);
    this._discoLight.target.position.set(5, 0, 0);
    g.add(this._discoLight);
    g.add(this._discoLight.target);
  }

  /* ── UPDATE ─────────────────────────────────────────────── */
  update(t, carPos, input, lastAction) {
    // Bola de disco
    if(this._discoball) {
      this._discoball.rotation.y  = t * 0.6;
      this._discofacets.rotation.y = t * 0.6;
    }
    if(this._discoLight) {
      this._discoLight.color.setHSL((t * 0.15) % 1, 1, 0.6);
      this._discoLight.target.position.set(
        Math.sin(t * 0.7) * 8, 0, Math.cos(t * 0.7) * 8
      );
      this._discoLight.target.updateMatrixWorld();
    }

    // Árbol — oscilación suave de color de la luz
    if(this._treeLight) {
      this._treeLight.color.setHSL((t * 0.12) % 1, 1, 0.6);
      this._treeLight.intensity = 2 + Math.sin(t * 2.2) * 0.8;
    }

    // Spots giratorios
    if(this._spots) this._spots.forEach((pivot, i) => {
      pivot.rotation.y = pivot.userData.baseAngle + t * pivot.userData.speed;
      pivot.children.forEach(c => {
        if(c.isSpotLight) c.color.setHSL(((t * 0.1 + i * 0.25) % 1), 1, 0.6);
      });
    });

    // Pista de baile
    if(this._tiles) this._tiles.forEach(tile => {
      const beat = Math.abs(Math.sin(t * 3.5 + tile.userData.phase));
      tile.material.emissiveIntensity = 0.1 + beat * 1.1;
      tile.position.y = 0.62 + beat * 0.04;  // sube ligeramente al latir
    });

    // Notas flotantes
    if(this._noteParticles) this._noteParticles.forEach(np => {
      np.mesh.position.y += Math.sin(t * 1.8 + np.phase) * 0.003;
      np.mesh.material.emissiveIntensity = 0.8 + Math.sin(t * 2.5 + np.phase) * 0.7;
    });

    // Rocola — LEDs pulsando
    if(this._jukeboxLight)
      this._jukeboxLight.intensity = 3.5 + Math.sin(t * 5) * 1.5;

    // Borde de la plataforma
    if(this._rimLight) {
      this._rimLight.color.setHSL((t * 0.08) % 1, 1, 0.6);
      this._rimLight.intensity = 1.2 + Math.sin(t * 2) * 0.5;
    }

    return super.update(t, carPos, input, lastAction);
  }
}