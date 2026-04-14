import type { SetupAggregateResult, AggregateComputationStatus } from "../research/index.js";
import type { ProductRecordMetadata } from "../storage/index.js";

export type SetupAggregateResultCreateRequest = {
  aggregate: SetupAggregateResult;
  metadata: ProductRecordMetadata;
};

export type SetupAggregateResultUpdateRequest = {
  aggregate: SetupAggregateResult;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupAggregateResultStatusUpdateRequest = {
  setupAggregateResultId: string;
  status: AggregateComputationStatus;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupAggregateResultRepository = {
  getById(setupAggregateResultId: string): Promise<SetupAggregateResult | null>;
  getBySetupDefinitionAndScope(
    setupDefinitionId: string,
    aggregationScope: SetupAggregateResult["aggregationScope"]
  ): Promise<SetupAggregateResult | null>;
  listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupAggregateResult[]>;
  listByStatus(statuses: AggregateComputationStatus[]): Promise<SetupAggregateResult[]>;
  create(request: SetupAggregateResultCreateRequest): Promise<SetupAggregateResult>;
  update(request: SetupAggregateResultUpdateRequest): Promise<SetupAggregateResult>;
  updateStatus(request: SetupAggregateResultStatusUpdateRequest): Promise<SetupAggregateResult | null>;
};
