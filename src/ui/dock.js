const ICONS = {
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
    dock.innerHTML = windowing
      .apps()
      .map(
        (a) => `
        <button class="dock-btn${a.open ? ' on' : ''}" data-id="${a.id}" title="${a.title}">
          <span>${ICONS[a.id] ?? '🪟'}</span><i></i>
        </button>`
      )
      .join('');
  }

  dock.addEventListener('click', (e) => {
    const btn = e.target.closest('.dock-btn');
    if (btn) windowing.toggleApp(btn.dataset.id);
  });

  windowing.onChange(render);
  render();
}
