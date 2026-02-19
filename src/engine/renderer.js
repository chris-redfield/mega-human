/**
 * renderer.js
 * Tile and sprite rendering using pre-rendered offscreen canvases for performance.
 */

import { tileToImageData } from '../rom/palette-decoder.js';

/**
 * Pre-render decoded tiles into offscreen canvases for fast drawImage() calls.
 */
export class SpriteSheet {
    /**
     * @param {Uint8Array[]} tiles - Array of 64-element pixel index arrays
     * @param {Array<{r,g,b,a}>} palette - Color palette
     * @param {boolean} transparent - Treat palette index 0 as transparent
     */
    constructor(tiles, palette, transparent = true) {
        this.tileCanvases = tiles.map(pixels => {
            const c = document.createElement('canvas');
            c.width = 8;
            c.height = 8;
            const ctx = c.getContext('2d');
            const imgData = tileToImageData(pixels, palette, transparent);
            ctx.putImageData(imgData, 0, 0);
            return c;
        });
    }

    /**
     * Draw a single 8×8 tile to the canvas.
     */
    drawTile(ctx, tileIndex, x, y, flipH = false, flipV = false) {
        if (tileIndex < 0 || tileIndex >= this.tileCanvases.length) return;

        const tile = this.tileCanvases[tileIndex];
        if (flipH || flipV) {
            ctx.save();
            ctx.translate(flipH ? x + 8 : x, flipV ? y + 8 : y);
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
            ctx.drawImage(tile, 0, 0);
            ctx.restore();
        } else {
            ctx.drawImage(tile, x, y);
        }
    }
}

/**
 * Render a tilemap layer with camera offset.
 * Only draws tiles visible within the viewport.
 */
export function renderTilemap(ctx, camera, tilemap, spriteSheet, tileSize = 16) {
    const tilesPerRow = tileSize / 8; // 16px tiles = 2×2 sub-tiles
    const startCol = Math.floor(camera.x / tileSize);
    const startRow = Math.floor(camera.y / tileSize);
    const endCol = startCol + Math.ceil(256 / tileSize) + 1;
    const endRow = startRow + Math.ceil(224 / tileSize) + 1;

    for (let row = startRow; row < endRow && row < tilemap.height; row++) {
        for (let col = startCol; col < endCol && col < tilemap.width; col++) {
            const entry = tilemap.get(col, row);
            if (!entry || entry.tile === 0) continue;

            const screenX = Math.floor(col * tileSize - camera.x);
            const screenY = Math.floor(row * tileSize - camera.y);

            spriteSheet.drawTile(ctx, entry.tile, screenX, screenY, entry.flipH, entry.flipV);
        }
    }
}

/**
 * Draw a colored rectangle (placeholder for entities without sprites).
 */
export function drawRect(ctx, x, y, w, h, color, camera) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x - camera.x), Math.floor(y - camera.y), w, h);
}

/**
 * Draw a metasprite (multiple tiles composing a larger sprite).
 * @param {CanvasRenderingContext2D} ctx
 * @param {SpriteSheet} sheet
 * @param {Array<{tileIdx, offsetX, offsetY, flipH, flipV}>} frames - Tile layout
 * @param {number} x - World X position
 * @param {number} y - World Y position
 * @param {boolean} mirrorH - Mirror the entire metasprite horizontally
 * @param {object} camera
 */
export function drawMetasprite(ctx, sheet, frames, x, y, mirrorH, camera) {
    const screenX = Math.floor(x - camera.x);
    const screenY = Math.floor(y - camera.y);

    for (const frame of frames) {
        const fx = mirrorH ? -frame.offsetX - 8 : frame.offsetX;
        const fFlipH = mirrorH ? !frame.flipH : frame.flipH;
        sheet.drawTile(ctx, frame.tileIdx, screenX + fx, screenY + frame.offsetY, fFlipH, frame.flipV);
    }
}
