import type { TimestampUtc } from "../common.js";
import type { SetupDefinitionVersion } from "./setup-definition-version.js";

export const SETUP_DEFINITION_REVISION_STATUSES = [
  "draft",
  "proposed",
  "accepted",
  "superseded",
  "rejected"
] as const;

export type SetupDefinitionRevisionStatus =
  (typeof SETUP_DEFINITION_REVISION_STATUSES)[number];

export type SetupDefinitionRevision = {
  id: string;
  setupDefinitionId: string;
  previousSetupDefinitionId?: string;
  versionInfo: SetupDefinitionVersion;
  revisionReason: string;
  revisionStatus: SetupDefinitionRevisionStatus;
  changedFieldsSummary: string;
  createdBy: string;
  createdAt: TimestampUtc;
  notes?: string;
  sourceSetupRefinementRequestId: string;
  sourceResearchDecisionApprovalId?: string;
  sourceResearchFeedbackDecisionId?: string;
  updatedAt: TimestampUtc;
};
