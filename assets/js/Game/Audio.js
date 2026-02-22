/* ═══════════════════════════════════════════════════════════
   Game/Audio.js  —  Sonidos + Música MP3 (VERSIÓN CORREGIDA)
   ═══════════════════════════════════════════════════════════ */

class GameAudio {
  constructor() { 
    this._ctx = null; 
    this._jbOsc = null;
    this._jukebox = null; // Referencia al reproductor MP3
  }

  get ctx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  // Sonidos FX
  tone(freq, dur, type = 'sine', vol = 0.18) {
    try {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start();
      o.stop(c.currentTime + dur);
    } catch(_) {}
  }

  proximity()   { this.tone(660, 0.18, 'sine', 0.14); }
  open()        { this.tone(523, 0.1, 'triangle', 0.13); setTimeout(() => this.tone(784, 0.2, 'triangle', 0.13), 90); }
  collision(v)  { if (v > 3) this.tone(110 + Math.random()*40, 0.3, 'sawtooth', 0.08); }

  // MÉTODOS PARA JUKEBOX
  initJukebox() {
    if (!this._jukebox) {
      // Asegurar que el contexto existe
      const ctx = this.ctx;
      this._jukebox = new Jukebox(ctx);
    }
    return this._jukebox;
  }

  // Mantener compatibilidad con código antiguo
  startSong(idx) {
    if (this._jukebox) {
      this._jukebox.playSong(idx, SONGS[idx]?.startTime || 0);
    } else {
      this._legacyStartSong(idx);
    }
  }

  _legacyStartSong(idx) {
    this.stopSong();
    const freqs = [[261,329,392,523],[220,277,330,440],[196,247,294,392],[174,220,261,349]][idx % 4];
    try {
      const c = this.ctx;
      const jg = c.createGain();
      jg.gain.value = 0.12;
      jg.connect(c.destination);
      let beat = 0;
      const play = () => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(jg);
        o.type = 'triangle';
        o.frequency.value = freqs[beat % freqs.length];
        g.gain.setValueAtTime(0.5, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        o.start();
        o.stop(c.currentTime + 0.4);
        beat++;
      };
      play();
      this._jbOsc = setInterval(play, 400);
    } catch(_) {}
  }

  stopSong() {
    if (this._jbOsc) { 
      clearInterval(this._jbOsc); 
      this._jbOsc = null; 
    }
    if (this._jukebox) {
      this._jukebox.stopCurrentSong();
    }
  }
}