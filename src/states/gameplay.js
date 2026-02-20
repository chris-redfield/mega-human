/**
 * gameplay.js
 * Main gameplay state — handles player, enemies, level, camera, and rendering.
 * Uses pre-rendered PNG backgrounds from MMX-Deathmatch stage assets.
 */

import { Camera, SCREEN_W, SCREEN_H } from '../engine/camera.js';
import { Player } from '../entities/player.js';
import { TankEnemy } from '../entities/tank-enemy.js';
import { HopperEnemy } from '../entities/hopper-enemy.js';
import { BirdEnemy } from '../entities/bird-enemy.js';
import { boxOverlap } from '../entities/entity.js';
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

        // Enemies
        this.enemies = [];

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

        // Spawn enemies — place a few tanks along the stage
        this._spawnEnemies();

        // Expose on game object
        game.level = this.level;
        game.camera = this.camera;
        game.state = this; // So enemies can access player via game.state.player
    }

    _spawnEnemies() {
        const enemySprite = this.assets.getImage('tankSprite'); // sigma_viral.png (all enemies)
        const effectsSprite = this.assets.getImage('effectsSprite');

        // Place tanks at fixed positions along the highway stage
        const tankPositions = [
            { x: 500, y: 100 },
            { x: 900, y: 100 },
            { x: 1300, y: 100 },
        ];

        for (const pos of tankPositions) {
            const tank = new TankEnemy(pos.x, pos.y);
            tank.spriteImage = enemySprite;
            tank.effectsImage = effectsSprite;
            this.enemies.push(tank);
        }

        // Place hoppers — they jump and melee attack
        const hopperPositions = [
            { x: 650, y: 100 },
            { x: 1100, y: 100 },
        ];

        for (const pos of hopperPositions) {
            const hopper = new HopperEnemy(pos.x, pos.y);
            hopper.spriteImage = enemySprite;
            hopper.effectsImage = effectsSprite;
            this.enemies.push(hopper);
        }

        // Place birds — they fly and swoop toward the player
        const birdPositions = [
            { x: 400, y: 60 },
            { x: 800, y: 50 },
            { x: 1200, y: 55 },
        ];

        for (const pos of birdPositions) {
            const bird = new BirdEnemy(pos.x, pos.y);
            bird.spriteImage = enemySprite;
            bird.effectsImage = effectsSprite;
            this.enemies.push(bird);
        }
    }

    update(game) {
        this.player.update(game);

        // Update enemies
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            enemy.update(game);

            // Enemy ↔ player collision (contact + projectile damage)
            enemy.checkPlayerCollision(this.player);
        }

        // Player shots ↔ enemies collision
        this._checkPlayerShotsVsEnemies();

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.active);

        this.camera.follow(this.player);
    }

    _checkPlayerShotsVsEnemies() {
        for (const shot of this.player.shots) {
            if (!shot.active || shot.fading) continue;

            for (const enemy of this.enemies) {
                if (!enemy.active || enemy.state === 'dying') continue;

                const enemyBox = enemy.getHitbox();
                const shotBox = {
                    x: shot.x - 4, y: shot.y - 3,
                    w: 8, h: 6,
                };

                // Use larger hitbox for charged shots
                if (shot.type === 'charge1') {
                    shotBox.x = shot.x - 10; shotBox.y = shot.y - 8;
                    shotBox.w = 20; shotBox.h = 16;
                } else if (shot.type === 'charge2') {
                    shotBox.x = shot.x - 16; shotBox.y = shot.y - 14;
                    shotBox.w = 32; shotBox.h = 28;
                }

                if (boxOverlap(shotBox, enemyBox)) {
                    enemy.onHit(shot.damage);
                    // Play fade/hit animation (same as wall hit)
                    shot.fading = true;
                    shot.fadeFrame = 0;
                    shot.fadeTimer = 0;
                    shot.vx = 0;
                    break; // Each shot only hits one enemy
                }
            }
        }
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

        // Render enemies
        for (const enemy of this.enemies) {
            if (enemy.active) enemy.render(ctx, this.camera);
        }

        // Render player (on top of enemies)
        this.player.render(ctx, this.camera);

        // Render HUD
        this._renderHUD(ctx);
    }

    _renderHUD(ctx) {
        const player = this.player;
        const ef = this.assets.getImage('effectsSprite');

        if (ef) {
            this._renderHealthBar(ctx, ef, player);
        }
    }

    /**
     * Classic MMX vertical segmented health bar.
     * Sprites from effects.png: base (14x16), full cell (14x2), empty cell (14x2), top cap (14x4).
     * Drawn bottom-to-top on the left side of the screen.
     */
    _renderHealthBar(ctx, ef, player) {
        // HP bar sprite rects from effects.png
        const BASE  = { sx: 2,  sy: 55, sw: 14, sh: 16 }; // X character base piece
        const FULL  = { sx: 2,  sy: 51, sw: 14, sh: 2 };  // Filled cell
        const EMPTY = { sx: 2,  sy: 37, sw: 14, sh: 2 };  // Empty cell
        const CAP   = { sx: 34, sy: 13, sw: 14, sh: 4 };  // Top cap

        const barX = 10;
        const maxHp = player.maxHp;
        const curHp = Math.ceil(player.hp);

        // Start from bottom: base piece at vertical center + offset
        let y = Math.floor(SCREEN_H / 2) + 25;

        // Draw base piece (bottom, contains character icon)
        ctx.drawImage(ef, BASE.sx, BASE.sy, BASE.sw, BASE.sh,
            barX, y - BASE.sh, BASE.sw, BASE.sh);

        // Move up past base
        y -= BASE.sh;

        // Draw cells bottom-to-top (cell 0 = bottom, cell maxHp-1 = top)
        for (let i = 0; i < maxHp; i++) {
            const cell = i < curHp ? FULL : EMPTY;
            ctx.drawImage(ef, cell.sx, cell.sy, cell.sw, cell.sh,
                barX, y - cell.sh, cell.sw, cell.sh);
            y -= cell.sh;
        }

        // Draw top cap
        ctx.drawImage(ef, CAP.sx, CAP.sy, CAP.sw, CAP.sh,
            barX, y - CAP.sh, CAP.sw, CAP.sh);
    }
}
