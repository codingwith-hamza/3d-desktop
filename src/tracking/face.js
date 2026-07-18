import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { stats } from '../ui/stats.js';

const SENS = 6; // lateral: head moves a small fraction of the camera frame
const Z_SENS = 4; // lean-in: inter-eye distance ratio → depth
const BASELINE_FRAMES = 12;

// Detection runs on its own clock, decoupled from rendering: the render loop
// interpolates at full display refresh (120Hz on ProMotion) while the
// landmarker only pays its cost ~30 times a second — slower on weak devices.
function detectInterval() {
  if (stats.fps && stats.fps < 30) return 66;
  if (stats.fps && stats.fps < 45) return 50;
  return 33;
}

// Webcam head-tracking provider. All processing is local: frames go from the
// camera straight into the WASM landmarker, nothing is recorded or uploaded.
// Throws if the camera is denied or MediaPipe fails to load — the caller
// keeps the mouse provider in that case.
export async function createFaceProvider() {
  const base = import.meta.env.BASE_URL;

  // request the camera and load the model in parallel — the permission
  // prompt appears immediately while WASM downloads
  const [stream, landmarker] = await Promise.all([
    navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    }),
    (async () => {
      const fileset = await FilesetResolver.forVisionTasks(`${base}wasm`);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    })(),
  ]);

  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  let emit = null;
  let stopped = false;
  let lastDetect = 0;
  let missed = 0;
  let baseline = null;
  const acc = { x: 0, y: 0, eye: 0, n: 0 };

  // distance between the outer eye corners — scale-invariant proxy for how
  // close the head is to the screen (measured against the user's own baseline)
  function eyeSpan(lm) {
    return Math.hypot(lm[33].x - lm[263].x, lm[33].y - lm[263].y);
  }

  function loop(now) {
    if (stopped) return;
    requestAnimationFrame(loop);
    if (now - lastDetect < detectInterval() || video.readyState < 2) return;
    lastDetect = now;

    const result = landmarker.detectForVideo(video, now);
    const lm = result.faceLandmarks?.[0];
    if (!lm) {
      // face lost for a while → drift back to center instead of sticking
      if (++missed > 20) emit?.({ x: 0, y: 0, z: 0 });
      return;
    }
    missed = 0;
    const nose = lm[1]; // nose tip

    // calibrate to wherever the face naturally sits on entry, so the resting
    // pose means a centered, unzoomed view
    if (!baseline) {
      acc.x += nose.x;
      acc.y += nose.y;
      acc.eye += eyeSpan(lm);
      if (++acc.n >= BASELINE_FRAMES) {
        baseline = { x: acc.x / acc.n, y: acc.y / acc.n, eye: acc.eye / acc.n };
      }
      return;
    }

    // camera image is unmirrored: moving right/up decreases nose.x/nose.y;
    // leaning closer grows the eye span
    emit?.({
      x: (baseline.x - nose.x) * SENS,
      y: (baseline.y - nose.y) * SENS,
      z: (eyeSpan(lm) / baseline.eye - 1) * Z_SENS,
    });
  }

  return {
    start(cb) {
      emit = cb;
      requestAnimationFrame(loop);
    },
    stop() {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
      landmarker.close();
    },
  };
}
