import React from "react";
import { Composition } from "remotion";
import { RobotButler, RB_FRAMES } from "./butler/RobotButler";
export const Root: React.FC = () => (
  <Composition id="RobotButler" component={RobotButler} durationInFrames={RB_FRAMES} fps={30} width={1080} height={1920} />
);
