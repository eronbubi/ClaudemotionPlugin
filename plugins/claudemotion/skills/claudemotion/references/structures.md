# Structures: never the same video twice

The fastest way to make every Claudemotion video feel the same is to reuse one recipe: a cursor clicks a button at the start, cards morph one after another, a CTA at the end. That recipe is **one** option, not the default.

Before planning, choose four things and write them down:

1. an **archetype** (the story shape)
2. an **opener** (the first 1-2 seconds)
3. a **camera language**
4. an **ending**

Then run `python scripts/history.py show`. None of the four may repeat the same choice from the last two videos. Offer the user **2-3 contrasting concepts** (one line each: archetype + opener + camera + ending) as an AskUserQuestion, with your recommendation first. After delivery, record the choice with `history.py add`.

## Archetypes

| Archetype | Shape of the story | Good for | Cursor? |
|---|---|---|---|
| **Walkthrough** | the UI flow, step by step, driven by clicks and drags | apps, tools | yes |
| **Problem → solution** | open on the pain (red error, chaos, slow bar), one morph turns it calm and solved | launches, fixes | optional |
| **Kinetic type** | the message is the motion: words build, stack, break; the shape becomes underlines, highlights, letters | statements, manifestos, quotes | no |
| **Countdown / list** | "3 things": each number slams in on a downbeat and becomes its state | features, tips | no |
| **Data story** | one number or chart grows, compares, lands on the headline metric | results, benchmarks | no |
| **Montage** | a different state on every beat, accelerating into the drop, then one hero state | feature overviews, hype | no |
| **Zoom-through** | the camera dives into a detail of each state; that detail becomes the next state | depth, "under the hood" | no |
| **Character** | the shape has a personality: it reacts, gets surprised, tells a joke | funny style, mascots | optional |
| **Versus** | A against B, side by side or one after another, verdict on the drop | comparisons, upgrades | no |
| **Teaser / reveal** | hide the product: blurred silhouette, mask, fragments; full reveal on the drop | launches, announcements | no |
| **Tutorial** | 3 numbered steps, each one done for real | how-tos, commands | yes |
| **Quote / testimonial** | one sentence, word by word, then who said it | social proof | no |

## Openers (the first 1-2 seconds must hook)

- **Cold open on the result**: show the final state first, then rewind to how it got there.
- **Statement**: one bold line, huge, kinetic, on the first downbeat.
- **Question**: ask the viewer something the video answers.
- **Number slam**: a huge number lands on beat 1 (scale from 3x with a hard stop).
- **Problem state**: an error toast, a broken layout, a spinner that never ends.
- **Mystery**: a blurred or masked shape pulses with the intro; nothing is explained yet.
- **Logo build**: pieces fly in and assemble on the beat.
- **Mid-action**: we arrive while things already move; a whip pan into the frame.
- **Sound-led**: the shape breathes with the intro (scale on every kick) before anything appears.
- **Notification**: a toast or push notification drops in and opens into the video.
- **Zoom-out**: start on a tiny detail filling the frame, pull back to reveal what it is.
- **Cursor click**: the classic. Allowed, but never two videos in a row.

## Camera languages

- **Zoom-to-fit** (default): every state fills the frame.
- **Push-in**: slow continuous zoom toward a detail while content plays.
- **Pan along a strip**: states sit side by side on a wide strip or timeline; the camera travels (`CM.panAt`).
- **Whip pan**: fast pan with motion blur between states; the blur hides the swap.
- **Locked-off**: static camera; only the content moves (best for kinetic type).
- **Zoom-through**: scale into a detail until it becomes the next frame.
- **Parallax**: background, shape and foreground move at different speeds.
- **Dutch tilt / shake**: small rotations and shake on impacts (funny style only).

## Transitions between states

Morph (default) · mask wipe (a circle or bar reveals the next state) · zoom-through · flip on Y · slide along one axis with a two-spring stretch · full-frame color flood (the shape grows past the frame edges and becomes the background) · split and merge (two halves move apart and the next state is between them) · squash-pop (funny) · draw-on (drawn) · dissolve through blur (glass).

Use at least two different transition kinds per video.

## Endings

Logo lockup · CTA button (only when a click fits the story) · link card · loop back to the first frame · punchline (funny) · number freeze · question back to the viewer · "to be continued" cut on the last beat.

## Pacing curves

- **Steady**: something on every beat.
- **Build**: sparse at first, denser and faster toward the drop.
- **Drop-centered**: calm and mysterious intro, everything explodes on the drop.
- **Wave**: alternate a busy bar with a calm bar.
- **Breath**: one bar of near-stillness right before the ending makes the ending land.

## Variety checklist (run it on the plan before showing it)

- The opener is not the same as in the last two videos (`history.py show`).
- There are at least two kinds of motion besides the morph (camera move, mask, type animation, character reaction, counting, drag).
- There is at least one contrast moment: a full-frame color flip, a scale jump, a moment of stillness, a sudden silence.
- Not every state is a card in the middle of the frame: use at least one full-frame state, one wide or tall state, or one state that leaves the frame.
- The cursor appears only if the archetype needs it.
- Text is short enough to read at the pace shown.

## Format notes

- **9:16 (Shorts, Reels, TikTok)**: stack vertically, put big type in the upper middle, keep important things out of the bottom 20 % and the top 10 % (platform buttons and captions sit there). A touch "tap" (a circle ripple) suits mobile better than an arrow cursor.
- **16:9 long format**: use the width: side-by-side, pans along strips, lower-third captions.
- **1:1 loop**: center composition; the loop point is part of the story.
