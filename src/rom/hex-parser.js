/**
 * hex-parser.js
 * Parses xxd hex dump text into a Uint8Array of raw ROM bytes.
 *
 * xxd format per line:
 *   ADDR: XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX  ASCII
 *   e.g. "00007fc0: 4d45 4741 4741 4d45 2032 3032 3620 2020  MEGAGAME 2026   "
 */

export function parseXxdHexDump(text) {
    const lines = text.split('\n');
    // Pre-allocate for a 1.5MB ROM (can grow if needed)
    let romSize = 0;
    const chunks = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const addr = parseInt(line.substring(0, colonIdx), 16);

        // Extract hex portion: between colon+1 and the double-space before ASCII
        // The ASCII section starts after two consecutive spaces following hex data
        const afterColon = line.substring(colonIdx + 1).trimStart();
        // Find where ASCII representation begins (two spaces after hex block)
        const asciiSep = afterColon.indexOf('  ');
        const hexPart = asciiSep !== -1
            ? afterColon.substring(0, asciiSep)
            : afterColon;

        // Remove all spaces from hex portion and parse byte pairs
        const hex = hexPart.replace(/\s/g, '');
        const byteCount = hex.length >> 1;
        const bytes = new Uint8Array(byteCount);

        for (let j = 0; j < byteCount; j++) {
            bytes[j] = parseInt(hex.substring(j * 2, j * 2 + 2), 16);
        }

        chunks.push({ addr, bytes });
        const end = addr + byteCount;
        if (end > romSize) romSize = end;
    }

    // Assemble into a single contiguous buffer
    const rom = new Uint8Array(romSize);
    for (const chunk of chunks) {
        rom.set(chunk.bytes, chunk.addr);
    }

    return rom;
}

/**
 * Fetch the hex dump file and parse it into a ROM byte array.
 * Works in browser via fetch().
 */
export async function loadRomFromHexDump(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parseXxdHexDump(text);
}

/**
 * Fetch a raw ROM binary file directly into a Uint8Array.
 * Much faster than parsing an xxd hex dump.
 */
export async function loadRomFromBinary(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}
