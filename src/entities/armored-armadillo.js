/**
 * armored-armadillo.js
 * Armored Armadillo boss — defensive Maverick boss fight.
 *
 * AI States: idle, shoot, roll_enter, roll, roll_exit, block, jump_start, jump, land, hurt, dying
 * Attacks: energy projectile, rolling ball (armor, wall bounce), block (deflects shots)
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const AA = {
    // Physics
    GRAVITY:          0.3,
    MAX_FALL_SPEED:   6.0,
    RUN_SPEED:        1.6,

    // Jump
    JUMP_VY:         -7.0,
    JUMP_VX:          3.5,

    // Roll attack
    ROLL_SPEED:       6.5,
    ROLL_DAMAGE:      4,
    ROLL_MAX_TIME:    90,
    ROLL_DECEL:       0.08,
    ROLL_SLOW_TIME:   60,

    // Projectile
    PROJ_SPEED:       4.0,
    PROJ_DAMAGE:      3,
    PROJ_LIFETIME:    60,
    PROJ_SPAWN_X:     11,
    PROJ_SPAWN_Y:    -31,

    // Block
    BLOCK_DURATION:   45,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // AI timing
    IDLE_MIN:         30,
    IDLE_MAX:         65,

    // Hitbox (normal)
    WIDTH:            28,
    HEIGHT:           34,
    HITBOX_X:         13,
    HITBOX_Y:         8,

    // Hitbox (roll — smaller, round)
    ROLL_WIDTH:       32,
    ROLL_HEIGHT:      26,
    ROLL_HITBOX_X:    0,
    ROLL_HITBOX_Y:    0,
};

// Sprite frames from mavericks.png (alignment: botmid)
const ARMADILLO_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 972, sy: 75, sw: 53, sh: 42, dur: 4, ox: -5 },
    ]},
    run: { loop: true, frames: [
        { sx: 8,   sy: 1467, sw: 55, sh: 43, dur: 5, ox: -6 },
        { sx: 65,  sy: 1466, sw: 54, sh: 43, dur: 5, ox: -6 },
        { sx: 125, sy: 1468, sw: 50, sh: 41, dur: 5, ox: -6 },
        { sx: 179, sy: 1467, sw: 50, sh: 42, dur: 5, ox: -7 },
        { sx: 232, sy: 1466, sw: 51, sh: 43, dur: 5, ox: -8 },
        { sx: 287, sy: 1466, sw: 52, sh: 43, dur: 5, ox: -7 },
        { sx: 342, sy: 1468, sw: 54, sh: 41, dur: 5, ox: -4 },
        { sx: 400, sy: 1467, sw: 55, sh: 42, dur: 5, ox: -5 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 806, sy: 18,  sw: 54, sh: 44, dur: 4, ox: -6 },
        { sx: 771, sy: 229, sw: 54, sh: 44, dur: 4, ox: -6 },
        { sx: 806, sy: 18,  sw: 54, sh: 44, dur: 20, ox: -6 },
    ]},
    roll_enter: { loop: false, frames: [
        { sx: 861, sy: 168, sw: 48, sh: 57, dur: 4, ox: 1, oy: 15 },
        { sx: 963, sy: 169, sw: 57, sh: 49, dur: 4, ox: -4, oy: 7 },
        { sx: 861, sy: 168, sw: 48, sh: 57, dur: 4, ox: 1, oy: 15 },
        { sx: 815, sy: 165, sw: 42, sh: 57, dur: 4, ox: 0, oy: 15 },
        { sx: 759, sy: 72,  sw: 37, sh: 41, dur: 4 },
    ]},
    roll: { loop: true, frames: [
        { sx: 902, sy: 343, sw: 32, sh: 26, dur: 1 },
        { sx: 941, sy: 343, sw: 32, sh: 31, dur: 1 },
        { sx: 981, sy: 343, sw: 32, sh: 32, dur: 1 },
        { sx: 1023, sy: 345, sw: 32, sh: 30, dur: 1 },
    ]},
    roll_exit: { loop: false, frames: [
        { sx: 759, sy: 72,  sw: 37, sh: 41, dur: 4, ox: -2, oy: -3 },
        { sx: 815, sy: 165, sw: 42, sh: 57, dur: 4, ox: 1, oy: 12 },
        { sx: 914, sy: 168, sw: 48, sh: 57, dur: 4, ox: 2, oy: 13 },
    ]},
    block: { loop: false, frames: [
        { sx: 1018, sy: 124, sw: 52, sh: 42, dur: 999, ox: -6 },
    ]},
    jump_start: { loop: false, frames: [
        { sx: 911, sy: 75,  sw: 55, sh: 41, dur: 2, ox: -6 },
        { sx: 861, sy: 168, sw: 48, sh: 57, dur: 2, ox: 1, oy: 15 },
        { sx: 963, sy: 169, sw: 57, sh: 49, dur: 2, ox: -2 },
    ]},
    jump: { loop: false, frames: [
        { sx: 963, sy: 169, sw: 57, sh: 49, dur: 999, ox: -2 },
    ]},
    fall: { loop: false, frames: [
        { sx: 963, sy: 169, sw: 57, sh: 49, dur: 999, ox: -2 },
    ]},
    land: { loop: false, frames: [
        { sx: 896, sy: 231, sw: 53, sh: 48, dur: 4, ox: -4 },
        { sx: 861, sy: 168, sw: 48, sh: 57, dur: 4, ox: 2, oy: 15 },
        { sx: 911, sy: 75,  sw: 55, sh: 41, dur: 4, ox: -6 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 1014, sy: 224, sw: 59, sh: 47, dur: 3, ox: -1 },
    ]},
    die: { loop: false, frames: [
        { sx: 1014, sy: 224, sw: 59, sh: 47, dur: 999, ox: -1 },
    ]},
};

// Energy projectile frames (center alignment, looping)
const PROJ_FRAMES = [
    { sx: 870, sy: 34,  sw: 20, sh: 19, dur: 2, ox: -2 },
    { sx: 898, sy: 36,  sw: 20, sh: 14, dur: 2, ox: -3 },
    { sx: 925, sy: 35,  sw: 16, sh: 14, dur: 2, ox: -2 },
    { sx: 947, sy: 36,  sw: 16, sh: 16, dur: 2 },
    { sx: 969, sy: 37,  sw: 12, sh: 12, dur: 2 },
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

export class ArmoredArmadillo extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = AA.HP;
        this.maxHp = AA.HP;

        this.hitboxX = AA.HITBOX_X;
        this.hitboxY = AA.HITBOX_Y;
        this.hitboxW = AA.WIDTH;
        this.hitboxH = AA.HEIGHT;

        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        this.activated = false;
        this.activationX = 0;

        // Timers
        this.idleTimer = AA.IDLE_MIN + Math.floor(Math.random() * (AA.IDLE_MAX - AA.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Roll state
        this.rollTimer = 0;
        this.rollSpeed = 0;

        // Block state
        this.blockTimer = 0;
        this.blocking = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Energy projectiles
        this.shots = [];

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
            case 'roll_enter': this._rollEnterState(player, level);  break;
            case 'roll':       this._rollState(player, level);       break;
            case 'roll_exit':  this._rollExitState(player, level);   break;
            case 'block':      this._blockState(player, level);      break;
            case 'jump_start': this._jumpStartState(player, level);  break;
            case 'jump':       this._jumpState(player, level);       break;
            case 'land':       this._landState(player, level);       break;
            case 'hurt':       this._hurtState(player, level);       break;
            case 'dying':      this._dyingState(); return;
        }

        // Gravity
        this.vy += AA.GRAVITY;
        if (this.vy > AA.MAX_FALL_SPEED) this.vy = AA.MAX_FALL_SPEED;

        this._moveAndCollide(level);
        this._updateAnimation();
        this._updateShots(level);
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
            this.vx = AA.RUN_SPEED * this.facing;
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
        if (dist < 70) {
            const opts = ['roll', 'block', 'jump', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else if (dist < 150) {
            const opts = ['shoot', 'roll', 'block', 'jump'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else {
            const opts = ['roll', 'shoot', 'jump', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        }

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'roll':
                this.state = 'roll_enter';
                this.rollTimer = 0;
                this.rollSpeed = AA.ROLL_SPEED;
                this._setAnim('roll_enter');
                break;
            case 'block':
                this.state = 'block';
                this.blockTimer = 0;
                this.blocking = true;
                this._setAnim('block');
                break;
            case 'jump':
                this.state = 'jump_start';
                this._setAnim('jump_start');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.blocking = false;
        this.idleTimer = AA.IDLE_MIN + Math.floor(Math.random() * (AA.IDLE_MAX - AA.IDLE_MIN));
        this._setNormalHitbox();
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        if (!this.shotFired && this.animFrame >= 1) {
            this._fireProjectile();
            this.shotFired = true;
        }

        const anim = ARMADILLO_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _rollEnterState(player, level) {
        this.vx = 0;

        const anim = ARMADILLO_ANIMS.roll_enter;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'roll';
            this._setRollHitbox();
            this._setAnim('roll');
        }
    }

    _rollState(player, level) {
        this.rollTimer++;

        if (this.rollTimer > AA.ROLL_MAX_TIME) {
            this.state = 'roll_exit';
            this.vx = 0;
            this._setNormalHitbox();
            this._setAnim('roll_exit');
            return;
        }

        if (this.rollTimer > AA.ROLL_SLOW_TIME) {
            this.rollSpeed -= AA.ROLL_DECEL;
            if (this.rollSpeed < 1.0) this.rollSpeed = 1.0;
        }

        this.vx = this.rollSpeed * this.facing;
    }

    _rollExitState(player, level) {
        this.vx = 0;

        const anim = ARMADILLO_ANIMS.roll_exit;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _blockState(player, level) {
        this.vx = 0;
        this.blockTimer++;

        if (this.blockTimer >= AA.BLOCK_DURATION) {
            this._enterIdle();
        }
    }

    _jumpStartState(player, level) {
        this.vx = 0;

        const anim = ARMADILLO_ANIMS.jump_start;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'jump';
            this.vy = AA.JUMP_VY;
            this.vx = AA.JUMP_VX * this.facing;
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

        const anim = ARMADILLO_ANIMS.land;
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

    _fireProjectile() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.shots.push({
            x: feetX + AA.PROJ_SPAWN_X * this.facing,
            y: feetY + AA.PROJ_SPAWN_Y,
            vx: AA.PROJ_SPEED * this.facing,
            active: true,
            life: AA.PROJ_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
    }

    _setRollHitbox() {
        this.hitboxX = AA.ROLL_HITBOX_X;
        this.hitboxY = AA.ROLL_HITBOX_Y;
        this.hitboxW = AA.ROLL_WIDTH;
        this.hitboxH = AA.ROLL_HEIGHT;
    }

    _setNormalHitbox() {
        // Keep feet anchored when switching from roll hitbox to normal
        const oldFeetY = this.y + this.hitboxY + this.hitboxH;
        this.hitboxX = AA.HITBOX_X;
        this.hitboxY = AA.HITBOX_Y;
        this.hitboxW = AA.WIDTH;
        this.hitboxH = AA.HEIGHT;
        this.y = oldFeetY - this.hitboxY - this.hitboxH;
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
            if (this.state === 'roll') {
                // Bounce off wall
                this.facing *= -1;
            } else {
                this.vx = 0;
            }
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

        // Block deflects damage
        if (this.state === 'block') return;

        // Roll has armor (takes damage but no interruption)
        if (this.state === 'roll' || this.state === 'roll_enter') {
            this.hp -= damage;
            this.hitFlashTimer = 6;
            this.invincibleTimer = AA.INVINCIBLE_TIME;
            if (this.hp <= 0) {
                this.hp = 0;
                this.state = 'dying';
                this._setNormalHitbox();
                this.explosionFrame = 0;
                this.explosionTimer = 0;
                if (this.audio) this.audio.play('maverickDie');
            }
            return;
        }

        this.hp -= damage;
        this.hitFlashTimer = 6;
        this.invincibleTimer = AA.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this._setNormalHitbox();
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        this.state = 'hurt';
        this.hurtTimer = 6;
        this._setNormalHitbox();
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                const dmg = this.state === 'roll' ? AA.ROLL_DAMAGE : AA.CONTACT_DAMAGE;
                player.takeDamage(dmg, fromDir);
                this.contactCooldown = AA.CONTACT_COOLDOWN;
            }
        }

        const playerBox = player.getHitbox();
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const f = PROJ_FRAMES[shot.animFrame % PROJ_FRAMES.length];
            const shotBox = {
                x: shot.x - f.sw / 2,
                y: shot.y - f.sh / 2,
                w: f.sw,
                h: f.sh,
            };
            if (boxOverlap(shotBox, playerBox)) {
                const fromDir = shot.vx > 0 ? 1 : -1;
                player.takeDamage(AA.PROJ_DAMAGE, fromDir);
                shot.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateShots(level) {
        for (const shot of this.shots) {
            if (!shot.active) continue;
            shot.x += shot.vx;
            shot.life--;
            if (shot.life <= 0) { shot.active = false; continue; }

            const checkX = shot.x + (shot.vx > 0 ? 10 : -10);
            if (isSolid(level, checkX, shot.y)) { shot.active = false; }

            shot.animTimer++;
            const f = PROJ_FRAMES[shot.animFrame % PROJ_FRAMES.length];
            if (shot.animTimer >= f.dur) {
                shot.animTimer = 0;
                shot.animFrame = (shot.animFrame + 1) % PROJ_FRAMES.length;
            }
        }
        this.shots = this.shots.filter(s => s.active);
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

        const anim = ARMADILLO_ANIMS[this.animName];
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

        const anim = ARMADILLO_ANIMS[this.animName];
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

        this._renderShots(ctx, camera);
    }

    _renderShots(ctx, camera) {
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const f = PROJ_FRAMES[shot.animFrame % PROJ_FRAMES.length];
            const sx = Math.floor(shot.x - camera.x);
            const sy = Math.floor(shot.y - camera.y);
            const pox = f.ox || 0;

            if (this.spriteImage) {
                const flipH = shot.vx < 0;
                if (flipH) {
                    ctx.save();
                    ctx.translate(sx, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(this.spriteImage,
                        f.sx, f.sy, f.sw, f.sh,
                        -Math.floor(f.sw / 2) + pox, sy - Math.floor(f.sh / 2),
                        f.sw, f.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteImage,
                        f.sx, f.sy, f.sw, f.sh,
                        sx - Math.floor(f.sw / 2) + pox, sy - Math.floor(f.sh / 2),
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
