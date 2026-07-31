import {
  RESEARCH_DECISION_APPROVAL_OUTCOMES,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalResult,
  type ResearchFeedbackDecision,
  type ReviewResearchDecisionCommand
} from "@monitor/domain-model";

import type {
  ManualResearchDecisionApprovalRequest,
  ManualResearchDecisionApprovalRuntime,
  ManualResearchDecisionApprovalRuntimeOptions
} from "./types.js";

const createRejectedOutcome = (
  reason: string,
  request?: ManualResearchDecisionApprovalRequest
): ResearchDecisionApprovalResult => ({
  status: "rejected_validation",
  ...(request
    ? {
        researchFeedbackDecisionId: request.researchFeedbackDecisionId,
        setupDefinitionId: request.setupDefinitionId
      }
    : {}),
  reason,
  warnings: []
});

const createFailedOutcome = (
  error: unknown,
  request: ManualResearchDecisionApprovalRequest
): ResearchDecisionApprovalResult => ({
  status: "failed",
  researchFeedbackDecisionId: request.researchFeedbackDecisionId,
  setupDefinitionId: request.setupDefinitionId,
  reason: error instanceof Error ? error.message : "unexpected manual research decision approval failure",
  warnings: ["manual approval can be retried after resolving runtime failure"]
});

const isValidRequest = (request: ManualResearchDecisionApprovalRequest): boolean =>
  request.researchFeedbackDecisionId.trim().length > 0 &&
  request.setupDefinitionId.trim().length > 0 &&
  request.reviewedBy.trim().length > 0 &&
  request.reviewedAt.trim().length > 0 &&
  Number.isFinite(Date.parse(request.reviewedAt)) &&
  RESEARCH_DECISION_APPROVAL_OUTCOMES.includes(request.decisionOutcome);

const buildCommand = (
  request: ManualResearchDecisionApprovalRequest
): ReviewResearchDecisionCommand => ({
  researchFeedbackDecisionId: request.researchFeedbackDecisionId,
  setupDefinitionId: request.setupDefinitionId,
  reviewedBy: request.reviewedBy,
  reviewedAt: request.reviewedAt,
  decisionOutcome: request.decisionOutcome,
  ...(request.reviewerNotes ? { reviewerNotes: request.reviewerNotes } : {})
});

const buildMetadata = (
  decision: ResearchFeedbackDecision,
  reviewedAt: string
): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: decision.id,
  sourceObservedAtUtc: reviewedAt,
  notes: `manual research decision approval: researchFeedbackDecision=${decision.id}`
});

export const createManualResearchDecisionApprovalRuntime = (
  options: ManualResearchDecisionApprovalRuntimeOptions
): ManualResearchDecisionApprovalRuntime => ({
  async recordManualApproval(request): Promise<ResearchDecisionApprovalResult> {
    if (!isValidRequest(request)) {
      return createRejectedOutcome(
        "researchFeedbackDecisionId, setupDefinitionId, reviewedBy, valid reviewedAt, and decisionOutcome are required"
      );
    }

    try {
      const decision = await options.researchFeedbackDecisionRepository.getById(
        request.researchFeedbackDecisionId
      );
      if (!decision) {
        return createRejectedOutcome(
          `research_feedback_decision not found: ${request.researchFeedbackDecisionId}`,
          request
        );
      }
      if (decision.setupDefinitionId !== request.setupDefinitionId) {
        return createRejectedOutcome(
          "research_feedback_decision / setup_definition mismatch in approval request",
          request
        );
      }
      if (decision.decisionStatus !== "proposed") {
        return {
          status: "rejected_lifecycle",
          researchFeedbackDecisionId: decision.id,
          setupDefinitionId: decision.setupDefinitionId,
          reason: `research_feedback_decision is not eligible for manual approval: ${decision.decisionStatus}`,
          warnings: []
        };
      }

      return await options.researchDecisionApprovalHandoff.review(
        buildCommand(request),
        buildMetadata(decision, request.reviewedAt)
      );
    } catch (error: unknown) {
      return createFailedOutcome(error, request);
    }
  }
});
