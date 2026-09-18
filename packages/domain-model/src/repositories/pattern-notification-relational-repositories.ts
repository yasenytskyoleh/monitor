import type { PatternNotificationRecordRepository } from "./pattern-notification-record-repository.js";
import type { PatternNotificationRelationalRepositoryAdapter } from "./pattern-notification-relational-repository-adapter.js";
import { RelationalPatternNotificationRecordRepository } from "./pattern-notification-relational-repository.impl.js";

export type PatternNotificationRelationalRepositories = {
  patternNotificationRecordRepository: PatternNotificationRecordRepository;
};

export const composePatternNotificationRelationalRepositories = (
  adapter: PatternNotificationRelationalRepositoryAdapter
): PatternNotificationRelationalRepositories => ({
  patternNotificationRecordRepository: new RelationalPatternNotificationRecordRepository(adapter)
});
