import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySignalCandidateRepository,
  createRevisionHistoryQueryService,
  type ProductRecordMetadata,
  type SetupAggregateResult,
  type SetupDefinition,
  type SetupDefinitionRevision,
  type SignalCandidate
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-revision-comparison-query",
  originTransitionId: "transition-revision-comparison-query",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-revision-comparison-query",
  sourceObservedAtUtc: "2026-05-01T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"]
): SetupDefinition => ({
  id,
  name: `Setup ${id}`,
  description: "Setup for revision comparison tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z"
});

const buildRevision = (
  id: string,
  setupDefinitionId: string,
  setupFamilyId: string,
  version: number,
  previousRevisionId?: string,
  previousSetupDefinitionId?: string
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  previousSetupDefinitionId,
  versionInfo: {
    setupFamilyId,
    revisionId: id,
    version,
    previousRevisionId
  },
  revisionReason: "revision comparison test",
  revisionStatus: "accepted",
  changedFieldsSummary: "updated measurable conditions",
  createdBy: "research_reviewer_1",
  createdAt: "2026-05-01T11:00:00.000Z",
  sourceSetupRefinementRequestId: `refinement-${id}`,
  updatedAt: "2026-05-01T11:00:00.000Z"
});

const buildCandidate = (
  id: string,
  setupDefinitionId: string,
  setupRevisionId: string,
  monitoredSymbolId: string,
  detectedAt: string,
  status: SignalCandidate["status"] = "evaluated"
): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId,
  monitoredSymbolId,
  status,
  detectedAt,
  evidenceSummary: "revision comparison candidate",
  createdAt: detectedAt,
  updatedAt: detectedAt
});

const buildAggregate = (
  id: string,
  setupDefinitionId: string,
  computedAt: string
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
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
    }
  },
  status: "completed",
  totalCandidates: 1,
  completedEvaluations: 1,
  invalidatedEvaluations: 0,
  averagePercentageMove: 2,
  averageAbsoluteMove: 2,
  averageFinalOutcome: 1,
  averageMaxFavorableExcursion: 2,
  averageMaxAdverseExcursion: -1,
  positiveOutcomeCount: 1,
  computedAt,
  createdAt: computedAt,
  updatedAt: computedAt
});

const createFixture = async (options?: {
  targetFamilyId?: string;
  targetWithCompletedEvaluation?: boolean;
}) => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();

  const baselineFamilyId = "setup-family-300";
  const targetFamilyId = options?.targetFamilyId ?? baselineFamilyId;

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-300-v1", "paused"),
    metadata
  });
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-300-v2", "active"),
    metadata
  });

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-300-v1",
      "setup-family-300-v1",
      baselineFamilyId,
      1
    ),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-300-v2",
      "setup-family-300-v2",
      targetFamilyId,
      2,
      "revision-family-300-v1",
      "setup-family-300-v1"
    ),
    metadata
  });

  await signalCandidateRepository.create({
    candidate: buildCandidate(
      "candidate-family-300-v1",
      "setup-family-300-v1",
      "revision-family-300-v1",
      "BTC-USDT",
      "2026-05-01T10:00:00.000Z",
      "evaluated"
    ),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildCandidate(
      "candidate-family-300-v2",
      "setup-family-300-v2",
      "revision-family-300-v2",
      "ETH-USDT",
      "2026-05-02T10:00:00.000Z",
      options?.targetWithCompletedEvaluation === false ? "under_review" : "evaluated"
    ),
    metadata
  });

  await evaluationResultRepository.create({
    result: {
      id: "result-family-300-v1",
      signalCandidateId: "candidate-family-300-v1",
      evaluationWindowId: "window-24h",
      status: "completed",
      referencePrice: 100,
      finalPrice: 102,
      highInWindow: 103,
      lowInWindow: 99,
      absoluteMove: 2,
      percentageMove: 2,
      maxFavorableExcursion: 2,
      maxAdverseExcursion: -1,
      evaluatedAt: "2026-05-01T12:00:00.000Z",
      createdAt: "2026-05-01T12:00:00.000Z",
      updatedAt: "2026-05-01T12:00:00.000Z"
    },
    metadata
  });

  if (options?.targetWithCompletedEvaluation !== false) {
    await evaluationResultRepository.create({
      result: {
        id: "result-family-300-v2",
        signalCandidateId: "candidate-family-300-v2",
        evaluationWindowId: "window-24h",
        status: "completed",
        referencePrice: 100,
        finalPrice: 105,
        highInWindow: 106,
        lowInWindow: 98,
        absoluteMove: 5,
        percentageMove: 5,
        maxFavorableExcursion: 4,
        maxAdverseExcursion: -1.5,
        evaluatedAt: "2026-05-02T12:00:00.000Z",
        createdAt: "2026-05-02T12:00:00.000Z",
        updatedAt: "2026-05-02T12:00:00.000Z"
      },
      metadata
    });
  }

  await setupAggregateResultRepository.create({
    aggregate: buildAggregate("aggregate-family-300-v1", "setup-family-300-v1", "2026-05-01T13:00:00.000Z"),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregate("aggregate-family-300-v2", "setup-family-300-v2", "2026-05-02T13:00:00.000Z"),
    metadata
  });

  const queryService = createRevisionHistoryQueryService({
    setupDefinitionRevisionRepository,
    setupDefinitionRepository,
    signalCandidateRepository,
    evaluationResultRepository,
    setupAggregateResultRepository
  });

  return { queryService, baselineFamilyId };
};

