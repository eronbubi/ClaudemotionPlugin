# Claudemotion

Motion-graphics videos as code. Claude plans the video with you, builds a web page whose every frame is a pure function of time, renders it with Playwright and ffmpeg (60 fps, motion blur), and mixes the music with synthesised UI sounds placed on the beat.

## Commands

| Command | What it does |
|---|---|
| `/claudemotion:setup [style] [short\|long]` | Checks Python, numpy, Pillow, Playwright/Chromium and ffmpeg, then sets up the current folder as a video project (`claudemotion.json`, `engine/`, `audio/`, `out/`, `demo.html`). |
| `/claudemotion:new <idea>` | Starts a video: asks the open questions, analyzes the song, shows the plan on the beat grid or timeline, then builds and renders. |
| `/claudemotion:styles [name]` | Describes the styles or sets the project's default style. |

The `claudemotion` skill also triggers on plain requests like "make a launch video" or "mach ein Video".

## Formats

- **Short**: 1440x1440, beat-synced, seamless loop (last frame = first frame).
- **Long**: 1920x1080 16:9, 60 fps, scenes in seconds, beat sync optional, no loop, music fade-out.

## Styles

- **standard** - Dribbble-level UI motion: warm gray, black and white, one accent, calm springs.
- **drawn** - colored pencil on paper: wobbly boiling outlines, hatching, handwritten font, 24 fps feel.
- **glass** - frosted glass panels over drifting colored light.
- **funny** - loud colors, chunky outlines, squash and stretch, googly eyes, confetti, jokes.

## Requirements

Python 3.9+, `pip install numpy pillow playwright`, `python -m playwright install chromium`, ffmpeg with libx264 on PATH, Node.js (for the session hook), internet access for Google Fonts during rendering.

## Session hook

In a folder that has `claudemotion.json`, a SessionStart hook loads the video-session rules (ask first, plan on the grid, review before rendering, deliver to the output folder). Elsewhere it does nothing.

Finished videos go to the output folder in `claudemotion.json` (default: your Downloads folder).
