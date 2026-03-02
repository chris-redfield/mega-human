/**
 * flame-mammoth.js
 * Flame Mammoth boss — third Maverick boss fight.
 *
 * AI States: idle, shoot, oil, stomp, hurt, dying
 * Attacks: fireball (arcing shot), oil lob (creates puddle, ignited by fireball → big fire),
 *          jump stomp (shockwave on landing)
 * Sprites from mavericks.png, death explosion from effects.png.
 */

import { Entity, boxOverlap } from './entity.js';
import { resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

// Boss constants
const FM = {
    // Physics
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,
    RUN_SPEED:        1.0,         // Heavy boss, slow walk

    // Fireball
    FIREBALL_SPEED:   4.0,
    FIREBALL_DAMAGE:  3,
    FIREBALL_LIFETIME: 45,
    FIREBALL_GRAVITY: 0.12,        // Arcing shot
    FIREBALL_SPAWN_X: 40,          // POI from shoot anim frame 1
    FIREBALL_SPAWN_Y: -39,

    // Oil ball
    OIL_SPEED_X:      3.0,
    OIL_SPEED_Y:     -2.5,         // Arcing lob upward
    OIL_GRAVITY:      0.15,
    OIL_SPAWN_X:      39,          // POI from shoot2 anim frame 6
    OIL_SPAWN_Y:     -36,

    // Oil spill (puddle on ground)
    OIL_SPILL_LIFETIME: 480,       // 8 seconds at 60fps

    // Big fire (ignited oil)
    BIG_FIRE_DAMAGE:   3,
    BIG_FIRE_LIFETIME: 480,        // 8 seconds

    // Jump stomp
    JUMP_SPEED:       -5.5,        // Initial upward velocity
    STOMP_SPEED:       6.0,        // Fast downward slam
    STOMP_DAMAGE:      4,          // Body damage during stomp
    SHOCKWAVE_RANGE:   94,         // Horizontal distance of shockwave
    SHOCKWAVE_DAMAGE:  2,
    SHOCKWAVE_LIFETIME: 20,

    // Combat
    CONTACT_DAMAGE:   3,
    CONTACT_COOLDOWN: 60,
    HP:               32,
    INVINCIBLE_TIME:  70,

    // AI timing
    IDLE_MIN:         40,
    IDLE_MAX:         80,

    // Hitbox (normal standing)
    WIDTH:            46,
    HEIGHT:           54,
    HITBOX_X:         14,
    HITBOX_Y:         7,
};

// Sprite frames from mavericks.png (alignment: botmid)
const MAMMOTH_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 1477, sy: 65, sw: 74, sh: 68, dur: 8 },
    ]},
    run: { loop: true, frames: [
        { sx: 1146, sy: 549, sw: 62, sh: 67, dur: 6, oy: -1 },
        { sx: 1218, sy: 551, sw: 62, sh: 64, dur: 6 },
        { sx: 1290, sy: 550, sw: 62, sh: 65, dur: 6 },
        { sx: 1362, sy: 548, sw: 62, sh: 67, dur: 6 },
    ]},
    shoot: { loop: false, frames: [
        { sx: 1466, sy: 256, sw: 82, sh: 67, dur: 4 },
        { sx: 1368, sy: 254, sw: 83, sh: 67, dur: 12 },  // POI frame — hold for shot
    ]},
    shoot2: { loop: false, frames: [
        { sx: 1474, sy: 341, sw: 71, sh: 63, dur: 4, ox: -4 },
        { sx: 1387, sy: 336, sw: 72, sh: 67, dur: 4, ox: -4 },
        { sx: 1307, sy: 338, sw: 71, sh: 62, dur: 4, ox: -3 },
        { sx: 1227, sy: 339, sw: 71, sh: 62, dur: 4, ox: -3 },
        { sx: 1138, sy: 341, sw: 71, sh: 63, dur: 4, ox: -3 },
        { sx: 1473, sy: 417, sw: 71, sh: 63, dur: 4, ox: -2 },
        { sx: 1390, sy: 419, sw: 80, sh: 63, dur: 4, ox: 3 },   // POI frame — fire oil
        { sx: 1310, sy: 417, sw: 71, sh: 64, dur: 4, ox: -2 },
        { sx: 1225, sy: 419, sw: 74, sh: 63, dur: 4, ox: -1 },
    ]},
    jump: { loop: false, frames: [
        { sx: 1473, sy: 161, sw: 74, sh: 78, dur: 999 },
    ]},
    fall: { loop: false, frames: [
        { sx: 1389, sy: 165, sw: 74, sh: 69, dur: 999 },
    ]},
    land: { loop: false, frames: [
        { sx: 1227, sy: 339, sw: 71, sh: 62, dur: 8, ox: -2 },
        { sx: 1138, sy: 341, sw: 71, sh: 63, dur: 8, ox: -2 },
    ]},
    hurt: { loop: true, frames: [
        { sx: 1131, sy: 243, sw: 67, sh: 78, dur: 3, ox: -8, oy: 9 },
    ]},
    die: { loop: false, frames: [
        { sx: 1131, sy: 243, sw: 67, sh: 78, dur: 999, ox: -8, oy: 9 },
    ]},
};

