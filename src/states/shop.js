/**
 * shop.js
 * Shop screen — shiba shopkeeper with same MMX frame overlays as stage select.
 * Canvas runs at native image resolution (1536×1024).
 */

import { loadSave } from '../engine/save-manager.js';

const SHOP_W = 1536;
const SHOP_H = 1024;

// Banner region (same position as stage select)
const BANNER_X = 511;
const BANNER_Y = 885;
const BANNER_W = 500;
const BANNER_H = 62;

// Corner label regions (same style as stage select)
const CORNER_LABELS = [
    { x: 67,  y: 40,  w: 172, h: 76, text: 'MAP' },
    { x: 67,  y: 740, w: 172, h: 76, text: 'EQUIP' },
];

export class ShopState {
    screenWidth = SHOP_W;
    screenHeight = SHOP_H;

    constructor(assets, stageSelectContext) {
        this.assets = assets;
        // Context needed to return to stage select
        this._stageSelectLocations = stageSelectContext.locations;
        this._stageSelectIndex = stageSelectContext.selectedIndex;

        this.bgImage = null;
        this.ramImg = null;
        this.pulseTimer = 0;
    }

    init(game) {
        this.game = game;
        this.bgImage = this.assets.getImage('shopBg');
        this.ramImg = this.assets.getImage('ramMemory');

        if (game.audio) game.audio.stopMusic();
    }

    update(game) {
        this.pulseTimer++;

        // Escape / select / jump → back to stage select
        if (game.input.pressed('select') || game.input.pressed('jump') ||
            (game.input.rawKeys['Escape'] && !this._prevKeyEsc)) {
            this._goBack(game);
        }
        this._prevKeyEsc = game.input.rawKeys['Escape'];
    }

    render(ctx) {
        // Background
        if (this.bgImage) {
            ctx.drawImage(this.bgImage, 0, 0);
        }

        // Corner label overlays (same style as stage select)
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

        // Banner
        this._drawBanner(ctx);

        // RAM counter above banner
        this._drawRamCounter(ctx);
    }

    _drawBanner(ctx) {
        ctx.fillStyle = '#0c0828';
        ctx.fillRect(BANNER_X, BANNER_Y, BANNER_W, BANNER_H);

        const cx = BANNER_X + BANNER_W / 2;
        const cy = BANNER_Y + BANNER_H / 2;

        ctx.font = 'bold 35px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Shadow
        ctx.fillStyle = '#3a2a08';
        ctx.fillText('SHOP', cx + 2, cy + 2);
        // Gold text
        ctx.fillStyle = '#c8a840';
        ctx.fillText('SHOP', cx, cy);
    }

    _drawRamCounter(ctx) {
        const save = loadSave();
        const count = save.memoryCount;

        // Draw RAM icon + count above the banner
        const iconW = 52;
        const iconH = 27;
        const x = BANNER_X + BANNER_W - iconW - 60;
        const y = BANNER_Y - iconH - 12;

        if (this.ramImg) {
            ctx.drawImage(this.ramImg, x, y, iconW, iconH);
        }

        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#3a2a08';
        ctx.fillText(`x${count}`, x + iconW + 6 + 1, y + iconH / 2 + 1);
        ctx.fillStyle = '#c8a840';
        ctx.fillText(`x${count}`, x + iconW + 6, y + iconH / 2);
    }

    _goBack(game) {
        import('./stage-select.js').then(({ StageSelectState }) => {
            game.setState(new StageSelectState(
                this.assets,
                this._stageSelectLocations,
                this._stageSelectIndex
            ));
        });
    }
}
