"""encode.py <work> <out.mp4> [--cover] [--loudnorm]
Joins out/ frames with the ORIGINAL audio. Protected ranges (scenes.json → "protect") are taken
straight from the source video with the same framing — nothing drawn, nothing added, audio untouched.
--cover      shows cover.jpg for the first 0.1 s (the reel's thumbnail = first frame). Audio unchanged.
--loudnorm   normalises loudness to -14 LUFS (applies a single gain to the whole video, protected parts included —
             ask before using it when the video contains Quran or anything the user asked to keep untouched)."""
import json, os, subprocess, sys
W = os.path.abspath(sys.argv[1]); OUT = os.path.abspath(sys.argv[2]); FPS = 30
J = lambda f: json.load(open(os.path.join(W, f))) if os.path.exists(os.path.join(W, f)) else {}
prot = sorted(J("scenes.json").get("protect", []))
n = len([f for f in os.listdir(os.path.join(W, "vfr")) if f.endswith(".jpg")])
miss = [i for i in range(1, n + 1) if not os.path.exists(os.path.join(W, "out", f"{i:05d}.jpg"))]
if miss: sys.exit(f"❌ {len(miss)} frames missing in out/ (first: {miss[0]}) — run render.mjs again, it only draws what is missing")
dur = n / FPS
vf = open(os.path.join(W, "vf.txt")).read().strip()
segs, cur = [], 0   # [(kind, f0, f1)] frame ranges
for a, b in prot:
    fa, fb = max(cur, round(a * FPS)), min(n, round(b * FPS))
    if fa > cur: segs.append(("draw", cur, fa))
    if fb > fa: segs.append(("src", fa, fb)); cur = fb
if cur < n: segs.append(("draw", cur, n))
parts, labels = [], []
nd = sum(1 for s in segs if s[0] == "draw")
if nd: parts.append(f"[0:v]scale=in_range=pc:out_range=tv,format=yuv420p,split={nd}" + "".join(f"[d{i}]" for i in range(nd)))
di = 0
for k, (kind, a, b) in enumerate(segs):
    if kind == "draw":
        parts.append(f"[d{di}]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS[s{k}]"); di += 1
    else:
        parts.append(f"[1:v]{vf},trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS,format=yuv420p[s{k}]")
    labels.append(f"[s{k}]")
parts.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=0[cat]")
inputs = ["-framerate", str(FPS), "-i", os.path.join(W, "out", "%05d.jpg"), "-i", os.path.join(W, "src.mp4")]
if "--cover" in sys.argv:
    inputs += ["-loop", "1", "-t", "0.1", "-i", os.path.join(W, "cover.jpg")]
    parts.append("[2:v]scale=1080:1920,format=yuv420p,setpts=PTS-STARTPTS[cv];[cat][cv]overlay=enable='lt(t,0.1)':eof_action=pass[vo]")
else:
    parts.append("[cat]null[vo]")
af = f"[1:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,apad=whole_dur={dur:.3f}" + (",loudnorm=I=-14:TP=-1.5:LRA=11" if "--loudnorm" in sys.argv else "") + "[ao]"
parts.append(af)
cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(parts), "-map", "[vo]", "-map", "[ao]",
       "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
       "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", OUT]
subprocess.run(cmd, check=True)
size = os.path.getsize(OUT) / 1048576
print(f"✅ {OUT}  {dur:.2f}s  {size:.1f} MB  segments: " + ", ".join(f"{k} {a/FPS:.2f}-{b/FPS:.2f}" for k, a, b in segs))
# fidelity check of every protected range against the source (PSNR ≥ 40 dB = visually identical)
for a, b in prot:
    r = subprocess.run(["ffmpeg", "-ss", f"{a+0.1:.2f}", "-t", f"{max(0.5, b-a-0.2):.2f}", "-i", OUT, "-ss", f"{a+0.1:.2f}", "-t", f"{max(0.5, b-a-0.2):.2f}", "-i", os.path.join(W, "src.mp4"),
                        "-filter_complex", f"[1:v]{vf},setpts=PTS-STARTPTS,settb=1/30,format=yuv420p[s];[0:v]fps=30,setpts=PTS-STARTPTS,settb=1/30,format=yuv420p[o];[o][s]psnr", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = [l for l in r.splitlines() if "average:" in l]
    print(f"🔒 protected {a:.2f}-{b:.2f}: " + (m[-1].split("average:")[1].split()[0] + " dB PSNR vs source" if m else "check failed"))
