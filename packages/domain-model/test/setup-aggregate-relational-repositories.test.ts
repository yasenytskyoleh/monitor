import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSetupAggregateRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemorySetupAggregateRelationalRepositoryAdapter,
  RelationalResearchHypothesisRepository,
  RelationalSetupAggregateResultRepository,
  RelationalSetupDefinitionRepository,
  RepositoryError,
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

const createRepositoryFixture = async () => {
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

  const aggregateAdapter = new InMemorySetupAggregateRelationalRepositoryAdapter(referenceAdapter);

  return {
    aggregateRepository: new RelationalSetupAggregateResultRepository(aggregateAdapter),
    composedRepositories: composeSetupAggregateRelationalRepositories(aggregateAdapter)
  };
};

test("relational setup-aggregate repository persists updates and lookup-by-scope", async () => {
  const { aggregateRepository } = await createRepositoryFixture();

  await aggregateRepository.create({
    aggregate: buildAggregate("aggregate-001", "setup-001"),
    metadata
  });

  const updated = await aggregateRepository.update({
    aggregate: {
      ...buildAggregate("aggregate-001", "setup-001"),
      status: "completed",
      totalCandidates: 8,
      completedEvaluations: 7,
      invalidatedEvaluations: 1,
      averagePercentageMove: 1.5,
      averageAbsoluteMove: 120,
      averageFinalOutcome: 0.3,
      averageMaxFavorableExcursion: 2.1,
      averageMaxAdverseExcursion: -1.2,
      positiveOutcomeCount: 4,
      computedAt: "2026-05-22T17:00:00.000Z",
      notes: "completed through relational repository test",
      updatedAt: "2026-05-22T17:00:00.000Z"
    },
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-22T17:00:00.000Z"
    },
    expectedVersion: 1
  });
  const byScope = await aggregateRepository.getBySetupDefinitionAndScope(
    "setup-001",
    buildAggregate("aggregate-001", "setup-001").aggregationScope
  );
  const completed = await aggregateRepository.listByStatus(["completed"]);

  assert.equal(updated.status, "completed");
  assert.equal(byScope?.id, "aggregate-001");
  assert.equal(completed.length, 1);
  assert.equal(completed[0]?.notes, "completed through relational repository test");
});

test("aggregate repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = await createRepositoryFixture();

  await composedRepositories.setupAggregateResultRepository.create({
    aggregate: buildAggregate("aggregate-002", "setup-001"),
    metadata
  });

  const stored = await composedRepositories.setupAggregateResultRepository.getById("aggregate-002");

  assert.equal(stored?.setupDefinitionId, "setup-001");
});

test("relational setup-aggregate repository surfaces invalid hypothesis references", async () => {
  const referenceAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupDefinitionRepository = new RelationalSetupDefinitionRepository(referenceAdapter);
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });

  const aggregateRepository = new RelationalSetupAggregateResultRepository(
    new InMemorySetupAggregateRelationalRepositoryAdapter(referenceAdapter)
  );

  await assert.rejects(
    async () =>
      aggregateRepository.create({
        aggregate: buildAggregate("aggregate-003", "setup-001", "hypothesis-404"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_aggregate_result" &&
      error.referenceEntityType === "research_hypothesis" &&
      error.referenceEntityId === "hypothesis-404"
  );
});
