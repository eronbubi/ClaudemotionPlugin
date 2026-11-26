"""Sound bed for edit pages and voice-over videos.

Builds the dialogue track from the edit segments (the clips' own sound, cut,
time-stretched and cross-faded exactly like the picture), adds an optional
voice-over, and lays music under both that ducks while anyone speaks. The UI
sounds are added afterwards by mix.py with this bed as --song.

  python edit_audio.py --events out/events.json --out out/bed.wav
         [--footage footage/footage.json] [--voice vo/voice.wav]
         [--music audio/song.mp3 --music-start 10 --music-level 0.14 --duck 0.68]
         [--dip 30.4-32.0 ...] [--fade-out 3]

events.json comes from `render.py events`; edit pages put their segments in
it (window.editAudio). Speed ramps use their average speed for the sound.
"""
import argparse
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000


def decode(path, start=0.0, dur=None, af=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start > 0:
        cmd += ["-ss", f"{start:.4f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.4f}"]
    cmd += ["-i", str(path)]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def fit(x, n):
    return x[:n] if len(x) >= n else np.concatenate([x, np.zeros((n - len(x), 2))])


def atempo(speed):
    parts = []
    while speed < 0.5:
        parts.append(0.5)
        speed /= 0.5
    while speed > 100:
        parts.append(100.0)
        speed /= 100
    parts.append(speed)
    return ",".join(f"atempo={p:.6f}" for p in parts if abs(p - 1) > 1e-6) or None


def env_follow(x, attack, release):
    blk = int(0.01 * SR)
    n = len(x) // blk + 1
    pad = np.zeros(n * blk)
    pad[:len(x)] = np.abs(x)
    lvl = pad.reshape(n, blk).max(axis=1)
    out = np.zeros(n)
    ka, kr = np.exp(-0.01 / attack), np.exp(-0.01 / release)
    v = 0.0
    for i, l in enumerate(lvl):
        k = ka if l > v else kr
        v = k * v + (1 - k) * l
        out[i] = v
    return np.repeat(out, blk)[:len(x)]


def ramp(n, t0, t1, a, b):
    t = np.arange(n) / SR
    p = np.clip((t - t0) / max(1e-6, t1 - t0), 0, 1)
    return a + (b - a) * (0.5 - 0.5 * np.cos(np.pi * p))


def dialogue(segs, foot, root, n):
    out = np.zeros((n, 2))
    edge = int(0.008 * SR)
    for s in segs:
        if s.get("mute"):
            continue
        c = foot["clips"][s["clip"]]
        play = int(round(s["play"] * SR))
        x = decode(root / c["dir"] / "audio.wav", s["in"] - c["start"], s["out"] - s["in"], atempo(s["speed"]))
        x = fit(x, play) * s.get("gain", 1)
        fi, fo = max(edge, int(s["fadeIn"] * SR)), max(edge, int(s["fadeOut"] * SR))
        x[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi))[:, None] ** 2 if fi > edge else np.linspace(0, 1, fi)[:, None]
        x[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))[:, None] ** 2 if fo > edge else np.linspace(1, 0, fo)[:, None]
        a = int(round(s["start"] * SR))
        b = min(n, a + play)
        if b > a:
            out[a:b] += x[:b - a]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--events", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--footage", default="footage/footage.json")
    ap.add_argument("--voice")
    ap.add_argument("--voice-gain", type=float, default=1.0)
    ap.add_argument("--music")
    ap.add_argument("--music-start", type=float, default=0.0)
    ap.add_argument("--music-level", type=float, default=0.14, help="music peak with nobody speaking")
    ap.add_argument("--duck", type=float, default=0.68, help="fraction of the music removed under speech")
    ap.add_argument("--dip", action="append", default=[], help="a-b seconds: music nearly silent there (repeatable)")
    ap.add_argument("--fade-out", type=float, default=3.0)
    a = ap.parse_args()

    ev = json.loads(Path(a.events).read_text())
    T = ev["T"]
    n = int(round(T * SR))
    speech = np.zeros((n, 2))
    if ev.get("clips"):
        fp = Path(a.footage)
        speech += dialogue(ev["clips"], json.loads(fp.read_text(encoding="utf-8")), fp.parent.parent, n)
    if a.voice:
        speech += fit(decode(a.voice), n) * a.voice_gain
    bed = speech.copy()
    if a.music:
        m = fit(decode(a.music, a.music_start, T), n)
        m *= a.music_level / max(1e-9, np.max(np.abs(m)))
        g = np.ones(n)
        if np.max(np.abs(speech)) > 1e-4:
            env = env_follow(speech.mean(axis=1), 0.06, 0.7)
            ref = np.percentile(env[env > 0.01], 90) if np.any(env > 0.01) else 1.0
            g *= 1 - a.duck * np.clip(env / ref, 0, 1)
        for d in a.dip:
            t0, t1 = (float(v) for v in d.split("-"))
            g *= np.minimum(1, ramp(n, t0 - 0.05, t0 + 0.05, 1, 0.08) * ramp(n, t1 - 0.15, t1 + 0.6, 1, 1 / 0.08))
        if a.fade_out > 0:
            g *= ramp(n, T - a.fade_out, T - 0.05, 1, 0)
        bed += m * g[:, None]
    peak = float(np.max(np.abs(bed))) if n else 0.0
    if peak > 0.97:
        bed *= 0.97 / peak
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(a.out, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(bed, -1, 1) * 32767).astype("<i2").tobytes())
    print(f"bed {T:.2f}s: {len(ev.get('clips') or [])} edit segments, voice {'yes' if a.voice else 'no'}, "
          f"music {'yes' if a.music else 'no'}, peak {peak:.3f} -> {a.out}")


if __name__ == "__main__":
    main()
