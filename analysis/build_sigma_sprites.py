#!/usr/bin/env python3
"""
Generate sigma-sprite-data.js from MMX-Online-Deathmatch sprite JSONs.
Reads each JSON, converts rects/durations/offsets/POIs into our game format.

Sigma is a sword-based character (like Zero) but bigger, with projectile slash.
His attack JSONs don't have hitbox data, so we define atkBox manually.
"""

import json
import os

SPRITES_DIR = os.path.join(os.path.dirname(__file__), '..', 'MMX-Online-Deathmatch', 'LevelEditor', 'assets', 'sprites')

# Animations we need for the platformer
ANIMS = {
    # Movement
    'idle':       'sigma_idle.json',
    'run':        'sigma_run.json',
    'jump':       'sigma_jump.json',
    'fall':       'sigma_fall.json',
    'land':       'sigma_land.json',
    'dash':       'sigma_dash.json',
    'wall_slide': 'sigma_wall_slide.json',
    'hurt':       'sigma_hurt.json',
    'die':        'sigma_die.json',
    'warp_in':    'sigma_warp_in.json',
    'warp_beam':  'sigma_warp_beam.json',
    # Shoot (projectile slash firing pose)
    'shoot':      'sigma_shoot.json',
    # Sword attacks
    'attack':      'sigma_attack.json',
    'attack_air':  'sigma_attack_air.json',
    'attack_dash': 'sigma_attack_dash.json',
    # Wall attacks
    'wall_slide_attack': 'sigma_wall_slide_attack.json',
    # Projectile sprite
    'proj_slash':  'sigma_proj_slash.json',
}

# Manual atkBox definitions for attack frames (JSONs have none).
# Format: { anim_key: { frame_index: {w, h, ox, oy} } }
# ox is positive = forward (will be multiplied by facing at runtime)
MANUAL_ATK_BOXES = {
    'attack': {
        # frames 0-1 are windup, 2-3 are the swing
        2: {'w': 23, 'h': 40, 'ox': 30, 'oy': -32},
        3: {'w': 23, 'h': 40, 'ox': 30, 'oy': -32},
    },
    'attack_air': {
        # frames 0-1 are windup, 2-3 are the swing
        2: {'w': 23, 'h': 40, 'ox': 23, 'oy': -42},
        3: {'w': 23, 'h': 40, 'ox': 23, 'oy': -42},
    },
    'attack_dash': {
        # frame 0 is the slash start, frame 1 is follow-through
        0: {'w': 23, 'h': 40, 'ox': 21, 'oy': -33},
        1: {'w': 23, 'h': 40, 'ox': 21, 'oy': -33},
    },
    'wall_slide_attack': {
        # frames 3-6 are the active swing (frame 4 has hitbox in JSON)
        3: {'w': 48, 'h': 53, 'ox': 53, 'oy': 3},
        4: {'w': 48, 'h': 53, 'ox': 53, 'oy': 3},
        5: {'w': 48, 'h': 53, 'ox': 53, 'oy': 3},
        6: {'w': 48, 'h': 53, 'ox': 53, 'oy': 3},
    },
}

# Manual duration overrides — JSON hold frames (0.499s) are way too long for gameplay.
# Format: { anim_key: { frame_index: dur_in_game_frames } }
MANUAL_DURATIONS = {
    'attack': {
        0: 2,   # Windup 1 (was 4)
        1: 2,   # Windup 2 (was 4)
        2: 3,   # Swing (was 2)
        3: 10,  # Hold (was 30)
    },
    'attack_air': {
        2: 3,   # Swing (was 2)
        3: 10,  # Hold (was 30)
    },
    'attack_dash': {
        0: 3,   # Slash (was 4)
        1: 10,  # Hold (was 30)
    },
}

def load_json(filename):
    path = os.path.join(SPRITES_DIR, filename)
    with open(path) as f:
        return json.load(f)

