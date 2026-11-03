// Robot Butler (Yesterday's Tomorrow ystd-s004): shots, cameras and story clocks keyed to the VO (timing.json).
// Places: HOME40 at the origin (room x -4..4, z -3..3.2, open toward +z), OFFICE at x = +40, DRIVE at x = +80,
// HOME02 at x = -40 (same room shell, 2002 dressing).
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
const cutW = (id: string, w: string, lead = 2, nth = 0) => F(wordAt(id, w, nth).s) - lead;

export const OFFICE_X = 40, DRIVE_X = 80, HOME02_X = -40;
export type Light = "home40" | "office" | "drive" | "home02";
export type PlaceId = "home40" | "office" | "drive" | "home02";
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type ShotDef = { id: number; a: number; b: number; light: Light; place: PlaceId; name: string; cam: (f: number) => Cam; cInf: number; focus?: (f: number) => V3; sunAz?: number; sunEl?: number; grain?: number };

// ---------------- clocks ----------------
export const T_CMD = { door: wordAt("L03", "answer").s, dishes: wordAt("L03", "wash").s, dinner: wordAt("L03", "get").s, bed: wordAt("L03", "make").s };
export const T_SCRAM = wordAt("L04", "scram").s;
export const T_DAYDREAM = wordAt("L05", "daydream").s;
export const T_PLUG = wordAt("L07", "pulls").s + 0.15;
export const T_LIGHTS = wordAt("L07", "turns").s;
export const T_HOOD = lineAt("L08").s + 0.1;
export const T_PRICE = wordAt("L11", "suggested").s;

// ---------------- the butler ----------------
const ROBOT_SPOT: V3 = [-1.0, 0, -1.25];
const between = (t: number, a: number, b: number) => clamp01((t - a) / Math.max(1e-3, b - a));
export type RobotPose = { visible: boolean; p: V3; yaw: number; head: number; armL: number; armR: number; tray: boolean; glow: number; ghost: number; scale: number };
export const robotPose = (id: number, t: number): RobotPose => {
  const base: RobotPose = { visible: false, p: ROBOT_SPOT, yaw: 0.35, head: 0, armL: 0, armR: 0, tray: false, glow: 1, ghost: 1, scale: 1 };
  const s = SHOTS[id - 1];
  if (id === 1) { // rolls in from the door with a tray
    const k = glide(between(t, s.a / FPS + 0.2, s.b / FPS - 0.4));
    return { ...base, visible: true, p: lerp3([-3.3, 0, -0.5], ROBOT_SPOT, k), yaw: lerp(1.45, 0.35, smooth(k * 1.4 - 0.3)), tray: true, armL: -1.25, armR: -1.25, head: 0.25 * Math.sin(t * 2) };
  }
  if (id === 2) return { ...base, visible: true, tray: true, armL: -1.25, armR: -1.25, yaw: 0.35 - 0.3 * glide(between(t, s.a / FPS, s.a / FPS + 0.8)), head: -0.25 * glide(between(t, s.a / FPS + 0.3, s.a / FPS + 1.0)) };
  if (id === 3) {
    let head = 0, armL = 0, armR = 0, p = ROBOT_SPOT, yaw = 0.2;
    if (t >= T_CMD.door) head = 0.9;                                  // looks at the door
    if (t >= T_CMD.dishes) { head = 0; armL = armR = -1.1 - 0.35 * Math.sin((t - T_CMD.dishes) * 14); }
    if (t >= T_CMD.dinner) { armL = armR = -1.6; }
    if (t >= T_CMD.bed) { armL = -0.2; armR = -2.6; }
    if (t >= T_SCRAM) { const u = t - T_SCRAM; yaw = 0.2 + 9 * smooth(u / 0.5); p = lerp3(ROBOT_SPOT, [4.5, 0, -0.6], easeOut((u - 0.35) / 0.6)); armL = armR = -2.9; }
    return { ...base, visible: true, p, yaw, head, armL, armR, tray: t < T_CMD.dishes };
  }
  if (id === 4) { // centre stage, then poof on "daydream"
    const u = t - T_DAYDREAM;
    return { ...base, visible: u < 0.35, p: [-0.4, 0, -0.9], yaw: 0.15, armL: -0.4, armR: -0.4, scale: u < 0 ? 1 : 1 + 0.25 * smooth(u / 0.3), ghost: u < 0 ? 1 : 1 - smooth(u / 0.3) };
  }
  if (id === 13) { // the daydream comes back as a ghost next to the disc
    const k = smooth(between(t, s.a / FPS, s.a / FPS + 0.6));
    return { ...base, visible: true, p: [HOME02_X - 0.75, 0, 0.45], yaw: 0.3, armL: -0.6, armR: -2.2 + 0.4 * Math.sin(t * 4), ghost: 0.1 + 0.3 * k, glow: 0.8 };
  }
  return base;
};

