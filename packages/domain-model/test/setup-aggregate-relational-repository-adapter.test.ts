import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemorySetupAggregateRelationalRepositoryAdapter,
  RelationalResearchHypothesisRepository,
  RelationalSetupDefinitionRepository,
  RepositoryError,
  dehydrateSetupAggregateResultToDurableRecord,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-aggregate-001",
  originTransitionId: "transition-aggregate-001",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-aggregate-001",
  sourceObservedAtUtc: "2026-05-22T16:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-22T14:00:00.000Z",
  updatedAt: "2026-05-22T15:00:00.000Z"
});

const buildResearchHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "active",
  createdAt: "2026-05-22T14:00:00.000Z",
  updatedAt: "2026-05-22T15:00:00.000Z"
});

const buildAggregate = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId = "hypothesis-001"
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
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
    researchRunId: "run-aggregate-001",
    hypothesisId: researchHypothesisId
  },
  status: "pending",
  totalCandidates: 0,
  completedEvaluations: 0,
  invalidatedEvaluations: 0,
  averagePercentageMove: null,
  averageAbsoluteMove: null,
  averageFinalOutcome: null,
  averageMaxFavorableExcursion: null,
  averageMaxAdverseExcursion: null,
  positiveOutcomeCount: 0,
  computedAt: null,
  createdAt: "2026-05-22T15:00:00.000Z",
  updatedAt: "2026-05-22T15:00:00.000Z"
});

const createReferenceRepositories = async () => {
  const referenceAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupDefinitionRepository = new RelationalSetupDefinitionRepository(referenceAdapter);
  const researchHypothesisRepository = new RelationalResearchHypothesisRepository(referenceAdapter);

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
    metadata
  });

  return referenceAdapter;
};

test("in-memory aggregate adapter enforces unique setup/scope pairs", async () => {
  const referenceAdapter = await createReferenceRepositories();
  const adapter = new InMemorySetupAggregateRelationalRepositoryAdapter(referenceAdapter);

  await adapter.insertSetupAggregateResultRecord({
    record: dehydrateSetupAggregateResultToDurableRecord(
      buildAggregate("aggregate-001", "setup-001"),
      metadata,
      1
    ),
    expectedVersion: null
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupAggregateResultRecord({
        record: dehydrateSetupAggregateResultToDurableRecord(
          buildAggregate("aggregate-002", "setup-001"),
          metadata,
          1
        ),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_aggregate_result"
  );
});

test("in-memory aggregate adapter reports version mismatches on update", async () => {
  const referenceAdapter = await createReferenceRepositories();
  const adapter = new InMemorySetupAggregateRelationalRepositoryAdapter(referenceAdapter);

  await adapter.insertSetupAggregateResultRecord({
    record: dehydrateSetupAggregateResultToDurableRecord(
      buildAggregate("aggregate-001", "setup-001"),
      metadata,
      1
    ),
    expectedVersion: null
  });

  await assert.rejects(
    async () =>
      adapter.updateSetupAggregateResultRecord({
        record: dehydrateSetupAggregateResultToDurableRecord(
          {
            ...buildAggregate("aggregate-001", "setup-001"),
            status: "partial",
            updatedAt: "2026-05-22T17:00:00.000Z"
          },
          metadata,
          2
        ),
        expectedVersion: 4
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "setup_aggregate_result" &&
      error.expectedVersion === 4 &&
      error.actualVersion === 1
  );
});
