CREATE TYPE "product_domain"."research_review_authorized_next_action" AS ENUM (
  'confirm_no_change',
  'prepare_activation_follow_up',
  'prepare_lifecycle_mutation_follow_up',
  'prepare_refinement_follow_up'
);

CREATE TYPE "product_domain"."research_review_decision_status" AS ENUM (
  'recorded'
);

CREATE TYPE "product_domain"."research_review_decision_outcome" AS ENUM (
  'accepted',
  'rejected',
  'revise'
);

CREATE TABLE "product_domain"."research_review_decision" (
  "research_review_decision_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "decision_status" "product_domain"."research_review_decision_status" NOT NULL,
  "research_review_packet_id" TEXT NOT NULL,
  "setup_family_id" TEXT NOT NULL,
  "setup_revision_id" TEXT,
  "research_hypothesis_id" TEXT,
  "reviewed_by" TEXT NOT NULL,
  "reviewed_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "decision_outcome" "product_domain"."research_review_decision_outcome" NOT NULL,
  "reviewer_notes" TEXT,
  "authorized_next_action" "product_domain"."research_review_authorized_next_action",
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
  CONSTRAINT "research_review_decision_pkey" PRIMARY KEY ("research_review_decision_id"),
  CONSTRAINT "research_review_decision_research_hypothesis_id_fkey"
    FOREIGN KEY ("research_hypothesis_id")
    REFERENCES "product_domain"."research_hypothesis" ("research_hypothesis_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_review_decision_version_positive" CHECK ("version" > 0),
  CONSTRAINT "research_review_decision_packet_id_non_empty" CHECK (
    length(trim("research_review_packet_id")) > 0
  ),
  CONSTRAINT "research_review_decision_setup_family_id_non_empty" CHECK (
    length(trim("setup_family_id")) > 0
  ),
  CONSTRAINT "research_review_decision_setup_revision_id_non_empty" CHECK (
    "setup_revision_id" IS NULL OR length(trim("setup_revision_id")) > 0
  ),
  CONSTRAINT "research_review_decision_research_hypothesis_id_non_empty" CHECK (
    "research_hypothesis_id" IS NULL OR length(trim("research_hypothesis_id")) > 0
  ),
  CONSTRAINT "research_review_decision_reviewed_by_non_empty" CHECK (
    length(trim("reviewed_by")) > 0
  ),
  CONSTRAINT "research_review_decision_reviewer_notes_non_empty" CHECK (
    "reviewer_notes" IS NULL OR length(trim("reviewer_notes")) > 0
  ),
  CONSTRAINT "research_review_decision_authorized_action_consistent" CHECK (
    (
      "decision_outcome" = 'accepted' AND
      "authorized_next_action" IS NOT NULL
    ) OR (
      "decision_outcome" = 'rejected' AND
      "authorized_next_action" IS NULL
    ) OR (
      "decision_outcome" = 'revise' AND
      "authorized_next_action" = 'prepare_refinement_follow_up'
    )
  ),
  CONSTRAINT "research_review_decision_review_timestamp_consistent" CHECK (
    "created_at_utc" <= "reviewed_at_utc" AND
    "updated_at_utc" >= "reviewed_at_utc"
  ),
  CONSTRAINT "research_review_decision_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "research_review_decision_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_research_review_decision_review_packet_id"
  ON "product_domain"."research_review_decision" ("research_review_packet_id");
CREATE INDEX "idx_research_review_decision_setup_family_id"
  ON "product_domain"."research_review_decision" ("setup_family_id");
CREATE INDEX "idx_research_review_decision_setup_revision_id"
  ON "product_domain"."research_review_decision" ("setup_revision_id");
CREATE INDEX "idx_research_review_decision_research_hypothesis_id"
  ON "product_domain"."research_review_decision" ("research_hypothesis_id");
CREATE INDEX "idx_research_review_decision_decision_outcome"
  ON "product_domain"."research_review_decision" ("decision_outcome");
CREATE INDEX "idx_research_review_decision_authorized_next_action"
  ON "product_domain"."research_review_decision" ("authorized_next_action");
