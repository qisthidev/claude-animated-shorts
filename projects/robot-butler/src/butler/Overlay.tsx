// 2D layer over the 3D picture, in the Yesterday's Tomorrow kit (tools/gfx.py): Josefin Sans titles, Libre Caslon
// italic for quotes, IBM Plex Mono chips; ink #101418, cream #F1E8D6, paper #E9DEC6, teal #2A8C82, orange #E0702F.
// Word-synced captions (cream, black border, current word orange), fact chips with their source, the channel's
// promise card with the MISSED verdict stamp, the 1936 paper dip, and the yes/no question at the end.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { KIT } from "./look";
import { FPS, WORDS, SHOTS, BOUNDS, lineAt, wordAt, T_CMD, T_SCRAM, T_DAYDREAM, clamp01, easeOut } from "./story";

// ---------------- fonts (OFL files in public/fonts) ----------------
const FONTS: [string, string, string, string][] = [
  ["Josefin Sans", "fonts/JosefinSans.ttf", "100 700", "normal"],
  ["Libre Caslon Text", "fonts/LibreCaslonText-Italic.ttf", "400 700", "italic"],
  ["IBM Plex Mono", "fonts/IBMPlexMono-Medium.ttf", "500", "normal"],
  ["IBM Plex Mono", "fonts/IBMPlexMono-Bold.ttf", "700", "normal"],
];
export const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(FONTS.map(([fam, file, weight, style]) => new FontFace(fam, `url(${staticFile(file)})`, { weight, style }).load().then((ff) => { document.fonts.add(ff); })))
      .then(() => continueRender(h)).catch((e) => { console.error(e); continueRender(h); });
  }, [h]);
};
const JOSEFIN = "'Josefin Sans', sans-serif", CASLON = "'Libre Caslon Text', serif", MONO = "'IBM Plex Mono', monospace";

// ---------------- captions ----------------
type Chunk = { a: number; b: number; words: { w: string; s: number }[] };
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Chunk | null = null, line = "";
  WORDS.forEach((w, i) => {
    const brk = !cur || w.line !== line || cur.words.length >= 3 || /[.,?!:]["”]?$/.test(cur.words[cur.words.length - 1].w);
    if (brk) { if (cur) out.push(cur); cur = { a: w.s - 0.04, b: w.e, words: [] }; line = w.line; }
    cur!.words.push({ w: w.w, s: w.s }); cur!.b = w.e;
    if (i === WORDS.length - 1) out.push(cur!);
  });
  for (let i = 0; i < out.length; i++) out[i].b = Math.min(out[i].b + 0.35, i + 1 < out.length ? out[i + 1].a : out[i].b + 0.35);
  return out;
})();
const clean = (w: string) => w.replace(/^["“]|["”]$/g, "").replace(/\.\.\.$/, "…");

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const c = CHUNKS.find((k) => t >= k.a && t < k.b);
  if (!c) return null;
  const pop = easeOut((t - c.a) / 0.12);
  return (
    <div style={{ position: "absolute", left: 70, right: 150, top: 1180, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 22px",
      transform: `scale(${0.94 + 0.06 * pop})`, transformOrigin: "50% 50%" }}>
      {c.words.map((w, i) => (
        <span key={i} style={{ fontFamily: JOSEFIN, fontWeight: 700, fontSize: 84, lineHeight: 1.12, letterSpacing: "0.01em",
          color: t >= w.s - 0.02 && (i + 1 >= c.words.length || t < c.words[i + 1].s) ? KIT.orange : KIT.cream,
          WebkitTextStroke: "14px #000", paintOrder: "stroke fill", textTransform: "uppercase" }}>{clean(w.w)}</span>
      ))}
    </div>
  );
};

