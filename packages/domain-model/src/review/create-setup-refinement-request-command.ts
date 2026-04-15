import type { JsonObject, TimestampUtc } from "../common.js";
import type { ResearchFeedbackDecisionAction } from "../research/research-feedback-decision.js";

export type CreateSetupRefinementRequestCommand = {
  researchDecisionApprovalId: string;
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  approvedAction: ResearchFeedbackDecisionAction;
  requestedBy: string;
  requestedAt: TimestampUtc;
  refinementRationaleSummary: string;
  requestedChangesSummary: string;
  evidenceReferences?: string[];
  originRunId?: string;
  sourceMetadata?: JsonObject;
};
