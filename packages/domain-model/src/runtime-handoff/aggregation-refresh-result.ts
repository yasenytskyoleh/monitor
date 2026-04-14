import type { AggregationScope } from "../research/aggregation-scope.js";

export const AGGREGATION_REFRESH_STATUSES = [
  "created_and_refreshed",
  "refreshed_existing",
  "rejected_validation",
  "rejected_lifecycle",
  "failed"
] as const;
export type AggregationRefreshStatus = (typeof AGGREGATION_REFRESH_STATUSES)[number];

export type AggregationRefreshResult = {
  status: AggregationRefreshStatus;
  setupAggregateResultId?: string;
  aggregationScope?: AggregationScope;
  reason?: string;
  warnings: string[];
};
