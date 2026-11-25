# Gotchas (each one happened once)

- **Fonts never load in hidden elements.** Content in `display:none` states does not trigger a font load, so the first render falls back. `CM.ready()` loads every weight explicitly; the renderer refuses to start if it fails.
- **Font loading races the stylesheet.** Before the font CSS is parsed, `document.fonts.load()` finds no faces and resolves at once. `CM.ready()` waits for the style's stylesheet first. Extra families used on the page (for example style tiles in another look) go in as `CM.ready(['700 Gaegu', '800 Baloo 2'])`.
- **Font names with digits or spaces must be quoted** in CSS (`"Baloo 2"`); unquoted, the whole `font-family` is invalid and the page falls back to a serif font. The engine quotes `--font`.
- **Stroke draw-ons break the loop.** A path with `stroke-dasharray: 1 1` and offset 0 is not pixel-identical to a path without dashes. When the draw-on is finished, set `strokeDasharray = 'none'`.
- **Mid-gray flashes** during dark to light morphs: the color spring was too slow. Color tracks use w 34, z 1.
- **Hover highlights one beat late:** hover reacts when the cursor arrives, not on the next beat. Start hover tracks as the cursor reaches the target.
- **Text swaps overlap** when old and new text share a place (move tickers, counters): the old one must be gone before the new one lands (exit about 0.1 s before, enter on the beat).
- **Text near the card edge gets clipped.** Keep 40-48 px padding inside cards; compute left edges from half the card width.
- **Loop check:** frame 0 and frame T must have max diff 0, and the cursor must have the same position and speed at both ends (`render.py loopcheck`). Background motion (glass light) must complete whole cycles per loop.
- **Non-loop pages** start at unit 0 with their first state in `SEQ`; otherwise the shape starts with no content.
- **Windows multiprocessing:** render workers are fresh interpreters; the renderer passes its arguments explicitly.
- **4 subframes** show faint ghost copies on very fast motion; 8 subframes halve them at double render time. Mention it when relevant.
- **Spinner/blur on `#cam`**: never put `filter`, `opacity` or `will-change` on `#cam` in glass (isolates the backdrop) or in any style (blurry text when scaled). The drawn style's pencil filter on `#cam` is the one deliberate exception.
