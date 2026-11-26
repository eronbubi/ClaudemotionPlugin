"""Mix the song segment with the UI sounds.

  python mix.py --song audio/song.mp3 --beats beats.json --start-beat 24 --events out/events.json --out out/mix.wav
  python mix.py --song voice_and_music.wav --start 0 --events out/events.json --out out/mix.wav --snap none

--start-beat N   start on beat N of the grid (use a downbeat); or --start S seconds
--snap onset     check the grid against measured transients and shift the song so
                 they line up (median of the attack cluster); on-beat cues are then
                 placed on the measured transient within +-8 ms
--snap kick      same with the kick band (< 160 Hz) instead of broadband attacks
--snap none      place every cue on its timeline time (long format without a grid)

Loop pages (events.json "loop": true): cues that start before 0 wrap to the end.
Otherwise the song gets a fade-out (--fade-out, default 1.5 s) when it is cut.
"""
import argparse
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sounds import BANK, SR  # noqa: E402


def decode(path, start, dur):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, start):.5f}", "-i", str(path), "-t", f"{dur:.5f}",
                          "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    if start < 0:  # pad silence before the file start
        x = np.concatenate([np.zeros((int(-start * SR), 2)), x])
    n = int(round(dur * SR))
    if len(x) < n:
        x = np.concatenate([x, np.zeros((n - len(x), 2))])
    return x[:n]


def envelope(x, kind):
    F = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    if kind == "kick":
        F[f > 160] = 0
        win = 353
    else:
        F[f < 1000] = 0
        win = 177
    y = np.fft.irfft(F, len(x))
    e = np.convolve(y * y, np.hanning(win), mode="same")
    return np.diff(e, prepend=0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--song")
    ap.add_argument("--beats")
    ap.add_argument("--start-beat", type=int)
    ap.add_argument("--start", type=float)
    ap.add_argument("--events", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--snap", choices=["onset", "kick", "none"], default="onset")
    ap.add_argument("--music-gain", type=float, default=0.82)
    ap.add_argument("--normalize", type=float, default=0.89, help="song peak before mixing (0 = keep)")
    ap.add_argument("--fade-out", type=float, default=1.5)
    ap.add_argument("--ui-gain", type=float, default=1.0, help="UI sound level; about 0.6 under a voice")
    a = ap.parse_args()

    cues = json.loads(Path(a.events).read_text())
    T, loop = cues["T"], cues.get("loop", True)
    n = int(round(T * SR))
    pad = int(0.05 * SR)
    g = json.loads(Path(a.beats).read_text()) if a.beats else None
    B = g["beat_s"] if g else None
    if a.start_beat is not None:
        start = g["beats"][a.start_beat] if "beats" in g else g["first_beat"] + a.start_beat * B
    else:
        start = a.start or 0.0

    song = np.zeros((n, 2))
    shift = 0.0
    if a.song:
        song = decode(a.song, start - 0.05, T + 0.1)
        if a.snap != "none" and B:
            env = envelope(song.mean(axis=1), a.snap)
            offs = []
            for b in range(1, int(T / B)):
                c = pad + int(round(b * B * SR))
                w = int(0.035 * SR)  # the centered grid is within this; wider windows catch pre-kick bass
                seg = env[max(0, c - w):c + w]
                if len(seg) == 2 * w and seg.max() > 0.2 * env.max():
                    offs.append((int(np.argmax(seg)) - w) / SR)
            if offs:
                offs = np.array(offs)
                vals, counts = np.unique(np.round(offs * 1000), return_counts=True)
                mode = vals[np.argmax(counts)] / 1000
                shift = float(np.median(offs[np.abs(offs - mode) < 0.004]))
                print(f"grid vs transients: n={len(offs)} attack cluster {shift * 1000:+.2f} ms "
                      f"(all: median {np.median(offs) * 1000:+.2f} ms)")
                if abs(shift) > 0.03:
                    print("WARNING: the cluster sits at the edge of the search window; check the grid with a "
                          "spectrogram or try the other --snap mode before trusting this shift")
                song = decode(a.song, start + shift - 0.05, T + 0.1)
        song = song[pad:pad + n].copy()
        if a.normalize and np.max(np.abs(song)) > 0:
            song *= a.normalize / np.max(np.abs(song))
        fi = int(0.004 * SR)
        song[:fi] *= np.linspace(0, 1, fi)[:, None]
        if not loop and a.fade_out > 0:
            fo = int(a.fade_out * SR)
            song[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).with_name("audio_start.txt").write_text(f"{start + shift:.5f}")

    env = envelope(song.mean(axis=1), a.snap if a.snap != "none" else "onset") if a.song else None
    ui = np.zeros(n)
    snapped = []
    for ev in cues["events"]:
        snd, lvl = BANK[ev["type"]]
        target = ev["t"]
        if env is not None and a.snap != "none" and B and abs(ev["beat"] - round(ev["beat"])) < 0.01:
            c = int(round(target * SR))
            w = int(0.008 * SR)
            lo, hi = max(0, c - w), min(n, c + w)
            if hi > lo:
                k = lo + int(np.argmax(env[lo:hi]))
                snapped.append((k - c) / SR * 1000)
                target = k / SR
        at = int(round(target * SR)) - int(np.argmax(np.abs(snd)))
        idx = np.arange(len(snd)) + at
        if loop:
            idx %= n
            np.add.at(ui, idx, snd * lvl * ev.get("gain", 1))
        else:
            ok = (idx >= 0) & (idx < n)
            np.add.at(ui, idx[ok], snd[ok] * lvl * ev.get("gain", 1))
    mix = song * a.music_gain + a.ui_gain * ui[:, None]
    peak = float(np.max(np.abs(mix)))
    if peak > 0.97:
        mix *= 0.97 / peak
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    with wave.open(str(a.out), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    if snapped:
        s = np.array(snapped)
        print(f"on-beat cues snapped: {len(s)}, offset ms min {s.min():+.2f} max {s.max():+.2f}")
    print(f"cues={len(cues['events'])} peak before limit={peak:.3f} length={n / SR:.3f} s -> {a.out}")


if __name__ == "__main__":
    main()
