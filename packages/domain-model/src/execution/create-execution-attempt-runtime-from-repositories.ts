import type { ExecutionAttemptAuditRepository } from "../repositories/execution-attempt-audit-repository.js";
import { createExecutionAttemptAuditService } from "../services/execution-attempt-audit-service.js";
import type { DownstreamActionExecutor, ExecutionAttemptRuntime } from "./execution-attempt-runtime.js";
import { createExecutionAttemptRuntime } from "./execution-attempt-runtime.js";

export type ExecutionAttemptRuntimeRepositories = {
  executionAttemptAuditRepository: ExecutionAttemptAuditRepository;
};

export const createExecutionAttemptRuntimeFromRepositories = (
  repositories: ExecutionAttemptRuntimeRepositories,
  downstreamActionExecutor: DownstreamActionExecutor
): ExecutionAttemptRuntime =>
  createExecutionAttemptRuntime({
    executionAttemptAuditService: createExecutionAttemptAuditService({
      executionAttemptAuditRepository: repositories.executionAttemptAuditRepository
    }),
    downstreamActionExecutor
  });
