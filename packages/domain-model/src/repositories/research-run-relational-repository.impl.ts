import type { ResearchRun } from "../research-run.js";
import {
  assertResearchRunContextIsUnchanged,
  assertValidResearchRunCompletionState,
  type ResearchRunCreateRequest,
  type ResearchRunRepository,
  type ResearchRunUpdateRequest
} from "./research-run-repository.js";
import type { ResearchRunRelationalRepositoryAdapter } from "./research-run-relational-repository-adapter.js";
import {
  dehydrateResearchRunToDurableRecord,
  hydrateResearchRunFromDurableRecord
} from "./research-run-relational-repository-mappers.js";
import { createNotFoundRepositoryError } from "./repository-error.js";

export class RelationalResearchRunRepository implements ResearchRunRepository {
  constructor(private readonly adapter: ResearchRunRelationalRepositoryAdapter) {}

  async getById(runId: string): Promise<ResearchRun | null> {
    const record = await this.adapter.loadResearchRunRecord(runId);
    return record ? hydrateResearchRunFromDurableRecord(record) : null;
  }

  async listByHypothesisId(hypothesisId: string): Promise<ResearchRun[]> {
    const records = await this.adapter.listResearchRunRecordsByHypothesisId(hypothesisId);
    return records.map(hydrateResearchRunFromDurableRecord);
  }

  async listByStatus(statuses: ResearchRun["status"][]): Promise<ResearchRun[]> {
    const records = await this.adapter.listResearchRunRecordsByStatus(statuses);
    return records.map(hydrateResearchRunFromDurableRecord);
  }

  async create(request: ResearchRunCreateRequest): Promise<ResearchRun> {
    assertValidResearchRunCompletionState(request.run);

    const record = await this.adapter.insertResearchRunRecord({
      record: dehydrateResearchRunToDurableRecord(request.run, request.metadata, 1),
      expectedVersion: null
    });
    return hydrateResearchRunFromDurableRecord(record);
  }

  async update(request: ResearchRunUpdateRequest): Promise<ResearchRun> {
    const current = await this.adapter.loadResearchRunRecord(request.run.runId);
    if (!current) {
      throw createNotFoundRepositoryError({ entityType: "research_run", entityId: request.run.runId, operation: "update" });
    }
    const currentRun = hydrateResearchRunFromDurableRecord(current);
    assertValidResearchRunCompletionState(request.run);
    assertResearchRunContextIsUnchanged(currentRun, request.run);

    const record = await this.adapter.updateResearchRunRecord({
      record: dehydrateResearchRunToDurableRecord(
        request.run,
        request.metadata,
        current.identity.version + 1
      ),
      expectedVersion: request.expectedVersion
    });
    return hydrateResearchRunFromDurableRecord(record);
  }
}
