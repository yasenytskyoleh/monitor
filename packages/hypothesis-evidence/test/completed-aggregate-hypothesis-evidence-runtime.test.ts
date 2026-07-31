import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  createAggregateToHypothesisEvidenceHandoff,
  createResearchService,
  type AggregateHypothesisEvidenceTrigger,
  type HypothesisEvidenceUpdateResult,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "@monitor/domain-model";

import { createCompletedAggregateHypothesisEvidenceRuntime } from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-07-31T00:00:00.000Z"
};

const setupDefinition: SetupDefinition = {
  id: "setup-hypothesis-evidence-runtime-001",
  name: "Hypothesis evidence runtime setup",
  description: "Fixture for completed aggregate evidence updates",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate fixed 24h"],
  invalidationAssumptions: ["none"],
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z"
};

const buildHypothesis = (id: string, relatedSetupDefinitionIds = [setupDefinition.id]): ResearchHypothesis => ({
  id,
  title: "Completed aggregate hypothesis",
  description: "Completed aggregate evidence should update this hypothesis.",
  relatedSetupDefinitionIds,
  assumptions: ["positive outcomes support the hypothesis"],
  notes: [],
  status: "active",
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z"
});

type AggregateMetrics = Pick<
  SetupAggregateResult,
  "averageFinalOutcome" | "averagePercentageMove" | "completedEvaluations" | "positiveOutcomeCount"
>;

