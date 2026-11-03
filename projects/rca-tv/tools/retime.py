#!/usr/bin/env python3
"""retime.py <project dir> : insert story pauses into the VO at measured silences; write vo/voice_timed.wav (48 kHz mono)
and src/rca/timing.json (words + lines in seconds on the final timeline, total frames at 30 fps)."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
P = Path(sys.argv[1]); SR = 48000; FPS = 30
LEAD = 0.15                      # silence before the first word
TEMPO = 1.06                     # the read was 61.8 s; 6 % faster (pitch kept) lands the Short at ~58.5 s
CUTS = []
TAIL = 0.80
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(P / "vo/voice.mp3"), "-af", f"atempo={TEMPO}", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
parts, prev = [np.zeros(int(LEAD * SR), np.float32)], 0
for t, pad in CUTS:
    i = int(t * SR); parts += [x[prev:i], np.zeros(int(pad * SR), np.float32)]; prev = i
parts += [x[prev:], np.zeros(int(TAIL * SR), np.float32)]
y = np.concatenate(parts)
shift = lambda s: s / TEMPO + LEAD + sum(p for t, p in CUTS if s / TEMPO >= t)
words = json.loads((P / "vo/words.json").read_text()); lines = json.loads((P / "vo/lines.json").read_text())
for w in words: w["s"], w["e"] = round(shift(w["s"]), 3), round(shift(w["e"]), 3)
for l in lines: l["s"], l["e"] = round(shift(l["s"]), 3), round(shift(l["e"]), 3)
total = int(np.ceil(len(y) / SR * FPS))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s24le", str(P / "vo/voice_timed.wav")], input=y.tobytes(), check=True)
(P / "src/rca/timing.json").write_text(json.dumps({"fps": FPS, "total": total, "lines": lines, "words": words}, indent=0))
print("total", total, "frames", round(len(y) / SR, 2), "s"); [print(l) for l in lines]
