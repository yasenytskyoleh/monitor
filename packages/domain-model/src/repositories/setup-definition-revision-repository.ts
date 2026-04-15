import type { SetupDefinitionRevision } from "../review/setup-definition-revision.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupDefinitionRevisionCreateRequest = {
  revision: SetupDefinitionRevision;
  metadata: ProductRecordMetadata;
};

export type SetupDefinitionRevisionStatusUpdateRequest = {
  setupDefinitionRevisionId: string;
  status: SetupDefinitionRevision["revisionStatus"];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SetupDefinitionRevisionRepository = {
  getById(setupDefinitionRevisionId: string): Promise<SetupDefinitionRevision | null>;
  getBySetupDefinitionId(setupDefinitionId: string): Promise<SetupDefinitionRevision | null>;
  getLatestBySetupFamilyId(setupFamilyId: string): Promise<SetupDefinitionRevision | null>;
  listBySetupFamilyId(setupFamilyId: string): Promise<SetupDefinitionRevision[]>;
  create(request: SetupDefinitionRevisionCreateRequest): Promise<SetupDefinitionRevision>;
  updateStatus(
    request: SetupDefinitionRevisionStatusUpdateRequest
  ): Promise<SetupDefinitionRevision | null>;
};
