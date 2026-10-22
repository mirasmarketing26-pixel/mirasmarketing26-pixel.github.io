/* MIRAS motifs (r2): the shared visual library. One loop, one set of observers, every signature graphic on the site.
   Spec: the redesign spec §3. Every type is drawn from shapes already in the brand film: tide lines, the Flare sun,
   the Lusail skyline and Mira.

   Load: at the end of <body>, after content.js and work.js, before site.js (inner pages) or the inline script (index).
   index.html sets window.MOTIFS_MANUAL = true first and calls MOTIFS.step(now) from its own frame(): no second rAF chain.

   Budget rules (enforced here, verified per page):
   - one requestAnimationFrame chain; after 6s without input ambient motion drops to 12fps; nothing runs when
     no animated motif is visible, the tab is hidden, or the admin paused the page;
   - canvases: dpr ≤ 2 (≤ 1.5 on coarse pointers), ≤ 2.4M backing pixels each, parked (1×1) when > 2 viewports away;
   - prefers-reduced-motion: every motif draws one composed still, redrawn only on resize / language / data change. */
(() => {
  'use strict';
  if (window.MOTIFS) return;
  const D = document, html = D.documentElement;
  const { sin, cos, abs, min, max, round, PI, exp, hypot, atan2, pow, sqrt } = Math;
  const TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = x => 1 - pow(1 - clamp(x, 0, 1), 3);
  const now = () => performance.now();
  const AR_RE = /[؀-ۿ]/;
  // data-opts / data-tide JSON; numbers written the CSS way (.66, -.3) are accepted too
  const json = s => {
    if (!s) return {};
    for (const src of [s, String(s).replace(/([:[,]\s*)(-?)\.(\d)/g, (m, a, b, c) => a + b + '0.' + c)]) { try { const v = JSON.parse(src); return v && typeof v === 'object' ? v : {}; } catch (e) {} }
    console.warn('MOTIFS: unreadable options', s); return {};
  };
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const NS = 'http://www.w3.org/2000/svg';
  const VERSION = 'r3'; // the asset token: the monogram, the wordmark masks (motifs.css, site.css) and the home page's own CSS all carry the same ?v=, so each image is one cache entry
  // asset URLs are resolved against this script, so root-absolute pages (404) and nested paths both work
  const ASSETS = (() => { try { return new URL('.', D.currentScript.src).href; } catch (e) { return 'assets/'; } })();
  const asset = p => ASSETS + p + (p.includes('?') ? '' : '?v=' + VERSION);
  // the brand's swell: three sines, the same function the film's tide lines use
  const SW = (x, t) => .55 * sin(TAU * 1.05 * x + .45 * t) + .3 * sin(TAU * 2.2 * x - .7 * t + 1.7) + .15 * sin(TAU * 3.9 * x + 1.1 * t + .4);

  /* ================= colours, media, direction ================= */
  const C_DEF = { tide: '#2B3BF0', deep: '#0D0F2E', shore: '#F2EADB', flare: '#FF5A23', foam: '#BFF0DD', tide60: '#8098FD' };
  const C = { ...C_DEF };
  function readColors() {
    let cs = null; try { cs = getComputedStyle(html); } catch (e) {}
    for (const k of Object.keys(C_DEF)) { const v = cs && cs.getPropertyValue('--' + k).trim(); C[k] = v || C_DEF[k]; }
  }
  readColors();
  const DISC = { strategy: 'tide', branding: 'flare', content: 'tide60', digital: 'deep' };
  const mqR = matchMedia('(prefers-reduced-motion: reduce)'), mqC = matchMedia('(pointer: coarse)');
  let REDUCE = mqR.matches, COARSE = mqC.matches, RTL = html.dir === 'rtl';
  const isPhone = w => w < 760;

  /* ================= state ================= */
  const TYPES = Object.create(null);
  const MAP = new WeakMap();          // element → instance
  const LIST = [];                    // live instances
  const SUBS = new Set();             // onFrame subscribers
  const MANUAL = window.MOTIFS_MANUAL === true;
  let paused = false, raf = 0, last = 0, lastDraw = 0, lastInput = now(), kickUntil = now() + 1500, lastY = scrollY, VEL = 0, uid = 0;

  /* ================= observers ================= */
  const hasIO = 'IntersectionObserver' in window, hasRO = 'ResizeObserver' in window;
  const visIO = hasIO ? new IntersectionObserver(es => {
    for (const e of es) {
      const m = MAP.get(e.target); if (!m) continue;
      m.visible = e.isIntersecting;
      if (m.visible && !m.seen) { m.seen = now(); m.onSeen(); }
    }
    dirty = true; schedule();
  }, { rootMargin: '25% 0px' }) : null;
  const parkIO = hasIO ? new IntersectionObserver(es => {
    for (const e of es) { const m = MAP.get(e.target); if (!m) continue; e.isIntersecting ? m.unpark() : m.park(); }
  }, { rootMargin: '200% 0px' }) : null;
  const nearIO = hasIO ? new IntersectionObserver(es => {
    for (const e of es) for (const s of SUBS) if (s.el === e.target) s.near = e.isIntersecting;
    dirty = true; schedule();
  }, { rootMargin: '100% 0px' }) : null;
  // the observers can lag (or not fire at all after a programmatic scroll), so visibility and parking are also
  // measured directly: at mount, and at most every 250ms from kick() and the loop. Visible: within a quarter viewport;
  // unparked: within two viewports. A motif that unparks repaints at once, so its first frame is already composed.
  // The boxes are only re-read when something could have moved them: the scroll position or the viewport changed, a
  // motif or the page itself was resized (ResizeObserver), an observer reported, or the last sweep changed something.
  // With nothing moving, the read is skipped (it forced a layout each time) and repeated every 1.5s as a safety net.
  let lastSweep = 0, lastRead = 0, sweptY = NaN, sweptW = 0, sweptH = 0, dirty = true;
  function sweep(force) {
    const n = now(); if (!force && n - lastSweep < 250) return; lastSweep = n;
    const vh = innerHeight || 800, sy = scrollY, vw = innerWidth;
    if (!force && !dirty && sy === sweptY && vw === sweptW && vh === sweptH && n - lastRead < 1500) return;
    dirty = false; lastRead = n; sweptY = sy; sweptW = vw; sweptH = vh; let changed = false;
    // read first, write second: every box is measured before any canvas is resized or parked, so one sweep forces one
    // layout instead of one per motif (the writes below only change canvases, never the boxes read here)
    const ms = LIST.filter(m => !m.dead && !m._new), mr = ms.map(m => m.el.getBoundingClientRect());
    const ss = [...SUBS].filter(s => s.el), sr = ss.map(s => s.el.getBoundingClientRect());
    ms.forEach((m, i) => {
      const r = mr[i], shown = r.width > 0 || r.height > 0;
      m._box = { top: r.top, sy }; // the box as read, with the scroll it was read at: a later frame can move it without reading layout
      const near = shown && r.bottom > -2 * vh && r.top < 3 * vh, vis = shown && r.bottom > -.25 * vh && r.top < 1.25 * vh;
      if (near && m.parked) { m.unpark(r); changed = true; } else if (!near && !m.parked && hasIO) m.park();
      if (vis !== m.visible) { m.visible = vis; changed = true; }
      if (vis && !m.seen) { m.seen = n; try { m.onSeen(); } catch (e) {} changed = true; }
    });
    // onFrame subscribers tied to an element (the footer) are measured too: after a jump to the end (a hash link, End,
    // scroll restoration) nearIO may not have reported yet, and a subscriber that is not `near` never runs
    ss.forEach((s, i) => {
      const r = sr[i], nr = r.bottom > -vh && r.top < 2 * vh;
      if (nr !== s.near) { s.near = nr; changed = true; }
    });
    // the reads are fresh: hand the footer (and any other measured subscriber) its box, so it needs no read of its own
    ss.forEach((s, i) => { if (s.rect) { try { s.rect(sr[i]); } catch (e) {} } });
    if (changed) { dirty = true; schedule(); }
  }
  const resizeT = new WeakMap();
  const RO = hasRO ? new ResizeObserver(es => {
    dirty = true; // a motif, the page or the footer changed size: the next sweep re-reads every box
    for (const e of es) {
      const m = MAP.get(e.target); if (!m || m.dead) continue;
      clearTimeout(resizeT.get(m));
      resizeT.set(m, setTimeout(() => { if (m.dead) return; const r = m.el.getBoundingClientRect(); if (abs(r.width - m.W) > .5 || abs(r.height - m.H) > .5 || !m.W) { m.resize(); m.paint(); } }, 120));
    }
  }) : null;

  /* ================= canvas sizing: dpr cap and the per-canvas pixel cap ================= */
  const PX_CANVAS = 2.4e6, PX_TOTAL = 12e6;
  function fitCanvas(cv, w, h) {
    let d = min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2);
    while (w * h * d * d > PX_CANVAS && d > .5) d *= .92;
    // the whole page stays under the total: a canvas that would push it over draws at 1x (or less)
    const others = pixels() - (cv.width * cv.height);
    if (others + w * h * d * d > PX_TOTAL) d = max(.5, min(d, sqrt(max(0, PX_TOTAL - others) / max(1, w * h))));
    const W = max(1, round(w * d)), H = max(1, round(h * d));
    if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
    return d;
  }
  function pixels() { let n = 0; for (const m of LIST) if (!m.parked) for (const cv of m.canvases()) n += cv.width * cv.height; return n; }

  /* ================= the sprite: the curl end mark and the poster filter ================= */
  let spriteEl = null;
  const CURL_D = 'M1 11.5c2.6 0 4-1.6 5-4.2S9 3.4 11.2 3.4c2.4 0 3.6 1.9 3 3.6-.5 1.4-2.2 1.8-3.1.7', CURL_FOOT = [1, 11.5];
  function sprite() {
    if (spriteEl && spriteEl.isConnected) return spriteEl;
    spriteEl = D.getElementById('m-sprite');
    if (!spriteEl) {
      spriteEl = D.createElementNS(NS, 'svg');
      spriteEl.id = 'm-sprite'; spriteEl.setAttribute('aria-hidden', 'true'); spriteEl.setAttribute('focusable', 'false');
      spriteEl.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      // the end mark is an open wave crest (no baseline bar, so it never reads as a letter); its foot is (1, 11.5).
      // the poster filter: a .7px blur so the print bands have clean edges (no speckle from the WebP noise), a gamma pre-pass that keeps highlight detail, then six print steps per channel that run from
      // Deep ink (shadows) to Shore paper (highlights), so nothing prints as pure white and the Flare sun survives
      spriteEl.innerHTML = '<defs><symbol id="m-curl" viewBox="0 0 16 16" overflow="visible"><path pathLength="1" d="' + CURL_D + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
        '<filter id="m-poster" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".7"/><feComponentTransfer><feFuncR type="gamma" amplitude=".95" exponent="1.35" offset="0"/><feFuncG type="gamma" amplitude=".95" exponent="1.35" offset="0"/><feFuncB type="gamma" amplitude=".95" exponent="1.35" offset="0"/></feComponentTransfer>' +
        '<feComponentTransfer><feFuncR type="discrete" tableValues=".05 .2 .4 .62 .82 .95"/><feFuncG type="discrete" tableValues=".06 .2 .38 .58 .78 .92"/><feFuncB type="discrete" tableValues=".18 .36 .56 .74 .84 .86"/></feComponentTransfer></filter></defs>';
      (D.body || html).prepend(spriteEl);
    }
    return spriteEl;
  }
  function endMark(svg) {
    sprite();
    let u = svg.querySelector(':scope > use.end');
    if (!u) {
      u = D.createElementNS(NS, 'use'); u.setAttribute('class', 'end'); u.setAttribute('href', '#m-curl'); svg.append(u);
      // shown whole from the first frame: a half-drawn crest next to the last letter reads as a stray character
      u.classList.add('on');
    }
    return u;
  }
  // write an attribute only when its value changed since the last write: a frame that did not move writes nothing
  function setAttr(el, name, v) { const c = el._last || (el._last = {}); if (c[name] !== v) { c[name] = v; el.setAttribute(name, v); } }
  // place a curl of size s with its foot at point (x, y) on a baseline of angle a (radians); `lift` raises it off the
  // baseline (px, along the normal); mirrored for Arabic (it then extends leftwards)
  function placeCurl(u, x, y, a, s, mirror, lift = 0) {
    setAttr(u, 'width', s.toFixed(1)); setAttr(u, 'height', s.toFixed(1));
    setAttr(u, 'transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a * 180 / PI).toFixed(2)})${mirror ? ' scale(-1 1)' : ''} translate(${(-CURL_FOOT[0] / 16 * s).toFixed(1)} ${(-CURL_FOOT[1] / 16 * s - lift).toFixed(1)})`);
  }

  /* ================= the Lusail sun (Asia/Qatar, UTC+3 all year) ================= */
  const SUN_TABLE = [['06:20', '17:05'], ['06:15', '17:28'], ['05:50', '17:44'], ['05:20', '17:57'], ['04:58', '18:12'], ['04:46', '18:26'],
    ['04:53', '18:28'], ['05:08', '18:13'], ['05:21', '17:47'], ['05:34', '17:19'], ['05:51', '16:58'], ['06:11', '16:56']];
  const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  function sunAt(date = new Date()) {
    const q = new Date(date.getTime() + 3 * 3600e3), mon = q.getUTCMonth(), m = q.getUTCHours() * 60 + q.getUTCMinutes() + q.getUTCSeconds() / 60;
    const rise = hm(SUN_TABLE[mon][0]), set = hm(SUN_TABLE[mon][1]);
    if (m >= rise && m <= set) { const f = (m - rise) / (set - rise); return { x: .12 + .76 * f, alt: sin(PI * f), day: true }; }
    const night = 1440 - (set - rise), f = ((m - set + 1440) % 1440) / night;
    // the moon travels back from where the sun set (behind the towers) to where it will rise, so the set sun never jumps
    return { x: .88 - .76 * f, alt: -.6 * sin(PI * f), day: false };
  }
  const SKYLINE = [[0, .035, .30, 'rect'], [.04, .03, .42, 'step'], [.075, .025, .36, 'rect'], [.11, .05, .62, 'crescentL'], [.165, .05, .62, 'crescentR'],
    [.23, .03, .48, 'rect'], [.265, .022, .70, 'spire'], [.295, .04, .55, 'step'], [.345, .03, .40, 'rect'], [.38, .06, .30, 'rect'],
    [.45, .035, .82, 'taper'], [.495, .03, .58, 'step'], [.53, .025, .46, 'rect'], [.56, .05, .66, 'rect'], [.62, .03, .38, 'rect'],
    [.655, .04, .50, 'step'], [.70, .02, .60, 'spire'], [.73, .05, .34, 'rect'], [.79, .03, .44, 'rect'], [.83, .06, .26, 'dome'],
    [.90, .04, .32, 'rect'], [.95, .05, .22, 'rect']];

  /* ================= pure drawing helpers (CSS-pixel coordinates) ================= */
  const draw = {
    /** nested tide lines that never cross; returns the y of each sample per line (pass `out` to reuse the buffers) */
    lines(ctx, o = {}) {
      const x0 = o.x0 ?? 0, x1 = o.x1 ?? 100, top = o.top ?? 0, bottom = o.bottom ?? 100, n = max(1, o.n ?? 8) | 0;
      const amp = o.amp ?? 10, t = o.t ?? 0, calm = o.calm ?? .85, tilt = o.tilt ?? 0, lag = o.lag ?? .006, bumps = o.bumps || [];
      const S = o.S || round(clamp((x1 - x0) / 7, 40, 200)), gap = n > 1 ? (bottom - top) / (n - 1) : 0, minGap = o.minGap ?? 1.2;
      const out = o.out && o.out.length === n && o.out[0].length === S + 1 ? o.out : Array.from({ length: n }, () => new Float32Array(S + 1));
      for (let i = 0; i < n; i++) {
        // `grow` (0…1) turns the profile round: the far line keeps `grow` of the swell and it builds toward the viewer
        const base = n > 1 ? top + i * gap : (top + bottom) / 2, e = n < 2 ? 1 : o.grow != null ? o.grow + (1 - o.grow) * i / (n - 1) : pow(clamp(1 - i / ((n - 1) * calm), 0, 1), 1.5), ys = out[i], prev = i ? out[i - 1] : null;
        for (let s = 0; s <= S; s++) {
          const u = s / S; let f = SW(u + i * lag, t - i * .05);
          for (const b of bumps) f += b.a * sin(min(1, b.age * 2.2) * PI) * exp(-b.age * .9) * exp(-(((u - b.x) / .1) ** 2));
          let y = base - tilt * u * (bottom - top) - amp * e * f;
          if (prev && y < prev[s] + minGap) y = prev[s] + minGap;
          ys[s] = y;
        }
      }
      if (ctx && o.ink) {
        ctx.save(); ctx.strokeStyle = o.ink; ctx.globalAlpha = o.alpha ?? 1; ctx.lineWidth = o.width ?? 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < n; i++) { const ys = out[i]; for (let s = 0; s <= S; s++) { const x = x0 + (x1 - x0) * s / S; s ? ctx.lineTo(x, ys[s]) : ctx.moveTo(x, ys[s]); } }
        ctx.stroke(); ctx.restore();
      }
      return out;
    },
    /** the Flare sun, clipped at the horizon. `moon` draws a crescent instead: a disc in `color` at .92 with an offset
        disc cut out of it (the dark limb keeps a faint earthshine), so at night it reads as a body, not an empty ring.
        Draw the moon first on a clear canvas: the cut erases whatever is under it. */
    sun(ctx, o) {
      const { x, y, r } = o; ctx.save();
      if (o.moon) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
        ctx.fillStyle = o.color; ctx.globalAlpha = .92; ctx.fill();
        ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x - .42 * r, y - .1 * r, r * .97, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'destination-over'; ctx.globalAlpha = .05; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.restore(); return;
      }
      if (o.horizonY != null) { ctx.beginPath(); ctx.rect(x - r - 2, y - r - 2, 2 * r + 4, max(0, o.horizonY - (y - r - 2))); ctx.clip(); }
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
    },
    /** MOTIFS.SKYLINE standing on baseY between x0 and x1 */
    skyline(ctx, o) {
      const { x0, x1, baseY, maxH } = o, span = x1 - x0; ctx.save(); ctx.fillStyle = o.color; ctx.strokeStyle = o.color; ctx.globalAlpha = o.alpha ?? .92;
      ctx.beginPath();
      for (const [fx, fw, fh, type] of SKYLINE) {
        let X = x0 + fx * span; const w = fw * span, h = fh * maxH, B = baseY;
        if (o.mirror) X = x1 - (fx + fw) * span;
        const tp = o.mirror ? ({ crescentL: 'crescentR', crescentR: 'crescentL' })[type] || type : type;
        if (tp === 'rect' || tp === 'spire') ctx.rect(X, B - h, w, h);
        else if (tp === 'step') { ctx.rect(X, B - h * .7, w, h * .7); ctx.rect(X + w * .2, B - h, w * .6, h * .3 + .5); }
        else if (tp === 'taper') { ctx.moveTo(X, B); ctx.lineTo(X + w * .225, B - h); ctx.lineTo(X + w * .775, B - h); ctx.lineTo(X + w, B); ctx.closePath(); }
        else if (tp === 'crescentL') { ctx.moveTo(X, B); ctx.lineTo(X, B - h); ctx.quadraticCurveTo(X + w * 1.15, B - h * .62, X + w, B); ctx.closePath(); }
        else if (tp === 'crescentR') { ctx.moveTo(X + w, B); ctx.lineTo(X + w, B - h); ctx.quadraticCurveTo(X - w * .15, B - h * .62, X, B); ctx.closePath(); }
        else if (tp === 'dome') { const rh = min(h * .3, w * .45); ctx.rect(X, B - h + rh, w, h - rh); ctx.moveTo(X, B - h + rh + .5); ctx.ellipse(X + w / 2, B - h + rh + .5, w / 2, rh, 0, PI, TAU); }
      }
      ctx.fill();
      ctx.lineWidth = 1; ctx.beginPath();
      for (const [fx, fw, fh, type] of SKYLINE) if (type === 'spire') { const X = o.mirror ? x1 - (fx + fw / 2) * span : x0 + (fx + fw / 2) * span, h = fh * maxH; ctx.moveTo(round(X) + .5, baseY - h); ctx.lineTo(round(X) + .5, baseY - h * 1.25); }
      ctx.stroke(); ctx.restore();
    },
    /** a square turned 45°, `size` across */
    diamond(ctx, x, y, size, color) { const r = size / 2; ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.restore(); },
    /** a polyline [[x,y]…] drawn up to `progress` (0…1) of its length */
    dashed(ctx, pts, o = {}) {
      if (!pts || pts.length < 2) return; const p = clamp(o.progress ?? 1, 0, 1); if (p <= 0) return;
      let total = 0; for (let i = 1; i < pts.length; i++) total += hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let left = total * p; ctx.save(); ctx.strokeStyle = o.color; ctx.lineWidth = o.width ?? 2; ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash(o.dash || []); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length && left > 0; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = hypot(bx - ax, by - ay);
        if (L <= left) { ctx.lineTo(bx, by); left -= L; } else { const k = left / L; ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k); left = 0; }
      }
      ctx.stroke(); ctx.restore();
    },
  };
  // Catmull-Rom through points → polyline with `per` samples a segment; also the index of each control point
  function catmull(P, per = 24) {
    const out = [], at = [0];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[min(P.length - 1, i + 2)];
      for (let k = i ? 1 : 0; k <= per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
      at.push(out.length - 1);
    }
    return { pts: out, at };
  }
  const cumLen = pts => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
  const labelFont = (txt, size = 15, weight = 500) => AR_RE.test(txt) ? `${max(weight, 500)} ${size}px "IBM Plex Sans Arabic", sans-serif` : `${weight} ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
  // text read from selectors ("#a,#b" or "[data-i18n='x'],[data-i18n='y']"), in list order
  const splitSel = s => String(s || '').split(/,(?![^[]*\])/).map(x => x.trim()).filter(Boolean);
  const textOf = sel => { if (!sel) return ''; try { return (D.querySelector(sel)?.textContent || '').trim(); } catch (e) { return ''; } };
  const bgOf = el => { for (let n = el; n && n !== D; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && b !== 'transparent' && !/rgba\(.+,\s*0\)$/.test(b)) return b; } return C.shore; };

  /* ================= base class ================= */
  class Motif {
    static defaults = {};
    constructor(el, opts = {}) {
      this.el = el; this.id = ++uid;
      this.o = Object.assign({}, this.constructor.defaults, opts || {}, json(el.dataset && el.dataset.opts));
      this.ink = (el.dataset && el.dataset.ink) || this.o.ink || 'shore';
      this.cv = el instanceof HTMLCanvasElement ? el : null;
      this.ctx = this.cv ? this.cv.getContext('2d') : null;
      this.W = 0; this.H = 0; this.dpr = 1; this.visible = !hasIO; this.parked = false; this.seen = hasIO ? 0 : now(); this.dead = false;
      this.t = Math.random() * 20; this.speed = this.o.speed ?? 1; this._off = [];
      MAP.set(el, this); this._new = true;
      queueMicrotask(() => { if (this._new) attach(this); });
    }
    /** false for static types: the loop never calls draw(), only still()/paint() on changes */
    get animated() { return true; }
    get rtl() { return RTL; }
    get mini() { return !!this.o.mini; }
    canvases() { return this.cv ? [this.cv] : []; }
    col(k) { k = k || this.ink; if (k in C) return C[k]; if (k === 'currentColor') return getComputedStyle(this.el).color; return k; }
    init() {}
    onSeen() {}
    resize(r) { r = r || this.el.getBoundingClientRect(); this.W = r.width; this.H = r.height; if (this.cv) this.dpr = fitCanvas(this.cv, r.width, r.height); this.readAvoid(r); }
    /** keep-outs: the page text this motif's lines break around, the way chart contours break around soundings.
        Selectors from data-avoid (or opts.avoid, or the type's default for full-size motifs); "none" turns it off.
        Stored as screen-space rects relative to the canvas, from each element's text line boxes, padded 16 × 10px.
        Fixed elements (the nav) are measured as if the page were at the top. */
    readAvoid(cr) {
      this.holes = [];
      const ds = this.el.dataset && this.el.dataset.avoid, sel = ds != null ? ds : this.o.avoid ?? (this.mini ? '' : this.constructor.avoid || '');
      if (!sel || sel === 'none' || !this.W || !this.H) return;
      cr = cr || this.el.getBoundingClientRect(); let list; try { list = D.querySelectorAll(sel); } catch (e) { return; }
      const rg = D.createRange();
      for (const n of list) {
        if (n === this.el || this.el.contains(n) || !n.getClientRects().length || n.closest('.nav-fly, [hidden], [aria-hidden="true"]:not(.motif)')) continue;
        // closed flyouts and faded-out items keep their boxes: only words someone can see make a keep-out
        if (n.checkVisibility && !n.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        let fx = false; for (let a = n; a && a !== D.body; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') { fx = true; break; }
        const dy = fx ? -scrollY : 0; rg.selectNodeContents(n);
        // one keep-out per element, around all its lines: a ragged last line leaves no loose stubs of water beside it.
        // A multi-line block (the lead) gets 16px all round and feathered ends; a one-line word keeps a 16 × 10 pad.
        let L = 1e9, T = 1e9, R = -1e9, Bt = -1e9, lines = 0;
        for (const r of rg.getClientRects()) { if (r.width < 1 || r.height < 1) continue; lines++; L = min(L, r.left); T = min(T, r.top); R = max(R, r.right); Bt = max(Bt, r.bottom); }
        if (!lines) continue;
        const block = Bt - T > 1.6 * (parseFloat(getComputedStyle(n).lineHeight) || 24), py = block ? 16 : 10;
        const x = L - cr.left - 16, y = T - cr.top + dy - py, w = R - L + 32, h = Bt - T + 2 * py;
        if (x > this.W || y > this.H || x + w < 0 || y + h < 0) continue;
        // a block that ends close to the canvas edge takes the rest of it, so no thin strip of line ends is left below it
        const y1 = block && this.H - (y + h) < 48 ? this.H + 2 : y + h;
        this.holes.push({ x, y, w, h: y1 - y, feather: block ? 24 : 0 }); if (this.holes.length >= 24) return;
      }
    }
    /** clip the canvas so strokes stop short of the keep-outs and of `extra` rects (label boxes); undo with ctx.restore().
        Rects are in screen space; the current (possibly mirrored) transform is kept for the drawing that follows. */
    keepOut(extra) {
      const c = this.ctx; c.save(); const hs = extra && extra.length ? (this.holes || []).concat(extra) : this.holes || []; if (!hs.length) return;
      const m = c.getTransform(); this.straight();
      // one clip per hole: their intersection is "everything but the union of the holes", even where holes overlap
      for (const h of hs) { c.beginPath(); c.rect(-1, -1, this.W + 2, this.H + 2); c.rect(h.x, h.y, h.w, h.h); c.clip('evenodd'); }
      c.setTransform(m);
    }
    /** soften where the water meets a block keep-out: call right after keepOut()'s restore, before anything else is
        drawn on top. The lines fade out over the last `feather` px before the block's left and right ends. */
    feather() {
      const c = this.ctx, hs = (this.holes || []).filter(h => h.feather); if (!hs.length) return;
      c.save(); this.straight(); c.globalCompositeOperation = 'destination-out';
      for (const h of hs) {
        const f = h.feather, x0 = h.x - f, x1 = h.x + h.w + f;
        // left and right ends over the block's height; top and bottom across its width and the end bands
        for (const [a, b, vert] of [[h.x - f, h.x, 0], [h.x + h.w + f, h.x + h.w, 0], [h.y - f, h.y, 1], [h.y + h.h + f, h.y + h.h, 1]]) {
          const g = vert ? c.createLinearGradient(0, a, 0, b) : c.createLinearGradient(a, 0, b, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
          c.fillStyle = g; vert ? c.fillRect(x0, min(a, b), x1 - x0, f) : c.fillRect(min(a, b), h.y, f, h.h);
        }
      }
      c.restore();
    }
    /** clear and set the transform; mirrored geometry in RTL when `mirror` */
    begin(mirror) { const c = this.ctx, d = this.dpr; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.W, this.H); if (mirror && RTL) c.setTransform(-d, 0, 0, d, this.W * d, 0); }
    straight() { const d = this.dpr; this.ctx.setTransform(d, 0, 0, d, 0, 0); }
    /** where label() would set `txt`: { X, Y, align, font, box } (box = the padded screen rect, for keepOut) */
    labelAt(txt, x, y, o = {}) {
      if (!txt) return null; const c = this.ctx;
      const sx = RTL && o.mirror !== false ? this.W - x : x, after = o.after ?? 12, align = o.align || (RTL ? 'right' : 'left'), size = o.size || 15, font = labelFont(txt, size);
      let X = align === 'center' ? sx : sx + (RTL ? -after : after); const Y = y - (o.up ?? 12);
      c.save(); c.font = font; const tw = c.measureText(txt).width; c.restore();
      // keep the label on the canvas
      let x0 = align === 'center' ? X - tw / 2 : align === 'right' ? X - tw : X;
      if (x0 < 8) { X += 8 - x0; x0 = 8; } else if (x0 + tw > this.W - 8) { X -= x0 + tw - (this.W - 8); x0 = this.W - 8 - tw; }
      const p = o.pad ?? 8;
      return { X, Y, align, font, box: { x: x0 - p, y: Y - size * .82 - p, w: tw + 2 * p, h: size * 1.1 + 2 * p } };
    }
    /** a label in screen space at logical (x, y): never mirrored, right-aligned in RTL. No halo by default: the motif
        clears the lines around it with keepOut(), so the words sit on clean water */
    label(txt, x, y, o = {}) {
      const L = o.at || this.labelAt(txt, x, y, o); if (!L) return; const c = this.ctx; c.save(); this.straight();
      c.font = L.font; c.textAlign = L.align; c.textBaseline = 'alphabetic'; c.globalAlpha = o.alpha ?? 1;
      if (o.halo) { c.lineWidth = 5; c.lineJoin = 'round'; c.strokeStyle = o.halo; c.strokeText(txt, L.X, L.Y); }
      c.fillStyle = o.color || this.col(); c.fillText(txt, L.X, L.Y); c.restore();
    }
    draw() {}
    still() { this.draw(2.4, 0, 0); }
    /** one redraw now (resize, language, data): the still in reduced motion */
    paint() { if (this.dead || this.parked || !this.W || !this.H) return; try { REDUCE ? this.still() : this.draw(this.t, 0, VEL); } catch (e) { console.error('MOTIFS:', e); } }
    refresh() { this.resize(); this.paint(); }
    /** a local disturbance (pointer, "added to brief"): types read this.bump() */
    surge(x = .5, a = 1) { if (REDUCE) return; this.surgeAt = now(); this.surgeA = clamp(a, 0, 2); this.surgeX = x; kick(); }
    bump() { if (!this.surgeAt) return 0; const age = (now() - this.surgeAt) / 1000; if (age > 2) { this.surgeAt = 0; return 0; } return this.surgeA * exp(-age * 2.4) * sin(age * 10); }
    park() { if (this.parked) return; this.parked = true; for (const cv of this.canvases()) { cv.width = 1; cv.height = 1; } }
    /** back on screen: a motif refreshed while parked is redrawn in full (words, colours, keep-outs); the rest re-measure */
    unpark(r) { if (!this.parked) return; this.parked = false; if (this._stale) { this._stale = false; this.refresh(); } else { this.resize(r); this.paint(); } }
    /** pointer position in this element's CSS pixels (mirrored in RTL when `mirror`); listens on `target` (passive) */
    listenPointer(target, mirror, onMove) {
      target = target || this.el;
      const mv = e => { const r = this.el.getBoundingClientRect(); let x = e.clientX - r.left; const y = e.clientY - r.top; if (mirror && RTL) x = r.width - x; this.px = x; this.py = y; this.pin = true; onMove && onMove(e, x, y); };
      const lv = () => { this.pin = false; };
      target.addEventListener('pointermove', mv, { passive: true }); target.addEventListener('pointerdown', mv, { passive: true });
      target.addEventListener('pointerleave', lv, { passive: true }); target.addEventListener('pointercancel', lv, { passive: true });
      this._off.push(() => { target.removeEventListener('pointermove', mv); target.removeEventListener('pointerdown', mv); target.removeEventListener('pointerleave', lv); target.removeEventListener('pointercancel', lv); });
    }
    host() { return this.el.closest('section, .hero, header, footer, figure, .band') || this.el.parentElement || this.el; }
    destroy() {
      if (this.dead) return; this.dead = true;
      try { this._off.forEach(f => f()); } catch (e) {}
      visIO?.unobserve(this.el); parkIO?.unobserve(this.el); RO?.unobserve(this.el); clearTimeout(resizeT.get(this));
      const i = LIST.indexOf(this); if (i >= 0) LIST.splice(i, 1); MAP.delete(this.el);
      for (const cv of this.canvases()) { cv.width = 1; cv.height = 1; }
      this.bitmap?.close?.(); this.bitmap = null;
    }
  }

  function attach(m) {
    if (!m._new || m.dead) return; m._new = false; LIST.push(m);
    try { m.init(); m.resize(); m.paint(); } catch (e) { console.error('MOTIFS: could not start', m.el, e); }
    visIO?.observe(m.el); parkIO?.observe(m.el); RO?.observe(m.el);
    sweep(true); schedule();
  }

  /* ================= tide: the original hairlines ================= */
  class Tide extends Motif {
    static defaults = { lines: 14, tide: 30, calm: .85, alpha: .85, width: 1.15, speed: 1, interactive: false, maxTide: null, padTop: 0, padBottom: 2, lag: .006, ink: 'shore' };
    constructor(el, o) { super(el, o); this.bumps = []; this.ys = []; this.ready = false; this.tide = this.o.tide; this.maxTide = this.o.maxTide ?? this.o.tide; this._lp = 0; }
    init() {
      if (this.o.interactive) {
        let lx = 0, lt = 0;
        this.listenPointer(this.host(), false, (e, x) => {
          const n = now(); if (n - this._lp < 60) return; const sp = abs(x - lx) / max(1, n - lt) * 1000; lx = x; lt = n; this._lp = n;
          if (this.W) this.surge(clamp(x / this.W, 0, 1), clamp(sp / 1200, .15, .8));
        });
      }
    }
    resize(r) {
      super.resize(r); this.S = round(clamp(this.W / 7, 40, 200)); const N = max(1, this.o.lines | 0);
      if (this.ys.length !== N || this.ys[0].length !== this.S + 1) this.ys = Array.from({ length: N }, () => new Float32Array(this.S + 1));
      this.ready = false;
    }
    scale() { return clamp(this.W / 1400, .5, 1.1); }
    surge(x, a = .9) { this.bumps.push({ x, a, age: 0 }); if (this.bumps.length > 12) this.bumps.shift(); kick(); }
    compute(dt) {
      const N = this.ys.length, S = this.S, sc = this.scale(), Tt = this.tide * sc;
      const top = this.maxTide * sc * 1.2 + this.o.padTop, bot = this.H - this.o.padBottom;
      const gap = N > 1 ? (bot - top) / (N - 1) : 0, minGap = N > 1 ? max(1.1, gap * .14) : 0, calm = this.o.calm, lag = this.o.lag;
      for (const b of this.bumps) b.age += dt; if (this.bumps.length) this.bumps = this.bumps.filter(b => b.age < 3);
      for (let i = 0; i < N; i++) {
        const base = N > 1 ? top + i * gap : this.H / 2, e = N > 1 ? pow(clamp(1 - i / ((N - 1) * calm), 0, 1), 1.5) : 1, ys = this.ys[i], prev = i ? this.ys[i - 1] : null;
        for (let s = 0; s <= S; s++) {
          const x = s / S; let f = SW(x + i * lag, this.t - i * .05);
          for (const b of this.bumps) f += b.a * sin(min(1, b.age * 2.2) * PI) * exp(-b.age * .9) * exp(-(((x - b.x) / .1) ** 2));
          let y = base - Tt * e * f; if (prev && y < prev[s] + minGap) y = prev[s] + minGap; ys[s] = y;
        }
      }
      this.ready = true;
    }
    draw(t, dt) {
      this.compute(dt || 0);
      const c = this.ctx, S = this.S, w = this.W; this.begin();
      c.strokeStyle = this.col(); c.globalAlpha = this.o.alpha; c.lineJoin = 'round'; c.lineCap = 'round';
      for (let i = 0; i < this.ys.length; i++) {
        const ys = this.ys[i]; c.lineWidth = this.o.width * (this.ys.length > 1 ? .82 + .36 * (((i * 37) % 7) / 6) : 1);
        c.beginPath(); for (let s = 0; s <= S; s++) s ? c.lineTo(s / S * w, ys[s]) : c.moveTo(0, ys[0]); c.stroke();
      }
      c.globalAlpha = 1;
    }
    still() { this.bumps = []; this.draw(2.4, 0); }
    y(i, x) { if (!this.ready && this.W) this.compute(0); const ys = this.ys[i] || this.ys[0]; return ys ? ys[round(clamp(x, 0, 1) * this.S)] : 0; }
    slope(i, x) { return (this.y(i, x + .012) - this.y(i, x - .012)) / (.024 * max(1, this.W)); }
    /** sit an element on line `line` at x (0…1): its base touches the water; `face` = 1 | -1 flips it */
    ride(el, line, x, lift = .8, face) {
      if (!this.W || !this.ys[line]) return;
      const w = el.offsetWidth, h = el.offsetHeight, y = this.y(line, x), a = clamp(atan2(this.slope(line, x), 1) * 180 / PI, -12, 12);
      el.style.transform = `translate(${(x * this.W - w / 2).toFixed(1)}px,${(y - h * lift).toFixed(1)}px) rotate(${a.toFixed(2)}deg)${face ? ` scaleX(${face})` : ''}`;
    }
  }

  /* ================= chart: the depth chart (Strategy) ================= */
  // the page text a full-size hero motif's lines break around: the lead and the nav's words (data-avoid overrides)
  const HERO_AVOID = '.hero .lead, .nav .brand, .nav-links a, .nav .lang, .nav .menu-btn';
  const RING_N = 192;
  // the island's coast as a fraction of its radius at angle th; f0/f1 make the fine crinkle breathe
  const coast = (th, f0, f1) => {
    let d = th - 2.4; d -= TAU * Math.round(d / TAU);
    return .11 * sin(2 * th + 1.1) + .07 * sin(3 * th + .4) + .04 * sin(5 * th + 2.2) + .022 * sin(7 * th + .8 + f0 * .5) + .013 * sin(11 * th + f0 * .7) + .008 * sin(17 * th + f1 * .5) - .18 * exp(-((d / .3) ** 2));
  };
  class Chart extends Motif {
    static defaults = { ink: 'shore', mini: false, rings: 9, route: null, centre: null };
    static avoid = HERO_AVOID;
    init() {
      this.rings = Array.from({ length: 9 }, () => new Float32Array((RING_N + 1) * 2));
      this.reached = [0, 0, 0, 0, 0];
      if (!this.mini) this.listenPointer(this.host(), true);
    }
    resize() {
      super.resize(); this.bg = bgOf(this.el.parentElement || this.el);
      const hero = this.el.closest('section, .hero') || this.el.parentElement, r = hero ? hero.getBoundingClientRect() : { bottom: this.H };
      this.heroBottom = r.bottom + scrollY;
      // the fixed nav's band at the top of a full-size chart: the contours fade out under it, so no ring runs through the links
      const nav = !this.mini && D.querySelector('.nav'), top = this.el.getBoundingClientRect().top + scrollY;
      this.navCut = nav ? max(0, nav.offsetHeight - top) : 0;
      this.readLabels();
    }
    readLabels() {
      const d = this.el.dataset; this.names = splitSel(d.labels).map(textOf); this.here = textOf(d.here); this.goal = textOf(d.goal);
    }
    refresh() { this.readLabels(); super.refresh(); }
    geom() {
      const W = this.W, H = this.H, ph = isPhone(W) && !this.mini, Dg = hypot(W, H), sc = ph ? .8 : 1;
      // the mini is a corner of a chart, not a target: the island sits low on the right, its outer contours run off the
      // card's edges, and the route comes in from the left to its western shore
      const c = this.o.centre || (this.mini ? [.84, .64] : ph ? [.72, .50] : [.80, .42]);
      // desktop/phone routes run through the open upper part of the hero, so the words below stay clear (spec deviation, see motifs-api.md)
      const P = this.o.route || (this.mini ? [[.06, .86], [.24, .74], [.42, .70], [.6, .6]] : ph ? [[.10, .20], [.30, .30], [.50, .22], [.56, .40]] : [[.07, .40], [.25, .28], [.43, .34], [.58, .22]]);
      return { cx: c[0] * W, cy: c[1] * H, R0: Dg * (this.mini ? .05 : .07) * sc, step: Dg * (this.mini ? .095 : .069) * sc, P: P.map(p => [p[0] * W, p[1] * H]) };
    }
    /** the route's draw-on: the intro alone carries it all the way to the island's edge (labels fade in as it passes) */
    progress() {
      if (REDUCE || this.mini) return 1;
      return this.seen ? easeOut((now() - this.seen) / 1200) : 0;
    }
    introDone() { return REDUCE || this.mini || (!!this.seen && now() - this.seen > 1250); }
    draw(t) {
      const c = this.ctx; if (!c) return; const g = this.geom(), N = this.mini ? 4 : 9, ink = this.col();
      this.begin(true);
      const push = !this.mini && this.pin && !REDUCE, sb = 1 + .05 * this.bump();
      // bathymetry, not a target: each deeper contour's centre drifts toward the route, so the depths open into a
      // shallow approach on the route side and bunch into a steep shelf on the far side
      const ph = isPhone(this.W), dx = g.step * (this.mini ? .44 : ph ? .34 : .2), dy = g.step * (this.mini ? .18 : ph ? .14 : .08), irr = this.mini ? 1.6 : ph ? 1.3 : 1;
      for (let k = 0; k < N; k++) {
        const R = (g.R0 + k * g.step) * (k ? sb : 1), a = this.rings[k], ox = g.cx - k * dx, oy = g.cy + k * dy, p0 = k * 1.7, f0 = p0 + .15 * t, f1 = p0 + .9 - .11 * t, f2 = p0 + 1.8 + .07 * t;
        for (let j = 0; j <= RING_N; j++) {
          const th = j / RING_N * TAU;
          // the island has a charted coastline, not a blob: a lopsided body, headlands, a fine crinkle that breathes and
          // one bay cut into its south-west shore (mirrored with the chart in RTL). The first contour follows the same
          // coast at 60%, so it hugs the shore; the deeper ones keep the open swell
          const r = k === 0 ? R * (1 + coast(th, f0, f1)) : k === 1 ? R * (1 + .6 * coast(th, f0, f1))
            : R * (1 + irr * (.045 * sin(2 * th + f0) + .03 * sin(3 * th + f1) + .012 * sin(5 * th + f2)));
          let x = ox + r * cos(th), y = oy + r * sin(th);
          if (push) { const d = hypot(x - this.px, y - this.py); if (d < 420) { const q = 16 * exp(-((d / 140) ** 2)); x += cos(th) * q; y += sin(th) * q; } }
          a[2 * j] = x; a[2 * j + 1] = y;
        }
      }
      const path = k => { const a = this.rings[k]; c.beginPath(); c.moveTo(a[0], a[1]); for (let j = 1; j <= RING_N; j++) c.lineTo(a[2 * j], a[2 * j + 1]); c.closePath(); };
      // the route: S → P1 → P2 → P3 → the island's edge
      const isl = this.rings[0], P3 = g.P[g.P.length - 1]; let bj = 0, bd = 1e9, top = 1e9, topX = g.cx;
      for (let j = 0; j < RING_N; j++) { const d = hypot(isl[2 * j] - P3[0], isl[2 * j + 1] - P3[1]); if (d < bd) { bd = d; bj = j; } if (isl[2 * j + 1] < top) { top = isl[2 * j + 1]; topX = isl[2 * j]; } }
      const E = [isl[2 * bj], isl[2 * bj + 1]], cr = catmull([...g.P, E], 24), L = cumLen(cr.pts), total = L[L.length - 1], p = this.progress();
      const tNow = now(), shown = [];
      for (let i = 1; i <= 3; i++) {
        const at = L[cr.at[i]] / total, on = p >= at - 1e-3;
        if (on && !this.reached[i]) this.reached[i] = tNow; if (!on) this.reached[i] = 0;
        if (on) shown[i] = at;
      }
      // labels are placed first, so the contours can break around them (no halo: the words sit on clean water)
      const labs = [];
      if (!this.mini) {
        const fade = at => REDUCE ? 1 : clamp((p - at) / .04, 0, 1), sz = isPhone(this.W) ? 13 : 15;
        const add = (txt, x, y, alpha, o = {}) => { const at = alpha > .02 && this.labelAt(txt, x, y, { size: sz, ...o }); if (at) labs.push({ txt, at, alpha }); };
        add(this.here, g.P[0][0], g.P[0][1], 1);
        for (let i = 1; i <= 3; i++) if (shown[i]) add(this.names[i - 1], g.P[i][0], g.P[i][1], fade(shown[i]));
        const atGoal = p >= .999;
        // the goal is named once the intro has played, just above the island's highest point
        const goalOn = atGoal || this.introDone(); if (goalOn && !this.reached[4]) this.reached[4] = tNow; if (!goalOn) this.reached[4] = 0;
        if (goalOn) add(this.goal, max(topX, g.cx), top, REDUCE || atGoal ? 1 : clamp((tNow - this.seen - 1250) / 300, 0, 1), { up: 10, after: 0 });
      }
      // shallows: every ring lays a whisper of ink, so the centre builds up lighter. On a mini they go down first, at full
      // strength to the card's edges (the card crops the chart hard, like a print); on the hero they are slipped in under
      // the lines afterwards, so the nav fade takes only the lines
      const shallows = () => { c.fillStyle = ink; c.globalAlpha = .035; for (let k = 1; k < N; k++) { path(k); c.fill(); } c.globalAlpha = 1; };
      const island = () => { c.globalAlpha = 1; c.fillStyle = C.flare; path(0); c.fill(); };
      if (this.mini) { shallows(); island(); }
      // the contour lines (broken around the labels)
      this.keepOut(labs.map(l => l.at.box));
      // the coastline: a fine ink line, not a rim
      c.lineJoin = 'round'; c.strokeStyle = ink; c.globalAlpha = this.mini ? .7 : .5; c.lineWidth = 1; path(0); c.stroke();
      for (let k = 1; k < N; k++) { c.globalAlpha = max(.2, .85 - k * .06); c.lineWidth = k % 3 === 0 ? 1.8 : 1.15; path(k); c.stroke(); }
      c.restore(); this.feather();
      // a mini is cut by its strip only at the card's left and right edges: its rings and shallows feather out over the top and bottom
      if (this.mini) this.edgeFade(28);
      // on the hero the lines fade out under the fixed nav, so no ring runs through the links (only the lines are erased).
      // A mini has no fade at all: its rings and shallows run to the card's edges and are cut there, flat and hard
      const solid = this.mini ? 0 : this.navCut, fadeTo = this.navCut + 36;
      if (solid > 0) {
        const gr = c.createLinearGradient(0, 0, 0, fadeTo);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(solid * .8 / fadeTo, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); this.straight(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = gr; c.fillRect(-2, -2, this.W + 4, fadeTo + 2);
        c.restore();
      }
      // the island and (hero) the shallows go in under the lines already drawn
      if (!this.mini) { c.globalCompositeOperation = 'destination-over'; island(); shallows(); c.globalCompositeOperation = 'source-over'; }
      c.globalAlpha = 1;
      draw.dashed(c, cr.pts, { color: C.flare, width: 2, dash: [2, 9], progress: p });
      draw.diamond(c, g.P[0][0], g.P[0][1], this.mini ? 8 : 10, ink);
      for (let i = 1; i <= 3; i++) if (shown[i]) draw.diamond(c, g.P[i][0], g.P[i][1], this.mini ? 6 : 7, ink);
      for (const l of labs) this.label(l.txt, 0, 0, { at: l.at, alpha: l.alpha });
    }
    edgeFade(f) {
      const c = this.ctx, H = this.H; if (!c || H < f * 2) return;
      c.save(); this.straight(); c.globalCompositeOperation = 'destination-out';
      const top = c.createLinearGradient(0, 0, 0, f), bot = c.createLinearGradient(0, H - f, 0, H);
      top.addColorStop(0, 'rgba(0,0,0,1)'); top.addColorStop(1, 'rgba(0,0,0,0)');
      bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = top; c.fillRect(-2, -2, this.W + 4, f + 2);
      c.fillStyle = bot; c.fillRect(-2, H - f, this.W + 4, f + 2);
      c.restore();
    }
    still() { this.draw(2.4); }
  }

  /* ================= mark: the monogram drawn in water (Branding) ================= */
  let MARK_IMG = null;
  const markImg = () => {
    if (MARK_IMG) return MARK_IMG;
    MARK_IMG = new Image(); MARK_IMG.decoding = 'async'; MARK_IMG.src = asset('monogram.png');
    MARK_IMG.onload = () => { for (const m of LIST) if (m instanceof Mark) { m.buildMask(); m.paint(); } };
    return MARK_IMG;
  };
  class Mark extends Motif {
    static defaults = { ink: 'deep', mini: false };
    static avoid = HERO_AVOID;
    init() { markImg(); this.calmAt = 0; if (!this.mini) this.listenPointer(this.host(), false, (e, x, y) => this.poke(x, y)); }
    lines() { return this.mini ? 12 : 28; }
    geom() {
      const W = this.W, H = this.H, ph = isPhone(W);
      if (this.mini) return { cx: .5 * W, cy: .5 * H, h: .78 * H, top: .08 * H, bot: .94 * H };
      return { cx: (ph ? .5 : RTL ? .30 : .70) * W, cy: (ph ? .36 : .56) * H, h: (ph ? .38 : .72) * H, top: .16 * H, bot: .97 * H }; // phones: above the words (spec deviation)
    }
    resize(r) { super.resize(r); this.S = round(clamp(this.W / 7, 40, 200)); this.ys = Array.from({ length: this.lines() }, () => new Float32Array(this.S + 1)); this.buildMask(); }
    refresh() { this.resize(); this.paint(); }
    buildMask() {
      const img = MARK_IMG, N = this.lines(), S = this.S; this.inside = null;
      if (!img || !img.complete || !img.naturalWidth || !this.W || !this.H) return;
      const g = this.geom(), mh = g.h, mw = mh * img.naturalWidth / img.naturalHeight, Hc = max(1, round(this.H)), k = S / this.W;
      const oc = D.createElement('canvas'); oc.width = S + 1; oc.height = Hc;
      const x = oc.getContext('2d', { willReadFrequently: true }); x.drawImage(img, (g.cx - mw / 2) * k, g.cy - mh / 2, mw * k, mh);
      const data = x.getImageData(0, 0, S + 1, Hc).data, raw = new Uint8Array(N * (S + 1)), gap = (g.bot - g.top) / (N - 1);
      this.box = [g.cx - mw / 2, g.cy - mh / 2, mw, mh];
      for (let i = 0; i < N; i++) { const row = clamp(round(g.top + i * gap), 0, Hc - 1); for (let s = 0; s <= S; s++) raw[i * (S + 1) + s] = data[(row * (S + 1) + s) * 4 + 3] > 128 ? 1 : 0; }
      const ins = new Float32Array(N * (S + 1));
      for (let i = 0; i < N; i++) for (let s = 0; s <= S; s++) { let a = 0, n = 0; for (let j = -3; j <= 3; j++) { const q = s + j; if (q < 0 || q > S) continue; a += raw[i * (S + 1) + q]; n++; } ins[i * (S + 1) + s] = a / n; }
      this.inside = ins; oc.width = oc.height = 0;
      // the hatch: calm lines at a quarter of the water's spacing, cut to the monogram (built once per resize/colour)
      const d = this.dpr, hc = this.hatch || (this.hatch = D.createElement('canvas')), bw = max(1, round(mw * d)), bh = max(1, round(mh * d));
      hc.width = bw; hc.height = bh; const h = hc.getContext('2d'), sp = max(3, gap / (this.mini ? 3 : 4)), lw = this.mini ? max(1.2, sp * .42) : max(2.2, sp * .42);
      h.setTransform(d, 0, 0, d, 0, 0); h.fillStyle = this.col();
      const y0 = g.top - (g.cy - mh / 2); for (let y = y0 - Math.ceil(y0 / sp) * sp; y < mh; y += sp) h.fillRect(0, y - lw / 2, mw, lw);
      h.setTransform(1, 0, 0, 1, 0, 0); h.globalCompositeOperation = 'destination-in'; h.drawImage(img, 0, 0, bw, bh); h.globalCompositeOperation = 'source-over';
    }
    canvases() { return this.hatch ? [this.cv, this.hatch] : [this.cv]; }
    poke(x, y) { const b = this.box; if (!b || REDUCE) return; if (x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]) { this.calmAt = now(); kick(); } }
    surge() { if (!REDUCE) { this.calmAt = now(); kick(); } }
    calm() {
      if (REDUCE) return 1; const n = now();
      const intro = this.mini ? 1 : this.seen ? easeOut((n - this.seen) / 1600) : 0;
      const poke = this.calmAt ? lerp(.3, 1, easeOut((n - this.calmAt) / 900)) : 1;
      return min(intro, poke);
    }
    draw(t) {
      const c = this.ctx; if (!c) return; const g = this.geom(), N = this.lines(), S = this.S, W = this.W, ins = this.inside, calmIn = this.calm();
      const sc = clamp(W / 1400, .5, 1.1), gap = (g.bot - g.top) / (N - 1), amp = (this.mini ? 7 : 18) * sc;
      for (let i = 0; i < N; i++) {
        const base = g.top + i * gap, e = .35 + .65 * pow(clamp(1 - i / ((N - 1) * 1.15), 0, 1), 1.2), ys = this.ys[i], prev = i ? this.ys[i - 1] : null;
        for (let s = 0; s <= S; s++) {
          const w = ins ? ins[i * (S + 1) + s] : 0; let y = base - amp * e * SW(s / S + i * .006, t - i * .05) * (1 - w * calmIn);
          if (prev && y < prev[s] + 1.2) y = prev[s] + 1.2; ys[s] = y;
        }
      }
      this.begin(); const ink = this.col(); c.strokeStyle = ink; c.lineJoin = 'round';
      this.keepOut(); c.globalAlpha = .38; c.lineWidth = 1; c.lineCap = 'round'; c.beginPath();
      for (let i = 0; i < N; i++) { const ys = this.ys[i]; for (let s = 0; s <= S; s++) { const x = s / S * W; s ? c.lineTo(x, ys[s]) : c.moveTo(x, ys[s]); } }
      c.stroke(); c.restore(); this.feather();
      if (!ins || !this.hatch || !this.box) { c.globalAlpha = 1; return; }
      // the heavy lines: calm, dense, only inside the M; they come in as the water calms
      const b = this.box; c.globalAlpha = .25 + .75 * calmIn; c.drawImage(this.hatch, b[0], b[1], b[2], b[3]); c.globalAlpha = 1;
    }
    still() { this.draw(2.4); }
  }

  /* ================= reel: a contact sheet of film frames (Content) ================= */
  const MARKS = {
    loop: { vb: '0 0 120 100', d: 'M12,58 C10,30 40,14 70,18 C100,22 112,44 104,64 C96,84 58,90 32,80 C18,74 12,64 16,52', style: 'left:20%;top:22%;width:60%;height:68%' },
    tick: { vb: '0 0 120 100', d: 'M26,56 C32,62 38,70 46,80 C58,58 76,36 100,18', style: 'right:8%;bottom:10%;width:34%;height:44%' },
  };
  // a full-reel frame is 16:9 at --fh = clamp(120px, 18vw, 260px): 213px…462px wide
  const REEL_SIZES = '(min-width:1444px) 462px, (min-width:666px) 32vw, 213px';
  class Reel extends Motif {
    static defaults = { mini: false, speed: 30 };
    get animated() { return !this.mini && !REDUCE; }
    init() {
      const el = this.el; el.classList.add('reel'); if (this.mini) el.classList.add('mini');
      this.frames = String(el.dataset.frames || (this.mini ? '49,105,217' : '9,25,49,65,81,97,113,145,161,193,217,241')).split(',').map(s => parseInt(s, 10)).filter(n => n > 0);
      this.marks = Object.fromEntries(String(el.dataset.marks || '').split(',').map(s => s.split(':')).filter(a => a.length === 2).map(([n, k]) => [parseInt(n, 10), k.trim()]));
      this.x = 0; this.v = this.o.speed; this.hover = false;
      const on = () => { if (!COARSE) this.hover = true; }, off = () => { this.hover = false; };
      el.addEventListener('pointerenter', on, { passive: true }); el.addEventListener('pointerleave', off, { passive: true });
      this._off.push(() => { el.removeEventListener('pointerenter', on); el.removeEventListener('pointerleave', off); });
      this.build();
    }
    build() {
      // the full reel on a fine pointer carries a 960w source for 2x screens (a frame is up to 462px wide); minis and
      // touch screens stay on the 480w thumbnails, which keeps phone memory in budget
      const hi = !this.mini && !COARSE;
      const one = this.frames.map(n => {
        const k = this.marks[n], m = k && MARKS[k], id = String(n).padStart(4, '0');
        const set = hi ? ` srcset="${asset(`film/t/f${id}.webp`)} 480w, ${asset(`film/t/f${id}-960.webp`)} 960w" sizes="${REEL_SIZES}"` : '';
        return `<figure class="reel-f"><img src="${asset(`film/t/f${id}.webp`)}"${set} width="480" height="270" loading="lazy" decoding="async" alt="">` +
          (m ? `<svg class="reel-mark m-${k}" viewBox="${m.vb}" preserveAspectRatio="none" style="${m.style}" aria-hidden="true"><path pathLength="1" d="${m.d}"/></svg>` : '') +
          `<figcaption class="data">F${String(n).padStart(3, '0')}</figcaption></figure>`;
      }).join('');
      const twice = !this.mini && !REDUCE;
      this.el.classList.toggle('is-still', !twice);
      this.el.innerHTML = `<div class="reel-track">${one}${twice ? one : ''}</div>`;
      this.track = this.el.firstElementChild; this.twice = twice;
      // grease-pencil marks draw on once, the first time their frame crosses the middle third of the screen
      this.markIO?.disconnect();
      const marks = [...this.el.querySelectorAll('.reel-mark')];
      if (REDUCE || !hasIO) marks.forEach(s => s.classList.add('on'));
      else { this.markIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.closest('.reel-f')?.querySelector('.reel-mark')?.classList.add('on'); this.markIO.unobserve(e.target); } }), { rootMargin: '0px -33% 0px -33%' }); marks.forEach(s => this.markIO.observe(s.parentElement)); }
      this._off.push(() => this.markIO?.disconnect());
      this.x = RTL ? -1 : 0;
    }
    resize() {
      const r = this.el.getBoundingClientRect(); this.W = r.width; this.H = r.height; this.half = this.track ? this.track.scrollWidth / 2 : 0;
      // grease pencil: 3px on screen whatever the frame size (the mark's viewBox is stretched to the frame)
      for (const s of this.el.querySelectorAll('.reel-mark')) { const b = s.getBoundingClientRect(), k = (b.width / 120 + b.height / 100) / 2; if (k > 0) s.style.strokeWidth = (3 / k).toFixed(2); }
    }
    refresh() { if (this.twice !== (!this.mini && !REDUCE)) this.build(); this.resize(); this.x = RTL ? -this.half : 0; this.paint(); }
    draw(t, dt, vel) {
      if (!this.track || !this.half || !this.twice) { if (this.track) this.track.style.transform = ''; return; }
      const target = (this.hover ? 8 : this.o.speed) + min(240, (vel || 0) * .08); this.v += (target - this.v) * min(1, (dt || 0) * 4);
      if (RTL) { this.x += this.v * (dt || 0); if (this.x > 0) this.x -= this.half; if (this.x < -this.half) this.x = -this.half / 2; }
      else { this.x -= this.v * (dt || 0); if (this.x < -this.half) this.x += this.half; }
      this.track.style.transform = `translate3d(${this.x.toFixed(1)}px,0,0)`;
    }
    still() { if (this.track) this.track.style.transform = ''; }
  }

  /* ================= rise: the route that climbs (Digital) ================= */
  class Rise extends Motif {
    static defaults = { ink: 'tide60', mini: false };
    static avoid = HERO_AVOID;
    init() { this.reached = [0, 0, 0]; if (!this.mini) this.listenPointer(this.host(), true); }
    resize(r) {
      super.resize(r); this.S = round(clamp(this.W / 7, 40, 200)); this.bg = bgOf(this.el.parentElement || this.el);
      this.ys = Array.from({ length: this.mini ? 9 : 16 }, () => new Float32Array(this.S + 1));
      const hero = this.el.closest('section, .hero') || this.el.parentElement; this.heroBottom = (hero ? hero.getBoundingClientRect().bottom : this.H) + scrollY;
      this.names = splitSel(this.el.dataset.labels).map(textOf);
    }
    refresh() { this.resize(); this.paint(); }
    tilt() {
      if (this.mini) return .8; if (REDUCE) return 1;
      const intro = this.seen ? easeOut((now() - this.seen) / 1200) : 0, prog = clamp(scrollY / max(1, this.heroBottom - innerHeight * .5), 0, 1);
      // the intro alone reaches all three stops (.94 > the third marker's .907); scrolling the hero finishes the climb
      return clamp(.94 * intro + .06 * prog, 0, 1);
    }
    draw(t) {
      const c = this.ctx; if (!c) return; const W = this.W, H = this.H, S = this.S, N = this.ys.length, tilt = this.tilt(), ph = isPhone(W);
      // the field always leans a little (the climb reads in the first frame); the route's progress is `tilt` itself
      const lean = this.mini ? tilt : .25 + .75 * tilt, rise = H * (this.mini ? .32 : .28);
      // the climb is a curve (flat on the left, lifting to the right, like growth breaking); the water opens up with depth
      // and the lower lines carry more swell, so under the route it is visibly sea, not ruled paper
      const top = H * (this.mini ? .34 : .36), bot = H * (this.mini ? 1.32 : 1.12), gap = (bot - top) / (N - 1), amp = ((this.mini ? 6 : 13) * (1 - .45 * lean) + 8 * abs(this.bump())) * clamp(W / 1200, .6, 1.1);
      for (let i = 0; i < N; i++) {
        const q = i / (N - 1), base = top + gap * (.7 * i + .3 * i * (i - 1) / max(1, N - 1)), e = .55 + 1.05 * q, ys = this.ys[i], prev = i ? this.ys[i - 1] : null;
        for (let s = 0; s <= S; s++) { const u = s / S; let y = base - lean * rise * pow(u, 1.6) - amp * e * SW(u + i * .006, t - i * .05); if (prev && y < prev[s] + 1.2) y = prev[s] + 1.2; ys[s] = y; }
      }
      this.begin(true); const ink = this.col();
      // the route and its three stops, placed before the water is drawn so the lines can break around the labels
      const y0 = this.ys[0], at = u => y0[round(clamp(u, 0, 1) * S)], s0 = round(.08 * S), s1 = round(.94 * S);
      const p = this.mini ? 1 : tilt, reach = .08 + (.94 - .08) * p, D3 = [.28, .56, .86], tNow = now(), sz = ph ? 13 : 15, labs = [];
      D3.forEach((u, i) => {
        const on = u <= reach + 1e-3; if (on && !this.reached[i]) this.reached[i] = tNow; if (!on) this.reached[i] = 0; if (!on || this.mini) return;
        // the label stands 14px over its stop and ends just short of it, on the downhill side: the route climbs away
        // from it, so neither the Flare line nor its ticks run through the words
        const alpha = REDUCE ? 1 : clamp((reach - u) / .02, 0, 1), L = alpha > .02 && this.labelAt(this.names[i], u * W, at(u), { size: sz, up: 14, after: -6, align: RTL ? 'left' : 'right', pad: 6 });
        if (L) labs.push({ txt: this.names[i], at: L, alpha });
      });
      this.keepOut(labs.map(l => l.at.box));
      c.strokeStyle = ink; c.globalAlpha = this.mini ? .55 : .78; c.lineWidth = this.mini ? 1.1 : 1.25; c.lineJoin = 'round'; c.beginPath();
      for (let i = 1; i < N; i++) { const ys = this.ys[i]; for (let s = 0; s <= S; s++) { const x = s / S * W; s ? c.lineTo(x, ys[s]) : c.moveTo(x, ys[s]); } }
      c.stroke(); c.globalAlpha = this.mini ? .55 : .9; c.beginPath(); for (let s = 0; s <= S; s++) { const x = s / S * W; s ? c.lineTo(x, y0[s]) : c.moveTo(x, y0[s]); } c.stroke();
      c.restore(); this.feather(); c.globalAlpha = 1;
      // the route: the top line redrawn from x .08 to .94, up to `tilt`
      const pts = []; for (let s = s0; s <= s1; s++) pts.push([s / S * W, y0[s]]);
      draw.dashed(c, pts, { color: C.flare, width: 2, progress: p });
      this.keepOut(labs.map(l => l.at.box)); c.strokeStyle = C.shore; c.globalAlpha = .5; c.lineWidth = 1; c.beginPath();
      for (let k = 0; k < 12; k++) { const u = .08 + (.94 - .08) * (k + .5) / 12; if (u > reach) break; const x = u * W, y = at(u); c.moveTo(x, y + 3); c.lineTo(x, y + 11); }
      c.stroke(); c.restore(); c.globalAlpha = 1;
      if (this.pin && !this.mini && !REDUCE) { const u = clamp(this.px / W, .08, .94), x = u * W, y = at(u); this.keepOut(); c.strokeStyle = C.flare; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x, H); c.stroke(); c.restore(); draw.diamond(c, x, y, 6, C.shore); }
      D3.forEach((u, i) => { if (u <= reach + 1e-3) draw.diamond(c, u * W, at(u), this.mini ? 6 : 8, C.shore); });
      for (const l of labs) this.label(l.txt, 0, 0, { at: l.at, alpha: l.alpha, color: C.shore });
    }
    still() { this.draw(2.4); }
  }

  /* ================= horizon: the sun and the Lusail skyline (About; the poster and the home emblem use its parts) ================= */
  class Horizon extends Motif {
    static defaults = { ink: 'shore', horizon: .66, clock: true, lines: 7, water: 'tide60', sun: null, span: null, maxH: .22, sunR: .13 };
    init() {
      this.sunNow(); this.ys = null;
      if (this.o.clock) { this.timer = setInterval(() => { this.sunNow(); if (REDUCE || !this.visible) this.paint(); }, 60000); this._off.push(() => clearInterval(this.timer)); }
    }
    sunNow() { this.sun = this.o.sun ? { x: this.o.sun.x ?? .7, alt: this.o.sun.alt ?? .4, day: (this.o.sun.alt ?? .4) > -.15 } : this.o.clock ? sunAt(new Date()) : { x: .7, alt: .35, day: true }; }
    draw(t) {
      // the sun is the hero's image: at least 40px across the radius (sunR × the short side), never more than .3 of it
      const c = this.ctx; if (!c) return; const W = this.W, H = this.H, hy = round(H * this.o.horizon) + .5, s = this.sun, mn = min(W, H), r = min(mn * .3, max(40, (this.o.sunR ?? .13) * mn));
      this.begin(true);
      // the skyline runs to the viewport's edge by default (a true bleed, like the water lines); a span in data-opts still wins
      const night = s.alt < -.15, span = this.o.span || [.52, 1], rm = r * .8;
      // at night the moon keeps to the open sky: its crescent clears the first tower by at least its own radius
      // (on a phone, where the towers start at .3, that holds it near .14 of the width)
      const sx = night ? clamp(s.x * W, 1.4 * rm, span[0] * W - 2 * rm) : s.x * W;
      // the sun climbs through the whole sky (midday sits near the top), so it only meets the towers near sunrise and sunset
      if (night) draw.sun(c, { x: sx, y: hy - .5 * H * .4, r: rm, color: this.col(), moon: true });
      else draw.sun(c, { x: sx, y: hy - max(0, s.alt) * max(0, hy - r - 12) - min(0, s.alt) * r * 2.2, r, horizonY: hy, color: C.flare });
      // opaque towers: the sun goes behind them cleanly
      const sk = { x0: span[0] * W, x1: span[1] * W, baseY: hy, maxH: this.o.maxH * H, color: this.col(), alpha: 1 };
      draw.skyline(c, sk);
      // after dark Lusail keeps its Flare: a few lit windows inside the towers and a warning light on each spire
      if (night) this.lights(c, sk);
      // horizon hairline
      c.strokeStyle = this.col(this.o.water); c.globalAlpha = .6; c.lineWidth = 1; c.beginPath(); c.moveTo(0, hy); c.lineTo(W, hy); c.stroke(); c.globalAlpha = 1;
      const n = this.o.lines;
      this.ys = draw.lines(c, { x0: 0, x1: W, top: hy + 6, bottom: H - 4, n, amp: 4, t, calm: .9, ink: this.col(this.o.water), alpha: .6, width: 1, out: this.ys });
      // the sun's (or moon's) broken reflection on each water line
      const vis = night ? 1 : clamp((s.alt + .45) / .45, 0, 1); if (vis <= 0) return;
      const S = this.ys[0].length - 1; c.strokeStyle = night ? this.col() : C.flare; c.lineWidth = night ? 2 : 2.5; c.lineCap = 'butt'; c.globalAlpha = night ? .45 : vis;
      for (let i = 0; i < n; i++) {
        const half = (night ? rm : r) * (1 - i / n * .7), k = night ? 3 + (i % 3) : 4, seg = 2 * half / (k * 1.6 - .6), ys = this.ys[i];
        c.beginPath();
        for (let j = 0; j < k; j++) { const xa = sx - half + j * seg * 1.6 + (i % 2 ? seg * .3 : 0), xb = min(sx + half, xa + seg); if (xb <= xa) continue; c.moveTo(xa, ys[clamp(round(xa / W * S), 0, S)]); c.lineTo(xb, ys[clamp(round(xb / W * S), 0, S)]); }
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    /** lit windows (seeded, so the same towers are lit on every frame and in the still) and the spire lights */
    lights(c, o) {
      const span = o.x1 - o.x0, ph = isPhone(this.W), ww = ph ? 2 : 3, wh = ph ? 4 : 5, B = o.baseY;
      // tower index, then where in it (0…1 across, 0…1 up the lit part); 10 windows, none in the crescents or the dome
      const LIT = [[2, .3, .4], [5, .55, .6], [5, .25, .25], [7, .5, .5], [9, .7, .35], [11, .35, .7], [11, .65, .3], [13, .4, .55], [16, .45, .45], [18, .6, .3]];
      c.save(); c.fillStyle = C.flare; c.globalAlpha = .9;
      for (const [i, fu, fv] of LIT) {
        const T = SKYLINE[i]; if (!T) continue; const [fx, fw, fh, type] = T, w = fw * span, h = fh * o.maxH;
        if (w < ww + 4 || h < wh + 10) continue;
        // a step tower's lit floors are in its wide lower block; keep a floor's height clear of the roof and the street
        const top = type === 'step' ? h * .7 : h, x = round(o.x0 + fx * span + 2 + fu * (w - ww - 4)), y = round(B - 4 - wh - fv * (top - wh - 10));
        c.fillRect(x, y, ww, wh);
      }
      // a 3px warning light on each spire's antenna
      for (const [fx, fw, fh, type] of SKYLINE) if (type === 'spire') { const X = round(o.x0 + (fx + fw / 2) * span), h = fh * o.maxH; c.fillRect(X - 1, round(B - h * 1.25) - 2, 3, 3); }
      c.restore();
    }
    still() { this.draw(2.4); }
    refresh() { this.sunNow(); super.refresh(); }
  }

  /* ================= brief: the brief calms the sea (contact forms) ================= */
  class Brief extends Motif {
    static defaults = { ink: 'deep' };
    init() {
      this.fig = this.el.closest('.motif-brief') || this.el.parentElement;
      this.nameEl = this.fig?.querySelector('.brief-name'); this.mira = this.fig?.querySelector('.brief-mira');
      this.state = { c: 0, name: '', picks: [], sent: false, empty: '' }; this.cur = { c: 0 }; this.ys = null; this.setName();
    }
    /** { c: 0…1, name, picks: ['strategy', …], sent, empty } — any subset */
    set(v = {}) {
      const s = this.state;
      if (typeof v.c === 'number' && isFinite(v.c)) s.c = clamp(v.c, 0, 1);
      if (typeof v.name === 'string') s.name = v.name.trim().slice(0, 60);
      if (typeof v.empty === 'string') s.empty = v.empty;
      if (Array.isArray(v.picks)) s.picks = [...new Set(v.picks.filter(k => k in DISC))].slice(0, 4);
      if (typeof v.sent === 'boolean') s.sent = v.sent;
      if (REDUCE) this.cur.c = s.c;
      this.setName();
      if (this.mira) { if (s.sent) this.mira.hidden = false; setTimeout(() => this.fig?.classList.toggle('is-sent', s.sent), REDUCE ? 0 : 30); }
      this.paint(); kick();
    }
    setName() {
      if (!this.nameEl) return; const s = this.state, empty = s.empty || textOf('[data-i18n="bp.empty"]') || (html.lang === 'ar' ? 'طلبك' : 'Your brief'), txt = s.name || empty;
      if (this.nameEl.textContent !== txt) this.nameEl.textContent = txt;
      this.nameEl.classList.toggle('is-empty', !s.name); this.nameEl.classList.toggle('ar', AR_RE.test(txt));
    }
    refresh() { this.setName(); super.refresh(); }
    draw(t, dt) {
      const c = this.ctx; if (!c) return; const W = this.W, H = this.H, s = this.state;
      if (!REDUCE) this.cur.c += (s.c - this.cur.c) * (1 - exp(-(dt || 0) * 7)); else this.cur.c = s.c;
      if (!dt && !REDUCE && abs(this.cur.c - s.c) > .001 && !this.visible) this.cur.c = s.c;
      const k = this.cur.c, sc = clamp(W / 380, .5, 1.2), hy = round(H * .56) + .5, sand = H * .86, deep = this.col('deep'), n = 9;
      this.begin(true);
      // a composed poster from the first frame: the sun already stands half over the horizon with its reflection and
      // the towers carry the left of the sky. The sky holds the brief's progress: a dotted Flare course climbs from the
      // sun to a diamond high on the right, and the sun rises along it as the brief fills (the course behind it is spent)
      // the course ends with the sun's top a little under the poster's title (the visitor's name may run to two lines)
      const nb = this.nameEl ? this.nameEl.offsetTop + this.nameEl.offsetHeight : 70, r = .12 * W, P0 = [.7 * W, hy - .16 * r];
      const P2 = [.8 * W, clamp(nb + r + 16, H * .2, hy - 2.2 * r)], P1 = [.7 * W, lerp(P0[1], P2[1], .6)];
      const bez = (u, i) => (1 - u) * (1 - u) * P0[i] + 2 * u * (1 - u) * P1[i] + u * u * P2[i], kk = k;
      const sx = bez(kk, 0), sy = bez(kk, 1), alt = .1 + .9 * k;
      if (k < .985) {
        const pts = []; for (let i = 0; i <= 24; i++) { const u = kk + (1 - kk) * i / 24; pts.push([bez(u, 0), bez(u, 1)]); }
        draw.dashed(c, pts, { color: C.flare, width: 2, dash: [2, 8] });
        draw.diamond(c, P2[0], P2[1], 9, deep);
      }
      draw.sun(c, { x: sx, y: sy, r, horizonY: hy, color: C.flare });
      draw.skyline(c, { x0: .06 * W, x1: .62 * W, baseY: hy, maxH: .3 * H, color: deep, alpha: 1 });
      c.strokeStyle = deep; c.globalAlpha = .8; c.lineWidth = 1; c.beginPath(); c.moveTo(0, hy); c.lineTo(W, hy); c.stroke(); c.globalAlpha = 1;
      // the far water is the calmest and the swell builds toward the viewer; no line ever rises over the horizon or sinks into the sand
      const amp = (3 + 18 * (1 - k)) * sc, ys = this.ys = draw.lines(null, { x0: 0, x1: W, top: hy + 7, bottom: sand - 8 - amp * .7, n, amp, t, grow: .15, out: this.ys }), S = ys[0].length - 1;
      for (let i = 0; i < n; i++) { const lo = hy + 3 + i * 1.6, hi = sand - 3 - (n - 1 - i) * 1.6, a = ys[i]; for (let j = 0; j <= S; j++) a[j] = clamp(a[j], lo, hi); }
      const line = i => { const a = ys[i]; c.beginPath(); for (let j = 0; j <= S; j++) { const x = j / S * W; j ? c.lineTo(x, a[j]) : c.moveTo(x, a[j]); } c.stroke(); };
      // lines 1/3/5/7 are the brief's four slots (strategy, branding, content, digital): dotted until picked,
      // then solid in that discipline's colour
      const SLOT = { 1: 'strategy', 3: 'branding', 5: 'content', 7: 'digital' };
      c.lineJoin = 'round'; c.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const d = SLOT[i];
        if (!d) { c.strokeStyle = deep; c.globalAlpha = .8; c.lineWidth = 1.3; c.setLineDash([]); }
        else if (s.picks.includes(d)) { c.strokeStyle = C[DISC[d]]; c.globalAlpha = 1; c.lineWidth = 2; c.setLineDash([]); }
        else { c.strokeStyle = C.tide60; c.globalAlpha = 1; c.lineWidth = 1; c.setLineDash([2, 6]); c.lineCap = 'butt'; }
        line(i); c.lineCap = 'round';
      }
      c.setLineDash([]); c.globalAlpha = 1;
      // the sand's edge, and two short ripple marks on the wet sand
      c.strokeStyle = deep; c.lineWidth = 1; c.beginPath(); c.moveTo(0, round(sand) + .5); c.lineTo(W, round(sand) + .5); c.stroke();
      c.globalAlpha = .35; c.beginPath();
      for (const [fx, fy, fw] of [[.14, .35, .16], [.52, .62, .12]]) { const x0 = fx * W, y = sand + (H - sand) * fy, w = fw * W; c.moveTo(x0, y); c.quadraticCurveTo(x0 + w * .25, y - 3, x0 + w * .5, y); c.quadraticCurveTo(x0 + w * .75, y + 3, x0 + w, y); }
      c.stroke(); c.globalAlpha = 1;
      // the sun's broken reflection, Flare dashes under it on the upper water lines
      const vis = clamp((alt + .55) / .45, 0, 1);
      if (vis > 0) {
        c.strokeStyle = C.flare; c.lineWidth = 2; c.globalAlpha = vis; c.lineCap = 'butt';
        for (let i = 0; i < 6; i++) { const a = ys[i], half = r * (1 - i / 9 * .7) * .9; for (let j = 0; j < 3; j++) { const xa = sx - half + j * half * .72 + (i % 2) * 4, xb = xa + half * .42; c.beginPath(); c.moveTo(xa, a[clamp(round(xa / W * S), 0, S)]); c.lineTo(xb, a[clamp(round(xb / W * S), 0, S)]); c.stroke(); } }
        c.globalAlpha = 1;
      }
    }
    still() { this.draw(2.4, 0); }
  }

  /* ================= wavetext: words riding a live wave (titles, the About marquee, the name demo) ================= */
  const SEG = 60;
  class WaveText extends Motif {
    static defaults = { marquee: false, speed: 40, amp: .12, lambda: .6 };
    init() {
      const svg = this.el, id = 'mwp' + this.id; sprite();
      svg.classList.add('wave-title'); if (this.o.marquee) svg.classList.add('is-marquee');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = `<path id="${id}" fill="none"/><text class="echo"><textPath href="#${id}"></textPath></text><text class="main"><textPath href="#${id}"></textPath></text>`;
      this.path = svg.querySelector('path'); [this.echoTP, this.mainTP] = svg.querySelectorAll('textPath'); this.mainT = this.mainTP.parentNode; this.echoT = this.echoTP.parentNode;
      if (!this.o.marquee) this.end = endMark(svg);
      const ds = svg.dataset.src, nx = svg.nextElementSibling;
      this.src = ds ? (() => { try { return D.querySelector(ds); } catch (e) { return null; } })() : nx && nx.classList.contains('wave-src') ? nx : null;
      this.xs = new Float32Array(SEG + 1); this.yv = new Float32Array(SEG + 1); this.L = new Float32Array(SEG + 1);
      this.off = 0; this.fs = 0; this.wl = 0; this.items = this.items || [];
      this.fill();
      (D.fonts?.ready || Promise.resolve()).then(() => { if (this.dead) return; this.fill(); this.paint(); });
    }
    get text() { return (this.override ?? (this.src ? this.src.textContent : this.el.dataset.word || '')).replace(/\s+/g, ' ').trim(); }
    /** set the words directly (the Branding name demo); null goes back to the source element */
    setText(s) { this.override = s == null ? null : String(s); this.fill(); this.paint(); }
    /** marquee items: [{ text, lang }] */
    setItems(items) { this.items = (Array.isArray(items) ? items : []).filter(x => x && x.text).map(x => ({ text: String(x.text), lang: x.lang === 'ar' || AR_RE.test(x.text) ? 'ar' : 'en' })); if (this.mainTP) { this.fill(); this.paint(); } }
    fill() {
      if (!this.mainTP) return;
      if (this.o.marquee) return this.fillMarquee();
      const txt = this.text; this.ar = AR_RE.test(txt); this.el.dataset.script = this.ar ? 'ar' : 'latin';
      this.mainTP.textContent = txt; this.echoTP.textContent = txt; this.fit();
      // a page that gives the title a paint-order halo gets no echo: one offset layer only (.has-halo can also be set by hand)
      try { const cs = getComputedStyle(this.mainT); if (/^stroke/.test(cs.paintOrder || '') && cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0) this.el.classList.add('has-halo'); } catch (e) {}
    }
    fit() {
      if (this.o.marquee || !this.mainT.getComputedTextLength) return;
      const W = this.el.getBoundingClientRect().width; if (!W) return;
      for (const n of [this.mainT, this.echoT]) n.style.fontSize = '';
      const fs0 = parseFloat(getComputedStyle(this.mainT).fontSize) || 100; let wl = this.mainT.getComputedTextLength(), fs = fs0;
      // the words and the end mark (.45em with its gap) fit in 94% of the width
      const ew = this.end ? .45 : 0;
      if (wl + ew * fs0 > W * .94) { fs = W * .94 / (wl / fs0 + ew); if (isPhone(innerWidth)) fs = max(fs, min(fs0, innerWidth * (this.ar ? .12 : .16))); }
      // on a phone a page's hero word is the hero, not a caption under the drawing: a short word grows until the word
      // and its crest fill about 85% of the column (at most 1.4x, and 104px Latin / 76px Arabic); long words keep the
      // size above. The svg's own height grows with it in motifs.css (.hero > svg.wave-title)
      else if (isPhone(innerWidth) && this.el.parentElement && this.el.parentElement.matches('.hero')) {
        const k = min(1.4, W * .85 / (wl + ew * fs0)), cap = this.ar ? 76 : 104;
        if (k > 1.02 && fs0 < cap) fs = min(fs0 * k, cap);
      }
      if (fs !== fs0) { for (const n of [this.mainT, this.echoT]) n.style.fontSize = fs.toFixed(1) + 'px'; wl = this.mainT.getComputedTextLength(); }
      this.fs = fs; this.wl = wl; this.over = max(0, wl + fs * .5 - W);
    }
    fillMarquee() {
      const one = this.items.map(it => `<tspan class="it"${it.lang === 'ar' ? ' lang="ar"' : ''}>${esc(it.text)}</tspan><tspan class="sep"> ~ </tspan>`).join('');
      this.echoTP.textContent = '';
      if (!one) { this.mainTP.innerHTML = ''; this.period = 0; return; }
      this.mainTP.innerHTML = one; this.period = this.mainT.getComputedTextLength() || 0;
      const W = this.el.getBoundingClientRect().width || innerWidth, need = W * 1.9;
      const reps = this.period ? clamp(Math.ceil(need / this.period) + 1, 2, 12) : 2;
      this.mainTP.innerHTML = one.repeat(reps);
      this.off = RTL ? -this.period : 0;
    }
    resize() { const r = this.el.getBoundingClientRect(); this.W = r.width; this.H = r.height; this.fill(); }
    refresh() { this.resize(); this.paint(); }
    build(amp, lam, ph) {
      const W = this.W, H = this.H, x0 = -W * .3, x1 = W * 1.3, base = H * (this.o.marquee ? .66 : .72), xs = this.xs, yv = this.yv, L = this.L; let d = '';
      for (let k = 0; k <= SEG; k++) {
        const x = x0 + (x1 - x0) * k / SEG, y = base + amp * sin(x / lam * TAU + ph); xs[k] = x; yv[k] = y;
        L[k] = k ? L[k - 1] + hypot(x - xs[k - 1], y - yv[k - 1]) : 0; d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      setAttr(this.path, 'd', d);
    }
    /** the box's top: the sweep's read, moved by the scroll since then (a scroll moves every box alike), so a frame reads no layout;
     *  a box the sweep has not read yet is read here */
    boxTop() { const b = this._box; return b ? b.top - (scrollY - b.sy) : this.el.getBoundingClientRect().top; }
    arcAt(x) { const xs = this.xs, k = clamp(Math.floor((x - xs[0]) / (xs[1] - xs[0])), 0, SEG - 1), f = (x - xs[k]) / (xs[k + 1] - xs[k]); return this.L[k] + (this.L[k + 1] - this.L[k]) * f; }
    pointAt(len) {
      const L = this.L; let k = 0; while (k < SEG - 1 && L[k + 1] < len) k++;
      const f = clamp((len - L[k]) / max(1e-3, L[k + 1] - L[k]), 0, 1.5), x = this.xs[k] + (this.xs[k + 1] - this.xs[k]) * f, y = this.yv[k] + (this.yv[k + 1] - this.yv[k]) * f;
      return [x, y, atan2(this.yv[k + 1] - this.yv[k], this.xs[k + 1] - this.xs[k])];
    }
    draw(t, dt, vel) {
      if (!this.W || !this.H) return; const W = this.W, H = this.H, still = REDUCE, v = vel || 0;
      // an ambient swell (no input for 1.5s) steps at 30fps; the time skipped is carried into the next step, so the motion keeps its speed
      const n = now();
      if (!still && n >= kickUntil && n - (this._drawAt || -1e9) < 1000 / 30 - 2) { this._skipDt = (this._skipDt || 0) + (dt || 0); return; }
      dt = (dt || 0) + (this._skipDt || 0); this._skipDt = 0; this._drawAt = n;
      if (this.o.marquee) {
        this.build(still ? 0 : H * this.o.amp, W * this.o.lambda, still ? 0 : t * .25);
        if (this.period) {
          if (!still) { const s = (this.o.speed + v * .15) * (dt || 0); if (RTL) { this.off += s; if (this.off > 0) this.off -= this.period; } else { this.off -= s; if (this.off < -this.period) this.off += this.period; } }
          setAttr(this.mainTP, 'startOffset', this.off.toFixed(1));
        }
        return;
      }
      if (!this.fs) this.fit();
      // a slow swell, not a twitch: scroll speed is eased (about a second to rise and settle) and only nudges the height;
      // the phase moves with time alone, roughly one swell every 18s
      const k = 1 - Math.exp(-(dt || .016) * 1.2); this.vs = (this.vs || 0) + (min(v, 2400) - (this.vs || 0)) * k;
      this.ph = (this.ph || 0) + (still ? 0 : (dt || .016) * .35);
      this.build(still ? 0 : H * .06 + min(16, this.vs * .008), W * 1.1, this.ph);
      const top = this.boxTop(), drift = still ? 0 : clamp(-top / innerHeight, -.3, 1) * (this.over + W * .25);
      const room = this.fs * .5, left = RTL ? W - this.wl - W * .02 + drift - (this.ar ? 0 : room) : (this.ar ? room : 0) - drift;
      const so = this.arcAt(left);
      setAttr(this.mainTP, 'startOffset', so.toFixed(1));
      // the echo's offset scales with the type, so a phone-size title never reads as a doubled last letter
      const fs = this.fs || 100;
      setAttr(this.echoTP, 'startOffset', (so + (still ? 0 : fs * .06 + min(fs * .12, this.vs * .012))).toFixed(1));
      if (this.end) {
        // a small crest seated at mid x-height, .04em after the last letter; in Arabic the same gap to the left of the
        // word's end (the mirrored crest extends leftwards from its foot, so it reads as the word's last stroke, not a stray)
        const s = .17 * fs * 16 / 9, lift = .2 * fs;
        if (this.ar) { const [x, y, a] = this.pointAt(max(0, so - .06 * fs)); placeCurl(this.end, x, y, a, s, true, lift); }
        else { const [x, y, a] = this.pointAt(so + this.wl + .04 * fs); placeCurl(this.end, x, y, a, s, false, lift); }
      }
    }
    still() { this.draw(0, 0, 0); }
  }

  /* ================= typetide: type cut by water lines (the home poster band) ================= */
  class TypeTide extends Motif {
    init() { this.lines = [...this.el.querySelectorAll('.tt-line')]; this.cv = this.el.querySelector('canvas.tt-cv'); this.ctx = this.cv ? this.cv.getContext('2d') : null; this.cut = []; }
    canvases() { return this.cv ? [this.cv] : []; }
    resize() {
      const r = this.el.getBoundingClientRect(); this.W = r.width; this.H = r.height; if (this.cv) this.dpr = fitCanvas(this.cv, r.width, r.height);
      this.sec = this.el.closest('section') || this.el; this.bg = bgOf(this.el);
      this.box = this.lines.filter(l => l.offsetParent !== null).map(l => ({ l, top: l.offsetTop, h: l.offsetHeight, w: l.scrollWidth, ar: l.classList.contains('tt-ar') }));
      const vw = innerWidth / 100;
      for (const b of this.box) { const ov = b.w - this.W; b.from = b.ar ? -(ov + 8 * vw) : 8 * vw; b.to = b.ar ? 8 * vw : -(ov + 8 * vw); if (ov < 0) { b.from = b.ar ? -8 * vw : 8 * vw; b.to = b.ar ? ov + 8 * vw : ov - 8 * vw; } }
      this.cut = this.box.map(b => ({ out: null }));
    }
    refresh() { this.resize(); this.paint(); }
    slide() {
      if (REDUCE) { for (const b of this.box) b.l.style.transform = ''; return; }
      const r = this.sec.getBoundingClientRect(), vh = innerHeight, p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      for (const b of this.box) b.l.style.transform = `translate3d(${lerp(b.from, b.to, p).toFixed(1)}px,0,0)`;
    }
    draw(t) {
      this.slide(); const c = this.ctx; if (!c) return; this.begin();
      const deep = C.deep;
      this.box.forEach((b, i) => {
        const y0 = b.top + b.h * .56, y1 = b.top + b.h * .98, n = max(2, round((y1 - y0) / 7) + 1);
        this.cut[i].out = draw.lines(c, { x0: 0, x1: this.W, top: y0, bottom: y0 + (n - 1) * 7, n, amp: 6, t: t + i * 3, calm: 1.6, ink: this.bg, alpha: 1, width: 2.4, minGap: 2.4, out: this.cut[i].out });
        const next = this.box[i + 1], room = next ? next.top - (b.top + b.h) : this.H - (b.top + b.h), g = clamp(room / 5, 5, 14);
        this.cut[i].sea = draw.lines(c, { x0: 0, x1: this.W, top: b.top + b.h + g * .6, bottom: b.top + b.h + g * 3.6, n: 4, amp: 6, t: t + i * 3 + .3, calm: 1.4, ink: deep, alpha: .45, width: 1, out: this.cut[i].sea });
      });
    }
    still() { this.draw(2.4); }
  }

  /* ================= storyboard: the process in four film frames (About) ================= */
  class Storyboard extends Motif {
    init() {
      this.items = [...this.el.querySelectorAll('.sb-list > li')];
      this.svg = D.createElementNS(NS, 'svg'); this.svg.setAttribute('class', 'sb-wave'); this.svg.setAttribute('aria-hidden', 'true');
      const id = 'msb' + this.id;
      this.pid = id; this.svg.innerHTML = `<path id="${id}" fill="none"/>`;
      this.el.append(this.svg); this.path = this.svg.firstChild; this.words = [];
      this.xs = new Float32Array(SEG + 1); this.yv = new Float32Array(SEG + 1); this.L = new Float32Array(SEG + 1);
      this.readText(); this.sharpen();
    }
    /** the panels are ~20vw (78vw on phones): a film thumbnail without a srcset gets its 960w twin for 2x screens */
    sharpen() {
      for (const img of this.el.querySelectorAll('img:not([srcset])')) {
        const src = img.getAttribute('src') || '', m = src.match(/^(.*film\/t\/f\d{4})\.webp(\?.*)?$/); if (!m) continue;
        img.sizes = '(max-width:759px) 78vw, 22vw'; img.srcset = `${src} 480w, ${m[1]}-960.webp${m[2] || ''} 960w`;
      }
    }
    /** Latin words ride the wave on a textPath; Arabic words are set whole and turned to the wave's tangent instead,
        because a curved textPath places each Arabic glyph on its own and breaks the joins */
    readText() {
      this.items.forEach((li, i) => {
        const src = li.querySelector('[data-i18n^="hp."]:not(.sb-d), .sr-only'), txt = (src?.textContent || '').trim(), ar = AR_RE.test(txt);
        let w = this.words[i];
        if (!w || w.ar !== ar) {
          w?.t.remove(); const t = D.createElementNS(NS, 'text'); t.setAttribute('text-anchor', 'middle');
          let tp = null; if (ar) t.setAttribute('data-ar', ''); else { tp = D.createElementNS(NS, 'textPath'); tp.setAttribute('href', '#' + this.pid); tp.setAttribute('text-anchor', 'middle'); t.append(tp); }
          this.svg.append(t); w = this.words[i] = { t, tp, ar };
        }
        (w.tp || w.t).textContent = txt;
      });
    }
    resize() {
      const er = this.el.getBoundingClientRect(); this.W = er.width; this.H = er.height;
      const sl = this.el.scrollLeft || 0;
      this.pan = this.items.map(li => { const f = li.querySelector('figure') || li, r = f.getBoundingClientRect(); return { cx: r.left - er.left + sl + r.width / 2, top: r.top - er.top, l: r.left - er.left + sl, r: r.right - er.left + sl }; }).sort((a, b) => a.cx - b.cx);
      this.cxs = this.items.map(li => { const f = li.querySelector('figure') || li, r = f.getBoundingClientRect(); return r.left - er.left + sl + r.width / 2; });
      const sw = max(this.W, this.el.scrollWidth || 0); this.SW = sw;
      this.svg.setAttribute('width', sw); this.svg.setAttribute('height', max(1, this.H)); this.svg.style.width = sw + 'px'; this.svg.style.height = this.H + 'px';
    }
    refresh() { this.readText(); this.resize(); this.paint(); }
    baseAt(x) { const p = this.pan; if (!p.length) return 40; if (x <= p[0].cx) return p[0].top; for (let i = 1; i < p.length; i++) if (x <= p[i].cx) return lerp(p[i - 1].top, p[i].top, (x - p[i - 1].cx) / (p[i].cx - p[i - 1].cx)); return p[p.length - 1].top; }
    draw(t) {
      if (!this.pan || !this.pan.length) return; const x0 = -40, x1 = this.SW + 40, amp = REDUCE ? 0 : 7, xs = this.xs, yv = this.yv, L = this.L; let d = '';
      const lam = max(260, this.SW / 3);
      for (let k = 0; k <= SEG; k++) { const x = x0 + (x1 - x0) * k / SEG, y = this.baseAt(x) - 14 + amp * sin(x / lam * TAU + (REDUCE ? 0 : t * .6)); xs[k] = x; yv[k] = y; L[k] = k ? L[k - 1] + hypot(x - xs[k - 1], y - yv[k - 1]) : 0; d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      this.path.setAttribute('d', d);
      const arc = x => { const k = clamp(Math.floor((x - xs[0]) / (xs[1] - xs[0])), 0, SEG - 1), f = (x - xs[k]) / (xs[k + 1] - xs[k]); return L[k] + (L[k + 1] - L[k]) * f; };
      // each word sits over its own panel (DOM order), whichever side the panels flow from, on the paper above the
      // panel's top border (the wave never dips into the frame, so the words need no halo); Arabic rides 14px higher
      // still, because its dots and tails hang below the baseline
      (this.cxs || []).forEach((cx, i) => {
        const w = this.words[i]; if (!w) return;
        if (w.tp) { w.tp.setAttribute('startOffset', arc(cx).toFixed(1)); return; }
        // the wave at cx from the same formula as the path, not from the samples: in the RTL row a centre can sit left of the
        // first sample (x0), and interpolating there extrapolates off the curve (the label's glyphs crossed the frame's top)
        const wy = x => this.baseAt(x) - 14 + amp * sin(x / lam * TAU + (REDUCE ? 0 : t * .6));
        const y = wy(cx), a = atan2(wy(cx + 1) - wy(cx - 1), 2) * 180 / PI;
        w.t.setAttribute('transform', `translate(${cx.toFixed(1)} ${(y - 14).toFixed(1)}) rotate(${a.toFixed(2)})`);
      });
    }
    still() { this.draw(0); }
    destroy() { this.svg?.remove(); super.destroy(); }
  }

  /* ================= registry ================= */
  Object.assign(TYPES, { tide: Tide, chart: Chart, mark: Mark, reel: Reel, rise: Rise, horizon: Horizon, brief: Brief, wavetext: WaveText, typetide: TypeTide, storyboard: Storyboard });
  const typeOf = el => el.dataset.motif || (el.matches('canvas[data-tide]') ? 'tide' : el.matches('svg.wave-title') ? 'wavetext' : '');
  function mountOne(el) {
    if (MAP.has(el)) return MAP.get(el);
    const type = typeOf(el), Cls = TYPES[type]; if (!Cls) return null;
    try {
      const m = new Cls(el, type === 'tide' && el.dataset.tide && !el.dataset.motif ? json(el.dataset.tide) : {});
      attach(m); return m;
    } catch (e) { console.error('MOTIFS: could not mount', type, e); MAP.delete(el); return null; }
  }
  // ripples under Mira art: fill an empty <svg class="ripple"> and play its scale-in once, on first view
  const rippleIO = hasIO ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { if (!REDUCE) e.target.classList.add('in'); rippleIO.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' }) : null;
  function ripples(root) {
    root.querySelectorAll('svg.ripple:not([data-m])').forEach(svg => {
      svg.dataset.m = '1'; if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 220 32');
      if (!svg.querySelector('ellipse')) svg.innerHTML = '<ellipse cx="110" cy="16" rx="40" ry="6"/><ellipse cx="110" cy="16" rx="70" ry="10"/><ellipse cx="110" cy="16" rx="100" ry="14"/>';
      svg.setAttribute('aria-hidden', 'true'); rippleIO?.observe(svg);
    });
  }
  function mount(root = D) {
    const found = []; try { ripples(root); } catch (e) {} try { root.querySelectorAll('[data-motif], canvas[data-tide], svg.wave-title').forEach(el => { if (!MAP.has(el)) { const m = mountOne(el); if (m) found.push(m); } }); } catch (e) { console.error(e); }
    return found;
  }

  /* ================= the loop ================= */
  function kick() { const n = now(); lastInput = n; kickUntil = n + 1500; sweep(); if (idleT) { clearTimeout(idleT); idleT = 0; } schedule(); }
  // the loop has an end: after IDLE_STOP without input the motifs hold where they are, as on the home page (the 12fps idle
  // step runs from 6s until then). A kick (scroll, pointer, key, resize) starts it again at once
  const IDLE_STOP = 10000;
  function wanted() {
    if (paused || D.hidden) return false;
    if (now() < kickUntil) return true;
    if (REDUCE) return false;
    for (const s of SUBS) if (s.live && s.near) return true;
    if (now() - lastInput > IDLE_STOP) return false;
    for (const m of LIST) if (m.visible && !m.parked && m.animated && m.W) return true;
    return false;
  }
  // at rest (6s without input) the loop ticks from a 12fps timer instead of a 60Hz frame, so an idle page does no per-frame
  // work at all; a kick (scroll, pointer, key, resize) clears the timer and goes back to rAF at once
  let idleT = 0;
  function schedule() { if (MANUAL || raf || idleT || !wanted()) return; last = 0; raf = requestAnimationFrame(tick); }
  function tick(n) {
    raf = 0; step(n);
    if (!MANUAL && !paused && !D.hidden && n - lastInput > 6000 && wanted()) idleT = setTimeout(() => { idleT = 0; tick(now()); }, 1000 / 12 - 2);
    else schedule();
  }
  function step(n = now()) {
    if (paused || D.hidden) return;
    sweep();
    const dt = last ? clamp((n - last) / 1000, 0, .05) : 0; last = n;
    const sy = scrollY; if (dt > 0) VEL += (abs(sy - lastY) / dt - VEL) * .1; lastY = sy;
    const t = n / 1000, kicked = n < kickUntil;
    for (const s of SUBS) {
      if (!s.fn) continue;
      if (REDUCE && (!s.always || !kicked)) continue;
      if (s.el && !s.near) continue;
      try { s.fn(t, dt, VEL); } catch (e) { console.error('MOTIFS onFrame:', e); }
    }
    if (REDUCE) return;
    // idle: after 6s without input, ambient motion drops to 12fps
    if (n - lastInput > 6000 && lastDraw && n - lastDraw < 1000 / 12 - 2) return;
    const mdt = lastDraw ? clamp((n - lastDraw) / 1000, 0, .1) : dt; lastDraw = n;
    for (let i = 0; i < LIST.length; i++) {
      const m = LIST[i]; if (!m.visible || m.parked || !m.animated || !m.W) continue;
      m.t += mdt * m.speed;
      try { m.draw(m.t, mdt, VEL); } catch (e) { console.error('MOTIFS:', e); m.visible = false; }
    }
  }
  function onFrame(fn, o = {}) {
    // `fn` runs every frame; `o.rect(box)` instead hands a measured element its box from each sweep (no per-frame work)
    if (typeof fn !== 'function' && !(o.el && typeof o.rect === 'function')) return () => {};
    const s = { fn: typeof fn === 'function' ? fn : null, rect: typeof o.rect === 'function' ? o.rect : null, el: o.el || null, always: !!o.always, live: !!o.live, near: !o.el || !hasIO };
    SUBS.add(s); if (s.el && nearIO) nearIO.observe(s.el); kick();
    return () => { SUBS.delete(s); if (s.el && nearIO && ![...SUBS].some(x => x.el === s.el)) nearIO.unobserve(s.el); };
  }
  function pause(b) { paused = !!b; if (paused) { if (raf) cancelAnimationFrame(raf); raf = 0; if (idleT) clearTimeout(idleT); idleT = 0; } else { last = 0; kick(); } }
  let refreshedAs = '';
  const AFTER_REFRESH = new Set(); // things placed by direction or reduced motion that have no per-frame loop (the footer swap)
  // the colour tokens are read once at load, and again only when the admin's theme changes them (MOTIFS.readColors):
  // a refresh (language switch, font arrival) no longer forces a style read for six tokens each time
  function refresh() {
    RTL = html.dir === 'rtl'; refreshedAs = html.lang + '|' + html.dir;
    for (const f of AFTER_REFRESH) { try { f(); } catch (e) {} }
    // a parked motif (off screen, 1px canvas) is only marked: unpark() redraws it in full. Refreshing it here used to
    // grow every canvas on the page back to full size on each language switch or font load
    for (const m of LIST.slice()) { if (m.parked) { m._stale = true; continue; } try { m.refresh(); } catch (e) { console.error('MOTIFS refresh:', e); } }
    kick();
  }
  // webfont arrivals come in bursts and reflow the words the motifs measure: one refresh per frame covers them all
  let fontQ = 0;
  function refreshFonts() { if (fontQ) return; fontQ = requestAnimationFrame(() => { fontQ = 0; refresh(); }); }

  /* ================= the footer: the S sinks, Mira rises ================= */
  function footer(foot) {
    if (!foot || foot._motifs) return; foot._motifs = true;
    const drop = foot.querySelector('#mwDrop, .mw-drop'), mira = foot.querySelector('#footMira, .foot-mira'); if (!drop && !mira) return;
    let lastQ = -1, lastR = null, top = NaN, hgt = 1, gated = false, ro = null, gio = null, off = null;
    // The swap is placed from the footer's box in document coordinates, so a scroll is arithmetic (no layout read, no
    // per-frame work). Nothing reads the footer's box until it nears the viewport (the gate below): mount, load, the
    // first frames and the webfonts never measure it, so the footer forces no layout while the page loads. After the
    // gate the box is re-read when the page or the footer changes size, on resize/load/pageshow, and from every sweep.
    const measure = r => { r = r || foot.getBoundingClientRect(); top = r.top + scrollY; hgt = r.height; };
    const run = () => {
      if (!gated) return;
      if (top !== top) measure();
      const rt = top - scrollY, vh = innerHeight; if (rt >= vh) { if (lastQ !== 0 || lastR !== RTL) { lastQ = 0; lastR = RTL; apply(0); } return; }
      const q = clamp((vh - rt) / min(vh, hgt), 0, 1); if (q === lastQ && lastR === RTL) return; lastQ = q; lastR = RTL; apply(q);
    };
    const apply = q => {
      const out = REDUCE ? (q > .6 ? 1 : 0) : smooth(.35, .7, q), up = REDUCE ? out : smooth(.6, .9, q), dir = RTL ? -1 : 1;
      if (drop) { drop.style.transform = `translate(${(dir * out * 5).toFixed(2)}%,${(out * 45).toFixed(2)}%) rotate(${(dir * out * 22).toFixed(2)}deg)`; drop.style.opacity = (1 - out).toFixed(3); }
      if (mira) { mira.style.opacity = up.toFixed(3); mira.style.transform = `translateY(${((1 - up) * 30).toFixed(1)}%) scaleX(${RTL ? 1 : -1})`; }
    };
    // the swap never depends on the loop: scrolling, resizing, load, a restored page and a language or motion change
    // apply it directly (once the gate is open). Without ResizeObserver the box is simply read on each scroll, as before.
    const onScroll = () => { if (!gated) return; if (!ro) measure(); run(); };
    const onShow = () => { if (!gated) return; lastQ = -1; measure(); run(); };
    // the gate: the footer is about to enter the viewport (one viewport of margin, as the loop's own observer). The
    // observer reports after layout, so the one box read it leads to is free; opening it attaches the resize observer
    // and the loop's sweep, and places the swap for the box it has just read
    const open = () => {
      if (gated) return; gated = true;
      if (gio) { gio.disconnect(); gio = null; }
      if (hasRO) { ro = new ResizeObserver(onShow); ro.observe(foot); ro.observe(html); if (D.body) ro.observe(D.body); }
      lastQ = -1; measure(); run();
      off = onFrame(null, { el: foot, rect: r => { measure(r); run(); } });
    };
    gio = hasIO ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) open(); }, { rootMargin: '100% 0px' }) : null;
    if (gio) gio.observe(foot); else addEventListener('load', () => requestAnimationFrame(open), { once: true });
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onShow, { passive: true });
    addEventListener('load', onShow); addEventListener('pageshow', onShow); AFTER_REFRESH.add(onShow);
    return () => { off?.(); gio?.disconnect(); ro?.disconnect(); AFTER_REFRESH.delete(onShow); removeEventListener('scroll', onScroll); removeEventListener('resize', onShow); removeEventListener('load', onShow); removeEventListener('pageshow', onShow); foot._motifs = false; };
  }

  /* ================= wiring ================= */
  const KICK = () => kick();
  ['scroll', 'wheel', 'pointermove', 'pointerdown', 'keydown', 'touchstart', 'touchmove'].forEach(e => addEventListener(e, KICK, { passive: true }));
  addEventListener('resize', KICK, { passive: true });
  D.addEventListener('visibilitychange', () => { if (D.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; if (idleT) clearTimeout(idleT); idleT = 0; } else { last = 0; kick(); } });
  const onReduce = e => { REDUCE = e.matches; refresh(); };
  mqR.addEventListener ? mqR.addEventListener('change', onReduce) : mqR.addListener?.(onReduce);
  const onCoarse = e => { COARSE = e.matches; refresh(); };
  mqC.addEventListener ? mqC.addEventListener('change', onCoarse) : mqC.addListener?.(onCoarse);
  // a language change re-reads direction and words, whoever changed it (site.js also calls refresh() itself)
  try { new MutationObserver(() => { if (html.lang + '|' + html.dir !== refreshedAs) refresh(); }).observe(html, { attributes: true, attributeFilter: ['lang', 'dir'] }); } catch (e) {}
  addEventListener('pagehide', () => { for (const m of LIST.slice()) m.destroy(); if (raf) cancelAnimationFrame(raf); raf = 0; if (idleT) clearTimeout(idleT); idleT = 0; });
  addEventListener('pageshow', e => { if (e.persisted) { mount(); kick(); } });
  // the wave titles and labels are measured: measure again once the brand faces have really arrived
  if (D.fonts) {
    const faces = ['italic 400 64px "Instrument Serif"', '400 64px "Instrument Serif"', '500 15px "Bricolage Grotesque"'].concat(html.lang === 'ar' ? ['600 40px "IBM Plex Sans Arabic"'] : []);
    Promise.all(faces.map(f => D.fonts.load(f).catch(() => null))).then(() => refreshFonts());
    let ft = 0; D.fonts.addEventListener?.('loadingdone', () => { clearTimeout(ft); ft = setTimeout(refreshFonts, 80); });
  }

  const MOTIFS = window.MOTIFS = {
    version: VERSION, C, SKYLINE, draw, Motif, Tide,
    get reduce() { return REDUCE; }, get coarse() { return COARSE; }, get vel() { return VEL; },
    rtl: () => html.dir === 'rtl',
    define(name, Cls) { if (typeof name !== 'string' || typeof Cls !== 'function') return; TYPES[name] = Cls; if (D.readyState !== 'loading' || D.body) mount(); },
    mount, refresh, readColors, onFrame, kick, step, pause, footer, sunAt, endMark, placeCurl,
    get(el) { if (!el) return null; return MAP.get(el) || (el.dataset && (el.dataset.motif || el.dataset.tide != null) || (el.matches && el.matches('svg.wave-title')) ? mountOne(el) : null); },
    running: () => !paused && !D.hidden,
    /** the backing-store pixels of every unparked canvas (budget: < 12M) */
    pixels,
    /** how many animated motifs are visible now (design rule: at most 3 canvases) */
    active: () => LIST.filter(m => m.visible && !m.parked && m.animated).length,
    list: () => LIST.slice(),
    asset,
  };
  refreshedAs = html.lang + '|' + html.dir;
  // mount now (the script sits at the end of <body>), and again for nodes added before DOMContentLoaded
  sprite(); mount();
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => mount(), { once: true });
  kick();
  void MOTIFS;
})();
