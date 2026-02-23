/* ═══════════════════════════════════════════════════════════
   Physics/Vehicle.js  —  Física estilo Bruno Simon
   • engineForce / (1 + overflowSpeed)    Bruno: línea exacta
   • brake * brakeAmplitude * dt          Bruno: línea exacta
   • FRICCIÓN LATERAL                     lo que Rapier hace gratis
   • stuck detection + respawn            Bruno: setStuck()
   ═══════════════════════════════════════════════════════════ */

class Vehicle {
  constructor(scene, colliders) {
    this.scene     = scene;
    this.colliders = colliders;

    /* ── Parámetros Bruno Simon ── */
    this.params = {
      engineForceAmplitude: CFG.accel,
      topSpeed:             CFG.speed,
      brakeAmplitude:       CFG.accel * 0.12,
      idleBrake:            0.06,
      reverseBrake:         0.4,
      steeringAmplitude:    0.5,
      lateralDamping:       12.0,
    };

    /* ── Estado ── */
    this.vel          = new THREE.Vector3();
    this.velY         = 0;
    this.yaw          = 0;
    this.steer        = 0;
    this.onGround     = true;
    this.speed        = 0;
    this.xzSpeed      = 0;
    this.goingForward = true;
    this.forwardRatio = 1;

    /* ── Bruno: stop ── */
    this.stop = {
      active: true, lowThreshold: 0.04, highThreshold: 0.7,
      test: () => {
        if      (this.speed < this.stop.lowThreshold)  this.stop.active = true;
        else if (this.speed > this.stop.highThreshold) this.stop.active = false;
      }
    };

    /* ── Bruno: stuck ── */
    this.stuck = {
      durationTest: 3, durationSaved: 0, savedItems: [],
      distance: 0, distanceThreshold: 0.5, active: false,
      accumulate: (traveled, dt) => {
        const s = this.stuck;
        s.savedItems.unshift([traveled, dt]);
        s.distance = 0; s.durationSaved = 0;
        for (let i = 0; i < s.savedItems.length; i++) {
          const item = s.savedItems[i];
          if (s.durationSaved >= s.durationTest) { s.savedItems.splice(i); break; }
          s.distance += item[0]; s.durationSaved += item[1];
        }
      },
      test: () => {
        const s = this.stuck;
        const isStuck = s.durationSaved >= s.durationTest && s.distance < s.distanceThreshold;
        if (isStuck && !s.active)  { s.active = true;  this._onStuck(); }
        if (!isStuck && s.active)    s.active = false;
      }
    };

    /* ── Visuales y helpers ── */
    this.visualRoll = 0;
    this._fwd       = new THREE.Vector3();
    this._right     = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this._rayOrigin = new THREE.Vector3();
    this._rayDown   = new THREE.Vector3(0, -1, 0);

    this._buildMesh();
    console.log('%c🚙 Vehicle — física estilo Bruno Simon', 'color:#ffaa00;font-weight:bold');
  }

  update(dt, t, input) {
    this._updatePrePhysics(dt, input);
    this._updateVertical(dt, input);
    this._updateLateralFriction(dt);
    this._updateCollisions();
    this._checkBounds();
    this._updatePostPhysics(dt, t, input);
  }

