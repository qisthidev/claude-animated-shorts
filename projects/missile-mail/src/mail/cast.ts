// Missile Mail cast: original characters drawn with the template's Pen/body code (toon.ts) as lit cards.
//   THE POSTMASTER: stout, homburg, moustache, deep teal suit, orange tie, holds a cover up. A cartoon stand-in for
//   "the Postmaster General", not a likeness of any real person.
//   TWO SAILORS: white dixie cups, chambray shirts, navy dungarees.
//   THE 1936 POSTMASTER (Hewitt): brown wool coat, olive cap, rust scarf; drags two mail sacks across the ice.
// Effects are unlit cards: launch smoke, booster sparks, ice spray, slide puffs, footprints on the moon.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxPuff, fxSplash, fxContact, mul, INK, SKINS } from "../engine/toon";
import {
  FPS, V3, DECK, PARK_AT, PO_AT, T_FIRE, T_HATCH, T_CRASH, T_STAMP, T_DRAG, SHOTS, HATCH_AT, MOON_Z,
  dragPos, rocketPose, launchPose, cruisePos, arrivePos, clamp01, smooth, wordAt,
} from "./story";

export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type Stage = { places: Place[]; fx: FxPlace[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };

// ---------------- outfits ----------------
const POSTMASTER: Outfit = { jacket: "#2f4f57", pants: "#2a3f46", boots: "#2a1f1a", hat: "homburg", cap: "#33393e", tie: "#E0702F", moustache: "#5a4636", build: "stout", skin: SKINS[0] };
const SAILOR_A: Outfit = { jacket: "#86a9c6", pants: "#2b3a55", boots: INK, hat: "dixie", skin: SKINS[1], buttons: "#e9e4d6" };
const SAILOR_B: Outfit = { jacket: "#7d9fbd", pants: "#2b3a55", boots: INK, hat: "dixie", skin: SKINS[3], moustache: "#2a201a", buttons: "#e9e4d6" };
const PM1936: Outfit = { jacket: "#7a5a3c", pants: "#4a4038", boots: "#3a2a20", hat: "cap", cap: "#5d6b4a", scarf: "#c25a3a", skin: SKINS[2] };

// ---------------- helpers ----------------
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
/** canvas angle the sun comes FROM on an upright card facing the camera (45-degree steps) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = cam.sun.dot(cam.right) * (mirror ? -1 : 1), sy = -cam.sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
/** eyelid: blinks 0.6-2.4 s apart, 4-frame half/shut/shut/half, plus a blink across each expression swap */
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round(ts * FPS) + 2; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(18 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};
const tmp = new THREE.Vector3();
type Who = { i: number; o: Outfit; key: string; seed: number };
const WHO = {
  pm: { i: 1, o: POSTMASTER, key: "pm", seed: 3 },
  sa: { i: 2, o: SAILOR_A, key: "sa", seed: 5 },
  sb: { i: 3, o: SAILOR_B, key: "sb", seed: 6 },
  hw: { i: 4, o: PM1936, key: "hw", seed: 2 },
} satisfies Record<string, Who>;

const front = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts): Place => {
  const [w, h, k] = tier(cam.pos.distanceTo(tmp.set(x, y + 1.2, z)));
  const f2: FrontOpts = { mode: "stand", ...fo, light: light2D(cam, false), seed: who.seed };
  return { key: `F|${who.key}|${fkey(f2)}`, x, y, z, size: [w, h, k], draw: (p) => bodyFront(p, who.o, f2) };
};
const side = (cam: CamInfo, who: Who, x: number, y: number, z: number, so: SideOpts, mirror: boolean): Place => {
  const [w, h, k] = tier(cam.pos.distanceTo(tmp.set(x, y + 1.2, z)));
  const s2: SideOpts = { ...so, light: light2D(cam, mirror), seed: who.seed };
  return { key: `S|${who.key}|${fkey(s2)}`, x, y, z, mirror, size: [w, h, k], draw: (p) => bodySide(p, who.o, s2) };
};
/** multiply contact shadow under the feet */
const contact = (out: Stage, x: number, y: number, z: number, sc = 1) =>
  out.fx.push({ key: "blob|contact|#3a3a52", cw: 128, ch: 128, draw: (p) => fxContact(p, "#3a3a52"), x, y: y + 0.02, z, w: 0.62 * sc, h: 0.46 * sc, flat: true });

