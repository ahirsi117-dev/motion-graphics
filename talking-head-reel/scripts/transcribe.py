"""transcribe.py <work> [--model medium] [--lang ar]
Extracts the audio of <work>/src.mp4 and transcribes it with word timestamps -> <work>/a.json,
then prints every segment numbered, with its word count, so fixes.json can be written."""
import json, os, subprocess, sys
W = os.path.abspath(sys.argv[1])
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
model, lang = arg("--model", "medium"), arg("--lang", "ar")
wav = os.path.join(W, "a.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(W, "src.mp4"), "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
import whisper
m = whisper.load_model(model)
r = m.transcribe(wav, language=lang, word_timestamps=True, fp16=False, verbose=None)
json.dump(r, open(os.path.join(W, "a.json"), "w"), ensure_ascii=False)
for i, s in enumerate(r["segments"]):
    ws = [w["word"].strip() for w in s.get("words", [])]
    print(f"{i:>3} {s['start']:6.2f}-{s['end']:6.2f} ({len(ws)}) {' '.join(ws)}")

# Possible recitation (Quran / hadith): whisper usually skips it, so look for gaps >= 3 s between
# segments where the audio is NOT silent. No lines printed = nothing to protect (the usual case).
import numpy as np
a = whisper.load_audio(wav); sr = 16000
segs = [(s["start"], s["end"]) for s in r["segments"]]
edges = [0.0] + [e for _, e in segs]; starts = [s for s, _ in segs] + [len(a) / sr]
for g0, g1 in zip(edges, starts):
    if g1 - g0 < 3: continue
    chunk = a[int(g0 * sr):int(g1 * sr)]
    if len(chunk) and float(np.sqrt(np.mean(chunk ** 2))) > 0.01:
        print(f"⚠️ possible recitation {g0:.2f}-{g1:.2f} (audio present, no transcript) — check the frames; protect it if it is a verse or hadith")
