// character.js — Character entity class
//
// Lifecycle:
//   'active'  → moving on track, collecting tiles
//   'queued'  → finished lap with count > 0, waiting in queue UI
//   'done'    → count reached 0, removed from scene
//
// Each character has:
//   • A sphere mesh in the 3D scene
//   • A canvas-based number label that follows above it
//   • A distance value (progress along the track)
//   • A cooldown timer for tile collection

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { getPositionAtDistance, getSideAtDistance, TRACK_TOTAL_LENGTH, SPAWN_DISTANCE, END_DISTANCE } from './track.js';
import { VFX } from './vfx.js';

let _idCounter = 0;

export class Character {
  /**
   * @param {THREE.Scene} scene
   * @param {boolean} isWhite
   * @param {number}  startCount
   */
  constructor(scene, isWhite, startCount) {
    this.id       = _idCounter++;
    this.scene    = scene;
    this.isWhite  = isWhite;
    this.count    = startCount;
    this.maxCount = startCount;

    this.state    = 'active';   // 'active' | 'queued' | 'done'
    this.distance = SPAWN_DISTANCE; // Start exactly at spawn point
    this.queueSlotIndex = -1;   // Assigned when entering queue

    this._cooldown = 0;         // Seconds until next collection attempt

    this._buildMesh();
    VFX.onCharacterSpawn(this);
  }

  // ─── Mesh ──────────────────────────────────────────────────────────────────

  _buildMesh() {
    const geo = new THREE.SphereGeometry(0.4, 20, 20);
    const mat = new THREE.MeshStandardMaterial({
      color:     this.isWhite ? CONFIG.COLORS.charWhite : CONFIG.COLORS.charBlack,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(getPositionAtDistance(SPAWN_DISTANCE));
    this.scene.add(this.mesh);
    this._buildLabel();
  }

  _buildLabel() {
    const canvas  = document.createElement('canvas');
    canvas.width  = 128;
    canvas.height = 128;
    this._labelCtx = canvas.getContext('2d');
    this._labelTex = new THREE.CanvasTexture(canvas);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.75),
      new THREE.MeshBasicMaterial({ map: this._labelTex, transparent: true, depthWrite: false })
    );
    plane.rotation.x = -Math.PI / 2;  // Lay flat, face upward so camera sees it
    plane.position.y = 0.55;
    this.mesh.add(plane);
    this._updateLabel();
  }

  _updateLabel() {
    const ctx = this._labelCtx;
    ctx.clearRect(0, 0, 128, 128);
    ctx.font         = 'bold 68px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = this.isWhite ? '#111111' : '#ffffff';
    ctx.fillText(String(this.count), 64, 64);
    this._labelTex.needsUpdate = true;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  /**
   * Called every frame while the character is active.
   * @param {number} delta  Seconds since last frame
   * @param {SubtileGrid} grid
   * @returns {'continue' | 'lap_complete' | 'vanish'}
   */
  update(delta, grid) {
    if (this.state !== 'active') return 'none';

    // Move along track
    const prevDist  = this.distance;
    this.distance  += CONFIG.CHARACTER_SPEED * delta;

    // Update 3D position
    const pos = getPositionAtDistance(this.distance);
    this.mesh.position.copy(pos);
    VFX.onCharacterMove(this, delta);

    // Tile collection (with cooldown)
    this._cooldown -= delta;
    if (this._cooldown <= 0) {
      const side        = getSideAtDistance(this.distance);
      const collectible = grid.getCollectible(side, pos.x, pos.z, this.isWhite);

      if (collectible) {
        grid.removeTile(collectible, this);
        this.count--;
        this._updateLabel();
        this._cooldown = CONFIG.COLLECTION_COOLDOWN;

        if (this.count <= 0) {
          this._vanish();
          return 'vanish';
        }
      }
    }

    // Detect full lap completion (it started at SPAWN_DISTANCE, finishes at END_DISTANCE)
    if (prevDist < END_DISTANCE && this.distance >= END_DISTANCE) {
      this.distance = SPAWN_DISTANCE; // Reset to spawn point in case it gets re-queued
      return 'lap_complete';
    }

    return 'continue';
  }

  // ─── State transitions ─────────────────────────────────────────────────────

  /** Counter hit 0 mid-track — disappear immediately */
  _vanish() {
    this.state = 'done';
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    VFX.onCharacterVanish(this);
  }

  /** Completed a lap with remaining count → park at 3D queue slot position */
  enterQueue(slotIndex, queuePos) {
    this.state          = 'queued';
    this.queueSlotIndex = slotIndex;
    this.distance       = 0;
    this.mesh.visible   = false; // Hide from 3D scene, it will be rendered in the HTML UI
    VFX.onCharacterEnterQueue(this, slotIndex);
  }

  /** Player clicked the queue slot — release back onto track */
  releaseFromQueue() {
    this.state     = 'active';
    this.distance  = SPAWN_DISTANCE;
    this._cooldown = 0;
    this.mesh.visible = true;
    // Snap to new spawn position
    this.mesh.position.copy(getPositionAtDistance(SPAWN_DISTANCE));
    VFX.onCharacterRelease(this);
  }
}
