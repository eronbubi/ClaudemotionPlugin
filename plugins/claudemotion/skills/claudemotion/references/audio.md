# Audio

## Song
- The user's own file, or a royalty-free track (Mixkit and similar, free for commercial use). Downloading needs the user's OK. A screen capture works too: `ffmpeg -i capture.mp4 -vn -ac 2 -ar 44100 song.wav`.
- Commercial tracks: tell the user once that platforms may claim or mute the video.
- `analyze.py` prints BPM, the first beat, where the music starts and ends, and an energy digit per beat. Slowed or half-time tracks: check whether the BPM is half or double what you hear (`--min-bpm/--max-bpm`).
- Look at a spectrogram when the structure is unclear: `ffmpeg -i song.wav -lavfi showspectrumpic=s=1800x400:fscale=log:stop=8000 spec.png`.

## Grid accuracy
- The grid from spectral flux can sit a few ms to ~25 ms off the audible attacks. `mix.py --snap onset` measures the broadband attacks around every beat, takes the median of the attack cluster (most common offset, +-4 ms) and shifts the song start by it. Check its printout: the cluster should be tight.
- Default `--snap onset` (> 1 kHz attacks: claps, snares, hats). It is the most reliable, especially on bass-heavy tracks (808s, phonk, trap) where long bass tails smear the kick band.
- `--snap kick` only when onset finds too few transients (it prints `n=`); in tests the two modes disagreed by about 15 ms on a techno track, so if the result matters, compare both and check a spectrogram.
- If the printout warns that the cluster sits at the window edge, the grid itself is off: re-run analyze.py with tighter `--min-bpm/--max-bpm` or check for half/double tempo.

## UI sounds
- `sounds.py` synthesises everything (no downloads): click, toggle, check, key, whoosh, pop, grab, drop, detent, move, capture, boing, whistle_up, whistle_down, scribble, chime.
- Each sound is placed by its own peak, so the attack lands on the cue. On-beat cues snap to the measured transient within +-8 ms.
- The page's `soundEvents()` returns `{ t, beat, type, gain }`. One event per visible action: clicks, toggles, landings, reveals, morphs (whoosh, gain about 0.5), counters (a soft detent per step).
- Loops: cues before 0 wrap to the end. Non-loop videos: the song gets a fade-out when it is cut.

## Mixing
- The song is normalized to a 0.89 peak and mixed at 0.82; UI sounds sit on top; a limiter scales the mix if the peak passes 0.97.
- `mux.py` applies `atempo = T / seconds` when the loop was time-scaled to a round length.
