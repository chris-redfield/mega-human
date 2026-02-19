/**
 * tile-decoder.js
 * Decodes SNES planar tile formats (2bpp, 4bpp) into indexed pixel arrays.
 *
 * SNES tiles are 8×8 pixels. Pixel data is stored in bitplane-interleaved format:
 *
 * 4bpp (32 bytes per tile):
 *   Bytes  0-1:  Row 0, bitplanes 0 & 1
 *   Bytes  2-3:  Row 1, bitplanes 0 & 1
 *   ...
 *   Bytes 14-15: Row 7, bitplanes 0 & 1
 *   Bytes 16-17: Row 0, bitplanes 2 & 3
 *   Bytes 18-19: Row 1, bitplanes 2 & 3
 *   ...
 *   Bytes 30-31: Row 7, bitplanes 2 & 3
 *
 * 2bpp (16 bytes per tile):
 *   Bytes 0-1:  Row 0, bitplanes 0 & 1
 *   Bytes 2-3:  Row 1, bitplanes 0 & 1
 *   ...
 *   Bytes 14-15: Row 7, bitplanes 0 & 1
 */

/**
 * Decode a single 4bpp tile (32 bytes) into a 64-element array of palette indices (0-15).
 */
export function decodeTile4bpp(romData, offset) {
    const pixels = new Uint8Array(64);

    for (let row = 0; row < 8; row++) {
        const bp0 = romData[offset + row * 2];
        const bp1 = romData[offset + row * 2 + 1];
        const bp2 = romData[offset + 16 + row * 2];
        const bp3 = romData[offset + 16 + row * 2 + 1];

        for (let col = 0; col < 8; col++) {
            const bit = 7 - col;
            const p0 = (bp0 >> bit) & 1;
            const p1 = (bp1 >> bit) & 1;
            const p2 = (bp2 >> bit) & 1;
            const p3 = (bp3 >> bit) & 1;
            pixels[row * 8 + col] = p0 | (p1 << 1) | (p2 << 2) | (p3 << 3);
        }
    }

    return pixels;
}

/**
 * Decode a single 2bpp tile (16 bytes) into a 64-element array of palette indices (0-3).
 */
export function decodeTile2bpp(romData, offset) {
    const pixels = new Uint8Array(64);

    for (let row = 0; row < 8; row++) {
        const bp0 = romData[offset + row * 2];
        const bp1 = romData[offset + row * 2 + 1];

        for (let col = 0; col < 8; col++) {
            const bit = 7 - col;
            const p0 = (bp0 >> bit) & 1;
            const p1 = (bp1 >> bit) & 1;
            pixels[row * 8 + col] = p0 | (p1 << 1);
        }
    }

    return pixels;
}

/**
 * Decode a range of tiles from ROM data.
 * @param {Uint8Array} romData - Raw ROM bytes
 * @param {number} offset - Start offset in ROM
 * @param {number} count - Number of tiles to decode
 * @param {number} bpp - Bits per pixel (2 or 4)
 * @returns {Uint8Array[]} Array of 64-element pixel index arrays
 */
export function decodeTiles(romData, offset, count, bpp) {
    const bytesPerTile = bpp === 4 ? 32 : 16;
    const decodeFn = bpp === 4 ? decodeTile4bpp : decodeTile2bpp;
    const tiles = [];

    for (let i = 0; i < count; i++) {
        tiles.push(decodeFn(romData, offset + i * bytesPerTile));
    }

    return tiles;
}
