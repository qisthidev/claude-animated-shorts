# Missile Mail (Yesterday's Tomorrow, ystd-s003)

An original ~58 s story Short built on this repo's engine (three.js inside Remotion, the template's ink / lens blur /
grade / toon-card pipeline from `templates/bridge`). Story, characters, world, script, VO and music are ours:

- **Story:** on 8 Jun 1959 the submarine USS Barbero fired a Regulus missile carrying 3,000 letters to Mayport,
  Florida; the Postmaster General predicted missile mail "before man reaches the moon"; then a 1936 stinger (two
  rockets crash-land on a frozen lake, the Hewitt postmaster drags the bags). Facts are locked to the USPS Historian
  (2008) and NASA; see the fact-lock and script in the riset-konten repo (`docs/pilot/missile-mail/`).
- **Cast (original):** the Postmaster (homburg, orange tie, holds a cover), two sailors (dixie cups), the 1936
  postmaster (cap, scarf, two U.S. MAIL sacks). Drawn with the template's Pen/body code plus new hats and props
  (`src/engine/toon.ts`). No real-person likeness.
- **World (original):** toon submarine + launcher + Regulus-type missile with a mail bay, open sea, Mayport air
  station, the moon with a lander, a frozen lake and post office (`src/mail/world.ts`). No external models.
- **Look:** palette, fonts (Josefin Sans, Libre Caslon Text, IBM Plex Mono; OFL, `public/fonts`) and the promise
  card follow the Yesterday's Tomorrow kit. The 1936 act gets an "old" grade and film grain.

## Build
```bash
npm install                                    # pinned versions (remotion 4.0.538, three 0.169, postprocessing 6.36.4)
python3 tools/tts.py script.json vo --acc      # ElevenLabs eleven_v4, channel narrator; needs ELEVENLABS_API_KEY_CREATOR
python3 tools/words.py vo script.json && python3 tools/retime.py .   # word timings, story pauses -> src/mail/timing.json
python3 tools/sfx_el.py audio/sfx --acc        # ElevenLabs eleven_text_to_sound_v3 cues
<venv with numpy+scipy>/python audio/build_audio.py .   # original score + SFX + VO -> public/audio/mix.wav (-14 LUFS)
node tools/stills.mjs out/st/f 39,104,229 0.5 '{"post":{"audio":false}}'   # check stills (one bundle)
npx remotion render src/index.ts MissileMail out/missile-mail.mp4 --gl=angle --codec=h264 --crf=18 --concurrency=4
python3 tools/package.py . out/missile-mail.mp4 <publish dir>          # publish-meta, SOURCES, on-screen text, SRT, sha256
```
`vo/`, `audio/sfx/` and `public/audio/mix.wav` are generated assets (paid credits): keep them, re-requesting costs again.

## Engine changes vs `templates/bridge`
- `InkPass` dispose guarded (`dispose?.()`): postprocessing 6.36 has no `dispose()` on it and the template crashed at the end of a render.
- `grade.ts`: extra presets (`dusk`, `space`, `winter` = old-film look), string-keyed.
- `toon.ts`: hats `homburg` and `dixie`, `tie`, `scarf`, prop `letter`.
- `sprites.ts`: the template's canvas pool / Actor / Fx, unchanged, split out of `cast.ts`.
