// Missile Mail world: one three.js scene with five places (see story.ts). Built once, posed per frame from the
// story (pure function of shot id + frame). Original geometry, no external models: a toon submarine with a
// Regulus-type missile on a launcher, open sea, the Mayport air station, the moon in 1969, a frozen lake in 1936.
// Materials are the template's two-tone Lambert (shade.ts); character and effect cards use the template sprites.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "../engine/build";
import { ctex, rng, waterNear, waterFar, cloudHD } from "../engine/paint";
import { TONE, CHAR, LFB, twoTone, untone } from "../engine/shade";
import { NOINK } from "../engine/ink";
import { Pool, Actor, Fx } from "../engine/sprites";
import { PRESET, WLOOK, KIT } from "./look";
import { stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, V3, DECK, RAIL0, RAIL1, BASE_X, MOON_Z, LAKE_Z, PARK_AT, PO_AT, LAKE_C, LAKE_R, T_FIRE, T_HATCH,
  launchPose, cruisePos, arrivePos, rocketPose, dragPos, clamp01, smooth,
} from "./story";

type Mats = Record<string, THREE.Material>;
const TAU = Math.PI * 2;

// ---------------- painted textures ----------------
const envelopeStack = () => ctex("envStack2", 1024, 512, (g, r) => { // the bay seen face-on: overlapping covers, stamps, string
  g.fillStyle = "#2c2620"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 34; i++) {
    const x = -40 + (i % 7) * 160 + (r() - 0.5) * 40, y = -30 + Math.floor(i / 7) * 120 + (r() - 0.5) * 30, a = (r() - 0.5) * 0.35;
    g.save(); g.translate(x + 110, y + 70); g.rotate(a);
    g.fillStyle = ["#f6efdc", "#f1e7cf", "#f8f3e6", "#ece0c4"][Math.floor(r() * 4)]; g.fillRect(-110, -70, 220, 140);
    g.strokeStyle = "#3a3026"; g.lineWidth = 4; g.strokeRect(-110, -70, 220, 140);
    g.fillStyle = KIT.orange; g.fillRect(56, -58, 40, 46); g.strokeRect(56, -58, 40, 46);
    g.fillStyle = KIT.teal; g.fillRect(64, -50, 24, 30);
    g.strokeStyle = "rgba(40,40,60,0.7)"; g.lineWidth = 5;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-50, 4 + k * 22); g.lineTo(40 - k * 18, 4 + k * 22); g.stroke(); }
    g.restore();
  }
  g.fillStyle = "#c9a066"; g.fillRect(0, 240, 1024, 12); g.fillRect(500, 0, 12, 512); // string around the bundle
});
const asphalt = () => ctex("asphalt", 512, 512, (g, r) => {
  g.fillStyle = "#62666a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(20,20,20,0.18)"; g.lineWidth = 2; g.beginPath(); g.moveTo(r() * 512, r() * 512); g.lineTo(r() * 512, r() * 512); g.stroke(); }
});
const runwayMarks = () => ctex("runwayMarks", 1024, 128, (g) => { // centre dashes + edge lines, tiled along x
  g.clearRect(0, 0, 1024, 128);
  g.fillStyle = "#f1ece0"; g.fillRect(0, 4, 1024, 5); g.fillRect(0, 119, 1024, 5);
  for (let i = 0; i < 4; i++) g.fillRect(40 + i * 256, 60, 150, 8);
});
const grassT = () => ctex("baseGrass", 512, 512, (g, r) => {
  g.fillStyle = "#7b9457"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const c = ["#718c4f", "#859d5f", "#7a9352", "#8ea566"][Math.floor(r() * 4)]; g.fillStyle = c; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 16, 3 + r() * 8, r() * 3, 0, TAU); g.fill(); }
});
const sandT = () => ctex("sand", 256, 256, (g, r) => { g.fillStyle = "#e4d2a0"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? "#d9c58f" : "#efe0b4"; g.fillRect(r() * 256, r() * 256, 2, 2); } });
const moonT = () => ctex("moonGround", 1024, 1024, (g, r) => {
  g.fillStyle = "#9b9890"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 4, 2 + r() * 4); }
  for (let i = 0; i < 70; i++) { // craters: dark bowl, lit rim on the sun side
    const x = r() * 1024, y = r() * 1024, rad = 6 + r() ** 3 * 70;
    g.fillStyle = "rgba(60,58,54,0.35)"; g.beginPath(); g.ellipse(x, y, rad, rad * 0.85, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(225,222,214,0.45)"; g.lineWidth = Math.max(1.5, rad * 0.12); g.beginPath(); g.ellipse(x, y, rad, rad * 0.85, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  }
});
const earthT = () => ctex("earth", 512, 512, (g, r) => {
  g.fillStyle = "#2f6fb6"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) { g.fillStyle = r() < 0.6 ? "#5f9a4c" : "#b89b62"; g.beginPath(); g.ellipse(r() * 512, 80 + r() * 352, 20 + r() * 70, 14 + r() * 40, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(255,255,255,0.75)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 4 + r() * 10, r() * 0.6, 0, TAU); g.fill(); }
});
const iceT = () => ctex("ice", 1024, 1024, (g, r) => {
  g.fillStyle = "#c3d6df"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(150,180,200,0.18)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 160, 10 + r() * 40, r() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = "rgba(70,100,125,0.6)"; g.lineWidth = 2.2;
  for (let i = 0; i < 26; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
});
const frostGround = () => ctex("frost", 512, 512, (g, r) => {
  g.fillStyle = "#958668"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const c = ["#a59779", "#86785c", "#c9c2b2", "#7d6f55"][Math.floor(r() * 4)]; g.fillStyle = c; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 12, 2 + r() * 6, r() * 3, 0, TAU); g.fill(); }
});
const clapboard = () => ctex("clapboard", 256, 256, (g) => {
  g.fillStyle = "#ece6d8"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, y + 13, 256, 3); }
});
const signT = (key: string, text: string, sub: string) => ctex(key, 1024, 256, (g) => {
  g.fillStyle = "#f3eee2"; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#2b2b2b"; g.lineWidth = 12; g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = "#1f2a2e"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "700 92px Georgia, serif"; g.fillText(text, 512, sub ? 104 : 128, 960);
  if (sub) { g.font = "600 56px Georgia, serif"; g.fillText(sub, 512, 196, 960); }
});
const flagUS = () => ctex("flagUS", 384, 200, (g) => { // simplified stars and stripes
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f1ea" : "#b8323a"; g.fillRect(0, (i * 200) / 13, 384, 200 / 13 + 1); }
  g.fillStyle = "#2c3e73"; g.fillRect(0, 0, 160, (7 * 200) / 13);
  g.fillStyle = "#f4f1ea"; for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) { g.beginPath(); g.arc(14 + x * 26 + (y % 2) * 13, 12 + y * 21, 3.4, 0, TAU); g.fill(); }
});
const discT = () => ctex("disc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 52, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const moonDiscT = () => ctex("moonDisc", 256, 256, (g, r) => {
  g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(128, 128, 120, 0, TAU); g.fill();
  for (let i = 0; i < 12; i++) { g.fillStyle = "rgba(170,160,140,0.35)"; g.beginPath(); g.arc(70 + r() * 120, 70 + r() * 120, 8 + r() * 26, 0, TAU); g.fill(); }
});
const haloT = () => ctex("halo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128, a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- geometry helpers ----------------
/** lathe profile given as [radius, y] pairs, revolved about Y, then laid along +X (y -> x) */
const latheX = (pts: [number, number][], seg = 40) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
};
/** flat shape extruded `th` thick (centered), shape in its own XY plane */
const plate = (pts: [number, number][], th: number) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false });
  g.translate(0, 0, -th / 2);
  return g;
};
const cyl = (r0: number, r1: number, h: number, seg = 16) => new THREE.CylinderGeometry(r0, r1, h, seg);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));
/** box-section beam between two points */
const beam = (a: THREE.Vector3, b: THREE.Vector3, w: number, h = w) => {
  const g = new THREE.BoxGeometry(w, a.distanceTo(b), h);
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1));
  g.applyMatrix4(m);
  return g;
};
const ellipseFlat = (rx: number, rz: number, y: number, seg = 96) => {
  const g = new THREE.CircleGeometry(1, seg); g.rotateX(-Math.PI / 2); g.scale(rx, 1, rz); g.translate(0, y, 0);
  return g;
};
const flatQuad = (x0: number, x1: number, z0: number, z1: number, y: number, tu = 1, tv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tu, uv.getY(i) * tv);
  return g;
};