def convert_anim(name, data):
    wrap = data.get('wrapMode', 'once')
    loop_start = data.get('loopStartFrame', 0)
    is_loop = wrap == 'loop'

    frames = []
    for i, fr in enumerate(data['frames']):
        rect = fr['rect']
        tl = rect['topLeftPoint']
        br = rect['botRightPoint']
        sx = int(tl['x'])
        sy = int(tl['y'])
        sw = int(br['x']) - sx
        sh = int(br['y']) - sy

        # Duration: seconds -> game frames at 60fps (minimum 1)
        dur_sec = fr.get('duration', 0.066)
        dur = max(1, round(dur_sec * 60))

        # Manual duration overrides
        if name in MANUAL_DURATIONS and i in MANUAL_DURATIONS[name]:
            dur = MANUAL_DURATIONS[name][i]

        # Offset
        offset = fr.get('offset', {})
        ox = int(round(offset.get('x', 0)))
        oy = int(round(offset.get('y', 0)))

        frame_data = {'sx': sx, 'sy': sy, 'sw': sw, 'sh': sh, 'dur': dur}
        if ox != 0: frame_data['ox'] = ox
        if oy != 0: frame_data['oy'] = oy

        # POIs — look for projectile spawn (empty tag "") and head ("h" tag)
        pois = fr.get('POIs', [])
        for poi in pois:
            tag = poi.get('tags', '')
            if tag == '':
                # Projectile spawn position
                px = int(round(poi.get('x', 0)))
                py = int(round(poi.get('y', 0)))
                frame_data['hx'] = px
                frame_data['hy'] = py
            elif tag == 'h' and 'hx' not in frame_data:
                # Use head POI as fallback for projectile spawn
                pass

        # Hitboxes from JSON (flag 0 = damage hitbox)
        hitboxes = fr.get('hitboxes', [])
        active_hitboxes = [h for h in hitboxes if h.get('flag', 0) == 0]
        if active_hitboxes:
            hb = active_hitboxes[0]
            hb_offset = hb.get('offset', {})
            frame_data['atkBox'] = {
                'w': int(round(hb.get('width', 0))),
                'h': int(round(hb.get('height', 0))),
                'ox': int(round(hb_offset.get('x', 0))),
                'oy': int(round(hb_offset.get('y', 0))),
            }

        # Manual atkBox overrides (for attacks without JSON hitboxes)
        if name in MANUAL_ATK_BOXES and i in MANUAL_ATK_BOXES[name]:
            frame_data['atkBox'] = MANUAL_ATK_BOXES[name][i]

        frames.append(frame_data)

    return {
        'loop': is_loop,
        'loopStart': loop_start if is_loop and loop_start > 0 else None,
        'frames': frames,
    }

def format_frame(f):
    parts = [f"sx:{f['sx']}", f"sy:{f['sy']}", f"sw:{f['sw']}", f"sh:{f['sh']}", f"dur:{f['dur']}"]
    if 'ox' in f: parts.append(f"ox:{f['ox']}")
    if 'oy' in f: parts.append(f"oy:{f['oy']}")
    if 'hx' in f: parts.append(f"hx:{f['hx']}")
    if 'hy' in f: parts.append(f"hy:{f['hy']}")
    base = '{' + ', '.join(parts) + '}'
    if 'atkBox' in f:
        ab = f['atkBox']
        base = base[:-1] + f", atkBox:{{w:{ab['w']},h:{ab['h']},ox:{ab['ox']},oy:{ab['oy']}}}}}"
    return base

def main():
    lines = []
    lines.append('/**')
    lines.append(' * sigma-sprite-data.js')
    lines.append(' * Sigma character sprite definitions from sigma.png (sigma_x1) spritesheet.')
    lines.append(' * Auto-generated from MMX-Online-Deathmatch animation JSONs.')
    lines.append(' *')
    lines.append(' * Each frame: { sx, sy, sw, sh, dur, ox?, oy?, hx?, hy?, atkBox? }')
    lines.append(' *   sx,sy,sw,sh = source rect on spritesheet (pixels)')
    lines.append(' *   dur = duration in game frames (60fps)')
    lines.append(' *   ox,oy = per-frame rendering offset')
    lines.append(' *   hx,hy = projectile spawn position relative to feet-center')
    lines.append(' *   atkBox = sword hitbox {w, h, ox, oy} relative to feet-center')
    lines.append(' *')
    lines.append(' * Alignment: bottom-center (sprite positioned from feet)')
    lines.append(' */')
    lines.append('')

    lines.append('export const SIGMA_ANIMATIONS = {')

    for name, filename in ANIMS.items():
        try:
            data = load_json(filename)
        except FileNotFoundError:
            print(f"WARNING: {filename} not found, skipping")
            continue

        anim = convert_anim(name, data)
        loop_str = 'true' if anim['loop'] else 'false'

        loop_start_str = f", loopStart: {anim['loopStart']}" if anim['loopStart'] else ''
        lines.append(f"    {name}: {{ loop: {loop_str}{loop_start_str}, frames: [")
        for i, f in enumerate(anim['frames']):
            comma = ','
            lines.append(f"        {format_frame(f)}{comma}")
        lines.append(f"    ] }},")

    lines.append('};')
    lines.append('')

    # getSigmaAnim function
    lines.append('/**')
    lines.append(' * Get animation data for Sigma.')
    lines.append(' * Sigma has no separate shoot overlays — shoot is a distinct pose.')
    lines.append(' * Falls back to idle if state not found.')
    lines.append(' */')
    lines.append('export function getSigmaAnim(state) {')
    lines.append('    return SIGMA_ANIMATIONS[state] || SIGMA_ANIMATIONS.idle;')
    lines.append('}')

    output = '\n'.join(lines) + '\n'

    out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'entities', 'sigma-sprite-data.js')
    with open(out_path, 'w') as f:
        f.write(output)

    print(f"Generated {out_path}")
    print(f"Animations: {len(ANIMS)}")
    for name in ANIMS:
        try:
            data = load_json(ANIMS[name])
            print(f"  {name}: {len(data['frames'])} frames")
        except:
            print(f"  {name}: MISSING")

if __name__ == '__main__':
    main()
