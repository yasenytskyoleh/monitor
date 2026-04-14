import type { HypothesisEvidenceStatus } from "../research/research-hypothesis-link.js";
import type {
  ResearchFeedbackDecision,
  ResearchFeedbackDecisionAction
} from "../research/research-feedback-decision.js";

export const FEEDBACK_DECISION_RESULT_STATUSES = [
  "recorded",
  "rejected_validation",
  "rejected_linkage",
  "failed"
] as const;
export type FeedbackDecisionResultStatus =
  (typeof FEEDBACK_DECISION_RESULT_STATUSES)[number];

export type FeedbackDecisionResult = {
  status: FeedbackDecisionResultStatus;
  researchFeedbackDecisionId?: string;
  researchHypothesisId?: string;
  setupDefinitionId?: string;
  setupAggregateResultId?: string;
  evidenceStatus?: HypothesisEvidenceStatus;
  recommendedAction?: ResearchFeedbackDecisionAction;
  decisionStatus?: ResearchFeedbackDecision["decisionStatus"];
  rationaleSummary?: string;
  reason?: string;
  warnings: string[];
};
