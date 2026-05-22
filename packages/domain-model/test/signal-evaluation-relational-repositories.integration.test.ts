import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  composeFirstDurableRelationalRepositories,
  composeSignalEvaluationRelationalRepositories,
  createFirstDurableRelationalPrismaClient,
  PrismaFirstDurableRelationalRepositoryAdapter,
  PrismaSignalEvaluationRelationalRepositoryAdapter,
  RepositoryError,
  type EvaluationResult,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SignalCandidate
} from "../src/index.js";

const INTEGRATION_DATABASE_URL = process.env.PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL?.trim() ?? "";
const PRODUCT_DOMAIN_SCHEMA = "product_domain";
const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");
const firstSliceMigrationSqlPath = resolve(
  migrationsDirectory,
  "20260512235500_product_domain_relational_v1_init",
  "migration.sql"
);
const signalEvaluationMigrationSqlPath = resolve(
  migrationsDirectory,
  "20260522101500_product_domain_signal_evaluation_relational_v1",
  "migration.sql"
);

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-22T09:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-22T08:00:00.000Z",
  updatedAt: "2026-05-22T09:00:00.000Z"
});

const buildSignalCandidate = (id: string, setupDefinitionId: string): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId: `${setupDefinitionId}-rev-001`,
  monitoredSymbolId: "BTC-USDT",
  status: "detected",
  detectedAt: "2026-05-22T09:15:00.000Z",
  evidenceSummary: "4h breakout retest with volume expansion",
  createdAt: "2026-05-22T09:15:00.000Z",
  updatedAt: "2026-05-22T09:15:00.000Z"
});

const buildEvaluationResult = (
  id: string,
  signalCandidateId: string,
  evaluationWindowId: string
): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId,
  status: "pending",
  referencePrice: null,
  finalPrice: null,
  highInWindow: null,
  lowInWindow: null,
  absoluteMove: null,
  percentageMove: null,
  maxFavorableExcursion: null,
  maxAdverseExcursion: null,
  evaluatedAt: null,
  createdAt: "2026-05-22T09:30:00.000Z",
  updatedAt: "2026-05-22T09:30:00.000Z"
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
  const firstSliceMigrationSql = await readFile(firstSliceMigrationSqlPath, "utf8");
  const signalEvaluationMigrationSql = await readFile(signalEvaluationMigrationSqlPath, "utf8");

  await withPgClient(connectionString, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS "${PRODUCT_DOMAIN_SCHEMA}" CASCADE`);
    await client.query(firstSliceMigrationSql);
    await client.query(signalEvaluationMigrationSql);
  });
};

type IntegratedRepositories = ReturnType<typeof createIntegratedRepositories>;

const createIntegratedRepositories = (connectionString: string) => {
  const prismaClient = createFirstDurableRelationalPrismaClient({
    connectionString
  });
  const firstSliceAdapter = new PrismaFirstDurableRelationalRepositoryAdapter(prismaClient);
  const signalEvaluationAdapter = new PrismaSignalEvaluationRelationalRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    ...composeFirstDurableRelationalRepositories(firstSliceAdapter),
    ...composeSignalEvaluationRelationalRepositories(signalEvaluationAdapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};

const withIntegratedRepositories = async <T>(
  connectionString: string,
  work: (repositories: IntegratedRepositories) => Promise<T>
): Promise<T> => {
  await resetProductDomainSchema(connectionString);

  const repositories = createIntegratedRepositories(connectionString);

  try {
    return await work(repositories);
  } finally {
    await repositories.disconnect();
    await dropProductDomainSchema(connectionString);
  }
};

const integrationTest = INTEGRATION_DATABASE_URL ? test : test.skip;

integrationTest(
  "shared Prisma client persists signal/evaluation repositories against real Postgres",
  async () => {
    await withIntegratedRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await repositories.setupDefinitionRepository.create({
        definition: buildSetupDefinition("setup-001"),
        metadata
      });

      await repositories.signalCandidateRepository.create({
        candidate: buildSignalCandidate("candidate-001", "setup-001"),
        metadata
      });
      const evaluatedCandidate = await repositories.signalCandidateRepository.updateStatus({
        signalCandidateId: "candidate-001",
        status: "under_review",
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-05-22T10:00:00.000Z"
        },
        expectedVersion: 1
      });

      await repositories.evaluationResultRepository.create({
        result: buildEvaluationResult("result-001", "candidate-001", "window-24h"),
        metadata
      });
      const completedResult = await repositories.evaluationResultRepository.update({
        result: {
          ...buildEvaluationResult("result-001", "candidate-001", "window-24h"),
          status: "completed",
          referencePrice: 65000,
          finalPrice: 65800,
          highInWindow: 66400,
          lowInWindow: 64100,
          absoluteMove: 800,
          percentageMove: 1.230769,
          maxFavorableExcursion: 2.15,
          maxAdverseExcursion: -1.38,
          evaluatedAt: "2026-05-23T09:30:00.000Z",
          notes: "completed through integration test",
          updatedAt: "2026-05-23T09:30:00.000Z"
        },
        metadata: {
          ...metadata,
          lastUpdatedBySource: "evaluation_pipeline",
          sourceObservedAtUtc: "2026-05-23T09:30:00.000Z"
        },
        expectedVersion: 1
      });

      const signalRows = await repositories.prismaClient.signalCandidateRecord.findMany({
        orderBy: { signalCandidateId: "asc" }
      });
      const evaluationRows = await repositories.prismaClient.evaluationResultRecord.findMany({
        orderBy: { evaluationResultId: "asc" }
      });

      assert.equal(evaluatedCandidate?.status, "under_review");
      assert.equal(completedResult.status, "completed");
      assert.equal(signalRows.length, 1);
      assert.equal(signalRows[0]?.setupDefinitionId, "setup-001");
      assert.equal(evaluationRows.length, 1);
      assert.equal(evaluationRows[0]?.evaluationStatus, "completed");
    });
  }
);

integrationTest(
  "shared Prisma client maps invalid setup references for signal candidates from real Postgres",
  async () => {
    await withIntegratedRepositories(INTEGRATION_DATABASE_URL, async (repositories) => {
      await assert.rejects(
        async () =>
          repositories.signalCandidateRepository.create({
            candidate: buildSignalCandidate("candidate-404", "setup-missing"),
            metadata
          }),
        (error: unknown) =>
          error instanceof RepositoryError &&
          error.code === "invalid_reference" &&
          error.referenceEntityType === "setup_definition" &&
          error.referenceEntityId === "setup-missing"
      );
    });
  }
);
