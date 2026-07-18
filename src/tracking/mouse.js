// Mouse-position provider — phase 1 driver and the permanent fallback when
// the camera is denied or head tracking fails.
export function mouseProvider() {
  let onMove = null;
  let onLeave = null;

  return {
    start(emit) {
      onMove = (e) => {
        emit({
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: -((e.clientY / window.innerHeight) * 2 - 1),
        });
      };
      onLeave = () => emit({ x: 0, y: 0 });
      window.addEventListener('pointermove', onMove);
      document.documentElement.addEventListener('pointerleave', onLeave);
    },
    stop() {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}
