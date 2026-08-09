ALTER TYPE "product_domain"."product_record_source"
  ADD VALUE IF NOT EXISTS 'notification_pipeline';

CREATE TYPE "product_domain"."pattern_notification_delivery_status" AS ENUM (
  'pending_delivery',
  'delivery_attempted',
  'delivered',
  'failed'
);

CREATE TABLE "product_domain"."pattern_notification" (
  "notification_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "delivery_status" "product_domain"."pattern_notification_delivery_status" NOT NULL,
  "deduplication_key" TEXT NOT NULL,
  "signal_candidate_id" TEXT NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "setup_revision_id" TEXT NOT NULL,
  "monitored_symbol_id" TEXT NOT NULL,
  "setup_aggregate_result_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "observed_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "current_price" DOUBLE PRECISION NOT NULL,
  "policy_id" TEXT NOT NULL,
  "completed_evaluations" INTEGER NOT NULL,
  "positive_outcome_rate" DOUBLE PRECISION NOT NULL,
  "average_percentage_move" DOUBLE PRECISION NOT NULL,
  "aggregate_computed_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "delivery_attempted_at_utc" TIMESTAMPTZ(3),
  "completed_at_utc" TIMESTAMPTZ(3),
  "outcome_code" TEXT,
  "origin_run_id" TEXT,
  "origin_transition_id" TEXT,
  "created_by_source" "product_domain"."product_record_source" NOT NULL,
  "last_updated_by_source" "product_domain"."product_record_source" NOT NULL,
  "trace_id" TEXT,
  "source_observed_at_utc" TIMESTAMPTZ(3),
  "metadata_notes" TEXT,
  "created_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "updated_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "archived_at_utc" TIMESTAMPTZ(3),
  CONSTRAINT "pattern_notification_pkey" PRIMARY KEY ("notification_id"),
  CONSTRAINT "pattern_notification_deduplication_key" UNIQUE ("deduplication_key"),
  CONSTRAINT "pattern_notification_version_positive" CHECK ("version" > 0),
  CONSTRAINT "pattern_notification_required_text" CHECK (
    length(trim("notification_id")) > 0 AND
    length(trim("deduplication_key")) > 0 AND
    length(trim("signal_candidate_id")) > 0 AND
    length(trim("setup_definition_id")) > 0 AND
    length(trim("setup_revision_id")) > 0 AND
    length(trim("monitored_symbol_id")) > 0 AND
    length(trim("setup_aggregate_result_id")) > 0 AND
    length(trim("policy_id")) > 0
  ),
  CONSTRAINT "pattern_notification_direction_valid" CHECK ("direction" = 'consider_long'),
  CONSTRAINT "pattern_notification_metrics_valid" CHECK (
    "current_price" > 0 AND
    "completed_evaluations" > 0 AND
    "positive_outcome_rate" >= 0 AND
    "positive_outcome_rate" <= 1
  ),
  CONSTRAINT "pattern_notification_outcome_code_non_empty" CHECK (
    "outcome_code" IS NULL OR length(trim("outcome_code")) > 0
  ),
  CONSTRAINT "pattern_notification_delivery_state_consistent" CHECK (
    ("delivery_status" = 'pending_delivery' AND
      "delivery_attempted_at_utc" IS NULL AND "completed_at_utc" IS NULL AND
      "outcome_code" IS NULL) OR
    ("delivery_status" = 'delivery_attempted' AND
      "delivery_attempted_at_utc" IS NOT NULL AND "completed_at_utc" IS NULL AND
      "outcome_code" IS NULL) OR
    ("delivery_status" IN ('delivered', 'failed') AND
      "delivery_attempted_at_utc" IS NOT NULL AND "completed_at_utc" IS NOT NULL AND
      "outcome_code" IS NOT NULL)
  ),
  CONSTRAINT "pattern_notification_delivery_timestamp_consistent" CHECK (
    "delivery_attempted_at_utc" IS NULL OR "delivery_attempted_at_utc" >= "observed_at_utc"
  ),
  CONSTRAINT "pattern_notification_completion_timestamp_consistent" CHECK (
    "completed_at_utc" IS NULL OR "completed_at_utc" >= "delivery_attempted_at_utc"
  ),
  CONSTRAINT "pattern_notification_created_updated_order" CHECK (
    "created_at_utc" >= "observed_at_utc" AND
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "pattern_notification_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_pattern_notification_delivery_status"
  ON "product_domain"."pattern_notification" ("delivery_status");
CREATE INDEX "idx_pattern_notification_signal_candidate_id"
  ON "product_domain"."pattern_notification" ("signal_candidate_id");
CREATE INDEX "idx_pattern_notification_observed_at_utc"
  ON "product_domain"."pattern_notification" ("observed_at_utc");
