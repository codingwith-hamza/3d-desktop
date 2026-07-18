import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

// Runs the MediaPipe landmarker off the main thread so detection cost never
// eats into the render loop's frame budget (8.3ms at 120Hz). Receives video
// frames as transferred ImageBitmaps, replies with the two numbers that
// matter: nose position and inter-eye span.

let landmarker = null;

// MediaPipe routes its harmless "INFO:" startup lines through console.error —
// drop just those so the demo console stays clean
const rawError = console.error.bind(console);
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].startsWith('INFO:')) return;
  rawError(...args);
};

// MediaPipe's WASM loader is a classic script that defines a global
// `ModuleFactory` — in a module worker importScripts() is unavailable, so
// load it ourselves into the global scope before createFromOptions runs
// (otherwise it dies with "ModuleFactory not set").
async function ensureModuleFactory(loaderPath) {
  if (typeof globalThis.ModuleFactory === 'function') return;
  const code = await (await fetch(loaderPath)).text();
  (0, eval)(code); // indirect eval → script scope → `var ModuleFactory` becomes global
  if (typeof globalThis.ModuleFactory !== 'function') {
    throw new Error('wasm loader did not define ModuleFactory');
  }
}

async function init(wasmBase, modelPath) {
  const fileset = await FilesetResolver.forVisionTasks(wasmBase);
  await ensureModuleFactory(fileset.wasmLoaderPath);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: modelPath, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    landmarker = await FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

self.onmessage = async (e) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      await init(msg.wasmBase, msg.modelPath);
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err?.message || err) });
    }
    return;
  }

  if (msg.type === 'frame') {
    let face = null;
    try {
      const result = landmarker.detectForVideo(msg.bitmap, msg.ts);
      const lm = result.faceLandmarks?.[0];
      if (lm) {
        face = {
          x: lm[1].x, // nose tip
          y: lm[1].y,
          eye: Math.hypot(lm[33].x - lm[263].x, lm[33].y - lm[263].y),
        };
      }
    } catch { /* dropped frame — main thread just keeps interpolating */ }
    msg.bitmap.close();
    self.postMessage({ type: 'result', face });
  }
};
