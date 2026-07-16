import type { SetupDefinitionRevisionDurableRecord } from "../storage/setup-definition-revision-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_setup_definition_revision_record",
  "load_setup_definition_revision_record_by_setup_definition_id",
  "load_latest_setup_definition_revision_record_by_setup_family_id",
  "list_setup_definition_revision_records_by_setup_family_id",
  "insert_setup_definition_revision_record",
  "update_setup_definition_revision_record"
] as const;
export type SetupDefinitionRevisionRelationalAdapterOperation =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const SETUP_DEFINITION_REVISION_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference"
] as const;
export type SetupDefinitionRevisionRelationalDeterministicErrorCode =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const SETUP_DEFINITION_REVISION_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type SetupDefinitionRevisionRelationalRetryableErrorCode =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type SetupDefinitionRevisionRecordWriteRequest = {
  record: SetupDefinitionRevisionDurableRecord;
  expectedVersion: number | null;
};

export type SetupDefinitionRevisionRelationalAdapterErrorMapping = {
  deterministic: SetupDefinitionRevisionRelationalDeterministicErrorCode[];
  retryable: SetupDefinitionRevisionRelationalRetryableErrorCode[];
};

export const SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_ERROR_MAPPING:
  SetupDefinitionRevisionRelationalAdapterErrorMapping = {
    deterministic: [...SETUP_DEFINITION_REVISION_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...SETUP_DEFINITION_REVISION_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type SetupDefinitionRevisionRelationalRepositoryAdapter = {
  loadSetupDefinitionRevisionRecord(
    setupDefinitionRevisionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null>;
  loadSetupDefinitionRevisionRecordBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null>;
  loadLatestSetupDefinitionRevisionRecordBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null>;
  listSetupDefinitionRevisionRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevisionDurableRecord[]>;
  insertSetupDefinitionRevisionRecord(
    request: SetupDefinitionRevisionRecordWriteRequest
  ): Promise<SetupDefinitionRevisionDurableRecord>;
  updateSetupDefinitionRevisionRecord(
    request: SetupDefinitionRevisionRecordWriteRequest
  ): Promise<SetupDefinitionRevisionDurableRecord>;
};

export const isSetupDefinitionRevisionRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is SetupDefinitionRevisionRelationalDeterministicErrorCode =>
  SETUP_DEFINITION_REVISION_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as SetupDefinitionRevisionRelationalDeterministicErrorCode
  );
