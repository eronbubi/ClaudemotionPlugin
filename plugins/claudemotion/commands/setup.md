---
description: Set up this session and folder for Claudemotion video work (checks tools, creates the project)
argument-hint: [style] [short|long]
allowed-tools: Bash(python:*)
---

Set up Claudemotion in the current folder.

1. Run the environment check and show the result:
   `python "${CLAUDE_PLUGIN_ROOT}/skills/claudemotion/scripts/check_env.py"`
   If anything is MISSING, show the fix commands it printed and ask the user before running any install.
2. Create the project (style and format from the arguments "$ARGUMENTS" if given, otherwise standard and short):
   `python "${CLAUDE_PLUGIN_ROOT}/skills/claudemotion/scripts/init_project.py" . --style <style> --format <format>`
   It never overwrites existing files.
3. Tell the user in two or three lines: what was checked, what was created, the output folder (from claudemotion.json, default Downloads), and that `/claudemotion:new <idea>` starts a video. From now on, sessions in this folder load the Claudemotion rules automatically.
