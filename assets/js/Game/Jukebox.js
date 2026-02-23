/* ═══════════════════════════════════════════════════════════
   Game/Jukebox.js  —  Mini-Spotify para La Rocola
   
   CORRECCIONES vs versión anterior:
   ✅ No busca DOM al construir — solo cuando el modal abre
   ✅ Para el audio ANTES de cargar el siguiente (sin mezcla)
   ✅ Usa Promise + flag _loading para evitar race conditions
   ✅ UI inicializada al abrir el modal, no al instanciar
   ✅ Barra de progreso interactiva (click para seekear)
   ✅ 6 dots para 6 canciones
   ✅ Canción base en la lista de SONGS (index 0 opcional)
   ═══════════════════════════════════════════════════════════ */

class Jukebox {
  constructor(audioContext) {
    this.ctx          = audioContext;
    this.gainNode     = this.ctx.createGain();
    this.baseGainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.baseGainNode.connect(this.ctx.destination);

    this._source      = null;   // fuente activa de canción
    this._baseSource  = null;   // fuente de música base
    this._loading     = false;  // evitar carga simultánea
    this._songIndex   = 0;
    this._startedAt   = 0;      // ctx.currentTime cuando arrancó
    this._offsetAt    = 0;      // segundo dentro del buffer donde arrancó
    this._duration    = 0;      // duración del buffer en segundos
    this._raf         = null;   // requestAnimationFrame para progreso
    this._uiReady     = false;  // el modal ya tiene sus elementos

    this.isPlaying     = false;
    this.isBasePlaying = false;
    this.baseVolume    = BASE_SONG.volume ?? 0.3;
    this.songVolume    = 0.45;  // volumen bajado (antes 0.85)

    // Cache de buffers ya decodificados { url → AudioBuffer }
    this._cache = {};
  }

  /* ── Música base — corre al iniciar el juego ─────────────── */
  async startBaseMusic() {
    if(this.isBasePlaying) return;
    try {
      await this._resume();
      const buf = await this._load(`media/Audio/${BASE_SONG.file}`);
      this._baseSource = this._makeSource(buf, this.baseGainNode, true);
      this.baseGainNode.gain.setValueAtTime(this.baseVolume, this.ctx.currentTime);
      this._baseSource.start(0);
      this.isBasePlaying = true;
      console.log('%c🎵 Música base sonando', 'color:#d4a8ff');
    } catch(e) {
      console.warn('No se pudo cargar música base:', e);
    }
  }

  /* ── Abrir la UI del jukebox ─────────────────────────────── */
  // Llamar desde ModalManager justo cuando el modal abre
  onModalOpen() {
    this._ensureUI();      // construir los elementos si faltan
    this._bindUI();        // eventos de botones / barra
    this._renderSong();    // actualizar portada / nombre
    this._startProgressLoop();
  }

  /* ── Reproducir canción por índice ──────────────────────── */
  async playSong(index, startTime = 0) {
    if(this._loading) return;
    this._loading = true;

    // 1. Parar SOLO la fuente de audio, NO el rAF loop
    this._stopSourceOnly();

    this._songIndex = index;
    const song = SONGS[index];
    if(!song) { this._loading = false; return; }

    try {
      await this._resume();
      const buf = await this._load(`media/Audio/${song.file}`);
      
      this._source = this._makeSource(buf, this.gainNode, false);
      this.gainNode.gain.setValueAtTime(this.songVolume, this.ctx.currentTime);

      this._duration  = buf.duration;

      // Grabar timestamps JUSTO ANTES de start() para máxima precisión
      this._offsetAt  = startTime;
      this._startedAt = this.ctx.currentTime;
      this._source.start(0, startTime);
      this.isPlaying = true;

      // Silenciar base
      this.baseGainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

      this._renderSong();
    } catch(e) {
      console.error('Error al cargar canción:', e);
      this.isPlaying = false;
    } finally {
      this._loading = false;
    }
  }

