import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  createEvaluationService,
  createSignalCandidateService,
  createSignalCandidateToEvaluationHandoff,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-evaluation-trigger",
  originTransitionId: "transition-evaluation-trigger",
  createdBySource: "evaluation_pipeline",
  lastUpdatedBySource: "evaluation_pipeline",
  traceId: "trace-evaluation-trigger",
  sourceObservedAtUtc: "2026-04-20T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Evaluation trigger setup",
  description: "Setup for evaluation-trigger tests",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate in fixed window"],
  invalidationAssumptions: ["invalidate on immediate reversal"],
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z"
});

const buildMonitoredSymbol = (symbolId: string): MonitoredSymbol => ({
  symbolId,
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: [],
  sourceBindings: [],
  createdAtUtc: "2026-04-20T10:00:00.000Z",
  updatedAtUtc: "2026-04-20T10:00:00.000Z"
});

const createMonitoredSymbolRepositoryStub = (symbols: MonitoredSymbol[]) => {
  const byId = new Map(symbols.map((symbol) => [symbol.symbolId, symbol]));
  return {
    async getById(symbolId: string): Promise<MonitoredSymbol | null> {
      return byId.get(symbolId) ?? null;
    }
  };
};

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();

  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([buildMonitoredSymbol("BTC-USDT")])
  });
  const evaluationService = createEvaluationService({
    evaluationResultRepository,
    signalCandidateRepository
  });
  const evaluationTriggerHandoff = createSignalCandidateToEvaluationHandoff({
    evaluationService,
    signalCandidateService,
    signalCandidateRepository,
    evaluationResultRepository
  });

  return {
    setupDefinitionRepository,
    signalCandidateService,
    evaluationTriggerHandoff
  };
};

test("valid evaluation trigger shape starts evaluation", async () => {
  const { setupDefinitionRepository, signalCandidateService, evaluationTriggerHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-eval-001"),
    metadata
  });
  await signalCandidateService.createSignalCandidate({
    candidate: {
      id: "candidate-eval-001",
      setupDefinitionId: "setup-eval-001",
      monitoredSymbolId: "BTC-USDT",
      status: "detected",
      detectedAt: "2026-04-20T11:00:00.000Z",
      evidenceSummary: "detected for evaluation trigger",
      createdAt: "2026-04-20T11:00:00.000Z",
      updatedAt: "2026-04-20T11:00:00.000Z"
    },
    metadata
  });

  const result = await evaluationTriggerHandoff.trigger(
    {
      signalCandidateId: "candidate-eval-001",
      setupDefinitionId: "setup-eval-001",
      monitoredSymbolId: "BTC-USDT",
      triggeredAt: "2026-04-20T11:30:00.000Z",
      evaluationWindowId: "window-24h"
    },
    metadata
  );

  assert.equal(result.status, "started");
  assert.equal(typeof result.evaluationResultId, "string");
  assert.equal(result.evaluationWindowId, "window-24h");
});

test("missing signal candidate reference rejected", async () => {
  const { evaluationTriggerHandoff } = createFixture();

  const result = await evaluationTriggerHandoff.trigger(
    {
      signalCandidateId: "candidate-missing",
      setupDefinitionId: "setup-eval-002",
      monitoredSymbolId: "BTC-USDT",
      triggeredAt: "2026-04-20T11:30:00.000Z",
      evaluationWindowId: "window-24h"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("signal_candidate not found"), true);
});

test("invalid candidate lifecycle rejected", async () => {
  const { setupDefinitionRepository, signalCandidateService, evaluationTriggerHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-eval-003"),
    metadata
  });
  await signalCandidateService.createSignalCandidate({
    candidate: {
      id: "candidate-eval-003",
      setupDefinitionId: "setup-eval-003",
      monitoredSymbolId: "BTC-USDT",
      status: "detected",
      detectedAt: "2026-04-20T11:00:00.000Z",
      evidenceSummary: "detected for lifecycle test",
      createdAt: "2026-04-20T11:00:00.000Z",
      updatedAt: "2026-04-20T11:00:00.000Z"
    },
    metadata
  });
  await signalCandidateService.updateSignalCandidateStatus({
    signalCandidateId: "candidate-eval-003",
    status: "discarded",
    metadata,
    expectedVersion: null
  });

  const result = await evaluationTriggerHandoff.trigger(
    {
      signalCandidateId: "candidate-eval-003",
      setupDefinitionId: "setup-eval-003",
      monitoredSymbolId: "BTC-USDT",
      triggeredAt: "2026-04-20T11:30:00.000Z",
      evaluationWindowId: "window-24h"
    },
    metadata
  );

  assert.equal(result.status, "rejected_lifecycle");
  assert.equal(result.reason?.includes("does not allow evaluation trigger"), true);
});

test("duplicate candidate/window trigger rejected with explicit outcome", async () => {
  const { setupDefinitionRepository, signalCandidateService, evaluationTriggerHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-eval-004"),
    metadata
  });
  await signalCandidateService.createSignalCandidate({
    candidate: {
      id: "candidate-eval-004",
      setupDefinitionId: "setup-eval-004",
      monitoredSymbolId: "BTC-USDT",
      status: "detected",
      detectedAt: "2026-04-20T11:00:00.000Z",
      evidenceSummary: "candidate for duplicate trigger",
      createdAt: "2026-04-20T11:00:00.000Z",
      updatedAt: "2026-04-20T11:00:00.000Z"
    },
    metadata
  });
  await signalCandidateService.updateSignalCandidateStatus({
    signalCandidateId: "candidate-eval-004",
    status: "under_review",
    metadata,
    expectedVersion: null
  });

  const first = await evaluationTriggerHandoff.trigger(
    {
      signalCandidateId: "candidate-eval-004",
      setupDefinitionId: "setup-eval-004",
      monitoredSymbolId: "BTC-USDT",
      triggeredAt: "2026-04-20T11:30:00.000Z",
      evaluationWindowId: "window-24h"
    },
    metadata
  );
  const second = await evaluationTriggerHandoff.trigger(
    {
      signalCandidateId: "candidate-eval-004",
      setupDefinitionId: "setup-eval-004",
      monitoredSymbolId: "BTC-USDT",
      triggeredAt: "2026-04-20T11:31:00.000Z",
      evaluationWindowId: "window-24h"
    },
    metadata
  );

  assert.equal(first.status, "started");
  assert.equal(second.status, "rejected_duplicate");
  assert.equal(second.evaluationResultId, first.evaluationResultId);
});

test("evaluation-trigger result shape stays explicit", async () => {
  const { evaluationTriggerHandoff } = createFixture();

  const result = await evaluationTriggerHandoff.trigger(
    {
      signalCandidateId: "",
      setupDefinitionId: "setup-eval-005",
      monitoredSymbolId: "BTC-USDT",
      triggeredAt: "2026-04-20T11:30:00.000Z",
      evaluationWindowDescriptor: {
        purpose: "post_detection_outcome",
        durationValue: 24,
        durationUnit: "hours"
      }
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});
