import { createScene } from './scene/scene.js';
import { createInput } from './tracking/input.js';
import { mouseProvider } from './tracking/mouse.js';
import { initLanding } from './ui/landing.js';
import { showHint } from './ui/hud.js';

// Phase 1: mouse-driven parallax. Phase 2 swaps in the MediaPipe face
// provider behind the same input abstraction.
initLanding(() => {
  const input = createInput();
  const scene = createScene(document.getElementById('app'), input);
  input.setProvider(mouseProvider());
  scene.start();
  showHint('Move your mouse to look around');
});