  /* ── Parar canción actual (y volver a base si se pide) ───── */
  stopCurrentSong(returnToBase = true) {
    this._stopSourceOnly();
    this._cancelProgressLoop();
    if(returnToBase && this.isBasePlaying) {
      this.baseGainNode.gain.linearRampToValueAtTime(
        this.baseVolume, this.ctx.currentTime + 0.8
      );
    }
    this._renderSong();
  }

  // Para SOLO el AudioBufferSource sin tocar el rAF loop
  _stopSourceOnly() {
    if(this._source) {
      try { this._source.stop(0); } catch(_) {}
      this._source.disconnect();
      this._source = null;
    }
    this.isPlaying = false;
  }

  _stopCurrentSong(returnToBase = true) {
    this.stopCurrentSong(returnToBase);
  }

  /* ── Helpers internos ────────────────────────────────────── */

  // Cargar y cachear un AudioBuffer
  async _load(url) {
    if(this._cache[url]) return this._cache[url];
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    const arr = await res.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(arr);
    this._cache[url] = buf;
    return buf;
  }

  // Crear un AudioBufferSourceNode limpio
  _makeSource(buffer, dest, loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop   = loop;
    src.connect(dest);
    return src;
  }

  async _resume() {
    if(this.ctx.state === 'suspended') await this.ctx.resume();
  }

