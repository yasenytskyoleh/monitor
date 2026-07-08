export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS = {
  setupLifecycleMutationRecord: "SetupLifecycleMutationRecordRecord"
} as const;
export type SetupLifecycleMutationRecordRelationalPrismaModelName =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS)[keyof typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS];

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES = {
  setupLifecycleMutationRecord: "setup_lifecycle_mutation_record"
} as const;
export type SetupLifecycleMutationRecordRelationalTableName =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES)[keyof typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES];

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_REQUIRED_COLUMNS = {
  setup_lifecycle_mutation_record: [
    "setup_lifecycle_mutation_record_id",
    "version",
    "lifecycle_status",
    "setup_definition_id",
    "research_decision_approval_id",
    "research_feedback_decision_id",
    "previous_status",
    "new_status",
    "approved_action",
    "mutated_by",
    "mutated_at_utc",
    "notes",
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

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_INDEXES = [
  "idx_setup_lifecycle_mutation_record_setup_definition_id",
  "idx_setup_lifecycle_mutation_record_approval_id",
  "idx_setup_lifecycle_mutation_record_feedback_id",
  "idx_setup_lifecycle_mutation_record_approved_action"
] as const;
export type SetupLifecycleMutationRecordRelationalIndexName =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_INDEXES)[number];

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_MIGRATION_SLUG =
  "product_domain_setup_lifecycle_mutation_record_relational_v1" as const;
