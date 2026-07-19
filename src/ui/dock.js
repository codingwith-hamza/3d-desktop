const ICONS = {
  google: '🔎',
  spotify: '🎵',
  browser: '🌐',
  dashboard: '📊',
  github: '🐙',
  youtube: '▶️',
  reddit: '🔴',
};

// Bottom-center dock: one button per app. Click to open a closed screen
// (it takes over its wall) or close an open one — the lit dot shows state.
export function createDock(windowing) {
  const dock = document.createElement('div');
  dock.id = 'dock';
  document.body.appendChild(dock);

  function render() {
    const max = windowing.anyMaximized();
    dock.innerHTML =
      windowing
        .apps()
        .map(
          (a) => `
        <button class="dock-btn${a.open ? ' on' : ''}" data-id="${a.id}" title="${a.title}">
          <span>${ICONS[a.id] ?? '🪟'}</span><i></i>
        </button>`
        )
        .join('') +
      `<span class="dock-sep"></span>
       <button class="dock-btn dock-all" data-all title="${max ? 'Minimize all' : 'Maximize all'}">
         <span>${max ? '🗕' : '🗖'}</span><i></i>
       </button>`;
  }

  dock.addEventListener('click', (e) => {
    const btn = e.target.closest('.dock-btn');
    if (!btn) return;
    if (btn.dataset.all !== undefined) {
      windowing.anyMaximized() ? windowing.minimizeAll() : windowing.maximizeAll();
      render();
    } else {
      windowing.toggleApp(btn.dataset.id);
    }
  });

  windowing.onChange(render);
  render();
}
