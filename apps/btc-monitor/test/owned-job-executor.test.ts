import assert from "node:assert/strict";
import test from "node:test";

import {
  createScheduledJobRunService,
  InMemoryScheduledJobRunRepository,
  type ScheduledJobRunRepository
} from "@monitor/domain-model";

import { executeOwnedJob, OwnedJobExecutionError } from "../src/owned-job-executor.js";

const ids = (...values: string[]): (() => string) => {
  let index = 0;
  return () => values[index++] ?? `id-${index}`;
};

test("records a credential-free completed run summary", async () => {
  const repository = new InMemoryScheduledJobRunRepository();
  const result = await executeOwnedJob({
    jobName: "btc_evaluate",
    scopeKey: "setup:BTC-USDT",
    scheduledJobRunService: createScheduledJobRunService(repository),
    idFactory: ids("run-001", "owner-001"),
    execute: async () => ["completed", "failed"],
    summarize: (items) => ({
      outcomeCode: "completed_with_item_failures",
      summary: { processed: items.length, failed: 1 }
    })
  });

  assert.equal(result.status, "completed");
  if (result.status === "completed") {
    assert.equal(result.run.status, "completed");
    assert.equal(result.run.outcomeCode, "completed_with_item_failures");
    assert.deepEqual(result.run.summary, { processed: 2, failed: 1 });
  }
});

test("skips work while another invocation owns the scope", async () => {
  const repository = new InMemoryScheduledJobRunRepository();
  const service = createScheduledJobRunService(repository);
  await service.acquire({
    runId: "run-active",
    ownerId: "owner-active",
    jobName: "btc_notify",
    scopeKey: "global",
    leaseDurationMs: 120_000
  });
  let executed = false;

  const result = await executeOwnedJob({
    jobName: "btc_notify",
    scopeKey: "global",
    scheduledJobRunService: service,
    idFactory: ids("run-skipped", "owner-skipped"),
    execute: async () => { executed = true; },
    summarize: () => ({ outcomeCode: "completed", summary: {} })
  });

  assert.equal(result.status, "already_running");
  assert.equal(executed, false);
});

test("records failure when owned work throws", async () => {
  const repository = new InMemoryScheduledJobRunRepository();
  await assert.rejects(
    () => executeOwnedJob({
      jobName: "btc_evaluate",
      scopeKey: "setup:BTC-USDT",
      scheduledJobRunService: createScheduledJobRunService(repository),
      idFactory: ids("run-failed", "owner-failed"),
      execute: async () => { throw new Error("fixture failure"); },
      summarize: () => ({ outcomeCode: "completed", summary: {} })
    }),
    OwnedJobExecutionError
  );

  const stored = await repository.getById("run-failed");
  assert.equal(stored?.status, "failed");
  assert.equal(stored?.outcomeCode, "execution_failed");
  assert.deepEqual(stored?.summary, {});
});

test("aborts work when heartbeat ownership is lost", async () => {
  const backing = new InMemoryScheduledJobRunRepository();
  const repository: ScheduledJobRunRepository = {
    ...backing,
    getById: backing.getById.bind(backing),
    listByJob: backing.listByJob.bind(backing),
    acquire: backing.acquire.bind(backing),
    renew: async () => ({ status: "ownership_lost" }),
    complete: backing.complete.bind(backing),
    fail: backing.fail.bind(backing)
  };

  await assert.rejects(
    () => executeOwnedJob({
      jobName: "btc_evaluate",
      scopeKey: "setup:BTC-USDT",
      scheduledJobRunService: createScheduledJobRunService(repository),
      heartbeatIntervalMs: 1,
      leaseDurationMs: 100,
      idFactory: ids("run-lost", "owner-lost"),
      execute: (signal) => new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
      summarize: () => ({ outcomeCode: "completed", summary: {} })
    }),
    (error: unknown) =>
      error instanceof OwnedJobExecutionError &&
      error.message === "scheduled job ownership was lost"
  );
});

