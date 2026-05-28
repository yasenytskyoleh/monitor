import type { JsonObject, TimestampUtc } from "../common.js";
import type {
  HypothesisEvidenceStatus
} from "../research/research-hypothesis-link.js";
import { HYPOTHESIS_EVIDENCE_STATUSES } from "../research/research-hypothesis-link.js";
import type {
  ResearchFeedbackDecision,
  ResearchFeedbackDecisionAction
} from "../research/research-feedback-decision.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type { ResearchHypothesisRepository } from "../repositories/research-hypothesis-repository.js";
import type { ResearchFeedbackDecisionRepository } from "../repositories/research-feedback-decision-repository.js";
import type { ResearchDecisionApprovalRepository } from "../repositories/research-decision-approval-repository.js";
import type {
  FeedbackDecisionApprovalReviewPersistence
} from "../repositories/feedback-decision-approval-review-persistence.js";
import type { SetupRefinementRequestRepository } from "../repositories/setup-refinement-request-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { SetupAggregateResultRepository } from "../repositories/setup-aggregate-result-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import { RESEARCH_HYPOTHESIS_STATUSES } from "../research-hypothesis.js";
import {
  RESEARCH_DECISION_APPROVAL_OUTCOMES,
  type ResearchDecisionApprovalOutcome
} from "../review/approval-outcome.js";
import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { SetupRefinementRequest } from "../review/setup-refinement-request.js";

export type CreateResearchHypothesisRequest = {
  hypothesis: ResearchHypothesis;
  metadata: ProductRecordMetadata;
};

