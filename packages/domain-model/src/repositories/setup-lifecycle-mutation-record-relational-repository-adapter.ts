import type { SetupLifecycleMutationRecordDurableRecord } from "../storage/setup-lifecycle-mutation-record-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_setup_lifecycle_mutation_record",
  "list_setup_lifecycle_mutation_records_by_setup_definition_id",
  "list_setup_lifecycle_mutation_records_by_research_decision_approval_id",
  "insert_setup_lifecycle_mutation_record"
] as const;
export type SetupLifecycleMutationRecordRelationalAdapterOperation =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type SetupLifecycleMutationRecordRelationalDeterministicErrorCode =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type SetupLifecycleMutationRecordRelationalRetryableErrorCode =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type SetupLifecycleMutationRecordRecordWriteRequest = {
  record: SetupLifecycleMutationRecordDurableRecord;
};

export type SetupLifecycleMutationRecordRelationalAdapterErrorMapping = {
  deterministic: SetupLifecycleMutationRecordRelationalDeterministicErrorCode[];
  retryable: SetupLifecycleMutationRecordRelationalRetryableErrorCode[];
};

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_ERROR_MAPPING:
  SetupLifecycleMutationRecordRelationalAdapterErrorMapping = {
    deterministic: [...SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type SetupLifecycleMutationRecordRelationalRepositoryAdapter = {
  loadSetupLifecycleMutationRecord(
    setupLifecycleMutationRecordId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord | null>;
  listSetupLifecycleMutationRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord[]>;
  listSetupLifecycleMutationRecordsByResearchDecisionApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord[]>;
  insertSetupLifecycleMutationRecord(
    request: SetupLifecycleMutationRecordRecordWriteRequest
  ): Promise<SetupLifecycleMutationRecordDurableRecord>;
};

export const isSetupLifecycleMutationRecordRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is SetupLifecycleMutationRecordRelationalDeterministicErrorCode =>
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as SetupLifecycleMutationRecordRelationalDeterministicErrorCode
  );
