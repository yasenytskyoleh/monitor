import type { JsonObject } from "../common.js";
import type { ScheduledJobName, ScheduledJobRun } from "./scheduled-job-run.js";

export type AcquireScheduledJobRunRequest = {
  runId: string;
  ownerId: string;
  jobName: ScheduledJobName;
  scopeKey: string;
  leaseDurationMs: number;
};

export type AcquireScheduledJobRunResult =
  | { status: "acquired"; run: ScheduledJobRun }
  | { status: "already_running"; activeRunId: string; leaseExpiresAtUtc: string };

export type RenewScheduledJobRunRequest = {
  runId: string;
  ownerId: string;
  leaseDurationMs: number;
};

export type FinishScheduledJobRunRequest = {
  runId: string;
  ownerId: string;
  outcomeCode: string;
  summary: JsonObject;
};

export type ScheduledJobRunMutationResult =
  | { status: "updated"; run: ScheduledJobRun }
  | { status: "ownership_lost" };

export type ScheduledJobRunRepository = {
  getById(runId: string): Promise<ScheduledJobRun | null>;
  listByJob(jobName: ScheduledJobName, scopeKey: string): Promise<ScheduledJobRun[]>;
  acquire(request: AcquireScheduledJobRunRequest): Promise<AcquireScheduledJobRunResult>;
  renew(request: RenewScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult>;
  complete(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult>;
  fail(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult>;
};

const cloneRun = (run: ScheduledJobRun): ScheduledJobRun => structuredClone(run);

export class InMemoryScheduledJobRunRepository implements ScheduledJobRunRepository {
  private readonly records = new Map<string, ScheduledJobRun>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async getById(runId: string): Promise<ScheduledJobRun | null> {
    const run = this.records.get(runId);
    return run ? cloneRun(run) : null;
  }

  async listByJob(jobName: ScheduledJobName, scopeKey: string): Promise<ScheduledJobRun[]> {
    return [...this.records.values()]
      .filter((run) => run.jobName === jobName && run.scopeKey === scopeKey)
      .sort((left, right) => left.startedAtUtc.localeCompare(right.startedAtUtc))
      .map(cloneRun);
  }

  async acquire(request: AcquireScheduledJobRunRequest): Promise<AcquireScheduledJobRunResult> {
    const now = this.now();
    const active = [...this.records.values()].find(
      (run) => run.jobName === request.jobName && run.scopeKey === request.scopeKey && run.status === "running"
    );
    if (active && Date.parse(active.leaseExpiresAtUtc) > now.getTime()) {
      return {
        status: "already_running",
        activeRunId: active.runId,
        leaseExpiresAtUtc: active.leaseExpiresAtUtc
      };
    }
    if (active) {
      const completedAtUtc = now.toISOString();
      this.records.set(active.runId, {
        ...active,
        version: active.version + 1,
        status: "abandoned",
        completedAtUtc,
        outcomeCode: "lease_expired",
        summary: {},
        updatedAtUtc: completedAtUtc
      });
    }
    const startedAtUtc = now.toISOString();
    const run: ScheduledJobRun = {
      runId: request.runId,
      version: 1,
      jobName: request.jobName,
      scopeKey: request.scopeKey,
      ownerId: request.ownerId,
      status: "running",
      startedAtUtc,
      heartbeatAtUtc: startedAtUtc,
      leaseExpiresAtUtc: new Date(now.getTime() + request.leaseDurationMs).toISOString(),
      createdAtUtc: startedAtUtc,
      updatedAtUtc: startedAtUtc
    };
    this.records.set(run.runId, run);
    return { status: "acquired", run: cloneRun(run) };
  }

  async renew(request: RenewScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult> {
    const now = this.now();
    const current = this.records.get(request.runId);
    if (!this.ownsUnexpired(current, request.ownerId, now)) return { status: "ownership_lost" };
    const heartbeatAtUtc = now.toISOString();
    const run: ScheduledJobRun = {
      ...current,
      version: current.version + 1,
      heartbeatAtUtc,
      leaseExpiresAtUtc: new Date(now.getTime() + request.leaseDurationMs).toISOString(),
      updatedAtUtc: heartbeatAtUtc
    };
    this.records.set(run.runId, run);
    return { status: "updated", run: cloneRun(run) };
  }

  complete(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult> {
    return this.finish(request, "completed");
  }

  fail(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult> {
    return this.finish(request, "failed");
  }

  private async finish(
    request: FinishScheduledJobRunRequest,
    status: "completed" | "failed"
  ): Promise<ScheduledJobRunMutationResult> {
    const now = this.now();
    const current = this.records.get(request.runId);
    if (!this.ownsUnexpired(current, request.ownerId, now)) return { status: "ownership_lost" };
    const completedAtUtc = now.toISOString();
    const run: ScheduledJobRun = {
      ...current,
      version: current.version + 1,
      status,
      completedAtUtc,
      outcomeCode: request.outcomeCode,
      summary: structuredClone(request.summary),
      updatedAtUtc: completedAtUtc
    };
    this.records.set(run.runId, run);
    return { status: "updated", run: cloneRun(run) };
  }

  private ownsUnexpired(
    run: ScheduledJobRun | undefined,
    ownerId: string,
    now: Date
  ): run is ScheduledJobRun {
    return Boolean(
      run &&
      run.ownerId === ownerId &&
      run.status === "running" &&
      Date.parse(run.leaseExpiresAtUtc) > now.getTime()
    );
  }
}
