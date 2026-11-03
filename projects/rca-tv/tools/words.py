#!/usr/bin/env python3
"""words.py <vo dir> <script.json> : ElevenLabs character alignment -> words.json + lines.json (seconds)."""
import json, sys
from pathlib import Path
vo = Path(sys.argv[1]); s = json.loads(Path(sys.argv[2]).read_text())
a = json.loads((vo / "alignment.json").read_text())
ch, st, en = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
words, cur, line, lines = [], None, 0, [{"id": l["id"], "words": []} for l in s["lines"]]
for c, t0, t1 in zip(ch, st, en):
    if c == "\n":
        if cur: words.append(cur); lines[line]["words"].append(len(words) - 1); cur = None
        line += 1; continue
    if c.isspace():
        if cur: words.append(cur); lines[line]["words"].append(len(words) - 1); cur = None
        continue
    if cur is None: cur = {"w": c, "s": t0, "e": t1, "line": s["lines"][line]["id"]}
    else: cur["w"] += c; cur["e"] = t1
if cur: words.append(cur); lines[line]["words"].append(len(words) - 1)
out_lines = [{"id": l["id"], "s": round(words[l["words"][0]]["s"], 3), "e": round(words[l["words"][-1]]["e"], 3), "n": len(l["words"])} for l in lines]
for w in words: w["s"] = round(w["s"], 3); w["e"] = round(w["e"], 3)
(vo / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=0))
(vo / "lines.json").write_text(json.dumps(out_lines, ensure_ascii=False, indent=1))
for l in out_lines: print(l)
print(len(words), "words")
