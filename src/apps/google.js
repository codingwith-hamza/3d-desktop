import { GOOGLE_CSE_ID } from '../config.js';

// The front window. Looks like google.com; searches run live through Google's
// Programmable Search Engine when GOOGLE_CSE_ID is set (real Google results,
// rendered in-window — the only way to embed Google, since google.com itself
// refuses framing). Without an ID, search opens real Google in a new tab.

const LOGO = [
  ['G', '#4285F4'],
  ['o', '#EA4335'],
  ['o', '#FBBC05'],
  ['g', '#4285F4'],
  ['l', '#34A853'],
  ['e', '#EA4335'],
]
  .map(([c, col]) => `<span style="color:${col}">${c}</span>`)
  .join('');

let csePromise = null;
function loadCse(cx) {
  if (!csePromise) {
    csePromise = new Promise((resolve, reject) => {
      window.__gcse = { parsetags: 'explicit', callback: () => resolve(window.google) };
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(cx)}`;
      s.onerror = () => reject(new Error('Programmable Search failed to load'));
      document.head.appendChild(s);
    });
  }
  return csePromise;
}

export const googleApp = {
  id: 'google',
  title: 'Google',

  mount(body) {
    body.classList.add('flush');
    body.innerHTML = `
      <div class="gg">
        <div class="gg-home">
          <div class="gg-logo">${LOGO}</div>
          <form class="gg-form">
            <span class="gg-ico">🔍</span>
            <input type="text" class="gg-input" placeholder="Search Google or type a URL" spellcheck="false" autocomplete="off" />
          </form>
          <div class="gg-btns">
            <button type="button" class="gg-btn" data-go>Google Search</button>
            <button type="button" class="gg-btn" data-lucky>I'm Feeling Lucky</button>
          </div>
        </div>
        <div class="gg-results" hidden>
          <div class="gg-results-bar">
            <span class="gg-results-logo">${LOGO}</span>
            <input type="text" class="gg-input gg-input-sm" spellcheck="false" autocomplete="off" />
            <button type="button" class="gg-home-btn" title="Home">⌂</button>
          </div>
          <div class="gg-cse"></div>
        </div>
      </div>`;

    const home = body.querySelector('.gg-home');
    const results = body.querySelector('.gg-results');
    const cseDiv = body.querySelector('.gg-cse');
    const bigInput = body.querySelector('.gg-home .gg-input');
    const smallInput = body.querySelector('.gg-input-sm');
    let element = null;

    async function ensureElement() {
      const google = await loadCse(GOOGLE_CSE_ID);
      if (!element) {
        google.search.cse.element.render({ div: cseDiv, tag: 'searchresults-only', gname: 'roomsearch' });
        element = google.search.cse.element.getElement('roomsearch');
      }
      return element;
    }

    async function search(q) {
      const query = q.trim();
      if (!query) return;
      if (!GOOGLE_CSE_ID) {
        // no embeddable engine configured → real Google in a new tab
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
        return;
      }
      home.hidden = true;
      results.hidden = false;
      smallInput.value = query;
      try {
        (await ensureElement()).execute(query);
      } catch (err) {
        console.warn('[google]', err);
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
      }
    }

    function goHome() {
      results.hidden = true;
      home.hidden = false;
      bigInput.value = '';
      bigInput.focus();
    }

    body.querySelector('.gg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      search(bigInput.value);
    });
    body.querySelector('[data-go]').addEventListener('click', () => search(bigInput.value));
    body.querySelector('[data-lucky]').addEventListener('click', () => {
      const q = bigInput.value.trim();
      window.open(
        q
          ? `https://www.google.com/search?q=${encodeURIComponent(q)}&btnI=1`
          : 'https://www.google.com/doodles',
        '_blank',
        'noopener'
      );
    });
    smallInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') search(smallInput.value);
    });
    body.querySelector('.gg-home-btn').addEventListener('click', goHome);
  },
};
