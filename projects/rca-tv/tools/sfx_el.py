#!/usr/bin/env python3
"""sfx_el.py <outdir> --acc : ElevenLabs sound effects (eleven_text_to_sound_v3), one mp3 per cue, never re-requested.
Key: ELEVENLABS_API_KEY_CREATOR from the environment (caller sources the Creator key file; never printed)."""
import json, os, subprocess, sys, urllib.request
from pathlib import Path

CUES = {  # name: (seconds, prompt) -- peaks: tvon, race, stamp (copied) (premium P9: <= 3)
    "fair": (8.0, "Outdoor world's fair crowd murmur, distant brass band, flags flapping in a light wind, no clear words"),
    "tvon": (1.5, "Old vacuum-tube television switching on: a heavy click, a rising warm hum and a faint high whistle, close-mic"),
    "lab": (6.0, "Quiet electrical laboratory hum, buzzing vacuum tubes and a soft transformer drone"),
    "signal": (3.0, "Soft radio signal sweep pulsing outward, gentle shimmering tone"),
    "race": (4.0, "Horse race: thundering hooves galloping past close and a cheering grandstand crowd"),
    "street": (6.0, "Quiet evening city street ambience, distant traffic, faint radio and television murmur from open windows"),
}


def main(argv):
    if "--acc" not in argv:
        sys.exit("Refusing: pass --acc (spends Creator credits).")
    out = Path(argv[0]); out.mkdir(parents=True, exist_ok=True)
    key = os.environ.get("ELEVENLABS_API_KEY_CREATOR") or sys.exit("ELEVENLABS_API_KEY_CREATOR not set")
    stamp = lambda: subprocess.run(["date", "+%Y-%m-%d %H:%M WIB"], capture_output=True, text=True, env=dict(os.environ, TZ="Asia/Jakarta")).stdout.strip()
    for name, (dur, prompt) in CUES.items():
        mp3 = out / f"{name}.mp3"
        if mp3.exists():
            continue
        body = {"text": prompt, "duration_seconds": dur, "prompt_influence": 0.6, "model_id": "eleven_text_to_sound_v3"}
        req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", data=json.dumps(body).encode(),
                                     method="POST", headers={"xi-api-key": key, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=180) as r:
            hdr = {k.lower(): v for k, v in r.headers.items()}; mp3.write_bytes(r.read())
        line = f"{stamp()} sfx {name} model=eleven_text_to_sound_v3 dur={dur} character-cost={hdr.get('character-cost', '?')} request-id={hdr.get('request-id', '?')}"
        with open(out / "credits.log", "a") as f:
            f.write(line + "\n")
        print(line)


if __name__ == "__main__":
    main(sys.argv[1:])
