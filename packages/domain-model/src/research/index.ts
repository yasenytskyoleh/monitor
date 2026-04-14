export { AGGREGATION_SYMBOL_SCOPE_KINDS } from "./aggregation-scope.js";
export type {
  AggregationScope,
  AggregationSymbolScope,
  AggregationSymbolScopeKind,
  AggregationTimeRange
} from "./aggregation-scope.js";

export type { AggregateMetrics } from "./aggregate-metrics.js";

export { AGGREGATE_COMPUTATION_STATUSES } from "./setup-aggregate-result.js";
export type {
  AggregateComputationStatus,
  ResearchAggregationInput,
  SetupAggregateResult
} from "./setup-aggregate-result.js";

export type {
  SetupComparison,
  SetupComparisonMetricSnapshot,
  SetupComparisonScope
} from "./setup-comparison.js";

export { HYPOTHESIS_EVIDENCE_STATUSES } from "./research-hypothesis-link.js";
export type {
  HypothesisEvidenceStatus,
  ResearchHypothesisEvidenceLink
} from "./research-hypothesis-link.js";

export {
  RESEARCH_FEEDBACK_DECISION_ACTIONS,
  RESEARCH_FEEDBACK_DECISION_STATUSES
} from "./research-feedback-decision.js";
export type {
  ResearchFeedbackDecision,
  ResearchFeedbackDecisionAction,
  ResearchFeedbackDecisionStatus
} from "./research-feedback-decision.js";
