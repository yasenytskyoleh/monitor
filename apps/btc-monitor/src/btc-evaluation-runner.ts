import {
  createEvaluationService,
  createEvaluationToAggregationRefreshHandoff,
  createResearchAggregationService,
  createSignalCandidateToEvaluationHandoff,
  createSignalCandidateService,
  type CandleClosedEvent,
  type ImplementedProductRelationalRepositories,
  type SignalCandidate
} from "@monitor/domain-model";
import {
  CANDLE_EVALUATION_OBSERVATION_COUNT,
  CANDLE_EVALUATION_TIMEFRAME,
  CANDLE_EVALUATION_WINDOW_ID,
  CANDLE_EVALUATION_WINDOW_MS,
  createClosedCandleEvaluationRuntime,
  type ClosedCandleEvaluationOutcome
} from "@monitor/candle-evaluation";

import { createBtcAggregateScope } from "./btc-aggregate-scope.js";

const CANDLE_INTERVAL_MS = 5 * 60 * 1_000;
const DEFAULT_EVALUATION_BATCH_SIZE = 50;

type EvaluationRepositories = Pick<
  ImplementedProductRelationalRepositories,
  | "evaluationResultRepository"
  | "monitoredSymbolRepository"
  | "researchHypothesisRepository"
  | "researchRunRepository"
  | "setupAggregateResultRepository"
  | "setupDefinitionRepository"
  | "setupDefinitionRevisionRepository"
  | "signalCandidateRepository"
>;

export type HistoricalCandleSource = {
  backfillClosedCandles(range: { startTimeUtc: string; endTimeUtc: string }): Promise<CandleClosedEvent[]>;
};

export type BtcEvaluationRunResult = {
  candidateId: string;
  status: "completed" | "not_due" | "failed" | "skipped";
  evaluation?: ClosedCandleEvaluationOutcome;
  reason?: string;
};

export type BtcEvaluationRunner = {
  run(): Promise<BtcEvaluationRunResult[]>;
};

export type BtcEvaluationRunnerOptions = {
  candleSource: HistoricalCandleSource;
  maxCandidates?: number;
  monitoredSymbolId: string;
  now?: () => Date;
  repositories: EvaluationRepositories;
  setupDefinitionId: string;
};

const buildMetadata = (observedAt: string) => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "evaluation_pipeline" as const,
  lastUpdatedBySource: "evaluation_pipeline" as const,
  traceId: null,
  sourceObservedAtUtc: observedAt,
  notes: "BTC closed-candle evaluation run"
});

const isDue = (candidate: SignalCandidate, now: Date): boolean =>
  now.getTime() >= Date.parse(candidate.detectedAt) + CANDLE_EVALUATION_WINDOW_MS;

const selectWindow = (
  candidate: SignalCandidate,
  candles: CandleClosedEvent[]
): { detectionCandle: CandleClosedEvent; observationCandles: CandleClosedEvent[] } | null => {
  const matching = candles
    .filter((candle) => candle.payload.timeframe === CANDLE_EVALUATION_TIMEFRAME)
    .sort((left, right) => left.payload.openTimeUtc.localeCompare(right.payload.openTimeUtc));
  const detectionIndex = matching.findIndex(
    (candle) => candle.payload.closeTimeUtc === candidate.detectedAt
  );
  if (detectionIndex < 0) return null;
  const detectionCandle = matching[detectionIndex];
  if (!detectionCandle) return null;
  return {
    detectionCandle,
    observationCandles: matching.slice(detectionIndex + 1, detectionIndex + 1 + CANDLE_EVALUATION_OBSERVATION_COUNT)
  };
};

