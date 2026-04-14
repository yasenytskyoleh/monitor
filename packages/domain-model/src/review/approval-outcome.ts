export const RESEARCH_DECISION_APPROVAL_OUTCOMES = [
  "approved",
  "rejected",
  "needs_changes"
] as const;

export type ResearchDecisionApprovalOutcome =
  (typeof RESEARCH_DECISION_APPROVAL_OUTCOMES)[number];
