const PRESETS = [
  { label: 'lofi radio', id: 'jfKfPfyJRdk' },
  { label: 'nature 4K', id: 'LXb3EKWsInQ' },
  { label: 'big buck bunny', id: 'aqz-KE-bpKQ' },
];

function parseVideoId(text) {
  const m = text.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(text.trim()) ? text.trim() : null;
}

export const youtubeApp = {
  id: 'youtube',
  title: 'YouTube',

  mount(body) {
    body.classList.add('flush');
    body.innerHTML = `
      <div class="yt">
        <div class="yt-bar">
          <input type="text" placeholder="Paste a YouTube link and press Enter…" spellcheck="false" />
          ${PRESETS.map((p) => `<button class="yt-chip" data-id="${p.id}">${p.label}</button>`).join('')}
        </div>
        <div class="yt-frame"></div>
      </div>`;

    const frame = body.querySelector('.yt-frame');
    const input = body.querySelector('input');

    function load(id, autoplay = 1) {
      frame.innerHTML = `<iframe
        src="https://www.youtube.com/embed/${id}?rel=0&autoplay=${autoplay}&mute=${autoplay}"
        title="YouTube player" allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`;
    }

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const id = parseVideoId(input.value);
      if (id) {
        load(id);
        input.value = '';
        input.placeholder = 'Paste a YouTube link and press Enter…';
      } else {
        input.value = '';
        input.placeholder = "Couldn't read that link — try again";
      }
    });

    body.querySelectorAll('.yt-chip').forEach((chip) =>
      chip.addEventListener('click', () => load(chip.dataset.id))
    );

    // muted autoplay so the ceiling window is alive on entry without startling anyone
    load(PRESETS[0].id, 1);
  },
};
