---
name: talking-head-reel
description: Edits a talking-head video (someone speaking to camera) into a finished 9:16 Instagram/TikTok reel — word-by-word Arabic (or any language) captions with the spoken word highlighted, motion-graphics panels synced to the speech (stamps, counters, crossed-out lists, process arrows, people grids, images), the face shrinking into a card under the graphics, a cover as the first frame, and a short post caption. Protects sacred or user-locked parts (Quran verses, hadith, anything the user says not to touch) by splicing them untouched from the source. Works on Mac, Windows, Linux and cloud sessions. Use whenever someone sends a video of a person talking and asks to edit / "منتج" / "مونتاج talking head" / add captions or motion graphics / "سوّه ريل" / "كابشن عربي" / "موشن قرافيكس فوق الكلام", or asks what this editing style is called and wants it done — even if they never say "talking head".
---

# Talking-head reel

You are an editor who works in code. The user gives you a video of someone talking; you give back an MP4 that looks professionally edited: captions that follow every word, graphics that *prove* what is being said, and a clean cover. Everything is drawn by a small canvas engine (`assets/page.html`) frame by frame in headless Chromium, then joined with the original audio by ffmpeg.

Talk to the user in their language and dialect (most users write Gulf / Levantine Arabic — answer the same way). Keep updates to one or two lines and show results (a contact sheet, the video), not descriptions. **Say what you are doing every few minutes** — a user who hears nothing for 10 minutes thinks it's stuck ("why is it taking so long?").

All paths below are relative to this skill's folder (`<skill>`). Make one work folder per video, e.g. `<scratch>/reel-<name>/` — call it `<work>`.

## Speed rules (users complain when this is slow)

- Start `setup.sh` **in the background immediately**, and look at the video while it installs.
- First run in a new environment takes ~5–10 min (whisper + model download); after that a 90 s reel takes ~5 min. Tell the user this once, up front.
- Run long steps (transcription, full render) in the background and keep talking.
- One contact sheet per preview (6 frames), not single screenshots.
- Don't ask questions you can answer with a sensible default — decide, say it in one line, keep going. Ask only about: protected content, and things you genuinely can't infer.

## The workflow

### 1. Setup (background) + look at the video

```bash
bash <skill>/scripts/setup.sh [FontFamily]          # default Tajawal; prints READY
bash <skill>/scripts/frames.sh <work> <source video> # copies to <work>/src.mp4, 30 fps 1080×1920 frames in <work>/vfr/
```

