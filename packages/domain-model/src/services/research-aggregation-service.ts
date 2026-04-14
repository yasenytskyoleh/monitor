import type {
  EvaluationResultRepository,
  ResearchHypothesisRepository,
  SetupAggregateResultRepository,
  SetupDefinitionRepository,
  SignalCandidateRepository
} from "../repositories/index.js";
import type { SetupAggregateResult } from "../research/index.js";
import { AGGREGATE_COMPUTATION_STATUSES } from "../research/index.js";
import type { ProductRecordMetadata } from "../storage/index.js";

export type CreatePendingSetupAggregateResultRequest = {
  aggregate: SetupAggregateResult;
  metadata: ProductRecordMetadata;
};

export type RecomputeSetupAggregateResultRequest = {
  setupAggregateResultId: string;
  evaluationResultIds: string[];
  notes?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type UpdateSetupAggregateResultStatusRequest = {
  setupAggregateResultId: string;
  status: SetupAggregateResult["status"];
  notes?: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchAggregationServiceDependencies = {
  setupAggregateResultRepository: SetupAggregateResultRepository;
  setupDefinitionRepository: SetupDefinitionRepository;
  researchHypothesisRepository: Pick<ResearchHypothesisRepository, "getById">;
  evaluationResultRepository: Pick<EvaluationResultRepository, "getById">;
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
};

export type ResearchAggregationService = {
  createPendingSetupAggregateResult(
    request: CreatePendingSetupAggregateResultRequest
  ): Promise<SetupAggregateResult>;
  recomputeSetupAggregateResult(
    request: RecomputeSetupAggregateResultRequest
  ): Promise<SetupAggregateResult | null>;
  updateSetupAggregateResultStatus(
    request: UpdateSetupAggregateResultStatusRequest
  ): Promise<SetupAggregateResult | null>;
};

export class SetupAggregateResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupAggregateResultValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new SetupAggregateResultValidationError(`${fieldName} is required`);
  }
};

const assertValidStatus = (status: SetupAggregateResult["status"]): void => {
  if (!AGGREGATE_COMPUTATION_STATUSES.includes(status)) {
    throw new SetupAggregateResultValidationError(`invalid setup_aggregate_result status: ${status}`);
  }
};

const assertNonNegativeInteger = (value: number, fieldName: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new SetupAggregateResultValidationError(`${fieldName} must be a non-negative integer`);
  }
};

const assertFiniteNullableNumber = (value: number | null, fieldName: string): void => {
  if (value !== null && !Number.isFinite(value)) {
    throw new SetupAggregateResultValidationError(`${fieldName} must be a finite number or null`);
  }
};

const parseTimestamp = (value: string, fieldName: string): number => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new SetupAggregateResultValidationError(`${fieldName} must be a valid UTC timestamp`);
  }
  return parsed;
};

const buildUpdateTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

