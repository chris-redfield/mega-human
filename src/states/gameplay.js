/**
 * gameplay.js
 * Main gameplay state — handles player, level, camera, and rendering.
 * Now uses real ROM tiles for backgrounds and sprites.
 */

import { Camera, SCREEN_W, SCREEN_H } from '../engine/camera.js';
import { Player } from '../entities/player.js';
import { createTestLevel } from '../levels/level.js';

export class GameplayState {
    constructor(assets) {
        this.assets = assets; // AssetLoader instance
        this.player = null;
        this.level = null;
        this.camera = null;
        this.bgSheet = null;   // background tile spritesheet
        this.spriteImage = null; // player spritesheet PNG
    }

    init(game) {
        this.level = createTestLevel();
        this.camera = new Camera(this.level.width, this.level.height);

        // Build background sprite sheet from ROM data
        this.bgSheet = this.assets.getSpriteSheet('bg_terrain', 'sprites', 0, false);

        // Load player spritesheet image
        this.spriteImage = this.assets.getImage('playerSprite');

        // Assign visual tile indices to level collision tiles
        this._assignVisualTiles();

        // Spawn player
        this.player = new Player(48, this.level.height - 80);
        this.player.spriteImage = this.spriteImage;

        // Expose on game object
        game.level = this.level;
        game.camera = this.camera;
    }

    _assignVisualTiles() {
        // Map collision tile types to ROM tile indices for rendering
        // Each 16x16 tile is drawn as 4 8x8 tiles (tl, tr, bl, br)
        // Using tiles from the bg_terrain tileset that look like solid ground
        this.level.visualTiles = {
            // Solid block: use terrain tiles (picks from visible tiles in the ROM)
            1: {
                // Several tile groups that form distinct 16x16 blocks
                variants: [
                    { tl: 0, tr: 1, bl: 16, br: 17 },     // Terrain variant A
                    { tl: 2, tr: 3, bl: 18, br: 19 },     // Terrain variant B
                    { tl: 4, tr: 5, bl: 20, br: 21 },     // Terrain variant C
                ],
                // Top edge variants (grass/surface)
                topEdge: { tl: 8, tr: 9, bl: 24, br: 25 },
            },
            // Spike: use distinctive tiles
            3: {
                variants: [{ tl: 32, tr: 33, bl: 48, br: 49 }],
            },
        };
    }

    update(game) {
        this.player.update(game);
        this.camera.follow(this.player);
    }

    render(ctx, game) {
        // Background: parallax sky gradient
        this._renderSky(ctx);

        // Render level tiles using ROM graphics
        this._renderLevel(ctx);

        // Render player
        this.player.render(ctx, this.camera);

        // Render HUD
        this._renderHUD(ctx);
    }

    _renderSky(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
        grad.addColorStop(0, '#0a0a2e');
        grad.addColorStop(0.6, '#1a1a4e');
        grad.addColorStop(1, '#2a1a3e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        // Parallax stars (subtle background detail)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const scrollX = this.camera.x * 0.1;
        for (let i = 0; i < 30; i++) {
            const sx = ((i * 73 + 17) % 300 - scrollX) % 300;
            const sy = (i * 47 + 11) % SCREEN_H;
            const size = (i % 3 === 0) ? 2 : 1;
            ctx.fillRect(sx < 0 ? sx + 300 : sx, sy, size, size);
        }
    }

    _renderLevel(ctx) {
        const cam = this.camera;
        const level = this.level;
        const ts = level.tileSize;
        const sheet = this.bgSheet;
        const vis = level.visualTiles;

        const startCol = Math.floor(cam.x / ts);
        const startRow = Math.floor(cam.y / ts);
        const endCol = Math.min(startCol + Math.ceil(SCREEN_W / ts) + 2, level.widthInTiles);
        const endRow = Math.min(startRow + Math.ceil(SCREEN_H / ts) + 2, level.heightInTiles);

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tile = level.getTile(col, row);
                if (tile === 0) continue;

                const sx = Math.floor(col * ts - cam.x);
                const sy = Math.floor(row * ts - cam.y);

                const tileDef = vis[tile];
                if (tileDef && sheet) {
                    // Check if this is a top-edge tile (air above)
                    const isTopEdge = tileDef.topEdge && (row === 0 || level.getTile(col, row - 1) === 0);
                    const variantIdx = (col + row * 3) % (tileDef.variants?.length || 1);
                    const variant = isTopEdge ? tileDef.topEdge : (tileDef.variants?.[variantIdx] || tileDef.variants?.[0]);

                    if (variant) {
                        // Draw 2x2 grid of 8x8 tiles to fill the 16x16 space
                        sheet.drawTile(ctx, variant.tl, sx, sy);
                        sheet.drawTile(ctx, variant.tr, sx + 8, sy);
                        sheet.drawTile(ctx, variant.bl, sx, sy + 8);
                        sheet.drawTile(ctx, variant.br, sx + 8, sy + 8);
                    }
                } else {
                    // Fallback: colored rectangle
                    ctx.fillStyle = tile === 3 ? '#ff4444' : '#334466';
                    ctx.fillRect(sx, sy, ts, ts);
                }
            }
        }
    }

    _renderHUD(ctx) {
        const player = this.player;

        // Health bar background
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 8, 52, 10);

        // Health bar fill
        const hpPercent = player.hp / player.maxHp;
        const hpColor = hpPercent > 0.5 ? '#00cc44' : hpPercent > 0.25 ? '#cccc00' : '#cc0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(9, 9, Math.floor(50 * hpPercent), 8);

        // Health bar border
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(8.5, 8.5, 51, 9);

        // State debug text
        ctx.fillStyle = '#888';
        ctx.font = '8px monospace';
        ctx.fillText(`${player.state} vx:${player.vx.toFixed(1)} vy:${player.vy.toFixed(1)}`, 8, SCREEN_H - 8);
    }
}
