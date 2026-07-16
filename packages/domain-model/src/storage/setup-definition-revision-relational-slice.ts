import type { SetupDefinitionRevisionStatus } from "../review/setup-definition-revision.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const SETUP_DEFINITION_REVISION_RELATIONAL_ENTITY_TYPES = [
  "setup_definition_revision"
] as const;
export type SetupDefinitionRevisionRelationalEntityType =
  (typeof SETUP_DEFINITION_REVISION_RELATIONAL_ENTITY_TYPES)[number];

export type SetupDefinitionRevisionDurableRecord =
  DurableRelationalRecordBase<"setup_definition_revision"> & {
    setupDefinitionId: string;
    previousSetupDefinitionId: string | null;
    setupFamilyId: string;
    setupVersionNumber: number;
    previousRevisionId: string | null;
    revisionReason: string;
    revisionStatus: SetupDefinitionRevisionStatus;
    changedFieldsSummary: string;
    createdBy: string;
    notes: string | null;
    sourceSetupRefinementRequestId: string;
    sourceResearchDecisionApprovalId: string | null;
    sourceResearchFeedbackDecisionId: string | null;
  };
