import assert from "node:assert/strict";
import test from "node:test";

import {
  createScheduledJobRunService,
  InMemoryScheduledJobRunRepository,
  ScheduledJobRunValidationError
} from "../src/index.js";

const baseRequest = {
  runId: "run-001",
  ownerId: "owner-001",
  jobName: "btc_evaluate" as const,
  scopeKey: "setup-btc-breakout:BTC-USDT",
  leaseDurationMs: 120_000
};

test("acquires a fresh run and skips an overlapping owner", async () => {
  const repository = new InMemoryScheduledJobRunRepository(
    () => new Date("2026-09-14T12:00:00.000Z")
  );
  const service = createScheduledJobRunService(repository);

  const acquired = await service.acquire(baseRequest);
  const overlapping = await service.acquire({
    ...baseRequest,
    runId: "run-002",
    ownerId: "owner-002"
  });

  assert.equal(acquired.status, "acquired");
  assert.deepEqual(overlapping, {
    status: "already_running",
    activeRunId: "run-001",
    leaseExpiresAtUtc: "2026-09-14T12:02:00.000Z"
  });
});

test("renews and completes only while the caller owns an unexpired run", async () => {
  let now = new Date("2026-09-14T12:00:00.000Z");
  const repository = new InMemoryScheduledJobRunRepository(() => now);
  const service = createScheduledJobRunService(repository);
  await service.acquire(baseRequest);

  assert.deepEqual(await service.renew({
    runId: "run-001",
    ownerId: "owner-wrong",
    leaseDurationMs: 120_000
  }), { status: "ownership_lost" });

  now = new Date("2026-09-14T12:00:30.000Z");
  const renewed = await service.renew({
    runId: "run-001",
    ownerId: "owner-001",
    leaseDurationMs: 120_000
  });
  assert.equal(renewed.status, "updated");
  if (renewed.status === "updated") {
    assert.equal(renewed.run.leaseExpiresAtUtc, "2026-09-14T12:02:30.000Z");
  }

  now = new Date("2026-09-14T12:01:00.000Z");
  const completed = await service.complete({
    runId: "run-001",
    ownerId: "owner-001",
    outcomeCode: "completed",
    summary: { processed: 3 }
  });
  assert.equal(completed.status, "updated");
  if (completed.status === "updated") {
    assert.equal(completed.run.status, "completed");
    assert.deepEqual(completed.run.summary, { processed: 3 });
  }
  assert.deepEqual(await service.renew({
    runId: "run-001",
    ownerId: "owner-001",
    leaseDurationMs: 120_000
  }), { status: "ownership_lost" });
});

test("abandons an expired run before takeover and fences the stale owner", async () => {
  let now = new Date("2026-09-14T12:00:00.000Z");
  const repository = new InMemoryScheduledJobRunRepository(() => now);
  const service = createScheduledJobRunService(repository);
  await service.acquire(baseRequest);
  now = new Date("2026-09-14T12:02:00.001Z");

  const takeover = await service.acquire({
    ...baseRequest,
    runId: "run-002",
    ownerId: "owner-002"
  });
  const history = await repository.listByJob(baseRequest.jobName, baseRequest.scopeKey);

  assert.equal(takeover.status, "acquired");
  assert.equal(history[0]?.status, "abandoned");
  assert.equal(history[0]?.outcomeCode, "lease_expired");
  assert.deepEqual(await service.fail({
    runId: "run-001",
    ownerId: "owner-001",
    outcomeCode: "execution_failed",
    summary: {}
  }), { status: "ownership_lost" });
});

test("allows only one concurrent acquisition for a job scope", async () => {
  const repository = new InMemoryScheduledJobRunRepository(
    () => new Date("2026-09-14T12:00:00.000Z")
  );
  const service = createScheduledJobRunService(repository);
  const results = await Promise.all([
    service.acquire(baseRequest),
    service.acquire({ ...baseRequest, runId: "run-002", ownerId: "owner-002" })
  ]);

  assert.equal(results.filter(({ status }) => status === "acquired").length, 1);
  assert.equal(results.filter(({ status }) => status === "already_running").length, 1);
});

test("validates ownership inputs before persistence", () => {
  const service = createScheduledJobRunService(new InMemoryScheduledJobRunRepository());
  assert.throws(
    () => service.acquire({ ...baseRequest, scopeKey: "" }),
    ScheduledJobRunValidationError
  );
  assert.throws(
    () => service.complete({
      runId: "run-001",
      ownerId: "owner-001",
      outcomeCode: "Invalid Code",
      summary: {}
    }),
    ScheduledJobRunValidationError
  );
});
