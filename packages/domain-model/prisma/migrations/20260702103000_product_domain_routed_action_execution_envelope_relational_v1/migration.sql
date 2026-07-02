CREATE TYPE "product_domain"."downstream_action_target" AS ENUM (
  'apply_setup_lifecycle_mutation',
  'create_setup_refinement_request',
  'activate_setup_revision',
  'no_op_confirmed'
);

CREATE TYPE "product_domain"."review_decision_downstream_command_type" AS ENUM (
  'ApplyApprovedSetupMutationCommand',
  'CreateSetupRefinementRequestCommand',
  'ActivateSetupDefinitionRevisionCommand',
  'NoOpConfirmed',
  'None'
);

CREATE TYPE "product_domain"."routed_action_execution_status" AS ENUM (
  'prepared',
  'ready',
  'cancelled',
  'failed'
);

CREATE TABLE "product_domain"."routed_action_execution_envelope" (
  "routed_action_execution_envelope_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lifecycle_status" "product_domain"."persisted_lifecycle_status" NOT NULL,
  "execution_status" "product_domain"."routed_action_execution_status" NOT NULL,
  "source_routing_result_id" TEXT NOT NULL,
  "source_review_decision_id" TEXT NOT NULL,
  "action_target" "product_domain"."downstream_action_target" NOT NULL,
  "action_command_type" "product_domain"."review_decision_downstream_command_type" NOT NULL,
  "target_entity_refs" JSONB NOT NULL,
  "route_metadata_snapshot" JSONB NOT NULL,
  "execution_payload_snapshot" JSONB NOT NULL,
  "prepared_by" TEXT NOT NULL,
  "prepared_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "envelope_origin_run_id" TEXT,
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
  CONSTRAINT "routed_action_execution_envelope_pkey" PRIMARY KEY ("routed_action_execution_envelope_id"),
  CONSTRAINT "routed_action_execution_envelope_source_review_decision_id_fkey"
    FOREIGN KEY ("source_review_decision_id")
    REFERENCES "product_domain"."research_review_decision" ("research_review_decision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "routed_action_execution_envelope_version_positive" CHECK ("version" > 0),
  CONSTRAINT "routed_action_execution_envelope_source_routing_result_id_non_empty" CHECK (
    length(trim("source_routing_result_id")) > 0
  ),
  CONSTRAINT "routed_action_execution_envelope_source_review_decision_id_non_empty" CHECK (
    length(trim("source_review_decision_id")) > 0
  ),
  CONSTRAINT "routed_action_execution_envelope_prepared_by_non_empty" CHECK (
    length(trim("prepared_by")) > 0
  ),
  CONSTRAINT "routed_action_execution_envelope_envelope_origin_run_id_non_empty" CHECK (
    "envelope_origin_run_id" IS NULL OR length(trim("envelope_origin_run_id")) > 0
  ),
  CONSTRAINT "routed_action_execution_envelope_notes_non_empty" CHECK (
    "notes" IS NULL OR length(trim("notes")) > 0
  ),
  CONSTRAINT "routed_action_execution_envelope_target_entity_refs_object" CHECK (
    jsonb_typeof("target_entity_refs") = 'object'
  ),
  CONSTRAINT "routed_action_execution_envelope_route_metadata_snapshot_object" CHECK (
    jsonb_typeof("route_metadata_snapshot") = 'object'
  ),
  CONSTRAINT "routed_action_execution_envelope_execution_payload_snapshot_object" CHECK (
    jsonb_typeof("execution_payload_snapshot") = 'object'
  ),
  CONSTRAINT "routed_action_execution_envelope_setup_family_required" CHECK (
    length(trim(COALESCE("target_entity_refs"->>'setupFamilyId', ''))) > 0
  ),
  CONSTRAINT "routed_action_execution_envelope_target_command_consistent" CHECK (
    (
      "action_target" = 'apply_setup_lifecycle_mutation' AND
      "action_command_type" = 'ApplyApprovedSetupMutationCommand' AND
      length(trim(COALESCE("target_entity_refs"->>'setupDefinitionId', ''))) > 0 AND
      "execution_payload_snapshot"->>'commandType' = 'ApplyApprovedSetupMutationCommand' AND
      "execution_payload_snapshot"->>'target' = 'apply_setup_lifecycle_mutation'
    ) OR (
      "action_target" = 'create_setup_refinement_request' AND
      "action_command_type" = 'CreateSetupRefinementRequestCommand' AND
      length(trim(COALESCE("target_entity_refs"->>'setupDefinitionId', ''))) > 0 AND
      "execution_payload_snapshot"->>'commandType' = 'CreateSetupRefinementRequestCommand' AND
      "execution_payload_snapshot"->>'target' = 'create_setup_refinement_request'
    ) OR (
      "action_target" = 'activate_setup_revision' AND
      "action_command_type" = 'ActivateSetupDefinitionRevisionCommand' AND
      length(trim(COALESCE("target_entity_refs"->>'setupRevisionId', ''))) > 0 AND
      "execution_payload_snapshot"->>'commandType' = 'ActivateSetupDefinitionRevisionCommand' AND
      "execution_payload_snapshot"->>'target' = 'activate_setup_revision'
    )
  ),
  CONSTRAINT "routed_action_execution_envelope_prepared_timestamp_consistent" CHECK (
    "created_at_utc" <= "prepared_at_utc" AND
    "updated_at_utc" >= "prepared_at_utc"
  ),
  CONSTRAINT "routed_action_execution_envelope_created_updated_order" CHECK (
    "updated_at_utc" >= "created_at_utc"
  ),
  CONSTRAINT "routed_action_execution_envelope_archived_timestamp_consistent" CHECK (
    ("lifecycle_status" = 'active' AND "archived_at_utc" IS NULL) OR
    ("lifecycle_status" = 'archived' AND "archived_at_utc" IS NOT NULL)
  )
);

CREATE INDEX "idx_routed_action_execution_envelope_source_routing_result_id"
  ON "product_domain"."routed_action_execution_envelope" ("source_routing_result_id");
CREATE INDEX "idx_routed_action_execution_envelope_source_review_decision_id"
  ON "product_domain"."routed_action_execution_envelope" ("source_review_decision_id");
CREATE INDEX "idx_routed_action_execution_envelope_execution_status"
  ON "product_domain"."routed_action_execution_envelope" ("execution_status");
CREATE INDEX "idx_routed_action_execution_envelope_action_target"
  ON "product_domain"."routed_action_execution_envelope" ("action_target");
CREATE INDEX "idx_routed_action_execution_envelope_action_command_type"
  ON "product_domain"."routed_action_execution_envelope" ("action_command_type");
