/* ═══════════════════════════════════════════════════════════
   Game/ModalManager.js  —  Maneja modales, rocola, carta
   La detección de proximidad vive en IslandBase.
   Este módulo solo maneja UI.
   ═══════════════════════════════════════════════════════════ */

class ModalManager {
  constructor() {
    this.currentModal = null;
    this.discovered   = 0;
    this._twTimer     = null;
    this.audio        = null;   // referencia a GameAudio (se pone con setAudio)
     this._finalShown  = false; 
    this._discEl = document.getElementById('disc-count');
    this._hintEl = document.getElementById('proximity-hint');

    this._setupListeners();

    // Exponer globales para que IslandBase los pueda llamar sin importar nada
    window.openModal          = (id) => this.openModal(id);
    window.onIslandDiscovered = (id) => this._onDiscovered(id);

    console.log('%c📋 ModalManager listo', 'color:#ffd60a');
  }

  setAudio(audioInstance) {
    this.audio = audioInstance;
  }

  /* ─── LISTENERS ─────────────────────────────────────────── */
  _setupListeners() {
    document.querySelectorAll('.modal-close').forEach(b =>
      b.addEventListener('click', () => this.closeModal(b.dataset.modal))
    );
    document.querySelectorAll('.modal-backdrop').forEach(el =>
      el.addEventListener('click', e => { if(e.target === el) this.closeModal(el.id); })
    );
    window.addEventListener('keydown', e => {
      if(e.key === 'Escape' && this.currentModal) this.closeModal(this.currentModal);
    });
  }

  /* ─── ABRIR ─────────────────────────────────────────────── */
  openModal(id) {
    if(this.currentModal === id) return;
    if(this.currentModal) this.closeModal(this.currentModal);

    this.currentModal = id;
    const el = document.getElementById(id);
    if(!el) return;

    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');

    if(this.audio) this.audio.open();

    if(id === 'modal-3') this._typewrite();

    if(id === 'jukebox') {
      // Pasarle el control al Jukebox real
      const jukebox = this.audio?.initJukebox();
      if(jukebox) {
        jukebox.onModalOpen();
        // Primera canción si no está sonando
        if(!jukebox.isPlaying) {
          jukebox.playSong(0, SONGS[0].startTime ?? 0);
        }
      }
    }
  }



/* ─── DESCUBRIMIENTO ────────────────────────────────────── */
_onDiscovered(id) {
  this.discovered++;
  if(this._discEl) this._discEl.textContent = this.discovered;
  // ELIMINAR this._finalScreen() de aquí
  // if(this.discovered >= 3) this._finalScreen(); <-- BORRAR
}

/* ─── CERRAR ─────────────────────────────────────────────── */
closeModal(id) {
  const el = document.getElementById(id);
  if(!el) return;

  gsap.to(el, { opacity:0, duration:0.25, ease:'power2.in', onComplete:() => {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    gsap.set(el, { clearProps:'opacity' });
    
    // ── VERIFICAR SI YA SE COMPLETARON TODOS ──
    if (this.discovered >= 3) {
      this._finalScreen();
    }
  }});

  if(this.currentModal === id) this.currentModal = null;

  if(id === 'jukebox') {
    const jukebox = this.audio?._jukebox;
    if(jukebox) {
      jukebox.onModalClose();
      jukebox.stopCurrentSong(true);
    }
  }
}

  /* ─── HINT ───────────────────────────────────────────────── */
  showHint(visible) {
    if(!this._hintEl) return;
    if(visible) this._hintEl.classList.remove('hidden');
    else        this._hintEl.classList.add('hidden');
  }
  update(anyIslandInRange) {
    this.showHint(anyIslandInRange && !this.currentModal);
  }

  /* ─── TYPEWRITER ─────────────────────────────────────────── */
  _typewrite() {
    const el = document.getElementById('typewriter-out');
    if(!el || typeof CARTA_TEXTO === 'undefined') return;
    el.textContent = ''; el.classList.remove('done');
    let i = 0; clearInterval(this._twTimer);
    this._twTimer = setInterval(() => {
      if(i < CARTA_TEXTO.length) el.textContent += CARTA_TEXTO[i++];
      else { clearInterval(this._twTimer); el.classList.add('done'); }
    }, 36);
  }


/* ─── INICIALIZAR CARTA INTERACTIVA ─────────────────────── */
_initCarta() {
  const carta = document.getElementById('carta');
  if (!carta) return;
  
  // Remover event listeners anteriores (por si acaso)
  carta.removeEventListener('click', this._toggleCarta);
  
  // Definir función de toggle
  this._toggleCarta = () => {
    carta.classList.toggle('abierta');
    
    // Sonido sutil al abrir/cerrar (opcional)
    if (this.audio) {
      this.audio.tone(800, 0.1, 'sine', 0.1);
    }
    
    console.log('📬 Carta', carta.classList.contains('abierta') ? 'abierta' : 'cerrada');
  };
  
  // Asignar evento
  carta.addEventListener('click', this._toggleCarta);
  
  // Asegurar que empiece cerrada
  carta.classList.remove('abierta');
}

  //===============PANTALLA FINAL=================
_finalScreen() {
  if (this._finalShown) return;
  this._finalShown = true;
  
  setTimeout(() => {
    const fs = document.getElementById('final-screen');
    if(!fs) return;
    fs.classList.remove('hidden');
    
    // Corazones flotantes
    const cont = document.getElementById('final-hearts');
    if(cont) {
      ['💛','🌻','💫','✨','🌼','💕'].forEach(em => {
        for(let j = 0; j < 4; j++){
          const h = document.createElement('span');
          h.className = 'heart-float'; h.textContent = em;
          h.style.setProperty('--l',   Math.random() * 100 + '%');
          h.style.setProperty('--d',   (3 + Math.random() * 5) + 's');
          h.style.setProperty('--del', Math.random() * 3 + 's');
          cont.appendChild(h);
        }
      });
    }
    
    // ── INICIALIZAR CARTA ─────────────────────────────
    this._initCarta();
    
  }, 600);
}
}