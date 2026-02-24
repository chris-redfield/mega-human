/**
 * sigma-sprite-data.js
 * Sigma character sprite definitions from sigma.png (sigma_x1) spritesheet.
 * Auto-generated from MMX-Online-Deathmatch animation JSONs.
 *
 * Each frame: { sx, sy, sw, sh, dur, ox?, oy?, hx?, hy?, atkBox? }
 *   sx,sy,sw,sh = source rect on spritesheet (pixels)
 *   dur = duration in game frames (60fps)
 *   ox,oy = per-frame rendering offset
 *   hx,hy = projectile spawn position relative to feet-center
 *   atkBox = sword hitbox {w, h, ox, oy} relative to feet-center
 *
 * Alignment: bottom-center (sprite positioned from feet)
 */

export const SIGMA_ANIMATIONS = {
    idle: { loop: true, frames: [
        {sx:255, sy:413, sw:75, sh:61, dur:6, ox:16},
        {sx:174, sy:411, sw:75, sh:63, dur:6, ox:16},
        {sx:93, sy:413, sw:75, sh:61, dur:6, ox:16},
        {sx:12, sy:414, sw:75, sh:60, dur:6, ox:16},
    ] },
    run: { loop: true, frames: [
        {sx:48, sy:134, sw:64, sh:56, dur:3, ox:-11, oy:1},
        {sx:116, sy:135, sw:64, sh:56, dur:3, ox:-11},
        {sx:187, sy:137, sw:69, sh:54, dur:3, ox:-9, oy:-3},
        {sx:263, sy:136, sw:68, sh:55, dur:3, ox:-9, oy:-1},
        {sx:334, sy:136, sw:64, sh:55, dur:3, ox:-11},
        {sx:403, sy:135, sw:64, sh:55, dur:3, ox:-11, oy:1},
        {sx:472, sy:137, sw:64, sh:54, dur:3, ox:-11, oy:-1},
        {sx:542, sy:139, sw:68, sh:54, dur:3, ox:-9, oy:-2},
        {sx:611, sy:138, sw:68, sh:53, dur:3, ox:-9, oy:-2},
        {sx:47, sy:197, sw:66, sh:54, dur:3, ox:-10},
    ] },
    jump: { loop: false, frames: [
        {sx:473, sy:409, sw:59, sh:62, dur:4, ox:-10},
    ] },
    fall: { loop: true, frames: [
        {sx:473, sy:409, sw:59, sh:62, dur:4, ox:-10},
    ] },
    land: { loop: false, frames: [
        {sx:12, sy:414, sw:75, sh:60, dur:4, ox:16},
    ] },
    dash: { loop: true, frames: [
        {sx:727, sy:427, sw:59, sh:46, dur:4, ox:-10},
    ] },
    wall_slide: { loop: false, frames: [
        {sx:342, sy:72, sw:43, sh:57, dur:4, ox:-9, oy:2},
        {sx:390, sy:70, sw:38, sh:59, dur:4, ox:-6, oy:2},
        {sx:975, sy:76, sw:41, sh:57, dur:4, ox:-6, oy:2},
    ] },
    hurt: { loop: false, frames: [
        {sx:781, sy:354, sw:47, sh:61, dur:5},
        {sx:781, sy:354, sw:47, sh:61, dur:5},
        {sx:832, sy:351, sw:49, sh:63, dur:5, oy:1},
        {sx:832, sy:351, sw:49, sh:63, dur:5, oy:1},
    ] },
    die: { loop: false, frames: [
        {sx:83, sy:68, sw:47, sh:61, dur:4, ox:2, oy:4},
    ] },
    warp_in: { loop: false, frames: [
        {sx:192, sy:3, sw:58, sh:60, dur:4, ox:-8},
        {sx:255, sy:3, sw:62, sh:60, dur:4, ox:-10},
        {sx:322, sy:3, sw:45, sh:60, dur:12, ox:-7, hx:-28, hy:-51},
        {sx:372, sy:3, sw:38, sh:60, dur:2, ox:-3},
        {sx:592, sy:8, sw:58, sh:55, dur:2, ox:5},
        {sx:592, sy:8, sw:58, sh:55, dur:2, ox:5},
    ] },
    warp_beam: { loop: false, frames: [
        {sx:192, sy:3, sw:58, sh:60, dur:4, ox:-8},
    ] },
    shoot: { loop: true, frames: [
        {sx:68, sy:496, sw:75, sh:61, dur:7, ox:16, hx:4, hy:-52},
        {sx:149, sy:494, sw:75, sh:63, dur:7, ox:15, hx:3, hy:-51},
    ] },
    attack: { loop: false, frames: [
        {sx:924, sy:425, sw:48, sh:54, dur:2},
        {sx:863, sy:425, sw:56, sh:54, dur:2, ox:-4},
        {sx:396, sy:485, sw:64, sh:72, dur:3, ox:11, atkBox:{w:23,h:40,ox:30,oy:-32}},
        {sx:327, sy:485, sw:63, sh:72, dur:10, ox:10, atkBox:{w:23,h:40,ox:30,oy:-32}},
    ] },
    attack_air: { loop: false, frames: [
        {sx:473, sy:409, sw:59, sh:62, dur:2, ox:-10},
        {sx:625, sy:503, sw:56, sh:63, dur:2, ox:8},
        {sx:479, sy:481, sw:52, sh:84, dur:3, ox:7, atkBox:{w:23,h:40,ox:23,oy:-42}},
        {sx:548, sy:481, sw:53, sh:84, dur:10, ox:7, atkBox:{w:23,h:40,ox:23,oy:-42}},
    ] },
    attack_dash: { loop: false, frames: [
        {sx:396, sy:485, sw:64, sh:72, dur:3, atkBox:{w:23,h:40,ox:21,oy:-33}},
        {sx:327, sy:485, sw:63, sh:72, dur:10, ox:-1, atkBox:{w:23,h:40,ox:21,oy:-33}},
    ] },
    wall_slide_attack: { loop: false, frames: [
        {sx:974, sy:76, sw:43, sh:58, dur:2, ox:-6, oy:3},
        {sx:929, sy:72, sw:41, sh:61, dur:2, ox:-6, oy:2},
        {sx:726, sy:138, sw:40, sh:61, dur:2, ox:-6, oy:2},
        {sx:885, sy:72, sw:39, sh:61, dur:2, ox:-7, oy:2, atkBox:{w:48,h:53,ox:53,oy:3}},
        {sx:788, sy:68, sw:92, sh:65, dur:2, ox:-33, oy:6, atkBox:{w:48,h:53,ox:53,oy:3}},
        {sx:696, sy:68, sw:87, sh:65, dur:2, ox:-31, oy:6, atkBox:{w:48,h:53,ox:53,oy:3}},
        {sx:625, sy:72, sw:66, sh:61, dur:2, ox:-20, oy:2, atkBox:{w:48,h:53,ox:53,oy:3}},
        {sx:696, sy:68, sw:87, sh:65, dur:2, ox:-31, oy:6},
        {sx:625, sy:72, sw:66, sh:61, dur:2, ox:-20, oy:2},
        {sx:565, sy:72, sw:55, sh:61, dur:2, ox:-15, oy:2},
        {sx:772, sy:270, sw:39, sh:61, dur:2, ox:-7, oy:2},
        {sx:517, sy:68, sw:41, sh:61, dur:2, ox:-6, oy:2},
    ] },
    proj_slash: { loop: false, frames: [
        {sx:240, sy:493, sw:79, sh:50, dur:4},
    ] },
};

/**
 * Get animation data for Sigma.
 * Sigma has no separate shoot overlays — shoot is a distinct pose.
 * Falls back to idle if state not found.
 */
export function getSigmaAnim(state) {
    return SIGMA_ANIMATIONS[state] || SIGMA_ANIMATIONS.idle;
}
