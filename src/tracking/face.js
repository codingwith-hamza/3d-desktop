import { stats } from '../ui/stats.js';

const SENS = 6; // lateral: head moves a small fraction of the camera frame
const Z_SENS = 2.2; // lean-in: inter-eye span ratio → depth (kept gentle)
const BASELINE_FRAMES = 12;

// Detection cadence, decoupled from rendering: the landmarker (in its worker)
// samples ~30Hz while the render loop interpolates at full display refresh.
function detectInterval() {
  if (stats.fps && stats.fps < 30) return 66;
  if (stats.fps && stats.fps < 45) return 50;
  return 33;
}

// Webcam head-tracking provider. All processing is local: frames go from the
// camera into a Web Worker running the WASM landmarker — off the main thread,
// so 120Hz rendering never pays the detection cost. Nothing is recorded or
// uploaded. Throws if the camera is denied or MediaPipe fails to load — the
// caller keeps the mouse provider in that case.
export async function createFaceProvider() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });

  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  const worker = new Worker(new URL('./faceWorker.js', import.meta.url), { type: 'module' });
  const baseHref = new URL(import.meta.env.BASE_URL, window.location.href).href;

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('face worker init timeout')), 20000);
      worker.onerror = (e) => {
        clearTimeout(timer);
        reject(new Error(e.message || 'face worker failed'));
      };
      worker.onmessage = (e) => {
        clearTimeout(timer);
        if (e.data.type === 'ready') resolve();
        else if (e.data.type === 'error') reject(new Error(e.data.message));
      };
      worker.postMessage({
        type: 'init',
        wasmBase: `${baseHref}wasm`,
        modelPath: `${baseHref}models/face_landmarker.task`,
      });
    });
  } catch (err) {
    worker.terminate();
    stream.getTracks().forEach((t) => t.stop());
    throw err;
  }

  let emit = null;
  let stopped = false;
  let inflight = false;
  let lastSent = 0;
  let missed = 0;
  let baseline = null;
  const acc = { x: 0, y: 0, eye: 0, n: 0 };

  worker.onmessage = (e) => {
    if (e.data.type !== 'result') return;
    inflight = false;
    const f = e.data.face;
    if (!f) {
      // face lost for a while → drift back to center instead of sticking
      if (++missed > 20) emit?.({ x: 0, y: 0, z: 0 });
      return;
    }
    missed = 0;

    // calibrate to wherever the face naturally sits on entry, so the resting
    // pose means a centered, unzoomed view
    if (!baseline) {
      acc.x += f.x;
      acc.y += f.y;
      acc.eye += f.eye;
      if (++acc.n >= BASELINE_FRAMES) {
        baseline = { x: acc.x / acc.n, y: acc.y / acc.n, eye: acc.eye / acc.n };
      }
      return;
    }

    // camera image is unmirrored: moving right/up decreases nose x/y;
    // leaning closer grows the eye span
    emit?.({
      x: (baseline.x - f.x) * SENS,
      y: (baseline.y - f.y) * SENS,
      z: (f.eye / baseline.eye - 1) * Z_SENS,
    });
  };

  async function pump(now) {
    if (stopped) return;
    requestAnimationFrame(pump);
    if (inflight || now - lastSent < detectInterval() || video.readyState < 2) return;
    lastSent = now;
    inflight = true;
    try {
      const bitmap = await createImageBitmap(video);
      if (stopped) {
        bitmap.close();
        return;
      }
      worker.postMessage({ type: 'frame', bitmap, ts: now }, [bitmap]);
    } catch {
      inflight = false; // camera hiccup — try again next tick
    }
  }

  return {
    start(cb) {
      emit = cb;
      requestAnimationFrame(pump);
    },
    // re-learn the resting pose (user shifted in their chair)
    recenter() {
      baseline = null;
      acc.x = 0;
      acc.y = 0;
      acc.eye = 0;
      acc.n = 0;
    },
    stop() {
      stopped = true;
      worker.terminate();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
