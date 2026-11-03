import React from "react";
import { Composition } from "remotion";
import { RcaTv, RT_FRAMES } from "./rca/RcaTv";
export const Root: React.FC = () => (
  <Composition id="RcaTv" component={RcaTv} durationInFrames={RT_FRAMES} fps={30} width={1080} height={1920} />
);
