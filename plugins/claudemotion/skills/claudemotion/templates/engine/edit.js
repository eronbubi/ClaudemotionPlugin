/* Claudemotion edit mode: real footage, cut and finished as code.
 *
 * Load after engine.js and footage/footage.js (written by scripts/footage.py).
 * Clips are numbered JPEG frames, so the frame for any source time is a plain
 * image and the page stays a pure function of t. The renderer awaits
 * CM.settle() after every seek, so a new frame is decoded before the shot.
 *
 *   const cut = CM.edl([
 *     { clip: 'talk', in: 3.2, out: 9.8, zoom: [1, 1.12], focus: [0.5, 0.4] },  // slow push-in
 *     { clip: 'broll', in: 20, out: 24, speed: 0.5, trans: { type: 'whip', dur: 0.35 } },
 *     { clip: 'talk', in: 12, out: 15, speed: [1, 2.5], hold: 0.8, trans: { type: 'fade', dur: 0.5 } },
 *   ]);
 *   const player = new CM.Cutter(cut);          // full-frame footage under the motion graphics
 *   ...in seek(t): player.render(t);
 *
 * Segment fields
 *   clip, in, out      source range in seconds of the original file
 *   speed              number (0.5 = half speed) or [from, to] for a linear speed ramp
 *   hold               seconds to freeze on the last frame
 *   trans              transition into this segment: { type, dur } with type
 *                      cut | fade | dip | wipe | whip | zoom | circle (dip takes color)
 *   zoom, focus        punch-in / Ken Burns: zoom number or [from, to]; focus [x, y] in 0..1
 *                      or [[x0, y0], [x1, y1]]
 *   gain, mute         sound of this segment (scripts/edit_audio.py)
 */
