import type {
  SignalCandidateCreateRequest,
  SignalCandidateRepository,
  SignalCandidateStatusUpdateRequest,
  SignalCandidateUpdateRequest
} from "./signal-candidate-repository.js";
import type { SignalCandidate } from "../signal-candidate.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedSignalCandidateRecord = {
  candidate: SignalCandidate;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneSignalCandidate = (candidate: SignalCandidate): SignalCandidate => structuredClone(candidate);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedSignalCandidateRecord,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw new Error(
      `signal_candidate version mismatch: expected ${expectedVersion}, got ${record.version}`
    );
  }
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemorySignalCandidateRepository implements SignalCandidateRepository {
  private readonly recordsById = new Map<string, PersistedSignalCandidateRecord>();

  async getById(signalCandidateId: string): Promise<SignalCandidate | null> {
    const record = this.recordsById.get(signalCandidateId);
    return record ? cloneSignalCandidate(record.candidate) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<SignalCandidate[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.candidate.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneSignalCandidate(record.candidate));
  }

  async listByMonitoredSymbolId(monitoredSymbolId: string): Promise<SignalCandidate[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.candidate.monitoredSymbolId === monitoredSymbolId)
      .map((record) => cloneSignalCandidate(record.candidate));
  }

  async listByStatus(statuses: SignalCandidate["status"][]): Promise<SignalCandidate[]> {
    const allowed = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowed.has(record.candidate.status))
      .map((record) => cloneSignalCandidate(record.candidate));
  }

  async create(request: SignalCandidateCreateRequest): Promise<SignalCandidate> {
    const signalCandidateId = request.candidate.id;
    if (this.recordsById.has(signalCandidateId)) {
      throw new Error(`signal_candidate already exists: ${signalCandidateId}`);
    }

    const candidate = cloneSignalCandidate(request.candidate);
    this.recordsById.set(signalCandidateId, {
      candidate,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSignalCandidate(candidate);
  }

  async update(request: SignalCandidateUpdateRequest): Promise<SignalCandidate> {
    const signalCandidateId = request.candidate.id;
    const currentRecord = this.recordsById.get(signalCandidateId);
    if (!currentRecord) {
      throw new Error(`signal_candidate not found: ${signalCandidateId}`);
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const candidate = cloneSignalCandidate(request.candidate);
    this.recordsById.set(signalCandidateId, {
      candidate,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSignalCandidate(candidate);
  }

  async updateStatus(request: SignalCandidateStatusUpdateRequest): Promise<SignalCandidate | null> {
    const currentRecord = this.recordsById.get(request.signalCandidateId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const candidate: SignalCandidate = {
      ...currentRecord.candidate,
      status: request.status,
      updatedAt: buildUpdateTimestamp(request.metadata)
    };

    this.recordsById.set(request.signalCandidateId, {
      candidate,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSignalCandidate(candidate);
  }
}