const buildAggregate = (
  id: string,
  researchHypothesisId: string | undefined,
  metrics: AggregateMetrics,
  status: SetupAggregateResult["status"] = "completed"
): SetupAggregateResult => ({
  id,
  setupDefinitionId: setupDefinition.id,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId: setupDefinition.id,
    evaluationWindowId: "window-24h",
    symbolScope: { kind: "single_symbol", symbolIds: ["BTC-USDT"] },
    timeRange: {
      startAtUtc: "1970-01-01T00:00:00.000Z",
      endAtUtc: "9999-12-31T23:59:59.999Z"
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
  averageMaxAdverseExcursion:
    metrics.averagePercentageMove === null ? null : -Math.abs(metrics.averagePercentageMove),
  positiveOutcomeCount: metrics.positiveOutcomeCount,
  computedAt: status === "completed" ? "2026-07-31T01:00:00.000Z" : null,
  createdAt: "2026-07-31T01:00:00.000Z",
  updatedAt: "2026-07-31T01:00:00.000Z"
});

const createFixture = async () => {
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  await setupDefinitionRepository.create({ definition: setupDefinition, metadata });

  const hypothesisEvidenceHandoff = createAggregateToHypothesisEvidenceHandoff({
    researchService: createResearchService({
      researchHypothesisRepository,
      setupDefinitionRepository
    }),
    setupAggregateResultRepository,
    researchHypothesisRepository
  });

  return {
    hypothesisEvidenceHandoff,
    researchHypothesisRepository,
    runtime: createCompletedAggregateHypothesisEvidenceRuntime({
      setupAggregateResultRepository,
      hypothesisEvidenceHandoff
    }),
    setupAggregateResultRepository
  };
};

const persistAggregateWithHypothesis = async (
  fixture: Awaited<ReturnType<typeof createFixture>>,
  aggregate: SetupAggregateResult,
  hypothesis: ResearchHypothesis
): Promise<void> => {
  await fixture.researchHypothesisRepository.create({ hypothesis, metadata });
  await fixture.setupAggregateResultRepository.create({ aggregate, metadata });
};

test("updates supporting, weakening, and inconclusive completed aggregate evidence", async () => {
  const cases = [
    { id: "support", expected: "supports", metrics: { completedEvaluations: 10, positiveOutcomeCount: 7, averageFinalOutcome: 1, averagePercentageMove: 2 } },
    { id: "weaken", expected: "weakens", metrics: { completedEvaluations: 10, positiveOutcomeCount: 3, averageFinalOutcome: -1, averagePercentageMove: -2 } },
    { id: "inconclusive", expected: "inconclusive", metrics: { completedEvaluations: 0, positiveOutcomeCount: 0, averageFinalOutcome: null, averagePercentageMove: null } }
  ] as const;

  for (const item of cases) {
    const fixture = await createFixture();
    const hypothesisId = `hypothesis-${item.id}`;
    const aggregateId = `aggregate-${item.id}`;
    await persistAggregateWithHypothesis(
      fixture,
      buildAggregate(aggregateId, hypothesisId, item.metrics),
      buildHypothesis(hypothesisId)
    );

    const outcome = await fixture.runtime.updateFromCompletedAggregate({
      setupAggregateResultId: aggregateId,
      triggeredAt: "2026-07-31T01:05:00.000Z"
    });
    const hypothesis = await fixture.researchHypothesisRepository.getById(hypothesisId);

    assert.equal(outcome.status, "updated");
    assert.equal(outcome.evidenceStatus, item.expected);
    assert.equal(hypothesis?.evidenceStatus, item.expected);
    assert.equal(hypothesis?.lastEvidenceAggregateResultId, aggregateId);
  }
});

test("rejects malformed, missing, and incomplete aggregate requests before the handoff", async () => {
  const fixture = await createFixture();
  const malformed = await fixture.runtime.updateFromCompletedAggregate({
    setupAggregateResultId: "",
    triggeredAt: "not-a-timestamp"
  });
  const missing = await fixture.runtime.updateFromCompletedAggregate({
    setupAggregateResultId: "aggregate-missing",
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });
  await fixture.setupAggregateResultRepository.create({
    aggregate: buildAggregate(
      "aggregate-partial",
      undefined,
      { completedEvaluations: 1, positiveOutcomeCount: 1, averageFinalOutcome: 1, averagePercentageMove: 1 },
      "partial"
    ),
    metadata
  });
  const partial = await fixture.runtime.updateFromCompletedAggregate({
    setupAggregateResultId: "aggregate-partial",
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });

  assert.equal(malformed.status, "rejected_validation");
  assert.equal(missing.status, "rejected_validation");
  assert.equal(partial.status, "rejected_lifecycle");
  assert.equal(partial.setupAggregateResultId, "aggregate-partial");
});

test("preserves explicit linkage rejections from the domain handoff", async () => {
  const noLinkedHypothesisFixture = await createFixture();
  await noLinkedHypothesisFixture.setupAggregateResultRepository.create({
    aggregate: buildAggregate("aggregate-no-hypothesis", undefined, {
      completedEvaluations: 1,
      positiveOutcomeCount: 1,
      averageFinalOutcome: 1,
      averagePercentageMove: 1
    }),
    metadata
  });
  const noLinkedHypothesis = await noLinkedHypothesisFixture.runtime.updateFromCompletedAggregate({
    setupAggregateResultId: "aggregate-no-hypothesis",
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });

  const missingHypothesisFixture = await createFixture();
  await missingHypothesisFixture.setupAggregateResultRepository.create({
    aggregate: buildAggregate("aggregate-missing-hypothesis", "hypothesis-missing", {
      completedEvaluations: 1,
      positiveOutcomeCount: 1,
      averageFinalOutcome: 1,
      averagePercentageMove: 1
    }),
    metadata
  });
  const missingHypothesis = await missingHypothesisFixture.runtime.updateFromCompletedAggregate({
    setupAggregateResultId: "aggregate-missing-hypothesis",
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });

  const invalidLinkageFixture = await createFixture();
  const invalidHypothesisId = "hypothesis-invalid-linkage";
  await persistAggregateWithHypothesis(
    invalidLinkageFixture,
    buildAggregate("aggregate-invalid-linkage", invalidHypothesisId, {
      completedEvaluations: 1,
      positiveOutcomeCount: 1,
      averageFinalOutcome: 1,
      averagePercentageMove: 1
    }),
    buildHypothesis(invalidHypothesisId, ["setup-unrelated"])
  );
  const invalidLinkage = await invalidLinkageFixture.runtime.updateFromCompletedAggregate({
    setupAggregateResultId: "aggregate-invalid-linkage",
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });

  assert.equal(noLinkedHypothesis.status, "rejected_linkage");
  assert.match(noLinkedHypothesis.reason ?? "", /no linked research_hypothesis/);
  assert.equal(missingHypothesis.status, "rejected_linkage");
  assert.match(missingHypothesis.reason ?? "", /research_hypothesis not found/);
  assert.equal(invalidLinkage.status, "rejected_linkage");
  assert.match(invalidLinkage.reason ?? "", /not linked to setup_definition/);
});

test("preserves aggregate scope and metadata while mapping failures to retryable outcomes", async () => {
  const aggregate = buildAggregate("aggregate-scope", "hypothesis-scope", {
    completedEvaluations: 1,
    positiveOutcomeCount: 1,
    averageFinalOutcome: 1,
    averagePercentageMove: 1
  });
  let receivedTrigger: AggregateHypothesisEvidenceTrigger | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const recordingRuntime = createCompletedAggregateHypothesisEvidenceRuntime({
    setupAggregateResultRepository: { async getById(): Promise<SetupAggregateResult> { return aggregate; } },
    hypothesisEvidenceHandoff: {
      async update(trigger, handoffMetadata): Promise<HypothesisEvidenceUpdateResult> {
        receivedTrigger = trigger;
        receivedMetadata = handoffMetadata;
        return { status: "rejected_linkage", reason: "linkage unavailable", warnings: [] };
      }
    }
  });
  const failingRuntime = createCompletedAggregateHypothesisEvidenceRuntime({
    setupAggregateResultRepository: { async getById(): Promise<SetupAggregateResult> { return aggregate; } },
    hypothesisEvidenceHandoff: {
      async update(): Promise<never> {
        throw new Error("temporary handoff failure");
      }
    }
  });

  const rejected = await recordingRuntime.updateFromCompletedAggregate({
    setupAggregateResultId: aggregate.id,
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });
  const failed = await failingRuntime.updateFromCompletedAggregate({
    setupAggregateResultId: aggregate.id,
    triggeredAt: "2026-07-31T01:05:00.000Z"
  });

  assert.equal(rejected.status, "rejected_linkage");
  assert.deepEqual(receivedTrigger?.evidenceScopeDescriptor, {
    evaluationWindowId: "window-24h",
    symbolScope: { kind: "single_symbol", symbolIds: ["BTC-USDT"] },
    timeRange: {
      startAtUtc: "1970-01-01T00:00:00.000Z",
      endAtUtc: "9999-12-31T23:59:59.999Z"
    }
  });
  assert.equal(receivedMetadata?.traceId, aggregate.id);
  assert.equal(receivedMetadata?.createdBySource, "research_aggregation_pipeline");
  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary handoff failure/);
  assert.equal(failed.warnings.length, 1);
});
