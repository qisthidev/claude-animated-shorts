// "RCA television" (Yesterday's Tomorrow ystd-s005): composition. Same post chain as the template's Bridge.tsx
// (ink -> lens blur -> bloom + Neutral tone map + grade -> grain), one World posed per frame, hard cuts only
// (motivated by the VO), a 2D overlay (captions, chips, promise card) and the mixed soundtrack.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../engine/ink";
import { LensBlur, GrainEffect } from "../engine/lensblur";
import { GradeEffect, GRADES, gradeFor } from "../engine/grade";
import { World } from "./world";
import { TOTAL, shotAt } from "./story";
import { GRADE_OF } from "./look";
import { Overlay, useFonts } from "./Overlay";

export const RT_FRAMES = TOTAL;
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; audio: boolean; overlay: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, audio: true, overlay: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
    grain: new GrainEffect({ amount: 0, cellPx: 1.6 }),
  }), [camera, scene]);
  // InkPass has no dispose() under postprocessing 6.36 (template Bridge.tsx crashed at the end of a render)
  useEffect(() => () => { (fx.ink as unknown as { dispose?: () => void }).dispose?.(); }, [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
      <primitive object={fx.grain} dispose={null} />
    </EffectComposer>
  ), [fx, on]);
  const s = shotAt(f), cam = camera as THREE.PerspectiveCamera;
  const target = world.update(s.id, f, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  if (s.focus) fpt.set(...s.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = s.cInf;
  gradeFor(fx.grade, GRADE_OF[s.light]);
  fx.grain.seed = f;
  (fx.grain as unknown as { amount: number }).amount = s.grain ?? 0;
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
export const RcaTv: React.FC = () => {
  useFonts();
  const on = toggles();
  return (
    <AbsoluteFill style={{ background: "#101418" }}>
      <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.1, far: 3000 }}>
        <Inner />
      </ThreeCanvas>
      {on.overlay ? <Overlay /> : null}
      {on.audio ? <Audio src={staticFile("audio/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
