/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandFaro.js  —  Isla del Faro 🏮  v2
   Posición: Sur del mapa (~5, -70)

   Diseño:
   • Plataforma de arena más grande (radio 13) con agua simulada
   • Sin poste/marker — solo label flotante
   • Faro arquitectónico: base octogonal, torre estriada, balcón,
     cabina de cristal, cúpula de cobre, vane meteorológica
   • Luz giratoria con haz y niebla volumétrica
   • Rocas costeras grandes con algas (color)
   • Palmeras inclinadas por el "viento"
   • Muelle de madera entrando al agua
   • Gaviotas simples volando alrededor
   • Olas animadas en el borde del agua
   • Collision disk para física del carro
   ═══════════════════════════════════════════════════════════ */

class IslandFaro extends IslandBase {

  /* ── Sin poste, solo label flotante ─────────────────────── */
  _buildMarker() {
    const g = this.group;
    const c = this.cfg;
    this.mat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.emissive, emissiveIntensity: 0,
      transparent: true, opacity: 0
    });
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), this.mat);
    this.cube.visible = false;
    g.add(this.cube);
    g.add(this._makeLabel(c.icon + ' ' + c.label, 0, 10));
  }

  /* ── Plataforma — arena + agua ──────────────────────────── */
  _buildPlatform() {
    const g  = this.group;
    const c  = this.cfg;
    const wx = c.x, wz = c.z; // posición mundial de la isla

    // Arena — disco principal, radio 13
    const sand = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 14, 0.32, 28),
      new THREE.MeshStandardMaterial({ color: 0xe8d5a3, roughness: 0.95, metalness: 0.0 })
    );
    sand.position.y = 0.16;
    sand.receiveShadow = sand.castShadow = true;
    g.add(sand);

    // ── AGUA en coordenadas MUNDIALES (no locales del grupo) ──
    const waterY = 0.01;

    // Plano de agua principal — radio reducido, solo rodea la isla
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1565a8, emissive: 0x0a2a6a, emissiveIntensity: 0.45,
      roughness: 0.02, metalness: 0.55, transparent: true, opacity: 0.92
    });
    const waterPlane = new THREE.Mesh(new THREE.CircleGeometry(26, 56), waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.set(wx, waterY, wz);
    this.scene.add(waterPlane);
    this._waterPlane = waterPlane;

    // Aguas someras — franja turquesa justo al borde de la arena
    const shallowsMat = new THREE.MeshStandardMaterial({
      color: 0x40b8d8, emissive: 0x0d5070, emissiveIntensity: 0.3,
      roughness: 0.01, metalness: 0.3, transparent: true, opacity: 0.75
    });
    const shallows = new THREE.Mesh(new THREE.RingGeometry(12.8, 17, 52), shallowsMat);
    shallows.rotation.x = -Math.PI / 2;
    shallows.position.set(wx, waterY + 0.005, wz);
    this.scene.add(shallows);
    this._shallows = shallows;

    // Espuma en la orilla — anillo blancuzco
    const foam = new THREE.Mesh(
      new THREE.RingGeometry(12.4, 13.4, 52),
      new THREE.MeshStandardMaterial({
        color: 0xeef8ff, emissive: 0xaaccdd, emissiveIntensity: 0.2,
        roughness: 0.9, transparent: true, opacity: 0.55
      })
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(wx, waterY + 0.01, wz);
    this.scene.add(foam);
    this._foam = foam;

    // Luz ambiental del agua
    this._rimLight = new THREE.PointLight(0x4488bb, 0.7, 35);
    this._rimLight.position.y = 0.5;
    g.add(this._rimLight);

    // Collision disk — también en coords mundiales (ya estaba bien)
    const colDisk = new THREE.Mesh(
      new THREE.CircleGeometry(12.5, 32),
      new THREE.MeshStandardMaterial({ visible: false, side: THREE.DoubleSide })
    );
    colDisk.rotation.x = -Math.PI / 2;
    colDisk.position.set(wx, 0.32, wz);
    this.scene.add(colDisk);
    if(!window._islandColliders) window._islandColliders = [];
    window._islandColliders.push(colDisk);

        // Después de crear el colDisk:
    if (window._groundColliders) {
      window._groundColliders.push({
        x: wx,
        z: wz,
        r: 12.5,
        y: 0.32
      });
    }
  }

  /* ── Decoración principal ───────────────────────────────── */
  _buildDecoration() {
    this._buildLighthouse();
    this._buildRocks();
    this._buildPier();
    this._buildPalms();
    this._buildSeagulls();
    this._buildWaves();
    this._loadGLBProps();
    console.log('%c🏮 Isla Faro v2 lista', 'color:#a8d4a0;font-weight:bold');
  }

  /* ── FARO arquitectónico ─────────────────────────────────── */
  _buildLighthouse() {
    const g  = this.group;
    const lg = new THREE.Group();
    lg.position.set(0, 0.32, -1);
    g.add(lg);
    this._lighthouseGroup = lg;

    const white  = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.5 });
    const red    = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, emissive: 0x550000, emissiveIntensity: 0.2 });
    const dark   = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.3, metalness: 0.6 });
    const copper = new THREE.MeshStandardMaterial({ color: 0x5a8a6a, roughness: 0.3, metalness: 0.7, emissive: 0x1a3a2a, emissiveIntensity: 0.1 });
    const glass  = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x336699, emissiveIntensity: 0.5, roughness: 0, metalness: 0.2, transparent: true, opacity: 0.7 });

    // ── Base octogonal ──────────────────────────────────────
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.2, 8), white);
    base.position.y = 0.6; base.castShadow = true; lg.add(base);

    // Escalón
    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.28, 8), white);
    step.position.y = 1.34; step.castShadow = true; lg.add(step);

    // Puerta de arco
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.1, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6, metalness: 0.3 }));
    doorFrame.position.set(0, 0.75, 2.44); lg.add(doorFrame);
    const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5 }));
    doorArch.position.set(0, 1.33, 2.44); doorArch.rotation.z = Math.PI; lg.add(doorArch);

    // ── Torre principal — estriada ──────────────────────────
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.62, 7.5, 16), white);
    tower.position.y = 5.17; tower.castShadow = true; lg.add(tower);

    // Franjas rojas (3)
    [2.0, 4.2, 6.4].forEach(y => {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.37, 1.37, 0.55, 16), red);
      stripe.position.y = y + 1.4; stripe.castShadow = true; lg.add(stripe);
    });

    // Ventanas pequeñas en la torre (3 niveles)
    [2.5, 4.8, 7.1].forEach(y => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.06), glass);
      win.position.set(0, y, 1.64); lg.add(win);
    });

    // ── Balcón ──────────────────────────────────────────────
    const balconyFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.14, 20), white);
    balconyFloor.position.y = 9.27; balconyFloor.castShadow = true; lg.add(balconyFloor);

    // Barandal del balcón — 16 postes
    for(let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 5), dark);
      post.position.set(Math.sin(angle)*1.72, 9.57, Math.cos(angle)*1.72);
      lg.add(post);
    }
    // Aro del barandal
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.045, 6, 32), dark);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 9.84; lg.add(rail);

    // ── Cabina de cristal ────────────────────────────────────
    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 1.4, 12), glass);
    cabin.position.y = 10.27; cabin.castShadow = true; lg.add(cabin);

    // Marco metálico de la cabina — costillas verticales
    for(let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), dark);
      rib.position.set(Math.sin(angle)*1.26, 10.27, Math.cos(angle)*1.26);
      lg.add(rib);
    }

    // ── Cúpula de cobre ──────────────────────────────────────
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 16, 8, 0, Math.PI*2, 0, Math.PI*0.5), copper);
    dome.position.y = 11.0; dome.castShadow = true; lg.add(dome);

    // Punta / veleta
    const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 1.2, 6), dark);
    spike.position.y = 11.9; lg.add(spike);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), copper);
    ball.position.y = 12.55; lg.add(ball);

    // ── LUZ GIRATORIA + LENTE VISIBLE ────────────────────────
    this._beamGroup = new THREE.Group();
    this._beamGroup.position.set(0, 10.27, -1);
    g.add(this._beamGroup);

    // ── Lente de Fresnel — el objeto que se ve girar ──────────
    // Anillo exterior de la lente (prisma)
    const lensRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.14, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xaaddff, emissive: 0xffeeaa, emissiveIntensity: 2.0,
        roughness: 0.0, metalness: 0.3, transparent: true, opacity: 0.85
      })
    );
    lensRing.rotation.x = Math.PI / 2;
    this._beamGroup.add(lensRing);

    // Segundo anillo interior
    const lensRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.10, 6, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffdd88, emissiveIntensity: 3.0,
        roughness: 0.0, transparent: true, opacity: 0.9
      })
    );
    lensRing2.rotation.x = Math.PI / 2;
    this._beamGroup.add(lensRing2);

    // Núcleo — la bombilla central muy brillante
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffeeaa, emissiveIntensity: 8
      })
    );
    this._beamGroup.add(bulb);

    // Brazo reflector — la pieza que da la sensación de rotación
    // Es un box alargado que pasa por la cabina de lado a lado
    const reflector = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.08, 0.25),
      new THREE.MeshStandardMaterial({
        color: 0xffeeaa, emissive: 0xffcc44, emissiveIntensity: 1.5,
        roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.88
      })
    );
    this._beamGroup.add(reflector);

    // Segundo brazo perpendicular (como una cruz giratoria)
    const reflector2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.08, 1.55),
      new THREE.MeshStandardMaterial({
        color: 0xffeeaa, emissive: 0xffcc44, emissiveIntensity: 1.5,
        roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.7
      })
    );
    this._beamGroup.add(reflector2);

    // Haz principal (SpotLight)
    this._faroLight = new THREE.SpotLight(0xffeeaa, 10, 80, Math.PI * 0.045, 0.25);
    this._faroLight.position.set(0, 0, 0);
    this._faroLight.target.position.set(40, -2, 0);
    this._beamGroup.add(this._faroLight);
    this._beamGroup.add(this._faroLight.target);

    // Segundo haz opuesto
    this._faroLight2 = new THREE.SpotLight(0xffeeaa, 6, 60, Math.PI * 0.04, 0.35);
    this._faroLight2.position.set(0, 0, 0);
    this._faroLight2.target.position.set(-40, -2, 0);
    this._beamGroup.add(this._faroLight2);
    this._beamGroup.add(this._faroLight2.target);

    // Resplandor de la cabina
    this._faroGlow = new THREE.PointLight(0xffcc44, 4, 18);
    this._faroGlow.position.set(0, 10.27, -1);
    g.add(this._faroGlow);
  }

  /* ── ROCAS COSTERAS ──────────────────────────────────────── */
  _buildRocks() {
    const g = this.group;

    // Grupos de rocas con variedad de tamaño y color
    const rockConfigs = [
      { pos:[7, 0.32, 3],   s:[1.1,0.7,1.0], col: 0x6a5a4a, rot: 0.4  },
      { pos:[8.5, 0.32, -2], s:[0.8,0.55,0.9], col: 0x5a4a3a, rot: 1.2 },
      { pos:[-7, 0.32, 5],   s:[1.3,0.8,1.1], col: 0x7a6a56, rot: 2.1  },
      { pos:[-8, 0.32, -3],  s:[0.9,0.6,1.0], col: 0x5e4e3e, rot: 0.7  },
      { pos:[5, 0.32, -7],   s:[1.0,0.65,0.9], col: 0x6a5a4a, rot: 1.8 },
      { pos:[-5, 0.32, -8],  s:[0.7,0.5,0.8], col: 0x7a6858, rot: 0.3  },
      { pos:[10.5, 0.1, 1],  s:[1.5,0.9,1.3], col: 0x4a3a2e, rot: 1.0 }, // en el agua
      { pos:[-10, 0.1, -2],  s:[1.2,0.8,1.0], col: 0x5a4a38, rot: 2.4 }, // en el agua
      // Rocas pequeñas decorativas
      { pos:[3, 0.32, 6],    s:[0.4,0.35,0.45], col: 0x8a7a64, rot: 0.5 },
      { pos:[-4, 0.32, 6.5], s:[0.35,0.3,0.4],  col: 0x7a6a55, rot: 1.6 },
      { pos:[6.5, 0.32, -5], s:[0.45,0.38,0.5], col: 0x6a5c4a, rot: 2.8 },
    ];

    rockConfigs.forEach(({ pos, s, col, rot }) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7, 1),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 })
      );
      rock.position.set(...pos);
      rock.scale.set(...s);
      rock.rotation.y = rot;
      rock.rotation.x = (Math.random()-0.5)*0.3;
      rock.castShadow = true;
      g.add(rock);

      // Musgo/alga verde en algunas rocas
      if(Math.random() > 0.4) {
        const moss = new THREE.Mesh(
          new THREE.SphereGeometry(0.72, 7, 5, 0, Math.PI*2, 0, Math.PI*0.35),
          new THREE.MeshStandardMaterial({ color: 0x3a6a3a, roughness: 0.9, emissive: 0x1a3a1a, emissiveIntensity: 0.1 })
        );
        moss.position.set(...pos);
        moss.position.y += s[1] * 0.62;
        moss.scale.set(s[0]*1.02, 0.3, s[2]*1.02);
        g.add(moss);
      }
    });

    // Estrellitas de mar en la arena (decoración plana)
    [[3.5, 5], [-2.5, 7.5], [5.5, 2.5], [-6, 3.5]].forEach(([rx, rz]) => {
      const star = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.05, 5),
        new THREE.MeshStandardMaterial({ color: 0xd4783a, roughness: 0.8 })
      );
      star.position.set(rx, 0.33, rz);
      star.rotation.y = Math.random()*Math.PI;
      g.add(star);
    });
  }

  /* ── MUELLE DE MADERA ────────────────────────────────────── */
  _buildPier() {
    const g   = this.group;
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95 });

    // Tablones del muelle (7 secciones hacia el agua)
    for(let i = 0; i < 7; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.55), wood);
      plank.position.set(10 + i*0.9, 0.16 - i*0.04, 5.5);
      plank.castShadow = true; g.add(plank);
    }
    // Soporte lateral
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.1, 0.08), wood);
    rail.position.set(13.1, 0.35, 4.68); g.add(rail);
    const rail2 = rail.clone();
    rail2.position.z = 6.32; g.add(rail2);

    // Pilotes
    [[10.5,5.5],[12.5,5.5],[14.5,5.5],[11.5,5.5],[13.5,5.5]].forEach(([px,pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.8, 6), dark);
      post.position.set(px, -0.5, pz); post.castShadow = true; g.add(post);
    });

    // Barca simple al final del muelle
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xc8482a, roughness: 0.7 }));
    hull.position.set(16.5, 0.1, 5.5); hull.castShadow = true; g.add(hull);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.8 }));
    rim.position.set(16.5, 0.3, 5.5); g.add(rim);
    this._barca = hull;
  }

  /* ── PALMERAS ────────────────────────────────────────────── */
  _buildPalms() {
    const g = this.group;
    this._palms = [];

    [[4, 0.32, 6, -0.22], [-5, 0.32, 5.5, 0.18], [7, 0.32, -3, -0.15]].forEach(
      ([px, py, pz, lean]) => {
        const pg = new THREE.Group();
        pg.position.set(px, py, pz);
        g.add(pg);

        // Tronco curvado (3 secciones)
        let y = 0;
        for(let i = 0; i < 4; i++) {
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12-i*0.02, 0.16-i*0.02, 1.1, 7),
            new THREE.MeshStandardMaterial({ color: 0x7a5a30, roughness: 0.9 })
          );
          seg.position.set(Math.sin(lean*i)*i*0.3, y + 0.55, 0);
          seg.rotation.z = lean * 0.3;
          seg.castShadow = true;
          pg.add(seg);
          y += 1.0;
        }

        // Hojas — 7 palmas
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a7a2a, roughness: 0.8, side: THREE.DoubleSide });
        for(let l = 0; l < 7; l++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.45), leafMat);
          leaf.position.set(Math.sin(lean*3)*0.8, y + 0.25, 0);
          leaf.rotation.y = (l/7)*Math.PI*2;
          leaf.rotation.x = -0.5;
          leaf.rotation.z = 0.3;
          leaf.castShadow = true;
          pg.add(leaf);
        }

        pg.userData.baseRotY = pg.rotation.y;
        pg.userData.lean = lean;
        this._palms.push(pg);
      }
    );
  }

  /* ── GAVIOTAS ────────────────────────────────────────────── */
  _buildSeagulls() {
    const g = this.group;
    this._seagulls = [];

    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7, side: THREE.DoubleSide });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 });

    for(let i = 0; i < 5; i++) {
      const sg = new THREE.Group();

      // Cuerpo
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), bodyMat);
      body.scale.set(1, 0.6, 2); sg.add(body);

      // Alas — dos planos que se doblan
      const wL = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), wingMat);
      wL.position.set(-0.55, 0, 0); wL.rotation.z =  0.3; sg.add(wL);
      const wR = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), wingMat);
      wR.position.set( 0.55, 0, 0); wR.rotation.z = -0.3; sg.add(wR);

      sg.userData = {
        radius:  12 + Math.random()*8,
        height:  7  + Math.random()*6,
        speed:   0.18 + Math.random()*0.14,
        phase:   (i / 5) * Math.PI*2,
        flapSpeed: 3 + Math.random()*2,
        wL, wR
      };
      g.add(sg);
      this._seagulls.push(sg);
    }
  }

  /* ── OLAS ANIMADAS ───────────────────────────────────────── */
  _buildWaves() {
    const g = this.group;
    this._waves = [];

    // 3 anillos de olas que se expanden
    for(let w = 0; w < 3; w++) {
      const wave = new THREE.Mesh(
        new THREE.TorusGeometry(13.5 + w*2, 0.18, 4, 40),
        new THREE.MeshStandardMaterial({
          color: 0x88ccee, emissive: 0x224466, emissiveIntensity: 0.4,
          transparent: true, opacity: 0.6, roughness: 0.1
        })
      );
      wave.rotation.x = Math.PI / 2;
      wave.position.y = 0.05;
      wave.userData.phase = (w / 3) * Math.PI * 2;
      g.add(wave);
      this._waves.push(wave);
    }
  }

  /* ── GLB PROPS opcionales ────────────────────────────────── */
  _loadGLBProps() {
    const LoaderClass = (typeof THREE !== 'undefined' && THREE.GLTFLoader)
      ? THREE.GLTFLoader
      : (typeof GLTFLoader !== 'undefined' ? GLTFLoader : null);
    if(!LoaderClass) return;
    const loader = new LoaderClass();
    const g = this.group;

    // Bancos cerca del faro
    loader.load('models/Bancos/benches-compressed.glb', gltf => {
      [[3.5, 0.32, 2.5, 0.8], [-3, 0.32, 2, -0.5]].forEach(([px,py,pz,ry]) => {
        const bench = gltf.scene.clone(true);
        bench.scale.setScalar(1.0);
        bench.position.set(px, py, pz);
        bench.rotation.y = ry;
        bench.traverse(c => { if(c.isMesh) c.castShadow = true; });
        g.add(bench);
      });
      console.log('%c🪑 Bancos cargados', 'color:#a8d4a0');
    }, undefined, () => {
      // Fallback: bancos simples
      [[3.5,2.5,0.8],[-3,2,-0.5]].forEach(([px,pz,ry]) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4,0.1,0.5),
          new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 }));
        seat.position.set(px,0.42,pz); seat.rotation.y=ry;
        seat.castShadow=true; g.add(seat);
      });
    });

    // Farolas encendidas (decoración costera)
    loader.load('models/Farolas sin el poste/lanterns-compressed.glb', gltf => {
      [[4,0.32,0],[- 4,0.32,0],[0,0.32,4.5]].forEach(([px,py,pz]) => {
        const lan = gltf.scene.clone(true);
        lan.scale.setScalar(0.7); lan.position.set(px,py,pz);
        lan.traverse(c => { if(c.isMesh) c.castShadow=true; });
        g.add(lan);
        const ll = new THREE.PointLight(0xffcc88, 1.4, 7);
        ll.position.set(px, 1.2, pz); g.add(ll);
        if(!this._lanternLights) this._lanternLights=[];
        this._lanternLights.push(ll);
      });
      console.log('%c🏮 Farolas cargadas', 'color:#a8d4a0');
    }, undefined, () => {
      [[4,0],[-4,0],[0,4.5]].forEach(([px,pz]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.15,8,6),
          new THREE.MeshStandardMaterial({ color:0xffcc88, emissive:0xffcc44, emissiveIntensity:2.5 }));
        m.position.set(px,0.55,pz); g.add(m);
        const ll = new THREE.PointLight(0xffcc88,1.2,6);
        ll.position.set(px,0.8,pz); g.add(ll);
        if(!this._lanternLights) this._lanternLights=[];
        this._lanternLights.push(ll);
      });
    });
  }

  /* ── UPDATE ─────────────────────────────────────────────── */
  update(t, carPos, input, lastAction) {

    // Haz del faro — gira
    if(this._beamGroup) this._beamGroup.rotation.y = t * 0.7;
    if(this._faroLight)  this._faroLight.intensity  = 9 + Math.sin(t * 1.5) * 1.5;
    if(this._faroLight2) this._faroLight2.intensity = 5 + Math.sin(t * 1.5 + Math.PI) * 1.0;
    if(this._faroGlow) {
      this._faroGlow.intensity = 3.5 + Math.sin(t * 3) * 1.0;
      this._faroGlow.color.setHSL(0.12 + Math.sin(t*0.4)*0.04, 1, 0.65);
    }

    // Agua — animación de textura: color shift + brillo ondulante
    if(this._waterPlane) {
      const mat = this._waterPlane.material;
      mat.emissiveIntensity = 0.35 + Math.sin(t * 0.7) * 0.12;
      mat.color.setHSL(0.58 + Math.sin(t * 0.3) * 0.02, 0.75, 0.35 + Math.sin(t * 0.5) * 0.04);
      this._waterPlane.rotation.z = t * 0.018; // rotación lenta = ilusión de corriente
    }
    if(this._shallows) {
      this._shallows.material.opacity = 0.68 + Math.sin(t * 1.1 + 0.8) * 0.1;
      this._shallows.material.emissiveIntensity = 0.25 + Math.sin(t * 0.9) * 0.1;
    }
    if(this._foam) {
      this._foam.material.opacity = 0.4 + Math.sin(t * 1.8) * 0.18;
    }

    // Palmeras — se mecen con el viento
    if(this._palms) this._palms.forEach(p => {
      p.rotation.z = p.userData.lean * 0.8 + Math.sin(t * 0.9 + p.userData.phase) * 0.04;
      p.rotation.x = Math.sin(t * 0.7) * 0.02;
    });

    // Gaviotas — vuelan en círculos y aletean
    if(this._seagulls) this._seagulls.forEach(sg => {
      const d  = sg.userData;
      const a  = t * d.speed + d.phase;
      sg.position.set(Math.cos(a)*d.radius, d.height, Math.sin(a)*d.radius);
      sg.rotation.y = -a + Math.PI * 0.5;
      // Aleteo
      const flap = Math.sin(t * d.flapSpeed) * 0.45;
      d.wL.rotation.z =  0.3 + flap;
      d.wR.rotation.z = -0.3 - flap;
    });

    // Barca — mece suave
    if(this._barca) {
      this._barca.position.y = 0.1 + Math.sin(t * 0.6) * 0.06;
      this._barca.rotation.z = Math.sin(t * 0.5) * 0.04;
    }

    // Luz ambiental del agua — varía color entre azul y teal
    if(this._rimLight) {
      this._rimLight.color.setHSL(0.55 + Math.sin(t*0.3)*0.04, 0.8, 0.5);
      this._rimLight.intensity = 0.5 + Math.sin(t*0.7)*0.2;
    }

    // Farolas — parpadeo
    if(this._lanternLights) this._lanternLights.forEach((ll,i) => {
      ll.intensity = 1.2 + Math.sin(t*2.1+i*1.1)*0.3;
    });

    return super.update(t, carPos, input, lastAction);
  }
}