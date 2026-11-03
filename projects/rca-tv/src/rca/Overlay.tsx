// 2D layer over the 3D picture, in the Yesterday's Tomorrow kit (tools/gfx.py): Josefin Sans titles, Libre Caslon
// italic for quotes, IBM Plex Mono chips; ink #101418, cream #F1E8D6, paper #E9DEC6, teal #2A8C82, orange #E0702F.
// Word-synced captions (cream, black border, current word orange), fact chips with their source, the channel's
// promise card with the MISSED verdict stamp, the 1936 paper dip, and the yes/no question at the end.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { KIT } from "./look";
import { FPS, WORDS, SHOTS, lineAt, wordAt, T_12, T_83, T_STAMP, windowsLit, clamp01, easeOut } from "./story";

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
  { a: lineAt("L01").s + 0.4, b: SHOTS[0].b / FPS, text: "CA. 1939 · AN RCA FILM", src: "Source: \"An RCA Presentation: Television\", Prelinger Archives" },
  { a: lineAt("L05").s + 0.1, b: SHOTS[4].b / FPS, text: "EMPIRE STATE BUILDING", src: "Source: the RCA film" },
  { a: lineAt("L06").s + 0.3, b: SHOTS[5].b / FPS, text: "LIMIT: THE HORIZON", src: "Source: the RCA film" },
  { a: lineAt("L07").s + 0.2, b: SHOTS[6].b / FPS, text: "CAMERA ATOP THE GRANDSTAND", src: "Source: the RCA film" },
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

// ---------------- tube labels (lab shot) ----------------
const TubeLabels: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const s4 = SHOTS[3];
  if (f < s4.a || f >= s4.b) return null;
  const a1 = wordAt("L04", "iconoscope").s, a2 = wordAt("L04", "kinescope").s;
  const lab = (txt: string, sub: string, a: number, left: boolean) => {
    const k = easeOut((t - a) / 0.3);
    return <div style={{ position: "absolute", top: 760, [left ? "left" : "right"]: 70, opacity: k, transform: `translateY(${(1 - k) * 20}px)` } as React.CSSProperties}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: KIT.ink, background: KIT.cream, padding: "10px 18px 8px", borderLeft: `10px solid ${left ? KIT.teal : KIT.orange}` }}>{txt}</div>
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: KIT.cream, background: "rgba(16,20,24,0.6)", padding: "4px 10px", marginTop: 8, display: "inline-block" }}>{sub}</div></div>;
  };
  return <>{t >= a1 - 0.05 && lab("ICONOSCOPE", "the camera tube", a1, true)}{t >= a2 - 0.05 && lab("KINESCOPE", "the picture tube", a2, false)}</>;
};

// ---------------- the 100-window counter (street shots) ----------------
const Counter: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const s9 = SHOTS[8], s10 = SHOTS[9];
  if (f < s9.a || f >= s10.b) return null;
  const n = Math.round(windowsLit(t)), late = t >= T_83 - 0.05;
  const k = easeOut((t - T_12 + 0.2) / 0.3);
  const st = (t - T_STAMP) / 0.16, stamped = t >= T_STAMP, slam = stamped ? Math.max(1, 2.1 - 1.1 * easeOut(st)) : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, letterSpacing: "0.08em", color: KIT.ink, background: KIT.cream, padding: "10px 22px 8px", borderLeft: `10px solid ${KIT.teal}` }}>{late ? "JANUARY 1958" : "1950 CENSUS"}</div>
      <div style={{ fontFamily: JOSEFIN, fontWeight: 700, fontSize: 210, lineHeight: 1, color: KIT.cream, WebkitTextStroke: "16px #000", paintOrder: "stroke fill", marginTop: 18 }}>{n}%</div>
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 30, color: KIT.cream, background: "rgba(16,20,24,0.6)", padding: "6px 12px", marginTop: 6 }}>of U.S. homes with a TV</div>
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 22, color: KIT.cream, background: "rgba(16,20,24,0.55)", padding: "4px 10px", marginTop: 10 }}>Source: Broadcasting, 14 Apr 1958 (Census Bureau data; ARF estimates)</div>
      {stamped ? <div style={{ marginTop: 26, transform: `rotate(-8deg) scale(${slam})`, opacity: clamp01(st * 3), border: `9px solid ${KIT.orange}`, color: KIT.orange, fontFamily: JOSEFIN, fontWeight: 700, fontSize: 84, letterSpacing: "0.08em", padding: "14px 30px 4px", background: "rgba(233,222,198,0.9)", borderRadius: 10 }}>CAME TRUE</div> : null}
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
  const s8 = SHOTS[7];
  if (f < s8.a || f >= s8.b) return null;
  const t0 = s8.a / FPS, enter = easeOut((t - t0) / 0.35), fld = (d: number) => easeOut((t - t0 - d) / 0.3), out = clamp01((s8.b / FPS - t) / 0.2);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 300, opacity: Math.min(enter, out), transform: `translateY(${(1 - enter) * 60}px) rotate(-1.5deg)` }}>
      <div style={{ background: KIT.paper, border: `5px solid ${KIT.ink}`, boxShadow: "0 18px 0 rgba(16,20,24,0.45)", padding: "0 0 26px" }}>
        <div style={{ background: KIT.teal, color: KIT.cream, fontFamily: JOSEFIN, fontWeight: 700, fontSize: 44, letterSpacing: "0.22em", padding: "18px 34px 12px" }}>THE PROMISE</div>
        <div style={{ padding: "20px 34px 6px", fontFamily: CASLON, fontStyle: "italic", fontSize: 56, lineHeight: 1.22, color: KIT.ink, opacity: fld(0.1) }}>A new American industry.</div>
        <div style={{ padding: "8px 34px 0" }}>
          <Field k="MADE" v="CA. 1939" on={fld(0.4)} />
          <Field k="BY" v="RCA" on={fld(0.7)} />
        </div>
      </div>
    </div>
  );
};

// ---------------- the ending question ----------------
const Question: React.FC<{ t: number }> = ({ t }) => {
  const a = wordAt("L11", "would").s, k = easeOut((t - a) / 0.3);
  if (t < a) return null;
  const btn = (txt: string, col: string, d: number) => {
    const kk = easeOut((t - a - d) / 0.25);
    return <div style={{ fontFamily: JOSEFIN, fontWeight: 700, fontSize: 80, color: KIT.cream, background: col, border: `6px solid ${KIT.ink}`, padding: "18px 52px 8px", transform: `scale(${0.7 + 0.3 * kk})`, opacity: kk, boxShadow: "0 10px 0 rgba(16,20,24,0.45)" }}>{txt}</div>;
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", gap: 46, opacity: k }}>
      {btn("YES", KIT.teal, wordAt("L11", "yes").s - a)}{btn("NO", KIT.orange, wordAt("L11", "no").s - a)}
    </div>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const dip = 0;
  return (
    <AbsoluteFill>
      {CHIPS.filter((c) => t >= c.a && t < c.b).map((c, i) => <Chip key={i} c={c} t={t} />)}
      <TubeLabels t={t} f={f} />
      <Counter t={t} f={f} />
      <PromiseCard t={t} f={f} />
      <Question t={t} />
      <Captions t={t} />
      {dip > 0 && <AbsoluteFill style={{ background: KIT.cream, opacity: dip }} />}
    </AbsoluteFill>
  );
};
