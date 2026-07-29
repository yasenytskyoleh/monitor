import type {
  CandleClosedEvent,
  DetectionToCandidateCommand,
  ProductRecordMetadata,
  RuntimeHandoffResult,
  SetupRevisionResolutionResult
} from "@monitor/domain-model";

export const CLOSED_CANDLE_BREAKOUT_RULE = "bullish_close_breakout_v1" as const;
export const CLOSED_CANDLE_BREAKOUT_LOOKBACK = 20;

export type ClosedCandleBreakoutDetectorConfig = {
  setupDefinitionId: string;
  monitoredSymbolId: string;
  timeframe: "5m";
  rule: typeof CLOSED_CANDLE_BREAKOUT_RULE;
};

export type DetectionCandidateHandoff = {
  handoff(
    command: DetectionToCandidateCommand,
    metadata: ProductRecordMetadata
  ): Promise<RuntimeHandoffResult>;
};

export type ActiveSetupRevisionResolver = {
  resolve(command: {
    setupDefinitionId: string;
    resolvedAt: string;
    runtimeContext: Record<string, string | number>;
  }): Promise<SetupRevisionResolutionResult>;
};

export type ClosedCandlePatternDetectionRuntimeOptions = {
  detectors: ClosedCandleBreakoutDetectorConfig[];
  activeSetupRevisionResolver: ActiveSetupRevisionResolver;
  candidateHandoff: DetectionCandidateHandoff;
};

export type ClosedCandleProcessingStatus =
  | "ignored"
  | "no_match"
  | "detected"
  | "rejected"
  | "failed";

export type ClosedCandleProcessingOutcome = {
  status: ClosedCandleProcessingStatus;
  eventId: string;
  setupDefinitionId?: string;
  reason?: string;
  detectionHitId?: string;
  handoffResult?: RuntimeHandoffResult;
};

export type ClosedCandlePatternDetectionRuntime = {
  process(candle: CandleClosedEvent): Promise<ClosedCandleProcessingOutcome[]>;
};
