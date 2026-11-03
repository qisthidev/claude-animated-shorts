// Robot Butler cast: original characters drawn with the template's Pen/body code as lit cards, plus effect cards.
//   THE 1940 HOMEMAKER: mustard dress, cream top, dark hair (a cartoon, no likeness).
//   THE 2002 VIEWER: blue hoodie, jeans, on the sofa.
//   LITTLE ROBOTS: tiny card robots that peek out of appliances and the engine ("little brothers and sisters").
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, fxPuff, fxBurst, fxContact, SKINS } from "../engine/toon";
import { FPS, SHOTS, HOME02_X, DRIVE_X, T_CMD, T_SCRAM, T_DAYDREAM, T_PLUG, clamp01, smooth } from "./story";
import { KIT } from "./look";

export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type Stage = { places: Place[]; fx: FxPlace[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };

const HOMEMAKER: Outfit = { jacket: "#efe2c4", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#4a3020", dress: "#d9a441", skin: SKINS[0] };
const VIEWER: Outfit = { jacket: "#3f6fb5", pants: "#3c5a80", boots: "#e9e4d6", hat: "hair", hair: "#2a201a", skin: SKINS[3] };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const tier = (d: number): [number, number, number] => d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const light2D = (cam: CamInfo) => { const sx = cam.sun.dot(cam.right), sy = -cam.sun.y; return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4); };
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round(ts * FPS) + 2; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(18 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};
const tmp = new THREE.Vector3();
const person = (cam: CamInfo, key: string, o: Outfit, seed: number, x: number, y: number, z: number, fo: FrontOpts): Place => {
  const [w, h, k] = tier(cam.pos.distanceTo(tmp.set(x, y + 1.0, z)));
  const f2: FrontOpts = { mode: "stand", ...fo, light: light2D(cam), seed };
  return { key: `F|${key}|${fkey(f2)}`, x, y, z, size: [w, h, k], draw: (p) => bodyFront(p, o, f2) };
};
const contact = (out: Stage, x: number, y: number, z: number, sc = 1) =>
  out.fx.push({ key: "blob|contact|#4a3f52", cw: 128, ch: 128, draw: (p) => fxContact(p, "#4a3f52"), x, y: y + 0.015, z, w: 0.6 * sc, h: 0.45 * sc, flat: true });

/** a tiny robot on a 200 x 260 canvas: box head, antenna, eyes, little body, one arm waving (wave 0..1) */
const tinyBot = (p: Pen, wave: number, col: string) => {
  p.stroke([[100, 30], [100, 62]], 6); p.dot(100, 26, 11, KIT.orange);
  p.poly([[50, 62], [150, 62], [150, 140], [50, 140]], "#c9ced6", 8);
  p.ell(78, 98, 14, 14, "#fff1b8", 6); p.ell(122, 98, 14, 14, "#fff1b8", 6); p.dot(78, 98, 6); p.dot(122, 98, 6);
  p.stroke([[80, 124], [120, 124]], 6);
  p.poly([[62, 146], [138, 146], [132, 222], [68, 222]], col, 8);
  p.stroke([[138, 160], [170, 150 - 40 * wave]], 9); p.dot(170, 150 - 40 * wave, 9);
  p.stroke([[62, 160], [40, 196]], 9); p.dot(40, 196, 9);
  p.stroke([[84, 222], [84, 250]], 9); p.stroke([[116, 222], [116, 250]], 9);
};
const click = (p: Pen) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.stroke([[100 + 40 * Math.cos(a), 100 + 40 * Math.sin(a)], [100 + 80 * Math.cos(a), 100 + 80 * Math.sin(a)]], 10, KIT.ink); } };

