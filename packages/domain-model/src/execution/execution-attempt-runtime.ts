import type { ExecutionAttemptAudit } from "./execution-attempt-audit.js";
import type { RoutedActionExecutionEnvelope } from "./routed-action-execution-envelope.js";
import type { ExecutionAttemptAuditService } from "../services/execution-attempt-audit-service.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type DownstreamActionExecutorOutcome = {
  status: "executed" | "rejected";
  outcomeCode: string;
  outcomeSummary?: string;
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

export class ExecutionAttemptRuntimeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionAttemptRuntimeValidationError";
  }
}

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

const recordTerminalOutcome = async (
  executionAttemptAuditService: ExecutionAttemptAuditService,
  audit: ExecutionAttemptAudit,
  metadata: ProductRecordMetadata,
  outcome: DownstreamActionExecutorOutcome | { status: "failed"; outcomeCode: string }
): Promise<ExecutionAttemptAudit> => {
  const terminalAudit = await executionAttemptAuditService.recordTerminalOutcome({
    attemptId: audit.attemptId,
    status: outcome.status,
    completedAt: metadata.sourceObservedAtUtc ?? new Date().toISOString(),
    outcomeCode: outcome.outcomeCode,
    ...(outcome.status === "failed" ? {} : { outcomeSummary: outcome.outcomeSummary }),
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

export const createExecutionAttemptRuntime = (
  dependencies: ExecutionAttemptRuntimeDependencies
): ExecutionAttemptRuntime => {
  const { executionAttemptAuditService, downstreamActionExecutor } = dependencies;

  return {
    async execute(request: ExecutePreparedRoutedActionRequest): Promise<ExecutionAttemptRuntimeResult> {
      assertAuditMatchesEnvelope(request.audit, request.envelope);
      await executionAttemptAuditService.recordReceivedAttempt({
        audit: request.audit,
        metadata: request.metadata
      });

      let outcome: DownstreamActionExecutorOutcome;
      try {
        outcome = await downstreamActionExecutor.execute(request.envelope);
      } catch {
        const audit = await recordTerminalOutcome(
          executionAttemptAuditService,
          request.audit,
          request.metadata,
          { status: "failed", outcomeCode: "executor_failed" }
        );
        return { status: "failed", audit };
      }

      const audit = await recordTerminalOutcome(
        executionAttemptAuditService,
        request.audit,
        request.metadata,
        outcome
      );
      return { status: outcome.status, audit };
    }
  };
};
