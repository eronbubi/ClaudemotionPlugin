---
name: claudemotion
description: Make motion-graphics videos as code - Dribbble-level UI motion, product launches, promos, explainers - rendered to MP4 with music and synced UI sounds. One morphing shape, closed-form springs, a pure seek(t) page rendered by Playwright with motion blur. Short beat-synced loops (1440x1440) or long-format 16:9 videos (1920x1080, 60 fps) that do not have to follow the beat. Four looks - standard, drawn (colored pencil), glass, funny. Use whenever the user asks for a motion video, UI animation, launch or promo video, "mach ein Video", "Claudemotion", or wants a video in one of these styles.
---

# Claudemotion

Videos are web pages whose every pixel is a pure function of time, rendered frame by frame. This skill holds the whole pipeline: engine, four styles, beat analysis, renderer, sound bank, mixer and muxer. Everything lives next to this file:

- `templates/engine/engine.js` - springs, tracks, the morphing shape, camera, presence, cursor
- `templates/engine/styles/{standard,drawn,glass,funny}.js` - the four looks
- `templates/demo.html` - a working page that uses all of it (read it before writing a new page)
- `scripts/check_env.py`, `analyze.py`, `render.py`, `sounds.py`, `mix.py`, `mux.py`
- `references/` - read the ones the job needs:
  - `workflow-short.md` - beat-synced square loop (the classic)
  - `workflow-long.md` - long format 16:9, scenes in seconds, beat sync optional
  - `styles.md` - what each style looks and moves like, its rules and its bans
  - `audio.md` - beat grid, sound placement, mixing, the known traps
  - `gotchas.md` - mistakes already made once; check before every review
  - `example-prompt.md` - the reference brief this pipeline was built from

## The workflow (follow it every time)

1. **Setup check.** Run `python <skill>/scripts/check_env.py`. If something is missing, show the user the exact fix commands and ask before installing anything.
2. **Ask first, build later.** Never write code before the user has answered. Use AskUserQuestion (max 4 questions per call, ask again if more is open). Always settle:
   - format: short loop (1440x1440, beat-synced) or long format (1920x1080 16:9, 60 fps)
   - style: standard / drawn / glass / funny
   - content: the UI states or scenes, product name, the facts to show, the end text or CTA
   - colors (per style defaults otherwise), the song (the user's file, or a royalty-free track; downloading needs the user's OK), length
   - Anything you would otherwise invent (names, numbers, logos, URLs, dates) - ask or mark it as a placeholder.
3. **Analyze the music** (`analyze.py`), find intro, drop, breaks and the end of the music, and pick the segment.
4. **Show the plan before code**: a table of states/scenes on the beat grid (short) or on the timeline in seconds with the musical anchors (long). Wait for OK or changes.
5. **Build the page** in the project folder: copy `templates/engine/` next to the page, start from `templates/demo.html`. Every style is computed inside `seek(t)`.
6. **Review frames before the full render**: `render.py sheet` (one frame per beat or per second) and look at every contact sheet. Fix anything off the grid, cramped, clipped, overlapping or hard to read. Check `gotchas.md`. For loops run `render.py loopcheck` (max diff must be 0).
7. **Render** `render.py full` in the background, then `render.py events`, `mix.py`, `mux.py`.
8. **Deliver** to the user's output folder (default: the Downloads folder) and verify the file with ffprobe and two or three extracted frames. Report path, resolution, fps, length, size, what was checked, and every placeholder you invented.

## Rules that hold in every style

- Pure `seek(t)`: no CSS transitions, animations, timers or state between frames.
- Springs are closed-form step responses; a value that changes target many times is a `CM.Track` (sum of springs). Loops wrap the previous loop's tail so frame T equals frame 0.
- One shape, never cut (long format may cut between chapters with a deliberate transition, see `workflow-long.md`).
- Text that swaps inside the morphing shape has its own enter and exit timing (`CM.states` + presence does this; per-word reveals use `CM.reveal`).
- Never `will-change` on anything the camera scales.
- No dead time: something moves on every beat (short) or every 1-2 s (long), but leave reading time for text.
- Facts only from the user. Placeholders are named as placeholders in the final report.
- Music the user supplies from a commercial track: mention once that platforms may claim or mute it when posted.
