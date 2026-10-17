"""captions.py <work> [--max 6]
Builds <work>/caps.json (word-timed caption cards) from a.json (whisper) + fixes.json (your corrections).

fixes.json:
  {"fix": [ ["word","word",...],   # one list per whisper segment, SAME word count as whisper's
            "a free sentence",     # or a plain string when whisper hallucinated: words are spread over the segment
            ... ],
   "hot": ["word", ...]}           # words drawn in the accent colour
  "" inside a list hides that word from the captions (the audio is untouched).
Cards are split every --max words, at pauses > 0.45 s, and at every segment boundary. Words inside a protected range
(scenes.json -> "protect") are dropped, and cards are clipped so no caption touches it.
Every word keeps a ref "seg:index" (e.g. "6:3") that scenes.json uses to sync graphics to speech."""
import json, os, sys
W = os.path.abspath(sys.argv[1])
MAXW = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 6
tr = json.load(open(os.path.join(W, "a.json")))
fp = os.path.join(W, "fixes.json")
fx = json.load(open(fp)) if os.path.exists(fp) else {"fix": [], "hot": []}
FIX, HOT = fx.get("fix", []), set(fx.get("hot", []))
sp = os.path.join(W, "scenes.json")
PROT = json.load(open(sp)).get("protect", []) if os.path.exists(sp) else []
dur = float(os.popen(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{os.path.join(W, "src.mp4")}"').read())
inprot = lambda t: any(a - 0.05 <= t <= b for a, b in PROT)

words = []
for i, seg in enumerate(tr["segments"]):
    ws = seg.get("words", [])
    if not ws: continue
    f = FIX[i] if i < len(FIX) else [w["word"].strip() for w in ws]
    if isinstance(f, str):
        toks = f.split(); s0, e0 = ws[0]["start"], ws[-1]["end"]; tot = sum(len(t) for t in toks) or 1; c = 0
        for j, t in enumerate(toks):
            a = s0 + (e0 - s0) * c / tot; c += len(t)
            words.append({"t": t, "s": a, "e": s0 + (e0 - s0) * c / tot, "ref": f"{i}:{j}", "seg": i})
    else:
        if len(f) != len(ws):
            sys.exit(f"❌ segment {i}: whisper has {len(ws)} words, fixes.json has {len(f)} — they must match (or use a plain string)")
        for j, (w, t) in enumerate(zip(ws, f)):
            words.append({"t": t, "s": w["start"], "e": w["end"], "ref": f"{i}:{j}", "seg": i})

refs = {w["ref"]: [round(w["s"], 3), round(w["e"], 3)] for w in words}
vis = [w for w in words if w["t"] and not inprot(w["s"])]
cards, cur = [], []
for w in vis:
    if cur and (len(cur) >= MAXW or w["s"] - cur[-1]["e"] > 0.45 or w["seg"] != cur[-1]["seg"]):
        cards.append(cur); cur = []
    cur.append(w)
if cur: cards.append(cur)
out = []
for c in cards:
    s, e = max(0, c[0]["s"] - 0.08), c[-1]["e"] + 0.3
    for a, b in PROT:
        if s < a < e: e = a - 0.02
    out.append({"s": round(s, 3), "e": round(e, 3),
                "w": [{"t": w["t"], "s": round(w["s"], 3), "e": round(w["e"], 3), "hot": w["t"] in HOT, "ref": w["ref"]} for w in c]})
for a, b in zip(out, out[1:]):
    if a["e"] > b["s"]: a["e"] = round(b["s"] - 0.02, 3)
json.dump({"total": round(dur, 3), "cards": out, "refs": refs}, open(os.path.join(W, "caps.json"), "w"), ensure_ascii=False, indent=1)
print(f"cards: {len(out)}  duration: {dur:.2f}s  protected: {PROT}")
seg = -1
for w in words:
    if w["seg"] != seg:
        seg = w["seg"]; print(f"\n{seg:>3} [{w['s']:.2f}] ", end="")
    print(f"{w['t']}({w['ref'].split(':')[1]}) ", end="")
print()
