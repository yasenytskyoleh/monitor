export const SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS = {
  setupRefinementRequest: "SetupRefinementRequestRecord"
} as const;
export type SetupRefinementRequestRelationalPrismaModelName =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS)[keyof typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS];

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES = {
  setupRefinementRequest: "setup_refinement_request"
} as const;
export type SetupRefinementRequestRelationalTableName =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES)[keyof typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES];

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_REQUIRED_COLUMNS = {
  setup_refinement_request: [
    "setup_refinement_request_id",
    "version",
    "lifecycle_status",
    "setup_definition_id",
    "source_research_decision_approval_id",
    "source_research_feedback_decision_id",
    "refinement_status",
    "refinement_rationale_summary",
    "requested_changes_summary",
    "evidence_references",
    "requested_by",
    "requested_at_utc",
    "assigned_reviewer_id",
    "assigned_owner_id",
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

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_INDEXES = [
  "idx_setup_refinement_request_setup_definition_id",
  "idx_setup_refinement_request_approval_id",
  "idx_setup_refinement_request_feedback_id",
  "idx_setup_refinement_request_refinement_status"
] as const;
export type SetupRefinementRequestRelationalIndexName =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_INDEXES)[number];

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_MIGRATION_SLUG =
  "product_domain_setup_refinement_request_relational_v1" as const;
