import type {
  CandleClosedEvent,
  DetectionToCandidateCommand,
  ProductRecordMetadata
} from "@monitor/domain-model";

import {
  CLOSED_CANDLE_BREAKOUT_LOOKBACK,
  CLOSED_CANDLE_BREAKOUT_RULE,
  type ClosedCandleBreakoutDetectorConfig,
  type ClosedCandlePatternDetectionRuntime,
  type ClosedCandlePatternDetectionRuntimeOptions,
  type ClosedCandleProcessingOutcome
} from "./types.js";

const MAX_RECENT_EVENT_IDS = 4_096;

type CandleHistory = {
  candles: CandleClosedEvent[];
  latestOpenTimeMs: number | null;
};

export class ClosedCandlePatternDetectionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClosedCandlePatternDetectionConfigurationError";
  }
}

const isNonEmptyString = (value: string): boolean => Boolean(value.trim());

const toTimestamp = (value: string): number => Date.parse(value);

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected closed-candle detection failure";

const isValidCandle = (candle: CandleClosedEvent): boolean => {
  const { close, closeTimeUtc, high, low, open, openTimeUtc, timeframe, volume } = candle.payload;
  const openTimeMs = toTimestamp(openTimeUtc);
  const closeTimeMs = toTimestamp(closeTimeUtc);
  return (
    isNonEmptyString(candle.eventId) &&
    isNonEmptyString(candle.sourceId) &&
    isNonEmptyString(candle.symbolId) &&
    Number.isFinite(openTimeMs) &&
    Number.isFinite(closeTimeMs) &&
    closeTimeMs >= openTimeMs &&
    [open, high, low, close, volume].every(Number.isFinite) &&
    volume >= 0 &&
    high >= Math.max(open, close) &&
    low <= Math.min(open, close)
  );
};

const historyKeyFor = (candle: CandleClosedEvent): string =>
  `${candle.sourceId}:${candle.symbolId}:${candle.payload.timeframe}`;

const buildDetectionHitId = (
  detector: ClosedCandleBreakoutDetectorConfig,
  setupRevisionId: string,
  eventId: string
): string =>
  `detection-${detector.setupDefinitionId}-${setupRevisionId}-${CLOSED_CANDLE_BREAKOUT_RULE}-${eventId}`;

const buildEvidenceSummary = (candle: CandleClosedEvent, threshold: number): string =>
  `5m bullish breakout: event=${candle.eventId}; close=${candle.payload.close}; threshold=${threshold}; lookback=${CLOSED_CANDLE_BREAKOUT_LOOKBACK}; source=${candle.sourceId}; symbol=${candle.symbolId}.`;

const buildMetadata = (candle: CandleClosedEvent): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "detection_pipeline",
  traceId: candle.eventId,
  sourceObservedAtUtc: candle.eventTimestampUtc,
  notes: "closed-candle pattern detection"
});

const buildRuntimeContext = (candle: CandleClosedEvent, threshold: number): Record<string, string | number> => ({
  eventId: candle.eventId,
  sourceId: candle.sourceId,
  symbolId: candle.symbolId,
  timeframe: candle.payload.timeframe,
  close: candle.payload.close,
  breakoutThreshold: threshold,
  lookback: CLOSED_CANDLE_BREAKOUT_LOOKBACK
});

const appendCandle = (history: CandleHistory, candle: CandleClosedEvent): void => {
  history.candles.push(candle);
  if (history.candles.length > CLOSED_CANDLE_BREAKOUT_LOOKBACK) {
    history.candles.shift();
  }
  history.latestOpenTimeMs = toTimestamp(candle.payload.openTimeUtc);
};

const rememberEventId = (eventId: string, eventIds: Set<string>, eventIdOrder: string[]): void => {
  eventIds.add(eventId);
  eventIdOrder.push(eventId);
  if (eventIdOrder.length > MAX_RECENT_EVENT_IDS) {
    const expiredEventId = eventIdOrder.shift();
    if (expiredEventId) {
      eventIds.delete(expiredEventId);
    }
  }
};

const buildCommand = (
  detector: ClosedCandleBreakoutDetectorConfig,
  candle: CandleClosedEvent,
  setupRevisionId: string,
  detectionHitId: string,
  threshold: number
): DetectionToCandidateCommand => ({
  setupDefinitionId: detector.setupDefinitionId,
  setupRevisionId,
  monitoredSymbolId: detector.monitoredSymbolId,
  detectedAt: candle.eventTimestampUtc,
  detectionHitId,
  evidenceSummary: buildEvidenceSummary(candle, threshold),
  sourceMetadata: buildRuntimeContext(candle, threshold)
});

