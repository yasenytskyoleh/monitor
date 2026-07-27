export const RESEARCH_RUN_RELATIONAL_PRISMA_MODELS = {
  researchRunRecord: "ResearchRunRecord"
} as const;
export type ResearchRunRelationalPrismaModelName =
  (typeof RESEARCH_RUN_RELATIONAL_PRISMA_MODELS)[keyof typeof RESEARCH_RUN_RELATIONAL_PRISMA_MODELS];

export const RESEARCH_RUN_RELATIONAL_TABLES = {
  researchRun: "research_run"
} as const;
export type ResearchRunRelationalTableName =
  (typeof RESEARCH_RUN_RELATIONAL_TABLES)[keyof typeof RESEARCH_RUN_RELATIONAL_TABLES];

export const RESEARCH_RUN_RELATIONAL_REQUIRED_COLUMNS = {
  research_run: [
    "research_run_id", "version", "lifecycle_status", "research_run_status", "hypothesis_id",
    "setup_id", "candidate_ids", "evaluation_window_ids", "evaluation_result_ids", "started_at_utc",
    "completed_at_utc", "summary", "origin_run_id", "origin_transition_id", "created_by_source",
    "last_updated_by_source", "trace_id", "source_observed_at_utc", "metadata_notes",
    "created_at_utc", "updated_at_utc", "archived_at_utc"
  ]
} as const;

export const RESEARCH_RUN_RELATIONAL_INDEXES = [
  "idx_research_run_status",
  "idx_research_run_hypothesis_status",
  "idx_research_run_setup_status"
] as const;
export type ResearchRunRelationalIndexName =
  (typeof RESEARCH_RUN_RELATIONAL_INDEXES)[number];

export const RESEARCH_RUN_RELATIONAL_MIGRATION_SLUG =
  "product_domain_research_run_relational_v1" as const;
