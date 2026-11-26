---
description: Cut the user's own footage and finish it with motion graphics (edit mode)
argument-hint: [clip files] [what the edit should be]
---

Start a Claudemotion edit using the `claudemotion` skill in edit mode. The user's clips and idea: $ARGUMENTS

Follow `references/workflow-edit.md`: run the setup check, set the folder up with `init_project.py . --format edit` if it has no claudemotion.json yet, ask the open questions with AskUserQuestion (clips and their content, the cut and its length, pacing, graphics and texts, captions, sound and music, format, end card), unpack the clips with `scripts/footage.py add`, look at frames and the transcript, offer 2-3 concepts that repeat nothing from the last two videos (`history.py show`), and show the edit decision list as a table. Write no page code before the user has agreed to the plan.
