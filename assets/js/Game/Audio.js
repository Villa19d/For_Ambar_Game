/* ═══════════════════════════════════════════════════════════
   Game/Audio.js  —  Sonidos
   Equivalente al Audio.js de Bruno Simon
   ═══════════════════════════════════════════════════════════ */

class GameAudio {
  constructor() { this._ctx = null; this._jbOsc = null; }

  get ctx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  }

  tone(freq, dur, type = 'sine', vol = 0.18) {
    try {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur);
    } catch(_) {}
  }

  proximity()   { this.tone(660, 0.18, 'sine', 0.14); }
  open()        { this.tone(523, 0.1, 'triangle', 0.13); setTimeout(() => this.tone(784, 0.2, 'triangle', 0.13), 90); }
  collision(v)  { if (v > 3) this.tone(110 + Math.random()*40, 0.3, 'sawtooth', 0.08); }

  startSong(idx) {
    this.stopSong();
    const freqs = [[261,329,392,523],[220,277,330,440],[196,247,294,392],[174,220,261,349]][idx % 4];
    try {
      const c = this.ctx, jg = c.createGain();
      jg.gain.value = 0.12; jg.connect(c.destination);
      let beat = 0;
      const play = () => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(jg); o.type = 'triangle';
        o.frequency.value = freqs[beat % freqs.length];
        g.gain.setValueAtTime(0.5, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        o.start(); o.stop(c.currentTime + 0.4); beat++;
      };
      play(); this._jbOsc = setInterval(play, 400);
    } catch(_) {}
  }

  stopSong() {
    if (this._jbOsc) { clearInterval(this._jbOsc); this._jbOsc = null; }
  }
}