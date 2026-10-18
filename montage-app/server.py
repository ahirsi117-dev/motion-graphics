#!/usr/bin/env python3
"""Local montage runner: upload a clip, pick techniques, watch progress, stop / resume / cancel.

Run:   python3 server.py        then open http://127.0.0.1:8765
Needs: ffmpeg and ffprobe on PATH. Standard library only.
Limits: 200 MB and 3 minutes per upload.

The server sends codes and structured log events, not sentences, so the page can show
Arabic or English in the language the user picked.
"""
import json
import os
import re
import shutil
import subprocess
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
JOBS_DIR = HERE / "jobs"
PORT = int(os.environ.get("PORT", "8765"))
MAX_BYTES = 200 * 1024 * 1024
MAX_SECONDS = 180
EXTS = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
ENCODE = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "192k"]
PAD = 0.05          # seconds kept around each speech segment (jump cut)
PUNCH_EVERY = 6.0   # seconds between zoom punches
PUNCH_LEN = 1.2     # length of one punch
PUNCH_AMOUNT = 0.12 # 1.0 -> 1.12 zoom at the peak

# Every montage type the user can pick. "why" is shown when the type is not built yet.
TECHNIQUES = [
    {"id": "jump_cut", "ar": "القطع القفزي", "en": "Jump Cut",
     "desc_ar": "يقص السكتات والتوقفات عشان الكلام يكون سريع ومتصل.",
     "desc_en": "Cuts out pauses and silences so speech stays tight."},
    {"id": "cross_cut", "ar": "القطع المتوازي", "en": "Cross Cut",
     "desc_ar": "يتنقل بين حدثين صاير بنفس الوقت.",
     "desc_en": "Jumps between two events happening at the same time.",
     "why_ar": "يحتاج أكثر من ملف", "why_en": "needs more than one file"},
    {"id": "match_cut", "ar": "القطع المتطابق", "en": "Match Cut",
     "desc_ar": "ينتقل من لقطة لأخرى تشبهها بالشكل أو الحركة.",
     "desc_en": "Moves from one shot to another that matches in shape or motion.",
     "why_ar": "يحتاج أكثر من ملف", "why_en": "needs more than one file"},
    {"id": "smash_cut", "ar": "القطع الصدمي", "en": "Smash Cut",
     "desc_ar": "يقفز من هدوء مفاجئ لمشهد قوي.",
     "desc_en": "Jumps from sudden quiet into a loud moment.",
     "why_ar": "يحتاج أكثر من ملف", "why_en": "needs more than one file"},
    {"id": "beat_sync", "ar": "مونتاج الإيقاع", "en": "Beat Sync",
     "desc_ar": "يقطّع اللقطات على نبضات الموسيقى.",
     "desc_en": "Cuts shots on the beats of the music.",
     "why_ar": "يحتاج تحليل الموسيقى", "why_en": "needs music analysis"},
    {"id": "jl_cut", "ar": "القطع المقسوم (J/L)", "en": "J/L Cut",
     "desc_ar": "الصوت يبدأ قبل الصورة أو يستمر بعدها.",
     "desc_en": "Audio starts before the picture or continues after it.",
     "why_ar": "يحتاج أكثر من ملف", "why_en": "needs more than one file"},
    {"id": "insert_shot", "ar": "لقطة الإدراج", "en": "Insert Shot",
     "desc_ar": "لقطة قريبة لتفصيلة مهمة تنحط داخل المشهد.",
     "desc_en": "A close shot of a key detail inserted into the scene.",
     "why_ar": "يحتاج لقطة ثانية", "why_en": "needs a second shot"},
    {"id": "cutaway", "ar": "لقطة التغطية", "en": "Cutaway",
     "desc_ar": "تغطي الصورة بلقطة من شي ثاني.",
     "desc_en": "Covers the picture with a shot of something else.",
     "why_ar": "يحتاج لقطة ثانية", "why_en": "needs a second shot"},
    {"id": "shot_reverse", "ar": "القطع بالانعكاس", "en": "Shot-Reverse-Shot",
     "desc_ar": "تتبادل بين شخصين أثناء الحوار.",
     "desc_en": "Alternates between two people during a conversation.",
     "why_ar": "يحتاج زاويتين", "why_en": "needs two angles"},
    {"id": "speed_ramp", "ar": "تغيير السرعة", "en": "Speed Ramp",
     "desc_ar": "تبطّئ الثلث الأوسط من الفيديو.",
     "desc_en": "Slows down the middle third of the video."},
    {"id": "punch_zoom", "ar": "الزوم المفاجئ", "en": "Punch-in Zoom",
     "desc_ar": "تكبّر الصورة بنبضة كل 6 ثوانٍ.",
     "desc_en": "Pulses a zoom into the picture every 6 seconds."},
    {"id": "whip_wipe", "ar": "الانتقال بالمسح", "en": "Whip / Wipe",
     "desc_ar": "تمسح الشاشة للمشهد الجديد.",
     "desc_en": "Wipes the screen into the next scene.",
     "why_ar": "يحتاج أكثر من ملف", "why_en": "needs more than one file"},
]