export const createBtcEvaluationRunner = (
  options: BtcEvaluationRunnerOptions
): BtcEvaluationRunner => {
  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository: options.repositories.signalCandidateRepository,
    setupDefinitionRepository: options.repositories.setupDefinitionRepository,
    monitoredSymbolRepository: options.repositories.monitoredSymbolRepository
  });
  const evaluationService = createEvaluationService({
    evaluationResultRepository: options.repositories.evaluationResultRepository,
    signalCandidateRepository: options.repositories.signalCandidateRepository
  });
  const evaluationRuntime = createClosedCandleEvaluationRuntime({
    candidateRepository: options.repositories.signalCandidateRepository,
    evaluationResultRepository: options.repositories.evaluationResultRepository,
    candidateHandoff: createSignalCandidateToEvaluationHandoff({
      evaluationService,
      signalCandidateService,
      signalCandidateRepository: options.repositories.signalCandidateRepository,
      evaluationResultRepository: options.repositories.evaluationResultRepository
    }),
    evaluationService,
    signalCandidateService
  });
  const aggregationHandoff = createEvaluationToAggregationRefreshHandoff({
    researchAggregationService: createResearchAggregationService({
      setupAggregateResultRepository: options.repositories.setupAggregateResultRepository,
      setupDefinitionRepository: options.repositories.setupDefinitionRepository,
      researchHypothesisRepository: options.repositories.researchHypothesisRepository,
      researchRunRepository: options.repositories.researchRunRepository,
      evaluationResultRepository: options.repositories.evaluationResultRepository,
      signalCandidateRepository: options.repositories.signalCandidateRepository
    }),
    evaluationResultRepository: options.repositories.evaluationResultRepository,
    signalCandidateRepository: options.repositories.signalCandidateRepository,
    setupAggregateResultRepository: options.repositories.setupAggregateResultRepository
  });
  const now = options.now ?? (() => new Date());
  const maxCandidates = options.maxCandidates ?? DEFAULT_EVALUATION_BATCH_SIZE;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) {
    throw new Error("maxCandidates must be a positive integer");
  }
  const refreshAggregate = async (
    candidate: SignalCandidate,
    evaluationResultId: string,
    observedAt: string
  ): Promise<string | undefined> => {
    const aggregate = await aggregationHandoff.refresh({
      evaluationResultId,
      signalCandidateId: candidate.id,
      setupDefinitionId: candidate.setupDefinitionId,
      aggregationScopeDescriptor: createBtcAggregateScope(
        candidate.setupDefinitionId,
        candidate.monitoredSymbolId
      ),
      triggeredAt: observedAt
    }, buildMetadata(observedAt));
    return aggregate.status === "created_and_refreshed" || aggregate.status === "refreshed_existing"
      ? undefined
      : aggregate.reason ?? `aggregate refresh did not complete: ${aggregate.status}`;
  };

  return {
    async run(): Promise<BtcEvaluationRunResult[]> {
      const candidates = await options.repositories.signalCandidateRepository.listByStatus([
        "detected",
        "under_review",
        "evaluated",
        "discarded"
      ]);
      const configuredRevision = await options.repositories.setupDefinitionRevisionRepository
        .getBySetupDefinitionId(options.setupDefinitionId);
      const setupDefinitionIds = new Set([options.setupDefinitionId]);
      if (configuredRevision) {
        const familyRevisions = await options.repositories.setupDefinitionRevisionRepository
          .listBySetupFamilyId(configuredRevision.versionInfo.setupFamilyId);
        for (const revision of familyRevisions) setupDefinitionIds.add(revision.setupDefinitionId);
      }
      const scopedCandidates = candidates.filter(
        (candidate) =>
          setupDefinitionIds.has(candidate.setupDefinitionId) &&
          candidate.monitoredSymbolId === options.monitoredSymbolId
      );
      const pendingCandidates = scopedCandidates.filter(
        (candidate) => candidate.status === "detected" || candidate.status === "under_review"
      );
      const recoveryCandidates = scopedCandidates.filter(
        (candidate) => candidate.status === "evaluated" || candidate.status === "discarded"
      );
      const results: BtcEvaluationRunResult[] = [];
      for (const candidate of [...pendingCandidates, ...recoveryCandidates].slice(0, maxCandidates)) {
        if (!isDue(candidate, now())) {
          results.push({ candidateId: candidate.id, status: "not_due" });
          continue;
        }
        const detectionOpenMs = Date.parse(candidate.detectedAt) - (CANDLE_INTERVAL_MS - 1);
        const windowEndMs = Date.parse(candidate.detectedAt) + CANDLE_EVALUATION_WINDOW_MS;
        try {
          const existingEvaluation = await options.repositories.evaluationResultRepository
            .getBySignalCandidateAndWindow(candidate.id, CANDLE_EVALUATION_WINDOW_ID);
          if (existingEvaluation?.status === "completed" && existingEvaluation.evaluatedAt) {
            const reason = await refreshAggregate(candidate, existingEvaluation.id, existingEvaluation.evaluatedAt);
            results.push(reason
              ? { candidateId: candidate.id, status: "failed", reason }
              : { candidateId: candidate.id, status: "completed" });
            continue;
          }
          if (candidate.status === "evaluated") {
            if (!existingEvaluation || !existingEvaluation.evaluatedAt) {
              results.push({ candidateId: candidate.id, status: "skipped", reason: "completed evaluation unavailable" });
              continue;
            }
            results.push({ candidateId: candidate.id, status: "skipped", reason: "evaluation is not completed" });
            continue;
          }
          if (candidate.status === "discarded") {
            results.push({ candidateId: candidate.id, status: "skipped", reason: "candidate is discarded" });
            continue;
          }
          const candles = await options.candleSource.backfillClosedCandles({
            startTimeUtc: new Date(detectionOpenMs).toISOString(),
            endTimeUtc: new Date(windowEndMs).toISOString()
          });
          const window = selectWindow(candidate, candles);
          if (!window) {
            results.push({ candidateId: candidate.id, status: "skipped", reason: "detection candle unavailable" });
            continue;
          }
          const evaluation = await evaluationRuntime.evaluate({
            signalCandidateId: candidate.id,
            detectionCandle: window.detectionCandle,
            observationCandles: window.observationCandles
          });
          if (evaluation.status !== "completed" || !evaluation.evaluationResultId) {
            results.push({ candidateId: candidate.id, status: "failed", evaluation, reason: evaluation.reason });
            continue;
          }
          const observedAt = window.observationCandles.at(-1)?.eventTimestampUtc ?? candidate.detectedAt;
          const reason = await refreshAggregate(candidate, evaluation.evaluationResultId, observedAt);
          results.push(reason
            ? { candidateId: candidate.id, status: "failed", evaluation, reason }
            : { candidateId: candidate.id, status: "completed", evaluation });
        } catch (error: unknown) {
          results.push({
            candidateId: candidate.id,
            status: "failed",
            reason: error instanceof Error ? error.message : "unexpected candle evaluation failure"
          });
        }
      }
      return results;
    }
  };
};
