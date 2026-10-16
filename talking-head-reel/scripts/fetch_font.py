"""fetch_font.py <Family> — downloads a Google Font as TTF (weights 400/700/800/900 when available)
into ~/.cache/talking-head-reel/fonts/<Family>/. A plain 'curl' user-agent makes Google serve .ttf."""
import os, re, sys, urllib.request
fam = sys.argv[1] if len(sys.argv) > 1 else "Tajawal"
dst = os.path.join(os.path.expanduser("~/.cache/talking-head-reel/fonts"), fam)
os.makedirs(dst, exist_ok=True)
if len([f for f in os.listdir(dst) if f.endswith(".ttf")]) >= 2:
    sys.exit(0)
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "curl/8"}), timeout=30).read()
got = 0
for w in (400, 700, 800, 900):
    try:
        css = get(f"https://fonts.googleapis.com/css2?family={fam.replace(' ', '+')}:wght@{w}").decode()
    except Exception:
        continue
    m = re.search(r"url\((https://[^)]+\.ttf)\)", css)
    if m:
        open(os.path.join(dst, f"w{w}.ttf"), "wb").write(get(m.group(1))); got += 1
sys.exit(0 if got else 1)
