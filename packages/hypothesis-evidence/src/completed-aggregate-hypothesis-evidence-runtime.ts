import type {
  HypothesisEvidenceUpdateResult,
  ProductRecordMetadata,
  SetupAggregateResult
} from "@monitor/domain-model";

import type {
  CompletedAggregateHypothesisEvidenceRequest,
  CompletedAggregateHypothesisEvidenceRuntime,
  CompletedAggregateHypothesisEvidenceRuntimeOptions
} from "./types.js";

const createRejectedOutcome = (reason: string): HypothesisEvidenceUpdateResult => ({
  status: "rejected_validation",
  reason,
  warnings: []
});

const createFailedOutcome = (error: unknown): HypothesisEvidenceUpdateResult => ({
  status: "failed",
  reason: error instanceof Error ? error.message : "unexpected hypothesis evidence update failure",
  warnings: ["hypothesis evidence update can be retried after resolving runtime failure"]
});

const isValidRequest = (request: CompletedAggregateHypothesisEvidenceRequest): boolean =>
  request.setupAggregateResultId.trim().length > 0 &&
  request.triggeredAt.trim().length > 0 &&
  Number.isFinite(Date.parse(request.triggeredAt));

const buildMetadata = (
  aggregate: SetupAggregateResult,
  triggeredAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: aggregate.id,
  sourceObservedAtUtc: triggeredAt,
  notes: `completed aggregate hypothesis evidence update: setupAggregateResult=${aggregate.id}`
});

const buildTrigger = (aggregate: SetupAggregateResult, triggeredAt: string) => ({
  setupAggregateResultId: aggregate.id,
  setupDefinitionId: aggregate.setupDefinitionId,
  researchHypothesisId: aggregate.researchHypothesisId,
  triggeredAt,
  evidenceScopeDescriptor: {
    evaluationWindowId: aggregate.aggregationScope.evaluationWindowId,
    symbolScope: aggregate.aggregationScope.symbolScope,
    timeRange: aggregate.aggregationScope.timeRange
  }
});

export const createCompletedAggregateHypothesisEvidenceRuntime = (
  options: CompletedAggregateHypothesisEvidenceRuntimeOptions
): CompletedAggregateHypothesisEvidenceRuntime => ({
  async updateFromCompletedAggregate(request): Promise<HypothesisEvidenceUpdateResult> {
    if (!isValidRequest(request)) {
      return createRejectedOutcome(
        "setupAggregateResultId and a valid triggeredAt timestamp are required"
      );
    }

    try {
      const aggregate = await options.setupAggregateResultRepository.getById(
        request.setupAggregateResultId
      );
      if (!aggregate) {
        return createRejectedOutcome(
          `setup_aggregate_result not found: ${request.setupAggregateResultId}`
        );
      }
      if (aggregate.status !== "completed") {
        return {
          status: "rejected_lifecycle",
          setupAggregateResultId: aggregate.id,
          reason: `setup_aggregate_result status does not allow hypothesis evidence update: ${aggregate.status}`,
          warnings: []
        };
      }

      return await options.hypothesisEvidenceHandoff.update(
        buildTrigger(aggregate, request.triggeredAt),
        buildMetadata(aggregate, request.triggeredAt)
      );
    } catch (error: unknown) {
      return createFailedOutcome(error);
    }
  }
});
