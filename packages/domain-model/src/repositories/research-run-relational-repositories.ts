import type { ResearchRunRepository } from "./research-run-repository.js";
import type { ResearchRunRelationalRepositoryAdapter } from "./research-run-relational-repository-adapter.js";
import { RelationalResearchRunRepository } from "./research-run-relational-repository.impl.js";

export type ResearchRunRelationalRepositories = { researchRunRepository: ResearchRunRepository };

export const composeResearchRunRelationalRepositories = (
  adapter: ResearchRunRelationalRepositoryAdapter
): ResearchRunRelationalRepositories => ({ researchRunRepository: new RelationalResearchRunRepository(adapter) });
