"""Beat grid and song structure with numpy.

  python analyze.py song.mp3 beats.json [--min-bpm 70 --max-bpm 180]

Writes: bpm, beat_s, first_beat, every beat time, downbeats (best guess),
per-beat RMS (to find intro, drop, breaks and the end of the music) and
the start of the music after leading silence.

Times are frame centers (the STFT window is centered), so the grid is not
early by half a window. Still verify against measured transients in mix.py.
"""
import argparse
import json
import subprocess

import numpy as np

SR = 22050
HOP = 256
N = 1024


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def stft_mag(x):
    win = np.hanning(N).astype(np.float32)
    frames = 1 + (len(x) - N) // HOP
    idx = np.arange(N)[None, :] + HOP * np.arange(frames)[:, None]
    return np.abs(np.fft.rfft(x[idx] * win, axis=1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("song")
    ap.add_argument("out")
    ap.add_argument("--min-bpm", type=float, default=70)
    ap.add_argument("--max-bpm", type=float, default=180)
    a = ap.parse_args()

    x = decode(a.song)
    S = np.log1p(10 * stft_mag(x))
    freqs = np.fft.rfftfreq(N, 1 / SR)
    flux = np.maximum(0, np.diff(S, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux -= np.convolve(flux, np.ones(16) / 16, mode="same")
    flux = np.maximum(flux, 0)
    fps = SR / HOP
    center = (N / 2) / SR  # frame f covers samples f*HOP .. f*HOP+N; its center is +N/2

    ac = np.correlate(flux, flux, mode="full")[len(flux) - 1:]
    lags = np.arange(len(ac))
    bpm_of_lag = 60 * fps / np.maximum(lags, 1)
    mask = (bpm_of_lag > a.min_bpm) & (bpm_of_lag < a.max_bpm)
    lag = lags[mask][np.argmax(ac[mask])]
    best = None
    for period in np.linspace(lag - 1.5, lag + 1.5, 301):
        for phase in np.linspace(0, period, 64, endpoint=False):
            pos = np.arange(phase, len(flux) - 1, period)
            score = np.interp(pos, np.arange(len(flux)), flux).sum() / len(pos)
            if best is None or score > best[0]:
                best = (score, period, phase)
    _, period, phase = best
    bpm = 60 * fps / period
    beat_s = period / fps
    beats = np.arange(phase, len(flux) - 1, period) / fps + center

    low = S[:, freqs < 150].sum(axis=1)
    acc = np.zeros(4)
    for i, b in enumerate(beats):
        f = int(round((b - center) * fps))
        acc[i % 4] += low[f:f + 4].mean() if f + 4 < len(low) else 0
    down_off = int(np.argmax(acc))

    rms = []
    for b in beats:
        s0, s1 = int(b * SR), int((b + beat_s) * SR)
        seg = x[s0:s1]
        rms.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
    rms = np.array(rms)
    loud = rms > 0.15 * rms.max()
    first_music = int(np.argmax(loud)) if loud.any() else 0
    last_music = int(len(loud) - 1 - np.argmax(loud[::-1])) if loud.any() else len(loud) - 1

    res = {
        "bpm": float(bpm), "beat_s": float(beat_s), "first_beat": float(beats[0]),
        "beats": [float(b) for b in beats], "downbeat_offset": down_off,
        "downbeats": [float(d) for d in beats[down_off::4]],
        "beat_rms": [round(float(r), 5) for r in rms],
        "first_music_beat": first_music, "last_music_beat": last_music,
        "duration": len(x) / SR,
    }
    with open(a.out, "w") as f:
        json.dump(res, f, indent=1)
    print(f"bpm={bpm:.3f} beat={beat_s * 1000:.2f} ms first_beat={beats[0]:.3f} s downbeat_offset={down_off}")
    print(f"music from beat {first_music} ({beats[first_music]:.2f} s) to beat {last_music} ({beats[last_music]:.2f} s), file {len(x) / SR:.2f} s")
    peak = rms.max() or 1
    print("energy per beat (0-9):", "".join(str(min(9, int(10 * r / peak))) for r in rms))


if __name__ == "__main__":
    main()
