/**
 * collision.js
 * Tile-based AABB collision resolution for platformer physics.
 * Tile size is read from level.tileSize (default 16, custom maps may use 8).
 */

/**
 * Check if a point falls on a solid tile.
 * @param {object} level - Level object with getTile(col, row) and tileSize
 * @param {number} x - World X position
 * @param {number} y - World Y position
 * @returns {boolean}
 */
export function isSolid(level, x, y) {
    const ts = level.tileSize;
    const col = Math.floor(x / ts);
    const row = Math.floor(y / ts);
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
    const ts = level.tileSize;
    const newX = x + dx;
    if (dx === 0) return newX;

    const checkX = dx > 0 ? newX + w : newX;
    const snapX = dx > 0
        ? Math.floor(checkX / ts) * ts - w - 0.01
        : (Math.floor(checkX / ts) + 1) * ts + 0.01;

    // Check every tile row the entity overlaps (top, middle rows, bottom)
    for (let cy = y + 1; cy < y + h - 1; cy += ts) {
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
    const ts = level.tileSize;
    const newY = y + dy;

    if (dy > 0) {
        // Moving down — check bottom edge
        const bottom = newY + h;
        if (isSolid(level, x + 1, bottom) || isSolid(level, x + w - 1, bottom)) {
            return {
                y: Math.floor(bottom / ts) * ts - h - 0.01,
                grounded: true,
            };
        }
    } else if (dy < 0) {
        // Moving up — check top edge
        if (isSolid(level, x + 1, newY) || isSolid(level, x + w - 1, newY)) {
            return {
                y: (Math.floor(newY / ts) + 1) * ts + 0.01,
                grounded: false,
            };
        }
    }

    return { y: newY, grounded: false };
}

/**
 * Slope-aware horizontal resolution for the player.
 * Same as resolveHorizontal but allows passage through tiles that are at or
 * below a slope surface at the leading edge.
 *
 * On the slope itself: skips tiles within 2px of the slope surface (slope body).
 * At transition zones (beyond slope endpoints): skips tiles for the full body
 * height so the player can walk through the wall tiles at slope/flat junctions
 * without needing to clear them.
 */
export function resolveSlopeHorizontal(level, x, y, w, h, dx) {
    const ts = level.tileSize;
    const newX = x + dx;
    if (dx === 0) return newX;

    const checkX = dx > 0 ? newX + w : newX;
    const snapX = dx > 0
        ? Math.floor(checkX / ts) * ts - w - 0.01
        : (Math.floor(checkX / ts) + 1) * ts + 0.01;

    // Find slope surface Y at the leading edge X.
    // Extend range by hitbox width beyond slope endpoints for smooth transitions.
    let slopeY = null;
    let inTransition = false;
    const feetY = y + h;
    for (const seg of level.slopeSegments) {
        if (checkX >= seg.x1 - w && checkX <= seg.x2 + w) {
            const clampedX = Math.max(seg.x1, Math.min(seg.x2, checkX));
            const sy = seg.y1 + seg.slope * (clampedX - seg.x1);
            // Pick the slope closest to player's feet
            if (slopeY === null || Math.abs(sy - feetY) < Math.abs(slopeY - feetY)) {
                slopeY = sy;
                inTransition = checkX < seg.x1 || checkX > seg.x2;
            }
        }
    }

    // Only apply slope skip logic when player's feet are near the slope surface.
    // Without this, any player in the slope's X range (even far below) gets
    // wall collision disabled — causing massive clipping on large slopes.
    if (slopeY !== null && Math.abs(feetY - slopeY) > ts * 2) {
        slopeY = null;
    }

    // At transitions (beyond slope endpoints), skip tiles across the full body
    // height so the player can step through the wall of tiles at the junction.
    // This is safe because the vertical proximity check above already nullifies
    // slopeY when the player is far from the slope surface.
    // On the slope itself, skip one tile height to handle staircase tiles at
    // the surface (these are no longer cleared by _clearSlopeTiles to preserve
    // ground tiles at slope endpoints).
    const skipMargin = (slopeY !== null && inTransition) ? h : ts;

    // Check every tile row the entity overlaps (top, middle rows, bottom)
    for (let cy = y + 1; cy < y + h - 1; cy += ts) {
        if (isSolid(level, checkX, cy)) {
            if (slopeY !== null && cy > slopeY - skipMargin) continue;
            return snapX;
        }
    }
    if (isSolid(level, checkX, y + h - 1)) {
        if (slopeY !== null && y + h - 1 > slopeY - skipMargin) {
            // Near slope surface — allow passage
        } else {
            return snapX;
        }
    }

    return newX;
}

/**
 * Get the slope ground Y at a given foot X position.
 * Returns the Y of the slope surface, or null if no slope covers this X.
 * If multiple slopes overlap at this X, returns the highest (smallest Y).
 */
export function getSlopeGroundY(level, footX) {
    let bestY = null;
    for (const seg of level.slopeSegments) {
        if (footX >= seg.x1 && footX <= seg.x2) {
            const slopeY = seg.y1 + seg.slope * (footX - seg.x1);
            if (bestY === null || slopeY < bestY) {
                bestY = slopeY;
            }
        }
    }
    return bestY;
}

/**
 * Slope-aware vertical resolution for the player.
 * Checks slope segments first, falls back to tile-based resolveVertical.
 * Uses proximity check to avoid snapping to distant slopes.
 * @param {object} level - Level with slopeSegments and tile grid
 * @param {number} x - Hitbox left X
 * @param {number} y - Hitbox top Y
 * @param {number} w - Hitbox width
 * @param {number} h - Hitbox height
 * @param {number} dy - Vertical velocity
 * @param {boolean} wasGrounded - Whether player was grounded last frame
 * @returns {{ y: number, grounded: boolean, onSlope: boolean }}
 */
export function resolveSlopeVertical(level, x, y, w, h, dy, wasGrounded, wasOnSlope) {
    if (level.slopeSegments.length === 0) {
        const result = resolveVertical(level, x, y, w, h, dy);
        return { y: result.y, grounded: result.grounded, onSlope: false };
    }

    const newY = y + dy;
    const footX = x + w / 2;
    const feetY = newY + h;
    // Max distance below slope surface to snap (prevents snapping to distant slopes)
    const snapMax = level.tileSize * 2;

    // Find the best slope to snap to (closest one within range)
    let bestSlopeY = null;

    for (const seg of level.slopeSegments) {
        if (footX < seg.x1 || footX > seg.x2) continue;
        const slopeY = seg.y1 + seg.slope * (footX - seg.x1);

        // Moving down or standing: snap if feet just passed through slope surface
        if (dy >= 0 && feetY >= slopeY && feetY - slopeY < snapMax) {
            if (bestSlopeY === null || slopeY > bestSlopeY) {
                bestSlopeY = slopeY; // Pick the lowest qualifying slope (closest to feet)
            }
        }

        // Downhill snap: grounded and feet just above slope surface
        if (wasGrounded && dy >= 0 && feetY < slopeY && slopeY - feetY < 12) {
            if (bestSlopeY === null || slopeY < bestSlopeY) {
                bestSlopeY = slopeY;
            }
        }
    }

    if (bestSlopeY !== null) {
        return {
            y: bestSlopeY - h - 0.01,
            grounded: true,
            onSlope: true,
        };
    }

    // Fall back to tile-based resolution
    const result = resolveVertical(level, x, y, w, h, dy);

    // Slope→flat transition fix: when leaving a slope, the slope surface Y
    // may not align with the tile grid, leaving a small gap. Scan downward
    // for the nearest solid tile and snap to it to prevent micro-drops.
    if (wasOnSlope && !result.grounded && dy >= 0) {
        const ts = level.tileSize;
        const feetY = result.y + h;
        const startRow = Math.floor(feetY / ts);
        const endRow = Math.min(startRow + 2, level.heightInTiles - 1);
        const leftCol = Math.floor((x + 1) / ts);
        const rightCol = Math.floor((x + w - 1) / ts);
        for (let r = startRow; r <= endRow; r++) {
            if (level.getTile(leftCol, r) !== 0 || level.getTile(rightCol, r) !== 0) {
                return {
                    y: r * ts - h - 0.01,
                    grounded: true,
                    onSlope: false,
                };
            }
        }
    }

    return { y: result.y, grounded: result.grounded, onSlope: false };
}

/**
 * Check for wall contact (for wall sliding/jumping).
 * Returns -1 (wall on left), 0 (no wall), or 1 (wall on right).
 */
export function checkWallContact(level, x, y, w, h) {
    const ts = level.tileSize;
    // Check every tile row the entity overlaps
    for (let cy = y + 1; cy < y + h - 1; cy += ts) {
        if (isSolid(level, x + w + 1, cy)) return 1;
        if (isSolid(level, x - 1, cy)) return -1;
    }
    if (isSolid(level, x + w + 1, y + h - 1)) return 1;
    if (isSolid(level, x - 1, y + h - 1)) return -1;

    return 0;
}