const T = (f: number) => f / FPS;
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = T(f), s = SHOTS[id - 1];
  const P = (pl: Place, sc = 1) => { out.places.push(pl); contact(out, pl.x, pl.y, pl.z, sc); };
  if (s.place === "home40" && id <= 5) {
    if (id === 3) { // standing at the side table, pressing the panel on each command
      const presses = [T_CMD.door, T_CMD.dishes, T_CMD.dinner, T_CMD.bed, T_SCRAM];
      const press = presses.reduce((a, tp) => Math.max(a, 1 - Math.abs(t - tp - 0.05) / 0.18), 0);
      const expr: Expr = t >= T_SCRAM ? "laugh" : "smile";
      P(person(cam, "hm", HOMEMAKER, 4, 0.15, 0, -1.95, { expr, blink: lidAt(t, 1, [T_SCRAM]), wave: -0.9 + 0.5 * clamp01(press), facing: -1 }));
    } else {
      const shocked = id === 4 && t >= T_DAYDREAM + 0.1;
      const expr: Expr = id === 1 ? "smile" : id === 2 ? "smile_closed" : id === 4 ? (shocked ? "shock" : "smile_closed") : "neutral";
      P(person(cam, "hm", HOMEMAKER, 4, -2.05, 0, -2.1, { mode: "sit", expr, blink: lidAt(t, 1, id === 4 ? [T_DAYDREAM + 0.1] : []), facing: 1 }), 1.3);
    }
  }
  if (id === 4 && t >= T_DAYDREAM - 0.02) { // poof
    const u = clamp01((t - T_DAYDREAM) / 0.9);
    for (let i = 0; i < 5; i++) out.fx.push({ key: `puff|${Math.floor(u * 10)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, Math.min(0.92, u)), x: -0.4 + (hh(i, 1) - 0.5) * 0.8, y: 0.6 + i * 0.25, z: -0.9 + (hh(i, 2) - 0.5) * 0.4, w: 1.2 + 1.4 * u, h: 1.2 + 1.4 * u, soft: true });
    if (u < 0.4) out.fx.push({ key: `burst|${Math.floor(u * 25)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u / 0.4, "#fff3b0", 10, 40, 230), x: -0.4, y: 1.2, z: -0.85, w: 2.2, h: 2.2 });
  }
  if (id === 5) { // little robots peek out of the radio, the lamp, the stove and the window sill
    const spots: [number, number, number][] = [[3.15, 1.2, -1.35], [-3.6, 1.95, -2.6], [3.2, 1.35, -2.6], [1.7, 1.08, -2.85], [-0.45, 0.68, -2.5]];
    spots.forEach(([x, y, z], i) => {
      const u = clamp01((t - s.a / FPS - 0.25 - i * 0.35) / 0.3), wv = 0.5 + 0.5 * Math.sin(t * 9 + i);
      if (u <= 0) return;
      out.fx.push({ key: `tiny|${Math.round(wv * 4)}|${i % 2}`, cw: 200, ch: 260, draw: (p) => tinyBot(p, Math.round(wv * 4) / 4, i % 2 ? KIT.teal : KIT.orange), x, y: y + 0.18 * smooth(u), z, w: 0.3 * smooth(u), h: 0.39 * smooth(u) });
    });
  }
  if (id === 6 && t >= T_PLUG) { // the plug pops: a little click mark at the socket
    const u = clamp01((t - T_PLUG) / 0.35);
    if (u < 1) out.fx.push({ key: `click|${Math.floor(u * 6)}`, cw: 200, ch: 200, draw: click, x: 3.6, y: 1.12, z: -2.8, w: 0.25 * (0.6 + u), h: 0.25 * (0.6 + u) });
  }
  if (id === 8) { // tiny robots climb out of the engine bay as the hood lifts
    for (let i = 0; i < 6; i++) {
      const u = clamp01((t - s.a / FPS - 0.6 - i * 0.18) / 0.35), wv = 0.5 + 0.5 * Math.sin(t * 10 + i * 1.7);
      if (u <= 0) continue;
      out.fx.push({ key: `tiny|${Math.round(wv * 4)}|${i % 2}`, cw: 200, ch: 260, draw: (p) => tinyBot(p, Math.round(wv * 4) / 4, i % 2 ? KIT.teal : KIT.orange), x: DRIVE_X + 0.75 + (i % 3) * 0.42, y: 1.15 + 0.22 * smooth(u), z: -0.35 + Math.floor(i / 3) * 0.55, w: 0.26 * smooth(u), h: 0.34 * smooth(u) });
    }
  }
  if (s.place === "home02" && id !== 10) {
    const expr: Expr = id === 13 ? "grin" : id === 12 ? "smile" : "smile_closed";
    P(person(cam, "vw", VIEWER, 6, HOME02_X - 2.05, 0, -2.1, { mode: "sit", expr, blink: lidAt(t, 2), facing: 1 }), 1.3);
  }
  return out;
};
