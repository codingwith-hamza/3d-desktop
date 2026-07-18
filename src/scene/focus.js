import * as THREE from 'three';

const _euler = new THREE.Euler();

// where a window sits when maximized: covering its own wall face, leaving a
// thin gap so the neon corner seams still show between walls (reference look)
function wallTarget(def, m) {
  const { W, H, depth } = m;
  const gap = 14;
  const off = 4;
  switch (def.wall) {
    case 'left':
      return { pos: [-W / 2 + off, 0, -depth / 2], rot: [0, Math.PI / 2, 0], w: depth - gap * 2, h: H - gap * 2 };
    case 'right':
      return { pos: [W / 2 - off, 0, -depth / 2], rot: [0, -Math.PI / 2, 0], w: depth - gap * 2, h: H - gap * 2 };
    case 'back':
      return { pos: [0, 0, -depth + off], rot: [0, 0, 0], w: W - gap * 2, h: H - gap * 2 };
    case 'top':
      return { pos: [0, H / 2 - off, -depth / 2], rot: [Math.PI / 2, 0, 0], w: W - gap * 2, h: depth - gap * 2 };
    case 'bottom':
      return { pos: [0, -H / 2 + off, -depth / 2], rot: [-Math.PI / 2, 0, 0], w: W - gap * 2, h: depth - gap * 2 };
  }
}

// Maximize/restore: the green traffic light (or double-clicking the titlebar)
// grows a window to cover its own wall face — flat against the wall, other
// windows untouched, so any combination (including all five) can be maximized
// and the box interior becomes pure app surface. Esc restores everything.
export function createFocus(panels, m) {
  const state = new Map();

  snapshotHomes();

  for (const p of panels) {
    const el = p.obj.element;
    el.querySelector('.traffic .g').addEventListener('click', () => toggle(p));
    el.querySelector('.panel-titlebar').addEventListener('dblclick', () => toggle(p));
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const st of state.values()) st.target = 0;
    }
  });

  function snapshotHomes() {
    for (const p of panels) {
      const prev = state.get(p);
      state.set(p, {
        homePos: p.obj.position.clone(),
        homeQuat: p.obj.quaternion.clone(),
        max: null,
        maxPos: new THREE.Vector3(),
        maxQuat: new THREE.Quaternion(),
        baseW: parseFloat(p.obj.element.style.width),
        baseH: parseFloat(p.obj.element.style.height),
        cur: prev?.cur ?? 0,
        target: prev?.target ?? 0,
        sized: prev?.sized ?? false,
      });
    }
  }

  // swap the element to wall dimensions while compensating with scale,
  // so content re-rasterizes crisp at full size instead of stretching
  function sizeUp(p) {
    const st = state.get(p);
    if (st.sized) return;
    st.baseW = parseFloat(p.obj.element.style.width);
    st.baseH = parseFloat(p.obj.element.style.height);
    st.max = wallTarget(p.def, m);
    st.maxPos.set(...st.max.pos);
    st.maxQuat.setFromEuler(_euler.set(...st.max.rot));
    p.obj.element.style.width = `${Math.round(st.max.w)}px`;
    p.obj.element.style.height = `${Math.round(st.max.h)}px`;
    st.sized = true;
  }

  function sizeDown(p) {
    const st = state.get(p);
    if (!st.sized) return;
    p.obj.element.style.width = `${st.baseW}px`;
    p.obj.element.style.height = `${st.baseH}px`;
    p.obj.position.copy(st.homePos);
    p.obj.quaternion.copy(st.homeQuat);
    p.obj.scale.set(1, 1, 1);
    st.sized = false;
    st.cur = 0;
  }

  function toggle(p) {
    const st = state.get(p);
    if (st.target === 1) {
      st.target = 0;
    } else {
      st.target = 1;
      sizeUp(p);
    }
  }

  return {
    update(dt) {
      const k = 1 - Math.exp(-dt * 7);
      for (const p of panels) {
        const st = state.get(p);
        if (!st.sized) continue;
        st.cur += (st.target - st.cur) * k;
        if (st.target === 0 && st.cur < 0.006) {
          sizeDown(p);
          continue;
        }
        p.obj.position.lerpVectors(st.homePos, st.maxPos, st.cur);
        p.obj.quaternion.slerpQuaternions(st.homeQuat, st.maxQuat, st.cur);
        p.obj.scale.set(
          THREE.MathUtils.lerp(st.baseW / st.max.w, 1, st.cur),
          THREE.MathUtils.lerp(st.baseH / st.max.h, 1, st.cur),
          1
        );
      }
    },

    // call after layoutPanels() on resize: re-capture wall slots and re-fit
    // any maximized windows to the resized walls
    onResize() {
      const wasMax = panels.filter((p) => state.get(p).target === 1);
      snapshotHomes();
      for (const p of wasMax) {
        const st = state.get(p);
        st.sized = false;
        sizeUp(p);
      }
    },
  };
}
