/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandFaro.js  —  Isla del Faro 🏮
   Posición: Sur del mapa (~5, -65)
   ═══════════════════════════════════════════════════════════ */

class IslandFaro extends IslandBase {
  _buildDecoration() {
    const g   = this.group;
    const col = 0xa8d4a0;

    // ── Torre del faro ────────────────────────────────────
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.9, 5.5, 14),
      new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.6 })
    );
    tower.position.set(0, 3.25, -1.5);
    tower.castShadow = true;
    g.add(tower);

    // Franjas rojas del faro
    for(let i = 0; i < 3; i++){
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.67 - i*0.03, 0.69 - i*0.03, 0.4, 14),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 })
      );
      stripe.position.set(0, 1.0 + i * 1.8, -1.5);
      g.add(stripe);
    }

    // Cabina de la luz
    const cabin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.7, 0.9, 14),
      new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.3, metalness: 0.5 })
    );
    cabin.position.set(0, 6.45, -1.5);
    g.add(cabin);

    // Cúpula
    const dome = new THREE.Mesh(
      new THREE.ConeGeometry(0.82, 0.8, 14),
      new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.3, metalness: 0.6 })
    );
    dome.position.set(0, 7.3, -1.5);
    g.add(dome);

    // ── Luz giratoria del faro ────────────────────────────
    this._beamGroup = new THREE.Group();
    this._beamGroup.position.set(0, 6.45, -1.5);
    g.add(this._beamGroup);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3 })
    );
    this._beamGroup.add(bulb);

    this._faroLight = new THREE.SpotLight(col, 8, 60, Math.PI * 0.06, 0.4);
    this._faroLight.position.set(0, 0, 0);
    this._faroLight.target.position.set(20, 0, 0);
    this._beamGroup.add(this._faroLight);
    this._beamGroup.add(this._faroLight.target);

    const faroGlow = new THREE.PointLight(col, 3, 15);
    faroGlow.position.set(0, 6.5, -1.5);
    g.add(faroGlow);
    this._faroGlow = faroGlow;

    // ── Rocas a los pies ──────────────────────────────────
    [[2.5,0,0.5],[- 2.2,0,1.0],[1.8,0,-2.5],[- 1.5,0,-2.0]].forEach(([rx,ry,rz], i) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4+i*0.1, 0),
        new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 1 })
      );
      rock.position.set(rx, 0.4, rz);
      rock.scale.y = 0.55;
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true;
      g.add(rock);
    });

    console.log('%c🏮 Isla Faro lista', 'color:#a8d4a0');
  }

  update(t, carPos, input, lastAction) {
    // Girar el haz del faro
    if(this._beamGroup) this._beamGroup.rotation.y = t * 0.8;
    if(this._faroLight) this._faroLight.intensity = 6 + Math.sin(t * 2) * 2;
    if(this._faroGlow)  this._faroGlow.intensity  = 2.5 + Math.sin(t * 3) * 0.8;
    return super.update(t, carPos, input, lastAction);
  }
}