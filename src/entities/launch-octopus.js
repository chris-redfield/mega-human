/**
 * launch-octopus.js
 * Launch Octopus boss — fourth Maverick boss fight.
 *
 * AI States: idle, shoot, torpedo, spin, hurt, dying
 * Attacks: missile spread (3 straight shots), homing torpedoes (4 tracking projectiles),
 *          spin (push player away, armored)
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

// Boss constants
const LO = {
    // Physics
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,
    RUN_SPEED:        1.2,

    // Missiles (3-way spread shot)
    MISSILE_SPEED:    4.0,
    MISSILE_DAMAGE:   3,
    MISSILE_LIFETIME: 50,
    MISSILE_SPAWN_X:  10,     // POI from shoot frame 3
    MISSILE_SPAWN_Y: -31,

    // Homing torpedoes
    TORPEDO_SPEED:     2.5,
    TORPEDO_DAMAGE:    2,
    TORPEDO_LIFETIME:  120,
    TORPEDO_TURN_RATE: 0.06,  // radians/frame

    // Spin
    SPIN_PUSH:     2.5,
    SPIN_RANGE:    160,
    SPIN_DURATION: 120,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // Recovery (swim back up only near killzone)
    RECOVER_SPEED:    -5.0,   // upward swim velocity (strong enough to escape pits)
    KILLZONE_MARGIN:  100,    // px above killY to trigger swim-up

    // Jump (climb between platforms)
    JUMP_VY:  -6.0,
    JUMP_VX:   2.5,

    // AI timing
    IDLE_MIN:  40,
    IDLE_MAX:  80,

    // Hitbox
    WIDTH:    36,
    HEIGHT:   48,
    HITBOX_X: 10,
    HITBOX_Y: 8,
};

// Torpedo spawn POIs relative to feet anchor (from ht animation frame 3)
const TORPEDO_POIS = [
    { x: 48, y: -28 },   // Forward-up
    { x: 31, y: -12 },   // Forward-mid
    { x: -30, y: -13 },  // Backward-mid
    { x: -52, y: -28 },  // Backward-up
];

// Sprite frames from mavericks.png (alignment: botmid unless noted)
const OCTOPUS_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 263, sy: 851, sw: 57, sh: 55, dur: 6, ox: -2 },
        { sx: 331, sy: 850, sw: 61, sh: 56, dur: 6, ox: -3 },
        { sx: 405, sy: 843, sw: 53, sh: 63, dur: 6, ox: -4 },
        { sx: 482, sy: 841, sw: 44, sh: 65, dur: 6, ox: -2 },
        { sx: 556, sy: 841, sw: 40, sh: 65, dur: 6, ox: -1 },
        { sx: 624, sy: 841, sw: 44, sh: 65, dur: 6, ox: -2 },
        { sx: 689, sy: 843, sw: 53, sh: 63, dur: 6, ox: -4 },
    ]},
    run: { loop: true, frames: [
        { sx: 15,  sy: 693, sw: 32, sh: 51, dur: 6, ox: -2 },
        { sx: 57,  sy: 694, sw: 31, sh: 50, dur: 6, ox: -3 },
        { sx: 99,  sy: 693, sw: 28, sh: 51, dur: 6, ox: -4 },
        { sx: 141, sy: 692, sw: 28, sh: 52, dur: 6, ox: -4 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 5,   sy: 922, sw: 61, sh: 56, dur: 6,  ox: -3 },
        { sx: 81,  sy: 914, sw: 53, sh: 64, dur: 6,  ox: -2 },
        { sx: 150, sy: 918, sw: 55, sh: 60, dur: 6,  ox: -3 },
        { sx: 221, sy: 924, sw: 57, sh: 54, dur: 12, ox: -2 },  // POI frame — hold for shot
    ]},
    ht: { loop: false, frames: [
        { sx: 5,   sy: 985, sw: 55,  sh: 60, dur: 6, ox: -1 },
        { sx: 81,  sy: 995, sw: 78,  sh: 50, dur: 6 },
        { sx: 174, sy: 996, sw: 102, sh: 49, dur: 6, ox: -2 },
        { sx: 281, sy: 996, sw: 102, sh: 49, dur: 6, ox: -2 },  // POI frame — fire 4 torpedoes
        { sx: 394, sy: 995, sw: 89,  sh: 50, dur: 6, ox: -3 },
        { sx: 508, sy: 988, sw: 75,  sh: 57, dur: 6, ox: -3 },
        { sx: 606, sy: 990, sw: 55,  sh: 62, dur: 6 },
    ]},
    spin: { loop: true, frames: [
        { sx: 23,  sy: 772, sw: 58, sh: 57, dur: 6, ox: -2 },
        { sx: 381, sy: 772, sw: 28, sh: 57, dur: 6, ox: -2 },
        { sx: 304, sy: 769, sw: 62, sh: 57, dur: 6 },
        { sx: 212, sy: 773, sw: 82, sh: 57, dur: 6, ox: -1 },
        { sx: 139, sy: 775, sw: 62, sh: 57, dur: 6, ox: -1 },
        { sx: 93,  sy: 776, sw: 28, sh: 57, dur: 6, ox: 1 },
        { sx: 427, sy: 773, sw: 58, sh: 57, dur: 6, ox: 2 },
        { sx: 501, sy: 769, sw: 82, sh: 57, dur: 6 },
    ]},
    land: { loop: false, frames: [
        { sx: 1,   sy: 1052, sw: 61, sh: 63, dur: 4, ox: -4 },
        { sx: 556, sy: 841,  sw: 40, sh: 65, dur: 4, ox: -1 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 183, sy: 851, sw: 65, sh: 57, dur: 3, ox: -3 },
    ]},
    die: { loop: false, frames: [
        { sx: 183, sy: 851, sw: 65, sh: 57, dur: 999, ox: -3 },
    ]},
};

// Missile projectile frame (center alignment, single frame)
const MISSILE_FRAME = { sx: 185, sy: 696, sw: 13, sh: 7 };

// Homing torpedo frames (center alignment, looping)
const TORPEDO_FRAMES = [
    { sx: 236, sy: 708, sw: 13, sh: 16, dur: 4 },
    { sx: 253, sy: 709, sw: 15, sh: 15, dur: 4 },
    { sx: 271, sy: 708, sw: 16, sh: 16, dur: 4 },
    { sx: 289, sy: 708, sw: 16, sh: 15, dur: 4 },
    { sx: 308, sy: 708, sw: 14, sh: 14, dur: 4 },
];

// Explosion frames (from effects.png, same as other bosses)
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

export class LaunchOctopus extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = LO.HP;
        this.maxHp = LO.HP;

        this.hitboxX = LO.HITBOX_X;
        this.hitboxY = LO.HITBOX_Y;
        this.hitboxW = LO.WIDTH;
        this.hitboxH = LO.HEIGHT;

        this.facing = -1;       // Start facing left (toward player approach)
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        // Activation: boss stays passive until player crosses this X threshold
        this.activated = false;
        this.activationX = 0;    // Set externally (0 = always active)

        // Timers
        this.idleTimer = LO.IDLE_MIN + Math.floor(Math.random() * (LO.IDLE_MAX - LO.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;

        // Torpedo state
        this.torpedoFired = false;

        // Spin state
        this.spinTimer = 0;

        // Track last ground level + killzone recovery
        this.groundY = 0;
        this.recovering = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Projectiles
        this.missiles = [];
        this.torpedoes = [];

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
            case 'idle':    this._idleState(player, level);    break;
            case 'shoot':   this._shootState(player, level);   break;
            case 'torpedo': this._torpedoState(player, level); break;
            case 'spin':    this._spinState(player, level);    break;
            case 'jump':    this._jumpState(player, level);    break;
            case 'land':    this._landState(player, level);    break;
            case 'hurt':    this._hurtState(player, level);    break;
            case 'dying':   this._dyingState(); return;
        }

        // Track ground level
        if (this.grounded) {
            this.groundY = this.y + this.hitboxY + this.hitboxH;
        }

        // Gravity — skip during recovery (boss is flying upward)
        if (!this.recovering) {
            this.vy += LO.GRAVITY;
            if (this.vy > LO.MAX_FALL_SPEED) this.vy = LO.MAX_FALL_SPEED;
        }

        // Killzone recovery: fly up and toward player to escape pits
        if (level && this.state !== 'dying' && !this.grounded) {
            const feetY = this.y + this.hitboxY + this.hitboxH;
            if (!this.recovering && feetY > level.killY - LO.KILLZONE_MARGIN) {
                // Start flying up — record where recovery started
                this.recovering = true;
                this.recoverStartY = feetY;
                this.vy = LO.RECOVER_SPEED;
            }
            if (this.recovering) {
                // After gaining some altitude, also swim horizontally toward player
                if (feetY < this.recoverStartY - 60 && player && !player.dead) {
                    const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
                    const myCX = this.x + this.hitboxX + this.hitboxW / 2;
                    this.vx = playerCX > myCX ? LO.JUMP_VX : -LO.JUMP_VX;
                    this.facing = this.vx > 0 ? 1 : -1;
                }
                if (this.groundY > 0 && feetY <= this.groundY - 100) {
                    // Reached target altitude — stop recovery
                    this.recovering = false;
                    this.vy = 0;
                }
            }
        }
        if (this.grounded) {
            this.recovering = false;
        }

        const prevY = this.y;
        this._moveAndCollide(level);

        // End recovery if stuck against ceiling (position didn't change while flying up)
        if (this.recovering && Math.abs(this.y - prevY) < 0.5) {
            this.recovering = false;
        }
        this._updateAnimation();
        this._updateProjectiles(level, player);
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
        if (dist > 100) {
            this.vx = LO.RUN_SPEED * this.facing;
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
        this.vx = 0;

        // Jump toward player if they're significantly higher
        const playerFeetY = player.y + player.hitboxY + player.hitboxH;
        const myFeetY = this.y + this.hitboxY + this.hitboxH;
        if (playerFeetY < myFeetY - 60) {
            this._startJump(player);
            return;
        }

        const attacks = ['shoot', 'torpedo', 'spin', 'jump'];
        const pick = attacks[Math.floor(Math.random() * attacks.length)];

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this._setAnim('shoot');
                break;
            case 'torpedo':
                this.state = 'torpedo';
                this.torpedoFired = false;
                this._setAnim('ht');
                break;
            case 'spin':
                this.state = 'spin';
                this.spinTimer = LO.SPIN_DURATION;
                this._setAnim('spin');
                break;
            case 'jump':
                this._startJump(player);
                break;
        }
    }

    _startJump(player) {
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        this.facing = playerCX > myCX ? 1 : -1;
        this.state = 'jump';
        this.vy = LO.JUMP_VY;
        this.vx = LO.JUMP_VX * this.facing;
        this.grounded = false;
        this._setAnim('idle');  // tentacles wiggling = swimming upward
    }

    _jumpState(player, level) {
        // Land when touching ground and descending
        if (this.grounded && this.vy === 0) {
            this.vx = 0;
            this.state = 'land';
            this._setAnim('land');
        }
    }

    _landState(player, level) {
        this.vx = 0;
        const anim = OCTOPUS_ANIMS.land;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = LO.IDLE_MIN + Math.floor(Math.random() * (LO.IDLE_MAX - LO.IDLE_MIN));
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire on animation frame 3
        if (!this.shotFired && this.animFrame >= 3) {
            this._fireMissiles();
            this.shotFired = true;
        }

        // Animation done → idle
        const anim = OCTOPUS_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _torpedoState(player, level) {
        this.vx = 0;

        // Fire on animation frame 3
        if (!this.torpedoFired && this.animFrame >= 3) {
            this._fireTorpedoes(player);
            this.torpedoFired = true;
        }

        // Animation done → idle
        const anim = OCTOPUS_ANIMS.ht;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _spinState(player, level) {
        this.vx = 0;
        this.spinTimer--;

        // Push player away
        if (player && !player.dead && level) {
            const myCX = this.x + this.hitboxX + this.hitboxW / 2;
            const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
            const dist = Math.abs(playerCX - myCX);

            if (dist < LO.SPIN_RANGE) {
                const pushDir = playerCX > myCX ? 1 : -1;
                const oldHitX = player.x + player.hitboxX;
                const resolvedHitX = resolveSlopeHorizontal(
                    level, oldHitX, player.y + player.hitboxY,
                    player.hitboxW, player.hitboxH, LO.SPIN_PUSH * pushDir
                );
                player.x = resolvedHitX - player.hitboxX;
            }
        }

        if (this.spinTimer <= 0) {
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

    _fireMissiles() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;
        const spawnX = feetX + LO.MISSILE_SPAWN_X * this.facing;
        const spawnY = feetY + LO.MISSILE_SPAWN_Y;

        // 3-way spread: straight, slightly up, slightly down
        const spreads = [0, -1.2, 1.2];
        for (const vyOff of spreads) {
            this.missiles.push({
                x: spawnX,
                y: spawnY,
                vx: LO.MISSILE_SPEED * this.facing,
                vy: vyOff,
                active: true,
                life: LO.MISSILE_LIFETIME,
            });
        }
        if (this.audio) this.audio.play('busterMid');
    }

    _fireTorpedoes(player) {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        for (const poi of TORPEDO_POIS) {
            const spawnX = feetX + poi.x * this.facing;
            const spawnY = feetY + poi.y;
            const angle = Math.atan2(poi.y, poi.x * this.facing);

            this.torpedoes.push({
                x: spawnX,
                y: spawnY,
                vx: Math.cos(angle) * LO.TORPEDO_SPEED,
                vy: Math.sin(angle) * LO.TORPEDO_SPEED,
                angle,
                active: true,
                life: LO.TORPEDO_LIFETIME,
                animFrame: 0,
                animTimer: 0,
            });
        }
        if (this.audio) this.audio.play('busterMid');
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
        this.invincibleTimer = LO.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Spin has armor — no hurt interruption
        if (this.state === 'spin') return;

        this.state = 'hurt';
        this.hurtTimer = 6;
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        const playerBox = player.getHitbox();

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(LO.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = LO.CONTACT_COOLDOWN;
            }
        }

        // Missile damage
        for (const m of this.missiles) {
            if (!m.active) continue;
            const mBox = {
                x: m.x - MISSILE_FRAME.sw / 2,
                y: m.y - MISSILE_FRAME.sh / 2,
                w: MISSILE_FRAME.sw,
                h: MISSILE_FRAME.sh,
            };
            if (boxOverlap(mBox, playerBox)) {
                const fromDir = m.vx > 0 ? 1 : -1;
                player.takeDamage(LO.MISSILE_DAMAGE, fromDir);
                m.active = false;
            }
        }

        // Torpedo damage
        for (const t of this.torpedoes) {
            if (!t.active) continue;
            const f = TORPEDO_FRAMES[t.animFrame % TORPEDO_FRAMES.length];
            const tBox = {
                x: t.x - f.sw / 2,
                y: t.y - f.sh / 2,
                w: f.sw,
                h: f.sh,
            };
            if (boxOverlap(tBox, playerBox)) {
                const fromDir = t.vx > 0 ? 1 : -1;
                player.takeDamage(LO.TORPEDO_DAMAGE, fromDir);
                t.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateProjectiles(level, player) {
        // Missiles (straight line with slight vertical spread)
        for (const m of this.missiles) {
            if (!m.active) continue;
            m.x += m.vx;
            m.y += m.vy;
            m.life--;
            if (m.life <= 0) { m.active = false; continue; }
            // Wall collision
            const checkX = m.x + (m.vx > 0 ? 7 : -7);
            if (isSolid(level, checkX, m.y)) { m.active = false; continue; }
        }
        this.missiles = this.missiles.filter(m => m.active);

        // Homing torpedoes
        const playerCX = player ? player.x + player.hitboxX + player.hitboxW / 2 : 0;
        const playerCY = player ? player.y + player.hitboxY + player.hitboxH / 2 : 0;

        for (const t of this.torpedoes) {
            if (!t.active) continue;

            // Homing: turn toward player
            if (player && !player.dead) {
                const targetAngle = Math.atan2(playerCY - t.y, playerCX - t.x);
                let angleDiff = targetAngle - t.angle;
                // Normalize to [-PI, PI]
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                // Turn toward target
                if (angleDiff > 0) {
                    t.angle += Math.min(LO.TORPEDO_TURN_RATE, angleDiff);
                } else {
                    t.angle -= Math.min(LO.TORPEDO_TURN_RATE, -angleDiff);
                }
                t.vx = Math.cos(t.angle) * LO.TORPEDO_SPEED;
                t.vy = Math.sin(t.angle) * LO.TORPEDO_SPEED;
            }

            t.x += t.vx;
            t.y += t.vy;
            t.life--;
            if (t.life <= 0) { t.active = false; continue; }

            // Wall collision
            if (isSolid(level, t.x, t.y)) { t.active = false; continue; }

            // Animate
            t.animTimer++;
            const f = TORPEDO_FRAMES[t.animFrame % TORPEDO_FRAMES.length];
            if (t.animTimer >= f.dur) {
                t.animTimer = 0;
                t.animFrame = (t.animFrame + 1) % TORPEDO_FRAMES.length;
            }
        }
        this.torpedoes = this.torpedoes.filter(t => t.active);
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

        const anim = OCTOPUS_ANIMS[this.animName];
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
        // Render projectiles behind boss
        this._renderProjectiles(ctx, camera);

        if (this.state === 'dying') {
            this._renderExplosion(ctx, camera);
            return;
        }

        // Flash when invincible (same pattern as player)
        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = OCTOPUS_ANIMS[this.animName];
        if (!anim) return;
        const frame = anim.frames[this.animFrame % anim.frames.length];

        const ox = frame.ox || 0;
        const oy = frame.oy || 0;
        const flipH = this.facing < 0;
        const isFlash = this.hitFlashTimer > 0;

        if (this.animName === 'spin') {
            // Center alignment for spin animation
            const cx = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
            const cy = Math.floor(this.y + this.hitboxY + this.hitboxH / 2 - camera.y);

            if (this.spriteImage) {
                if (flipH) {
                    ctx.save();
                    ctx.translate(cx, 0);
                    ctx.scale(-1, 1);
                    const dx = -Math.floor(frame.sw / 2) + ox;
                    const dy = cy - Math.floor(frame.sh / 2) + oy;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        dx, dy, frame.sw, frame.sh);
                    if (isFlash) {
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.7;
                        ctx.drawImage(this.spriteImage,
                            frame.sx, frame.sy, frame.sw, frame.sh,
                            dx, dy, frame.sw, frame.sh);
                        ctx.globalAlpha = 1;
                        ctx.globalCompositeOperation = 'source-over';
                    }
                    ctx.restore();
                } else {
                    const dx = cx - Math.floor(frame.sw / 2) + ox;
                    const dy = cy - Math.floor(frame.sh / 2) + oy;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        dx, dy, frame.sw, frame.sh);
                    if (isFlash) {
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.7;
                        ctx.drawImage(this.spriteImage,
                            frame.sx, frame.sy, frame.sw, frame.sh,
                            dx, dy, frame.sw, frame.sh);
                        ctx.globalAlpha = 1;
                        ctx.globalCompositeOperation = 'source-over';
                    }
                }
            }
        } else {
            // Normal botmid alignment (feet anchor)
            const feetX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
            const feetY = Math.floor(this.y + this.hitboxY + this.hitboxH - camera.y);
            const drawY = feetY - frame.sh + oy;

            if (this.spriteImage) {
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
                ctx.fillStyle = '#00aa88';
                ctx.fillRect(
                    Math.floor(this.x + this.hitboxX - camera.x),
                    Math.floor(this.y + this.hitboxY - camera.y),
                    this.hitboxW, this.hitboxH);
            }
        }
    }

    _renderProjectiles(ctx, camera) {
        // Missiles (center alignment, directional flip)
        for (const m of this.missiles) {
            if (!m.active) continue;
            const sx = Math.floor(m.x - camera.x);
            const sy = Math.floor(m.y - camera.y);

            if (this.spriteImage) {
                const flipH = m.vx < 0;
                if (flipH) {
                    ctx.save();
                    ctx.translate(sx, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(this.spriteImage,
                        MISSILE_FRAME.sx, MISSILE_FRAME.sy,
                        MISSILE_FRAME.sw, MISSILE_FRAME.sh,
                        -Math.floor(MISSILE_FRAME.sw / 2),
                        sy - Math.floor(MISSILE_FRAME.sh / 2),
                        MISSILE_FRAME.sw, MISSILE_FRAME.sh);
                    ctx.restore();
                } else {
                    ctx.drawImage(this.spriteImage,
                        MISSILE_FRAME.sx, MISSILE_FRAME.sy,
                        MISSILE_FRAME.sw, MISSILE_FRAME.sh,
                        sx - Math.floor(MISSILE_FRAME.sw / 2),
                        sy - Math.floor(MISSILE_FRAME.sh / 2),
                        MISSILE_FRAME.sw, MISSILE_FRAME.sh);
                }
            } else {
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(sx - 6, sy - 3, 13, 7);
            }
        }

        // Torpedoes (center alignment, rotated to match travel direction)
        for (const t of this.torpedoes) {
            if (!t.active) continue;
            const sx = Math.floor(t.x - camera.x);
            const sy = Math.floor(t.y - camera.y);
            const f = TORPEDO_FRAMES[t.animFrame % TORPEDO_FRAMES.length];

            if (this.spriteImage) {
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(t.angle);
                ctx.drawImage(this.spriteImage,
                    f.sx, f.sy, f.sw, f.sh,
                    -Math.floor(f.sw / 2), -Math.floor(f.sh / 2),
                    f.sw, f.sh);
                ctx.restore();
            } else {
                ctx.fillStyle = '#00ddff';
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
