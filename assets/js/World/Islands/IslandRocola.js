/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandRocola.js  —  Isla de la Rocola REDISEÑADA
   • Sin árbol recursivo (no compatible)
   • Sin árboles pinos no deseados
   • Pista de baile BIEN POSICIONADA
   • Rocola estilo Bruno Simon
   • Sin pasto invasor
   • Colisiones corregidas
═══════════════════════════════════════════════════════════ */

class IslandRocola extends IslandBase {
    
    /* ── PLATAFORMA (más grande) ─────────────────────────── */
    _buildPlatform() {
    const g = this.group;
    const c = this.cfg;
    const wx = c.x, wz = c.z;

    // Suelo principal — radio 14 (más grande que las otras islas)
    const ground = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 15, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.6, metalness: 0.2 })
    );
    ground.position.y = 0.25;
    ground.receiveShadow = ground.castShadow = true;
    g.add(ground);

    // Segundo nivel (escenario elevado) — BIEN CENTRADO
    const stage = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8.2, 0.8, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a0540, roughness: 0.4, metalness: 0.3 })
    );
    stage.position.y = 0.8;
    stage.receiveShadow = stage.castShadow = true;
    g.add(stage);
    this._stage = stage;

    // Borde con luces LED
    const rimColors = [0xff44aa, 0xaa44ff, 0x44aaff, 0xffaa44];
    rimColors.forEach((col, i) => {
        const arc = new THREE.Mesh(
            new THREE.TorusGeometry(14.2, 0.15, 8, 40, Math.PI * 2 / rimColors.length),
            new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 })
        );
        arc.rotation.x = Math.PI / 2;
        arc.rotation.z = (i / rimColors.length) * Math.PI * 2;
        arc.position.y = 0.55;
        g.add(arc);
    });

    // Camino de acceso (más ancho)
    const path = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 20),
        new THREE.MeshStandardMaterial({ color: 0x150830, roughness: 0.7 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.03, -20);
    path.receiveShadow = true;
    g.add(path);

    // Luces en el camino
    [-2, 2].forEach(x => {
        for(let zi = 0; zi < 4; zi++) {
            const lamp = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 6),
                new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 1.2 })
            );
            lamp.position.set(x, 0.4, -14 -zi * 3);
            g.add(lamp);
        }
    });

    // Luz central de la isla
    const mainLight = new THREE.PointLight(c.color, 2.5, 30);
    mainLight.position.set(0, 4, 0);
    g.add(mainLight);
    this._mainLight = mainLight;

    // ── COLLIDER PARA LA ISLA (¡IMPORTANTE!) ──
    // Crear un collider invisible a la altura correcta
    const colDisk = new THREE.Mesh(
        new THREE.CircleGeometry(14, 32),
        new THREE.MeshStandardMaterial({ visible: false, side: THREE.DoubleSide })
    );
    colDisk.rotation.x = -Math.PI / 2;
    colDisk.position.set(wx, 0.38, wz); // Misma altura que las otras islas
    this.scene.add(colDisk);
    
    // Añadir al array global de colliders
    if(!window._islandColliders) window._islandColliders = [];
    window._islandColliders.push(colDisk);
    
    // También añadir collider para el escenario elevado (opcional)
    const stageCollider = new THREE.Mesh(
        new THREE.CircleGeometry(8, 24),
        new THREE.MeshStandardMaterial({ visible: false, side: THREE.DoubleSide })
    );
    stageCollider.rotation.x = -Math.PI / 2;
    stageCollider.position.set(wx, 1.2, wz); // Altura del escenario
    this.scene.add(stageCollider);
    window._islandColliders.push(stageCollider);

    // Después de crear stageCollider:
