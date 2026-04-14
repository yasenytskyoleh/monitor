import type { SetupDefinition, SetupDefinitionStatus } from "../setup-definition.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupDefinitionCreateRequest = {
  definition: SetupDefinition;
  metadata: ProductRecordMetadata;
};

export type SetupDefinitionUpdateRequest = {
  definition: SetupDefinition;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupDefinitionStatusUpdateRequest = {
  setupDefinitionId: string;
  status: SetupDefinitionStatus;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupDefinitionRepository = {
  getById(setupDefinitionId: string): Promise<SetupDefinition | null>;
  listByStatus(statuses: SetupDefinitionStatus[]): Promise<SetupDefinition[]>;
  create(request: SetupDefinitionCreateRequest): Promise<SetupDefinition>;
  update(request: SetupDefinitionUpdateRequest): Promise<SetupDefinition>;
  updateStatus(request: SetupDefinitionStatusUpdateRequest): Promise<SetupDefinition | null>;
};
