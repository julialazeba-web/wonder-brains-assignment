// main.js — Three.js scene setup and main render loop

import * as THREE        from 'three';
import { CONFIG }        from './config.js';
import { GATE_POSITION } from './track.js';
import { GameManager }   from './gameManager.js';

// ─── Renderer & Scene ─────────────────────────────────────────────────────────
const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.COLORS.bg);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// ─── Camera (orthographic top-down, auto-fit to scene) ────────────────────────
// SCENE_DIAMETER is how many 3D units across we need to show.
// Track goes from -TRACK_DIST to +TRACK_DIST in both X and Z, plus ~1.5 for
// the physical track band and a small padding margin.
const SCENE_DIAMETER = CONFIG.TRACK_DIST * 2 + 2.0; // +2 = track band + padding

function computeFrustum() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const aspect = w / h;
  // We need to show SCENE_DIAMETER in BOTH axes.
  // frustumH * aspect = frustumW.  Both must be >= SCENE_DIAMETER.
  const frustumH = (aspect >= 1)
    ? SCENE_DIAMETER * 1.05                    // landscape: height drives fit
    : (SCENE_DIAMETER / aspect) * 1.05;        // portrait:  width is the bottleneck
  const frustumW = frustumH * aspect;
  return { frustumH, frustumW, aspect };
}

let { frustumH, frustumW } = computeFrustum();
const camera = new THREE.OrthographicCamera(
  -frustumW / 2,  frustumW / 2,
   frustumH / 2, -frustumH / 2,
  0.1, 500
);
camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);

// Sync renderer and camera together
function resizeAll() {
  renderer.setSize(container.clientWidth, container.clientHeight);
  const f = computeFrustum();
  camera.left   = -f.frustumW / 2;
  camera.right  =  f.frustumW / 2;
  camera.top    =  f.frustumH / 2;
  camera.bottom = -f.frustumH / 2;
  camera.updateProjectionMatrix();
}
resizeAll(); // Run once on startup
window.addEventListener('resize', resizeAll);

// ─── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(8, 16, 8);
scene.add(sun);

(function buildTrack() {
  const R = CONFIG.TRACK_DIST;
  const trackW = 0.6; // Thinner track
  const mat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.track, roughness: 0.55 });
  const Y = -0.18;
  
  const GRID_W = CONFIG.GRID_WORLD_SIZE;
  const TS = GRID_W / (CONFIG.GRID_CELLS * 2);
  const spawnX = -GRID_W/2 + TS/2;
  const endZ = GRID_W/2 - TS/2;
  
  // Bottom edge: from spawnX to R
  const bLen = R - spawnX + trackW; 
  const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bLen, 0.12, trackW), mat);
  bMesh.position.set(spawnX + bLen/2 - trackW/2, Y, R);
  scene.add(bMesh);
  
  // Right edge: from Z=R to Z=-R
  const rLen = R * 2 + trackW;
  const rMesh = new THREE.Mesh(new THREE.BoxGeometry(trackW, 0.12, rLen), mat);
  rMesh.position.set(R, Y, 0);
  scene.add(rMesh);
  
  // Top edge: from X=R to X=-R
  const tLen = R * 2 + trackW;
  const tMesh = new THREE.Mesh(new THREE.BoxGeometry(tLen, 0.12, trackW), mat);
  tMesh.position.set(0, Y, -R);
  scene.add(tMesh);
  
  // Left edge: from Z=-R to Z=endZ
  const lLen = endZ - (-R) + trackW;
  const lMesh = new THREE.Mesh(new THREE.BoxGeometry(trackW, 0.12, lLen), mat);
  lMesh.position.set(-R, Y, -R + lLen/2 - trackW/2);
  scene.add(lMesh);
})();

// ─── Pipe (Gate) ──────────────────────────────────────────────────────────────
(function buildPipe() {
  const g = new THREE.Group();

  // Pipe comes from far left to the gate
  const bodyGeo = new THREE.CylinderGeometry(0.65, 0.65, 8.0, 20);
  const bodyMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.pipe });
  const body    = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.x = -3.5; // Shift cylinder center leftwards

  const ringGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.18, 20);
  const ringMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.trackAccent });
  const mkRing  = (x) => {
    const r = new THREE.Mesh(ringGeo, ringMat);
    r.rotation.z = Math.PI / 2;
    r.position.x = x;
    return r;
  };

  g.add(body, mkRing(0.5), mkRing(-0.5), mkRing(-7.0));
  g.position.copy(GATE_POSITION);
  g.position.y = 0.4;
  g.position.x -= 0.5; // Shift entire group slightly left of the track edge
  scene.add(g);
})();

// ─── 3D Capacity label (X/5) — sits below the pipe on the track surface ───────
const _capCanvas = document.createElement('canvas');
_capCanvas.width  = 256;
_capCanvas.height = 128;
const _capCtx = _capCanvas.getContext('2d');
const _capTex = new THREE.CanvasTexture(_capCanvas);

const _capPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1.8, 0.9),
  new THREE.MeshBasicMaterial({
    map: _capTex, transparent: true, depthWrite: false,
    side: THREE.DoubleSide
  })
);
_capPlane.rotation.x = -Math.PI / 2;   // Lie flat, visible from top camera
// Position: Centered under the new tray queue
_capPlane.position.set(
  GATE_POSITION.x + 1.2, // Under the trays (which are now arrayed towards the spawn point)
  0.05,
  GATE_POSITION.z + 1.2
);
scene.add(_capPlane);

/**
 * Called by UIManager._refreshCapacity() to redraw the 3D counter.
 * @param {number} inUse  Trays currently following a character
 * @param {number} max    Total tray count
 */
export function updateCapacityLabel(inUse, max) {
  _capCtx.clearRect(0, 0, 256, 128);
  _capCtx.font         = 'bold 72px Arial Black';
  _capCtx.textAlign    = 'center';
  _capCtx.textBaseline = 'middle';
  _capCtx.fillStyle    = inUse >= max ? '#ff6666' : '#ccccee';
  _capCtx.fillText(`${inUse}/${max}`, 128, 64);
  _capTex.needsUpdate = true;
}
updateCapacityLabel(0, CONFIG.MAX_ON_TRACK);

// ─── Game ─────────────────────────────────────────────────────────────────────
const game  = new GameManager(scene);
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  game.update(clock.getDelta());
  renderer.render(scene, camera);
}
animate();
