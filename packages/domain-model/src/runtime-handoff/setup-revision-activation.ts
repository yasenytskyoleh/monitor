import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { SetupDefinitionRevisionRepository } from "../repositories/setup-definition-revision-repository.js";
import {
  SetupDefinitionValidationError,
  type ActivateSetupRevisionRequest,
  type SetupDefinitionService
} from "../services/setup-definition-service.js";
import type {
  ActivateSetupDefinitionRevisionCommand,
  SetupRevisionActivationResult
} from "../review/index.js";

export type SetupRevisionActivationHandoffDependencies = {
  setupDefinitionService: Pick<SetupDefinitionService, "activateRevision">;
  setupDefinitionRevisionRepository: Pick<SetupDefinitionRevisionRepository, "getById">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected setup revision activation failure";

export const createSetupRevisionActivationHandoff = (
  dependencies: SetupRevisionActivationHandoffDependencies
): {
  activate(
    command: ActivateSetupDefinitionRevisionCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupRevisionActivationResult>;
} => {
  const {
    setupDefinitionService,
    setupDefinitionRevisionRepository
  } = dependencies;

  return {
    async activate(command, metadata): Promise<SetupRevisionActivationResult> {
      let validatedCommand: ActivateSetupRevisionRequest | null = null;
      try {
        assertRequired(command.targetRevisionId, "targetRevisionId");
        assertRequired(command.activatedBy, "activatedBy");
        assertRequired(command.activatedAt, "activatedAt");

        if (!command.setupFamilyId && !command.setupDefinitionId) {
          return {
            status: "rejected",
            reason: "setupFamilyId or setupDefinitionId is required",
            warnings: []
          };
        }

        const targetRevision = await setupDefinitionRevisionRepository.getById(command.targetRevisionId);
        if (!targetRevision) {
          return {
            status: "rejected",
            reason: `setup_definition_revision not found: ${command.targetRevisionId}`,
            warnings: []
          };
        }

        if (command.setupFamilyId && command.setupFamilyId !== targetRevision.versionInfo.setupFamilyId) {
          return {
            status: "rejected",
            targetRevisionId: targetRevision.id,
            setupFamilyId: targetRevision.versionInfo.setupFamilyId,
            reason: `target revision ${targetRevision.id} does not belong to setup_family ${command.setupFamilyId}`,
            warnings: []
          };
        }

        if (
          command.setupDefinitionId &&
          command.setupDefinitionId !== targetRevision.setupDefinitionId &&
          command.setupDefinitionId !== targetRevision.versionInfo.setupFamilyId
        ) {
          return {
            status: "rejected",
            targetRevisionId: targetRevision.id,
            targetSetupDefinitionId: targetRevision.setupDefinitionId,
            setupFamilyId: targetRevision.versionInfo.setupFamilyId,
            reason: `target revision ${targetRevision.id} does not match setup_definition selector ${command.setupDefinitionId}`,
            warnings: []
          };
        }

        validatedCommand = {
          setupDefinitionId: command.setupDefinitionId,
          setupFamilyId: command.setupFamilyId,
          targetRevisionId: command.targetRevisionId,
          activatedBy: command.activatedBy,
          activatedAt: command.activatedAt,
          rationale: command.rationale,
          previousActiveRevisionId: command.previousActiveRevisionId,
          originRunId: command.originRunId,
          metadata,
          expectedVersion: null
        };

        const activated = await setupDefinitionService.activateRevision(validatedCommand);
        if (!activated) {
          return {
            status: "rejected",
            targetRevisionId: command.targetRevisionId,
            reason: `activation target not found for setup_definition_revision: ${command.targetRevisionId}`,
            warnings: []
          };
        }

        return {
          status: activated.activationOutcome,
          setupRevisionActivationRecordId: activated.activationRecord.id,
          setupFamilyId: activated.activationRecord.setupFamilyId,
          targetRevisionId: activated.activationRecord.targetRevisionId,
          targetSetupDefinitionId: activated.activationRecord.targetSetupDefinitionId,
          previousRevisionId: activated.activationRecord.previousRevisionId,
          previousSetupDefinitionId: activated.activationRecord.previousSetupDefinitionId,
          activationOutcome: activated.activationOutcome,
          warnings: []
        };
      } catch (error: unknown) {
        if (!validatedCommand) {
          return {
            status: "rejected",
            reason: asErrorMessage(error),
            warnings: []
          };
        }

        if (error instanceof SetupDefinitionValidationError) {
          return {
            status: "rejected",
            targetRevisionId: validatedCommand.targetRevisionId,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          targetRevisionId: validatedCommand.targetRevisionId,
          reason: asErrorMessage(error),
          warnings: [
            "setup revision activation can be retried after resolving activation failure"
          ]
        };
      }
    }
  };
};
