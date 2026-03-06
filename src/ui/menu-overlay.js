/**
 * menu-overlay.js
 * Modal overlay menu — dark backdrop + centered panel with navigable options.
 * Supports main menu and submenus (e.g. sound settings with volume rollers).
 * Used from stage select and shop screens.
 */

import { loadSoundSettings, updateSoundSettings, applySoundSettings, resetSoundSettings } from '../engine/sound-settings.js';
import { DEFAULT_BINDINGS } from '../engine/input.js';

const PULSE_SPEED = 0.08;

// Colors (matching existing UI)
const COL_BG = '#0c0828';
const COL_GOLD = '#c8a840';
const COL_SHADOW = '#3a2a08';
const COL_HIGHLIGHT = '#ffdd00';
const COL_BORDER = '#2a2060';
const COL_DIM = '#666688';
const COL_SLIDER_BG = '#1a1040';
const COL_SLIDER_FILL = '#c8a840';
const COL_SLIDER_FILL_HI = '#ffdd00';

// Panel layout
const PANEL_W = 500;
const OPTION_H = 56;
const PANEL_PAD_Y = 24;
const PANEL_PAD_X = 24;
const TITLE_H = 60;

// Slider dimensions
const SLIDER_W = 200;
const SLIDER_H = 16;
const VOLUME_STEP_PRESS = 5;   // single press
const VOLUME_STEP_HELD  = 1;  // held down (continuous)

// Main menu options
const MAIN_OPTIONS = [
    { id: 'resume',   label: 'RESUME' },
    { id: 'controls', label: 'CONTROLS' },
    { id: 'sound',    label: 'SOUND' },
    { id: 'save',     label: 'SAVE' },
];

// Sound submenu rows
const SOUND_ROWS = [
    { id: 'music',  label: 'MUSIC',  volKey: 'musicVolume' },
    { id: 'sfx',    label: 'EFFECTS', volKey: 'sfxVolume' },
    { id: 'charge', label: 'CHARGE',  volKey: 'chargeVolume' },
];

const SOUND_ROW_H = 72;

// Controls submenu — actions to display (in order), with friendly labels
const CONTROLS_ACTIONS = [
    { action: 'up',    label: 'MOVE UP' },
    { action: 'down',  label: 'MOVE DOWN' },
    { action: 'left',  label: 'MOVE LEFT' },
    { action: 'right', label: 'MOVE RIGHT' },
    { action: 'shoot', label: 'FIRE' },
    { action: 'jump',  label: 'JUMP' },
    { action: 'dash',  label: 'DASH' },
    { action: 'start', label: 'START' },
    { action: 'select',label: 'SELECT' },
];

const CONTROLS_ROW_H = 48;

/** Convert a KeyboardEvent.code string to a readable label. */
function keyDisplayName(code) {
    if (code.startsWith('Key')) return code.slice(3);           // KeyA → A
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6); // Numpad4 → NUM 4
    if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
    if (code === 'Space') return 'SPACE';
    if (code === 'Backspace') return 'BACKSPACE';
    if (code === 'Enter') return 'ENTER';
    return code.toUpperCase();
}

export class MenuOverlay {
    constructor() {
        this.selectedIndex = 0;
        this.pulseTimer = 0;
        this.active = false;
        this.view = 'main'; // 'main', 'sound', or 'controls'
        this._audio = null;
        this._input = null;
        this.listening = false; // true when waiting for a key rebind
    }

    open() {
        this.active = true;
        this.selectedIndex = 0;
        this.pulseTimer = 0;
        this.view = 'main';
    }

    close() {
        this.active = false;
    }

    /** Set reference to AudioManager for live volume preview. */
    setAudio(audio) {
        this._audio = audio;
    }

    /** Set reference to Input for key rebinding. */
    setInput(input) {
        this._input = input;
    }

    /** Returns the id of a confirmed main-menu option, or null. */
    update(input) {
        if (!this.active) return null;
        this.pulseTimer++;

        if (this.view === 'sound') {
            return this._updateSound(input);
        }
        if (this.view === 'controls') {
            return this._updateControls(input);
        }
        return this._updateMain(input);
    }

