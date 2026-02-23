/**
 * health-pickup.js
 * Health recovery item — shimmer-animated pickup that restores HP.
 *
 * Two sizes: 'small' (4 HP) and 'large' (8 HP).
 * Sprites from effects.png with 7-frame bounce animation.
 * Enemy drops have a despawn timer (8s, blinks last 2s).
 */

import { Entity } from './entity.js';
import { resolveHorizontal, resolveSlopeVertical } from '../engine/collision.js';

// Physics
const GRAVITY = 0.25;
const MAX_FALL_SPEED = 4.0;

// Animation: 7-step bounce sequence, 2 frames per step
const ANIM_SEQUENCE = [0, 1, 2, 3, 2, 1, 0];
const FRAMES_PER_STEP = 2;

// Despawn timing (enemy drops only)
const DESPAWN_TIME = 480;    // 8 seconds at 60fps
const BLINK_START = 120;     // Start blinking with 2 seconds left

// Sprite frame data from effects.png
const SPRITES = {
    small: {
        y: 138,
        h: 8,
        frames: [
            { sx: 6,  sw: 8 },
            { sx: 22, sw: 10 },
            { sx: 40, sw: 10 },
            { sx: 58, sw: 10 },
        ],
        healAmount: 4,
    },
    large: {
        y: 150,
        h: 12,
        frames: [
            { sx: 3,  sw: 14 },
            { sx: 19, sw: 16 },
            { sx: 37, sw: 16 },
            { sx: 55, sw: 16 },
        ],
        healAmount: 8,
    },
};

export class HealthPickup extends Entity {
    /**
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {'small'|'large'} size - Pickup size
     * @param {boolean} fromEnemy - If true, has a despawn timer
     */
    constructor(x, y, size, fromEnemy = false) {
        super(x, y);
        this.size = size;
        this.fromEnemy = fromEnemy;

        const data = SPRITES[size];
        this.healAmount = data.healAmount;

        // Hitbox centered on position
        this.hitboxW = data.frames[0].sw;
        this.hitboxH = data.h;
        this.hitboxX = -Math.floor(this.hitboxW / 2);
        this.hitboxY = -this.hitboxH;

        // Physics
        this.grounded = false;
        this.onSlope = false;

        // Animation
        this.animStep = 0;
        this.animTimer = 0;

        // Despawn (enemy drops only)
        this.despawnTimer = fromEnemy ? DESPAWN_TIME : -1;

        // Sprite image (set externally)
        this.effectsImage = null;
    }

    update(game) {
        const level = game.level;

        // Despawn countdown
        if (this.despawnTimer > 0) {
            this.despawnTimer--;
            if (this.despawnTimer <= 0) {
                this.active = false;
                return;
            }
        }

        // Gravity
        this.vy += GRAVITY;
        if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

        // Move and collide
        this._moveAndCollide(level);

        // Animation
        this.animTimer++;
        if (this.animTimer >= FRAMES_PER_STEP) {
            this.animTimer = 0;
            this.animStep = (this.animStep + 1) % ANIM_SEQUENCE.length;
        }
    }

    _moveAndCollide(level) {
        // Horizontal (pickups don't move horizontally, but resolve in case spawned inside wall)
        if (this.vx !== 0) {
            const oldHitX = this.x + this.hitboxX;
            const resolvedHitX = resolveHorizontal(
                level, oldHitX, this.y + this.hitboxY,
                this.hitboxW, this.hitboxH, this.vx
            );
            this.x = resolvedHitX - this.hitboxX;
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

    render(ctx, camera) {
        // Blink effect during despawn warning
        if (this.despawnTimer > 0 && this.despawnTimer <= BLINK_START) {
            // Skip rendering every other 4 frames
            if (Math.floor(this.despawnTimer / 4) % 2 === 0) return;
        }

        if (!this.effectsImage) return;

        const data = SPRITES[this.size];
        const frameIdx = ANIM_SEQUENCE[this.animStep];
        const frame = data.frames[frameIdx];

        // Position: x is center, y is feet (bottom)
        const drawX = Math.floor(this.x - frame.sw / 2 - camera.x);
        const drawY = Math.floor(this.y - data.h - camera.y);

        ctx.drawImage(this.effectsImage,
            frame.sx, data.y, frame.sw, data.h,
            drawX, drawY, frame.sw, data.h);
    }
}