// ---------------- fact chips ----------------
type ChipDef = { a: number; b: number; text: string; src?: string };
const CHIPS: ChipDef[] = [
  { a: lineAt("L01").s + 0.3, b: SHOTS[0].b / FPS, text: "1940 · CHEVROLET-SPONSORED FILM", src: "Source: \"Leave It to Roll-Oh\" (1940), Prelinger Archives" },
  { a: lineAt("L08").s + 0.15, b: SHOTS[7].b / FPS, text: "SHOWN AT THE 1940 NEW YORK WORLD'S FAIR", src: "Source: Prelinger Archives catalog" },
  { a: wordAt("L10", "september").s, b: SHOTS[9].b / FPS, text: "SEPT 18, 2002 · $199.95 SUGGESTED PRICE", src: "Source: iRobot press release, 18 Sep 2002" },
]
const Chip: React.FC<{ c: ChipDef; t: number }> = ({ c, t }) => {
  const k = easeOut((t - c.a) / 0.25), out = clamp01((c.b - t) / 0.15);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 250, display: "flex", flexDirection: "column", alignItems: "flex-start", opacity: Math.min(k, out), transform: `translateY(${(1 - k) * -16}px)` }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, letterSpacing: "0.06em", color: KIT.ink, background: KIT.cream, padding: "12px 20px 10px", borderLeft: `10px solid ${KIT.teal}`, boxShadow: "0 6px 0 rgba(16,20,24,0.35)", maxWidth: 900 }}>{c.text}</div>
      {c.src ? <div style={{ marginTop: 12, fontFamily: MONO, fontWeight: 500, fontSize: 24, color: KIT.cream, background: "rgba(16,20,24,0.55)", padding: "4px 10px" }}>{c.src}</div> : null}
    </div>
  );
};

// ---------------- the button panel (labels as painted on the film's panel) ----------------
const BTN: [string, number | null][] = [["ANSWER DOOR", T_CMD.door], ["CLEAN HOUSE", null], ["WASH DISHES", T_CMD.dishes], ["GET DINNER", T_CMD.dinner], ["ANSWER PHONE", null], ["MAKE BED", T_CMD.bed], ["GET HAT", null], ["FIX FURNACE", null]];
const Panel: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const s3 = SHOTS[2];
  if (f < s3.a || f >= s3.b) return null;
  const enter = easeOut((t - s3.a / FPS) / 0.35), out = clamp01((s3.b / FPS - t) / 0.2);
  const lit = (ts: number | null) => ts !== null && t >= ts - 0.03;
  const now = (ts: number | null) => ts !== null && t >= ts - 0.03 && t < ts + 0.45;
  const scram = t >= T_SCRAM - 0.03;
  return (
    <div style={{ position: "absolute", left: 150, right: 150, top: 180, opacity: Math.min(enter, out), transform: `translateY(${(1 - enter) * 50}px) rotate(1deg) scale(0.86)`, transformOrigin: "50% 0%" }}>
      <div style={{ background: "#2b2f33", border: `6px solid ${KIT.ink}`, borderRadius: 18, padding: "18px 26px 26px", boxShadow: "0 16px 0 rgba(16,20,24,0.45)" }}>
        <div style={{ fontFamily: CASLON, fontStyle: "italic", fontSize: 58, color: KIT.cream, textAlign: "center", marginBottom: 14 }}>Roll-Oh</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 22px" }}>
          {BTN.map(([label, ts]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, background: KIT.paper, border: `4px solid ${KIT.ink}`, padding: "10px 12px 6px", transform: `scale(${now(ts) ? 1.06 : 1})` }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, border: `4px solid ${KIT.ink}`, background: lit(ts) ? KIT.orange : "#6b7177", boxShadow: lit(ts) ? "0 0 18px rgba(224,112,47,0.9)" : "none" }} />
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: KIT.ink, letterSpacing: "0.02em" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <div style={{ fontFamily: JOSEFIN, fontWeight: 700, fontSize: 64, color: KIT.cream, background: scram ? KIT.orange : "#7a3a2a", border: `5px solid ${KIT.ink}`, padding: "10px 44px 2px", transform: `scale(${scram ? 1 + 0.15 * clamp01(1 - (t - T_SCRAM) / 0.3) : 1})` }}>SCRAM!</div>
        </div>
      </div>
    </div>
  );
};

