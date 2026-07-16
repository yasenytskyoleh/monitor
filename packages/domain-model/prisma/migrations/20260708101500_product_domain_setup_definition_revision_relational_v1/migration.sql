CREATE TYPE "product_domain"."setup_definition_revision_status" AS ENUM (
  'draft',
  'proposed',
  'accepted',
  'superseded',
  'rejected'
);

CREATE TABLE "product_domain"."setup_definition_revision" (
  "setup_definition_revision_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "previous_setup_definition_id" TEXT,
  "setup_family_id" TEXT NOT NULL,
  "setup_version_number" INTEGER NOT NULL,
  "previous_revision_id" TEXT,
  "revision_reason" TEXT NOT NULL,
  "revision_status" "product_domain"."setup_definition_revision_status" NOT NULL,
  "changed_fields_summary" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "notes" TEXT,
  "source_setup_refinement_request_id" TEXT NOT NULL,
  "source_research_decision_approval_id" TEXT,
  "source_research_feedback_decision_id" TEXT,
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
  CONSTRAINT "setup_definition_revision_pkey"
    PRIMARY KEY ("setup_definition_revision_id"),
  CONSTRAINT "uq_setup_definition_revision_setup_definition_id"
    UNIQUE ("setup_definition_id"),
  CONSTRAINT "uq_setup_definition_revision_family_version"
    UNIQUE ("setup_family_id", "setup_version_number"),
  CONSTRAINT "setup_definition_revision_setup_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_definition_revision_previous_setup_id_fkey"
    FOREIGN KEY ("previous_setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_definition_revision_source_refinement_request_id_fkey"
    FOREIGN KEY ("source_setup_refinement_request_id")
    REFERENCES "product_domain"."setup_refinement_request" ("setup_refinement_request_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_definition_revision_source_approval_id_fkey"
    FOREIGN KEY ("source_research_decision_approval_id")
    REFERENCES "product_domain"."research_decision_approval" ("research_decision_approval_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_definition_revision_source_feedback_id_fkey"
    FOREIGN KEY ("source_research_feedback_decision_id")
    REFERENCES "product_domain"."research_feedback_decision" ("research_feedback_decision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_definition_revision_version_positive" CHECK ("version" > 0),
  CONSTRAINT "setup_definition_revision_setup_id_non_empty" CHECK (
    length(trim("setup_definition_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_previous_setup_id_non_empty" CHECK (
    "previous_setup_definition_id" IS NULL OR length(trim("previous_setup_definition_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_setup_linkage_distinct" CHECK (
    "previous_setup_definition_id" IS NULL OR
    "previous_setup_definition_id" <> "setup_definition_id"
  ),
  CONSTRAINT "setup_definition_revision_setup_family_id_non_empty" CHECK (
    length(trim("setup_family_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_setup_version_positive" CHECK (
    "setup_version_number" > 0
  ),
  CONSTRAINT "setup_definition_revision_previous_revision_id_non_empty" CHECK (
    "previous_revision_id" IS NULL OR length(trim("previous_revision_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_revision_reason_non_empty" CHECK (
    length(trim("revision_reason")) > 0
  ),
  CONSTRAINT "setup_definition_revision_changed_fields_non_empty" CHECK (
    length(trim("changed_fields_summary")) > 0
  ),
  CONSTRAINT "setup_definition_revision_created_by_non_empty" CHECK (
    length(trim("created_by")) > 0
  ),
  CONSTRAINT "setup_definition_revision_source_refinement_request_id_non_empty" CHECK (
    length(trim("source_setup_refinement_request_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_source_approval_id_non_empty" CHECK (
    "source_research_decision_approval_id" IS NULL OR
    length(trim("source_research_decision_approval_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_source_feedback_id_non_empty" CHECK (
    "source_research_feedback_decision_id" IS NULL OR
    length(trim("source_research_feedback_decision_id")) > 0
  ),
  CONSTRAINT "setup_definition_revision_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "setup_definition_revision_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_setup_definition_revision_previous_setup_definition_id"
  ON "product_domain"."setup_definition_revision" ("previous_setup_definition_id");
CREATE INDEX "idx_setup_definition_revision_source_refinement_request_id"
  ON "product_domain"."setup_definition_revision" ("source_setup_refinement_request_id");
CREATE INDEX "idx_setup_definition_revision_revision_status"
  ON "product_domain"."setup_definition_revision" ("revision_status");
