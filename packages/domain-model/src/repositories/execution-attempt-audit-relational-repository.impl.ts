import type { ExecutionAttemptAudit } from "../execution/execution-attempt-audit.js";
import { createNotFoundRepositoryError } from "./repository-error.js";
import type {
  ExecutionAttemptAuditCreateRequest,
  ExecutionAttemptAuditRepository,
  ExecutionAttemptAuditUpdateRequest
} from "./execution-attempt-audit-repository.js";
import type { ExecutionAttemptAuditRelationalRepositoryAdapter } from "./execution-attempt-audit-relational-repository-adapter.js";
import {
  dehydrateExecutionAttemptAuditToDurableRecord,
  hydrateExecutionAttemptAuditFromDurableRecord
} from "./execution-attempt-audit-relational-repository-mappers.js";

export class RelationalExecutionAttemptAuditRepository
  implements ExecutionAttemptAuditRepository
{
  constructor(private readonly adapter: ExecutionAttemptAuditRelationalRepositoryAdapter) {}

  async getById(attemptId: string): Promise<ExecutionAttemptAudit | null> {
    const record = await this.adapter.loadExecutionAttemptAuditRecord(attemptId);
    return record ? hydrateExecutionAttemptAuditFromDurableRecord(record) : null;
  }

  async listByReviewDecisionRoutingResultId(
    reviewDecisionRoutingResultId: string
  ): Promise<ExecutionAttemptAudit[]> {
    const records = await this.adapter.listExecutionAttemptAuditRecordsByRoutingResultId(
      reviewDecisionRoutingResultId
    );
    return records.map(hydrateExecutionAttemptAuditFromDurableRecord);
  }

  async listByStatus(statuses: ExecutionAttemptAudit["status"][]): Promise<ExecutionAttemptAudit[]> {
    const records = await this.adapter.listExecutionAttemptAuditRecordsByStatus(statuses);
    return records.map(hydrateExecutionAttemptAuditFromDurableRecord);
  }

  async create(request: ExecutionAttemptAuditCreateRequest): Promise<ExecutionAttemptAudit> {
    const record = await this.adapter.insertExecutionAttemptAuditRecord({
      record: dehydrateExecutionAttemptAuditToDurableRecord(request.audit, request.metadata, 1)
    });
    return hydrateExecutionAttemptAuditFromDurableRecord(record);
  }

  async update(request: ExecutionAttemptAuditUpdateRequest): Promise<ExecutionAttemptAudit> {
    const current = await this.adapter.loadExecutionAttemptAuditRecord(request.audit.attemptId);
    if (!current) {
      throw createNotFoundRepositoryError({
        entityType: "execution_attempt_audit",
        entityId: request.audit.attemptId,
        operation: "update"
      });
    }

    if (
      current.executionAttemptAuditStatus !== "received" ||
      request.audit.status === "received"
    ) {
      throw new Error("execution_attempt_audit terminal outcome is append-only");
    }

    const record = await this.adapter.updateExecutionAttemptAuditRecord({
      record: dehydrateExecutionAttemptAuditToDurableRecord(
        request.audit,
        request.metadata,
        current.identity.version + 1
      ),
      expectedVersion: request.expectedVersion ?? current.identity.version
    });
    return hydrateExecutionAttemptAuditFromDurableRecord(record);
  }
}
