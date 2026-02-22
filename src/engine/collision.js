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
    if (dx === 0) return newX;

    const checkX = dx > 0 ? newX + w : newX;
    const snapX = dx > 0
        ? Math.floor(checkX / TILE_SIZE) * TILE_SIZE - w - 0.01
        : (Math.floor(checkX / TILE_SIZE) + 1) * TILE_SIZE + 0.01;

    // Check every tile row the entity overlaps (top, middle rows, bottom)
    for (let cy = y + 1; cy < y + h - 1; cy += TILE_SIZE) {
        if (isSolid(level, checkX, cy)) return snapX;
    }
    if (isSolid(level, checkX, y + h - 1)) return snapX;

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
    // Check every tile row the entity overlaps
    for (let cy = y + 1; cy < y + h - 1; cy += TILE_SIZE) {
        if (isSolid(level, x + w + 1, cy)) return 1;
        if (isSolid(level, x - 1, cy)) return -1;
    }
    if (isSolid(level, x + w + 1, y + h - 1)) return 1;
    if (isSolid(level, x - 1, y + h - 1)) return -1;

    return 0;
}
