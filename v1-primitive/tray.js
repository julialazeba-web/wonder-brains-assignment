// tray.js — Golden tray (поднос) that follows each active character
//
// v2 Queue improvement: free trays slide smoothly in a compact queue.
// Rotation behaviour:
//   PARKED  → tray stands on edge (vertical, like a coin) rotation.x = π/2
//   ACTIVE  → tray lies flat under the character          rotation.x = 0
//   Transition is a smooth lerp each frame.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SPAWN_POSITION } from './track.js';
import { VFX } from './vfx.js';

const TRAY_GEO = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24);

export class Tray {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} initialPos  Starting world position
   */
  constructor(scene, initialPos) {
    this.scene          = scene;
    this.character      = null;
    this.targetPosition = initialPos.clone();

    this._buildMesh();
    this.mesh.position.copy(initialPos);
    // Start standing on edge (rotation.z = π/2 = like a plate standing up)
    this.mesh.rotation.z = Math.PI / 2;
  }

  _buildMesh() {
    const mat = new THREE.MeshStandardMaterial({
      color:     CONFIG.COLORS.tray,
      metalness: 0.55,
      roughness: 0.35,
    });
    this.mesh = new THREE.Mesh(TRAY_GEO, mat);
    this.scene.add(this.mesh);
  }

  /** Assign this tray to follow a character. Tray will animate to flat. */
  attachTo(character) {
    this.character = character;
  }

  /**
   * Detach from character. Tray will animate back to standing on edge,
   * then slide to the new targetPosition set by GameManager.
   */
  detach() {
    this.character = null;
    VFX.onTrayReturn(this);
  }

  /** Set the world position this tray should slide toward when free. */
  setTarget(pos) {
    this.targetPosition.copy(pos);
  }

  /** Called every frame by GameManager. */
  update() {
    if (this.character && this.character.state === 'active') {
      // ── Following character: flat under the sphere ──────────────────────
      const p = this.character.mesh.position;
      this.mesh.position.set(p.x, p.y - 0.42, p.z);
      // Animate rotation to flat (rotation.z → 0)
      this.mesh.rotation.z = THREE.MathUtils.lerp(
        this.mesh.rotation.z, 0, 0.14
      );
      VFX.onTrayFollow(this, this.character);
    } else {
      // ── Parked / returning: slide to queue position ─────────────────────
      this.mesh.position.lerp(this.targetPosition, 0.10);
      // Animate rotation back to on-edge (rotation.z → π/2)
      this.mesh.rotation.z = THREE.MathUtils.lerp(
        this.mesh.rotation.z, Math.PI / 2, 0.14
      );
    }
  }

  get isFree() { return this.character === null; }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function buildTrays(scene, gatePos) {
  const trays = [];
  const count = CONFIG.MAX_ON_TRACK;
  for (let i = 0; i < count; i++) {
    const initPos = new THREE.Vector3(
      SPAWN_POSITION.x - 0.5 - (i * 0.15),
      0.12,
      gatePos.z
    );
    trays.push(new Tray(scene, initPos));
  }
  return trays;
}
