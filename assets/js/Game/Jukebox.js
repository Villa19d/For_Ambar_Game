/* ═══════════════════════════════════════════════════════════
   Game/Jukebox.js  —  Rocola con audio real y carátulas
   ═══════════════════════════════════════════════════════════ */

class Jukebox {
    constructor(audioContext) {
        this.audioContext = audioContext;  // Usar el que recibimos
        this.currentSource = null;
        this.baseSource = null;
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.isBasePlaying = false;
        this.progressInterval = null;
        this.initialized = false;
        this.gainNode = null;
        this.baseGainNode = null; // Control independiente para base


         // Crear nodo de ganancia para controlar volumen
        if (this.audioContext) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            
            this.baseGainNode = this.audioContext.createGain();
            this.baseGainNode.connect(this.audioContext.destination);
        }
    }

     async startBaseMusic() {
        if (this.initialized || !this.audioContext) return;
        this.initialized = true;
        
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            await this._loadBaseSong();
        } catch (error) {
            console.error('Error iniciando música base:', error);
        }
    }

      async _loadBaseSong() {
        try {
            const response = await fetch(`media/Audio/${BASE_SONG.file}`);
            const arrayBuffer = await response.arrayBuffer();
            
            if (!this.audioContext) return;
            
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.baseSource = this.audioContext.createBufferSource();
            this.baseSource.buffer = audioBuffer;
            this.baseSource.loop = true;
            
            this.baseSource.connect(this.baseGainNode);
            this.baseGainNode.gain.value = BASE_SONG.volume;
            
            this.baseSource.start(0);
            this.isBasePlaying = true;
            console.log('✅ Canción base sonando');
            
        } catch (error) {
            console.error('Error cargando canción base:', error);
        }
    }

    

     async playSong(index, startTime = 0) {
        if (!this.audioContext) return;
        
        // DETENER TODO antes de reproducir nueva canción
        this._stopAllMusic();
        
        const song = SONGS[index];
        this.currentSongIndex = index;
        
        try {
            const response = await fetch(`media/Audio/${song.file}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = audioBuffer;
            this.currentSource.loop = true;
            
            this.currentSource.connect(this.gainNode);
            this.gainNode.gain.value = 0.8;
            
            // Iniciar en el tiempo específico
            this.currentSource.start(0, startTime);
            this.isPlaying = true;
            
            // Actualizar UI SOLO si los elementos existen
            this._safeUpdateUI(song);
            
            // Iniciar tracking de progreso
            this._startProgressTracking(song, startTime);
            
        } catch (error) {
            console.error('Error cargando canción:', error);
        }
    }

     _stopAllMusic() {
        // Detener canción actual si existe
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {}
            this.currentSource = null;
        }
        
        // Silenciar base completamente
        if (this.baseGainNode) {
            this.baseGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
        
        this.isPlaying = false;
        clearInterval(this.progressInterval);
    }



    stopCurrentSong(returnToBase = true) {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {}
            this.currentSource = null;
            this.isPlaying = false;
            clearInterval(this.progressInterval);
        }
        
        // Restaurar volumen base si se solicita
        if (returnToBase && this.baseGainNode) {
            this.baseGainNode.gain.setValueAtTime(BASE_SONG.volume, this.audioContext.currentTime);
            this.isBasePlaying = true;
        }
        
        // Actualizar UI SOLO si existe
        this._safeResetUI();
    }

    _safeUpdateUI(song) {
        const coverImg = document.getElementById('jukebox-cover');
        const titleEl = document.getElementById('jukebox-song-title');
        const artistEl = document.getElementById('jukebox-artist');
        const playBtn = document.getElementById('jukebox-play');
        
        if (coverImg) coverImg.src = `media/Audio/Album/${song.cover}`;
        if (titleEl) titleEl.textContent = song.title;
        if (artistEl) artistEl.textContent = song.artist;
        if (playBtn) playBtn.innerHTML = '⏸ Pausa';
    }

    _safeResetUI() {
        const progressFill = document.getElementById('jukebox-progress');
        const currentTime = document.getElementById('jukebox-current-time');
        const playBtn = document.getElementById('jukebox-play');
        
        if (progressFill) progressFill.style.width = '0%';
        if (currentTime) currentTime.textContent = '0:00';
        if (playBtn) playBtn.innerHTML = '▶ Play';
    }

    _startProgressTracking(song, startTime) {
        // Limpiar intervalo anterior
        clearInterval(this.progressInterval);
        
        const startSeconds = startTime;
        let currentSeconds = startSeconds;
        const totalSeconds = 180; // TODO: obtener duración real
        
        const progressFill = document.getElementById('jukebox-progress');
        const currentTimeEl = document.getElementById('jukebox-current-time');
        const totalTimeEl = document.getElementById('jukebox-total-time');
        
        // VERIFICAR que los elementos existen ANTES de usarlos
        if (!progressFill || !currentTimeEl || !totalTimeEl) {
            console.warn('Elementos de UI de jukebox no encontrados');
            return;
        }
        
        totalTimeEl.textContent = this._formatTime(totalSeconds);
        
        this.progressInterval = setInterval(() => {
            currentSeconds += 0.1;
            if (currentSeconds >= totalSeconds) {
                currentSeconds = 0;
            }
            
            const percent = (currentSeconds / totalSeconds) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeEl.textContent = this._formatTime(currentSeconds);
            
        }, 100);
    }

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    _updateCover(song) {
        const coverImg = document.getElementById('jukebox-cover');
        if (coverImg) {
            coverImg.src = `media/Audio/Album/${song.cover}`;
            coverImg.alt = song.title;
        }
    }

    _updateSongInfo(song) {
        const titleEl = document.getElementById('jukebox-song-title');
        const artistEl = document.getElementById('jukebox-artist');
        
        if (titleEl) titleEl.textContent = song.title;
        if (artistEl) artistEl.textContent = song.artist;
    }

    _setupUI() {
        // Crear elementos UI si no existen
        if (!document.getElementById('jukebox-controls')) {
            this._createJukeboxUI();
        }
        
        // Botones de navegación
        document.getElementById('jukebox-prev')?.addEventListener('click', () => {
            const newIndex = (this.currentSongIndex - 1 + SONGS.length) % SONGS.length;
            this.playSong(newIndex, SONGS[newIndex].startTime);
        });
        
        document.getElementById('jukebox-next')?.addEventListener('click', () => {
            const newIndex = (this.currentSongIndex + 1) % SONGS.length;
            this.playSong(newIndex, SONGS[newIndex].startTime);
        });
        
        // Control de reproducción
        document.getElementById('jukebox-play')?.addEventListener('click', () => {
            if (this.isPlaying) {
                this.stopCurrentSong();
            } else {
                this.playSong(this.currentSongIndex, SONGS[this.currentSongIndex].startTime);
            }
        });
    }

    _createJukeboxUI() {
        const modal = document.getElementById('jukebox');
        if (!modal) return;
        
        const panel = modal.querySelector('.jukebox-panel');
        
        // Agregar carátula
        const coverDiv = document.createElement('div');
        coverDiv.className = 'jukebox-cover-container';
        coverDiv.innerHTML = `
            <img id="jukebox-cover" class="jukebox-cover" src="media/Audio/Album/Daises.jpg" alt="Cover">
            <div class="jukebox-info">
                <h3 id="jukebox-song-title">DAISIES</h3>
                <p id="jukebox-artist">Black Pumas</p>
            </div>
        `;
        
        // Barra de progreso
        const progressDiv = document.createElement('div');
        progressDiv.className = 'jukebox-progress-container';
        progressDiv.innerHTML = `
            <div class="jukebox-time current" id="jukebox-current-time">1:05</div>
            <div class="jukebox-progress-bar">
                <div class="jukebox-progress-fill" id="jukebox-progress" style="width: 0%"></div>
            </div>
            <div class="jukebox-time total" id="jukebox-total-time">3:00</div>
        `;
        
        // Botón de play/pause
        const playBtn = document.createElement('button');
        playBtn.id = 'jukebox-play';
        playBtn.className = 'jukebox-btn jukebox-btn--main';
        playBtn.innerHTML = '▶ Play';
        
        // Reorganizar controles
        const controlsDiv = modal.querySelector('.jukebox-controls');
        if (controlsDiv) {
            controlsDiv.prepend(playBtn);
        }
        
        // Insertar en el panel
        const displayDiv = modal.querySelector('.jukebox-display');
        if (displayDiv) {
            displayDiv.after(coverDiv);
            coverDiv.after(progressDiv);
        }
        
        // Agregar estilos
        this._addStyles();
    }

    _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .jukebox-cover-container {
                display: flex;
                align-items: center;
                gap: 20px;
                margin: 20px 0;
                padding: 15px;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
            }
            
            .jukebox-cover {
                width: 80px;
                height: 80px;
                border-radius: 8px;
                object-fit: cover;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            }
            
            .jukebox-info {
                flex: 1;
            }
            
            .jukebox-info h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #fff;
            }
            
            .jukebox-info p {
                margin: 5px 0 0;
                font-size: 0.9rem;
                color: #d4a8ff;
            }
            
            .jukebox-progress-container {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 20px 0;
            }
            
            .jukebox-progress-bar {
                flex: 1;
                height: 6px;
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
                cursor: pointer;
                position: relative;
            }
            
            .jukebox-progress-fill {
                height: 100%;
                background: #d4a8ff;
                border-radius: 3px;
                transition: width 0.1s linear;
            }
            
            .jukebox-time {
                font-family: monospace;
                font-size: 0.9rem;
                color: #d4a8ff;
                min-width: 45px;
            }
            
            .jukebox-time.total {
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }
}