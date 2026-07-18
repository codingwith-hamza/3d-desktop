import * as THREE from 'three';

// Ember on Obsidian: deep violet-black surfaces, ember-orange seams, golden
// motes — dark with one warm accent instead of wall-to-wall neon.
const C = {
  haze: 0x0b0a10,
  coral: 0x221a35, // wall top: deep violet
  amber: 0x0d0b13, // wall bottom: near-black
  floorFar: 0x181229,
  floorNear: 0x0d0b13,
  ceilNear: 0x110f1a,
  ceilFar: 0x2a1c40,
  seam: 0xff9d5c,
  grid: 0x5a4a8a,
  dust: 0xffd9a8,
};

// plane with a vertical vertex-color gradient (top → bottom in local space)
function gradWall(w, h, topColor, bottomColor) {
  const geo = new THREE.PlaneGeometry(w, h);
  const t = new THREE.Color(topColor);
  const b = new THREE.Color(bottomColor);
  geo.setAttribute(
    'color',
    new THREE.Float32BufferAttribute([t.r, t.g, t.b, t.r, t.g, t.b, b.r, b.g, b.b, b.r, b.g, b.b], 3)
  );
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
}

// grid lines drawn flat on the floor plane (before rotation: XY plane)
function makeGrid(w, d, step) {
  const pts = [];
  for (let x = -w / 2; x <= w / 2 + 1; x += step) {
    pts.push(x, -d / 2, 0, x, d / 2, 0);
  }
  for (let z = -d / 2; z <= d / 2 + 1; z += step) {
    pts.push(-w / 2, z, 0, w / 2, z, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: C.grid, transparent: true, opacity: 0.35 })
  );
}

export function buildRoom(scene, m) {
  const { W, H, depth, front } = m;
  const group = new THREE.Group();

  // walls run from z = +front (behind the resting camera) to z = -depth, so
  // the camera stays inside the box while flying — length L, centered at cz
  const L = front + depth;
  const cz = (front - depth) / 2;

  scene.fog = new THREE.Fog(C.haze, m.dist * 0.9, m.dist + depth * 1.35);

  // side and back walls: violet glow high, fading to black at the floor line
  const left = gradWall(L, H, C.coral, C.amber);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, 0, cz);

  const right = gradWall(L, H, C.coral, C.amber);
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, 0, cz);

  const back = gradWall(W, H, C.coral, C.amber);
  back.position.set(0, 0, -depth);

  // floor: light peach near, deeper amber far (local top edge = far side)
  const floor = gradWall(W, L, C.floorFar, C.floorNear);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -H / 2, cz);

  // ceiling: bright near, sun-coral far (local bottom edge = far side)
  const ceiling = gradWall(W, L, C.ceilNear, C.ceilFar);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H / 2, cz);

  group.add(floor, ceiling, left, right, back);

  // ember seams along every interior edge of the box
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, L)),
    new THREE.LineBasicMaterial({ color: C.seam, transparent: true, opacity: 0.85 })
  );
  edges.position.set(0, 0, cz);
  group.add(edges);

  const grid = makeGrid(W, L, Math.round(H / 9));
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, -H / 2 + 1, cz);
  group.add(grid);

  // slow-drifting golden motes for extra depth cues
  const COUNT = 140;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * W * 0.9;
    pos[i * 3 + 1] = (Math.random() - 0.5) * H * 0.9;
    pos[i * 3 + 2] = front - Math.random() * L;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: C.dust,
      size: 2.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.7,
    })
  );
  group.add(dust);

  scene.add(group);

  function update(dt) {
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += dt * 9;
      if (arr[i * 3 + 1] > H / 2) arr[i * 3 + 1] = -H / 2;
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  function dispose() {
    scene.remove(group);
    group.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
  }

  return { update, dispose };
}
