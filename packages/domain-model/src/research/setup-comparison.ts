import type { DomainEntityBase, TimestampUtc } from "../common.js";
import type { AggregationSymbolScope, AggregationTimeRange } from "./aggregation-scope.js";

export type SetupComparisonScope = {
  evaluationWindowId: string | null;
  symbolScope: AggregationSymbolScope;
  timeRange: AggregationTimeRange;
  researchRunId?: string;
  hypothesisId?: string;
};

export type SetupComparisonMetricSnapshot = {
  setupDefinitionId: string;
  aggregateResultId: string;
  totalEvaluatedCandidates: number;
  completedEvaluationsCount: number;
  invalidatedEvaluationsCount: number;
  averagePercentageMove: number | null;
  averageAbsoluteMove: number | null;
  averageFinalOutcomeScore: number | null;
  averageMaxFavorableExcursion: number | null;
  averageMaxAdverseExcursion: number | null;
  simpleHitRate: number | null;
};

export type SetupComparison = DomainEntityBase & {
  comparisonId: string;
  setupDefinitionIds: string[];
  scope: SetupComparisonScope;
  metricSnapshots: SetupComparisonMetricSnapshot[];
  comparedAtUtc: TimestampUtc;
  limitations: string[];
  notes?: string;
};
