import type { JsonObject } from "../common.js";
import type {
  ResearchFeedbackDecisionAction,
  ResearchFeedbackDecisionStatus
} from "../research/research-feedback-decision.js";
import type { HypothesisEvidenceStatus } from "../research/research-hypothesis-link.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const RESEARCH_FEEDBACK_DECISION_RELATIONAL_ENTITY_TYPES = [
  "research_feedback_decision"
] as const;
export type ResearchFeedbackDecisionRelationalEntityType =
  (typeof RESEARCH_FEEDBACK_DECISION_RELATIONAL_ENTITY_TYPES)[number];

export type ResearchFeedbackDecisionDurableRecord =
  DurableRelationalRecordBase<"research_feedback_decision"> & {
    decisionStatus: ResearchFeedbackDecisionStatus;
    setupDefinitionId: string;
    researchHypothesisId: string;
    setupAggregateResultId: string | null;
    evidenceStatus: HypothesisEvidenceStatus;
    recommendedAction: ResearchFeedbackDecisionAction;
    rationaleSummary: string;
    requiresManualReview: boolean;
    evidenceSummary: string | null;
    reviewerMetadata: JsonObject | null;
  };
