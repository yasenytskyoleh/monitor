LOCK TABLE "product_domain"."execution_attempt_audit" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_domain"."execution_attempt_audit"
    WHERE "routed_action_execution_envelope_id" IS NOT NULL
    GROUP BY "routed_action_execution_envelope_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one execution-attempt audit per prepared envelope while duplicate retained audits exist.';
  END IF;
END $$;

DROP INDEX "product_domain"."idx_execution_attempt_audit_routed_action_execution_envelope_id";

ALTER TABLE "product_domain"."execution_attempt_audit"
  ADD CONSTRAINT "execution_attempt_audit_routed_action_execution_envelope_key"
  UNIQUE ("routed_action_execution_envelope_id");
