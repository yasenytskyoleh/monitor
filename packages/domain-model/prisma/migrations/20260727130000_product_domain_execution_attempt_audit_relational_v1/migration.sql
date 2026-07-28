CREATE TYPE "product_domain"."execution_attempt_audit_status" AS ENUM (
  'received',
  'executed',
  'rejected',
  'failed'
);

CREATE TABLE "product_domain"."execution_attempt_audit" (
  "execution_attempt_audit_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "execution_attempt_audit_status" "product_domain"."execution_attempt_audit_status" NOT NULL,
  "routed_action_execution_envelope_id" TEXT,
  "review_decision_routing_result_id" TEXT,
  "research_review_decision_id" TEXT,
  "action_target" "product_domain"."downstream_action_target" NOT NULL,
  "downstream_command_type" "product_domain"."review_decision_downstream_command_type" NOT NULL,
  "attempted_by" TEXT NOT NULL,
  "attempted_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "completed_at_utc" TIMESTAMPTZ(3),
  "outcome_code" TEXT,
  "outcome_summary" TEXT,
  "warning_codes" JSONB NOT NULL,
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
  CONSTRAINT "execution_attempt_audit_pkey" PRIMARY KEY ("execution_attempt_audit_id"),
  CONSTRAINT "execution_attempt_audit_version_positive" CHECK ("version" > 0),
  CONSTRAINT "execution_attempt_audit_attempted_by_non_empty" CHECK (length(trim("attempted_by")) > 0),
  CONSTRAINT "execution_attempt_audit_optional_refs_non_empty" CHECK (
    ("routed_action_execution_envelope_id" IS NULL OR length(trim("routed_action_execution_envelope_id")) > 0) AND
    ("review_decision_routing_result_id" IS NULL OR length(trim("review_decision_routing_result_id")) > 0) AND
    ("research_review_decision_id" IS NULL OR length(trim("research_review_decision_id")) > 0)
  ),
  CONSTRAINT "execution_attempt_audit_outcome_fields_non_empty" CHECK (
    ("outcome_code" IS NULL OR length(trim("outcome_code")) > 0) AND
    ("outcome_summary" IS NULL OR length(trim("outcome_summary")) > 0)
  ),
  CONSTRAINT "execution_attempt_audit_warning_codes_array" CHECK (jsonb_typeof("warning_codes") = 'array'),
  CONSTRAINT "execution_attempt_audit_terminal_evidence_consistent" CHECK (
    ("execution_attempt_audit_status" = 'received' AND "completed_at_utc" IS NULL AND "outcome_code" IS NULL AND "outcome_summary" IS NULL) OR
    ("execution_attempt_audit_status" IN ('executed', 'rejected', 'failed') AND "completed_at_utc" IS NOT NULL AND "outcome_code" IS NOT NULL)
  ),
  CONSTRAINT "execution_attempt_audit_timestamp_consistent" CHECK (
    "created_at_utc" <= "attempted_at_utc" AND
    "updated_at_utc" >= "attempted_at_utc" AND
    ("completed_at_utc" IS NULL OR "completed_at_utc" >= "attempted_at_utc") AND
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "execution_attempt_audit_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_execution_attempt_audit_routed_action_execution_envelope_id"
  ON "product_domain"."execution_attempt_audit" ("routed_action_execution_envelope_id");
CREATE INDEX "idx_execution_attempt_audit_review_decision_routing_result_id"
  ON "product_domain"."execution_attempt_audit" ("review_decision_routing_result_id");
CREATE INDEX "idx_execution_attempt_audit_research_review_decision_id"
  ON "product_domain"."execution_attempt_audit" ("research_review_decision_id");
CREATE INDEX "idx_execution_attempt_audit_status"
  ON "product_domain"."execution_attempt_audit" ("execution_attempt_audit_status");
CREATE INDEX "idx_execution_attempt_audit_action_target"
  ON "product_domain"."execution_attempt_audit" ("action_target");
