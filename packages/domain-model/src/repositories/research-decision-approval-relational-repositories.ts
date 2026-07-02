import type { ResearchDecisionApprovalRepository } from "./research-decision-approval-repository.js";
import type { ResearchDecisionApprovalRelationalRepositoryAdapter } from "./research-decision-approval-relational-repository-adapter.js";
import { RelationalResearchDecisionApprovalRepository } from "./research-decision-approval-relational-repository.impl.js";

export type ResearchDecisionApprovalRelationalRepositories = {
  researchDecisionApprovalRepository: ResearchDecisionApprovalRepository;
};

export const composeResearchDecisionApprovalRelationalRepositories = (
  adapter: ResearchDecisionApprovalRelationalRepositoryAdapter
): ResearchDecisionApprovalRelationalRepositories => ({
  researchDecisionApprovalRepository: new RelationalResearchDecisionApprovalRepository(adapter)
});
