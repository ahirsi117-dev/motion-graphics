import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Source clip: public/source.mp4, 720x1280 (9:16), 30 fps, 00:01:24.29
const SOURCE_FPS = 30;
const SOURCE_DURATION_IN_FRAMES = Math.ceil(84.29 * SOURCE_FPS);

// Edit the copy and timing here. `at` is the second each announcement lands.
const ANNOUNCEMENTS = [
  { at: 5, text: "BREAKING" },
  { at: 25, text: "HEADLINE ONE" },
  { at: 50, text: "HEADLINE TWO" },
  { at: 70, text: "THE TRUTH" },
];

const CARD_SECONDS = 2.5;
const CARD_FRAMES = Math.round(CARD_SECONDS * SOURCE_FPS);

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

const Announcement: React.FC<{ text: string; durationInFrames: number }> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slam in from oversized with a bouncy spring, then hold.
  const slam = spring({ frame, fps, config: { damping: 9, stiffness: 180 } });
  const scale = interpolate(slam, [0, 1], [1.6, 1]);

  // White flash on impact, decaying over a few frames.
  const flash = interpolate(frame, [0, 8], [0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Band wipes open from the centre, then the whole card fades out at the end.
  const wipe = interpolate(frame, [0, 10], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "white", opacity: flash }} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 180,
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            width: `${wipe}%`,
            maxWidth: "100%",
            overflow: "hidden",
            backgroundColor: "#e11d2e",
            transform: `scale(${scale})`,
            padding: "36px 24px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              color: "white",
              fontFamily: "Arial Black, Impact, sans-serif",
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              textAlign: "center",
              textTransform: "uppercase",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {text}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MyComponent: React.FC<Props> = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo src={staticFile("source.mp4")} />
      {ANNOUNCEMENTS.map((announcement) => (
        <Sequence
          key={announcement.at}
          from={Math.round(announcement.at * fps)}
          durationInFrames={CARD_FRAMES}
        >
          <Announcement
            text={announcement.text}
            durationInFrames={CARD_FRAMES}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