  /* ── Bruno: updatePrePhysics ── */
  _updatePrePhysics(dt, input) {
    const p = this.params;

    this.speed = this.vel.length();
    this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));

    this.forwardRatio = this.speed > 0.01 ? this.vel.dot(this._fwd) / this.speed : 1;
    this.goingForward = this.forwardRatio > 0.5;

    // Motor — Bruno: engineForce = accel / (1 + overflowSpeed) * deltaScaled
    const overflowSpeed = Math.max(0, this.speed - p.topSpeed);
    const accelerating  = input.forward ? 1 : input.backward ? -1 : 0;
    let engineForce = accelerating * p.engineForceAmplitude / (1 + overflowSpeed * 0.6) * dt;

    // Freno — Bruno: brake = idleBrake / reverseBrake, luego * brakeAmplitude * dt
    let brake = 0;
    const goingWrong = this.speed > 0.5 && (
      (accelerating > 0 && !this.goingForward) ||
      (accelerating < 0 &&  this.goingForward)
    );
    if (goingWrong)                 { brake = p.reverseBrake; engineForce = 0; }
    else if (Math.abs(accelerating) < 0.1) { brake = p.idleBrake; }

    if (brake > 0) {
      const decay = Math.max(0, 1 - brake * p.brakeAmplitude * dt);
      this.vel.multiplyScalar(decay);
    }

    // Giro — Bruno: steer = steering * steeringAmplitude
    const steerFactor = Math.min(this.speed / 5, 1.0);
    const rawSteer    = input.left ? 1 : input.right ? -1 : 0;
    this.yaw += rawSteer * p.steeringAmplitude * steerFactor * dt * 3.5;
    this.steer += (rawSteer - this.steer) * CFG.steerLerp * dt;

    if (engineForce !== 0) this.vel.addScaledVector(this._fwd, engineForce);
    this.group.position.addScaledVector(this.vel, dt);
  }

  /* ── Fricción lateral (sideFrictionStiffness de Rapier) ── */
  _updateLateralFriction(dt) {
    const lateralVel    = this.vel.dot(this._right);
    const cancelFactor  = Math.min(this.params.lateralDamping * dt, 1.0);
    this.vel.addScaledVector(this._right, -lateralVel * cancelFactor);
  }

  /* ── Gravedad + Salto ── */
_updateVertical(dt, input) {
  const groundY = this._getGroundY(this.group.position.x, this.group.position.z, this.group.position.y);
  
  // Si no hay groundY, usar 0
  const effectiveGroundY = groundY || 0;
  
  if (input.jump && this.onGround) { 
    this.velY = CFG.jumpForce; 
    this.onGround = false; 
  }
  
  this.velY -= CFG.gravity * dt;
  this.group.position.y += this.velY * dt;
  
  // Si está por debajo del suelo, corregir
  if (this.group.position.y <= effectiveGroundY) {
    this.group.position.y = effectiveGroundY;
    
    // Efecto de impacto si cayó fuerte
    if (this.velY < -4) {
      const impact = Math.min(Math.abs(this.velY) / CFG.jumpForce, 1);
      this.group.scale.set(1+impact*0.1, 1-impact*0.15, 1+impact*0.1);
      gsap.to(this.group.scale, { x:1,y:1,z:1, duration:0.28, ease:'elastic.out(1,0.5)' });
    }
    
    this.velY = 0;
    this.onGround = true;
  } else {
    this.onGround = false;
  }
}

  /* ── Colisiones ── */
