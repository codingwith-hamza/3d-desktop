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
    // the scene starts instantly on mouse parallax; head tracking joins in
    // as a second blended source once the camera + model are ready
    const mouseSource = input.addSource(mouseProvider(), { xy: 1, z: 1 });
    stats.trackingMode = 'mouse';
    scene.start();
    enableHeadTracking(input, mouseSource);
  });
}

async function enableHeadTracking(input, mouseSource) {
  try {
    // lazy-loaded so MediaPipe's WASM never blocks first paint
    const { createFaceProvider } = await import('./tracking/face.js');
    const provider = await createFaceProvider();
    // head becomes the main driver; the cursor keeps adding a gentle nudge
    // (and the scroll wheel keeps full zoom authority) so both compose
    input.addSource(provider, { xy: 1, z: 1 });
    mouseSource.weights = { xy: 0.25, z: 1 };
    stats.trackingMode = 'head + mouse';
    showHint('Move your head to look around · press R to recenter');

    window.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if (!typing && (e.key === 'r' || e.key === 'R')) {
        provider.recenter();
        showToast('Recentered — hold still a second');
      }
    });
  } catch (err) {
    console.warn('[tracking] using mouse parallax:', err?.message || err);
    stats.trackingMode = 'mouse';
    showToast('Camera off — mouse controls the view');
    showHint('Move your mouse to look around');
  }
}
