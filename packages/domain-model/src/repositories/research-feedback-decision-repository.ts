import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type ResearchFeedbackDecisionCreateRequest = {
  decision: ResearchFeedbackDecision;
  metadata: ProductRecordMetadata;
};

export type ResearchFeedbackDecisionStatusUpdateRequest = {
  researchFeedbackDecisionId: string;
  status: ResearchFeedbackDecision["decisionStatus"];
  reviewerMetadata?: ResearchFeedbackDecision["reviewerMetadata"];
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ResearchFeedbackDecisionRepository = {
  getById(researchFeedbackDecisionId: string): Promise<ResearchFeedbackDecision | null>;
  listBySetupDefinitionId(setupDefinitionId: string): Promise<ResearchFeedbackDecision[]>;
  listByResearchHypothesisId(researchHypothesisId: string): Promise<ResearchFeedbackDecision[]>;
  create(request: ResearchFeedbackDecisionCreateRequest): Promise<ResearchFeedbackDecision>;
  updateStatus(
    request: ResearchFeedbackDecisionStatusUpdateRequest
  ): Promise<ResearchFeedbackDecision | null>;
};
