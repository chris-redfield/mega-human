/**
 * stage-select.js
 * Stage select screen — full-screen world map with selectable location dots.
 * Canvas runs at native image resolution (1536×1024), CSS fills viewport.
 * SHOP label is part of the navigation grid (selectedIndex = -1).
 */

import { GameplayState } from './gameplay.js';
import { ShopState } from './shop.js';

const SELECT_W = 1536;
const SELECT_H = 1024;

// Dot rendering
const DOT_RADIUS = 8;
const DOT_OUTLINE = 3;
const PULSE_SPEED = 0.08;   // radians per frame for selected dot pulse

// Banner region (overlays the "STAGE SELECT" text at bottom of image)
const BANNER_X = 511;
const BANNER_Y = 885
const BANNER_W = 500;
const BANNER_H = 62;

// Corner label regions (overlay "STAGE" and "SPEC" text)
const CORNER_LABELS = [
    { x: 69,  y: 35,  w: 169, h: 76, text: 'SHOP' },
    { x: 69,  y: 735, w: 169, h: 76, text: 'EQUIP' },
];

// SHOP label treated as a navigable point at its center
const SHOP_NAV_X = 67 + 172 / 2;   // 153
const SHOP_NAV_Y = 40 + 76 / 2;    // 78

// selectedIndex = -1 means SHOP is selected
const SHOP_INDEX = -1;

// Cursor padding around the SHOP label
const CURSOR_PAD = 4;

export class StageSelectState {
    constructor(assets, locations, selectedIndex = 0) {
        this.assets = assets;
        this.locations = locations || [];
        this.selectedIndex = Math.min(selectedIndex, Math.max(0, this.locations.length - 1));

        // Canvas resolution — tells Game to resize
        this.screenWidth = SELECT_W;
        this.screenHeight = SELECT_H;

        this.pulseTimer = 0;
        this.bgImage = null;
    }

    init(game) {
        this.bgImage = this.assets.getImage('stageSelect');
        this.game = game;

        // Stop any playing music
        if (game.audio) game.audio.stopMusic();
    }

    update(game) {
        const input = game.input;
        this.pulseTimer++;

        if (this.locations.length === 0) return;

        // Directional navigation between dots + SHOP
        if (input.pressed('left'))  this._navigate(-1, 0);
        if (input.pressed('right')) this._navigate(1, 0);
        if (input.pressed('up'))    this._navigate(0, -1);
        if (input.pressed('down'))  this._navigate(0, 1);

        // Confirm selection
        if (input.pressed('jump') || input.pressed('start')) {
            if (this.selectedIndex === SHOP_INDEX) {
                this._openShop(game);
            } else {
                const loc = this.locations[this.selectedIndex];
                if (loc) {
                    const gp = new GameplayState(this.assets, loc.stage);
                    gp._stageSelectLocations = this.locations;
                    gp._stageSelectIndex = this.selectedIndex;
                    game.setState(gp);
                }
            }
        }
    }

    /** Find nearest dot (or SHOP label) in the given direction. */
    _navigate(dirX, dirY) {
        // Current position: either a stage dot or the SHOP label center
        let curX, curY;
        if (this.selectedIndex === SHOP_INDEX) {
            curX = SHOP_NAV_X;
            curY = SHOP_NAV_Y;
        } else {
            const cur = this.locations[this.selectedIndex];
            if (!cur) return;
            curX = cur.x;
            curY = cur.y;
        }

        let bestIdx = null;
        let bestDist = Infinity;

        // Check all stage dots as candidates
        for (let i = 0; i < this.locations.length; i++) {
            if (i === this.selectedIndex) continue;
            const loc = this.locations[i];
            const dx = loc.x - curX;
            const dy = loc.y - curY;

            if (this._isInDirection(dx, dy, dirX, dirY)) {
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
        }

        // Also check SHOP label as a candidate (if not already on it)
        if (this.selectedIndex !== SHOP_INDEX) {
            const dx = SHOP_NAV_X - curX;
            const dy = SHOP_NAV_Y - curY;

            if (this._isInDirection(dx, dy, dirX, dirY)) {
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = SHOP_INDEX;
                }
            }
        }

        if (bestIdx !== null) {
            this.selectedIndex = bestIdx;
        }
    }

