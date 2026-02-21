/**
 * zero-sprite-data.js
 * Zero character sprite definitions from zero.png spritesheet.
 * Auto-generated from MMX-Online-Deathmatch animation JSONs.
 *
 * Each frame: { sx, sy, sw, sh, dur, ox?, oy?, hx?, hy?, atkBox? }
 *   sx,sy,sw,sh = source rect on spritesheet (pixels)
 *   dur = duration in game frames (60fps)
 *   ox,oy = per-frame rendering offset
 *   hx,hy = buster hand position relative to feet-center (shoot anims only)
 *   atkBox = sword hitbox {w, h, ox, oy} relative to feet-center
 *
 * Alignment: bottom-center (sprite positioned from feet)
 */

const ZERO_SHOOT_ANIM_MAP = {
    idle: 'shoot',
    run: 'run_shoot',
    jump: 'jump_shoot',
    fall: 'fall_shoot',
    dash: 'dash_shoot',
    wall_slide: 'wall_slide_shoot',
};

export const ZERO_ANIMATIONS = {
    idle: { loop: true, frames: [
        {sx:11, sy:8, sw:38, sh:44, dur:60},
        {sx:54, sy:8, sw:38, sh:44, dur:4},
        {sx:98, sy:8, sw:38, sh:44, dur:7},
        {sx:54, sy:8, sw:38, sh:44, dur:4},
        {sx:11, sy:8, sw:38, sh:44, dur:45},
        {sx:54, sy:8, sw:38, sh:44, dur:4},
        {sx:98, sy:8, sw:38, sh:44, dur:4},
        {sx:54, sy:8, sw:38, sh:44, dur:4},
        {sx:11, sy:8, sw:38, sh:44, dur:4},
        {sx:54, sy:8, sw:38, sh:44, dur:4},
        {sx:98, sy:8, sw:38, sh:44, dur:4},
        {sx:54, sy:8, sw:38, sh:44, dur:4},
    ] },
    run: { loop: true, loopStart: 2, frames: [
        {sx:181, sy:8, sw:46, sh:44, dur:4, ox:-4},
        {sx:659, sy:10, sw:42, sh:44, dur:1, ox:-6},
        {sx:231, sy:7, sw:40, sh:45, dur:2, ox:-5},
        {sx:275, sy:8, sw:42, sh:44, dur:3},
        {sx:323, sy:10, sw:41, sh:43, dur:3},
        {sx:368, sy:10, sw:42, sh:43, dur:3, ox:-3},
        {sx:415, sy:9, sw:41, sh:44, dur:2, ox:-6},
        {sx:460, sy:8, sw:41, sh:45, dur:2, ox:-5},
        {sx:507, sy:9, sw:47, sh:44, dur:3, ox:-3},
        {sx:559, sy:7, sw:47, sh:46, dur:3},
        {sx:610, sy:11, sw:46, sh:43, dur:3, ox:-2},
        {sx:659, sy:10, sw:42, sh:44, dur:2, ox:-6},
    ] },
    jump: { loop: true, loopStart: 2, frames: [
        {sx:486, sy:517, sw:40, sh:52, dur:4, ox:-8},
        {sx:536, sy:515, sw:38, sh:52, dur:4, ox:-4},
        {sx:581, sy:520, sw:37, sh:51, dur:4, ox:-4, oy:-1},
        {sx:629, sy:522, sw:34, sh:51, dur:4, ox:-2, oy:-1},
    ] },
    fall: { loop: true, frames: [
        {sx:270, sy:178, sw:36, sh:66, dur:4, ox:-4},
        {sx:314, sy:178, sw:34, sh:67, dur:4, ox:-3},
        {sx:355, sy:179, sw:36, sh:66, dur:4, ox:-4},
        {sx:402, sy:178, sw:34, sh:67, dur:4, ox:-3},
    ] },
    land: { loop: false, frames: [
        {sx:442, sy:190, sw:34, sh:51, dur:2, ox:-2, oy:4},
        {sx:487, sy:199, sw:38, sh:42, dur:2},
    ] },
    dash: { loop: true, loopStart: 2, frames: [
        {sx:190, sy:77, sw:42, sh:42, dur:1},
        {sx:237, sy:77, sw:47, sh:49, dur:4, ox:-3, oy:7},
        {sx:426, sy:83, sw:66, sh:37, dur:2, oy:2},
        {sx:500, sy:85, sw:58, sh:35, dur:2, ox:4},
        {sx:289, sy:83, sw:66, sh:34, dur:2, oy:2},
        {sx:362, sy:85, sw:58, sh:32, dur:2, ox:4},
    ] },
    wall_slide: { loop: false, frames: [
        {sx:12, sy:310, sw:39, sh:49, dur:4, ox:-3},
        {sx:615, sy:77, sw:37, sh:49, dur:4, ox:4, oy:2},
        {sx:609, sy:966, sw:35, sh:49, dur:4, ox:-5, oy:4},
    ] },
    hurt: { loop: false, frames: [
        {sx:394, sy:371, sw:39, sh:45, dur:5},
        {sx:435, sy:371, sw:39, sh:45, dur:5},
        {sx:480, sy:370, sw:38, sh:46, dur:5},
        {sx:522, sy:365, sw:47, sh:56, dur:5, ox:-1, oy:5},
    ] },
    die: { loop: false, frames: [
        {sx:394, sy:371, sw:39, sh:45, dur:4},
        {sx:435, sy:371, sw:39, sh:45, dur:4},
        {sx:481, sy:370, sw:37, sh:46, dur:4},
    ] },
    warp_in: { loop: false, frames: [
        {sx:52, sy:1207, sw:24, sh:36, dur:2, oy:1},
        {sx:82, sy:1214, sw:29, sh:30, dur:2, ox:-1, oy:1},
        {sx:120, sy:1190, sw:46, sh:49, dur:2, oy:1},
        {sx:170, sy:1187, sw:48, sh:54, dur:2, oy:1},
        {sx:227, sy:1187, sw:48, sh:54, dur:2, oy:1},
        {sx:283, sy:1191, sw:42, sh:51, dur:2, oy:3},
        {sx:333, sy:1193, sw:27, sh:48, dur:2, ox:-2, oy:2},
        {sx:365, sy:1193, sw:26, sh:48, dur:2, ox:-2, oy:2},
        {sx:395, sy:1193, sw:28, sh:48, dur:2, ox:-2, oy:2},
        {sx:98, sy:8, sw:38, sh:44, dur:2, oy:1},
    ] },
    warp_beam: { loop: false, frames: [
        {sx:34, sy:1185, sw:7, sh:55, dur:4},
    ] },
    shoot: { loop: false, frames: [
        {sx:1143, sy:413, sw:48, sh:44, dur:4, ox:7, hx:27, hy:-23},
        {sx:1089, sy:413, sw:51, sh:44, dur:4, ox:7, hx:29, hy:-23},
    ] },
    run_shoot: { loop: true, loopStart: 2, frames: [
        {sx:1820, sy:484, sw:52, sh:44, dur:4, ox:-1, hx:25, hy:-23},
        {sx:1677, sy:411, sw:52, sh:44, dur:1, ox:-1, hx:25, hy:-24},
        {sx:1193, sy:412, sw:50, sh:45, dur:2, hx:25, hy:-25},
        {sx:1248, sy:413, sw:46, sh:44, dur:3, ox:2, hx:25, hy:-24},
        {sx:1302, sy:414, sw:45, sh:43, dur:3, ox:2, hx:25, hy:-23},
        {sx:1352, sy:412, sw:49, sh:43, dur:3, hx:25, hy:-23},
        {sx:1406, sy:411, sw:51, sh:44, dur:2, ox:-1, hx:25, hy:-24},
        {sx:1462, sy:410, sw:50, sh:45, dur:2, hx:25, hy:-25},
        {sx:1516, sy:411, sw:51, sh:44, dur:3, ox:-1, hx:25, hy:-24},
        {sx:1572, sy:409, sw:48, sh:46, dur:3, ox:1, hx:25, hy:-23},
        {sx:1624, sy:412, sw:50, sh:43, dur:3, hx:25, hy:-23},
        {sx:1677, sy:411, sw:52, sh:44, dur:2, ox:-1, hx:25, hy:-24},
    ] },
    jump_shoot: { loop: false, frames: [
        {sx:949, sy:485, sw:43, sh:51, dur:4, ox:-1, oy:-1, hx:20, hy:-33},
        {sx:997, sy:484, sw:40, sh:51, dur:4, ox:1, oy:-1, hx:20, hy:-33},
        {sx:1042, sy:483, sw:44, sh:52, dur:4, ox:-2, hx:19, hy:-33},
    ] },
    fall_shoot: { loop: true, frames: [
        {sx:1097, sy:472, sw:45, sh:66, dur:4, hx:23, hy:-34},
        {sx:1148, sy:470, sw:43, sh:67, dur:4, ox:1, hx:23, hy:-34},
        {sx:1097, sy:472, sw:45, sh:66, dur:4, hx:23, hy:-34},
    ] },
    dash_shoot: { loop: true, loopStart: 2, frames: [
        {sx:1253, sy:487, sw:50, sh:42, dur:1, ox:4, hx:43, hy:-13},
        {sx:1305, sy:485, sw:55, sh:49, dur:4, ox:1, oy:7, hx:43, hy:-13},
        {sx:1515, sy:490, sw:76, sh:37, dur:2, ox:5, oy:2, hx:43, hy:-13},
        {sx:1597, sy:488, sw:68, sh:35, dur:2, ox:9, hx:43, hy:-13},
        {sx:1363, sy:492, sw:76, sh:34, dur:2, ox:5, oy:2, hx:43, hy:-13},
        {sx:1443, sy:493, sw:68, sh:32, dur:2, ox:9, hx:43, hy:-13},
    ] },
    wall_slide_shoot: { loop: false, frames: [
        {sx:1771, sy:481, sw:39, sh:49, dur:4, ox:-7, oy:4, hx:-26, hy:-20},
    ] },
    attack: { loop: false, frames: [
        {sx:63, sy:709, sw:40, sh:44, dur:2},
        {sx:111, sy:710, sw:38, sh:44, dur:2, ox:1},
        {sx:242, sy:711, sw:42, sh:44, dur:2, ox:-1},
        {sx:293, sy:710, sw:42, sh:43, dur:2, ox:-1},
        {sx:349, sy:700, sw:44, sh:53, dur:2, ox:4, atkBox:{w:27,h:28,ox:8,oy:-26}},
        {sx:399, sy:700, sw:66, sh:53, dur:2, ox:15, atkBox:{w:33,h:36,ox:29,oy:-17}},
        {sx:474, sy:703, sw:82, sh:52, dur:4, ox:23, atkBox:{w:44,h:33,ox:42,oy:-3}},
        {sx:559, sy:713, sw:72, sh:41, dur:2, ox:18, oy:1, atkBox:{w:34,h:14,ox:40,oy:2}},
        {sx:637, sy:713, sw:62, sh:40, dur:2, ox:13},
        {sx:707, sy:713, sw:58, sh:40, dur:2, ox:11},
        {sx:771, sy:714, sw:46, sh:40, dur:2, ox:5},
        {sx:823, sy:714, sw:42, sh:40, dur:2, ox:3},
    ] },
    attack2: { loop: false, frames: [
        {sx:871, sy:777, sw:48, sh:39, dur:4, ox:6},
        {sx:807, sy:776, sw:58, sh:41, dur:4, ox:11},
        {sx:729, sy:771, sw:74, sh:43, dur:2, ox:19, atkBox:{w:50,h:11,ox:29,oy:-13}},
        {sx:631, sy:771, sw:86, sh:43, dur:2, ox:14, atkBox:{w:40,h:13,ox:36,oy:-11}},
        {sx:569, sy:773, sw:58, sh:43, dur:2, ox:-9, atkBox:{w:20,h:12,ox:-28,oy:-10}},
        {sx:505, sy:775, sw:60, sh:43, dur:2, ox:-9},
        {sx:441, sy:775, sw:58, sh:43, dur:2, ox:-7},
        {sx:383, sy:774, sw:52, sh:43, dur:2, ox:-6},
        {sx:331, sy:776, sw:46, sh:43, dur:2, ox:-2},
        {sx:278, sy:774, sw:42, sh:43, dur:2},
        {sx:224, sy:773, sw:40, sh:43, dur:2, ox:1},
    ] },
    attack3: { loop: false, frames: [
        {sx:152, sy:839, sw:42, sh:43, dur:2, ox:-1},
        {sx:250, sy:839, sw:40, sh:44, dur:2},
        {sx:201, sy:838, sw:42, sh:44, dur:2, ox:-1},
        {sx:292, sy:834, sw:48, sh:49, dur:2, ox:-2},
        {sx:348, sy:830, sw:82, sh:54, dur:2, ox:23, atkBox:{w:52,h:43,ox:36,oy:-11}},
        {sx:433, sy:827, sw:86, sh:59, dur:2, ox:25, oy:5, atkBox:{w:55,h:51,ox:40,oy:3}},
        {sx:530, sy:839, sw:88, sh:51, dur:2, ox:26, oy:6, atkBox:{w:55,h:41,ox:42,oy:5}},
        {sx:621, sy:836, sw:88, sh:53, dur:2, ox:26, oy:6, atkBox:{w:55,h:25,ox:42,oy:5}},
        {sx:712, sy:840, sw:60, sh:51, dur:2, ox:12, oy:6},
        {sx:779, sy:848, sw:48, sh:49, dur:2, ox:6, oy:6},
        {sx:9, sy:893, sw:44, sh:40, dur:2, ox:4, oy:2},
        {sx:65, sy:896, sw:44, sh:38, dur:2, ox:4},
        {sx:119, sy:896, sw:44, sh:38, dur:2, ox:4},
        {sx:173, sy:897, sw:44, sh:38, dur:2, ox:4},
        {sx:225, sy:894, sw:38, sh:41, dur:2, ox:1},
    ] },
    attack_air: { loop: false, frames: [
        {sx:417, sy:1020, sw:29, sh:64, dur:2},
        {sx:461, sy:1020, sw:38, sh:63, dur:2, ox:-1},
        {sx:504, sy:1032, sw:40, sh:51, dur:2, ox:-5},
        {sx:549, sy:1031, sw:42, sh:51, dur:2, ox:-4, oy:-1},
        {sx:599, sy:1035, sw:58, sh:50, dur:2, ox:4, oy:-1, atkBox:{w:21,h:25,ox:22,oy:-26}},
        {sx:663, sy:1031, sw:69, sh:50, dur:2, ox:9, atkBox:{w:55,h:16,ox:16,oy:-11}},
        {sx:738, sy:1027, sw:82, sh:55, dur:2, ox:14, oy:-1, atkBox:{w:71,h:18,ox:19,oy:-3}},
        {sx:831, sy:1021, sw:49, sh:62, dur:2, ox:-5, oy:-1},
        {sx:884, sy:1020, sw:47, sh:63, dur:2, ox:-4, oy:-1},
    ] },
};

/**
 * Get animation data for Zero.
 * If shooting is true, returns the shoot variant.
 * Falls back to idle if state not found.
 */
export function getZeroAnim(state, shooting = false) {
    if (shooting) {
        const shootState = ZERO_SHOOT_ANIM_MAP[state];
        if (shootState && ZERO_ANIMATIONS[shootState]) {
            return ZERO_ANIMATIONS[shootState];
        }
    }
    return ZERO_ANIMATIONS[state] || ZERO_ANIMATIONS.idle;
}
