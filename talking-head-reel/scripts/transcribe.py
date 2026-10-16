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
