import * as THREE from 'three';

const C = {
  bg: 0x05060a,
  wall: 0x0b0e17,
  back: 0x080b13,
  floor: 0x120d22,
  ceiling: 0x090c14,
  edge: 0x4cc9f0,
  grid: 0x1c2742,
  dust: 0x6fb8d9,
};

function wall(w, h, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color })
  );
  return mesh;
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
    new THREE.LineBasicMaterial({ color: C.grid, transparent: true, opacity: 0.55 })
  );
}

export function buildRoom(scene, m) {
  const { W, H, depth } = m;
  const group = new THREE.Group();

  scene.fog = new THREE.Fog(C.bg, m.dist * 0.9, m.dist + depth * 1.35);

  const floor = wall(W, depth, C.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -H / 2, -depth / 2);

  const ceiling = wall(W, depth, C.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H / 2, -depth / 2);

  const left = wall(depth, H, C.wall);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, 0, -depth / 2);

  const right = wall(depth, H, C.wall);
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, 0, -depth / 2);

  const back = wall(W, H, C.back);
  back.position.set(0, 0, -depth);

  group.add(floor, ceiling, left, right, back);

  // glowing seams along every interior edge of the box
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, depth)),
    new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.9 })
  );
  // front edge ring sits a few px inside the opening, so a faint neon rim
  // frames the portal during head movement instead of clipping at the border
  edges.position.set(0, 0, -depth / 2 - 6);
  group.add(edges);

  const grid = makeGrid(W, depth, Math.round(H / 9));
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, -H / 2 + 1, -depth / 2);
  group.add(grid);

  // slow-drifting dust motes for extra depth cues
  const COUNT = 140;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * W * 0.9;
    pos[i * 3 + 1] = (Math.random() - 0.5) * H * 0.9;
    pos[i * 3 + 2] = -Math.random() * depth;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: C.dust,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.45,
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
