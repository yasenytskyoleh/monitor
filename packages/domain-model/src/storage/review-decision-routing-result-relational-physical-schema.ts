export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS = {
  reviewDecisionRoutingResult: "ReviewDecisionRoutingResultRecord"
} as const;
export type ReviewDecisionRoutingResultRelationalPrismaModelName =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS)[keyof typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS];

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES = {
  reviewDecisionRoutingResult: "review_decision_routing_result"
} as const;
export type ReviewDecisionRoutingResultRelationalTableName =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES)[keyof typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES];

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_REQUIRED_COLUMNS = {
  review_decision_routing_result: [
    "review_decision_routing_result_id",
    "version",
    "lifecycle_status",
    "routing_status",
    "research_review_decision_id",
    "setup_family_id",
    "setup_revision_id",
    "decision_outcome",
    "authorized_next_action",
    "downstream_target",
    "downstream_command_type",
    "routed_at_utc",
    "reason",
    "warnings",
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

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_INDEXES = [
  "idx_review_decision_routing_result_review_decision_id",
  "idx_review_decision_routing_result_family_routed_at_utc",
  "idx_review_decision_routing_result_routing_status"
] as const;
export type ReviewDecisionRoutingResultRelationalIndexName =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_INDEXES)[number];

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_MIGRATION_SLUG =
  "product_domain_review_decision_routing_result_relational_v1" as const;
