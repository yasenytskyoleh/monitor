CREATE TYPE "product_domain"."research_feedback_decision_action" AS ENUM (
  'keep_active',
  'refine_definition',
  'pause_setup',
  'archive_setup',
  'manual_review_required'
);

CREATE TYPE "product_domain"."research_feedback_decision_status" AS ENUM (
  'proposed',
  'reviewed',
  'accepted',
  'rejected'
);

CREATE TABLE "product_domain"."research_feedback_decision" (
  "research_feedback_decision_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "decision_status" "product_domain"."research_feedback_decision_status" NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "research_hypothesis_id" TEXT NOT NULL,
  "setup_aggregate_result_id" TEXT,
  "evidence_status" "product_domain"."hypothesis_evidence_status" NOT NULL,
  "recommended_action" "product_domain"."research_feedback_decision_action" NOT NULL,
  "rationale_summary" TEXT NOT NULL,
  "requires_manual_review" BOOLEAN NOT NULL,
  "evidence_summary" TEXT,
  "reviewer_metadata" JSONB,
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
  CONSTRAINT "research_feedback_decision_pkey" PRIMARY KEY ("research_feedback_decision_id"),
  CONSTRAINT "research_feedback_decision_setup_definition_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_feedback_decision_research_hypothesis_id_fkey"
    FOREIGN KEY ("research_hypothesis_id")
    REFERENCES "product_domain"."research_hypothesis" ("research_hypothesis_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_feedback_decision_setup_aggregate_result_id_fkey"
    FOREIGN KEY ("setup_aggregate_result_id")
    REFERENCES "product_domain"."setup_aggregate_result" ("setup_aggregate_result_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "research_feedback_decision_version_positive" CHECK ("version" > 0),
  CONSTRAINT "research_feedback_decision_rationale_summary_non_empty" CHECK (
    length(trim("rationale_summary")) > 0
  ),
  CONSTRAINT "research_feedback_decision_evidence_summary_non_empty" CHECK (
    "evidence_summary" IS NULL OR length(trim("evidence_summary")) > 0
  ),
  CONSTRAINT "research_feedback_decision_requires_manual_review_true" CHECK (
    "requires_manual_review" = TRUE
  ),
  CONSTRAINT "research_feedback_decision_review_state_metadata_consistent" CHECK (
    (
      "decision_status" = 'proposed' AND
      "reviewer_metadata" IS NULL
    ) OR (
      "decision_status" <> 'proposed' AND
      "reviewer_metadata" IS NOT NULL
    )
  ),
  CONSTRAINT "research_feedback_decision_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "research_feedback_decision_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_research_feedback_decision_setup_definition_id"
  ON "product_domain"."research_feedback_decision" ("setup_definition_id");
CREATE INDEX "idx_research_feedback_decision_research_hypothesis_id"
  ON "product_domain"."research_feedback_decision" ("research_hypothesis_id");
CREATE INDEX "idx_research_feedback_decision_setup_aggregate_result_id"
  ON "product_domain"."research_feedback_decision" ("setup_aggregate_result_id");
CREATE INDEX "idx_research_feedback_decision_decision_status"
  ON "product_domain"."research_feedback_decision" ("decision_status");
CREATE INDEX "idx_research_feedback_decision_recommended_action"
  ON "product_domain"."research_feedback_decision" ("recommended_action");
