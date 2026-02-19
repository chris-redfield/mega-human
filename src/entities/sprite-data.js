/**
 * sprite-data.js
 * Player character sprite definitions from XDefault.png spritesheet.
 * AUTO-GENERATED from MMX-Online-Deathmatch animation JSONs.
 *
 * Each frame: { sx, sy, sw, sh, dur, ox, oy, hx?, hy? }
 *   sx,sy,sw,sh = source rect on spritesheet (pixels)
 *   dur = duration in game frames (60fps)
 *   ox,oy = per-frame rendering offset
 *   hx,hy = buster hand position (for projectile spawn, optional)
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

export const ANIMATIONS = {
    idle: { loop: true, frames: [
        {sx:226, sy:29, sw:30, sh:34, dur:60, hx:4, hy:-27},
        {sx:261, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:295, sy:29, sw:30, sh:34, dur:7, hx:4, hy:-27},
        {sx:261, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:226, sy:29, sw:30, sh:34, dur:45, hx:4, hy:-27},
        {sx:261, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:295, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:261, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:226, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:261, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:295, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
        {sx:261, sy:29, sw:30, sh:34, dur:4, hx:4, hy:-27},
    ] },
    run: { loop: true, frames: [
        {sx:50, sy:67, sw:20, sh:34, dur:3, hx:4, hy:-27},
        {sx:75, sy:67, sw:23, sh:35, dur:3, ox:-2, oy:0, hx:4, hy:-28},
        {sx:105, sy:68, sw:32, sh:34, dur:3, ox:-1, oy:0, hx:4, hy:-26},
        {sx:145, sy:68, sw:34, sh:33, dur:3, ox:-2, oy:0, hx:4, hy:-26},
        {sx:190, sy:68, sw:26, sh:33, dur:3, ox:-2, oy:0, hx:4, hy:-25},
        {sx:222, sy:67, sw:22, sh:34, dur:3, ox:-1, oy:0, hx:4, hy:-26},
        {sx:248, sy:67, sw:25, sh:35, dur:3, ox:-2, oy:0, hx:3, hy:-27},
        {sx:280, sy:67, sw:30, sh:34, dur:3, hx:4, hy:-26},
        {sx:318, sy:68, sw:34, sh:33, dur:3, ox:-1, oy:0, hx:3, hy:-25},
        {sx:359, sy:68, sw:29, sh:33, dur:3, ox:-2, oy:0, hx:3, hy:-26},
    ] },
    jump: { loop: false, frames: [{sx:6, sy:148, sw:24, sh:37, dur:5, ox:3, oy:0, hx:2, hy:-29}, {sx:37, sy:148, sw:15, sh:41, dur:5, ox:4, oy:0, hx:4, hy:-32}, {sx:56, sy:146, sw:19, sh:46, dur:5, ox:3, oy:0, hx:4, hy:-34}] },
    fall_start: { loop: false, frames: [{sx:80, sy:150, sw:23, sh:41, dur:4, ox:1, oy:-1, hx:4, hy:-33}] },
    fall: { loop: false, frames: [{sx:108, sy:150, sw:27, sh:42, dur:4, ox:0, oy:1, hx:3, hy:-32}] },
    wall_slide: { loop: false, frames: [{sx:5, sy:197, sw:25, sh:42, dur:6, hx:1, hy:-32}, {sx:33, sy:196, sw:27, sh:43, dur:6, hx:-2, hy:-30}, {sx:64, sy:196, sw:28, sh:42, dur:6, hx:-3, hy:-29}] },
    dash: { loop: false, frames: [{sx:4, sy:335, sw:28, sh:31, dur:4, hx:7, hy:-23}, {sx:34, sy:341, sw:38, sh:26, dur:4, hx:13, hy:-18}] },
    hurt: { loop: false, frames: [
        {sx:10, sy:392, sw:26, sh:36, dur:2, hx:-4, hy:-28},
        {sx:41, sy:394, sw:29, sh:34, dur:2, hx:-6, hy:-26},
        {sx:76, sy:394, sw:29, sh:34, dur:2, hx:-6, hy:-26},
        {sx:113, sy:384, sw:32, sh:48, dur:2, hx:-7, hy:-30},
        {sx:152, sy:394, sw:29, sh:34, dur:2, hx:-6, hy:-26},
        {sx:189, sy:384, sw:32, sh:48, dur:2, hx:-6, hy:-30},
        {sx:227, sy:394, sw:29, sh:34, dur:2, hx:-6, hy:-27},
        {sx:262, sy:384, sw:32, sh:48, dur:2, hx:-7, hy:-30},
        {sx:299, sy:394, sw:29, sh:34, dur:2, hx:-6, hy:-26},
        {sx:338, sy:393, sw:29, sh:35, dur:2, hx:-6, hy:-26},
    ] },
    shoot: { loop: false, frames: [{sx:365, sy:29, sw:30, sh:34, dur:4, hx:0, hy:-27}, {sx:402, sy:29, sw:29, sh:34, dur:30, ox:-1, oy:0, hx:-1, hy:-27}] },
    run_shoot: { loop: true, frames: [
        {sx:41, sy:107, sw:29, sh:34, dur:3, ox:4, oy:0, hx:4, hy:-27},
        {sx:76, sy:107, sw:32, sh:35, dur:3, ox:3, oy:0, hx:3, hy:-27},
        {sx:115, sy:108, sw:35, sh:34, dur:3, ox:1, oy:0, hx:3, hy:-26},
        {sx:159, sy:108, sw:38, sh:33, dur:3, hx:4, hy:-25},
        {sx:204, sy:108, sw:34, sh:33, dur:3, ox:2, oy:0, hx:3, hy:-25},
        {sx:246, sy:107, sw:31, sh:34, dur:3, ox:3, oy:0, hx:3, hy:-26},
        {sx:284, sy:107, sw:33, sh:35, dur:3, ox:2, oy:0, hx:4, hy:-28},
        {sx:326, sy:107, sw:35, sh:34, dur:3, ox:1, oy:0, hx:3, hy:-27},
        {sx:369, sy:108, sw:37, sh:33, dur:3, hx:4, hy:-26},
        {sx:413, sy:108, sw:35, sh:33, dur:3, ox:1, oy:0, hx:4, hy:-26},
    ] },
    jump_shoot: { loop: false, frames: [{sx:201, sy:148, sw:29, sh:37, dur:5, ox:5, oy:0, hx:3, hy:-29}, {sx:240, sy:148, sw:24, sh:41, dur:5, ox:9, oy:0, hx:4, hy:-31}, {sx:271, sy:146, sw:27, sh:46, dur:5, ox:7, oy:0, hx:4, hy:-35}] },
    fall_shoot: { loop: false, frames: [{sx:304, sy:150, sw:31, sh:41, dur:7, ox:5, oy:-1, hx:5, hy:-33}, {sx:341, sy:150, sw:31, sh:42, dur:7, ox:5, oy:0, hx:5, hy:-30}] },
    dash_shoot: { loop: false, frames: [{sx:76, sy:335, sw:37, sh:31, dur:4, ox:4, oy:0, hx:7, hy:-23}, {sx:132, sy:341, sw:48, sh:26, dur:4, ox:5, oy:0, hx:12, hy:-19}] },
    wall_slide_shoot: { loop: false, frames: [{sx:240, sy:196, sw:32, sh:42, dur:6, ox:-2, oy:0, hx:-4, hy:-29}] },
    land: { loop: false, frames: [{sx:139, sy:151, sw:24, sh:38, dur:2, hx:0, hy:-30}, {sx:166, sy:153, sw:30, sh:32, dur:2, hx:4, hy:-25}] },
    die: { loop: false, frames: [{sx:383, sy:330, sw:26, sh:36, dur:4}, {sx:353, sy:330, sw:26, sh:36, dur:4}] },
    warp_in: { loop: false, frames: [
        {sx:19, sy:34, sw:22, sh:29, dur:4, ox:0, oy:1},
        {sx:46, sy:21, sw:30, sh:42, dur:4, ox:0, oy:1},
        {sx:84, sy:24, sw:30, sh:39, dur:4, ox:0, oy:1},
        {sx:120, sy:27, sw:30, sh:36, dur:4, ox:0, oy:1},
        {sx:156, sy:29, sw:30, sh:34, dur:4, ox:0, oy:1},
        {sx:191, sy:31, sw:30, sh:32, dur:7, ox:0, oy:1},
    ] },
    crouch: { loop: false, frames: [{sx:392, sy:73, sw:34, sh:27, dur:4, hx:8, hy:-19}] },
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

