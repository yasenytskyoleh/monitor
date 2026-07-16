CREATE TYPE "product_domain"."setup_refinement_status" AS ENUM (
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'rejected'
);

CREATE TABLE "product_domain"."setup_refinement_request" (
  "setup_refinement_request_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "source_research_decision_approval_id" TEXT NOT NULL,
  "source_research_feedback_decision_id" TEXT NOT NULL,
  "refinement_status" "product_domain"."setup_refinement_status" NOT NULL,
  "refinement_rationale_summary" TEXT NOT NULL,
  "requested_changes_summary" TEXT NOT NULL,
  "evidence_references" TEXT[] NOT NULL,
  "requested_by" TEXT NOT NULL,
  "requested_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "assigned_reviewer_id" TEXT,
  "assigned_owner_id" TEXT,
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
  CONSTRAINT "setup_refinement_request_pkey"
    PRIMARY KEY ("setup_refinement_request_id"),
  CONSTRAINT "setup_refinement_request_setup_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_refinement_request_approval_id_fkey"
    FOREIGN KEY ("source_research_decision_approval_id")
    REFERENCES "product_domain"."research_decision_approval" ("research_decision_approval_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_refinement_request_feedback_id_fkey"
    FOREIGN KEY ("source_research_feedback_decision_id")
    REFERENCES "product_domain"."research_feedback_decision" ("research_feedback_decision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_refinement_request_version_positive" CHECK ("version" > 0),
  CONSTRAINT "setup_refinement_request_setup_id_non_empty" CHECK (
    length(trim("setup_definition_id")) > 0
  ),
  CONSTRAINT "setup_refinement_request_approval_id_non_empty" CHECK (
    length(trim("source_research_decision_approval_id")) > 0
  ),
  CONSTRAINT "setup_refinement_request_feedback_id_non_empty" CHECK (
    length(trim("source_research_feedback_decision_id")) > 0
  ),
  CONSTRAINT "setup_refinement_request_rationale_non_empty" CHECK (
    length(trim("refinement_rationale_summary")) > 0
  ),
  CONSTRAINT "setup_refinement_request_requested_changes_non_empty" CHECK (
    length(trim("requested_changes_summary")) > 0
  ),
  CONSTRAINT "setup_refinement_request_requested_by_non_empty" CHECK (
    length(trim("requested_by")) > 0
  ),
  CONSTRAINT "setup_refinement_request_assigned_reviewer_non_empty" CHECK (
    "assigned_reviewer_id" IS NULL OR length(trim("assigned_reviewer_id")) > 0
  ),
  CONSTRAINT "setup_refinement_request_assigned_owner_non_empty" CHECK (
    "assigned_owner_id" IS NULL OR length(trim("assigned_owner_id")) > 0
  ),
  CONSTRAINT "setup_refinement_request_requested_timestamp_consistent" CHECK (
    "created_at_utc" <= "requested_at_utc" AND
    "updated_at_utc" >= "requested_at_utc"
  ),
  CONSTRAINT "setup_refinement_request_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "setup_refinement_request_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_setup_refinement_request_setup_definition_id"
  ON "product_domain"."setup_refinement_request" ("setup_definition_id");
CREATE INDEX "idx_setup_refinement_request_approval_id"
  ON "product_domain"."setup_refinement_request" ("source_research_decision_approval_id");
CREATE INDEX "idx_setup_refinement_request_feedback_id"
  ON "product_domain"."setup_refinement_request" ("source_research_feedback_decision_id");
CREATE INDEX "idx_setup_refinement_request_refinement_status"
  ON "product_domain"."setup_refinement_request" ("refinement_status");
