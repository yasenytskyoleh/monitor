import type { SetupDefinitionStatus } from "../setup-definition.js";
import type { ApprovedSetupLifecycleAction } from "./setup-lifecycle-action.js";

export const SETUP_LIFECYCLE_MUTATION_RESULT_STATUSES = [
  "applied",
  "rejected_validation",
  "rejected_lifecycle",
  "failed"
] as const;

export type SetupLifecycleMutationResultStatus =
  (typeof SETUP_LIFECYCLE_MUTATION_RESULT_STATUSES)[number];

export type SetupLifecycleMutationResult = {
  status: SetupLifecycleMutationResultStatus;
  setupLifecycleMutationRecordId?: string;
  setupDefinitionId?: string;
  researchDecisionApprovalId?: string;
  researchFeedbackDecisionId?: string;
  approvedAction?: ApprovedSetupLifecycleAction;
  previousStatus?: SetupDefinitionStatus;
  newStatus?: SetupDefinitionStatus;
  reason?: string;
  warnings: string[];
};