class StepError(Exception):
    """Carries a reason code the page turns into text."""


def run_capture(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def read_info(path):
    r = run_capture(["ffprobe", "-v", "error", "-select_streams", "v:0",
                     "-show_entries", "stream=width,height,r_frame_rate:format=duration",
                     "-of", "json", str(path)])
    if r.returncode:
        raise ValueError("unreadable")
    d = json.loads(r.stdout)
    s = d["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    fps = float(num) / float(den) if float(den or 0) else 30.0
    return {"duration": float(d["format"]["duration"]), "width": int(s["width"]),
            "height": int(s["height"]), "fps": fps}


# ---------- montage builders: each returns (ffmpeg input+output args, expected seconds) ----------

def detect_silences(path, duration):
    r = run_capture(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
                     "-af", "silencedetect=noise=-30dB:d=0.4", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    if len(starts) > len(ends):
        ends.append(duration)
    return list(zip(starts, ends))


def build_jump_cut(job, inp, out):
    keep, cur = [], 0.0
    for s, e in detect_silences(inp, job.duration):
        if s - cur >= 0.15:
            keep.append((max(0.0, cur - PAD), min(job.duration, s + PAD)))
        cur = max(cur, e)
    if job.duration - cur >= 0.15:
        keep.append((max(0.0, cur - PAD), job.duration))
    if not keep:
        raise StepError("no_speech")
    if len(keep) > 400:
        raise StepError("too_many_segments")
    parts, labels = [], ""
    for i, (a, b) in enumerate(keep):
        parts.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{i}];"
                     f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[a{i}]")
        labels += f"[v{i}][a{i}]"
    fc = ";".join(parts) + f";{labels}concat=n={len(keep)}:v=1:a=1[v][a]"
    args = ["-i", str(inp), "-filter_complex", fc, "-map", "[v]", "-map", "[a]", *ENCODE, str(out)]
    return args, sum(b - a for a, b in keep)


def build_punch_zoom(job, inp, out):
    fps = job.fps
    period = round(PUNCH_EVERY * fps)
    length = round(PUNCH_LEN * fps)
    z = (f"1+{PUNCH_AMOUNT}*lt(mod(on,{period}),{length})"
         f"*sin(PI*mod(on,{period})/{length})")
    vf = (f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
          f"d=1:s={job.w}x{job.h}:fps={fps:.3f}")
    args = ["-i", str(inp), "-vf", vf, "-map", "0:v", "-map", "0:a?", *ENCODE, str(out)]
    return args, job.duration


def build_speed_ramp(job, inp, out):
    d = job.duration
    t1, t2 = d / 3, 2 * d / 3
    fc = (f"[0:v]trim=end={t1:.3f},setpts=PTS-STARTPTS[v0];"
          f"[0:v]trim=start={t1:.3f}:end={t2:.3f},setpts=(PTS-STARTPTS)*2[v1];"
          f"[0:v]trim=start={t2:.3f},setpts=PTS-STARTPTS[v2];"
          f"[0:a]atrim=end={t1:.3f},asetpts=PTS-STARTPTS[a0];"
          f"[0:a]atrim=start={t1:.3f}:end={t2:.3f},asetpts=PTS-STARTPTS,atempo=0.5[a1];"
          f"[0:a]atrim=start={t2:.3f},asetpts=PTS-STARTPTS[a2];"
          "[v0][v1][v2]concat=n=3:v=1:a=0[v];[a0][a1][a2]concat=n=3:v=0:a=1[a]")
    args = ["-i", str(inp), "-filter_complex", fc, "-map", "[v]", "-map", "[a]", *ENCODE, str(out)]
    return args, t1 + 2 * (t2 - t1) + (d - t2)


BUILDERS = {
    "jump_cut": build_jump_cut,
    "punch_zoom": build_punch_zoom,
    "speed_ramp": build_speed_ramp,
}


# ---------- jobs ----------

class Job:
    def __init__(self, jid, src, info):
        self.id = jid
        self.dir = JOBS_DIR / jid
        self.src = src
        self.duration = info["duration"]
        self.w, self.h, self.fps = info["width"], info["height"], info["fps"]
        self.status = "uploaded"  # uploaded, running, stopped, failed, done, cancelled
        self.steps = []
        self.outputs = []         # finished step files, in order
        self.index = 0            # next step to run
        self.current = None
        self.progress = 0.0       # percent of the current step
        self.log = [{"k": "upload"}]
        self.proc = None
        self.thread = None
        self.stop_flag = False
        self.cancel_flag = False

    def note(self, event):
        self.log = (self.log + [event])[-80:]

    def input_path(self):
        return self.outputs[-1] if self.outputs else self.src

    def start(self, steps):
        if self.status not in ("uploaded", "done"):
            raise ValueError("busy")
        if not steps or any(s not in BUILDERS for s in steps):
            raise ValueError("need_steps")
        self.steps, self.outputs, self.index, self.log = list(steps), [], 0, []
        self.note({"k": "started", "ids": self.steps})
        self.launch()

    def launch(self):
        self.stop_flag = False
        self.status = "running"
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def resume(self):
        if self.status not in ("stopped", "failed"):
            raise ValueError("not_stopped")
        self.note({"k": "resumed", "n": self.index + 1})
        self.launch()

    def stop(self):
        if self.status != "running":
            raise ValueError("not_running")
        self.stop_flag = True
        p = self.proc
        if p and p.poll() is None:
            p.kill()
        if self.thread and self.thread is not threading.current_thread():
            self.thread.join(10)

    def cancel(self):
        self.cancel_flag = True
        p = self.proc
        if p and p.poll() is None:
            p.kill()
        if self.thread and self.thread is not threading.current_thread():
            self.thread.join(10)
        shutil.rmtree(self.dir, ignore_errors=True)
        self.status = "cancelled"

    def _set_stopped(self):
        self.status = "stopped"
        self.note({"k": "stopped", "n": self.index + 1})

    def _run(self):
        try:
            while self.index < len(self.steps):
                if self.cancel_flag:
                    return
                if self.stop_flag:
                    return self._set_stopped()
                tid = self.steps[self.index]
                n = self.index + 1
                out = self.dir / f"step{n}_{tid}.mp4"
                self.current, self.progress = tid, 0.0
                self.note({"k": "step", "n": n, "id": tid})
                args, expected = BUILDERS[tid](self, self.input_path(), out)
                if self.cancel_flag:
                    return
                if self.stop_flag:
                    return self._set_stopped()
                rc = self._exec(args, expected)
                if self.cancel_flag:
                    return
                if self.stop_flag:
                    out.unlink(missing_ok=True)
                    return self._set_stopped()
                if rc != 0:
                    out.unlink(missing_ok=True)
                    self.status = "failed"
                    self.note({"k": "failed", "n": n, "reason": "ffmpeg"})
                    return
                self.outputs.append(out)
                self.index += 1
                self.note({"k": "stepDone", "n": n})
                self._frame(out, n)
            shutil.copy(self.outputs[-1], self.dir / "final.mp4")
            self.current, self.progress = None, 100.0
            self.status = "done"
            self.note({"k": "allDone"})
        except StepError as e:
            self.status = "failed"
            self.note({"k": "failed", "n": self.index + 1, "reason": str(e)})
        finally:
            self.proc = None

    def _exec(self, args, expected):
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args,
               "-progress", "pipe:1", "-nostats"]
        with open(self.dir / "ffmpeg.err", "w") as err:
            self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, text=True)
            if self.stop_flag or self.cancel_flag:
                self.proc.kill()
            for line in self.proc.stdout:
                key, _, val = line.strip().partition("=")
                if key in ("out_time_us", "out_time_ms") and val.isdigit():
                    done = int(val) / 1_000_000
                    self.progress = min(99.0, 100 * done / max(expected, 0.1))
            return self.proc.wait()

    def _frame(self, path, n):
        t = min(1.0, self.duration / 2)
        run_capture(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.2f}",
                     "-i", str(path), "-frames:v", "1", "-vf", "scale=360:-2",
                     str(self.dir / f"frame{n}.jpg")])


