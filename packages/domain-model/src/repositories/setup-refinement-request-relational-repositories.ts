import type { SetupRefinementRequestRepository } from "./setup-refinement-request-repository.js";
import type { SetupRefinementRequestRelationalRepositoryAdapter } from "./setup-refinement-request-relational-repository-adapter.js";
import { RelationalSetupRefinementRequestRepository } from "./setup-refinement-request-relational-repository.impl.js";

export type SetupRefinementRequestRelationalRepositories = {
  setupRefinementRequestRepository: SetupRefinementRequestRepository;
};

export const composeSetupRefinementRequestRelationalRepositories = (
  adapter: SetupRefinementRequestRelationalRepositoryAdapter
): SetupRefinementRequestRelationalRepositories => ({
  setupRefinementRequestRepository: new RelationalSetupRefinementRequestRepository(
    adapter
  )
});
