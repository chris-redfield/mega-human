/**
 * audio.js
 * Lightweight Web Audio API sound manager — SFX + Music.
 * AudioContext is created lazily on first user gesture (click/key/gamepad).
 * Audio files are fetched as raw ArrayBuffers during loading, then decoded
 * on demand once the AudioContext exists.
 */

const DUP_GUARD_MS = 33; // ~2 frames at 60fps — prevents rapid-fire spam

export class AudioManager {
    constructor() {
        this.ctx = null;         // AudioContext, created on first user gesture
        this.buffers = {};       // name → AudioBuffer (decoded)
        this._rawBuffers = {};   // name → ArrayBuffer (pre-decoded, waiting for ctx)
        this.musicMeta = {};     // name → { loopStart, loopEnd }
        this.sfxGain = null;     // GainNode for all SFX
        this.musicGain = null;   // GainNode for music
        this.musicSource = null; // Currently playing music source
        this.musicName = '';
        this.looping = {};       // name → AudioBufferSourceNode (for charge loop etc.)
        this._lastPlay = {};     // name → timestamp (duplicate guard)
        this._resumed = false;
        this._pendingMusic = ''; // music to start once ctx is ready
    }

    /**
     * Create AudioContext and decode any pending raw buffers.
     * Called on first user interaction — NOT during page load.
     */
    _ensureCtx() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.ctx.destination);

        // Decode all pre-fetched raw buffers now that we have a context
        for (const [name, arrayBuf] of Object.entries(this._rawBuffers)) {
            this.ctx.decodeAudioData(arrayBuf.slice(0)).then(decoded => {
                this.buffers[name] = decoded;
                // If music was waiting for this buffer, start it
                if (this._pendingMusic === name) {
                    this._pendingMusic = '';
                    this.playMusic(name);
                }
            }).catch(e => {
                console.warn(`Audio decode failed: ${name}`, e);
            });
        }
    }

    /**
     * Resume AudioContext after user interaction (browser autoplay policy).
     * Call every frame from the game loop — creates ctx on first real input.
     */
    resume() {
        if (this._resumed) return;
        this._ensureCtx();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this._resumed = true;
    }

    /**
     * Fetch a single audio file as raw ArrayBuffer (no AudioContext needed).
     * Decoding happens later when _ensureCtx() is called.
     * @param {string} name - Cache key
     * @param {string} url - File URL
     */
    async load(name, url) {
        try {
            const resp = await fetch(url);
            if (!resp.ok) { console.warn(`Audio load failed: ${url}`); return; }
            this._rawBuffers[name] = await resp.arrayBuffer();
            this._parseMusicMeta(name, url);
        } catch (e) {
            console.warn(`Audio fetch failed: ${url}`, e);
        }
    }

    /**
     * Batch-load multiple audio files.
     * @param {Object<string,string>} manifest - { name: url, ... }
     */
    async loadAll(manifest) {
        await Promise.all(
            Object.entries(manifest).map(([name, url]) => this.load(name, url))
        );
    }

    /** Extract loop points encoded in music filenames. */
    _parseMusicMeta(name, url) {
        const filename = url.split('/').pop().replace(/\.\w+$/, '');
        const parts = filename.split('.');
        if (parts.length >= 3) {
            const start = parseFloat(parts[1].replace(',', '.'));
            const end = parseFloat(parts[2].replace(',', '.'));
            if (!isNaN(start) && !isNaN(end) && end > 0) {
                this.musicMeta[name] = { loopStart: start, loopEnd: end };
            }
        }
    }

    /**
     * Play a one-shot SFX. Fire-and-forget.
     * @param {string} name - Buffer key
     * @param {object} [opts] - { volume: 0-1 }
     */
    play(name, opts) {
        if (!this.ctx || !this.buffers[name]) return;
        const now = performance.now();
        if (now - (this._lastPlay[name] || 0) < DUP_GUARD_MS) return;
        this._lastPlay[name] = now;

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        if (opts && opts.volume !== undefined) {
            const g = this.ctx.createGain();
            g.gain.value = opts.volume;
            source.connect(g).connect(this.sfxGain);
        } else {
            source.connect(this.sfxGain);
        }
        source.start();
    }

    /**
     * Start a looping SFX (e.g. charge loop). Only one instance per name.
     * @param {string} name - Buffer key
     */
    playLoop(name) {
        if (!this.ctx || !this.buffers[name] || this.looping[name]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = true;
        source.connect(this.sfxGain);
        source.start();
        this.looping[name] = source;
    }

    /** Stop a looping SFX. */
    stopLoop(name) {
        const src = this.looping[name];
        if (src) {
            src.stop();
            delete this.looping[name];
        }
    }

    /** Stop all looping SFX (e.g. on death/hurt). */
    stopAllLoops() {
        for (const name of Object.keys(this.looping)) {
            this.stopLoop(name);
        }
    }

    /**
     * Play a music track with optional looping at parsed loop points.
     * Stops any currently playing music first.
     * @param {string} name - Buffer key
     */
    playMusic(name) {
        // If context isn't ready yet, remember the request
        if (!this.ctx) {
            this._pendingMusic = name;
            return;
        }
        if (!this.buffers[name]) {
            // Buffer not decoded yet — remember and it will start after decode
            this._pendingMusic = name;
            return;
        }
        if (this.musicName === name && this.musicSource) return;

        this._stopMusicImmediate();

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];

        const meta = this.musicMeta[name];
        if (meta) {
            source.loop = true;
            source.loopStart = meta.loopStart;
            source.loopEnd = meta.loopEnd;
        }

        source.connect(this.musicGain);
        source.start();
        this.musicSource = source;
        this.musicName = name;
        this.musicGain.gain.value = 0.35;
    }

    /**
     * Fade out and stop current music.
     * @param {number} [fadeMs=500] - Fade duration in ms
     */
    stopMusic(fadeMs = 500) {
        if (!this.musicSource || !this.ctx) return;
        const gain = this.musicGain.gain;
        gain.setValueAtTime(gain.value, this.ctx.currentTime);
        gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeMs / 1000);
        const src = this.musicSource;
        this.musicSource = null;
        this.musicName = '';
        setTimeout(() => { try { src.stop(); } catch (_) {} }, fadeMs + 50);
    }

    /** Immediately stop music (no fade). */
    _stopMusicImmediate() {
        if (this.musicSource) {
            try { this.musicSource.stop(); } catch (_) {}
            this.musicSource = null;
            this.musicName = '';
        }
    }

    /** Set SFX volume (0-1). */
    setSFXVolume(v) {
        if (this.sfxGain) this.sfxGain.gain.value = v;
    }

    /** Set music volume (0-1). */
    setMusicVolume(v) {
        if (this.musicGain) this.musicGain.gain.value = v;
    }
}
