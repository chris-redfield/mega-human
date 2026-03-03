/**
 * spark-mandrill.js
 * Spark Mandrill boss — electric Maverick boss fight.
 *
 * AI States: idle, shoot, punch, dash_punch, jump_start, jump, land, hurt, dying
 * Attacks: electric spark projectile, punch (melee), dash punch (charging melee), jump attack
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const SM = {
    // Physics
    GRAVITY:          0.3,
    MAX_FALL_SPEED:   6.0,
    RUN_SPEED:        1.8,

    // Jump attack
    JUMP_VY:         -7.0,
    JUMP_VX:          3.5,

    // Punch
    PUNCH_DAMAGE:     4,

    // Dash punch
    DASH_PUNCH_SPEED: 5.0,
    DASH_PUNCH_DAMAGE: 5,

    // Electric spark
    SPARK_SPEED:      3.5,
    SPARK_DAMAGE:     3,
    SPARK_LIFETIME:   90,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // AI timing
    IDLE_MIN:         30,
    IDLE_MAX:         65,

    // Hitbox
    WIDTH:            30,
    HEIGHT:           50,
    HITBOX_X:         13,
    HITBOX_Y:         13,
};

// Sprite frames from mavericks.png (alignment: botmid)
const MANDRILL_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 666, sy: 17,  sw: 56, sh: 63, dur: 4 },
        { sx: 601, sy: 17,  sw: 56, sh: 61, dur: 4 },
        { sx: 535, sy: 17,  sw: 56, sh: 60, dur: 4 },
        { sx: 601, sy: 17,  sw: 56, sh: 61, dur: 4 },
    ]},
    run: { loop: true, frames: [
        { sx: 353, sy: 265, sw: 56, sh: 65, dur: 4 },
        { sx: 423, sy: 279, sw: 56, sh: 64, dur: 4 },
        { sx: 490, sy: 278, sw: 56, sh: 65, dur: 4 },
        { sx: 215, sy: 276, sw: 56, sh: 66, dur: 4 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 664, sy: 97,  sw: 58, sh: 61, dur: 4, ox: 2 },
        { sx: 522, sy: 98,  sw: 63, sh: 60, dur: 4, ox: 5 },
        { sx: 593, sy: 98,  sw: 63, sh: 60, dur: 6, ox: 5 },
        { sx: 522, sy: 98,  sw: 63, sh: 60, dur: 4, ox: 5 },
    ]},
    punch: { loop: false, frames: [
        { sx: 463, sy: 96,  sw: 57, sh: 61, dur: 2 },
        { sx: 377, sy: 91,  sw: 80, sh: 65, dur: 9, ox: 10 },
        { sx: 463, sy: 96,  sw: 57, sh: 61, dur: 4 },
    ]},
    dash_punch: { loop: false, frames: [
        { sx: 377, sy: 91,  sw: 80, sh: 65, dur: 4, ox: 15 },
        { sx: 296, sy: 94,  sw: 79, sh: 59, dur: 4, ox: 16 },
    ]},
    jump_start: { loop: false, frames: [
        { sx: 535, sy: 17,  sw: 56, sh: 60, dur: 2 },
        { sx: 470, sy: 10,  sw: 56, sh: 67, dur: 2, ox: -2 },
        { sx: 408, sy: 8,   sw: 56, sh: 69, dur: 2, ox: -2 },
    ]},
    jump: { loop: false, frames: [
        { sx: 342, sy: 8,   sw: 55, sh: 74, dur: 999, ox: 1 },
    ]},
    fall: { loop: false, frames: [
        { sx: 342, sy: 8,   sw: 55, sh: 74, dur: 999, ox: 1 },
    ]},
    land: { loop: false, frames: [
        { sx: 666, sy: 17,  sw: 56, sh: 63, dur: 4 },
        { sx: 535, sy: 17,  sw: 56, sh: 60, dur: 6 },
        { sx: 666, sy: 17,  sw: 56, sh: 63, dur: 4 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 274, sy: 179, sw: 62, sh: 63, dur: 3 },
        { sx: 340, sy: 176, sw: 67, sh: 68, dur: 3, ox: -2 },
    ]},
    die: { loop: false, frames: [
        { sx: 411, sy: 177, sw: 62, sh: 68, dur: 999, ox: -3 },
    ]},
};

// Spark projectile frames (center alignment, looping)
const SPARK_FRAMES = [
    { sx: 594, sy: 300, sw: 26, sh: 28, dur: 2 },
    { sx: 632, sy: 298, sw: 32, sh: 30, dur: 2 },
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

export class SparkMandrill extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = SM.HP;
        this.maxHp = SM.HP;

        this.hitboxX = SM.HITBOX_X;
        this.hitboxY = SM.HITBOX_Y;
        this.hitboxW = SM.WIDTH;
        this.hitboxH = SM.HEIGHT;

        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        this.activated = false;
        this.activationX = 0;

        // Timers
        this.idleTimer = SM.IDLE_MIN + Math.floor(Math.random() * (SM.IDLE_MAX - SM.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Punch state
        this.punchHit = false;

        // Dash punch state
        this.dashPunchTimer = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Spark projectiles
        this.sparks = [];

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
            case 'punch':      this._punchState(player, level);      break;
            case 'dash_punch': this._dashPunchState(player, level);  break;
            case 'jump_start': this._jumpStartState(player, level);  break;
            case 'jump':       this._jumpState(player, level);       break;
            case 'land':       this._landState(player, level);       break;
            case 'hurt':       this._hurtState(player, level);       break;
            case 'dying':      this._dyingState(); return;
        }

        // Gravity
        this.vy += SM.GRAVITY;
        if (this.vy > SM.MAX_FALL_SPEED) this.vy = SM.MAX_FALL_SPEED;

        this._moveAndCollide(level);
        this._updateAnimation();
        this._updateSparks(level);
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
        if (dist > 100) {
            this.vx = SM.RUN_SPEED * this.facing;
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

        // Close range: prefer punch, medium: dash punch or shoot, far: jump or shoot
        let pick;
        if (dist < 60) {
            const opts = ['punch', 'punch', 'jump', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else if (dist < 150) {
            const opts = ['dash_punch', 'shoot', 'jump', 'punch'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        } else {
            const opts = ['jump', 'shoot', 'dash_punch', 'shoot'];
            pick = opts[Math.floor(Math.random() * opts.length)];
        }

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'punch':
                this.state = 'punch';
                this.punchHit = false;
                this._setAnim('punch');
                break;
            case 'dash_punch':
                this.state = 'dash_punch';
                this.dashPunchTimer = 0;
                this._setAnim('dash_punch');
                break;
            case 'jump':
                this.state = 'jump_start';
                this._setAnim('jump_start');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = SM.IDLE_MIN + Math.floor(Math.random() * (SM.IDLE_MAX - SM.IDLE_MIN));
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire spark on frame 2
        if (!this.shotFired && this.animFrame >= 2) {
            this._fireSpark();
            this.shotFired = true;
        }

        // Animation done → idle
        const anim = MANDRILL_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _punchState(player, level) {
        this.vx = 0;

        // Punch hitbox active on frame 1 (the extended arm)
        if (!this.punchHit && this.animFrame >= 1 && player && !player.dead) {
            const punchBox = this._getPunchHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(punchBox, playerBox)) {
                const fromDir = this.facing;
                player.takeDamage(SM.PUNCH_DAMAGE, fromDir);
                this.punchHit = true;
            }
        }

        // Animation done → idle
        const anim = MANDRILL_ANIMS.punch;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _dashPunchState(player, level) {
        this.dashPunchTimer++;
        this.vx = SM.DASH_PUNCH_SPEED * this.facing;

        // Check punch collision
        if (player && !player.dead) {
            const punchBox = this._getDashPunchHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(punchBox, playerBox)) {
                const fromDir = this.facing;
                player.takeDamage(SM.DASH_PUNCH_DAMAGE, fromDir);
                this._enterIdle();
                return;
            }
        }

        // Stop on wall hit or after duration
        if (this.dashPunchTimer > 30) {
            this._enterIdle();
        }
    }

    _jumpStartState(player, level) {
        this.vx = 0;

        const anim = MANDRILL_ANIMS.jump_start;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this.state = 'jump';
            this.vy = SM.JUMP_VY;
            this.vx = SM.JUMP_VX * this.facing;
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

        const anim = MANDRILL_ANIMS.land;
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

    _fireSpark() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.sparks.push({
            x: feetX + 25 * this.facing,
            y: feetY - 30,
            vx: SM.SPARK_SPEED * this.facing,
            active: true,
            life: SM.SPARK_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
    }

    _getPunchHitbox() {
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        const cy = this.y + this.hitboxY + this.hitboxH / 2;
        const w = 53;
        const h = 49;
        return {
            x: this.facing > 0 ? cx : cx - w,
            y: cy - h / 2,
            w: w,
            h: h,
        };
    }

    _getDashPunchHitbox() {
        const cx = this.x + this.hitboxX + this.hitboxW / 2;
        const cy = this.y + this.hitboxY + this.hitboxH / 2;
        const w = 60;
        const h = 41;
        return {
            x: this.facing > 0 ? cx : cx - w,
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
            if (this.state === 'dash_punch') {
                this._enterIdle();
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
        this.invincibleTimer = SM.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Dash punch has armor
        if (this.state === 'dash_punch') return;

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
                player.takeDamage(SM.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = SM.CONTACT_COOLDOWN;
            }
        }

        // Spark projectile damage
        const playerBox = player.getHitbox();
        for (const spark of this.sparks) {
            if (!spark.active) continue;
            const f = SPARK_FRAMES[spark.animFrame % SPARK_FRAMES.length];
            const sparkBox = {
                x: spark.x - f.sw / 2,
                y: spark.y - f.sh / 2,
                w: f.sw,
                h: f.sh,
            };
            if (boxOverlap(sparkBox, playerBox)) {
                const fromDir = spark.vx > 0 ? 1 : -1;
                player.takeDamage(SM.SPARK_DAMAGE, fromDir);
                spark.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateSparks(level) {
        for (const spark of this.sparks) {
            if (!spark.active) continue;
            spark.x += spark.vx;
            spark.life--;
            if (spark.life <= 0) { spark.active = false; continue; }

            const checkX = spark.x + (spark.vx > 0 ? 13 : -13);
            if (isSolid(level, checkX, spark.y)) { spark.active = false; }

            // Animate
            spark.animTimer++;
            const f = SPARK_FRAMES[spark.animFrame % SPARK_FRAMES.length];
            if (spark.animTimer >= f.dur) {
                spark.animTimer = 0;
                spark.animFrame = (spark.animFrame + 1) % SPARK_FRAMES.length;
            }
        }
        this.sparks = this.sparks.filter(s => s.active);
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

        const anim = MANDRILL_ANIMS[this.animName];
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

        const anim = MANDRILL_ANIMS[this.animName];
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

        this._renderSparks(ctx, camera);
    }

    _renderSparks(ctx, camera) {
        for (const spark of this.sparks) {
            if (!spark.active) continue;
            const f = SPARK_FRAMES[spark.animFrame % SPARK_FRAMES.length];
            const sx = Math.floor(spark.x - camera.x);
            const sy = Math.floor(spark.y - camera.y);

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
