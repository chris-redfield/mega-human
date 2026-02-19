/**
 * sprite-frames.js
 * Player character metasprite frame definitions.
 * AUTO-GENERATED from ROM data by analysis/generate_sprite_data.py
 *
 * Uses the DMA tile remapping model:
 * - Full 512-tile player tilesheet loaded from ROM 0x168000
 * - Fixed 4-block OAM layout (head, ubodyL, ubodyR, legs)
 * - Per-def DMA remaps VRAM tiles 0-31 to different tilesheet positions
 * - Legs (VRAM tile 64+) never change
 */

const VRAM_COLS = 16;

// ============================================================
// FIXED BLOCK LAYOUT (same for all frames)
// ============================================================
// Each block: 16x16 pixels = 4 tiles in 2x2 pattern
// vramBase: top-left VRAM tile index
// Tiles: [vramBase, vramBase+1, vramBase+16, vramBase+17]
const BLOCK_LAYOUT = [
    { x: 16, y:  2, vramBase:  0 }, // head (tiles [0, 1, 16, 17])
    { x: 12, y: 16, vramBase:  4 }, // ubodyL (tiles [4, 5, 20, 21])
    { x: 20, y: 16, vramBase:  6 }, // ubodyR (tiles [6, 7, 22, 23])
    { x: 16, y: 32, vramBase: 64 }, // legs (tiles [64, 65, 80, 81])
];

// ============================================================
// PER-DEF TILE REMAPS (VRAM tile → tilesheet tile)
// ============================================================
// Only non-identity mappings are listed.
// For tiles not in the remap, VRAM tile index = tilesheet tile index.
const DEF_REMAPS = {
    0: {}, // 2 DMA entries (identity)
    1: {}, // 2 DMA entries (identity)
    2: {}, // no DMA (uses baseline) (identity)
    3: { 0: 32, 1: 33, 4: 36, 5: 37, 6: 38, 7: 39, 16: 45, 17: 46, 20: 49, 21: 50, 22: 51, 23: 52 }, // 2 DMA entries
    4: { 0: 56, 1: 57, 4: 60, 5: 61, 6: 62, 7: 63, 16: 71, 17: 72, 20: 75, 21: 76, 22: 77, 23: 78 }, // 2 DMA entries
    5: { 0: 84, 1: 85, 4: 88, 5: 89, 6: 90, 7: 91, 16: 100, 17: 101, 20: 104, 21: 105, 22: 106, 23: 107 }, // 2 DMA entries
    6: { 0: 115, 1: 116, 4: 119, 5: 120, 6: 121, 7: 122, 16: 131, 17: 132, 20: 135, 21: 136, 22: 137, 23: 138 }, // 2 DMA entries
    7: { 0: 146, 1: 147, 4: 150, 5: 151, 6: 152, 7: 153, 16: 161, 17: 162, 20: 165, 21: 166, 22: 167, 23: 168 }, // 2 DMA entries
    8: { 0: 175, 1: 176, 4: 179, 5: 180, 6: 181, 7: 182, 16: 190, 17: 191, 20: 194, 21: 195, 22: 196, 23: 197 }, // 2 DMA entries
    9: { 0: 200, 1: 201, 4: 204, 5: 205, 6: 206, 7: 207, 16: 215, 17: 216, 20: 219, 21: 220, 22: 221, 23: 222 }, // 2 DMA entries
    10: { 0: 227, 1: 228, 4: 231, 5: 232, 6: 233, 7: 234, 16: 243, 17: 244, 20: 247, 21: 248, 22: 249, 23: 250 }, // 2 DMA entries
    11: { 0: 259, 1: 260, 4: 263, 5: 264, 6: 265, 7: 266, 16: 275, 17: 276, 20: 279, 21: 280, 22: 281, 23: 282 }, // 3 DMA entries
    12: { 0: 292, 1: 293, 4: 296, 5: 297, 6: 298, 7: 299, 16: 308, 17: 309, 20: 312, 21: 313, 22: 314, 23: 315 }, // 2 DMA entries
    13: { 0: 323, 1: 324, 4: 327, 5: 328, 6: 329, 7: 330, 16: 337, 17: 338, 20: 341, 21: 342, 22: 343, 23: 344 }, // 2 DMA entries
    14: { 0: 349, 1: 350, 4: 353, 5: 354, 6: 355, 7: 356, 16: 365, 17: 366, 20: 369, 21: 370, 22: 371, 23: 372 }, // 2 DMA entries
    15: { 0: 379, 1: 380, 4: 383, 5: 384, 6: 385, 7: 386, 16: 395, 17: 396, 20: 399, 21: 400, 22: 401, 23: 402 }, // 2 DMA entries
    16: { 0: 411, 1: 412, 4: 415, 5: 416, 6: 417, 7: 418, 16: 427, 17: 428, 20: 431, 21: 432, 22: 433, 23: 434 }, // 2 DMA entries
    17: { 0: 442, 1: 443, 4: 446, 5: 447, 6: 448, 7: 449, 16: 458, 17: 459, 20: 462, 21: 463, 22: 464, 23: 465 }, // 2 DMA entries
    18: { 0: 473, 1: 474, 4: 477, 5: 478, 6: 479, 7: 480, 16: 489, 17: 490, 20: 493, 21: 494, 22: 495, 23: 496 }, // 2 DMA entries
};