export type UpdateResearchHypothesisRequest = {
  hypothesis: ResearchHypothesis;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type UpdateResearchHypothesisStatusRequest = {
  researchHypothesisId: string;
  status: ResearchHypothesis["status"];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type AttachHypothesisToSetupDefinitionsRequest = {
  researchHypothesisId: string;
  setupDefinitionIds: string[];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type HypothesisEvidenceScopeDescriptor = {
  evaluationWindowId?: string | null;
  symbolScope?: SetupAggregateResult["aggregationScope"]["symbolScope"];
  timeRange?: SetupAggregateResult["aggregationScope"]["timeRange"];
};

export type UpdateHypothesisEvidenceRequest = {
  researchHypothesisId: string;
  setupAggregateResultId: string;
  setupDefinitionId: string;
  aggregateStatus: SetupAggregateResult["status"];
  completedEvaluations: number;
  positiveOutcomeCount: number;
  averageFinalOutcome: number | null;
  averagePercentageMove: number | null;
  assessedAt: TimestampUtc;
  evidenceScopeDescriptor?: HypothesisEvidenceScopeDescriptor;
  originRunId?: string;
  sourceMetadata?: JsonObject;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type HypothesisEvidenceUpdate = {
  hypothesis: ResearchHypothesis;
  setupAggregateResultId: string;
  evidenceStatus: HypothesisEvidenceStatus;
  evidenceSummary: string;
};

export type ReviewSetupFromEvidenceRequest = {
  researchHypothesisId: string;
  setupDefinitionId: string;
  latestEvidenceStatus: HypothesisEvidenceStatus;
  setupAggregateResultId?: string;
  triggeredAt: TimestampUtc;
  evidenceSummary?: string;
  originRunId?: string;
  sourceMetadata?: JsonObject;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupFeedbackReview = {
  decision: ResearchFeedbackDecision;
};

export type ApproveFeedbackDecisionRequest = {
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  reviewedBy: string;
  reviewedAt: TimestampUtc;
  decisionOutcome: ResearchDecisionApprovalOutcome;
  reviewerNotes?: string;
  originRunId?: string;
  sourceMetadata?: JsonObject;
  metadata: ProductRecordMetadata;
};

export type FeedbackDecisionApproval = {
  approval: ResearchDecisionApproval;
  decision: ResearchFeedbackDecision;
};

export type CreateRefinementRequest = {
  researchDecisionApprovalId: string;
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  approvedAction: ResearchFeedbackDecisionAction;
  requestedBy: string;
  requestedAt: TimestampUtc;
  refinementRationaleSummary: string;
  requestedChangesSummary: string;
  evidenceReferences?: string[];
  originRunId?: string;
  sourceMetadata?: JsonObject;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupRefinementFollowUp = {
  request: SetupRefinementRequest;
};

export type ResearchServiceDependencies = {
  researchHypothesisRepository: ResearchHypothesisRepository;
  setupDefinitionRepository: SetupDefinitionRepository;
  researchFeedbackDecisionRepository?: ResearchFeedbackDecisionRepository;
  researchDecisionApprovalRepository?: ResearchDecisionApprovalRepository;
  feedbackDecisionApprovalReviewPersistence?: FeedbackDecisionApprovalReviewPersistence;
  setupRefinementRequestRepository?: SetupRefinementRequestRepository;
  setupAggregateResultRepository?: Pick<SetupAggregateResultRepository, "getById">;
};

export type ResearchService = {
  createResearchHypothesis(request: CreateResearchHypothesisRequest): Promise<ResearchHypothesis>;
  updateResearchHypothesis(request: UpdateResearchHypothesisRequest): Promise<ResearchHypothesis>;
  updateResearchHypothesisStatus(
    request: UpdateResearchHypothesisStatusRequest
  ): Promise<ResearchHypothesis | null>;
  attachHypothesisToSetupDefinitions(
    request: AttachHypothesisToSetupDefinitionsRequest
  ): Promise<ResearchHypothesis | null>;
  updateHypothesisEvidence(
    request: UpdateHypothesisEvidenceRequest
  ): Promise<HypothesisEvidenceUpdate | null>;
  reviewSetupFromEvidence(
    request: ReviewSetupFromEvidenceRequest
  ): Promise<SetupFeedbackReview | null>;
  approveFeedbackDecision(
    request: ApproveFeedbackDecisionRequest
  ): Promise<FeedbackDecisionApproval | null>;
  createRefinementRequest(
    request: CreateRefinementRequest
  ): Promise<SetupRefinementFollowUp | null>;
};

export class ResearchHypothesisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchHypothesisValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new ResearchHypothesisValidationError(`${fieldName} is required`);
  }
};

const assertValidStatus = (status: ResearchHypothesis["status"]): void => {
  if (!RESEARCH_HYPOTHESIS_STATUSES.includes(status)) {
    throw new ResearchHypothesisValidationError(`invalid research_hypothesis status: ${status}`);
  }
};

const assertValidEvidenceStatus = (evidenceStatus: HypothesisEvidenceStatus): void => {
  if (!HYPOTHESIS_EVIDENCE_STATUSES.includes(evidenceStatus)) {
    throw new ResearchHypothesisValidationError(
      `invalid research_hypothesis evidence_status: ${evidenceStatus}`
    );
  }
};

const assertValidApprovalOutcome = (approvalOutcome: ResearchDecisionApprovalOutcome): void => {
  if (!RESEARCH_DECISION_APPROVAL_OUTCOMES.includes(approvalOutcome)) {
    throw new ResearchHypothesisValidationError(
      `invalid research_decision approval outcome: ${approvalOutcome}`
    );
  }
};

const assertNonNegativeInteger = (value: number, fieldName: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new ResearchHypothesisValidationError(`${fieldName} must be a non-negative integer`);
  }
};

const assertNullableFiniteNumber = (
  value: number | null,
  fieldName: string
): void => {
  if (value !== null && !Number.isFinite(value)) {
    throw new ResearchHypothesisValidationError(`${fieldName} must be a finite number or null`);
  }
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

const assertStatusTransitionAllowed = (
  currentStatus: ResearchHypothesis["status"],
  nextStatus: ResearchHypothesis["status"]
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (currentStatus === "draft" && (nextStatus === "active" || nextStatus === "closed")) {
    return;
  }

  if (currentStatus === "active" && (nextStatus === "paused" || nextStatus === "closed")) {
    return;
  }

  if (currentStatus === "paused" && (nextStatus === "active" || nextStatus === "closed")) {
    return;
  }

  throw new ResearchHypothesisValidationError(
    `invalid research_hypothesis status transition: ${currentStatus} -> ${nextStatus}`
  );
};

const validateResearchHypothesis = (hypothesis: ResearchHypothesis): void => {
  assertNonEmptyString(hypothesis.id, "id");
  assertNonEmptyString(hypothesis.title, "title");
  assertNonEmptyString(hypothesis.description, "description");
  assertValidStatus(hypothesis.status);
  if (hypothesis.evidenceStatus) {
    assertValidEvidenceStatus(hypothesis.evidenceStatus);
  }
  if (hypothesis.assumptions.length === 0) {
    throw new ResearchHypothesisValidationError("assumptions is required");
  }
};

const normalizeIds = (ids: string[]): string[] => [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

const validateRelatedSetupIds = async (
  setupDefinitionRepository: SetupDefinitionRepository,
  setupDefinitionIds: string[]
): Promise<void> => {
  const normalizedIds = normalizeIds(setupDefinitionIds);
  for (const setupDefinitionId of normalizedIds) {
    const setupDefinition = await setupDefinitionRepository.getById(setupDefinitionId);
    if (!setupDefinition) {
      throw new ResearchHypothesisValidationError(
        `invalid setup_definition linkage: ${setupDefinitionId} not found`
      );
    }
  }
};

const interpretEvidenceStatus = (
  completedEvaluations: number,
  positiveOutcomeCount: number,
  averageFinalOutcome: number | null,
  averagePercentageMove: number | null
): HypothesisEvidenceStatus => {
  if (
    completedEvaluations === 0 ||
    averageFinalOutcome === null ||
    averagePercentageMove === null
  ) {
    return "inconclusive";
  }

  const positiveRate = positiveOutcomeCount / completedEvaluations;
  if (averageFinalOutcome > 0 && averagePercentageMove > 0 && positiveRate >= 0.6) {
    return "supports";
  }

  if (averageFinalOutcome < 0 && averagePercentageMove < 0 && positiveRate <= 0.4) {
    return "weakens";
  }

  return "inconclusive";
};

const formatMetric = (value: number | null): string => (value === null ? "null" : `${value}`);

const buildEvidenceSummary = (
  request: UpdateHypothesisEvidenceRequest,
  evidenceStatus: HypothesisEvidenceStatus
): string => {
  const scopeWindow = request.evidenceScopeDescriptor?.evaluationWindowId ?? "all_windows";
  return [
    `aggregate=${request.setupAggregateResultId}`,
    `setup=${request.setupDefinitionId}`,
    `window=${scopeWindow}`,
    `status=${evidenceStatus}`,
    `completed=${request.completedEvaluations}`,
    `positive=${request.positiveOutcomeCount}`,
    `avgFinalOutcome=${formatMetric(request.averageFinalOutcome)}`,
    `avgPercentageMove=${formatMetric(request.averagePercentageMove)}`
  ].join("; ");
};

const resolveFeedbackDecisionAction = (
  latestEvidenceStatus: HypothesisEvidenceStatus,
  hypothesisStatus: ResearchHypothesis["status"]
): ResearchFeedbackDecisionAction => {
  if (latestEvidenceStatus === "supports") {
    return "keep_active";
  }

  if (latestEvidenceStatus === "inconclusive") {
    return "manual_review_required";
  }

  if (hypothesisStatus === "draft") {
    return "refine_definition";
  }

  if (hypothesisStatus === "active") {
    return "pause_setup";
  }

  if (hypothesisStatus === "paused") {
    return "archive_setup";
  }

  return "manual_review_required";
};

const buildFeedbackRationale = (
  request: ReviewSetupFromEvidenceRequest,
  hypothesisStatus: ResearchHypothesis["status"],
  recommendedAction: ResearchFeedbackDecisionAction
): string =>
  [
    `evidence_status=${request.latestEvidenceStatus}`,
    `hypothesis_status=${hypothesisStatus}`,
    `recommended_action=${recommendedAction}`,
    `setup=${request.setupDefinitionId}`,
    `aggregate=${request.setupAggregateResultId ?? "none"}`,
    `evidence_summary=${request.evidenceSummary ?? "none"}`
  ].join("; ");

const buildFeedbackDecisionId = (
  request: ReviewSetupFromEvidenceRequest
): string => {
  const timestampToken = String(Date.parse(request.triggeredAt));
  return `feedback-${request.setupDefinitionId}-${request.researchHypothesisId}-${timestampToken}`;
};

const buildApprovalId = (
  request: ApproveFeedbackDecisionRequest
): string => {
  const timestampToken = String(Date.parse(request.reviewedAt));
  return `approval-${request.researchFeedbackDecisionId}-${timestampToken}`;
};

const buildRefinementRequestId = (
  request: CreateRefinementRequest
): string => {
  const timestampToken = String(Date.parse(request.requestedAt));
  return `setup-refinement-${request.setupDefinitionId}-${timestampToken}`;
};

const normalizeEvidenceReferences = (evidenceReferences?: string[]): string[] | undefined => {
  if (!evidenceReferences) {
    return undefined;
  }

  const normalized = [...new Set(evidenceReferences.map((reference) => reference.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
};

const mapApprovalOutcomeToDecisionStatus = (
  approvalOutcome: ResearchDecisionApprovalOutcome
): ResearchFeedbackDecision["decisionStatus"] => {
  if (approvalOutcome === "approved") {
    return "accepted";
  }

  if (approvalOutcome === "rejected") {
    return "rejected";
  }

  return "reviewed";
};

const resolveAuthorizedNextAction = (
  approvalOutcome: ResearchDecisionApprovalOutcome,
  recommendedAction: ResearchFeedbackDecisionAction
): ResearchFeedbackDecisionAction | undefined =>
  approvalOutcome === "approved" ? recommendedAction : undefined;

export const createResearchService = (dependencies: ResearchServiceDependencies): ResearchService => {
  const {
    researchHypothesisRepository,
    setupDefinitionRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository,
    feedbackDecisionApprovalReviewPersistence,
    setupRefinementRequestRepository,
    setupAggregateResultRepository
  } = dependencies;

  return {
    async createResearchHypothesis(request) {
      validateResearchHypothesis(request.hypothesis);
      await validateRelatedSetupIds(
        setupDefinitionRepository,
        request.hypothesis.relatedSetupDefinitionIds
      );
      return researchHypothesisRepository.create({
        hypothesis: {
          ...request.hypothesis,
          relatedSetupDefinitionIds: normalizeIds(request.hypothesis.relatedSetupDefinitionIds)
        },
        metadata: request.metadata
      });
    },
    async updateResearchHypothesis(request) {
      validateResearchHypothesis(request.hypothesis);
      await validateRelatedSetupIds(
        setupDefinitionRepository,
        request.hypothesis.relatedSetupDefinitionIds
      );

      const current = await researchHypothesisRepository.getById(request.hypothesis.id);
      if (!current) {
        throw new Error(`research_hypothesis not found: ${request.hypothesis.id}`);
      }

      if (current.status !== request.hypothesis.status) {
        throw new ResearchHypothesisValidationError(
          "research_hypothesis status changes are only allowed through lifecycle operations"
        );
      }

      return researchHypothesisRepository.update({
        hypothesis: {
          ...request.hypothesis,
          relatedSetupDefinitionIds: normalizeIds(request.hypothesis.relatedSetupDefinitionIds),
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async updateResearchHypothesisStatus(request) {
      assertValidStatus(request.status);

      const current = await researchHypothesisRepository.getById(request.researchHypothesisId);
      if (!current) {
        return null;
      }

      assertStatusTransitionAllowed(current.status, request.status);
      return researchHypothesisRepository.updateStatus({
        researchHypothesisId: request.researchHypothesisId,
        status: request.status,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async attachHypothesisToSetupDefinitions(request) {
      const current = await researchHypothesisRepository.getById(request.researchHypothesisId);
      if (!current) {
        return null;
      }

      const setupDefinitionIds = normalizeIds(request.setupDefinitionIds);
      if (setupDefinitionIds.length === 0) {
        throw new ResearchHypothesisValidationError(
          "setupDefinitionIds must contain at least one setup_definition id"
        );
      }

      await validateRelatedSetupIds(setupDefinitionRepository, setupDefinitionIds);

      const mergedSetupDefinitionIds = normalizeIds([
        ...current.relatedSetupDefinitionIds,
        ...setupDefinitionIds
      ]);
      return researchHypothesisRepository.update({
        hypothesis: {
          ...current,
          relatedSetupDefinitionIds: mergedSetupDefinitionIds,
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async updateHypothesisEvidence(request) {
      assertNonEmptyString(request.researchHypothesisId, "researchHypothesisId");
      assertNonEmptyString(request.setupAggregateResultId, "setupAggregateResultId");
      assertNonEmptyString(request.setupDefinitionId, "setupDefinitionId");
      assertNonEmptyString(request.assessedAt, "assessedAt");
      assertNonNegativeInteger(request.completedEvaluations, "completedEvaluations");
      assertNonNegativeInteger(request.positiveOutcomeCount, "positiveOutcomeCount");
      assertNullableFiniteNumber(request.averageFinalOutcome, "averageFinalOutcome");
      assertNullableFiniteNumber(request.averagePercentageMove, "averagePercentageMove");

      if (request.positiveOutcomeCount > request.completedEvaluations) {
        throw new ResearchHypothesisValidationError(
          "positiveOutcomeCount cannot exceed completedEvaluations"
        );
      }

      if (request.aggregateStatus !== "completed") {
        throw new ResearchHypothesisValidationError(
          `setup_aggregate_result status does not allow hypothesis evidence update: ${request.aggregateStatus}`
        );
      }

      const hypothesis = await researchHypothesisRepository.getById(request.researchHypothesisId);
      if (!hypothesis) {
        return null;
      }

      if (!hypothesis.relatedSetupDefinitionIds.includes(request.setupDefinitionId)) {
        throw new ResearchHypothesisValidationError(
          `hypothesis ${request.researchHypothesisId} is not linked to setup_definition ${request.setupDefinitionId}`
        );
      }

      const evidenceStatus = interpretEvidenceStatus(
        request.completedEvaluations,
        request.positiveOutcomeCount,
        request.averageFinalOutcome,
        request.averagePercentageMove
      );
      const evidenceSummary = buildEvidenceSummary(request, evidenceStatus);

      const updatedHypothesis = await researchHypothesisRepository.update({
        hypothesis: {
          ...hypothesis,
          notes: [...hypothesis.notes, evidenceSummary],
          evidenceStatus,
          evidenceSummary,
          lastEvidenceAggregateResultId: request.setupAggregateResultId,
          lastEvidenceAssessedAt: request.assessedAt,
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });

      return {
        hypothesis: updatedHypothesis,
        setupAggregateResultId: request.setupAggregateResultId,
        evidenceStatus,
        evidenceSummary
      };
    },
    async reviewSetupFromEvidence(request) {
      assertNonEmptyString(request.researchHypothesisId, "researchHypothesisId");
      assertNonEmptyString(request.setupDefinitionId, "setupDefinitionId");
      assertNonEmptyString(request.triggeredAt, "triggeredAt");
      assertValidEvidenceStatus(request.latestEvidenceStatus);

      const hypothesis = await researchHypothesisRepository.getById(request.researchHypothesisId);
      if (!hypothesis) {
        return null;
      }

      const setupDefinition = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!setupDefinition) {
        throw new ResearchHypothesisValidationError(
          `setup_definition not found: ${request.setupDefinitionId}`
        );
      }

      if (!hypothesis.relatedSetupDefinitionIds.includes(setupDefinition.id)) {
        throw new ResearchHypothesisValidationError(
          `hypothesis ${request.researchHypothesisId} is not linked to setup_definition ${setupDefinition.id}`
        );
      }

      if (!hypothesis.evidenceStatus) {
        throw new ResearchHypothesisValidationError(
          `research_hypothesis has no evidence status to review: ${hypothesis.id}`
        );
      }

      if (hypothesis.evidenceStatus !== request.latestEvidenceStatus) {
        throw new ResearchHypothesisValidationError(
          `latestEvidenceStatus does not match research_hypothesis evidenceStatus: ${request.latestEvidenceStatus} vs ${hypothesis.evidenceStatus}`
        );
      }

      if (request.setupAggregateResultId) {
        if (!setupAggregateResultRepository) {
          throw new ResearchHypothesisValidationError(
            "setup_aggregate_result repository is required for aggregate-linked feedback review"
          );
        }

        const aggregateResult = await setupAggregateResultRepository.getById(
          request.setupAggregateResultId
        );
        if (!aggregateResult) {
          throw new ResearchHypothesisValidationError(
            `setup_aggregate_result not found: ${request.setupAggregateResultId}`
          );
        }

        if (aggregateResult.setupDefinitionId !== setupDefinition.id) {
          throw new ResearchHypothesisValidationError(
            `setup_aggregate_result ${aggregateResult.id} does not belong to setup_definition ${setupDefinition.id}`
          );
        }

        if (
          aggregateResult.researchHypothesisId &&
          aggregateResult.researchHypothesisId !== hypothesis.id
        ) {
          throw new ResearchHypothesisValidationError(
            `setup_aggregate_result ${aggregateResult.id} does not belong to research_hypothesis ${hypothesis.id}`
          );
        }
      }

      if (!researchFeedbackDecisionRepository) {
        throw new ResearchHypothesisValidationError(
          "research_feedback_decision repository is required for setup feedback review"
        );
      }

      const recommendedAction = resolveFeedbackDecisionAction(
        request.latestEvidenceStatus,
        hypothesis.status
      );

      const decision = await researchFeedbackDecisionRepository.create({
        decision: {
          id: buildFeedbackDecisionId(request),
          setupDefinitionId: setupDefinition.id,
          researchHypothesisId: hypothesis.id,
          setupAggregateResultId: request.setupAggregateResultId,
          evidenceStatus: request.latestEvidenceStatus,
          recommendedAction,
          rationaleSummary: buildFeedbackRationale(request, hypothesis.status, recommendedAction),
          decisionStatus: "proposed",
          requiresManualReview: true,
          evidenceSummary: request.evidenceSummary,
          createdAt: request.triggeredAt,
          updatedAt: request.triggeredAt
        },
        metadata: request.metadata
      });

      return { decision };
    },
    async approveFeedbackDecision(request) {
      assertNonEmptyString(request.researchFeedbackDecisionId, "researchFeedbackDecisionId");
      assertNonEmptyString(request.setupDefinitionId, "setupDefinitionId");
      assertNonEmptyString(request.reviewedBy, "reviewedBy");
      assertNonEmptyString(request.reviewedAt, "reviewedAt");
      assertValidApprovalOutcome(request.decisionOutcome);

      if (!researchFeedbackDecisionRepository) {
        throw new ResearchHypothesisValidationError(
          "research_feedback_decision repository is required for approval review"
        );
      }

      if (!feedbackDecisionApprovalReviewPersistence) {
        throw new ResearchHypothesisValidationError(
          "atomic feedback-decision approval persistence is required for approval review"
        );
      }

      const decision = await researchFeedbackDecisionRepository.getById(
        request.researchFeedbackDecisionId
      );
      if (!decision) {
        return null;
      }

      if (decision.setupDefinitionId !== request.setupDefinitionId) {
        throw new ResearchHypothesisValidationError(
          `research_feedback_decision ${decision.id} does not belong to setup_definition ${request.setupDefinitionId}`
        );
      }

      if (decision.decisionStatus !== "proposed") {
        throw new ResearchHypothesisValidationError(
          `research_feedback_decision is not eligible for approval in status: ${decision.decisionStatus}`
        );
      }

      const setupDefinition = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!setupDefinition) {
        throw new ResearchHypothesisValidationError(
          `setup_definition not found: ${request.setupDefinitionId}`
        );
      }

      const nextDecisionStatus = mapApprovalOutcomeToDecisionStatus(request.decisionOutcome);
      const authorizedNextAction = resolveAuthorizedNextAction(
        request.decisionOutcome,
        decision.recommendedAction
      );

      const reviewerMetadata: JsonObject = {
        reviewedBy: request.reviewedBy,
        reviewedAt: request.reviewedAt,
        approvalOutcome: request.decisionOutcome,
        ...(request.reviewerNotes ? { reviewerNotes: request.reviewerNotes } : {})
      };

      const persistenceResult =
        await feedbackDecisionApprovalReviewPersistence.recordFeedbackDecisionApproval({
          researchFeedbackDecisionId: decision.id,
          nextDecisionStatus,
          reviewerMetadata,
          approval: {
            id: buildApprovalId(request),
            researchFeedbackDecisionId: decision.id,
            setupDefinitionId: setupDefinition.id,
            reviewedBy: request.reviewedBy,
            reviewedAt: request.reviewedAt,
            approvalOutcome: request.decisionOutcome,
            reviewerNotes: request.reviewerNotes,
            approvalStatus: "recorded",
            authorizedNextAction,
            createdAt: request.reviewedAt,
            updatedAt: request.reviewedAt
          },
          metadata: request.metadata
        });

      if (persistenceResult.status === "not_found") {
        return null;
      }

      if (persistenceResult.status === "conflict") {
        throw new ResearchHypothesisValidationError(
          `research_feedback_decision is not eligible for approval in status: ${persistenceResult.currentDecision.decisionStatus}`
        );
      }

      return persistenceResult;
    },
    async createRefinementRequest(request) {
      assertNonEmptyString(request.researchDecisionApprovalId, "researchDecisionApprovalId");
      assertNonEmptyString(request.researchFeedbackDecisionId, "researchFeedbackDecisionId");
      assertNonEmptyString(request.setupDefinitionId, "setupDefinitionId");
      assertNonEmptyString(request.approvedAction, "approvedAction");
      assertNonEmptyString(request.requestedBy, "requestedBy");
      assertNonEmptyString(request.requestedAt, "requestedAt");
      assertNonEmptyString(request.refinementRationaleSummary, "refinementRationaleSummary");
      assertNonEmptyString(request.requestedChangesSummary, "requestedChangesSummary");

      if (request.approvedAction !== "refine_definition") {
        throw new ResearchHypothesisValidationError(
          `approved action does not authorize setup refinement request creation: ${request.approvedAction}`
        );
      }

      if (!researchDecisionApprovalRepository) {
        throw new ResearchHypothesisValidationError(
          "research_decision_approval repository is required for setup refinement request creation"
        );
      }

      if (!setupRefinementRequestRepository) {
        throw new ResearchHypothesisValidationError(
          "setup_refinement_request repository is required for setup refinement request creation"
        );
      }

      const approval = await researchDecisionApprovalRepository.getById(
        request.researchDecisionApprovalId
      );
      if (!approval) {
        return null;
      }

      if (approval.researchFeedbackDecisionId !== request.researchFeedbackDecisionId) {
        throw new ResearchHypothesisValidationError(
          `research_decision_approval ${approval.id} does not belong to research_feedback_decision ${request.researchFeedbackDecisionId}`
        );
      }

      if (approval.setupDefinitionId !== request.setupDefinitionId) {
        throw new ResearchHypothesisValidationError(
          `research_decision_approval ${approval.id} does not belong to setup_definition ${request.setupDefinitionId}`
        );
      }

      if (approval.approvalOutcome !== "approved") {
        throw new ResearchHypothesisValidationError(
          `research_decision_approval outcome does not authorize setup refinement request creation: ${approval.approvalOutcome}`
        );
      }

      if (approval.authorizedNextAction !== "refine_definition") {
        throw new ResearchHypothesisValidationError(
          `research_decision_approval does not authorize refine_definition action: ${approval.authorizedNextAction ?? "none"}`
        );
      }

      const setupDefinition = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!setupDefinition) {
        return null;
      }

      const refinementRequest = await setupRefinementRequestRepository.create({
        request: {
          id: buildRefinementRequestId(request),
          setupDefinitionId: request.setupDefinitionId,
          sourceResearchDecisionApprovalId: request.researchDecisionApprovalId,
          sourceResearchFeedbackDecisionId: request.researchFeedbackDecisionId,
          refinementRationaleSummary: request.refinementRationaleSummary,
          requestedChangesSummary: request.requestedChangesSummary,
          evidenceReferences: normalizeEvidenceReferences(request.evidenceReferences),
          status: "proposed",
          requestedBy: request.requestedBy,
          requestedAt: request.requestedAt,
          createdAt: request.requestedAt,
          updatedAt: request.requestedAt
        },
        metadata: request.metadata
      });

      return { request: refinementRequest };
    }
  };
};
