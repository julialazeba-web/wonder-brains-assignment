// uiManager.js — HTML overlay UI: pool cards, queue slots, capacity counter
//
// Responsibilities:
//   • Renders the character spawn pool (bottom strip)
//   • Renders the 5 queue slots (above the pool)
//   • Shows the on-track capacity counter  "X / MAX_ON_TRACK"
//   • Shows win / lose overlay
//   • Calls back into GameManager when player spawns or releases

import { CONFIG } from './config.js';

export class UIManager {
  /**
   * @param {Function} onSpawnRequest   (isWhite: bool, count: number) => void
   * @param {Function} onQueueRelease   (slotIndex: number) => void
   * @param {Function} onCapacityChange (inUse: number, max: number) => void
   */
  constructor(onSpawnRequest, onQueueRelease, onCapacityChange) {
    this._onSpawnRequest = onSpawnRequest;
    this._onQueueRelease = onQueueRelease;
    this._onCapChange    = onCapacityChange;  // Updates 3D counter label

    this._onTrackCount = 0;
    this._queueSlots   = new Array(CONFIG.MAX_IN_QUEUE).fill(null);
    // null = empty, { isWhite, count } = occupied

    // Note: capacity counter is now a 3D canvas label in the scene.
    // It is updated via the onCapacityChange callback.
    this._queueEl = document.getElementById('queue-slots');
    this._poolEl  = document.getElementById('character-pool');

    this._queueSlotEls = [];
    this._buildQueueSlots();
    this._buildPool();
    this._refreshCapacity();
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

  _buildQueueSlots() {
    this._queueEl.innerHTML = '';
    for (let i = 0; i < CONFIG.MAX_IN_QUEUE; i++) {
      const el = document.createElement('div');
      el.className = 'queue-slot';
      el.dataset.index = i;
      el.addEventListener('click', () => this._onQueueSlotClick(i));
      this._queueEl.appendChild(el);
      this._queueSlotEls.push(el);
    }
  }

  _buildPool() {
    this._poolEl.innerHTML = '';
    CONFIG.POOL_COLUMNS.forEach((colCfg, colIdx) => {
      const colEl = document.createElement('div');
      colEl.className = 'pool-column';

      // Pre-fill 3 cards per column (top card is the one that spawns)
      for (let i = 0; i < 3; i++) {
        this._addCard(colEl, colCfg);
      }

      colEl.addEventListener('click', () => {
        // Only the FIRST (top) sphere spawns
        const sphere = colEl.querySelector('.pool-sphere');
        if (!sphere) return;
        if (this._onTrackCount >= CONFIG.MAX_ON_TRACK) return;

        const isWhite = sphere.classList.contains('sphere-white');
        const count   = parseInt(sphere.dataset.count, 10);
        sphere.remove();
        this._addCard(colEl, colCfg); // Replenish from below
        this._onSpawnRequest(isWhite, count);
      });

      this._poolEl.appendChild(colEl);
    });
  }

  /** Creates and prepends a sphere element into a pool column. */
  _addCard(colEl, colCfg) {
    let isWhite;
    if (colCfg.type === 'white')      isWhite = true;
    else if (colCfg.type === 'black') isWhite = false;
    else                              isWhite = Math.random() >= 0.5;

    const sphere = document.createElement('div');
    sphere.className     = `pool-sphere ${isWhite ? 'sphere-white' : 'sphere-black'}`;
    sphere.dataset.count = colCfg.startCount;
    sphere.textContent   = colCfg.startCount;

    // Insert at top so the first sphere is always on top of the column
    colEl.insertBefore(sphere, colEl.firstChild);
  }

  // ─── Queue slots ───────────────────────────────────────────────────────────

  _onQueueSlotClick(i) {
    if (!this._queueSlots[i]) return;
    this._onQueueRelease(i);
  }

  /**
   * Mark a queue slot as occupied — just highlight the border.
   * The 3D character sphere at the slot position provides the visual.
   */
  fillQueueSlot(slotIndex, isWhite, count) {
    this._queueSlots[slotIndex] = { isWhite, count };
    const el = this._queueSlotEls[slotIndex];
    el.style.borderColor = isWhite ? 'rgba(255,255,255,0.7)' : 'rgba(130,130,255,0.7)';
    el.innerHTML = '';
    
    const sphere = document.createElement('div');
    sphere.className = `pool-sphere ${isWhite ? 'sphere-white' : 'sphere-black'}`;
    sphere.textContent = count;
    // Scale slightly to fit inside the queue slot padding
    sphere.style.transform = 'scale(0.85)';
    sphere.style.margin = '0 auto';
    el.appendChild(sphere);

    el.title = 'Click to release';
  }

  /**
   * Clear a queue slot (character vanished or re-released).
   */
  clearQueueSlot(slotIndex) {
    this._queueSlots[slotIndex] = null;
    const el = this._queueSlotEls[slotIndex];
    el.style.borderColor = '';
    el.innerHTML = '';
    el.title = '';
  }

  /** Find and return the first free queue slot index, or -1 if all full. */
  findFreeQueueSlot() {
    return this._queueSlots.findIndex(s => s === null);
  }

  get queueFull() {
    return this._queueSlots.every(s => s !== null);
  }

  // ─── Capacity ──────────────────────────────────────────────────────────────

  incrementTrack() {
    this._onTrackCount++;
    this._refreshCapacity();
  }

  decrementTrack() {
    this._onTrackCount = Math.max(0, this._onTrackCount - 1);
    this._refreshCapacity();
  }

  _refreshCapacity() {
    const inUse = this._onTrackCount;
    if (this._onCapChange) {
      this._onCapChange(inUse, CONFIG.MAX_ON_TRACK);
    }
  }

  get trackFull() {
    return this._onTrackCount >= CONFIG.MAX_ON_TRACK;
  }

  // ─── Overlays ──────────────────────────────────────────────────────────────

  showWin() {
    this._showOverlay('🎉 YOU WIN!', CONFIG.COLORS.winColor, true);
  }

  showLose() {
    this._showOverlay('💀 GAME OVER', CONFIG.COLORS.loseColor, false);
  }

  _showOverlay(text, color, isWin) {
    const el = document.createElement('div');
    el.id = 'end-overlay';

    const subtitle = isWin
      ? 'All tiles cleared! Amazing!'
      : 'The queue is full. Try again!';

    const emoji = isWin ? '🏆' : '💀';

    el.innerHTML = `
      <div class="overlay-panel">
        <div class="overlay-emoji">${emoji}</div>
        <div class="overlay-title" style="color:${color};text-shadow:0 0 24px ${color}">${text}</div>
        <div class="overlay-sub">${subtitle}</div>
        <button class="overlay-btn" onclick="location.reload()">Play Again</button>
      </div>
    `;
    el.style.cssText = `
      position:absolute; inset:0; display:flex;
      justify-content:center; align-items:center;
      background:rgba(0,0,0,0.78); z-index:200;
      animation: fadeIn 0.4s ease;
    `;
    document.getElementById('app').appendChild(el);

    // Inject keyframe animation once
    if (!document.getElementById('overlay-style')) {
      const s = document.createElement('style');
      s.id = 'overlay-style';
      s.textContent = `
        @keyframes fadeIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        .overlay-panel {
          display:flex; flex-direction:column; align-items:center; gap:12px;
          background:rgba(20,20,35,0.92);
          border:2px solid rgba(255,255,255,0.1);
          border-radius:24px; padding:36px 40px;
          backdrop-filter:blur(8px);
          animation: fadeIn 0.35s ease;
        }
        .overlay-emoji { font-size:56px; line-height:1; }
        .overlay-title { font-size:38px; font-weight:900; font-family:'Arial Black',sans-serif; letter-spacing:2px; }
        .overlay-sub   { font-size:14px; color:#aaa; letter-spacing:0.5px; margin-top:-4px; }
        .overlay-btn   {
          margin-top:8px; padding:12px 32px;
          background:linear-gradient(135deg,#6060ff,#a040ff);
          color:#fff; border:none; border-radius:50px;
          font-size:17px; font-weight:900;
          cursor:pointer; letter-spacing:1px;
          box-shadow:0 4px 20px rgba(100,60,255,0.5);
          transition:transform 0.1s, box-shadow 0.1s;
        }
        .overlay-btn:hover  { transform:translateY(-2px); box-shadow:0 8px 28px rgba(100,60,255,0.7); }
        .overlay-btn:active { transform:scale(0.95); }
      `;
      document.head.appendChild(s);
    }
  }
}
