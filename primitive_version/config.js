// config.js — All tweakable game parameters for Wonder Brains Prototype
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO RESIZE THE GRID:
//   Change GRID_CELLS_N below.
//   The tile physical size adjusts automatically so the grid always fits the screen.
//   GRID_WORLD_SIZE is the fixed total width of the grid in 3D units.
// ─────────────────────────────────────────────────────────────────────────────

// ── Step 1: Set these two values to define the grid ──────────────────────────
const GRID_CELLS_N    = 13;  // ← CHANGE THIS: subtiles per side = GRID_CELLS_N × 2  (13 × 2 = 26)
const GRID_WORLD_SIZE = 7.0; // ← Fixed physical size of the full grid (3D units)
                              //   Tile size = GRID_WORLD_SIZE / GRID_CELLS_N

// ── Step 2: Everything else is derived automatically ─────────────────────────
const SUBTILES_PER_CELL = 2;                              // 2x2 sub-tiles per cell
const CELL_SIZE         = GRID_WORLD_SIZE / GRID_CELLS_N; // e.g. 7/6 ≈ 1.17
const TRACK_DIST        = GRID_WORLD_SIZE / 2 + 1.4;      // Track hugs just outside grid

export const CONFIG = {
  // ─── Grid ──────────────────────────────────────────────────────────────────
  GRID_CELLS:         GRID_CELLS_N,
  GRID_WORLD_SIZE,
  SUBTILES_PER_CELL,
  CELL_SIZE,          // Auto-computed — do NOT edit
  TRACK_DIST,         // Auto-computed — do NOT edit
  TILE_HEIGHT: 0.3,

  // ─── Characters ────────────────────────────────────────────────────────────
  MAX_ON_TRACK:        5,
  MAX_IN_QUEUE:        5,
  CHARACTER_SPEED:     4.0,   // Units/second along track
  COLLECTION_COOLDOWN: 0.06,  // Seconds between tile pickups per character (fast enough to not skip tiles)

  // ─── Pool columns ──────────────────────────────────────────────────────────
  // type: 'white' | 'black' | 'mixed'
  // startCount: how many tiles this character can eat (shown as the number label)
  POOL_COLUMNS: [
    { type: 'white', startCount: 20 },
    { type: 'black', startCount: 20 },
    { type: 'mixed', startCount: 20 },
    { type: 'mixed', startCount: 20 },
  ],

  // ─── Colors ────────────────────────────────────────────────────────────────
  COLORS: {
    tileWhite:    0xffffff,
    tileBlack:    0x1a1a2e,
    charWhite:    0xf0f0f0,
    charBlack:    0x222240,
    track:        0x5a5c70,
    trackAccent:  0x474960,
    pipe:         0x6e7191,
    tray:         0xc4a040,
    bg:           '#2b2b36',
    uiSlotEmpty:  '#55576b',
    uiSlotQueued: '#a0a2b8',
    winColor:     '#ffd700',
    loseColor:    '#ff4444',
  },
};
