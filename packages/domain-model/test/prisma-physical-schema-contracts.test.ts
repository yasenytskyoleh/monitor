import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA,
  FIRST_DURABLE_RELATIONAL_INDEXES,
  FIRST_DURABLE_RELATIONAL_MIGRATION_SLUG,
  FIRST_DURABLE_RELATIONAL_PRISMA_MODELS,
  FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS,
  FIRST_DURABLE_RELATIONAL_TABLES
} from "../src/index.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(testDirectory, "..");
const schemaPath = join(packageRoot, "prisma", "schema.prisma");
const migrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260512235500_product_domain_relational_v1_init",
  "migration.sql"
);

test("exposes first durable relational physical schema constants", () => {
  assert.equal(FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA, "product_domain");
  assert.equal(FIRST_DURABLE_RELATIONAL_MIGRATION_SLUG, "product_domain_relational_v1_init");
  assert.equal(FIRST_DURABLE_RELATIONAL_PRISMA_MODELS.setupDefinitionRecord, "SetupDefinitionRecord");
  assert.equal(FIRST_DURABLE_RELATIONAL_TABLES.setupDefinition, "setup_definition");
  assert.equal(
    FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS.research_hypothesis_setup_definition_link.includes(
      "linked_at_utc"
    ),
    true
  );
  assert.equal(
    FIRST_DURABLE_RELATIONAL_INDEXES.includes("idx_research_hypothesis_hypothesis_status"),
    true
  );
});

test("prisma schema defines the first durable relational models in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /schemas\s+=\s+\["product_domain"\]/);
  assert.match(schema, /model SetupDefinitionRecord \{/);
  assert.match(schema, /model ResearchHypothesisRecord \{/);
  assert.match(schema, /model ResearchHypothesisSetupDefinitionLinkRecord \{/);
  assert.match(schema, /@@map\("setup_definition"\)/);
  assert.match(schema, /@@map\("research_hypothesis"\)/);
  assert.match(schema, /@@map\("research_hypothesis_setup_definition_link"\)/);
  assert.match(schema, /@@schema\("product_domain"\)/);

  for (const tableName of Object.values(FIRST_DURABLE_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(FIRST_DURABLE_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the first durable relational tables, indexes, and key constraints", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS "product_domain";/);

  for (const tableName of Object.values(FIRST_DURABLE_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of FIRST_DURABLE_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS)) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /PRIMARY KEY \("research_hypothesis_id", "setup_definition_id"\)/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /CHECK \(cardinality\("measurable_conditions"\) > 0\)/
  );
  assert.match(
    migration,
    /CHECK \(cardinality\("assumptions"\) > 0\)/
  );
});
