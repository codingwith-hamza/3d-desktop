// Unified head-position input. Providers (mouse, face) push normalized
// {x, y} targets in -1..1; the scene reads a smoothed value every frame.
// Swapping providers never touches scene code.
export function createInput() {
  let provider = null;
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };

  return {
    setProvider(next) {
      provider?.stop?.();
      provider = next;
      provider.start((v) => {
        target.x = Math.max(-1, Math.min(1, v.x));
        target.y = Math.max(-1, Math.min(1, v.y));
      });
    },

    // frame-rate-independent exponential smoothing — kills webcam jitter
    update(dt) {
      const k = 1 - Math.exp(-dt * 6);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      return current;
    },
  };
}
