/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandMirador.js  —  El Mirador de las Estrellas 🌠
   Posición: SE del mapa (~58, -38)

   Fixes v2:
   ✅ Sin poste/marker — solo cubo flotante invisible para trigger
   ✅ Plataforma radio 14 + disco invisible para raycast (fix altura carro)
   ✅ Letra E corregida — segmentos correctos por índice
   ✅ GLB: luna, farolas, frasco estrellas, esfera rodante, galaxia
   ✅ Esfera tiene física de empuje contra el carro
   ═══════════════════════════════════════════════════════════ */

class IslandMirador extends IslandBase {

  /* ── Sobreescribir marker — SIN POSTE ───────────────────── */
  _buildMarker() {
    const g = this.group;
    const c = this.cfg;

    // Cubo invisible — existe solo para que IslandBase.update() no rompa
    this.mat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.emissive, emissiveIntensity: 0,
      transparent: true, opacity: 0
    });
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), this.mat);
    this.cube.visible = false;
    g.add(this.cube);

    // Label flotante sin poste
    g.add(this._makeLabel(c.icon + ' ' + c.label, 0, 7.5));
  }

  /* ── Plataforma propia — radio 14 ───────────────────────── */
  _buildPlatform() {
    const g = this.group;
    const c = this.cfg;

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 15, 0.38, 26),
      new THREE.MeshStandardMaterial({ color: 0x03071a, roughness: 0.9, metalness: 0.0 })
    );
    ground.position.y = 0.19;
    ground.receiveShadow = ground.castShadow = true;
    g.add(ground);

    // Borde de puntos brillantes
    for(let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 4),
        new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 1.6 })
      );
      dot.position.set(Math.cos(angle) * 14.1, 0.42, Math.sin(angle) * 14.1);
      g.add(dot);
    }

    this._rimLight = new THREE.PointLight(c.color, 0.8, 28);
    this._rimLight.position.y = 0.5;
    g.add(this._rimLight);

    // // Camino de acceso
    // const path = new THREE.Mesh(
    //   new THREE.PlaneGeometry(3.5, 18),
    //   new THREE.MeshStandardMaterial({ color: 0x06102e, roughness: 0.9 })
    // );
    // path.rotation.x = -Math.PI / 2;
    // path.position.set(0, 0.02, 15);
    // path.receiveShadow = true;
    // g.add(path);

    // // Lucecitas en el camino
    // [-1.5, 1.5].forEach(x => {
    //   for(let zi = 0; zi < 4; zi++) {
    //     const glow = new THREE.Mesh(
    //       new THREE.SphereGeometry(0.11, 6, 4),
    //       new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 2.2 })
    //     );
    //     glow.position.set(x, 0.55, 7 + zi * 3.2);
    //     g.add(glow);
    //     const gl = new THREE.PointLight(c.color, 0.55, 4);
    //     gl.position.set(x, 0.75, 7 + zi * 3.2);
    //     g.add(gl);
    //   }
    // });

    // ── Fix altura del carro: disco invisible en coords mundiales ──
    // El Vehicle._getGroundY hace raycast — este disco lo recibe
    const platY = 0.38;
    const colDisk = new THREE.Mesh(
      new THREE.CircleGeometry(13.5, 32),
      new THREE.MeshStandardMaterial({ visible: false, side: THREE.DoubleSide })
    );
    colDisk.rotation.x = -Math.PI / 2;
    // Posición MUNDIAL (el grupo ya está en cfg.x, cfg.z)
    colDisk.position.set(this.cfg.x, platY, this.cfg.z);
    this.scene.add(colDisk);
    // Guardar referencia para el raycast
    if(!window._islandColliders) window._islandColliders = [];
    window._islandColliders.push(colDisk);
  }

  /* ── Decoración ─────────────────────────────────────────── */
  _buildDecoration() {
    this._buildObservatory();
    this._buildConstellations();
    this._buildShootingStars();
    this._buildStarField();
    this._buildMessageLabel();
    this._loadGLBModels();
    console.log('%c🌠 Isla Mirador lista', 'color:#aac4ff;font-weight:bold');
  }

  /* ── OBSERVATORIO ───────────────────────────────────────── */
  _buildObservatory() {
    const g  = this.group;
    const og = new THREE.Group();
    og.position.set(-2.5, 0.38, 0.5);
    g.add(og);
    this._observatoryGroup = og;

    const stone = new THREE.MeshStandardMaterial({ color: 0x1a2240, roughness: 0.7, metalness: 0.1 });
    const dome  = new THREE.MeshStandardMaterial({ color: 0x0d1a35, roughness: 0.4, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.2, metalness: 0.8 });

    // Base cilíndrica
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 2.8, 16), stone);
    base.position.y = 1.4; base.castShadow = true; og.add(base);

    // Puerta
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2a3a60, roughness: 0.6 }));
    door.position.set(0, 0.7, 2.35); og.add(door);

    // Arco
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.07, 6, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x556688, roughness: 0.5 }));
    arch.position.set(0, 1.42, 2.36); arch.rotation.z = Math.PI; og.add(arch);

    // 3 ventanas
    [0, Math.PI * 2/3, Math.PI * 4/3].forEach(angle => {
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10),
        new THREE.MeshStandardMaterial({
          color: this.cfg.color, emissive: this.cfg.color,
          emissiveIntensity: 1.2, side: THREE.DoubleSide
        }));
      win.position.set(Math.sin(angle)*2.32, 1.8, Math.cos(angle)*2.32);
      win.lookAt(win.position.clone().multiplyScalar(5));
      og.add(win);
      const wl = new THREE.PointLight(this.cfg.color, 0.8, 4);
      wl.position.copy(win.position); og.add(wl);
    });

    // Cúpula
    const domeTop = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 20, 10, 0, Math.PI*2, 0, Math.PI/2), dome);
    domeTop.position.y = 2.8; domeTop.castShadow = true; og.add(domeTop);

    // Ranura
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x000510, roughness: 1 }));
    slit.position.set(0, 3.5, 2.2); slit.rotation.x = -0.45; og.add(slit);

    // Telescopio
    const tg = new THREE.Group();
    tg.position.set(0, 3.0, 0.8); tg.rotation.x = -0.5; og.add(tg);
    this._telescopeGroup = tg;

    tg.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.6, 14), metal), { castShadow: true }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.12, 14),
      new THREE.MeshStandardMaterial({ color: this.cfg.color, emissive: this.cfg.color, emissiveIntensity: 2.0, roughness: 0, metalness: 0.5 }));
    lens.position.y = 1.36; tg.add(lens);

    [0, Math.PI*2/3, Math.PI*4/3].forEach(a => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), metal);
      leg.position.set(Math.sin(a)*0.55, -1.1, Math.cos(a)*0.55);
      leg.rotation.z = -Math.sin(a)*0.35; leg.rotation.x = -Math.cos(a)*0.35;
      tg.add(leg);
    });

    const obsLight = new THREE.PointLight(this.cfg.color, 2.5, 16);
    obsLight.position.set(-2.5, 5.5, 0.5); g.add(obsLight);
    this._obsLight = obsLight;
  }

  /* ── CONSTELACIONES "TE AMO ÁMBAR" — letra E corregida ─── */
  _buildConstellations() {
    const g = this.group;
    this._constellationLines = [];
    this._constellationStars = [];

    // Definición de letras: pts=[x,y], segs=[[i,j],...] por índice de punto
    const letterDefs = {
      'T': { pts:[[0,0],[1,0],[0.5,0],[0.5,-1.2]],           segs:[[0,1],[2,3]] },
      'E': { pts:[[0,0],[1,0],[0,-0.55],[0.82,-0.55],[0,-1.1],[1,-1.1]],
             segs:[[0,1],[0,2],[2,3],[2,4],[4,5]] },           // top,left,mid,down,bot
      'A': { pts:[[0,-1.2],[0.5,0.05],[1,-1.2],[0.22,-0.68],[0.78,-0.68]],
             segs:[[0,1],[1,2],[3,4]] },
      'M': { pts:[[0,-1.2],[0,0],[0.5,-0.55],[1,0],[1,-1.2]], segs:[[0,1],[1,2],[2,3],[3,4]] },
      'O': { pts:[[0.5,0.1],[1,-0.15],[1,-1.05],[0.5,-1.3],[0,-1.05],[0,-0.15]],
             segs:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]] },
      'Á': { pts:[[0,-1.2],[0.5,0.1],[1,-1.2],[0.22,-0.65],[0.78,-0.65],[0.36,0.22],[0.64,0.22]],
             segs:[[0,1],[1,2],[3,4],[5,6]] },
      'B': { pts:[[0,-1.2],[0,0],[0.8,-0.05],[0.72,-0.55],[0,-0.6],[0.82,-0.65],[0.78,-1.15],[0,-1.2]],
             segs:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] },
      'R': { pts:[[0,-1.2],[0,0],[0.8,-0.08],[0.72,-0.52],[0,-0.52],[0.72,-1.2]],
             segs:[[0,1],[1,2],[2,3],[3,4],[3,5]] },
    };

    const word   = ['T','E',' ','A','M','O',' ','Á','M','B','A','R'];
    const totalW = word.length * 1.85;
    const startX = -totalW / 2;
    const BY = 9.2, BZ = -7.5, S = 1.05;

    const starMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 2.4 });
    const starGeo = new THREE.SphereGeometry(0.12, 6, 4);

    word.forEach((letter, wi) => {
      if(letter === ' ') return;
      const def = letterDefs[letter]; if(!def) return;
      const bx = startX + wi * 1.85;

      const positions = def.pts.map(([lx,ly]) =>
        new THREE.Vector3(bx + lx*S, BY + ly*S*0.9, BZ));

      positions.forEach(pos => {
        const star = new THREE.Mesh(starGeo, starMat.clone());
        star.position.copy(pos);
        star.userData.phase = Math.random() * Math.PI * 2;
        g.add(star); this._constellationStars.push(star);
      });

      def.segs.forEach(([i0, i1]) => {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([positions[i0], positions[i1]]);
        const line = new THREE.Line(lineGeo,
          new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.4 }));
        g.add(line); this._constellationLines.push(line);
      });
    });
  }

  /* ── ESTRELLAS FUGACES ───────────────────────────────────── */
  _buildShootingStars() {
    const g = this.group;
    this._shootingStars = [];
    for(let i = 0; i < 5; i++) {
      const trail = new THREE.Group(); g.add(trail);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 }));
      trail.add(head);
      const tailPts = [];
      for(let j = 1; j <= 5; j++) {
        const tp = new THREE.Mesh(
          new THREE.SphereGeometry(0.07 - j*0.01, 4, 3),
          new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x4488ff,
            emissiveIntensity: (6-j)*0.4, transparent: true, opacity: 1 - j*0.18 }));
        trail.add(tp); tailPts.push(tp);
      }
      trail.userData = {
        phase: Math.random()*Math.PI*2, period: 4+Math.random()*6,
        startX: (Math.random()-0.5)*22, startY: 10+Math.random()*4,
        startZ: (Math.random()-0.5)*16, dirX: 2+Math.random()*3,
        dirY: -(1+Math.random()), tailPts, head
      };
      this._shootingStars.push(trail);
    }
  }

  /* ── CAMPO DE ESTRELLAS ──────────────────────────────────── */
  _buildStarField() {
    const g = this.group;
    const count = 200;
    const pos = new Float32Array(count*3);
    for(let i = 0; i < count; i++) {
      const a = Math.random()*Math.PI*2, r = 5+Math.random()*12, h = 4+Math.random()*12;
      pos[i*3]=Math.cos(a)*r; pos[i*3+1]=h; pos[i*3+2]=Math.sin(a)*r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.14, sizeAttenuation: true,
      transparent: true, opacity: 0.85, depthWrite: false }));
    g.add(pts); this._starField = pts;
  }

  /* ── LABEL ROMÁNTICO ─────────────────────────────────────── */
  _buildMessageLabel() {
    const g = this.group;
    const cv = document.createElement('canvas');
    cv.width=640; cv.height=72;
    // const ctx = cv.getContext('2d');
    // ctx.fillStyle='rgba(3,7,30,0.88)';
    // ctx.beginPath(); ctx.roundRect(4,4,632,64,14); ctx.fill();
    // ctx.strokeStyle='rgba(100,160,255,0.45)'; ctx.lineWidth=1.5;
    // ctx.beginPath(); ctx.roundRect(4,4,632,64,14); ctx.stroke();
    // ctx.fillStyle='#c8dcff'; ctx.font='italic 26px serif';
    // ctx.textAlign='center'; ctx.textBaseline='middle';
    // // ctx.fillText('✨ Te quiero 1000 vidas conmigo ✨', 320, 36);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
    sp.scale.set(7, 0.9, 1); sp.position.set(0, 6.8, 0); g.add(sp);
  }

  /* ── GLB MODELS ──────────────────────────────────────────── */
  _loadGLBModels() {
    // Intentar obtener GLTFLoader — puede estar en THREE.GLTFLoader o global GLTFLoader
    const LoaderClass = (typeof THREE !== 'undefined' && THREE.GLTFLoader)
      ? THREE.GLTFLoader
      : (typeof GLTFLoader !== 'undefined' ? GLTFLoader : null);

    if(!LoaderClass) {
      console.warn('🌠 GLTFLoader no disponible — usando fallbacks geométricos');
      this._buildFallbackProps(); return;
    }
    const loader = new LoaderClass();

    // Configurar DRACOLoader si está disponible (para archivos -compressed.glb)
    const DRACOClass = (typeof THREE !== 'undefined' && THREE.DRACOLoader)
      ? THREE.DRACOLoader
      : (typeof DRACOLoader !== 'undefined' ? DRACOLoader : null);
    if(DRACOClass) {
      const draco = new DRACOClass();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
    }

    const g = this.group;

    // ─ Mesa ──────────────────────────────────────────────────
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1a2240, roughness: 0.6, metalness: 0.2 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.4), tableMat);
    tableTop.position.set(5, 1.2, -1); tableTop.castShadow = true; g.add(tableTop);
    [[-0.9,-0.55],[0.9,-0.55],[-0.9,0.55],[0.9,0.55]].forEach(([lx,lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.2,6), tableMat);
      leg.position.set(5+lx, 0.6, -1+lz); leg.castShadow=true; g.add(leg);
    });

    // ─ Luna — pequeña, flotando sobre la isla como decoración ──
    loader.load('models/Luna/luna.glb', gltf => {
      const luna = gltf.scene;
      // Calcular bbox para normalizar escala independientemente del modelo
      const box = new THREE.Box3().setFromObject(luna);
      const size = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 2.5; // diámetro deseado en unidades del mundo
      luna.scale.setScalar(targetSize / maxDim);
      luna.position.set(6, 5.5, -5); // sobre la isla, no en el cielo profundo
      luna.traverse(c => { if(c.isMesh) c.castShadow = true; });
      g.add(luna); this._luna = luna;
      // Luz suave de la luna
      const moonLight = new THREE.PointLight(0xfffadd, 1.2, 14);
      moonLight.position.set(6, 5.5, -5); g.add(moonLight);
      console.log('%c🌕 Luna cargada', 'color:#fffadd');
    }, undefined, () => {
      // Fallback: esfera pequeña amarillenta
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14),
        new THREE.MeshStandardMaterial({ color:0xfff4aa, emissive:0x887700, emissiveIntensity:0.3, roughness:0.7 }));
      m.position.set(6, 5.5, -5); g.add(m); this._luna = m;
    });

    // ─ Galaxia (galaxy.glb) — gigante, de frente, mirando hacia el observatorio ─
