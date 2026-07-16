import type { SetupRevisionActivationRecordDurableRecord } from "../storage/setup-revision-activation-record-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_setup_revision_activation_record",
  "list_setup_revision_activation_records_by_setup_family_id",
  "list_setup_revision_activation_records_by_target_revision_id",
  "insert_setup_revision_activation_record"
] as const;
export type SetupRevisionActivationRecordRelationalAdapterOperation =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type SetupRevisionActivationRecordRelationalDeterministicErrorCode =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type SetupRevisionActivationRecordRelationalRetryableErrorCode =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type SetupRevisionActivationRecordRecordWriteRequest = {
  record: SetupRevisionActivationRecordDurableRecord;
};

export type SetupRevisionActivationRecordRelationalAdapterErrorMapping = {
  deterministic: SetupRevisionActivationRecordRelationalDeterministicErrorCode[];
  retryable: SetupRevisionActivationRecordRelationalRetryableErrorCode[];
};

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ADAPTER_ERROR_MAPPING:
  SetupRevisionActivationRecordRelationalAdapterErrorMapping = {
    deterministic: [...SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type SetupRevisionActivationRecordRelationalRepositoryAdapter = {
  loadSetupRevisionActivationRecord(
    setupRevisionActivationRecordId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord | null>;
  listSetupRevisionActivationRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord[]>;
  listSetupRevisionActivationRecordsByTargetRevisionId(
    targetRevisionId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord[]>;
  insertSetupRevisionActivationRecord(
    request: SetupRevisionActivationRecordRecordWriteRequest
  ): Promise<SetupRevisionActivationRecordDurableRecord>;
};

export const isSetupRevisionActivationRecordRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is SetupRevisionActivationRecordRelationalDeterministicErrorCode =>
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as SetupRevisionActivationRecordRelationalDeterministicErrorCode
  );
