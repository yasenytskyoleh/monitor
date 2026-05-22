CREATE TYPE "product_domain"."aggregate_computation_status" AS ENUM (
  'pending',
  'completed',
  'partial',
  'invalid'
);

CREATE TYPE "product_domain"."aggregation_symbol_scope_kind" AS ENUM (
  'single_symbol',
  'symbol_set',
  'all_monitored'
);

CREATE TABLE "product_domain"."setup_aggregate_result" (
  "setup_aggregate_result_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "aggregate_status" "product_domain"."aggregate_computation_status" NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "research_hypothesis_id" TEXT,
  "scope_key" TEXT NOT NULL,
  "scope_evaluation_window_id" TEXT,
  "scope_symbol_scope_kind" "product_domain"."aggregation_symbol_scope_kind" NOT NULL,
  "scope_symbol_ids" TEXT[] NOT NULL,
  "scope_time_range_start_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "scope_time_range_end_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "scope_research_run_id" TEXT,
  "scope_hypothesis_id" TEXT,
  "total_candidates" INTEGER NOT NULL,
  "completed_evaluations" INTEGER NOT NULL,
  "invalidated_evaluations" INTEGER NOT NULL,
  "average_percentage_move" DOUBLE PRECISION,
  "average_absolute_move" DOUBLE PRECISION,
  "average_final_outcome" DOUBLE PRECISION,
  "average_max_favorable_excursion" DOUBLE PRECISION,
  "average_max_adverse_excursion" DOUBLE PRECISION,
  "positive_outcome_count" INTEGER NOT NULL,
  "computed_at_utc" TIMESTAMPTZ(3),
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
  CONSTRAINT "setup_aggregate_result_pkey" PRIMARY KEY ("setup_aggregate_result_id"),
  CONSTRAINT "setup_aggregate_result_setup_definition_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_aggregate_result_research_hypothesis_id_fkey"
    FOREIGN KEY ("research_hypothesis_id")
    REFERENCES "product_domain"."research_hypothesis" ("research_hypothesis_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_aggregate_result_version_positive" CHECK ("version" > 0),
  CONSTRAINT "setup_aggregate_result_scope_key_non_empty" CHECK (length(trim("scope_key")) > 0),
  CONSTRAINT "setup_aggregate_result_time_range_order" CHECK (
    "scope_time_range_end_at_utc" >= "scope_time_range_start_at_utc"
  ),
  CONSTRAINT "setup_aggregate_result_total_candidates_non_negative" CHECK ("total_candidates" >= 0),
  CONSTRAINT "setup_aggregate_result_completed_evaluations_non_negative" CHECK ("completed_evaluations" >= 0),
  CONSTRAINT "setup_aggregate_result_invalidated_evaluations_non_negative" CHECK ("invalidated_evaluations" >= 0),
  CONSTRAINT "setup_aggregate_result_positive_outcome_count_non_negative" CHECK ("positive_outcome_count" >= 0),
  CONSTRAINT "setup_aggregate_result_completed_within_total" CHECK (
    "completed_evaluations" <= "total_candidates"
  ),
  CONSTRAINT "setup_aggregate_result_invalidated_within_total" CHECK (
    "invalidated_evaluations" <= "total_candidates"
  ),
  CONSTRAINT "setup_aggregate_result_positive_within_completed" CHECK (
    "positive_outcome_count" <= "completed_evaluations"
  ),
  CONSTRAINT "setup_aggregate_result_pending_metrics_consistent" CHECK (
    "aggregate_status" <> 'pending' OR (
      "total_candidates" = 0 AND
      "completed_evaluations" = 0 AND
      "invalidated_evaluations" = 0 AND
      "positive_outcome_count" = 0 AND
      "average_percentage_move" IS NULL AND
      "average_absolute_move" IS NULL AND
      "average_final_outcome" IS NULL AND
      "average_max_favorable_excursion" IS NULL AND
      "average_max_adverse_excursion" IS NULL AND
      "computed_at_utc" IS NULL
    )
  ),
  CONSTRAINT "setup_aggregate_result_completed_metrics_consistent" CHECK (
    "aggregate_status" <> 'completed' OR (
      "average_percentage_move" IS NOT NULL AND
      "average_absolute_move" IS NOT NULL AND
      "average_final_outcome" IS NOT NULL AND
      "average_max_favorable_excursion" IS NOT NULL AND
      "average_max_adverse_excursion" IS NOT NULL AND
      "computed_at_utc" IS NOT NULL
    )
  ),
  CONSTRAINT "setup_aggregate_result_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "setup_aggregate_result_computed_updated_order" CHECK (
    "computed_at_utc" IS NULL OR "updated_at_utc" >= "computed_at_utc"
  ),
  CONSTRAINT "setup_aggregate_result_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "uq_setup_aggregate_result_scope_key"
  ON "product_domain"."setup_aggregate_result" ("setup_definition_id", "scope_key");

CREATE INDEX "idx_setup_aggregate_result_setup_definition_id"
  ON "product_domain"."setup_aggregate_result" ("setup_definition_id");
CREATE INDEX "idx_setup_aggregate_result_research_hypothesis_id"
  ON "product_domain"."setup_aggregate_result" ("research_hypothesis_id");
CREATE INDEX "idx_setup_aggregate_result_aggregate_status"
  ON "product_domain"."setup_aggregate_result" ("aggregate_status");
CREATE INDEX "idx_setup_aggregate_result_scope_evaluation_window_id"
  ON "product_domain"."setup_aggregate_result" ("scope_evaluation_window_id");
