# MEGAGAME 2026: Mega Man X Browser Game

## Context

A Mega Man X-style action platformer built with plain HTML5 Canvas and JavaScript. All sprite and stage assets sourced from [MMX-Online-Deathmatch](https://github.com/gamemaker19/MMX-Online-Deathmatch), an open-source fan game with complete PNG spritesheets and JSON animation data.

**Goal:** A playable browser game with authentic MMX gameplay — not an emulator wrapper.

---

## How to Import a New Stage Map

**Stage import standard — copy files from the MMX-Deathmatch source map directory:**

1. `background.png` → `assets/levels/{name}_background.png` (main tilemap, scrolls 1:1)
2. `backwall.png` → `assets/levels/{name}_backwall.png` (behind background, scrolls 1:1)
3. `parallax.png` → `assets/levels/{name}_parallax.png` (distant layer, scrolls 0.5x)
4. `foreground.png` → `assets/levels/{name}_foreground.png` (drawn over player/enemies)
5. `map.json` → `assets/levels/{name}_map.json` (collision polygons, spawn points, kill zones)

**Code changes required:**
- `asset-loader.js`: Add stage to `STAGE_OPTIONAL_LAYERS` (list which optional layers exist: parallax, foreground, etc.). Add to `CUSTOM_COLLISION_STAGES` if using custom collision.
- `index.html`: Add `assets.loadStage('{name}')` to stage loading block
- `gameplay.js`: Add spawn override in `stageSpawns`, add enemy layout in `_spawnEnemies()` layouts object
- `stage-locations.json`: Add dot position via `tools/stage-select-editor.html`

**Note:** `loadStage()` loads required files (background, backwall, map.json) plus only the optional layers listed in `STAGE_OPTIONAL_LAYERS` — no fallback 404 requests for missing files.

**Custom collision:** For stages where polygon rasterization produces bad results, use `tools/collision-editor.html` to paint a custom tile map. Supports 16x16 and 8x8 tile sizes. Saves to `assets/levels/{name}_collision.json`.

**Current stages:** highway, frozentown, aircraftcarrier, crystalmine, weathercontrol, robotjunkyard, tower, sigma2, volcaniczone, shipyard, mountain, deepseabase

---

## How to Import a Player Character

**Architecture:** All playable characters extend `Player` (which extends `Entity`). `Player` has a 10-state machine shared by all characters.

**Steps:**
1. Copy spritesheet PNG from `MMX-Online-Deathmatch/LevelEditor/assets/spritesheets/` to `assets/`
2. Run sprite data builder script (e.g. `analysis/build_zero_sprites.py`) to generate a `{name}-sprite-data.js` module from the MMX-Deathmatch JSON animation definitions
3. Create entity class extending `Player`, override `_getAnim()` to use new sprite data
4. Add to `index.html` asset loading: `assets.loadImage('{name}Sprite', './assets/{name}.png')`
5. Add to `gameplay.js` `_createPlayer()` factory and Tab key rotation

**Current playable characters:**
- **X** (`player.js`): Buster + charged shots. Sprite: `XDefault.png`, data: `sprite-data.js`
- **Zero** (`zero.js`): Z-Saber 3-hit combo + air slash. Sprite: `zero.png`, data: `zero-sprite-data.js`
- **Sigma** (`sigma.js`): Beam saber (ground/air/dash/wall attacks). Sprite: `sigma.png`, data: `sigma-sprite-data.js`

**Character selection:** Tab key cycles X → Zero → Sigma. `_createPlayer()` factory creates correct class + assigns spritesheet.

---

## How to Import a Boss

**Architecture:** Bosses extend `Entity` directly (NOT `Player`). Each has its own AI state machine.

**Steps:**
1. Sprites go in `assets/mavericks.png` (shared Maverick spritesheet) or a dedicated sheet
2. Create entity class (e.g. `chill-penguin.js`) with AI states (idle, attack patterns, hurt, dying)
3. Load sprite in `index.html` as `'mavericksSprite'` (or new key for dedicated sheet)
4. Add spawn position in `gameplay.js` `_spawnEnemies()` `bossSpawns` object
5. Boss is stored in `this.boss` (separate from `this.enemies[]`)
6. Integration uses existing systems: `checkPlayerCollision()`, `_checkPlayerShotsVsBoss()`, boss HP bar rendering

**Current bosses:**
- **Chill Penguin** (`chill-penguin.js`): 32 HP, 6 AI states (idle, shoot, slide, blow, hurt, dying). Frozentown stage at (1650, 150).
- **Storm Eagle** (`storm-eagle.js`): Highway stage at (2470, 50), activates at x=1800.

**Boss drops:** 100% guaranteed 1 RAM memory + 25% chance of second (offset 10px right). Implemented in `_spawnBossDrop()`.

---

## Completed Features (Summary)

### Player
- 10-state machine: warp_in, idle, run, jump, fall, land, wall_slide, dash, hurt, die
- Buster shots (normal + 3 charge levels), sword combos (Zero/Sigma)
- X1 Armor: Boots (+15% dash speed, visual overlay), Arms (1.5x charge speed, L3 charge shot with 15 sine-wave projectiles, visual overlay, pink/purple L3 particles)
- Dash-jump momentum, wall sliding, warp-in animation
- Respawn system with fade-out/hold/fade-in transitions

### Enemies
- **Tank** (`tank-enemy.js`): Patrol/turn/chase/attack/dying, 8 HP, fires projectiles
- **Hopper** (`hopper-enemy.js`): Hop + melee attack, 6 HP
- **Bird** (`bird-enemy.js`): Sine-wave patrol + swoop, 4 HP, no tile collision
- All use sprites from `sigma_viral.png`, death explosions from `effects.png`
- Enemy drop rates (single roll): 5% RAM, 10% large health, 20% small health, 65% nothing

### Engine
- Fixed 60fps game loop, keyboard + gamepad input (pressed/held/released)
- Tile-based AABB collision with slope support, camera viewport (307×224)
- Asset loader for images + JSON
- Stage select screen with world map (`stage-select.js`)

### HUD & UI
- Classic MMX vertical segmented HP bar (toggle horizontal with L key)
- Boss HP bar (right side, shown when boss is near screen)
- Pause menu (Enter/Start key): pre-assembled frame from `menu.png`, X portrait, RAM counter
- Debug overlay (P key): collision tiles, hitboxes, FPS counter

### Items
- **Health pickups** (`health-pickup.js`): Small (4 HP) and large (8 HP), from effects.png sprites
- **RAM Memory** (`memory-pickup.js`): Currency dropped by enemies/bosses, yellow shine effect, counter shown in pause menu
- **Save system** (`save-manager.js`): localStorage persistence under `megahuman_save` key. RAM count survives stage changes and browser restarts. Exports `loadSave()`, `updateSave(fn)`, `clearSave()`

### Tools
- `tools/collision-editor.html` — Paint custom collision tiles
- `tools/stage-select-editor.html` — Place stage dots on world map
- `tools/map-controller.py` — Gamepad mapping tool
- `analysis/build_zero_sprites.py`, `analysis/build_sigma_sprites.py` — Sprite data generators

---

## Known Issues

### Weather Control Slopes (UNRESOLVED)
Weather control slope polygons contain slope surface AND ground beneath (unlike other stages). Tile rasterization approach has inherent limitations at slope/flat junctions. See MEMORY.md for full history. Simplest fix: use custom collision editor for weathercontrol.

---

## Shop System (IMPLEMENTED)

**Files:** `src/states/shop.js`, background at `assets/shiba-shop-complete.png`

### Shop UI
- Bottom panel (Y=838, 980×170) with item cards centered horizontally
- Left/Right arrows to browse items, Shoot to buy, Escape to exit
- Cards show icon, name, RAM price. Selected card has gold pulsing border.
- Two icon types: animated effects.png sprites (heart, subtank — static when unselected, animate when selected) and standalone PNGs (armor pieces — use `IMAGE_ICONS` with per-item `offsetY` for alignment)
- RAM counter displayed top-right of panel
- Purchase logic stubbed (`_tryBuyItem()`) — effects not yet implemented

### Adding New Items Checklist
1. Copy PNG from `MMX-Online-Deathmatch/LevelEditor/assets/spritesheets/` → `assets/`
2. Add `assets.loadImage()` line in `index.html`
3. Add entry to `IMAGE_ICONS` in `shop.js` (with `offsetY` for vertical alignment)
4. Add entry to `SHOP_ITEMS` array in `shop.js`

## Shop Items — Sprite Reference

All sprites sourced from `MMX-Online-Deathmatch/LevelEditor/assets/sprites/`. Currency: RAM Memory.

### Status Key
- **DONE** = in shop + gameplay effect fully implemented
- **SHOP** = in shop, visual only (no gameplay effect yet)
- **TODO** = planned, sprite located
- **LOAD** = needs new spritesheet loaded in index.html

### Tanks & Chips (sprites in effects.png — already loaded as `effectsSprite`)

| Item | ID | Effect (from source code) | Sprite Frames | Status |
|------|----|---------------------------|---------------|--------|
| Heart Tank | `heart` | +1 max HP per tank (base 16 HP, max 8 tanks → 24 HP). Heals by 1 on purchase. | effects.png: (476,147 14×15), (643,145 14×15), (660,145 14×15) | **DONE** 8 RAM |
| Sub Tank | `subtank` | Stores up to 16 HP. Fills +4 HP per kill. Use in combat to heal. Max 4 tanks. | effects.png: (621,145 16×16), (590,145 16×16), (678,145 16×16) | **DONE** 16 RAM |
| Sub Tank Bar (UI) | `subtank_bar` | HUD fill indicator for sub tank level | effects.png: (612,146 4×14) | TODO |
| Enhancement Chip | `chip` | Enhances one X3 armor slot (see X3 table). Only one chip at a time. | effects.png: (132,185 8×8) | TODO |

### X1 Armor Parts (MMX1 — First Armor. Full set bonus: HADOUKEN)

| Item | ID | Effect (from source code) | Cost | Spritesheet | Status |
|------|----|---------------------------|------|-------------|--------|
| X1 Helmet | `x1_helmet` | Headbutt on jump: 2 dmg (normal), 4 dmg (up-dash). Hitbox 14×4 px. | 1 | XHelmetMenu.png | TODO LOAD |
| X1 Body | `x1_body` | 12.5% damage reduction (dmg/8). Flinch time ×0.75 (25% faster recovery). | 3 | XBodyMenu.png | TODO LOAD |
| X1 Arms | `x1_arms` | Charge speed ×1.5 (50% faster). Unlocks L3 charge: 15 sine-wave shots (3 lines × 5), 4 dmg each. Pink/purple charge particles at L3. Overlay: `XArm.png`. | 4 | XArmMenu.png | **DONE** 20 RAM, offsetY:40 |
| X1 Boots | `x1_boots` | Ground dash speed ×1.15 (15% faster). Overlay: `XBoots.png`. | 2 | XBootsMenu.png | **DONE** 20 RAM, offsetY:0 |

### X2 Armor Parts (MMX2 — Giga Armor. Full set bonus: SHORYUKEN)

| Item | ID | Effect (from source code) | Cost | Spritesheet | Status |
|------|----|---------------------------|------|-------------|--------|
| X2 Helmet | `x2_helmet` | Scan beam: tag enemies within 150px. Tagged enemies show HP bar through walls. | 1 | XHelmetMenu2.png | TODO LOAD |
| X2 Body | `x2_body` | 12.5% damage reduction + Giga Crush weapon: 12 dmg AoE, invincible during anim, costs 32 ammo. | 3 | XBodyMenu2.png | TODO LOAD |
| X2 Arms | `x2_arms` | Stocked charge shot: L3 charge fires, then a second auto-fires on next press. 4 dmg each. | 4 | XArmMenu2.png | TODO LOAD |
| X2 Boots | `x2_boots` | Air dash duration ×1.15 (15% longer/farther: 0.6s → 0.69s). | 2 | XBootsMenu2.png | TODO LOAD |

### X3 Armor Parts (MMX3 — Max Armor. Requires all 4 to use Enhancement Chips.)

| Item | ID | Effect (from source code) | Chip Enhancement | Cost | Spritesheet | Status |
|------|----|---------------------------|------------------|------|-------------|--------|
| X3 Helmet | `x3_helmet` | Radar HUD: shows enemy positions on minimap. | +HP regen: 1 HP/sec after 4s no damage (max 32 HP total healed per life). | 1 | XHelmetMenu3.png | TODO LOAD |
| X3 Body | `x3_body` | Barrier on damage: 25% dmg reduction for 0.75–1.5s, no cooldown. | +Orange barrier: 50% dmg reduction instead of 25%. | 3 | XBodyMenu3.png | TODO LOAD |
| X3 Arms | `x3_arms` | Hyper Buster weapon: X3 charge shot (4 dmg, accelerating) + Cross Shot. 8 ammo/shot. | +Half ammo: all weapon ammo costs ×0.5. | 4 | XArmMenu3.png | TODO LOAD |
| X3 Boots | `x3_boots` | Upward air dash: press Up+Dash in air for vertical dash. | +Double air dash: can air-dash twice per jump. | 2 | XBootsMenu3.png | TODO LOAD |

*Only one Enhancement Chip at a time. Using a chip locks out Golden Armor.*

### Special Armors

| Item | ID | Effect (from source code) | Cost | Spritesheet | Status |
|------|----|---------------------------|------|-------------|--------|
| Golden Armor | `x_golden` | ALL armor effects from ALL generations active. All 4 chips active. L3 charge auto-stocks a saber swing (4 dmg, 0.66s cooldown). Hadouken + Shoryuken. Requires all X3 parts + no chips used. | 5 | XGoldenMenu.png | TODO LOAD |
| Ultimate Armor | `x_ultimate` | Nova Strike: 4 dmg dash attack, invincible during, 350 speed, 0.6s duration, 16 ammo cost. Plasma Buster: L3 charge passes through enemies (4 dmg, 400 speed). Lost on death. Requires any full armor set. | 10 | XUltimateMenu.png | TODO LOAD |

### Notes
- All armor PNGs at `MMX-Online-Deathmatch/LevelEditor/assets/spritesheets/` — copy to `assets/` when importing
- Armor sprites are 118×186 full-body portraits (too tall for current 146px shop cards — scale or adjust layout)
- Enhancement Chip is 8×8 — needs heavy upscaling or custom rendering
- Armor slot indices in code: 0=Boots, 1=Body, 2=Helmet, 3=Arms
- Armor generation indices: 1=X1, 2=X2, 3=X3, 15=Chip enhanced

---

## Future Ideas (NOT STARTED)
- Sigma additional attacks: projectile slash, block/guard, wall dash
- Sigma CPU AI / Enemy Sigma boss
- Ladder climbing system
- More Maverick bosses (26+ spritesheets available)
