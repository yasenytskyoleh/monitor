export const STORAGE_BOUNDARIES = [
  "runtime_evidence",
  "product_domain",
  "derived_analytics"
] as const;
export type StorageBoundary = (typeof STORAGE_BOUNDARIES)[number];

export const RUNTIME_EVIDENCE_ARTIFACT_TYPES = [
  "run_record",
  "transition_record",
  "approval_record",
  "artifact_record",
  "backend_execution_evidence"
] as const;
export type RuntimeEvidenceArtifactType = (typeof RUNTIME_EVIDENCE_ARTIFACT_TYPES)[number];

export const PRODUCT_PERSISTED_ENTITY_TYPES = [
  "monitored_symbol",
  "setup_definition",
  "signal_candidate",
  "evaluation_result",
  "research_hypothesis",
  "setup_aggregate_result"
] as const;
export type ProductPersistedEntityType = (typeof PRODUCT_PERSISTED_ENTITY_TYPES)[number];

export const PRODUCT_EPHEMERAL_ENTITY_TYPES = [
  "detection_input_transient",
  "setup_comparison_view",
  "orchestration_task_envelope"
] as const;
export type ProductEphemeralEntityType = (typeof PRODUCT_EPHEMERAL_ENTITY_TYPES)[number];

export type StorageTechnologyDirection = {
  runtimeEvidence: "filesystem_artifacts";
  productDomain: "relational_planned";
  derivedAnalytics: "deferred";
  targetRelationalStack: "postgresql_prisma_planned";
};

export const DEFAULT_STORAGE_TECHNOLOGY_DIRECTION: StorageTechnologyDirection = {
  runtimeEvidence: "filesystem_artifacts",
  productDomain: "relational_planned",
  derivedAnalytics: "deferred",
  targetRelationalStack: "postgresql_prisma_planned"
};
