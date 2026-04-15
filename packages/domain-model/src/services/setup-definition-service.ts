import type { SetupDefinition } from "../setup-definition.js";
import type { TimestampUtc } from "../common.js";
import type { ResearchDecisionApprovalRepository } from "../repositories/research-decision-approval-repository.js";
import type { SetupRefinementRequestRepository } from "../repositories/setup-refinement-request-repository.js";
import type { SetupDefinitionRevisionRepository } from "../repositories/setup-definition-revision-repository.js";
import type { SetupLifecycleMutationRecordRepository } from "../repositories/setup-lifecycle-mutation-record-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import {
  APPROVED_SETUP_LIFECYCLE_ACTIONS,
  type SetupDefinitionRevision,
  type ApprovedSetupLifecycleAction,
  type SetupLifecycleMutationRecord
} from "../review/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import { SETUP_DEFINITION_STATUSES } from "../setup-definition.js";

export type CreateSetupDefinitionRequest = {
  definition: SetupDefinition;
  metadata: ProductRecordMetadata;
};

export type UpdateSetupDefinitionRequest = {
  definition: SetupDefinition;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ArchiveSetupDefinitionRequest = {
  setupDefinitionId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ActivateSetupDefinitionRequest = {
  setupDefinitionId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ApplyApprovedMutationRequest = {
  researchDecisionApprovalId: string;
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  approvedAction: ApprovedSetupLifecycleAction;
  mutatedBy: string;
  mutatedAt: TimestampUtc;
  notes?: string;
  originRunId?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupLifecycleMutationApplied = {
  updatedSetupDefinition: SetupDefinition;
  mutationRecord: SetupLifecycleMutationRecord;
  previousStatus: SetupDefinition["status"];
  newStatus: SetupDefinition["status"];
};

export type CreateSetupDefinitionRevisionRequest = {
  setupRefinementRequestId: string;
  setupDefinitionId: string;
  requestedBy: string;
  requestedAt: TimestampUtc;
  revisionSummary: string;
  proposedChangedFieldsSummary: string;
  proposedDescription?: string;
  proposedMeasurableConditions?: string[];
  proposedEvaluationAssumptions?: string[];
  proposedInvalidationAssumptions?: string[];
  expectedPreviousRevisionId?: string;
  notes?: string;
  originRunId?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupDefinitionRevisionCreated = {
  previousSetupDefinitionId: string;
  newSetupDefinition: SetupDefinition;
  revision: SetupDefinitionRevision;
};

export type SetupDefinitionServiceDependencies = {
  setupDefinitionRepository: SetupDefinitionRepository;
  researchDecisionApprovalRepository?: Pick<ResearchDecisionApprovalRepository, "getById">;
  setupLifecycleMutationRecordRepository?: SetupLifecycleMutationRecordRepository;
  setupRefinementRequestRepository?: Pick<SetupRefinementRequestRepository, "getById">;
  setupDefinitionRevisionRepository?: SetupDefinitionRevisionRepository;
};

export type SetupDefinitionService = {
  createSetupDefinition(request: CreateSetupDefinitionRequest): Promise<SetupDefinition>;
  updateSetupDefinition(request: UpdateSetupDefinitionRequest): Promise<SetupDefinition>;
  activateSetupDefinition(request: ActivateSetupDefinitionRequest): Promise<SetupDefinition | null>;
  archiveSetupDefinition(request: ArchiveSetupDefinitionRequest): Promise<SetupDefinition | null>;
  applyApprovedMutation(
    request: ApplyApprovedMutationRequest
  ): Promise<SetupLifecycleMutationApplied | null>;
  createRevision(
    request: CreateSetupDefinitionRevisionRequest
  ): Promise<SetupDefinitionRevisionCreated | null>;
};

export class SetupDefinitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupDefinitionValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new SetupDefinitionValidationError(`${fieldName} is required`);
  }
};

const assertValidStatus = (status: SetupDefinition["status"]): void => {
  if (!SETUP_DEFINITION_STATUSES.includes(status)) {
    throw new SetupDefinitionValidationError(`invalid setup_definition status: ${status}`);
  }
};

const validateSetupDefinition = (definition: SetupDefinition): void => {
  assertNonEmptyString(definition.id, "id");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");
  assertValidStatus(definition.status);
  if (definition.measurableConditions.length === 0) {
    throw new SetupDefinitionValidationError("measurableConditions is required");
  }
};

const assertStatusTransitionAllowed = (
  currentStatus: SetupDefinition["status"],
  nextStatus: SetupDefinition["status"]
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (currentStatus === "draft" && nextStatus === "active") {
    return;
  }

  if (currentStatus === "active" && (nextStatus === "paused" || nextStatus === "archived")) {
    return;
  }

  if (currentStatus === "paused" && (nextStatus === "active" || nextStatus === "archived")) {
    return;
  }

  throw new SetupDefinitionValidationError(
    `invalid setup_definition status transition: ${currentStatus} -> ${nextStatus}`
  );
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

const resolveTargetStatus = (
  approvedAction: ApprovedSetupLifecycleAction
): SetupDefinition["status"] => {
  if (approvedAction === "keep_active") {
    return "active";
  }

  if (approvedAction === "pause_setup") {
    return "paused";
  }

  return "archived";
};

const buildMutationId = (request: ApplyApprovedMutationRequest): string =>
  `setup-mutation-${request.setupDefinitionId}-${Date.parse(request.mutatedAt)}`;

const normalizeStringArray = (values: string[] | undefined): string[] | undefined => {
  if (!values) {
    return undefined;
  }

  const normalizedValues = values.map((value) => value.trim()).filter(Boolean);
  return normalizedValues.length > 0 ? normalizedValues : undefined;
};

const buildRevisionId = (setupFamilyId: string, version: number, requestedAt: TimestampUtc): string =>
  `setup-revision-${setupFamilyId}-${version}-${Date.parse(requestedAt)}`;

const buildRevisionSetupDefinitionId = (setupFamilyId: string, version: number): string =>
  `setup-${setupFamilyId}-v${version}`;

export const createSetupDefinitionService = (
  dependencies: SetupDefinitionServiceDependencies
): SetupDefinitionService => {
  const {
    setupDefinitionRepository,
    researchDecisionApprovalRepository,
    setupLifecycleMutationRecordRepository,
    setupRefinementRequestRepository,
    setupDefinitionRevisionRepository
  } = dependencies;

  return {
    async createSetupDefinition(request) {
      validateSetupDefinition(request.definition);
      if (request.definition.status === "archived") {
        throw new SetupDefinitionValidationError(
          "setup_definition cannot be created directly in archived status"
        );
      }

      return setupDefinitionRepository.create({
        definition: request.definition,
        metadata: request.metadata
      });
    },
    async updateSetupDefinition(request) {
      validateSetupDefinition(request.definition);

      const current = await setupDefinitionRepository.getById(request.definition.id);
      if (!current) {
        throw new Error(`setup_definition not found: ${request.definition.id}`);
      }

      if (current.status !== request.definition.status) {
        throw new SetupDefinitionValidationError(
          "setup_definition status changes are only allowed through lifecycle operations"
        );
      }

      return setupDefinitionRepository.update({
        definition: {
          ...request.definition,
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async activateSetupDefinition(request) {
      const current = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!current) {
        return null;
      }

      assertStatusTransitionAllowed(current.status, "active");
      return setupDefinitionRepository.updateStatus({
        setupDefinitionId: request.setupDefinitionId,
        status: "active",
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async archiveSetupDefinition(request) {
      const current = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!current) {
        return null;
      }

      assertStatusTransitionAllowed(current.status, "archived");
      return setupDefinitionRepository.updateStatus({
        setupDefinitionId: request.setupDefinitionId,
        status: "archived",
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async applyApprovedMutation(request) {
      if (!APPROVED_SETUP_LIFECYCLE_ACTIONS.includes(request.approvedAction)) {
        throw new SetupDefinitionValidationError(
          `invalid approvedAction for setup lifecycle mutation: ${request.approvedAction}`
        );
      }

      assertNonEmptyString(request.researchDecisionApprovalId, "researchDecisionApprovalId");
      assertNonEmptyString(request.researchFeedbackDecisionId, "researchFeedbackDecisionId");
      assertNonEmptyString(request.setupDefinitionId, "setupDefinitionId");
      assertNonEmptyString(request.mutatedBy, "mutatedBy");
      assertNonEmptyString(request.mutatedAt, "mutatedAt");

      if (!researchDecisionApprovalRepository) {
        throw new SetupDefinitionValidationError(
          "research_decision_approval repository is required for approved mutation path"
        );
      }

      if (!setupLifecycleMutationRecordRepository) {
        throw new SetupDefinitionValidationError(
          "setup_lifecycle_mutation_record repository is required for approved mutation path"
        );
      }

      const approval = await researchDecisionApprovalRepository.getById(
        request.researchDecisionApprovalId
      );
      if (!approval) {
        return null;
      }

      if (approval.researchFeedbackDecisionId !== request.researchFeedbackDecisionId) {
        throw new SetupDefinitionValidationError(
          `research_decision_approval ${approval.id} does not belong to research_feedback_decision ${request.researchFeedbackDecisionId}`
        );
      }

      if (approval.setupDefinitionId !== request.setupDefinitionId) {
        throw new SetupDefinitionValidationError(
          `research_decision_approval ${approval.id} does not belong to setup_definition ${request.setupDefinitionId}`
        );
      }

      if (approval.approvalOutcome !== "approved") {
        throw new SetupDefinitionValidationError(
          `research_decision_approval outcome does not authorize setup mutation: ${approval.approvalOutcome}`
        );
      }

      if (approval.authorizedNextAction !== request.approvedAction) {
        throw new SetupDefinitionValidationError(
          `approved action mismatch: approval authorizes ${approval.authorizedNextAction ?? "none"}, command requested ${request.approvedAction}`
        );
      }

      const current = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!current) {
        return null;
      }

      const nextStatus = resolveTargetStatus(request.approvedAction);
      assertStatusTransitionAllowed(current.status, nextStatus);

      const updatedSetupDefinition = await setupDefinitionRepository.updateStatus({
        setupDefinitionId: request.setupDefinitionId,
        status: nextStatus,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
      if (!updatedSetupDefinition) {
        throw new SetupDefinitionValidationError(
          `setup_definition not found during approved mutation: ${request.setupDefinitionId}`
        );
      }

      const mutationRecord = await setupLifecycleMutationRecordRepository.create({
        mutation: {
          id: buildMutationId(request),
          setupDefinitionId: request.setupDefinitionId,
          researchDecisionApprovalId: request.researchDecisionApprovalId,
          researchFeedbackDecisionId: request.researchFeedbackDecisionId,
          previousStatus: current.status,
          newStatus: nextStatus,
          approvedAction: request.approvedAction,
          mutatedBy: request.mutatedBy,
          mutatedAt: request.mutatedAt,
          notes: request.notes,
          createdAt: request.mutatedAt,
          updatedAt: request.mutatedAt
        },
        metadata: request.metadata
      });

      return {
        updatedSetupDefinition,
        mutationRecord,
        previousStatus: current.status,
        newStatus: nextStatus
      };
    },
    async createRevision(request) {
      assertNonEmptyString(request.setupRefinementRequestId, "setupRefinementRequestId");
      assertNonEmptyString(request.setupDefinitionId, "setupDefinitionId");
      assertNonEmptyString(request.requestedBy, "requestedBy");
      assertNonEmptyString(request.requestedAt, "requestedAt");
      assertNonEmptyString(request.revisionSummary, "revisionSummary");
      assertNonEmptyString(request.proposedChangedFieldsSummary, "proposedChangedFieldsSummary");

      if (!setupRefinementRequestRepository) {
        throw new SetupDefinitionValidationError(
          "setup_refinement_request repository is required for setup definition revision path"
        );
      }

      if (!setupDefinitionRevisionRepository) {
        throw new SetupDefinitionValidationError(
          "setup_definition_revision repository is required for setup definition revision path"
        );
      }

      const refinementRequest = await setupRefinementRequestRepository.getById(
        request.setupRefinementRequestId
      );
      if (!refinementRequest) {
        return null;
      }

      if (refinementRequest.setupDefinitionId !== request.setupDefinitionId) {
        throw new SetupDefinitionValidationError(
          `setup_refinement_request ${refinementRequest.id} does not belong to setup_definition ${request.setupDefinitionId}`
        );
      }

      const currentDefinition = await setupDefinitionRepository.getById(request.setupDefinitionId);
      if (!currentDefinition) {
        return null;
      }

      const currentRevision = await setupDefinitionRevisionRepository.getBySetupDefinitionId(
        request.setupDefinitionId
      );
      const setupFamilyId = currentRevision
        ? currentRevision.versionInfo.setupFamilyId
        : request.setupDefinitionId;

      const previousRevision = currentRevision ??
        (await setupDefinitionRevisionRepository.getLatestBySetupFamilyId(setupFamilyId));

      if (request.expectedPreviousRevisionId) {
        if (!previousRevision) {
          throw new SetupDefinitionValidationError(
            `expectedPreviousRevisionId does not match linkage: no previous revision exists for setup_family ${setupFamilyId}`
          );
        }

        if (request.expectedPreviousRevisionId !== previousRevision.id) {
          throw new SetupDefinitionValidationError(
            `expectedPreviousRevisionId mismatch: expected ${request.expectedPreviousRevisionId}, got ${previousRevision.id}`
          );
        }
      }

      const previousVersion = previousRevision ? previousRevision.versionInfo.version : 1;
      const nextVersion = previousVersion + 1;
      const newSetupDefinitionId = buildRevisionSetupDefinitionId(setupFamilyId, nextVersion);
      const requestedAt = request.requestedAt;
      const revisionId = buildRevisionId(setupFamilyId, nextVersion, requestedAt);

      const nextDefinition: SetupDefinition = {
        ...currentDefinition,
        id: newSetupDefinitionId,
        description: request.proposedDescription?.trim() || currentDefinition.description,
        measurableConditions: normalizeStringArray(request.proposedMeasurableConditions)
          ?? currentDefinition.measurableConditions,
        evaluationAssumptions: normalizeStringArray(request.proposedEvaluationAssumptions)
          ?? currentDefinition.evaluationAssumptions,
        invalidationAssumptions: normalizeStringArray(request.proposedInvalidationAssumptions)
          ?? currentDefinition.invalidationAssumptions,
        status: "draft",
        createdAt: requestedAt,
        updatedAt: requestedAt
      };

      validateSetupDefinition(nextDefinition);

      const newSetupDefinition = await setupDefinitionRepository.create({
        definition: nextDefinition,
        metadata: request.metadata
      });

      const revision = await setupDefinitionRevisionRepository.create({
        revision: {
          id: revisionId,
          setupDefinitionId: newSetupDefinition.id,
          previousSetupDefinitionId: currentDefinition.id,
          versionInfo: {
            setupFamilyId,
            revisionId,
            version: nextVersion,
            previousRevisionId: previousRevision?.id
          },
          revisionReason: request.revisionSummary,
          revisionStatus: "draft",
          changedFieldsSummary: request.proposedChangedFieldsSummary,
          createdBy: request.requestedBy,
          createdAt: requestedAt,
          notes: request.notes,
          sourceSetupRefinementRequestId: refinementRequest.id,
          sourceResearchDecisionApprovalId: refinementRequest.sourceResearchDecisionApprovalId,
          sourceResearchFeedbackDecisionId: refinementRequest.sourceResearchFeedbackDecisionId,
          updatedAt: requestedAt
        },
        metadata: request.metadata
      });

      return {
        previousSetupDefinitionId: currentDefinition.id,
        newSetupDefinition,
        revision
      };
    }
  };
};
