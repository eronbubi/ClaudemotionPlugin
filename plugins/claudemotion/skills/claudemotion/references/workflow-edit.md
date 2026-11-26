# Edit mode: real footage, cut and finished as code

For videos built from the user's own clips: talking heads, product demos, screen recordings, event footage, B-roll. The page cuts the footage (trims, speed ramps, freezes, transitions, punch-ins) and lays motion graphics over it (titles, lower thirds, callouts, captions, counters, end card). Default size 1920x1080 at 60 fps; 9:16 with `--w 1080 --h 1920`.

## Why frames, not `<video>`

The renderer seeks the page frame by frame. A `<video>` element cannot be seeked frame-accurately and synchronously, so frames come out late, doubled or black. `scripts/footage.py` unpacks every clip once into numbered JPEGs plus a WAV; the page shows the frame for a source time as an image. The page stays a pure function of t, and `render.py` awaits `CM.settle()` after every seek so each new frame is decoded before the shot.

## Steps

1. **Ask first** (AskUserQuestion), on top of the usual questions:
   - which clips, and what is in them (who speaks, what happens, the best moments with timestamps if the user knows them)
   - the cut: length, order, what must stay in, what can go; pacing (calm, punchy, montage on the beat)
   - graphics: titles, names and roles for lower thirds, captions yes/no, end card text, logo
   - sound: keep the clips' sound, voice-over, music under it
2. **Set up**: `init_project.py . --format edit`, then for every clip
   `python <skill>/scripts/footage.py add <file> --id <short-id> [--start s --end e]`.
   Trim with --start/--end when only part of a long recording is needed: frames cost disk space (about 0.2 MB per 1080p frame). Clips keep the times of the original file, so a timestamp the user mentions can be used directly.
3. **Look at the footage** before planning: extract a few frames per clip (`ffmpeg -ss <t> -i <file> -frames:v 1 shot.png`) and read the transcript if there is speech: `python <skill>/scripts/transcribe.py all` (faster-whisper; the first run downloads a model, ask the user first; `--model <local folder>` uses a model already on disk). The transcript gives word times for cut points and captions.
4. **Pick a concept** as always (`structures.md`, `history.py show`): opener, camera language, transitions, ending. Footage adds its own openers: cold open on the best moment, a freeze frame with a title, a quote from the clip as kinetic type.
5. **Show the plan before code**: an edit decision list as a table
   `timeline | clip | source in-out | speed | transition | graphics on top | sound`.
6. **Build the page** from `templates/edit.html` (read it for the API, not for the story):
   - `CM.edl([...])` the segments; `new CM.Cutter(cut)` puts the footage full-frame under the motion graphics; call `player.render(t)` in `seek(t)`.
   - Transitions: `cut` (default), `fade`, `dip` (to a color), `wipe`, `whip`, `zoom`, `circle`. Use at least two kinds, and plenty of hard cuts: a transition on every cut looks amateur.
   - Punch-ins and Ken Burns: `zoom: [1, 1.12]`, `focus: [x, y]` per segment. A 1.1-1.2 punch-in on a jump cut in a talking head hides the jump.
   - Speed: `speed: 0.5`, ramps `speed: [1, 2.5]`, freeze `hold: 1.2`.
   - Captions: `CM.captions(cut.words(), { y, size })`, render in `seek`. Keep them out of the bottom 20 % in 9:16.
   - The morphing shape and the camera work as usual for graphics on top; a zero-size first state keeps the shape hidden until it is needed (see the template). `CM.noShape()` if the page has no shape at all.
   - `window.editAudio = () => cut.audio()` so the sound follows the cut.
7. **Review** with `render.py sheet --mode long --query beat=1 --step 2` and `render.py times` around every cut and transition. Check that every segment shows the intended moment (wrong in/out points are the most common mistake), that faces are not cut off by punch-ins, and that text stays readable over bright footage (shadow or a backing plate).
8. **Render and sound**:
   ```
   python render.py full   --page edit.html --mode long --query beat=1 --out out
   python render.py events --page edit.html --mode long --query beat=1 --out out
   python edit_audio.py --events out/events.json --out out/bed.wav [--music audio/song.mp3 --music-start 0] [--voice vo/voice.wav]
   python mix.py --song out/bed.wav --start 0 --events out/events.json --out out/mix.wav --snap none --normalize 0 --music-gain 1 --fade-out 0 --ui-gain 0.6
   python mux.py --video out/video.mp4 --audio out/mix.wav --timing out/timing.json --dest ~/Downloads/Name.mp4 --loudnorm -16
   ```
   `edit_audio.py` cuts the clips' sound exactly like the picture (time-stretched with the segment speed, cross-faded over transitions, silence on freezes) and ducks the music under speech.
9. **Deliver** as usual and report placeholders (names, roles, invented titles).

## Limits

- No automatic tracking: graphics that follow a moving object need keyframes by hand (`CM.Track` on x and y, checked frame by frame).
- Color correction is basic: CSS filters on `player.root` or a layer (`brightness`, `contrast`, `saturate`), or prepare a graded copy with ffmpeg before `footage.py add`.
- Speed ramps use their average speed for the sound; mute ramped segments (`mute: true`) when the pitch change is noticeable.
- Frames take disk space; `footage.py remove <id>` deletes a clip's frames.
