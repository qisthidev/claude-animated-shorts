// RCA television (ystd-s005) world: original toon geometry, six places in one scene.
// FAIR (1939 World's Fair plaza with a toon Trylon + Perisphere, as seen on the film's screen) at the origin,
// HOME39 (x = -40), LAB (x = +40, the two tubes), CITY (x = +120, a toon Empire State Building whose signal rings
// stop at the horizon), TRACK (x = +200, grandstand with a camera on top, horses on the straight),
// STREET (x = -120, a block with 100 windows for the 12% -> 83% data).
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../engine/build";
import { ctex, rng, cloudHD, planksHD } from "../engine/paint";
import { TONE, CHAR, twoTone, untone } from "../engine/shade";
import { NOINK } from "../engine/ink";
import { Pool, Actor, Fx } from "../engine/sprites";
import { PRESET, WLOOK, KIT } from "./look";
import { stage } from "./cast";
import { FPS, SHOTS, ShotDef, V3, HOME_X, LAB_X, CITY_X, TRACK_X, STREET_X, ESB, ringR, HORIZON_R, windowsLit, clamp01 } from "./story";

const TAU = Math.PI * 2;
const wallpaper = (key: string, base: string, a: string, b: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32; g.fillStyle = (x + y) % 3 ? a : b; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 6, cy); g.lineTo(cx, cy + 9); g.lineTo(cx - 6, cy); g.closePath(); g.fill(); }
  for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const plain = (key: string, base: string) => ctex(key, 256, 256, (g, r) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; g.fillRect(r() * 256, r() * 256, 2, 2); } });
const grassT = () => ctex("rtGrass", 512, 512, (g, r) => { g.fillStyle = "#7b9457"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 900; i++) { g.fillStyle = ["#718c4f", "#859d5f", "#7a9352", "#8ea566"][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 14, 3 + r() * 7, r() * 3, 0, TAU); g.fill(); } });
const pavingT = () => ctex("rtPaving", 512, 512, (g, r) => { g.fillStyle = "#d8cfbd"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(90,80,60,0.35)"; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); } for (let i = 0; i < 600; i++) { g.fillStyle = r() < 0.5 ? "#cfc5b2" : "#e2dac9"; g.fillRect(r() * 512, r() * 512, 3, 3); } });
const dirtT = () => ctex("rtDirt", 512, 512, (g, r) => { g.fillStyle = "#b08a5e"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 1200; i++) { g.fillStyle = r() < 0.5 ? "#a07a50" : "#c09a6c"; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2); } });
const rugT = () => ctex("rtRug", 512, 512, (g) => { g.fillStyle = "#2f5f6a"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "#e3c58f"; g.lineWidth = 22; g.strokeRect(30, 30, 452, 452); g.lineWidth = 8; g.strokeRect(70, 70, 372, 372); });
const screenT = (key: string, kind: "fair" | "race") => ctex(key, 256, 192, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, "#e8f1f2"); gr.addColorStop(1, "#9fb3b8"); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  g.fillStyle = "#4b5a5e";
  if (kind === "fair") { g.beginPath(); g.moveTo(90, 170); g.lineTo(104, 20); g.lineTo(118, 170); g.fill(); g.beginPath(); g.arc(160, 140, 38, 0, TAU); g.fill(); g.fillRect(0, 172, 256, 20); }
  else { g.fillRect(0, 150, 256, 42); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(60 + i * 60, 128, 22, 12, 0, 0, TAU); g.fill(); g.fillRect(48 + i * 60, 128, 4, 22); g.fillRect(70 + i * 60, 128, 4, 22); } }
  g.fillStyle = "rgba(255,255,255,0.18)"; for (let y = 0; y < 192; y += 4) g.fillRect(0, y, 256, 1); // scan lines
});
const latheY = (pts: [number, number][], seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const cyl = (r0: number, r1: number, h: number, seg = 20) => new THREE.CylinderGeometry(r0, r1, h, seg);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: V3 = [1, 1, 1]) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));
const flatQuad = (x0: number, x1: number, z0: number, z1: number, y: number, tu = 1, tv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tu, uv.getY(i) * tv); return g;
};
const wallQ = (n: "+z" | "+x" | "-x", c: number, a0: number, a1: number, y0: number, y1: number, tile = 1.2) => {
  const g = new THREE.PlaneGeometry(a1 - a0, y1 - y0); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (a1 - a0) / tile, uv.getY(i) * (y1 - y0) / tile);
  if (n === "+z") g.translate((a0 + a1) / 2, (y0 + y1) / 2, c); else { g.rotateY(n === "+x" ? Math.PI / 2 : -Math.PI / 2); g.translate(c, (y0 + y1) / 2, (a0 + a1) / 2); }
  return g;
};
const rep = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

