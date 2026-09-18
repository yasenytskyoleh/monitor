export const PATTERN_NOTIFICATION_RELATIONAL_PRISMA_MODELS = {
  patternNotification: "PatternNotificationRecord"
} as const;
export type PatternNotificationRelationalPrismaModelName =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_PRISMA_MODELS)[keyof typeof PATTERN_NOTIFICATION_RELATIONAL_PRISMA_MODELS];

export const PATTERN_NOTIFICATION_RELATIONAL_TABLES = {
  patternNotification: "pattern_notification"
} as const;
export type PatternNotificationRelationalTableName =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_TABLES)[keyof typeof PATTERN_NOTIFICATION_RELATIONAL_TABLES];

export const PATTERN_NOTIFICATION_RELATIONAL_REQUIRED_COLUMNS = {
  pattern_notification: [
    "notification_id",
    "version",
    "lifecycle_status",
    "delivery_status",
    "deduplication_key",
    "signal_candidate_id",
    "setup_definition_id",
    "setup_revision_id",
    "monitored_symbol_id",
    "setup_aggregate_result_id",
    "direction",
    "observed_at_utc",
    "current_price",
    "policy_id",
    "completed_evaluations",
    "positive_outcome_rate",
    "average_percentage_move",
    "aggregate_computed_at_utc",
    "delivery_attempted_at_utc",
    "delivery_lease_id",
    "delivery_lease_expires_at_utc",
    "completed_at_utc",
    "outcome_code",
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

export const PATTERN_NOTIFICATION_RELATIONAL_INDEXES = [
  "idx_pattern_notification_delivery_status",
  "idx_pattern_notification_delivery_lease_expiry",
  "idx_pattern_notification_signal_candidate_id",
  "idx_pattern_notification_observed_at_utc"
] as const;
export type PatternNotificationRelationalIndexName =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_INDEXES)[number];

export const PATTERN_NOTIFICATION_RELATIONAL_UNIQUE_CONSTRAINTS = [
  "pattern_notification_deduplication_key"
] as const;
export type PatternNotificationRelationalUniqueConstraintName =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_UNIQUE_CONSTRAINTS)[number];

/**
 * Unlike its peers, this table depends on CHECK constraints for its core invariants: the
 * evidence snapshot's validity, the delivery state machine, and the at-most-once delivery lease.
 * Any adapter must satisfy all of them, so they are named here rather than left implicit.
 */
export const PATTERN_NOTIFICATION_RELATIONAL_CHECK_CONSTRAINTS = [
  "pattern_notification_version_positive",
  "pattern_notification_required_text",
  "pattern_notification_direction_valid",
  "pattern_notification_metrics_valid",
  "pattern_notification_created_updated_order",
  "pattern_notification_archived_timestamp_consistent",
  "pattern_notification_completion_timestamp_consistent",
  "pattern_notification_delivery_state_consistent",
  "pattern_notification_delivery_timestamp_consistent",
  "pattern_notification_outcome_code_non_empty",
  "pattern_notification_delivery_lease_consistent"
] as const;
export type PatternNotificationRelationalCheckConstraintName =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_CHECK_CONSTRAINTS)[number];

export const PATTERN_NOTIFICATION_RELATIONAL_MIGRATION_SLUG =
  "product_domain_pattern_notification_relational_v1" as const;

/** The delivery lease columns, their CHECK constraint, and their index arrived separately. */
export const PATTERN_NOTIFICATION_DELIVERY_LEASE_MIGRATION_SLUG =
  "product_domain_pattern_notification_delivery_lease_v1" as const;
