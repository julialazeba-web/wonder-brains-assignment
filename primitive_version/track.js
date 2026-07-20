// track.js — Track path definition and position math
// The track is a square loop traversed CLOCKWISE when viewed from above (Y-up).
// Progress is measured as a distance (0 → TRACK_TOTAL_LENGTH) along the path.
// 
// Clockwise order starting at gate (bottom-left corner):
//   Gate (bottom-left) → bottom-right → top-right → top-left → back to gate

import * as THREE from 'three';
import { CONFIG } from './config.js';

const R = CONFIG.TRACK_DIST; // e.g. 6.0
const Y = 0.5;               // Character ride height

const GRID_W = CONFIG.GRID_WORLD_SIZE; // 7.0
const TS = GRID_W / (CONFIG.GRID_CELLS * 2); // Subtile size e.g. 7.0 / 26

// ─── Waypoints (clockwise from gate) ─────────────────────────────────────────
export const GATE_POSITION = new THREE.Vector3(-R, Y, R); // Bottom-left

// Spawn point aligns vertically with the first subtile column of the grid
export const SPAWN_POSITION = new THREE.Vector3(-GRID_W/2 + TS/2, Y, R);
export const SPAWN_DISTANCE = SPAWN_POSITION.distanceTo(GATE_POSITION);

// End point aligns vertically with the bottom-most row of the grid on the left edge
export const END_POSITION = new THREE.Vector3(-R, Y, GRID_W/2 - TS/2);

// ─── Queue parking positions ───────────────────────────────────────────────────
// 5 slots in a row just below the gate, outside the track edge.
// Characters park here (mesh stays in scene) after completing a lap.
export const QUEUE_3D_POSITIONS = Array.from({ length: 5 }, (_, i) =>
  new THREE.Vector3(
    -R + i * 0.9,   // Spread rightward from gate corner
    Y,              // Same height as active characters
    R + 0.72        // Just below the track bottom edge
  )
);

export const WAYPOINTS = [
  new THREE.Vector3(-R, Y,  R),  // 0: Gate / bottom-left  → move RIGHT
  new THREE.Vector3( R, Y,  R),  // 1: Bottom-right        → move UP (−Z)
  new THREE.Vector3( R, Y, -R),  // 2: Top-right           → move LEFT
  new THREE.Vector3(-R, Y, -R),  // 3: Top-left            → move DOWN (+Z)
  // wraps back to 0
];

// Precompute segment lengths and cumulative distances
const SEG_LENGTHS = WAYPOINTS.map((wp, i) =>
  wp.distanceTo(WAYPOINTS[(i + 1) % WAYPOINTS.length])
);

export const TRACK_TOTAL_LENGTH = SEG_LENGTHS.reduce((a, b) => a + b, 0);

const CUMULATIVE = [0];
SEG_LENGTHS.forEach(len => CUMULATIVE.push(CUMULATIVE.at(-1) + len));

export const END_DISTANCE = CUMULATIVE[3] + WAYPOINTS[3].distanceTo(END_POSITION);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the 3D world position at a given distance along the track.
 * Wraps automatically around the full loop.
 */
export function getPositionAtDistance(dist) {
  dist = ((dist % TRACK_TOTAL_LENGTH) + TRACK_TOTAL_LENGTH) % TRACK_TOTAL_LENGTH;

  for (let i = 0; i < WAYPOINTS.length; i++) {
    if (dist <= CUMULATIVE[i + 1]) {
      const t = (dist - CUMULATIVE[i]) / SEG_LENGTHS[i];
      return new THREE.Vector3().lerpVectors(
        WAYPOINTS[i],
        WAYPOINTS[(i + 1) % WAYPOINTS.length],
        t
      );
    }
  }
  return WAYPOINTS[0].clone();
}

/**
 * Returns which side of the track the character is on.
 * 'bottom' | 'right' | 'top' | 'left'
 */
export function getSideAtDistance(dist) {
  dist = ((dist % TRACK_TOTAL_LENGTH) + TRACK_TOTAL_LENGTH) % TRACK_TOTAL_LENGTH;
  const SIDES = ['bottom', 'right', 'top', 'left'];
  for (let i = 0; i < WAYPOINTS.length; i++) {
    if (dist >= CUMULATIVE[i] && dist < CUMULATIVE[i + 1]) {
      return SIDES[i];
    }
  }
  return 'bottom';
}
