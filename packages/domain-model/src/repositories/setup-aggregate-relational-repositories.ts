import type { SetupAggregateResultRepository } from "./setup-aggregate-result-repository.js";
import { RelationalSetupAggregateResultRepository } from "./setup-aggregate-result-relational-repository.impl.js";
import type { SetupAggregateRelationalRepositoryAdapter } from "./setup-aggregate-relational-repository-adapter.js";

export type SetupAggregateRelationalRepositories = {
  setupAggregateResultRepository: SetupAggregateResultRepository;
};

export const composeSetupAggregateRelationalRepositories = (
  adapter: SetupAggregateRelationalRepositoryAdapter
): SetupAggregateRelationalRepositories => ({
  setupAggregateResultRepository: new RelationalSetupAggregateResultRepository(adapter)
});
