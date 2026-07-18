// ---- owner configuration ----

// Spotify "Log in" support: register a free app at
// https://developer.spotify.com/dashboard → create app → add BOTH of these
// Redirect URIs: http://localhost:5173/  and your production URL (with
// trailing slash), then paste the Client ID here. Leave empty and the
// Spotify window falls back to the official embed player (still works).
export const SPOTIFY_CLIENT_ID = '';

// GitHub profile shown in the GitHub window (public API, no key needed)
export const GITHUB_USER = 'codingwith-hamza';

// Live Google results inside the front Google window. Real google.com can't be
// iframed (X-Frame-Options), so we use Google's own Programmable Search Engine,
// which IS embeddable and returns real Google results — no backend needed.
// Setup (~2 min): https://programmablesearchengine.google.com/ → Add → "Search
// the entire web" → create → copy the Search engine ID (looks like a1b2c3...)
// and paste it below. Empty = the search box opens real Google in a new tab.
export const GOOGLE_CSE_ID = '';
