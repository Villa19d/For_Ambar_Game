/* ═══════════════════════════════════════════════════════════
   World/Track.js  —  Pista de carreras
   ═══════════════════════════════════════════════════════════ */

class Track {
  constructor(scene) {
    this.scene = scene;
    this._build();
  }

  _build() {
    const trackPoints = [
      new THREE.Vector3(-35,0.1,30),  new THREE.Vector3(-40,0.1,10),
      new THREE.Vector3(-38,1.2,-5),  new THREE.Vector3(-35,3.2,-10),
      new THREE.Vector3(-30,2.5,-15), new THREE.Vector3(-20,1.0,-20),
      new THREE.Vector3(0,0.1,-25),   new THREE.Vector3(15,0.8,-15),
      new THREE.Vector3(25,0.1,0),    new THREE.Vector3(30,3.5,15),
      new THREE.Vector3(20,0.1,25),   new THREE.Vector3(0,0.1,30),
      new THREE.Vector3(-20,0.5,28),  new THREE.Vector3(-35,0.1,30),
    ];

    const curve = new THREE.CatmullRomCurve3(trackPoints, true);
    const SEGMENTS = 400, TRACK_W = 8.5;
    window._trackCurve = curve;

    // ── Colisión invisible ─────────────────────────────────
    const colPos = [], colIdx = [];
    for(let i = 0; i <= SEGMENTS; i++){
      const t  = i / SEGMENTS, p = curve.getPoint(t);
      const pN = curve.getPoint((i+1)/SEGMENTS);
      const tan  = new THREE.Vector3().subVectors(pN, p).normalize();
      const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const cW = TRACK_W - 1.0;
      const L = p.clone().addScaledVector(norm, -cW*0.5);
      const R = p.clone().addScaledVector(norm,  cW*0.5);
      colPos.push(L.x,p.y-0.2,L.z, R.x,p.y-0.2,R.z, L.x,p.y,L.z, R.x,p.y,R.z);
      if(i < SEGMENTS){ const b=i*4; colIdx.push(b,b+1,b+2, b+1,b+3,b+2, b+2,b+3,b+6, b+3,b+7,b+6); }
    }
    const colGeo = new THREE.BufferGeometry();
    colGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(colPos), 3));
    colGeo.setIndex(colIdx); colGeo.computeVertexNormals();
    const colMesh = new THREE.Mesh(colGeo, new THREE.MeshStandardMaterial({ visible: false }));
    this.scene.add(colMesh);
    window._trackCollision = colMesh;

    // ── Visual ────────────────────────────────────────────
    const vPos=[],vUV=[],vIdx=[];
    for(let i=0;i<=SEGMENTS;i++){
      const t=i/SEGMENTS, p=curve.getPoint(t), pN=curve.getPoint((i+1)/SEGMENTS);
      const tan=new THREE.Vector3().subVectors(pN,p).normalize();
      const norm=new THREE.Vector3(-tan.z,0,tan.x).normalize();
      const L=p.clone().addScaledVector(norm,-TRACK_W*0.5);
      const R=p.clone().addScaledVector(norm, TRACK_W*0.5);
      L.y=p.y+0.02; R.y=p.y+0.02;
      vPos.push(L.x,L.y,L.z, R.x,R.y,R.z); vUV.push(0,i*0.4,1,i*0.4);
      if(i<SEGMENTS){const b=i*2; vIdx.push(b,b+1,b+2,b+1,b+3,b+2);}
    }
    const vGeo=new THREE.BufferGeometry();
    vGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vPos),3));
    vGeo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(vUV),2));
    vGeo.setIndex(vIdx); vGeo.computeVertexNormals();
    const vMesh=new THREE.Mesh(vGeo,new THREE.MeshStandardMaterial({
      color:0xe83a6f, roughness:0.6, metalness:0.05, emissive:0x3a0f1a, emissiveIntensity:0.15
    }));
    vMesh.receiveShadow=true; this.scene.add(vMesh);
    window._trackMesh = vMesh;

    // ── Topes a cuadros ──────────────────────────────────
    [-0.52, 0.52].forEach((side, si) => {
      for(let i=0;i<200;i++){
        if(i%3===0) continue;
        const t=i/200, p=curve.getPoint(t), pN=curve.getPoint((i+0.02)/200);
        const tan=new THREE.Vector3().subVectors(pN,p).normalize();
        const norm=new THREE.Vector3(-tan.z,0,tan.x).normalize();
        const pos=p.clone().addScaledVector(norm,side*(TRACK_W*0.5+0.3));
        pos.y=p.y+0.08;
        const curb=new THREE.Mesh(
          new THREE.BoxGeometry(1.2,0.15,1.2),
          new THREE.MeshStandardMaterial({color:(i+si)%2===0?0xffffff:0xc41e3a, roughness:0.5})
        );
        curb.position.copy(pos); curb.rotation.y=Math.atan2(tan.x,tan.z);
        curb.castShadow=curb.receiveShadow=true; this.scene.add(curb);
      }
    });

    console.log('%c🏁 Track listo', 'color:#e83a6f;font-weight:bold');
  }
}