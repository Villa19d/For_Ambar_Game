/* ═══════════════════════════════════════════════════════════
   World/Foliage.js  —  Árboles, rocas, pasto, viento, polvo
   Se instancia desde World.js y comparte colliders con Vehicle
   ═══════════════════════════════════════════════════════════ */

class Foliage {
  constructor(scene, colliders) {
    this.scene     = scene;
    this.colliders = colliders;   // ref compartida con Vehicle
    this._trees    = [];

    this._buildTrees();
    this._buildWind();
    this._buildGrass();
  }

  /* ─── ÁRBOLES + ROCAS ──────────────────────────────────── */
  _buildTrees() {
    const isOnTrack = (x, z, margin=5) => {
      if(!window._trackCurve) return false;
      for(let i=0;i<=100;i++){
        const p=window._trackCurve.getPoint(i/100);
        if(Math.hypot(p.x-x,p.z-z)<margin) return true;
      }
      return false;
    };
    const getPos = (margin=5, tries=200) => {
      for(let i=0;i<tries;i++){
        const a=Math.random()*Math.PI*2, rad=14+Math.random()*55;
        const x=Math.cos(a)*rad, z=Math.sin(a)*rad;
        if(!isOnTrack(x,z,margin)) return {x,z,valid:true};
      }
      return {x:999,z:999,valid:false};
    };

    for(let i=0;i<40;i++){const p=getPos(5); if(p.valid) this._makeTree(p.x,p.z,0.8+Math.random()*0.8);}
    for(let i=0;i<16;i++){const p=getPos(5.5); if(p.valid) this._makeRock(p.x,p.z,0.7+Math.random()*0.8);}

    // Árboles cerca de cada isla (para decorarlas)
    const islandPos = [
      {x:-55,z:-40},{x:55,z:-35},{x:5,z:-65},{x:-5,z:65},{x:70,z:55}
    ];
    islandPos.forEach(({x,z}) => {
      for(let j=0;j<3;j++){
        const a=Math.random()*Math.PI*2;
        this._makeTree(x+Math.cos(a)*6, z+Math.sin(a)*6, 1.0+Math.random()*0.5);
      }
    });
  }

