#!/usr/bin/env python3
"""package.py <project dir> <video.mp4> <outdir> : publish package for ystd-s004-robot-butler in the ystdtmrw format
(publish-meta.md, SOURCES.tsv, ONSCREEN-TEXT.json, <id>.en.srt, sha256.txt). qc-text.md is written by the reviewer
(loket), never here."""
import hashlib, json, sys
from pathlib import Path

P, VID, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ID = "ystd-s004-robot-butler"
OUT.mkdir(parents=True, exist_ok=True)
T = json.loads((P / "src/butler/timing.json").read_text())
S = json.loads((P / "script.json").read_text())
VO = {l["id"]: l["vo"] for l in S["lines"]}

FILM = ("S01", "Film \"Leave It to Roll-Oh\" (1940), Jam Handy Organization for Chevrolet; Prelinger Archives (narration transcribed; panel frames)", "https://archive.org/details/LeaveItt1940", "primary (the film)")
CAT = ("S02", "Prelinger Archives catalog record for the film (archive.org metadata)", "https://archive.org/details/LeaveItt1940", "catalog")
IROBOT = ("S03", "iRobot press release, 18 Sep 2002: \"iRobot Introduces Roomba Intelligent FloorVac - The First Automatic Floor Cleaner In The U.S.\"", "https://media.irobot.com/2002-09-18-iRobot-Introduces-Roomba-Intelligent-FloorVac-The-First-Automatic-Floor-Cleaner-In-The-U-S", "primary (maker)")
CLAIMS = [
    ("C01", "L01", "1940 film sponsored by Chevrolet (made by the Jam Handy Organization)", CAT, "creator: Handy (Jam) Organization; sponsor: Chevrolet Division, General Motors Corporation; date: 1940"),
    ("C02", "L02,L05", "The film calls Roll-Oh \"the chromium-plated butler\" and says he \"is just a daydream after all\"", FILM, "Yes, Roll-Oh the robot, the chromium-plated butler, is just a daydream after all. (3:11-3:18)"),
    ("C03", "L03,L04", "Panel buttons: Answer Door, Wash Dishes, Get Dinner, Make Bed, Scram!", FILM, "panel frames at 78 s and 150 s: Roll-Oh / Answer Door / Wash Dishes / Answer Phone / Get Hat / Clean House / Get Dinner / Make Bed / Fix Furnace / SCRAM!"),
    ("C04", "L06", "His little brothers and sisters are \"small mechanical servants that never ask for afternoons off\"", FILM, "But not so Roll-Oh's little brother and sister robots, the millions of small mechanical servants that never ask for afternoons off (3:18-3:26)"),
    ("C05", "L07", "A tea kettle that pulls out its own plug; an electric eye that turns on the lights", FILM, "the kettle simply pulls out its own attachment plug (3:54-4:00); this little electric eye ... throws a switch and the first bank of lights goes on (4:20-4:34)"),
    ("C06", "L08", "A motor car \"simply full of robots\"", FILM, "Don't look now, but this motor car is simply full of robots. (6:11-6:15)"),
    ("C07", "chip", "Shown at the 1940 New York World's Fair", CAT, "Shown at the New York World's Fair in 1940."),
    ("C08", "L09,L10", "Introduced 18 Sep 2002 (62 years after 1940)", IROBOT, "When: Introduced to the U.S. market, September 18, 2002."),
    ("C09", "L11", "Its maker called it the first automatic floor vac available in the U.S.", IROBOT, "today unveiled Roomba Intelligent FloorVac -- the first automatic floor vac available in the U.S."),
    ("C10", "L11", "Suggested price $199.95", IROBOT, "priced at $199.95 (SRP)"),
]
rows = ["claim_id\tlines\tclaim (as used in VO)\tsource_id\tsource\turl\ttype\tlocator / supporting text\taccessed"]
for cid, lines, claim, src, quote in CLAIMS:
    rows.append("\t".join([cid, lines, claim, src[0], src[1], src[2], src[3], quote, "2026-11-03"]))
(OUT / "SOURCES.tsv").write_text("\n".join(rows) + "\n")