test("treats a failed heartbeat as uncertain ownership and leaves the lease recoverable", async () => {
  const backing = new InMemoryScheduledJobRunRepository();
  const repository: ScheduledJobRunRepository = {
    getById: backing.getById.bind(backing),
    listByJob: backing.listByJob.bind(backing),
    acquire: backing.acquire.bind(backing),
    renew: async () => { throw new Error("database unavailable"); },
    complete: backing.complete.bind(backing),
    fail: backing.fail.bind(backing)
  };

  await assert.rejects(
    () => executeOwnedJob({
      jobName: "btc_notify",
      scopeKey: "global",
      scheduledJobRunService: createScheduledJobRunService(repository),
      heartbeatIntervalMs: 1,
      leaseDurationMs: 100,
      idFactory: ids("run-heartbeat-failed", "owner-heartbeat-failed"),
      execute: (signal) => new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
      summarize: () => ({ outcomeCode: "completed", summary: {} })
    }),
    (error: unknown) =>
      error instanceof OwnedJobExecutionError &&
      error.message === "scheduled job ownership was lost"
  );
  assert.equal((await backing.getById("run-heartbeat-failed"))?.status, "running");
});

test("does not complete when an in-flight final heartbeat fails", async () => {
  const backing = new InMemoryScheduledJobRunRepository();
  let rejectRenewal: ((reason: Error) => void) | undefined;
  let signalRenewalStarted: (() => void) | undefined;
  const renewalStarted = new Promise<void>((resolve) => { signalRenewalStarted = resolve; });
  let releaseWork: (() => void) | undefined;
  const workReleased = new Promise<void>((resolve) => { releaseWork = resolve; });
  const repository: ScheduledJobRunRepository = {
    getById: backing.getById.bind(backing),
    listByJob: backing.listByJob.bind(backing),
    acquire: backing.acquire.bind(backing),
    renew: async () => new Promise((_, reject) => {
      rejectRenewal = reject;
      signalRenewalStarted?.();
    }),
    complete: backing.complete.bind(backing),
    fail: backing.fail.bind(backing)
  };

  const running = executeOwnedJob({
    jobName: "btc_evaluate",
    scopeKey: "setup:BTC-USDT",
    scheduledJobRunService: createScheduledJobRunService(repository),
    heartbeatIntervalMs: 1,
    leaseDurationMs: 100,
    idFactory: ids("run-final-heartbeat", "owner-final-heartbeat"),
    execute: async () => workReleased,
    summarize: () => ({ outcomeCode: "completed", summary: {} })
  });
  await renewalStarted;
  releaseWork?.();
  queueMicrotask(() => rejectRenewal?.(new Error("database unavailable")));

  await assert.rejects(
    () => running,
    (error: unknown) =>
      error instanceof OwnedJobExecutionError && error.outcomeCode === "ownership_lost"
  );
  assert.equal((await backing.getById("run-final-heartbeat"))?.status, "running");
});

test("external termination aborts work and clears heartbeat activity", async () => {
  const repository = new InMemoryScheduledJobRunRepository();
  const controller = new AbortController();
  let renewals = 0;
  const service = createScheduledJobRunService({
    getById: repository.getById.bind(repository),
    listByJob: repository.listByJob.bind(repository),
    acquire: repository.acquire.bind(repository),
    renew: async (request) => {
      renewals += 1;
      return repository.renew(request);
    },
    complete: repository.complete.bind(repository),
    fail: repository.fail.bind(repository)
  });

  const running = executeOwnedJob({
    jobName: "btc_notify",
    scopeKey: "global",
    scheduledJobRunService: service,
    heartbeatIntervalMs: 5,
    leaseDurationMs: 100,
    signal: controller.signal,
    idFactory: ids("run-terminated", "owner-terminated"),
    execute: (signal) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
    summarize: () => ({ outcomeCode: "completed", summary: {} })
  });
  controller.abort(new Error("terminated_by_sigterm"));
  await assert.rejects(() => running, OwnedJobExecutionError);
  const renewalCountAtExit = renewals;
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(renewals, renewalCountAtExit);
  assert.equal((await repository.getById("run-terminated"))?.outcomeCode, "terminated");
});
