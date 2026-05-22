export const SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS = {
  setupAggregateResultRecord: "SetupAggregateResultRecord"
} as const;
export type SetupAggregateRelationalPrismaModelName =
  (typeof SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS)[keyof typeof SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS];

export const SETUP_AGGREGATE_RELATIONAL_TABLES = {
  setupAggregateResult: "setup_aggregate_result"
} as const;
export type SetupAggregateRelationalTableName =
  (typeof SETUP_AGGREGATE_RELATIONAL_TABLES)[keyof typeof SETUP_AGGREGATE_RELATIONAL_TABLES];

export const SETUP_AGGREGATE_RELATIONAL_REQUIRED_COLUMNS = {
  setup_aggregate_result: [
    "setup_aggregate_result_id",
    "version",
    "lifecycle_status",
    "aggregate_status",
    "setup_definition_id",
    "research_hypothesis_id",
    "scope_key",
    "scope_evaluation_window_id",
    "scope_symbol_scope_kind",
    "scope_symbol_ids",
    "scope_time_range_start_at_utc",
    "scope_time_range_end_at_utc",
    "scope_research_run_id",
    "scope_hypothesis_id",
    "total_candidates",
    "completed_evaluations",
    "invalidated_evaluations",
    "average_percentage_move",
    "average_absolute_move",
    "average_final_outcome",
    "average_max_favorable_excursion",
    "average_max_adverse_excursion",
    "positive_outcome_count",
    "computed_at_utc",
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

export const SETUP_AGGREGATE_RELATIONAL_INDEXES = [
  "idx_setup_aggregate_result_setup_definition_id",
  "idx_setup_aggregate_result_research_hypothesis_id",
  "idx_setup_aggregate_result_aggregate_status",
  "idx_setup_aggregate_result_scope_evaluation_window_id"
] as const;
export type SetupAggregateRelationalIndexName =
  (typeof SETUP_AGGREGATE_RELATIONAL_INDEXES)[number];

export const SETUP_AGGREGATE_RELATIONAL_UNIQUE_CONSTRAINTS = [
  "uq_setup_aggregate_result_scope_key"
] as const;
export type SetupAggregateRelationalUniqueConstraintName =
  (typeof SETUP_AGGREGATE_RELATIONAL_UNIQUE_CONSTRAINTS)[number];

export const SETUP_AGGREGATE_RELATIONAL_MIGRATION_SLUG =
  "product_domain_setup_aggregate_relational_v1" as const;
