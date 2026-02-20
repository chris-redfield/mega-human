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
        this.foregroundImg = null;

        // Enemies
        this.enemies = [];

        // Background fill color from map data
        this.bgColor = '#000';

        // HP bar layout: 'vertical' (classic MMX) or 'horizontal' (rotated 90° CW, top-left)
        this.hpBarLayout = 'vertical';
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
        this.foregroundImg = this.assets.getImage(`${this.stageName}_foreground`);

        // Parse background color from map data
        if (mapData.bgColorHex) {
            const hex = mapData.bgColorHex.toString(16).padStart(6, '0');
            this.bgColor = `#${hex}`;
        }

        // Per-stage spawn overrides (deathmatch spawn points don't always suit platformer start)
        const stageSpawns = {
            frozentown: { x: 133, y: 640 },
        };

        let spawnX = 100, spawnY = 80;
        if (stageSpawns[this.stageName]) {
            spawnX = stageSpawns[this.stageName].x;
            spawnY = stageSpawns[this.stageName].y;
        } else if (this.level.spawnPoints.length > 0) {
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

        // Per-stage enemy layouts
        const layouts = {
            highway: {
                tanks:   [{ x: 500, y: 100 }, { x: 900, y: 50 }, { x: 1300, y: 100 }],
                hoppers: [{ x: 650, y: 100 }, { x: 1100, y: 100 }],
                birds:   [{ x: 400, y: 60 },  { x: 800, y: 50 },  { x: 1200, y: 55 }],
            },
            frozentown: {
                tanks:   [{ x: 500, y: 150 }, { x: 900, y: 150 }, { x: 1400, y: 150 }],
                hoppers: [{ x: 340, y: 350 }, { x: 700, y: 350 }, { x: 1100, y: 330 }],
                birds:   [{ x: 600, y: 120 }, { x: 1000, y: 100 }, { x: 1500, y: 130 }],
            },
        };

        const layout = layouts[this.stageName] || layouts.highway;

        for (const pos of layout.tanks) {
            const tank = new TankEnemy(pos.x, pos.y);
            tank.spriteImage = enemySprite;
            tank.effectsImage = effectsSprite;
            this.enemies.push(tank);
        }

        for (const pos of layout.hoppers) {
            const hopper = new HopperEnemy(pos.x, pos.y);
            hopper.spriteImage = enemySprite;
            hopper.effectsImage = effectsSprite;
            this.enemies.push(hopper);
        }

        for (const pos of layout.birds) {
            const bird = new BirdEnemy(pos.x, pos.y);
            bird.spriteImage = enemySprite;
            bird.effectsImage = effectsSprite;
            this.enemies.push(bird);
        }
    }

    update(game) {
        // Toggle HP bar layout with L key
        if (game.input.rawKeys['KeyL'] && !this._prevKeyL) {
            this.hpBarLayout = this.hpBarLayout === 'vertical' ? 'horizontal' : 'vertical';
        }
        this._prevKeyL = !!game.input.rawKeys['KeyL'];

        this.player.update(game);

        // Kill zones — rectangular death pits + fallback killY
        if (!this.player.dead) {
            const px = this.player.x + this.player.hitboxX + this.player.hitboxW / 2;
            const py = this.player.y + this.player.hitboxY + this.player.hitboxH;
            let killed = py > this.level.killY;
            if (!killed) {
                for (const kz of this.level.killZones) {
                    if (px >= kz.x && px <= kz.x + kz.w && py >= kz.y && py <= kz.y + kz.h) {
                        killed = true;
                        break;
                    }
                }
            }
            if (killed) {
                this.player.hp = 0;
                this.player.state = 'die';
                this.player.dead = true;
                this.player.vx = 0;
                this.player.vy = 0;
            }
        }

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

        // Parallax layer (scrolls at half camera speed on both axes)
        if (this.parallaxImg) {
            const px = Math.floor(-this.camera.x * 0.5);
            const py = Math.floor(-this.camera.y * 0.5);
            ctx.drawImage(this.parallaxImg, px, py);
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

        // Foreground layer (drawn over player — lamp posts, pipes, etc.)
        if (this.foregroundImg) {
            ctx.drawImage(this.foregroundImg, Math.floor(-this.camera.x), Math.floor(-this.camera.y));
        }

        // Render HUD
        this._renderHUD(ctx);
    }

    _renderHUD(ctx) {
        const player = this.player;
        const ef = this.assets.getImage('effectsSprite');

        if (ef) {
            if (this.hpBarLayout === 'horizontal') {
                this._renderHealthBarHorizontal(ctx, ef, player);
            } else {
                this._renderHealthBar(ctx, ef, player);
            }
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

        const barX = 8;
        const maxHp = player.maxHp;
        const curHp = Math.ceil(player.hp);

        // Start from bottom: top margin (8) + cap (4) + cells (maxHp*2) + base (16)
        let y = 8 + CAP.sh + maxHp * FULL.sh + BASE.sh;

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

    /**
     * Horizontal HP bar — the vertical bar rotated 90° clockwise, placed at top-left.
     * Base piece on the left, cells extend right, cap on the right end.
     * Each sprite is individually rotated 90° CW so its original height becomes width.
     */
    _renderHealthBarHorizontal(ctx, ef, player) {
        const BASE  = { sx: 2,  sy: 55, sw: 14, sh: 16 };
        const FULL  = { sx: 2,  sy: 51, sw: 14, sh: 2 };
        const EMPTY = { sx: 2,  sy: 37, sw: 14, sh: 2 };
        const CAP   = { sx: 34, sy: 13, sw: 14, sh: 4 };

        const maxHp = player.maxHp;
        const curHp = Math.ceil(player.hp);

        // After 90° CW rotation, sprite dimensions swap:
        // Base: 14×16 → appears 16w×14h on screen
        // Cell: 14×2  → appears 2w×14h on screen
        // Cap:  14×4  → appears 4w×14h on screen
        const barY = 8;  // top margin
        let x = 8;       // left margin, advances rightward

        // Helper: draw a sprite rotated 90° CW at position (x, y)
        // where (x, y) is the top-left of the rotated sprite on screen.
        const drawRotatedCW = (spr, destX, destY) => {
            // Rotated dimensions: rw = spr.sh, rh = spr.sw
            const rw = spr.sh;
            const rh = spr.sw;
            ctx.save();
            // Move to center of destination rect
            ctx.translate(destX + rw / 2, destY + rh / 2);
            ctx.rotate(Math.PI / 2); // 90° CW
            // Draw centered at origin (in un-rotated sprite space)
            ctx.drawImage(ef, spr.sx, spr.sy, spr.sw, spr.sh,
                -spr.sw / 2, -spr.sh / 2, spr.sw, spr.sh);
            ctx.restore();
        };

        // Base piece (leftmost)
        drawRotatedCW(BASE, x, barY);
        x += BASE.sh; // advance by original height (now width)

        // Health cells left-to-right
        for (let i = 0; i < maxHp; i++) {
            const cell = i < curHp ? FULL : EMPTY;
            drawRotatedCW(cell, x, barY);
            x += cell.sh;
        }

        // Top cap (rightmost)
        drawRotatedCW(CAP, x, barY);
    }
}
