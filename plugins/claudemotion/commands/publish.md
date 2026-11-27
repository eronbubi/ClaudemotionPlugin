---
description: Publish a finished Claudemotion video on YouTube (asks first, the user signs in and drags the file)
argument-hint: [path to the MP4, default the latest delivered video]
---

Publish a video on YouTube with the `claudemotion` skill. Video: $ARGUMENTS (if empty, the most recent MP4 Claudemotion delivered in this session; if there is none, ask for the path).

Follow `references/publish-youtube.md` exactly: ask the publish questions first (visibility with "No" as an option, title, description), then open YouTube Studio in the built-in browser, let the user sign in and drag the file into the upload dialog, fill in title, description and audience, go through the checks, set the approved visibility and publish. Never type credentials or accept terms, and stop to ask if the checks report a claim.
