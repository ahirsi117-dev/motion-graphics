import { AbsoluteFill, CalculateMetadataFunction, Composition, OffthreadVideo, staticFile } from "remotion";

// Source clip: public/source.mp4, 720x1280 (9:16), 30 fps, 00:01:24.29
const SOURCE_FPS = 30;
const SOURCE_DURATION_IN_FRAMES = Math.ceil(84.29 * SOURCE_FPS);

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {
    durationInFrames: SOURCE_DURATION_IN_FRAMES,
  };
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={SOURCE_DURATION_IN_FRAMES}
      fps={SOURCE_FPS}
      width={720}
      height={1280}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo src={staticFile("source.mp4")} />
    </AbsoluteFill>
  );
};
