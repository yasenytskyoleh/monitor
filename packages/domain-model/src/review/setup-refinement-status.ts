export const SETUP_REFINEMENT_STATUSES = [
  "proposed",
  "accepted",
  "in_progress",
  "completed",
  "rejected"
] as const;

export type SetupRefinementStatus = (typeof SETUP_REFINEMENT_STATUSES)[number];
