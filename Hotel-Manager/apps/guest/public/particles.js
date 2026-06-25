/*
 * particles.js — warm, light-friendly firefly / ember field + soft gold waves.
 * Plain 2D canvas (no WebGL): cheap, battery-aware, honours reduced-motion.
 * window.Particles.fireflies(canvasEl, opts)
 *   count, color, up, maxSize, speed, waves, density
 * Returns { stop, start, destroy }.
 */
(function () {
  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Pre-rendered soft glow sprite — drawn once, blitted per particle (fast).
  function makeSprite(rgb) {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    grd.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
    grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function fireflies(canvas, opts) {
    opts = opts || {};
    if (!canvas) return { stop() {}, start() {}, destroy() {} };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    const color = opts.color || '#c9a23a';
    const rgb = hexToRgb(color);
    const sprite = makeSprite(rgb);
    const up = opts.up !== false;
    const maxSize = opts.maxSize || 2.4;
    const speed = (opts.speed || 1) * (reduce ? 0 : 1);
    const waveColor = opts.waveColor ? hexToRgb(opts.waveColor) : rgb;
    const wantWaves = !!opts.waves;
    const baseCount = opts.count || 44;

    let w = 0, h = 0, dpr = 1, ps = [], raf = 0, running = true, t0 = performance.now();

    const rand = (a, b) => a + Math.random() * (b - a);

    function mk(seed) {
      return {
        x: rand(0, w),
        y: seed ? rand(0, h) : (up ? h + rand(0, 40) : -rand(0, 40)),
        r: rand(0.6, maxSize),
        vx: rand(-0.12, 0.12) * (speed || 1),
        vy: (up ? -1 : 1) * rand(0.08, 0.42) * (speed || 1),
        a: rand(0.25, 0.95),
        tw: rand(0.004, 0.018),
        ph: rand(0, Math.PI * 2),
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || canvas.offsetWidth || 1;
      h = canvas.clientHeight || canvas.offsetHeight || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(baseCount * Math.min(1, (w * h) / (1280 * 720)) + baseCount * 0.35);
      ps = [];
      for (let i = 0; i < count; i++) ps.push(mk(true));
    }

    function drawWaves(time) {
      const bands = [
        { y: 0.84, amp: 16, len: 0.010, sp: 0.00040, al: 0.05 },
        { y: 0.92, amp: 24, len: 0.007, sp: 0.00028, al: 0.06 },
      ];
      for (const b of bands) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 12) {
          const y = h * b.y + Math.sin(x * b.len + time * b.sp) * b.amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(${waveColor[0]},${waveColor[1]},${waveColor[2]},${b.al})`;
        ctx.fill();
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!running) return;
      const time = now - t0;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (wantWaves) drawWaves(time);
      for (const p of ps) {
        p.x += p.vx;
        p.y += p.vy;
        p.ph += p.tw;
        if (up && p.y < -30) { p.y = h + rand(0, 30); p.x = rand(0, w); }
        if (!up && p.y > h + 30) { p.y = -rand(0, 30); p.x = rand(0, w); }
        if (p.x < -30) p.x = w + 30; else if (p.x > w + 30) p.x = -30;
        const tw = 0.55 + 0.45 * Math.sin(p.ph);
        ctx.globalAlpha = p.a * tw;
        const d = p.r * 7;
        ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function onVis() { running = !document.hidden; }
    const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);

    resize();
    raf = requestAnimationFrame(frame);

    return {
      stop() { running = false; },
      start() { running = true; },
      destroy() {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVis);
      },
    };
  }

  window.Particles = { fireflies };
})();