ONSCREEN = [
    {"graphic": "chip_1940", "kind": "chip", "title": "1940 · CHEVROLET-SPONSORED FILM", "src": "\"Leave It to Roll-Oh\" (1940), Prelinger Archives", "claims": ["C01"]},
    {"graphic": "nameplate", "kind": "set dressing", "title": "ROLL-OH (robot nameplate)", "claims": ["C02"]},
    {"graphic": "panel", "kind": "panel", "title": "Roll-Oh", "lines": ["ANSWER DOOR", "CLEAN HOUSE", "WASH DISHES", "GET DINNER", "ANSWER PHONE", "MAKE BED", "GET HAT", "FIX FURNACE", "SCRAM!"], "claims": ["C03"]},
    {"graphic": "card_promise", "kind": "promise card", "title": "THE PROMISE", "lines": ["A chrome robot butler at home.", "MADE 1940", "BY A CHEVROLET-SPONSORED FILM"], "claims": ["C01", "C02"]},
    {"graphic": "stamp", "kind": "verdict stamp", "title": "JUST A DAYDREAM", "claims": ["C02"], "note": "the film's own words"},
    {"graphic": "chip_fair", "kind": "chip", "title": "SHOWN AT THE 1940 NEW YORK WORLD'S FAIR", "src": "Prelinger Archives catalog", "claims": ["C07"]},
    {"graphic": "chip_2002", "kind": "chip", "title": "SEPT 18, 2002 · $199.95 SUGGESTED PRICE", "src": "iRobot press release, 18 Sep 2002", "claims": ["C08", "C10"]},
    {"graphic": "cta", "kind": "question", "title": "ROLL-OH / ROOMBA", "claims": [], "note": "CTA, no claim"},
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
DRAFT v1 (3 Nov 2026, riset; toon remake of the channel's Short 2n9ZyzatdzI, style test at Rama's direct order, R-489). 9:16 Short, {T['total'] / 30:.1f} s. Script PASS-TEXT pre-TTS (loket r2, 10:37 WIB).

## Title
```txt
Chevrolet's 1940 Robot Butler Was Just a Daydream
```

## Description
```txt
In 1940, Chevrolet sponsored a film about Roll-Oh, "the chromium-plated butler", run from a push-button panel: Answer Door, Wash Dishes, Get Dinner, Make Bed and, of course, Scram! Then the film admits Roll-Oh "is just a daydream after all". The film was really a Chevrolet promo about the relays and switches at work in the modern automobile: the real robots, it says, are "small mechanical servants" hidden in kettles, electric eyes, airliners and a motor car "simply full of robots". It was shown at the 1940 New York World's Fair.

Sixty-two years later, on September 18, 2002, iRobot introduced the Roomba, which its maker called the first automatic floor vac available in the U.S. Suggested price: $199.95.

Sources: "Leave It to Roll-Oh" (1940), Jam Handy Organization for Chevrolet, Prelinger Archives (archive.org/details/LeaveItt1940; public domain); iRobot press release, 18 Sep 2002.
Animation: original cartoon characters and 3D scenes made for this video, not footage from the film. Narration is an AI voice (ElevenLabs). Sound effects were generated with AI (ElevenLabs); the music was composed and synthesized for this video.
Roomba is a trademark of iRobot; this channel is not affiliated with iRobot or Chevrolet.

Research and fact-check by Yesterday's Tomorrow.

#shorts #history #robots
```

## Tags
```txt
leave it to roll-oh, robot butler, 1940, chevrolet, jam handy, retro future, roomba, 2002, history of robots, history
```

## Pinned comment
```txt
Roll-Oh or a Roomba: which one would you let in your house?
```

## Settings
```txt
Altered or synthetic content: YES (AI narration voice; animated, computer-generated scenes).
Made for kids: NO (history for a general audience; ASUMSI, Rama decides in Studio).
Related video: per loket R-132 rule for this channel (L001 if public; otherwise empty).
Slot: held by loket, Thu 12 Nov 19:00 WIB, after the gate. Upload manual by Rama.
Style test: same story as the channel's archival Short 2n9ZyzatdzI (87 views on 3 Nov); compare at 72 h.
```

## Review notes
- Video: {VID.name}, sha256 {sha}; 1080x1920, 30 fps, h264 + AAC.
- Facts: SOURCES.tsv (C01-C10, sources in riset-konten docs/pilot/toon-ystd/sources/rolloh/). On-screen text: ONSCREEN-TEXT.json.
- Script: riset-konten docs/pilot/toon-ystd/s004-robot-butler/NASKAH.md v2 (PASS-TEXT pre-TTS).
"""
(OUT / "publish-meta.md").write_text(META)
print("package ->", OUT, "sha256", sha[:12])
