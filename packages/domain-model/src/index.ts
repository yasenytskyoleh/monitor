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
export { SETUP_DEFINITION_STATUSES } from "./setup-definition.js";
export type {
  SetupDefinition,
  SetupDefinitionStatus,
  SetupDefinitionTraceMetadata
} from "./setup-definition.js";
export { SIGNAL_CANDIDATE_STATUSES } from "./signal-candidate.js";
export type { SignalCandidate, SignalCandidateStatus } from "./signal-candidate.js";
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
export {
  RESEARCH_FEEDBACK_DECISION_ACTIONS,
  RESEARCH_FEEDBACK_DECISION_STATUSES
} from "./research/research-feedback-decision.js";
export type {
  ResearchFeedbackDecision,
  ResearchFeedbackDecisionAction,
  ResearchFeedbackDecisionStatus
} from "./research/research-feedback-decision.js";
export {
  APPROVED_SETUP_LIFECYCLE_ACTIONS,
  RESEARCH_DECISION_APPROVAL_OUTCOMES,
  RESEARCH_DECISION_APPROVAL_RESULT_STATUSES,
  RESEARCH_DECISION_APPROVAL_STATUSES,
  SETUP_LIFECYCLE_MUTATION_RESULT_STATUSES
} from "./review/index.js";
export type {
  ApplyApprovedSetupMutationCommand,
  ApprovedSetupLifecycleAction,
  ResearchDecisionApproval,
  ResearchDecisionApprovalOutcome,
  ResearchDecisionApprovalResult,
  ResearchDecisionApprovalResultStatus,
  ResearchDecisionApprovalStatus,
  ReviewResearchDecisionCommand,
  SetupLifecycleMutationRecord,
  SetupLifecycleMutationResult,
  SetupLifecycleMutationResultStatus
} from "./review/index.js";
export {
  DEFAULT_STORAGE_TECHNOLOGY_DIRECTION,
  FIRST_CLASS_PERSISTED_ENTITY_PROFILES,
  PRODUCT_EPHEMERAL_ENTITY_TYPES,
  PRODUCT_PERSISTED_ENTITY_TYPES,
  PRODUCT_RECORD_SOURCES,
  PERSISTED_ENTITY_LIFECYCLE_STATUSES,
  RUNTIME_EVIDENCE_ARTIFACT_TYPES,
  STORAGE_BOUNDARIES
} from "./storage/index.js";
export type {
  EntityIdentity,
  PersistedEntity,
  PersistedEntityLifecycleStatus,
  PersistedEntityProfile,
  PersistenceTimingSemantics,
  ProductEntityIdentity,
  ProductEphemeralEntityType,
  ProductPersistedEntityType,
  ProductRecordMetadata,
  ProductRecordSource,
  RuntimeEvidenceArtifactType,
  RuntimeEvidenceIdentity,
  StorageBoundary,
  StorageTechnologyDirection
} from "./storage/index.js";
export type {
  EvaluationResultCreateRequest,
  EvaluationResultRepository,
  EvaluationResultStatusUpdateRequest,
  EvaluationResultUpdateRequest
} from "./repositories/evaluation-result-repository.js";
export { InMemoryEvaluationResultRepository } from "./repositories/evaluation-result-repository.impl.js";
export type {
  MonitoredSymbolCreateRequest,
  MonitoredSymbolRepository,
  MonitoredSymbolStatusUpdateRequest,
  MonitoredSymbolUpdateRequest
} from "./repositories/monitored-symbol-repository.js";
export type {
  ResearchHypothesisCreateRequest,
  ResearchHypothesisRepository,
  ResearchHypothesisStatusUpdateRequest,
  ResearchHypothesisUpdateRequest
} from "./repositories/research-hypothesis-repository.js";
export { InMemoryResearchHypothesisRepository } from "./repositories/research-hypothesis-repository.impl.js";
export type {
  ResearchFeedbackDecisionCreateRequest,
  ResearchFeedbackDecisionRepository,
  ResearchFeedbackDecisionStatusUpdateRequest
} from "./repositories/research-feedback-decision-repository.js";
export {
  InMemoryResearchFeedbackDecisionRepository
} from "./repositories/research-feedback-decision-repository.impl.js";
export type {
  ResearchDecisionApprovalCreateRequest,
  ResearchDecisionApprovalRepository
} from "./repositories/research-decision-approval-repository.js";
export {
  InMemoryResearchDecisionApprovalRepository
} from "./repositories/research-decision-approval-repository.impl.js";
export type {
  SetupLifecycleMutationRecordCreateRequest,
  SetupLifecycleMutationRecordRepository
} from "./repositories/setup-lifecycle-mutation-record-repository.js";
export {
  InMemorySetupLifecycleMutationRecordRepository
} from "./repositories/setup-lifecycle-mutation-record-repository.impl.js";
export type {
  SetupAggregateResultCreateRequest,
  SetupAggregateResultRepository,
  SetupAggregateResultStatusUpdateRequest,
  SetupAggregateResultUpdateRequest
} from "./repositories/setup-aggregate-result-repository.js";
export { InMemorySetupAggregateResultRepository } from "./repositories/setup-aggregate-result-repository.impl.js";
export type {
  SetupDefinitionCreateRequest,
  SetupDefinitionRepository,
  SetupDefinitionStatusUpdateRequest,
  SetupDefinitionUpdateRequest
} from "./repositories/setup-definition-repository.js";
export { InMemorySetupDefinitionRepository } from "./repositories/setup-definition-repository.impl.js";
export type {
  SignalCandidateCreateRequest,
  SignalCandidateRepository,
  SignalCandidateStatusUpdateRequest,
  SignalCandidateUpdateRequest
} from "./repositories/signal-candidate-repository.js";
export { InMemorySignalCandidateRepository } from "./repositories/signal-candidate-repository.impl.js";
export {
  FIRST_PERSISTED_PRODUCT_SLICE,
  PRODUCT_SERVICE_NAMES,
  PRODUCT_WRITE_PATH_OWNERSHIP
} from "./services/service-boundary.js";
export type {
  FirstPersistedProductSliceEntity,
  ProductServiceName,
  ProductWritePathOwnership
} from "./services/service-boundary.js";
export type {
  MonitoringCatalogService,
  MonitoringCatalogServiceDependencies,
  RegisterMonitoredSymbolRequest,
  UpdateMonitoredSymbolStatusRequest
} from "./services/monitoring-catalog-service.js";
export type {
  ApplyApprovedMutationRequest,
  ActivateSetupDefinitionRequest,
  ArchiveSetupDefinitionRequest,
  CreateSetupDefinitionRequest,
  SetupLifecycleMutationApplied,
  SetupDefinitionService,
  SetupDefinitionServiceDependencies,
  UpdateSetupDefinitionRequest
} from "./services/setup-definition-service.js";
export {
  SetupDefinitionValidationError,
  createSetupDefinitionService
} from "./services/setup-definition-service.js";
export type {
  CreateSignalCandidateRequest,
  SignalCandidateService,
  SignalCandidateServiceDependencies,
  UpdateSignalCandidateStatusRequest
} from "./services/signal-candidate-service.js";
export {
  SignalCandidateValidationError,
  createSignalCandidateService
} from "./services/signal-candidate-service.js";
export type {
  CreatePendingEvaluationResultRequest,
  EvaluationService,
  EvaluationServiceDependencies,
  ExpireEvaluationResultRequest,
  FinalizeEvaluationResultRequest,
  InvalidateEvaluationResultRequest,
  StartEvaluationResultRequest
} from "./services/evaluation-service.js";
export {
  EvaluationResultValidationError,
  createEvaluationService
} from "./services/evaluation-service.js";
export type {
  AttachHypothesisToSetupDefinitionsRequest,
  CreateResearchHypothesisRequest,
  HypothesisEvidenceScopeDescriptor,
  HypothesisEvidenceUpdate,
  ApproveFeedbackDecisionRequest,
  FeedbackDecisionApproval,
  ReviewSetupFromEvidenceRequest,
  ResearchService,
  ResearchServiceDependencies,
  SetupFeedbackReview,
  UpdateHypothesisEvidenceRequest,
  UpdateResearchHypothesisRequest,
  UpdateResearchHypothesisStatusRequest
} from "./services/research-service.js";
export {
  ResearchHypothesisValidationError,
  createResearchService
} from "./services/research-service.js";
export type {
  CreatePendingSetupAggregateResultRequest,
  RecomputeSetupAggregateResultRequest,
  ResearchAggregationService,
  ResearchAggregationServiceDependencies,
  UpdateSetupAggregateResultStatusRequest
} from "./services/research-aggregation-service.js";
export {
  SetupAggregateResultValidationError,
  createResearchAggregationService
} from "./services/research-aggregation-service.js";
export {
  FLOW_STATUSES,
  FLOW_STEP_NAMES,
  createSetupToAggregateFlow
} from "./application/index.js";
export type {
  FlowStatus,
  FlowStepName,
  SetupToAggregateFlowDependencies,
  SetupToAggregateFlowInput,
  SetupToAggregateFlowResult
} from "./application/index.js";
export {
  AGGREGATION_REFRESH_STATUSES,
  EVALUATION_TRIGGER_STATUSES,
  FEEDBACK_DECISION_RESULT_STATUSES,
  HYPOTHESIS_EVIDENCE_UPDATE_STATUSES,
  RUNTIME_HANDOFF_STATUSES,
  createAggregateToHypothesisEvidenceHandoff,
  createApprovedSetupLifecycleMutationHandoff,
  createEvaluationToAggregationRefreshHandoff,
  createHypothesisEvidenceToSetupFeedbackHandoff,
  createResearchDecisionApprovalHandoff,
  createSignalCandidateFromDetectionHandoff,
  createSignalCandidateToEvaluationHandoff
} from "./runtime-handoff/index.js";
export type {
  AggregateHypothesisEvidenceTrigger,
  AggregateToHypothesisEvidenceDependencies,
  AggregationRefreshResult,
  AggregationRefreshStatus,
  AggregationScopeDescriptor,
  DetectionToCandidateCommand,
  EvidenceScopeDescriptor,
  EvaluationAggregationRefreshTrigger,
  EvaluationToAggregationRefreshDependencies,
  FeedbackDecisionResult,
  FeedbackDecisionResultStatus,
  HypothesisFeedbackDecisionTrigger,
  HypothesisEvidenceUpdateResult,
  HypothesisEvidenceUpdateStatus,
  HypothesisEvidenceToSetupFeedbackDependencies,
  ApprovedSetupLifecycleMutationDependencies,
  ResearchDecisionApprovalHandoffDependencies,
  EvaluationTriggerResult,
  EvaluationTriggerStatus,
  EvaluationWindowDescriptor,
  RefreshAggregateFromEvaluationCommand,
  ReviewSetupFromEvidenceCommand,
  UpdateHypothesisFromAggregateCommand,
  SignalCandidateEvaluationTrigger,
  StartEvaluationCommand,
  RuntimeHandoffResult,
  RuntimeHandoffStatus,
  SignalCandidateFromDetectionDependencies,
  SignalCandidateToEvaluationDependencies
} from "./runtime-handoff/index.js";
