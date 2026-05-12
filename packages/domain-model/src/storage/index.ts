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
  DurableRelationalStorageSchemaVersion,
  FirstDurableRelationalEntityType,
  FirstDurableRelationalRecord,
  ResearchHypothesisDurableRecord,
  ResearchHypothesisSetupDefinitionLinkRecord,
  SetupDefinitionDurableRecord
} from "./first-durable-relational-slice.js";

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
