/* Glass: frosted glass panels over slowly drifting color light.
   Translucent surfaces with backdrop blur, a thin bright rim and a soft
   top highlight. Calm, critically damped motion. Gradients are allowed
   here (they are the light behind the glass), glows are not. */
CM.defineStyle('glass', {
  vars: {
    bg: '#0C1020', surface: '#FFFFFF', ink: '#FFFFFF', muted: 'rgba(255,255,255,0.66)', soft: 'rgba(255,255,255,0.12)',
    line: 'rgba(255,255,255,0.28)', accent: '#7C6CFF', 'accent-ink': '#FFFFFF', accent2: '#2BD4FF', accent3: '#FF5CA8',
  },
  font: { family: 'Geist', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=block', weights: ['400', '500', '600'], body: 500, bold: 600 },
  morph: { w: 12, z: 0.9, cam: 6 },
  spring: { w: 18, z: 1 },
  pop: { w: 18, z: 0.9 },
  swap: { blur: 10, dy: 6, scale: 0.04, w: 18 },
  timeStep: 0,
  css: `#shape { backdrop-filter: blur(30px) saturate(175%); -webkit-backdrop-filter: blur(30px) saturate(175%); }`,
  blobs: [
    { c: '#7C6CFF', r: 0.42, x: 0.30, y: 0.34, ax: 0.10, ay: 0.07, f: 0.11, p: 0.0 },
    { c: '#2BD4FF', r: 0.36, x: 0.72, y: 0.62, ax: 0.08, ay: 0.09, f: 0.09, p: 1.7 },
    { c: '#FF5CA8', r: 0.30, x: 0.62, y: 0.22, ax: 0.07, ay: 0.06, f: 0.13, p: 3.1 },
    { c: '#2E5BFF', r: 0.38, x: 0.22, y: 0.78, ax: 0.06, ay: 0.05, f: 0.07, p: 4.4 },
  ],
  mount(els) {
    this.blobEls = this.blobs.map(b => CM.h('div', els.bg, {
      position: 'absolute', left: '0', top: '0', width: '1px', height: '1px', borderRadius: '50%',
      background: `radial-gradient(circle at 50% 50%, ${b.c} 0%, ${b.c}AA 30%, ${b.c}00 70%)`,
    }));
    els.cursor.innerHTML = `<path d="M3 2.5 L3 24 L8.6 18.9 L12.4 27.4 L16.1 25.8 L12.4 17.6 L20 17.4 Z" fill="#FFFFFF" stroke="rgba(12,16,32,0.55)" stroke-width="1.4" stroke-linejoin="round"/>`;
    els.cursor.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))';
  },
  frame(t) {
    /* Light drifts as a pure function of time. In loop mode every blob makes
       a whole number of cycles per loop, so frame T equals frame 0. */
    const W = CM.W, H = CM.H, D = Math.max(W, H);
    this.blobs.forEach((b, i) => {
      const ph = CM.loop ? (2 * Math.PI * (1 + (i % 2)) * t) / CM.T + b.p : 2 * Math.PI * b.f * 0.5 * t + b.p;
      const x = (b.x + b.ax * Math.sin(ph)) * W, y = (b.y + b.ay * Math.cos(ph)) * H, r = b.r * D;
      Object.assign(this.blobEls[i].style, { width: 2 * r + 'px', height: 2 * r + 'px', transform: `translate(${(x - r).toFixed(1)}px,${(y - r).toFixed(1)}px)` });
    });
    return {};
  },
  surface(el, m) {
    const a = CM.rgb(this.vars.accent), k = [12, 16, 32];
    const tint = CM.mix(CM.mix([255, 255, 255], a, m.a), k, m.k);
    const alpha = 0.12 + 0.38 * m.a + 0.45 * m.k;
    el.style.background = `linear-gradient(180deg, rgba(255,255,255,${(0.16 * (1 - m.k)).toFixed(3)}) 0%, rgba(255,255,255,0) 46%), ${CM.css(tint, alpha.toFixed(3))}`;
    el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.26), 0 24px 70px rgba(4,6,20,0.45)`;
  },
});
