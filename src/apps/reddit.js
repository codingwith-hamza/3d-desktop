// Reddit blocks anonymous API access from browsers (403 + no CORS since the
// 2023 API lockdown), so a live public feed isn't possible from a static
// site. We still try the live fetch first (in case policy loosens or a
// logged-in edge cache answers), then fall back to an honest, clearly-labeled
// snapshot of classic posts that link out to the real subreddits.
const SUBS = ['programmerhumor', 'webdev', 'oddlysatisfying'];

const SNAPSHOT = {
  programmerhumor: [
    { title: 'It works on my machine ¯\\_(ツ)_/¯', score: '98k', comments: '2.1k' },
    { title: 'Naming things is the hardest problem in CS. This is variable `data2_final_FINAL`', score: '76k', comments: '1.4k' },
    { title: 'CSS is easy, they said. Centering a div, hour 3', score: '64k', comments: '980' },
    { title: 'When the demo works but you don’t know why', score: '58k', comments: '1.1k' },
    { title: 'Junior: writes 400 lines. Senior: deletes 350 of them. Both fix the bug', score: '51k', comments: '760' },
  ],
  webdev: [
    { title: 'I rebuilt my portfolio for the 9th time instead of applying to jobs', score: '12k', comments: '840' },
    { title: 'Show r/webdev: a browser demo where your head controls the camera', score: '8.4k', comments: '312' },
    { title: 'Stop shipping 4MB of JavaScript for a landing page', score: '7.9k', comments: '655' },
    { title: 'localStorage is not a database. A cautionary tale', score: '6.2k', comments: '428' },
  ],
  oddlysatisfying: [
    { title: 'Perfectly aligned monitor bezels forming one continuous scene', score: '104k', comments: '890' },
    { title: 'This parallax effect that follows your head', score: '87k', comments: '1.2k' },
    { title: 'Cable management so clean it looks rendered', score: '73k', comments: '540' },
    { title: 'A window snapping into place at exactly 60fps', score: '66k', comments: '410' },
  ],
};

function row(p, sub) {
  const url = p.permalink ? `https://www.reddit.com${p.permalink}` : `https://www.reddit.com/r/${sub}/`;
  return `
    <a class="rd-post" href="${url}" target="_blank" rel="noopener">
      <span class="rd-score">▲ ${p.score}</span>
      <span class="rd-body">
        <span class="rd-title">${p.title}</span>
        <span class="rd-meta">r/${sub} · ${p.comments} comments</span>
      </span>
    </a>`;
}

async function fetchLive(sub) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=12&raw_json=1`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data.children
      .map((c) => c.data)
      .filter((p) => !p.stickied)
      .slice(0, 8)
      .map((p) => ({
        title: p.title,
        score: p.score >= 1000 ? `${(p.score / 1000).toFixed(1)}k` : String(p.score),
        comments: String(p.num_comments),
        permalink: p.permalink,
      }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const redditApp = {
  id: 'reddit',
  title: 'Reddit',

  mount(body) {
    body.classList.add('flush');
    body.innerHTML = `
      <div class="rd">
        <div class="rd-tabs">
          ${SUBS.map((s, i) => `<button class="rd-tab${i === 0 ? ' on' : ''}" data-sub="${s}">r/${s}</button>`).join('')}
        </div>
        <div class="rd-list"></div>
        <div class="rd-note" hidden>snapshot — Reddit blocks live public feeds · tap a post to open the real thing</div>
      </div>`;

    const list = body.querySelector('.rd-list');
    const noteEl = body.querySelector('.rd-note');

    async function show(sub) {
      list.innerHTML = `<div class="rd-loading">loading r/${sub}…</div>`;
      const live = await fetchLive(sub);
      const posts = live || SNAPSHOT[sub];
      noteEl.hidden = !!live;
      list.innerHTML = posts.map((p) => row(p, sub)).join('');
    }

    body.querySelectorAll('.rd-tab').forEach((tab) =>
      tab.addEventListener('click', () => {
        body.querySelectorAll('.rd-tab').forEach((t) => t.classList.toggle('on', t === tab));
        show(tab.dataset.sub);
      })
    );

    show(SUBS[0]);
  },
};
