import type {
  ResearchFeedbackDecision,
  ResearchFeedbackDecisionAction
} from "../research/research-feedback-decision.js";
import type { ResearchDecisionApprovalOutcome } from "./approval-outcome.js";

export const RESEARCH_DECISION_APPROVAL_RESULT_STATUSES = [
  "recorded",
  "rejected_validation",
  "rejected_lifecycle",
  "failed"
] as const;

export type ResearchDecisionApprovalResultStatus =
  (typeof RESEARCH_DECISION_APPROVAL_RESULT_STATUSES)[number];

export type ResearchDecisionApprovalResult = {
  status: ResearchDecisionApprovalResultStatus;
  researchDecisionApprovalId?: string;
  researchFeedbackDecisionId?: string;
  setupDefinitionId?: string;
  approvalOutcome?: ResearchDecisionApprovalOutcome;
  decisionStatus?: ResearchFeedbackDecision["decisionStatus"];
  authorizedNextAction?: ResearchFeedbackDecisionAction;
  reason?: string;
  warnings: string[];
};
