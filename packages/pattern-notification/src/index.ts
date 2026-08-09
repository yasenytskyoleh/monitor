import type {
  SetupAggregateResult,
  SetupAggregateResultRepository,
  SignalCandidate,
  SignalCandidateRepository
} from "@monitor/domain-model";

export {
  createPatternNotificationRetentionRuntime
} from "./retention.js";
export type {
  PatternNotificationDeliveryPort,
  PatternNotificationDeliveryPortOutcome,
  PatternNotificationDeliveryPortRequest,
  PatternNotificationRetentionRuntime,
  PatternNotificationRetentionRuntimeOptions,
  RetainEligiblePatternNotificationRequest,
  RetainEligiblePatternNotificationResult
} from "./retention.js";

export const PATTERN_NOTIFICATION_DIRECTIONS = ["consider_long"] as const;
export type PatternNotificationDirection = (typeof PATTERN_NOTIFICATION_DIRECTIONS)[number];

export type PatternNotificationEligibilityPolicy = {
  policyId: string;
  minCompletedEvaluations: number;
  minPositiveOutcomeRate: number;
  minAveragePercentageMove: number;
  maxSignalAgeMs: number;
  maxAggregateAgeMs: number;
};

export type AssessPatternNotificationRequest = {
  signalCandidateId: string;
  setupAggregateResultId: string;
  direction: PatternNotificationDirection;
  observedAt: string;
  currentPrice: number;
};

export type PatternNotificationCandidate = {
  notificationId: string;
  deduplicationKey: string;
  signalCandidateId: string;
  setupDefinitionId: string;
  setupRevisionId: string;
  monitoredSymbolId: string;
  setupAggregateResultId: string;
  direction: PatternNotificationDirection;
  observedAt: string;
  currentPrice: number;
  policyId: string;
  completedEvaluations: number;
  positiveOutcomeRate: number;
  averagePercentageMove: number;
  aggregateComputedAt: string;
};

export type PatternNotificationEligibilityResult =
  | { status: "eligible"; candidate: PatternNotificationCandidate; warnings: string[] }
  | { status: "ineligible"; reason: string; warnings: string[] }
  | { status: "rejected_validation"; reason: string; warnings: string[] }
  | { status: "failed"; reason: string; warnings: string[] };

export type PatternNotificationEligibilityRuntimeOptions = {
  signalCandidateRepository: Pick<SignalCandidateRepository, "getById">;
  setupAggregateResultRepository: Pick<SetupAggregateResultRepository, "getById">;
  policy: PatternNotificationEligibilityPolicy;
};

export type PatternNotificationEligibilityRuntime = {
  assess(request: AssessPatternNotificationRequest): Promise<PatternNotificationEligibilityResult>;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isDirection = (value: unknown): value is PatternNotificationDirection =>
  PATTERN_NOTIFICATION_DIRECTIONS.some((direction) => direction === value);

const isValidCandidate = (value: unknown): value is SignalCandidate =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.setupDefinitionId) &&
  isNonEmptyString(value.setupRevisionId) &&
  isNonEmptyString(value.monitoredSymbolId) &&
  isValidTimestamp(value.detectedAt) &&
  isNonEmptyString(value.status);

const isValidAggregate = (value: unknown): value is SetupAggregateResult => {
  if (!isRecord(value) || !isRecord(value.aggregationScope)) {
    return false;
  }

  const scope = value.aggregationScope;
  if (!isRecord(scope.symbolScope) || !isRecord(scope.timeRange)) {
    return false;
  }

  const { symbolScope, timeRange } = scope;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.setupDefinitionId) &&
    isNonEmptyString(value.status) &&
    isNonEmptyString(scope.setupDefinitionId) &&
    (symbolScope.kind === "single_symbol" ||
      symbolScope.kind === "symbol_set" ||
      symbolScope.kind === "all_monitored") &&
    Array.isArray(symbolScope.symbolIds) &&
    symbolScope.symbolIds.every(isNonEmptyString) &&
    isValidTimestamp(timeRange.startAtUtc) &&
    isValidTimestamp(timeRange.endAtUtc) &&
    isNonNegativeInteger(value.completedEvaluations) &&
    isNonNegativeInteger(value.positiveOutcomeCount) &&
    value.positiveOutcomeCount <= value.completedEvaluations &&
    (value.averagePercentageMove === null || Number.isFinite(value.averagePercentageMove)) &&
    (value.computedAt === null || isValidTimestamp(value.computedAt))
  );
};

const isValidPolicy = (policy: PatternNotificationEligibilityPolicy): boolean =>
  isNonEmptyString(policy.policyId) &&
  Number.isInteger(policy.minCompletedEvaluations) &&
  policy.minCompletedEvaluations > 0 &&
  Number.isFinite(policy.minPositiveOutcomeRate) &&
  policy.minPositiveOutcomeRate >= 0 &&
  policy.minPositiveOutcomeRate <= 1 &&
  Number.isFinite(policy.minAveragePercentageMove) &&
  Number.isInteger(policy.maxSignalAgeMs) &&
  policy.maxSignalAgeMs > 0 &&
  Number.isInteger(policy.maxAggregateAgeMs) &&
  policy.maxAggregateAgeMs > 0;

