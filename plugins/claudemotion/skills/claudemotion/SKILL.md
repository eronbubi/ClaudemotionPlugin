---
name: claudemotion
description: Make motion-graphics videos as code - Dribbble-level UI motion, product launches, promos, explainers - rendered to MP4 with music and synced UI sounds. One morphing shape, closed-form springs, a pure seek(t) page rendered by Playwright with motion blur. Short beat-synced loops (1440x1440), long-format 16:9 videos (1920x1080, 60 fps) that do not have to follow the beat, or edit mode - the user's own footage cut and finished with titles, lower thirds, captions and transitions. Four looks - standard, drawn (colored pencil), glass, funny. Use whenever the user asks for a motion video, UI animation, launch or promo video, "mach ein Video", "Claudemotion", wants a video in one of these styles, or wants their clips cut and edited with motion graphics ("schneide mein Video", "edit this footage").
---

# Claudemotion

Videos are web pages whose every pixel is a pure function of time, rendered frame by frame. This skill holds the whole pipeline: engine, four styles, beat analysis, renderer, sound bank, mixer and muxer. Everything lives next to this file:

- `templates/engine/engine.js` - springs, tracks, the morphing shape, camera, presence, cursor
- `templates/engine/styles/{standard,drawn,glass,funny}.js` - the four looks
- `templates/engine/edit.js` - edit mode: edit decision list, footage player with transitions, punch-ins, speed ramps, word-by-word captions
- `templates/demo.html` - a working page that shows the engine API (read it for the technique, never copy its story: button click, toggle, chart, toast is just a test sequence); `templates/edit.html` does the same for edit mode
- `scripts/check_env.py`, `analyze.py`, `render.py`, `sounds.py`, `mix.py`, `mux.py`, `history.py`; edit mode adds `footage.py` (clips to frames + sound), `transcribe.py` (word times, optional) and `edit_audio.py` (sound that follows the cut, voice-over, ducked music)
- `references/` - read the ones the job needs:
  - `structures.md` - **read for every video**: archetypes, openers, camera languages, transitions, endings, pacing, the variety checklist
  - `workflow-short.md` - beat-synced square loop (the classic)
  - `workflow-long.md` - long format 16:9, scenes in seconds, beat sync optional
  - `workflow-edit.md` - edit mode: the user's footage, cut and finished as code
  - `publish-youtube.md` - publishing the finished video on YouTube through the built-in browser
  - `styles.md` - what each style looks and moves like, its rules and its bans
  - `audio.md` - beat grid, sound placement, mixing, the known traps
  - `gotchas.md` - mistakes already made once; check before every review
  - `example-prompt.md` - the reference brief this pipeline was built from

## The workflow (follow it every time)

1. **Setup check.** Run `python <skill>/scripts/check_env.py`. If something is missing, show the user the exact fix commands and ask before installing anything.
2. **Ask first, build later.** Never write code before the user has answered. Use AskUserQuestion (max 4 questions per call, ask again if more is open). Always settle:
   - format: short loop (1440x1440, beat-synced), long format (1920x1080 16:9, 60 fps) or edit mode (the user's clips; follow `workflow-edit.md`)
   - style: standard / drawn / glass / funny
   - content: the UI states or scenes, product name, the facts to show, the end text or CTA
   - colors (per style defaults otherwise), the song (the user's file, or a royalty-free track; downloading needs the user's OK), length
   - Anything you would otherwise invent (names, numbers, logos, URLs, dates) - ask or mark it as a placeholder.
3. **Pick a concept that is new.** Read `references/structures.md` and run `python <skill>/scripts/history.py show`. Build 2-3 contrasting concepts (archetype + opener + camera language + ending) that repeat nothing from the last two videos, fitted to the content, and let the user choose with AskUserQuestion (your recommendation first). The cursor-clicks-a-button opener and the cards-in-a-row walkthrough are only one option among many.
4. **Analyze the music** (`analyze.py`), find intro, drop, breaks and the end of the music, and pick the segment. Let the music shape the pacing curve (build, drop-centered, wave ...).
5. **Show the plan before code**: a table of states/scenes on the beat grid (short) or on the timeline in seconds with the musical anchors (long), with the chosen archetype, opener, camera, transitions and ending named. Run the variety checklist from `structures.md` on it. Wait for OK or changes.
6. **Build the page** in the project folder: copy `templates/engine/` next to the page and write the page for the chosen concept, using the engine API as shown in `templates/demo.html` (camera pans: `CM.panAt`, tilts: `CM.tiltAt`, kicks: `CM.kickAt`; full-frame states: a DEF entry as large as the frame with `zoom: 1`). Every style is computed inside `seek(t)`.
7. **Review frames before the full render**: `render.py sheet` (one frame per beat or per second) and look at every contact sheet. Fix anything off the grid, cramped, clipped, overlapping or hard to read. Check `gotchas.md`. For loops run `render.py loopcheck` (max diff must be 0).
8. **Render** `render.py full` in the background, then `render.py events`, `mix.py`, `mux.py`.
9. **Deliver** to the user's output folder (default: the Downloads folder) and verify the file with ffprobe and two or three extracted frames. Record the concept with `history.py add` (title, archetype, opener, camera, ending, style, format). Report path, resolution, fps, length, size, what was checked, and every placeholder you invented.
10. **Publish** (the user's standing wish: every finished video goes on YouTube unless they say no): right after delivery, follow `references/publish-youtube.md`. Ask the publish questions (visibility with "No" as an option, title, description); on any answer other than "No", open YouTube Studio in the built-in browser, let the user sign in and drag the file in, fill in the details and publish with the approved visibility. `/claudemotion:publish` runs this step on its own.

## Rules that hold in every style

- Pure `seek(t)`: no CSS transitions, animations, timers or state between frames.
- Springs are closed-form step responses; a value that changes target many times is a `CM.Track` (sum of springs). Loops wrap the previous loop's tail so frame T equals frame 0.
- One shape, never cut (long format may cut between chapters with a deliberate transition, see `workflow-long.md`).
- No two videos in a row open the same way or follow the same story shape (`history.py show`). The cursor appears only when the story needs it.
- Text that swaps inside the morphing shape has its own enter and exit timing (`CM.states` + presence does this; per-word reveals use `CM.reveal`).
- Never `will-change` on anything the camera scales.
- No dead time: something moves on every beat (short) or every 1-2 s (long), but leave reading time for text.
- Facts only from the user. Placeholders are named as placeholders in the final report.
- Music the user supplies from a commercial track: mention once that platforms may claim or mute it when posted.