    _updateMain(input) {
        const options = MAIN_OPTIONS;

        if (input.pressed('up')) {
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
        }
        if (input.pressed('down')) {
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
        }

        // Confirm
        if (input.pressed('jump') || input.pressed('shoot') || input.pressed('start')) {
            const id = options[this.selectedIndex].id;
            if (id === 'sound') {
                this.view = 'sound';
                this.selectedIndex = SOUND_ROWS.length + 1; // start on BACK
                return null;
            }
            if (id === 'controls') {
                this.view = 'controls';
                this.selectedIndex = 0; // start on BACK
                return null;
            }
            return id;
        }

        // Cancel → close
        if (input.pressed('select') || input.pressed('dash')) {
            this.close();
            return 'close';
        }

        return null;
    }

    _updateSound(input) {
        // Rows: 3 sound rows + DEFAULT + BACK
        const DEFAULT_IDX = SOUND_ROWS.length;
        const BACK_IDX = SOUND_ROWS.length + 1;
        const totalRows = SOUND_ROWS.length + 2;

        if (input.pressed('up')) {
            this.selectedIndex = (this.selectedIndex - 1 + totalRows) % totalRows;
        }
        if (input.pressed('down')) {
            this.selectedIndex = (this.selectedIndex + 1) % totalRows;
        }

        // On a sound row: left/right adjusts volume
        if (this.selectedIndex < SOUND_ROWS.length) {
            const row = SOUND_ROWS[this.selectedIndex];
            const step = input.pressed('left') || input.pressed('right')
                ? VOLUME_STEP_PRESS : VOLUME_STEP_HELD;

            if (input.pressed('left') || input.held('left')) {
                updateSoundSettings(s => {
                    s[row.volKey] = Math.max(0, s[row.volKey] - step);
                });
                applySoundSettings(this._audio);
            }
            if (input.pressed('right') || input.held('right')) {
                updateSoundSettings(s => {
                    s[row.volKey] = Math.min(100, s[row.volKey] + step);
                });
                applySoundSettings(this._audio);
            }
        } else if (this.selectedIndex === DEFAULT_IDX) {
            // DEFAULT row
            if (input.pressed('jump') || input.pressed('shoot') || input.pressed('start')) {
                resetSoundSettings();
                applySoundSettings(this._audio);
            }
        } else {
            // BACK row
            if (input.pressed('jump') || input.pressed('shoot') || input.pressed('start')) {
                this.view = 'main';
                this.selectedIndex = 2; // return cursor to SOUND option
                return null;
            }
        }

        // Cancel → back to main
        if (input.pressed('select') || input.pressed('dash')) {
            this.view = 'main';
            this.selectedIndex = 2;
            return null;
        }

        return null;
    }

    _updateControls(input) {
        const DEFAULT_IDX = CONTROLS_ACTIONS.length;
        const BACK_IDX = CONTROLS_ACTIONS.length + 1;
        const totalRows = CONTROLS_ACTIONS.length + 2;

        // Listening mode — waiting for user to press a key
        if (this.listening) {
            const rawKey = this._input ? this._input.consumeRawKey() : null;
            if (rawKey) {
                const action = CONTROLS_ACTIONS[this.selectedIndex].action;
                // Replace primary key (index 0), keep secondary bindings
                if (this._input) {
                    this._input.bindings[action][0] = rawKey;
                }
                this.listening = false;
            }
            return null;
        }

        if (input.pressed('up')) {
            this.selectedIndex = (this.selectedIndex - 1 + totalRows) % totalRows;
        }
        if (input.pressed('down')) {
            this.selectedIndex = (this.selectedIndex + 1) % totalRows;
        }

        // Confirm
        if (input.pressed('jump') || input.pressed('shoot') || input.pressed('start')) {
            if (this.selectedIndex === DEFAULT_IDX) {
                // Reset all bindings to defaults
                if (this._input) {
                    for (const action of Object.keys(DEFAULT_BINDINGS)) {
                        this._input.bindings[action] = [...DEFAULT_BINDINGS[action]];
                    }
                }
                return null;
            }
            if (this.selectedIndex === BACK_IDX) {
                this.view = 'main';
                this.selectedIndex = 1; // return cursor to CONTROLS option
                return null;
            }
            // Enter listening mode for this action row
            this.listening = true;
            // Clear any pending raw key so we don't immediately rebind
            if (this._input) this._input.consumeRawKey();
            return null;
        }

        // Cancel → back to main
        if (input.pressed('select') || input.pressed('dash')) {
            this.view = 'main';
            this.selectedIndex = 1;
            return null;
        }

        return null;
    }

