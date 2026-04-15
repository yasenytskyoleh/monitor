export const SETUP_REVISION_ACTIVATION_OUTCOMES = [
  "activated",
  "superseded_previous",
  "already_active",
  "rejected"
] as const;

export type SetupRevisionActivationOutcome =
  (typeof SETUP_REVISION_ACTIVATION_OUTCOMES)[number];
