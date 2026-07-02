export const RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS = {
  researchReviewDecisionRecord: "ResearchReviewDecisionRecord"
} as const;
export type ResearchReviewDecisionRelationalPrismaModelName =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS)[keyof typeof RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS];

export const RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES = {
  researchReviewDecision: "research_review_decision"
} as const;
export type ResearchReviewDecisionRelationalTableName =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES)[keyof typeof RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES];

export const RESEARCH_REVIEW_DECISION_RELATIONAL_REQUIRED_COLUMNS = {
  research_review_decision: [
    "research_review_decision_id",
    "version",
    "lifecycle_status",
    "decision_status",
    "research_review_packet_id",
    "setup_family_id",
    "setup_revision_id",
    "research_hypothesis_id",
    "reviewed_by",
    "reviewed_at_utc",
    "decision_outcome",
    "reviewer_notes",
    "authorized_next_action",
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

export const RESEARCH_REVIEW_DECISION_RELATIONAL_INDEXES = [
  "idx_research_review_decision_review_packet_id",
  "idx_research_review_decision_setup_family_id",
  "idx_research_review_decision_setup_revision_id",
  "idx_research_review_decision_research_hypothesis_id",
  "idx_research_review_decision_decision_outcome",
  "idx_research_review_decision_authorized_next_action"
] as const;
export type ResearchReviewDecisionRelationalIndexName =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_INDEXES)[number];

export const RESEARCH_REVIEW_DECISION_RELATIONAL_MIGRATION_SLUG =
  "product_domain_research_review_decision_relational_v1" as const;
