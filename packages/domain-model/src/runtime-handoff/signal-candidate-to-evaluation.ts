import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { SignalCandidateService } from "../services/signal-candidate-service.js";
import {
  EvaluationResultValidationError,
  type EvaluationService
} from "../services/evaluation-service.js";
import type { EvaluationTriggerResult } from "./evaluation-trigger-result.js";
import type { SignalCandidateEvaluationTrigger } from "./signal-candidate-evaluation-trigger.js";
import type { StartEvaluationCommand } from "./start-evaluation-command.js";

export type SignalCandidateToEvaluationDependencies = {
  evaluationService: EvaluationService;
  signalCandidateService: SignalCandidateService;
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
  evaluationResultRepository: Pick<EvaluationResultRepository, "getBySignalCandidateAndWindow">;
};

const assertRequired = (value: string | undefined, fieldName: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const resolveEvaluationWindowId = (trigger: SignalCandidateEvaluationTrigger): string => {
  if (trigger.evaluationWindowId?.trim()) {
    return trigger.evaluationWindowId.trim();
  }

  if (trigger.evaluationWindowDescriptor) {
    const descriptor = trigger.evaluationWindowDescriptor;
    return `window-${descriptor.purpose}-${descriptor.durationValue}${descriptor.durationUnit}`;
  }

  throw new Error("evaluationWindowId or evaluationWindowDescriptor is required");
};

const buildEvaluationResultId = (command: StartEvaluationCommand): string => {
  if (command.evaluationResultId?.trim()) {
    return command.evaluationResultId.trim();
  }

  return `result-${command.signalCandidateId}-${command.evaluationWindowId}`;
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected evaluation trigger failure";

export const createSignalCandidateToEvaluationHandoff = (
  dependencies: SignalCandidateToEvaluationDependencies
): {
  trigger(
    payload: SignalCandidateEvaluationTrigger,
    metadata: ProductRecordMetadata
  ): Promise<EvaluationTriggerResult>;
} => {
  const {
    evaluationService,
    signalCandidateService,
    signalCandidateRepository,
    evaluationResultRepository
  } = dependencies;

  return {
    async trigger(payload, metadata): Promise<EvaluationTriggerResult> {
      let command: StartEvaluationCommand;
      try {
        assertRequired(payload.signalCandidateId, "signalCandidateId");
        assertRequired(payload.setupDefinitionId, "setupDefinitionId");
        assertRequired(payload.monitoredSymbolId, "monitoredSymbolId");
        assertRequired(payload.triggeredAt, "triggeredAt");
        command = {
          signalCandidateId: payload.signalCandidateId,
          setupDefinitionId: payload.setupDefinitionId,
          monitoredSymbolId: payload.monitoredSymbolId,
          triggeredAt: payload.triggeredAt,
          evaluationWindowId: resolveEvaluationWindowId(payload),
          originRunId: payload.originRunId,
          triggerReason: payload.triggerReason,
          evaluationResultId: payload.evaluationResultId
        };
      } catch (error: unknown) {
        return {
          status: "rejected_validation",
          reason: asErrorMessage(error),
          warnings: []
        };
      }

      const candidate = await signalCandidateRepository.getById(command.signalCandidateId);
      if (!candidate) {
        return {
          status: "rejected_validation",
          reason: `signal_candidate not found: ${command.signalCandidateId}`,
          warnings: []
        };
      }

      if (
        candidate.setupDefinitionId !== command.setupDefinitionId ||
        candidate.monitoredSymbolId !== command.monitoredSymbolId
      ) {
        return {
          status: "rejected_validation",
          reason: "signal candidate reference mismatch in evaluation trigger payload",
          warnings: []
        };
      }

      if (candidate.status !== "detected" && candidate.status !== "under_review") {
        return {
          status: "rejected_lifecycle",
          reason: `signal candidate status does not allow evaluation trigger: ${candidate.status}`,
          warnings: []
        };
      }

      const duplicate = await evaluationResultRepository.getBySignalCandidateAndWindow(
        command.signalCandidateId,
        command.evaluationWindowId
      );
      if (duplicate) {
        return {
          status: "rejected_duplicate",
          evaluationResultId: duplicate.id,
          evaluationWindowId: command.evaluationWindowId,
          reason: `duplicate evaluation trigger for candidate/window: ${command.signalCandidateId}/${command.evaluationWindowId}`,
          warnings: []
        };
      }

      try {
        const pending = await evaluationService.createPendingEvaluationResult({
          result: {
            id: buildEvaluationResultId(command),
            signalCandidateId: command.signalCandidateId,
            evaluationWindowId: command.evaluationWindowId,
            status: "pending",
            referencePrice: null,
            finalPrice: null,
            highInWindow: null,
            lowInWindow: null,
            absoluteMove: null,
            percentageMove: null,
            maxFavorableExcursion: null,
            maxAdverseExcursion: null,
            evaluatedAt: null,
            notes: command.triggerReason,
            createdAt: command.triggeredAt,
            updatedAt: command.triggeredAt
          },
          metadata
        });

        const started = await evaluationService.startEvaluationResult({
          evaluationResultId: pending.id,
          metadata,
          expectedVersion: null
        });
        if (!started) {
          throw new Error(`evaluation_result start returned null for ${pending.id}`);
        }

        const warnings: string[] = [];
        if (candidate.status === "detected") {
          try {
            const updatedCandidate = await signalCandidateService.updateSignalCandidateStatus({
              signalCandidateId: candidate.id,
              status: "under_review",
              metadata,
              expectedVersion: null
            });
            if (!updatedCandidate) {
              warnings.push(
                `evaluation started but signal_candidate status update returned null: ${candidate.id}`
              );
            }
          } catch (error: unknown) {
            warnings.push(
              `evaluation started but signal_candidate status update failed: ${asErrorMessage(error)}`
            );
          }
        }

        return {
          status: "started",
          evaluationResultId: pending.id,
          evaluationWindowId: command.evaluationWindowId,
          warnings
        };
      } catch (error: unknown) {
        if (error instanceof EvaluationResultValidationError) {
          return {
            status: "rejected_validation",
            evaluationWindowId: command.evaluationWindowId,
            reason: error.message,
            warnings: []
          };
        }

        return {
          status: "failed",
          evaluationWindowId: command.evaluationWindowId,
          reason: asErrorMessage(error),
          warnings: ["evaluation trigger can be retried after resolving runtime handoff failure"]
        };
      }
    }
  };
};
