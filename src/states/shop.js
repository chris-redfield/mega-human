/**
 * shop.js
 * Shop screen — shiba shopkeeper with same MMX frame overlays as stage select.
 * Canvas runs at native image resolution (1536×1024).
 * Bottom panel shows item cards. Left/Right to browse, Shoot to buy, Escape to exit.
 */

import { loadSave } from '../engine/save-manager.js';

const SHOP_W = 1536;
const SHOP_H = 1024;

// Corner label regions (same style as stage select)
const CORNER_LABELS = [
    { x: 69,  y: 35,  w: 169, h: 76, text: 'SHOP' },
    { x: 69,  y: 735, w: 169, h: 76, text: 'EQUIP' },
    { x: 1295,  y: 35,  w: 169, h: 76, text: 'MAP' },
];

// ── Menu Panel Layout ──
const PANEL_X = 280;
const PANEL_Y = 838;
const PANEL_W = 980;
const PANEL_H = 170;

// Item cards (centered in panel)
const CARDS_Y = PANEL_Y + 12;
const CARD_W = 150;
const CARD_H = 146;
const CARD_GAP = 12;

// RAM counter position (top-right of panel)
const RAM_X = PANEL_X + PANEL_W - 220;
const RAM_Y = PANEL_Y - 38;

// Colors
const COL_BG = '#0c0828';
const COL_GOLD = '#c8a840';
const COL_SHADOW = '#3a2a08';
const COL_HIGHLIGHT = '#ffdd00';
const COL_CARD_BG = '#151040';
const COL_CARD_BORDER = '#2a2060';
const COL_DIM = '#666688';

// Pulse
const PULSE_SPEED = 0.08;

// Sprite frames from effects.png
const ICON_FRAMES = {
    heart: [
        { sx: 476, sy: 147, sw: 14, sh: 15 },
        { sx: 643, sy: 145, sw: 14, sh: 15 },
        { sx: 660, sy: 145, sw: 14, sh: 15 },
    ],
    subtank: [
        { sx: 621, sy: 145, sw: 16, sh: 16 },
        { sx: 590, sy: 145, sw: 16, sh: 16 },
        { sx: 678, sy: 145, sw: 16, sh: 16 },
    ],
};
const ICON_ANIM_SPEED = 14; // frames per animation step

// ── Shop Items ──
const SHOP_ITEMS = [
    {
        id: 'heart',
        name: 'Heart',
        description: 'Max HP +2',
        price: 3,
        icon: 'heart',
    },
    {
        id: 'subtank',
        name: 'Sub Tank',
        description: 'Store 16 HP',
        price: 4,
        icon: 'subtank',
    },
];

export class ShopState {
    screenWidth = SHOP_W;
    screenHeight = SHOP_H;

    constructor(assets, stageSelectContext) {
        this.assets = assets;
        this._stageSelectLocations = stageSelectContext.locations;
        this._stageSelectIndex = stageSelectContext.selectedIndex;

        this.bgImage = null;
        this.ramImg = null;
        this.effectsImg = null;
        this.pulseTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;

        // Selected item index
        this.selectedItem = 0;
        // Items available in shop
        this.items = SHOP_ITEMS;
    }

    init(game) {
        this.game = game;
        this.bgImage = this.assets.getImage('shopBg');
        this.ramImg = this.assets.getImage('ramMemory');
        this.effectsImg = this.assets.getImage('effectsSprite');

        if (game.audio) game.audio.stopMusic();
    }

    update(game) {
        this.pulseTimer++;
        this.animTimer++;
        if (this.animTimer >= ICON_ANIM_SPEED) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 3;
        }

        const input = game.input;

        // Left/Right: browse items
        if (this.items.length > 0) {
            if (input.pressed('left')) {
                this.selectedItem = Math.max(0, this.selectedItem - 1);
            }
            if (input.pressed('right')) {
                this.selectedItem = Math.min(this.items.length - 1, this.selectedItem + 1);
            }
        }

        // Shoot: buy selected item
        if (input.pressed('shoot')) {
            this._tryBuyItem();
        }

        // Escape / select → back to stage select
        if (input.pressed('select') ||
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

        // Corner label overlays
        for (const label of CORNER_LABELS) {
            ctx.fillStyle = COL_BG;
            ctx.fillRect(label.x, label.y, label.w, label.h);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 32px "Courier New", monospace';
            ctx.fillStyle = COL_SHADOW;
            ctx.fillText(label.text, label.x + label.w / 2 + 1, label.y + label.h / 2 + 1);
            ctx.fillStyle = COL_GOLD;
            ctx.fillText(label.text, label.x + label.w / 2, label.y + label.h / 2);
        }

        // Menu panel
        this._drawPanel(ctx);

        // RAM counter
        this._drawRamCounter(ctx);
    }

