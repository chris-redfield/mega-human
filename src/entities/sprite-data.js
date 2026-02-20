/**
 * sprite-data.js
 * Player character sprite definitions from XDefault.png spritesheet.
 * Generated from MMX-Online-Deathmatch animation JSONs.
 *
 * Each frame: { sx, sy, sw, sh, dur, ox, oy, hx?, hy? }
 *   sx,sy,sw,sh = source rect on spritesheet (pixels)
 *   dur = duration in game frames (60fps)
 *   ox,oy = per-frame rendering offset
 *   hx,hy = buster hand position relative to feet-center (shoot anims only)
 *
 * Alignment: bottom-center (sprite positioned from its feet)
 */

// Shoot animation overlay mapping: state → shoot variant
const SHOOT_ANIM_MAP = {
    idle: 'shoot',
    run: 'run_shoot',
    jump: 'jump_shoot',
    fall: 'fall_shoot',
    dash: 'dash_shoot',
    wall_slide: 'wall_slide_shoot',
};

// Buster projectile sprite frames (from effects.png)
export const BUSTER_FRAMES = {
    shot: { sx: 123, sy: 253, sw: 8, sh: 6 },
    fade: [
        { sx: 137, sy: 250, sw: 12, sh: 12, dur: 2 },
        { sx: 154, sy: 249, sw: 13, sh: 13, dur: 2 },
        { sx: 172, sy: 248, sw: 15, sh: 15, dur: 2 },
    ],
};

// Charged shot level 1 (buster2) — looping animation frames 5-7
export const BUSTER2_FRAMES = {
    startup: [
        { sx: 138, sy: 274, sw: 15, sh: 14, dur: 2 },
        { sx: 158, sy: 269, sw: 24, sh: 24, dur: 2 },
        { sx: 187, sy: 275, sw: 28, sh: 12, dur: 2 },
        { sx: 221, sy: 277, sw: 32, sh: 8, dur: 2 },
        { sx: 260, sy: 275, sw: 38, sh: 12, dur: 2 },
    ],
    loop: [
        { sx: 303, sy: 270, sw: 36, sh: 22, dur: 3 },
        { sx: 344, sy: 275, sw: 38, sh: 12, dur: 3 },
        { sx: 388, sy: 270, sw: 40, sh: 19, dur: 3 },
    ],
    fade: [
        { sx: 434, sy: 274, sw: 15, sh: 14, dur: 2 },
        { sx: 454, sy: 269, sw: 24, sh: 24, dur: 2 },
        { sx: 487, sy: 273, sw: 16, sh: 16, dur: 2 },
        { sx: 507, sy: 269, sw: 24, sh: 24, dur: 2 },
    ],
};

// Charged shot level 2 (buster3) — looping animation frames 2-4
export const BUSTER3_FRAMES = {
    startup: [
        { sx: 148, sy: 319, sw: 14, sh: 20, dur: 2 },
        { sx: 170, sy: 321, sw: 23, sh: 16, dur: 2 },
    ],
    loop: [
        { sx: 199, sy: 313, sw: 32, sh: 32, dur: 3 },
        { sx: 239, sy: 317, sw: 27, sh: 24, dur: 3 },
        { sx: 271, sy: 313, sw: 40, sh: 32, dur: 3 },
    ],
    fade: [
        { sx: 320, sy: 319, sw: 14, sh: 20, dur: 2 },
        { sx: 341, sy: 315, sw: 24, sh: 28, dur: 2 },
        { sx: 374, sy: 315, sw: 28, sh: 28, dur: 2 },
        { sx: 406, sy: 316, sw: 26, sh: 26, dur: 2 },
    ],
};

// Charge particle sprites (from effects.png) — 8 particles orbit player while charging
export const CHARGE_PARTICLES = {
    // Level 1 charge particles (small, 2x2 shrinking to 1x1)
    1: [
        { sx: 126, sy: 282, sw: 2, sh: 2 },
        { sx: 126, sy: 282, sw: 2, sh: 2 },
        { sx: 121, sy: 283, sw: 1, sh: 1 },
        { sx: 121, sy: 283, sw: 1, sh: 1 },
    ],
    // Level 2 charge particles (medium, 4x4 shrinking to 1x1)
    2: [
        { sx: 134, sy: 327, sw: 4, sh: 4 },
        { sx: 127, sy: 328, sw: 3, sh: 3 },
        { sx: 121, sy: 329, sw: 2, sh: 2 },
        { sx: 116, sy: 330, sw: 1, sh: 1 },
    ],
};

