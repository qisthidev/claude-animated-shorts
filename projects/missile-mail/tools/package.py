#!/usr/bin/env python3
"""package.py <project dir> <video.mp4> <outdir> : publish package for ystd-s003-missile-mail in the ystdtmrw format
(publish-meta.md, SOURCES.tsv, ONSCREEN-TEXT.json, <id>.en.srt, sha256.txt). qc-text.md is written by the reviewer
(loket), never here."""
import hashlib, json, sys
from pathlib import Path

P, VID, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ID = "ystd-s003-missile-mail"
OUT.mkdir(parents=True, exist_ok=True)
T = json.loads((P / "src/mail/timing.json").read_text())
S = json.loads((P / "script.json").read_text())
VO = {l["id"]: l["vo"] for l in S["lines"]}

USPS = ("S01", "USPS Historian, \"Missile Mail\" (July 2008)", "https://about.usps.com/who/profile/history/pdf/missile-mail.pdf", "primary (USPS historian)")
NASA = ("S02", "NASA, Apollo 11 mission page", "https://www.nasa.gov/mission/apollo-11/", "primary (NASA)")
CLAIMS = [
    ("C01", "L01,L02", "On 8 Jun 1959 the Navy submarine USS Barbero fired a guided missile carrying 3,000 letters toward the naval auxiliary air station in Mayport, Florida", USPS, "On June 8, 1959, ... the Navy submarine USS Barbero fired a guided missile carrying 3,000 letters towards the naval auxiliary air station in Mayport, Florida."),
    ("C02", "L02", "The missile was a Regulus", USPS, "photo caption: Postmaster General Arthur E. Summerfield unloads mail from a Regulus guided missile at the Mayport Naval Auxiliary Air Station near Jacksonville, Florida."),
    ("C03", "L02", "Off (the coast of) Florida", USPS, "from the deck of the submarine off the coast of Florida"),
    ("C04", "L03", "3,000 letters, all from the Postmaster General", USPS, "The letters, in special commemorative envelopes, were all from the Postmaster General to leading government officials and prominent citizens"),
    ("C05", "L05", "More than 100 miles to the air station in about 22 minutes (the 600 mph figure is left out: 600 mph x 22 min does not match 100 miles)", USPS, "the guided missile traveled the more than 100 miles from the deck of the submarine off the coast of Florida to the air station in about 22 minutes"),
    ("C06", "L06", "The Postmaster General called it \"of historic significance to the peoples of the entire world\"", USPS, "a move that Postmaster General Arthur A. Summerfield heralded as \"of historic significance to the peoples of the entire world,\""),
    ("C07", "L07", "Prediction: \"Before man reaches the moon, mail will be delivered within hours ... to England, to India or to Australia by guided missiles\"", USPS, "\"Before man reaches the moon,\" Summerfield was quoted as saying, \"mail will be delivered within hours from New York to California, to England, to India or to Australia by guided missiles.\""),
    ("C08", "L08", "Ten years later (July 1969) man reached the moon", NASA, "July 20, 1969: One Giant Leap For Mankind"),
    ("C09", "L09", "History proved differently", USPS, "History proved differently, but this experiment with missile mail exemplifies the pioneering spirit"),
    ("C10", "L10,L11", "Earliest known U.S. rocket mail: unofficial, 23 Feb 1936, two rockets, about 2,000 feet across a frozen lake toward the Hewitt, N.J. post office from Greenwood Lake, N.Y.", USPS, "The earliest known unofficial transportation by rocket of U.S. Mail took place on February 23, 1936, when two rockets transported mail about 2,000 feet across a frozen lake towards the Hewitt, New Jersey, Post Office, from Greenwood Lake, New York."),
    ("C11", "L12", "Both crash-landed short and slid along the ice; the Hewitt postmaster dragged the mailbags the rest of the way", USPS, "The rockets crash-landed before reaching their destination and slid along the ice; the postmaster of Hewitt obliged by removing the two bags of mail and dragging them the rest of the way to the Post Office."),
]
rows = ["claim_id\tlines\tclaim (as used in VO)\tsource_id\tsource\turl\ttype\tlocator / supporting text\taccessed"]
for cid, lines, claim, src, quote in CLAIMS:
    rows.append("\t".join([cid, lines, claim, src[0], src[1], src[2], src[3], quote, "2026-11-03"]))
(OUT / "SOURCES.tsv").write_text("\n".join(rows) + "\n")

