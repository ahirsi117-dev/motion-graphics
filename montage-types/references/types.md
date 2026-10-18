# Montage types: plain explanation and recipes

Each entry has: the Arabic and English name, a simple explanation (this is the text shown to the user), when it fits, and the ffmpeg recipe. Use the explanation in AskUserQuestion. Use the recipe to render.

Variables in recipes: `<src>` is the source file, `<out>` is the output file, `<work>` is the work folder. All recipes assume 9:16 or 16:9 video with an audio track. Use `-hide_banner -loglevel error` on every command.

Common encode flags: `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k`.

---

## 1. القطع القفزي (Jump Cut)

**Simple explanation:** تقص السكتات والتوقفات والكلمات الزايدة، فالكلام يطلع متصل وسريع. المشاهد يحس بقفزة صغيرة في الصورة، وهذا جزء من الستايل.

**Fits when:** فيه شخص يتكلم للكاميرا أو فيديو تعليمي/ريل فيه سكتات.

**Recipe:** get the speaking segments from silence detection, keep them, and concat.

```bash
ffmpeg -hide_banner -i <src> -af silencedetect=noise=-30dB:d=0.4 -f null - 2>&1 | grep silence
```

From the `silence_start` / `silence_end` pairs, build the keep list (each speaking segment padded by 0.05 s on each side). Then:

```bash
ffmpeg -hide_banner -loglevel error -i <src> \
  -filter_complex "[0:v]trim=start=S1:end=E1,setpts=PTS-STARTPTS[v0];[0:a]atrim=start=S1:end=E1,asetpts=PTS-STARTPTS[a0];...;[v0][a0][v1][a1]concat=n=N:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" <encode flags> <out>
```

Repeat the `trim`/`atrim` pair for each segment, and set `n` to the segment count.

---

## 2. القطع المتوازي (Cross Cut)

**Simple explanation:** تتنقل بين حدثين يصيرون بنفس الوقت، مثل شخصين في مكانين، فيحس المشاهد بالتوتر أو بالمقارنة.

**Fits when:** فيه أكثر من مشهد أو لقطة مستقلة يمكن ربطها بالتتابع.

**Recipe:** alternate clips A and B in order, each cut at the same time boundary. Use the `concat` pattern from Jump Cut with the clips in the order you want, alternating A and B every 1–2 s.

---

## 3. القطع المتطابق (Match Cut)

**Simple explanation:** تنتقل من لقطة لأخرى تشبهها في الشكل أو الحركة، مثل دائرة تتحول لشمس، فالانتقال يبين كأن المشهدين متصلين.

**Fits when:** فيه لقطتين فيهم شكل أو حركة متشابهة.

**Recipe:** find the frame in clip A and the frame in clip B that match (same shape or motion direction). Trim A to end on that frame and B to start on its match, then concat with no gap. Pick the match frames by looking at contact sheets of both clips and confirm by comparing the two frames with `ffmpeg -i a.png -i b.png -lavfi ssim -f null -`.

---

## 4. القطع الصدمي (Smash Cut)

**Simple explanation:** تقفز من هدوء مفاجئ لمشهد قوي أو صاخب، فالمفاجأة تكون هي المعنى. مثال: صمت ثم مشهد انفجار.

**Fits when:** فيه مقطع هادئ وبعده مقطع قوي (صوت أو حركة).

**Recipe:** hard concat with no transition at the boundary, cutting exactly at the energy change. Find the change with the audio RMS and the scene detect threshold, then concat as in Jump Cut. Do not add a fade.

---

## 5. مونتاج الإيقاع (Beat Sync)

**Simple explanation:** تقطّع اللقطات على نبضات الموسيقى، فكل قطعة تنتقل مع نغمة. يعطي الفيديو إحساس قوي ومنظم، ومناسب للريلات والسفر.

**Fits when:** فيه موسيقى ذات إيقاع واضح.

**Recipe:** detect beats, then cut on them.

1. Install if missing: `pip install librosa`.
2. Detect beats:

```python
import librosa
y, sr = librosa.load("<work>/audio.wav", sr=None)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
```

