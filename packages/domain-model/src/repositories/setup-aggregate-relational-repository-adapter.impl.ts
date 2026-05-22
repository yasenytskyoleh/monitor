import type { ResearchHypothesisDurableRecordBundle } from "./first-durable-relational-repository-adapter.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  SetupAggregateRelationalRepositoryAdapter,
  SetupAggregateResultRecordWriteRequest
} from "./setup-aggregate-relational-repository-adapter.js";
import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";
import type { SetupAggregateResultDurableRecord } from "../storage/setup-aggregate-relational-slice.js";

export type SetupAggregateRelationalReferenceReader = {
  loadSetupDefinitionRecord(setupDefinitionId: string): Promise<SetupDefinitionDurableRecord | null>;
  loadResearchHypothesisBundle(
    researchHypothesisId: string
  ): Promise<ResearchHypothesisDurableRecordBundle | null>;
};

const cloneSetupAggregateResultRecord = (
  record: SetupAggregateResultDurableRecord
): SetupAggregateResultDurableRecord => structuredClone(record);

const assertExpectedVersion = (
  setupAggregateResultId: string,
  currentVersion: number,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw createVersionMismatchRepositoryError({
      entityType: "setup_aggregate_result",
      entityId: setupAggregateResultId,
      operation: "update",
      expectedVersion,
      actualVersion: currentVersion
    });
  }
};

export class InMemorySetupAggregateRelationalRepositoryAdapter
  implements SetupAggregateRelationalRepositoryAdapter
{
  private readonly aggregateRecordsById = new Map<string, SetupAggregateResultDurableRecord>();
  private readonly aggregateIdByScopeKey = new Map<string, string>();

  constructor(private readonly references: SetupAggregateRelationalReferenceReader) {}

  async loadSetupAggregateResultRecord(
    setupAggregateResultId: string
  ): Promise<SetupAggregateResultDurableRecord | null> {
    const record = this.aggregateRecordsById.get(setupAggregateResultId);
    return record ? cloneSetupAggregateResultRecord(record) : null;
  }

  async loadSetupAggregateResultRecordBySetupDefinitionAndScope(
    setupDefinitionId: string,
    scopeKey: string
  ): Promise<SetupAggregateResultDurableRecord | null> {
    const setupAggregateResultId = this.aggregateIdByScopeKey.get(scopeKey);
    if (!setupAggregateResultId) {
      return null;
    }

    const record = this.aggregateRecordsById.get(setupAggregateResultId);
    if (!record || record.setupDefinitionId !== setupDefinitionId) {
      return null;
    }

    return cloneSetupAggregateResultRecord(record);
  }

  async listSetupAggregateResultRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupAggregateResultDurableRecord[]> {
    return [...this.aggregateRecordsById.values()]
      .filter((record) => record.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneSetupAggregateResultRecord(record));
  }

  async listSetupAggregateResultRecordsByStatus(
    statuses: SetupAggregateResultDurableRecord["aggregateStatus"][]
  ): Promise<SetupAggregateResultDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.aggregateRecordsById.values()]
      .filter((record) => allowedStatuses.has(record.aggregateStatus))
      .map((record) => cloneSetupAggregateResultRecord(record));
  }

  async insertSetupAggregateResultRecord(
    request: SetupAggregateResultRecordWriteRequest
  ): Promise<SetupAggregateResultDurableRecord> {
    const setupAggregateResultId = request.record.identity.entityId;
    if (this.aggregateRecordsById.has(setupAggregateResultId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: setupAggregateResultId,
        operation: "create"
      });
    }

    if (this.aggregateIdByScopeKey.has(request.record.scopeKey)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: setupAggregateResultId,
        operation: "create"
      });
    }

    await this.assertSetupDefinitionReferenceExists(request.record, "create");
    await this.assertResearchHypothesisReferenceExists(request.record, "create");

    const record = cloneSetupAggregateResultRecord(request.record);
    this.aggregateRecordsById.set(setupAggregateResultId, record);
    this.aggregateIdByScopeKey.set(record.scopeKey, setupAggregateResultId);
    return cloneSetupAggregateResultRecord(record);
  }

  async updateSetupAggregateResultRecord(
    request: SetupAggregateResultRecordWriteRequest
  ): Promise<SetupAggregateResultDurableRecord> {
    const setupAggregateResultId = request.record.identity.entityId;
    const currentRecord = this.aggregateRecordsById.get(setupAggregateResultId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: setupAggregateResultId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      setupAggregateResultId,
      currentRecord.identity.version,
      request.expectedVersion
    );
    await this.assertSetupDefinitionReferenceExists(request.record, "update");
    await this.assertResearchHypothesisReferenceExists(request.record, "update");
    this.assertScopeKeyUnique(request.record, setupAggregateResultId, "update");

    if (currentRecord.scopeKey !== request.record.scopeKey) {
      this.aggregateIdByScopeKey.delete(currentRecord.scopeKey);
      this.aggregateIdByScopeKey.set(request.record.scopeKey, setupAggregateResultId);
    }

    const record = cloneSetupAggregateResultRecord(request.record);
    this.aggregateRecordsById.set(setupAggregateResultId, record);
    return cloneSetupAggregateResultRecord(record);
  }

  private async assertSetupDefinitionReferenceExists(
    record: SetupAggregateResultDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    const setupDefinition = await this.references.loadSetupDefinitionRecord(record.setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: record.setupDefinitionId
      });
    }
  }

  private async assertResearchHypothesisReferenceExists(
    record: SetupAggregateResultDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    if (!record.researchHypothesisId) {
      return;
    }

    const hypothesis = await this.references.loadResearchHypothesisBundle(record.researchHypothesisId);
    if (!hypothesis) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_hypothesis",
        referenceEntityId: record.researchHypothesisId
      });
    }
  }

  private assertScopeKeyUnique(
    record: SetupAggregateResultDurableRecord,
    ignoredSetupAggregateResultId: string,
    operation: "create" | "update"
  ): void {
    const currentAggregateId = this.aggregateIdByScopeKey.get(record.scopeKey);
    if (currentAggregateId && currentAggregateId !== ignoredSetupAggregateResultId) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: record.identity.entityId,
        operation
      });
    }
  }
}
