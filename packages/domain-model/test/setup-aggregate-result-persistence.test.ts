import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  SetupAggregateResultValidationError,
  type EvaluationResult,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition,
  type SignalCandidate,
  createResearchAggregationService
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-aggregate-tests",
  sourceObservedAtUtc: "2026-04-17T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout setup",
  description: "Breakout setup for aggregate testing",
  status: "active",
  measurableConditions: ["close above range high on 4h"],
  evaluationAssumptions: ["evaluate over fixed 24h horizon"],
  invalidationAssumptions: ["invalidate on immediate reversal"],
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z"
});

const buildHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
  id,
  title: "Breakout setup produces positive asymmetry",
  description: "Positive average percentage move after breakout retest.",
  status: "active",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["positive average move after enough samples"],
  notes: [],
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z"
});

const buildSignalCandidate = (
  id: string,
  setupDefinitionId: string,
  monitoredSymbolId: string,
  detectedAt = "2026-04-17T10:30:00.000Z"
): SignalCandidate => ({
  id,
  setupDefinitionId,
  monitoredSymbolId,
  status: "evaluated",
  detectedAt,
  evidenceSummary: "Detected breakout candidate",
  createdAt: detectedAt,
  updatedAt: detectedAt
});

const buildEvaluationResult = (
  id: string,
  signalCandidateId: string,
  windowId: string,
  percentageMove: number
): EvaluationResult => ({
  id,
  signalCandidateId,
  evaluationWindowId: windowId,
  status: "completed",
  referencePrice: 100,
  finalPrice: 100 + percentageMove,
  highInWindow: 110,
  lowInWindow: 90,
  absoluteMove: percentageMove,
  percentageMove,
  maxFavorableExcursion: 2,
  maxAdverseExcursion: -1,
  evaluatedAt: "2026-04-18T10:30:00.000Z",
  createdAt: "2026-04-18T10:30:00.000Z",
  updatedAt: "2026-04-18T10:30:00.000Z"
});

const buildScope = (setupDefinitionId: string): SetupAggregateResult["aggregationScope"] => ({
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
});

const buildPendingAggregate = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId?: string
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  aggregationScope: buildScope(setupDefinitionId),
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
  createdAt: "2026-04-17T11:00:00.000Z",
  updatedAt: "2026-04-17T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();

  const service = createResearchAggregationService({
    setupAggregateResultRepository,
    setupDefinitionRepository,
    researchHypothesisRepository,
    evaluationResultRepository,
    signalCandidateRepository
  });

  return {
    service,
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository,
    evaluationResultRepository,
    signalCandidateRepository
  };
};

test("create aggregate result", async () => {
  const { service, setupDefinitionRepository } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-100"),
    metadata
  });

  const created = await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-100", "setup-100"),
    metadata
  });

  assert.equal(created.status, "pending");
  assert.equal(created.setupDefinitionId, "setup-100");
});

test("reject creation with missing setup definition", async () => {
  const { service } = createFixture();

  await assert.rejects(
    async () =>
      service.createPendingSetupAggregateResult({
        aggregate: buildPendingAggregate("aggregate-101", "setup-missing"),
        metadata
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      error.message.includes("setup_definition not found")
  );
});

test("reject duplicate aggregate for same setup/scope", async () => {
  const { service, setupDefinitionRepository } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-102"),
    metadata
  });

  await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-102a", "setup-102"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.createPendingSetupAggregateResult({
        aggregate: buildPendingAggregate("aggregate-102b", "setup-102"),
        metadata
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      error.message.includes("duplicate setup_aggregate_result")
  );
});

test("complete aggregate with valid metrics", async () => {
  const {
    service,
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-103"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-103a", "setup-103", "BTC-USDT"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-103b", "setup-103", "ETH-USDT"),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-103a", "candidate-103a", "window-24h", 5),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-103b", "candidate-103b", "window-24h", 2),
    metadata
  });

  await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-103", "setup-103"),
    metadata
  });

  const recomputed = await service.recomputeSetupAggregateResult({
    setupAggregateResultId: "aggregate-103",
    evaluationResultIds: ["result-103a", "result-103b"],
    metadata,
    expectedVersion: null
  });

  assert.equal(recomputed?.status, "completed");
  assert.equal(recomputed?.totalCandidates, 2);
  assert.equal(recomputed?.completedEvaluations, 2);
  assert.equal(recomputed?.positiveOutcomeCount, 2);
});

