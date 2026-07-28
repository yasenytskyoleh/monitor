import type { TimestampUtc } from "../common.js";
import type {
  ExecutionAttemptAudit,
  ExecutionAttemptAuditStatus
} from "../execution/execution-attempt-audit.js";
import type { ExecutionAttemptAuditRepository } from "../repositories/execution-attempt-audit-repository.js";
import { DOWNSTREAM_ACTION_TARGETS } from "../review/downstream-action-target.js";
import { REVIEW_DECISION_DOWNSTREAM_COMMAND_TYPES } from "../review/review-decision-routing-result.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type TerminalExecutionAttemptAuditStatus = Exclude<ExecutionAttemptAuditStatus, "received">;

const TERMINAL_EXECUTION_ATTEMPT_AUDIT_STATUSES = ["executed", "rejected", "failed"] as const;

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

const assertOptionalNonEmptyString = (value: string | undefined, fieldName: string): void => {
  if (value !== undefined) {
    assertNonEmptyString(value, fieldName);
  }
};

const assertReceivedAudit = (audit: ExecutionAttemptAudit): void => {
  assertNonEmptyString(audit.attemptId, "attemptId");
  assertNonEmptyString(audit.attemptedBy, "attemptedBy");
  assertValidTimestamp(audit.attemptedAt, "attemptedAt");
  assertOptionalNonEmptyString(
    audit.routedActionExecutionEnvelopeId,
    "routedActionExecutionEnvelopeId"
  );
  assertOptionalNonEmptyString(
    audit.reviewDecisionRoutingResultId,
    "reviewDecisionRoutingResultId"
  );
  assertOptionalNonEmptyString(audit.researchReviewDecisionId, "researchReviewDecisionId");

  if (!DOWNSTREAM_ACTION_TARGETS.includes(audit.actionTarget)) {
    throw new ExecutionAttemptAuditValidationError("actionTarget is invalid");
  }

  if (!REVIEW_DECISION_DOWNSTREAM_COMMAND_TYPES.includes(audit.downstreamCommandType)) {
    throw new ExecutionAttemptAuditValidationError("downstreamCommandType is invalid");
  }

  if (audit.status !== "received") {
    throw new ExecutionAttemptAuditValidationError(
      "new execution_attempt_audit must have received status"
    );
  }

  if (
    audit.completedAt !== undefined ||
    audit.outcomeCode !== undefined ||
    audit.outcomeSummary !== undefined
  ) {
    throw new ExecutionAttemptAuditValidationError(
      "received execution_attempt_audit cannot include terminal outcome evidence"
    );
  }

  if (audit.warningCodes.some((warningCode) => !warningCode.trim())) {
    throw new ExecutionAttemptAuditValidationError("warningCodes must not include blank values");
  }
};

const assertTerminalRequest = (request: RecordTerminalExecutionAttemptAuditRequest): void => {
  assertNonEmptyString(request.attemptId, "attemptId");
  assertValidTimestamp(request.completedAt, "completedAt");
  assertNonEmptyString(request.outcomeCode, "outcomeCode");

  if (!TERMINAL_EXECUTION_ATTEMPT_AUDIT_STATUSES.includes(request.status)) {
    throw new ExecutionAttemptAuditValidationError(
      "execution_attempt_audit terminal status must be executed, rejected, or failed"
    );
  }

  if (request.outcomeSummary !== undefined) {
    assertNonEmptyString(request.outcomeSummary, "outcomeSummary");
  }

  if (request.warningCodes.some((warningCode) => !warningCode.trim())) {
    throw new ExecutionAttemptAuditValidationError("warningCodes must not include blank values");
  }
};

const buildUpdatedAt = (
  current: ExecutionAttemptAudit,
  completedAt: TimestampUtc,
  metadata: ProductRecordMetadata
): TimestampUtc => {
  const candidates = [current.updatedAtUtc, completedAt, metadata.sourceObservedAtUtc].filter(
    (value): value is TimestampUtc => value !== null && value !== undefined
  );

  return candidates.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest
  );
};

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
          updatedAtUtc: buildUpdatedAt(current, request.completedAt, request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    }
  };
};
