import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { stats } from '../ui/stats.js';

const SENS = 3.5; // head moves a small fraction of the camera frame — amplify
const BASELINE_FRAMES = 12;

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
  let frame = 0;
  let missed = 0;
  let baseline = null;
  const baselineAcc = { x: 0, y: 0, n: 0 };

  function loop() {
    if (stopped) return;
    requestAnimationFrame(loop);
    frame += 1;

    // FPS guard: detection is the expensive part — on slow devices run it
    // every 2nd/3rd frame and let input smoothing hide the lower rate
    const skip = stats.fps && stats.fps < 30 ? 3 : stats.fps && stats.fps < 45 ? 2 : 1;
    if (frame % skip !== 0 || video.readyState < 2) return;

    const result = landmarker.detectForVideo(video, performance.now());
    const lm = result.faceLandmarks?.[0];
    if (!lm) {
      // face lost for a while → drift back to center instead of sticking
      if (++missed > 45) emit?.({ x: 0, y: 0 });
      return;
    }
    missed = 0;
    const nose = lm[1]; // nose tip

    // calibrate to wherever the face naturally sits in frame on entry,
    // so "rest position" means a centered camera
    if (!baseline) {
      baselineAcc.x += nose.x;
      baselineAcc.y += nose.y;
      if (++baselineAcc.n >= BASELINE_FRAMES) {
        baseline = { x: baselineAcc.x / baselineAcc.n, y: baselineAcc.y / baselineAcc.n };
      }
      return;
    }

    // camera image is unmirrored: moving right/up decreases nose.x/nose.y
    emit?.({
      x: (baseline.x - nose.x) * SENS,
      y: (baseline.y - nose.y) * SENS,
    });
  }

  return {
    start(cb) {
      emit = cb;
      loop();
    },
    stop() {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
      landmarker.close();
    },
  };
}
