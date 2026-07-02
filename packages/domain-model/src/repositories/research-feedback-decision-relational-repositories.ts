import type { ResearchFeedbackDecisionRepository } from "./research-feedback-decision-repository.js";
import { RelationalResearchFeedbackDecisionRepository } from "./research-feedback-decision-relational-repository.impl.js";
import type { ResearchFeedbackDecisionRelationalRepositoryAdapter } from "./research-feedback-decision-relational-repository-adapter.js";

export type ResearchFeedbackDecisionRelationalRepositories = {
  researchFeedbackDecisionRepository: ResearchFeedbackDecisionRepository;
};

export const composeResearchFeedbackDecisionRelationalRepositories = (
  adapter: ResearchFeedbackDecisionRelationalRepositoryAdapter
): ResearchFeedbackDecisionRelationalRepositories => ({
  researchFeedbackDecisionRepository: new RelationalResearchFeedbackDecisionRepository(adapter)
});
