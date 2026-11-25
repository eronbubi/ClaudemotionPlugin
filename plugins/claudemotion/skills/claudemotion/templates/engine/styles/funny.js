/* Funny: everything a bit too much. Chunky outlines with hard offset
   shadows, loud colors, a rounded font, bouncy overshoot, squash and
   stretch on every impact, screen shake, googly eyes on the shape that
   follow the cursor, and confetti bursts. Humor lives in the copy too. */
CM.defineStyle('funny', {
  vars: {
    bg: '#FFF1C9', surface: '#FFFFFF', ink: '#141414', muted: '#5C5648', soft: '#FFE9A8',
    line: '#141414', accent: '#FF5FA2', 'accent-ink': '#141414', accent2: '#3DD6F5', accent3: '#B6F24B', accent4: '#FFB020',
    dot: '#F5D98A',
  },
  font: { family: 'Baloo 2', href: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=block', weights: ['500', '700', '800'], body: 700, bold: 800 },
  morph: { w: 16, z: 0.5, cam: 9 },
  spring: { w: 22, z: 0.6 },
  pop: { w: 24, z: 0.42 },
  swap: { blur: 0, dy: 18, scale: 0.18, w: 26 },
  timeStep: 0,
  eyes: true,
  shake: 9,
  bursts: [],      // [{ t, x, y }] in seconds and world units: confetti
  css: `#bg { background-repeat: repeat; } .st { letter-spacing: 0; }`,
  mount(els) {
    const c = encodeURIComponent(this.vars.dot);
    els.bg.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='18' cy='18' r='3.2' fill='${c}'/%3E%3C/svg%3E")`;
    els.cursor.innerHTML = `<path d="M3 2.5 L3 24 L8.6 18.9 L12.4 27.4 L16.1 25.8 L12.4 17.6 L20 17.4 Z" fill="${this.vars.accent2}" stroke="${this.vars.line}" stroke-width="2.4" stroke-linejoin="round"/>`;
    /* googly eyes sit on the top edge of the shape */
    this.eyeEls = [0, 1].map(() => {
      const e = CM.h('div', els.over, { position: 'absolute', width: '44px', height: '44px', marginLeft: '-22px', marginTop: '-22px', borderRadius: '50%', background: '#FFFFFF', boxShadow: `0 0 0 4px ${this.vars.line}` });
      const p = CM.h('div', e, { position: 'absolute', left: '13px', top: '13px', width: '18px', height: '18px', borderRadius: '50%', background: this.vars.line });
      return { e, p };
    });
    this.confetti = [];
    for (let i = 0; i < 26; i++) {
      const col = [this.vars.accent, this.vars.accent2, this.vars.accent3, this.vars.accent4][i % 4];
      this.confetti.push(CM.h('div', els.fx, { position: 'absolute', left: '0', top: '0', width: (10 + 8 * CM.rand(i, 1)) + 'px', height: (6 + 6 * CM.rand(i, 2)) + 'px', borderRadius: '2px', background: col, boxShadow: `0 0 0 2px ${this.vars.line}`, display: 'none' }));
    }
  },
  grid(bg, v) {
    const g = 36 * v.s;
    bg.style.backgroundSize = `${g}px ${g}px`;
    bg.style.backgroundPosition = `${v.x - g / 2}px ${v.y - g / 2}px`;
  },
  frame(t, m) {
    /* squash and stretch: impacts plus the morph's own velocity */
    let q = 0, shake = 0;
    for (const ti of CM.impacts) {
      for (const tt of CM.loop ? [t, t + CM.T] : [t]) {
        const x = tt - ti;
        if (x > 0 && x < 1.2) { q += 0.16 * CM.K(x, 26, 0.32); shake += Math.exp(-x * 9); }
      }
    }
    const vel = CM.clamp((m.vw - m.vh) / 9000, -0.12, 0.12);
    const sq = q + vel;
    const n = Math.floor(t * 60);
    const amp = this.shake * Math.min(1, shake);
    return {
      squashX: 1 + sq, squashY: 1 - sq,
      shakeX: amp * (CM.rand(n, 3) * 2 - 1), shakeY: amp * (CM.rand(n, 5) * 2 - 1), rot: 0.6 * amp / this.shake * (CM.rand(n, 9) * 2 - 1),
    };
  },
  after(t, m) {
    /* eyes ride the top edge and look at the cursor (or wander) */
    const lookX = m.cursor ? m.cursor[0] : 200 * Math.sin(t * 1.3), lookY = m.cursor ? m.cursor[1] : -120;
    const blink = ((t % 3.1) < 0.12) ? 0.12 : 1;
    this.eyeEls.forEach(({ e, p }, i) => {
      const ex = (i ? 1 : -1) * Math.min(38, m.w * 0.16), ey = -m.h / 2 - 2;
      const dx = lookX - ex, dy = lookY - ey, d = Math.hypot(dx, dy) || 1;
      const off = Math.min(9, d / 30);
      e.style.left = ex + 'px'; e.style.top = ey + 'px';
      e.style.display = this.eyes ? 'block' : 'none';
      e.style.transform = `scaleY(${blink})`;
      p.style.transform = `translate(${(dx / d * off).toFixed(2)}px,${(dy / d * off).toFixed(2)}px)`;
    });
    /* confetti: ballistic, deterministic */
    const v = CM.view;
    this.confetti.forEach(c => { c.style.display = 'none'; });
    for (const b of this.bursts) {
      const x0 = t - b.t;
      if (x0 < 0 || x0 > 1.6) continue;
      this.confetti.forEach((c, i) => {
        const ang = -Math.PI / 2 + (CM.rand(i, 11) - 0.5) * 2.4, sp = 700 + 600 * CM.rand(i, 12);
        const X = v.x + v.s * b.x + Math.cos(ang) * sp * x0, Y = v.y + v.s * b.y + Math.sin(ang) * sp * x0 + 0.5 * 2200 * x0 * x0;
        c.style.display = 'block';
        c.style.opacity = CM.c01((1.6 - x0) / 0.4).toFixed(3);
        c.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) rotate(${(720 * x0 * (CM.rand(i, 13) - 0.5)).toFixed(1)}deg)`;
      });
    }
  },
  surface(el, m) {
    const s = CM.rgb(this.vars.surface), a = CM.rgb(this.vars.accent), k = CM.rgb(this.vars.ink);
    el.style.background = CM.css(CM.mix(CM.mix(s, a, m.a), k, m.k));
    el.style.boxShadow = `inset 0 0 0 5px ${this.vars.line}, 9px 10px 0 ${this.vars.line}`;
    el.style.overflow = 'hidden';
  },
});
