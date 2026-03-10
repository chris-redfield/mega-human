/**
 * shop.js
 * Shop screen — shiba shopkeeper with same MMX frame overlays as stage select.
 * Canvas runs at native image resolution (1536×1024).
 * Bottom panel shows item cards. Left/Right to browse, Shoot to buy, Escape to exit.
 */

import { loadSave, updateSave } from '../engine/save-manager.js';
import { EquipState } from './equip.js';
import { MenuOverlay } from '../ui/menu-overlay.js';

const SHOP_W = 1536;
const SHOP_H = 1024;

// Corner label regions (same style as stage select)
const CORNER_LABELS = [
    { x: 69,  y: 35,  w: 169, h: 76, text: 'SHOP' },
    { x: 69,  y: 735, w: 169, h: 76, text: 'EQUIP' },
    { x: 1295,  y: 35,  w: 169, h: 76, text: 'MAP' },
    { x: 1295,  y: 725, w: 179, h: 202, text: 'MENU' },
];

// ── Menu Panel Layout ──
const PANEL_X = 280;
const PANEL_Y = 838;
const PANEL_W = 980;
const PANEL_H = 170;

// Carousel
const MAX_VISIBLE = 5;
const ARROW_W = 36;

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

// Max heart tanks (matches MMX)
const MAX_HEART_TANKS = 8;

// Cursor padding around corner labels
const CURSOR_PAD = 4;

// Pulse
const PULSE_SPEED = 0.08;

// Buy animation
const BUY_ANIM_DURATION = 50; // frames (~0.83s)

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

// Standalone image icons (asset key → crop rect, or null for full image)
const IMAGE_ICONS = {
    x1_boots:  { asset: 'x1Boots',  sx: 0, sy: 0, sw: 118, sh: 186, offsetY: 0 },
    x1_arms:   { asset: 'x1Arms',   sx: 0, sy: 0, sw: 118, sh: 186, offsetY: 60, scale: 1.4 },
    x1_helmet: { asset: 'x1Helmet', sx: 0, sy: 0, sw: 118, sh: 186, offsetY: 145, scale: 1.7 },
    x1_body:   { asset: 'x1Body',   sx: 0, sy: 0, sw: 118, sh: 186, offsetY: 62, scale: 1.2 },
};