const roundMetric = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const validateAggregateShape = (aggregate: SetupAggregateResult): void => {
  assertNonEmptyString(aggregate.id, "id");
  assertNonEmptyString(aggregate.setupDefinitionId, "setupDefinitionId");
  assertValidStatus(aggregate.status);
  assertNonEmptyString(aggregate.aggregationScope.setupDefinitionId, "aggregationScope.setupDefinitionId");
  assertNonEmptyString(
    aggregate.aggregationScope.timeRange.startAtUtc,
    "aggregationScope.timeRange.startAtUtc"
  );
  assertNonEmptyString(
    aggregate.aggregationScope.timeRange.endAtUtc,
    "aggregationScope.timeRange.endAtUtc"
  );
  const timeRangeStart = parseTimestamp(
    aggregate.aggregationScope.timeRange.startAtUtc,
    "aggregationScope.timeRange.startAtUtc"
  );
  const timeRangeEnd = parseTimestamp(
    aggregate.aggregationScope.timeRange.endAtUtc,
    "aggregationScope.timeRange.endAtUtc"
  );
  if (timeRangeStart > timeRangeEnd) {
    throw new SetupAggregateResultValidationError(
      "aggregationScope.timeRange.startAtUtc must be before or equal to endAtUtc"
    );
  }
  assertNonNegativeInteger(aggregate.totalCandidates, "totalCandidates");
  assertNonNegativeInteger(aggregate.completedEvaluations, "completedEvaluations");
  assertNonNegativeInteger(aggregate.invalidatedEvaluations, "invalidatedEvaluations");
  if (aggregate.completedEvaluations > aggregate.totalCandidates) {
    throw new SetupAggregateResultValidationError(
      "completedEvaluations cannot exceed totalCandidates"
    );
  }
  if (aggregate.invalidatedEvaluations > aggregate.totalCandidates) {
    throw new SetupAggregateResultValidationError(
      "invalidatedEvaluations cannot exceed totalCandidates"
    );
  }

  assertFiniteNullableNumber(aggregate.averagePercentageMove, "averagePercentageMove");
  assertFiniteNullableNumber(aggregate.averageAbsoluteMove, "averageAbsoluteMove");
  assertFiniteNullableNumber(aggregate.averageFinalOutcome, "averageFinalOutcome");
  assertFiniteNullableNumber(
    aggregate.averageMaxFavorableExcursion,
    "averageMaxFavorableExcursion"
  );
  assertFiniteNullableNumber(
    aggregate.averageMaxAdverseExcursion,
    "averageMaxAdverseExcursion"
  );
  assertNonNegativeInteger(aggregate.positiveOutcomeCount, "positiveOutcomeCount");
  if (aggregate.positiveOutcomeCount > aggregate.completedEvaluations) {
    throw new SetupAggregateResultValidationError(
      "positiveOutcomeCount cannot exceed completedEvaluations"
    );
  }
};

const assertPendingMetricsOnCreate = (aggregate: SetupAggregateResult): void => {
  if (aggregate.status !== "pending") {
    throw new SetupAggregateResultValidationError(
      "setup_aggregate_result must start in pending status"
    );
  }

  const averageMetrics = [
    aggregate.averagePercentageMove,
    aggregate.averageAbsoluteMove,
    aggregate.averageFinalOutcome,
    aggregate.averageMaxFavorableExcursion,
    aggregate.averageMaxAdverseExcursion
  ];
  if (
    aggregate.totalCandidates !== 0 ||
    aggregate.completedEvaluations !== 0 ||
    aggregate.invalidatedEvaluations !== 0 ||
    aggregate.positiveOutcomeCount !== 0 ||
    aggregate.computedAt !== null ||
    averageMetrics.some((metric) => metric !== null)
  ) {
    throw new SetupAggregateResultValidationError(
      "pending setup_aggregate_result cannot include computed aggregate metrics"
    );
  }
};

const assertStatusTransitionAllowed = (
  currentStatus: SetupAggregateResult["status"],
  nextStatus: SetupAggregateResult["status"]
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (currentStatus === "pending" && (nextStatus === "completed" || nextStatus === "partial" || nextStatus === "invalid")) {
    return;
  }

  if (currentStatus === "partial" && (nextStatus === "completed" || nextStatus === "invalid")) {
    return;
  }

  if (currentStatus === "completed" && (nextStatus === "partial" || nextStatus === "invalid")) {
    return;
  }

  if (currentStatus === "invalid" && (nextStatus === "partial" || nextStatus === "completed")) {
    return;
  }

  throw new SetupAggregateResultValidationError(
    `invalid setup_aggregate_result status transition: ${currentStatus} -> ${nextStatus}`
  );
};

