export const DOWNSTREAM_ACTION_TARGETS = [
  "apply_setup_lifecycle_mutation",
  "create_setup_refinement_request",
  "activate_setup_revision",
  "no_op_confirmed"
] as const;

export type DownstreamActionTarget =
  (typeof DOWNSTREAM_ACTION_TARGETS)[number];