    /** Check if a delta (dx,dy) is primarily in the requested direction. */
    _isInDirection(dx, dy, dirX, dirY) {
        if (dirX > 0) return dx > 0 && Math.abs(dy) <= Math.abs(dx);
        if (dirX < 0) return dx < 0 && Math.abs(dy) <= Math.abs(dx);
        if (dirY > 0) return dy > 0 && Math.abs(dx) <= Math.abs(dy);
        if (dirY < 0) return dy < 0 && Math.abs(dx) <= Math.abs(dy);
        return false;
    }

    _openShop(game) {
        game.setState(new ShopState(this.assets, {
            locations: this.locations,
            selectedIndex: this._lastStageIndex(),
        }));
    }

    /** Return the last valid stage index (for returning from shop). */
    _lastStageIndex() {
        // If we came here from a stage, use that; otherwise default to 0
        return this.selectedIndex >= 0 ? this.selectedIndex : 0;
    }

    render(ctx, game) {
        // Background — drawn 1:1 at native resolution
        if (this.bgImage) {
            ctx.drawImage(this.bgImage, 0, 0);
        }

        // Corner label overlays
        for (const label of CORNER_LABELS) {
            ctx.fillStyle = '#0c0828';
            ctx.fillRect(label.x, label.y, label.w, label.h);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 32px "Courier New", monospace';
            // Shadow
            ctx.fillStyle = '#3a2a08';
            ctx.fillText(label.text, label.x + label.w / 2 + 1, label.y + label.h / 2 + 1);
            // Gold text
            ctx.fillStyle = '#c8a840';
            ctx.fillText(label.text, label.x + label.w / 2, label.y + label.h / 2);
        }

        // Pulsing yellow cursor on SHOP when selected
        if (this.selectedIndex === SHOP_INDEX) {
            this._drawShopCursor(ctx);
        }

        // Location dots
        for (let i = 0; i < this.locations.length; i++) {
            const loc = this.locations[i];
            const isSelected = i === this.selectedIndex;
            this._drawDot(ctx, loc.x, loc.y, isSelected);
        }

        // Bottom banner — stage name or "SHOP"
        this._drawBanner(ctx);
    }

    _drawShopCursor(ctx) {
        const shop = CORNER_LABELS[0];
        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;
        const x = shop.x - CURSOR_PAD;
        const y = shop.y - CURSOR_PAD;
        const w = shop.w + CURSOR_PAD * 2;
        const h = shop.h + CURSOR_PAD * 2;

        // Outer glow
        ctx.strokeStyle = `rgba(255, 221, 0, ${0.3 * pulse})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);

        // Main yellow border
        ctx.strokeStyle = `rgba(255, 221, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
    }

    _drawDot(ctx, x, y, selected) {
        const pulse = selected ? Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7 : 1;
        const r = DOT_RADIUS * (selected ? 1.2 + Math.sin(this.pulseTimer * PULSE_SPEED) * 0.15 : 1);

        // Outer dark ring
        ctx.beginPath();
        ctx.arc(x, y, r + DOT_OUTLINE, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        // Main dot
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (selected) {
            ctx.fillStyle = `rgba(255, 221, 0, ${pulse})`;
        } else {
            ctx.fillStyle = '#dd2222';
        }
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = selected
            ? `rgba(255, 255, 255, ${0.5 * pulse})`
            : 'rgba(255, 180, 180, 0.4)';
        ctx.fill();

        // Glow ring for selected
        if (selected) {
            ctx.beginPath();
            ctx.arc(x, y, r + DOT_OUTLINE + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 221, 0, ${0.4 * pulse})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    _drawBanner(ctx) {
        // Dark background over the "STAGE SELECT" text
        ctx.fillStyle = '#0c0828';
        ctx.fillRect(BANNER_X, BANNER_Y, BANNER_W, BANNER_H);

        // Show "SHOP" when shop is selected, otherwise stage name
        let name;
        if (this.selectedIndex === SHOP_INDEX) {
            name = 'SHOP';
        } else {
            const loc = this.locations[this.selectedIndex];
            name = loc ? loc.name : '';
        }

        const cx = BANNER_X + BANNER_W / 2;
        const cy = BANNER_Y + BANNER_H / 2;

        // Dark shadow for depth
        ctx.fillStyle = '#3a2a08';
        ctx.font = 'bold 35px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, cx + 2, cy + 2);

        // Main gold text
        ctx.fillStyle = '#c8a840';
        ctx.fillText(name, cx, cy);
    }
}