/** the 1939 console: radio-like wooden cabinet; the picture tube faces up and is seen in a mirror in the raised lid */
const consoleTV = (b: Batch, R: THREE.Object3D, x: number, y: number, z: number, ry: number, M: Record<string, THREE.Material>, scr: THREE.Material) => {
  const m = at(x, y, z, 0, ry);
  const add = (g: THREE.BufferGeometry, mat: THREE.Material) => { g.applyMatrix4(m); b.add(g, mat); };
  add(boxGeo(V(-0.5, 0, -0.3), V(0.5, 1.0, 0.3)), M.wood);
  add(boxGeo(V(-0.42, 0.12, 0.3), V(0.42, 0.62, 0.32)), M.cloth);                 // speaker cloth
  for (let i = 0; i < 4; i++) { const k = cyl(0.04, 0.04, 0.04, 12); k.rotateX(Math.PI / 2); k.translate(-0.27 + i * 0.18, 0.78, 0.32); add(k, M.cream); }
  const lid = new THREE.Group(); lid.position.set(0, 1.0, -0.3); lid.rotation.x = -1.1;          // hinged at the back, raised
  const lidBox = new THREE.Mesh(boxGeo(V(-0.5, 0, 0), V(0.5, 0.04, 0.6)), M.wood); lid.add(lidBox);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), scr); mirror.rotation.x = Math.PI / 2; mirror.position.set(0, -0.005, 0.32); lid.add(mirror);
  const holder = new THREE.Group(); holder.position.set(x, y, z); holder.rotation.y = ry; holder.add(lid); R.add(holder);
};

