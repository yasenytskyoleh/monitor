import type { DomainEntityBase, TimestampUtc } from "../common.js";
import type { AggregateMetrics } from "./aggregate-metrics.js";
import type { AggregationScope } from "./aggregation-scope.js";

export const AGGREGATE_COMPUTATION_STATUSES = ["pending", "completed", "partial", "invalid"] as const;
export type AggregateComputationStatus = (typeof AGGREGATE_COMPUTATION_STATUSES)[number];

export type ResearchAggregationInput = DomainEntityBase & {
  inputId: string;
  setupDefinitionId: string;
  evaluationResultIds: string[];
  scope: AggregationScope;
  hypothesisId?: string;
  notes?: string;
};

export type SetupAggregateResult = DomainEntityBase & {
  aggregateId: string;
  setupDefinitionId: string;
  scope: AggregationScope;
  includedEvaluationResultIds: string[];
  metrics: AggregateMetrics | null;
  computationStatus: AggregateComputationStatus;
  computedAtUtc: TimestampUtc | null;
  limitations: string[];
  notes?: string;
};
