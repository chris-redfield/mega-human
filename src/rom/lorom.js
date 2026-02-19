/**
 * lorom.js
 * LoROM address mapping utilities.
 *
 * LoROM layout: each 32KB ROM segment maps to $8000-$FFFF of a SNES bank.
 *   SNES $00-$3F:$8000-$FFFF  →  ROM offset = bank * 0x8000 + (addr - 0x8000)
 *   SNES $80-$BF:$8000-$FFFF  →  ROM offset = (bank - 0x80) * 0x8000 + (addr - 0x8000)
 *   (FastROM mirrors)
 */

/**
 * Convert a SNES bank:address pair to a ROM file offset.
 */
export function snesAddrToRomOffset(bank, addr) {
    const effectiveBank = bank & 0x7F;
    return effectiveBank * 0x8000 + (addr & 0x7FFF);
}

/**
 * Convert a ROM file offset back to a SNES bank:address pair.
 */
export function romOffsetToSnesAddr(offset) {
    const bank = Math.floor(offset / 0x8000);
    const addr = (offset % 0x8000) + 0x8000;
    return { bank, addr };
}

/**
 * Read a 16-bit little-endian word from a byte array.
 */
export function readWord(data, offset) {
    return data[offset] | (data[offset + 1] << 8);
}

/**
 * Read a 24-bit little-endian long address from a byte array.
 */
export function readLong(data, offset) {
    return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}
