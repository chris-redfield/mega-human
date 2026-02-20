/**
 * asset-loader.js
 * Loads and caches images and JSON data for the game.
 */

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

    /** Load all assets for a stage (background PNGs + map.json). */
    async loadStage(name) {
        await Promise.all([
            this.loadImage(`${name}_background`, `./assets/${name}_background.png`),
            this.loadImage(`${name}_backwall`, `./assets/${name}_backwall.png`),
            this.loadImage(`${name}_parallax`, `./assets/${name}_parallax.png`),
            this.loadJSON(`${name}_map`, `./assets/${name}_map.json`),
        ]);
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
