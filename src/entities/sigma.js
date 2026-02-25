/**
 * sigma.js
 * Sigma — sword-based playable character extending the base Player class.
 *
 * States: warp_in, idle, run, jump, fall, land, wall_slide, dash, attack, hurt, die
 * Primary weapon: Beam saber (ground slash, air slash, dash slash)
 *
 * Sigma is larger than X/Zero with a bigger hitbox and more powerful attacks.
 * No buster or charge — shoot button always triggers sword attacks.
 * No combo chain (only one ground slash variant), but has dash and air variants.
 */

import { Player, P } from './player.js';
import { getSigmaAnim, SIGMA_ANIMATIONS } from './sigma-sprite-data.js';

export class Sigma extends Player {
    constructor(x, y) {
        super(x, y);
        this.characterId = 'sigma';

        // Sigma's hitbox is larger (24x48 vs X's 18x34 / Zero's 18x40)
        this.hitboxW = 28;
        this.hitboxH = 52;

        // Warp beam: Sigma's warp capsule from sigma.png
        this.warpBeamRect = { sx: 192, sy: 3, sw: 58, sh: 60 };

        // Sword attack state
        this.attackAnimName = '';    // Current attack animation key
        this.swordHitbox = null;    // Active hitbox {x, y, w, h} in world space, or null
        this.swordDamage = 3;
        this.swordHitEnemies = new Set(); // Track which enemies were hit this swing
        this._wallAttackContact = 0;     // Preserved wall contact during wall slide attack
        this.attackCooldown = 0;         // Frames before next attack allowed
    }

    /** Use Sigma's sprite data instead of X's. */
    _getAnim(state, shooting = false) {
        // If in attack state, return the attack animation directly
        if (state === 'attack' && this.attackAnimName) {
            return SIGMA_ANIMATIONS[this.attackAnimName] || getSigmaAnim('idle');
        }
        // Sigma has no shoot overlays — just return the base state anim
        return getSigmaAnim(state);
    }

    update(game) {
        if (this.attackCooldown > 0) this.attackCooldown--;
        super.update(game);
    }

    // --- Override ground state to add sword attack on shoot press ---
    _groundState(input, level) {
        if (input.pressed('shoot') && this.attackCooldown <= 0) {
            this._startGroundAttack();
            return;
        }
        super._groundState(input, level);
    }

    // --- Override air state to add air sword slash ---
    _airState(input, level) {
        if (input.pressed('shoot') && this.attackCooldown <= 0) {
            this._startAirAttack();
            return;
        }
        super._airState(input, level);
    }

    // --- Override dash state to allow dash attack ---
    _dashState(input, level) {
        if (input.pressed('shoot') && this.attackCooldown <= 0) {
            this._startDashAttack();
            return;
        }
        super._dashState(input, level);
    }

    // --- Override wall slide to allow wall attack ---
    _wallSlideState(input, level) {
        if (input.pressed('shoot') && this.attackCooldown <= 0) {
            this._startWallSlideAttack();
            return;
        }
        super._wallSlideState(input, level);
    }

    // --- Sword attack initiation ---
    _startGroundAttack() {
        this.state = 'attack';
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'attack';
        this.swordHitEnemies = new Set();
        this.attackAnimName = 'attack';
        this.swordDamage = 3;

        if (this.audio) this.audio.play('saber1');

        // Slow forward movement during attack
        this.vx = P.RUN_SPEED * 0.3 * this.facing;
    }

    _startAirAttack() {
        this.state = 'attack';
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'attack';
        this.swordHitEnemies = new Set();
        this.attackAnimName = 'attack_air';
        this.swordDamage = 3;
        if (this.audio) this.audio.play('saber1');
    }

    _startWallSlideAttack() {
        this.state = 'attack';
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'attack';
        this.swordHitEnemies = new Set();
        this.attackAnimName = 'wall_slide_attack';
        this.swordDamage = 3;
        // Preserve wall contact for physics and rendering
        this._wallAttackContact = this.wallContact;
        if (this.audio) this.audio.play('saber1');
    }

    _startDashAttack() {
        this.state = 'attack';
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'attack';
        this.swordHitEnemies = new Set();
        this.attackAnimName = 'attack_dash';
        this.swordDamage = 4;

        if (this.audio) this.audio.play('saber1');

        // Carry dash momentum into the attack
        this.vx = P.DASH_SPEED * this.facing;
        this.isDashing = false;
        this.dashTimer = 0;
    }

