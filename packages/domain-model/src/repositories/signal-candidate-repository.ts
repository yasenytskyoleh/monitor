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
  candidateId: string;
  status: SignalCandidateStatus;
  statusReason?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SignalCandidateRepository = {
  getById(candidateId: string): Promise<SignalCandidate | null>;
  listBySetupId(setupId: string): Promise<SignalCandidate[]>;
  listBySymbolId(symbolId: string): Promise<SignalCandidate[]>;
  create(request: SignalCandidateCreateRequest): Promise<SignalCandidate>;
  update(request: SignalCandidateUpdateRequest): Promise<SignalCandidate>;
  updateStatus(request: SignalCandidateStatusUpdateRequest): Promise<SignalCandidate | null>;
};
