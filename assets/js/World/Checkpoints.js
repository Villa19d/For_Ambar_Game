/* ═══════════════════════════════════════════════════════════
   World/Checkpoints.js  —  Checkpoints, modales, rocola
   Equivalente al Areas.js + Modals.js de Bruno Simon
   ═══════════════════════════════════════════════════════════ */

class Checkpoints {
  constructor(scene) {
    this.scene      = scene;
    this.objects    = [];
    this.discovered = 0;
    this.currentModal = null;
    this.jukeboxOpen  = false;
    this.currentSong  = 0;
    this._twTimer     = null;

    this._discEl = document.getElementById('disc-count');
    this._hintEl = document.getElementById('proximity-hint');

    this._buildCheckpoints();
    this._setupModalListeners();
  }

  /* ─── CONSTRUIR ──────────────────────────────────────────── */
  _buildCheckpoints() {
    CHECKPOINTS.forEach(cfg => {
      const g = new THREE.Group();
      g.position.set(cfg.x, 0, cfg.z);
      this.scene.add(g);

      if (cfg.isJukebox) {
        this._buildJukebox(g, cfg.color);
        this.objects.push({ cfg, cube:null, mat:null, triggered:false, wasInRange:false, isJukebox:true });
        return;
      }

      // Base
      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,0.3,16),
        new THREE.MeshStandardMaterial({color:0x2e1608,roughness:0.8}));
      base.position.y=0.15; base.castShadow=base.receiveShadow=true; g.add(base);
      // Columna
      const col=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,2.8,10),
        new THREE.MeshStandardMaterial({color:0x3d2010,roughness:0.7}));
      col.position.y=1.7; col.castShadow=true; g.add(col);
      // Cubo flotante
      const mat=new THREE.MeshStandardMaterial({color:cfg.color,emissive:cfg.emissive,emissiveIntensity:0.8,roughness:0.2,metalness:0.4});
      const cube=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),mat);
      cube.position.y=3.6; cube.castShadow=true; g.add(cube);
      // Luz
      const pt=new THREE.PointLight(cfg.color,2.2,16); pt.position.y=3.8; g.add(pt);
      // Label
      g.add(this._makeLabel(cfg.icon+' '+cfg.label, 0,5.4));

      this.objects.push({cfg,cube,mat,triggered:false,wasInRange:false,isJukebox:false});
    });
  }

  _makeLabel(text, x=0, y=0) {
    const cv=document.createElement('canvas'); cv.width=512; cv.height=128;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='rgba(20,10,4,0.8)';
    ctx.beginPath(); ctx.roundRect(8,8,496,112,20); ctx.fill();
    ctx.fillStyle='#f5e8d0'; ctx.font='bold 44px serif';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,256,64);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
    sp.scale.set(4.5,1.1,1); sp.position.set(x,y,0);
    return sp;
  }

  _buildJukebox(parent, color) {
    const mb=new THREE.MeshStandardMaterial({color:0x1a0a2e,roughness:0.3,metalness:0.6});
    const ma=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.6,roughness:0.2,metalness:0.5});
    const mg=new THREE.MeshStandardMaterial({color:0x88aaff,roughness:0,metalness:1,transparent:true,opacity:0.5});

    const body=new THREE.Mesh(new THREE.BoxGeometry(1.6,2.4,0.9),mb); body.position.y=1.2; body.castShadow=true; parent.add(body);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.9,16,1,false,0,Math.PI),mb);
    top.position.set(0,2.4,0); top.rotation.z=Math.PI/2; top.rotation.y=Math.PI/2; parent.add(top);
    const screen=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.9,0.05),mg); screen.position.set(0,1.6,0.48); parent.add(screen);
    [-0.5,0,0.5].forEach(x=>{
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.08,2.2,0.02),ma); s.position.set(x,1.2,0.46); parent.add(s);
    });
    [[-0.3,0.7],[0,0.7],[0.3,0.7]].forEach(([bx,by])=>{
      const btn=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.06,10),
        new THREE.MeshStandardMaterial({color:0xff4466,emissive:0x880022,emissiveIntensity:0.8}));
      btn.position.set(bx,by,0.48); btn.rotation.x=Math.PI/2; parent.add(btn);
    });
    const pt=new THREE.PointLight(color,3,18); pt.position.set(0,2,1); parent.add(pt);
    window._jukeboxLight=pt;
    parent.add(this._makeLabel('🎵 La Rocola',0,4));
  }

  /* ─── MODALES ────────────────────────────────────────────── */
  _setupModalListeners() {
    document.querySelectorAll('.modal-close').forEach(b=>b.addEventListener('click',()=>this.closeModal(b.dataset.modal)));
    document.querySelectorAll('.modal-backdrop').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)this.closeModal(el.id);}));
    window.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&this.currentModal) this.closeModal(this.currentModal);
      if(this.jukeboxOpen){if(e.key==='ArrowLeft')this._changeSong(-1);if(e.key==='ArrowRight')this._changeSong(+1);}
    });
    document.addEventListener('click',e=>{
      if(e.target.id==='jukebox-prev')this._changeSong(-1);
      if(e.target.id==='jukebox-next')this._changeSong(+1);
    });
  }

  openModal(id) {
    if(this.currentModal===id) return;
    if(this.currentModal) this.closeModal(this.currentModal);
    this.currentModal=id;
    const el=document.getElementById(id); if(!el) return;
    el.classList.add('open'); el.setAttribute('aria-hidden','false');
    gameAudio.open();
    if(id==='modal-3') this._typewrite();
    if(id==='jukebox') this._openJukebox();
  }

  closeModal(id) {
    const el=document.getElementById(id); if(!el) return;
    gsap.to(el,{opacity:0,duration:0.25,ease:'power2.in',onComplete:()=>{
      el.classList.remove('open'); el.setAttribute('aria-hidden','true');
      gsap.set(el,{clearProps:'opacity'});
    }});
    if(this.currentModal===id) this.currentModal=null;
    if(id==='jukebox'){gameAudio.stopSong();this.jukeboxOpen=false;}
  }

  _openJukebox() {
    this.jukeboxOpen=true; this._updateJukeboxUI(); gameAudio.startSong(this.currentSong);
  }

  _changeSong(dir) {
    this.currentSong=(this.currentSong+dir+SONGS.length)%SONGS.length;
    this._updateJukeboxUI(); gameAudio.startSong(this.currentSong);
    gameAudio.tone(440+this.currentSong*110,0.15,'sine',0.1);
  }

  _updateJukeboxUI() {
    const n=document.getElementById('jukebox-song-name'); if(n) n.textContent=SONGS[this.currentSong].title;
    document.querySelectorAll('.jukebox-dot').forEach((d,i)=>{
      d.classList.toggle('active',i===this.currentSong);
      d.style.background=i===this.currentSong?SONGS[this.currentSong].color:'';
    });
  }

  _typewrite() {
    const el=document.getElementById('typewriter-out'); if(!el) return;
    el.textContent=''; el.classList.remove('done'); let i=0; clearInterval(this._twTimer);
    this._twTimer=setInterval(()=>{
      if(i<CARTA_TEXTO.length) el.textContent+=CARTA_TEXTO[i++];
      else{clearInterval(this._twTimer);el.classList.add('done');}
    },36);
  }

  _finalScreen() {
    setTimeout(()=>{
      document.getElementById('final-screen').classList.remove('hidden');
      const cont=document.getElementById('final-hearts');
      ['💛','🌻','💫','✨','🌼','💕'].forEach(em=>{
        for(let j=0;j<4;j++){
          const h=document.createElement('span'); h.className='heart-float'; h.textContent=em;
          h.style.setProperty('--l',Math.random()*100+'%');
          h.style.setProperty('--d',(3+Math.random()*5)+'s');
          h.style.setProperty('--del',Math.random()*3+'s');
          cont.appendChild(h);
        }
      });
    },600);
  }

  /* ─── UPDATE ─────────────────────────────────────────────── */
  update(t, carPos, input, lastAction) {
    const car2D = new THREE.Vector2(carPos.x, carPos.z);
    let closestCp=null, minD=Infinity;

    this.objects.forEach(cp=>{
      // Animar cubo flotante
      if(cp.cube){
        cp.cube.position.y=3.6+Math.sin(t*1.8+cp.cfg.x)*0.3;
        cp.cube.rotation.y+=0.009;
        cp.mat.emissiveIntensity=0.5+Math.sin(t*2+cp.cfg.z)*0.45;
      }
      if(cp.triggered&&!cp.isJukebox) return;
      const d=car2D.distanceTo(new THREE.Vector2(cp.cfg.x,cp.cfg.z));
      if(d<TRIGGER_DIST){
        if(!cp.wasInRange){cp.wasInRange=true;gameAudio.proximity();}
        if(d<minD){minD=d;closestCp=cp;}
      } else {cp.wasInRange=false;}
    });

    if(closestCp&&!this.currentModal) this._hintEl.classList.remove('hidden');
    else                               this._hintEl.classList.add('hidden');

    if(input&&!lastAction&&closestCp&&!this.currentModal){
      this.openModal(closestCp.cfg.id);
      if(!closestCp.triggered&&!closestCp.isJukebox){
        closestCp.triggered=true;
        this.discovered++;
        this._discEl.textContent=this.discovered;
        if(closestCp.mat) gsap.to(closestCp.mat,{emissiveIntensity:3,duration:0.25,yoyo:true,repeat:4});
        if(this.discovered===3) this._finalScreen();
      }
    }

    return closestCp; // devolver para que main.js sepa
  }
}