    _attackState(input, level) {
        const isWallAttack = this.attackAnimName === 'wall_slide_attack';

        if (isWallAttack) {
            // Wall slide attack: stay on wall, slide down
            this.vy = P.WALL_SLIDE_SPEED;
            this.vx = 0;
            this.facing = -this._wallAttackContact;
        } else {
            // Normal/air/dash attacks: apply gravity
            this.vy += P.GRAVITY;
            if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

            // Deceleration during ground attack
            if (this.grounded) {
                if (this.attackAnimName === 'attack_dash') {
                    this.vx *= 0.92;
                } else {
                    this.vx *= 0.85;
                }
                if (Math.abs(this.vx) < 0.1) this.vx = 0;
            }

            // Allow turning (not during dash attack — committed to direction)
            if (this.attackAnimName !== 'attack_dash') {
                if (input.held('left')) this.facing = -1;
                if (input.held('right')) this.facing = 1;
            }
        }

        // Update sword hitbox from current frame's atkBox data
        const anim = this._getAnim('attack');
        const totalFrames = anim.frames.length;
        const frameIdx = this.animFrame % totalFrames;
        const frame = anim.frames[frameIdx];

        if (frame.atkBox) {
            const feetX = this.x + this.hitboxX + this.hitboxW / 2;
            const feetY = this.y + this.hitboxY + this.hitboxH;
            this.swordHitbox = {
                x: feetX - Math.floor(frame.atkBox.w / 2) + frame.atkBox.ox * this.facing,
                y: feetY - frame.atkBox.h + frame.atkBox.oy,
                w: frame.atkBox.w,
                h: frame.atkBox.h,
            };
        } else {
            this.swordHitbox = null;
        }

        // Check if animation finished
        if (this.animFrame >= totalFrames - 1 &&
            this.animTimer >= anim.frames[totalFrames - 1].dur - 1) {
            // End attack — apply cooldown before next attack allowed
            this.swordHitbox = null;
            this.attackAnimName = '';
            this.attackCooldown = 16; // ~0.27s gap → ~1.8 attacks/sec
            if (isWallAttack && this._wallAttackContact) {
                // Return to wall slide
                this.wallContact = this._wallAttackContact;
                this._wallAttackContact = 0;
                this.state = 'wall_slide';
            } else if (this.grounded) {
                this.vx = 0;
                this.state = 'idle';
            } else {
                this.state = 'fall';
            }
        }
    }

    // --- Override damage to reset attack state ---
    takeDamage(amount, fromDirection) {
        this.swordHitbox = null;
        this.attackAnimName = '';
        super.takeDamage(amount, fromDirection);
    }

    // --- Sigma doesn't use buster/charge — sword only ---
    _handleShooting(input) {
        // No-op: Sigma's shoot is handled by sword attacks in state overrides.
        // Clear any charge state inherited from Player base.
        this.chargeLevel = 0;
        this.chargeTime = 0;
        this.chargeFlashTimer = 0;
    }

    render(ctx, camera) {
        // Wall slide attack sprites face the wall — trick the base render's flip check
        // by temporarily setting wallSlideFlip flag checked via state override
        if (this.state === 'attack' && this.attackAnimName === 'wall_slide_attack') {
            // Temporarily flip facing toward wall so base render draws correctly
            // (base render inverts flip when state === 'wall_slide', but we're in 'attack')
            const savedFacing = this.facing;
            this.facing = this._wallAttackContact; // face toward wall
            super.render(ctx, camera);
            this.facing = savedFacing;
            return;
        }
        super.render(ctx, camera);
        this._renderSlashEffect(ctx, camera);
    }

    /** Draw the green energy slash arc during active attack frames. */
    _renderSlashEffect(ctx, camera) {
        if (this.state !== 'attack') return;
        if (!this.swordHitbox) return;
        if (!this.spriteImage) return;
        if (this.attackAnimName === 'wall_slide_attack') return;
        // Match invincibility flash with player sprite
        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const anim = this._getAnim('attack');
        const frameIdx = this.animFrame % anim.frames.length;
        const frame = anim.frames[frameIdx];
        if (frame.hx === undefined) return;

        const slash = SIGMA_ANIMATIONS.proj_slash.frames[0];
        const feetX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const feetY = Math.floor(this.y + this.hitboxY + this.hitboxH - camera.y);
        const drawY = feetY + frame.hy - Math.floor(slash.sh / 2);

        if (this.facing < 0) {
            ctx.save();
            ctx.translate(feetX, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(this.spriteImage,
                slash.sx, slash.sy, slash.sw, slash.sh,
                frame.hx - Math.floor(slash.sw / 2), drawY, slash.sw, slash.sh);
            ctx.restore();
        } else {
            ctx.drawImage(this.spriteImage,
                slash.sx, slash.sy, slash.sw, slash.sh,
                feetX + frame.hx - Math.floor(slash.sw / 2), drawY, slash.sw, slash.sh);
        }
    }
}
