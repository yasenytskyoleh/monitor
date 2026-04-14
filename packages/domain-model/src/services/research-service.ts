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
    }
  };
};
