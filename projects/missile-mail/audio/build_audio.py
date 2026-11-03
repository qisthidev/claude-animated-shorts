#!/usr/bin/env python3
"""build_audio.py <project dir> : original score + SFX + VO -> public/audio/mix.wav (48 kHz, 24-bit, stereo).

Score (composed here, template synth instruments in templates/audio): F major, 100 BPM (premium-feel band "smooth"
90-110: a light retro lounge for a curious story, not hype). Sections follow the picture and the VO:
  A hook + submarine (lounge: pluck bass, brushes, vibes)      -> breath stop before "Fire." (launch roar alone)
  B flight + Mayport (eighth-note pluck ostinato, brushes)      -> C promise (warm pad, glockenspiel line, moon swell)
  dead stop on the MISSED stamp, one deflating tuba fall        -> D 1936 (music box, filtered like an old record)
  stop for the crash on the ice                                 -> E the drag (plodding tuba + brushes), button chord.
SFX (ElevenLabs eleven_text_to_sound_v3, audio/sfx): 3 peaks only (launch, stamp, crash) + low beds (sea, flyby,
winter wind, drag). Loudness: VO-led mix, integrated -14 LUFS, true peak <= -1.5 dBTP.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

P = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(P.parents[1] / "templates/audio"))
from dsp import SR, ns, rng, pan, place, fades, dbg, lp, hp, integrated, true_peak, norm_to, read_wav, write_wav, make_ir, convolve_st  # noqa: E402
import instruments as I  # noqa: E402

T = json.loads((P / "src/mail/timing.json").read_text())
DUR = T["total"] / 30
L = {l["id"]: l for l in T["lines"]}
W = T["words"]


def word(line, k):
    for w in W:
        if w["line"] == line and re.sub(r"[^a-z0-9-]", "", w["w"].lower()).startswith(k):
            return w
    raise KeyError(k)


T_FIRE = word("L04", "fire")["s"]
T_STAMP = word("L09", "differently")["s"] + 0.05
T_CRASH = word("L12", "crash")["s"] - 0.1
T_DRAG = word("L12", "so")["s"] - 0.15
B6 = (round(word("L05", "mayport")["s"] * 30) - 10) / 30
END = L["L13"]["e"]
BEAT = 0.6
N = ns(DUR)
m2f = I.m2f

# ---------------------------------------------------------------- score
CH = {"F": [53, 57, 60, 64], "Dm": [50, 53, 57, 60], "Gm": [55, 58, 62, 65], "C7": [48, 52, 55, 58], "Bb": [46, 50, 53, 57]}
ROOT = {"F": 41, "Dm": 38, "Gm": 43, "C7": 36, "Bb": 34}
PROG = ["F", "Dm", "Gm", "C7"]
r = rng(42)


def bars(t0, t1):
    """bar start times on the beat grid from t0 until t1"""
    out, t = [], t0
    while t < t1 - 0.01:
        out.append(t); t += 4 * BEAT
    return out


def lounge(buf, t0, t1, drive=False, gain=1.0):
    for bi, tb in enumerate(bars(t0, t1)):
        c = PROG[bi % 4]
        for k in range(4):
            tk = tb + k * BEAT
            if tk >= t1: break
            if drive:  # eighth-note bass ostinato
                for e in range(2):
                    te = tk + e * BEAT / 2
                    if te < t1: place(buf, pan(I.pluck(m2f(ROOT[c] + (12 if e else 0)), vel=0.55, r=r, dur=0.28, bright=0.35), -0.1), te, 0.55 * gain)
            elif k in (0, 2):
                place(buf, pan(I.pluck(m2f(ROOT[c] + (7 if k == 2 else 0)), vel=0.6, r=r, dur=0.55, bright=0.3), -0.1), tk, 0.6 * gain)
            if k in (1, 3) or drive:
                place(buf, pan(I.brush(vel=0.35 if k in (1, 3) else 0.18, r=r, dur=0.3), 0.25), tk, 0.45 * gain)
            if k in (1, 3):  # off-beat vibes chord
                for j, m in enumerate(CH[c][1:]):
                    place(buf, pan(I.vibes(m2f(m + 12), vel=0.32, r=r, dur=0.5), 0.35), tk + BEAT / 2 + 0.006 * j, 0.32 * gain)


MEL_C = [(0, 72, 1.5), (1.5, 74, 0.5), (2, 76, 2), (4, 77, 1.5), (5.5, 76, 0.5), (6, 74, 2), (8, 72, 1), (9, 70, 1), (10, 69, 2), (12, 72, 3), (15, 79, 3)]


def promise(buf, t0, t1, gain=1.0):
    seq = ["F", "Dm", "Bb", "C7"]
    for bi, tb in enumerate(bars(t0, t1)):
        c = seq[bi % 4]
        d = min(4 * BEAT, t1 - tb)
        place(buf, I.pad([m2f(m) for m in CH[c]], d, vel=0.4, r=r, att=0.5, rel=0.8, warm=1100), tb, 0.30 * gain)
        place(buf, pan(I.pluck(m2f(ROOT[c]), vel=0.5, r=r, dur=1.2, bright=0.25), -0.1), tb, 0.5 * gain)
    for off, m, ln in MEL_C:
        tm = t0 + off * BEAT
        if tm < t1 - 0.2: place(buf, pan(I.glock(m2f(m + 12), vel=0.5, r=r, dur=1.4), 0.2), tm, 0.30 * gain)


def musicbox_1936(buf, t0, t1, gain=1.0):
    mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 77, 74]
    i, t = 0, t0
    while t < t1 - 0.1:
        place(buf, pan(I.musicbox(m2f(mel[i % len(mel)] + 12), vel=0.5, r=r, dur=1.2), 0.15), t, 0.5 * gain)
        if i % 4 == 0: place(buf, pan(I.musicbox(m2f(mel[i % len(mel)]), vel=0.35, r=r, dur=1.4), -0.15), t, 0.4 * gain)
        i += 1; t += BEAT / 2


def plod(buf, t0, t1, gain=1.0):
    seq = [(41, 2), (36, 2), (41, 2), (36, 2)]
    t, i = t0, 0
    while t < t1 - 0.1:
        m, b = seq[i % 4]
        place(buf, pan(I.brass(m2f(m), BEAT * 0.9, vel=0.55, r=r, kind="tuba"), -0.05), t, 0.55 * gain)
        place(buf, pan(I.brush(vel=0.3, r=r, dur=0.3), 0.25), t + BEAT, 0.4 * gain)
        t += b * BEAT; i += 1


mus = np.zeros((2, N))
lounge(mus, 0.15, T_FIRE - 0.15)
lounge(mus, L["L05"]["s"] - 0.05, L["L07"]["s"] - 0.05, drive=True)
promise(mus, L["L07"]["s"] - 0.05, T_STAMP - 0.02)
# moon: high glock sparkle on "moon"
place(mus, pan(I.glock(m2f(96), vel=0.6, r=r, dur=2.0), 0.3), word("L08", "moon")["s"], 0.28)
place(mus, pan(I.brass(m2f(46), 0.35, vel=0.5, r=r, kind="soft", fall=-5.0), 0.0), T_STAMP + 0.35, 0.5)  # deflating fall
box = np.zeros((2, N)); musicbox_1936(box, L["L10"]["s"] + 0.1, T_CRASH - 0.12)
box = np.stack([lp(hp(ch, 350), 3800) for ch in box])  # old-record band
mus += box
plod(mus, T_DRAG, END - 0.2)
for m in CH["F"]: place(mus, pan(I.vibes(m2f(m + 12), vel=0.5, r=r, dur=2.0), 0.2), END + 0.05, 0.35)  # button
place(mus, pan(I.brass(m2f(41), 0.6, vel=0.6, r=r, kind="tuba"), 0), END + 0.05, 0.5)
# gentle hard-stop shaping: 40 ms fades at each music stop so nothing clicks
for ts in (T_FIRE - 0.15, T_STAMP - 0.02, T_CRASH - 0.12):
    i = ns(ts); k = ns(0.04)
    mus[:, i - k:i] *= np.linspace(1, 0, k)[None, :]
ir = make_ir(1.1, 7, pre=0.01, hf=0.7)
mus = 0.82 * mus + 0.18 * convolve_st(mus, ir)[:, :N]

# ---------------------------------------------------------------- SFX
def load_mp3(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2).T
    return x / (np.abs(x).max() + 1e-9)  # peak-normalise (EL v3 levels vary wildly)


def peak_at(buf, x, t_peak, target, mode="momentary", fin=0.005, fout=0.08):
    x = norm_to(fades(x, fin, fout), target, mode)
    env = np.abs(x).max(axis=0)
    place(buf, x, t_peak - env.argmax() / SR)


def bed(buf, x, t0, t1, target, fin=0.6, fout=0.8):
    n = ns(t1 - t0)
    reps = int(np.ceil(n / x.shape[1])) + 1
    y = np.concatenate([x] * reps, axis=1)[:, :n]
    y = norm_to(y, target, "integrated")
    a, b = ns(fin), ns(fout)
    y[:, :a] *= np.linspace(0, 1, a)[None, :]; y[:, -b:] *= np.linspace(1, 0, b)[None, :]
    place(buf, y, t0)


S = P / "audio/sfx"
sfx = np.zeros((2, N))
bed(sfx, load_mp3(S / "sea.mp3"), 0.0, T_FIRE + 1.6, -34)
peak_at(sfx, load_mp3(S / "launch.mp3"), T_FIRE + 0.08, -13)
fly = load_mp3(S / "flyby.mp3"); peak_at(sfx, fly, B6 + 1.4, -21)
peak_at(sfx, load_mp3(S / "stamp.mp3"), T_STAMP, -15, fin=0.001)
bed(sfx, load_mp3(S / "winter.mp3"), L["L10"]["s"] - 0.3, DUR, -33, fin=0.4, fout=0.6)
peak_at(sfx, load_mp3(S / "crash.mp3"), T_CRASH + 0.03, -14, fin=0.002, fout=0.4)
drag = load_mp3(S / "drag.mp3"); bed(sfx, drag, T_DRAG, min(END, T_DRAG + 4.0), -27, fin=0.15, fout=0.5)

# ---------------------------------------------------------------- VO + ducking + loudness
v, sr = read_wav(str(P / "vo/voice_timed.wav")); assert sr == SR
v = v[0][:N]; v = np.pad(v, (0, N - len(v)))
v = hp(v, 70)
spans = []
for w in W:
    if spans and w["s"] - spans[-1][1] < 0.35: spans[-1][1] = w["e"]
    else: spans.append([w["s"], w["e"]])
duck = np.zeros(N)
for a, b in spans: duck[max(0, ns(a - 0.08)):ns(b + 0.15)] = 1
k = ns(0.12); ker = np.hanning(2 * k + 1); ker /= ker.sum()
duck = np.convolve(duck, ker, mode="same")
mus_g = mus * dbg(-9.0 * duck)[None, :]
vo = pan(v, 0.0) * 0.5
vo = norm_to(vo, -15.0, "integrated")
mus_g = norm_to(mus_g, -25.5, "integrated")
mix = vo + mus_g + sfx
mix = norm_to(mix, -14.0, "integrated")
# soft-knee peak limiter: gain from a smoothed peak envelope, 3 ms look-ahead
ceil = dbg(-1.5)
env = np.abs(mix).max(axis=0)
la = ns(0.003); env = np.maximum.reduce([np.roll(env, -i) for i in range(0, la, 8)])
g = np.minimum(1.0, ceil / (env + 1e-9))
rel = ns(0.08); g2 = g.copy()
for i in range(1, N):
    g2[i] = min(g[i], g2[i - 1] + (1 - g2[i - 1]) / rel)
mix *= g2[None, :]
mix = fades(mix, 0.002, 0.25)
out = P / "public/audio/mix.wav"; out.parent.mkdir(parents=True, exist_ok=True)
write_wav(str(out), mix)
stems = P / "audio/stems"; stems.mkdir(exist_ok=True)
for name, x in (("vo", vo), ("music", mus_g), ("sfx", sfx)): write_wav(str(stems / f"{name}.wav"), x)
print(f"mix {DUR:.2f}s integrated {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP")
print(f"cues: fire {T_FIRE:.2f} stamp {T_STAMP:.2f} crash {T_CRASH:.2f} drag {T_DRAG:.2f} end {END:.2f}")