3. Build segments between consecutive beats (every 1 or 2 beats), pick one segment per clip in order, and concat them with `trim`/`setpts` as in Jump Cut.

**Fallback (no librosa):** use the onset strength from numpy on the RMS envelope of the audio (`ffmpeg -i <src> -ac 1 -ar 22050 <work>/audio.wav`, then read the wav with `wave` + `numpy`, take the positive difference of the RMS over 20 ms frames, and pick peaks at least 0.3 s apart). Say in the report that this is an estimate.

---

## 6. القطع المقسوم (J-Cut و L-Cut)

**Simple explanation:** الصوت يبدأ قبل الصورة (J-Cut) أو يستمر بعدها (L-Cut). المشاهد يسمع الكلام قبل ما يشوف المتحدث، فالانتقال يبين ناعم.

**Fits when:** فيه حوار أو تعليق صوتي يمكن يسبق أو يتأخر عن الصورة.

**Recipe:** split the audio from the video at the cut. For a J-Cut, take the audio of clip B starting `D` seconds before the cut and the video of clip A until the cut. For an L-Cut, keep the audio of clip A going `D` seconds after the cut.

```bash
ffmpeg -hide_banner -loglevel error -i <a.mp4> -i <b.mp4> \
  -filter_complex "[0:v]trim=end=C,setpts=PTS-STARTPTS[v0];[1:v]trim=start=0,setpts=PTS-STARTPTS[v1];[0:a]atrim=end=C+D,asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[v0][v1]concat=n=2:v=1:a=0[v];[a0][a1]acrossfade=d=0.1[a]" \
  -map "[v]" -map "[a]" <encode flags> <out>
```

Adjust `C` (the cut time in A) and `D` (the overlap in seconds, usually 0.3–1.0). Check the overlap in the output.

---

## 7. لقطة الإدراج (Insert Shot)

**Simple explanation:** تحط لقطة قريبة لشي مهم (يد، شاشة، منتج) داخل المشهد لثواني، فيفهم المشاهد التفصيلة بسرعة.

**Fits when:** فيه لقطة ثانية (B-roll) تقدر تعرض تفصيلة من الكلام.

**Recipe:** overlay the insert over the main video for a set time, keeping the main audio.

```bash
ffmpeg -hide_banner -loglevel error -i <main.mp4> -i <insert.mp4> \
  -filter_complex "[1:v]trim=0:D,setpts=PTS-STARTPTS+S/TB,scale=W:H[ins];[0:v][ins]overlay=enable='between(t,S,S+D)'[v]" \
  -map "[v]" -map 0:a <encode flags> <out>
```

Replace `S` (start time), `D` (duration), `W`/`H` (frame size of the main video).

---

## 8. لقطة التغطية (Cutaway)

**Simple explanation:** تقطع الصورة الرئيسية للحظة بلقطة من شي ثاني، والصوت يكمل من المتحدث. يخفي القفزات ويزيد السياق.

**Fits when:** فيه قطع يحتاج يتغطى أو يبي المشاهد يشوف شي غير المتحدث أثناء الكلام.

**Recipe:** same as Insert Shot but replace the picture instead of overlaying, keep the main audio:

```bash
ffmpeg -hide_banner -loglevel error -i <main.mp4> -i <cut.mp4> \
  -filter_complex "[1:v]trim=0:D,setpts=PTS-STARTPTS+S/TB,scale=W:H[cut];[0:v][cut]overlay=enable='between(t,S,S+D)'[v]" \
  -map "[v]" -map 0:a <encode flags> <out>
```

The only difference from Insert Shot is that the cutaway uses the full frame. Use `scale` and `crop` to make both sizes match.

---

## 9. القطع بالانعكاس (Shot-Reverse-Shot)

**Simple explanation:** تتبادل بين شخصين أثناء الحوار، كل ما يتكلم واحد تعرض وجهه. يعطي إحساس المحادثة.

**Fits when:** فيه حوار بين شخصين، ولقطتين من زاويتين مختلفتين على الأقل.

