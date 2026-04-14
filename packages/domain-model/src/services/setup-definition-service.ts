import type { SetupDefinition } from "../setup-definition.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

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
  setupId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupDefinitionServiceDependencies = {
  setupDefinitionRepository: SetupDefinitionRepository;
};

export type SetupDefinitionService = {
  createSetupDefinition(request: CreateSetupDefinitionRequest): Promise<SetupDefinition>;
  updateSetupDefinition(request: UpdateSetupDefinitionRequest): Promise<SetupDefinition>;
  archiveSetupDefinition(request: ArchiveSetupDefinitionRequest): Promise<SetupDefinition | null>;
};
