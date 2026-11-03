// Missile Mail (Yesterday's Tomorrow ystd-s003): shot list, cameras, DOF and story clocks, all keyed to the VO.
// Every cut lands 2 frames before a VO line (or a named word) from timing.json (ElevenLabs alignment + retime.py).
// Places live far apart in one world: SEA (sub at the origin), AIR (the same sea, the missile cruising -x),
// BASE (Mayport, x ~ -3000), MOON (z ~ +8000), LAKE (1936, z ~ -8000).
import TIMING from "./timing.json";

export const FPS = 30;
export const TOTAL: number = TIMING.total;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeIn = (u: number) => clamp01(u) ** 2;
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------- VO clock ----------------
type Line = { id: string; s: number; e: number; n: number };
type Word = { w: string; s: number; e: number; line: string };
export const LINES = TIMING.lines as Line[];
export const WORDS = TIMING.words as Word[];
export const lineAt = (id: string) => LINES.find((l) => l.id === id)!;
/** first word of a line whose text starts with `w` (case-insensitive, punctuation ignored) */
export const wordAt = (id: string, w: string) => {
  const k = w.toLowerCase();
  const x = WORDS.find((q) => q.line === id && q.w.toLowerCase().replace(/[^a-z0-9-]/g, "").startsWith(k));
  if (!x) throw new Error(`word ${w} not in ${id}`);
  return x;
};
const F = (s: number) => Math.round(s * FPS);
const cutL = (id: string) => F(lineAt(id).s) - 2;
const cutW = (id: string, w: string, lead = 2) => F(wordAt(id, w).s) - lead;

// ---------------- places ----------------
export const BASE_X = -3000;           // Mayport naval air station (runway along x)
export const MOON_Z = 8000;
export const LAKE_Z = -8000;
export const DECK = 2.35;              // submarine deck height
export const RAIL0: V3 = [-15.5, 2.6, 0], RAIL1: V3 = [-25.5, 3.5, 0]; // launcher rail, rising aft (low, so a sailor reaches the hatch)
export const MISSILE_LEN = 10;
export const PARK_AT: V3 = [BASE_X - 58, 0, 0]; // where the missile rests on the Mayport runway
export const PO_AT: V3 = [-96, 0.5, LAKE_Z - 16]; // Hewitt post office on the west shore (toy distance)
export const LAKE_C: V3 = [0, 0, LAKE_Z - 6]; export const LAKE_R: [number, number] = [86, 58]; // ice ellipse

export type Light = "day" | "dusk" | "space" | "winter";
export type PlaceId = "sea" | "air" | "base" | "moon" | "lake";
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type ShotDef = {
  id: number; a: number; b: number; light: Light; place: PlaceId; name: string;
  cam: (f: number) => Cam; cInf: number; focus?: (f: number) => V3; sunAz?: number; sunEl?: number;
  fogFar?: number; grain?: number;
};

// story clocks (seconds on the final timeline)
export const T_FIRE = wordAt("L04", "fire").s;                 // booster ignition on the word "Fire."
export const T_HATCH = lineAt("L03").e - 0.9;                   // the sailor shuts the mail hatch
export const T_CRASH = wordAt("L12", "crash").s - 0.1;          // 1936 rockets hit the ice
export const T_STAMP = wordAt("L09", "differently").s + 0.05;   // MISSED stamp lands
export const T_REVEAL = wordAt("L01", "by").s - 0.05;            // hook: envelopes -> missile

