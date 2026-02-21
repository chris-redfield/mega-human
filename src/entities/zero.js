/**
 * zero.js
 * Zero — sword-based player character extending the base Player class.
 *
 * States: warp_in, idle, run, jump, fall, land, wall_slide, dash, attack, hurt, die
 * Primary weapon: Z-Saber (3-hit ground combo + air slash)
 * Secondary: buster (same as X, fires on hold+release)
 */

import { Player, P } from './player.js';
import { getZeroAnim, ZERO_ANIMATIONS } from './zero-sprite-data.js';

export class Zero extends Player {
    constructor(x, y) {
        super(x, y);
        this.characterId = 'zero';

        // Zero's hitbox is slightly taller (40 vs 34)
        this.hitboxH = 40;

        // Warp beam: Zero's beam from zero.png
        this.warpBeamRect = { sx: 34, sy: 1185, sw: 7, sh: 55 };

        // Sword combo state
        this.comboStep = 0;       // 0=none, 1=slash1, 2=slash2, 3=slash3
        this.comboChain = false;  // True when player pressed attack during current swing
        this.attackAnimName = '';  // Current attack animation key
        this.swordHitbox = null;  // Active hitbox {x, y, w, h} in world space, or null
        this.swordDamage = 2;
        this.swordHitEnemies = new Set(); // Track which enemies were hit this swing
    }

    /** Use Zero's sprite data instead of X's. */
    _getAnim(state, shooting = false) {
        // If in attack state, return the attack animation directly
        if (state === 'attack' && this.attackAnimName) {
            return ZERO_ANIMATIONS[this.attackAnimName] || getZeroAnim('idle');
        }
        return getZeroAnim(state, shooting);
    }

    // --- Override ground state to add sword attack on shoot press ---
    _groundState(input, level) {
        // Sword attack on shoot press (before buster fires)
        if (input.pressed('shoot') && this.comboStep === 0) {
            this._startAttack(1);
            return;
        }

        // Otherwise use normal ground logic
        super._groundState(input, level);
    }

    // --- Override air state to add air sword slash ---
    _airState(input, level) {
        // Air sword attack on shoot press
        if (input.pressed('shoot') && this.comboStep === 0) {
            this._startAirAttack();
            return;
        }

        super._airState(input, level);
    }

    // --- Sword attack state ---
    _startAttack(step) {
        this.state = 'attack';
        this.comboStep = step;
        this.comboChain = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'attack';
        this.swordHitEnemies = new Set();

        // Pick animation and damage based on combo step
        if (step === 1) {
            this.attackAnimName = 'attack';
            this.swordDamage = 2;
        } else if (step === 2) {
            this.attackAnimName = 'attack2';
            this.swordDamage = 2;
        } else {
            this.attackAnimName = 'attack3';
            this.swordDamage = 4;
        }

        // Slow forward movement during attack
        this.vx = P.RUN_SPEED * 0.3 * this.facing;
    }

    _startAirAttack() {
        this.state = 'attack';
        this.comboStep = 1; // No air combo chain for now
        this.comboChain = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'attack';
        this.attackAnimName = 'attack_air';
        this.swordDamage = 2;
        this.swordHitEnemies = new Set();
    }

    _attackState(input, level) {
        // Apply gravity always (maintain grounded detection)
        this.vy += P.GRAVITY;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        // Slow deceleration during ground attack
        if (this.grounded) {
            this.vx *= 0.85;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Allow turning between combo hits
        if (input.held('left')) this.facing = -1;
        if (input.held('right')) this.facing = 1;

        // Check for combo chain input (after 40% of animation)
        const anim = this._getAnim('attack');
        const totalFrames = anim.frames.length;
        const progress = this.animFrame / totalFrames;

        if (input.pressed('shoot') && progress > 0.4 && this.attackAnimName !== 'attack_air') {
            this.comboChain = true;
        }

        // Update sword hitbox from current frame's atkBox data
        const frameIdx = this.animFrame % anim.frames.length;
        const frame = anim.frames[frameIdx];
        if (frame.atkBox) {
            // Hitbox uses botmid alignment (same as original game):
            // box is positioned with bottom-center at feet, then shifted by offset
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
            // Chain to next combo step if buffered
            if (this.comboChain && this.comboStep < 3 && this.grounded) {
                this._startAttack(this.comboStep + 1);
                return;
            }
            // End attack
            this.swordHitbox = null;
            this.comboStep = 0;
            this.attackAnimName = '';
            if (this.grounded) {
                this.vx = 0;
                this.state = 'idle';
            } else {
                this.state = 'fall';
            }
        }
    }

    // --- Override damage to also reset combo ---
    takeDamage(amount, fromDirection) {
        this.comboStep = 0;
        this.comboChain = false;
        this.swordHitbox = null;
        this.attackAnimName = '';
        super.takeDamage(amount, fromDirection);
    }

    // --- Override render for sword slash debug ---
    render(ctx, camera) {
        super.render(ctx, camera);
    }
}
