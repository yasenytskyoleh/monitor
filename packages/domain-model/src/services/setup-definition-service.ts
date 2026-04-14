import type { SetupDefinition } from "../setup-definition.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
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

export type SetupDefinitionServiceDependencies = {
  setupDefinitionRepository: SetupDefinitionRepository;
};

export type SetupDefinitionService = {
  createSetupDefinition(request: CreateSetupDefinitionRequest): Promise<SetupDefinition>;
  updateSetupDefinition(request: UpdateSetupDefinitionRequest): Promise<SetupDefinition>;
  activateSetupDefinition(request: ActivateSetupDefinitionRequest): Promise<SetupDefinition | null>;
  archiveSetupDefinition(request: ArchiveSetupDefinitionRequest): Promise<SetupDefinition | null>;
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

  if ((currentStatus === "draft" || currentStatus === "active") && nextStatus === "archived") {
    return;
  }

  throw new SetupDefinitionValidationError(
    `invalid setup_definition status transition: ${currentStatus} -> ${nextStatus}`
  );
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export const createSetupDefinitionService = (
  dependencies: SetupDefinitionServiceDependencies
): SetupDefinitionService => {
  const { setupDefinitionRepository } = dependencies;

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
    }
  };
};