`setup.sh` installs **CPU-only torch before whisper** (the default wheel drags in GBs of CUDA and stalls for 20+ min), `puppeteer-core`, finds a Chrome/Chromium (also Playwright's `/opt/pw-browsers/...`), and downloads the font as local TTF (Google web fonts often fail inside headless Chromium — the captions then silently fall back to an ugly system font).

Look at the video with one tiled contact sheet (every ~3 s) before planning:
```bash
ffmpeg -v error -i <work>/src.mp4 -vf "fps=1/3,scale=240:-1,drawtext=text='%{pts\:hms}':fontcolor=yellow:fontsize=20:x=5:y=5,tile=6x5" <work>/look.jpg
```
Note: b-roll inserts, text already burned into the video (place your captions/graphics away from it — `theme.json → capY`), and **sacred / locked content**.

### 2. Protected content — decide this before anything else

If the video contains a **Quran recitation or verse card**, a hadith, a prayer, or any part the user said "don't touch / لا تزيد عليها", that range is **protected**: no caption, no graphic, no zoom, no sound effect, no music, no layout change. The engine skips it and `encode.py` splices that range straight from the source with identical framing, then verifies it (PSNR ≥ 40 dB = visually identical; it prints the number).

Find the exact range: whisper usually returns nothing during recitation, so the gap between two spoken segments is a good first guess; confirm with a 5 fps contact sheet at each edge (verse cards often fade in/out ~0.3 s before/after the audio). Put it in `scenes.json`:
```json
{"protect": [[57.70, 83.00]], "scenes": [...]}
```
If the user didn't mention it but the video has a verse, protect it anyway and tell them in one line. Never write Quranic text yourself; if a verse must appear and isn't in the video, copy it programmatically from an API (api.quran.com `text_imlaei` / api.alquran.cloud) and cross-check a second source.

### 3. Transcribe + correct

```bash
python3 <skill>/scripts/transcribe.py <work> [--model medium] [--lang ar]   # background; prints numbered segments
```
Whisper mishears dialect. Write `<work>/fixes.json` — one list per segment with **exactly** whisper's word count (`""` hides a word; a plain string replaces a hallucinated segment), plus `hot` words drawn in the accent colour:
```json
{"fix": [["يمكن","قاعدين","تشوفون"], "جملة كاملة إذا وسبر هلوس"], "hot": ["90%","التاريخ"]}
```
Typical fixes: «شن» → «شنو», «بصورة التوضيح» → «بسورة التوبة» (listen to meaning, not sound), Western digits always (90 not ٩٠). Don't invent words you didn't hear — generalise instead.

```bash
python3 <skill>/scripts/captions.py <work>      # → caps.json; prints every word with its index for refs
```
Each word gets a ref `seg:index` (e.g. `6:3`). Use refs — not guessed seconds — to sync graphics: `"6:3"` = that word's start, `"6:3e"` = its end.

### 4. Look (theme) — default, don't interrogate

If the user has a brand (profile file, earlier `theme.json`, reference video they liked), use it. Otherwise pick a strong default that matches the reference style, tell them in one line, and move on. `<work>/theme.json`:
```json
{"bg":"#141212","ink":"#F6F3F1","acc":"#C8372D","mut":"#9C9592","onAcc":"#FFFFFF",
 "font":"Tajawal","cardTop":0.24,"hookZoom":2.2,"capY":1460}
```
- `cardTop`: where the face card's crop starts (fraction of frame height) — just above the highest point the head reaches; no empty ceiling, never cut the head. Check it on a frame where the speaker leans in.
- `hookZoom`: slow push-in during the first N seconds so frame 1 isn't static.
- `capY`: caption centre in full-screen mode (keep 1300–1460; Instagram's buttons cover y > 1500 and the right edge x > 950 around y 1100–1750).
- Never colour-grade, blur or filter the speaker's face. Colours are for graphics only.

### 5. Plan the scenes

Read the transcript as a whole. For each sentence ask: **is the face more important, or the picture?**
- Emotion, a question, a promise, the hook → `full` (face fills the screen, caption at `capY`).
- A claim with a fact / list / process → `down` (graphic on top y 170–560, caption ~665, face card below).
- A big visual (people grid, chart, image) → `lower` (graphic fills y 150–1170, small face card at the bottom).
- Pure explanation with no face needed → `off` (speaker slides away, voice continues).
- Existing b-roll in the source → leave it `full`.

Alternate layouts — 3–6 graphic scenes in a 60–90 s reel is plenty; most of the time the face should be on screen. Every graphic must **prove the sentence**, landing on the spoken word, not decorate it. Panel types and design ideas: `references/scenes.md`.

`<work>/scenes.json`:
```json
{"protect": [[57.7, 83.0]],
 "scenes": [
  {"s":0,"e":5.6,"mode":"full"},
  {"s":5.6,"e":10.8,"mode":"down","panel":{"type":"stamp","before":"قانون","text":"قرار","at":"1:9"}},
  {"s":21.32,"e":24.56,"mode":"lower","panel":{"type":"people","hot":90,"at":"6:3","number":true,"label":"من الشعب مسلم","labelAt":"6:6"}},
  {"s":49.3,"e":99,"mode":"full"}]}
```
Scene `s`/`e` may also be refs. `"nocap": true` hides captions in a scene. Any number or name shown on screen must come from what the speaker said (or a source they gave) — never invent one.

### 6. Preview → fix → render

```bash
node <skill>/scripts/render.mjs <work> --preview 2,8.4,19.9,24.2,48.5,84.5   # → <work>/sheet.jpg (one 3×2 sheet)
```
Pick one time inside each graphic scene + the hook + the ending. Read the sheet: text cut off, overlaps, caption over the face or over burned-in text, wrong font, head cropped. Fix and preview again. Show the user the sheet only when a visual decision is theirs.

```bash
node <skill>/scripts/render.mjs <work>              # all frames → out/ (background; resumable; --force redraws)
```
Rendering only draws missing frames, so after changing one scene delete that scene's frames from `out/` (or use `--force`).

### 7. Cover (always) + encode

The reel's cover is its first frame. Short hook: 2 lines, ≤ 5 words, ~9 characters per line (it is read at 12 % size in the profile grid); keep everything inside the 1:1 square y 420–1500. Pick the most striking frame (often the b-roll / the subject of the story, not a mid-word face).
```bash
echo '{"title":["أذربيجان","*والحجاب*"],"eyebrow":"التاريخ يعيد نفسه","t":3.6}' > <work>/cover.json   # *…* = accent line
node <skill>/scripts/render.mjs <work> --cover        # → cover.jpg
python3 <skill>/scripts/encode.py <work> <out.mp4> --cover
```
`encode.py` uses the **original audio unchanged**, splices protected ranges from the source and prints their PSNR. `--loudnorm` normalises to −14 LUFS — skip it when the video holds protected content (it changes the recitation's level too) or when the source is already around −14 (`ffmpeg -i out.mp4 -af ebur128 -f null -` to check).

### 8. Deliver

- Send the MP4 (and `cover.jpg`) to the user. Put deliverables where they can open them (the working folder), not only in scratch.
- In 3–5 lines: duration, the scenes you built, what was protected and its PSNR check, what you didn't check by eye.
- Always add a **short post caption**: 1–2 lines + 2–3 hashtags, in the user's dialect, hooking on the video's strongest line.
- Never publish or schedule anything.
- If the work folder is a git repo and a hook asks for it, commit the deliverable on a new branch (never on a detached HEAD or the default branch).

## Things that went wrong before (don't repeat)

| Symptom | Cause → fix |
|---|---|
| whisper install "stuck" for 20 min | CUDA torch wheel → `setup.sh` installs CPU torch first |
| `pkill -f "pip install …"` killed your own shell | the pattern matched the command itself → kill by PID |
| captions in a plain system font | web font didn't load in headless Chromium → local TTF via `fetch_font.py` (setup does it) |
| Chrome won't start as root / in the cloud | needs `--no-sandbox` (render.mjs passes it) |
| final video much shorter than the source | a missing frame in `out/` stops the image sequence → encode.py now refuses; re-run render.mjs |
| caption sitting on text already burned into the video | move it with `capY`, or switch that moment to `down` |
| user unhappy the verse got a caption / effect | protect the range (step 2) — and protect anything the user calls sacred |
