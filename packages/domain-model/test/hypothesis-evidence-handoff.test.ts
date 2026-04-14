import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  createAggregateToHypothesisEvidenceHandoff,
  createResearchService,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-hypothesis-evidence",
  originTransitionId: "transition-hypothesis-evidence",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-hypothesis-evidence",
  sourceObservedAtUtc: "2026-04-22T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Hypothesis evidence setup",
  description: "Setup for aggregate-to-hypothesis handoff tests",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-22T10:00:00.000Z",
  updatedAt: "2026-04-22T10:00:00.000Z"
});

const buildResearchHypothesis = (
  id: string,
  setupDefinitionId: string
): ResearchHypothesis => ({
  id,
  title: "Aggregate evidence hypothesis",
  description: "Completed aggregate evidence should influence hypothesis evidence state.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["positive aggregate outcomes should support the hypothesis"],
  notes: [],
  status: "active",
  createdAt: "2026-04-22T10:00:00.000Z",
  updatedAt: "2026-04-22T10:00:00.000Z"
});

type AggregateMetricOverrides = {
  completedEvaluations: number;
  positiveOutcomeCount: number;
  averageFinalOutcome: number | null;
  averagePercentageMove: number | null;
};

const buildAggregateResult = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string | undefined,
  status: SetupAggregateResult["status"],
  metrics: AggregateMetricOverrides,
  evaluationWindowId = "window-24h"
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId,
    symbolScope: {
      kind: "single_symbol",
      symbolIds: ["BTC-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-04-01T00:00:00.000Z",
      endAtUtc: "2026-04-30T23:59:59.000Z"
    }
  },
  status,
  totalCandidates: metrics.completedEvaluations,
  completedEvaluations: metrics.completedEvaluations,
  invalidatedEvaluations: 0,
  averagePercentageMove: metrics.averagePercentageMove,
  averageAbsoluteMove: metrics.averagePercentageMove,
  averageFinalOutcome: metrics.averageFinalOutcome,
  averageMaxFavorableExcursion: metrics.averagePercentageMove,
  averageMaxAdverseExcursion: metrics.averagePercentageMove === null ? null : -Math.abs(metrics.averagePercentageMove),
  positiveOutcomeCount: metrics.positiveOutcomeCount,
  computedAt: status === "completed" ? "2026-04-22T11:00:00.000Z" : null,
  createdAt: "2026-04-22T11:00:00.000Z",
  updatedAt: "2026-04-22T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();

  const researchService = createResearchService({
    researchHypothesisRepository,
    setupDefinitionRepository
  });

  const aggregateToHypothesisHandoff = createAggregateToHypothesisEvidenceHandoff({
    researchService,
    setupAggregateResultRepository,
    researchHypothesisRepository
  });

  return {
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository,
    aggregateToHypothesisHandoff
  };
};

test("valid hypothesis-evidence trigger shape", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository,
    aggregateToHypothesisHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-hyp-evidence-001"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-hyp-evidence-001", "setup-hyp-evidence-001"),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-hyp-evidence-001",
      "setup-hyp-evidence-001",
      "hypothesis-hyp-evidence-001",
      "completed",
      {
        completedEvaluations: 10,
        positiveOutcomeCount: 8,
        averageFinalOutcome: 0.5,
        averagePercentageMove: 1.2
      }
    ),
    metadata
  });

  const result = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-hyp-evidence-001",
      setupDefinitionId: "setup-hyp-evidence-001",
      triggeredAt: "2026-04-22T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "updated");
  assert.equal(result.evidenceStatus, "supports");

  const hypothesis = await researchHypothesisRepository.getById("hypothesis-hyp-evidence-001");
  assert.equal(hypothesis?.evidenceStatus, "supports");
  assert.equal(typeof hypothesis?.evidenceSummary, "string");
  assert.equal((hypothesis?.notes.length ?? 0) > 0, true);
});

test("missing aggregate result reference rejected", async () => {
  const { aggregateToHypothesisHandoff } = createFixture();

  const result = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-missing",
      setupDefinitionId: "setup-hyp-evidence-002",
      triggeredAt: "2026-04-22T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setup_aggregate_result not found"), true);
});

