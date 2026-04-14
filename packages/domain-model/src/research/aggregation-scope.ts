import type { TimestampUtc } from "../common.js";

export const AGGREGATION_SYMBOL_SCOPE_KINDS = ["single_symbol", "symbol_set", "all_monitored"] as const;
export type AggregationSymbolScopeKind = (typeof AGGREGATION_SYMBOL_SCOPE_KINDS)[number];

export type AggregationSymbolScope = {
  kind: AggregationSymbolScopeKind;
  symbolIds: string[];
};

export type AggregationTimeRange = {
  startAtUtc: TimestampUtc;
  endAtUtc: TimestampUtc;
};

export type AggregationScope = {
  setupDefinitionId: string;
  evaluationWindowId: string | null;
  symbolScope: AggregationSymbolScope;
  timeRange: AggregationTimeRange;
  researchRunId?: string;
  hypothesisId?: string;
};