const hasAggregateScopeForCandidate = (
  aggregate: SetupAggregateResult,
  candidate: SignalCandidate
): boolean => {
  const symbolScope = aggregate.aggregationScope.symbolScope;
  return (
    aggregate.aggregationScope.setupDefinitionId === candidate.setupDefinitionId &&
    (symbolScope.kind === "all_monitored" || symbolScope.symbolIds.includes(candidate.monitoredSymbolId))
  );
};

const createInvalidRequest = (): PatternNotificationEligibilityResult => ({
  status: "rejected_validation",
  reason: "signal candidate, aggregate, direction, observedAt, and a positive current price are required",
  warnings: []
});

const createFailedResult = (error: unknown): PatternNotificationEligibilityResult => ({
  status: "failed",
  reason: error instanceof Error ? error.message : "unexpected pattern notification eligibility failure",
  warnings: ["pattern notification assessment can be retried after resolving runtime failure"]
});

const validateRequest = (request: unknown): request is AssessPatternNotificationRequest =>
  isRecord(request) &&
  isNonEmptyString(request.signalCandidateId) &&
  isNonEmptyString(request.setupAggregateResultId) &&
  isDirection(request.direction) &&
  isValidTimestamp(request.observedAt) &&
  isPositiveFiniteNumber(request.currentPrice);

export const createPatternNotificationEligibilityRuntime = (
  options: PatternNotificationEligibilityRuntimeOptions
): PatternNotificationEligibilityRuntime => {
  if (!isValidPolicy(options.policy)) {
    throw new Error("pattern notification policy is invalid");
  }

  return {
    async assess(request): Promise<PatternNotificationEligibilityResult> {
      if (!validateRequest(request)) {
        return createInvalidRequest();
      }

      try {
        const candidate = await options.signalCandidateRepository.getById(request.signalCandidateId);
        if (!candidate) {
          return { status: "rejected_validation", reason: "signal_candidate not found", warnings: [] };
        }
        if (!isValidCandidate(candidate)) {
          return { status: "ineligible", reason: "signal_candidate_invalid", warnings: [] };
        }
        if (candidate.status !== "detected") {
          return { status: "ineligible", reason: "signal_candidate_not_detected", warnings: [] };
        }

        const signalAgeMs = Date.parse(request.observedAt) - Date.parse(candidate.detectedAt);
        if (signalAgeMs < 0) {
          return { status: "ineligible", reason: "signal_detected_after_observation", warnings: [] };
        }
        if (signalAgeMs > options.policy.maxSignalAgeMs) {
          return { status: "ineligible", reason: "signal_candidate_stale", warnings: [] };
        }

        const aggregate = await options.setupAggregateResultRepository.getById(
          request.setupAggregateResultId
        );
        if (!aggregate) {
          return { status: "rejected_validation", reason: "setup_aggregate_result not found", warnings: [] };
        }
        if (!isValidAggregate(aggregate)) {
          return { status: "ineligible", reason: "setup_aggregate_result_invalid", warnings: [] };
        }
        if (
          aggregate.status !== "completed" ||
          aggregate.computedAt === null ||
          aggregate.averagePercentageMove === null
        ) {
          return { status: "ineligible", reason: "setup_aggregate_result_not_completed", warnings: [] };
        }
        if (aggregate.setupDefinitionId !== candidate.setupDefinitionId || !hasAggregateScopeForCandidate(aggregate, candidate)) {
          return { status: "ineligible", reason: "setup_aggregate_result_scope_mismatch", warnings: [] };
        }

        const aggregateAgeMs = Date.parse(request.observedAt) - Date.parse(aggregate.computedAt);
        if (aggregateAgeMs < 0) {
          return { status: "ineligible", reason: "aggregate_computed_after_observation", warnings: [] };
        }
        if (aggregateAgeMs > options.policy.maxAggregateAgeMs) {
          return { status: "ineligible", reason: "setup_aggregate_result_stale", warnings: [] };
        }
        if (aggregate.completedEvaluations < options.policy.minCompletedEvaluations) {
          return { status: "ineligible", reason: "insufficient_completed_evaluations", warnings: [] };
        }

        const positiveOutcomeRate = aggregate.positiveOutcomeCount / aggregate.completedEvaluations;
        if (positiveOutcomeRate < options.policy.minPositiveOutcomeRate) {
          return { status: "ineligible", reason: "positive_outcome_rate_below_threshold", warnings: [] };
        }
        if (aggregate.averagePercentageMove < options.policy.minAveragePercentageMove) {
          return { status: "ineligible", reason: "average_percentage_move_below_threshold", warnings: [] };
        }

        return {
          status: "eligible",
          candidate: {
            notificationId: `notification:${candidate.id}`,
            deduplicationKey: `signal_candidate:${candidate.id}`,
            signalCandidateId: candidate.id,
            setupDefinitionId: candidate.setupDefinitionId,
            setupRevisionId: candidate.setupRevisionId,
            monitoredSymbolId: candidate.monitoredSymbolId,
            setupAggregateResultId: aggregate.id,
            direction: request.direction,
            observedAt: request.observedAt,
            currentPrice: request.currentPrice,
            policyId: options.policy.policyId,
            completedEvaluations: aggregate.completedEvaluations,
            positiveOutcomeRate,
            averagePercentageMove: aggregate.averagePercentageMove,
            aggregateComputedAt: aggregate.computedAt
          },
          warnings: []
        };
      } catch (error: unknown) {
        return createFailedResult(error);
      }
    }
  };
};
