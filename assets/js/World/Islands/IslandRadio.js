/* ═══════════════════════════════════════════════════════════
   World/Islands/IslandRadio.js  —  Isla de la Radio 📻
   Posición: SE del mapa (~55, -35)
   ═══════════════════════════════════════════════════════════ */

class IslandRadio extends IslandBase {
  _buildDecoration() {
    const g   = this.group;
    const col = 0xe8714a;

    // ── Radio retro grande ────────────────────────────────
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.4, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.3, metalness: 0.5 })
    );
    body.position.set(1.5, 1.1, -0.5);
    body.castShadow = true;
    g.add(body);

    // Altavoces (rejilla)
    const speaker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.6, metalness: 0.3 })
    );
    speaker.rotation.x = Math.PI / 2;
    speaker.position.set(0.8, 1.1, -0.06);
    g.add(speaker);

    const speaker2 = speaker.clone();
    speaker2.position.set(2.2, 1.1, -0.06);
    g.add(speaker2);

    // Pantalla (dial)
    const dial = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.1 })
    );
    dial.position.set(1.5, 1.35, -0.07);
    g.add(dial);

    // Antena
    const ant1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 2.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.3, metalness: 0.9 })
    );
    ant1.position.set(2.5, 2.55, -0.5);
    ant1.rotation.z = 0.25;
    g.add(ant1);

    const ant2 = ant1.clone();
    ant2.position.set(0.5, 2.55, -0.5);
    ant2.rotation.z = -0.25;
    g.add(ant2);

    // ── Notas musicales flotantes ─────────────────────────
    const noteGeo = new THREE.SphereGeometry(0.08, 6, 4);
    const noteMat = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 1.2, roughness: 0.1
    });
    this._notes = [];
    for(let i = 0; i < 8; i++){
      const n = new THREE.Mesh(noteGeo, noteMat);
      n.position.set(
        1.5 + (Math.random()-0.5)*3,
        2.0 + Math.random()*2.5,
        -0.5 + (Math.random()-0.5)*2
      );
      n.userData.baseY   = n.position.y;
      n.userData.phase   = Math.random() * Math.PI * 2;
      n.userData.speed   = 0.4 + Math.random() * 0.5;
      n.userData.driftX  = (Math.random()-0.5)*0.015;
      g.add(n);
      this._notes.push(n);
    }

    // Luz de la radio
    const rLight = new THREE.PointLight(col, 2.5, 12);
    rLight.position.set(1.5, 2, -0.5);
    g.add(rLight);
    this._radioLight = rLight;

    console.log('%c📻 Isla Radio lista', 'color:#e8714a');
  }

  update(t, carPos, input, lastAction) {
    // Notas flotantes
    if(this._notes) this._notes.forEach(n => {
      n.position.y = n.userData.baseY + Math.sin(t * n.userData.speed + n.userData.phase) * 0.4;
      n.position.x += n.userData.driftX;
      if(Math.abs(n.position.x - 1.5) > 2.5) n.userData.driftX *= -1;
    });
    if(this._radioLight)
      this._radioLight.intensity = 2.0 + Math.sin(t * 4.5) * 1.0;
    return super.update(t, carPos, input, lastAction);
  }
}