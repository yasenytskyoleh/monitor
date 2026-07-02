import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  createFirstDurableRelationalPrismaRepositories,
  RepositoryError,
  type FirstDurableRelationalPrismaRepositories,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupDefinition
} from "../src/index.js";
import { resolveIntegrationDatabaseUrl } from "./integration-test-helpers.js";

const INTEGRATION_DATABASE_URL = resolveIntegrationDatabaseUrl(
  process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL
);
const PRODUCT_DOMAIN_SCHEMA = "product_domain";
const migrationSqlPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../prisma/migrations/20260512235500_product_domain_relational_v1_init/migration.sql"
);

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-14T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "draft",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-14T08:00:00.000Z",
  updatedAt: "2026-05-14T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string, setupDefinitionIds: string[]): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: [...setupDefinitionIds],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "draft",
  createdAt: "2026-05-14T08:00:00.000Z",
  updatedAt: "2026-05-14T09:00:00.000Z"
});

const withPgClient = async <T>(connectionString: string, work: (client: Client) => Promise<T>): Promise<T> => {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    return await work(client);
  } finally {
    await client.end();
  }
};

const dropProductDomainSchema = async (connectionString: string): Promise<void> => {
  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
  });
};

const resetProductDomainSchema = async (connectionString: string): Promise<void> => {
  const migrationSql = await readFile(migrationSqlPath, "utf8");

  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    await client.query(migrationSql);
  });
};

const withIntegrationRepositories = async <T>(
  connectionString: string,
  work: (repositories: FirstDurableRelationalPrismaRepositories) => Promise<T>
): Promise<T> => {
  await resetProductDomainSchema(connectionString);

  const repositories = createFirstDurableRelationalPrismaRepositories({
    connectionString
  });

  try {
    return await work(repositories);
  } finally {
    await repositories.disconnect();
    await dropProductDomainSchema(connectionString);
  }
};

const integrationTest = INTEGRATION_DATABASE_URL ? test : test.skip;

integrationTest("shared Prisma repository bundle persists the first durable slice against real Postgres", async () => {
  await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
    await repositories.setupDefinitionRepository.create({
      definition: buildSetupDefinition("setup-001"),
      metadata
    });
    await repositories.setupDefinitionRepository.create({
      definition: buildSetupDefinition("setup-002"),
      metadata
    });

    const createdHypothesis = await repositories.researchHypothesisRepository.create({
      hypothesis: buildResearchHypothesis("hypothesis-001", ["setup-001"]),
      metadata
    });
    const updatedHypothesis = await repositories.researchHypothesisRepository.update({
      hypothesis: {
        ...buildResearchHypothesis("hypothesis-001", ["setup-001", "setup-002"]),
        notes: ["validated through integration test"],
        status: "active",
        updatedAt: "2026-05-14T10:00:00.000Z"
      },
      metadata: {
        ...metadata,
        sourceObservedAtUtc: "2026-05-14T10:00:00.000Z"
      },
      expectedVersion: 1
    });
    const directSetupRows = await repositories.prismaClient.setupDefinitionRecord.findMany({
      orderBy: { setupDefinitionId: "asc" }
    });

    assert.equal(createdHypothesis.relatedSetupDefinitionIds.length, 1);
    assert.deepEqual(updatedHypothesis.relatedSetupDefinitionIds, ["setup-001", "setup-002"]);
    assert.equal(updatedHypothesis.status, "active");
    assert.equal(directSetupRows.length, 2);
  });
});

integrationTest("shared Prisma repository bundle maps invalid setup links from real Postgres", async () => {
  await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
    await assert.rejects(
      async () =>
        repositories.researchHypothesisRepository.create({
          hypothesis: buildResearchHypothesis("hypothesis-001", ["setup-404"]),
          metadata
        }),
      (error: unknown) =>
        error instanceof RepositoryError &&
        error.code === "invalid_reference" &&
        error.referenceEntityType === "setup_definition" &&
        error.referenceEntityId === "setup-404"
    );
  });
});
