import type { TimestampUtc } from "../common.js";
import type { ApprovedSetupLifecycleAction } from "./setup-lifecycle-action.js";

export type ApplyApprovedSetupMutationCommand = {
  researchDecisionApprovalId: string;
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  approvedAction: ApprovedSetupLifecycleAction;
  mutatedBy: string;
  mutatedAt: TimestampUtc;
  notes?: string;
  originRunId?: string;
};
