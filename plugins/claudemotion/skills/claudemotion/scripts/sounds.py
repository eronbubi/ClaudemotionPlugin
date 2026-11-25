"""Synthesised UI sound bank (numpy only, no downloads).

Each entry is (samples at 44.1 kHz, default level). mix.py places every
sound by its own peak, so the audible attack lands exactly on the cue.
"""
import numpy as np

SR = 44100
_rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def hp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    px = py = 0.0
    for i, v in enumerate(x):
        py = a * (py + v - px)
        px = v
        y[i] = py
    return y


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def norm(x):
    return x / np.max(np.abs(x))


def noise(n):
    return _rng.standard_normal(n)


def click(f=3200, body=190):
    t = t_axis(0.06)
    s = 0.6 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006)
    s += 0.5 * hp(noise(len(t)), 2500) * np.exp(-t / 0.0025)
    s += 0.35 * np.sin(2 * np.pi * body * t) * np.exp(-t / 0.018)
    return norm(s)


def layered(a, b, off_s, gain=0.55):
    off = int(off_s * SR)
    out = np.zeros(max(len(a), off + len(b)))
    out[:len(a)] += a
    out[off:off + len(b)] += gain * b
    return norm(out)


def toggle():
    return layered(click(1700, 160), click(2600, 220), 0.016)


def check():
    t = t_axis(0.12)
    s = 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.03)
    s += 0.3 * np.sin(2 * np.pi * 3600 * t) * np.exp(-t / 0.02)
    c = click(3000, 200)
    s[:len(c)] += 0.6 * c[:len(s)]
    return norm(s)


def key():
    t = t_axis(0.03)
    s = 0.6 * hp(noise(len(t)), 3000) * np.exp(-t / 0.0018)
    s += 0.3 * np.sin(2 * np.pi * 4200 * t) * np.exp(-t / 0.004)
    return norm(s)


def whoosh():
    t = t_axis(0.32)
    rise = 0.22
    env = np.where(t < rise, (t / rise) ** 2.2, np.exp(-(t - rise) / 0.035))
    return norm(lp(hp(noise(len(t)), 300), 2200) * env)


def pop():
    t = t_axis(0.25)
    f = 520 + 260 * (1 - np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm((np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.002)))


def tone(f, tau, n=0.25):
    t = t_axis(0.06)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    s += n * hp(noise(len(t)), 2000) * np.exp(-t / 0.002)
    return norm(s)


def knock(f, tau, nz=0.5):
    t = t_axis(0.09)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    s += 0.45 * np.sin(2 * np.pi * f * 2.9 * t) * np.exp(-t / (tau * 0.5))
    s += nz * lp(noise(len(t)), 3500) * np.exp(-t / 0.004)
    return norm(s)


def boing():
    """Funny style: a sprung door-stop."""
    t = t_axis(0.5)
    f = 180 + 140 * np.exp(-t / 0.08) + 25 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(np.sin(ph) * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.003)))


def slide_whistle(up=True):
    t = t_axis(0.35)
    f = (600 + 900 * (t / t[-1])) if up else (1500 - 900 * (t / t[-1]))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.03) * np.exp(-np.maximum(0, t - 0.25) / 0.04)
    return norm(np.sin(ph) * env)


def scribble():
    """Drawn style: a pencil stroke on paper."""
    t = t_axis(0.22)
    grain = hp(noise(len(t)), 1800)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 38 * t + 3 * np.sin(2 * np.pi * 7 * t))
    env = np.minimum(1, t / 0.02) * np.exp(-np.maximum(0, t - 0.15) / 0.03)
    return norm(lp(grain, 6000) * am * env)


def chime():
    """Glass style: a short glassy ping."""
    t = t_axis(0.6)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in [(1568, 0.6, 0.25), (2349, 0.35, 0.18), (3951, 0.2, 0.09)])
    return norm(s * (1 - np.exp(-t / 0.002)))


BANK = {
    "click": (click(), 0.30), "toggle": (toggle(), 0.30), "check": (check(), 0.26), "key": (key(), 0.15),
    "whoosh": (whoosh(), 0.11), "pop": (pop(), 0.22), "grab": (tone(900, 0.010), 0.18), "drop": (tone(700, 0.014), 0.16),
    "detent": (tone(5200, 0.0025, 0.1), 0.07), "move": (knock(420, 0.022), 0.34),
    "capture": (layered(knock(360, 0.03, 0.7), knock(300, 0.026), 0.022, 0.7), 0.36),
    "boing": (boing(), 0.26), "whistle_up": (slide_whistle(True), 0.14), "whistle_down": (slide_whistle(False), 0.14),
    "scribble": (scribble(), 0.16), "chime": (chime(), 0.14),
}
