CREATE TYPE "product_domain"."research_decision_approval_status" AS ENUM (
  'recorded'
);

CREATE TYPE "product_domain"."research_decision_approval_outcome" AS ENUM (
  'approved',
  'rejected',
  'needs_changes'
);

CREATE TABLE "product_domain"."research_decision_approval" (
  "research_decision_approval_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "approval_status" "product_domain"."research_decision_approval_status" NOT NULL,
  "research_feedback_decision_id" TEXT NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "reviewed_by" TEXT NOT NULL,
  "reviewed_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "approval_outcome" "product_domain"."research_decision_approval_outcome" NOT NULL,
  "reviewer_notes" TEXT,
  "authorized_next_action" "product_domain"."research_feedback_decision_action",
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
  CONSTRAINT "research_decision_approval_pkey" PRIMARY KEY ("research_decision_approval_id"),
  CONSTRAINT "research_decision_approval_research_feedback_decision_id_fkey"
    FOREIGN KEY ("research_feedback_decision_id")
    REFERENCES "product_domain"."research_feedback_decision" ("research_feedback_decision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_decision_approval_setup_definition_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_decision_approval_version_positive" CHECK ("version" > 0),
  CONSTRAINT "research_decision_approval_reviewed_by_non_empty" CHECK (
    length(trim("reviewed_by")) > 0
  ),
  CONSTRAINT "research_decision_approval_reviewer_notes_non_empty" CHECK (
    "reviewer_notes" IS NULL OR length(trim("reviewer_notes")) > 0
  ),
  CONSTRAINT "research_decision_approval_authorized_action_consistent" CHECK (
    (
      "approval_outcome" = 'approved' AND
      "authorized_next_action" IS NOT NULL
    ) OR (
      "approval_outcome" <> 'approved' AND
      "authorized_next_action" IS NULL
    )
  ),
  CONSTRAINT "research_decision_approval_review_timestamp_consistent" CHECK (
    "created_at_utc" <= "reviewed_at_utc" AND
    "updated_at_utc" >= "reviewed_at_utc"
  ),
  CONSTRAINT "research_decision_approval_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "research_decision_approval_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_research_decision_approval_research_feedback_decision_id"
  ON "product_domain"."research_decision_approval" ("research_feedback_decision_id");
CREATE INDEX "idx_research_decision_approval_setup_definition_id"
  ON "product_domain"."research_decision_approval" ("setup_definition_id");
CREATE INDEX "idx_research_decision_approval_approval_outcome"
  ON "product_domain"."research_decision_approval" ("approval_outcome");
CREATE INDEX "idx_research_decision_approval_authorized_next_action"
  ON "product_domain"."research_decision_approval" ("authorized_next_action");
