export const APPROVED_SETUP_LIFECYCLE_ACTIONS = [
  "keep_active",
  "pause_setup",
  "archive_setup"
] as const;

export type ApprovedSetupLifecycleAction =
  (typeof APPROVED_SETUP_LIFECYCLE_ACTIONS)[number];