_updateCollisions() {
  const CAR_R = 0.9;
  
  // IMPORTANTE: Combinar todos los colliders
  // this.colliders viene de World y contiene TODOS los colliders
  // incluyendo los de las letras (window._islandColliders)
  
  for (const col of this.colliders) {
    const dx = this.group.position.x - col.x;
    const dz = this.group.position.z - col.z;
    const d  = Math.sqrt(dx*dx + dz*dz);
    const md = CAR_R + (col.r || 1.0);
    
    if (d < md && d > 0.001) {
      const nx = dx/d, nz = dz/d;
      
      // Separar el carro del obstáculo
      const overlap = md - d;
      this.group.position.x += nx * overlap;
      this.group.position.z += nz * overlap;
      
      // Rebote
      const dot = this.vel.x*nx + this.vel.z*nz;
      if (dot < 0) {
        // Rebote más fuerte para letras
        if (col.isLetter) {
          this.vel.x -= dot * nx * 1.5;
          this.vel.z -= dot * nz * 1.5;
          this.vel.multiplyScalar(0.4); // Más freno al chocar con letras
          
          // Feedback visual (opcional)
          this.group.scale.set(1.1, 0.9, 1.1);
          setTimeout(() => this.group.scale.set(1,1,1), 150);
          
          console.log('%c💥 Chocaste con una letra!', 'color:#ff3366');
        } else {
          this.vel.x -= dot * nx * 1.3;
          this.vel.z -= dot * nz * 1.3;
          this.vel.multiplyScalar(0.6);
        }
        
        // Sonido
        if (typeof gameAudio !== 'undefined') {
          gameAudio.collision(Math.min(Math.abs(dot) * 2, 1));
        }
      }
    }
  }
  
  // Eliminamos la parte de window._wallColliders porque ya no la necesitamos
}

  /* ── Bruno: updatePostPhysics ── */
  _updatePostPhysics(dt, t, input) {
    const accelerating = input.forward ? 1 : input.backward ? -1 : 0;
    if (Math.abs(accelerating) > 0.5) this.stuck.accumulate(this.vel.length()*dt, dt);
    this.stop.test();
    this.stuck.test();
    this.xzSpeed = Math.hypot(this.vel.x, this.vel.z);

    const speedRatio = Math.min(this.speed / this.params.topSpeed, 1);
    const targetRoll = -this.steer * speedRatio * 0.07;
    this.visualRoll  += (targetRoll - this.visualRoll) * 8 * dt;
    this.group.rotation.y = this.yaw;
    this.group.rotation.z = this.visualRoll;

    if (this.onGround && this.speed > 0.5)
      this.group.position.y += Math.sin(t * this.speed * 0.9) * 0.003 * speedRatio;

    const velFwd = this.vel.dot(this._fwd);
    this.wheelMeshes.forEach(w => { w.rotation.x -= velFwd * dt * 1.4; });
    this.frontPivots.forEach(p => { p.rotation.y += (this.steer*0.38 - p.rotation.y) * 10 * dt; });

    this.carGlow.intensity = 0.3 + speedRatio * 2.5;
    this.carGlow.color.setHSL(0.54 + Math.sin(t*1.5)*0.06, 1, 0.55);
  }

  /* ── Bruno: stuck respawn ── */
  _onStuck() {
    this.vel.set(0, 0, 0); this.velY = 4;
    gsap.to(this.group.scale, {
      x:0.85, y:0.85, z:0.85, duration:0.15, yoyo:true, repeat:3,
      onComplete: () => { this.group.scale.set(1,1,1); }
    });
    setTimeout(() => { this.stuck.active = false; this.stuck.savedItems = []; }, 1800);
  }


  /* ── Límites del mundo ── */
_checkBounds() {
  const pos = this.group.position;
  const LIMIT = 120; // Radio máximo desde el centro (ajustable)
  
  // Calcular distancia desde el centro (0,0)
  const distance = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
  
  if (distance > LIMIT) {
    // Dirección desde el centro hacia el carro
    const angle = Math.atan2(pos.z, pos.x);
    // Posición en el borde
    pos.x = Math.cos(angle) * LIMIT;
    pos.z = Math.sin(angle) * LIMIT;
    
    // Rebote: invertir velocidad radial
    const radialVel = this.vel.x * Math.cos(angle) + this.vel.z * Math.sin(angle);
    if (radialVel > 0) {
      this.vel.x -= 2 * radialVel * Math.cos(angle);
      this.vel.z -= 2 * radialVel * Math.sin(angle);
      this.vel.multiplyScalar(0.5); // Pérdida de energía
    }
    
    // Feedback visual
    this.group.scale.set(1.1, 0.9, 1.1);
    setTimeout(() => this.group.scale.set(1,1,1), 150);
    
    // Sonido de impacto
    if (typeof gameAudio !== 'undefined') {
      gameAudio.collision(0.8);
    }
  }
}

