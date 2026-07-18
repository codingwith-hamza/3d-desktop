import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Phase 1: placeholder window bodies with real chrome so the 3D feel can be
// judged. Real app logic (explorer, terminal, etc.) lands in src/apps/ next.
const PLACEHOLDERS = {
  files: `
    <div class="files-grid">
      ${['Projects', 'Photos', 'Music', 'Ideas', 'Demos', 'Archive']
        .map(
          (n) => `<div class="file-item"><span class="icon">📁</span><span>${n}</span></div>`
        )
        .join('')}
    </div>`,
  notes: `
    <textarea class="notes-area" placeholder="Type something… it stays while you're here."></textarea>`,
  terminal: `
    <div><span class="prompt">guest@3d-desktop ~ %</span> whoami</div>
    <div>a person whose screen just became a window</div>
    <div><span class="prompt">guest@3d-desktop ~ %</span> <span class="cursor"></span></div>`,
  media: `
    <div class="media-art">
      <div class="viz">
        ${Array.from({ length: 9 }, (_, i) => `<span style="animation-delay:${(i * 0.12).toFixed(2)}s"></span>`).join('')}
      </div>
    </div>
    <div class="media-track">
      <div class="name">Parallax Dreams</div>
      <div class="artist">The Head Trackers</div>
    </div>
    <div class="media-seek"><div class="fill"></div></div>
    <div class="media-controls">
      <button>⏮</button><button>▶</button><button>⏭</button>
    </div>`,
};

const DEFS = [
  { id: 'files', title: 'Files', wall: 'left' },
  { id: 'media', title: 'Media Player', wall: 'right' },
  { id: 'notes', title: 'Notes', wall: 'back-left' },
  { id: 'terminal', title: 'Terminal', wall: 'back-right' },
];

function windowEl(def, w, h) {
  const el = document.createElement('div');
  el.className = 'panel';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.innerHTML = `
    <div class="panel-titlebar">
      <div class="traffic"><span class="r"></span><span class="y"></span><span class="g"></span></div>
      <div class="panel-title">${def.title}</div>
    </div>
    <div class="panel-body${def.id === 'terminal' ? ' term' : ''}">${PLACEHOLDERS[def.id]}</div>`;
  return el;
}

export function createPanels(cssScene, m) {
  const size = panelSize(m);
  return DEFS.map((def) => {
    const obj = new CSS3DObject(windowEl(def, size.w, size.h));
    cssScene.add(obj);
    return { def, obj };
  });
}

function panelSize(m) {
  const w = Math.round(Math.min(m.W * 0.42, 520));
  return { w, h: Math.round(w * 0.72) };
}

// place each window flush against its wall, tilted with the wall itself
export function layoutPanels(panels, m) {
  const { W, depth } = m;
  const size = panelSize(m);
  const inset = 4; // keep panels a hair off the wall to avoid z-fighting

  for (const { def, obj } of panels) {
    obj.element.style.width = `${size.w}px`;
    obj.element.style.height = `${size.h}px`;
    obj.rotation.set(0, 0, 0);

    switch (def.wall) {
      case 'left':
        obj.position.set(-W / 2 + inset, 0, -depth * 0.46);
        obj.rotation.y = Math.PI / 2;
        break;
      case 'right':
        obj.position.set(W / 2 - inset, 0, -depth * 0.46);
        obj.rotation.y = -Math.PI / 2;
        break;
      case 'back-left':
        obj.position.set(-W * 0.21, 0, -depth + inset);
        break;
      case 'back-right':
        obj.position.set(W * 0.21, 0, -depth + inset);
        break;
    }
  }
}
