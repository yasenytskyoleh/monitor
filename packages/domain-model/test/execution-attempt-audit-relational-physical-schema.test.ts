import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_INDEXES,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_MIGRATION_SLUG,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_PRISMA_MODELS,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_REQUIRED_COLUMNS,
  EXECUTION_ATTEMPT_AUDIT_RELATIONAL_TABLES
} from "../src/index.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolvePackageRoot(testDirectory);
const schemaPath = join(packageRoot, "prisma", "schema.prisma");
const migrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260727130000_product_domain_execution_attempt_audit_relational_v1",
  "migration.sql"
);

function resolvePackageRoot(startDirectory: string): string {
  return dirname(startDirectory);
}

test("execution-attempt audit physical schema defines the retained sanitized audit record", async () => {
  const schema = await readFile(schemaPath, "utf8");
  const migration = await readFile(migrationPath, "utf8");

  assert.equal(
    EXECUTION_ATTEMPT_AUDIT_RELATIONAL_MIGRATION_SLUG,
    "product_domain_execution_attempt_audit_relational_v1"
  );
  assert.match(schema, /enum ExecutionAttemptAuditStatus \{/);
  assert.match(schema, /model ExecutionAttemptAuditRecord \{/);
  assert.equal(
    schema.includes(`@@map("${EXECUTION_ATTEMPT_AUDIT_RELATIONAL_TABLES.executionAttemptAudit}")`),
    true
  );

  for (const indexName of EXECUTION_ATTEMPT_AUDIT_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }
  for (const columns of Object.values(EXECUTION_ATTEMPT_AUDIT_RELATIONAL_REQUIRED_COLUMNS)) {
    for (const columnName of columns) {
      assert.equal(migration.includes(`"${columnName}"`), true);
    }
  }

  assert.equal(
    migration.includes("execution_payload_snapshot"),
    false,
    "audit storage must not retain execution payload snapshots"
  );
  assert.match(migration, /jsonb_typeof\("warning_codes"\) = 'array'/);
  assert.match(migration, /execution_attempt_audit_terminal_evidence_consistent/);
  assert.equal(
    EXECUTION_ATTEMPT_AUDIT_RELATIONAL_PRISMA_MODELS.executionAttemptAuditRecord,
    "ExecutionAttemptAuditRecord"
  );
});
