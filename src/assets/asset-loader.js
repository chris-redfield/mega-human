/**
 * asset-loader.js
 * Loads and caches decoded tile graphics from ROM data.
 * Creates SpriteSheet objects ready for rendering.
 */

import { loadRomFromHexDump, loadRomFromBinary } from '../rom/hex-parser.js';
import { decodeTiles } from '../rom/tile-decoder.js';
import { decodePalette } from '../rom/palette-decoder.js';
import { SpriteSheet } from '../engine/renderer.js';

// Asset definitions from ROM analysis
const ASSETS = {
    palettes: {
        sprites: { offset: 0x2BE00 },
        stage:   { offset: 0x2D600 },
    },
    tilesets: {
        bg_terrain: { offset: 0x158000, count: 512, bpp: 4 },
        sprites_a:  { offset: 0x15A000, count: 512, bpp: 4 },
        sprites_b:  { offset: 0x164000, count: 512, bpp: 4 },
        player:     { offset: 0x168000, count: 512, bpp: 4 },
    },
};

export class AssetLoader {
    constructor() {
        this.rom = null;
        this.palettes = {};      // name -> array of 16 sub-palettes (each 16 colors)
        this.tilePixels = {};    // name -> array of Uint8Array (64 pixels each)
        this.spriteSheets = {};  // "tileset:palette:subPal" -> SpriteSheet
        this.images = {};        // name -> HTMLImageElement
    }

    async loadRom(url) {
        this.rom = await loadRomFromBinary(url);
        this._decodePalettes();
        this._decodeTilesets();
    }

    async loadRomHex(url) {
        this.rom = await loadRomFromHexDump(url);
        this._decodePalettes();
        this._decodeTilesets();
    }

    _decodePalettes() {
        for (const [name, def] of Object.entries(ASSETS.palettes)) {
            const subPalettes = [];
            for (let sub = 0; sub < 16; sub++) {
                subPalettes.push(decodePalette(this.rom, def.offset + sub * 32, 16));
            }
            this.palettes[name] = subPalettes;
        }
    }

    _decodeTilesets() {
        for (const [name, def] of Object.entries(ASSETS.tilesets)) {
            this.tilePixels[name] = decodeTiles(this.rom, def.offset, def.count, def.bpp);
        }
        this._patchPlayerLegTiles();
    }

    /**
     * Patch leg tiles into the player tilesheet.
     * Leg tiles (VRAM positions 64, 65, 80, 81) are NOT in the main player
     * tilesheet at 0x168000. They're loaded from ROM $2F:$8D40 (0x178D40)
     * during entity init by a separate mechanism (not the DMA table).
     */
    _patchPlayerLegTiles() {
        const LEG_TILE_OFFSET = 0x178D40;
        const legTiles = decodeTiles(this.rom, LEG_TILE_OFFSET, 4, 4);
        const playerTiles = this.tilePixels['player'];
        if (playerTiles) {
            playerTiles[64] = legTiles[0]; // top-left of 16x16 leg block
            playerTiles[65] = legTiles[1]; // top-right
            playerTiles[80] = legTiles[2]; // bottom-left
            playerTiles[81] = legTiles[3]; // bottom-right
        }
    }

    /**
     * Get a SpriteSheet for a tileset + palette combination.
     * Cached so multiple calls return the same object.
     */
    getSpriteSheet(tilesetName, paletteName, subPaletteIdx, transparent = true) {
        const key = `${tilesetName}:${paletteName}:${subPaletteIdx}:${transparent}`;
        if (!this.spriteSheets[key]) {
            const tiles = this.tilePixels[tilesetName];
            const palette = this.palettes[paletteName][subPaletteIdx];
            if (!tiles || !palette) {
                throw new Error(`Asset not found: tileset=${tilesetName}, palette=${paletteName}, sub=${subPaletteIdx}`);
            }
            this.spriteSheets[key] = new SpriteSheet(tiles, palette, transparent);
        }
        return this.spriteSheets[key];
    }

    /** Load an image from a URL and cache it by name. */
    async loadImage(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    /** Get a cached image by name. */
    getImage(name) {
        return this.images[name] || null;
    }

    /** Get raw palette colors for a specific sub-palette. */
    getPalette(paletteName, subPaletteIdx) {
        return this.palettes[paletteName]?.[subPaletteIdx] || null;
    }
}
