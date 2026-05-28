import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type RecordFeedbackDecisionApprovalRequest = {
  researchFeedbackDecisionId: string;
  nextDecisionStatus: ResearchFeedbackDecision["decisionStatus"];
  reviewerMetadata: NonNullable<ResearchFeedbackDecision["reviewerMetadata"]>;
  approval: ResearchDecisionApproval;
  metadata: ProductRecordMetadata;
};

export type FeedbackDecisionApprovalReviewPersistenceResult =
  | {
      status: "recorded";
      decision: ResearchFeedbackDecision;
      approval: ResearchDecisionApproval;
    }
  | {
      status: "not_found";
    }
  | {
      status: "conflict";
      currentDecision: ResearchFeedbackDecision;
    };

export type FeedbackDecisionApprovalReviewPersistence = {
  recordFeedbackDecisionApproval(
    request: RecordFeedbackDecisionApprovalRequest
  ): Promise<FeedbackDecisionApprovalReviewPersistenceResult>;
};
