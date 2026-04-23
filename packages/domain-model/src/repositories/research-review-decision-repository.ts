import type { ResearchReviewDecision } from "../review/research-review-decision.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type ResearchReviewDecisionCreateRequest = {
  decision: ResearchReviewDecision;
  metadata: ProductRecordMetadata;
};

export type ResearchReviewDecisionRepository = {
  getById(researchReviewDecisionId: string): Promise<ResearchReviewDecision | null>;
  listByReviewPacketId(researchReviewPacketId: string): Promise<ResearchReviewDecision[]>;
  listBySetupFamilyId(setupFamilyId: string): Promise<ResearchReviewDecision[]>;
  create(request: ResearchReviewDecisionCreateRequest): Promise<ResearchReviewDecision>;
};
