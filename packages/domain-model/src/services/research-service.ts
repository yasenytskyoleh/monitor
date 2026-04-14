import type { JsonObject, TimestampUtc } from "../common.js";
import type {
  HypothesisEvidenceStatus
} from "../research/research-hypothesis-link.js";
import { HYPOTHESIS_EVIDENCE_STATUSES } from "../research/research-hypothesis-link.js";
import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type {
  ResearchHypothesisRepository
} from "../repositories/research-hypothesis-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import { RESEARCH_HYPOTHESIS_STATUSES } from "../research-hypothesis.js";

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

export type ResearchServiceDependencies = {
  researchHypothesisRepository: ResearchHypothesisRepository;
  setupDefinitionRepository: SetupDefinitionRepository;
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

export const createResearchService = (dependencies: ResearchServiceDependencies): ResearchService => {
  const { researchHypothesisRepository, setupDefinitionRepository } = dependencies;

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
    }
  };
};
