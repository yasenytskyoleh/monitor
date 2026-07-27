import type { TimestampUtc } from "../common.js";
import type {
  ExecutionAttemptAudit,
  ExecutionAttemptAuditStatus
} from "../execution/execution-attempt-audit.js";
import type { ExecutionAttemptAuditRepository } from "../repositories/execution-attempt-audit-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type TerminalExecutionAttemptAuditStatus = Exclude<ExecutionAttemptAuditStatus, "received">;

export type RecordReceivedExecutionAttemptAuditRequest = {
  audit: ExecutionAttemptAudit;
  metadata: ProductRecordMetadata;
};

export type RecordTerminalExecutionAttemptAuditRequest = {
  attemptId: string;
  status: TerminalExecutionAttemptAuditStatus;
  completedAt: TimestampUtc;
  outcomeCode: string;
  outcomeSummary?: string;
  warningCodes: string[];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ExecutionAttemptAuditServiceDependencies = {
  executionAttemptAuditRepository: ExecutionAttemptAuditRepository;
};

export type ExecutionAttemptAuditService = {
  recordReceivedAttempt(
    request: RecordReceivedExecutionAttemptAuditRequest
  ): Promise<ExecutionAttemptAudit>;
  recordTerminalOutcome(
    request: RecordTerminalExecutionAttemptAuditRequest
  ): Promise<ExecutionAttemptAudit | null>;
};

export class ExecutionAttemptAuditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionAttemptAuditValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new ExecutionAttemptAuditValidationError(`${fieldName} is required`);
  }
};

const assertValidTimestamp = (value: TimestampUtc, fieldName: string): void => {
  assertNonEmptyString(value, fieldName);
  if (!Number.isFinite(Date.parse(value))) {
    throw new ExecutionAttemptAuditValidationError(`${fieldName} must be a valid timestamp`);
  }
};

const assertReceivedAudit = (audit: ExecutionAttemptAudit): void => {
  assertNonEmptyString(audit.attemptId, "attemptId");
  assertNonEmptyString(audit.attemptedBy, "attemptedBy");
  assertValidTimestamp(audit.attemptedAt, "attemptedAt");

  if (audit.status !== "received") {
    throw new ExecutionAttemptAuditValidationError(
      "new execution_attempt_audit must have received status"
    );
  }

  if (audit.completedAt || audit.outcomeCode || audit.outcomeSummary) {
    throw new ExecutionAttemptAuditValidationError(
      "received execution_attempt_audit cannot include terminal outcome evidence"
    );
  }
};

const assertTerminalRequest = (request: RecordTerminalExecutionAttemptAuditRequest): void => {
  assertNonEmptyString(request.attemptId, "attemptId");
  assertValidTimestamp(request.completedAt, "completedAt");
  assertNonEmptyString(request.outcomeCode, "outcomeCode");
};

const buildUpdatedAt = (metadata: ProductRecordMetadata): TimestampUtc =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export const createExecutionAttemptAuditService = (
  dependencies: ExecutionAttemptAuditServiceDependencies
): ExecutionAttemptAuditService => {
  const { executionAttemptAuditRepository } = dependencies;

  return {
    async recordReceivedAttempt(request) {
      assertReceivedAudit(request.audit);
      return executionAttemptAuditRepository.create(request);
    },

    async recordTerminalOutcome(request) {
      assertTerminalRequest(request);
      const current = await executionAttemptAuditRepository.getById(request.attemptId);
      if (!current) {
        return null;
      }

      if (current.status !== "received") {
        throw new ExecutionAttemptAuditValidationError(
          "execution_attempt_audit terminal outcome is append-only"
        );
      }

      if (Date.parse(request.completedAt) < Date.parse(current.attemptedAt)) {
        throw new ExecutionAttemptAuditValidationError(
          "completedAt must not be before attemptedAt"
        );
      }

      return executionAttemptAuditRepository.update({
        audit: {
          ...current,
          status: request.status,
          completedAt: request.completedAt,
          outcomeCode: request.outcomeCode,
          outcomeSummary: request.outcomeSummary,
          warningCodes: [...request.warningCodes],
          updatedAtUtc: buildUpdatedAt(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    }
  };
};
