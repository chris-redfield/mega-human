#!/usr/bin/env python3
"""
Generate zero-sprite-data.js from MMX-Online-Deathmatch sprite JSONs.
Reads each JSON, converts rects/durations/offsets/POIs into our game format.
"""

import json
import os
import math

SPRITES_DIR = os.path.join(os.path.dirname(__file__), '..', 'MMX-Online-Deathmatch', 'LevelEditor', 'assets', 'sprites')

# Animations we need for the platformer
ANIMS = {
    # Movement
    'idle':       'zero_idle.json',
    'run':        'zero_run.json',
    'jump':       'zero_jump.json',
    'fall':       'zero_fall.json',
    'land':       'zero_land.json',
    'dash':       'zero_dash.json',
    'wall_slide': 'zero_wall_slide.json',
    'hurt':       'zero_hurt.json',
    'die':        'zero_die.json',
    'warp_in':    'zero_warp_in.json',
    'warp_beam':  'zero_warp_beam.json',
    # Shoot overlays
    'shoot':             'zero_shoot.json',
    'run_shoot':         'zero_run_shoot.json',
    'jump_shoot':        'zero_jump_shoot.json',
    'fall_shoot':        'zero_fall_shoot.json',
    'dash_shoot':        'zero_dash_shoot.json',
    'wall_slide_shoot':  'zero_wall_slide_shoot.json',
    # Sword attacks
    'attack':      'zero_attack.json',
    'attack2':     'zero_attack2.json',
    'attack3':     'zero_attack3.json',
    'attack_air':  'zero_attack_air.json',
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

        # Offset
        offset = fr.get('offset', {})
        ox = int(round(offset.get('x', 0)))
        oy = int(round(offset.get('y', 0)))

        frame_data = {'sx': sx, 'sy': sy, 'sw': sw, 'sh': sh, 'dur': dur}
        if ox != 0: frame_data['ox'] = ox
        if oy != 0: frame_data['oy'] = oy

        # POIs — look for buster hand position ("b" tag)
        pois = fr.get('POIs', [])
        for poi in pois:
            tag = poi.get('tags', '')
            if tag == 'b':
                hx = int(round(poi.get('x', 0)))
                hy = int(round(poi.get('y', 0)))
                frame_data['hx'] = hx
                frame_data['hy'] = hy

        # Hitboxes for sword attacks
        hitboxes = fr.get('hitboxes', [])
        active_hitboxes = [h for h in hitboxes if h.get('flag', 0) == 0]  # flag 0 = damage hitbox
        if active_hitboxes:
            # Take the first/primary hitbox
            hb = active_hitboxes[0]
            hb_offset = hb.get('offset', {})
            frame_data['atkBox'] = {
                'w': int(round(hb.get('width', 0))),
                'h': int(round(hb.get('height', 0))),
                'ox': int(round(hb_offset.get('x', 0))),
                'oy': int(round(hb_offset.get('y', 0))),
            }

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
    lines.append(' * zero-sprite-data.js')
    lines.append(' * Zero character sprite definitions from zero.png spritesheet.')
    lines.append(' * Auto-generated from MMX-Online-Deathmatch animation JSONs.')
    lines.append(' *')
    lines.append(' * Each frame: { sx, sy, sw, sh, dur, ox?, oy?, hx?, hy?, atkBox? }')
    lines.append(' *   sx,sy,sw,sh = source rect on spritesheet (pixels)')
    lines.append(' *   dur = duration in game frames (60fps)')
    lines.append(' *   ox,oy = per-frame rendering offset')
    lines.append(' *   hx,hy = buster hand position relative to feet-center (shoot anims only)')
    lines.append(' *   atkBox = sword hitbox {w, h, ox, oy} relative to feet-center')
    lines.append(' *')
    lines.append(' * Alignment: bottom-center (sprite positioned from feet)')
    lines.append(' */')
    lines.append('')

    # Shoot animation overlay mapping
    lines.append('const ZERO_SHOOT_ANIM_MAP = {')
    lines.append("    idle: 'shoot',")
    lines.append("    run: 'run_shoot',")
    lines.append("    jump: 'jump_shoot',")
    lines.append("    fall: 'fall_shoot',")
    lines.append("    dash: 'dash_shoot',")
    lines.append("    wall_slide: 'wall_slide_shoot',")
    lines.append('};')
    lines.append('')

    lines.append('export const ZERO_ANIMATIONS = {')

    for name, filename in ANIMS.items():
        try:
            data = load_json(filename)
        except FileNotFoundError:
            print(f"WARNING: {filename} not found, skipping")
            continue

        anim = convert_anim(name, data)
        loop_str = 'true' if anim['loop'] else 'false'

        # Build the entry
        loop_start_str = f", loopStart: {anim['loopStart']}" if anim['loopStart'] else ''
        lines.append(f"    {name}: {{ loop: {loop_str}{loop_start_str}, frames: [")
        for i, f in enumerate(anim['frames']):
            comma = ',' if i < len(anim['frames']) - 1 else ','
            lines.append(f"        {format_frame(f)}{comma}")
        lines.append(f"    ] }},")

    lines.append('};')
    lines.append('')

    # getZeroAnim function
    lines.append('/**')
    lines.append(' * Get animation data for Zero.')
    lines.append(' * If shooting is true, returns the shoot variant.')
    lines.append(' * Falls back to idle if state not found.')
    lines.append(' */')
    lines.append('export function getZeroAnim(state, shooting = false) {')
    lines.append('    if (shooting) {')
    lines.append('        const shootState = ZERO_SHOOT_ANIM_MAP[state];')
    lines.append('        if (shootState && ZERO_ANIMATIONS[shootState]) {')
    lines.append('            return ZERO_ANIMATIONS[shootState];')
    lines.append('        }')
    lines.append('    }')
    lines.append('    return ZERO_ANIMATIONS[state] || ZERO_ANIMATIONS.idle;')
    lines.append('}')

    output = '\n'.join(lines) + '\n'

    out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'entities', 'zero-sprite-data.js')
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
