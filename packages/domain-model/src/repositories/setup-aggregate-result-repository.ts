import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupAggregateResultCreateRequest = {
  aggregate: SetupAggregateResult;
  metadata: ProductRecordMetadata;
};

export type SetupAggregateResultUpdateRequest = {
  aggregate: SetupAggregateResult;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupAggregateResultRepository = {
  getById(aggregateId: string): Promise<SetupAggregateResult | null>;
  listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupAggregateResult[]>;
  create(request: SetupAggregateResultCreateRequest): Promise<SetupAggregateResult>;
  update(request: SetupAggregateResultUpdateRequest): Promise<SetupAggregateResult>;
};
