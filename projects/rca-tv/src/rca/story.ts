// RCA television (Yesterday's Tomorrow ystd-s005): shots, cameras and story clocks keyed to the VO (timing.json).
import TIMING from "./timing.json";

export const FPS = 30;
export const TOTAL: number = TIMING.total;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

type Line = { id: string; s: number; e: number; n: number };
type Word = { w: string; s: number; e: number; line: string };
export const LINES = TIMING.lines as Line[];
export const WORDS = TIMING.words as Word[];
export const lineAt = (id: string) => LINES.find((l) => l.id === id)!;
export const wordAt = (id: string, w: string, nth = 0) => {
  const k = w.toLowerCase();
  const xs = WORDS.filter((q) => q.line === id && q.w.toLowerCase().replace(/[^a-z0-9-]/g, "").startsWith(k));
  if (!xs[nth]) throw new Error(`word ${w} not in ${id}`);
  return xs[nth];
};
const F = (s: number) => Math.round(s * FPS);
const cutL = (id: string) => F(lineAt(id).s) - 2;

export const HOME_X = -40, LAB_X = 40, CITY_X = 120, TRACK_X = 200, STREET_X = -120;
export const ESB: V3 = [CITY_X, 0, 0];
export const HORIZON_R = 1500;
export type Light = "fair" | "home" | "lab" | "city" | "track" | "street";
export type PlaceId = Light;
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type ShotDef = { id: number; a: number; b: number; light: Light; place: PlaceId; name: string; cam: (f: number) => Cam; cInf: number; focus?: (f: number) => V3; sunAz?: number; sunEl?: number; grain?: number };

// ---------------- clocks ----------------
export const T_SIG = lineAt("L05").s + 0.2;                 // rings start leaving the mast
export const T_RACE = lineAt("L07").s - 0.6;                // horses enter the straight
export const T_12 = lineAt("L09").s + 0.3;                  // 12 windows light
export const T_83 = wordAt("L10", "eighty").s;               // ... to 83
export const T_STAMP = wordAt("L10", "eighty").s + 1.7;      // CAME TRUE, once the count reaches 83
/** radius of signal ring i at time t (expands from the mast, stops at the horizon) */
export const ringR = (t: number, i: number) => { const u = t - T_SIG - i * 0.7; return u <= 0 ? 0 : Math.min(HORIZON_R, 520 * u); };
/** how many of the 100 windows are lit (fractional = fading in) */
export const windowsLit = (t: number) => t < T_12 ? 0 : t < T_83 ? 12 * smooth((t - T_12) / 1.0) : 12 + 71 * smooth((t - T_83) / 1.6);
const T_MID7 = (lineAt("L07").s + lineAt("L07").e) / 2;
export const horseX = (t: number, k: number) => TRACK_X + 1.0 + 3.6 * (T_MID7 - t) + (k - 1) * 2.2; // cartoon gallop, crossing mid-frame mid-line

// ---------------- cameras ----------------
const C = (pos: V3, look: V3, fov = 40, roll = 0): Cam => ({ pos, look, fov, roll });
const H = HOME_X, Lx = LAB_X, Cx = CITY_X, Tx = TRACK_X, Sx = STREET_X;
const b = [0, cutL("L02"), cutL("L03"), cutL("L04"), cutL("L05"), cutL("L06"), cutL("L07"), cutL("L08"), cutL("L09"), cutL("L10"), cutL("L11"), TOTAL];
export const BOUNDS = b;
const k = (f: number, i: number) => clamp01((f - b[i]) / Math.max(1, b[i + 1] - b[i]));
export const SHOTS: ShotDef[] = [
  { id: 1, a: b[0], b: b[1], light: "fair", place: "fair", name: "1939: the World's Fair", cInf: 0,
    cam: (f) => C(lerp3([5, 1.7, 10], [4, 1.9, 8.5], glide(k(f, 0))), [2, 16, -90], 48) },
  { id: 2, a: b[1], b: b[2], light: "fair", place: "fair", name: "first shown to the public", cInf: 8, focus: () => [0, 1.6, 0.3],
    cam: (f) => C(lerp3([2.8, 2.7, 6.6], [2.3, 2.6, 5.8], glide(k(f, 1))), [0, 1.3, 0.2], 40) },
  { id: 3, a: b[2], b: b[3], light: "home", place: "home", name: "much like a radio, with a slanted mirror", cInf: 8, focus: () => [H + 1.6, 1.4, -1.6],
    cam: (f) => C(lerp3([H + 0.4, 1.55, 1.7], [H + 0.6, 1.55, 1.2], glide(k(f, 2))), [H + 1.35, 1.15, -1.5], 42) },
  { id: 4, a: b[3], b: b[4], light: "lab", place: "lab", name: "iconoscope and kinescope", cInf: 7, focus: () => [Lx, 1.4, -1.55],
    cam: (f) => C(lerp3([Lx, 1.65, 1.7], [Lx, 1.6, 1.3], glide(k(f, 3))), [Lx, 1.45, -1.55], 52) },
  { id: 5, a: b[4], b: b[5], light: "city", place: "city", name: "atop the Empire State Building", cInf: 0,
    cam: (f) => C(lerp3([Cx + 130, 350, 230], [Cx + 105, 365, 195], glide(k(f, 4))), [Cx, 395, 0], 40) },
  { id: 6, a: b[5], b: b[6], light: "city", place: "city", name: "the limit was the horizon", cInf: 0,
    cam: (f) => C(lerp3([Cx + 900, 1300, 1500], [Cx + 800, 1450, 1400], k(f, 5)), [Cx, 0, -100], 52) },
  { id: 7, a: b[6], b: b[7], light: "track", place: "track", name: "a horse race, camera atop the grandstand", cInf: 0,
    cam: (f) => C(lerp3([Tx + 2.0, 1.8, -16], [Tx + 1.5, 1.9, -15], k(f, 6)), [Tx + 0.5, 3.4, 8], 48) },
  { id: 8, a: b[7], b: b[8], light: "home", place: "home", name: "a new American industry", cInf: 6, focus: () => [H + 1.6, 1.6, -1.8],
    cam: (f) => C(lerp3([H + 0.9, 1.75, -0.2], [H + 1.05, 1.75, -0.55], glide(k(f, 7))), [H + 1.6, 1.5, -1.8], 38) },
  { id: 9, a: b[8], b: b[9], light: "street", place: "street", name: "1950: 12 percent", cInf: 0,
    cam: (f) => C(lerp3([Sx, 14, 36], [Sx, 14.5, 33], k(f, 8)), [Sx, 15.5, -8], 46) },
  { id: 10, a: b[9], b: b[10], light: "street", place: "street", name: "Jan 1958: 83 percent", cInf: 0,
    cam: (f) => C(lerp3([Sx, 14.5, 33], [Sx, 15, 30], k(f, 9)), [Sx, 15.5, -8], 46) },
  { id: 11, a: b[10], b: b[11], light: "home", place: "home", name: "CTA: would you have bought one?", cInf: 5, focus: () => [H - 0.5, 1.0, -1.8],
    cam: (f) => C(lerp3([H + 1.4, 1.6, 2.8], [H + 1.2, 1.55, 2.4], glide(k(f, 10))), [H - 0.6, 1.0, -1.6], 46) },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
