"""Check everything Claudemotion needs. Prints one line per item and the
exact command to fix anything missing. Installs nothing by itself."""
import importlib
import shutil
import subprocess
import sys

ok = True


def line(good, name, detail, fix=""):
    global ok
    ok &= good
    print(f"[{'ok' if good else 'MISSING'}] {name}: {detail}" + ("" if good else f"\n        fix: {fix}"))


line(sys.version_info >= (3, 9), "python", sys.version.split()[0], "install Python 3.9 or newer")
for mod, pip in [("numpy", "numpy"), ("PIL", "pillow"), ("playwright", "playwright")]:
    try:
        m = importlib.import_module(mod)
        line(True, mod, getattr(m, "__version__", "installed"))
    except ImportError:
        line(False, mod, "not installed", f"{sys.executable} -m pip install {pip}")
for tool in ["ffmpeg", "ffprobe"]:
    p = shutil.which(tool)
    line(bool(p), tool, p or "not on PATH", "install ffmpeg (winget install Gyan.FFmpeg) and reopen the terminal")
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        v = b.version
        b.close()
    line(True, "chromium", v)
except Exception as e:  # noqa: BLE001
    line(False, "chromium", str(e).splitlines()[0][:120], f"{sys.executable} -m playwright install chromium")
if shutil.which("ffmpeg"):
    enc = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    line("libx264" in enc, "libx264", "available" if "libx264" in enc else "missing", "use an ffmpeg build with libx264")
print("READY" if ok else "NOT READY")
sys.exit(0 if ok else 1)
