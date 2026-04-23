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
  originRunId: "run-revision-history-query",
  originTransitionId: "transition-revision-history-query",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-revision-history-query",
  sourceObservedAtUtc: "2026-04-30T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"]
): SetupDefinition => ({
  id,
  name: `Setup ${id}`,
  description: "Setup for revision-history query tests",
  status,
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-30T10:00:00.000Z",
  updatedAt: "2026-04-30T10:00:00.000Z"
});

const buildRevision = (
  id: string,
  setupDefinitionId: string,
  setupFamilyId: string,
  version: number,
  revisionStatus: SetupDefinitionRevision["revisionStatus"],
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
  revisionReason: "revision history query test revision",
  revisionStatus,
  changedFieldsSummary: "updated measurable conditions",
  createdBy: "research_reviewer_1",
  createdAt: "2026-04-30T11:00:00.000Z",
  sourceSetupRefinementRequestId: `refinement-${id}`,
  updatedAt: "2026-04-30T11:00:00.000Z"
});

const buildCandidate = (
  id: string,
  setupDefinitionId: string,
  setupRevisionId: string,
  monitoredSymbolId: string,
  detectedAt: string
): SignalCandidate => ({
  id,
  setupDefinitionId,
  setupRevisionId,
  monitoredSymbolId,
  status: "evaluated",
  detectedAt,
  evidenceSummary: "revision-aware candidate",
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
      startAtUtc: "2026-04-01T00:00:00.000Z",
      endAtUtc: "2026-04-30T23:59:59.000Z"
    }
  },
  status: "completed",
  totalCandidates: 1,
  completedEvaluations: 1,
  invalidatedEvaluations: 0,
  averagePercentageMove: 2.5,
  averageAbsoluteMove: 2.5,
  averageFinalOutcome: 1,
  averageMaxFavorableExcursion: 3,
  averageMaxAdverseExcursion: -1,
  positiveOutcomeCount: 1,
  computedAt,
  createdAt: computedAt,
  updatedAt: computedAt
});

const createFixture = async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-200-v1", "paused"),
    metadata
  });
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-200-v2", "active"),
    metadata
  });

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-200-v1",
      "setup-family-200-v1",
      "setup-family-200",
      1,
      "superseded"
    ),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-200-v2",
      "setup-family-200-v2",
      "setup-family-200",
      2,
      "accepted",
      "revision-family-200-v1",
      "setup-family-200-v1"
    ),
    metadata
  });

  await signalCandidateRepository.create({
    candidate: buildCandidate(
      "candidate-family-200-v1",
      "setup-family-200-v1",
      "revision-family-200-v1",
      "BTC-USDT",
      "2026-04-29T10:00:00.000Z"
    ),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildCandidate(
      "candidate-family-200-v2",
      "setup-family-200-v2",
      "revision-family-200-v2",
      "ETH-USDT",
      "2026-04-30T10:00:00.000Z"
    ),
    metadata
  });

  await evaluationResultRepository.create({
    result: {
      id: "result-family-200-v1",
      signalCandidateId: "candidate-family-200-v1",
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
      evaluatedAt: "2026-04-29T12:00:00.000Z",
      createdAt: "2026-04-29T12:00:00.000Z",
      updatedAt: "2026-04-29T12:00:00.000Z"
    },
    metadata
  });
  await evaluationResultRepository.create({
    result: {
      id: "result-family-200-v2",
      signalCandidateId: "candidate-family-200-v2",
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
      evaluatedAt: "2026-04-30T12:00:00.000Z",
      createdAt: "2026-04-30T12:00:00.000Z",
      updatedAt: "2026-04-30T12:00:00.000Z"
    },
    metadata
  });

  await setupAggregateResultRepository.create({
    aggregate: buildAggregate(
      "aggregate-family-200-v1",
      "setup-family-200-v1",
      "2026-04-29T13:00:00.000Z"
    ),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregate(
      "aggregate-family-200-v2",
      "setup-family-200-v2",
      "2026-04-30T13:00:00.000Z"
    ),
    metadata
  });

  const queryService = createRevisionHistoryQueryService({
    setupDefinitionRevisionRepository,
    setupDefinitionRepository,
    signalCandidateRepository,
    evaluationResultRepository,
    setupAggregateResultRepository
  });

  return {
    queryService
  };
};

test("valid family-history query shape", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.queryHistory({
    mode: "family_history",
    setupFamilyId: "setup-family-200"
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.familyHistory?.setupFamilyId, "setup-family-200");
  assert.equal(result.familyHistory?.revisionGroups.length, 2);
  assert.equal(result.familyHistory?.revisionGroups[0]?.revisionStatus, "superseded");
});

test("valid single-revision query shape", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.queryHistory({
    mode: "single_revision",
    setupRevisionId: "revision-family-200-v2"
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.setupRevisionId, "revision-family-200-v2");
  assert.equal(result.candidateHistory?.count, 1);
  assert.equal(result.evaluationHistory?.count, 1);
  assert.equal(result.aggregateHistory?.count, 1);
  assert.equal(result.candidateHistory?.candidates.every((candidate) => candidate.setupRevisionId === "revision-family-200-v2"), true);
});

test("missing family rejected", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.queryHistory({
    mode: "family_history",
    setupFamilyId: ""
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("setupFamilyId is required"), true);
});

test("missing revision rejected", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.queryHistory({
    mode: "single_revision",
    setupRevisionId: ""
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("setupRevisionId is required"), true);
});

test("mixed-family/revision ambiguity rejected", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.queryHistory({
    mode: "single_revision",
    setupFamilyId: "setup-family-999",
    setupRevisionId: "revision-family-200-v2"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("ambiguity"), true);
});

test("query result shape keeps explicit revision grouping", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.queryHistory({
    mode: "family_comparison",
    setupFamilyId: "setup-family-200"
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.familyHistory?.mode, "family_comparison");
  assert.equal(
    result.familyHistory?.revisionGroups.every((group) =>
      typeof group.setupRevisionId === "string" &&
      typeof group.counts.candidateCount === "number" &&
      typeof group.counts.evaluationCount === "number"
    ),
    true
  );
});
