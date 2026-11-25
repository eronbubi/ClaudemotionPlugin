/* Drawn: everything looks painted with colored pencils on paper.
   Wobbly hand-drawn outlines that "boil" (redrawn 8 times a second),
   pencil-hatched fills, paper grain, a handwritten font, and motion
   animated on ones at 24 fps like hand-drawn animation. */
CM.defineStyle('drawn', {
  vars: {
    bg: '#F6F0E1', surface: '#FFFDF6', ink: '#2F2B28', muted: '#7A7068', soft: '#F1E9D6',
    line: '#3A3531', accent: '#E0574F', 'accent-ink': '#FFFDF6', accent2: '#3E78C2', accent3: '#4F9D57', accent4: '#F0B93B',
    hatch: '#C9B99A',
  },
  font: { family: 'Gaegu', href: 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=block', weights: ['400', '700'], body: 700, bold: 700 },
  morph: { w: 13, z: 0.8, cam: 6.5 },
  spring: { w: 20, z: 0.9 },
  pop: { w: 20, z: 0.72 },
  swap: { blur: 0, dy: 10, scale: 0.08, w: 20 },
  timeStep: 1 / 24,
  boil: 8,
  css: `
    #bg { background-color: #F6F0E1; }
    #cam { filter: url(#cm-pencil); }
    #cursor { filter: url(#cm-pencil-cursor); }
    .st { letter-spacing: 0.01em; }`,
  mount(els) {
    /* paper: two layers of grain plus faint fibres */
    const paper = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='320' height='320' filter='url(%23p)'/%3E%3C/svg%3E")`;
    els.bg.style.backgroundImage = paper;
    const defs = CM.svg('svg', els.stage, { width: 0, height: 0 });
    defs.style.position = 'absolute';
    const pencil = (id, scale) => `
      <filter id="${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence class="boil" type="fractalNoise" baseFrequency="0.032" numOctaves="2" seed="1" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed="7" result="g"/>
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 1.62" result="ga"/>
        <feComposite in="d" in2="ga" operator="in"/>
      </filter>`;
    defs.innerHTML = pencil('cm-pencil', 3.4) + pencil('cm-pencil-cursor', 2.2);
    this.boilEls = [...defs.querySelectorAll('.boil')];
    els.cursor.innerHTML = `<path d="M3 2.5 L3 24 L8.6 18.9 L12.4 27.4 L16.1 25.8 L12.4 17.6 L20 17.4 Z" fill="${this.vars.accent2}" stroke="${this.vars.line}" stroke-width="2" stroke-linejoin="round"/>`;
  },
  frame(t) {
    const seed = 1 + (Math.floor(t * this.boil + 1e-6) % 4);
    this.boilEls.forEach(e => e.setAttribute('seed', seed));
    return {};
  },
  surface(el, m) {
    const v = this.vars;
    const s = CM.rgb(v.surface), a = CM.rgb(v.accent), k = CM.rgb(v.ink);
    const fill = CM.mix(CM.mix(s, a, m.a), k, m.k);
    const hatch = CM.mix(CM.mix(CM.rgb(v.hatch), [168, 52, 46], m.a), [20, 18, 16], m.k);
    el.style.background = `repeating-linear-gradient(-38deg, ${CM.css(hatch, 0.28)} 0 1.6px, transparent 1.6px 7px), ${CM.css(fill)}`;
    el.style.boxShadow = `inset 0 0 0 3px ${v.line}, 5px 6px 0 rgba(47,43,40,0.16)`;
  },
});
