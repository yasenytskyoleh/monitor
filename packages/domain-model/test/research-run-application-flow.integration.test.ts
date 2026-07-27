import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemoryMonitoredSymbolRepository,
  InMemoryResearchHypothesisRepository,
  InMemoryResearchRunRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  createEvaluationService,
  createMonitoringCatalogService,
  createResearchAggregationService,
  createResearchRunService,
  createResearchService,
  createSetupDefinitionService,
  createSetupToAggregateFlow,
  createSignalCandidateService,
  type ProductRecordMetadata,
  type SetupToAggregateFlowInput
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-flow-integration-001",
  originTransitionId: "transition-flow-integration-001",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-flow-integration-001",
  sourceObservedAtUtc: "2026-07-27T10:00:00.000Z"
};

const input: SetupToAggregateFlowInput = {
  setupDefinition: {
    id: "setup-flow-integration-001",
    name: "Breakout Retest",
    description: "Application-flow integration fixture.",
    status: "active",
    measurableConditions: ["4h close above range high"],
    evaluationAssumptions: ["evaluate over 24h"],
    invalidationAssumptions: ["failed retest"],
    createdAt: "2026-07-27T09:00:00.000Z",
    updatedAt: "2026-07-27T09:00:00.000Z"
  },
  researchHypothesis: {
    id: "hypothesis-flow-integration-001",
    title: "Breakout retests sustain directional movement",
    description: "Application-flow integration fixture.",
    relatedSetupDefinitionIds: [],
    assumptions: ["positive move after retest"],
    notes: [],
    status: "active",
    createdAt: "2026-07-27T09:00:00.000Z",
    updatedAt: "2026-07-27T09:00:00.000Z"
  },
  signalCandidate: {
    id: "candidate-flow-integration-001",
    setupDefinitionId: "setup-flow-integration-001",
    setupRevisionId: "setup-flow-integration-001-revision-001",
    monitoredSymbolId: "BTC-USDT",
    status: "detected",
    detectedAt: "2026-07-27T10:00:00.000Z",
    evidenceSummary: "Breakout retest candidate.",
    createdAt: "2026-07-27T10:00:00.000Z",
    updatedAt: "2026-07-27T10:00:00.000Z"
  },
  evaluation: {
    pendingResult: {
      id: "result-flow-integration-001",
      signalCandidateId: "candidate-flow-integration-001",
      evaluationWindowId: "window-24h",
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
      createdAt: "2026-07-27T10:00:00.000Z",
      updatedAt: "2026-07-27T10:00:00.000Z"
    },
    finalization: {
      referencePrice: 100,
      finalPrice: 103,
      highInWindow: 104,
      lowInWindow: 99,
      maxFavorableExcursion: 4,
      maxAdverseExcursion: -1,
      evaluatedAt: "2026-07-27T12:00:00.000Z"
    }
  },
  researchRun: {
    run: {
      runId: "research-run-flow-integration-001",
      hypothesisId: "hypothesis-flow-integration-001",
      setupId: "setup-flow-integration-001",
      candidateIds: ["candidate-flow-integration-001"],
      evaluationWindowIds: ["window-24h"],
      evaluationResultIds: [],
      status: "planned",
      startedAtUtc: "2026-07-27T10:00:00.000Z",
      createdAtUtc: "2026-07-27T10:00:00.000Z",
      updatedAtUtc: "2026-07-27T10:00:00.000Z"
    },
    completion: {
      completedAtUtc: "2026-07-27T13:00:00.000Z",
      summary: "Evaluation and aggregation context captured."
    }
  },
  aggregation: {
    pendingAggregate: {
      id: "aggregate-flow-integration-001",
      setupDefinitionId: "setup-flow-integration-001",
      researchHypothesisId: "hypothesis-flow-integration-001",
      aggregationScope: {
        setupDefinitionId: "setup-flow-integration-001",
        evaluationWindowId: "window-24h",
        symbolScope: { kind: "single_symbol", symbolIds: ["BTC-USDT"] },
        timeRange: {
          startAtUtc: "2026-07-01T00:00:00.000Z",
          endAtUtc: "2026-07-31T23:59:59.000Z"
        },
        researchRunId: "research-run-flow-integration-001",
        hypothesisId: "hypothesis-flow-integration-001"
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
      createdAt: "2026-07-27T13:00:00.000Z",
      updatedAt: "2026-07-27T13:00:00.000Z"
    },
    recomputeEvaluationResultIds: ["result-flow-integration-001"]
  },
  metadata
};

test("application flow persists a completed research run before run-scoped aggregation", async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const researchRunRepository = new InMemoryResearchRunRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const monitoredSymbolRepository = new InMemoryMonitoredSymbolRepository();

  await createMonitoringCatalogService({ monitoredSymbolRepository }).registerMonitoredSymbol({
    symbol: {
      symbolId: "BTC-USDT",
      baseAsset: "BTC",
      quoteAsset: "USDT",
      displayName: "BTC/USDT",
      marketScope: "spot",
      status: "active",
      providerHint: "unknown",
      tags: [],
      sourceBindings: [],
      createdAtUtc: "2026-07-27T09:00:00.000Z",
      updatedAtUtc: "2026-07-27T09:00:00.000Z"
    },
    metadata
  });

  const flow = createSetupToAggregateFlow({
    setupDefinitionService: createSetupDefinitionService({ setupDefinitionRepository }),
    researchService: createResearchService({
      researchHypothesisRepository,
      setupDefinitionRepository
    }),
    signalCandidateService: createSignalCandidateService({
      signalCandidateRepository,
      setupDefinitionRepository,
      monitoredSymbolRepository
    }),
    evaluationService: createEvaluationService({
      evaluationResultRepository,
      signalCandidateRepository
    }),
    researchRunService: createResearchRunService({
      researchRunRepository,
      researchHypothesisRepository,
      setupDefinitionRepository,
      signalCandidateRepository,
      evaluationResultRepository
    }),
    researchAggregationService: createResearchAggregationService({
      setupAggregateResultRepository,
      setupDefinitionRepository,
      researchHypothesisRepository,
      researchRunRepository,
      evaluationResultRepository,
      signalCandidateRepository
    })
  });

  const result = await flow.run(structuredClone(input));
  const run = await researchRunRepository.getById("research-run-flow-integration-001");
  const aggregate = await setupAggregateResultRepository.getById("aggregate-flow-integration-001");

  assert.equal(result.status, "completed");
  assert.equal(run?.status, "completed");
  assert.deepEqual(run?.evaluationResultIds, ["result-flow-integration-001"]);
  assert.equal(aggregate?.status, "completed");
});
