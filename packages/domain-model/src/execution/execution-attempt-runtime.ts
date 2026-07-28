import {
  isExecutionAttemptAuditCode,
  type ExecutionAttemptAudit
} from "./execution-attempt-audit.js";
import type { RoutedActionExecutionEnvelope } from "./routed-action-execution-envelope.js";
import { RepositoryError } from "../repositories/repository-error.js";
import {
  ExecutionAttemptAuditValidationError,
  type ExecutionAttemptAuditService
} from "../services/execution-attempt-audit-service.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type DownstreamActionExecutorOutcome = {
  status: "executed" | "rejected";
  outcomeCode: string;
  warningCodes?: string[];
};

export type DownstreamActionExecutor = {
  execute(envelope: RoutedActionExecutionEnvelope): Promise<DownstreamActionExecutorOutcome>;
};

export type ExecutePreparedRoutedActionRequest = {
  audit: ExecutionAttemptAudit;
  envelope: RoutedActionExecutionEnvelope;
  metadata: ProductRecordMetadata;
};

export type ExecutionAttemptRuntimeResult = {
  status: "executed" | "rejected" | "failed";
  audit: ExecutionAttemptAudit;
};

export type ExecutionAttemptRuntimeDependencies = {
  executionAttemptAuditService: ExecutionAttemptAuditService;
  downstreamActionExecutor: DownstreamActionExecutor;
};

export type ExecutionAttemptRuntime = {
  execute(request: ExecutePreparedRoutedActionRequest): Promise<ExecutionAttemptRuntimeResult>;
};

export type ExecutionAttemptAuditPersistencePhase = "received" | "terminal";

export type ExecutionAttemptAuditConflictKind = "attempt_id" | "prepared_envelope";

export class ExecutionAttemptRuntimeAuditPersistenceError extends Error {
  constructor(
    readonly attemptId: string,
    readonly phase: ExecutionAttemptAuditPersistencePhase
  ) {
    super(`execution_attempt_audit ${phase} persistence failed`);
    this.name = "ExecutionAttemptRuntimeAuditPersistenceError";
  }
}

export class ExecutionAttemptRuntimeAuditAlreadyRecordedError extends Error {
  constructor(
    readonly attemptId: string,
    readonly conflictKind: ExecutionAttemptAuditConflictKind,
    readonly existingAttemptId: string,
    readonly routedActionExecutionEnvelopeId?: string
  ) {
    super("execution_attempt_audit has already been recorded");
    this.name = "ExecutionAttemptRuntimeAuditAlreadyRecordedError";
  }
}

export class ExecutionAttemptRuntimeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionAttemptRuntimeValidationError";
  }
}

class InvalidExecutorOutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExecutorOutcomeError";
  }
}

const assertExecutorOutcome = (outcome: DownstreamActionExecutorOutcome): void => {
  if (outcome.status !== "executed" && outcome.status !== "rejected") {
    throw new InvalidExecutorOutcomeError("executor outcome status must be executed or rejected");
  }

  if (!isExecutionAttemptAuditCode(outcome.outcomeCode)) {
    throw new InvalidExecutorOutcomeError(
      "executor outcomeCode must be a lowercase underscore-delimited identifier"
    );
  }

  if (outcome.warningCodes?.some((warningCode) => !isExecutionAttemptAuditCode(warningCode))) {
    throw new InvalidExecutorOutcomeError(
      "executor warningCodes must be lowercase underscore-delimited identifiers"
    );
  }
};

const assertAuditMatchesEnvelope = (
  audit: ExecutionAttemptAudit,
  envelope: RoutedActionExecutionEnvelope
): void => {
  if (audit.routedActionExecutionEnvelopeId !== envelope.id) {
    throw new ExecutionAttemptRuntimeValidationError(
      "execution_attempt_audit must reference the prepared execution envelope"
    );
  }

  if (
    audit.reviewDecisionRoutingResultId !== envelope.sourceRoutingResultId ||
    audit.researchReviewDecisionId !== envelope.sourceReviewDecisionId
  ) {
    throw new ExecutionAttemptRuntimeValidationError(
      "execution_attempt_audit correlation must match the prepared execution envelope"
    );
  }

  if (
    audit.actionTarget !== envelope.actionTarget ||
    audit.downstreamCommandType !== envelope.actionCommandType
  ) {
    throw new ExecutionAttemptRuntimeValidationError(
      "execution_attempt_audit action snapshot must match the prepared execution envelope"
    );
  }

  if (envelope.executionStatus !== "prepared") {
    throw new ExecutionAttemptRuntimeValidationError(
      "only prepared execution envelopes can be dispatched"
    );
  }
};

