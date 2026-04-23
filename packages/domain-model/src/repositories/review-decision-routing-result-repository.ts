import type { ReviewDecisionRoutingResult } from "../review/review-decision-routing-result.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type ReviewDecisionRoutingResultCreateRequest = {
  result: ReviewDecisionRoutingResult;
  metadata: ProductRecordMetadata;
};

export type ReviewDecisionRoutingResultRepository = {
  getById(reviewDecisionRoutingResultId: string): Promise<ReviewDecisionRoutingResult | null>;
  listByReviewDecisionId(researchReviewDecisionId: string): Promise<ReviewDecisionRoutingResult[]>;
  create(request: ReviewDecisionRoutingResultCreateRequest): Promise<ReviewDecisionRoutingResult>;
};
