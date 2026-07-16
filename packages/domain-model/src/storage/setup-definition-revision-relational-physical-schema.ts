export const SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS = {
  setupDefinitionRevision: "SetupDefinitionRevisionRecord"
} as const;
export type SetupDefinitionRevisionRelationalPrismaModelName =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS)[keyof typeof SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS];

export const SETUP_DEFINITION_REVISION_RELATIONAL_TABLES = {
  setupDefinitionRevision: "setup_definition_revision"
} as const;
export type SetupDefinitionRevisionRelationalTableName =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_TABLES)[keyof typeof SETUP_DEFINITION_REVISION_RELATIONAL_TABLES];

export const SETUP_DEFINITION_REVISION_RELATIONAL_REQUIRED_COLUMNS = {
  setup_definition_revision: [
    "setup_definition_revision_id",
    "version",
    "lifecycle_status",
    "setup_definition_id",
    "previous_setup_definition_id",
    "setup_family_id",
    "setup_version_number",
    "previous_revision_id",
    "revision_reason",
    "revision_status",
    "changed_fields_summary",
    "created_by",
    "notes",
    "source_setup_refinement_request_id",
    "source_research_decision_approval_id",
    "source_research_feedback_decision_id",
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

export const SETUP_DEFINITION_REVISION_RELATIONAL_INDEXES = [
  "idx_setup_definition_revision_previous_setup_definition_id",
  "idx_setup_definition_revision_source_refinement_request_id",
  "idx_setup_definition_revision_revision_status"
] as const;
export type SetupDefinitionRevisionRelationalIndexName =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_INDEXES)[number];

export const SETUP_DEFINITION_REVISION_RELATIONAL_UNIQUE_CONSTRAINTS = [
  "uq_setup_definition_revision_setup_definition_id",
  "uq_setup_definition_revision_family_version"
] as const;
export type SetupDefinitionRevisionRelationalUniqueConstraintName =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_UNIQUE_CONSTRAINTS)[number];

export const SETUP_DEFINITION_REVISION_RELATIONAL_MIGRATION_SLUG =
  "product_domain_setup_definition_revision_relational_v1" as const;
