/**
 * game.js
 * Main game loop with fixed 60fps timestep.
 * SNES runs at 60.098 fps (NTSC) — we use 60fps for simplicity.
 */

import { Input } from './input.js';
import { AudioManager } from './audio.js';
import { SCREEN_W, SCREEN_H } from './camera.js';

const TIMESTEP = 1000 / 60;
const MAX_FRAME_SKIP = 5;

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Internal resolution matches SNES
        this.canvas.width = SCREEN_W;
        this.canvas.height = SCREEN_H;

        this.input = new Input();
        this.audio = new AudioManager();
        this.camera = null;
        this.state = null;

        // AudioContext must be created/resumed inside a user gesture handler.
        const resumeAudio = () => { this.audio.resume(); };
        window.addEventListener('keydown', resumeAudio);
        window.addEventListener('mousedown', resumeAudio);

        this.accumulator = 0;
        this.lastTime = 0;
        this.running = false;
        this.frameCount = 0;
    }

    /** Set the active game state (e.g., gameplay, menu). */
    setState(state) {
        this.state = state;
        if (state && state.init) state.init(this);
    }

    /** Start the game loop. */
    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    }

    /** Stop the game loop. */
    stop() {
        this.running = false;
    }

    _loop(currentTime) {
        if (!this.running) return;

        const delta = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulator += delta;

        // Cap accumulator to prevent spiral of death
        if (this.accumulator > TIMESTEP * MAX_FRAME_SKIP) {
            this.accumulator = TIMESTEP * MAX_FRAME_SKIP;
        }

        // Fixed timestep updates
        while (this.accumulator >= TIMESTEP) {
            this.input.poll();
            if (this.state && this.state.update) {
                this.state.update(this);
            }
            this.accumulator -= TIMESTEP;
            this.frameCount++;
        }

        // Render
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        if (this.state && this.state.render) {
            this.state.render(this.ctx, this);
        }

        requestAnimationFrame((t) => this._loop(t));
    }
}
