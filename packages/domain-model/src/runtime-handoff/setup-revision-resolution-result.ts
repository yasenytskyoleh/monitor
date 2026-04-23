import type { ActiveSetupRevisionResolution } from "./active-setup-revision-resolution.js";

export const SETUP_REVISION_RESOLUTION_STATUSES = ["resolved", "rejected", "failed"] as const;

export type SetupRevisionResolutionStatus =
  (typeof SETUP_REVISION_RESOLUTION_STATUSES)[number];

export type SetupRevisionResolutionResult = {
  status: SetupRevisionResolutionStatus;
  resolution?: ActiveSetupRevisionResolution;
  reason?: string;
  warnings: string[];
};
