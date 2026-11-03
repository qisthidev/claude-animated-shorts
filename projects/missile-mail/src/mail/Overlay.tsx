// 2D layer over the 3D picture, in the Yesterday's Tomorrow kit (tools/gfx.py): Josefin Sans titles, Libre Caslon
// italic for quotes, IBM Plex Mono chips; ink #101418, cream #F1E8D6, paper #E9DEC6, teal #2A8C82, orange #E0702F.
// Word-synced captions (cream, black border, current word orange), fact chips with their source, the channel's
// promise card with the MISSED verdict stamp, the 1936 paper dip, and the yes/no question at the end.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { KIT } from "./look";
import { FPS, WORDS, SHOTS, BOUNDS, lineAt, wordAt, T_STAMP, FLASH_AT, clamp01, easeOut } from "./story";

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
  { a: lineAt("L02").s + 0.25, b: lineAt("L02").e + 0.3, text: "JUNE 8, 1959 · USS BARBERO", src: "Source: USPS Historian, \"Missile Mail\" (2008)" },
  { a: wordAt("L03", "three").s, b: SHOTS[3].b / FPS, text: "3,000 LETTERS", src: "Source: USPS Historian (2008)" },
  { a: wordAt("L05", "more").s, b: BOUNDS[6] / FPS, text: "100+ MILES · ABOUT 22 MIN", src: "Source: USPS Historian (2008)" },
  { a: BOUNDS[6] / FPS + 0.05, b: lineAt("L05").e + 0.4, text: "MAYPORT, FLA.", src: "Naval Auxiliary Air Station" },
  { a: lineAt("L08").s + 0.1, b: BOUNDS[10] / FPS, text: "JULY 20, 1969", src: "Source: NASA, Apollo 11" },
  { a: lineAt("L10").s + 0.6, b: BOUNDS[12] / FPS, text: "FEB 23, 1936 · GREENWOOD LAKE, N.Y. → HEWITT, N.J.", src: "Source: USPS Historian (2008)" },
  { a: lineAt("L11").s + 0.1, b: BOUNDS[13] / FPS, text: "ABOUT 2,000 FT ACROSS THE ICE" },
];
const Chip: React.FC<{ c: ChipDef; t: number }> = ({ c, t }) => {
  const k = easeOut((t - c.a) / 0.25), out = clamp01((c.b - t) / 0.15);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 250, display: "flex", flexDirection: "column", alignItems: "flex-start", opacity: Math.min(k, out), transform: `translateY(${(1 - k) * -16}px)` }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, letterSpacing: "0.06em", color: KIT.ink, background: KIT.cream, padding: "12px 20px 10px", borderLeft: `10px solid ${KIT.teal}`, boxShadow: "0 6px 0 rgba(16,20,24,0.35)", maxWidth: 900 }}>{c.text}</div>
      {c.src ? <div style={{ marginTop: 12, fontFamily: MONO, fontWeight: 500, fontSize: 24, color: KIT.cream, background: "rgba(16,20,24,0.55)", padding: "4px 10px" }}>{c.src}</div> : null}
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
  const s9 = SHOTS[8], s11 = SHOTS[10];
  const on9 = f >= s9.a && f < s9.b, on11 = f >= s11.a && f < s11.b;
  if (!on9 && !on11) return null;
  const t0 = s9.a / FPS, enter = on11 ? 1 : easeOut((t - t0) / 0.4);
  const fld = (d: number) => (on11 ? 1 : easeOut((t - t0 - d) / 0.3));
  const st = (t - T_STAMP) / 0.16, stamped = t >= T_STAMP;
  const slam = stamped ? Math.max(1, 2.1 - 1.1 * easeOut(st)) : 0;
  const jolt = stamped && t - T_STAMP < 0.2 ? Math.sin((t - T_STAMP) * 90) * 6 * (1 - (t - T_STAMP) / 0.2) : 0;
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 300, opacity: enter, transform: `translateY(${(1 - enter) * 60 + jolt}px) rotate(-1.5deg)` }}>
      <div style={{ background: KIT.paper, border: `5px solid ${KIT.ink}`, boxShadow: "0 18px 0 rgba(16,20,24,0.45)", padding: "0 0 26px" }}>
        <div style={{ background: KIT.teal, color: KIT.cream, fontFamily: JOSEFIN, fontWeight: 700, fontSize: 44, letterSpacing: "0.22em", padding: "18px 34px 12px" }}>THE PROMISE</div>
        <div style={{ padding: "20px 34px 6px", fontFamily: CASLON, fontStyle: "italic", fontSize: 50, lineHeight: 1.22, color: KIT.ink, opacity: fld(0.15) }}>
          Mail by guided missile, within hours, across oceans.
        </div>
        <div style={{ padding: "8px 34px 0" }}>
          <Field k="MADE" v="1959" on={fld(0.6)} />
          <Field k="BY" v="THE POSTMASTER GENERAL" on={fld(0.9)} />
          <Field k="DUE" v="BEFORE MAN REACHES THE MOON" on={fld(1.2)} />
        </div>
      </div>
      {stamped ? (
        <div style={{ position: "absolute", right: 40, bottom: -70, transform: `rotate(-12deg) scale(${slam})`, transformOrigin: "50% 50%", opacity: clamp01(st * 3),
          border: `9px solid ${KIT.orange}`, color: KIT.orange, fontFamily: JOSEFIN, fontWeight: 700, fontSize: 104, letterSpacing: "0.1em", padding: "14px 30px 4px", background: "rgba(233,222,198,0.85)", borderRadius: 10 }}>MISSED</div>
      ) : null}
    </div>
  );
};

// ---------------- the ending question ----------------
const Question: React.FC<{ t: number }> = ({ t }) => {
  const a = wordAt("L13", "missile").s, k = easeOut((t - a) / 0.3);
  if (t < a) return null;
  const btn = (txt: string, col: string, d: number) => {
    const kk = easeOut((t - a - d) / 0.25);
    return <div style={{ fontFamily: JOSEFIN, fontWeight: 700, fontSize: 92, color: KIT.cream, background: col, border: `6px solid ${KIT.ink}`, padding: "18px 52px 8px", transform: `scale(${0.7 + 0.3 * kk})`, opacity: kk, boxShadow: "0 10px 0 rgba(16,20,24,0.45)" }}>{txt}</div>;
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center", gap: 70, opacity: k }}>
      {btn("YES", KIT.teal, 0)}{btn("NO", KIT.orange, 0.12)}
    </div>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [0.9, 0.65, 0.35, 0.12][f - FLASH_AT] : 0;
  const dipAt = BOUNDS[11], dip = f < dipAt ? clamp01((f - (dipAt - 7)) / 7) : clamp01(1 - (f - dipAt) / 9);
  return (
    <AbsoluteFill>
      {CHIPS.filter((c) => t >= c.a && t < c.b).map((c, i) => <Chip key={i} c={c} t={t} />)}
      <PromiseCard t={t} f={f} />
      <Question t={t} />
      <Captions t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff8ec", opacity: flash }} />}
      {dip > 0 && <AbsoluteFill style={{ background: KIT.cream, opacity: dip }} />}
    </AbsoluteFill>
  );
};