export const createResearchAggregationService = (
  dependencies: ResearchAggregationServiceDependencies
): ResearchAggregationService => {
  const {
    setupAggregateResultRepository,
    setupDefinitionRepository,
    researchHypothesisRepository,
    evaluationResultRepository,
    signalCandidateRepository
  } = dependencies;

  return {
    async createPendingSetupAggregateResult(request) {
      validateAggregateShape(request.aggregate);
      assertPendingMetricsOnCreate(request.aggregate);

      if (request.aggregate.aggregationScope.setupDefinitionId !== request.aggregate.setupDefinitionId) {
        throw new SetupAggregateResultValidationError(
          "aggregationScope.setupDefinitionId must match setupDefinitionId"
        );
      }

      const setupDefinition = await setupDefinitionRepository.getById(request.aggregate.setupDefinitionId);
      if (!setupDefinition) {
        throw new SetupAggregateResultValidationError(
          `setup_definition not found: ${request.aggregate.setupDefinitionId}`
        );
      }

      if (request.aggregate.researchHypothesisId) {
        const hypothesis = await researchHypothesisRepository.getById(
          request.aggregate.researchHypothesisId
        );
        if (!hypothesis) {
          throw new SetupAggregateResultValidationError(
            `research_hypothesis not found: ${request.aggregate.researchHypothesisId}`
          );
        }
      }

      const duplicate = await setupAggregateResultRepository.getBySetupDefinitionAndScope(
        request.aggregate.setupDefinitionId,
        request.aggregate.aggregationScope
      );
      if (duplicate) {
        throw new SetupAggregateResultValidationError(
          `duplicate setup_aggregate_result for setup/scope: ${request.aggregate.setupDefinitionId}`
        );
      }

      return setupAggregateResultRepository.create({
        aggregate: request.aggregate,
        metadata: request.metadata
      });
    },
    async recomputeSetupAggregateResult(request) {
      const current = await setupAggregateResultRepository.getById(request.setupAggregateResultId);
      if (!current) {
        return null;
      }

      const scopeStartAt = parseTimestamp(
        current.aggregationScope.timeRange.startAtUtc,
        "aggregationScope.timeRange.startAtUtc"
      );
      const scopeEndAt = parseTimestamp(
        current.aggregationScope.timeRange.endAtUtc,
        "aggregationScope.timeRange.endAtUtc"
      );

      const evaluationResults = [];
      for (const evaluationResultId of request.evaluationResultIds) {
        const evaluationResult = await evaluationResultRepository.getById(evaluationResultId);
        if (!evaluationResult) {
          continue;
        }

        const signalCandidate = await signalCandidateRepository.getById(evaluationResult.signalCandidateId);
        if (!signalCandidate || signalCandidate.setupDefinitionId !== current.setupDefinitionId) {
          throw new SetupAggregateResultValidationError(
            `evaluation_result ${evaluationResult.id} does not belong to setup_definition ${current.setupDefinitionId}`
          );
        }

        if (
          current.aggregationScope.evaluationWindowId !== null &&
          evaluationResult.evaluationWindowId !== current.aggregationScope.evaluationWindowId
        ) {
          throw new SetupAggregateResultValidationError(
            `evaluation_result ${evaluationResult.id} is outside aggregationScope.evaluationWindowId ${current.aggregationScope.evaluationWindowId}`
          );
        }

        if (current.aggregationScope.symbolScope.kind !== "all_monitored") {
          const allowedSymbols = new Set(current.aggregationScope.symbolScope.symbolIds);
          if (!allowedSymbols.has(signalCandidate.monitoredSymbolId)) {
            throw new SetupAggregateResultValidationError(
              `evaluation_result ${evaluationResult.id} symbol ${signalCandidate.monitoredSymbolId} is outside aggregationScope.symbolScope`
            );
          }
        }

        const candidateDetectedAt = parseTimestamp(
          signalCandidate.detectedAt,
          `signal_candidate ${signalCandidate.id}.detectedAt`
        );
        if (candidateDetectedAt < scopeStartAt || candidateDetectedAt > scopeEndAt) {
          throw new SetupAggregateResultValidationError(
            `evaluation_result ${evaluationResult.id} detectedAt is outside aggregationScope.timeRange`
          );
        }

        evaluationResults.push(evaluationResult);
      }

      const totalCandidates = new Set(evaluationResults.map((result) => result.signalCandidateId)).size;
      const completedResults = evaluationResults.filter((result) => result.status === "completed");
      const invalidatedResults = evaluationResults.filter((result) => result.status === "invalidated");
      const usableCompletedResults = completedResults.filter(
        (result) =>
          result.percentageMove !== null &&
          result.absoluteMove !== null &&
          result.maxFavorableExcursion !== null &&
          result.maxAdverseExcursion !== null
      );

      let nextStatus: SetupAggregateResult["status"] = "invalid";
      if (
        evaluationResults.length > 0 &&
        completedResults.length === evaluationResults.length &&
        usableCompletedResults.length === completedResults.length
      ) {
        nextStatus = "completed";
      } else if (usableCompletedResults.length > 0) {
        nextStatus = "partial";
      }

      assertStatusTransitionAllowed(current.status, nextStatus);

      const completedEvaluations = completedResults.length;
      const invalidatedEvaluations = invalidatedResults.length;
      const positiveOutcomeCount = usableCompletedResults.filter(
        (result) => (result.percentageMove ?? 0) > 0
      ).length;

      const averagePercentageMove =
        usableCompletedResults.length === 0
          ? null
          : roundMetric(
              usableCompletedResults.reduce((sum, result) => sum + (result.percentageMove ?? 0), 0) /
                usableCompletedResults.length
            );
      const averageAbsoluteMove =
        usableCompletedResults.length === 0
          ? null
          : roundMetric(
              usableCompletedResults.reduce((sum, result) => sum + (result.absoluteMove ?? 0), 0) /
                usableCompletedResults.length
            );
      const averageMaxFavorableExcursion =
        usableCompletedResults.length === 0
          ? null
          : roundMetric(
              usableCompletedResults.reduce(
                (sum, result) => sum + (result.maxFavorableExcursion ?? 0),
                0
              ) / usableCompletedResults.length
            );
      const averageMaxAdverseExcursion =
        usableCompletedResults.length === 0
          ? null
          : roundMetric(
              usableCompletedResults.reduce(
                (sum, result) => sum + (result.maxAdverseExcursion ?? 0),
                0
              ) / usableCompletedResults.length
            );
      const averageFinalOutcome =
        usableCompletedResults.length === 0
          ? null
          : roundMetric(
              usableCompletedResults.reduce((sum, result) => {
                const move = result.percentageMove ?? 0;
                const score = move > 0 ? 1 : move < 0 ? -1 : 0;
                return sum + score;
              }, 0) / usableCompletedResults.length
            );

      const updated: SetupAggregateResult = {
        ...current,
        status: nextStatus,
        totalCandidates,
        completedEvaluations,
        invalidatedEvaluations,
        averagePercentageMove,
        averageAbsoluteMove,
        averageFinalOutcome,
        averageMaxFavorableExcursion,
        averageMaxAdverseExcursion,
        positiveOutcomeCount,
        computedAt: buildUpdateTimestamp(request.metadata),
        notes: request.notes ?? current.notes,
        updatedAt: buildUpdateTimestamp(request.metadata)
      };
      validateAggregateShape(updated);

      return setupAggregateResultRepository.update({
        aggregate: updated,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });
    },
    async updateSetupAggregateResultStatus(request) {
      assertValidStatus(request.status);

      const current = await setupAggregateResultRepository.getById(request.setupAggregateResultId);
      if (!current) {
        return null;
      }

      assertStatusTransitionAllowed(current.status, request.status);

      if (request.status === "completed") {
        const averageMetrics = [
          current.averagePercentageMove,
          current.averageAbsoluteMove,
          current.averageFinalOutcome,
          current.averageMaxFavorableExcursion,
          current.averageMaxAdverseExcursion
        ];
        if (averageMetrics.some((metric) => metric === null)) {
          throw new SetupAggregateResultValidationError(
            "completed setup_aggregate_result requires full aggregate averages"
          );
        }
      }

      const updated = await setupAggregateResultRepository.updateStatus({
        setupAggregateResultId: request.setupAggregateResultId,
        status: request.status,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      });

      if (!updated) {
        return null;
      }

      if (request.notes === undefined) {
        return updated;
      }

      return setupAggregateResultRepository.update({
        aggregate: {
          ...updated,
          notes: request.notes,
          updatedAt: buildUpdateTimestamp(request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: null
      });
    }
  };
};
