"""Set up a folder as a Claudemotion video project.

  python init_project.py [folder] [--style standard] [--format short] [--output ~/Downloads]

Creates (never overwrites existing files):
  claudemotion.json   project settings read by the session hook
  engine/             copy of the engine and the four styles
  audio/  out/        song files and render output
"""
import argparse
import json
import shutil
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?", default=".")
    ap.add_argument("--style", default="standard", choices=["standard", "drawn", "glass", "funny"])
    ap.add_argument("--format", default="short", choices=["short", "long"])
    ap.add_argument("--output", default=str(Path.home() / "Downloads"))
    a = ap.parse_args()
    root = Path(a.folder).resolve()
    root.mkdir(parents=True, exist_ok=True)
    cfg = root / "claudemotion.json"
    if cfg.exists():
        print("exists:", cfg)
    else:
        cfg.write_text(json.dumps({"style": a.style, "format": a.format, "output": a.output,
                                   "fps": 60, "size": [1920, 1080] if a.format == "long" else [1440, 1440]}, indent=2))
        print("created:", cfg)
    eng = root / "engine"
    if eng.exists():
        print("exists:", eng, "(left as is; delete it to get a fresh copy)")
    else:
        shutil.copytree(SKILL / "templates" / "engine", eng)
        print("copied:", eng)
    for d in ["audio", "out"]:
        (root / d).mkdir(exist_ok=True)
    demo = root / "demo.html"
    if not demo.exists():
        shutil.copy(SKILL / "templates" / "demo.html", demo)
        print("copied:", demo)
    print("project ready:", root)


if __name__ == "__main__":
    main()
