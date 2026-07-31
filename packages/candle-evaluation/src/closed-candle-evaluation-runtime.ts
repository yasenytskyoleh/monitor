import type {
  CandleClosedEvent,
  ProductRecordMetadata,
  SignalCandidate
} from "@monitor/domain-model";

import {
  CANDLE_EVALUATION_OBSERVATION_COUNT,
  CANDLE_EVALUATION_TIMEFRAME,
  CANDLE_EVALUATION_WINDOW_ID,
  CANDLE_EVALUATION_WINDOW_MS,
  type ClosedCandleEvaluationOutcome,
  type ClosedCandleEvaluationRequest,
  type ClosedCandleEvaluationRuntime,
  type ClosedCandleEvaluationRuntimeOptions
} from "./types.js";

type EvaluationMetrics = {
  referencePrice: number;
  finalPrice: number;
  highInWindow: number;
  lowInWindow: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  evaluatedAt: string;
};

type ValidatedWindow = {
  candidate: SignalCandidate;
  metrics: EvaluationMetrics;
  finalCandle: CandleClosedEvent;
  windowEndUtc: string;
};

const CANDLE_INTERVAL_MS = 5 * 60 * 1_000;

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected closed-candle evaluation failure";

const asTimestamp = (value: string): number => Date.parse(value);

const isValidCandle = (candle: CandleClosedEvent): boolean => {
  const { close, closeTimeUtc, high, low, open, openTimeUtc, volume } = candle.payload;
  const openTimeMs = asTimestamp(openTimeUtc);
  const closeTimeMs = asTimestamp(closeTimeUtc);
  return (
    candle.eventId.trim().length > 0 &&
    candle.sourceId.trim().length > 0 &&
    candle.symbolId.trim().length > 0 &&
    candle.payload.timeframe === CANDLE_EVALUATION_TIMEFRAME &&
    Number.isFinite(openTimeMs) &&
    Number.isFinite(closeTimeMs) &&
    candle.eventTimestampUtc === closeTimeUtc &&
    closeTimeMs - openTimeMs === CANDLE_INTERVAL_MS - 1 &&
    [open, high, low, close, volume].every(Number.isFinite) &&
    volume >= 0 &&
    high >= Math.max(open, close) &&
    low <= Math.min(open, close)
  );
};

const createRejectedOutcome = (reason: string): ClosedCandleEvaluationOutcome => ({
  status: "rejected_validation",
  reason,
  warnings: []
});

const buildMetadata = (candle: CandleClosedEvent): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "evaluation_pipeline",
  lastUpdatedBySource: "evaluation_pipeline",
  traceId: candle.eventId,
  sourceObservedAtUtc: candle.eventTimestampUtc,
  notes: "closed-candle evaluation"
});

const buildNotes = (request: ClosedCandleEvaluationRequest, windowEndUtc: string): string =>
  `closed-candle evaluation: detectionEvent=${request.detectionCandle.eventId}; source=${request.detectionCandle.sourceId}; windowEnd=${windowEndUtc}; observations=${request.observationCandles.length}.`;

const buildMetrics = (
  detectionCandle: CandleClosedEvent,
  observationCandles: CandleClosedEvent[],
  finalCandle: CandleClosedEvent
): EvaluationMetrics => {
  const referencePrice = detectionCandle.payload.close;
  const windowCandles = [detectionCandle, ...observationCandles];
  const highInWindow = Math.max(...windowCandles.map((candle) => candle.payload.high));
  const lowInWindow = Math.min(...windowCandles.map((candle) => candle.payload.low));
  return {
    referencePrice,
    finalPrice: finalCandle.payload.close,
    highInWindow,
    lowInWindow,
    maxFavorableExcursion: highInWindow - referencePrice,
    maxAdverseExcursion: lowInWindow - referencePrice,
    evaluatedAt: finalCandle.eventTimestampUtc
  };
};

const validateWindow = async (
  request: ClosedCandleEvaluationRequest,
  candidateRepository: ClosedCandleEvaluationRuntimeOptions["candidateRepository"]
): Promise<ValidatedWindow | ClosedCandleEvaluationOutcome> => {
  if (!request.signalCandidateId.trim() || !isValidCandle(request.detectionCandle)) {
    return createRejectedOutcome("signalCandidateId and a valid 5m detection candle are required");
  }
  const candidate = await candidateRepository.getById(request.signalCandidateId);
  if (!candidate) {
    return createRejectedOutcome(`signal_candidate not found: ${request.signalCandidateId}`);
  }
  if (candidate.detectedAt !== request.detectionCandle.eventTimestampUtc) {
    return createRejectedOutcome("detection candle timestamp does not match signal candidate");
  }
  if (candidate.monitoredSymbolId !== request.detectionCandle.symbolId) {
    return createRejectedOutcome("detection candle symbol does not match signal candidate");
  }
  if (request.observationCandles.length !== CANDLE_EVALUATION_OBSERVATION_COUNT) {
    return createRejectedOutcome("evaluation window must contain exactly 288 closed 5m candles");
  }

  const detectionCloseMs = asTimestamp(request.detectionCandle.payload.closeTimeUtc);
  const windowEndMs = detectionCloseMs + CANDLE_EVALUATION_WINDOW_MS;
  const eventIds = new Set<string>();
  for (const [index, candle] of request.observationCandles.entries()) {
    const expectedOpenTimeMs = detectionCloseMs + 1 + index * CANDLE_INTERVAL_MS;
    if (
      !isValidCandle(candle) ||
      candle.sourceId !== request.detectionCandle.sourceId ||
      candle.symbolId !== request.detectionCandle.symbolId ||
      eventIds.has(candle.eventId) ||
      asTimestamp(candle.payload.openTimeUtc) !== expectedOpenTimeMs
    ) {
      return createRejectedOutcome("evaluation candles must be unique, contiguous, and source/symbol aligned");
    }
    eventIds.add(candle.eventId);
  }

  const finalCandle = request.observationCandles.at(-1);
  if (!finalCandle || asTimestamp(finalCandle.payload.closeTimeUtc) !== windowEndMs) {
    return createRejectedOutcome("evaluation window must end with the exact 24-hour closing candle");
  }
  return {
    candidate,
    finalCandle,
    windowEndUtc: new Date(windowEndMs).toISOString(),
    metrics: buildMetrics(request.detectionCandle, request.observationCandles, finalCandle)
  };
};

