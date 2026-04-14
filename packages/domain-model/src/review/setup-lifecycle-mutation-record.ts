import type { TimestampUtc } from "../common.js";
import type { SetupDefinitionStatus } from "../setup-definition.js";
import type { ApprovedSetupLifecycleAction } from "./setup-lifecycle-action.js";

export type SetupLifecycleMutationRecord = {
  id: string;
  setupDefinitionId: string;
  researchDecisionApprovalId: string;
  researchFeedbackDecisionId: string;
  previousStatus: SetupDefinitionStatus;
  newStatus: SetupDefinitionStatus;
  approvedAction: ApprovedSetupLifecycleAction;
  mutatedBy: string;
  mutatedAt: TimestampUtc;
  notes?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
