/**
 * chill-penguin.js
 * Chill Penguin boss — first Maverick boss fight.
 *
 * AI States: idle, shoot, slide, blow, hurt, dying
 * Attacks: ice shot projectile, belly slide (wall bounce), ice blow (push wind)
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

// Boss constants
const CP = {
    // Physics
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,
    RUN_SPEED:        1.5,

    // Slide attack
    SLIDE_SPEED:      5.8,
    SLIDE_SLOW_TIME:  45,       // frames before deceleration
    SLIDE_MAX_TIME:   75,       // total slide duration
    SLIDE_DECEL:      0.12,
    SLIDE_DAMAGE:     3,

    // Ice shot
    ICE_SPEED:        4.2,
    ICE_DAMAGE:       3,
    ICE_LIFETIME:     45,
    ICE_SPAWN_X:      18,       // from POI data
    ICE_SPAWN_Y:     -22,

    // Ice blow (wind push)
    BLOW_PUSH:        2.5,
    BLOW_RANGE:       180,
    BLOW_DURATION:    96,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  45,        // frames of invincibility after taking damage

    // AI timing
    IDLE_MIN:         40,
    IDLE_MAX:         80,

    // Hitbox (normal standing)
    WIDTH:            24,
    HEIGHT:           30,
    HITBOX_X:         7,
    HITBOX_Y:         6,

    // Hitbox (slide pose — wider, shorter)
    SLIDE_WIDTH:      34,
    SLIDE_HEIGHT:     24,
    SLIDE_HITBOX_X:   3,
    SLIDE_HITBOX_Y:   7,
};

// Sprite frames from mavericks.png (alignment: botmid)
const PENGUIN_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 221, sy: 77,  sw: 38, sh: 36, dur: 8 },
        { sx: 43,  sy: 77,  sw: 38, sh: 36, dur: 8 },
    ]},
    run: { loop: true, frames: [
        { sx: 21,  sy: 266, sw: 35, sh: 38, dur: 6 },
        { sx: 66,  sy: 269, sw: 35, sh: 37, dur: 6 },
        { sx: 110, sy: 271, sw: 35, sh: 38, dur: 6 },
        { sx: 153, sy: 271, sw: 35, sh: 39, dur: 6 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 175, sy: 76,  sw: 42, sh: 37, dur: 5, ox: -5 },
        { sx: 128, sy: 76,  sw: 43, sh: 37, dur: 5, ox: -6 },
        { sx: 48,  sy: 129, sw: 43, sh: 35, dur: 5, ox: 2 },
        { sx: 91,  sy: 129, sw: 42, sh: 35, dur: 5, ox: 2 },
        { sx: 48,  sy: 129, sw: 43, sh: 35, dur: 5, ox: 2 },
    ]},
    slide: { loop: false, frames: [
        { sx: 175, sy: 76,  sw: 42, sh: 37, dur: 5, ox: -5 },
        { sx: 128, sy: 76,  sw: 43, sh: 37, dur: 5, ox: -6 },
        { sx: 4,   sy: 133, sw: 40, sh: 31, dur: 999 },
    ]},
    blow: { loop: false, loopFrom: 2, frames: [
        { sx: 175, sy: 76,  sw: 42, sh: 37, dur: 5, ox: -5 },
        { sx: 128, sy: 76,  sw: 43, sh: 37, dur: 5, ox: -6 },
        { sx: 48,  sy: 129, sw: 43, sh: 35, dur: 4, ox: 2 },
        { sx: 91,  sy: 129, sw: 42, sh: 35, dur: 4, ox: 2 },
    ]},
    jump: { loop: false, frames: [
        { sx: 181, sy: 127, sw: 37, sh: 38, dur: 999, ox: 1 },
    ]},
    fall: { loop: false, frames: [
        { sx: 60,  sy: 20,  sw: 35, sh: 44, dur: 999, ox: -1, oy: 6 },
    ]},
    land: { loop: false, frames: [
        { sx: 221, sy: 77,  sw: 38, sh: 36, dur: 4 },
        { sx: 131, sy: 175, sw: 38, sh: 32, dur: 6 },
        { sx: 221, sy: 77,  sw: 38, sh: 36, dur: 4 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 175, sy: 165, sw: 38, sh: 47, dur: 3 },
        { sx: 221, sy: 169, sw: 35, sh: 41, dur: 3 },
    ]},
    die: { loop: false, frames: [
        { sx: 221, sy: 169, sw: 35, sh: 41, dur: 999, oy: 3 },
    ]},
};

// Ice projectile sprite (center alignment)
const ICE_PROJ = { sx: 194, sy: 232, sw: 14, sh: 14 };

// Explosion frames (from effects.png, same as TankEnemy)
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

export class ChillPenguin extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = CP.HP;
        this.maxHp = CP.HP;

        this.hitboxX = CP.HITBOX_X;
        this.hitboxY = CP.HITBOX_Y;
        this.hitboxW = CP.WIDTH;
        this.hitboxH = CP.HEIGHT;

        this.facing = -1;       // Start facing left (toward player approach)
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        // Timers
        this.idleTimer = CP.IDLE_MIN + Math.floor(Math.random() * (CP.IDLE_MAX - CP.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Slide state
        this.slideTimer = 0;
        this.slideSpeed = 0;

        // Blow state
        this.blowTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Ice projectiles
        this.shots = [];

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
            case 'idle':  this._idleState(player, level);   break;
            case 'shoot': this._shootState(player, level);  break;
            case 'slide': this._slideState(player, level);  break;
            case 'blow':  this._blowState(player, level);   break;
            case 'hurt':  this._hurtState(player, level);   break;
            case 'dying': this._dyingState(); return;
        }

        // Gravity (MUST always apply for grounded detection)
        this.vy += CP.GRAVITY;
        if (this.vy > CP.MAX_FALL_SPEED) this.vy = CP.MAX_FALL_SPEED;

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

        // Face player
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        this.facing = playerCX > myCX ? 1 : -1;

        // Walk toward player if far away
        const dist = Math.abs(playerCX - myCX);
        if (dist > 120) {
            this.vx = CP.RUN_SPEED * this.facing;
            this._setAnim('run');
        } else {
            this.vx = 0;
            this._setAnim('idle');
        }

        this.idleTimer--;
        if (this.idleTimer <= 0) {
            this._pickAttack();
        }
    }

    _pickAttack() {
        const attacks = ['shoot', 'slide', 'blow'];
        const pick = attacks[Math.floor(Math.random() * attacks.length)];
        this.vx = 0;

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'slide':
                this.state = 'slide';
                this.slideTimer = 0;
                this.slideSpeed = CP.SLIDE_SPEED;
                this._setAnim('slide');
                this._setSlideHitbox();
                if (this.audio) this.audio.play('chillpSlide');
                break;
            case 'blow':
                this.state = 'blow';
                this.blowTimer = 0;
                this._setAnim('blow');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = CP.IDLE_MIN + Math.floor(Math.random() * (CP.IDLE_MAX - CP.IDLE_MIN));
        this._setNormalHitbox();
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire on animation frame 2 (after 2 windup frames)
        if (!this.shotFired && this.animFrame >= 2) {
            this._fireIceShot();
            this.shotFired = true;
        }

        // Animation done → idle
        const anim = PENGUIN_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _slideState(player, level) {
        this.slideTimer++;

        // Windup phase (first 2 anim frames)
        if (this.animFrame < 2) {
            this.vx = 0;
            return;
        }

        // Slide finished
        if (this.slideTimer > CP.SLIDE_MAX_TIME) {
            this._setNormalHitbox();
            this._enterIdle();
            return;
        }

        // Decelerate after slow time
        if (this.slideTimer > CP.SLIDE_SLOW_TIME) {
            this.slideSpeed -= CP.SLIDE_DECEL;
            if (this.slideSpeed < 0.5) this.slideSpeed = 0.5;
        }

        this.vx = this.slideSpeed * this.facing;
    }

    _blowState(player, level) {
        this.vx = 0;
        this.blowTimer++;

        // Windup phase
        if (this.animFrame < 2) return;

        // Duration check
        if (this.blowTimer > CP.BLOW_DURATION) {
            this._enterIdle();
            return;
        }

        // Push player if in front and within range
        if (player && !player.dead) {
            const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
            const myCX = this.x + this.hitboxX + this.hitboxW / 2;
            const dx = playerCX - myCX;

            const inFront = (this.facing > 0 && dx > 0) || (this.facing < 0 && dx < 0);
            const inRange = Math.abs(dx) < CP.BLOW_RANGE;

            if (inFront && inRange) {
                const pushDx = CP.BLOW_PUSH * this.facing;
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

    _fireIceShot() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.shots.push({
            x: feetX + CP.ICE_SPAWN_X * this.facing,
            y: feetY + CP.ICE_SPAWN_Y,
            vx: CP.ICE_SPEED * this.facing,
            active: true,
            life: CP.ICE_LIFETIME,
        });
        if (this.audio) this.audio.play('chillpBlizzard');
    }

    _setSlideHitbox() {
        this.hitboxX = CP.SLIDE_HITBOX_X;
        this.hitboxY = CP.SLIDE_HITBOX_Y;
        this.hitboxW = CP.SLIDE_WIDTH;
        this.hitboxH = CP.SLIDE_HEIGHT;
    }

    _setNormalHitbox() {
        this.hitboxX = CP.HITBOX_X;
        this.hitboxY = CP.HITBOX_Y;
        this.hitboxW = CP.WIDTH;
        this.hitboxH = CP.HEIGHT;
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
            if (this.state === 'slide') {
                // Bounce off wall during slide
                this.facing *= -1;
            } else {
                this.vx = 0;
            }
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
        this.invincibleTimer = CP.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this._setNormalHitbox();
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Slide has armor — no hurt interruption
        if (this.state === 'slide') return;

        this.state = 'hurt';
        this.hurtTimer = 6;
        this._setNormalHitbox();
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        // Body/slide contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            const playerBox = player.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                const dmg = this.state === 'slide' ? CP.SLIDE_DAMAGE : CP.CONTACT_DAMAGE;
                player.takeDamage(dmg, fromDir);
                this.contactCooldown = CP.CONTACT_COOLDOWN;
            }
        }

        // Ice projectile damage
        const playerBox = player.getHitbox();
        for (const shot of this.shots) {
            if (!shot.active) continue;
            const shotBox = {
                x: shot.x - 7, y: shot.y - 7,
                w: 14, h: 14,
            };
            if (boxOverlap(shotBox, playerBox)) {
                const fromDir = shot.vx > 0 ? 1 : -1;
                player.takeDamage(CP.ICE_DAMAGE, fromDir);
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
            const checkX = shot.x + (shot.vx > 0 ? 7 : -7);
            if (isSolid(level, checkX, shot.y)) { shot.active = false; }
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

        const anim = PENGUIN_ANIMS[this.animName];
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

        // Flash when invincible (same pattern as player)
        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = PENGUIN_ANIMS[this.animName];
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
                        ICE_PROJ.sx, ICE_PROJ.sy, ICE_PROJ.sw, ICE_PROJ.sh,
                        -Math.floor(ICE_PROJ.sw / 2), sy - Math.floor(ICE_PROJ.sh / 2),
                        ICE_PROJ.sw, ICE_PROJ.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteImage,
                        ICE_PROJ.sx, ICE_PROJ.sy, ICE_PROJ.sw, ICE_PROJ.sh,
                        sx - Math.floor(ICE_PROJ.sw / 2), sy - Math.floor(ICE_PROJ.sh / 2),
                        ICE_PROJ.sw, ICE_PROJ.sh);
                }
            } else {
                ctx.fillStyle = '#88ccff';
                ctx.fillRect(sx - 7, sy - 7, 14, 14);
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
