"""Put picture and sound together and write the deliverable.

  python mux.py --video out/video.mp4 --audio out/mix.wav --timing out/timing.json --dest "%USERPROFILE%/Downloads/Name.mp4"

If the video was time-scaled to a round length (loop pages), the audio is
stretched by the same factor with atempo so they stay in sync.
"""
import argparse
import json
import os
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--audio")
    ap.add_argument("--timing", required=True)
    ap.add_argument("--dest", required=True)
    a = ap.parse_args()
    tm = json.loads(Path(a.timing).read_text())
    dest = Path(os.path.expandvars(os.path.expanduser(a.dest)))
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", a.video]
    if a.audio:
        f = tm["T"] / tm["seconds"] if tm["loop"] else 1.0
        cmd += ["-i", a.audio, "-map", "0:v", "-map", "1:a"]
        if abs(f - 1) > 1e-6:
            cmd += ["-af", f"atempo={f:.8f}"]
        cmd += ["-c:a", "aac", "-b:a", "320k"]
    cmd += ["-c:v", "copy", "-t", f"{tm['seconds']:.4f}", "-movflags", "+faststart", str(dest)]
    subprocess.run(cmd, check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,nb_frames",
                            "-of", "compact", str(dest)], capture_output=True, text=True).stdout
    print(probe.strip())
    print("saved:", dest)


if __name__ == "__main__":
    main()