// ---------------- water (template river shader, open sea colours) ----------------
const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.25 * wTime, 0.12 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 16.0), texture2D(wFarTex, wp / 70.0 + 0.37), smoothstep(30.0, 140.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.45);
  wc = mix(wc, wCrest, mk.r * 0.42);
  wc = mix(wc, wGlint, mk.b * (0.2 + 0.35 * wf));
  diffuseColor.rgb = wc;`;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private water: THREE.Mesh;
  private sunCache = new Map<number, THREE.Vector3>();
  private G: Record<string, THREE.Group> = {};
  private clouds: THREE.Mesh[] = [];
  private cloudMaps: Record<string, THREE.Texture[]>;
  private flightClouds: THREE.Mesh[] = [];
  private stars: THREE.Points;
  private moonSprite: THREE.Sprite; private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  // movers
  private missile = new THREE.Group(); private boosters = new THREE.Group(); private hatch = new THREE.Group(); private flames: THREE.Mesh[] = [];
  private bay: THREE.Mesh;
  private dolly = new THREE.Group();
  private rockets: THREE.Group[] = [];
  private ropes: THREE.Mesh[] = [];
  private flagMeshes: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root, M: Mats = {};
    // ---- sky (5 stops by elevation, tone-map inverted), sun disc + halo, moon disc ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discT(), color: new THREE.Color(5, 3.6, 2.0), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT(), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonDiscT(), color: new THREE.Color(1.6, 1.55, 1.45), fog: false, depthWrite: false, transparent: true }));
    for (const s of [this.sunDisc, this.sunHalo, this.moonSprite]) { s.frustumCulled = false; s.layers.set(NOINK); R.add(s); }
    this.sunDisc.renderOrder = -0.5; this.moonSprite.renderOrder = -0.4; this.sunHalo.renderOrder = 5;
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    // stars (space only)
    { const r = rng(7), pos: number[] = [];
      for (let i = 0; i < 1400; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); pos.push(950 * s * Math.cos(a), 950 * Math.abs(u) * 0.9 + 20, 950 * s * Math.sin(a)); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(2.2, 2.2, 2.4), size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false }));
      this.stars.layers.set(NOINK); this.stars.frustumCulled = false; R.add(this.stars); }
    // clouds: a ring re-centred on each shot's camera, plus a field the cruising missile flies through
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, WLOOK.day.cloud)), dusk: [0, 1, 2, 3].map((k) => cloudHD(k, WLOOK.dusk.cloud)), winter: [0, 1, 2, 3].map((k) => cloudHD(k, WLOOK.winter.cloud)) };
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    { const r = rng(3);
      for (let i = 0; i < 26; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.15, 1.15, 1.15), transparent: true, depthWrite: false, fog: true }));
        const w = 40 + r() * 50, side = r() < 0.5 ? -1 : 1;
        m.position.set(-300 - i * 95 - r() * 40, 48 + r() * 40, side * (25 + r() * 90)); m.scale.set(w, w / 2, 1);
        m.layers.set(NOINK); this.flightClouds.push(m); R.add(m);
      } }

    // ---- sea (follows the camera; world-space marks so it never swims) ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    this.water = new THREE.Mesh(flatQuad(-2500, 2500, -2500, 2500, 0), waterM);
    this.water.receiveShadow = true; R.add(this.water);

    // ---- materials (two-tone) ----
    M.hull = lam("mm_hull", () => ({ color: "#3e4954" }));
    M.hullDark = lam("mm_hullDark", () => ({ color: "#2b333b" }));
    M.deck = lam("mm_deck", () => ({ color: "#6d665c" }));
    M.boot = lam("mm_boot", () => ({ color: "#8f3b33" }));
    M.cream = lam("mm_cream", () => ({ color: "#efe6cf" }));
    M.orange = lam("mm_orange", () => ({ color: KIT.orange }));
    M.teal = lam("mm_teal", () => ({ color: KIT.teal }));
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#8d949c", specular: "#9a9a9a", shininess: 40 }), 0.15);
    M.dark = lam("mm_dark", () => ({ color: "#22282e" }));
    M.letters = lam("mm_letters", () => ({ map: envelopeStack() }));
    M.grass = lam("mm_grass", () => ({ map: (() => { const t = grassT(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.sand = lam("mm_sand", () => ({ map: (() => { const t = sandT(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.asphalt = lam("mm_asphalt", () => ({ map: (() => { const t = asphalt(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.wallCream = lam("mm_wallCream", () => ({ color: KIT.paper }));
    M.glass = lam("mm_glass", () => ({ color: "#8fc6c2" }));
    M.trunk = lam("mm_trunk", () => ({ color: "#8a6a48" }));
    M.palm = lam("mm_palm", () => ({ color: "#4f9150" }));
    M.moon = lam("mm_moon", () => ({ map: (() => { const t = moonT(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#d9ac45", specular: "#fff0b0", shininess: 70 }), 0.15);
    M.lmGrey = lam("mm_lmGrey", () => ({ color: "#c9ccce" }));
    M.ice = lam("mm_ice", () => ({ map: (() => { const t = iceT(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.frost = lam("mm_frost", () => ({ map: (() => { const t = frostGround(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.bark = lam("mm_bark", () => ({ color: "#4e3d33" }));
    M.pine = lam("mm_pine", () => ({ color: "#3d5a48" }));
    M.clap = lam("mm_clap", () => ({ map: (() => { const t = clapboard(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() }));
    M.roofGrey = lam("mm_roofGrey", () => ({ color: "#5c5f66" }));
    M.rocketRed = lam("mm_rocketRed", () => ({ color: "#b5452f" }));
    M.rope = lam("mm_rope", () => ({ color: "#a88a5c" }));
    const signPO = new THREE.MeshLambertMaterial({ map: signT("signPO", "POST OFFICE", "HEWITT, N.J.") }); twoTone(signPO);
    const signNAS = new THREE.MeshLambertMaterial({ map: signT("signNAS", "NAVAL AUXILIARY AIR STATION", "MAYPORT, FLA.") }); twoTone(signNAS);
    const flagM = new THREE.MeshLambertMaterial({ map: flagUS(), side: THREE.DoubleSide }); twoTone(flagM);

    // ================= SEA: the submarine =================
    const sub = (this.G.sub = new THREE.Group()); R.add(sub);
    { const b = new Batch();
      // hull: long lathe, axis along x, bow at +x; hull centre below the waterline so the deck rides 2.35 m up
      b.add(latheX([[0.05, -32], [1.4, -29.5], [2.7, -25], [3.35, -17], [3.4, 0], [3.35, 18], [2.9, 25], [1.9, 29.4], [0.7, 31.6], [0.05, 32]], 48), M.hull, at(0, -1.12, 0));
      b.add(boxGeo(V(-27, 2.0, -1.45), V(27.5, DECK, 1.45)), M.deck);
      // sail with a rounded front, bridge cap, masts
      b.add(boxGeo(V(3.5, DECK, -1.35), V(13.2, 7.3, 1.35)), M.hull);
      b.add(cyl(1.35, 1.35, 7.3 - DECK, 24), M.hull, at(13.2, (DECK + 7.3) / 2, 0));
      b.add(boxGeo(V(3.3, 7.3, -1.5), V(13.6, 7.55, 1.5)), M.hullDark);
      for (const [x, h, r] of [[8, 10.9, 0.13], [9.4, 10.3, 0.11], [6.4, 9.6, 0.09]] as const) b.add(cyl(r, r, h - 7.3, 10), M.steel, at(x, (7.3 + h) / 2, 0));
      // hangar: half-buried cylinder aft of the sail, open door aft
      const hg = cyl(2.0, 2.0, 9.5, 32); hg.rotateZ(Math.PI / 2); b.add(hg, M.hull, at(-8.6, DECK - 0.45, 0));
      const door = new THREE.CircleGeometry(1.85, 32); door.rotateY(-Math.PI / 2); b.add(door, M.dark, at(-13.37, DECK - 0.45, 0));
      // launcher rail rising aft + supports
      b.add(beam(V(...RAIL0), V(...RAIL1), 0.4, 0.3), M.steel);
      for (const k of [0.15, 0.85]) {
        const p = V(...RAIL0).lerp(V(...RAIL1), k);
        for (const s of [-1, 1]) b.add(beam(V(p.x, DECK, s * 0.75), V(p.x, p.y - 0.1, s * 0.12), 0.16), M.steel);
      }
      // deck stanchions + lifeline aft
      for (let x = -26; x <= -12; x += 2) for (const s of [-1, 1]) b.add(cyl(0.03, 0.03, 0.9, 6), M.steel, at(x, DECK + 0.45, s * 1.38));
      for (const s of [-1, 1]) b.add(beam(V(-26, DECK + 0.88, s * 1.38), V(-12, DECK + 0.88, s * 1.38), 0.03), M.steel);
      b.build(sub);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.68), flagM); flag.position.set(3.85, 8.6, 0);
      const pole = new THREE.Mesh(cyl(0.035, 0.035, 1.6, 6), M.steel); pole.position.set(4.5, 8.1, 0);
      sub.add(flag, pole); this.flagMeshes.push(flag);
    }
    // distant coastline for the aerial (hazy in the fog)
    { const coast = (this.G.coast = new THREE.Group()); R.add(coast);
      const b = new Batch();
      b.add(flatQuad(-3000, 3000, -1500, -760, 1.6, 120, 15), M.grass);
      b.add(flatQuad(-3000, 3000, -760, -730, 0.6, 400, 4), M.sand);
      const r = rng(11); for (let i = 0; i < 60; i++) { const x = -1500 + i * 50 + r() * 30, h = 4 + r() * 6; b.add(new THREE.SphereGeometry(h, 10, 8), M.palm, at(x, 1.6 + h * 0.4, -800 - r() * 120, 0, 0, 0, [1.6, 0.6, 1.2])); }
      b.build(coast, false); }

    // ================= the missile (Regulus-type, our own toon design) =================
    { const b = new Batch();
      b.add(latheX([[0.28, -5], [0.46, -4.5], [0.56, -2.4], [0.56, 2.6], [0.5, 3.8], [0.44, 4.6], [0.43, 5.0]], 40), M.cream);
      b.add(latheX([[0.567, 2.75], [0.567, 3.25]], 40), M.orange);
      b.add(latheX([[0.47, -4.38], [0.47, -4.12]], 40), M.orange);
      const lip = new THREE.TorusGeometry(0.4, 0.06, 10, 32); lip.rotateY(Math.PI / 2); b.add(lip, M.steel, at(5.0, 0, 0));
      const mouth = new THREE.CircleGeometry(0.38, 32); mouth.rotateY(Math.PI / 2); b.add(mouth, M.dark, at(4.97, 0, 0));
      // swept wings (left + right) and the fin
      for (const s of [-1, 1]) { const w = plate([[1.2, 0], [-1.7, 0], [-3.0, 2.9], [-1.9, 2.9]], 0.09); w.rotateX(s * Math.PI / 2); b.add(w, M.teal, at(0, -0.05, s * 0.42)); }
      const fin = plate([[-2.5, 0], [-4.75, 0], [-5.05, 1.75], [-4.15, 1.75]], 0.08); b.add(fin, M.teal, at(0, 0.42, 0));
      // the mail bay frame around the hatch opening (+z flank)
      b.add(boxGeo(V(1.58, -0.33, -0.6), V(2.92, 0.33, -0.47)), M.dark); // local -z = world +z once the missile faces -x
      b.build(this.missile);
      this.bay = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.56), M.letters); this.bay.position.set(2.25, 0, -0.605); this.bay.rotation.y = Math.PI; this.missile.add(this.bay);
      // hatch door hinged on its top edge
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.7, 0.05), M.cream); d.position.set(0, -0.35, 0); this.hatch.add(d);
      this.hatch.position.set(2.25, 0.35, -0.62); this.missile.add(this.hatch);
      // boosters (two, under the tail) + flames
      const bb = new Batch();
      for (const s of [-1, 1]) {
        const c = cyl(0.21, 0.21, 2.6, 16); c.rotateZ(Math.PI / 2); bb.add(c, M.steel, at(-3.0, -0.66, s * 0.33));
        const n = cyl(0.25, 0.16, 0.35, 16); n.rotateZ(Math.PI / 2); bb.add(n, M.dark, at(-4.45, -0.66, s * 0.33));
        const cap = new THREE.ConeGeometry(0.21, 0.4, 16); cap.rotateZ(-Math.PI / 2); bb.add(cap, M.orange, at(-1.5, -0.66, s * 0.33));
      }
      bb.build(this.boosters); this.missile.add(this.boosters);
      for (const s of [-1, 1]) {
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.26, 2.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.2, 1.0), fog: false }));
        fl.rotation.z = Math.PI / 2; fl.position.set(-5.85, -0.66, s * 0.33); fl.layers.set(NOINK); this.flames.push(fl); this.missile.add(fl);
      }
      this.missile.rotation.order = "YZX";
      this.missile.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      R.add(this.missile);
      // ground dolly at Mayport
      const db = new Batch();
      db.add(boxGeo(V(-2.6, 0.35, -0.5), V(2.6, 0.55, 0.5)), M.orange);
      for (const x of [-2.1, 2.1]) for (const s of [-1, 1]) { const w = cyl(0.3, 0.3, 0.18, 16); w.rotateX(Math.PI / 2); db.add(w, M.dark, at(x, 0.3, s * 0.6)); }
      for (const x of [-1.6, 1.6]) db.add(boxGeo(V(x - 0.2, 0.55, -0.45), V(x + 0.2, 0.95, 0.45)), M.steel);
      db.build(this.dolly); this.dolly.position.set(...PARK_AT); R.add(this.dolly);
    }

    // ================= BASE: Mayport naval air station =================
    const base = (this.G.base = new THREE.Group()); R.add(base);
    { const b = new Batch(), X = BASE_X;
      b.add(flatQuad(X - 700, X + 118, -500, 500, 0.32, 80, 100), M.grass);
      b.add(flatQuad(X + 118, X + 150, -500, 500, 0.16, 4, 60), M.sand);
      b.add(flatQuad(X - 520, X + 80, -16, 16, 0.36, 60, 3), M.asphalt);
      b.add(flatQuad(X - 140, X - 10, -60, -16, 0.355, 13, 4.4), M.asphalt);
      // hangar: cream walls, teal barrel roof, dark open door facing the runway
      b.add(boxGeo(V(X - 110, 0.3, -86), V(X - 66, 9.5, -58)), M.wallCream);
      const roof = cyl(14, 14, 44, 32, ); roof.rotateZ(Math.PI / 2); b.add(roof, M.teal, at(X - 88, 9.5, -72, 0, 0, 0, [1, 0.42, 1]));
      b.add(boxGeo(V(X - 104, 0.3, -58.05), V(X - 72, 8.2, -57.9)), M.dark);
      for (const x of [X - 104, X - 96, X - 80, X - 72]) b.add(boxGeo(V(x - 0.15, 0.3, -57.95), V(x + 0.15, 8.4, -57.6)), M.wallCream);
      // control tower
      b.add(boxGeo(V(X - 40, 0.3, -46), V(X - 34, 13, -40)), M.wallCream);
      b.add(boxGeo(V(X - 41.2, 13, -47.2), V(X - 32.8, 16, -38.8)), M.glass);
      b.add(boxGeo(V(X - 41.8, 16, -47.8), V(X - 32.2, 16.6, -38.2)), M.dark);
      for (let i = 0; i < 4; i++) b.add(boxGeo(V(X - 41.25 + i * 2.8, 13, -38.85), V(X - 41.05 + i * 2.8, 16, -38.75)), M.wallCream);
      // palms
      const r = rng(5);
      const palm = (x: number, z: number, h: number) => {
        const lean = (r() - 0.5) * 0.3;
        for (let k = 0; k < 5; k++) b.add(cyl(0.28 - k * 0.03, 0.31 - k * 0.03, h / 5 + 0.05, 10), M.trunk, at(x + lean * k * h / 5, 0.3 + (k + 0.5) * h / 5, z, 0, 0, -lean));
        const tx = x + lean * h, ty = 0.3 + h;
        for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + r(); const f = new THREE.SphereGeometry(1, 10, 6); b.add(f, M.palm, at(tx + Math.cos(a) * 1.7, ty - 0.35, z + Math.sin(a) * 1.7, 0, -a, 0.45, [2.1, 0.16, 0.55])); }
      };
      for (const [x, z] of [[-22, 26], [-14, 30], [-44, 34], [8, 28], [30, 30], [-60, -30], [-126, -40], [-130, -70], [60, -36], [86, 24], [104, -14]] as const) palm(X + x, z, 6 + r() * 3);
      // windsock + flagpole
      b.add(cyl(0.08, 0.08, 7, 8), M.steel, at(X + 20, 3.8, -24));
      const sock = new THREE.ConeGeometry(0.55, 2.4, 16, 1, true); sock.rotateZ(Math.PI / 2); b.add(sock, M.orange, at(X + 18.6, 7.0, -24));
      b.add(cyl(0.07, 0.07, 11, 8), M.steel, at(X - 58, 5.8, -40));
      b.build(base);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.36), flagM); fl.position.set(X - 56.6, 10.4, -40); base.add(fl); this.flagMeshes.push(fl);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signNAS); sign.position.set(X - 88, 11.3, -57.4); base.add(sign);
    }

    // ================= MOON (1969) =================
    const moon = (this.G.moon = new THREE.Group()); R.add(moon);
    { const b = new Batch(), Z = MOON_Z;
      b.add(flatQuad(-400, 400, Z - 400, Z + 400, 0, 26, 26), M.moon);
      const r = rng(9);
      for (let i = 0; i < 14; i++) { const t = new THREE.TorusGeometry(2 + r() * 7, 0.35 + r() * 0.4, 8, 32); t.rotateX(-Math.PI / 2); b.add(t, M.moon, at(-60 + r() * 120, 0, Z - 70 + r() * 60, 0, 0, 0, [1, 0.35, 1])); }
      for (let i = 0; i < 40; i++) { const s = 0.08 + r() ** 2 * 0.5; b.add(new THREE.IcosahedronGeometry(s, 0), M.moon, at(-20 + r() * 40, s * 0.3, Z - 20 + r() * 34)); }
      // lander: gold descent stage, four legs, grey ascent stage
      b.add(cyl(1.55, 1.55, 1.4, 8), M.gold, at(0, 1.55, Z));
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4, fx = Math.cos(a), fz = Math.sin(a);
        b.add(beam(V(fx * 1.2, 1.6, Z + fz * 1.2), V(fx * 2.7, 0.15, Z + fz * 2.7), 0.12), M.steel);
        b.add(cyl(0.38, 0.42, 0.12, 16), M.steel, at(fx * 2.75, 0.07, Z + fz * 2.75)); }
      b.add(boxGeo(V(-1.15, 2.25, Z - 1.0), V(1.15, 3.6, Z + 1.0)), M.lmGrey);
      b.add(boxGeo(V(-0.55, 2.7, Z + 0.98), V(0.55, 3.25, Z + 1.03)), M.dark);
      b.add(cyl(0.05, 0.05, 1.0, 6), M.steel, at(0.4, 4.1, Z));
      // flag pole
      b.add(cyl(0.035, 0.035, 2.3, 8), M.steel, at(3.2, 1.15, Z + 2.0));
      b.add(cyl(0.025, 0.025, 1.1, 6), M.steel, at(3.75, 2.25, Z + 2.0, 0, 0, Math.PI / 2));
      b.build(moon);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62), flagM); fl.position.set(3.76, 1.94, Z + 2.0); moon.add(fl);
      const earth = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 24), lam("mm_earth", () => ({ map: earthT() })));
      earth.position.set(-400, 160, Z - 530); earth.layers.set(NOINK); moon.add(earth);
    }

    // ================= LAKE (1936) =================
    const lake = (this.G.lake = new THREE.Group()); R.add(lake);
    { const b = new Batch(), Z = LAKE_Z;
      b.add(flatQuad(-500, 500, Z - 450, Z + 300, 0.5, 50, 38), M.frost);
      b.add(ellipseFlat(LAKE_R[0], LAKE_R[1], 0.53), M.ice, at(LAKE_C[0], 0, LAKE_C[2]));
      const rim = new THREE.TorusGeometry(1, 0.012, 6, 96); rim.rotateX(-Math.PI / 2); b.add(rim, M.frost, at(LAKE_C[0], 0.52, LAKE_C[2], 0, 0, 0, [LAKE_R[0] + 0.6, 40, LAKE_R[1] + 0.6]));
      // the post office: clapboard house, gable roof, porch, sign, flagpole
      const [px, py, pz] = PO_AT;
      b.add(boxGeo(V(px - 4, py, pz - 3.5), V(px + 4, py + 4.2, pz + 3.5)), M.clap);
      const gi = new THREE.BufferGeometry(); // gable roof, ridge along x, flat-shaded
      gi.setAttribute("position", new THREE.Float32BufferAttribute([-4.3, 0, -3.9, -4.3, 0, 3.9, -4.3, 2.6, 0, 4.3, 0, -3.9, 4.3, 0, 3.9, 4.3, 2.6, 0], 3));
      gi.setIndex([0, 1, 2, 3, 5, 4, 1, 4, 5, 1, 5, 2, 0, 2, 5, 0, 5, 3]);
      const gable = gi.toNonIndexed(); gable.computeVertexNormals();
      b.add(gable, M.roofGrey, at(px, py + 4.2, pz));
      b.add(boxGeo(V(px + 3.95, py, pz - 0.7), V(px + 4.05, py + 2.3, pz + 0.7)), M.dark);
      for (const s of [-1, 1]) b.add(boxGeo(V(px + 3.95, py + 1.3, pz + s * 2.3 - 0.6), V(px + 4.05, py + 2.6, pz + s * 2.3 + 0.6)), M.glass);
      b.add(cyl(0.06, 0.06, 7, 8), M.steel, at(px + 6.5, py + 3.5, pz + 4.5));
      // trees: bare deciduous + a few pines around the shore
      const r = rng(21);
      const bare = (x: number, z: number, h: number) => {
        b.add(cyl(0.12, 0.22, h, 8), M.bark, at(x, 0.5 + h / 2, z));
        for (let i = 0; i < 5; i++) { const a = r() * TAU, l = h * (0.3 + r() * 0.25), y = 0.5 + h * (0.45 + r() * 0.45);
          b.add(beam(V(x, y, z), V(x + Math.cos(a) * l, y + l * 0.7, z + Math.sin(a) * l), 0.07), M.bark); }
      };
      const pine = (x: number, z: number, h: number) => { b.add(cyl(0.12, 0.15, h * 0.25, 6), M.bark, at(x, 0.5 + h * 0.12, z)); for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(h * (0.3 - k * 0.07), h * 0.4, 9), M.pine, at(x, 0.5 + h * (0.35 + k * 0.2), z)); };
      for (let i = 0; i < 70; i++) {
        const a = r() * TAU, k = 1.15 + r() * 0.9, x = LAKE_C[0] + Math.cos(a) * LAKE_R[0] * k, z = LAKE_C[2] + Math.sin(a) * LAKE_R[1] * k;
        if (Math.hypot(x - px, z - pz) < 10) continue;
        if (z > LAKE_C[2] + LAKE_R[1] * 0.9 && Math.abs(x) < 60) continue; // keep the near shore clear for the cameras
        (r() < 0.65 ? bare : pine)(x, z, 5 + r() * 6);
      }
      b.build(lake);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), signPO); sign.position.set(px + 4.08, py + 3.1, pz); sign.rotation.y = Math.PI / 2; lake.add(sign);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.84), flagM); fl.position.set(px + 7.35, py + 6.4, pz + 4.5); lake.add(fl); this.flagMeshes.push(fl);
      // the two 1936 mail rockets: red body, cream nose, small wings and fins
      for (let k = 0; k < 2; k++) {
        const g = new THREE.Group(), rb = new Batch();
        rb.add(latheX([[0.05, -1.0], [0.17, -0.9], [0.18, 0.5], [0.12, 0.85], [0.02, 1.05]], 20), M.rocketRed);
        rb.add(latheX([[0.125, 0.55], [0.125, 0.8]], 20), M.cream);
        for (const s of [-1, 1]) { const w = plate([[0.3, 0], [-0.3, 0], [-0.55, 0.75], [-0.3, 0.75]], 0.03); w.rotateX(s * Math.PI / 2); rb.add(w, M.cream, at(0, 0, s * 0.15)); }
        for (let i = 0; i < 3; i++) { const f = plate([[-0.55, 0], [-1.0, 0], [-1.08, 0.36], [-0.86, 0.36]], 0.025); rb.add(f, M.teal, at(0, 0, 0, (i / 3) * TAU)); }
        rb.build(g); g.rotation.order = "YZX"; g.scale.setScalar(1.6); lake.add(g); this.rockets.push(g);
      }
      for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(cyl(0.022, 0.022, 1, 6), M.rope); m.castShadow = true; lake.add(m); this.ropes.push(m); }
    }
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.layers.isEnabled(NOINK) && m !== this.water) { m.castShadow = m.castShadow || false; m.receiveShadow = true; } });
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private shotSun(s: ShotDef) {
    let v = this.sunCache.get(s.id);
    if (v) return v;
    const L = PRESET[s.light];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = s.cam(f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = PRESET[s.light], K = WLOOK[s.light];
    const c = s.cam(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig ----
    const sunDir = this.shotSun(s);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.2 + 8, 12, 120);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = s.fogFar ?? L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const dusk = s.light === "dusk";
    this.sunDisc.visible = this.sunHalo.visible = dusk;
    if (dusk) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(22)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.2);
    }
    // the moon hangs where the Postmaster looks (dusk shots), up and a little right of the look direction
    this.moonSprite.visible = dusk;
    if (dusk) {
      const d = V(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(), right = V(-d.z, 0, d.x);
      const dir = d.clone().multiplyScalar(0.9).addScaledVector(right, 0.12).add(V(0, 0.62, 0)).normalize();
      this.moonSprite.position.copy(cam.position).addScaledVector(dir, 900); this.moonSprite.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(2.2)));
    }
    this.stars.visible = s.light === "space"; this.stars.position.copy(cam.position);
    // ---- places ----
    const P = s.place;
    this.G.sub.visible = P === "sea" || P === "air";
    this.G.coast.visible = P === "sea";
    this.G.base.visible = P === "base";
    this.G.moon.visible = P === "moon";
    this.G.lake.visible = P === "lake";
    this.water.visible = P === "sea" || P === "air" || P === "base";
    this.water.position.set(Math.round(cam.position.x / 50) * 50, 0, Math.round(cam.position.z / 50) * 50);
    const wc = K.water, W = this.WU;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value); W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // clouds: ring around this shot's opening camera (frozen per shot, so it never swims)
    const c0 = s.cam(s.a), showClouds = s.light === "day" || s.light === "dusk" || s.light === "winter";
    const maps = this.cloudMaps[s.light] ?? this.cloudMaps.day;
    this.clouds.forEach((m, i) => {
      m.visible = showClouds && P !== "lake";
      const a = (i / 9) * TAU + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      m.position.set(c0.pos[0] + Math.cos(a) * d, 110 + (i % 4) * 36, c0.pos[2] + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = maps[i % 4];
    });
    for (const m of this.flightClouds) { m.visible = P === "air"; m.lookAt(cam.position.x, m.position.y, cam.position.z); }
    for (const fl of this.flagMeshes) { fl.rotation.z = 0.04 * Math.sin(t * 3 + fl.position.x); }
    // ---- the missile ----
    this.poseMissile(id, t);
    // ---- 1936 rockets + ropes ----
    this.rockets.forEach((g, k) => {
      const r = rocketPose(k, t);
      g.visible = P === "lake" && id >= 13;
      g.position.set(...r.p); g.rotation.set(r.roll, Math.PI, r.pitch);
      if (id >= 15) { const st = rocketPose(k, 99); g.position.set(...st.p); g.rotation.set(st.roll, Math.PI, st.pitch); }
    });
    const pm = dragPos(t), bagsShown = id >= 15;
    this.ropes.forEach((m, k) => {
      m.visible = bagsShown && id === 15;
      if (!m.visible) return;
      const hand = V(pm[0] + 0.3, 1.25, pm[2] + 0.05), bag = V(pm[0] + 0.95 + k * 0.75, 1.15, pm[2] + (k ? 0.35 : -0.2));
      m.position.copy(hand).add(bag).multiplyScalar(0.5); m.scale.set(1, hand.distanceTo(bag), 1);
      m.quaternion.setFromUnitVectors(V(0, 1, 0), bag.clone().sub(hand).normalize());
    });
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++), [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = s.light === "dusk" || s.light === "space";
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw); e2.use(!!p.soft);
      e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }

  private poseMissile(id: number, t: number) {
    const m = this.missile, s = SHOTS[id - 1];
    m.visible = true; this.boosters.visible = true; this.dolly.visible = false;
    for (const fl of this.flames) fl.visible = false;
    let hatchOpen = 1;
    if (s.place === "sea" && id <= 4) {
      const r = launchPose(0); m.position.set(...r.p); m.rotation.set(0, Math.PI, r.pitch);
      hatchOpen = id < 4 ? 1 : 1 - smooth((t - T_HATCH) / 0.45);
    } else if (id === 5) {
      const r = launchPose(t); m.position.set(...r.p); m.rotation.set(0, Math.PI, r.pitch);
      hatchOpen = 0;
      const on = t >= T_FIRE;
      this.flames.forEach((fl, k) => { fl.visible = on; const flick = 1 + 0.18 * Math.sin(t * 61 + k * 2.1) + 0.1 * Math.sin(t * 97); fl.scale.set(1, on ? flick * (0.7 + 0.5 * clamp01((t - T_FIRE) / 0.15)) : 1, 1); fl.position.x = -4.65 - 1.2 * fl.scale.y; });
    } else if (id === 6) {
      const p = cruisePos(t), p2 = cruisePos(t + 0.05);
      m.position.set(...p); m.rotation.set(0.04 * Math.sin(t * 0.9), Math.atan2(-(p2[2] - p[2]), p2[0] - p[0]), 0.02);
      this.boosters.visible = false; hatchOpen = 0;
    } else if (id === 7) {
      const p = arrivePos(s.a / FPS, t); m.position.set(...p); m.rotation.set(0, Math.PI, -0.06);
      this.boosters.visible = false; hatchOpen = 0;
    } else if (s.place === "base") {
      m.position.set(PARK_AT[0], 1.6, PARK_AT[2]); m.rotation.set(0, Math.PI, 0);
      this.boosters.visible = false; this.dolly.visible = true; hatchOpen = 1;
    } else m.visible = false;
    this.hatch.rotation.x = 1.75 * hatchOpen;    // hinge on the top edge, swings up and out (toward world +z)
    this.bay.visible = hatchOpen > 0.02;
  }
}
