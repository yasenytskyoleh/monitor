import type { AggregationScope } from "../research/aggregation-scope.js";
import type { TimestampUtc } from "../common.js";

export type RefreshAggregateFromEvaluationCommand = {
  evaluationResultId: string;
  signalCandidateId: string;
  setupDefinitionId: string;
  researchHypothesisId?: string;
  aggregationScope: AggregationScope;
  triggeredAt: TimestampUtc;
  originRunId?: string;
};