// ---------------- the promise card + verdict ----------------
const Field: React.FC<{ k: string; v: string; on: number }> = ({ k, v, on }) => (
  <div style={{ display: "flex", gap: 18, alignItems: "baseline", opacity: on, transform: `translateX(${(1 - on) * -14}px)`, margin: "10px 0" }}>
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: KIT.teal, width: 92, letterSpacing: "0.08em" }}>{k}</div>
    <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 32, color: KIT.ink }}>{v}</div>
  </div>
);
const PromiseCard: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const s4 = SHOTS[3];
  if (f < s4.a || f >= s4.b) return null;
  const t0 = s4.a / FPS, enter = easeOut((t - t0) / 0.35), fld = (d: number) => easeOut((t - t0 - d) / 0.3);
  const T_STAMP = T_DAYDREAM + 0.05, st = (t - T_STAMP) / 0.16, stamped = t >= T_STAMP;
  const slam = stamped ? Math.max(1, 2.1 - 1.1 * easeOut(st)) : 0;
  const jolt = stamped && t - T_STAMP < 0.2 ? Math.sin((t - T_STAMP) * 90) * 6 * (1 - (t - T_STAMP) / 0.2) : 0;
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 300, opacity: enter, transform: `translateY(${(1 - enter) * 60 + jolt}px) rotate(-1.5deg)` }}>
      <div style={{ background: KIT.paper, border: `5px solid ${KIT.ink}`, boxShadow: "0 18px 0 rgba(16,20,24,0.45)", padding: "0 0 26px" }}>
        <div style={{ background: KIT.teal, color: KIT.cream, fontFamily: JOSEFIN, fontWeight: 700, fontSize: 44, letterSpacing: "0.22em", padding: "18px 34px 12px" }}>THE PROMISE</div>
        <div style={{ padding: "20px 34px 6px", fontFamily: CASLON, fontStyle: "italic", fontSize: 52, lineHeight: 1.22, color: KIT.ink, opacity: fld(0.1) }}>A chrome robot butler at home.</div>
        <div style={{ padding: "8px 34px 0" }}>
          <Field k="MADE" v="1940" on={fld(0.4)} />
          <Field k="BY" v="A CHEVROLET-SPONSORED FILM" on={fld(0.7)} />
        </div>
      </div>
      {stamped ? (
        <div style={{ position: "absolute", right: 20, bottom: -84, transform: `rotate(-10deg) scale(${slam})`, transformOrigin: "50% 50%", opacity: clamp01(st * 3),
          border: `9px solid ${KIT.orange}`, color: KIT.orange, fontFamily: JOSEFIN, fontWeight: 700, fontSize: 74, letterSpacing: "0.06em", padding: "14px 26px 4px", background: "rgba(233,222,198,0.88)", borderRadius: 10, whiteSpace: "nowrap" }}>JUST A DAYDREAM</div>
      ) : null}
    </div>
  );
};

// ---------------- the ending question ----------------
const Question: React.FC<{ t: number }> = ({ t }) => {
  const a = wordAt("L12", "roll-oh").s, k = easeOut((t - a) / 0.3);
  if (t < a) return null;
  const btn = (txt: string, col: string, d: number) => {
    const kk = easeOut((t - a - d) / 0.25);
    return <div style={{ fontFamily: JOSEFIN, fontWeight: 700, fontSize: 80, color: KIT.cream, background: col, border: `6px solid ${KIT.ink}`, padding: "18px 52px 8px", transform: `scale(${0.7 + 0.3 * kk})`, opacity: kk, boxShadow: "0 10px 0 rgba(16,20,24,0.45)" }}>{txt}</div>;
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", gap: 46, opacity: k }}>
      {btn("ROLL-OH", KIT.teal, 0)}{btn("ROOMBA", KIT.orange, wordAt("L12", "roomba").s - a)}
    </div>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const dipAt = BOUNDS[8], dip = f < dipAt ? clamp01((f - (dipAt - 7)) / 7) : clamp01(1 - (f - dipAt) / 9);
  return (
    <AbsoluteFill>
      {CHIPS.filter((c) => t >= c.a && t < c.b).map((c, i) => <Chip key={i} c={c} t={t} />)}
      <Panel t={t} f={f} />
      <PromiseCard t={t} f={f} />
      <Question t={t} />
      <Captions t={t} />
      {dip > 0 && <AbsoluteFill style={{ background: KIT.cream, opacity: dip }} />}
    </AbsoluteFill>
  );
};
