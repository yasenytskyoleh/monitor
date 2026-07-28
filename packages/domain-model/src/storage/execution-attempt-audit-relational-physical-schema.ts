export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_PRISMA_MODELS = {
  executionAttemptAuditRecord: "ExecutionAttemptAuditRecord"
} as const;
export type ExecutionAttemptAuditRelationalPrismaModelName =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_PRISMA_MODELS)[keyof typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_PRISMA_MODELS];

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_TABLES = {
  executionAttemptAudit: "execution_attempt_audit"
} as const;
export type ExecutionAttemptAuditRelationalTableName =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_TABLES)[keyof typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_TABLES];

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_REQUIRED_COLUMNS = {
  execution_attempt_audit: [
    "execution_attempt_audit_id",
    "version",
    "lifecycle_status",
    "execution_attempt_audit_status",
    "routed_action_execution_envelope_id",
    "review_decision_routing_result_id",
    "research_review_decision_id",
    "action_target",
    "downstream_command_type",
    "attempted_by",
    "attempted_at_utc",
    "completed_at_utc",
    "outcome_code",
    "outcome_summary",
    "warning_codes",
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

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_INDEXES = [
  "idx_execution_attempt_audit_routed_action_execution_envelope_id",
  "idx_execution_attempt_audit_review_decision_routing_result_id",
  "idx_execution_attempt_audit_research_review_decision_id",
  "idx_execution_attempt_audit_status",
  "idx_execution_attempt_audit_action_target"
] as const;
export type ExecutionAttemptAuditRelationalIndexName =
  (typeof EXECUTION_ATTEMPT_AUDIT_RELATIONAL_INDEXES)[number];

export const EXECUTION_ATTEMPT_AUDIT_RELATIONAL_MIGRATION_SLUG =
  "product_domain_execution_attempt_audit_relational_v1" as const;
