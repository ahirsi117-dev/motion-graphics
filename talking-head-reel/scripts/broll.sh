#!/usr/bin/env bash
# broll.sh <work> <name> <file> [start_s] [dur_s]
# Prepares a b-roll source as 30 fps 1080×1920 frames in <work>/broll/<name>/ (cover-cropped to vertical).
#   video → frames from start_s for dur_s (default: whole clip)   ·   image → one frame (animated by Ken Burns in the engine)
# Use it in scenes.json: {"s":11,"e":15,"mode":"broll","broll":{"name":"van","from":0,"kb":1},"tin":"whip"}
set -e
W="$1"; N="$2"; F="$3"; SS="${4:-0}"; DU="${5:-}"
D="$W/broll/$N"; rm -rf "$D"; mkdir -p "$D"
VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
case "${F,,}" in
  *.jpg|*.jpeg|*.png|*.webp|*.heic) ffmpeg -v error -y -i "$F" -vf "$VF" -frames:v 1 -q:v 2 "$D/00001.jpg" ;;
  *) ffmpeg -v error -y -ss "$SS" ${DU:+-t "$DU"} -i "$F" -vf "fps=30,$VF" -q:v 2 "$D/%05d.jpg" ;;
esac
echo "✅ broll/$N: $(ls "$D" | wc -l) frame(s)"
