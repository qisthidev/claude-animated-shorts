// Light + world look per place for Robot Butler. Interiors: a warm key from camera-left through the open side,
// two-tone shading from the template. Palette accents: the Yesterday's Tomorrow kit.
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../engine/lights";
import type { Light } from "./story";

export const KIT = { ink: "#101418", cream: "#F1E8D6", paper: "#E9DEC6", teal: "#2A8C82", orange: "#E0702F", dim: "#8A8F8C", line: "#C9BC9C" };
const interior = (lit: [number, number, number], shade: [number, number, number]): LightPreset => ({
  ...LIGHTS.day, az: 125, el: 38, lit, shade, lift: [0.06, 0.05, 0.07], lambert: 0.4, sideK: 0.86, term: 0.25,
  charTint: [1.0, 0.96, 0.92], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.94, 0.92, 0.95],
  fog: "#e9dfcc", fogNear: 200, fogFar: 400, sunI: 2.4,
});
export const PRESET: Record<Light, LightPreset> = {
  home40: interior([1.55, 1.38, 1.12], [0.46, 0.38, 0.44]),
  office: interior([1.45, 1.42, 1.32], [0.44, 0.43, 0.52]),
  drive: { ...LIGHTS.day },
  home02: interior([1.45, 1.44, 1.4], [0.45, 0.46, 0.55]),
};
const sky = (c: string[]) => ({ c, e: [0, 3, 8, 16, 40] });
export const WLOOK: Record<Light, WorldLook> = {
  home40: { ...LOOK.day, sky: sky(["#e9dfcc", "#e9dfcc", "#e9dfcc", "#e9dfcc", "#e9dfcc"]), sat: 1.0 },
  office: { ...LOOK.day, sky: sky(["#e6e2d6", "#e6e2d6", "#e6e2d6", "#e6e2d6", "#e6e2d6"]), sat: 1.0 },
  drive: { ...LOOK.day },
  home02: { ...LOOK.day, sky: sky(["#e4e8ea", "#e4e8ea", "#e4e8ea", "#e4e8ea", "#e4e8ea"]), sat: 1.02 },
};
export const GRADE_OF: Record<Light, string> = { home40: "warm40", office: "warm40", drive: "warm40", home02: "day" };
