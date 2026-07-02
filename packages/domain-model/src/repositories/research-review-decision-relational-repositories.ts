import type { ResearchReviewDecisionRepository } from "./research-review-decision-repository.js";
import type { ResearchReviewDecisionRelationalRepositoryAdapter } from "./research-review-decision-relational-repository-adapter.js";
import { RelationalResearchReviewDecisionRepository } from "./research-review-decision-relational-repository.impl.js";

export type ResearchReviewDecisionRelationalRepositories = {
  researchReviewDecisionRepository: ResearchReviewDecisionRepository;
};

export const composeResearchReviewDecisionRelationalRepositories = (
  adapter: ResearchReviewDecisionRelationalRepositoryAdapter
): ResearchReviewDecisionRelationalRepositories => ({
  researchReviewDecisionRepository: new RelationalResearchReviewDecisionRepository(adapter)
});
