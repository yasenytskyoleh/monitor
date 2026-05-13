import type {
  SetupDefinitionCreateRequest,
  SetupDefinitionRepository,
  SetupDefinitionStatusUpdateRequest,
  SetupDefinitionUpdateRequest
} from "./setup-definition-repository.js";
import type { SetupDefinition } from "../setup-definition.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  type RepositoryOperation
} from "./repository-error.js";

type PersistedSetupDefinitionRecord = {
  definition: SetupDefinition;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneSetupDefinition = (definition: SetupDefinition): SetupDefinition => structuredClone(definition);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedSetupDefinitionRecord,
  expectedVersion: number | null,
  setupDefinitionId: string,
  operation: RepositoryOperation
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw createVersionMismatchRepositoryError({
      entityType: "setup_definition",
      entityId: setupDefinitionId,
      operation,
      expectedVersion,
      actualVersion: record.version
    });
  }
};

const buildUpdatedTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemorySetupDefinitionRepository implements SetupDefinitionRepository {
  private readonly recordsById = new Map<string, PersistedSetupDefinitionRecord>();

  async getById(setupDefinitionId: string): Promise<SetupDefinition | null> {
    const record = this.recordsById.get(setupDefinitionId);
    return record ? cloneSetupDefinition(record.definition) : null;
  }

  async listByStatus(statuses: SetupDefinition["status"][]): Promise<SetupDefinition[]> {
    const allowed = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowed.has(record.definition.status))
      .map((record) => cloneSetupDefinition(record.definition));
  }

  async create(request: SetupDefinitionCreateRequest): Promise<SetupDefinition> {
    const setupDefinitionId = request.definition.id;
    if (this.recordsById.has(setupDefinitionId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_definition",
        entityId: setupDefinitionId,
        operation: "create"
      });
    }

    const definition = cloneSetupDefinition(request.definition);
    this.recordsById.set(setupDefinitionId, {
      definition,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSetupDefinition(definition);
  }

  async update(request: SetupDefinitionUpdateRequest): Promise<SetupDefinition> {
    const setupDefinitionId = request.definition.id;
    const currentRecord = this.recordsById.get(setupDefinitionId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "setup_definition",
        entityId: setupDefinitionId,
        operation: "update"
      });
    }

    assertExpectedVersion(currentRecord, request.expectedVersion, setupDefinitionId, "update");

    const nextDefinition = cloneSetupDefinition(request.definition);
    this.recordsById.set(setupDefinitionId, {
      definition: nextDefinition,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSetupDefinition(nextDefinition);
  }

  async updateStatus(request: SetupDefinitionStatusUpdateRequest): Promise<SetupDefinition | null> {
    const currentRecord = this.recordsById.get(request.setupDefinitionId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(
      currentRecord,
      request.expectedVersion,
      request.setupDefinitionId,
      "update_status"
    );

    const nextDefinition: SetupDefinition = {
      ...currentRecord.definition,
      status: request.status,
      updatedAt: buildUpdatedTimestamp(request.metadata)
    };
    this.recordsById.set(request.setupDefinitionId, {
      definition: nextDefinition,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSetupDefinition(nextDefinition);
  }
}
