#!/usr/bin/env python3
"""tts.py <script.json> <outdir> --acc : one ElevenLabs request for the whole VO (eleven_v4, with-timestamps).

Key: ELEVENLABS_API_KEY_CREATOR from the environment (the caller sources the Creator key file; never printed here).
Writes outdir/voice.mp3, outdir/alignment.json (character timings), outdir/request.json (text + settings, no key),
and appends one line to outdir/credits.log. Refuses to run twice (an existing voice.mp3 is never re-requested).
"""
import base64, json, os, sys, urllib.request, subprocess
from pathlib import Path

VOICE = "3H55HGnNE1XjYxigHSAS"  # Yesterday's Tomorrow narrator "Marcus K" (ystdtmrw kit/voice.env, 30 Oct 2026)
MODEL = "eleven_v4"


def main(argv):
    if "--acc" not in argv:
        sys.exit("Refusing: pass --acc (spends Creator credits).")
    s = json.loads(Path(argv[0]).read_text())
    out = Path(argv[1]); out.mkdir(parents=True, exist_ok=True)
    if (out / "voice.mp3").exists():
        sys.exit("voice.mp3 exists; delete it on purpose to pay for a new take.")
    text = "\n".join(l["vo"] for l in s["lines"])
    body = {"text": text, "model_id": MODEL}
    (out / "request.json").write_text(json.dumps({"voice_id": VOICE, **body}, ensure_ascii=False, indent=1))
    key = os.environ.get("ELEVENLABS_API_KEY_CREATOR")
    if not key:
        sys.exit("ELEVENLABS_API_KEY_CREATOR not set")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        hdr = dict(r.headers); d = json.loads(r.read())
    (out / "voice.mp3").write_bytes(base64.b64decode(d["audio_base64"]))
    (out / "alignment.json").write_text(json.dumps(d.get("normalized_alignment") or d.get("alignment"), ensure_ascii=False))
    (out / "alignment_raw.json").write_text(json.dumps(d.get("alignment"), ensure_ascii=False))
    stamp = subprocess.run(["date", "+%Y-%m-%d %H:%M WIB"], capture_output=True, text=True, env=dict(os.environ, TZ="Asia/Jakarta")).stdout.strip()
    low = {k.lower(): v for k, v in hdr.items()}
    line = f"{stamp} tts voice={VOICE} model={MODEL} chars={len(text)} character-cost={low.get('character-cost', '?')} request-id={low.get('request-id', '?')}"
    with open(out / "credits.log", "a") as f:
        f.write(line + "\n")
    print(line)


if __name__ == "__main__":
    main(sys.argv[1:])
