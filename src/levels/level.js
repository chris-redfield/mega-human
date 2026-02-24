/**
 * level.js
 * Level data: tile grid, collision, and entity spawns.
 * Supports loading from MMX-Deathmatch map.json files.
 */

export class Level {
    /**
     * @param {number} widthInTiles - Width in tile units
     * @param {number} heightInTiles - Height in tile units
     * @param {number} tileSize - Pixel size of each tile
     */
    constructor(widthInTiles, heightInTiles, tileSize = 16) {
        this.widthInTiles = widthInTiles;
        this.heightInTiles = heightInTiles;
        this.tileSize = tileSize;
        this.width = widthInTiles * tileSize;
        this.height = heightInTiles * tileSize;

        // Collision grid: 0 = empty, 1 = solid
        this.collision = new Uint8Array(widthInTiles * heightInTiles);

        // Kill zones — rectangular regions that instantly kill the player
        this.killZones = [];

        // Fallback killY for stages without explicit kill zones (below map = death)
        this.killY = this.height + 100;

        // Spawn points extracted from map data
        this.spawnPoints = [];

        // Health pickup positions from map instances
        this.healthPickups = [];

        // Slope segments extracted from collision polygons (diagonal ground edges)
        this.slopeSegments = [];

        // Debug: collision shape metadata (name + bounding box) for overlay labels
        this.collisionShapes = [];
    }

    /** Get collision value at tile coordinates. */
    getTile(col, row) {
        if (col < 0 || row < 0 || col >= this.widthInTiles || row >= this.heightInTiles) {
            return 1; // Out of bounds = solid
        }
        return this.collision[row * this.widthInTiles + col];
    }

    /** Set collision value at tile coordinates. */
    setTile(col, row, value) {
        if (col < 0 || row < 0 || col >= this.widthInTiles || row >= this.heightInTiles) return;
        this.collision[row * this.widthInTiles + col] = value;
    }
}

/**
 * Point-in-polygon test using ray casting algorithm.
 * Works for non-convex polygons.
 * @param {number} px - Test point X
 * @param {number} py - Test point Y
 * @param {number[][]} polygon - Array of [x, y] pairs
 * @returns {boolean}
 */
function pointInPolygon(px, py, polygon) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        if (((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Create a Level from MMX-Deathmatch map.json data.
 * If customCollision is provided, uses that instead of polygon rasterization.
 * Otherwise rasterizes "Collision Shape" instances onto a 16x16 tile grid.
 * (mergedWalls is for AI pathfinding only — not used for collision.)
 * @param {object} mapData - Parsed map.json
 * @param {object} [customCollision] - Optional custom collision tile data
 *   { tiles: [[col, row], ...], tileSize: 16, width: N, height: N }
 * @returns {Level}
 */
export function createLevelFromMap(mapData, customCollision) {
    // Custom collision may specify a different tile size (e.g. 8 for finer precision)
    const tileSize = (customCollision && customCollision.tileSize) || 16;
    const widthInTiles = Math.ceil(mapData.width / tileSize);
    // Extend height slightly beyond visual area to include pit collision walls
    const maxY = Math.max(mapData.height, mapData.killY || mapData.height);
    const heightInTiles = Math.ceil(maxY / tileSize);

    const level = new Level(widthInTiles, heightInTiles, tileSize);

    // Parse instances for non-collision data (kill zones, spawns, pickups)
    // and collision shapes (only if no custom collision provided)
    if (mapData.instances) {
        for (const inst of mapData.instances) {
            if (inst.objectName === 'Kill Zone' && inst.points && inst.points.length >= 2) {
                const xs = inst.points.map(p => p.x);
                const ys = inst.points.map(p => p.y);
                level.killZones.push({
                    x: Math.min(...xs),
                    y: Math.min(...ys),
                    w: Math.max(...xs) - Math.min(...xs),
                    h: Math.max(...ys) - Math.min(...ys),
                });
            } else if (inst.objectName === 'Collision Shape' && inst.points && inst.points.length >= 3) {
                // Store shape metadata for debug overlay (always)
                const xs = inst.points.map(p => p.x);
                const ys = inst.points.map(p => p.y);
                level.collisionShapes.push({
                    name: inst.name || inst.objectName,
                    x: Math.min(...xs),
                    y: Math.min(...ys),
                });
                const polygon = inst.points.map(p => [p.x, p.y]);
                const hasSlope = _polygonHasSlopeEdge(polygon);

                // Always extract slope segments from polygons that have them
                if (hasSlope) {
                    _extractSlopeSegments(level, polygon, inst.name || inst.objectName);
                }

                // Rasterize only if no custom collision (slope polygons are rasterized too —
                // staircase tiles at the surface are cleared by _clearSlopeTiles and handled
                // at runtime by resolveSlopeHorizontal; this preserves solid ground below slopes)
                if (!customCollision) {
                    _rasterizePolygon(level, polygon, tileSize, widthInTiles, heightInTiles);
                }
            } else if (inst.objectName === 'Spawn Point' && inst.pos) {
                level.spawnPoints.push({ x: inst.pos.x, y: inst.pos.y });
            } else if (inst.objectName === 'Large Health' && inst.pos) {
                level.healthPickups.push({ x: inst.pos.x, y: inst.pos.y, size: 'large' });
            } else if (inst.objectName === 'Small Health' && inst.pos) {
                level.healthPickups.push({ x: inst.pos.x, y: inst.pos.y, size: 'small' });
            }
        }
    }

    // Apply custom collision tile data if provided
    if (customCollision && customCollision.tiles) {
        for (const [col, row] of customCollision.tiles) {
            level.setTile(col, row, 1);
        }
    }

    // Fallback killY from explicit property (highway uses this)
    level.killY = mapData.killY || (mapData.height + 100);

    // Clear staircase tiles under slope segments (from both rasterized and custom collision)
    if (level.slopeSegments.length > 0) {
        _clearSlopeTiles(level);
    }

    return level;
}

/**
 * Compute signed area of a polygon. Positive = CCW, negative = CW.
 */
function _signedArea(polygon) {
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += polygon[i][0] * polygon[j][1];
        area -= polygon[j][0] * polygon[i][1];
    }
    return area / 2;
}

/**
 * Check if an edge (a→b) is a ground slope: not axis-aligned, outward normal points up.
 * Uses polygon winding to determine outward normal direction.
 * @param {number[]} a - [x, y] start
 * @param {number[]} b - [x, y] end
 * @param {number} windingSign - +1 for CCW, -1 for CW
 */
function _isGroundSlopeEdge(a, b, windingSign) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    // Skip axis-aligned edges
    if (dx === 0 || dy === 0) return false;
    // Outward normal: for CCW winding, outward normal of edge (dx,dy) is (dy, -dx)
    // For CW winding, outward normal is (-dy, dx)
    let nx, ny;
    if (windingSign > 0) {
        // CCW
        nx = dy;
        ny = -dx;
    } else {
        // CW
        nx = -dy;
        ny = dx;
    }
    // Ground slope: normal points upward (ny < 0) and is more vertical than horizontal
    return ny < 0 && Math.abs(ny) > Math.abs(nx);
}

/**
 * Check if a polygon has any ground slope edges.
 */
function _polygonHasSlopeEdge(polygon) {
    const area = _signedArea(polygon);
    if (Math.abs(area) < 1) return false;
    const windingSign = area > 0 ? 1 : -1;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (_isGroundSlopeEdge(polygon[i], polygon[j], windingSign)) {
            return true;
        }
    }
    return false;
}

