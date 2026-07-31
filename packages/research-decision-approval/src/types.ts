import type {
  ProductRecordMetadata,
  ResearchDecisionApprovalOutcome,
  ResearchDecisionApprovalResult,
  ResearchFeedbackDecisionRepository,
  ReviewResearchDecisionCommand
} from "@monitor/domain-model";

export type ManualResearchDecisionApprovalRequest = {
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
  reviewedBy: string;
  reviewedAt: string;
  decisionOutcome: ResearchDecisionApprovalOutcome;
  reviewerNotes?: string;
};

export type ResearchDecisionApprovalHandoff = {
  review(
    command: ReviewResearchDecisionCommand,
    metadata: ProductRecordMetadata
  ): Promise<ResearchDecisionApprovalResult>;
};

export type ManualResearchDecisionApprovalRuntimeOptions = {
  researchFeedbackDecisionRepository: Pick<ResearchFeedbackDecisionRepository, "getById">;
  researchDecisionApprovalHandoff: ResearchDecisionApprovalHandoff;
};

export type ManualResearchDecisionApprovalRuntime = {
  recordManualApproval(
    request: ManualResearchDecisionApprovalRequest
  ): Promise<ResearchDecisionApprovalResult>;
};
