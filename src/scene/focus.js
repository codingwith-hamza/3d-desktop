import * as THREE from 'three';

const _IDENT = new THREE.Quaternion();
const _MAXPOS = new THREE.Vector3(0, 0, 0); // screen plane — fills the viewport exactly

// Maximize/restore: the green traffic light (or double-clicking the titlebar)
// flies a window off its wall to the screen plane, where — thanks to the
// pinned projection — width m.W × height m.H at z = 0 is exactly fullscreen.
// Esc or clicking the green light again sends it back. Others dim meanwhile.
export function createFocus(panels, m) {
  let active = null;
  const state = new Map();

  snapshotHomes();

  for (const p of panels) {
    const el = p.obj.element;
    el.querySelector('.traffic .g').addEventListener('click', () => toggle(p));
    el.querySelector('.panel-titlebar').addEventListener('dblclick', () => toggle(p));
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) toggle(active);
  });

  function snapshotHomes() {
    for (const p of panels) {
      const prev = state.get(p);
      state.set(p, {
        homePos: p.obj.position.clone(),
        homeQuat: p.obj.quaternion.clone(),
        baseW: parseFloat(p.obj.element.style.width),
        baseH: parseFloat(p.obj.element.style.height),
        cur: prev?.cur ?? 0,
        target: prev?.target ?? 0,
        sized: prev?.sized ?? false,
      });
    }
  }

  // swap the element to fullscreen dimensions while compensating with scale,
  // so text re-rasterizes crisp at full size instead of stretching
  function sizeUp(p) {
    const st = state.get(p);
    if (st.sized) return;
    st.baseW = parseFloat(p.obj.element.style.width);
    st.baseH = parseFloat(p.obj.element.style.height);
    p.obj.element.style.width = `${m.W}px`;
    p.obj.element.style.height = `${m.H}px`;
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

  function refreshDimming() {
    for (const p of panels) {
      p.obj.element.classList.toggle('dimmed', active !== null && p !== active);
    }
  }

  function toggle(p) {
    const st = state.get(p);
    if (active === p) {
      active = null;
      st.target = 0;
    } else {
      if (active) state.get(active).target = 0;
      active = p;
      st.target = 1;
      sizeUp(p);
    }
    refreshDimming();
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
        p.obj.position.lerpVectors(st.homePos, _MAXPOS, st.cur);
        p.obj.quaternion.slerpQuaternions(st.homeQuat, _IDENT, st.cur);
        p.obj.scale.set(
          THREE.MathUtils.lerp(st.baseW / m.W, 1, st.cur),
          THREE.MathUtils.lerp(st.baseH / m.H, 1, st.cur),
          1
        );
      }
    },

    // call after layoutPanels() on resize: re-capture wall slots and keep an
    // active window sized to the new viewport
    onResize() {
      snapshotHomes();
      if (active) {
        const st = state.get(active);
        st.sized = false;
        sizeUp(active);
      }
    },
  };
}
