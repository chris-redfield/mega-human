/**
 * stage-select.js
 * Stage select screen — full-screen world map with selectable location dots.
 * Canvas runs at native image resolution (1536×1024), CSS fills viewport.
 */

import { GameplayState } from './gameplay.js';

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
    { x: 67,  y: 40,  w: 172, h: 76, text: 'HERO' },
    { x: 67,  y: 740, w: 172, h: 76, text: 'EQUIP' },
];

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

        // Directional navigation between dots
        if (input.pressed('left'))  this._navigate(-1, 0);
        if (input.pressed('right')) this._navigate(1, 0);
        if (input.pressed('up'))    this._navigate(0, -1);
        if (input.pressed('down'))  this._navigate(0, 1);

        // Confirm selection
        if (input.pressed('jump') || input.pressed('start')) {
            const loc = this.locations[this.selectedIndex];
            if (loc) {
                const gp = new GameplayState(this.assets, loc.stage);
                // Pass stage select context so gameplay can return here
                gp._stageSelectLocations = this.locations;
                gp._stageSelectIndex = this.selectedIndex;
                game.setState(gp);
            }
        }
    }

    /** Find nearest dot in the given direction from current selection. */
    _navigate(dirX, dirY) {
        const cur = this.locations[this.selectedIndex];
        if (!cur) return;

        let bestIdx = -1;
        let bestDist = Infinity;

        for (let i = 0; i < this.locations.length; i++) {
            if (i === this.selectedIndex) continue;
            const loc = this.locations[i];
            const dx = loc.x - cur.x;
            const dy = loc.y - cur.y;

            // Check if this dot is primarily in the requested direction
            let valid = false;
            if (dirX > 0) valid = dx > 0 && Math.abs(dy) <= Math.abs(dx);
            if (dirX < 0) valid = dx < 0 && Math.abs(dy) <= Math.abs(dx);
            if (dirY > 0) valid = dy > 0 && Math.abs(dx) <= Math.abs(dy);
            if (dirY < 0) valid = dy < 0 && Math.abs(dx) <= Math.abs(dy);

            if (valid) {
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
        }

        if (bestIdx >= 0) {
            this.selectedIndex = bestIdx;
        }
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

        // Location dots
        for (let i = 0; i < this.locations.length; i++) {
            const loc = this.locations[i];
            const isSelected = i === this.selectedIndex;
            this._drawDot(ctx, loc.x, loc.y, isSelected);
        }

        // Bottom banner — stage name
        this._drawBanner(ctx);
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

        // Stage name — golden color matching image text
        const loc = this.locations[this.selectedIndex];
        const name = loc ? loc.name : '';

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