// ============================================================
// ANIMATION DEFINITIONS (from ROM $2F:D4D6)
// ============================================================
// Each animation: { frames: [{def, duration, hFlip}], loopBack }
// loopBack = number of frames to loop back when reaching the end
const ANIM_DATA = {
    idle: { frames: [{def:  0, dur:  16, hFlip: true}], loopBack: 1 },
    run: { frames: [{def:  1, dur:  16, hFlip: true}], loopBack: 1 },
    jump: { frames: [{def:  2, dur:  16, hFlip: true}], loopBack: 1 },
    fall: { frames: [{def:  3, dur:  16, hFlip: true}], loopBack: 1 },
    wall_slide: { frames: [{def:  4, dur:  16, hFlip: true}], loopBack: 1 },
    dash: { frames: [{def:  5, dur:   2, hFlip: false}, {def:  6, dur:   5, hFlip: false}, {def:  7, dur:   2, hFlip: true}], loopBack: 3 },
    shootStand: { frames: [{def:  5, dur:   2, hFlip: false}, {def: 12, dur:   5, hFlip: false}, {def:  7, dur:   2, hFlip: true}], loopBack: 3 },
    shootRun: {
        frames: [
            {def:  8, dur:   4, hFlip: false},
            {def:  9, dur:   3, hFlip: false},
            {def: 10, dur:   2, hFlip: false},
            {def: 11, dur:   2, hFlip: true},
        ],
        loopBack: 4,
    },
    hurt: { frames: [{def: 13, dur:  16, hFlip: true}], loopBack: 1 },
    chargeFlash: { frames: [{def: 14, dur:  16, hFlip: true}], loopBack: 1 },
    special: {
        frames: [
            {def: 15, dur:   4, hFlip: false},
            {def: 16, dur:   4, hFlip: false},
            {def: 15, dur:   4, hFlip: false},
            {def: 16, dur:   4, hFlip: false},
            {def: 17, dur:   4, hFlip: false},
            {def: 18, dur:   4, hFlip: false},
            {def: 17, dur:   4, hFlip: false},
            {def: 18, dur:   4, hFlip: true},
            {def:  8, dur: 232, hFlip: true},
            {def:  0, dur:   0, hFlip: false},
        ],
        loopBack: -16,
    },
};

// ============================================================
// EXPORTS
// ============================================================

/**
 * Width/height of the metasprite bounding box (for centering/flipping).
 */
export const METASPRITE_WIDTH = 48;
export const METASPRITE_HEIGHT = 48;

/**
 * Pixel offset to center the metasprite on the player hitbox.
 * Hitbox is 14x24, metasprite is ~48x48.
 */
export const METASPRITE_OFFSET_X = -10;
export const METASPRITE_OFFSET_Y = -18;

/**
 * Get the tile remap table for a sprite def index.
 * Returns an object mapping VRAM tile → tilesheet tile.
 */
export function getDefRemap(defIdx) {
    return DEF_REMAPS[defIdx] || {};
}

/**
 * Convert the fixed block layout to tile entries for a given sprite def.
 * Applies the per-def tile remap to get correct tilesheet indices.
 *
 * @param {number} defIdx - Sprite def index (0-18)
 * @returns {Array<{tileIdx, offsetX, offsetY}>} Tile entries for rendering
 */
export function frameToTiles(defIdx) {
    const remap = DEF_REMAPS[defIdx] || {};
    const tiles = [];
    for (const block of BLOCK_LAYOUT) {
        const b = block.vramBase;
        // 16x16 block = 4 tiles: TL, TR, BL, BR
        tiles.push({ tileIdx: remap[b]      ?? b,      offsetX: block.x,     offsetY: block.y });
        tiles.push({ tileIdx: remap[b + 1]  ?? b + 1,  offsetX: block.x + 8, offsetY: block.y });
        tiles.push({ tileIdx: remap[b + 16] ?? b + 16, offsetX: block.x,     offsetY: block.y + 8 });
        tiles.push({ tileIdx: remap[b + 17] ?? b + 17, offsetX: block.x + 8, offsetY: block.y + 8 });
    }
    return tiles;
}

/**
 * Get animation data by state name.
 * Returns { frames: [{def, dur, hFlip}], loopBack }
 */
export function getAnimation(stateName) {
    return ANIM_DATA[stateName] || ANIM_DATA.idle;
}

/**
 * Get all animation names.
 */
export function getAnimationNames() {
    return Object.keys(ANIM_DATA);
}

