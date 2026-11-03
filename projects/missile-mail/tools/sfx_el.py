#!/usr/bin/env python3
"""sfx_el.py <outdir> --acc : ElevenLabs sound effects (eleven_text_to_sound_v3), one mp3 per cue, never re-requested.
Key: ELEVENLABS_API_KEY_CREATOR from the environment (caller sources the Creator key file; never printed)."""
import json, os, subprocess, sys, urllib.request
from pathlib import Path

CUES = {  # name: (seconds, prompt) -- peaks: launch, stamp, crash (premium P9: <= 3)
    "launch": (3.0, "Loud close-mic rocket booster ignition and roar, a small cruise missile launching off a ship deck at sea, powerful whoosh that fades into the distance"),
    "stamp": (0.8, "Single heavy rubber stamp slammed onto paper on a wooden desk, punchy close-mic thump"),
    "crash": (3.0, "Small metal rocket crash-lands on a frozen lake: hard thud on ice, then a long scraping skid across the ice slowing to a stop"),
    "sea": (8.0, "Calm open sea ambience, gentle waves lapping against a steel hull, light wind, no voices"),
    "flyby": (3.0, "Small jet engine flyby passing quickly from left to right, doppler whoosh, outdoors"),
    "winter": (8.0, "Quiet cold winter wind over a frozen lake, soft gusts, faint creaking of bare trees, no voices"),
    "drag": (4.0, "Slow footsteps crunching on ice while two heavy canvas sacks are dragged behind, rhythmic scraping"),
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
