import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  ExecutionAttemptAuditRecordWriteRequest,
  ExecutionAttemptAuditRelationalRepositoryAdapter
} from "./execution-attempt-audit-relational-repository-adapter.js";
import type { ExecutionAttemptAuditDurableRecord } from "../storage/execution-attempt-audit-relational-slice.js";

const cloneRecord = (record: ExecutionAttemptAuditDurableRecord): ExecutionAttemptAuditDurableRecord =>
  structuredClone(record);

export class InMemoryExecutionAttemptAuditRelationalRepositoryAdapter
  implements ExecutionAttemptAuditRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, ExecutionAttemptAuditDurableRecord>();

  async loadExecutionAttemptAuditRecord(attemptId: string): Promise<ExecutionAttemptAuditDurableRecord | null> {
    const record = this.recordsById.get(attemptId);
    return record ? cloneRecord(record) : null;
  }

  async listExecutionAttemptAuditRecordsByRoutingResultId(routingResultId: string): Promise<ExecutionAttemptAuditDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.reviewDecisionRoutingResultId === routingResultId)
      .map(cloneRecord);
  }

  async listExecutionAttemptAuditRecordsByStatus(statuses: ExecutionAttemptAuditDurableRecord["executionAttemptAuditStatus"][]): Promise<ExecutionAttemptAuditDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowedStatuses.has(record.executionAttemptAuditStatus))
      .map(cloneRecord);
  }

  async insertExecutionAttemptAuditRecord(request: ExecutionAttemptAuditRecordWriteRequest): Promise<ExecutionAttemptAuditDurableRecord> {
    const attemptId = request.record.identity.entityId;
    if (this.recordsById.has(attemptId)) {
      throw createAlreadyExistsRepositoryError({ entityType: "execution_attempt_audit", entityId: attemptId, operation: "create" });
    }
    const record = cloneRecord(request.record);
    this.recordsById.set(attemptId, record);
    return cloneRecord(record);
  }

  async updateExecutionAttemptAuditRecord(request: ExecutionAttemptAuditRecordWriteRequest): Promise<ExecutionAttemptAuditDurableRecord> {
    const attemptId = request.record.identity.entityId;
    const current = this.recordsById.get(attemptId);
    if (!current) {
      throw createNotFoundRepositoryError({ entityType: "execution_attempt_audit", entityId: attemptId, operation: "update" });
    }
    if (request.expectedVersion !== null && request.expectedVersion !== undefined && request.expectedVersion !== current.identity.version) {
      throw createVersionMismatchRepositoryError({ entityType: "execution_attempt_audit", entityId: attemptId, operation: "update", expectedVersion: request.expectedVersion, actualVersion: current.identity.version });
    }
    const record = cloneRecord(request.record);
    this.recordsById.set(attemptId, record);
    return cloneRecord(record);
  }
}