test("valid same-family comparison shape", async () => {
  const { queryService, baselineFamilyId } = await createFixture();

  const result = await queryService.compareRevisions({
    setupFamilyId: baselineFamilyId,
    baselineRevisionId: "revision-family-300-v1",
    targetRevisionId: "revision-family-300-v2",
    comparedAt: "2026-05-03T10:00:00.000Z",
    comparisonScope: {
      evaluationWindowId: "window-24h"
    }
  });

  assert.equal(result.status, "compared");
  assert.equal(result.comparison?.setupFamilyId, baselineFamilyId);
  assert.equal(result.comparison?.baselineRevisionId, "revision-family-300-v1");
  assert.equal(result.comparison?.targetRevisionId, "revision-family-300-v2");
});

test("different-family comparison rejected", async () => {
  const { queryService, baselineFamilyId } = await createFixture({
    targetFamilyId: "setup-family-999"
  });

  const result = await queryService.compareRevisions({
    setupFamilyId: baselineFamilyId,
    baselineRevisionId: "revision-family-300-v1",
    targetRevisionId: "revision-family-300-v2",
    comparedAt: "2026-05-03T10:00:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("do not belong to requested setupFamilyId"), true);
});

test("missing baseline revision rejected", async () => {
  const { queryService, baselineFamilyId } = await createFixture();

  const result = await queryService.compareRevisions({
    setupFamilyId: baselineFamilyId,
    baselineRevisionId: "revision-missing",
    targetRevisionId: "revision-family-300-v2",
    comparedAt: "2026-05-03T10:00:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("baseline setup_definition_revision not found"), true);
});

test("missing target revision rejected", async () => {
  const { queryService, baselineFamilyId } = await createFixture();

  const result = await queryService.compareRevisions({
    setupFamilyId: baselineFamilyId,
    baselineRevisionId: "revision-family-300-v1",
    targetRevisionId: "revision-missing",
    comparedAt: "2026-05-03T10:00:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("target setup_definition_revision not found"), true);
});

test("insufficient evidence handled explicitly", async () => {
  const { queryService, baselineFamilyId } = await createFixture({
    targetWithCompletedEvaluation: false
  });

  const result = await queryService.compareRevisions({
    setupFamilyId: baselineFamilyId,
    baselineRevisionId: "revision-family-300-v1",
    targetRevisionId: "revision-family-300-v2",
    comparedAt: "2026-05-03T10:00:00.000Z"
  });

  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.comparison?.status, "insufficient_evidence");
  assert.equal(result.reason?.includes("lack completed evaluations"), true);
});

test("comparison result keeps explicit baseline/target grouping and deltas", async () => {
  const { queryService, baselineFamilyId } = await createFixture();

  const result = await queryService.compareRevisions({
    setupFamilyId: baselineFamilyId,
    baselineRevisionId: "revision-family-300-v1",
    targetRevisionId: "revision-family-300-v2",
    comparedAt: "2026-05-03T10:00:00.000Z"
  });

  assert.equal(result.status, "compared");
  assert.equal(typeof result.comparison?.baselineMetrics.completedEvaluations, "number");
  assert.equal(typeof result.comparison?.targetMetrics.completedEvaluations, "number");
  assert.equal(typeof result.comparison?.metricDeltas.completedEvaluations.delta, "number");
  assert.equal(result.comparison?.metricDeltas.averagePercentageMove.baseline, 2);
  assert.equal(result.comparison?.metricDeltas.averagePercentageMove.target, 5);
});
