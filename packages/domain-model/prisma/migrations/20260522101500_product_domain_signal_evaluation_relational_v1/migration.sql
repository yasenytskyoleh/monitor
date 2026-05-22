CREATE TYPE "product_domain"."signal_candidate_status" AS ENUM (
  'detected',
  'under_review',
  'evaluated',
  'discarded'
);

CREATE TYPE "product_domain"."evaluation_status" AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'expired',
  'invalidated'
);

CREATE TABLE "product_domain"."signal_candidate" (
  "signal_candidate_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "candidate_status" "product_domain"."signal_candidate_status" NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "setup_revision_id" TEXT NOT NULL,
  "monitored_symbol_id" TEXT NOT NULL,
  "detection_hit_id" TEXT,
  "detected_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "evidence_summary" TEXT NOT NULL,
  "candidate_origin_run_id" TEXT,
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
  CONSTRAINT "signal_candidate_pkey" PRIMARY KEY ("signal_candidate_id"),
  CONSTRAINT "signal_candidate_setup_definition_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "signal_candidate_version_positive" CHECK ("version" > 0),
  CONSTRAINT "signal_candidate_evidence_summary_non_empty" CHECK (length(trim("evidence_summary")) > 0),
  CONSTRAINT "signal_candidate_detected_updated_order" CHECK ("updated_at_utc" >= "detected_at_utc"),
  CONSTRAINT "signal_candidate_created_updated_order" CHECK ("updated_at_utc" >= "created_at_utc"),
  CONSTRAINT "signal_candidate_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE TABLE "product_domain"."evaluation_result" (
  "evaluation_result_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "evaluation_status" "product_domain"."evaluation_status" NOT NULL,
  "signal_candidate_id" TEXT NOT NULL,
  "evaluation_window_id" TEXT NOT NULL,
  "reference_price" DOUBLE PRECISION,
  "final_price" DOUBLE PRECISION,
  "high_in_window" DOUBLE PRECISION,
  "low_in_window" DOUBLE PRECISION,
  "absolute_move" DOUBLE PRECISION,
  "percentage_move" DOUBLE PRECISION,
  "max_favorable_excursion" DOUBLE PRECISION,
  "max_adverse_excursion" DOUBLE PRECISION,
  "evaluated_at_utc" TIMESTAMPTZ(3),
  "notes" TEXT,
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
  CONSTRAINT "evaluation_result_pkey" PRIMARY KEY ("evaluation_result_id"),
  CONSTRAINT "evaluation_result_signal_candidate_id_fkey"
    FOREIGN KEY ("signal_candidate_id")
    REFERENCES "product_domain"."signal_candidate" ("signal_candidate_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "evaluation_result_version_positive" CHECK ("version" > 0),
  CONSTRAINT "evaluation_result_created_updated_order" CHECK ("updated_at_utc" >= "created_at_utc"),
  CONSTRAINT "evaluation_result_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  ),
  CONSTRAINT "evaluation_result_completed_metrics_consistent" CHECK (
    "evaluation_status" <> 'completed' OR (
      "reference_price" IS NOT NULL AND
      "final_price" IS NOT NULL AND
      "high_in_window" IS NOT NULL AND
      "low_in_window" IS NOT NULL AND
      "absolute_move" IS NOT NULL AND
      "percentage_move" IS NOT NULL AND
      "max_favorable_excursion" IS NOT NULL AND
      "max_adverse_excursion" IS NOT NULL AND
      "evaluated_at_utc" IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX "uq_evaluation_result_candidate_window"
  ON "product_domain"."evaluation_result" ("signal_candidate_id", "evaluation_window_id");

CREATE INDEX "idx_signal_candidate_setup_definition_id"
  ON "product_domain"."signal_candidate" ("setup_definition_id");
CREATE INDEX "idx_signal_candidate_monitored_symbol_id"
  ON "product_domain"."signal_candidate" ("monitored_symbol_id");
CREATE INDEX "idx_signal_candidate_candidate_status"
  ON "product_domain"."signal_candidate" ("candidate_status");
CREATE INDEX "idx_evaluation_result_signal_candidate_id"
  ON "product_domain"."evaluation_result" ("signal_candidate_id");
CREATE INDEX "idx_evaluation_result_evaluation_window_id"
  ON "product_domain"."evaluation_result" ("evaluation_window_id");
CREATE INDEX "idx_evaluation_result_evaluation_status"
  ON "product_domain"."evaluation_result" ("evaluation_status");