// ---------------- the disc vacuum (press release: spiral first, then along the walls) ----------------
export const vacPose = (id: number, t: number): { visible: boolean; p: V3; yaw: number } => {
  const s = SHOTS[id - 1], u = t - s.a / FPS;
  if (id === 9 || id === 10) { // spiral outward on the rug (press release: it starts in a spiral)
    const th = 1.6 * (u + (id === 10 ? 3.2 : 0)), r = 0.06 + 0.02 * th;
    return { visible: true, p: [HOME02_X + 0.2 + r * Math.cos(th), 0, 0.3 + r * Math.sin(th)], yaw: -th - Math.PI / 2 };
  }
  if (id === 11) return { visible: true, p: [HOME02_X + 0.6 - 0.4 * u, 0, 0.6], yaw: Math.PI };
  if (id === 12) return { visible: true, p: [HOME02_X + 0.35, 0, -0.55], yaw: -0.4 + 0.6 * Math.sin(u * 1.5) };
  if (id === 13) return { visible: true, p: [HOME02_X + 0.15, 0, 0.75], yaw: -0.4 };
  return { visible: false, p: [0, -50, 0], yaw: 0 };
};
export const kettleUnplug = (t: number) => easeOut(between(t, T_PLUG, T_PLUG + 0.35));
export const lightsOn = (t: number) => clamp01((t - T_LIGHTS) / 0.9);
export const hoodOpen = (t: number) => glide(between(t, T_HOOD, T_HOOD + 0.7));

