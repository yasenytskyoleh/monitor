import type {
  SetupDefinitionCreateRequest,
  SetupDefinitionRepository,
  SetupDefinitionStatusUpdateRequest,
  SetupDefinitionUpdateRequest
} from "./setup-definition-repository.js";
import type { FirstDurableRelationalRepositoryAdapter } from "./first-durable-relational-repository-adapter.js";
import {
  dehydrateSetupDefinitionToDurableRecord,
  hydrateSetupDefinitionFromDurableRecord
} from "./first-durable-relational-repository-mappers.js";
import { createNotFoundRepositoryError } from "./repository-error.js";
import type { SetupDefinition } from "../setup-definition.js";
import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextSetupDefinitionRecord = (
  definition: SetupDefinition,
  metadata: SetupDefinitionStatusUpdateRequest["metadata"] | SetupDefinitionUpdateRequest["metadata"],
  currentRecord: SetupDefinitionDurableRecord
): SetupDefinitionDurableRecord =>
  dehydrateSetupDefinitionToDurableRecord(definition, metadata, currentRecord.identity.version + 1);

export class RelationalSetupDefinitionRepository implements SetupDefinitionRepository {
  constructor(private readonly adapter: FirstDurableRelationalRepositoryAdapter) {}

  async getById(setupDefinitionId: string): Promise<SetupDefinition | null> {
    const record = await this.adapter.loadSetupDefinitionRecord(setupDefinitionId);
    return record ? hydrateSetupDefinitionFromDurableRecord(record) : null;
  }

  async listByStatus(statuses: SetupDefinition["status"][]): Promise<SetupDefinition[]> {
    const records = await this.adapter.listSetupDefinitionRecordsByStatus(statuses);
    return records.map((record) => hydrateSetupDefinitionFromDurableRecord(record));
  }

  async create(request: SetupDefinitionCreateRequest): Promise<SetupDefinition> {
    const createdRecord = await this.adapter.insertSetupDefinitionRecord({
      record: dehydrateSetupDefinitionToDurableRecord(request.definition, request.metadata, 1),
      expectedVersion: null
    });

    return hydrateSetupDefinitionFromDurableRecord(createdRecord);
  }

  async update(request: SetupDefinitionUpdateRequest): Promise<SetupDefinition> {
    const currentRecord = await this.adapter.loadSetupDefinitionRecord(request.definition.id);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "setup_definition",
        entityId: request.definition.id,
        operation: "update"
      });
    }

    const updatedRecord = await this.adapter.updateSetupDefinitionRecord({
      record: buildNextSetupDefinitionRecord(request.definition, request.metadata, currentRecord),
      expectedVersion: request.expectedVersion
    });

    return hydrateSetupDefinitionFromDurableRecord(updatedRecord);
  }

  async updateStatus(request: SetupDefinitionStatusUpdateRequest): Promise<SetupDefinition | null> {
    const currentRecord = await this.adapter.loadSetupDefinitionRecord(request.setupDefinitionId);
    if (!currentRecord) {
      return null;
    }

    const currentDefinition = hydrateSetupDefinitionFromDurableRecord(currentRecord);
    const updatedRecord = await this.adapter.updateSetupDefinitionRecord({
      record: buildNextSetupDefinitionRecord(
        {
          ...currentDefinition,
          status: request.status,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentRecord
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateSetupDefinitionFromDurableRecord(updatedRecord);
  }
}
