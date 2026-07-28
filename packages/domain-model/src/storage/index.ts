export {
  DEFAULT_STORAGE_TECHNOLOGY_DIRECTION,
  PRODUCT_EPHEMERAL_ENTITY_TYPES,
  PRODUCT_PERSISTED_ENTITY_TYPES,
  RUNTIME_EVIDENCE_ARTIFACT_TYPES,
  STORAGE_BOUNDARIES
} from "./storage-boundary.js";
export type {
  ProductEphemeralEntityType,
  ProductPersistedEntityType,
  RuntimeEvidenceArtifactType,
  StorageBoundary,
  StorageTechnologyDirection
} from "./storage-boundary.js";
export {
  MONITORED_SYMBOL_RELATIONAL_ENTITY_TYPES
} from "./monitored-symbol-relational-slice.js";
export type {
  MonitoredSymbolDurableRecord,
  MonitoredSymbolRelationalEntityType
} from "./monitored-symbol-relational-slice.js";
export {
  RESEARCH_RUN_RELATIONAL_ENTITY_TYPES
} from "./research-run-relational-slice.js";
export type {
  ResearchRunDurableRecord,
  ResearchRunRelationalEntityType
} from "./research-run-relational-slice.js";
export {
  RESEARCH_RUN_RELATIONAL_INDEXES,
  RESEARCH_RUN_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_RUN_RELATIONAL_PRISMA_MODELS,
  RESEARCH_RUN_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_RUN_RELATIONAL_TABLES
} from "./research-run-relational-physical-schema.js";
export type {
  ResearchRunRelationalIndexName,
  ResearchRunRelationalPrismaModelName,
  ResearchRunRelationalTableName
} from "./research-run-relational-physical-schema.js";
export {
  MONITORED_SYMBOL_RELATIONAL_INDEXES,
  MONITORED_SYMBOL_RELATIONAL_MIGRATION_SLUG,
  MONITORED_SYMBOL_RELATIONAL_PRISMA_MODELS,
  MONITORED_SYMBOL_RELATIONAL_REQUIRED_COLUMNS,
  MONITORED_SYMBOL_RELATIONAL_TABLES
} from "./monitored-symbol-relational-physical-schema.js";
export type {
  MonitoredSymbolRelationalIndexName,
  MonitoredSymbolRelationalPrismaModelName,
  MonitoredSymbolRelationalTableName
} from "./monitored-symbol-relational-physical-schema.js";
export {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  FIRST_DURABLE_RELATIONAL_ENTITY_TYPES
} from "./first-durable-relational-slice.js";
export type {
  DurableRelationalRecordBase,
  DurableRelationalIdentity,
  DurableRelationalStorageSchemaVersion,
  FirstDurableRelationalEntityType,
  FirstDurableRelationalRecord,
  ResearchHypothesisDurableRecord,
  ResearchHypothesisSetupDefinitionLinkRecord,
  SetupDefinitionDurableRecord
} from "./first-durable-relational-slice.js";
export {
  SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES
} from "./signal-evaluation-relational-slice.js";
export type {
  EvaluationResultDurableRecord,
  SignalCandidateDurableRecord,
  SignalEvaluationRelationalEntityType,
  SignalEvaluationRelationalRecord
} from "./signal-evaluation-relational-slice.js";
export {
  SETUP_AGGREGATE_RELATIONAL_ENTITY_TYPES,
  buildSetupAggregateScopeKey,
  decomposeSetupAggregateScope,
  rehydrateSetupAggregateScope
} from "./setup-aggregate-relational-slice.js";
export type {
  SetupAggregateRelationalEntityType,
  SetupAggregateResultDurableRecord,
  SetupAggregateScopeSnapshot
} from "./setup-aggregate-relational-slice.js";
export {
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_ENTITY_TYPES
} from "./research-feedback-decision-relational-slice.js";
export type {
  ResearchFeedbackDecisionDurableRecord,
  ResearchFeedbackDecisionRelationalEntityType
} from "./research-feedback-decision-relational-slice.js";
export {
  RESEARCH_DECISION_APPROVAL_RELATIONAL_ENTITY_TYPES
} from "./research-decision-approval-relational-slice.js";
export type {
  ResearchDecisionApprovalDurableRecord,
  ResearchDecisionApprovalRelationalEntityType
} from "./research-decision-approval-relational-slice.js";
export {
  RESEARCH_REVIEW_DECISION_RELATIONAL_ENTITY_TYPES
} from "./research-review-decision-relational-slice.js";
export type {
  ResearchReviewDecisionDurableRecord,
  ResearchReviewDecisionRelationalEntityType
} from "./research-review-decision-relational-slice.js";
export {
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ENTITY_TYPES
} from "./review-decision-routing-result-relational-slice.js";
export type {
  ReviewDecisionRoutingResultDurableRecord,
  ReviewDecisionRoutingResultRelationalEntityType
} from "./review-decision-routing-result-relational-slice.js";
export {
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_INDEXES,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_MIGRATION_SLUG,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_REQUIRED_COLUMNS,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES
} from "./review-decision-routing-result-relational-physical-schema.js";
export type {
  ReviewDecisionRoutingResultRelationalIndexName,
  ReviewDecisionRoutingResultRelationalPrismaModelName,
  ReviewDecisionRoutingResultRelationalTableName
} from "./review-decision-routing-result-relational-physical-schema.js";
export {
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ENTITY_TYPES
} from "./routed-action-execution-envelope-relational-slice.js";
export type {
  RoutedActionExecutionEnvelopeDurableRecord,
  RoutedActionExecutionEnvelopeRelationalEntityType
} from "./routed-action-execution-envelope-relational-slice.js";
export {
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_ENTITY_TYPES
} from "./execution-attempt-audit-relational-slice.js";
export type {
  ExecutionAttemptAuditDurableRecord,
  ExecutionAttemptAuditRelationalEntityType
} from "./execution-attempt-audit-relational-slice.js";
export {
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ENTITY_TYPES
} from "./setup-lifecycle-mutation-record-relational-slice.js";
export type {
  SetupLifecycleMutationRecordDurableRecord,
  SetupLifecycleMutationRecordRelationalEntityType
} from "./setup-lifecycle-mutation-record-relational-slice.js";
export {
  SETUP_REFINEMENT_REQUEST_RELATIONAL_ENTITY_TYPES
} from "./setup-refinement-request-relational-slice.js";
export type {
  SetupRefinementRequestDurableRecord,
  SetupRefinementRequestRelationalEntityType
} from "./setup-refinement-request-relational-slice.js";
export {
  SETUP_DEFINITION_REVISION_RELATIONAL_ENTITY_TYPES
} from "./setup-definition-revision-relational-slice.js";
export type {
  SetupDefinitionRevisionDurableRecord,
  SetupDefinitionRevisionRelationalEntityType
} from "./setup-definition-revision-relational-slice.js";
export {
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ENTITY_TYPES
} from "./setup-revision-activation-record-relational-slice.js";
export type {
  SetupRevisionActivationRecordDurableRecord,
  SetupRevisionActivationRecordRelationalEntityType
} from "./setup-revision-activation-record-relational-slice.js";
export {
  FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA,
  FIRST_DURABLE_RELATIONAL_INDEXES,
  FIRST_DURABLE_RELATIONAL_MIGRATION_SLUG,
  FIRST_DURABLE_RELATIONAL_PRISMA_MODELS,
  FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS,
  FIRST_DURABLE_RELATIONAL_TABLES
} from "./first-durable-relational-physical-schema.js";
export type {
  FirstDurableRelationalIndexName,
  FirstDurableRelationalPrismaModelName,
  FirstDurableRelationalTableName
} from "./first-durable-relational-physical-schema.js";
export {
  SIGNAL_EVALUATION_RELATIONAL_INDEXES,
  SIGNAL_EVALUATION_RELATIONAL_MIGRATION_SLUG,
  SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS,
  SIGNAL_EVALUATION_RELATIONAL_REQUIRED_COLUMNS,
  SIGNAL_EVALUATION_RELATIONAL_TABLES,
  SIGNAL_EVALUATION_RELATIONAL_UNIQUE_CONSTRAINTS
} from "./signal-evaluation-relational-physical-schema.js";
export type {
  SignalEvaluationRelationalIndexName,
  SignalEvaluationRelationalPrismaModelName,
  SignalEvaluationRelationalTableName,
  SignalEvaluationRelationalUniqueConstraintName
} from "./signal-evaluation-relational-physical-schema.js";
export {
  SETUP_AGGREGATE_RELATIONAL_INDEXES,
  SETUP_AGGREGATE_RELATIONAL_MIGRATION_SLUG,
  SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS,
  SETUP_AGGREGATE_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_AGGREGATE_RELATIONAL_TABLES,
  SETUP_AGGREGATE_RELATIONAL_UNIQUE_CONSTRAINTS
} from "./setup-aggregate-relational-physical-schema.js";
export type {
  SetupAggregateRelationalIndexName,
  SetupAggregateRelationalPrismaModelName,
  SetupAggregateRelationalTableName,
  SetupAggregateRelationalUniqueConstraintName
} from "./setup-aggregate-relational-physical-schema.js";
export {
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_INDEXES,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES
} from "./research-feedback-decision-relational-physical-schema.js";
export type {
  ResearchFeedbackDecisionRelationalIndexName,
  ResearchFeedbackDecisionRelationalPrismaModelName,
  ResearchFeedbackDecisionRelationalTableName
} from "./research-feedback-decision-relational-physical-schema.js";
export {
  RESEARCH_DECISION_APPROVAL_RELATIONAL_INDEXES,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_UNIQUE_CONSTRAINTS
} from "./research-decision-approval-relational-physical-schema.js";
export type {
  ResearchDecisionApprovalRelationalIndexName,
  ResearchDecisionApprovalRelationalPrismaModelName,
  ResearchDecisionApprovalRelationalTableName,
  ResearchDecisionApprovalRelationalUniqueConstraintName
} from "./research-decision-approval-relational-physical-schema.js";
export {
  RESEARCH_REVIEW_DECISION_RELATIONAL_INDEXES,
  RESEARCH_REVIEW_DECISION_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS,
  RESEARCH_REVIEW_DECISION_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES
} from "./research-review-decision-relational-physical-schema.js";
export type {
  ResearchReviewDecisionRelationalIndexName,
  ResearchReviewDecisionRelationalPrismaModelName,
  ResearchReviewDecisionRelationalTableName
} from "./research-review-decision-relational-physical-schema.js";
export {
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_INDEXES,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_MIGRATION_SLUG,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_REQUIRED_COLUMNS,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES
} from "./routed-action-execution-envelope-relational-physical-schema.js";
export type {
  RoutedActionExecutionEnvelopeRelationalIndexName,
  RoutedActionExecutionEnvelopeRelationalPrismaModelName,
  RoutedActionExecutionEnvelopeRelationalTableName
} from "./routed-action-execution-envelope-relational-physical-schema.js";
export {
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_INDEXES,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_MIGRATION_SLUG,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_PRISMA_MODELS,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_REQUIRED_COLUMNS,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_TABLES,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_UNIQUE_CONSTRAINTS
} from "./execution-attempt-audit-relational-physical-schema.js";
export type {
  ExecutionAttemptAuditRelationalIndexName,
  ExecutionAttemptAuditRelationalPrismaModelName,
  ExecutionAttemptAuditRelationalTableName
} from "./execution-attempt-audit-relational-physical-schema.js";
export {
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_INDEXES,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_MIGRATION_SLUG,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES
} from "./setup-lifecycle-mutation-record-relational-physical-schema.js";
export type {
  SetupLifecycleMutationRecordRelationalIndexName,
  SetupLifecycleMutationRecordRelationalPrismaModelName,
  SetupLifecycleMutationRecordRelationalTableName
} from "./setup-lifecycle-mutation-record-relational-physical-schema.js";
export {
  SETUP_REFINEMENT_REQUEST_RELATIONAL_INDEXES,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_MIGRATION_SLUG,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES
} from "./setup-refinement-request-relational-physical-schema.js";
export type {
  SetupRefinementRequestRelationalIndexName,
  SetupRefinementRequestRelationalPrismaModelName,
  SetupRefinementRequestRelationalTableName
} from "./setup-refinement-request-relational-physical-schema.js";
export {
  SETUP_DEFINITION_REVISION_RELATIONAL_INDEXES,
  SETUP_DEFINITION_REVISION_RELATIONAL_MIGRATION_SLUG,
  SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS,
  SETUP_DEFINITION_REVISION_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_DEFINITION_REVISION_RELATIONAL_TABLES,
  SETUP_DEFINITION_REVISION_RELATIONAL_UNIQUE_CONSTRAINTS
} from "./setup-definition-revision-relational-physical-schema.js";
export type {
  SetupDefinitionRevisionRelationalIndexName,
  SetupDefinitionRevisionRelationalPrismaModelName,
  SetupDefinitionRevisionRelationalTableName,
  SetupDefinitionRevisionRelationalUniqueConstraintName
} from "./setup-definition-revision-relational-physical-schema.js";
export {
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_INDEXES,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_MIGRATION_SLUG,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES
} from "./setup-revision-activation-record-relational-physical-schema.js";
export type {
  SetupRevisionActivationRecordRelationalIndexName,
  SetupRevisionActivationRecordRelationalPrismaModelName,
  SetupRevisionActivationRecordRelationalTableName
} from "./setup-revision-activation-record-relational-physical-schema.js";

export type {
  EntityIdentity,
  ProductEntityIdentity,
  RuntimeEvidenceIdentity
} from "./entity-identity.js";

export { PRODUCT_RECORD_SOURCES } from "./product-record-metadata.js";
export type {
  ProductRecordMetadata,
  ProductRecordSource
} from "./product-record-metadata.js";

export {
  FIRST_CLASS_PERSISTED_ENTITY_PROFILES,
  PERSISTED_ENTITY_LIFECYCLE_STATUSES
} from "./persisted-entity.js";
export type {
  PersistedEntity,
  PersistedEntityLifecycleStatus,
  PersistedEntityProfile,
  PersistenceTimingSemantics
} from "./persisted-entity.js";
