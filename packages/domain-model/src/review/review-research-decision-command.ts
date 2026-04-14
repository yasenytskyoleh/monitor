import type { TimestampUtc } from "../common.js";
import type { ResearchDecisionApprovalOutcome } from "./approval-outcome.js";

export type ReviewResearchDecisionCommand = {
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  reviewedBy: string;
  reviewedAt: TimestampUtc;
  decisionOutcome: ResearchDecisionApprovalOutcome;
  reviewerNotes?: string;
  originRunId?: string;
};
