export const RESEARCH_REVIEW_DECISION_OUTCOMES = [
  "accepted",
  "rejected",
  "revise"
] as const;

export type ResearchReviewDecisionOutcome =
  (typeof RESEARCH_REVIEW_DECISION_OUTCOMES)[number];
