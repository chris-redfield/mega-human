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
- Buster shots (normal + 2 charge levels), sword combos (Zero/Sigma)
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

## Future Ideas (NOT STARTED)
- Sigma additional attacks: projectile slash, block/guard, wall dash
- Sigma CPU AI / Enemy Sigma boss
- Ladder climbing system
- More Maverick bosses (26+ spritesheets available)
