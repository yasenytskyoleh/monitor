import type { SetupDefinitionRevisionRepository } from "./setup-definition-revision-repository.js";
import type { SetupDefinitionRevisionRelationalRepositoryAdapter } from "./setup-definition-revision-relational-repository-adapter.js";
import { RelationalSetupDefinitionRevisionRepository } from "./setup-definition-revision-relational-repository.impl.js";

export type SetupDefinitionRevisionRelationalRepositories = {
  setupDefinitionRevisionRepository: SetupDefinitionRevisionRepository;
};

export const composeSetupDefinitionRevisionRelationalRepositories = (
  adapter: SetupDefinitionRevisionRelationalRepositoryAdapter
): SetupDefinitionRevisionRelationalRepositories => ({
  setupDefinitionRevisionRepository: new RelationalSetupDefinitionRevisionRepository(
    adapter
  )
});
