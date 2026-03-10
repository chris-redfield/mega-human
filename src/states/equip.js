/**
 * equip.js
 * Equipment screen — stage-select background with central area filled.
 * Canvas runs at native image resolution (1536×1024).
 */

import { loadSave, updateSave } from '../engine/save-manager.js';
import { ShopState } from './shop.js';
import { MenuOverlay } from '../ui/menu-overlay.js';

const EQUIP_W = 1536;
const EQUIP_H = 1024;

// Corner label regions (same as stage select / shop)
const CORNER_LABELS = [
    { x: 69,  y: 35,  w: 169, h: 76, text: 'SHOP' },
    { x: 69,  y: 735, w: 169, h: 76, text: 'EQUIP' },
    { x: 1295,  y: 35,  w: 169, h: 76, text: 'MAP' },
    { x: 1295,  y: 725, w: 179, h: 202, text: 'MENU' },
];

// Central viewport area (the region between inner frame borders, matching shop image)
const VIEW_X = 300;
const VIEW_Y = 86; //86 -> original
const VIEW_W = 935;
const VIEW_H = 744; //744 original

// Player sprite layout (118x186 at 3x scale, centered in left half)
const PLAYER_SCALE = 3;
const PLAYER_CX = VIEW_X + VIEW_W / 4;                // ~534
const PLAYER_CY = VIEW_Y + VIEW_H / 2;                // ~458
const PLAYER_TOP = PLAYER_CY - (186 * PLAYER_SCALE) / 2; // ~179

// Body part Y positions (proportion of 186px sprite height, scaled)
function bodyY(fraction) { return PLAYER_TOP + fraction * 186 * PLAYER_SCALE; }

// Armor slot definitions: line origin on sprite → box on right side
const SLOT_BOX_W = 180;
const SLOT_BOX_H = 40;
const SLOT_BOX_X = VIEW_X + VIEW_W - SLOT_BOX_W - 30; // right side of viewport

const ARMOR_SLOTS = [
    { id: 'helmet', saveKey: 'helmet', label: 'HELMET', originY: bodyY(0.07), boxY: bodyY(0.02) },
    { id: 'body',   saveKey: 'body',   label: 'BODY',   originY: bodyY(0.27), boxY: bodyY(0.27) },
    { id: 'arm',    saveKey: 'arm',    label: 'ARM',    originY: bodyY(0.51), boxY: bodyY(0.55) },
    { id: 'boots',  saveKey: 'boots',  label: 'BOOTS',  originY: bodyY(0.83), boxY: bodyY(0.83) },
];

// Equipment names per armor level (0=none, 1=X1)
const EQUIP_NAMES = {
    0: 'None',
    1: 'X1',
};

// Equipment effect descriptions per slot + level
const EQUIP_DESCRIPTIONS = {
    helmet: { 1: "Keep buster charge when hit" },
    body:   { 1: "Dmg -12.5%, Flinch -25%" },
    arm:    { 1: "Charge +50% speed, L3 charge shot" },
    boots:  { 1: "Dash speed +15%" },
};

// Info banner (same position as stage-select banner)
const BANNER_X = 511;
const BANNER_Y = 885;
const BANNER_W = 500;
const BANNER_H = 62;

// Colors
const COL_EQUIP_BG = '#40a880';
const COL_LABEL_BG = '#0c0828';
const COL_GOLD = '#c8a840';
const COL_SHADOW = '#3a2a08';
const COL_SLOT_BG = '#0c0828';
const COL_SLOT_BORDER = '#2a2060';
const COL_LINE = '#c8a840';

// Cursor padding around corner labels
const CURSOR_PAD = 4;
const PULSE_SPEED = 0.08;

export class EquipState {
    screenWidth = EQUIP_W;
    screenHeight = EQUIP_H;

    constructor(assets, stageSelectContext) {
        this.assets = assets;
        this._stageSelectLocations = stageSelectContext.locations;
        this._stageSelectIndex = stageSelectContext.selectedIndex;

        this.bgImage = null;
        this.playerImg = null;
        this.pulseTimer = 0;

        // Focus area: 'slots', 'map', or 'menu'
        this.focus = 'slots';
        this.selectedSlot = 0; // 0-3 index into ARMOR_SLOTS

        // Load current equipment from save (equipped = what's worn, armor = what's owned)
        const save = loadSave();
        this.equipped = {
            helmet: save.equipped.helmet,
            body:   save.equipped.body,
            arm:    save.equipped.arm,
            boots:  save.equipped.boots,
        };

        this.menuOverlay = new MenuOverlay();
    }

    init(game) {
        this.game = game;
        this.bgImage = this.assets.getImage('stageSelect');
        this.playerImg = this.assets.getImage('xDefaultMenu');
        this.menuOverlay.setAudio(game.audio);
        this.menuOverlay.setInput(game.input);

        if (game.audio) game.audio.stopMusic();
    }