// ---------------- cameras ----------------
const C = (pos: V3, look: V3, fov = 40, roll = 0): Cam => ({ pos, look, fov, roll });
const X2 = HOME02_X, XO = OFFICE_X, XD = DRIVE_X;
const b = [0, cutL("L02"), cutL("L03"), cutL("L05"), cutL("L06"), cutW("L07", "a"), cutW("L07", "an"), cutL("L08"), cutL("L09"), cutL("L10"), cutL("L11"), cutW("L11", "suggested"), cutL("L12"), TOTAL];
export const BOUNDS = b;
const k = (f: number, i: number) => clamp01((f - b[i]) / Math.max(1, b[i + 1] - b[i]));
export const SHOTS: ShotDef[] = [
  { id: 1, a: b[0], b: b[1], light: "home40", place: "home40", name: "1940: the butler rolls in", cInf: 6, focus: (f) => { const r = robotPose(1, f / FPS).p; return [r[0], 1.3, r[2]]; },
    cam: (f) => C(lerp3([1.7, 1.5, 3.0], [1.25, 1.45, 2.55], glide(k(f, 0))), [-1.6, 0.95, -1.4], 44) },
  { id: 2, a: b[1], b: b[2], light: "home40", place: "home40", name: "Roll-Oh, the chromium-plated butler", cInf: 10, focus: () => [-1.0, 1.5, -1.25],
    cam: (f) => C(lerp3([-0.45, 1.5, 0.55], [-0.62, 1.52, 0.15], glide(k(f, 1))), [-1.0, 1.42, -1.25], 36) },
  { id: 3, a: b[2], b: b[3], light: "home40", place: "home40", name: "the panel: Answer Door ... Scram!", cInf: 7, focus: () => [0.1, 1.3, -1.9],
    cam: (f) => C(lerp3([1.2, 1.3, 2.1], [1.05, 1.3, 1.8], glide(k(f, 2))), [-0.3, 1.5, -1.7], 44) },
  { id: 4, a: b[3], b: b[4], light: "home40", place: "home40", name: "just a daydream", cInf: 0,
    cam: (f) => C(lerp3([2.7, 1.8, 3.0], [2.4, 1.7, 2.7], k(f, 3)), [-0.8, 1.0, -1.2], 46) },
  { id: 5, a: b[4], b: b[5], light: "home40", place: "home40", name: "little brothers and sisters", cInf: 0,
    cam: (f) => C(lerp3([0.2, 1.55, 2.9], [0.5, 1.5, 2.6], k(f, 4)), [0.6, 1.15, -1.8], 52) },
  { id: 6, a: b[5], b: b[6], light: "home40", place: "home40", name: "the kettle pulls its own plug", cInf: 9, focus: () => [3.3, 1.05, -2.7],
    cam: (f) => C(lerp3([2.55, 1.38, -1.15], [2.65, 1.33, -1.4], glide(k(f, 5))), [3.3, 1.02, -2.7], 38) },
  { id: 7, a: b[6], b: b[7], light: "office", place: "office", name: "the electric eye turns on the lights", cInf: 0,
    cam: (f) => C(lerp3([XO - 0.5, 1.3, 2.5], [XO - 0.3, 1.32, 2.2], k(f, 6)), [XO + 1.7, 2.0, -1.4], 54) },
  { id: 8, a: b[7], b: b[8], light: "drive", place: "drive", name: "a motor car simply full of robots", cInf: 5, focus: () => [XD + 1.1, 1.2, 0],
    cam: (f) => C(lerp3([XD + 5.8, 2.7, 5.2], [XD + 5.1, 2.55, 4.5], glide(k(f, 7))), [XD + 0.5, 1.05, 0], 40) },
  { id: 9, a: b[8], b: b[9], light: "home02", place: "home02", name: "62 years later", cInf: 0,
    cam: (f) => C(lerp3([X2 + 1.8, 1.65, 3.0], [X2 + 1.4, 1.55, 2.7], k(f, 8)), [X2 - 1.0, 0.75, -1.1], 46) },
  { id: 10, a: b[9], b: b[10], light: "home02", place: "home02", name: "Sept 18, 2002: the disc", cInf: 10, focus: () => [X2 + 0.2, 0.06, 0.3],
    cam: (f) => C(lerp3([X2 + 0.95, 1.25, 2.7], [X2 + 0.85, 1.15, 2.4], glide(k(f, 9))), [X2 + 0.2, 0.05, 0.3], 40) },
  { id: 11, a: b[10], b: b[11], light: "home02", place: "home02", name: "its maker called it the first", cInf: 8, focus: (f) => { const v = vacPose(11, f / FPS).p; return [v[0], 0.1, v[2]]; },
    cam: (f) => C(lerp3([X2 + 0.9, 0.95, 2.6], [X2 + 0.7, 0.9, 2.3], glide(k(f, 10))), [X2 - 0.6, 0.3, -0.9], 46) },
  { id: 12, a: b[11], b: b[12], light: "home02", place: "home02", name: "price", cInf: 8, focus: () => [X2 + 0.35, 0.1, -0.55],
    cam: (f) => C(lerp3([X2 + 0.8, 0.8, 1.45], [X2 + 0.75, 0.75, 1.2], glide(k(f, 11))), [X2 + 0.3, 0.1, -0.5], 40) },
  { id: 13, a: b[12], b: b[13], light: "home02", place: "home02", name: "CTA: Roll-Oh or a Roomba?", cInf: 6, focus: () => [X2 - 0.2, 0.8, -0.7],
    cam: (f) => C(lerp3([X2 - 0.2, 1.3, 3.7], [X2 - 0.25, 1.28, 3.4], glide(k(f, 12))), [X2 - 0.3, 0.75, 0.4], 42) },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
