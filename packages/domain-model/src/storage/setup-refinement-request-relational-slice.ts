import type { SetupRefinementStatus } from "../review/setup-refinement-status.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const SETUP_REFINEMENT_REQUEST_RELATIONAL_ENTITY_TYPES = [
  "setup_refinement_request"
] as const;
export type SetupRefinementRequestRelationalEntityType =
  (typeof SETUP_REFINEMENT_REQUEST_RELATIONAL_ENTITY_TYPES)[number];

export type SetupRefinementRequestDurableRecord =
  DurableRelationalRecordBase<"setup_refinement_request"> & {
    setupDefinitionId: string;
    sourceResearchDecisionApprovalId: string;
    sourceResearchFeedbackDecisionId: string;
    refinementStatus: SetupRefinementStatus;
    refinementRationaleSummary: string;
    requestedChangesSummary: string;
    evidenceReferences: string[];
    requestedBy: string;
    requestedAtUtc: string;
    assignedReviewerId: string | null;
    assignedOwnerId: string | null;
  };
