DROP INDEX "product_domain"."idx_execution_attempt_audit_routed_action_execution_envelope_id";

ALTER TABLE "product_domain"."execution_attempt_audit"
  ADD CONSTRAINT "execution_attempt_audit_routed_action_execution_envelope_key"
  UNIQUE ("routed_action_execution_envelope_id");
