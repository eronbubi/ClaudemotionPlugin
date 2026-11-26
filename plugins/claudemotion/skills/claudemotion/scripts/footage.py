"""Prepare video clips for edit mode.

An edit page cannot seek a <video> element frame-accurately while it is
rendered frame by frame, so every clip is unpacked once into numbered JPEG
frames plus a WAV of its sound. The page then shows the frame for any
source time as a plain image: still a pure function of t.

  python footage.py add  <file> [--id name] [--start 12.5] [--end 40] [--fps 30] [--height 1080]
  python footage.py list
  python footage.py remove <id>

Writes, in the project folder (--project, default "."):
  footage/<id>/f000001.jpg ...   frames (frame k shows source time start + (k-1)/fps)
  footage/<id>/audio.wav         48 kHz stereo sound of the same range (silent if the clip has none)
  footage/footage.json           clip list for the scripts
  footage/footage.js             the same as window.FOOTAGE for the page

Source times stay those of the original file: a clip added with --start 12.5
still calls its first frame 12.5 s.
"""
import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_type,width,height,avg_frame_rate,r_frame_rate:stream_tags=rotate:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    if v is None:
        raise SystemExit(f"no video stream in {path}")
    has_audio = any(s["codec_type"] == "audio" for s in j["streams"])

    def rate(s):
        n, d = (s or "0/1").split("/")
        return float(n) / float(d) if float(d) else 0.0
    fps = rate(v.get("avg_frame_rate")) or rate(v.get("r_frame_rate")) or 30.0
    w, h = int(v["width"]), int(v["height"])
    if str(v.get("tags", {}).get("rotate", "0")) in ("90", "270", "-90"):
        w, h = h, w
    return {"fps": fps, "w": w, "h": h, "duration": float(j["format"]["duration"]), "audio": has_audio}


def load(root):
    f = root / "footage" / "footage.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"clips": {}}


def save(root, data):
    d = root / "footage"
    d.mkdir(exist_ok=True)
    (d / "footage.json").write_text(json.dumps(data, indent=1), encoding="utf-8")
    (d / "footage.js").write_text("window.FOOTAGE = " + json.dumps(data) + ";\n", encoding="utf-8")


def slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "clip"


def add(a, root):
    src = Path(a.file).resolve()
    if not src.exists():
        raise SystemExit(f"not found: {src}")
    info = probe(src)
    cid = a.id or slug(src.stem)
    start = max(0.0, a.start or 0.0)
    end = min(info["duration"], a.end) if a.end else info["duration"]
    if end <= start:
        raise SystemExit("--end must be after --start")
    fps = a.fps or min(60.0, round(info["fps"], 3))
    out = root / "footage" / cid
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    vf = [f"fps={fps}"]
    if info["h"] > a.height:
        vf.append(f"scale=-2:{a.height}:flags=lanczos")
    vf.append("format=yuvj420p")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.4f}", "-t", f"{end - start:.4f}", "-i", str(src),
                    "-vf", ",".join(vf), "-q:v", str(a.quality), "-start_number", "1", str(out / "f%06d.jpg")], check=True)
    frames = len(list(out.glob("f*.jpg")))
    if info["audio"]:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.4f}", "-t", f"{end - start:.4f}", "-i", str(src),
                        "-vn", "-ac", "2", "-ar", "48000", str(out / "audio.wav")], check=True)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                        "-t", f"{end - start:.4f}", str(out / "audio.wav")], check=True)
    first = next(out.glob("f*.jpg"))
    from PIL import Image
    with Image.open(first) as im:
        w, h = im.size
    mb = sum(f.stat().st_size for f in out.iterdir()) / 1e6
    data = load(root)
    data["clips"][cid] = {"dir": f"footage/{cid}", "src": src.name, "start": round(start, 4), "end": round(start + frames / fps, 4),
                          "fps": fps, "frames": frames, "w": w, "h": h, "audio": info["audio"]}
    save(root, data)
    print(f"{cid}: {frames} frames at {fps:g} fps, {w}x{h}, source {start:.2f}-{start + frames / fps:.2f} s, "
          f"sound {'yes' if info['audio'] else 'no (silence)'}, {mb:.0f} MB on disk")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["add", "list", "remove"])
    ap.add_argument("file", nargs="?", help="add: video file; remove: clip id")
    ap.add_argument("--project", default=".")
    ap.add_argument("--id")
    ap.add_argument("--start", type=float)
    ap.add_argument("--end", type=float)
    ap.add_argument("--fps", type=float, help="frames to keep per second (default: the clip's own, at most 60)")
    ap.add_argument("--height", type=int, default=1080, help="scale down taller clips to this height")
    ap.add_argument("--quality", type=int, default=3, help="JPEG quality, 2 (best) to 31")
    a = ap.parse_args()
    root = Path(a.project).resolve()
    if a.cmd == "add":
        if not a.file:
            raise SystemExit("add needs a video file")
        add(a, root)
    elif a.cmd == "list":
        for cid, c in load(root)["clips"].items():
            print(f"{cid}: {c['src']}  {c['start']:.2f}-{c['end']:.2f} s  {c['frames']} frames @ {c['fps']:g} fps  {c['w']}x{c['h']}")
    else:
        data = load(root)
        if a.file not in data["clips"]:
            raise SystemExit(f"no clip {a.file}")
        shutil.rmtree(root / data["clips"][a.file]["dir"], ignore_errors=True)
        del data["clips"][a.file]
        save(root, data)
        print("removed", a.file)


if __name__ == "__main__":
    main()
