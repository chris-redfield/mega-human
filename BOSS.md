# Boss Reference

All boss sprites sourced from [MMX-Online-Deathmatch](https://github.com/gamemaker19/MMX-Online-Deathmatch).

**Source spritesheets:** `MMX-Online-Deathmatch/LevelEditor/assets/spritesheets/`
**Source animation JSONs:** `MMX-Online-Deathmatch/LevelEditor/assets/sprites/`

---

## Implemented Bosses

| Boss | Game | Stage | Spawn | ActivationX | File | States |
|------|------|-------|-------|-------------|------|--------|
| Chill Penguin | X1 | frozentown | (1650, 150) | — | `src/entities/chill-penguin.js` | idle, shoot, slide, blow, jump_start, jump, land, hurt, dying |
| Storm Eagle | X1 | highway | (2470, 50) | 1800 | `src/entities/storm-eagle.js` | idle, shoot, dive, flap, hurt, dying |
| Flame Mammoth | X1 | robotjunkyard | (1350, 400) | 750 | `src/entities/flame-mammoth.js` | idle, shoot, oil, stomp, hurt, dying |
| Launch Octopus | X1 | deepseabase | (1730, 650) | 1500 | `src/entities/launch-octopus.js` | idle, shoot, torpedo, spin, hurt, dying |
| Spark Mandrill | X1 | volcaniczone | (1200, 130) | 1000 | `src/entities/spark-mandrill.js` | idle, shoot, punch, dash_punch, jump_start, jump, land, hurt, dying |
| Boomer Kuwanger | X1 | tower | (920, 140) | 800 | `src/entities/boomer-kuwanger.js` | idle, shoot, dash, deadlift, teleport, jump_start, jump, land, hurt, dying |
| Armored Armadillo | X1 | shipyard | (850, 860) | 700 | `src/entities/armored-armadillo.js` | idle, shoot, roll_enter, roll, roll_exit, block, jump_start, jump, land, hurt, dying |
| Sting Chameleon | X1 | aircraftcarrier | (2700, 100) | 2500 | `src/entities/sting-chameleon.js` | idle, shoot, tongue1, tongue2, tongue3, jump_start, jump, land, hurt, dying |

All 8 use `mavericks.png` (loaded as `mavericksSprite`) + `effects.png` (loaded as `effectsSprite`). 32 HP each.

---

## All Available Bosses

### MMX1 — `mavericks.png` (1570x1570, already in `assets/`)

| Boss | Prefix | Anims | Key Attacks | Implemented |
|------|--------|-------|-------------|-------------|
| Chill Penguin | `chillp` | 17 | ice shot, belly slide (armor), wind blow | YES |
| Storm Eagle | `storme` | 20 | egg shot, baby birds, gust, dive, fly | YES |
| Flame Mammoth | `flamem` | 16 | fireball, oil ball, oil spill, shockwave, stomp | YES |
| Launch Octopus | `launcho` | 18 | missile spread, homing torpedo, spin (armor), whirlpool, drain | YES |
| Spark Mandrill | `sparkm` | 14 | punch, dash punch, spark projectile, climb, freeze | YES |
| Armored Armadillo | `armoreda` | 31 | shoot, roll (enter/exit), block, charge/release, armor shedding (na_ variants) | YES |
| Boomer Kuwanger | `boomerk` | 25 | boomerang horn, dash, deadlift, catch, teleport, bald form (bald_ variants) | YES |
| Sting Chameleon | `stingc` | 23 | tongue (5 variants), spike projectile, chameleon sting, cling shoot, hang, climb | YES |
| Velguarder | `velg` | 18 | fire/ice projectiles, pounce, wall kick/slide | NO |

### MMX2 — `mavericksX2.png` (1570x1639, NOT yet in `assets/`)

| Boss | Prefix | Anims | Key Attacks |
|------|--------|-------|-------------|
| Wire Sponge | `wsponge` | 39 | vine throw, vine spin (shield), seed throw, thunder, spike (ceiling/ground/wall), angry mode |
| Wheel Gator | `wheelg` | 22 | wheel throw, drill, dive, eat/spit, grab |
| Bubble Crab | `bcrab` | 25 | bubble ring, shield, summon crab/bubble, ring attack |
| Flame Stag | `fstag` | 33 | fireball (ground/wall), fire dash, updash, downdash, dash grab, punch, antler, angry mode |
| Morph Moth (adult) | `morphm` | 21 | beam, sparkles, sweep, ground shoot |
| Morph Moth (cocoon) | `morphmc` | 19 | silk line/spike, scrap projectile, spin, suck, burn |
| Magna Centipede | `magnac` | 37 | shuriken throw, teleport in/out, drain, gravity shift, telekinesis, tail (detaches → notail_ variants) |
| Crystal Snail | `csnail` | 41 | spit projectile, timestop, shell dash/spin/rocket/burstfire, noshell form (noshell_ variants) |
| Overdrive Ostrich | `overdriveo` | 23 | slicer (normal/vertical), skip, skid, attack2, weakness glass |
| Fake Zero | `fakezero` | 26 | buster shot, sword slash, ground punch, guard, climb, wall kick/slide |

### MMX3 — `mavericksX3.png` (1570x1496, NOT yet in `assets/`)

| Boss | Prefix | Anims | Key Attacks |
|------|--------|-------|-------------|
| Blizzard Buffalo | `bbuffalo` | 21 | ice ball, beam shoot, dash grab, crash projectile |
| Toxic Seahorse | `tseahorse` | 18 | acid shot (normal/small/splash), teleport (2 types) |
| Tunnel Rhino | `tunnelr` | 15 | drill projectile (normal/big), dash |
| Volt Catfish | `voltc` | 31 | ball projectile, charge, thunder (small/medium/big/ground/vertical), triad, suck, punch, bounce |
| Crush Crawfish | `crushc` | 20 | claw projectile (3 types), grab attack, dash, backdash |
| Neon Tiger | `neont` | 23 | slash (ground/jump/dash/wall), projectile, block, wall jump/kick/shoot |
| Gravity Beetle | `gbeetle` | 26 | projectiles (3 types), black hole, dash lift, debris, flare |
| Blast Hornet | `bhornet` | 26 | fly attack, stinger, wasp spawn (normal/glowing), particle aim/explosion |

### Sigma Forms (separate spritesheets)

| Boss | Prefix | Anims | Spritesheet | Size |
|------|--------|-------|-------------|------|
| Sigma (X1) + Wolf Sigma | `sigma` | 48 | `sigma_x1.png` | 1020x896 |
| Sigma (X2) + Viral Sigma | `sigma2` | 62 | `sigma_x2.png` | 1032x997 |
| Sigma (X3) + Kaiser Sigma | `sigma3` | 63 | `sigma_x3.png` | 1000x970 |
| Dr. Doppler | `drdoppler` | 24 | `doppler.png` | 1072x1147 |

### HUD Portraits — `hud_mavericks.png` (331x292)

27 frames total: X1 frames 0-8 (44x44), X2 frames 9-17 (40x40), X3 frames 18-25 (50x42), misc frame 26 (34x34).

---

## Animation JSON Format

Each boss animation is a JSON file at `MMX-Online-Deathmatch/LevelEditor/assets/sprites/{prefix}_{anim}.json`.

Example (`sparkm_idle.json`):
```json
{
  "loopStartFrame": 0,
  "alignment": "botmid",
  "wrapMode": "loop",
  "spritesheetPath": "mavericks.png",
  "frames": [
    {
      "duration": 0.066,
      "rect": {
        "topLeftPoint": { "x": 666, "y": 17 },
        "botRightPoint": { "x": 722, "y": 80 }
      },
      "offset": { "x": 0, "y": 0 },
      "hitboxes": [],
      "POIs": []
    }
  ]
}
```

**Key fields per frame:**
- `duration` — seconds (0.066 ≈ 4 game frames at 60fps)
- `rect` — sprite coords on the spritesheet (topLeft/botRight corners)
- `offset` — pixel offset from feet anchor
- `hitboxes` — attack collision boxes (for melee attacks)
- `POIs` — Points of Interest (projectile spawn points, etc.)
- `wrapMode` — `"loop"` or `"once"`

**Converting to game format:** `sx = rect.topLeftPoint.x`, `sy = rect.topLeftPoint.y`, `sw = botRight.x - topLeft.x`, `sh = botRight.y - topLeft.y`, `dur = Math.round(duration * 60)`, `ox = offset.x`, `oy = offset.y`.

---

## How to Import a New Boss

### Step 1: Extract sprite data from animation JSONs

Read the JSON files for your boss at `MMX-Online-Deathmatch/LevelEditor/assets/sprites/{prefix}_*.json`.

Convert each animation into the game's frame format:

```javascript
const BOSS_ANIMS = {
    idle: { loop: true, frames: [
        { sx: 666, sy: 17, sw: 56, sh: 63, dur: 4 },
        // ... more frames
    ]},
    shoot: { loop: false, frames: [
        { sx: ..., sy: ..., sw: ..., sh: ..., dur: ... },
    ]},
    // hurt and die are required, others depend on boss attacks
};
```

Required animations: `idle`, `hurt`, `die`. Common: `run`, `jump`, `fall`, `land`, `shoot`.

### Step 2: Create the entity class

Create `src/entities/{boss-name}.js` extending `Entity`. Use any existing boss as template (chill-penguin.js is simplest).

**Required structure:**
```javascript
import { Entity, boxOverlap } from './entity.js';
import { resolveHorizontal, resolveSlopeHorizontal, resolveSlopeVertical, isSolid } from '../engine/collision.js';

const CONSTS = {
    GRAVITY: 0.35, MAX_FALL_SPEED: 8, RUN_SPEED: 1.2,
    HP: 32, INVINCIBLE_TIME: 45,
    CONTACT_DAMAGE: 3, CONTACT_COOLDOWN: 60,
    WIDTH: 24, HEIGHT: 40, HITBOX_X: 0, HITBOX_Y: 0,
    IDLE_MIN: 40, IDLE_MAX: 80,
    // attack-specific constants...
};

// Explosion frames (same for all bosses, from effects.png)
const EXPLOSION_FRAMES = [
    { sx: 591, sy: 315, sw: 16, sh: 16, dur: 2, ox: -1 },
    { sx: 617, sy: 315, sw: 32, sh: 32, dur: 2 },
    { sx: 660, sy: 314, sw: 34, sh: 34, dur: 3 },
    { sx: 702, sy: 313, sw: 36, sh: 36, dur: 3 },
    { sx: 746, sy: 313, sw: 38, sh: 38, dur: 3 },
    { sx: 660, sy: 314, sw: 34, sh: 34, dur: 3 },
    { sx: 617, sy: 315, sw: 32, sh: 32, dur: 3 },
    { sx: 591, sy: 315, sw: 16, sh: 16, dur: 3 },
];

export class BossName extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = CONSTS.HP;
        this.maxHp = CONSTS.HP;
        this.hitboxW = CONSTS.WIDTH;
        this.hitboxH = CONSTS.HEIGHT;
        this.hitboxX = CONSTS.HITBOX_X;
        this.hitboxY = CONSTS.HITBOX_Y;
        this.facing = -1;
        this.grounded = false;
        this.onSlope = false;
        this.state = 'idle';
        this.isBoss = true;
        this.activated = false;
        this.activationX = 0;
        // timers: idleTimer, contactCooldown, hurtTimer, invincibleTimer, hitFlashTimer
        // animation: animFrame, animTimer, animName
        // projectiles: this.projectiles = []
        // explosion: explosionFrame, explosionTimer
    }
    // AI state methods: _idleState(), _pickAttack(), attack states, _hurtState(), _dyingState()
    // Physics: _moveAndCollide() using resolveSlopeHorizontal/resolveSlopeVertical
    // Damage: onHit(damage), checkPlayerCollision(player)
    // Animation: _setAnim(), _updateAnimation()
    // Rendering: render(), _renderProjectiles(), _renderExplosion()
}
```

**Key patterns:**
- `isBoss = true` flag is required
- Gravity MUST be applied every frame (even in idle) for grounded detection
- Feet anchor alignment (bottom-center of hitbox)
- Hit flash: `globalCompositeOperation = 'lighter'`, alpha 0.7
- Invincibility flash: skip render when `invincibleTimer % 4 < 2`
- Death: 8-frame explosion from effects.png, then `active = false`

### Step 3: Register in gameplay.js

**Import at top of `src/states/gameplay.js`:**
```javascript
import { BossName } from '../entities/{boss-name}.js';
```

**Add to `bossSpawns` object in `_spawnEnemies()` (~line 282):**
```javascript
const bossSpawns = {
    frozentown:     { x: 1650, y: 150 },
    highway:        { x: 2470, y: 50 },
    robotjunkyard:  { x: 1350, y: 400 },
    deepseabase:    { x: 1730, y: 650 },
    newstage:       { x: XXXX, y: YYYY },  // <-- add
};
```

**Add conditional boss creation (~line 288):**
```javascript
} else if (this.stageName === 'newstage') {
    boss = new BossName(pos.x, pos.y);
    boss.activationX = XXXX;  // optional: X coord where boss activates
}
```

Boss automatically gets `mavericksSprite` and `effectsSprite` assigned, and integrates with existing systems (HP bar, shot collision, sword collision, drop on death).

### Step 4: Load spritesheet (only for X2/X3 bosses)

X1 bosses use `mavericks.png` which is already loaded. For X2/X3 bosses:

1. Copy spritesheet to `assets/`:
   ```
   cp MMX-Online-Deathmatch/LevelEditor/assets/spritesheets/mavericksX2.png assets/
   ```

2. Add to `index.html` asset loading block:
   ```javascript
   assets.loadImage('mavericksX2Sprite', './assets/mavericksX2.png'),
   ```

3. In gameplay.js, assign the correct spritesheet:
   ```javascript
   boss.spriteImage = this.assets.getImage('mavericksX2Sprite');
   ```

### Step 5: Add sound effects (optional)

Boss SFX go in `assets/sounds/sigma/`. Current boss sounds: `chillpBlizzard`, `chillpSlide`, `maverickDie`.

---

## Animation File Reference (per boss)

### MMX1

**Chill Penguin** (`chillp`): idle, run, jump, jump_start, fall, land, shoot, slide, blow, taunt, switch, burn, die, wind, proj_ice, proj_statue, anim_ice_piece

**Storm Eagle** (`storme`): idle, run, jump, jump_start, fall, land, shoot, fly, fly_fall, flap, dive, dive2, air_shoot, air_eggshoot, eggshoot, taunt, die, proj_egg, proj_baby, proj_gust

**Flame Mammoth** (`flamem`): idle, run, jump, jump_start, fall, land, shoot, shoot2, taunt, die, proj_fireball, proj_bigfire, proj_oilball, proj_oilspill, proj_shockwave, anim_fireball_fade

**Launch Octopus** (`launcho`): idle, run, jump, jump_start, fall, land, shoot, shoot2, air_shoot, air_shoot2, spin, whirlpool, drain, ht, taunt, die, proj_missile, proj_ht

**Spark Mandrill** (`sparkm`): idle, run, jump, jump_start, fall, land, shoot, punch, dash_punch, climb, freeze, taunt, die, proj_spark

**Armored Armadillo** (`armoreda`): idle, run, jump, jump_start, fall, land, shoot, roll, roll_enter, roll_exit, block, charge, release, zapped, taunt, die, armorpiece, proj, proj_release, proj_fade + no-armor variants: na_idle, na_run, na_jump, na_jump_start, na_fall, na_land, na_shoot, na_roll_enter, na_roll_exit, na_die, na_taunt

**Boomer Kuwanger** (`boomerk`): idle, run, jump, jump_start, fall, land, shoot, dash, deadlift, catch, teleport, taunt, die, proj_horn + bald variants: bald_idle, bald_run, bald_jump, bald_jump_start, bald_fall, bald_land, bald_shoot, bald_dash, bald_teleport, bald_taunt, bald_die

**Sting Chameleon** (`stingc`): idle, run, jump, jump_start, fall, land, shoot, climb, cling, cling_shoot, cling_tongue, cling_tongue2, cling_tongue3, cling_tongue4, cling_tongue5, hang, tongue, tongue2, tongue3, taunt, die, proj_csting, proj_spike

**Velguarder** (`velg`): idle, run, jump, jump_start, fall, land, shoot, shoot2, pounce, hurt, die, wall_kick, wall_slide, taunt, pieces, anim_die, proj_fire, proj_ice

### MMX2

**Wire Sponge** (`wsponge`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, seed, seedthrow, vine_throw, vine_spin, vine_spin_shield, vine_base_left, vine_base_up, vine_move, vine_move_start, vine_move_end, vine_spike, vine_spike_up, vine_up_loop, vine_up_seedthrow, vine_up_start, vinethrow_jump, cling, cling_end, spike_ceiling, spike_ground, spike_wall, thunder_point, thunder_mid, thunder_end, thunder_fade, angry_start, angry_puff, angry_explode, angry_thunder_start, arena_debris

**Wheel Gator** (`wheelg`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, dive, drill_loop, drill_start, eat_loop, eat_spit, eat_start, grab_start, grab_start2, wheelthrow_start, wheelthrow_loop1, wheelthrow_loop2, proj_wheel, proj_spit

**Bubble Crab** (`bcrab`): idle, idle_alt, run, jump, jump_start, land, die, hurt, hurt_air, taunt, shoot, bubble_ring, bubble_ring_start, bubble_ring_poof, ring_attack, ring_attack_start, shield, shield_start, summon, summon_bubble, summon_crab, summon_crab_bubbled, fall_attack, jump_attack, jump_attack_start

**Flame Stag** (`fstag`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, angry, punch, punch2, dash, dash_grab, updash, downdash, fireball_start, fireball_start2, fireball_ground, fireball_wall, fireball_proj, fire_body, fire_dash, fire_downdash, fire_updash, fire_trail, fire_trail_extra, antler, antler_down, antler_side, wall_dash, wall_kick, wall_slide

**Morph Moth** (`morphm`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, fly, fly_fall, shoot, shoot_start, shoot_ground, shoot_ground_start, beam, sparkles, sparkles_fade, sweep, sweep_start, beam_colours

**Morph Moth Cocoon** (`morphmc`): idle, run, jump, jump_start, fall, land, die, taunt, hang, burn_hang, burn, spin, suck, silk_animated, silk_line, silk_spike, scrap_proj, part_left, part_right

**Magna Centipede** (`magnac`): idle, idle2, run, jump, jump_start, fall, land, die, hurt, taunt, shuriken_throw, shuriken, drain, drain_start, drain_end, gravity_shift, teleport_in, teleport_out, telekinesis, telekinesis_end, tail_part, tail_part_nohitbox, tail_end, tail_gibs + notail variants: notail_idle, notail_run, notail_jump, notail_jump_start, notail_fall, notail_land, notail_die, notail_hurt, notail_taunt, notail_shuriken_throw, notail_gravity_shift, notail_teleport_in, notail_teleport_out

**Crystal Snail** (`csnail`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, spit, timestop, timestop_start, weakness, shell, shell_start, shell_end, shell_enter, shell_exit, shell_dash, shell_spin, shell_rocket, shell_burstfire, shell_flame, shell_empty, shell_ragdoll, projectile, projectile_spit, projectile_hitground, projectile_hitwall + noshell variants: noshell_idle, noshell_run, noshell_jump, noshell_jump_start, noshell_fall, noshell_land, noshell_die, noshell_hurt, noshell_taunt, noshell_dash, noshell_spit, noshell_timestop

**Overdrive Ostrich** (`overdriveo`): idle, run, jump, jump_start, fall, land, die, hurt, hurt_weakness, taunt, attack, attack2, attack2_start, attack2_end, skip, skip2, skid, skid_end, slicer, slicer_start, slicer_vertical, slicer_hitspark, weakness_glass

**Fake Zero** (`fakezero`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, shoot, shoot2, shoot_air, shoot_air2, buster_proj, buster2_proj, sword_proj, run_attack, run_sword, groundpunch, guard, climb, wall_kick, wall_slide, piece, rock, exhaust

### MMX3

**Blizzard Buffalo** (`bbuffalo`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, shoot, shoot_beam, shoot_beam_start, dash, dash_grab, dash_start, beam_muzzle, proj_beam_head, proj_crash, proj_ice, proj_iceball, proj_ice_gibs

**Toxic Seahorse** (`tseahorse`): idle, run, jump, jump_start, fall, land, die, taunt, shoot, shoot2, shoot_start, teleport, teleport2, acid_gib, proj_acid, proj_acid_small, proj_acid_splash, proj_acid_start

**Tunnel Rhino** (`tunnelr`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, dash, dash_start, shoot1, shoot3, proj_drill, proj_drillbig

**Volt Catfish** (`voltc`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, shoot, spit, punch, bounce, dash, charge, charge_start, suck, particle_suck, thunder_vertical, proj_ball, proj_charge, proj_ground_thunder, proj_sparkle, proj_sparkle2, proj_suck, proj_thunder_big, proj_thunder_medium, proj_thunder_small, proj_triadt_deactivated, proj_triadt_electricity, proj_wall

**Crush Crawfish** (`crushc`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, shoot, dash, dash_start, backdash, grab, grab_attack, attack_claw, proj, proj_claw, proj_claw2, proj_claw3

**Neon Tiger** (`neont`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, shoot, slash, slash2, dash, dash_slash, jump_slash, block, projectile, projectile_start, wall_jump, wall_kick, wall_shoot, wall_slash, wall_slide

**Gravity Beetle** (`gbeetle`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, attackproj, attackproj_start, attackproj2, attackproj2_start, dash, dash_start, dash_end, dash_lift, blackhole, blackhole_start, debris, proj1, proj2, proj3, proj_blackhole, proj_flare, proj_flare2

**Blast Hornet** (`bhornet`): idle, run, jump, jump_start, fall, land, die, hurt, taunt, taunt2, attack, fly, fly_fall, fly_attack, fly_stinger_attack, fly_stinger_start, fly_stinger_end, fly_wasp_spawn, wings, particle_aim_big, particle_aim_small, particle_explosion, particle_hover, particle_stingerflash, proj_wasp_small, proj_wasp_small_glowing
