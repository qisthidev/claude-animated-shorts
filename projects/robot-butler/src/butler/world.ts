// Robot Butler world (ystd-s004): one three.js scene with four places, all original toon geometry:
// HOME40 (1940 living room with a stove nook, at the origin), OFFICE (x = +40), DRIVE (a 1940 sedan in a driveway,
// x = +80), HOME02 (the same room re-dressed for 2002, x = -40). The chrome butler and the disc vacuum are ours.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../engine/build";
import { ctex, rng, cloudHD, planksHD } from "../engine/paint";
import { TONE, CHAR, twoTone, untone } from "../engine/shade";
import { NOINK } from "../engine/ink";
import { Pool, Actor, Fx } from "../engine/sprites";
import { PRESET, WLOOK, KIT } from "./look";
import { stage } from "./cast";
import { FPS, SHOTS, ShotDef, V3, OFFICE_X, DRIVE_X, HOME02_X, robotPose, vacPose, kettleUnplug, lightsOn, hoodOpen, clamp01, smooth } from "./story";

const TAU = Math.PI * 2;
// ---------------- painted textures ----------------
const wallpaper = (key: string, base: string, a: string, b: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { // small diamond print
    const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32;
    g.fillStyle = (x + y) % 3 ? a : b; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 6, cy); g.lineTo(cx, cy + 9); g.lineTo(cx - 6, cy); g.closePath(); g.fill();
  }
  for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const plainWall = (key: string, base: string) => ctex(key, 256, 256, (g, r) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; g.fillRect(r() * 256, r() * 256, 2, 2); } });
const rugT = (key: string, c1: string, c2: string) => ctex(key, 512, 512, (g) => {
  g.fillStyle = c1; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = c2; g.lineWidth = 22; g.strokeRect(30, 30, 452, 452); g.lineWidth = 8; g.strokeRect(70, 70, 372, 372);
  g.fillStyle = c2; g.beginPath(); g.ellipse(256, 256, 70, 70, 0, 0, TAU); g.fill();
});
const grassT = () => ctex("rbGrass", 512, 512, (g, r) => { g.fillStyle = "#7b9457"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 900; i++) { g.fillStyle = ["#718c4f", "#859d5f", "#7a9352", "#8ea566"][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 14, 3 + r() * 7, r() * 3, 0, TAU); g.fill(); } });
const concreteT = () => ctex("rbConcrete", 256, 256, (g, r) => { g.fillStyle = "#c9c3b6"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? "#bdb7aa" : "#d5d0c4"; g.fillRect(r() * 256, r() * 256, 3, 3); } g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(0, 126, 256, 3); });
const frameTex = (key: string, c: string) => ctex(key, 256, 320, (g, r) => { // a little framed landscape
  g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#efe6cf"; g.fillRect(18, 18, 220, 284);
  g.fillStyle = c; g.fillRect(30, 30, 196, 160); g.fillStyle = "#7b9457"; g.beginPath(); g.moveTo(30, 190); g.quadraticCurveTo(120, 120, 226, 170); g.lineTo(226, 290); g.lineTo(30, 290); g.fill();
});
const tvScreen = () => ctex("rbTV", 256, 192, (g) => { const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, "#9fd6e0"); gr.addColorStop(1, "#4a8fb0"); g.fillStyle = gr; g.fillRect(0, 0, 256, 192); g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.ellipse(80, 50, 60, 22, -0.3, 0, TAU); g.fill(); });
const robotFace = () => ctex("rbFace", 256, 128, (g) => { g.fillStyle = "#1c2228"; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 6; i++) { g.fillStyle = "#b7bec6"; g.fillRect(28 + i * 36, 30, 20, 68); } });
const nameplate = () => ctex("rbPlate", 512, 128, (g) => { g.fillStyle = KIT.cream; g.fillRect(0, 0, 512, 128); g.strokeStyle = KIT.ink; g.lineWidth = 10; g.strokeRect(5, 5, 502, 118); g.fillStyle = KIT.ink; g.font = "700 76px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ROLL-OH", 256, 68); });

