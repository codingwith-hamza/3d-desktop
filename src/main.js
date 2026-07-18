import { createScene } from './scene/scene.js';
import { createInput } from './tracking/input.js';
import { mouseProvider } from './tracking/mouse.js';
import { initLanding } from './ui/landing.js';
import { showHint } from './ui/hud.js';

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
  // Phase 1: mouse-driven parallax. Phase 2 swaps in the MediaPipe face
  // provider behind the same input abstraction.
  initLanding(() => {
    const input = createInput();
    const scene = createScene(document.getElementById('app'), input);
    input.setProvider(mouseProvider());
    scene.start();
    showHint('Move your mouse to look around');
  });
}
