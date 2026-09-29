import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createImplementedProductRelationalPrismaRepositories,
  type ImplementedProductRelationalPrismaRepositories,
  type ProductRecordMetadata,
  type ResearchReviewDecision,
  type SetupDefinition,
  type SetupDefinitionRevision,
} from "@monitor/domain-model";
import { Client } from "pg";

import { executeResearchWorkflowCommand } from "../src/index.js";

const PRODUCT_DOMAIN_SCHEMA = "product_domain";
const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/domain-model/prisma/migrations",
);

const resolveIntegrationDatabaseUrl = (rawValue: string | undefined): string => {
  const connectionString = rawValue?.trim() ?? "";
  if (!connectionString) {
    return "";
  }
  const databaseName = decodeURIComponent(new URL(connectionString).pathname.replace(/^\/+/, ""));
  if (!["test", "integration", "ci"].some((hint) => databaseName.toLowerCase().includes(hint))) {
    throw new Error("PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL must use a disposable database");
  }
  return connectionString;
};

const integrationDatabaseUrl = resolveIntegrationDatabaseUrl(
  process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL,
);
const integrationTest = integrationDatabaseUrl ? test : test.skip;

const withClient = async (connectionString: string, work: (client: Client) => Promise<void>) => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await work(client);
  } finally {
    await client.end();
  }
};

const resetSchema = async (connectionString: string): Promise<void> => {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const migrationPaths = entries
    .filter((entry) => entry.isDirectory() && entry.name.includes("product_domain"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => resolve(migrationsDirectory, entry.name, "migration.sql"));
  const migrations = await Promise.all(migrationPaths.map((path) => readFile(path, "utf8")));

  await withClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    for (const migration of migrations) {
      await client.query(migration);
    }
  });
};

const withRepositories = async (
  work: (repositories: ImplementedProductRelationalPrismaRepositories) => Promise<void>,
) => {
  await resetSchema(integrationDatabaseUrl);
  const repositories = createImplementedProductRelationalPrismaRepositories({
    connectionString: integrationDatabaseUrl,
  });
  try {
    await work(repositories);
  } finally {
    await repositories.disconnect();
    await withClient(integrationDatabaseUrl, async (client) => {
      await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    });
  }
};

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "research-workflow-integration",
  sourceObservedAtUtc: "2026-09-29T10:00:00.000Z",
};

const reviewDecision: ResearchReviewDecision = {
  id: "review-decision-integration-001",
  researchReviewPacketId: "review-packet-integration-001",
  setupFamilyId: "setup-family-integration-001",
  setupRevisionId: "setup-revision-integration-001",
  reviewedBy: "reviewer-integration-001",
  reviewedAt: "2026-09-29T10:00:00.000Z",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_activation_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-09-29T10:00:00.000Z",
  updatedAt: "2026-09-29T10:00:00.000Z",
};

const setupDefinition: SetupDefinition = {
  id: "setup-definition-integration-001",
  name: "Integration activation target",
  description: "A disposable setup used to verify the one-shot research workflow.",
  status: "draft",
  measurableConditions: ["One explicit integration condition."],
  evaluationAssumptions: ["The integration database is disposable."],
  invalidationAssumptions: ["The test remains isolated from production data."],
  createdAt: "2026-09-29T09:55:00.000Z",
  updatedAt: "2026-09-29T09:55:00.000Z",
};

const setupRevision: SetupDefinitionRevision = {
  id: "setup-revision-integration-001",
  setupDefinitionId: setupDefinition.id,
  versionInfo: {
    setupFamilyId: "setup-family-integration-001",
    revisionId: "setup-revision-integration-001",
    version: 1,
  },
  revisionReason: "Validate the one-shot activation workflow.",
  revisionStatus: "accepted",
  changedFieldsSummary: "Integration-only activation revision.",
  createdBy: "reviewer-integration-001",
  createdAt: "2026-09-29T09:55:00.000Z",
  updatedAt: "2026-09-29T09:55:00.000Z",
};

integrationTest("persists route, preparation, and audited execution through real Postgres", async () => {
  await withRepositories(async (repositories) => {
    await repositories.setupDefinitionRepository.create({ definition: setupDefinition, metadata });
    await repositories.setupDefinitionRevisionRepository.create({ revision: setupRevision, metadata });
    await repositories.researchReviewDecisionRepository.create({
      decision: reviewDecision,
      metadata,
    });

    const route = await executeResearchWorkflowCommand(
      {
        name: "route",
        researchReviewDecisionId: reviewDecision.id,
        routedAt: "2026-09-29T10:01:00.000Z",
      },
      repositories,
    );
    assert.equal(route.status, "routed");
    assert.ok(route.routingId);

    const preparation = await executeResearchWorkflowCommand(
      {
        name: "prepare",
        reviewDecisionRoutingResultId: route.routingId,
        targetEntityRefs: { setupRevisionId: setupRevision.id },
        preparedBy: "operator-integration-001",
        preparedAt: "2026-09-29T10:02:00.000Z",
      },
      repositories,
    );
    assert.equal(preparation.status, "prepared");
    assert.ok(preparation.envelopeId);

    const execution = await executeResearchWorkflowCommand(
      {
        name: "execute",
        routedActionExecutionEnvelopeId: preparation.envelopeId,
        attemptId: "execution-attempt-integration-001",
        attemptedBy: "operator-integration-001",
        attemptedAt: "2026-09-29T10:03:00.000Z",
        executedBy: "reviewer-integration-001",
        executedAt: "2026-09-29T10:03:01.000Z",
      },
      repositories,
    );
    assert.equal(execution.status, "executed");
    assert.equal(
      (await repositories.executionAttemptAuditRepository.getById(
        "execution-attempt-integration-001",
      ))?.status,
      "executed",
    );
    assert.ok(await repositories.reviewDecisionRoutingResultRepository.getById(route.routingId));
    assert.ok(
      await repositories.routedActionExecutionEnvelopeRepository.getById(preparation.envelopeId),
    );
    assert.equal(
      (await repositories.setupDefinitionRepository.getById(setupDefinition.id))?.status,
      "active",
    );
    assert.equal(
      (await repositories.setupRevisionActivationRecordRepository.listBySetupFamilyId(
        setupRevision.versionInfo.setupFamilyId,
      )).length,
      1,
    );
  });
});
