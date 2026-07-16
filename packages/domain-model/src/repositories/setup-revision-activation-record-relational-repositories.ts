import type { SetupRevisionActivationRecordRepository } from "./setup-revision-activation-record-repository.js";
import type { SetupRevisionActivationRecordRelationalRepositoryAdapter } from "./setup-revision-activation-record-relational-repository-adapter.js";
import { RelationalSetupRevisionActivationRecordRepository } from "./setup-revision-activation-record-relational-repository.impl.js";

export type SetupRevisionActivationRecordRelationalRepositories = {
  setupRevisionActivationRecordRepository: SetupRevisionActivationRecordRepository;
};

export const composeSetupRevisionActivationRecordRelationalRepositories = (
  adapter: SetupRevisionActivationRecordRelationalRepositoryAdapter
): SetupRevisionActivationRecordRelationalRepositories => ({
  setupRevisionActivationRecordRepository:
    new RelationalSetupRevisionActivationRecordRepository(adapter)
});