/**
 * Extract ground slope segments from a polygon and add to level.slopeSegments.
 * Each segment: { x1, y1, x2, y2, slope, shapeName } with x1 < x2.
 */
function _extractSlopeSegments(level, polygon, shapeName) {
    const area = _signedArea(polygon);
    if (Math.abs(area) < 1) return;
    const windingSign = area > 0 ? 1 : -1;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (_isGroundSlopeEdge(polygon[i], polygon[j], windingSign)) {
            let [x1, y1] = polygon[i];
            let [x2, y2] = polygon[j];
            // Ensure x1 < x2
            if (x1 > x2) {
                [x1, y1, x2, y2] = [x2, y2, x1, y1];
            }
            const dx = x2 - x1;
            const slope = (y2 - y1) / dx;
            level.slopeSegments.push({ x1, y1, x2, y2, slope, shapeName });
        }
    }
}

/**
 * Clear staircase tiles at the slope surface.
 * For each column in the slope range, clears tiles that poke above the slope
 * surface (the "step" tiles). Tiles whose top edge is at or below the slope
 * surface are ground tiles and are preserved.
 * X is clamped to the slope endpoints to prevent extrapolation from clearing
 * ground tiles beyond the slope (e.g. at the bottom of a downhill slope).
 */
function _clearSlopeTiles(level) {
    const ts = level.tileSize;
    for (const seg of level.slopeSegments) {
        const startCol = Math.max(0, Math.floor(seg.x1 / ts));
        const endCol = Math.min(level.widthInTiles - 1, Math.floor(seg.x2 / ts));

        for (let col = startCol; col <= endCol; col++) {
            const cx = col * ts + ts / 2;
            const clampedX = Math.max(seg.x1, Math.min(seg.x2, cx));
            const slopeY = seg.y1 + seg.slope * (clampedX - seg.x1);
            const slopeRow = Math.floor(slopeY / ts);
            // Only clear above the surface row — the surface row itself is
            // handled at runtime by resolveSlopeHorizontal's skip margin.
            // Clearing the surface row would remove ground tiles at slope endpoints.
            if (slopeRow - 1 >= 0) {
                level.setTile(col, slopeRow - 1, 0);
            }
        }
    }
}

/**
 * Rasterize a polygon onto the tile grid, marking covered tiles as solid.
 */
function _rasterizePolygon(level, polygon, tileSize, widthInTiles, heightInTiles) {
    let minX = Infinity, minY = Infinity, maxPX = -Infinity, maxPY = -Infinity;
    for (const pt of polygon) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxPX) maxPX = pt[0];
        if (pt[1] > maxPY) maxPY = pt[1];
    }

    const startCol = Math.max(0, Math.floor(minX / tileSize));
    const endCol = Math.min(widthInTiles - 1, Math.floor(maxPX / tileSize));
    const startRow = Math.max(0, Math.floor(minY / tileSize));
    const endRow = Math.min(heightInTiles - 1, Math.floor(maxPY / tileSize));

    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const cx = col * tileSize + tileSize / 2;
            const cy = row * tileSize + tileSize / 2;
            if (pointInPolygon(cx, cy, polygon)) {
                level.setTile(col, row, 1);
            }
        }
    }
}
