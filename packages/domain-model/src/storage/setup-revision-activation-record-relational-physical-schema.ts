export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS = {
  setupRevisionActivationRecord: "SetupRevisionActivationRecordRecord"
} as const;
export type SetupRevisionActivationRecordRelationalPrismaModelName =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS)[keyof typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS];

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES = {
  setupRevisionActivationRecord: "setup_revision_activation_record"
} as const;
export type SetupRevisionActivationRecordRelationalTableName =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES)[keyof typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES];

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_REQUIRED_COLUMNS = {
  setup_revision_activation_record: [
    "setup_revision_activation_record_id",
    "version",
    "lifecycle_status",
    "setup_family_id",
    "target_revision_id",
    "target_setup_definition_id",
    "previous_revision_id",
    "previous_setup_definition_id",
    "activated_by",
    "activated_at_utc",
    "activation_outcome",
    "rationale",
    "origin_run_id",
    "origin_transition_id",
    "created_by_source",
    "last_updated_by_source",
    "trace_id",
    "source_observed_at_utc",
    "metadata_notes",
    "created_at_utc",
    "updated_at_utc",
    "archived_at_utc"
  ]
} as const;

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_INDEXES = [
  "idx_setup_revision_activation_record_family_activated_at_utc",
  "idx_setup_revision_activation_record_target_revision_id",
  "idx_setup_revision_activation_record_activation_outcome"
] as const;
export type SetupRevisionActivationRecordRelationalIndexName =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_INDEXES)[number];

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_MIGRATION_SLUG =
  "product_domain_setup_revision_activation_record_relational_v1" as const;
