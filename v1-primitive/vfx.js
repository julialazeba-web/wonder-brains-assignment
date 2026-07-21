// vfx.js — Animation & VFX hooks (empty in v1, fill in v2/v3)
//
// HOW TO USE:
// In v2/v3 you can replace any empty function body with an animation.
// Each hook receives the relevant game objects so you can animate them.
// Example (v2): VFX.onTileCollected = (tile, char) => { animateFlyToChar(tile, char); }

export const VFX = {
  /** Called when a subtile is collected by a character */
  onTileCollected: (tile, character) => {},

  /** Called every frame while a character is moving (use for particle trails, etc.) */
  onCharacterMove: (character, delta) => {},

  /** Called when a character first spawns onto the track */
  onCharacterSpawn: (character) => {},

  /** Called when a character's counter hits 0 and it vanishes mid-track */
  onCharacterVanish: (character) => {},

  /** Called when a character completes a lap and enters the queue */
  onCharacterEnterQueue: (character, slotIndex) => {},

  /** Called when a queued character is released back to the track by the player */
  onCharacterRelease: (character) => {},

  /** Called each frame while a tray follows a character */
  onTrayFollow: (tray, character) => {},

  /** Called when a tray detaches from a character and returns to the parked position */
  onTrayReturn: (tray) => {},

  /** Called when the player clears all tiles (win condition) */
  onWin: () => {},

  /** Called when the queue is full and a character can't enter (lose condition) */
  onLose: () => {},
};