    // ── Panel ──

    _drawPanel(ctx) {
        // Dark panel background
        ctx.fillStyle = COL_BG;
        ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

        // Subtle border
        ctx.strokeStyle = COL_CARD_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

        // Item cards
        this._drawItemCards(ctx);
    }

    _drawItemCards(ctx) {
        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;
        const save = loadSave();

        // Center the cards row within the panel
        const totalCardsW = this.items.length * CARD_W + (this.items.length - 1) * CARD_GAP;
        const cardsStartX = PANEL_X + (PANEL_W - totalCardsW) / 2;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const x = cardsStartX + i * (CARD_W + CARD_GAP);
            const y = CARDS_Y;
            const isSelected = this.selectedItem === i;
            const canAfford = save.memoryCount >= item.price;

            // Card background
            ctx.fillStyle = isSelected ? '#1a1250' : COL_CARD_BG;
            ctx.fillRect(x, y, CARD_W, CARD_H);

            // Card border (gold pulse if selected, dim otherwise)
            if (isSelected) {
                // Outer glow
                ctx.strokeStyle = `rgba(255, 221, 0, ${0.3 * pulse})`;
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 2, y - 2, CARD_W + 4, CARD_H + 4);
                // Main border
                ctx.strokeStyle = `rgba(255, 221, 0, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, CARD_W, CARD_H);
            } else {
                ctx.strokeStyle = COL_CARD_BORDER;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, CARD_W, CARD_H);
            }

            // Item icon
            const iconCX = x + CARD_W / 2;
            const iconCY = y + 40;
            this._drawItemIcon(ctx, item.icon, iconCX, iconCY, isSelected);

            // Item name
            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const nameColor = isSelected ? COL_HIGHLIGHT : COL_GOLD;
            ctx.fillStyle = COL_SHADOW;
            ctx.fillText(item.name, iconCX + 1, y + 85 + 1);
            ctx.fillStyle = nameColor;
            ctx.fillText(item.name, iconCX, y + 85);

            // Price (RAM icon + amount)
            this._drawItemPrice(ctx, item.price, iconCX, y + 118, canAfford, isSelected);
        }
    }

    _drawItemIcon(ctx, iconType, cx, cy, selected) {
        const frames = ICON_FRAMES[iconType];
        if (!frames || !this.effectsImg) return;

        const frame = frames[this.animFrame % frames.length];
        const scale = 4;
        const dw = frame.sw * scale;
        const dh = frame.sh * scale;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            this.effectsImg,
            frame.sx, frame.sy, frame.sw, frame.sh,
            Math.floor(cx - dw / 2), Math.floor(cy - dh / 2), dw, dh
        );
        ctx.imageSmoothingEnabled = true;
    }

    _drawItemPrice(ctx, price, cx, y, canAfford, selected) {
        const iconW = 26;
        const iconH = 14;

        // RAM icon (small) + price text
        const totalW = iconW + 8 + 40;
        const startX = cx - totalW / 2;

        if (this.ramImg) {
            ctx.drawImage(this.ramImg, startX, y - iconH / 2, iconW, iconH);
        }

        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const priceColor = !canAfford ? '#883333' : (selected ? COL_HIGHLIGHT : COL_GOLD);
        ctx.fillStyle = priceColor;
        ctx.fillText(`x${price}`, startX + iconW + 6, y);
    }

    // ── RAM Counter ──

    _drawRamCounter(ctx) {
        const save = loadSave();
        const count = save.memoryCount;

        const iconW = 52;
        const iconH = 27;

        // Background box for RAM display
        ctx.fillStyle = COL_BG;
        ctx.fillRect(RAM_X - 8, RAM_Y - 4, 200, 36);
        ctx.strokeStyle = COL_CARD_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(RAM_X - 8, RAM_Y - 4, 200, 36);

        if (this.ramImg) {
            ctx.drawImage(this.ramImg, RAM_X, RAM_Y, iconW, iconH);
        }

        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COL_SHADOW;
        ctx.fillText(`x${count}`, RAM_X + iconW + 6 + 1, RAM_Y + iconH / 2 + 1);
        ctx.fillStyle = COL_GOLD;
        ctx.fillText(`x${count}`, RAM_X + iconW + 6, RAM_Y + iconH / 2);
    }

    // ── Actions ──

    _tryBuyItem() {
        // Visual-only for now — no purchase logic yet
        const item = this.items[this.selectedItem];
        if (!item) return;
        // TODO: deduct RAM, apply item effect, play SFX
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