const validateDetectors = (detectors: ClosedCandleBreakoutDetectorConfig[]): void => {
  const keys = new Set<string>();
  for (const detector of detectors) {
    if (!isNonEmptyString(detector.setupDefinitionId) || !isNonEmptyString(detector.monitoredSymbolId)) {
      throw new ClosedCandlePatternDetectionConfigurationError(
        "detector setupDefinitionId and monitoredSymbolId are required"
      );
    }
    if (detector.timeframe !== "5m" || detector.rule !== CLOSED_CANDLE_BREAKOUT_RULE) {
      throw new ClosedCandlePatternDetectionConfigurationError("unsupported closed-candle detector rule");
    }
    const key = `${detector.setupDefinitionId}:${detector.monitoredSymbolId}`;
    if (keys.has(key)) {
      throw new ClosedCandlePatternDetectionConfigurationError("duplicate detector configuration");
    }
    keys.add(key);
  }
};

export const createClosedCandlePatternDetectionRuntime = (
  options: ClosedCandlePatternDetectionRuntimeOptions
): ClosedCandlePatternDetectionRuntime => {
  validateDetectors(options.detectors);
  const histories = new Map<string, CandleHistory>();
  const recentEventIds = new Set<string>();
  const recentEventIdOrder: string[] = [];
  const inFlightEventIds = new Set<string>();

  return {
    async process(candle): Promise<ClosedCandleProcessingOutcome[]> {
      if (!isValidCandle(candle)) {
        return [{ status: "ignored", eventId: candle.eventId, reason: "invalid_candle" }];
      }
      if (recentEventIds.has(candle.eventId)) {
        return [{ status: "ignored", eventId: candle.eventId, reason: "duplicate_event" }];
      }
      if (inFlightEventIds.has(candle.eventId)) {
        return [{ status: "ignored", eventId: candle.eventId, reason: "duplicate_event" }];
      }

      const detectors = options.detectors.filter(
        (detector) =>
          detector.monitoredSymbolId === candle.symbolId && detector.timeframe === candle.payload.timeframe
      );
      if (detectors.length === 0) {
        return [{ status: "ignored", eventId: candle.eventId, reason: "unconfigured_symbol_or_timeframe" }];
      }

      const historyKey = historyKeyFor(candle);
      const history = histories.get(historyKey) ?? {
        candles: [],
        latestOpenTimeMs: null
      };
      const openTimeMs = toTimestamp(candle.payload.openTimeUtc);
      if (history.latestOpenTimeMs !== null && openTimeMs <= history.latestOpenTimeMs) {
        return [{ status: "ignored", eventId: candle.eventId, reason: "out_of_order_candle" }];
      }

      histories.set(historyKey, history);
      inFlightEventIds.add(candle.eventId);

      const threshold = Math.max(...history.candles.map((previous) => previous.payload.high));
      const hasEnoughHistory = history.candles.length === CLOSED_CANDLE_BREAKOUT_LOOKBACK;
      if (!hasEnoughHistory || candle.payload.close <= threshold) {
        appendCandle(history, candle);
        rememberEventId(candle.eventId, recentEventIds, recentEventIdOrder);
        inFlightEventIds.delete(candle.eventId);
        return detectors.map((detector) => ({
          status: "no_match",
          eventId: candle.eventId,
          setupDefinitionId: detector.setupDefinitionId
        }));
      }

      const outcomes = await Promise.all(
        detectors.map(async (detector): Promise<ClosedCandleProcessingOutcome> => {
          try {
            const resolution = await options.activeSetupRevisionResolver.resolve({
              setupDefinitionId: detector.setupDefinitionId,
              resolvedAt: candle.eventTimestampUtc,
              runtimeContext: buildRuntimeContext(candle, threshold)
            });
            if (resolution.status === "failed") {
              return {
                status: "failed",
                eventId: candle.eventId,
                setupDefinitionId: detector.setupDefinitionId,
                reason: resolution.reason
              };
            }
            if (resolution.status !== "resolved" || !resolution.resolution) {
              return {
                status: "rejected",
                eventId: candle.eventId,
                setupDefinitionId: detector.setupDefinitionId,
                reason: resolution.reason ?? "active setup revision was not resolved"
              };
            }

            const detectionHitId = buildDetectionHitId(
              detector,
              resolution.resolution.revisionRef.setupRevisionId,
              candle.eventId
            );
            const handoffResult = await options.candidateHandoff.handoff(
              buildCommand(
                detector,
                candle,
                resolution.resolution.revisionRef.setupRevisionId,
                detectionHitId,
                threshold
              ),
              buildMetadata(candle)
            );
            return {
              status: handoffResult.status === "failed" ? "failed" : "detected",
              eventId: candle.eventId,
              setupDefinitionId: detector.setupDefinitionId,
              detectionHitId,
              handoffResult
            };
          } catch (error: unknown) {
            return {
              status: "failed",
              eventId: candle.eventId,
              setupDefinitionId: detector.setupDefinitionId,
              reason: asErrorMessage(error)
            };
          }
        })
      );
      inFlightEventIds.delete(candle.eventId);
      if (!outcomes.some((outcome) => outcome.status === "failed")) {
        appendCandle(history, candle);
        rememberEventId(candle.eventId, recentEventIds, recentEventIdOrder);
      }

      return outcomes;
    }
  };
};