TECH_BY_ID = {t["id"]: t for t in TECHNIQUES}
JOBS = {}
JOBS_LOCK = threading.Lock()


def job_view(job):
    return {
        "id": job.id,
        "status": job.status,
        "source": job.src.name,
        "duration": job.duration,
        "width": job.w,
        "height": job.h,
        "steps": job.steps,
        "index": job.index,
        "current": job.current,
        "progress": round(job.progress, 1),
        "log": job.log,
        "final": "final.mp4" if job.status == "done" else None,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "montage-local"

    def log_message(self, *args):
        pass

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, ctype):
        if not path.is_file():
            return self.send_json(404, {"error": "not_found"})
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.end_headers()
        with open(path, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def get_job(self, jid):
        job = JOBS.get(jid)
        if not job:
            self.send_json(404, {"error": "not_found"})
        return job

    def do_GET(self):
        p = urlparse(self.path).path
        if p == "/":
            return self.send_file(HERE / "index.html", "text/html; charset=utf-8")
        if p == "/api/techniques":
            return self.send_json(200, [{**t, "available": t["id"] in BUILDERS} for t in TECHNIQUES])
        m = re.fullmatch(r"/api/jobs/(\w+)", p)
        if m:
            job = self.get_job(m[1])
            return job and self.send_json(200, job_view(job))
        m = re.fullmatch(r"/api/jobs/(\w+)/media/([\w.-]+)", p)
        if m:
            job = self.get_job(m[1])
            if not job:
                return
            name = m[2]
            if name == job.src.name:
                return self.send_file(job.dir / name, "video/mp4")
            if name == "final.mp4":
                return self.send_file(job.dir / name, "video/mp4")
            return self.send_json(404, {"error": "not_found"})
        self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/api/jobs":
            return self.upload(parse_qs(url.query))
        m = re.fullmatch(r"/api/jobs/(\w+)/(start|stop|resume|cancel)", url.path)
        if not m:
            return self.send_json(404, {"error": "not_found"})
        job = self.get_job(m[1])
        if not job:
            return
        action = m[2]
        try:
            if action == "start":
                length = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(length) or b"{}")
                job.start(body.get("steps") or [])
            elif action == "stop":
                job.stop()
            elif action == "resume":
                job.resume()
            elif action == "cancel":
                job.cancel()
                with JOBS_LOCK:
                    JOBS.pop(job.id, None)
        except ValueError as e:
            return self.send_json(409, {"error": str(e)})
        self.send_json(200, job_view(job))

    def upload(self, qs):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return self.send_json(400, {"error": "empty"})
        if length > MAX_BYTES:
            self.close_connection = True
            return self.send_json(413, {"error": "too_big"})
        ext = Path(qs.get("name", ["video.mp4"])[0]).suffix.lower()
        if ext not in EXTS:
            ext = ".mp4"
        jid = uuid.uuid4().hex[:12]
        folder = JOBS_DIR / jid
        folder.mkdir(parents=True)
        src = folder / f"src{ext}"
        with open(src, "wb") as f:
            left = length
            while left > 0:
                chunk = self.rfile.read(min(1 << 20, left))
                if not chunk:
                    break
                f.write(chunk)
                left -= len(chunk)
        try:
            info = read_info(src)
        except ValueError as e:
            shutil.rmtree(folder, ignore_errors=True)
            return self.send_json(400, {"error": str(e)})
        if info["duration"] > MAX_SECONDS:
            shutil.rmtree(folder, ignore_errors=True)
            return self.send_json(400, {"error": "too_long"})
        job = Job(jid, src, info)
        with JOBS_LOCK:
            JOBS[jid] = job
        self.send_json(200, job_view(job))


def main():
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} not found on this machine")
    JOBS_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Open http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
