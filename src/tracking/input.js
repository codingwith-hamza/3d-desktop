// Unified head-position input. Providers (mouse, face) push normalized
// targets: x/y in -1..1 (lateral head position) and z (lean-in depth,
// 0 = resting distance, positive = closer). The scene reads a smoothed value
// every display frame — the smoothing runs at render rate (120Hz on ProMotion
// panels), so motion stays fluid even though detection updates slower.
const Z_MIN = -0.8;
const Z_MAX = 1.3;

export function createInput() {
  let provider = null;
  const target = { x: 0, y: 0, z: 0 };
  const current = { x: 0, y: 0, z: 0 };

  return {
    setProvider(next) {
      provider?.stop?.();
      provider = next;
      provider.start((v) => {
        target.x = Math.max(-1, Math.min(1, v.x));
        target.y = Math.max(-1, Math.min(1, v.y));
        if (v.z !== undefined) target.z = Math.max(Z_MIN, Math.min(Z_MAX, v.z));
      });
    },

    // frame-rate-independent exponential smoothing — kills webcam jitter and
    // interpolates between detection samples at full display refresh
    update(dt) {
      const k = 1 - Math.exp(-dt * 6);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      current.z += (target.z - current.z) * k;
      return current;
    },
  };
}
