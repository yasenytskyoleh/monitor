CREATE TYPE "product_domain"."setup_revision_activation_record_outcome" AS ENUM (
  'activated',
  'superseded_previous',
  'already_active'
);

CREATE TABLE "product_domain"."setup_revision_activation_record" (
  "setup_revision_activation_record_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "setup_family_id" TEXT NOT NULL,
  "target_revision_id" TEXT NOT NULL,
  "target_setup_definition_id" TEXT NOT NULL,
  "previous_revision_id" TEXT,
  "previous_setup_definition_id" TEXT,
  "activated_by" TEXT NOT NULL,
  "activated_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "activation_outcome" "product_domain"."setup_revision_activation_record_outcome" NOT NULL,
  "rationale" TEXT,
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
  CONSTRAINT "setup_revision_activation_record_pkey"
    PRIMARY KEY ("setup_revision_activation_record_id"),
  CONSTRAINT "setup_revision_activation_record_target_revision_id_fkey"
    FOREIGN KEY ("target_revision_id")
    REFERENCES "product_domain"."setup_definition_revision" ("setup_definition_revision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_revision_activation_record_target_setup_definition_id_fkey"
    FOREIGN KEY ("target_setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_revision_activation_record_previous_revision_id_fkey"
    FOREIGN KEY ("previous_revision_id")
    REFERENCES "product_domain"."setup_definition_revision" ("setup_definition_revision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_revision_activation_record_previous_setup_definition_id_fkey"
    FOREIGN KEY ("previous_setup_definition_id")
    REFERENCES "product_domain"."setup_definition" ("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "setup_revision_activation_record_version_positive" CHECK ("version" > 0),
  CONSTRAINT "setup_revision_activation_record_setup_family_id_non_empty" CHECK (
    length(trim("setup_family_id")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_target_revision_id_non_empty" CHECK (
    length(trim("target_revision_id")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_target_setup_definition_id_non_empty" CHECK (
    length(trim("target_setup_definition_id")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_previous_revision_id_non_empty" CHECK (
    "previous_revision_id" IS NULL OR length(trim("previous_revision_id")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_previous_setup_definition_id_non_empty" CHECK (
    "previous_setup_definition_id" IS NULL OR
    length(trim("previous_setup_definition_id")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_target_setup_distinct" CHECK (
    "previous_setup_definition_id" IS NULL OR
    "previous_setup_definition_id" <> "target_setup_definition_id"
  ),
  CONSTRAINT "setup_revision_activation_record_target_revision_distinct" CHECK (
    "previous_revision_id" IS NULL OR "previous_revision_id" <> "target_revision_id"
  ),
  CONSTRAINT "setup_revision_activation_record_activated_by_non_empty" CHECK (
    length(trim("activated_by")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_rationale_non_empty" CHECK (
    "rationale" IS NULL OR length(trim("rationale")) > 0
  ),
  CONSTRAINT "setup_revision_activation_record_activation_timestamp_consistent" CHECK (
    "created_at_utc" <= "activated_at_utc" AND
    "updated_at_utc" >= "activated_at_utc"
  ),
  CONSTRAINT "setup_revision_activation_record_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "setup_revision_activation_record_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_setup_revision_activation_record_family_activated_at_utc"
  ON "product_domain"."setup_revision_activation_record" ("setup_family_id", "activated_at_utc");
CREATE INDEX "idx_setup_revision_activation_record_target_revision_id"
  ON "product_domain"."setup_revision_activation_record" ("target_revision_id");
CREATE INDEX "idx_setup_revision_activation_record_activation_outcome"
  ON "product_domain"."setup_revision_activation_record" ("activation_outcome");
