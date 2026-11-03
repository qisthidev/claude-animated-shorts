// RCA television cast: original 1939 characters (fair visitors, a family at home, an announcer on the stand roof)
// as lit cards from the template's Pen/body code, plus our own cartoon racehorses with jockeys (unlit cards).
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, fxContact, SKINS, mul } from "../engine/toon";
import { FPS, SHOTS, HOME_X, TRACK_X, horseX, clamp01 } from "./story";
import { KIT } from "./look";

export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type Stage = { places: Place[]; fx: FxPlace[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };

const MAN = (v: number): Outfit => ({ jacket: ["#3f4a5a", "#5a4a3a", "#2f4f57", "#6b5a7a"][v % 4], pants: "#3b3f52", boots: "#2a1f1a", hat: "homburg", cap: ["#33393e", "#4a3a2a", "#2a3a40", "#3a3550"][v % 4], tie: v % 2 ? KIT.orange : "#8c3b4a", moustache: v % 3 === 1 ? "#4a3426" : undefined, skin: SKINS[v % 4], build: v % 3 === 2 ? "stout" : "adult" });
const WOMAN = (v: number): Outfit => ({ jacket: ["#efe2c4", "#d9e2e6", "#f3dcc8"][v % 3], pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: ["#4a3020", "#2a201a", "#8a5a34"][v % 3], dress: ["#d9a441", "#5a8fc2", "#c25a7a"][v % 3], skin: SKINS[(v + 1) % 4] });
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const tier = (d: number): [number, number, number] => d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const light2D = (cam: CamInfo) => { const sx = cam.sun.dot(cam.right), sy = -cam.sun.y; return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4); };
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => { const f = Math.round(t * FPS); let s = Math.round(-60 * hh(i, 9)); for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(18 + 54 * hh(i * 31 + n, 13)); } return 0; };
const tmp = new THREE.Vector3();
const person = (cam: CamInfo, key: string, o: Outfit, seed: number, x: number, y: number, z: number, fo: FrontOpts): Place => {
  const [w, h, k] = tier(cam.pos.distanceTo(tmp.set(x, y + 1.0, z)));
  const f2: FrontOpts = { mode: "stand", ...fo, light: light2D(cam), seed };
  return { key: `F|${key}|${fkey(f2)}`, x, y, z, size: [w, h, k], draw: (p) => bodyFront(p, o, f2) };
};
const contact = (out: Stage, x: number, y: number, z: number, sc = 1) => out.fx.push({ key: "blob|contact|#4a3f52", cw: 128, ch: 128, draw: (p) => fxContact(p, "#4a3f52"), x, y: y + 0.015, z, w: 0.6 * sc, h: 0.45 * sc, flat: true });

/** cartoon racehorse + jockey, side view facing left, on a 640 x 520 canvas; ph = gallop phase 0..1 */
const horse = (p: Pen, ph: number, coat: string, silks: string) => {
  const a = ph * Math.PI * 2, bob = 8 * Math.sin(a * 2);
  const leg = (x: number, y: number, ang: number) => { const ex = x + Math.sin(ang) * 70, ey = y + Math.cos(ang) * 70; p.stroke([[x, y], [ex, ey], [ex - 10 + Math.sin(ang) * 40, ey + 55]], 18, mul(coat, [0.8, 0.8, 0.85])); };
  leg(220, 300 + bob, 0.5 * Math.sin(a + 1.2)); leg(420, 300 + bob, 0.5 * Math.sin(a + 2.6));
  p.ell(320, 270 + bob, 150, 62, coat, 10);                                       // body
  p.poly([[200, 250 + bob], [150, 150 + bob], [120, 120 + bob], [70, 140 + bob], [70, 170 + bob], [130, 185 + bob], [175, 280 + bob]], coat, 10); // neck + head
  p.dot(105, 140 + bob, 6); p.poly([[138, 118 + bob], [150, 92 + bob], [160, 122 + bob]], coat, 6); // eye, ear
  p.stroke([[465, 255 + bob], [540, 250 + bob + 20 * Math.sin(a)], [575, 300 + bob]], 16, "#2a201a");   // tail
  leg(240, 300 + bob, -0.6 * Math.sin(a)); leg(440, 300 + bob, -0.6 * Math.sin(a + 1.8));
  // jockey
  p.poly([[280, 220 + bob], [340, 140 + bob], [380, 160 + bob], [330, 235 + bob]], silks, 8);
  p.ell(345, 118 + bob, 30, 30, "#f5c9a0", 7); p.poly([[318, 108 + bob], [372, 100 + bob], [380, 92 + bob], [322, 86 + bob]], silks, 6);
  p.stroke([[350, 170 + bob], [230, 205 + bob]], 9);
};

const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = T(f), s = SHOTS[id - 1];
  const P = (pl: Place, sc = 1) => { out.places.push(pl); contact(out, pl.x, pl.y, pl.z, sc); };
  if (s.place === "fair") { // a ring of visitors around the console on its pedestal
    const spots: [number, number][] = [[-1.6, 1.2], [-0.7, 1.7], [0.6, 1.8], [1.6, 1.2], [-2.4, 0.1], [2.3, 0.0], [-2.6, 1.9], [2.8, 2.0], [-3.4, 0.9], [3.4, 0.8]];
    spots.forEach(([x, z], i) => { const o = i % 2 ? WOMAN(i) : MAN(i); const expr: Expr = id === 2 ? (i % 3 ? "smile" : "shock") : "smile_closed"; P(person(cam, `v${i}`, o, i + 2, x, 0.02, z, { expr, blink: lidAt(t, i), facing: x > 0 ? -1 : 1 })); });
  }
  if (s.place === "home") {
    P(person(cam, "dad", { ...MAN(1), hat: "hair", hair: "#3a2a20" }, 3, HOME_X - 2.4, 0, -2.1, { mode: "sit", expr: id === 11 ? "grin" : "smile", blink: lidAt(t, 1), facing: 1 }), 1.3);
    P(person(cam, "mom", WOMAN(0), 4, HOME_X - 1.4, 0, -2.1, { mode: "sit", expr: "smile_closed", blink: lidAt(t, 2), facing: 1 }), 1.3);
  }
  if (s.place === "track") {
    P(person(cam, "ann", MAN(2), 5, TRACK_X - 2.2, 9.4, 10.3, { expr: "laugh", blink: lidAt(t, 3), facing: 1, wave: 0.4 + 0.3 * Math.sin(t * 6) }), 0.8);
    const coats = ["#7a4a2a", "#3a2a20", "#a0703a"], silks = [KIT.orange, KIT.teal, "#c25a7a"];
    for (let k = 0; k < 3; k++) {
      const x = horseX(t, k), ph = ((t * 2.2 + k * 0.33) % 1 + 1) % 1, fr = Math.floor(ph * 6) / 6;
      out.fx.push({ key: `horse|${k}|${fr}`, cw: 640, ch: 520, draw: (p) => horse(p, fr, coats[k], silks[k]), x, y: 1.25, z: -2.5 + k * 1.6, w: -3.2, h: 2.6 });
      out.fx.push({ key: "blob|contact|#4a3f52", cw: 128, ch: 128, draw: (p) => fxContact(p, "#4a3f52"), x, y: 0.04, z: -2.5 + k * 1.6, w: 2.0, h: 0.6, flat: true });
    }
  }
  void clamp01;
  return out;
};
