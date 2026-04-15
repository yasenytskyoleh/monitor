import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { SetupRefinementRequestRepository } from "../repositories/setup-refinement-request-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import {
  SetupDefinitionValidationError,
  type CreateSetupDefinitionRevisionRequest,
  type SetupDefinitionService
} from "../services/setup-definition-service.js";
import type {
  CreateSetupDefinitionRevisionCommand,
  SetupDefinitionRevisionResult
} from "../review/index.js";

export type SetupDefinitionRevisionHandoffDependencies = {
  setupDefinitionService: Pick<SetupDefinitionService, "createRevision">;
  setupRefinementRequestRepository: Pick<SetupRefinementRequestRepository, "getById">;
  setupDefinitionRepository: Pick<SetupDefinitionRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected setup definition revision failure";

const isLinkageErrorMessage = (message: string): boolean =>
  message.includes("does not belong") ||
  message.includes("expectedPreviousRevisionId") ||
  message.includes("linkage");

export const createSetupDefinitionRevisionHandoff = (
  dependencies: SetupDefinitionRevisionHandoffDependencies
): {
  create(
    command: CreateSetupDefinitionRevisionCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupDefinitionRevisionResult>;
} => {
  const {
    setupDefinitionService,
    setupRefinementRequestRepository,
    setupDefinitionRepository
  } = dependencies;

  return {
    async create(command, metadata): Promise<SetupDefinitionRevisionResult> {
      let validatedCommand: CreateSetupDefinitionRevisionRequest | null = null;
      try {
        assertRequired(command.setupRefinementRequestId, "setupRefinementRequestId");
        assertRequired(command.setupDefinitionId, "setupDefinitionId");
        assertRequired(command.requestedBy, "requestedBy");
        assertRequired(command.requestedAt, "requestedAt");
        assertRequired(command.revisionSummary, "revisionSummary");
        assertRequired(command.proposedChangedFieldsSummary, "proposedChangedFieldsSummary");

        const refinementRequest = await setupRefinementRequestRepository.getById(
          command.setupRefinementRequestId
        );
        if (!refinementRequest) {
          return {
            status: "rejected_validation",
            reason: `setup_refinement_request not found: ${command.setupRefinementRequestId}`,
            warnings: []
          };
        }

        if (refinementRequest.setupDefinitionId !== command.setupDefinitionId) {
          return {
            status: "rejected_linkage",
            setupRefinementRequestId: refinementRequest.id,
            previousSetupDefinitionId: refinementRequest.setupDefinitionId,
            reason: "setup_refinement_request / setup_definition mismatch in revision command",
            warnings: []
          };
        }

        const setupDefinition = await setupDefinitionRepository.getById(command.setupDefinitionId);
        if (!setupDefinition) {
          return {
            status: "rejected_validation",
            setupRefinementRequestId: refinementRequest.id,
            reason: `setup_definition not found: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        validatedCommand = {
          setupRefinementRequestId: command.setupRefinementRequestId,
          setupDefinitionId: command.setupDefinitionId,
          requestedBy: command.requestedBy,
          requestedAt: command.requestedAt,
          revisionSummary: command.revisionSummary,
          proposedChangedFieldsSummary: command.proposedChangedFieldsSummary,
          proposedDescription: command.proposedDescription,
          proposedMeasurableConditions: command.proposedMeasurableConditions,
          proposedEvaluationAssumptions: command.proposedEvaluationAssumptions,
          proposedInvalidationAssumptions: command.proposedInvalidationAssumptions,
          expectedPreviousRevisionId: command.expectedPreviousRevisionId,
          notes: command.notes,
          originRunId: command.originRunId,
          metadata,
          expectedVersion: null
        };

        const created = await setupDefinitionService.createRevision(validatedCommand);
        if (!created) {
          return {
            status: "rejected_validation",
            setupRefinementRequestId: command.setupRefinementRequestId,
            previousSetupDefinitionId: command.setupDefinitionId,
            reason: `revision target not found for setup_definition: ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        return {
          status: "created",
          setupDefinitionRevisionId: created.revision.id,
          setupRefinementRequestId: created.revision.sourceSetupRefinementRequestId,
          previousSetupDefinitionId: created.previousSetupDefinitionId,
          newSetupDefinitionId: created.newSetupDefinition.id,
          setupFamilyId: created.revision.versionInfo.setupFamilyId,
          version: created.revision.versionInfo.version,
          versionInfo: created.revision.versionInfo,
          revisionStatus: created.revision.revisionStatus,
          warnings: []
        };
      } catch (error: unknown) {
        if (!validatedCommand) {
          return {
            status: "rejected_validation",
            reason: asErrorMessage(error),
            warnings: []
          };
        }

        if (error instanceof SetupDefinitionValidationError) {
          const reason = error.message;
          return {
            status: isLinkageErrorMessage(reason) ? "rejected_linkage" : "rejected_validation",
            setupRefinementRequestId: validatedCommand.setupRefinementRequestId,
            previousSetupDefinitionId: validatedCommand.setupDefinitionId,
            reason,
            warnings: []
          };
        }

        return {
          status: "failed",
          setupRefinementRequestId: validatedCommand.setupRefinementRequestId,
          previousSetupDefinitionId: validatedCommand.setupDefinitionId,
          reason: asErrorMessage(error),
          warnings: ["setup definition revision can be retried after resolving revision creation failure"]
        };
      }
    }
  };
};
