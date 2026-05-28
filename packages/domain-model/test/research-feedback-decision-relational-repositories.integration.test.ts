import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  composeResearchFeedbackDecisionRelationalRepositories,
  composeSetupAggregateRelationalRepositories,
  createFirstDurableRelationalPrismaRepositories,
  createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter,
  createSetupAggregateRelationalPrismaRepositoryAdapter,
  RepositoryError,
  type FirstDurableRelationalPrismaRepositories,
  type ProductRecordMetadata,
  type ResearchFeedbackDecision,
  type ResearchFeedbackDecisionRelationalRepositories,
  type ResearchHypothesis,
  type SetupAggregateRelationalRepositories,
  type SetupAggregateResult,
  type SetupDefinition
} from "../src/index.js";
import { resolveIntegrationDatabaseUrl } from "./integration-test-helpers.js";

const INTEGRATION_DATABASE_URL = resolveIntegrationDatabaseUrl(
  process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL
);
const PRODUCT_DOMAIN_SCHEMA = "product_domain";
const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../prisma/migrations"
);
const initialMigrationSqlPath = resolve(
  migrationsDirectory,
  "20260512235500_product_domain_relational_v1_init/migration.sql"
);
const aggregateMigrationSqlPath = resolve(
  migrationsDirectory,
  "20260522153000_product_domain_setup_aggregate_relational_v1/migration.sql"
);
const feedbackDecisionMigrationSqlPath = resolve(
  migrationsDirectory,
  "20260523091500_product_domain_research_feedback_decision_relational_v1/migration.sql"
);

const metadata: ProductRecordMetadata = {
  originRunId: "run-feedback-001",
  originTransitionId: "transition-feedback-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-feedback-001",
  sourceObservedAtUtc: "2026-05-23T10:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "active",
  evidenceStatus: "supports",
  evidenceSummary: "aggregate evidence is positive",
  lastEvidenceAggregateResultId: "aggregate-001",
  lastEvidenceAssessedAt: "2026-05-23T10:00:00.000Z",
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T10:00:00.000Z"
});

const buildAggregate = (id: string, setupDefinitionId: string): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId: "hypothesis-001",
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "symbol_set",
      symbolIds: ["BTC-USDT", "ETH-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-feedback-001",
    hypothesisId: "hypothesis-001"
  },
  status: "completed",
  totalCandidates: 10,
  completedEvaluations: 8,
  invalidatedEvaluations: 2,
  averagePercentageMove: 1.42,
  averageAbsoluteMove: 115,
  averageFinalOutcome: 0.25,
  averageMaxFavorableExcursion: 2.1,
  averageMaxAdverseExcursion: -1.1,
  positiveOutcomeCount: 5,
  computedAt: "2026-05-23T10:00:00.000Z",
  createdAt: "2026-05-23T09:30:00.000Z",
  updatedAt: "2026-05-23T10:00:00.000Z"
});

const buildDecision = (
  id: string,
  setupAggregateResultId = "aggregate-001"
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId,
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "aggregate evidence supports keeping the setup active",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "10 completed evaluations with positive asymmetry",
  createdAt: "2026-05-23T10:30:00.000Z",
  updatedAt: "2026-05-23T10:30:00.000Z"
});

type IntegrationRepositories = FirstDurableRelationalPrismaRepositories &
  SetupAggregateRelationalRepositories &
  ResearchFeedbackDecisionRelationalRepositories;

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
  const [initialMigrationSql, aggregateMigrationSql, feedbackDecisionMigrationSql] =
    await Promise.all([
      readFile(initialMigrationSqlPath, "utf8"),
      readFile(aggregateMigrationSqlPath, "utf8"),
      readFile(feedbackDecisionMigrationSqlPath, "utf8")
    ]);

  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    await client.query(initialMigrationSql);
    await client.query(aggregateMigrationSql);
    await client.query(feedbackDecisionMigrationSql);
  });
};

const withIntegrationRepositories = async <T>(
  connectionString: string,
  work: (repositories: IntegrationRepositories) => Promise<T>
): Promise<T> => {
  await resetProductDomainSchema(connectionString);

  const firstDurableRepositories = createFirstDurableRelationalPrismaRepositories({
    connectionString
  });
  const aggregateRepositories = composeSetupAggregateRelationalRepositories(
    createSetupAggregateRelationalPrismaRepositoryAdapter(firstDurableRepositories.prismaClient)
  );
  const feedbackRepositories = composeResearchFeedbackDecisionRelationalRepositories(
    createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter(
      firstDurableRepositories.prismaClient
    )
  );

  try {
    return await work({
      ...firstDurableRepositories,
      ...aggregateRepositories,
      ...feedbackRepositories
    });
  } finally {
    await firstDurableRepositories.disconnect();
    await dropProductDomainSchema(connectionString);
  }
};

const integrationTest = INTEGRATION_DATABASE_URL ? test : test.skip;

integrationTest(
  "feedback-decision repositories persist the durable relational feedback slice against real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001"),
        metadata
      });

      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildDecision("feedback-001"),
        metadata
      });

      const updated = await repositories.researchFeedbackDecisionRepository.updateStatus({
        researchFeedbackDecisionId: "feedback-001",
        status: "accepted",
        reviewerMetadata: {
          reviewedBy: "reviewer-001",
          reviewedAt: "2026-05-23T11:00:00.000Z",
          approvalOutcome: "approved"
        },
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-23T11:00:00.000Z"
        },
        expectedVersion: 1
      });
      const directRows = await repositories.prismaClient.researchFeedbackDecisionRecord.findMany({
        orderBy: { researchFeedbackDecisionId: "asc" }
      });

      assert.equal(updated?.decisionStatus, "accepted");
      assert.equal(updated?.reviewerMetadata?.reviewedBy, "reviewer-001");
      assert.equal(directRows.length, 1);
      assert.equal(directRows[0]?.decisionStatus, "accepted");
    });
  }
);

integrationTest("feedback-decision repositories map invalid aggregate references from real Postgres", async () => {
  await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
    await repositories.setupDefinitionRepository.create({
      definition: buildSetupDefinition("setup-001"),
      metadata
    });
    await repositories.researchHypothesisRepository.create({
      hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
      metadata
    });

    await assert.rejects(
      async () =>
        repositories.researchFeedbackDecisionRepository.create({
          decision: buildDecision("feedback-001", "aggregate-404"),
          metadata
        }),
      (error: unknown) =>
        error instanceof RepositoryError &&
        error.code === "invalid_reference" &&
        error.referenceEntityType === "setup_aggregate_result" &&
        error.referenceEntityId === "aggregate-404"
    );
  });
});
