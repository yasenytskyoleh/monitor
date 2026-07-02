export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS = {
  routedActionExecutionEnvelopeRecord: "RoutedActionExecutionEnvelopeRecord"
} as const;
export type RoutedActionExecutionEnvelopeRelationalPrismaModelName =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS)[keyof typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS];

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES = {
  routedActionExecutionEnvelope: "routed_action_execution_envelope"
} as const;
export type RoutedActionExecutionEnvelopeRelationalTableName =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES)[keyof typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES];

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_REQUIRED_COLUMNS = {
  routed_action_execution_envelope: [
    "routed_action_execution_envelope_id",
    "version",
    "lifecycle_status",
    "execution_status",
    "source_routing_result_id",
    "source_review_decision_id",
    "action_target",
    "action_command_type",
    "target_entity_refs",
    "route_metadata_snapshot",
    "execution_payload_snapshot",
    "prepared_by",
    "prepared_at_utc",
    "envelope_origin_run_id",
    "notes",
    "origin_run_id",
    "origin_transition_id",
    "created_by_source",
    "last_updated_by_source",
    "trace_id",
    "source_observed_at_utc",
    "metadata_notes",
    "created_at_utc",
    "updated_at_utc",
    "archived_at_utc"
  ]
} as const;

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_INDEXES = [
  "idx_routed_action_execution_envelope_source_routing_result_id",
  "idx_routed_action_execution_envelope_source_review_decision_id",
  "idx_routed_action_execution_envelope_execution_status",
  "idx_routed_action_execution_envelope_action_target",
  "idx_routed_action_execution_envelope_action_command_type"
] as const;
export type RoutedActionExecutionEnvelopeRelationalIndexName =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_INDEXES)[number];

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_MIGRATION_SLUG =
  "product_domain_routed_action_execution_envelope_relational_v1" as const;
