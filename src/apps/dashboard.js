import { stats } from '../ui/stats.js';

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export const dashboardApp = {
  id: 'dashboard',
  title: 'System',

  mount(body) {
    body.innerHTML = `
      <div class="dash">
        <div class="dash-clock">
          <span class="dash-time">00:00:00</span>
          <span class="dash-date"></span>
        </div>
        <div class="dash-rows">
          <div class="dash-row"><span>session</span><b data-k="uptime">00:00</b></div>
          <div class="dash-row"><span>fps</span><b data-k="fps">—</b></div>
          <div class="dash-row"><span>display</span><b data-k="res"></b></div>
          <div class="dash-row"><span>pixel ratio</span><b data-k="dpr"></b></div>
          <div class="dash-row"><span>tracking</span><b data-k="mode">mouse</b></div>
        </div>
        <div class="dash-fpsbar"><i></i></div>
      </div>`;

    const time = body.querySelector('.dash-time');
    const date = body.querySelector('.dash-date');
    const val = (k) => body.querySelector(`[data-k="${k}"]`);
    const fpsFill = body.querySelector('.dash-fpsbar i');

    function tick() {
      const now = new Date();
      time.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      date.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      val('uptime').textContent = fmtUptime(Date.now() - stats.startedAt);
      val('fps').textContent = stats.fps ? Math.round(stats.fps) : '—';
      val('res').textContent = `${window.innerWidth}×${window.innerHeight}`;
      val('dpr').textContent = `${window.devicePixelRatio}×`;
      val('mode').textContent = stats.trackingMode || 'mouse';
      fpsFill.style.width = `${Math.min(100, (stats.fps / 60) * 100)}%`;
    }

    tick();
    setInterval(tick, 500);
  },
};
