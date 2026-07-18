import { SPOTIFY_CLIENT_ID } from '../config.js';

const SCOPES =
  'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private';
const FALLBACK_EMBED = 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?theme=0';
const TOKEN_KEY = 'sp_token';

// ---- PKCE helpers (all in-browser, no backend) ----

function randomString(len = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]).join('');
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function redirectUri() {
  return window.location.origin + window.location.pathname;
}

function savedToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    return t && t.expires > Date.now() ? t.value : null;
  } catch {
    return null;
  }
}

async function exchangeCode(code, verifier) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`);
  const data = await res.json();
  sessionStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({ value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 })
  );
  return data.access_token;
}

async function api(token, path, opts = {}) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`spotify api ${path} → ${res.status}`);
  return res.json();
}

// ---- Web Playback SDK (Premium accounts) ----

let sdkPromise = null;
function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify);
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

// ---- the window ----

export const spotifyApp = {
  id: 'spotify',
  title: 'Spotify',

  mount(body) {
    body.classList.add('flush');
    body.innerHTML = `
      <div class="sp">
        <div class="sp-top" hidden>
          <span class="sp-user"></span>
          <button class="sp-login">Log in with Spotify</button>
        </div>
        <div class="sp-content"></div>
        <div class="sp-now" hidden>
          <div class="sp-track"><span class="name"></span><span class="artist"></span></div>
          <div class="sp-ctrl">
            <button data-act="prev">⏮</button>
            <button data-act="toggle">⏯</button>
            <button data-act="next">⏭</button>
          </div>
        </div>
      </div>`;

    const els = {
      top: body.querySelector('.sp-top'),
      user: body.querySelector('.sp-user'),
      login: body.querySelector('.sp-login'),
      content: body.querySelector('.sp-content'),
      now: body.querySelector('.sp-now'),
    };

    let player = null;
    let deviceId = null;
    let token = null;

    function showEmbed(url = FALLBACK_EMBED) {
      els.content.innerHTML = `<iframe src="${url}" loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
    }

    function note(text) {
      els.content.insertAdjacentHTML('afterbegin', `<div class="sp-note">${text}</div>`);
    }

    async function login() {
      const verifier = randomString();
      const state = randomString(16);
      const url = new URL('https://accounts.spotify.com/authorize');
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: SCOPES,
        redirect_uri: redirectUri(),
        code_challenge_method: 'S256',
        code_challenge: await challengeFor(verifier),
        state,
      });
      const popup = window.open(url, 'spotify-auth', 'width=500,height=750');
      if (!popup) return note('Popup blocked — allow popups and try again.');

      const onMsg = async (e) => {
        if (e.origin !== window.location.origin || e.data?.type !== 'spotify-code') return;
        window.removeEventListener('message', onMsg);
        if (e.data.error || e.data.state !== state) return note('Login was cancelled.');
        try {
          token = await exchangeCode(e.data.code, verifier);
          await boot();
        } catch (err) {
          console.warn('[spotify]', err);
          note('Login failed — try again.');
        }
      };
      window.addEventListener('message', onMsg);
    }

    async function showPlaylists(me) {
      const lists = await api(token, '/me/playlists?limit=24');
      const premium = me.product === 'premium';
      els.user.textContent = me.display_name || me.id;
      els.login.hidden = true;

      els.content.innerHTML = `
        <div class="sp-lists">
          ${lists.items
            .filter(Boolean)
            .map(
              (p) => `
            <button class="sp-list" data-uri="${p.uri}" data-id="${p.id}">
              <img src="${p.images?.[0]?.url || ''}" alt="" onerror="this.style.visibility='hidden'" />
              <span class="t">${p.name}</span>
              <span class="c">${p.tracks?.total ?? 0} tracks</span>
            </button>`
            )
            .join('')}
        </div>`;
      if (!premium) note('Free account — playlists open in the preview player.');

      els.content.addEventListener('click', async (e) => {
        const btn = e.target.closest('.sp-list');
        if (!btn) return;
        if (premium && deviceId) {
          try {
            await api(token, `/me/player/play?device_id=${deviceId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context_uri: btn.dataset.uri }),
            });
          } catch (err) {
            console.warn('[spotify] play failed', err);
          }
        } else {
          showEmbed(`https://open.spotify.com/embed/playlist/${btn.dataset.id}?theme=0`);
        }
      });

      if (premium) startPlayer();
    }

    async function startPlayer() {
      const Spotify = await loadSdk();
      player = new Spotify.Player({
        name: '3D Desktop',
        getOAuthToken: (cb) => cb(token),
        volume: 0.7,
      });
      player.addListener('ready', ({ device_id }) => (deviceId = device_id));
      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        const t = state.track_window.current_track;
        els.now.hidden = false;
        els.now.querySelector('.name').textContent = t.name;
        els.now.querySelector('.artist').textContent = t.artists.map((a) => a.name).join(', ');
        els.now.querySelector('[data-act="toggle"]').textContent = state.paused ? '▶' : '⏸';
      });
      ['initialization_error', 'authentication_error', 'account_error'].forEach((ev) =>
        player.addListener(ev, ({ message }) => console.warn('[spotify sdk]', ev, message))
      );
      player.connect();

      els.now.addEventListener('click', (e) => {
        const act = e.target.closest('button')?.dataset.act;
        if (!act || !player) return;
        if (act === 'toggle') player.togglePlay();
        if (act === 'next') player.nextTrack();
        if (act === 'prev') player.previousTrack();
      });
    }

    async function boot() {
      try {
        const me = await api(token, '/me');
        await showPlaylists(me);
      } catch (err) {
        console.warn('[spotify]', err);
        sessionStorage.removeItem(TOKEN_KEY);
        showEmbed();
      }
    }

    // ---- initial state ----
    if (!SPOTIFY_CLIENT_ID) {
      showEmbed();
      return;
    }
    els.top.hidden = false;
    els.login.addEventListener('click', login);
    token = savedToken();
    if (token) boot();
    else showEmbed();
  },
};
