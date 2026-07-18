import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { computeMetrics, updateCamera } from './projection.js';
import { buildRoom } from './room.js';
import { createPanels, layoutPanels } from './panels.js';
import { createFocus } from './focus.js';
import { stats } from '../ui/stats.js';
import { createDock } from '../ui/dock.js';

export function createScene(container, input) {
  const m = computeMetrics();

  const glScene = new THREE.Scene();
  glScene.background = new THREE.Color(0x0b0a10);
  const cssScene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, m.W / m.H, 10, m.dist + m.depth * 3);

  const gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gl.setSize(m.W, m.H);
  gl.domElement.className = 'gl-layer';
  container.appendChild(gl.domElement);

  const css = new CSS3DRenderer();
  css.setSize(m.W, m.H);
  css.domElement.className = 'css-layer';
  container.appendChild(css.domElement);

  let room = buildRoom(glScene, m);
  const panels = createPanels(cssScene, m);
  layoutPanels(panels, m);
  const focus = createFocus(panels, m);
  focus.maximizeAll(); // default look: every wall fully covered by its app
  createDock(focus);

  window.addEventListener('resize', () => {
    computeMetrics(m);
    camera.aspect = m.W / m.H;
    camera.far = m.dist + m.depth * 3;
    camera.updateProjectionMatrix();
    gl.setSize(m.W, m.H);
    css.setSize(m.W, m.H);
    room.dispose();
    room = buildRoom(glScene, m);
    layoutPanels(panels, m);
    focus.onResize();
  });

  let last = 0;
  let running = false;
  let introT = 0; // short dolly-in when entering the room
  let fpsFrames = 0;
  let fpsTime = 0;

  function frame(now = performance.now()) {
    if (!running) return;
    requestAnimationFrame(frame);

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    fpsFrames += 1;
    fpsTime += dt;
    if (fpsTime >= 0.5) {
      stats.fps = fpsFrames / fpsTime;
      fpsFrames = 0;
      fpsTime = 0;
    }
    introT = Math.min(introT + dt / 1.4, 1);
    const ease = 1 - Math.pow(1 - introT, 3);
    const introOffset = m.dist * 0.4 * (1 - ease);

    const head = input.update(dt);
    updateCamera(camera, head, m, introOffset);
    room.update(dt);
    focus.update(dt);

    gl.render(glScene, camera);
    css.render(cssScene, camera);
  }

  return {
    start() {
      running = true;
      last = performance.now();
      frame();
    },
  };
}
