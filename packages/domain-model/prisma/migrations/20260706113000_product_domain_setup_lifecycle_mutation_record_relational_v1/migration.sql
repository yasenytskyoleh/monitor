CREATE TYPE "product_domain"."approved_setup_lifecycle_action" AS ENUM (
  'keep_active',
  'pause_setup',
  'archive_setup'
);

CREATE TABLE "product_domain"."setup_lifecycle_mutation_record" (
  "setup_lifecycle_mutation_record_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "setup_definition_id" TEXT NOT NULL,
  "research_decision_approval_id" TEXT NOT NULL,
  "research_feedback_decision_id" TEXT NOT NULL,
  "previous_status" "product_domain"."setup_definition_status" NOT NULL,
  "new_status" "product_domain"."setup_definition_status" NOT NULL,
  "approved_action" "product_domain"."approved_setup_lifecycle_action" NOT NULL,
  "mutated_by" TEXT NOT NULL,
  "mutated_at_utc" TIMESTAMPTZ(3) NOT NULL,
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
  CONSTRAINT "setup_lifecycle_mutation_record_pkey"
    PRIMARY KEY ("setup_lifecycle_mutation_record_id"),
  CONSTRAINT "setup_lifecycle_mutation_record_setup_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_lifecycle_mutation_record_approval_id_fkey"
    FOREIGN KEY ("research_decision_approval_id")
    REFERENCES "product_domain"."research_decision_approval" ("research_decision_approval_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_lifecycle_mutation_record_feedback_id_fkey"
    FOREIGN KEY ("research_feedback_decision_id")
    REFERENCES "product_domain"."research_feedback_decision" ("research_feedback_decision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_lifecycle_mutation_record_version_positive" CHECK ("version" > 0),
  CONSTRAINT "setup_lifecycle_mutation_record_setup_id_non_empty" CHECK (
    length(trim("setup_definition_id")) > 0
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_approval_id_non_empty" CHECK (
    length(trim("research_decision_approval_id")) > 0
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_feedback_id_non_empty" CHECK (
    length(trim("research_feedback_decision_id")) > 0
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_mutated_by_non_empty" CHECK (
    length(trim("mutated_by")) > 0
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_notes_non_empty" CHECK (
    "notes" IS NULL OR length(trim("notes")) > 0
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_action_status_consistent" CHECK (
    (
      "approved_action" = 'keep_active' AND
      "new_status" = 'active'
    ) OR (
      "approved_action" = 'pause_setup' AND
      "new_status" = 'paused'
    ) OR (
      "approved_action" = 'archive_setup' AND
      "new_status" = 'archived'
    )
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_mutated_timestamp_consistent" CHECK (
    "created_at_utc" <= "mutated_at_utc" AND
    "updated_at_utc" >= "mutated_at_utc"
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "setup_lifecycle_mutation_record_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_setup_lifecycle_mutation_record_setup_definition_id"
  ON "product_domain"."setup_lifecycle_mutation_record" ("setup_definition_id");
CREATE INDEX "idx_setup_lifecycle_mutation_record_approval_id"
  ON "product_domain"."setup_lifecycle_mutation_record" ("research_decision_approval_id");
CREATE INDEX "idx_setup_lifecycle_mutation_record_feedback_id"
  ON "product_domain"."setup_lifecycle_mutation_record" ("research_feedback_decision_id");
CREATE INDEX "idx_setup_lifecycle_mutation_record_approved_action"
  ON "product_domain"."setup_lifecycle_mutation_record" ("approved_action");
