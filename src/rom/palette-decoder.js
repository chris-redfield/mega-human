/**
 * palette-decoder.js
 * Converts SNES 15-bit BGR color data to RGBA for Canvas rendering.
 *
 * SNES color word (16-bit little-endian):
 *   Bit layout: 0BBBBBGG GGGRRRRR
 *   Each channel is 5 bits (0-31).
 */

/**
 * Convert a single SNES 15-bit color word to an RGBA object.
 */
export function snesColorToRGBA(word) {
    const r5 = word & 0x1F;
    const g5 = (word >> 5) & 0x1F;
    const b5 = (word >> 10) & 0x1F;

    // Scale 5-bit (0-31) to 8-bit (0-255) with proper rounding
    return {
        r: (r5 << 3) | (r5 >> 2),
        g: (g5 << 3) | (g5 >> 2),
        b: (b5 << 3) | (b5 >> 2),
        a: 255,
    };
}

/**
 * Decode a palette (array of SNES color words) from ROM data.
 * @param {Uint8Array} romData - Raw ROM bytes
 * @param {number} offset - Start offset in ROM
 * @param {number} numColors - Number of colors to decode
 * @returns {Array<{r,g,b,a}>} Array of RGBA color objects
 */
export function decodePalette(romData, offset, numColors) {
    const colors = [];

    for (let i = 0; i < numColors; i++) {
        const lo = romData[offset + i * 2];
        const hi = romData[offset + i * 2 + 1];
        const word = lo | (hi << 8);
        colors.push(snesColorToRGBA(word));
    }

    return colors;
}

/**
 * Generate a default grayscale palette for viewing tiles without known palette data.
 * Useful for the tile viewer tool.
 * @param {number} numColors - Number of colors (4 for 2bpp, 16 for 4bpp)
 * @returns {Array<{r,g,b,a}>}
 */
export function generateGrayscalePalette(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const v = Math.round((i / (numColors - 1)) * 255);
        colors.push({ r: v, g: v, b: v, a: 255 });
    }
    return colors;
}

/**
 * Render a decoded tile (pixel index array) to an ImageData using a palette.
 * Palette index 0 is treated as transparent for sprites.
 * @param {Uint8Array} pixels - 64-element array of palette indices
 * @param {Array<{r,g,b,a}>} palette - Color palette
 * @param {boolean} transparent - If true, index 0 is transparent
 * @returns {ImageData}
 */
export function tileToImageData(pixels, palette, transparent = true) {
    const imageData = new ImageData(8, 8);
    const data = imageData.data;

    for (let i = 0; i < 64; i++) {
        const cidx = pixels[i];
        const color = palette[cidx] || { r: 0, g: 0, b: 0, a: 255 };
        const off = i * 4;
        data[off] = color.r;
        data[off + 1] = color.g;
        data[off + 2] = color.b;
        data[off + 3] = (transparent && cidx === 0) ? 0 : color.a;
    }

    return imageData;
}
