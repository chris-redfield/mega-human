/**
 * player.js
 * Mega Man X-style player character with full movement state machine.
 *
 * States: warp_in, idle, run, jump, fall, land, wall_slide, dash, hurt, die
 * Actions: run, jump, wall-jump, dash, shoot
 */

import { Entity } from './entity.js';
import { resolveHorizontal, resolveVertical, checkWallContact, isSolid } from '../engine/collision.js';
import { getAnim, BUSTER_FRAMES, BUSTER2_FRAMES, BUSTER3_FRAMES, CHARGE_PARTICLES } from './sprite-data.js';

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
    CHARGE_SPEED_2:   6.0,    // Level 1 charged shot speed
    CHARGE_SPEED_3:   7.0,    // Level 2 charged shot speed
    CHARGE1_TIME:     45,     // Frames to reach charge level 1 (0.75s at 60fps)
    CHARGE2_TIME:     105,    // Frames to reach charge level 2 (1.75s at 60fps)

    HURT_VX:          2.0,
    HURT_VY:         -2.0,
    HURT_DURATION:    30,   // frames
    INVINCIBLE_TIME:  90,   // frames of invincibility after being hurt

    // Hitbox dimensions (original MMX: 18x34, botmid aligned)
    WIDTH:            18,
    HEIGHT:           34,
    HITBOX_X:         0,
    HITBOX_Y:         0,
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
        this.state = 'warp_in';
        this.grounded = false;
        this.wallContact = 0; // -1 left, 0 none, 1 right

        // Timers
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false; // Preserves dash speed through jump/fall
        this.wallJumpLock = 0;
        this.hurtTimer = 0;
        this.invincibleTimer = 0;
        this.shotCooldown = 0;
        this.shootAnimTimer = 0; // frames remaining for shoot sprite overlay

        // Charge system
        this.chargeTime = 0;     // Frames held
        this.chargeLevel = 0;    // 0=none, 1=medium, 2=large
        this.chargeFlashTimer = 0;

        // Charge particle state (8 particles in a circle)
        this.chargeParticles = [];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.chargeParticles.push({
                baseAngle: angle,
                time: [0, 3, 0, 1.5, -1.5, -3, -1.5, -1.5][i],
            });
        }

        // Projectiles managed externally
        this.shots = [];

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this._prevAnimState = 'warp_in';
        this.dead = false;

        // Warp beam state
        this.warpBeamY = this.y - 200;  // Beam starts 200px above spawn
        this.warpBeamActive = true;      // Beam descending phase
        this.warpVisible = false;        // Player invisible during beam descent
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
            case 'warp_in':
                this._warpInState(input, level);
                break;
            case 'idle':
            case 'run':
                this._groundState(input, level);
                break;
            case 'jump':
            case 'fall':
                this._airState(input, level);
                break;
            case 'land':
                this._landState(input, level);
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
            case 'die':
                this._dieState(input, level);
                break;
        }

        // Shooting (available in most states)
        const noShootStates = ['hurt', 'die', 'warp_in'];
        if (!noShootStates.includes(this.state)) {
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
            this.isDashing = true;
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
        // Horizontal movement — use dash speed if dash-jumping
        const moveSpeed = this.isDashing ? P.DASH_SPEED : P.RUN_SPEED;
        if (this.wallJumpLock <= 0) {
            if (input.held('left')) {
                this.vx = -moveSpeed;
                this.facing = -1;
            } else if (input.held('right')) {
                this.vx = moveSpeed;
                this.facing = 1;
            } else {
                // No direction held: stop if dash-jumping, decelerate otherwise
                if (this.isDashing) {
                    this.vx = 0;
                } else {
                    this.vx *= 0.9;
                    if (Math.abs(this.vx) < 0.1) this.vx = 0;
                }
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
            this.isDashing = true;
            this.state = 'dash';
            return;
        }

        // Check for wall contact → enter wall slide
        this.wallContact = checkWallContact(level, this.x + this.hitboxX, this.y + this.hitboxY, this.hitboxW, this.hitboxH);
        if (this.wallContact !== 0 && this.vy > 0) {
            // Only wall-slide if pressing toward the wall
            if ((this.wallContact === 1 && input.held('right')) ||
                (this.wallContact === -1 && input.held('left'))) {
                this.isDashing = false;
                this.state = 'wall_slide';
                return;
            }
        }

        // Landing — play land animation, clear dash momentum
        if (this.grounded) {
            this.isDashing = false;
            this.state = 'land';
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
        this.vx = P.DASH_SPEED * this.facing;

        // Apply gravity always — collision keeps player on ground,
        // and this ensures grounded detection works (dy must be > 0)
        this.vy += P.GRAVITY;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        if (this.dashTimer <= 0) {
            this.dashCooldown = P.DASH_COOLDOWN;
            if (this.grounded) {
                // Original MMX: dash snaps directly to idle or run (no transition anim)
                this.isDashing = false;
                if (input.held('left') || input.held('right')) {
                    this.vx = P.RUN_SPEED * this.facing;
                    this.state = 'run';
                } else {
                    this.vx = 0;
                    this.state = 'idle';
                }
            } else {
                // Air dash expired — keep isDashing for momentum through fall
                const airSpeed = this.isDashing ? P.DASH_SPEED : P.RUN_SPEED;
                this.vx = input.held('left') || input.held('right') ? airSpeed * this.facing : 0;
                this.state = 'fall';
            }
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

    _warpInState(input, level) {
        this.vx = 0;

        // Phase 1: beam descent (player invisible, beam moves down)
        if (this.warpBeamActive) {
            this.vy = 0; // No gravity during beam phase
            this.warpBeamY += 7.5; // 450 px/s at 60fps
            if (this.warpBeamY >= this.y) {
                // Beam reached landing point — switch to materialize phase
                this.warpBeamActive = false;
                this.warpVisible = true;
                this.animFrame = 0;
                this.animTimer = 0;
            }
            return;
        }

        // Phase 2: materialize animation (gravity + warp_in anim)
        this.vy += P.GRAVITY;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        const anim = getAnim('warp_in');
        if (this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1 &&
            this.animFrame >= anim.frames.length - 1) {
            this.state = 'idle';
        }
    }

    _landState(input, level) {
        // Apply gravity to maintain grounded detection (vy=0 causes grounded=false)
        this.vy += P.GRAVITY;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

        // Jump cancel
        if (input.pressed('jump')) {
            this.vy = P.JUMP_VELOCITY;
            this.grounded = false;
            this.state = 'jump';
            return;
        }

        // Animation finished → exit to idle/run
        const anim = getAnim('land');
        if (this.animFrame >= anim.frames.length - 1 &&
            this.animTimer >= anim.frames[anim.frames.length - 1].dur - 1) {
            if (input.held('left') || input.held('right')) {
                this.facing = input.held('left') ? -1 : 1;
                this.vx = P.RUN_SPEED * this.facing;
                this.state = 'run';
            } else {
                this.vx = 0;
                this.state = 'idle';
            }
            return;
        }

        // Slow movement during land
        if (input.held('left')) {
            this.facing = -1;
            this.vx = -P.RUN_SPEED * 0.5;
        } else if (input.held('right')) {
            this.facing = 1;
            this.vx = P.RUN_SPEED * 0.5;
        } else {
            this.vx = 0;
        }
    }

    _dieState(input, level) {
        // Death animation — no input, no movement
        this.vx = 0;
        this.vy = 0;
        // Animation plays once and holds on last frame
    }

    // --- Shooting ---

    _handleShooting(input) {
        // On press: fire normal lemon shot and start charging
        if (input.pressed('shoot') && this.shotCooldown <= 0 && this.shots.length < P.MAX_SHOTS) {
            this._fireShot(P.SHOT_SPEED, 1, 'normal');
            this.shotCooldown = P.SHOT_COOLDOWN;
            this.chargeTime = 0;
            this.chargeLevel = 0;
        }

        // While holding: build charge
        if (input.held('shoot')) {
            this.chargeTime++;
            if (this.chargeTime >= P.CHARGE2_TIME) {
                this.chargeLevel = 2;
            } else if (this.chargeTime >= P.CHARGE1_TIME) {
                this.chargeLevel = 1;
            }
            // Flash timer for visual effect
            if (this.chargeLevel > 0) {
                this.chargeFlashTimer++;
            }
        }

        // On release: fire charged shot if charged
        if (input.released('shoot') && this.chargeLevel > 0) {
            this.shootAnimTimer = 18;
            if (this.chargeLevel === 2) {
                this._fireShot(P.CHARGE_SPEED_3, 3, 'charge2');
            } else {
                this._fireShot(P.CHARGE_SPEED_2, 2, 'charge1');
            }
            this.chargeTime = 0;
            this.chargeLevel = 0;
            this.chargeFlashTimer = 0;
        }

        // Clear charge on release without charge
        if (input.released('shoot') && this.chargeLevel === 0) {
            this.chargeTime = 0;
            this.chargeFlashTimer = 0;
        }
    }

    _fireShot(speed, damage, type) {
        // Trigger shoot animation overlay
        this.shootAnimTimer = 18;

        // Get hand position from the shoot animation frame
        const anim = getAnim(this.state, true);
        const frameIdx = this.animFrame % anim.frames.length;
        const frame = anim.frames[frameIdx];

        const feetX = this.x + this.hitboxX + this.hitboxW / 2;
        const feetY = this.y + this.hitboxY + this.hitboxH;

        let spawnX, spawnY;
        if (frame.hx !== undefined) {
            const hx = this.state === 'wall_slide' ? -frame.hx : frame.hx;
            spawnX = feetX + hx * this.facing;
            spawnY = feetY + frame.hy;
        } else {
            spawnX = feetX + (this.hitboxW / 2 + 4) * this.facing;
            spawnY = feetY - this.hitboxH / 2;
        }

        this.shots.push({
            x: spawnX,
            y: spawnY,
            vx: speed * this.facing,
            active: true,
            damage: damage,
            type: type,       // 'normal', 'charge1', 'charge2'
            fading: false,
            animFrame: 0,
            animTimer: 0,
            startupDone: type === 'normal',
        });
    }

    _updateShots(level) {
        for (const shot of this.shots) {
            if (!shot.active) continue;

            if (shot.fading) {
                // Advance fade animation
                shot.fadeTimer++;
                const fadeFrames = this._getFadeFrames(shot.type);
                const fadeFrame = fadeFrames[shot.fadeFrame];
                if (fadeFrame && shot.fadeTimer >= fadeFrame.dur) {
                    shot.fadeTimer = 0;
                    shot.fadeFrame++;
                    if (shot.fadeFrame >= fadeFrames.length) {
                        shot.active = false;
                    }
                }
                continue;
            }

            // Advance charged shot animation
            if (shot.type !== 'normal') {
                shot.animTimer++;
                const frames = this._getShotFrames(shot);
                if (frames && shot.animTimer >= frames[shot.animFrame].dur) {
                    shot.animTimer = 0;
                    shot.animFrame++;
                    if (shot.animFrame >= frames.length) {
                        if (!shot.startupDone) {
                            // Transition from startup to loop
                            shot.startupDone = true;
                            shot.animFrame = 0;
                        } else {
                            shot.animFrame = 0; // Loop
                        }
                    }
                }
            }

            shot.x += shot.vx;

            // Remove if off-screen
            if (shot.x < this.x - 300 || shot.x > this.x + 300) {
                shot.active = false;
                continue;
            }

            // Check wall collision
            const checkDist = shot.type === 'normal' ? 4 : 8;
            const checkX = shot.x + (shot.vx > 0 ? checkDist : -checkDist);
            if (isSolid(level, checkX, shot.y)) {
                shot.fading = true;
                shot.fadeFrame = 0;
                shot.fadeTimer = 0;
                shot.vx = 0;
            }
        }

        // Clean up inactive shots
        this.shots = this.shots.filter(s => s.active);
    }

    _getShotFrames(shot) {
        const data = shot.type === 'charge2' ? BUSTER3_FRAMES : BUSTER2_FRAMES;
        return shot.startupDone ? data.loop : data.startup;
    }

    _getFadeFrames(type) {
        if (type === 'charge2') return BUSTER3_FRAMES.fade;
        if (type === 'charge1') return BUSTER2_FRAMES.fade;
        return BUSTER_FRAMES.fade;
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
        this.isDashing = false;
        this.chargeTime = 0;
        this.chargeLevel = 0;
        this.chargeFlashTimer = 0;

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'die';
            this.vx = 0;
            this.vy = 0;
            this.dead = true;
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
        // Warp beam: draw blue beam during descent phase
        if (this.state === 'warp_in' && this.warpBeamActive && this.spriteImage) {
            const beamX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
            const beamY = Math.floor(this.warpBeamY - camera.y);
            // Beam sprite: 8x48 from XDefault.png at (455, 106)
            ctx.drawImage(this.spriteImage,
                455, 106, 8, 48,
                beamX - 4, beamY - 48, 8, 48);
            return; // Don't draw player sprite during beam phase
        }

        // Player invisible during beam descent
        if (this.state === 'warp_in' && !this.warpVisible) return;

        // Flash when invincible
        if (this.invincibleTimer > 0 && this.invincibleTimer % 4 < 2) return;

        // Render charge particles behind player
        if (this.chargeLevel > 0) {
            this._renderChargeParticles(ctx, camera);
        }

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

        // Charge flash: brighten sprite by drawing with lighter composite
        const isChargeFlash = this.chargeLevel > 0 && this.chargeFlashTimer % 6 < 3;

        if (this.spriteImage) {
            const ox = frame.ox || 0;
            const oy = frame.oy || 0;
            const drawY = feetY - frame.sh + oy;

            if (flipH) {
                ctx.save();
                ctx.translate(feetX, 0);
                ctx.scale(-1, 1);
                const drawX = -Math.floor(frame.sw / 2) + ox;
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    drawX, drawY, frame.sw, frame.sh);
                if (isChargeFlash) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.4;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        drawX, drawY, frame.sw, frame.sh);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
                ctx.restore();
            } else {
                const drawX = feetX - Math.floor(frame.sw / 2) + ox;
                ctx.drawImage(this.spriteImage,
                    frame.sx, frame.sy, frame.sw, frame.sh,
                    drawX, drawY, frame.sw, frame.sh);
                if (isChargeFlash) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.4;
                    ctx.drawImage(this.spriteImage,
                        frame.sx, frame.sy, frame.sw, frame.sh,
                        drawX, drawY, frame.sw, frame.sh);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
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

    _renderChargeParticles(ctx, camera) {
        if (!this.effectsImage || this.chargeLevel <= 0) return;

        const particles = CHARGE_PARTICLES[this.chargeLevel];
        if (!particles) return;

        // Center point: 18px above feet
        const centerX = Math.floor(this.x + this.hitboxX + this.hitboxW / 2 - camera.x);
        const centerY = Math.floor(this.y + this.hitboxY + this.hitboxH - 18 - camera.y);
        const radius = 24;

        for (const part of this.chargeParticles) {
            // Advance particle time
            part.time += 1 / 3; // ~20 units/sec at 60fps
            if (part.time > 3) part.time = -3;
            if (part.time <= 0) continue; // Invisible when time <= 0

            // Converge toward center based on time (0→3 maps to full radius→0)
            const progress = part.time / 3; // 0 to 1
            const dist = radius * (1 - progress);

            const px = centerX + Math.cos(part.baseAngle) * dist;
            const py = centerY + Math.sin(part.baseAngle) * dist;

            // Pick frame based on time (0-3 maps to frames 0-3)
            const frameIdx = Math.min(Math.floor(part.time), particles.length - 1);
            const frame = particles[frameIdx];

            ctx.drawImage(this.effectsImage,
                frame.sx, frame.sy, frame.sw, frame.sh,
                Math.floor(px - frame.sw / 2), Math.floor(py - frame.sh / 2),
                frame.sw, frame.sh);
        }
    }

    _renderShots(ctx, camera) {
        const ef = this.effectsImage;

        for (const shot of this.shots) {
            const sx = Math.floor(shot.x - camera.x);
            const sy = Math.floor(shot.y - camera.y);

            if (!ef) {
                // Fallback: colored rectangle (bigger for charged shots)
                const size = shot.type === 'charge2' ? 12 : shot.type === 'charge1' ? 8 : 4;
                ctx.fillStyle = shot.type !== 'normal' ? '#00ffff' : '#ffdd00';
                ctx.fillRect(sx - size, sy - size / 2, size * 2, size);
                continue;
            }

            if (shot.fading) {
                // Fade/hit animation
                const fadeFrames = this._getFadeFrames(shot.type);
                const fadeFrame = fadeFrames[shot.fadeFrame] || fadeFrames[0];
                ctx.drawImage(ef,
                    fadeFrame.sx, fadeFrame.sy, fadeFrame.sw, fadeFrame.sh,
                    sx - Math.floor(fadeFrame.sw / 2), sy - Math.floor(fadeFrame.sh / 2),
                    fadeFrame.sw, fadeFrame.sh);
            } else if (shot.type === 'normal') {
                // Normal lemon shot
                const bf = BUSTER_FRAMES.shot;
                this._drawShotSprite(ctx, ef, bf, sx, sy, shot.vx < 0);
            } else {
                // Charged shot — animated
                const frames = this._getShotFrames(shot);
                const frame = frames[shot.animFrame % frames.length];
                this._drawShotSprite(ctx, ef, frame, sx, sy, shot.vx < 0);
            }
        }
    }

    _drawShotSprite(ctx, ef, frame, sx, sy, flipH) {
        if (flipH) {
            ctx.save();
            ctx.translate(sx, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(ef,
                frame.sx, frame.sy, frame.sw, frame.sh,
                -Math.floor(frame.sw / 2), sy - Math.floor(frame.sh / 2),
                frame.sw, frame.sh);
            ctx.restore();
        } else {
            ctx.drawImage(ef,
                frame.sx, frame.sy, frame.sw, frame.sh,
                sx - Math.floor(frame.sw / 2), sy - Math.floor(frame.sh / 2),
                frame.sw, frame.sh);
        }
    }

}
