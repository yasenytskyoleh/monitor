import type { ScheduledJobRunRepository } from "./scheduled-job-run-repository.js";
import type {
  AcquireScheduledJobRunRequest,
  AcquireScheduledJobRunResult,
  FinishScheduledJobRunRequest,
  RenewScheduledJobRunRequest,
  ScheduledJobRunMutationResult
} from "./scheduled-job-run-repository.js";
import { SCHEDULED_JOB_NAMES } from "./scheduled-job-run.js";

export type ScheduledJobRunService = {
  acquire(request: AcquireScheduledJobRunRequest): Promise<AcquireScheduledJobRunResult>;
  renew(request: RenewScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult>;
  complete(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult>;
  fail(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult>;
};

export class ScheduledJobRunValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduledJobRunValidationError";
  }
}

const assertNonEmpty = (value: string, fieldName: string): void => {
  if (!value.trim()) throw new ScheduledJobRunValidationError(`${fieldName} is required`);
};

const assertPositiveInteger = (value: number, fieldName: string): void => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScheduledJobRunValidationError(`${fieldName} must be a positive integer`);
  }
};

const assertOwnerRequest = (request: { runId: string; ownerId: string }): void => {
  assertNonEmpty(request.runId, "runId");
  assertNonEmpty(request.ownerId, "ownerId");
};

const assertFinishRequest = (request: FinishScheduledJobRunRequest): void => {
  assertOwnerRequest(request);
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(request.outcomeCode)) {
    throw new ScheduledJobRunValidationError(
      "outcomeCode must be a lowercase underscore-delimited identifier"
    );
  }
};

export const createScheduledJobRunService = (
  repository: ScheduledJobRunRepository
): ScheduledJobRunService => ({
  acquire(request) {
    assertOwnerRequest(request);
    if (!SCHEDULED_JOB_NAMES.includes(request.jobName)) {
      throw new ScheduledJobRunValidationError("jobName is invalid");
    }
    assertNonEmpty(request.scopeKey, "scopeKey");
    assertPositiveInteger(request.leaseDurationMs, "leaseDurationMs");
    return repository.acquire(request);
  },
  renew(request) {
    assertOwnerRequest(request);
    assertPositiveInteger(request.leaseDurationMs, "leaseDurationMs");
    return repository.renew(request);
  },
  complete(request) {
    assertFinishRequest(request);
    return repository.complete(request);
  },
  fail(request) {
    assertFinishRequest(request);
    return repository.fail(request);
  }
});
