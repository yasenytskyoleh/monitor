import type { ResearchFeedbackDecisionAction } from "../research/research-feedback-decision.js";
import type { ResearchDecisionApprovalOutcome } from "../review/approval-outcome.js";
import type { ResearchDecisionApprovalStatus } from "../review/research-decision-approval.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const RESEARCH_DECISION_APPROVAL_RELATIONAL_ENTITY_TYPES = [
  "research_decision_approval"
] as const;
export type ResearchDecisionApprovalRelationalEntityType =
  (typeof RESEARCH_DECISION_APPROVAL_RELATIONAL_ENTITY_TYPES)[number];

export type ResearchDecisionApprovalDurableRecord =
  DurableRelationalRecordBase<"research_decision_approval"> & {
    approvalStatus: ResearchDecisionApprovalStatus;
    researchFeedbackDecisionId: string;
    setupDefinitionId: string;
    reviewedBy: string;
    reviewedAtUtc: string;
    approvalOutcome: ResearchDecisionApprovalOutcome;
    reviewerNotes: string | null;
    authorizedNextAction: ResearchFeedbackDecisionAction | null;
  };
