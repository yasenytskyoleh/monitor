export type {
  DomainEntityBase,
  EntityId,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  TimestampUtc
} from "./common.js";
export {
  MARKET_SCOPES,
  MONITORED_EVENT_KINDS,
  MONITORED_SYMBOL_STATUSES,
  MONITOR_PROVIDER_HINTS
} from "./monitored-symbol.js";
export type {
  MarketScope,
  MonitoredEvent,
  MonitoredEventKind,
  MonitoredSymbol,
  MonitoredSymbolStatus,
  MonitorProviderHint,
  SourceSymbolBinding
} from "./monitored-symbol.js";
export {
  MARKET_DATA_PROVIDER_KINDS,
  MARKET_DATA_SOURCE_STATUSES,
  SOURCE_RELIABILITY_TIERS,
  SYMBOL_MAPPING_MODES
} from "./monitoring/market-data-source.js";
export type {
  MarketDataProviderKind,
  MarketDataSource,
  MarketDataSourceStatus,
  SourceReliabilityTier,
  SymbolMappingMode
} from "./monitoring/market-data-source.js";
export {
  MONITORING_SCHEMA_VERSIONS,
  NORMALIZED_EVENT_TYPES,
  TIMEFRAME_LABELS
} from "./monitoring/normalized-event.js";
export { MONITORING_HEARTBEAT_STATUSES } from "./monitoring/monitoring-heartbeat.js";
export type {
  MonitoringSchemaVersion,
  NormalizationMetadata,
  NormalizedEventBase,
  NormalizedEventType,
  NormalizedMarketEvent,
  TimeframeLabel
} from "./monitoring/normalized-event.js";
export type { CandleClosedEvent, CandleClosedPayload } from "./monitoring/candle-closed.js";
export type {
  MonitoringHeartbeatEvent,
  MonitoringHeartbeatPayload,
  MonitoringHeartbeatStatus
} from "./monitoring/monitoring-heartbeat.js";
export type { PriceTickEvent, PriceTickPayload } from "./monitoring/price-tick.js";
export type { VolumeUpdateEvent, VolumeUpdatePayload } from "./monitoring/volume-update.js";
export { SETUP_CONDITION_OPERATORS, SETUP_DEFINITION_STATUSES } from "./setup-definition.js";
export type {
  SetupCondition,
  SetupConditionOperator,
  SetupDefinition,
  SetupDefinitionStatus
} from "./setup-definition.js";
export { SIGNAL_CANDIDATE_STATUSES, SIGNAL_EVIDENCE_SOURCES } from "./signal-candidate.js";
export type {
  SignalCandidate,
  SignalCandidateStatus,
  SignalEvidence,
  SignalEvidenceSource
} from "./signal-candidate.js";
export {
  EVALUATION_OUTCOMES,
  EVALUATION_OUTCOME_SUMMARIES,
  EVALUATION_START_REFERENCE_RULES,
  EVALUATION_STATUSES,
  EVALUATION_WINDOW_MODES,
  EVALUATION_WINDOW_UNITS
} from "./evaluation.js";
export type {
  EvaluationContext,
  EvaluationInput,
  EvaluationMetrics,
  EvaluationObservationReference,
  EvaluationOutcome,
  EvaluationOutcomeSummary,
  EvaluationResult,
  EvaluationStartReferenceRule,
  EvaluationStatus,
  EvaluationWindow,
  EvaluationWindowMode,
  EvaluationWindowUnit
} from "./evaluation.js";
export { RESEARCH_HYPOTHESIS_STATUSES } from "./research-hypothesis.js";
export type { ResearchHypothesis, ResearchHypothesisStatus } from "./research-hypothesis.js";
export { RESEARCH_RUN_STATUSES } from "./research-run.js";
export type { ResearchRun, ResearchRunStatus } from "./research-run.js";
export { AGGREGATION_SYMBOL_SCOPE_KINDS } from "./research/aggregation-scope.js";
export type {
  AggregationScope,
  AggregationSymbolScope,
  AggregationSymbolScopeKind,
  AggregationTimeRange
} from "./research/aggregation-scope.js";
export type { AggregateMetrics } from "./research/aggregate-metrics.js";
export { AGGREGATE_COMPUTATION_STATUSES } from "./research/setup-aggregate-result.js";
export type {
  AggregateComputationStatus,
  ResearchAggregationInput,
  SetupAggregateResult
} from "./research/setup-aggregate-result.js";
export type {
  SetupComparison,
  SetupComparisonMetricSnapshot,
  SetupComparisonScope
} from "./research/setup-comparison.js";
export { HYPOTHESIS_EVIDENCE_STATUSES } from "./research/research-hypothesis-link.js";
export type {
  HypothesisEvidenceStatus,
  ResearchHypothesisEvidenceLink
} from "./research/research-hypothesis-link.js";