    render(ctx, screenW, screenH) {
        if (!this.active) return;

        // Dark backdrop
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, screenW, screenH);

        if (this.view === 'sound') {
            this._renderSound(ctx, screenW, screenH);
        } else if (this.view === 'controls') {
            this._renderControls(ctx, screenW, screenH);
        } else {
            this._renderMain(ctx, screenW, screenH);
        }
    }

    _renderMain(ctx, screenW, screenH) {
        const options = MAIN_OPTIONS;
        const panelH = TITLE_H + options.length * OPTION_H + PANEL_PAD_Y * 2;
        const px = Math.floor((screenW - PANEL_W) / 2);
        const py = Math.floor((screenH - panelH) / 2);

        this._drawPanel(ctx, px, py, PANEL_W, panelH, 'MENU');

        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;
        const divY = py + TITLE_H + PANEL_PAD_Y / 2;
        const optionsStartY = divY + 12;
        const titleX = px + PANEL_W / 2;

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const oy = optionsStartY + i * OPTION_H + OPTION_H / 2;
            const isSelected = i === this.selectedIndex;

            if (isSelected) {
                ctx.fillStyle = `rgba(255, 221, 0, ${0.1 * pulse})`;
                ctx.fillRect(px + PANEL_PAD_X, optionsStartY + i * OPTION_H + 4, PANEL_W - PANEL_PAD_X * 2, OPTION_H - 8);

                ctx.fillStyle = `rgba(255, 221, 0, ${pulse})`;
                ctx.font = 'bold 28px "Courier New", monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText('>', titleX - 80, oy);
            }

            ctx.font = 'bold 28px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isSelected) {
                ctx.fillStyle = COL_SHADOW;
                ctx.fillText(opt.label, titleX + 1, oy + 1);
                ctx.fillStyle = COL_HIGHLIGHT;
                ctx.fillText(opt.label, titleX, oy);
            } else {
                ctx.fillStyle = COL_DIM;
                ctx.fillText(opt.label, titleX, oy);
            }
        }
    }

    _renderSound(ctx, screenW, screenH) {
        const settings = loadSoundSettings();
        const panelH = TITLE_H + SOUND_ROWS.length * SOUND_ROW_H + OPTION_H * 2 + PANEL_PAD_Y * 2;
        const px = Math.floor((screenW - PANEL_W) / 2);
        const py = Math.floor((screenH - panelH) / 2);

        this._drawPanel(ctx, px, py, PANEL_W, panelH, 'SOUND');

        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;
        const divY = py + TITLE_H + PANEL_PAD_Y / 2;
        const rowsStartY = divY + 16;
        const titleX = px + PANEL_W / 2;

        // Sound rows with sliders
        for (let i = 0; i < SOUND_ROWS.length; i++) {
            const row = SOUND_ROWS[i];
            const ry = rowsStartY + i * SOUND_ROW_H;
            const isSelected = i === this.selectedIndex;
            const volume = settings[row.volKey];

            // Highlight bar
            if (isSelected) {
                ctx.fillStyle = `rgba(255, 221, 0, ${0.08 * pulse})`;
                ctx.fillRect(px + PANEL_PAD_X, ry + 2, PANEL_W - PANEL_PAD_X * 2, SOUND_ROW_H - 4);
            }

            // Label
            const labelX = px + PANEL_PAD_X + 8;
            const labelY = ry + 22;
            ctx.font = 'bold 22px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            if (isSelected) {
                ctx.fillStyle = COL_SHADOW;
                ctx.fillText(row.label, labelX + 1, labelY + 1);
                ctx.fillStyle = COL_HIGHLIGHT;
            } else {
                ctx.fillStyle = COL_DIM;
            }
            ctx.fillText(row.label, labelX, labelY);

            // Slider bar
            const sliderX = px + PANEL_PAD_X + 8;
            const sliderY = ry + 42;
            const fillW = (volume / 100) * SLIDER_W;

            // Background
            ctx.fillStyle = COL_SLIDER_BG;
            ctx.fillRect(sliderX, sliderY, SLIDER_W, SLIDER_H);

            // Fill
            if (volume > 0) {
                ctx.fillStyle = isSelected ? COL_SLIDER_FILL_HI : COL_SLIDER_FILL;
                ctx.fillRect(sliderX, sliderY, fillW, SLIDER_H);
            }

            // Border
            ctx.strokeStyle = isSelected ? `rgba(255, 221, 0, ${0.5 * pulse})` : COL_BORDER;
            ctx.lineWidth = 2;
            ctx.strokeRect(sliderX, sliderY, SLIDER_W, SLIDER_H);

            // Percentage text
            const pctX = sliderX + SLIDER_W + 14;
            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? COL_HIGHLIGHT : COL_DIM;
            ctx.fillText(`${volume}%`, pctX, sliderY + SLIDER_H / 2);
        }

        // Bottom buttons: DEFAULT and BACK
        const bottomButtons = [
            { idx: SOUND_ROWS.length,     label: 'DEFAULT' },
            { idx: SOUND_ROWS.length + 1, label: 'BACK' },
        ];
        for (let b = 0; b < bottomButtons.length; b++) {
            const btn = bottomButtons[b];
            const btnY = rowsStartY + SOUND_ROWS.length * SOUND_ROW_H + b * OPTION_H + OPTION_H / 2;
            const isSel = this.selectedIndex === btn.idx;

            if (isSel) {
                ctx.fillStyle = `rgba(255, 221, 0, ${0.1 * pulse})`;
                ctx.fillRect(px + PANEL_PAD_X, btnY - OPTION_H / 2 + 4, PANEL_W - PANEL_PAD_X * 2, OPTION_H - 8);

                ctx.fillStyle = `rgba(255, 221, 0, ${pulse})`;
                ctx.font = 'bold 28px "Courier New", monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText('>', titleX - 80, btnY);
            }

            ctx.font = 'bold 28px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isSel) {
                ctx.fillStyle = COL_SHADOW;
                ctx.fillText(btn.label, titleX + 1, btnY + 1);
                ctx.fillStyle = COL_HIGHLIGHT;
            } else {
                ctx.fillStyle = COL_DIM;
            }
            ctx.fillText(btn.label, titleX, btnY);
        }

        // Hint text
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = COL_DIM;
        ctx.fillText('LEFT/RIGHT: Adjust Volume', titleX, py + panelH - 14);
    }

    _renderControls(ctx, screenW, screenH) {
        const rows = CONTROLS_ACTIONS;
        const panelH = TITLE_H + rows.length * CONTROLS_ROW_H + OPTION_H * 2 + PANEL_PAD_Y * 2;
        const px = Math.floor((screenW - PANEL_W) / 2);
        const py = Math.floor((screenH - panelH) / 2);

        this._drawPanel(ctx, px, py, PANEL_W, panelH, 'CONTROLS');

        const pulse = Math.sin(this.pulseTimer * PULSE_SPEED) * 0.3 + 0.7;
        const divY = py + TITLE_H + PANEL_PAD_Y / 2;
        const rowsStartY = divY + 12;
        const titleX = px + PANEL_W / 2;

        // Read live bindings from input (falls back to DEFAULT_BINDINGS)
        const bindings = this._input ? this._input.bindings : DEFAULT_BINDINGS;

        // Control rows — action label on left, key name on right
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ry = rowsStartY + i * CONTROLS_ROW_H + CONTROLS_ROW_H / 2;
            const isSelected = i === this.selectedIndex;
            const isListening = isSelected && this.listening;
            const keys = bindings[row.action] || [];
            const keyName = keys.length > 0 ? keyDisplayName(keys[0]) : '—';

            // Highlight bar for selected row
            if (isSelected) {
                ctx.fillStyle = `rgba(255, 221, 0, ${0.08 * pulse})`;
                ctx.fillRect(px + PANEL_PAD_X, ry - CONTROLS_ROW_H / 2 + 2, PANEL_W - PANEL_PAD_X * 2, CONTROLS_ROW_H - 4);
            }

            ctx.font = 'bold 22px "Courier New", monospace';
            ctx.textBaseline = 'middle';

            // Cursor arrow
            if (isSelected) {
                ctx.textAlign = 'left';
                ctx.fillStyle = `rgba(255, 221, 0, ${pulse})`;
                ctx.fillText('>', px + PANEL_PAD_X + 2, ry);
            }

            // Action label (left-aligned)
            ctx.textAlign = 'left';
            if (isSelected) {
                ctx.fillStyle = COL_SHADOW;
                ctx.fillText(row.label, px + PANEL_PAD_X + 17, ry + 1);
                ctx.fillStyle = COL_HIGHLIGHT;
            } else {
                ctx.fillStyle = COL_GOLD;
            }
            ctx.fillText(row.label, px + PANEL_PAD_X + 16, ry);

            // Key name or "PRESS A KEY..." (right-aligned)
            ctx.textAlign = 'right';
            if (isListening) {
                // Blinking prompt
                const blink = Math.sin(this.pulseTimer * 0.15) > 0;
                ctx.fillStyle = blink ? COL_HIGHLIGHT : COL_DIM;
                ctx.fillText('PRESS A KEY...', px + PANEL_W - PANEL_PAD_X - 16, ry);
            } else {
                ctx.fillStyle = isSelected ? COL_HIGHLIGHT : COL_DIM;
                ctx.fillText(keyName, px + PANEL_W - PANEL_PAD_X - 16, ry);
            }
        }

        // Bottom buttons: DEFAULT and BACK
        const bottomButtons = [
            { idx: rows.length,     label: 'DEFAULT' },
            { idx: rows.length + 1, label: 'BACK' },
        ];
        for (let b = 0; b < bottomButtons.length; b++) {
            const btn = bottomButtons[b];
            const btnY = rowsStartY + rows.length * CONTROLS_ROW_H + b * OPTION_H + OPTION_H / 2;
            const isSel = this.selectedIndex === btn.idx;

            if (isSel) {
                ctx.fillStyle = `rgba(255, 221, 0, ${0.1 * pulse})`;
                ctx.fillRect(px + PANEL_PAD_X, btnY - OPTION_H / 2 + 4, PANEL_W - PANEL_PAD_X * 2, OPTION_H - 8);

                ctx.fillStyle = `rgba(255, 221, 0, ${pulse})`;
                ctx.font = 'bold 28px "Courier New", monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText('>', titleX - 80, btnY);
            }

            ctx.font = 'bold 28px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isSel) {
                ctx.fillStyle = COL_SHADOW;
                ctx.fillText(btn.label, titleX + 1, btnY + 1);
                ctx.fillStyle = COL_HIGHLIGHT;
            } else {
                ctx.fillStyle = COL_DIM;
            }
            ctx.fillText(btn.label, titleX, btnY);
        }
    }

    _drawPanel(ctx, px, py, w, h, title) {
        // Background
        ctx.fillStyle = COL_BG;
        ctx.fillRect(px, py, w, h);

        // Border
        ctx.strokeStyle = COL_BORDER;
        ctx.lineWidth = 3;
        ctx.strokeRect(px, py, w, h);

        // Title
        const titleX = px + w / 2;
        const titleY = py + TITLE_H / 2 + PANEL_PAD_Y / 2;
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COL_SHADOW;
        ctx.fillText(title, titleX + 2, titleY + 2);
        ctx.fillStyle = COL_GOLD;
        ctx.fillText(title, titleX, titleY);

        // Divider
        ctx.strokeStyle = COL_BORDER;
        ctx.lineWidth = 2;
        const divY = py + TITLE_H + PANEL_PAD_Y / 2;
        ctx.beginPath();
        ctx.moveTo(px + PANEL_PAD_X, divY);
        ctx.lineTo(px + w - PANEL_PAD_X, divY);
        ctx.stroke();
    }
}