  /* ── Barra de progreso (rAF) ─────────────────────────────── */
  _startProgressLoop() {
    this._cancelProgressLoop();
    const loop = () => {
      this._updateProgress();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _cancelProgressLoop() {
    if(this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _updateProgress() {
    if(!this._uiReady) return;
    const fill   = document.getElementById('jk-progress-fill');
    const cur    = document.getElementById('jk-cur-time');
    const totEl  = document.getElementById('jk-tot-time');
    const thumb  = document.getElementById('jk-progress-thumb');
    if(!fill || !cur || !totEl) return;

    // Siempre mostrar duración total si la conocemos
    if(this._duration) totEl.textContent = this._fmt(this._duration);

    if(!this.isPlaying || !this._duration) {
      // No actualizar fill cuando no está tocando (mantener posición de seek)
      return;
    }

    const elapsed = this.ctx.currentTime - this._startedAt + this._offsetAt;
    const clamped = Math.min(Math.max(elapsed, 0), this._duration);
    const pct     = (clamped / this._duration) * 100;

    fill.style.width  = `${pct}%`;
    cur.textContent   = this._fmt(clamped);
    // Mover el thumb siguiendo el fill
    if(thumb) thumb.style.setProperty('--pct', `${pct}%`);
  }

  _fmt(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  /* ── UI dinámica ─────────────────────────────────────────── */

  // Asegura que el modal tenga los elementos necesarios
  _ensureUI() {
    if(this._uiReady) return;
    const panel = document.querySelector('#jukebox .modal-panel');
    if(!panel) return;

    // Limpiar lo que había (dots viejos, controles viejos)
    panel.querySelectorAll(
      '.jukebox-display, .jukebox-controls, .jukebox-dots, .jukebox-hint, .jk-new'
    ).forEach(el => el.remove());

    // ── Portada + info ──────────────────────────────────────
    const coverBlock = this._el('div', 'jk-new jk-cover-block');
    coverBlock.innerHTML = `
      <img id="jk-cover" class="jk-cover-img" src="" alt="portada">
      <div class="jk-info">
        <p id="jk-title" class="jk-title">—</p>
        <p id="jk-artist" class="jk-artist">—</p>
      </div>`;
    panel.appendChild(coverBlock);

    // ── Barras visualizador (decorativas) ──────────────────
    const bars = this._el('div', 'jk-new jk-bars');
    for(let i = 0; i < 8; i++) bars.appendChild(this._el('span', `jk-bar jk-bar-${i}`));
    panel.appendChild(bars);

    // ── Barra de progreso interactiva ──────────────────────
    const progressBlock = this._el('div', 'jk-new jk-progress-block');
    progressBlock.innerHTML = `
      <span id="jk-cur-time" class="jk-time">0:00</span>
      <div id="jk-progress-bar" class="jk-progress-bar" title="Clic para saltar">
        <div id="jk-progress-fill" class="jk-progress-fill"></div>
        <div id="jk-progress-thumb" class="jk-progress-thumb"></div>
      </div>
      <span id="jk-tot-time" class="jk-time">--:--</span>`;
    panel.appendChild(progressBlock);

    // ── Controles ──────────────────────────────────────────
    const controls = this._el('div', 'jk-new jk-controls');
    controls.innerHTML = `
      <button id="jk-prev" class="jk-btn">⏮</button>
      <button id="jk-play" class="jk-btn jk-btn-main">▶</button>
      <button id="jk-next" class="jk-btn">⏭</button>`;
    panel.appendChild(controls);

    // ── Dots — uno por canción ─────────────────────────────
    const dotsBlock = this._el('div', 'jk-new jk-dots');
    dotsBlock.id = 'jk-dots';
    SONGS.forEach((_, i) => {
      const d = this._el('span', 'jk-dot');
      d.dataset.idx = i;
      dotsBlock.appendChild(d);
    });
    panel.appendChild(dotsBlock);

    // ── Hint ───────────────────────────────────────────────
    const hint = this._el('p', 'jk-new jk-hint');
    hint.textContent = 'Estas son las canciones que mas me hacen volar la cabeza contigo';
    panel.appendChild(hint);

    // ── Estilos inline (autónomos) ─────────────────────────
    if(!document.getElementById('jk-styles')) {
      const s = document.createElement('style');
      s.id = 'jk-styles';
      s.textContent = `
        .jk-cover-block{display:flex;align-items:center;gap:16px;margin:18px 0 10px;padding:14px;background:rgba(0,0,0,.35);border-radius:14px;}
        .jk-cover-img{width:75px;height:75px;border-radius:10px;object-fit:cover;box-shadow:0 4px 18px #0008;flex-shrink:0;background:#1a0a2e;}
        .jk-info{flex:1;min-width:0;}
        .jk-title{margin:0 0 4px;font-size:1.05rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .jk-artist{margin:0;font-size:.85rem;color:#d4a8ff;}
        .jk-bars{display:flex;align-items:flex-end;gap:3px;height:28px;margin:0 0 8px;}
        .jk-bars span{flex:1;background:#d4a8ff;border-radius:3px 3px 0 0;animation:jkbar .8s ease-in-out infinite alternate;}
        .jk-bar-0{animation-delay:0s;}.jk-bar-1{animation-delay:.1s;}.jk-bar-2{animation-delay:.2s;}
        .jk-bar-3{animation-delay:.3s;}.jk-bar-4{animation-delay:.4s;}.jk-bar-5{animation-delay:.5s;}
        .jk-bar-6{animation-delay:.6s;}.jk-bar-7{animation-delay:.7s;}
        @keyframes jkbar{from{height:6px;opacity:.4}to{height:24px;opacity:1}}
        .jk-progress-block{display:flex;align-items:center;gap:10px;margin:8px 0 14px;}
        .jk-time{font-family:monospace;font-size:.85rem;color:#d4a8ff;min-width:38px;user-select:none;}
        .jk-time:last-child{text-align:right;}
        .jk-progress-bar{flex:1;height:6px;background:rgba(255,255,255,.18);border-radius:6px;cursor:pointer;position:relative;}
        .jk-progress-bar:hover .jk-progress-thumb{opacity:1;}
        .jk-progress-fill{height:100%;background:#d4a8ff;border-radius:6px;pointer-events:none;will-change:width;}
        .jk-progress-thumb{position:absolute;top:50%;right:calc(100% - var(--pct,0%) - 6px);transform:translateY(-50%);width:13px;height:13px;background:#fff;border-radius:50%;box-shadow:0 0 6px #d4a8ff;opacity:0;transition:opacity .2s;pointer-events:none;}
        .jk-controls{display:flex;justify-content:center;gap:12px;margin:0 0 16px;}
        .jk-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:50%;width:42px;height:42px;font-size:1rem;cursor:pointer;transition:background .2s,transform .1s;}
        .jk-btn:hover{background:rgba(212,168,255,.25);transform:scale(1.08);}
        .jk-btn-main{width:52px;height:52px;font-size:1.2rem;background:rgba(212,168,255,.2);border-color:#d4a8ff;}
        .jk-dots{display:flex;justify-content:center;gap:8px;margin:0 0 12px;}
        .jk-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);cursor:pointer;transition:background .25s,transform .2s;}
        .jk-dot.active{transform:scale(1.35);}
        .jk-hint{text-align:center;font-size:.78rem;color:rgba(255,255,255,.35);margin:0;}
      `;
      document.head.appendChild(s);
    }

    this._uiReady = true;
  }

  // Conectar eventos a los botones (re-llama cada vez que abre el modal)
  _bindUI() {
    const $ = id => document.getElementById(id);

    $('jk-prev')?.addEventListener('click', () => this._nav(-1));
    $('jk-next')?.addEventListener('click', () => this._nav(+1));
    $('jk-play')?.addEventListener('click', () => this._togglePlay());

    // Barra de progreso — click para saltar
    $('jk-progress-bar')?.addEventListener('click', e => {
      if(!this._duration) return;
      const bar  = $('jk-progress-bar');
      const rect = bar.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seek = pct * this._duration;

      // Actualizar barra visualmente de inmediato (no esperar al fetch)
      const fill = $('jk-progress-fill');
      const cur  = $('jk-cur-time');
      if(fill) fill.style.width = `${pct * 100}%`;
      if(cur)  cur.textContent  = this._fmt(seek);

      this.playSong(this._songIndex, seek);
    });

    // Dots — click para ir a esa canción
    document.querySelectorAll('.jk-dot').forEach(d => {
      d.addEventListener('click', () => {
        const i = parseInt(d.dataset.idx);
        this.playSong(i, SONGS[i].startTime ?? 0);
      });
    });

    // Teclas ← → desde el modal (también manejadas en ModalManager)
    this._keyHandler = e => {
      if(e.key === 'ArrowLeft')  this._nav(-1);
      if(e.key === 'ArrowRight') this._nav(+1);
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _nav(dir) {
    const next = (this._songIndex + dir + SONGS.length) % SONGS.length;
    this.playSong(next, SONGS[next].startTime ?? 0);
  }

  _togglePlay() {
    if(this.isPlaying) this._stopCurrentSong(true);
    else               this.playSong(this._songIndex, SONGS[this._songIndex].startTime ?? 0);
  }

  /* ── Actualizar portada, título, dots, botón ─────────────── */
  _renderSong() {
    if(!this._uiReady) return;
    const song   = SONGS[this._songIndex];
    const cover  = document.getElementById('jk-cover');
    const title  = document.getElementById('jk-title');
    const artist = document.getElementById('jk-artist');
    const playBtn= document.getElementById('jk-play');
    const dots   = document.querySelectorAll('.jk-dot');
    const fill   = document.getElementById('jk-progress-fill');

    if(cover)   { cover.src = `media/Audio/Album/${song.cover}`; cover.alt = song.title; }
    if(title)   title.textContent  = song.title;
    if(artist)  artist.textContent = song.artist;
    if(playBtn) playBtn.innerHTML  = this.isPlaying ? '⏸' : '▶';
    if(fill && !this.isPlaying) fill.style.width = '0%';

    // Dots — el activo toma el color de la canción
    dots.forEach((d, i) => {
      const active = i === this._songIndex;
      d.classList.toggle('active', active);
      d.style.background = active ? (song.color ?? '#d4a8ff') : '';
    });
  }

  _el(tag, cls) {
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    return e;
  }

  // Llamar al cerrar el modal para limpiar listeners
  onModalClose() {
    this._cancelProgressLoop();
    if(this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }
}