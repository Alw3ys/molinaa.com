// Shared backdrop for every page: four layers of ridgeline built from seeded
// ridged noise, so they're the same mountains on every visit. They parallax
// with the cursor and, on the home page, drift as you ride along the timeline.
// Expects <canvas id="ridges"> in the page.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('ridges');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const viewport = document.getElementById('tlViewport');
  let w, h, dpr;
  const mouse = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  let lastScroll = -1, lastEx = NaN, lastEy = NaN;

  // deterministic value noise -> ridged ("1 - |n|") for sharp peaks
  const hash = (i, seed) => { const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, seed) {
    const i = Math.floor(x), t = smooth(x - i);
    return hash(i, seed) * (1 - t) + hash(i + 1, seed) * t;
  }
  const ridged = (x, seed) => 1 - Math.abs(2 * noise(x, seed) - 1);

  const LAYERS = [
    // far -> near. base: where the ridge sits (fraction of height), amp: how tall,
    // f: horizontal frequency, mouse/scroll: parallax strength, tint: colour
    { base: 0.60, amp: 0.19, f: 1 / 420, mouse: 6,  scroll: 0.010, top: [30, 34, 43],  bot: [13, 15, 19], rim: 0.18 },
    { base: 0.70, amp: 0.19, f: 1 / 300, mouse: 12, scroll: 0.022, top: [21, 24, 30],  bot: [10, 11, 14], rim: 0.11 },
    { base: 0.80, amp: 0.18, f: 1 / 210, mouse: 20, scroll: 0.040, top: [14, 15, 19],  bot: [7, 8, 10],   rim: 0.05 },
    { base: 0.91, amp: 0.15, f: 1 / 150, mouse: 30, scroll: 0.065, top: [9, 10, 12],   bot: [5, 6, 7],    rim: 0 }
  ];

  function elevation(L, x, seed) {
    const u = x * L.f;
    return ridged(u, seed) * 0.62
         + ridged(u * 2.3 + 7, seed + 1) * 0.26
         + noise(u * 7.1 + 3, seed + 2) * 0.12;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    lastScroll = -1; // force a redraw
  }

  function draw(scroll) {
    ctx.clearRect(0, 0, w, h);
    const cw = innerWidth, ch = innerHeight;
    LAYERS.forEach((L, li) => {
      const seed = 11 + li * 17;
      const shift = eased.x * L.mouse + scroll * L.scroll;         // css px
      const lift = eased.y * L.mouse * 0.25;
      const baseY = ch * L.base + lift, amp = ch * L.amp;
      const step = 3;
      ctx.beginPath();
      ctx.moveTo(0, ch);
      for (let x = -step; x <= cw + step; x += step) {
        const y = baseY - amp * elevation(L, x + shift + 5000, seed);
        ctx.lineTo(x * dpr, y * dpr);
      }
      ctx.lineTo(cw * dpr, ch * dpr);
      ctx.closePath();
      // atmospheric perspective: far ridges sit in haze, near ones go black
      const g = ctx.createLinearGradient(0, (baseY - amp) * dpr, 0, ch * dpr);
      g.addColorStop(0, 'rgb(' + L.top.join(',') + ')');
      g.addColorStop(1, 'rgb(' + L.bot.join(',') + ')');
      ctx.fillStyle = g;
      ctx.fill();
      // a thread of alpenglow catching the crest line of the far ridges
      if (L.rim) {
        ctx.beginPath();
        for (let x = -step; x <= cw + step; x += step) {
          const y = baseY - amp * elevation(L, x + shift + 5000, seed);
          if (x === -step) ctx.moveTo(x * dpr, y * dpr); else ctx.lineTo(x * dpr, y * dpr);
        }
        ctx.strokeStyle = 'rgba(255,170,110,' + L.rim + ')';
        ctx.lineWidth = dpr;
        ctx.stroke();
      }
    });
  }

  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;   // -1..1
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
  });
  window.addEventListener('resize', resize);
  resize();

  if (reduce) { draw(0); return; }
  (function loop() {
    eased.x += (mouse.x - eased.x) * 0.04;
    eased.y += (mouse.y - eased.y) * 0.04;
    const scroll = viewport ? viewport.scrollLeft : 0;
    // only repaint when something moved
    if (scroll !== lastScroll || Math.abs(eased.x - lastEx) > 0.0005 || Math.abs(eased.y - lastEy) > 0.0005) {
      lastScroll = scroll; lastEx = eased.x; lastEy = eased.y;
      draw(scroll);
    }
    requestAnimationFrame(loop);
  })();
})();
