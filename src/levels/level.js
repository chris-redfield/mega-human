/**
 * level.js
 * Level data: tile grid, collision, and entity spawns.
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

        // Collision grid: 0 = empty, 1 = solid, 2 = one-way platform, 3 = spike
        this.collision = new Uint8Array(widthInTiles * heightInTiles);

        // Visual tilemap (for rendering, separate from collision)
        this.tilemap = null;
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
 * Generate a test level for development.
 * A classic platformer test layout with floor, walls, platforms, and gaps.
 */
export function createTestLevel() {
    const W = 80;  // tiles wide (80 * 16 = 1280px)
    const H = 15;  // tiles tall (15 * 16 = 240px, slightly taller than screen)

    const level = new Level(W, H, 16);

    // Fill floor (bottom 2 rows)
    for (let x = 0; x < W; x++) {
        level.setTile(x, H - 1, 1);
        level.setTile(x, H - 2, 1);
    }

    // Left wall
    for (let y = 0; y < H; y++) {
        level.setTile(0, y, 1);
    }

    // Right wall
    for (let y = 0; y < H; y++) {
        level.setTile(W - 1, y, 1);
    }

    // Gap in the floor (jump challenge)
    for (let x = 12; x < 16; x++) {
        level.setTile(x, H - 1, 0);
        level.setTile(x, H - 2, 0);
    }

    // Floating platforms at various heights
    // Platform 1: low
    for (let x = 18; x < 23; x++) level.setTile(x, H - 5, 1);

    // Platform 2: medium height
    for (let x = 25; x < 29; x++) level.setTile(x, H - 7, 1);

    // Platform 3: high
    for (let x = 31; x < 34; x++) level.setTile(x, H - 9, 1);

    // Wall for wall-jumping
    for (let y = 3; y < H - 2; y++) {
        level.setTile(37, y, 1);
    }
    for (let y = 3; y < H - 2; y++) {
        level.setTile(40, y, 1);
    }

    // Stairs
    for (let i = 0; i < 6; i++) {
        for (let x = 44 + i; x < 44 + i + 2; x++) {
            level.setTile(x, H - 3 - i, 1);
        }
    }

    // Another gap
    for (let x = 55; x < 58; x++) {
        level.setTile(x, H - 1, 0);
        level.setTile(x, H - 2, 0);
    }

    // Tunnel section (ceiling + floor with gap)
    for (let x = 60; x < 75; x++) {
        level.setTile(x, H - 6, 1); // ceiling
    }

    // Pillars in tunnel
    for (let y = H - 5; y < H - 2; y++) {
        level.setTile(65, y, 1);
        level.setTile(70, y, 1);
    }

    return level;
}
