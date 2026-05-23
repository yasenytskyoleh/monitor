export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS = {
  researchFeedbackDecisionRecord: "ResearchFeedbackDecisionRecord"
} as const;
export type ResearchFeedbackDecisionRelationalPrismaModelName =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS)[keyof typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS];

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES = {
  researchFeedbackDecision: "research_feedback_decision"
} as const;
export type ResearchFeedbackDecisionRelationalTableName =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES)[keyof typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES];

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_REQUIRED_COLUMNS = {
  research_feedback_decision: [
    "research_feedback_decision_id",
    "version",
    "lifecycle_status",
    "decision_status",
    "setup_definition_id",
    "research_hypothesis_id",
    "setup_aggregate_result_id",
    "evidence_status",
    "recommended_action",
    "rationale_summary",
    "requires_manual_review",
    "evidence_summary",
    "reviewer_metadata",
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

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_INDEXES = [
  "idx_research_feedback_decision_setup_definition_id",
  "idx_research_feedback_decision_research_hypothesis_id",
  "idx_research_feedback_decision_setup_aggregate_result_id",
  "idx_research_feedback_decision_decision_status",
  "idx_research_feedback_decision_recommended_action"
] as const;
export type ResearchFeedbackDecisionRelationalIndexName =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_INDEXES)[number];

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_MIGRATION_SLUG =
  "product_domain_research_feedback_decision_relational_v1" as const;
