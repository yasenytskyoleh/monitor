import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { SignalCandidate } from "../signal-candidate.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import {
  SignalCandidateValidationError,
  type SignalCandidateService
} from "../services/signal-candidate-service.js";
import type { SetupDefinitionService } from "../services/setup-definition-service.js";
import type { DetectionToCandidateCommand } from "./detection-to-candidate-command.js";
import type { RuntimeHandoffResult } from "./runtime-handoff-result.js";

export type SignalCandidateFromDetectionDependencies = {
  signalCandidateService: SignalCandidateService;
  setupDefinitionService: Pick<SetupDefinitionService, "resolveActiveRevision">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "listBySetupDefinitionId">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new SignalCandidateValidationError(`${fieldName} is required`);
  }
};

const buildCandidateId = (command: DetectionToCandidateCommand): string => {
  if (command.candidateId?.trim()) {
    return command.candidateId.trim();
  }

  if (command.detectionHitId?.trim()) {
    return `candidate-${command.detectionHitId.trim()}`;
  }

  return `candidate-${command.setupDefinitionId}-${command.monitoredSymbolId}-${command.detectedAt}`;
};

const isDuplicateDetectionHit = (
  command: DetectionToCandidateCommand,
  existingCandidate: SignalCandidate
): boolean =>
  Boolean(
    command.detectionHitId &&
      existingCandidate.detectionHitId &&
      existingCandidate.detectionHitId === command.detectionHitId &&
      existingCandidate.setupDefinitionId === command.setupDefinitionId &&
      existingCandidate.setupRevisionId === command.setupRevisionId &&
      existingCandidate.monitoredSymbolId === command.monitoredSymbolId
  );

export const createSignalCandidateFromDetectionHandoff = (
  dependencies: SignalCandidateFromDetectionDependencies
): {
  handoff(
    command: DetectionToCandidateCommand,
    metadata: ProductRecordMetadata
  ): Promise<RuntimeHandoffResult>;
} => {
  const {
    signalCandidateService,
    setupDefinitionService,
    signalCandidateRepository
  } = dependencies;

  return {
    async handoff(command, metadata): Promise<RuntimeHandoffResult> {
      try {
        assertRequired(command.setupDefinitionId, "setupDefinitionId");
        assertRequired(command.setupRevisionId, "setupRevisionId");
        assertRequired(command.monitoredSymbolId, "monitoredSymbolId");
        assertRequired(command.detectedAt, "detectedAt");
        assertRequired(command.evidenceSummary, "evidenceSummary");
      } catch (error: unknown) {
        return {
          status: "rejected_validation",
          reason: error instanceof Error ? error.message : "invalid detection handoff command",
          warnings: []
        };
      }

      const resolvedActiveRevision = await setupDefinitionService.resolveActiveRevision({
        setupDefinitionId: command.setupDefinitionId,
        resolvedAt: command.detectedAt,
        runtimeContext: command.sourceMetadata,
        originRunId: command.originRunId
      });
      if (!resolvedActiveRevision) {
        return {
          status: "rejected_validation",
          reason: `active setup revision not found for setup_definition: ${command.setupDefinitionId}`,
          warnings: []
        };
      }

      if (resolvedActiveRevision.setupRevisionId !== command.setupRevisionId) {
        return {
          status: "rejected_validation",
          reason: `setup revision mismatch: resolved ${resolvedActiveRevision.setupRevisionId}, command provided ${command.setupRevisionId}`,
          warnings: []
        };
      }

      if (command.detectionHitId) {
        const existingCandidates = await signalCandidateRepository.listBySetupDefinitionId(
          command.setupDefinitionId
        );
        const duplicate = existingCandidates.find((candidate) =>
          isDuplicateDetectionHit(command, candidate)
        );
        if (duplicate) {
          return {
            status: "rejected_duplicate",
            signalCandidateId: duplicate.id,
            reason: `duplicate detection hit rejected: ${command.detectionHitId}`,
            warnings: []
          };
        }
      }

      try {
        const candidate = await signalCandidateService.createSignalCandidate({
          candidate: {
            id: buildCandidateId(command),
            setupDefinitionId: command.setupDefinitionId,
            setupRevisionId: command.setupRevisionId,
            monitoredSymbolId: command.monitoredSymbolId,
            detectionHitId: command.detectionHitId,
            status: "detected",
            detectedAt: command.detectedAt,
            evidenceSummary: command.evidenceSummary,
            originRunId: command.originRunId,
            createdAt: command.detectedAt,
            updatedAt: command.detectedAt
          },
          metadata
        });

        return {
          status: "created",
          signalCandidateId: candidate.id,
          warnings: []
        };
      } catch (error: unknown) {
        if (error instanceof SignalCandidateValidationError) {
          return {
            status: "rejected_validation",
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          reason: error instanceof Error ? error.message : "runtime handoff failed unexpectedly",
          warnings: ["candidate creation may be retried after resolving runtime handoff failure"]
        };
      }
    }
  };
};
