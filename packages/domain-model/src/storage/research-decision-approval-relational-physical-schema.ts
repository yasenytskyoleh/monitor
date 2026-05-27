export const RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS = {
  researchDecisionApprovalRecord: "ResearchDecisionApprovalRecord"
} as const;
export type ResearchDecisionApprovalRelationalPrismaModelName =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS)[keyof typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS];

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES = {
  researchDecisionApproval: "research_decision_approval"
} as const;
export type ResearchDecisionApprovalRelationalTableName =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES)[keyof typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES];

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_REQUIRED_COLUMNS = {
  research_decision_approval: [
    "research_decision_approval_id",
    "version",
    "lifecycle_status",
    "approval_status",
    "research_feedback_decision_id",
    "setup_definition_id",
    "reviewed_by",
    "reviewed_at_utc",
    "approval_outcome",
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

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_INDEXES = [
  "idx_research_decision_approval_research_feedback_decision_id",
  "idx_research_decision_approval_setup_definition_id",
  "idx_research_decision_approval_approval_outcome",
  "idx_research_decision_approval_authorized_next_action"
] as const;
export type ResearchDecisionApprovalRelationalIndexName =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_INDEXES)[number];

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_MIGRATION_SLUG =
  "product_domain_research_decision_approval_relational_v1" as const;
