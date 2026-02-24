/**
 * storm-eagle.js
 * Storm Eagle boss — second Maverick boss fight.
 *
 * AI States: idle, shoot, gust, fly_up, fly, air_shoot, dive, egg, hurt, dying
 * Attacks: tornado shot (ground/air), gust wind push, diagonal dive, egg drop (spawns birds)
 * Sprites from mavericks.png, projectile effects from effects.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

// Boss constants
const SE = {
    // Physics
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,
    RUN_SPEED:        1.2,

    // Flying
    FLY_UP_SPEED:    -3.0,       // Vertical speed when taking off
    FLY_TARGET_ALT:   80,        // Pixels above ground to hover
    FLY_DRIFT_SPEED:  1.0,       // Horizontal drift speed in air
    FLY_BOB_AMP:      0.3,       // Vertical bobbing amplitude
    FLY_BOB_FREQ:     0.05,      // Bobbing frequency

    // Dive attack
    DIVE_SPEED:        5.0,      // Diagonal dive speed
    DIVE_DAMAGE:       4,

    // Tornado shot
    TORNADO_SPEED:     4.0,
    TORNADO_DAMAGE:    3,
    TORNADO_LIFETIME:  60,
    TORNADO_SPAWN_X:   30,       // POI from shoot anim
    TORNADO_SPAWN_Y:  -37,

    // Air tornado shot
    AIR_TORNADO_SPAWN_X: 30,
    AIR_TORNADO_SPAWN_Y: -41,

    // Gust (wind push)
    GUST_PUSH:         2.5,
    GUST_RANGE:        180,
    GUST_DURATION:     96,

    // Egg
    EGG_SPAWN_X:       14,       // POI from air_eggshoot frame 3
    EGG_SPAWN_Y:      -39,
    EGG_DAMAGE:        2,
    EGG_GRAVITY:       0.2,
    EGG_MAX_FALL:      4.0,

    // Baby birds (from egg)
    BIRD_SPEED:        2.5,
    BIRD_DAMAGE:       2,
    BIRD_LIFETIME:     90,
    BIRD_BURST_TIME:   15,       // Frames of initial burst before forward travel

    // Combat
    CONTACT_DAMAGE:    3,
    CONTACT_COOLDOWN:  60,
    HP:                32,
    INVINCIBLE_TIME:   70,

    // Recovery (when fallen below platform)
    RECOVER_SPEED:    -4.0,       // Upward speed when recovering
    RECOVER_MARGIN:    30,        // How far below groundY triggers recovery

    // AI timing
    IDLE_MIN:          40,
    IDLE_MAX:          80,
    FLY_ATTACK_MIN:    30,
    FLY_ATTACK_MAX:    60,

    // Hitbox (standing)
    WIDTH:             28,
    HEIGHT:            44,
    HITBOX_X:          8,
    HITBOX_Y:          8,

    // Hitbox (dive)
    DIVE_WIDTH:        36,
    DIVE_HEIGHT:       36,
    DIVE_HITBOX_X:     13,
    DIVE_HITBOX_Y:     18,
};

// Sprite frames from mavericks.png (alignment: botmid)
const EAGLE_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 1174, sy: 768, sw: 45, sh: 56, dur: 8, ox: -1 },
    ]},
    run: { loop: true, frames: [
        { sx: 466, sy: 1495, sw: 40, sh: 59, dur: 5, ox: -2 },
        { sx: 510, sy: 1494, sw: 41, sh: 59, dur: 5, ox: -2 },
        { sx: 553, sy: 1497, sw: 44, sh: 56, dur: 5 },
        { sx: 602, sy: 1496, sw: 37, sh: 57, dur: 5, ox: -4 },
        { sx: 642, sy: 1494, sw: 45, sh: 59, dur: 5 },
        { sx: 689, sy: 1494, sw: 46, sh: 59, dur: 5, ox: 1 },
        { sx: 737, sy: 1496, sw: 48, sh: 56, dur: 5, ox: 2 },
        { sx: 787, sy: 1495, sw: 43, sh: 57, dur: 5, ox: -1 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 822, sy: 866, sw: 57, sh: 55, dur: 6, ox: 5 },   // POI frame
        { sx: 885, sy: 865, sw: 57, sh: 56, dur: 14, ox: 5 },   // Hold after shot
    ]},
    air_shoot: { loop: false, frames: [
        { sx: 1357, sy: 770, sw: 69, sh: 60, dur: 14, ox: -1 }, // POI frame
    ]},
    flap: { loop: true, frames: [
        { sx: 1430, sy: 770, sw: 69, sh: 56, dur: 4, ox: -3 },
        { sx: 1506, sy: 743, sw: 61, sh: 84, dur: 4, ox: -5 },
        { sx: 1386, sy: 842, sw: 63, sh: 84, dur: 4, ox: -5 },
        { sx: 1455, sy: 875, sw: 54, sh: 50, dur: 4, ox: -5 },
        { sx: 1423, sy: 949, sw: 54, sh: 50, dur: 4, ox: -5 },
    ]},
    fly: { loop: true, frames: [
        { sx: 1096, sy: 862, sw: 69, sh: 60, dur: 7, ox: -1, oy: -1 },
        { sx: 1169, sy: 866, sw: 54, sh: 55, dur: 7, ox: -3 },
        { sx: 1096, sy: 862, sw: 69, sh: 60, dur: 7, ox: -1, oy: -1 },
        { sx: 1028, sy: 835, sw: 61, sh: 89, dur: 7, ox: -3, oy: -2 },
    ]},
    dive: { loop: true, frames: [
        { sx: 1097, sy: 927, sw: 63, sh: 76, dur: 2, ox: -4, oy: 6 },
        { sx: 1173, sy: 932, sw: 55, sh: 68, dur: 2, oy: 3 },
    ]},
    jump_start: { loop: false, frames: [
        { sx: 1506, sy: 743, sw: 61, sh: 84, dur: 4, ox: -6 },
        { sx: 1430, sy: 770, sw: 69, sh: 56, dur: 4, ox: -4 },
    ]},
    fall: { loop: false, frames: [
        { sx: 1169, sy: 866, sw: 54, sh: 55, dur: 4, ox: -3 },
        { sx: 1096, sy: 862, sw: 69, sh: 60, dur: 4, ox: -1 },
        { sx: 1028, sy: 835, sw: 61, sh: 89, dur: 4, ox: -3 },
    ]},
    land: { loop: false, frames: [
        { sx: 1028, sy: 835, sw: 61, sh: 89, dur: 8, ox: -3 },
    ]},
    air_eggshoot: { loop: false, frames: [
        { sx: 881,  sy: 946, sw: 69, sh: 62, dur: 6, ox: -4 },
        { sx: 1027, sy: 926, sw: 61, sh: 90, dur: 6, ox: -8 },
        { sx: 959,  sy: 925, sw: 63, sh: 91, dur: 8, ox: -6 },
        { sx: 1239, sy: 869, sw: 54, sh: 53, dur: 12, ox: -2 }, // POI frame
    ]},
    hurt: { loop: true, frames: [
        { sx: 881, sy: 946, sw: 69, sh: 62, dur: 3, ox: -4 },
    ]},
    die: { loop: false, frames: [
        { sx: 881, sy: 946, sw: 69, sh: 62, dur: 999, ox: -4 },
    ]},
};

// Egg projectile sprite (from mavericks.png, center alignment)
const EGG_SPRITE = { sx: 802, sy: 978, sw: 16, sh: 16 };

// Baby bird projectile sprites (from mavericks.png, center alignment)
const BIRD_FRAMES = [
    { sx: 822, sy: 959, sw: 20, sh: 15, dur: 3 },
    { sx: 851, sy: 960, sw: 19, sh: 15, dur: 3 },
    { sx: 826, sy: 983, sw: 18, sh: 13, dur: 3 },
    { sx: 849, sy: 984, sw: 19, sh: 12, dur: 3 },
];

// Tornado projectile sprites (from effects.png, center alignment — tornado_mid frames)
const TORNADO_FRAMES = [
    { sx: 334, sy: 904, sw: 16, sh: 17, dur: 2 },
    { sx: 409, sy: 898, sw: 16, sh: 28, dur: 2 },
    { sx: 477, sy: 897, sw: 16, sh: 31, dur: 2 },
    { sx: 563, sy: 903, sw: 16, sh: 16, dur: 2 },
];

// Explosion frames (from effects.png, same as all enemies)
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

export class StormEagle extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = SE.HP;
        this.maxHp = SE.HP;

        this.hitboxX = SE.HITBOX_X;
        this.hitboxY = SE.HITBOX_Y;
        this.hitboxW = SE.WIDTH;
        this.hitboxH = SE.HEIGHT;

        this.facing = -1;       // Start facing left
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        // Activation: boss stays passive until player crosses this X threshold
        this.activated = false;
        this.activationX = 0;    // Set externally (0 = always active)

        // Track ground Y for fly targeting (only valid after first landing)
        this.groundY = y;
        this.hasLanded = false;

        // Timers
        this.idleTimer = SE.IDLE_MIN + Math.floor(Math.random() * (SE.IDLE_MAX - SE.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Gust state
        this.gustTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Fly state
        this.flyTimer = 0;
        this.flyBobPhase = 0;
        this.useGravity = true;

        // Dive state
        this.diveVx = 0;
        this.diveVy = 0;

        // Egg state
        this.eggFired = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Projectiles
        this.shots = [];     // Tornado projectiles
        this.eggs = [];      // Egg projectiles
        this.birds = [];     // Baby bird projectiles

        // Death explosion
        this.explosionFrame = 0;
        this.explosionTimer = 0;

        // Hit flash
        this.hitFlashTimer = 0;

        // Sprite images (set externally)
        this.spriteImage = null;   // mavericks.png
        this.effectsImage = null;  // effects.png
    }

    update(game) {
        this.audio = game.audio;
        if (this.contactCooldown > 0) this.contactCooldown--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this.invincibleTimer > 0) this.invincibleTimer--;

        const player = game.state?.player;
        const level = game.level;

        switch (this.state) {
            case 'idle':      this._idleState(player, level);      break;
            case 'shoot':     this._shootState(player, level);     break;
            case 'gust':      this._gustState(player, level);      break;
            case 'fly_up':    this._flyUpState(player, level);     break;
            case 'fly':       this._flyState(player, level);       break;
            case 'air_shoot': this._airShootState(player, level);  break;
            case 'dive':      this._diveState(player, level);      break;
            case 'egg':       this._eggState(player, level);       break;
            case 'recover':   this._recoverState(player, level);   break;
            case 'hurt':      this._hurtState(player, level);      break;
            case 'dying':     this._dyingState(); return;
        }

        // Gravity (only when enabled)
        if (this.useGravity) {
            this.vy += SE.GRAVITY;
            if (this.vy > SE.MAX_FALL_SPEED) this.vy = SE.MAX_FALL_SPEED;
        }

        // Collision (only when gravity-bound)
        if (this.useGravity) {
            this._moveAndCollide(level);
        } else {
            // Airborne — just move directly, no tile collision
            this.x += this.vx;
            this.y += this.vy;
        }

        // Track ground level when grounded
        if (this.grounded) {
            this.groundY = this.y + this.hitboxY + this.hitboxH;
            this.hasLanded = true;
        }

        // Recovery: if fallen far below the platform, fly back up
        // Only after first landing so groundY is valid (prevents flying off during initial fall)
        if (this.hasLanded && this.state !== 'recover' && this.state !== 'dying' && this.state !== 'fly_up') {
            const feetY = this.y + this.hitboxY + this.hitboxH;
            if (feetY > this.groundY + SE.RECOVER_MARGIN) {
                this.state = 'recover';
                this.useGravity = false;
                this.grounded = false;
                this.vx = 0;
                this.vy = SE.RECOVER_SPEED;
                this._setNormalHitbox();
                this._setAnim('jump_start');
            }
        }

        this._updateAnimation();
        this._updateProjectiles(level);
    }

    // --- AI States ---

    _idleState(player, level) {
        if (!player || player.dead) {
            this.vx = 0;
            this._setAnim('idle');
            return;
        }

        // Wait for player to cross activation threshold
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
        if (dist > 120) {
            this.vx = SE.RUN_SPEED * this.facing;
            this._setAnim('run');
        } else {
            this.vx = 0;
            this._setAnim('idle');
        }

        this.idleTimer--;
        if (this.idleTimer <= 0) {
            this._pickGroundAttack();
        }
    }

    _pickGroundAttack() {
        const attacks = ['shoot', 'gust', 'fly_up'];
        const pick = attacks[Math.floor(Math.random() * attacks.length)];
        this.vx = 0;

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'gust':
                this.state = 'gust';
                this.gustTimer = 0;
                this._setAnim('flap');
                break;
            case 'fly_up':
                this.state = 'fly_up';
                this.useGravity = false;
                this.grounded = false;
                this.vy = SE.FLY_UP_SPEED;
                this.vx = 0;
                this._setAnim('jump_start');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = SE.IDLE_MIN + Math.floor(Math.random() * (SE.IDLE_MAX - SE.IDLE_MIN));
        this._setNormalHitbox();
        this._setAnim('idle');
        this.useGravity = true;
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire on first animation frame
        if (!this.shotFired && this.animFrame >= 0) {
            this._fireTornado(SE.TORNADO_SPAWN_X, SE.TORNADO_SPAWN_Y);
            this.shotFired = true;
        }

        // Animation done → idle
        const anim = EAGLE_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _gustState(player, level) {
        this.vx = 0;
        this.gustTimer++;

        if (this.gustTimer > SE.GUST_DURATION) {
            this._enterIdle();
            return;
        }

        // Push player if in front and within range
        if (player && !player.dead) {
            const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
            const myCX = this.x + this.hitboxX + this.hitboxW / 2;
            const dx = playerCX - myCX;

            const inFront = (this.facing > 0 && dx > 0) || (this.facing < 0 && dx < 0);
            const inRange = Math.abs(dx) < SE.GUST_RANGE;

            if (inFront && inRange) {
                const pushDx = SE.GUST_PUSH * this.facing;
                const hitX = player.x + player.hitboxX;
                const hitY = player.y + player.hitboxY;
                const newHitX = resolveHorizontal(
                    level, hitX, hitY,
                    player.hitboxW, player.hitboxH, pushDx
                );
                player.x = newHitX - player.hitboxX;
            }
        }
    }

    _flyUpState(player, level) {
        this.vx = 0;

        // Target altitude: above ground level
        const targetY = this.groundY - SE.FLY_TARGET_ALT;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        if (feetY <= targetY) {
            // Reached target altitude
            this.vy = 0;
            this.state = 'fly';
            this.flyTimer = SE.FLY_ATTACK_MIN + Math.floor(Math.random() * (SE.FLY_ATTACK_MAX - SE.FLY_ATTACK_MIN));
            this.flyBobPhase = 0;
            this._setAnim('fly');
        }
    }

    _recoverState(player, level) {
        // Fly upward, clipping through ground, until above the platform
        this.vx = 0;
        this.vy = SE.RECOVER_SPEED;

        const feetY = this.y + this.hitboxY + this.hitboxH;
        const targetY = this.groundY - SE.FLY_TARGET_ALT;

        if (feetY <= targetY) {
            // Recovered — transition to normal fly state
            this.vy = 0;
            this.state = 'fly';
            this.flyTimer = SE.FLY_ATTACK_MIN + Math.floor(Math.random() * (SE.FLY_ATTACK_MAX - SE.FLY_ATTACK_MIN));
            this.flyBobPhase = 0;
            this._setAnim('fly');
        }
    }

    _flyState(player, level) {
        if (!player || player.dead) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        // Face player
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        this.facing = playerCX > myCX ? 1 : -1;

        // Drift toward player horizontally
        const dx = playerCX - myCX;
        if (Math.abs(dx) > 20) {
            this.vx = SE.FLY_DRIFT_SPEED * this.facing;
        } else {
            this.vx = 0;
        }

        // Gentle vertical bobbing
        this.flyBobPhase += SE.FLY_BOB_FREQ;
        this.vy = Math.sin(this.flyBobPhase) * SE.FLY_BOB_AMP;

        this.flyTimer--;
        if (this.flyTimer <= 0) {
            this._pickAirAttack(player);
        }
    }

    _pickAirAttack(player) {
        const attacks = ['air_shoot', 'dive', 'egg'];
        const pick = attacks[Math.floor(Math.random() * attacks.length)];

        switch (pick) {
            case 'air_shoot':
                this.state = 'air_shoot';
                this.shotFired = false;
                this.vx = 0;
                this.vy = 0;
                this._setAnim('air_shoot');
                break;
            case 'dive': {
                this.state = 'dive';
                this.vx = 0;
                this.vy = 0;
                this._setDiveHitbox();

                // Calculate dive vector toward player
                const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
                const playerCY = player.y + player.hitboxY + player.hitboxH / 2;
                const myCX = this.x + this.hitboxX + this.hitboxW / 2;
                const myCY = this.y + this.hitboxY + this.hitboxH / 2;
                const ddx = playerCX - myCX;
                const ddy = playerCY - myCY;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
                this.diveVx = (ddx / dist) * SE.DIVE_SPEED;
                this.diveVy = (ddy / dist) * SE.DIVE_SPEED;
                // Ensure dive goes downward
                if (this.diveVy < 1) this.diveVy = 1;
                this._setAnim('dive');
                break;
            }
            case 'egg':
                this.state = 'egg';
                this.eggFired = false;
                this.vx = 0;
                this.vy = 0;
                this._setAnim('air_eggshoot');
                break;
        }
    }

    _airShootState(player, level) {
        this.vx = 0;
        this.vy = 0;

        // Fire tornado
        if (!this.shotFired) {
            this._fireTornado(SE.AIR_TORNADO_SPAWN_X, SE.AIR_TORNADO_SPAWN_Y);
            this.shotFired = true;
        }

        // Animation done → fly
        const anim = EAGLE_ANIMS.air_shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'fly';
            this.flyTimer = SE.FLY_ATTACK_MIN + Math.floor(Math.random() * (SE.FLY_ATTACK_MAX - SE.FLY_ATTACK_MIN));
            this._setAnim('fly');
        }
    }

    _diveState(player, level) {
        // Move along dive vector
        this.vx = this.diveVx;
        this.vy = this.diveVy;

        // Check ground along the dive path (check multiple points to prevent overshoot)
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;
        const steps = Math.ceil(Math.abs(this.vy) / 4);
        for (let i = 1; i <= steps; i++) {
            const checkY = feetY + (this.vy * i / steps);
            if (isSolid(level, feetX, checkY)) {
                // Land — switch to gravity-based collision for proper placement
                this.vx = 0;
                this.diveVx = 0;
                this.diveVy = 0;
                this.useGravity = true;
                this._setNormalHitbox();
                this._enterIdle();
                return;
            }
        }
    }

    _eggState(player, level) {
        this.vx = 0;
        this.vy = 0;

        // Fire egg on animation frame 3
        if (!this.eggFired && this.animFrame >= 3) {
            this._fireEgg();
            this.eggFired = true;
        }

        // Animation done → fly
        const anim = EAGLE_ANIMS.air_eggshoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'fly';
            this.flyTimer = SE.FLY_ATTACK_MIN + Math.floor(Math.random() * (SE.FLY_ATTACK_MAX - SE.FLY_ATTACK_MIN));
            this._setAnim('fly');
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

    _fireTornado(spawnOx, spawnOy) {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.shots.push({
            x: feetX + spawnOx * this.facing,
            y: feetY + spawnOy,
            vx: SE.TORNADO_SPEED * this.facing,
            active: true,
            life: SE.TORNADO_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
        if (this.audio) this.audio.play('busterMid');
    }

    _fireEgg() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.eggs.push({
            x: feetX + SE.EGG_SPAWN_X * this.facing,
            y: feetY + SE.EGG_SPAWN_Y,
            vx: 0,
            vy: 0,
            active: true,
        });
    }

    _spawnBirds(x, y) {
        // 4 birds scatter in diagonal directions
        const patterns = [
            { bx: -1.0, by: -1.5, fx: -1, fy: 0.1 },   // upper-left
            { bx:  1.0, by: -1.5, fx:  1, fy: 0.1 },    // upper-right
            { bx: -1.0, by:  0.5, fx: -1, fy: -0.1 },   // lower-left
            { bx:  1.0, by:  0.5, fx:  1, fy: -0.1 },    // lower-right
        ];

        for (const p of patterns) {
            this.birds.push({
                x, y,
                vx: p.bx * SE.BIRD_SPEED,
                vy: p.by * SE.BIRD_SPEED,
                forwardVx: p.fx * SE.BIRD_SPEED,
                forwardVy: p.fy * SE.BIRD_SPEED,
                active: true,
                life: SE.BIRD_LIFETIME,
                burstTimer: SE.BIRD_BURST_TIME,
                animFrame: 0,
                animTimer: 0,
            });
        }
        if (this.audio) this.audio.play('explosion');
    }

    _setDiveHitbox() {
        this.hitboxX = SE.DIVE_HITBOX_X;
        this.hitboxY = SE.DIVE_HITBOX_Y;
        this.hitboxW = SE.DIVE_WIDTH;
        this.hitboxH = SE.DIVE_HEIGHT;
    }

    _setNormalHitbox() {
        this.hitboxX = SE.HITBOX_X;
        this.hitboxY = SE.HITBOX_Y;
        this.hitboxW = SE.WIDTH;
        this.hitboxH = SE.HEIGHT;
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
        if (this.invincibleTimer > 0) return;

        this.hp -= damage;
        this.hitFlashTimer = 6;
        this.invincibleTimer = SE.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this._setNormalHitbox();
            this.useGravity = false;
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Dive has armor — no hurt interruption
        if (this.state === 'dive') return;

        // Air states: fall back to idle on ground
        if (!this.useGravity) {
            this.useGravity = true;
        }

        this.state = 'hurt';
        this.hurtTimer = 6;
        this._setNormalHitbox();
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        const playerBox = player.getHitbox();

        // Dive contact damage
        if (this.state === 'dive') {
            const myBox = this.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(SE.DIVE_DAMAGE, fromDir);
                return;
            }
        }

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(SE.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = SE.CONTACT_COOLDOWN;
            }
        }

        // Tornado projectile damage
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const f = TORNADO_FRAMES[shot.animFrame % TORNADO_FRAMES.length];
            const shotBox = {
                x: shot.x - f.sw / 2, y: shot.y - f.sh / 2,
                w: f.sw, h: f.sh,
            };
            if (boxOverlap(shotBox, playerBox)) {
                const fromDir = shot.vx > 0 ? 1 : -1;
                player.takeDamage(SE.TORNADO_DAMAGE, fromDir);
                shot.active = false;
            }
        }

        // Egg damage
        for (const egg of this.eggs) {
            if (!egg.active) continue;
            const eggBox = {
                x: egg.x - 8, y: egg.y - 8,
                w: 16, h: 16,
            };
            if (boxOverlap(eggBox, playerBox)) {
                const fromDir = player.x < egg.x ? -1 : 1;
                player.takeDamage(SE.EGG_DAMAGE, fromDir);
                // Egg still continues (breaks on ground)
            }
        }

        // Bird damage
        for (const bird of this.birds) {
            if (!bird.active) continue;
            const birdBox = {
                x: bird.x - 10, y: bird.y - 8,
                w: 20, h: 15,
            };
            if (boxOverlap(birdBox, playerBox)) {
                const fromDir = player.x < bird.x ? -1 : 1;
                player.takeDamage(SE.BIRD_DAMAGE, fromDir);
                bird.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateProjectiles(level) {
        // Tornado shots
        for (const shot of this.shots) {
            if (!shot.active) continue;
            shot.x += shot.vx;
            shot.life--;
            if (shot.life <= 0) { shot.active = false; continue; }
            // Wall collision
            const checkX = shot.x + (shot.vx > 0 ? 7 : -7);
            if (isSolid(level, checkX, shot.y)) { shot.active = false; continue; }
            // Animate
            shot.animTimer++;
            const f = TORNADO_FRAMES[shot.animFrame % TORNADO_FRAMES.length];
            if (shot.animTimer >= f.dur) {
                shot.animTimer = 0;
                shot.animFrame = (shot.animFrame + 1) % TORNADO_FRAMES.length;
            }
        }
        this.shots = this.shots.filter(s => s.active);

        // Eggs
        for (const egg of this.eggs) {
            if (!egg.active) continue;
            egg.vy += SE.EGG_GRAVITY;
            if (egg.vy > SE.EGG_MAX_FALL) egg.vy = SE.EGG_MAX_FALL;
            egg.x += egg.vx;
            egg.y += egg.vy;
            // Ground collision
            if (isSolid(level, egg.x, egg.y + 8)) {
                this._spawnBirds(egg.x, egg.y);
                egg.active = false;
            }
        }
        this.eggs = this.eggs.filter(e => e.active);

        // Birds
        for (const bird of this.birds) {
            if (!bird.active) continue;
            bird.life--;
            if (bird.life <= 0) { bird.active = false; continue; }

            // Burst phase → forward phase
            if (bird.burstTimer > 0) {
                bird.burstTimer--;
                if (bird.burstTimer <= 0) {
                    bird.vx = bird.forwardVx;
                    bird.vy = bird.forwardVy;
                }
            }
            bird.x += bird.vx;
            bird.y += bird.vy;

            // Wall collision
            if (isSolid(level, bird.x, bird.y)) { bird.active = false; continue; }

            // Animate
            bird.animTimer++;
            const f = BIRD_FRAMES[bird.animFrame % BIRD_FRAMES.length];
            if (bird.animTimer >= f.dur) {
                bird.animTimer = 0;
                bird.animFrame = (bird.animFrame + 1) % BIRD_FRAMES.length;
            }
        }
        this.birds = this.birds.filter(b => b.active);
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

        const anim = EAGLE_ANIMS[this.animName];
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

        // Flash when invincible
        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = EAGLE_ANIMS[this.animName];
        if (!anim) return;
        const frame = anim.frames[this.animFrame % anim.frames.length];

        // Feet anchor (bottom-center of hitbox)
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
        } else {
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(
                Math.floor(this.x + this.hitboxX - camera.x),
                Math.floor(this.y + this.hitboxY - camera.y),
                this.hitboxW, this.hitboxH);
        }

        this._renderProjectiles(ctx, camera);
    }

    _renderProjectiles(ctx, camera) {
        // Tornado shots (from effects.png)
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const f = TORNADO_FRAMES[shot.animFrame % TORNADO_FRAMES.length];
            const sx = Math.floor(shot.x - camera.x);
            const sy = Math.floor(shot.y - camera.y);

            if (this.effectsImage) {
                const flipH = shot.vx < 0;
                if (flipH) {
                    ctx.save();
                    ctx.translate(sx, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(this.effectsImage,
                        f.sx, f.sy, f.sw, f.sh,
                        -Math.floor(f.sw / 2), sy - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.effectsImage,
                        f.sx, f.sy, f.sw, f.sh,
                        sx - Math.floor(f.sw / 2), sy - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                }
            } else {
                ctx.fillStyle = '#66ccff';
                ctx.fillRect(sx - 7, sy - 7, 14, 14);
            }
        }

        // Eggs (from mavericks.png)
        for (const egg of this.eggs) {
            if (!egg.active) continue;
            const ex = Math.floor(egg.x - camera.x);
            const ey = Math.floor(egg.y - camera.y);

            if (this.spriteImage) {
                ctx.drawImage(this.spriteImage,
                    EGG_SPRITE.sx, EGG_SPRITE.sy, EGG_SPRITE.sw, EGG_SPRITE.sh,
                    ex - 8, ey - 8, EGG_SPRITE.sw, EGG_SPRITE.sh);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ex - 8, ey - 8, 16, 16);
            }
        }

        // Birds (from mavericks.png)
        for (const bird of this.birds) {
            if (!bird.active) continue;
            const f = BIRD_FRAMES[bird.animFrame % BIRD_FRAMES.length];
            const bx = Math.floor(bird.x - camera.x);
            const by = Math.floor(bird.y - camera.y);

            if (this.spriteImage) {
                const flipH = bird.vx < 0;
                if (flipH) {
                    ctx.save();
                    ctx.translate(bx, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(this.spriteImage,
                        f.sx, f.sy, f.sw, f.sh,
                        -Math.floor(f.sw / 2), by - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteImage,
                        f.sx, f.sy, f.sw, f.sh,
                        bx - Math.floor(f.sw / 2), by - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                }
            } else {
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(bx - 10, by - 8, 20, 15);
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
