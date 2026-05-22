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
