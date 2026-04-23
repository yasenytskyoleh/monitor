import {
  SetupDefinitionValidationError,
  type ResolveActiveRevisionRequest,
  type SetupDefinitionService
} from "../services/setup-definition-service.js";
import type { ResolveActiveSetupRevisionCommand } from "./resolve-active-setup-revision-command.js";
import type { SetupRevisionResolutionResult } from "./setup-revision-resolution-result.js";

export type ActiveSetupRevisionResolutionHandoffDependencies = {
  setupDefinitionService: Pick<SetupDefinitionService, "resolveActiveRevision">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected setup revision resolution failure";

export const createActiveSetupRevisionResolutionHandoff = (
  dependencies: ActiveSetupRevisionResolutionHandoffDependencies
): {
  resolve(command: ResolveActiveSetupRevisionCommand): Promise<SetupRevisionResolutionResult>;
} => {
  const { setupDefinitionService } = dependencies;

  return {
    async resolve(command): Promise<SetupRevisionResolutionResult> {
      let validatedCommand: ResolveActiveRevisionRequest | null = null;
      try {
        assertRequired(command.resolvedAt, "resolvedAt");
        if (!command.setupDefinitionId && !command.setupFamilyId) {
          return {
            status: "rejected",
            reason: "setupDefinitionId or setupFamilyId is required",
            warnings: []
          };
        }

        validatedCommand = {
          setupDefinitionId: command.setupDefinitionId,
          setupFamilyId: command.setupFamilyId,
          resolvedAt: command.resolvedAt,
          runtimeContext: command.runtimeContext,
          originRunId: command.originRunId
        };

        const resolution = await setupDefinitionService.resolveActiveRevision(validatedCommand);
        if (!resolution) {
          return {
            status: "rejected",
            reason: "active setup revision not found for requested selector",
            warnings: []
          };
        }

        return {
          status: "resolved",
          resolution: {
            resolvedAt: resolution.resolvedAt,
            revisionRef: {
              setupFamilyId: resolution.setupFamilyId,
              setupDefinitionId: resolution.setupDefinitionId,
              setupRevisionId: resolution.setupRevisionId,
              version: resolution.version
            },
            effectiveStatus: resolution.effectiveStatus,
            revisionStatus: resolution.revisionStatus,
            activationMetadata: resolution.activationMetadata
              ? {
                setupRevisionActivationRecordId: resolution.activationMetadata.setupRevisionActivationRecordId,
                activationOutcome: resolution.activationMetadata.activationOutcome,
                activatedAt: resolution.activationMetadata.activatedAt
              }
              : undefined
          },
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
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          reason: asErrorMessage(error),
          warnings: [
            "active setup revision resolution can be retried after resolving runtime read failure"
          ]
        };
      }
    }
  };
};