// Fireball projectile frames (center alignment, looping)
const FIREBALL_FRAMES = [
    { sx: 1330, sy: 273, sw: 13, sh: 16, dur: 3 },
    { sx: 1302, sy: 273, sw: 13, sh: 15, dur: 3 },
    { sx: 1273, sy: 276, sw: 16, sh: 11, dur: 3 },
];

// Oil ball sprite (center alignment)
const OIL_BALL_SPRITE = { sx: 1516, sy: 511, sw: 15, sh: 14 };

// Oil spill frames (center alignment, play once then hold last frame)
const OIL_SPILL_FRAMES = [
    { sx: 1473, sy: 511, sw: 27, sh: 12, dur: 4, oy: -6 },
    { sx: 1431, sy: 517, sw: 32, sh: 5,  dur: 4, oy: -3 },
    { sx: 1295, sy: 515, sw: 40, sh: 9,  dur: 4 },
    { sx: 1340, sy: 515, sw: 38, sh: 9,  dur: 4 },
    { sx: 1385, sy: 515, sw: 36, sh: 9,  dur: 999 },
];

// Big fire frames (botmid alignment, grows then loops frames 10-12)
const BIG_FIRE_FRAMES = [
    { sx: 1135, sy: 697, sw: 38, sh: 15, dur: 3 },
    { sx: 1178, sy: 692, sw: 38, sh: 20, dur: 3 },
    { sx: 1224, sy: 696, sw: 32, sh: 13, dur: 3 },
    { sx: 1268, sy: 683, sw: 32, sh: 24, dur: 3 },
    { sx: 1311, sy: 664, sw: 32, sh: 43, dur: 3 },
    { sx: 1353, sy: 648, sw: 32, sh: 59, dur: 3 },
    { sx: 1395, sy: 632, sw: 32, sh: 75, dur: 3 },
    { sx: 1353, sy: 648, sw: 32, sh: 59, dur: 3 },
    { sx: 1311, sy: 664, sw: 32, sh: 43, dur: 3 },
    { sx: 1268, sy: 683, sw: 32, sh: 24, dur: 3 },
    { sx: 1153, sy: 497, sw: 30, sh: 32, dur: 4 },
    { sx: 1196, sy: 500, sw: 31, sh: 27, dur: 4 },
    { sx: 1242, sy: 501, sw: 32, sh: 24, dur: 4 },
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

export class FlameMammoth extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = FM.HP;
        this.maxHp = FM.HP;

        this.hitboxX = FM.HITBOX_X;
        this.hitboxY = FM.HITBOX_Y;
        this.hitboxW = FM.WIDTH;
        this.hitboxH = FM.HEIGHT;

        this.facing = -1;       // Start facing left (toward player approach)
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;

        // Activation: boss stays passive until player crosses this X threshold
        this.activated = false;
        this.activationX = 0;    // Set externally (0 = always active)

        // Timers
        this.idleTimer = FM.IDLE_MIN + Math.floor(Math.random() * (FM.IDLE_MAX - FM.IDLE_MIN));
        this.contactCooldown = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;

        // Shoot state
        this.shotFired = false;
        this.burstShotsLeft = 0;   // Consecutive fireballs remaining

        // Oil state
        this.oilFired = false;

        // Stomp state
        this.stompPhase = 'rising';  // 'rising' or 'falling'

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animName = 'idle';

        // Projectiles
        this.fireballs = [];
        this.oilBalls = [];
        this.oilSpills = [];
        this.bigFires = [];
        this.shockwaves = [];

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
            case 'oil':   this._oilState(player, level);    break;
            case 'stomp': this._stompState(player, level);  break;
            case 'hurt':  this._hurtState(player, level);   break;
            case 'dying': this._dyingState(); return;
        }

        // Gravity (MUST always apply for grounded detection)
        this.vy += FM.GRAVITY;
        if (this.vy > FM.MAX_FALL_SPEED) this.vy = FM.MAX_FALL_SPEED;

        this._moveAndCollide(level);
        this._updateAnimation();
        this._updateProjectiles(level);
        this._checkFireballOilCombo();
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
            this.vx = FM.RUN_SPEED * this.facing;
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

        // Stomp only if player is relatively close
        const playerCX = player.x + player.hitboxX + player.hitboxW / 2;
        const myCX = this.x + this.hitboxX + this.hitboxW / 2;
        const dist = Math.abs(playerCX - myCX);

        let attacks;
        if (dist < 150) {
            attacks = ['shoot', 'burst', 'oil', 'stomp'];
        } else {
            attacks = ['shoot', 'burst', 'oil'];
        }

        const pick = attacks[Math.floor(Math.random() * attacks.length)];

        switch (pick) {
            case 'shoot':
                this.state = 'shoot';
                this.shotFired = false;
                this.burstShotsLeft = 0;
                this._setAnim('shoot');
                break;
            case 'burst':
                this.state = 'shoot';
                this.shotFired = false;
                this.burstShotsLeft = 1 + Math.floor(Math.random() * 2); // 1-2 extra (2-3 total)
                this._setAnim('shoot');
                break;
            case 'oil':
                this.state = 'oil';
                this.oilFired = false;
                this._setAnim('shoot2');
                break;
            case 'stomp':
                this.state = 'stomp';
                this.stompPhase = 'rising';
                this.vy = FM.JUMP_SPEED;
                this.grounded = false;
                this._setAnim('jump');
                break;
        }
    }

    _enterIdle() {
        this.state = 'idle';
        this.idleTimer = FM.IDLE_MIN + Math.floor(Math.random() * (FM.IDLE_MAX - FM.IDLE_MIN));
        this._setAnim('idle');
    }

    _shootState(player, level) {
        this.vx = 0;

        // Fire on animation frame 1 (after windup)
        if (!this.shotFired && this.animFrame >= 1) {
            this._fireFireball();
            this.shotFired = true;
        }

        // Animation done → next burst shot or idle
        const anim = MAMMOTH_ANIMS.shoot;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            if (this.burstShotsLeft > 0) {
                this.burstShotsLeft--;
                this.shotFired = false;
                this.animFrame = 0;
                this.animTimer = 0;
            } else {
                this._enterIdle();
            }
        }
    }

    _oilState(player, level) {
        this.vx = 0;

        // Fire oil on animation frame 6 (POI frame)
        if (!this.oilFired && this.animFrame >= 6) {
            this._fireOilBall();
            this.oilFired = true;
        }

        // Animation done → idle
        const anim = MAMMOTH_ANIMS.shoot2;
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            this._enterIdle();
        }
    }

    _stompState(player, level) {
        this.vx = 0;

        if (this.stompPhase === 'rising') {
            // Rising phase — wait for apex
            if (this.vy >= 0) {
                this.stompPhase = 'falling';
                this.vy = FM.STOMP_SPEED;
                this._setAnim('fall');
            }
        } else {
            // Falling phase — slam down
            this.vy = FM.STOMP_SPEED;

            // Landed — create shockwaves
            if (this.grounded) {
                this._spawnShockwaves();
                this.state = 'idle';
                this.idleTimer = FM.IDLE_MIN + Math.floor(Math.random() * (FM.IDLE_MAX - FM.IDLE_MIN));
                this._setAnim('land');
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

    _fireFireball() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.fireballs.push({
            x: feetX + FM.FIREBALL_SPAWN_X * this.facing,
            y: feetY + FM.FIREBALL_SPAWN_Y,
            vx: FM.FIREBALL_SPEED * this.facing,
            vy: 0,
            active: true,
            life: FM.FIREBALL_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
        if (this.audio) this.audio.play('busterMid');
    }

    _fireOilBall() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        this.oilBalls.push({
            x: feetX + FM.OIL_SPAWN_X * this.facing,
            y: feetY + FM.OIL_SPAWN_Y,
            vx: FM.OIL_SPEED_X * this.facing,
            vy: FM.OIL_SPEED_Y,
            active: true,
        });
        if (this.audio) this.audio.play('busterMid');
    }

    _spawnOilSpill(x, y) {
        this.oilSpills.push({
            x,
            y,
            active: true,
            life: FM.OIL_SPILL_LIFETIME,
            animFrame: 0,
            animTimer: 0,
        });
    }

    _spawnShockwaves() {
        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        // Left shockwave
        this.shockwaves.push({
            x: feetX - FM.SHOCKWAVE_RANGE,
            y: feetY - 10,
            w: FM.SHOCKWAVE_RANGE,
            h: 20,
            active: true,
            life: FM.SHOCKWAVE_LIFETIME,
        });
        // Right shockwave
        this.shockwaves.push({
            x: feetX,
            y: feetY - 10,
            w: FM.SHOCKWAVE_RANGE,
            h: 20,
            active: true,
            life: FM.SHOCKWAVE_LIFETIME,
        });
        if (this.audio) this.audio.play('explosion');
    }

    _checkFireballOilCombo() {
        // Check if any fireball overlaps any oil spill → ignite into big fire
        for (const fb of this.fireballs) {
            if (!fb.active) continue;
            const fbBox = {
                x: fb.x - 8, y: fb.y - 8,
                w: 16, h: 16,
            };
            for (const spill of this.oilSpills) {
                if (!spill.active) continue;
                const f = OIL_SPILL_FRAMES[spill.animFrame % OIL_SPILL_FRAMES.length];
                const spillBox = {
                    x: spill.x - f.sw / 2, y: spill.y - f.sh / 2,
                    w: f.sw, h: f.sh,
                };
                if (boxOverlap(fbBox, spillBox)) {
                    // Ignite: remove spill, create big fire, consume fireball
                    spill.active = false;
                    fb.active = false;
                    this.bigFires.push({
                        x: spill.x,
                        y: spill.y,
                        active: true,
                        life: FM.BIG_FIRE_LIFETIME,
                        animFrame: 0,
                        animTimer: 0,
                    });
                    if (this.audio) this.audio.play('explosion');
                    break; // This fireball is consumed
                }
            }
        }
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
        this.invincibleTimer = FM.INVINCIBLE_TIME;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dying';
            this.explosionFrame = 0;
            this.explosionTimer = 0;
            if (this.audio) this.audio.play('maverickDie');
            return;
        }

        // Stomp has armor — no hurt interruption during falling phase
        if (this.state === 'stomp' && this.stompPhase === 'falling') return;

        // Burst fire has armor — let the full volley finish
        if (this.state === 'shoot' && this.burstShotsLeft > 0) return;

        this.state = 'hurt';
        this.hurtTimer = 6;
        this._setAnim('hurt');
    }

    checkPlayerCollision(player) {
        if (this.state === 'dying' || player.dead) return;
        if (player.invincibleTimer > 0 || player.state === 'hurt') return;

        const playerBox = player.getHitbox();

        // Stomp contact damage (higher damage during falling stomp)
        if (this.state === 'stomp' && this.stompPhase === 'falling') {
            const myBox = this.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(FM.STOMP_DAMAGE, fromDir);
                return;
            }
        }

        // Body contact damage
        if (this.contactCooldown <= 0) {
            const myBox = this.getHitbox();
            if (boxOverlap(myBox, playerBox)) {
                const fromDir = player.x < this.x ? -1 : 1;
                player.takeDamage(FM.CONTACT_DAMAGE, fromDir);
                this.contactCooldown = FM.CONTACT_COOLDOWN;
            }
        }

        // Fireball damage
        for (const fb of this.fireballs) {
            if (!fb.active) continue;
            const f = FIREBALL_FRAMES[fb.animFrame % FIREBALL_FRAMES.length];
            const fbBox = {
                x: fb.x - f.sw / 2, y: fb.y - f.sh / 2,
                w: f.sw, h: f.sh,
            };
            if (boxOverlap(fbBox, playerBox)) {
                const fromDir = fb.vx > 0 ? 1 : -1;
                player.takeDamage(FM.FIREBALL_DAMAGE, fromDir);
                fb.active = false;
            }
        }

        // Big fire damage
        for (const fire of this.bigFires) {
            if (!fire.active) continue;
            const f = BIG_FIRE_FRAMES[fire.animFrame % BIG_FIRE_FRAMES.length];
            // Big fire uses botmid alignment — hitbox positioned from bottom-center
            const fireBox = {
                x: fire.x - f.sw / 2, y: fire.y - f.sh,
                w: f.sw, h: f.sh,
            };
            if (boxOverlap(fireBox, playerBox)) {
                const fromDir = player.x < fire.x ? -1 : 1;
                player.takeDamage(FM.BIG_FIRE_DAMAGE, fromDir);
                fire.active = false;
            }
        }

        // Shockwave damage
        for (const sw of this.shockwaves) {
            if (!sw.active) continue;
            const swBox = { x: sw.x, y: sw.y, w: sw.w, h: sw.h };
            if (boxOverlap(swBox, playerBox)) {
                const fromDir = player.x < (sw.x + sw.w / 2) ? -1 : 1;
                player.takeDamage(FM.SHOCKWAVE_DAMAGE, fromDir);
                sw.active = false;
            }
        }
    }

    // --- Projectiles ---

    _updateProjectiles(level) {
        // Fireballs (arcing)
        for (const fb of this.fireballs) {
            if (!fb.active) continue;
            fb.vy += FM.FIREBALL_GRAVITY;
            fb.x += fb.vx;
            fb.y += fb.vy;
            fb.life--;
            if (fb.life <= 0) { fb.active = false; continue; }
            // Wall collision
            const checkX = fb.x + (fb.vx > 0 ? 7 : -7);
            if (isSolid(level, checkX, fb.y)) { fb.active = false; continue; }
            // Ground collision
            if (isSolid(level, fb.x, fb.y + 8)) { fb.active = false; continue; }
            // Animate
            fb.animTimer++;
            const f = FIREBALL_FRAMES[fb.animFrame % FIREBALL_FRAMES.length];
            if (fb.animTimer >= f.dur) {
                fb.animTimer = 0;
                fb.animFrame = (fb.animFrame + 1) % FIREBALL_FRAMES.length;
            }
        }
        this.fireballs = this.fireballs.filter(f => f.active);

        // Oil balls (arcing lob, spawn spill on ground hit)
        for (const ob of this.oilBalls) {
            if (!ob.active) continue;
            ob.vy += FM.OIL_GRAVITY;
            ob.x += ob.vx;
            ob.y += ob.vy;
            // Ground collision → spawn oil spill at ground level
            if (isSolid(level, ob.x, ob.y + 7)) {
                this._spawnOilSpill(ob.x, ob.y + 7);
                ob.active = false;
                continue;
            }
            // Wall collision
            const checkX = ob.x + (ob.vx > 0 ? 8 : -8);
            if (isSolid(level, checkX, ob.y)) {
                this._spawnOilSpill(ob.x, ob.y + 7);
                ob.active = false;
            }
        }
        this.oilBalls = this.oilBalls.filter(o => o.active);

        // Oil spills (static, animate then hold, despawn after lifetime)
        for (const spill of this.oilSpills) {
            if (!spill.active) continue;
            spill.life--;
            if (spill.life <= 0) { spill.active = false; continue; }
            // Animate (play once, hold on last frame)
            spill.animTimer++;
            const f = OIL_SPILL_FRAMES[spill.animFrame];
            if (f && spill.animTimer >= f.dur && spill.animFrame < OIL_SPILL_FRAMES.length - 1) {
                spill.animTimer = 0;
                spill.animFrame++;
            }
        }
        this.oilSpills = this.oilSpills.filter(s => s.active);

        // Big fires (animate grow sequence, then loop frames 10-12)
        for (const fire of this.bigFires) {
            if (!fire.active) continue;
            fire.life--;
            if (fire.life <= 0) { fire.active = false; continue; }
            // Animate
            fire.animTimer++;
            const f = BIG_FIRE_FRAMES[fire.animFrame];
            if (f && fire.animTimer >= f.dur) {
                fire.animTimer = 0;
                fire.animFrame++;
                if (fire.animFrame >= BIG_FIRE_FRAMES.length) {
                    fire.animFrame = 10; // Loop from frame 10
                }
            }
        }
        this.bigFires = this.bigFires.filter(f => f.active);

        // Shockwaves (invisible hitboxes, short lifetime)
        for (const sw of this.shockwaves) {
            if (!sw.active) continue;
            sw.life--;
            if (sw.life <= 0) sw.active = false;
        }
        this.shockwaves = this.shockwaves.filter(s => s.active);
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

        const anim = MAMMOTH_ANIMS[this.animName];
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

        const anim = MAMMOTH_ANIMS[this.animName];
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
            ctx.fillStyle = '#cc4400';
            ctx.fillRect(
                Math.floor(this.x + this.hitboxX - camera.x),
                Math.floor(this.y + this.hitboxY - camera.y),
                this.hitboxW, this.hitboxH);
        }
    }

    _renderProjectiles(ctx, camera) {
        // Oil spills (render behind everything else)
        for (const spill of this.oilSpills) {
            if (!spill.active) continue;
            const f = OIL_SPILL_FRAMES[spill.animFrame % OIL_SPILL_FRAMES.length];
            const sx = Math.floor(spill.x - camera.x);
            const sy = Math.floor(spill.y - camera.y);
            const oy = f.oy || 0;

            if (this.spriteImage) {
                ctx.drawImage(this.spriteImage,
                    f.sx, f.sy, f.sw, f.sh,
                    sx - Math.floor(f.sw / 2), sy - Math.floor(f.sh / 2) + oy,
                    f.sw, f.sh);
            } else {
                ctx.fillStyle = '#332200';
                ctx.fillRect(sx - f.sw / 2, sy - f.sh / 2, f.sw, f.sh);
            }
        }

        // Big fires (botmid alignment)
        for (const fire of this.bigFires) {
            if (!fire.active) continue;
            const f = BIG_FIRE_FRAMES[fire.animFrame % BIG_FIRE_FRAMES.length];
            const fx = Math.floor(fire.x - camera.x);
            const fy = Math.floor(fire.y - camera.y);

            if (this.spriteImage) {
                ctx.drawImage(this.spriteImage,
                    f.sx, f.sy, f.sw, f.sh,
                    fx - Math.floor(f.sw / 2), fy - f.sh,
                    f.sw, f.sh);
            } else {
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(fx - f.sw / 2, fy - f.sh, f.sw, f.sh);
            }
        }

        // Fireballs (center alignment, animated)
        for (const fb of this.fireballs) {
            if (!fb.active) continue;
            const f = FIREBALL_FRAMES[fb.animFrame % FIREBALL_FRAMES.length];
            const sx = Math.floor(fb.x - camera.x);
            const sy = Math.floor(fb.y - camera.y);

            if (this.spriteImage) {
                const flipH = fb.vx < 0;
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
            } else {
                ctx.fillStyle = '#ff4400';
                ctx.fillRect(sx - 7, sy - 7, 14, 14);
            }
        }

        // Oil balls (center alignment)
        for (const ob of this.oilBalls) {
            if (!ob.active) continue;
            const sx = Math.floor(ob.x - camera.x);
            const sy = Math.floor(ob.y - camera.y);

            if (this.spriteImage) {
                ctx.drawImage(this.spriteImage,
                    OIL_BALL_SPRITE.sx, OIL_BALL_SPRITE.sy,
                    OIL_BALL_SPRITE.sw, OIL_BALL_SPRITE.sh,
                    sx - Math.floor(OIL_BALL_SPRITE.sw / 2),
                    sy - Math.floor(OIL_BALL_SPRITE.sh / 2),
                    OIL_BALL_SPRITE.sw, OIL_BALL_SPRITE.sh);
            } else {
                ctx.fillStyle = '#332200';
                ctx.fillRect(sx - 7, sy - 7, 15, 14);
            }
        }

        // Shockwaves (visual dust puff — simple white flash)
        for (const sw of this.shockwaves) {
            if (!sw.active) continue;
            const wx = Math.floor(sw.x - camera.x);
            const wy = Math.floor(sw.y - camera.y);
            ctx.globalAlpha = sw.life / FM.SHOCKWAVE_LIFETIME;
            ctx.fillStyle = '#ffdd88';
            ctx.fillRect(wx, wy, sw.w, sw.h);
            ctx.globalAlpha = 1;
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
