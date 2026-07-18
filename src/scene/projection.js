import * as THREE from 'three';

// World units are CSS pixels at the screen plane (z = 0), so CSS3D panels
// render at their natural DOM size. The room recedes from z = 0 to z = -depth,
// and the camera sits at z = dist, where dist is chosen so the room's front
// opening exactly fills the viewport when the head is centered.
export function computeMetrics(target = {}) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dist = H / 2 / Math.tan(THREE.MathUtils.degToRad(50) / 2);
  const depth = Math.round(Math.max(W, H) * 1.15);
  return Object.assign(target, { W, H, dist, depth });
}

// True off-axis ("portal") projection: the camera translates with the head but
// never rotates, and the frustum is sheared via a view offset so it always
// passes through the room's fixed front opening at z = 0. The opening stays
// pinned exactly to the viewport edges at all times — the 3D effect lives
// entirely inside the box, and the page background can never be revealed.
// (CSS3DRenderer honors camera.view offsets, so the HTML panels and the WebGL
// room shear identically and stay registered.)
export function updateCamera(camera, head, m, introOffset = 0) {
  const ex = head.x * m.W * 0.34;
  const ey = head.y * m.H * 0.3;
  // Lean-in magnification: pulling the virtual eye BACK (narrower frustum
  // through the same pinned opening) makes wall content larger on screen —
  // the "bring the page closer to your eyes" feel. A dead zone keeps natural
  // sway from pumping the zoom, and both directions are hard-limited.
  const zRaw = head.z ?? 0;
  const zIn = Math.max(0, zRaw - 0.12); // threshold before zoom engages
  const zOut = Math.min(0, zRaw + 0.12);
  const zoom = THREE.MathUtils.clamp(1 + zIn * 1.7 + zOut * 0.3, 0.85, 3.0);
  const ez = (m.dist + introOffset) * zoom;

  camera.position.set(ex, ey, ez);
  // keep the z = 0 plane exactly viewport-sized even while the intro dollies
  camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(m.H / 2 / ez));
  camera.aspect = m.W / m.H;
  // shear the frustum back onto the fixed screen rectangle (1 world unit = 1px at z = 0)
  camera.setViewOffset(m.W, m.H, -ex, ey, m.W, m.H);
}
