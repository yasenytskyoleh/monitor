import type {
  ExecutionAttemptAudit,
  ExecutionAttemptAuditStatus
} from "../execution/execution-attempt-audit.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type ExecutionAttemptAuditCreateRequest = {
  audit: ExecutionAttemptAudit;
  metadata: ProductRecordMetadata;
};

export type ExecutionAttemptAuditUpdateRequest = {
  audit: ExecutionAttemptAudit;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ExecutionAttemptAuditRepository = {
  getById(attemptId: string): Promise<ExecutionAttemptAudit | null>;
  listByReviewDecisionRoutingResultId(
    reviewDecisionRoutingResultId: string
  ): Promise<ExecutionAttemptAudit[]>;
  listByStatus(statuses: ExecutionAttemptAuditStatus[]): Promise<ExecutionAttemptAudit[]>;
  create(request: ExecutionAttemptAuditCreateRequest): Promise<ExecutionAttemptAudit>;
  update(request: ExecutionAttemptAuditUpdateRequest): Promise<ExecutionAttemptAudit>;
};

export class ExecutionAttemptAuditRepositoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionAttemptAuditRepositoryValidationError";
  }
}

export const assertExecutionAttemptAuditSnapshotIsUnchanged = (
  current: ExecutionAttemptAudit,
  next: ExecutionAttemptAudit
): void => {
  if (
    current.routedActionExecutionEnvelopeId !== next.routedActionExecutionEnvelopeId ||
    current.reviewDecisionRoutingResultId !== next.reviewDecisionRoutingResultId ||
    current.researchReviewDecisionId !== next.researchReviewDecisionId ||
    current.actionTarget !== next.actionTarget ||
    current.downstreamCommandType !== next.downstreamCommandType ||
    current.attemptedBy !== next.attemptedBy ||
    current.attemptedAt !== next.attemptedAt ||
    current.createdAtUtc !== next.createdAtUtc
  ) {
    throw new ExecutionAttemptAuditRepositoryValidationError(
      "execution_attempt_audit received snapshot is immutable"
    );
  }
};
