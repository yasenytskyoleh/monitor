import type {
  SetupAggregateResultCreateRequest,
  SetupAggregateResultRepository,
  SetupAggregateResultStatusUpdateRequest,
  SetupAggregateResultUpdateRequest
} from "./setup-aggregate-result-repository.js";
import type { SetupAggregateResult } from "../research/index.js";
import {
  buildSetupAggregateScopeKey,
  type ProductRecordMetadata
} from "../storage/index.js";

type PersistedSetupAggregateResultRecord = {
  aggregate: SetupAggregateResult;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneSetupAggregateResult = (aggregate: SetupAggregateResult): SetupAggregateResult =>
  structuredClone(aggregate);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedSetupAggregateResultRecord,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw new Error(
      `setup_aggregate_result version mismatch: expected ${expectedVersion}, got ${record.version}`
    );
  }
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemorySetupAggregateResultRepository implements SetupAggregateResultRepository {
  private readonly recordsById = new Map<string, PersistedSetupAggregateResultRecord>();
  private readonly aggregateIdByScopeKey = new Map<string, string>();

  async getById(setupAggregateResultId: string): Promise<SetupAggregateResult | null> {
    const record = this.recordsById.get(setupAggregateResultId);
    return record ? cloneSetupAggregateResult(record.aggregate) : null;
  }

  async getBySetupDefinitionAndScope(
    setupDefinitionId: string,
    aggregationScope: SetupAggregateResult["aggregationScope"]
  ): Promise<SetupAggregateResult | null> {
    const scopeKey = buildSetupAggregateScopeKey({
      ...aggregationScope,
      setupDefinitionId
    });
    const aggregateId = this.aggregateIdByScopeKey.get(scopeKey);
    if (!aggregateId) {
      return null;
    }

    const record = this.recordsById.get(aggregateId);
    return record ? cloneSetupAggregateResult(record.aggregate) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupAggregateResult[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.aggregate.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneSetupAggregateResult(record.aggregate));
  }

  async listByStatus(statuses: SetupAggregateResult["status"][]): Promise<SetupAggregateResult[]> {
    const allowed = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowed.has(record.aggregate.status))
      .map((record) => cloneSetupAggregateResult(record.aggregate));
  }

  async create(request: SetupAggregateResultCreateRequest): Promise<SetupAggregateResult> {
    const setupAggregateResultId = request.aggregate.id;
    if (this.recordsById.has(setupAggregateResultId)) {
      throw new Error(`setup_aggregate_result already exists: ${setupAggregateResultId}`);
    }

    const scopeKey = buildSetupAggregateScopeKey(request.aggregate.aggregationScope);
    if (this.aggregateIdByScopeKey.has(scopeKey)) {
      throw new Error(
        `setup_aggregate_result already exists for setup/scope: ${request.aggregate.setupDefinitionId}`
      );
    }

    const aggregate = cloneSetupAggregateResult(request.aggregate);
    this.recordsById.set(setupAggregateResultId, {
      aggregate,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    this.aggregateIdByScopeKey.set(scopeKey, setupAggregateResultId);
    return cloneSetupAggregateResult(aggregate);
  }

  async update(request: SetupAggregateResultUpdateRequest): Promise<SetupAggregateResult> {
    const setupAggregateResultId = request.aggregate.id;
    const currentRecord = this.recordsById.get(setupAggregateResultId);
    if (!currentRecord) {
      throw new Error(`setup_aggregate_result not found: ${setupAggregateResultId}`);
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const currentScopeKey = buildSetupAggregateScopeKey(currentRecord.aggregate.aggregationScope);
    const nextScopeKey = buildSetupAggregateScopeKey(request.aggregate.aggregationScope);

    if (currentScopeKey !== nextScopeKey) {
      const existingAggregateId = this.aggregateIdByScopeKey.get(nextScopeKey);
      if (existingAggregateId && existingAggregateId !== setupAggregateResultId) {
        throw new Error(
          `setup_aggregate_result already exists for setup/scope: ${request.aggregate.setupDefinitionId}`
        );
      }
      this.aggregateIdByScopeKey.delete(currentScopeKey);
      this.aggregateIdByScopeKey.set(nextScopeKey, setupAggregateResultId);
    }

    const aggregate = cloneSetupAggregateResult(request.aggregate);
    this.recordsById.set(setupAggregateResultId, {
      aggregate,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSetupAggregateResult(aggregate);
  }

  async updateStatus(request: SetupAggregateResultStatusUpdateRequest): Promise<SetupAggregateResult | null> {
    const currentRecord = this.recordsById.get(request.setupAggregateResultId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const aggregate: SetupAggregateResult = {
      ...currentRecord.aggregate,
      status: request.status,
      updatedAt: buildUpdateTimestamp(request.metadata)
    };
    this.recordsById.set(request.setupAggregateResultId, {
      aggregate,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSetupAggregateResult(aggregate);
  }
}