if (window._groundColliders) {
  window._groundColliders.push({
    x: wx,
    z: wz,
    r: 14,
    y: 0.25 // Altura del suelo principal
  });
  window._groundColliders.push({
    x: wx,
    z: wz,
    r: 8,
    y: 1.2 // Altura del escenario
  });
}

    }

    /* ── DECORACIÓN PRINCIPAL ─────────────────────────────── */
    _buildDecoration() {
        this._buildJukebox();      // Rocola estilo Bruno
        this._buildDanceFloor();   // Pista de baile (BIEN POSICIONADA)
        this._buildSpeakers();     // 4 bocinas en esquinas
        this._buildCenterPiece();  // Elemento central (NO árbol recursivo)
        this._buildSpotlights();   // Luces giratorias
        this._buildNoteParticles(); // Notas musicales flotantes

        // NO agregamos pasto aquí (la isla no debe tenerlo)
        // NO agregamos árboles no deseados

        console.log('%c🎵 Isla Rocola rediseñada', 'color:#d4a8ff;font-weight:bold');
    }

    /* ── ROCOLA ESTILO BRUNO SIMON ───────────────────────── */
    _buildJukebox() {
        const g = this.group;
        const c = this.cfg.color;

        // Grupo de la rocola (posición fija)
        const jg = new THREE.Group();
        jg.position.set(-4, 1.2, 3);
        jg.rotation.y = 2.5;
        g.add(jg);

        // Materiales
        const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.3, metalness: 0.8 });
        const chrome = new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.1, metalness: 0.95 });
        const glass = new THREE.MeshStandardMaterial({ color: 0x3366aa, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.4 });
        const glowMat = (col) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 });

        // Cuerpo principal
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 1.0), darkMetal);
        body.position.y = 1.5;
        body.castShadow = true;
        jg.add(body);

        // Tapa superior curva
        const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.3, 16), chrome);
        top.position.y = 3.0;
        top.castShadow = true;
        jg.add(top);

        // Pantalla frontal
        const screen = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.0, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x224466, emissive: 0x4488ff, emissiveIntensity: 0.8 })
        );
        screen.position.set(0, 2.0, 0.55);
        jg.add(screen);

        // Marco de la pantalla
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.15, 0.05), chrome);
        frame.position.set(0, 2.0, 0.53);
        jg.add(frame);

        // Altavoces laterales
        [-0.7, 0.7].forEach(x => {
            const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), darkMetal);
            speaker.rotation.x = Math.PI / 2;
            speaker.position.set(x, 1.2, 0.55);
            jg.add(speaker);

            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x333344 }));
            cone.rotation.x = Math.PI / 2;
            cone.position.set(x, 1.2, 0.52);
            jg.add(cone);
        });

        // Tiras LED laterales
        const ledColors = [0xff44aa, 0x44ddff, 0xffaa44, 0xaa44ff];
        ledColors.forEach((col, i) => {
            const strip = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 2.5, 0.03),
                glowMat(col)
            );
            strip.position.set(-0.8 + i * 0.55, 1.8, 0.54);
            jg.add(strip);
        });

        // Botones inferiores
        [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => {
            const btn = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8),
                glowMat(ledColors[i % ledColors.length])
            );
            btn.rotation.x = Math.PI / 2;
            btn.position.set(x, 0.5, 0.55);
            jg.add(btn);
        });

        // Antenas
        [-0.7, 0.7].forEach(x => {
            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6), chrome);
            antenna.position.set(x, 4.0, 0);
            antenna.rotation.z = x > 0 ? -0.2 : 0.2;
            jg.add(antenna);

            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6), glowMat(c));
            tip.position.set(x + (x > 0 ? 0.3 : -0.3), 4.9, 0);
            jg.add(tip);
        });

        // Luz principal
        const light = new THREE.PointLight(c, 4, 15);
        light.position.set(0, 2.5, 1);
        jg.add(light);
        this._jukeboxLight = light;
        window._jukeboxLight = light;
    }

    /* ── PISTA DE BAILE (BIEN POSICIONADA) ───────────────── */
    _buildDanceFloor() {
        const g = this.group;
        this._tiles = [];

        const cols = 5, rows = 5;
        const tileSize = 1.4;
        const startX = - (cols - 1) * tileSize / 2;
        const startZ = - (rows - 1) * tileSize / 2 - 1; // -1 para centrar mejor

        const colors = [0xff44aa, 0xaa44ff, 0x44ddff, 0xffaa44, 0x44ffaa];

        for(let row = 0; row < rows; row++) {
            for(let col = 0; col < cols; col++) {
                const color = colors[(row + col) % colors.length];
                const mat = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.3,
                    roughness: 0.2,
                    metalness: 0.6
                });

                const tile = new THREE.Mesh(
                    new THREE.BoxGeometry(tileSize - 0.1, 0.1, tileSize - 0.1),
                    mat
                );

                // POSICIÓN CORRECTA: sobre el escenario (y = 1.25)
                tile.position.set(
                    startX + col * tileSize,
                    1.25,  // Altura exacta del escenario + grosor
                    startZ + row * tileSize
                );

                tile.receiveShadow = true;
                tile.userData.phase = (row * cols + col) * 0.5;
                g.add(tile);
                this._tiles.push(tile);
            }
        }

        // Marco de la pista
        const border = new THREE.Mesh(
            new THREE.BoxGeometry(cols * tileSize + 0.4, 0.15, rows * tileSize + 0.4),
            new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.7 })
        );
        border.position.set(0, 1.2, -1);
        g.add(border);
    }

    /* ── 4 BOCINAS EN ESQUINAS ───────────────────────────── */
    _buildSpeakers() {
        const g = this.group;
        const positions = [
            [-10, -10], [10, -10], [-10, 10], [10, 10]
        ];

        positions.forEach(([sx, sz]) => {
            const sg = new THREE.Group();
            sg.position.set(sx, 0.8, sz);
            
            // Orientar hacia el centro
            sg.rotation.y = Math.atan2(-sx, -sz);

            // Cuerpo
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 2.2, 1.0),
                new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.4, metalness: 0.5 })
            );
            body.position.y = 1.1;
            body.castShadow = true;
            sg.add(body);

            // Conos
            [-0.4, 0.4].forEach(dx => {
                const cone = new THREE.Mesh(
                    new THREE.ConeGeometry(0.35, 0.25, 12),
                    new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 })
                );
                cone.rotation.x = Math.PI / 2;
                cone.position.set(dx, 1.3, 0.55);
                sg.add(cone);
            });

            // LED superior
            const led = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.1, 0.1),
                new THREE.MeshStandardMaterial({ color: this.cfg.color, emissive: this.cfg.color, emissiveIntensity: 0.8 })
            );
            led.position.set(0, 2.2, 0.5);
            sg.add(led);

            g.add(sg);
        });
    }

    /* ── ELEMENTO CENTRAL (en lugar del árbol recursivo) ─── */
    _buildCenterPiece() {
        const g = this.group;

        // Una estructura tipo "tótem" de música
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.5, 0.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x332244, roughness: 0.4, metalness: 0.3 })
        );
        base.position.set(0, 1.2, 0);
        base.castShadow = true;
        g.add(base);

        // Columna central
        const column = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 2.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.2, metalness: 0.8 })
        );
        column.position.set(0, 2.5, 0);
        column.castShadow = true;
        g.add(column);

        // Esfera luminosa
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 16, 12),
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                emissive: this.cfg.color,
                emissiveIntensity: 1.5,
                roughness: 0.1,
                metalness: 0.3
            })
        );
        sphere.position.set(0, 4.0, 0);
        sphere.castShadow = true;
        g.add(sphere);
        this._centerSphere = sphere;

        // Anillos alrededor
        for(let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.2, 0.05, 8, 24),
                new THREE.MeshStandardMaterial({ color: this.cfg.color, emissive: this.cfg.color, emissiveIntensity: 0.5 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = (i / 3) * Math.PI * 2 / 3;
            ring.position.set(0, 4.0, 0);
            g.add(ring);
            this[`_ring${i}`] = ring;
        }

        // Luz central
        const centerLight = new THREE.PointLight(this.cfg.color, 3, 12);
        centerLight.position.set(0, 4, 0);
        g.add(centerLight);
    }

    /* ── SPOTLIGHTS GIRATORIOS ───────────────────────────── */
    _buildSpotlights() {
        const g = this.group;
        this._spots = [];

        const colors = [0xff44aa, 0x44ddff, 0xffaa44, 0xaa44ff];
        const positions = [[-7, 7], [7, 7], [-7, -7], [7, -7]];

        positions.forEach(([sx, sz], i) => {
            // Poste
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.1, 6, 8),
                new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.3, metalness: 0.8 })
            );
            pole.position.set(sx, 3.5, sz);
            g.add(pole);

            // Cabeza giratoria
            const head = new THREE.Group();
            head.position.set(sx, 6.5, sz);
            g.add(head);

            const lamp = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 0.5, 8),
                new THREE.MeshStandardMaterial({ color: 0x445588, roughness: 0.2, metalness: 0.9 })
            );
            lamp.rotation.x = Math.PI;
            lamp.position.set(0, 0, 0);
            head.add(lamp);

            const light = new THREE.SpotLight(colors[i], 4, 20, Math.PI * 0.1);
            light.position.set(0, 0, 0.2);
            light.target.position.set(0, -3, 2);
            head.add(light);
            head.add(light.target);

            head.userData.speed = 0.3 + i * 0.1;
            head.userData.angle = (i / 4) * Math.PI * 2;
            this._spots.push(head);
        });
    }

    /* ── NOTAS MUSICALES FLOTANTES ───────────────────────── */
    _buildNoteParticles() {
        const g = this.group;
        this._notes = [];

        const noteSymbols = ['♪', '♫', '♩', '♬'];
        const colors = [0xff44aa, 0x44ddff, 0xffaa44, 0xaa44ff];

        // Crear 12 notas flotantes alrededor de la isla
        for(let i = 0; i < 12; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(noteSymbols[i % noteSymbols.length], 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ 
                map: texture,
                color: colors[i % colors.length],
                transparent: true,
                blending: THREE.AdditiveBlending
            });

            const sprite = new THREE.Sprite(material);
            
            const angle = (i / 12) * Math.PI * 2;
            const radius = 13;
            sprite.position.set(
                Math.cos(angle) * radius,
                3 + Math.random() * 3,
                Math.sin(angle) * radius
            );
            
            sprite.scale.set(0.8, 0.8, 1);
            sprite.userData = {
                angle: angle,
                radius: radius,
                speed: 0.1 + Math.random() * 0.2,
                yOffset: Math.random() * 10,
                scale: 0.8
            };
            
            g.add(sprite);
            this._notes.push(sprite);
        }
    }

    /* ── UPDATE ───────────────────────────────────────────── */
    update(t, carPos, input, lastAction) {
        // Animar pista de baile
        if(this._tiles) {
            this._tiles.forEach((tile, i) => {
                const beat = Math.abs(Math.sin(t * 3 + tile.userData.phase));
                tile.material.emissiveIntensity = 0.2 + beat * 0.8;
                tile.position.y = 1.25 + beat * 0.03;
            });
        }

        // Animar esfera central
        if(this._centerSphere) {
            this._centerSphere.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
        }

        // Animar anillos
        for(let i = 0; i < 3; i++) {
            if(this[`_ring${i}`]) {
                this[`_ring${i}`].rotation.y += 0.01;
            }
        }

        // Animar spots
        if(this._spots) {
            this._spots.forEach(spot => {
                spot.rotation.y += 0.01 * spot.userData.speed;
            });
        }

        // Animar notas musicales
        if(this._notes) {
            this._notes.forEach(note => {
                note.position.y += Math.sin(t * 2 + note.userData.yOffset) * 0.005;
                note.material.rotation += 0.01;
            });
        }

        // Luz de la rocola pulsante
        if(this._jukeboxLight) {
            this._jukeboxLight.intensity = 3 + Math.sin(t * 6) * 1.5;
        }

        // Luz principal de la isla
        if(this._mainLight) {
            this._mainLight.color.setHSL((t * 0.1) % 1, 1, 0.5);
        }

        return super.update(t, carPos, input, lastAction);
    }
}