(function () {
  'use strict';
  const { c01, smooth } = CM;
  /* read lazily: footage/footage.js may load after this file */
  Object.defineProperty(CM, 'FOOTAGE', { get: () => window.FOOTAGE || { clips: {} } });
  let pending = [];
  CM.settle = () => { const p = pending; pending = []; return Promise.all(p).then(() => true); };

  CM.frameURL = (id, src) => {
    const c = CM.FOOTAGE.clips[id];
    if (!c) throw new Error('unknown clip ' + id + ' (run scripts/footage.py add)');
    const k = Math.min(c.frames, Math.max(1, Math.floor((src - c.start) * c.fps + 1e-6) + 1));
    return `${c.dir}/f${String(k).padStart(6, '0')}.jpg`;
  };

  /* pages without the morphing shape */
  CM.noShape = function () {
    CM.M = { at: t => ({ w: 0, h: 0, r: 0, a: 0, k: 0, cam: 1, t }) };
    CM.WIN = []; CM.ST = {};
    CM.els.shape.style.display = 'none';
  };

  /* ---------------- the edit decision list ---------------- */
  CM.edl = function (list, opt = {}) {
    let t = opt.start || 0;
    const segs = list.map((s, i) => {
      const seg = { ...s, i, trans: s.trans || { type: 'cut', dur: 0 } };
      const len = s.out - s.in;
      if (Array.isArray(s.speed)) { seg.v0 = s.speed[0]; seg.v1 = s.speed[1]; seg.play = 2 * len / (seg.v0 + seg.v1); }
      else { seg.v0 = seg.v1 = s.speed || 1; seg.play = len / seg.v0; }
      seg.hold = s.hold || 0;
      seg.start = i ? t - seg.trans.dur : t;
      seg.end = seg.start + seg.play + seg.hold;
      t = seg.end;
      return seg;
    });
    const srcAt = (seg, local) => {
      const x = Math.min(Math.max(local, 0), seg.play);
      return seg.in + seg.v0 * x + (seg.v1 - seg.v0) * x * x / (2 * seg.play);
    };
    const E = {
      segs, end: t,
      srcAt,
      /* segments on screen at t: the incoming one last, with transition progress p */
      at(t) {
        const on = [];
        for (const s of segs) if (t >= s.start && t < s.end + (s === segs[segs.length - 1] ? 1e9 : 0)) {
          const p = s.trans.dur > 0 ? c01((t - s.start) / s.trans.dur) : 1;
          on.push({ seg: s, local: t - s.start, src: srcAt(s, t - s.start), p });
        }
        return on;
      },
      /* timeline time at which a source moment of a clip plays (first match), or null */
      timeOf(clip, src) {
        for (const s of segs) {
          if (s.clip !== clip || src < s.in || src > s.out) continue;
          const d = src - s.in, a = (s.v1 - s.v0) / (2 * s.play);
          const x = Math.abs(a) < 1e-9 ? d / s.v0 : (-s.v0 + Math.sqrt(s.v0 * s.v0 + 4 * a * d)) / (2 * a);
          return s.start + x;
        }
        return null;
      },
      /* words of the transcript (scripts/transcribe.py), on the timeline */
      words(clips) {
        const out = [];
        for (const s of segs) {
          if (clips && !clips.includes(s.clip)) continue;
          const c = CM.FOOTAGE.clips[s.clip];
          for (const w of (c && c.words) || []) {
            if (w.a < s.in || w.b > s.out) continue;
            const a = E.timeOf(s.clip, w.a), b = E.timeOf(s.clip, w.b);
            if (a != null && b != null && a >= s.start + s.trans.dur * 0.5) out.push({ w: w.w, a, b });
          }
        }
        return out.sort((x, y) => x.a - y.a);
      },
      /* for scripts/edit_audio.py */
      audio() {
        return segs.map((s, i) => ({
          clip: s.clip, in: s.in, out: s.out, start: s.start, play: s.play, hold: s.hold,
          speed: (s.v0 + s.v1) / 2, ramp: s.v0 !== s.v1, fadeIn: s.trans.dur,
          fadeOut: i + 1 < segs.length ? segs[i + 1].trans.dur : 0, gain: s.gain ?? 1, mute: !!s.mute,
        }));
      },
    };
    return E;
  };

  /* ---------------- one footage layer ---------------- */
  class Layer {
    constructor(parent, w, h, fit) {
      this.box = CM.h('div', parent, { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px', overflow: 'hidden', display: 'none' });
      this.img = CM.h('img', this.box, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', objectFit: fit, transformOrigin: '50% 50%' });
      this.img.decoding = 'sync';
      this.url = '';
    }
    show(url) {
      this.box.style.display = 'block';
      if (url !== this.url) {
        this.url = url; this.img.src = url;
        pending.push(this.img.decode().catch(() => {}));
      }
    }
    hide() { this.box.style.display = 'none'; }
  }
  CM.Layer = Layer;

  /* ---------------- the player: footage + transitions ---------------- */
  const lerp = (a, b, k) => a + (b - a) * k;
  const pick = (v, k, d) => (v == null ? d : Array.isArray(v) ? lerp(v[0], v[1], k) : v);
  const pickXY = (v, k) => (!v ? [0.5, 0.5] : Array.isArray(v[0]) ? [lerp(v[0][0], v[1][0], k), lerp(v[0][1], v[1][1], k)] : v);

  CM.Cutter = class {
    constructor(edit, o = {}) {
      this.edit = edit;
      this.w = o.w || CM.W; this.h = o.h || CM.H;
      const parent = o.parent || (() => {
        const d = CM.h('div', null, { position: 'absolute', left: '0', top: '0', width: CM.W + 'px', height: CM.H + 'px', overflow: 'hidden', background: o.background || '#000' });
        CM.els.stage.insertBefore(d, CM.els.cam);
        CM.els.footage = d;
        return d;
      })();
      this.root = parent;
      this.layers = [new Layer(parent, this.w, this.h, o.fit || 'cover'), new Layer(parent, this.w, this.h, o.fit || 'cover')];
      this.veil = CM.h('div', parent, { position: 'absolute', inset: '0', opacity: '0', pointerEvents: 'none' });
    }
    /* returns the segments on screen; style hooks: this.layers[k].box / .img */
    render(t) {
      const on = this.edit.at(t);
      const used = new Set();
      this.veil.style.opacity = '0';
      on.forEach((a, n) => {
        const L = this.layers[a.seg.i % 2];
        used.add(L);
        const s = a.seg, k = c01(a.local / Math.max(1e-6, s.play + s.hold));
        const z = pick(s.zoom, smooth(k), 1), [fx, fy] = pickXY(s.focus, smooth(k));
        L.show(CM.frameURL(s.clip, a.src));
        L.img.style.transformOrigin = `${(fx * 100).toFixed(2)}% ${(fy * 100).toFixed(2)}%`;
        let tf = `scale(${z.toFixed(5)})`, box = { op: 1, tf: '', clip: 'none', filter: 'none' };
        const incoming = n === on.length - 1 && on.length > 1;
        const outgoing = on.length > 1 && n === 0;
        const p = smooth(on[on.length - 1].p), type = on[on.length - 1].seg.trans.type;
        if (incoming || outgoing) box = this.trans(type, p, incoming, on[on.length - 1].seg.trans);
        L.img.style.transform = tf;
        L.box.style.zIndex = n;
        L.box.style.opacity = box.op.toFixed(4);
        L.box.style.transform = box.tf;
        L.box.style.clipPath = box.clip;
        L.box.style.filter = box.filter;
      });
      for (const L of this.layers) if (!used.has(L)) L.hide();
      return on;
    }
    trans(type, p, incoming, tr) {
      const W = this.w, H = this.h, r = { op: 1, tf: '', clip: 'none', filter: 'none' };
      const bell = Math.sin(Math.PI * p);
      switch (type) {
        case 'fade': if (incoming) r.op = p; break;
        case 'dip': {
          this.veil.style.background = tr.color || '#000';
          this.veil.style.zIndex = 5;
          this.veil.style.opacity = (1 - Math.abs(2 * p - 1)).toFixed(4);
          r.op = incoming ? (p >= 0.5 ? 1 : 0) : (p < 0.5 ? 1 : 0);
          break;
        }
        case 'wipe': if (incoming) r.clip = `inset(0 ${((1 - p) * 100).toFixed(3)}% 0 0)`; break;
        case 'circle': if (incoming) r.clip = `circle(${(p * Math.hypot(W, H) * 0.5).toFixed(1)}px at 50% 50%)`; break;
        case 'whip': {
          const dx = incoming ? (1 - p) * W : -p * W;
          r.tf = `translateX(${dx.toFixed(1)}px)`;
          r.filter = bell > 0.05 ? `blur(${(14 * bell).toFixed(2)}px)` : 'none';
          break;
        }
        case 'zoom': {
          if (incoming) { r.op = c01(p * 1.6); r.tf = `scale(${(0.82 + 0.18 * p).toFixed(4)})`; }
          else { r.tf = `scale(${(1 + 0.5 * p).toFixed(4)})`; r.filter = bell > 0.05 ? `blur(${(8 * p).toFixed(2)}px)` : 'none'; }
          break;
        }
        default: break;
      }
      return r;
    }
  };

  /* ---------------- word-by-word captions ---------------- */
  /* words: [{w, a, b}] on the timeline (cut.words()). Groups of up to `max`
     words, broken at pauses and sentence ends; the spoken word is marked. */
  CM.captions = function (words, o = {}) {
    const max = o.max || 4, size = o.size || 64, y = o.y ?? CM.H * 0.8;
    const groups = [];
    let g = [];
    words.forEach((w, i) => {
      g.push(w);
      const next = words[i + 1];
      if (!next || g.length >= max || /[.!?,;:]$/.test(w.w) || next.a - w.b > 0.45) { groups.push(g); g = []; }
    });
    const root = CM.h('div', o.parent || CM.els.fx, { position: 'absolute', left: '0', width: CM.W + 'px', top: (y - size * 0.7) + 'px', height: size * 1.4 + 'px', ...CM.flexC, pointerEvents: 'none' });
    const G = groups.map(ws => {
      const line = CM.h('div', root, { position: 'absolute', display: 'flex', gap: (size * 0.22) + 'px', alignItems: 'center', whiteSpace: 'nowrap',
        fontSize: size + 'px', fontWeight: o.weight || CM.style.font.bold || 700, letterSpacing: '-0.02em', color: o.color || '#FFFFFF',
        textShadow: o.shadow ?? '0 3px 14px rgba(0,0,0,0.45)' });
      const els = ws.map(w => CM.h('span', line, { display: 'inline-block', padding: `0 ${size * 0.14}px`, borderRadius: (size * 0.18) + 'px' }, w.w.replace(/[,]$/, '')));
      return { ws, line, els, a: ws[0].a, b: ws[ws.length - 1].b };
    });
    const hl = o.highlight || 'var(--accent)';
    return {
      groups: G,
      render(t) {
        G.forEach((g, i) => {
          const until = i + 1 < G.length ? Math.min(G[i + 1].a, g.b + 0.35) : g.b + 0.35;
          const vis = t >= g.a - 0.05 && t < until;
          g.line.style.display = vis ? 'flex' : 'none';
          if (!vis) return;
          g.els.forEach((e, k) => {
            CM.popIn(e, g.ws[k].a - 0.04, t, 0.7);
            const now = t >= g.ws[k].a && t < g.ws[k].b + 0.05;
            e.style.background = now ? hl : 'transparent';
          });
        });
      },
    };
  };
})();