// ---------------- the missile's flight ----------------
/** launch: slides up the rail, then climbs away aft (-x); position + pitch (radians, nose up) */
export const launchPose = (t: number): { p: V3; pitch: number } => {
  const u = t - T_FIRE;
  const dir: V3 = [RAIL1[0] - RAIL0[0], RAIL1[1] - RAIL0[1], 0];
  const L = Math.hypot(dir[0], dir[1]), d: V3 = [dir[0] / L, dir[1] / L, 0];
  const rest: V3 = [(RAIL0[0] + RAIL1[0]) / 2, (RAIL0[1] + RAIL1[1]) / 2 + 0.98, 0];
  const pitch0 = Math.atan2(dir[1], -dir[0]);
  if (u <= 0.12) return { p: rest, pitch: pitch0 };
  const s = 0.5 * 55 * (u - 0.12) ** 2;            // ~5.6 g along the rail and beyond
  const climb = Math.max(0, s - 6) * 0.18;           // after the rail the path bends a little upward
  return { p: [rest[0] + d[0] * s, rest[1] + d[1] * s + climb, 0], pitch: pitch0 + Math.min(0.12, Math.max(0, s - 6) * 0.004) };
};
/** cruise over the open sea toward Mayport (place AIR): steady -x at 60 m with a slow weave */
export const cruisePos = (t: number): V3 => [-260 - 95 * t, 60 + 1.5 * Math.sin(t * 0.9), 8 * Math.sin(t * 0.35)];
/** arrival over the beach at Mayport: comes in high from the sea (+x) and sinks toward the runway */
export const arrivePos = (t0: number, t: number): V3 => {
  const u = t - t0;
  return [BASE_X + 120 - 62 * u, Math.max(8, 30 - 7 * u), -4 + 0.6 * u];
};

// ---------------- 1936 rockets ----------------
export const ICE = 0.53;              // ice surface height
const ICE_Y = ICE + 0.3;              // rocket axis when it lies on the ice
/** two small mail rockets, low over the ice from +x to -x, crash at T_CRASH and slide to a stop */
export const rocketPose = (k: number, t: number): { p: V3; pitch: number; roll: number; down: boolean } => {
  const z = LAKE_Z - 8 + k * 5.5, lag = k * 0.35, tc = T_CRASH + lag;
  if (t < tc) {
    const u = t - tc;                                      // negative before impact
    const x = 6 + 30 * -u + k * 3, y = Math.max(ICE_Y, ICE_Y + 1.4 * (-u) ** 1.3 + 0.25 * Math.sin(t * 7 + k));
    return { p: [x, y, z], pitch: -0.12 - 0.25 * smooth(1 + u / 0.6), roll: 0.08 * Math.sin(t * 5 + k), down: false };
  }
  const u = t - tc, v0 = 26, dec = 9, ts = v0 / dec;      // slide: v0 m/s, decelerating to a stop
  const s = u < ts ? v0 * u - 0.5 * dec * u * u : v0 * ts / 2;
  return { p: [6 + k * 3 - s, ICE_Y, z + 0.5 * k * Math.min(u, ts)], pitch: -0.05, roll: 0.35 * (1 - Math.exp(-u * 3)) * (k ? -1 : 1), down: true };
};

// ---------------- the 1936 postmaster's walk ----------------
export const T_DRAG = wordAt("L12", "so").s - 0.15;
/** walking toward the post office, dragging the two bags (x decreasing) */
export const dragPos = (t: number): V3 => {
  const u = Math.max(0, t - T_DRAG);
  return [-22 - 1.05 * u, ICE, LAKE_Z - 6];
};

