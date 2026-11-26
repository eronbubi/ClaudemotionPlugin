/* Claudemotion engine.
 *
 * Every frame is a pure function of time: seek(t) computes every style from t.
 * No CSS transitions, no timers, no state carried between frames.
 *
 * Units: the page works in "units". In beat-synced videos one unit is one
 * beat (CM.B = seconds per beat, measured from the song). In long-format
 * videos that are not beat-synced, pass beat=1 so one unit is one second.
 *
 * Query parameters (all optional):
 *   mode=short|long   short: 1440x1440 loop; long: 1920x1080, no loop
 *   w, h              frame size override
 *   beat              seconds per unit
 *   style             standard | drawn | glass | funny
 *   loop=0|1          override the loop default of the mode
 *   t                 initial time for manual preview
 */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const root = document.documentElement;
  const num = (k, d) => (Q.has(k) ? parseFloat(Q.get(k)) : d);

  const CM = (window.CM = { Q, styles: {} });
  CM.mode = Q.get('mode') || root.dataset.mode || 'short';
  CM.styleName = Q.get('style') || root.dataset.style || 'standard';
  CM.W = num('w', +(root.dataset.w || (CM.mode === 'long' ? 1920 : 1440)));
  CM.H = num('h', +(root.dataset.h || (CM.mode === 'long' ? 1080 : 1440)));
  CM.B = num('beat', +(root.dataset.beat || 0.5));
  CM.loop = Q.has('loop') ? Q.get('loop') !== '0' : CM.mode !== 'long';
  CM.T = 0;

  /* ---------------- math ---------------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const c01 = v => clamp(v, 0, 1);
  CM.clamp = clamp; CM.c01 = c01;
  CM.tb = u => u * CM.B;
  CM.timeline = units => { CM.units = units; CM.T = units * CM.B; return CM.T; };
  CM.wrap = t => (CM.loop ? ((t % CM.T) + CM.T) % CM.T : clamp(t, 0, CM.T));

  /* Closed-form step response of a damped spring (0 -> 1). */
  function S(x, w, z) {
    if (x <= 0) return 0;
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x));
    }
    return 1 - Math.exp(-w * x) * (1 + w * x);
  }
  /* Impulse "kick" (0 -> 0) for squash, shake and nudges: a damped sine. */
  const K = (x, w, z) => (x <= 0 ? 0 : Math.exp(-z * w * x) * Math.sin(w * Math.sqrt(1 - Math.min(z * z, 0.99)) * x));
  CM.S = S; CM.K = K;
  CM.smooth = v => { v = c01(v); return v * v * (3 - 2 * v); };
  /* Deterministic pseudo-random in [0, 1). */
  CM.rand = (i, salt = 0) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* A value that changes target many times: the sum of one spring per change.
     In loop mode the previous loop's tail is added, so frame T equals frame 0. */
  class Track {
    constructor(spring) { this.ev = []; this.sp = spring || null; }
    to(u, v, w, z) {
      const sp = this.sp || CM.style.morph;
      this.ev.push({ u, v, w: w ?? sp.w, z: z ?? sp.z });
      return this;
    }
    done() {
      const T = CM.T;
      this.ev.forEach(e => { e.t = CM.loop ? ((CM.tb(e.u) % T) + T) % T : CM.tb(e.u); });
      this.ev.sort((a, b) => a.t - b.t);
      const n = this.ev.length;
      if (CM.loop) {
        for (let i = 0; i < n; i++) this.ev[i].d = this.ev[i].v - this.ev[(i - 1 + n) % n].v;
        this.base = this.ev[n - 1].v;
      } else {
        this.ev.forEach((e, i) => { e.d = i ? e.v - this.ev[i - 1].v : 0; });
        this.base = this.ev[0].v;
      }
      return this;
    }
    at(t) {
      let v = this.base;
      if (CM.loop) for (const e of this.ev) v += e.d * (S(t - e.t, e.w, e.z) + S(t + CM.T - e.t, e.w, e.z) - 1);
      else for (const e of this.ev) v += e.d * S(t - e.t, e.w, e.z);
      return v;
    }
  }
  CM.Track = Track;
  /* Press: down 70 ms before the beat, up on the beat. */
  CM.pressTrack = (units, depth = 0.94) => {
    const tr = new Track();
    const dn = 0.07 / CM.B;
    tr.to(-1000, 1, 40, 1);
    for (const u of units) { tr.to(u - dn, depth, 40, 0.9); tr.to(u, 1, 24, 0.8); }
    return tr.done();
  };

  /* ---------------- color ---------------- */
  CM.rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  CM.mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  CM.css = (c, alpha = 1) => (alpha >= 1 ? `rgb(${c.map(Math.round).join(',')})` : `rgba(${c.map(Math.round).join(',')},${alpha})`);

  /* ---------------- DOM ---------------- */
  const NS = 'http://www.w3.org/2000/svg';
  CM.NS = NS;
  CM.h = function (tag, parent, css, html) {
    const e = document.createElement(tag);
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  CM.svg = function (tag, parent, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  CM.flexC = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

  CM.defineStyle = (name, def) => { CM.styles[name] = def; };

  /* Build the stage. Call once, after the style scripts are loaded. */
  CM.mount = function () {
    const st = CM.styles[CM.styleName] || CM.styles.standard;
    CM.style = st;
    const v = st.vars;
    const rs = root.style;
    for (const k in v) rs.setProperty('--' + k, v[k]);
    rs.setProperty('--font', `"${st.font.family}"`); // quoted: names like "Baloo 2" are invalid unquoted
    const link = CM.h('link', document.head);
    CM.fontCss = new Promise(res => { link.onload = res; link.onerror = res; });
    link.rel = 'stylesheet'; link.href = st.font.href;
    const base = CM.h('style', document.head);
    base.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: ${CM.W}px; height: ${CM.H}px; overflow: hidden; background: ${v.bg}; }
      body { font-family: var(--font), system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: var(--ink); }
      #stage { position: absolute; left: 0; top: 0; width: ${CM.W}px; height: ${CM.H}px; overflow: hidden; background: ${v.bg}; }
      #bg, #fx { position: absolute; inset: 0; }
      #fx { pointer-events: none; }
      #cam { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; }
      #shape { position: absolute; overflow: hidden; }
      #over { position: absolute; left: 0; top: 0; width: 0; height: 0; }
      .st { position: absolute; left: 50%; top: 50%; display: none; transform-origin: 50% 50%; }
      .tn { font-variant-numeric: tabular-nums; }
      .w { display: inline-block; white-space: pre; }
      #cursor { position: absolute; left: 0; top: 0; overflow: visible; transform-origin: 3px 2.5px; }
      ${st.css || ''}`;
    const stage = CM.h('div', document.body); stage.id = 'stage';
    const bg = CM.h('div', stage); bg.id = 'bg';
    const cam = CM.h('div', stage); cam.id = 'cam';
    const shape = CM.h('div', cam); shape.id = 'shape';
    const over = CM.h('div', cam); over.id = 'over';
    const fx = CM.h('div', stage); fx.id = 'fx';
    const cur = CM.svg('svg', stage, { id: 'cursor', width: 32, height: 32, viewBox: '0 0 32 32' });
    cur.innerHTML = st.cursor || `<path d="M3 2.5 L3 24 L8.6 18.9 L12.4 27.4 L16.1 25.8 L12.4 17.6 L20 17.4 Z" fill="${v.ink}" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>`;
    cur.style.display = 'none';
    CM.els = { stage, bg, cam, shape, over, fx, cursor: cur };
    if (st.mount) st.mount(CM.els);
    return CM.els;
  };

  /* ---------------- states and the morph ---------------- */
  /* DEF: { name: { w, h, r, tone: 'surface'|'accent'|'ink', zoom? } }
     SEQ: [[name, unit], ...] in time order. In loop mode the first state of
     the loop is the last entry (it wraps). */
  CM.states = function (DEF, SEQ, opt = {}) {
    const fw = opt.fitW ?? 0.72, fh = opt.fitH ?? 0.56, maxZ = opt.maxZoom ?? 2.6;
    const fit = d => d.zoom || Math.min(fw * CM.W / d.w, fh * CM.H / d.h, maxZ);
    const sp = CM.style.morph;
    const trW = new Track(), trH = new Track(), trR = new Track(), trA = new Track(), trK = new Track(), trC = new Track();
    for (const [name, u] of SEQ) {
      const d = DEF[name];
      trW.to(u, d.w, sp.w, sp.z); trH.to(u, d.h, sp.w, sp.z); trR.to(u, d.r, sp.w, Math.min(1, sp.z + 0.04));
      trA.to(u, d.tone === 'accent' ? 1 : 0, 34, 1); trK.to(u, d.tone === 'ink' ? 1 : 0, 34, 1);
      trC.to(u, fit(d), sp.cam ?? 7.5, 1);
    }
    [trW, trH, trR, trA, trK, trC].forEach(t => t.done());
    CM.M = { at: t => ({ w: trW.at(t), h: trH.at(t), r: trR.at(t), a: c01(trA.at(t)), k: c01(trK.at(t)), cam: trC.at(t), t }) };
    const ST = {};
    for (const name in DEF) {
      const d = DEF[name];
      const el = CM.h('div', CM.els.shape, { width: d.w + 'px', height: d.h + 'px', marginLeft: -d.w / 2 + 'px', marginTop: -d.h / 2 + 'px' });
      el.className = 'st';
      ST[name] = { ...d, name, root: el, el: {} };
    }
    CM.WIN = SEQ.map(([name, u], i) => {
      const a = CM.tb(u);
      const z = i + 1 < SEQ.length ? CM.tb(SEQ[i + 1][1]) : (CM.loop ? CM.T + CM.tb(SEQ[0][1]) : CM.T + 10);
      return { name, a, z };
    });
    CM.ST = ST;
    return ST;
  };

  /* Content enters with a spring and leaves with a short smoothstep, so text
     that swaps inside the morphing container never overlaps. */
  function presence(a, z, t) {
    const ts = CM.loop ? [t, t + CM.T] : [t];
    for (const tt of ts) {
      if (tt >= a && tt < z + 0.12) {
        const s = S(tt - a - 0.07, CM.style.swap.w || 22, 1);
        const e = CM.smooth((tt - (z - 0.015)) / 0.1);
        return { s, e };
      }
    }
    return null;
  }
  CM.presence = presence;

  /* Positioning helpers in state coordinates (0,0 = state center). */
  CM.at = (st, x, y, w, h, css, parent) =>
    CM.h('div', parent || st.root, { position: 'absolute', left: (x - w / 2 + st.w / 2) + 'px', top: (y - h / 2 + st.h / 2) + 'px', width: w + 'px', height: h + 'px', ...css });
  CM.txt = (st, html, x, y, size, o = {}) => {
    const e = CM.h('div', o.parent || st.root, {
      position: 'absolute', whiteSpace: 'nowrap', left: (x + st.w / 2) + 'px', top: (y + st.h / 2 - size * 0.6) + 'px',
      fontSize: size + 'px', lineHeight: size * 1.2 + 'px', fontWeight: o.weight || CM.style.font.body || 500,
      color: o.color || 'var(--ink)', letterSpacing: o.ls || '-0.01em',
    }, html);
    e.dataset.pre = o.anchor === 'c' ? 'translateX(-50%)' : o.anchor === 'r' ? 'translateX(-100%)' : '';
    e.style.transform = e.dataset.pre || 'none';
    if (o.tn) e.classList.add('tn');
    return e;
  };
  CM.words = (parent, text, size) => text.split(' ').map((wd, i, arr) => {
    const s = CM.h('span', parent, { fontSize: size + 'px' });
    s.className = 'w'; s.textContent = wd + (i < arr.length - 1 ? ' ' : '');
    return s;
  });

  /* Reveal helpers (respect a centering pre-transform). */
  CM.reveal = (el, t0, t, dy = 8) => {
    const s = S(t - t0, CM.style.spring.w, CM.style.spring.z);
    el.style.opacity = c01(s).toFixed(3);
    el.style.transform = `${el.dataset.pre || ''} translateY(${(dy * (1 - s)).toFixed(2)}px)`;
  };
  CM.popIn = (el, t0, t, from = 0.85) => {
    const p = CM.style.pop;
    const s = S(t - t0, p.w, p.z);
    el.style.opacity = c01(s * 1.3).toFixed(3);
    el.style.transform = `${el.dataset.pre || ''} scale(${(from + (1 - from) * s).toFixed(4)})`;
  };
  CM.scale = (el, k) => { el.style.transform = `${el.dataset.pre || ''} scale(${k})`; };

  /* ---------------- per frame ---------------- */
  CM.time = tIn => {
    let t = CM.wrap(tIn);
    const q = CM.style.timeStep;
    if (q) t = Math.floor(t / q + 1e-6) * q; // animation "on ones" at the style's frame rate
    return t;
  };
  CM.impacts = [];      // seconds; clicks, landings: used by squash and shake
  CM.pressAt = null;    // t -> scale of the shape (clicks on the shape itself)
  CM.cursorAt = null;   // t -> [x, y, press] in world units, or null to hide
  CM.kickAt = null;     // t -> extra camera zoom factor
  CM.panAt = null;      // t -> [x, y] world point the camera looks at (pans, whip pans, strips)
  CM.tiltAt = null;     // t -> extra camera rotation in degrees

  CM.render = function (t) {
    const st = CM.style, els = CM.els;
    const m = CM.M.at(t);
    const dt = 1 / 120, m0 = CM.M.at(Math.max(0, t - dt));
    m.vw = (m.w - m0.w) / dt; m.vh = (m.h - m0.h) / dt;
    const fx = (st.frame && st.frame(t, m, els)) || {};
    const s = m.cam * (CM.kickAt ? CM.kickAt(t) : 1);
    const pan = CM.panAt ? CM.panAt(t) : [0, 0];
    const vx = CM.W / 2 - s * pan[0] + (fx.shakeX || 0), vy = CM.H / 2 - s * pan[1] + (fx.shakeY || 0);
    const rot = (fx.rot || 0) + (CM.tiltAt ? CM.tiltAt(t) : 0);
    CM.view = { s, x: vx, y: vy, rot };
    els.cam.style.transform = `translate(${vx.toFixed(2)}px,${vy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})`;
    if (st.grid) st.grid(els.bg, CM.view);
    const sx = (CM.pressAt ? CM.pressAt(t) : 1) * (fx.squashX || 1), sy = (CM.pressAt ? CM.pressAt(t) : 1) * (fx.squashY || 1);
    Object.assign(els.shape.style, {
      left: -m.w / 2 + 'px', top: -m.h / 2 + 'px', width: m.w + 'px', height: m.h + 'px',
      borderRadius: Math.min(m.r, m.w / 2, m.h / 2) + 'px',
      transform: `scale(${sx.toFixed(4)},${sy.toFixed(4)})`,
    });
    st.surface(els.shape, m, t);
    const sw = st.swap;
    /* a state may appear several times in SEQ: use whichever window is live */
    const live = {};
    for (const wdw of CM.WIN) if (!live[wdw.name]) live[wdw.name] = presence(wdw.a, wdw.z, t);
    for (const name in CM.ST) {
      const S_ = CM.ST[name], p = live[name];
      if (!p) { S_.root.style.display = 'none'; continue; }
      const op = p.s * (1 - p.e);
      if (op < 0.002) { S_.root.style.display = 'none'; continue; }
      S_.root.style.display = 'block';
      S_.root.style.opacity = op.toFixed(4);
      const b = sw.blur * (1 - p.s) + sw.blur * p.e;
      S_.root.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
      S_.root.style.transform = `translateY(${(sw.dy * (1 - p.s)).toFixed(2)}px) scale(${(1 - sw.scale + sw.scale * p.s - 0.02 * p.e).toFixed(4)})`;
    }
    /* cursor: world -> screen */
    const c = CM.cursorAt ? CM.cursorAt(t) : null;
    if (c) {
      const [x, y, press] = c;
      const X = vx + s * x, Y = vy + s * y;
      els.cursor.style.display = 'block';
      els.cursor.style.transform = `translate(${(X - 3).toFixed(2)}px,${(Y - 2.5).toFixed(2)}px) scale(${(1.3 * (press ?? 1)).toFixed(4)})`;
      m.cursor = [x, y];
    } else els.cursor.style.display = 'none';
    if (st.after) st.after(t, m, els);
    return m;
  };

  /* Fonts: resolve when every weight is loaded (hidden elements never trigger a load).
     Waits for the injected stylesheet first: before it is parsed, fonts.load()
     finds no faces and resolves at once. Extra families: CM.ready(['700 Gaegu', ...]). */
  const SAMPLE = 'Aa0123456789,.';
  CM.ready = (extra = []) => {
    const f = CM.style.font;
    const specs = f.weights.map(w => `${w} 24px "${f.family}"`).concat(extra.map(e => {
      const [w, ...name] = e.split(' ');
      return `${w} 24px "${name.join(' ')}"`;
    }));
    return (CM.fontCss || Promise.resolve())
      .then(() => Promise.all(specs.map(s => document.fonts.load(s, SAMPLE))))
      .then(() => document.fonts.ready)
      .then(() => specs.every(s => document.fonts.check(s, SAMPLE) && [...document.fonts].some(ff => ff.status === 'loaded' && s.includes(`"${ff.family.replace(/"/g, '')}"`))));
  };
})();
