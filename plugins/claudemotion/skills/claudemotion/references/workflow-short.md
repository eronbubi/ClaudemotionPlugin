# Short format: beat-synced square loop

1440x1440, 60 fps, 4 subframes (motion blur), seamless loop. Typically 16-64 beats (8-30 s).

## Plan
- Analyze: `python scripts/analyze.py song.mp3 beats.json`. Read the energy line: low = intro or break, high = groove. Start on a downbeat at a strong section; prefer a segment whose end leads back into its start (a break before a drop loops well).
- Units are beats. Page: `?beat=<beat_s>` and `CM.timeline(<beats>)`.
- Something happens on every beat. Big moments (morph to a new state, a result, a reveal) land on downbeats; typing and small ticks on 8ths, 16ths or 32nds.
- Show the plan as a table `beat | state | what happens` before writing code.

## Build
- `DEF` = states with `{ w, h, r, tone }`, `SEQ` = `[[state, beat], ...]`. In a loop the first state of the loop is the last `SEQ` entry; it wraps to t = 0.
- Clicks: cursor arrives, mouse-down 70 ms before the beat, up on the beat (`CM.pressTrack`). Add every click to `CM.impacts`.
- Two-spring edges (tab indicators, toggle knobs, segmented controls): the leading edge rides a stiffer spring than the trailing edge, so it stretches ahead. See the toggle in `templates/demo.html`.
- Drags are direct manipulation: while held, the value is computed from the cursor position (rubber-band past the ends: `max + k * log(1 + over / k)`); on release it springs back from where it was.
- Camera zooms per state (fit) and may kick (`CM.kickAt`) on impacts.
- Expose `curX/curY` so `loopcheck` can compare cursor position and speed at 0 and T.

## Render
```
python scripts/render.py sheet     --page video.html --out out --query "beat=0.4687&style=standard"
python scripts/render.py loopcheck --page video.html --out out --query "beat=0.4687&style=standard"
python scripts/render.py full      --page video.html --out out --query "beat=0.4687&style=standard" --seconds 30
python scripts/render.py events    --page video.html --out out --query "beat=0.4687&style=standard"
python scripts/mix.py --song audio/song.mp3 --beats beats.json --start-beat 24 --events out/events.json --out out/mix.wav
python scripts/mux.py --video out/video.mp4 --audio out/mix.wav --timing out/timing.json --dest "%USERPROFILE%/Downloads/Name.mp4"
```
`--seconds` time-scales the loop to a round length; `mux.py` applies the same factor to the audio with atempo.
Throughput reference: about 11 finished frames per second with 4 workers at 1440x1440 (30 s = about 3 min).
