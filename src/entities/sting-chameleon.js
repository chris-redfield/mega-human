/**
 * sting-chameleon.js
 * Sting Chameleon boss — tongue-whipping Maverick boss fight.
 *
 * AI States: idle, shoot, tongue, jump_start, jump, land, hurt, dying
 * Attacks: spike projectile, 3 tongue variants (horizontal, diagonal, vertical), jump
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const SC = {
    // Physics
    GRAVITY:          0.3,
    MAX_FALL_SPEED:   6.0,
    RUN_SPEED:        2.0,

    // Jump
    JUMP_VY:         -9.0,
    JUMP_VX:          4.0,

    // Spike projectile
    SPIKE_SPEED:      4.5,
    SPIKE_DAMAGE:     3,
    SPIKE_LIFETIME:   60,
    SPIKE_SPAWN_X:    21,
    SPIKE_SPAWN_Y:   -22,

    // Tongue
    TONGUE_DAMAGE:    4,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // AI timing
    IDLE_MIN:         25,
    IDLE_MAX:         55,

    // Hitbox
    WIDTH:            24,
    HEIGHT:           36,
    HITBOX_X:         13,
    HITBOX_Y:         6,
};

// Sprite frames from mavericks.png (alignment: botmid)
const CHAMELEON_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 517, sy: 1126, sw: 53, sh: 42, dur: 10, ox: -2 },
        { sx: 217, sy: 1126, sw: 50, sh: 42, dur: 10 },
        { sx: 156, sy: 1126, sw: 50, sh: 42, dur: 85 },
        { sx: 217, sy: 1126, sw: 50, sh: 42, dur: 10 },
        { sx: 517, sy: 1126, sw: 53, sh: 42, dur: 80, ox: -2 },
    ]},
    run: { loop: true, frames: [
        { sx: 798, sy: 1403, sw: 52, sh: 41, dur: 3, ox: -1 },
        { sx: 737, sy: 1402, sw: 52, sh: 43, dur: 3, ox: -1, oy: 1 },
        { sx: 685, sy: 1398, sw: 44, sh: 44, dur: 3, ox: 3, oy: -4 },
        { sx: 630, sy: 1396, sw: 46, sh: 49, dur: 3, ox: 2, oy: -1 },
        { sx: 581, sy: 1398, sw: 41, sh: 46, dur: 3, ox: 4 },
        { sx: 537, sy: 1398, sw: 37, sh: 46, dur: 3, ox: 6 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 185, sy: 1179, sw: 43, sh: 46, dur: 4, ox: -6 },
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 79,  sy: 1127, sw: 66, sh: 38, dur: 12, ox: -7 },
    ]},
    // Tongue horizontal (tongue1)
    tongue1: { loop: false, frames: [
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 185, sy: 1179, sw: 43, sh: 46, dur: 4, ox: -6 },
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 335, sy: 1185, sw: 54, sh: 43, dur: 2, ox: 3 },
        { sx: 397, sy: 1186, sw: 60, sh: 43, dur: 2, ox: 6 },
        { sx: 468, sy: 1187, sw: 104, sh: 43, dur: 2, ox: 28 },
        { sx: 484, sy: 1234, sw: 132, sh: 43, dur: 4, ox: 42 },
        { sx: 468, sy: 1187, sw: 104, sh: 43, dur: 2, ox: 28 },
        { sx: 397, sy: 1186, sw: 60, sh: 43, dur: 2, ox: 6 },
    ]},
    // Tongue diagonal up (tongue2)
    tongue2: { loop: false, frames: [
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 185, sy: 1179, sw: 43, sh: 46, dur: 4, ox: -6 },
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 706, sy: 1089, sw: 50, sh: 43, dur: 2, ox: 1 },
        { sx: 762, sy: 1087, sw: 86, sh: 45, dur: 2, ox: 19 },
        { sx: 852, sy: 1068, sw: 117, sh: 63, dur: 4, ox: 34 },
        { sx: 762, sy: 1087, sw: 86, sh: 45, dur: 2, ox: 19 },
        { sx: 706, sy: 1089, sw: 50, sh: 43, dur: 2, ox: 1 },
    ]},
    // Tongue vertical up (tongue3)
    tongue3: { loop: false, frames: [
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 185, sy: 1179, sw: 43, sh: 46, dur: 4, ox: -6 },
        { sx: 135, sy: 1177, sw: 43, sh: 48, dur: 4, ox: -5 },
        { sx: 1308, sy: 1411, sw: 50, sh: 43, dur: 2, ox: 1 },
        { sx: 1362, sy: 1390, sw: 61, sh: 64, dur: 2, ox: 6 },
        { sx: 1426, sy: 1363, sw: 73, sh: 91, dur: 4, ox: 12 },
        { sx: 1362, sy: 1390, sw: 61, sh: 64, dur: 2, ox: 6 },
        { sx: 1308, sy: 1411, sw: 50, sh: 43, dur: 2, ox: 1 },
    ]},
    jump_start: { loop: false, frames: [
        { sx: 376, sy: 1363, sw: 68, sh: 28, dur: 2, ox: -9 },
        { sx: 376, sy: 1363, sw: 68, sh: 28, dur: 2, ox: -9 },
        { sx: 23,  sy: 1123, sw: 48, sh: 41, dur: 2, ox: -2 },
    ]},
    jump: { loop: false, frames: [
        { sx: 23, sy: 1123, sw: 48, sh: 41, dur: 999, ox: -2 },
    ]},
    fall: { loop: false, frames: [
        { sx: 23, sy: 1123, sw: 48, sh: 41, dur: 999, ox: -2 },
    ]},
    land: { loop: false, frames: [
        { sx: 376, sy: 1363, sw: 68, sh: 28, dur: 6, ox: -8 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 28, sy: 1177, sw: 44, sh: 44, dur: 3, ox: -4 },
        { sx: 82, sy: 1179, sw: 44, sh: 42, dur: 3, ox: -5 },
    ]},
    die: { loop: false, frames: [
        { sx: 82, sy: 1179, sw: 44, sh: 42, dur: 999, ox: -5 },
    ]},
};

// Tongue hitbox data per tongue variant per active frame (frame indices 3+ in each tongue anim)
// tongue1: horizontal — wide rectangles extending forward
const TONGUE1_HITBOXES = [
    { w: 16,  h: 8, ox: 22,  oy: -19 },   // frame 3
    { w: 40,  h: 8, ox: 25,  oy: -19 },   // frame 4
    { w: 70,  h: 8, ox: 45,  oy: -18 },   // frame 5
    { w: 90,  h: 8, ox: 62,  oy: -18 },   // frame 6 (max extension)
    { w: 70,  h: 8, ox: 45,  oy: -18 },   // frame 7
    { w: 25,  h: 8, ox: 24,  oy: -18 },   // frame 8
];

// tongue2: diagonal up — extends forward and up
const TONGUE2_HITBOXES = [
    { w: 12, h: 8,  ox: 18,  oy: -20 },   // frame 3
    { w: 50, h: 40, ox: 19,  oy: -42 },   // frame 4
    { w: 70, h: 60, ox: 19,  oy: -61 },   // frame 5 (max)
    { w: 50, h: 40, ox: 19,  oy: -42 },   // frame 6
    { w: 12, h: 8,  ox: 18,  oy: -20 },   // frame 7
];

// tongue3: vertical up — extends mostly upward
const TONGUE3_HITBOXES = [
    { w: 10, h: 8,  ox: 17,  oy: -19 },   // frame 3
    { w: 16, h: 56, ox: 16,  oy: -58 },   // frame 4
    { w: 16, h: 85, ox: 16,  oy: -87 },   // frame 5 (max)
    { w: 16, h: 56, ox: 16,  oy: -58 },   // frame 6
    { w: 10, h: 8,  ox: 17,  oy: -18 },   // frame 7
];

// Spike projectile sprite (center alignment)
const SPIKE_SPRITE = { sx: 5, sy: 1145, sw: 7, sh: 11 };

// Chameleon sting projectile frames (center alignment, rotating)
const CSTING_FRAMES = [
    { sx: 337, sy: 1382, sw: 7,  sh: 9, dur: 4 },
    { sx: 336, sy: 1397, sw: 6,  sh: 10, dur: 4 },
    { sx: 335, sy: 1412, sw: 8,  sh: 8, dur: 4 },
    { sx: 335, sy: 1446, sw: 10, sh: 6, dur: 4 },
    { sx: 335, sy: 1425, sw: 9,  sh: 7, dur: 4 },
    { sx: 335, sy: 1437, sw: 10, sh: 6, dur: 4 },
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

export class StingChameleon extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = SC.HP;
        this.maxHp = SC.HP;

        this.hitboxX = SC.HITBOX_X;
        this.hitboxY = SC.HITBOX_Y;
        this.hitboxW = SC.WIDTH;
        this.hitboxH = SC.HEIGHT;

        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        this.activated = false;
        this.activationX = 0;

        // Timers
        this.idleTimer = SC.IDLE_MIN + Math.floor(Math.random() * (SC.IDLE_MAX - SC.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Tongue state
        this.tongueVariant = 'tongue1';
        this.tongueHit = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Spike projectiles
        this.spikes = [];

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
            case 'tongue':     this._tongueState(player, level);     break;
            case 'jump_start': this._jumpStartState(player, level);  break;
            case 'jump':       this._jumpState(player, level);       break;
            case 'land':       this._landState(player, level);       break;
            case 'hurt':       this._hurtState(player, level);       break;
            case 'dying':      this._dyingState(); return;
        }

        // Gravity
        this.vy += SC.GRAVITY;
        if (this.vy > SC.MAX_FALL_SPEED) this.vy = SC.MAX_FALL_SPEED;

        this._moveAndCollide(level);
        this._updateAnimation();
        this._updateSpikes(level);
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

        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        this.facing = playerCX > myCX ? 1 : -1;

        const dist = Math.abs(playerCX - myCX);
        if (dist > 110) {
            this.vx = SC.RUN_SPEED * this.facing;
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
        const playerCY = player.y + player.hitboxY + player.hitboxH / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        const myCY = this.y + this.hitboxY + this.hitboxH / 2;
        const dist = Math.abs(playerCX - myCX);
        const dy = myCY - playerCY; // positive = player is above

        this.vx = 0;

        let pick;
        if (dist < 90) {
            // Close range: tongue attacks based on player vertical position
            if (dy > 40) {
                // Player above: vertical or diagonal tongue
                const opts = ['tongue3', 'tongue2', 'jump'];
                pick = opts[Math.floor(Math.random() * opts.length)];
            } else {
                const opts = ['tongue1', 'tongue2', 'shoot', 'jump'];
                pick = opts[Math.floor(Math.random() * opts.length)];
            }
        } else {
            const opts = ['shoot', 'jump', 'tongue1', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        }

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'tongue1':
            case 'tongue2':
            case 'tongue3':
                this.state = 'tongue';
                this.tongueVariant = pick;
                this.tongueHit = false;
                this._setAnim(pick);
                break;
            case 'jump':
                this.state = 'jump_start';
                this._setAnim('jump_start');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = SC.IDLE_MIN + Math.floor(Math.random() * (SC.IDLE_MAX - SC.IDLE_MIN));
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire spike on frame 3 (last frame, the extended pose)
        if (!this.shotFired && this.animFrame >= 3) {
            this._fireSpike();
            this.shotFired = true;
        }

        const anim = CHAMELEON_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _tongueState(player, level) {
        this.vx = 0;

        // Check tongue hitbox against player on active frames (frame 3+)
        if (!this.tongueHit && this.animFrame >= 3 && player && !player.dead) {
            const tongueBox = this._getTongueHitbox();
            if (tongueBox) {
                const playerBox = player.getHitbox();
                if (boxOverlap(tongueBox, playerBox)) {
                    player.takeDamage(SC.TONGUE_DAMAGE, this.facing);
                    this.tongueHit = true;
                }
            }
        }

        const anim = CHAMELEON_ANIMS[this.tongueVariant];
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _jumpStartState(player, level) {
        this.vx = 0;

        const anim = CHAMELEON_ANIMS.jump_start;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'jump';
            this.vy = SC.JUMP_VY;
            this.vx = SC.JUMP_VX * this.facing;
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

        const anim = CHAMELEON_ANIMS.land;
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

    _fireSpike() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.spikes.push({
            x: feetX + SC.SPIKE_SPAWN_X * this.facing,
            y: feetY + SC.SPIKE_SPAWN_Y,
            vx: SC.SPIKE_SPEED * this.facing,
            active: true,
            life: SC.SPIKE_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
    }

    _getTongueHitbox() {
        // Get tongue hitbox data based on variant and current anim frame
        let hitboxes;
        if (this.tongueVariant === 'tongue1') hitboxes = TONGUE1_HITBOXES;
        else if (this.tongueVariant === 'tongue2') hitboxes = TONGUE2_HITBOXES;
        else hitboxes = TONGUE3_HITBOXES;

        const idx = this.animFrame - 3; // Active frames start at index 3
        if (idx < 0 || idx >= hitboxes.length) return null;

        const hb = hitboxes[idx];
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        return {
            x: this.facing > 0 ? feetX + hb.ox : feetX - hb.ox - hb.w,
            y: feetY + hb.oy,
            w: hb.w,
            h: hb.h,
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

        this.hp -= damage;
        this.hitFlashTimer = 6;
        this.invincibleTimer = SC.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Tongue has armor (can't interrupt mid-lash)
        if (this.state === 'tongue' && this.animFrame >= 3) return;

        this.state = 'hurt';
        this.hurtTimer = 6;
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
                player.takeDamage(SC.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = SC.CONTACT_COOLDOWN;
            }
        }

        // Spike projectile damage
        const playerBox = player.getHitbox();
        for (const spike of this.spikes) {
            if (!spike.active) continue;
            const spikeBox = {
                x: spike.x - SPIKE_SPRITE.sw / 2,
                y: spike.y - SPIKE_SPRITE.sh / 2,
                w: SPIKE_SPRITE.sw,
                h: SPIKE_SPRITE.sh,
            };
            if (boxOverlap(spikeBox, playerBox)) {
                const fromDir = spike.vx > 0 ? 1 : -1;
                player.takeDamage(SC.SPIKE_DAMAGE, fromDir);
                spike.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateSpikes(level) {
        for (const spike of this.spikes) {
            if (!spike.active) continue;
            spike.x += spike.vx;
            spike.life--;
            if (spike.life <= 0) { spike.active = false; continue; }

            const checkX = spike.x + (spike.vx > 0 ? 4 : -4);
            if (isSolid(level, checkX, spike.y)) { spike.active = false; }

            // Animate chameleon sting rotation
            spike.animTimer++;
            const f = CSTING_FRAMES[spike.animFrame % CSTING_FRAMES.length];
            if (spike.animTimer >= f.dur) {
                spike.animTimer = 0;
                spike.animFrame = (spike.animFrame + 1) % CSTING_FRAMES.length;
            }
        }
        this.spikes = this.spikes.filter(s => s.active);
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

        const anim = CHAMELEON_ANIMS[this.animName];
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

        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = CHAMELEON_ANIMS[this.animName];
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

        this._renderSpikes(ctx, camera);
    }

    _renderSpikes(ctx, camera) {
        for (const spike of this.spikes) {
            if (!spike.active) continue;
            const f = CSTING_FRAMES[spike.animFrame % CSTING_FRAMES.length];
            const sx = Math.floor(spike.x - camera.x);
            const sy = Math.floor(spike.y - camera.y);

            if (this.spriteImage) {
                const flipH = spike.vx < 0;
                if (flipH) {
                    ctx.save();
                    ctx.translate(sx, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(this.spriteImage,
                        f.sx, f.sy, f.sw, f.sh,
                        -Math.floor(f.sw / 2), sy - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteImage,
                        f.sx, f.sy, f.sw, f.sh,
                        sx - Math.floor(f.sw / 2), sy - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                }
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
