#!/usr/bin/env bash
# frames.sh <work> — copies the source and extracts it as 30 fps 1080×1920 frames (cover-cropped) into <work>/vfr/.
# Usage: frames.sh <work> <source video>
set -e
W="$1"; SRC="$2"; mkdir -p "$W/vfr"
[ -n "$SRC" ] && [ "$SRC" != "$W/src.mp4" ] && cp "$SRC" "$W/src.mp4"
VF="fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
echo "$VF" > "$W/vf.txt"     # encode.py reuses the exact same framing for protected ranges
ffmpeg -v error -y -i "$W/src.mp4" -vf "$VF" -q:v 2 "$W/vfr/%05d.jpg"
echo "frames: $(ls "$W/vfr" | wc -l)  duration: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/src.mp4")s"
