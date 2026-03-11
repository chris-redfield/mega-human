/**
 * overdrive-ostrich.js
 * Overdrive Ostrich boss — MMX2 speed Maverick boss fight.
 *
 * AI States: idle, shoot, skip, skid, attack, attack2, jump_start, jump, land, hurt, dying
 * Attacks: slicer projectile, skip kick (melee), skid charge, air attack, ground attack2
 * Sprites from mavericksX2.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const OO = {
    // Physics
    GRAVITY:          0.3,
    MAX_FALL_SPEED:   6.0,
    RUN_SPEED:        3.5,

    // Jump
    JUMP_VY:         -7.5,
    JUMP_VX:          3.0,

    // Skip (kick attack)
    SKIP_SPEED:       4.5,
    SKIP_VY:         -4.5,
    SKIP_DAMAGE:      4,

    // Skid (charge attack)
    SKID_SPEED:       5.5,
    SKID_DAMAGE:      3,
    SKID_DURATION:    40,

    // Slicer projectile
    SLICER_SPEED:     4.0,
    SLICER_DAMAGE:    3,
    SLICER_LIFETIME:  90,

    // Attack2 (ground combo)
    ATTACK2_DAMAGE:   4,

    // Air attack
    ATTACK_DAMAGE:    4,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // AI timing
    IDLE_MIN:         25,
    IDLE_MAX:         55,

    // Hitbox
    WIDTH:            26,
    HEIGHT:           50,
    HITBOX_X:         4,
    HITBOX_Y:         10,
};

// Sprite frames from mavericksX2.png (alignment: botmid)
const OSTRICH_ANIMS = {
    idle: { loop: true, pingpong: true, frames: [
        { sx: 8,   sy: 677, sw: 34, sh: 60, dur: 120 },
        { sx: 10,  sy: 741, sw: 34, sh: 60, dur: 4 },
        { sx: 57,  sy: 742, sw: 34, sh: 60, dur: 4 },
    ]},
    run: { loop: true, frames: [
        { sx: 176, sy: 678, sw: 57, sh: 42, dur: 4, ox: 9 },
        { sx: 242, sy: 684, sw: 54, sh: 45, dur: 4, ox: 11 },
        { sx: 304, sy: 677, sw: 64, sh: 45, dur: 4, ox: 6 },
        { sx: 373, sy: 676, sw: 54, sh: 44, dur: 4, ox: 11 },
        { sx: 434, sy: 677, sw: 60, sh: 44, dur: 4, ox: 8 },
        { sx: 96,  sy: 762, sw: 69, sh: 38, dur: 4, ox: 3 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 112, sy: 870, sw: 44, sh: 65, dur: 3, ox: 0, oy: 5 },
        { sx: 163, sy: 868, sw: 48, sh: 61, dur: 4, ox: 1, oy: 5 },
        { sx: 216, sy: 869, sw: 60, sh: 61, dur: 2, ox: 7, oy: 5 },
        { sx: 216, sy: 869, sw: 60, sh: 61, dur: 2, ox: 7, oy: 5, hx: 25, hy: -30 },
        { sx: 279, sy: 869, sw: 65, sh: 45, dur: 2, ox: -2 },
        { sx: 350, sy: 863, sw: 65, sh: 45, dur: 8, ox: -2 },
    ]},
    skip: { loop: false, frames: [
        { sx: 403, sy: 727, sw: 49, sh: 57, dur: 2, ox: 6 },
        { sx: 461, sy: 728, sw: 46, sh: 66, dur: 3, ox: 2 },
        { sx: 5,   sy: 806, sw: 45, sh: 68, dur: 2, ox: -1, oy: -4 },
        { sx: 55,  sy: 806, sw: 48, sh: 58, dur: 6, ox: -4, oy: -9 },
        { sx: 113, sy: 804, sw: 58, sh: 61, dur: 10, ox: 3 },
    ]},
    skip2: { loop: false, frames: [
        { sx: 181, sy: 797, sw: 51, sh: 56, dur: 2, ox: 5, oy: -1 },
        { sx: 239, sy: 802, sw: 43, sh: 64, dur: 3, ox: 4, oy: -2 },
        { sx: 291, sy: 800, sw: 42, sh: 65, dur: 4, ox: 1, oy: -7 },
        { sx: 342, sy: 787, sw: 44, sh: 55, dur: 6, ox: -2, oy: -12 },
        { sx: 396, sy: 795, sw: 55, sh: 61, dur: 10, ox: 4 },
    ]},
    skid: { loop: true, frames: [
        { sx: 169, sy: 728, sw: 52, sh: 62, dur: 4, ox: 1, oy: 1 },
        { sx: 228, sy: 734, sw: 51, sh: 62, dur: 4, ox: -1 },
    ]},
    skid_end: { loop: false, frames: [
        { sx: 287, sy: 733, sw: 45, sh: 62, dur: 7, ox: -1 },
        { sx: 343, sy: 730, sw: 47, sh: 47, dur: 5, ox: 10 },
    ]},
    attack: { loop: false, frames: [
        { sx: 112, sy: 870, sw: 44, sh: 65, dur: 3, ox: 0, oy: 5 },
        { sx: 163, sy: 868, sw: 48, sh: 61, dur: 4, ox: 1, oy: 5 },
        { sx: 216, sy: 869, sw: 60, sh: 61, dur: 2, ox: 7, oy: 5 },
        { sx: 216, sy: 869, sw: 60, sh: 61, dur: 2, ox: 7, oy: 5 },
        { sx: 279, sy: 869, sw: 65, sh: 45, dur: 2, ox: -2 },
        { sx: 350, sy: 863, sw: 65, sh: 45, dur: 8, ox: -2 },
    ]},
    attack2_start: { loop: false, frames: [
        { sx: 1,   sy: 945, sw: 46, sh: 50, dur: 15, ox: 0 },
        { sx: 51,  sy: 943, sw: 50, sh: 49, dur: 7, ox: 1 },
        { sx: 108, sy: 939, sw: 45, sh: 59, dur: 15 },
    ]},
    attack2: { loop: false, frames: [
        { sx: 236, sy: 941, sw: 34, sh: 65, dur: 4, ox: 4, oy: 8 },
        { sx: 281, sy: 935, sw: 60, sh: 72, dur: 2, ox: -2, oy: -1 },
        { sx: 164, sy: 936, sw: 63, sh: 71, dur: 4, ox: -2, oy: 2 },
        { sx: 350, sy: 919, sw: 65, sh: 66, dur: 4, ox: -1, oy: -6, hx: 3, hy: -58 },
        { sx: 421, sy: 937, sw: 63, sh: 70, dur: 4, ox: -2, oy: 6 },
        { sx: 489, sy: 905, sw: 45, sh: 59, dur: 4, ox: 1, oy: 1 },
    ]},
    attack2_end: { loop: false, frames: [
        { sx: 2,   sy: 1002, sw: 50, sh: 49, dur: 4 },
        { sx: 56,  sy: 1005, sw: 52, sh: 48, dur: 20, ox: 1, oy: 1 },
        { sx: 113, sy: 1004, sw: 46, sh: 50, dur: 30, ox: -1 },
    ]},
    jump_start: { loop: false, frames: [
        { sx: 456, sy: 803, sw: 56, sh: 44, dur: 4, ox: 3 },
        { sx: 1,   sy: 882, sw: 57, sh: 52, dur: 8 },
    ]},
    jump: { loop: false, frames: [
        { sx: 65,  sy: 869, sw: 43, sh: 67, dur: 999 },
    ]},
    fall: { loop: false, frames: [
        { sx: 424, sy: 861, sw: 37, sh: 67, dur: 999 },
    ]},
    land: { loop: false, frames: [
        { sx: 1,   sy: 882, sw: 57, sh: 52, dur: 3 },
        { sx: 456, sy: 803, sw: 56, sh: 44, dur: 3, ox: 3 },
        { sx: 468, sy: 856, sw: 56, sh: 41, dur: 3, ox: 3 },
        { sx: 456, sy: 803, sw: 56, sh: 44, dur: 3, ox: 3 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 165, sy: 1010, sw: 57, sh: 62, dur: 3 },
        { sx: 229, sy: 1011, sw: 56, sh: 61, dur: 3 },
    ]},
    die: { loop: false, frames: [
        { sx: 165, sy: 1010, sw: 57, sh: 62, dur: 999 },
    ]},
};

// Slicer projectile frames (center alignment, looping spin)
const SLICER_FRAMES = [
    { sx: 513, sy: 647, sw: 16, sh: 9, dur: 2, ox: -2 },
    { sx: 534, sy: 648, sw: 19, sh: 5, dur: 2, oy: 3 },
    { sx: 556, sy: 647, sw: 16, sh: 9, dur: 2, ox: 3 },
    { sx: 578, sy: 647, sw: 15, sh: 11, dur: 2, ox: 3 },
    { sx: 596, sy: 648, sw: 19, sh: 5, dur: 2, oy: -3 },
    { sx: 619, sy: 647, sw: 15, sh: 11, dur: 2, ox: -3 },
];

// Explosion frames (from effects.png, same as all bosses)
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

export class OverdriveOstrich extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = OO.HP;
        this.maxHp = OO.HP;

        this.hitboxX = OO.HITBOX_X;
        this.hitboxY = OO.HITBOX_Y;
        this.hitboxW = OO.WIDTH;
        this.hitboxH = OO.HEIGHT;

        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        this.activated = false;
        this.activationX = 0;

        // Timers
        this.idleTimer = OO.IDLE_MIN + Math.floor(Math.random() * (OO.IDLE_MAX - OO.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Skip state (kick attack)
        this.skipHit = false;
        this.skipPhase = 0; // 0=ascending, 1=descending

        // Skid state (charge)
        this.skidTimer = 0;
        this.skidEnding = false;

        // Attack2 state
        this.attack2Phase = 0; // 0=start, 1=attack, 2=end
        this.attack2Hit = false;
        this.attack2ShotFired = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';
        this.pingpongDir = 1; // for pingpong anims

        // Slicer projectiles
        this.slicers = [];

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
            case 'idle':          this._idleState(player, level);         break;
            case 'shoot':         this._shootState(player, level);        break;
            case 'skip':          this._skipState(player, level);         break;
            case 'skid':          this._skidState(player, level);         break;
            case 'skid_end':      this._skidEndState(player, level);      break;
            case 'attack2_start': this._attack2StartState(player, level); break;
            case 'attack2':       this._attack2State(player, level);      break;
            case 'attack2_end':   this._attack2EndState(player, level);   break;
            case 'jump_start':    this._jumpStartState(player, level);    break;
            case 'jump':          this._jumpState(player, level);         break;
            case 'land':          this._landState(player, level);         break;
            case 'hurt':          this._hurtState(player, level);         break;
            case 'dying':         this._dyingState(); return;
        }

        // Gravity
        this.vy += OO.GRAVITY;
        if (this.vy > OO.MAX_FALL_SPEED) this.vy = OO.MAX_FALL_SPEED;

        this._moveAndCollide(level);
        this._updateAnimation();
        this._updateSlicers(level);
    }

    // --- AI States ---

    _idleState(player, level) {
        if (!player || player.dead) {
            this.vx = 0;
            this._setAnim('idle');
            return;
        }

        // Activation threshold
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

        // Walk toward player if far away
        const dist = Math.abs(playerCX - myCX);
        if (dist > 90) {
            this.vx = OO.RUN_SPEED * this.facing;
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
        if (dist < 60) {
            // Close: skip kick or attack2
            const opts = ['skip', 'skip', 'attack2', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else if (dist < 150) {
            // Medium: skid charge, shoot, or skip
            const opts = ['skid', 'shoot', 'skip', 'attack2'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else {
            // Far: shoot, skid, or jump
            const opts = ['shoot', 'skid', 'jump', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        }

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'skip':
                this.state = 'skip';
                this.skipHit = false;
                this.skipPhase = 0;
                this.vy = OO.SKIP_VY;
                this.vx = OO.SKIP_SPEED * this.facing;
                this.grounded = false;
                this._setAnim(Math.random() < 0.5 ? 'skip' : 'skip2');
                break;
            case 'skid':
                this.state = 'skid';
                this.skidTimer = 0;
                this.skidEnding = false;
                this.vx = OO.SKID_SPEED * this.facing;
                this._setAnim('skid');
                break;
            case 'attack2':
                this.state = 'attack2_start';
                this.attack2Phase = 0;
                this.attack2Hit = false;
                this.attack2ShotFired = false;
                this._setAnim('attack2_start');
                break;
            case 'jump':
                this.state = 'jump_start';
                this._setAnim('jump_start');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.vx = 0;
        this.idleTimer = OO.IDLE_MIN + Math.floor(Math.random() * (OO.IDLE_MAX - OO.IDLE_MIN));
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire slicer on frame 3 (the one with POI)
        if (!this.shotFired && this.animFrame >= 3) {
            this._fireSlicer();
            this.shotFired = true;
        }

        // Animation done → idle
        const anim = OSTRICH_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _skipState(player, level) {
        // Skip is an aerial kick — check melee damage during frames 2-4
        if (!this.skipHit && this.animFrame >= 2 && player && !player.dead) {
            const kickBox = this._getSkipHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(kickBox, playerBox)) {
                const fromDir = this.facing;
                player.takeDamage(OO.SKIP_DAMAGE, fromDir);
                this.skipHit = true;
            }
        }

        // Transition to falling when going down
        if (this.vy > 0) {
            this.skipPhase = 1;
        }

        // Landing
        if (this.grounded && this.skipPhase === 1) {
            this.vx = 0;
            this._enterIdle();
        }
    }

    _skidState(player, level) {
        this.skidTimer++;

        // Check body damage while skidding
        if (player && !player.dead && this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = this.facing;
                player.takeDamage(OO.SKID_DAMAGE, fromDir);
                this.contactCooldown = OO.CONTACT_COOLDOWN;
            }
        }

        // Stop on wall or duration
        if (this.skidTimer >= OO.SKID_DURATION) {
            this.state = 'skid_end';
            this.vx = 0;
            this._setAnim('skid_end');
        }
    }

    _skidEndState(player, level) {
        this.vx = 0;

        const anim = OSTRICH_ANIMS.skid_end;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _attack2StartState(player, level) {
        this.vx = 0;

        const anim = OSTRICH_ANIMS.attack2_start;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'attack2';
            this._setAnim('attack2');
        }
    }

    _attack2State(player, level) {
        this.vx = 0;

        // Melee hit check on frames 1-3
        if (!this.attack2Hit && this.animFrame >= 1 && this.animFrame <= 3 && player && !player.dead) {
            const atkBox = this._getAttack2Hitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(atkBox, playerBox)) {
                const fromDir = this.facing;
                player.takeDamage(OO.ATTACK2_DAMAGE, fromDir);
                this.attack2Hit = true;
            }
        }

        // Fire slicer on frame 3 (has POI)
        if (!this.attack2ShotFired && this.animFrame >= 3) {
            this._fireSlicer();
            this.attack2ShotFired = true;
        }

        const anim = OSTRICH_ANIMS.attack2;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'attack2_end';
            this._setAnim('attack2_end');
        }
    }

    _attack2EndState(player, level) {
        this.vx = 0;

        const anim = OSTRICH_ANIMS.attack2_end;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _jumpStartState(player, level) {
        this.vx = 0;

        const anim = OSTRICH_ANIMS.jump_start;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'jump';
            this.vy = OO.JUMP_VY;
            this.vx = OO.JUMP_VX * this.facing;
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

        const anim = OSTRICH_ANIMS.land;
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

    _fireSlicer() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.slicers.push({
            x: feetX + 20 * this.facing,
            y: feetY - 35,
            vx: OO.SLICER_SPEED * this.facing,
            active: true,
            life: OO.SLICER_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
    }

    _getSkipHitbox() {
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        const cy = this.y + this.hitboxY + this.hitboxH / 2;
        const w = 42;
        const h = 45;
        return {
            x: this.facing > 0 ? cx - 5 : cx - w + 5,
            y: cy - h / 2 - 5,
            w: w,
            h: h,
        };
    }

    _getAttack2Hitbox() {
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        const cy = this.y + this.hitboxY + this.hitboxH / 2;
        const w = 50;
        const h = 55;
        return {
            x: this.facing > 0 ? cx - 5 : cx - w + 5,
            y: cy - h / 2,
            w: w,
            h: h,
        };
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

        const hitWall = Math.abs(resolvedHitX - expectedHitX) > 0.01;
        if (hitWall) {
            if (this.state === 'skid') {
                this.state = 'skid_end';
                this._setAnim('skid_end');
            }
            this.vx = 0;
        }

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
        if (this.invincibleTimer > 0) return;

        this.hp -= damage;
        this.hitFlashTimer = 6;
        this.invincibleTimer = OO.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Skid has armor (no hurt interrupt)
        if (this.state === 'skid' || this.state === 'skip') return;

        this.state = 'hurt';
        this.hurtTimer = 6;
        this.vx = 0;
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(OO.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = OO.CONTACT_COOLDOWN;
            }
        }

        // Slicer projectile damage
        const playerBox = player.getHitbox();
        for (const slicer of this.slicers) {
            if (!slicer.active) continue;
            const f = SLICER_FRAMES[slicer.animFrame % SLICER_FRAMES.length];
            const slicerBox = {
                x: slicer.x - 10,
                y: slicer.y - 6,
                w: 21,
                h: 12,
            };
            if (boxOverlap(slicerBox, playerBox)) {
                const fromDir = slicer.vx > 0 ? 1 : -1;
                player.takeDamage(OO.SLICER_DAMAGE, fromDir);
                slicer.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateSlicers(level) {
        for (const slicer of this.slicers) {
            if (!slicer.active) continue;
            slicer.x += slicer.vx;
            slicer.life--;
            if (slicer.life <= 0) { slicer.active = false; continue; }

            const checkX = slicer.x + (slicer.vx > 0 ? 10 : -10);
            if (isSolid(level, checkX, slicer.y)) { slicer.active = false; }

            // Animate
            slicer.animTimer++;
            const f = SLICER_FRAMES[slicer.animFrame % SLICER_FRAMES.length];
            if (slicer.animTimer >= f.dur) {
                slicer.animTimer = 0;
                slicer.animFrame = (slicer.animFrame + 1) % SLICER_FRAMES.length;
            }
        }
        this.slicers = this.slicers.filter(s => s.active);
    }

    // --- Animation ---

    _setAnim(name) {
        if (this.animName === name) return;
        this.animName = name;
        this.animFrame = 0;
        this.animTimer = 0;
        this.pingpongDir = 1;
    }

    _updateAnimation() {
        if (this.state === 'dying') return;

        const anim = OSTRICH_ANIMS[this.animName];
        if (!anim) return;
        const frames = anim.frames;

        this.animTimer++;
        if (this.animTimer >= frames[this.animFrame].dur) {
            this.animTimer = 0;

            if (anim.pingpong) {
                this.animFrame += this.pingpongDir;
                if (this.animFrame >= frames.length) {
                    this.pingpongDir = -1;
                    this.animFrame = frames.length - 2;
                } else if (this.animFrame < 0) {
                    this.pingpongDir = 1;
                    this.animFrame = 1;
                }
            } else {
                this.animFrame++;
                if (this.animFrame >= frames.length) {
                    if (anim.loop) {
                        this.animFrame = anim.loopFrom || 0;
                    } else {
                        this.animFrame = frames.length - 1;
                    }
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

        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = OSTRICH_ANIMS[this.animName];
        if (!anim) return;
        const frame = anim.frames[this.animFrame % anim.frames.length];

        const feetX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const feetY = Math.floor(this.y + this.hitboxY + this.hitboxH - camera.y);

        const ox = frame.ox || 0;
        const oy = frame.oy || 0;
        const drawY = feetY - frame.sh + oy;
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
        }

        this._renderSlicers(ctx, camera);
    }

    _renderSlicers(ctx, camera) {
        for (const slicer of this.slicers) {
            if (!slicer.active) continue;
            const f = SLICER_FRAMES[slicer.animFrame % SLICER_FRAMES.length];
            const sx = Math.floor(slicer.x - camera.x);
            const sy = Math.floor(slicer.y - camera.y);
            const fox = f.ox || 0;
            const foy = f.oy || 0;

            if (this.spriteImage) {
                ctx.drawImage(this.spriteImage,
                    f.sx, f.sy, f.sw, f.sh,
                    sx - Math.floor(f.sw / 2) + fox, sy - Math.floor(f.sh / 2) + foy,
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
