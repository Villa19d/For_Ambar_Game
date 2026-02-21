/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandCofre.js  —  Isla del Cofre 🗝️
   Posición: SW del mapa (~-55, -40)
   ═══════════════════════════════════════════════════════════ */

class IslandCofre extends IslandBase {
  _buildDecoration() {
    const g = this.group;
    const gold = 0xc9963c;

    // ── Cofre ────────────────────────────────────────────
    const chestBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.9, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x3d1f08, roughness: 0.7, metalness: 0.1 })
    );
    chestBase.position.set(-1.5, 0.8, 0.5);
    chestBase.castShadow = true;
    g.add(chestBase);

    // Tapa del cofre (abierta)
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.65 })
    );
    lid.position.set(-1.5, 1.6, 0.0);
    lid.rotation.x = -0.7;  // abierta
    lid.castShadow = true;
    g.add(lid);

    // Herrajes dorados del cofre
    [[-0.7, 0], [0, 0], [0.7, 0]].forEach(([bx, bz]) => {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.95, 1.05),
        new THREE.MeshStandardMaterial({ color: gold, roughness: 0.2, metalness: 0.9 })
      );
      band.position.set(-1.5 + bx, 0.8, 0.5);
      g.add(band);
    });

    // Destello de luz del cofre
    const cl = new THREE.PointLight(gold, 3, 8);
    cl.position.set(-1.5, 1.5, 0.5);
    g.add(cl);
    this._chestLight = cl;

    // ── Monedas esparcidas ────────────────────────────────
    const coinPositions = [
      [-0.5,0.4,1.2],[-0.2,0.4,0.8],[0.1,0.4,1.4],
      [0.5,0.4,0.6],[0.8,0.4,1.0],[-0.8,0.4,0.4],
    ];
    coinPositions.forEach(([cx,cy,cz]) => {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12),
        new THREE.MeshStandardMaterial({ color: gold, roughness: 0.1, metalness: 0.95, emissive: gold, emissiveIntensity: 0.3 })
      );
      coin.position.set(cx, cy, cz);
      coin.rotation.x = Math.random() * 0.5;
      coin.rotation.z = Math.random() * Math.PI;
      coin.castShadow = true;
      g.add(coin);
    });

    // ── Bandera pirata estilo lo-fi ───────────────────────
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.8 })
    );
    pole.position.set(2.5, 1.75, -1.0);
    g.add(pole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.75, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, emissive: 0x111111, emissiveIntensity: 0.2 })
    );
    flag.position.set(3.1, 3.1, -1.0);
    g.add(flag);

    console.log('%c🗝️ Isla Cofre lista', 'color:#c9963c');
  }

  update(t, carPos, input, lastAction) {
    // Pulsar la luz del cofre
    if(this._chestLight)
      this._chestLight.intensity = 2.5 + Math.sin(t * 3.5) * 1.2;
    return super.update(t, carPos, input, lastAction);
  }
}