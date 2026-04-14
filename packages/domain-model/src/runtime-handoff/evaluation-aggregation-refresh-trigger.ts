import type { AggregationScope, AggregationSymbolScope } from "../research/aggregation-scope.js";
import type { JsonObject, TimestampUtc } from "../common.js";

export type AggregationScopeDescriptor = {
  evaluationWindowId?: string;
  symbolScope?: AggregationSymbolScope;
  timeRange?: AggregationScope["timeRange"];
};

export type EvaluationAggregationRefreshTrigger = {
  evaluationResultId: string;
  signalCandidateId: string;
  setupDefinitionId: string;
  researchHypothesisId?: string;
  triggeredAt: TimestampUtc;
  aggregationScopeDescriptor?: AggregationScopeDescriptor;
  originRunId?: string;
  sourceMetadata?: JsonObject;
};
