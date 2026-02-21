/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandRocola.js  —  Isla de la Rocola 🎵
   Posición: Norte del mapa (~-5, 65)
   ═══════════════════════════════════════════════════════════ */

class IslandRocola extends IslandBase {
  _buildDecoration() {
    const g   = this.group;
    const col = 0xd4a8ff;

    const mb = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.3, metalness: 0.6 });
    const ma = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.5 });
    const mg = new THREE.MeshStandardMaterial({ color: 0x88aaff, roughness: 0, metalness: 1, transparent: true, opacity: 0.5 });

    // Cuerpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.9), mb);
    body.position.set(0, 1.6, 0); body.castShadow = true; g.add(body);

    // Cúpula
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.9, 16, 1, false, 0, Math.PI), mb);
    top.position.set(0, 2.8, 0); top.rotation.z = Math.PI/2; top.rotation.y = Math.PI/2; g.add(top);

    // Pantalla
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.05), mg);
    screen.position.set(0, 2.0, 0.48); g.add(screen);

    // Tiras de luz
    [-0.5, 0, 0.5].forEach(x => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.02), ma);
      s.position.set(x, 1.6, 0.46); g.add(s);
    });

    // Botones
    [[-0.3, 0.9], [0, 0.9], [0.3, 0.9]].forEach(([bx, by]) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10),
        new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0x880022, emissiveIntensity: 0.8 }));
      btn.position.set(bx, by, 0.48); btn.rotation.x = Math.PI/2; g.add(btn);
    });

    // Pista de baile — plataforma de colores
    const TILES = 12;
    const tileColors = [0xff44aa, 0xaa44ff, 0x44aaff, 0xffaa44, 0x44ffaa, 0xff4444];
    this._tiles = [];
    for(let i = 0; i < TILES; i++){
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.06, 1.2),
        new THREE.MeshStandardMaterial({
          color: tileColors[i % tileColors.length],
          emissive: tileColors[i % tileColors.length],
          emissiveIntensity: 0.3,
          roughness: 0.1, metalness: 0.5,
        })
      );
      const tx = ((i % 4) - 1.5) * 1.3;
      const tz = (Math.floor(i / 4) - 1) * 1.3 + 4;
      tile.position.set(tx, 0.4, tz);
      tile.castShadow = tile.receiveShadow = true;
      tile.userData.phase = (i / TILES) * Math.PI * 2;
      g.add(tile);
      this._tiles.push(tile);
    }

    // Luz de la rocola
    const jl = new THREE.PointLight(col, 3, 18);
    jl.position.set(0, 2.5, 1);
    g.add(jl);
    this._jukeboxLight = jl;
    window._jukeboxLight = jl;   // compat con código anterior

    console.log('%c🎵 Isla Rocola lista', 'color:#d4a8ff');
  }

  update(t, carPos, input, lastAction) {
    // Pista de baile parpadeante
    if(this._tiles) this._tiles.forEach(tile => {
      tile.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(t * 3 + tile.userData.phase)) * 0.9;
    });
    if(this._jukeboxLight)
      this._jukeboxLight.intensity = 2.5 + Math.sin(t * 4) * 1.5;
    return super.update(t, carPos, input, lastAction);
  }
}