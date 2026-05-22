import type { FirstDurableRelationalRepositoryAdapter } from "./first-durable-relational-repository-adapter.js";
import { RelationalResearchHypothesisRepository } from "./research-hypothesis-relational-repository.impl.js";
import type { ResearchHypothesisRepository } from "./research-hypothesis-repository.js";
import { RelationalSetupDefinitionRepository } from "./setup-definition-relational-repository.impl.js";
import type { SetupDefinitionRepository } from "./setup-definition-repository.js";

export type FirstDurableRelationalRepositories = {
  setupDefinitionRepository: SetupDefinitionRepository;
  researchHypothesisRepository: ResearchHypothesisRepository;
};

export const composeFirstDurableRelationalRepositories = (
  adapter: FirstDurableRelationalRepositoryAdapter
): FirstDurableRelationalRepositories => ({
  setupDefinitionRepository: new RelationalSetupDefinitionRepository(adapter),
  researchHypothesisRepository: new RelationalResearchHypothesisRepository(adapter)
});
