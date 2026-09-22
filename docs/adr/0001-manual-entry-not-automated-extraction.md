---
status: accepted
---

# Manual tab entry instead of automated extraction; client-only architecture

The project started as "download a YouTube tab video and auto-generate a PDF from it." We spent several design rounds on that path — server-side download, cropping, page-transition detection, moving-cursor removal, a photo-scanning fallback — before recognizing it as an open-ended computer-vision problem whose output quality would still be capped by the source video, plus a legal question mark around downloading YouTube video. We chose instead to build a manual note-entry editor (a lightweight Guitar Pro for bass), where the user transcribes by ear/eye from whatever reference they like, and the app never touches video, audio, or images as input.

**Decision**: Bass Tab Editor is a manual-entry notation editor, not an automated video/photo-to-tab pipeline. Because there is no video/audio/image processing to run, v1 ships with no backend — editing, rendering, and persistence all happen in the browser.

**Consequences**: The automated-extraction ideas (yt-dlp download, frame diffing, OMR) are deliberately out of scope, not an oversight — don't reintroduce them without revisiting why they were rejected here. If a backend becomes necessary later (e.g. account sync), that's a new decision, not a reversion to the original plan.
