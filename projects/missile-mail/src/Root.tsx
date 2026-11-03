import React from "react";
import { Composition } from "remotion";
import { MissileMail, MM_FRAMES } from "./mail/MissileMail";
export const Root: React.FC = () => (
  <Composition id="MissileMail" component={MissileMail} durationInFrames={MM_FRAMES} fps={30} width={1080} height={1920} />
);
