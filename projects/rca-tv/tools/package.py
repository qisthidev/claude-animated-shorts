#!/usr/bin/env python3
"""package.py <project dir> <video.mp4> <outdir> : publish package for ystd-s005-rca-tv in the ystdtmrw format
(publish-meta.md, SOURCES.tsv, ONSCREEN-TEXT.json, <id>.en.srt, sha256.txt). qc-text.md is written by the reviewer
(loket), never here."""
import hashlib, json, sys
from pathlib import Path

P, VID, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ID = "ystd-s005-rca-tv"
OUT.mkdir(parents=True, exist_ok=True)
T = json.loads((P / "src/rca/timing.json").read_text())
S = json.loads((P / "script.json").read_text())
VO = {l["id"]: l["vo"] for l in S["lines"]}

FILM = ("S01", "Film \"An RCA Presentation: Television\" (ca. 1939), Radio Corporation of America; Prelinger Archives (narration transcribed; frames)", "https://archive.org/details/RCAPrese1939", "primary (the film)")
CAT = ("S02", "Prelinger Archives catalog record for the film (archive.org metadata)", "https://archive.org/details/RCAPrese1939", "catalog")
BT = ("S03", "Broadcasting \u2022 Telecasting, 14 Apr 1958, p. 40 (Library of Congress scan, archive.org broadcastingtele54unse_0)", "https://archive.org/details/broadcastingtele54unse_0", "contemporary trade report of Census Bureau data")
CLAIMS = [
    ("C01", "L01", "Around 1939 RCA made a film introducing television to the American public", CAT, "date: ca. 1939; Early promotional film introducing TV to the American public"),
    ("C02", "L02", "\"After ten years of experiment\", television was \"first shown to the public at the World's Fair\"", FILM, "After 10 years of experiment, television, first shown to the public at the World's Fair, now takes its place as a new American art and industry."),
    ("C03", "L03", "The set: \"much like a radio in appearance\", with a screen and a \"slanted mirror that reflects the image\"", FILM, "Except for the screen and slanted mirror that reflects the image to the audience, it is much like a radio in appearance."),
    ("C04", "L04", "Iconoscope \"turns the image into electricity\"; kinescope \"recreates the image\"", FILM, "the iconoscope turns the image into electricity ... [the kinescope tube] receives the electrical impulses created in the iconoscope tube, and recreates the image"),
    ("C05", "L05", "Transmitter \"atop the Empire State Building\"", FILM, "the NBC television transmitter atop the Empire State Building sends the program out"),
    ("C06", "L06", "The limit was the horizon: \"only as far as the eye can see on a perfectly clear day\"", FILM, "the limit of television is the distance from the antenna to the horizon. From the Empire State Building, a program can be sent only as far as the eye can see on a perfectly clear day."),
    ("C07", "L07", "A typical program: a horse race, camera \"atop the grandstand\"", FILM, "Typical of programs covered by the mobile television units is a horse race ... The cameramen set up the portable iconoscope camera atop the grandstand."),
    ("C08", "L08", "\"And so a new American industry has been born.\"", FILM, "And so a new American industry has been born."),
    ("C09", "L09", "1950: 12% of U.S. homes had a TV (decennial census)", BT, "The 1950 decennial census showed that 12% of U. S. homes had tv receivers."),
    ("C10", "L10", "January 1958: 83% of U.S. households had a TV, according to the Census Bureau", BT, "EIGHTY-THREE PERCENT of U. S. households had television sets in January, according to the Census Bureau."),
]
rows = ["claim_id\tlines\tclaim (as used in VO)\tsource_id\tsource\turl\ttype\tlocator / supporting text\taccessed"]
for cid, lines, claim, src, quote in CLAIMS:
    rows.append("\t".join([cid, lines, claim, src[0], src[1], src[2], src[3], quote, "2026-11-03"]))
(OUT / "SOURCES.tsv").write_text("\n".join(rows) + "\n")

ONSCREEN = [
    {"graphic": "chip_film", "kind": "chip", "title": "CA. 1939 \u00b7 AN RCA FILM", "src": "\"An RCA Presentation: Television\", Prelinger Archives", "claims": ["C01"]},
    {"graphic": "labels_tubes", "kind": "labels", "title": "ICONOSCOPE (the camera tube) / KINESCOPE (the picture tube)", "claims": ["C04"]},
    {"graphic": "chip_esb", "kind": "chip", "title": "EMPIRE STATE BUILDING", "src": "the RCA film", "claims": ["C05"]},
    {"graphic": "chip_horizon", "kind": "chip", "title": "LIMIT: THE HORIZON", "src": "the RCA film", "claims": ["C06"]},
    {"graphic": "chip_grandstand", "kind": "chip", "title": "CAMERA ATOP THE GRANDSTAND", "src": "the RCA film", "claims": ["C07"]},
    {"graphic": "card_promise", "kind": "promise card", "title": "THE PROMISE", "lines": ["A new American industry.", "MADE CA. 1939", "BY RCA"], "claims": ["C08"]},
    {"graphic": "counter", "kind": "data", "title": "1950 CENSUS 12% / JANUARY 1958 83% of U.S. homes with a TV", "src": "Broadcasting, 14 Apr 1958 (Census Bureau data; ARF estimates)", "claims": ["C09", "C10"]},
    {"graphic": "stamp", "kind": "verdict stamp", "title": "CAME TRUE", "claims": ["C09", "C10"], "note": "channel verdict on 'a new American industry' from 12% to 83%"},
    {"graphic": "cta", "kind": "question", "title": "YES / NO", "claims": [], "note": "CTA, no claim"},
]
(OUT / "ONSCREEN-TEXT.json").write_text(json.dumps(ONSCREEN, ensure_ascii=False, indent=1) + "\n")


