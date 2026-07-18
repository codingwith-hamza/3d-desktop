import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { spotifyApp } from '../apps/spotify.js';
import { youtubeApp } from '../apps/youtube.js';
import { redditApp } from '../apps/reddit.js';
import { githubApp } from '../apps/github.js';
import { dashboardApp } from '../apps/dashboard.js';
import { browserApp } from '../apps/browser.js';
import { googleApp } from '../apps/google.js';

// one window per face; Google faces the viewer on the back wall. The right
// wall is shared by browser / system / github — the dock swaps between them.
const DEFS = [
  { app: googleApp, wall: 'back', w: 720, h: 500 },
  { app: spotifyApp, wall: 'left', w: 470, h: 580 },
  { app: browserApp, wall: 'right', w: 560, h: 500 },
  { app: dashboardApp, wall: 'right', w: 440, h: 520, closed: true },
  { app: githubApp, wall: 'right', w: 640, h: 470, closed: true },
  { app: youtubeApp, wall: 'top', w: 660, h: 410 },
  { app: redditApp, wall: 'bottom', w: 620, h: 420 },
];

// ceiling/floor windows hang at an angle toward the viewer so they stay
// readable instead of being seen edge-on
const TILT = 0.9;

function windowEl(def) {
  const el = document.createElement('div');
  el.className = 'panel';
  el.innerHTML = `
    <div class="panel-titlebar">
      <div class="traffic"><span class="r"></span><span class="y"></span><span class="g" title="maximize"></span></div>
      <div class="panel-title">${def.app.title}</div>
    </div>
    <div class="panel-body"></div>`;
  def.app.mount(el.querySelector('.panel-body'));
  return el;
}

export function createPanels(cssScene) {
  return DEFS.map((def) => {
    const obj = new CSS3DObject(windowEl(def));
    cssScene.add(obj);
    return { def, obj };
  });
}

export function layoutPanels(panels, m) {
  const { W, H, depth } = m;
  const inset = 6;

  for (const { def, obj } of panels) {
    // clamp to what the wall can actually hold on small screens
    const w = Math.round(Math.min(def.w, W * 0.6, depth * 0.62));
    const h = Math.round(Math.min(def.h, H * 0.74));
    obj.element.style.width = `${w}px`;
    obj.element.style.height = `${h}px`;
    obj.rotation.set(0, 0, 0);

    switch (def.wall) {
      case 'left':
        obj.position.set(-W / 2 + inset, 0, -depth * 0.5);
        obj.rotation.y = Math.PI / 2;
        break;
      case 'right':
        obj.position.set(W / 2 - inset, 0, -depth * 0.5);
        obj.rotation.y = -Math.PI / 2;
        break;
      case 'back':
        obj.position.set(0, 0, -depth + inset);
        break;
      case 'top': {
        // top edge kisses the ceiling, face angled down toward the viewer
        const cz = -depth * 0.55;
        obj.position.set(0, H / 2 - inset - (h / 2) * Math.cos(TILT), cz);
        obj.rotation.x = TILT;
        break;
      }
      case 'bottom': {
        const cz = -depth * 0.55;
        obj.position.set(0, -H / 2 + inset + (h / 2) * Math.cos(TILT), cz);
        obj.rotation.x = -TILT;
        break;
      }
    }
  }
}
