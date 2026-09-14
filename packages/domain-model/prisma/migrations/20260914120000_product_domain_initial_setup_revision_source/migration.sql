ALTER TABLE "product_domain"."setup_definition_revision"
  ALTER COLUMN "source_setup_refinement_request_id" DROP NOT NULL;

ALTER TABLE "product_domain"."setup_definition_revision"
  ADD CONSTRAINT "chk_setup_definition_revision_refinement_source_after_initial"
  CHECK (
    "setup_version_number" = 1 OR
    "source_setup_refinement_request_id" IS NOT NULL
  );
