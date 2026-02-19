/**
 * entity.js
 * Base entity class for all game objects.
 */

export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.active = true;
        this.hp = 1;
        this.maxHp = 1;

        // Hitbox relative to entity position
        this.hitboxX = 0;
        this.hitboxY = 0;
        this.hitboxW = 16;
        this.hitboxH = 16;
    }

    /** World-space hitbox. */
    getHitbox() {
        return {
            x: this.x + this.hitboxX,
            y: this.y + this.hitboxY,
            w: this.hitboxW,
            h: this.hitboxH,
        };
    }

    update(game) {}
    render(ctx, camera) {}

    onHit(damage, source) {
        this.hp -= damage;
        if (this.hp <= 0) this.destroy();
    }

    destroy() {
        this.active = false;
    }
}

/**
 * AABB overlap test.
 */
export function boxOverlap(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}
