/**
 * bird-enemy.js
 * Bird Mechaniloid — flying enemy.
 *
 * AI States: fly, swoop, dying
 * Flies in a sine-wave patrol pattern, swoops toward player when spotted.
 * Sprites from sigma_viral.png (frames at y=999-1023).
 * Alignment: center (not botmid like ground enemies).
 */

import { Entity, boxOverlap } from './entity.js';
import { isSolid } from '../engine/collision.js';

const B = {
    FLY_SPEED:        1.0,    // Horizontal patrol speed (px/frame)
    SWOOP_SPEED:      2.5,    // Speed when diving at player
    WAVE_AMP:         20,     // Sine wave amplitude (pixels)
    WAVE_FREQ:        0.04,   // Sine wave frequency (radians/frame)

    SIGHT_RANGE:      140,    // px to spot player
    SWOOP_RANGE_Y:    80,     // must be above player by at least this much to swoop
    PATROL_RANGE:     120,    // px each side of spawn

    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,

    HP:               4,

    // Hitbox (center-aligned)
    WIDTH:            24,
    HEIGHT:           16,
    HITBOX_X:         4,
    HITBOX_Y:         4,
};

// Sprite frame data from sigma_viral.png (alignment: center)
const BIRD_ANIMS = {
    fly: { loop: true, frames: [
        { sx: 733, sy: 999, sw: 39, sh: 24, dur: 4, ox: -4 },
        { sx: 775, sy: 999, sw: 37, sh: 24, dur: 4, ox: -3 },
        { sx: 816, sy: 999, sw: 42, sh: 24, dur: 4, ox: -5 },
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

export class BirdEnemy extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = B.HP;
        this.maxHp = B.HP;

        this.hitboxX = B.HITBOX_X;
        this.hitboxY = B.HITBOX_Y;
        this.hitboxW = B.WIDTH;
        this.hitboxH = B.HEIGHT;

        this.facing = -1;
        this.state = 'fly';   // fly, swoop, dying

        // Patrol anchor
        this.spawnX = x;
        this.spawnY = y;
        this.patrolLeft = x - B.PATROL_RANGE;
        this.patrolRight = x + B.PATROL_RANGE;

        // Wave motion
        this.waveTime = 0;

        // Swoop state
        this.swoopTargetX = 0;
        this.swoopTargetY = 0;
        this.swoopReturnTimer = 0;

        // Timers
        this.contactCooldown = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;

        // Death explosion
        this.explosionFrame = 0;
        this.explosionTimer = 0;

        // Sprite images (set externally)
        this.spriteImage = null;   // sigma_viral.png
        this.effectsImage = null;  // effects.png
    }

    update(game) {
        if (this.contactCooldown > 0) this.contactCooldown--;

        const player = game.state?.player;

        switch (this.state) {
            case 'fly':
                this._flyState(player);
                break;
            case 'swoop':
                this._swoopState(player);
                break;
            case 'dying':
                this._dyingState();
                return;
        }

        // Update position (no tile collision for flying enemy)
        this.x += this.vx;
        this.y += this.vy;

        // Update animation
        this._updateAnimation();
    }

    // --- AI States ---

    _flyState(player) {
        // Patrol: fly horizontally with sine-wave vertical motion
        this.vx = B.FLY_SPEED * this.facing;
        this.waveTime += B.WAVE_FREQ;
        this.y = this.spawnY + Math.sin(this.waveTime) * B.WAVE_AMP;
        this.vy = 0; // Position set directly by sine wave

        // Reverse at patrol boundaries
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        if (this.facing > 0 && cx > this.patrolRight) {
            this.facing = -1;
        } else if (this.facing < 0 && cx < this.patrolLeft) {
            this.facing = 1;
        }

        // Check for player — swoop if player is below
        if (player && !player.dead) {
            const dist = this._distToPlayer(player);
            const playerCY = player.y + player.hitboxY + player.hitboxH / 2;
            const myCY = this.y + this.hitboxY + this.hitboxH / 2;

            if (dist < B.SIGHT_RANGE && playerCY > myCY) {
                // Swoop toward player
                this.swoopTargetX = player.x + player.hitboxX + player.hitboxW / 2;
                this.swoopTargetY = player.y + player.hitboxY + player.hitboxH / 2;
                this.swoopReturnTimer = 0;
                this.state = 'swoop';
            }
        }
    }

    _swoopState(player) {
        // Dive toward target point
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        const cy = this.y + this.hitboxY + this.hitboxH / 2;

        let targetX, targetY;

        if (this.swoopReturnTimer > 0) {
            // Returning to patrol height
            targetX = this.spawnX;
            targetY = this.spawnY;
            this.swoopReturnTimer--;

            // Close enough to spawn → resume patrol
            const dxToSpawn = targetX - cx;
            const dyToSpawn = targetY - cy;
            if (Math.sqrt(dxToSpawn ** 2 + dyToSpawn ** 2) < 8) {
                this.state = 'fly';
                this.x = this.spawnX - this.hitboxX - this.hitboxW / 2;
                this.y = this.spawnY - this.hitboxY - this.hitboxH / 2;
                this.vx = B.FLY_SPEED * this.facing;
                this.vy = 0;
                return;
            }
        } else {
            // Diving toward target
            targetX = this.swoopTargetX;
            targetY = this.swoopTargetY;

            // Reached target area → start returning
            const dxToTarget = targetX - cx;
            const dyToTarget = targetY - cy;
            if (Math.sqrt(dxToTarget ** 2 + dyToTarget ** 2) < 16) {
                this.swoopReturnTimer = 90; // frames to return
            }
        }

        // Move toward target
        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx ** 2 + dy ** 2);
        if (dist > 0) {
            this.vx = (dx / dist) * B.SWOOP_SPEED;
            this.vy = (dy / dist) * B.SWOOP_SPEED;
        }

        // Face movement direction
        this.facing = this.vx >= 0 ? 1 : -1;
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

    // --- Damage ---

    onHit(damage) {
        if (this.state === 'dying') return;

        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
        }
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(B.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = B.CONTACT_COOLDOWN;
            }
        }
    }

    // --- Animation ---

    _updateAnimation() {
        if (this.state === 'dying') return;

        const anim = BIRD_ANIMS.fly;
        const frames = anim.frames;

        this.animTimer++;
        if (this.animTimer >= frames[this.animFrame].dur) {
            this.animTimer = 0;
            this.animFrame++;
            if (this.animFrame >= frames.length) {
                this.animFrame = 0;
            }
        }
    }

    // --- Rendering ---

    render(ctx, camera) {
        if (this.state === 'dying') {
            this._renderExplosion(ctx, camera);
            return;
        }

        const anim = BIRD_ANIMS.fly;
        const frame = anim.frames[this.animFrame % anim.frames.length];

        // Center alignment (not botmid)
        const cx = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const cy = Math.floor(this.y + this.hitboxY + this.hitboxH / 2 - camera.y);

        const ox = frame.ox || 0;
        const flipH = this.facing < 0;

        if (this.spriteImage) {
            if (flipH) {
                ctx.save();
                ctx.translate(cx, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    -Math.floor(frame.sw / 2) + ox, cy - Math.floor(frame.sh / 2),
                    frame.sw, frame.sh);
                ctx.restore();
            } else {
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    cx - Math.floor(frame.sw / 2) + ox, cy - Math.floor(frame.sh / 2),
                    frame.sw, frame.sh);
            }
        } else {
            ctx.fillStyle = '#cc44cc';
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
