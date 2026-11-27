# Publishing to YouTube

After a video is delivered, Claudemotion offers to publish it on YouTube through YouTube Studio in the app's built-in browser. The user's standing wish: publish every finished video unless they answer "no" to the publish questions. The questions are the approval for that one video; never publish a video whose questions were not answered in this session, and never carry an answer over to the next video.

## 1. Ask (AskUserQuestion, one call)

- **Publish?** First option: the visibility from the project or the last answer, default "Public". Other options: "Unlisted", "Private", "No, don't publish". "No" ends the flow.
- **Title and description**: propose a title (max 100 characters) and a short description written from the facts of the video (no invented claims, credits for third-party material such as NASA images or the song in the description). The user can edit them through "Other".
- Shorts: a 9:16 video under 60 s becomes a Short automatically; add `#Shorts` to the title or description only if the user wants it.
- Mention once if the video uses a commercial song: YouTube may claim it or block it in some countries.

## 2. Open YouTube Studio

- `navigate` the built-in browser to `https://studio.youtube.com`.
- If a Google sign-in page appears (host `accounts.google.com`), stop and ask the user to sign in in the browser pane themselves. Never type an email, password or code, never pick an account for them, never accept a consent or terms screen. Continue when they say they are done.
- If YouTube asks to create a channel or to verify the account, that is the user's step: tell them and wait.

## 3. Upload the file (the user drags it in)

The built-in browser cannot attach local files. Open the upload dialog (the "Create" / "Erstellen" button, then "Upload videos" / "Videos hochladen"), then:
- reveal the file for the user (`mcp__ccd_host__reveal_path` with the MP4 path when available, otherwise give the full path) and ask them to drag it into the upload dialog in the browser pane;
- wait for their "done", then confirm with `find` / `read_page` that the details form ("Details", title field) is showing and the file name matches.

## 4. Fill in and publish

Studio's labels follow the account language (German or English); look elements up with `find` / `read_page` rather than fixed coordinates.
- **Title**: the title field is a contenteditable textbox with the file name prefilled. Select all in it and type the approved title. Check the result with `read_page`.
- **Description**: the second textbox. Type the approved description.
- **Audience**: "No, it's not made for kids" / "Nein, es ist nicht speziell für Kinder" (required). Change nothing else (playlists, age restriction, paid promotion, altered content) unless the user said so.
- **Next** through "Video elements" and "Checks" / "Überprüfungen". If the checks report a copyright claim or another restriction, stop and tell the user what it says; publish only if they confirm.
- **Visibility**: pick the approved option. For "Public" click "Publish" / "Veröffentlichen"; for "Unlisted" / "Private" click "Save" / "Speichern".
- Read the video link from the confirmation dialog and close it.

## 5. Report

Report the link, the visibility, title and description used, and anything the checks reported. If anything went differently from the answers (for example processing still running, a claim, a field that could not be set), say so plainly.

## Never

- Publish without the questions of step 1 answered for this video in this session.
- Enter credentials, solve CAPTCHAs, accept terms, change channel or account settings.
- Delete or edit other videos on the channel.
