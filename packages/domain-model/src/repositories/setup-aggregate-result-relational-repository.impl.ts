import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import { buildSetupAggregateScopeKey, type SetupAggregateResultDurableRecord } from "../storage/index.js";
import type {
  SetupAggregateResultCreateRequest,
  SetupAggregateResultRepository,
  SetupAggregateResultStatusUpdateRequest,
  SetupAggregateResultUpdateRequest
} from "./setup-aggregate-result-repository.js";
import { createNotFoundRepositoryError } from "./repository-error.js";
import type { SetupAggregateRelationalRepositoryAdapter } from "./setup-aggregate-relational-repository-adapter.js";
import {
  dehydrateSetupAggregateResultToDurableRecord,
  hydrateSetupAggregateResultFromDurableRecord
} from "./setup-aggregate-relational-repository-mappers.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextSetupAggregateResultRecord = (
  aggregate: SetupAggregateResult,
  metadata:
    | SetupAggregateResultStatusUpdateRequest["metadata"]
    | SetupAggregateResultUpdateRequest["metadata"],
  currentRecord: SetupAggregateResultDurableRecord
): SetupAggregateResultDurableRecord =>
  dehydrateSetupAggregateResultToDurableRecord(
    aggregate,
    metadata,
    currentRecord.identity.version + 1
  );

export class RelationalSetupAggregateResultRepository
  implements SetupAggregateResultRepository
{
  constructor(private readonly adapter: SetupAggregateRelationalRepositoryAdapter) {}

  async getById(setupAggregateResultId: string): Promise<SetupAggregateResult | null> {
    const record = await this.adapter.loadSetupAggregateResultRecord(setupAggregateResultId);
    return record ? hydrateSetupAggregateResultFromDurableRecord(record) : null;
  }

  async getBySetupDefinitionAndScope(
    setupDefinitionId: string,
    aggregationScope: SetupAggregateResult["aggregationScope"]
  ): Promise<SetupAggregateResult | null> {
    const record = await this.adapter.loadSetupAggregateResultRecordBySetupDefinitionAndScope(
      setupDefinitionId,
      buildSetupAggregateScopeKey({
        ...aggregationScope,
        setupDefinitionId
      })
    );
    return record ? hydrateSetupAggregateResultFromDurableRecord(record) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupAggregateResult[]> {
    const records = await this.adapter.listSetupAggregateResultRecordsBySetupDefinitionId(
      setupDefinitionId
    );
    return records.map((record) => hydrateSetupAggregateResultFromDurableRecord(record));
  }

  async listByStatus(statuses: SetupAggregateResult["status"][]): Promise<SetupAggregateResult[]> {
    const records = await this.adapter.listSetupAggregateResultRecordsByStatus(statuses);
    return records.map((record) => hydrateSetupAggregateResultFromDurableRecord(record));
  }

  async create(request: SetupAggregateResultCreateRequest): Promise<SetupAggregateResult> {
    const createdRecord = await this.adapter.insertSetupAggregateResultRecord({
      record: dehydrateSetupAggregateResultToDurableRecord(request.aggregate, request.metadata, 1),
      expectedVersion: null
    });

    return hydrateSetupAggregateResultFromDurableRecord(createdRecord);
  }

  async update(request: SetupAggregateResultUpdateRequest): Promise<SetupAggregateResult> {
    const currentRecord = await this.adapter.loadSetupAggregateResultRecord(request.aggregate.id);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: request.aggregate.id,
        operation: "update"
      });
    }

    const updatedRecord = await this.adapter.updateSetupAggregateResultRecord({
      record: buildNextSetupAggregateResultRecord(request.aggregate, request.metadata, currentRecord),
      expectedVersion: request.expectedVersion
    });

    return hydrateSetupAggregateResultFromDurableRecord(updatedRecord);
  }

  async updateStatus(
    request: SetupAggregateResultStatusUpdateRequest
  ): Promise<SetupAggregateResult | null> {
    const currentRecord = await this.adapter.loadSetupAggregateResultRecord(
      request.setupAggregateResultId
    );
    if (!currentRecord) {
      return null;
    }

    const currentAggregate = hydrateSetupAggregateResultFromDurableRecord(currentRecord);
    const updatedRecord = await this.adapter.updateSetupAggregateResultRecord({
      record: buildNextSetupAggregateResultRecord(
        {
          ...currentAggregate,
          status: request.status,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentRecord
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateSetupAggregateResultFromDurableRecord(updatedRecord);
  }
}
