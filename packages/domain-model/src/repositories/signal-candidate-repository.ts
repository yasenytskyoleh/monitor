import type { SignalCandidate, SignalCandidateStatus } from "../signal-candidate.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SignalCandidateCreateRequest = {
  candidate: SignalCandidate;
  metadata: ProductRecordMetadata;
};

export type SignalCandidateUpdateRequest = {
  candidate: SignalCandidate;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SignalCandidateStatusUpdateRequest = {
  signalCandidateId: string;
  status: SignalCandidateStatus;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SignalCandidateRepository = {
  getById(signalCandidateId: string): Promise<SignalCandidate | null>;
  listBySetupDefinitionId(setupDefinitionId: string): Promise<SignalCandidate[]>;
  listByMonitoredSymbolId(monitoredSymbolId: string): Promise<SignalCandidate[]>;
  listByStatus(statuses: SignalCandidateStatus[]): Promise<SignalCandidate[]>;
  create(request: SignalCandidateCreateRequest): Promise<SignalCandidate>;
  update(request: SignalCandidateUpdateRequest): Promise<SignalCandidate>;
  updateStatus(request: SignalCandidateStatusUpdateRequest): Promise<SignalCandidate | null>;
};
