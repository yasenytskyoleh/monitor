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
