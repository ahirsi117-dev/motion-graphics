#!/usr/bin/env bash
# cut.sh <source> <out.mp4> <a-b> [<c-d> ...]
# Keeps only the given time ranges (seconds) and joins them, frame-accurate, audio and video together.
# Use it BEFORE frames.sh when the video has retakes ("the same sentence said twice": keep the later, corrected take
# unless the user says otherwise) or long silences. Ask the user which take to keep when it changes the meaning.
set -e
SRC="$1"; OUT="$2"; shift 2; n=0; F=""; L=""
for r in "$@"; do a="${r%-*}"; b="${r#*-}"
  F="$F[0:v]trim=start=$a:end=$b,setpts=PTS-STARTPTS[v$n];[0:a]atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$(python3 -c "print(max(0,$b-$a-0.03))"):d=0.03[a$n];"
  L="$L[v$n][a$n]"; n=$((n+1)); done
ffmpeg -v error -y -i "$SRC" -filter_complex "${F}${L}concat=n=$n:v=1:a=1[v][a]" -map "[v]" -map "[a]" \
  -c:v libx264 -preset fast -crf 16 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k "$OUT"
echo "✅ $OUT  $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s from $n range(s)"
