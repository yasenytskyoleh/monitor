import type { SetupRevisionActivationRecord } from "../review/setup-revision-activation-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupRevisionActivationRecordCreateRequest = {
  activation: SetupRevisionActivationRecord;
  metadata: ProductRecordMetadata;
};

export type SetupRevisionActivationRecordRepository = {
  getById(setupRevisionActivationRecordId: string): Promise<SetupRevisionActivationRecord | null>;
  listBySetupFamilyId(setupFamilyId: string): Promise<SetupRevisionActivationRecord[]>;
  listByTargetRevisionId(targetRevisionId: string): Promise<SetupRevisionActivationRecord[]>;
  create(request: SetupRevisionActivationRecordCreateRequest): Promise<SetupRevisionActivationRecord>;
};
