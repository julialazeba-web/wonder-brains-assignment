# Wonder Brains – Generalist Technical Artist Assignment

Prototype recreation of a tile-collection game using Three.js, matching the gameplay shown in the reference video.

## Live Demo

> _Will be added after deployment to Vercel_

---

## Project Structure

```
Wonder Brains/
├── primitive_version/    ← Version A: primitives only (cubes, spheres, cylinders)
│   └── ...
└── styled_version/       ← Version B: Fish of Fortune art style (coming soon)
```

---

## Version A – Primitive Prototype

All gameplay mechanics built with basic Three.js geometry. No external art assets.

### How to Run

```bash
cd primitive_version
npm install
npm run dev
# Open http://localhost:5173
```

### Build for production

```bash
npm run build
# Output in dist/
```

---

## Tweakable Parameters (Version A)

All parameters live in **`primitive_version/config.js`**.
You can edit them without touching any game logic.

### Grid size

| Parameter | Default | What it does |
|---|---|---|
| `GRID_CELLS_N` | `13` | Controls subtile count: `GRID_CELLS_N × 2` per side. **13 → 26 subtiles per side.** Change this to resize the grid. Tile physical size adjusts automatically. |
| `GRID_WORLD_SIZE` | `7.0` | Fixed physical width of the grid in 3D units. **Do not change** unless you want to rescale the whole scene. |
| `SUBTILES_PER_CELL` | `2` | Each cell is divided into this many sub-tiles per axis (2 = 2×2 = 4 parts). |

> **Quick size guide:**
> - 26 subtiles per side → `GRID_CELLS_N = 13` ✓ (current)
> - 20 subtiles per side → `GRID_CELLS_N = 10`
> - 16 subtiles per side → `GRID_CELLS_N = 8`
> - 12 subtiles per side → `GRID_CELLS_N = 6`

### Character movement

| Parameter | Default | What it does |
|---|---|---|
| `CHARACTER_SPEED` | `4.0` | Units per second along the track. Higher = faster characters. |
| `COLLECTION_COOLDOWN` | `0.22` | Seconds between tile pickups per character. Lower = more aggressive collection. |

### Capacity

| Parameter | Default | What it does |
|---|---|---|
| `MAX_ON_TRACK` | `5` | Maximum characters on track simultaneously. Also controls the number of trays. |
| `MAX_IN_QUEUE` | `5` | Maximum characters waiting in the queue. If a 6th arrives, the player loses. |

### Spawn pool

```js
POOL_COLUMNS: [
  { type: 'white', startCount: 20 },  // column 1: always white, starts at 20
  { type: 'black', startCount: 20 },  // column 2: always black
  { type: 'mixed', startCount: 20 },  // column 3: random each click
  { type: 'mixed', startCount: 20 },  // column 4: random each click
]
```

- `type`: `'white'` | `'black'` | `'mixed'`  
- `startCount`: how many tiles this character can collect (shown as number on the sphere)

### Colors

All colors are in the `COLORS` block inside `CONFIG`. Three.js mesh colors are hex numbers (e.g. `0xffffff`). UI element colors are CSS strings (e.g. `'#ff4444'`).

| Key | Controls |
|---|---|
| `tileWhite` / `tileBlack` | Color of white/black floor tiles |
| `charWhite` / `charBlack` | Color of character spheres |
| `track` | Track ring color |
| `tray` | Tray (поднос) color |
| `bg` | Background color of the 3D scene |

---

## Version History (git tags)

| Tag | Description |
|---|---|
| `v1-primitive` | _(current)_ Core mechanics: track, grid, characters, trays, win/lose |
| `v2-feel` | Smooth movement easing, bounce animations, improved timing |
| `v3-polish` | Particle VFX, win celebration, UI juice |
| `styled-v1` | Version B: Fish of Fortune art style with GLB assets |

---

## Game Rules

1. Click a sphere in the bottom pool to send a character onto the conveyor track.
2. The character moves clockwise around the square track, collecting tiles of its color from the edges of the grid.
3. The number on the character = how many tiles it can collect.
4. When the counter reaches 0 on the track → character vanishes, tray returns to the gate.
5. After one full lap (counter > 0) → character goes to a queue slot. Click the slot to re-release.
6. **Win:** all tiles are cleared from the grid.
7. **Lose:** a character tries to enter the queue but all 5 slots are already full.

---

## Architecture Overview

| File | Responsibility |
|---|---|
| `config.js` | **Single source of truth** for all parameters. Edit here, nothing else changes. |
| `main.js` | Three.js scene setup, camera (auto-fit orthographic), lights, render loop. |
| `track.js` | Waypoints, `getPositionAtDistance()`, `getSideAtDistance()`. |
| `grid.js` | 26×26 subtile grid, line-of-sight collection logic. |
| `character.js` | Character entity: movement, counter, state machine (`active/queued/done`). |
| `tray.js` | Tray entity: vertical↔flat rotation, smooth queue sliding. |
| `gameManager.js` | Orchestrator: spawn, queue, win/lose, tray repack. |
| `uiManager.js` | HTML overlay: pool spheres, queue slots, capacity counter, overlays. |
| `vfx.js` | Empty animation hooks for v2/v3 (all no-ops in v1). |
| `style.css` | All HTML UI styles. |

---

## Tech Stack

- [Three.js](https://threejs.org/) r163
- [Vite](https://vitejs.dev/) 5.x (dev server + bundler)
- Vanilla JavaScript (ES modules)
- No external animation libraries (v1)