    update(game) {
        this.pulseTimer++;
        const input = game.input;

        // Menu overlay intercepts all input when active
        if (this.menuOverlay.active) {
            const result = this.menuOverlay.update(input);
            if (result === 'resume' || result === 'close') {
                this.menuOverlay.close();
            }
            return;
        }

        // Navigation between focus areas
        // Top row: SHOP (left) ↔ MAP (right)
        // Middle: slots (up/down between them, left/right cycles equipment)
        // Bottom: MENU
        if (input.pressed('up')) {
            if (this.focus === 'slots') {
                if (this.selectedSlot > 0) {
                    this.selectedSlot--;
                } else {
                    this.focus = 'shop';
                }
            } else if (this.focus === 'menu') {
                this.focus = 'slots';
                this.selectedSlot = ARMOR_SLOTS.length - 1;
            }
        }
        if (input.pressed('down')) {
            if (this.focus === 'slots') {
                if (this.selectedSlot < ARMOR_SLOTS.length - 1) {
                    this.selectedSlot++;
                } else {
                    this.focus = 'menu';
                }
            } else if (this.focus === 'shop' || this.focus === 'map') {
                this.focus = 'slots';
                this.selectedSlot = 0;
            }
        }
        if (input.pressed('left')) {
            if (this.focus === 'slots') {
                this._cycleEquip(-1);
            } else if (this.focus === 'map') {
                this.focus = 'shop';
            }
        }
        if (input.pressed('right')) {
            if (this.focus === 'slots') {
                this._cycleEquip(1);
            } else if (this.focus === 'shop') {
                this.focus = 'map';
            }
        }

        // Confirm actions
        if (this.focus === 'shop') {
            if (input.pressed('shoot') || input.pressed('jump') || input.pressed('start')) {
                this._openShop(game);
            }
        } else if (this.focus === 'map') {
            if (input.pressed('shoot') || input.pressed('jump') || input.pressed('start')) {
                this._goBack(game);
            }
        } else if (this.focus === 'menu') {
            if (input.pressed('shoot') || input.pressed('jump') || input.pressed('start')) {
                this.menuOverlay.open();
            }
        }

        // Escape / select → back to stage select
        if (input.pressed('select') ||
            (game.input.rawKeys['Escape'] && !this._prevKeyEsc)) {
            this._goBack(game);
        }
        this._prevKeyEsc = game.input.rawKeys['Escape'];
    }

    render(ctx) {
        // Stage select background (full frame)
        if (this.bgImage) {
            ctx.drawImage(this.bgImage, 0, 0);
        }

        // Fill central viewport with equip background color
        ctx.fillStyle = COL_EQUIP_BG;
        ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);

        // Player character image (centered in left half of viewport)
        if (this.playerImg) {
            const scale = 3;
            const dw = this.playerImg.width * scale;
            const dh = this.playerImg.height * scale;
            const cx = VIEW_X + VIEW_W / 4;
            const cy = VIEW_Y + VIEW_H / 2;
            const dx = Math.floor(cx - dw / 2);
            const dy = Math.floor(cy - dh / 2);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.playerImg, dx, dy, dw, dh);

            // Armor overlays (same 118x186 sheets, drawn at same position)
            const armorLayers = [
                { key: 'boots',  asset: 'x1Boots' },
                { key: 'body',   asset: 'x1Body' },
                { key: 'helmet', asset: 'x1Helmet' },
                { key: 'arm',    asset: 'x1Arms' },
            ];
            for (const layer of armorLayers) {
                if (this.equipped[layer.key] >= 1) {
                    const img = this.assets.getImage(layer.asset);
                    if (img) ctx.drawImage(img, dx, dy, dw, dh);
                }
            }

