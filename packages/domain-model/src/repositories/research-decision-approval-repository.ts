import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type ResearchDecisionApprovalCreateRequest = {
  approval: ResearchDecisionApproval;
  metadata: ProductRecordMetadata;
};

export type ResearchDecisionApprovalRepository = {
  getById(researchDecisionApprovalId: string): Promise<ResearchDecisionApproval | null>;
  listByFeedbackDecisionId(researchFeedbackDecisionId: string): Promise<ResearchDecisionApproval[]>;
  create(request: ResearchDecisionApprovalCreateRequest): Promise<ResearchDecisionApproval>;
};
