CREATE SCHEMA IF NOT EXISTS "product_domain";

CREATE TYPE "product_domain"."persisted_lifecycle_status" AS ENUM ('active', 'archived');
CREATE TYPE "product_domain"."product_record_source" AS ENUM (
  'monitoring_pipeline',
  'detection_pipeline',
  'evaluation_pipeline',
  'research_aggregation_pipeline',
  'manual_curation',
  'migration_backfill'
);
CREATE TYPE "product_domain"."setup_definition_status" AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE "product_domain"."research_hypothesis_status" AS ENUM ('draft', 'active', 'paused', 'closed');
CREATE TYPE "product_domain"."hypothesis_evidence_status" AS ENUM ('supports', 'weakens', 'inconclusive');

CREATE TABLE "product_domain"."setup_definition" (
  "setup_definition_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "definition_status" "product_domain"."setup_definition_status" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "measurable_conditions" TEXT[] NOT NULL,
  "evaluation_assumptions" TEXT[] NOT NULL,
  "invalidation_assumptions" TEXT[] NOT NULL,
  "origin_run_id" TEXT,
  "origin_transition_id" TEXT,
  "created_by_source" "product_domain"."product_record_source" NOT NULL,
  "last_updated_by_source" "product_domain"."product_record_source" NOT NULL,
  "trace_id" TEXT,
  "source_observed_at_utc" TIMESTAMPTZ(3),
  "metadata_notes" TEXT,
  "trace_origin_run_id" TEXT,
  "trace_origin_transition_id" TEXT,
  "trace_metadata_trace_id" TEXT,
  "created_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "updated_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "archived_at_utc" TIMESTAMPTZ(3),
  CONSTRAINT "setup_definition_pkey" PRIMARY KEY ("setup_definition_id"),
  CONSTRAINT "setup_definition_version_positive" CHECK ("version" > 0),
  CONSTRAINT "setup_definition_measurable_conditions_non_empty" CHECK (cardinality("measurable_conditions") > 0),
  CONSTRAINT "setup_definition_created_updated_order" CHECK ("updated_at_utc" >= "created_at_utc"),
  CONSTRAINT "setup_definition_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE TABLE "product_domain"."research_hypothesis" (
  "research_hypothesis_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "hypothesis_status" "product_domain"."research_hypothesis_status" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "assumptions" TEXT[] NOT NULL,
  "notes" TEXT[] NOT NULL,
  "evidence_status" "product_domain"."hypothesis_evidence_status",
  "evidence_summary" TEXT,
  "last_evidence_aggregate_result_id" TEXT,
  "last_evidence_assessed_at" TIMESTAMPTZ(3),
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
  CONSTRAINT "research_hypothesis_pkey" PRIMARY KEY ("research_hypothesis_id"),
  CONSTRAINT "research_hypothesis_version_positive" CHECK ("version" > 0),
  CONSTRAINT "research_hypothesis_assumptions_non_empty" CHECK (cardinality("assumptions") > 0),
  CONSTRAINT "research_hypothesis_created_updated_order" CHECK ("updated_at_utc" >= "created_at_utc"),
  CONSTRAINT "research_hypothesis_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE TABLE "product_domain"."research_hypothesis_setup_definition_link" (
  "research_hypothesis_id" TEXT NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "linked_at_utc" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "research_hypothesis_setup_definition_link_pkey" PRIMARY KEY ("research_hypothesis_id", "setup_definition_id"),
  CONSTRAINT "research_hypothesis_setup_definition_link_research_hypothesis_id_fkey"
    FOREIGN KEY ("research_hypothesis_id")
    REFERENCES "product_domain"."research_hypothesis" ("research_hypothesis_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_hypothesis_setup_definition_link_setup_definition_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX "idx_setup_definition_definition_status"
  ON "product_domain"."setup_definition" ("definition_status");
CREATE INDEX "idx_setup_definition_lifecycle_status"
  ON "product_domain"."setup_definition" ("lifecycle_status");
CREATE INDEX "idx_research_hypothesis_hypothesis_status"
  ON "product_domain"."research_hypothesis" ("hypothesis_status");
CREATE INDEX "idx_research_hypothesis_lifecycle_status"
  ON "product_domain"."research_hypothesis" ("lifecycle_status");
CREATE INDEX "idx_research_hypothesis_link_setup_definition_id"
  ON "product_domain"."research_hypothesis_setup_definition_link" ("setup_definition_id");