            ctx.imageSmoothingEnabled = true;
        }

        // Armor slots — lines from player body parts to labeled boxes on the right
        this._drawArmorSlots(ctx);

        // Corner label overlays
        for (const label of CORNER_LABELS) {
            ctx.fillStyle = COL_LABEL_BG;
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
        if (this.focus === 'shop') {
            this._drawCornerCursor(ctx, CORNER_LABELS[0]);
        } else if (this.focus === 'map') {
            this._drawCornerCursor(ctx, CORNER_LABELS[2]);
        } else if (this.focus === 'menu') {
            this._drawCornerCursor(ctx, CORNER_LABELS[3]);
        }

        // Info banner at bottom
        this._drawBanner(ctx);

        // Menu overlay (drawn last, on top of everything)
        this.menuOverlay.render(ctx, EQUIP_W, EQUIP_H);
    }

    _drawBanner(ctx) {
        // Dark background (same as stage-select banner)
        ctx.fillStyle = COL_LABEL_BG;
        ctx.fillRect(BANNER_X, BANNER_Y, BANNER_W, BANNER_H);

        // Only show description when focused on a slot with equipment
        if (this.focus !== 'slots') return;
        const slot = ARMOR_SLOTS[this.selectedSlot];
        const level = this.equipped[slot.saveKey];
        if (!level) return; // None equipped — leave empty

        const desc = (EQUIP_DESCRIPTIONS[slot.saveKey] || {})[level] || '';
        if (!desc) return;

        const cx = BANNER_X + BANNER_W / 2;
        const cy = BANNER_Y + BANNER_H / 2;

        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COL_SHADOW;
        ctx.fillText(desc, cx + 2, cy + 2);
        ctx.fillStyle = COL_GOLD;
        ctx.fillText(desc, cx, cy);
    }

    _drawArmorSlots(ctx) {
        const lineStartX = PLAYER_CX + (118 * PLAYER_SCALE) / 2 + 10; // right edge of player + gap
        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;

        for (let i = 0; i < ARMOR_SLOTS.length; i++) {
            const slot = ARMOR_SLOTS[i];
            const isSelected = this.focus === 'slots' && this.selectedSlot === i;
            const boxX = SLOT_BOX_X;
            const boxY = slot.boxY - SLOT_BOX_H / 2;
            const boxCY = slot.boxY;

            // Line from player body part to box
            const midX = lineStartX + (boxX - lineStartX) / 2;
            ctx.strokeStyle = isSelected ? `rgba(255, 221, 0, ${pulse})` : COL_LINE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lineStartX, slot.originY);
            ctx.lineTo(midX, boxCY);
            ctx.lineTo(boxX, boxCY);
            ctx.stroke();

            // Small dot at line origin
            ctx.fillStyle = isSelected ? `rgba(255, 221, 0, ${pulse})` : COL_LINE;
            ctx.beginPath();
            ctx.arc(lineStartX, slot.originY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Box background
            ctx.fillStyle = COL_SLOT_BG;
            ctx.fillRect(boxX, boxY, SLOT_BOX_W, SLOT_BOX_H);

            // Box border — pulsing yellow if selected
            if (isSelected) {
                ctx.strokeStyle = `rgba(255, 221, 0, ${0.3 * pulse})`;
                ctx.lineWidth = 4;
                ctx.strokeRect(boxX - 2, boxY - 2, SLOT_BOX_W + 4, SLOT_BOX_H + 4);
                ctx.strokeStyle = `rgba(255, 221, 0, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, SLOT_BOX_W, SLOT_BOX_H);
            } else {
                ctx.strokeStyle = COL_SLOT_BORDER;
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, SLOT_BOX_W, SLOT_BOX_H);
            }

            // Slot label (top line, small)
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isSelected ? `rgba(255, 221, 0, ${pulse})` : COL_GOLD;
            ctx.fillText(slot.label, boxX + SLOT_BOX_W / 2, boxY + 4);

            // Equipped item name
            const equipLevel = this.equipped[slot.saveKey];
            const equipName = EQUIP_NAMES[equipLevel] || 'None';
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = isSelected ? '#ffffff' : '#aaaacc';
            ctx.fillText(equipName, boxX + SLOT_BOX_W / 2, boxY + SLOT_BOX_H - 4);

            // Left/right arrows when selected and has options
            if (isSelected) {
                const save = loadSave();
                const owned = save.armor[slot.saveKey] || 0;
                if (owned > 0) {
                    ctx.font = 'bold 20px "Courier New", monospace';
                    ctx.fillStyle = `rgba(255, 221, 0, ${pulse})`;
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'right';
                    ctx.fillText('<', boxX - 8, boxCY);
                    ctx.textAlign = 'left';
                    ctx.fillText('>', boxX + SLOT_BOX_W + 8, boxCY);
                }
            }
        }
    }

    /** Cycle equipment on the selected slot. dir = -1 or +1. */
    _cycleEquip(dir) {
        const slot = ARMOR_SLOTS[this.selectedSlot];
        const save = loadSave();
        const owned = save.armor[slot.saveKey] || 0; // max tier owned (0=none, 1=X1)

        // Options: [0, 1, ..., owned] — only tiers the player has bought
        const current = this.equipped[slot.saveKey];
        const options = [0];
        for (let i = 1; i <= owned; i++) options.push(i);
        if (options.length <= 1) return; // nothing to cycle (only "None")

        const idx = options.indexOf(current);
        const newIdx = (idx + dir + options.length) % options.length;
        this.equipped[slot.saveKey] = options[newIdx];

        // Persist to save (write to equipped, not armor)
        updateSave(s => { s.equipped[slot.saveKey] = this.equipped[slot.saveKey]; });
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

    _openShop(game) {
        game.setState(new ShopState(this.assets, {
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
