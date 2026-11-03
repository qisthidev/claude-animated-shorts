// Light + world look per mood. "day" and "dusk" start from the template's tuned day / golden presets; "space" (the
// 1969 moon) and "winter" (the 1936 lake, graded old) are ours. Palette accents follow the Yesterday's Tomorrow kit
// (tools/gfx.py: ink #101418, cream #F1E8D6, teal #2A8C82, orange #E0702F).
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../engine/lights";
import type { Light } from "./story";

export const KIT = { ink: "#101418", cream: "#F1E8D6", paper: "#E9DEC6", teal: "#2A8C82", orange: "#E0702F", dim: "#8A8F8C", line: "#C9BC9C" };

export const PRESET: Record<Light, LightPreset> = {
  day: { ...LIGHTS.day },
  dusk: {
    ...LIGHTS.golden, el: 6,
    top: "#3d4f7a", hor: "#f2a46a", fog: "#d9957a", fogNear: 60, fogFar: 520, sunDisc: "#ffc48a", sunI: 5.0,
  },
  space: {
    ...LIGHTS.day, az: 80, el: 12,
    lit: [1.75, 1.7, 1.62], shade: [0.07, 0.07, 0.1], lift: [0.015, 0.015, 0.03], lambert: 0.5, sideK: 0.9, term: 0.12,
    charTint: [1, 1, 1], charShade: 0.8, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.9, 0.9, 0.95],
    top: "#020306", hor: "#05070c", skyCurve: [0, 0, 0], fog: "#05070c", fogNear: 30000, fogFar: 40000, sunDisc: "#000000",
    sunCol: "#ffffff", sunI: 3.2, sky: "#20242c", ground: "#101114", hemiI: 0.15, bias: -0.0004, normalBias: 0.02,
  },
  winter: {
    ...LIGHTS.day, az: 120, el: 20,
    lit: [1.3, 1.28, 1.25], shade: [0.48, 0.5, 0.62], lift: [0.05, 0.06, 0.1], lambert: 0.3, sideK: 0.86, term: 0.35,
    charTint: [0.97, 0.96, 0.97], charShade: 0.9, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.93, 0.93, 0.97],
    top: "#8fa5b7", hor: "#cfd6d9", skyCurve: [0, 0.4, 0.6], fog: "#c9d1d5", fogNear: 160, fogFar: 900, sunDisc: "#000000",
    sunCol: "#f4f1ea", sunI: 2.0, sky: "#dde5ec", ground: "#a59c8c", hemiI: 0.6,
  },
};

export const WLOOK: Record<Light, WorldLook> = {
  day: {
    ...LOOK.day,
    // open sea, teal in the kit's direction: lighter near, deep blue at the horizon
    water: { near: "#1f97a2", mid: "#16739a", far: "#1d4f86", crest: "#86dde2", trough: "#0f4673", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
  },
  dusk: {
    ...LOOK.golden,
    sky: { c: ["#f4a86a", "#e58d6e", "#b9727e", "#6f5f86", "#2f3b66"], e: [0, 4, 10, 22, 45] },
  },
  space: {
    ...LOOK.day,
    sky: { c: ["#05070c", "#04060a", "#030409", "#020307", "#010205"], e: [0, 3, 8, 16, 40] },
    bounce: [0, 0, 0], sat: 1.0,
  },
  winter: {
    ...LOOK.day,
    sky: { c: ["#cfd6d9", "#c3cdd3", "#b1c0ca", "#9fb2c1", "#8aa1b4"], e: [0, 3, 8, 16, 40] },
    cloud: { lit: "#f3f2ee", mid: "#dde0e2", shade: "#c1c8d0" },
    bounce: [0, 0, 0], sat: 0.9,
  },
};
