import type { TimestampUtc } from "../common.js";
import type { ResearchFeedbackDecisionAction } from "../research/research-feedback-decision.js";
import type { ResearchDecisionApprovalOutcome } from "./approval-outcome.js";

export const RESEARCH_DECISION_APPROVAL_STATUSES = ["recorded"] as const;
export type ResearchDecisionApprovalStatus =
  (typeof RESEARCH_DECISION_APPROVAL_STATUSES)[number];

export type ResearchDecisionApproval = {
  id: string;
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  reviewedBy: string;
  reviewedAt: TimestampUtc;
  approvalOutcome: ResearchDecisionApprovalOutcome;
  reviewerNotes?: string;
  approvalStatus: ResearchDecisionApprovalStatus;
  authorizedNextAction?: ResearchFeedbackDecisionAction;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