_getGroundY(x, z, carY) {
  this._rayOrigin.set(x, carY + 2, z);
  this._raycaster.set(this._rayOrigin, this._rayDown);

  let groundY = 0;

  // 1. PRIMERO: Usar groundColliders (más rápido y preciso)
  if (window._groundColliders && Array.isArray(window._groundColliders)) {
    for (const col of window._groundColliders) {
      const dx = x - col.x;
      const dz = z - col.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < col.r) {
        groundY = Math.max(groundY, col.y);
      }
    }
  }

  // 2. SEGUNDO: Raycast contra discos de plataformas (backup)
  if (window._islandColliders && Array.isArray(window._islandColliders)) {
    try {
      const meshColliders = window._islandColliders.filter(c => c && c.isMesh === true);
      if (meshColliders.length > 0) {
        const hits = this._raycaster.intersectObjects(meshColliders);
        if (hits.length > 0) {
          let highestHit = null;
          hits.forEach(hit => {
            if (!highestHit || hit.point.y > highestHit.point.y) {
              highestHit = hit;
            }
          });
          if (highestHit && highestHit.point.y <= carY + 2) {
            groundY = Math.max(groundY, highestHit.point.y);
          }
        }
      }
    } catch (e) {}
  }

  // 3. TERCERO: Raycast contra la pista
  if (window._trackCollision && window._trackCollision.isMesh) {
    try {
      const hits = this._raycaster.intersectObject(window._trackCollision);
      if (hits.length > 0 && hits[0].point.y <= carY + 0.8) {
        groundY = Math.max(groundY, hits[0].point.y);
      }
    } catch (e) {}
  }
  
  return groundY;
}

  _buildMesh() {
    this.group = new THREE.Group();
    this.scene.add(this.group);
    const C = { body:0x8b1a1a, body2:0x5a0f0f, dark:0x111118, chrome:0xb0b8c8, amber:0xffaa00, amberG:0xff8800, rubber:0x0d0d12, glass:0x0a1a2e, accent:0xff3300 };
    const M  = (c,r=0.4,m=0,e=0,ei=0) => new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e,emissiveIntensity:ei});
    const MT = (c,op=0.5) => new THREE.MeshStandardMaterial({color:c,transparent:true,opacity:op,roughness:0.05,metalness:0.3});
    const g  = this.group;

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.22,4.0),M(C.body2,0.6,0.1)); chassis.position.y=0.5; chassis.castShadow=true; g.add(chassis);
    const skid = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.06,1.1),M(C.chrome,0.3,0.85)); skid.position.set(0,0.39,-1.55); g.add(skid);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.95,0.72,3.6),M(C.body,0.35,0.08)); body.position.y=0.97; body.castShadow=true; g.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.14,1.45),M(C.body2,0.4,0.1)); hood.position.set(0,1.34,-1.0); hood.castShadow=true; g.add(hood);
    const hoodBulge = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.1,1.3),M(C.dark,0.5,0.05)); hoodBulge.position.set(0,1.42,-1.0); g.add(hoodBulge);
    for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.02,0.06),M(0x222228,0.8));s.position.set(0,1.475,-1.35+i*0.2);g.add(s);}
    const roof=new THREE.Mesh(new THREE.BoxGeometry(1.88,0.1,1.7),M(C.dark,0.4,0.05)); roof.position.set(0,1.83,0.25); roof.castShadow=true; g.add(roof);
    [[-1.06,-0.85],[1.06,-0.85],[-1.06,0.88],[1.06,0.88]].forEach(([x,z])=>{const f=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.35,1.05),M(C.dark,0.55,0.05));f.position.set(x,0.78,z);f.castShadow=true;g.add(f);});
    [-0.85,0.85].forEach(x=>{const p=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.75,0.07),M(C.dark,0.3,0.4));p.position.set(x,1.56,0.78);g.add(p);});
    const rollTop=new THREE.Mesh(new THREE.BoxGeometry(1.72,0.07,0.07),M(C.dark,0.3,0.4)); rollTop.position.set(0,1.93,0.78); g.add(rollTop);
    const rd=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.8),M(C.dark,0.3,0.4)); rd.position.set(0,1.74,0.4); rd.rotation.x=0.55; g.add(rd);
    const ws=new THREE.Mesh(new THREE.BoxGeometry(1.75,0.6,0.07),MT(C.glass,0.5)); ws.position.set(0,1.56,-0.22); ws.rotation.x=0.2; g.add(ws);
    const wsF=new THREE.Mesh(new THREE.BoxGeometry(1.82,0.65,0.04),M(C.dark,0.4,0.1)); wsF.position.set(0,1.56,-0.19); wsF.rotation.x=0.2; g.add(wsF);
    [-0.99,0.99].forEach(x=>{const w=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.38,0.85),MT(C.glass,0.4));w.position.set(x,1.56,0.3);g.add(w);});
    const bump=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.28,0.15),M(C.dark,0.4,0.15)); bump.position.set(0,0.56,-2.08); bump.castShadow=true; g.add(bump);
    [[-0.7],[0.7]].forEach(([x])=>{const p=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.42,0.22),M(C.dark,0.45,0.1));p.position.set(x,0.58,-2.04);g.add(p);});
    [[-0.88],[0.88]].forEach(([x])=>{const h=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.25,8),M(C.chrome,0.3,0.8));h.rotation.x=Math.PI/2;h.position.set(x,0.42,-2.18);g.add(h);});

    const WHEEL_R=0.52, WHEEL_W=0.38;
    this.wheelMeshes=[]; this.frontPivots=[];
    const buildWheel=()=>{
      const wg=new THREE.Group(); wg.rotation.z=Math.PI/2;
      const tire=new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,WHEEL_W,28),M(C.rubber,0.95)); tire.castShadow=true; wg.add(tire);
      for(let b=0;b<5;b++){const band=new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R+0.012,WHEEL_R+0.012,0.032,24),M(0x0a0a10,0.98));band.position.y=-WHEEL_W*0.35+b*(WHEEL_W*0.18);wg.add(band);}
      for(let i=0;i<6;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(0.055,WHEEL_R*0.78,0.045),M(C.chrome,0.2,0.9));sp.rotation.z=(i/6)*Math.PI*2;wg.add(sp);}
      wg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,WHEEL_W+0.01,12),M(C.chrome,0.2,0.95)));
      wg.add(new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R*0.58,0.018,8,24),M(C.amber,0.15,0.2,C.amber,0.5)));
      for(let i=0;i<6;i++){const nt=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.06,6),M(C.chrome,0.2,0.9));const a=(i/6)*Math.PI*2;nt.position.set(Math.cos(a)*0.16,WHEEL_W*0.52,Math.sin(a)*0.16);wg.add(nt);}
      return wg;
    };
    [[1.18,-1.28],[-1.18,-1.28]].forEach(([x,z])=>{const pv=new THREE.Group();pv.position.set(x,WHEEL_R,z);const wg=buildWheel();pv.add(wg);g.add(pv);this.frontPivots.push(pv);this.wheelMeshes.push(wg);});
    [[1.18,1.28],[-1.18,1.28]].forEach(([x,z])=>{const wg=buildWheel();wg.position.set(x,WHEEL_R,z);g.add(wg);this.wheelMeshes.push(wg);});

    [-0.63,0.63].forEach(x=>{
      const fb=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.26,0.1),M(C.dark,0.3,0.15)); fb.position.set(x,1.0,-2.07); g.add(fb);
      const fl2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,0.05),M(C.amber,0.05,0.1,C.amber,3.5)); fl2.position.set(x,1.0,-2.11); g.add(fl2);
      const sl=new THREE.SpotLight(0xffcc44,6,22,Math.PI*0.13,0.55); sl.position.set(x,1.0,-2.2); sl.target.position.set(x*0.4,0,-14); g.add(sl); g.add(sl.target);
      const hl=new THREE.PointLight(C.amberG,1.2,4.5); hl.position.set(x,1.0,-2.15); g.add(hl);
    });
    const ab=new THREE.Mesh(new THREE.BoxGeometry(1.26,0.055,0.04),M(C.accent,0.1,0.1,C.accent,4.0)); ab.position.set(0,0.82,-2.1); g.add(ab);
    const lc=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.14,0.18),M(C.dark,0.35,0.2)); lc.position.set(0,2.0,-0.22); g.add(lc);
    for(let i=0;i<4;i++){
      const cl=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.1,0.06),M(C.amber,0.05,0.05,C.amber,4.5)); cl.position.set(-0.45+i*0.3,2.0,-0.32); g.add(cl);
      const sl2=new THREE.SpotLight(0xffcc44,2.5,18,Math.PI*0.12,0.6); sl2.position.set(-0.45+i*0.3,2.0,-0.36); sl2.target.position.set((-0.45+i*0.3)*0.3,0,-12); g.add(sl2); g.add(sl2.target);
    }
    [-0.65,0.65].forEach(x=>{
      const rl=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.14,0.04),M(0xff1100,0.1,0.05,0xff1100,2.0)); rl.position.set(x,0.98,2.08); g.add(rl);
      const rp=new THREE.PointLight(0xff2200,1.2,5); rp.position.set(x,0.98,2.2); g.add(rp);
    });
    this.carGlow=new THREE.PointLight(0xff6600,0,7); this.carGlow.position.set(0,0.1,0); g.add(this.carGlow);
  }
}