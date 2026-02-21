/* ═══════════════════════════════════════════════════════════
   Game/ModalManager.js  —  Maneja modales, rocola, carta
   Reemplaza Checkpoints.js. La detección de proximidad
   ya vive en cada IslandBase; este módulo solo maneja UI.
   ═══════════════════════════════════════════════════════════ */

class ModalManager {
  constructor() {
    this.currentModal = null;
    this.jukeboxOpen  = false;
    this.currentSong  = 0;
    this.discovered   = 0;
    this._twTimer     = null;

    this._discEl = document.getElementById('disc-count');
    this._hintEl = document.getElementById('proximity-hint');

    this._setupListeners();

    // Exponer funciones globales que IslandBase llama
    window.openModal         = (id) => this.openModal(id);
    window.onIslandDiscovered = (id) => this._onDiscovered(id);

    console.log('%c📋 ModalManager listo', 'color:#ffd60a');
  }

  /* ─── LISTENERS ─────────────────────────────────────────── */
  _setupListeners() {
    // Cerrar con botón ✕
    document.querySelectorAll('.modal-close').forEach(b => {
      b.addEventListener('click', () => this.closeModal(b.dataset.modal));
    });

    // Cerrar al click en backdrop
    document.querySelectorAll('.modal-backdrop').forEach(el => {
      el.addEventListener('click', e => {
        if(e.target === el) this.closeModal(el.id);
      });
    });

    // Teclado — ESC cierra, flechas cambian canción en jukebox
    window.addEventListener('keydown', e => {
      if(e.key === 'Escape' && this.currentModal)
        this.closeModal(this.currentModal);
      if(this.jukeboxOpen) {
        if(e.key === 'ArrowLeft')  this._changeSong(-1);
        if(e.key === 'ArrowRight') this._changeSong(+1);
      }
    });

    // Botones de jukebox
    document.addEventListener('click', e => {
      if(e.target.id === 'jukebox-prev') this._changeSong(-1);
      if(e.target.id === 'jukebox-next') this._changeSong(+1);
    });
  }

  /* ─── ABRIR / CERRAR MODAL ──────────────────────────────── */
  openModal(id) {
    if(this.currentModal === id) return;
    if(this.currentModal) this.closeModal(this.currentModal);
    this.currentModal = id;

    const el = document.getElementById(id);
    if(!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');

    if(typeof gameAudio !== 'undefined') gameAudio.open();
    if(id === 'modal-3') this._typewrite();
    if(id === 'jukebox') this._openJukebox();
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if(!el) return;

    if(typeof gsap !== 'undefined') {
      gsap.to(el, { opacity:0, duration:0.25, ease:'power2.in', onComplete:() => {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
        gsap.set(el, { clearProps:'opacity' });
      }});
    } else {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    }

    if(this.currentModal === id) this.currentModal = null;
    if(id === 'jukebox') {
      if(typeof gameAudio !== 'undefined') gameAudio.stopSong();
      this.jukeboxOpen = false;
    }
  }

  /* ─── DESCUBRIMIENTO DE ISLAS ───────────────────────────── */
  _onDiscovered(id) {
    this.discovered++;
    if(this._discEl) this._discEl.textContent = this.discovered;

    // 3 islas normales descubiertas = pantalla final
    if(this.discovered >= 3) this._finalScreen();
  }

  /* ─── HINT DE PROXIMIDAD ─────────────────────────────────── */
  showHint(visible) {
    if(!this._hintEl) return;
    if(visible) this._hintEl.classList.remove('hidden');
    else        this._hintEl.classList.add('hidden');
  }

  /* ─── JUKEBOX ────────────────────────────────────────────── */
  _openJukebox() {
    this.jukeboxOpen = true;
    this._updateJukeboxUI();
    if(typeof gameAudio !== 'undefined') gameAudio.startSong(this.currentSong);
  }

  _changeSong(dir) {
    const total = typeof SONGS !== 'undefined' ? SONGS.length : 4;
    this.currentSong = (this.currentSong + dir + total) % total;
    this._updateJukeboxUI();
    if(typeof gameAudio !== 'undefined') {
      gameAudio.startSong(this.currentSong);
      gameAudio.tone(440 + this.currentSong * 110, 0.15, 'sine', 0.1);
    }
  }

  _updateJukeboxUI() {
    const n = document.getElementById('jukebox-song-name');
    if(n && typeof SONGS !== 'undefined') n.textContent = SONGS[this.currentSong].title;

    document.querySelectorAll('.jukebox-dot').forEach((d, i) => {
      const active = i === this.currentSong;
      d.classList.toggle('active', active);
      d.style.background = active && typeof SONGS !== 'undefined'
        ? SONGS[this.currentSong].color : '';
    });
  }

  /* ─── TYPEWRITER (Carta del Faro) ───────────────────────── */
  _typewrite() {
    const el = document.getElementById('typewriter-out');
    if(!el || typeof CARTA_TEXTO === 'undefined') return;
    el.textContent = '';
    el.classList.remove('done');
    let i = 0;
    clearInterval(this._twTimer);
    this._twTimer = setInterval(() => {
      if(i < CARTA_TEXTO.length) el.textContent += CARTA_TEXTO[i++];
      else { clearInterval(this._twTimer); el.classList.add('done'); }
    }, 36);
  }

  /* ─── PANTALLA FINAL ────────────────────────────────────── */
  _finalScreen() {
    setTimeout(() => {
      const fs = document.getElementById('final-screen');
      if(!fs) return;
      fs.classList.remove('hidden');
      const cont = document.getElementById('final-hearts');
      if(!cont) return;
      ['💛','🌻','💫','✨','🌼','💕'].forEach(em => {
        for(let j = 0; j < 4; j++){
          const h = document.createElement('span');
          h.className = 'heart-float';
          h.textContent = em;
          h.style.setProperty('--l',   Math.random() * 100 + '%');
          h.style.setProperty('--d',   (3 + Math.random() * 5) + 's');
          h.style.setProperty('--del', Math.random() * 3 + 's');
          cont.appendChild(h);
        }
      });
    }, 600);
  }

  /* ─── UPDATE — llamado desde el tick loop ───────────────── */
  // Recibe si ALGUNA isla está en rango (lo calcula World)
  update(anyIslandInRange) {
    this.showHint(anyIslandInRange && !this.currentModal);
  }
}