// ---------------- geometry helpers ----------------
const latheY = (pts: [number, number][], seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const cyl = (r0: number, r1: number, h: number, seg = 20) => new THREE.CylinderGeometry(r0, r1, h, seg);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));
const beam = (a: THREE.Vector3, b: THREE.Vector3, w: number, h = w) => {
  const g = new THREE.BoxGeometry(w, a.distanceTo(b), h);
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
  return g;
};
const flatQuad = (x0: number, x1: number, z0: number, z1: number, y: number, tu = 1, tv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tu, uv.getY(i) * tv);
  return g;
};
/** wall quad facing `n` ("+z" = faces +z, etc.), spanning [a0,a1] along its run and [y0,y1] in height */
const wallQ = (n: "+z" | "+x" | "-x", c: number, a0: number, a1: number, y0: number, y1: number, tile = 1.2) => {
  const g = new THREE.PlaneGeometry(a1 - a0, y1 - y0);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (a1 - a0) / tile, uv.getY(i) * (y1 - y0) / tile);
  if (n === "+z") g.translate((a0 + a1) / 2, (y0 + y1) / 2, c);
  else { g.rotateY(n === "+x" ? Math.PI / 2 : -Math.PI / 2); g.translate(c, (y0 + y1) / 2, (a0 + a1) / 2); }
  return g;
};
const rep = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

type Room = { wall: THREE.Material; floor: THREE.Material; trim: THREE.Material; ceil: THREE.Material };
/** room shell: back wall (z = -3), side walls (x = +-4), floor, ceiling, baseboards; open toward +z (the camera) */
const roomShell = (b: Batch, ox: number, m: Room, win: [number, number] | null) => {
  b.add(flatQuad(ox - 4, ox + 4, -3, 3.2, 0, 4, 3), m.floor);
  const cg = flatQuad(ox - 4, ox + 4, -3, 3.2, 3.0); cg.rotateX(Math.PI); cg.translate(0, 6.0, 0); b.add(cg, m.ceil);
  if (win) { // back wall with a window opening [x0, x1] between y 1.0 and 2.3
    const [w0, w1] = win;
    b.add(wallQ("+z", -3, ox - 4, ox + w0, 0, 3), m.wall); b.add(wallQ("+z", -3, ox + w1, ox + 4, 0, 3), m.wall);
    b.add(wallQ("+z", -3, ox + w0, ox + w1, 0, 1.0), m.wall); b.add(wallQ("+z", -3, ox + w0, ox + w1, 2.3, 3), m.wall);
  } else b.add(wallQ("+z", -3, ox - 4, ox + 4, 0, 3), m.wall);
  b.add(wallQ("+x", ox - 4, -3, 3.2, 0, 3), m.wall); b.add(wallQ("-x", ox + 4, -3, 3.2, 0, 3), m.wall);
  b.add(boxGeo(V(ox - 4, 0, -3), V(ox + 4, 0.14, -2.96)), m.trim);
  b.add(boxGeo(V(ox - 4, 0, -3), V(ox - 3.96, 0.14, 3.2)), m.trim); b.add(boxGeo(V(ox + 3.96, 0, -3), V(ox + 4, 0.14, 3.2)), m.trim);
};
/** window: frame + muntins + bright pane (unlit, a touch over 1 so it blooms softly) */
const windowAt = (b: Batch, R: THREE.Object3D, x0: number, x1: number, trim: THREE.Material, glow: THREE.Color) => {
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 1.3), new THREE.MeshBasicMaterial({ color: glow, fog: false }));
  pane.position.set((x0 + x1) / 2, 1.65, -3.08); R.add(pane);
  for (const [a, c] of [[V(x0 - 0.08, 0.95, -3.06), V(x1 + 0.08, 1.02, -2.9)], [V(x0 - 0.08, 2.28, -3.06), V(x1 + 0.08, 2.36, -2.96)], [V(x0 - 0.08, 1.0, -3.06), V(x0, 2.3, -2.96)], [V(x1, 1.0, -3.06), V(x1 + 0.08, 2.3, -2.96)],
    [V((x0 + x1) / 2 - 0.025, 1.0, -3.06), V((x0 + x1) / 2 + 0.025, 2.3, -3.0)], [V(x0, 1.63, -3.06), V(x1, 1.68, -3.0)]] as const) b.add(boxGeo(a, c), trim);
};

