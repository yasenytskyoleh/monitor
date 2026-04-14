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
