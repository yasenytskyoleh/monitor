import type { SetupDefinitionVersion } from "./setup-definition-version.js";
import type { SetupDefinitionRevisionStatus } from "./setup-definition-revision.js";

export const SETUP_DEFINITION_REVISION_RESULT_STATUSES = [
  "created",
  "rejected_validation",
  "rejected_linkage",
  "failed"
] as const;

export type SetupDefinitionRevisionResultStatus =
  (typeof SETUP_DEFINITION_REVISION_RESULT_STATUSES)[number];

export type SetupDefinitionRevisionResult = {
  status: SetupDefinitionRevisionResultStatus;
  setupDefinitionRevisionId?: string;
  previousSetupDefinitionId?: string;
  newSetupDefinitionId?: string;
  setupRefinementRequestId?: string;
  setupFamilyId?: string;
  version?: number;
  versionInfo?: SetupDefinitionVersion;
  revisionStatus?: SetupDefinitionRevisionStatus;
  reason?: string;
  warnings: string[];
};
