import type { SetupAggregateResultDurableRecord } from "../storage/setup-aggregate-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const SETUP_AGGREGATE_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_setup_aggregate_result_record",
  "load_setup_aggregate_result_record_by_setup_definition_and_scope",
  "list_setup_aggregate_result_records_by_setup_definition_id",
  "list_setup_aggregate_result_records_by_status",
  "insert_setup_aggregate_result_record",
  "update_setup_aggregate_result_record"
] as const;
export type SetupAggregateRelationalAdapterOperation =
  (typeof SETUP_AGGREGATE_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const SETUP_AGGREGATE_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference"
] as const;
export type SetupAggregateRelationalDeterministicErrorCode =
  (typeof SETUP_AGGREGATE_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const SETUP_AGGREGATE_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type SetupAggregateRelationalRetryableErrorCode =
  (typeof SETUP_AGGREGATE_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type SetupAggregateResultRecordWriteRequest = {
  record: SetupAggregateResultDurableRecord;
  expectedVersion: number | null;
};

export type SetupAggregateRelationalAdapterErrorMapping = {
  deterministic: SetupAggregateRelationalDeterministicErrorCode[];
  retryable: SetupAggregateRelationalRetryableErrorCode[];
};

export const SETUP_AGGREGATE_RELATIONAL_ADAPTER_ERROR_MAPPING: SetupAggregateRelationalAdapterErrorMapping =
  {
    deterministic: [...SETUP_AGGREGATE_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...SETUP_AGGREGATE_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type SetupAggregateRelationalRepositoryAdapter = {
  loadSetupAggregateResultRecord(
    setupAggregateResultId: string
  ): Promise<SetupAggregateResultDurableRecord | null>;
  loadSetupAggregateResultRecordBySetupDefinitionAndScope(
    setupDefinitionId: string,
    scopeKey: string
  ): Promise<SetupAggregateResultDurableRecord | null>;
  listSetupAggregateResultRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupAggregateResultDurableRecord[]>;
  listSetupAggregateResultRecordsByStatus(
    statuses: SetupAggregateResultDurableRecord["aggregateStatus"][]
  ): Promise<SetupAggregateResultDurableRecord[]>;
  insertSetupAggregateResultRecord(
    request: SetupAggregateResultRecordWriteRequest
  ): Promise<SetupAggregateResultDurableRecord>;
  updateSetupAggregateResultRecord(
    request: SetupAggregateResultRecordWriteRequest
  ): Promise<SetupAggregateResultDurableRecord>;
};

export const isSetupAggregateRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is SetupAggregateRelationalDeterministicErrorCode =>
  SETUP_AGGREGATE_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as SetupAggregateRelationalDeterministicErrorCode
  );
