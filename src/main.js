import { createScene } from './scene/scene.js';
import { createInput } from './tracking/input.js';
import { mouseProvider } from './tracking/mouse.js';
import { initLanding } from './ui/landing.js';
import { showHint, showToast } from './ui/hud.js';
import { stats } from './ui/stats.js';

// Spotify OAuth popup lands back here with ?code= — hand it to the opener
// window and close, instead of booting the whole app inside the popup.
const params = new URLSearchParams(window.location.search);
if (window.opener && (params.has('code') || params.has('error'))) {
  window.opener.postMessage(
    {
      type: 'spotify-code',
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error'),
    },
    window.location.origin
  );
  document.body.textContent = 'Logging in…';
  window.close();
} else {
  initLanding(() => {
    const input = createInput();
    const scene = createScene(document.getElementById('app'), input);
    // the scene starts instantly on mouse parallax; head tracking swaps in
    // behind the same input abstraction once the camera + model are ready
    input.setProvider(mouseProvider());
    stats.trackingMode = 'mouse';
    scene.start();
    enableHeadTracking(input);
  });
}

async function enableHeadTracking(input) {
  try {
    // lazy-loaded so MediaPipe's WASM never blocks first paint
    const { createFaceProvider } = await import('./tracking/face.js');
    const provider = await createFaceProvider();
    input.setProvider(provider);
    stats.trackingMode = 'head';
    showHint('Move your head to look around');
  } catch (err) {
    console.warn('[tracking] using mouse parallax:', err?.message || err);
    stats.trackingMode = 'mouse';
    showToast('Camera off — mouse controls the view');
    showHint('Move your mouse to look around');
  }
}
