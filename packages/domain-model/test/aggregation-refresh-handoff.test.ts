import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  createEvaluationToAggregationRefreshHandoff,
  createResearchAggregationService,
  type ProductRecordMetadata,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-aggregation-refresh",
  originTransitionId: "transition-aggregation-refresh",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-aggregation-refresh",
  sourceObservedAtUtc: "2026-04-21T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Aggregation refresh setup",
  description: "Setup for aggregation refresh handoff tests",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate fixed 24h"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-21T10:00:00.000Z",
  updatedAt: "2026-04-21T10:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();

  const researchAggregationService = createResearchAggregationService({
    setupAggregateResultRepository,
    setupDefinitionRepository,
    researchHypothesisRepository,
    evaluationResultRepository,
    signalCandidateRepository
  });
  const refreshHandoff = createEvaluationToAggregationRefreshHandoff({
    researchAggregationService,
    evaluationResultRepository,
    signalCandidateRepository,
    setupAggregateResultRepository
  });

  return {
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository,
    setupAggregateResultRepository,
    refreshHandoff
  };
};

test("valid aggregation-refresh trigger shape", async () => {
  const {
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository,
    refreshHandoff
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-agg-refresh-001"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: {
      id: "candidate-agg-refresh-001",
      setupDefinitionId: "setup-agg-refresh-001",
      setupRevisionId: "revision-agg-refresh-001",
      monitoredSymbolId: "BTC-USDT",
      status: "evaluated",
      detectedAt: "2026-04-21T11:00:00.000Z",
      evidenceSummary: "candidate for aggregate refresh",
      createdAt: "2026-04-21T11:00:00.000Z",
      updatedAt: "2026-04-21T11:00:00.000Z"
    },
    metadata
  });
  await evaluationResultRepository.create({
    result: {
      id: "result-agg-refresh-001",
      signalCandidateId: "candidate-agg-refresh-001",
      evaluationWindowId: "window-24h",
      status: "completed",
      referencePrice: 100,
      finalPrice: 105,
      highInWindow: 107,
      lowInWindow: 98,
      absoluteMove: 5,
      percentageMove: 5,
      maxFavorableExcursion: 2,
      maxAdverseExcursion: -1,
      evaluatedAt: "2026-04-21T12:00:00.000Z",
      createdAt: "2026-04-21T12:00:00.000Z",
      updatedAt: "2026-04-21T12:00:00.000Z"
    },
    metadata
  });

  const result = await refreshHandoff.refresh(
    {
      evaluationResultId: "result-agg-refresh-001",
      signalCandidateId: "candidate-agg-refresh-001",
      setupDefinitionId: "setup-agg-refresh-001",
      triggeredAt: "2026-04-21T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "created_and_refreshed");
  assert.equal(typeof result.setupAggregateResultId, "string");
});

test("missing evaluation result reference rejected", async () => {
  const { refreshHandoff } = createFixture();

  const result = await refreshHandoff.refresh(
    {
      evaluationResultId: "result-missing",
      signalCandidateId: "candidate-agg-refresh-002",
      setupDefinitionId: "setup-agg-refresh-002",
      triggeredAt: "2026-04-21T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("evaluation_result not found"), true);
});

test("non-completed evaluation rejected", async () => {
  const {
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository,
    refreshHandoff
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-agg-refresh-003"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: {
      id: "candidate-agg-refresh-003",
      setupDefinitionId: "setup-agg-refresh-003",
      setupRevisionId: "revision-agg-refresh-003",
      monitoredSymbolId: "BTC-USDT",
      status: "under_review",
      detectedAt: "2026-04-21T11:00:00.000Z",
      evidenceSummary: "candidate non-completed evaluation test",
      createdAt: "2026-04-21T11:00:00.000Z",
      updatedAt: "2026-04-21T11:00:00.000Z"
    },
    metadata
  });
  await evaluationResultRepository.create({
    result: {
      id: "result-agg-refresh-003",
      signalCandidateId: "candidate-agg-refresh-003",
      evaluationWindowId: "window-24h",
      status: "in_progress",
      referencePrice: null,
      finalPrice: null,
      highInWindow: null,
      lowInWindow: null,
      absoluteMove: null,
      percentageMove: null,
      maxFavorableExcursion: null,
      maxAdverseExcursion: null,
      evaluatedAt: null,
      createdAt: "2026-04-21T12:00:00.000Z",
      updatedAt: "2026-04-21T12:00:00.000Z"
    },
    metadata
  });

  const result = await refreshHandoff.refresh(
    {
      evaluationResultId: "result-agg-refresh-003",
      signalCandidateId: "candidate-agg-refresh-003",
      setupDefinitionId: "setup-agg-refresh-003",
      triggeredAt: "2026-04-21T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_lifecycle");
  assert.equal(result.reason?.includes("does not allow aggregation refresh"), true);
});

test("duplicate refresh policy recomputes existing aggregate", async () => {
  const {
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository,
    refreshHandoff
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-agg-refresh-004"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: {
      id: "candidate-agg-refresh-004",
      setupDefinitionId: "setup-agg-refresh-004",
      setupRevisionId: "revision-agg-refresh-004",
      monitoredSymbolId: "BTC-USDT",
      status: "evaluated",
      detectedAt: "2026-04-21T11:00:00.000Z",
      evidenceSummary: "candidate for duplicate refresh policy",
      createdAt: "2026-04-21T11:00:00.000Z",
      updatedAt: "2026-04-21T11:00:00.000Z"
    },
    metadata
  });
  await evaluationResultRepository.create({
    result: {
      id: "result-agg-refresh-004",
      signalCandidateId: "candidate-agg-refresh-004",
      evaluationWindowId: "window-24h",
      status: "completed",
      referencePrice: 100,
      finalPrice: 103,
      highInWindow: 106,
      lowInWindow: 98,
      absoluteMove: 3,
      percentageMove: 3,
      maxFavorableExcursion: 1.5,
      maxAdverseExcursion: -0.8,
      evaluatedAt: "2026-04-21T12:00:00.000Z",
      createdAt: "2026-04-21T12:00:00.000Z",
      updatedAt: "2026-04-21T12:00:00.000Z"
    },
    metadata
  });

  const first = await refreshHandoff.refresh(
    {
      evaluationResultId: "result-agg-refresh-004",
      signalCandidateId: "candidate-agg-refresh-004",
      setupDefinitionId: "setup-agg-refresh-004",
      triggeredAt: "2026-04-21T12:05:00.000Z"
    },
    metadata
  );
  const second = await refreshHandoff.refresh(
    {
      evaluationResultId: "result-agg-refresh-004",
      signalCandidateId: "candidate-agg-refresh-004",
      setupDefinitionId: "setup-agg-refresh-004",
      triggeredAt: "2026-04-21T12:06:00.000Z"
    },
    metadata
  );

  assert.equal(first.status, "created_and_refreshed");
  assert.equal(second.status, "refreshed_existing");
  assert.equal(second.setupAggregateResultId, first.setupAggregateResultId);
});

test("refresh result shape stays explicit", async () => {
  const { refreshHandoff } = createFixture();

  const result = await refreshHandoff.refresh(
    {
      evaluationResultId: "",
      signalCandidateId: "candidate-agg-refresh-005",
      setupDefinitionId: "setup-agg-refresh-005",
      triggeredAt: "2026-04-21T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});
