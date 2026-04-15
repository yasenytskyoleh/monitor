import type { TimestampUtc } from "../common.js";
import type { SetupRevisionActivationOutcome } from "./setup-revision-activation-status.js";

export type SetupRevisionActivationRecord = {
  id: string;
  setupFamilyId: string;
  targetRevisionId: string;
  targetSetupDefinitionId: string;
  previousRevisionId?: string;
  previousSetupDefinitionId?: string;
  activatedBy: string;
  activatedAt: TimestampUtc;
  activationOutcome: Exclude<SetupRevisionActivationOutcome, "rejected">;
  rationale?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