const resolveCompletedAt = (
  audit: ExecutionAttemptAudit,
  metadata: ProductRecordMetadata
): string => {
  const candidates = [
    audit.attemptedAt,
    metadata.sourceObservedAtUtc,
    new Date().toISOString()
  ].filter((value): value is string => value !== null && value !== undefined);

  return candidates.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest
  );
};

const recordTerminalOutcome = async (
  executionAttemptAuditService: ExecutionAttemptAuditService,
  audit: ExecutionAttemptAudit,
  metadata: ProductRecordMetadata,
  outcome: DownstreamActionExecutorOutcome | { status: "failed"; outcomeCode: string }
): Promise<ExecutionAttemptAudit> => {
  const terminalAudit = await executionAttemptAuditService.recordTerminalOutcome({
    attemptId: audit.attemptId,
    status: outcome.status,
    completedAt: resolveCompletedAt(audit, metadata),
    outcomeCode: outcome.outcomeCode,
    warningCodes: outcome.status === "failed" ? ["executor_failure"] : outcome.warningCodes ?? [],
    metadata,
    expectedVersion: 1
  });

  if (!terminalAudit) {
    throw new ExecutionAttemptRuntimeValidationError(
      "execution_attempt_audit disappeared before terminal evidence could be recorded"
    );
  }

  return terminalAudit;
};

const recordReceivedAttempt = async (
  executionAttemptAuditService: ExecutionAttemptAuditService,
  audit: ExecutionAttemptAudit,
  metadata: ProductRecordMetadata
): Promise<void> => {
  try {
    await executionAttemptAuditService.recordReceivedAttempt({ audit, metadata });
  } catch (error) {
    if (error instanceof ExecutionAttemptAuditValidationError) {
      throw error;
    }

    if (error instanceof RepositoryError && error.code === "already_exists") {
      try {
        const existingByAttemptId = await executionAttemptAuditService.getById(audit.attemptId);
        if (existingByAttemptId) {
          throw new ExecutionAttemptRuntimeAuditAlreadyRecordedError(
            audit.attemptId,
            "attempt_id",
            existingByAttemptId.attemptId
          );
        }

        if (audit.routedActionExecutionEnvelopeId) {
          const existingByEnvelope =
            await executionAttemptAuditService.getByRoutedActionExecutionEnvelopeId(
              audit.routedActionExecutionEnvelopeId
            );
          if (existingByEnvelope) {
            throw new ExecutionAttemptRuntimeAuditAlreadyRecordedError(
              audit.attemptId,
              "prepared_envelope",
              existingByEnvelope.attemptId,
              audit.routedActionExecutionEnvelopeId
            );
          }
        }
      } catch (reconciliationError) {
        if (reconciliationError instanceof ExecutionAttemptRuntimeAuditAlreadyRecordedError) {
          throw reconciliationError;
        }
      }
    }

    throw new ExecutionAttemptRuntimeAuditPersistenceError(audit.attemptId, "received");
  }
};

const recordTerminalAuditOutcome = async (
  executionAttemptAuditService: ExecutionAttemptAuditService,
  audit: ExecutionAttemptAudit,
  metadata: ProductRecordMetadata,
  outcome: DownstreamActionExecutorOutcome | { status: "failed"; outcomeCode: string }
): Promise<ExecutionAttemptAudit> => {
  try {
    return await recordTerminalOutcome(executionAttemptAuditService, audit, metadata, outcome);
  } catch (error) {
    if (error instanceof ExecutionAttemptAuditValidationError) {
      throw error;
    }

    throw new ExecutionAttemptRuntimeAuditPersistenceError(audit.attemptId, "terminal");
  }
};

export const createExecutionAttemptRuntime = (
  dependencies: ExecutionAttemptRuntimeDependencies
): ExecutionAttemptRuntime => {
  const { executionAttemptAuditService, downstreamActionExecutor } = dependencies;

  return {
    async execute(request: ExecutePreparedRoutedActionRequest): Promise<ExecutionAttemptRuntimeResult> {
      assertAuditMatchesEnvelope(request.audit, request.envelope);
      await recordReceivedAttempt(
        executionAttemptAuditService,
        request.audit,
        request.metadata
      );

      let outcome: DownstreamActionExecutorOutcome;
      try {
        outcome = await downstreamActionExecutor.execute(request.envelope);
        assertExecutorOutcome(outcome);
      } catch (error) {
        const audit = await recordTerminalAuditOutcome(
          executionAttemptAuditService,
          request.audit,
          request.metadata,
          {
            status: "failed",
            outcomeCode:
              error instanceof InvalidExecutorOutcomeError
                ? "executor_invalid_outcome"
                : "executor_failed"
          }
        );
        return { status: "failed", audit };
      }

      const audit = await recordTerminalAuditOutcome(
        executionAttemptAuditService,
        request.audit,
        request.metadata,
        outcome
      );
      return { status: outcome.status, audit };
    }
  };
};
