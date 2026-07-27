import type { ExecutionAttemptAuditDurableRecord } from "../storage/execution-attempt-audit-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_execution_attempt_audit_record",
  "list_execution_attempt_audit_records_by_routing_result_id",
  "list_execution_attempt_audit_records_by_status",
  "insert_execution_attempt_audit_record",
  "update_execution_attempt_audit_record"
] as const;
export type ExecutionAttemptAuditRelationalAdapterOperation =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch"
] as const;
export type ExecutionAttemptAuditRelationalDeterministicErrorCode =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type ExecutionAttemptAuditRelationalRetryableErrorCode =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

export type ExecutionAttemptAuditRecordWriteRequest = {
  record: ExecutionAttemptAuditDurableRecord;
  expectedVersion?: number | null;
};

export type ExecutionAttemptAuditRelationalRepositoryAdapter = {
  loadExecutionAttemptAuditRecord(attemptId: string): Promise<ExecutionAttemptAuditDurableRecord | null>;
  listExecutionAttemptAuditRecordsByRoutingResultId(routingResultId: string): Promise<ExecutionAttemptAuditDurableRecord[]>;
  listExecutionAttemptAuditRecordsByStatus(statuses: ExecutionAttemptAuditDurableRecord["executionAttemptAuditStatus"][]): Promise<ExecutionAttemptAuditDurableRecord[]>;
  insertExecutionAttemptAuditRecord(request: ExecutionAttemptAuditRecordWriteRequest): Promise<ExecutionAttemptAuditDurableRecord>;
  updateExecutionAttemptAuditRecord(request: ExecutionAttemptAuditRecordWriteRequest): Promise<ExecutionAttemptAuditDurableRecord>;
};

export const isExecutionAttemptAuditRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is ExecutionAttemptAuditRelationalDeterministicErrorCode =>
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as ExecutionAttemptAuditRelationalDeterministicErrorCode
  );