loader.load('models/Galaxy/galaxy2.glb', gltf => {
  const gal = gltf.scene;
  const box = new THREE.Box3().setFromObject(gal);
  const size = new THREE.Vector3(); box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 100; // ¡MUCHO MÁS GRANDE! (ajusta este número)
  gal.scale.setScalar(targetSize / maxDim);
  
  // Posición: más lejos para que quepa la galaxia gigante
  gal.position.set(-1, 25, -200); // más lejos en Z para que se vea completa
  
  // Rotación: ¡ESTA ES LA CLAVE!
  // Para que mire hacia el observatorio (hacia +Z), necesitas rotarla 180° en Y
  // y ajustar según cómo esté modelada originalmente
  // gal.rotation.set(0, Math.PI, 0); // 180 grados = mirando hacia +Z
  
  // Si aún así no queda bien, prueba estas combinaciones:
  // gal.rotation.set(0, Math.PI, 0); // Opción 1: rotación completa
  gal.rotation.set(Math.PI/2, 0, 0); // Opción 2: acostada
  // gal.rotation.set(Math.PI/2, Math.PI, 0); // Opción 3: combinación
  
  gal.traverse(c => { if(c.isMesh) c.castShadow = false; });
  g.add(gal); this._galaxy = gal;
  
  if(gltf.animations?.length) {
    this._galaxyMixer = new THREE.AnimationMixer(gal);
    this._galaxyMixer.clipAction(gltf.animations[0]).play();
  }
  console.log('%c🌌 Galaxia gigante cargada', 'color:#aa88ff');
}, undefined, () => {
  // Fallback: espiral gigante y rotada
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(15, 3.0, 16, 64), // mucho más grande
    new THREE.MeshStandardMaterial({ 
      color: 0x7755cc, 
      emissive: 0x330077, 
      emissiveIntensity: 0.8, 
      roughness: 0.3, 
      transparent: true, 
      opacity: 0.75 
    })
  );
  
  // Rotar el torus para que mire al frente
  m.rotation.x = Math.PI / 2; // Acostar el torus (plano horizontal)
  m.rotation.y = Math.PI; // Rotar para que mire al frente
  
  m.position.set(-14, 15, -100); // más lejos y más alto
  g.add(m); this._galaxy = m;
});

    // ─ Partículas de galaxia — grande, vertical, lado derecho ──
    loader.load('models/Otra galaxia pero si esta grande aguas/Particulas de galaxia2.glb', gltf => {
      const part = gltf.scene;
      const box = new THREE.Box3().setFromObject(part);
      const size = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 20; // grande y llamativa
      part.scale.setScalar(targetSize / maxDim);
      // Posición: cielo derecho, bien alejada del observatorio
      part.position.set(16, 13, -11);
      // Rotar para que quede vertical y de frente (plano YZ mirando hacia -Z/observatorio)
      part.rotation.set(Math.PI * 0.5, 0, 0); // levantarla de horizontal a vertical
      g.add(part); this._particles = part;
      if(gltf.animations?.length) {
        this._particlesMixer = new THREE.AnimationMixer(part);
        this._particlesMixer.clipAction(gltf.animations[0]).play();
      }
      console.log('%c✨ Partículas galaxia cargadas', 'color:#88ccff');
    }, undefined, () => {
      const count = 400;
      const pos = new Float32Array(count * 3);
      for(let i = 0; i < count; i++) {
        const a = Math.random()*Math.PI*2, r = Math.random()*5;
        pos[i*3]   = Math.cos(a)*r;
        pos[i*3+1] = (Math.random()-0.5)*6; // extendido en Y (vertical)
        pos[i*3+2] = Math.sin(a)*r * 0.3;   // aplanado en Z (disco visto de frente)
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color:0x88aaff, size:0.15, transparent:true, opacity:0.7, depthWrite:false }));
      pts.position.set(16, 13, -11);
      g.add(pts); this._particles = pts;
    });

    // ─ Frasco de estrellas ───────────────────────────────────
    loader.load('models/Frasco Estrellas/frasco_con_estrellas.glb', gltf => {
      const frasco = gltf.scene;
      frasco.scale.setScalar(0.4); frasco.position.set(5, 1.32, -1);
      frasco.traverse(c => { if(c.isMesh) c.castShadow=true; });
      g.add(frasco); this._frasco = frasco;
    }, undefined, () => {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.25,0.65,14),
        new THREE.MeshStandardMaterial({ color:0xaaddff, transparent:true, opacity:0.55, roughness:0 }));
      jar.position.set(5,1.65,-1); g.add(jar); this._frasco = jar;
      this._jarStars = [];
      for(let s=0; s<8; s++) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.04,4,3),
          new THREE.MeshStandardMaterial({ color:0xffee88, emissive:0xffcc00, emissiveIntensity:2 }));
        sp.position.set(5+(Math.random()-0.5)*0.3, 1.5+Math.random()*0.4, -1+(Math.random()-0.5)*0.3);
        sp.userData.baseY=sp.position.y; sp.userData.phase=Math.random()*Math.PI*2;
        g.add(sp); this._jarStars.push(sp);
      }
    });

    // ─ Esfera — sólida, el carro no puede atravesarla ────────
    const esferaStartPos = { x: 7, z: 4 }; // posición local en el grupo
    loader.load('models/Esfera Blanca/Esfera blanca.glb', gltf => {
      const esfera = gltf.scene;
      // Normalizar radio a ~0.9 unidades
      const box = new THREE.Box3().setFromObject(esfera);
      const size = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetR = 0.9;
      esfera.scale.setScalar((targetR * 2) / maxDim);
      esfera.position.set(esferaStartPos.x, targetR, esferaStartPos.z);
      esfera.traverse(c => { if(c.isMesh) c.castShadow = true; });
      g.add(esfera);
      this._esfera   = esfera;
      this._esferaR  = targetR;
      this._esferaVelX = 0;
      this._esferaVelZ = 0;
      // Registrar como colisionador para el carro
      this._registerEsferaCollider();
      console.log('%c⚪ Esfera cargada', 'color:#e8e8f0');
    }, undefined, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 22, 16),
        new THREE.MeshStandardMaterial({ color:0xe8e8f0, roughness:0.2, metalness:0.5 }));
      m.position.set(esferaStartPos.x, 0.9, esferaStartPos.z);
      m.castShadow = true; g.add(m);
      this._esfera   = m;
      this._esferaR  = 0.9;
      this._esferaVelX = 0;
      this._esferaVelZ = 0;
      this._registerEsferaCollider();
    });

    // ─ Farolas (sin poste) ────────────────────────────────────
    loader.load('models/Farolas sin el poste/lanterns-compressed.glb', gltf => {
      [[4,-5],[-4,-5],[9,2],[-9,2],[0,8]].forEach(([lx,lz]) => {
        const lan = gltf.scene.clone(true);
        lan.scale.setScalar(0.6); lan.position.set(lx,0.38,lz);
        lan.traverse(c => { if(c.isMesh) c.castShadow=true; });
        g.add(lan);
        const ll = new THREE.PointLight(this.cfg.color,1.2,6);
        ll.position.set(lx,1.0,lz); g.add(ll);
        if(!this._lanternLights) this._lanternLights=[];
        this._lanternLights.push(ll);
      });
    }, undefined, () => {
      [[4,-5],[-4,-5],[9,2],[-9,2],[0,8]].forEach(([lx,lz]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),
          new THREE.MeshStandardMaterial({ color:this.cfg.color, emissive:this.cfg.color, emissiveIntensity:2.5 }));
        m.position.set(lx,0.5,lz); g.add(m);
        const ll = new THREE.PointLight(this.cfg.color,1.0,5);
        ll.position.set(lx,0.8,lz); g.add(ll);
        if(!this._lanternLights) this._lanternLights=[];
        this._lanternLights.push(ll);
      });
    });
  }

  /* ── Registra la esfera como colisionador para el carro ─── */
  _registerEsferaCollider() {
    // La esfera se agrega al array this.colliders que Vehicle ya checa
    // Usamos un objeto especial con .isDynamic=true para actualizarlo cada frame
    this._esferaCollider = {
      x: this.cfg.x + (this._esfera?.position.x ?? 7),
      z: this.cfg.z + (this._esfera?.position.z ?? 4),
      r: this._esferaR + 0.9  // radio esfera + radio carro
    };
    this.colliders.push(this._esferaCollider);
  }

  /* ── Fallback si no hay GLTFLoader ─────────────────────── */
  _buildFallbackProps() {
    const g = this.group; const c = this.cfg;
    // Luna
    const luna = new THREE.Mesh(new THREE.SphereGeometry(1.2,20,14),
      new THREE.MeshStandardMaterial({ color:0xfff4aa, emissive:0x887700, emissiveIntensity:0.3, roughness:0.7 }));
    luna.position.set(8,12,-4); g.add(luna); this._luna=luna;
    // Esfera
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.75,22,16),
      new THREE.MeshStandardMaterial({ color:0xe8e8f0, roughness:0.2, metalness:0.5 }));
    esfera.position.set(7,0.75,4); esfera.castShadow=true; g.add(esfera);
    this._esfera=esfera; this._esferaVelX=0; this._esferaVelZ=0; this._esferaR=0.75;
    // Farolas
    [[4,-5],[-4,-5],[9,2],[-9,2],[0,8]].forEach(([lx,lz]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),
        new THREE.MeshStandardMaterial({ color:c.color, emissive:c.color, emissiveIntensity:2.5 }));
      m.position.set(lx,0.5,lz); g.add(m);
      const ll = new THREE.PointLight(c.color,1.0,5); ll.position.set(lx,0.8,lz); g.add(ll);
      if(!this._lanternLights) this._lanternLights=[];
      this._lanternLights.push(ll);
    });
  }

  /* ── UPDATE ─────────────────────────────────────────────── */
  update(t, carPos, input, lastAction) {

    // Constelación — parpadeo
    if(this._constellationStars) this._constellationStars.forEach(star => {
      star.material.emissiveIntensity = 1.6 + Math.sin(t*1.8+star.userData.phase)*0.8;
      star.scale.setScalar(1 + Math.sin(t*2.2+star.userData.phase)*0.12);
    });
    if(this._constellationLines) this._constellationLines.forEach((line,i) => {
      line.material.opacity = 0.22 + Math.sin(t*0.9+i*0.3)*0.18;
    });

    // Estrellas fugaces
    if(this._shootingStars) this._shootingStars.forEach(trail => {
      const d = trail.userData;
      const pct = ((t + d.phase) % d.period) / d.period;
      if(pct < 0.18) {
        trail.visible = true;
        const progress = pct / 0.18;
        trail.position.set(
          d.startX + d.dirX*progress*14,
          d.startY + d.dirY*progress*4,
          d.startZ
        );
        d.tailPts.forEach((tp,j) => tp.position.set(-(d.dirX*(j+1)*0.35),-(d.dirY*(j+1)*0.18),0));
        const fade = pct > 0.13 ? 1-(pct-0.13)/0.05 : 1;
        trail.children.forEach(c => { if(c.material?.transparent) c.material.opacity *= fade; });
      } else {
        trail.visible = false;
        d.startX=(Math.random()-0.5)*24; d.startY=10+Math.random()*4;
        d.startZ=(Math.random()-0.5)*18;
        d.dirX=(Math.random()>0.5?1:-1)*(2+Math.random()*3);
      }
    });

    // Telescopio
    if(this._telescopeGroup) {
      this._telescopeGroup.rotation.y = Math.sin(t*0.18)*0.4;
      this._telescopeGroup.rotation.x = -0.5 + Math.sin(t*0.11)*0.12;
    }

    // Luz obs
    if(this._obsLight) {
      this._obsLight.color.setHSL(0.65+Math.sin(t*0.2)*0.05, 0.9, 0.6);
      this._obsLight.intensity = 2.0+Math.sin(t*1.4)*0.6;
    }

    // Estrellas de fondo
    if(this._starField) this._starField.rotation.y = t*0.006;

    // Luna — flota suavemente sobre la isla
    if(this._luna) {
      this._luna.position.x = 6 + Math.sin(t*0.12)*0.8;
      this._luna.position.y = 5.5 + Math.sin(t*0.18)*0.4;
      this._luna.rotation.y = t*0.04;
    }

    // Galaxia gira lento
    if(this._galaxy) this._galaxy.rotation.y = t*0.04;
    if(this._galaxyMixer) this._galaxyMixer.update(0.016);

    // Partículas de galaxia rotan
    if(this._particles) this._particles.rotation.y = t*0.025;
    if(this._particlesMixer) this._particlesMixer.update(0.016);

    // Frasco shimmy
    if(this._frasco) this._frasco.rotation.y = Math.sin(t*0.5)*0.08;
    if(this._jarStars) this._jarStars.forEach(s => {
      s.position.y = s.userData.baseY + Math.sin(t*1.2+s.userData.phase)*0.04;
    });

    // Esfera — física + colisión sólida con el carro
    if(this._esfera) {
      const ep   = this._esfera.position;
      const wx   = this.cfg.x, wz = this.cfg.z;
      // Posición mundial de la esfera
      const ex = ep.x + wx, ez = ep.z + wz;
      const dx = carPos.x - ex, dz = carPos.z - ez;
      const dist = Math.sqrt(dx*dx + dz*dz);
      const contactR = this._esferaR + 0.95; // radio esfera + medio carro

      if(dist < contactR && dist > 0.001) {
        const nx = dx/dist, nz = dz/dist;
        // Empujar la esfera en la dirección del carro
        const impulse = (contactR - dist) * 0.35;
        this._esferaVelX += nx * impulse;
        this._esferaVelZ += nz * impulse;
        // Separar para que no se solapen (empuja al carro via carPos)
        // carPos es read-only, pero al actualizar el collider el Vehicle.js lo resuelve
      }

      // Fricción
      this._esferaVelX *= 0.90;
      this._esferaVelZ *= 0.90;
      ep.x += this._esferaVelX;
      ep.z += this._esferaVelZ;

      // Mantener dentro de la plataforma
      const r2 = Math.sqrt(ep.x*ep.x + ep.z*ep.z);
      if(r2 > 12.0) {
        const fn = 12.0/r2;
        ep.x *= fn; ep.z *= fn;
        this._esferaVelX *= -0.5;
        this._esferaVelZ *= -0.5;
      }

      // Rodar visualmente
      this._esfera.rotation.x += this._esferaVelZ / this._esferaR;
      this._esfera.rotation.z -= this._esferaVelX / this._esferaR;

      // Actualizar el colisionador para que Vehicle lo use en el próximo frame
      if(this._esferaCollider) {
        this._esferaCollider.x = ex;
        this._esferaCollider.z = ez;
      }
    }

    // Farolas — parpadeo
    if(this._lanternLights) this._lanternLights.forEach((ll,i) => {
      ll.intensity = 0.9 + Math.sin(t*1.6+i*0.7)*0.4;
    });

    return super.update(t, carPos, input, lastAction);
  }
}