const finalizeCandidateStatus = async (
  candidate: SignalCandidate,
  options: ClosedCandleEvaluationRuntimeOptions,
  metadata: ProductRecordMetadata
): Promise<string[]> => {
  try {
    const current = await options.candidateRepository.getById(candidate.id);
    if (!current || current.status === "evaluated") {
      return current ? [] : [`signal_candidate not found after evaluation: ${candidate.id}`];
    }
    if (current.status === "detected") {
      const underReview = await options.signalCandidateService.updateSignalCandidateStatus({
        signalCandidateId: current.id,
        status: "under_review",
        metadata,
        expectedVersion: null
      });
      if (!underReview) {
        return [`signal_candidate status update returned null: ${current.id}`];
      }
    }
    const evaluated = await options.signalCandidateService.updateSignalCandidateStatus({
      signalCandidateId: current.id,
      status: "evaluated",
      metadata,
      expectedVersion: null
    });
    return evaluated ? [] : [`signal_candidate status update returned null: ${current.id}`];
  } catch (error: unknown) {
    return [`signal_candidate status update failed: ${asErrorMessage(error)}`];
  }
};

export const createClosedCandleEvaluationRuntime = (
  options: ClosedCandleEvaluationRuntimeOptions
): ClosedCandleEvaluationRuntime => ({
  async evaluate(request): Promise<ClosedCandleEvaluationOutcome> {
    try {
      const validated = await validateWindow(request, options.candidateRepository);
      if ("status" in validated) {
        return validated;
      }
      const preexistingResult = await options.evaluationResultRepository.getBySignalCandidateAndWindow(
        validated.candidate.id,
        CANDLE_EVALUATION_WINDOW_ID
      );
      if (preexistingResult?.status === "completed") {
        return {
          status: "rejected_duplicate",
          evaluationResultId: preexistingResult.id,
          reason: "evaluation result is already completed for candidate/window",
          warnings: []
        };
      }
      if (validated.candidate.status !== "detected" && validated.candidate.status !== "under_review") {
        return {
          status: "rejected_lifecycle",
          reason: `signal candidate status does not allow evaluation: ${validated.candidate.status}`,
          warnings: []
        };
      }

      const triggerResult = await options.candidateHandoff.trigger(
        {
          signalCandidateId: validated.candidate.id,
          setupDefinitionId: validated.candidate.setupDefinitionId,
          setupRevisionId: validated.candidate.setupRevisionId,
          monitoredSymbolId: validated.candidate.monitoredSymbolId,
          triggeredAt: validated.candidate.detectedAt,
          evaluationWindowId: CANDLE_EVALUATION_WINDOW_ID,
          triggerReason: "complete 24-hour closed-candle evaluation"
        },
        buildMetadata(request.detectionCandle)
      );
      if (triggerResult.status !== "started" && triggerResult.status !== "rejected_duplicate") {
        return {
          status: triggerResult.status,
          evaluationResultId: triggerResult.evaluationResultId,
          reason: triggerResult.reason,
          warnings: triggerResult.warnings
        };
      }

      const existingResult =
        triggerResult.status === "rejected_duplicate"
          ? await options.evaluationResultRepository.getBySignalCandidateAndWindow(
              validated.candidate.id,
              CANDLE_EVALUATION_WINDOW_ID
            )
          : null;
      if (existingResult?.status === "completed") {
        return {
          status: "rejected_duplicate",
          evaluationResultId: existingResult.id,
          reason: "evaluation result is already completed for candidate/window",
          warnings: []
        };
      }
      const evaluationResultId = triggerResult.evaluationResultId ?? existingResult?.id;
      if (!evaluationResultId) {
        return {
          status: "failed",
          reason: "evaluation trigger did not provide an evaluation result id",
          warnings: []
        };
      }

      const finalizationMetadata = buildMetadata(validated.finalCandle);
      const completed = await options.evaluationService.finalizeEvaluationResult({
        evaluationResultId,
        ...validated.metrics,
        notes: buildNotes(request, validated.windowEndUtc),
        metadata: finalizationMetadata,
        expectedVersion: null
      });
      if (!completed) {
        return {
          status: "failed",
          evaluationResultId,
          reason: "evaluation result finalization returned null",
          warnings: []
        };
      }
      return {
        status: "completed",
        evaluationResultId: completed.id,
        warnings: await finalizeCandidateStatus(validated.candidate, options, finalizationMetadata)
      };
    } catch (error: unknown) {
      return {
        status: "failed",
        reason: asErrorMessage(error),
        warnings: []
      };
    }
  }
});
