import type { JsonObject, TimestampUtc } from "../common.js";
import type { HypothesisEvidenceStatus } from "./research-hypothesis-link.js";

export const RESEARCH_FEEDBACK_DECISION_ACTIONS = [
  "keep_active",
  "refine_definition",
  "pause_setup",
  "archive_setup",
  "manual_review_required"
] as const;
export type ResearchFeedbackDecisionAction =
  (typeof RESEARCH_FEEDBACK_DECISION_ACTIONS)[number];

export const RESEARCH_FEEDBACK_DECISION_STATUSES = [
  "proposed",
  "reviewed",
  "accepted",
  "rejected"
] as const;
export type ResearchFeedbackDecisionStatus =
  (typeof RESEARCH_FEEDBACK_DECISION_STATUSES)[number];

export type ResearchFeedbackDecision = {
  id: string;
  setupDefinitionId: string;
  researchHypothesisId: string;
  setupAggregateResultId?: string;
  evidenceStatus: HypothesisEvidenceStatus;
  recommendedAction: ResearchFeedbackDecisionAction;
  rationaleSummary: string;
  decisionStatus: ResearchFeedbackDecisionStatus;
  requiresManualReview: boolean;
  evidenceSummary?: string;
  reviewerMetadata?: JsonObject;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
