# Claudemotion

Claude Code marketplace for the **claudemotion** plugin: motion-graphics videos as code. Claude plans the video with you, builds a page whose every frame is a pure function of time, renders it with Playwright and ffmpeg at 60 fps with motion blur, and mixes the music with synthesised UI sounds on the beat.

- Short beat-synced square loops (1440x1440) or long 16:9 videos (1920x1080, 60 fps)
- Four styles: standard, drawn (colored pencil), glass, funny
- Commands: `/claudemotion:setup`, `/claudemotion:new <idea>`, `/claudemotion:styles`

Details: [plugins/claudemotion/README.md](plugins/claudemotion/README.md)

## Install

```
claude plugin marketplace add eronbubi/ClaudemotionPlugin
claude plugin install claudemotion@claudemotion-local
```

From a local clone:

```
claude plugin marketplace add ./ClaudemotionPlugin
claude plugin install claudemotion@claudemotion-local
```
