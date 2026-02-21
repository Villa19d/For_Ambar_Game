/* ═══════════════════════════════════════════════════════════
   World/Ground.js  —  Suelo con vertex colors
   ═══════════════════════════════════════════════════════════ */

class Ground {
  constructor(scene) {
    this.scene = scene;
    this._build();
  }

  _build() {
    const SIZE = 500, SEG = 100;
    const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);

    const count  = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const pos    = geo.attributes.position.array;

    const palette = [
      [0.72, 0.25, 0.06],
      [0.85, 0.38, 0.10],
      [0.78, 0.30, 0.07],
      [0.65, 0.22, 0.05],
      [0.90, 0.45, 0.14],
    ];

    for(let i = 0; i < count; i++){
      const x = pos[i * 3], z = pos[i * 3 + 2];
      const n = (
        Math.sin(x * 0.09 + z * 0.07) * 0.5 + 0.5 +
        Math.sin(x * 0.17 - z * 0.13) * 0.25 +
        Math.cos(x * 0.05 + z * 0.11) * 0.25
      );
      const idx  = Math.abs(Math.floor(n * 2.5)) % palette.length;
      const idx2 = (idx + 1) % palette.length;
      const t    = (n * 2.5) % 1;
      const c1 = palette[idx], c2 = palette[idx2];
      colors[i*3]   = c1[0] + (c2[0]-c1[0]) * t;
      colors[i*3+1] = c1[1] + (c2[1]-c1[1]) * t;
      colors[i*3+2] = c1[2] + (c2[2]-c1[2]) * t;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.95, metalness: 0.0,
    }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Horizonte oscuro
    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.MeshStandardMaterial({ color: 0x0a0414, roughness: 1 })
    );
    horizon.rotation.x = -Math.PI / 2;
    horizon.position.y = -0.5;
    this.scene.add(horizon);

    console.log('%c🌍 Ground listo', 'color:#e05020');
  }

  // Sin update — el suelo no se anima
}