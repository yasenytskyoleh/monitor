import { randomUUID } from "node:crypto";

import type {
  JsonObject,
  ScheduledJobName,
  ScheduledJobRun,
  ScheduledJobRunService
} from "@monitor/domain-model";

export const SCHEDULED_JOB_LEASE_DURATION_MS = 120_000;
export const SCHEDULED_JOB_HEARTBEAT_INTERVAL_MS = 30_000;

type TimeoutHandle = ReturnType<typeof setTimeout>;

type OwnedJobTimers = {
  setTimeout(callback: () => void, delayMs: number): TimeoutHandle;
  clearTimeout(handle: TimeoutHandle): void;
};

export type OwnedJobCompletion = {
  outcomeCode: string;
  summary: JsonObject;
};

export type ExecuteOwnedJobOptions<Result> = {
  jobName: ScheduledJobName;
  scopeKey: string;
  scheduledJobRunService: ScheduledJobRunService;
  execute(signal: AbortSignal): Promise<Result>;
  summarize(result: Result): OwnedJobCompletion;
  signal?: AbortSignal;
  heartbeatIntervalMs?: number;
  leaseDurationMs?: number;
  idFactory?: () => string;
  timers?: OwnedJobTimers;
};

export type ExecuteOwnedJobResult<Result> =
  | { status: "completed"; run: ScheduledJobRun; result: Result }
  | { status: "already_running"; activeRunId: string; leaseExpiresAtUtc: string };

export class OwnedJobExecutionError extends Error {
  constructor(
    message: string,
    readonly runId: string,
    readonly outcomeCode: "execution_failed" | "ownership_lost" | "terminated",
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "OwnedJobExecutionError";
  }
}

class OwnedJobOwnershipLostError extends Error {
  constructor() {
    super("scheduled job ownership was lost");
    this.name = "OwnedJobOwnershipLostError";
  }
}

const defaultTimers: OwnedJobTimers = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle)
};

const throwIfAborted = (signal: AbortSignal): void => {
  if (signal.aborted) throw signal.reason ?? new Error("scheduled job aborted");
};

export const executeOwnedJob = async <Result>(
  options: ExecuteOwnedJobOptions<Result>
): Promise<ExecuteOwnedJobResult<Result>> => {
  const idFactory = options.idFactory ?? randomUUID;
  const leaseDurationMs = options.leaseDurationMs ?? SCHEDULED_JOB_LEASE_DURATION_MS;
  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? SCHEDULED_JOB_HEARTBEAT_INTERVAL_MS;
  if (heartbeatIntervalMs >= leaseDurationMs) {
    throw new Error("heartbeat interval must be shorter than the scheduled job lease");
  }
  const runId = idFactory();
  const ownerId = idFactory();
  const acquired = await options.scheduledJobRunService.acquire({
    runId,
    ownerId,
    jobName: options.jobName,
    scopeKey: options.scopeKey,
    leaseDurationMs
  });
  if (acquired.status === "already_running") return acquired;

  const timers = options.timers ?? defaultTimers;
  const controller = new AbortController();
  let heartbeatTimer: TimeoutHandle | undefined;
  let heartbeatTask: Promise<void> = Promise.resolve();
  let heartbeatStopped = false;

  const abortForOwnershipLoss = (): void => {
    if (!controller.signal.aborted) controller.abort(new OwnedJobOwnershipLostError());
  };
  const scheduleHeartbeat = (): void => {
    if (heartbeatStopped || controller.signal.aborted) return;
    heartbeatTimer = timers.setTimeout(() => {
      heartbeatTask = options.scheduledJobRunService
        .renew({ runId, ownerId, leaseDurationMs })
        .then((renewed) => {
          if (renewed.status === "ownership_lost") abortForOwnershipLoss();
        })
        .catch(abortForOwnershipLoss)
        .finally(scheduleHeartbeat);
    }, heartbeatIntervalMs);
    heartbeatTimer.unref?.();
  };
  const stopHeartbeat = async (): Promise<void> => {
    heartbeatStopped = true;
    if (heartbeatTimer) timers.clearTimeout(heartbeatTimer);
    await heartbeatTask;
  };
  const onExternalAbort = (): void => {
    if (!controller.signal.aborted) {
      controller.abort(options.signal?.reason ?? new Error("scheduled job terminated"));
    }
  };
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  if (options.signal?.aborted) onExternalAbort();
  scheduleHeartbeat();

  try {
    throwIfAborted(controller.signal);
    const result = await options.execute(controller.signal);
    throwIfAborted(controller.signal);
    await stopHeartbeat();
    throwIfAborted(controller.signal);
    const completion = options.summarize(result);
    const completed = await options.scheduledJobRunService.complete({
      runId,
      ownerId,
      outcomeCode: completion.outcomeCode,
      summary: completion.summary
    });
    if (completed.status === "ownership_lost") throw new OwnedJobOwnershipLostError();
    return { status: "completed", run: completed.run, result };
  } catch (error: unknown) {
    await stopHeartbeat();
    let outcomeCode: OwnedJobExecutionError["outcomeCode"] =
      error instanceof OwnedJobOwnershipLostError
        ? "ownership_lost"
        : controller.signal.aborted
          ? "terminated"
          : "execution_failed";
    if (!(error instanceof OwnedJobOwnershipLostError)) {
      try {
        const failed = await options.scheduledJobRunService.fail({
          runId,
          ownerId,
          outcomeCode,
          summary: {}
        });
        if (failed.status === "ownership_lost") {
          error = new OwnedJobOwnershipLostError();
          outcomeCode = "ownership_lost";
        }
      } catch {
        // The expiring durable lease remains recoverable when failure evidence cannot be written.
      }
    }
    throw new OwnedJobExecutionError(
      error instanceof OwnedJobOwnershipLostError
        ? "scheduled job ownership was lost"
        : "scheduled job execution failed",
      runId,
      outcomeCode,
      { cause: error }
    );
  } finally {
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
};
