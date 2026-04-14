import type { SignalCandidate } from "../signal-candidate.js";
import { SIGNAL_CANDIDATE_STATUSES } from "../signal-candidate.js";
import type { MonitoredSymbolRepository } from "../repositories/monitored-symbol-repository.js";
import type { SetupDefinitionRepository } from "../repositories/setup-definition-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type CreateSignalCandidateRequest = {
  candidate: SignalCandidate;
  metadata: ProductRecordMetadata;
};

export type UpdateSignalCandidateStatusRequest = {
  signalCandidateId: string;
  status: SignalCandidate["status"];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type SignalCandidateServiceDependencies = {
  signalCandidateRepository: SignalCandidateRepository;
  setupDefinitionRepository: SetupDefinitionRepository;
  monitoredSymbolRepository: Pick<MonitoredSymbolRepository, "getById">;
};

export type SignalCandidateService = {
  createSignalCandidate(request: CreateSignalCandidateRequest): Promise<SignalCandidate>;
  updateSignalCandidateStatus(request: UpdateSignalCandidateStatusRequest): Promise<SignalCandidate | null>;
};

export class SignalCandidateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignalCandidateValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new SignalCandidateValidationError(`${fieldName} is required`);
  }
};

const assertValidStatus = (status: SignalCandidate["status"]): void => {
  if (!SIGNAL_CANDIDATE_STATUSES.includes(status)) {
    throw new SignalCandidateValidationError(`invalid signal_candidate status: ${status}`);
  }
};

const validateSignalCandidate = (candidate: SignalCandidate): void => {
  assertNonEmptyString(candidate.id, "id");
  assertNonEmptyString(candidate.setupDefinitionId, "setupDefinitionId");
  assertNonEmptyString(candidate.monitoredSymbolId, "monitoredSymbolId");
  assertNonEmptyString(candidate.detectedAt, "detectedAt");
  assertNonEmptyString(candidate.evidenceSummary, "evidenceSummary");
  assertValidStatus(candidate.status);
};

const assertTransitionAllowed = (
  currentStatus: SignalCandidate["status"],
  nextStatus: SignalCandidate["status"]
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (currentStatus === "detected" && (nextStatus === "under_review" || nextStatus === "discarded")) {
    return;
  }

  if (currentStatus === "under_review" && (nextStatus === "evaluated" || nextStatus === "discarded")) {
    return;
  }

  throw new SignalCandidateValidationError(
    `invalid signal_candidate status transition: ${currentStatus} -> ${nextStatus}`
  );
};

const validateReferences = async (
  candidate: SignalCandidate,
  setupDefinitionRepository: SetupDefinitionRepository,
  monitoredSymbolRepository: Pick<MonitoredSymbolRepository, "getById">
): Promise<void> => {
  const setupDefinition = await setupDefinitionRepository.getById(candidate.setupDefinitionId);
  if (!setupDefinition) {
    throw new SignalCandidateValidationError(
      `setup_definition not found: ${candidate.setupDefinitionId}`
    );
  }

  const monitoredSymbol = await monitoredSymbolRepository.getById(candidate.monitoredSymbolId);
  if (!monitoredSymbol) {
    throw new SignalCandidateValidationError(
      `monitored_symbol not found: ${candidate.monitoredSymbolId}`
    );
  }
};

export const createSignalCandidateService = (
  dependencies: SignalCandidateServiceDependencies
): SignalCandidateService => {
  const {
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository
  } = dependencies;

  return {
    async createSignalCandidate(request) {
      validateSignalCandidate(request.candidate);
      if (request.candidate.status !== "detected") {
        throw new SignalCandidateValidationError(
          "signal_candidate must start in detected status"
        );
      }

      await validateReferences(
        request.candidate,
        setupDefinitionRepository,
        monitoredSymbolRepository
      );
      return signalCandidateRepository.create({
        candidate: request.candidate,
        metadata: request.metadata
      });
    },
    async updateSignalCandidateStatus(request) {
      assertValidStatus(request.status);

      const current = await signalCandidateRepository.getById(request.signalCandidateId);
      if (!current) {
        return null;
      }

      assertTransitionAllowed(current.status, request.status);
      return signalCandidateRepository.updateStatus({
        signalCandidateId: request.signalCandidateId,
        status: request.status,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    }
  };
};
