import type { RoutedActionExecutionEnvelopeDurableRecord } from "../storage/routed-action-execution-envelope-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_routed_action_execution_envelope_record",
  "list_routed_action_execution_envelope_records_by_source_review_decision_id",
  "insert_routed_action_execution_envelope_record"
] as const;
export type RoutedActionExecutionEnvelopeRelationalAdapterOperation =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "invalid_reference"
] as const;
export type RoutedActionExecutionEnvelopeRelationalDeterministicErrorCode =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type RoutedActionExecutionEnvelopeRelationalRetryableErrorCode =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type RoutedActionExecutionEnvelopeRecordWriteRequest = {
  record: RoutedActionExecutionEnvelopeDurableRecord;
};

export type RoutedActionExecutionEnvelopeRelationalAdapterErrorMapping = {
  deterministic: RoutedActionExecutionEnvelopeRelationalDeterministicErrorCode[];
  retryable: RoutedActionExecutionEnvelopeRelationalRetryableErrorCode[];
};

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_ERROR_MAPPING:
  RoutedActionExecutionEnvelopeRelationalAdapterErrorMapping = {
    deterministic: [...ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type RoutedActionExecutionEnvelopeRelationalRepositoryAdapter = {
  loadRoutedActionExecutionEnvelopeRecord(
    routedActionExecutionEnvelopeId: string
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord | null>;
  listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId(
    sourceReviewDecisionId: string
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord[]>;
  insertRoutedActionExecutionEnvelopeRecord(
    request: RoutedActionExecutionEnvelopeRecordWriteRequest
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord>;
};

export const isRoutedActionExecutionEnvelopeRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is RoutedActionExecutionEnvelopeRelationalDeterministicErrorCode =>
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as RoutedActionExecutionEnvelopeRelationalDeterministicErrorCode
  );