export const ANIMATIONS = {
    idle: { loop: true, frames: [
        {sx:226, sy:29, sw:30, sh:34, dur:60},
        {sx:261, sy:29, sw:30, sh:34, dur:4},
        {sx:295, sy:29, sw:30, sh:34, dur:7},
        {sx:261, sy:29, sw:30, sh:34, dur:4},
        {sx:226, sy:29, sw:30, sh:34, dur:45},
        {sx:261, sy:29, sw:30, sh:34, dur:4},
        {sx:295, sy:29, sw:30, sh:34, dur:4},
        {sx:261, sy:29, sw:30, sh:34, dur:4},
        {sx:226, sy:29, sw:30, sh:34, dur:4},
        {sx:261, sy:29, sw:30, sh:34, dur:4},
        {sx:295, sy:29, sw:30, sh:34, dur:4},
        {sx:261, sy:29, sw:30, sh:34, dur:4},
    ] },
    run: { loop: true, frames: [
        {sx:50, sy:67, sw:20, sh:34, dur:3},
        {sx:75, sy:67, sw:23, sh:35, dur:3, ox:-2, oy:0},
        {sx:105, sy:68, sw:32, sh:34, dur:3, ox:-1, oy:0},
        {sx:145, sy:68, sw:34, sh:33, dur:3, ox:-2, oy:0},
        {sx:190, sy:68, sw:26, sh:33, dur:3, ox:-2, oy:0},
        {sx:222, sy:67, sw:22, sh:34, dur:3, ox:-1, oy:0},
        {sx:248, sy:67, sw:25, sh:35, dur:3, ox:-2, oy:0},
        {sx:280, sy:67, sw:30, sh:34, dur:3},
        {sx:318, sy:68, sw:34, sh:33, dur:3, ox:-1, oy:0},
        {sx:359, sy:68, sw:29, sh:33, dur:3, ox:-2, oy:0},
    ] },
    jump: { loop: false, frames: [
        {sx:6, sy:148, sw:24, sh:37, dur:5, ox:3, oy:0},
        {sx:37, sy:148, sw:15, sh:41, dur:5, ox:4, oy:0},
        {sx:56, sy:146, sw:19, sh:46, dur:5, ox:3, oy:0},
    ] },
    fall_start: { loop: false, frames: [
        {sx:80, sy:150, sw:23, sh:41, dur:4, ox:1, oy:-1},
    ] },
    fall: { loop: false, frames: [
        {sx:108, sy:150, sw:27, sh:42, dur:4, ox:0, oy:1},
    ] },
    wall_slide: { loop: false, frames: [
        {sx:5, sy:197, sw:25, sh:42, dur:6},
        {sx:33, sy:196, sw:27, sh:43, dur:6},
        {sx:64, sy:196, sw:28, sh:42, dur:6},
    ] },
    dash: { loop: false, frames: [
        {sx:4, sy:335, sw:28, sh:31, dur:4},
        {sx:34, sy:341, sw:38, sh:26, dur:4},
    ] },
    hurt: { loop: false, frames: [
        {sx:10, sy:392, sw:26, sh:36, dur:2},
        {sx:41, sy:394, sw:29, sh:34, dur:2},
        {sx:76, sy:394, sw:29, sh:34, dur:2},
        {sx:113, sy:384, sw:32, sh:48, dur:2},
        {sx:152, sy:394, sw:29, sh:34, dur:2},
        {sx:189, sy:384, sw:32, sh:48, dur:2},
        {sx:227, sy:394, sw:29, sh:34, dur:2},
        {sx:262, sy:384, sw:32, sh:48, dur:2},
        {sx:299, sy:394, sw:29, sh:34, dur:2},
        {sx:338, sy:393, sw:29, sh:35, dur:2},
    ] },
    // Shoot variants — hx/hy are buster hand position relative to feet-center
    shoot: { loop: false, frames: [
        {sx:365, sy:29, sw:30, sh:34, dur:4, hx:13, hy:-19},
        {sx:402, sy:29, sw:29, sh:34, dur:30, ox:-1, oy:0, hx:10, hy:-18},
    ] },
    run_shoot: { loop: true, frames: [
        {sx:41, sy:107, sw:29, sh:34, dur:3, ox:4, oy:0, hx:17, hy:-21},
        {sx:76, sy:107, sw:32, sh:35, dur:3, ox:3, oy:0, hx:17, hy:-22},
        {sx:115, sy:108, sw:35, sh:34, dur:3, ox:1, oy:0, hx:17, hy:-21},
        {sx:159, sy:108, sw:38, sh:33, dur:3, hx:17, hy:-20},
        {sx:204, sy:108, sw:34, sh:33, dur:3, ox:2, oy:0, hx:17, hy:-20},
        {sx:246, sy:107, sw:31, sh:34, dur:3, ox:3, oy:0, hx:17, hy:-20},
        {sx:284, sy:107, sw:33, sh:35, dur:3, ox:2, oy:0, hx:17, hy:-21},
        {sx:326, sy:107, sw:35, sh:34, dur:3, ox:1, oy:0, hx:17, hy:-20},
        {sx:369, sy:108, sw:37, sh:33, dur:3, hx:17, hy:-20},
        {sx:413, sy:108, sw:35, sh:33, dur:3, ox:1, oy:0, hx:18, hy:-20},
    ] },
    jump_shoot: { loop: false, frames: [
        {sx:201, sy:148, sw:29, sh:37, dur:5, ox:5, oy:0, hx:19, hy:-23},
        {sx:240, sy:148, sw:24, sh:41, dur:5, ox:9, oy:0, hx:19, hy:-28},
        {sx:271, sy:146, sw:27, sh:46, dur:5, ox:7, oy:0, hx:19, hy:-31},
    ] },
    fall_shoot: { loop: false, frames: [
        {sx:304, sy:150, sw:31, sh:41, dur:7, ox:5, oy:-1, hx:19, hy:-29},
        {sx:341, sy:150, sw:31, sh:42, dur:7, ox:5, oy:0, hx:20, hy:-30},
    ] },
    dash_shoot: { loop: false, frames: [
        {sx:76, sy:335, sw:37, sh:31, dur:4, ox:4, oy:0, hx:22, hy:-19},
        {sx:132, sy:341, sw:48, sh:26, dur:4, ox:5, oy:0, hx:26, hy:-15},
    ] },
    wall_slide_shoot: { loop: false, frames: [
        {sx:240, sy:196, sw:32, sh:42, dur:6, ox:-2, oy:0, hx:-18, hy:-22},
    ] },
    land: { loop: false, frames: [
        {sx:139, sy:151, sw:24, sh:38, dur:2},
        {sx:166, sy:153, sw:30, sh:32, dur:2},
    ] },
    die: { loop: false, frames: [
        {sx:383, sy:330, sw:26, sh:36, dur:4},
        {sx:353, sy:330, sw:26, sh:36, dur:4},
    ] },
    warp_in: { loop: false, frames: [
        {sx:19, sy:34, sw:22, sh:29, dur:4, ox:0, oy:1},
        {sx:46, sy:21, sw:30, sh:42, dur:4, ox:0, oy:1},
        {sx:84, sy:24, sw:30, sh:39, dur:4, ox:0, oy:1},
        {sx:120, sy:27, sw:30, sh:36, dur:4, ox:0, oy:1},
        {sx:156, sy:29, sw:30, sh:34, dur:4, ox:0, oy:1},
        {sx:191, sy:31, sw:30, sh:32, dur:7, ox:0, oy:1},
    ] },
    crouch: { loop: false, frames: [
        {sx:392, sy:73, sw:34, sh:27, dur:4},
    ] },
};

/**
 * Get animation data for a player state.
 * If shooting is true, returns the shoot variant (e.g. run → run_shoot).
 * Falls back to idle if state not found.
 */
export function getAnim(state, shooting = false) {
    if (shooting) {
        const shootState = SHOOT_ANIM_MAP[state];
        if (shootState && ANIMATIONS[shootState]) {
            return ANIMATIONS[shootState];
        }
    }
    return ANIMATIONS[state] || ANIMATIONS.idle;
}
