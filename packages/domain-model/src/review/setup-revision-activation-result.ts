import type { SetupRevisionActivationOutcome } from "./setup-revision-activation-status.js";

export const SETUP_REVISION_ACTIVATION_RESULT_STATUSES = [
  "activated",
  "superseded_previous",
  "already_active",
  "rejected",
  "failed"
] as const;

export type SetupRevisionActivationResultStatus =
  (typeof SETUP_REVISION_ACTIVATION_RESULT_STATUSES)[number];

export type SetupRevisionActivationResult = {
  status: SetupRevisionActivationResultStatus;
  setupRevisionActivationRecordId?: string;
  setupFamilyId?: string;
  targetRevisionId?: string;
  targetSetupDefinitionId?: string;
  previousRevisionId?: string;
  previousSetupDefinitionId?: string;
  activationOutcome?: SetupRevisionActivationOutcome;
  reason?: string;
  warnings: string[];
};
