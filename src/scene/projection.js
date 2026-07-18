import * as THREE from 'three';

export const FOV = 50;

// World units are CSS pixels at the screen plane (z = 0), so CSS3D panels
// render at their natural DOM size. The room recedes from z = 0 to z = -depth,
// and the camera sits at z = dist, where dist is chosen so the room's front
// opening exactly fills the viewport when the head is centered.
export function computeMetrics(target = {}) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dist = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
  const depth = Math.round(Math.max(W, H) * 1.15);
  return Object.assign(target, { W, H, dist, depth });
}

const _look = new THREE.Vector3();

// Head position (normalized -1..1) → camera pose. The camera translates with
// the head and partially counter-looks toward a point deep in the room, which
// keeps the opening roughly framed while revealing the opposite wall — the
// "window into a box" feel.
export function updateCamera(camera, head, m, introOffset = 0) {
  const x = head.x * m.W * 0.32;
  const y = head.y * m.H * 0.26;
  camera.position.set(x, y, m.dist + introOffset);
  _look.set(x * 0.4, y * 0.4, -m.depth * 0.55);
  camera.lookAt(_look);
}
