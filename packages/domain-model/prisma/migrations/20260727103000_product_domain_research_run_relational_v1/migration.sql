CREATE TYPE "product_domain"."research_run_status" AS ENUM ('planned', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE "product_domain"."research_run" (
  "research_run_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "research_run_status" "product_domain"."research_run_status" NOT NULL,
  "hypothesis_id" TEXT NOT NULL,
  "setup_id" TEXT NOT NULL,
  "candidate_ids" TEXT[] NOT NULL,
  "evaluation_window_ids" TEXT[] NOT NULL,
  "evaluation_result_ids" TEXT[] NOT NULL,
  "started_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "completed_at_utc" TIMESTAMPTZ(3),
  "summary" TEXT,
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
  CONSTRAINT "research_run_pkey" PRIMARY KEY ("research_run_id"),
  CONSTRAINT "research_run_version_positive" CHECK ("version" > 0),
  CONSTRAINT "research_run_id_non_empty" CHECK (length(trim("research_run_id")) > 0),
  CONSTRAINT "research_run_hypothesis_id_non_empty" CHECK (length(trim("hypothesis_id")) > 0),
  CONSTRAINT "research_run_setup_id_non_empty" CHECK (length(trim("setup_id")) > 0),
  CONSTRAINT "research_run_created_updated_order" CHECK ("updated_at_utc" >= "created_at_utc"),
  CONSTRAINT "research_run_completed_after_start" CHECK ("completed_at_utc" IS NULL OR "completed_at_utc" >= "started_at_utc"),
  CONSTRAINT "research_run_completed_timestamp_consistent" CHECK (
    ("research_run_status" = 'completed' AND "completed_at_utc" IS NOT NULL) OR
    ("research_run_status" <> 'completed' AND "completed_at_utc" IS NULL)
  ),
  CONSTRAINT "research_run_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_research_run_status" ON "product_domain"."research_run" ("research_run_status");
CREATE INDEX "idx_research_run_hypothesis_status" ON "product_domain"."research_run" ("hypothesis_id", "research_run_status");
CREATE INDEX "idx_research_run_setup_status" ON "product_domain"."research_run" ("setup_id", "research_run_status");
