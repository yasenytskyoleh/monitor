import type { SetupRefinementRequest } from "../review/setup-refinement-request.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type SetupRefinementRequestCreateRequest = {
  request: SetupRefinementRequest;
  metadata: ProductRecordMetadata;
};

export type SetupRefinementRequestRepository = {
  getById(setupRefinementRequestId: string): Promise<SetupRefinementRequest | null>;
  listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupRefinementRequest[]>;
  listByApprovalId(researchDecisionApprovalId: string): Promise<SetupRefinementRequest[]>;
  create(request: SetupRefinementRequestCreateRequest): Promise<SetupRefinementRequest>;
};
