"""Word timestamps for captions (optional, needs faster-whisper).

  python transcribe.py <clip-id|all> [--model small] [--language en] [--project .]

Reads footage/<id>/audio.wav, writes footage/<id>/words.json and adds the
words to footage/footage.js, so the page can show word-by-word captions
with CM.captions(). Word times are source times of the original file, like
everything else in footage.json.

--model is a faster-whisper model name (downloaded on first use: ask the
user first) or the path of a local model folder.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from footage import load, save  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clip")
    ap.add_argument("--project", default=".")
    ap.add_argument("--model", default="small")
    ap.add_argument("--language")
    ap.add_argument("--device", default="auto")
    a = ap.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit(f"faster-whisper is not installed: {sys.executable} -m pip install faster-whisper")
    root = Path(a.project).resolve()
    data = load(root)
    ids = list(data["clips"]) if a.clip == "all" else [a.clip]
    model = WhisperModel(a.model, device=a.device, compute_type="int8")

    def run(path):
        segs, info = model.transcribe(path, language=a.language, word_timestamps=True, vad_filter=True)
        return list(segs), info  # segments are lazy: decoding happens here

    for cid in ids:
        c = data["clips"].get(cid)
        if not c:
            raise SystemExit(f"no clip {cid}")
        path = str(root / c["dir"] / "audio.wav")
        try:
            segs, info = run(path)
        except RuntimeError as e:  # CUDA present but its libraries are not: fall back to the CPU
            if a.device == "cpu":
                raise
            print(f"GPU not usable ({str(e).splitlines()[0][:80]}), using the CPU")
            a.device = "cpu"
            model = WhisperModel(a.model, device="cpu", compute_type="int8")
            segs, info = run(path)
        words = []
        for s in segs:
            for w in s.words or []:
                words.append({"w": w.word.strip(), "a": round(c["start"] + w.start, 3), "b": round(c["start"] + w.end, 3)})
        (root / c["dir"] / "words.json").write_text(json.dumps(words, indent=0), encoding="utf-8")
        c["words"] = words
        print(f"{cid}: {len(words)} words, language {info.language}")
    save(root, data)


if __name__ == "__main__":
    main()