// ---------------- props drawn as cards ----------------
const SACK = "#cbb992";
/** a canvas mail sack in the 600 x 1000 design (bottom at 975), stencilled U.S. MAIL; `tilt` leans it (dragged) */
const sackDraw = (p: Pen, light: number, tilt: number) => {
  const g = p.g;
  g.save(); g.translate(300, 975); g.rotate(tilt); g.translate(-300, -975);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI * (i / 24); pts.push([300 - 175 * Math.cos(a), 975 - 40 * Math.sin(a)]); } // rounded bottom
  pts.push([455, 930], [430, 760], [372, 650], [330, 618], [270, 618], [228, 650], [170, 760], [145, 930]);
  pts.reverse();
  p.shadedFill(pts, SACK, mul(SACK, [0.72, 0.7, 0.78]), light, 180, 0.4);
  p.poly(pts, null, 9);
  p.poly([[262, 600], [338, 600], [346, 632], [254, 632]], "#8a6a46", 6); // tied neck
  p.poly([[285, 560], [315, 560], [320, 602], [280, 602]], SACK, 6);
  g.fillStyle = "#3b342c"; g.font = "700 64px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("U.S. MAIL", 300, 840, 250);
  g.restore();
};
const flame = (p: Pen, k: number) => { // booster flame / rocket exhaust on a 200 x 400 canvas, k = flicker 0..1
  p.poly([[100, 20], [160, 150 + 40 * k], [130, 360], [100, 390], [70, 360], [40, 150 + 40 * k]], "#ffb347", 6);
  p.poly([[100, 60], [134, 170], [118, 320], [100, 340], [82, 320], [66, 170]], "#fff1b8", 0);
};
const footprint = (p: Pen) => { p.ell(40, 64, 22, 40, "rgba(60,58,54,0.55)", 0); for (let i = 0; i < 4; i++) p.ell(40, 40 + i * 16, 18, 3, "rgba(30,30,30,0.35)", 0); };

