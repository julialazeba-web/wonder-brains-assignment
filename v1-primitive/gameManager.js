// gameManager.js — Orchestrates all game systems
//
// Slot budget:
//   MAX_ON_TRACK  = 5  characters running simultaneously on the track
//   MAX_IN_QUEUE  = 5  characters waiting in the queue after a full lap
//
// Lose condition: a character finishes a lap with count > 0
//                 AND the queue is already full (all 5 queue slots occupied)
// Win  condition: grid.isEmpty()  →  all subtiles collected

import * as THREE      from 'three';
import { Character }   from './character.js';
import { SubtileGrid } from './grid.js';
import { buildTrays }  from './tray.js';
import { UIManager }   from './uiManager.js';
import { GATE_POSITION, QUEUE_3D_POSITIONS, SPAWN_POSITION } from './track.js';
import { VFX }         from './vfx.js';

import { updateCapacityLabel } from './main.js';

export class GameManager {
  constructor(scene) {
    this.scene      = scene;
    this.grid       = new SubtileGrid(scene);
    this.characters = [];
    this.trays      = buildTrays(scene, GATE_POSITION);
    this.over       = false;

    this.ui = new UIManager(
      (isWhite, count) => this.spawnCharacter(isWhite, count),
      (slotIdx)        => this.releaseFromQueue(slotIdx),
      (inUse, max)     => updateCapacityLabel(inUse, max)
    );

    // Position all trays in initial queue order right away
    this._repackFreeTrayPositions();
  }

  // ─── Tray queue helpers ────────────────────────────────────────────────────

  /**
   * Re-assigns target positions for every FREE tray so they slide
   * into a compact queue starting at the gate.
   * Call this whenever a tray is grabbed or returned.
   */
  _repackFreeTrayPositions() {
    const freeTrays = this.trays.filter(t => t.isFree);
    // Queue flows from Left (Pipe) to Right (Spawn).
    // The front of the queue (index 0) is closest to the spawn point.
    freeTrays.forEach((tray, i) => {
      tray.setTarget(new THREE.Vector3(
        SPAWN_POSITION.x - 0.5 - (i * 0.15),   // pack leftwards from spawn, tight stack
        0.12,
        GATE_POSITION.z
      ));
    });
  }

  /** Grab the front-most free tray (slot 0) and attach it to a character. */
  _assignTray(character) {
    // The first free tray in array order is always the "front" of queue
    // because _repackFreeTrayPositions() places index-0 closest to gate.
    const frontTray = this.trays.find(t => t.isFree);
    if (frontTray) {
      frontTray.attachTo(character);
      this._repackFreeTrayPositions(); // remaining free trays slide forward
    }
  }

  /** Detach tray from character and push it to the back of the free queue. */
  _releaseTray(character) {
    const tray = this.trays.find(t => t.character === character);
    if (!tray) return;

    tray.detach();

    // Move tray to the END of the array so it becomes the last queue position
    this.trays.splice(this.trays.indexOf(tray), 1);
    this.trays.push(tray);

    this._repackFreeTrayPositions(); // slide all free trays to new positions
  }

  // ─── Public: spawn ─────────────────────────────────────────────────────────

  spawnCharacter(isWhite, count) {
    if (this.over || this.ui.trackFull) return;

    const char = new Character(this.scene, isWhite, count);
    this.characters.push(char);
    this.ui.incrementTrack();
    this._assignTray(char);
  }

  // ─── Public: release from queue ────────────────────────────────────────────

  releaseFromQueue(slotIdx) {
    if (this.over || this.ui.trackFull) return;

    const char = this.characters.find(
      c => c.state === 'queued' && c.queueSlotIndex === slotIdx
    );
    if (!char) return;

    char.releaseFromQueue();
    this.ui.clearQueueSlot(slotIdx);
    this.ui.incrementTrack();
    this._assignTray(char);
  }

  // ─── Private: character events ─────────────────────────────────────────────

  _onVanish(char) {
    this._releaseTray(char);
    // Always remove from scene on vanish (mesh is always in scene now)
    this.scene.remove(char.mesh);
    char.mesh.geometry.dispose();
    this.characters = this.characters.filter(c => c !== char);
    this.ui.decrementTrack();
  }

  _onLapComplete(char) {
    this._releaseTray(char);

    const slotIdx = this.ui.findFreeQueueSlot();
    if (slotIdx === -1) {
      this._lose();
      return;
    }

    // Pass the 3D parking position so the character mesh moves there
    char.enterQueue(slotIdx, QUEUE_3D_POSITIONS[slotIdx]);
    this.ui.fillQueueSlot(slotIdx, char.isWhite, char.count);
    this.ui.decrementTrack();
  }

  // ─── End states ────────────────────────────────────────────────────────────

  _win()  { this.over = true; this.ui.showWin();  VFX.onWin();  }
  _lose() { this.over = true; this.ui.showLose(); VFX.onLose(); }

  // ─── Main update ───────────────────────────────────────────────────────────

  update(delta) {
    if (this.over) return;

    for (const char of [...this.characters]) {
      if (char.state !== 'active') continue;
      const result = char.update(delta, this.grid);
      if      (result === 'vanish')       this._onVanish(char);
      else if (result === 'lap_complete') this._onLapComplete(char);
    }

    for (const tray of this.trays) tray.update();

    // Win: check every frame in case last tile was taken by a char still alive
    if (!this.over && this.grid.isEmpty()) this._win();
  }
}
