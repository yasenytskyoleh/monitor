import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  createImplementedProductRelationalPrismaRepositories,
  type EvaluationResult,
  type ImplementedProductRelationalPrismaRepositories,
  type ProductRecordMetadata,
  RepositoryError,
  type ResearchDecisionApproval,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition,
  type SignalCandidate
} from "../src/index.js";

const INTEGRATION_DATABASE_URL = process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL?.trim() ?? "";
const PRODUCT_DOMAIN_SCHEMA = "product_domain";
const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../prisma/migrations"
);
const migrationSqlPaths = [
  resolve(migrationsDirectory, "20260512235500_product_domain_relational_v1_init/migration.sql"),
  resolve(
    migrationsDirectory,
    "20260522101500_product_domain_signal_evaluation_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260522153000_product_domain_setup_aggregate_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260523091500_product_domain_research_feedback_decision_relational_v1/migration.sql"
  ),
  resolve(
    migrationsDirectory,
    "20260527103000_product_domain_research_decision_approval_relational_v1/migration.sql"
  )
];

const metadata: ProductRecordMetadata = {
  originRunId: "run-002",
  originTransitionId: "transition-002",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-002",
  sourceObservedAtUtc: "2026-05-23T09:00:00.000Z"
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
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildSignalCandidate = (id: string, setupDefinitionId: string): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-rev-001`,
  monitoredSymbolId: "BTC-USDT",
  status: "evaluated",
  detectedAt: "2026-05-23T09:30:00.000Z",
  evidenceSummary: "Breakout retest candidate",
  createdAt: "2026-05-23T09:30:00.000Z",
  updatedAt: "2026-05-23T09:30:00.000Z"
});

const buildEvaluationResult = (id: string, signalCandidateId: string): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId: "window-24h",
  status: "completed",
  referencePrice: 100,
  finalPrice: 103,
  highInWindow: 104,
  lowInWindow: 99,
  absoluteMove: 3,
  percentageMove: 3,
  maxFavorableExcursion: 4,
  maxAdverseExcursion: -1,
  evaluatedAt: "2026-05-24T09:30:00.000Z",
  createdAt: "2026-05-24T09:30:00.000Z",
  updatedAt: "2026-05-24T09:30:00.000Z"
});

const buildAggregate = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "single_symbol",
      symbolIds: ["BTC-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-aggregate-002",
    hypothesisId: researchHypothesisId
  },
  status: "completed",
  totalCandidates: 1,
  completedEvaluations: 1,
  invalidatedEvaluations: 0,
  averagePercentageMove: 3,
  averageAbsoluteMove: 3,
  averageFinalOutcome: 1,
  averageMaxFavorableExcursion: 4,
  averageMaxAdverseExcursion: -1,
  positiveOutcomeCount: 1,
  computedAt: "2026-05-24T10:00:00.000Z",
  notes: "shared bundle integration test",
  createdAt: "2026-05-24T10:00:00.000Z",
  updatedAt: "2026-05-24T10:00:00.000Z"
});

const buildFeedbackDecision = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string,
  setupAggregateResultId: string
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  setupAggregateResultId,
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "aggregate evidence supports keeping the setup active",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "shared bundle integration feedback decision",
  createdAt: "2026-05-24T10:15:00.000Z",
  updatedAt: "2026-05-24T10:15:00.000Z"
});

const buildApproval = (
  id: string,
  researchFeedbackDecisionId: string,
  setupDefinitionId: string
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-24T10:35:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved in shared integration test.",
  approvalStatus: "recorded",
  authorizedNextAction: "keep_active",
  createdAt: "2026-05-24T10:35:00.000Z",
  updatedAt: "2026-05-24T10:35:00.000Z"
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
  const migrationSqlList = await Promise.all(
    migrationSqlPaths.map((migrationSqlPath) => readFile(migrationSqlPath, "utf8"))
  );

  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    for (const migrationSql of migrationSqlList) {
      await client.query(migrationSql);
    }
  });
};

const withIntegrationRepositories = async <T>(
  connectionString: string,
  work: (repositories: ImplementedProductRelationalPrismaRepositories) => Promise<T>
): Promise<T> => {
  await resetProductDomainSchema(connectionString);

  const repositories = createImplementedProductRelationalPrismaRepositories({
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

integrationTest(
  "shared implemented-product bundle persists setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval against real Postgres",
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
      await repositories.signalCandidateRepository.create({
        candidate: buildSignalCandidate("candidate-001", "setup-001"),
        metadata
      });
      await repositories.evaluationResultRepository.create({
        result: buildEvaluationResult("result-001", "candidate-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-001",
          "setup-001",
          "hypothesis-001",
          "aggregate-001"
        ),
        metadata
      });
      const updatedFeedbackDecision =
        await repositories.researchFeedbackDecisionRepository.updateStatus({
          researchFeedbackDecisionId: "feedback-001",
          status: "accepted",
          reviewerMetadata: {
            reviewedBy: "reviewer-001",
            reviewedAt: "2026-05-24T10:30:00.000Z",
            approvalOutcome: "approved"
          },
          metadata: {
            ...metadata,
            sourceObservedAtUtc: "2026-05-24T10:30:00.000Z"
          },
          expectedVersion: 1
        });
      const createdApproval = await repositories.researchDecisionApprovalRepository.create({
        approval: buildApproval("approval-001", "feedback-001", "setup-001"),
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-24T10:35:00.000Z"
        }
      });

      const storedCandidate = await repositories.signalCandidateRepository.getById("candidate-001");
      const storedEvaluation =
        await repositories.evaluationResultRepository.getBySignalCandidateAndWindow(
          "candidate-001",
          "window-24h"
        );
      const storedAggregate =
        await repositories.setupAggregateResultRepository.getBySetupDefinitionAndScope(
          "setup-001",
          buildAggregate("aggregate-001", "setup-001", "hypothesis-001").aggregationScope
        );
      const storedFeedbackDecision =
        await repositories.researchFeedbackDecisionRepository.getById("feedback-001");
      const storedApproval =
        await repositories.researchDecisionApprovalRepository.getById("approval-001");
      const aggregateRows = await repositories.prismaClient.setupAggregateResultRecord.findMany({
        orderBy: { setupAggregateResultId: "asc" }
      });
      const feedbackDecisionRows =
        await repositories.prismaClient.researchFeedbackDecisionRecord.findMany({
          orderBy: { researchFeedbackDecisionId: "asc" }
        });
      const approvalRows = await repositories.prismaClient.researchDecisionApprovalRecord.findMany({
        orderBy: { researchDecisionApprovalId: "asc" }
      });

      assert.equal(storedCandidate?.setupDefinitionId, "setup-001");
      assert.equal(storedEvaluation?.id, "result-001");
      assert.equal(storedAggregate?.status, "completed");
      assert.equal(updatedFeedbackDecision?.decisionStatus, "accepted");
      assert.equal(storedFeedbackDecision?.reviewerMetadata?.reviewedBy, "reviewer-001");
      assert.equal(createdApproval.approvalOutcome, "approved");
      assert.equal(storedApproval?.authorizedNextAction, "keep_active");
      assert.equal(aggregateRows.length, 1);
      assert.equal(aggregateRows[0]?.completedEvaluations, 1);
      assert.equal(feedbackDecisionRows.length, 1);
      assert.equal(feedbackDecisionRows[0]?.decisionStatus, "accepted");
      assert.equal(approvalRows.length, 1);
      assert.equal(approvalRows[0]?.researchFeedbackDecisionId, "feedback-001");
      assert.equal(approvalRows[0]?.authorizedNextAction, "keep_active");
    });
  }
);

integrationTest(
  "shared implemented-product bundle maps invalid approval setup linkage from real Postgres",
  async () => {
    await withIntegrationRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-002"),
        metadata
      });
      await repositories.researchHypothesisRepository.create({
        hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
        metadata
      });
      await repositories.setupAggregateResultRepository.create({
        aggregate: buildAggregate("aggregate-001", "setup-001", "hypothesis-001"),
        metadata
      });
      await repositories.researchFeedbackDecisionRepository.create({
        decision: buildFeedbackDecision(
          "feedback-001",
          "setup-001",
          "hypothesis-001",
          "aggregate-001"
        ),
        metadata
      });

      await assert.rejects(
        async () =>
          repositories.researchDecisionApprovalRepository.create({
            approval: buildApproval("approval-002", "feedback-001", "setup-002"),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.entityType === "research_decision_approval" &&
          error.referenceEntityType === "research_feedback_decision" &&
          error.referenceEntityId === "feedback-001"
      );
    });
  }
);
