import type { TimestampUtc } from "../common.js";
import type { ResearchReviewDecisionOutcome } from "./research-review-decision-outcome.js";

export const RESEARCH_REVIEW_AUTHORIZED_NEXT_ACTIONS = [
  "confirm_no_change",
  "prepare_activation_follow_up",
  "prepare_lifecycle_mutation_follow_up",
  "prepare_refinement_follow_up"
] as const;

export type ResearchReviewAuthorizedNextAction =
  (typeof RESEARCH_REVIEW_AUTHORIZED_NEXT_ACTIONS)[number];

export const RESEARCH_REVIEW_DECISION_STATUSES = ["recorded"] as const;
export type ResearchReviewDecisionStatus =
  (typeof RESEARCH_REVIEW_DECISION_STATUSES)[number];

export type ResearchReviewDecision = {
  id: string;
  researchReviewPacketId: string;
  setupFamilyId: string;
  setupRevisionId?: string;
  researchHypothesisId?: string;
  reviewedBy: string;
  reviewedAt: TimestampUtc;
  decisionOutcome: ResearchReviewDecisionOutcome;
  reviewerNotes?: string;
  authorizedNextAction?: ResearchReviewAuthorizedNextAction;
  decisionStatus: ResearchReviewDecisionStatus;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
