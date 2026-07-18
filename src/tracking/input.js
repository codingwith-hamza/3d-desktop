// Unified head-position input. Multiple sources (head, mouse) run at once and
// their normalized outputs are SUMMED with per-source weights, so cursor and
// head movement compose seamlessly instead of replacing each other.
// x/y in -1..1 (lateral), z is lean-in depth (0 = resting distance).
// The scene reads a smoothed value every display frame — smoothing runs at
// render rate (120Hz on ProMotion), interpolating between detection samples.
const Z_MIN = -0.8;
const Z_MAX = 1.3;

export function createInput() {
  const sources = [];
  const current = { x: 0, y: 0, z: 0 };

  return {
    addSource(provider, weights = { xy: 1, z: 1 }) {
      const source = { target: { x: 0, y: 0, z: 0 }, weights, provider };
      provider.start((v) => {
        source.target.x = Math.max(-1, Math.min(1, v.x));
        source.target.y = Math.max(-1, Math.min(1, v.y));
        if (v.z !== undefined) source.target.z = Math.max(Z_MIN, Math.min(Z_MAX, v.z));
      });
      sources.push(source);
      return source; // caller may retune source.weights later
    },

    update(dt) {
      let tx = 0;
      let ty = 0;
      let tz = 0;
      for (const s of sources) {
        tx += s.target.x * s.weights.xy;
        ty += s.target.y * s.weights.xy;
        tz += s.target.z * s.weights.z;
      }
      tx = Math.max(-1, Math.min(1, tx));
      ty = Math.max(-1, Math.min(1, ty));
      tz = Math.max(Z_MIN, Math.min(Z_MAX, tz));

      // frame-rate-independent exponential smoothing; depth is damped harder
      // so lean-in flight feels weighty instead of pumping in and out
      const k = 1 - Math.exp(-dt * 6);
      const kz = 1 - Math.exp(-dt * 3.2);
      current.x += (tx - current.x) * k;
      current.y += (ty - current.y) * k;
      current.z += (tz - current.z) * kz;
      return current;
    },
  };
}
