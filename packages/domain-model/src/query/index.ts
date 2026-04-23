export {
  SETUP_REVISION_HISTORY_QUERY_MODES
} from "./query-setup-revision-history.js";
export type {
  QuerySetupRevisionHistory,
  QueryTimeRange,
  SetupRevisionHistoryQueryMode
} from "./query-setup-revision-history.js";

export type {
  QuerySignalCandidatesByRevision
} from "./query-signal-candidates-by-revision.js";

export type {
  QueryEvaluationResultsByRevision
} from "./query-evaluation-results-by-revision.js";

export type {
  QueryAggregateEvidenceByRevisionScope
} from "./query-aggregate-evidence-by-revision-scope.js";

export type {
  CompareSetupRevisionsCommand,
  RevisionComparisonScopeDescriptor
} from "./compare-setup-revisions-command.js";

export type {
  RevisionComparisonMetricDeltas,
  RevisionComparisonMetrics,
  RevisionMetricDelta
} from "./revision-comparison-metrics.js";

export {
  SETUP_REVISION_COMPARISON_STATUSES
} from "./setup-revision-comparison.js";
export type {
  RevisionEvidenceCounts,
  SetupRevisionComparison,
  SetupRevisionComparisonStatus
} from "./setup-revision-comparison.js";

export {
  REVISION_COMPARISON_RESULT_STATUSES
} from "./revision-comparison-result.js";
export type {
  RevisionComparisonResult,
  RevisionComparisonResultStatus
} from "./revision-comparison-result.js";

export type {
  RevisionAggregateHistoryView,
  RevisionCandidateHistoryView,
  RevisionEvaluationHistoryView,
  SetupRevisionHistoryGroup,
  SetupRevisionHistoryView
} from "./setup-revision-history-view.js";

export {
  REVISION_HISTORY_QUERY_STATUSES
} from "./revision-history-query-result.js";
export type {
  RevisionHistoryQueryResult,
  RevisionHistoryQueryStatus
} from "./revision-history-query-result.js";

export {
  createRevisionHistoryQueryService
} from "./revision-history-query-service.js";
export type {
  AggregateEvidenceQueryService,
  EvaluationQueryService,
  SetupComparisonQueryService,
  RevisionHistoryQueryService,
  RevisionHistoryQueryServiceDependencies,
  SetupDefinitionQueryService,
  SignalCandidateQueryService
} from "./revision-history-query-service.js";
