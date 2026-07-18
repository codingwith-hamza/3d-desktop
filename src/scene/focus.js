import * as THREE from 'three';

const _euler = new THREE.Euler();

// where a window sits when maximized: covering its own wall face, leaving a
// thin gap so the glowing corner seams still show between walls
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

// Window manager for the wall screens:
// - green light / titlebar double-click → maximize onto the wall (or float back)
// - red light → close: the screen fades out and the wall goes bare
// - the dock reopens closed apps (opening one closes its wall-mate)
// - Esc floats every maximized window
export function createFocus(panels, m) {
  const state = new Map();
  let changed = null;

  snapshotHomes();

  for (const p of panels) {
    const el = p.obj.element;
    el.querySelector('.traffic .g').addEventListener('click', () => toggleMax(p));
    el.querySelector('.traffic .r').addEventListener('click', () => setOpen(p, false));
    el.querySelector('.panel-titlebar').addEventListener('dblclick', () => toggleMax(p));
    if (p.def.closed) el.classList.add('off');
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
        closed: prev?.closed ?? !!p.def.closed,
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

  function toggleMax(p) {
    const st = state.get(p);
    if (st.target === 1) {
      st.target = 0;
    } else {
      st.target = 1;
      sizeUp(p);
    }
  }

  function setOpen(p, open) {
    const st = state.get(p);
    if (open) {
      // one screen per wall: opening evicts the current occupant
      for (const q of panels) {
        if (q !== p && q.def.wall === p.def.wall && !state.get(q).closed) setOpen(q, false);
      }
      st.closed = false;
      p.obj.element.classList.remove('off');
    } else {
      st.closed = true;
      p.obj.element.classList.add('off');
    }
    changed?.();
  }

  return {
    maximizeAll() {
      for (const p of panels) {
        const st = state.get(p);
        if (st.closed) continue;
        st.target = 1;
        sizeUp(p);
      }
    },

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

    // ---- dock API ----
    apps() {
      return panels.map((p) => ({
        id: p.def.app.id,
        title: p.def.app.title,
        open: !state.get(p).closed,
      }));
    },

    toggleApp(id) {
      const p = panels.find((q) => q.def.app.id === id);
      if (!p) return;
      const st = state.get(p);
      if (st.closed) {
        setOpen(p, true);
        st.target = 1; // reopened screens land maximized, matching the room's default look
        sizeUp(p);
      } else {
        setOpen(p, false);
      }
    },

    onChange(fn) {
      changed = fn;
    },
  };
}
