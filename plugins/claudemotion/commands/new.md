---
description: Start a new Claudemotion video (asks the questions first, picks a fresh concept, then plans on the beat grid)
argument-hint: [what the video is about]
---

Start a new Claudemotion video using the `claudemotion` skill. The user's idea: $ARGUMENTS

Follow the skill's workflow exactly: run the setup check, then ask the open questions with AskUserQuestion (format, style, content and facts, colors, song, length, end text). Read `references/structures.md`, run `scripts/history.py show`, and offer 2-3 contrasting concepts (archetype + opener + camera + ending) that repeat nothing from the last two videos. Then analyze the song and show the state or scene plan on the beat grid or timeline. Write no code before the user has answered and agreed to the plan.
