// A real browser window: our chrome, live pages inside. Search queries load
// Bing results in the iframe (Bing allows framing — verified); URLs load
// directly. Sites that refuse framing (Google, Facebook, …) can always be
// popped out with the ↗ button.
const QUICK = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Random' },
  {
    label: 'World map',
    url: 'https://www.openstreetmap.org/export/embed.html?bbox=-25.3,31.9,45.6,61.1&layer=mapnik',
  },
  { label: 'Search the web', url: 'https://www.bing.com/search?q=head+tracking+parallax' },
];

function toUrl(text) {
  const t = text.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`;
  return `https://www.bing.com/search?q=${encodeURIComponent(t)}`;
}

export const browserApp = {
  id: 'browser',
  title: 'Browser',

  mount(body) {
    body.classList.add('flush');
    body.innerHTML = `
      <div class="bw">
        <div class="bw-bar">
          <button class="bw-home" title="Start page">⌂</button>
          <input type="text" placeholder="Search or enter a URL…" spellcheck="false" />
          <button class="bw-ext" title="Open current page in a new tab">↗</button>
        </div>
        <div class="bw-view"></div>
      </div>`;

    const view = body.querySelector('.bw-view');
    const input = body.querySelector('input');
    let current = null;

    function startPage() {
      current = null;
      input.value = '';
      view.innerHTML = `
        <div class="bw-start">
          <div class="bw-mark">the web,<br/>on your wall</div>
          <input type="text" class="bw-start-input" placeholder="Search or enter a URL…" spellcheck="false" />
          <div class="bw-chips">
            ${QUICK.map((q) => `<button class="bw-chip" data-url="${q.url}">${q.label}</button>`).join('')}
          </div>
          <p class="bw-note">Some sites refuse to load inside other pages — use ↗ to open them in a tab.</p>
        </div>`;
      view.querySelector('.bw-start-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') go(e.target.value);
      });
      view.querySelectorAll('.bw-chip').forEach((c) =>
        c.addEventListener('click', () => load(c.dataset.url))
      );
    }

    function load(url) {
      current = url;
      input.value = url;
      view.innerHTML = `<iframe src="${url}" referrerpolicy="no-referrer"
        allow="fullscreen; picture-in-picture" title="Browser page"></iframe>`;
    }

    function go(text) {
      const url = toUrl(text);
      if (url) load(url);
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go(input.value);
    });
    body.querySelector('.bw-home').addEventListener('click', startPage);
    body.querySelector('.bw-ext').addEventListener('click', () => {
      window.open(current || 'https://www.google.com', '_blank', 'noopener');
    });

    startPage();
  },
};
