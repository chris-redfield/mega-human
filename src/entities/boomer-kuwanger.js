/**
 * boomer-kuwanger.js
 * Boomer Kuwanger boss — agile Maverick boss fight.
 *
 * AI States: idle, shoot, dash, deadlift, teleport, jump_start, jump, land, hurt, dying
 * Attacks: boomerang horn, dash charge, deadlift grab, teleport behind player, jump
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const BK = {
    // Physics
    GRAVITY:          0.3,
    MAX_FALL_SPEED:   6.0,
    RUN_SPEED:        2.2,

    // Jump attack
    JUMP_VY:         -7.0,
    JUMP_VX:          4.0,

    // Dash
    DASH_SPEED:       6.0,
    DASH_DURATION:    20,
    DASH_DAMAGE:      3,

    // Deadlift (grab)
    DEADLIFT_DAMAGE:  5,

    // Boomerang horn
    HORN_SPEED:       5.0,
    HORN_DAMAGE:      3,
    HORN_LIFETIME:    120,
    HORN_RETURN_TIME: 40,      // frames before horn starts returning
    HORN_SPAWN_X:     24,
    HORN_SPAWN_Y:    -42,

    // Teleport
    TELEPORT_FADE_TIME:   15,  // frames to vanish
    TELEPORT_APPEAR_TIME: 15,  // frames to reappear

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // AI timing
    IDLE_MIN:         25,
    IDLE_MAX:         55,

    // Hitbox
    WIDTH:            22,
    HEIGHT:           40,
    HITBOX_X:         11,
    HITBOX_Y:         10,
};

// Sprite frames from mavericks.png (alignment: botmid)
const KUWANGER_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 623, sy: 364, sw: 45, sh: 50, dur: 8 },
        { sx: 339, sy: 490, sw: 44, sh: 50, dur: 24 },
    ]},
    run: { loop: true, frames: [
        { sx: 165, sy: 620, sw: 43, sh: 52, dur: 4, ox: 2, oy: 2 },
        { sx: 218, sy: 620, sw: 48, sh: 49, dur: 4, ox: 1 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 622, sy: 614, sw: 47, sh: 58, dur: 6 },
        { sx: 554, sy: 614, sw: 63, sh: 58, dur: 6, ox: -8 },
        { sx: 494, sy: 625, sw: 48, sh: 47, dur: 4 },
        { sx: 436, sy: 631, sw: 55, sh: 41, dur: 4, ox: 3 },
    ]},
    dash: { loop: false, frames: [
        { sx: 624, sy: 424, sw: 43, sh: 54, dur: 4 },
        { sx: 567, sy: 429, sw: 48, sh: 49, dur: 999 },
    ]},
    deadlift: { loop: false, frames: [
        { sx: 616, sy: 491, sw: 48, sh: 49, dur: 7, ox: 1 },
        { sx: 555, sy: 501, sw: 57, sh: 39, dur: 8, ox: 5 },
        { sx: 496, sy: 503, sw: 57, sh: 37, dur: 8, ox: 5 },
        { sx: 555, sy: 501, sw: 57, sh: 39, dur: 2, ox: 5 },
        { sx: 445, sy: 487, sw: 47, sh: 53, dur: 15, ox: -5 },
    ]},
    catch: { loop: false, frames: [
        { sx: 554, sy: 614, sw: 63, sh: 58, dur: 4, ox: -8 },
        { sx: 622, sy: 614, sw: 47, sh: 58, dur: 4 },
    ]},
    teleport: { loop: false, frames: [
        { sx: 280, sy: 489, sw: 44, sh: 50, dur: 4 },
        { sx: 623, sy: 364, sw: 45, sh: 50, dur: 4 },
    ]},
    jump_start: { loop: false, frames: [
        { sx: 280, sy: 489, sw: 44, sh: 50, dur: 2, ox: 1 },
        { sx: 280, sy: 489, sw: 44, sh: 50, dur: 2, ox: 1 },
        { sx: 679, sy: 425, sw: 46, sh: 56, dur: 2, ox: -2 },
    ]},
    jump: { loop: false, frames: [
        { sx: 679, sy: 425, sw: 46, sh: 56, dur: 999, ox: -2 },
    ]},
    fall: { loop: false, frames: [
        { sx: 679, sy: 425, sw: 46, sh: 56, dur: 999, ox: -2 },
    ]},
    land: { loop: false, frames: [
        { sx: 280, sy: 489, sw: 44, sh: 50, dur: 6 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 445, sy: 487, sw: 47, sh: 53, dur: 3, ox: -5 },
        { sx: 390, sy: 487, sw: 47, sh: 53, dur: 3 },
    ]},
    die: { loop: false, frames: [
        { sx: 390, sy: 487, sw: 47, sh: 53, dur: 999 },
    ]},
};

// Boomerang horn projectile frames (center alignment, looping spin)
const HORN_FRAMES = [
    { sx: 675, sy: 377, sw: 17, sh: 19, dur: 2 },
    { sx: 696, sy: 378, sw: 17, sh: 17, dur: 2 },
    { sx: 718, sy: 378, sw: 19, sh: 17, dur: 2 },
    { sx: 676, sy: 356, sw: 17, sh: 17, dur: 2 },
    { sx: 697, sy: 356, sw: 17, sh: 19, dur: 2 },
    { sx: 719, sy: 357, sw: 17, sh: 17, dur: 2 },
    { sx: 676, sy: 399, sw: 19, sh: 17, dur: 2 },
    { sx: 700, sy: 401, sw: 17, sh: 17, dur: 2 },
];

// Explosion frames (from effects.png)
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

export class BoomerKuwanger extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = BK.HP;
        this.maxHp = BK.HP;

        this.hitboxX = BK.HITBOX_X;
        this.hitboxY = BK.HITBOX_Y;
        this.hitboxW = BK.WIDTH;
        this.hitboxH = BK.HEIGHT;

        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        this.activated = false;
        this.activationX = 0;

        // Timers
        this.idleTimer = BK.IDLE_MIN + Math.floor(Math.random() * (BK.IDLE_MAX - BK.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Dash state
        this.dashTimer = 0;
        this.dashHit = false;

        // Deadlift state
        this.deadliftHit = false;

        // Teleport state
        this.teleportTimer = 0;
        this.teleportPhase = 'out'; // 'out' = fading, 'in' = appearing
        this.teleportTargetX = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Horn projectiles
        this.horns = [];

        // Death explosion
        this.explosionFrame = 0;
        this.explosionTimer = 0;

        // Hit flash
        this.hitFlashTimer = 0;

        // Sprite images (set externally)
        this.spriteImage = null;
        this.effectsImage = null;
    }

    update(game) {
        this.audio = game.audio;
        if (this.contactCooldown > 0) this.contactCooldown--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this.invincibleTimer > 0) this.invincibleTimer--;

        const player = game.state?.player;
        const level = game.level;

        switch (this.state) {
            case 'idle':       this._idleState(player, level);       break;
            case 'shoot':      this._shootState(player, level);      break;
            case 'dash':       this._dashState(player, level);       break;
            case 'deadlift':   this._deadliftState(player, level);   break;
            case 'teleport':   this._teleportState(player, level);   break;
            case 'jump_start': this._jumpStartState(player, level);  break;
            case 'jump':       this._jumpState(player, level);       break;
            case 'land':       this._landState(player, level);       break;
            case 'hurt':       this._hurtState(player, level);       break;
            case 'dying':      this._dyingState(); return;
        }

        // Gravity (skip during teleport)
        if (this.state !== 'teleport') {
            this.vy += BK.GRAVITY;
            if (this.vy > BK.MAX_FALL_SPEED) this.vy = BK.MAX_FALL_SPEED;
            this._moveAndCollide(level);
        }

        this._updateAnimation();
        this._updateHorns(level);
    }

    // --- AI States ---

    _idleState(player, level) {
        if (!player || player.dead) {
            this.vx = 0;
            this._setAnim('idle');
            return;
        }

        if (!this.activated) {
            this.vx = 0;
            this._setAnim('idle');
            if (this.activationX > 0 && player.x < this.activationX) return;
            this.activated = true;
        }

        // Face player
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        this.facing = playerCX > myCX ? 1 : -1;

        // Walk toward player if far
        const dist = Math.abs(playerCX - myCX);
        if (dist > 100) {
            this.vx = BK.RUN_SPEED * this.facing;
            this._setAnim('run');
        } else {
            this.vx = 0;
            this._setAnim('idle');
        }

        this.idleTimer--;
        if (this.idleTimer <= 0) {
            this._pickAttack(player);
        }
    }

    _pickAttack(player) {
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        const dist = Math.abs(playerCX - myCX);

        this.vx = 0;

        let pick;
        if (dist < 50) {
            // Close: deadlift grab or dash away
            const opts = ['deadlift', 'deadlift', 'dash', 'jump'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else if (dist < 130) {
            const opts = ['shoot', 'dash', 'teleport', 'deadlift'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else {
            // Far: teleport or throw horn
            const opts = ['teleport', 'shoot', 'jump', 'dash'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        }

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'dash':
                this.state = 'dash';
                this.dashTimer = 0;
                this.dashHit = false;
                this._setAnim('dash');
                break;
            case 'deadlift':
                this.state = 'deadlift';
                this.deadliftHit = false;
                this._setAnim('deadlift');
                break;
            case 'teleport':
                this.state = 'teleport';
                this.teleportTimer = 0;
                this.teleportPhase = 'out';
                this._setAnim('teleport');
                // Target: in front of the player (matching their Y position)
                if (player) {
                    const playerCX2 = player.x + player.hitboxX + player.hitboxW / 2;
                    const playerFeetY = player.y + player.hitboxY + player.hitboxH;
                    const behindDir = this.facing * -1;
                    this.teleportTargetX = playerCX2 + behindDir * 60 - this.hitboxX - this.hitboxW / 2;
                    this.teleportTargetY = playerFeetY - this.hitboxY - this.hitboxH;
                }
                break;
            case 'jump':
                this.state = 'jump_start';
                this._setAnim('jump_start');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = BK.IDLE_MIN + Math.floor(Math.random() * (BK.IDLE_MAX - BK.IDLE_MIN));
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire horn on frame 2 (after windup)
        if (!this.shotFired && this.animFrame >= 2) {
            this._fireHorn();
            this.shotFired = true;
        }

        const anim = KUWANGER_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _dashState(player, level) {
        this.dashTimer++;

        // Windup on frame 0
        if (this.animFrame < 1) {
            this.vx = 0;
            return;
        }

        this.vx = BK.DASH_SPEED * this.facing;

        // Check dash collision with player
        if (!this.dashHit && player && !player.dead) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                player.takeDamage(BK.DASH_DAMAGE, this.facing);
                this.dashHit = true;
            }
        }

        if (this.dashTimer > BK.DASH_DURATION) {
            this._enterIdle();
        }
    }

    _deadliftState(player, level) {
        this.vx = 0;

        // Grab hitbox on frame 0
        if (!this.deadliftHit && this.animFrame === 0 && player && !player.dead) {
            const grabBox = this._getDeadliftHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(grabBox, playerBox)) {
                player.takeDamage(BK.DEADLIFT_DAMAGE, this.facing);
                this.deadliftHit = true;
            }
        }

        const anim = KUWANGER_ANIMS.deadlift;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _teleportState(player, level) {
        this.vx = 0;
        this.vy = 0;
        this.teleportTimer++;

        if (this.teleportPhase === 'out') {
            // Fading out
            if (this.teleportTimer >= BK.TELEPORT_FADE_TIME) {
                // Move to target position
                this.x = this.teleportTargetX;
                this.y = this.teleportTargetY;
                this.teleportPhase = 'in';
                this.teleportTimer = 0;
                // Face player at new position
                if (player) {
                    const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
                    const myCX = this.x + this.hitboxX + this.hitboxW / 2;
                    this.facing = playerCX > myCX ? 1 : -1;
                }
                this._setAnim('teleport');
            }
        } else {
            // Appearing
            if (this.teleportTimer >= BK.TELEPORT_APPEAR_TIME) {
                this._enterIdle();
            }
        }
    }

    _jumpStartState(player, level) {
        this.vx = 0;

        const anim = KUWANGER_ANIMS.jump_start;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'jump';
            this.vy = BK.JUMP_VY;
            this.vx = BK.JUMP_VX * this.facing;
            this.grounded = false;
            this._setAnim('jump');
        }
    }

    _jumpState(player, level) {
        if (this.vy > 0) {
            this._setAnim('fall');
        }

        if (this.grounded && this.vy === 0) {
            this.vx = 0;
            this.state = 'land';
            this._setAnim('land');
        }
    }

    _landState(player, level) {
        this.vx = 0;

        const anim = KUWANGER_ANIMS.land;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _hurtState(player, level) {
        this.vx = 0;
        this.hurtTimer--;
        if (this.hurtTimer <= 0) {
            this._enterIdle();
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

    _fireHorn() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.horns.push({
            x: feetX + BK.HORN_SPAWN_X * this.facing,
            y: feetY + BK.HORN_SPAWN_Y,
            vx: BK.HORN_SPEED * this.facing,
            startFacing: this.facing,
            active: true,
            life: BK.HORN_LIFETIME,
            age: 0,
            returning: false,
            originX: feetX,
            animFrame: 0,
            animTimer: 0,
        });
    }

    _getDeadliftHitbox() {
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        const cy = this.y + this.hitboxY + this.hitboxH / 2;
        const w = 18;
        const h = 31;
        return {
            x: this.facing > 0 ? cx + 14 : cx - 14 - w,
            y: cy - h / 2 - 6,
            w: w,
            h: h,
        };
    }

    // --- Collision ---

    _moveAndCollide(level) {
        const oldHitX = this.x + this.hitboxX;
        const expectedHitX = oldHitX + this.vx;
        const resolvedHitX = resolveSlopeHorizontal(
            level, oldHitX, this.y + this.hitboxY,
            this.hitboxW, this.hitboxH, this.vx
        );
        this.x = resolvedHitX - this.hitboxX;

        const hitWall = Math.abs(resolvedHitX - expectedHitX) > 0.01;
        if (hitWall) {
            if (this.state === 'dash') {
                this._enterIdle();
            }
            this.vx = 0;
        }

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
        if (this.invincibleTimer > 0) return;
        if (this.state === 'teleport' && this.teleportPhase === 'out') return; // Can't hit while vanishing

        this.hp -= damage;
        this.hitFlashTimer = 6;
        this.invincibleTimer = BK.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Dash has armor
        if (this.state === 'dash') return;

        this.state = 'hurt';
        this.hurtTimer = 6;
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (this.state === 'teleport' && this.teleportPhase === 'out') return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(BK.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = BK.CONTACT_COOLDOWN;
            }
        }

        // Horn projectile damage
        const playerBox = player.getHitbox();
        for (const horn of this.horns) {
            if (!horn.active) continue;
            const f = HORN_FRAMES[horn.animFrame % HORN_FRAMES.length];
            const hornBox = {
                x: horn.x - f.sw / 2,
                y: horn.y - f.sh / 2,
                w: f.sw,
                h: f.sh,
            };
            if (boxOverlap(hornBox, playerBox)) {
                const fromDir = horn.vx > 0 ? 1 : -1;
                player.takeDamage(BK.HORN_DAMAGE, fromDir);
                horn.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateHorns(level) {
        for (const horn of this.horns) {
            if (!horn.active) continue;

            horn.age++;
            horn.x += horn.vx;
            horn.life--;

            if (horn.life <= 0) { horn.active = false; continue; }

            // Boomerang return after travel time
            if (!horn.returning && horn.age >= BK.HORN_RETURN_TIME) {
                horn.returning = true;
                horn.vx = -horn.vx;
            }

            // Despawn when returned near origin
            if (horn.returning) {
                const distToOrigin = Math.abs(horn.x - horn.originX);
                if (distToOrigin < 10 && horn.age > BK.HORN_RETURN_TIME + 10) {
                    horn.active = false;
                    continue;
                }
            }

            // Wall collision (only on outbound)
            if (!horn.returning) {
                const checkX = horn.x + (horn.vx > 0 ? 9 : -9);
                if (isSolid(level, checkX, horn.y)) {
                    horn.returning = true;
                    horn.vx = -horn.vx;
                }
            }

            // Animate spin
            horn.animTimer++;
            const f = HORN_FRAMES[horn.animFrame % HORN_FRAMES.length];
            if (horn.animTimer >= f.dur) {
                horn.animTimer = 0;
                horn.animFrame = (horn.animFrame + 1) % HORN_FRAMES.length;
            }
        }
        this.horns = this.horns.filter(h => h.active);
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

        const anim = KUWANGER_ANIMS[this.animName];
        if (!anim) return;
        const frames = anim.frames;

        this.animTimer++;
        if (this.animTimer >= frames[this.animFrame].dur) {
            this.animTimer = 0;
            this.animFrame++;
            if (this.animFrame >= frames.length) {
                if (anim.loop) {
                    this.animFrame = 0;
                } else if (anim.loopFrom !== undefined) {
                    this.animFrame = anim.loopFrom;
                } else {
                    this.animFrame = frames.length - 1;
                }
            }
        }
    }

    // --- Rendering ---

    render(ctx, camera) {
        if (this.state === 'dying') {
            this._renderExplosion(ctx, camera);
            return;
        }

        // Invisible during teleport fade-out
        if (this.state === 'teleport' && this.teleportPhase === 'out' &&
            this.teleportTimer > BK.TELEPORT_FADE_TIME / 2) return;

        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = KUWANGER_ANIMS[this.animName];
        if (!anim) return;
        const frame = anim.frames[this.animFrame % anim.frames.length];

        const feetX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const feetY = Math.floor(this.y + this.hitboxY + this.hitboxH - camera.y);

        const ox = frame.ox || 0;
        const oy = frame.oy || 0;
        const drawY = feetY - frame.sh + oy;
        const flipH = this.facing < 0;

        // Teleport alpha fade
        let teleportAlpha = 1;
        if (this.state === 'teleport') {
            if (this.teleportPhase === 'out') {
                teleportAlpha = 1 - (this.teleportTimer / BK.TELEPORT_FADE_TIME);
            } else {
                teleportAlpha = this.teleportTimer / BK.TELEPORT_APPEAR_TIME;
            }
            teleportAlpha = Math.max(0, Math.min(1, teleportAlpha));
        }

        if (this.spriteImage) {
            const isFlash = this.hitFlashTimer > 0;
            const needsAlpha = teleportAlpha < 1;

            if (needsAlpha) ctx.globalAlpha = teleportAlpha;

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
                    ctx.globalAlpha = 0.7 * teleportAlpha;
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
                    ctx.globalAlpha = 0.7 * teleportAlpha;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        dx, drawY, frame.sw, frame.sh);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

            if (needsAlpha) ctx.globalAlpha = 1;
        }

        this._renderHorns(ctx, camera);
    }

    _renderHorns(ctx, camera) {
        for (const horn of this.horns) {
            if (!horn.active) continue;
            const f = HORN_FRAMES[horn.animFrame % HORN_FRAMES.length];
            const sx = Math.floor(horn.x - camera.x);
            const sy = Math.floor(horn.y - camera.y);

            if (this.spriteImage) {
                ctx.drawImage(this.spriteImage,
                    f.sx, f.sy, f.sw, f.sh,
                    sx - Math.floor(f.sw / 2), sy - Math.floor(f.sh / 2),
                    f.sw, f.sh);
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
