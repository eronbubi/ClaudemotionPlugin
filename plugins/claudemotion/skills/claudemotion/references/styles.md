# Styles

Pick with `?style=<name>` (render.py `--query "style=<name>"`). Every style file is in `templates/engine/styles/`. Colors live in the style's `vars`; pages use `var(--ink)`, `var(--muted)`, `var(--soft)`, `var(--line)`, `var(--accent)`, `var(--accent-ink)`, `var(--surface)` so the same page works in every style. To change a palette for one video, set the style's `vars` before `CM.mount()` (for example `CM.styles.standard.vars.accent = '#2E6BFF'`); after mounting the colors are fixed.

## standard (default)
Dribbble-level UI motion. Warm-gray canvas with a dot grid, white components, black ink, at most one accent. Geist. Springs with a tiny overshoot at most (morph z 0.82), content swaps with a 5 px blur.
Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, mismatched icon strokes, dead time, anything template-like.

## drawn
Everything looks painted with colored pencils on paper. Paper grain background, outlines that wobble and "boil" (the displacement noise changes 8 times a second), diagonal pencil hatching inside fills, a soft offset paper shadow, the handwritten font Gaegu, a pencil palette (red, blue, green, yellow on graphite). Motion is animated on ones at 24 fps (`timeStep`), content swaps with a small jump instead of a blur.
Do: hand-drawn icons (slightly uneven strokes are fine), underline scribbles, circled numbers, arrows drawn in with stroke-dashoffset. Sounds: `scribble` for draw-ons, `click`/`pop` softer.
Avoid: perfect geometric gradients, glass effects, thin 1 px lines (they vanish under the wobble).

## glass
Frosted glass panels over slowly drifting colored light (violet, cyan, pink, blue). Translucent surfaces with `backdrop-filter: blur(30px) saturate(175%)`, a bright 1 px rim, a soft top highlight, deep soft shadow. White text. Calm, critically damped motion (morph z 0.9, swaps with a 10 px blur). Gradients are allowed for the light behind the glass.
Do: stacked panels, chips as smaller glass, numbers that count up. Sounds: `chime` for reveals.
Avoid: glows and neon, hard black outlines, bouncy motion. `backdrop-filter` only blurs what is painted behind it - keep the light in `#bg`, never set `filter`/`opacity` on `#cam` (it would isolate the backdrop).

## funny
Everything a bit too much. Cream background with big polka dots, chunky 5 px black outlines with hard offset shadows, loud pink/cyan/lime/orange, the rounded font Baloo 2. Bouncy springs (morph z 0.5, pops z 0.42), squash and stretch on every impact and from the morph velocity, screen shake after impacts, googly eyes on the shape that follow the cursor and blink, confetti bursts (`CM.style.bursts.push({ t, x, y })`).
Humor lives in the copy too: playful labels ("Dark mode (spooky)", "Saved! You legend"), emoji allowed, exaggerated numbers only if the user's facts allow it. Sounds: `boing`, `whistle_up`, `whistle_down`, `pop`.
Avoid: anything that makes the real information unreadable; keep the punchline short.

## Adding a style
Copy `standard.js`, rename, and adjust `vars`, `font`, `morph`, `spring`, `pop`, `swap`, `timeStep`, `mount`, `frame`, `surface`, `after`. Load it in the page with another `<script>` tag.