ONSCREEN = [
    {"graphic": "chip_date", "kind": "chip", "title": "JUNE 8, 1959 · USS BARBERO", "src": "USPS Historian (2008)", "claims": ["C01"]},
    {"graphic": "chip_letters", "kind": "chip", "title": "3,000 LETTERS", "src": "USPS Historian (2008)", "claims": ["C01", "C04"]},
    {"graphic": "chip_flight", "kind": "chip", "title": "100+ MILES · ABOUT 22 MIN", "src": "USPS Historian (2008)", "claims": ["C05"]},
    {"graphic": "chip_mayport", "kind": "chip", "title": "MAYPORT, FLA.", "sub": "Naval Auxiliary Air Station", "claims": ["C01", "C02"]},
    {"graphic": "sign_station", "kind": "set dressing", "title": "NAVAL AUXILIARY AIR STATION / MAYPORT, FLA.", "claims": ["C02"]},
    {"graphic": "card_promise", "kind": "promise card", "title": "THE PROMISE", "lines": ["Mail by guided missile, within hours, across oceans.", "MADE 1959", "BY THE POSTMASTER GENERAL", "DUE BEFORE MAN REACHES THE MOON"], "claims": ["C07"], "note": "channel summary of the quote; 'across oceans' covers England, India, Australia (reviewer r1 S2)"},
    {"graphic": "stamp_missed", "kind": "verdict stamp", "title": "MISSED", "claims": ["C09"], "note": "channel verdict from 'History proved differently'"},
    {"graphic": "chip_moon", "kind": "chip", "title": "JULY 20, 1969", "src": "NASA, Apollo 11", "claims": ["C08"]},
    {"graphic": "chip_1936", "kind": "chip", "title": "FEB 23, 1936 · GREENWOOD LAKE, N.Y. → HEWITT, N.J.", "src": "USPS Historian (2008)", "claims": ["C10"]},
    {"graphic": "sign_po", "kind": "set dressing", "title": "POST OFFICE / HEWITT, N.J.", "claims": ["C10"]},
    {"graphic": "sacks", "kind": "set dressing", "title": "U.S. MAIL (two sacks)", "claims": ["C11"]},
    {"graphic": "chip_2000ft", "kind": "chip", "title": "ABOUT 2,000 FT ACROSS THE ICE", "claims": ["C10"]},
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
DRAFT v1 (3 Nov 2026, riset; pilot format at Rama's direct order, R-486). 9:16 Short, {T['total'] / 30:.1f} s. Script PASS-TEXT pre-TTS (loket r2, 09:32 WIB).

## Title
```txt
The Navy Once Delivered Mail by Missile
```

## Description
```txt
On June 8, 1959, the U.S. Navy submarine USS Barbero fired a Regulus guided missile carrying 3,000 letters, all from the Postmaster General, toward the naval auxiliary air station at Mayport, Florida. It covered more than 100 miles in about 22 minutes. The Postmaster General called it "of historic significance to the peoples of the entire world" and predicted that, before man reached the moon, mail would be delivered within hours by guided missiles. Ten years later, Apollo 11 landed on the moon. History proved differently: missile mail remains only a footnote in the history of mail delivery.

The earliest known U.S. rocket mail was an unofficial try on February 23, 1936: two rockets across a frozen lake toward the Hewitt, New Jersey, post office. Both crash-landed short, and the postmaster dragged the mailbags the rest of the way.

Sources: USPS Historian, "Missile Mail" (July 2008); NASA, Apollo 11 mission page.
Animation: original cartoon characters and 3D scenes made for this video; the characters are illustrations, not portraits of real people. Narration is an AI voice (ElevenLabs). Sound effects were generated with AI (ElevenLabs); the music was composed and synthesized for this video.

Research and fact-check by Yesterday's Tomorrow.

#shorts #history #missilemail
```

## Tags
```txt
missile mail, uss barbero, regulus missile, postmaster general, 1959, rocket mail, postal history, apollo 11, retro future, history
```

## Pinned comment
```txt
Would you have trusted a missile with your mail? Yes or no.
```

## Settings
```txt
Altered or synthetic content: YES (AI narration voice; animated, computer-generated scenes).
Made for kids: NO (history for a general audience; ASUMSI, Rama decides in Studio).
Related video: none yet (no long-form on missile mail exists; backlog T05/L006). ystdtmrw/hq decide whether to point it at L001.
Slot: held by loket, Sun 8 Nov 19:00 WIB, after the gate (hq INFO 09:28 WIB). Upload manual by Rama (channel not on Buffer).
```

## Review notes
- Video: {VID.name}, sha256 {sha}; 1080x1920, 30 fps, h264 + AAC.
- Facts: SOURCES.tsv (C01-C11, sources downloaded in riset-konten docs/pilot/missile-mail/sources/). On-screen text: ONSCREEN-TEXT.json.
- Script and VO lines: riset-konten docs/pilot/missile-mail/NASKAH.md v2 (PASS-TEXT pre-TTS, QC-REVIEW-r2.md).
- Deviation from the channel kit (archival film): animated 3D-toon pilot by Rama's direct order (R-486); palette, fonts and promise card from the kit.
"""
(OUT / "publish-meta.md").write_text(META)
print("package ->", OUT, "sha256", sha[:12])
