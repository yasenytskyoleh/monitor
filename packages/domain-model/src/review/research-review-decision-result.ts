import type { ResearchReviewAuthorizedNextAction } from "./research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "./research-review-decision-outcome.js";

export const RESEARCH_REVIEW_DECISION_RESULT_STATUSES = [
  "recorded",
  "rejected_validation",
  "rejected_linkage",
  "rejected_lifecycle",
  "failed"
] as const;

export type ResearchReviewDecisionResultStatus =
  (typeof RESEARCH_REVIEW_DECISION_RESULT_STATUSES)[number];

export type ResearchReviewDecisionResult = {
  status: ResearchReviewDecisionResultStatus;
  researchReviewDecisionId?: string;
  researchReviewPacketId?: string;
  setupFamilyId?: string;
  setupRevisionId?: string;
  researchHypothesisId?: string;
  decisionOutcome?: ResearchReviewDecisionOutcome;
  authorizedNextAction?: ResearchReviewAuthorizedNextAction;
  reason?: string;
  warnings: string[];
};
