/**
 * input.js
 * Keyboard input with buffered state for edge detection (pressed/held/released).
 */

const DEFAULT_BINDINGS = {
    left:  ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up:    ['ArrowUp', 'KeyW'],
    down:  ['ArrowDown', 'KeyS'],
    jump:  ['KeyZ', 'Space'],
    shoot: ['KeyX'],
    dash:  ['KeyC', 'ShiftLeft'],
    start: ['Enter'],
    select: ['Backspace'],
};

export class Input {
    constructor(bindings = DEFAULT_BINDINGS) {
        this.bindings = bindings;
        this.rawKeys = {};
        this.current = {};
        this.prev = {};

        window.addEventListener('keydown', (e) => {
            this.rawKeys[e.code] = true;
            // Prevent browser defaults for game keys
            if (this._isGameKey(e.code)) e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.rawKeys[e.code] = false;
        });

        // Initialize state
        for (const action of Object.keys(this.bindings)) {
            this.current[action] = false;
            this.prev[action] = false;
        }
    }

    _isGameKey(code) {
        for (const codes of Object.values(this.bindings)) {
            if (codes.includes(code)) return true;
        }
        return false;
    }

    /** Call once per frame before update logic. */
    poll() {
        for (const action of Object.keys(this.bindings)) {
            this.prev[action] = this.current[action];
            this.current[action] = this.bindings[action].some(c => this.rawKeys[c]);
        }
    }

    /** True while the action button is held down. */
    held(action) {
        return this.current[action];
    }

    /** True only on the frame the button was first pressed. */
    pressed(action) {
        return this.current[action] && !this.prev[action];
    }

    /** True only on the frame the button was released. */
    released(action) {
        return !this.current[action] && this.prev[action];
    }
}
