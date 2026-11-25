# Long format: 16:9, 1920x1080, 60 fps

For explainers, launches, walkthroughs and anything from about 30 s to several minutes. It does not have to follow the beat.

## Page setup
- `render.py ... --mode long` sets 1920x1080 and `mode=long` (no loop). Use `beat=1` so one unit is one second, or keep the beat grid if the music should drive the cut.
- `CM.timeline(<seconds>)`. In non-loop pages `SEQ` must start at unit 0 with the opening state; the shape ends wherever the last state is (no wrap).
- Camera fit uses the 16:9 frame automatically (`CM.W`, `CM.H`); wide states (side-by-side panels, timelines) suit the format.

## Structure
- Write a scene list in seconds: `time | scene | on-screen text | what moves | sound`. Show it to the user before code.
- Chapters of 6-20 s. Inside a chapter the one-shape rule holds (morph, never cut). Between chapters a deliberate transition is allowed: the shape shrinks to a dot or logo and grows into the next chapter, or a full-frame wipe in the style's colors.
- Pacing: something moves at least every 1-2 s, but text needs reading time - hold a finished line about 1 s plus 0.3 s per word.
- Beat sync is optional. With music, snap big moments (chapter starts, reveals, results) to the nearest downbeat and let everything else follow the scene timing. Without a grid use `mix.py --snap none`.
- Voice-over: if the user brings one, time scenes to its sentences (measure with silence detection: `ffmpeg -af silencedetect=n=-35dB:d=0.25`), duck the music under speech, and keep on-screen text shorter than the spoken line.
- Long videos do not loop. End on a final card (logo, CTA) that holds at least 2 s, and fade the music (`mix.py --fade-out`).

## Review
- `render.py sheet --mode long --step 2` (one frame every 2 units) for an overview, then `render.py times ...` around every transition and every text reveal.

## Render time
About 11 finished frames per second with 4 workers at 1920x1080 and 4 subframes: 1 minute is 3600 frames, about 5.5 minutes. For drafts use `--fps 30 --sub 2` (about 4x faster), final always 60 fps.
