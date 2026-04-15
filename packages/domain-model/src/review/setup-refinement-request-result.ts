import type { ResearchFeedbackDecisionAction } from "../research/research-feedback-decision.js";
import type { SetupRefinementStatus } from "./setup-refinement-status.js";

export const SETUP_REFINEMENT_REQUEST_RESULT_STATUSES = [
  "created",
  "rejected_validation",
  "rejected_lifecycle",
  "failed"
] as const;

export type SetupRefinementRequestResultStatus =
  (typeof SETUP_REFINEMENT_REQUEST_RESULT_STATUSES)[number];

export type SetupRefinementRequestResult = {
  status: SetupRefinementRequestResultStatus;
  setupRefinementRequestId?: string;
  setupDefinitionId?: string;
  researchDecisionApprovalId?: string;
  researchFeedbackDecisionId?: string;
  approvedAction?: ResearchFeedbackDecisionAction;
  refinementStatus?: SetupRefinementStatus;
  reason?: string;
  warnings: string[];
};
