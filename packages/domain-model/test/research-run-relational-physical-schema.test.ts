import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RESEARCH_RUN_RELATIONAL_INDEXES,
  RESEARCH_RUN_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_RUN_RELATIONAL_PRISMA_MODELS,
  RESEARCH_RUN_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_RUN_RELATIONAL_TABLES
} from "../src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(packageRoot, "prisma", "schema.prisma");
const migrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260727103000_product_domain_research_run_relational_v1",
  "migration.sql"
);

test("exposes research-run physical schema constants", () => {
  assert.deepEqual(RESEARCH_RUN_RELATIONAL_PRISMA_MODELS, {
    researchRunRecord: "ResearchRunRecord"
  });
  assert.deepEqual(RESEARCH_RUN_RELATIONAL_TABLES, { researchRun: "research_run" });
  assert.deepEqual(RESEARCH_RUN_RELATIONAL_INDEXES, [
    "idx_research_run_status",
    "idx_research_run_hypothesis_status",
    "idx_research_run_setup_status"
  ]);
  assert.equal(RESEARCH_RUN_RELATIONAL_MIGRATION_SLUG, "product_domain_research_run_relational_v1");
  assert.equal(RESEARCH_RUN_RELATIONAL_REQUIRED_COLUMNS.research_run[0], "research_run_id");
});

test("defines the research-run Prisma model and migration constraints", async () => {
  const [schema, migration] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readFile(migrationPath, "utf8")
  ]);

  assert.match(schema, /enum ResearchRunStatus/);
  assert.match(schema, /model ResearchRunRecord/);
  assert.match(schema, /candidateIds\s+String\[\]/);
  assert.match(migration, /CREATE TABLE "product_domain"\."research_run"/);
  assert.match(migration, /"research_run_completed_timestamp_consistent" CHECK/);
});
