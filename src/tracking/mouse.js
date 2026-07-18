// Mouse-position provider — the permanent fallback when the camera is denied
// or head tracking fails. Scroll wheel stands in for lean-in zoom.
export function mouseProvider() {
  const state = { x: 0, y: 0, z: 0 };
  let onMove = null;
  let onLeave = null;
  let onWheel = null;

  return {
    start(emit) {
      onMove = (e) => {
        state.x = (e.clientX / window.innerWidth) * 2 - 1;
        state.y = -((e.clientY / window.innerHeight) * 2 - 1);
        emit(state);
      };
      onWheel = (e) => {
        state.z = Math.max(-0.8, Math.min(1.3, state.z - e.deltaY * 0.0016));
        emit(state);
      };
      onLeave = () => {
        state.x = 0;
        state.y = 0;
        emit(state);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('wheel', onWheel, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    },
    stop() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('wheel', onWheel);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}
