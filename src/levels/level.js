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
 * Rasterizes "Collision Shape" instances onto a 16x16 tile grid.
 * (mergedWalls is for AI pathfinding only — not used for collision.)
 * @param {object} mapData - Parsed map.json
 * @returns {Level}
 */
export function createLevelFromMap(mapData) {
    const tileSize = 16;
    const widthInTiles = Math.ceil(mapData.width / tileSize);
    // Extend height slightly beyond visual area to include pit collision walls
    const maxY = Math.max(mapData.height, mapData.killY || mapData.height);
    const heightInTiles = Math.ceil(maxY / tileSize);

    const level = new Level(widthInTiles, heightInTiles, tileSize);

    // Parse instances
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
                // Rasterize collision polygon onto tile grid
                const polygon = inst.points.map(p => [p.x, p.y]);
                _rasterizePolygon(level, polygon, tileSize, widthInTiles, heightInTiles);
            } else if (inst.objectName === 'Spawn Point' && inst.pos) {
                level.spawnPoints.push({ x: inst.pos.x, y: inst.pos.y });
            } else if (inst.objectName === 'Large Health' && inst.pos) {
                level.healthPickups.push({ x: inst.pos.x, y: inst.pos.y, size: 'large' });
            } else if (inst.objectName === 'Small Health' && inst.pos) {
                level.healthPickups.push({ x: inst.pos.x, y: inst.pos.y, size: 'small' });
            }
        }
    }

    // Fallback killY from explicit property (highway uses this)
    level.killY = mapData.killY || (mapData.height + 100);

    return level;
}

/**
 * Rasterize a polygon onto the tile grid, marking covered tiles as solid.
 * Checks center + 4 near-corners so edge tiles aren't missed on thin shapes.
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

    const m = 2; // inset margin from tile edges
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const tx = col * tileSize;
            const ty = row * tileSize;
            if (pointInPolygon(tx + tileSize / 2, ty + tileSize / 2, polygon) ||
                pointInPolygon(tx + m, ty + m, polygon) ||
                pointInPolygon(tx + tileSize - m, ty + m, polygon) ||
                pointInPolygon(tx + m, ty + tileSize - m, polygon) ||
                pointInPolygon(tx + tileSize - m, ty + tileSize - m, polygon)) {
                level.setTile(col, row, 1);
            }
        }
    }
}
