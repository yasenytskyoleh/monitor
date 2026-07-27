import type { ResearchRunDurableRecord } from "../storage/research-run-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  ResearchRunRecordWriteRequest,
  ResearchRunRelationalRepositoryAdapter
} from "./research-run-relational-repository-adapter.js";

const cloneRecord = (record: ResearchRunDurableRecord): ResearchRunDurableRecord =>
  structuredClone(record);

export class InMemoryResearchRunRelationalRepositoryAdapter
  implements ResearchRunRelationalRepositoryAdapter
{
  private readonly recordsByRunId = new Map<string, ResearchRunDurableRecord>();

  async loadResearchRunRecord(runId: string): Promise<ResearchRunDurableRecord | null> {
    const record = this.recordsByRunId.get(runId);
    return record ? cloneRecord(record) : null;
  }

  async listResearchRunRecordsByHypothesisId(hypothesisId: string): Promise<ResearchRunDurableRecord[]> {
    return [...this.recordsByRunId.values()]
      .filter((record) => record.hypothesisId === hypothesisId)
      .map(cloneRecord);
  }

  async listResearchRunRecordsByStatus(
    statuses: ResearchRunDurableRecord["researchRunStatus"][]
  ): Promise<ResearchRunDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsByRunId.values()]
      .filter((record) => allowedStatuses.has(record.researchRunStatus))
      .map(cloneRecord);
  }

  async insertResearchRunRecord(
    request: ResearchRunRecordWriteRequest
  ): Promise<ResearchRunDurableRecord> {
    const runId = request.record.identity.entityId;
    if (this.recordsByRunId.has(runId)) {
      throw createAlreadyExistsRepositoryError({ entityType: "research_run", entityId: runId, operation: "create" });
    }
    const record = cloneRecord(request.record);
    this.recordsByRunId.set(runId, record);
    return cloneRecord(record);
  }

  async updateResearchRunRecord(
    request: ResearchRunRecordWriteRequest
  ): Promise<ResearchRunDurableRecord> {
    const runId = request.record.identity.entityId;
    const current = this.recordsByRunId.get(runId);
    if (!current) {
      throw createNotFoundRepositoryError({ entityType: "research_run", entityId: runId, operation: "update" });
    }
    if (request.expectedVersion !== null && request.expectedVersion !== current.identity.version) {
      throw createVersionMismatchRepositoryError({ entityType: "research_run", entityId: runId, operation: "update", expectedVersion: request.expectedVersion, actualVersion: current.identity.version });
    }
    const record = cloneRecord(request.record);
    this.recordsByRunId.set(runId, record);
    return cloneRecord(record);
  }
}
