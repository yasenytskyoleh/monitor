export const EVALUATION_TRIGGER_STATUSES = [
  "started",
  "rejected_validation",
  "rejected_lifecycle",
  "rejected_duplicate",
  "failed"
] as const;
export type EvaluationTriggerStatus = (typeof EVALUATION_TRIGGER_STATUSES)[number];

export type EvaluationTriggerResult = {
  status: EvaluationTriggerStatus;
  evaluationResultId?: string;
  evaluationWindowId?: string;
  reason?: string;
  warnings: string[];
};