test("reject invalid count/average consistency", async () => {
  const { service, setupDefinitionRepository } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-104"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.createPendingSetupAggregateResult({
        aggregate: {
          ...buildPendingAggregate("aggregate-104", "setup-104"),
          completedEvaluations: 1
        },
        metadata
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      (error.message.includes("pending setup_aggregate_result cannot include computed aggregate metrics") ||
        error.message.includes("completedEvaluations cannot exceed totalCandidates"))
  );
});

test("optional hypothesis linkage succeeds and fails correctly", async () => {
  const { service, setupDefinitionRepository, researchHypothesisRepository } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-105"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-105", "setup-105"),
    metadata
  });

  const linked = await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-105a", "setup-105", "hypothesis-105"),
    metadata
  });
  assert.equal(linked.researchHypothesisId, "hypothesis-105");

  await assert.rejects(
    async () =>
      service.createPendingSetupAggregateResult({
        aggregate: buildPendingAggregate("aggregate-105b", "setup-105", "hypothesis-missing"),
        metadata
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      error.message.includes("research_hypothesis not found")
  );
});

test("reject recompute when evaluation window is outside aggregation scope", async () => {
  const {
    service,
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-107"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-107a", "setup-107", "BTC-USDT"),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-107a", "candidate-107a", "window-4h", 1.5),
    metadata
  });
  await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-107", "setup-107"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.recomputeSetupAggregateResult({
        setupAggregateResultId: "aggregate-107",
        evaluationResultIds: ["result-107a"],
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      error.message.includes("outside aggregationScope.evaluationWindowId")
  );
});

test("reject recompute when candidate symbol is outside aggregation symbol scope", async () => {
  const {
    service,
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-108"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate("candidate-108a", "setup-108", "SOL-USDT"),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-108a", "candidate-108a", "window-24h", 1.5),
    metadata
  });
  await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-108", "setup-108"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.recomputeSetupAggregateResult({
        setupAggregateResultId: "aggregate-108",
        evaluationResultIds: ["result-108a"],
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      error.message.includes("outside aggregationScope.symbolScope")
  );
});

test("reject recompute when candidate detection time is outside aggregation range", async () => {
  const {
    service,
    setupDefinitionRepository,
    evaluationResultRepository,
    signalCandidateRepository
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-109"),
    metadata
  });
  await signalCandidateRepository.create({
    candidate: buildSignalCandidate(
      "candidate-109a",
      "setup-109",
      "BTC-USDT",
      "2026-05-01T00:00:00.000Z"
    ),
    metadata
  });
  await evaluationResultRepository.create({
    result: buildEvaluationResult("result-109a", "candidate-109a", "window-24h", 1.5),
    metadata
  });
  await service.createPendingSetupAggregateResult({
    aggregate: buildPendingAggregate("aggregate-109", "setup-109"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.recomputeSetupAggregateResult({
        setupAggregateResultId: "aggregate-109",
        evaluationResultIds: ["result-109a"],
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof SetupAggregateResultValidationError &&
      error.message.includes("outside aggregationScope.timeRange")
  );
});

test("repository retrieves by id and by setup definition id", async () => {
  const { setupAggregateResultRepository } = createFixture();
  await setupAggregateResultRepository.create({
    aggregate: buildPendingAggregate("aggregate-106", "setup-106"),
    metadata
  });

  const byId = await setupAggregateResultRepository.getById("aggregate-106");
  const bySetup = await setupAggregateResultRepository.listBySetupDefinitionId("setup-106");

  assert.equal(byId?.id, "aggregate-106");
  assert.equal(bySetup.length, 1);
  assert.equal(bySetup[0]?.id, "aggregate-106");
});
