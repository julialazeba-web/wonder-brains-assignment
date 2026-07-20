// grid.js — Subtile grid management
//
// Grid layout:
//   • CONFIG.GRID_CELLS × CONFIG.GRID_CELLS cells (e.g. 10×10)
//   • Each cell is divided into CONFIG.SUBTILES_PER_CELL × CONFIG.SUBTILES_PER_CELL subtiles (e.g. 2×2)
//   • Total grid = (10×2) × (10×2) = 20×20 subtiles
//
// Coordinate system for this module:
//   col (i): 0 = leftmost  (−X), 19 = rightmost (+X)
//   row (j): 0 = topmost   (−Z), 19 = bottommost (+Z)
//
// "Line-of-sight through gaps" collection:
//   Start from the outermost subtile of the relevant row/col.
//   If it's absent (already collected), look one step inward.
//   Stop if a subtile of the WRONG color is encountered (it blocks the view).

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { VFX } from './vfx.js';

const N   = CONFIG.GRID_CELLS * CONFIG.SUBTILES_PER_CELL; // 20
const S   = CONFIG.CELL_SIZE / CONFIG.SUBTILES_PER_CELL;  // subtile physical size
const HALF = (N * S) / 2; // 3.5

// Shared geometry for all subtiles (perfect cubes)
const SUB_GEO = new THREE.BoxGeometry(S * 0.95, S * 0.95, S * 0.95);

export class SubtileGrid {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    // tiles[col][row] = { mesh, isWhite, col, row } | null
    this.tiles = [];
    this.remaining = 0;
    this._build();
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const matW = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.tileWhite, roughness: 0.2 });
    const matB = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.tileBlack, roughness: 0.2 });

    this.tiles = Array.from({ length: N }, () => new Array(N).fill(null));
    this.remaining = 0;

    for (let ci = 0; ci < N; ci++) {
      for (let ri = 0; ri < N; ri++) {
        // Parent cell determines color (checkerboard at cell level)
        const cellX  = Math.floor(ci / CONFIG.SUBTILES_PER_CELL);
        const cellZ  = Math.floor(ri / CONFIG.SUBTILES_PER_CELL);
        const isWhite = (cellX + cellZ) % 2 === 0;

        const mesh = new THREE.Mesh(SUB_GEO, isWhite ? matW : matB);
        mesh.position.set(
          -HALF + ci * S + S / 2,
          (S * 0.95) / 2, // Sit exactly on the floor
          -HALF + ri * S + S / 2
        );
        this.scene.add(mesh);

        this.tiles[ci][ri] = { mesh, isWhite, col: ci, row: ri };
        this.remaining++;
      }
    }
  }

  // ─── Collection ────────────────────────────────────────────────────────────

  /**
   * Find the nearest collectible subtile for a character on a given side.
   * Uses line-of-sight: looks through empty gaps, stops at wrong-color tiles.
   *
   * @param {'bottom'|'right'|'top'|'left'} side
   * @param {number} charX  World X position of the character
   * @param {number} charZ  World Z position of the character
   * @param {boolean} isWhite  Whether the character collects white tiles
   * @returns {{ mesh, isWhite, col, row } | null}
   */
  getCollectible(side, charX, charZ, isWhite) {
    if (side === 'bottom') {
      // Character moves +X along Z≈+R. Collect from bottommost row (ri = N−1) inward.
      const ci = this._xToCol(charX);
      if (ci < 0 || ci >= N) return null;
      for (let ri = N - 1; ri >= 0; ri--) {
        const t = this.tiles[ci][ri];
        if (!t) continue;                       // Gap → look inward
        if (t.isWhite === isWhite) return t;    // Match → collect this
        break;                                  // Wrong colour blocking view
      }

    } else if (side === 'right') {
      // Character moves −Z along X≈+R. Collect from rightmost col (ci = N−1) inward.
      const ri = this._zToRow(charZ);
      if (ri < 0 || ri >= N) return null;
      for (let ci = N - 1; ci >= 0; ci--) {
        const t = this.tiles[ci][ri];
        if (!t) continue;
        if (t.isWhite === isWhite) return t;
        break;
      }

    } else if (side === 'top') {
      // Character moves −X along Z≈−R. Collect from topmost row (ri = 0) inward.
      const ci = this._xToCol(charX);
      if (ci < 0 || ci >= N) return null;
      for (let ri = 0; ri < N; ri++) {
        const t = this.tiles[ci][ri];
        if (!t) continue;
        if (t.isWhite === isWhite) return t;
        break;
      }

    } else if (side === 'left') {
      // Character moves +Z along X≈−R. Collect from leftmost col (ci = 0) inward.
      const ri = this._zToRow(charZ);
      if (ri < 0 || ri >= N) return null;
      for (let ci = 0; ci < N; ci++) {
        const t = this.tiles[ci][ri];
        if (!t) continue;
        if (t.isWhite === isWhite) return t;
        break;
      }
    }
    return null;
  }

  /**
   * Remove a subtile from the scene and the grid array.
   * @param {{ mesh, isWhite, col, row }} tile
   * @param {object} character  The character that collected it (passed to VFX hook)
   */
  removeTile(tile, character) {
    if (!tile) return;
    this.scene.remove(tile.mesh);
    this.tiles[tile.col][tile.row] = null;
    this.remaining--;
    VFX.onTileCollected(tile, character);
  }

  isEmpty() { return this.remaining <= 0; }

  // ─── Coordinate helpers ───────────────────────────────────────────────────

  _xToCol(wx) {
    return Math.round((wx + HALF - S / 2) / S);
  }

  _zToRow(wz) {
    return Math.round((wz + HALF - S / 2) / S);
  }
}
