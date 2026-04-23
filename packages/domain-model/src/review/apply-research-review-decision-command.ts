import type { TimestampUtc } from "../common.js";
import type { ResearchReviewAuthorizedNextAction } from "./research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "./research-review-decision-outcome.js";

export type ApplyResearchReviewDecisionCommand = {
  researchReviewPacketId: string;
  setupFamilyId: string;
  setupRevisionId?: string;
  researchHypothesisId?: string;
  reviewedBy: string;
  reviewedAt: TimestampUtc;
  decisionOutcome: ResearchReviewDecisionOutcome;
  reviewerNotes?: string;
  authorizedNextAction?: ResearchReviewAuthorizedNextAction;
  originRunId?: string;
};
