import type {
  FeedbackDecisionResult,
  HypothesisFeedbackDecisionTrigger,
  ProductRecordMetadata,
  ResearchHypothesisRepository
} from "@monitor/domain-model";

export type HypothesisSetupFeedbackRequest = {
  researchHypothesisId: string;
  setupDefinitionId: string;
  triggeredAt: string;
};

export type HypothesisSetupFeedbackHandoff = {
  review(
    trigger: HypothesisFeedbackDecisionTrigger,
    metadata: ProductRecordMetadata
  ): Promise<FeedbackDecisionResult>;
};

export type HypothesisSetupFeedbackRuntimeOptions = {
  researchHypothesisRepository: Pick<ResearchHypothesisRepository, "getById">;
  hypothesisSetupFeedbackHandoff: HypothesisSetupFeedbackHandoff;
};

export type HypothesisSetupFeedbackRuntime = {
  reviewFromHypothesis(
    request: HypothesisSetupFeedbackRequest
  ): Promise<FeedbackDecisionResult>;
};
