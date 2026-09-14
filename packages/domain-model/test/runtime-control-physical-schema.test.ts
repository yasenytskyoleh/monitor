import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(packageRoot, "prisma/schema.prisma");
const migrationPath = resolve(
  packageRoot,
  "prisma/migrations/20260914160000_runtime_control_scheduled_job_run_v1/migration.sql"
);

test("Prisma models scheduled job runs in the runtime-control schema", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /schemas\s+=\s+\["product_domain", "runtime_control"\]/);
  assert.match(schema, /enum ScheduledJobName \{/);
  assert.match(schema, /enum ScheduledJobRunStatus \{/);
  assert.match(schema, /model ScheduledJobRunRecord \{/);
  assert.match(schema, /@@map\("scheduled_job_run"\)/);
  assert.match(schema, /@@schema\("runtime_control"\)/);
});

test("migration creates durable lease constraints and one active owner per scope", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS "runtime_control"/);
  assert.match(migration, /CREATE TABLE "runtime_control"\."scheduled_job_run"/);
  assert.match(migration, /"lease_expires_at_utc" > "heartbeat_at_utc"/);
  assert.match(migration, /CREATE UNIQUE INDEX "uq_scheduled_job_run_active_job_scope"/);
  assert.match(migration, /WHERE "status" = 'running'/);
});
