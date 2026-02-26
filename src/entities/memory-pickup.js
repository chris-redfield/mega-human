/**
 * memory-pickup.js
 * RAM Memory currency item — dropped by enemies, collected on player contact.
 *
 * Uses ram-memory-compressed.png as the sprite (full image, original size).
 * Has gravity, slope-aware collision, and a despawn timer with blink effect.
 */

import { Entity } from './entity.js';
import { resolveHorizontal, resolveSlopeVertical } from '../engine/collision.js';

// Physics
const GRAVITY = 0.25;
const MAX_FALL_SPEED = 4.0;

// Despawn timing
const DESPAWN_TIME = 480;    // 8 seconds at 60fps
const BLINK_START = 120;     // Start blinking with 2 seconds left

// Yellow shine effect (pulsing glow when grounded)
const SHINE_FREQ = 0.08;     // radians per frame
const SHINE_MIN = 0.0;       // minimum glow alpha
const SHINE_MAX = 0.5;       // maximum glow alpha

// Display size: source is 52x27, scaled to preserve aspect ratio
const SRC_W = 52;
const SRC_H = 27;
const SCALE = 0.4;
const DISPLAY_W = Math.round(SRC_W * SCALE);  // 36
const DISPLAY_H = Math.round(SRC_H * SCALE);  // 19

export class MemoryPickup extends Entity {
    /**
     * @param {number} x - World X position (center)
     * @param {number} y - World Y position (feet/bottom)
     */
    constructor(x, y) {
        super(x, y);

        // Image set externally
        this.image = null;

        // Fixed display size
        this.displayW = DISPLAY_W;
        this.displayH = DISPLAY_H;

        // Hitbox matches display size
        this.hitboxW = DISPLAY_W;
        this.hitboxH = DISPLAY_H;
        this.hitboxX = -Math.floor(DISPLAY_W / 2);
        this.hitboxY = -DISPLAY_H;

        // Physics
        this.grounded = false;
        this.onSlope = false;

        // Despawn
        this.despawnTimer = DESPAWN_TIME;

        // Shine animation
        this.shineTime = 0;
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

        // Shine animation
        if (this.grounded) {
            this.shineTime += SHINE_FREQ;
        }
    }

    _moveAndCollide(level) {
        // Horizontal (resolve in case spawned inside wall)
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
            if (Math.floor(this.despawnTimer / 4) % 2 === 0) return;
        }

        if (!this.image) return;

        // Position: x is center, y is feet (bottom)
        const drawX = Math.floor(this.x - this.displayW / 2 - camera.x);
        const drawY = Math.floor(this.y - this.displayH - camera.y);

        // Draw the RAM image
        ctx.drawImage(this.image, drawX, drawY, this.displayW, this.displayH);

        // Yellow shine overlay (pulsing)
        if (this.grounded) {
            const t = (Math.sin(this.shineTime) + 1) / 2; // 0..1
            const alpha = SHINE_MIN + t * (SHINE_MAX - SHINE_MIN);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(drawX, drawY, this.displayW, this.displayH);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
