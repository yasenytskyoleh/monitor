import type { TimestampUtc } from "../common.js";
import type { AggregationScope } from "./aggregation-scope.js";

export const AGGREGATE_COMPUTATION_STATUSES = ["pending", "completed", "partial", "invalid"] as const;
export type AggregateComputationStatus = (typeof AGGREGATE_COMPUTATION_STATUSES)[number];

export type ResearchAggregationInput = {
  inputId: string;
  setupDefinitionId: string;
  evaluationResultIds: string[];
  scope: AggregationScope;
  hypothesisId?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
  notes?: string;
};

export type SetupAggregateResult = {
  id: string;
  setupDefinitionId: string;
  researchHypothesisId?: string;
  aggregationScope: AggregationScope;
  status: AggregateComputationStatus;
  totalCandidates: number;
  completedEvaluations: number;
  invalidatedEvaluations: number;
  averagePercentageMove: number | null;
  averageAbsoluteMove: number | null;
  averageFinalOutcome: number | null;
  averageMaxFavorableExcursion: number | null;
  averageMaxAdverseExcursion: number | null;
  positiveOutcomeCount: number;
  computedAt: TimestampUtc | null;
  notes?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
