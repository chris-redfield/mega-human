/**
 * gameplay.js
 * Main gameplay state — handles player, level, camera, and rendering.
 * Uses pre-rendered PNG backgrounds from MMX-Deathmatch stage assets.
 */

import { Camera, SCREEN_W, SCREEN_H } from '../engine/camera.js';
import { Player } from '../entities/player.js';
import { createLevelFromMap } from '../levels/level.js';

export class GameplayState {
    constructor(assets, stageName) {
        this.assets = assets;
        this.stageName = stageName;
        this.player = null;
        this.level = null;
        this.camera = null;

        // Stage image layers
        this.backgroundImg = null;
        this.backwallImg = null;
        this.parallaxImg = null;

        // Background fill color from map data
        this.bgColor = '#000';
    }

    init(game) {
        // Load map data and build level
        const mapData = this.assets.getJSON(`${this.stageName}_map`);
        this.level = createLevelFromMap(mapData);
        this.camera = new Camera(this.level.width, this.level.height);

        // Load stage images
        this.backgroundImg = this.assets.getImage(`${this.stageName}_background`);
        this.backwallImg = this.assets.getImage(`${this.stageName}_backwall`);
        this.parallaxImg = this.assets.getImage(`${this.stageName}_parallax`);

        // Parse background color from map data
        if (mapData.bgColorHex) {
            const hex = mapData.bgColorHex.toString(16).padStart(6, '0');
            this.bgColor = `#${hex}`;
        }

        // Pick a spawn point (first non-race spawn, or fallback)
        let spawnX = 100, spawnY = 80;
        if (this.level.spawnPoints.length > 0) {
            const sp = this.level.spawnPoints[0];
            spawnX = sp.x;
            spawnY = sp.y;
        }

        // Spawn player
        this.player = new Player(spawnX, spawnY);
        this.player.spriteImage = this.assets.getImage('playerSprite');
        this.player.effectsImage = this.assets.getImage('effectsSprite');

        // Expose on game object
        game.level = this.level;
        game.camera = this.camera;
    }

    update(game) {
        this.player.update(game);
        this.camera.follow(this.player);
    }

    render(ctx, game) {
        // Background fill color
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        // Parallax layer (scrolls at half camera speed)
        if (this.parallaxImg) {
            const px = Math.floor(-this.camera.x * 0.5);
            ctx.drawImage(this.parallaxImg, px, 0);
        }

        // Backwall layer (scrolls 1:1 with camera, drawn behind main background)
        if (this.backwallImg) {
            ctx.drawImage(this.backwallImg, Math.floor(-this.camera.x), Math.floor(-this.camera.y));
        }

        // Main background layer (scrolls 1:1 with camera)
        if (this.backgroundImg) {
            ctx.drawImage(this.backgroundImg, Math.floor(-this.camera.x), Math.floor(-this.camera.y));
        }

        // Render player
        this.player.render(ctx, this.camera);

        // Render HUD
        this._renderHUD(ctx);
    }

    _renderHUD(ctx) {
        const player = this.player;

        // Health bar background
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 8, 52, 10);

        // Health bar fill
        const hpPercent = player.hp / player.maxHp;
        const hpColor = hpPercent > 0.5 ? '#00cc44' : hpPercent > 0.25 ? '#cccc00' : '#cc0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(9, 9, Math.floor(50 * hpPercent), 8);

        // Health bar border
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(8.5, 8.5, 51, 9);

        // State debug text
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.fillText(`${player.state} vx:${player.vx.toFixed(1)} vy:${player.vy.toFixed(1)}`, 8, SCREEN_H - 8);
    }
}
