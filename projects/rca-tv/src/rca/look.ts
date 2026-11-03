// Light + world look per place for the RCA television Short (palette accents: the Yesterday's Tomorrow kit).
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../engine/lights";
import type { Light } from "./story";

export const KIT = { ink: "#101418", cream: "#F1E8D6", paper: "#E9DEC6", teal: "#2A8C82", orange: "#E0702F", dim: "#8A8F8C", line: "#C9BC9C" };
const interior = (lit: [number, number, number], shade: [number, number, number]): LightPreset => ({
  ...LIGHTS.day, az: 125, el: 38, lit, shade, lift: [0.06, 0.05, 0.07], lambert: 0.4, sideK: 0.86, term: 0.25,
  charTint: [1.0, 0.96, 0.92], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.94, 0.92, 0.95],
  fog: "#e9dfcc", fogNear: 200, fogFar: 400, sunI: 2.4,
});
const sky = (c: string[]) => ({ c, e: [0, 3, 8, 16, 40] });
export const PRESET: Record<Light, LightPreset> = {
  fair: { ...LIGHTS.day, fogNear: 120, fogFar: 900 },
  home: interior([1.55, 1.38, 1.12], [0.46, 0.38, 0.44]),
  lab: { ...interior([1.1, 1.08, 1.05], [0.22, 0.24, 0.32]), fog: "#2c3438" },
  city: { ...LIGHTS.golden, el: 9, fogNear: 600, fogFar: 3200, fog: "#d79a7c" },
  track: { ...LIGHTS.day, fogNear: 150, fogFar: 1000 },
  street: { ...LIGHTS.golden, az: 160, el: 4, lit: [0.75, 0.62, 0.6], shade: [0.14, 0.15, 0.28], sunI: 2.0, fog: "#3a3f5c", fogNear: 120, fogFar: 600 },
};
export const WLOOK: Record<Light, WorldLook> = {
  fair: { ...LOOK.day },
  home: { ...LOOK.day, sky: sky(["#e9dfcc", "#e9dfcc", "#e9dfcc", "#e9dfcc", "#e9dfcc"]), sat: 1.0 },
  lab: { ...LOOK.day, sky: sky(["#2c3438", "#2c3438", "#2c3438", "#2c3438", "#2c3438"]), sat: 1.0 },
  city: { ...LOOK.golden },
  track: { ...LOOK.day },
  street: { ...LOOK.golden, sky: sky(["#c98a78", "#8f6f86", "#4f4f78", "#2c3458", "#1a2040"]), bounce: [0, 0, 0], sat: 1.0 },
};
export const GRADE_OF: Record<Light, string> = { fair: "warm40", home: "warm40", lab: "warm40", city: "dusk", track: "warm40", street: "dusk" };
