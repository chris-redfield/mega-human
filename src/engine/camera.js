/**
 * camera.js
 * Viewport scrolling camera, clamped to level bounds.
 * SNES resolution: 256×224.
 */

export const SCREEN_W = 307;
export const SCREEN_H = 224;

export class Camera {
    constructor(levelWidth, levelHeight) {
        this.x = 0;
        this.y = 0;
        this.levelWidth = levelWidth;
        this.levelHeight = levelHeight;
    }

    /** Follow a target entity. Mega Man X uses near-instant horizontal follow. */
    follow(target) {
        // Center horizontally on target
        this.x = target.x - SCREEN_W / 2 + 12;

        // Vertical: follow with a dead zone
        const topThreshold = this.y + 64;
        const bottomThreshold = this.y + SCREEN_H - 64;

        if (target.y < topThreshold) {
            this.y = target.y - 64;
        } else if (target.y > bottomThreshold) {
            this.y = target.y - SCREEN_H + 64;
        }

        // Clamp to level bounds
        this.x = Math.max(0, Math.min(this.x, this.levelWidth - SCREEN_W));
        this.y = Math.max(0, Math.min(this.y, this.levelHeight - SCREEN_H));
    }
}
