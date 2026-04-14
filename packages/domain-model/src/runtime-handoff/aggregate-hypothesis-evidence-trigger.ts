import type { JsonObject, TimestampUtc } from "../common.js";
import type { AggregationScope, AggregationSymbolScope } from "../research/aggregation-scope.js";

export type EvidenceScopeDescriptor = {
  evaluationWindowId?: string | null;
  symbolScope?: AggregationSymbolScope;
  timeRange?: AggregationScope["timeRange"];
};

export type AggregateHypothesisEvidenceTrigger = {
  setupAggregateResultId: string;
  setupDefinitionId: string;
  researchHypothesisId?: string;
  triggeredAt: TimestampUtc;
  evidenceScopeDescriptor?: EvidenceScopeDescriptor;
  originRunId?: string;
  sourceMetadata?: JsonObject;
};