// ---------------- staging per shot ----------------
const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = T(f), s = SHOTS[id - 1];
  const P = (pl: Place, sc = 1) => { out.places.push(pl); contact(out, pl.x, pl.y, pl.z, sc); };

  if (s.place === "sea" && id <= 4) {
    // two sailors on the after deck; in shot 4 sailor B stands at the hatch and shuts it
    const nearHatch = id === 4;
    const bx = nearHatch ? HATCH_AT[0] - 0.8 : -19.0, bz = nearHatch ? 1.25 : 1.2;
    const reach = nearHatch ? smooth((t - (T_HATCH - 0.55)) / 0.35) * (1 - smooth((t - (T_HATCH + 0.5)) / 0.4)) : 0;
    P(front(cam, WHO.sb, bx, DECK, bz, { expr: nearHatch ? "stern" : "neutral", blink: lidAt(t, 3), wave: reach > 0.01 ? -0.6 + 0.6 * reach : undefined, facing: 1 }));
    P(front(cam, WHO.sa, -12.6, DECK, 0.9, { expr: id === 2 ? "grin" : "smile_closed", blink: lidAt(t, 2), facing: 1 }));
  }
  if (id === 5) {
    const fired = t >= T_FIRE;
    P(front(cam, WHO.sa, -8.9, DECK, 1.05, { expr: fired ? "shock" : "nervous", blink: lidAt(t, 2, [T_FIRE]), facing: -1, tilt: fired ? -3 : 0 }));
    P(front(cam, WHO.sb, -10.8, DECK, -0.55, { expr: fired ? "shock" : "nervous", blink: lidAt(t, 3, [T_FIRE]), facing: -1, tilt: fired ? 2 : 0 }));
    if (fired) {
      // smoke left behind along the launch path + a deck cloud at the rail end
      for (let k = 1; k < 26; k++) {
        const age = k * 0.045, tau = t - age;
        if (tau < T_FIRE) break;
        const r = launchPose(tau), tail: V3 = [r.p[0] + 5.6, r.p[1] - 0.7, r.p[2]];
        const u = clamp01(age / 1.2), sz = 1.2 + 4.5 * u;
        out.fx.push({ key: `puff|${Math.min(9, Math.floor(u * 10))}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, Math.min(0.9, u)), x: tail[0], y: tail[1] + u * 0.8, z: tail[2] + (hh(k, 2) - 0.5) * 0.8, w: sz, h: sz, soft: true });
      }
      const g = clamp01((t - T_FIRE) / 1.4);
      for (let k = 0; k < 6; k++) {
        const sz = 2.5 + 5 * g + k * 0.6;
        out.fx.push({ key: `puff|${Math.min(9, Math.floor(g * 10))}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, Math.min(0.85, g)), x: -16 - k * 1.6, y: 3.2 + k * 0.4 + g * 1.5, z: (k % 2 ? 1 : -1) * (0.8 + g * 2), w: sz, h: sz, soft: true });
      }
      const r = launchPose(t), fk = Math.floor(t * 30) % 3;
      for (const zs of [-0.33, 0.33]) out.fx.push({ key: `flame|${fk}`, cw: 200, ch: 400, draw: (p) => flame(p, fk / 2), x: r.p[0] + 6.1, y: r.p[1] - 0.66, z: zs, w: 0.9, h: 1.8, rot: Math.PI / 2 + 0.14 });
    }
  }
  if (id === 6 || id === 7) {
    // a light exhaust trail behind the cruising missile
    for (let k = 1; k < 14; k++) {
      const age = k * 0.07, tau = t - age, p = id === 6 ? cruisePos(tau) : arrivePos(s.a / FPS, tau), u = age / 1.0;
      out.fx.push({ key: `puff|${Math.min(9, Math.floor(u * 10))}`, cw: 300, ch: 300, draw: (pp) => fxPuff(pp, Math.min(0.92, 0.3 + u)), x: p[0] + 5.4, y: p[1] - 0.1, z: p[2], w: 0.8 + 2.2 * u, h: 0.8 + 2.2 * u, soft: true });
    }
  }
  if (s.place === "base" && id >= 8) {
    const POST: V3 = [PARK_AT[0] + 3.6, 0, 3.2];
    const dusk = s.light === "dusk";
    const after = t >= T_STAMP;
    const pmExpr: Expr = !dusk ? "grin" : id === 9 ? "smile_closed" : after ? "nervous" : "smile";
    P(front(cam, WHO.pm, POST[0], 0.36, POST[2], { expr: pmExpr, prop: dusk ? null : "letter", blink: lidAt(t, 1, id === 11 ? [T_STAMP] : []), facing: dusk ? -1 : 1, headTilt: dusk && !after ? -6 : 0 }));
    if (!dusk) {
      P(front(cam, WHO.sa, POST[0] - 2.5, 0.36, POST[2] - 1.1, { expr: "smile", blink: lidAt(t, 2), facing: 1 }));
      P(front(cam, WHO.sb, POST[0] + 2.1, 0.36, POST[2] - 1.6, { expr: "smile_closed", blink: lidAt(t, 3), facing: -1 }));
    }
  }
  if (id === 10) {
    for (let i = 0; i < 26; i++) {
      const a = hh(i, 4) * Math.PI * 2, d = 2.6 + hh(i, 5) * 5;
      out.fx.push({ key: "foot", cw: 80, ch: 128, draw: footprint, x: Math.cos(a) * d, y: 0.02, z: MOON_Z + Math.sin(a) * d, w: 0.18, h: 0.3, flat: true, rot: a + Math.PI / 2 });
    }
  }
  if (s.place === "lake") {
    if (id === 12) P(front(cam, WHO.hw, PO_AT[0] + 7, PO_AT[1], PO_AT[2] + 5, { expr: "neutral", blink: lidAt(t, 4), facing: 1 }));
    if (id === 13 || id === 14) {
      for (let k = 0; k < 2; k++) {
        const r = rocketPose(k, t);
        if (!r.down) { const fk = Math.floor(t * 30 + k) % 3; out.fx.push({ key: `flame|${fk}`, cw: 200, ch: 400, draw: (p) => flame(p, fk / 2), x: r.p[0] + 1.35, y: r.p[1] + 0.05, z: r.p[2], w: 0.35, h: 0.75, rot: Math.PI / 2 + r.pitch }); }
        const tc = T_CRASH + k * 0.35, u = t - tc;
        if (u >= 0 && u < 0.9) out.fx.push({ key: `splash|${Math.floor(u / 0.9 * 12)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, Math.floor(u / 0.9 * 12) / 12), x: r.p[0] - 0.3, y: 0.53 + 1.0, z: r.p[2] + 0.25, w: 2.6, h: 2.6 });
        if (u > 0) for (let j = 1; j < 9; j++) { // puffs where it slid
          const tau = tc + j * 0.25; if (tau > t) break;
          const pp = rocketPose(k, tau).p, a2 = clamp01((t - tau) / 2.2);
          out.fx.push({ key: `puff|${Math.min(9, Math.floor(a2 * 10))}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, Math.min(0.92, 0.25 + a2)), x: pp[0] + 0.3, y: 0.75, z: pp[2], w: 1.0 + a2, h: 1.0 + a2, soft: true });
        }
      }
    }
    if (id === 15) {
      const p = dragPos(t), walk = t - T_DRAG, phase = ((walk * 0.9) % 1 + 1) % 1;
      out.places.push(side(cam, WHO.hw, p[0], p[1], p[2], { mode: "march", phase, stride: 0.55, expr: "pained", blink: lidAt(t, 4) }, true));
      contact(out, p[0], 0.53, p[2]);
      for (let k = 0; k < 2; k++) {
        const bx = p[0] + 1.0 + k * 0.75, bz = p[2] + (k ? 0.35 : -0.2), bob = 0.04 * Math.sin((walk * 0.9 + k * 0.3) * Math.PI * 2);
        const lt = light2D(cam, false), tilt = -0.32 + bob;
        out.places.push({ key: `sack|${k}|${q(tilt, 50)}|${lt}`, x: bx, y: 0.53, z: bz, scale: 0.85, size: tier(cam.pos.distanceTo(tmp.set(bx, 1, bz))), draw: (pp) => sackDraw(pp, lt, tilt) });
        contact(out, bx, 0.53, bz, 0.9);
      }
    }
    if (id === 16) {
      const p = dragPos(SHOTS[15].a / FPS), q2 = wordAt("L13", "trusted").s;
      const lt = light2D(cam, false);
      for (let k = 0; k < 2; k++) out.places.push({ key: `sack|s${k}|${lt}`, x: p[0] + (k ? 0.32 : -0.3), y: 0.53, z: p[2] - 0.18, scale: 0.8, size: tier(cam.pos.distanceTo(tmp.set(p[0], 1, p[2]))), draw: (pp) => sackDraw(pp, lt, k ? 0.12 : -0.1) });
      out.places.push(front(cam, WHO.hw, p[0], 0.53, p[2] + 0.12, { mode: "sit", expr: t < q2 ? "relief_open" : "smile_closed", blink: lidAt(t, 4, [q2]), facing: 0 }));
      contact(out, p[0], 0.53, p[2], 1.4);
    }
  }
  return out;
};