def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


srt, n = [], 1
words = T["words"]
for line in T["lines"]:
    ws = [w for w in words if w["line"] == line["id"]]
    chunk = []
    for i, w in enumerate(ws):
        chunk.append(w)
        text = " ".join(x["w"] for x in chunk)
        if len(text) > 34 or i == len(ws) - 1 or (w["w"][-1] in ".?!:" and len(text) > 14):
            srt.append(f"{n}\n{ts(chunk[0]['s'])} --> {ts(chunk[-1]['e'] + 0.05)}\n{text}\n"); n += 1; chunk = []
(OUT / f"{ID}.en.srt").write_text("\n".join(srt))

sha = hashlib.sha256(VID.read_bytes()).hexdigest()
(OUT / "sha256.txt").write_text(f"{sha}  {VID.name}\n")

META = f"""# publish-meta: {ID}
DRAFT v1 (3 Nov 2026, riset; toon remake of the channel's Short lUT2tVrKfBo, style test at Rama's direct order, R-489). 9:16 Short, {T['total'] / 30:.1f} s. Script PASS-TEXT pre-TTS (loket r2, 10:59 WIB).

## Title
```txt
The 1939 Pitch for Pictures From the Sky
```

## Description
```txt
Around 1939, RCA made a film to introduce television to America. "After ten years of experiment," it says, television was "first shown to the public at the World's Fair." The set looked "much like a radio," with a screen and a slanted mirror; the iconoscope camera tube "turns the image into electricity" and the kinescope "recreates the image." The signal went out from a transmitter atop the Empire State Building, but only "as far as the eye can see on a perfectly clear day." A typical program: a horse race, with a camera atop the grandstand. "And so," the film says, "a new American industry has been born."

In 1950, the census found TV sets in 12% of U.S. homes. By January 1958, 83% of U.S. households had a TV, according to the Census Bureau. (The two figures come from different measurements: the 1950 decennial census and a January 1958 survey estimate, as reported by Broadcasting, 14 Apr 1958.)

Sources: "An RCA Presentation: Television" (ca. 1939), Radio Corporation of America, Prelinger Archives (archive.org/details/RCAPrese1939; public domain); Broadcasting \u2022 Telecasting, 14 Apr 1958, p. 40 (Library of Congress scan).
Animation: original cartoon characters and 3D scenes made for this video, not footage from the film. Narration is an AI voice (ElevenLabs). Sound effects were generated with AI (ElevenLabs); the music was composed and synthesized for this video.
This channel is not affiliated with RCA or NBC.

Research and fact-check by Yesterday's Tomorrow.

#shorts #history #television
```

## Tags
```txt
rca, 1939, television history, world's fair 1939, iconoscope, kinescope, empire state building, nbc, retro future, history
```

## Pinned comment
```txt
Would you have bought a TV in 1939? Yes or no?
```

## Settings
```txt
Altered or synthetic content: YES (AI narration voice; animated, computer-generated scenes).
Made for kids: NO (history for a general audience; ASUMSI, Rama decides in Studio).
Related video: per loket R-132 rule for this channel (L001 if public; otherwise empty).
Slot: held by loket, Sun 15 Nov 19:00 WIB, after the gate. Upload manual by Rama.
Style test: same story as the channel's archival Short lUT2tVrKfBo (924 views on 3 Nov); compare at 72 h.
```

## Review notes
- Video: {VID.name}, sha256 {sha}; 1080x1920, 30 fps, h264 + AAC. VO sped up 6 % (atempo 1.06, pitch kept) to fit the kit length.
- Facts: SOURCES.tsv (C01-C10, sources in riset-konten docs/pilot/toon-ystd/sources/rca/). On-screen text: ONSCREEN-TEXT.json.
- Script: riset-konten docs/pilot/toon-ystd/s005-rca-tv/NASKAH.md v2 (PASS-TEXT pre-TTS).
"""
(OUT / "publish-meta.md").write_text(META)
print("package ->", OUT, "sha256", sha[:12])
