/* ═══════════════════════════════════════════════════════════
   Game/Audio.js  —  Sonidos FX + puente con Jukebox
   ═══════════════════════════════════════════════════════════ */

class GameAudio {
  constructor() {
    this._ctx     = null;
    this._jukebox = null;   // instancia única de Jukebox
  }

  get ctx() {
    if(!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  /* ── FX ──────────────────────────────────────────────────── */
  tone(freq, dur, type = 'sine', vol = 0.18) {
    try {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur);
    } catch(_) {}
  }

  proximity()  { this.tone(660, 0.18, 'sine',     0.14); }
  open()       { this.tone(523, 0.1,  'triangle', 0.13);
                 setTimeout(() => this.tone(784, 0.2, 'triangle', 0.13), 90); }
  collision(v) { if(v > 3) this.tone(110 + Math.random()*40, 0.3, 'sawtooth', 0.08); }

  /* ── Jukebox ─────────────────────────────────────────────── */
  // Devuelve la instancia, creándola solo la primera vez
  initJukebox() {
    if(!this._jukebox) {
      this._jukebox = new Jukebox(this.ctx);
    }
    return this._jukebox;
  }

  // Compatibilidad con código viejo que llama gameAudio.stopSong()
  stopSong() {
    if(this._jukebox) this._jukebox.stopCurrentSong(true);
  }
}