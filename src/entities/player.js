/**
 * player.js
 * Mega Man X-style player character with full movement state machine.
 *
 * States: idle, run, jump, fall, wall_slide, dash, hurt
 * Actions: run, jump, wall-jump, dash, shoot
 */

import { Entity } from './entity.js';
import { resolveHorizontal, resolveVertical, checkWallContact, isSolid } from '../engine/collision.js';
import { getAnim, BUSTER_FRAMES } from './sprite-data.js';

// Physics constants (tuned to match Mega Man X feel)
const P = {
    RUN_SPEED:        1.5,
    DASH_SPEED:       3.0,
    DASH_DURATION:    24,   // frames
    DASH_COOLDOWN:    4,    // frames after dash before another

    JUMP_VELOCITY:    -4.5,
    JUMP_HOLD_GRAVITY: 0.15, // lower gravity while holding jump
    GRAVITY:          0.25,
    MAX_FALL_SPEED:   4.0,

    WALL_SLIDE_SPEED: 1.0,
    WALL_JUMP_VX:     2.5,
    WALL_JUMP_VY:     -4.5,
    WALL_JUMP_LOCK:   10,  // frames of locked horizontal input after wall-jump

    SHOT_SPEED:       5.0,
    SHOT_COOLDOWN:    8,
    MAX_SHOTS:        3,

    HURT_VX:          2.0,
    HURT_VY:         -2.0,
    HURT_DURATION:    30,   // frames
    INVINCIBLE_TIME:  90,   // frames of invincibility after being hurt

    // Hitbox dimensions
    WIDTH:            14,
    HEIGHT:           24,
    HITBOX_X:         1,
    HITBOX_Y:         6,
};

