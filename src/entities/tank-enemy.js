/**
 * tank-enemy.js
 * Tank Mechaniloid — patrol + shoot enemy.
 *
 * AI States: patrol, turn, chase, attack, dying
 * Patrols left/right, turns at ledges/walls, shoots when player is in range.
 * Sprites from sigma_viral.png (all frames at y=991-1023).
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

// Physics / AI constants (tuned for 60fps frame-based game)
const T = {
    SPEED:            1.0,    // Walk speed (px/frame)
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,

    PATROL_RANGE:     150,    // px each side of spawn
    SIGHT_RANGE:      130,    // px to spot player
    ATTACK_RANGE_X:   125,    // px horizontal to start shooting
    ATTACK_RANGE_Y:   30,     // px vertical tolerance for attack

    ATTACK_COOLDOWN:  45,     // frames between shots
    TURN_DURATION:    10,     // frames for turn animation

    PROJ_SPEED:       3.0,    // px/frame
    PROJ_DAMAGE:      2,
    PROJ_LIFETIME:    30,     // frames
    PROJ_SPAWN_X:     20,     // px from center (in facing direction)
    PROJ_SPAWN_Y:    -15,     // px from feet (upward)

    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,     // frames between contact damage hits

    HP:               8,

    // Hitbox (within the 37x32 sprite)
    WIDTH:            22,
    HEIGHT:           26,
    HITBOX_X:         7,
    HITBOX_Y:         4,
};

// Sprite frame data from sigma_viral.png (alignment: botmid)
const TANK_ANIMS = {
    walk: { loop: true, frames: [
        { sx: 2,   sy: 991, sw: 37, sh: 32, dur: 4 },
        { sx: 79,  sy: 991, sw: 37, sh: 32, dur: 4 },
    ]},
    turn: { loop: false, frames: [
        { sx: 42,  sy: 991, sw: 34, sh: 32, dur: 10 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 237, sy: 991, sw: 38, sh: 32, dur: 4, ox: 1 },
        { sx: 276, sy: 991, sw: 37, sh: 32, dur: 12 },
    ]},
};

// Projectile sprite (from sigma_viral.png, alignment: center)
const TANK_PROJ = { sx: 359, sy: 1003, sw: 8, sh: 7 };

// Explosion frames (from effects.png, alignment: center)
const EXPLOSION_FRAMES = [
    { sx: 591, sy: 315, sw: 16, sh: 16, dur: 2, ox: -1 },
    { sx: 617, sy: 315, sw: 32, sh: 32, dur: 2 },
    { sx: 659, sy: 315, sw: 28, sh: 24, dur: 2 },
    { sx: 697, sy: 315, sw: 30, sh: 27, dur: 2 },
    { sx: 737, sy: 315, sw: 32, sh: 27, dur: 2 },
    { sx: 779, sy: 315, sw: 32, sh: 30, dur: 2 },
    { sx: 821, sy: 315, sw: 31, sh: 22, dur: 2 },
    { sx: 863, sy: 315, sw: 31, sh: 15, dur: 2 },
];

export class TankEnemy extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = T.HP;
        this.maxHp = T.HP;

        this.hitboxX = T.HITBOX_X;
        this.hitboxY = T.HITBOX_Y;
        this.hitboxW = T.WIDTH;
        this.hitboxH = T.HEIGHT;

        this.facing = -1;       // 1=right, -1=left
        this.grounded = false;
        this.onSlope = false;
        this.state = 'patrol';  // patrol, turn, chase, attack, dying

        // Patrol boundaries
        this.spawnX = x;
        this.patrolLeft = x - T.PATROL_RANGE;
        this.patrolRight = x + T.PATROL_RANGE;

        // Timers
        this.attackCooldown = 0;
        this.turnTimer = 0;
        this.shootTimer = 0;
        this.contactCooldown = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'walk';

        // Projectiles
        this.shots = [];

        // Death explosion
        this.explosionFrame = 0;
        this.explosionTimer = 0;

        // Hit flash (white flash on damage)
        this.hitFlashTimer = 0;

        // Sprite images (set externally)
        this.spriteImage = null;   // sigma_viral.png
        this.effectsImage = null;  // effects.png
    }

    update(game) {
        this.audio = game.audio;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.contactCooldown > 0) this.contactCooldown--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        const player = game.state?.player;
        const level = game.level;

        switch (this.state) {
            case 'patrol':
                this._patrolState(player, level);
                break;
            case 'turn':
                this._turnState(level);
                break;
            case 'chase':
                this._chaseState(player, level);
                break;
            case 'attack':
                this._attackState(player, level);
                break;
            case 'dying':
                this._dyingState();
                return; // Skip movement
        }

        // Apply gravity
        this.vy += T.GRAVITY;
        if (this.vy > T.MAX_FALL_SPEED) this.vy = T.MAX_FALL_SPEED;

        // Move and collide
        this._moveAndCollide(level);

        // Update animation
        this._updateAnimation();

        // Update projectiles
        this._updateShots(level);
    }

    // --- AI States ---

    _patrolState(player, level) {
        this.vx = T.SPEED * this.facing;
        this._setAnim('walk');

        // Check for ledge or wall → turn
        if (this._shouldTurn(level)) {
            this._startTurn();
            return;
        }

        // Check patrol boundaries
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        if ((this.facing > 0 && cx > this.patrolRight) ||
            (this.facing < 0 && cx < this.patrolLeft)) {
            this._startTurn();
            return;
        }

        // Check for player in sight range
        if (player && !player.dead && this._distToPlayer(player) < T.SIGHT_RANGE) {
            this.state = 'chase';
        }
    }

    _turnState(level) {
        // Decelerate during turn
        this.vx *= 0.8;
        if (Math.abs(this.vx) < 0.1) this.vx = 0;

        this.turnTimer--;
        if (this.turnTimer <= 0) {
            this.facing *= -1;
            this.state = 'patrol';
            this._setAnim('walk');
        }
    }

    _chaseState(player, level) {
        this._setAnim('walk');

        // Lost target
        if (!player || player.dead || this._distToPlayer(player) > T.SIGHT_RANGE) {
            this.state = 'patrol';
            return;
        }

        // Face toward player
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        const newFacing = playerCX > myCX ? 1 : -1;

        if (newFacing !== this.facing) {
            // Need to turn
            this._startTurn();
            return;
        }

        this.vx = T.SPEED * this.facing;

        // Check for wall/ledge while chasing
        if (this._shouldTurn(level)) {
            this.vx = 0;
            this.state = 'patrol';
            return;
        }

        // In attack range?
        if (this._inAttackRange(player)) {
            this.vx = 0;
            this.state = 'attack';
        }
    }

    _attackState(player, level) {
        this.vx = 0;

        // Target lost or out of range
        if (!player || player.dead || !this._inAttackRange(player)) {
            this.state = 'chase';
            this._setAnim('walk');
            return;
        }

        // Fire when cooldown is ready
        if (this.attackCooldown <= 0) {
            this._setAnim('shoot');
            this.animFrame = 0;
            this.animTimer = 0;
            this._fireProjectile();
            this.attackCooldown = T.ATTACK_COOLDOWN;
        }
    }

    _dyingState() {
        this.vx = 0;
        this.vy = 0;

        this.explosionTimer++;
        const frame = EXPLOSION_FRAMES[this.explosionFrame];
        if (frame && this.explosionTimer >= frame.dur) {
            this.explosionTimer = 0;
            this.explosionFrame++;
            if (this.explosionFrame >= EXPLOSION_FRAMES.length) {
                this.active = false;
            }
        }
    }

    // --- Helpers ---

    _distToPlayer(player) {
        const px = player.x + player.hitboxX + player.hitboxW / 2;
        const py = player.y + player.hitboxY + player.hitboxH / 2;
        const mx = this.x + this.hitboxX + this.hitboxW / 2;
        const my = this.y + this.hitboxY + this.hitboxH / 2;
        return Math.sqrt((px - mx) ** 2 + (py - my) ** 2);
    }

    _inAttackRange(player) {
        const px = player.x + player.hitboxX + player.hitboxW / 2;
        const py = player.y + player.hitboxY + player.hitboxH / 2;
        const mx = this.x + this.hitboxX + this.hitboxW / 2;
        const my = this.y + this.hitboxY + this.hitboxH / 2;
        return Math.abs(px - mx) < T.ATTACK_RANGE_X && Math.abs(py - my) < T.ATTACK_RANGE_Y;
    }

    _shouldTurn(level) {
        if (!this.grounded) return false;

        // Ledge detection: check if there's ground ahead and below
        const feetY = this.y + this.hitboxY + this.hitboxH;
        const aheadX = this.x + this.hitboxX + (this.facing > 0 ? this.hitboxW + 8 : -8);
        const hasGroundAhead = isSolid(level, aheadX, feetY + 4);

        if (!hasGroundAhead) return true;

        // Wall detection: check if there's a wall ahead at mid-height
        const midY = this.y + this.hitboxY + this.hitboxH / 2;
        const wallCheckX = this.x + this.hitboxX + (this.facing > 0 ? this.hitboxW + 2 : -2);
        const wallAhead = isSolid(level, wallCheckX, midY);

        return wallAhead;
    }

    _startTurn() {
        this.state = 'turn';
        this.turnTimer = T.TURN_DURATION;
        this._setAnim('turn');
    }

    _fireProjectile() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.shots.push({
            x: feetX + T.PROJ_SPAWN_X * this.facing,
            y: feetY + T.PROJ_SPAWN_Y,
            vx: T.PROJ_SPEED * this.facing,
            active: true,
            life: T.PROJ_LIFETIME,
        });
    }

    _updateShots(level) {
        for (const shot of this.shots) {
            if (!shot.active) continue;

            shot.x += shot.vx;
            shot.life--;

            if (shot.life <= 0) {
                shot.active = false;
                continue;
            }

            // Wall collision
            const checkX = shot.x + (shot.vx > 0 ? 4 : -4);
            if (isSolid(level, checkX, shot.y)) {
                shot.active = false;
            }
        }

        this.shots = this.shots.filter(s => s.active);
    }

    // --- Collision ---

    _moveAndCollide(level) {
        // Horizontal (slope-aware)
        const oldHitX = this.x + this.hitboxX;
        const expectedHitX = oldHitX + this.vx;
        const resolvedHitX = resolveSlopeHorizontal(
            level, oldHitX, this.y + this.hitboxY,
            this.hitboxW, this.hitboxH, this.vx
        );
        this.x = resolvedHitX - this.hitboxX;
        if (Math.abs(resolvedHitX - expectedHitX) > 0.01) this.vx = 0;

        // Vertical (slope-aware)
        const oldHitY = this.y + this.hitboxY;
        const result = resolveSlopeVertical(
            level, this.x + this.hitboxX, oldHitY,
            this.hitboxW, this.hitboxH, this.vy,
            this.grounded, this.onSlope
        );
        this.y = result.y - this.hitboxY;
        this.grounded = result.grounded;
        this.onSlope = result.onSlope;
        if (result.grounded || Math.abs(result.y - (oldHitY + this.vy)) > 0.01) {
            this.vy = 0;
        }
    }

    // --- Damage ---

    onHit(damage) {
        if (this.state === 'dying') return;

        this.hp -= damage;
        this.hitFlashTimer = 6; // White flash for ~0.1s

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('explosion');
        }
    }

    /** Check if this enemy's body or shots should damage the player. */
    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(T.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = T.CONTACT_COOLDOWN;
            }
        }

        // Projectile damage
        const playerBox = player.getHitbox();
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const shotBox = {
                x: shot.x - 4, y: shot.y - 3.5,
                w: 8, h: 7,
            };
            if (boxOverlap(shotBox, playerBox)) {
                const fromDir = shot.vx > 0 ? 1 : -1;
                player.takeDamage(T.PROJ_DAMAGE, fromDir);
                shot.active = false;
            }
        }
    }

    // --- Animation ---

    _setAnim(name) {
        if (this.animName === name) return;
        this.animName = name;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    _updateAnimation() {
        if (this.state === 'dying') return;

        const anim = TANK_ANIMS[this.animName];
        if (!anim) return;
        const frames = anim.frames;

        this.animTimer++;
        if (this.animTimer >= frames[this.animFrame].dur) {
            this.animTimer = 0;
            this.animFrame++;
            if (this.animFrame >= frames.length) {
                this.animFrame = anim.loop ? 0 : frames.length - 1;
            }
        }
    }

    // --- Rendering ---

    render(ctx, camera) {
        if (this.state === 'dying') {
            this._renderExplosion(ctx, camera);
            return;
        }

        const anim = TANK_ANIMS[this.animName];
        if (!anim) return;
        const frame = anim.frames[this.animFrame % anim.frames.length];

        // Feet anchor (bottom-center of hitbox)
        const feetX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const feetY = Math.floor(this.y + this.hitboxY + this.hitboxH - camera.y);

        const ox = frame.ox || 0;
        const drawY = feetY - frame.sh;
        const flipH = this.facing < 0;

        if (this.spriteImage) {
            const isFlash = this.hitFlashTimer > 0;

            if (flipH) {
                ctx.save();
                ctx.translate(feetX, 0);
                ctx.scale(-1, 1);
                const dx = -Math.floor(frame.sw / 2) + ox;
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    dx, drawY, frame.sw, frame.sh);
                if (isFlash) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.7;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        dx, drawY, frame.sw, frame.sh);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
                ctx.restore();
            } else {
                const dx = feetX - Math.floor(frame.sw / 2) + ox;
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    dx, drawY, frame.sw, frame.sh);
                if (isFlash) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.7;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        dx, drawY, frame.sw, frame.sh);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
        } else {
            // Fallback rectangle
            ctx.fillStyle = '#cc4400';
            ctx.fillRect(
                Math.floor(this.x + this.hitboxX - camera.x),
                Math.floor(this.y + this.hitboxY - camera.y),
                this.hitboxW, this.hitboxH);
        }

        // Render projectiles
        this._renderShots(ctx, camera);
    }

    _renderShots(ctx, camera) {
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const sx = Math.floor(shot.x - camera.x);
            const sy = Math.floor(shot.y - camera.y);

            if (this.spriteImage) {
                const flipH = shot.vx < 0;
                if (flipH) {
                    ctx.save();
                    ctx.translate(sx, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(this.spriteImage,
                        TANK_PROJ.sx, TANK_PROJ.sy, TANK_PROJ.sw, TANK_PROJ.sh,
                        -Math.floor(TANK_PROJ.sw / 2), sy - Math.floor(TANK_PROJ.sh / 2),
                        TANK_PROJ.sw, TANK_PROJ.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteImage,
                        TANK_PROJ.sx, TANK_PROJ.sy, TANK_PROJ.sw, TANK_PROJ.sh,
                        sx - Math.floor(TANK_PROJ.sw / 2), sy - Math.floor(TANK_PROJ.sh / 2),
                        TANK_PROJ.sw, TANK_PROJ.sh);
                }
            } else {
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(sx - 4, sy - 3, 8, 7);
            }
        }
    }

    _renderExplosion(ctx, camera) {
        if (!this.effectsImage) return;
        if (this.explosionFrame >= EXPLOSION_FRAMES.length) return;

        const frame = EXPLOSION_FRAMES[this.explosionFrame];
        const cx = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const cy = Math.floor(this.y + this.hitboxY + this.hitboxH / 2 - camera.y);
        const ox = frame.ox || 0;

        ctx.drawImage(this.effectsImage,
            frame.sx, frame.sy, frame.sw, frame.sh,
            cx - Math.floor(frame.sw / 2) + ox, cy - Math.floor(frame.sh / 2),
            frame.sw, frame.sh);
    }
}
