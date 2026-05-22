import type { AggregateComputationStatus } from "../research/setup-aggregate-result.js";
import type { AggregationScope, AggregationSymbolScopeKind } from "../research/aggregation-scope.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const SETUP_AGGREGATE_RELATIONAL_ENTITY_TYPES = ["setup_aggregate_result"] as const;
export type SetupAggregateRelationalEntityType =
  (typeof SETUP_AGGREGATE_RELATIONAL_ENTITY_TYPES)[number];

const serializeScopeForKey = (scope: AggregationScope): string =>
  JSON.stringify({
    setupDefinitionId: scope.setupDefinitionId,
    evaluationWindowId: scope.evaluationWindowId,
    symbolScope: {
      kind: scope.symbolScope.kind,
      symbolIds: [...scope.symbolScope.symbolIds]
    },
    timeRange: {
      startAtUtc: scope.timeRange.startAtUtc,
      endAtUtc: scope.timeRange.endAtUtc
    },
    ...(scope.researchRunId ? { researchRunId: scope.researchRunId } : {}),
    ...(scope.hypothesisId ? { hypothesisId: scope.hypothesisId } : {})
  });

export const buildSetupAggregateScopeKey = (scope: AggregationScope): string =>
  `${scope.setupDefinitionId}:${serializeScopeForKey(scope)}`;

export type SetupAggregateScopeSnapshot = {
  scopeKey: string;
  evaluationWindowId: string | null;
  symbolScopeKind: AggregationSymbolScopeKind;
  symbolIds: string[];
  timeRangeStartAtUtc: string;
  timeRangeEndAtUtc: string;
  researchRunId: string | null;
  hypothesisId: string | null;
};

export const decomposeSetupAggregateScope = (
  aggregationScope: AggregationScope
): SetupAggregateScopeSnapshot => ({
  scopeKey: buildSetupAggregateScopeKey(aggregationScope),
  evaluationWindowId: aggregationScope.evaluationWindowId,
  symbolScopeKind: aggregationScope.symbolScope.kind,
  symbolIds: [...aggregationScope.symbolScope.symbolIds],
  timeRangeStartAtUtc: aggregationScope.timeRange.startAtUtc,
  timeRangeEndAtUtc: aggregationScope.timeRange.endAtUtc,
  researchRunId: aggregationScope.researchRunId ?? null,
  hypothesisId: aggregationScope.hypothesisId ?? null
});

export type SetupAggregateResultDurableRecord =
  DurableRelationalRecordBase<"setup_aggregate_result"> & {
    aggregateStatus: AggregateComputationStatus;
    setupDefinitionId: string;
    researchHypothesisId: string | null;
    aggregationScope: AggregationScope;
    scopeKey: string;
    totalCandidates: number;
    completedEvaluations: number;
    invalidatedEvaluations: number;
    averagePercentageMove: number | null;
    averageAbsoluteMove: number | null;
    averageFinalOutcome: number | null;
    averageMaxFavorableExcursion: number | null;
    averageMaxAdverseExcursion: number | null;
    positiveOutcomeCount: number;
    computedAtUtc: string | null;
    notes: string | null;
  };
