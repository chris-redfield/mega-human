/**
 * collision.js
 * Tile-based AABB collision resolution for platformer physics.
 */

const TILE_SIZE = 16;

/**
 * Check if a point falls on a solid tile.
 * @param {object} level - Level object with getTile(col, row) method
 * @param {number} x - World X position
 * @param {number} y - World Y position
 * @returns {boolean}
 */
export function isSolid(level, x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (col < 0 || row < 0 || col >= level.widthInTiles || row >= level.heightInTiles) {
        return true; // Treat out-of-bounds as solid
    }
    return level.getTile(col, row) !== 0;
}

/**
 * Resolve horizontal movement with tile collision.
 * Returns the corrected X position.
 */
export function resolveHorizontal(level, x, y, w, h, dx) {
    const newX = x + dx;

    if (dx > 0) {
        // Moving right — check right edge
        const right = newX + w;
        if (isSolid(level, right, y + 1) || isSolid(level, right, y + h - 1)) {
            return Math.floor(right / TILE_SIZE) * TILE_SIZE - w - 0.01;
        }
    } else if (dx < 0) {
        // Moving left — check left edge
        if (isSolid(level, newX, y + 1) || isSolid(level, newX, y + h - 1)) {
            return (Math.floor(newX / TILE_SIZE) + 1) * TILE_SIZE + 0.01;
        }
    }

    return newX;
}

/**
 * Resolve vertical movement with tile collision.
 * Returns { y, grounded }.
 */
export function resolveVertical(level, x, y, w, h, dy) {
    const newY = y + dy;

    if (dy > 0) {
        // Moving down — check bottom edge
        const bottom = newY + h;
        if (isSolid(level, x + 1, bottom) || isSolid(level, x + w - 1, bottom)) {
            return {
                y: Math.floor(bottom / TILE_SIZE) * TILE_SIZE - h - 0.01,
                grounded: true,
            };
        }
    } else if (dy < 0) {
        // Moving up — check top edge
        if (isSolid(level, x + 1, newY) || isSolid(level, x + w - 1, newY)) {
            return {
                y: (Math.floor(newY / TILE_SIZE) + 1) * TILE_SIZE + 0.01,
                grounded: false,
            };
        }
    }

    return { y: newY, grounded: false };
}

/**
 * Check for wall contact (for wall sliding/jumping).
 * Returns -1 (wall on left), 0 (no wall), or 1 (wall on right).
 */
export function checkWallContact(level, x, y, w, h) {
    const midY = y + h / 2;

    // Check right side
    if (isSolid(level, x + w + 1, midY)) return 1;

    // Check left side
    if (isSolid(level, x - 1, midY)) return -1;

    return 0;
}
