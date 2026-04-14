import type { EvaluationResult } from "../evaluation.js";
import type { EvaluationResultRepository } from "../repositories/evaluation-result-repository.js";
import type { SignalCandidateRepository } from "../repositories/signal-candidate-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import { EVALUATION_STATUSES } from "../evaluation/evaluation-status.js";

export type CreatePendingEvaluationResultRequest = {
  result: EvaluationResult;
  metadata: ProductRecordMetadata;
};

export type StartEvaluationResultRequest = {
  evaluationResultId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type FinalizeEvaluationResultRequest = {
  evaluationResultId: string;
  referencePrice: number;
  finalPrice: number;
  highInWindow: number;
  lowInWindow: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  evaluatedAt: string;
  notes?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ExpireEvaluationResultRequest = {
  evaluationResultId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type InvalidateEvaluationResultRequest = {
  evaluationResultId: string;
  notes?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type EvaluationServiceDependencies = {
  evaluationResultRepository: EvaluationResultRepository;
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
};

export type EvaluationService = {
  createPendingEvaluationResult(request: CreatePendingEvaluationResultRequest): Promise<EvaluationResult>;
  startEvaluationResult(request: StartEvaluationResultRequest): Promise<EvaluationResult | null>;
  finalizeEvaluationResult(request: FinalizeEvaluationResultRequest): Promise<EvaluationResult | null>;
  expireEvaluationResult(request: ExpireEvaluationResultRequest): Promise<EvaluationResult | null>;
  invalidateEvaluationResult(request: InvalidateEvaluationResultRequest): Promise<EvaluationResult | null>;
};

export class EvaluationResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationResultValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new EvaluationResultValidationError(`${fieldName} is required`);
  }
};

const assertFiniteNumber = (value: number, fieldName: string): void => {
  if (!Number.isFinite(value)) {
    throw new EvaluationResultValidationError(`${fieldName} must be a finite number`);
  }
};

const assertValidStatus = (status: EvaluationResult["status"]): void => {
  if (!EVALUATION_STATUSES.includes(status)) {
    throw new EvaluationResultValidationError(`invalid evaluation_result status: ${status}`);
  }
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

const assertTransitionAllowed = (
  currentStatus: EvaluationResult["status"],
  nextStatus: EvaluationResult["status"]
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (
    currentStatus === "pending" &&
    (nextStatus === "in_progress" || nextStatus === "expired" || nextStatus === "invalidated")
  ) {
    return;
  }

  if (
    currentStatus === "in_progress" &&
    (nextStatus === "completed" || nextStatus === "expired" || nextStatus === "invalidated")
  ) {
    return;
  }

  if (currentStatus === "completed" && nextStatus === "invalidated") {
    return;
  }

  throw new EvaluationResultValidationError(
    `invalid evaluation_result status transition: ${currentStatus} -> ${nextStatus}`
  );
};

const validateEvaluationResultShape = (result: EvaluationResult): void => {
  assertNonEmptyString(result.id, "id");
  assertNonEmptyString(result.signalCandidateId, "signalCandidateId");
  assertNonEmptyString(result.evaluationWindowId, "evaluationWindowId");
  assertValidStatus(result.status);
};

const assertNoCompletedMetricsOnCreation = (result: EvaluationResult): void => {
  const metrics = [
    result.referencePrice,
    result.finalPrice,
    result.highInWindow,
    result.lowInWindow,
    result.absoluteMove,
    result.percentageMove,
    result.maxFavorableExcursion,
    result.maxAdverseExcursion
  ];

  if (metrics.some((value) => value !== null) || result.evaluatedAt !== null) {
    throw new EvaluationResultValidationError(
      "pending evaluation_result cannot include finalized metrics"
    );
  }
};

const assertCompletedMetricsConsistency = (request: FinalizeEvaluationResultRequest): void => {
  assertFiniteNumber(request.referencePrice, "referencePrice");
  assertFiniteNumber(request.finalPrice, "finalPrice");
  assertFiniteNumber(request.highInWindow, "highInWindow");
  assertFiniteNumber(request.lowInWindow, "lowInWindow");
  assertFiniteNumber(request.maxFavorableExcursion, "maxFavorableExcursion");
  assertFiniteNumber(request.maxAdverseExcursion, "maxAdverseExcursion");

  if (request.highInWindow < request.lowInWindow) {
    throw new EvaluationResultValidationError("highInWindow must be greater than or equal to lowInWindow");
  }

  if (request.referencePrice < request.lowInWindow || request.referencePrice > request.highInWindow) {
    throw new EvaluationResultValidationError("referencePrice must be between lowInWindow and highInWindow");
  }

  if (request.finalPrice < request.lowInWindow || request.finalPrice > request.highInWindow) {
    throw new EvaluationResultValidationError("finalPrice must be between lowInWindow and highInWindow");
  }

  if (request.maxFavorableExcursion < 0) {
    throw new EvaluationResultValidationError("maxFavorableExcursion must be greater than or equal to zero");
  }

  if (request.maxAdverseExcursion > 0) {
    throw new EvaluationResultValidationError("maxAdverseExcursion must be less than or equal to zero");
  }

  assertNonEmptyString(request.evaluatedAt, "evaluatedAt");
};

const roundMetric = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

export const createEvaluationService = (dependencies: EvaluationServiceDependencies): EvaluationService => {
  const { evaluationResultRepository, signalCandidateRepository } = dependencies;

  return {
    async createPendingEvaluationResult(request) {
      validateEvaluationResultShape(request.result);
      if (request.result.status !== "pending") {
        throw new EvaluationResultValidationError("evaluation_result must start in pending status");
      }
      assertNoCompletedMetricsOnCreation(request.result);

      const signalCandidate = await signalCandidateRepository.getById(request.result.signalCandidateId);
      if (!signalCandidate) {
        throw new EvaluationResultValidationError(
          `signal_candidate not found: ${request.result.signalCandidateId}`
        );
      }

      const duplicate = await evaluationResultRepository.getBySignalCandidateAndWindow(
        request.result.signalCandidateId,
        request.result.evaluationWindowId
      );
      if (duplicate) {
        throw new EvaluationResultValidationError(
          `duplicate evaluation_result for candidate/window: ${request.result.signalCandidateId}/${request.result.evaluationWindowId}`
        );
      }

      return evaluationResultRepository.create({
        result: request.result,
        metadata: request.metadata
      });
    },
    async startEvaluationResult(request) {
      const current = await evaluationResultRepository.getById(request.evaluationResultId);
      if (!current) {
        return null;
      }

      assertTransitionAllowed(current.status, "in_progress");
      return evaluationResultRepository.updateStatus({
        evaluationResultId: request.evaluationResultId,
        status: "in_progress",
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async finalizeEvaluationResult(request) {
      const current = await evaluationResultRepository.getById(request.evaluationResultId);
      if (!current) {
        return null;
      }

      assertTransitionAllowed(current.status, "completed");
      assertCompletedMetricsConsistency(request);

      const absoluteMove = roundMetric(request.finalPrice - request.referencePrice);
      const percentageMove =
        request.referencePrice === 0
          ? 0
          : roundMetric((absoluteMove / request.referencePrice) * 100);

      return evaluationResultRepository.update({
        result: {
          ...current,
          status: "completed",
          referencePrice: request.referencePrice,
          finalPrice: request.finalPrice,
          highInWindow: request.highInWindow,
          lowInWindow: request.lowInWindow,
          absoluteMove,
          percentageMove,
          maxFavorableExcursion: request.maxFavorableExcursion,
          maxAdverseExcursion: request.maxAdverseExcursion,
          evaluatedAt: request.evaluatedAt,
          notes: request.notes ?? current.notes,
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async expireEvaluationResult(request) {
      const current = await evaluationResultRepository.getById(request.evaluationResultId);
      if (!current) {
        return null;
      }

      assertTransitionAllowed(current.status, "expired");
      return evaluationResultRepository.updateStatus({
        evaluationResultId: request.evaluationResultId,
        status: "expired",
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async invalidateEvaluationResult(request) {
      const current = await evaluationResultRepository.getById(request.evaluationResultId);
      if (!current) {
        return null;
      }

      assertTransitionAllowed(current.status, "invalidated");
      return evaluationResultRepository.update({
        result: {
          ...current,
          status: "invalidated",
          notes: request.notes ?? current.notes,
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    }
  };
};
