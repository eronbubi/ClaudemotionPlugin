"""Render a Claudemotion page with Playwright.

The page must expose: window.ready (Promise<bool>, fonts loaded), seek(t),
T (timeline seconds), B (seconds per unit), LOOP (bool) and, for audio,
soundEvents().

Modes
  sheet      one frame per unit (beat or second) plus 4x4 contact sheets
  at         frames at the given units:   at 12.5 30 41.25
  times      frames at the given seconds: times 3.2 10
  events     write events.json (sound cues, and the edit segments of edit pages) and print T
  loopcheck  compare frame 0 with frame T and the cursor at both ends
  full       final video: FPS, SUB subframes per frame, blended with tmix

Examples
  python render.py sheet --page video.html --out out --query "style=glass&beat=0.4687"
  python render.py full  --page video.html --out out --seconds 30 --workers 4
  python render.py full  --page long.html --out out --mode long --fps 60
"""
import argparse
import io
import json
import math
import subprocess
from multiprocessing import Process
from pathlib import Path

from playwright.sync_api import sync_playwright


def args_():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["sheet", "at", "times", "events", "loopcheck", "full"])
    ap.add_argument("values", nargs="*", type=float)
    ap.add_argument("--page", required=True)
    ap.add_argument("--out", default="out")
    ap.add_argument("--mode", dest="fmt", choices=["short", "long"], default="short",
                    help="short = 1440x1440 loop, long = 1920x1080 no loop")
    ap.add_argument("--w", type=int)
    ap.add_argument("--h", type=int)
    ap.add_argument("--query", default="", help="extra query string, e.g. 'style=drawn&beat=0.5'")
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--sub", type=int, default=4, help="subframes per frame for motion blur")
    ap.add_argument("--seconds", type=float, help="video length; loop pages are time-scaled to fit exactly")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--step", type=float, default=1.0, help="sheet: units between frames")
    ap.add_argument("--crf", type=int, default=12)
    return ap.parse_args()


A = None


def size():
    w = A.w or (1920 if A.fmt == "long" else 1440)
    h = A.h or (1080 if A.fmt == "long" else 1440)
    return w, h


def open_page(p):
    w, h = size()
    browser = p.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none"])
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    q = f"mode={A.fmt}&w={w}&h={h}" + (("&" + A.query) if A.query else "")
    page.goto(Path(A.page).resolve().as_uri() + "?" + q, wait_until="networkidle")
    if not page.evaluate("window.ready"):
        raise SystemExit("Fonts did not load (check the network and the font family name)")
    return browser, page


def shot(page, t):
    page.evaluate(f"seek({t:.6f})")
    # edit pages: wait until the footage frames set by seek() are decoded
    page.evaluate("window.CM && CM.settle ? CM.settle() : 0")
    return page.screenshot(type="png")


def out_dir(*parts):
    d = Path(A.out, *parts)
    d.mkdir(parents=True, exist_ok=True)
    return d


def contact_sheets(d, pattern, n, w, h):
    tw = 360
    th = round(tw * h / w)
    for s in range(math.ceil(n / 16)):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-start_number", str(s * 16), "-i", str(d / pattern),
                        "-frames:v", "16", "-vf", f"scale={tw}:{th},tile=4x4", "-frames:v", "1",
                        str(d / f"sheet{s}.png")], check=True)


def render_sheet():
    d = out_dir("sheet")
    for f in d.glob("*.png"):
        f.unlink()
    with sync_playwright() as p:
        browser, page = open_page(p)
        T, B = page.evaluate("T"), page.evaluate("B")
        units = T / B
        n = int(math.floor(units / A.step + 1e-6))
        for i in range(n):
            (d / f"u{i:03d}.png").write_bytes(shot(page, i * A.step * B))
        browser.close()
    contact_sheets(d, "u%03d.png", n, *size())
    print(f"sheet ok: {n} frames, step {A.step} units, sheets in {d}")


def render_at(seconds):
    d = out_dir("at")
    with sync_playwright() as p:
        browser, page = open_page(p)
        B = page.evaluate("B")
        for v in A.values:
            t = v if seconds else v * B
            (d / f"{'s' if seconds else 'u'}{v:g}.png").write_bytes(shot(page, t))
        browser.close()
    print("at ok:", d)