test("non-completed aggregate rejected", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository,
    aggregateToHypothesisHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-hyp-evidence-003"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-hyp-evidence-003", "setup-hyp-evidence-003"),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-hyp-evidence-003",
      "setup-hyp-evidence-003",
      "hypothesis-hyp-evidence-003",
      "partial",
      {
        completedEvaluations: 3,
        positiveOutcomeCount: 2,
        averageFinalOutcome: 0.2,
        averagePercentageMove: 0.5
      }
    ),
    metadata
  });

  const result = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-hyp-evidence-003",
      setupDefinitionId: "setup-hyp-evidence-003",
      triggeredAt: "2026-04-22T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_lifecycle");
  assert.equal(result.reason?.includes("does not allow hypothesis evidence update"), true);
});

test("missing linked hypothesis rejected", async () => {
  const {
    setupDefinitionRepository,
    setupAggregateResultRepository,
    aggregateToHypothesisHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-hyp-evidence-004"),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-hyp-evidence-004",
      "setup-hyp-evidence-004",
      "hypothesis-hyp-evidence-missing",
      "completed",
      {
        completedEvaluations: 8,
        positiveOutcomeCount: 6,
        averageFinalOutcome: 0.4,
        averagePercentageMove: 0.9
      }
    ),
    metadata
  });

  const result = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-hyp-evidence-004",
      setupDefinitionId: "setup-hyp-evidence-004",
      triggeredAt: "2026-04-22T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_linkage");
  assert.equal(result.reason?.includes("research_hypothesis not found"), true);
});

test("evidence update result shape stays explicit", async () => {
  const { aggregateToHypothesisHandoff } = createFixture();

  const result = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "",
      setupDefinitionId: "setup-hyp-evidence-005",
      triggeredAt: "2026-04-22T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});

test("support/weakens/inconclusive outcome shape stays explicit", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository,
    aggregateToHypothesisHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-hyp-evidence-006"),
    metadata
  });

  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-hyp-evidence-006-supports", "setup-hyp-evidence-006"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-hyp-evidence-006-weakens", "setup-hyp-evidence-006"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-hyp-evidence-006-inconclusive", "setup-hyp-evidence-006"),
    metadata
  });

  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-hyp-evidence-006-supports",
      "setup-hyp-evidence-006",
      "hypothesis-hyp-evidence-006-supports",
      "completed",
      {
        completedEvaluations: 10,
        positiveOutcomeCount: 7,
        averageFinalOutcome: 0.3,
        averagePercentageMove: 0.8
      },
      "window-24h"
    ),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-hyp-evidence-006-weakens",
      "setup-hyp-evidence-006",
      "hypothesis-hyp-evidence-006-weakens",
      "completed",
      {
        completedEvaluations: 10,
        positiveOutcomeCount: 2,
        averageFinalOutcome: -0.4,
        averagePercentageMove: -1.1
      },
      "window-48h"
    ),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-hyp-evidence-006-inconclusive",
      "setup-hyp-evidence-006",
      "hypothesis-hyp-evidence-006-inconclusive",
      "completed",
      {
        completedEvaluations: 10,
        positiveOutcomeCount: 5,
        averageFinalOutcome: 0.1,
        averagePercentageMove: -0.2
      },
      "window-72h"
    ),
    metadata
  });

  const supports = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-hyp-evidence-006-supports",
      setupDefinitionId: "setup-hyp-evidence-006",
      triggeredAt: "2026-04-22T12:05:00.000Z"
    },
    metadata
  );
  const weakens = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-hyp-evidence-006-weakens",
      setupDefinitionId: "setup-hyp-evidence-006",
      triggeredAt: "2026-04-22T12:06:00.000Z"
    },
    metadata
  );
  const inconclusive = await aggregateToHypothesisHandoff.update(
    {
      setupAggregateResultId: "aggregate-hyp-evidence-006-inconclusive",
      setupDefinitionId: "setup-hyp-evidence-006",
      triggeredAt: "2026-04-22T12:07:00.000Z"
    },
    metadata
  );

  assert.equal(supports.status, "updated");
  assert.equal(supports.evidenceStatus, "supports");
  assert.equal(weakens.status, "updated");
  assert.equal(weakens.evidenceStatus, "weakens");
  assert.equal(inconclusive.status, "updated");
  assert.equal(inconclusive.evidenceStatus, "inconclusive");
});
