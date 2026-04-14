export const EVALUATION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "expired",
  "invalidated"
] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export const EVALUATION_OUTCOME_SUMMARIES = [
  "up",
  "down",
  "flat",
  "mixed",
  "insufficient_data"
] as const;
export type EvaluationOutcomeSummary = (typeof EVALUATION_OUTCOME_SUMMARIES)[number];
