/**
 * gameplay.js
 * Main gameplay state — handles player, enemies, level, camera, and rendering.
 * Uses pre-rendered PNG backgrounds from MMX-Deathmatch stage assets.
 */

import { Camera, SCREEN_W, SCREEN_H } from '../engine/camera.js';
import { Player } from '../entities/player.js';
import { Zero } from '../entities/zero.js';
import { TankEnemy } from '../entities/tank-enemy.js';
import { HopperEnemy } from '../entities/hopper-enemy.js';
import { BirdEnemy } from '../entities/bird-enemy.js';
import { boxOverlap } from '../entities/entity.js';
import { HealthPickup } from '../entities/health-pickup.js';
import { ChillPenguin } from '../entities/chill-penguin.js';
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

        // Health pickups
        this.pickups = [];

        // Heal queue: ticks +1 HP every 3 frames
        this.healTickTimer = 0;

        // Boss entity (only on boss stages)
        this.boss = null;

        // Background fill color from map data
        this.bgColor = '#000';

        // Character selection: 'x' or 'zero'
        this.characterId = 'x';
        this._prevKeyTab = false;

        // HP bar layout: 'vertical' (classic MMX) or 'horizontal' (rotated 90° CW, top-left)
        this.hpBarLayout = 'vertical';

        // Debug overlay (toggled with P key)
        this.debugMode = false;
        this._prevKeyP = false;
        this._fpsFrames = 0;
        this._fpsTime = 0;
        this._fpsDisplay = 0;

        // Respawn system
        this.spawnX = 0;
        this.spawnY = 0;
        this.respawnState = null;  // null | 'fadeOut' | 'hold' | 'fadeIn'
        this.respawnTimer = 0;
        this.fadeAlpha = 0;        // 0 = clear, 1 = full black
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

        // Store spawn point for respawning
        this.spawnX = spawnX;
        this.spawnY = spawnY;

        // Spawn player (character based on selection)
        this.player = this._createPlayer(spawnX, spawnY);

        // Spawn enemies — place a few tanks along the stage
        this._spawnEnemies();

        // Spawn fixed health pickups from map data
        this._spawnMapPickups();

        // Init heal queue on player
        this.player.healQueue = 0;

        // Expose on game object
        game.level = this.level;
        game.camera = this.camera;
        game.state = this; // So enemies can access player via game.state.player
        this.audio = game.audio;

        // Start stage music
        if (this.audio) this.audio.playMusic(this.stageName);
    }

    _createPlayer(x, y) {
        let player;
        if (this.characterId === 'zero') {
            player = new Zero(x, y);
            player.spriteImage = this.assets.getImage('zeroSprite');
        } else {
            player = new Player(x, y);
            player.spriteImage = this.assets.getImage('playerSprite');
        }
        player.effectsImage = this.assets.getImage('effectsSprite');
        return player;
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

        // Boss spawn (frozentown only)
        const bossSpawns = {
            frozentown: { x: 1650, y: 150 },
        };
        if (bossSpawns[this.stageName]) {
            const pos = bossSpawns[this.stageName];
            const boss = new ChillPenguin(pos.x, pos.y);
            boss.spriteImage = this.assets.getImage('mavericksSprite');
            boss.effectsImage = this.assets.getImage('effectsSprite');
            this.boss = boss;
        }
    }

    _spawnMapPickups() {
        const effectsSprite = this.assets.getImage('effectsSprite');
        for (const hp of this.level.healthPickups) {
            const pickup = new HealthPickup(hp.x, hp.y, hp.size, false);
            pickup.effectsImage = effectsSprite;
            this.pickups.push(pickup);
        }
    }

    _spawnEnemyDrop(x, y) {
        let size;
        if (Math.random() < 0.1) {
            size = 'large';            // 10% large health
        } else if (Math.random() < 0.3) {
            size = 'small';            // 30% small health (if no large)
        } else {
            return;                    // No drop
        }
        const effectsSprite = this.assets.getImage('effectsSprite');
        const pickup = new HealthPickup(x, y, size, true);
        pickup.effectsImage = effectsSprite;
        this.pickups.push(pickup);
    }

    update(game) {
        // Toggle HP bar layout with L key
        if (game.input.rawKeys['KeyL'] && !this._prevKeyL) {
            this.hpBarLayout = this.hpBarLayout === 'vertical' ? 'horizontal' : 'vertical';
        }
        this._prevKeyL = !!game.input.rawKeys['KeyL'];

        // Toggle character with Tab key (respawns as new character)
        if (game.input.rawKeys['Tab'] && !this._prevKeyTab) {
            this.characterId = this.characterId === 'x' ? 'zero' : 'x';
            this._resetPlayerAtSpawn();
            this.player.warpBeamActive = true;
            this.player.warpBeamY = this.player.y - 200;
            this.camera.follow(this.player);
        }
        this._prevKeyTab = !!game.input.rawKeys['Tab'];

        // Toggle debug overlay with P key
        if (game.input.rawKeys['KeyP'] && !this._prevKeyP) {
            this.debugMode = !this.debugMode;
        }
        this._prevKeyP = !!game.input.rawKeys['KeyP'];

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
                this.player.dieTimer = 0;
                this.player.diePhase = 0;
                this.player.dieSparks = null;
                this.player.dieParticles = [];
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

        // Sword hitbox ↔ enemies collision (Zero only)
        this._checkSwordVsEnemies();

        // Remove dead enemies, spawn drops
        for (const enemy of this.enemies) {
            if (!enemy.active) {
                const cx = enemy.x + enemy.hitboxX + enemy.hitboxW / 2;
                const cy = enemy.y + enemy.hitboxY + enemy.hitboxH;
                this._spawnEnemyDrop(cx, cy);
            }
        }
        this.enemies = this.enemies.filter(e => e.active);

        // Update boss
        if (this.boss && this.boss.active) {
            this.boss.update(game);
            this.boss.checkPlayerCollision(this.player);
        }
        if (this.boss && !this.boss.active) {
            this.boss = null;
        }

        // Player shots vs boss
        this._checkPlayerShotsVsBoss();

        // Update pickups
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            pickup.update(game);

            // Check player overlap for collection
            if (!this.player.dead && this.player.hp < this.player.maxHp) {
                const pBox = this.player.getHitbox();
                const pickBox = pickup.getHitbox();
                if (boxOverlap(pBox, pickBox)) {
                    pickup.active = false;
                    this.player.healQueue = (this.player.healQueue || 0) + pickup.healAmount;
                    if (this.audio) this.audio.play('heal');
                }
            }
        }
        this.pickups = this.pickups.filter(p => p.active);

        // Heal queue tick: +1 HP every 3 frames
        if (this.player.healQueue > 0) {
            this.healTickTimer++;
            if (this.healTickTimer >= 3) {
                this.healTickTimer = 0;
                this.player.healQueue--;
                this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
            }
        } else {
            this.healTickTimer = 0;
        }

        // Respawn state machine
        if (this.respawnState) {
            this._updateRespawn();
        } else if (this.player.dead && this.player.diePhase === 2) {
            // Death effect finished — start fade out
            this.respawnState = 'fadeOut';
            this.respawnTimer = 0;
        }

        this.camera.follow(this.player);
    }

    _updateRespawn() {
        this.respawnTimer++;
        const FADE_OUT_DUR = 40;   // Frames to fade to black
        const HOLD_DUR = 30;       // Frames to hold black
        const FADE_IN_DUR = 40;    // Frames to fade back in

        switch (this.respawnState) {
            case 'fadeOut':
                this.fadeAlpha = Math.min(1, this.respawnTimer / FADE_OUT_DUR);
                if (this.respawnTimer === 1 && this.audio) {
                    this.audio.stopMusic(600);
                }
                if (this.respawnTimer >= FADE_OUT_DUR) {
                    this.respawnState = 'hold';
                    this.respawnTimer = 0;
                    this._resetPlayerAtSpawn();
                }
                break;

            case 'hold':
                this.fadeAlpha = 1;
                if (this.respawnTimer >= HOLD_DUR) {
                    this.respawnState = 'fadeIn';
                    this.respawnTimer = 0;
                }
                break;

            case 'fadeIn':
                this.fadeAlpha = Math.max(0, 1 - this.respawnTimer / FADE_IN_DUR);
                if (this.respawnTimer === 1 && this.audio) {
                    this.audio.playMusic(this.stageName);
                }
                if (this.respawnTimer >= FADE_IN_DUR) {
                    this.respawnState = null;
                    this.fadeAlpha = 0;
                    // Now start the warp beam after screen is visible
                    this.player.warpBeamActive = true;
                    this.player.warpBeamY = this.player.y - 200;
                }
                break;
        }
    }

    _resetPlayerAtSpawn() {
        // Create fresh player of the selected character
        this.player = this._createPlayer(this.spawnX, this.spawnY);
        const p = this.player;
        p.healQueue = 0;

        // Warp beam — don't start yet, wait for fade-in to complete
        p.warpBeamY = p.y - 200;
        p.warpBeamActive = false;
        p.warpVisible = false;

        // Re-spawn enemies and pickups
        this.enemies = [];
        this.pickups = [];
        this._spawnEnemies();
        this._spawnMapPickups();
        this.healTickTimer = 0;

        // Reset camera to (0,0) so follow() recalculates from scratch (same as first load)
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.follow(p);
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
                    if (this.audio) this.audio.play('hit');
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

    _checkPlayerShotsVsBoss() {
        if (!this.boss || !this.boss.active || this.boss.state === 'dying') return;

        for (const shot of this.player.shots) {
            if (!shot.active || shot.fading) continue;

            const bossBox = this.boss.getHitbox();
            const shotBox = {
                x: shot.x - 4, y: shot.y - 3,
                w: 8, h: 6,
            };

            if (shot.type === 'charge1') {
                shotBox.x = shot.x - 10; shotBox.y = shot.y - 8;
                shotBox.w = 20; shotBox.h = 16;
            } else if (shot.type === 'charge2') {
                shotBox.x = shot.x - 16; shotBox.y = shot.y - 14;
                shotBox.w = 32; shotBox.h = 28;
            }

            if (boxOverlap(shotBox, bossBox)) {
                this.boss.onHit(shot.damage);
                if (this.audio) this.audio.play('hit');
                shot.fading = true;
                shot.fadeFrame = 0;
                shot.fadeTimer = 0;
                shot.vx = 0;
                break;
            }
        }
    }

    _checkSwordVsEnemies() {
        const player = this.player;
        if (!player.swordHitbox) return;

        const sBox = player.swordHitbox;

        // Check enemies
        for (const enemy of this.enemies) {
            if (!enemy.active || enemy.state === 'dying') continue;
            if (player.swordHitEnemies && player.swordHitEnemies.has(enemy)) continue;

            const eBox = enemy.getHitbox();
            if (boxOverlap(sBox, eBox)) {
                enemy.onHit(player.swordDamage);
                if (this.audio) this.audio.play('hit');
                if (player.swordHitEnemies) player.swordHitEnemies.add(enemy);
            }
        }

        // Check boss
        if (this.boss && this.boss.active && this.boss.state !== 'dying') {
            if (!(player.swordHitEnemies && player.swordHitEnemies.has(this.boss))) {
                const bBox = this.boss.getHitbox();
                if (boxOverlap(sBox, bBox)) {
                    this.boss.onHit(player.swordDamage);
                    if (this.audio) this.audio.play('hit');
                    if (player.swordHitEnemies) player.swordHitEnemies.add(this.boss);
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

        // Render pickups (between enemies and player)
        for (const pickup of this.pickups) {
            if (pickup.active) pickup.render(ctx, this.camera);
        }

        // Render boss
        if (this.boss && this.boss.active) {
            this.boss.render(ctx, this.camera);
        }

        // Render player (on top of enemies)
        this.player.render(ctx, this.camera);

        // Foreground layer (drawn over player — lamp posts, pipes, etc.)
        if (this.foregroundImg) {
            ctx.drawImage(this.foregroundImg, Math.floor(-this.camera.x), Math.floor(-this.camera.y));
        }

        // Render HUD
        this._renderHUD(ctx);

        // Debug overlay (P key toggle)
        if (this.debugMode) {
            this._renderDebugCollision(ctx);
            this._renderDebugPlayerHitbox(ctx);
            this._renderDebugFPS(ctx, game);
        }

        // Fade overlay (respawn transitions)
        if (this.fadeAlpha > 0) {
            ctx.globalAlpha = this.fadeAlpha;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
            ctx.globalAlpha = 1;
        }
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

            // Boss HP bar (right side, only when boss is near/on screen)
            if (this.boss && this.boss.active && this.boss.state !== 'dying' &&
                this._isBossNearScreen()) {
                this._renderBossHealthBar(ctx, ef);
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

    _isBossNearScreen() {
        if (!this.boss) return false;
        const margin = 64; // Show bar slightly before boss is fully on screen
        const bx = this.boss.x - this.camera.x;
        const by = this.boss.y - this.camera.y;
        return bx > -margin && bx < SCREEN_W + margin &&
               by > -margin && by < SCREEN_H + margin;
    }

    /**
     * Debug: draw collision tile boundaries for all solid tiles visible on screen.
     * Green outlines = solid tiles, semi-transparent fill.
     */
    _renderDebugCollision(ctx) {
        const ts = 16; // TILE_SIZE
        const cam = this.camera;
        const level = this.level;

        // Calculate visible tile range
        const startCol = Math.max(0, Math.floor(cam.x / ts));
        const endCol = Math.min(level.widthInTiles - 1, Math.floor((cam.x + SCREEN_W) / ts));
        const startRow = Math.max(0, Math.floor(cam.y / ts));
        const endRow = Math.min(level.heightInTiles - 1, Math.floor((cam.y + SCREEN_H) / ts));

        ctx.strokeStyle = 'rgba(0, 255, 80, 0.7)';
        ctx.fillStyle = 'rgba(0, 255, 80, 0.15)';
        ctx.lineWidth = 1;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (level.getTile(col, row) === 1) {
                    const sx = Math.floor(col * ts - cam.x);
                    const sy = Math.floor(row * ts - cam.y);
                    ctx.fillRect(sx, sy, ts, ts);
                    ctx.strokeRect(sx + 0.5, sy + 0.5, ts - 1, ts - 1);
                }
            }
        }
    }

    /**
     * Debug: draw player hitbox in magenta so we can see alignment.
     */
    _renderDebugPlayerHitbox(ctx) {
        const p = this.player;
        const cam = this.camera;
        const hx = Math.floor(p.x + p.hitboxX - cam.x);
        const hy = Math.floor(p.y + p.hitboxY - cam.y);

        ctx.strokeStyle = 'rgba(255, 0, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx + 0.5, hy + 0.5, p.hitboxW - 1, p.hitboxH - 1);

        // Draw feet point
        const fx = Math.floor(p.x + p.hitboxX + p.hitboxW / 2 - cam.x);
        const fy = Math.floor(p.y + p.hitboxY + p.hitboxH - cam.y);
        ctx.fillStyle = 'rgba(255, 0, 255, 1)';
        ctx.fillRect(fx - 1, fy - 1, 3, 3);

        // Enemy hitboxes (cyan)
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            const box = enemy.getHitbox();
            ctx.strokeRect(
                Math.floor(box.x - cam.x) + 0.5,
                Math.floor(box.y - cam.y) + 0.5,
                box.w - 1, box.h - 1);
        }

        // Sword hitbox (green-yellow)
        if (this.player.swordHitbox) {
            ctx.strokeStyle = 'rgba(200, 255, 0, 0.9)';
            const sb = this.player.swordHitbox;
            ctx.strokeRect(
                Math.floor(sb.x - cam.x) + 0.5,
                Math.floor(sb.y - cam.y) + 0.5,
                sb.w - 1, sb.h - 1);
        }

        // Boss hitbox (yellow)
        if (this.boss && this.boss.active) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
            const box = this.boss.getHitbox();
            ctx.strokeRect(
                Math.floor(box.x - cam.x) + 0.5,
                Math.floor(box.y - cam.y) + 0.5,
                box.w - 1, box.h - 1);
        }
    }

    /**
     * Debug: FPS counter, updated once per second.
     */
    _renderDebugFPS(ctx, game) {
        this._fpsFrames++;
        const now = performance.now();
        if (now - this._fpsTime >= 1000) {
            this._fpsDisplay = this._fpsFrames;
            this._fpsFrames = 0;
            this._fpsTime = now;
        }

        ctx.fillStyle = '#0f0';
        ctx.font = '8px monospace';
        ctx.fillText(`FPS: ${this._fpsDisplay}`, SCREEN_W - 44, 10);
        ctx.fillText(`X:${Math.floor(this.player.x)} Y:${Math.floor(this.player.y)}`, SCREEN_W - 70, 20);
    }

    /**
     * Boss HP bar — same style as player bar, positioned on the right side of the screen.
     */
    _renderBossHealthBar(ctx, ef) {
        const BASE  = { sx: 2,  sy: 55, sw: 14, sh: 16 };
        const FULL  = { sx: 2,  sy: 51, sw: 14, sh: 2 };
        const EMPTY = { sx: 2,  sy: 37, sw: 14, sh: 2 };
        const CAP   = { sx: 34, sy: 13, sw: 14, sh: 4 };

        const boss = this.boss;
        const maxHp = boss.maxHp;
        const curHp = Math.ceil(boss.hp);

        const barX = SCREEN_W - 8 - BASE.sw; // Right side, mirroring player bar

        let y = 8 + CAP.sh + maxHp * FULL.sh + BASE.sh;

        ctx.drawImage(ef, BASE.sx, BASE.sy, BASE.sw, BASE.sh,
            barX, y - BASE.sh, BASE.sw, BASE.sh);
        y -= BASE.sh;

        for (let i = 0; i < maxHp; i++) {
            const cell = i < curHp ? FULL : EMPTY;
            ctx.drawImage(ef, cell.sx, cell.sy, cell.sw, cell.sh,
                barX, y - cell.sh, cell.sw, cell.sh);
            y -= cell.sh;
        }

        ctx.drawImage(ef, CAP.sx, CAP.sy, CAP.sw, CAP.sh,
            barX, y - CAP.sh, CAP.sw, CAP.sh);
    }
}
