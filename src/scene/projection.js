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
  // the room extends BEHIND the resting camera too, so the camera can fly
  // forward (lean-in) or drift back and always remains inside the box —
  // the page background is unreachable from any pose
  const front = Math.round(dist * 1.5);
  return Object.assign(target, { W, H, dist, depth, front });
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

  // Lean-in = FLIGHT: the camera physically travels into the room, so
  // approaching a wall magnifies it without limit — at full lean the eye is
  // 82% of the way to the back wall (~10x). A dead zone keeps natural sway
  // from pumping the motion; leaning back drifts toward the (extended) front.
  const zRaw = head.z ?? 0;
  const zIn = Math.max(0, zRaw - 0.12);
  const zOut = Math.min(0, zRaw + 0.12);
  const flight = (zIn / 1.18) * (m.dist + m.depth * 0.82);
  const cz = THREE.MathUtils.clamp(
    m.dist + introOffset - flight - zOut * m.dist * 0.3,
    -m.depth * 0.82,
    m.front * 0.9
  );

  camera.position.set(ex, ey, cz);
  camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(m.H / 2 / m.dist));
  camera.aspect = m.W / m.H;
  // At rest the frustum is sheared so the z = 0 opening stays pinned to the
  // viewport edges (the portal signature); the shear fades out as the camera
  // flies in, morphing smoothly into free flight — the extended walls
  // guarantee the frustum always terminates on room surface either way.
  const k = THREE.MathUtils.clamp(cz / m.dist, 0, 1);
  camera.setViewOffset(m.W, m.H, -ex * k, ey * k, m.W, m.H);
}
