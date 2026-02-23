/**
 * hopper-enemy.js
 * Hopper Mechaniloid — jump + melee attack enemy.
 *
 * AI States: idle, hop, attack, dying
 * Waits on ground, hops toward player when spotted, melee attacks when close.
 * Sprites from sigma_viral.png (all frames at y=991-1021).
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const H = {
    SPEED:            1.2,    // Horizontal hop speed (px/frame)
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,
    HOP_VELOCITY:    -3.5,    // Jump strength per hop

    SIGHT_RANGE:      160,    // px to spot player
    ATTACK_RANGE:     40,     // px horizontal to start melee
    ATTACK_RANGE_Y:   30,     // px vertical tolerance for attack

    IDLE_WAIT:        30,     // frames between hops when idle
    HOP_COOLDOWN:     20,     // frames between hops when chasing
    ATTACK_DURATION:  16,     // frames for full attack animation (4 frames × 4 dur)
    ATTACK_COOLDOWN:  30,     // frames between attacks

    CONTACT_DAMAGE:   3,
    MELEE_DAMAGE:     4,
    CONTACT_COOLDOWN: 60,

    HP:               6,

    // Body hitbox
    WIDTH:            22,
    HEIGHT:           20,
    HITBOX_X:         6,
    HITBOX_Y:         4,

    // Melee attack hitbox (extends forward from body)
    MELEE_W:          32,
    MELEE_H:          15,
    MELEE_OX:         21,    // offset from entity x (in facing direction)
    MELEE_OY:         -8,    // offset from feet (upward)
};

// Sprite frame data from sigma_viral.png (alignment: botmid)
const HOPPER_ANIMS = {
    idle: { loop: false, frames: [
        { sx: 380, sy: 997, sw: 35, sh: 24, dur: 4, ox: 6 },
    ]},
    hop: { loop: false, frames: [
        { sx: 416, sy: 1000, sw: 37, sh: 21, dur: 4, ox: 5 },
        { sx: 454, sy: 996,  sw: 35, sh: 25, dur: 4, ox: 6 },
        { sx: 491, sy: 991,  sw: 43, sh: 30, dur: 4, ox: 9 },
    ]},
    attack: { loop: true, frames: [
        { sx: 536, sy: 997, sw: 48, sh: 24, dur: 4, ox: 12 },
        { sx: 585, sy: 996, sw: 46, sh: 25, dur: 4, ox: 12 },
        { sx: 632, sy: 997, sw: 48, sh: 24, dur: 4, ox: 12 },
        { sx: 681, sy: 996, sw: 46, sh: 25, dur: 4, ox: 12 },
    ]},
};

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

export class HopperEnemy extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = H.HP;
        this.maxHp = H.HP;

        this.hitboxX = H.HITBOX_X;
        this.hitboxY = H.HITBOX_Y;
        this.hitboxW = H.WIDTH;
        this.hitboxH = H.HEIGHT;

        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';  // idle, hop, attack, dying

        this.spawnX = x;

        // Timers
        this.idleTimer = 0;
        this.hopCooldown = 0;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.contactCooldown = 0;
        this.meleeHit = false;  // Track if current attack already hit

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

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
        if (this.hopCooldown > 0) this.hopCooldown--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        const player = game.state?.player;
        const level = game.level;

        switch (this.state) {
            case 'idle':
                this._idleState(player, level);
                break;
            case 'hop':
                this._hopState(player, level);
                break;
            case 'attack':
                this._attackState(player, level);
                break;
            case 'dying':
                this._dyingState();
                return;
        }

        // Apply gravity
        this.vy += H.GRAVITY;
        if (this.vy > H.MAX_FALL_SPEED) this.vy = H.MAX_FALL_SPEED;

        // Move and collide
        this._moveAndCollide(level);

        // Update animation
        this._updateAnimation();
    }

    // --- AI States ---

    _idleState(player, level) {
        this.vx = 0;
        this._setAnim('idle');

        this.idleTimer++;

        if (!player || player.dead) return;

        const dist = this._distToPlayer(player);

        // Face toward player
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        this.facing = playerCX > myCX ? 1 : -1;

        // In attack range?
        if (dist < H.ATTACK_RANGE && this.grounded && this.attackCooldown <= 0) {
            this.state = 'attack';
            this.attackTimer = H.ATTACK_DURATION;
            this.meleeHit = false;
            this._setAnim('attack');
            return;
        }

        // Spot player and hop toward them
        if (dist < H.SIGHT_RANGE && this.grounded && this.hopCooldown <= 0 && this.idleTimer > H.IDLE_WAIT) {
            this._startHop();
        }
    }

    _hopState(player, level) {
        this._setAnim('hop');

        // Airborne: move horizontally toward player
        this.vx = H.SPEED * this.facing;

        // Landed after a hop
        if (this.grounded && this.vy >= 0) {
            this.vx = 0;
            this.hopCooldown = H.HOP_COOLDOWN;
            this.idleTimer = 0;
            this.state = 'idle';

            // Check if we should attack immediately
            if (player && !player.dead && this._distToPlayer(player) < H.ATTACK_RANGE && this.attackCooldown <= 0) {
                this.state = 'attack';
                this.attackTimer = H.ATTACK_DURATION;
                this.meleeHit = false;
                this._setAnim('attack');
            }
        }
    }

    _attackState(player, level) {
        this.vx = 0;

        this.attackTimer--;
        if (this.attackTimer <= 0) {
            this.attackCooldown = H.ATTACK_COOLDOWN;
            this.idleTimer = 0;
            this.state = 'idle';
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

    _startHop() {
        this.vy = H.HOP_VELOCITY;
        this.grounded = false;
        this.state = 'hop';
        this._setAnim('hop');
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
        this.hitFlashTimer = 6;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('explosion');
        }
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        const playerBox = player.getHitbox();

        // Melee attack hitbox during attack state
        if (this.state === 'attack' && !this.meleeHit) {
            const feetX = this.x + this.hitboxX + this.hitboxW / 2;
            const feetY = this.y + this.hitboxY + this.hitboxH;
            const meleeBox = {
                x: feetX + (this.facing > 0 ? H.MELEE_OX - H.MELEE_W / 2 : -H.MELEE_OX - H.MELEE_W / 2),
                y: feetY + H.MELEE_OY - H.MELEE_H / 2,
                w: H.MELEE_W,
                h: H.MELEE_H,
            };
            if (boxOverlap(meleeBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(H.MELEE_DAMAGE, fromDir);
                this.meleeHit = true;
                return;
            }
        }

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(H.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = H.CONTACT_COOLDOWN;
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

        const anim = HOPPER_ANIMS[this.animName];
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

        const anim = HOPPER_ANIMS[this.animName];
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
            ctx.fillStyle = '#44cc00';
            ctx.fillRect(
                Math.floor(this.x + this.hitboxX - camera.x),
                Math.floor(this.y + this.hitboxY - camera.y),
                this.hitboxW, this.hitboxH);
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
