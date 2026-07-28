import type { ExecutionAttemptAudit } from "../execution/execution-attempt-audit.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import { assertExecutionAttemptAuditSnapshotIsUnchanged } from "./execution-attempt-audit-repository.js";
import type {
  ExecutionAttemptAuditCreateRequest,
  ExecutionAttemptAuditRepository,
  ExecutionAttemptAuditUpdateRequest
} from "./execution-attempt-audit-repository.js";

type PersistedExecutionAttemptAuditRecord = {
  audit: ExecutionAttemptAudit;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneAudit = (audit: ExecutionAttemptAudit): ExecutionAttemptAudit => structuredClone(audit);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export class InMemoryExecutionAttemptAuditRepository
  implements ExecutionAttemptAuditRepository
{
  private readonly recordsByAttemptId = new Map<string, PersistedExecutionAttemptAuditRecord>();

  async getById(attemptId: string): Promise<ExecutionAttemptAudit | null> {
    const record = this.recordsByAttemptId.get(attemptId);
    return record ? cloneAudit(record.audit) : null;
  }

  async getByRoutedActionExecutionEnvelopeId(
    routedActionExecutionEnvelopeId: string
  ): Promise<ExecutionAttemptAudit | null> {
    const record = [...this.recordsByAttemptId.values()].find(
      (candidate) =>
        candidate.audit.routedActionExecutionEnvelopeId === routedActionExecutionEnvelopeId
    );
    return record ? cloneAudit(record.audit) : null;
  }

  async listByReviewDecisionRoutingResultId(
    reviewDecisionRoutingResultId: string
  ): Promise<ExecutionAttemptAudit[]> {
    return [...this.recordsByAttemptId.values()]
      .filter((record) => record.audit.reviewDecisionRoutingResultId === reviewDecisionRoutingResultId)
      .map((record) => cloneAudit(record.audit));
  }

  async listByStatus(statuses: ExecutionAttemptAudit["status"][]): Promise<ExecutionAttemptAudit[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsByAttemptId.values()]
      .filter((record) => allowedStatuses.has(record.audit.status))
      .map((record) => cloneAudit(record.audit));
  }

  async create(request: ExecutionAttemptAuditCreateRequest): Promise<ExecutionAttemptAudit> {
    const attemptId = request.audit.attemptId;
    if (this.recordsByAttemptId.has(attemptId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "execution_attempt_audit",
        entityId: attemptId,
        operation: "create"
      });
    }

    if (
      request.audit.routedActionExecutionEnvelopeId &&
      [...this.recordsByAttemptId.values()].some(
        (record) =>
          record.audit.routedActionExecutionEnvelopeId ===
          request.audit.routedActionExecutionEnvelopeId
      )
    ) {
      throw createAlreadyExistsRepositoryError({
        entityType: "execution_attempt_audit",
        entityId: attemptId,
        operation: "create"
      });
    }

    const audit = cloneAudit(request.audit);
    this.recordsByAttemptId.set(attemptId, {
      audit,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneAudit(audit);
  }

  async update(request: ExecutionAttemptAuditUpdateRequest): Promise<ExecutionAttemptAudit> {
    const attemptId = request.audit.attemptId;
    const currentRecord = this.recordsByAttemptId.get(attemptId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "execution_attempt_audit",
        entityId: attemptId,
        operation: "update"
      });
    }

    if (currentRecord.audit.status !== "received" || request.audit.status === "received") {
      throw new Error("execution_attempt_audit terminal outcome is append-only");
    }

    assertExecutionAttemptAuditSnapshotIsUnchanged(currentRecord.audit, request.audit);

    if (request.expectedVersion !== null && request.expectedVersion !== currentRecord.version) {
      throw createVersionMismatchRepositoryError({
        entityType: "execution_attempt_audit",
        entityId: attemptId,
        operation: "update",
        expectedVersion: request.expectedVersion,
        actualVersion: currentRecord.version
      });
    }

    const audit = cloneAudit(request.audit);
    this.recordsByAttemptId.set(attemptId, {
      audit,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneAudit(audit);
  }
}