export class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.maxHp = 16;
        this.hp = 16;

        this.hitboxX = P.HITBOX_X;
        this.hitboxY = P.HITBOX_Y;
        this.hitboxW = P.WIDTH;
        this.hitboxH = P.HEIGHT;

        this.facing = 1; // 1 = right, -1 = left
        this.state = 'idle';
        this.grounded = false;
        this.wallContact = 0; // -1 left, 0 none, 1 right

        // Timers
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.wallJumpLock = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;
        this.shotCooldown = 0;
        this.shootAnimTimer = 0; // frames remaining for shoot sprite overlay

        // Projectiles managed externally
        this.shots = [];

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'idle';
    }

    update(game) {
        const input = game.input;
        const level = game.level;

        // Decrement timers
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.wallJumpLock > 0) this.wallJumpLock--;
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.shotCooldown > 0) this.shotCooldown--;
        if (this.shootAnimTimer > 0) this.shootAnimTimer--;

        // State machine
        switch (this.state) {
            case 'idle':
            case 'run':
                this._groundState(input, level);
                break;
            case 'jump':
            case 'fall':
                this._airState(input, level);
                break;
            case 'wall_slide':
                this._wallSlideState(input, level);
                break;
            case 'dash':
                this._dashState(input, level);
                break;
            case 'hurt':
                this._hurtState(input, level);
                break;
        }

        // Shooting (available in most states, including dash)
        if (this.state !== 'hurt') {
            this._handleShooting(input);
        }

        // Apply velocity and resolve collisions
        this._moveAndCollide(level);

        // Update projectiles
        this._updateShots(level);

        // Update animation
        this._updateAnimation();
    }

    // --- State handlers ---

    _groundState(input, level) {
        // Horizontal movement
        if (this.wallJumpLock <= 0) {
            if (input.held('left')) {
                this.vx = -P.RUN_SPEED;
                this.facing = -1;
                this.state = 'run';
            } else if (input.held('right')) {
                this.vx = P.RUN_SPEED;
                this.facing = 1;
                this.state = 'run';
            } else {
                this.vx = 0;
                this.state = 'idle';
            }
        }

        // Jump
        if (input.pressed('jump')) {
            this.vy = P.JUMP_VELOCITY;
            this.grounded = false;
            this.state = 'jump';
            return;
        }

        // Dash
        if (input.pressed('dash') && this.dashCooldown <= 0) {
            this.dashTimer = P.DASH_DURATION;
            this.vx = P.DASH_SPEED * this.facing;
            this.vy = 0;
            this.state = 'dash';
            return;
        }

        // Apply gravity (for walking off ledges)
        this.vy += P.GRAVITY;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        // If not grounded, transition to fall
        if (!this.grounded) {
            this.state = 'fall';
        }
    }

    _airState(input, level) {
        // Horizontal movement (reduced if wall-jump locked)
        if (this.wallJumpLock <= 0) {
            if (input.held('left')) {
                this.vx = -P.RUN_SPEED;
                this.facing = -1;
            } else if (input.held('right')) {
                this.vx = P.RUN_SPEED;
                this.facing = 1;
            } else {
                // Air friction: slowly decelerate
                this.vx *= 0.9;
                if (Math.abs(this.vx) < 0.1) this.vx = 0;
            }
        }

        // Variable-height jump: lower gravity while holding jump button going up
        if (this.state === 'jump' && this.vy < 0 && input.held('jump')) {
            this.vy += P.JUMP_HOLD_GRAVITY;
        } else {
            this.vy += P.GRAVITY;
        }

        if (this.vy > 0) this.state = 'fall';
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        // Dash in air
        if (input.pressed('dash') && this.dashCooldown <= 0) {
            this.dashTimer = P.DASH_DURATION;
            this.vx = P.DASH_SPEED * this.facing;
            this.vy = 0;
            this.state = 'dash';
            return;
        }

        // Check for wall contact → enter wall slide
        this.wallContact = checkWallContact(level, this.x + this.hitboxX, this.y + this.hitboxY, this.hitboxW, this.hitboxH);
        if (this.wallContact !== 0 && this.vy > 0) {
            // Only wall-slide if pressing toward the wall
            if ((this.wallContact === 1 && input.held('right')) ||
                (this.wallContact === -1 && input.held('left'))) {
                this.state = 'wall_slide';
                return;
            }
        }

        // Landing
        if (this.grounded) {
            this.state = this.vx !== 0 ? 'run' : 'idle';
        }
    }

    _wallSlideState(input, level) {
        // Slow slide down
        this.vy = P.WALL_SLIDE_SPEED;
        this.vx = 0;

        // Face away from wall
        this.facing = -this.wallContact;

        // Wall jump
        if (input.pressed('jump')) {
            this.vx = P.WALL_JUMP_VX * -this.wallContact;
            this.vy = P.WALL_JUMP_VY;
            this.facing = -this.wallContact;
            this.wallJumpLock = P.WALL_JUMP_LOCK;
            this.wallContact = 0;
            this.state = 'jump';
            return;
        }

        // Release from wall (stop pressing toward wall)
        const holdingTowardWall =
            (this.wallContact === 1 && input.held('right')) ||
            (this.wallContact === -1 && input.held('left'));

        if (!holdingTowardWall) {
            this.wallContact = 0;
            this.state = 'fall';
            return;
        }

        // Check if still on wall
        this.wallContact = checkWallContact(level, this.x + this.hitboxX, this.y + this.hitboxY, this.hitboxW, this.hitboxH);
        if (this.wallContact === 0) {
            this.state = 'fall';
            return;
        }

        // Landing
        if (this.grounded) {
            this.state = 'idle';
        }
    }

    _dashState(input, level) {
        this.dashTimer--;
        this.vy = 0; // Ground dash stays flat
        this.vx = P.DASH_SPEED * this.facing;

        if (this.dashTimer <= 0) {
            this.dashCooldown = P.DASH_COOLDOWN;
            this.vx = input.held('left') || input.held('right') ? P.RUN_SPEED * this.facing : 0;
            this.state = this.grounded ? (this.vx !== 0 ? 'run' : 'idle') : 'fall';
            return;
        }

        // Jump cancel out of dash
        if (input.pressed('jump')) {
            this.vy = P.JUMP_VELOCITY;
            this.dashTimer = 0;
            this.dashCooldown = P.DASH_COOLDOWN;
            this.state = 'jump';
            // Keep dash speed for dash-jump momentum
            return;
        }

        // Apply gravity if in air
        if (!this.grounded) {
            this.vy += P.GRAVITY;
            if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;
        }
    }

    _hurtState(input, level) {
        this.hurtTimer--;

        // Apply gravity
        this.vy += P.GRAVITY;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        // Air friction on knockback
        this.vx *= 0.92;

        if (this.hurtTimer <= 0 && this.grounded) {
            this.vx = 0;
            this.state = 'idle';
        }
    }

    // --- Shooting ---

    _handleShooting(input) {
        if (input.pressed('shoot') && this.shotCooldown <= 0 && this.shots.length < P.MAX_SHOTS) {
            // Trigger shoot animation overlay
            this.shootAnimTimer = 18; // 0.3 seconds at 60fps

            // Get hand position from the shoot animation frame we just activated
            const anim = getAnim(this.state, true);
            const frameIdx = this.animFrame % anim.frames.length;
            const frame = anim.frames[frameIdx];

            // Spawn position: feet anchor + hand POI offset
            const feetX = this.x + this.hitboxX + this.hitboxW / 2;
            const feetY = this.y + this.hitboxY + this.hitboxH;

            let spawnX, spawnY;
            if (frame.hx !== undefined) {
                // Hand POI: offset from feet-center, flip X for facing
                // Wall slide: facing points away from wall, but hx is already negative
                // (pointing away from wall in original coords), so negate it
                const hx = this.state === 'wall_slide' ? -frame.hx : frame.hx;
                spawnX = feetX + hx * this.facing;
                spawnY = feetY + frame.hy;
            } else {
                // Fallback: spawn from hitbox edge
                spawnX = feetX + (this.hitboxW / 2 + 4) * this.facing;
                spawnY = feetY - this.hitboxH / 2;
            }

            this.shots.push({
                x: spawnX,
                y: spawnY,
                vx: P.SHOT_SPEED * this.facing,
                active: true,
                damage: 1,
                fading: false,
            });
            this.shotCooldown = P.SHOT_COOLDOWN;
        }
    }

    _updateShots(level) {
        for (const shot of this.shots) {
            if (!shot.active) continue;

            if (shot.fading) {
                // Advance fade animation
                shot.fadeTimer++;
                const fadeFrame = BUSTER_FRAMES.fade[shot.fadeFrame];
                if (fadeFrame && shot.fadeTimer >= fadeFrame.dur) {
                    shot.fadeTimer = 0;
                    shot.fadeFrame++;
                    if (shot.fadeFrame >= BUSTER_FRAMES.fade.length) {
                        shot.active = false;
                    }
                }
                continue;
            }

            shot.x += shot.vx;

            // Remove if off-screen
            if (shot.x < this.x - 300 || shot.x > this.x + 300) {
                shot.active = false;
                continue;
            }

            // Check wall collision (check from center of shot)
            const checkX = shot.x + (shot.vx > 0 ? 4 : -4);
            if (isSolid(level, checkX, shot.y)) {
                // Start fade animation instead of instant removal
                shot.fading = true;
                shot.fadeFrame = 0;
                shot.fadeTimer = 0;
                shot.vx = 0;
            }
        }

        // Clean up inactive shots
        this.shots = this.shots.filter(s => s.active);
    }

    // --- Movement & Collision ---

    _moveAndCollide(level) {
        // Horizontal
        const oldHitX = this.x + this.hitboxX;
        const expectedHitX = oldHitX + this.vx;
        const resolvedHitX = resolveHorizontal(
            level,
            oldHitX, this.y + this.hitboxY,
            this.hitboxW, this.hitboxH,
            this.vx
        );
        this.x = resolvedHitX - this.hitboxX;

        // Zero velocity if collision stopped us
        if (Math.abs(resolvedHitX - expectedHitX) > 0.01) {
            this.vx = 0;
        }

        // Vertical
        const oldHitY = this.y + this.hitboxY;
        const expectedHitY = oldHitY + this.vy;
        const result = resolveVertical(
            level,
            this.x + this.hitboxX, oldHitY,
            this.hitboxW, this.hitboxH,
            this.vy
        );
        this.y = result.y - this.hitboxY;
        this.grounded = result.grounded;

        if (result.grounded || Math.abs(result.y - expectedHitY) > 0.01) {
            this.vy = 0;
        }
    }

    // --- Damage ---

    takeDamage(amount, fromDirection) {
        if (this.invincibleTimer > 0 || this.state === 'hurt') return;

        this.hp -= amount;
        this.invincibleTimer = P.INVINCIBLE_TIME;
        this.hurtTimer = P.HURT_DURATION;
        this.vx = P.HURT_VX * -fromDirection;
        this.vy = P.HURT_VY;
        this.grounded = false;
        this.state = 'hurt';
        this.dashTimer = 0;

        if (this.hp <= 0) {
            this.hp = 0;
            this.destroy();
        }
    }

    // --- Animation ---

    _updateAnimation() {
        const shooting = this.shootAnimTimer > 0;
        const anim = getAnim(this.state, shooting);
        const frames = anim.frames;
        if (!frames.length) return;

        // Build a composite key so shoot overlay doesn't reset the base animation
        const animKey = this.state;

        // Reset animation when movement state changes (not when shoot overlay toggles)
        if (animKey !== this._prevAnimState) {
            this._prevAnimState = animKey;
            this.animFrame = 0;
            this.animTimer = 0;
        }

        // Clamp frame index to current animation length
        if (this.animFrame >= frames.length) {
            this.animFrame = anim.loop ? this.animFrame % frames.length : frames.length - 1;
        }

        // Advance frame timer
        this.animTimer++;
        const currentFrame = frames[this.animFrame];
        if (this.animTimer >= currentFrame.dur) {
            this.animTimer = 0;
            this.animFrame++;
            if (this.animFrame >= frames.length) {
                if (anim.loop) {
                    this.animFrame = 0;
                } else {
                    this.animFrame = frames.length - 1;
                }
            }
        }
    }

    // --- Rendering ---

    render(ctx, camera) {
        // Flash when invincible
        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        const shooting = this.shootAnimTimer > 0;
        const anim = getAnim(this.state, shooting);
        const frameIdx = this.animFrame % anim.frames.length;
        const frame = anim.frames[frameIdx];

        let flipH = this.facing < 0;
        // Wall slide sprite faces toward the wall, so invert flip
        if (this.state === 'wall_slide') flipH = !flipH;

        // Sprite anchor = bottom-center of hitbox
        const feetX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const feetY = Math.floor(this.y + this.hitboxY + this.hitboxH - camera.y);

        if (this.spriteImage) {
            const ox = frame.ox || 0;
            const oy = frame.oy || 0;
            const drawY = feetY - frame.sh + oy;

            if (flipH) {
                ctx.save();
                // Flip axis is always at feetX (character center)
                ctx.translate(feetX, 0);
                ctx.scale(-1, 1);
                // Keep ox sign — scale(-1) already mirrors the coordinate space
                const drawX = -Math.floor(frame.sw / 2) + ox;
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    drawX, drawY, frame.sw, frame.sh);
                ctx.restore();
            } else {
                const drawX = feetX - Math.floor(frame.sw / 2) + ox;
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    drawX, drawY, frame.sw, frame.sh);
            }
        } else {
            // Fallback: colored rectangle
            const bodyColor = this.state === 'dash' ? '#00ffff' : '#4488ff';
            ctx.fillStyle = bodyColor;
            ctx.fillRect(
                Math.floor(this.x + this.hitboxX - camera.x),
                Math.floor(this.y + this.hitboxY - camera.y),
                this.hitboxW, this.hitboxH);
        }

        // Render projectiles
        this._renderShots(ctx, camera);
    }

    _renderShots(ctx, camera) {
        const ef = this.effectsImage;
        const bf = BUSTER_FRAMES.shot;

        for (const shot of this.shots) {
            const sx = Math.floor(shot.x - camera.x);
            const sy = Math.floor(shot.y - camera.y);

            if (ef) {
                // Draw buster sprite centered on shot position
                if (shot.fading) {
                    // Fade/hit animation
                    const fadeFrame = BUSTER_FRAMES.fade[shot.fadeFrame] || BUSTER_FRAMES.fade[0];
                    ctx.drawImage(ef,
                        fadeFrame.sx, fadeFrame.sy, fadeFrame.sw, fadeFrame.sh,
                        sx - Math.floor(fadeFrame.sw / 2), sy - Math.floor(fadeFrame.sh / 2),
                        fadeFrame.sw, fadeFrame.sh);
                } else {
                    // Normal buster shot — flip sprite based on direction
                    if (shot.vx < 0) {
                        ctx.save();
                        ctx.translate(sx, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(ef,
                            bf.sx, bf.sy, bf.sw, bf.sh,
                            -Math.floor(bf.sw / 2), sy - Math.floor(bf.sh / 2),
                            bf.sw, bf.sh);
                        ctx.restore();
                    } else {
                        ctx.drawImage(ef,
                            bf.sx, bf.sy, bf.sw, bf.sh,
                            sx - Math.floor(bf.sw / 2), sy - Math.floor(bf.sh / 2),
                            bf.sw, bf.sh);
                    }
                }
            } else {
                // Fallback: colored rectangle
                ctx.fillStyle = '#ffdd00';
                ctx.fillRect(sx - 4, sy - 3, 8, 6);
            }
        }
    }

}
