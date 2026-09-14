export {
  ClosedCandlePatternDetectionConfigurationError,
  createClosedCandlePatternDetectionRuntime
} from "./closed-candle-pattern-detection-runtime.js";
export {
  createClosedCandlePatternDetectionFeed
} from "./closed-candle-pattern-detection-feed.js";
export {
  CLOSED_CANDLE_BREAKOUT_LOOKBACK,
  CLOSED_CANDLE_BREAKOUT_RULE
} from "./types.js";
export type {
  ActiveSetupRevisionResolver,
  ClosedCandleBreakoutDetectorConfig,
  ClosedCandlePatternDetectionRuntime,
  ClosedCandlePatternDetectionRuntimeOptions,
  ClosedCandleProcessingOutcome,
  ClosedCandleProcessingStatus,
  DetectionCandidateHandoff
} from "./types.js";
export type {
  ClosedCandleFeed,
  ClosedCandleFeedRange,
  ClosedCandleFeedSink,
  ClosedCandlePatternDetectionFeed,
  ClosedCandlePatternDetectionFeedEvent,
  ClosedCandlePatternDetectionFeedOptions
} from "./closed-candle-pattern-detection-feed.js";
