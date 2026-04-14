import type { SetupLifecycleMutationRecord } from "../review/setup-lifecycle-mutation-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupLifecycleMutationRecordCreateRequest = {
  mutation: SetupLifecycleMutationRecord;
  metadata: ProductRecordMetadata;
};

export type SetupLifecycleMutationRecordRepository = {
  getById(setupLifecycleMutationRecordId: string): Promise<SetupLifecycleMutationRecord | null>;
  listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupLifecycleMutationRecord[]>;
  listByApprovalId(researchDecisionApprovalId: string): Promise<SetupLifecycleMutationRecord[]>;
  create(request: SetupLifecycleMutationRecordCreateRequest): Promise<SetupLifecycleMutationRecord>;
};
