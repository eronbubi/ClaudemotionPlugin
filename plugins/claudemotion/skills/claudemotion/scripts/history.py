"""Remember how past videos were built, so the next one is different.

  python history.py show [--n 5]
  python history.py add --title "Launch X" --archetype "problem-solution" --opener "number slam" \
                        --camera "pan along a strip" --ending "link card" --style funny --format 9:16

The history lives in ~/.claudemotion/history.json (shared by every project).
`show` prints the recent videos and the choices that must not repeat
(anything used in the last two videos). See references/structures.md.
"""
import argparse
import datetime
import json
from pathlib import Path

FILE = Path.home() / ".claudemotion" / "history.json"
FIELDS = ["archetype", "opener", "camera", "ending"]


def load():
    if FILE.exists():
        return json.loads(FILE.read_text(encoding="utf-8"))
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["show", "add"])
    ap.add_argument("--n", type=int, default=5)
    ap.add_argument("--title", default="")
    for f in FIELDS + ["style", "format"]:
        ap.add_argument(f"--{f}", default="")
    a = ap.parse_args()
    hist = load()
    if a.cmd == "add":
        entry = {"date": datetime.date.today().isoformat(), "title": a.title}
        entry.update({f: getattr(a, f) for f in FIELDS + ["style", "format"]})
        hist.append(entry)
        FILE.parent.mkdir(parents=True, exist_ok=True)
        FILE.write_text(json.dumps(hist, indent=2, ensure_ascii=False), encoding="utf-8")
        print("recorded:", entry)
        return
    if not hist:
        print("no videos recorded yet - every choice is open")
        return
    print(f"last {min(a.n, len(hist))} videos (newest last):")
    for e in hist[-a.n:]:
        print(f"  {e['date']}  {e.get('title', '')}: " + ", ".join(f"{f}={e.get(f, '')}" for f in FIELDS + ["style", "format"]))
    recent = hist[-2:]
    print("do not repeat (used in the last two videos):")
    for f in FIELDS:
        used = sorted({e.get(f, "") for e in recent if e.get(f)})
        print(f"  {f}: {', '.join(used) if used else '-'}")


if __name__ == "__main__":
    main()
