/**
 * asset-loader.js
 * Loads and caches images and JSON data for the game.
 */

// Stages that have custom collision tile maps (avoids 404 requests for stages that don't)
const CUSTOM_COLLISION_STAGES = ['aircraftcarrier', 'crystalmine'];

// Which optional layer assets each stage actually has (avoids 404 requests)
const STAGE_OPTIONAL_LAYERS = {
    highway:         ['parallax', 'foreground'],
    frozentown:      ['parallax', 'foreground'],
    aircraftcarrier: ['parallax', 'foreground'],
    crystalmine:     [],
    weathercontrol:  ['parallax', 'foreground'],
    robotjunkyard:   ['parallax', 'foreground'],
    tower:           ['parallax'],
    sigma2:          ['parallax'],
    volcaniczone:    ['parallax', 'parallax2', 'parallax3'],
    shipyard:        ['parallax'],
};

export class AssetLoader {
    constructor() {
        this.images = {};   // name -> HTMLImageElement
        this.json = {};     // name -> parsed JSON object
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

    /** Load a JSON file from a URL and cache it by name. */
    async loadJSON(name, url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to load JSON: ${url}`);
        const data = await resp.json();
        this.json[name] = data;
        return data;
    }

    /** Load all assets for a stage (background PNGs + map.json + optional custom collision). */
    async loadStage(name) {
        const layers = STAGE_OPTIONAL_LAYERS[name] || [];
        const loads = [
            this.loadImage(`${name}_background`, `./assets/levels/${name}_background.png`),
            this.loadImage(`${name}_backwall`, `./assets/levels/${name}_backwall.png`),
            this.loadJSON(`${name}_map`, `./assets/levels/${name}_map.json`),
        ];
        for (const layer of layers) {
            loads.push(this.loadImage(`${name}_${layer}`, `./assets/levels/${name}_${layer}.png`));
        }
        // Only fetch custom collision for stages that actually have one
        if (CUSTOM_COLLISION_STAGES.includes(name)) {
            loads.push(this.loadJSON(`${name}_collision`, `./assets/levels/${name}_collision.json`));
        }
        await Promise.all(loads);
    }

    /** Get a cached image by name. */
    getImage(name) {
        return this.images[name] || null;
    }

    /** Get cached JSON data by name. */
    getJSON(name) {
        return this.json[name] || null;
    }
}
