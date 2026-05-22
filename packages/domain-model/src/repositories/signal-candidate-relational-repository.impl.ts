import type { SignalCandidate } from "../signal-candidate.js";
import type { SignalCandidateDurableRecord } from "../storage/signal-evaluation-relational-slice.js";
import type {
  SignalCandidateCreateRequest,
  SignalCandidateRepository,
  SignalCandidateStatusUpdateRequest,
  SignalCandidateUpdateRequest
} from "./signal-candidate-repository.js";
import {
  dehydrateSignalCandidateToDurableRecord,
  hydrateSignalCandidateFromDurableRecord
} from "./signal-evaluation-relational-repository-mappers.js";
import type { SignalEvaluationRelationalRepositoryAdapter } from "./signal-evaluation-relational-repository-adapter.js";
import { createNotFoundRepositoryError } from "./repository-error.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextSignalCandidateRecord = (
  candidate: SignalCandidate,
  metadata: SignalCandidateStatusUpdateRequest["metadata"] | SignalCandidateUpdateRequest["metadata"],
  currentRecord: SignalCandidateDurableRecord
): SignalCandidateDurableRecord =>
  dehydrateSignalCandidateToDurableRecord(candidate, metadata, currentRecord.identity.version + 1);

export class RelationalSignalCandidateRepository implements SignalCandidateRepository {
  constructor(private readonly adapter: SignalEvaluationRelationalRepositoryAdapter) {}

  async getById(signalCandidateId: string): Promise<SignalCandidate | null> {
    const record = await this.adapter.loadSignalCandidateRecord(signalCandidateId);
    return record ? hydrateSignalCandidateFromDurableRecord(record) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<SignalCandidate[]> {
    const records = await this.adapter.listSignalCandidateRecordsBySetupDefinitionId(setupDefinitionId);
    return records.map((record) => hydrateSignalCandidateFromDurableRecord(record));
  }

  async listByMonitoredSymbolId(monitoredSymbolId: string): Promise<SignalCandidate[]> {
    const records = await this.adapter.listSignalCandidateRecordsByMonitoredSymbolId(monitoredSymbolId);
    return records.map((record) => hydrateSignalCandidateFromDurableRecord(record));
  }

  async listByStatus(statuses: SignalCandidate["status"][]): Promise<SignalCandidate[]> {
    const records = await this.adapter.listSignalCandidateRecordsByStatus(statuses);
    return records.map((record) => hydrateSignalCandidateFromDurableRecord(record));
  }

  async create(request: SignalCandidateCreateRequest): Promise<SignalCandidate> {
    const createdRecord = await this.adapter.insertSignalCandidateRecord({
      record: dehydrateSignalCandidateToDurableRecord(request.candidate, request.metadata, 1),
      expectedVersion: null
    });

    return hydrateSignalCandidateFromDurableRecord(createdRecord);
  }

  async update(request: SignalCandidateUpdateRequest): Promise<SignalCandidate> {
    const currentRecord = await this.adapter.loadSignalCandidateRecord(request.candidate.id);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "signal_candidate",
        entityId: request.candidate.id,
        operation: "update"
      });
    }

    const updatedRecord = await this.adapter.updateSignalCandidateRecord({
      record: buildNextSignalCandidateRecord(request.candidate, request.metadata, currentRecord),
      expectedVersion: request.expectedVersion
    });

    return hydrateSignalCandidateFromDurableRecord(updatedRecord);
  }

  async updateStatus(request: SignalCandidateStatusUpdateRequest): Promise<SignalCandidate | null> {
    const currentRecord = await this.adapter.loadSignalCandidateRecord(request.signalCandidateId);
    if (!currentRecord) {
      return null;
    }

    const currentCandidate = hydrateSignalCandidateFromDurableRecord(currentRecord);
    const updatedRecord = await this.adapter.updateSignalCandidateRecord({
      record: buildNextSignalCandidateRecord(
        {
          ...currentCandidate,
          status: request.status,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentRecord
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateSignalCandidateFromDurableRecord(updatedRecord);
  }
}