def export_events():
    with sync_playwright() as p:
        browser, page = open_page(p)
        ev = page.evaluate("typeof soundEvents === 'function' ? soundEvents() : []")
        clips = page.evaluate("typeof editAudio === 'function' ? editAudio() : null")
        T, loop = page.evaluate("T"), page.evaluate("LOOP")
        browser.close()
    d = out_dir()
    data = {"T": T, "loop": loop, "events": ev}
    if clips is not None:
        data["clips"] = clips
    (d / "events.json").write_text(json.dumps(data, indent=1))
    print(len(ev), "events, T =", T, "loop =", loop, f"| {len(clips)} edit segments" if clips is not None else "")


def loopcheck():
    import numpy as np
    from PIL import Image
    with sync_playwright() as p:
        browser, page = open_page(p)
        T = page.evaluate("T")
        img = lambda t: np.asarray(Image.open(io.BytesIO(shot(page, t))).convert("RGB")).astype(int)
        a, b = img(0.0), img(T - 1e-9)
        print("frame 0 vs T: max diff", int(np.abs(a - b).max()))
        if page.evaluate("typeof curX === 'function'"):
            cur = page.evaluate(f"[curX(0), curY(0), curX({T}-1e-9), curY({T}-1e-9), (curX(1e-4)-curX(0))/1e-4, (curX({T}-1e-9)-curX({T}-1e-4-1e-9))/1e-4]")
            print("cursor x,y at 0 | x,y at T | vx at 0 | vx at T:", [round(c, 3) for c in cur])
        browser.close()


def worker(a, idx, k0, k1, scale, T, loop):
    global A
    A = a  # Windows spawns fresh interpreters: hand the parsed args over explicitly
    out = Path(A.out, "chunks", f"c{idx}.mp4")
    offs = [(j - (A.sub - 1) / 2) / A.sub * 0.5 for j in range(A.sub)]  # 180-degree shutter
    vf = (f"tmix=frames={A.sub},select='eq(mod(n\\,{A.sub})\\,{A.sub - 1})',setpts=N/({A.fps}*TB),"
          "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p")
    ff = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(A.fps * A.sub), "-c:v", "png", "-i", "-",
        "-vf", vf, "-r", str(A.fps), "-c:v", "libx264", "-preset", "slow", "-crf", str(A.crf),
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", str(out),
    ], stdin=subprocess.PIPE)
    with sync_playwright() as p:
        browser, page = open_page(p)
        for k in range(k0, k1):
            for off in offs:
                t = ((k + off) / A.fps) * scale
                t = t % T if loop else min(max(t, 0.0), T)
                ff.stdin.write(shot(page, t))
            if (k - k0) % 60 == 0:
                print(f"[w{idx}] frame {k}/{k1}", flush=True)
        browser.close()
    ff.stdin.close()
    ff.wait()


def render_full():
    out_dir("chunks")
    with sync_playwright() as p:
        browser, page = open_page(p)
        T, loop = page.evaluate("T"), page.evaluate("LOOP")
        browser.close()
    seconds = A.seconds or T
    scale = T / seconds if loop else 1.0
    frames = int(round(A.fps * seconds))
    per = math.ceil(frames / A.workers)
    procs = []
    for i in range(A.workers):
        k0, k1 = i * per, min(frames, (i + 1) * per)
        if k0 >= k1:
            continue
        pr = Process(target=worker, args=(A, i, k0, k1, scale, T, loop))
        pr.start()
        procs.append((i, pr))
    for _, pr in procs:
        pr.join()
    lst = Path(A.out, "chunks", "list.txt")
    lst.write_text("".join(f"file 'c{i}.mp4'\n" for i, _ in procs))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", str(Path(A.out, "video.mp4"))], check=True)
    (Path(A.out) / "timing.json").write_text(json.dumps({"T": T, "seconds": seconds, "loop": loop, "frames": frames, "fps": A.fps}))
    print(f"video ok: {frames} frames, {seconds:.3f} s, timeline T = {T:.4f} s, loop = {loop}")


if __name__ == "__main__":
    A = args_()
    {"sheet": render_sheet, "at": lambda: render_at(False), "times": lambda: render_at(True),
     "events": export_events, "loopcheck": loopcheck, "full": render_full}[A.mode]()
