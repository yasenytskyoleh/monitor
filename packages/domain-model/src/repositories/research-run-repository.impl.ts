import type { ResearchRun } from "../research-run.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import {
  assertResearchRunContextIsUnchanged,
  assertValidResearchRunCompletionState,
  type ResearchRunCreateRequest,
  type ResearchRunRepository,
  type ResearchRunUpdateRequest
} from "./research-run-repository.js";

type PersistedResearchRunRecord = {
  run: ResearchRun;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneRun = (run: ResearchRun): ResearchRun => structuredClone(run);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export class InMemoryResearchRunRepository implements ResearchRunRepository {
  private readonly recordsByRunId = new Map<string, PersistedResearchRunRecord>();

  async getById(runId: string): Promise<ResearchRun | null> {
    const record = this.recordsByRunId.get(runId);
    return record ? cloneRun(record.run) : null;
  }

  async listByHypothesisId(hypothesisId: string): Promise<ResearchRun[]> {
    return [...this.recordsByRunId.values()]
      .filter((record) => record.run.hypothesisId === hypothesisId)
      .map((record) => cloneRun(record.run));
  }

  async listByStatus(statuses: ResearchRun["status"][]): Promise<ResearchRun[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsByRunId.values()]
      .filter((record) => allowedStatuses.has(record.run.status))
      .map((record) => cloneRun(record.run));
  }

  async create(request: ResearchRunCreateRequest): Promise<ResearchRun> {
    const runId = request.run.runId;
    if (this.recordsByRunId.has(runId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "research_run",
        entityId: runId,
        operation: "create"
      });
    }

    assertValidResearchRunCompletionState(request.run);

    const run = cloneRun(request.run);
    this.recordsByRunId.set(runId, { run, version: 1, metadata: cloneMetadata(request.metadata) });
    return cloneRun(run);
  }

  async update(request: ResearchRunUpdateRequest): Promise<ResearchRun> {
    const runId = request.run.runId;
    const record = this.recordsByRunId.get(runId);
    if (!record) {
      throw createNotFoundRepositoryError({
        entityType: "research_run",
        entityId: runId,
        operation: "update"
      });
    }

    assertValidResearchRunCompletionState(request.run);
    assertResearchRunContextIsUnchanged(record.run, request.run);

    if (request.expectedVersion !== null && request.expectedVersion !== record.version) {
      throw createVersionMismatchRepositoryError({
        entityType: "research_run",
        entityId: runId,
        operation: "update",
        expectedVersion: request.expectedVersion,
        actualVersion: record.version
      });
    }

    const run = cloneRun(request.run);
    this.recordsByRunId.set(runId, {
      run,
      version: record.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneRun(run);
  }
}