// ---------------- cameras ----------------
const C = (pos: V3, look: V3, fov = 40, roll = 0): Cam => ({ pos, look, fov, roll });
const between = (f: number, a: number, b: number) => clamp01((f - a) / Math.max(1, b - a));
/** shake: sign-alternating per frame, decaying in `n` frames (template camera grammar) */
export const shake = (f: number, f0: number, amp: number, n = 9): V3 => {
  const k = f - f0;
  if (k < 0 || k > n) return [0, 0, 0];
  const a = amp * (1 - k / n), s = k % 2 ? -1 : 1;
  return [a * s * 0.6, a * s, a * -s * 0.4];
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const RIDE = 0.98; // missile axis above the rail centre (boosters straddle the rail)
const MISSILE_MID: V3 = [(RAIL0[0] + RAIL1[0]) / 2, (RAIL0[1] + RAIL1[1]) / 2 + RIDE, 0];
export const PITCH0 = Math.atan2(RAIL1[1] - RAIL0[1], RAIL0[0] - RAIL1[0]);
export const HATCH_X = 2.25; // hatch centre along the missile (local x, ahead of the wing root)
export const HATCH_AT: V3 = [MISSILE_MID[0] - HATCH_X * Math.cos(PITCH0), MISSILE_MID[1] + HATCH_X * Math.sin(PITCH0), 0.6]; // +z flank (camera side)
const POST: V3 = [PARK_AT[0] + 3.6, 0, 3.2];   // the Postmaster's mark at Mayport

const b0 = 0;
const b1 = F(T_REVEAL) - 1;
const b2 = cutL("L02");
const b3 = cutL("L03");
const b4 = cutL("L04");
const b5 = cutL("L05");
const b6 = cutW("L05", "mayport", 10);
const b7 = cutL("L06");
const b8 = cutL("L07");
const b9 = cutL("L08");
const b10 = cutL("L09");
const b11 = cutL("L10");
const b12 = cutL("L11");
const b13 = cutL("L12");
const b14 = F(T_DRAG) - 4;
const b15 = cutL("L13");
const b16 = TOTAL;
export const BOUNDS = [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16];

const fireF = F(T_FIRE);
export const SHOTS: ShotDef[] = [
  { id: 1, a: b0, b: b1, light: "day", place: "sea", name: "hook: letters in the hatch", cInf: 16,
    cam: (f) => { const k = easeOut(between(f, b0, b1 + 6)); return C(lerp3([HATCH_AT[0] + 0.9, HATCH_AT[1] + 0.6, 3.3], [HATCH_AT[0] + 0.15, HATCH_AT[1] + 0.15, 1.6], k), [HATCH_AT[0] - 0.05, HATCH_AT[1] - 0.04, 0.45], 34, -0.06 * (1 - k)); } },
  { id: 2, a: b1, b: b2, light: "day", place: "sea", name: "reveal: it is a missile on a submarine", cInf: 6, focus: () => MISSILE_MID,
    cam: (f) => { const k = glide(between(f, b1, b1 + 46)); const c = lerp3([HATCH_AT[0] + 0.6, HATCH_AT[1] + 0.3, 2.6], [-6, 9.5, 21], k); return C(c, lerp3(HATCH_AT, [-14, 4.2, 0], k), lerp(34, 42, k)); } },
  { id: 3, a: b2, b: b3, light: "day", place: "sea", name: "aerial: USS Barbero off Florida", cInf: 0, fogFar: 1600,
    cam: (f) => { const k = between(f, b2, b3); return C([52 - 18 * k, 34 - 4 * k, 70 + 6 * k], [-6, 1.5, -6], 38); } },
  { id: 4, a: b3, b: b4, light: "day", place: "sea", name: "inside: 3,000 letters; sailor shuts the hatch", cInf: 12, focus: () => HATCH_AT,
    cam: (f) => { const k = glide(between(f, b3, b4)); return C(lerp3([HATCH_AT[0] - 0.3, 3.8, 6.2], [HATCH_AT[0] - 0.35, 3.75, 5.5], k), [HATCH_AT[0] - 0.45, 3.62, 0.4], 36); } },
  { id: 5, a: b4, b: b5, light: "day", place: "sea", name: "Fire.", cInf: 0,
    cam: (f) => { const k = between(f, b4, b5); return C(add([-5.5 + 0.8 * k, 4.0, 5.2], shake(f, fireF, 0.09, 12)), [-21 - 8 * easeIn(k), 4.6 + 3 * easeIn(k), 0], 46); } },
  { id: 6, a: b5, b: b6, light: "day", place: "air", name: "chase over the sea", cInf: 0, sunAz: 120, sunEl: 40,
    cam: (f) => { const t = f / FPS, m = cruisePos(t), k = between(f, b5, b6); return C([m[0] + 15 - 4 * k, m[1] + 3.5 + 1.5 * k, m[2] + 10 - 2 * k], [m[0] - 5, m[1] - 3.2, m[2]], 40, 0.03 * Math.sin(t)); } },
  { id: 7, a: b6, b: b7, light: "day", place: "base", name: "arrival over Mayport", cInf: 0, fogFar: 900, sunAz: 150, sunEl: 35,
    cam: (f) => { const t = f / FPS, m = arrivePos(b6 / FPS, t); const k = between(f, b6, b7); return C([BASE_X - 62, 2.0, 26], lerp3([m[0], m[1] - 1, m[2]], [m[0] - 3, m[1] - 2, m[2]], k), 42); } },
  { id: 8, a: b7, b: b8, light: "day", place: "base", name: "the Postmaster General at Mayport", cInf: 10, focus: () => [POST[0], 1.55, POST[2]],
    cam: (f) => { const k = glide(between(f, b7, b8 + 30)); return C(lerp3([POST[0] + 5.2, 1.3, POST[2] + 8.6], [POST[0] + 3.6, 1.25, POST[2] + 6.6], k), [POST[0] - 1.2, 1.0, POST[2] - 1.6], 38); } },
  { id: 9, a: b8, b: b9, light: "dusk", place: "base", name: "promise: he looks up at the moon", cInf: 9, focus: () => [POST[0], 1.75, POST[2]], sunAz: 160, sunEl: 6,
    cam: (f) => { const k = glide(between(f, b8, b9)); return C(lerp3([POST[0] + 1.5, 0.85, POST[2] + 4.3], [POST[0] + 1.25, 0.8, POST[2] + 3.7], k), [POST[0] - 0.6, 3.6, POST[2] - 2.8], 42); } },
  { id: 10, a: b9, b: b10, light: "space", place: "moon", name: "1969: the moon", cInf: 0, sunAz: 80, sunEl: 12, fogFar: 40000,
    cam: (f) => { const k = glide(between(f, b9, b10)); return C(lerp3([10.5, 1.5, MOON_Z + 13], [9, 1.6, MOON_Z + 11.5], k), [0, 2.4, MOON_Z - 1], 38); } },
  { id: 11, a: b10, b: b11, light: "dusk", place: "base", name: "verdict: MISSED", cInf: 9, focus: () => [POST[0], 1.75, POST[2]], sunAz: 160, sunEl: 6,
    cam: (f) => { const k = glide(between(f, b10, b11)); return C(lerp3([POST[0] + 1.2, 0.8, POST[2] + 3.6], [POST[0] + 1.05, 0.78, POST[2] + 3.2], k), [POST[0] - 0.6, 3.6, POST[2] - 2.8], 42); } },
  { id: 12, a: b11, b: b12, light: "winter", place: "lake", name: "1936: the frozen lake", cInf: 0, grain: 0.035, sunAz: 130, sunEl: 34, fogFar: 700,
    cam: (f) => { const k = between(f, b11, b12); return C([-52 - 5 * k, 5 - 0.8 * k, LAKE_Z + 24], [-96, 2.4, LAKE_Z - 16], 40); } },
  { id: 13, a: b12, b: b13, light: "winter", place: "lake", name: "two rockets across the lake", cInf: 0, grain: 0.035, sunAz: 110, sunEl: 34,
    cam: (f) => { const t = f / FPS, r = rocketPose(0, t).p; return C([r[0] + 5, 1.8, LAKE_Z + 8], [r[0] + 0.3, Math.max(1.2, r[1] - 0.3), LAKE_Z - 6], 40); } },
  { id: 14, a: b13, b: b14, light: "winter", place: "lake", name: "crash-landed short, slid along the ice", cInf: 0, grain: 0.035, sunAz: 110, sunEl: 34,
    cam: (f) => { const t = f / FPS, r = rocketPose(0, Math.min(t, T_CRASH + 1.6)).p; return C(add([r[0] + 2.2, 1.1, LAKE_Z + 5], shake(f, F(T_CRASH), 0.06, 10)), [r[0] + 0.1, 0.8, LAKE_Z - 6], 40); } },
  { id: 15, a: b14, b: b15, light: "winter", place: "lake", name: "the postmaster drags the mailbags", cInf: 8, grain: 0.035, sunAz: 120, sunEl: 34,
    focus: (f) => { const p = dragPos(f / FPS); return [p[0], 1.2, p[2]]; },
    cam: (f) => { const p = dragPos(f / FPS), k = between(f, b14, b15); return C([p[0] + 1.1 - 0.3 * k, 1.2, p[2] + 7.5], [p[0] + 0.75, 1.15, p[2] - 0.5], 40); } },
  { id: 16, a: b15, b: b16, light: "winter", place: "lake", name: "CTA: would you trust a missile?", cInf: 10, grain: 0.035, sunAz: 120, sunEl: 34,
    focus: () => { const p = dragPos(b15 / FPS); return [p[0], 0.9, p[2]]; },
    cam: (f) => { const p = dragPos(b15 / FPS), k = glide(between(f, b15, b16)); return C(lerp3([p[0] + 0.4, 1.3, p[2] + 6.0], [p[0] + 0.3, 1.28, p[2] + 5.2], k), [p[0], 1.3, p[2]], 38); } },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const FLASH_AT = fireF + 1;     // white flash on the booster ignition
export const camAt = (id: number, f: number) => SHOTS[id - 1].cam(f);
