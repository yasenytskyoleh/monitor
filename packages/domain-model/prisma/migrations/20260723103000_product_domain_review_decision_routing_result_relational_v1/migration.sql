CREATE TYPE "product_domain"."review_decision_routing_status" AS ENUM (
  'routed',
  'no_action'
);

CREATE TABLE "product_domain"."review_decision_routing_result" (
  "review_decision_routing_result_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "routing_status" "product_domain"."review_decision_routing_status" NOT NULL,
  "research_review_decision_id" TEXT NOT NULL,
  "setup_family_id" TEXT NOT NULL,
  "setup_revision_id" TEXT,
  "decision_outcome" "product_domain"."research_review_decision_outcome" NOT NULL,
  "authorized_next_action" "product_domain"."research_review_authorized_next_action",
  "downstream_target" "product_domain"."downstream_action_target",
  "downstream_command_type" "product_domain"."review_decision_downstream_command_type" NOT NULL,
  "routed_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "reason" TEXT,
  "warnings" JSONB NOT NULL,
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
  CONSTRAINT "review_decision_routing_result_pkey"
    PRIMARY KEY ("review_decision_routing_result_id"),
  CONSTRAINT "review_decision_routing_result_review_decision_id_fkey"
    FOREIGN KEY ("research_review_decision_id")
    REFERENCES "product_domain"."research_review_decision" ("research_review_decision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "review_decision_routing_result_version_positive" CHECK ("version" > 0),
  CONSTRAINT "review_decision_routing_result_review_decision_id_non_empty" CHECK (
    length(trim("research_review_decision_id")) > 0
  ),
  CONSTRAINT "review_decision_routing_result_setup_family_id_non_empty" CHECK (
    length(trim("setup_family_id")) > 0
  ),
  CONSTRAINT "review_decision_routing_result_setup_revision_id_non_empty" CHECK (
    "setup_revision_id" IS NULL OR length(trim("setup_revision_id")) > 0
  ),
  CONSTRAINT "review_decision_routing_result_reason_non_empty" CHECK (
    "reason" IS NULL OR length(trim("reason")) > 0
  ),
  CONSTRAINT "review_decision_routing_result_warnings_array" CHECK (
    jsonb_typeof("warnings") = 'array'
  ),
  CONSTRAINT "review_decision_routing_result_routed_timestamp_consistent" CHECK (
    "created_at_utc" <= "routed_at_utc" AND
    "updated_at_utc" >= "routed_at_utc"
  ),
  CONSTRAINT "review_decision_routing_result_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "review_decision_routing_result_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_review_decision_routing_result_review_decision_id"
  ON "product_domain"."review_decision_routing_result" ("research_review_decision_id");
CREATE INDEX "idx_review_decision_routing_result_family_routed_at_utc"
  ON "product_domain"."review_decision_routing_result" ("setup_family_id", "routed_at_utc");
CREATE INDEX "idx_review_decision_routing_result_routing_status"
  ON "product_domain"."review_decision_routing_result" ("routing_status");
