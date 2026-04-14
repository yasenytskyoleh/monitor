import type { SignalCandidate } from "../signal-candidate.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type CreateSignalCandidateRequest = {
  candidate: SignalCandidate;
  metadata: ProductRecordMetadata;
};

export type UpdateSignalCandidateStatusRequest = {
  candidateId: string;
  status: SignalCandidate["status"];
  statusReason?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SignalCandidateServiceDependencies = {
  signalCandidateRepository: SignalCandidateRepository;
};

export type SignalCandidateService = {
  createSignalCandidate(request: CreateSignalCandidateRequest): Promise<SignalCandidate>;
  updateSignalCandidateStatus(request: UpdateSignalCandidateStatusRequest): Promise<SignalCandidate | null>;
};