  _makeTree(x, z, s=1, type=-1) {
    const kind = type>=0 ? type : Math.floor(Math.random()*4);
    const g    = new THREE.Group();
    g.position.set(x,0,z);
    g.userData.windPhase = Math.random()*Math.PI*2;
    g.userData.windSpeed = 0.6+Math.random()*0.8;
    g.userData.treeScale = s;

    const trunkColor=[0x5c2e08,0x3a2208,0x6b2a10,0x4a3010][kind];
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.14*s,0.22*s,(1.4+kind*0.3)*s,7),
      new THREE.MeshStandardMaterial({color:trunkColor,roughness:0.95}));
    trunk.position.y=(0.7+kind*0.15)*s; trunk.castShadow=true; g.add(trunk);

    const treeDefs=[
      ()=>{
        const cols=[0xdd6611,0xe07720,0xcc5500,0xf08830];
        [{ry:2.1,rs:1.4,dx:0,dz:0},{ry:2.6,rs:1.0,dx:0.8,dz:0.3},{ry:2.4,rs:0.9,dx:-0.7,dz:0.2},{ry:3.1,rs:0.75,dx:0.1,dz:-0.5}]
        .forEach(({ry,rs,dx,dz},i)=>{
          const l=new THREE.Mesh(new THREE.SphereGeometry(rs*s,7,5),new THREE.MeshStandardMaterial({color:cols[i],roughness:0.8,emissive:cols[i],emissiveIntensity:0.05}));
          l.position.set(dx*s,ry*s,dz*s); l.castShadow=true; g.add(l);
        });
      },
      ()=>{
        [[0,1.5,1.6],[0,2.8,1.2],[0,3.8,0.85]].forEach(([dx,ry,rs])=>{
          const c=new THREE.Mesh(new THREE.ConeGeometry(rs*s,2.0*s,7),new THREE.MeshStandardMaterial({color:0x224422,roughness:0.85,emissive:0x112211,emissiveIntensity:0.08}));
          c.position.set(dx*s,ry*s,0); c.castShadow=true; g.add(c);
        });
      },
      ()=>{
        const cols=[0xff44aa,0xcc2288,0xff66cc,0xee3399];
        [{ry:1.8,rs:1.6,dx:0,dz:0},{ry:2.2,rs:1.1,dx:0.9,dz:0},{ry:2.2,rs:1.1,dx:-0.9,dz:0},{ry:2.5,rs:0.9,dx:0,dz:0.8}]
        .forEach(({ry,rs,dx,dz},i)=>{
          const l=new THREE.Mesh(new THREE.SphereGeometry(rs*s,6,5),new THREE.MeshStandardMaterial({color:cols[i],roughness:0.75,emissive:cols[i],emissiveIntensity:0.08}));
          l.position.set(dx*s,ry*s,dz*s); l.castShadow=true; g.add(l);
        });
      },
      ()=>{
        const cols=[0xddaa00,0xffcc22,0xcc9900,0xeebb11];
        [{ry:2.0,rw:2.4,rh:1.8,dx:0,dz:0},{ry:3.2,rw:1.8,rh:1.4,dx:0.3,dz:0.2},{ry:2.6,rw:1.4,rh:1.2,dx:-0.5,dz:0.3}]
        .forEach(({ry,rw,rh,dx,dz},i)=>{
          const l=new THREE.Mesh(new THREE.BoxGeometry(rw*s,rh*s,rw*s*0.85),new THREE.MeshStandardMaterial({color:cols[i],roughness:0.8,emissive:cols[i],emissiveIntensity:0.06}));
          l.position.set(dx*s,ry*s,dz*s); l.rotation.y=Math.random()*Math.PI; l.castShadow=true; g.add(l);
        });
      },
    ];
    treeDefs[kind]();

    const LN=18, lPos=new Float32Array(LN*3), lData=[];
    for(let i=0;i<LN;i++){
      const a=Math.random()*Math.PI*2, r=0.5+Math.random()*1.8*s;
      lPos[i*3]=Math.cos(a)*r; lPos[i*3+1]=1.5*s+Math.random()*2.5*s; lPos[i*3+2]=Math.sin(a)*r;
      lData.push({angle:a,radius:r,speed:0.3+Math.random()*0.5,yOff:Math.random()*Math.PI*2});
    }
    const lGeo=new THREE.BufferGeometry();
    lGeo.setAttribute('position',new THREE.BufferAttribute(lPos,3));
    const leafColSets=[[0xffaa44,0xff8822,0xffcc66,0xff6633],[0x44ff88,0x22dd66,0x55ee99,0x33cc77],[0xff88cc,0xff44aa,0xffaadd,0xee3399],[0xffdd22,0xffbb00,0xffee55,0xddaa00]];
    const lPts=new THREE.Points(lGeo,new THREE.PointsMaterial({
      color:leafColSets[kind][Math.floor(Math.random()*4)],
      size:0.18*s, sizeAttenuation:true, transparent:true, opacity:0.85, depthWrite:false,
    }));
    g.add(lPts);
    g.userData.leafPts=lPts; g.userData.leafData=lData;

    this.scene.add(g);
    this._trees.push(g);
    this.colliders.push({x,z,r:(kind===1?0.3:0.5)*s});
    return g;
  }

  _makeRock(x, z, s=1) {
    const g=new THREE.Group(); g.position.set(x,0,z);
    const cols=[0x7a6a55,0x6a5a8a,0x8a7060,0x5a6a7a];
    const r=new THREE.Mesh(new THREE.DodecahedronGeometry(0.6*s,0),
      new THREE.MeshStandardMaterial({color:cols[Math.floor(Math.random()*cols.length)],roughness:1,metalness:0.05}));
    r.scale.y=0.5; r.rotation.y=Math.random()*Math.PI; r.position.y=0.18*s; r.castShadow=r.receiveShadow=true;
    const r2=new THREE.Mesh(new THREE.DodecahedronGeometry(0.3*s,0),r.material.clone());
    r2.scale.y=0.55; r2.rotation.y=Math.random()*Math.PI; r2.position.set(0.5*s,0.1*s,0.3*s);
    g.add(r); g.add(r2); this.scene.add(g);
    this.colliders.push({x,z,r:0.55*s});
  }

  /* ─── VIENTO + POLVO ───────────────────────────────────── */
  _buildWind() {
    const WN=200, wPos=new Float32Array(WN*3);
    this._windSpd=[];
    for(let i=0;i<WN;i++){
      wPos[i*3]=(Math.random()-0.5)*120; wPos[i*3+1]=Math.random()*3; wPos[i*3+2]=(Math.random()-0.5)*120;
      this._windSpd.push(0.5+Math.random()*1.5);
    }
    const wGeo=new THREE.BufferGeometry();
    wGeo.setAttribute('position',new THREE.BufferAttribute(wPos,3));
    this._windPts=new THREE.Points(wGeo,new THREE.PointsMaterial({color:0xddccaa,size:0.12,sizeAttenuation:true,transparent:true,opacity:0.45,depthWrite:false}));
    this.scene.add(this._windPts);

    const DN=200, dPos=new Float32Array(DN*3);
    for(let i=0;i<DN;i++){dPos[i*3]=(Math.random()-0.5)*100;dPos[i*3+1]=Math.random()*14;dPos[i*3+2]=(Math.random()-0.5)*100;}
    const dGeo=new THREE.BufferGeometry();
    dGeo.setAttribute('position',new THREE.BufferAttribute(dPos,3));
    this._dustPts=new THREE.Points(dGeo,new THREE.PointsMaterial({color:0xc9963c,size:0.06,sizeAttenuation:true,transparent:true,opacity:0.4,depthWrite:false}));
    this.scene.add(this._dustPts);
  }

  /* ─── PASTO ─────────────────────────────────────────────── */
  _buildGrass() {
    const spawnGlb = (model) => {
      model.traverse(c => {
        if(!c.isMesh) return;
        c.castShadow=false; c.receiveShadow=true;
        if(c.material){c.material.side=THREE.DoubleSide;c.material.alphaTest=0.2;}
      });
      let placed=0;
      for(let att=0;att<1800&&placed<GRASS_CFG.COUNT;att++){
        const a=Math.random()*Math.PI*2, rad=10+Math.random()*60;
        const x=Math.cos(a)*rad, z=Math.sin(a)*rad;
        let onTrack=false;
        if(window._trackCurve){
          for(let i=0;i<=60;i++){
            const p=window._trackCurve.getPoint(i/60);
            if(Math.hypot(p.x-x,p.z-z)<5){onTrack=true;break;}
          }
        }
        if(!onTrack){
          const clone=model.clone();
          clone.position.set(x,0,z); clone.rotation.y=Math.random()*Math.PI*2;
          const sc=GRASS_CFG.MIN_SCALE+Math.random()*(GRASS_CFG.MAX_SCALE-GRASS_CFG.MIN_SCALE);
          clone.scale.setScalar(sc); this.scene.add(clone); placed++;
        }
      }
      console.log(`%c🌿 ${placed} mechones de pasto (GLB)`, 'color:#4a8c2a');
    };

    const fallback = () => {
      const geo=new THREE.BufferGeometry();
      const v=new Float32Array([-0.3,0,0.3,0.3,0,-0.3,0.3,0.8,-0.3,-0.3,0,0.3,0.3,0.8,-0.3,-0.3,0.8,0.3,-0.3,0,-0.3,0.3,0,0.3,0.3,0.8,0.3,-0.3,0,-0.3,0.3,0.8,0.3,-0.3,0.8,-0.3]);
      const uv=new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1]);
      geo.setAttribute('position',new THREE.BufferAttribute(v,3));
      geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      geo.computeVertexNormals();
      const cols=[0x2d6e1a,0x3a8c22,0x4aa830,0x5db83a,0x6ec848];
      const pM=Math.floor(GRASS_CFG.COUNT/cols.length);
      this._grassMeshes=cols.map(c=>{
        const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:c,side:THREE.DoubleSide,alphaTest:0.1,roughness:1}),pM);
        this.scene.add(m); return m;
      });
      const d=new THREE.Object3D();
      this._grassMeshes.forEach(m=>{
        for(let i=0;i<pM;i++){
          const a=Math.random()*Math.PI*2, r=8+Math.pow(Math.random(),0.5)*GRASS_CFG.SPREAD;
          const sc=0.6+Math.random()*1.0;
          d.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
          d.rotation.y=Math.random()*Math.PI*2; d.scale.set(sc,sc*(0.9+Math.random()*0.4),sc);
          d.updateMatrix(); m.setMatrixAt(i,d.matrix);
        }
        m.instanceMatrix.needsUpdate=true;
      });
      console.log('%c🌿 Pasto procedural', 'color:#4a8c2a');
    };

    const sc=document.createElement('script');
    sc.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    sc.onload=()=>new THREE.GLTFLoader().load(GRASS_CFG.GLB_PATH,g=>spawnGlb(g.scene),null,fallback);
    sc.onerror=fallback;
    document.head.appendChild(sc);
  }

  /* ─── UPDATE ────────────────────────────────────────────── */
  update(dt, t) {
    // Viento
    const pos=this._windPts.geometry.attributes.position.array;
    const tt=Date.now()*0.0002;
    const wx=Math.cos(tt)*8, wz=Math.sin(tt*0.7)*4;
    for(let i=0;i<200;i++){
      const sp=this._windSpd[i];
      pos[i*3]+=wx*sp*dt; if(pos[i*3]>60) pos[i*3]=-60; if(pos[i*3]<-60) pos[i*3]=60;
      pos[i*3+1]+=0.3*sp*dt; if(pos[i*3+1]>4) pos[i*3+1]=0.1;
      pos[i*3+2]+=wz*sp*dt; if(pos[i*3+2]>60) pos[i*3+2]=-60; if(pos[i*3+2]<-60) pos[i*3+2]=60;
    }
    this._windPts.geometry.attributes.position.needsUpdate=true;
    this._dustPts.rotation.y+=dt*0.015;

    if(this._grassMeshes) this._grassMeshes.forEach((m,i)=>{
      m.rotation.x=Math.sin(t*0.9+i*0.3)*0.038;
      m.rotation.z=Math.sin(t*0.7+i*0.2)*0.028;
    });

    // Árboles
    this._trees.forEach(tree=>{
      const ph=tree.userData.windPhase||0, sp=tree.userData.windSpeed||1, sc=tree.userData.treeScale||1;
      tree.rotation.x=Math.sin(t*sp+ph)*0.018*sc;
      tree.rotation.z=Math.cos(t*sp*0.7+ph)*0.012*sc;
      const lp=tree.userData.leafPts, ld=tree.userData.leafData;
      if(lp&&ld){
        const p=lp.geometry.attributes.position;
        ld.forEach((leaf,i)=>{
          leaf.angle+=leaf.speed*dt;
          p.setXYZ(i,Math.cos(leaf.angle)*leaf.radius,1.5*sc+Math.sin(t*0.8+leaf.yOff)*0.35*sc+Math.cos(leaf.angle*0.5)*0.2*sc,Math.sin(leaf.angle)*leaf.radius);
        });
        p.needsUpdate=true;
        lp.material.opacity=0.65+Math.sin(t*1.2+ph)*0.2;
      }
    });
  }
}