export class World {
  root = new THREE.Group();
  private pool = new Pool(); private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial; private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private G: Record<string, THREE.Group> = {};
  private clouds: THREE.Mesh[] = [];
  private rings: THREE.Mesh[] = []; private horizon: THREE.Mesh;
  private windows: THREE.MeshBasicMaterial[] = []; private order: number[] = [];
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2800, 48, 24), this.skyMat); this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    const cm = [0, 1, 2, 3].map((k) => cloudHD(k, WLOOK.fair.cloud));
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cm[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false })); m.layers.set(NOINK); this.clouds.push(m); R.add(m); }

    const M: Record<string, THREE.Material> = {};
    M.white = lam("rt_white", () => ({ color: "#f3efe6" }));
    M.paving = lam("rt_paving", () => ({ map: rep(pavingT()) }));
    M.grass = lam("rt_grass", () => ({ map: rep(grassT()) }));
    M.wood = lam("rt_wood", () => ({ color: "#7a5432" }));
    M.woodLight = lam("rt_woodLight", () => ({ color: "#c79a62" }));
    M.cloth = lam("rt_cloth", () => ({ color: "#c9b48a" }));
    M.cream = lam("rt_cream", () => ({ color: KIT.cream }));
    M.teal = lam("rt_teal", () => ({ color: KIT.teal }));
    M.orange = lam("rt_orange", () => ({ color: KIT.orange }));
    M.dark = lam("rt_dark", () => ({ color: "#22282e" }));
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#8d949c", specular: "#bbbbbb", shininess: 50 }), 0.15);
    M.wall = lam("rt_wall", () => ({ map: rep(wallpaper("rtWall", "#e6d3a8", "#c9a86a", KIT.teal)) }));
    M.floor = lam("rt_floor", () => ({ map: (() => { const t = planksHD(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })(), color: "#d9b48a" }));
    M.ceil = lam("rt_ceil", () => ({ color: "#efe7d6" }));
    M.sofa = lam("rt_sofa", () => ({ color: "#a8553a" }));
    M.rug = lam("rt_rug", () => ({ map: rugT() }));
    M.lab = lam("rt_lab", () => ({ map: rep(plain("rtLab", "#5b6a70")) }));
    M.labFloor = lam("rt_labFloor", () => ({ color: "#3e4a50" }));
    M.city = lam("rt_city", () => ({ color: "#8b8ea0" }));
    M.cityDark = lam("rt_cityDark", () => ({ color: "#6d7186" }));
    M.ground = lam("rt_ground", () => ({ color: "#7d8a7a" }));
    M.dirt = lam("rt_dirt", () => ({ map: rep(dirtT()) }));
    M.brick = lam("rt_brick", () => ({ color: "#9a5a46" }));
    const scrFair = new THREE.MeshBasicMaterial({ map: screenT("rtScrFair", "fair"), fog: false, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15) });
    const scrRace = new THREE.MeshBasicMaterial({ map: screenT("rtScrRace", "race"), fog: false, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15) });
    const glass = new THREE.MeshPhongMaterial({ color: "#bfe3e0", specular: "#ffffff", shininess: 90, transparent: true, opacity: 0.35, depthWrite: false });

    // ================= FAIR =================
    const fair = (this.G.fair = new THREE.Group()); R.add(fair);
    { const b = new Batch();
      b.add(flatQuad(-400, 400, -400, 400, 0, 80, 80), M.grass);
      b.add(flatQuad(-30, 30, -120, 20, 0.02, 12, 28), M.paving);
      const tr = new THREE.ConeGeometry(7, 90, 3, 1); tr.rotateY(Math.PI / 6); b.add(tr, M.white, at(-14, 45, -95));   // Trylon (toon)
      b.add(new THREE.SphereGeometry(24, 40, 28), M.white, at(20, 30, -100));                                   // Perisphere (toon)
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.add(cyl(1.2, 1.4, 8, 10), M.white, at(20 + Math.cos(a) * 10, 4, -100 + Math.sin(a) * 10)); }
      const heli = new THREE.TorusGeometry(26, 1.2, 8, 48, Math.PI * 0.9); heli.rotateX(Math.PI / 2); b.add(heli, M.white, at(20, 6, -100, 0, 0.8, 0.12));
      for (let i = 0; i < 10; i++) { const x = i % 2 ? 18 : -18, z = -10 - Math.floor(i / 2) * 18; b.add(cyl(0.12, 0.12, 9, 8), M.steel, at(x, 4.5, z)); }
      b.add(boxGeo(V(-0.9, 0, -0.7), V(0.9, 0.5, 0.7)), M.teal);   // pedestal
      b.build(fair);
      const tvb = new Batch(); consoleTV(tvb, fair, 0, 0.5, 0, 0, M, scrFair); tvb.build(fair); // the console on its pedestal
      for (let i = 0; i < 10; i++) { const x = i % 2 ? 18 : -18, z = -10 - Math.floor(i / 2) * 18; const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshLambertMaterial({ color: i % 3 === 0 ? KIT.orange : i % 3 === 1 ? KIT.teal : "#f1e8d6", side: THREE.DoubleSide })); twoTone(fl.material as THREE.MeshLambertMaterial); fl.position.set(x + (x > 0 ? -1.2 : 1.2), 8.2, z); fair.add(fl); }
    }

    // ================= HOME 1939 =================
    const home = (this.G.home = new THREE.Group()); R.add(home);
    { const b = new Batch(), X = HOME_X;
      b.add(flatQuad(X - 4, X + 4, -3, 3.2, 0, 4, 3), M.floor);
      const cg = flatQuad(X - 4, X + 4, -3, 3.2, 3.0); cg.rotateX(Math.PI); cg.translate(0, 6.0, 0); b.add(cg, M.ceil);
      b.add(wallQ("+z", -3, X - 4, X + 4, 0, 3), M.wall); b.add(wallQ("+x", X - 4, -3, 3.2, 0, 3), M.wall); b.add(wallQ("-x", X + 4, -3, 3.2, 0, 3), M.wall);
      b.add(boxGeo(V(X - 4, 0, -3), V(X + 4, 0.14, -2.96)), M.wood);
      b.add(boxGeo(V(X - 3.2, 0.1, -2.85), V(X - 0.9, 0.5, -2.05)), M.sofa); b.add(boxGeo(V(X - 3.2, 0.5, -2.95), V(X - 0.9, 1.15, -2.65)), M.sofa);
      for (const x of [-3.3, -1.0]) b.add(boxGeo(V(X + x, 0.1, -2.95), V(X + x + 0.2, 0.8, -2.05)), M.sofa);
      b.add(cyl(0.025, 0.025, 1.5, 6), M.steel, at(X - 3.6, 0.75, -2.6)); b.add(cyl(0.15, 0.32, 0.38, 20), M.cloth, at(X - 3.6, 1.6, -2.6));
      b.add(flatQuad(X - 2.2, X + 1.8, -1.6, 1.4, 0.012), M.rug);
      b.build(home);
      const tvb = new Batch(); consoleTV(tvb, home, X + 1.6, 0, -1.6, -0.6, M, scrRace); tvb.build(home);
    }

    // ================= LAB =================
    const lab = (this.G.lab = new THREE.Group()); R.add(lab);
    { const b = new Batch(), X = LAB_X;
      b.add(flatQuad(X - 5, X + 5, -4, 4, 0, 4, 3), M.labFloor);
      b.add(wallQ("+z", -3.5, X - 5, X + 5, 0, 4), M.lab); b.add(wallQ("+x", X - 5, -3.5, 4, 0, 4), M.lab); b.add(wallQ("-x", X + 5, -3.5, 4, 0, 4), M.lab);
      b.add(boxGeo(V(X - 3, 0.85, -2.2), V(X + 3, 0.95, -0.9)), M.woodLight);
      for (const x of [-2.8, 2.8]) for (const z of [-2.1, -1.0]) b.add(boxGeo(V(X + x - 0.05, 0, z - 0.05), V(X + x + 0.05, 0.85, z + 0.05)), M.steel);
      for (const x of [-0.62, 0.62]) b.add(cyl(0.06, 0.12, 0.3, 12), M.steel, at(X + x, 1.1, -1.55));
      b.add(boxGeo(V(X - 2.8, 0.95, -2.15), V(X - 2.2, 1.35, -1.8)), M.dark); b.add(boxGeo(V(X + 2.1, 0.95, -2.15), V(X + 2.8, 1.45, -1.8)), M.dark);
      b.build(lab);
      // iconoscope: round glass bulb with a side neck; glowing mosaic plate inside
      const ico = new THREE.Group(); ico.position.set(X - 0.62, 1.5, -1.55); ico.scale.setScalar(1.25);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), glass); ico.add(bulb);
      const neck = new THREE.Mesh(cyl(0.07, 0.07, 0.55, 20), glass); neck.rotation.z = Math.PI / 2.6; neck.position.set(0.32, -0.22, 0); ico.add(neck);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.7), fog: false })); plate.rotation.y = 0.5; ico.add(plate);
      lab.add(ico);
      // kinescope: funnel tube, its face glowing with a picture
      const kin = new THREE.Group(); kin.position.set(X + 0.62, 1.12, -1.55); kin.scale.setScalar(1.25);
      const fun = new THREE.Mesh(latheY([[0.06, 0], [0.07, 0.3], [0.2, 0.55], [0.36, 0.8], [0.38, 0.86]], 40), glass); kin.add(fun);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), scrFair); face.rotation.x = -Math.PI / 2; face.position.y = 0.86; kin.add(face);
      kin.rotation.set(1.05, -0.35, 0); lab.add(kin);
      for (const g of [ico, kin]) g.traverse((o) => o.layers.set(NOINK));
    }

    // ================= CITY =================
    const city = (this.G.city = new THREE.Group()); R.add(city);
    { const b = new Batch(), X = CITY_X;
      b.add(flatQuad(X - 2500, X + 2500, -2500, 2500, 0, 1, 1), M.ground);
      const r = rng(17);
      for (let i = 0; i < 260; i++) { const x = X + (r() - 0.5) * 900, z = (r() - 0.5) * 900; if (Math.hypot(x - ESB[0], z - ESB[2]) < 45) continue; const w = 14 + r() * 26, d = 14 + r() * 26, h = 12 + r() ** 2 * 140; b.add(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h, z + d / 2)), r() < 0.5 ? M.city : M.cityDark); }
      // the toon Empire State Building: setbacks, a tower, a mast
      const [ex, , ez] = ESB;
      for (const [w, y0, y1] of [[60, 0, 30], [46, 30, 260], [34, 260, 310], [22, 310, 340], [12, 340, 365]] as const) b.add(boxGeo(V(ex - w / 2, y0, ez - w * 0.35), V(ex + w / 2, y1, ez + w * 0.35)), M.cream);
      b.add(cyl(3.5, 5, 30, 12), M.cream, at(ex, 380, ez)); b.add(cyl(0.8, 1.6, 60, 8), M.steel, at(ex, 425, ez));
      b.build(city);
      for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.0, 1.8), transparent: true, opacity: 0.8, side: THREE.DoubleSide, fog: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.layers.set(NOINK); this.rings.push(m); city.add(m); }
      this.horizon = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.0, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.1, 0.4), transparent: true, opacity: 0.9, side: THREE.DoubleSide, fog: false, depthWrite: false }));
      this.horizon.rotation.x = -Math.PI / 2; this.horizon.position.set(ex, 3, ez); this.horizon.scale.setScalar(HORIZON_R); this.horizon.layers.set(NOINK); city.add(this.horizon);
    }

    // ================= TRACK =================
    const track = (this.G.track = new THREE.Group()); R.add(track);
    { const b = new Batch(), X = TRACK_X;
      b.add(flatQuad(X - 400, X + 400, -400, 400, 0, 80, 80), M.grass);
      b.add(flatQuad(X - 120, X + 120, -6, 6, 0.02, 40, 2), M.dirt);
      for (let i = 0; i < 60; i++) b.add(boxGeo(V(X - 120 + i * 4, 0, -6.3), V(X - 119.85 + i * 4, 1.1, -6.15)), M.white);
      b.add(boxGeo(V(X - 120, 1.0, -6.32), V(X + 120, 1.1, -6.12)), M.white);
      // grandstand on the near side (z +10..+22), stepped, with a roof; camera + tripod on the roof edge
      for (let s = 0; s < 6; s++) b.add(boxGeo(V(X - 30, 0, 10 + s * 2), V(X + 30, 0.8 + s * 1.0, 22)), M.white);
      b.add(boxGeo(V(X - 31, 9, 9.5), V(X + 31, 9.4, 22.5)), M.teal);
      for (const x of [-28, -10, 10, 28]) b.add(cyl(0.2, 0.2, 9, 8), M.steel, at(X + x, 4.5, 10.2));
      b.add(boxGeo(V(X - 1.5, 9.4, 10.0), V(X - 0.7, 10.0, 10.6)), M.dark); b.add(cyl(0.18, 0.2, 0.4, 16).rotateX(Math.PI / 2), M.steel, at(X - 1.1, 9.75, 9.8));
      for (const s of [-1, 1]) b.add(cyl(0.03, 0.03, 0.7, 6), M.steel, at(X - 1.1 + s * 0.3, 9.4 + 0.0, 10.3, 0, 0, s * 0.25));
      // mobile units: two box trucks behind the stand
      for (const x of [-46, -38]) { b.add(boxGeo(V(X + x - 3, 0.6, 24), V(X + x + 3, 3.2, 27)), M.cream); b.add(boxGeo(V(X + x + 3, 0.6, 24.2), V(X + x + 4.6, 2.4, 26.8)), M.teal); for (const dx of [-2, 2.8]) b.add(cyl(0.55, 0.55, 3.2, 16).rotateX(Math.PI / 2), M.dark, at(X + x + dx, 0.55, 25.5)); }
      b.build(track);
    }

    // ================= STREET (100 windows) =================
    const street = (this.G.street = new THREE.Group()); R.add(street);
    { const b = new Batch(), X = STREET_X;
      b.add(flatQuad(X - 200, X + 200, -200, 200, 0, 1, 1), M.ground);
      b.add(boxGeo(V(X - 11, 0, -14), V(X + 11, 31, -8)), M.brick);
      b.add(boxGeo(V(X - 11.4, 31, -14.4), V(X + 11.4, 31.8, -7.6)), M.cream);
      b.build(street);
      const r = rng(23);
      for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.13, 0.18), fog: false }); this.windows.push(mat);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), mat); w.position.set(X - 9 + col * 2.0, 2.4 + row * 2.85, -7.98); street.add(w);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.15), M.cream); sill.position.set(w.position.x, w.position.y - 0.92, -7.95); street.add(sill);
      }
      this.order = Array.from({ length: 100 }, (_, i) => i).sort(() => r() - 0.5);
    }
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.layers.isEnabled(NOINK)) { m.receiveShadow = true; m.castShadow = true; } });
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  private shotSun(s: ShotDef) {
    let v = this.sunCache.get(s.id); if (v) return v;
    const L = PRESET[s.light]; let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = s.cam(f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    v = new THREE.Vector3((fx * Math.cos(az) - fz * Math.sin(az)) * Math.cos(el), Math.sin(el), (fz * Math.cos(az) + fx * Math.sin(az)) * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v); return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = PRESET[s.light], K = WLOOK[s.light], c = s.cam(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.place === "city" ? 1 : 0.05; cam.far = 6000; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(s);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.4 + 6, 6, s.place === "city" ? 900 : 140);
    this.sun.position.copy(focus).addScaledVector(sunDir, Rr * 2 + 50); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 1; sc.far = Rr * 4 + 200; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    for (const k of ["fair", "home", "lab", "city", "track", "street"]) this.G[k].visible = s.place === k;
    const c0 = s.cam(s.a);
    this.clouds.forEach((m, i) => { m.visible = s.place === "fair" || s.place === "track"; const a = (i / 8) * TAU + 0.4, d = 700; m.position.set(c0.pos[0] + Math.cos(a) * d, 120 + (i % 3) * 40, c0.pos[2] + Math.sin(a) * d); m.scale.set(180, 90, 1); m.lookAt(cam.position.x, m.position.y, cam.position.z); });
    // signal rings: expand from the mast and stop at the horizon ring
    this.rings.forEach((m, i) => {
      const r = ringR(t, i); m.visible = r > 1; m.position.set(ESB[0], 3 + 0.0 * i, ESB[2]); m.scale.setScalar(Math.max(1, r));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.85 * (r >= HORIZON_R * 0.995 ? 0.35 : 1);
    });
    // windows: n of 100 lit with TV blue
    const n = windowsLit(t);
    this.order.forEach((wi, k) => { const on = clamp01(n - k); this.windows[wi].color.setRGB(0.12 + 0.5 * on, 0.13 + 1.1 * on, 0.18 + 1.6 * on); });
    // cast + effects
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++), [w, h, kk] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, kk, p.draw); a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2); a.mesh.castShadow = true; used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++); e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw); e2.use(!!p.soft);
      e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1); fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush(); for (const a of used) a.bind(); for (const e2 of fused) e2.bind();
    return focus;
  }
}
