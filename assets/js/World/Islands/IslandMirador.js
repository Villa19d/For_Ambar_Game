/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandMirador.js  —  El Mirador de las Estrellas 🌠
   Posición: SE del mapa (~58, -38) — reemplaza IslandRadio

   Contenido:
   • Plataforma algo más grande con suelo oscuro tipo noche
   • Observatorio pequeño con cúpula y telescopio
   • Constelaciones flotantes que forman "Te amo Ámbar"
   • Mensaje "Te quiero 1000 vidas conmigo" en label sprite
   • Estrellas fugaces que cruzan la isla
   • Campo de estrellas estáticas alrededor
   • Luces azul-violeta muy suaves
   ═══════════════════════════════════════════════════════════ */

class IslandMirador extends IslandBase {

  /* ── Plataforma propia — un poco más grande ─────────────── */
  _buildPlatform() {
    const g = this.group;
    const c = this.cfg;

    // Suelo — azul noche oscuro, radio 12
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 13, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0x03071a, roughness: 0.9, metalness: 0.0 })
    );
    ground.position.y = 0.17;
    ground.receiveShadow = ground.castShadow = true;
    g.add(ground);

    // Borde — constelación de puntos dorados
    for(let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 4),
        new THREE.MeshStandardMaterial({
          color: c.color, emissive: c.color, emissiveIntensity: 1.6
        })
      );
      dot.position.set(Math.cos(angle) * 12.1, 0.38, Math.sin(angle) * 12.1);
      g.add(dot);
    }

    // Luz de suelo muy suave
    this._rimLight = new THREE.PointLight(c.color, 0.8, 22);
    this._rimLight.position.y = 0.4;
    g.add(this._rimLight);

    // Camino de acceso
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x06102e, roughness: 0.9 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 13);
    path.receiveShadow = true;
    g.add(path);

    // Farolas en el camino
    [-1.4, 1.4].forEach(x => {
      for(let zi = 0; zi < 3; zi++) {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 6, 4),
          new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 2 })
        );
        glow.position.set(x, 0.5, 7 + zi * 3.5);
        g.add(glow);
        const gl = new THREE.PointLight(c.color, 0.6, 3.5);
        gl.position.set(x, 0.7, 7 + zi * 3.5);
        g.add(gl);
      }
    });
  }

  /* ── Decoración principal ───────────────────────────────── */
  _buildDecoration() {
    this._buildObservatory();
    this._buildConstellations();
    this._buildShootingStars();
    this._buildStarField();
    this._buildMessageLabel();

    console.log('%c🌠 Isla Mirador lista', 'color:#aac4ff;font-weight:bold');
  }

  /* ── OBSERVATORIO ───────────────────────────────────────── */
  _buildObservatory() {
    const g  = this.group;
    const og = new THREE.Group();
    og.position.set(-2, 0.35, 1);
    g.add(og);

    const stone = new THREE.MeshStandardMaterial({ color: 0x1a2240, roughness: 0.7, metalness: 0.1 });
    const dome  = new THREE.MeshStandardMaterial({ color: 0x0d1a35, roughness: 0.4, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.2, metalness: 0.8 });

    // Base cilíndrica
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 2.8, 16), stone);
    base.position.y = 1.4;
    base.castShadow = true;
    og.add(base);

    // Puerta
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2a3a60, roughness: 0.6 }));
    door.position.set(0, 0.7, 2.35);
    og.add(door);

    // Arco sobre la puerta
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.07, 6, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x556688, roughness: 0.5 })
    );
    arch.position.set(0, 1.42, 2.36);
    arch.rotation.z = Math.PI;
    og.add(arch);

    // 3 ventanas pequeñas
    [-1.2, 0, 1.2].forEach((angle_off, i) => {
      const angle = (i / 3) * Math.PI * 2 + Math.PI * 0.15;
      const win = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 10),
        new THREE.MeshStandardMaterial({
          color: this.cfg.color, emissive: this.cfg.color,
          emissiveIntensity: 1.2, side: THREE.DoubleSide
        })
      );
      win.position.set(
        Math.sin(angle) * 2.32,
        1.8,
        Math.cos(angle) * 2.32
      );
      win.lookAt(win.position.clone().multiplyScalar(5));
      og.add(win);
      // Luz desde ventana
      const wl = new THREE.PointLight(this.cfg.color, 0.8, 4);
      wl.position.copy(win.position);
      og.add(wl);
    });

    // Cúpula semiesférica
    const domeTop = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      dome
    );
    domeTop.position.y = 2.8;
    domeTop.castShadow = true;
    og.add(domeTop);

    // Ranura de la cúpula (donde asoma el telescopio)
    const slit = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2.0, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x000510, roughness: 1 })
    );
    slit.position.set(0, 3.5, 2.2);
    slit.rotation.x = -0.45;
    og.add(slit);

    // ── Telescopio ─────────────────────────────────────────
    const tg = new THREE.Group();
    tg.position.set(0, 3.0, 0.8);
    tg.rotation.x = -0.5;  // apuntando al cielo ligeramente
    og.add(tg);
    this._telescopeGroup = tg;

    // Cuerpo del tubo
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 2.6, 14),
      metal
    );
    tube.position.y = 0;
    tube.castShadow = true;
    tg.add(tube);

    // Lente frontal
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.20, 0.12, 14),
      new THREE.MeshStandardMaterial({
        color: this.cfg.color, emissive: this.cfg.color,
        emissiveIntensity: 2.0, roughness: 0, metalness: 0.5
      })
    );
    lens.position.y = 1.36;
    tg.add(lens);

    // Trípode
    [0, Math.PI * 2/3, Math.PI * 4/3].forEach(a => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6),
        metal
      );
      leg.position.set(Math.sin(a) * 0.55, -1.1, Math.cos(a) * 0.55);
      leg.rotation.z = -Math.sin(a) * 0.35;
      leg.rotation.x = -Math.cos(a) * 0.35;
      tg.add(leg);
    });

    // Luz del observatorio
    const obsLight = new THREE.PointLight(this.cfg.color, 2.5, 14);
    obsLight.position.set(-2, 5, 1);
    g.add(obsLight);
    this._obsLight = obsLight;
  }

  /* ── CONSTELACIONES que forman "TE AMO ÁMBAR" ──────────── */
  _buildConstellations() {
    const g = this.group;
    this._constellationLines = [];
    this._constellationStars = [];

    // Cada letra definida como puntos normalizados [x, y]
    // Se despliegan en arco alrededor de la isla, a altura 8-12
    const letters = {
      'T': [[0,0],[1,0],[0.5,0],[0.5,-1.2]],
      'E': [[0,0],[1,0],[0,-0.6],[0.8,-0.6],[0,-1.2],[1,-1.2]],
      'A': [[0,-1.2],[0.5,0],[1,-1.2],[0.25,-0.6],[0.75,-0.6]],
      'M': [[0,-1.2],[0,0],[0.5,-0.6],[1,0],[1,-1.2]],
      'O': [[0,0],[0.5,0.3],[1,0],[1,-1.2],[0.5,-1.5],[0,-1.2]],
      'Á': [[0,-1.2],[0.5,0.1],[1,-1.2],[0.25,-0.6],[0.75,-0.6],[0.35,0.25],[0.65,0.25]],
      'B': [[0,-1.2],[0,0],[0.8,-0.1],[0.7,-0.6],[0,-0.6],[0.9,-0.7],[0.8,-1.2],[0,-1.2]],
      'R': [[0,-1.2],[0,0],[0.8,-0.1],[0.7,-0.5],[0,-0.5],[0.7,-1.2]],
    };

    // Orden de las letras
    const word = ['T','E',' ','A','M','O',' ','Á','M','B','A','R'];
    const totalWidth = word.length * 1.8;
    const startX = -totalWidth / 2;
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 2.2
    });
    const starGeo = new THREE.SphereGeometry(0.12, 6, 4);

    word.forEach((letter, wi) => {
      if(letter === ' ') return;
      const pts = letters[letter];
      if(!pts) return;

      const bx = startX + wi * 1.8;
      const by = 9.5;
      const bz = -6.5;
      const scale = 1.1;

      // Estrellas en cada vértice de la letra
      pts.forEach(([lx, ly]) => {
        const star = new THREE.Mesh(starGeo, starMat.clone());
        star.position.set(bx + lx * scale, by + ly * scale * 0.9, bz);
        star.userData.phase = Math.random() * Math.PI * 2;
        g.add(star);
        this._constellationStars.push(star);
      });

      // Líneas conectando los vértices
      for(let i = 0; i < pts.length - 1; i++) {
        const p1 = new THREE.Vector3(bx + pts[i][0]*scale,     by + pts[i][1]*scale*0.9,     bz);
        const p2 = new THREE.Vector3(bx + pts[i+1][0]*scale,   by + pts[i+1][1]*scale*0.9,   bz);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(lineGeo,
          new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.35 })
        );
        g.add(line);
        this._constellationLines.push(line);
      }
    });
  }

  /* ── ESTRELLAS FUGACES ───────────────────────────────────── */
  _buildShootingStars() {
    const g = this.group;
    this._shootingStars = [];

    for(let i = 0; i < 5; i++) {
      const trail = new THREE.Group();
      g.add(trail);

      // Cabeza brillante
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 })
      );
      trail.add(head);

      // Estela (5 puntos que se desvanecen)
      const tailPts = [];
      for(let j = 1; j <= 5; j++) {
        const tp = new THREE.Mesh(
          new THREE.SphereGeometry(0.07 - j * 0.01, 4, 3),
          new THREE.MeshStandardMaterial({
            color: 0xaaccff, emissive: 0x4488ff,
            emissiveIntensity: (6 - j) * 0.4,
            transparent: true, opacity: 1 - j * 0.18
          })
        );
        trail.add(tp);
        tailPts.push(tp);
      }

      trail.userData = {
        // Posición de reinicio aleatoria en el cielo
        phase:     Math.random() * Math.PI * 2,
        period:    4 + Math.random() * 6,       // segundos por ciclo
        startX:    (Math.random() - 0.5) * 20,
        startY:    10 + Math.random() * 4,
        startZ:    (Math.random() - 0.5) * 16,
        dirX:      2 + Math.random() * 3,       // velocidad cruzando
        dirY:      -(1 + Math.random()),         // cayendo levemente
        tailPts,
        head,
        active: false,
      };

      this._shootingStars.push(trail);
    }
  }

  /* ── CAMPO DE ESTRELLAS ESTÁTICO ────────────────────────── */
  _buildStarField() {
    const g = this.group;
    const count = 180;
    const positions = new Float32Array(count * 3);

    for(let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = 5 + Math.random() * 10;
      const h     = 4 + Math.random() * 10;
      positions[i*3]   = Math.cos(angle) * r;
      positions[i*3+1] = h;
      positions[i*3+2] = Math.sin(angle) * r;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo,
      new THREE.PointsMaterial({
        color: 0xffffff, size: 0.14, sizeAttenuation: true,
        transparent: true, opacity: 0.85, depthWrite: false
      })
    );
    g.add(pts);
    this._starField = pts;
  }

  /* ── LABEL con mensaje romántico ────────────────────────── */
  _buildMessageLabel() {
    const g = this.group;

    // Label principal de la isla (sobreescribe el del base marker)
    // Panel con el mensaje especial, flotando entre la cúpula y el cielo
    const cv  = document.createElement('canvas');
    cv.width  = 640; cv.height = 96;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = 'rgba(3, 7, 30, 0.75)';
    ctx.beginPath(); ctx.roundRect(4, 4, 632, 88, 16); ctx.fill();

    // Borde azul suave
    ctx.strokeStyle = 'rgba(100, 160, 255, 0.5)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.roundRect(4, 4, 632, 88, 16); ctx.stroke();

    ctx.fillStyle = '#c8dcff';
    ctx.font      = 'italic 28px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✨ Te quiero 1000 vidas conmigo ✨', 320, 48);

    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false
    }));
    sp.scale.set(7, 1.1, 1);
    sp.position.set(0, 7.2, 0);
    g.add(sp);
  }

  /* ── UPDATE ─────────────────────────────────────────────── */
  update(t, carPos, input, lastAction) {

    // Parpadeo suave de las estrellas de constelación
    if(this._constellationStars) {
      this._constellationStars.forEach(star => {
        star.material.emissiveIntensity = 1.6 + Math.sin(t * 1.8 + star.userData.phase) * 0.8;
        star.scale.setScalar(1 + Math.sin(t * 2.2 + star.userData.phase) * 0.12);
      });
    }

    // Opacidad de las líneas de constelación pulsando suavemente
    if(this._constellationLines) {
      this._constellationLines.forEach((line, i) => {
        line.material.opacity = 0.2 + Math.sin(t * 0.9 + i * 0.3) * 0.18;
      });
    }

    // Estrellas fugaces
    if(this._shootingStars) {
      this._shootingStars.forEach((trail, si) => {
        const d    = trail.userData;
        const pct  = ((t + d.phase) % d.period) / d.period; // 0→1 por ciclo

        if(pct < 0.18) {
          // Activa: cruza el cielo en el 18% del ciclo
          trail.visible = true;
          const progress = pct / 0.18;  // 0→1 durante el cruce
          trail.position.set(
            d.startX + d.dirX * progress * 14,
            d.startY + d.dirY * progress * 4,
            d.startZ
          );
          // Estela desfasada detrás
          d.tailPts.forEach((tp, j) => {
            tp.position.set(
              -(d.dirX * (j + 1) * 0.35),
              -(d.dirY * (j + 1) * 0.18),
              0
            );
          });
          // Fade al final del cruce
          const fade = pct > 0.14 ? 1 - (pct - 0.14) / 0.04 : 1;
          trail.children.forEach(c => {
            if(c.material) c.material.opacity = (c.material.opacity ?? 1) * fade;
          });
        } else {
          trail.visible = false;
          // Reposicionar aleatoriamente para el próximo ciclo
          d.startX = (Math.random() - 0.5) * 22;
          d.startY = 10 + Math.random() * 4;
          d.startZ = (Math.random() - 0.5) * 16;
          d.dirX   = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
        }
      });
    }

    // Telescopio oscila levemente como si siguiera estrellas
    if(this._telescopeGroup) {
      this._telescopeGroup.rotation.y = Math.sin(t * 0.18) * 0.4;
      this._telescopeGroup.rotation.x = -0.5 + Math.sin(t * 0.11) * 0.12;
    }

    // Luz del observatorio cambia de tono entre azul y violeta
    if(this._obsLight) {
      this._obsLight.color.setHSL(0.65 + Math.sin(t * 0.2) * 0.05, 0.9, 0.6);
      this._obsLight.intensity = 2.0 + Math.sin(t * 1.4) * 0.6;
    }

    // Campo de estrellas rota lentísimo
    if(this._starField) {
      this._starField.rotation.y = t * 0.006;
    }

    return super.update(t, carPos, input, lastAction);
  }
}