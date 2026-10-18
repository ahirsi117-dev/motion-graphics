---
name: montage-types
description: Applies a chosen montage (video editing) technique to a user's video — Jump Cut, Cross Cut, Match Cut, Smash Cut, Beat Sync, J/L Cut, Insert Shot, Cutaway, Shot-Reverse-Shot, Speed Ramp, Punch-in Zoom, and Whip/Wipe transitions. Before editing, it shows the user all 12 techniques with a short plain-language explanation next to each, and asks which one to apply. It does not recommend. Then it renders the result with ffmpeg. Use when the user asks to apply, implement, or "سوّ" / "نفذ" / "طبّق" a montage type or editing style ("نوع مونتاج", "قص قفزي", "jump cut", "beat sync", "مونتاج على الإيقاع", "انتقالات", "سلو موشن", "زوم"), or asks to see the list of montage types.
---

# Montage types

You apply one or more named editing techniques to a video with ffmpeg. The reference for each technique (plain-language explanation, when it fits, the ffmpeg recipe) is in `references/types.md`.

Talk to the user in their language and dialect (most users write Gulf / Levantine Arabic — answer the same way). Keep updates to one or two lines.

## Workflow

### 1. Get the source and make a work folder

- Source: the file the user sent (usually under `/root/.claude/uploads/...`) or a path they give.
- Work folder: `<scratch>/montage-<name>/`. Never write into the user's upload folder.
- Copy the source to `<work>/src.mp4` and probe it:

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of default=nw=1 <work>/src.mp4
```

### 2. Show all the techniques and ask

Do not analyse the footage for recommendations. The user wants to see every technique and pick. Show all 12 with a simple explanation next to each, in three AskUserQuestion questions (the tool allows 4 options per question), grouped like this:

- **القص (Cuts):** Jump Cut, Cross Cut, Match Cut, Smash Cut
- **التوقيت والصوت (Timing & sound):** Beat Sync, J/L Cut, Insert Shot, Cutaway
- **الحركة والانتقالات (Motion & transitions):** Shot-Reverse-Shot, Speed Ramp, Punch-in Zoom, Whip/Wipe

For each option:

- `label`: the Arabic name, with the English name in brackets, e.g. `القطع القفزي (Jump Cut)`.
- `description`: one plain sentence saying what it does to the video, e.g. `يقص السكتات والتوقفات عشان الكلام يكون سريع ومتصل.`

Keep descriptions short and free of film jargon. Each question allows the user to choose one technique or to pick "Other" and name one. Use `multiSelect: true` if the user wants to combine techniques, and say in the question that they can pick more than one.

Do not start editing until the user has answered. If they pick several, apply them in the order that makes the cut logic work (cut structure first, then timing and sound, then speed, then transitions and zoom).

Before rendering, look at the footage once with a contact sheet so the technique fits the real shots:

```bash
ffmpeg -v error -i <work>/src.mp4 -vf "fps=1,scale=180:-1,tile=10x4" -frames:v 1 <work>/sheet.jpg
```

### 3. Apply the chosen technique

Follow the recipe for the technique in `references/types.md`. Rules that apply to every technique:

- Re-encode with `libx264 -preset medium -crf 18 -pix_fmt yuv420p` and keep the audio as `aac 192k`. Stream copy is not frame-accurate and makes black frames at cuts.
- Keep the original frame size and frame rate unless the user asks otherwise.
- Trim and concat in one pass when you can, so the file is encoded once.
- After rendering, check the result: duration within 0.1 s of what you expect, audio present, and a contact sheet of the output at 1 fps (`<work>/out-sheet.jpg`). Look at it before you report.

### 4. Report

Give the user the output path inside `<work>`, the technique(s) applied, the duration, and one line on anything you could not do (for example, "لم أجد إيقاع واضح في الموسيقى، فطبّقت الإيقاع على تغيّر الصوت بدل النبض"). Offer the next step, such as a second technique on the same file.

If a technique needs a tool that is not installed (for example librosa for beat detection), install it with `pip install librosa` first. If that fails, use the onset fallback described in `references/types.md` and say so.

## Things to avoid

- Do not run a technique the user did not choose.
- Do not edit the original upload.
- Do not invent a montage name. Use only the names in `references/types.md`. If the user asks for a technique that is not in the list, say so and ask whether to add it.
- Do not claim a result you did not check with the output contact sheet.
