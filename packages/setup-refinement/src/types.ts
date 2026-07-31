import type {
  CreateSetupRefinementRequestCommand,
  ProductRecordMetadata,
  ResearchDecisionApprovalRepository,
  SetupRefinementRequestResult
} from "@monitor/domain-model";

export type ApprovedRefinementRequest = {
  researchDecisionApprovalId: string;
  requestedBy: string;
  requestedAt: string;
  refinementRationaleSummary: string;
  requestedChangesSummary: string;
  evidenceReferences?: string[];
};

export type ApprovedRefinementHandoff = {
  create(
    command: CreateSetupRefinementRequestCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupRefinementRequestResult>;
};

export type ApprovedRefinementRuntimeOptions = {
  researchDecisionApprovalRepository: Pick<ResearchDecisionApprovalRepository, "getById">;
  approvedRefinementHandoff: ApprovedRefinementHandoff;
};

export type ApprovedRefinementRuntime = {
  createFromApprovedAction(
    request: ApprovedRefinementRequest
  ): Promise<SetupRefinementRequestResult>;
};
