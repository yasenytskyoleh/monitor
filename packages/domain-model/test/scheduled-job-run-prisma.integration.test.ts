import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  createFirstDurableRelationalPrismaClient,
  createScheduledJobRunService,
  PrismaScheduledJobRunRepository
} from "../src/index.js";
import { resolveIntegrationDatabaseUrl } from "./integration-test-helpers.js";

const connectionString = resolveIntegrationDatabaseUrl(
  process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL
);
const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../prisma/migrations/20260914160000_runtime_control_scheduled_job_run_v1/migration.sql"
);
const integrationTest = connectionString ? test : test.skip;

const withClient = async <T>(work: (client: Client) => Promise<T>): Promise<T> => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
};

integrationTest("Postgres enforces scheduler ownership, takeover, fencing, and history", async () => {
  const migration = await readFile(migrationPath, "utf8");
  await withClient(async (client) => {
    await client.query('DROP SCHEMA IF EXISTS "runtime_control" CASCADE');
    await client.query(migration);
  });
  const prisma = createFirstDurableRelationalPrismaClient({ connectionString });
  const repository = new PrismaScheduledJobRunRepository(prisma);
  const service = createScheduledJobRunService(repository);
  const firstRequest = {
    runId: "00000000-0000-4000-8000-000000000001",
    ownerId: "00000000-0000-4000-8000-000000000011",
    jobName: "btc_evaluate" as const,
    scopeKey: "setup-btc-breakout:BTC-USDT",
    leaseDurationMs: 120_000
  };

  try {
    const acquisitions = await Promise.all([
      service.acquire(firstRequest),
      service.acquire({
        ...firstRequest,
        runId: "00000000-0000-4000-8000-000000000002",
        ownerId: "00000000-0000-4000-8000-000000000012"
      })
    ]);
    assert.equal(acquisitions.filter(({ status }) => status === "acquired").length, 1);
    assert.equal(acquisitions.filter(({ status }) => status === "already_running").length, 1);
    const acquired = acquisitions.find(({ status }) => status === "acquired");
    assert.ok(acquired && acquired.status === "acquired");

    await prisma.$executeRaw`
      UPDATE "runtime_control"."scheduled_job_run"
      SET "heartbeat_at_utc" = CURRENT_TIMESTAMP - INTERVAL '3 minutes',
          "lease_expires_at_utc" = CURRENT_TIMESTAMP - INTERVAL '1 minute'
      WHERE "run_id" = CAST(${acquired.run.runId} AS UUID)
    `;
    const takeover = await service.acquire({
      ...firstRequest,
      runId: "00000000-0000-4000-8000-000000000003",
      ownerId: "00000000-0000-4000-8000-000000000013"
    });
    assert.equal(takeover.status, "acquired");
    assert.deepEqual(await service.renew({
      runId: acquired.run.runId,
      ownerId: acquired.run.ownerId,
      leaseDurationMs: 120_000
    }), { status: "ownership_lost" });

    assert.ok(takeover.status === "acquired");
    const completed = await service.complete({
      runId: takeover.run.runId,
      ownerId: takeover.run.ownerId,
      outcomeCode: "completed",
      summary: { processed: 0 }
    });
    assert.equal(completed.status, "updated");
    const history = await repository.listByJob(firstRequest.jobName, firstRequest.scopeKey);
    assert.equal(history.length, 2);
    assert.equal(history[0]?.status, "abandoned");
    assert.equal(history[1]?.status, "completed");
  } finally {
    await prisma.$disconnect();
    await withClient((client) => client.query('DROP SCHEMA IF EXISTS "runtime_control" CASCADE').then(() => undefined));
  }
});
