import type { ExecutionAttemptAuditRepository } from "./execution-attempt-audit-repository.js";
import type { ExecutionAttemptAuditRelationalRepositoryAdapter } from "./execution-attempt-audit-relational-repository-adapter.js";
import { RelationalExecutionAttemptAuditRepository } from "./execution-attempt-audit-relational-repository.impl.js";

export type ExecutionAttemptAuditRelationalRepositories = {
  executionAttemptAuditRepository: ExecutionAttemptAuditRepository;
};

export const composeExecutionAttemptAuditRelationalRepositories = (
  adapter: ExecutionAttemptAuditRelationalRepositoryAdapter
): ExecutionAttemptAuditRelationalRepositories => ({
  executionAttemptAuditRepository: new RelationalExecutionAttemptAuditRepository(adapter)
});
