import type {
  ResearchReviewAuthorizedNextAction,
  ResearchReviewDecisionStatus
} from "../review/research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "../review/research-review-decision-outcome.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const RESEARCH_REVIEW_DECISION_RELATIONAL_ENTITY_TYPES = [
  "research_review_decision"
] as const;
export type ResearchReviewDecisionRelationalEntityType =
  (typeof RESEARCH_REVIEW_DECISION_RELATIONAL_ENTITY_TYPES)[number];

export type ResearchReviewDecisionDurableRecord =
  DurableRelationalRecordBase<"research_review_decision"> & {
    decisionStatus: ResearchReviewDecisionStatus;
    researchReviewPacketId: string;
    setupFamilyId: string;
    setupRevisionId: string | null;
    researchHypothesisId: string | null;
    reviewedBy: string;
    reviewedAtUtc: string;
    decisionOutcome: ResearchReviewDecisionOutcome;
    reviewerNotes: string | null;
    authorizedNextAction: ResearchReviewAuthorizedNextAction | null;
  };
