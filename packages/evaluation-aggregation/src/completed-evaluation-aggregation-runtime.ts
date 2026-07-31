import type {
  AggregationRefreshResult,
  EvaluationResult,
  ProductRecordMetadata,
  SignalCandidate
} from "@monitor/domain-model";

import type {
  CompletedEvaluationAggregationRequest,
  CompletedEvaluationAggregationRuntime,
  CompletedEvaluationAggregationRuntimeOptions
} from "./types.js";

const createRejectedOutcome = (reason: string): AggregationRefreshResult => ({
  status: "rejected_validation",
  reason,
  warnings: []
});

const createFailedOutcome = (error: unknown): AggregationRefreshResult => ({
  status: "failed",
  reason: error instanceof Error ? error.message : "unexpected evaluation aggregation failure",
  warnings: ["aggregation refresh can be retried after resolving runtime failure"]
});

const isValidRequest = (request: CompletedEvaluationAggregationRequest): boolean =>
  request.evaluationResultId.trim().length > 0 &&
  request.triggeredAt.trim().length > 0 &&
  Number.isFinite(Date.parse(request.triggeredAt));

const buildMetadata = (
  evaluationResult: EvaluationResult,
  triggeredAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: evaluationResult.id,
  sourceObservedAtUtc: triggeredAt,
  notes: `completed evaluation aggregation refresh: evaluationResult=${evaluationResult.id}`
});

const buildTrigger = (
  evaluationResult: EvaluationResult,
  candidate: SignalCandidate,
  triggeredAt: string
) => ({
  evaluationResultId: evaluationResult.id,
  signalCandidateId: candidate.id,
  setupDefinitionId: candidate.setupDefinitionId,
  triggeredAt,
  aggregationScopeDescriptor: {
    evaluationWindowId: evaluationResult.evaluationWindowId,
    symbolScope: {
      kind: "single_symbol" as const,
      symbolIds: [candidate.monitoredSymbolId]
    }
  }
});

export const createCompletedEvaluationAggregationRuntime = (
  options: CompletedEvaluationAggregationRuntimeOptions
): CompletedEvaluationAggregationRuntime => ({
  async refreshCompletedEvaluation(request): Promise<AggregationRefreshResult> {
    if (!isValidRequest(request)) {
      return createRejectedOutcome("evaluationResultId and a valid triggeredAt timestamp are required");
    }

    try {
      const evaluationResult = await options.evaluationResultRepository.getById(request.evaluationResultId);
      if (!evaluationResult) {
        return createRejectedOutcome(`evaluation_result not found: ${request.evaluationResultId}`);
      }
      if (evaluationResult.status !== "completed") {
        return {
          status: "rejected_lifecycle",
          reason: `evaluation_result status does not allow aggregation refresh: ${evaluationResult.status}`,
          warnings: []
        };
      }

      const candidate = await options.signalCandidateRepository.getById(evaluationResult.signalCandidateId);
      if (!candidate) {
        return createRejectedOutcome(`signal_candidate not found: ${evaluationResult.signalCandidateId}`);
      }
      if (candidate.id !== evaluationResult.signalCandidateId) {
        return createRejectedOutcome("evaluation result / signal candidate mismatch");
      }

      return await options.aggregationHandoff.refresh(
        buildTrigger(evaluationResult, candidate, request.triggeredAt),
        buildMetadata(evaluationResult, request.triggeredAt)
      );
    } catch (error: unknown) {
      return createFailedOutcome(error);
    }
  }
});
