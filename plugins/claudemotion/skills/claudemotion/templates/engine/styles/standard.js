/* Standard: Dribbble-level UI motion. Warm-gray canvas, white components,
   black ink, at most one accent. Springs with a tiny overshoot at most. */
CM.defineStyle('standard', {
  vars: {
    bg: '#ECEAE6', surface: '#FFFFFF', ink: '#111111', muted: '#6F6B66', soft: '#F2F1EE',
    line: '#E2DFDA', accent: '#111111', 'accent-ink': '#FFFFFF', dot: '#D6D2CB',
  },
  font: { family: 'Geist', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=block', weights: ['400', '500', '600'], body: 500, bold: 600 },
  morph: { w: 15, z: 0.82, cam: 7.5 },
  spring: { w: 24, z: 1 },
  pop: { w: 24, z: 0.82 },
  swap: { blur: 5, dy: 4, scale: 0.03, w: 22 },
  timeStep: 0,
  css: `#bg { background-repeat: repeat; }`,
  mount(els) {
    const c = encodeURIComponent(this.vars.dot);
    els.bg.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='1.05' fill='${c}'/%3E%3C/svg%3E")`;
    els.cursor.style.filter = 'drop-shadow(0 2px 2px rgba(0,0,0,0.22))';
  },
  grid(bg, v) {
    const g = 28 * v.s;
    bg.style.backgroundSize = `${g}px ${g}px`;
    bg.style.backgroundPosition = `${v.x - g / 2}px ${v.y - g / 2}px`;
  },
  surface(el, m) {
    const s = CM.rgb(this.vars.surface), a = CM.rgb(this.vars.accent), k = CM.rgb(this.vars.ink);
    el.style.background = CM.css(CM.mix(CM.mix(s, a, m.a), k, m.k));
    el.style.boxShadow = `0 1px 2px rgba(0,0,0,0.06), 0 14px 36px rgba(0,0,0,${(0.08 + 0.05 * Math.max(m.a, m.k)).toFixed(3)})`;
  },
});
