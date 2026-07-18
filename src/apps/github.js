import { GITHUB_USER } from '../config.js';

const CACHE_KEY = 'gh_cache';
const CACHE_TTL = 10 * 60 * 1000;

const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#663399',
  Python: '#3572A5',
  Dart: '#00B4AB',
  Java: '#b07219',
  'C++': '#f34b7d',
};

async function fetchProfile() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    if (cached && cached.at > Date.now() - CACHE_TTL) return cached.data;
  } catch { /* re-fetch */ }

  const headers = { Accept: 'application/vnd.github+json' };
  const [userRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/users/${GITHUB_USER}`, { headers }),
    fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`, { headers }),
  ]);
  if (!userRes.ok || !repoRes.ok) throw new Error(`github api ${userRes.status}/${repoRes.status}`);

  const user = await userRes.json();
  const repos = (await repoRes.json())
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      desc: r.description,
      stars: r.stargazers_count,
      lang: r.language,
      url: r.html_url,
    }));

  const data = {
    name: user.name || user.login,
    login: user.login,
    avatar: user.avatar_url,
    bio: user.bio,
    followers: user.followers,
    publicRepos: user.public_repos,
    url: user.html_url,
    repos,
  };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  return data;
}

export const githubApp = {
  id: 'github',
  title: 'GitHub',

  mount(body) {
    body.classList.add('flush');
    body.innerHTML = `<div class="gh"><div class="gh-loading">contacting github…</div></div>`;
    const root = body.querySelector('.gh');

    fetchProfile()
      .then((p) => {
        root.innerHTML = `
          <a class="gh-head" href="${p.url}" target="_blank" rel="noopener">
            <img src="${p.avatar}" alt="" />
            <span class="gh-id">
              <span class="gh-name">${p.name}</span>
              <span class="gh-login">@${p.login}</span>
              ${p.bio ? `<span class="gh-bio">${p.bio}</span>` : ''}
            </span>
            <span class="gh-stats">
              <span><b>${p.publicRepos}</b> repos</span>
              <span><b>${p.followers}</b> followers</span>
            </span>
          </a>
          <div class="gh-repos">
            ${p.repos
              .map(
                (r) => `
              <a class="gh-repo" href="${r.url}" target="_blank" rel="noopener">
                <span class="gh-repo-name">${r.name}</span>
                ${r.desc ? `<span class="gh-repo-desc">${r.desc}</span>` : ''}
                <span class="gh-repo-meta">
                  ${r.lang ? `<i style="background:${LANG_COLORS[r.lang] || '#8a93a8'}"></i>${r.lang}` : ''}
                  <span>★ ${r.stars}</span>
                </span>
              </a>`
              )
              .join('')}
          </div>`;
      })
      .catch((err) => {
        console.warn('[github]', err);
        root.innerHTML = `<div class="gh-loading">GitHub is rate-limiting right now —
          <a href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener">open the profile directly</a></div>`;
      });
  },
};
