import type { TimestampUtc } from "../common.js";
import type { SetupRefinementStatus } from "./setup-refinement-status.js";

export type SetupRefinementRequest = {
  id: string;
  setupDefinitionId: string;
  sourceResearchDecisionApprovalId: string;
  sourceResearchFeedbackDecisionId: string;
  refinementRationaleSummary: string;
  requestedChangesSummary: string;
  evidenceReferences?: string[];
  status: SetupRefinementStatus;
  requestedBy: string;
  requestedAt: TimestampUtc;
  assignedReviewerId?: string;
  assignedOwnerId?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
