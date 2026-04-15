import type { TimestampUtc } from "../common.js";

export type ActivateSetupDefinitionRevisionCommand = {
  setupDefinitionId?: string;
  setupFamilyId?: string;
  targetRevisionId: string;
  activatedBy: string;
  activatedAt: TimestampUtc;
  rationale?: string;
  previousActiveRevisionId?: string;
  originRunId?: string;
};
