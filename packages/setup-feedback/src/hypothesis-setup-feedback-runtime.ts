import type {
  FeedbackDecisionResult,
  HypothesisEvidenceStatus,
  HypothesisFeedbackDecisionTrigger,
  ProductRecordMetadata,
  ResearchHypothesis
} from "@monitor/domain-model";

import type {
  HypothesisSetupFeedbackRequest,
  HypothesisSetupFeedbackRuntime,
  HypothesisSetupFeedbackRuntimeOptions
} from "./types.js";

const createRejectedOutcome = (
  reason: string,
  request?: HypothesisSetupFeedbackRequest
): FeedbackDecisionResult => ({
  status: "rejected_validation",
  ...(request
    ? {
        researchHypothesisId: request.researchHypothesisId,
        setupDefinitionId: request.setupDefinitionId
      }
    : {}),
  reason,
  warnings: []
});

const createFailedOutcome = (
  error: unknown,
  request: HypothesisSetupFeedbackRequest
): FeedbackDecisionResult => ({
  status: "failed",
  researchHypothesisId: request.researchHypothesisId,
  setupDefinitionId: request.setupDefinitionId,
  reason: error instanceof Error ? error.message : "unexpected hypothesis setup feedback failure",
  warnings: ["setup feedback review can be retried after resolving runtime failure"]
});

const isValidRequest = (request: HypothesisSetupFeedbackRequest): boolean =>
  request.researchHypothesisId.trim().length > 0 &&
  request.setupDefinitionId.trim().length > 0 &&
  request.triggeredAt.trim().length > 0 &&
  Number.isFinite(Date.parse(request.triggeredAt));

const buildTrigger = (
  hypothesis: ResearchHypothesis,
  request: HypothesisSetupFeedbackRequest,
  evidenceStatus: HypothesisEvidenceStatus
): HypothesisFeedbackDecisionTrigger => ({
  researchHypothesisId: hypothesis.id,
  setupDefinitionId: request.setupDefinitionId,
  latestEvidenceStatus: evidenceStatus,
  ...(hypothesis.lastEvidenceAggregateResultId
    ? { setupAggregateResultId: hypothesis.lastEvidenceAggregateResultId }
    : {}),
  triggeredAt: request.triggeredAt,
  ...(hypothesis.evidenceSummary ? { evidenceSummary: hypothesis.evidenceSummary } : {})
});

const buildMetadata = (
  hypothesis: ResearchHypothesis,
  triggeredAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: hypothesis.lastEvidenceAggregateResultId ?? hypothesis.id,
  sourceObservedAtUtc: triggeredAt,
  notes: `hypothesis setup feedback review: researchHypothesis=${hypothesis.id}`
});

export const createHypothesisSetupFeedbackRuntime = (
  options: HypothesisSetupFeedbackRuntimeOptions
): HypothesisSetupFeedbackRuntime => ({
  async reviewFromHypothesis(request): Promise<FeedbackDecisionResult> {
    if (!isValidRequest(request)) {
      return createRejectedOutcome(
        "researchHypothesisId, setupDefinitionId, and a valid triggeredAt timestamp are required"
      );
    }

    try {
      const hypothesis = await options.researchHypothesisRepository.getById(
        request.researchHypothesisId
      );
      if (!hypothesis) {
        return createRejectedOutcome(
          `research_hypothesis not found: ${request.researchHypothesisId}`,
          request
        );
      }
      const evidenceStatus = hypothesis.evidenceStatus;
      if (!evidenceStatus) {
        return createRejectedOutcome(
          `research_hypothesis has no evidence status to review: ${hypothesis.id}`,
          request
        );
      }

      return await options.hypothesisSetupFeedbackHandoff.review(
        buildTrigger(hypothesis, request, evidenceStatus),
        buildMetadata(hypothesis, request.triggeredAt)
      );
    } catch (error: unknown) {
      return createFailedOutcome(error, request);
    }
  }
});
