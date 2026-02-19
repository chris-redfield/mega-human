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