**Recipe:** use the speaker-turn times (from the transcript or the audio energy) and alternate the two angles at those times. Build the segments as in Jump Cut, taking angle A for speaker A's turns and angle B for speaker B's, with both angles' audio synced to the same timeline.

---

## 10. تغيير السرعة (Speed Ramp)

**Simple explanation:** السرعة تتغير داخل اللقطة، من بطيء لسريع أو العكس. تؤكد اللحظة المهمة، مثل ضربة أو قفزة.

**Fits when:** فيه حركة قوية أو لحظة تحتاج تأكيد.

**Recipe:** split the clip into parts and change speed per part with `setpts`, then concat. Audio uses `atempo` (range 0.5–2.0 per filter; chain filters for more).

```bash
ffmpeg -hide_banner -loglevel error -i <src> \
  -filter_complex "[0:v]trim=0:T1,setpts=PTS-STARTPTS[v0];[0:v]trim=T1:T2,setpts=(PTS-STARTPTS)*0.4[v1];[0:v]trim=T2,setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1[v];[0:a]atrim=0:T1,asetpts=PTS-STARTPTS[a0];[0:a]atrim=T1:T2,asetpts=PTS-STARTPTS,atempo=2.0[a1];[0:a]atrim=T2,asetpts=PTS-STARTPTS[a2];[a0][a1][a2]concat=n=3:v=0:a=1[a]" \
  -map "[v]" -map "[a]" <encode flags> <out>
```

`setpts` factor `0.4` means 2.5× faster, and the `atempo` value is the inverse speed for audio. Keep the audio factor the inverse of the video factor, and only ramp the audio when the audio is music or sound effects. Speech sped up sounds bad, so mute or cut it.

---

## 11. الزوم المفاجئ (Punch-in Zoom)

**Simple explanation:** تكبّر الصورة بسرعة على الوجه أو المنتج، فيحس المشاهد بتأكيد الجملة وينتبه.

**Fits when:** فيه جملة مهمة أو لحظة تبي تأكيدها.

**Recipe:** zoom with `zoompan` for a short window, then return to normal. Use the frame size and frame rate of the source.

```bash
ffmpeg -hide_banner -loglevel error -i <src> \
  -vf "zoompan=z='if(between(on,S*FPS,(S+D)*FPS),1+0.15*sin(PI*(on-S*FPS)/(D*FPS)),1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=WxH:fps=FPS" \
  -map 0:a <encode flags> <out>
```

Replace `S` (start), `D` (duration of the punch), `FPS`, `W`, `H`. The peak zoom is 1.15×. Change `0.15` for a stronger or softer punch.

---

## 12. الانتقال بالمسح (Whip / Wipe)

**Simple explanation:** تمسح الشاشة بحركة سريعة وتنتقل للمشهد الجديد. الـ Whip حركة سريعة ومشوشة، والـ Wipe مسح واضح وهادئ.

**Fits when:** فيه مشهدين متتاليين تبي تربطهم بانتقال واضح.

**Recipe:** `xfade` between two clips. Use `slideleft` or `slideright` for a wipe, and `hblur` for a whip-like blur.

```bash
ffmpeg -hide_banner -loglevel error -i <a.mp4> -i <b.mp4> \
  -filter_complex "[0:v][1:v]xfade=transition=hblur:duration=0.35:offset=O[v];[0:a][1:a]acrossfade=d=0.35[a]" \
  -map "[v]" -map "[a]" <encode flags> <out>
```

Set `O` to the time in clip A where the transition starts (clip A duration minus the transition duration). For a plain wipe, use `transition=slideleft`.

---

## Notes for the recommendation step

- Jump Cut and Smash Cut work on almost any footage with speech or a change in energy.
- Beat Sync needs music. Without it, do not recommend it.
- Shot-Reverse-Shot needs two angles. Without two, do not recommend it.
- Speed Ramp and Punch-in Zoom work on any footage with a clear moment to emphasise.
- Whip / Wipe fits any two adjacent shots.
- Cross Cut and Match Cut need two or more clips with a shared shape, motion, or parallel event.