// ── Shop Items ──
// Heart & subtank prices are computed dynamically in _buildItemList()
const SHOP_ITEMS = [
    {
        id: 'heart',
        name: 'Heart',
        description: 'Max HP +1',
        price: 4, // base price; increases by 2 per purchase
        icon: 'heart',
    },
    {
        id: 'subtank',
        name: 'Sub Tank',
        description: 'Store 16 HP',
        price: 10, // base price; increases by 2 per purchase
        icon: 'subtank',
    },
    {
        id: 'x1_helmet',
        name: 'X1 Helmet',
        description: 'Keep charge',
        price: 10,
        icon: 'x1_helmet',
    },
    {
        id: 'x1_body',
        name: 'X1 Body',
        description: 'Dmg -12.5%',
        price: 10,
        icon: 'x1_body',
    },
    {
        id: 'x1_boots',
        name: 'X1 Boots',
        description: 'Dash +15%',
        price: 10,
        icon: 'x1_boots',
    },
    {
        id: 'x1_arms',
        name: 'X1 Arms',
        description: 'Charge +50%',
        price: 10,
        icon: 'x1_arms',
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

        // Selected item index & carousel scroll offset
        this.selectedItem = 0;
        this.scrollOffset = 0;
        // Items available in shop (filter out already-purchased one-time items)
        this.items = this._buildItemList();

        // Buy animation state
        this.buyAnim = null; // { timer, itemIndex, item }

        // Focus area: 'items', 'map', or 'menu'
        this.focus = 'items';

        this.menuOverlay = new MenuOverlay();
    }

    init(game) {
        this.game = game;
        this.bgImage = this.assets.getImage('shopBg');
        this.ramImg = this.assets.getImage('ramMemory');
        this.effectsImg = this.assets.getImage('effectsSprite');
        this.menuOverlay.setAudio(game.audio);
        this.menuOverlay.setInput(game.input);

        if (game.audio) game.audio.stopMusic();
    }

    update(game) {
        this.pulseTimer++;
        this.animTimer++;
        if (this.animTimer >= ICON_ANIM_SPEED) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 3;
        }

        // Buy animation in progress — block all input
        if (this.buyAnim) {
            this.buyAnim.timer++;
            if (this.buyAnim.timer >= BUY_ANIM_DURATION) {
                // Animation done — remove item from list
                this.items = this._buildItemList();
                this.selectedItem = Math.min(this.selectedItem, this.items.length - 1);
                if (this.selectedItem < 0) this.selectedItem = 0;
                // Clamp scroll offset
                const maxOffset = Math.max(0, this.items.length - MAX_VISIBLE);
                this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
                if (this.selectedItem < this.scrollOffset) this.scrollOffset = this.selectedItem;
                this.buyAnim = null;
            }
            return;
        }

        const input = game.input;

        // Menu overlay intercepts all input when active
        if (this.menuOverlay.active) {
            const result = this.menuOverlay.update(input);
            if (result === 'resume' || result === 'close') {
                this.menuOverlay.close();
            }
            return;
        }

        // Up/Down: switch focus between items, equip, map, and menu
        if (input.pressed('up')) {
            if (this.focus === 'items') this.focus = 'map';
            else if (this.focus === 'menu') this.focus = 'map';
            else if (this.focus === 'equip') this.focus = 'items';
        }
        if (input.pressed('down')) {
            if (this.focus === 'map') this.focus = 'items';
            else if (this.focus === 'items') this.focus = 'equip';
            else if (this.focus === 'equip') this.focus = 'menu';
        }
        if (input.pressed('left')) {
            if (this.focus === 'map') this.focus = 'items';
            else if (this.focus === 'menu') this.focus = 'equip';
            else if (this.focus === 'items' && this.selectedItem <= 0) this.focus = 'equip';
        }
        if (input.pressed('right')) {
            if (this.focus === 'equip') this.focus = 'menu';
            else if (this.focus === 'items' && this.selectedItem >= this.items.length - 1) {
                this.focus = 'menu';
            }
        }

        if (this.focus === 'items') {
            // Left/Right: browse items (carousel)
            if (this.items.length > 0) {
                if (input.pressed('left')) {
                    this.selectedItem = Math.max(0, this.selectedItem - 1);
                }
                if (input.pressed('right')) {
                    this.selectedItem = Math.min(this.items.length - 1, this.selectedItem + 1);
                }
                // Keep selection visible in carousel window
                if (this.selectedItem < this.scrollOffset) {
                    this.scrollOffset = this.selectedItem;
                } else if (this.selectedItem >= this.scrollOffset + MAX_VISIBLE) {
                    this.scrollOffset = this.selectedItem - MAX_VISIBLE + 1;
                }
            }

            // Shoot: buy selected item
            if (input.pressed('shoot')) {
                this._tryBuyItem();
            }
        } else if (this.focus === 'map') {
            // Confirm on MAP → go back to stage select
            if (input.pressed('shoot') || input.pressed('jump') || input.pressed('start')) {
                this._goBack(game);
            }
        } else if (this.focus === 'equip') {
            // Confirm on EQUIP → open equipment screen
            if (input.pressed('shoot') || input.pressed('jump') || input.pressed('start')) {
                this._openEquip(game);
            }
        } else if (this.focus === 'menu') {
            // Confirm on MENU → open menu overlay
            if (input.pressed('shoot') || input.pressed('jump') || input.pressed('start')) {
                this.menuOverlay.open();
            }
        }

        // Debug: + key adds 10 RAM memories
        const plusDown = game.input.rawKeys['Equal'] || game.input.rawKeys['NumpadAdd'];
        if (plusDown && !this._prevKeyPlus) {
            updateSave(s => { s.memoryCount += 10; });
        }
        this._prevKeyPlus = plusDown;

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

        // Pulsing cursor on focused corner label
        if (this.focus === 'map') {
            this._drawCornerCursor(ctx, CORNER_LABELS[2]);
        } else if (this.focus === 'equip') {
            this._drawCornerCursor(ctx, CORNER_LABELS[1]);
        } else if (this.focus === 'menu') {
            this._drawCornerCursor(ctx, CORNER_LABELS[3]);
        }

        // Menu panel
        this._drawPanel(ctx);

        // RAM counter
        this._drawRamCounter(ctx);

        // Menu overlay (drawn last, on top of everything)
        this.menuOverlay.render(ctx, SHOP_W, SHOP_H);
    }

    _drawCornerCursor(ctx, label) {
        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;
        const x = label.x - CURSOR_PAD;
        const y = label.y - CURSOR_PAD;
        const w = label.w + CURSOR_PAD * 2;
        const h = label.h + CURSOR_PAD * 2;

        ctx.strokeStyle = `rgba(255, 221, 0, ${0.3 * pulse})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);

        ctx.strokeStyle = `rgba(255, 221, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
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

        const hasOverflow = this.items.length > MAX_VISIBLE;
        const showLeftArrow = hasOverflow && this.scrollOffset > 0;
        const showRightArrow = hasOverflow && this.scrollOffset + MAX_VISIBLE < this.items.length;

        // Visible slice
        const visibleCount = Math.min(this.items.length, MAX_VISIBLE);
        const visibleItems = this.items.slice(this.scrollOffset, this.scrollOffset + visibleCount);

        // Card area (shrink if arrows are present)
        const leftPad = hasOverflow ? ARROW_W : 0;
        const rightPad = hasOverflow ? ARROW_W : 0;
        const cardAreaW = PANEL_W - leftPad - rightPad;
        const totalCardsW = visibleCount * CARD_W + (visibleCount - 1) * CARD_GAP;
        const cardsStartX = PANEL_X + leftPad + (cardAreaW - totalCardsW) / 2;

        // Draw arrows
        if (showLeftArrow) this._drawArrow(ctx, 'left', PANEL_X, pulse);
        if (showRightArrow) this._drawArrow(ctx, 'right', PANEL_X + PANEL_W - ARROW_W, pulse);

        for (let vi = 0; vi < visibleItems.length; vi++) {
            const i = this.scrollOffset + vi; // real index
            const item = visibleItems[vi];
            const x = cardsStartX + vi * (CARD_W + CARD_GAP);
            const y = CARDS_Y;
            const isSelected = this.focus === 'items' && this.selectedItem === i;
            const canAfford = save.memoryCount >= item.price;
            const isBuying = this.buyAnim && this.buyAnim.itemIndex === i;

            // Buy animation: white flash then fade out
            if (isBuying) {
                const t = this.buyAnim.timer / BUY_ANIM_DURATION; // 0→1
                if (t < 0.4) {
                    const flashAlpha = Math.sin((t / 0.4) * Math.PI);
                    this._drawSingleCard(ctx, item, x, y, true, canAfford, pulse);
                    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.7})`;
                    ctx.fillRect(x, y, CARD_W, CARD_H);
                } else {
                    const fadeT = (t - 0.4) / 0.6;
                    const alpha = 1 - fadeT;
                    const scale = 1 + fadeT * 0.3;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-(x + CARD_W / 2), -(y + CARD_H / 2));
                    this._drawSingleCard(ctx, item, x, y, true, canAfford, pulse);
                    ctx.restore();
                }
                continue;
            }

            this._drawSingleCard(ctx, item, x, y, isSelected, canAfford, pulse);
        }
    }

    _drawArrow(ctx, direction, x, pulse) {
        const cy = CARDS_Y + CARD_H / 2;
        const arrowH = 20;
        const arrowW = 12;

        ctx.fillStyle = `rgba(200, 168, 64, ${pulse})`;
        ctx.beginPath();
        if (direction === 'left') {
            ctx.moveTo(x + ARROW_W / 2 + arrowW / 2, cy - arrowH);
            ctx.lineTo(x + ARROW_W / 2 - arrowW / 2, cy);
            ctx.lineTo(x + ARROW_W / 2 + arrowW / 2, cy + arrowH);
        } else {
            ctx.moveTo(x + ARROW_W / 2 - arrowW / 2, cy - arrowH);
            ctx.lineTo(x + ARROW_W / 2 + arrowW / 2, cy);
            ctx.lineTo(x + ARROW_W / 2 - arrowW / 2, cy + arrowH);
        }
        ctx.closePath();
        ctx.fill();
    }

    _drawSingleCard(ctx, item, x, y, isSelected, canAfford, pulse) {
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

    _drawItemIcon(ctx, iconType, cx, cy, selected) {
        // Animated sprite from effects.png
        const frames = ICON_FRAMES[iconType];
        if (frames && this.effectsImg) {
            const frameIdx = selected ? (this.animFrame % frames.length) : 0;
            const frame = frames[frameIdx];
            const scale = 3.6;
            const dw = frame.sw * scale;
            const dh = frame.sh * scale;

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                this.effectsImg,
                frame.sx, frame.sy, frame.sw, frame.sh,
                Math.floor(cx - dw / 2), Math.floor(cy - dh / 2), dw, dh
            );
            ctx.imageSmoothingEnabled = true;
            return;
        }

        // Standalone image icon — bottom-aligned above the name text
        const imgIcon = IMAGE_ICONS[iconType];
        if (imgIcon) {
            const img = this.assets.getImage(imgIcon.asset);
            if (!img) return;
            const maxH = 115;
            const baseScale = Math.min(maxH / imgIcon.sh, 1);
            const scale = baseScale * (imgIcon.scale || 1);
            const dw = imgIcon.sw * scale;
            const dh = imgIcon.sh * scale;
            // Align bottom edge above the name row, with per-icon offset
            const drawY = cy + 25 - dh + (imgIcon.offsetY || 0);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                img,
                imgIcon.sx, imgIcon.sy, imgIcon.sw, imgIcon.sh,
                Math.floor(cx - dw / 2), Math.floor(drawY), dw, dh
            );
            ctx.imageSmoothingEnabled = true;
        }
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

    _buildItemList() {
        const save = loadSave();
        const armor = save.armor || {};
        const heartsBought = save.heartTanks || 0;
        const subsBought = save.subTanks || 0;

        const items = [];
        for (const item of SHOP_ITEMS) {
            // Heart: show one with escalating price until all 8 bought
            if (item.id === 'heart') {
                if (heartsBought < MAX_HEART_TANKS) {
                    items.push({ ...item, price: 4 + heartsBought * 2 });
                }
                continue;
            }
            // Sub Tank: show one with escalating price until all 4 bought
            if (item.id === 'subtank') {
                if (subsBought < 4) {
                    items.push({ ...item, price: 10 + subsBought * 2 });
                }
                continue;
            }
            // Hide armor items already purchased
            if (item.id === 'x1_boots' && armor.boots >= 1) continue;
            if (item.id === 'x1_arms' && armor.arm >= 1) continue;
            if (item.id === 'x1_helmet' && armor.helmet >= 1) continue;
            if (item.id === 'x1_body' && armor.body >= 1) continue;
            items.push(item);
        }
        return items;
    }

    _tryBuyItem() {
        if (this.buyAnim) return; // Already animating a purchase

        const item = this.items[this.selectedItem];
        if (!item) return;

        const save = loadSave();
        if (save.memoryCount < item.price) return; // Can't afford

        // Deduct RAM
        updateSave(s => { s.memoryCount -= item.price; });

        // Apply item effect
        if (item.id === 'heart') {
            updateSave(s => { s.heartTanks = Math.min((s.heartTanks || 0) + 1, MAX_HEART_TANKS); });
        } else if (item.id === 'subtank') {
            updateSave(s => { s.subTanks = Math.min((s.subTanks || 0) + 1, 4); });
        } else if (item.id === 'x1_boots') {
            updateSave(s => { if (!s.armor) s.armor = {}; s.armor.boots = 1; if (!s.equipped) s.equipped = {}; s.equipped.boots = 1; });
        } else if (item.id === 'x1_arms') {
            updateSave(s => { if (!s.armor) s.armor = {}; s.armor.arm = 1; if (!s.equipped) s.equipped = {}; s.equipped.arm = 1; });
        } else if (item.id === 'x1_helmet') {
            updateSave(s => { if (!s.armor) s.armor = {}; s.armor.helmet = 1; if (!s.equipped) s.equipped = {}; s.equipped.helmet = 1; });
        } else if (item.id === 'x1_body') {
            updateSave(s => { if (!s.armor) s.armor = {}; s.armor.body = 1; if (!s.equipped) s.equipped = {}; s.equipped.body = 1; });
        }

        // Start buy animation
        this.buyAnim = { timer: 0, itemIndex: this.selectedItem, item };
    }

    _openEquip(game) {
        game.setState(new EquipState(this.assets, {
            locations: this._stageSelectLocations,
            selectedIndex: this._stageSelectIndex,
        }));
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
