#!/usr/bin/env bash
# setup.sh [FontFamily] — checks and installs everything the reel pipeline needs.
# Safe to re-run: it only installs what is missing. Prints a READY line at the end.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CACHE="$HOME/.cache/talking-head-reel"; mkdir -p "$CACHE"
FONT="${1:-Tajawal}"
PY=python3; command -v python3 >/dev/null || PY=python
ok(){ echo "✅ $1"; }; miss(){ echo "❌ $1"; MISSING=1; }
MISSING=0

# 1) ffmpeg
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null && ok "ffmpeg" || miss "ffmpeg — install it (brew install ffmpeg / apt-get install ffmpeg / winget install ffmpeg)"

# 2) whisper (word timestamps). On machines without a GPU, install CPU-only torch FIRST:
#    the default torch wheel pulls ~2-3 GB of CUDA libraries and can stall for 20+ minutes.
if $PY -c "import whisper" 2>/dev/null; then ok "whisper"; else
  echo "⏬ installing whisper (CPU build)…"
  PIPX="$PY -m pip install --quiet"
  $PIPX torch --index-url https://download.pytorch.org/whl/cpu 2>/dev/null \
    || $PIPX --break-system-packages torch --index-url https://download.pytorch.org/whl/cpu 2>/dev/null
  $PIPX openai-whisper 2>/dev/null || $PIPX --break-system-packages openai-whisper 2>/dev/null
  $PY -c "import whisper" 2>/dev/null && ok "whisper" || miss "whisper — pip install openai-whisper failed"
fi

# 3) node + puppeteer-core (drives a headless Chromium that draws every frame)
if command -v node >/dev/null; then
  if [ -d "$HERE/node_modules/puppeteer-core" ]; then ok "puppeteer-core"; else
    (cd "$HERE" && npm install --silent --no-audit --no-fund puppeteer-core@23 >/dev/null 2>&1) && ok "puppeteer-core" || miss "puppeteer-core — npm install failed"
  fi
else miss "Node.js 18+ — install the LTS from https://nodejs.org"; fi

# 4) a Chromium/Chrome binary
CH="${CHROME_PATH:-}"
if [ -z "$CH" ]; then
  for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux/chrome \
           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" /usr/bin/google-chrome /usr/bin/google-chrome-stable \
           /usr/bin/chromium /usr/bin/chromium-browser "/c/Program Files/Google/Chrome/Application/chrome.exe"; do
    [ -x "$c" ] && CH="$c" && break
  done
fi
if [ -n "$CH" ]; then echo "$CH" > "$CACHE/chrome_path"; ok "browser: $CH"; else miss "Chrome/Chromium — install Google Chrome or set CHROME_PATH"; fi

# 5) the theme font as local TTF files (web fonts often fail to load inside headless Chromium)
$PY "$HERE/fetch_font.py" "$FONT" && ok "font: $FONT" || miss "font $FONT — could not download; the page will fall back to a system font"

[ "$MISSING" = 0 ] && echo "READY" || echo "NOT READY — fix the ❌ lines above"