export class World {
  root = new THREE.Group();
  private pool = new Pool(); private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial; private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private G: Record<string, THREE.Group> = {};
  private clouds: THREE.Mesh[] = [];
  // movers
  private robot = new THREE.Group(); private armL = new THREE.Group(); private armR = new THREE.Group(); private head = new THREE.Group(); private tray = new THREE.Group();
  private eyes: THREE.MeshBasicMaterial;
  private vac = new THREE.Group(); private vacLed: THREE.MeshBasicMaterial;
  private plug = new THREE.Group(); private cord: THREE.Mesh;
  private officeLights: THREE.MeshBasicMaterial[] = [];
  private eyeBeam: THREE.MeshBasicMaterial;
  private hood = new THREE.Group();
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
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    const cm = [0, 1, 2, 3].map((k) => cloudHD(k, WLOOK.drive.cloud));
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cm[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false })); m.layers.set(NOINK); this.clouds.push(m); R.add(m); }

    // ---- materials ----
    const M: Record<string, THREE.Material> = {};
    const floorWood = planksHD(); floorWood.wrapS = floorWood.wrapT = THREE.RepeatWrapping;
    M.floor40 = lam("rb_floor40", () => ({ map: floorWood, color: "#d9b48a" }));
    M.wall40 = lam("rb_wall40", () => ({ map: rep(wallpaper("rbWall40", "#e6d3a8", "#c9a86a", KIT.teal)) }));
    M.trim40 = lam("rb_trim40", () => ({ color: "#7a5432" }));
    M.ceil = lam("rb_ceil", () => ({ color: "#efe7d6" }));
    M.floor02 = lam("rb_floor02", () => ({ map: floorWood, color: "#efe2cc" }));
    M.wall02 = lam("rb_wall02", () => ({ map: rep(plainWall("rbWall02", "#cfd8dc")) }));
    M.trim02 = lam("rb_trim02", () => ({ color: "#f3f1ec" }));
    M.office = lam("rb_office", () => ({ map: rep(plainWall("rbOffice", "#d9d2bd")) }));
    M.officeFloor = lam("rb_officeFloor", () => ({ color: "#8f7a5e" }));
    M.sofa40 = lam("rb_sofa40", () => ({ color: "#a8553a" }));
    M.sofa02 = lam("rb_sofa02", () => ({ color: "#3f6d9a" }));
    M.wood = lam("rb_wood", () => ({ color: "#8a5a34" }));
    M.woodLight = lam("rb_woodLight", () => ({ color: "#c79a62" }));
    M.cream = lam("rb_cream", () => ({ color: "#f1e8d6" }));
    M.enamel = lam("rb_enamel", () => ({ color: "#eef0ea" }));
    M.dark = lam("rb_dark", () => ({ color: "#22282e" }));
    M.teal = lam("rb_teal", () => ({ color: KIT.teal }));
    M.orange = lam("rb_orange", () => ({ color: KIT.orange }));
    M.shade = lam("rb_shade", () => ({ color: "#f3dfb0" }));
    M.rug40 = lam("rb_rug40", () => ({ map: rugT("rbRug40", "#7a3e34", "#e3c58f") }));
    M.rug02 = lam("rb_rug02", () => ({ map: rugT("rbRug02", "#b9c3c7", "#6f8aa0") }));
    M.chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#c3c9d1", specular: "#ffffff", shininess: 90 }), 0.15);
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#8d949c", specular: "#bbbbbb", shininess: 50 }), 0.15);
    M.car = twoTone(new THREE.MeshPhongMaterial({ color: KIT.teal, specular: "#9ad6cf", shininess: 60 }), 0.15);
    M.tyre = lam("rb_tyre", () => ({ color: "#1d2024" }));
    M.grass = lam("rb_grass", () => ({ map: rep(grassT()) }));
    M.concrete = lam("rb_concrete", () => ({ map: rep(concreteT()) }));
    M.house = lam("rb_house", () => ({ color: "#efe6d2" }));
    M.roof = lam("rb_roof", () => ({ color: "#6b4a3a" }));
    M.vac = lam("rb_vac", () => ({ color: "#3b4148" }));
    M.vacTop = lam("rb_vacTop", () => ({ color: "#9aa3ab" }));
    M.screen = new THREE.MeshBasicMaterial({ map: tvScreen(), fog: false });
    const pic = (key: string, c: string) => { const m = new THREE.MeshLambertMaterial({ map: frameTex(key, c) }); twoTone(m); return m; };

    // ================= HOME 1940 =================
    const h40 = (this.G.home40 = new THREE.Group()); R.add(h40);
    { const b = new Batch();
      roomShell(b, 0, { wall: M.wall40, floor: M.floor40, trim: M.trim40, ceil: M.ceil }, [0.9, 2.5]);
      windowAt(b, h40, 0.9, 2.5, M.trim40, new THREE.Color(1.25, 1.18, 1.0));
      // front door on the left wall
      b.add(boxGeo(V(-3.98, 0, -1.6), V(-3.9, 2.2, -0.6)), M.wood);
      b.add(boxGeo(V(-3.99, 0, -1.7), V(-3.88, 2.3, -1.6)), M.trim40); b.add(boxGeo(V(-3.99, 0, -0.6), V(-3.88, 2.3, -0.5)), M.trim40); b.add(boxGeo(V(-3.99, 2.2, -1.7), V(-3.88, 2.3, -0.5)), M.trim40);
      b.add(new THREE.SphereGeometry(0.05, 10, 8), M.chrome, at(-3.86, 1.05, -0.75));
      // sofa (back wall, left), side table + lamp, armchair, console radio, rug, pictures
      b.add(boxGeo(V(-3.2, 0.1, -2.85), V(-0.9, 0.5, -2.05)), M.sofa40);
      b.add(boxGeo(V(-3.2, 0.5, -2.95), V(-0.9, 1.15, -2.65)), M.sofa40);
      for (const x of [-3.3, -1.0]) b.add(boxGeo(V(x, 0.1, -2.95), V(x + 0.2, 0.8, -2.05)), M.sofa40);
      for (const x of [-3.1, -1.0]) for (const z of [-2.8, -2.1]) b.add(cyl(0.04, 0.04, 0.1, 6), M.wood, at(x, 0.05, z));
      b.add(cyl(0.3, 0.3, 0.05, 20), M.wood, at(-0.45, 0.62, -2.5)); b.add(cyl(0.05, 0.07, 0.6, 8), M.wood, at(-0.45, 0.31, -2.5));
      b.add(cyl(0.025, 0.025, 1.5, 6), M.chrome, at(-3.6, 0.75, -2.6)); b.add(cyl(0.15, 0.32, 0.38, 20, ), M.shade, at(-3.6, 1.6, -2.6));
      b.add(boxGeo(V(2.6, 0.1, 0.9), V(3.5, 0.5, 1.9)), M.sofa40); b.add(boxGeo(V(3.3, 0.5, 0.9), V(3.6, 1.15, 1.9)), M.sofa40);
      b.add(boxGeo(V(3.2, 0, -1.8), V(3.85, 1.15, -0.9)), M.wood); b.add(boxGeo(V(3.18, 0.35, -1.7), V(3.2, 0.95, -1.0)), M.woodLight);
      b.add(flatQuad(-1.8, 1.8, -1.4, 1.4, 0.012), M.rug40);
      b.build(h40);
      const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), pic("rbPic1", "#9fc6d8")); p1.position.set(-2.05, 1.9, -2.98); h40.add(p1);
      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), pic("rbPic2", "#e7b98a")); p2.position.set(3.97, 1.9, -0.2); p2.rotation.y = -Math.PI / 2; h40.add(p2);
      // stove nook (right back corner): cream enamel stove, kettle, wall socket + cord + plug
      const sb = new Batch();
      sb.add(boxGeo(V(2.7, 0, -2.95), V(3.85, 0.92, -2.3)), M.enamel);
      sb.add(boxGeo(V(2.7, 0.92, -2.98), V(3.85, 1.3, -2.92)), M.enamel);
      for (const [x, z] of [[3.0, -2.75], [3.5, -2.75], [3.0, -2.45], [3.5, -2.45]] as const) sb.add(cyl(0.12, 0.12, 0.02, 20), M.dark, at(x, 0.93, z));
      sb.add(boxGeo(V(2.82, 0.15, -2.31), V(3.73, 0.75, -2.28)), M.steel);
      // kettle on the front-left burner
      sb.add(latheY([[0.0, 0], [0.17, 0], [0.19, 0.08], [0.17, 0.2], [0.09, 0.26], [0.05, 0.3], [0.0, 0.31]], 32), M.chrome, at(3.0, 0.94, -2.45));
      sb.add(beam(V(3.13, 1.03, -2.45), V(3.3, 1.17, -2.45), 0.035), M.chrome);
      const hdl = new THREE.TorusGeometry(0.11, 0.015, 8, 20, Math.PI); sb.add(hdl, M.dark, at(3.0, 1.2, -2.45));
      sb.add(boxGeo(V(3.6, 1.0, -2.915), V(3.72, 1.14, -2.9)), M.cream); // wall socket
      sb.build(h40);
      this.plug.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), M.dark)); this.plug.position.set(3.66, 1.07, -2.88); h40.add(this.plug);
      this.cord = new THREE.Mesh(cyl(0.008, 0.008, 1, 6), M.dark); h40.add(this.cord);
    }

    // ================= OFFICE (electric eye, lights) =================
    const off = (this.G.office = new THREE.Group()); R.add(off);
    { const b = new Batch(), X = OFFICE_X;
      roomShell(b, X, { wall: M.office, floor: M.officeFloor, trim: M.wood, ceil: M.ceil }, [-2.5, 2.5]);
      windowAt(b, off, X - 2.5, X + 2.5, M.wood, new THREE.Color(0.95, 0.98, 1.05));
      for (const [x, z] of [[-2.4, -0.8], [0, -0.8], [2.4, -0.8], [-2.4, 1.4], [0, 1.4], [2.4, 1.4]] as const) {
        b.add(boxGeo(V(X + x - 0.7, 0.72, z - 0.4), V(X + x + 0.7, 0.78, z + 0.4)), M.woodLight);
        for (const sx of [-0.62, 0.62]) for (const sz of [-0.33, 0.33]) b.add(boxGeo(V(X + x + sx - 0.03, 0, z + sz - 0.03), V(X + x + sx + 0.03, 0.72, z + sz + 0.03)), M.wood);
        b.add(boxGeo(V(X + x - 0.25, 0.78, z - 0.2), V(X + x + 0.25, 0.8, z + 0.15)), M.cream);
      }
      // the electric eye on the sill
      b.add(boxGeo(V(X + 2.7, 1.02, -2.9), V(X + 3.1, 1.3, -2.6)), M.steel);
      b.add(cyl(0.07, 0.07, 0.05, 16), M.dark, at(X + 2.9, 1.18, -2.58, Math.PI / 2));
      b.build(off);
      this.eyeBeam = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.2, 0.1), fog: false });
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), this.eyeBeam); lens.position.set(X + 2.9, 1.18, -2.55); off.add(lens);
      for (let i = 0; i < 6; i++) { // ceiling fixtures in two rows, switched on in order
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.55, 0.52), fog: false }); this.officeLights.push(mat);
        const x = X + [-2.4, 0, 2.4][i % 3], z = i < 3 ? -0.8 : 1.4;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.35), mat); m.position.set(x, 2.94, z); off.add(m);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.05, 0.43), M.steel); rim.position.set(x, 2.98, z); off.add(rim);
      }
    }

    // ================= DRIVE: the 1940 sedan =================
    const drv = (this.G.drive = new THREE.Group()); R.add(drv);
    { const b = new Batch(), X = DRIVE_X;
      b.add(flatQuad(X - 300, X + 300, -300, 300, 0, 60, 60), M.grass);
      b.add(flatQuad(X - 2.2, X + 2.2, -30, 30, 0.01, 1, 12), M.concrete);
      b.add(boxGeo(V(X - 9, 0, -16), V(X + 5, 4.2, -9)), M.house);
      const roofG = new THREE.CylinderGeometry(4.6, 4.6, 14.6, 3, 1); roofG.rotateZ(Math.PI / 2); b.add(roofG, M.roof, at(X - 2, 5.9, -12.5, 0, 0, 0, [1, 0.55, 1.0]));
      b.add(boxGeo(V(X - 1.2, 0, -9.02), V(X + 0.2, 2.3, -8.95)), M.wood);
      for (const x of [-6.5, 2.5]) b.add(boxGeo(V(X + x - 0.7, 1.3, -9.02), V(X + x + 0.7, 2.6, -8.95)), M.cream);
      const r = rng(4);
      for (let i = 0; i < 9; i++) { const x = X - 20 + i * 5 + r() * 2, z = -22 - r() * 8, h = 3 + r() * 2; b.add(cyl(0.18, 0.25, h, 8), M.wood, at(x, h / 2, z)); b.add(new THREE.SphereGeometry(1.6 + r(), 12, 10), M.grass, at(x, h + 1, z)); }
      // car body (along x, nose toward +x), centred at (X, 0, 0)
      const cb = new Batch();
      cb.add(boxGeo(V(-2.3, 0.42, -0.8), V(2.2, 0.95, 0.8)), M.car);
      cb.add(boxGeo(V(0.3, 0.95, -0.72), V(2.15, 1.18, 0.72)), M.car);
      const cab = new THREE.CylinderGeometry(0.78, 0.78, 2.0, 24, 1, false, 0, Math.PI); cab.rotateZ(Math.PI / 2); cab.rotateX(-Math.PI / 2);
      cb.add(boxGeo(V(-1.75, 0.95, -0.76), V(0.35, 1.45, 0.76)), M.car);
      cb.add(cab, M.car, at(-0.7, 1.45, 0, 0, 0, 0, [1, 0.55, 0.98]));
      for (const [x0, x1] of [[-1.6, -0.75], [-0.65, 0.2]] as const) for (const s of [-1, 1]) cb.add(boxGeo(V(x0, 1.0, s * 0.77 - 0.01), V(x1, 1.48, s * 0.77 + 0.01)), M.dark);
      cb.add(boxGeo(V(0.28, 1.0, -0.65), V(0.34, 1.62, 0.65)), M.dark);
      for (const [x, s] of [[1.45, -1], [1.45, 1], [-1.45, -1], [-1.45, 1]] as const) {
        const f = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 20, 1, false, -Math.PI / 2, Math.PI); f.rotateX(Math.PI / 2); cb.add(f, M.car, at(x, 0.5, s * 0.72));
        const w = cyl(0.36, 0.36, 0.26, 24); w.rotateX(Math.PI / 2); cb.add(w, M.tyre, at(x, 0.36, s * 0.78));
        const ww = new THREE.TorusGeometry(0.24, 0.05, 8, 24); cb.add(ww, M.cream, at(x, 0.36, s * 0.92));
        const hub = cyl(0.12, 0.12, 0.04, 16); hub.rotateX(Math.PI / 2); cb.add(hub, M.chrome, at(x, 0.36, s * 0.93));
      }
      for (let i = -4; i <= 4; i++) cb.add(boxGeo(V(2.18, 0.5, i * 0.07 - 0.02), V(2.26, 1.1, i * 0.07 + 0.02)), M.chrome);
      for (const x of [2.32, -2.36]) cb.add(boxGeo(V(x - 0.06, 0.32, -0.85), V(x + 0.06, 0.42, 0.85)), M.chrome);
      for (const s of [-1, 1]) cb.add(new THREE.SphereGeometry(0.14, 16, 12), M.cream, at(1.95, 1.0, s * 0.62));
      // engine bay (seen when the hood lifts): dark block, chrome parts
      cb.add(boxGeo(V(0.5, 0.95, -0.55), V(1.95, 1.12, 0.55)), M.dark);
      cb.add(cyl(0.16, 0.16, 0.2, 16), M.chrome, at(1.1, 1.2, 0.2)); cb.add(boxGeo(V(1.5, 1.12, -0.35), V(1.8, 1.26, -0.05)), M.steel);
      const car = new THREE.Group(); car.position.set(X, 0, 0); drv.add(car);
      cb.build(car);
      // hood (hinged at its rear edge, opens upward toward the windscreen)
      const hoodM = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 1.46), M.car as THREE.Material); hoodM.position.set(0.925, 0.03, 0); this.hood.add(hoodM);
      this.hood.position.set(0.3, 1.18, 0); car.add(this.hood);
      car.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
      b.build(drv);
    }

    // ================= HOME 2002 =================
    const h02 = (this.G.home02 = new THREE.Group()); R.add(h02);
    { const b = new Batch(), X = HOME02_X;
      roomShell(b, X, { wall: M.wall02, floor: M.floor02, trim: M.trim02, ceil: M.ceil }, [0.9, 2.5]);
      windowAt(b, h02, X + 0.9, X + 2.5, M.trim02, new THREE.Color(1.2, 1.2, 1.15));
      b.add(boxGeo(V(X - 3.3, 0.12, -2.9), V(X - 0.8, 0.5, -2.0)), M.sofa02); b.add(boxGeo(V(X - 3.3, 0.5, -2.95), V(X - 0.8, 1.0, -2.65)), M.sofa02);
      for (const x of [-3.4, -0.9]) b.add(boxGeo(V(X + x, 0.12, -2.95), V(X + x + 0.18, 0.7, -2.0)), M.sofa02);
      b.add(boxGeo(V(X - 1.0, 0.35, -0.9), V(X + 0.6, 0.42, -0.2)), M.woodLight);
      for (const sx of [-0.95, 0.55]) for (const sz of [-0.85, -0.25]) b.add(boxGeo(V(X + sx - 0.03, 0, sz - 0.03), V(X + sx + 0.03, 0.35, sz + 0.03)), M.woodLight);
      b.add(boxGeo(V(X + 2.8, 0, 0.0), V(X + 3.9, 0.55, 1.4)), M.dark); // TV stand
      b.add(boxGeo(V(X + 2.95, 0.55, 0.15), V(X + 3.8, 1.25, 1.25)), M.dark); // CRT
      b.add(flatQuad(X - 2.2, X + 1.8, -1.6, 1.6, 0.012), M.rug02);
      b.build(h02);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M.screen as THREE.Material); scr.position.set(X + 2.94, 0.9, 0.7); scr.rotation.y = -Math.PI / 2; h02.add(scr);
      const p3 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), pic("rbPic3", "#c6dbe6")); p3.position.set(X - 2.05, 1.85, -2.98); h02.add(p3);
      // the disc vacuum (generic, no brand marks)
      const vb = new Batch();
      vb.add(cyl(0.17, 0.17, 0.07, 32), M.vac, at(0, 0.045, 0)); vb.add(cyl(0.12, 0.12, 0.012, 32), M.vacTop, at(0, 0.085, 0));
      const bump = new THREE.TorusGeometry(0.172, 0.02, 8, 24, Math.PI); bump.rotateX(Math.PI / 2); vb.add(bump, M.steel, at(0, 0.05, 0, 0, Math.PI / 2));
      vb.build(this.vac);
      this.vacLed = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 1.6), fog: false });
      const led = new THREE.Mesh(new THREE.CircleGeometry(0.015, 12), this.vacLed); led.rotation.x = -Math.PI / 2; led.position.set(0.08, 0.092, 0); this.vac.add(led);
      R.add(this.vac);
    }

    // ================= the chrome butler (our design) =================
    { const b = new Batch();
      b.add(cyl(0.32, 0.36, 0.3, 24), M.steel, at(0, 0.17, 0));                       // skirt on wheels
      b.add(boxGeo(V(-0.34, 0.32, -0.22), V(0.34, 1.25, 0.22)), M.chrome);            // body
      b.add(boxGeo(V(-0.22, 0.7, 0.215), V(0.22, 1.05, 0.235)), M.teal);              // chest panel
      for (let i = 0; i < 3; i++) b.add(new THREE.SphereGeometry(0.035, 10, 8), M.orange, at(-0.12 + i * 0.12, 0.8, 0.24));
      b.add(cyl(0.07, 0.09, 0.08, 16), M.steel, at(0, 1.29, 0));                       // neck
      b.build(this.robot);
      const hb = new Batch();
      hb.add(boxGeo(V(-0.24, 0, -0.18), V(0.24, 0.4, 0.18)), M.chrome);
      for (const s of [-1, 1]) { const e = cyl(0.075, 0.075, 0.05, 20); e.rotateX(Math.PI / 2); hb.add(e, M.steel, at(s * 0.1, 0.25, 0.19)); }
      hb.add(cyl(0.012, 0.012, 0.2, 6), M.steel, at(0, 0.5, 0)); hb.add(new THREE.SphereGeometry(0.035, 10, 8), M.orange, at(0, 0.61, 0));
      hb.build(this.head);
      this.eyes = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.5), fog: false });
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), this.eyes); e.position.set(s * 0.1, 0.25, 0.217); this.head.add(e); }
      const grille = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ map: robotFace(), fog: false })); grille.position.set(0, 0.1, 0.182); this.head.add(grille);
      this.head.position.set(0, 1.33, 0); this.robot.add(this.head);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshLambertMaterial({ map: nameplate() })); twoTone(plate.material as THREE.MeshLambertMaterial); plate.position.set(0, 0.55, 0.222); this.robot.add(plate);
      for (const [g, s] of [[this.armL, -1], [this.armR, 1]] as const) {
        const ab = new Batch();
        ab.add(new THREE.SphereGeometry(0.08, 12, 10), M.steel, at(0, 0, 0));
        ab.add(cyl(0.05, 0.05, 0.42, 12), M.chrome, at(0, -0.24, 0));
        ab.add(new THREE.SphereGeometry(0.06, 12, 10), M.steel, at(0, -0.47, 0));
        ab.add(boxGeo(V(-0.05, -0.62, -0.06), V(0.05, -0.5, 0.06)), M.chrome);
        ab.build(g); g.position.set(s * 0.42, 1.15, 0); this.robot.add(g);
      }
      const tb = new Batch(); tb.add(cyl(0.22, 0.22, 0.02, 24), M.chrome, at(0, 0, 0)); tb.add(cyl(0.05, 0.05, 0.14, 16), M.cream, at(-0.08, 0.08, 0)); tb.add(cyl(0.06, 0.05, 0.08, 16), M.cream, at(0.09, 0.05, 0.02));
      tb.build(this.tray); this.tray.position.set(0, 0.62, 0.4); this.robot.add(this.tray);
      // own material copies, so the ghost fade (CTA) never touches the shared world materials
      this.robot.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
        const src = m.material as THREE.Material; if ((src as THREE.MeshBasicMaterial).isMeshBasicMaterial) return;
        const c = src.clone(); c.onBeforeCompile = src.onBeforeCompile; c.customProgramCacheKey = src.customProgramCacheKey; m.material = c; });
      R.add(this.robot);
    }
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.layers.isEnabled(NOINK)) m.receiveShadow = true; });
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
    cam.fov = c.fov; cam.near = 0.05; cam.far = 2000; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(s);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.5 + 4, 6, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 60); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    const P = s.place;
    for (const k of ["home40", "office", "drive", "home02"]) this.G[k].visible = P === k;
    const c0 = s.cam(s.a);
    this.clouds.forEach((m, i) => { m.visible = P === "drive"; const a = (i / 7) * TAU + 0.4, d = 520; m.position.set(c0.pos[0] + Math.cos(a) * d, 90 + (i % 3) * 30, c0.pos[2] + Math.sin(a) * d); m.scale.set(140, 70, 1); m.lookAt(cam.position.x, m.position.y, cam.position.z); });
    // ---- robot ----
    const rp = robotPose(id, t);
    this.robot.visible = rp.visible; this.robot.position.set(...rp.p); this.robot.rotation.set(0, rp.yaw, 0); this.robot.scale.setScalar(rp.scale);
    this.head.rotation.set(0, rp.head, 0); this.armL.rotation.set(rp.armL, 0, 0); this.armR.rotation.set(rp.armR, 0, 0);
    this.tray.visible = rp.tray; (this.eyes.color as THREE.Color).setRGB(2.2 * rp.glow, 1.3 * rp.glow, 0.5 * rp.glow);
    this.robot.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mm = m.material as THREE.Material; mm.transparent = rp.ghost < 1; mm.opacity = rp.ghost; mm.depthWrite = rp.ghost >= 1; } });
    // ---- kettle plug ----
    const k = kettleUnplug(t), sock = V(3.66, 1.07, -2.88), plugP = sock.clone().add(V(-0.25 * k, -0.45 * k * k, 0.12 * k));
    this.plug.position.copy(plugP); this.plug.rotation.z = 1.2 * k;
    const base = V(3.05, 0.95, -2.62); this.cord.position.copy(base).add(plugP).multiplyScalar(0.5); this.cord.scale.set(1, base.distanceTo(plugP), 1);
    this.cord.quaternion.setFromUnitVectors(V(0, 1, 0), plugP.clone().sub(base).normalize());
    // ---- office lights + electric eye ----
    const lo = lightsOn(t); this.officeLights.forEach((m, i) => { const on = clamp01((lo - i * 0.12) / 0.06); m.color.setRGB(0.55 + 1.4 * on, 0.55 + 1.35 * on, 0.52 + 1.15 * on); });
    this.eyeBeam.color.setRGB(0.4 + 2.0 * clamp01(lo * 4), 0.2 + 0.6 * clamp01(lo * 4), 0.1);
    // ---- hood ----
    this.hood.rotation.z = 1.0 * hoodOpen(t);
    // ---- disc vacuum ----
    const vp = vacPose(id, t); this.vac.visible = vp.visible; this.vac.position.set(...vp.p); this.vac.rotation.set(0, vp.yaw, 0);
    this.vacLed.color.setRGB(0.3, 1.6 + 0.6 * Math.sin(t * 6), 1.2);
    // ---- cast + effects ----
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
