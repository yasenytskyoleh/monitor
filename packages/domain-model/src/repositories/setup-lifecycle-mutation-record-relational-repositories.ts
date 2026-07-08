import type { SetupLifecycleMutationRecordRepository } from "./setup-lifecycle-mutation-record-repository.js";
import type { SetupLifecycleMutationRecordRelationalRepositoryAdapter } from "./setup-lifecycle-mutation-record-relational-repository-adapter.js";
import { RelationalSetupLifecycleMutationRecordRepository } from "./setup-lifecycle-mutation-record-relational-repository.impl.js";

export type SetupLifecycleMutationRecordRelationalRepositories = {
  setupLifecycleMutationRecordRepository: SetupLifecycleMutationRecordRepository;
};

export const composeSetupLifecycleMutationRecordRelationalRepositories = (
  adapter: SetupLifecycleMutationRecordRelationalRepositoryAdapter
): SetupLifecycleMutationRecordRelationalRepositories => ({
  setupLifecycleMutationRecordRepository:
    new RelationalSetupLifecycleMutationRecordRepository(adapter)
});
